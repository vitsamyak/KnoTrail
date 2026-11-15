'use client';

import React, { useState, useRef } from 'react';
import { useProject } from '../../context/ProjectContext';
import { ProjectSource, GitHubIntegration } from '../../lib/types';
import { formatBytes, isAllowedFile, MAX_FILE_SIZE_BYTES, MAX_FILES_PER_BATCH } from '../../server/documents/extractor';
import { KnowledgeTrailLoader } from '../ui/KnowledgeTrailLoader';
import { ConnectGitHubModal } from '../modals/ConnectGitHubModal';
import { UpdateHistoryDrawer } from '../modals/UpdateHistoryDrawer';

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
            <span className="text-primary font-semibold">Sources</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-on-surface tracking-tight mt-1">
            Project Documents &amp; Sources
          </h1>
          <p className="text-xs sm:text-sm text-secondary mt-0.5 leading-relaxed">
            Ingest PDF, Markdown, and text specifications. KnoTrail indexes line ranges and page coordinates to anchor all findings to immutable evidence.
          </p>
        </div>

        {/* Action Group */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto shrink-0">
          <button
            onClick={() => {
              if (currentUserRole === 'EXTERNAL') return;
              setSelectedFiles([]);
              setUploadResults([]);
              setShowUploadModal(true);
            }}
            disabled={currentUserRole === 'EXTERNAL'}
            title={currentUserRole === 'EXTERNAL' ? 'Read-only access: External members cannot upload documents' : undefined}
            className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 h-9 rounded-lg text-xs font-medium shadow-xs transition-colors ${
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
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 h-9 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-medium border border-outline-variant/40 transition-colors"
          >
            <span className="material-symbols-outlined text-[17px] text-primary">
              {currentUserRole === 'EXTERNAL' ? 'lock' : 'hub'}
            </span>
            <span>Connect GitHub</span>
          </button>

          <button
            onClick={() => {
              if (currentUserRole === 'EXTERNAL') return;
              setShowPasteModal(true);
            }}
            disabled={currentUserRole === 'EXTERNAL'}
            title={currentUserRole === 'EXTERNAL' ? 'Read-only access: External members cannot add source notes' : undefined}
            className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 h-9 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-medium border border-outline-variant/40 transition-colors ${
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
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 h-9 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-medium border border-outline-variant/40 transition-colors disabled:opacity-60"
          >
            <span className={`material-symbols-outlined text-[17px] text-primary ${isSyncing ? 'animate-spin' : ''}`}>
              sync
            </span>
            <span>{isSyncing ? 'Syncing...' : 'Sync Workspace'}</span>
          </button>
        </div>
      </div>

      {/* CONNECTED GITHUB REPOSITORIES SECTION */}
      <div className="bg-surface-container-lowest rounded-xl p-5 sm:p-6 border border-outline-variant/40 shadow-xs flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px]">hub</span>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-on-surface flex items-center gap-2">
                <span>Connected GitHub Repositories</span>
                <span className="px-2 py-0.5 rounded-full bg-surface-container-low text-primary text-[11px] font-mono font-bold">
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
            className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg bg-primary hover:bg-primary-hover text-on-primary text-xs font-medium shadow-xs transition-colors self-start sm:self-auto"
          >
            <span className="material-symbols-outlined text-[15px]">add</span>
            <span>Add Repository</span>
          </button>
        </div>

        {/* Sync Feedback Toast / Banner */}
        {syncFeedback && (
          <div
            className={`p-3 rounded-lg border text-xs flex items-center justify-between gap-2 animate-in fade-in duration-150 ${
              syncFeedback.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
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
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-amber-700 shrink-0">warning</span>
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

              return (
                <div
                  key={integ.id}
                  className="bg-surface-container-low/40 rounded-xl p-4 border border-outline-variant/40 flex flex-col justify-between hover:border-outline-variant/70 transition-all gap-3"
                >
                  <div>
                    {/* Top Row: Owner/Repo & Status Badge */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="material-symbols-outlined text-primary text-[20px] shrink-0">folder_git</span>
                        <div className="min-w-0">
                          <h3 className="text-xs font-bold text-on-surface truncate font-mono" title={`${integ.repoOwner}/${integ.repoName}`}>
                            {integ.repoOwner}/{integ.repoName}
                          </h3>
                          <div className="flex items-center gap-1.5 text-[10px] text-secondary mt-0.5">
                            <span className="bg-surface-container px-1.5 py-0.2 rounded font-mono font-medium">
                              branch: {integ.selectedBranch || integ.defaultBranch}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border border-outline-variant/30 shrink-0">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            integ.syncStatus === 'synced'
                              ? 'bg-emerald-600'
                              : integ.syncStatus === 'syncing' || isCurrentlySyncing
                              ? 'bg-primary animate-pulse'
                              : integ.syncStatus === 'error'
                              ? 'bg-error'
                              : 'bg-secondary'
                          }`}
                        ></span>
                        <span className="capitalize text-secondary">
                          {isCurrentlySyncing ? 'Syncing...' : integ.syncStatus}
                        </span>
                      </div>
                    </div>

                    {/* Scope Badges */}
                    <div className="flex items-center gap-1 flex-wrap text-[10px] text-secondary mb-2">
                      {integ.config.includeCommits && (
                        <span className="px-1.5 py-0.2 rounded bg-surface-container font-mono">commits</span>
                      )}
                      {integ.config.includePullRequests && (
                        <span className="px-1.5 py-0.2 rounded bg-surface-container font-mono">PRs</span>
                      )}
                      {integ.config.includeIssues && (
                        <span className="px-1.5 py-0.2 rounded bg-surface-container font-mono">issues</span>
                      )}
                      {integ.config.includeDocs && (
                        <span className="px-1.5 py-0.2 rounded bg-surface-container font-mono">docs</span>
                      )}
                    </div>

                    {/* Telemetry info */}
                    <div className="text-[11px] text-secondary flex flex-col gap-0.5 font-mono">
                      {integ.lastCommitSha && (
                        <span className="truncate">
                          Latest SHA: <strong className="text-primary">{integ.lastCommitSha.slice(0, 7)}</strong>
                        </span>
                      )}
                      <span>
                        Last Synced: {integ.lastSyncedAt ? new Date(integ.lastSyncedAt).toLocaleTimeString() : 'Never'}
                      </span>
                      {matchingSource && (
                        <span className="text-primary font-semibold">
                          {matchingSource.recordCount} records indexed
                        </span>
                      )}
                      {integ.errorMessage && (
                        <span className="text-error text-[10px] line-clamp-1" title={integ.errorMessage}>
                          Error: {integ.errorMessage}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bottom Actions */}
                  <div className="pt-2 border-t border-outline-variant/30 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
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
                        className="inline-flex items-center gap-1 text-primary hover:text-primary-hover font-semibold text-[11px] disabled:opacity-50 transition-colors"
                        title="Synchronize repository context"
                      >
                        <span className={`material-symbols-outlined text-[14px] ${isCurrentlySyncing ? 'animate-spin' : ''}`}>
                          sync
                        </span>
                        <span>{isCurrentlySyncing ? 'Syncing...' : 'Sync Now'}</span>
                      </button>

                      <button
                        onClick={() => setSelectedHistoryRepo(integ)}
                        className="inline-flex items-center gap-1 text-secondary hover:text-on-surface font-medium text-[11px] transition-colors"
                        title="View continuous update activity history"
                      >
                        <span className="material-symbols-outlined text-[14px]">history</span>
                        <span>Activity</span>
                      </button>
                    </div>

                    {currentUserRole === 'MANAGER' && (
                      <button
                        onClick={() => setDisconnectConfirmRepo(integ)}
                        disabled={isCurrentlySyncing || isGitHubLoading}
                        className="text-error/70 hover:text-error hover:underline text-[11px] font-medium transition-colors"
                        title="Disconnect repository"
                      >
                        Disconnect
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 bg-surface-container-low/40 rounded-xl border border-dashed border-outline-variant/50 text-center flex flex-col items-center justify-center gap-1.5 py-6">
            <span className="material-symbols-outlined text-secondary text-[24px]">hub</span>
            <span className="text-xs font-semibold text-on-surface">No GitHub repositories connected yet</span>
            <p className="text-[11px] text-secondary max-w-sm leading-relaxed">
              Connect public GitHub repositories to automatically index commit history, pull request debates, and issues with full cryptographic evidence citations.
            </p>
            <button
              onClick={() => setShowGitHubModal(true)}
              className="mt-1 inline-flex items-center gap-1.5 px-3 h-7 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary font-medium text-xs border border-outline-variant/40 transition-colors"
            >
              <span className="material-symbols-outlined text-[14px]">add_link</span>
              <span>Connect Sample Repository</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter Tabs & Privacy Guarantee */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-container-low/50 rounded-xl p-3.5 border border-outline-variant/30">
        <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-lg border border-outline-variant/30 text-xs">
          <button
            onClick={() => setSourceFilter('ALL')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
              sourceFilter === 'ALL'
                ? 'bg-surface-container-lowest text-primary shadow-xs font-semibold'
                : 'text-secondary hover:text-on-surface'
            }`}
          >
            All Sources ({project.sources.length})
          </button>
          <button
            onClick={() => setSourceFilter('UPLOADED')}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
              sourceFilter === 'UPLOADED'
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
            className={`bg-surface-container-lowest rounded-xl p-5 shadow-xs border flex flex-col justify-between hover:border-outline-variant/70 transition-all group ${
              source.isUploaded
                ? 'border-primary/30'
                : 'border-outline-variant/40'
            }`}
          >
            <div>
              {/* Card Top: Icon, Type, Status */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                      source.isUploaded
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
                    className={`w-1.5 h-1.5 rounded-full ${
                      source.status === 'error'
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
              className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2 text-center cursor-pointer transition-all ${
                dragActive
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
                      className={`flex items-center justify-between p-2 rounded-lg text-xs border ${
                        hasError
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
                    className={`flex items-center justify-between p-2 rounded-lg border ${
                      res.success
                        ? 'bg-success/10 border-success/20 text-on-surface'
                        : 'bg-error/10 border-error/30 text-on-surface'
                    }`}
                  >
                    <span className="font-medium truncate">{res.filename}</span>
                    <span
                      className={`font-semibold text-[11px] flex items-center gap-1 ${
                        res.success ? 'text-success' : 'text-error'
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
        onSuccess={() => {
          setShowGitHubModal(false);
          setSyncFeedback({
            repoId: 0,
            success: true,
            message: 'Repository connected successfully. Use "Sync Now" to index activity.',
          });
        }}
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
