'use client';

import React, { useState, useRef } from 'react';
import { useProject } from '../../context/ProjectContext';
import { ProjectSource } from '../../lib/types';
import { formatBytes, isAllowedFile, MAX_FILE_SIZE_BYTES, MAX_FILES_PER_BATCH } from '../../server/documents/extractor';
import { KnowledgeTrailLoader } from '../ui/KnowledgeTrailLoader';

export function SourceManagerView() {
  const { project, addSource, uploadSources, deleteSource, runAiSync, isSyncing, setActiveView } = useProject();

  // Modal states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
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
    // Limit to max 5 files
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
      // Clear selected files on successful processing
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
        description: newSourceDesc.trim() || 'Custom operational handover document ingested during session.',
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
  const notesCount = project.sources.filter((s) => !s.isUploaded || s.type === 'notes').length;

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
            <span className="text-primary font-semibold">Sources</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight mt-1">
            Project Documents &amp; Sources
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
            Upload PDF, Markdown, and text project documentation. Extracted text is grounded with exact line and page numbers.
          </p>
        </div>

        {/* Action Group */}
        <div className="flex items-center gap-space-xs flex-wrap">
          <button
            onClick={() => {
              setSelectedFiles([]);
              setUploadResults([]);
              setShowUploadModal(true);
            }}
            className="inline-flex items-center gap-2 px-space-md py-2 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md shadow-sm transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">upload_file</span>
            <span>Upload Documents</span>
          </button>

          <button
            onClick={() => setShowPasteModal(true)}
            className="inline-flex items-center gap-2 px-space-md py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md border border-outline-variant/30 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">edit_note</span>
            <span>Paste Notes</span>
          </button>

          <button
            onClick={() => runAiSync()}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 px-space-md py-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-label-md border border-outline-variant/30 transition-all disabled:opacity-60"
          >
            <span className={`material-symbols-outlined text-[18px] text-primary ${isSyncing ? 'animate-spin' : ''}`}>
              sync
            </span>
            <span>{isSyncing ? 'Syncing...' : 'Sync Workspace'}</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Privacy Guarantee */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm bg-surface-container-low rounded-xl p-space-md border border-outline-variant/30">
        <div className="flex items-center gap-1 bg-surface-container p-1 rounded-lg border border-outline-variant/30 text-xs">
          <button
            onClick={() => setSourceFilter('ALL')}
            className={`px-3 py-1 rounded-md font-semibold transition-all ${
              sourceFilter === 'ALL'
                ? 'bg-surface-container-lowest text-primary shadow-xs'
                : 'text-outline hover:text-on-surface'
            }`}
          >
            All Sources ({project.sources.length})
          </button>
          <button
            onClick={() => setSourceFilter('UPLOADED')}
            className={`px-3 py-1 rounded-md font-semibold transition-all ${
              sourceFilter === 'UPLOADED'
                ? 'bg-surface-container-lowest text-primary shadow-xs'
                : 'text-outline hover:text-on-surface'
            }`}
          >
            Uploaded Documents ({uploadedCount})
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-outline">
          <span className="material-symbols-outlined text-[16px] text-primary">verified_user</span>
          <span>Zero-Auth Invariant: Uploaded files isolated in private session workspace.</span>
        </div>
      </div>

      {/* Active Sources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-md">
        {filteredSources.map((source) => (
          <div
            key={source.id}
            className={`bg-surface-container-lowest rounded-xl p-space-lg shadow-sm border flex flex-col justify-between hover:shadow-md transition-all group ${
              source.isUploaded
                ? 'border-primary/40 bg-gradient-to-b from-surface-container-lowest to-surface-container-low/40'
                : 'border-outline-variant/30'
            }`}
          >
            <div>
              {/* Card Top: Icon, Type, Status */}
              <div className="flex items-center justify-between mb-space-sm">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                      source.isUploaded
                        ? 'bg-primary-container text-on-primary-container'
                        : 'bg-surface-container-low text-primary group-hover:bg-primary-fixed'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">{source.icon}</span>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-semibold font-mono">
                        {source.documentData?.fileFormat ? source.documentData.fileFormat.toUpperCase() : source.type}
                      </span>
                      {source.isUploaded && (
                        <span className="px-1.5 py-0.2 bg-secondary-container text-on-secondary-container rounded text-[10px] font-semibold">
                          Uploaded
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-outline">{source.lastSync}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 bg-surface-container-low px-2 py-0.5 rounded-full border border-outline-variant/20">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      source.status === 'error'
                        ? 'bg-error'
                        : source.documentData?.isScannedPdf
                        ? 'bg-tertiary'
                        : 'bg-primary animate-pulse'
                    }`}
                  ></span>
                  <span className="text-[11px] font-semibold text-primary capitalize">
                    {source.documentData?.isScannedPdf ? 'Scanned PDF' : source.status}
                  </span>
                </div>
              </div>

              {/* Source Name & Description */}
              <h3 className="font-headline-sm text-headline-sm text-on-surface group-hover:text-primary transition-colors truncate" title={source.name}>
                {source.name}
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 leading-relaxed line-clamp-2">
                {source.description}
              </p>
            </div>

            {/* Card Bottom: Records count & Actions */}
            <div className="mt-space-md pt-space-xs border-t border-outline-variant/20 flex items-center justify-between text-xs">
              <span className="text-outline font-medium">
                {source.documentData?.pageCount
                  ? `${source.documentData.pageCount} pages (${source.documentData.fileSizeFormatted})`
                  : source.documentData?.lineCount
                  ? `${source.documentData.lineCount} lines (${source.documentData.fileSizeFormatted})`
                  : `${source.recordCount.toLocaleString()} records indexed`}
              </span>

              <div className="flex items-center gap-2">
                {source.documentData?.extractedText && (
                  <button
                    onClick={() => setInspectSource(source)}
                    className="text-primary hover:underline font-semibold flex items-center gap-1"
                    title="Inspect Extracted Content"
                  >
                    <span>Inspect</span>
                    <span className="material-symbols-outlined text-[14px]">visibility</span>
                  </button>
                )}

                {source.isUploaded && (
                  <button
                    onClick={() => setDeleteConfirmSource(source)}
                    className="text-error/80 hover:text-error hover:underline font-medium flex items-center gap-0.5"
                    title="Remove Uploaded Document"
                  >
                    <span className="material-symbols-outlined text-[14px]">delete</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredSources.length === 0 && (
        <div className="bg-surface-container-lowest p-space-2xl rounded-xl border border-outline-variant/30 text-center flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-surface-container-low text-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-[28px]">upload_file</span>
          </div>
          <h4 className="font-headline-sm text-headline-sm text-on-surface">No project documents uploaded yet.</h4>
          <p className="text-xs text-on-surface-variant max-w-md leading-relaxed">
            Upload your team&apos;s architecture documents, runbooks, or specifications in PDF, Markdown (.md), or plain text (.txt) format to begin extracting decisions, tasks, and risks.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
            <button
              onClick={() => {
                setSelectedFiles([]);
                setUploadResults([]);
                setShowUploadModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary hover:bg-primary-container text-on-primary text-xs font-semibold shadow-sm transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
              <span>Upload PDF</span>
            </button>
            <button
              onClick={() => {
                setSelectedFiles([]);
                setUploadResults([]);
                setShowUploadModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold border border-outline-variant/30 transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">description</span>
              <span>Upload TXT</span>
            </button>
            <button
              onClick={() => {
                setSelectedFiles([]);
                setUploadResults([]);
                setShowUploadModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold border border-outline-variant/30 transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">markdown</span>
              <span>Upload Markdown</span>
            </button>
            <button
              onClick={() => setShowPasteModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold border border-outline-variant/30 transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">edit_note</span>
              <span>Add Project Notes</span>
            </button>
          </div>
        </div>
      )}

      {/* SUPPORTED & UPCOMING CONNECTORS */}
      <div className="bg-surface-container-lowest rounded-xl p-space-lg border border-outline-variant/30 shadow-xs flex flex-col gap-space-md">
        <div>
          <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
            Integrations &amp; File Formats
          </h3>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Operational formats are processed locally on server. Cloud connectors are in active development.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-space-sm">
          {/* Active 1: PDF */}
          <div className="p-space-sm bg-surface-container-low/70 rounded-lg border border-primary/30 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-primary text-[22px]">picture_as_pdf</span>
              <div>
                <p className="font-label-md text-label-md text-on-surface font-semibold">PDF Documents</p>
                <p className="text-[11px] text-outline">.pdf (Page coordinates tracked)</p>
              </div>
            </div>
            <span className="text-[10px] bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-full font-bold">
              Active
            </span>
          </div>

          {/* Active 2: Markdown */}
          <div className="p-space-sm bg-surface-container-low/70 rounded-lg border border-primary/30 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-primary text-[22px]">markdown</span>
              <div>
                <p className="font-label-md text-label-md text-on-surface font-semibold">Markdown Documents</p>
                <p className="text-[11px] text-outline">.md, .markdown (Headings preserved)</p>
              </div>
            </div>
            <span className="text-[10px] bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-full font-bold">
              Active
            </span>
          </div>

          {/* Active 3: Plain Text */}
          <div className="p-space-sm bg-surface-container-low/70 rounded-lg border border-primary/30 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-primary text-[22px]">description</span>
              <div>
                <p className="font-label-md text-label-md text-on-surface font-semibold">Plain Text Notes</p>
                <p className="text-[11px] text-outline">.txt (Line numbers preserved)</p>
              </div>
            </div>
            <span className="text-[10px] bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-full font-bold">
              Active
            </span>
          </div>

          {/* Upcoming 1: GitHub */}
          <div className="p-space-sm bg-surface-container-low/40 rounded-lg border border-outline-variant/20 flex items-center justify-between opacity-70">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-outline text-[22px]">commit</span>
              <div>
                <p className="font-label-md text-label-md text-on-surface font-medium">GitHub Repositories</p>
                <p className="text-[11px] text-outline">Commits, PRs, diffs</p>
              </div>
            </div>
            <span className="text-[10px] bg-surface-container text-outline px-2 py-0.5 rounded-full font-medium">
              Coming Soon
            </span>
          </div>

          {/* Upcoming 2: Slack */}
          <div className="p-space-sm bg-surface-container-low/40 rounded-lg border border-outline-variant/20 flex items-center justify-between opacity-70">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-outline text-[22px]">forum</span>
              <div>
                <p className="font-label-md text-label-md text-on-surface font-medium">Slack Discussions</p>
                <p className="text-[11px] text-outline">Channel threads &amp; alerts</p>
              </div>
            </div>
            <span className="text-[10px] bg-surface-container text-outline px-2 py-0.5 rounded-full font-medium">
              Coming Soon
            </span>
          </div>

          {/* Upcoming 3: Notion / Linear */}
          <div className="p-space-sm bg-surface-container-low/40 rounded-lg border border-outline-variant/20 flex items-center justify-between opacity-70">
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-outline text-[22px]">check_box</span>
              <div>
                <p className="font-label-md text-label-md text-on-surface font-medium">Notion &amp; Linear</p>
                <p className="text-[11px] text-outline">Wikis, tasks &amp; epics</p>
              </div>
            </div>
            <span className="text-[10px] bg-surface-container text-outline px-2 py-0.5 rounded-full font-medium">
              Coming Soon
            </span>
          </div>
        </div>
      </div>

      {/* MODAL 1: FILE UPLOAD (DRAG & DROP + BROWSE) */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-inverse-surface/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest max-w-xl w-full rounded-2xl p-space-xl shadow-2xl border border-outline-variant/40 flex flex-col gap-space-md">
            <div className="flex items-center justify-between pb-space-xs border-b border-outline-variant/30">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary-fixed text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">upload_file</span>
                </div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface">
                  Upload Project Documents
                </h3>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-outline hover:text-on-surface p-1 rounded-lg"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
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
              className={`border-2 border-dashed rounded-xl p-space-xl flex flex-col items-center justify-center gap-2 text-center cursor-pointer transition-all ${
                dragActive
                  ? 'border-primary bg-primary-container/20 scale-[0.99]'
                  : 'border-outline-variant/60 hover:border-primary/60 bg-surface-container-low/50'
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
              <div className="w-12 h-12 rounded-full bg-primary-fixed text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-[24px]">cloud_upload</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-label-md text-label-md font-semibold text-on-surface">
                  Drag and drop documents here, or <span className="text-primary underline">browse</span>
                </span>
                <span className="text-[11px] text-outline">
                  Supported: PDF (.pdf), Plain Text (.txt), Markdown (.md, .markdown) • Max 10 MB per file • Max 5 files
                </span>
              </div>
            </div>

            {/* Selected Files List */}
            {selectedFiles.length > 0 && (
              <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                <span className="font-label-sm text-label-sm font-semibold text-on-surface">
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
                          ? 'bg-error-container/20 border-error/40 text-on-surface'
                          : 'bg-surface-container-low border-outline-variant/30 text-on-surface'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="material-symbols-outlined text-[16px] text-primary">
                          {file.name.endsWith('.pdf') ? 'picture_as_pdf' : 'description'}
                        </span>
                        <span className="font-medium truncate max-w-xs">{file.name}</span>
                        <span className="text-outline text-[11px]">({formatBytes(file.size)})</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {hasError ? (
                          <span className="text-error font-semibold text-[11px]">
                            {isTooLarge ? 'Exceeds 10MB' : 'Unsupported format'}
                          </span>
                        ) : (
                          <span className="text-primary text-[11px] font-semibold">Valid</span>
                        )}
                        <button
                          type="button"
                          onClick={() => removeSelectedFile(idx)}
                          className="text-outline hover:text-error p-0.5"
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
                <span className="font-label-sm text-label-sm font-semibold text-on-surface">
                  Processing Results:
                </span>
                {uploadResults.map((res, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between p-2 rounded-lg border ${
                      res.success
                        ? 'bg-primary-container/20 border-primary/30 text-on-surface'
                        : 'bg-error-container/20 border-error/40 text-on-surface'
                    }`}
                  >
                    <span className="font-medium truncate">{res.filename}</span>
                    <span
                      className={`font-semibold text-[11px] flex items-center gap-1 ${
                        res.success ? 'text-primary' : 'text-error'
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
            <div className="flex items-center justify-end gap-2 pt-space-xs border-t border-outline-variant/30">
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors font-medium text-xs"
              >
                {uploadResults.length > 0 ? 'Done' : 'Cancel'}
              </button>
              {selectedFiles.length > 0 && (
                <button
                  type="button"
                  onClick={handleUploadSubmit}
                  disabled={isUploading || selectedFiles.some((f) => f.size > MAX_FILE_SIZE_BYTES || !isAllowedFile(f.name))}
                  className="px-5 py-2 rounded-lg bg-primary text-on-primary hover:bg-primary-container font-semibold transition-all shadow-sm flex items-center gap-2 text-xs disabled:opacity-60"
                >
                  {isUploading ? (
                    <>
                      <KnowledgeTrailLoader variant="inline" message="Uploading and extracting..." />
                      <span>Extracting Text & Coordinates...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">upload</span>
                      <span>Process & Ingest ({selectedFiles.length})</span>
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
        <div className="fixed inset-0 bg-inverse-surface/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest max-w-xl w-full rounded-2xl p-space-xl shadow-2xl border border-outline-variant/40 flex flex-col gap-space-md">
            <div className="flex items-center justify-between pb-space-xs border-b border-outline-variant/30">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary-fixed text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">edit_note</span>
                </div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface">
                  Paste Handover Notes
                </h3>
              </div>
              <button
                onClick={() => setShowPasteModal(false)}
                className="text-outline hover:text-on-surface p-1 rounded-lg"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handlePasteSubmit} className="flex flex-col gap-space-sm text-xs">
              <div>
                <label className="font-label-sm text-on-surface font-semibold block mb-1">
                  Document Title
                </label>
                <input
                  type="text"
                  required
                  value={newSourceName}
                  onChange={(e) => setNewSourceName(e.target.value)}
                  placeholder="e.g. SRE-Runbook-Failover.md or Architecture Notes"
                  className="w-full px-3 py-2 bg-surface-container-low rounded-lg border border-outline-variant/30 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-label-sm text-on-surface font-semibold block mb-1">
                    Category
                  </label>
                  <select
                    value={newSourceType}
                    onChange={(e) => setNewSourceType(e.target.value as ProjectSource['type'])}
                    className="w-full px-3 py-2 bg-surface-container-low rounded-lg border border-outline-variant/30 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                  >
                    <option value="notes">Meeting / Handover Notes</option>
                    <option value="docs">Markdown Documentation</option>
                    <option value="github">Git Commit / PR Log</option>
                    <option value="slack">Chat Channel Transcript</option>
                  </select>
                </div>

                <div>
                  <label className="font-label-sm text-on-surface font-semibold block mb-1">
                    Summary / Description
                  </label>
                  <input
                    type="text"
                    value={newSourceDesc}
                    onChange={(e) => setNewSourceDesc(e.target.value)}
                    placeholder="Short description of this note"
                    className="w-full px-3 py-2 bg-surface-container-low rounded-lg border border-outline-variant/30 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="font-label-sm text-on-surface font-semibold block mb-1">
                  Content / Document Text
                </label>
                <textarea
                  required
                  rows={6}
                  value={newSourceContent}
                  onChange={(e) => setNewSourceContent(e.target.value)}
                  placeholder="Paste Markdown document, PR decision context, or architecture notes here..."
                  className="w-full px-3 py-2 bg-surface-container-low rounded-lg border border-outline-variant/30 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary font-mono text-xs resize-none"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-space-xs border-t border-outline-variant/30 mt-2">
                <button
                  type="button"
                  onClick={() => setShowPasteModal(false)}
                  className="px-4 py-2 rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPasting}
                  className="px-5 py-2 rounded-lg bg-primary text-on-primary hover:bg-primary-container font-semibold transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-60"
                >
                  <span className="material-symbols-outlined text-[16px]">save</span>
                  <span>{isPasting ? 'Saving...' : 'Save Notes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: INSPECT EXTRACTED TEXT */}
      {inspectSource && (
        <div className="fixed inset-0 bg-inverse-surface/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest max-w-2xl w-full max-h-[85vh] rounded-2xl p-space-xl shadow-2xl border border-outline-variant/40 flex flex-col gap-space-md">
            <div className="flex items-center justify-between pb-space-xs border-b border-outline-variant/30">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary-fixed text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">
                    {inspectSource.documentData?.fileFormat === 'pdf' ? 'picture_as_pdf' : 'description'}
                  </span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface truncate max-w-md">
                    {inspectSource.name}
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-outline font-mono">
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
                className="text-outline hover:text-on-surface p-1 rounded-lg"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Content Hash & Security Clearance */}
            <div className="flex items-center justify-between bg-surface-container-low p-2 rounded-lg text-xs font-mono text-outline">
              <span className="truncate max-w-sm">
                SHA-256: {inspectSource.documentData?.contentHash || 'N/A'}
              </span>
              <span className="text-primary font-semibold">Genuinely Extracted</span>
            </div>

            {/* Extracted Text Body */}
            <div className="flex-1 overflow-y-auto bg-surface-container-lowest p-3 rounded-lg border border-outline-variant/30 font-mono text-xs text-on-surface whitespace-pre-wrap leading-relaxed max-h-[50vh]">
              {inspectSource.documentData?.extractedText || 'No text content available.'}
            </div>

            <div className="flex items-center justify-between pt-space-xs border-t border-outline-variant/30">
              <button
                type="button"
                onClick={() => {
                  if (inspectSource.documentData?.extractedText) {
                    navigator.clipboard.writeText(inspectSource.documentData.extractedText);
                  }
                }}
                className="px-3 py-1.5 rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors font-medium text-xs flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px]">content_copy</span>
                <span>Copy Extracted Text</span>
              </button>

              <button
                type="button"
                onClick={() => setInspectSource(null)}
                className="px-4 py-1.5 rounded-lg bg-primary text-on-primary hover:bg-primary-container font-semibold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: CONFIRM DELETE SOURCE */}
      {deleteConfirmSource && (
        <div className="fixed inset-0 bg-inverse-surface/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest max-w-md w-full rounded-2xl p-space-xl shadow-2xl border border-outline-variant/40 flex flex-col gap-space-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-error-container text-error flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px]">delete_forever</span>
              </div>
              <div className="flex flex-col">
                <h3 className="font-headline-sm text-headline-sm text-on-surface">
                  Remove Uploaded Source?
                </h3>
                <p className="text-xs text-outline mt-0.5">
                  Are you sure you want to remove &quot;{deleteConfirmSource.name}&quot; from this workspace?
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-space-xs border-t border-outline-variant/30">
              <button
                type="button"
                onClick={() => setDeleteConfirmSource(null)}
                className="px-4 py-2 rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors font-medium text-xs"
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
                className="px-4 py-2 rounded-lg bg-error text-on-error hover:bg-error/90 font-semibold transition-all text-xs"
              >
                Confirm Removal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
