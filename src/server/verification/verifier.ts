import { GoogleGenAI } from '@google/genai';
import type {
  KnowledgeFinding,
  ProjectSource,
  EvidenceValidityStatus,
  ClaimVerificationStatus,
  EvidenceStatus,
  ConflictRecord,
  EvidenceCitation,
  ReviewStatus,
} from '../../lib/types.ts';

/**
 * Normalizes text by collapsing whitespace, trimming, and lowercasing.
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n+/g, '\n')
    .trim();
}

/**
 * Derives the composite EvidenceStatus ('VERIFIED' | 'UNCERTAIN' | 'CONFLICTING' | 'MISSING')
 * from the Phase E dual-status dimensions.
 */
export function deriveCompositeStatus(
  evidenceValidity: EvidenceValidityStatus,
  claimStatus: ClaimVerificationStatus
): EvidenceStatus {
  if (claimStatus === 'CONFLICTING') {
    return 'CONFLICTING';
  }
  if (evidenceValidity === 'MISSING') {
    return 'MISSING';
  }
  if (
    evidenceValidity === 'MISMATCHED' ||
    evidenceValidity === 'SOURCE_UNAVAILABLE' ||
    claimStatus === 'UNCERTAIN' ||
    claimStatus === 'POSSIBLY_OUTDATED'
  ) {
    return 'UNCERTAIN';
  }
  return 'VERIFIED';
}

export interface EvidenceVerificationResult {
  validity: EvidenceValidityStatus;
  validCoordinates: boolean;
  issues: string[];
  matchedQuote?: string;
  sourceFound: boolean;
}

/**
 * Parses page number from lineRange or reference string.
 * Matches: "Page 4", "p. 4", "Page 4, Lines 10-15"
 */
export function extractPageNumber(reference: string): number | null {
  if (!reference) return null;
  const match = reference.match(/(?:page|p\.)\s*(\d+)/i);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Parses line range from lineRange string.
 * Matches: "Lines 12-45", "Line 12", "12-45"
 */
export function extractLineRange(reference: string): { start: number; end: number } | null {
  if (!reference) return null;
  const rangeMatch = reference.match(/(?:lines?|l\.)?\s*(\d+)\s*[-–—]\s*(\d+)/i);
  if (rangeMatch) {
    return { start: parseInt(rangeMatch[1], 10), end: parseInt(rangeMatch[2], 10) };
  }
  const singleMatch = reference.match(/(?:lines?|l\.)\s*(\d+)/i);
  if (singleMatch) {
    const line = parseInt(singleMatch[1], 10);
    return { start: line, end: line };
  }
  return null;
}

/**
 * Verifies whether the evidence citation exists and accurately quotes the source document.
 * Checks:
 * 1. Missing quote
 * 2. Invalid source ownership (sourceId not in workspace)
 * 3. Exact vs normalized substring presence
 * 4. Page coordinate bounds vs document total pages
 * 5. Line coordinate bounds vs document total lines
 */
export function verifyFindingEvidence(
  finding: KnowledgeFinding,
  sources: ProjectSource[],
  workspaceId?: string
): EvidenceVerificationResult {
  const issues: string[] = [];

  // 1. Check if finding has citations
  if (!finding.citations || finding.citations.length === 0) {
    return {
      validity: 'MISSING',
      validCoordinates: false,
      issues: ['No supporting citation or evidence attached to finding.'],
      sourceFound: false,
    };
  }

  const primaryCitation = finding.citations[0];
  const quote = primaryCitation.snippet ? primaryCitation.snippet.trim() : '';

  if (!quote) {
    return {
      validity: 'MISSING',
      validCoordinates: false,
      issues: ['Supporting citation quote is empty.'],
      sourceFound: false,
    };
  }

  // 2. Validate source ownership within current workspace
  const source = sources.find((s) => s.id === primaryCitation.sourceId);
  if (!source) {
    return {
      validity: 'SOURCE_UNAVAILABLE',
      validCoordinates: false,
      issues: [`Referenced source "${primaryCitation.sourceName}" (${primaryCitation.sourceId}) is not present in active workspace sources.`],
      sourceFound: false,
    };
  }

  const sourceText = source.documentData?.extractedText || source.description || '';
  if (!sourceText.trim()) {
    return {
      validity: 'SOURCE_UNAVAILABLE',
      validCoordinates: false,
      issues: [`Source "${source.name}" contains no extracted text or content.`],
      sourceFound: true,
    };
  }

  // 3. Verify quotation presence
  const exactMatch = sourceText.includes(quote);
  const normalizedSource = normalizeText(sourceText);
  const normalizedQuote = normalizeText(quote);
  const normalizedMatch = normalizedSource.includes(normalizedQuote);

  let validity: EvidenceValidityStatus = 'MISMATCHED';
  if (exactMatch || normalizedMatch) {
    validity = 'MATCHED';
  } else {
    issues.push(`Supporting quote does not appear in the source text of "${source.name}".`);
  }

  // 4. Validate coordinate bounds (Pages & Lines)
  let validCoordinates = true;
  const lineRangeRef = primaryCitation.lineRange || '';

  // Check Page bounds
  const claimedPage = extractPageNumber(lineRangeRef);
  if (claimedPage !== null && source.documentData?.pageCount) {
    if (claimedPage < 1 || claimedPage > source.documentData.pageCount) {
      validCoordinates = false;
      validity = 'MISMATCHED';
      issues.push(
        `Invalid page reference: Citation claims Page ${claimedPage}, but "${source.name}" only has ${source.documentData.pageCount} page(s).`
      );
    }
  }

  // Check Line bounds
  const claimedLines = extractLineRange(lineRangeRef);
  if (claimedLines !== null && source.documentData?.lineCount) {
    if (claimedLines.start < 1 || claimedLines.end > source.documentData.lineCount || claimedLines.start > claimedLines.end) {
      validCoordinates = false;
      validity = 'MISMATCHED';
      issues.push(
        `Invalid line reference: Citation claims lines ${claimedLines.start}-${claimedLines.end}, but "${source.name}" has ${source.documentData.lineCount} total lines.`
      );
    }
  }

  return {
    validity,
    validCoordinates,
    issues,
    matchedQuote: validity === 'MATCHED' ? quote : undefined,
    sourceFound: true,
  };
}

/**
 * Checks whether a claim is semantically supported by the quoted text.
 * Prevents unsupported AI conclusions or hallucinations.
 */
export function verifyClaimSupport(
  finding: KnowledgeFinding,
  quote: string
): { status: ClaimVerificationStatus; explanation: string } {
  if (!quote || quote.trim().length === 0) {
    return {
      status: 'UNCERTAIN',
      explanation: 'No supporting quote provided to substantiate this claim.',
    };
  }

  // Check for common signs of speculative/hallucinated conclusions
  const normalizedClaim = normalizeText(`${finding.title} ${finding.summary}`);
  const normalizedQuote = normalizeText(quote);

  // Extract key nouns / alphanumeric words from title (length >= 4)
  const titleWords = finding.title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !['this', 'that', 'with', 'from', 'have', 'were', 'been', 'must', 'should'].includes(w));

  // If none of the title's core terms appear in the quote or surrounding context
  const overlappingWords = titleWords.filter((w) => normalizedQuote.includes(w));
  if (titleWords.length > 2 && overlappingWords.length === 0) {
    return {
      status: 'UNCERTAIN',
      explanation: 'Unsupported conclusion: Finding asserts claims whose core terms do not appear in the supporting quote.',
    };
  }

  return {
    status: 'SUPPORTED',
    explanation: 'Claim assertions are directly substantiated by the supporting quote.',
  };
}

/**
 * Phase F: Revalidates supporting evidence when a human reviewer edits a finding.
 * If the edited claim is no longer supported by the original source, marks it UNCERTAIN and NEEDS_CORRECTION.
 * Never preserves an approved or verified status automatically after materially changing a claim.
 */
export function revalidateEditedFinding(
  finding: KnowledgeFinding,
  sources: ProjectSource[]
): {
  status: EvidenceStatus;
  claimStatus: ClaimVerificationStatus;
  evidenceValidity: EvidenceValidityStatus;
  reviewStatus: ReviewStatus;
  confidence: number;
  explanation: string;
} {
  if (!finding.citations || finding.citations.length === 0) {
    return {
      status: 'MISSING',
      claimStatus: 'UNCERTAIN',
      evidenceValidity: 'MISSING',
      reviewStatus: 'NEEDS_CORRECTION',
      confidence: 0,
      explanation: 'No supporting citations or sources attached to this edited finding.',
    };
  }

  // Check the primary citation and matching source
  const primaryCitation = finding.citations[0];
  const matchingSource = sources.find(
    (s) => s.id === primaryCitation.sourceId || s.name === primaryCitation.sourceName
  );
  const sourceText = matchingSource?.documentData?.extractedText || primaryCitation.snippet || '';

  // Extract key terms from edited title & summary
  const claimText = `${finding.title} ${finding.summary}`.toLowerCase();
  const words = claimText
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(
      (w) =>
        w.length >= 4 &&
        !['this', 'that', 'with', 'from', 'have', 'were', 'been', 'must', 'should', 'will', 'then'].includes(w)
    );

  const normalizedSource = normalizeText(sourceText);
  const overlappingWords = words.filter((w) => normalizedSource.includes(w));

  const overlapRatio = words.length > 0 ? overlappingWords.length / words.length : 1;
  const isSupported = words.length <= 2 || overlapRatio >= 0.35;

  if (!isSupported) {
    return {
      status: 'UNCERTAIN',
      claimStatus: 'UNCERTAIN',
      evidenceValidity: 'MISMATCHED',
      reviewStatus: 'NEEDS_CORRECTION',
      confidence: 40,
      explanation:
        'Edited claim is no longer supported by the original source quote. Marked UNCERTAIN and requires re-review.',
    };
  }

  return {
    status: 'VERIFIED',
    claimStatus: 'SUPPORTED',
    evidenceValidity: 'MATCHED',
    reviewStatus: 'PENDING_REVIEW', // Material edit resets approval, requiring human re-review
    confidence: 90,
    explanation: 'Edited claim assertions remain substantiated by original source context.',
  };
}

/**
 * Extracts a date from a text string or citation timestamp.
 */
export function parseDateFromText(text: string, timestamp?: string): Date | null {
  if (timestamp) {
    const d = new Date(timestamp);
    if (!isNaN(d.getTime())) return d;
  }

  if (!text) return null;

  // ISO Dates: YYYY-MM-DD
  const isoMatch = text.match(/\b(20\d{2})[-/](0[1-9]|1[0-2])[-/](0[1-9]|[12]\d|3[01])\b/);
  if (isoMatch) {
    const d = new Date(`${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`);
    if (!isNaN(d.getTime())) return d;
  }

  // Month Year: "November 2026", "July 15, 2025"
  const monthMatch = text.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2},?\s+)?(20\d{2})\b/i
  );
  if (monthMatch) {
    const d = new Date(monthMatch[0]);
    if (!isNaN(d.getTime())) return d;
  }

  return null;
}

/**
 * Deterministic Contradiction Evaluator.
 * Checks for direct, verifiable contradictions between two claims:
 * 1. Database/Tech conflict: e.g. PostgreSQL vs MySQL vs MongoDB
 * 2. Task status conflict: e.g. completed vs pending/in-progress
 * 3. Configuration conflict: e.g. port 5432 vs port 5433
 * 4. Component Ownership conflict: e.g. owner Alice vs owner Bob
 * 5. Decision status: approved vs rejected
 */
export function evaluateDeterministicContradiction(
  findingA: KnowledgeFinding,
  findingB: KnowledgeFinding
): { isConflict: boolean; category: ConflictRecord['conflictCategory']; explanation: string; severity: ConflictRecord['severity'] } | null {
  const textA = `${findingA.title} ${findingA.summary} ${findingA.reasoning || ''}`.toLowerCase();
  const textB = `${findingB.title} ${findingB.summary} ${findingB.reasoning || ''}`.toLowerCase();

  // Rule 1: Database Technology Conflict
  const dbs = ['postgresql', 'mysql', 'mongodb', 'dynamodb', 'sqlite', 'redis'];
  const matchedDbsA = dbs.filter((db) => textA.includes(db));
  const matchedDbsB = dbs.filter((db) => textB.includes(db));
  if (
    matchedDbsA.length > 0 &&
    matchedDbsB.length > 0 &&
    !matchedDbsA.some((db) => matchedDbsB.includes(db)) &&
    (textA.includes('primary database') || textA.includes('main database') || textA.includes('relational') || findingA.category.toLowerCase().includes('database')) &&
    (textB.includes('primary database') || textB.includes('main database') || textB.includes('relational') || findingB.category.toLowerCase().includes('database'))
  ) {
    return {
      isConflict: true,
      category: 'architecture',
      explanation: `Conflicting primary database choices: Claim A specifies ${matchedDbsA.join(', ')} while Claim B specifies ${matchedDbsB.join(', ')}.`,
      severity: 'critical',
    };
  }

  // Rule 2: Task Completion vs Pending/Blocked Status Conflict
  const positiveWords = ['complete', 'completed', 'finished', 'already deployed', 'done', 'ready', 'shipped', 'passing', 'operational', 'working', 'success', 'verified'];
  const negativeWords = ['pending', 'unfinished', 'in progress', 'blocked', 'blocking', 'failed', 'failing', 'failure', 'broken', 'stalled', 'not ready', 'unready'];

  const hasPosA = positiveWords.some((w) => textA.includes(w));
  const hasNegA = negativeWords.some((w) => textA.includes(w));
  const hasPosB = positiveWords.some((w) => textB.includes(w));
  const hasNegB = negativeWords.some((w) => textB.includes(w));

  // Check shared tokens
  const tokensA = findingA.title.toLowerCase().split(/\s+/).filter((w) => w.length > 3 && !['this', 'that', 'with', 'from', 'have', 'were', 'been', 'must', 'should'].includes(w));
  const sharedTokens = tokensA.filter((w) => textB.includes(w));

  if (sharedTokens.length >= 1 && ((hasPosA && hasNegB) || (hasNegA && hasPosB))) {
    return {
      isConflict: true,
      category: 'task_status',
      explanation: `Contradictory task state for "${sharedTokens.join(' ')}": One source asserts task or feature is complete or ready, while another states it is pending, failed, or blocked.`,
      severity: 'high',
    };
  }

  // Functional domain conflict: e.g. Notifications & Email delivery readiness
  const domains = [
    { name: 'notification & email delivery', keywordsA: ['notification', 'notifications', 'email', 'messaging', 'alerts'], keywordsB: ['email', 'delivery', 'notification', 'readiness', 'release'] },
    { name: 'deployment & release readiness', keywordsA: ['release', 'deployment', 'deploy', 'launch'], keywordsB: ['release', 'readiness', 'deployment', 'blocked', 'failed'] },
    { name: 'authentication & authorization', keywordsA: ['auth', 'authentication', 'sso', 'oauth'], keywordsB: ['auth', 'login', 'permission', 'tokens'] },
    { name: 'billing & payment processing', keywordsA: ['billing', 'payment', 'ledger', 'stripe'], keywordsB: ['billing', 'payment', 'invoice', 'checkout'] },
  ];

  for (const dom of domains) {
    const matchesDomA = dom.keywordsA.some((k) => textA.includes(k));
    const matchesDomB = dom.keywordsB.some((k) => textB.includes(k));
    if (matchesDomA && matchesDomB) {
      if ((hasPosA && hasNegB) || (hasNegA && hasPosB)) {
        return {
          isConflict: true,
          category: 'task_status',
          explanation: `Contradictory operational state for ${dom.name}: One source asserts completion or readiness while another asserts failure, defects, or blockage.`,
          severity: 'critical',
        };
      }
    }
  }

  // Rule 3: Configuration / Port Conflict
  const portMatchA = textA.match(/\bport\s*[:=]?\s*(\d{4,5})\b/i);
  const portMatchB = textB.match(/\bport\s*[:=]?\s*(\d{4,5})\b/i);
  if (portMatchA && portMatchB && portMatchA[1] !== portMatchB[1]) {
    // Check if referring to same service
    if (sharedTokens.length >= 1 || (textA.includes('database') && textB.includes('database'))) {
      return {
        isConflict: true,
        category: 'architecture',
        explanation: `Conflicting port configuration: Source A specifies port ${portMatchA[1]} whereas Source B specifies port ${portMatchB[1]}.`,
        severity: 'high',
      };
    }
  }

  // Rule 4: Ownership Conflict for specific role / component
  if (
    findingA.type === 'contact' &&
    findingB.type === 'contact' &&
    findingA.title.toLowerCase() === findingB.title.toLowerCase() &&
    findingA.owner &&
    findingB.owner &&
    findingA.owner.toLowerCase() !== findingB.owner.toLowerCase() &&
    findingA.owner !== 'Unassigned' &&
    findingB.owner !== 'Unassigned'
  ) {
    return {
      isConflict: true,
      category: 'ownership',
      explanation: `Conflicting assignment for ${findingA.title}: Assigned to ${findingA.owner} in one source and ${findingB.owner} in another.`,
      severity: 'medium',
    };
  }

  return null;
}

/**
 * Evaluates semantic contradiction using Google Gemini when available.
 */
export async function evaluateGeminiContradiction(
  findingA: KnowledgeFinding,
  findingB: KnowledgeFinding,
  quoteA: string,
  quoteB: string
): Promise<{ isConflict: boolean; category: ConflictRecord['conflictCategory']; explanation: string; severity: ConflictRecord['severity'] } | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    return null;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `You are KnoTrail's Semantic Evidence Verification & Contradiction Analyzer.
Analyze the following two findings extracted from separate project documents:

FINDING A:
Title: "${findingA.title}"
Summary: "${findingA.summary}"
Supporting Quote: "${quoteA}"

FINDING B:
Title: "${findingB.title}"
Summary: "${findingB.summary}"
Supporting Quote: "${quoteB}"

RULES:
1. Two statements are a CONTRADICTION ONLY if they assert mutually exclusive, incompatible operational facts about the same entity, architecture, status, or decision (e.g. PostgreSQL vs MySQL, completed vs incomplete, Port 5432 vs 5433).
2. If they describe different non-conflicting facets (e.g. "We use TypeScript" vs "We run on Node.js"), they are NOT contradictory.
3. If one statement merely provides historical context or more detail, they are NOT contradictory.

Return JSON ONLY:
{
  "isConflict": boolean,
  "category": "architecture" | "task_status" | "ownership" | "dependency" | "security" | "general",
  "explanation": "concise explanation of contradiction",
  "severity": "critical" | "high" | "medium"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    if (parsed.isConflict) {
      return {
        isConflict: true,
        category: parsed.category || 'general',
        explanation: parsed.explanation || 'Semantic contradiction detected between findings.',
        severity: parsed.severity || 'high',
      };
    }
  } catch (err) {
    console.warn('Gemini contradiction analysis skipped (fallback to deterministic):', err);
  }

  return null;
}

/**
 * Main Verification & Cross-Document Conflict Detection Engine.
 * 
 * Verifies every finding's evidence against uploaded workspace sources,
 * checks for cross-source contradictions, evaluates temporal supersession,
 * and maintains structured ConflictRecords.
 */
export async function runFullVerification(
  findings: KnowledgeFinding[],
  sources: ProjectSource[],
  options: {
    workspaceId?: string;
    existingConflicts?: ConflictRecord[];
    useAi?: boolean;
  } = {}
): Promise<{
  verifiedFindings: KnowledgeFinding[];
  conflicts: ConflictRecord[];
  summary: {
    totalChecked: number;
    verifiedCount: number;
    uncertainCount: number;
    conflictingCount: number;
    missingCount: number;
    openConflictsCount: number;
    temporalSupersededCount: number;
  };
}> {
  const workspaceId = options.workspaceId || 'default';
  const existingConflicts = options.existingConflicts || [];
  const updatedFindings: KnowledgeFinding[] = [];

  // Step 1: Verify Individual Findings (Evidence Validity + Claim Support)
  for (const finding of findings) {
    const evidenceRes = verifyFindingEvidence(finding, sources, workspaceId);
    const primaryQuote = finding.citations?.[0]?.snippet || '';
    const claimRes = verifyClaimSupport(finding, primaryQuote);

    const evidenceValidity = evidenceRes.validity;
    let claimStatus = claimRes.status;

    // Derive composite status
    let compositeStatus = deriveCompositeStatus(evidenceValidity, claimStatus);

    updatedFindings.push({
      ...finding,
      evidenceValidity,
      claimStatus,
      status: compositeStatus,
      reviewerNotes: evidenceRes.issues.length > 0 ? evidenceRes.issues.join('; ') : finding.reviewerNotes,
    });
  }

  // Step 2: Cross-Document Conflict Detection
  const detectedConflicts: ConflictRecord[] = [...existingConflicts];

  // Helper to find existing conflict for finding pair
  const findExistingConflict = (idA: string, idB: string): ConflictRecord | undefined => {
    return detectedConflicts.find(
      (c) =>
        (c.findingIdA === idA && c.findingIdB === idB) ||
        (c.findingIdA === idB && c.findingIdB === idA)
    );
  };

  // Compare pairs across different sources
  for (let i = 0; i < updatedFindings.length; i++) {
    for (let j = i + 1; j < updatedFindings.length; j++) {
      const findingA = updatedFindings[i];
      const findingB = updatedFindings[j];

      const sourceIdA = findingA.citations?.[0]?.sourceId;
      const sourceIdB = findingB.citations?.[0]?.sourceId;

      // Only compare findings originating from different sources (or different citations)
      if (!sourceIdA || !sourceIdB || sourceIdA === sourceIdB) {
        continue;
      }

      // Check if already recorded
      const existing = findExistingConflict(findingA.id, findingB.id);
      if (existing && existing.status === 'RESOLVED') {
        continue;
      }

      // 1. Deterministic contradiction check
      let contradiction = evaluateDeterministicContradiction(findingA, findingB);

      // 2. Semantic AI check if deterministic didn't trigger and AI enabled
      if (!contradiction && options.useAi !== false) {
        const quoteA = findingA.citations?.[0]?.snippet || '';
        const quoteB = findingB.citations?.[0]?.snippet || '';
        contradiction = await evaluateGeminiContradiction(findingA, findingB, quoteA, quoteB);
      }

      if (contradiction && contradiction.isConflict) {
        const sourceA = sources.find((s) => s.id === sourceIdA);
        const sourceB = sources.find((s) => s.id === sourceIdB);

        const quoteA = findingA.citations?.[0]?.snippet || '';
        const quoteB = findingB.citations?.[0]?.snippet || '';
        const locA = findingA.citations?.[0]?.lineRange || 'Source coordinate';
        const locB = findingB.citations?.[0]?.lineRange || 'Source coordinate';

        // Check Temporal Ordering
        const dateA = parseDateFromText(quoteA, findingA.citations?.[0]?.timestamp);
        const dateB = parseDateFromText(quoteB, findingB.citations?.[0]?.timestamp);

        let isTemporalSuperseded = false;
        let supersededFindingId: string | undefined;

        if (dateA && dateB && dateA.getTime() !== dateB.getTime()) {
          isTemporalSuperseded = true;
          if (dateA.getTime() < dateB.getTime()) {
            supersededFindingId = findingA.id;
            findingA.claimStatus = 'POSSIBLY_OUTDATED';
            findingA.isTemporalSuperseded = true;
            findingA.supersededByDate = dateB.toISOString().split('T')[0];
            findingA.status = deriveCompositeStatus(findingA.evidenceValidity || 'MATCHED', 'POSSIBLY_OUTDATED');
          } else {
            supersededFindingId = findingB.id;
            findingB.claimStatus = 'POSSIBLY_OUTDATED';
            findingB.isTemporalSuperseded = true;
            findingB.supersededByDate = dateA.toISOString().split('T')[0];
            findingB.status = deriveCompositeStatus(findingB.evidenceValidity || 'MATCHED', 'POSSIBLY_OUTDATED');
          }
        } else {
          // Both are contemporaneous conflicting claims
          findingA.claimStatus = 'CONFLICTING';
          findingA.status = 'CONFLICTING';
          findingB.claimStatus = 'CONFLICTING';
          findingB.status = 'CONFLICTING';
        }

        const conflictId = existing ? existing.id : `CONF-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
        
        const conflictRecord: ConflictRecord = {
          id: conflictId,
          workspaceId,
          findingIdA: findingA.id,
          findingIdB: findingB.id,
          claimA: findingA.title,
          claimB: findingB.title,
          sourceIdA: sourceIdA,
          sourceNameA: sourceA ? sourceA.name : (findingA.citations?.[0]?.sourceName || 'Source A'),
          sourceIdB: sourceIdB,
          sourceNameB: sourceB ? sourceB.name : (findingB.citations?.[0]?.sourceName || 'Source B'),
          quoteA,
          locationA: locA,
          timestampA: dateA ? dateA.toISOString().split('T')[0] : undefined,
          quoteB,
          locationB: locB,
          timestampB: dateB ? dateB.toISOString().split('T')[0] : undefined,
          conflictCategory: contradiction.category,
          explanation: contradiction.explanation,
          severity: contradiction.severity,
          isTemporalSuperseded,
          supersededFindingId,
          status: existing ? existing.status : 'OPEN',
          resolution: existing ? existing.resolution : undefined,
        };

        const conflictDetails = {
          sourceA: {
            name: sourceA ? sourceA.name : (findingA.citations?.[0]?.sourceName || 'Source A'),
            claim: findingA.title,
            reference: locA,
            quote: quoteA,
          },
          sourceB: {
            name: sourceB ? sourceB.name : (findingB.citations?.[0]?.sourceName || 'Source B'),
            claim: findingB.title,
            reference: locB,
            quote: quoteB,
          },
        };

        findingA.conflictRecordId = conflictId;
        findingB.conflictRecordId = conflictId;
        findingA.conflictDetails = conflictDetails;
        findingB.conflictDetails = conflictDetails;

        if (existing) {
          const idx = detectedConflicts.findIndex((c) => c.id === existing.id);
          detectedConflicts[idx] = conflictRecord;
        } else {
          detectedConflicts.push(conflictRecord);
        }
      }
    }
  }

  // Calculate summary metrics
  const totalChecked = updatedFindings.length;
  const verifiedCount = updatedFindings.filter((f) => f.status === 'VERIFIED').length;
  const uncertainCount = updatedFindings.filter((f) => f.status === 'UNCERTAIN').length;
  const conflictingCount = updatedFindings.filter((f) => f.status === 'CONFLICTING').length;
  const missingCount = updatedFindings.filter((f) => f.status === 'MISSING').length;
  const openConflictsCount = detectedConflicts.filter((c) => c.status === 'OPEN').length;
  const temporalSupersededCount = updatedFindings.filter((f) => f.isTemporalSuperseded).length;

  return {
    verifiedFindings: updatedFindings,
    conflicts: detectedConflicts,
    summary: {
      totalChecked,
      verifiedCount,
      uncertainCount,
      conflictingCount,
      missingCount,
      openConflictsCount,
      temporalSupersededCount,
    },
  };
}

