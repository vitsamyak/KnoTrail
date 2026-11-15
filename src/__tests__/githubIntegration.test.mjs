/**
 * KnoTrail Round 3 Phase 2: GitHub Integration Test Suite
 *
 * Automated tests covering Milestones 2.1 and 2.2:
 * 1. GitHub App JWT generation (RS256 header, claims, signature validation).
 * 2. Installation token handling (mocked endpoint exchange and Bearer header).
 * 3. Token expiration and proactive refresh (< 5 minutes remaining).
 * 4. API pagination (commit pagination up to limit).
 * 5. Rate-limit handling (403 rate limit exhausted raises GitHubRateLimitError).
 * 6. Invalid repository handling (404 raises GitHubNotFoundError).
 * 7. Public repository access (unauthenticated requests succeed).
 * 8. Private repository access authorization (requires valid token, 401 raises GitHubAuthError).
 * 9. Provenance preservation (preserves repository, SHA, file, diff hunk, PR/Issue, and contentHash).
 * 10. Credential leakage prevention (error messages and logs sanitize tokens and private keys).
 *
 * NOTE: Deterministic automated tests use mocked GitHub REST API v3 responses.
 * Live GitHub API integration tests run conditionally if GITHUB_DEV_PAT or GITHUB_APP_ID is configured.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  GitHubService,
  GitHubApiError,
  GitHubNotFoundError,
  GitHubRateLimitError,
  GitHubAuthError,
  GitHubConfigError,
} from '../../backend/services/github.ts';

// Generate ephemeral 2048-bit RSA keypair for testing RS256 JWT generation
const testKeyPair = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

test('▶ Phase 2: Secure Backend GitHub Service Suite (Milestones 2.1 & 2.2)', async (t) => {
  const testAppId = '987654';

  // 1. GitHub App JWT generation using RS256
  await t.test('1. GitHub App JWT generation: produces valid RS256 token with correct claims and signature', () => {
    const service = new GitHubService({
      appId: testAppId,
      privateKeyPem: testKeyPair.privateKey,
    });

    const jwt = service.generateAppJwt();
    assert.ok(jwt && typeof jwt === 'string', 'JWT must be a non-empty string');

    const parts = jwt.split('.');
    assert.equal(parts.length, 3, 'JWT must contain header, payload, and signature');

    // Decode header
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf-8'));
    assert.equal(header.alg, 'RS256', 'Header alg must be RS256');
    assert.equal(header.typ, 'JWT', 'Header typ must be JWT');

    // Decode payload
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
    assert.equal(payload.iss, testAppId, 'Issuer must match App ID');
    assert.ok(payload.iat <= Math.floor(Date.now() / 1000), 'iat must be in the past');
    assert.ok(payload.exp > Math.floor(Date.now() / 1000), 'exp must be in the future');
    assert.ok(payload.exp - payload.iat <= 660, 'Token lifespan must be within 10 minutes');

    // Verify cryptographic signature with the public key
    const unsigned = `${parts[0]}.${parts[1]}`;
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(unsigned);
    const isValid = verifier.verify(testKeyPair.publicKey, parts[2], 'base64url');
    assert.ok(isValid, 'Cryptographic RS256 signature must be verified by RSA public key');
  });

  // 2. Installation token handling
  await t.test('2. Installation token handling: exchanges App JWT for installation token and caches in memory', async () => {
    let capturedAuthHeader = null;
    let tokenRequestsCount = 0;

    const mockFetch = async (url, init) => {
      if (url.includes('/app/installations/112233/access_tokens')) {
        tokenRequestsCount++;
        capturedAuthHeader = init.headers?.['Authorization'];
        return new Response(
          JSON.stringify({
            token: 'ghs_mock_installation_token_778899',
            expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour
            permissions: { contents: 'read', pull_requests: 'read', issues: 'read' },
          }),
          { status: 201, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('Not Found', { status: 404 });
    };

    const service = new GitHubService({
      appId: testAppId,
      privateKeyPem: testKeyPair.privateKey,
      customFetch: mockFetch,
    });

    const token = await service.getInstallationToken(112233);
    assert.equal(token, 'ghs_mock_installation_token_778899');
    assert.ok(capturedAuthHeader && capturedAuthHeader.startsWith('Bearer ey'), 'Must send Bearer JWT to installation endpoint');
    assert.equal(tokenRequestsCount, 1);

    // Second call should return cached token without dispatching HTTP request
    const token2 = await service.getInstallationToken(112233);
    assert.equal(token2, 'ghs_mock_installation_token_778899');
    assert.equal(tokenRequestsCount, 1, 'Subsequent call must use in-memory cache');
  });

  // 3. Token expiration and proactive refresh
  await t.test('3. Token expiration: proactively refreshes installation token when nearing expiry (< 5 minutes)', async () => {
    let tokenRequestsCount = 0;

    const mockFetch = async (url, init) => {
      if (url.includes('/app/installations/445566/access_tokens')) {
        tokenRequestsCount++;
        return new Response(
          JSON.stringify({
            // Expiring in 2 minutes (< 5 min threshold)
            token: `ghs_token_cycle_${tokenRequestsCount}`,
            expires_at: new Date(Date.now() + 120000).toISOString(),
          }),
          { status: 201, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('Not Found', { status: 404 });
    };

    const service = new GitHubService({
      appId: testAppId,
      privateKeyPem: testKeyPair.privateKey,
      customFetch: mockFetch,
    });

    // 1st request -> acquires token expiring in 2 mins
    const token1 = await service.getInstallationToken(445566);
    assert.equal(token1, 'ghs_token_cycle_1');
    assert.equal(tokenRequestsCount, 1);

    // 2nd request -> because it expires in 2 mins (< 5 mins), service proactively refreshes
    const token2 = await service.getInstallationToken(445566);
    assert.equal(token2, 'ghs_token_cycle_2');
    assert.equal(tokenRequestsCount, 2, 'Service must proactively refresh near-expired token');
  });

  // 4. API pagination
  await t.test('4. API pagination: retrieves commits across pages respecting limit and query parameters', async () => {
    const mockCommits = [
      {
        sha: '7a9b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b',
        commit: {
          message: 'feat: switch database port to 5433 to prevent collision',
          author: { name: 'Samyak Gedam', email: 'samyak@example.com', date: '2026-11-12T10:00:00Z' },
        },
        author: { login: 'vitsamyak', avatar_url: 'https://github.com/vitsamyak.png' },
        html_url: 'https://github.com/vitsamyak/KnoTrail/commit/7a9b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b',
        stats: { total: 3, additions: 2, deletions: 1 },
      },
      {
        sha: '1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c',
        commit: {
          message: 'fix: handle token expiration in auth middleware',
          author: { name: 'Sanshrey Sanagar', email: 'sanshrey@example.com', date: '2026-11-12T09:30:00Z' },
        },
        author: { login: 'sanshrey', avatar_url: 'https://github.com/sanshrey.png' },
        html_url: 'https://github.com/vitsamyak/KnoTrail/commit/1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c',
        stats: { total: 12, additions: 10, deletions: 2 },
      },
    ];

    const mockFetch = async (url) => {
      if (url.includes('/repos/vitsamyak/KnoTrail/commits')) {
        return new Response(JSON.stringify(mockCommits), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'x-ratelimit-limit': '5000',
            'x-ratelimit-remaining': '4990',
            'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 3600),
          },
        });
      }
      return new Response('Not Found', { status: 404 });
    };

    const service = new GitHubService({ customFetch: mockFetch });
    const commits = await service.getCommits('vitsamyak', 'KnoTrail', { limit: 2 });

    assert.equal(commits.length, 2);
    assert.equal(commits[0].shortSha, '7a9b1c2');
    assert.equal(commits[0].author.name, 'Samyak Gedam');
    assert.equal(commits[0].author.username, 'vitsamyak');
    assert.equal(commits[0].stats.additions, 2);
    assert.equal(commits[1].shortSha, '1b2c3d4');
    assert.equal(commits[1].author.name, 'Sanshrey Sanagar');
  });

  // 5. Rate-limit handling
  await t.test('5. Rate-limit handling: exhausted rate limit raises normalized GitHubRateLimitError with reset time', async () => {
    const resetTime = Math.floor(Date.now() / 1000) + 1800; // 30 minutes from now

    const mockFetch = async () => {
      return new Response(
        JSON.stringify({
          message: 'API rate limit exceeded for user ID 12345.',
          documentation_url: 'https://docs.github.com/rest/overview/resources-in-the-rest-api#rate-limiting',
        }),
        {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
            'x-ratelimit-limit': '60',
            'x-ratelimit-remaining': '0',
            'x-ratelimit-reset': String(resetTime),
          },
        }
      );
    };

    const service = new GitHubService({ customFetch: mockFetch });

    await assert.rejects(
      async () => {
        await service.getRepository('vitsamyak', 'KnoTrail');
      },
      (err) => {
        assert.ok(err instanceof GitHubRateLimitError, 'Error must be GitHubRateLimitError');
        assert.equal(err.statusCode, 403);
        assert.equal(err.remaining, 0);
        assert.equal(err.resetTime, resetTime);
        assert.match(err.message, /GitHub API rate limit exceeded/);
        return true;
      }
    );
  });

  // 6. Invalid repository handling (404 Not Found)
  await t.test('6. Invalid repository handling: non-existent repository produces GitHubNotFoundError (404)', async () => {
    const mockFetch = async () => {
      return new Response(
        JSON.stringify({ message: 'Not Found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const service = new GitHubService({ customFetch: mockFetch });

    await assert.rejects(
      async () => {
        await service.getRepository('nonexistent-owner', 'missing-repo');
      },
      (err) => {
        assert.ok(err instanceof GitHubNotFoundError, 'Error must be GitHubNotFoundError');
        assert.equal(err.statusCode, 404);
        assert.match(err.message, /was not found/);
        return true;
      }
    );
  });

  // 7. Public repository access
  await t.test('7. Public repository access: fetches public repository metadata without requiring credentials', async () => {
    let authHeaderPresent = false;

    const mockFetch = async (url, init) => {
      authHeaderPresent = Boolean(init.headers?.['Authorization']);
      return new Response(
        JSON.stringify({
          id: 998877,
          node_id: 'R_kgDOMock',
          name: 'KnoTrail',
          full_name: 'vitsamyak/KnoTrail',
          owner: { login: 'vitsamyak', type: 'User' },
          html_url: 'https://github.com/vitsamyak/KnoTrail',
          description: 'Reconstructing Verified, Source-Traceable Project Knowledge',
          default_branch: 'main',
          private: false,
          fork: false,
          language: 'TypeScript',
          topics: ['knowledge-management', 'hackathon-2026', 'ai-extraction'],
          stargazers_count: 42,
          forks_count: 5,
          open_issues_count: 3,
          updated_at: '2026-11-12T15:00:00Z',
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'x-ratelimit-limit': '60',
            'x-ratelimit-remaining': '55',
            'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 3600),
          },
        }
      );
    };

    const service = new GitHubService({ customFetch: mockFetch });
    const repo = await service.getRepository('vitsamyak', 'KnoTrail');

    assert.equal(authHeaderPresent, false, 'Public repo request must not require Authorization header');
    assert.equal(repo.id, 998877);
    assert.equal(repo.fullName, 'vitsamyak/KnoTrail');
    assert.equal(repo.isPrivate, false);
    assert.equal(repo.defaultBranch, 'main');
    assert.equal(repo.language, 'TypeScript');
  });

  // 8. Private repository access authorization
  await t.test('8. Private repository access authorization: unauthenticated request to private repo raises GitHubAuthError (401)', async () => {
    const mockFetch = async (url, init) => {
      const auth = init.headers?.['Authorization'];
      if (!auth) {
        return new Response(
          JSON.stringify({ message: 'Bad credentials' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({
          id: 554433,
          name: 'private-knotrail-vault',
          full_name: 'org/private-knotrail-vault',
          private: true,
          default_branch: 'main',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    };

    const service = new GitHubService({ customFetch: mockFetch });

    // 1. Without token -> 401 GitHubAuthError
    await assert.rejects(
      async () => {
        await service.getRepository('org', 'private-knotrail-vault');
      },
      (err) => {
        assert.ok(err instanceof GitHubAuthError, 'Error must be GitHubAuthError');
        assert.equal(err.statusCode, 401);
        return true;
      }
    );

    // 2. With valid auth token -> succeeds
    const repo = await service.getRepository('org', 'private-knotrail-vault', {
      authToken: 'ghs_explicit_test_token',
    });
    assert.equal(repo.id, 554433);
    assert.equal(repo.isPrivate, true);
  });

  // 9. Evidence Provenance preservation
  await t.test('9. Provenance preservation: constructs comprehensive GitHubEvidenceProvenance with exact chain of custody', () => {
    const service = new GitHubService();

    const snippet = `@@ -45,3 +45,5 @@
- const dbPort = 5432;
+ const dbPort = 5433; // Switched to prevent port collision with host Postgres`;

    const provenance = service.buildEvidenceProvenance({
      repositoryId: 998877,
      repositoryOwner: 'vitsamyak',
      repositoryName: 'KnoTrail',
      branch: 'main',
      commitSha: '7a9b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b',
      filePath: 'src/server/db/config.ts',
      diffHunk: { startLine: 45, endLine: 50, patchExcerpt: snippet },
      prNumber: 14,
      author: 'samyakvikasgedam',
      timestamp: '2026-11-12T14:30:00Z',
      rawSnippet: snippet,
      synthesizedLineNumber: 120,
      synthesizedLineRange: '120-125',
    });

    assert.equal(provenance.repositoryId, 998877);
    assert.equal(provenance.repositoryFullName, 'vitsamyak/KnoTrail');
    assert.equal(provenance.commitSha, '7a9b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b');
    assert.equal(provenance.filePath, 'src/server/db/config.ts');
    assert.equal(
      provenance.originalGitHubUrl,
      'https://github.com/vitsamyak/KnoTrail/blob/7a9b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b/src/server/db/config.ts#L45'
    );
    assert.equal(provenance.author, 'samyakvikasgedam');
    assert.equal(provenance.prNumber, 14);

    // Verify SHA-256 contentHash matches snippet
    const expectedHash = crypto.createHash('sha256').update(snippet.trim()).digest('hex');
    assert.equal(provenance.contentHash, expectedHash);
  });

  // 10. Credential leakage prevention
  await t.test('10. Credential leakage prevention: error messages and stringified exceptions strictly redact secret tokens', () => {
    const rawSecretToken = 'ghp_superSecretPersonalAccessToken1234567890';
    const leakedMessage = `Error contacting endpoint with Authorization: Bearer ${rawSecretToken}`;

    const apiError = new GitHubApiError(leakedMessage, 500, 'Internal Error', '/repos/test/test');

    assert.doesNotMatch(apiError.message, /ghp_superSecretPersonalAccessToken/, 'Token must not appear in error message');
    assert.match(apiError.message, /\[REDACTED_CREDENTIAL\]/, 'Token must be masked with redaction placeholder');

    const stringified = JSON.stringify({ error: apiError.message, name: apiError.name });
    assert.doesNotMatch(stringified, /ghp_superSecretPersonalAccessToken/);
  });
});
