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
    showCreateProjectModal,
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
    <div className="flex flex-col w-full gap-space-lg animate-in fade-in duration-200">
      {/* 1. EMPTY STATE (When no projects created yet) */}
      {!isProjectCreated ? (
        <section className="bg-surface-container-lowest rounded-xl p-space-2xl border border-outline-variant/30 shadow-sm flex flex-col items-center text-center max-w-2xl mx-auto my-space-xl">
          <div className="w-16 h-16 rounded-2xl bg-surface-container-low text-primary flex items-center justify-center mb-space-md shadow-xs">
            <span className="material-symbols-outlined text-[36px]">folder_off</span>
          </div>
          <h1 className="font-display-lg text-display-lg text-on-surface tracking-tight">
            No projects yet.
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-md mt-2 leading-relaxed">
            Create your first project to start organising and preserving project knowledge.
          </p>
          <div className="flex items-center gap-space-sm mt-space-lg">
            <button
              onClick={() => setShowCreateProjectModal(true)}
              className="inline-flex items-center gap-2 px-space-xl py-space-sm bg-primary hover:bg-primary-container text-on-primary rounded-lg font-headline-sm text-headline-sm shadow-sm transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">create_new_folder</span>
              <span>Create Project</span>
            </button>
            <button
              onClick={() => setActiveView('sources')}
              className="inline-flex items-center gap-2 px-space-md py-space-sm bg-surface-container hover:bg-surface-container-high text-on-surface rounded-lg font-label-md text-label-md transition-colors border border-outline-variant/30"
            >
              <span className="material-symbols-outlined text-[18px]">upload_file</span>
              <span>Upload Documents</span>
            </button>
          </div>
        </section>
      ) : (
        <>
          {/* Dynamic Top Banner / Master Project Header */}
          <section className="relative bg-surface-container-lowest rounded-xl p-4 sm:p-space-xl shadow-[0_10px_30px_-4px_rgba(32,40,34,0.04),0_4px_10px_-2px_rgba(32,40,34,0.02)] border border-outline-variant/30 overflow-hidden">
            {/* Ambient organic backdrop highlight */}
            <div className="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-primary/5 blur-3xl pointer-events-none"></div>

            <div className="relative flex flex-col xl:flex-row xl:items-start justify-between gap-space-lg">
              <div className="flex flex-col gap-space-xs max-w-3xl">
                <div className="flex flex-wrap items-center gap-space-xs">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm uppercase tracking-wide font-semibold text-xs">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0"></span>
                    Handover Active • Target Date: {project.targetExitDate}
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm border border-outline-variant/20 font-mono text-xs">
                    {project.version}
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-label-sm font-mono text-xs">
                    {project.code}
                  </span>
                </div>

                <h1 className="font-display-lg text-display-lg text-on-surface tracking-tight mt-1">
                  {project.name}
                </h1>
                <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed">
                  {project.description}
                </p>

                {/* Meta Bar */}
                <div className="flex flex-wrap items-center gap-y-2 gap-x-space-md pt-space-xs text-outline font-label-md text-label-md text-xs sm:text-sm">
                  <div className="flex items-center gap-1.5 text-on-surface-variant">
                    <span className="material-symbols-outlined text-[18px] text-primary">schedule</span>
                    <span>
                      Last analysed: <strong className="text-on-surface font-medium">{project.lastAnalysed}</strong>
                    </span>
                  </div>
                  <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-outline-variant"></span>
                  <div className="flex items-center gap-1.5 text-on-surface-variant">
                    <span className="material-symbols-outlined text-[18px]">group</span>
                    <span>{project.stakeholders.length} Registered Stakeholders</span>
                  </div>
                  <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-outline-variant"></span>
                  <div className="flex items-center gap-1.5 text-on-surface-variant">
                    <span className="material-symbols-outlined text-[18px] text-secondary">hub</span>
                    <span>{project.sources.length} Uploaded Documents</span>
                  </div>
                </div>
              </div>

              {/* Action Group */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-space-sm self-start xl:self-center w-full xl:w-auto">
                <button
                  onClick={() => setShowCreateProjectModal(true)}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 bg-surface-container hover:bg-surface-container-high text-on-surface px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-lg font-headline-sm text-headline-sm border border-outline-variant/30 transition-all text-xs sm:text-sm min-h-[40px]"
                >
                  <span className="material-symbols-outlined text-[18px] sm:text-[20px]">add</span>
                  <span>New Project</span>
                </button>
                <button
                  onClick={() => setActiveView('analysis')}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-container text-on-primary hover:text-on-primary-container px-4 py-2 sm:px-5 sm:py-2.5 rounded-lg font-headline-sm text-headline-sm transition-all shadow-sm active:scale-[0.98] text-xs sm:text-sm min-h-[40px]"
                  id="reanalyze-btn"
                >
                  <span className="material-symbols-outlined text-[18px] sm:text-[20px]" id="ai-icon">
                    auto_awesome
                  </span>
                  <span>AI Analysis</span>
                </button>
                <button
                  onClick={() => setActiveView('sources')}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 bg-surface-container hover:bg-surface-container-high text-on-surface px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-lg font-headline-sm text-headline-sm border border-outline-variant/30 transition-all text-xs sm:text-sm min-h-[40px]"
                >
                  <span className="material-symbols-outlined text-[18px] sm:text-[20px]">upload_file</span>
                  <span>Manage Sources</span>
                </button>
              </div>
            </div>

            {/* Stakeholders Strip */}
            <div className="mt-space-lg pt-space-md bg-surface-container-low/70 rounded-xl p-space-md border border-outline-variant/30 flex flex-col gap-space-md">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div className="flex flex-col">
                  <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider font-semibold">
                    Project Team &amp; Stewards
                  </span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    Team members responsible for this project and knowledge transition
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-outline">
                  <span className="w-2 h-2 rounded-full bg-primary"></span>
                  <span>
                    {project.stakeholders.length > 0
                      ? `${project.stakeholders.length} stakeholder(s) registered`
                      : 'Handover Lead configured'}
                  </span>
                </div>
              </div>

              {project.stakeholders.length === 0 ? (
                <div className="p-space-md rounded-lg bg-surface-container-lowest border border-outline-variant/30 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[22px]">person</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-label-md text-label-md text-on-surface font-semibold">
                          {project.lead.name}
                        </span>
                        <span className="text-[10px] bg-secondary-container text-on-secondary-container px-2 py-0.2 rounded-full font-bold">
                          {project.lead.role}
                        </span>
                      </div>
                      <p className="text-xs text-on-surface-variant mt-0.5">{project.lead.transitionNotes}</p>
                    </div>
                  </div>
                  <span className="text-xs text-outline font-mono hidden sm:inline">{project.lead.email}</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-sm">
                  {project.stakeholders.map((s) => (
                    <div
                      key={s.id}
                      className={`p-space-sm rounded-lg border transition-all flex items-start gap-space-xs ${
                        s.outgoing
                          ? 'bg-primary-fixed/20 border-primary/30'
                          : 'bg-surface-container-lowest border-outline-variant/30'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[20px]">person</span>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="font-label-md text-label-md text-on-surface font-semibold truncate">
                            {s.name}
                          </span>
                          {s.outgoing && (
                            <span className="text-[9px] bg-primary text-on-primary px-1.5 py-0.2 rounded font-bold uppercase shrink-0">
                              Exit
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-outline truncate">{s.role}</span>
                        <p className="text-[11px] text-on-surface-variant mt-1 line-clamp-2 leading-tight">
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
          <section className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm border border-outline-variant/30 flex flex-col gap-space-md">
            {/* Navigation Tabs & Search */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-sm border-b border-outline-variant/20 pb-space-sm">
              {/* Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar -mx-2 px-2 pb-1 md:pb-0">
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
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      selectedTab === tab.id
                        ? 'bg-primary text-on-primary shadow-xs'
                        : 'text-on-surface-variant hover:bg-surface-container'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        selectedTab === tab.id ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Filter Search */}
              <div className="relative">
                <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-[16px]">
                  search
                </span>
                <input
                  type="text"
                  value={workspaceSearch}
                  onChange={(e) => setWorkspaceSearch(e.target.value)}
                  placeholder="Filter findings..."
                  className="pl-8 pr-3 py-1 bg-surface-container-low text-xs rounded-lg border border-outline-variant/30 text-on-surface focus:outline-none focus:ring-1 focus:ring-primary w-full md:w-56"
                />
              </div>
            </div>

            {/* Findings List */}
            {filteredFindings.length === 0 ? (
              <div className="bg-surface-container-low/50 rounded-xl p-space-2xl border border-outline-variant/30 text-center flex flex-col items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[32px] text-outline">search_off</span>
                <h4 className="font-headline-sm text-headline-sm text-on-surface">No findings recorded yet</h4>
                <p className="text-xs text-on-surface-variant max-w-md leading-relaxed">
                  Upload project documents in Sources and extract knowledge to discover decisions, operational tasks, risks, and dependencies.
                </p>
                <button
                  onClick={() => setActiveView('sources')}
                  className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:bg-primary-container transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">upload_file</span>
                  <span>Upload Project Documents</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-sm">
                {filteredFindings.map((finding) => (
                  <div
                    key={finding.id}
                    className="bg-surface-container-low/50 hover:bg-surface-container-low rounded-xl p-space-md border border-outline-variant/30 transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              finding.status === 'VERIFIED'
                                ? 'bg-secondary-container text-on-secondary-container'
                                : finding.status === 'CONFLICTING'
                                ? 'bg-error-container text-on-error-container'
                                : finding.status === 'UNCERTAIN'
                                ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                                : 'bg-surface-container text-outline'
                            }`}
                          >
                            {finding.status}
                          </span>
                          <span className="text-[11px] text-outline font-mono">{finding.category}</span>
                        </div>
                        <span className="text-xs font-semibold text-primary">{finding.confidence}% confidence</span>
                      </div>

                      <h3 className="font-headline-sm text-headline-sm text-on-surface group-hover:text-primary transition-colors">
                        {finding.title}
                      </h3>
                      <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 leading-relaxed">
                        {finding.summary}
                      </p>

                      {finding.reasoning && (
                        <div className="mt-2 text-xs bg-surface-container-lowest p-2 rounded border border-outline-variant/20">
                          <strong className="text-on-surface">Rationale: </strong>
                          <span className="text-on-surface-variant">{finding.reasoning}</span>
                        </div>
                      )}
                    </div>

                    {/* Card Footer: Citations, Owner, Review action */}
                    <div className="mt-space-md pt-space-xs border-t border-outline-variant/20 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-outline">
                        <span className="material-symbols-outlined text-[16px]">person</span>
                        <span>{finding.owner}</span>
                        <span>•</span>
                        <span>{finding.citations.length} citation(s)</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedFinding(finding);
                            setActiveView('evidence');
                          }}
                          className="px-2.5 py-1 bg-surface-container hover:bg-surface-container-high rounded text-on-surface text-[11px] font-medium transition-colors"
                        >
                          View Citations
                        </button>
                        <button
                          onClick={() => {
                            setSelectedFinding(finding);
                            setActiveView('review');
                          }}
                          className="px-2.5 py-1 bg-primary text-on-primary hover:bg-primary-container rounded text-[11px] font-medium transition-colors"
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
