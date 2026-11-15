'use client';

import React, { useState, useRef, useEffect } from 'react';
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
    currentUserRole,
    demoPerspective,
    setDemoPerspective,
    resetDemoData,
    isProjectCreated,
    setShowCreateProjectModal,
    isMobileNavOpen,
    setIsMobileNavOpen,
    currentUser,
    isAuthenticated,
    setShowLoginModal,
    logout,
  } = useProject();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const pendingReviewCount = stats.unreviewedCount;

  // Global keyboard shortcut to focus search: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className="fixed top-3 left-3 sm:left-4 lg:left-[17rem] right-3 sm:right-4 h-13 sm:h-14 bg-surface-container-lowest/95 backdrop-blur-xl rounded-xl shadow-[0_2px_12px_rgba(32,40,34,0.04),0_1px_2px_rgba(32,40,34,0.03)] border border-outline-variant/40 z-40 flex items-center justify-between px-3 sm:px-3.5 transition-all">
      {/* ─── LEFT GROUP: Mobile Menu + Workspace Context + Search ─── */}
      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
        {/* Mobile Navigation Drawer Toggle */}
        <button
          onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
          aria-label="Open navigation menu"
          className="lg:hidden inline-flex items-center justify-center w-8 h-8 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface border border-outline-variant/30 transition-colors shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">menu</span>
        </button>

        {/* Compact Workspace Context Badge */}
        <button
          onClick={() => setActiveView('workspace')}
          className="flex items-center gap-2 bg-surface-container-low/70 hover:bg-surface-container px-2.5 h-8 rounded-lg border border-outline-variant/30 transition-all text-on-surface group shrink-0 min-w-0"
          title="Open Workspace Overview"
        >
          <span className="material-symbols-outlined text-[16px] text-primary shrink-0 group-hover:scale-105 transition-transform">
            folder_open
          </span>
          <span className="text-xs font-semibold text-on-surface truncate max-w-[120px] sm:max-w-[170px] md:max-w-[210px] whitespace-nowrap">
            {isProjectCreated ? project.name : 'Your Workspace'}
          </span>
        </button>

        {/* Global Search Bar */}
        <div className="relative hidden md:flex items-center">
          <span className="material-symbols-outlined absolute left-2.5 text-outline text-[16px] pointer-events-none">
            search
          </span>
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search decisions, tasks, evidence..."
            className="bg-surface-container-low/60 text-on-surface text-xs pl-8 pr-8 h-8 rounded-lg w-40 lg:w-56 xl:w-64 border border-outline-variant/30 focus:border-primary/40 focus:bg-surface-container-lowest focus:outline-none focus:ring-1 focus:ring-primary/20 placeholder:text-outline/70 transition-all"
          />
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 text-outline hover:text-on-surface text-xs"
              title="Clear search"
            >
              <span className="material-symbols-outlined text-[14px]">close</span>
            </button>
          ) : (
            <kbd className="absolute right-2 hidden xl:inline-flex items-center px-1 text-[9px] font-mono text-outline/70 bg-surface-container/70 rounded border border-outline-variant/40">
              ⌘K
            </kbd>
          )}
        </div>
      </div>

      {/* ─── RIGHT GROUP: Autosave + Sync + Clear Mode + Notifications + Profile ─── */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Subtle Autosave Indicator */}
        <div
          className="hidden xl:flex items-center gap-1 text-[11px] text-outline/80 px-2 h-7 whitespace-nowrap"
          title={`Autosaving active for ${workspaceId}`}
        >
          <span
            className={`material-symbols-outlined text-[13px] ${
              isSaving ? 'animate-spin text-tertiary' : 'text-primary/70'
            }`}
          >
            {isSaving ? 'autorenew' : 'cloud_done'}
          </span>
          <span>{isSaving ? 'Saving...' : 'Saved'}</span>
        </div>

        {/* Sync Workspace Button */}
        <button
          onClick={() => runAiSync()}
          disabled={isSyncing}
          className="inline-flex items-center gap-1.5 px-2.5 h-8 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface border border-outline-variant/30 transition-all text-xs font-medium whitespace-nowrap disabled:opacity-50 group"
          title="Synchronize Workspace with Server Storage"
        >
          <span
            className={`material-symbols-outlined text-[15px] text-primary group-hover:rotate-180 transition-transform duration-300 ${
              isSyncing ? 'animate-spin' : ''
            }`}
          >
            sync
          </span>
          <span className="hidden sm:inline">
            {isSyncing ? 'Syncing...' : 'Sync'}
          </span>
        </button>

        {/* Vertical Divider */}
        <div className="h-4 w-px bg-outline-variant/40 mx-0.5 hidden sm:block" />

        {/* ─── AUTHENTICATION / ACCESS STATE (Zero Contradiction) ─── */}
        {isAuthenticated && currentUser ? (
          /* AUTHENTICATED MANAGER MODE */
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1.5 px-2.5 h-8 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse shrink-0"></span>
              <span className="font-semibold text-[11px] hidden md:inline">
                {currentUser.email}
              </span>
              <span className="text-[10px] font-bold bg-emerald-200/70 text-emerald-900 px-1 py-0.2 rounded uppercase">
                {currentUserRole}
              </span>
            </div>
            <button
              onClick={() => logout()}
              className="inline-flex items-center gap-1 px-2.5 h-8 rounded-lg hover:bg-surface-container hover:text-error text-outline border border-outline-variant/30 transition-colors text-xs font-medium whitespace-nowrap"
              title="Sign Out of Manager Account"
            >
              <span className="material-symbols-outlined text-[14px]">logout</span>
              <span className="hidden md:inline">Sign Out</span>
            </button>
          </div>
        ) : (
          /* PUBLIC DEMO MODE */
          <div className="flex items-center gap-1.5">
            {/* Demo Perspective Switcher */}
            <div
              className="hidden sm:flex items-center gap-1 bg-surface-container-low px-1.5 h-8 rounded-lg border border-outline-variant/30 text-xs whitespace-nowrap"
              title="Simulate team perspective (Public Demo Mode)"
            >
              <span className="text-[10px] font-semibold text-outline uppercase tracking-wider pl-1 pr-0.5 hidden lg:inline">
                Preview:
              </span>
              <div className="flex items-center gap-0.5">
                {(['MANAGER', 'DEVELOPER', 'EXTERNAL'] as const).map((role) => (
                  <button
                    key={role}
                    onClick={() => setDemoPerspective(role)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors whitespace-nowrap ${
                      demoPerspective === role
                        ? 'bg-primary text-on-primary font-bold shadow-2xs'
                        : 'text-outline hover:text-on-surface hover:bg-surface-container'
                    }`}
                    title={`Simulate ${role} perspective`}
                  >
                    {role === 'MANAGER' ? 'Manager' : role === 'DEVELOPER' ? 'Dev' : 'External'}
                  </button>
                ))}
              </div>
            </div>

            {/* Manager Sign In Button */}
            <button
              onClick={() => setShowLoginModal(true)}
              className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg bg-primary hover:bg-primary-hover text-on-primary text-xs font-medium shadow-2xs transition-all whitespace-nowrap"
              title="Sign In with Demo Manager Account"
            >
              <span className="material-symbols-outlined text-[14px]">login</span>
              <span>Sign In</span>
            </button>
          </div>
        )}

        {/* Notifications Popover */}
        <div className="relative shrink-0">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label="Pending Reviews"
            className="relative w-8 h-8 rounded-lg flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
            title="Review Notifications"
          >
            <span className="material-symbols-outlined text-[18px]">notifications</span>
            {pendingReviewCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-surface-container-lowest animate-pulse"></span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-[calc(100vw-1.5rem)] sm:w-80 max-w-sm bg-surface-container-lowest rounded-xl shadow-lg border border-outline-variant/40 p-3 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-outline-variant/30">
                <span className="text-xs font-semibold text-on-surface">Review Notifications</span>
                <span className="text-[10px] font-mono bg-amber-50 text-amber-800 border border-amber-300 px-1.5 py-0.2 rounded-full font-semibold">
                  {pendingReviewCount} Pending
                </span>
              </div>
              <div className="py-2 space-y-1.5 text-xs max-h-60 overflow-y-auto">
                {pendingReviewCount === 0 ? (
                  <p className="text-xs text-outline py-3 text-center">
                    All findings up to date. Zero pending reviews.
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
                        <p className="text-xs text-on-surface font-semibold truncate">
                          {f.status === 'CONFLICTING' ? '⚠️ Conflict: ' : ''}
                          {f.title}
                        </p>
                        <p className="text-outline text-[11px] mt-0.5 line-clamp-1">
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
                className="w-full mt-1.5 py-1.5 rounded-lg bg-primary text-on-primary text-xs text-center font-medium hover:bg-primary-hover transition-colors"
              >
                Go to Review Center
              </button>
            </div>
          )}
        </div>

        {/* Profile / Workspace Settings Dropdown */}
        <div className="relative shrink-0">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-1 pl-1 pr-1.5 h-8 rounded-lg hover:bg-surface-container transition-colors group cursor-pointer focus:outline-none"
            aria-label="Workspace Options"
            title="Workspace Options"
          >
            <div className="w-6 h-6 rounded-md bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-primary group-hover:text-on-primary transition-colors">
              <span className="material-symbols-outlined text-[16px]">account_circle</span>
            </div>
            <span className="material-symbols-outlined text-[14px] text-outline group-hover:text-on-surface transition-colors">
              expand_more
            </span>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-[calc(100vw-1.5rem)] sm:w-72 max-w-sm bg-surface-container-lowest rounded-xl shadow-lg border border-outline-variant/40 p-3 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="flex items-center gap-2 pb-2.5 border-b border-outline-variant/30">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">
                    {isAuthenticated ? 'verified_user' : 'shield_person'}
                  </span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-on-surface truncate">
                    {isAuthenticated && currentUser ? currentUser.email : 'Public Demo Session'}
                  </span>
                  <span className="text-[10px] text-outline font-mono truncate">
                    {isAuthenticated ? `Role: ${currentUserRole} (Verified)` : `Workspace: ${workspaceId}`}
                  </span>
                </div>
              </div>
              <div className="pt-2 pb-1 text-[11px] text-on-surface-variant space-y-1">
                <p className="font-semibold text-primary">
                  {isAuthenticated ? 'Protected Authenticated Session' : 'Zero-Auth Public Demo'}
                </p>
                <p className="text-outline text-[11px] leading-relaxed">
                  {isAuthenticated
                    ? 'Authenticated as workspace Manager with full permissions to certify handovers and manage members.'
                    : 'Judges and reviewers can explore all screens without login. Sign in with the Manager demo account for protected workspace checks.'}
                </p>
              </div>
              <div className="pt-2 border-t border-outline-variant/30 flex flex-col gap-1">
                {isAuthenticated ? (
                  <button
                    onClick={() => {
                      logout();
                      setShowProfileMenu(false);
                    }}
                    className="w-full py-1 text-xs font-medium text-error hover:underline text-left flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[14px]">logout</span>
                    <span>Sign Out</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setShowLoginModal(true);
                      setShowProfileMenu(false);
                    }}
                    className="w-full py-1 text-xs font-medium text-primary hover:underline text-left flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[14px]">login</span>
                    <span>Sign In to Demo Manager Account</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowCreateProjectModal(true);
                    setShowProfileMenu(false);
                  }}
                  className="w-full py-1 text-xs font-medium text-on-surface hover:text-primary hover:underline text-left flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[14px]">create_new_folder</span>
                  <span>Create New Project</span>
                </button>
                <button
                  onClick={() => {
                    setActiveView('landing');
                    setShowProfileMenu(false);
                  }}
                  className="w-full py-1 text-xs font-medium text-outline hover:text-on-surface hover:underline text-left flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[14px]">arrow_back</span>
                  <span>Back to Product Landing Page</span>
                </button>
                <button
                  onClick={() => {
                    if (confirm('Reset workspace and clear current project data?')) {
                      resetDemoData();
                      setShowProfileMenu(false);
                    }
                  }}
                  className="w-full py-1 text-xs font-medium text-error hover:underline text-left flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[14px]">restart_alt</span>
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
