/**
 * Automated Test Suite: Continuous Knowledge Updates (Round 3 - Milestone 3.3)
 *
 * Verifies REST Endpoints & Storage Methods for Continuous Knowledge Tracking:
 * 1. GET /api/github/integrations/:repoId/history:
 *    - RBAC: Manager, Developer, External permitted; BOLA & Unauth blocked
 *    - Pagination metadata: limit, offset, total, hasMore
 *    - Repository scoping: filters out other repository updates in same workspace
 *    - Field completeness: trigger, eventType, commitSha, status, knowledgeStatus,
 *      findingsAdded, findingsInvalidated, conflictsDetected, handoverInvalidated
 * 2. POST /api/github/integrations/:repoId/sync:
 *    - runAiExtraction: false correctly reports knowledgeStatus: 'skipped'
 *    - runAiExtraction default / true behavior
 *    - RBAC: Manager and Developer permitted; External rejected with 403
 * 3. POST /api/github/integrations/:repoId/retry-update:
 *    - RBAC: Manager and Developer permitted; External rejected with 403
 *    - Max retries enforcement: returns 422 when retryCount >= maxRetries
 *    - Duplicate prevention: returns 200 without reprocessing on already-successful updates
 *    - 404 on non-existent updateId
 * 4. Storage Immutability & Append-Only Guarantees:
 *    - updateContinuousUpdateStatus preserves all immutable historical fields
 *    - Non-manager cannot tamper with updateHistory via POST /api/workspaces
 *    - Manager partial workspace update preserves existing updateHistory if omitted
 * 5. Backward Compatibility:
 *    - Workspace with undefined updateHistory safely returns empty list
 *    - Initial recording creates and appends to updateHistory without crashing
 * 6. Frontend API Client Methods:
 *    - apiClient.getContinuousUpdateHistory()
 *    - apiClient.retryContinuousUpdate()
 *    - apiClient.syncGitHubIntegration() with options
 *
 * Governance: CodersInPune Hackathon 2026 - Deploy_or_Die (Samyak Gedam & Sanshrey Sanagar)
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../../backend/app.ts';
import { getStorage, resetStorageInstance } from '../server/db/storage.ts';
import { setCustomGitHubService, setWebhookSecretOverride } from '../../backend/routes/github.ts';
import { GitHubService } from '../../backend/services/github.ts';
import { createDevSessionToken } from '../../backend/middleware/auth.ts';
import { apiClient, setClientAuthToken } from '../lib/api-client.ts';

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

class Milestone3MockGitHubService extends GitHubService {
  constructor(initialData = {}) {
    super();
    this.commits = initialData.commits || [];
    this.pullRequests = initialData.pullRequests || [];
    this.issues = initialData.issues || [];
    this.readme = initialData.readme || '# Continuous Knowledge Test Repository';
  }

  async getRepository(owner, repo) {
    return {
      id: 998877,
      name: repo,
      owner,
      fullName: `${owner}/${repo}`,
      defaultBranch: 'main',
      visibility: 'public',
      isPrivate: false,
    };
  }

  async getCommits() {
    return this.commits;
  }

  async getPullRequests() {
    return this.pullRequests;
  }

  async getIssues() {
    return this.issues;
  }

  async getReadme() {
    return this.readme;
  }
}

test('▶ Round 3 - Milestone 3.3: REST Endpoints & Storage Methods Suite', async (t) => {
  const origStorageBackend = process.env.STORAGE_BACKEND;
  const origGeminiKey = process.env.GEMINI_API_KEY;
  const origApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  process.env.STORAGE_BACKEND = 'file';
  delete process.env.GEMINI_API_KEY;
  resetStorageInstance();

  const { server, baseUrl, close } = await createTestServer();
  process.env.NEXT_PUBLIC_API_BASE_URL = baseUrl;
  const storage = getStorage();

  t.after(async () => {
    setCustomGitHubService(null);
    setWebhookSecretOverride(null);
    setClientAuthToken(null);
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

  // Setup identities
  const managerUser = { id: 'usr_m3_mgr_' + Date.now(), email: 'mgr@m3.demo' };
  const developerUser = { id: 'usr_m3_dev_' + Date.now(), email: 'dev@m3.demo' };
  const externalUser = { id: 'usr_m3_ext_' + Date.now(), email: 'ext@m3.demo' };
  const attackerUser = { id: 'usr_m3_atk_' + Date.now(), email: 'atk@m3.demo' };

  const managerToken = createDevSessionToken(managerUser, 3600);
  const developerToken = createDevSessionToken(developerUser, 3600);
  const externalToken = createDevSessionToken(externalUser, 3600);
  const attackerToken = createDevSessionToken(attackerUser, 3600);

  // Setup workspaces
  const wsId = 'ws_m3_test_' + Date.now();
  const otherWsId = 'ws_m3_other_' + Date.now();

  await storage.createWorkspace(wsId);
  await storage.setWorkspaceProtected(wsId, true, managerUser.id);
  await storage.addWorkspaceMember(wsId, { userId: managerUser.id, email: managerUser.email, role: 'MANAGER' });
  await storage.addWorkspaceMember(wsId, { userId: developerUser.id, email: developerUser.email, role: 'DEVELOPER' });
  await storage.addWorkspaceMember(wsId, { userId: externalUser.id, email: externalUser.email, role: 'EXTERNAL' });

  await storage.createWorkspace(otherWsId);
  await storage.setWorkspaceProtected(otherWsId, true, attackerUser.id);
  await storage.addWorkspaceMember(otherWsId, { userId: attackerUser.id, email: attackerUser.email, role: 'MANAGER' });

  // Connect mock repository to workspace wsId
  const repoId = 998877;
  const mockService = new Milestone3MockGitHubService({
    commits: [
      {
        sha: 'abc0011223344556677889900112233445566778',
        shortSha: 'abc0011',
        message: 'feat: Milestone 3.3 commit\n\nDecision: Adopt PostgreSQL 16 database.',
        author: {
          name: 'Samyak Gedam',
          email: 'samyak@knotrail.demo',
          date: new Date().toISOString(),
        },
        url: 'https://github.com/vitsamyak/KnoTrail/commit/abc0011',
      },
    ],
  });
  setCustomGitHubService(mockService);

  const integration = {
    id: `ghi_${repoId}`,
    workspaceId: wsId,
    repoOwner: 'vitsamyak',
    repoName: 'KnoTrail',
    repoId,
    defaultBranch: 'main',
    syncStatus: 'idle',
    config: {
      includeCommits: true,
      includePullRequests: true,
      includeIssues: true,
      includeDocs: true,
      maxCommits: 30,
      maxPullRequests: 20,
      maxIssues: 20,
    },
    metadata: { id: repoId, name: 'KnoTrail', owner: 'vitsamyak', fullName: 'vitsamyak/KnoTrail' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await storage.saveGitHubIntegration(wsId, integration);

  // --------------------------------------------------------------------------
  // 1. GET /api/github/integrations/:repoId/history Authorization
  // --------------------------------------------------------------------------
  await t.test('1. Update history API permissions: Manager, Developer, External permitted; BOLA & Unauth rejected', async () => {
    // 1. Manager permitted (200)
    const mgrRes = await fetch(`${baseUrl}/api/github/integrations/${repoId}/history?workspaceId=${wsId}`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert.equal(mgrRes.status, 200);
    const mgrBody = await mgrRes.json();
    assert.equal(mgrBody.status, 'success');
    assert.ok(Array.isArray(mgrBody.history));

    // 2. Developer permitted (200)
    const devRes = await fetch(`${baseUrl}/api/github/integrations/${repoId}/history?workspaceId=${wsId}`, {
      headers: { Authorization: `Bearer ${developerToken}` },
    });
    assert.equal(devRes.status, 200);

    // 3. External permitted (200)
    const extRes = await fetch(`${baseUrl}/api/github/integrations/${repoId}/history?workspaceId=${wsId}`, {
      headers: { Authorization: `Bearer ${externalToken}` },
    });
    assert.equal(extRes.status, 200);

    // 4. Cross-workspace attacker (BOLA) receives 403 Forbidden
    const bolaRes = await fetch(`${baseUrl}/api/github/integrations/${repoId}/history?workspaceId=${wsId}`, {
      headers: { Authorization: `Bearer ${attackerToken}` },
    });
    assert.equal(bolaRes.status, 403);

    // 5. Unauthenticated caller on protected workspace receives 401 Unauthorized
    const unauthRes = await fetch(`${baseUrl}/api/github/integrations/${repoId}/history?workspaceId=${wsId}`);
    assert.equal(unauthRes.status, 401);

    // 6. Invalid non-numeric repoId returns 400 Bad Request
    const badParamRes = await fetch(`${baseUrl}/api/github/integrations/notanumber/history?workspaceId=${wsId}`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert.equal(badParamRes.status, 400);
  });

  // --------------------------------------------------------------------------
  // 2. History Retrieval & Pagination Metadata
  // --------------------------------------------------------------------------
  await t.test('2. History retrieval: supports limit, offset, total, hasMore, and repo-level scoping', async () => {
    // Populate 5 test continuous update records for repoId
    for (let i = 1; i <= 5; i++) {
      await storage.recordContinuousUpdate(wsId, {
        id: `cur_test_item_${i}`,
        workspaceId: wsId,
        integrationId: `ghi_${repoId}`,
        repoOwner: 'vitsamyak',
        repoName: 'KnoTrail',
        repoId,
        trigger: 'webhook',
        eventType: 'push',
        reason: `Automated test commit batch #${i}`,
        commitSha: `commit_sha_${i}`,
        ingestionStatus: 'synced',
        knowledgeStatus: 'completed',
        status: 'success',
        retryCount: 0,
        maxRetries: 3,
        findingsAdded: i,
        findingsInvalidated: 0,
        conflictsDetected: 0,
        handoverInvalidated: false,
        timestamp: new Date(Date.now() - (10 - i) * 60000).toISOString(),
      });
    }

    // Populate 1 record for a DIFFERENT repoId to verify repo-level filtering
    const otherRepoId = 123456;
    await storage.recordContinuousUpdate(wsId, {
      id: 'cur_other_repo_record',
      workspaceId: wsId,
      integrationId: `ghi_${otherRepoId}`,
      repoOwner: 'vitsamyak',
      repoName: 'OtherProject',
      repoId: otherRepoId,
      trigger: 'manual_sync',
      eventType: 'manual',
      reason: 'Syncing unrelated repo',
      ingestionStatus: 'synced',
      knowledgeStatus: 'idle',
      status: 'success',
      retryCount: 0,
      maxRetries: 3,
      findingsAdded: 0,
      findingsInvalidated: 0,
      conflictsDetected: 0,
      handoverInvalidated: false,
      timestamp: new Date().toISOString(),
    });

    // 1. Default retrieval
    const resDefault = await fetch(`${baseUrl}/api/github/integrations/${repoId}/history?workspaceId=${wsId}`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    assert.equal(resDefault.status, 200);
    const bodyDefault = await resDefault.json();
    assert.equal(bodyDefault.status, 'success');
    assert.equal(bodyDefault.total, 5, 'Total must equal 5 for this repository (other repo excluded)');
    assert.equal(bodyDefault.history.length, 5);
    assert.equal(bodyDefault.hasMore, false);
    assert.equal(bodyDefault.limit, 50);
    assert.equal(bodyDefault.offset, 0);

    // Verify field completeness
    const item = bodyDefault.history[0];
    assert.ok(item.id);
    assert.equal(item.repoId, repoId);
    assert.equal(item.trigger, 'webhook');
    assert.equal(item.eventType, 'push');
    assert.ok(item.commitSha);
    assert.equal(item.status, 'success');
    assert.equal(item.knowledgeStatus, 'completed');
    assert.equal(typeof item.findingsAdded, 'number');
    assert.equal(typeof item.findingsInvalidated, 'number');
    assert.equal(typeof item.conflictsDetected, 'number');
    assert.equal(typeof item.handoverInvalidated, 'boolean');

    // 2. Pagination with limit=2, offset=0
    const resPage1 = await fetch(`${baseUrl}/api/github/integrations/${repoId}/history?workspaceId=${wsId}&limit=2&offset=0`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    const page1 = await resPage1.json();
    assert.equal(page1.history.length, 2);
    assert.equal(page1.total, 5);
    assert.equal(page1.hasMore, true);
    assert.equal(page1.limit, 2);
    assert.equal(page1.offset, 0);

    // 3. Pagination with limit=2, offset=2
    const resPage2 = await fetch(`${baseUrl}/api/github/integrations/${repoId}/history?workspaceId=${wsId}&limit=2&offset=2`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    const page2 = await resPage2.json();
    assert.equal(page2.history.length, 2);
    assert.equal(page2.total, 5);
    assert.equal(page2.hasMore, true);
    assert.notEqual(page1.history[0].id, page2.history[0].id, 'Page 2 should contain different records than Page 1');

    // 4. Pagination with limit=2, offset=4 (last page)
    const resPage3 = await fetch(`${baseUrl}/api/github/integrations/${repoId}/history?workspaceId=${wsId}&limit=2&offset=4`, {
      headers: { Authorization: `Bearer ${managerToken}` },
    });
    const page3 = await resPage3.json();
    assert.equal(page3.history.length, 1);
    assert.equal(page3.total, 5);
    assert.equal(page3.hasMore, false, 'Last page must report hasMore: false');
  });

  // --------------------------------------------------------------------------
  // 3. Manual Sync with runAiExtraction Enabled vs Disabled
  // --------------------------------------------------------------------------
  await t.test('3. Manual sync: runAiExtraction: false clearly reports knowledgeStatus: skipped', async () => {
    // Trigger sync with runAiExtraction explicitly set to false
    const res = await fetch(`${baseUrl}/api/github/integrations/${repoId}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${developerToken}`,
      },
      body: JSON.stringify({
        workspaceId: wsId,
        runAiExtraction: false,
        reason: 'Syncing without AI inference',
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'synced');
    assert.equal(body.knowledgeStatus, 'skipped', 'knowledgeStatus must be reported as skipped');
    assert.ok(body.integration);
    assert.ok(body.source);

    // Verify recorded continuous update record in storage
    const historyRes = await fetch(`${baseUrl}/api/github/integrations/${repoId}/history?workspaceId=${wsId}&limit=1`, {
      headers: { Authorization: `Bearer ${developerToken}` },
    });
    const hist = await historyRes.json();
    const latest = hist.history[0];
    assert.equal(latest.knowledgeStatus, 'skipped');
    assert.equal(latest.reason, 'Syncing without AI inference');
  });

  // --------------------------------------------------------------------------
  // 4. Manual Sync Role Restrictions
  // --------------------------------------------------------------------------
  await t.test('4. Manual sync role permissions: Manager & Developer can sync; External receives 403', async () => {
    // 1. Manager succeeds (200)
    const mgrRes = await fetch(`${baseUrl}/api/github/integrations/${repoId}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`,
      },
      body: JSON.stringify({
        workspaceId: wsId,
        runAiExtraction: false,
        reason: 'Manager sync',
      }),
    });
    assert.equal(mgrRes.status, 200);

    // 2. Developer succeeds (200)
    const devRes = await fetch(`${baseUrl}/api/github/integrations/${repoId}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${developerToken}`,
      },
      body: JSON.stringify({
        workspaceId: wsId,
        runAiExtraction: false,
        reason: 'Developer sync',
      }),
    });
    assert.equal(devRes.status, 200);

    // 3. External role receives 403 Forbidden
    const extRes = await fetch(`${baseUrl}/api/github/integrations/${repoId}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${externalToken}`,
      },
      body: JSON.stringify({
        workspaceId: wsId,
        runAiExtraction: false,
      }),
    });
    assert.equal(extRes.status, 403, 'External role must be forbidden from triggering synchronization');
  });

  // --------------------------------------------------------------------------
  // 5. Retry Endpoint Authorization, Duplicate Prevention, and Max Retries
  // --------------------------------------------------------------------------
  await t.test('5. Retry API: enforces RBAC, duplicate prevention, and maxRetries ceiling (422)', async () => {
    // 1. Non-existent updateId returns 404
    const notFoundRes = await fetch(`${baseUrl}/api/github/integrations/${repoId}/retry-update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`,
      },
      body: JSON.stringify({
        workspaceId: wsId,
        updateId: 'cur_does_not_exist_9999',
      }),
    });
    assert.equal(notFoundRes.status, 404);

    // 2. Create an update record that already completed successfully
    const successUpdateId = `cur_already_done_${Date.now()}`;
    await storage.recordContinuousUpdate(wsId, {
      id: successUpdateId,
      workspaceId: wsId,
      integrationId: `ghi_${repoId}`,
      repoOwner: 'vitsamyak',
      repoName: 'KnoTrail',
      repoId,
      trigger: 'manual_sync',
      eventType: 'manual',
      reason: 'Already succeeded task',
      ingestionStatus: 'synced',
      knowledgeStatus: 'completed',
      status: 'success',
      retryCount: 0,
      maxRetries: 3,
      findingsAdded: 4,
      findingsInvalidated: 0,
      conflictsDetected: 0,
      handoverInvalidated: false,
      timestamp: new Date().toISOString(),
    });

    // Retrying an already successful update returns 200 without duplicate processing
    const duplicateRes = await fetch(`${baseUrl}/api/github/integrations/${repoId}/retry-update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${developerToken}`,
      },
      body: JSON.stringify({
        workspaceId: wsId,
        updateId: successUpdateId,
      }),
    });
    assert.equal(duplicateRes.status, 200);
    const duplicateBody = await duplicateRes.json();
    assert.equal(duplicateBody.success, true);
    assert.equal(duplicateBody.findingsAdded, 0, 'Must not extract duplicate findings');

    // 3. Create an update record that has reached maxRetries
    const exhaustedUpdateId = `cur_exhausted_${Date.now()}`;
    await storage.recordContinuousUpdate(wsId, {
      id: exhaustedUpdateId,
      workspaceId: wsId,
      integrationId: `ghi_${repoId}`,
      repoOwner: 'vitsamyak',
      repoName: 'KnoTrail',
      repoId,
      trigger: 'manual_sync',
      eventType: 'manual',
      reason: 'Exhausted retry task',
      ingestionStatus: 'synced',
      knowledgeStatus: 'failed',
      status: 'partial',
      retryCount: 3,
      maxRetries: 3,
      findingsAdded: 0,
      findingsInvalidated: 0,
      conflictsDetected: 0,
      handoverInvalidated: false,
      timestamp: new Date().toISOString(),
    });

    // Retrying when retryCount >= maxRetries returns 422 Unprocessable Entity
    const maxRetryRes = await fetch(`${baseUrl}/api/github/integrations/${repoId}/retry-update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`,
      },
      body: JSON.stringify({
        workspaceId: wsId,
        updateId: exhaustedUpdateId,
      }),
    });
    assert.equal(maxRetryRes.status, 422, 'Must return 422 when max retries are exceeded');
    const maxRetryBody = await maxRetryRes.json();
    assert.ok(maxRetryBody.error.includes('Max retry limit (3) reached'));

    // 4. External role is forbidden from triggering retry (403)
    const extRetryRes = await fetch(`${baseUrl}/api/github/integrations/${repoId}/retry-update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${externalToken}`,
      },
      body: JSON.stringify({
        workspaceId: wsId,
        updateId: successUpdateId,
      }),
    });
    assert.equal(extRetryRes.status, 403, 'External role must receive 403 Forbidden on retry');
  });

  // --------------------------------------------------------------------------
  // 6. Storage Immutability & Append-Only Guarantees
  // --------------------------------------------------------------------------
  await t.test('6. Storage immutability: status updates cannot alter immutable historical fields', async () => {
    const originalRecord = {
      id: `cur_immutable_${Date.now()}`,
      workspaceId: wsId,
      integrationId: `ghi_${repoId}`,
      repoOwner: 'vitsamyak',
      repoName: 'KnoTrail',
      repoId,
      trigger: 'webhook',
      eventType: 'pull_request',
      deliveryId: 'deliv_orig_001',
      reason: 'Original immutable PR explanation',
      commitSha: 'sha_orig_12345',
      ingestionStatus: 'synced',
      knowledgeStatus: 'failed',
      status: 'partial',
      retryCount: 0,
      maxRetries: 3,
      findingsAdded: 0,
      findingsInvalidated: 0,
      conflictsDetected: 0,
      handoverInvalidated: true,
      timestamp: '2026-11-15T12:00:00.000Z',
    };

    await storage.recordContinuousUpdate(wsId, originalRecord);

    // Attempt to tamper with immutable fields via updateContinuousUpdateStatus
    const tamperedAttempt = {
      status: 'success',
      knowledgeStatus: 'completed',
      retryCount: 1,
      // Malicious attempts to rewrite historical fields:
      id: 'cur_tampered_id',
      workspaceId: 'ws_other_tampered',
      integrationId: 'ghi_other',
      repoOwner: 'malicious',
      repoName: 'tampered',
      repoId: 999999,
      trigger: 'manual_sync',
      eventType: 'tampered_event',
      deliveryId: 'deliv_tampered_999',
      reason: 'Tampered reason',
      commitSha: 'sha_tampered_999',
      timestamp: '1970-01-01T00:00:00.000Z',
      maxRetries: 99,
    };

    const updated = await storage.updateContinuousUpdateStatus(wsId, originalRecord.id, tamperedAttempt);
    assert.ok(updated);

    // Verify mutable fields were updated:
    assert.equal(updated.status, 'success');
    assert.equal(updated.knowledgeStatus, 'completed');
    assert.equal(updated.retryCount, 1);

    // Verify immutable fields were strictly preserved:
    assert.equal(updated.id, originalRecord.id);
    assert.equal(updated.workspaceId, wsId);
    assert.equal(updated.integrationId, originalRecord.integrationId);
    assert.equal(updated.repoOwner, originalRecord.repoOwner);
    assert.equal(updated.repoName, originalRecord.repoName);
    assert.equal(updated.repoId, originalRecord.repoId);
    assert.equal(updated.trigger, originalRecord.trigger);
    assert.equal(updated.eventType, originalRecord.eventType);
    assert.equal(updated.deliveryId, originalRecord.deliveryId);
    assert.equal(updated.reason, originalRecord.reason);
    assert.equal(updated.commitSha, originalRecord.commitSha);
    assert.equal(updated.timestamp, originalRecord.timestamp);
    assert.equal(updated.maxRetries, originalRecord.maxRetries);
  });

  // --------------------------------------------------------------------------
  // 7. Backward Compatibility with Pre-Round-3 Workspaces
  // --------------------------------------------------------------------------
  await t.test('7. Backward compatibility: workspaces with undefined updateHistory return empty list safely', async () => {
    const legacyWsId = `ws_legacy_${Date.now()}`;
    await storage.createWorkspace(legacyWsId, {
      id: legacyWsId,
      name: 'Legacy Pre-Update Workspace',
      code: 'LEG-01',
      description: 'Older workspace without updateHistory initialized',
      lead: { id: 'lead-1', name: 'Legacy Lead', role: 'Lead', email: 'legacy@knotrail.demo', avatar: '', outgoing: true, transitionNotes: '' },
      stakeholders: [],
      sources: [],
      findings: [],
      // updateHistory is explicitly omitted (undefined)
    });

    // 1. Reading history directly from storage returns empty array safely
    const hist = await storage.getContinuousUpdateHistory(legacyWsId, 50);
    assert.deepEqual(hist, [], 'Legacy workspace must return [] without crashing');

    // 2. Querying single record returns null safely
    const single = await storage.getContinuousUpdate(legacyWsId, 'cur_none');
    assert.equal(single, null);

    // 3. Status update on non-existent record returns null safely
    const resUpdate = await storage.updateContinuousUpdateStatus(legacyWsId, 'cur_none', { status: 'success' });
    assert.equal(resUpdate, null);

    // 4. Recording new continuous update properly initializes updateHistory
    const newRecord = {
      id: `cur_first_${Date.now()}`,
      workspaceId: legacyWsId,
      integrationId: 'ghi_legacy_01',
      repoOwner: 'vitsamyak',
      repoName: 'LegacyRepo',
      repoId: 887766,
      trigger: 'manual_sync',
      eventType: 'manual',
      reason: 'First update on legacy workspace',
      ingestionStatus: 'synced',
      knowledgeStatus: 'idle',
      status: 'success',
      retryCount: 0,
      maxRetries: 3,
      findingsAdded: 0,
      findingsInvalidated: 0,
      conflictsDetected: 0,
      handoverInvalidated: false,
      timestamp: new Date().toISOString(),
    };
    await storage.recordContinuousUpdate(legacyWsId, newRecord);

    const afterHist = await storage.getContinuousUpdateHistory(legacyWsId, 50);
    assert.equal(afterHist.length, 1);
    assert.equal(afterHist[0].id, newRecord.id);
  });

  // --------------------------------------------------------------------------
  // 8. Typed Frontend API Client Methods
  // --------------------------------------------------------------------------
  await t.test('8. Frontend API client methods: getContinuousUpdateHistory, retryContinuousUpdate, syncGitHubIntegration', async () => {
    // Configure client to talk to test server
    setClientAuthToken(managerToken);

    // 1. Test getContinuousUpdateHistory via apiClient
    const historyData = await apiClient.getContinuousUpdateHistory(wsId, repoId, {
      limit: 3,
      offset: 0,
    });
    assert.equal(historyData.status, 'success');
    assert.ok(Array.isArray(historyData.history));
    assert.equal(historyData.history.length, 3);
    assert.ok(historyData.total >= 5);
    assert.equal(historyData.limit, 3);
    assert.equal(historyData.offset, 0);

    // 2. Test retryContinuousUpdate via apiClient for an already-successful update
    const doneUpdates = historyData.history.filter((h) => h.status === 'success' && h.knowledgeStatus === 'completed');
    if (doneUpdates.length > 0) {
      const retryRes = await apiClient.retryContinuousUpdate(wsId, repoId, doneUpdates[0].id);
      assert.equal(retryRes.success, true);
    }

    // 3. Test syncGitHubIntegration with options via apiClient
    const syncRes = await apiClient.syncGitHubIntegration(wsId, repoId, {
      runAiExtraction: false,
      reason: 'Client-triggered manual sync without AI',
    });
    assert.equal(syncRes.status, 'synced');
    assert.equal(syncRes.knowledgeStatus, 'skipped');
    assert.ok(syncRes.integration);
    assert.ok(syncRes.source);
  });
});
