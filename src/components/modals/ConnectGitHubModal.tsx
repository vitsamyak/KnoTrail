'use client';

import React, { useState, useEffect } from 'react';
import { useProject } from '../../context/ProjectContext';

interface ConnectGitHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ConnectGitHubModal({ isOpen, onClose, onSuccess }: ConnectGitHubModalProps) {
  const { connectGitHubRepo, isGitHubLoading, currentUserRole } = useProject();

  const [repoOwner, setRepoOwner] = useState('');
  const [repoName, setRepoName] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('main');
  const [includeCommits, setIncludeCommits] = useState(true);
  const [includePullRequests, setIncludePullRequests] = useState(true);
  const [includeIssues, setIncludeIssues] = useState(true);
  const [includeDocs, setIncludeDocs] = useState(true);
  const [localError, setLocalError] = useState<string | null>(null);

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
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleFillDemoRepo = (owner: string, name: string) => {
    setRepoOwner(owner);
    setRepoName(name);
    setSelectedBranch('main');
    setLocalError(null);
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

    if (res.success) {
      onClose();
      if (onSuccess) onSuccess();
    } else {
      setLocalError(res.error || 'Failed to connect repository. Verify the repository exists and is accessible.');
    }
  };

  const isManager = currentUserRole === 'MANAGER';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="github-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-surface-container-lowest rounded-xl shadow-2xl border border-outline-variant/50 p-6 flex flex-col gap-4 overflow-hidden animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-1 border-b border-outline-variant/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold">
              <span className="material-symbols-outlined text-[20px]">hub</span>
            </div>
            <div>
              <h2
                id="github-modal-title"
                className="text-sm font-semibold text-on-surface tracking-tight"
              >
                Connect GitHub Repository
              </h2>
              <p className="text-[11px] text-secondary mt-0.5">
                Ingest commits, pull requests, issues, and documentation into project context.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-secondary hover:text-on-surface p-1 rounded-lg transition-colors"
            aria-label="Close dialog"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Public Demo Info Banner */}
        <div className="p-3 bg-surface-container-low/50 border border-outline-variant/30 rounded-lg flex items-start gap-2.5 text-xs text-secondary">
          <span className="material-symbols-outlined text-primary text-[17px] shrink-0 mt-0.5">
            public
          </span>
          <div className="space-y-0.5">
            <p className="font-semibold text-on-surface text-xs">Zero-Auth Public Demo Access</p>
            <p className="text-secondary leading-relaxed text-[11px]">
              Judges can connect any public repository without logging into GitHub. The server ingests authentic commits, PR reviews, and issues with strict evidence grounding.
            </p>
          </div>
        </div>

        {/* Demo Quick-Fill Suggestions */}
        <div className="p-3 bg-surface-container-low border border-outline-variant/30 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
          <span className="font-semibold text-on-surface text-xs shrink-0">Try Sample Repositories:</span>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => handleFillDemoRepo('vitsamyak', 'KnoTrail')}
              className="px-2.5 h-7 rounded-md bg-surface-container hover:bg-surface-container-high text-primary font-mono text-[11px] border border-outline-variant/40 transition-colors"
            >
              vitsamyak/KnoTrail
            </button>
            <button
              type="button"
              onClick={() => handleFillDemoRepo('facebook', 'react')}
              className="px-2.5 h-7 rounded-md bg-surface-container hover:bg-surface-container-high text-secondary hover:text-on-surface font-mono text-[11px] border border-outline-variant/40 transition-colors"
            >
              facebook/react
            </button>
          </div>
        </div>

        {/* RBAC Warning if not Manager */}
        {!isManager && (
          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-xs text-amber-900">
            <span className="material-symbols-outlined text-[16px] text-amber-700 shrink-0">lock</span>
            <span>
              Connecting repositories requires <strong>Manager</strong> permissions. Sign in as Demo Manager or switch perspectives in Header.
            </span>
          </div>
        )}

        {/* Error Feedback Alert */}
        {localError && (
          <div className="p-2.5 bg-error/10 border border-error/30 rounded-lg flex items-start gap-2 text-xs text-error">
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
              <label className="text-[11px] font-semibold text-on-surface block mb-1">
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
              <label className="text-[11px] font-semibold text-on-surface block mb-1">
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
            <label className="text-[11px] font-semibold text-on-surface block mb-1">
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
          <div className="p-3 bg-surface-container-low/50 rounded-lg border border-outline-variant/30 flex flex-col gap-2">
            <span className="text-[11px] font-semibold text-on-surface block">
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
                <span className="text-on-surface text-[11px]">README &amp; Documentation</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/30">
            <button
              type="button"
              onClick={onClose}
              disabled={isGitHubLoading}
              className="px-3.5 h-9 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-medium text-xs border border-outline-variant/40 transition-colors disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isGitHubLoading || !isManager}
              className="inline-flex items-center justify-center gap-1.5 px-4 h-9 rounded-lg bg-primary hover:bg-primary-hover text-on-primary font-medium text-xs shadow-xs transition-colors disabled:opacity-60"
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
      </div>
    </div>
  );
}
