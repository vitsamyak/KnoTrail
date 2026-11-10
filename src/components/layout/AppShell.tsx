'use client';

import React, { useEffect } from 'react';
import { useProject } from '../../context/ProjectContext';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { CreateProjectModal } from '../modals/CreateProjectModal';
import { KnowledgeTrailLoader } from '../ui/KnowledgeTrailLoader';

export function AppShell({ children }: { children: React.ReactNode }) {
  const {
    activeView,
    setActiveView,
    isLoading,
    isNavigating,
    isMobileNavOpen,
    setIsMobileNavOpen,
    isSyncing,
    syncProgress,
    syncStatusMessage,
    showCreateProjectModal,
    setShowCreateProjectModal,
  } = useProject();

  // Lock background scroll when mobile drawer is open
  useEffect(() => {
    if (isMobileNavOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileNavOpen]);

  // 1. GLOBAL INITIAL LOADING SCREEN (While workspace is initializing)
  if (isLoading) {
    return (
      <KnowledgeTrailLoader
        variant="fullscreen"
        message="Preparing your workspace..."
        submessage="Connecting workspace sources and verifying knowledge integrity..."
        step={1}
      />
    );
  }

  // 2. LANDING PAGE VIEW (Clean layout without left sidebar)
  if (activeView === 'landing') {
    return (
      <div className="min-h-screen bg-background font-body-md text-on-surface antialiased relative">
        {/* Subtle Top Route Progress Indicator */}
        {isNavigating && (
          <div
            role="progressbar"
            aria-label="Navigating view"
            className="fixed top-0 left-0 right-0 h-[2.5px] z-50 bg-gradient-to-r from-primary/30 via-primary to-primary-container shadow-[0_0_8px_rgba(65,99,82,0.4)] transition-opacity duration-200"
          />
        )}
        <div key={activeView} className="animate-in fade-in duration-200">
          {children}
        </div>
      </div>
    );
  }

  // 3. MAIN APPLICATION SHELL (With navigation rail and header)
  return (
    <div className="min-h-screen bg-background font-body-md text-on-surface antialiased relative">
      {/* Subtle Top Route Progress Indicator for fast, tactile navigation feedback */}
      {isNavigating && (
        <div
          role="progressbar"
          aria-label="Navigating view"
          className="fixed top-0 left-0 right-0 h-[2.5px] z-50 bg-gradient-to-r from-primary/30 via-primary to-primary-container shadow-[0_0_8px_rgba(65,99,82,0.4)] transition-opacity duration-200"
        />
      )}

      {/* Floating Left Navigation Rail / Responsive Mobile Drawer */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="lg:pl-[18rem] pl-0 transition-all">
        {/* Fixed Top Header */}
        <Header />

        {/* Dynamic View Content with smooth fade-in */}
        <main
          key={activeView}
          className="relative pt-20 sm:pt-24 px-3 sm:px-6 lg:pr-6 lg:pl-0 pb-space-2xl min-h-screen animate-in fade-in duration-200"
        >
          {children}
        </main>
      </div>

      {/* Live AI Sync Modal with KnoTrail Knowledge Trail */}
      {isSyncing && (
        <div className="fixed inset-0 bg-inverse-surface/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest max-w-md w-full rounded-2xl p-space-xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-outline-variant/40 flex flex-col items-center text-center">
            <KnowledgeTrailLoader
              variant="section"
              message="Synthesizing Engineering State"
              submessage={syncStatusMessage || 'Synchronizing workspace with server storage...'}
              progress={syncProgress}
              step={2}
            />
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
