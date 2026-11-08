import type { ProjectData } from './types.ts';

/**
 * Clean, neutral project template for newly initialized anonymous workspaces.
 * Invariant: New workspaces start with 0 findings and 0 sources.
 * Only real user-uploaded documents or verified AI results may appear as findings.
 */
export const EMPTY_PROJECT_DATA: ProjectData = {
  id: 'proj-default-001',
  name: 'Knowledge Handover Workspace',
  code: 'KNO-DEFAULT',
  description: 'Upload project documents (PDF, TXT, Markdown) to extract important decisions, pending tasks, risks, and dependencies with verified source evidence.',
  targetExitDate: 'Not Scheduled',
  version: 'v1.0',
  lastAnalysed: 'Never',
  executiveSummary: 'No project documents uploaded yet. Upload project specifications, meeting notes, or task records in the Sources tab to begin extracting project knowledge.',
  handoverCertified: false,
  certificationHash: '',
  lead: {
    id: 'user-lead-01',
    name: 'Project Contributor',
    role: 'Handover Lead',
    email: 'contributor@knotrail.internal',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    outgoing: true,
    transitionNotes: 'Active handover contributor.',
  },
  stakeholders: [],
  sources: [],
  findings: [],
};

/**
 * Default initial project data is the clean empty workspace.
 */
export const INITIAL_PROJECT_DATA: ProjectData = EMPTY_PROJECT_DATA;

/**
 * Isolated test fixture used EXCLUSIVELY by unit test suites (e.g., persistence.test.mjs).
 * Never rendered in production user-facing workspaces.
 */
export const TEST_FIXTURE_PROJECT_DATA: ProjectData = {
  id: 'proj-fixture-001',
  name: 'Test Project Handover',
  code: 'TEST-FIXTURE',
  description: 'Synthetic test fixture for persistence and conflict resolution tests.',
  targetExitDate: 'July 15, 2026',
  version: 'v1.0-test',
  lastAnalysed: 'Just now',
  executiveSummary: 'Test fixture summary for verifying storage mutations and conflict gates.',
  handoverCertified: false,
  certificationHash: '',
  lead: {
    id: 'test-lead-01',
    name: 'Test Lead',
    role: 'Lead Architect',
    email: 'test.lead@example.com',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    outgoing: true,
    transitionNotes: 'Test transition notes.',
  },
  stakeholders: [
    {
      id: 'test-lead-01',
      name: 'Test Lead',
      role: 'Lead Architect',
      email: 'test.lead@example.com',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      outgoing: true,
      transitionNotes: 'Outgoing lead.',
    },
    {
      id: 'test-lead-02',
      name: 'Incoming Steward',
      role: 'Incoming Lead',
      email: 'incoming@example.com',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      outgoing: false,
      transitionNotes: 'Incoming steward.',
    },
  ],
  sources: [
    {
      id: 'src-test-01',
      name: 'architecture_specification.md',
      type: 'notes',
      status: 'connected',
      lastSync: 'Just now',
      recordCount: 120,
      icon: 'description',
      description: 'Architecture specification document for testing.',
      privacyLevel: 'LOCAL_READ_ONLY',
    },
  ],
  findings: [
    {
      id: 'FIND-DEC-01',
      type: 'decision',
      title: 'Database Cluster Architecture',
      summary: 'Adopted PostgreSQL for relational persistence.',
      reasoning: 'ACID guarantees and connection pooling support.',
      impact: 'Zero-downtime cutover validated in staging.',
      status: 'VERIFIED',
      confidence: 96,
      category: 'Architecture',
      urgency: 'high',
      owner: 'Test Lead',
      createdDate: '2026-11-08',
      approved: true,
      rejected: false,
      reviewerNotes: 'Approved during test run.',
      citations: [
        {
          id: 'cit-test-01',
          sourceId: 'src-test-01',
          sourceName: 'architecture_specification.md',
          sourceType: 'notes',
          file: 'architecture_specification.md',
          lineRange: '1-10',
          author: 'Test Lead',
          timestamp: '2026-11-08',
          snippet: 'Adopted PostgreSQL for relational persistence.',
          contentHash: 'sha256:test1234',
          clearanceTier: 'INTERNAL',
          confidence: 96,
        },
      ],
    },
    {
      id: 'FIND-DEC-04',
      type: 'decision',
      title: 'Cache Eviction Strategy Discrepancy',
      summary: 'Conflicting cache eviction policies between RFC and configuration.',
      reasoning: 'RFC specifies allkeys-lru while configuration specifies volatile-lru.',
      impact: 'May lead to unexpected cache eviction during traffic spikes.',
      status: 'CONFLICTING',
      confidence: 50,
      category: 'Infrastructure',
      urgency: 'critical',
      owner: 'Test Lead',
      createdDate: '2026-11-08',
      approved: false,
      rejected: false,
      reviewerNotes: 'Requires conflict resolution before handover certification.',
      conflictDetails: {
        sourceA: {
          name: 'RFC-042 Documentation',
          claim: 'Mandates allkeys-lru eviction for financial cache clusters.',
          reference: 'RFC-042 Section 4.1',
        },
        sourceB: {
          name: 'Helm Chart Configuration',
          claim: 'Sets maxmemory-policy to volatile-lru.',
          reference: 'charts/values.yaml Line 88',
        },
      },
      citations: [
        {
          id: 'cit-test-04',
          sourceId: 'src-test-01',
          sourceName: 'architecture_specification.md',
          sourceType: 'notes',
          file: 'architecture_specification.md',
          lineRange: '15-25',
          author: 'Test Lead',
          timestamp: '2026-11-08',
          snippet: 'Conflicting cache eviction policies between RFC and configuration.',
          contentHash: 'sha256:test5678',
          clearanceTier: 'INTERNAL',
          confidence: 50,
        },
      ],
    },
  ],
};
