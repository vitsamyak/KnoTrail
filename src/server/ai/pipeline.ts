import type {
  KnowledgeFinding,
  ProjectSource,
} from '../../lib/types.ts';
import { chunkDocument, deduplicateFindings } from './chunker.ts';
import { extractWithGemini, isGeminiConfigured, GeminiConfigError } from './gemini.ts';
import { groundFinding, buildKnowledgeFinding } from './grounding.ts';
import type {
  ExtractionOptions,
  ExtractionResponse,
  ExtractionTelemetry,
} from './types.ts';

export async function runKnowledgeExtractionPipeline(
  sources: ProjectSource[],
  options: ExtractionOptions = {},
  customClient?: any
): Promise<ExtractionResponse> {
  const startTime = Date.now();

  // 1. Verify API configuration unless custom client is provided
  if (!customClient && !isGeminiConfigured() && !options.apiKey) {
    throw new GeminiConfigError();
  }

  // 2. Select eligible sources
  const eligibleSources = sources.filter((s) => {
    if (options.sourceIds && options.sourceIds.length > 0) {
      if (!options.sourceIds.includes(s.id)) return false;
    }
    const text = s.documentData?.extractedText || s.description || '';
    return text.trim().length > 0;
  });

  if (eligibleSources.length === 0) {
    return {
      success: true,
      findings: [],
      count: 0,
      telemetry: {
        totalSourcesProcessed: 0,
        totalChunksProcessed: 0,
        rawFindingsExtracted: 0,
        verifiedFindingsCount: 0,
        uncertainFindingsCount: 0,
        conflictingFindingsCount: 0,
        missingFindingsCount: 0,
        deduplicatedCount: 0,
        groundedPercentage: 0,
        durationMs: Date.now() - startTime,
      },
    };
  }

  const rawExtractedCount: number[] = [0];
  const allGeneratedFindings: KnowledgeFinding[] = [];
  let totalChunks = 0;

  // 3. Process each eligible source
  for (const source of eligibleSources) {
    const chunks = chunkDocument(source);
    totalChunks += chunks.length;

    for (const chunk of chunks) {
      const chunkLabel = chunks.length > 1 ? `Part ${chunk.chunkIndex + 1} of ${chunks.length}` : undefined;
      const rawFindings = await extractWithGemini(
        source.name,
        chunk.text,
        options,
        customClient
      );

      rawExtractedCount[0] += rawFindings.length;

      for (const raw of rawFindings) {
        // Enforce source ID linkage
        raw.sourceId = source.id;

        // Perform strict evidence grounding
        const grounding = groundFinding(raw, source);

        // Build finding adhering to invariants
        const finding = buildKnowledgeFinding(raw, grounding, 'Unassigned');
        allGeneratedFindings.push(finding);
      }
    }
  }

  // 4. Deduplicate across chunks
  const deduplicated = deduplicateFindings(allGeneratedFindings);

  // 5. Compute telemetry
  const verifiedCount = deduplicated.filter((f) => f.status === 'VERIFIED').length;
  const uncertainCount = deduplicated.filter((f) => f.status === 'UNCERTAIN').length;
  const conflictingCount = deduplicated.filter((f) => f.status === 'CONFLICTING').length;
  const missingCount = deduplicated.filter((f) => f.status === 'MISSING').length;

  const groundedPercentage =
    deduplicated.length > 0
      ? parseFloat(((verifiedCount / deduplicated.length) * 100).toFixed(1))
      : 0;

  const telemetry: ExtractionTelemetry = {
    totalSourcesProcessed: eligibleSources.length,
    totalChunksProcessed: totalChunks,
    rawFindingsExtracted: rawExtractedCount[0],
    verifiedFindingsCount: verifiedCount,
    uncertainFindingsCount: uncertainCount,
    conflictingFindingsCount: conflictingCount,
    missingFindingsCount: missingCount,
    deduplicatedCount: allGeneratedFindings.length - deduplicated.length,
    groundedPercentage,
    durationMs: Date.now() - startTime,
  };

  return {
    success: true,
    findings: deduplicated,
    count: deduplicated.length,
    telemetry,
  };
}

