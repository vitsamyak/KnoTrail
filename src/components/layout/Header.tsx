'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useProject } from '../../context/ProjectContext';
import type { KnowledgeFinding, ProjectSource } from '../../lib/types';

export function Header() {
  const {
    project,
    searchQuery,
    setSearchQuery,
    stats,
    activeView,
    setActiveView,
    isSyncing,
    runAiSync,
    isSaving,
    workspaceId,
    currentUserRole,
    resetDemoData,
    isProjectCreated,
    setShowCreateProjectModal,
    isMobileNavOpen,
    setIsMobileNavOpen,
    currentUser,
    isAuthenticated,
    setShowLoginModal,
    logout,
    setSelectedFinding,
    navigateToEvidence,
  } = useProject();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const mobileSearchContainerRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const pendingReviewCount = stats.unreviewedCount;

  // Global keyboard shortcut to focus search: Cmd+K / Ctrl+K & Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (window.innerWidth < 768) {
          setIsMobileSearchOpen(true);
          setTimeout(() => mobileSearchInputRef.current?.focus(), 50);
        } else {
          searchInputRef.current?.focus();
          setIsSearchOpen(true);
        }
      } else if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setIsMobileSearchOpen(false);
        setShowNotifications(false);
        setShowProfileMenu(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click outside listener to dismiss popovers
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (searchContainerRef.current && !searchContainerRef.current.contains(target)) {
        setIsSearchOpen(false);
      }
      if (mobileSearchContainerRef.current && !mobileSearchContainerRef.current.contains(target)) {
        setIsMobileSearchOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setShowNotifications(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter findings and sources based on query
  const query = (searchQuery || '').trim().toLowerCase();

  const matchedFindings = query
    ? (project.findings || []).filter(
        (f) =>
          f.title?.toLowerCase().includes(query) ||
          f.summary?.toLowerCase().includes(query) ||
          f.category?.toLowerCase().includes(query) ||
          f.owner?.toLowerCase().includes(query) ||
          f.reasoning?.toLowerCase().includes(query)
      )
    : [];

  const matchedSources = query
    ? (project.sources || []).filter(
        (s) =>
          s.name?.toLowerCase().includes(query) ||
          s.description?.toLowerCase().includes(query) ||
          s.type?.toLowerCase().includes(query)
      )
    : [];

  const totalResultsCount = matchedFindings.length + matchedSources.length;

  const handleSelectFinding = (finding: KnowledgeFinding) => {
    setSelectedFinding(finding);
    if (finding.citations && finding.citations.length > 0) {
      navigateToEvidence(finding.id, finding.citations[0].id);
    } else {
      setActiveView('review');
    }
    setIsSearchOpen(false);
    setIsMobileSearchOpen(false);
  };

  const handleSelectSource = (source: ProjectSource) => {
    setActiveView('sources');
    setIsSearchOpen(false);
    setIsMobileSearchOpen(false);
  };

  const getCategoryIcon = (type?: string) => {
    switch (type?.toLowerCase()) {
      case 'decision':
        return 'gavel';
      case 'task':
        return 'task_alt';
      case 'risk':
        return 'warning';
      case 'dependency':
        return 'link';
      case 'contact':
        return 'person';
      default:
        return 'lightbulb';
    }
  };

  const getViewTitle = () => {
    switch (activeView) {
      case 'dashboard':
        return 'Dashboard';
      case 'workspace':
        return 'Projects';
      case 'sources':
        return 'Sources';
      case 'analysis':
        return 'AI Analysis';
      case 'evidence':
        return 'Evidence';
      case 'review':
        return 'Review Center';
      case 'handover':
        return 'Handover';
      default:
        return 'Workspace';
    }
  };

  // Render search results content
  const renderSearchResults = () => {
    if (!query) return null;

    if (totalResultsCount === 0) {
      return (
        <div className="p-5 text-center text-xs text-secondary">
          <span className="material-symbols-outlined text-[24px] text-secondary/60 mb-1 block">
            search_off
          </span>
          <p className="font-medium text-on-surface">No results found</p>
          <p className="text-[11px] text-secondary mt-0.5">
            No findings or sources match &ldquo;{searchQuery}&rdquo;
          </p>
        </div>
      );
    }

    return (
      <div className="max-h-80 overflow-y-auto no-scrollbar p-1.5 space-y-2">
        {matchedFindings.length > 0 && (
          <div>
            <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider font-semibold text-secondary flex items-center justify-between">
              <span>Knowledge Findings</span>
              <span className="bg-surface-container px-1.5 py-0.2 rounded font-mono">{matchedFindings.length}</span>
            </div>
            <div className="space-y-0.5 mt-0.5">
              {matchedFindings.slice(0, 6).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => handleSelectFinding(f)}
                  className="w-full p-2 rounded-lg hover:bg-surface-container text-left transition-colors flex items-start gap-2.5 group cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-md bg-surface-container-low text-primary flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-primary/10 transition-colors">
                    <span className="material-symbols-outlined text-[14px]">
                      {getCategoryIcon(f.type)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-semibold text-on-surface truncate group-hover:text-primary transition-colors">
                        {f.title}
                      </p>
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold uppercase shrink-0 ${
                          f.status === 'VERIFIED'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : f.status === 'CONFLICTING'
                            ? 'bg-rose-50 text-rose-800 border border-rose-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {f.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-secondary line-clamp-1 mt-0.5">
                      {f.summary}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {matchedSources.length > 0 && (
          <div>
            <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider font-semibold text-secondary flex items-center justify-between border-t border-outline-variant/30 pt-2">
              <span>Connected Sources</span>
              <span className="bg-surface-container px-1.5 py-0.2 rounded font-mono">{matchedSources.length}</span>
            </div>
            <div className="space-y-0.5 mt-0.5">
              {matchedSources.slice(0, 3).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleSelectSource(s)}
                  className="w-full p-2 rounded-lg hover:bg-surface-container text-left transition-colors flex items-center gap-2.5 group cursor-pointer"
                >
                  <div className="w-6 h-6 rounded-md bg-surface-container-low text-primary flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                    <span className="material-symbols-outlined text-[14px]">
                      {s.type === 'github' ? 'commit' : 'description'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-on-surface truncate group-hover:text-primary transition-colors">
                      {s.name}
                    </p>
                    <p className="text-[10px] text-secondary truncate">
                      {s.description || 'Ingested project source'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <header className="sticky top-0 z-30 w-full h-14 bg-surface/95 backdrop-blur-md border-b border-outline-variant/40 flex items-center justify-between px-3 sm:px-5 lg:px-6 transition-all select-none">
      {/* ─── LEFT: Mobile Drawer Toggle + Breadcrumbs Context ─── */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Mobile Navigation Drawer Toggle */}
        <button
          onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
          aria-label="Open navigation menu"
          className="lg:hidden inline-flex items-center justify-center w-8 h-8 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface border border-outline-variant/30 transition-colors shrink-0 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">menu</span>
        </button>

        {/* Breadcrumb Context */}
        <div className="flex items-center gap-1.5 text-xs text-secondary truncate">
          <button
            onClick={() => setActiveView('workspace')}
            className="flex items-center gap-1 font-medium hover:text-on-surface transition-colors truncate max-w-[100px] sm:max-w-[150px] md:max-w-[180px] cursor-pointer"
            title="Switch Workspace"
          >
            <span className="material-symbols-outlined text-[16px] text-primary shrink-0">
              folder
            </span>
            <span className="truncate">{isProjectCreated ? project.name : 'Workspace'}</span>
          </button>
          <span className="text-outline-variant/60">/</span>
          <span className="font-semibold text-on-surface whitespace-nowrap">
            {getViewTitle()}
          </span>
        </div>
      </div>

      {/* ─── CENTER: Interactive Search Bar (Desktop / Laptops) ─── */}
      <div
        ref={searchContainerRef}
        className="relative hidden md:flex items-center mx-3 lg:mx-6 flex-1 max-w-xs lg:max-w-md"
      >
        <div className="relative w-full flex items-center">
          <button
            type="button"
            onClick={() => searchInputRef.current?.focus()}
            className="material-symbols-outlined absolute left-2.5 text-secondary hover:text-primary text-[16px] transition-colors cursor-pointer"
            title="Click to search"
            aria-label="Search"
          >
            search
          </button>
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchOpen(true);
            }}
            onFocus={() => {
              if (searchQuery.trim().length > 0) setIsSearchOpen(true);
            }}
            placeholder="Search decisions, tasks, evidence..."
            className="w-full bg-surface-container-low/70 text-on-surface text-xs pl-8 pr-12 h-8 rounded-lg border border-outline-variant/40 focus:border-primary focus:bg-surface-container-lowest focus:outline-none focus:ring-1 focus:ring-primary/30 placeholder:text-secondary/70 transition-all font-sans"
          />
          <div className="absolute right-2 flex items-center gap-1">
            {searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setIsSearchOpen(false);
                }}
                className="text-secondary hover:text-on-surface text-xs p-0.5 rounded transition-colors cursor-pointer"
                title="Clear search"
                aria-label="Clear search"
              >
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            ) : (
              <kbd className="hidden lg:inline-flex items-center px-1 text-[9px] font-mono text-secondary/80 bg-surface-container rounded border border-outline-variant/40 select-none">
                ⌘K
              </kbd>
            )}
          </div>
        </div>

        {/* Live Search Results Dropdown Popover */}
        {isSearchOpen && searchQuery.trim().length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/40 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
            {renderSearchResults()}
          </div>
        )}
      </div>

      {/* ─── RIGHT: Mobile Search Toggle + Sync + Role Badge + Notifications + Profile ─── */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Mobile Search Button (< md only) */}
        <button
          type="button"
          onClick={() => {
            setIsMobileSearchOpen(!isMobileSearchOpen);
            if (!isMobileSearchOpen) {
              setTimeout(() => mobileSearchInputRef.current?.focus(), 50);
            }
          }}
          aria-label="Toggle search"
          className="md:hidden inline-flex items-center justify-center w-8 h-8 rounded-lg bg-surface-container-low hover:bg-surface-container text-secondary hover:text-on-surface border border-outline-variant/30 transition-colors shrink-0 cursor-pointer"
          title="Search decisions and evidence"
        >
          <span className="material-symbols-outlined text-[18px]">search</span>
        </button>

        {/* Autosave Status (Large Laptops / Desktops only) */}
        <div
          className="hidden xl:flex items-center gap-1.5 text-[11px] text-secondary px-1 h-8 whitespace-nowrap select-none"
          title={`Autosaving active for ${workspaceId}`}
        >
          <span
            className={`material-symbols-outlined text-[14px] ${
              isSaving ? 'animate-spin text-tertiary' : 'text-primary'
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
          className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 h-8 rounded-lg bg-surface-container-low hover:bg-surface-container text-on-surface border border-outline-variant/30 transition-colors text-xs font-medium whitespace-nowrap disabled:opacity-50 cursor-pointer"
          title="Synchronize Workspace with Storage"
        >
          <span
            className={`material-symbols-outlined text-[15px] text-primary ${
              isSyncing ? 'animate-spin' : ''
            }`}
          >
            sync
          </span>
          <span className="hidden sm:inline">
            {isSyncing ? 'Syncing...' : 'Sync'}
          </span>
        </button>

        {/* Role & Authentication Status Indicator */}
        {isAuthenticated ? (
          <div
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-1.5 px-2.5 h-8 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold whitespace-nowrap cursor-pointer hover:bg-emerald-100/70 transition-colors"
            title={`Signed in as ${currentUser?.email} (${currentUserRole}) - Click for options`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse shrink-0"></span>
            <span className="hidden sm:inline text-xs">
              {currentUserRole === 'MANAGER' ? 'Manager' : currentUserRole === 'DEVELOPER' ? 'Developer' : 'External'}
            </span>
            <span className="sm:hidden text-[11px] uppercase font-bold">
              {currentUserRole === 'MANAGER' ? 'Mgr' : currentUserRole === 'DEVELOPER' ? 'Dev' : 'Ext'}
            </span>
          </div>
        ) : (
          <button
            onClick={() => setShowLoginModal(true)}
            className="inline-flex items-center gap-1.5 px-2.5 h-8 rounded-lg bg-primary hover:bg-primary-hover text-on-primary text-xs font-semibold shadow-2xs transition-colors whitespace-nowrap cursor-pointer"
            title="Sign In with Demo Account"
          >
            <span className="material-symbols-outlined text-[15px]">login</span>
            <span className="hidden xs:inline">Sign In</span>
          </button>
        )}

        {/* Review Notifications Popover */}
        <div ref={notificationsRef} className="relative shrink-0">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfileMenu(false);
            }}
            aria-label="Pending Reviews"
            className="relative w-8 h-8 rounded-lg flex items-center justify-center text-secondary hover:text-on-surface hover:bg-surface-container border border-outline-variant/30 transition-colors cursor-pointer"
            title="Review Notifications"
          >
            <span className="material-symbols-outlined text-[17px]">notifications</span>
            {pendingReviewCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-surface animate-pulse" />
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-[calc(100vw-1.5rem)] sm:w-80 max-w-sm bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/40 p-3 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-outline-variant/30">
                <span className="text-xs font-semibold text-on-surface">Review Notifications</span>
                <span className="text-[10px] font-mono bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.2 rounded-full font-semibold">
                  {pendingReviewCount} Pending
                </span>
              </div>
              <div className="py-2 space-y-1.5 text-xs max-h-60 overflow-y-auto no-scrollbar">
                {pendingReviewCount === 0 ? (
                  <p className="text-xs text-secondary py-3 text-center">
                    All findings up to date. Zero pending reviews.
                  </p>
                ) : (
                  (project.findings || [])
                    .filter((f) => !f.approved && !f.rejected)
                    .slice(0, 4)
                    .map((f) => (
                      <div
                        key={f.id}
                        onClick={() => {
                          handleSelectFinding(f);
                          setShowNotifications(false);
                        }}
                        className="p-2 rounded-lg bg-surface-container-low hover:bg-surface-container cursor-pointer transition-colors"
                      >
                        <p className="text-xs text-on-surface font-semibold truncate">
                          {f.status === 'CONFLICTING' ? '⚠️ Conflict: ' : ''}
                          {f.title}
                        </p>
                        <p className="text-secondary text-[11px] mt-0.5 line-clamp-1">
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
                className="w-full mt-1.5 py-1.5 rounded-lg bg-primary text-on-primary text-xs text-center font-medium hover:bg-primary-hover transition-colors cursor-pointer shadow-xs"
              >
                Go to Review Center
              </button>
            </div>
          )}
        </div>

        {/* Profile / Workspace Options Dropdown */}
        <div ref={profileMenuRef} className="relative shrink-0">
          <button
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotifications(false);
            }}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-secondary hover:text-on-surface hover:bg-surface-container border border-outline-variant/30 transition-colors cursor-pointer focus:outline-none"
            aria-label="User Profile & Settings"
            title="User Profile & Settings"
          >
            <span className="material-symbols-outlined text-[18px]">account_circle</span>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-[calc(100vw-1.5rem)] sm:w-72 max-w-sm bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/40 p-3 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="flex items-center gap-2.5 pb-2.5 border-b border-outline-variant/30">
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[18px]">
                    {isAuthenticated ? 'verified_user' : 'shield_person'}
                  </span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-on-surface truncate">
                    {isAuthenticated && currentUser ? currentUser.email : 'Public Demo Session'}
                  </span>
                  <span className="text-[10px] text-secondary font-mono truncate">
                    {isAuthenticated ? `Role: ${currentUserRole} (Verified)` : `Workspace: ${workspaceId}`}
                  </span>
                </div>
              </div>
              <div className="pt-2 pb-1 text-[11px] text-secondary space-y-1">
                <p className="font-semibold text-primary">
                  {isAuthenticated ? 'Protected Authenticated Session' : 'Zero-Auth Public Demo'}
                </p>
                <p className="text-[10px] text-secondary leading-relaxed">
                  {isAuthenticated
                    ? 'Authenticated as workspace member with verified role boundaries and permissions.'
                    : 'Judges can test all features without login. Sign in with any of the 3 demo roles to test RBAC gates.'}
                </p>
              </div>
              <div className="pt-2 border-t border-outline-variant/30 flex flex-col gap-1">
                {isAuthenticated ? (
                  <button
                    onClick={() => {
                      logout();
                      setShowProfileMenu(false);
                    }}
                    className="w-full py-1.5 px-2 rounded-lg text-xs font-medium text-error hover:bg-error/10 text-left flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[15px]">logout</span>
                    <span>Sign Out</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setShowLoginModal(true);
                      setShowProfileMenu(false);
                    }}
                    className="w-full py-1.5 px-2 rounded-lg text-xs font-semibold text-primary hover:bg-primary/10 text-left flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[15px]">login</span>
                    <span>Sign In to Demo Account</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowCreateProjectModal(true);
                    setShowProfileMenu(false);
                  }}
                  className="w-full py-1.5 px-2 rounded-lg text-xs font-medium text-on-surface hover:bg-surface-container text-left flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px]">create_new_folder</span>
                  <span>Create New Project</span>
                </button>
                <button
                  onClick={() => {
                    setActiveView('landing');
                    setShowProfileMenu(false);
                  }}
                  className="w-full py-1.5 px-2 rounded-lg text-xs font-medium text-secondary hover:text-on-surface hover:bg-surface-container text-left flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px]">arrow_back</span>
                  <span>Back to Landing Page</span>
                </button>
                <button
                  onClick={() => {
                    if (confirm('Reset workspace and clear current project data?')) {
                      resetDemoData();
                      setShowProfileMenu(false);
                    }
                  }}
                  className="w-full py-1.5 px-2 rounded-lg text-xs font-medium text-error hover:bg-error/10 text-left flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px]">restart_alt</span>
                  <span>Reset Workspace Data</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── MOBILE SEARCH OVERLAY (iPhone / Android) ─── */}
      {isMobileSearchOpen && (
        <div
          ref={mobileSearchContainerRef}
          className="fixed top-14 inset-x-0 bg-surface-container-lowest border-b border-outline-variant/40 shadow-xl p-3 z-40 md:hidden animate-in fade-in slide-in-from-top-2 duration-150"
        >
          <div className="relative flex items-center">
            <span className="material-symbols-outlined absolute left-2.5 text-secondary text-[16px] pointer-events-none">
              search
            </span>
            <input
              ref={mobileSearchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search decisions, tasks, evidence..."
              className="w-full bg-surface-container-low text-on-surface text-xs pl-8 pr-16 h-9 rounded-lg border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <div className="absolute right-2 flex items-center gap-1">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 text-secondary hover:text-on-surface cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setIsMobileSearchOpen(false);
                  setSearchQuery('');
                }}
                className="text-[11px] font-semibold text-primary px-1.5 py-0.5 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>

          {searchQuery.trim().length > 0 && (
            <div className="mt-2.5 pt-2 border-t border-outline-variant/30">
              {renderSearchResults()}
            </div>
          )}
        </div>
      )}
    </header>
  );
}
