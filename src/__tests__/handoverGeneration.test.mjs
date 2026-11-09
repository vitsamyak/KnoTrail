import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DurableFileRepository } from '../server/db/storage.ts';
import {
  buildHandoverDocument,
  getEligibleHandoverFindings,
  computeProjectDataSnapshotHash,
  generateDeterministicExecutiveSummary,
} from '../server/handover/generator.ts';
import {
  exportHandoverMarkdown,
  exportHandoverJson,
  generatePrintableHtml,
} from '../lib/handoverExport.ts';
import { INITIAL_PROJECT_DATA } from '../lib/demoData.ts';

const TEST_WORKSPACES_DIR = path.join(process.cwd(), '.data', 'test-handover-workspaces');
const TEST_UPLOADS_DIR = path.join(process.cwd(), '.data', 'test-handover-uploads');

function cleanupTestDirs() {
  if (fs.existsSync(TEST_WORKSPACES_DIR)) {
    fs.rmSync(TEST_WORKSPACES_DIR, { recursive: true, force: true });
  }
  if (fs.existsSync(TEST_UPLOADS_DIR)) {
    fs.rmSync(TEST_UPLOADS_DIR, { recursive: true, force: true });
  }
}

function createTestRepo() {
  cleanupTestDirs();
  return new DurableFileRepository(TEST_WORKSPACES_DIR, TEST_UPLOADS_DIR);
}

// Sample mock project data
const MOCK_SOURCE = {
  id: 'src-01',
  name: 'system_architecture.md',
  type: 'docs',
  status: 'connected',
  lastSync: 'Just now',
  recordCount: 50,
  icon: 'description',
  description: 'System architecture doc',
  privacyLevel: 'LOCAL_READ_ONLY',
  isUploaded: true,
  documentData: {
    fileFormat: 'md',
    mimeType: 'text/markdown',
    fileSizeBytes: 2048,
    fileSizeFormatted: '2.0 KB',
    contentHash: 'hash-abc-123',
    extractedText: 'System uses PostgreSQL 16 for primary data storage and Redis for session cache.',
  },
};

const APPROVED_DECISION = {
  id: 'FIND-DEC-1',
  type: 'decision',
  title: 'Adopt PostgreSQL 16 as Primary DB',
  summary: 'PostgreSQL 16 selected for relational storage with ACID compliance.',
  category: 'Database',
  status: 'VERIFIED',
  reviewStatus: 'APPROVED',
  approved: true,
  rejected: false,
  citations: [
    {
      sourceId: 'src-01',
      sourceName: 'system_architecture.md',
      quote: 'System uses PostgreSQL 16 for primary data storage',
      lineNumber: 1,
    },
  ],
};

const UNCERTAIN_DECISION = {
  id: 'FIND-DEC-2',
  type: 'decision',
  title: 'Evaluate GraphQL vs REST',
  summary: 'REST API preferred for initial milestone release.',
  category: 'Architecture',
  status: 'UNCERTAIN',
  claimStatus: 'UNCERTAIN',
  reviewStatus: 'APPROVED',
  approved: true,
  rejected: false,
  reviewerNotes: 'Accepted with noted uncertainty regarding future mobile API requirements.',
  citations: [
    {
      sourceId: 'src-01',
      sourceName: 'system_architecture.md',
      quote: 'REST API structure for the current release',
      lineNumber: 1,
    },
  ],
};

const REJECTED_FINDING = {
  id: 'FIND-REJ-1',
  type: 'decision',
  title: 'Migrate immediately to DynamoDB',
  summary: 'Proposed cloud NoSQL migration rejected by architect.',
  category: 'Database',
  status: 'VERIFIED',
  reviewStatus: 'REJECTED',
  approved: false,
  rejected: true,
  rejectionReason: 'Contradicts relational storage requirement.',
  citations: [
    {
      sourceId: 'src-01',
      sourceName: 'system_architecture.md',
      quote: 'DynamoDB consideration',
      lineNumber: 1,
    },
  ],
};

const UNREVIEWED_FINDING = {
  id: 'FIND-UNREV-1',
  type: 'task',
  title: 'Write automated DB migration scripts',
  summary: 'Create Flyway scripts for schema setup.',
  category: 'Database',
  status: 'VERIFIED',
  reviewStatus: 'PENDING',
  approved: false,
  rejected: false,
  citations: [
    {
      sourceId: 'src-01',
      sourceName: 'system_architecture.md',
      quote: 'migration scripts',
      lineNumber: 1,
    },
  ],
};

const APPROVED_TASK = {
  id: 'FIND-TASK-1',
  type: 'task',
  title: 'Configure Redis Replica Sentinel',
  summary: 'Set up high-availability sentinel cluster for Redis.',
  category: 'Infrastructure',
  owner: 'Samyak Gedam',
  urgency: 'high',
  status: 'VERIFIED',
  reviewStatus: 'APPROVED',
  approved: true,
  rejected: false,
  citations: [
    {
      sourceId: 'src-01',
      sourceName: 'system_architecture.md',
      quote: 'Redis for session cache',
      lineNumber: 1,
    },
  ],
};

const APPROVED_UNASSIGNED_TASK = {
  id: 'FIND-TASK-2',
  type: 'task',
  title: 'Configure automated backup scripts',
  summary: 'Daily PostgreSQL automated WAL archiving.',
  category: 'DevOps',
  owner: 'Unassigned',
  urgency: 'critical',
  status: 'VERIFIED',
  reviewStatus: 'APPROVED',
  approved: true,
  rejected: false,
  citations: [
    {
      sourceId: 'src-01',
      sourceName: 'system_architecture.md',
      quote: 'primary data storage',
      lineNumber: 1,
    },
  ],
};

const APPROVED_RISK = {
  id: 'FIND-RISK-1',
  type: 'risk',
  title: 'Single Node Redis Failure Risk',
  summary: 'Single instance cache failure could degrade API latency.',
  category: 'Infrastructure',
  urgency: 'high',
  mitigation: 'Deploy 3-node Redis cluster before general availability.',
  status: 'VERIFIED',
  reviewStatus: 'APPROVED',
  approved: true,
  rejected: false,
  citations: [
    {
      sourceId: 'src-01',
      sourceName: 'system_architecture.md',
      quote: 'Redis for session cache',
      lineNumber: 1,
    },
  ],
};

const APPROVED_DEPENDENCY = {
  id: 'FIND-DEP-1',
  type: 'dependency',
  title: 'Node.js v20 LTS Runtime',
  summary: 'Application depends on Node.js 20+ runtime environment.',
  category: 'Runtime',
  status: 'VERIFIED',
  reviewStatus: 'APPROVED',
  approved: true,
  rejected: false,
  citations: [
    {
      sourceId: 'src-01',
      sourceName: 'system_architecture.md',
      quote: 'System uses PostgreSQL 16',
      lineNumber: 1,
    },
  ],
};

const APPROVED_QUESTION = {
  id: 'FIND-QUEST-1',
  type: 'unresolved_question',
  title: 'OAuth Provider Integration Scope',
  summary: 'Will GitHub OAuth be required in addition to Google OAuth?',
  category: 'Auth',
  status: 'VERIFIED',
  reviewStatus: 'APPROVED',
  approved: true,
  rejected: false,
  citations: [
    {
      sourceId: 'src-01',
      sourceName: 'system_architecture.md',
      quote: 'primary data storage',
      lineNumber: 1,
    },
  ],
};

const APPROVED_NEXT_ACTION = {
  id: 'FIND-ACT-1',
  type: 'next_action',
  title: 'Finalize DB Connection Pooling',
  summary: 'Review pgBouncer settings for max client connections.',
  category: 'Database',
  urgency: 'critical',
  status: 'VERIFIED',
  reviewStatus: 'APPROVED',
  approved: true,
  rejected: false,
  citations: [
    {
      sourceId: 'src-01',
      sourceName: 'system_architecture.md',
      quote: 'PostgreSQL 16',
      lineNumber: 1,
    },
  ],
};

function buildSampleReadyProject() {
  return {
    id: 'proj-handover-test',
    name: 'KnoTrail Platform Engine',
    code: 'KNT-001',
    description: 'Knowledge handover platform engine test workspace.',
    category: 'Software Engineering',
    targetExitDate: 'November 15, 2026',
    version: 'v1.0',
    lastAnalysed: 'Just now',
    executiveSummary: 'Automated synthesis of system architecture and operations.',
    lead: {
      id: 'lead-01',
      name: 'Samyak Gedam',
      role: 'Outgoing Technical Lead',
      email: 'samyak@deployordie.internal',
      outgoing: true,
      transitionNotes: 'Lead engineer.',
    },
    stakeholders: [
      {
        id: 'succ-01',
        name: 'Sanshrey Sanagar',
        role: 'Incoming Architecture Lead',
        email: 'sanshrey@deployordie.internal',
        outgoing: false,
        transitionNotes: 'Successor lead.',
      },
    ],
    sources: [MOCK_SOURCE],
    findings: [
      APPROVED_DECISION,
      UNCERTAIN_DECISION,
      APPROVED_TASK,
      APPROVED_UNASSIGNED_TASK,
      APPROVED_RISK,
      APPROVED_DEPENDENCY,
      APPROVED_QUESTION,
      APPROVED_NEXT_ACTION,
    ],
    conflicts: [],
    reviewAuditHistory: [
      {
        id: 'audit-01',
        findingId: 'FIND-DEC-1',
        action: 'APPROVED',
        timestamp: '2026-11-09T08:00:00Z',
        reviewerName: 'Samyak Gedam',
        notes: 'Verified against architecture doc',
      },
    ],
    handoverCertified: false,
    certificationHash: '',
  };
}

test('Phase G: Final Handover Generation & Delivery Test Suite', async (t) => {
  t.after(() => {
    cleanupTestDirs();
  });

  await t.test('1. Handover generation with approved findings compiles all 12 sections', async () => {
    const project = buildSampleReadyProject();
    const handover = await buildHandoverDocument(project, { signerName: 'Samyak Gedam' });

    assert.ok(handover);
    assert.strictEqual(handover.version, 'v1.0');
    assert.strictEqual(handover.certifiedBy, 'Samyak Gedam');
    assert.ok(handover.certificationHash.startsWith('SHA256:'));
    assert.strictEqual(handover.isOutdated, false);

    // Verify all 12 sections exist
    assert.ok(handover.metadata); // Section A
    assert.ok(handover.executiveSummary); // Section B
    assert.ok(handover.projectOverview); // Section C
    assert.ok(Array.isArray(handover.decisions)); // Section D
    assert.ok(Array.isArray(handover.tasks)); // Section E
    assert.ok(handover.responsibilities); // Section F
    assert.ok(Array.isArray(handover.risks)); // Section G
    assert.ok(Array.isArray(handover.dependencies)); // Section H
    assert.ok(Array.isArray(handover.unresolvedQuestions)); // Section I
    assert.ok(handover.recommendedNextActions); // Section J
    assert.ok(Array.isArray(handover.evidenceInventory)); // Section K
    assert.ok(handover.reviewHistory); // Section L

    assert.strictEqual(handover.decisions.length, 2);
    assert.strictEqual(handover.tasks.length, 2);
    assert.strictEqual(handover.risks.length, 1);
    assert.strictEqual(handover.dependencies.length, 1);
    assert.strictEqual(handover.unresolvedQuestions.length, 1);
  });

  await t.test('2. Rejected findings are strictly excluded from handover package', async () => {
    const project = buildSampleReadyProject();
    project.findings.push(REJECTED_FINDING);

    const eligible = getEligibleHandoverFindings(project.findings, project.conflicts);
    assert.strictEqual(eligible.some((f) => f.id === 'FIND-REJ-1'), false);

    const handover = await buildHandoverDocument(project, { signerName: 'Samyak' });
    assert.strictEqual(handover.decisions.some((d) => d.id === 'FIND-REJ-1'), false);
    assert.strictEqual(handover.evidenceInventory.some((e) => e.findingId === 'FIND-REJ-1'), false);
  });

  await t.test('3. Unreviewed findings are strictly excluded and block certification', async () => {
    const project = buildSampleReadyProject();
    project.findings.push(UNREVIEWED_FINDING);

    // buildHandoverDocument should throw because unreviewed findings block certification
    await assert.rejects(
      async () => {
        await buildHandoverDocument(project, { signerName: 'Samyak' });
      },
      /Handover cannot be certified/,
      'Must reject generation when unreviewed findings exist'
    );
  });

  await t.test('4. Unresolved conflicts block handover generation', async () => {
    const project = buildSampleReadyProject();
    project.conflicts = [
      {
        id: 'conf-open-01',
        findingIdA: 'FIND-DEC-1',
        findingIdB: 'FIND-DEC-2',
        claimA: 'PostgreSQL 16 selected',
        claimB: 'MySQL 8 selected',
        sourceNameA: 'docA',
        sourceNameB: 'docB',
        explanation: 'Contradiction on primary database engine',
        status: 'OPEN',
        createdAt: '2026-11-09T08:00:00Z',
      },
    ];

    await assert.rejects(
      async () => {
        await buildHandoverDocument(project, { signerName: 'Samyak' });
      },
      /Handover cannot be certified/,
      'Must reject generation when unresolved conflicts exist'
    );
  });

  await t.test('5. Missing evidence findings are excluded from eligible handover claims', async () => {
    const missingEvidenceFinding = {
      ...APPROVED_DECISION,
      id: 'FIND-MISSING-EV',
      status: 'MISSING',
      evidenceValidity: 'MISSING',
    };
    const eligible = getEligibleHandoverFindings([missingEvidenceFinding]);
    assert.strictEqual(eligible.length, 0);
  });

  await t.test('6. Accepted uncertain findings are clearly labeled with reviewer justification', async () => {
    const project = buildSampleReadyProject();
    const handover = await buildHandoverDocument(project, { signerName: 'Samyak' });

    const uncertainDec = handover.decisions.find((d) => d.id === 'FIND-DEC-2');
    assert.ok(uncertainDec);
    assert.strictEqual(uncertainDec.status, 'UNCERTAIN');

    const evItem = handover.evidenceInventory.find((e) => e.findingId === 'FIND-DEC-2');
    assert.ok(evItem);
    assert.strictEqual(evItem.isAcceptedUncertain, true);
    assert.ok(evItem.reviewerJustification?.includes('future mobile API'));
  });

  await t.test('7. Technical dependencies are cataloged in Section H', async () => {
    const project = buildSampleReadyProject();
    const handover = await buildHandoverDocument(project, { signerName: 'Samyak' });

    assert.strictEqual(handover.dependencies.length, 1);
    assert.strictEqual(handover.dependencies[0].title, 'Node.js v20 LTS Runtime');
    assert.strictEqual(handover.sectionCounts.dependencies, 1);
  });

  await t.test('8. Evidence references and exact citations are preserved', async () => {
    const project = buildSampleReadyProject();
    const handover = await buildHandoverDocument(project, { signerName: 'Samyak' });

    const postgresEv = handover.evidenceInventory.find((e) => e.findingId === 'FIND-DEC-1');
    assert.ok(postgresEv);
    assert.strictEqual(postgresEv.citations.length, 1);
    assert.strictEqual(
      postgresEv.citations[0].quote,
      'System uses PostgreSQL 16 for primary data storage'
    );
    assert.strictEqual(postgresEv.citations[0].sourceName, 'system_architecture.md');
  });

  await t.test('9. Executive summary generates accurate facts without hallucination', async () => {
    const project = buildSampleReadyProject();
    const summary = generateDeterministicExecutiveSummary(project, project.findings);

    assert.ok(summary.includes('KnoTrail Platform Engine'));
    assert.ok(summary.includes('KNT-001'));
    assert.ok(summary.includes('2 core architectural decision(s)'));
    assert.ok(summary.includes('2 pending operational task(s)'));
    assert.ok(summary.includes('elevated risk(s)'));
  });

  await t.test('10. Empty or unreviewed projects are rejected from handover certification', async () => {
    const emptyProject = {
      ...INITIAL_PROJECT_DATA,
      findings: [],
    };
    await assert.rejects(
      async () => {
        await buildHandoverDocument(emptyProject, { signerName: 'Reviewer' });
      },
      /Handover cannot be certified/
    );
  });

  await t.test('11. Handover persistence via storage repository', async () => {
    const repo = createTestRepo();
    const ws = 'ws_persist_handover_test';
    await repo.createWorkspace(ws, buildSampleReadyProject());

    const result = await repo.generateAndSaveHandover(ws, 'Samyak Lead');
    assert.ok(result.handover);
    assert.strictEqual(result.handover.certifiedBy, 'Samyak Lead');

    // Retrieve via getHandover
    const retrieved = await repo.getHandover(ws, result.handover.id);
    assert.ok(retrieved);
    assert.strictEqual(retrieved.id, result.handover.id);
    assert.strictEqual(retrieved.metadata.projectName, 'KnoTrail Platform Engine');
  });

  await t.test('12. Handover versioning increments correctly (v1.0 -> v1.1)', async () => {
    const repo = createTestRepo();
    const ws = 'ws_version_test';
    await repo.createWorkspace(ws, buildSampleReadyProject());

    // First generation -> v1.0
    const v1 = await repo.generateAndSaveHandover(ws, 'Samyak');
    assert.strictEqual(v1.handover.version, 'v1.0');

    // Second generation (regenerate: true) -> v1.1
    const v2 = await repo.generateAndSaveHandover(ws, 'Samyak', { regenerate: true });
    assert.strictEqual(v2.handover.version, 'v1.1');
  });

  await t.test('13. Previous handover versions are preserved in workspace history', async () => {
    const repo = createTestRepo();
    const ws = 'ws_history_test';
    await repo.createWorkspace(ws, buildSampleReadyProject());

    await repo.generateAndSaveHandover(ws, 'Samyak');
    await repo.generateAndSaveHandover(ws, 'Samyak', { regenerate: true });

    const history = await repo.getHandoverHistory(ws);
    assert.strictEqual(history.length, 2);
    assert.strictEqual(history[0].version, 'v1.0');
    assert.strictEqual(history[1].version, 'v1.1');
  });

  await t.test('14. Handover invalidation detects project changes after certification', async () => {
    const repo = createTestRepo();
    const ws = 'ws_drift_test';
    await repo.createWorkspace(ws, buildSampleReadyProject());

    const gen = await repo.generateAndSaveHandover(ws, 'Samyak');
    assert.strictEqual(gen.handover.isOutdated, false);

    // Mutate a finding title in project and saveProject
    const proj = await repo.getWorkspace(ws);
    proj.findings[0].title = 'Adopt PostgreSQL 16 (Updated Post-Cert)';
    await repo.saveProject(ws, proj);

    // Check project currentHandover is flagged outdated
    const updatedProj = await repo.getWorkspace(ws);
    assert.strictEqual(updatedProj.currentHandover?.isOutdated, true);
    assert.ok(updatedProj.currentHandover?.outdatedReason?.includes('modified after handover'));
  });

  await t.test('15. PDF export formatting produces complete A4 print layout', async () => {
    const project = buildSampleReadyProject();
    const handover = await buildHandoverDocument(project, { signerName: 'Samyak' });
    const html = generatePrintableHtml(handover);

    assert.ok(html.includes('@media print'));
    assert.ok(html.includes('KnoTrail Platform Engine'));
    assert.ok(html.includes('KNOTRAIL HANDOVER DOSSIER'));
    assert.ok(html.includes('1. Executive Summary'));
    assert.ok(html.includes('3. Important Architectural Decisions'));
    assert.ok(html.includes('Review &amp; Certification Attestation'));
    assert.ok(html.includes(handover.certifiedBy));
  });

  await t.test('16. Markdown export contains Table of Contents and all 12 sections', async () => {
    const project = buildSampleReadyProject();
    const handover = await buildHandoverDocument(project, { signerName: 'Samyak' });
    const md = exportHandoverMarkdown(handover);

    assert.ok(md.includes('# KnoTrail Platform Engine — Engineering Handover Dossier'));
    assert.ok(md.includes('## Table of Contents'));
    assert.ok(md.includes('## 1. Executive Summary'));
    assert.ok(md.includes('## 2. Project Overview'));
    assert.ok(md.includes('## 3. Important Architectural Decisions'));
    assert.ok(md.includes('## 4. Pending Operational Tasks'));
    assert.ok(md.includes('## 5. Responsibilities & Ownership'));
    assert.ok(md.includes('## 6. Risks & Mitigations'));
    assert.ok(md.includes('## 7. Technical Dependencies & Integrations'));
    assert.ok(md.includes('## 8. Unresolved Questions'));
    assert.ok(md.includes('## 9. Recommended Next Actions'));
    assert.ok(md.includes('## 10. Evidence & Source References'));
    assert.ok(md.includes('## 11. Human Review & Audit History'));
    assert.ok(md.includes('Adopt PostgreSQL 16 as Primary DB'));
  });

  await t.test('17. JSON export schema has complete structure and valid typed fields', async () => {
    const project = buildSampleReadyProject();
    const handover = await buildHandoverDocument(project, { signerName: 'Samyak' });
    const jsonStr = exportHandoverJson(handover);

    assert.strictEqual(typeof jsonStr, 'string');
    const json = JSON.parse(jsonStr);
    assert.strictEqual(typeof json, 'object');
    assert.strictEqual(json.version, 'v1.0');
    assert.strictEqual(json.metadata.projectName, 'KnoTrail Platform Engine');
    assert.strictEqual(json.sectionCounts.decisions, 2);
    assert.strictEqual(json.sectionCounts.tasks, 2);
    assert.strictEqual(json.sectionCounts.risks, 1);
    assert.strictEqual(json.sectionCounts.dependencies, 1);
  });

  await t.test('18. Export parity: Markdown and JSON contain identical section counts', async () => {
    const project = buildSampleReadyProject();
    const handover = await buildHandoverDocument(project, { signerName: 'Samyak' });
    const md = exportHandoverMarkdown(handover);
    const json = JSON.parse(exportHandoverJson(handover));

    assert.strictEqual(json.decisions.length, handover.decisions.length);
    assert.strictEqual(json.tasks.length, handover.tasks.length);
    assert.strictEqual(json.risks.length, handover.risks.length);
    assert.strictEqual(json.dependencies.length, handover.dependencies.length);
    assert.strictEqual(json.unresolvedQuestions.length, handover.unresolvedQuestions.length);

    // Verify Markdown mentions each title present in JSON
    for (const dec of json.decisions) {
      assert.ok(md.includes(dec.title));
    }
    for (const task of json.tasks) {
      assert.ok(md.includes(task.title));
    }
  });

  await t.test('19. Workspace isolation prevents cross-workspace handover access', async () => {
    const repo = createTestRepo();
    const wsA = 'ws_iso_a';
    const wsB = 'ws_iso_b';

    await repo.createWorkspace(wsA, buildSampleReadyProject());
    await repo.createWorkspace(wsB, buildSampleReadyProject());

    const genA = await repo.generateAndSaveHandover(wsA, 'Lead A');
    const retrievedFromB = await repo.getHandover(wsB, genA.handover.id);
    assert.strictEqual(retrievedFromB, null);
  });

  await t.test('20. Secure share-link access permits zero-auth read-only retrieval', async () => {
    const repo = createTestRepo();
    const ws = 'ws_share_test';
    await repo.createWorkspace(ws, buildSampleReadyProject());
    const gen = await repo.generateAndSaveHandover(ws, 'Samyak');

    const share = await repo.createShareToken(ws, gen.handover.id);
    assert.ok(share.token.startsWith('kt_share_'));
    assert.strictEqual(share.isActive, true);

    const publicResult = await repo.getSharedHandover(share.token);
    assert.ok(publicResult.handover);
    assert.strictEqual(publicResult.handover.id, gen.handover.id);
    assert.strictEqual(publicResult.projectName, 'KnoTrail Platform Engine');
  });

  await t.test('21. Share-link revocation prevents subsequent access', async () => {
    const repo = createTestRepo();
    const ws = 'ws_revoke_test';
    await repo.createWorkspace(ws, buildSampleReadyProject());
    const gen = await repo.generateAndSaveHandover(ws, 'Samyak');

    const share = await repo.createShareToken(ws, gen.handover.id);
    assert.strictEqual(share.isActive, true);

    // Revoke share token
    const revoked = await repo.revokeShareToken(ws, share.token);
    assert.strictEqual(revoked, true);

    // Access after revocation should fail
    await assert.rejects(
      async () => {
        await repo.getSharedHandover(share.token);
      },
      /revoked/i
    );
  });
});
