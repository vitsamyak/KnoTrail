/**
 * Automated Verification Suite: GitHub Authentication & Token Flow
 * (KnoTrail - GitHub API Token Hardening & Dev PAT Fallback)
 *
 * Verifies:
 * Case A. Public repository connection with GITHUB_DEV_PAT configured:
 *         Verify GitHub API request receives 'Authorization: Bearer <dummy-token>'.
 * Case B. GitHub App authentication:
 *         Verify installation-token acquisition and usage when installationId is provided.
 * Case C. Explicit authentication:
 *         Verify explicit authToken in request takes precedence and attaches as Bearer token.
 * Case D. Missing token fallback:
 *         Verify safe fallback when neither token nor installationId is provided (unauthenticated).
 * Case E. Ingestion authentication:
 *         Verify repository ingestion (commits, PRs, issues, docs) uses the configured dev PAT.
 *
 * SECURITY: All tests use dummy fixture tokens (e.g. 'dummy_dev_pat_test_12345').
 * Governance: CodersInPune Hackathon 2026 - Deploy_or_Die (Samyak Gedam & Sanshrey Sanagar)
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../../backend/app.ts';
import { getStorage } from '../server/db/storage.ts';
import {
  setCustomGitHubService,
} from '../../backend/routes/github.ts';
import {
  GitHubService,
} from '../../backend/services/github.ts';
import {
  ingestGitHubRepository,
} from '../../backend/services/githubIngestion.ts';

async function createTestServer() {
  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'string' ? 0 : address.port;
      const baseUrl = `http://127.0.0.1:${port}`;
      resolve({
        server,
        baseUrl,
        close: () => new Promise((res) => server.close(res)),
      });
    });
  });
}

test('▶ GitHub API Authentication & Token Flow Verification Suite', async (t) => {
  const origStorageBackend = process.env.STORAGE_BACKEND;
  const origDevPat = process.env.GITHUB_DEV_PAT;
  const origToken = process.env.GITHUB_TOKEN;
  const origGeminiKey = process.env.GEMINI_API_KEY;

  process.env.STORAGE_BACKEND = 'file';
  delete process.env.GEMINI_API_KEY;

  const { baseUrl, close } = await createTestServer();

  t.after(async () => {
    setCustomGitHubService(null);
    process.env.STORAGE_BACKEND = origStorageBackend;
    if (origDevPat !== undefined) process.env.GITHUB_DEV_PAT = origDevPat;
    else delete process.env.GITHUB_DEV_PAT;
    if (origToken !== undefined) process.env.GITHUB_TOKEN = origToken;
    else delete process.env.GITHUB_TOKEN;
    if (origGeminiKey !== undefined) process.env.GEMINI_API_KEY = origGeminiKey;
    else delete process.env.GEMINI_API_KEY;
    await close();
  });

  const dummyDevPat = 'dummy_dev_pat_verification_token_99999';
  const dummyAuthToken = 'dummy_explicit_auth_token_88888';
  const dummyInstallationToken = 'dummy_installation_access_token_77777';

  const mockRepoPayload = {
    id: 12345678,
    node_id: 'MDEwOlJlcG9zaXRvcnkxMjM0NTY3OA==',
    name: 'KnoTrail',
    full_name: 'vitsamyak/KnoTrail',
    owner: { login: 'vitsamyak', type: 'User' },
    private: false,
    html_url: 'https://github.com/vitsamyak/KnoTrail',
    description: 'Knowledge Handover Platform',
    fork: false,
    default_branch: 'main',
    stargazers_count: 42,
    forks_count: 5,
    open_issues_count: 2,
    updated_at: '2026-11-15T00:00:00Z',
    pushed_at: '2026-11-15T12:00:00Z',
  };

  // ==========================================================================
  // Case A. Public Repository Connection with GITHUB_DEV_PAT configured
  // ==========================================================================
  await t.test('Case A: Initial repository connection sends Bearer GITHUB_DEV_PAT when configured', async () => {
    process.env.GITHUB_DEV_PAT = dummyDevPat;

    let interceptedAuthHeader = null;
    let interceptedUrl = null;

    const mockFetch = async (url, options = {}) => {
      interceptedUrl = String(url);
      interceptedAuthHeader = options.headers?.['Authorization'] || null;

      return {
        ok: true,
        status: 200,
        headers: new Headers({
          'x-ratelimit-limit': '5000',
          'x-ratelimit-remaining': '4999',
          'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 3600),
        }),
        json: async () => ({ ...mockRepoPayload, id: 11223344 }),
      };
    };

    const service = new GitHubService({ customFetch: mockFetch });
    setCustomGitHubService(service);

    const testWorkspaceId = `ws_anon_auth_test_a_${Date.now()}`;
    const storage = getStorage();
    await storage.createWorkspace(testWorkspaceId);

    const res = await fetch(`${baseUrl}/api/github/integrations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Demo-Perspective': 'MANAGER',
      },
      body: JSON.stringify({
        workspaceId: testWorkspaceId,
        repoOwner: 'vitsamyak',
        repoName: 'KnoTrail',
      }),
    });

    assert.equal(res.status, 201, 'Repository connection must succeed with 201 Created');
    assert.ok(interceptedUrl && interceptedUrl.includes('/repos/vitsamyak/KnoTrail'), 'Must call repo metadata endpoint');
    assert.equal(
      interceptedAuthHeader,
      `Bearer ${dummyDevPat}`,
      'Must attach Bearer GITHUB_DEV_PAT when dev PAT is configured'
    );
  });

  // ==========================================================================
  // Case B. GitHub App Authentication via Installation Token
  // ==========================================================================
  await t.test('Case B: GitHub App authentication uses installation token when installationId is provided', async () => {
    process.env.GITHUB_DEV_PAT = dummyDevPat;

    const interceptedHeaders = [];

    const mockFetch = async (url, options = {}) => {
      const urlStr = String(url);
      interceptedHeaders.push({
        url: urlStr,
        auth: options.headers?.['Authorization'] || null,
      });

      return {
        ok: true,
        status: 200,
        headers: new Headers({
          'x-ratelimit-limit': '5000',
          'x-ratelimit-remaining': '4990',
          'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 3600),
        }),
        json: async () => ({ ...mockRepoPayload, id: 99887766 }),
      };
    };

    // Service where getInstallationToken returns dummyInstallationToken
    const service = new GitHubService({ customFetch: mockFetch });
    service.getInstallationToken = async (instId) => {
      assert.equal(instId, 54321, 'Must request token for correct installationId');
      return dummyInstallationToken;
    };
    setCustomGitHubService(service);

    const testWorkspaceId = `ws_anon_auth_test_b_${Date.now()}`;
    const storage = getStorage();
    await storage.createWorkspace(testWorkspaceId);

    const res = await fetch(`${baseUrl}/api/github/integrations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Demo-Perspective': 'MANAGER',
      },
      body: JSON.stringify({
        workspaceId: testWorkspaceId,
        repoOwner: 'vitsamyak',
        repoName: 'KnoTrail',
        installationId: 54321,
      }),
    });

    assert.equal(res.status, 201);
    const repoCall = interceptedHeaders.find((h) => h.url.includes('/repos/vitsamyak/KnoTrail'));
    assert.ok(repoCall, 'Must call repo metadata endpoint');
    assert.equal(
      repoCall.auth,
      `Bearer ${dummyInstallationToken}`,
      'Must use installation token when installationId is provided'
    );
  });

  // ==========================================================================
  // Case C. Explicit authToken takes priority over dev PAT
  // ==========================================================================
  await t.test('Case C: Explicit authToken in request takes precedence over GITHUB_DEV_PAT', async () => {
    process.env.GITHUB_DEV_PAT = dummyDevPat;

    let interceptedAuthHeader = null;

    const mockFetch = async (url, options = {}) => {
      interceptedAuthHeader = options.headers?.['Authorization'] || null;
      return {
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => ({ ...mockRepoPayload, id: 88776655 }),
      };
    };

    const service = new GitHubService({ customFetch: mockFetch });
    setCustomGitHubService(service);

    const testWorkspaceId = `ws_anon_auth_test_c_${Date.now()}`;
    const storage = getStorage();
    await storage.createWorkspace(testWorkspaceId);

    const res = await fetch(`${baseUrl}/api/github/integrations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Demo-Perspective': 'MANAGER',
      },
      body: JSON.stringify({
        workspaceId: testWorkspaceId,
        repoOwner: 'vitsamyak',
        repoName: 'KnoTrail',
        authToken: dummyAuthToken,
      }),
    });

    assert.equal(res.status, 201);
    assert.equal(
      interceptedAuthHeader,
      `Bearer ${dummyAuthToken}`,
      'Must attach explicit authToken in preference to GITHUB_DEV_PAT'
    );
  });

  // ==========================================================================
  // Case D. Missing Token Fallback (Safe Unauthenticated Requests)
  // ==========================================================================
  await t.test('Case D: Missing GITHUB_DEV_PAT falls back safely to unauthenticated request', async () => {
    delete process.env.GITHUB_DEV_PAT;
    delete process.env.GITHUB_TOKEN;

    let interceptedAuthHeader = 'NOT_SET';

    const mockFetch = async (url, options = {}) => {
      interceptedAuthHeader = options.headers?.['Authorization'];
      return {
        ok: true,
        status: 200,
        headers: new Headers({
          'x-ratelimit-limit': '60',
          'x-ratelimit-remaining': '59',
          'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 3600),
        }),
        json: async () => ({ ...mockRepoPayload, id: 77665544 }),
      };
    };

    const service = new GitHubService({ customFetch: mockFetch });
    service.setDevPat(undefined);
    setCustomGitHubService(service);

    const testWorkspaceId = `ws_anon_auth_test_d_${Date.now()}`;
    const storage = getStorage();
    await storage.createWorkspace(testWorkspaceId);

    const res = await fetch(`${baseUrl}/api/github/integrations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Demo-Perspective': 'MANAGER',
      },
      body: JSON.stringify({
        workspaceId: testWorkspaceId,
        repoOwner: 'vitsamyak',
        repoName: 'KnoTrail',
      }),
    });

    assert.equal(res.status, 201);
    assert.equal(
      interceptedAuthHeader,
      undefined,
      'When no dev PAT or token is configured, request must be sent without Authorization header'
    );
  });

  // ==========================================================================
  // Case E. Repository Ingestion with Dev PAT Fallback
  // ==========================================================================
  await t.test('Case E: Repository ingestion attaches Bearer GITHUB_DEV_PAT across all entity requests', async () => {
    process.env.GITHUB_DEV_PAT = dummyDevPat;

    const interceptedCalls = [];

    const mockFetch = async (url, options = {}) => {
      const urlStr = String(url);
      interceptedCalls.push({
        url: urlStr,
        auth: options.headers?.['Authorization'] || null,
      });

      if (urlStr.includes('/commits')) {
        return {
          ok: true,
          status: 200,
          headers: new Headers(),
          json: async () => [
            {
              sha: 'abc1234567890abcdef1234567890abcdef1234',
              commit: {
                message: 'feat: add zero-auth demo capability',
                author: { name: 'Samyak Gedam', email: 'samyak@knotrail.demo', date: '2026-11-15T00:00:00Z' },
              },
              html_url: 'https://github.com/vitsamyak/KnoTrail/commit/abc1234',
            },
          ],
        };
      }

      if (urlStr.includes('/pulls')) {
        return {
          ok: true,
          status: 200,
          headers: new Headers(),
          json: async () => [],
        };
      }

      if (urlStr.includes('/issues')) {
        return {
          ok: true,
          status: 200,
          headers: new Headers(),
          json: async () => [],
        };
      }

      if (urlStr.includes('/contents/README.md')) {
        return {
          ok: true,
          status: 200,
          headers: new Headers(),
          json: async () => ({
            type: 'file',
            content: Buffer.from('# KnoTrail Readme Document').toString('base64'),
            sha: 'readme_sha_123',
            size: 26,
          }),
        };
      }

      // Repository metadata
      return {
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () => mockRepoPayload,
      };
    };

    const service = new GitHubService({ customFetch: mockFetch });
    setCustomGitHubService(service);

    const result = await ingestGitHubRepository(
      'vitsamyak',
      'KnoTrail',
      { branch: 'main' },
      undefined,
      service
    );

    assert.ok(result.source, 'Ingestion must produce a valid ProjectSource');
    assert.ok(interceptedCalls.length >= 4, 'Must fetch repo metadata, commits, PRs, issues, and README');

    for (const call of interceptedCalls) {
      assert.equal(
        call.auth,
        `Bearer ${dummyDevPat}`,
        `Call to ${call.url} must contain Bearer GITHUB_DEV_PAT`
      );
    }
  });
});
