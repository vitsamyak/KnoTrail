'use client';

import React, { useState } from 'react';
import { useProject } from '../../context/ProjectContext';
import { ProjectSource } from '../../lib/types';

export function SourceManagerView() {
  const { project, addSource, runAiSync, isSyncing, setActiveView } = useProject();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceType, setNewSourceType] = useState<ProjectSource['type']>('notes');
  const [newSourceContent, setNewSourceContent] = useState('');
  const [newSourceDesc, setNewSourceDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSourceName.trim() || !newSourceContent.trim()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      addSource({
        name: newSourceName.trim(),
        type: newSourceType,
        content: newSourceContent.trim(),
        description: newSourceDesc.trim() || 'Custom operational handover document ingested during session.',
      });
      setIsSubmitting(false);
      setShowAddModal(false);
      setNewSourceName('');
      setNewSourceContent('');
      setNewSourceDesc('');
    }, 400);
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
            <span className="text-primary font-semibold">Source Manager</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight mt-1">
            Connected Engineering Streams
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
            Manage synchronized repositories, task boards, and documentation that fuel KnoTrail&apos;s reconstruction engine.
          </p>
        </div>

        {/* Action Group */}
        <div className="flex items-center gap-space-xs flex-wrap">
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-space-md py-2 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md shadow-sm transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Add Source or Ingest Notes</span>
          </button>
          <button
            onClick={() => runAiSync()}
            disabled={isSyncing}
            className="inline-flex items-center gap-2 px-space-md py-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-label-md border border-outline-variant/30 transition-all disabled:opacity-60"
          >
            <span className={`material-symbols-outlined text-[18px] text-primary ${isSyncing ? 'animate-spin' : ''}`}>
              sync
            </span>
            <span>{isSyncing ? 'Syncing...' : 'Sync All Pipelines'}</span>
          </button>
        </div>
      </div>

      {/* Privacy Guarantee & Demo Environment Notice */}
      <div className="bg-surface-container-low rounded-xl p-space-md border border-outline-variant/30 flex items-start gap-space-sm">
        <div className="w-9 h-9 rounded-lg bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-[20px]">lock</span>
        </div>
        <div className="flex flex-col text-xs">
          <span className="font-label-md text-label-md text-on-surface font-semibold">
            Public Demonstration &amp; Data Protection Boundary
          </span>
          <p className="text-on-surface-variant mt-0.5 leading-relaxed">
            All connected streams shown below use synthetic, anonymized engineering records. Ingested notes and custom files are processed in-session with strict client memory isolation. No private secrets or credentials are ever transmitted.
          </p>
        </div>
      </div>

      {/* Active Pipelines Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-md">
        {project.sources.map((source) => (
          <div
            key={source.id}
            className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm border border-outline-variant/30 flex flex-col justify-between hover:shadow-md transition-all group"
          >
            <div>
              {/* Card Top: Icon, Type, Status */}
              <div className="flex items-center justify-between mb-space-sm">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-surface-container-low flex items-center justify-center text-primary group-hover:bg-primary-fixed transition-colors">
                    <span className="material-symbols-outlined text-[20px]">{source.icon}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-semibold font-mono">
                      {source.type}
                    </span>
                    <span className="text-xs text-outline">{source.lastSync}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 bg-surface-container-low px-2 py-0.5 rounded-full border border-outline-variant/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                  <span className="text-[11px] font-semibold text-primary capitalize">{source.status}</span>
                </div>
              </div>

              {/* Source Name & Description */}
              <h3 className="font-headline-sm text-headline-sm text-on-surface group-hover:text-primary transition-colors">
                {source.name}
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 leading-relaxed">
                {source.description}
              </p>
            </div>

            {/* Card Bottom: Records count & Action */}
            <div className="mt-space-md pt-space-xs border-t border-outline-variant/20 flex items-center justify-between text-xs">
              <span className="text-outline font-medium">
                {source.recordCount.toLocaleString()} records indexed
              </span>
              <button
                onClick={() => runAiSync()}
                disabled={isSyncing}
                className="text-primary hover:underline font-semibold flex items-center gap-1 disabled:opacity-50"
              >
                <span>Re-sync</span>
                <span className="material-symbols-outlined text-[14px]">refresh</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL: ADD PROJECT SOURCE / INGEST NOTES */}
      {showAddModal && (
        <div className="fixed inset-0 bg-inverse-surface/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest max-w-xl w-full rounded-2xl p-space-xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-outline-variant/40 flex flex-col gap-space-md">
            <div className="flex items-center justify-between pb-space-xs border-b border-outline-variant/30">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary-fixed text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">post_add</span>
                </div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface">
                  Ingest Project Information
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-outline hover:text-on-surface p-1 rounded-lg"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="flex flex-col gap-space-sm text-xs">
              <div>
                <label className="font-label-sm text-on-surface font-semibold block mb-1">
                  Source Title / Document Name
                </label>
                <input
                  type="text"
                  required
                  value={newSourceName}
                  onChange={(e) => setNewSourceName(e.target.value)}
                  placeholder="e.g. SRE-Runbook-Failover.md or Q2 Architecture Handoff Notes"
                  className="w-full px-3 py-2 bg-surface-container-low rounded-lg border border-outline-variant/30 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-label-sm text-on-surface font-semibold block mb-1">
                    Source Type
                  </label>
                  <select
                    value={newSourceType}
                    onChange={(e) => setNewSourceType(e.target.value as ProjectSource['type'])}
                    className="w-full px-3 py-2 bg-surface-container-low rounded-lg border border-outline-variant/30 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                  >
                    <option value="notes">Meeting / Handover Notes</option>
                    <option value="docs">Markdown Architecture Doc</option>
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
                    placeholder="Short description of this source"
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
                  placeholder="Paste Markdown document, PR decision context, handover checklist, or architecture notes here..."
                  className="w-full px-3 py-2 bg-surface-container-low rounded-lg border border-outline-variant/30 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary font-mono text-xs resize-none"
                ></textarea>
              </div>

              {/* Sample Pre-fill button */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setNewSourceName('Emergency-Rollback-Checklist.md');
                    setNewSourceType('docs');
                    setNewSourceDesc('Production incident runbook for manual rollback key deployment.');
                    setNewSourceContent(
                      `# Emergency Rollback Checklist\n\n1. Confirm schema lock on ledger_entries.\n2. Obtain AWS KMS master passphrase from Marcus Vance.\n3. Run: bin/migrate --unlock-key <AUTH_KEY> --target v3.3.9\n4. Rebalance Kafka consumer group StickyAssignor.`
                    );
                  }}
                  className="text-primary hover:underline text-[11px] font-medium"
                >
                  Insert Sample Runbook
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 pt-space-xs border-t border-outline-variant/30 mt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-primary text-on-primary hover:bg-primary-container font-semibold transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-60"
                >
                  <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                  <span>{isSubmitting ? 'Ingesting...' : 'Ingest & Reconstruct'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
