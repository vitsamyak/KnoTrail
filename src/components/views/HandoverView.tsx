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
      <div className="flex flex-col w-full gap-space-lg animate-in fade-in duration-200">
        <section className="bg-surface-container-lowest rounded-xl p-space-2xl shadow-sm border border-outline-variant/30 flex flex-col items-center text-center max-w-2xl mx-auto my-space-xl">
          <div className="w-16 h-16 rounded-2xl bg-surface-container-low text-primary flex items-center justify-center mb-space-md shadow-xs">
            <span className="material-symbols-outlined text-[36px]">description</span>
          </div>
          <h1 className="font-display-lg text-display-lg text-on-surface tracking-tight">
            No Handover Package Available
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-md mt-2 leading-relaxed">
            Upload genuine project documents, extract operational knowledge with AI, and complete review in the Review Center to generate a verified handover report.
          </p>
          <div className="flex items-center gap-space-sm mt-space-lg">
            <button
              onClick={() => setActiveView('sources')}
              className="inline-flex items-center gap-2 px-space-lg py-space-sm bg-primary hover:bg-primary-container text-on-primary rounded-lg font-headline-sm text-headline-sm shadow-sm transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">upload_file</span>
              <span>Upload Documents</span>
            </button>
            <button
              onClick={() => setActiveView('review')}
              className="inline-flex items-center gap-2 px-space-md py-space-sm bg-surface-container hover:bg-surface-container-high text-on-surface rounded-lg font-label-md text-label-md transition-colors border border-outline-variant/30"
            >
              <span className="material-symbols-outlined text-[18px]">rule</span>
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
      <div className="flex flex-col w-full gap-space-lg animate-in fade-in duration-200">
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
                <span>Unresolved Contradictions / Conflicts:</span>
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

            <p className="text-[11px] text-on-surface-variant pt-2 border-t border-outline-variant/20 italic">
              Blocking Reason: {stats.handoverBlockReason}
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

  // 3. READY TO GENERATE STATE: Unblocked but HandoverDocument not yet created
  if (!doc) {
    return (
      <div className="flex flex-col w-full gap-space-lg animate-in fade-in duration-200">
        <section className="bg-surface-container-lowest rounded-xl p-space-2xl shadow-sm border border-outline-variant/30 flex flex-col items-center text-center max-w-2xl mx-auto my-space-xl">
          <div className="w-16 h-16 rounded-2xl bg-secondary-container text-on-secondary-container flex items-center justify-center mb-space-md shadow-xs">
            <span className="material-symbols-outlined text-[36px]">verified</span>
          </div>
          <span className="text-xs font-mono uppercase tracking-wider text-primary font-bold">
            All Quality Gates Passed
          </span>
          <h1 className="font-display-lg text-display-lg text-on-surface tracking-tight mt-1">
            Handover Ready to Compile
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-md mt-2 leading-relaxed">
            All {stats.approvedCount} project findings are verified and approved with zero outstanding conflicts. Click below to generate the formal 12-section certified handover package.
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
            <div className="w-full bg-error-container text-on-error-container p-3 rounded-lg text-xs mt-3">
              {generationError}
            </div>
          )}

          <div className="flex items-center gap-space-sm mt-space-lg">
            <button
              onClick={() => handleGenerate(false)}
              disabled={isGenerating}
              className="inline-flex items-center gap-2 px-space-xl py-space-md bg-primary hover:bg-primary-container text-on-primary rounded-xl font-headline-sm text-headline-sm shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              {isGenerating ? (
                <KnowledgeTrailLoader variant="inline" size="sm" />
              ) : (
                <span className="material-symbols-outlined text-[20px]">auto_fix_high</span>
              )}
              <span>{isGenerating ? 'Compiling 12-Section Handover...' : 'Generate Certified Handover'}</span>
            </button>
          </div>
        </section>
      </div>
    );
  }

  // 4. UNLOCKED & GENERATED 12-SECTION HANDOVER DOSSIER
  const meta = doc.metadata;
  const counts = doc.sectionCounts;

  return (
    <div className="flex flex-col w-full gap-space-lg animate-in fade-in duration-200 pb-12">
      {/* OUTDATED INVALIDATION BANNER */}
      {(stats.isHandoverOutdated || doc.isOutdated) && (
        <aside
          role="alert"
          className="bg-amber-500/10 border-2 border-amber-500/40 rounded-xl p-space-md flex flex-wrap items-center justify-between gap-space-sm shadow-sm"
        >
          <div className="flex items-center gap-space-sm min-w-0">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[24px]">warning</span>
            </div>
            <div>
              <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                Handover Outdated (Current: {doc.version})
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant text-xs mt-0.5 leading-relaxed">
                {doc.outdatedReason ||
                  stats.handoverOutdatedReason ||
                  'Project data was modified after this handover was compiled. Regenerate to certify the latest findings.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => handleGenerate(true)}
            disabled={isGenerating}
            className="inline-flex items-center gap-2 px-space-md py-space-xs bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-label-md text-label-md shadow-sm transition-all active:scale-95 shrink-0 disabled:opacity-50"
          >
            {isGenerating ? (
              <KnowledgeTrailLoader variant="inline" size="sm" />
            ) : (
              <span className="material-symbols-outlined text-[16px]">refresh</span>
            )}
            <span>{isGenerating ? 'Updating Handover...' : 'Regenerate Handover'}</span>
          </button>
        </aside>
      )}

      {/* STICKY QUICK JUMP NAVIGATION BAR */}
      <nav
        aria-label="Handover Sections"
        className="sticky top-2 z-20 bg-surface-container-lowest/95 backdrop-blur-md rounded-xl p-2 shadow-sm border border-outline-variant/30 flex items-center gap-1.5 overflow-x-auto text-xs font-label-md no-scrollbar"
      >
        <span className="text-[11px] font-mono text-outline px-2 uppercase tracking-wider shrink-0">
          Jump:
        </span>
        <button
          onClick={() => scrollToSection('section-cover')}
          className="px-2.5 py-1 rounded-md hover:bg-surface-container text-on-surface shrink-0 transition-colors"
        >
          Cover
        </button>
        <button
          onClick={() => scrollToSection('section-summary')}
          className="px-2.5 py-1 rounded-md hover:bg-surface-container text-on-surface shrink-0 transition-colors"
        >
          Exec Summary
        </button>
        <button
          onClick={() => scrollToSection('section-overview')}
          className="px-2.5 py-1 rounded-md hover:bg-surface-container text-on-surface shrink-0 transition-colors"
        >
          Overview
        </button>
        <button
          onClick={() => scrollToSection('section-decisions')}
          className="px-2.5 py-1 rounded-md hover:bg-surface-container text-on-surface shrink-0 transition-colors"
        >
          Decisions ({counts.decisions})
        </button>
        <button
          onClick={() => scrollToSection('section-tasks')}
          className="px-2.5 py-1 rounded-md hover:bg-surface-container text-on-surface shrink-0 transition-colors"
        >
          Tasks ({counts.tasks})
        </button>
        <button
          onClick={() => scrollToSection('section-responsibilities')}
          className="px-2.5 py-1 rounded-md hover:bg-surface-container text-on-surface shrink-0 transition-colors"
        >
          Ownership
        </button>
        <button
          onClick={() => scrollToSection('section-risks')}
          className="px-2.5 py-1 rounded-md hover:bg-surface-container text-on-surface shrink-0 transition-colors"
        >
          Risks ({counts.risks})
        </button>
        <button
          onClick={() => scrollToSection('section-dependencies')}
          className="px-2.5 py-1 rounded-md hover:bg-surface-container text-on-surface shrink-0 transition-colors"
        >
          Dependencies ({counts.dependencies})
        </button>
        <button
          onClick={() => scrollToSection('section-questions')}
          className="px-2.5 py-1 rounded-md hover:bg-surface-container text-on-surface shrink-0 transition-colors"
        >
          Questions ({counts.questions})
        </button>
        <button
          onClick={() => scrollToSection('section-actions')}
          className="px-2.5 py-1 rounded-md hover:bg-surface-container text-on-surface shrink-0 transition-colors"
        >
          Next Actions ({counts.nextActions})
        </button>
        <button
          onClick={() => scrollToSection('section-evidence')}
          className="px-2.5 py-1 rounded-md hover:bg-surface-container text-on-surface shrink-0 transition-colors"
        >
          Evidence ({doc.evidenceInventory.length})
        </button>
        <button
          onClick={() => scrollToSection('section-history')}
          className="px-2.5 py-1 rounded-md hover:bg-surface-container text-on-surface shrink-0 transition-colors"
        >
          Review History
        </button>
      </nav>

      {/* TOP HEADER / ACTION CONTROLS BAR */}
      <section
        id="section-cover"
        className="bg-surface-container-lowest rounded-xl shadow-sm p-space-xl flex flex-col gap-space-md border border-outline-variant/30"
      >
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
                {meta.projectName}
              </span>
              <span className="material-symbols-outlined text-[13px]">chevron_right</span>
              <span className="text-on-surface font-semibold">Handover {doc.version}</span>
            </div>

            <div className="flex items-center gap-space-sm mt-1 flex-wrap">
              <h1 className="font-display-lg text-display-lg text-on-surface tracking-tight">
                {meta.projectName} Engineering Handover Dossier
              </h1>
              <span className="inline-flex items-center gap-1.5 px-space-sm py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-semibold border border-primary/20">
                <span className="material-symbols-outlined text-[16px] text-primary">verified</span>
                <span>Certified &amp; Approved ({doc.version})</span>
              </span>
            </div>
          </div>

          {/* Action Export & Share Buttons */}
          <div className="flex items-center gap-space-xs flex-wrap" id="action-bar">
            <button
              onClick={handleOpenShareModal}
              className="inline-flex items-center gap-1.5 px-space-sm py-2 rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container transition-colors font-label-md text-label-md border border-outline-variant/30"
            >
              <span className="material-symbols-outlined text-[17px]">share</span>
              <span>Share Link</span>
            </button>

            <button
              onClick={handlePrintPDF}
              disabled={exportingType !== null}
              className="inline-flex items-center gap-1.5 px-space-sm py-2 rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container transition-colors font-label-md text-label-md border border-outline-variant/30 disabled:opacity-50"
            >
              {exportingType === 'pdf' ? (
                <KnowledgeTrailLoader variant="inline" size="sm" />
              ) : (
                <span className="material-symbols-outlined text-[17px]">print</span>
              )}
              <span>{exportingType === 'pdf' ? 'Preparing PDF...' : 'Export PDF'}</span>
            </button>

            <button
              onClick={handleExportMarkdown}
              disabled={exportingType !== null}
              className="inline-flex items-center gap-1.5 px-space-sm py-2 rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container transition-colors font-label-md text-label-md border border-outline-variant/30 disabled:opacity-50"
            >
              {exportingType === 'md' ? (
                <KnowledgeTrailLoader variant="inline" size="sm" />
              ) : (
                <span className="material-symbols-outlined text-[17px]">markdown</span>
              )}
              <span>{exportingType === 'md' ? 'Exporting MD...' : 'Export Markdown'}</span>
            </button>

            <button
              onClick={handleExportJSON}
              disabled={exportingType !== null}
              className="inline-flex items-center gap-1.5 px-space-md py-2 rounded-lg bg-primary text-on-primary hover:bg-primary-container shadow-sm transition-all font-label-md text-label-md disabled:opacity-50"
            >
              {exportingType === 'json' ? (
                <KnowledgeTrailLoader variant="inline" size="sm" />
              ) : (
                <span className="material-symbols-outlined text-[17px]">data_object</span>
              )}
              <span>{exportingType === 'json' ? 'Generating JSON...' : 'Export JSON'}</span>
            </button>
          </div>
        </div>

        {/* SECTION A: COVER & PROJECT METADATA */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-space-xs text-outline font-label-md text-label-md border-t border-outline-variant/20 text-xs">
          <div>
            <span className="block text-[10px] uppercase font-mono">Project Code</span>
            <strong className="text-on-surface font-mono">{meta.projectCode}</strong>
          </div>
          <div>
            <span className="block text-[10px] uppercase font-mono">Target Exit Date</span>
            <strong className="text-on-surface">{meta.targetExitDate}</strong>
          </div>
          <div>
            <span className="block text-[10px] uppercase font-mono">Certified By</span>
            <strong className="text-on-surface">{doc.certifiedBy}</strong>
          </div>
          <div>
            <span className="block text-[10px] uppercase font-mono">Audit Stamp</span>
            <strong className="text-on-surface font-mono">{meta.auditStamp}</strong>
          </div>
        </div>

        {/* Transition Leads Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-outline-variant/10 text-xs">
          {meta.outgoingLead && (
            <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/20 flex items-center gap-3">
              <span className="material-symbols-outlined text-primary text-[22px]">logout</span>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-outline block">
                  Outgoing Transition Lead
                </span>
                <strong className="text-on-surface text-sm">{meta.outgoingLead.name}</strong>
                <span className="text-on-surface-variant block text-xs">
                  {meta.outgoingLead.role}
                </span>
              </div>
            </div>
          )}
          {meta.incomingLead && (
            <div className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/20 flex items-center gap-3">
              <span className="material-symbols-outlined text-secondary text-[22px]">login</span>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-outline block">
                  Incoming Operational Lead
                </span>
                <strong className="text-on-surface text-sm">{meta.incomingLead.name}</strong>
                <span className="text-on-surface-variant block text-xs">
                  {meta.incomingLead.role}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="text-[11px] font-mono text-outline pt-2 border-t border-outline-variant/10 flex items-center justify-between">
          <span>SHA-256 Signature Hash:</span>
          <span className="text-on-surface truncate max-w-md font-mono">{doc.certificationHash}</span>
        </div>
      </section>

      {/* SECTION B: EXECUTIVE SUMMARY */}
      <section
        id="section-summary"
        className="bg-surface-container-lowest rounded-xl p-space-xl border border-outline-variant/30 shadow-sm flex flex-col gap-space-sm"
      >
        <div className="flex items-center gap-2 text-primary font-bold">
          <span className="material-symbols-outlined text-[20px]">feed</span>
          <h2 className="font-headline-sm text-headline-sm tracking-tight text-on-surface">
            Section B: Executive Summary
          </h2>
        </div>
        <p className="font-body-lg text-body-lg text-on-surface leading-relaxed whitespace-pre-line text-sm">
          {doc.executiveSummary}
        </p>
      </section>

      {/* SECTION C: PROJECT OVERVIEW */}
      <section
        id="section-overview"
        className="bg-surface-container-lowest rounded-xl p-space-xl border border-outline-variant/30 shadow-sm flex flex-col gap-space-md"
      >
        <div className="flex items-center gap-2 text-primary font-bold">
          <span className="material-symbols-outlined text-[20px]">info</span>
          <h2 className="font-headline-sm text-headline-sm tracking-tight text-on-surface">
            Section C: Project Overview
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-lg bg-surface-container-low border border-outline-variant/20 space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-outline font-bold">Purpose</span>
            <p className="text-on-surface text-sm leading-relaxed">{doc.projectOverview.purpose}</p>
          </div>
          <div className="p-4 rounded-lg bg-surface-container-low border border-outline-variant/20 space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-outline font-bold">Scope</span>
            <p className="text-on-surface text-sm leading-relaxed">{doc.projectOverview.scope}</p>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-outline pt-2 border-t border-outline-variant/20">
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
        className="bg-surface-container-lowest rounded-xl p-space-xl border border-outline-variant/30 shadow-sm flex flex-col gap-space-md"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary font-bold">
            <span className="material-symbols-outlined text-[20px]">gavel</span>
            <h2 className="font-headline-sm text-headline-sm tracking-tight text-on-surface">
              Section D: Important Architectural Decisions ({doc.decisions.length})
            </h2>
          </div>
          <span className="text-xs font-mono text-outline">{doc.decisions.length} Approved</span>
        </div>

        <div className="flex flex-col gap-space-sm">
          {doc.decisions.length === 0 ? (
            <p className="text-xs text-on-surface-variant italic">No decisions recorded.</p>
          ) : (
            doc.decisions.map((dec) => {
              const isUncertain = dec.status === 'UNCERTAIN' || dec.claimStatus === 'UNCERTAIN';
              return (
                <div
                  key={dec.id}
                  className="bg-surface-container-low rounded-lg p-space-md border border-outline-variant/20 flex flex-col gap-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-surface-container text-outline">
                        {dec.category || 'Architecture'}
                      </span>
                      <strong className="text-sm text-on-surface font-semibold">{dec.title}</strong>
                    </div>
                    {isUncertain ? (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-200 font-semibold border border-amber-500/30">
                        <span className="material-symbols-outlined text-[13px]">help_outline</span>
                        <span>Accepted with Uncertainty</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-semibold">
                        <span className="material-symbols-outlined text-[13px]">verified</span>
                        <span>Verified</span>
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-on-surface leading-relaxed">{dec.summary}</p>

                  {/* Reviewer justification if accepted with uncertainty */}
                  {isUncertain && dec.reviewerNotes && (
                    <div className="p-2 rounded bg-amber-500/10 text-amber-900 dark:text-amber-100 text-[11px] border border-amber-500/20">
                      <strong>Reviewer Justification:</strong> {dec.reviewerNotes}
                    </div>
                  )}

                  {/* Citations */}
                  {dec.citations && dec.citations.length > 0 && (
                    <div className="text-[11px] text-outline pt-1 border-t border-outline-variant/10 space-y-1">
                      {dec.citations.map((c, i) => (
                        <div key={i} className="flex items-start gap-1">
                          <span className="material-symbols-outlined text-[14px] text-primary shrink-0 mt-0.5">
                            format_quote
                          </span>
                          <span className="italic text-on-surface-variant">
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
        className="bg-surface-container-lowest rounded-xl p-space-xl border border-outline-variant/30 shadow-sm flex flex-col gap-space-md"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary font-bold">
            <span className="material-symbols-outlined text-[20px]">assignment</span>
            <h2 className="font-headline-sm text-headline-sm tracking-tight text-on-surface">
              Section E: Pending Operational Tasks ({doc.tasks.length})
            </h2>
          </div>
          <span className="text-xs font-mono text-outline">{doc.tasks.length} Tracked</span>
        </div>

        <div className="flex flex-col gap-space-sm">
          {doc.tasks.length === 0 ? (
            <p className="text-xs text-on-surface-variant italic">No pending tasks recorded.</p>
          ) : (
            doc.tasks.map((task) => (
              <div
                key={task.id}
                className="bg-surface-container-low rounded-lg p-space-md border border-outline-variant/20 flex flex-col gap-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded font-semibold uppercase font-mono ${
                        task.urgency === 'critical'
                          ? 'bg-error-container text-on-error-container'
                          : task.urgency === 'high'
                          ? 'bg-amber-500/20 text-amber-800 dark:text-amber-200'
                          : 'bg-surface-container text-outline'
                      }`}
                    >
                      {task.urgency || 'Normal'}
                    </span>
                    <strong className="text-sm text-on-surface font-semibold">{task.title}</strong>
                  </div>
                  <span className="text-xs text-outline">
                    Assignee: <strong className="text-on-surface">{task.owner || 'Unassigned'}</strong>
                  </span>
                </div>
                <p className="text-xs text-on-surface leading-relaxed">{task.summary}</p>
                {task.citations && task.citations.length > 0 && (
                  <div className="text-[11px] text-outline pt-1 border-t border-outline-variant/10">
                    <span className="font-semibold">Source:</span> {task.citations[0].sourceName}
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
        className="bg-surface-container-lowest rounded-xl p-space-xl border border-outline-variant/30 shadow-sm flex flex-col gap-space-md"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary font-bold">
            <span className="material-symbols-outlined text-[20px]">groups</span>
            <h2 className="font-headline-sm text-headline-sm tracking-tight text-on-surface">
              Section F: Responsibilities &amp; Ownership
            </h2>
          </div>
        </div>

        {/* Assigned team members */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {doc.responsibilities.assigned.length === 0 ? (
            <p className="text-xs text-on-surface-variant italic col-span-full">
              No individual assignees identified.
            </p>
          ) : (
            doc.responsibilities.assigned.map((r, i) => (
              <div
                key={i}
                className="bg-surface-container-low rounded-lg p-3 border border-outline-variant/20 flex flex-col gap-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <strong className="text-sm text-on-surface">{r.owner}</strong>
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold text-[10px]">
                    {r.tasksCount} task(s)
                  </span>
                </div>
                <ul className="list-disc list-inside text-[11px] text-on-surface-variant space-y-1">
                  {r.taskTitles.slice(0, 3).map((t, idx) => (
                    <li key={idx} className="truncate">{t}</li>
                  ))}
                  {r.taskTitles.length > 3 && (
                    <li className="text-outline">+{r.taskTitles.length - 3} more</li>
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
            <p className="text-on-surface-variant text-[11px]">
              The following operational tasks have no designated owner and must be assigned to an incoming team member:
            </p>
            <ul className="list-disc list-inside space-y-1 text-on-surface text-xs">
              {doc.responsibilities.unassignedTasks.map((t) => (
                <li key={t.id} className="font-medium">
                  {t.title} <span className="text-outline font-normal">({t.urgency || 'normal'} priority)</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* SECTION G: RISKS & MITIGATIONS */}
      <section
        id="section-risks"
        className="bg-surface-container-lowest rounded-xl p-space-xl border border-outline-variant/30 shadow-sm flex flex-col gap-space-md"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary font-bold">
            <span className="material-symbols-outlined text-[20px]">warning</span>
            <h2 className="font-headline-sm text-headline-sm tracking-tight text-on-surface">
              Section G: Critical Risks &amp; Mitigations ({doc.risks.length})
            </h2>
          </div>
          <span className="text-xs font-mono text-outline">{doc.risks.length} Logged</span>
        </div>

        <div className="flex flex-col gap-space-sm">
          {doc.risks.length === 0 ? (
            <p className="text-xs text-on-surface-variant italic">No critical risks logged.</p>
          ) : (
            doc.risks.map((risk) => (
              <div
                key={risk.id}
                className="bg-surface-container-low rounded-lg p-space-md border border-outline-variant/20 flex flex-col gap-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] px-2 py-0.5 rounded font-semibold uppercase bg-error-container text-on-error-container font-mono">
                      {risk.urgency || 'High Risk'}
                    </span>
                    <strong className="text-sm text-on-surface font-semibold">{risk.title}</strong>
                  </div>
                </div>
                <p className="text-xs text-on-surface leading-relaxed">{risk.summary}</p>
                {/* Mitigation Strategy */}
                <div className="p-2.5 rounded bg-surface-container text-xs border border-outline-variant/20">
                  <span className="font-bold text-primary block text-[11px] uppercase">
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
        className="bg-surface-container-lowest rounded-xl p-space-xl border border-outline-variant/30 shadow-sm flex flex-col gap-space-md"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary font-bold">
            <span className="material-symbols-outlined text-[20px]">hub</span>
            <h2 className="font-headline-sm text-headline-sm tracking-tight text-on-surface">
              Section H: Technical Dependencies &amp; Integrations ({doc.dependencies.length})
            </h2>
          </div>
          <span className="text-xs font-mono text-outline">{doc.dependencies.length} Verified</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {doc.dependencies.length === 0 ? (
            <p className="text-xs text-on-surface-variant italic col-span-full">
              No technical dependencies cataloged.
            </p>
          ) : (
            doc.dependencies.map((dep) => (
              <div
                key={dep.id}
                className="bg-surface-container-low rounded-lg p-space-md border border-outline-variant/20 flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between">
                  <strong className="text-sm text-on-surface">{dep.title}</strong>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-container text-outline">
                    {dep.category || 'Service'}
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed">{dep.summary}</p>
                {dep.citations && dep.citations.length > 0 && (
                  <span className="text-[10px] text-outline pt-1 border-t border-outline-variant/10">
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
        className="bg-surface-container-lowest rounded-xl p-space-xl border border-outline-variant/30 shadow-sm flex flex-col gap-space-md"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary font-bold">
            <span className="material-symbols-outlined text-[20px]">help</span>
            <h2 className="font-headline-sm text-headline-sm tracking-tight text-on-surface">
              Section I: Unresolved Questions &amp; Ambiguities ({doc.unresolvedQuestions.length})
            </h2>
          </div>
          <span className="text-xs font-mono text-outline">{doc.unresolvedQuestions.length} Open</span>
        </div>

        <div className="flex flex-col gap-space-sm">
          {doc.unresolvedQuestions.length === 0 ? (
            <p className="text-xs text-on-surface-variant italic">No open questions identified.</p>
          ) : (
            doc.unresolvedQuestions.map((q) => (
              <div
                key={q.id}
                className="bg-surface-container-low rounded-lg p-space-md border border-outline-variant/20 flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between">
                  <strong className="text-sm text-on-surface font-semibold">{q.title}</strong>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-container text-outline">
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
        className="bg-surface-container-lowest rounded-xl p-space-xl border border-outline-variant/30 shadow-sm flex flex-col gap-space-md"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary font-bold">
            <span className="material-symbols-outlined text-[20px]">flag</span>
            <h2 className="font-headline-sm text-headline-sm tracking-tight text-on-surface">
              Section J: Prioritized Next Actions
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Immediate */}
          <div className="p-4 rounded-xl bg-error-container/10 border border-error/20 flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-error font-bold text-xs uppercase tracking-wider">
              <span className="material-symbols-outlined text-[16px]">priority_high</span>
              <span>Immediate ({doc.recommendedNextActions.immediate.length})</span>
            </div>
            {doc.recommendedNextActions.immediate.length === 0 ? (
              <p className="text-[11px] text-on-surface-variant italic">No immediate blockers.</p>
            ) : (
              <ul className="space-y-2 text-xs">
                {doc.recommendedNextActions.immediate.map((act) => (
                  <li key={act.id} className="p-2 rounded bg-surface-container-lowest border border-outline-variant/20">
                    <strong className="block text-on-surface">{act.title}</strong>
                    <span className="text-[11px] text-on-surface-variant line-clamp-2">{act.summary}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Short-Term */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-300 font-bold text-xs uppercase tracking-wider">
              <span className="material-symbols-outlined text-[16px]">schedule</span>
              <span>Short-Term ({doc.recommendedNextActions.shortTerm.length})</span>
            </div>
            {doc.recommendedNextActions.shortTerm.length === 0 ? (
              <p className="text-[11px] text-on-surface-variant italic">No short-term tasks.</p>
            ) : (
              <ul className="space-y-2 text-xs">
                {doc.recommendedNextActions.shortTerm.map((act) => (
                  <li key={act.id} className="p-2 rounded bg-surface-container-lowest border border-outline-variant/20">
                    <strong className="block text-on-surface">{act.title}</strong>
                    <span className="text-[11px] text-on-surface-variant line-clamp-2">{act.summary}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Follow-Up */}
          <div className="p-4 rounded-xl bg-secondary-container/30 border border-primary/20 flex flex-col gap-2">
            <div className="flex items-center gap-1.5 text-primary font-bold text-xs uppercase tracking-wider">
              <span className="material-symbols-outlined text-[16px]">done_all</span>
              <span>Follow-Up ({doc.recommendedNextActions.followUp.length})</span>
            </div>
            {doc.recommendedNextActions.followUp.length === 0 ? (
              <p className="text-[11px] text-on-surface-variant italic">No follow-up items.</p>
            ) : (
              <ul className="space-y-2 text-xs">
                {doc.recommendedNextActions.followUp.map((act) => (
                  <li key={act.id} className="p-2 rounded bg-surface-container-lowest border border-outline-variant/20">
                    <strong className="block text-on-surface">{act.title}</strong>
                    <span className="text-[11px] text-on-surface-variant line-clamp-2">{act.summary}</span>
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
        className="bg-surface-container-lowest rounded-xl p-space-xl border border-outline-variant/30 shadow-sm flex flex-col gap-space-md"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary font-bold">
            <span className="material-symbols-outlined text-[20px]">fact_check</span>
            <h2 className="font-headline-sm text-headline-sm tracking-tight text-on-surface">
              Section K: Evidence &amp; Source Inventory ({doc.evidenceInventory.length})
            </h2>
          </div>
        </div>

        <div className="flex flex-col gap-space-xs text-xs">
          {doc.evidenceInventory.length === 0 ? (
            <p className="text-xs text-on-surface-variant italic">No supporting citations recorded.</p>
          ) : (
            doc.evidenceInventory.map((item, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/20 flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-on-surface">
                    {item.findingTitle}{' '}
                    <span className="text-[10px] text-outline font-normal">({item.findingType})</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded font-mono font-semibold bg-surface-container text-outline">
                    {item.status}
                  </span>
                </div>
                {item.citations && item.citations.length > 0 ? (
                  item.citations.map((c, cIdx) => (
                    <div key={cIdx} className="text-[11px] text-on-surface-variant pl-3 border-l-2 border-primary/30">
                      <span className="font-semibold text-on-surface">{c.sourceName}</span>
                      {c.pageNumber ? ` • Page ${c.pageNumber}` : ''}
                      {c.lineNumber ? ` • Line ${c.lineNumber}` : ''}
                      <p className="italic mt-0.5">&quot;{c.quote || c.snippet}&quot;</p>
                    </div>
                  ))
                ) : (
                  <span className="text-[11px] text-outline italic">No citation quotes available.</span>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      {/* SECTION L: HUMAN REVIEW HISTORY & AUDIT TRAIL */}
      <section
        id="section-history"
        className="bg-inverse-surface text-inverse-on-surface rounded-xl p-space-xl border border-primary/40 shadow-md flex flex-col gap-space-md print-page-break"
      >
        <div className="flex flex-wrap items-center justify-between gap-space-sm border-b border-inverse-on-surface/10 pb-space-md">
          <div className="flex items-center gap-space-sm">
            <span className="material-symbols-outlined text-primary text-[28px]">verified</span>
            <div>
              <h2 className="font-headline-sm text-headline-sm text-inverse-on-surface font-bold">
                Section L: Human Review &amp; Audit Governance
              </h2>
              <p className="font-label-sm text-label-sm text-inverse-on-surface/70">
                Mandatory human review seal certifying zero unverified assumptions.
              </p>
            </div>
          </div>
          <span className="px-space-md py-1 rounded-full bg-primary/20 text-primary border border-primary/30 font-label-sm text-label-sm font-semibold">
            Certified Record
          </span>
        </div>

        {/* Governance Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-surface-container-lowest/10 border border-white/10">
            <span className="block text-[10px] uppercase text-inverse-on-surface/60">Approved Findings</span>
            <strong className="text-lg text-primary">{doc.reviewHistory.approvedCount}</strong>
          </div>
          <div className="p-3 rounded-lg bg-surface-container-lowest/10 border border-white/10">
            <span className="block text-[10px] uppercase text-inverse-on-surface/60">Accepted Uncertain</span>
            <strong className="text-lg text-amber-400">{doc.reviewHistory.acceptedUncertainCount}</strong>
          </div>
          <div className="p-3 rounded-lg bg-surface-container-lowest/10 border border-white/10">
            <span className="block text-[10px] uppercase text-inverse-on-surface/60">Rejected Claims</span>
            <strong className="text-lg text-error">{doc.reviewHistory.rejectedCount}</strong>
          </div>
          <div className="p-3 rounded-lg bg-surface-container-lowest/10 border border-white/10">
            <span className="block text-[10px] uppercase text-inverse-on-surface/60">Resolved Conflicts</span>
            <strong className="text-lg text-secondary">{doc.reviewHistory.resolvedConflictsCount}</strong>
          </div>
        </div>

        {/* Audit Log Entries */}
        {doc.reviewHistory.auditActions && doc.reviewHistory.auditActions.length > 0 && (
          <div className="mt-2 space-y-1.5 text-xs">
            <span className="text-[11px] font-mono uppercase tracking-wider text-inverse-on-surface/60 block">
              Recorded Review Actions:
            </span>
            <div className="max-h-48 overflow-y-auto space-y-1 text-[11px] pr-2">
              {doc.reviewHistory.auditActions.map((act, aIdx) => (
                <div
                  key={aIdx}
                  className="flex items-center justify-between p-2 rounded bg-white/5 border border-white/5"
                >
                  <span className="font-semibold text-inverse-on-surface">{act.actionType || act.action}</span>
                  <span className="text-inverse-on-surface/70 truncate max-w-xs">{act.reviewerNotes || act.notes || 'Reviewed'}</span>
                  <span className="text-inverse-on-surface/50 font-mono text-[10px]">{act.reviewerName}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Signature Box */}
        <div className="pt-3 border-t border-inverse-on-surface/10 flex flex-wrap items-center justify-between text-xs text-inverse-on-surface/70 font-mono">
          <span>Signer: {doc.certifiedBy}</span>
          <span>Date: {doc.certifiedDate}</span>
          <span className="truncate max-w-sm">Hash: {doc.certificationHash}</span>
        </div>
      </section>

      {/* SHARE MODAL DIALOG */}
      {shareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-surface-container-lowest rounded-2xl max-w-lg w-full p-6 shadow-xl border border-outline-variant/30 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">share</span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                  Share Certified Handover
                </h3>
              </div>
              <button
                onClick={() => setShareModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center text-outline"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {isSharing ? (
              <div className="py-6 flex flex-col items-center justify-center">
                <KnowledgeTrailLoader
                  variant="section"
                  message="Preparing shareable handover link..."
                  submessage="Generating cryptographically secure read-only token..."
                  step={4}
                />
              </div>
            ) : shareError ? (
              <div className="p-3 rounded-lg bg-error-container text-on-error-container text-xs">
                {shareError}
              </div>
            ) : shareRevoked ? (
              <div className="p-4 rounded-lg bg-surface-container text-center space-y-2 text-xs">
                <span className="material-symbols-outlined text-[32px] text-error">link_off</span>
                <p className="font-semibold text-on-surface">Share link has been revoked.</p>
                <p className="text-on-surface-variant">The public link is no longer accessible.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 text-xs">
                <p className="text-on-surface-variant leading-relaxed">
                  Anyone with this link can view the read-only, certified engineering handover dossier without logging in or signing up.
                </p>

                <div className="flex items-center gap-2 p-2 rounded-lg bg-surface-container-low border border-outline-variant/30 font-mono text-[11px]">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="bg-transparent flex-1 outline-none text-on-surface truncate"
                  />
                  <button
                    onClick={handleCopyShareUrl}
                    className="px-3 py-1 bg-primary text-on-primary rounded font-semibold text-xs hover:bg-primary-container transition-colors shrink-0 flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      {copySuccess ? 'check' : 'content_copy'}
                    </span>
                    <span>{copySuccess ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-outline-variant/20">
                  <button
                    onClick={handleRevokeShare}
                    className="inline-flex items-center gap-1 text-error hover:underline text-xs font-semibold"
                  >
                    <span className="material-symbols-outlined text-[14px]">link_off</span>
                    <span>Revoke Share Link</span>
                  </button>
                  <a
                    href={shareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline text-xs font-semibold"
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
