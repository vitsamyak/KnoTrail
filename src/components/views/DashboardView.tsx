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
    showCreateProjectModal,
    setShowCreateProjectModal,
  } = useProject();

  const hasFindings = project.findings.length > 0;
  const hasSources = project.sources.length > 0;

  return (
    <div className="flex flex-col w-full gap-space-lg animate-in fade-in duration-200">
      {/* Top Banner / Project Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md bg-surface-container-lowest p-space-lg rounded-xl shadow-sm border border-outline-variant/30">
        <div className="flex flex-col">
          <div className="flex items-center gap-space-xs">
            <span className="inline-flex items-center justify-center w-2 h-2 rounded-full bg-primary animate-ping"></span>
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-semibold">
              {isProjectCreated ? `Project Handover • ${project.name}` : 'Knowledge Handover Workspace'}
            </span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight mt-1">
            Your Project Overview
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
            Upload your project documents to discover important decisions, pending tasks, risks and dependencies.
          </p>
        </div>

        {/* Action Group */}
        <div className="flex items-center gap-space-xs flex-wrap">
          <button
            onClick={() => setShowCreateProjectModal(true)}
            className="inline-flex items-center gap-space-2xs px-space-md py-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-label-md transition-all shadow-sm border border-outline-variant/30"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">create_new_folder</span>
            <span>Create Project</span>
          </button>
          <button
            onClick={() => setActiveView('sources')}
            className="inline-flex items-center gap-space-2xs px-space-md py-2 rounded-lg bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md transition-all shadow-sm"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">upload_file</span>
            <span>Upload Documents</span>
          </button>
          <button
            onClick={() => runAiSync()}
            disabled={isSyncing}
            className="inline-flex items-center gap-space-2xs px-space-md py-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-label-md transition-all shadow-sm border border-outline-variant/30 disabled:opacity-60"
            type="button"
          >
            <span className={`material-symbols-outlined text-[18px] text-primary ${isSyncing ? 'animate-spin' : ''}`}>
              sync
            </span>
            <span>{isSyncing ? 'Syncing...' : 'Sync Workspace'}</span>
          </button>
          <button
            onClick={() => setActiveView('handover')}
            className="inline-flex items-center gap-space-2xs px-space-md py-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-label-md transition-all shadow-sm border border-outline-variant/30"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">description</span>
            <span>Handover Report</span>
          </button>
        </div>
      </div>

      {/* 4 SUMMARY METRIC CARDS (All computed from real stored records) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-gutter">
        {/* Card 1: Connected Sources */}
        <div
          onClick={() => setActiveView('sources')}
          className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm hover:shadow-md border border-outline-variant/30 transition-all duration-300 flex flex-col justify-between group cursor-pointer"
        >
          <div>
            <div className="flex items-center justify-between mb-space-sm">
              <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider font-semibold">
                Connected Sources
              </span>
              <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center text-primary group-hover:bg-primary-fixed transition-colors">
                <span className="material-symbols-outlined text-[18px]">dataset</span>
              </div>
            </div>
            <div className="flex items-baseline gap-space-xs">
              <span className="font-metric-xl text-metric-xl text-on-surface">{stats.totalSources}</span>
              <span className="font-label-sm text-label-sm text-outline">Uploaded</span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
              {stats.totalSources === 0
                ? 'No documents uploaded yet'
                : `${stats.totalSources} document(s) available for analysis`}
            </p>
          </div>
          <div className="mt-space-md pt-space-xs flex items-center justify-between border-t border-outline-variant/20 text-xs text-primary font-medium">
            <span>Manage sources</span>
            <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">
              arrow_forward
            </span>
          </div>
        </div>

        {/* Card 2: Important Decisions */}
        <div
          onClick={() => setActiveView('analysis')}
          className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm hover:shadow-md border border-outline-variant/30 transition-all duration-300 flex flex-col justify-between group cursor-pointer"
        >
          <div>
            <div className="flex items-center justify-between mb-space-sm">
              <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider font-semibold">
                Important Decisions
              </span>
              <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center text-primary group-hover:bg-primary-fixed transition-colors">
                <span className="material-symbols-outlined text-[18px]">gavel</span>
              </div>
            </div>
            <div className="flex items-baseline gap-space-xs">
              <span className="font-metric-xl text-metric-xl text-on-surface">{stats.decisionsCount}</span>
              <span className="font-label-sm text-label-sm text-outline">Identified</span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
              {stats.decisionsCount === 0
                ? 'No decisions extracted yet'
                : `${stats.decisionsCount} decision(s) with reasoning`}
            </p>
          </div>
          <div className="mt-space-md pt-space-xs flex items-center justify-between border-t border-outline-variant/20 text-xs text-primary font-medium">
            <span>View decisions</span>
            <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">
              arrow_forward
            </span>
          </div>
        </div>

        {/* Card 3: Pending Tasks */}
        <div
          onClick={() => setActiveView('workspace')}
          className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm hover:shadow-md border border-outline-variant/30 transition-all duration-300 flex flex-col justify-between group cursor-pointer"
        >
          <div>
            <div className="flex items-center justify-between mb-space-sm">
              <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider font-semibold">
                Pending Tasks
              </span>
              <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center text-secondary group-hover:bg-secondary-container transition-colors">
                <span className="material-symbols-outlined text-[18px]">checklist</span>
              </div>
            </div>
            <div className="flex items-baseline gap-space-xs">
              <span className="font-metric-xl text-metric-xl text-on-surface">{stats.tasksCount}</span>
              <span className="font-label-sm text-label-sm text-outline">Found</span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
              {stats.tasksCount === 0
                ? 'No pending tasks recorded'
                : `${stats.tasksCount} operational task(s) tracked`}
            </p>
          </div>
          <div className="mt-space-md pt-space-xs flex items-center justify-between border-t border-outline-variant/20 text-xs text-primary font-medium">
            <span>View tasks</span>
            <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">
              arrow_forward
            </span>
          </div>
        </div>

        {/* Card 4: Human Review Progress */}
        <div
          onClick={() => setActiveView('review')}
          className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm hover:shadow-md border border-outline-variant/30 transition-all duration-300 flex flex-col justify-between group cursor-pointer"
        >
          <div>
            <div className="flex items-center justify-between mb-space-sm">
              <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider font-semibold">
                Review Progress
              </span>
              <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center text-primary group-hover:bg-primary-fixed transition-colors">
                <span className="material-symbols-outlined text-[18px]">verified_user</span>
              </div>
            </div>
            <div className="flex items-baseline gap-space-xs">
              <span className="font-metric-xl text-metric-xl text-on-surface">
                {stats.totalFindings > 0 ? `${stats.certificationProgressPercent}%` : '0%'}
              </span>
              <span className="font-label-sm text-label-sm text-outline">
                {stats.approvedCount} of {stats.totalFindings} Approved
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
              {stats.unresolvedConflictsCount > 0
                ? `${stats.unresolvedConflictsCount} conflict(s) require resolution`
                : stats.totalFindings > 0
                ? `${stats.unreviewedCount} item(s) pending review`
                : 'No items to review yet'}
            </p>
          </div>
          <div className="mt-space-md pt-space-xs flex items-center justify-between border-t border-outline-variant/20 text-xs text-primary font-medium">
            <span>Review Center</span>
            <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">
              arrow_forward
            </span>
          </div>
        </div>
      </div>

      {/* EMPTY STATE (Shown when no documents and no findings exist) */}
      {!hasFindings && !hasSources && (
        <div className="bg-surface-container-lowest rounded-xl p-space-2xl border border-outline-variant/30 shadow-sm flex flex-col items-center text-center max-w-2xl mx-auto my-space-md">
          <div className="w-14 h-14 rounded-2xl bg-surface-container-low text-primary flex items-center justify-center mb-space-md">
            <span className="material-symbols-outlined text-[32px]">folder_open</span>
          </div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">
            Start Your Knowledge Handover
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-2 max-w-lg leading-relaxed">
            Upload your project documents to discover important decisions, pending tasks, risks and dependencies.
          </p>
          <div className="flex items-center gap-space-sm mt-space-lg">
            <button
              onClick={() => setShowCreateProjectModal(true)}
              className="inline-flex items-center gap-2 px-space-md py-space-sm bg-surface-container hover:bg-surface-container-high text-on-surface rounded-lg font-headline-sm text-headline-sm transition-colors border border-outline-variant/30"
            >
              <span className="material-symbols-outlined text-[18px]">create_new_folder</span>
              <span>Create Project</span>
            </button>
            <button
              onClick={() => setActiveView('sources')}
              className="inline-flex items-center gap-2 px-space-lg py-space-sm bg-primary hover:bg-primary-container text-on-primary rounded-lg font-headline-sm text-headline-sm shadow-sm transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">upload_file</span>
              <span>Upload Documents</span>
            </button>
          </div>
        </div>
      )}

      {/* MID SECTION: RECENT ACTIVITY & PROJECT STATUS */}
      {(hasFindings || hasSources) && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
          {/* Left: Handover Status Card */}
          <div className="lg:col-span-5 bg-surface-container-lowest rounded-xl p-space-xl flex flex-col justify-between shadow-sm border border-outline-variant/30">
            <div className="flex flex-col gap-space-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wider text-secondary font-semibold">
                  Handover Status
                </span>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                    project.handoverCertified
                      ? 'bg-secondary-container text-on-secondary-container'
                      : 'bg-surface-container text-outline'
                  }`}
                >
                  {project.handoverCertified ? 'Certified' : 'In Progress'}
                </span>
              </div>
              <h3 className="font-headline-md text-headline-md text-on-surface font-semibold">
                {project.name}
              </h3>
              <p className="text-on-surface-variant text-body-sm leading-relaxed">
                {project.description}
              </p>

              {/* Progress Summary */}
              <div className="space-y-2 mt-space-md font-body-sm text-xs border-t border-outline-variant/20 pt-space-md">
                <div className="flex items-center justify-between py-1">
                  <span className="text-on-surface-variant">Sources Uploaded:</span>
                  <span className="font-semibold text-on-surface">{stats.totalSources} document(s)</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-on-surface-variant">Decisions Reconstructed:</span>
                  <span className="font-semibold text-on-surface">{stats.decisionsCount}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-on-surface-variant">Pending Tasks:</span>
                  <span className="font-semibold text-on-surface">{stats.tasksCount}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-on-surface-variant">Identified Risks:</span>
                  <span className="font-semibold text-on-surface">{stats.risksCount}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-on-surface-variant">Approved Findings:</span>
                  <span className="font-semibold text-primary">
                    {stats.approvedCount} of {stats.totalFindings}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-space-lg pt-space-md border-t border-outline-variant/20 flex items-center justify-between">
              <span className="text-xs text-outline">Target Date: {project.targetExitDate}</span>
              <button
                onClick={() => setActiveView('review')}
                className="px-4 py-2 bg-primary hover:bg-primary-container text-on-primary rounded-lg text-xs font-semibold transition-all shadow-sm flex items-center gap-1.5"
              >
                <span>Review Center</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
            </div>
          </div>

          {/* Right: Recent Activity Feed */}
          <div className="lg:col-span-7 bg-surface-container-lowest rounded-xl p-space-lg shadow-sm border border-outline-variant/30 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-space-md">
                <div className="flex items-center gap-2">
                  <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                    Recent Activity
                  </span>
                  <span className="text-xs bg-surface-container text-outline px-2 py-0.5 rounded-full">
                    {stats.totalFindings} Finding(s)
                  </span>
                </div>
                <button
                  onClick={() => setActiveView('evidence')}
                  className="text-xs text-primary font-semibold hover:underline flex items-center gap-0.5"
                >
                  <span>View in Evidence Explorer</span>
                  <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                </button>
              </div>

              {/* Finding List */}
              {project.findings.length === 0 ? (
                <div className="p-space-xl text-center text-xs text-outline bg-surface-container-low rounded-lg">
                  No findings extracted yet. Run AI Analysis on your uploaded sources.
                </div>
              ) : (
                <div className="space-y-space-sm">
                  {project.findings.slice(0, 4).map((f) => (
                    <div
                      key={f.id}
                      onClick={() => setActiveView('evidence')}
                      className="p-space-sm bg-surface-container-low/60 hover:bg-surface-container-low rounded-lg border border-outline-variant/20 transition-all cursor-pointer flex items-start justify-between gap-3 group"
                    >
                      <div className="flex items-start gap-space-xs">
                        <span
                          className={`material-symbols-outlined text-[18px] mt-0.5 ${
                            f.status === 'VERIFIED'
                              ? 'text-primary'
                              : f.status === 'CONFLICTING'
                              ? 'text-error'
                              : 'text-tertiary'
                          }`}
                        >
                          {f.status === 'VERIFIED'
                            ? 'verified'
                            : f.status === 'CONFLICTING'
                            ? 'rule'
                            : 'help'}
                        </span>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-label-md text-label-md text-on-surface font-semibold group-hover:text-primary transition-colors">
                              {f.title}
                            </span>
                            <span
                              className={`text-[10px] uppercase font-bold px-1.5 py-0.2 rounded-full ${
                                f.status === 'VERIFIED'
                                  ? 'bg-secondary-container text-on-secondary-container'
                                  : f.status === 'CONFLICTING'
                                  ? 'bg-error-container text-on-error-container'
                                  : 'bg-tertiary-fixed text-on-tertiary-fixed'
                              }`}
                            >
                              {f.status}
                            </span>
                          </div>
                          <p className="text-xs text-on-surface-variant line-clamp-1 mt-0.5">
                            {f.summary}
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-[11px] text-outline">
                            <span>Category: {f.category}</span>
                            <span>•</span>
                            <span>{f.citations.length} citation(s)</span>
                          </div>
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-[16px] text-outline group-hover:translate-x-1 transition-transform self-center">
                        chevron_right
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-space-md pt-space-xs border-t border-outline-variant/20 flex items-center justify-between text-xs text-outline">
              <span>Last analysed: {project.lastAnalysed}</span>
              <span className="text-primary font-medium">Grounded in verified sources</span>
            </div>
          </div>
        </div>
      )}

      {/* QUICK NAVIGATION TILES */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-gutter">
        <button
          onClick={() => setActiveView('workspace')}
          className="p-space-md bg-surface-container-lowest hover:bg-surface-container rounded-xl border border-outline-variant/30 text-left transition-all shadow-xs group"
        >
          <span className="material-symbols-outlined text-[24px] text-primary mb-2 group-hover:scale-110 transition-transform">
            folder_open
          </span>
          <p className="font-label-md text-label-md text-on-surface font-semibold">Project Workspace</p>
          <p className="text-xs text-on-surface-variant mt-0.5">View project details and findings list</p>
        </button>

        <button
          onClick={() => setActiveView('sources')}
          className="p-space-md bg-surface-container-lowest hover:bg-surface-container rounded-xl border border-outline-variant/30 text-left transition-all shadow-xs group"
        >
          <span className="material-symbols-outlined text-[24px] text-primary mb-2 group-hover:scale-110 transition-transform">
            dataset
          </span>
          <p className="font-label-md text-label-md text-on-surface font-semibold">Sources</p>
          <p className="text-xs text-on-surface-variant mt-0.5">Upload and manage project documents</p>
        </button>

        <button
          onClick={() => setActiveView('review')}
          className="p-space-md bg-surface-container-lowest hover:bg-surface-container rounded-xl border border-outline-variant/30 text-left transition-all shadow-xs group"
        >
          <span className="material-symbols-outlined text-[24px] text-secondary mb-2 group-hover:scale-110 transition-transform">
            rule
          </span>
          <p className="font-label-md text-label-md text-on-surface font-semibold">Review Center</p>
          <p className="text-xs text-on-surface-variant mt-0.5">Review, edit, and approve findings</p>
        </button>

        <button
          onClick={() => setActiveView('handover')}
          className="p-space-md bg-surface-container-lowest hover:bg-surface-container rounded-xl border border-outline-variant/30 text-left transition-all shadow-xs group"
        >
          <span className="material-symbols-outlined text-[24px] text-primary mb-2 group-hover:scale-110 transition-transform">
            description
          </span>
          <p className="font-label-md text-label-md text-on-surface font-semibold">Handover Report</p>
          <p className="text-xs text-on-surface-variant mt-0.5">View and export approved handover dossier</p>
        </button>
      </div>
    </div>
  );
}
