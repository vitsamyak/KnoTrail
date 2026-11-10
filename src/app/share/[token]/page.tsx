import React from 'react';
import Link from 'next/link';
import { apiClient } from '../../../lib/api-client';
import { exportHandoverMarkdown } from '../../../lib/handoverFilter';
import type { HandoverDocument } from '../../../lib/types';

export const dynamic = 'force-dynamic';

export default async function SharedHandoverPage({
  params,
}: {
  params: { token: string };
}) {
  const token = params.token;
  let handover: HandoverDocument | null = null;
  let projectName = '';
  let errorMsg = '';

  try {
    const result = await apiClient.getSharedHandover(token);
    handover = result.handover;
    projectName = result.projectName;
  } catch (err: any) {
    errorMsg = err.message || 'Share link is invalid, expired, or has been revoked.';
  }

  if (!handover) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant/30 shadow-md flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-error-container text-error flex items-center justify-center">
            <span className="material-symbols-outlined text-[32px]">link_off</span>
          </div>
          <h1 className="text-xl font-bold text-on-surface">Handover Unavailable</h1>
          <p className="text-sm text-on-surface-variant leading-relaxed">{errorMsg}</p>
          <Link
            href="/"
            className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:bg-primary-container transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">home</span>
            <span>Go to KnoTrail Home</span>
          </Link>
        </div>
      </div>
    );
  }

  const meta = handover.metadata;
  const counts = handover.sectionCounts;

  return (
    <div className="min-h-screen bg-background text-on-surface p-4 sm:p-8 flex flex-col items-center">
      <div className="max-w-4xl w-full flex flex-col gap-6">
        {/* Top Navbar */}
        <header className="flex items-center justify-between pb-4 border-b border-outline-variant/20">
          <Link href="/" className="flex items-center gap-2 text-primary font-bold text-lg hover:opacity-80 transition-opacity">
            <span className="material-symbols-outlined text-[26px]">all_inclusive</span>
            <span>KnoTrail</span>
          </Link>
          <span className="text-xs bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full font-semibold flex items-center gap-1">
            <span className="material-symbols-outlined text-[15px]">verified</span>
            <span>Public Read-Only Dossier</span>
          </span>
        </header>

        {/* Cover Header */}
        <div className="bg-surface-container-lowest rounded-2xl p-6 sm:p-8 border border-outline-variant/30 shadow-sm flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-xs font-mono text-outline uppercase tracking-wider block">
                {meta.projectCode} • Handover {meta.version}
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight mt-1">
                {meta.projectName}
              </h1>
              <p className="text-xs sm:text-sm text-on-surface-variant mt-1 leading-relaxed max-w-2xl">
                {meta.description}
              </p>
            </div>
            <div className="flex flex-col items-end text-xs">
              <span className="inline-flex items-center gap-1 font-semibold text-primary bg-primary-fixed px-3 py-1 rounded-full">
                <span className="material-symbols-outlined text-[15px]">verified</span>
                <span>Certified &amp; Approved</span>
              </span>
              <span className="text-[11px] text-outline mt-1 font-mono">
                {meta.auditStamp}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-outline-variant/20 text-xs text-outline">
            <div>
              <span className="block text-[10px] uppercase">Certified Date</span>
              <strong className="text-on-surface">{handover.certifiedDate}</strong>
            </div>
            <div>
              <span className="block text-[10px] uppercase">Certified By</span>
              <strong className="text-on-surface">{handover.certifiedBy}</strong>
            </div>
            <div>
              <span className="block text-[10px] uppercase">Target Exit</span>
              <strong className="text-on-surface">{meta.targetExitDate}</strong>
            </div>
            <div>
              <span className="block text-[10px] uppercase">Total Claims</span>
              <strong className="text-on-surface">{counts.totalApprovedFindings} verified</strong>
            </div>
          </div>
        </div>

        {/* 1. Executive Summary */}
        <section className="bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/30 shadow-xs flex flex-col gap-2">
          <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">summarize</span>
            <span>Executive Transition Summary</span>
          </h2>
          <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
            {handover.executiveSummary}
          </p>
        </section>

        {/* 2. Decisions */}
        <section className="bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/30 shadow-xs flex flex-col gap-3">
          <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">gavel</span>
            <span>Important Decisions ({handover.decisions.length})</span>
          </h2>
          <div className="space-y-3">
            {handover.decisions.map((d, i) => (
              <div key={d.id || i} className="p-3 bg-surface-container-low rounded-lg border border-outline-variant/20 text-xs flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <strong className="text-on-surface text-sm">{d.title}</strong>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-semibold">
                    {d.status}
                  </span>
                </div>
                <p className="text-on-surface-variant leading-relaxed">{d.summary}</p>
                {d.reasoning && (
                  <p className="text-[11px] text-outline">
                    <strong>Reasoning:</strong> {d.reasoning}
                  </p>
                )}
                {d.citations && d.citations.length > 0 && (
                  <blockquote className="mt-1 pl-2 border-l-2 border-primary/40 text-[11px] italic text-on-surface-variant">
                    &ldquo;{d.citations[0].snippet}&rdquo; — {d.citations[0].sourceName} ({d.citations[0].lineRange})
                  </blockquote>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* 3. Tasks */}
        <section className="bg-surface-container-lowest rounded-xl p-6 border border-outline-variant/30 shadow-xs flex flex-col gap-3">
          <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-[20px]">checklist</span>
            <span>Pending Operational Tasks ({handover.tasks.length})</span>
          </h2>
          <div className="space-y-2">
            {handover.tasks.map((t, i) => (
              <div key={t.id || i} className="p-3 bg-surface-container-low rounded-lg border border-outline-variant/20 text-xs flex items-start justify-between gap-4">
                <div>
                  <strong className="text-on-surface text-sm block">{t.title}</strong>
                  <p className="text-on-surface-variant mt-0.5">{t.summary}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-error-container text-on-error-container">
                    {t.urgency || 'medium'}
                  </span>
                  <span className="block text-[11px] text-outline mt-1">{t.owner || 'Unassigned'}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 4. Risks & Dependencies */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <section className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/30 shadow-xs flex flex-col gap-2 text-xs">
            <h2 className="text-sm font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-error text-[18px]">warning</span>
              <span>Key Operational Risks ({handover.risks.length})</span>
            </h2>
            <div className="space-y-2 mt-1">
              {handover.risks.map((r, i) => (
                <div key={r.id || i} className="p-2.5 bg-surface-container-low rounded border border-outline-variant/20">
                  <strong className="text-on-surface block">{r.title}</strong>
                  <p className="text-on-surface-variant mt-0.5">{r.summary}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/30 shadow-xs flex flex-col gap-2 text-xs">
            <h2 className="text-sm font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">hub</span>
              <span>Technical Dependencies ({handover.dependencies.length})</span>
            </h2>
            <div className="space-y-2 mt-1">
              {handover.dependencies.map((dep, i) => (
                <div key={dep.id || i} className="p-2.5 bg-surface-container-low rounded border border-outline-variant/20">
                  <strong className="text-on-surface block">{dep.title}</strong>
                  <p className="text-on-surface-variant mt-0.5">{dep.summary}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Footer */}
        <footer className="text-center text-xs text-outline pt-6 border-t border-outline-variant/20 pb-12">
          <span>KnoTrail — Knowledge Never Leaves a Trail Behind • Team Deploy_or_Die</span>
        </footer>
      </div>
    </div>
  );
}

