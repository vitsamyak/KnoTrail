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
  const { activeView, setActiveView, stats, project, resetDemoData, isProjectCreated } = useProject();

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

  return (
    <aside className="fixed left-4 top-4 bottom-4 w-64 bg-surface-container-lowest z-50 rounded-xl shadow-[0_10px_30px_-4px_rgba(32,40,34,0.08),0_4px_10px_-2px_rgba(32,40,34,0.03)] border border-outline-variant/30 flex flex-col justify-between py-space-lg px-space-md select-none transition-all">
      <div className="flex flex-col gap-space-lg">
        {/* Brand Header */}
        <button
          onClick={() => setActiveView('landing')}
          className="flex items-center gap-space-sm px-space-xs text-left group transition-transform active:scale-95"
          title="Return to Landing Page"
        >
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center text-on-primary shadow-sm group-hover:bg-primary-container transition-colors">
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

        {/* Navigation Items */}
        <nav className="flex flex-col gap-space-2xs">
          {navItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`flex items-center justify-between px-space-md py-space-xs rounded-xl transition-all duration-200 text-left group ${
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
      <div className="flex flex-col gap-space-sm px-space-xs">
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
            <span>Certification</span>
            <span className="font-semibold text-on-surface">{stats.certificationProgressPercent}%</span>
          </div>
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
              if (confirm('Reset workspace to clean empty state?')) {
                resetDemoData();
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
    </aside>
  );
}
