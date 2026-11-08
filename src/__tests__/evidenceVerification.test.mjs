import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  verifyFindingEvidence,
  verifyClaimSupport,
  evaluateDeterministicContradiction,
  evaluateGeminiContradiction,
  runFullVerification,
  deriveCompositeStatus,
  parseDateFromText,
} from '../server/verification/verifier.ts';
import { DurableFileRepository } from '../server/db/storage.ts';
import { checkHandoverBlockStatus } from '../lib/handoverFilter.ts';

const TEST_STORAGE_DIR = path.join(process.cwd(), '.data', 'test-verification-workspaces');
const TEST_UPLOADS_DIR = path.join(process.cwd(), '.data', 'test-verification-uploads');

// Cleanup helper
function cleanupTestStorage() {
  if (fs.existsSync(TEST_STORAGE_DIR)) {
    fs.rmSync(TEST_STORAGE_DIR, { recursive: true, force: true });
  }
  if (fs.existsSync(TEST_UPLOADS_DIR)) {
    fs.rmSync(TEST_UPLOADS_DIR, { recursive: true, force: true });
  }
}

// Sample test source documents
const SOURCE_A = {
  id: 'src-arch-doc',
  name: 'architecture_2026.md',
  type: 'docs',
  status: 'connected',
  lastSync: 'Just now',
  recordCount: 150,
  icon: 'description',
  description: 'Architecture standard ratified for the 2026 production release.',
  privacyLevel: 'LOCAL_READ_ONLY',
  isUploaded: true,
  documentData: {
    fileFormat: 'md',
    mimeType: 'text/markdown',
    fileSizeBytes: 2048,
    fileSizeFormatted: '2.0 KB',
    contentHash: 'hash-arch-2026',
    extractedText: `# Architecture Specification (Ratified: 2026-11-08)
We have selected PostgreSQL 16 as the primary relational database for the platform.
The primary webhook receiver integrates with PagerDuty on port 5433 for automated alerting.
All authentication tokens must use 256-bit AES GCM encryption.
Task: Marcus Vance must complete the KMS key rotation script before November 12.
`,
    lineCount: 10,
    pageCount: 1,
  },
};

const SOURCE_B = {
  id: 'src-legacy-rfc',
  name: 'legacy_rfc_2024.txt',
  type: 'docs',
  status: 'connected',
  lastSync: '1 year ago',
  recordCount: 80,
  icon: 'article',
  description: 'Legacy RFC document drafted in early 2024.',
  privacyLevel: 'LOCAL_READ_ONLY',
  isUploaded: true,
  documentData: {
    fileFormat: 'txt',
    mimeType: 'text/plain',
    fileSizeBytes: 1024,
    fileSizeFormatted: '1.0 KB',
    contentHash: 'hash-legacy-2024',
    extractedText: `Draft Proposal (Dated: 2024-03-15)
Our preliminary evaluation proposes MySQL as the primary database for legacy billing.
The primary webhook receiver runs on port 5432.
`,
    lineCount: 5,
    pageCount: 1,
  },
};

const SOURCE_C_PDF = {
  id: 'src-ops-runbook',
  name: 'operations_runbook.pdf',
  type: 'docs',
  status: 'connected',
  lastSync: 'Just now',
  recordCount: 300,
  icon: 'picture_as_pdf',
  description: 'Multi-page operations runbook.',
  privacyLevel: 'LOCAL_READ_ONLY',
  isUploaded: true,
  documentData: {
    fileFormat: 'pdf',
    mimeType: 'application/pdf',
    fileSizeBytes: 50000,
    fileSizeFormatted: '48.8 KB',
    contentHash: 'hash-ops-pdf',
    extractedText: `Page 1: Deployment checklist.\nPage 2: Database backup procedures.\nPage 3: Disaster recovery failover scripts.`,
    lineCount: 30,
    pageCount: 3,
  },
};

test('Phase E: Advanced Evidence Verification & Conflict Detection Suite', async (t) => {
  cleanupTestStorage();

  await t.test('1. Exact quotation matching gives MATCHED evidence validity', () => {
    const finding = {
      id: 'FIND-01',
      type: 'decision',
      title: 'PostgreSQL 16 as Primary Database',
      summary: 'PostgreSQL 16 selected as primary relational database.',
      category: 'Database',
      urgency: 'high',
      owner: 'Architecture Team',
      createdDate: '2026-11-08',
      confidence: 95,
      approved: false,
      status: 'VERIFIED',
      citations: [
        {
          id: 'CIT-01',
          sourceId: 'src-arch-doc',
          sourceName: 'architecture_2026.md',
          sourceType: 'docs',
          file: 'architecture_2026.md',
          lineRange: 'Line 2',
          author: 'Architecture Team',
          timestamp: '2026-11-08',
          snippet: 'We have selected PostgreSQL 16 as the primary relational database for the platform.',
          contentHash: 'hash-01',
          clearanceTier: 'PUBLIC',
          confidence: 95,
        },
      ],
    };

    const res = verifyFindingEvidence(finding, [SOURCE_A]);
    assert.strictEqual(res.validity, 'MATCHED');
    assert.strictEqual(res.validCoordinates, true);
    assert.strictEqual(res.issues.length, 0);
  });

  await t.test('2. Incorrect quotation detection flags MISMATCHED evidence validity', () => {
    const finding = {
      id: 'FIND-02',
      type: 'decision',
      title: 'Cassandra Clustering Decision',
      summary: 'Adopt Apache Cassandra for distributed time-series caching.',
      category: 'Database',
      urgency: 'medium',
      owner: 'Data Team',
      createdDate: '2026-11-08',
      confidence: 80,
      approved: false,
      status: 'VERIFIED',
      citations: [
        {
          id: 'CIT-02',
          sourceId: 'src-arch-doc',
          sourceName: 'architecture_2026.md',
          sourceType: 'docs',
          file: 'architecture_2026.md',
          lineRange: 'Line 15',
          author: 'Data Team',
          timestamp: '2026-11-08',
          snippet: 'We have completely standardized on Apache Cassandra for all time-series nodes.',
          contentHash: 'hash-02',
          clearanceTier: 'PUBLIC',
          confidence: 80,
        },
      ],
    };

    const res = verifyFindingEvidence(finding, [SOURCE_A]);
    assert.strictEqual(res.validity, 'MISMATCHED');
    assert.ok(res.issues.some((i) => i.includes('Supporting quote does not appear in the source text')));
  });

  await t.test('3. Missing supporting evidence flags MISSING validity', () => {
    const finding = {
      id: 'FIND-03',
      type: 'task',
      title: 'Ungrounded Task Finding',
      summary: 'Task without any cited quotation.',
      category: 'General',
      urgency: 'low',
      owner: 'Unassigned',
      createdDate: '2026-11-08',
      confidence: 40,
      approved: false,
      status: 'MISSING',
      citations: [],
    };

    const res = verifyFindingEvidence(finding, [SOURCE_A]);
    assert.strictEqual(res.validity, 'MISSING');
    assert.strictEqual(res.validCoordinates, false);
  });

  await t.test('4. Invalid page reference out of bounds is flagged as invalid coordinate', () => {
    const finding = {
      id: 'FIND-04',
      type: 'decision',
      title: 'Disaster Recovery Runbook',
      summary: 'Failover procedure documented.',
      category: 'Runbook',
      urgency: 'high',
      owner: 'DevOps',
      createdDate: '2026-11-08',
      confidence: 85,
      approved: false,
      status: 'VERIFIED',
      citations: [
        {
          id: 'CIT-04',
          sourceId: 'src-ops-runbook',
          sourceName: 'operations_runbook.pdf',
          sourceType: 'docs',
          file: 'operations_runbook.pdf',
          lineRange: 'Page 99', // SOURCE_C_PDF only has 3 pages
          author: 'DevOps',
          timestamp: '2026-11-08',
          snippet: 'Disaster recovery failover scripts.',
          contentHash: 'hash-04',
          clearanceTier: 'PUBLIC',
          confidence: 85,
        },
      ],
    };

    const res = verifyFindingEvidence(finding, [SOURCE_C_PDF]);
    assert.strictEqual(res.validCoordinates, false);
    assert.strictEqual(res.validity, 'MISMATCHED');
    assert.ok(res.issues.some((i) => i.includes('only has 3 page(s)')));
  });

  await t.test('5. Invalid line reference out of bounds is flagged as invalid coordinate', () => {
    const finding = {
      id: 'FIND-05',
      type: 'task',
      title: 'KMS Key Rotation',
      summary: 'Complete KMS rotation.',
      category: 'Security',
      urgency: 'high',
      owner: 'Security Lead',
      createdDate: '2026-11-08',
      confidence: 90,
      approved: false,
      status: 'VERIFIED',
      citations: [
        {
          id: 'CIT-05',
          sourceId: 'src-arch-doc',
          sourceName: 'architecture_2026.md',
          sourceType: 'docs',
          file: 'architecture_2026.md',
          lineRange: 'Lines 500-510', // SOURCE_A only has 10 lines
          author: 'Security Lead',
          timestamp: '2026-11-08',
          snippet: 'Marcus Vance must complete the KMS key rotation script before November 12.',
          contentHash: 'hash-05',
          clearanceTier: 'PUBLIC',
          confidence: 90,
        },
      ],
    };

    const res = verifyFindingEvidence(finding, [SOURCE_A]);
    assert.strictEqual(res.validCoordinates, false);
    assert.strictEqual(res.validity, 'MISMATCHED');
    assert.ok(res.issues.some((i) => i.includes('has 10 total lines')));
  });

  await t.test('6. Genuinely contradictory claims across documents are detected', () => {
    const findingA = {
      id: 'FIND-DB-A',
      type: 'decision',
      title: 'PostgreSQL 16 as Primary Database',
      summary: 'PostgreSQL 16 is selected as the primary relational database.',
      category: 'Database',
      urgency: 'critical',
      owner: 'Arch Lead',
      createdDate: '2026-11-08',
      confidence: 95,
      approved: false,
      status: 'VERIFIED',
      citations: [{
        id: 'CIT-DB-A',
        sourceId: 'src-arch-doc',
        sourceName: 'architecture_2026.md',
        sourceType: 'docs',
        file: 'architecture_2026.md',
        lineRange: 'Line 2',
        author: 'Lead',
        timestamp: '2026-11-08',
        snippet: 'We have selected PostgreSQL 16 as the primary relational database for the platform.',
        contentHash: 'h-a',
        clearanceTier: 'PUBLIC',
        confidence: 95,
      }],
    };

    const findingB = {
      id: 'FIND-DB-B',
      type: 'decision',
      title: 'MySQL as Primary Database',
      summary: 'Our evaluation proposes MySQL as the primary database for legacy billing.',
      category: 'Database',
      urgency: 'critical',
      owner: 'Legacy Team',
      createdDate: '2024-03-15',
      confidence: 85,
      approved: false,
      status: 'VERIFIED',
      citations: [{
        id: 'CIT-DB-B',
        sourceId: 'src-legacy-rfc',
        sourceName: 'legacy_rfc_2024.txt',
        sourceType: 'docs',
        file: 'legacy_rfc_2024.txt',
        lineRange: 'Line 2',
        author: 'Lead',
        timestamp: '2024-03-15',
        snippet: 'Our preliminary evaluation proposes MySQL as the primary database for legacy billing.',
        contentHash: 'h-b',
        clearanceTier: 'PUBLIC',
        confidence: 85,
      }],
    };

    const contradiction = evaluateDeterministicContradiction(findingA, findingB);
    assert.ok(contradiction);
    assert.strictEqual(contradiction.isConflict, true);
    assert.strictEqual(contradiction.category, 'architecture');
    assert.ok(contradiction.explanation.includes('PostgreSQL') || contradiction.explanation.includes('postgresql'));
  });

  await t.test('7. Equivalent statements in different wording do NOT produce contradiction', () => {
    const findingA = {
      id: 'FIND-EQ-A',
      type: 'decision',
      title: 'AES-256 GCM Token Encryption',
      summary: 'All authentication tokens must use 256-bit AES GCM encryption.',
      category: 'Security',
      urgency: 'high',
      owner: 'Security Lead',
      createdDate: '2026-11-08',
      confidence: 95,
      approved: false,
      status: 'VERIFIED',
      citations: [],
    };

    const findingB = {
      id: 'FIND-EQ-B',
      type: 'decision',
      title: 'Standardize on AES-256 for Auth',
      summary: 'Encrypt auth bearer tokens using AES GCM 256 mode.',
      category: 'Security',
      urgency: 'high',
      owner: 'Security Lead',
      createdDate: '2026-11-08',
      confidence: 92,
      approved: false,
      status: 'VERIFIED',
      citations: [],
    };

    const contradiction = evaluateDeterministicContradiction(findingA, findingB);
    assert.strictEqual(contradiction, null);
  });

  await t.test('8. Different statements covering separate facets do NOT produce contradiction', () => {
    const findingA = {
      id: 'FIND-DIFF-A',
      type: 'decision',
      title: 'PostgreSQL Primary Database',
      summary: 'PostgreSQL 16 selected as relational DB.',
      category: 'Database',
      urgency: 'high',
      owner: 'DB Lead',
      createdDate: '2026-11-08',
      confidence: 95,
      approved: false,
      status: 'VERIFIED',
      citations: [],
    };

    const findingB = {
      id: 'FIND-DIFF-B',
      type: 'task',
      title: 'KMS Key Rotation Script',
      summary: 'Marcus Vance must complete the KMS key rotation script before November 12.',
      category: 'Security',
      urgency: 'high',
      owner: 'Marcus Vance',
      createdDate: '2026-11-08',
      confidence: 95,
      approved: false,
      status: 'VERIFIED',
      citations: [],
    };

    const contradiction = evaluateDeterministicContradiction(findingA, findingB);
    assert.strictEqual(contradiction, null);
  });

  await t.test('9. Historical context is parsed accurately from date strings', () => {
    const d1 = parseDateFromText('Draft Proposal (Dated: 2024-03-15)');
    assert.ok(d1);
    assert.strictEqual(d1.getFullYear(), 2024);
    assert.strictEqual(d1.getMonth(), 2); // March is 0-indexed month 2

    const d2 = parseDateFromText('Ratified: November 08, 2026');
    assert.ok(d2);
    assert.strictEqual(d2.getFullYear(), 2026);
    assert.strictEqual(d2.getMonth(), 10); // November is month 10
  });

  await t.test('10. Potentially outdated information: older superseded finding flagged POSSIBLY_OUTDATED', async () => {
    const findingA = {
      id: 'FIND-NEW-01',
      type: 'decision',
      title: 'PostgreSQL 16 as Primary Database',
      summary: 'PostgreSQL 16 selected as primary DB.',
      category: 'Database',
      urgency: 'high',
      owner: 'Lead',
      createdDate: '2026-11-08',
      confidence: 95,
      approved: false,
      status: 'VERIFIED',
      citations: [{
        id: 'CIT-NEW',
        sourceId: 'src-arch-doc',
        sourceName: 'architecture_2026.md',
        sourceType: 'docs',
        file: 'architecture_2026.md',
        lineRange: 'Line 2',
        author: 'Lead',
        timestamp: '2026-11-08',
        snippet: 'We have selected PostgreSQL 16 as the primary relational database for the platform.',
        contentHash: 'h-1',
        clearanceTier: 'PUBLIC',
        confidence: 95,
      }],
    };

    const findingB = {
      id: 'FIND-OLD-02',
      type: 'decision',
      title: 'MySQL as Primary Database',
      summary: 'MySQL proposed as primary DB.',
      category: 'Database',
      urgency: 'high',
      owner: 'Lead',
      createdDate: '2024-03-15',
      confidence: 85,
      approved: false,
      status: 'VERIFIED',
      citations: [{
        id: 'CIT-OLD',
        sourceId: 'src-legacy-rfc',
        sourceName: 'legacy_rfc_2024.txt',
        sourceType: 'docs',
        file: 'legacy_rfc_2024.txt',
        lineRange: 'Line 2',
        author: 'Lead',
        timestamp: '2024-03-15',
        snippet: 'Our preliminary evaluation proposes MySQL as the primary database for legacy billing.',
        contentHash: 'h-2',
        clearanceTier: 'PUBLIC',
        confidence: 85,
      }],
    };

    const result = await runFullVerification([findingA, findingB], [SOURCE_A, SOURCE_B], {
      workspaceId: 'test-ws-temporal',
      useAi: false,
    });

    const verifiedOlder = result.verifiedFindings.find((f) => f.id === 'FIND-OLD-02');
    assert.ok(verifiedOlder);
    assert.strictEqual(verifiedOlder.isTemporalSuperseded, true);
    assert.strictEqual(verifiedOlder.claimStatus, 'POSSIBLY_OUTDATED');
    assert.strictEqual(verifiedOlder.status, 'UNCERTAIN');

    assert.strictEqual(result.conflicts.length, 1);
    assert.strictEqual(result.conflicts[0].isTemporalSuperseded, true);
    assert.strictEqual(result.conflicts[0].supersededFindingId, 'FIND-OLD-02');
  });

  await t.test('11. Unsupported AI conclusion flagged as UNCERTAIN', () => {
    const finding = {
      id: 'FIND-SPECULATIVE',
      type: 'decision',
      title: 'Complete Kubernetes Cluster Migration to GCP Anthos',
      summary: 'All nodes will be migrated to Google Cloud Anthos by end of quarter.',
      category: 'Infrastructure',
      urgency: 'high',
      owner: 'DevOps',
      createdDate: '2026-11-08',
      confidence: 70,
      approved: false,
      status: 'VERIFIED',
      citations: [],
    };

    const quote = 'The primary webhook receiver integrates with PagerDuty on port 5433 for automated alerting.';
    const res = verifyClaimSupport(finding, quote);
    assert.strictEqual(res.status, 'UNCERTAIN');
    assert.ok(res.explanation.includes('Unsupported conclusion'));
  });

  await t.test('12. Invalid source ownership flags SOURCE_UNAVAILABLE', () => {
    const finding = {
      id: 'FIND-ALIEN-SOURCE',
      type: 'decision',
      title: 'Decoupled Microservices Pattern',
      summary: 'Split monolith into decoupled services.',
      category: 'Architecture',
      urgency: 'medium',
      owner: 'Unknown',
      createdDate: '2026-11-08',
      confidence: 90,
      approved: false,
      status: 'VERIFIED',
      citations: [
        {
          id: 'CIT-ALIEN',
          sourceId: 'src-alien-workspace-999', // Does not exist in active workspace
          sourceName: 'confidential_corp_plan.pdf',
          sourceType: 'docs',
          file: 'confidential_corp_plan.pdf',
          lineRange: 'Line 1',
          author: 'Unknown',
          timestamp: '2026-11-08',
          snippet: 'Split monolith into decoupled services.',
          contentHash: 'hash-alien',
          clearanceTier: 'CONFIDENTIAL',
          confidence: 90,
        },
      ],
    };

    const res = verifyFindingEvidence(finding, [SOURCE_A]);
    assert.strictEqual(res.validity, 'SOURCE_UNAVAILABLE');
    assert.strictEqual(res.sourceFound, false);
  });

  await t.test('13. Cross-workspace isolation preserves separate conflicts & findings', async () => {
    const repo = new DurableFileRepository(TEST_STORAGE_DIR, TEST_UPLOADS_DIR);
    const ws1 = 'ws_isolation_alpha';
    const ws2 = 'ws_isolation_beta';

    await repo.createWorkspace(ws1);
    await repo.createWorkspace(ws2);

    const conflict1 = {
      id: 'CONF-WS1-01',
      workspaceId: ws1,
      findingIdA: 'F1',
      findingIdB: 'F2',
      claimA: 'PostgreSQL',
      claimB: 'MySQL',
      sourceIdA: 'S1',
      sourceNameA: 'Doc A',
      sourceIdB: 'S2',
      sourceNameB: 'Doc B',
      quoteA: 'PostgreSQL',
      locationA: 'L1',
      quoteB: 'MySQL',
      locationB: 'L2',
      conflictCategory: 'architecture',
      explanation: 'DB conflict',
      severity: 'critical',
      status: 'OPEN',
    };

    await repo.saveConflicts(ws1, [conflict1]);

    const project1 = await repo.getWorkspace(ws1);
    const project2 = await repo.getWorkspace(ws2);

    assert.strictEqual(project1.conflicts.length, 1);
    assert.strictEqual(project1.conflicts[0].id, 'CONF-WS1-01');
    assert.strictEqual(project2.conflicts.length, 0);
  });

  await t.test('14. Conflict persistence survives fresh repository instantiation', async () => {
    const ws = 'ws_persistence_check';
    const repoA = new DurableFileRepository(TEST_STORAGE_DIR, TEST_UPLOADS_DIR);
    await repoA.createWorkspace(ws);

    const conflict = {
      id: 'CONF-PERSIST-01',
      workspaceId: ws,
      findingIdA: 'FA',
      findingIdB: 'FB',
      claimA: 'Port 5432',
      claimB: 'Port 5433',
      sourceIdA: 'SA',
      sourceNameA: 'RFC',
      sourceIdB: 'SB',
      sourceNameB: 'Prod Config',
      quoteA: 'port 5432',
      locationA: 'L1',
      quoteB: 'port 5433',
      locationB: 'L2',
      conflictCategory: 'architecture',
      explanation: 'Port mismatch',
      severity: 'high',
      status: 'OPEN',
    };

    await repoA.saveConflicts(ws, [conflict]);

    // Instantiate a separate repo instance reading from disk
    const repoB = new DurableFileRepository(TEST_STORAGE_DIR, TEST_UPLOADS_DIR);
    const loaded = await repoB.getWorkspace(ws);

    assert.ok(loaded);
    assert.strictEqual(loaded.conflicts.length, 1);
    assert.strictEqual(loaded.conflicts[0].id, 'CONF-PERSIST-01');
    assert.strictEqual(loaded.conflicts[0].status, 'OPEN');
  });

  await t.test('15. Human conflict resolution updates status to RESOLVED and updates findings', async () => {
    const ws = 'ws_resolve_check';
    const repo = new DurableFileRepository(TEST_STORAGE_DIR, TEST_UPLOADS_DIR);
    const initialProject = {
      id: 'proj-res-01',
      name: 'Resolve Test',
      code: 'RES-01',
      description: 'Testing human conflict resolution.',
      targetExitDate: '2026-11-30',
      version: 'v1.0',
      lastAnalysed: 'Never',
      handoverCertified: false,
      certificationHash: '',
      lead: { id: 'l1', name: 'Reviewer', role: 'Lead', email: 'rev@test.com', avatar: '', outgoing: true, transitionNotes: '' },
      stakeholders: [],
      sources: [SOURCE_A, SOURCE_B],
      findings: [
        {
          id: 'FA-PG',
          type: 'decision',
          title: 'PostgreSQL 16 Primary DB',
          summary: 'Use PostgreSQL 16.',
          category: 'Database',
          urgency: 'high',
          owner: 'Lead',
          createdDate: '2026-11-08',
          confidence: 95,
          approved: false,
          status: 'CONFLICTING',
          citations: [],
        },
        {
          id: 'FB-MYSQL',
          type: 'decision',
          title: 'MySQL Primary DB',
          summary: 'Use MySQL.',
          category: 'Database',
          urgency: 'high',
          owner: 'Lead',
          createdDate: '2024-03-15',
          confidence: 80,
          approved: false,
          status: 'CONFLICTING',
          citations: [],
        },
      ],
      conflicts: [
        {
          id: 'CONF-RES-101',
          workspaceId: ws,
          findingIdA: 'FA-PG',
          findingIdB: 'FB-MYSQL',
          claimA: 'PostgreSQL 16 Primary DB',
          claimB: 'MySQL Primary DB',
          sourceIdA: 'src-arch-doc',
          sourceNameA: 'architecture_2026.md',
          sourceIdB: 'src-legacy-rfc',
          sourceNameB: 'legacy_rfc_2024.txt',
          quoteA: 'PostgreSQL 16',
          locationA: 'Line 2',
          quoteB: 'MySQL',
          locationB: 'Line 2',
          conflictCategory: 'architecture',
          explanation: 'Database technology contradiction',
          severity: 'critical',
          status: 'OPEN',
        },
      ],
    };

    await repo.createWorkspace(ws, initialProject);

    // Resolve choosing FA-PG as the prevailing architecture decision
    const resolvedProject = await repo.resolveConflictRecord(
      ws,
      'CONF-RES-101',
      'FA-PG',
      'PostgreSQL 16 is ratified for 2026. MySQL legacy RFC is deprecated.',
      'Samyak Gedam'
    );

    assert.strictEqual(resolvedProject.conflicts[0].status, 'RESOLVED');
    assert.strictEqual(resolvedProject.conflicts[0].resolution.resolvedBy, 'Samyak Gedam');
    assert.strictEqual(resolvedProject.conflicts[0].resolution.chosenFindingId, 'FA-PG');

    const chosen = resolvedProject.findings.find((f) => f.id === 'FA-PG');
    const rejected = resolvedProject.findings.find((f) => f.id === 'FB-MYSQL');

    assert.strictEqual(chosen.approved, true);
    assert.strictEqual(chosen.rejected, false);
    assert.strictEqual(chosen.status, 'VERIFIED');

    assert.strictEqual(rejected.approved, false);
    assert.strictEqual(rejected.rejected, true);
  });

  await t.test('16. Unresolved conflict blocks handover certification', async () => {
    const ws = 'ws_block_gate_check';
    const repo = new DurableFileRepository(TEST_STORAGE_DIR, TEST_UPLOADS_DIR);

    const projectWithConflict = {
      id: 'proj-gate-01',
      name: 'Gate Test',
      code: 'GATE-01',
      description: 'Testing handover block gate with open conflict.',
      targetExitDate: '2026-11-30',
      version: 'v1.0',
      lastAnalysed: 'Never',
      handoverCertified: false,
      certificationHash: '',
      lead: { id: 'l1', name: 'Reviewer', role: 'Lead', email: 'rev@test.com', avatar: '', outgoing: true, transitionNotes: '' },
      stakeholders: [],
      sources: [],
      findings: [
        {
          id: 'F-APPROVED',
          type: 'decision',
          title: 'Decoupled Service Architecture',
          summary: 'Use decoupled services.',
          category: 'Architecture',
          urgency: 'medium',
          owner: 'Lead',
          createdDate: '2026-11-08',
          confidence: 90,
          approved: true,
          status: 'VERIFIED',
          citations: [],
        },
      ],
      conflicts: [
        {
          id: 'CONF-OPEN-01',
          workspaceId: ws,
          findingIdA: 'F1',
          findingIdB: 'F2',
          claimA: 'Port 5432',
          claimB: 'Port 5433',
          sourceIdA: 'S1',
          sourceNameA: 'Doc 1',
          sourceIdB: 'S2',
          sourceNameB: 'Doc 2',
          quoteA: '5432',
          locationA: 'L1',
          quoteB: '5433',
          locationB: 'L2',
          conflictCategory: 'architecture',
          explanation: 'Port discrepancy',
          severity: 'high',
          status: 'OPEN',
        },
      ],
    };

    await repo.createWorkspace(ws, projectWithConflict);

    // Verify checkHandoverBlockStatus blocks
    const status = checkHandoverBlockStatus(projectWithConflict.findings, false, projectWithConflict.conflicts);
    assert.strictEqual(status.isBlocked, true);
    assert.strictEqual(status.canCertify, false);
    assert.strictEqual(status.unresolvedConflictsCount, 1);

    // Certify must throw error
    await assert.rejects(
      async () => {
        await repo.certifyHandover(ws, 'Lead Signer');
      },
      (err) => {
        return err.message.includes('Handover cannot be certified: 1 unresolved conflict(s)');
      }
    );
  });

  await t.test('17. Offline / API failure fallback maintains deterministic verification', async () => {
    // When useAi is false (or API fails), verification engine still flags deterministic conflicts
    const findingA = {
      id: 'FIND-OFFLINE-A',
      type: 'decision',
      title: 'PostgreSQL Relational DB',
      summary: 'Main relational DB is PostgreSQL.',
      category: 'Database',
      urgency: 'high',
      owner: 'Lead',
      createdDate: '2026-11-08',
      confidence: 95,
      approved: false,
      status: 'VERIFIED',
      citations: [{
        id: 'C-A',
        sourceId: 'src-arch-doc',
        sourceName: 'architecture_2026.md',
        sourceType: 'docs',
        file: 'architecture_2026.md',
        lineRange: 'Line 2',
        author: 'Lead',
        timestamp: '2026-11-08',
        snippet: 'We have selected PostgreSQL 16 as the primary relational database for the platform.',
        contentHash: 'h-a',
        clearanceTier: 'PUBLIC',
        confidence: 95,
      }],
    };

    const findingB = {
      id: 'FIND-OFFLINE-B',
      type: 'decision',
      title: 'MySQL Relational DB',
      summary: 'Main relational DB is MySQL.',
      category: 'Database',
      urgency: 'high',
      owner: 'Lead',
      createdDate: '2026-11-08',
      confidence: 85,
      approved: false,
      status: 'VERIFIED',
      citations: [{
        id: 'C-B',
        sourceId: 'src-legacy-rfc',
        sourceName: 'legacy_rfc_2024.txt',
        sourceType: 'docs',
        file: 'legacy_rfc_2024.txt',
        lineRange: 'Line 2',
        author: 'Lead',
        timestamp: '2026-11-08',
        snippet: 'Our preliminary evaluation proposes MySQL as the primary database for legacy billing.',
        contentHash: 'h-b',
        clearanceTier: 'PUBLIC',
        confidence: 85,
      }],
    };

    const result = await runFullVerification([findingA, findingB], [SOURCE_A, SOURCE_B], {
      workspaceId: 'test-offline-ws',
      useAi: false, // Forces offline deterministic path
    });

    assert.strictEqual(result.conflicts.length, 1);
    assert.strictEqual(result.conflicts[0].conflictCategory, 'architecture');
    assert.strictEqual(result.summary.conflictingCount, 2);
  });

  await t.test('18. Duplicate conflict prevention: multiple runs update idempotently', async () => {
    const findingA = {
      id: 'FIND-IDEMP-A',
      type: 'decision',
      title: 'PostgreSQL Relational DB',
      summary: 'Main relational DB is PostgreSQL.',
      category: 'Database',
      urgency: 'high',
      owner: 'Lead',
      createdDate: '2026-11-08',
      confidence: 95,
      approved: false,
      status: 'VERIFIED',
      citations: [{
        id: 'C-A',
        sourceId: 'src-arch-doc',
        sourceName: 'architecture_2026.md',
        sourceType: 'docs',
        file: 'architecture_2026.md',
        lineRange: 'Line 2',
        author: 'Lead',
        timestamp: '2026-11-08',
        snippet: 'We have selected PostgreSQL 16 as the primary relational database for the platform.',
        contentHash: 'h-a',
        clearanceTier: 'PUBLIC',
        confidence: 95,
      }],
    };

    const findingB = {
      id: 'FIND-IDEMP-B',
      type: 'decision',
      title: 'MySQL Relational DB',
      summary: 'Main relational DB is MySQL.',
      category: 'Database',
      urgency: 'high',
      owner: 'Lead',
      createdDate: '2026-11-08',
      confidence: 85,
      approved: false,
      status: 'VERIFIED',
      citations: [{
        id: 'C-B',
        sourceId: 'src-legacy-rfc',
        sourceName: 'legacy_rfc_2024.txt',
        sourceType: 'docs',
        file: 'legacy_rfc_2024.txt',
        lineRange: 'Line 2',
        author: 'Lead',
        timestamp: '2026-11-08',
        snippet: 'Our preliminary evaluation proposes MySQL as the primary database for legacy billing.',
        contentHash: 'h-b',
        clearanceTier: 'PUBLIC',
        confidence: 85,
      }],
    };

    // Run 1
    const run1 = await runFullVerification([findingA, findingB], [SOURCE_A, SOURCE_B], {
      workspaceId: 'test-idemp-ws',
      useAi: false,
    });
    assert.strictEqual(run1.conflicts.length, 1);

    // Run 2 with existing conflicts passed
    const run2 = await runFullVerification(run1.verifiedFindings, [SOURCE_A, SOURCE_B], {
      workspaceId: 'test-idemp-ws',
      existingConflicts: run1.conflicts,
      useAi: false,
    });

    // Conflict count remains exactly 1, no duplicate records created
    assert.strictEqual(run2.conflicts.length, 1);
    assert.strictEqual(run2.conflicts[0].id, run1.conflicts[0].id);
  });

  cleanupTestStorage();
});
