'use client';

import React, { useState } from 'react';
import { useProject } from '../../context/ProjectContext';
import { FindingType } from '../../lib/types';

export function WorkspaceView() {
  const {
    project,
    setActiveView,
    setSelectedFinding,
    isProjectCreated,
    setShowCreateProjectModal,
  } = useProject();
  const [selectedTab, setSelectedTab] = useState<'all' | FindingType>('all');
  const [workspaceSearch, setWorkspaceSearch] = useState('');

  const filteredFindings = project.findings.filter((f) => {
    const matchesTab = selectedTab === 'all' || f.type === selectedTab;
    const matchesSearch =
      !workspaceSearch ||
      f.title.toLowerCase().includes(workspaceSearch.toLowerCase()) ||
      f.summary.toLowerCase().includes(workspaceSearch.toLowerCase()) ||
      f.category.toLowerCase().includes(workspaceSearch.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="flex flex-col w-full gap-5 animate-in fade-in duration-200">
      {/* 1. EMPTY STATE (When no projects created yet) */}
      {!isProjectCreated ? (
        <section className="bg-surface-container-lowest rounded-xl p-8 sm:p-12 border border-outline-variant/40 shadow-xs flex flex-col items-center text-center max-w-xl mx-auto my-6">
          <div className="w-14 h-14 rounded-xl bg-surface-container-low text-primary flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-[32px]">folder_off</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold text-on-surface tracking-tight">
            No projects yet.
          </h1>
          <p className="text-xs sm:text-sm text-secondary max-w-md mt-1.5 leading-relaxed">
            Create your first project to start organising and preserving verified project knowledge.
          </p>
          <div className="flex items-center gap-2.5 mt-6">
            <button
              onClick={() => setShowCreateProjectModal(true)}
              className="inline-flex items-center gap-1.5 px-4 h-9 bg-primary hover:bg-primary-hover text-on-primary rounded-lg text-xs font-medium shadow-xs transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">create_new_folder</span>
              <span>Create Project</span>
            </button>
            <button
              onClick={() => setActiveView('sources')}
              className="inline-flex items-center gap-1.5 px-3.5 h-9 bg-surface-container-low hover:bg-surface-container text-on-surface rounded-lg text-xs font-medium transition-colors border border-outline-variant/40"
            >
              <span className="material-symbols-outlined text-[18px]">upload_file</span>
              <span>Upload Documents</span>
            </button>
          </div>
        </section>
      ) : (
        <>
          {/* Master Project Header */}
          <section className="bg-surface-container-lowest rounded-xl p-5 sm:p-6 shadow-xs border border-outline-variant/40">
            <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-5">
              <div className="flex flex-col gap-2 max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-success/10 text-success border border-success/20 text-[10px] font-semibold uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse shrink-0"></span>
                    Handover Active • Target: {project.targetExitDate}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-surface-container-low text-secondary border border-outline-variant/40 font-mono text-[11px]">
                    {project.version}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-surface-container-low text-secondary border border-outline-variant/40 font-mono text-[11px]">
                    {project.code}
                  </span>
                </div>

                <h1 className="text-xl sm:text-2xl font-semibold text-on-surface tracking-tight mt-0.5">
                  {project.name}
                </h1>
                <p className="text-xs sm:text-sm text-secondary leading-relaxed">
                  {project.description}
                </p>

                {/* Meta Bar */}
                <div className="flex flex-wrap items-center gap-y-2 gap-x-4 pt-1 text-xs text-secondary">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-primary">schedule</span>
                    <span>
                      Last analysed: <strong className="text-on-surface font-medium">{project.lastAnalysed}</strong>
                    </span>
                  </div>
                  <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-outline-variant"></span>
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-secondary">group</span>
                    <span>{project.stakeholders.length} Team Members</span>
                  </div>
                  <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-outline-variant"></span>
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-primary">hub</span>
                    <span>{project.sources.length} Uploaded Documents</span>
                  </div>
                </div>
              </div>

              {/* Action Group */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 self-start xl:self-center w-full xl:w-auto shrink-0">
                <button
                  onClick={() => setShowCreateProjectModal(true)}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 bg-surface-container-low hover:bg-surface-container text-on-surface px-3.5 h-9 rounded-lg text-xs font-medium border border-outline-variant/40 transition-colors"
                >
                  <span className="material-symbols-outlined text-[17px]">add</span>
                  <span>New Project</span>
                </button>
                <button
                  onClick={() => setActiveView('analysis')}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 bg-primary hover:bg-primary-hover text-on-primary px-4 h-9 rounded-lg text-xs font-medium transition-colors shadow-xs"
                  id="reanalyze-btn"
                >
                  <span className="material-symbols-outlined text-[17px]" id="ai-icon">
                    auto_awesome
                  </span>
                  <span>AI Analysis</span>
                </button>
                <button
                  onClick={() => setActiveView('sources')}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 bg-surface-container-low hover:bg-surface-container text-on-surface px-3.5 h-9 rounded-lg text-xs font-medium border border-outline-variant/40 transition-colors"
                >
                  <span className="material-symbols-outlined text-[17px]">upload_file</span>
                  <span>Manage Sources</span>
                </button>
              </div>
            </div>

            {/* Stakeholders Strip */}
            <div className="mt-5 pt-4 bg-surface-container-low/50 rounded-xl p-4 border border-outline-variant/30 flex flex-col gap-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] uppercase tracking-wider text-secondary font-semibold">
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
                <div className="p-3.5 rounded-lg bg-surface-container-lowest border border-outline-variant/30 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[20px]">person</span>
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
                          : 'bg-surface-container-lowest border-outline-variant/30'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                        <span className="material-symbols-outlined text-[18px]">person</span>
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

          {/* WORKSPACE FINDINGS EXPLORER */}
          <section className="bg-surface-container-lowest rounded-xl p-5 sm:p-6 shadow-xs border border-outline-variant/40 flex flex-col gap-4">
            {/* Navigation Tabs & Search */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-outline-variant/30 pb-3">
              {/* Tabs */}
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
                    className={`h-8 px-3 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      selectedTab === tab.id
                        ? 'bg-primary text-on-primary shadow-xs'
                        : 'text-secondary hover:bg-surface-container-low hover:text-on-surface'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        selectedTab === tab.id ? 'bg-primary-hover text-on-primary' : 'bg-surface-container-low text-secondary'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Filter Search */}
              <div className="relative">
                <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-secondary text-[16px]">
                  search
                </span>
                <input
                  type="text"
                  value={workspaceSearch}
                  onChange={(e) => setWorkspaceSearch(e.target.value)}
                  placeholder="Filter findings..."
                  className="pl-8 pr-3 h-8 bg-surface-container-low text-xs rounded-lg border border-outline-variant/40 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary w-full md:w-56 transition-colors"
                />
              </div>
            </div>

            {/* Findings List */}
            {filteredFindings.length === 0 ? (
              <div className="bg-surface-container-low/40 rounded-xl p-8 border border-outline-variant/30 text-center flex flex-col items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[32px] text-secondary">search_off</span>
                <h4 className="text-sm font-semibold text-on-surface">No findings recorded</h4>
                <p className="text-xs text-secondary max-w-md leading-relaxed">
                  Upload project documents in Sources and extract knowledge to discover decisions, operational tasks, risks, and dependencies.
                </p>
                <button
                  onClick={() => setActiveView('sources')}
                  className="mt-2 inline-flex items-center gap-1.5 px-3.5 h-8 rounded-lg bg-primary text-on-primary text-xs font-medium hover:bg-primary-hover transition-colors shadow-xs"
                >
                  <span className="material-symbols-outlined text-[16px]">upload_file</span>
                  <span>Upload Documents</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredFindings.map((finding) => (
                  <div
                    key={finding.id}
                    className="bg-surface-container-lowest hover:border-outline-variant/70 rounded-xl p-4 sm:p-5 border border-outline-variant/40 transition-all flex flex-col justify-between group shadow-xs"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                              finding.status === 'VERIFIED'
                                ? 'bg-success/10 text-success border-success/20'
                                : finding.status === 'CONFLICTING'
                                ? 'bg-error/10 text-error border-error/20'
                                : finding.status === 'UNCERTAIN'
                                ? 'bg-warning/10 text-warning border-warning/20'
                                : 'bg-surface-container-low text-secondary border-outline-variant/40'
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
                        <div className="mt-2.5 text-xs bg-surface-container-low/60 p-2.5 rounded-lg border border-outline-variant/30">
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
                          className="px-2.5 h-7 bg-primary text-on-primary hover:bg-primary-hover rounded-md text-[11px] font-medium transition-colors shadow-xs"
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
        </>
      )}
    </div>
  );
}
