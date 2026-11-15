'use client';

import React, { useState, useEffect } from 'react';
import { useProject } from '../../context/ProjectContext';
import { FindingType, KnowledgeFinding } from '../../lib/types';
import { KnowledgeTrailLoader } from '../ui/KnowledgeTrailLoader';

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
    runVerification,
    isVerifying,
    stats,
    currentUserRole,
  } = useProject();

  const [activeCategory, setActiveCategory] = useState<'all' | FindingType>('all');
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [showConfigHelp, setShowConfigHelp] = useState(false);
  const [analysisSuccessMsg, setAnalysisSuccessMsg] = useState<string | null>(null);
  const [verifyNotice, setVerifyNotice] = useState<string | null>(null);

  const handleRunVerification = async () => {
    setVerifyNotice(null);
    const res = await runVerification(true);
    if (res.success) {
      setVerifyNotice(
        `Verification complete! Verified ${res.count} claim(s). Found ${res.conflictsCount || 0} cross-document conflict(s).`
      );
    }
  };

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
    <div className="flex flex-col w-full gap-6 animate-in fade-in duration-150">
      {/* Standardized Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-outline-variant/30">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-secondary mb-1">
            <span>Workspace</span>
            <span>/</span>
            <span className="text-on-surface font-semibold">AI Analysis</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight">
            AI Project Analysis
          </h1>
          <p className="text-xs sm:text-sm text-secondary mt-0.5 leading-relaxed">
            Synthesize operational context from uploaded documents to reconstruct decisions, tasks, risks, and responsibilities.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
          <button
            onClick={() => {
              if (currentUserRole === 'EXTERNAL') return;
              handleRunAiExtraction();
            }}
            disabled={isAnalysing || isSyncing || isVerifying || currentUserRole === 'EXTERNAL'}
            title={currentUserRole === 'EXTERNAL' ? 'Read-only access: External members cannot trigger AI extraction' : undefined}
            className={`inline-flex items-center justify-center gap-1.5 px-3.5 h-9 rounded-lg bg-primary hover:bg-primary-hover text-on-primary text-xs font-medium shadow-2xs transition-colors disabled:opacity-60 ${
              currentUserRole === 'EXTERNAL' ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isAnalysing ? (
              <>
                <KnowledgeTrailLoader variant="inline" message="Analysing..." />
                <span>Analysing with Gemini...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[17px]">
                  {currentUserRole === 'EXTERNAL' ? 'lock' : 'auto_awesome'}
                </span>
                <span>{currentUserRole === 'EXTERNAL' ? 'Read-Only (External)' : 'Extract with AI'}</span>
              </>
            )}
          </button>

          <button
            onClick={() => {
              if (currentUserRole === 'EXTERNAL') return;
              handleRunVerification();
            }}
            disabled={isAnalysing || isSyncing || isVerifying || project.findings.length === 0 || currentUserRole === 'EXTERNAL'}
            className={`inline-flex items-center justify-center gap-1.5 px-3.5 h-9 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-medium transition-colors border border-outline-variant/40 disabled:opacity-50 ${
              currentUserRole === 'EXTERNAL' ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            title={
              currentUserRole === 'EXTERNAL'
                ? 'Read-only access: External members cannot run verification'
                : 'Verify quotations and scan for cross-document conflicts'
            }
          >
            {isVerifying ? (
              <>
                <KnowledgeTrailLoader variant="inline" message="Verifying..." />
                <span>Verifying Claims...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[17px] text-primary">
                  {currentUserRole === 'EXTERNAL' ? 'lock' : 'fact_check'}
                </span>
                <span>{currentUserRole === 'EXTERNAL' ? 'Read-Only (External)' : 'Verify Claims'}</span>
              </>
            )}
          </button>

          <button
            onClick={() => runAiSync()}
            disabled={isSyncing || isAnalysing || isVerifying}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 h-9 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-medium border border-outline-variant/40 transition-colors disabled:opacity-60"
            title="Synchronize workspace with server"
          >
            <span className={`material-symbols-outlined text-[17px] text-primary ${isSyncing ? 'animate-spin' : ''}`}>
              sync
            </span>
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* GEMINI CONFIGURATION STATUS & GUIDANCE */}
      {!hasAiApiKey && (
        <div className="bg-surface-container-low/50 rounded-xl p-4 border border-outline-variant/40 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
              <span className="material-symbols-outlined text-[20px]">key</span>
            </div>
            <div className="flex flex-col text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-on-surface">
                  Google Gemini AI Setup
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-surface-container-low text-secondary border border-outline-variant/30">
                  Optional Key
                </span>
              </div>
              <p className="text-secondary mt-0.5 leading-relaxed">
                To run live AI extraction on custom documents, configure <code className="bg-surface-container-low px-1.5 py-0.5 rounded font-mono text-primary font-semibold">GEMINI_API_KEY</code>.
                KnoTrail only extracts grounded findings with verbatim proof.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowConfigHelp(!showConfigHelp)}
              className="px-3 h-8 rounded-lg bg-surface-container-low hover:bg-surface-container text-xs font-medium text-on-surface transition-colors border border-outline-variant/40"
            >
              {showConfigHelp ? 'Hide Instructions' : 'View Instructions'}
            </button>
            <button
              onClick={() => checkAiConfig()}
              className="px-3 h-8 rounded-lg bg-primary text-on-primary hover:bg-primary-hover text-xs font-medium transition-colors flex items-center gap-1 shadow-xs"
            >
              <span className="material-symbols-outlined text-[14px]">refresh</span>
              <span>Check Key</span>
            </button>
          </div>
        </div>
      )}

      {/* Expandable Configuration Help */}
      {showConfigHelp && (
        <div className="bg-surface-container-lowest rounded-xl p-4 border border-outline-variant/40 text-xs text-secondary space-y-2 animate-in fade-in">
          <div className="font-semibold text-on-surface flex items-center gap-1.5 text-xs">
            <span className="material-symbols-outlined text-[16px] text-primary">terminal</span>
            <span>How to Configure Gemini API Key:</span>
          </div>
          <p>
            Add the API key to your <code className="font-mono bg-surface-container-low px-1 py-0.5 rounded text-primary">.env.local</code> file in the repository root:
          </p>
          <pre className="bg-surface-container-low p-3 rounded-lg font-mono text-[11px] text-on-surface overflow-x-auto border border-outline-variant/30">
GEMINI_API_KEY=your_gemini_api_key_here
          </pre>
          <p className="text-[11px] text-secondary">
            Once saved, restart the server or click &quot;Check Key&quot;. All extracted findings cite exact verbatim quotes.
          </p>
        </div>
      )}

      {/* ACTIVE EXTRACTION PROGRESS BANNER */}
      {isAnalysing && (
        <KnowledgeTrailLoader
          variant="section"
          message="Analysing project knowledge..."
          submessage={analysisStatusMessage || 'Reading documents to extract decisions, tasks, risks, and responsibilities...'}
          progress={analysisProgress}
          step={1}
        />
      )}

      {/* ACTIVE VERIFICATION BANNER */}
      {isVerifying && (
        <KnowledgeTrailLoader
          variant="section"
          message="Verifying supporting evidence..."
          submessage="Cross-verifying quotations against original document lines..."
          step={2}
        />
      )}

      {/* VERIFY NOTICE */}
      {verifyNotice && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-xs text-on-surface flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-in fade-in">
          <div className="flex items-start gap-2.5">
            <span className="material-symbols-outlined text-[18px] text-primary shrink-0 mt-0.5">verified</span>
            <div className="flex-1">
              <strong className="block font-semibold text-primary">Evidence Verification Complete</strong>
              <p className="mt-0.5 text-secondary leading-relaxed">{verifyNotice}</p>
            </div>
          </div>
          <button
            onClick={() => setActiveView('evidence')}
            className="w-full sm:w-auto text-center px-3.5 h-8 bg-primary text-on-primary hover:bg-primary-hover rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center justify-center shadow-xs"
          >
            Evidence Explorer
          </button>
        </div>
      )}

      {/* ERROR BANNER */}
      {analysisError && (
        <div className="bg-error/10 border border-error/30 rounded-xl p-4 text-xs text-error flex items-start gap-2.5 animate-in fade-in">
          <span className="material-symbols-outlined text-[18px] text-error shrink-0 mt-0.5">error</span>
          <div className="flex-1">
            <strong className="block font-semibold">AI Analysis Notice:</strong>
            <p className="mt-0.5 leading-relaxed">{analysisError}</p>
          </div>
        </div>
      )}

      {/* SUCCESS NOTIFICATION */}
      {analysisSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs text-on-surface flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-in fade-in">
          <div className="flex items-start gap-2.5">
            <span className="material-symbols-outlined text-[18px] text-emerald-700 shrink-0 mt-0.5">check_circle</span>
            <div className="flex-1">
              <strong className="block font-semibold text-emerald-800">Extraction Successful</strong>
              <p className="mt-0.5 text-secondary leading-relaxed">{analysisSuccessMsg}</p>
            </div>
          </div>
          <button
            onClick={() => setActiveView('review')}
            className="w-full sm:w-auto text-center px-3.5 h-8 bg-primary text-on-primary hover:bg-primary-hover rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center justify-center shadow-xs"
          >
            Review Center
          </button>
        </div>
      )}

      {/* INGESTED DOCUMENT SELECTOR FOR ANALYSIS */}
      {eligibleSources.length > 0 && (
        <div className="bg-surface-container-lowest rounded-xl p-4 border border-outline-variant/40 shadow-xs flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-outline-variant/30 pb-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[17px]">folder_open</span>
              <span className="text-xs font-semibold text-on-surface uppercase tracking-wider">
                Select Documents for Extraction ({eligibleSources.length} Available)
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={selectAllSources}
                className="text-primary hover:underline font-medium"
              >
                Select All
              </button>
              <span className="text-secondary">•</span>
              <button
                onClick={clearSourceSelection}
                className="text-secondary hover:text-on-surface font-medium"
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
                  className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-primary/5 border-primary/40 shadow-2xs'
                      : 'bg-surface-container-low/40 border-outline-variant/30 hover:border-outline-variant/60'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}} // handled by parent onClick
                    className="rounded text-primary focus:ring-primary h-3.5 w-3.5"
                  />
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-semibold text-on-surface truncate text-xs">{source.name}</span>
                    <span className="text-[10px] text-secondary font-mono">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface-container-lowest p-4 sm:p-5 rounded-xl border border-outline-variant/40 flex items-center gap-3 shadow-xs">
          <div className="w-9 h-9 rounded-lg bg-success/10 text-success flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px]">verified</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] text-secondary uppercase font-semibold">Evidence Grounding</span>
            <span className="text-xl font-bold text-on-surface">{stats.groundedPercent}%</span>
            <span className="text-[11px] text-success font-medium">{stats.verifiedCount} of {stats.totalFindings} Claims Verified</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-4 sm:p-5 rounded-xl border border-outline-variant/40 flex items-center gap-3 shadow-xs">
          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px]">gavel</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] text-secondary uppercase font-semibold">Decisions Reconstructed</span>
            <span className="text-xl font-bold text-on-surface">
              {stats.decisionsCount}
            </span>
            <span className="text-[11px] text-secondary">With rationale &amp; impact</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-4 sm:p-5 rounded-xl border border-outline-variant/40 flex items-center gap-3 shadow-xs">
          <div className="w-9 h-9 rounded-lg bg-error/10 text-error flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px]">warning</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] text-secondary uppercase font-semibold">Conflicts &amp; Questions</span>
            <span className="text-xl font-bold text-error">
              {stats.conflictingCount} / {stats.questionsCount}
            </span>
            <span className="text-[11px] text-error font-medium">
              {stats.conflictingCount > 0 ? `${stats.conflictingCount} active conflict(s)` : '0 active conflicts'}
            </span>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-4 sm:p-5 rounded-xl border border-outline-variant/40 flex items-center gap-3 shadow-xs">
          <div className="w-9 h-9 rounded-lg bg-warning/10 text-warning flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[20px]">checklist</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] text-secondary uppercase font-semibold">Tasks &amp; Actions</span>
            <span className="text-xl font-bold text-on-surface">
              {stats.tasksCount + stats.nextActionsCount}
            </span>
            <span className="text-[11px] text-secondary font-medium">
              {stats.unreviewedCount} pending review
            </span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 border-b border-outline-variant/30 pb-2 overflow-x-auto no-scrollbar -mx-2 px-2">
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
            className={`h-8 px-3 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeCategory === tab.id
                ? 'bg-primary text-on-primary shadow-xs'
                : 'text-secondary hover:bg-surface-container-low hover:text-on-surface'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeCategory === tab.id
                  ? 'bg-primary-hover text-on-primary'
                  : 'bg-surface-container-low text-secondary'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Findings Analysis Cards */}
      <div className="space-y-4">
        {project.findings.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-xl p-8 sm:p-12 border border-outline-variant/40 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-surface-container-low text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[28px]">auto_awesome</span>
            </div>
            <h4 className="text-sm font-semibold text-on-surface">No findings extracted yet</h4>
            <p className="text-xs text-secondary max-w-md leading-relaxed">
              Upload project documents and run AI analysis to extract decisions, operational tasks, and risks.
            </p>
            {eligibleSources.length > 0 ? (
              <button
                onClick={() => handleRunAiExtraction()}
                disabled={isAnalysing}
                className="mt-1 inline-flex items-center gap-1.5 px-3.5 h-8 rounded-lg bg-primary text-on-primary text-xs font-medium hover:bg-primary-hover transition-colors shadow-xs"
              >
                {isAnalysing ? (
                  <>
                    <KnowledgeTrailLoader variant="inline" message="Analysing..." />
                    <span>Analysing...</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[15px]">auto_awesome</span>
                    <span>Extract Knowledge with AI</span>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={() => setActiveView('sources')}
                className="mt-1 inline-flex items-center gap-1.5 px-3.5 h-8 rounded-lg bg-primary text-on-primary text-xs font-medium hover:bg-primary-hover transition-colors shadow-xs"
              >
                <span className="material-symbols-outlined text-[15px]">upload_file</span>
                <span>Upload Documents</span>
              </button>
            )}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-xl p-8 border border-outline-variant/40 text-center text-xs text-secondary">
            <span className="material-symbols-outlined text-[28px] text-secondary mb-1 block">
              search_off
            </span>
            <span>No findings found in category &quot;{activeCategory}&quot;.</span>
          </div>
        ) : (
          filtered.map((finding) => (
            <div
              key={finding.id}
              className="bg-surface-container-lowest rounded-xl p-5 shadow-xs border border-outline-variant/40 flex flex-col gap-3"
            >
              {/* Top row */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-md border ${
                      finding.status === 'VERIFIED'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : finding.status === 'CONFLICTING'
                        ? 'bg-rose-50 text-rose-800 border-rose-200'
                        : finding.status === 'UNCERTAIN'
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-surface-container text-secondary border-outline-variant/40'
                    }`}
                  >
                    {finding.status}
                  </span>
                  <span className="text-xs text-secondary font-mono">{finding.category}</span>
                  <span className="text-secondary">•</span>
                  <span className="text-xs text-secondary">Owner: {finding.owner}</span>
                  {!finding.approved && !finding.rejected && (
                    <span className="text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.2 rounded font-semibold uppercase">
                      Pending Review
                    </span>
                  )}
                  {finding.approved && (
                    <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.2 rounded font-semibold uppercase flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-[12px]">check</span>
                      <span>Approved</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
                    <span className="material-symbols-outlined text-[13px]">psychology</span>
                    <span>Confidence: {finding.confidence}%</span>
                  </div>
                </div>
              </div>

              {/* Finding Title & Summary */}
              <div className="flex flex-col">
                <h3 className="text-sm font-semibold text-on-surface">{finding.title}</h3>
                <p className="text-xs text-secondary mt-1 leading-relaxed">
                  {finding.summary}
                </p>
              </div>

              {/* Detailed Rationale & Impact Grid */}
              {(finding.reasoning || finding.impact) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-surface-container-low/40 p-3 rounded-lg border border-outline-variant/30 text-xs">
                  <div>
                    <span className="font-semibold text-secondary uppercase tracking-wider block mb-0.5 text-[10px]">
                      Architectural Reasoning
                    </span>
                    <p className="text-secondary leading-relaxed">
                      {finding.reasoning || 'Derived from source evidence.'}
                    </p>
                  </div>
                  <div>
                    <span className="font-semibold text-secondary uppercase tracking-wider block mb-0.5 text-[10px]">
                      Operational Impact
                    </span>
                    <p className="text-secondary leading-relaxed">
                      {finding.impact || 'Ensures operational reliability.'}
                    </p>
                  </div>
                </div>
              )}

              {/* Validation / Reviewer Notes Warning if UNCERTAIN or CONFLICTING */}
              {finding.reviewerNotes && finding.status !== 'VERIFIED' && (
                <div className="p-2.5 rounded-lg bg-warning/10 border border-warning/20 text-xs text-warning">
                  <strong>Verification Note: </strong>
                  <span>{finding.reviewerNotes}</span>
                </div>
              )}

              {/* Citations Preview Strip */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-outline-variant/30 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-secondary font-medium">Supporting Evidence:</span>
                  {finding.citations.map((c) => (
                    <span
                      key={c.id}
                      className="font-mono text-[11px] bg-surface-container-low px-2 py-0.5 rounded border border-outline-variant/40 text-on-surface flex items-center gap-1"
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
                    className="px-2.5 h-7 bg-surface-container-low hover:bg-surface-container rounded-md text-xs font-medium text-on-surface transition-colors border border-outline-variant/30"
                  >
                    Inspect Evidence
                  </button>
                  <button
                    onClick={() => {
                      setSelectedFinding(finding);
                      setActiveView('review');
                    }}
                    className="px-2.5 h-7 bg-primary text-on-primary hover:bg-primary-hover rounded-md text-xs font-medium transition-colors shadow-xs"
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
