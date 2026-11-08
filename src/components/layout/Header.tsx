'use client';

import React, { useState } from 'react';
import { useProject } from '../../context/ProjectContext';

export function Header() {
  const {
    project,
    searchQuery,
    setSearchQuery,
    stats,
    setActiveView,
    isSyncing,
    runAiSync,
    isSaving,
    workspaceId,
  } = useProject();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const pendingReviewCount = stats.totalFindings - stats.approvedCount;

  return (
    <header className="fixed top-4 left-[18rem] right-4 h-16 bg-surface-container-lowest/95 backdrop-blur-xl rounded-xl shadow-[0_10px_30px_-4px_rgba(32,40,34,0.04),0_4px_10px_-2px_rgba(32,40,34,0.02)] border border-outline-variant/30 z-40 flex items-center justify-between px-space-lg transition-all">
      {/* Left Group: Active Project Selector & Search */}
      <div className="flex items-center gap-space-md">
        {/* Project Selector Pill */}
        <button
          onClick={() => setActiveView('workspace')}
          className="flex items-center gap-space-xs bg-surface-container-low px-space-md py-1.5 rounded-full text-on-surface hover:bg-surface-container transition-colors border border-outline-variant/20 group"
          title="Go to Project Workspace"
        >
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
          <span className="font-label-md text-label-md font-semibold text-on-surface truncate max-w-[200px]">
            {project.name}
          </span>
          <span className="material-symbols-outlined text-[18px] text-outline group-hover:text-primary transition-colors">
            folder_open
          </span>
        </button>

        {/* Global Search Bar */}
        <div className="relative hidden xl:flex items-center">
          <span className="material-symbols-outlined absolute left-3 text-outline text-[18px]">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search decisions, tasks, evidence..."
            className="bg-surface-container-low text-on-surface pl-9 pr-space-md py-1.5 rounded-full font-body-sm text-body-sm w-72 focus:outline-none focus:ring-2 focus:ring-primary/40 placeholder:text-outline/70 border border-transparent focus:border-primary/20 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 text-outline hover:text-on-surface"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </div>
      </div>

      {/* Right Group: Public Demo Indicator, Sync, Notifications, Profile */}
      <div className="flex items-center gap-space-md">
        {/* Sync Button */}
        <button
          onClick={() => runAiSync()}
          disabled={isSyncing}
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-low hover:bg-surface-container text-on-surface font-label-sm text-label-sm border border-outline-variant/20 transition-all disabled:opacity-60"
          title="Simulate Real-time AI Context Sync"
        >
          <span
            className={`material-symbols-outlined text-[16px] text-primary ${
              isSyncing ? 'animate-spin' : ''
            }`}
          >
            sync
          </span>
          <span>{isSyncing ? 'Syncing...' : 'Run AI Sync'}</span>
        </button>

        {/* Frictionless Zero-Auth Demo Badge */}
        <div className="hidden md:flex items-center gap-space-2xs bg-secondary-container/90 text-on-secondary-container px-space-sm py-1 rounded-full font-label-sm text-label-sm font-medium border border-primary/10 shadow-xs">
          <span className="material-symbols-outlined text-[14px]">public</span>
          <span>Demo Mode (Zero-Auth Open Access)</span>
        </div>

        {/* Persistence & Auto-Save Telemetry Badge */}
        <div
          className="hidden lg:flex items-center gap-1.5 bg-surface-container-low text-on-surface px-space-sm py-1 rounded-full font-label-sm text-label-sm border border-outline-variant/20 shadow-xs"
          title={`Isolated Anonymous Workspace: ${workspaceId}`}
        >
          <span
            className={`material-symbols-outlined text-[15px] ${
              isSaving ? 'animate-spin text-tertiary' : 'text-primary'
            }`}
          >
            {isSaving ? 'autorenew' : 'cloud_done'}
          </span>
          <span className="text-[11px] font-medium text-outline">
            {isSaving ? 'Saving...' : 'Auto-saved'}
          </span>
        </div>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label="Pending Reviews"
            className="relative p-2 rounded-full text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            {pendingReviewCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-tertiary ring-2 ring-surface-container-lowest animate-pulse"></span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-surface-container-lowest rounded-xl shadow-[0_10px_30px_-4px_rgba(32,40,34,0.12)] border border-outline-variant/40 p-space-md z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-outline-variant/30">
                <span className="font-headline-sm text-headline-sm text-on-surface">Review Notifications</span>
                <span className="font-label-sm text-label-sm bg-tertiary-fixed text-on-tertiary-fixed px-2 py-0.5 rounded-full font-semibold">
                  {pendingReviewCount} Pending
                </span>
              </div>
              <div className="py-2 space-y-2 text-body-sm">
                <div
                  onClick={() => {
                    setActiveView('review');
                    setShowNotifications(false);
                  }}
                  className="p-2 rounded-lg bg-surface-container-low hover:bg-surface-container cursor-pointer transition-colors"
                >
                  <p className="font-label-md text-on-surface font-semibold">Conflicting Cache Policy Detected</p>
                  <p className="text-on-surface-variant text-xs mt-0.5">
                    Notion RFC-042 and PR #119 disagree on Redis eviction strategy.
                  </p>
                </div>
                <div
                  onClick={() => {
                    setActiveView('review');
                    setShowNotifications(false);
                  }}
                  className="p-2 rounded-lg bg-surface-container-low hover:bg-surface-container cursor-pointer transition-colors"
                >
                  <p className="font-label-md text-on-surface font-semibold">Missing Rollback Key Handoff</p>
                  <p className="text-on-surface-variant text-xs mt-0.5">
                    Production DB rollback key execution requires Marcus Vance dry run.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setActiveView('review');
                  setShowNotifications(false);
                }}
                className="w-full mt-2 py-1.5 rounded-lg bg-primary text-on-primary font-label-sm text-label-sm text-center font-medium hover:bg-primary-container transition-colors"
              >
                Go to Human Review Center
              </button>
            </div>
          )}
        </div>

        {/* Profile / Judge Role Indicator */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-space-xs pl-space-xs text-left group cursor-pointer focus:outline-none"
          >
            <div className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-primary/20 group-hover:ring-primary/60 transition-all bg-surface-container">
              <img
                src={project.lead.avatar}
                alt={project.lead.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="font-label-md text-label-md text-on-surface font-semibold leading-tight group-hover:text-primary transition-colors">
                {project.lead.name}
              </span>
              <span className="font-label-sm text-label-sm text-outline leading-tight">
                {project.lead.role.split('&')[0].trim()}
              </span>
            </div>
            <span className="material-symbols-outlined text-[16px] text-outline hidden md:inline">
              expand_more
            </span>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-72 bg-surface-container-lowest rounded-xl shadow-[0_10px_30px_-4px_rgba(32,40,34,0.12)] border border-outline-variant/40 p-space-md z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center gap-space-sm pb-space-sm border-b border-outline-variant/30">
                <img
                  src={project.lead.avatar}
                  alt={project.lead.name}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-primary/30"
                />
                <div className="flex flex-col">
                  <span className="font-headline-sm text-headline-sm text-on-surface font-semibold leading-tight">
                    {project.lead.name}
                  </span>
                  <span className="text-xs text-outline">{project.lead.email}</span>
                </div>
              </div>
              <div className="pt-space-xs pb-1 text-xs text-on-surface-variant space-y-1">
                <p className="font-medium text-secondary">
                  Active Demo Persona: <strong>Outgoing Technical Lead</strong>
                </p>
                <p className="text-outline">
                  Judges are automatically authenticated with full review, editing, and certification permissions. No signup required.
                </p>
              </div>
              <div className="pt-2 border-t border-outline-variant/30">
                <button
                  onClick={() => {
                    setActiveView('landing');
                    setShowProfileMenu(false);
                  }}
                  className="w-full py-1 text-xs font-medium text-primary hover:underline text-left flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[14px]">arrow_back</span>
                  <span>Back to Product Landing Page</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
