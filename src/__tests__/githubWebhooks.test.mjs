/**
 * Automated Test Suite: Secure GitHub Webhook Processing
 * (KnoTrail Round 3 Phase 1 - Milestone 1.3)
 *
 * Verifies end-to-end GitHub webhook ingestion and automated synchronization:
 * 1. Signature security: timing-safe HMAC-SHA256 verification (valid, invalid, missing).
 * 2. Header validation: X-GitHub-Delivery and X-GitHub-Event enforcement.
 * 3. Ping event: returns 200 pong handshake.
 * 4. Malformed payload rejection: invalid JSON or missing repository metadata returns 400.
 * 5. Unknown repository handling: unrecognized repoId returns 200 ignored without crashing.
 * 6. Push event processing: ingests new commits, compiles source, and marks handover outdated.
 * 7. Pull request event processing: triggers sync on opened/closed/reopened/synchronize.
 * 8. Issue event processing: triggers sync on opened/closed/reopened/edited.
 * 9. Delivery Idempotency: duplicate X-GitHub-Delivery IDs are dropped immediately.
 * 10. Non-blocking async response: returns 202 Accepted immediately in standard mode.
 * 11. Zero Secret Leakage: responses never expose webhook secret or bearer tokens.
 * 12. Fault tolerance & error state tracking: records error on integration if fetch fails.
 *
 * Governance: CodersInPune Hackathon 2026 - Deploy_or_Die (Samyak Gedam & Sanshrey Sanagar)
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { app } from '../../backend/app.ts';
import { getStorage } from '../server/db/storage.ts';
import {
  setCustomGitHubService,
  setWebhookSecretOverride,
  verifyGitHubWebhookSignature,
} from '../../backend/routes/github.ts';
import {
  GitHubService,
  GitHubNotFoundError,
  GitHubRateLimitError,
} from '../../backend/services/github.ts';

const TEST_SECRET = 'knotrail_test_webhook_secret_2026_strict';

/**
 * Computes authentic GitHub webhook signature header (sha256=<hex>).
 */
function signPayload(body, secret = TEST_SECRET) {
  const raw = typeof body === 'string' ? body : JSON.stringify(body);
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(raw);
  return `sha256=${hmac.digest('hex')}`;
}

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

test('▶ Phase 1 - Milestone 1.3: Secure GitHub Webhook Processing Suite', async (t) => {
  const origStorageBackend = process.env.STORAGE_BACKEND;
  const origGeminiKey = process.env.GEMINI_API_KEY;
  process.env.STORAGE_BACKEND = 'file';
  delete process.env.GEMINI_API_KEY;

  const { server, baseUrl, close } = await createTestServer();

  // Configure test webhook secret override
  setWebhookSecretOverride(TEST_SECRET);

  const ws = `ws_webhook_test_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const repoId = Math.floor(10000000 + Math.random() * 89999999);
  const storage = getStorage();

  t.after(async () => {
    setCustomGitHubService(null);
    setWebhookSecretOverride(null);
    process.env.STORAGE_BACKEND = origStorageBackend;
    if (origGeminiKey !== undefined) {
      process.env.GEMINI_API_KEY = origGeminiKey;
    } else {
      delete process.env.GEMINI_API_KEY;
    }
    await storage.deleteGitHubIntegration(ws, repoId).catch(() => {});
    await close();
  });

  // Create initial test workspace
  await storage.createWorkspace(ws, {
    id: ws,
    name: 'Webhook Invalidation Workspace',
    code: 'WH-01',
    description: 'Workspace to test webhook events and handover invalidation',
    lead: { id: 'lead-1', name: 'Samyak Gedam', role: 'Lead', email: 'lead@knotrail.demo', avatar: '', outgoing: true, transitionNotes: '' },
    stakeholders: [],
    sources: [],
    findings: [],
    currentHandover: {
      id: 'handover-wh-1',
      workspaceId: ws,
      projectId: ws,
      version: 'v1.0',
      generatedAt: '2026-11-15T10:00:00Z',
      certifiedDate: 'November 15, 2026',
      certifiedBy: 'Samyak Gedam',
      certificationHash: 'SHA256:dummyhash',
      isOutdated: false,
      metadata: {
        projectName: 'Webhook Invalidation Workspace',
        projectCode: 'WH-01',
        description: 'Test',
        version: 'v1.0',
        auditStamp: '#KT-WH-01',
      },
      executiveSummary: 'Initial summary',
      architectureOverview: { summary: 'Initial', primaryComponents: [], coreDataFlows: [], criticalAssumptions: [] },
      decisions: [],
      pendingTasks: [],
      responsibilities: [],
      risks: [],
      dependencies: [],
      unresolvedQuestions: [],
      immediateActions: [],
      shortTermActions: [],
      followUpActions: [],
      contacts: [],
      evidenceInventory: [],
      reviewHistory: { approvedCount: 0, acceptedUncertainCount: 0, rejectedCount: 0, resolvedConflictsCount: 0, auditActions: [] },
      sectionCounts: { decisions: 0, tasks: 0, risks: 0, dependencies: 0, questions: 0, nextActions: 0, contacts: 0, totalApprovedFindings: 0 },
    },
  });

  // Connect integration to the workspace
  const mockIntegration = {
    id: `gh_integ_${repoId}`,
    workspaceId: ws,
    repoOwner: 'vitsamyak',
    repoName: 'KnoTrail-Webhook-Target',
    repoId,
    defaultBranch: 'main',
    selectedBranch: 'main',
    syncStatus: 'synced',
    lastSyncedAt: '2026-11-15T12:00:00Z',
    config: {
      includeCommits: true,
      includePullRequests: true,
      includeIssues: true,
      includeDocs: true,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await storage.saveGitHubIntegration(ws, mockIntegration);

  // Deterministic Mock Service
  let commitCount = 2;
  class MockWebhookGitHubService extends GitHubService {
    async getRepository(owner, repo) {
      return {
        id: repoId,
        name: repo,
        owner,
        fullName: `${owner}/${repo}`,
        defaultBranch: 'main',
        isPrivate: false,
        updatedAt: '2026-11-15T18:00:00Z',
        pushedAt: '2026-11-15T18:00:00Z',
      };
    }

    async getCommits() {
      const commits = [];
      for (let i = 1; i <= commitCount; i++) {
        commits.push({
          sha: `sha_${i}_` + '0'.repeat(34),
          shortSha: `sha_${i}`,
          message: `feat: commit message number ${i}`,
          author: { name: 'Samyak Gedam', email: 'samyak@knotrail.demo', date: '2026-11-15T18:00:00Z' },
          htmlUrl: `https://github.com/vitsamyak/KnoTrail-Webhook-Target/commit/sha_${i}`,
          files: [{ filename: 'src/config.ts', additions: 2, deletions: 0, changes: 2 }],
        });
      }
      return commits;
    }

    async getPullRequests() {
      return [
        {
          id: 101,
          number: 5,
          title: 'Implement automated webhook drift invalidation',
          body: 'Decided to flag current handover as outdated when new commits arrive.',
          state: 'open',
          isMerged: false,
          htmlUrl: 'https://github.com/vitsamyak/KnoTrail-Webhook-Target/pull/5',
          author: 'samyakvikasgedam',
          createdAt: '2026-11-15T17:00:00Z',
          updatedAt: '2026-11-15T18:00:00Z',
          labels: ['automation'],
          reviews: [],
        },
      ];
    }

    async getPullRequestReviews() {
      return [];
    }

    async getIssues() {
      return [
        {
          id: 201,
          number: 12,
          title: 'Memory exhaustion on repeated webhook calls',
          body: 'Resolved: Implemented payload deduplication via X-GitHub-Delivery.',
          state: 'closed',
          htmlUrl: 'https://github.com/vitsamyak/KnoTrail-Webhook-Target/issues/12',
          author: 'sanshrey7273',
          assignees: ['samyakvikasgedam'],
          labels: ['bug'],
          commentsCount: 0,
          createdAt: '2026-11-15T16:00:00Z',
          updatedAt: '2026-11-15T18:00:00Z',
          closedAt: '2026-11-15T18:00:00Z',
          comments: [],
        },
      ];
    }

    async getIssueComments() {
      return [];
    }

    async getFileContent() {
      return null;
    }
  }

  setCustomGitHubService(new MockWebhookGitHubService());

  // 1. Signature Security: Missing signature returns 400
  await t.test('1. Security: Missing X-Hub-Signature-256 header returns 400', async () => {
    const payload = { repository: { id: repoId } };
    const res = await fetch(`${baseUrl}/api/github/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-GitHub-Delivery': crypto.randomUUID(),
        'X-GitHub-Event': 'push',
      },
      body: JSON.stringify(payload),
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /Missing X-Hub-Signature-256 header/i);
  });

  // 2. Signature Security: Invalid signature returns 401
  await t.test('2. Security: Invalid X-Hub-Signature-256 returns 401 Unauthorized', async () => {
    const payload = { repository: { id: repoId } };
    const res = await fetch(`${baseUrl}/api/github/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-GitHub-Delivery': crypto.randomUUID(),
        'X-GitHub-Event': 'push',
        'X-Hub-Signature-256': 'sha256=invalid_tampered_hex_signature_value_00000000000000000000000000000000',
      },
      body: JSON.stringify(payload),
    });

    assert.equal(res.status, 401);
    const body = await res.json();
    assert.match(body.error, /Invalid webhook signature/i);
  });

  // 3. Header Validation: Missing Delivery or Event returns 400
  await t.test('3. Header validation: Missing X-GitHub-Delivery or X-GitHub-Event returns 400', async () => {
    const payload = JSON.stringify({ repository: { id: repoId } });
    const sig = signPayload(payload);

    // Missing X-GitHub-Delivery
    const res1 = await fetch(`${baseUrl}/api/github/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-GitHub-Event': 'push',
        'X-Hub-Signature-256': sig,
      },
      body: payload,
    });
    assert.equal(res1.status, 400);
    const b1 = await res1.json();
    assert.match(b1.error, /X-GitHub-Delivery/i);

    // Missing X-GitHub-Event
    const res2 = await fetch(`${baseUrl}/api/github/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-GitHub-Delivery': crypto.randomUUID(),
        'X-Hub-Signature-256': sig,
      },
      body: payload,
    });
    assert.equal(res2.status, 400);
    const b2 = await res2.json();
    assert.match(b2.error, /X-GitHub-Event/i);
  });

  // 4. Ping Event Handshake
  await t.test('4. Ping event: returns 200 and pong message', async () => {
    const payload = JSON.stringify({ zen: 'Keep it logically awesome.', hook_id: 123456 });
    const sig = signPayload(payload);

    const res = await fetch(`${baseUrl}/api/github/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-GitHub-Delivery': crypto.randomUUID(),
        'X-GitHub-Event': 'ping',
        'X-Hub-Signature-256': sig,
      },
      body: payload,
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'pong');
  });

  // 5. Malformed Payload Rejection
  await t.test('5. Malformed payload: Missing repository or invalid structure returns 400', async () => {
    // Missing repository field
    const payloadNoRepo = JSON.stringify({ action: 'opened' });
    const sigNoRepo = signPayload(payloadNoRepo);

    const res1 = await fetch(`${baseUrl}/api/github/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-GitHub-Delivery': crypto.randomUUID(),
        'X-GitHub-Event': 'push',
        'X-Hub-Signature-256': sigNoRepo,
      },
      body: payloadNoRepo,
    });
    assert.equal(res1.status, 400);
    const b1 = await res1.json();
    assert.match(b1.error, /repository object with numeric id/i);

    // Malformed JSON text
    const malformedJson = '{"repository": { id: invalid_json }';
    const sigMalformed = signPayload(malformedJson);

    const res2 = await fetch(`${baseUrl}/api/github/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-GitHub-Delivery': crypto.randomUUID(),
        'X-GitHub-Event': 'push',
        'X-Hub-Signature-256': sigMalformed,
      },
      body: malformedJson,
    });
    assert.equal(res2.status, 400);
  });

  // 6. Unknown Repository: Ignored with status 200
  await t.test('6. Unknown repository: Returns 200 with ignored status when repoId not in workspace', async () => {
    const unknownRepoId = 99999999;
    const payload = JSON.stringify({
      repository: { id: unknownRepoId, full_name: 'unknown/repo' },
      ref: 'refs/heads/main',
      after: 'sha_unknown_123',
    });
    const sig = signPayload(payload);

    const res = await fetch(`${baseUrl}/api/github/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-GitHub-Delivery': crypto.randomUUID(),
        'X-GitHub-Event': 'push',
        'X-Hub-Signature-256': sig,
      },
      body: payload,
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'ignored');
    assert.match(body.message, /not connected to any workspace/i);
  });

  // 7. Push Event: Syncs repository and marks handover as outdated
  await t.test('7. Push event: Ingests new commits, compiles source, and marks handover outdated', async () => {
    commitCount = 3; // Introduce new commit
    const payload = JSON.stringify({
      repository: { id: repoId, full_name: 'vitsamyak/KnoTrail-Webhook-Target' },
      ref: 'refs/heads/main',
      after: 'sha_3_0000000000000000000000000000000000',
      commits: [{ id: 'sha_3', message: 'feat: new third commit' }],
    });
    const sig = signPayload(payload);

    const res = await fetch(`${baseUrl}/api/github/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-GitHub-Delivery': crypto.randomUUID(),
        'X-GitHub-Event': 'push',
        'X-Hub-Signature-256': sig,
        'X-KnoTrail-Wait-Sync': 'true',
      },
      body: payload,
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'synced');
    assert.equal(body.results.length, 1);
    assert.equal(body.results[0].workspaceId, ws);
    assert.equal(body.results[0].recordCounts.commits, 3);
    assert.equal(body.results[0].isChanged, true);

    // Verify workspace state: handover must be marked outdated
    const project = await storage.getWorkspace(ws);
    assert.ok(project);
    assert.equal(project.currentHandover.isOutdated, true, 'Handover must be marked isOutdated: true after push');
    assert.match(project.currentHandover.outdatedReason, /Push event on branch/i);

    // Verify integration state updated
    const integ = await storage.getGitHubIntegration(ws, repoId);
    assert.equal(integ.syncStatus, 'synced');
    assert.ok(integ.lastSyncedAt);
  });

  // 8. Pull Request Event: Opened triggers sync
  await t.test('8. Pull request event: Action "opened" triggers sync; unmonitored action ignored', async () => {
    // A. Action "opened"
    const payloadOpened = JSON.stringify({
      action: 'opened',
      pull_request: { number: 6, title: 'Add PR test' },
      repository: { id: repoId, full_name: 'vitsamyak/KnoTrail-Webhook-Target' },
    });
    const sigOpened = signPayload(payloadOpened);

    const res1 = await fetch(`${baseUrl}/api/github/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-GitHub-Delivery': crypto.randomUUID(),
        'X-GitHub-Event': 'pull_request',
        'X-Hub-Signature-256': sigOpened,
        'X-KnoTrail-Wait-Sync': 'true',
      },
      body: payloadOpened,
    });

    assert.equal(res1.status, 200);
    const body1 = await res1.json();
    assert.equal(body1.status, 'synced');

    // B. Unmonitored action "labeled"
    const payloadLabeled = JSON.stringify({
      action: 'labeled',
      pull_request: { number: 6 },
      repository: { id: repoId, full_name: 'vitsamyak/KnoTrail-Webhook-Target' },
    });
    const sigLabeled = signPayload(payloadLabeled);

    const res2 = await fetch(`${baseUrl}/api/github/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-GitHub-Delivery': crypto.randomUUID(),
        'X-GitHub-Event': 'pull_request',
        'X-Hub-Signature-256': sigLabeled,
      },
      body: payloadLabeled,
    });

    assert.equal(res2.status, 200);
    const body2 = await res2.json();
    assert.equal(body2.status, 'ignored');
    assert.match(body2.message, /labeled/i);
  });

  // 9. Issues Event: Closed triggers sync; unmonitored action ignored
  await t.test('9. Issues event: Action "closed" triggers sync; unmonitored action ignored', async () => {
    // A. Action "closed"
    const payloadClosed = JSON.stringify({
      action: 'closed',
      issue: { number: 12, title: 'Memory issue resolved' },
      repository: { id: repoId, full_name: 'vitsamyak/KnoTrail-Webhook-Target' },
    });
    const sigClosed = signPayload(payloadClosed);

    const res1 = await fetch(`${baseUrl}/api/github/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-GitHub-Delivery': crypto.randomUUID(),
        'X-GitHub-Event': 'issues',
        'X-Hub-Signature-256': sigClosed,
        'X-KnoTrail-Wait-Sync': 'true',
      },
      body: payloadClosed,
    });

    assert.equal(res1.status, 200);
    const body1 = await res1.json();
    assert.equal(body1.status, 'synced');

    // B. Unmonitored action "assigned"
    const payloadAssigned = JSON.stringify({
      action: 'assigned',
      issue: { number: 12 },
      repository: { id: repoId, full_name: 'vitsamyak/KnoTrail-Webhook-Target' },
    });
    const sigAssigned = signPayload(payloadAssigned);

    const res2 = await fetch(`${baseUrl}/api/github/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-GitHub-Delivery': crypto.randomUUID(),
        'X-GitHub-Event': 'issues',
        'X-Hub-Signature-256': sigAssigned,
      },
      body: payloadAssigned,
    });

    assert.equal(res2.status, 200);
    const body2 = await res2.json();
    assert.equal(body2.status, 'ignored');
  });

  // 10. Delivery Idempotency: Duplicate delivery ID dropped
  await t.test('10. Delivery Idempotency: Duplicate delivery ID is dropped without reprocessing', async () => {
    const fixedDeliveryId = crypto.randomUUID();
    const payload = JSON.stringify({
      repository: { id: repoId, full_name: 'vitsamyak/KnoTrail-Webhook-Target' },
      ref: 'refs/heads/main',
      after: 'sha_10_first_call',
    });
    const sig = signPayload(payload);

    // First call: succeeds
    const res1 = await fetch(`${baseUrl}/api/github/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-GitHub-Delivery': fixedDeliveryId,
        'X-GitHub-Event': 'push',
        'X-Hub-Signature-256': sig,
        'X-KnoTrail-Wait-Sync': 'true',
      },
      body: payload,
    });
    assert.equal(res1.status, 200);
    const b1 = await res1.json();
    assert.equal(b1.status, 'synced');

    // Second call: duplicate delivery ID
    const res2 = await fetch(`${baseUrl}/api/github/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-GitHub-Delivery': fixedDeliveryId,
        'X-GitHub-Event': 'push',
        'X-Hub-Signature-256': sig,
        'X-KnoTrail-Wait-Sync': 'true',
      },
      body: payload,
    });
    assert.equal(res2.status, 200);
    const b2 = await res2.json();
    assert.equal(b2.status, 'duplicate');
    assert.match(b2.message, /already been processed/i);
  });

  // 11. Non-blocking Asynchronous Mode: Returns 202 Accepted
  await t.test('11. Non-blocking mode: Standard webhook request returns 202 Accepted immediately', async () => {
    const payload = JSON.stringify({
      repository: { id: repoId, full_name: 'vitsamyak/KnoTrail-Webhook-Target' },
      ref: 'refs/heads/main',
      after: 'sha_async_11',
    });
    const sig = signPayload(payload);

    const res = await fetch(`${baseUrl}/api/github/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-GitHub-Delivery': crypto.randomUUID(),
        'X-GitHub-Event': 'push',
        'X-Hub-Signature-256': sig,
      },
      body: payload,
    });

    assert.equal(res.status, 202);
    const body = await res.json();
    assert.equal(body.status, 'accepted');
    assert.match(body.message, /queued/i);
    assert.deepEqual(body.workspacesAffected, [ws]);
  });

  // 12. Zero Secret Leakage: Responses never leak secret or internal tokens
  await t.test('12. Zero Credential Leakage: Error responses never expose webhook secret or tokens', async () => {
    const payload = JSON.stringify({ invalid: 'field' });
    const res = await fetch(`${baseUrl}/api/github/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-GitHub-Delivery': crypto.randomUUID(),
        'X-GitHub-Event': 'push',
        'X-Hub-Signature-256': 'sha256=invalid',
      },
      body: payload,
    });

    const text = await res.text();
    assert.ok(!text.includes(TEST_SECRET), 'Webhook secret MUST NOT be leaked in response');
    assert.ok(!text.includes('Bearer'), 'Bearer tokens MUST NOT be leaked in response');
  });

  // 13. Failed Processing & Error State Tracking
  await t.test('13. Fault Tolerance: Failed fetch records error state on integration record', async () => {
    // Custom service that fails during sync
    class FailingGitHubService extends GitHubService {
      async getRepository() {
        throw new GitHubRateLimitError('/repos/fail', Math.floor(Date.now() / 1000) + 3600, 60, 0);
      }
    }
    setCustomGitHubService(new FailingGitHubService());

    const payload = JSON.stringify({
      repository: { id: repoId, full_name: 'vitsamyak/KnoTrail-Webhook-Target' },
      ref: 'refs/heads/main',
      after: 'sha_fail_13',
    });
    const sig = signPayload(payload);

    const res = await fetch(`${baseUrl}/api/github/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-GitHub-Delivery': crypto.randomUUID(),
        'X-GitHub-Event': 'push',
        'X-Hub-Signature-256': sig,
        'X-KnoTrail-Wait-Sync': 'true',
      },
      body: payload,
    });

    // When sync throws inside wait-sync, endpoint catches and returns 500 so GitHub retries
    assert.equal(res.status, 500, 'Should return 500 on internal failure so GitHub retries');
    const integ = await storage.getGitHubIntegration(ws, repoId);
    assert.equal(integ.syncStatus, 'error');
    assert.match(integ.errorMessage, /rate limit exceeded/i);
  });
});
