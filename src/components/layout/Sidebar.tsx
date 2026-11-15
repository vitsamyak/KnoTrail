'use client';

import React from 'react';
import { useProject } from '../../context/ProjectContext';
import { ActiveView } from '../../lib/types';

interface NavItem {
  id: ActiveView;
  label: string;
  icon: string;
  badge?: string;
  badgeVariant?: 'default' | 'success' | 'warning';
}

interface NavGroup {
  heading: string;
  items: NavItem[];
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
    currentUserRole,
    demoPerspective,
    isAuthenticated,
    setShowLoginModal,
    logout,
  } = useProject();

  const navGroups: NavGroup[] = [
    {
      heading: 'WORKSPACE',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: 'grid_view' },
        { id: 'workspace', label: 'Projects', icon: 'folder_open' },
        {
          id: 'sources',
          label: 'Sources & GitHub',
          icon: 'dataset',
          badge: stats.totalSources > 0 ? `${stats.totalSources}` : undefined,
        },
      ],
    },
    {
      heading: 'KNOWLEDGE ENGINE',
      items: [
        { id: 'analysis', label: 'AI Analysis', icon: 'auto_awesome' },
        {
          id: 'evidence',
          label: 'Evidence Explorer',
          icon: 'fact_check',
          badge: stats.totalFindings > 0 ? `${stats.totalFindings}` : undefined,
        },
      ],
    },
    {
      heading: 'GOVERNANCE & DELIVERY',
      items: [
        {
          id: 'review',
          label: 'Review Center',
          icon: 'rule',
          badge: `${stats.certificationProgressPercent}%`,
          badgeVariant: stats.certificationProgressPercent === 100 ? 'success' : 'default',
        },
        {
          id: 'handover',
          label: 'Handover Dossier',
          icon: stats.isHandoverBlocked ? 'lock' : 'verified',
          badge: stats.isHandoverBlocked ? 'Locked' : project.handoverCertified ? 'Certified' : 'Ready',
          badgeVariant: project.handoverCertified ? 'success' : stats.isHandoverBlocked ? 'warning' : 'default',
        },
      ],
    },
  ];

  const renderNavContent = (isMobile = false) => (
    <div className="flex flex-col h-full select-none text-on-surface">
      {/* 1. Brand Header: Height h-14 matches Topbar exactly */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-outline-variant/30 shrink-0">
        <button
          onClick={() => {
            setActiveView('landing');
            if (isMobile) setIsMobileNavOpen(false);
          }}
          className="flex items-center gap-2.5 text-left group transition-all focus:outline-none"
          title="Return to Product Landing Page"
        >
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-on-primary shadow-2xs group-hover:bg-primary-hover transition-colors shrink-0">
            <span className="material-symbols-outlined text-[18px]">hub</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-on-surface tracking-tight leading-none group-hover:text-primary transition-colors">
              KnoTrail
            </span>
            <span className="text-[10px] text-secondary tracking-normal leading-tight font-medium mt-0.5">
              Enterprise Handover
            </span>
          </div>
        </button>

        {isMobile && (
          <button
            onClick={() => setIsMobileNavOpen(false)}
            aria-label="Close navigation menu"
            className="p-1 rounded-lg text-secondary hover:text-on-surface hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        )}
      </div>

      {/* 2. Organized Navigation Groups */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {navGroups.map((group) => (
          <div key={group.heading} className="space-y-1">
            <div className="px-2.5 pb-1 text-[10px] font-bold text-secondary uppercase tracking-wider font-mono">
              {group.heading}
            </div>
            {group.items.map((item) => {
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveView(item.id);
                    if (isMobile) setIsMobileNavOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors text-left group ${
                    isActive
                      ? 'bg-primary text-on-primary font-medium shadow-2xs'
                      : 'text-on-surface hover:text-primary hover:bg-surface-container font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`material-symbols-outlined text-[18px] transition-colors shrink-0 ${
                        isActive ? 'text-on-primary' : 'text-secondary group-hover:text-primary'
                      }`}
                    >
                      {item.icon}
                    </span>
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-mono font-medium px-1.5 py-0.2 rounded-full border shrink-0 ${
                        isActive
                          ? 'bg-white/20 text-white border-white/30'
                          : item.badgeVariant === 'success'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : item.badgeVariant === 'warning'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-surface-container text-secondary border-outline-variant/40'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* 3. Bottom Status Section: Workspace Health & Access Information */}
      <div className="p-3 border-t border-outline-variant/30 shrink-0 space-y-2 bg-surface">
        {/* Workspace Health Card */}
        <div className="bg-surface-container-low/60 rounded-xl p-2.5 border border-outline-variant/40 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 font-medium text-on-surface min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
              <span
                className="truncate text-[11px] font-semibold"
                title={isProjectCreated ? project.name : 'Workspace Active'}
              >
                {isProjectCreated ? project.name : 'Workspace Active'}
              </span>
            </div>
            <span className="font-mono text-[11px] font-bold text-primary shrink-0">
              {stats.certificationProgressPercent}%
            </span>
          </div>

          <div className="w-full bg-surface-container h-1 rounded-full overflow-hidden">
            <div
              className="bg-primary h-full rounded-full transition-all duration-300"
              style={{ width: `${stats.certificationProgressPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-secondary font-medium">
            <span>{stats.approvedCount} approved • {stats.unreviewedCount} pending</span>
            <span className={stats.isHandoverBlocked ? 'text-amber-700' : 'text-emerald-700 font-semibold'}>
              {stats.isHandoverBlocked ? 'Blocked' : 'Certified'}
            </span>
          </div>
        </div>

        {/* User / Demo Role Info Row */}
        <div className="bg-surface-container-low/40 rounded-xl px-2.5 py-1.5 border border-outline-variant/30 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isAuthenticated ? 'bg-emerald-500' : 'bg-primary/70'}`} />
            <span className="text-[11px] text-on-surface font-medium truncate">
              {isAuthenticated ? (
                <>Manager <span className="text-secondary text-[10px] font-mono">(Verified)</span></>
              ) : (
                <>Demo Mode <span className="text-secondary text-[10px] font-mono">({demoPerspective || 'Manager'})</span></>
              )}
            </span>
          </div>
          {isAuthenticated ? (
            <button
              onClick={async () => {
                await logout();
                if (isMobile) setIsMobileNavOpen(false);
              }}
              className="text-[11px] text-secondary hover:text-error transition-colors font-medium shrink-0 ml-1"
            >
              Sign Out
            </button>
          ) : (
            <button
              onClick={() => {
                setShowLoginModal(true);
                if (isMobile) setIsMobileNavOpen(false);
              }}
              className="text-[11px] text-primary hover:text-primary-hover font-semibold transition-colors shrink-0 ml-1"
            >
              Sign In
            </button>
          )}
        </div>

        {/* Footer Meta & Demo Reset */}
        <div className="flex items-center justify-between text-[10px] text-secondary px-1 pt-0.5">
          <span className="font-mono">v2.4.0 • CIP-26</span>
          <button
            onClick={() => {
              if (confirm('Reset workspace and clear current project data?')) {
                resetDemoData();
                if (isMobile) setIsMobileNavOpen(false);
              }
            }}
            title="Reset Workspace Data"
            className="flex items-center gap-0.5 hover:text-error transition-colors font-medium"
          >
            <span className="material-symbols-outlined text-[13px]">restart_alt</span>
            <span>Reset Data</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Desktop Docked Sidebar (Fixed edge-to-edge on the left, w-64) */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 bg-surface z-30 border-r border-outline-variant/40 flex-col transition-all">
        {renderNavContent(false)}
      </aside>

      {/* 2. Mobile Responsive Drawer */}
      {isMobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
            onClick={() => setIsMobileNavOpen(false)}
            aria-hidden="true"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Navigation Drawer"
            className="relative w-64 max-w-[80vw] h-full bg-surface shadow-xl overflow-y-auto no-scrollbar animate-in slide-in-from-left duration-150 border-r border-outline-variant/40"
          >
            {renderNavContent(true)}
          </aside>
        </div>
      )}
    </>
  );
}
