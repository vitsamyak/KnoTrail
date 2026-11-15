'use client';

import React, { useState } from 'react';
import { useProject } from '../../context/ProjectContext';
import { FindingType } from '../../lib/types';

export function WorkspaceView() {
  const {
    project,
    stats,
    setActiveView,
    setSelectedFinding,
    isProjectCreated,
    setShowCreateProjectModal,
    currentUserRole,
    resetDemoData,
    searchQuery,
  } = useProject();
  const [selectedTab, setSelectedTab] = useState<'all' | FindingType>('all');
  const [workspaceSearch, setWorkspaceSearch] = useState('');

  const activeSearch = workspaceSearch || searchQuery;
  const filteredFindings = project.findings.filter((f) => {
    const matchesTab = selectedTab === 'all' || f.type === selectedTab;
    const matchesSearch =
      !activeSearch ||
      f.title.toLowerCase().includes(activeSearch.toLowerCase()) ||
      f.summary.toLowerCase().includes(activeSearch.toLowerCase()) ||
      f.category.toLowerCase().includes(activeSearch.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="flex flex-col w-full gap-4 sm:gap-4.5 animate-in fade-in duration-150">
      {/* ─────────────────────────────────────────────────────────────────────────
          1. UNIFIED PAGE HEADER (Consistent across all states)
      ───────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 sm:pb-3.5 border-b border-outline-variant/30">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-secondary mb-1">
            <span>Workspace</span>
            <span>/</span>
            <span className="text-on-surface font-semibold">Projects</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight">
            Projects &amp; Workspaces
          </h1>
          <p className="text-xs sm:text-sm text-secondary mt-0.5 leading-relaxed">
            Manage active handover projects, track operational findings, and coordinate team transitions.
          </p>
        </div>

        {/* Action Group */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
          <button
            onClick={() => {
              if (currentUserRole === 'EXTERNAL') return;
              setShowCreateProjectModal(true);
            }}
            disabled={currentUserRole === 'EXTERNAL'}
            title={currentUserRole === 'EXTERNAL' ? 'Read-only access: External members cannot create projects' : undefined}
            className={`inline-flex items-center gap-1.5 px-3.5 h-9 rounded-lg text-xs font-medium shadow-2xs transition-colors ${
              currentUserRole === 'EXTERNAL'
                ? 'bg-surface-container-low text-secondary opacity-50 cursor-not-allowed border border-outline-variant/40'
                : 'bg-primary hover:bg-primary-hover text-on-primary'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">
              {currentUserRole === 'EXTERNAL' ? 'lock' : 'add'}
            </span>
            <span>New Project</span>
          </button>
          <button
            onClick={() => setActiveView('sources')}
            className="inline-flex items-center gap-1.5 px-3.5 h-9 bg-surface-container-low hover:bg-surface-container text-on-surface rounded-lg text-xs font-medium transition-colors border border-outline-variant/40"
          >
            <span className="material-symbols-outlined text-[17px]">upload_file</span>
            <span>Manage Sources</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────
          2. EMPTY STATE / PROJECT STARTER (Structured, High-Density Layout)
      ───────────────────────────────────────────────────────────────────────── */}
      {!isProjectCreated ? (
        <div className="flex flex-col gap-4 sm:gap-4.5">
          {/* Quick Stats Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="bg-surface rounded-xl p-3.5 sm:p-4 border border-outline-variant/40 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-secondary uppercase tracking-wider">Active Projects</span>
                <div className="text-xl font-bold text-on-surface mt-0.5">0</div>
                <span className="text-[11px] text-secondary">No project configured</span>
              </div>
              <div className="w-9 h-9 rounded-lg bg-surface-container-low text-secondary flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">folder_off</span>
              </div>
            </div>

            <div className="bg-surface rounded-xl p-3.5 sm:p-4 border border-outline-variant/40 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-secondary uppercase tracking-wider">Available Sources</span>
                <div className="text-xl font-bold text-on-surface mt-0.5">{stats.totalSources}</div>
                <span className="text-[11px] text-secondary">Ready for extraction</span>
              </div>
              <div className="w-9 h-9 rounded-lg bg-surface-container-low text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">dataset</span>
              </div>
            </div>

            <div className="bg-surface rounded-xl p-3.5 sm:p-4 border border-outline-variant/40 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-secondary uppercase tracking-wider">Handover Readiness</span>
                <div className="text-xl font-bold text-on-surface mt-0.5">Pending</div>
                <span className="text-[11px] text-secondary">Awaiting project setup</span>
              </div>
              <div className="w-9 h-9 rounded-lg bg-surface-container-low text-amber-700 flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">pending_actions</span>
              </div>
            </div>
          </div>

          {/* Project Starter Options Grid (Rich Information Density) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Option 1: Create Custom Project */}
            <div className="bg-surface rounded-xl p-4 sm:p-4.5 border border-outline-variant/40 flex flex-col justify-between hover:border-primary/40 transition-colors shadow-2xs">
              <div>
                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2.5">
                  <span className="material-symbols-outlined text-[20px]">create_new_folder</span>
                </div>
                <h3 className="text-sm font-bold text-on-surface mb-1">
                  Start From Scratch
                </h3>
                <p className="text-xs text-secondary leading-relaxed mb-3">
                  Define custom project parameters, lead engineer, target exit date, and scope boundaries.
                </p>

                {/* Feature checklist */}
                <ul className="space-y-1.5 mb-4 text-xs text-secondary">
                  <li className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px] text-primary shrink-0">check_circle</span>
                    <span>Custom exit target date &amp; milestones</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px] text-primary shrink-0">check_circle</span>
                    <span>Lead engineer &amp; outgoing team roster</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px] text-primary shrink-0">check_circle</span>
                    <span>Scoped knowledge handover goals</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => {
                  if (currentUserRole === 'EXTERNAL') return;
                  setShowCreateProjectModal(true);
                }}
                disabled={currentUserRole === 'EXTERNAL'}
                className="w-full inline-flex items-center justify-center gap-1.5 h-9 bg-primary hover:bg-primary-hover text-on-primary rounded-lg text-xs font-medium transition-colors shadow-2xs"
              >
                <span>Create Custom Project</span>
                <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
              </button>
            </div>

            {/* Option 2: Load Demo Project */}
            <div className="bg-surface rounded-xl p-4 sm:p-4.5 border border-outline-variant/40 flex flex-col justify-between hover:border-primary/40 transition-colors shadow-2xs">
              <div>
                <div className="w-9 h-9 rounded-lg bg-surface-container-low text-primary flex items-center justify-center mb-2.5">
                  <span className="material-symbols-outlined text-[20px]">dataset</span>
                </div>
                <h3 className="text-sm font-bold text-on-surface mb-1">
                  Load Pre-Seeded Demo Project
                </h3>
                <p className="text-xs text-secondary leading-relaxed mb-3">
                  Instantly populate the workspace with the official KnoTrail Core project containing 14 verified findings.
                </p>

                {/* Feature checklist */}
                <ul className="space-y-1.5 mb-4 text-xs text-secondary">
                  <li className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px] text-primary shrink-0">check_circle</span>
                    <span>14 ground-truth findings &amp; decisions</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px] text-primary shrink-0">check_circle</span>
                    <span>Pre-configured governance audit trail</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px] text-primary shrink-0">check_circle</span>
                    <span>Instant hackathon evaluator setup</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => resetDemoData()}
                className="w-full inline-flex items-center justify-center gap-1.5 h-9 bg-surface-container-low hover:bg-surface-container text-on-surface rounded-lg text-xs font-medium border border-outline-variant/40 transition-colors"
              >
                <span>Load Sample Project</span>
                <span className="material-symbols-outlined text-[15px] text-primary">auto_fix_high</span>
              </button>
            </div>

            {/* Option 3: Ingest Documents */}
            <div className="bg-surface rounded-xl p-4 sm:p-4.5 border border-outline-variant/40 flex flex-col justify-between hover:border-primary/40 transition-colors shadow-2xs">
              <div>
                <div className="w-9 h-9 rounded-lg bg-surface-container-low text-primary flex items-center justify-center mb-2.5">
                  <span className="material-symbols-outlined text-[20px]">hub</span>
                </div>
                <h3 className="text-sm font-bold text-on-surface mb-1">
                  Connect GitHub &amp; Documents
                </h3>
                <p className="text-xs text-secondary leading-relaxed mb-3">
                  Ingest commits, pull requests, issues, and PDF/Markdown files directly into your workspace repository.
                </p>

                {/* Feature checklist */}
                <ul className="space-y-1.5 mb-4 text-xs text-secondary">
                  <li className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px] text-primary shrink-0">check_circle</span>
                    <span>Real-time webhook &amp; commit sync</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px] text-primary shrink-0">check_circle</span>
                    <span>PDF, Markdown, &amp; notes parsers</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px] text-primary shrink-0">check_circle</span>
                    <span>Automated evidence drift detection</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => setActiveView('sources')}
                className="w-full inline-flex items-center justify-center gap-1.5 h-9 bg-surface-container-low hover:bg-surface-container text-on-surface rounded-lg text-xs font-medium border border-outline-variant/40 transition-colors"
              >
                <span>Open Source Manager</span>
                <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
              </button>
            </div>
          </div>

          {/* Handover Workflow Guidance Card */}
          <div className="bg-surface rounded-xl p-4 sm:p-4.5 border border-outline-variant/40 shadow-2xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-secondary font-mono mb-2.5">
              KnoTrail Operational Handover Cycle
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="p-3 rounded-lg bg-surface-container-low/40 border border-outline-variant/20">
                <span className="font-bold text-primary block mb-0.5">1. Setup Project</span>
                <span className="text-secondary leading-snug">Configure target exit date and project leads.</span>
              </div>
              <div className="p-3 rounded-lg bg-surface-container-low/40 border border-outline-variant/20">
                <span className="font-bold text-primary block mb-0.5">2. Ingest Sources</span>
                <span className="text-secondary leading-snug">Connect GitHub repos and architectural docs.</span>
              </div>
              <div className="p-3 rounded-lg bg-surface-container-low/40 border border-outline-variant/20">
                <span className="font-bold text-primary block mb-0.5">3. Extract Knowledge</span>
                <span className="text-secondary leading-snug">Run AI extraction for decisions and risks.</span>
              </div>
              <div className="p-3 rounded-lg bg-surface-container-low/40 border border-outline-variant/20">
                <span className="font-bold text-primary block mb-0.5">4. Certify Handover</span>
                <span className="text-secondary leading-snug">Review, approve, and export the formal dossier.</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ─────────────────────────────────────────────────────────────────────────
            3. ACTIVE PROJECT VIEW (Full Details, Stakeholders & Findings)
        ───────────────────────────────────────────────────────────────────────── */
        <div className="flex flex-col gap-4 sm:gap-4.5">
          {/* Master Project Card */}
          <section className="bg-surface rounded-xl p-4 sm:p-5 border border-outline-variant/40 shadow-xs">
            <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-5">
              <div className="flex flex-col gap-2 max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-semibold uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse shrink-0"></span>
                    Handover Active • Target: {project.targetExitDate}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-surface-container-low text-secondary border border-outline-variant/30 font-mono text-[11px]">
                    {project.version}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-surface-container-low text-secondary border border-outline-variant/30 font-mono text-[11px]">
                    {project.code}
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight mt-0.5">
                  {project.name}
                </h2>
                <p className="text-xs sm:text-sm text-secondary leading-relaxed">
                  {project.description}
                </p>

                {/* Metadata Row */}
                <div className="flex flex-wrap items-center gap-y-2 gap-x-4 pt-1 text-xs text-secondary">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px] text-primary">schedule</span>
                    <span>
                      Last analysed: <strong className="text-on-surface font-medium">{project.lastAnalysed}</strong>
                    </span>
                  </div>
                  <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-outline-variant/60"></span>
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px] text-secondary">group</span>
                    <span>{project.stakeholders.length} Team Members</span>
                  </div>
                  <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-outline-variant/60"></span>
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[15px] text-primary">hub</span>
                    <span>{project.sources.length} Ingested Documents</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 self-start xl:self-center w-full xl:w-auto shrink-0">
                <button
                  onClick={() => setActiveView('analysis')}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 bg-primary hover:bg-primary-hover text-on-primary px-4 h-9 rounded-lg text-xs font-medium transition-colors shadow-2xs"
                  id="reanalyze-btn"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    auto_awesome
                  </span>
                  <span>AI Analysis</span>
                </button>
                <button
                  onClick={() => setActiveView('review')}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 bg-surface-container-low hover:bg-surface-container text-on-surface px-3.5 h-9 rounded-lg text-xs font-medium border border-outline-variant/40 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">rule</span>
                  <span>Review Center</span>
                </button>
              </div>
            </div>

            {/* Stakeholders Strip */}
            <div className="mt-4 bg-surface-container-low/40 rounded-xl p-3 sm:p-3.5 border border-outline-variant/30 flex flex-col gap-2.5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] uppercase tracking-wider text-secondary font-semibold font-mono">
                    Project Team &amp; Handover Roster
                  </span>
                  <span className="text-xs text-secondary">
                    ({project.stakeholders.length > 0 ? project.stakeholders.length : 1} registered)
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-secondary">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                  <span>Human review mandatory for sign-off</span>
                </div>
              </div>

              {project.stakeholders.length === 0 ? (
                <div className="p-3.5 rounded-lg bg-surface border border-outline-variant/30 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[18px]">person</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-on-surface truncate">
                          {project.lead.name}
                        </span>
                        <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.2 rounded-full font-semibold">
                          {project.lead.role}
                        </span>
                      </div>
                      <p className="text-xs text-secondary mt-0.5 truncate">{project.lead.transitionNotes}</p>
                    </div>
                  </div>
                  <span className="text-xs text-secondary font-mono hidden sm:inline">{project.lead.email}</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {project.stakeholders.map((s) => (
                    <div
                      key={s.id}
                      className={`p-3 rounded-lg border transition-all flex items-start gap-2.5 ${
                        s.outgoing
                          ? 'bg-primary/5 border-primary/30'
                          : 'bg-surface border-outline-variant/30'
                      }`}
                    >
                      <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                        <span className="material-symbols-outlined text-[16px]">person</span>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-on-surface truncate">
                            {s.name}
                          </span>
                          {s.outgoing && (
                            <span className="text-[9px] bg-primary text-on-primary px-1.5 py-0.2 rounded font-bold uppercase shrink-0">
                              Exit
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-secondary truncate">{s.role}</span>
                        <p className="text-[11px] text-secondary mt-0.5 line-clamp-2 leading-tight">
                          {s.transitionNotes}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Findings Explorer Section */}
          <section className="bg-surface rounded-xl p-4 sm:p-4.5 border border-outline-variant/40 shadow-xs flex flex-col gap-3.5">
            {/* Tabs & Search */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-outline-variant/30 pb-3">
              {/* Category Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar -mx-2 px-2 pb-1 md:pb-0">
                {[
                  { id: 'all', label: 'All Artifacts', count: project.findings.length },
                  { id: 'decision', label: 'Decisions', count: project.findings.filter((f) => f.type === 'decision').length },
                  { id: 'task', label: 'Tasks', count: project.findings.filter((f) => f.type === 'task').length },
                  { id: 'risk', label: 'Risks', count: project.findings.filter((f) => f.type === 'risk').length },
                  { id: 'dependency', label: 'Dependencies', count: project.findings.filter((f) => f.type === 'dependency').length },
                  { id: 'unresolved_question', label: 'Questions', count: project.findings.filter((f) => f.type === 'unresolved_question').length },
                  { id: 'next_action', label: 'Next Actions', count: project.findings.filter((f) => f.type === 'next_action').length },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedTab(tab.id as 'all' | FindingType)}
                    className={`h-8 px-3 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                      selectedTab === tab.id
                        ? 'bg-primary text-on-primary shadow-2xs font-semibold'
                        : 'text-secondary hover:bg-surface-container-low hover:text-on-surface'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        selectedTab === tab.id ? 'bg-primary-hover text-on-primary' : 'bg-surface-container text-secondary'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Filter Search */}
              <div className="relative">
                <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-secondary text-[15px]">
                  search
                </span>
                <input
                  type="text"
                  value={workspaceSearch}
                  onChange={(e) => setWorkspaceSearch(e.target.value)}
                  placeholder="Filter findings..."
                  className="pl-8 pr-3 h-8 bg-surface-container-low text-xs rounded-lg border border-outline-variant/30 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary w-full md:w-56 transition-colors"
                />
              </div>
            </div>

            {/* Findings Grid */}
            {filteredFindings.length === 0 ? (
              <div className="bg-surface-container-low/40 rounded-xl p-8 border border-outline-variant/30 text-center flex flex-col items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[28px] text-secondary">search_off</span>
                <h4 className="text-sm font-semibold text-on-surface">No matching findings</h4>
                <p className="text-xs text-secondary max-w-md leading-relaxed">
                  Run AI Analysis on uploaded documents to discover decisions, operational tasks, risks, and dependencies.
                </p>
                <button
                  onClick={() => setActiveView('sources')}
                  className="mt-2 inline-flex items-center gap-1.5 px-3.5 h-8 rounded-lg bg-primary text-on-primary text-xs font-medium hover:bg-primary-hover transition-colors shadow-2xs"
                >
                  <span className="material-symbols-outlined text-[15px]">upload_file</span>
                  <span>Upload Documents</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredFindings.map((finding) => (
                  <div
                    key={finding.id}
                    className="bg-surface rounded-xl p-4 sm:p-5 border border-outline-variant/40 transition-colors flex flex-col justify-between group shadow-2xs hover:border-outline-variant/70"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2.5">
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
                          <span className="text-[11px] text-secondary font-mono">{finding.category}</span>
                        </div>
                        <span className="text-[11px] font-semibold text-primary">{finding.confidence}% confidence</span>
                      </div>

                      <h3 className="text-sm font-semibold text-on-surface group-hover:text-primary transition-colors">
                        {finding.title}
                      </h3>
                      <p className="text-xs text-secondary mt-1 leading-relaxed">
                        {finding.summary}
                      </p>

                      {finding.reasoning && (
                        <div className="mt-2.5 text-xs bg-surface-container-low/50 p-2.5 rounded-lg border border-outline-variant/30">
                          <strong className="text-on-surface font-medium">Rationale: </strong>
                          <span className="text-secondary">{finding.reasoning}</span>
                        </div>
                      )}
                    </div>

                    {/* Card Footer: Citations, Owner, Review action */}
                    <div className="mt-4 pt-3 border-t border-outline-variant/30 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-secondary">
                        <span className="material-symbols-outlined text-[15px]">person</span>
                        <span className="truncate max-w-[100px]">{finding.owner}</span>
                        <span>•</span>
                        <span>{finding.citations.length} citation(s)</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedFinding(finding);
                            setActiveView('evidence');
                          }}
                          className="px-2.5 h-7 bg-surface-container-low hover:bg-surface-container rounded-md text-on-surface text-[11px] font-medium transition-colors border border-outline-variant/30"
                        >
                          Citations
                        </button>
                        <button
                          onClick={() => {
                            setSelectedFinding(finding);
                            setActiveView('review');
                          }}
                          className="px-2.5 h-7 bg-primary text-on-primary hover:bg-primary-hover rounded-md text-[11px] font-medium transition-colors shadow-2xs"
                        >
                          Review
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
