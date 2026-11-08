import type {
  EvidenceCitation,
  EvidenceStatus,
  FindingType,
  KnowledgeFinding,
  ProjectSource,
} from '../../lib/types.ts';

export interface RawExtractedFinding {
  type: FindingType;
  title: string;
  summary: string;
  category: string;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  owner?: string;
  reasoning?: string;
  impact?: string;
  supportingQuote?: string;
  sourceId?: string;
  claimedConfidence?: number;
  isConflict?: boolean;
  conflictClaimA?: string;
  conflictClaimB?: string;
  conflictSourceA?: string;
  conflictSourceB?: string;
}

export interface ExtractionOptions {
  model?: string;
  apiKey?: string;
  sourceIds?: string[];
  maxTokens?: number;
  temperature?: number;
}

export interface ExtractionChunk {
  chunkIndex: number;
  totalChunks: number;
  sourceId: string;
  sourceName: string;
  sourceType: ProjectSource['type'];
  text: string;
  charStart: number;
  charEnd: number;
  lineStart: number;
  lineEnd: number;
  pageNumber?: number;
}

export interface ExtractionTelemetry {
  totalSourcesProcessed: number;
  totalChunksProcessed: number;
  rawFindingsExtracted: number;
  verifiedFindingsCount: number;
  uncertainFindingsCount: number;
  conflictingFindingsCount: number;
  missingFindingsCount: number;
  deduplicatedCount: number;
  groundedPercentage: number;
  durationMs: number;
}

export interface ExtractionResponse {
  success: boolean;
  findings: KnowledgeFinding[];
  count: number;
  telemetry: ExtractionTelemetry;
  error?: string;
  configured?: boolean;
}
