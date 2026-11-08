import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  getApprovedFindings,
  getHandoverDecisions,
  getHandoverTasks,
  getHandoverRisks,
  getHandoverDependencies,
  checkHandoverBlockStatus,
  generateHandoverMarkdown,
  generateHandoverJSON,
} from '../lib/handoverFilter.ts';

// Sample mock findings for testing
const mockFindings = [
  {
    id: 'F-DEC-01',
    type: 'decision',
    title: 'Approved Decision',
    summary: 'Decision has been human reviewed and approved.',
    status: 'VERIFIED',
    confidence: 99,
    category: 'Architecture',
    urgency: 'high',
    owner: 'Elena',
    createdDate: '2025-06-01',
    approved: true,
    rejected: false,
    citations: [{ file: 'src/main.rs', lineRange: '1-10', commitSha: 'abc1234' }],
  },
  {
    id: 'F-DEC-02',
    type: 'decision',
    title: 'Unapproved Decision',
    summary: 'Decision is pending review.',
    status: 'UNCERTAIN',
    confidence: 60,
    category: 'Architecture',
    urgency: 'medium',
    owner: 'Elena',
    createdDate: '2025-06-01',
    approved: false,
    rejected: false,
    citations: [{ file: 'src/pending.rs', lineRange: '12-20' }],
  },
  {
    id: 'F-DEC-03',
    type: 'decision',
    title: 'Rejected Decision',
    summary: 'Decision was rejected by reviewer.',
    status: 'VERIFIED',
    confidence: 80,
    category: 'Architecture',
    urgency: 'low',
    owner: 'Elena',
    createdDate: '2025-06-01',
    approved: false,
    rejected: true,
    reviewerNotes: 'Rejected: superseded by RFC-42',
    citations: [{ file: 'src/old.rs', lineRange: '5-15' }],
  },
  {
    id: 'F-TASK-01',
    type: 'task',
    title: 'Approved Task',
    summary: 'Run DB rollback dry run.',
    status: 'VERIFIED',
    confidence: 95,
    category: 'Operations',
    urgency: 'critical',
    owner: 'Marcus',
    createdDate: '2025-06-02',
    approved: true,
    rejected: false,
    citations: [{ file: 'docs/runbook.md', lineRange: '1-30' }],
  },
  {
    id: 'F-TASK-02',
    type: 'task',
    title: 'Rejected Task',
    summary: 'Outdated manual task.',
    status: 'MISSING',
    confidence: 40,
    category: 'Operations',
    urgency: 'low',
    owner: 'Marcus',
    createdDate: '2025-06-02',
    approved: false,
    rejected: true,
    citations: [],
  },
  {
    id: 'F-RISK-01',
    type: 'risk',
    title: 'Approved Risk',
    summary: 'Unthrottled ingress burst vulnerability.',
    status: 'VERIFIED',
    confidence: 90,
    category: 'Reliability',
    urgency: 'critical',
    owner: 'Marcus',
    createdDate: '2025-06-03',
    approved: true,
    rejected: false,
    citations: [{ file: 'deploy/envoy.yaml', lineRange: '20-40' }],
  },
  {
    id: 'F-DEP-01',
    type: 'dependency',
    title: 'Approved Dependency: Federal API',
    summary: 'mTLS connectivity to upstream Federal Settlement Core API.',
    status: 'VERIFIED',
    confidence: 97,
    category: 'External Integrations',
    urgency: 'high',
    owner: 'Elena',
    createdDate: '2025-06-04',
    approved: true,
    rejected: false,
    citations: [{ file: 'config/settle.json', lineRange: '10-25' }],
  },
  {
    id: 'F-CONFLICT-01',
    type: 'decision',
    title: 'Conflicting Cache Eviction Policy',
    summary: 'Notion vs Helm discrepancy.',
    status: 'CONFLICTING',
    confidence: 50,
    category: 'Infrastructure',
    urgency: 'critical',
    owner: 'Marcus',
    createdDate: '2025-06-05',
    approved: false,
    rejected: false,
    citations: [],
  },
];

const mockProject = {
  id: 'proj-test-01',
  name: 'Test Project Handover',
  code: 'TEST-LEDGER',
  version: 'v1.0-test',
  description: 'Test project description.',
  targetExitDate: 'July 15, 2025',
  executiveSummary: 'Test executive summary.',
  handoverCertified: false,
  certificationHash: 'SHA256:1234567890abcdef',
  certifiedBy: null,
  certifiedDate: null,
  lead: { name: 'Elena Rostova', role: 'Lead Architect', email: 'elena@test.com' },
  stakeholders: [
    { name: 'Elena Rostova', role: 'Outgoing Lead', email: 'elena@test.com', transitionNotes: 'Lead' },
    { name: 'Marcus Vance', role: 'Incoming Lead', email: 'marcus@test.com', transitionNotes: 'Incoming' },
  ],
  sources: [],
  findings: mockFindings,
};

describe('Phase A: Handover Integrity & Filtering Rules', () => {
  it('Condition 1 & 3: Only approved and non-rejected findings appear in handover', () => {
    const approved = getApprovedFindings(mockFindings);
    assert.strictEqual(approved.length, 4, 'Should contain exactly 4 approved findings');
    for (const f of approved) {
      assert.strictEqual(f.approved, true, `Finding ${f.id} must be approved`);
      assert.strictEqual(f.rejected, false, `Finding ${f.id} must not be rejected`);
    }
  });

  it('Condition 2: Rejected findings must never appear in handover', () => {
    const approved = getApprovedFindings(mockFindings);
    const hasRejected = approved.some((f) => f.rejected === true || f.id === 'F-DEC-03' || f.id === 'F-TASK-02');
    assert.strictEqual(hasRejected, false, 'Rejected findings must be completely excluded');
  });

  it('Condition 3: Unapproved findings must never appear in handover', () => {
    const approved = getApprovedFindings(mockFindings);
    const hasUnapproved = approved.some((f) => f.approved === false || f.id === 'F-DEC-02' || f.id === 'F-CONFLICT-01');
    assert.strictEqual(hasUnapproved, false, 'Unapproved findings must be completely excluded');
  });

  it('Condition 5: Handover is blocked when unreviewed findings or conflicts exist', () => {
    // Initial mockFindings has 1 conflicting finding and 1 unreviewed unapproved finding
    const blockStatus = checkHandoverBlockStatus(mockFindings, false);
    assert.strictEqual(blockStatus.isBlocked, true, 'Handover must be blocked');
    assert.strictEqual(blockStatus.canCertify, false, 'Cannot certify while conflicts exist');
    assert.strictEqual(blockStatus.unresolvedConflictsCount, 1, 'Should detect 1 conflict');
  });

  it('Condition 5 & 8: Handover unblocks only after all findings are reviewed and certified', () => {
    // Simulate reviewing all findings: resolve conflict, approve/reject remaining
    const resolvedFindings = mockFindings.map((f) => {
      if (f.status === 'CONFLICTING') {
        return { ...f, status: 'VERIFIED', approved: true, rejected: false };
      }
      if (!f.approved && !f.rejected) {
        return { ...f, approved: true, rejected: false };
      }
      return f;
    });

    const readyStatus = checkHandoverBlockStatus(resolvedFindings, false);
    assert.strictEqual(readyStatus.canCertify, true, 'Should allow certification once all reviewed');
    assert.strictEqual(readyStatus.isBlocked, true, 'Remains blocked until formal certification sign-off');

    const certifiedStatus = checkHandoverBlockStatus(resolvedFindings, true);
    assert.strictEqual(certifiedStatus.isBlocked, false, 'Handover unblocks completely when certified');
  });

  it('Condition 6: Dependencies are included in final handover and exports', () => {
    const dependencies = getHandoverDependencies(mockFindings);
    assert.strictEqual(dependencies.length, 1, 'Should include 1 approved dependency');
    assert.strictEqual(dependencies[0].id, 'F-DEP-01');

    const md = generateHandoverMarkdown(mockProject);
    assert.ok(md.includes('Technical Dependencies & Integrations (1)'), 'Markdown must include Dependencies section');
    assert.ok(md.includes('Approved Dependency: Federal API'), 'Markdown must include dependency title');

    const json = generateHandoverJSON(mockProject);
    assert.strictEqual(json.statistics.approvedDependenciesCount, 1);
    assert.strictEqual(json.dependencies.length, 1);
    assert.strictEqual(json.dependencies[0].title, 'Approved Dependency: Federal API');
  });

  it('Condition 7: Markdown and JSON exports apply identical filtering rules', () => {
    const md = generateHandoverMarkdown(mockProject);
    const json = generateHandoverJSON(mockProject);

    // Verify rejected findings are in NEITHER Markdown NOR JSON
    assert.ok(!md.includes('Rejected Decision'), 'Markdown export must NOT include rejected decision');
    assert.ok(!md.includes('Rejected Task'), 'Markdown export must NOT include rejected task');
    assert.ok(!md.includes('Unapproved Decision'), 'Markdown export must NOT include unapproved decision');

    const jsonTitles = json.findings.map((f) => f.title);
    assert.ok(!jsonTitles.includes('Rejected Decision'), 'JSON export must NOT include rejected decision');
    assert.ok(!jsonTitles.includes('Rejected Task'), 'JSON export must NOT include rejected task');
    assert.ok(!jsonTitles.includes('Unapproved Decision'), 'JSON export must NOT include unapproved decision');

    // Verify approved items ARE present
    assert.ok(md.includes('Approved Decision'));
    assert.ok(md.includes('Approved Task'));
    assert.ok(md.includes('Approved Risk'));
    assert.ok(jsonTitles.includes('Approved Decision'));
    assert.ok(jsonTitles.includes('Approved Task'));
    assert.ok(jsonTitles.includes('Approved Risk'));
  });

  it('Condition 4: Certified & Signed Off status is conditional', () => {
    const uncertifiedMd = generateHandoverMarkdown({ ...mockProject, handoverCertified: false });
    assert.ok(uncertifiedMd.includes('Draft / Uncertified'), 'Should display Draft when uncertified');
    assert.ok(!uncertifiedMd.includes('Certified & Signed Off'), 'Should NOT display Certified when uncertified');

    const certifiedMd = generateHandoverMarkdown({
      ...mockProject,
      handoverCertified: true,
      certifiedBy: 'Elena Rostova',
      certifiedDate: 'July 15, 2025',
    });
    assert.ok(certifiedMd.includes('Certified & Signed Off'), 'Should display Certified when certified');
    assert.ok(!certifiedMd.includes('Draft / Uncertified'), 'Should NOT display Draft when certified');
  });
});
