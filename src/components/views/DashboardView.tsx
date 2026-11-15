'use client';

import React from 'react';
import { useProject } from '../../context/ProjectContext';

export function DashboardView() {
  const {
    project,
    stats,
    setActiveView,
    runAiSync,
    isSyncing,
    isProjectCreated,
    setShowCreateProjectModal,
  } = useProject();

  const hasFindings = project.findings.length > 0;
  const hasSources = project.sources.length > 0;

  return (
    <div className="flex flex-col w-full gap-5 animate-in fade-in duration-200">
      {/* Top Banner / Project Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-lowest p-5 sm:p-6 rounded-xl shadow-xs border border-outline-variant/40">
        <div className="flex flex-col max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-2 h-2 rounded-full bg-primary shrink-0 animate-pulse"></span>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-secondary">
              {isProjectCreated ? `Project Handover • ${project.name}` : 'Knowledge Handover Workspace'}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-on-surface tracking-tight mt-1">
            Project Overview
          </h1>
          <p className="text-xs sm:text-sm text-secondary mt-0.5 leading-relaxed">
            Preserve and reconstruct operational context across documents, important decisions, pending tasks, and dependencies.
          </p>
        </div>

        {/* Action Group */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto shrink-0">
          <button
            onClick={() => setShowCreateProjectModal(true)}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 h-9 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-medium transition-colors border border-outline-variant/40"
            type="button"
          >
            <span className="material-symbols-outlined text-[17px]">create_new_folder</span>
            <span>Create Project</span>
          </button>
          <button
            onClick={() => setActiveView('sources')}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 h-9 rounded-lg bg-primary hover:bg-primary-hover text-on-primary text-xs font-medium transition-colors shadow-xs"
            type="button"
          >
            <span className="material-symbols-outlined text-[17px]">upload_file</span>
            <span>Upload Documents</span>
          </button>
          <button
            onClick={() => runAiSync()}
            disabled={isSyncing}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 h-9 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-medium transition-colors border border-outline-variant/40 disabled:opacity-60"
            type="button"
          >
            <span className={`material-symbols-outlined text-[17px] text-primary ${isSyncing ? 'animate-spin' : ''}`}>
              sync
            </span>
            <span>{isSyncing ? 'Syncing...' : 'Sync Workspace'}</span>
          </button>
          <button
            onClick={() => setActiveView('handover')}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 h-9 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-medium transition-colors border border-outline-variant/40"
            type="button"
          >
            <span className="material-symbols-outlined text-[17px]">description</span>
            <span>Handover Report</span>
          </button>
        </div>
      </div>

      {/* 4 SUMMARY METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Connected Sources */}
        <div
          onClick={() => setActiveView('sources')}
          className="bg-surface-container-lowest rounded-xl p-5 shadow-xs hover:border-outline-variant/70 border border-outline-variant/40 transition-all flex flex-col justify-between group cursor-pointer"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] text-secondary uppercase tracking-wider font-semibold">
                Connected Sources
              </span>
              <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center text-primary group-hover:bg-primary/10 transition-colors">
                <span className="material-symbols-outlined text-[18px]">dataset</span>
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tracking-tight text-on-surface">{stats.totalSources}</span>
              <span className="text-xs text-secondary">Uploaded</span>
            </div>
            <p className="text-xs text-secondary mt-1">
              {stats.totalSources === 0
                ? 'No documents uploaded yet'
                : `${stats.totalSources} document(s) available for analysis`}
            </p>
          </div>
          <div className="mt-4 pt-3 flex items-center justify-between border-t border-outline-variant/30 text-xs text-primary font-medium">
            <span>Manage sources</span>
            <span className="material-symbols-outlined text-[15px] group-hover:translate-x-0.5 transition-transform">
              arrow_forward
            </span>
          </div>
        </div>

        {/* Card 2: Important Decisions */}
        <div
          onClick={() => setActiveView('analysis')}
          className="bg-surface-container-lowest rounded-xl p-5 shadow-xs hover:border-outline-variant/70 border border-outline-variant/40 transition-all flex flex-col justify-between group cursor-pointer"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] text-secondary uppercase tracking-wider font-semibold">
                Important Decisions
              </span>
              <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center text-primary group-hover:bg-primary/10 transition-colors">
                <span className="material-symbols-outlined text-[18px]">gavel</span>
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tracking-tight text-on-surface">{stats.decisionsCount}</span>
              <span className="text-xs text-secondary">Identified</span>
            </div>
            <p className="text-xs text-secondary mt-1">
              {stats.decisionsCount === 0
                ? 'No decisions extracted yet'
                : `${stats.decisionsCount} decision(s) with reasoning`}
            </p>
          </div>
          <div className="mt-4 pt-3 flex items-center justify-between border-t border-outline-variant/30 text-xs text-primary font-medium">
            <span>View decisions</span>
            <span className="material-symbols-outlined text-[15px] group-hover:translate-x-0.5 transition-transform">
              arrow_forward
            </span>
          </div>
        </div>

        {/* Card 3: Pending Tasks */}
        <div
          onClick={() => setActiveView('workspace')}
          className="bg-surface-container-lowest rounded-xl p-5 shadow-xs hover:border-outline-variant/70 border border-outline-variant/40 transition-all flex flex-col justify-between group cursor-pointer"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] text-secondary uppercase tracking-wider font-semibold">
                Pending Tasks
              </span>
              <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center text-primary group-hover:bg-primary/10 transition-colors">
                <span className="material-symbols-outlined text-[18px]">checklist</span>
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tracking-tight text-on-surface">{stats.tasksCount}</span>
              <span className="text-xs text-secondary">Found</span>
            </div>
            <p className="text-xs text-secondary mt-1">
              {stats.tasksCount === 0
                ? 'No pending tasks recorded'
                : `${stats.tasksCount} operational task(s) tracked`}
            </p>
          </div>
          <div className="mt-4 pt-3 flex items-center justify-between border-t border-outline-variant/30 text-xs text-primary font-medium">
            <span>View tasks</span>
            <span className="material-symbols-outlined text-[15px] group-hover:translate-x-0.5 transition-transform">
              arrow_forward
            </span>
          </div>
        </div>

        {/* Card 4: Human Review Progress */}
        <div
          onClick={() => setActiveView('review')}
          className="bg-surface-container-lowest rounded-xl p-5 shadow-xs hover:border-outline-variant/70 border border-outline-variant/40 transition-all flex flex-col justify-between group cursor-pointer"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] text-secondary uppercase tracking-wider font-semibold">
                Review Progress
              </span>
              <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center text-primary group-hover:bg-primary/10 transition-colors">
                <span className="material-symbols-outlined text-[18px]">verified_user</span>
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tracking-tight text-on-surface">
                {stats.totalFindings > 0 ? `${stats.certificationProgressPercent}%` : '0%'}
              </span>
              <span className="text-xs text-secondary">
                {stats.approvedCount} of {stats.totalFindings} Approved
              </span>
            </div>
            <p className="text-xs text-secondary mt-1">
              {stats.unresolvedConflictsCount > 0
                ? `${stats.unresolvedConflictsCount} conflict(s) require resolution`
                : stats.totalFindings > 0
                ? `${stats.unreviewedCount} item(s) pending review`
                : 'No items to review yet'}
            </p>
          </div>
          <div className="mt-4 pt-3 flex items-center justify-between border-t border-outline-variant/30 text-xs text-primary font-medium">
            <span>Review Center</span>
            <span className="material-symbols-outlined text-[15px] group-hover:translate-x-0.5 transition-transform">
              arrow_forward
            </span>
          </div>
        </div>
      </div>

      {/* EMPTY STATE (When no documents and no findings exist) */}
      {!hasFindings && !hasSources && (
        <div className="bg-surface-container-lowest rounded-xl p-8 sm:p-12 border border-outline-variant/40 shadow-xs flex flex-col items-center text-center max-w-xl mx-auto my-4">
          <div className="w-12 h-12 rounded-xl bg-surface-container-low text-primary flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-[28px]">folder_open</span>
          </div>
          <h2 className="text-lg sm:text-xl font-semibold text-on-surface tracking-tight">
            Start Your Knowledge Handover
          </h2>
          <p className="text-xs sm:text-sm text-secondary mt-1.5 max-w-md leading-relaxed">
            Upload your project documents to extract important decisions, pending tasks, risks, and dependencies with source-grounded evidence.
          </p>
          <div className="flex items-center gap-2.5 mt-6">
            <button
              onClick={() => setShowCreateProjectModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 h-9 bg-surface-container-low hover:bg-surface-container text-on-surface rounded-lg text-xs font-medium transition-colors border border-outline-variant/40"
            >
              <span className="material-symbols-outlined text-[17px]">create_new_folder</span>
              <span>Create Project</span>
            </button>
            <button
              onClick={() => setActiveView('sources')}
              className="inline-flex items-center gap-1.5 px-4 h-9 bg-primary hover:bg-primary-hover text-on-primary rounded-lg text-xs font-medium shadow-xs transition-colors"
            >
              <span className="material-symbols-outlined text-[17px]">upload_file</span>
              <span>Upload Documents</span>
            </button>
          </div>
        </div>
      )}

      {/* MID SECTION: RECENT ACTIVITY & PROJECT STATUS */}
      {(hasFindings || hasSources) && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left: Handover Status Card */}
          <div className="lg:col-span-5 bg-surface-container-lowest rounded-xl p-5 sm:p-6 flex flex-col justify-between shadow-xs border border-outline-variant/40">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider text-secondary font-semibold">
                  Handover Status
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-md font-semibold uppercase tracking-wider border ${
                    project.handoverCertified
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}
                >
                  {project.handoverCertified ? 'Certified' : 'In Progress'}
                </span>
              </div>
              <h3 className="text-base font-semibold text-on-surface">
                {project.name}
              </h3>
              <p className="text-secondary text-xs leading-relaxed line-clamp-2">
                {project.description}
              </p>

              {/* Progress Summary */}
              <div className="space-y-2 mt-2 text-xs border-t border-outline-variant/30 pt-3">
                <div className="flex items-center justify-between py-0.5">
                  <span className="text-secondary">Sources Uploaded:</span>
                  <span className="font-medium text-on-surface">{stats.totalSources} document(s)</span>
                </div>
                <div className="flex items-center justify-between py-0.5">
                  <span className="text-secondary">Important Decisions:</span>
                  <span className="font-medium text-on-surface">{stats.decisionsCount}</span>
                </div>
                <div className="flex items-center justify-between py-0.5">
                  <span className="text-secondary">Pending Tasks:</span>
                  <span className="font-medium text-on-surface">{stats.tasksCount}</span>
                </div>
                <div className="flex items-center justify-between py-0.5">
                  <span className="text-secondary">Identified Risks:</span>
                  <span className="font-medium text-on-surface">{stats.risksCount}</span>
                </div>
                <div className="flex items-center justify-between py-0.5">
                  <span className="text-secondary">Approved Findings:</span>
                  <span className="font-semibold text-primary">
                    {stats.approvedCount} of {stats.totalFindings}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3.5 border-t border-outline-variant/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs text-secondary font-mono">Target: {project.targetExitDate}</span>
              <button
                onClick={() => setActiveView('review')}
                className="w-full sm:w-auto justify-center px-3.5 h-8 bg-primary hover:bg-primary-hover text-on-primary rounded-lg text-xs font-medium transition-colors shadow-xs flex items-center gap-1.5"
              >
                <span>Review Center</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
            </div>
          </div>

          {/* Right: Recent Activity Feed */}
          <div className="lg:col-span-7 bg-surface-container-lowest rounded-xl p-5 sm:p-6 shadow-xs border border-outline-variant/40 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-on-surface">
                    Recent Knowledge Findings
                  </span>
                  <span className="text-[11px] bg-surface-container-low text-secondary border border-outline-variant/40 px-2 py-0.5 rounded-full font-mono">
                    {stats.totalFindings} Finding(s)
                  </span>
                </div>
                <button
                  onClick={() => setActiveView('evidence')}
                  className="text-xs text-primary font-medium hover:underline flex items-center gap-0.5"
                >
                  <span>Evidence Explorer</span>
                  <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                </button>
              </div>

              {/* Finding List */}
              {project.findings.length === 0 ? (
                <div className="p-8 text-center text-xs text-secondary bg-surface-container-low/50 rounded-lg border border-outline-variant/30">
                  No findings yet. Run AI Analysis on your uploaded documents to extract decisions and tasks.
                </div>
              ) : (
                <div className="space-y-2">
                  {project.findings.slice(0, 4).map((f) => (
                    <div
                      key={f.id}
                      onClick={() => setActiveView('evidence')}
                      className="p-3 bg-surface-container-lowest hover:bg-surface-container-low/60 rounded-lg border border-outline-variant/30 transition-all cursor-pointer flex items-start justify-between gap-3 group"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <span
                          className={`material-symbols-outlined text-[17px] mt-0.5 shrink-0 ${
                            f.status === 'VERIFIED'
                              ? 'text-primary'
                              : f.status === 'CONFLICTING'
                              ? 'text-error'
                              : 'text-amber-600'
                          }`}
                        >
                          {f.status === 'VERIFIED'
                            ? 'verified'
                            : f.status === 'CONFLICTING'
                            ? 'rule'
                            : 'help'}
                        </span>
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-on-surface group-hover:text-primary transition-colors truncate">
                              {f.title}
                            </span>
                            <span
                              className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded-md border ${
                                f.status === 'VERIFIED'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : f.status === 'CONFLICTING'
                                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                              }`}
                            >
                              {f.status}
                            </span>
                          </div>
                          <p className="text-xs text-secondary line-clamp-1 mt-0.5">
                            {f.summary}
                          </p>
                          <div className="flex items-center gap-2.5 mt-1 text-[11px] text-secondary">
                            <span className="font-mono text-[10px]">{f.category}</span>
                            <span>•</span>
                            <span>{f.citations.length} citation(s)</span>
                          </div>
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-[16px] text-secondary group-hover:translate-x-0.5 transition-transform self-center shrink-0">
                        chevron_right
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-outline-variant/30 flex items-center justify-between text-xs text-secondary">
              <span className="font-mono text-[11px]">Last analysed: {project.lastAnalysed}</span>
              <span className="text-primary font-medium text-[11px]">Backed by original documents</span>
            </div>
          </div>
        </div>
      )}

      {/* QUICK NAVIGATION TILES */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => setActiveView('workspace')}
          className="p-4 bg-surface-container-lowest hover:bg-surface-container-low/60 rounded-xl border border-outline-variant/40 text-left transition-all shadow-xs group"
        >
          <span className="material-symbols-outlined text-[22px] text-primary mb-2 block group-hover:scale-105 transition-transform">
            folder_open
          </span>
          <p className="text-xs font-semibold text-on-surface">Project Workspace</p>
          <p className="text-[11px] text-secondary mt-0.5 line-clamp-1">View project details and findings</p>
        </button>

        <button
          onClick={() => setActiveView('sources')}
          className="p-4 bg-surface-container-lowest hover:bg-surface-container-low/60 rounded-xl border border-outline-variant/40 text-left transition-all shadow-xs group"
        >
          <span className="material-symbols-outlined text-[22px] text-primary mb-2 block group-hover:scale-105 transition-transform">
            dataset
          </span>
          <p className="text-xs font-semibold text-on-surface">Sources</p>
          <p className="text-[11px] text-secondary mt-0.5 line-clamp-1">Upload and manage project documents</p>
        </button>

        <button
          onClick={() => setActiveView('review')}
          className="p-4 bg-surface-container-lowest hover:bg-surface-container-low/60 rounded-xl border border-outline-variant/40 text-left transition-all shadow-xs group"
        >
          <span className="material-symbols-outlined text-[22px] text-primary mb-2 block group-hover:scale-105 transition-transform">
            rule
          </span>
          <p className="text-xs font-semibold text-on-surface">Review Center</p>
          <p className="text-[11px] text-secondary mt-0.5 line-clamp-1">Review, edit, and approve findings</p>
        </button>

        <button
          onClick={() => setActiveView('handover')}
          className="p-4 bg-surface-container-lowest hover:bg-surface-container-low/60 rounded-xl border border-outline-variant/40 text-left transition-all shadow-xs group"
        >
          <span className="material-symbols-outlined text-[22px] text-primary mb-2 block group-hover:scale-105 transition-transform">
            description
          </span>
          <p className="text-xs font-semibold text-on-surface">Handover Report</p>
          <p className="text-[11px] text-secondary mt-0.5 line-clamp-1">View and export approved handover</p>
        </button>
      </div>
    </div>
  );
}
