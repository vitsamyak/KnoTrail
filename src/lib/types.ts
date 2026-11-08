export type EvidenceStatus = 'VERIFIED' | 'UNCERTAIN' | 'CONFLICTING' | 'MISSING';

export type FindingType = 'decision' | 'task' | 'risk' | 'dependency' | 'contact' | 'next_action';

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
  contentHash: string;
  clearanceTier: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL';
  confidence: number;
}

export interface ConflictDetails {
  sourceA: { name: string; claim: string; reference: string };
  sourceB: { name: string; claim: string; reference: string };
  resolution?: string;
  resolvedBy?: string;
  resolvedAt?: string;
}

export interface KnowledgeFinding {
  id: string;
  type: FindingType;
  title: string;
  summary: string;
  reasoning?: string;
  impact?: string;
  status: EvidenceStatus;
  confidence: number; // 0 to 100
  citations: EvidenceCitation[];
  approved: boolean;
  rejected?: boolean;
  reviewerNotes?: string;
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
  handoverCertified: boolean;
  certificationHash: string;
  certifiedDate?: string;
  certifiedBy?: string;
  executiveSummary: string;
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
