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
    resetDemoData,
    isProjectCreated,
    setShowCreateProjectModal,
    isMobileNavOpen,
    setIsMobileNavOpen,
  } = useProject();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const pendingReviewCount = stats.unreviewedCount;

  return (
    <header className="fixed top-2 sm:top-4 left-2 sm:left-4 lg:left-[18rem] right-2 sm:right-4 h-14 sm:h-16 bg-surface-container-lowest/95 backdrop-blur-xl rounded-xl shadow-[0_10px_30px_-4px_rgba(32,40,34,0.04),0_4px_10px_-2px_rgba(32,40,34,0.02)] border border-outline-variant/30 z-40 flex items-center justify-between px-2.5 sm:px-space-lg transition-all">
      {/* Left Group: Mobile Hamburger + Project Selector & Search */}
      <div className="flex items-center gap-1.5 sm:gap-space-md min-w-0">
        {/* Mobile Drawer Hamburger Button */}
        <button
          onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
          aria-label="Open navigation menu"
          className="lg:hidden inline-flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface border border-outline-variant/20 transition-colors shrink-0"
        >
          <span className="material-symbols-outlined text-[20px] sm:text-[22px]">menu</span>
        </button>

        {/* Project Selector Pill */}
        <button
          onClick={() => setActiveView('workspace')}
          className="flex items-center gap-1.5 sm:gap-space-xs bg-surface-container-low px-2 sm:px-space-md py-1 sm:py-1.5 rounded-full text-on-surface hover:bg-surface-container transition-colors border border-outline-variant/20 group min-w-0"
          title="Go to Project Workspace"
        >
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0"></span>
          <span className="font-label-md text-label-md font-semibold text-on-surface truncate max-w-[100px] sm:max-w-[180px] md:max-w-[220px]">
            {isProjectCreated ? project.name : 'Your Workspace'}
          </span>
          <span className="material-symbols-outlined text-[16px] sm:text-[18px] text-outline group-hover:text-primary transition-colors shrink-0">
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

      {/* Right Group: Sync, Notifications, Workspace Profile */}
      <div className="flex items-center gap-space-md">
        {/* Sync Button */}
        <button
          onClick={() => runAiSync()}
          disabled={isSyncing}
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-low hover:bg-surface-container text-on-surface font-label-sm text-label-sm border border-outline-variant/20 transition-all disabled:opacity-60"
          title="Synchronize Workspace with Server Storage"
        >
          <span
            className={`material-symbols-outlined text-[16px] text-primary ${
              isSyncing ? 'animate-spin' : ''
            }`}
          >
            sync
          </span>
          <span>{isSyncing ? 'Syncing...' : 'Sync Workspace'}</span>
        </button>

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
            <div className="absolute right-0 mt-2 w-[calc(100vw-1.5rem)] sm:w-80 max-w-sm bg-surface-container-lowest rounded-xl shadow-[0_10px_30px_-4px_rgba(32,40,34,0.12)] border border-outline-variant/40 p-space-md z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-outline-variant/30">
                <span className="font-headline-sm text-headline-sm text-on-surface">Review Notifications</span>
                <span className="font-label-sm text-label-sm bg-tertiary-fixed text-on-tertiary-fixed px-2 py-0.5 rounded-full font-semibold">
                  {pendingReviewCount} Pending
                </span>
              </div>
              <div className="py-2 space-y-2 text-body-sm max-h-64 overflow-y-auto">
                {pendingReviewCount === 0 ? (
                  <p className="text-xs text-outline py-2 text-center">
                    All findings up to date. No pending review alerts.
                  </p>
                ) : (
                  project.findings
                    .filter((f) => !f.approved && !f.rejected)
                    .slice(0, 4)
                    .map((f) => (
                      <div
                        key={f.id}
                        onClick={() => {
                          setActiveView('review');
                          setShowNotifications(false);
                        }}
                        className="p-2 rounded-lg bg-surface-container-low hover:bg-surface-container cursor-pointer transition-colors"
                      >
                        <p className="font-label-md text-on-surface font-semibold truncate">
                          {f.status === 'CONFLICTING' ? '⚠️ Conflict: ' : ''}
                          {f.title}
                        </p>
                        <p className="text-on-surface-variant text-xs mt-0.5 line-clamp-1">
                          {f.summary}
                        </p>
                      </div>
                    ))
                )}
              </div>
              <button
                onClick={() => {
                  setActiveView('review');
                  setShowNotifications(false);
                }}
                className="w-full mt-2 py-1.5 rounded-lg bg-primary text-on-primary font-label-sm text-label-sm text-center font-medium hover:bg-primary-container transition-colors"
              >
                Go to Review Center
              </button>
            </div>
          )}
        </div>

        {/* Workspace Identity & Actions */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-space-xs pl-space-xs text-left group cursor-pointer focus:outline-none"
            aria-label="Workspace Options"
          >
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center ring-2 ring-primary/20 group-hover:ring-primary/60 transition-all">
              <span className="material-symbols-outlined text-[18px]">account_circle</span>
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="font-label-md text-label-md text-on-surface font-semibold leading-tight group-hover:text-primary transition-colors">
                Your Workspace
              </span>
              <span className="font-label-sm text-label-sm text-outline leading-tight">
                {isProjectCreated ? project.name : 'Handover Ready'}
              </span>
            </div>
            <span className="material-symbols-outlined text-[16px] text-outline hidden md:inline">
              expand_more
            </span>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-[calc(100vw-1.5rem)] sm:w-72 max-w-sm bg-surface-container-lowest rounded-xl shadow-[0_10px_30px_-4px_rgba(32,40,34,0.12)] border border-outline-variant/40 p-space-md z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center gap-space-sm pb-space-sm border-b border-outline-variant/30">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[24px]">shield_person</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-headline-sm text-headline-sm text-on-surface font-semibold leading-tight">
                    Your Workspace
                  </span>
                  <span className="text-xs text-outline font-mono truncate max-w-[180px]">{workspaceId}</span>
                </div>
              </div>
              <div className="pt-space-xs pb-1 text-xs text-on-surface-variant space-y-1">
                <p className="font-medium text-secondary">
                  Zero-Auth Private Session
                </p>
                <p className="text-outline">
                  Judges and reviewers have full access to create projects, upload documents, review findings, and certify handovers with zero login.
                </p>
              </div>
              <div className="pt-2 border-t border-outline-variant/30 flex flex-col gap-1.5">
                <button
                  onClick={() => {
                    setShowCreateProjectModal(true);
                    setShowProfileMenu(false);
                  }}
                  className="w-full py-1 text-xs font-medium text-primary hover:underline text-left flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[15px]">create_new_folder</span>
                  <span>Create New Project</span>
                </button>
                <button
                  onClick={() => {
                    setActiveView('landing');
                    setShowProfileMenu(false);
                  }}
                  className="w-full py-1 text-xs font-medium text-on-surface-variant hover:text-on-surface hover:underline text-left flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[15px]">arrow_back</span>
                  <span>Back to Product Landing Page</span>
                </button>
                <button
                  onClick={() => {
                    if (confirm('Reset workspace to clean empty state?')) {
                      resetDemoData();
                      setShowProfileMenu(false);
                    }
                  }}
                  className="w-full py-1 text-xs font-medium text-error hover:underline text-left flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[15px]">restart_alt</span>
                  <span>Reset Workspace Data</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
