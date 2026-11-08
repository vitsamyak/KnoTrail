'use client';

import React from 'react';
import { useProject } from '../../context/ProjectContext';

export function DashboardView() {
  const { project, stats, setActiveView, runAiSync, isSyncing } = useProject();

  return (
    <div className="flex flex-col w-full gap-space-lg animate-in fade-in duration-200">
      {/* Top Banner / Greeting Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md bg-surface-container-lowest p-space-lg rounded-xl shadow-sm border border-outline-variant/30">
        <div className="flex flex-col">
          <div className="flex items-center gap-space-xs">
            <span className="inline-flex items-center justify-center w-2 h-2 rounded-full bg-primary animate-ping"></span>
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-semibold">
              Active Handover Sprint • Target Exit {project.targetExitDate}
            </span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight mt-1">
            Hello, {project.lead.name.split(' ')[0]}! Your Project Knowledge at a Glance
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
            Real-time reconstruction of {project.name} status from connected engineering streams.
          </p>
        </div>

        {/* Action Group */}
        <div className="flex items-center gap-space-xs flex-wrap">
          <button
            onClick={() => runAiSync()}
            disabled={isSyncing}
            className="inline-flex items-center gap-space-2xs px-space-md py-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-label-md transition-all shadow-sm border border-outline-variant/30 group disabled:opacity-60"
            id="sync-button"
            type="button"
          >
            <span
              className={`material-symbols-outlined text-[18px] text-primary ${
                isSyncing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'
              }`}
            >
              sync
            </span>
            <span>{isSyncing ? 'Syncing...' : 'Run AI Sync'}</span>
          </button>
          <button
            onClick={() => setActiveView('evidence')}
            className="inline-flex items-center gap-space-2xs px-space-md py-2 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-label-md transition-all shadow-sm border border-outline-variant/30"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px] text-tertiary">science</span>
            <span>Explore Demo Data</span>
          </button>
          <button
            onClick={() => setActiveView('handover')}
            className="inline-flex items-center gap-space-2xs px-space-md py-2 rounded-lg bg-primary hover:bg-on-primary-fixed-variant text-on-primary font-label-md text-label-md transition-all shadow-sm"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">ios_share</span>
            <span>Export Summary</span>
          </button>
        </div>
      </div>

      {/* REFERENCE INSPIRATION MINI-DRAWER (Telemetry Matrix) */}
      <div className="bg-surface-container-low rounded-xl p-space-md flex flex-col md:flex-row items-center justify-between gap-space-md border border-outline-variant/30">
        <div className="flex items-center gap-space-md">
          <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
            <span className="material-symbols-outlined text-[26px]">hub</span>
          </div>
          <div>
            <p className="font-label-md text-label-md text-on-surface font-semibold">
              Modular Telemetry Matrix Active
            </p>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Reconstructing true operational state with zero ungrounded claims. Verified by Team Deploy_or_Die.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-space-xs self-end md:self-center">
          <span className="font-label-sm text-label-sm text-secondary bg-surface-container-lowest px-space-sm py-1 rounded-full border border-outline-variant/20">
            Stream Density: 99.4%
          </span>
          <span className="font-label-sm text-label-sm text-primary bg-primary-fixed px-space-sm py-1 rounded-full font-semibold">
            Auto-Sync On
          </span>
        </div>
      </div>

      {/* TOP 4 SUMMARY METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-gutter">
        {/* Card 1: Sources Analysed */}
        <div
          onClick={() => setActiveView('sources')}
          className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm hover:shadow-md border border-outline-variant/30 transition-all duration-300 flex flex-col justify-between group cursor-pointer"
        >
          <div>
            <div className="flex items-center justify-between mb-space-sm">
              <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider font-semibold">
                Sources Analysed
              </span>
              <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center text-primary group-hover:bg-primary-fixed transition-colors">
                <span className="material-symbols-outlined text-[18px]">dataset</span>
              </div>
            </div>
            <div className="flex items-baseline gap-space-xs">
              <span className="font-metric-xl text-metric-xl text-on-surface">{stats.totalSources} Active</span>
              <span className="font-label-sm text-label-sm text-primary font-semibold flex items-center">
                <span className="material-symbols-outlined text-[14px]">arrow_upward</span>+2 this wk
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
              GitHub, Linear, Slack, Notion synced
            </p>
          </div>
          <div className="mt-space-md pt-space-xs flex items-center justify-between border-t border-outline-variant/20">
            <div className="flex -space-x-1.5 overflow-hidden">
              <div className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-surface-container text-[10px] font-semibold text-secondary">
                GH
              </div>
              <div className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-secondary-container text-[10px] font-semibold text-on-secondary-container">
                LN
              </div>
              <div className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary-fixed text-[10px] font-semibold text-on-primary-fixed">
                SL
              </div>
              <div className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-surface-container-high text-[10px] font-semibold text-on-surface-variant">
                NT
              </div>
            </div>
            {/* Sparkline SVG */}
            <svg
              className="w-20 h-6 text-primary"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="2"
              viewBox="0 0 80 24"
            >
              <path d="M2 18 L18 14 L34 16 L50 8 L66 12 L78 4"></path>
            </svg>
          </div>
        </div>

        {/* Card 2: Decisions Found */}
        <div
          onClick={() => setActiveView('analysis')}
          className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm hover:shadow-md border border-outline-variant/30 transition-all duration-300 flex flex-col justify-between group cursor-pointer"
        >
          <div>
            <div className="flex items-center justify-between mb-space-sm">
              <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider font-semibold">
                Decisions Found
              </span>
              <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center text-primary group-hover:bg-primary-fixed transition-colors">
                <span className="material-symbols-outlined text-[18px]">gavel</span>
              </div>
            </div>
            <div className="flex items-baseline gap-space-xs">
              <span className="font-metric-xl text-metric-xl text-on-surface">
                {stats.decisionsCount} Reconstructed
              </span>
              <span className="font-label-sm text-label-sm text-primary font-semibold flex items-center">
                <span className="material-symbols-outlined text-[14px]">check</span>98% Grounded
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
              Auth, Database freeze, Kafka rebalance
            </p>
          </div>
          <div className="mt-space-md pt-space-xs flex items-center justify-between border-t border-outline-variant/20">
            <span className="text-xs text-outline">Verified citations</span>
            <svg
              className="w-20 h-6 text-primary"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="2"
              viewBox="0 0 80 24"
            >
              <path d="M2 20 L16 16 L32 18 L48 10 L64 8 L78 2"></path>
            </svg>
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
              <span className="font-metric-xl text-metric-xl text-on-surface">{stats.tasksCount} Assigned</span>
              <span className="font-label-sm text-label-sm text-error font-semibold flex items-center">
                <span className="material-symbols-outlined text-[14px]">priority_high</span>Critical DB
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
              DB rollback key, IAM elevation
            </p>
          </div>
          <div className="mt-space-md pt-space-xs flex items-center justify-between border-t border-outline-variant/20">
            <span className="text-xs text-outline">Owner: Marcus Vance</span>
            <span className="text-xs bg-error-container text-on-error-container px-2 py-0.5 rounded-full font-semibold">
              High Priority
            </span>
          </div>
        </div>

        {/* Card 4: Review Certification */}
        <div
          onClick={() => setActiveView('review')}
          className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm hover:shadow-md border border-outline-variant/30 transition-all duration-300 flex flex-col justify-between group cursor-pointer"
        >
          <div>
            <div className="flex items-center justify-between mb-space-sm">
              <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider font-semibold">
                Human Sign-Off
              </span>
              <div className="w-8 h-8 rounded-lg bg-surface-container-low flex items-center justify-center text-primary group-hover:bg-primary-fixed transition-colors">
                <span className="material-symbols-outlined text-[18px]">verified_user</span>
              </div>
            </div>
            <div className="flex items-baseline gap-space-xs">
              <span className="font-metric-xl text-metric-xl text-on-surface">
                {stats.certificationProgressPercent}%
              </span>
              <span className="font-label-sm text-label-sm text-secondary font-semibold">
                {stats.approvedCount}/{stats.totalFindings} Certified
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
              Mandatory review prior to handover
            </p>
          </div>
          <div className="mt-space-md pt-space-xs flex items-center justify-between border-t border-outline-variant/20">
            <span className="text-xs text-tertiary font-medium">1 Conflict to Resolve</span>
            <span className="material-symbols-outlined text-[16px] text-outline group-hover:translate-x-1 transition-transform">
              arrow_forward
            </span>
          </div>
        </div>
      </div>

      {/* MID SECTION: SPRINT STATUS & REAL-TIME AUDIT STREAM */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        {/* Left: Active Sprint Milestone Card (Inverted Deep Sage) */}
        <div className="lg:col-span-5 bg-inverse-surface text-inverse-on-surface rounded-xl p-space-xl flex flex-col justify-between shadow-md relative overflow-hidden">
          <div className="relative z-10 flex flex-col gap-space-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-widest text-primary-fixed font-semibold">
                Handover Milestone Radar
              </span>
              <span className="bg-primary/30 text-primary-fixed text-xs px-2.5 py-0.5 rounded-full border border-primary/40 font-mono">
                Sprint 37
              </span>
            </div>
            <h3 className="font-headline-lg text-headline-lg text-white font-semibold">
              {project.name}
            </h3>
            <p className="text-inverse-on-surface/80 text-body-sm leading-relaxed">
              Elena Rostova &rarr; Marcus Vance knowledge transition. Reconstructing critical Rust ledger internals, database freeze policies, and secrets clearance.
            </p>

            {/* Checklist items */}
            <div className="space-y-2 mt-space-md font-body-sm text-xs">
              <div className="flex items-center gap-2 text-primary-fixed">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                <span>Swapped Auth0 for local JWT service (Verified)</span>
              </div>
              <div className="flex items-center gap-2 text-primary-fixed">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                <span>PostgreSQL 16 Schema Freeze Enforced (Verified)</span>
              </div>
              <div className="flex items-center gap-2 text-tertiary-fixed">
                <span className="material-symbols-outlined text-[16px]">pending</span>
                <span>Resolve Redis Cache volatile-lru conflict (Review Center)</span>
              </div>
              <div className="flex items-center gap-2 text-tertiary-fixed">
                <span className="material-symbols-outlined text-[16px]">pending</span>
                <span>DB rollback key test run with Marcus Vance (Critical)</span>
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-space-xl pt-space-md border-t border-white/10 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] text-inverse-on-surface/60 uppercase">Target Handover Exit</span>
              <span className="text-sm font-semibold text-white">{project.targetExitDate}</span>
            </div>
            <button
              onClick={() => setActiveView('review')}
              className="px-4 py-2 bg-primary hover:bg-primary-container text-on-primary rounded-lg text-xs font-semibold transition-all shadow-sm flex items-center gap-1.5"
            >
              <span>Review Findings</span>
              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </button>
          </div>
        </div>

        {/* Right: Real-time Activity Feed / Handover Audit Stream */}
        <div className="lg:col-span-7 bg-surface-container-lowest rounded-xl p-space-lg shadow-sm border border-outline-variant/30 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-space-md">
              <div className="flex items-center gap-2">
                <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                  Recent Knowledge Reconstructions
                </span>
                <span className="text-xs bg-surface-container text-outline px-2 py-0.5 rounded-full">
                  Live Sources
                </span>
              </div>
              <button
                onClick={() => setActiveView('evidence')}
                className="text-xs text-primary font-semibold hover:underline flex items-center gap-0.5"
              >
                <span>View all evidence</span>
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              </button>
            </div>

            {/* Stream List */}
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
                        <span>Citation: {f.citations[0]?.file || 'Git history'}</span>
                        <span>•</span>
                        <span>Confidence: {f.confidence}%</span>
                      </div>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-[16px] text-outline group-hover:translate-x-1 transition-transform self-center">
                    chevron_right
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-space-md pt-space-xs border-t border-outline-variant/20 flex items-center justify-between text-xs text-outline">
            <span>Last automated sync: {project.lastAnalysed}</span>
            <span className="font-mono text-primary">KnoTrail Engine v2.4</span>
          </div>
        </div>
      </div>

      {/* BOTTOM: QUICK ACTION MATRIX */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-gutter">
        <button
          onClick={() => setActiveView('workspace')}
          className="p-space-md bg-surface-container-lowest hover:bg-surface-container rounded-xl border border-outline-variant/30 text-left transition-all shadow-xs group"
        >
          <span className="material-symbols-outlined text-[24px] text-primary mb-2 group-hover:scale-110 transition-transform">
            folder_open
          </span>
          <p className="font-label-md text-label-md text-on-surface font-semibold">Project Workspace</p>
          <p className="text-xs text-on-surface-variant mt-0.5">View full project metadata &amp; stakeholders</p>
        </button>

        <button
          onClick={() => setActiveView('sources')}
          className="p-space-md bg-surface-container-lowest hover:bg-surface-container rounded-xl border border-outline-variant/30 text-left transition-all shadow-xs group"
        >
          <span className="material-symbols-outlined text-[24px] text-primary mb-2 group-hover:scale-110 transition-transform">
            dataset
          </span>
          <p className="font-label-md text-label-md text-on-surface font-semibold">Connect Sources</p>
          <p className="text-xs text-on-surface-variant mt-0.5">Manage GitHub, Slack, Notion pipelines</p>
        </button>

        <button
          onClick={() => setActiveView('review')}
          className="p-space-md bg-surface-container-lowest hover:bg-surface-container rounded-xl border border-outline-variant/30 text-left transition-all shadow-xs group"
        >
          <span className="material-symbols-outlined text-[24px] text-tertiary mb-2 group-hover:scale-110 transition-transform">
            rule
          </span>
          <p className="font-label-md text-label-md text-on-surface font-semibold">Resolve Conflicts</p>
          <p className="text-xs text-on-surface-variant mt-0.5">Approve claims &amp; certify findings</p>
        </button>

        <button
          onClick={() => setActiveView('handover')}
          className="p-space-md bg-surface-container-lowest hover:bg-surface-container rounded-xl border border-outline-variant/30 text-left transition-all shadow-xs group"
        >
          <span className="material-symbols-outlined text-[24px] text-primary mb-2 group-hover:scale-110 transition-transform">
            description
          </span>
          <p className="font-label-md text-label-md text-on-surface font-semibold">Handover Dossier</p>
          <p className="text-xs text-on-surface-variant mt-0.5">Export certified PDF, Markdown &amp; JSON</p>
        </button>
      </div>
    </div>
  );
}
