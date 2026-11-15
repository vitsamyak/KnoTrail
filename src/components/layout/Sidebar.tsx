'use client';

import React from 'react';
import { useProject } from '../../context/ProjectContext';
import { ActiveView } from '../../lib/types';

interface NavItem {
  id: ActiveView;
  label: string;
  icon: string;
  badge?: string;
}

export function Sidebar() {
  const {
    activeView,
    setActiveView,
    stats,
    project,
    resetDemoData,
    isProjectCreated,
    isMobileNavOpen,
    setIsMobileNavOpen,
    currentUser,
    isAuthenticated,
    setShowLoginModal,
    logout,
  } = useProject();

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'grid_view' },
    { id: 'workspace', label: 'Projects', icon: 'folder_open' },
    { id: 'sources', label: 'Sources', icon: 'dataset', badge: `${stats.totalSources}` },
    { id: 'analysis', label: 'AI Analysis', icon: 'auto_awesome' },
    { id: 'evidence', label: 'Evidence Explorer', icon: 'fact_check', badge: `${stats.totalFindings}` },
    { id: 'review', label: 'Review Center', icon: 'rule', badge: `${stats.certificationProgressPercent}%` },
    {
      id: 'handover',
      label: 'Handovers',
      icon: stats.isHandoverBlocked ? 'lock' : 'sync_alt',
      badge: stats.isHandoverBlocked ? 'Locked' : (project.handoverCertified ? 'Certified' : 'Ready'),
    },
  ];

  const renderNavContent = (isMobile = false) => (
    <div className="flex flex-col justify-between h-full py-space-lg px-space-md select-none">
      <div className="flex flex-col gap-space-lg">
        {/* Brand Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              setActiveView('landing');
              if (isMobile) setIsMobileNavOpen(false);
            }}
            className="flex items-center gap-space-sm px-space-xs text-left group transition-transform active:scale-95"
            title="Return to Landing Page"
          >
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-on-primary shadow-sm group-hover:bg-primary-container transition-colors shrink-0">
              <span className="material-symbols-outlined text-[22px]">route</span>
            </div>
            <div className="flex flex-col">
              <span className="font-headline-sm text-headline-sm text-on-surface tracking-tight leading-none group-hover:text-primary transition-colors">
                KnoTrail
              </span>
              <span className="font-label-sm text-label-sm text-outline mt-0.5 leading-none">
                Knowledge Handover
              </span>
            </div>
          </button>

          {isMobile && (
            <button
              onClick={() => setIsMobileNavOpen(false)}
              aria-label="Close navigation menu"
              className="p-1.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-space-2xs">
          {navItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveView(item.id);
                  if (isMobile) setIsMobileNavOpen(false);
                }}
                className={`flex items-center justify-between px-space-md py-2.5 rounded-xl transition-all duration-200 text-left group min-h-[40px] ${
                  isActive
                    ? 'bg-primary-container text-on-primary-container font-semibold shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                <div className="flex items-center gap-space-sm">
                  <span
                    className={`material-symbols-outlined text-[20px] transition-transform ${
                      isActive ? 'text-on-primary-container scale-105' : 'text-outline group-hover:text-on-surface'
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span className="font-label-md text-label-md">{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container text-outline group-hover:text-on-surface'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Sprint & System Status */}
      <div className="flex flex-col gap-space-sm px-space-xs mt-6">
        {/* Active Handover Sprint Progress Card */}
        <div className="bg-surface-container-low rounded-lg p-space-sm flex flex-col gap-space-2xs border border-outline-variant/30">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-secondary font-semibold uppercase tracking-wider">
              {isProjectCreated ? 'Active Handover' : 'Workspace Ready'}
            </span>
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
          </div>
          <span className="font-body-sm text-body-sm text-on-surface font-medium truncate" title={isProjectCreated ? project.name : 'Workspace Ready'}>
            {isProjectCreated ? project.name : 'Workspace Ready'}
          </span>
          <div className="w-full bg-surface-container-highest rounded-full h-1.5 mt-1 overflow-hidden">
            <div
              className="bg-primary h-full rounded-full transition-all duration-500"
              style={{ width: `${stats.certificationProgressPercent}%` }}
            ></div>
          </div>
          <div className="flex items-center justify-between font-label-sm text-label-sm text-outline mt-0.5">
            <span>Review Progress</span>
            <span className="font-semibold text-on-surface">{stats.certificationProgressPercent}%</span>
          </div>
        </div>

        {/* Authentication & Security Role Card */}
        <div className="bg-surface-container-low rounded-lg p-space-sm flex flex-col gap-2 border border-outline-variant/30">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-[11px] text-outline font-semibold uppercase tracking-wider">
              {isAuthenticated ? 'Security Session' : 'Access Mode'}
            </span>
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                isAuthenticated
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'bg-surface-container-highest text-outline'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
              {isAuthenticated ? 'AUTHENTICATED' : 'ANONYMOUS'}
            </span>
          </div>

          {isAuthenticated && currentUser ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/15 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                  {currentUser.email ? currentUser.email.charAt(0).toUpperCase() : 'M'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-on-surface truncate" title={currentUser.email}>
                    {currentUser.email}
                  </div>
                  <div className="text-[10px] text-primary font-mono font-medium flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">verified</span>
                    <span>Role: {currentUser.role}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={async () => {
                  await logout();
                  if (isMobile) setIsMobileNavOpen(false);
                }}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 bg-surface-container hover:bg-error-container/20 text-on-surface hover:text-error rounded-md text-[11px] font-medium transition-colors border border-outline-variant/30"
              >
                <span className="material-symbols-outlined text-[14px]">logout</span>
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <p className="text-[11px] text-on-surface-variant leading-tight">
                Operating in Public Demo. Sign in for verified Manager access.
              </p>
              <button
                onClick={() => {
                  setShowLoginModal(true);
                  if (isMobile) setIsMobileNavOpen(false);
                }}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 bg-primary hover:bg-inverse-surface text-on-primary rounded-md text-[11px] font-semibold transition-all shadow-xs"
              >
                <span className="material-symbols-outlined text-[14px]">login</span>
                <span>Sign In as Manager</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer Meta & Demo Reset */}
        <div className="flex items-center justify-between text-outline px-space-xs pt-space-xs">
          <div className="flex items-center gap-1.5">
            <span className="font-label-sm text-label-sm">v2.4.0-stable</span>
            <span className="text-[10px] bg-secondary-container text-on-secondary-container px-1.5 py-0.2 rounded font-mono font-medium">
              CIP-26
            </span>
          </div>
          <button
            onClick={() => {
              if (confirm('Reset workspace and clear current project data?')) {
                resetDemoData();
                if (isMobile) setIsMobileNavOpen(false);
              }
            }}
            title="Reset Workspace"
            className="flex items-center gap-1 text-[11px] text-outline hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">restart_alt</span>
            <span>Reset</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Desktop Floating Navigation Rail (Unchanged for lg+ screens) */}
      <aside className="hidden lg:flex fixed left-4 top-4 bottom-4 w-64 bg-surface-container-lowest z-30 rounded-xl shadow-[0_10px_30px_-4px_rgba(32,40,34,0.08),0_4px_10px_-2px_rgba(32,40,34,0.03)] border border-outline-variant/30 flex-col overflow-y-auto no-scrollbar transition-all">
        {renderNavContent(false)}
      </aside>

      {/* 2. Mobile Responsive Drawer (< lg screens) */}
      {isMobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setIsMobileNavOpen(false)}
            aria-hidden="true"
          />

          {/* Slide-over Drawer */}
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Navigation Drawer"
            className="relative w-72 max-w-[85vw] h-full bg-surface-container-lowest shadow-2xl overflow-y-auto no-scrollbar animate-in slide-in-from-left duration-200 border-r border-outline-variant/30"
          >
            {renderNavContent(true)}
          </aside>
        </div>
      )}
    </>
  );
}
