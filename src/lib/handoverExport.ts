import type { HandoverDocument, KnowledgeFinding } from './types.ts';

/**
 * Generates structured, comprehensive Markdown export covering all 12 sections.
 */
export function exportHandoverMarkdown(doc: HandoverDocument): string {
  const meta = doc.metadata;
  const counts = doc.sectionCounts;

  const lines: string[] = [];

  // Section A: Cover & Project Information
  lines.push(`# ${meta.projectName} — Engineering Handover Dossier`);
  lines.push(`**KnoTrail Knowledge Handover Platform** (Deploy_or_Die)`);
  lines.push(`- **Document Version:** ${meta.version}`);
  lines.push(`- **Audit Stamp:** ${meta.auditStamp}`);
  lines.push(`- **Certification Hash:** \`${doc.certificationHash}\``);
  lines.push(`- **Certified Date:** ${doc.certifiedDate}`);
  lines.push(`- **Certified By:** ${doc.certifiedBy}`);
  lines.push(`- **Target Exit Date:** ${meta.targetExitDate}`);
  if (meta.outgoingLead) {
    lines.push(`- **Outgoing Lead:** ${meta.outgoingLead.name} (${meta.outgoingLead.role})`);
  }
  if (meta.incomingLead) {
    lines.push(`- **Incoming Lead:** ${meta.incomingLead.name} (${meta.incomingLead.role})`);
  }
  lines.push(`- **Total Approved Claims:** ${counts.totalApprovedFindings}`);
  if (doc.isOutdated) {
    lines.push(`\n> ⚠️ **Notice:** This handover is flagged as **POTENTIALLY OUTDATED** because project data was modified after generation.`);
  }

  lines.push('\n---\n');

  // Table of Contents
  lines.push('## Table of Contents');
  lines.push('1. [Executive Summary](#1-executive-summary)');
  lines.push('2. [Project Overview](#2-project-overview)');
  lines.push(`3. [Important Architectural Decisions (${counts.decisions})](#3-important-architectural-decisions)`);
  lines.push(`4. [Pending Operational Tasks (${counts.tasks})](#4-pending-operational-tasks)`);
  lines.push('5. [Responsibilities & Ownership](#5-responsibilities--ownership)');
  lines.push(`6. [Risks & Mitigations (${counts.risks})](#6-risks--mitigations)`);
  lines.push(`7. [Technical Dependencies & Integrations (${counts.dependencies})](#7-technical-dependencies--integrations)`);
  lines.push(`8. [Unresolved Questions (${counts.questions})](#8-unresolved-questions)`);
  lines.push(`9. [Recommended Next Actions (${counts.nextActions})](#9-recommended-next-actions)`);
  lines.push(`10. [Evidence & Source References (${doc.evidenceInventory.length})](#10-evidence--source-references)`);
  lines.push('11. [Human Review & Audit History](#11-human-review--audit-history)');

  lines.push('\n---\n');

  // Section B: Executive Summary
  lines.push('## 1. Executive Summary\n');
  lines.push(doc.executiveSummary);
  lines.push('\n---\n');

  // Section C: Project Overview
  lines.push('## 2. Project Overview\n');
  lines.push(`- **Purpose:** ${doc.projectOverview.purpose}`);
  lines.push(`- **Scope:** ${doc.projectOverview.scope}`);
  lines.push(`- **Operational Status:** ${doc.projectOverview.operationalStatus}`);
  lines.push(`- **Connected Sources:** ${doc.projectOverview.connectedSourcesCount} document(s) indexed`);
  lines.push('\n---\n');

  // Section D: Important Decisions
  lines.push(`## 3. Important Architectural Decisions (${counts.decisions})\n`);
  if (doc.decisions.length === 0) {
    lines.push('_No approved architectural decisions recorded._\n');
  } else {
    doc.decisions.forEach((d, i) => {
      const isUncertain = d.status === 'UNCERTAIN' || d.claimStatus === 'UNCERTAIN';
      lines.push(`### 3.${i + 1} ${d.title}`);
      lines.push(`- **Status:** ${d.status} (${d.confidence}% confidence)${isUncertain ? ' — *Accepted with Uncertainty*' : ''}`);
      lines.push(`- **Summary:** ${d.summary}`);
      if (d.reasoning) lines.push(`- **Reasoning:** ${d.reasoning}`);
      if (d.impact) lines.push(`- **Operational Impact:** ${d.impact}`);
      if (d.owner) lines.push(`- **Domain Owner:** ${d.owner}`);
      if (isUncertain && d.reviewerNotes) {
        lines.push(`- **Reviewer Justification:** ${d.reviewerNotes}`);
      }
      if (d.citations && d.citations.length > 0) {
        lines.push(`- **Citations:** ${d.citations.map((c) => `${c.sourceName} (${c.lineRange})`).join('; ')}`);
      }
      lines.push('');
    });
  }
  lines.push('---\n');

  // Section E: Pending Tasks
  lines.push(`## 4. Pending Operational Tasks (${counts.tasks})\n`);
  if (doc.tasks.length === 0) {
    lines.push('_No pending operational tasks recorded._\n');
  } else {
    doc.tasks.forEach((t, i) => {
      lines.push(`### 4.${i + 1} [${(t.urgency || 'MEDIUM').toUpperCase()}] ${t.title}`);
      lines.push(`- **Assignee:** ${t.owner || 'Unassigned'}`);
      lines.push(`- **Priority:** ${t.urgency || 'medium'}`);
      lines.push(`- **Details:** ${t.summary}`);
      if (t.citations && t.citations.length > 0) {
        lines.push(`- **Source Reference:** ${t.citations.map((c) => `${c.sourceName} (${c.lineRange})`).join('; ')}`);
      }
      lines.push('');
    });
  }
  lines.push('---\n');

  // Section F: Responsibilities
  lines.push('## 5. Responsibilities & Ownership\n');
  if (doc.responsibilities.assigned.length > 0) {
    lines.push('### Documented Ownership:');
    doc.responsibilities.assigned.forEach((a) => {
      lines.push(`- **${a.owner}:** ${a.tasksCount} task(s) — ${a.taskTitles.join(', ')}`);
    });
  }
  if (doc.responsibilities.unassignedCount > 0) {
    lines.push(`\n### ⚠️ Unassigned Responsibilities (${doc.responsibilities.unassignedCount}):`);
    doc.responsibilities.unassignedTasks.forEach((u) => {
      lines.push(`- **${u.title}** [${(u.urgency || 'MEDIUM').toUpperCase()}]: ${u.summary}`);
    });
  } else {
    lines.push('\n_All operational tasks have documented assignments._');
  }
  lines.push('\n---\n');

  // Section G: Risks & Mitigations
  lines.push(`## 6. Risks & Mitigations (${counts.risks})\n`);
  if (doc.risks.length === 0) {
    lines.push('_No operational risks recorded._\n');
  } else {
    doc.risks.forEach((r, i) => {
      lines.push(`### 6.${i + 1} [${(r.urgency || 'MEDIUM').toUpperCase()}] ${r.title}`);
      lines.push(`- **Severity:** ${r.urgency || 'medium'}`);
      lines.push(`- **Assessment:** ${r.summary}`);
      if (r.impact) lines.push(`- **Potential Impact:** ${r.impact}`);
      if (r.reviewerNotes) lines.push(`- **Mitigation Strategy:** ${r.reviewerNotes}`);
      if (r.citations && r.citations.length > 0) {
        lines.push(`- **Source Reference:** ${r.citations.map((c) => `${c.sourceName} (${c.lineRange})`).join('; ')}`);
      }
      lines.push('');
    });
  }
  lines.push('---\n');

  // Section H: Technical Dependencies & Integrations
  lines.push(`## 7. Technical Dependencies & Integrations (${counts.dependencies})\n`);
  if (doc.dependencies.length === 0) {
    lines.push('_No external or inter-module dependencies recorded._\n');
  } else {
    doc.dependencies.forEach((d, i) => {
      lines.push(`### 7.${i + 1} ${d.title}`);
      lines.push(`- **Category:** ${d.category || 'System'}`);
      lines.push(`- **Details:** ${d.summary}`);
      if (d.owner) lines.push(`- **Owner:** ${d.owner}`);
      if (d.citations && d.citations.length > 0) {
        lines.push(`- **Evidence:** ${d.citations.map((c) => `${c.sourceName} (${c.lineRange})`).join('; ')}`);
      }
      lines.push('');
    });
  }
  lines.push('---\n');

  // Section I: Unresolved Questions
  lines.push(`## 8. Unresolved Questions (${counts.questions})\n`);
  if (doc.unresolvedQuestions.length === 0) {
    lines.push('_No open architectural or operational questions pending._\n');
  } else {
    doc.unresolvedQuestions.forEach((q, i) => {
      lines.push(`### 8.${i + 1} ${q.title}`);
      lines.push(`- **Context:** ${q.summary}`);
      if (q.citations && q.citations.length > 0) {
        lines.push(`- **Source:** ${q.citations.map((c) => `${c.sourceName} (${c.lineRange})`).join('; ')}`);
      }
      lines.push('');
    });
  }
  lines.push('---\n');

  // Section J: Recommended Next Actions
  lines.push(`## 9. Recommended Next Actions (${counts.nextActions})\n`);
  lines.push('### 🔴 Immediate Priorities:');
  if (doc.recommendedNextActions.immediate.length === 0) {
    lines.push('_No critical/immediate blockers._');
  } else {
    doc.recommendedNextActions.immediate.forEach((a) => {
      lines.push(`- **[${(a.urgency || 'HIGH').toUpperCase()}] ${a.title}**: ${a.summary} (Assignee: ${a.owner || 'Unassigned'})`);
    });
  }

  lines.push('\n### 🟡 Short-Term Actions:');
  if (doc.recommendedNextActions.shortTerm.length === 0) {
    lines.push('_No medium-term items._');
  } else {
    doc.recommendedNextActions.shortTerm.forEach((a) => {
      lines.push(`- **${a.title}**: ${a.summary} (Assignee: ${a.owner || 'Unassigned'})`);
    });
  }

  lines.push('\n### 🟢 Follow-Up Actions:');
  if (doc.recommendedNextActions.followUp.length === 0) {
    lines.push('_No low-priority follow-ups._');
  } else {
    doc.recommendedNextActions.followUp.forEach((a) => {
      lines.push(`- **${a.title}**: ${a.summary}`);
    });
  }
  lines.push('\n---\n');

  // Section K: Evidence & Source References
  lines.push(`## 10. Evidence & Source References (${doc.evidenceInventory.length})\n`);
  doc.evidenceInventory.forEach((item, idx) => {
    lines.push(`### 10.${idx + 1} [${item.findingType.toUpperCase()}] ${item.findingTitle}`);
    lines.push(`- **Grounding Status:** ${item.status}${item.isAcceptedUncertain ? ' *(Accepted with Uncertainty)*' : ''}`);
    if (item.reviewerJustification) {
      lines.push(`- **Reviewer Justification:** ${item.reviewerJustification}`);
    }
    item.citations.forEach((c) => {
      lines.push(`  - \`${c.sourceName}\` [${c.lineRange}]: &ldquo;${c.snippet}&rdquo;`);
    });
    lines.push('');
  });
  lines.push('---\n');

  // Section L: Human Review & Audit History
  lines.push('## 11. Human Review & Audit History\n');
  lines.push(`- **Approved Claims:** ${doc.reviewHistory.approvedCount}`);
  lines.push(`- **Accepted Uncertain Claims:** ${doc.reviewHistory.acceptedUncertainCount}`);
  lines.push(`- **Rejected Claims Excluded:** ${doc.reviewHistory.rejectedCount}`);
  lines.push(`- **Resolved Contradictions:** ${doc.reviewHistory.resolvedConflictsCount}`);
  lines.push('\n### Chronological Review Trail:');
  if (doc.reviewHistory.auditActions.length === 0) {
    lines.push('_Direct approval recorded during initial sign-off._');
  } else {
    doc.reviewHistory.auditActions.forEach((action) => {
      lines.push(`- **${action.actionType}** (${new Date(action.timestamp).toLocaleDateString()} by ${action.reviewerName}): ${action.previousStatus} → ${action.newStatus}${action.reviewerNotes ? ` — *"${action.reviewerNotes}"*` : ''}`);
    });
  }

  lines.push('\n---\n*Certified engineering handover generated by KnoTrail Platform.*');

  return lines.join('\n');
}

/**
 * Generates structured JSON export from HandoverDocument.
 * 100% data parity with Markdown export.
 */
export function exportHandoverJson(doc: HandoverDocument): string {
  return JSON.stringify(doc, null, 2);
}

/**
 * Generates standalone, styled HTML document optimized for A4 PDF printing.
 */
export function generatePrintableHtml(doc: HandoverDocument): string {
  const meta = doc.metadata;
  const counts = doc.sectionCounts;

  const escapeHtml = (str: string = '') =>
    str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(meta.projectName)} — Handover Dossier</title>
<style>
  @page {
    size: A4;
    margin: 18mm 16mm 18mm 16mm;
  }
  @media print {
    body {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page-break {
      page-break-before: always;
      break-before: page;
    }
    .no-break {
      page-break-inside: avoid;
      break-inside: avoid;
    }
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #1a211b;
    background-color: #ffffff;
    line-height: 1.5;
    font-size: 11pt;
    margin: 0;
    padding: 0;
  }
  .header-card {
    border: 1px solid #d0d8ce;
    border-radius: 8px;
    padding: 18px;
    background: #f4f7f3;
    margin-bottom: 20px;
  }
  .badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 9999px;
    font-size: 8pt;
    font-weight: 600;
    text-transform: uppercase;
  }
  .badge-certified {
    background: #c3eed0;
    color: #0b4522;
  }
  .badge-uncertain {
    background: #fee7aa;
    color: #5d4300;
  }
  .badge-urgent {
    background: #ffdad6;
    color: #410002;
  }
  h1 { font-size: 20pt; margin: 4px 0 8px 0; color: #1a211b; }
  h2 { font-size: 13pt; border-bottom: 1px solid #d0d8ce; padding-bottom: 4px; margin-top: 22px; color: #1e3a24; }
  h3 { font-size: 11pt; margin: 12px 0 4px 0; color: #202822; }
  p { margin: 4px 0 8px 0; }
  .item-card {
    border: 1px solid #e1e7df;
    border-radius: 6px;
    padding: 10px 14px;
    margin-bottom: 10px;
    background: #fafbfa;
  }
  .meta-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    font-size: 9pt;
    color: #4f5a4e;
    margin-top: 10px;
  }
  .quote {
    font-style: italic;
    color: #3b453a;
    border-left: 2px solid #5a7b60;
    padding-left: 8px;
    margin: 4px 0;
    font-size: 9pt;
  }
  .footer {
    margin-top: 30px;
    border-top: 1px solid #d0d8ce;
    padding-top: 10px;
    font-size: 8pt;
    color: #707b6e;
    display: flex;
    justify-content: space-between;
  }
</style>
</head>
<body>

<div class="header-card">
  <div style="display: flex; justify-content: space-between; align-items: center;">
    <span style="font-size: 9pt; color: #5a7b60; font-weight: bold; letter-spacing: 0.05em;">KNOTRAIL HANDOVER DOSSIER</span>
    <span class="badge badge-certified">Certified &amp; Signed Off</span>
  </div>
  <h1>${escapeHtml(meta.projectName)}</h1>
  <p style="font-size: 10pt; color: #4f5a4e; margin: 0;">${escapeHtml(meta.description)}</p>
  <div class="meta-grid">
    <div><strong>Audit Stamp:</strong> ${escapeHtml(meta.auditStamp)}</div>
    <div><strong>Version:</strong> ${escapeHtml(meta.version)}</div>
    <div><strong>Certified By:</strong> ${escapeHtml(doc.certifiedBy)} (${escapeHtml(doc.certifiedDate)})</div>
    <div><strong>Target Exit Date:</strong> ${escapeHtml(meta.targetExitDate)}</div>
    <div><strong>Certification Hash:</strong> <code>${escapeHtml(doc.certificationHash.slice(0, 24))}...</code></div>
    <div><strong>Approved Claims:</strong> ${counts.totalApprovedFindings} verified findings</div>
  </div>
</div>

<h2>1. Executive Summary</h2>
<p style="line-height: 1.6;">${escapeHtml(doc.executiveSummary)}</p>

<h2>2. Project Overview</h2>
<p><strong>Purpose:</strong> ${escapeHtml(doc.projectOverview.purpose)}</p>
<p><strong>Scope:</strong> ${escapeHtml(doc.projectOverview.scope)}</p>
<p><strong>Status:</strong> ${escapeHtml(doc.projectOverview.operationalStatus)} (${doc.projectOverview.connectedSourcesCount} sources connected)</p>

<h2>3. Important Architectural Decisions (${counts.decisions})</h2>
${doc.decisions.map((d, i) => `
<div class="item-card no-break">
  <div style="display: flex; justify-content: space-between;">
    <h3>3.${i + 1} ${escapeHtml(d.title)}</h3>
    ${(d.status === 'UNCERTAIN' || d.claimStatus === 'UNCERTAIN') ? '<span class="badge badge-uncertain">Accepted with Uncertainty</span>' : '<span class="badge badge-certified">Verified</span>'}
  </div>
  <p>${escapeHtml(d.summary)}</p>
  ${d.reasoning ? `<p style="font-size: 9.5pt; color: #3b453a;"><strong>Reasoning:</strong> ${escapeHtml(d.reasoning)}</p>` : ''}
  ${d.impact ? `<p style="font-size: 9.5pt; color: #3b453a;"><strong>Impact:</strong> ${escapeHtml(d.impact)}</p>` : ''}
  ${d.reviewerNotes && (d.status === 'UNCERTAIN' || d.claimStatus === 'UNCERTAIN') ? `<p style="font-size: 9pt; color: #735100;"><strong>Reviewer Justification:</strong> ${escapeHtml(d.reviewerNotes)}</p>` : ''}
  ${d.citations && d.citations.length > 0 ? `<div class="quote">${escapeHtml(d.citations[0].snippet)} <span style="font-size: 8pt; color: #707b6e;">(${escapeHtml(d.citations[0].sourceName)} ${escapeHtml(d.citations[0].lineRange)})</span></div>` : ''}
</div>
`).join('')}

<div class="page-break"></div>

<h2>4. Pending Operational Tasks (${counts.tasks})</h2>
${doc.tasks.map((t, i) => `
<div class="item-card no-break">
  <div style="display: flex; justify-content: space-between;">
    <h3>4.${i + 1} ${escapeHtml(t.title)}</h3>
    <span class="badge ${t.urgency === 'critical' || t.urgency === 'high' ? 'badge-urgent' : 'badge-certified'}">${escapeHtml(t.urgency || 'MEDIUM')}</span>
  </div>
  <p>${escapeHtml(t.summary)}</p>
  <p style="font-size: 9pt; color: #4f5a4e;"><strong>Assignee:</strong> ${escapeHtml(t.owner || 'Unassigned')}</p>
</div>
`).join('')}

<h2>5. Responsibilities &amp; Ownership</h2>
${doc.responsibilities.assigned.map((a) => `
<p><strong>${escapeHtml(a.owner)}:</strong> ${a.tasksCount} task(s) (${escapeHtml(a.taskTitles.join(', '))})</p>
`).join('')}
${doc.responsibilities.unassignedCount > 0 ? `
<p style="color: #ba1a1a;"><strong>⚠️ Unassigned Tasks (${doc.responsibilities.unassignedCount}):</strong></p>
<ul>
  ${doc.responsibilities.unassignedTasks.map((u) => `<li>${escapeHtml(u.title)} [${escapeHtml(u.urgency || 'MEDIUM')}]</li>`).join('')}
</ul>
` : '<p style="color: #0b4522;">All operational tasks have documented assignments.</p>'}

<h2>6. Risks &amp; Mitigations (${counts.risks})</h2>
${doc.risks.map((r, i) => `
<div class="item-card no-break">
  <div style="display: flex; justify-content: space-between;">
    <h3>6.${i + 1} ${escapeHtml(r.title)}</h3>
    <span class="badge ${r.urgency === 'critical' || r.urgency === 'high' ? 'badge-urgent' : 'badge-certified'}">${escapeHtml(r.urgency || 'MEDIUM')}</span>
  </div>
  <p>${escapeHtml(r.summary)}</p>
  ${r.reviewerNotes ? `<p style="font-size: 9pt; color: #0b4522;"><strong>Mitigation:</strong> ${escapeHtml(r.reviewerNotes)}</p>` : ''}
</div>
`).join('')}

<h2>7. Technical Dependencies &amp; Integrations (${counts.dependencies})</h2>
${doc.dependencies.map((dep, i) => `
<div class="item-card no-break">
  <h3>7.${i + 1} ${escapeHtml(dep.title)} (${escapeHtml(dep.category || 'System')})</h3>
  <p>${escapeHtml(dep.summary)}</p>
</div>
`).join('')}

<h2>8. Recommended Next Actions (${counts.nextActions})</h2>
<p><strong>Immediate Priorities:</strong></p>
<ul>
  ${doc.recommendedNextActions.immediate.map((a) => `<li><strong>${escapeHtml(a.title)}:</strong> ${escapeHtml(a.summary)}</li>`).join('')}
</ul>
<p><strong>Short-Term Actions:</strong></p>
<ul>
  ${doc.recommendedNextActions.shortTerm.map((a) => `<li><strong>${escapeHtml(a.title)}:</strong> ${escapeHtml(a.summary)}</li>`).join('')}
</ul>

<div class="page-break"></div>

<h2>9. Traceable Evidence &amp; Citations (${doc.evidenceInventory.length})</h2>
${doc.evidenceInventory.slice(0, 10).map((ev, i) => `
<div class="item-card no-break" style="font-size: 9pt;">
  <strong>[${escapeHtml(ev.findingType.toUpperCase())}] ${escapeHtml(ev.findingTitle)}</strong>
  <span style="color: #5a7b60;">(${escapeHtml(ev.status)})</span>
  ${ev.citations.map((c) => `<div class="quote">&ldquo;${escapeHtml(c.snippet)}&rdquo; — <em>${escapeHtml(c.sourceName)} (${escapeHtml(c.lineRange)})</em></div>`).join('')}
</div>
`).join('')}
${doc.evidenceInventory.length > 10 ? `<p style="font-size: 9pt; color: #707b6e;">+ ${doc.evidenceInventory.length - 10} additional verified citations in digital dossier.</p>` : ''}

<h2>10. Review &amp; Certification Attestation</h2>
<div class="item-card no-break" style="background: #eef3ed; border-color: #9cb59f;">
  <p><strong>Formal Review Certification</strong></p>
  <p style="font-size: 9.5pt;">Certified by <strong>${escapeHtml(doc.certifiedBy)}</strong> on ${escapeHtml(doc.certifiedDate)}.</p>
  <p style="font-size: 8.5pt; font-family: monospace; color: #3b453a;">Cryptographic Seal: ${escapeHtml(doc.certificationHash)}</p>
</div>

<div class="footer">
  <span>KnoTrail — Knowledge Never Leaves a Trail Behind</span>
  <span>Page 1 of Printable Dossier</span>
</div>

</body>
</html>`;
}

