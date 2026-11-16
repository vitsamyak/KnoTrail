'use client';

import React, { useState, useRef } from 'react';
import { useProject } from '../../context/ProjectContext';
import { ProjectSource, GitHubIntegration } from '../../lib/types';
import { formatBytes, isAllowedFile, MAX_FILE_SIZE_BYTES, MAX_FILES_PER_BATCH } from '../../server/documents/extractor';
import { KnowledgeTrailLoader } from '../ui/KnowledgeTrailLoader';
import { GitHubLogo } from '../ui/GitHubLogo';
import { ConnectGitHubModal } from '../modals/ConnectGitHubModal';
import { UpdateHistoryDrawer } from '../modals/UpdateHistoryDrawer';
import { CodebaseQnAModal } from '../modals/CodebaseQnAModal';

export function SourceManagerView() {
  const {
    project,
    workspaceId,
    addSource,
    uploadSources,
    deleteSource,
    runAiSync,
    isSyncing,
    setActiveView,
    gitHubIntegrations,
    isGitHubLoading,
    syncingRepoId,
    gitHubError,
    syncGitHubRepo,
    disconnectGitHubRepo,
    currentUserRole,
  } = useProject();

  // Modal states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [showGitHubModal, setShowGitHubModal] = useState(false);
  const [qnaModalRepo, setQnaModalRepo] = useState<GitHubIntegration | null>(null);
  const [selectedHistoryRepo, setSelectedHistoryRepo] = useState<GitHubIntegration | null>(null);
  const [disconnectConfirmRepo, setDisconnectConfirmRepo] = useState<GitHubIntegration | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<{ repoId: number; success: boolean; message: string } | null>(null);
  const [inspectSource, setInspectSource] = useState<ProjectSource | null>(null);
  const [deleteConfirmSource, setDeleteConfirmSource] = useState<ProjectSource | null>(null);

  // File upload state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<Array<{ filename: string; success: boolean; error?: string; pageCount?: number; lineCount?: number }>>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Paste note state
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceType, setNewSourceType] = useState<ProjectSource['type']>('notes');
  const [newSourceContent, setNewSourceContent] = useState('');
  const [newSourceDesc, setNewSourceDesc] = useState('');
  const [isPasting, setIsPasting] = useState(false);

  // Filter & Search state for sources
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'UPLOADED' | 'NOTES'>('ALL');

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelected(Array.from(e.dataTransfer.files));
    }
  };

  const handleFilesSelected = (files: File[]) => {
    setUploadResults([]);
    const combined = [...selectedFiles, ...files].slice(0, MAX_FILES_PER_BATCH);
    setSelectedFiles(combined);
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Submit file upload
  const handleUploadSubmit = async () => {
    if (selectedFiles.length === 0 || isUploading) return;
    setIsUploading(true);
    setUploadResults([]);

    const res = await uploadSources(selectedFiles);
    setIsUploading(false);
    setUploadResults(res.results || []);

    if (res.success) {
      setSelectedFiles([]);
    }
  };

  // Submit paste note
  const handlePasteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSourceName.trim() || !newSourceContent.trim()) return;

    setIsPasting(true);
    setTimeout(() => {
      addSource({
        name: newSourceName.trim(),
        type: newSourceType,
        content: newSourceContent.trim(),
        description: newSourceDesc.trim() || 'Handover notes added to this project.',
      });
      setIsPasting(false);
      setShowPasteModal(false);
      setNewSourceName('');
      setNewSourceContent('');
      setNewSourceDesc('');
    }, 300);
  };

  // Filter sources
  const filteredSources = project.sources.filter((s) => {
    if (sourceFilter === 'UPLOADED') return !!s.isUploaded;
    if (sourceFilter === 'NOTES') return !s.isUploaded || s.type === 'notes';
    return true;
  });

  const uploadedCount = project.sources.filter((s) => s.isUploaded).length;

  return (
    <div className="flex flex-col w-full gap-4 sm:gap-4.5 animate-in fade-in duration-200">
      {/* Standardized Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 sm:pb-3.5 border-b border-outline-variant/30">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-secondary mb-1">
            <span>Workspace</span>
            <span>/</span>
            <span className="text-on-surface font-semibold">Sources &amp; GitHub</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight">
            Source Manager
          </h1>
          <p className="text-xs sm:text-sm text-secondary mt-0.5 leading-relaxed">
            Connect code repositories and ingest architecture specifications, runbooks, and meeting notes.
          </p>
        </div>

        {/* Action Group */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
          <button
            onClick={() => {
              if (currentUserRole === 'EXTERNAL') return;
              setSelectedFiles([]);
              setUploadResults([]);
              setShowUploadModal(true);
            }}
            disabled={currentUserRole === 'EXTERNAL'}
            title={currentUserRole === 'EXTERNAL' ? 'Read-only access: External members cannot upload documents' : undefined}
            className={`inline-flex items-center justify-center gap-1.5 px-3.5 h-9 rounded-lg text-xs font-medium shadow-2xs transition-colors ${
              currentUserRole === 'EXTERNAL'
                ? 'bg-surface-container-low text-secondary opacity-50 cursor-not-allowed border border-outline-variant/40'
                : 'bg-primary hover:bg-primary-hover text-on-primary'
              }`}
          >
            <span className="material-symbols-outlined text-[17px]">
              {currentUserRole === 'EXTERNAL' ? 'lock' : 'upload_file'}
            </span>
            <span>Upload Documents</span>
          </button>

          <button
            onClick={() => setShowGitHubModal(true)}
            className="inline-flex items-center justify-center gap-2 px-3.5 h-9 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-medium border border-outline-variant/40 transition-colors shadow-2xs"
          >
            {currentUserRole === 'EXTERNAL' ? (
              <span className="material-symbols-outlined text-[17px]">lock</span>
            ) : (
              <GitHubLogo className="w-4 h-4 text-on-surface shrink-0" />
            )}
            <span>Connect GitHub</span>
          </button>

          <button
            onClick={() => {
              if (currentUserRole === 'EXTERNAL') return;
              setShowPasteModal(true);
            }}
            disabled={currentUserRole === 'EXTERNAL'}
            title={currentUserRole === 'EXTERNAL' ? 'Read-only access: External members cannot add source notes' : undefined}
            className={`inline-flex items-center justify-center gap-1.5 px-3.5 h-9 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-medium border border-outline-variant/40 transition-colors ${
              currentUserRole === 'EXTERNAL' ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">
              {currentUserRole === 'EXTERNAL' ? 'lock' : 'edit_note'}
            </span>
            <span>Paste Notes</span>
          </button>

          <button
            onClick={() => runAiSync()}
            disabled={isSyncing}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 h-9 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-medium border border-outline-variant/40 transition-colors disabled:opacity-60"
          >
            <span className={`material-symbols-outlined text-[17px] text-primary ${isSyncing ? 'animate-spin' : ''}`}>
              sync
            </span>
            <span>{isSyncing ? 'Syncing...' : 'Sync Workspace'}</span>
          </button>
        </div>
      </div>

      {/* CONNECTED GITHUB REPOSITORIES SECTION */}
      <div className="bg-surface-container-lowest rounded-2xl p-5 sm:p-6 border border-outline-variant/40 shadow-xs flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#24292f] text-white flex items-center justify-center shrink-0 shadow-xs ring-1 ring-black/5">
              <GitHubLogo className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-on-surface flex items-center gap-2">
                <span>Connected GitHub Repositories</span>
                <span className="px-2 py-0.5 rounded-full bg-surface-container text-primary text-[11px] font-mono font-bold border border-outline-variant/30">
                  {gitHubIntegrations.length}
                </span>
              </h2>
              <p className="text-xs text-secondary mt-0.5">
                Automatic repository ingestion with real-time webhooks, source attribution, and evidence grounding.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowGitHubModal(true)}
            className="inline-flex items-center gap-2 px-3.5 h-8.5 rounded-xl bg-primary hover:bg-primary-hover text-on-primary text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
          >
            <GitHubLogo className="w-3.5 h-3.5" />
            <span>Add Repository</span>
          </button>
        </div>

        {/* Sync Feedback Toast / Banner */}
        {syncFeedback && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-2 animate-in fade-in duration-150 ${syncFeedback.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
                : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300'
              }`}
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">
                {syncFeedback.success ? 'check_circle' : 'error'}
              </span>
              <span className="font-medium">{syncFeedback.message}</span>
            </div>
            <button
              onClick={() => setSyncFeedback(null)}
              className="text-secondary hover:text-on-surface p-0.5 rounded"
            >
              <span className="material-symbols-outlined text-[14px]">close</span>
            </button>
          </div>
        )}

        {/* Rate-Limit or Error Banner */}
        {gitHubError && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-amber-700 dark:text-amber-400 shrink-0">warning</span>
            <span>{gitHubError}</span>
          </div>
        )}

        {/* Integrations Grid */}
        {gitHubIntegrations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {gitHubIntegrations.map((integ) => {
              const isCurrentlySyncing = syncingRepoId === integ.repoId;
              const matchingSource = project.sources.find(
                (s) => s.githubIntegrationId === integ.id || s.id === `src_gh_${integ.repoId}`
              );
              const intel = integ.codebaseIntelligence || matchingSource?.codebaseIntelligence;
              const repoUrl = `https://github.com/${integ.repoOwner}/${integ.repoName}`;

              // 4 uniform scope badges
              const statsBadges = [
                { key: 'commits', icon: 'commit', label: 'commits', title: 'Git Commits', active: integ.config?.includeCommits !== false },
                { key: 'prs', icon: 'merge', label: 'PRs', title: 'Pull Requests', active: integ.config?.includePullRequests !== false },
                { key: 'issues', icon: 'adjust', label: 'issues', title: 'Issues & Resolutions', active: integ.config?.includeIssues !== false },
                { key: 'docs', icon: 'description', label: 'docs', title: 'Documentation', active: integ.config?.includeDocs !== false },
              ];
              const activeStats = statsBadges.filter(b => b.active);
              const gridColsClass = activeStats.length === 4 ? 'grid-cols-4' : activeStats.length === 3 ? 'grid-cols-3' : activeStats.length === 2 ? 'grid-cols-2' : 'grid-cols-1';

              // Codebase Intelligence technology cards
              const techCards = [
                intel?.blueprint?.frontend?.framework && {
                  name: intel.blueprint.frontend.framework.split(' ')[0],
                  fullName: intel.blueprint.frontend.framework,
                  icon: 'web',
                  tone: 'primary',
                },
                intel?.blueprint?.backend?.framework && {
                  name: intel.blueprint.backend.framework.split(' ')[0],
                  fullName: intel.blueprint.backend.framework,
                  icon: 'dns',
                  tone: 'surface',
                },
                intel?.blueprint?.database?.type && {
                  name: intel.blueprint.database.type.split(' ')[0],
                  fullName: intel.blueprint.database.type,
                  icon: 'database',
                  tone: 'surface',
                },
              ].filter(Boolean) as { name: string; fullName: string; icon: string; tone: string }[];

              return (
                <div
                  key={integ.id}
                  className="group bg-surface-container-lowest hover:bg-surface-container-low/30 rounded-2xl p-4 sm:p-5 border border-outline-variant/40 hover:border-outline-variant/70 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-3.5"
                >
                  <div className="space-y-3">
                    {/* 1. Repository Header Grid */}
                    <div className="flex items-start justify-between gap-3">
                      {/* Left: GitHub Octocat Avatar & Repo Meta */}
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="w-9 h-9 rounded-xl bg-[#24292f] text-white flex items-center justify-center shrink-0 shadow-xs ring-1 ring-black/5 mt-0.5">
                          <GitHubLogo className="w-5 h-5 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          {/* Owner & Repo Name */}
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-xs font-medium text-secondary truncate">{integ.repoOwner}</span>
                            <span className="text-secondary/40 text-xs">/</span>
                            <a
                              href={repoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs sm:text-sm font-bold text-on-surface hover:text-primary transition-colors truncate inline-flex items-center gap-1 group/link"
                              title={`Open ${integ.repoOwner}/${integ.repoName} on GitHub`}
                            >
                              <span className="truncate">{integ.repoName}</span>
                              <span className="material-symbols-outlined text-[13px] text-secondary opacity-0 group-hover/link:opacity-100 transition-opacity shrink-0">
                                open_in_new
                              </span>
                            </a>
                          </div>

                          {/* Branch & Short Commit SHA */}
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-container text-[10.5px] font-mono font-medium text-secondary border border-outline-variant/30 shrink-0">
                              <span className="material-symbols-outlined text-[11px] text-secondary">fork_right</span>
                              <span>{integ.selectedBranch || integ.defaultBranch || 'main'}</span>
                            </span>
                            {integ.lastCommitSha && (
                              <span className="inline-flex items-center gap-1 text-[10.5px] font-mono text-secondary shrink-0">
                                <span className="text-secondary/50 font-sans uppercase text-[9px] font-medium tracking-wider">SHA</span>
                                <span className="font-semibold text-on-surface bg-surface-container px-1.5 py-0.5 rounded-md border border-outline-variant/30">
                                  {integ.lastCommitSha.slice(0, 7)}
                                </span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Synced Status Badge */}
                      <div
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-semibold border shrink-0 ${
                          integ.syncStatus === 'synced'
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                            : integ.syncStatus === 'syncing' || isCurrentlySyncing
                            ? 'bg-primary/10 text-primary border-primary/30 animate-pulse'
                            : integ.syncStatus === 'error'
                            ? 'bg-error/10 text-error border-error/30'
                            : 'bg-surface-container text-secondary border-outline-variant/30'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            integ.syncStatus === 'synced'
                              ? 'bg-emerald-600 dark:bg-emerald-400'
                              : integ.syncStatus === 'syncing' || isCurrentlySyncing
                              ? 'bg-primary'
                              : integ.syncStatus === 'error'
                              ? 'bg-error'
                              : 'bg-secondary'
                          }`}
                        />
                        <span className="capitalize">
                          {isCurrentlySyncing ? 'Syncing...' : integ.syncStatus}
                        </span>
                      </div>
                    </div>

                    {/* 2. Repository Statistics: 4 uniform, equally styled compact badges */}
                    <div className={`grid ${gridColsClass} gap-1.5 pt-0.5`}>
                      {activeStats.map((badge) => (
                        <div
                          key={badge.key}
                          className="h-7 px-1.5 rounded-lg bg-surface-container-low text-secondary text-[10.5px] font-mono font-medium border border-outline-variant/30 flex items-center justify-center gap-1 min-w-0"
                          title={badge.title}
                        >
                          <span className="material-symbols-outlined text-[12px] text-secondary/70 shrink-0">{badge.icon}</span>
                          <span className="truncate">{badge.label}</span>
                        </div>
                      ))}
                    </div>

                    {/* 3. Sync Information Row */}
                    <div className="flex items-center justify-between text-[11px] text-secondary font-mono border-t border-outline-variant/20 pt-2.5">
                      <div className="flex items-center gap-1.5 min-w-0" title="Last synchronized time">
                        <span className="material-symbols-outlined text-[13px] text-secondary/70 shrink-0">schedule</span>
                        <span className="truncate">
                          {integ.lastSyncedAt
                            ? new Date(integ.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                            : 'Never'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 font-semibold text-primary shrink-0" title="Total indexed records in knowledge base">
                        <span className="material-symbols-outlined text-[13px] text-primary shrink-0">database</span>
                        <span>{matchingSource?.recordCount ?? 0} records indexed</span>
                      </div>
                    </div>

                    {integ.errorMessage && (
                      <div className="p-2.5 rounded-xl bg-error/10 border border-error/20 text-error text-[11px] flex items-start gap-1.5">
                        <span className="material-symbols-outlined text-[14px] shrink-0 mt-0.5">error</span>
                        <span className="line-clamp-2 leading-tight">{integ.errorMessage}</span>
                      </div>
                    )}

                    {/* 4. Codebase Intelligence Section */}
                    {intel && (
                      <div className="p-3 rounded-xl bg-surface-container/40 hover:bg-surface-container/60 transition-colors border border-outline-variant/30 flex flex-col gap-2.5">
                        {/* Section Header: Title on Left, Metrics Badge on Right */}
                        <div className="flex items-center justify-between gap-2 min-w-0">
                          <div className="flex items-center gap-1.5 font-bold text-xs text-on-surface whitespace-nowrap shrink-0">
                            <span className="material-symbols-outlined text-[15px] text-primary shrink-0">terminal</span>
                            <span>Codebase Intelligence</span>
                          </div>
                          <span className="font-mono text-[10px] text-secondary bg-surface-container-high px-2 py-0.5 rounded-md font-medium border border-outline-variant/30 whitespace-nowrap shrink-0">
                            {intel.stats?.totalFilesDiscovered || intel.inventory?.length || 0} files · {(intel.stats?.totalLinesOfCode || 0).toLocaleString()} LOC
                          </span>
                        </div>

                        {/* Technology Stack Cards: Equal height (h-7), uniform icons, responsive widths without clipping */}
                        {techCards.length > 0 && (
                          <div className="flex flex-wrap items-center gap-2 pt-0.5">
                            {techCards.map((tech, idx) => (
                              <div
                                key={idx}
                                className={`h-7 px-2.5 rounded-lg border text-[11px] font-medium inline-flex items-center gap-1.5 transition-colors flex-1 min-w-fit ${
                                  tech.tone === 'primary'
                                    ? 'bg-primary/10 text-primary border-primary/25 font-semibold'
                                    : 'bg-surface-container-high text-on-surface border-outline-variant/40'
                                }`}
                                title={tech.fullName}
                              >
                                <span className="material-symbols-outlined text-[13px] shrink-0 opacity-80">{tech.icon}</span>
                                <span className="whitespace-nowrap">{tech.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 5. Action Buttons & 6. Footer Actions */}
                  <div className="pt-2.5 border-t border-outline-variant/30 flex flex-col gap-2.5">
                    {/* Primary Action (Codebase Q&A) & Secondary Action (Sync) */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setQnaModalRepo(integ)}
                        className="flex-1 inline-flex items-center justify-center gap-2 h-9 px-3.5 rounded-xl bg-primary hover:bg-primary-hover text-on-primary font-semibold text-xs shadow-2xs transition-all active:scale-[0.99] focus:outline-none"
                        title="Ask Codebase Q&A and inspect Architecture Blueprint"
                      >
                        <span className="material-symbols-outlined text-[15px]">chat</span>
                        <span>Codebase Q&amp;A</span>
                      </button>

                      <button
                        onClick={async () => {
                          setSyncFeedback(null);
                          const res = await syncGitHubRepo(integ.repoId);
                          if (res.success) {
                            setSyncFeedback({
                              repoId: integ.repoId,
                              success: true,
                              message: `Synchronized ${integ.repoOwner}/${integ.repoName}: ${res.recordCounts?.commits || 0} commits, ${res.recordCounts?.pullRequests || 0} PRs, ${res.recordCounts?.issues || 0} issues.`,
                            });
                          } else {
                            setSyncFeedback({
                              repoId: integ.repoId,
                              success: false,
                              message: res.error || 'Sync failed.',
                            });
                          }
                        }}
                        disabled={isCurrentlySyncing || isGitHubLoading || currentUserRole === 'EXTERNAL'}
                        className="inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold text-xs border border-outline-variant/40 disabled:opacity-50 transition-all active:scale-[0.99] shrink-0 focus:outline-none"
                        title="Synchronize repository context"
                      >
                        <span className={`material-symbols-outlined text-[15px] ${isCurrentlySyncing ? 'animate-spin text-primary' : 'text-secondary'}`}>
                          sync
                        </span>
                        <span>{isCurrentlySyncing ? 'Syncing...' : 'Sync'}</span>
                      </button>
                    </div>

                    {/* Secondary Utilities Footer Row: Activity History on Left, Disconnect on Right */}
                    <div className="flex items-center justify-between text-xs pt-1.5 border-t border-outline-variant/20">
                      <button
                        onClick={() => setSelectedHistoryRepo(integ)}
                        className="inline-flex items-center gap-1.5 text-secondary hover:text-on-surface font-medium text-xs transition-colors py-0.5 rounded focus:outline-none"
                        title="View continuous update activity history"
                      >
                        <span className="material-symbols-outlined text-[14px] text-secondary/70">history</span>
                        <span>Activity History</span>
                      </button>

                      {currentUserRole === 'MANAGER' && (
                        <button
                          onClick={() => setDisconnectConfirmRepo(integ)}
                          disabled={isCurrentlySyncing || isGitHubLoading}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-error/75 hover:text-error hover:bg-error/10 text-xs font-medium transition-colors disabled:opacity-50 focus:outline-none"
                          title="Disconnect repository"
                        >
                          <span className="material-symbols-outlined text-[13px]">link_off</span>
                          <span>Disconnect</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 bg-surface-container-low/30 rounded-2xl border border-dashed border-outline-variant/60 text-center flex flex-col items-center justify-center gap-2 py-8">
            <div className="w-12 h-12 rounded-2xl bg-[#24292f] text-white flex items-center justify-center shadow-xs">
              <GitHubLogo className="w-6 h-6 text-white" />
            </div>
            <span className="text-sm font-bold text-on-surface">No GitHub repositories connected yet</span>
            <p className="text-xs text-secondary max-w-md leading-relaxed">
              Connect public GitHub repositories to automatically index commit history, pull request debates, and issues with full cryptographic evidence citations.
            </p>
            <button
              onClick={() => setShowGitHubModal(true)}
              className="mt-2 inline-flex items-center gap-2 px-4 h-9 rounded-xl bg-primary hover:bg-primary-hover text-on-primary font-semibold text-xs shadow-xs transition-colors"
            >
              <GitHubLogo className="w-4 h-4" />
              <span>Connect First Repository</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter Tabs & Privacy Guarantee */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-container-low/50 rounded-xl p-3.5 border border-outline-variant/30">
        <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-lg border border-outline-variant/30 text-xs">
          <button
            onClick={() => setSourceFilter('ALL')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${sourceFilter === 'ALL'
                ? 'bg-surface-container-lowest text-primary shadow-xs font-semibold'
                : 'text-secondary hover:text-on-surface'
              }`}
          >
            All Sources ({project.sources.length})
          </button>
          <button
            onClick={() => setSourceFilter('UPLOADED')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${sourceFilter === 'UPLOADED'
                ? 'bg-surface-container-lowest text-primary shadow-xs font-semibold'
                : 'text-secondary hover:text-on-surface'
              }`}
          >
            Uploaded Documents ({uploadedCount})
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-secondary">
          <span className="material-symbols-outlined text-[16px] text-primary">verified_user</span>
          <span>Zero-Auth Guarantee: Uploaded files remain isolated within your session workspace.</span>
        </div>
      </div>

      {/* Active Sources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSources.map((source) => (
          <div
            key={source.id}
            className={`bg-surface-container-lowest rounded-xl p-5 shadow-xs border flex flex-col justify-between hover:border-outline-variant/70 transition-all group ${source.isUploaded
                ? 'border-primary/30'
                : 'border-outline-variant/40'
              }`}
          >
            <div>
              {/* Card Top: Icon, Type, Status */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${source.isUploaded
                        ? 'bg-primary/10 text-primary'
                        : 'bg-surface-container-low text-primary group-hover:bg-primary/10'
                      }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">{source.icon}</span>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-secondary">
                        {source.documentData?.fileFormat ? source.documentData.fileFormat.toUpperCase() : source.type}
                      </span>
                      {source.isUploaded && (
                        <span className="px-1.5 py-0.2 bg-primary/10 text-primary rounded text-[9px] font-semibold uppercase tracking-wider">
                          Uploaded
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-secondary font-mono">{source.lastSync}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 bg-surface-container-low px-2 py-0.5 rounded-full border border-outline-variant/30">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${source.status === 'error'
                        ? 'bg-error'
                        : source.documentData?.isScannedPdf
                          ? 'bg-warning'
                          : 'bg-primary animate-pulse'
                      }`}
                  ></span>
                  <span className="text-[10px] font-medium text-primary capitalize">
                    {source.documentData?.isScannedPdf ? 'Scanned PDF' : source.status}
                  </span>
                </div>
              </div>

              {/* Source Name & Description */}
              <h3 className="text-sm font-semibold text-on-surface group-hover:text-primary transition-colors truncate" title={source.name}>
                {source.name}
              </h3>
              <p className="text-xs text-secondary mt-1 leading-relaxed line-clamp-2">
                {source.description}
              </p>
            </div>

            {/* Card Bottom: Records count & Actions */}
            <div className="mt-4 pt-3 border-t border-outline-variant/30 flex items-center justify-between text-xs">
              <span className="text-secondary font-mono text-[11px]">
                {source.documentData?.pageCount
                  ? `${source.documentData.pageCount} pages (${source.documentData.fileSizeFormatted})`
                  : source.documentData?.lineCount
                    ? `${source.documentData.lineCount} lines (${source.documentData.fileSizeFormatted})`
                    : `${source.recordCount.toLocaleString()} records`}
              </span>

              <div className="flex items-center gap-2">
                {source.documentData?.extractedText && (
                  <button
                    onClick={() => setInspectSource(source)}
                    className="text-primary hover:underline font-medium text-[11px] flex items-center gap-0.5"
                    title="Inspect Extracted Content"
                  >
                    <span>Inspect</span>
                    <span className="material-symbols-outlined text-[13px]">visibility</span>
                  </button>
                )}

                {source.isUploaded && currentUserRole === 'MANAGER' && (
                  <button
                    onClick={() => setDeleteConfirmSource(source)}
                    className="text-error/70 hover:text-error hover:underline font-medium text-[11px] flex items-center gap-0.5"
                    title="Remove Document (Manager Only)"
                  >
                    <span className="material-symbols-outlined text-[13px]">delete</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredSources.length === 0 && (
        <div className="bg-surface-container-lowest p-8 sm:p-12 rounded-xl border border-outline-variant/40 text-center flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-surface-container-low text-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-[28px]">upload_file</span>
          </div>
          <h4 className="text-sm font-semibold text-on-surface">No documents uploaded yet</h4>
          <p className="text-xs text-secondary max-w-md leading-relaxed">
            Upload your team&apos;s architecture documents, runbooks, or specifications in PDF, Markdown (.md), or plain text (.txt) format.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
            <button
              onClick={() => {
                setSelectedFiles([]);
                setUploadResults([]);
                setShowUploadModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 h-8 rounded-lg bg-primary hover:bg-primary-hover text-on-primary text-xs font-medium shadow-xs transition-colors"
            >
              <span className="material-symbols-outlined text-[15px]">picture_as_pdf</span>
              <span>Upload PDF</span>
            </button>
            <button
              onClick={() => {
                setSelectedFiles([]);
                setUploadResults([]);
                setShowUploadModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 h-8 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-medium border border-outline-variant/40 transition-colors"
            >
              <span className="material-symbols-outlined text-[15px]">markdown</span>
              <span>Upload Markdown</span>
            </button>
            <button
              onClick={() => setShowPasteModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 h-8 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-medium border border-outline-variant/40 transition-colors"
            >
              <span className="material-symbols-outlined text-[15px]">edit_note</span>
              <span>Add Notes</span>
            </button>
          </div>
        </div>
      )}

      {/* SUPPORTED & UPCOMING CONNECTORS */}
      <div className="bg-surface-container-lowest rounded-xl p-5 sm:p-6 border border-outline-variant/40 shadow-xs flex flex-col gap-3.5">
        <div>
          <h3 className="text-sm font-semibold text-on-surface">
            Supported Formats &amp; Connectors
          </h3>
          <p className="text-xs text-secondary mt-0.5">
            Document extraction operates locally on the backend server with deterministic source anchoring.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Active 1: PDF */}
          <div className="p-3 bg-surface-container-low/40 rounded-lg border border-primary/20 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-primary text-[20px]">picture_as_pdf</span>
              <div>
                <p className="text-xs font-semibold text-on-surface">PDF Documents</p>
                <p className="text-[11px] text-secondary">.pdf (Page coordinates tracked)</p>
              </div>
            </div>
            <span className="text-[9px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
              Active
            </span>
          </div>

          {/* Active 2: Markdown */}
          <div className="p-3 bg-surface-container-low/40 rounded-lg border border-primary/20 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-primary text-[20px]">markdown</span>
              <div>
                <p className="text-xs font-semibold text-on-surface">Markdown Documents</p>
                <p className="text-[11px] text-secondary">.md, .markdown (Headings preserved)</p>
              </div>
            </div>
            <span className="text-[9px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
              Active
            </span>
          </div>

          {/* Active 3: Plain Text */}
          <div className="p-3 bg-surface-container-low/40 rounded-lg border border-primary/20 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-primary text-[20px]">description</span>
              <div>
                <p className="text-xs font-semibold text-on-surface">Plain Text</p>
                <p className="text-[11px] text-secondary">.txt (Line numbers preserved)</p>
              </div>
            </div>
            <span className="text-[9px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
              Active
            </span>
          </div>

          {/* Upcoming 1: GitHub */}
          <div className="p-3 bg-surface-container-low/30 rounded-lg border border-outline-variant/30 flex items-center justify-between opacity-60">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-secondary text-[20px]">commit</span>
              <div>
                <p className="text-xs font-medium text-on-surface">GitHub Repositories</p>
                <p className="text-[11px] text-secondary">Commits, PRs, diffs</p>
              </div>
            </div>
            <span className="text-[10px] bg-surface-container-low text-secondary border border-outline-variant/40 px-2 py-0.5 rounded-full font-medium">
              Upcoming
            </span>
          </div>

          {/* Upcoming 2: Slack */}
          <div className="p-3 bg-surface-container-low/30 rounded-lg border border-outline-variant/30 flex items-center justify-between opacity-60">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-secondary text-[20px]">forum</span>
              <div>
                <p className="text-xs font-medium text-on-surface">Slack Discussions</p>
                <p className="text-[11px] text-secondary">Channel threads &amp; decisions</p>
              </div>
            </div>
            <span className="text-[10px] bg-surface-container-low text-secondary border border-outline-variant/40 px-2 py-0.5 rounded-full font-medium">
              Upcoming
            </span>
          </div>

          {/* Upcoming 3: Notion / Linear */}
          <div className="p-3 bg-surface-container-low/30 rounded-lg border border-outline-variant/30 flex items-center justify-between opacity-60">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-secondary text-[20px]">check_box</span>
              <div>
                <p className="text-xs font-medium text-on-surface">Notion &amp; Linear</p>
                <p className="text-[11px] text-secondary">Wikis, tasks &amp; epics</p>
              </div>
            </div>
            <span className="text-[10px] bg-surface-container-low text-secondary border border-outline-variant/40 px-2 py-0.5 rounded-full font-medium">
              Upcoming
            </span>
          </div>
        </div>
      </div>

      {/* MODAL 1: FILE UPLOAD (DRAG & DROP + BROWSE) */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-surface-container-lowest max-w-xl w-full max-h-[90vh] overflow-y-auto no-scrollbar rounded-xl p-5 sm:p-6 shadow-2xl border border-outline-variant/50 flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/30">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">upload_file</span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-on-surface">
                    Upload Project Documents
                  </h3>
                  <p className="text-xs text-secondary mt-0.5">
                    Select up to 5 documents to extract source-grounded findings.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-secondary hover:text-on-surface p-1 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Contextual Uploading Knowledge Trail State */}
            {isUploading && (
              <KnowledgeTrailLoader
                variant="section"
                message="Uploading your sources..."
                submessage="Parsing document structure, extracting text coordinates, and calculating cryptographic checksums..."
                step={1}
              />
            )}

            {/* Drag & Drop Zone */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2 text-center cursor-pointer transition-all ${dragActive
                  ? 'border-primary bg-primary/5 scale-[0.99]'
                  : 'border-outline-variant/60 hover:border-primary/50 bg-surface-container-low/30'
                }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.txt,.md,.markdown"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) {
                    handleFilesSelected(Array.from(e.target.files));
                  }
                }}
              />
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-[22px]">cloud_upload</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-on-surface">
                  Drag and drop documents here, or <span className="text-primary underline">browse</span>
                </span>
                <span className="text-[11px] text-secondary">
                  PDF (.pdf), Plain Text (.txt), Markdown (.md, .markdown) • Max 10 MB per file
                </span>
              </div>
            </div>

            {/* Selected Files List */}
            {selectedFiles.length > 0 && (
              <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                <span className="text-xs font-semibold text-on-surface">
                  Ready to process ({selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''}):
                </span>
                {selectedFiles.map((file, idx) => {
                  const isTooLarge = file.size > MAX_FILE_SIZE_BYTES;
                  const isUnsupported = !isAllowedFile(file.name);
                  const hasError = isTooLarge || isUnsupported;

                  return (
                    <div
                      key={idx}
                      className={`flex items-center justify-between p-2 rounded-lg text-xs border ${hasError
                          ? 'bg-error/10 border-error/30 text-on-surface'
                          : 'bg-surface-container-low border-outline-variant/30 text-on-surface'
                        }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="material-symbols-outlined text-[16px] text-primary">
                          {file.name.endsWith('.pdf') ? 'picture_as_pdf' : 'description'}
                        </span>
                        <span className="font-medium truncate max-w-xs">{file.name}</span>
                        <span className="text-secondary text-[11px]">({formatBytes(file.size)})</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {hasError ? (
                          <span className="text-error font-semibold text-[11px]">
                            {isTooLarge ? 'Exceeds 10MB' : 'Unsupported format'}
                          </span>
                        ) : (
                          <span className="text-success text-[11px] font-semibold">Valid</span>
                        )}
                        <button
                          type="button"
                          onClick={() => removeSelectedFile(idx)}
                          className="text-secondary hover:text-error p-0.5"
                        >
                          <span className="material-symbols-outlined text-[14px]">close</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Upload Results Feedback */}
            {uploadResults.length > 0 && (
              <div className="flex flex-col gap-1 text-xs">
                <span className="text-xs font-semibold text-on-surface">
                  Processing Results:
                </span>
                {uploadResults.map((res, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between p-2 rounded-lg border ${res.success
                        ? 'bg-success/10 border-success/20 text-on-surface'
                        : 'bg-error/10 border-error/30 text-on-surface'
                      }`}
                  >
                    <span className="font-medium truncate">{res.filename}</span>
                    <span
                      className={`font-semibold text-[11px] flex items-center gap-1 ${res.success ? 'text-success' : 'text-error'
                        }`}
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {res.success ? 'check_circle' : 'error'}
                      </span>
                      {res.success
                        ? res.pageCount
                          ? `Processed (${res.pageCount} pages)`
                          : `Processed (${res.lineCount} lines)`
                        : res.error}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-outline-variant/30">
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="px-3.5 h-8 rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container transition-colors font-medium text-xs border border-outline-variant/40"
              >
                {uploadResults.length > 0 ? 'Done' : 'Cancel'}
              </button>
              {selectedFiles.length > 0 && (
                <button
                  type="button"
                  onClick={handleUploadSubmit}
                  disabled={isUploading || selectedFiles.some((f) => f.size > MAX_FILE_SIZE_BYTES || !isAllowedFile(f.name))}
                  className="px-4 h-8 rounded-lg bg-primary text-on-primary hover:bg-primary-hover font-medium transition-colors shadow-xs flex items-center gap-1.5 text-xs disabled:opacity-60"
                >
                  {isUploading ? (
                    <>
                      <KnowledgeTrailLoader variant="inline" message="Processing..." />
                      <span>Extracting...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[15px]">upload</span>
                      <span>Process &amp; Ingest ({selectedFiles.length})</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: PASTE RAW NOTES */}
      {showPasteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-surface-container-lowest max-w-xl w-full max-h-[90vh] overflow-y-auto no-scrollbar rounded-xl p-5 sm:p-6 shadow-2xl border border-outline-variant/50 flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/30">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">edit_note</span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-on-surface">
                    Paste Handover Notes
                  </h3>
                  <p className="text-xs text-secondary mt-0.5">
                    Add raw meeting minutes, architecture notes, or chat discussions.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPasteModal(false)}
                className="text-secondary hover:text-on-surface p-1 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <form onSubmit={handlePasteSubmit} className="flex flex-col gap-3.5 text-xs">
              <div>
                <label className="text-xs text-on-surface font-semibold block mb-1">
                  Document Title
                </label>
                <input
                  type="text"
                  required
                  value={newSourceName}
                  onChange={(e) => setNewSourceName(e.target.value)}
                  placeholder="e.g. SRE-Runbook-Failover.md or Architecture Notes"
                  className="w-full px-3 h-8 bg-surface-container-low rounded-lg border border-outline-variant/40 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-on-surface font-semibold block mb-1">
                    Category
                  </label>
                  <select
                    value={newSourceType}
                    onChange={(e) => setNewSourceType(e.target.value as ProjectSource['type'])}
                    className="w-full px-3 h-8 bg-surface-container-low rounded-lg border border-outline-variant/40 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                  >
                    <option value="notes">Meeting / Handover Notes</option>
                    <option value="docs">Markdown Documentation</option>
                    <option value="github">Git Commit / PR Log</option>
                    <option value="slack">Chat Channel Transcript</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-on-surface font-semibold block mb-1">
                    Summary / Description
                  </label>
                  <input
                    type="text"
                    value={newSourceDesc}
                    onChange={(e) => setNewSourceDesc(e.target.value)}
                    placeholder="Short description of this note"
                    className="w-full px-3 h-8 bg-surface-container-low rounded-lg border border-outline-variant/40 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-on-surface font-semibold block mb-1">
                  Content / Document Text
                </label>
                <textarea
                  required
                  rows={6}
                  value={newSourceContent}
                  onChange={(e) => setNewSourceContent(e.target.value)}
                  placeholder="Paste Markdown document, PR decision context, or architecture notes here..."
                  className="w-full p-3 bg-surface-container-low rounded-lg border border-outline-variant/40 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary font-mono text-xs resize-none"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-outline-variant/30 mt-1">
                <button
                  type="button"
                  onClick={() => setShowPasteModal(false)}
                  className="px-3.5 h-8 rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container transition-colors font-medium border border-outline-variant/40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPasting}
                  className="px-4 h-8 rounded-lg bg-primary text-on-primary hover:bg-primary-hover font-medium transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-60"
                >
                  <span className="material-symbols-outlined text-[15px]">save</span>
                  <span>{isPasting ? 'Saving...' : 'Save Notes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: INSPECT EXTRACTED TEXT */}
      {inspectSource && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-surface-container-lowest max-w-2xl w-full max-h-[85vh] overflow-y-auto no-scrollbar rounded-xl p-5 sm:p-6 shadow-2xl border border-outline-variant/50 flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant/30">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[18px]">
                    {inspectSource.documentData?.fileFormat === 'pdf' ? 'picture_as_pdf' : 'description'}
                  </span>
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-on-surface truncate max-w-xs sm:max-w-md">
                    {inspectSource.name}
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-secondary font-mono flex-wrap">
                    <span>Format: {inspectSource.documentData?.fileFormat?.toUpperCase()}</span>
                    <span>•</span>
                    <span>Size: {inspectSource.documentData?.fileSizeFormatted}</span>
                    {inspectSource.documentData?.pageCount && (
                      <>
                        <span>•</span>
                        <span>{inspectSource.documentData.pageCount} pages</span>
                      </>
                    )}
                    {inspectSource.documentData?.lineCount && (
                      <>
                        <span>•</span>
                        <span>{inspectSource.documentData.lineCount} lines</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setInspectSource(null)}
                className="text-secondary hover:text-on-surface p-1 rounded-lg shrink-0 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Content Hash & Security Clearance */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 bg-surface-container-low p-2 rounded-lg text-xs font-mono text-secondary">
              <span className="truncate min-w-0 flex-1 break-all">
                SHA-256: {inspectSource.documentData?.contentHash || 'N/A'}
              </span>
              <span className="text-primary font-semibold shrink-0">Deterministic Ingestion</span>
            </div>

            {/* Extracted Text Body */}
            <div className="flex-1 overflow-y-auto bg-surface-container-low/30 p-3 rounded-lg border border-outline-variant/30 font-mono text-xs text-on-surface whitespace-pre-wrap leading-relaxed max-h-[50vh]">
              {inspectSource.documentData?.extractedText || 'No text content available.'}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-outline-variant/30">
              <button
                type="button"
                onClick={() => {
                  if (inspectSource.documentData?.extractedText) {
                    navigator.clipboard.writeText(inspectSource.documentData.extractedText);
                  }
                }}
                className="px-3 h-8 rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container transition-colors font-medium text-xs flex items-center gap-1 border border-outline-variant/40"
              >
                <span className="material-symbols-outlined text-[14px]">content_copy</span>
                <span>Copy Extracted Text</span>
              </button>

              <button
                type="button"
                onClick={() => setInspectSource(null)}
                className="px-3.5 h-8 rounded-lg bg-primary text-on-primary hover:bg-primary-hover font-medium text-xs shadow-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: CONFIRM DELETE SOURCE */}
      {deleteConfirmSource && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-surface-container-lowest max-w-md w-full max-h-[90vh] overflow-y-auto no-scrollbar rounded-xl p-5 sm:p-6 shadow-2xl border border-outline-variant/50 flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-error/10 text-error flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">delete_forever</span>
              </div>
              <div className="flex flex-col">
                <h3 className="text-sm font-semibold text-on-surface">
                  Remove Document?
                </h3>
                <p className="text-xs text-secondary mt-0.5">
                  Are you sure you want to remove &quot;{deleteConfirmSource.name}&quot; from this workspace?
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-outline-variant/30">
              <button
                type="button"
                onClick={() => setDeleteConfirmSource(null)}
                className="px-3.5 h-8 rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container transition-colors font-medium text-xs border border-outline-variant/40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const id = deleteConfirmSource.id;
                  setDeleteConfirmSource(null);
                  await deleteSource(id);
                }}
                className="px-3.5 h-8 rounded-lg bg-error text-white hover:bg-error/90 font-medium transition-colors text-xs shadow-xs"
              >
                Confirm Removal
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL 5: CONNECT GITHUB MODAL */}
      <ConnectGitHubModal
        isOpen={showGitHubModal}
        onClose={() => setShowGitHubModal(false)}
        onOpenQnA={(integ) => setQnaModalRepo(integ)}
        onSuccess={() => {
          setShowGitHubModal(false);
          setSyncFeedback({
            repoId: 0,
            success: true,
            message: 'Repository connected and codebase ingested successfully with full source grounding.',
          });
        }}
      />

      {/* MODAL 5B: CODEBASE INTELLIGENCE & QNA MODAL */}
      <CodebaseQnAModal
        isOpen={Boolean(qnaModalRepo)}
        onClose={() => setQnaModalRepo(null)}
        integration={qnaModalRepo}
      />

      {/* MODAL 6: CONFIRM DISCONNECT GITHUB REPOSITORY */}
      {disconnectConfirmRepo && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-surface-container-lowest max-w-md w-full max-h-[90vh] overflow-y-auto no-scrollbar rounded-xl p-5 sm:p-6 shadow-2xl border border-outline-variant/50 flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-error/10 text-error flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px]">link_off</span>
              </div>
              <div className="flex flex-col">
                <h3 className="text-sm font-semibold text-on-surface">
                  Disconnect Repository?
                </h3>
                <p className="text-xs text-secondary mt-0.5">
                  Are you sure you want to disconnect &quot;{disconnectConfirmRepo.repoOwner}/{disconnectConfirmRepo.repoName}&quot;? Associated ingested source documents will be cleaned up.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-outline-variant/30">
              <button
                type="button"
                onClick={() => setDisconnectConfirmRepo(null)}
                className="px-3.5 h-8 rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container transition-colors font-medium text-xs border border-outline-variant/40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const repoId = disconnectConfirmRepo.repoId;
                  setDisconnectConfirmRepo(null);
                  const res = await disconnectGitHubRepo(repoId);
                  if (res.success) {
                    setSyncFeedback({
                      repoId,
                      success: true,
                      message: 'GitHub repository disconnected successfully.',
                    });
                  } else {
                    setSyncFeedback({
                      repoId,
                      success: false,
                      message: res.error || 'Failed to disconnect repository.',
                    });
                  }
                }}
                className="px-3.5 h-8 rounded-lg bg-error text-white hover:bg-error/90 font-medium transition-colors text-xs shadow-xs"
              >
                Confirm Disconnect
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Continuous Update Activity History Drawer */}
      <UpdateHistoryDrawer
        isOpen={Boolean(selectedHistoryRepo)}
        onClose={() => setSelectedHistoryRepo(null)}
        integration={selectedHistoryRepo}
        workspaceId={workspaceId}
        currentUserRole={currentUserRole}
      />
    </div>
  );
}
