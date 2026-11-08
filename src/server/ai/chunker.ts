import type { KnowledgeFinding, ProjectSource } from '../../lib/types.ts';
import type { ExtractionChunk } from './types.ts';

export const DEFAULT_MAX_CHUNK_CHARS = 12000;
export const DEFAULT_OVERLAP_CHARS = 1000;

/**
 * Splits document content into manageable chunks with preserved offsets.
 */
export function chunkDocument(
  source: ProjectSource,
  maxChunkChars = DEFAULT_MAX_CHUNK_CHARS,
  overlapChars = DEFAULT_OVERLAP_CHARS
): ExtractionChunk[] {
  const fullText = source.documentData?.extractedText || source.description || '';

  if (!fullText || fullText.trim().length === 0) {
    return [];
  }

  // If text fits comfortably in one chunk
  if (fullText.length <= maxChunkChars) {
    const lineCount = (fullText.match(/\n/g) || []).length + 1;
    return [
      {
        chunkIndex: 0,
        totalChunks: 1,
        sourceId: source.id,
        sourceName: source.name,
        sourceType: source.type,
        text: fullText,
        charStart: 0,
        charEnd: fullText.length,
        lineStart: 1,
        lineEnd: lineCount,
        pageNumber: source.documentData?.pageCount ? 1 : undefined,
      },
    ];
  }

  // Multi-chunk splitting with overlap
  const chunks: ExtractionChunk[] = [];
  let currentStart = 0;
  let chunkIdx = 0;

  while (currentStart < fullText.length) {
    let currentEnd = Math.min(currentStart + maxChunkChars, fullText.length);

    // If not at the end of the document, try to break on a sentence or paragraph boundary
    if (currentEnd < fullText.length) {
      const naturalBreak = fullText.lastIndexOf('\n\n', currentEnd);
      if (naturalBreak > currentStart + maxChunkChars / 2) {
        currentEnd = naturalBreak + 2;
      } else {
        const lineBreak = fullText.lastIndexOf('\n', currentEnd);
        if (lineBreak > currentStart + maxChunkChars / 2) {
          currentEnd = lineBreak + 1;
        }
      }
    }

    const chunkText = fullText.slice(currentStart, currentEnd);
    const textBefore = fullText.slice(0, currentStart);
    const lineStart = (textBefore.match(/\n/g) || []).length + 1;
    const lineEnd = lineStart + (chunkText.match(/\n/g) || []).length;

    // Estimate page number if PDF pages are available
    let pageNumber: number | undefined;
    if (source.documentData?.pages && source.documentData.pages.length > 0) {
      let accumulatedChars = 0;
      for (const page of source.documentData.pages) {
        accumulatedChars += page.text.length;
        if (currentStart <= accumulatedChars) {
          pageNumber = page.pageNumber;
          break;
        }
      }
    }

    chunks.push({
      chunkIndex: chunkIdx,
      totalChunks: 0, // updated after loop
      sourceId: source.id,
      sourceName: source.name,
      sourceType: source.type,
      text: chunkText,
      charStart: currentStart,
      charEnd: currentEnd,
      lineStart,
      lineEnd,
      pageNumber,
    });

    chunkIdx++;
    if (currentEnd >= fullText.length) {
      break;
    }
    // Advance with overlap
    currentStart = Math.max(currentEnd - overlapChars, currentStart + 1);
  }

  // Set totalChunks
  for (const c of chunks) {
    c.totalChunks = chunks.length;
  }

  return chunks;
}

/**
 * Calculates string similarity ratio (0 to 1) based on word-token overlap (Dice coefficient).
 */
export function calculateTextSimilarity(a: string, b: string): number {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2);

  const wordsA = new Set(normalize(a));
  const wordsB = new Set(normalize(b));

  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let intersection = 0;
  wordsA.forEach((w) => {
    if (wordsB.has(w)) intersection++;
  });

  return (2 * intersection) / (wordsA.size + wordsB.size);
}

/**
 * Deduplicates findings extracted across multiple chunks or documents.
 * Merges citations and prioritizes VERIFIED evidence.
 */
export function deduplicateFindings(findings: KnowledgeFinding[]): KnowledgeFinding[] {
  const result: KnowledgeFinding[] = [];

  for (const candidate of findings) {
    // Check if an existing finding in result is substantially identical
    const existingIndex = result.findIndex((existing) => {
      // Must be same type
      if (existing.type !== candidate.type) return false;

      // Exact title match or normalized title match
      const titleSim = calculateTextSimilarity(existing.title, candidate.title);
      if (titleSim > 0.75) return true;

      // Or very high summary overlap
      const summarySim = calculateTextSimilarity(existing.summary, candidate.summary);
      return summarySim > 0.8;
    });

    if (existingIndex === -1) {
      result.push(candidate);
    } else {
      // Merge candidate into existing
      const existing = result[existingIndex];

      // Merge citations without duplicate snippets
      const combinedCitations = [...existing.citations];
      for (const cit of candidate.citations) {
        const alreadyHasCitation = combinedCitations.some(
          (c) => c.contentHash === cit.contentHash || c.snippet.trim() === cit.snippet.trim()
        );
        if (!alreadyHasCitation) {
          combinedCitations.push(cit);
        }
      }

      // Keep higher status if candidate has better status
      let upgradedStatus = existing.status;
      if (candidate.status === 'VERIFIED' && existing.status !== 'VERIFIED') {
        upgradedStatus = 'VERIFIED';
      } else if (candidate.status === 'CONFLICTING') {
        upgradedStatus = 'CONFLICTING';
      }

      const upgradedConfidence = Math.max(existing.confidence, candidate.confidence);
      const richerReasoning = (candidate.reasoning || '').length > (existing.reasoning || '').length
        ? candidate.reasoning
        : existing.reasoning;
      const richerImpact = (candidate.impact || '').length > (existing.impact || '').length
        ? candidate.impact
        : existing.impact;

      result[existingIndex] = {
        ...existing,
        status: upgradedStatus,
        confidence: upgradedConfidence,
        citations: combinedCitations,
        reasoning: richerReasoning,
        impact: richerImpact,
        conflictDetails: candidate.conflictDetails || existing.conflictDetails,
      };
    }
  }

  return result;
}
