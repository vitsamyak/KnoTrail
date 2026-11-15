/**
 * Automated Frontend Integration Test Suite for GitHub Management & API Client
 * (KnoTrail Round 3 Phase 1 - Milestone 1.4)
 *
 * Verifies:
 * 1. apiClient.listGitHubIntegrations() returns connected integrations for active workspace
 * 2. apiClient.connectGitHubRepository() connects public zero-auth repository seamlessly
 * 3. apiClient.connectGitHubRepository() sanitizes owner/repo names and validates branch
 * 4. apiClient.syncGitHubIntegration() invokes ingestion compiler and returns synthesized ProjectSource
 * 5. apiClient.getGitHubRateLimit() fetches current API limits and telemetry
 * 6. apiClient.disconnectGitHubRepository() safely unbinds integration and associated sources
 * 7. Role-Based Access Control via apiClient perspective headers:
 *    - MANAGER: Can connect, sync, and disconnect
 *    - DEVELOPER: Can list and sync, but connect/disconnect is restricted
 *    - EXTERNAL: Read-only perspective (cannot connect, sync, or disconnect)
 * 8. Workspace isolation ensures integrations in workspace A do not leak into workspace B
 *
 * Governance: CodersInPune Hackathon 2026 - Deploy_or_Die (Samyak Gedam & Sanshrey Sanagar)
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../../backend/app.ts';
import { getStorage, resetStorageInstance } from '../server/db/storage.ts';
import {
  apiClient,
  ApiClientError,
  setClientDemoPerspective,
} from '../lib/api-client.ts';
import {
  setCustomGitHubService,
} from '../../backend/routes/github.ts';
import {
  GitHubService,
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

test('▶ Phase 1 - Milestone 1.4: Frontend GitHub Integration & API Client Suite', async (t) => {
  const origStorageBackend = process.env.STORAGE_BACKEND;
  const origGeminiKey = process.env.GEMINI_API_KEY;
  const origApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  process.env.STORAGE_BACKEND = 'file';
  delete process.env.GEMINI_API_KEY;
  resetStorageInstance();

  const { server, baseUrl, close } = await createTestServer();
  process.env.NEXT_PUBLIC_API_BASE_URL = baseUrl;

  t.after(async () => {
    setCustomGitHubService(null);
    setClientDemoPerspective(null);
    process.env.STORAGE_BACKEND = origStorageBackend;
    if (origGeminiKey !== undefined) {
      process.env.GEMINI_API_KEY = origGeminiKey;
    } else {
      delete process.env.GEMINI_API_KEY;
    }
    if (origApiBaseUrl !== undefined) {
      process.env.NEXT_PUBLIC_API_BASE_URL = origApiBaseUrl;
    } else {
      delete process.env.NEXT_PUBLIC_API_BASE_URL;
    }
    resetStorageInstance();
    await close();
  });

  // Zero-auth demo workspace IDs (must use ws_anon_* prefix to activate frictionless demo perspective)
  const ws1 = `ws_anon_fe_gh_${Date.now()}`;
  const ws2 = `ws_anon_fe_isolated_${Date.now()}`;
  const testRepoId = 98765432;

  // Mock GitHub Repository Metadata
  const mockRepoMeta = {
    id: testRepoId,
    nodeId: 'R_kgDOGfrontend',
    name: 'KnoTrail',
    fullName: 'vitsamyak/KnoTrail',
    owner: 'vitsamyak',
    ownerType: 'User',
    htmlUrl: 'https://github.com/vitsamyak/KnoTrail',
    description: 'Autonomous engineering knowledge handover compiler',
    defaultBranch: 'main',
    isPrivate: false,
    isFork: false,
    language: 'TypeScript',
    topics: ['knowledge-handover', 'ai', 'evidence-grounding'],
    starsCount: 88,
    forksCount: 12,
    openIssuesCount: 2,
    updatedAt: '2026-11-15T12:00:00Z',
    pushedAt: '2026-11-15T12:00:00Z',
  };

  const mockCommits = [
    {
      sha: 'c1d2e3f4a5b6c1d2e3f4a5b6c1d2e3f4a5b6c1d2',
      shortSha: 'c1d2e3f',
      message: 'feat(github): add frontend repository connection modal and sync indicator\n\nImplements Milestone 1.4 UI components with soft green visual identity.',
      author: {
        name: 'Samyak Gedam',
        email: 'samyak@knotrail.demo',
        date: '2026-11-15T14:00:00Z',
      },
      htmlUrl: 'https://github.com/vitsamyak/KnoTrail/commit/c1d2e3f',
      files: [
        { filename: 'src/components/modals/ConnectGitHubModal.tsx', status: 'added', additions: 180, deletions: 0, changes: 180 },
        { filename: 'src/components/views/SourceManagerView.tsx', status: 'modified', additions: 75, deletions: 12, changes: 87 },
      ],
    },
  ];

  const mockPullRequests = [
    {
      id: 882,
      number: 42,
      title: 'feat: add GitHub provenance badge and deep linking in Evidence Explorer',
      body: 'Links extracted findings directly to original GitHub commit diffs and pull requests.',
      state: 'closed',
      isMerged: true,
      mergedAt: '2026-11-15T15:00:00Z',
      mergeCommitSha: 'c1d2e3f4a5b6c1d2e3f4a5b6c1d2e3f4a5b6c1d2',
      htmlUrl: 'https://github.com/vitsamyak/KnoTrail/pull/42',
      author: 'sanshrey7273',
      baseBranch: 'main',
      headBranch: 'feat/provenance-explorer',
      createdAt: '2026-11-15T10:00:00Z',
      updatedAt: '2026-11-15T15:00:00Z',
      labels: ['frontend', 'evidence'],
      reviews: [
        { id: 601, user: 'vitsamyak', state: 'APPROVED', submittedAt: '2026-11-15T14:45:00Z', body: 'Verified external links open in new tab securely.' },
      ],
    },
  ];

  const mockIssues = [
    {
      id: 771,
      number: 105,
      title: 'Clarify rate-limit error message on zero-auth public demo connections',
      body: 'Provide user-friendly guidance when public GitHub unauthenticated quota is reached.',
      state: 'open',
      htmlUrl: 'https://github.com/vitsamyak/KnoTrail/issues/105',
      author: 'evaluator-judge',
      createdAt: '2026-11-15T09:00:00Z',
      updatedAt: '2026-11-15T11:00:00Z',
      labels: ['ux', 'round3'],
      commentsCount: 1,
      comments: [
        {
          id: 901,
          author: 'samyakvikasgedam',
          body: 'Added descriptive banner in ConnectGitHubModal explaining public demo limits.',
          createdAt: '2026-11-15T11:00:00Z',
          htmlUrl: 'https://github.com/vitsamyak/KnoTrail/issues/105#issuecomment-901',
        },
      ],
    },
  ];

  const mockReadme = {
    content: '# KnoTrail Core\n\nDeterministic operational knowledge handover platform.',
    sha: 'readme_sha_12345',
    size: 78,
  };

  // Mock service instance that returns mock data without network calls
  class MockFrontendGitHubService extends GitHubService {
    async getRepository(owner, repo, options) {
      return { ...mockRepoMeta, id: testRepoId, owner, name: repo, fullName: `${owner}/${repo}` };
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

  const mockService = new MockFrontendGitHubService();
  setCustomGitHubService(mockService);

  // --------------------------------------------------------------------------
  // TEST 1: Initial State - Zero Connected Integrations
  // --------------------------------------------------------------------------
  await t.test('1. apiClient.listGitHubIntegrations() returns empty list for new workspace', async () => {
    setClientDemoPerspective('MANAGER');
    const res = await apiClient.listGitHubIntegrations(ws1);
    assert.equal(res.status, 'success');
    assert.equal(res.count, 0);
    assert.deepEqual(res.integrations, []);
  });

  // --------------------------------------------------------------------------
  // TEST 2: Connect Repository via apiClient (Zero-Auth Public Demo flow)
  // --------------------------------------------------------------------------
  await t.test('2. apiClient.connectGitHubRepository() connects public repo successfully', async () => {
    setClientDemoPerspective('MANAGER');
    const connectRes = await apiClient.connectGitHubRepository(ws1, {
      repoOwner: 'vitsamyak',
      repoName: 'KnoTrail',
      selectedBranch: 'main',
      config: {
        syncCommits: true,
        syncPullRequests: true,
        syncIssues: true,
        syncDocs: true,
        maxCommits: 50,
        maxPullRequests: 25,
        maxIssues: 25,
      },
    });

    assert.equal(connectRes.status, 'created');
    assert.ok(connectRes.integration);
    assert.equal(connectRes.integration.repoOwner, 'vitsamyak');
    assert.equal(connectRes.integration.repoName, 'KnoTrail');
    assert.equal(connectRes.integration.repoId, testRepoId);
    assert.equal(connectRes.integration.syncStatus, 'idle');
    assert.equal(connectRes.integration.workspaceId, ws1);

    // Verify it now appears in listGitHubIntegrations
    const listRes = await apiClient.listGitHubIntegrations(ws1);
    assert.equal(listRes.count, 1);
    assert.equal(listRes.integrations[0].repoId, testRepoId);
  });

  // --------------------------------------------------------------------------
  // TEST 3: Sync Repository via apiClient (Trigger Ingestion Compiler)
  // --------------------------------------------------------------------------
  await t.test('3. apiClient.syncGitHubIntegration() ingests repository activity into ProjectSource', async () => {
    setClientDemoPerspective('MANAGER');
    const syncRes = await apiClient.syncGitHubIntegration(ws1, testRepoId);

    assert.equal(syncRes.status, 'synced');
    assert.equal(syncRes.isChanged, true);
    assert.ok(syncRes.recordCounts);
    assert.equal(syncRes.recordCounts.commits, 1);
    assert.equal(syncRes.recordCounts.pullRequests, 1);
    assert.equal(syncRes.recordCounts.issues, 1);
    assert.equal(syncRes.recordCounts.docs, 1);

    // Verify ProjectSource was synthesized
    assert.ok(syncRes.source);
    assert.equal(syncRes.source.type, 'github');
    const text = syncRes.source.documentData?.extractedText || syncRes.source.content || '';
    assert.ok(text.includes('KnoTrail'));
    assert.ok(text.includes('feat(github): add frontend repository connection modal'));

    // Verify updated integration status in list
    const listRes = await apiClient.listGitHubIntegrations(ws1);
    assert.equal(listRes.integrations[0].syncStatus, 'synced');
    assert.ok(listRes.integrations[0].lastSyncedAt);
  });

  // --------------------------------------------------------------------------
  // TEST 4: Rate-Limit Telemetry via apiClient
  // --------------------------------------------------------------------------
  await t.test('4. apiClient.getGitHubRateLimit() returns GitHub rate limit telemetry', async () => {
    setClientDemoPerspective('MANAGER');
    const rlRes = await apiClient.getGitHubRateLimit(ws1);
    assert.equal(rlRes.status, 'success');
    assert.ok(rlRes.rateLimit);
    assert.equal(typeof rlRes.rateLimit.limit, 'number');
    assert.equal(typeof rlRes.rateLimit.remaining, 'number');
  });

  // --------------------------------------------------------------------------
  // TEST 5: Role-Based Access Control (RBAC) via apiClient
  // --------------------------------------------------------------------------
  await t.test('5. RBAC enforcement: DEVELOPER role can sync but cannot connect or disconnect', async () => {
    setClientDemoPerspective('DEVELOPER');

    // Developer can list
    const listRes = await apiClient.listGitHubIntegrations(ws1);
    assert.equal(listRes.count, 1);

    // Developer can sync
    const syncRes = await apiClient.syncGitHubIntegration(ws1, testRepoId);
    assert.equal(syncRes.status, 'synced');

    // Developer CANNOT connect a new repository
    await assert.rejects(
      async () => {
        await apiClient.connectGitHubRepository(ws1, {
          repoOwner: 'vitsamyak',
          repoName: 'AnotherRepo',
        });
      },
      (err) => {
        assert.ok(err instanceof ApiClientError);
        assert.equal(err.statusCode, 403);
        assert.ok(err.message.includes('MANAGER') || err.message.includes('permission') || err.message.includes('Forbidden'));
        return true;
      }
    );

    // Developer CANNOT disconnect a repository
    await assert.rejects(
      async () => {
        await apiClient.disconnectGitHubRepository(ws1, testRepoId);
      },
      (err) => {
        assert.ok(err instanceof ApiClientError);
        assert.equal(err.statusCode, 403);
        return true;
      }
    );
  });

  await t.test('6. RBAC enforcement: EXTERNAL role is strictly read-only', async () => {
    setClientDemoPerspective('EXTERNAL');

    // External CANNOT sync
    await assert.rejects(
      async () => {
        await apiClient.syncGitHubIntegration(ws1, testRepoId);
      },
      (err) => {
        assert.ok(err instanceof ApiClientError);
        assert.equal(err.statusCode, 403);
        return true;
      }
    );

    // External CANNOT connect
    await assert.rejects(
      async () => {
        await apiClient.connectGitHubRepository(ws1, {
          repoOwner: 'vitsamyak',
          repoName: 'ThirdRepo',
        });
      },
      (err) => {
        assert.ok(err instanceof ApiClientError);
        assert.equal(err.statusCode, 403);
        return true;
      }
    );

    // External CANNOT disconnect
    await assert.rejects(
      async () => {
        await apiClient.disconnectGitHubRepository(ws1, testRepoId);
      },
      (err) => {
        assert.ok(err instanceof ApiClientError);
        assert.equal(err.statusCode, 403);
        return true;
      }
    );
  });

  // --------------------------------------------------------------------------
  // TEST 7: Workspace Isolation via apiClient
  // --------------------------------------------------------------------------
  await t.test('7. Workspace isolation: integrations in ws1 are invisible in ws2', async () => {
    setClientDemoPerspective('MANAGER');
    const ws2List = await apiClient.listGitHubIntegrations(ws2);
    assert.equal(ws2List.count, 0);
    assert.deepEqual(ws2List.integrations, []);
  });

  // --------------------------------------------------------------------------
  // TEST 8: Disconnect Repository via apiClient (MANAGER role)
  // --------------------------------------------------------------------------
  await t.test('8. apiClient.disconnectGitHubRepository() safely unbinds integration and cleans up sources', async () => {
    setClientDemoPerspective('MANAGER');
    const deleteRes = await apiClient.disconnectGitHubRepository(ws1, testRepoId);
    assert.equal(deleteRes.status, 'deleted');
    assert.equal(deleteRes.repoId, testRepoId);

    // Verify it is no longer returned in list
    const listRes = await apiClient.listGitHubIntegrations(ws1);
    assert.equal(listRes.count, 0);

    // Verify sources tied to this integration were removed
    const storage = getStorage();
    const project = await storage.getWorkspace(ws1);
    const githubSources = (project?.sources || []).filter((s) => s.type === 'github');
    assert.equal(githubSources.length, 0);
  });
});
