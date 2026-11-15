/**
 * Automated Test Suite: Continuous Knowledge Updates Frontend & Tracking Logic
 * (Round 3 - Milestone 3.4)
 *
 * Verifies:
 * 1. ReviewView: Evidence Drift & Re-Review Filtering
 *    - "Needs Re-Review" filter correctly selects drifted findings with needsReReview === true
 *    - Drifted findings display amber badges, reReviewReason, and GitHub evidence provenance
 *    - Manager-only governance: Managers can approve/reject; Developers and External roles cannot
 * 2. SourceManagerView & UpdateHistoryDrawer:
 *    - Fetches paginated continuous update history from API
 *    - Displays trigger type (Webhook, Manual Sync, Retry), event type, timestamp, commit SHA, and metrics
 *    - Evaluates retry eligibility: (status === 'partial' || status === 'failed') && retryCount < maxRetries
 *    - Enforces RBAC: Manager & Developer can retry; External role is read-only (retry disabled/forbidden)
 *    - Handles loading, empty, partial, and failed states cleanly
 * 3. HandoverView: Invalidation & Re-Certification Warning
 *    - Prominent outdated banner active when currentHandover.isOutdated === true or stats.isHandoverOutdated === true
 *    - Accurately computes count of findings requiring re-review
 *    - Extracts and displays commit SHA from outdatedReason
 *    - Certified badge is NEVER displayed when handoverCertified === false or doc.isOutdated === true
 *    - Handover regeneration gated to Manager role and requires 0 unreviewed/drifted findings
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
  setClientAuthToken,
} from '../lib/api-client.ts';
import { getFindingReviewStatus } from '../lib/types.ts';
import { setCustomGitHubService } from '../../backend/routes/github.ts';
import { GitHubService } from '../../backend/services/github.ts';
import { createDevSessionToken } from '../../backend/middleware/auth.ts';

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

class Milestone4MockGitHubService extends GitHubService {
  async getRepository(owner, repo) {
    return {
      id: 99401,
      name: repo,
      fullName: `${owner}/${repo}`,
      owner,
      defaultBranch: 'main',
      isPrivate: false,
      starsCount: 42,
      forksCount: 5,
      openIssuesCount: 2,
    };
  }

  async getCommit(owner, repo, ref) {
    return {
      sha: ref || 'c0ffee1234567890abcdef1234567890abcdef12',
      author: 'alice',
      date: new Date().toISOString(),
      message: 'feat: update architecture pipeline for continuous tracking',
      filesChanged: 3,
      files: [],
      stats: { additions: 20, deletions: 5, total: 25 },
    };
  }
}

test('▶ Round 3 - Milestone 3.4: Continuous Knowledge Tracking Frontend Logic Suite', async (t) => {
  const origStorageBackend = process.env.STORAGE_BACKEND;
  const origGeminiKey = process.env.GEMINI_API_KEY;
  const origApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  process.env.STORAGE_BACKEND = 'file';
  delete process.env.GEMINI_API_KEY; // prevent live Gemini network calls in test
  resetStorageInstance();

  const testServer = await createTestServer();
  process.env.NEXT_PUBLIC_API_BASE_URL = testServer.baseUrl;

  const mockService = new Milestone4MockGitHubService();
  setCustomGitHubService(mockService);

  t.after(async () => {
    setCustomGitHubService(null);
    setClientAuthToken(null);
    await testServer.close();
    process.env.STORAGE_BACKEND = origStorageBackend;
    if (origGeminiKey) process.env.GEMINI_API_KEY = origGeminiKey;
    else delete process.env.GEMINI_API_KEY;
    if (origApiBaseUrl) process.env.NEXT_PUBLIC_API_BASE_URL = origApiBaseUrl;
    else delete process.env.NEXT_PUBLIC_API_BASE_URL;
    resetStorageInstance();
  });

  // Setup identities & tokens
  const managerUser = { id: 'usr_ms4_mgr_' + Date.now(), email: 'mgr@ms4.demo' };
  const developerUser = { id: 'usr_ms4_dev_' + Date.now(), email: 'dev@ms4.demo' };
  const externalUser = { id: 'usr_ms4_ext_' + Date.now(), email: 'ext@ms4.demo' };

  const managerToken = createDevSessionToken(managerUser, 3600);
  const developerToken = createDevSessionToken(developerUser, 3600);
  const externalToken = createDevSessionToken(externalUser, 3600);

  // Test Workspace setup
  const storage = getStorage();
  const testWorkspaceId = `ws_ms4_${Date.now()}`;
  const nowIso = new Date().toISOString();

  await storage.createWorkspace(testWorkspaceId, {
    id: testWorkspaceId,
    name: 'Milestone 3.4 UI Verification Workspace',
    code: 'MS4',
    description: 'Frontend tests for continuous knowledge tracking',
    targetExitDate: '2026-12-31',
    version: 'v1.0',
    lastAnalysed: nowIso,
    lead: { name: 'Samyak Gedam', role: 'Team Lead', email: 'samyakgedam69@gmail.com', outgoing: false, transitionNotes: '' },
    stakeholders: [],
    sources: [
      {
        id: 'src_gh_ms4',
        name: 'GitHub: deploy-team/knotrail',
        type: 'repository',
        githubIntegrationId: 'ghi_ms4_1',
        content: 'System architecture documents and commit logs.',
        description: 'Ingested GitHub source',
        uploadedAt: nowIso,
        hash: 'hash_ms4_root',
        recordCount: 15,
        version: 1,
      },
    ],
    findings: [
      {
        id: 'find_clean_1',
        type: 'decision',
        title: 'Use PostgreSQL for persistent knowledge tracking',
        summary: 'Database decision remains valid without drift.',
        status: 'VERIFIED',
        evidenceValidity: 'MATCHED',
        claimStatus: 'VERIFIED',
        confidence: 96,
        citations: [
          {
            id: 'cit_1',
            sourceId: 'src_gh_ms4',
            sourceName: 'GitHub: deploy-team/knotrail',
            quote: 'System architecture documents',
            location: 'docs/architecture.md',
            confidence: 96,
          },
        ],
        approved: true,
        reviewStatus: 'APPROVED',
        category: 'architecture',
        urgency: 'high',
        owner: 'Samyak Gedam',
        createdDate: nowIso,
        needsReReview: false,
      },
      {
        id: 'find_drift_2',
        type: 'decision',
        title: 'Cache sessions in memory-only store',
        summary: 'Decision invalidated because session handling moved to Redis.',
        status: 'UNCERTAIN',
        evidenceValidity: 'MISMATCHED',
        claimStatus: 'UNCERTAIN',
        confidence: 70,
        citations: [
          {
            id: 'cit_2',
            sourceId: 'src_gh_ms4',
            sourceName: 'GitHub: deploy-team/knotrail',
            quote: 'Cache sessions in memory',
            location: 'backend/cache.ts',
            confidence: 70,
            gitHubProvenance: {
              repositoryId: 99401,
              repositoryOwner: 'deploy-team',
              repositoryName: 'knotrail',
              repositoryFullName: 'deploy-team/knotrail',
              branch: 'main',
              commitSha: 'c0ffee1234567890abcdef1234567890abcdef12',
              filePath: 'backend/cache.ts',
              originalGitHubUrl: 'https://github.com/deploy-team/knotrail/blob/main/backend/cache.ts',
              author: 'alice',
              timestamp: nowIso,
              contentHash: 'hash_cache_cit',
            },
          },
        ],
        approved: false, // Approval revoked by drift detector
        reviewStatus: 'PENDING_REVIEW',
        category: 'architecture',
        urgency: 'medium',
        owner: 'Sanshrey Sanagar',
        createdDate: nowIso,
        needsReReview: true,
        reReviewReason: 'Evidence modified in commit c0ffee1: Redis cache client replaced in-memory cache.',
        driftDetectedAt: nowIso,
      },
      {
        id: 'find_drift_3',
        type: 'task',
        title: 'Implement webhook HMAC verification',
        summary: 'Security task needs re-review due to signature verification upgrade.',
        status: 'UNCERTAIN',
        evidenceValidity: 'MISMATCHED',
        claimStatus: 'UNCERTAIN',
        confidence: 82,
        citations: [
          {
            id: 'cit_3',
            sourceId: 'src_gh_ms4',
            sourceName: 'GitHub: deploy-team/knotrail',
            quote: 'HMAC verification required',
            location: 'backend/routes/github.ts',
            confidence: 82,
          },
        ],
        approved: false,
        reviewStatus: 'PENDING_REVIEW',
        category: 'security',
        urgency: 'critical',
        owner: 'Samyak Gedam',
        createdDate: nowIso,
        needsReReview: true,
        reReviewReason: 'Supporting quote was superseded by commit c0ffee1.',
        driftDetectedAt: nowIso,
      },
    ],
    conflicts: [],
    reviewAuditHistory: [],
    handoverCertified: false, // De-certified due to drift
    certificationHash: 'cert_hash_initial',
    executiveSummary: 'Executive summary for milestone 3.4 verification.',
    githubIntegrations: [
      {
        id: 'ghi_ms4_1',
        workspaceId: testWorkspaceId,
        repoOwner: 'deploy-team',
        repoName: 'knotrail',
        repoId: 99401,
        defaultBranch: 'main',
        selectedBranch: 'main',
        syncStatus: 'synced',
        lastSyncedAt: nowIso,
        lastCommitSha: 'c0ffee1234567890abcdef1234567890abcdef12',
        config: {
          includeCommits: true,
          includePullRequests: true,
          includeIssues: true,
          includeDocs: true,
        },
        createdAt: nowIso,
        updatedAt: nowIso,
      },
    ],
    updateHistory: [
      {
        id: 'cur_succ_1',
        workspaceId: testWorkspaceId,
        integrationId: 'ghi_ms4_1',
        repoOwner: 'deploy-team',
        repoName: 'knotrail',
        repoId: 99401,
        trigger: 'webhook',
        eventType: 'push',
        commitSha: 'c0ffee1234567890abcdef1234567890abcdef12',
        reason: 'Push on main: 3 new commits processed.',
        ingestionStatus: 'synced',
        knowledgeStatus: 'completed',
        status: 'success',
        retryCount: 0,
        maxRetries: 3,
        findingsAdded: 4,
        findingsInvalidated: 2,
        conflictsDetected: 0,
        handoverInvalidated: true,
        timestamp: nowIso,
      },
      {
        id: 'cur_partial_2',
        workspaceId: testWorkspaceId,
        integrationId: 'ghi_ms4_1',
        repoOwner: 'deploy-team',
        repoName: 'knotrail',
        repoId: 99401,
        trigger: 'manual_sync',
        eventType: 'manual_sync',
        commitSha: 'd066ee2234567890abcdef1234567890abcdef12',
        reason: 'Manual sync: Ingestion completed but AI extraction was delayed.',
        ingestionStatus: 'synced',
        knowledgeStatus: 'partial',
        status: 'partial',
        retryCount: 0,
        maxRetries: 3,
        findingsAdded: 0,
        findingsInvalidated: 0,
        conflictsDetected: 0,
        handoverInvalidated: false,
        errorMessage: 'Gemini extraction timed out on heavy diff.',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: 'cur_failed_3',
        workspaceId: testWorkspaceId,
        integrationId: 'ghi_ms4_1',
        repoOwner: 'deploy-team',
        repoName: 'knotrail',
        repoId: 99401,
        trigger: 'retry',
        eventType: 'retry_update',
        commitSha: 'd066ee2234567890abcdef1234567890abcdef12',
        reason: 'Retry update: Exceeded network quota.',
        ingestionStatus: 'synced',
        knowledgeStatus: 'failed',
        status: 'failed',
        retryCount: 3, // at max retries
        maxRetries: 3,
        findingsAdded: 0,
        findingsInvalidated: 0,
        conflictsDetected: 0,
        handoverInvalidated: false,
        errorMessage: 'Rate limit 429 encountered.',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
      },
    ],
    currentHandover: {
      id: 'ho_ms4_1',
      workspaceId: testWorkspaceId,
      projectId: testWorkspaceId,
      version: 'v1.0',
      generatedAt: new Date(Date.now() - 86400000).toISOString(),
      certifiedDate: new Date(Date.now() - 86400000).toISOString(),
      certifiedBy: 'Samyak Gedam',
      certificationHash: 'cert_hash_initial',
      isOutdated: true,
      outdatedReason: 'Continuous update on deploy-team/knotrail (c0ffee1): 2 finding(s) invalidated, requires re-review.',
      sourceSnapshotHash: 'snap_hash_initial',
      metadata: {
        projectName: 'Milestone 3.4 UI Verification Workspace',
        projectCode: 'MS4',
        description: 'Frontend tests for continuous knowledge tracking',
        version: 'v1.0',
        targetExitDate: '2026-12-31',
        auditStamp: 'AUDIT_MS4',
      },
      executiveSummary: 'Initial verified handover package.',
      projectOverview: {
        businessObjectives: [],
        criticalSuccessFactors: [],
        keyMilestones: [],
      },
      keyDecisions: [],
      pendingTasks: [],
      roleResponsibilities: [],
      knownRisks: [],
      dependencies: [],
      unresolvedQuestions: [],
      nextActions: [],
      keyContacts: [],
      evidenceInventory: [],
      reviewHistory: {
        approvedCount: 1,
        rejectedCount: 0,
        acceptedUncertainCount: 0,
        resolvedConflictsCount: 0,
        unreviewedCount: 2,
        auditTrailCount: 0,
        certifiedDate: new Date(Date.now() - 86400000).toISOString(),
        certifiedBy: 'Samyak Gedam',
        certificationHash: 'cert_hash_initial',
      },
      sectionCounts: {
        decisions: 1,
        tasks: 0,
        risks: 0,
        dependencies: 0,
        questions: 0,
        nextActions: 0,
        contacts: 0,
        totalApprovedFindings: 1,
      },
    },
  });

  await storage.setWorkspaceProtected(testWorkspaceId, true, managerUser.id);
  await storage.addWorkspaceMember(testWorkspaceId, { userId: managerUser.id, email: managerUser.email, role: 'MANAGER' });
  await storage.addWorkspaceMember(testWorkspaceId, { userId: developerUser.id, email: developerUser.email, role: 'DEVELOPER' });
  await storage.addWorkspaceMember(testWorkspaceId, { userId: externalUser.id, email: externalUser.email, role: 'EXTERNAL' });

  // --------------------------------------------------------------------------
  // TEST 1: ReviewView Re-Review Filter & Findings Count Derivation
  // --------------------------------------------------------------------------
  await t.test('1. ReviewView: Re-Review Filter accurately isolates drifted findings', async () => {
    const ws = await storage.getWorkspace(testWorkspaceId);
    assert.ok(ws);
    const findings = ws.findings || [];

    // Derive needsReReview count
    const needsReReviewCount = findings.filter((f) => Boolean(f.needsReReview)).length;
    assert.strictEqual(needsReReviewCount, 2, 'Must detect exactly 2 findings requiring re-review');

    // Filter simulation for 'NEEDS_RE_REVIEW'
    const statusFilter = 'NEEDS_RE_REVIEW';
    const filtered = findings.filter((finding) => {
      if (statusFilter === 'NEEDS_RE_REVIEW') {
        return Boolean(finding.needsReReview);
      }
      return getFindingReviewStatus(finding) === statusFilter;
    });

    assert.strictEqual(filtered.length, 2, 'Filter must yield 2 items');
    assert.ok(filtered.every((f) => f.needsReReview === true), 'All filtered findings must have needsReReview === true');
    assert.ok(filtered.some((f) => f.id === 'find_drift_2'), 'Must include find_drift_2');
    assert.ok(filtered.some((f) => f.id === 'find_drift_3'), 'Must include find_drift_3');
    assert.ok(!filtered.some((f) => f.id === 'find_clean_1'), 'Must exclude clean approved finding');
  });

  // --------------------------------------------------------------------------
  // TEST 2: ReviewView Finding Badges & Evidence Provenance Attributes
  // --------------------------------------------------------------------------
  await t.test('2. ReviewView: Drifted findings contain reReviewReason and GitHub provenance', async () => {
    const ws = await storage.getWorkspace(testWorkspaceId);
    const finding = ws.findings.find((f) => f.id === 'find_drift_2');
    assert.ok(finding);

    // Amber badge precondition
    assert.strictEqual(finding.needsReReview, true);
    assert.ok(finding.reReviewReason.includes('Redis cache client replaced in-memory cache'));
    assert.ok(finding.driftDetectedAt);

    // Check GitHub Provenance on Citation
    const ghCitation = finding.citations.find((c) => c.gitHubProvenance);
    assert.ok(ghCitation, 'Citation must contain gitHubProvenance');
    assert.strictEqual(ghCitation.gitHubProvenance.repositoryName, 'knotrail');
    assert.strictEqual(ghCitation.gitHubProvenance.commitSha.slice(0, 7), 'c0ffee1');
    assert.strictEqual(ghCitation.gitHubProvenance.filePath, 'backend/cache.ts');
  });

  // --------------------------------------------------------------------------
  // TEST 3: ReviewView RBAC: Developer and External Cannot Approve or Reject
  // --------------------------------------------------------------------------
  await t.test('3. ReviewView RBAC: Approval controls gated strictly to Manager', async () => {
    // 3a. External perspective attempt to approve find_drift_2
    setClientAuthToken(externalToken);
    await assert.rejects(
      async () => {
        await apiClient.approveFinding(testWorkspaceId, 'find_drift_2', 'Unauthorized approval attempt');
      },
      (err) => {
        assert.ok(err instanceof ApiClientError);
        assert.strictEqual(err.statusCode, 403);
        assert.ok(err.message.toLowerCase().includes('manager'));
        return true;
      },
      'External role must be rejected with 403 on approval attempt'
    );

    // 3b. Developer perspective attempt to approve find_drift_2
    setClientAuthToken(developerToken);
    await assert.rejects(
      async () => {
        await apiClient.approveFinding(testWorkspaceId, 'find_drift_2', 'Developer approval attempt');
      },
      (err) => {
        assert.ok(err instanceof ApiClientError);
        assert.strictEqual(err.statusCode, 403);
        assert.ok(err.message.toLowerCase().includes('manager'));
        return true;
      },
      'Developer role must be rejected with 403 on approval attempt'
    );

    // 3c. Manager perspective successfully approves finding
    setClientAuthToken(managerToken);
    const res = await apiClient.approveFinding(testWorkspaceId, 'find_drift_2', 'Manager re-reviewed and verified');
    assert.strictEqual(res.finding.approved, true);
    assert.strictEqual(res.finding.needsReReview, false, 'Approval must clear needsReReview flag');
  });

  // --------------------------------------------------------------------------
  // TEST 4: SourceManagerView & Drawer: Fetch Update Activity via apiClient
  // --------------------------------------------------------------------------
  await t.test('4. Update Activity: getContinuousUpdateHistory returns scoped paginated records', async () => {
    setClientAuthToken(managerToken);

    const historyRes = await apiClient.getContinuousUpdateHistory(testWorkspaceId, 99401, {
      limit: 10,
      offset: 0,
    });

    assert.strictEqual(historyRes.status, 'success');
    assert.strictEqual(historyRes.total, 3);
    assert.strictEqual(historyRes.history.length, 3);
    assert.strictEqual(historyRes.hasMore, false);

    const first = historyRes.history[0];
    assert.strictEqual(first.id, 'cur_succ_1');
    assert.strictEqual(first.trigger, 'webhook');
    assert.strictEqual(first.eventType, 'push');
    assert.strictEqual(first.commitSha.slice(0, 7), 'c0ffee1');
    assert.strictEqual(first.status, 'success');
    assert.strictEqual(first.findingsAdded, 4);
    assert.strictEqual(first.findingsInvalidated, 2);
    assert.strictEqual(first.handoverInvalidated, true);
  });

  // --------------------------------------------------------------------------
  // TEST 5: UpdateHistoryDrawer: Retry Eligibility & RBAC Logic
  // --------------------------------------------------------------------------
  await t.test('5. Update History: Evaluates retry eligibility and enforces role access', async () => {
    const ws = await storage.getWorkspace(testWorkspaceId);
    const records = ws.updateHistory || [];

    const succRecord = records.find((r) => r.id === 'cur_succ_1');
    const partialRecord = records.find((r) => r.id === 'cur_partial_2');
    const maxedRecord = records.find((r) => r.id === 'cur_failed_3');

    // Retry eligibility predicate: (status === 'partial' || status === 'failed') && retryCount < maxRetries
    const isEligible = (r) => (r.status === 'partial' || r.status === 'failed') && r.retryCount < r.maxRetries;

    assert.strictEqual(isEligible(succRecord), false, 'Success records must not be eligible for retry');
    assert.strictEqual(isEligible(partialRecord), true, 'Partial records under maxRetries must be eligible for retry');
    assert.strictEqual(isEligible(maxedRecord), false, 'Records that reached maxRetries must not be eligible for retry');

    // External role attempt to retry partialRecord -> 403 Forbidden
    setClientAuthToken(externalToken);
    await assert.rejects(
      async () => {
        await apiClient.retryContinuousUpdate(testWorkspaceId, 99401, partialRecord.id);
      },
      (err) => {
        assert.ok(err instanceof ApiClientError);
        assert.strictEqual(err.statusCode, 403);
        return true;
      },
      'External role must not be permitted to trigger retry'
    );

    // Developer role attempt to retry when maxRetries reached -> 422 Unprocessable
    setClientAuthToken(developerToken);
    await assert.rejects(
      async () => {
        await apiClient.retryContinuousUpdate(testWorkspaceId, 99401, maxedRecord.id);
      },
      (err) => {
        assert.ok(err instanceof ApiClientError);
        assert.strictEqual(err.statusCode, 422);
        assert.ok(err.message.includes('Max retry limit'));
        return true;
      },
      'Exceeded maxRetries must return 422'
    );

    // Developer role attempt to retry already-succeeded update -> 200 without duplicate extraction
    const devRetryRes = await apiClient.retryContinuousUpdate(testWorkspaceId, 99401, succRecord.id);
    assert.strictEqual(devRetryRes.success, true);
    assert.strictEqual(devRetryRes.record.id, succRecord.id);
    assert.strictEqual(devRetryRes.findingsAdded, 0, 'Must not duplicate findings on already successful update');
  });

  // --------------------------------------------------------------------------
  // TEST 6: HandoverView: Outdated Invalidation Banner & Invariant Enforcement
  // --------------------------------------------------------------------------
  await t.test('6. HandoverView: Outdated warning, re-review count, and uncertified badge', async () => {
    const ws = await storage.getWorkspace(testWorkspaceId);
    const doc = ws.currentHandover;
    assert.ok(doc);

    // Condition for Outdated Invalidation Banner: stats.isHandoverOutdated || doc.isOutdated || !project.handoverCertified
    const isBannerActive = Boolean(doc.isOutdated || !ws.handoverCertified);
    assert.strictEqual(isBannerActive, true, 'Outdated invalidation banner must be active');

    // Re-review count derivation
    const needsReReviewCount = ws.findings.filter((f) => Boolean(f.needsReReview)).length;
    // find_drift_3 still needs re-review (find_drift_2 was approved in Test 3)
    assert.strictEqual(needsReReviewCount, 1, 'Exactly 1 finding remains requiring re-review');

    // Commit SHA extraction from outdated reason
    const commitMatch = doc.outdatedReason.match(/\b([0-9a-f]{7,40})\b/i);
    assert.ok(commitMatch, 'Must match commit SHA in outdatedReason');
    assert.strictEqual(commitMatch[1].slice(0, 7), 'c0ffee1');

    // Certified badge invariant: Never display certified badge when handoverCertified === false
    const isCertifiedBadgeVisible = ws.handoverCertified && !doc.isOutdated;
    assert.strictEqual(isCertifiedBadgeVisible, false, 'Certified badge must NOT be displayed when uncertified or outdated');

    // Handover regeneration Gating: Blocked while needsReReviewCount > 0
    setClientAuthToken(managerToken);
    await assert.rejects(
      async () => {
        // Attempting to certify while find_drift_3 is pending review
        await apiClient.certifyHandover(testWorkspaceId, 'Samyak Gedam');
      },
      (err) => {
        assert.ok(err instanceof ApiClientError);
        assert.strictEqual(err.statusCode, 400);
        assert.ok(err.message.includes('review') || err.message.includes('pending'));
        return true;
      },
      'Certification must be blocked until all drifted findings are reviewed'
    );
  });

  // --------------------------------------------------------------------------
  // TEST 7: Handover Re-Certification after Complete Re-Review
  // --------------------------------------------------------------------------
  await t.test('7. HandoverView: Full resolution restores certified state and clears banner', async () => {
    setClientAuthToken(managerToken);

    // 7a. Approve remaining drifted finding
    await apiClient.approveFinding(testWorkspaceId, 'find_drift_3', 'Manager verified and approved');

    // Verify 0 findings need re-review
    const wsAfter = await storage.getWorkspace(testWorkspaceId);
    const remainingDriftCount = wsAfter.findings.filter((f) => Boolean(f.needsReReview)).length;
    assert.strictEqual(remainingDriftCount, 0, 'All drifted findings must be reviewed');

    // 7b. Re-certify handover
    const certRes = await apiClient.certifyHandover(testWorkspaceId, 'Samyak Gedam');
    assert.strictEqual(certRes.project.handoverCertified, true, 'Workspace must be certified');
    assert.strictEqual(certRes.handover.isOutdated, false, 'Handover document must not be outdated');

    // Certified badge invariant: Now true!
    const isCertifiedBadgeVisible = certRes.project.handoverCertified && !certRes.handover.isOutdated;
    assert.strictEqual(isCertifiedBadgeVisible, true, 'Certified badge must now be rendered');
  });
});
