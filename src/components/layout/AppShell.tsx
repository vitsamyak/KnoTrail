'use client';

import React, { useEffect } from 'react';
import { useProject } from '../../context/ProjectContext';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { CreateProjectModal } from '../modals/CreateProjectModal';
import { LoginModal } from '../modals/LoginModal';
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
    showLoginModal,
    setShowLoginModal,
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

        {/* Global Login Modal on Landing */}
        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
          onSuccess={() => setActiveView('workspace')}
        />
      </div>
    );
  }

  // 3. ENTERPRISE APPLICATION SHELL (Docked sidebar, edge-to-edge sticky topbar, aligned main content)
  return (
    <div className="min-h-screen bg-background font-body-md text-on-surface antialiased flex flex-col">
      {/* Route Progress Indicator */}
      {isNavigating && (
        <div
          role="progressbar"
          aria-label="Navigating view"
          className="fixed top-0 left-0 right-0 h-[2px] z-50 bg-primary transition-opacity duration-200"
        />
      )}

      {/* Docked Left Sidebar (Desktop) + Mobile Drawer */}
      <Sidebar />

      {/* Main Content Area (Offset by sidebar width on desktop) */}
      <div className="lg:pl-64 flex flex-col flex-1 min-w-0 transition-all">
        {/* Docked Sticky Top Header */}
        <Header />

        {/* Page Content Container with Consistent Horizontal & Vertical Padding */}
        <main
          key={activeView}
          className="flex-1 w-full max-w-7xl 2xl:max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 transition-opacity duration-150 animate-in fade-in"
        >
          {children}
        </main>
      </div>

      {/* Live AI Sync Modal with KnoTrail Knowledge Trail */}
      {isSyncing && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-surface max-w-md w-full rounded-2xl p-6 shadow-xl border border-outline-variant/40 flex flex-col items-center text-center">
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

      {/* Global Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={() => setActiveView('workspace')}
      />
    </div>
  );
}
