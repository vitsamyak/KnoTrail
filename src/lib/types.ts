export type EvidenceStatus = 'VERIFIED' | 'UNCERTAIN' | 'CONFLICTING' | 'MISSING';

// Round 3: Server-Verified Role-Based Access Control
export type UserRole = 'MANAGER' | 'DEVELOPER' | 'EXTERNAL';

export interface WorkspaceMemberRecord {
  workspaceId: string;
  userId: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt?: string;
}

export interface AuthSession {
  userId: string;
  email: string;
  role?: UserRole;
  workspaceId?: string;
  isAnonymousDemo?: boolean;
}

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
  actionType: 'APPROVE' | 'REJECT' | 'EDIT' | 'RESOLVE_CONFLICT' | 'ADD_NOTE' | 'REVALIDATE' | 'APPROVAL_RESET';
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
  githubUrl?: string;
  prNumber?: number;
  issueNumber?: number;
  gitHubProvenance?: GitHubEvidenceProvenance;
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
  needsReReview?: boolean;
  reReviewReason?: string;
  driftDetectedAt?: string;
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
  githubMetadata?: GitHubRepositoryMetadata;
  githubIntegrationId?: string;
  codebaseIntelligence?: CodebaseIntelligence;
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
  isProtected?: boolean;
  ownerId?: string;
  currentUserRole?: UserRole;
  handovers?: HandoverDocument[];
  currentHandover?: HandoverDocument;
  shareRecords?: HandoverShareRecord[];
  githubIntegrations?: GitHubIntegration[];
  updateHistory?: ContinuousUpdateRecord[];
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

// ============================================================================
// Phase 2: GitHub Integration Types & Models
// ============================================================================

export type GitHubSyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

export interface GitHubIntegrationConfig {
  includeCommits: boolean;
  includePullRequests: boolean;
  includeIssues: boolean;
  includeDocs: boolean;
  includeCodebase?: boolean;
  maxCommits?: number;
  maxPullRequests?: number;
  maxIssues?: number;
  maxFiles?: number;
  branch?: string;
}

export interface GitHubRepositoryMetadata {
  id: number;
  nodeId?: string;
  name: string;
  fullName: string; // e.g. "vitsamyak/KnoTrail"
  owner: string;
  ownerType: 'User' | 'Organization';
  htmlUrl: string;
  description: string | null;
  defaultBranch: string;
  isPrivate: boolean;
  isFork: boolean;
  language: string | null;
  topics?: string[];
  starsCount?: number;
  forksCount?: number;
  openIssuesCount?: number;
  updatedAt?: string;
  pushedAt?: string;
}

export interface GitHubCommitAuthor {
  name: string;
  email: string;
  date: string;
  username?: string;
  avatarUrl?: string;
}

export interface GitHubCommitFile {
  filename: string;
  status: 'added' | 'modified' | 'removed' | 'renamed';
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
}

export interface GitHubCommit {
  sha: string;
  shortSha: string;
  message: string;
  author: GitHubCommitAuthor;
  committer?: GitHubCommitAuthor;
  htmlUrl: string;
  files?: GitHubCommitFile[];
  stats?: {
    total: number;
    additions: number;
    deletions: number;
  };
}

export interface GitHubPullRequestReview {
  id: number;
  user: string;
  state: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'DISMISSED';
  submittedAt?: string;
  body?: string;
}

export interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  isMerged: boolean;
  mergedAt: string | null;
  mergeCommitSha: string | null;
  htmlUrl: string;
  author: string;
  authorAvatarUrl?: string;
  baseBranch: string;
  headBranch: string;
  createdAt: string;
  updatedAt: string;
  changedFilesCount?: number;
  additions?: number;
  deletions?: number;
  reviews?: GitHubPullRequestReview[];
  reviewCommentsCount?: number;
  labels?: string[];
}

export interface GitHubIssueComment {
  id: number;
  author: string;
  body: string;
  createdAt: string;
  htmlUrl?: string;
}

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  htmlUrl: string;
  author: string;
  authorAvatarUrl?: string;
  assignees: string[];
  labels: string[];
  commentsCount: number;
  comments?: GitHubIssueComment[];
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  isPullRequest?: boolean;
}

export interface GitHubEvidenceProvenance {
  repositoryId: number;
  repositoryOwner: string;
  repositoryName: string;
  repositoryFullName: string;
  branch: string;
  commitSha?: string;
  filePath?: string;
  originalGitHubUrl: string;
  diffHunk?: {
    startLine?: number;
    endLine?: number;
    patchExcerpt?: string;
  };
  prNumber?: number;
  prReviewId?: number;
  issueNumber?: number;
  author: string;
  timestamp: string;
  contentHash: string; // SHA-256 of the raw quote/diff
  synthesizedLineNumber?: number;
  synthesizedLineRange?: string;
}

export interface GitHubIntegration {
  id: string; // e.g. "ghi_..."
  workspaceId: string;
  installationId?: number | null;
  repoOwner: string;
  repoName: string;
  repoId: number;
  defaultBranch: string;
  selectedBranch: string;
  syncStatus: GitHubSyncStatus;
  lastSyncedAt?: string | null;
  lastCommitSha?: string | null;
  errorMessage?: string | null;
  config: GitHubIntegrationConfig;
  metadata?: GitHubRepositoryMetadata;
  knowledgeStatus?: ContinuousKnowledgeStatus;
  lastProcessedCommitSha?: string | null;
  codebaseIntelligence?: CodebaseIntelligence;
  createdAt: string;
  updatedAt: string;
}

export interface GitHubWebhookEvent {
  eventId: string; // from X-GitHub-Delivery
  eventType: string; // e.g. "push", "pull_request", "issues"
  repoId: number;
  payloadHash: string;
  processedAt: string;
}

// ============================================================================
// Codebase Intelligence & Full Repository Scanner Models
// ============================================================================

export type CodebaseFileCategory =
  | 'source_code'
  | 'ui_component'
  | 'backend_route'
  | 'api_impl'
  | 'database_schema'
  | 'data_model'
  | 'auth_security'
  | 'configuration'
  | 'documentation'
  | 'architecture'
  | 'tests'
  | 'ci_cd'
  | 'instructions'
  | 'other';

export interface CodebaseFileItem {
  path: string;
  extension: string;
  language: string;
  category: CodebaseFileCategory;
  size: number;
  blobSha: string;
  linesCount: number;
  isRead: boolean;
  skipReason?: string;
  excerpt?: string;
}

export interface CodebaseArchitectureBlueprint {
  frontend: {
    framework: string;
    uiLibrary?: string;
    routing: string;
    stateManagement: string[];
    keyComponents: string[];
  };
  backend: {
    runtime: string;
    framework: string;
    apiType: string;
    endpointsCount: number;
    keyRoutes: string[];
    middleware: string[];
  };
  database: {
    type: string;
    tables: string[];
    hasMigrations: boolean;
    features: string[];
  };
  externalIntegrations: string[];
  deployment: {
    platforms: string[];
    hasCiCd: boolean;
    containerized: boolean;
  };
  keyWorkflows: string[];
  moduleRelationships: Array<{
    from: string;
    to: string;
    relation: 'imports' | 'calls_api' | 'queries_db' | 'configures';
  }>;
}

export interface CodebaseIngestionProgress {
  phase: number; // 1 to 9
  phaseName: string;
  percent: number; // 0 to 100
  status: 'idle' | 'running' | 'completed' | 'error';
  discoveredCount: number;
  readCount: number;
  skippedCount: number;
  analyzedCount: number;
  findingsCount: number;
  errorCount: number;
  errors: string[];
  currentFile?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface CodebaseIntelligence {
  treeSha: string;
  commitSha: string;
  branch: string;
  inventory: CodebaseFileItem[];
  blueprint: CodebaseArchitectureBlueprint;
  progress: CodebaseIngestionProgress;
  stats: {
    totalFilesDiscovered: number;
    totalFilesRead: number;
    totalFilesSkipped: number;
    totalLinesOfCode: number;
    totalFindings: number;
    skippedByReason: Record<string, number>;
    languages: Record<string, number>;
    categories: Record<string, number>;
  };
  lastIngestedAt: string;
}

export interface CodebaseQuestionRequest {
  question: string;
  workspaceId: string;
}

export interface CodebaseQuestionResponse {
  answer: string;
  confidence: number;
  category: string;
  citations: EvidenceCitation[];
  relatedFiles: string[];
  status: 'success' | 'partial' | 'error';
}

// ============================================================================
// Improvement 3: Continuous Knowledge Updates & Update History Models
// ============================================================================

export type ContinuousUpdateTrigger = 'webhook' | 'manual_sync' | 'retry';
export type ContinuousUpdateStatus = 'success' | 'partial' | 'failed' | 'no_change';
export type ContinuousKnowledgeStatus =
  | 'idle'
  | 'extracting'
  | 'verifying'
  | 'completed'
  | 'failed'
  | 'partial'
  | 'skipped';

export interface ContinuousUpdateRecord {
  id: string; // e.g. "cur_..."
  workspaceId: string;
  integrationId: string;
  repoOwner: string;
  repoName: string;
  repoId: number;
  trigger: ContinuousUpdateTrigger;
  eventType: string; // 'push' | 'pull_request' | 'issues' | 'issue_comment' | 'pull_request_review' | etc.
  deliveryId?: string;
  commitSha?: string;
  reason: string;
  ingestionStatus: 'synced' | 'failed' | 'unchanged';
  knowledgeStatus: ContinuousKnowledgeStatus;
  status: ContinuousUpdateStatus;
  retryCount: number;
  maxRetries: number;
  findingsAdded: number;
  findingsInvalidated: number;
  conflictsDetected: number;
  handoverInvalidated: boolean;
  errorMessage?: string;
  timestamp: string;
  completedAt?: string;
}

export interface ContinuousUpdateHistoryResponse {
  history: ContinuousUpdateRecord[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  status: 'success';
}

export interface ContinuousUpdateRetryResponse {
  success: boolean;
  status: 'success' | 'partial';
  record: ContinuousUpdateRecord;
  findingsAdded: number;
  error?: string;
  message?: string;
}


