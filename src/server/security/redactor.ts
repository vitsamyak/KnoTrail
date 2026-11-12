import type {
  KnowledgeFinding,
  ProjectData,
  EvidenceCitation,
  HandoverDocument,
  UserRole,
} from '../../lib/types.ts';

/**
 * Checks whether a citation has confidential clearance.
 */
export function isConfidentialCitation(citation: EvidenceCitation): boolean {
  return citation.clearanceTier === 'CONFIDENTIAL';
}

/**
 * Redacts a single citation for External viewers.
 */
export function redactCitation(citation: EvidenceCitation): EvidenceCitation {
  if (!isConfidentialCitation(citation)) {
    return citation;
  }
  return {
    ...citation,
    snippet: '[REDACTED: Access restricted to Manager and Developer roles.]',
    quote: '[REDACTED: Confidential citation quote]',
    file: '[REDACTED_INTERNAL_FILE]',
    lineRange: '[REDACTED]',
    author: '[REDACTED_AUTHOR]',
  };
}

/**
 * Redacts a single finding for External viewers.
 * If all citations are confidential, the summary is redacted.
 */
export function redactFinding(finding: KnowledgeFinding): KnowledgeFinding {
  const citations = (finding.citations || []).map(redactCitation);
  const allConfidential =
    finding.citations &&
    finding.citations.length > 0 &&
    finding.citations.every(isConfidentialCitation);

  return {
    ...finding,
    citations,
    reviewerNotes: undefined, // Strip internal reviewer notes
    summary: allConfidential
      ? '[REDACTED: This finding is backed by CONFIDENTIAL evidence and is restricted to Manager and Developer roles.]'
      : finding.summary,
  };
}

/**
 * Redacts an entire ProjectData payload for an External user.
 * Strips confidential details while preserving project structure.
 */
export function redactProjectDataForRole(project: ProjectData, role?: UserRole): ProjectData {
  if (role !== 'EXTERNAL') {
    return project;
  }

  const p: ProjectData = JSON.parse(JSON.stringify(project));

  // 1. Redact findings
  if (p.findings && Array.isArray(p.findings)) {
    p.findings = p.findings.map(redactFinding);
  }

  // 2. Redact current handover if present
  if (p.currentHandover) {
    p.currentHandover = redactHandoverDocument(p.currentHandover);
  }

  // 3. Redact archived handovers
  if (p.handovers && Array.isArray(p.handovers)) {
    p.handovers = p.handovers.map(redactHandoverDocument);
  }

  // 4. Strip internal review audit history notes
  if (p.reviewAuditHistory && Array.isArray(p.reviewAuditHistory)) {
    p.reviewAuditHistory = p.reviewAuditHistory.map((a) => ({
      ...a,
      reviewerNotes: undefined,
      notes: undefined,
    }));
  }

  return p;
}

/**
 * Redacts a HandoverDocument for an External user or public share.
 */
export function redactHandoverDocument(doc: HandoverDocument): HandoverDocument {
  const d: HandoverDocument = JSON.parse(JSON.stringify(doc));

  // Redact findings across all sections
  if (d.decisions) d.decisions = d.decisions.map(redactFinding);
  if (d.tasks) d.tasks = d.tasks.map(redactFinding);
  if (d.risks) d.risks = d.risks.map(redactFinding);
  if (d.dependencies) d.dependencies = d.dependencies.map(redactFinding);
  if (d.unresolvedQuestions) d.unresolvedQuestions = d.unresolvedQuestions.map(redactFinding);
  if (d.recommendedNextActions) {
    if (d.recommendedNextActions.immediate) {
      d.recommendedNextActions.immediate = d.recommendedNextActions.immediate.map(redactFinding);
    }
    if (d.recommendedNextActions.shortTerm) {
      d.recommendedNextActions.shortTerm = d.recommendedNextActions.shortTerm.map(redactFinding);
    }
    if (d.recommendedNextActions.followUp) {
      d.recommendedNextActions.followUp = d.recommendedNextActions.followUp.map(redactFinding);
    }
  }

  // Redact evidence inventory
  if (d.evidenceInventory) {
    d.evidenceInventory = d.evidenceInventory.map((item) => ({
      ...item,
      reviewerJustification: undefined,
      citations: (item.citations || []).map(redactCitation),
    }));
  }

  return d;
}
