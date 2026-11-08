'use client';

import React, { useState } from 'react';
import { useProject } from '../../context/ProjectContext';
import {
  getHandoverDecisions,
  getHandoverTasks,
  getHandoverRisks,
  getHandoverDependencies,
  generateHandoverMarkdown,
  generateHandoverJSON,
} from '../../lib/handoverFilter';

export function HandoverView() {
  const { project, stats, setActiveView } = useProject();
  const [copySuccess, setCopySuccess] = useState(false);

  // Filtered findings: Only approved and non-rejected findings appear in the final handover
  const approvedDecisions = getHandoverDecisions(project.findings);
  const approvedTasks = getHandoverTasks(project.findings);
  const approvedRisks = getHandoverRisks(project.findings);
  const approvedDependencies = getHandoverDependencies(project.findings);

  // Export to Markdown using the central, strictly filtered generator
  const handleExportMarkdown = () => {
    const md = generateHandoverMarkdown(project);
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KnoTrail-Handover-${project.code}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export to JSON using the central, strictly filtered generator
  const handleExportJSON = () => {
    const data = generateHandoverJSON(project);
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KnoTrail-Handover-${project.code}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleShareLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard?.writeText(window.location.href);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  // GATING CONDITION: Handover generation must be blocked until all required findings are reviewed and critical conflicts are resolved.
  if (stats.isHandoverBlocked) {
    return (
      <div className="flex flex-col w-full gap-space-lg animate-in fade-in duration-200">
        {/* Gate Enforcement Banner */}
        <section className="bg-surface-container-lowest rounded-xl p-space-2xl shadow-sm border border-outline-variant/30 flex flex-col items-center text-center max-w-3xl mx-auto my-space-lg">
          <div className="w-16 h-16 rounded-2xl bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center mb-space-md shadow-xs">
            <span className="material-symbols-outlined text-[36px]">lock</span>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container text-outline font-mono text-xs uppercase tracking-wider mb-space-sm border border-outline-variant/30">
            <span>Audit Protocol 4.1 Gate Enforced</span>
          </div>

          <h1 className="font-display-lg text-display-lg text-on-surface tracking-tight">
            Handover Dossier Locked
          </h1>

          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl mt-2 leading-relaxed">
            In accordance with KnoTrail Governance, a handover package cannot be previewed, certified, or exported until all findings are human-reviewed and any conflicting evidence is resolved.
          </p>

          {/* Blocking Diagnostics Card */}
          <div className="w-full bg-surface-container-low rounded-xl p-space-md border border-outline-variant/30 my-space-lg text-left text-xs space-y-2">
            <div className="font-semibold text-on-surface flex items-center justify-between pb-1 border-b border-outline-variant/20">
              <span>Gate Diagnostic Summary</span>
              <span className="font-mono text-primary font-bold">
                {stats.approvedCount}/{stats.totalFindings} Reviewed
              </span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="flex items-center gap-1.5 text-on-surface">
                <span
                  className={`material-symbols-outlined text-[16px] ${
                    stats.unresolvedConflictsCount > 0 ? 'text-error' : 'text-primary'
                  }`}
                >
                  {stats.unresolvedConflictsCount > 0 ? 'error' : 'check_circle'}
                </span>
                <span>Unresolved Architectural Conflicts:</span>
              </span>
              <span
                className={`font-semibold px-2 py-0.5 rounded-full ${
                  stats.unresolvedConflictsCount > 0
                    ? 'bg-error-container text-on-error-container'
                    : 'bg-secondary-container text-on-secondary-container'
                }`}
              >
                {stats.unresolvedConflictsCount} Active
              </span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="flex items-center gap-1.5 text-on-surface">
                <span
                  className={`material-symbols-outlined text-[16px] ${
                    stats.unreviewedCount > 0 ? 'text-tertiary' : 'text-primary'
                  }`}
                >
                  {stats.unreviewedCount > 0 ? 'pending' : 'check_circle'}
                </span>
                <span>Unreviewed Findings:</span>
              </span>
              <span
                className={`font-semibold px-2 py-0.5 rounded-full ${
                  stats.unreviewedCount > 0
                    ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                    : 'bg-secondary-container text-on-secondary-container'
                }`}
              >
                {stats.unreviewedCount} Pending
              </span>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="flex items-center gap-1.5 text-on-surface">
                <span
                  className={`material-symbols-outlined text-[16px] ${
                    project.handoverCertified ? 'text-primary' : 'text-outline'
                  }`}
                >
                  {project.handoverCertified ? 'verified' : 'draw'}
                </span>
                <span>Formal Human Certification:</span>
              </span>
              <span className="font-semibold text-outline">
                {project.handoverCertified ? 'Certified' : 'Signature Pending'}
              </span>
            </div>

            <p className="text-[11px] text-on-surface-variant pt-2 border-t border-outline-variant/20 italic">
              Reason: {stats.handoverBlockReason}
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-space-sm">
            <button
              onClick={() => setActiveView('review')}
              className="inline-flex items-center gap-2 px-space-lg py-space-sm bg-primary hover:bg-primary-container text-on-primary rounded-lg font-headline-sm text-headline-sm shadow-md transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px]">rule</span>
              <span>Go to Review Center to Resolve Blockers</span>
            </button>
            <button
              onClick={() => setActiveView('evidence')}
              className="inline-flex items-center gap-2 px-space-md py-space-sm bg-surface-container hover:bg-surface-container-high text-on-surface rounded-lg font-label-md text-label-md transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">fact_check</span>
              <span>Inspect Evidence Explorer</span>
            </button>
          </div>
        </section>
      </div>
    );
  }

  // UNLOCKED HANDOVER DOSSIER (Rendered only when all findings are reviewed, conflicts resolved, or certified)
  return (
    <div className="flex flex-col w-full gap-space-lg animate-in fade-in duration-200">
      {/* Dossier Header & Document Actions Bar */}
      <section className="bg-surface-container-lowest rounded-xl shadow-[0_4px_20px_-2px_rgba(32,40,34,0.04),0_2px_6px_-1px_rgba(32,40,34,0.02)] p-space-xl flex flex-col gap-space-md border border-outline-variant/30">
        <div className="flex flex-wrap items-center justify-between gap-space-md">
          {/* Breadcrumb & Title */}
          <div className="flex flex-col gap-space-2xs min-w-0">
            <div className="flex items-center gap-space-xs font-label-sm text-label-sm text-outline">
              <span
                onClick={() => setActiveView('workspace')}
                className="hover:text-primary cursor-pointer transition-colors"
              >
                Projects
              </span>
              <span className="material-symbols-outlined text-[13px]">chevron_right</span>
              <span
                onClick={() => setActiveView('workspace')}
                className="hover:text-primary cursor-pointer transition-colors"
              >
                {project.name}
              </span>
              <span className="material-symbols-outlined text-[13px]">chevron_right</span>
              <span className="text-on-surface font-semibold">Final Dossier v1.0</span>
            </div>

            <div className="flex items-center gap-space-sm mt-1 flex-wrap">
              <h1 className="font-display-lg text-display-lg text-on-surface tracking-tight">
                {project.name} Engineering Handover Dossier
              </h1>

              {/* CONDITIONAL CERTIFICATION BADGE */}
              {project.handoverCertified ? (
                <span className="inline-flex items-center gap-1.5 px-space-sm py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-semibold border border-primary/20">
                  <span className="material-symbols-outlined text-[16px] text-primary">verified</span>
                  <span>Certified &amp; Signed Off</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-space-sm py-1 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm font-semibold border border-tertiary/20">
                  <span className="material-symbols-outlined text-[16px] text-tertiary">pending</span>
                  <span>Draft / Uncertified</span>
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-space-xs flex-wrap" id="action-bar">
            <button
              onClick={handleShareLink}
              className="inline-flex items-center gap-1.5 px-space-sm py-2 rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container transition-colors font-label-md text-label-md border border-outline-variant/30"
            >
              <span className="material-symbols-outlined text-[17px]">
                {copySuccess ? 'check' : 'link'}
              </span>
              <span>{copySuccess ? 'Link Copied!' : 'Share Link'}</span>
            </button>

            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-space-sm py-2 rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container transition-colors font-label-md text-label-md border border-outline-variant/30"
            >
              <span className="material-symbols-outlined text-[17px]">print</span>
              <span>Print View</span>
            </button>

            <button
              onClick={handleExportMarkdown}
              className="inline-flex items-center gap-1.5 px-space-sm py-2 rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container transition-colors font-label-md text-label-md border border-outline-variant/30"
            >
              <span className="material-symbols-outlined text-[17px]">markdown</span>
              <span>Export Markdown</span>
            </button>

            <button
              onClick={handleExportJSON}
              className="inline-flex items-center gap-1.5 px-space-md py-2 rounded-lg bg-primary text-on-primary hover:bg-inverse-surface shadow-sm transition-all font-label-md text-label-md"
            >
              <span className="material-symbols-outlined text-[17px]">data_object</span>
              <span>Export JSON</span>
            </button>
          </div>
        </div>

        {/* Metadata Strip */}
        <div className="flex flex-wrap items-center gap-y-2 gap-x-space-lg pt-space-xs text-outline font-label-md text-label-md border-t border-outline-variant/20">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[17px] text-primary">tag</span>
            <span>
              Audit Stamp:{' '}
              <strong className="text-on-surface font-mono">
                {project.handoverCertified ? `#KT-9921-${project.code}` : '#DRAFT-PENDING'}
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[17px] text-primary">person</span>
            <span>
              Outgoing Lead: <strong className="text-on-surface">{project.lead.name}</strong>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[17px] text-secondary">transfer_within_a_station</span>
            <span>
              Incoming Lead:{' '}
              <strong className="text-on-surface">
                {project.stakeholders[1]?.name || 'Assigned Successor'}
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[17px] text-outline">calendar_today</span>
            <span>
              Target Date: <strong className="text-on-surface">{project.targetExitDate}</strong>
            </span>
          </div>
        </div>
      </section>

      {/* EXECUTIVE SUMMARY */}
      <section className="bg-surface-container-lowest rounded-xl p-space-xl border border-outline-variant/30 shadow-sm flex flex-col gap-space-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary-fixed text-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-[18px]">summarize</span>
          </div>
          <h2 className="font-headline-md text-headline-md text-on-surface font-semibold">
            Executive Transition Summary
          </h2>
        </div>
        <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed">
          {project.executiveSummary}
        </p>
      </section>

      {/* 1. ARCHITECTURAL DECISIONS LEDGER (Approved only) */}
      <section className="bg-surface-container-lowest rounded-xl p-space-xl border border-outline-variant/30 shadow-sm flex flex-col gap-space-md">
        <div className="flex items-center justify-between border-b border-outline-variant/20 pb-space-xs">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[22px]">gavel</span>
            <h2 className="font-headline-md text-headline-md text-on-surface font-semibold">
              1. Verified Architectural Decisions &amp; Rationale ({approvedDecisions.length})
            </h2>
          </div>
          <span className="text-xs text-outline font-mono">Approved by Reviewer</span>
        </div>

        {approvedDecisions.length > 0 ? (
          <div className="space-y-space-md">
            {approvedDecisions.map((decision, index) => (
              <div
                key={decision.id}
                className="bg-surface-container-low/50 rounded-xl p-space-md border border-outline-variant/30 flex flex-col gap-space-xs"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-primary">D-0{index + 1}</span>
                    <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                      {decision.title}
                    </h3>
                  </div>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container">
                    {decision.status}
                  </span>
                </div>

                <p className="text-xs text-on-surface-variant leading-relaxed">{decision.summary}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1 text-[11px] bg-surface-container-lowest p-2 rounded border border-outline-variant/20">
                  <div>
                    <strong className="text-secondary">Reasoning: </strong>
                    <span className="text-on-surface-variant">{decision.reasoning}</span>
                  </div>
                  <div>
                    <strong className="text-secondary">Impact: </strong>
                    <span className="text-on-surface-variant">{decision.impact}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[10px] text-outline font-mono pt-1">
                  <span>Owner: {decision.owner}</span>
                  <span>•</span>
                  <span>Citations: {decision.citations.map((c) => `${c.file}:${c.lineRange}`).join(', ')}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-outline italic">No approved decisions included in this handover.</p>
        )}
      </section>

      {/* 2. OPERATIONAL TASKS & RESPONSIBILITIES (Approved only) */}
      <section className="bg-surface-container-lowest rounded-xl p-space-xl border border-outline-variant/30 shadow-sm flex flex-col gap-space-md">
        <div className="flex items-center justify-between border-b border-outline-variant/20 pb-space-xs">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-[22px]">checklist</span>
            <h2 className="font-headline-md text-headline-md text-on-surface font-semibold">
              2. Operational Tasks &amp; Runbook Handover ({approvedTasks.length})
            </h2>
          </div>
          <span className="text-xs text-error font-medium">Approved Action Items</span>
        </div>

        {approvedTasks.length > 0 ? (
          <div className="space-y-space-sm">
            {approvedTasks.map((task) => (
              <div
                key={task.id}
                className="bg-surface-container-low/50 rounded-xl p-space-md border border-outline-variant/30 flex items-start justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">
                    check_circle
                  </span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-label-md text-label-md text-on-surface font-semibold">
                        {task.title}
                      </h3>
                      <span className="text-[10px] bg-error-container text-on-error-container px-2 py-0.2 rounded font-bold uppercase">
                        {task.urgency}
                      </span>
                    </div>
                    <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">
                      {task.summary}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0 text-xs">
                  <span className="text-outline block">Assignee</span>
                  <span className="font-semibold text-on-surface">{task.owner}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-outline italic">No approved operational tasks included.</p>
        )}
      </section>

      {/* 3. RISK REGISTER & MITIGATIONS (Approved only) */}
      <section className="bg-surface-container-lowest rounded-xl p-space-xl border border-outline-variant/30 shadow-sm flex flex-col gap-space-md">
        <div className="flex items-center justify-between border-b border-outline-variant/20 pb-space-xs">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-error text-[22px]">warning</span>
            <h2 className="font-headline-md text-headline-md text-on-surface font-semibold">
              3. Operational Risk Register &amp; Mitigations ({approvedRisks.length})
            </h2>
          </div>
          <span className="text-xs text-outline font-mono">Mitigation Tracked</span>
        </div>

        {approvedRisks.length > 0 ? (
          <div className="space-y-space-sm">
            {approvedRisks.map((risk) => (
              <div
                key={risk.id}
                className="bg-surface-container-low/50 rounded-xl p-space-md border border-outline-variant/30 flex items-start justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-tertiary text-[20px] mt-0.5">
                    report_problem
                  </span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-label-md text-label-md text-on-surface font-semibold">
                        {risk.title}
                      </h3>
                      <span className="text-[10px] bg-error-container text-on-error-container px-2 py-0.2 rounded font-bold uppercase">
                        {risk.urgency}
                      </span>
                    </div>
                    <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">
                      {risk.summary}
                    </p>
                    {risk.reviewerNotes && (
                      <p className="text-[11px] text-secondary font-medium mt-1">
                        Mitigation: {risk.reviewerNotes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0 text-xs">
                  <span className="text-outline block">Risk Owner</span>
                  <span className="font-semibold text-on-surface">{risk.owner}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-outline italic">No approved risks listed.</p>
        )}
      </section>

      {/* 4. TECHNICAL DEPENDENCIES & CROSS-SERVICE INTEGRATIONS (Approved only) */}
      <section className="bg-surface-container-lowest rounded-xl p-space-xl border border-outline-variant/30 shadow-sm flex flex-col gap-space-md">
        <div className="flex items-center justify-between border-b border-outline-variant/20 pb-space-xs">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[22px]">hub</span>
            <h2 className="font-headline-md text-headline-md text-on-surface font-semibold">
              4. Verified Technical Dependencies &amp; Integrations ({approvedDependencies.length})
            </h2>
          </div>
          <span className="text-xs text-outline font-mono">Infrastructure Grounded</span>
        </div>

        {approvedDependencies.length > 0 ? (
          <div className="space-y-space-sm">
            {approvedDependencies.map((dep) => (
              <div
                key={dep.id}
                className="bg-surface-container-low/50 rounded-xl p-space-md border border-outline-variant/30 flex items-start justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">
                    lan
                  </span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-label-md text-label-md text-on-surface font-semibold">
                        {dep.title}
                      </h3>
                      <span className="text-[10px] bg-secondary-container text-on-secondary-container px-2 py-0.2 rounded font-bold font-mono">
                        {dep.category}
                      </span>
                    </div>
                    <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">
                      {dep.summary}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0 text-xs">
                  <span className="text-outline block">Domain Owner</span>
                  <span className="font-semibold text-on-surface">{dep.owner}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-outline italic">No approved technical dependencies included.</p>
        )}
      </section>

      {/* 5. 30-DAY TRANSITION ROADMAP */}
      <section className="bg-surface-container-lowest rounded-xl p-space-xl border border-outline-variant/30 shadow-sm flex flex-col gap-space-md">
        <div className="flex items-center gap-2 border-b border-outline-variant/20 pb-space-xs">
          <span className="material-symbols-outlined text-primary text-[22px]">timeline</span>
          <h2 className="font-headline-md text-headline-md text-on-surface font-semibold">
            5. The 30-Day Transition Roadmap
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
          <div className="bg-surface-container-low p-space-md rounded-xl border border-outline-variant/30 flex flex-col gap-2">
            <span className="font-mono text-xs font-bold text-primary uppercase">Days 1 – 7</span>
            <h4 className="font-headline-sm text-headline-sm text-on-surface">Shadow &amp; Credential Handover</h4>
            <ul className="text-xs text-on-surface-variant space-y-1.5 list-disc list-inside">
              <li>Marcus Vance assumption of EKS cluster admin permissions</li>
              <li>Dry run execution of manual DB rollback key procedure</li>
              <li>Joint review of Kafka StickyAssignor lag metrics</li>
            </ul>
          </div>

          <div className="bg-surface-container-low p-space-md rounded-xl border border-outline-variant/30 flex flex-col gap-2">
            <span className="font-mono text-xs font-bold text-secondary uppercase">Days 8 – 14</span>
            <h4 className="font-headline-sm text-headline-sm text-on-surface">Primary Operational Shift</h4>
            <ul className="text-xs text-on-surface-variant space-y-1.5 list-disc list-inside">
              <li>Marcus Vance takes over primary PagerDuty on-call rotation</li>
              <li>Execute staging disaster recovery failover drill</li>
              <li>Deploy updated Redis Helm chart (allkeys-lru resolution)</li>
            </ul>
          </div>

          <div className="bg-surface-container-low p-space-md rounded-xl border border-outline-variant/30 flex flex-col gap-2">
            <span className="font-mono text-xs font-bold text-outline uppercase">Days 15 – 30</span>
            <h4 className="font-headline-sm text-headline-sm text-on-surface">Full Autonomy &amp; Key Revocation</h4>
            <ul className="text-xs text-on-surface-variant space-y-1.5 list-disc list-inside">
              <li>Revoke Elena Rostova PGP keys and Vault access policies on July 15</li>
              <li>Sunset legacy webhook adapters and lock Q3 billing ledger</li>
              <li>Formal sign-off presentation to Director of Engineering</li>
            </ul>
          </div>
        </div>
      </section>

      {/* FORMAL SIGN-OFF & CRYPTOGRAPHIC STAMP */}
      <section className="bg-inverse-surface text-inverse-on-surface rounded-xl p-space-xl border border-primary/40 shadow-md flex flex-col gap-space-md print-page-break">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md border-b border-white/10 pb-space-md">
          <div className="flex items-center gap-space-sm">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-on-primary">
              <span className="material-symbols-outlined text-[24px]">verified</span>
            </div>
            <div className="flex flex-col">
              <span className="font-headline-md text-headline-md text-white font-semibold">
                {project.handoverCertified ? 'Formally Certified & Approved' : 'Draft Handover Dossier'}
              </span>
              <span className="text-xs text-inverse-on-surface/70">
                CodersInPune Hackathon 2026 • Knowledge Handover Protocol 4.1
              </span>
            </div>
          </div>

          <div className="flex flex-col text-right font-mono text-xs text-primary-fixed">
            <span>
              {project.handoverCertified ? `CERT-ID: #KT-9921-${project.code}` : 'STATUS: DRAFT'}
            </span>
            <span className="text-[10px] text-inverse-on-surface/60">
              HASH: {project.handoverCertified ? project.certificationHash.slice(0, 32) + '...' : 'PENDING'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-lg pt-2 text-xs">
          <div className="flex flex-col gap-1 border-l-2 border-primary pl-space-md">
            <span className="text-inverse-on-surface/60 uppercase text-[10px]">Outgoing Lead Attestation</span>
            <span className="text-white font-semibold text-sm">{project.lead.name}</span>
            <span className="text-inverse-on-surface/80">Principal Architect &amp; Handover Lead</span>
            <span className="text-primary-fixed font-mono text-[11px] mt-1">
              {project.handoverCertified
                ? `Signed: ${project.certifiedDate || 'July 8, 2025'} • Cryptographically Verified`
                : 'Pending Human Sign-off in Review Center'}
            </span>
          </div>

          <div className="flex flex-col gap-1 border-l-2 border-primary pl-space-md">
            <span className="text-inverse-on-surface/60 uppercase text-[10px]">Incoming Lead Acceptance</span>
            <span className="text-white font-semibold text-sm">
              {project.stakeholders[1]?.name || 'Marcus Vance'}
            </span>
            <span className="text-inverse-on-surface/80">Incoming Architecture Lead &amp; Principal SRE</span>
            <span className="text-primary-fixed font-mono text-[11px] mt-1">
              {project.handoverCertified
                ? `Accepted: ${project.certifiedDate || 'July 8, 2025'} • Full Operational Takeover`
                : 'Pending Acceptance in Review Center'}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
