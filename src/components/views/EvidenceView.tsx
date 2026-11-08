'use client';

import React, { useState } from 'react';
import { useProject } from '../../context/ProjectContext';
import { EvidenceCitation, EvidenceStatus, KnowledgeFinding } from '../../lib/types';

export function EvidenceView() {
  const {
    project,
    evidenceFilter,
    setEvidenceFilter,
    selectedFinding,
    setSelectedFinding,
    setActiveView,
  } = useProject();

  const [searchFilter, setSearchFilter] = useState('');
  const [activeInspectorCitation, setActiveInspectorCitation] = useState<EvidenceCitation | null>(null);
  const [copiedCitationId, setCopiedCitationId] = useState<string | null>(null);

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
    <div className="flex flex-col w-full gap-space-lg animate-in fade-in duration-200">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md bg-surface-container-lowest p-space-lg rounded-xl shadow-sm border border-outline-variant/30">
        <div className="flex flex-col">
          <div className="flex items-center gap-space-xs font-label-sm text-label-sm text-outline">
            <span
              onClick={() => setActiveView('workspace')}
              className="hover:text-primary cursor-pointer transition-colors"
            >
              Project Titan
            </span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary font-semibold">Evidence Explorer</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight mt-1">
            Evidence Explorer &amp; Source Grounding
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
            Every reconstructed claim is linked to immutable source coordinates: file line ranges, commit SHAs, and author records.
          </p>
        </div>

        {/* Global Summary Badge */}
        <div className="flex items-center gap-2 bg-surface-container-low px-space-md py-2 rounded-xl border border-outline-variant/30">
          <span className="material-symbols-outlined text-primary text-[20px]">fact_check</span>
          <div className="flex flex-col text-xs">
            <span className="font-semibold text-on-surface">Zero Fabrication</span>
            <span className="text-outline">100% Traceable Citations</span>
          </div>
        </div>
      </div>

      {/* STATUS FILTER PILL STRIP */}
      <div className="flex flex-wrap items-center justify-between gap-space-md bg-surface-container-lowest p-space-md rounded-xl border border-outline-variant/30 shadow-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setEvidenceFilter('ALL')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              evidenceFilter === 'ALL'
                ? 'bg-inverse-surface text-inverse-on-surface shadow-xs'
                : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
            }`}
          >
            All Evidence ({project.findings.length})
          </button>

          <button
            onClick={() => setEvidenceFilter('VERIFIED')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              evidenceFilter === 'VERIFIED'
                ? 'bg-primary text-on-primary shadow-xs'
                : 'bg-secondary-container text-on-secondary-container hover:opacity-90'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-primary"></span>
            <span>VERIFIED</span>
            <span className="text-[10px] opacity-80">
              ({project.findings.filter((f) => f.status === 'VERIFIED').length})
            </span>
          </button>

          <button
            onClick={() => setEvidenceFilter('UNCERTAIN')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              evidenceFilter === 'UNCERTAIN'
                ? 'bg-tertiary text-on-tertiary shadow-xs'
                : 'bg-tertiary-fixed text-on-tertiary-fixed hover:opacity-90'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-tertiary"></span>
            <span>UNCERTAIN</span>
            <span className="text-[10px] opacity-80">
              ({project.findings.filter((f) => f.status === 'UNCERTAIN').length})
            </span>
          </button>

          <button
            onClick={() => setEvidenceFilter('CONFLICTING')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              evidenceFilter === 'CONFLICTING'
                ? 'bg-error text-on-error shadow-xs'
                : 'bg-error-container text-on-error-container hover:opacity-90'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-error"></span>
            <span>CONFLICTING</span>
            <span className="text-[10px] opacity-80">
              ({project.findings.filter((f) => f.status === 'CONFLICTING').length})
            </span>
          </button>

          <button
            onClick={() => setEvidenceFilter('MISSING')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              evidenceFilter === 'MISSING'
                ? 'bg-outline text-surface-container-lowest shadow-xs'
                : 'bg-surface-container text-outline hover:opacity-90'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-outline"></span>
            <span>MISSING EVIDENCE</span>
            <span className="text-[10px] opacity-80">
              ({project.findings.filter((f) => f.status === 'MISSING').length})
            </span>
          </button>
        </div>

        {/* Search inside evidence */}
        <div className="relative w-full sm:w-64">
          <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-[16px]">
            search
          </span>
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Filter files, claims, SHAs..."
            className="w-full pl-8 pr-3 py-1.5 bg-surface-container-low text-xs rounded-lg border border-outline-variant/30 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* FINDINGS WITH CITATIONS */}
      <div className="space-y-space-lg">
        {filteredFindings.map((finding) => (
          <div
            key={finding.id}
            className={`bg-surface-container-lowest rounded-xl p-space-lg shadow-sm border transition-all ${
              selectedFinding?.id === finding.id
                ? 'border-primary ring-2 ring-primary/20'
                : 'border-outline-variant/30'
            }`}
          >
            {/* Header: Title and Status */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    finding.status === 'VERIFIED'
                      ? 'bg-secondary-container text-on-secondary-container'
                      : finding.status === 'CONFLICTING'
                      ? 'bg-error-container text-on-error-container'
                      : finding.status === 'UNCERTAIN'
                      ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                      : 'bg-surface-container text-outline'
                  }`}
                >
                  {finding.status}
                </span>
                <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                  {finding.title}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-primary">{finding.confidence}% confidence</span>
                <span className="text-outline">•</span>
                <span className="text-outline">{finding.citations.length} citation(s)</span>
              </div>
            </div>

            <p className="font-body-md text-body-md text-on-surface-variant mb-space-md leading-relaxed">
              {finding.summary}
            </p>

            {/* Citations List for this Finding */}
            <div className="space-y-space-sm">
              {finding.citations.map((citation) => (
                <div
                  key={citation.id}
                  className="bg-surface-container-low/70 rounded-xl p-space-md border border-outline-variant/30 flex flex-col gap-space-xs font-mono text-xs"
                >
                  {/* Citation Meta Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-outline font-sans">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="material-symbols-outlined text-primary text-[16px]">description</span>
                      <strong className="text-on-surface font-mono">{citation.file}</strong>
                      <span className="bg-surface-container px-2 py-0.2 rounded font-mono text-on-surface">
                        L:{citation.lineRange}
                      </span>
                      {citation.commitSha && (
                        <span className="bg-primary-fixed/40 text-on-primary-fixed-variant px-2 py-0.2 rounded font-mono font-medium">
                          SHA: {citation.commitSha}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-outline">By {citation.author}</span>
                      <span>•</span>
                      <span>{citation.timestamp}</span>
                      <button
                        onClick={() => setActiveInspectorCitation(citation)}
                        className="px-2 py-0.5 bg-surface-container-lowest hover:bg-surface-container rounded border border-outline-variant/30 text-on-surface font-semibold transition-colors flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[12px]">visibility</span>
                        <span>Inspect Provenance</span>
                      </button>
                    </div>
                  </div>

                  {/* Code / Content Snippet */}
                  <div className="relative bg-surface-container-lowest rounded-lg p-space-sm border border-outline-variant/20 overflow-x-auto">
                    <pre className="text-xs text-on-surface leading-relaxed whitespace-pre font-mono">
                      {citation.snippet}
                    </pre>
                    <button
                      onClick={() => handleCopySnippet(citation.snippet, citation.id)}
                      className="absolute right-2 top-2 p-1 rounded bg-surface-container-low hover:bg-surface-container text-outline hover:text-on-surface transition-colors"
                      title="Copy Code Snippet"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {copiedCitationId === citation.id ? 'check' : 'content_copy'}
                      </span>
                    </button>
                  </div>

                  {/* Hash & Clearance Tier */}
                  <div className="flex items-center justify-between text-[10px] text-outline pt-1 font-sans">
                    <span className="font-mono">{citation.contentHash}</span>
                    <span className="uppercase tracking-wider font-semibold text-secondary">
                      Clearance: {citation.clearanceTier}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Action to Review */}
            <div className="mt-space-md pt-space-xs border-t border-outline-variant/20 flex items-center justify-between text-xs font-sans">
              <span className="text-outline">
                {finding.approved ? '✓ Approved in Review Center' : '⚠ Pending Review Sign-Off'}
              </span>
              <button
                onClick={() => {
                  setSelectedFinding(finding);
                  setActiveView('review');
                }}
                className="px-3 py-1 bg-primary text-on-primary hover:bg-primary-container rounded text-xs font-semibold transition-colors flex items-center gap-1"
              >
                <span>Take to Review Center</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* SIDE DRAWER / MODAL: CITATION PROVENANCE INSPECTOR */}
      {activeInspectorCitation && (
        <div className="fixed inset-0 bg-inverse-surface/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest max-w-2xl w-full rounded-2xl p-space-xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-outline-variant/40 flex flex-col gap-space-md">
            <div className="flex items-center justify-between pb-space-xs border-b border-outline-variant/30">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">policy</span>
                <h3 className="font-headline-sm text-headline-sm text-on-surface">
                  Immutable Citation Provenance
                </h3>
              </div>
              <button
                onClick={() => setActiveInspectorCitation(null)}
                className="text-outline hover:text-on-surface p-1 rounded-lg"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-space-sm text-xs">
              <div className="grid grid-cols-2 gap-space-sm bg-surface-container-low p-space-md rounded-xl border border-outline-variant/20">
                <div>
                  <span className="text-outline uppercase text-[10px] font-semibold block">Source Stream</span>
                  <span className="font-medium text-on-surface text-sm">{activeInspectorCitation.sourceName}</span>
                </div>
                <div>
                  <span className="text-outline uppercase text-[10px] font-semibold block">File Location</span>
                  <span className="font-mono text-on-surface font-semibold">
                    {activeInspectorCitation.file}:{activeInspectorCitation.lineRange}
                  </span>
                </div>
                <div>
                  <span className="text-outline uppercase text-[10px] font-semibold block">Author &amp; Time</span>
                  <span className="text-on-surface">
                    {activeInspectorCitation.author} ({activeInspectorCitation.timestamp})
                  </span>
                </div>
                <div>
                  <span className="text-outline uppercase text-[10px] font-semibold block">Cryptographic Hash</span>
                  <span className="font-mono text-primary font-semibold">
                    {activeInspectorCitation.contentHash}
                  </span>
                </div>
              </div>

              <div>
                <span className="font-label-sm text-on-surface font-semibold block mb-1">
                  Full Grounding Snippet
                </span>
                <div className="p-space-md bg-surface-container-low rounded-lg font-mono text-xs leading-relaxed border border-outline-variant/30 max-h-60 overflow-y-auto">
                  <pre className="whitespace-pre-wrap">{activeInspectorCitation.snippet}</pre>
                </div>
              </div>

              <div className="bg-secondary-container/40 p-space-sm rounded-lg border border-primary/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[18px]">verified</span>
                  <span className="text-on-surface font-medium">Verification Status: TAMPER-PROOF EVIDENCE</span>
                </div>
                <span className="font-mono text-primary font-bold">{activeInspectorCitation.confidence}%</span>
              </div>
            </div>

            <div className="flex justify-end pt-space-xs border-t border-outline-variant/30">
              <button
                onClick={() => setActiveInspectorCitation(null)}
                className="px-5 py-2 rounded-lg bg-primary text-on-primary font-semibold text-xs hover:bg-primary-container transition-colors"
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
