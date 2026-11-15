import React from 'react';
import Link from 'next/link';
import { apiClient } from '../../../lib/api-client';
import type { HandoverDocument } from '../../../lib/types';

export const dynamic = 'force-dynamic';

export default async function SharedHandoverPage({
  params,
}: {
  params: { token: string };
}) {
  const token = params.token;
  let handover: HandoverDocument | null = null;
  let errorMsg = '';

  try {
    const result = await apiClient.getSharedHandover(token);
    handover = result.handover;
  } catch (err: any) {
    errorMsg = err.message || 'Share link is invalid, expired, or has been revoked.';
  }

  if (!handover) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center antialiased">
        <div className="max-w-md w-full bg-surface-container-lowest p-8 rounded-xl border border-outline-variant/40 shadow-xs flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-error/10 text-error flex items-center justify-center">
            <span className="material-symbols-outlined text-[28px]">link_off</span>
          </div>
          <h1 className="text-lg font-semibold text-on-surface">Handover Unavailable</h1>
          <p className="text-xs text-secondary leading-relaxed">{errorMsg}</p>
          <Link
            href="/"
            className="mt-2 inline-flex items-center gap-1.5 px-4 h-9 rounded-lg bg-primary text-on-primary text-xs font-medium hover:bg-primary-hover transition-colors shadow-xs"
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
    <div className="min-h-screen bg-background text-on-surface p-4 sm:p-6 md:p-8 flex flex-col items-center antialiased">
      <div className="max-w-4xl w-full flex flex-col gap-5">
        {/* Top Navbar */}
        <header className="flex items-center justify-between pb-4 border-b border-outline-variant/30">
          <Link href="/" className="flex items-center gap-2 text-primary font-bold text-base hover:opacity-85 transition-opacity">
            <div className="w-7 h-7 rounded-lg bg-primary text-on-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">all_inclusive</span>
            </div>
            <span>KnoTrail</span>
          </Link>
          <span className="text-[11px] bg-success/10 text-success border border-success/20 px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px]">verified</span>
            <span>Certified Handover</span>
          </span>
        </header>

        {/* Cover Header */}
        <div className="bg-surface-container-lowest rounded-xl p-5 sm:p-6 md:p-8 border border-outline-variant/40 shadow-xs flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-mono text-secondary uppercase tracking-wider block">
                {meta.projectCode} • Handover {meta.version}
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight mt-1">
                {meta.projectName}
              </h1>
              <p className="text-xs sm:text-sm text-secondary mt-1 leading-relaxed max-w-2xl">
                {meta.description}
              </p>
            </div>
            <div className="flex flex-col items-start sm:items-end text-xs shrink-0">
              <span className="inline-flex items-center gap-1 font-semibold text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full text-xs">
                <span className="material-symbols-outlined text-[14px]">verified</span>
                <span>Certified &amp; Approved</span>
              </span>
              <span className="text-[11px] text-secondary mt-1 font-mono">
                {meta.auditStamp}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-outline-variant/30 text-xs text-secondary font-mono">
            <div>
              <span className="block text-[10px] uppercase font-sans">Certified Date</span>
              <strong className="text-on-surface">{handover.certifiedDate}</strong>
            </div>
            <div>
              <span className="block text-[10px] uppercase font-sans">Certified By</span>
              <strong className="text-on-surface">{handover.certifiedBy}</strong>
            </div>
            <div>
              <span className="block text-[10px] uppercase font-sans">Target Exit</span>
              <strong className="text-on-surface">{meta.targetExitDate}</strong>
            </div>
            <div>
              <span className="block text-[10px] uppercase font-sans">Total Claims</span>
              <strong className="text-on-surface">{counts.totalApprovedFindings} verified</strong>
            </div>
          </div>
        </div>

        {/* 1. Executive Summary */}
        <section className="bg-surface-container-lowest rounded-xl p-5 sm:p-6 border border-outline-variant/40 shadow-xs flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[18px]">summarize</span>
            <span>Project Summary</span>
          </h2>
          <p className="text-xs text-secondary leading-relaxed">
            {handover.executiveSummary}
          </p>
        </section>

        {/* 2. Decisions */}
        <section className="bg-surface-container-lowest rounded-xl p-5 sm:p-6 border border-outline-variant/40 shadow-xs flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[18px]">gavel</span>
            <span>Important Decisions ({handover.decisions.length})</span>
          </h2>
          <div className="space-y-2.5">
            {handover.decisions.map((d, i) => (
              <div key={d.id || i} className="p-3 bg-surface-container-low/40 rounded-lg border border-outline-variant/30 text-xs flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <strong className="text-on-surface text-xs font-semibold">{d.title}</strong>
                  <span className="text-[9px] uppercase px-1.5 py-0.2 rounded-full bg-success/10 text-success border border-success/20 font-bold">
                    {d.status}
                  </span>
                </div>
                <p className="text-secondary leading-relaxed">{d.summary}</p>
                {d.reasoning && (
                  <p className="text-[11px] text-secondary mt-0.5">
                    <strong>Reasoning:</strong> {d.reasoning}
                  </p>
                )}
                {d.citations && d.citations.length > 0 && (
                  <blockquote className="mt-1 pl-2 border-l-2 border-primary/40 text-[11px] italic text-secondary">
                    &ldquo;{d.citations[0].snippet}&rdquo; — {d.citations[0].sourceName} ({d.citations[0].lineRange})
                  </blockquote>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* 3. Tasks */}
        <section className="bg-surface-container-lowest rounded-xl p-5 sm:p-6 border border-outline-variant/40 shadow-xs flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-[18px]">checklist</span>
            <span>Pending Operational Tasks ({handover.tasks.length})</span>
          </h2>
          <div className="space-y-2">
            {handover.tasks.map((t, i) => (
              <div key={t.id || i} className="p-3 bg-surface-container-low/40 rounded-lg border border-outline-variant/30 text-xs flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4">
                <div className="flex-1">
                  <strong className="text-on-surface text-xs font-semibold block">{t.title}</strong>
                  <p className="text-secondary mt-0.5">{t.summary}</p>
                </div>
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start text-right shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-outline-variant/20">
                  <span className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase bg-error/10 text-error border border-error/20">
                    {t.urgency || 'medium'}
                  </span>
                  <span className="block text-[11px] text-secondary sm:mt-1">{t.owner || 'Unassigned'}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 4. Risks & Dependencies */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <section className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/40 shadow-xs flex flex-col gap-2 text-xs">
            <h2 className="text-sm font-semibold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-error text-[18px]">warning</span>
              <span>Key Operational Risks ({handover.risks.length})</span>
            </h2>
            <div className="space-y-2 mt-1">
              {handover.risks.map((r, i) => (
                <div key={r.id || i} className="p-2.5 bg-surface-container-low/40 rounded-lg border border-outline-variant/30">
                  <strong className="text-on-surface block font-medium">{r.title}</strong>
                  <p className="text-secondary mt-0.5">{r.summary}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-surface-container-lowest rounded-xl p-5 border border-outline-variant/40 shadow-xs flex flex-col gap-2 text-xs">
            <h2 className="text-sm font-semibold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">hub</span>
              <span>Technical Dependencies ({handover.dependencies.length})</span>
            </h2>
            <div className="space-y-2 mt-1">
              {handover.dependencies.map((dep, i) => (
                <div key={dep.id || i} className="p-2.5 bg-surface-container-low/40 rounded-lg border border-outline-variant/30">
                  <strong className="text-on-surface block font-medium">{dep.title}</strong>
                  <p className="text-secondary mt-0.5">{dep.summary}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Footer */}
        <footer className="text-center text-xs text-secondary pt-6 border-t border-outline-variant/30 pb-12 font-mono">
          <span>KnoTrail — Intelligent Knowledge Handover Platform • Team Deploy_or_Die</span>
        </footer>
      </div>
    </div>
  );
}
