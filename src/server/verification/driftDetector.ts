/**
 * Evidence Drift Detector & Approval Invalidation Engine (Round 3 - Milestone 3.2)
 *
 * Implements high-precision evidence drift detection:
 * 1. Verifies existing findings against refreshed source text.
 * 2. Ignores whitespace, line breaks, formatting, and markdown syntax variations (Zero False Positives).
 * 3. Does not invalidate findings citing unrelated sources.
 * 4. Detects missing supporting evidence, materially changed evidence, contradictions, and temporal supersession.
 * 5. Flags uncertain evidence for review without declaring it invalid.
 * 6. Revokes approvals ONLY when material drift is established, appending immutable audit actions.
 * 7. Invalidate certified handovers when approved project knowledge drifts.
 *
 * Governance: CodersInPune Hackathon 2026 - Deploy_or_Die (Samyak Gedam & Sanshrey Sanagar)
 */

import crypto from 'crypto';
import type {
  KnowledgeFinding,
  ProjectSource,
  ReviewAuditAction,
  EvidenceValidityStatus,
  ProjectData,
} from '../../lib/types.ts';
import { normalizeText, evaluateDeterministicContradiction } from './verifier.ts';
import { calculateTextSimilarity } from '../ai/chunker.ts';

// ============================================================================
// Text Normalization & Formatting Stripping
// ============================================================================

/**
 * Strips markdown markup, punctuation, bullets, quotes, and collapses whitespace.
 * Used to ensure formatting-only changes never cause false-positive drift invalidation.
 */
export function stripFormatting(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[#*_`~>–—\-]/g, ' ')
    .replace(/["'’“”]/g, '')
    .replace(/^[\s*-+]+/gm, '') // remove markdown list markers
    .replace(/[()[\]{}<>:;.,!?/\\]/g, ' ')
    .replace(/\r\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tokenizes text into unique words of length >= 3 for similarity comparison.
 */
function getSignificantTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !['the', 'and', 'for', 'with', 'from', 'this', 'that', 'were', 'been'].includes(w));
}

/**
 * Computes the best lexical overlap ratio (0 to 1) for a quote within a document.
 * Checks exact, normalized, stripped, and sliding paragraph windows.
 */
export function findBestEvidenceSimilarity(
  quote: string,
  sourceText: string
): { similarity: number; matchType: 'exact' | 'normalized' | 'stripped' | 'token_overlap' | 'none' } {
  if (!quote || !sourceText) {
    return { similarity: 0, matchType: 'none' };
  }

  // 1. Exact Substring Match
  if (sourceText.includes(quote)) {
    return { similarity: 1.0, matchType: 'exact' };
  }

  // 2. Normalized Whitespace & Case Match
  const normSource = normalizeText(sourceText);
  const normQuote = normalizeText(quote);
  if (normSource.includes(normQuote)) {
    return { similarity: 1.0, matchType: 'normalized' };
  }

  // 3. Formatting-Insensitive Match (markdown, punctuation, quotes stripped)
  const strippedSource = stripFormatting(sourceText);
  const strippedQuote = stripFormatting(quote);
  if (strippedSource.includes(strippedQuote)) {
    return { similarity: 1.0, matchType: 'stripped' };
  }

  // 4. Token Overlap Sliding Window Analysis
  const quoteTokens = getSignificantTokens(strippedQuote);
  if (quoteTokens.length === 0) {
    return { similarity: 0, matchType: 'none' };
  }

  // Split source into paragraphs/lines for localized window comparison
  const paragraphs = sourceText.split(/\n\s*\n|\n(?=[#-]|###|\*\*)/);
  let bestSim = 0;

  for (const p of paragraphs) {
    const trimmedP = p.trim();
    if (!trimmedP) continue;

    // Fast check: does paragraph contain at least 1 significant token from quote?
    const pLower = trimmedP.toLowerCase();
    const hasSharedToken = quoteTokens.some((t) => pLower.includes(t));
    if (!hasSharedToken) continue;

    const sim = calculateTextSimilarity(quote, trimmedP);
    if (sim > bestSim) {
      bestSim = sim;
    }
    if (bestSim >= 0.95) break;
  }

  return {
    similarity: parseFloat(bestSim.toFixed(3)),
    matchType: bestSim >= 0.85 ? 'token_overlap' : 'none',
  };
}

// ============================================================================
// Single Finding Evidence Drift Evaluation
// ============================================================================

export interface SingleFindingDriftResult {
  hasMaterialDrift: boolean;
  isUncertain: boolean;
  driftType?: 'MISSING_EVIDENCE' | 'MODIFIED_EVIDENCE' | 'TEMPORALLY_SUPERSEDED' | 'CONTRADICTED';
  reason?: string;
  previousValidity: EvidenceValidityStatus;
  newValidity: EvidenceValidityStatus;
}

/**
 * Evaluates whether an individual finding has experienced evidence drift
 * against a refreshed source and other project findings.
 */
export function evaluateFindingEvidenceDrift(
  finding: KnowledgeFinding,
  targetSource: ProjectSource,
  otherFindings: KnowledgeFinding[] = []
): SingleFindingDriftResult {
  const previousValidity: EvidenceValidityStatus =
    finding.evidenceValidity || (finding.status === 'VERIFIED' ? 'MATCHED' : 'MISMATCHED');

  // Finding must have citations
  if (!finding.citations || finding.citations.length === 0) {
    return {
      hasMaterialDrift: true,
      isUncertain: false,
      driftType: 'MISSING_EVIDENCE',
      reason: 'Finding has no citations or supporting references attached.',
      previousValidity,
      newValidity: 'MISSING',
    };
  }

  const sourceText = targetSource.documentData?.extractedText || targetSource.description || '';
  if (!sourceText.trim()) {
    return {
      hasMaterialDrift: true,
      isUncertain: false,
      driftType: 'MISSING_EVIDENCE',
      reason: `Source document "${targetSource.name}" contains no extractable text.`,
      previousValidity,
      newValidity: 'SOURCE_UNAVAILABLE',
    };
  }

  // Check the relevant citation for this source
  const relevantCitation = finding.citations.find((c) => c.sourceId === targetSource.id) || finding.citations[0];
  const quote = (relevantCitation.snippet || relevantCitation.quote || '').trim();

  if (!quote) {
    return {
      hasMaterialDrift: true,
      isUncertain: false,
      driftType: 'MISSING_EVIDENCE',
      reason: 'Supporting citation quote is empty.',
      previousValidity,
      newValidity: 'MISSING',
    };
  }

  // 1. Text Similarity & Presence Scan
  const { similarity, matchType } = findBestEvidenceSimilarity(quote, sourceText);

  // Fully matched (exact, whitespace-normalized, or markdown-stripped)
  if (similarity >= 0.88 || matchType === 'exact' || matchType === 'normalized' || matchType === 'stripped') {
    // Evidence text is intact; check if newer findings contradict this finding
    for (const other of otherFindings) {
      if (other.id === finding.id) continue;

      const contradiction = evaluateDeterministicContradiction(finding, other);
      if (contradiction && contradiction.isConflict) {
        // Check temporal ordering: is other newer than finding?
        const dateThis = new Date(finding.createdDate || 0).getTime();
        const dateOther = new Date(other.createdDate || Date.now()).getTime();

        if (dateOther >= dateThis) {
          return {
            hasMaterialDrift: true,
            isUncertain: false,
            driftType: 'CONTRADICTED',
            reason: `Contradicted by newer repository finding "${other.title}": ${contradiction.explanation}`,
            previousValidity,
            newValidity: 'MATCHED',
          };
        }
      }
    }

    // No drift detected
    return {
      hasMaterialDrift: false,
      isUncertain: false,
      previousValidity,
      newValidity: 'MATCHED',
    };
  }

  // 2. Uncertain Evidence (similarity between 0.45 and 0.88)
  if (similarity >= 0.45) {
    return {
      hasMaterialDrift: false,
      isUncertain: true,
      reason: `Supporting evidence wording partially shifted after repository update (${Math.round(similarity * 100)}% match). Manual verification recommended.`,
      previousValidity,
      newValidity: 'MISMATCHED',
    };
  }

  // 3. Material Drift: Evidence is missing or was rewritten (< 0.45 match)
  return {
    hasMaterialDrift: true,
    isUncertain: false,
    driftType: 'MODIFIED_EVIDENCE',
    reason: `Supporting quote was modified or removed in refreshed source "${targetSource.name}": "${quote.slice(0, 80)}${quote.length > 80 ? '...' : ''}"`,
    previousValidity,
    newValidity: 'MISMATCHED',
  };
}

// ============================================================================
// Comprehensive Workspace Evidence Drift Scanner
// ============================================================================

export interface WorkspaceDriftScanResult {
  updatedFindings: KnowledgeFinding[];
  invalidatedFindingIds: string[];
  uncertainFindingIds: string[];
  auditActions: ReviewAuditAction[];
  handoverInvalidated: boolean;
  driftSummary: string;
  summary: {
    totalChecked: number;
    totalRelevant: number;
    invalidatedCount: number;
    uncertainCount: number;
    unaffectedCount: number;
  };
}

/**
 * Scans all findings in a workspace against a refreshed source.
 * Enforces precise invalidation:
 * - Only checks findings citing the updated source.
 * - Whitespace/formatting changes do NOT invalidate approval.
 * - Uncertain evidence is flagged for review without being marked invalid.
 * - Materially missing/modified evidence revokes approval and logs APPROVAL_RESET audit trail.
 * - Handover is de-certified when material drift occurs.
 */
export function scanWorkspaceEvidenceDrift(
  workspaceId: string,
  updatedSourceId: string,
  project: ProjectData
): WorkspaceDriftScanResult {
  const sources = project.sources || [];
  const targetSource = sources.find((s) => s.id === updatedSourceId);

  const findings = project.findings || [];
  const updatedFindings: KnowledgeFinding[] = [];
  const invalidatedFindingIds: string[] = [];
  const uncertainFindingIds: string[] = [];
  const auditActions: ReviewAuditAction[] = [];

  let totalRelevant = 0;
  let unaffectedCount = 0;

  if (!targetSource) {
    return {
      updatedFindings: findings,
      invalidatedFindingIds: [],
      uncertainFindingIds: [],
      auditActions: [],
      handoverInvalidated: false,
      driftSummary: 'Target source not found in workspace sources.',
      summary: {
        totalChecked: findings.length,
        totalRelevant: 0,
        invalidatedCount: 0,
        uncertainCount: 0,
        unaffectedCount: findings.length,
      },
    };
  }

  for (const finding of findings) {
    // 1. Source Relevance Filter: Does this finding cite the updated source?
    const hasRelevantCitation = (finding.citations || []).some(
      (c) => c.sourceId === targetSource.id || c.sourceName === targetSource.name
    );

    if (!hasRelevantCitation) {
      // Finding cites unrelated sources or documents. Preserved completely.
      updatedFindings.push(finding);
      unaffectedCount++;
      continue;
    }

    totalRelevant++;

    // 2. Evaluate Drift
    const driftResult = evaluateFindingEvidenceDrift(finding, targetSource, findings);

    if (driftResult.hasMaterialDrift) {
      const wasApproved = finding.approved === true;

      const updatedFinding: KnowledgeFinding = {
        ...finding,
        approved: false, // Invalidate approval
        reviewStatus: 'PENDING_REVIEW', // Reset to pending-review state
        needsReReview: true,
        reReviewReason: driftResult.reason || 'Supporting evidence was modified or superseded in repository update.',
        driftDetectedAt: new Date().toISOString(),
        evidenceValidity: driftResult.newValidity,
        status: driftResult.newValidity === 'MISSING' ? 'MISSING' : 'UNCERTAIN',
      };

      updatedFindings.push(updatedFinding);
      invalidatedFindingIds.push(finding.id);

      // Create Audit Log if the finding was previously approved
      if (wasApproved) {
        const auditAction: ReviewAuditAction = {
          id: `rev_drift_${Date.now()}_${crypto.randomUUID().slice(0, 6)}`,
          findingId: finding.id,
          workspaceId,
          actionType: 'APPROVAL_RESET',
          action: 'RESET_APPROVAL',
          previousStatus: 'APPROVED',
          newStatus: 'PENDING_REVIEW',
          reviewerName: 'System (Evidence Drift Monitor)',
          reviewerNotes: `Approval revoked due to material evidence drift: ${driftResult.reason}`,
          timestamp: new Date().toISOString(),
        };
        auditActions.push(auditAction);
      }
    } else if (driftResult.isUncertain) {
      // Flag for review without declaring definitively invalid
      const updatedFinding: KnowledgeFinding = {
        ...finding,
        needsReReview: true,
        reReviewReason: driftResult.reason,
        driftDetectedAt: new Date().toISOString(),
        status: 'UNCERTAIN',
        claimStatus: 'UNCERTAIN',
      };

      updatedFindings.push(updatedFinding);
      uncertainFindingIds.push(finding.id);
    } else {
      // Evidence is valid & matched. Clear previous drift flags if any.
      const updatedFinding: KnowledgeFinding = {
        ...finding,
        needsReReview: false,
        reReviewReason: undefined,
        evidenceValidity: 'MATCHED',
        status: finding.status === 'MISSING' ? 'VERIFIED' : finding.status,
      };

      updatedFindings.push(updatedFinding);
      unaffectedCount++;
    }
  }

  const handoverInvalidated = invalidatedFindingIds.length > 0;
  const driftSummary =
    invalidatedFindingIds.length > 0
      ? `Material evidence drift detected: ${invalidatedFindingIds.length} finding(s) revoked approval and require re-review.`
      : uncertainFindingIds.length > 0
      ? `Minor evidence shift detected: ${uncertainFindingIds.length} finding(s) flagged for human inspection.`
      : 'No evidence drift detected. All supporting citations verified.';

  return {
    updatedFindings,
    invalidatedFindingIds,
    uncertainFindingIds,
    auditActions,
    handoverInvalidated,
    driftSummary,
    summary: {
      totalChecked: findings.length,
      totalRelevant,
      invalidatedCount: invalidatedFindingIds.length,
      uncertainCount: uncertainFindingIds.length,
      unaffectedCount,
    },
  };
}
