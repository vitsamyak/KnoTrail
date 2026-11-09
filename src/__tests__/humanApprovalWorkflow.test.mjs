import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DurableFileRepository } from '../server/db/storage.ts';
import { revalidateEditedFinding } from '../server/verification/verifier.ts';
import {
  getApprovedFindings,
  checkHandoverBlockStatus,
  generateHandoverJSON,
  generateHandoverMarkdown,
} from '../lib/handoverFilter.ts';
import { getFindingReviewStatus } from '../lib/types.ts';

const TEST_STORAGE_DIR = path.join(process.cwd(), '.data', 'test-approval-workspaces');
const TEST_UPLOADS_DIR = path.join(process.cwd(), '.data', 'test-approval-uploads');

function cleanupTestStorage() {
  if (fs.existsSync(TEST_STORAGE_DIR)) {
    fs.rmSync(TEST_STORAGE_DIR, { recursive: true, force: true });
  }
  if (fs.existsSync(TEST_UPLOADS_DIR)) {
    fs.rmSync(TEST_UPLOADS_DIR, { recursive: true, force: true });
  }
}

// Sample test source document
const TEST_DOC_1 = {
  id: 'src-test-01',
  name: 'architecture_specification.md',
  type: 'docs',
  status: 'connected',
  lastSync: 'Just now',
  recordCount: 100,
  icon: 'description',
  description: 'Architecture specification document',
  privacyLevel: 'LOCAL_READ_ONLY',
  isUploaded: true,
  documentData: {
    fileFormat: 'md',
    mimeType: 'text/markdown',
    fileSizeBytes: 1024,
    fileSizeFormatted: '1.0 KB',
    contentHash: 'hash-test-01',
    extractedText: `# Architecture Specification
We have decided to use PostgreSQL 16 as the primary relational database to store student service requests and transactional records.
The API layer communicates using REST endpoints on port 3000.
Security mandates require all session tokens to expire after 24 hours.`,
  },
};

// Sample candidate findings
function createSampleFinding(overrides = {}) {
  return {
    id: `finding-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    type: 'decision',
    title: 'Use PostgreSQL 16 as Primary Database',
    summary: 'Selected PostgreSQL 16 for student service requests and transactional records.',
    owner: 'Database Lead',
    confidence: 95,
    status: 'VERIFIED',
    claimStatus: 'SUPPORTED',
    evidenceValidity: 'MATCHED',
    approved: false,
    rejected: false,
    reviewStatus: 'PENDING_REVIEW',
    citations: [
      {
        id: 'cit-01',
        sourceId: 'src-test-01',
        sourceName: 'architecture_specification.md',
        file: 'architecture_specification.md',
        lineRange: 'L2-L3',
        snippet: 'We have decided to use PostgreSQL 16 as the primary relational database to store student service requests and transactional records.',
        status: 'VERIFIED',
        confidence: 95,
      },
    ],
    ...overrides,
  };
}

test('Phase F: Human Approval & Review Workflow Suite', async (t) => {
  cleanupTestStorage();

  const repo = new DurableFileRepository(TEST_STORAGE_DIR, TEST_UPLOADS_DIR);

  t.after(() => {
    cleanupTestStorage();
  });

  await t.test('1. Approving a supported finding sets status APPROVED and records audit action', async () => {
    const wsId = 'ws-approve-test-01';
    const finding = createSampleFinding({ id: 'finding-app-01' });

    let project = await repo.createWorkspace(wsId);
    project = {
      ...project,
      sources: [TEST_DOC_1],
      findings: [finding],
    };
    await repo.saveProject(wsId, project);

    // Approve finding
    const updated = await repo.approveFinding(
      wsId,
      'finding-app-01',
      'Verified with architecture RFC and deployed database configuration.',
      'Core Reviewer'
    );

    const approvedF = updated.findings.find((f) => f.id === 'finding-app-01');
    assert.equal(approvedF.approved, true, 'Finding approved flag must be true');
    assert.equal(approvedF.rejected, false, 'Finding rejected flag must be false');
    assert.equal(approvedF.reviewStatus, 'APPROVED', 'Finding reviewStatus must be APPROVED');
    assert.equal(approvedF.reviewedBy, 'Core Reviewer', 'Reviewer name must be recorded');
    assert.ok(approvedF.reviewedAt, 'Reviewed timestamp must be set');
    assert.equal(
      approvedF.reviewerNotes,
      'Verified with architecture RFC and deployed database configuration.',
      'Reviewer notes must be saved'
    );

    // Verify audit action
    assert.ok(Array.isArray(updated.reviewAuditHistory), 'Project must have reviewAuditHistory array');
    const audit = updated.reviewAuditHistory.find((a) => a.findingId === 'finding-app-01');
    assert.ok(audit, 'Audit action must be recorded for approved finding');
    assert.equal(audit.actionType, 'APPROVE');
    assert.equal(audit.previousStatus, 'PENDING_REVIEW');
    assert.equal(audit.newStatus, 'APPROVED');
    assert.equal(audit.reviewerName, 'Core Reviewer');
    assert.ok(audit.evidenceReferences.length > 0, 'Audit record must capture evidence snapshot');
  });

  await t.test('2. Rejecting a finding with reason sets status REJECTED and records audit action', async () => {
    const wsId = 'ws-reject-test-02';
    const finding = createSampleFinding({ id: 'finding-rej-01' });

    let project = await repo.createWorkspace(wsId);
    project = {
      ...project,
      sources: [TEST_DOC_1],
      findings: [finding],
    };
    await repo.saveProject(wsId, project);

    const reason = 'Deprecated by Sprint 14 team decision. Switching to distributed Redis.';
    const updated = await repo.rejectFinding(wsId, 'finding-rej-01', reason, 'Architecture Lead');

    const rejF = updated.findings.find((f) => f.id === 'finding-rej-01');
    assert.equal(rejF.approved, false, 'Rejected finding must have approved=false');
    assert.equal(rejF.rejected, true, 'Rejected finding must have rejected=true');
    assert.equal(rejF.reviewStatus, 'REJECTED', 'Finding reviewStatus must be REJECTED');
    assert.equal(rejF.rejectionReason, reason, 'Rejection reason must be saved in rejectionReason');
    assert.equal(rejF.reviewedBy, 'Architecture Lead');

    // Verify audit entry
    const audit = updated.reviewAuditHistory.find(
      (a) => a.findingId === 'finding-rej-01' && a.actionType === 'REJECT'
    );
    assert.ok(audit, 'Audit action must exist for reject');
    assert.equal(audit.newStatus, 'REJECTED');
    assert.equal(audit.reviewerNotes, reason);
  });

  await t.test('3. Rejecting without a reason fails with explicit error', async () => {
    const wsId = 'ws-reject-err-03';
    const finding = createSampleFinding({ id: 'finding-rej-err' });

    let project = await repo.createWorkspace(wsId);
    project = {
      ...project,
      sources: [TEST_DOC_1],
      findings: [finding],
    };
    await repo.saveProject(wsId, project);

    await assert.rejects(
      async () => {
        await repo.rejectFinding(wsId, 'finding-rej-err', '', 'Reviewer');
      },
      /rejection reason.*required/i,
      'Rejecting with empty reason must throw explicit error'
    );

    await assert.rejects(
      async () => {
        await repo.rejectFinding(wsId, 'finding-rej-err', '   ', 'Reviewer');
      },
      /rejection reason.*required/i,
      'Rejecting with whitespace-only reason must throw explicit error'
    );
  });

  await t.test('4. Editing finding fields updates storage correctly', async () => {
    const wsId = 'ws-edit-test-04';
    const finding = createSampleFinding({
      id: 'finding-edit-01',
      title: 'Initial Title',
      summary: 'We have decided to use PostgreSQL 16 as the primary relational database to store records.',
      owner: 'Alice',
      urgency: 'low',
    });

    let project = await repo.createWorkspace(wsId);
    project = {
      ...project,
      sources: [TEST_DOC_1],
      findings: [finding],
    };
    await repo.saveProject(wsId, project);

    const updated = await repo.editFinding(
      wsId,
      'finding-edit-01',
      {
        title: 'Use PostgreSQL 16 for Relational Data',
        summary: 'We have decided to use PostgreSQL 16 as the primary relational database for student service requests.',
        owner: 'Database Team Lead',
        urgency: 'high',
        category: 'infrastructure',
      },
      'Updated owner and urgency to reflect current operational assignment.',
      'Handover Reviewer'
    );

    const edited = updated.findings.find((f) => f.id === 'finding-edit-01');
    assert.equal(edited.title, 'Use PostgreSQL 16 for Relational Data');
    assert.equal(edited.owner, 'Database Team Lead');
    assert.equal(edited.urgency, 'high');
    assert.equal(edited.category, 'infrastructure');
    assert.equal(edited.reviewedBy, 'Handover Reviewer');
  });

  await t.test('5. Evidence revalidation after editing flags ungrounded claim as UNCERTAIN & NEEDS_CORRECTION', async () => {
    const wsId = 'ws-revalidate-test-05';
    // Create finding supported by PostgreSQL in TEST_DOC_1
    const finding = createSampleFinding({
      id: 'finding-ungrounded-01',
      title: 'Use PostgreSQL 16 as Primary Database',
      summary: 'We have decided to use PostgreSQL 16 as the primary relational database.',
    });

    let project = await repo.createWorkspace(wsId);
    project = {
      ...project,
      sources: [TEST_DOC_1],
      findings: [finding],
    };
    await repo.saveProject(wsId, project);

    // Edit claim to MongoDB which does NOT exist anywhere in TEST_DOC_1
    const updated = await repo.editFinding(
      wsId,
      'finding-ungrounded-01',
      {
        title: 'Adopt MongoDB Atlas Cluster for Documents',
        summary: 'We have decided to migrate our entire core pipeline to MongoDB Atlas document storage with sharding.',
      },
      'Testing claim modification to ungrounded technology',
      'QA Reviewer'
    );

    const edited = updated.findings.find((f) => f.id === 'finding-ungrounded-01');
    assert.equal(edited.status, 'UNCERTAIN', 'Ungrounded edit must flip status to UNCERTAIN');
    assert.equal(edited.claimStatus, 'UNCERTAIN', 'Ungrounded edit claimStatus must be UNCERTAIN');
    assert.equal(edited.reviewStatus, 'NEEDS_CORRECTION', 'Ungrounded edit reviewStatus must be NEEDS_CORRECTION');
    assert.ok(edited.confidence <= 50, 'Confidence must be degraded for ungrounded edit');
  });

  await t.test('6. Material edit resets approved status to false', async () => {
    const wsId = 'ws-edit-reset-06';
    const finding = createSampleFinding({
      id: 'finding-approved-edit-01',
      approved: true,
      reviewStatus: 'APPROVED',
      reviewedBy: 'Previous Reviewer',
    });

    let project = await repo.createWorkspace(wsId);
    project = {
      ...project,
      sources: [TEST_DOC_1],
      findings: [finding],
    };
    await repo.saveProject(wsId, project);

    // Edit the approved finding
    const updated = await repo.editFinding(
      wsId,
      'finding-approved-edit-01',
      {
        title: 'Use PostgreSQL 16 Relational Engine',
        summary: 'We have decided to use PostgreSQL 16 as the primary relational database to store student service requests.',
      },
      'Minor terminology alignment',
      'Current Reviewer'
    );

    const edited = updated.findings.find((f) => f.id === 'finding-approved-edit-01');
    assert.equal(edited.approved, false, 'Material edit must reset approved to false');
    assert.notEqual(edited.reviewStatus, 'APPROVED', 'Material edit must not remain APPROVED');
  });

  await t.test('7. Reviewer notes persistence and note audit action', async () => {
    const wsId = 'ws-notes-test-07';
    const finding = createSampleFinding({ id: 'finding-note-01' });

    let project = await repo.createWorkspace(wsId);
    project = {
      ...project,
      sources: [TEST_DOC_1],
      findings: [finding],
    };
    await repo.saveProject(wsId, project);

    const note = 'Confirmed in sprint demo that connection pool is configured for 25 max connections.';
    const updated = await repo.addReviewerNote(wsId, 'finding-note-01', note, 'Operations Lead');

    const targetF = updated.findings.find((f) => f.id === 'finding-note-01');
    assert.equal(targetF.reviewerNotes, note, 'Reviewer note must persist on finding');
    assert.equal(targetF.reviewedBy, 'Operations Lead');

    const audit = updated.reviewAuditHistory.find(
      (a) => a.findingId === 'finding-note-01' && a.actionType === 'ADD_NOTE'
    );
    assert.ok(audit, 'Audit action ADD_NOTE must be created');
    assert.equal(audit.reviewerNotes, note);
  });

  await t.test('8. Review history persistence in workspace storage', async () => {
    const wsId = 'ws-history-test-08';
    const finding = createSampleFinding({ id: 'finding-hist-01' });

    let project = await repo.createWorkspace(wsId);
    project = {
      ...project,
      sources: [TEST_DOC_1],
      findings: [finding],
    };
    await repo.saveProject(wsId, project);

    // Sequence of review actions
    await repo.addReviewerNote(wsId, 'finding-hist-01', 'Initial review inspection.', 'Reviewer 1');
    await repo.editFinding(
      wsId,
      'finding-hist-01',
      { urgency: 'high' },
      'Elevated urgency due to upcoming milestone',
      'Reviewer 2'
    );
    await repo.approveFinding(wsId, 'finding-hist-01', 'Final technical verification.', 'Lead Signer');

    const history = await repo.getReviewAuditHistory(wsId, 'finding-hist-01');
    assert.equal(history.length, 3, 'Audit history must contain all 3 actions');
    assert.equal(history[0].actionType, 'ADD_NOTE');
    assert.equal(history[1].actionType, 'EDIT');
    assert.equal(history[2].actionType, 'APPROVE');
  });

  await t.test('9. Conflict resolution updates finding status to VERIFIED and records audit entry', async () => {
    const wsId = 'ws-conflict-audit-09';
    const finding = createSampleFinding({
      id: 'finding-conf-01',
      status: 'CONFLICTING',
      claimStatus: 'CONFLICTING',
      conflictDetails: {
        category: 'database',
        explanation: 'Contradiction between architecture doc and deployment yaml',
        sourceA: { name: 'Doc A', claim: 'Use PostgreSQL 16' },
        sourceB: { name: 'Doc B', claim: 'Use MySQL 8.0' },
      },
    });

    let project = await repo.createWorkspace(wsId);
    project = {
      ...project,
      sources: [TEST_DOC_1],
      findings: [finding],
    };
    await repo.saveProject(wsId, project);

    const updated = await repo.resolveConflict(
      wsId,
      'finding-conf-01',
      'PostgreSQL 16 ratified in RFC-12. MySQL mention was an outdated draft.',
      'Chief Architect'
    );

    const resolvedF = updated.findings.find((f) => f.id === 'finding-conf-01');
    assert.equal(resolvedF.status, 'VERIFIED', 'Resolved conflict must update status to VERIFIED');
    assert.equal(resolvedF.claimStatus, 'SUPPORTED', 'Resolved conflict claimStatus must be SUPPORTED');
    assert.equal(resolvedF.approved, true, 'Resolved conflict finding is marked approved');

    const audit = updated.reviewAuditHistory.find(
      (a) => a.findingId === 'finding-conf-01' && a.actionType === 'RESOLVE_CONFLICT'
    );
    assert.ok(audit, 'RESOLVE_CONFLICT audit action must be recorded');
    assert.equal(audit.reviewerName, 'Chief Architect');
    assert.ok(audit.reviewerNotes.includes('PostgreSQL 16 ratified in RFC-12'));
  });

  await t.test('10. Blocking approval of unresolved conflicts throws explicit error', async () => {
    const wsId = 'ws-block-conflict-10';
    const finding = createSampleFinding({
      id: 'finding-block-conf-01',
      status: 'CONFLICTING',
    });

    let project = await repo.createWorkspace(wsId);
    project = {
      ...project,
      sources: [TEST_DOC_1],
      findings: [finding],
      conflicts: [
        {
          id: 'CONF-001',
          findingIdA: 'finding-block-conf-01',
          sourceNameA: 'Doc A',
          claimA: 'Claim A',
          sourceNameB: 'Doc B',
          claimB: 'Claim B',
          status: 'OPEN',
          conflictCategory: 'architecture',
          severity: 'HIGH',
          explanation: 'Open architectural disagreement',
        },
      ],
    };
    await repo.saveProject(wsId, project);

    await assert.rejects(
      async () => {
        await repo.approveFinding(wsId, 'finding-block-conf-01', 'Attempting approval', 'Reviewer');
      },
      /unresolved conflict/i,
      'Direct approval of finding with open conflict must be rejected'
    );
  });

  await t.test('11. Blocking approval of unsupported / MISSING evidence findings', async () => {
    const wsId = 'ws-block-missing-11';
    const finding = createSampleFinding({
      id: 'finding-missing-01',
      status: 'MISSING',
      evidenceValidity: 'MISSING',
      citations: [],
    });

    let project = await repo.createWorkspace(wsId);
    project = {
      ...project,
      sources: [TEST_DOC_1],
      findings: [finding],
    };
    await repo.saveProject(wsId, project);

    await assert.rejects(
      async () => {
        await repo.approveFinding(wsId, 'finding-missing-01', 'Trying to approve missing', 'Reviewer');
      },
      /lacks verifiable primary source evidence/i,
      'Approval of MISSING evidence finding must be blocked'
    );
  });

  await t.test('12. Approving uncertain finding requires explicit documented justification', async () => {
    const wsId = 'ws-uncertain-gate-12';
    const finding = createSampleFinding({
      id: 'finding-unc-01',
      status: 'UNCERTAIN',
      claimStatus: 'UNCERTAIN',
    });

    let project = await repo.createWorkspace(wsId);
    project = {
      ...project,
      sources: [TEST_DOC_1],
      findings: [finding],
    };
    await repo.saveProject(wsId, project);

    // Attempting approval with no notes throws
    await assert.rejects(
      async () => {
        await repo.approveFinding(wsId, 'finding-unc-01', '', 'Reviewer');
      },
      /without documented review justification/i,
      'Approval without notes must fail for UNCERTAIN finding'
    );

    // Attempting approval with note < 5 chars throws
    await assert.rejects(
      async () => {
        await repo.approveFinding(wsId, 'finding-unc-01', 'ok', 'Reviewer');
      },
      /without documented review justification/i,
      'Approval with short notes must fail for UNCERTAIN finding'
    );

    // Approval with documented justification succeeds
    const justification = 'Verified verbally with Database Lead on 2026-11-08.';
    const updated = await repo.approveFinding(wsId, 'finding-unc-01', justification, 'Reviewer Lead');

    const approvedF = updated.findings.find((f) => f.id === 'finding-unc-01');
    assert.equal(approvedF.approved, true, 'Approved flag must be true');
    assert.equal(approvedF.status, 'UNCERTAIN', 'Factual status UNCERTAIN must not be fabricated/masked');
    assert.equal(approvedF.reviewerNotes, justification, 'Documented justification must be preserved');
  });

  await t.test('13. Workspace isolation preserves separate review decisions and audit histories', async () => {
    const wsA = 'ws-iso-a-13';
    const wsB = 'ws-iso-b-13';

    const findingA = createSampleFinding({ id: 'finding-common-id' });
    const findingB = createSampleFinding({ id: 'finding-common-id' });

    let projA = await repo.createWorkspace(wsA);
    projA = { ...projA, sources: [TEST_DOC_1], findings: [findingA] };
    await repo.saveProject(wsA, projA);

    let projB = await repo.createWorkspace(wsB);
    projB = { ...projB, sources: [TEST_DOC_1], findings: [findingB] };
    await repo.saveProject(wsB, projB);

    // Approve in Workspace A
    await repo.approveFinding(wsA, 'finding-common-id', 'Approved in A', 'Reviewer A');

    // Reject in Workspace B
    await repo.rejectFinding(wsB, 'finding-common-id', 'Rejected in B due to different scope', 'Reviewer B');

    const finalA = await repo.getWorkspace(wsA);
    const finalB = await repo.getWorkspace(wsB);

    assert.equal(finalA.findings[0].approved, true);
    assert.equal(finalA.findings[0].reviewStatus, 'APPROVED');
    assert.equal(finalA.findings[0].reviewedBy, 'Reviewer A');

    assert.equal(finalB.findings[0].approved, false);
    assert.equal(finalB.findings[0].rejected, true);
    assert.equal(finalB.findings[0].reviewStatus, 'REJECTED');
    assert.equal(finalB.findings[0].reviewedBy, 'Reviewer B');

    // Separate audit histories
    const histA = await repo.getReviewAuditHistory(wsA, 'finding-common-id');
    const histB = await repo.getReviewAuditHistory(wsB, 'finding-common-id');
    assert.equal(histA[0].actionType, 'APPROVE');
    assert.equal(histB[0].actionType, 'REJECT');
  });

  await t.test('14. Approval status and audit log persist across repository re-instantiation', async () => {
    const wsId = 'ws-reinstantiate-14';
    const finding = createSampleFinding({ id: 'finding-persist-14' });

    let project = await repo.createWorkspace(wsId);
    project = {
      ...project,
      sources: [TEST_DOC_1],
      findings: [finding],
    };
    await repo.saveProject(wsId, project);

    await repo.approveFinding(wsId, 'finding-persist-14', 'Approval to test persistence', 'Lead Auditor');

    // Re-instantiate repository from disk
    const freshRepo = new DurableFileRepository(TEST_STORAGE_DIR, TEST_UPLOADS_DIR);

    const readProj = await freshRepo.getWorkspace(wsId);
    assert.ok(readProj, 'Project must load from disk');
    const readF = readProj.findings.find((f) => f.id === 'finding-persist-14');
    assert.equal(readF.approved, true);
    assert.equal(readF.reviewStatus, 'APPROVED');
    assert.equal(readF.reviewedBy, 'Lead Auditor');

    const readHist = await freshRepo.getReviewAuditHistory(wsId, 'finding-persist-14');
    assert.equal(readHist.length, 1);
    assert.equal(readHist[0].reviewerName, 'Lead Auditor');
  });

  await t.test('15. Rejected findings strictly excluded from handover package and exports', async () => {
    const approvedF = createSampleFinding({
      id: 'f-approved-export',
      title: 'Approved PostgreSQL Standard',
      approved: true,
      rejected: false,
      reviewStatus: 'APPROVED',
    });

    const rejectedF = createSampleFinding({
      id: 'f-rejected-export',
      title: 'Rejected CouchDB Engine',
      approved: false,
      rejected: true,
      reviewStatus: 'REJECTED',
      rejectionReason: 'Not approved by team lead',
    });

    const allFindings = [approvedF, rejectedF];
    const approvedFindings = getApprovedFindings(allFindings);

    assert.equal(approvedFindings.length, 1, 'Only approved finding must be included');
    assert.equal(approvedFindings[0].id, 'f-approved-export');

    // JSON export check
    const projectMock = {
      name: 'Test Project',
      code: 'TEST-100',
      version: 'v1.0',
      findings: allFindings,
      stakeholders: [],
      sources: [],
    };
    const jsonOutput = JSON.stringify(generateHandoverJSON(projectMock));
    assert.ok(jsonOutput.includes('Approved PostgreSQL Standard'), 'JSON must include approved finding');
    assert.ok(!jsonOutput.includes('Rejected CouchDB Engine'), 'JSON must NEVER include rejected finding');

    // Markdown export check
    const mdOutput = generateHandoverMarkdown(projectMock);
    assert.ok(mdOutput.includes('Approved PostgreSQL Standard'), 'Markdown must include approved finding');
    assert.ok(!mdOutput.includes('Rejected CouchDB Engine'), 'Markdown must NEVER include rejected finding');
  });

  await t.test('16. Handover certification gate strictly enforces all review conditions', async () => {
    const f1 = createSampleFinding({
      id: 'f-gate-1',
      approved: true,
      rejected: false,
      reviewStatus: 'APPROVED',
    });
    const f2Unreviewed = createSampleFinding({
      id: 'f-gate-2',
      approved: false,
      rejected: false,
      reviewStatus: 'PENDING_REVIEW',
    });

    // Case A: Unreviewed finding blocks handover
    const blockA = checkHandoverBlockStatus([f1, f2Unreviewed], false, []);
    assert.equal(blockA.isBlocked, true, 'Handover must be blocked if unreviewed findings exist');
    assert.equal(blockA.canCertify, false);
    assert.equal(blockA.unreviewedCount, 1);

    // Case B: Rejecting f2 allows certification (all findings have been reviewed)
    const f2Rejected = { ...f2Unreviewed, rejected: true, reviewStatus: 'REJECTED' };
    const blockBBeforeCert = checkHandoverBlockStatus([f1, f2Rejected], false, []);
    assert.equal(blockBBeforeCert.canCertify, true, 'Certification allowed when all findings reviewed');
    assert.equal(blockBBeforeCert.unreviewedCount, 0);

    // Formally certified handover unblocks viewing completely
    const blockBAfterCert = checkHandoverBlockStatus([f1, f2Rejected], true, []);
    assert.equal(blockBAfterCert.isBlocked, false, 'Handover unblocks completely when certified');
    assert.equal(blockBAfterCert.canCertify, true);

    // Case C: Open conflict blocks certification even if all findings are approved
    const conflict = {
      id: 'CONF-GATE',
      findingIdA: 'f-gate-1',
      claimA: 'Claim A',
      sourceNameA: 'Doc A',
      sourceNameB: 'Doc B',
      claimB: 'Claim B',
      status: 'OPEN',
      conflictCategory: 'architecture',
      severity: 'HIGH',
      explanation: 'Unresolved disagreement',
    };
    const blockC = checkHandoverBlockStatus([f1], false, [conflict]);
    assert.equal(blockC.isBlocked, true, 'Open conflict must block handover');
    assert.equal(blockC.canCertify, false);
    assert.equal(blockC.unresolvedConflictsCount, 1);

    // Case D: Needs correction finding blocks certification
    const fNeedsCorrection = createSampleFinding({
      id: 'f-gate-3',
      approved: false,
      rejected: false,
      reviewStatus: 'NEEDS_CORRECTION',
    });
    const blockD = checkHandoverBlockStatus([f1, fNeedsCorrection], false, []);
    assert.equal(blockD.isBlocked, true, 'Needs correction must block handover');
    assert.equal(blockD.canCertify, false);
    assert.equal(blockD.needsCorrectionCount, 1);
  });
});
