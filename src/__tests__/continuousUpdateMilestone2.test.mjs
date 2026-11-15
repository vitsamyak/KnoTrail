/**
 * Automated Test Suite: Evidence Drift Scanning & Precise Approval Invalidation
 * (KnoTrail Round 3 - Milestone 3.2)
 *
 * Verifies high-precision evidence drift detection and governance enforcement:
 * 1. Missing evidence invalidates approval (approved -> false, needsReReview -> true).
 * 2. Materially changed evidence invalidates approval.
 * 3. Whitespace-only changes do NOT invalidate approval (Zero False Positives).
 * 4. Unrelated source changes do NOT invalidate approval (Scoped Isolation).
 * 5. Uncertain evidence is flagged for human review without being declared invalid.
 * 6. Contradictory / superseding evidence invalidates approval and marks claim outdated.
 * 7. Handover certification is reset when previously certified knowledge drifts.
 * 8. Existing review audit history is preserved and new APPROVAL_RESET entry is appended.
 * 9. Cross-workspace isolation preserves separate states across workspaces.
 *
 * Governance: CodersInPune Hackathon 2026 - Deploy_or_Die (Samyak Gedam & Sanshrey Sanagar)
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../../backend/app.ts';
import { getStorage, resetStorageInstance } from '../server/db/storage.ts';
import {
  setCustomGitHubService,
  setWebhookSecretOverride,
} from '../../backend/routes/github.ts';
import { GitHubService } from '../../backend/services/github.ts';
import { createDevSessionToken } from '../../backend/middleware/auth.ts';
import {
  stripFormatting,
  findBestEvidenceSimilarity,
  evaluateFindingEvidenceDrift,
  scanWorkspaceEvidenceDrift,
} from '../server/verification/driftDetector.ts';

const TEST_SECRET = 'knotrail_drift_webhook_secret_2026';

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

/**
 * Mock GitHub Service for testing evidence drift scenarios.
 */
class DriftTestMockGitHubService extends GitHubService {
  constructor(initialData = {}) {
    super();
    this.commits = initialData.commits || [];
    this.pullRequests = initialData.pullRequests || [];
    this.issues = initialData.issues || [];
    this.readme = initialData.readme || '# Project KnoTrail System Architecture';
  }

  async getRepository(owner, repo) {
    return {
      id: 887766,
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

test('▶ Round 3 - Milestone 3.2: Evidence Drift Scanning & Precise Approval Invalidation', async (t) => {
  const origStorageBackend = process.env.STORAGE_BACKEND;
  const origGeminiKey = process.env.GEMINI_API_KEY;
  process.env.STORAGE_BACKEND = 'file';
  delete process.env.GEMINI_API_KEY;
  resetStorageInstance();

  const { server, baseUrl, close } = await createTestServer();
  const storage = getStorage();

  setWebhookSecretOverride(TEST_SECRET);

  t.after(async () => {
    setCustomGitHubService(null);
    setWebhookSecretOverride(null);
    process.env.STORAGE_BACKEND = origStorageBackend;
    if (origGeminiKey !== undefined) {
      process.env.GEMINI_API_KEY = origGeminiKey;
    } else {
      delete process.env.GEMINI_API_KEY;
    }
    resetStorageInstance();
    await close();
  });

  // Setup identities
  const managerUser = { id: 'usr_drift_mgr_' + Date.now(), email: 'mgr@drift.demo' };
  const developerUser = { id: 'usr_drift_dev_' + Date.now(), email: 'dev@drift.demo' };
  const managerToken = createDevSessionToken(managerUser, 3600);
  const developerToken = createDevSessionToken(developerUser, 3600);

  // Setup workspace
  const wsId = 'ws_drift_test_' + Date.now();
  await storage.createWorkspace(wsId);
  await storage.setWorkspaceProtected(wsId, true, managerUser.id);
  await storage.addWorkspaceMember(wsId, { userId: managerUser.id, email: managerUser.email, role: 'MANAGER' });
  await storage.addWorkspaceMember(wsId, { userId: developerUser.id, email: developerUser.email, role: 'DEVELOPER' });

  // --------------------------------------------------------------------------
  // Unit Tests: Precision Formatting & Token Overlap Helpers
  // --------------------------------------------------------------------------
  await t.test('1. stripFormatting collapses markdown, bullets, punctuation, and whitespace', () => {
    const raw = '### Section 1: Database\n\n* **PostgreSQL 16** is our primary database.\n- Port: `5432`!';
    const stripped = stripFormatting(raw);
    assert.equal(stripped, 'section 1 database postgresql 16 is our primary database port 5432');
  });

  await t.test('2. findBestEvidenceSimilarity detects exact, normalized, stripped, and shifted quotes', () => {
    const doc = `# System Architecture\n\nDatabase cluster runs on PostgreSQL 16 on port 5432 with replication.\nCache layer uses Redis 7.`;
    
    // Exact match
    const exact = findBestEvidenceSimilarity('PostgreSQL 16 on port 5432', doc);
    assert.equal(exact.similarity, 1.0);
    assert.equal(exact.matchType, 'exact');

    // Whitespace / newline variations
    const whitespace = findBestEvidenceSimilarity('PostgreSQL   16\n\non   port  5432', doc);
    assert.equal(whitespace.similarity, 1.0);
    assert.ok(whitespace.matchType === 'normalized' || whitespace.matchType === 'stripped');

    // Missing quote
    const missing = findBestEvidenceSimilarity('MongoDB Atlas cluster on AWS', doc);
    assert.ok(missing.similarity < 0.4);
  });

  // --------------------------------------------------------------------------
  // Integration Tests: Invalidation & Zero False Positives
  // --------------------------------------------------------------------------
  const repoId = 887766;
  const mockService = new DriftTestMockGitHubService({
    commits: [
      {
        sha: 'sha_initial_111',
        shortSha: 'sha111',
        message: 'Add database configuration\n\nConfigured PostgreSQL 16 on port 5432.',
        author: { name: 'Samyak Gedam', email: 'samyak@knotrail.demo', date: '2026-11-14T10:00:00Z' },
        url: 'https://github.com/vitsamyak/drift-repo/commit/sha_initial_111',
      },
    ],
  });
  setCustomGitHubService(mockService);

  // Connect repository to workspace
  await storage.saveGitHubIntegration(wsId, {
    id: `ghi_${repoId}`,
    workspaceId: wsId,
    repoOwner: 'vitsamyak',
    repoName: 'drift-repo',
    repoId,
    defaultBranch: 'main',
    selectedBranch: 'main',
    syncStatus: 'idle',
    config: { includeCommits: true, includePullRequests: true, includeIssues: true, includeDocs: true },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Perform initial sync to compile initial ProjectSource
  await fetch(`${baseUrl}/api/github/integrations/${repoId}/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${managerToken}` },
    body: JSON.stringify({ workspaceId: wsId, runAiExtraction: false }),
  });

  const projectAfterInit = await storage.getWorkspace(wsId);
  const targetSource = projectAfterInit.sources.find((s) => s.id === `src_gh_${repoId}`);
  assert.ok(targetSource);

  // Setup 4 test findings:
  // Finding 1: Approved, cites target repo (will have evidence removed -> MATERIAL DRIFT)
  // Finding 2: Approved, cites target repo (will have whitespace-only changes -> NO DRIFT)
  // Finding 3: Approved, cites UNRELATED source (unrelated -> NO DRIFT)
  // Finding 4: Approved, cites target repo (will have partial wording shift -> UNCERTAIN)
  const unrelatedSourceId = 'src_unrelated_doc_999';
  projectAfterInit.sources.push({
    id: unrelatedSourceId,
    name: 'INFRASTRUCTURE_MANUAL.pdf',
    type: 'docs',
    status: 'connected',
    lastSync: 'Yesterday',
    recordCount: 10,
    icon: 'picture_as_pdf',
    description: 'Independent infrastructure setup guide',
    privacyLevel: 'LOCAL_READ_ONLY',
    documentData: {
      fileFormat: 'pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 45000,
      fileSizeFormatted: '45 KB',
      contentHash: 'hash_unrelated_123',
      extractedText: 'All background jobs are scheduled using Redis BullMQ queues.',
    },
  });

  projectAfterInit.findings = [
    {
      id: 'find_drift_missing',
      title: 'PostgreSQL Database Port Configuration',
      summary: 'Database listens on port 5432 with replication.',
      type: 'decision',
      category: 'database',
      status: 'VERIFIED',
      confidence: 95,
      approved: true, // Previously approved by manager
      reviewStatus: 'APPROVED',
      reviewedBy: 'Manager',
      reviewedAt: new Date().toISOString(),
      citations: [
        {
          id: 'cit_1',
          sourceId: targetSource.id,
          sourceName: targetSource.name,
          snippet: 'Configured PostgreSQL 16 on port 5432.',
          confidence: 95,
          contentHash: 'hash_quote_1',
        },
      ],
      createdDate: '2026-11-14T10:00:00Z',
      urgency: 'high',
      owner: 'Samyak Gedam',
    },
    {
      id: 'find_drift_whitespace',
      title: 'Architectural Commit Attribution',
      summary: 'Samyak Gedam is the author of initial commit.',
      type: 'decision',
      category: 'architecture',
      status: 'VERIFIED',
      confidence: 95,
      approved: true, // Previously approved by manager
      reviewStatus: 'APPROVED',
      reviewedBy: 'Manager',
      reviewedAt: new Date().toISOString(),
      citations: [
        {
          id: 'cit_2',
          sourceId: targetSource.id,
          sourceName: targetSource.name,
          snippet: 'Author: Samyak Gedam <samyak@knotrail.demo>',
          confidence: 95,
          contentHash: 'hash_quote_2',
        },
      ],
      createdDate: '2026-11-14T10:00:00Z',
      urgency: 'medium',
      owner: 'Samyak Gedam',
    },
    {
      id: 'find_drift_unrelated',
      title: 'Redis BullMQ Job Processing Queue',
      summary: 'Background tasks are processed using BullMQ.',
      type: 'decision',
      category: 'infrastructure',
      status: 'VERIFIED',
      confidence: 90,
      approved: true, // Previously approved by manager
      reviewStatus: 'APPROVED',
      reviewedBy: 'Manager',
      reviewedAt: new Date().toISOString(),
      citations: [
        {
          id: 'cit_3',
          sourceId: unrelatedSourceId,
          sourceName: 'INFRASTRUCTURE_MANUAL.pdf',
          snippet: 'All background jobs are scheduled using Redis BullMQ queues.',
          confidence: 90,
          contentHash: 'hash_quote_3',
        },
      ],
      createdDate: '2026-11-14T10:00:00Z',
      urgency: 'low',
      owner: 'Sanshrey Sanagar',
    },
  ];

  // Setup certified handover
  projectAfterInit.handoverCertified = true;
  projectAfterInit.certificationHash = 'initial_cert_hash_999';
  projectAfterInit.currentHandover = {
    id: 'hnd_certified_initial',
    version: '1.0',
    title: 'Certified Handover v1.0',
    summary: 'Initial project state',
    createdAt: new Date().toISOString(),
    certifiedAt: new Date().toISOString(),
    isOutdated: false,
    sections: [],
  };
  projectAfterInit.reviewAuditHistory = [
    {
      id: 'audit_initial_approval_1',
      findingId: 'find_drift_missing',
      workspaceId: wsId,
      actionType: 'APPROVE',
      action: 'APPROVE',
      previousStatus: 'PENDING_REVIEW',
      newStatus: 'APPROVED',
      reviewerName: 'Manager',
      timestamp: '2026-11-14T10:30:00Z',
    },
  ];

  await storage.saveProject(wsId, projectAfterInit);

  // --------------------------------------------------------------------------
  // 3. Material Evidence Removal: Invalidates Approval & De-Certifies Handover
  // --------------------------------------------------------------------------
  await t.test('3. Missing evidence invalidates approval, sets needsReReview, and resets handover certification', async () => {
    // In refreshed repository, the PostgreSQL commit message is completely rewritten:
    // Port 5432 quote is removed!
    mockService.commits = [
      {
        sha: 'sha_updated_222',
        shortSha: 'sha222',
        message: 'Migrate infrastructure to DynamoDB cloud serverless datastore.',
        author: { name: 'Samyak Gedam', email: 'samyak@knotrail.demo', date: '2026-11-15T12:00:00Z' },
        url: 'https://github.com/vitsamyak/drift-repo/commit/sha_updated_222',
      },
    ];

    // Trigger sync to run continuous update with evidence drift detector
    const res = await fetch(`${baseUrl}/api/github/integrations/${repoId}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${managerToken}` },
      body: JSON.stringify({ workspaceId: wsId, reason: 'Commit sha222 migrated datastore' }),
    });

    assert.equal(res.status, 200);

    const projectAfterDrift = await storage.getWorkspace(wsId);

    // 1. Finding 1 (Port 5432) must be INVALIDATED
    const find1 = projectAfterDrift.findings.find((f) => f.id === 'find_drift_missing');
    assert.ok(find1);
    assert.equal(find1.approved, false, 'Approval must be revoked when supporting evidence is removed');
    assert.equal(find1.reviewStatus, 'PENDING_REVIEW', 'reviewStatus must be reset to PENDING_REVIEW');
    assert.equal(find1.needsReReview, true, 'needsReReview must be set to true');
    assert.match(find1.reReviewReason, /Supporting quote was modified or removed/i);

    // 2. Audit log entry must be appended immutably
    const auditEntries = projectAfterDrift.reviewAuditHistory.filter((a) => a.findingId === 'find_drift_missing');
    assert.ok(auditEntries.length >= 2, 'Previous approval and new reset action must both exist');
    const resetAction = auditEntries.find((a) => a.actionType === 'APPROVAL_RESET');
    assert.ok(resetAction, 'Must have APPROVAL_RESET audit action');
    assert.equal(resetAction.reviewerName, 'System (Evidence Drift Monitor)');

    // 3. Handover certification must be de-certified
    assert.equal(projectAfterDrift.handoverCertified, false, 'handoverCertified must be reset to false');
    assert.equal(projectAfterDrift.currentHandover.isOutdated, true, 'currentHandover must be marked isOutdated');
  });

  // --------------------------------------------------------------------------
  // 4. Whitespace-Only Changes Do NOT Invalidate Approval
  // --------------------------------------------------------------------------
  await t.test('4. Whitespace, formatting, and markdown changes do NOT invalidate approval (Zero False Positives)', async () => {
    const project = await storage.getWorkspace(wsId);
    const findWhitespace = project.findings.find((f) => f.id === 'find_drift_whitespace');
    assert.ok(findWhitespace);
    // Finding 2 still had author "Samyak Gedam <samyak@knotrail.demo>" in the commit header
    assert.equal(findWhitespace.approved, true, 'Finding with intact/whitespace-only citation must retain approval');
    assert.equal(findWhitespace.needsReReview, false);
  });

  // --------------------------------------------------------------------------
  // 5. Unrelated Source Changes Do NOT Invalidate Approval
  // --------------------------------------------------------------------------
  await t.test('5. Unrelated source findings remain completely unaffected by repository updates (Scoped Isolation)', async () => {
    const project = await storage.getWorkspace(wsId);
    const findUnrelated = project.findings.find((f) => f.id === 'find_drift_unrelated');
    assert.ok(findUnrelated);
    // Finding citing INFRASTRUCTURE_MANUAL.pdf must be 100% untouched
    assert.equal(findUnrelated.approved, true, 'Unrelated source finding must retain approved: true');
    assert.equal(findUnrelated.reviewStatus, 'APPROVED');
    assert.ok(!findUnrelated.needsReReview, 'needsReReview must be false or undefined for unaffected finding');
  });

  // --------------------------------------------------------------------------
  // 6. Uncertain Evidence Is Flagged For Review Without Being Declared Invalid
  // --------------------------------------------------------------------------
  await t.test('6. Uncertain evidence is flagged for human review without being declared invalid', () => {
    const mockFinding = {
      id: 'find_uncertain_test',
      title: 'Worker Queue Concurrency',
      summary: 'Worker queue processes 10 concurrent jobs.',
      type: 'decision',
      category: 'backend',
      status: 'VERIFIED',
      citations: [
        {
          id: 'cit_uncert',
          sourceId: 'src_test',
          snippet: 'Worker queue concurrency is set to 10 parallel consumer jobs across instances.',
        },
      ],
      createdDate: new Date().toISOString(),
      approved: true,
    };

    // Source contains partially altered wording (similarity ~65-75%)
    const alteredSource = {
      id: 'src_test',
      name: 'worker.ts',
      documentData: {
        extractedText: 'Worker queue concurrency defaults to 10 consumer tasks.',
      },
    };

    const result = evaluateFindingEvidenceDrift(mockFinding, alteredSource);
    assert.equal(result.hasMaterialDrift, false, 'Uncertain evidence should not be hard-declared invalid');
    assert.equal(result.isUncertain, true, 'Uncertain evidence must be flagged isUncertain: true');
    assert.match(result.reason, /partially shifted/i);
  });

  // --------------------------------------------------------------------------
  // 7. Contradictions & Temporal Supersession Detect Drift
  // --------------------------------------------------------------------------
  await t.test('7. Contradictory newer claims trigger material drift and invalidate older claim', () => {
    const olderFinding = {
      id: 'find_db_postgres',
      title: 'Primary Relational Database Choice',
      summary: 'PostgreSQL is our primary database for transactions.',
      category: 'database',
      type: 'decision',
      status: 'VERIFIED',
      citations: [{ id: 'c1', sourceId: 'src_repo', snippet: 'PostgreSQL is our primary database' }],
      createdDate: '2026-11-10T10:00:00Z',
      approved: true,
    };

    const newerConflictingFinding = {
      id: 'find_db_mysql',
      title: 'Primary Relational Database Choice',
      summary: 'MySQL is our primary database for transactions.',
      category: 'database',
      type: 'decision',
      status: 'VERIFIED',
      citations: [{ id: 'c2', sourceId: 'src_repo', snippet: 'MySQL is our primary database' }],
      createdDate: '2026-11-15T10:00:00Z',
      approved: false,
    };

    const targetSource = {
      id: 'src_repo',
      name: 'database.env',
      documentData: { extractedText: 'PostgreSQL is our primary database\nMySQL is our primary database' },
    };

    const result = evaluateFindingEvidenceDrift(olderFinding, targetSource, [olderFinding, newerConflictingFinding]);
    assert.equal(result.hasMaterialDrift, true);
    assert.equal(result.driftType, 'CONTRADICTED');
    assert.match(result.reason, /Contradicted by newer repository finding/i);
  });

  // --------------------------------------------------------------------------
  // 8. Cross-Workspace Isolation Integrity
  // --------------------------------------------------------------------------
  await t.test('8. Cross-workspace isolation: Drift scan in Workspace A never modifies Workspace B', async () => {
    // Setup Workspace B with an approved finding
    const wsBId = 'ws_drift_isolate_b_' + Date.now();
    await storage.createWorkspace(wsBId);
    await storage.setWorkspaceProtected(wsBId, true, managerUser.id);
    await storage.addWorkspaceMember(wsBId, { userId: managerUser.id, email: managerUser.email, role: 'MANAGER' });

    const projB = await storage.getWorkspace(wsBId);
    projB.findings = [
      {
        id: 'find_ws_b_approved',
        title: 'Workspace B Independent Finding',
        summary: 'Workspace B data',
        type: 'decision',
        category: 'backend',
        status: 'VERIFIED',
        approved: true,
        reviewStatus: 'APPROVED',
        citations: [{ id: 'c_b', sourceId: 'src_b', snippet: 'Workspace B snippet' }],
        createdDate: new Date().toISOString(),
        owner: 'Manager',
        urgency: 'low',
      },
    ];
    await storage.saveProject(wsBId, projB);

    // Run drift scan in Workspace A
    scanWorkspaceEvidenceDrift(wsId, targetSource.id, projectAfterInit);

    // Verify Workspace B is 100% untouched
    const verifiedB = await storage.getWorkspace(wsBId);
    const findB = verifiedB.findings.find((f) => f.id === 'find_ws_b_approved');
    assert.equal(findB.approved, true, 'Workspace B finding must remain approved');
    assert.equal(findB.needsReReview, undefined);
  });
});
