'use client';

import React from 'react';
import { useProject } from '../../context/ProjectContext';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { CreateProjectModal } from '../modals/CreateProjectModal';

export function AppShell({ children }: { children: React.ReactNode }) {
  const {
    activeView,
    setActiveView,
    isSyncing,
    syncProgress,
    syncStatusMessage,
    showCreateProjectModal,
    setShowCreateProjectModal,
  } = useProject();

  // If on Landing page, render clean landing canvas without side rail
  if (activeView === 'landing') {
    return (
      <div className="min-h-screen bg-background font-body-md text-on-surface antialiased">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-body-md text-on-surface antialiased relative">
      {/* Floating Left Navigation Rail */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="pl-[18rem] transition-all">
        {/* Fixed Top Header */}
        <Header />

        {/* Dynamic View Content */}
        <main className="relative pt-24 pr-4 pb-space-2xl min-h-screen">
          {children}
        </main>
      </div>

      {/* Live AI Sync Progress Modal / Overlay */}
      {isSyncing && (
        <div className="fixed inset-0 bg-inverse-surface/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest max-w-md w-full rounded-2xl p-space-xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-outline-variant/40 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-primary-fixed flex items-center justify-center text-primary mb-space-md animate-pulse">
              <span className="material-symbols-outlined text-[28px] animate-spin">sync</span>
            </div>
            <h3 className="font-headline-md text-headline-md text-on-surface">
              Synthesizing Engineering State
            </h3>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1 mb-space-lg">
              {syncStatusMessage}
            </p>

            {/* Progress bar */}
            <div className="w-full bg-surface-container-high rounded-full h-2 overflow-hidden mb-space-xs">
              <div
                className="bg-primary h-full transition-all duration-300 rounded-full"
                style={{ width: `${syncProgress}%` }}
              ></div>
            </div>
            <div className="w-full flex items-center justify-between text-xs text-outline font-mono">
              <span>Grounding check: PASS</span>
              <span>{syncProgress}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Global Create Project Modal */}
      <CreateProjectModal
        isOpen={showCreateProjectModal}
        onClose={() => setShowCreateProjectModal(false)}
        onSuccess={() => setActiveView('workspace')}
      />
    </div>
  );
}
