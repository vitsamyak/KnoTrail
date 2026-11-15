/**
 * Automated Route Integration Test Suite for GitHub API
 * (KnoTrail Round 3 Phase 1 - Milestone 1.1)
 *
 * Tests all endpoints mounted at /api/github:
 * 1. Connect repository (POST /api/github/integrations)
 * 2. Input validation & slug sanitization
 * 3. 404 on non-existent repository
 * 4. 409 on duplicate repository connection
 * 5. List integrations (GET /api/github/integrations) & workspace isolation
 * 6. Sync repository (POST /api/github/integrations/:repoId/sync)
 * 7. Ingestion of commits, PRs, and issues into ProjectSource
 * 8. Idempotency & stable content hashing (isChanged: false on repeat sync)
 * 9. Rate-limit handling (429 with reset time & error state persistence)
 * 10. Disconnect repository (DELETE /api/github/integrations/:repoId) & source cleanup
 * 11. Role-based access control (Manager, Developer, External permissions)
 * 12. Rate-limit telemetry endpoint (GET /api/github/rate-limit)
 * 13. Zero credential leakage verification
 *
 * Governance: CodersInPune Hackathon 2026 - Deploy_or_Die (Samyak Gedam & Sanshrey Sanagar)
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../../backend/app.ts';
import { getStorage } from '../server/db/storage.ts';
import {
  setCustomGitHubService,
  getActiveGitHubService,
} from '../../backend/routes/github.ts';
import {
  GitHubService,
  GitHubNotFoundError,
  GitHubRateLimitError,
  GitHubAuthError,
} from '../../backend/services/github.ts';

/**
 * Spins up an ephemeral HTTP server on a random port.
 */
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

test('▶ Phase 1 - Milestone 1.1: GitHub Repository Integration & REST API Suite', async (t) => {
  const origStorageBackend = process.env.STORAGE_BACKEND;
  const origGeminiKey = process.env.GEMINI_API_KEY;
  process.env.STORAGE_BACKEND = 'file';
  delete process.env.GEMINI_API_KEY;

  const { server, baseUrl, close } = await createTestServer();

  t.after(async () => {
    setCustomGitHubService(null);
    process.env.STORAGE_BACKEND = origStorageBackend;
    if (origGeminiKey !== undefined) {
      process.env.GEMINI_API_KEY = origGeminiKey;
    } else {
      delete process.env.GEMINI_API_KEY;
    }
    await close();
  });

  // Mock test workspace IDs
  const ws1 = `ws_anon_gh_test_${Date.now()}`;
  const ws2 = `ws_anon_gh_other_${Date.now()}`;

  // Deterministic Mock GitHub Data
  const mockRepoMeta = {
    id: 12345678,
    nodeId: 'R_kgDOG1234',
    name: 'KnoTrail-Core',
    fullName: 'vitsamyak/KnoTrail-Core',
    owner: 'vitsamyak',
    ownerType: 'User',
    htmlUrl: 'https://github.com/vitsamyak/KnoTrail-Core',
    description: 'Knowledge handover continuity engine for engineering teams',
    defaultBranch: 'main',
    isPrivate: false,
    isFork: false,
    language: 'TypeScript',
    topics: ['knowledge-management', 'handover', 'ai'],
    starsCount: 42,
    forksCount: 5,
    openIssuesCount: 3,
    updatedAt: '2026-11-15T12:00:00Z',
    pushedAt: '2026-11-15T12:00:00Z',
  };

  const mockCommits = [
    {
      sha: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
      shortSha: 'a1b2c3d',
      message: 'feat(db): switch PostgreSQL port from 5432 to 5433 to avoid local port collision\n\nArchitectural decision to prevent service collision with host postgres service.',
      author: {
        name: 'Samyak Gedam',
        email: 'samyak@knotrail.demo',
        date: '2026-11-14T10:00:00Z',
      },
      htmlUrl: 'https://github.com/vitsamyak/KnoTrail-Core/commit/a1b2c3d',
      files: [
        { filename: 'src/server/db/config.ts', status: 'modified', additions: 3, deletions: 1, changes: 4 },
      ],
    },
    {
      sha: 'b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3',
      shortSha: 'b2c3d4e',
      message: 'refactor(auth): enforce HMAC-SHA256 server session verification for all protected routes',
      author: {
        name: 'Sanshrey Sanagar',
        email: 'sanshrey@knotrail.demo',
        date: '2026-11-13T16:00:00Z',
      },
      htmlUrl: 'https://github.com/vitsamyak/KnoTrail-Core/commit/b2c3d4e',
    },
  ];

  const mockPullRequests = [
    {
      id: 991,
      number: 14,
      title: 'Enforce Zero Fake AI Invariant across all ingestion endpoints',
      body: 'Decided that unconfigured AI requests must return 428 status instead of synthesizing fabricated claims.',
      state: 'closed',
      isMerged: true,
      mergedAt: '2026-11-14T11:00:00Z',
      mergeCommitSha: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
      htmlUrl: 'https://github.com/vitsamyak/KnoTrail-Core/pull/14',
      author: 'samyakvikasgedam',
      baseBranch: 'main',
      headBranch: 'feat/zero-fake-ai',
      createdAt: '2026-11-13T18:00:00Z',
      updatedAt: '2026-11-14T11:00:00Z',
      labels: ['security', 'core-logic'],
      reviews: [
        { id: 501, user: 'sanshrey7273', state: 'APPROVED', submittedAt: '2026-11-14T10:45:00Z', body: 'LGTMT. Zero fake AI guarantee verified.' },
      ],
    },
  ];

  const mockIssues = [
    {
      id: 881,
      number: 22,
      title: 'Deprecate legacy mock storage in production runtime',
      body: 'Operational decision: Storage backend must fail-fast if Supabase credentials are missing in production.',
      state: 'closed',
      htmlUrl: 'https://github.com/vitsamyak/KnoTrail-Core/issues/22',
      author: 'samyakvikasgedam',
      assignees: ['sanshrey7273'],
      labels: ['bug', 'infrastructure'],
      commentsCount: 1,
      createdAt: '2026-11-12T09:00:00Z',
      updatedAt: '2026-11-13T15:00:00Z',
      closedAt: '2026-11-13T15:00:00Z',
      comments: [
        { id: 701, author: 'sanshrey7273', body: 'Implemented storage factory fail-fast check in Phase H.', createdAt: '2026-11-13T14:30:00Z', htmlUrl: 'https://github.com/vitsamyak/KnoTrail-Core/issues/22#issuecomment-701' },
      ],
    },
  ];

  const mockReadme = {
    content: '# KnoTrail Core\n\nDeterministic operational knowledge handover platform.',
    sha: 'readme_sha_12345',
    size: 78,
  };

  // Mock service instance that returns mock data without network calls
  class MockGitHubService extends GitHubService {
    async getRepository(owner, repo, options) {
      if (owner === 'nonexistent') {
        throw new GitHubNotFoundError(`/repos/${owner}/${repo}`, `Repository ${owner}/${repo} not found`);
      }
      if (owner === 'ratelimited') {
        throw new GitHubRateLimitError(`/repos/${owner}/${repo}`, Math.floor(Date.now() / 1000) + 1800, 60, 0);
      }
      const id = repo === 'ratelimit-target' ? 87654321 : (repo === 'dev-forbidden' ? 44332211 : mockRepoMeta.id);
      return { ...mockRepoMeta, id, owner, name: repo, fullName: `${owner}/${repo}` };
    }

    async getCommits(owner, repo, query, options) {
      return [...mockCommits];
    }

    async getPullRequests(owner, repo, query, options) {
      return [...mockPullRequests];
    }

    async getPullRequestReviews(owner, repo, prNumber, options) {
      return mockPullRequests[0]?.reviews || [];
    }

    async getIssues(owner, repo, query, options) {
      return [...mockIssues];
    }

    async getIssueComments(owner, repo, issueNumber, options) {
      return mockIssues[0]?.comments || [];
    }

    async getFileContent(owner, repo, filePath, ref, options) {
      if (filePath === 'README.md') return mockReadme;
      return null;
    }
  }

  const mockService = new MockGitHubService();
  setCustomGitHubService(mockService);

  // 1. Connect a repository successfully
  await t.test('1. Connect repository (POST /api/github/integrations) connects valid repository and saves integration', async () => {
    const res = await fetch(`${baseUrl}/api/github/integrations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Demo-Perspective': 'MANAGER',
      },
      body: JSON.stringify({
        workspaceId: ws1,
        repoOwner: 'vitsamyak',
        repoName: 'KnoTrail-Core',
        selectedBranch: 'main',
        config: {
          includeCommits: true,
          includePullRequests: true,
          includeIssues: true,
          includeDocs: true,
          maxCommits: 25,
        },
      }),
    });

    assert.equal(res.status, 201, 'Must return 201 Created');
    const data = await res.json();
    assert.equal(data.status, 'created');
    assert.ok(data.integration);
    assert.equal(data.integration.workspaceId, ws1);
    assert.equal(data.integration.repoOwner, 'vitsamyak');
    assert.equal(data.integration.repoName, 'KnoTrail-Core');
    assert.equal(data.integration.repoId, 12345678);
    assert.equal(data.integration.syncStatus, 'idle');
    assert.equal(data.integration.config.maxCommits, 25);
  });

  // 2. Input validation for repository connection
  await t.test('2. Input validation: rejects missing owner/repo or invalid characters (400)', async () => {
    // Missing owner
    const res1 = await fetch(`${baseUrl}/api/github/integrations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Demo-Perspective': 'MANAGER' },
      body: JSON.stringify({ workspaceId: ws1, repoName: 'KnoTrail' }),
    });
    assert.equal(res1.status, 400);

    // Malicious characters in slug
    const res2 = await fetch(`${baseUrl}/api/github/integrations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Demo-Perspective': 'MANAGER' },
      body: JSON.stringify({ workspaceId: ws1, repoOwner: 'vitsamyak;rm -rf', repoName: 'test' }),
    });
    assert.equal(res2.status, 400);
    const data2 = await res2.json();
    assert.match(data2.error, /Invalid repository owner or name format/);
  });

  // 3. Non-existent repository returns 404
  await t.test('3. Non-existent repository produces GitHubNotFoundError (404)', async () => {
    const res = await fetch(`${baseUrl}/api/github/integrations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Demo-Perspective': 'MANAGER' },
      body: JSON.stringify({ workspaceId: ws1, repoOwner: 'nonexistent', repoName: 'ghost-repo' }),
    });

    assert.equal(res.status, 404);
    const data = await res.json();
    assert.match(data.error, /not found/i);
  });

  // 4. Duplicate repository connection prevention (409)
  await t.test('4. Duplicate connection: connecting same repository twice in same workspace returns 409 Conflict', async () => {
    const res = await fetch(`${baseUrl}/api/github/integrations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Demo-Perspective': 'MANAGER' },
      body: JSON.stringify({ workspaceId: ws1, repoOwner: 'vitsamyak', repoName: 'KnoTrail-Core' }),
    });

    assert.equal(res.status, 409, 'Must return 409 Conflict');
    const data = await res.json();
    assert.match(data.error, /already connected/i);
  });

  // 5. List integrations & workspace isolation
  await t.test('5. List integrations (GET /api/github/integrations) enforces strict workspace isolation', async () => {
    // ws1 has 1 integration
    const res1 = await fetch(`${baseUrl}/api/github/integrations?workspaceId=${ws1}`, {
      headers: { 'X-Demo-Perspective': 'MANAGER' },
    });
    assert.equal(res1.status, 200);
    const data1 = await res1.json();
    assert.equal(data1.status, 'success');
    assert.equal(data1.integrations.length, 1);
    assert.equal(data1.integrations[0].repoId, 12345678);

    // ws2 has 0 integrations
    const res2 = await fetch(`${baseUrl}/api/github/integrations?workspaceId=${ws2}`, {
      headers: { 'X-Demo-Perspective': 'MANAGER' },
    });
    assert.equal(res2.status, 200);
    const data2 = await res2.json();
    assert.equal(data2.integrations.length, 0, 'Workspace 2 must not see Workspace 1 integrations');
  });

  // 6. Synchronize repository: Ingests commits, PRs, issues and creates ProjectSource
  await t.test('6. Synchronize repository (POST /api/github/integrations/:repoId/sync) compiles authentic ProjectSource', async () => {
    const res = await fetch(`${baseUrl}/api/github/integrations/12345678/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Demo-Perspective': 'DEVELOPER', // Developers can trigger sync
      },
      body: JSON.stringify({ workspaceId: ws1 }),
    });

    assert.equal(res.status, 200, 'Must return 200 OK');
    const data = await res.json();
    assert.equal(data.status, 'synced');
    assert.ok(data.source, 'Source must be returned');
    assert.equal(data.source.type, 'github');
    assert.equal(data.source.icon, 'commit');
    assert.equal(data.isChanged, true, 'First sync must be marked as changed');

    // Verify record counts
    assert.equal(data.recordCounts.commits, 2);
    assert.equal(data.recordCounts.pullRequests, 1);
    assert.equal(data.recordCounts.issues, 1);
    assert.equal(data.recordCounts.docs, 1);
    assert.equal(data.recordCounts.total, 5);

    // Verify document text includes commits, PRs, and issues
    const docText = data.source.documentData.extractedText;
    assert.ok(docText.includes('# GitHub Repository: vitsamyak/KnoTrail-Core'));
    assert.ok(docText.includes('switch PostgreSQL port from 5432 to 5433'));
    assert.ok(docText.includes('Enforce Zero Fake AI Invariant'));
    assert.ok(docText.includes('Deprecate legacy mock storage in production runtime'));

    // Verify integration state persisted in storage
    const storage = getStorage();
    const integration = await storage.getGitHubIntegration(ws1, 12345678);
    assert.equal(integration.syncStatus, 'synced');
    assert.ok(integration.lastSyncedAt);
    assert.equal(integration.lastCommitSha, 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2');

    // Verify source is in workspace project
    const project = await storage.getWorkspace(ws1);
    const ghSource = project.sources.find((s) => s.id === data.source.id);
    assert.ok(ghSource, 'GitHub source must exist in workspace sources');
    assert.equal(ghSource.recordCount, 5);
  });

  // 7. Idempotency & Repeat Sync (isChanged: false when content identical)
  await t.test('7. Repeat sync idempotency: identical content returns isChanged: false with identical contentHash', async () => {
    const res = await fetch(`${baseUrl}/api/github/integrations/12345678/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Demo-Perspective': 'MANAGER' },
      body: JSON.stringify({ workspaceId: ws1 }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'synced');
    assert.equal(data.isChanged, false, 'Unchanged content must have isChanged: false');

    const storage = getStorage();
    const project = await storage.getWorkspace(ws1);
    // Sources count must not duplicate
    const ghSources = project.sources.filter((s) => s.type === 'github');
    assert.equal(ghSources.length, 1, 'Sync must update existing source rather than duplicate');
  });

  // 8. Rate limit handling during sync
  await t.test('8. Rate limit handling: returns 429 and updates integration syncStatus to error', async () => {
    // Connect a rate-limited mock repository
    const connectRes = await fetch(`${baseUrl}/api/github/integrations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Demo-Perspective': 'MANAGER' },
      body: JSON.stringify({ workspaceId: ws1, repoOwner: 'vitsamyak', repoName: 'ratelimit-target' }),
    });
    assert.equal(connectRes.status, 201);
    const connectData = await connectRes.json();
    const rlRepoId = connectData.integration.repoId;

    // Create a mock service that throws RateLimit on getCommits
    class RateLimitedMockService extends MockGitHubService {
      async getCommits() {
        throw new GitHubRateLimitError('/repos/test/commits', 1899999999, 60, 0);
      }
    }
    setCustomGitHubService(new RateLimitedMockService());

    const syncRes = await fetch(`${baseUrl}/api/github/integrations/${rlRepoId}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Demo-Perspective': 'MANAGER' },
      body: JSON.stringify({ workspaceId: ws1 }),
    });

    // Ingestion catches rate-limited commits gracefully and continues with available entities,
    // or if getRepository is rate-limited, returns 429.
    // Let's test getRepository rate limit:
    class FullRateLimitService extends MockGitHubService {
      async getRepository() {
        throw new GitHubRateLimitError('/repos/test', 1899999999, 60, 0);
      }
    }
    setCustomGitHubService(new FullRateLimitService());

    const syncRes2 = await fetch(`${baseUrl}/api/github/integrations/${rlRepoId}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Demo-Perspective': 'MANAGER' },
      body: JSON.stringify({ workspaceId: ws1 }),
    });

    assert.equal(syncRes2.status, 429, 'Repository-level rate limit must return 429');
    const syncData2 = await syncRes2.json();
    assert.match(syncData2.error, /rate limit/i);
    assert.equal(typeof syncData2.resetTime, 'number');

    // Storage must record error status
    const storage = getStorage();
    const integration = await storage.getGitHubIntegration(ws1, rlRepoId);
    assert.equal(integration.syncStatus, 'error');
    assert.ok(integration.errorMessage);

    // Restore mock service
    setCustomGitHubService(mockService);
  });

  // 9. Role-Based Security: Developer cannot connect or disconnect
  await t.test('9. RBAC: Developer role is rejected with 403 on connect and disconnect', async () => {
    // Developer trying to connect repo -> 403
    const connectRes = await fetch(`${baseUrl}/api/github/integrations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Demo-Perspective': 'DEVELOPER' },
      body: JSON.stringify({ workspaceId: ws1, repoOwner: 'vitsamyak', repoName: 'dev-forbidden' }),
    });
    assert.equal(connectRes.status, 403, 'Developer role must be forbidden from connecting repos');

    // Developer trying to disconnect repo -> 403
    const deleteRes = await fetch(`${baseUrl}/api/github/integrations/12345678`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'X-Demo-Perspective': 'DEVELOPER' },
      body: JSON.stringify({ workspaceId: ws1 }),
    });
    assert.equal(deleteRes.status, 403, 'Developer role must be forbidden from disconnecting repos');

    // External role trying to sync -> 403
    const syncRes = await fetch(`${baseUrl}/api/github/integrations/12345678/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Demo-Perspective': 'EXTERNAL' },
      body: JSON.stringify({ workspaceId: ws1 }),
    });
    assert.equal(syncRes.status, 403, 'External role must be forbidden from syncing repos');
  });

  // 10. Disconnect repository: Deletes integration and removes associated ProjectSource
  await t.test('10. Disconnect repository (DELETE /api/github/integrations/:repoId) cleans up integration and sources', async () => {
    const res = await fetch(`${baseUrl}/api/github/integrations/12345678`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'X-Demo-Perspective': 'MANAGER' },
      body: JSON.stringify({ workspaceId: ws1 }),
    });

    assert.equal(res.status, 200, 'Must return 200 OK');
    const data = await res.json();
    assert.equal(data.status, 'deleted');

    // Integration must no longer exist
    const storage = getStorage();
    const integration = await storage.getGitHubIntegration(ws1, 12345678);
    assert.equal(integration, null, 'Integration must be deleted from storage');

    // Associated source must be removed from workspace
    const project = await storage.getWorkspace(ws1);
    const ghSources = (project?.sources || []).filter((s) => s.id === 'src_gh_12345678');
    assert.equal(ghSources.length, 0, 'Associated GitHub source must be removed from workspace');

    // Repeat delete returns 404
    const res2 = await fetch(`${baseUrl}/api/github/integrations/12345678`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'X-Demo-Perspective': 'MANAGER' },
      body: JSON.stringify({ workspaceId: ws1 }),
    });
    assert.equal(res2.status, 404, 'Deleting non-existent integration must return 404');
  });

  // 11. Rate-limit telemetry endpoint
  await t.test('11. Rate-limit telemetry (GET /api/github/rate-limit) returns sanitized rate-limit state', async () => {
    const res = await fetch(`${baseUrl}/api/github/rate-limit?workspaceId=${ws1}`, {
      headers: { 'X-Demo-Perspective': 'MANAGER' },
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'success');
    assert.ok(data.rateLimit);
    assert.equal(typeof data.rateLimit.limit, 'number');
    assert.equal(typeof data.rateLimit.remaining, 'number');
    assert.equal(typeof data.rateLimit.resetTime, 'number');
  });

  // 12. Credential leakage prevention
  await t.test('12. Zero credential leakage: error responses and JSON output never contain secret tokens', async () => {
    const fakeSecret = 'ghp_superSecretToken1234567890abcdef';
    class LeakingMockService extends MockGitHubService {
      async getRepository() {
        throw new GitHubAuthError('/repos/test', `Failed with token: ${fakeSecret}`);
      }
    }
    setCustomGitHubService(new LeakingMockService());

    const res = await fetch(`${baseUrl}/api/github/integrations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Demo-Perspective': 'MANAGER' },
      body: JSON.stringify({ workspaceId: ws1, repoOwner: 'vitsamyak', repoName: 'leak-check' }),
    });

    const bodyText = await res.text();
    assert.doesNotMatch(bodyText, new RegExp(fakeSecret), 'Secret token must never appear in response body');
    assert.match(bodyText, /\[REDACTED_CREDENTIAL\]/, 'Secret token must be sanitized with [REDACTED_CREDENTIAL]');
  });
});
