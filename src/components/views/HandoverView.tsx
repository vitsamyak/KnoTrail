'use client';

import React, { useState } from 'react';
import { useProject } from '../../context/ProjectContext';
import {
  exportHandoverMarkdown,
  exportHandoverJson,
  generatePrintableHtml,
} from '../../lib/handoverFilter';
import type { HandoverDocument, KnowledgeFinding } from '../../lib/types';
import { KnowledgeTrailLoader } from '../ui/KnowledgeTrailLoader';

export function HandoverView() {
  const {
    project,
    stats,
    setActiveView,
    currentHandover,
    currentUserRole,
    generateHandover,
    createShareLink,
    revokeShareLink,
  } = useProject();

  const [copySuccess, setCopySuccess] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [shareToken, setShareToken] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareRevoked, setShareRevoked] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [exportingType, setExportingType] = useState<'pdf' | 'md' | 'json' | null>(null);

  // Active handover document to render (prefer certified currentHandover)
  const doc: HandoverDocument | null = currentHandover || null;

  // Handler to generate or regenerate the formal Handover document
  const handleGenerate = async (regenerate = false) => {
    setIsGenerating(true);
    setGenerationError(null);
    try {
      const res = await generateHandover(undefined, { regenerate });
      if (!res.success) {
        setGenerationError(res.error || 'Failed to generate handover package.');
      }
    } catch (err: any) {
      setGenerationError(err.message || 'Generation failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Export to Markdown using the Phase G 12-section generator
  const handleExportMarkdown = () => {
    if (!doc) return;
    setExportingType('md');
    try {
      const md = exportHandoverMarkdown(doc);
      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `KnoTrail-Handover-${doc.metadata.projectCode}-${doc.version}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setTimeout(() => setExportingType(null), 600);
    }
  };

  // Export to JSON with 100% data parity
  const handleExportJSON = () => {
    if (!doc) return;
    setExportingType('json');
    try {
      const data = exportHandoverJson(doc);
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `KnoTrail-Handover-${doc.metadata.projectCode}-${doc.version}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setTimeout(() => setExportingType(null), 600);
    }
  };

  // Open printable PDF preview using dedicated A4 print layout
  const handlePrintPDF = () => {
    setExportingType('pdf');
    try {
      if (!doc) {
        window.print();
        return;
      }
      const html = generatePrintableHtml(doc);
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
          printWindow.print();
        }, 400);
      } else {
        window.print();
      }
    } finally {
      setTimeout(() => setExportingType(null), 600);
    }
  };

  // Share Link Modal opener
  const handleOpenShareModal = async () => {
    setShareModalOpen(true);
    setShareError(null);
    setShareRevoked(false);

    if (shareUrl && shareToken) return;

    setIsSharing(true);
    try {
      const res = await createShareLink(doc?.id);
      if (res.success && res.shareUrl && res.token) {
        // Build absolute URL if needed
        const fullUrl =
          typeof window !== 'undefined'
            ? `${window.location.origin}${res.shareUrl}`
            : res.shareUrl;
        setShareUrl(fullUrl);
        setShareToken(res.token);
      } else {
        setShareError(res.error || 'Failed to generate secure share link.');
      }
    } catch (err: any) {
      setShareError(err.message || 'Share link generation failed.');
    } finally {
      setIsSharing(false);
    }
  };

  // Copy share URL to clipboard
  const handleCopyShareUrl = () => {
    if (typeof window !== 'undefined' && shareUrl) {
      navigator.clipboard?.writeText(shareUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  // Revoke active share token
  const handleRevokeShare = async () => {
    if (!shareToken) return;
    setIsSharing(true);
    try {
      const res = await revokeShareLink(shareToken);
      if (res.success) {
        setShareRevoked(true);
        setShareUrl('');
        setShareToken('');
      } else {
        setShareError(res.error || 'Failed to revoke share link.');
      }
    } catch (err: any) {
      setShareError(err.message || 'Revocation error.');
    } finally {
      setIsSharing(false);
    }
  };

  // Smooth scroll helper for quick jump navigation
  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // 1. EMPTY HANDOVER STATE: No findings exist yet
  if (stats.totalFindings === 0) {
    return (
      <div className="flex flex-col w-full gap-6 animate-in fade-in duration-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-outline-variant/30">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-secondary mb-1">
              <span>WORKSPACE</span>
              <span>/</span>
              <span className="text-primary font-semibold">HANDOVER DOSSIER</span>
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-on-surface">
                Engineering Handover Dossier
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-surface-container-low text-secondary border border-outline-variant/30">
                No Data
              </span>
            </div>
            <p className="text-xs sm:text-sm text-secondary mt-1">
              Formal certified 12-section transition package compiled from verified evidence with immutable audit stamps.
            </p>
          </div>
        </div>

        <section className="bg-surface rounded-xl p-8 sm:p-12 shadow-xs border border-outline-variant/40 flex flex-col items-center text-center max-w-2xl mx-auto my-6">
          <div className="w-14 h-14 rounded-2xl bg-surface-container-low text-primary flex items-center justify-center mb-4 shadow-xs">
            <span className="material-symbols-outlined text-[32px]">description</span>
          </div>
          <h2 className="text-lg font-bold text-on-surface tracking-tight">
            No Handover Package Available
          </h2>
          <p className="text-xs sm:text-sm text-secondary max-w-md mt-2 leading-relaxed">
            Upload genuine project documents or connect a repository, extract operational knowledge with AI, and complete review in the Review Center to generate a certified handover package.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
            <button
              onClick={() => setActiveView('sources')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-on-primary rounded-lg font-medium text-xs shadow-xs transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">upload_file</span>
              <span>Upload Documents</span>
            </button>
            <button
              onClick={() => setActiveView('review')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-surface-container-low hover:bg-surface-container text-on-surface rounded-lg font-medium text-xs transition-colors border border-outline-variant/40"
            >
              <span className="material-symbols-outlined text-[16px]">rule</span>
              <span>Review Center</span>
            </button>
          </div>
        </section>
      </div>
    );
  }

  // 2. GATING ENFORCEMENT: Handover is strictly locked if unreviewed findings or unresolved conflicts exist
  if (stats.isHandoverBlocked) {
    return (
      <div className="flex flex-col w-full gap-6 animate-in fade-in duration-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-outline-variant/30">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-secondary mb-1">
              <span>WORKSPACE</span>
              <span>/</span>
              <span className="text-primary font-semibold">HANDOVER DOSSIER</span>
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-on-surface">
                Engineering Handover Dossier
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px]">lock</span>
                <span>Locked — Review Required</span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-secondary mt-1">
              Formal certified 12-section transition package compiled from verified evidence with immutable audit stamps.
            </p>
          </div>
          <button
            onClick={() => setActiveView('review')}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-primary hover:bg-primary-hover text-on-primary rounded-lg font-medium text-xs shadow-xs transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-[16px]">rule</span>
            <span>Go to Review Center</span>
          </button>
        </div>

        <section className="bg-surface rounded-xl p-8 sm:p-10 shadow-xs border border-outline-variant/40 flex flex-col items-center text-center max-w-2xl mx-auto my-6">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-700 dark:text-amber-300 flex items-center justify-center mb-4 shadow-xs border border-amber-500/20">
            <span className="material-symbols-outlined text-[32px]">lock</span>
          </div>

          <h2 className="text-lg font-bold text-on-surface tracking-tight">
            Handover Document Locked
          </h2>

          <p className="text-xs sm:text-sm text-secondary max-w-lg mt-2 leading-relaxed">
            To guarantee handover integrity, this document is locked until your team reviews all extracted operational findings and resolves conflicting points.
          </p>

          {/* Blocking Diagnostics Card */}
          <div className="w-full bg-surface-container-low/60 rounded-xl p-4 border border-outline-variant/30 my-6 text-left text-xs space-y-2.5">
            <div className="font-semibold text-on-surface flex items-center justify-between pb-2 border-b border-outline-variant/20">
              <span>Review Summary</span>
              <span className="font-mono text-primary font-bold">
                {stats.approvedCount}/{stats.totalFindings} Reviewed
              </span>
            </div>

            <div className="flex items-center justify-between py-0.5">
              <span className="flex items-center gap-1.5 text-on-surface">
                <span
                  className={`material-symbols-outlined text-[16px] ${
                    stats.unresolvedConflictsCount > 0 ? 'text-rose-600' : 'text-emerald-600'
                  }`}
                >
                  {stats.unresolvedConflictsCount > 0 ? 'error' : 'check_circle'}
                </span>
                <span>Conflicting Information:</span>
              </span>
              <span
                className={`font-semibold px-2 py-0.5 rounded-full text-[11px] ${
                  stats.unresolvedConflictsCount > 0
                    ? 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40'
                    : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40'
                }`}
              >
                {stats.unresolvedConflictsCount} Active
              </span>
            </div>

            <div className="flex items-center justify-between py-0.5">
              <span className="flex items-center gap-1.5 text-on-surface">
                <span
                  className={`material-symbols-outlined text-[16px] ${
                    stats.unreviewedCount > 0 ? 'text-amber-600' : 'text-emerald-600'
                  }`}
                >
                  {stats.unreviewedCount > 0 ? 'pending' : 'check_circle'}
                </span>
                <span>Items Pending Review:</span>
              </span>
              <span
                className={`font-semibold px-2 py-0.5 rounded-full text-[11px] ${
                  stats.unreviewedCount > 0
                    ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40'
                    : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40'
                }`}
              >
                {stats.unreviewedCount} Pending
              </span>
            </div>

            <p className="text-[11px] text-secondary pt-2 border-t border-outline-variant/20 italic">
              Blocking Reason: {stats.handoverBlockReason}
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => setActiveView('review')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-on-primary rounded-lg font-medium text-xs shadow-xs transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">rule</span>
              <span>Go to Review Center</span>
            </button>
            <button
              onClick={() => setActiveView('evidence')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-surface-container-low hover:bg-surface-container text-on-surface rounded-lg font-medium text-xs transition-colors border border-outline-variant/40"
            >
              <span className="material-symbols-outlined text-[16px]">fact_check</span>
              <span>Inspect Evidence Explorer</span>
            </button>
          </div>
        </section>
      </div>
    );
  }

  // 3. READY TO GENERATE STATE: Unblocked but HandoverDocument not yet created
  if (!doc) {
    return (
      <div className="flex flex-col w-full gap-6 animate-in fade-in duration-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-outline-variant/30">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-secondary mb-1">
              <span>WORKSPACE</span>
              <span>/</span>
              <span className="text-primary font-semibold">HANDOVER DOSSIER</span>
            </div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-on-surface">
                Engineering Handover Dossier
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px]">verified</span>
                <span>Ready to Compile</span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-secondary mt-1">
              Formal certified 12-section transition package compiled from verified evidence with immutable audit stamps.
            </p>
          </div>
        </div>

        <section className="bg-surface rounded-xl p-8 sm:p-12 shadow-xs border border-outline-variant/40 flex flex-col items-center text-center max-w-2xl mx-auto my-6">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 flex items-center justify-center mb-4 shadow-xs border border-emerald-500/20">
            <span className="material-symbols-outlined text-[32px]">verified</span>
          </div>
          <span className="text-xs font-mono uppercase tracking-wider text-primary font-bold">
            All Quality Gates Passed
          </span>
          <h2 className="text-lg font-bold text-on-surface tracking-tight mt-1">
            Handover Ready to Compile
          </h2>
          <p className="text-xs sm:text-sm text-secondary max-w-md mt-2 leading-relaxed">
            All {stats.approvedCount} project findings are verified and approved with zero outstanding conflicts. Click below to compile the formal 12-section certified handover dossier.
          </p>

          {isGenerating && (
            <div className="w-full my-4">
              <KnowledgeTrailLoader
                variant="section"
                message="Preparing your handover..."
                submessage="Compiling verified decisions, tasks, risks, and evidence into the formal 12-section dossier..."
                step={4}
              />
            </div>
          )}

          {generationError && (
            <div className="w-full bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/40 p-3 rounded-lg text-xs mt-3">
              {generationError}
            </div>
          )}

          <div className="flex items-center gap-3 mt-6">
            <button
              onClick={() => handleGenerate(false)}
              disabled={isGenerating || currentUserRole !== 'MANAGER'}
              title={currentUserRole !== 'MANAGER' ? `Manager permissions required to generate handover package (current role: ${currentUserRole}).` : undefined}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-on-primary rounded-lg font-medium text-xs shadow-xs transition-colors disabled:opacity-50"
            >
              {isGenerating ? (
                <KnowledgeTrailLoader variant="inline" size="sm" />
              ) : (
                <span className="material-symbols-outlined text-[18px]">
                  {currentUserRole !== 'MANAGER' ? 'lock' : 'auto_fix_high'}
                </span>
              )}
              <span>
                {isGenerating
                  ? 'Compiling 12-Section Handover...'
                  : currentUserRole !== 'MANAGER'
                  ? currentUserRole === 'EXTERNAL'
                    ? 'Read-Only (External)'
                    : 'Manager Role Required'
                  : 'Generate Certified Handover'}
              </span>
            </button>
          </div>
        </section>
      </div>
    );
  }

  // 4. UNLOCKED & GENERATED 12-SECTION HANDOVER DOSSIER
  const meta = doc.metadata;
  const counts = doc.sectionCounts;
  const reReviewCount = stats.needsReReviewCount ?? (project.findings || []).filter((f) => f.needsReReview).length;

  return (
    <div className="flex flex-col w-full gap-4 sm:gap-4.5 animate-in fade-in duration-200 pb-10">
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 sm:pb-3.5 border-b border-outline-variant/30">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-secondary mb-1">
            <span>WORKSPACE</span>
            <span>/</span>
            <span className="text-primary font-semibold">HANDOVER DOSSIER</span>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-on-surface">
              {meta.projectName} Engineering Handover Dossier
            </h1>
            {project.handoverCertified && !doc.isOutdated && !stats.isHandoverOutdated ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 text-xs font-semibold border border-emerald-200 dark:border-emerald-800/40">
                <span className="material-symbols-outlined text-[14px]">verified</span>
                <span>Certified &amp; Approved ({doc.version})</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 text-xs font-semibold border border-amber-200 dark:border-amber-800/40">
                <span className="material-symbols-outlined text-[14px]">history_toggle_off</span>
                <span>Outdated — Re-Certification Required</span>
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-secondary mt-1">
            Formal certified 12-section transition package compiled from verified evidence with immutable audit stamps.
          </p>
        </div>

        {/* Quick Action Export & Share Buttons */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            onClick={handleOpenShareModal}
            disabled={currentUserRole !== 'MANAGER'}
            title={
              currentUserRole !== 'MANAGER'
                ? `Manager permissions required to create public share links (current role: ${currentUserRole}).`
                : undefined
            }
            className={`h-9 text-xs inline-flex items-center gap-1.5 px-3 rounded-lg font-medium border transition-colors ${
              currentUserRole !== 'MANAGER'
                ? 'bg-surface-container-low text-secondary opacity-50 cursor-not-allowed border-outline-variant/40'
                : 'bg-surface-container-low text-on-surface hover:bg-surface-container border-outline-variant/40'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">
              {currentUserRole !== 'MANAGER' ? 'lock' : 'share'}
            </span>
            <span>Share Link</span>
          </button>

          <button
            onClick={handlePrintPDF}
            disabled={exportingType !== null}
            className="h-9 text-xs inline-flex items-center gap-1.5 px-3 rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container transition-colors font-medium border border-outline-variant/40 disabled:opacity-50"
          >
            {exportingType === 'pdf' ? (
              <KnowledgeTrailLoader variant="inline" size="sm" />
            ) : (
              <span className="material-symbols-outlined text-[16px]">print</span>
            )}
            <span>{exportingType === 'pdf' ? 'Preparing PDF...' : 'Export PDF'}</span>
          </button>

          <button
            onClick={handleExportMarkdown}
            disabled={exportingType !== null}
            className="h-9 text-xs inline-flex items-center gap-1.5 px-3 rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container transition-colors font-medium border border-outline-variant/40 disabled:opacity-50"
          >
            {exportingType === 'md' ? (
              <KnowledgeTrailLoader variant="inline" size="sm" />
            ) : (
              <span className="material-symbols-outlined text-[16px]">markdown</span>
            )}
            <span>{exportingType === 'md' ? 'Exporting...' : 'Export MD'}</span>
          </button>

          <button
            onClick={handleExportJSON}
            disabled={exportingType !== null}
            className="h-9 text-xs inline-flex items-center gap-1.5 px-3.5 rounded-lg bg-primary text-on-primary hover:bg-primary-hover shadow-xs transition-colors font-medium disabled:opacity-50"
          >
            {exportingType === 'json' ? (
              <KnowledgeTrailLoader variant="inline" size="sm" />
            ) : (
              <span className="material-symbols-outlined text-[16px]">data_object</span>
            )}
            <span>{exportingType === 'json' ? 'Generating...' : 'Export JSON'}</span>
          </button>
        </div>
      </div>
      {/* OUTDATED INVALIDATION BANNER */}
      {(stats.isHandoverOutdated || doc.isOutdated || !project.handoverCertified) && (
        <aside
          role="alert"
          className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 sm:p-5 flex flex-col gap-3 shadow-xs"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                <span className="material-symbols-outlined text-[20px]">warning</span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm font-bold text-on-surface">
                    Handover Outdated (Current: {doc.version})
                  </h2>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold border border-amber-500/30">
                    Re-Certification Required
                  </span>
                </div>
                <p className="text-xs text-secondary leading-relaxed">
                  {doc.outdatedReason ||
                    stats.handoverOutdatedReason ||
                    'Project data was modified after this handover was compiled. Manager review and re-certification are required.'}
                </p>
                <div className="flex items-center gap-2 flex-wrap text-[11px] text-secondary font-mono pt-0.5">
                  {(() => {
                    const reason = doc.outdatedReason || stats.handoverOutdatedReason || '';
                    const match = reason.match(/\b([0-9a-f]{7,40})\b/i);
                    return match ? (
                      <span className="bg-surface-container px-2 py-0.5 rounded border border-outline-variant/30 text-primary font-semibold">
                        Commit: {match[1].slice(0, 7)}
                      </span>
                    ) : null;
                  })()}
                  <span className="text-amber-700 dark:text-amber-300 font-semibold">
                    {reReviewCount} finding(s) require re-review in Review Center
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto shrink-0 justify-end">
              <button
                onClick={() => setActiveView('review')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-surface hover:bg-surface-container text-on-surface rounded-lg font-medium text-xs transition-colors border border-outline-variant/40 shadow-xs"
              >
                <span className="material-symbols-outlined text-[16px] text-amber-600 dark:text-amber-400">
                  rate_review
                </span>
                <span>Review Drifted Findings ({reReviewCount})</span>
              </button>

              <button
                onClick={() => handleGenerate(true)}
                disabled={isGenerating || currentUserRole !== 'MANAGER' || reReviewCount > 0}
                title={
                  currentUserRole !== 'MANAGER'
                    ? `Manager permissions required to regenerate handover package (current role: ${currentUserRole}).`
                    : reReviewCount > 0
                    ? 'Complete human review of drifted findings before regenerating certified handover.'
                    : undefined
                }
                className="w-full sm:w-auto justify-center inline-flex items-center gap-2 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium text-xs shadow-xs transition-colors disabled:opacity-50"
              >
                {isGenerating ? (
                  <KnowledgeTrailLoader variant="inline" size="sm" />
                ) : (
                  <span className="material-symbols-outlined text-[16px]">
                    {currentUserRole !== 'MANAGER' ? 'lock' : 'refresh'}
                  </span>
                )}
                <span>
                  {isGenerating
                    ? 'Updating Handover...'
                    : currentUserRole !== 'MANAGER'
                    ? currentUserRole === 'EXTERNAL'
                      ? 'Read-Only (External)'
                      : 'Manager Role Required'
                    : 'Regenerate Handover'}
                </span>
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* STICKY QUICK JUMP NAVIGATION BAR */}
      <nav
        aria-label="Handover Sections"
        className="sticky top-16 z-10 bg-surface/95 backdrop-blur-md rounded-xl p-2 shadow-xs border border-outline-variant/40 flex items-center gap-1.5 overflow-x-auto text-xs no-scrollbar"
      >
        <span className="text-[11px] font-mono text-secondary px-2 uppercase tracking-wider shrink-0 font-medium">
          Jump:
        </span>
        <button
          onClick={() => scrollToSection('section-cover')}
          className="px-2.5 py-1 rounded-md hover:bg-surface-container text-secondary hover:text-on-surface shrink-0 font-medium transition-colors"
        >
          Cover
        </button>
        <button
          onClick={() => scrollToSection('section-summary')}
          className="px-2.5 py-1 rounded-md hover:bg-surface-container text-secondary hover:text-on-surface shrink-0 font-medium transition-colors"
        >
          Exec Summary
        </button>
        <button
          onClick={() => scrollToSection('section-overview')}
          className="px-2.5 py-1 rounded-md hover:bg-surface-container text-secondary hover:text-on-surface shrink-0 font-medium transition-colors"
        >
          Overview
        </button>
        <button
          onClick={() => scrollToSection('section-decisions')}
          className="px-2.5 py-1 rounded-md hover:bg-surface-container text-secondary hover:text-on-surface shrink-0 font-medium transition-colors"
        >
          Decisions ({counts.decisions})
        </button>
        <button
          onClick={() => scrollToSection('section-tasks')}
          className="px-2.5 py-1 rounded-md hover:bg-surface-container text-secondary hover:text-on-surface shrink-0 font-medium transition-colors"
        >
          Tasks ({counts.tasks})
        </button>
        <button
          onClick={() => scrollToSection('section-responsibilities')}
          className="px-2.5 py-1 rounded-md hover:bg-surface-container text-secondary hover:text-on-surface shrink-0 font-medium transition-colors"
        >
          Ownership
        </button>
        <button
          onClick={() => scrollToSection('section-risks')}
          className="px-2.5 py-1 rounded-md hover:bg-surface-container text-secondary hover:text-on-surface shrink-0 font-medium transition-colors"
        >
          Risks ({counts.risks})
        </button>
        <button
          onClick={() => scrollToSection('section-dependencies')}
          className="px-2.5 py-1 rounded-md hover:bg-surface-container text-secondary hover:text-on-surface shrink-0 font-medium transition-colors"
        >
          Dependencies ({counts.dependencies})
        </button>
        <button
          onClick={() => scrollToSection('section-questions')}
          className="px-2.5 py-1 rounded-md hover:bg-surface-container text-secondary hover:text-on-surface shrink-0 font-medium transition-colors"
        >
          Questions ({counts.questions})
        </button>
        <button
          onClick={() => scrollToSection('section-actions')}
          className="px-2.5 py-1 rounded-md hover:bg-surface-container text-secondary hover:text-on-surface shrink-0 font-medium transition-colors"
        >
          Next Actions ({counts.nextActions})
        </button>
        <button
          onClick={() => scrollToSection('section-evidence')}
          className="px-2.5 py-1 rounded-md hover:bg-surface-container text-secondary hover:text-on-surface shrink-0 font-medium transition-colors"
        >
          Evidence ({doc.evidenceInventory.length})
        </button>
        <button
          onClick={() => scrollToSection('section-history')}
          className="px-2.5 py-1 rounded-md hover:bg-surface-container text-secondary hover:text-on-surface shrink-0 font-medium transition-colors"
        >
          Review History
        </button>
      </nav>

      {/* SECTION A: PROJECT METADATA & IDENTIFICATION */}
      <section
        id="section-cover"
        className="bg-surface rounded-xl p-5 sm:p-6 border border-outline-variant/40 shadow-xs flex flex-col gap-4"
      >
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant/30">
          <div className="flex items-center gap-2 text-primary font-bold">
            <span className="material-symbols-outlined text-[20px]">badge</span>
            <h2 className="text-base font-bold text-on-surface">
              Section A: Project Identification &amp; Certification
            </h2>
          </div>
          <span className="text-xs font-mono text-secondary">Handover Version {doc.version}</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="block text-[10px] uppercase font-mono text-secondary">Project Code</span>
            <strong className="text-on-surface font-mono">{meta.projectCode}</strong>
          </div>
          <div>
            <span className="block text-[10px] uppercase font-mono text-secondary">Target Exit Date</span>
            <strong className="text-on-surface">{meta.targetExitDate}</strong>
          </div>
          <div>
            <span className="block text-[10px] uppercase font-mono text-secondary">Certified By</span>
            <strong className="text-on-surface">{doc.certifiedBy}</strong>
          </div>
          <div>
            <span className="block text-[10px] uppercase font-mono text-secondary">Audit Stamp</span>
            <strong className="text-on-surface font-mono">{meta.auditStamp}</strong>
          </div>
        </div>

        {/* Transition Leads Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-outline-variant/20 text-xs">
          {meta.outgoingLead && (
            <div className="p-3 rounded-lg bg-surface-container-low/60 border border-outline-variant/30 flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-[22px]">logout</span>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-secondary block font-mono">
                  Outgoing Transition Lead
                </span>
                <strong className="text-on-surface text-sm">{meta.outgoingLead.name}</strong>
                <span className="text-secondary block text-xs">
                  {meta.outgoingLead.role}
                </span>
              </div>
            </div>
          )}
          {meta.incomingLead && (
            <div className="p-3 rounded-lg bg-surface-container-low/60 border border-outline-variant/30 flex items-center gap-3">
              <span className="material-symbols-outlined text-secondary text-[22px]">login</span>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-secondary block font-mono">
                  Incoming Operational Lead
                </span>
                <strong className="text-on-surface text-sm">{meta.incomingLead.name}</strong>
                <span className="text-secondary block text-xs">
                  {meta.incomingLead.role}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="text-[11px] font-mono text-secondary pt-2 border-t border-outline-variant/20 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <span>SHA-256 Signature Hash:</span>
          <span className="text-on-surface truncate max-w-md font-mono">{doc.certificationHash}</span>
        </div>
      </section>

      {/* SECTION B: EXECUTIVE SUMMARY */}
      <section
        id="section-summary"
        className="bg-surface rounded-xl p-5 sm:p-6 border border-outline-variant/40 shadow-xs flex flex-col gap-3"
      >
        <div className="flex items-center gap-2 text-primary font-bold">
          <span className="material-symbols-outlined text-[20px]">feed</span>
          <h2 className="text-base font-bold text-on-surface tracking-tight">
            Section B: Executive Summary
          </h2>
        </div>
        <p className="text-on-surface leading-relaxed whitespace-pre-line text-xs sm:text-sm">
          {doc.executiveSummary}
        </p>
      </section>

      {/* SECTION C: PROJECT OVERVIEW */}
      <section
        id="section-overview"
        className="bg-surface rounded-xl p-5 sm:p-6 border border-outline-variant/40 shadow-xs flex flex-col gap-4"
      >
        <div className="flex items-center gap-2 text-primary font-bold">
          <span className="material-symbols-outlined text-[20px]">info</span>
          <h2 className="text-base font-bold text-on-surface tracking-tight">
            Section C: Project Overview
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-lg bg-surface-container-low/60 border border-outline-variant/30 space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-secondary font-mono font-bold">Purpose</span>
            <p className="text-on-surface text-xs sm:text-sm leading-relaxed">{doc.projectOverview.purpose}</p>
          </div>
          <div className="p-4 rounded-lg bg-surface-container-low/60 border border-outline-variant/30 space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-secondary font-mono font-bold">Scope</span>
            <p className="text-on-surface text-xs sm:text-sm leading-relaxed">{doc.projectOverview.scope}</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-secondary pt-2 border-t border-outline-variant/20">
          <span>
            Operational Status: <strong className="text-on-surface">{doc.projectOverview.operationalStatus}</strong>
          </span>
          <span>
            Connected Sources Indexed:{' '}
            <strong className="text-on-surface font-mono">{doc.projectOverview.connectedSourcesCount} document(s)</strong>
          </span>
        </div>
      </section>

      {/* SECTION D: IMPORTANT DECISIONS */}
      <section
        id="section-decisions"
        className="bg-surface rounded-xl p-5 sm:p-6 border border-outline-variant/40 shadow-xs flex flex-col gap-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary font-bold">
            <span className="material-symbols-outlined text-[20px]">gavel</span>
            <h2 className="text-base font-bold text-on-surface tracking-tight">
              Section D: Important Architectural Decisions ({doc.decisions.length})
            </h2>
          </div>
          <span className="text-xs font-mono text-secondary">{doc.decisions.length} Approved</span>
        </div>

        <div className="flex flex-col gap-3">
          {doc.decisions.length === 0 ? (
            <p className="text-xs text-secondary italic">No decisions recorded.</p>
          ) : (
            doc.decisions.map((dec) => {
              const isUncertain = dec.status === 'UNCERTAIN' || dec.claimStatus === 'UNCERTAIN';
              return (
                <div
                  key={dec.id}
                  className="bg-surface-container-low/60 rounded-lg p-3.5 sm:p-4 border border-outline-variant/30 flex flex-col gap-2 hover:border-outline-variant/60 transition-colors"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-container text-secondary font-medium">
                        {dec.category || 'Architecture'}
                      </span>
                      <strong className="text-xs sm:text-sm text-on-surface font-semibold">{dec.title}</strong>
                    </div>
                    {isUncertain ? (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 font-semibold border border-amber-200 dark:border-amber-800/40">
                        <span className="material-symbols-outlined text-[13px]">help_outline</span>
                        <span>Accepted with Uncertainty</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800/40">
                        <span className="material-symbols-outlined text-[13px]">verified</span>
                        <span>Verified</span>
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-on-surface leading-relaxed">{dec.summary}</p>

                  {/* Reviewer justification if accepted with uncertainty */}
                  {isUncertain && dec.reviewerNotes && (
                    <div className="p-2.5 rounded bg-amber-500/10 text-amber-900 dark:text-amber-100 text-[11px] border border-amber-500/20">
                      <strong>Reviewer Justification:</strong> {dec.reviewerNotes}
                    </div>
                  )}

                  {/* Citations */}
                  {dec.citations && dec.citations.length > 0 && (
                    <div className="text-[11px] text-secondary pt-2 border-t border-outline-variant/20 space-y-1">
                      {dec.citations.map((c, i) => (
                        <div key={i} className="flex items-start gap-1">
                          <span className="material-symbols-outlined text-[14px] text-primary shrink-0 mt-0.5">
                            format_quote
                          </span>
                          <span className="italic text-secondary">
                            &quot;{c.quote || c.snippet}&quot; — <span className="font-semibold text-on-surface">{c.sourceName}</span>
                            {c.pageNumber ? ` (p. ${c.pageNumber})` : ''}
                            {c.lineNumber ? ` (line ${c.lineNumber})` : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* SECTION E: PENDING TASKS */}
      <section
        id="section-tasks"
        className="bg-surface rounded-xl p-5 sm:p-6 border border-outline-variant/40 shadow-xs flex flex-col gap-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary font-bold">
            <span className="material-symbols-outlined text-[20px]">assignment</span>
            <h2 className="text-base font-bold text-on-surface tracking-tight">
              Section E: Pending Operational Tasks ({doc.tasks.length})
            </h2>
          </div>
          <span className="text-xs font-mono text-secondary">{doc.tasks.length} Tracked</span>
        </div>

        <div className="flex flex-col gap-3">
          {doc.tasks.length === 0 ? (
            <p className="text-xs text-secondary italic">No pending tasks recorded.</p>
          ) : (
            doc.tasks.map((task) => (
              <div
                key={task.id}
                className="bg-surface-container-low/60 rounded-lg p-3.5 sm:p-4 border border-outline-variant/30 flex flex-col gap-2 hover:border-outline-variant/60 transition-colors"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded font-semibold uppercase font-mono ${
                        task.urgency === 'critical'
                          ? 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200'
                          : task.urgency === 'high'
                          ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200'
                          : 'bg-surface-container text-secondary border border-outline-variant/30'
                      }`}
                    >
                      {task.urgency || 'Normal'}
                    </span>
                    <strong className="text-xs sm:text-sm text-on-surface font-semibold">{task.title}</strong>
                  </div>
                  <span className="text-xs text-secondary">
                    Assignee: <strong className="text-on-surface">{task.owner || 'Unassigned'}</strong>
                  </span>
                </div>
                <p className="text-xs text-on-surface leading-relaxed">{task.summary}</p>
                {task.citations && task.citations.length > 0 && (
                  <div className="text-[11px] text-secondary pt-1 border-t border-outline-variant/20">
                    <span className="font-semibold text-on-surface">Source:</span> {task.citations[0].sourceName}
                    {task.citations[0].pageNumber ? ` (p. ${task.citations[0].pageNumber})` : ''}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      {/* SECTION F: RESPONSIBILITIES & OWNERSHIP */}
      <section
        id="section-responsibilities"
        className="bg-surface rounded-xl p-5 sm:p-6 border border-outline-variant/40 shadow-xs flex flex-col gap-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary font-bold">
            <span className="material-symbols-outlined text-[20px]">groups</span>
            <h2 className="text-base font-bold text-on-surface tracking-tight">
              Section F: Responsibilities &amp; Ownership
            </h2>
          </div>
        </div>

        {/* Assigned team members */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {doc.responsibilities.assigned.length === 0 ? (
            <p className="text-xs text-secondary italic col-span-full">
              No individual assignees identified.
            </p>
          ) : (
            doc.responsibilities.assigned.map((r, i) => (
              <div
                key={i}
                className="bg-surface-container-low/60 rounded-lg p-3.5 border border-outline-variant/30 flex flex-col gap-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <strong className="text-xs sm:text-sm text-on-surface font-semibold">{r.owner}</strong>
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold text-[10px] font-mono">
                    {r.tasksCount} task(s)
                  </span>
                </div>
                <ul className="list-disc list-inside text-[11px] text-secondary space-y-1">
                  {r.taskTitles.slice(0, 3).map((t, idx) => (
                    <li key={idx} className="truncate">{t}</li>
                  ))}
                  {r.taskTitles.length > 3 && (
                    <li className="text-secondary/70">+{r.taskTitles.length - 3} more</li>
                  )}
                </ul>
              </div>
            ))
          )}
        </div>

        {/* Unassigned Tasks Alert Callout */}
        {doc.responsibilities.unassignedCount > 0 && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col gap-2 text-xs">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 font-bold">
              <span className="material-symbols-outlined text-[18px]">warning</span>
              <span>
                Unassigned Tasks Requiring Immediate Ownership ({doc.responsibilities.unassignedCount})
              </span>
            </div>
            <p className="text-secondary text-[11px]">
              The following operational tasks have no designated owner and must be assigned to an incoming team member:
            </p>
            <ul className="list-disc list-inside space-y-1 text-on-surface text-xs">
              {doc.responsibilities.unassignedTasks.map((t) => (
                <li key={t.id} className="font-medium">
                  {t.title} <span className="text-secondary font-normal">({t.urgency || 'normal'} priority)</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* SECTION G: RISKS & MITIGATIONS */}
      <section
        id="section-risks"
        className="bg-surface rounded-xl p-5 sm:p-6 border border-outline-variant/40 shadow-xs flex flex-col gap-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary font-bold">
            <span className="material-symbols-outlined text-[20px]">warning</span>
            <h2 className="text-base font-bold text-on-surface tracking-tight">
              Section G: Critical Risks &amp; Mitigations ({doc.risks.length})
            </h2>
          </div>
          <span className="text-xs font-mono text-secondary">{doc.risks.length} Logged</span>
        </div>

        <div className="flex flex-col gap-3">
          {doc.risks.length === 0 ? (
            <p className="text-xs text-secondary italic">No critical risks logged.</p>
          ) : (
            doc.risks.map((risk) => (
              <div
                key={risk.id}
                className="bg-surface-container-low/60 rounded-lg p-3.5 sm:p-4 border border-outline-variant/30 flex flex-col gap-2 hover:border-outline-variant/60 transition-colors"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] px-2 py-0.5 rounded font-semibold uppercase bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 font-mono">
                      {risk.urgency || 'High Risk'}
                    </span>
                    <strong className="text-xs sm:text-sm text-on-surface font-semibold">{risk.title}</strong>
                  </div>
                </div>
                <p className="text-xs text-on-surface leading-relaxed">{risk.summary}</p>
                {/* Mitigation Strategy */}
                <div className="p-2.5 rounded bg-surface-container text-xs border border-outline-variant/30">
                  <span className="font-bold text-primary block text-[11px] uppercase font-mono">
                    Mitigation Strategy
                  </span>
                  <p className="text-on-surface text-xs mt-0.5">
                    {risk.mitigation || risk.implication || 'Review and monitor during transition period.'}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* SECTION H: TECHNICAL DEPENDENCIES */}
      <section
        id="section-dependencies"
        className="bg-surface rounded-xl p-5 sm:p-6 border border-outline-variant/40 shadow-xs flex flex-col gap-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary font-bold">
            <span className="material-symbols-outlined text-[20px]">hub</span>
            <h2 className="text-base font-bold text-on-surface tracking-tight">
              Section H: Technical Dependencies &amp; Integrations ({doc.dependencies.length})
            </h2>
          </div>
          <span className="text-xs font-mono text-secondary">{doc.dependencies.length} Verified</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {doc.dependencies.length === 0 ? (
            <p className="text-xs text-secondary italic col-span-full">
              No technical dependencies cataloged.
            </p>
          ) : (
            doc.dependencies.map((dep) => (
              <div
                key={dep.id}
                className="bg-surface-container-low/60 rounded-lg p-3.5 sm:p-4 border border-outline-variant/30 flex flex-col gap-1.5 hover:border-outline-variant/60 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <strong className="text-xs sm:text-sm text-on-surface font-semibold">{dep.title}</strong>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-container text-secondary font-medium">
                    {dep.category || 'Service'}
                  </span>
                </div>
                <p className="text-xs text-secondary leading-relaxed">{dep.summary}</p>
                {dep.citations && dep.citations.length > 0 && (
                  <span className="text-[10px] text-secondary pt-1 border-t border-outline-variant/20">
                    Source: {dep.citations[0].sourceName}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      {/* SECTION I: UNRESOLVED QUESTIONS */}
      <section
        id="section-questions"
        className="bg-surface rounded-xl p-5 sm:p-6 border border-outline-variant/40 shadow-xs flex flex-col gap-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary font-bold">
            <span className="material-symbols-outlined text-[20px]">help</span>
            <h2 className="text-base font-bold text-on-surface tracking-tight">
              Section I: Unresolved Questions &amp; Ambiguities ({doc.unresolvedQuestions.length})
            </h2>
          </div>
          <span className="text-xs font-mono text-secondary">{doc.unresolvedQuestions.length} Open</span>
        </div>

        <div className="flex flex-col gap-3">
          {doc.unresolvedQuestions.length === 0 ? (
            <p className="text-xs text-secondary italic">No open questions identified.</p>
          ) : (
            doc.unresolvedQuestions.map((q) => (
              <div
                key={q.id}
                className="bg-surface-container-low/60 rounded-lg p-3.5 sm:p-4 border border-outline-variant/30 flex flex-col gap-1.5 hover:border-outline-variant/60 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <strong className="text-xs sm:text-sm text-on-surface font-semibold">{q.title}</strong>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-container text-secondary font-medium">
                    {q.category || 'General'}
                  </span>
                </div>
                <p className="text-xs text-on-surface leading-relaxed">{q.summary}</p>
              </div>
            ))
          )}
        </div>
      </section>

      {/* SECTION J: RECOMMENDED NEXT ACTIONS */}
      <section
        id="section-actions"
        className="bg-surface rounded-xl p-5 sm:p-6 border border-outline-variant/40 shadow-xs flex flex-col gap-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary font-bold">
            <span className="material-symbols-outlined text-[20px]">flag</span>
            <h2 className="text-base font-bold text-on-surface tracking-tight">
              Section J: Prioritized Next Actions
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Immediate */}
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex flex-col gap-2.5">
            <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-300 font-bold text-xs uppercase tracking-wider font-mono">
              <span className="material-symbols-outlined text-[16px]">priority_high</span>
              <span>Immediate ({doc.recommendedNextActions.immediate.length})</span>
            </div>
            {doc.recommendedNextActions.immediate.length === 0 ? (
              <p className="text-[11px] text-secondary italic">No immediate blockers.</p>
            ) : (
              <ul className="space-y-2 text-xs">
                {doc.recommendedNextActions.immediate.map((act) => (
                  <li key={act.id} className="p-2.5 rounded bg-surface border border-outline-variant/30 shadow-2xs">
                    <strong className="block text-on-surface font-semibold">{act.title}</strong>
                    <span className="text-[11px] text-secondary line-clamp-2 mt-0.5">{act.summary}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Short-Term */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col gap-2.5">
            <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300 font-bold text-xs uppercase tracking-wider font-mono">
              <span className="material-symbols-outlined text-[16px]">schedule</span>
              <span>Short-Term ({doc.recommendedNextActions.shortTerm.length})</span>
            </div>
            {doc.recommendedNextActions.shortTerm.length === 0 ? (
              <p className="text-[11px] text-secondary italic">No short-term tasks.</p>
            ) : (
              <ul className="space-y-2 text-xs">
                {doc.recommendedNextActions.shortTerm.map((act) => (
                  <li key={act.id} className="p-2.5 rounded bg-surface border border-outline-variant/30 shadow-2xs">
                    <strong className="block text-on-surface font-semibold">{act.title}</strong>
                    <span className="text-[11px] text-secondary line-clamp-2 mt-0.5">{act.summary}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Follow-Up */}
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col gap-2.5">
            <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-bold text-xs uppercase tracking-wider font-mono">
              <span className="material-symbols-outlined text-[16px]">done_all</span>
              <span>Follow-Up ({doc.recommendedNextActions.followUp.length})</span>
            </div>
            {doc.recommendedNextActions.followUp.length === 0 ? (
              <p className="text-[11px] text-secondary italic">No follow-up items.</p>
            ) : (
              <ul className="space-y-2 text-xs">
                {doc.recommendedNextActions.followUp.map((act) => (
                  <li key={act.id} className="p-2.5 rounded bg-surface border border-outline-variant/30 shadow-2xs">
                    <strong className="block text-on-surface font-semibold">{act.title}</strong>
                    <span className="text-[11px] text-secondary line-clamp-2 mt-0.5">{act.summary}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* SECTION K: EVIDENCE & SOURCE REFERENCES */}
      <section
        id="section-evidence"
        className="bg-surface rounded-xl p-5 sm:p-6 border border-outline-variant/40 shadow-xs flex flex-col gap-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary font-bold">
            <span className="material-symbols-outlined text-[20px]">fact_check</span>
            <h2 className="text-base font-bold text-on-surface tracking-tight">
              Section K: Evidence &amp; Source Inventory ({doc.evidenceInventory.length})
            </h2>
          </div>
        </div>

        <div className="flex flex-col gap-2 text-xs">
          {doc.evidenceInventory.length === 0 ? (
            <p className="text-xs text-secondary italic">No supporting citations recorded.</p>
          ) : (
            doc.evidenceInventory.map((item, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-lg bg-surface-container-low/60 border border-outline-variant/30 flex flex-col gap-1.5 hover:border-outline-variant/60 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-on-surface text-xs sm:text-sm">
                    {item.findingTitle}{' '}
                    <span className="text-[10px] text-secondary font-mono font-normal">({item.findingType})</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded font-mono font-semibold bg-surface-container text-secondary">
                    {item.status}
                  </span>
                </div>
                {item.citations && item.citations.length > 0 ? (
                  item.citations.map((c, cIdx) => (
                    <div key={cIdx} className="text-[11px] text-secondary pl-3 border-l-2 border-primary/40">
                      <span className="font-semibold text-on-surface">{c.sourceName}</span>
                      {c.pageNumber ? ` • Page ${c.pageNumber}` : ''}
                      {c.lineNumber ? ` • Line ${c.lineNumber}` : ''}
                      <p className="italic mt-0.5">&quot;{c.quote || c.snippet}&quot;</p>
                    </div>
                  ))
                ) : (
                  <span className="text-[11px] text-secondary/60 italic">No citation quotes available.</span>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      {/* SECTION L: HUMAN REVIEW HISTORY & AUDIT TRAIL */}
      <section
        id="section-history"
        className="bg-surface rounded-xl p-5 sm:p-6 border-2 border-primary/40 shadow-xs flex flex-col gap-4 print-page-break"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/20 pb-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-[28px]">verified</span>
            <div>
              <h2 className="text-base font-bold text-on-surface">
                Section L: Human Review &amp; Audit Governance
              </h2>
              <p className="text-xs text-secondary mt-0.5">
                Mandatory human review seal certifying zero unverified assumptions.
              </p>
            </div>
          </div>
          {project.handoverCertified && !doc.isOutdated && !stats.isHandoverOutdated ? (
            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 text-xs font-semibold">
              Certified Record
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40 text-xs font-semibold">
              Uncertified / Re-Certification Required
            </span>
          )}
        </div>

        {/* Governance Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-surface-container-low/60 border border-outline-variant/30">
            <span className="block text-[10px] uppercase font-mono text-secondary">Approved Findings</span>
            <strong className="text-lg text-primary">{doc.reviewHistory.approvedCount}</strong>
          </div>
          <div className="p-3 rounded-lg bg-surface-container-low/60 border border-outline-variant/30">
            <span className="block text-[10px] uppercase font-mono text-secondary">Accepted Uncertain</span>
            <strong className="text-lg text-amber-600 dark:text-amber-400">{doc.reviewHistory.acceptedUncertainCount}</strong>
          </div>
          <div className="p-3 rounded-lg bg-surface-container-low/60 border border-outline-variant/30">
            <span className="block text-[10px] uppercase font-mono text-secondary">Rejected Claims</span>
            <strong className="text-lg text-rose-600 dark:text-rose-400">{doc.reviewHistory.rejectedCount}</strong>
          </div>
          <div className="p-3 rounded-lg bg-surface-container-low/60 border border-outline-variant/30">
            <span className="block text-[10px] uppercase font-mono text-secondary">Resolved Conflicts</span>
            <strong className="text-lg text-secondary font-semibold">{doc.reviewHistory.resolvedConflictsCount}</strong>
          </div>
        </div>

        {/* Audit Log Entries */}
        {doc.reviewHistory.auditActions && doc.reviewHistory.auditActions.length > 0 && (
          <div className="mt-1 space-y-1.5 text-xs">
            <span className="text-[11px] font-mono uppercase tracking-wider text-secondary block font-medium">
              Recorded Review Actions:
            </span>
            <div className="max-h-48 overflow-y-auto space-y-1.5 text-[11px] pr-2">
              {doc.reviewHistory.auditActions.map((act, aIdx) => (
                <div
                  key={aIdx}
                  className="flex items-center justify-between p-2 rounded bg-surface-container-low/40 border border-outline-variant/20"
                >
                  <span className="font-semibold text-on-surface">{act.actionType || act.action}</span>
                  <span className="text-secondary truncate max-w-xs">{act.reviewerNotes || act.notes || 'Reviewed'}</span>
                  <span className="text-secondary/70 font-mono text-[10px]">{act.reviewerName}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Signature Box */}
        <div className="pt-3 border-t border-outline-variant/20 flex flex-wrap items-center justify-between text-xs text-secondary font-mono">
          <span>Signer: <strong className="text-on-surface">{doc.certifiedBy}</strong></span>
          <span>Date: {doc.certifiedDate}</span>
          <span className="truncate max-w-sm">Hash: {doc.certificationHash}</span>
        </div>
      </section>

      {/* SHARE MODAL DIALOG */}
      {shareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-surface-container-lowest rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto no-scrollbar p-5 sm:p-6 shadow-2xl border border-outline-variant/50 flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/30">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">share</span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-on-surface">
                    Share Certified Handover
                  </h3>
                  <p className="text-xs text-secondary mt-0.5">
                    Read-only, zero-login public sharing link.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShareModalOpen(false)}
                className="text-secondary hover:text-on-surface p-1 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {isSharing ? (
              <div className="py-6 flex flex-col items-center justify-center">
                <KnowledgeTrailLoader
                  variant="section"
                  message="Preparing shareable link..."
                  submessage="Generating cryptographically secure read-only token..."
                  step={4}
                />
              </div>
            ) : shareError ? (
              <div className="p-3 rounded-lg bg-error/10 border border-error/30 text-error text-xs">
                {shareError}
              </div>
            ) : shareRevoked ? (
              <div className="p-4 rounded-lg bg-surface-container-low text-center space-y-2 text-xs border border-outline-variant/30">
                <span className="material-symbols-outlined text-[28px] text-error">link_off</span>
                <p className="font-semibold text-on-surface">Share link has been revoked.</p>
                <p className="text-secondary">The public link is no longer accessible.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 text-xs">
                <p className="text-secondary leading-relaxed">
                  Anyone with this link can view the read-only, certified engineering handover dossier without logging in or signing up.
                </p>

                <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-1.5 rounded-lg bg-surface-container-low border border-outline-variant/40 font-mono text-[11px]">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="bg-transparent flex-1 outline-none text-on-surface px-2 truncate min-w-0"
                  />
                  <button
                    onClick={handleCopyShareUrl}
                    className="w-full sm:w-auto px-3.5 h-8 bg-primary hover:bg-primary-hover text-on-primary rounded-md font-medium text-xs transition-colors shrink-0 flex items-center justify-center gap-1 shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      {copySuccess ? 'check' : 'content_copy'}
                    </span>
                    <span>{copySuccess ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 border-t border-outline-variant/30">
                  <button
                    onClick={handleRevokeShare}
                    className="inline-flex items-center gap-1 text-error hover:underline text-xs font-medium py-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">link_off</span>
                    <span>Revoke Share Link</span>
                  </button>
                  <a
                    href={shareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline text-xs font-medium py-1"
                  >
                    <span>Open in New Tab</span>
                    <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
