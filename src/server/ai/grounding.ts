import crypto from 'crypto';
import type {
  EvidenceCitation,
  EvidenceStatus,
  KnowledgeFinding,
  ProjectSource,
} from '../../lib/types.ts';
import type { RawExtractedFinding } from './types.ts';

export interface GroundedCitationResult {
  status: EvidenceStatus;
  confidence: number;
  citations: EvidenceCitation[];
  reviewerNotes: string;
}

/**
 * Normalizes text for whitespace-agnostic comparison.
 */
function normalizeForSearch(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

/**
 * Searches for a quote inside document text, returning the char index and length of match,
 * or -1 if not found.
 */
export function findQuoteInText(
  fullText: string,
  quote: string
): { found: boolean; startIndex: number; endIndex: number; matchedText: string } {
  if (!quote || quote.trim().length === 0 || !fullText || fullText.trim().length === 0) {
    return { found: false, startIndex: -1, endIndex: -1, matchedText: '' };
  }

  const cleanQuote = quote.trim();

  // 1. Exact match
  const exactIndex = fullText.indexOf(cleanQuote);
  if (exactIndex !== -1) {
    return {
      found: true,
      startIndex: exactIndex,
      endIndex: exactIndex + cleanQuote.length,
      matchedText: fullText.slice(exactIndex, exactIndex + cleanQuote.length),
    };
  }

  // 2. Case-insensitive exact match
  const lowerFull = fullText.toLowerCase();
  const lowerQuote = cleanQuote.toLowerCase();
  const lowerIndex = lowerFull.indexOf(lowerQuote);
  if (lowerIndex !== -1) {
    return {
      found: true,
      startIndex: lowerIndex,
      endIndex: lowerIndex + cleanQuote.length,
      matchedText: fullText.slice(lowerIndex, lowerIndex + cleanQuote.length),
    };
  }

  // 3. Normalized whitespace match
  const normQuote = normalizeForSearch(cleanQuote);
  if (normQuote.length >= 15) {
    // Try searching with the first 40 characters
    const head = normQuote.slice(0, Math.min(40, normQuote.length));
    const headIdx = lowerFull.indexOf(head.toLowerCase());
    if (headIdx !== -1) {
      const approxEnd = Math.min(fullText.length, headIdx + cleanQuote.length + 20);
      return {
        found: true,
        startIndex: headIdx,
        endIndex: approxEnd,
        matchedText: fullText.slice(headIdx, approxEnd),
      };
    }
  }

  return { found: false, startIndex: -1, endIndex: -1, matchedText: '' };
}

/**
 * Calculates line range and PDF page coordinates for a verified quote.
 */
export function calculateCoordinates(
  source: ProjectSource,
  startIndex: number,
  endIndex: number,
  matchedText: string
): { lineRange: string; pageNumber?: number; snippet: string } {
  const fullText = source.documentData?.extractedText || source.description || '';

  // Calculate global line numbers
  const textBefore = fullText.slice(0, startIndex);
  const startLine = (textBefore.match(/\n/g) || []).length + 1;
  const matchLines = (matchedText.match(/\n/g) || []).length;
  const endLine = startLine + matchLines;

  // Extract a clean surrounding context snippet (up to 240 chars)
  const snippetStart = Math.max(0, startIndex - 40);
  const snippetEnd = Math.min(fullText.length, endIndex + 40);
  const snippet = fullText.slice(snippetStart, snippetEnd).trim();

  // If source is a PDF with page data, locate the exact page
  if (source.documentData?.pages && source.documentData.pages.length > 0) {
    for (const page of source.documentData.pages) {
      const pageMatch = findQuoteInText(page.text, matchedText.slice(0, 30));
      if (pageMatch.found) {
        const pageTextBefore = page.text.slice(0, pageMatch.startIndex);
        const pageStartLine = (pageTextBefore.match(/\n/g) || []).length + 1;
        const pageEndLine = pageStartLine + (pageMatch.matchedText.match(/\n/g) || []).length;
        
        const pageRange = pageStartLine === pageEndLine 
          ? `Page ${page.pageNumber} (Line ${pageStartLine})` 
          : `Page ${page.pageNumber} (Lines ${pageStartLine}-${pageEndLine})`;

        return {
          lineRange: pageRange,
          pageNumber: page.pageNumber,
          snippet: snippet || matchedText,
        };
      }
    }

    // Fallback page estimate based on character position
    let accumulated = 0;
    for (const page of source.documentData.pages) {
      accumulated += page.text.length;
      if (startIndex <= accumulated) {
        return {
          lineRange: `Page ${page.pageNumber} (Lines ${startLine}-${endLine})`,
          pageNumber: page.pageNumber,
          snippet: snippet || matchedText,
        };
      }
    }
  }

  // Plain text / Markdown line range
  const lineRange = startLine === endLine ? `Line ${startLine}` : `Lines ${startLine}-${endLine}`;
  return {
    lineRange,
    snippet: snippet || matchedText,
  };
}

/**
 * Verifies evidence grounding of a raw extracted finding against original source documents.
 */
export function groundFinding(
  raw: RawExtractedFinding,
  source: ProjectSource
): GroundedCitationResult {
  const quote = raw.supportingQuote?.trim() || '';

  // 1. Missing evidence check
  if (!quote || quote === 'N/A' || quote.toLowerCase() === 'none') {
    const emptyCitation: EvidenceCitation = {
      id: `cit-missing-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sourceId: source.id,
      sourceName: source.name,
      sourceType: source.type,
      file: source.name,
      lineRange: 'Unspecified',
      author: 'AI Extraction',
      timestamp: new Date().toUTCString(),
      snippet: 'No supporting quote was provided by AI model.',
      contentHash: 'sha256:0000000000000000000000000000000000000000000000000000000000000000',
      clearanceTier: 'INTERNAL',
      confidence: 25,
    };

    return {
      status: 'MISSING',
      confidence: 25,
      citations: [emptyCitation],
      reviewerNotes: 'Automated validation warning: No supporting quote was provided by AI. Marked as MISSING evidence.',
    };
  }

  // 2. Search for quote in source text
  const fullText = source.documentData?.extractedText || source.description || '';
  const searchResult = findQuoteInText(fullText, quote);

  if (searchResult.found) {
    const coords = calculateCoordinates(source, searchResult.startIndex, searchResult.endIndex, searchResult.matchedText);
    const contentHash = `sha256:${crypto.createHash('sha256').update(coords.snippet).digest('hex')}`;

    const verifiedCitation: EvidenceCitation = {
      id: `cit-verified-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sourceId: source.id,
      sourceName: source.name,
      sourceType: source.type,
      file: source.name,
      lineRange: coords.lineRange,
      author: 'Document Source',
      timestamp: new Date().toUTCString(),
      snippet: coords.snippet,
      contentHash,
      clearanceTier: 'INTERNAL',
      confidence: 96,
    };

    // If finding has explicit conflict flag or conflict details
    if (raw.isConflict) {
      return {
        status: 'CONFLICTING',
        confidence: 85,
        citations: [verifiedCitation],
        reviewerNotes: 'Automated conflict detection: Competing operational claims detected across project sources. Requires human resolution in Review Center.',
      };
    }

    return {
      status: 'VERIFIED',
      confidence: 95,
      citations: [verifiedCitation],
      reviewerNotes: `Grounding verified against ${source.name} (${coords.lineRange}). Pending human review.`,
    };
  }

  // 3. Quote could not be located in source document
  const unverifiedCitation: EvidenceCitation = {
    id: `cit-uncertain-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    sourceId: source.id,
    sourceName: source.name,
    sourceType: source.type,
    file: source.name,
    lineRange: 'Unverified quote in source',
    author: 'AI Model (Ungrounded)',
    timestamp: new Date().toUTCString(),
    snippet: quote.length > 200 ? quote.slice(0, 197) + '...' : quote,
    contentHash: `sha256:${crypto.createHash('sha256').update(quote).digest('hex')}`,
    clearanceTier: 'INTERNAL',
    confidence: 45,
  };

  return {
    status: 'UNCERTAIN',
    confidence: 45,
    citations: [unverifiedCitation],
    reviewerNotes: `Automated validation warning: The supporting quote "${quote.slice(0, 60)}..." could not be located verbatim in ${source.name}. Marked UNCERTAIN pending human review.`,
  };
}

/**
 * Builds a full KnowledgeFinding from raw extracted data, grounded citations, and invariant defaults.
 */
export function buildKnowledgeFinding(
  raw: RawExtractedFinding,
  grounding: GroundedCitationResult,
  fallbackOwner = 'Unassigned'
): KnowledgeFinding {
  const findingId = `FIND-AI-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  const finding: KnowledgeFinding = {
    id: findingId,
    type: raw.type,
    title: raw.title.trim(),
    summary: raw.summary.trim(),
    reasoning: raw.reasoning?.trim(),
    impact: raw.impact?.trim(),
    status: grounding.status,
    confidence: grounding.confidence,
    citations: grounding.citations,
    approved: false, // MANDATORY INVARIANT: never pre-approve
    rejected: false, // MANDATORY INVARIANT: default not rejected
    reviewerNotes: grounding.reviewerNotes,
    category: raw.category || 'General Operations',
    urgency: raw.urgency || 'medium',
    owner: raw.owner && raw.owner.trim().length > 0 ? raw.owner.trim() : fallbackOwner,
    createdDate: new Date().toISOString().split('T')[0],
  };

  if (raw.isConflict && raw.conflictClaimA && raw.conflictClaimB) {
    finding.conflictDetails = {
      sourceA: {
        name: raw.conflictSourceA || 'Source Document A',
        claim: raw.conflictClaimA,
        reference: raw.supportingQuote || 'Section 1',
      },
      sourceB: {
        name: raw.conflictSourceB || 'Source Document B',
        claim: raw.conflictClaimB,
        reference: 'Operational Log',
      },
    };
  }

  return finding;
}

