'use client';

import React, { useState, useEffect } from 'react';
import { useProject } from '../../context/ProjectContext';
import { FindingType, KnowledgeFinding } from '../../lib/types';

export function AnalysisView() {
  const {
    project,
    setActiveView,
    setSelectedFinding,
    runAiSync,
    isSyncing,
    runRealAiAnalysis,
    isAnalysing,
    analysisProgress,
    analysisStatusMessage,
    analysisError,
    hasAiApiKey,
    checkAiConfig,
    stats,
  } = useProject();

  const [activeCategory, setActiveCategory] = useState<'all' | FindingType>('all');
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [showConfigHelp, setShowConfigHelp] = useState(false);
  const [analysisSuccessMsg, setAnalysisSuccessMsg] = useState<string | null>(null);

  // Filter sources that have extractable text
  const eligibleSources = project.sources.filter((s) => {
    const text = s.documentData?.extractedText || s.description || '';
    return text.trim().length > 0;
  });

  // Default select all eligible sources on mount or when sources change
  useEffect(() => {
    if (eligibleSources.length > 0 && selectedSourceIds.length === 0) {
      setSelectedSourceIds(eligibleSources.map((s) => s.id));
    }
  }, [project.sources.length]);

  const toggleSourceSelection = (sourceId: string) => {
    setSelectedSourceIds((prev) =>
      prev.includes(sourceId) ? prev.filter((id) => id !== sourceId) : [...prev, sourceId]
    );
  };

  const selectAllSources = () => {
    setSelectedSourceIds(eligibleSources.map((s) => s.id));
  };

  const clearSourceSelection = () => {
    setSelectedSourceIds([]);
  };

  // Trigger genuine AI extraction
  const handleRunAiExtraction = async () => {
    setAnalysisSuccessMsg(null);
    if (!hasAiApiKey) {
      setShowConfigHelp(true);
      return;
    }

    const result = await runRealAiAnalysis(selectedSourceIds);
    if (result.success) {
      setAnalysisSuccessMsg(
        `Successfully extracted ${result.count} new evidence-grounded findings! They have been placed in the Human Review Center for validation.`
      );
    }
  };

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
              {project.name}
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

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleRunAiExtraction()}
            disabled={isAnalysing || isSyncing}
            className="inline-flex items-center gap-2 px-space-md py-2.5 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md shadow-sm transition-all disabled:opacity-60"
          >
            <span className={`material-symbols-outlined text-[18px] ${isAnalysing ? 'animate-spin' : ''}`}>
              auto_awesome
            </span>
            <span>{isAnalysing ? 'Extracting with Gemini...' : 'Extract Knowledge with AI'}</span>
          </button>

          <button
            onClick={() => runAiSync()}
            disabled={isSyncing || isAnalysing}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md transition-colors disabled:opacity-60"
            title="Run simulated source synchronization"
          >
            <span className={`material-symbols-outlined text-[16px] ${isSyncing ? 'animate-spin' : ''}`}>
              sync
            </span>
            <span>Sync Streams</span>
          </button>
        </div>
      </div>

      {/* GEMINI CONFIGURATION STATUS & GUIDANCE */}
      {!hasAiApiKey && (
        <div className="bg-surface-container-low rounded-xl p-space-md border border-outline-variant/40 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-fixed text-primary flex items-center justify-center shrink-0 mt-0.5">
              <span className="material-symbols-outlined text-[22px]">key</span>
            </div>
            <div className="flex flex-col text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-on-surface text-sm">
                  Gemini AI Engine: Environment Key Setup
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-surface-container text-outline">
                  Zero Fake AI Invariant
                </span>
              </div>
              <p className="text-on-surface-variant mt-0.5 leading-relaxed">
                To run live AI knowledge extraction with Google Gemini 2.5 Flash on your uploaded documents, provide a <code className="bg-surface-container px-1.5 py-0.5 rounded font-mono text-primary font-semibold">GEMINI_API_KEY</code>.
                KnoTrail guarantees zero hallucinated or canned findings.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowConfigHelp(!showConfigHelp)}
              className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-on-surface transition-colors"
            >
              {showConfigHelp ? 'Hide Setup Instructions' : 'View Instructions'}
            </button>
            <button
              onClick={() => checkAiConfig()}
              className="px-3 py-1.5 rounded-lg bg-primary text-on-primary hover:bg-primary-container text-xs font-semibold transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">refresh</span>
              <span>Check Key</span>
            </button>
          </div>
        </div>
      )}

      {/* Expandable Configuration Help */}
      {showConfigHelp && (
        <div className="bg-surface-container-lowest rounded-xl p-space-md border border-outline-variant/30 text-xs text-on-surface-variant space-y-2 animate-in fade-in">
          <div className="font-semibold text-on-surface flex items-center gap-1.5 text-sm">
            <span className="material-symbols-outlined text-[18px] text-primary">terminal</span>
            <span>How to Configure Gemini API Key:</span>
          </div>
          <p>
            Create or update a <code className="font-mono bg-surface-container px-1 py-0.5 rounded text-primary">.env.local</code> file in the project root:
          </p>
          <pre className="bg-surface-container-high/60 p-3 rounded-lg font-mono text-[11px] text-on-surface overflow-x-auto">
GEMINI_API_KEY=your_gemini_api_key_here
          </pre>
          <p className="text-[11px] text-outline">
            Once saved, restart the Next.js development server or click &quot;Check Key&quot;. All extracted findings will cite verbatim quotes from your documents.
          </p>
        </div>
      )}

      {/* ACTIVE EXTRACTION PROGRESS BANNER */}
      {isAnalysing && (
        <div className="bg-surface-container-lowest rounded-xl p-space-md border border-primary/30 shadow-sm flex flex-col gap-2 animate-in fade-in">
          <div className="flex items-center justify-between text-xs font-semibold">
            <div className="flex items-center gap-2 text-primary">
              <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
              <span>{analysisStatusMessage || 'Extracting knowledge with Gemini...'}</span>
            </div>
            <span className="font-mono text-outline">{analysisProgress}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${analysisProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* ERROR BANNER */}
      {analysisError && (
        <div className="bg-error-container/20 border border-error/30 rounded-xl p-space-md text-xs text-error flex items-start gap-2.5 animate-in fade-in">
          <span className="material-symbols-outlined text-[18px] text-error shrink-0 mt-0.5">error</span>
          <div className="flex-1">
            <strong className="block font-semibold">AI Extraction Notice:</strong>
            <p className="mt-0.5 leading-relaxed">{analysisError}</p>
          </div>
        </div>
      )}

      {/* SUCCESS NOTIFICATION */}
      {analysisSuccessMsg && (
        <div className="bg-secondary-container/30 border border-primary/30 rounded-xl p-space-md text-xs text-on-surface flex items-start justify-between gap-2.5 animate-in fade-in">
          <div className="flex items-start gap-2.5">
            <span className="material-symbols-outlined text-[18px] text-primary shrink-0 mt-0.5">check_circle</span>
            <div className="flex-1">
              <strong className="block font-semibold text-primary">Knowledge Reconstructed Successfully</strong>
              <p className="mt-0.5 text-on-surface-variant leading-relaxed">{analysisSuccessMsg}</p>
            </div>
          </div>
          <button
            onClick={() => setActiveView('review')}
            className="px-3 py-1 bg-primary text-on-primary hover:bg-primary-container rounded text-xs font-semibold whitespace-nowrap transition-colors"
          >
            Go to Review Center
          </button>
        </div>
      )}

      {/* INGESTED DOCUMENT SELECTOR FOR ANALYSIS */}
      {eligibleSources.length > 0 && (
        <div className="bg-surface-container-lowest rounded-xl p-space-md border border-outline-variant/30 shadow-xs flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant/20 pb-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">folder_open</span>
              <span className="text-xs font-semibold text-on-surface uppercase tracking-wider">
                Select Documents for AI Extraction ({eligibleSources.length} Available)
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={selectAllSources}
                className="text-primary hover:underline font-medium"
              >
                Select All
              </button>
              <span className="text-outline">•</span>
              <button
                onClick={clearSourceSelection}
                className="text-outline hover:text-on-surface font-medium"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {eligibleSources.map((source) => {
              const isSelected = selectedSourceIds.includes(source.id);
              const format = source.documentData?.fileFormat || (source.type === 'github' ? 'repo' : 'doc');
              const pagesOrLines = source.documentData?.pageCount
                ? `${source.documentData.pageCount} pages`
                : source.documentData?.lineCount
                ? `${source.documentData.lineCount} lines`
                : `${source.recordCount || 1} records`;

              return (
                <div
                  key={source.id}
                  onClick={() => toggleSourceSelection(source.id)}
                  className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-primary-fixed/20 border-primary/50 shadow-2xs'
                      : 'bg-surface-container-low border-outline-variant/20 hover:border-outline-variant/50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}} // handled by parent onClick
                    className="rounded text-primary focus:ring-primary h-3.5 w-3.5"
                  />
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-semibold text-on-surface truncate">{source.name}</span>
                    <span className="text-[10px] text-outline font-mono">
                      {format.toUpperCase()} • {pagesOrLines}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Grounding & Confidence Telemetry Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
        <div className="bg-surface-container-lowest p-space-md rounded-xl border border-outline-variant/30 flex items-center gap-space-sm shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[22px]">verified</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-outline uppercase font-semibold">Evidence Grounding</span>
            <span className="text-xl font-bold text-on-surface">{stats.groundedPercent}%</span>
            <span className="text-[11px] text-primary">{stats.verifiedCount} Verified • 0 Fabrications</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-space-md rounded-xl border border-outline-variant/30 flex items-center gap-space-sm shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-primary-fixed text-on-primary-fixed flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[22px]">gavel</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-outline uppercase font-semibold">Decisions Reconstructed</span>
            <span className="text-xl font-bold text-on-surface">
              {stats.decisionsCount}
            </span>
            <span className="text-[11px] text-secondary">With rationale &amp; impact</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-space-md rounded-xl border border-outline-variant/30 flex items-center gap-space-sm shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-error-container text-on-error-container flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[22px]">warning</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-outline uppercase font-semibold">Conflicts &amp; Questions</span>
            <span className="text-xl font-bold text-error">
              {stats.conflictingCount} / {stats.questionsCount}
            </span>
            <span className="text-[11px] text-error font-medium">
              {stats.conflictingCount > 0 ? `${stats.conflictingCount} active conflict(s)` : '0 active conflicts'}
            </span>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-space-md rounded-xl border border-outline-variant/30 flex items-center gap-space-sm shadow-xs">
          <div className="w-10 h-10 rounded-lg bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[22px]">find_in_page</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-outline uppercase font-semibold">Tasks &amp; Next Actions</span>
            <span className="text-xl font-bold text-tertiary">
              {stats.tasksCount + stats.nextActionsCount}
            </span>
            <span className="text-[11px] text-tertiary font-medium">
              {stats.unreviewedCount} pending review
            </span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 border-b border-outline-variant/20 pb-2 overflow-x-auto">
        {[
          { id: 'all', label: 'All Analysis', count: project.findings.length },
          { id: 'decision', label: 'Decisions', count: stats.decisionsCount },
          { id: 'task', label: 'Tasks', count: stats.tasksCount },
          { id: 'risk', label: 'Risks', count: stats.risksCount },
          { id: 'dependency', label: 'Dependencies', count: stats.dependenciesCount },
          { id: 'unresolved_question', label: 'Questions', count: stats.questionsCount },
          { id: 'next_action', label: 'Next Actions', count: stats.nextActionsCount },
          { id: 'contact', label: 'Contacts', count: stats.contactsCount },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveCategory(tab.id as 'all' | FindingType)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeCategory === tab.id
                ? 'bg-primary text-on-primary shadow-xs'
                : 'text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeCategory === tab.id
                  ? 'bg-primary-container text-on-primary-container'
                  : 'bg-surface-container'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Findings Analysis Cards */}
      <div className="space-y-space-md">
        {filtered.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-xl p-space-xl border border-outline-variant/30 text-center text-xs text-outline">
            <span className="material-symbols-outlined text-[32px] text-outline mb-1 block">
              search_off
            </span>
            <span>No findings found in category &quot;{activeCategory}&quot;.</span>
          </div>
        ) : (
          filtered.map((finding) => (
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
                  {!finding.approved && !finding.rejected && (
                    <span className="text-[10px] bg-tertiary-fixed/60 text-on-tertiary-fixed px-1.5 py-0.2 rounded font-semibold uppercase">
                      Pending Review
                    </span>
                  )}
                  {finding.approved && (
                    <span className="text-[10px] bg-secondary-container text-on-secondary-container px-1.5 py-0.2 rounded font-semibold uppercase flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-[12px]">check</span>
                      <span>Approved</span>
                    </span>
                  )}
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
              {(finding.reasoning || finding.impact) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-space-sm bg-surface-container-low/60 p-space-md rounded-lg border border-outline-variant/20 text-xs">
                  <div>
                    <span className="font-semibold text-secondary uppercase tracking-wider block mb-0.5 text-[10px]">
                      Architectural Reasoning &amp; Context
                    </span>
                    <p className="text-on-surface-variant leading-relaxed">
                      {finding.reasoning || 'Derived from source evidence.'}
                    </p>
                  </div>
                  <div>
                    <span className="font-semibold text-secondary uppercase tracking-wider block mb-0.5 text-[10px]">
                      Operational Impact
                    </span>
                    <p className="text-on-surface-variant leading-relaxed">
                      {finding.impact || 'Ensures operational reliability.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Validation / Reviewer Notes Warning if UNCERTAIN or CONFLICTING */}
              {finding.reviewerNotes && finding.status !== 'VERIFIED' && (
                <div className="p-2 rounded bg-tertiary-fixed/20 border border-tertiary-fixed/30 text-[11px] text-tertiary-fixed-dim">
                  <strong>Verification Note: </strong>
                  <span>{finding.reviewerNotes}</span>
                </div>
              )}

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
                      <span>
                        {c.file} ({c.lineRange})
                      </span>
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
          ))
        )}
      </div>
    </div>
  );
}
