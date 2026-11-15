import type {
  KnowledgeFinding,
  ProjectData,
  EvidenceCitation,
  HandoverDocument,
  UserRole,
  ProjectSource,
} from '../../lib/types.ts';

/**
 * Masks an email address for privacy protection (e.g. "s***9@gmail.com").
 */
export function maskEmailAddress(email: string): string {
  if (!email || typeof email !== 'string') return '***@knotrail.local';
  const parts = email.split('@');
  if (parts.length !== 2) return '***@knotrail.local';
  const [local, domain] = parts;
  const maskedLocal =
    local.length <= 2
      ? `${local[0] || '*'}***`
      : `${local[0]}***${local[local.length - 1]}`;
  return `${maskedLocal}@${domain}`;
}

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

  // 5. Redact sources for External role
  if (p.sources && Array.isArray(p.sources)) {
    p.sources = p.sources.map((s) => redactSourceForRole(s, role));
  }

  // 6. Mask internal team emails for External role
  if (p.lead && p.lead.email) {
    p.lead.email = maskEmailAddress(p.lead.email);
  }
  if (p.stakeholders && Array.isArray(p.stakeholders)) {
    p.stakeholders = p.stakeholders.map((s) => ({
      ...s,
      email: s.email ? maskEmailAddress(s.email) : s.email,
    }));
  }

  return p;
}

/**
 * Checks whether a source is marked confidential or contains restricted operational information.
 */
export function isConfidentialSource(source: ProjectSource): boolean {
  // Check if name indicates secrets/credentials or internal environment
  const lowerName = (source.name || '').toLowerCase();
  if (
    lowerName.includes('.env') ||
    lowerName.includes('secret') ||
    lowerName.includes('credential') ||
    lowerName.includes('token')
  ) {
    return true;
  }

  // Check if description indicates restricted/confidential
  const desc = (source.description || '').toLowerCase();
  if (desc.includes('confidential') || desc.includes('restricted')) {
    return true;
  }

  // Check if extracted content has explicit confidential markings or connection strings
  const content = source.documentData?.extractedText || '';
  if (
    content.includes('clearanceTier: CONFIDENTIAL') ||
    content.includes('CONFIDENTIAL:') ||
    content.includes('DB_CONNECTION_STRING=') ||
    content.includes('postgres://')
  ) {
    return true;
  }

  return false;
}

/**
 * Redacts a single ProjectSource for External viewers.
 * Prevents confidential extracted text exposure, hides internal storage paths,
 * while preserving legitimate public/non-confidential structure and read-only access.
 */
export function redactSourceForRole(source: ProjectSource, role?: UserRole): ProjectSource {
  if (role !== 'EXTERNAL') {
    return source;
  }

  const s: ProjectSource = JSON.parse(JSON.stringify(source));
  const isConfidential = isConfidentialSource(s);

  // Always strip physical server storage path for External callers
  if (s.documentData?.storagePath) {
    s.documentData.storagePath = undefined;
  }

  if (isConfidential) {
    if (s.documentData) {
      if (s.documentData.extractedText) {
        s.documentData.extractedText =
          '[REDACTED: Confidential document content restricted to Manager and Developer roles.]';
      }
      if (s.documentData.pages && Array.isArray(s.documentData.pages)) {
        s.documentData.pages = s.documentData.pages.map((p) => ({
          ...p,
          text: '[REDACTED: Confidential page content restricted to Manager and Developer roles.]',
        }));
      }
    }

    s.description = '[REDACTED: Restricted project source.]';
  }

  return s;
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

