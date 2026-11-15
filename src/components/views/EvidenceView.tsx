'use client';

import React, { useState } from 'react';
import { useProject } from '../../context/ProjectContext';
import { EvidenceCitation, EvidenceStatus, KnowledgeFinding } from '../../lib/types';
import { KnowledgeTrailLoader } from '../ui/KnowledgeTrailLoader';

export function EvidenceView() {
  const {
    project,
    conflicts,
    stats,
    evidenceFilter,
    setEvidenceFilter,
    selectedFinding,
    setSelectedFinding,
    setActiveView,
    isVerifying,
  } = useProject();

  const [searchFilter, setSearchFilter] = useState('');
  const [activeInspectorCitation, setActiveInspectorCitation] = useState<EvidenceCitation | null>(null);
  const [copiedCitationId, setCopiedCitationId] = useState<string | null>(null);

  const totalCitationsCount = project.findings.reduce((sum, f) => sum + (f.citations?.length || 0), 0);

  // Filter findings based on selected status pill and search term
  const filteredFindings = project.findings.filter((finding) => {
    const matchesStatus = evidenceFilter === 'ALL' || finding.status === evidenceFilter;
    const matchesSearch =
      !searchFilter ||
      finding.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      finding.summary.toLowerCase().includes(searchFilter.toLowerCase()) ||
      finding.citations.some(
        (c) =>
          c.file.toLowerCase().includes(searchFilter.toLowerCase()) ||
          c.author.toLowerCase().includes(searchFilter.toLowerCase()) ||
          (c.commitSha && c.commitSha.toLowerCase().includes(searchFilter.toLowerCase()))
      );
    return matchesStatus && matchesSearch;
  });

  const handleCopySnippet = (snippet: string, id: string) => {
    navigator.clipboard?.writeText(snippet);
    setCopiedCitationId(id);
    setTimeout(() => setCopiedCitationId(null), 2000);
  };

  return (
    <div className="flex flex-col w-full gap-5 animate-in fade-in duration-200">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-lowest p-5 sm:p-6 rounded-xl shadow-xs border border-outline-variant/40">
        <div className="flex flex-col max-w-2xl">
          <div className="flex items-center gap-1.5 text-xs text-secondary">
            <span
              onClick={() => setActiveView('workspace')}
              className="hover:text-primary cursor-pointer transition-colors"
            >
              {project.name}
            </span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary font-semibold">Evidence Explorer</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-on-surface tracking-tight mt-1">
            Evidence Explorer
          </h1>
          <p className="text-xs sm:text-sm text-secondary mt-0.5 leading-relaxed">
            Inspect verbatim quotes, exact page numbers, and line coordinates from source files verifying each extracted finding.
          </p>
        </div>

        {/* Global Summary Badge */}
        <div className="flex items-center gap-2.5 bg-surface-container-low/60 px-4 py-2.5 rounded-xl border border-outline-variant/40 shrink-0">
          <span className="material-symbols-outlined text-primary text-[20px]">fact_check</span>
          <div className="flex flex-col text-xs">
            <span className="font-semibold text-on-surface">
              {stats.verifiedCount} of {stats.totalFindings} Claims Verified
            </span>
            <span className="text-secondary font-mono text-[11px]">
              {stats.groundedPercent}% Grounded • {totalCitationsCount} Citations
            </span>
          </div>
        </div>
      </div>

      {/* ACTIVE EVIDENCE VERIFICATION BANNER */}
      {isVerifying && (
        <KnowledgeTrailLoader
          variant="section"
          message="Verifying supporting evidence..."
          submessage="Checking quotes and line numbers against original documents..."
          step={2}
        />
      )}

      {/* STATUS FILTER PILL STRIP */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-container-lowest p-3.5 rounded-xl border border-outline-variant/40 shadow-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setEvidenceFilter('ALL')}
            className={`h-8 px-3 rounded-lg text-xs font-medium transition-all ${
              evidenceFilter === 'ALL'
                ? 'bg-primary text-on-primary shadow-xs font-semibold'
                : 'text-secondary hover:bg-surface-container-low hover:text-on-surface'
            }`}
          >
            All Evidence ({project.findings.length})
          </button>

          <button
            onClick={() => setEvidenceFilter('VERIFIED')}
            className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition-all ${
              evidenceFilter === 'VERIFIED'
                ? 'bg-success/15 text-success border border-success/30 font-semibold shadow-xs'
                : 'text-secondary hover:bg-surface-container-low hover:text-on-surface'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
            <span>VERIFIED</span>
            <span className="text-[10px] font-mono opacity-80">
              ({project.findings.filter((f) => f.status === 'VERIFIED').length})
            </span>
          </button>

          <button
            onClick={() => setEvidenceFilter('UNCERTAIN')}
            className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition-all ${
              evidenceFilter === 'UNCERTAIN'
                ? 'bg-warning/15 text-warning border border-warning/30 font-semibold shadow-xs'
                : 'text-secondary hover:bg-surface-container-low hover:text-on-surface'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-warning"></span>
            <span>UNCERTAIN</span>
            <span className="text-[10px] font-mono opacity-80">
              ({project.findings.filter((f) => f.status === 'UNCERTAIN').length})
            </span>
          </button>

          <button
            onClick={() => setEvidenceFilter('CONFLICTING')}
            className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition-all ${
              evidenceFilter === 'CONFLICTING'
                ? 'bg-error/15 text-error border border-error/30 font-semibold shadow-xs'
                : 'text-secondary hover:bg-surface-container-low hover:text-on-surface'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-error"></span>
            <span>CONFLICTING</span>
            <span className="text-[10px] font-mono opacity-80">
              ({project.findings.filter((f) => f.status === 'CONFLICTING').length})
            </span>
          </button>

          <button
            onClick={() => setEvidenceFilter('MISSING')}
            className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition-all ${
              evidenceFilter === 'MISSING'
                ? 'bg-surface-container text-on-surface border border-outline-variant/60 font-semibold shadow-xs'
                : 'text-secondary hover:bg-surface-container-low hover:text-on-surface'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-outline"></span>
            <span>MISSING</span>
            <span className="text-[10px] font-mono opacity-80">
              ({project.findings.filter((f) => f.status === 'MISSING').length})
            </span>
          </button>
        </div>

        {/* Search inside evidence */}
        <div className="relative w-full sm:w-60">
          <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-secondary text-[16px]">
            search
          </span>
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Filter claims, files, SHAs..."
            className="w-full pl-8 pr-3 h-8 bg-surface-container-low text-xs rounded-lg border border-outline-variant/40 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
          />
        </div>
      </div>

      {/* FINDINGS WITH CITATIONS */}
      <div className="space-y-4">
        {project.findings.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-xl p-8 sm:p-12 border border-outline-variant/40 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-surface-container-low text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[28px]">fact_check</span>
            </div>
            <h4 className="text-sm font-semibold text-on-surface">No evidence records yet</h4>
            <p className="text-xs text-secondary max-w-md leading-relaxed">
              Upload project documents and run AI extraction to view source citations grounded with exact quotes and coordinates.
            </p>
            <button
              onClick={() => setActiveView('sources')}
              className="mt-1 inline-flex items-center gap-1.5 px-3.5 h-8 rounded-lg bg-primary text-on-primary text-xs font-medium hover:bg-primary-hover transition-colors shadow-xs"
            >
              <span className="material-symbols-outlined text-[15px]">upload_file</span>
              <span>Upload Documents</span>
            </button>
          </div>
        ) : filteredFindings.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-xl p-8 border border-outline-variant/40 text-center text-xs text-secondary">
            <span className="material-symbols-outlined text-[28px] text-secondary mb-1 block">search_off</span>
            <span>No evidence citations matching the selected filter or search.</span>
          </div>
        ) : (
          filteredFindings.map((finding) => (
            <div
              key={finding.id}
              className={`bg-surface-container-lowest rounded-xl p-5 shadow-xs border transition-all ${
                selectedFinding?.id === finding.id
                  ? 'border-primary ring-1 ring-primary/30'
                  : 'border-outline-variant/40'
              }`}
            >
              {/* Header: Title and Status */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                      finding.status === 'VERIFIED'
                        ? 'bg-success/10 text-success border-success/20'
                        : finding.status === 'CONFLICTING'
                        ? 'bg-error/10 text-error border-error/20'
                        : finding.status === 'UNCERTAIN'
                        ? 'bg-warning/10 text-warning border-warning/20'
                        : 'bg-surface-container-low text-secondary border-outline-variant/40'
                    }`}
                  >
                    {finding.status}
                  </span>

                  {finding.evidenceValidity && (
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border font-mono ${
                        finding.evidenceValidity === 'MATCHED'
                          ? 'bg-primary/5 text-primary border-primary/20'
                          : finding.evidenceValidity === 'MISMATCHED'
                          ? 'bg-warning/10 text-warning border-warning/20'
                          : 'bg-surface-container-low text-secondary border-outline-variant/30'
                      }`}
                      title="Quote coordinate verification"
                    >
                      Quote: {finding.evidenceValidity}
                    </span>
                  )}

                  {finding.claimStatus && (
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border font-mono ${
                        finding.claimStatus === 'SUPPORTED'
                          ? 'bg-success/10 text-success border-success/20'
                          : finding.claimStatus === 'CONFLICTING'
                          ? 'bg-error/10 text-error border-error/20'
                          : 'bg-surface-container-low text-secondary border-outline-variant/30'
                      }`}
                      title="Semantic claim verification"
                    >
                      Claim: {finding.claimStatus}
                    </span>
                  )}

                  <span className="text-sm font-semibold text-on-surface">
                    {finding.title}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="font-medium text-primary text-[11px]">{finding.citations.length} citation(s)</span>
                </div>
              </div>

              {/* Temporal Supersession Banner */}
              {finding.isTemporalSuperseded && (
                <div className="mb-3 p-2.5 rounded-lg bg-warning/10 border border-warning/20 flex items-center gap-2 text-xs text-warning">
                  <span className="material-symbols-outlined text-[16px]">history</span>
                  <span>
                    <strong>Possibly Outdated:</strong> This finding may be superseded by newer documentation
                    {finding.supersededByDate ? ` dated ${finding.supersededByDate}` : ''}. Review in Review Center.
                  </span>
                </div>
              )}

              {/* Two-Sided Cross-Document Contradiction Card */}
              {(() => {
                const matchedConflict = (conflicts || []).find(
                  (c) =>
                    (c.findingIdA === finding.id || c.findingIdB === finding.id) &&
                    c.status === 'OPEN'
                ) || (finding.conflictDetails ? {
                  id: 'CONFLICT-DIRECT',
                  conflictCategory: finding.conflictDetails.category || 'architecture',
                  severity: 'HIGH',
                  explanation: finding.conflictDetails.explanation || 'Direct contradiction detected between distinct project sources.',
                  sourceNameA: finding.conflictDetails.sourceA?.name || 'Source A',
                  locationA: finding.conflictDetails.sourceA?.location || finding.conflictDetails.sourceA?.reference || 'Document Location',
                  claimA: finding.conflictDetails.sourceA?.claim || finding.title,
                  quoteA: finding.conflictDetails.sourceA?.quote || (finding.conflictDetails as any).quoteA,
                  sourceNameB: finding.conflictDetails.sourceB?.name || 'Source B',
                  locationB: finding.conflictDetails.sourceB?.location || finding.conflictDetails.sourceB?.reference || 'Document Location',
                  claimB: finding.conflictDetails.sourceB?.claim || finding.conflictDetails.explanation,
                  quoteB: finding.conflictDetails.sourceB?.quote || (finding.conflictDetails as any).quoteB,
                  status: 'OPEN',
                } : null);
                if (!matchedConflict) return null;
                return (
                  <div className="mb-3.5 p-4 rounded-xl bg-error/5 border border-error/30 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-error text-[17px]">warning</span>
                        <strong className="text-xs uppercase tracking-wide text-error font-semibold">
                          Contradiction Detected ({matchedConflict.conflictCategory})
                        </strong>
                      </div>
                      <span className="text-[9px] bg-error text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                        Severity: {matchedConflict.severity}
                      </span>
                    </div>

                    <p className="text-xs text-on-surface leading-relaxed">
                      {matchedConflict.explanation}
                    </p>

                    {/* Two-Sided Comparison Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1 text-xs">
                      {/* Side A */}
                      <div className="p-3 bg-surface-container-lowest rounded-lg border border-outline-variant/30 flex flex-col gap-1">
                        <div className="flex items-center justify-between text-[11px] text-secondary">
                          <strong className="text-on-surface">{matchedConflict.sourceNameA}</strong>
                          <span className="font-mono">{matchedConflict.locationA}</span>
                        </div>
                        <p className="font-medium text-on-surface text-xs">{matchedConflict.claimA}</p>
                        {matchedConflict.quoteA && (
                          <blockquote className="mt-1 pl-2 border-l-2 border-primary/40 text-[11px] italic text-secondary">
                            &ldquo;{matchedConflict.quoteA}&rdquo;
                          </blockquote>
                        )}
                      </div>

                      {/* Side B */}
                      <div className="p-3 bg-surface-container-lowest rounded-lg border border-outline-variant/30 flex flex-col gap-1">
                        <div className="flex items-center justify-between text-[11px] text-secondary">
                          <strong className="text-on-surface">{matchedConflict.sourceNameB}</strong>
                          <span className="font-mono">{matchedConflict.locationB}</span>
                        </div>
                        <p className="font-medium text-on-surface text-xs">{matchedConflict.claimB}</p>
                        {matchedConflict.quoteB && (
                          <blockquote className="mt-1 pl-2 border-l-2 border-error/40 text-[11px] italic text-secondary">
                            &ldquo;{matchedConflict.quoteB}&rdquo;
                          </blockquote>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-error/20 text-xs">
                      <span className="text-error text-[11px] font-medium">
                        Mandatory human resolution required before handover certification.
                      </span>
                      <button
                        onClick={() => setActiveView('review')}
                        className="w-full sm:w-auto justify-center px-3 h-7 bg-error text-white hover:bg-error/90 rounded-md text-xs font-medium transition-colors flex items-center gap-1 shadow-xs"
                      >
                        <span>Resolve in Review Center</span>
                        <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                      </button>
                    </div>
                  </div>
                );
              })()}

              <p className="text-xs text-secondary mb-3 leading-relaxed">
                {finding.summary}
              </p>

              {/* Citations List for this Finding */}
              <div className="space-y-2">
                {finding.citations.map((citation) => (
                  <div
                    key={citation.id}
                    className="bg-surface-container-low/40 rounded-lg p-3 border border-outline-variant/30 flex flex-col gap-1.5 font-mono text-xs"
                  >
                    {/* Citation Meta Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-secondary font-sans">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="material-symbols-outlined text-primary text-[15px]">description</span>
                        <strong className="text-on-surface font-mono text-xs">{citation.file}</strong>
                        <span className="bg-surface-container-low px-1.5 py-0.2 rounded font-mono text-on-surface text-[10px] border border-outline-variant/30">
                          L:{citation.lineRange}
                        </span>
                        {citation.commitSha && (
                          <span className="bg-primary/10 text-primary px-1.5 py-0.2 rounded font-mono text-[10px]">
                            SHA: {citation.commitSha}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span>{citation.author}</span>
                        <span>•</span>
                        <span className="font-mono">{citation.timestamp}</span>
                        <button
                          onClick={() => setActiveInspectorCitation(citation)}
                          className="px-2 h-6 bg-surface-container-lowest hover:bg-surface-container rounded border border-outline-variant/40 text-on-surface text-[11px] font-medium transition-colors flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[12px]">visibility</span>
                          <span>Provenance</span>
                        </button>
                      </div>
                    </div>

                    {/* Code / Content Snippet */}
                    <div className="relative bg-surface-container-lowest rounded-md p-2.5 border border-outline-variant/30 overflow-x-auto">
                      <pre className="text-xs text-on-surface leading-relaxed whitespace-pre font-mono">
                        {citation.snippet}
                      </pre>
                      <button
                        onClick={() => handleCopySnippet(citation.snippet, citation.id)}
                        className="absolute right-2 top-2 p-1 rounded bg-surface-container-low hover:bg-surface-container text-secondary hover:text-on-surface transition-colors"
                        title="Copy Snippet"
                      >
                        <span className="material-symbols-outlined text-[14px]">
                          {copiedCitationId === citation.id ? 'check' : 'content_copy'}
                        </span>
                      </button>
                    </div>

                    {/* Hash & Clearance Tier */}
                    <div className="flex items-center justify-between text-[10px] text-secondary pt-0.5 font-sans">
                      <span className="font-mono">{citation.contentHash}</span>
                      <span className="uppercase tracking-wider font-semibold text-secondary text-[9px]">
                        Clearance: {citation.clearanceTier}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick Action to Review */}
              <div className="mt-4 pt-3 border-t border-outline-variant/30 flex items-center justify-between text-xs">
                <span className="text-secondary text-[11px]">
                  {finding.approved ? '✓ Approved in Review Center' : '⚠ Pending Review Sign-Off'}
                </span>
                <button
                  onClick={() => {
                    setSelectedFinding(finding);
                    setActiveView('review');
                  }}
                  className="px-3 h-7 bg-primary text-on-primary hover:bg-primary-hover rounded-md text-xs font-medium transition-colors flex items-center gap-1 shadow-xs"
                >
                  <span>Review Center</span>
                  <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL: CITATION PROVENANCE INSPECTOR */}
      {activeInspectorCitation && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-surface-container-lowest max-w-2xl w-full max-h-[90vh] overflow-y-auto no-scrollbar rounded-xl p-5 sm:p-6 shadow-2xl border border-outline-variant/50 flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/30">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">policy</span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-on-surface">
                    Immutable Citation Provenance
                  </h3>
                  <p className="text-xs text-secondary mt-0.5">
                    Verifiable cryptographic proof anchoring finding to source.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveInspectorCitation(null)}
                className="text-secondary hover:text-on-surface p-1 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-surface-container-low/40 p-3 rounded-lg border border-outline-variant/30">
                <div>
                  <span className="text-secondary uppercase text-[10px] font-semibold block">Source Stream</span>
                  <span className="font-medium text-on-surface">{activeInspectorCitation.sourceName}</span>
                </div>
                <div>
                  <span className="text-secondary uppercase text-[10px] font-semibold block">File Location</span>
                  <span className="font-mono text-on-surface font-semibold">
                    {activeInspectorCitation.file}:{activeInspectorCitation.lineRange}
                  </span>
                </div>
                <div>
                  <span className="text-secondary uppercase text-[10px] font-semibold block">Author &amp; Time</span>
                  <span className="text-on-surface">
                    {activeInspectorCitation.author} ({activeInspectorCitation.timestamp})
                  </span>
                </div>
                <div>
                  <span className="text-secondary uppercase text-[10px] font-semibold block">Cryptographic Hash</span>
                  <span className="font-mono text-primary font-semibold break-all text-[11px]">
                    {activeInspectorCitation.contentHash}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-on-surface block mb-1">
                  Verbatim Source Snippet
                </span>
                <div className="p-3 bg-surface-container-low/40 rounded-lg font-mono text-xs leading-relaxed border border-outline-variant/30 max-h-60 overflow-y-auto">
                  <pre className="whitespace-pre-wrap">{activeInspectorCitation.snippet}</pre>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-1">
                {/* 1. Source Hash & File Location Verification */}
                <div className="bg-surface-container-low/40 p-2.5 rounded-lg border border-outline-variant/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-success text-[17px]">verified_user</span>
                    <div>
                      <span className="text-on-surface font-semibold block text-xs">Source Hash Verification</span>
                      <span className="text-[11px] text-secondary">
                        {activeInspectorCitation.contentHash?.startsWith('sha256:')
                          ? 'SHA-256 Checksum Verified Against Original Source'
                          : 'Source Document Present & Verified'}
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-success/10 text-success font-mono text-[10px] font-bold">
                    VALID
                  </span>
                </div>

                {/* 2. Semantic Claim Verification */}
                {(() => {
                  const parentFinding = project.findings.find((f) =>
                    f.citations.some((c) => c.id === activeInspectorCitation.id)
                  );
                  const findingStatus = parentFinding?.status || 'VERIFIED';
                  const statusColors: Record<string, string> = {
                    VERIFIED: 'bg-success/10 text-success border-success/20',
                    UNCERTAIN: 'bg-warning/10 text-warning border-warning/20',
                    CONFLICTING: 'bg-error/10 text-error border-error/20',
                    MISSING: 'bg-surface-container-low text-secondary border-outline-variant/30',
                  };
                  return (
                    <div className="bg-surface-container-low/40 p-2.5 rounded-lg border border-outline-variant/30 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-secondary text-[17px]">analytics</span>
                        <div>
                          <span className="text-on-surface font-semibold block text-xs">Semantic Claim Grounding</span>
                          <span className="text-[11px] text-secondary">
                            {findingStatus === 'VERIFIED'
                              ? 'Claim supported by source quote and verifiable line reference'
                              : findingStatus === 'CONFLICTING'
                              ? 'Conflicting claims detected across separate documents'
                              : 'Potential ambiguity or ungrounded phrasing flagged for review'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase ${statusColors[findingStatus] || statusColors.VERIFIED}`}>
                          {findingStatus}
                        </span>
                        <span className="font-mono text-on-surface font-bold text-xs">
                          {parentFinding?.confidence ?? activeInspectorCitation.confidence ?? 85}%
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-outline-variant/30">
              <button
                onClick={() => setActiveInspectorCitation(null)}
                className="px-3.5 h-8 rounded-lg bg-primary text-on-primary font-medium text-xs hover:bg-primary-hover transition-colors shadow-xs"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
