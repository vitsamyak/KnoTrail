'use client';

import React, { useState, useEffect } from 'react';
import { useProject } from '../../context/ProjectContext';
import type { CodebaseIntelligence, GitHubIntegration } from '../../lib/types';

interface ConnectGitHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onOpenQnA?: (integration: GitHubIntegration) => void;
}

interface IngestionPhaseDef {
  id: number;
  label: string;
  icon: string;
  desc: string;
}

const INGESTION_PHASES: IngestionPhaseDef[] = [
  { id: 1, label: 'Repository Connected', icon: 'check_circle', desc: 'Validating GitHub repository and target branch' },
  { id: 2, label: 'Fetching Git Tree', icon: 'account_tree', desc: 'Recursive tree traversal via GitHub Trees API' },
  { id: 3, label: 'Discovering & Classifying Files', icon: 'folder_open', desc: 'Categorizing code, UI, routes, schemas & configs' },
  { id: 4, label: 'Reading Source Code', icon: 'description', desc: 'Bounded concurrent blob reading with secret redaction' },
  { id: 5, label: 'Analyzing Architecture', icon: 'architecture', desc: 'Detecting framework, routes, database & integrations' },
  { id: 6, label: 'Extracting Technical Knowledge', icon: 'psychology', desc: 'Synthesizing architecture decisions, runbooks & tasks' },
  { id: 7, label: 'Grounding Findings', icon: 'verified', desc: 'Linking citations with exact file paths & line ranges' },
  { id: 8, label: 'Saving Persistent Knowledge', icon: 'save', desc: 'Persisting repository intelligence into workspace storage' },
  { id: 9, label: 'Completed', icon: 'task_alt', desc: 'Full codebase intelligence ready for handover & Q&A' },
];

export function ConnectGitHubModal({
  isOpen,
  onClose,
  onSuccess,
  onOpenQnA,
}: ConnectGitHubModalProps) {
  const {
    connectGitHubRepo,
    syncGitHubRepo,
    startAsyncSync,
    getSyncJobStatus,
    resumePersistence,
    completeSyncAndRefresh,
    getCodebaseIntelligence,
    isGitHubLoading,
    currentUserRole,
  } = useProject();

  const [repoOwner, setRepoOwner] = useState('');
  const [repoName, setRepoName] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('main');
  const [includeCommits, setIncludeCommits] = useState(true);
  const [includePullRequests, setIncludePullRequests] = useState(true);
  const [includeIssues, setIncludeIssues] = useState(true);
  const [includeDocs, setIncludeDocs] = useState(true);
  const [localError, setLocalError] = useState<string | null>(null);

  // Ingestion Tracking State
  const [isIngesting, setIsIngesting] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<number>(0); // 0 = idle, 1..9 = phases
  const [errorPhase, setErrorPhase] = useState<number | null>(null);
  const [createdIntegration, setCreatedIntegration] = useState<GitHubIntegration | null>(null);
  const [intelligence, setIntelligence] = useState<CodebaseIntelligence | null>(null);
  const [counters, setCounters] = useState({
    discovered: 0,
    read: 0,
    skipped: 0,
    analyzed: 0,
    findings: 0,
  });

  useEffect(() => {
    if (isOpen) {
      setRepoOwner('');
      setRepoName('');
      setSelectedBranch('main');
      setIncludeCommits(true);
      setIncludePullRequests(true);
      setIncludeIssues(true);
      setIncludeDocs(true);
      setLocalError(null);
      setIsIngesting(false);
      setCurrentPhase(0);
      setErrorPhase(null);
      setCreatedIntegration(null);
      setIntelligence(null);
      setCounters({
        discovered: 0,
        read: 0,
        skipped: 0,
        analyzed: 0,
        findings: 0,
      });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isIngesting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isIngesting]);

  if (!isOpen) return null;

  const handleFillDemoRepo = (owner: string, name: string) => {
    setRepoOwner(owner);
    setRepoName(name);
    setSelectedBranch('main');
    setLocalError(null);
  };

  const runIngestionFlow = async (integ: GitHubIntegration) => {
    setIsIngesting(true);
    setLocalError(null);
    setErrorPhase(null);
    setCurrentPhase(2); // Fetching Git Tree

    try {
      const startRes = await startAsyncSync(integ.repoId);
      if (!startRes.success || !startRes.jobId) {
        setErrorPhase(2);
        setLocalError(startRes.error || 'Failed to initiate repository ingestion job.');
        setIsIngesting(false);
        return;
      }

      const jobId = startRes.jobId;

      // Poll real job status until completed or failed
      const maxPollAttempts = 180; // 3 minutes maximum timeout
      let attempts = 0;
      let completedSuccessfully = false;

      while (attempts < maxPollAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        attempts++;

        const statusRes = await getSyncJobStatus(integ.repoId, jobId);
        if (!statusRes.success || !statusRes.job) {
          // If a transient network glitch happens while polling, retry polling
          continue;
        }

        const job = statusRes.job;

        // Update real progress phase from server telemetry
        if (job.phase && job.phase >= 2) {
          setCurrentPhase(job.phase);
        }

        // Update live counters from server telemetry
        if (job.counters) {
          setCounters({
            discovered: job.counters.discovered || 0,
            read: job.counters.read || 0,
            skipped: job.counters.skipped || 0,
            analyzed: job.counters.analyzed || 0,
            findings: job.counters.findings || 0,
          });
        }

        if (job.status === 'completed') {
          completedSuccessfully = true;
          await completeSyncAndRefresh();

          // Fetch verified intelligence from storage
          const intelRes = await getCodebaseIntelligence(integ.repoId);
          const intel = intelRes.data || null;
          setIntelligence(intel);

          if (intel) {
            const totalDisc = intel?.progress?.discoveredCount || intel?.stats?.totalFilesDiscovered || job.counters?.discovered || 0;
            const fRead = intel?.progress?.readCount || intel?.stats?.totalFilesRead || job.counters?.read || 0;
            const fSkipped = intel?.progress?.skippedCount || intel?.stats?.totalFilesSkipped || job.counters?.skipped || 0;
            const fAnalyzed = intel?.progress?.analyzedCount || job.counters?.analyzed || 0;
            const fCount = intel?.progress?.findingsCount || intel?.stats?.totalFindings || job.counters?.findings || 0;

            setCounters({
              discovered: totalDisc,
              read: fRead,
              skipped: fSkipped,
              analyzed: fAnalyzed,
              findings: fCount,
            });
          }

          setCurrentPhase(9); // Completed!
          setIsIngesting(false);

          if (onSuccess) onSuccess();
          return;
        }

        if (job.status === 'failed') {
          setErrorPhase(job.phase || 8);
          setLocalError(job.error || 'Codebase ingestion failed during processing.');
          setIsIngesting(false);
          return;
        }
      }

      if (!completedSuccessfully) {
        setErrorPhase(currentPhase || 8);
        setLocalError('Ingestion job is still processing in the background. Please verify the Render backend or refresh.');
        setIsIngesting(false);
      }
    } catch (err: any) {
      setErrorPhase(currentPhase || 5);
      setLocalError(err?.message || 'Codebase ingestion failed.');
      setIsIngesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedOwner = repoOwner.trim();
    const trimmedName = repoName.trim();
    const trimmedBranch = selectedBranch.trim() || 'main';

    if (!trimmedOwner) {
      setLocalError('Please enter the GitHub repository owner or organization.');
      return;
    }

    if (!trimmedName) {
      setLocalError('Please enter the GitHub repository name.');
      return;
    }

    const slugRegex = /^[a-zA-Z0-9_.-]+$/;
    if (!slugRegex.test(trimmedOwner) || !slugRegex.test(trimmedName)) {
      setLocalError('Repository owner and name must contain only alphanumeric characters, hyphens, underscores, or periods.');
      return;
    }

    if (!includeCommits && !includePullRequests && !includeIssues && !includeDocs) {
      setLocalError('Please select at least one knowledge source to ingest (commits, PRs, issues, or docs).');
      return;
    }

    setLocalError(null);
    setIsIngesting(true);
    setCurrentPhase(1); // Connecting Repository

    const res = await connectGitHubRepo({
      repoOwner: trimmedOwner,
      repoName: trimmedName,
      selectedBranch: trimmedBranch,
      config: {
        includeCommits,
        includePullRequests,
        includeIssues,
        includeDocs,
      },
    });

    if (res.success && res.integration) {
      setCreatedIntegration(res.integration);
      // Trigger full ingestion & scanning workflow
      await runIngestionFlow(res.integration);
    } else {
      setIsIngesting(false);
      setCurrentPhase(0);
      setLocalError(res.error || 'Failed to connect repository. Verify the repository exists and is accessible.');
    }
  };

  const handleRetry = async () => {
    if (!createdIntegration) {
      setIsIngesting(false);
      setCurrentPhase(0);
      setErrorPhase(null);
      return;
    }

    // Phase 8 Resilience: If persistence failed, skip GitHub scanning and Gemini AI extraction,
    // and directly resume the persistence operation using cached scan data.
    if (errorPhase === 8) {
      setIsIngesting(true);
      setLocalError(null);
      setErrorPhase(null);
      setCurrentPhase(8);

      try {
        const resumeRes = await resumePersistence(createdIntegration.repoId);
        if (resumeRes.success) {
          await completeSyncAndRefresh();
          const intelRes = await getCodebaseIntelligence(createdIntegration.repoId);
          setIntelligence(intelRes.data || null);
          setCurrentPhase(9);
          setIsIngesting(false);
          if (onSuccess) onSuccess();
        } else {
          setErrorPhase(8);
          setLocalError(resumeRes.error || 'Failed to persist cached repository intelligence.');
          setIsIngesting(false);
        }
      } catch (err: any) {
        setErrorPhase(8);
        setLocalError(err?.message || 'Failed to persist knowledge.');
        setIsIngesting(false);
      }
    } else {
      await runIngestionFlow(createdIntegration);
    }
  };

  const isManager = currentUserRole === 'MANAGER';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="github-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={() => {
        if (!isIngesting) onClose();
      }}
    >
      <div
        className="w-full max-w-xl bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/60 p-6 flex flex-col gap-4 overflow-hidden animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-outline-variant/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold border border-primary/20">
              <span className="material-symbols-outlined text-[22px]">hub</span>
            </div>
            <div>
              <h2
                id="github-modal-title"
                className="text-sm font-bold text-on-surface tracking-tight"
              >
                {currentPhase === 9
                  ? 'Codebase Ingestion Complete'
                  : currentPhase > 0
                  ? 'Ingesting Repository & Codebase'
                  : 'Connect GitHub Repository'}
              </h2>
              <p className="text-[11px] text-secondary mt-0.5">
                {currentPhase === 9
                  ? 'Deep architecture blueprint extracted with 100% source code grounding.'
                  : currentPhase > 0
                  ? 'Scanning git trees, reading blobs & synthesizing verified technical state.'
                  : 'Ingest commits, pull requests, issues, and documentation into project context.'}
              </p>
            </div>
          </div>
          {!isIngesting && (
            <button
              onClick={onClose}
              className="text-secondary hover:text-on-surface p-1 rounded-lg hover:bg-surface-container transition-colors"
              aria-label="Close dialog"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          )}
        </div>

        {/* ==================================================================== */}
        {/* VIEW 1: INGESTION PROGRESS TRACKER (Active or Completed)             */}
        {/* ==================================================================== */}
        {currentPhase > 0 ? (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Live Metrics Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40">
                <span className="text-[10px] text-secondary uppercase font-semibold block">Discovered</span>
                <span className="text-base font-bold font-mono text-on-surface">
                  {counters.discovered || (currentPhase >= 3 ? '...' : 0)}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40">
                <span className="text-[10px] text-secondary uppercase font-semibold block">Read</span>
                <span className="text-base font-bold font-mono text-primary">
                  {counters.read || (currentPhase >= 4 ? '...' : 0)}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40">
                <span className="text-[10px] text-secondary uppercase font-semibold block">Skipped</span>
                <span className="text-base font-bold font-mono text-secondary">
                  {counters.skipped || (currentPhase >= 4 ? '...' : 0)}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40">
                <span className="text-[10px] text-secondary uppercase font-semibold block">Analyzed</span>
                <span className="text-base font-bold font-mono text-on-surface">
                  {counters.analyzed || (currentPhase >= 5 ? '...' : 0)}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/40 col-span-2 sm:col-span-1">
                <span className="text-[10px] text-secondary uppercase font-semibold block">Findings</span>
                <span className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {counters.findings || (currentPhase >= 6 ? '...' : 0)}
                </span>
              </div>
            </div>

            {/* Error Alert with Retry */}
            {localError && (
              <div className="p-3 bg-error/10 border border-error/30 rounded-xl flex items-start justify-between gap-2 text-xs text-error">
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>
                  <div>
                    <span className="font-bold block">Ingestion Interrupted</span>
                    <span className="leading-relaxed">{localError}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRetry}
                  className="px-3 py-1 bg-error text-white font-bold rounded-lg hover:bg-error/90 transition-colors shrink-0 text-xs"
                >
                  Retry
                </button>
              </div>
            )}

            {/* 9-Phase Progress Pipeline List */}
            <div className="border border-outline-variant/40 rounded-xl divide-y divide-outline-variant/20 bg-surface-container-low/30 overflow-hidden">
              {INGESTION_PHASES.map((p) => {
                const isCurrent = currentPhase === p.id && isIngesting;
                const isDone = currentPhase > p.id;
                const isError = errorPhase === p.id;

                return (
                  <div
                    key={p.id}
                    className={`p-2.5 flex items-center justify-between gap-3 text-xs transition-colors ${
                      isCurrent
                        ? 'bg-primary/5 font-semibold text-primary'
                        : isDone
                        ? 'text-on-surface'
                        : 'text-secondary/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0">
                        {isError ? (
                          <span className="material-symbols-outlined text-error text-[18px]">cancel</span>
                        ) : isDone ? (
                          <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-[18px]">
                            check_circle
                          </span>
                        ) : isCurrent ? (
                          <span className="material-symbols-outlined text-primary text-[18px] animate-spin">
                            progress_activity
                          </span>
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-secondary/40"></span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-xs truncate">
                            {p.id}. {p.label}
                          </span>
                        </div>
                        <p className="text-[10px] text-secondary truncate">{p.desc}</p>
                      </div>
                    </div>

                    <div className="shrink-0 text-[10px] font-mono">
                      {isDone ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold uppercase">Done</span>
                      ) : isCurrent ? (
                        <span className="text-primary font-bold uppercase animate-pulse">Running</span>
                      ) : isError ? (
                        <span className="text-error font-bold uppercase">Failed</span>
                      ) : (
                        <span className="text-secondary/50">Pending</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Completion Actions */}
            {currentPhase === 9 && (
              <div className="pt-2 flex items-center justify-end gap-2">
                {createdIntegration && onOpenQnA && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenQnA(createdIntegration);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold text-xs border border-outline-variant/40 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px] text-primary">chat</span>
                    <span>Ask Codebase Q&amp;A</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center gap-1.5 px-4 h-9 rounded-xl bg-primary hover:bg-primary-hover text-on-primary font-semibold text-xs shadow-xs transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">check</span>
                  <span>Done</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          /* ==================================================================== */
          /* VIEW 2: INITIAL CONNECTION FORM                                      */
          /* ==================================================================== */
          <>
            {/* Public Demo Info Banner */}
            <div className="p-3 bg-surface-container-low/50 border border-outline-variant/30 rounded-xl flex items-start gap-2.5 text-xs text-secondary">
              <span className="material-symbols-outlined text-primary text-[17px] shrink-0 mt-0.5">
                public
              </span>
              <div className="space-y-0.5">
                <p className="font-bold text-on-surface text-xs">Zero-Auth Public Demo Access</p>
                <p className="text-secondary leading-relaxed text-[11px]">
                  Judges can connect any public repository without logging into GitHub. The scanner recursively discovers all source files, models architecture, and extracts verified findings with verbatim code quotes.
                </p>
              </div>
            </div>

            {/* Demo Quick-Fill Suggestions */}
            <div className="p-3 bg-surface-container-low border border-outline-variant/30 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
              <span className="font-bold text-on-surface text-xs shrink-0">Try Sample Repositories:</span>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleFillDemoRepo('vitsamyak', 'KnoTrail')}
                  className="px-2.5 h-7 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary font-mono text-[11px] font-bold border border-outline-variant/40 transition-colors"
                >
                  vitsamyak/KnoTrail
                </button>
                <button
                  type="button"
                  onClick={() => handleFillDemoRepo('facebook', 'react')}
                  className="px-2.5 h-7 rounded-lg bg-surface-container hover:bg-surface-container-high text-secondary hover:text-on-surface font-mono text-[11px] border border-outline-variant/40 transition-colors"
                >
                  facebook/react
                </button>
              </div>
            </div>

            {/* RBAC Warning if not Manager */}
            {!isManager && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-900">
                <span className="material-symbols-outlined text-[16px] text-amber-700 shrink-0">lock</span>
                <span>
                  Connecting repositories requires <strong>Manager</strong> permissions. Sign in as Demo Manager or switch perspectives in Header.
                </span>
              </div>
            )}

            {/* Error Feedback Alert */}
            {localError && (
              <div className="p-2.5 bg-error/10 border border-error/30 rounded-xl flex items-start gap-2 text-xs text-error">
                <span className="material-symbols-outlined text-error text-[16px] shrink-0 mt-0.5">
                  error
                </span>
                <span className="font-medium leading-relaxed">{localError}</span>
              </div>
            )}

            {/* Connect Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-on-surface block mb-1">
                    Repository Owner <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. vitsamyak or organization"
                    value={repoOwner}
                    onChange={(e) => setRepoOwner(e.target.value)}
                    disabled={isGitHubLoading || !isManager}
                    className="w-full h-9 px-3 rounded-lg bg-surface-container-lowest border border-outline-variant/50 text-xs text-on-surface placeholder:text-secondary/60 focus:outline-hidden focus:border-primary transition-colors disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-on-surface block mb-1">
                    Repository Name <span className="text-error">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. KnoTrail"
                    value={repoName}
                    onChange={(e) => setRepoName(e.target.value)}
                    disabled={isGitHubLoading || !isManager}
                    className="w-full h-9 px-3 rounded-lg bg-surface-container-lowest border border-outline-variant/50 text-xs text-on-surface placeholder:text-secondary/60 focus:outline-hidden focus:border-primary transition-colors disabled:opacity-60"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-on-surface block mb-1">
                  Target Branch
                </label>
                <input
                  type="text"
                  placeholder="main (or develop, master)"
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  disabled={isGitHubLoading || !isManager}
                  className="w-full h-9 px-3 rounded-lg bg-surface-container-lowest border border-outline-variant/50 text-xs text-on-surface placeholder:text-secondary/60 focus:outline-hidden focus:border-primary transition-colors disabled:opacity-60"
                />
              </div>

              {/* Ingestion Scope */}
              <div className="p-3 bg-surface-container-low/50 rounded-xl border border-outline-variant/30 flex flex-col gap-2">
                <span className="text-[11px] font-bold text-on-surface block">
                  Knowledge Ingestion Scope
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includeCommits}
                      onChange={(e) => setIncludeCommits(e.target.checked)}
                      disabled={isGitHubLoading || !isManager}
                      className="rounded text-primary focus:ring-primary h-4 w-4"
                    />
                    <span className="text-on-surface text-[11px]">Git Commits &amp; Diffs</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includePullRequests}
                      onChange={(e) => setIncludePullRequests(e.target.checked)}
                      disabled={isGitHubLoading || !isManager}
                      className="rounded text-primary focus:ring-primary h-4 w-4"
                    />
                    <span className="text-on-surface text-[11px]">Pull Requests &amp; Reviews</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includeIssues}
                      onChange={(e) => setIncludeIssues(e.target.checked)}
                      disabled={isGitHubLoading || !isManager}
                      className="rounded text-primary focus:ring-primary h-4 w-4"
                    />
                    <span className="text-on-surface text-[11px]">Issues &amp; Resolutions</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includeDocs}
                      onChange={(e) => setIncludeDocs(e.target.checked)}
                      disabled={isGitHubLoading || !isManager}
                      className="rounded text-primary focus:ring-primary h-4 w-4"
                    />
                    <span className="text-on-surface text-[11px]">Full Codebase &amp; Architecture</span>
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/30">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isGitHubLoading}
                  className="px-3.5 h-9 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold text-xs border border-outline-variant/40 transition-colors disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGitHubLoading || !isManager}
                  className="inline-flex items-center justify-center gap-1.5 px-4 h-9 rounded-xl bg-primary hover:bg-primary-hover text-on-primary font-semibold text-xs shadow-xs transition-colors disabled:opacity-60"
                >
                  {isGitHubLoading ? (
                    <>
                      <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">add_link</span>
                      <span>Connect Repository</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
