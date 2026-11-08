'use client';

import React, { useState } from 'react';
import { useProject } from '../../context/ProjectContext';

export function AnalysisView() {
  const { project, setActiveView, setSelectedFinding, runAiSync, isSyncing } = useProject();
  const [activeCategory, setActiveCategory] = useState<'all' | 'decision' | 'task' | 'risk'>('all');

  const filtered = project.findings.filter((f) => {
    if (activeCategory === 'all') return true;
    return f.type === activeCategory;
  });

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
            <span className="text-primary font-semibold">AI Analysis</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight mt-1">
            AI Project Analysis &amp; Reconstruction
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
            Automated synthesis of architectural decisions, operational responsibilities, and risks anchored to source evidence.
          </p>
        </div>

        {/* Action Button */}
        <button
          onClick={() => runAiSync()}
          disabled={isSyncing}
          className="inline-flex items-center gap-2 px-space-md py-2 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md shadow-sm transition-all disabled:opacity-60"
        >
          <span className={`material-symbols-outlined text-[18px] ${isSyncing ? 'animate-spin' : ''}`}>
            auto_awesome
          </span>
          <span>{isSyncing ? 'Analysing Streams...' : 'Re-run Analysis'}</span>
        </button>
      </div>

      {/* Grounding & Confidence Telemetry Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
        <div className="bg-surface-container-lowest p-space-md rounded-xl border border-outline-variant/30 flex items-center gap-space-sm shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[22px]">verified</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-outline uppercase font-semibold">Evidence Grounding</span>
            <span className="text-xl font-bold text-on-surface">98.4%</span>
            <span className="text-[11px] text-primary">0 Ungrounded Claims</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-space-md rounded-xl border border-outline-variant/30 flex items-center gap-space-sm shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-primary-fixed text-on-primary-fixed flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[22px]">gavel</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-outline uppercase font-semibold">Decisions Reconstructed</span>
            <span className="text-xl font-bold text-on-surface">
              {project.findings.filter((f) => f.type === 'decision').length}
            </span>
            <span className="text-[11px] text-secondary">With rationale &amp; impact</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-space-md rounded-xl border border-outline-variant/30 flex items-center gap-space-sm shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-error-container text-on-error-container flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[22px]">warning</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-outline uppercase font-semibold">Conflicts Detected</span>
            <span className="text-xl font-bold text-error">1 Policy</span>
            <span className="text-[11px] text-error font-medium">Redis Eviction Mismatch</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-space-md rounded-xl border border-outline-variant/30 flex items-center gap-space-sm shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[22px]">find_in_page</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-outline uppercase font-semibold">Missing Proof</span>
            <span className="text-xl font-bold text-tertiary">1 Item</span>
            <span className="text-[11px] text-tertiary font-medium">Envoy Ingress Rate Filter</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-outline-variant/20 pb-2">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeCategory === 'all'
              ? 'bg-primary text-on-primary shadow-xs'
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          All Analysis ({project.findings.length})
        </button>
        <button
          onClick={() => setActiveCategory('decision')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeCategory === 'decision'
              ? 'bg-primary text-on-primary shadow-xs'
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          Decisions ({project.findings.filter((f) => f.type === 'decision').length})
        </button>
        <button
          onClick={() => setActiveCategory('task')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeCategory === 'task'
              ? 'bg-primary text-on-primary shadow-xs'
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          Tasks ({project.findings.filter((f) => f.type === 'task').length})
        </button>
        <button
          onClick={() => setActiveCategory('risk')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeCategory === 'risk'
              ? 'bg-primary text-on-primary shadow-xs'
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          Risks ({project.findings.filter((f) => f.type === 'risk').length})
        </button>
      </div>

      {/* Findings Analysis Cards */}
      <div className="space-y-space-md">
        {filtered.map((finding) => (
          <div
            key={finding.id}
            className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm border border-outline-variant/30 flex flex-col gap-space-sm"
          >
            {/* Top row */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
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
                <span className="text-xs text-outline font-mono">[{finding.category}]</span>
                <span className="text-xs text-outline">•</span>
                <span className="text-xs text-outline">Owner: {finding.owner}</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-xs font-medium text-primary bg-primary-fixed/40 px-2.5 py-0.5 rounded-full">
                  <span className="material-symbols-outlined text-[14px]">psychology</span>
                  <span>Confidence: {finding.confidence}%</span>
                </div>
              </div>
            </div>

            {/* Finding Title & Summary */}
            <div className="flex flex-col">
              <h3 className="font-headline-sm text-headline-sm text-on-surface">{finding.title}</h3>
              <p className="font-body-md text-body-md text-on-surface-variant mt-1 leading-relaxed">
                {finding.summary}
              </p>
            </div>

            {/* Detailed Rationale & Impact Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-sm bg-surface-container-low/60 p-space-md rounded-lg border border-outline-variant/20 text-xs">
              <div>
                <span className="font-semibold text-secondary uppercase tracking-wider block mb-0.5 text-[10px]">
                  Architectural Reasoning &amp; Context
                </span>
                <p className="text-on-surface-variant leading-relaxed">
                  {finding.reasoning || 'Derived from commit commit diffs and pull request review conversations.'}
                </p>
              </div>
              <div>
                <span className="font-semibold text-secondary uppercase tracking-wider block mb-0.5 text-[10px]">
                  Operational Impact
                </span>
                <p className="text-on-surface-variant leading-relaxed">
                  {finding.impact || 'Ensures zero downtime and eliminates critical single points of failure.'}
                </p>
              </div>
            </div>

            {/* Citations Preview Strip */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-space-xs border-t border-outline-variant/20 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-outline font-medium">Supporting Evidence:</span>
                {finding.citations.map((c) => (
                  <span
                    key={c.id}
                    className="font-mono text-[11px] bg-surface-container px-2 py-0.5 rounded border border-outline-variant/30 text-on-surface flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[12px] text-primary">link</span>
                    <span>{c.file} ({c.lineRange})</span>
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setSelectedFinding(finding);
                    setActiveView('evidence');
                  }}
                  className="px-3 py-1 bg-surface-container hover:bg-surface-container-high rounded text-xs font-semibold text-on-surface transition-colors"
                >
                  Inspect Evidence
                </button>
                <button
                  onClick={() => {
                    setSelectedFinding(finding);
                    setActiveView('review');
                  }}
                  className="px-3 py-1 bg-primary text-on-primary hover:bg-primary-container rounded text-xs font-semibold transition-colors"
                >
                  Review Sign-Off
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
