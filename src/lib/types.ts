export type EvidenceStatus = 'VERIFIED' | 'UNCERTAIN' | 'CONFLICTING' | 'MISSING';

// Phase E: Dual-Status Taxonomy
// Evidence Validity separates quote existence and coordinate bounds from claim correctness.
export type EvidenceValidityStatus = 'MATCHED' | 'MISSING' | 'MISMATCHED' | 'SOURCE_UNAVAILABLE';

// Claim Verification evaluates semantic support, cross-source contradictions, and temporal supersession.
export type ClaimVerificationStatus = 'SUPPORTED' | 'UNCERTAIN' | 'CONFLICTING' | 'POSSIBLY_OUTDATED';

// Phase F: Human Approval & Review Workflow Statuses
export type ReviewStatus =
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'NEEDS_CORRECTION'
  | 'CONFLICT_REQUIRES_RESOLUTION';

export interface ReviewAuditAction {
  id: string;
  findingId: string;
  workspaceId: string;
  actionType: 'APPROVE' | 'REJECT' | 'EDIT' | 'RESOLVE_CONFLICT' | 'ADD_NOTE' | 'REVALIDATE';
  action?: string;
  notes?: string;
  previousStatus: string;
  newStatus: string;
  reviewerName: string;
  reviewerNotes?: string;
  timestamp: string;
  evidenceReferences?: Array<{
    sourceName: string;
    location: string;
    quote?: string;
  }>;
}

export type FindingType = 'decision' | 'task' | 'risk' | 'dependency' | 'contact' | 'next_action' | 'unresolved_question';

export interface EvidenceCitation {
  id: string;
  sourceId: string;
  sourceName: string;
  sourceType: 'github' | 'linear' | 'slack' | 'notion' | 'docs' | 'notes' | 'pagerduty' | 'jira';
  file: string;
  lineRange: string;
  commitSha?: string;
  author: string;
  timestamp: string;
  snippet: string;
  quote?: string;
  pageNumber?: number;
  lineNumber?: number;
  contentHash: string;
  clearanceTier: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL';
  confidence: number;
}

export interface ConflictDetails {
  sourceA: { name: string; claim: string; reference: string; quote?: string; location?: string };
  sourceB: { name: string; claim: string; reference: string; quote?: string; location?: string };
  category?: 'architecture' | 'database' | 'security' | 'timeline' | 'operational' | 'other' | string;
  explanation?: string;
  resolution?: string;
  resolvedBy?: string;
  resolvedAt?: string;
}

export interface ConflictRecord {
  id: string;
  workspaceId: string;
  findingIdA: string;
  findingIdB: string;
  claimA: string;
  claimB: string;
  sourceIdA: string;
  sourceNameA: string;
  sourceIdB: string;
  sourceNameB: string;
  quoteA: string;
  locationA: string;
  timestampA?: string;
  quoteB: string;
  locationB: string;
  timestampB?: string;
  conflictCategory: 'architecture' | 'task_status' | 'ownership' | 'dependency' | 'security' | 'general';
  explanation: string;
  severity: 'critical' | 'high' | 'medium';
  isTemporalSuperseded?: boolean;
  supersededFindingId?: string;
  status: 'OPEN' | 'RESOLVED' | 'IGNORED';
  resolution?: {
    resolvedAt: string;
    resolvedBy: string;
    chosenFindingId?: string;
    resolutionNotes: string;
  };
}

export interface KnowledgeFinding {
  id: string;
  type: FindingType;
  title: string;
  summary: string;
  reasoning?: string;
  impact?: string;
  mitigation?: string;
  implication?: string;
  status: EvidenceStatus;
  // Phase E: Dual-Status fields
  evidenceValidity?: EvidenceValidityStatus;
  claimStatus?: ClaimVerificationStatus;
  conflictRecordId?: string;
  isTemporalSuperseded?: boolean;
  supersededByDate?: string;
  confidence: number; // 0 to 100
  citations: EvidenceCitation[];
  approved: boolean;
  rejected?: boolean;
  // Phase F: Human Review Workflow fields
  reviewStatus?: ReviewStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewerNotes?: string;
  rejectionReason?: string;
  conflictDetails?: ConflictDetails;
  category: string;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  owner: string;
  createdDate: string;
}

export interface DocumentPage {
  pageNumber: number;
  text: string;
}

export interface ExtractedDocumentData {
  fileFormat: 'pdf' | 'txt' | 'md';
  mimeType: string;
  fileSizeBytes: number;
  fileSizeFormatted: string;
  contentHash: string; // SHA-256
  storagePath?: string;
  extractedText: string;
  lineCount?: number;
  pageCount?: number;
  pages?: DocumentPage[];
  isScannedPdf?: boolean;
}

export interface ProjectSource {
  id: string;
  name: string;
  type: 'github' | 'linear' | 'slack' | 'notion' | 'docs' | 'notes' | 'pagerduty' | 'jira';
  status: 'connected' | 'syncing' | 'error' | 'idle';
  lastSync: string;
  recordCount: number;
  icon: string;
  description: string;
  privacyLevel: 'SYNTHETIC_DEMO' | 'LOCAL_READ_ONLY';
  isUploaded?: boolean;
  documentData?: ExtractedDocumentData;
}

export interface Stakeholder {
  id: string;
  name: string;
  role: string;
  email: string;
  avatar: string;
  outgoing: boolean;
  transitionNotes: string;
}

export interface ProjectData {
  id: string;
  name: string;
  code: string;
  description: string;
  targetExitDate: string;
  version: string;
  lastAnalysed: string;
  lead: Stakeholder;
  stakeholders: Stakeholder[];
  sources: ProjectSource[];
  findings: KnowledgeFinding[];
  conflicts?: ConflictRecord[];
  reviewAuditHistory?: ReviewAuditAction[];
  handoverCertified: boolean;
  certificationHash: string;
  certifiedDate?: string;
  certifiedBy?: string;
  executiveSummary: string;
  isCreated?: boolean;
  category?: string;
  handovers?: HandoverDocument[];
  currentHandover?: HandoverDocument;
  shareRecords?: HandoverShareRecord[];
}

// Phase G: Comprehensive Handover Document Models

export interface HandoverShareRecord {
  token: string;
  handoverId: string;
  workspaceId: string;
  createdAt: string;
  isActive: boolean;
  revokedAt?: string;
}

export interface HandoverSectionCounts {
  decisions: number;
  tasks: number;
  risks: number;
  dependencies: number;
  questions: number;
  nextActions: number;
  contacts: number;
  totalApprovedFindings: number;
}

export interface HandoverEvidenceItem {
  findingId: string;
  findingTitle: string;
  findingType: string;
  status: EvidenceStatus;
  evidenceValidity?: EvidenceValidityStatus;
  claimStatus?: ClaimVerificationStatus;
  isAcceptedUncertain?: boolean;
  reviewerJustification?: string;
  citations: EvidenceCitation[];
}

export interface HandoverDocument {
  id: string;
  workspaceId: string;
  projectId: string;
  version: string; // e.g. "v1.0", "v1.1"
  generatedAt: string;
  certifiedDate: string;
  certifiedBy: string;
  certificationHash: string;
  isOutdated: boolean;
  outdatedReason?: string;
  sourceSnapshotHash: string;
  shareRecord?: HandoverShareRecord;

  // Section A: Cover & Project Metadata
  metadata: {
    projectName: string;
    projectCode: string;
    description: string;
    category?: string;
    version: string;
    targetExitDate: string;
    auditStamp: string;
    outgoingLead?: { name: string; role: string; email?: string };
    incomingLead?: { name: string; role: string; email?: string };
  };

  // Section B: Executive Summary
  executiveSummary: string;

  // Section C: Project Overview
  projectOverview: {
    purpose: string;
    scope: string;
    operationalStatus: string;
    connectedSourcesCount: number;
  };

  // Section D: Important Decisions
  decisions: KnowledgeFinding[];

  // Section E: Pending Tasks
  tasks: KnowledgeFinding[];

  // Section F: Responsibilities
  responsibilities: {
    assigned: Array<{ owner: string; tasksCount: number; taskTitles: string[] }>;
    unassignedTasks: KnowledgeFinding[];
    unassignedCount: number;
  };

  // Section G: Risks and Blockers
  risks: KnowledgeFinding[];

  // Section H: Dependencies
  dependencies: KnowledgeFinding[];

  // Section I: Unresolved Questions
  unresolvedQuestions: KnowledgeFinding[];

  // Section J: Recommended Next Actions
  recommendedNextActions: {
    immediate: KnowledgeFinding[]; // critical / high urgency
    shortTerm: KnowledgeFinding[]; // medium urgency
    followUp: KnowledgeFinding[];  // low urgency
  };

  // Section K: Evidence and Source References
  evidenceInventory: HandoverEvidenceItem[];

  // Section L: Human Review History
  reviewHistory: {
    approvedCount: number;
    acceptedUncertainCount: number;
    rejectedCount: number;
    resolvedConflictsCount: number;
    auditActions: ReviewAuditAction[];
  };

  sectionCounts: HandoverSectionCounts;
}

/**
 * Derives the authoritative human review status for a finding.
 * Invariant: Any open conflict or conflicting claim forces CONFLICT_REQUIRES_RESOLUTION.
 * Invariant: Rejected findings cannot be approved without being un-rejected.
 * Invariant: Material edits without verified source support are marked NEEDS_CORRECTION.
 */
export function getFindingReviewStatus(
  finding: KnowledgeFinding,
  conflicts?: ConflictRecord[]
): ReviewStatus {
  const hasOpenConflict =
    finding.status === 'CONFLICTING' ||
    (conflicts || []).some(
      (c) => (c.findingIdA === finding.id || c.findingIdB === finding.id) && c.status === 'OPEN'
    );

  if (hasOpenConflict) {
    return 'CONFLICT_REQUIRES_RESOLUTION';
  }
  if (finding.rejected) {
    return 'REJECTED';
  }
  if (finding.approved) {
    return 'APPROVED';
  }
  if (
    finding.reviewStatus === 'NEEDS_CORRECTION' ||
    (finding.status === 'UNCERTAIN' && finding.claimStatus === 'UNCERTAIN')
  ) {
    return 'NEEDS_CORRECTION';
  }
  return finding.reviewStatus || 'PENDING_REVIEW';
}

export type ActiveView = 
  | 'landing' 
  | 'dashboard' 
  | 'workspace' 
  | 'sources' 
  | 'analysis' 
  | 'evidence' 
  | 'review' 
  | 'handover';
