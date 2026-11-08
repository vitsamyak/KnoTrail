'use client';

import React from 'react';
import { ProjectProvider, useProject } from '../context/ProjectContext';
import { AppShell } from '../components/layout/AppShell';
import { LandingView } from '../components/views/LandingView';
import { DashboardView } from '../components/views/DashboardView';
import { WorkspaceView } from '../components/views/WorkspaceView';
import { SourceManagerView } from '../components/views/SourceManagerView';
import { AnalysisView } from '../components/views/AnalysisView';
import { EvidenceView } from '../components/views/EvidenceView';
import { ReviewView } from '../components/views/ReviewView';
import { HandoverView } from '../components/views/HandoverView';

function MainRouter() {
  const { activeView } = useProject();

  switch (activeView) {
    case 'landing':
      return <LandingView />;
    case 'dashboard':
      return <DashboardView />;
    case 'workspace':
      return <WorkspaceView />;
    case 'sources':
      return <SourceManagerView />;
    case 'analysis':
      return <AnalysisView />;
    case 'evidence':
      return <EvidenceView />;
    case 'review':
      return <ReviewView />;
    case 'handover':
      return <HandoverView />;
    default:
      return <DashboardView />;
  }
}

export default function Home() {
  return (
    <ProjectProvider>
      <AppShell>
        <MainRouter />
      </AppShell>
    </ProjectProvider>
  );
}
