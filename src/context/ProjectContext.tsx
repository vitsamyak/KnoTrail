'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  ActiveView,
  EvidenceCitation,
  EvidenceStatus,
  KnowledgeFinding,
  ProjectData,
  ProjectSource,
} from '../lib/types';
import { INITIAL_PROJECT_DATA } from '../lib/demoData';

interface ProjectContextType {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  project: ProjectData;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  evidenceFilter: 'ALL' | EvidenceStatus;
  setEvidenceFilter: (filter: 'ALL' | EvidenceStatus) => void;
  selectedCitation: EvidenceCitation | null;
  setSelectedCitation: (citation: EvidenceCitation | null) => void;
  selectedFinding: KnowledgeFinding | null;
  setSelectedFinding: (finding: KnowledgeFinding | null) => void;
  isSyncing: boolean;
  syncProgress: number;
  syncStatusMessage: string;
  runAiSync: () => Promise<void>;
  addSource: (source: { name: string; type: ProjectSource['type']; content: string; description: string }) => void;
  approveFinding: (id: string, reviewerNotes?: string) => void;
  rejectFinding: (id: string, reason?: string) => void;
  editFinding: (id: string, updates: Partial<KnowledgeFinding>) => void;
  resolveConflict: (id: string, resolution: string, resolvedBy: string) => void;
  certifyHandover: (signerName: string) => void;
  resetDemoData: () => void;
  stats: {
    totalSources: number;
    totalFindings: number;
    decisionsCount: number;
    tasksCount: number;
    risksCount: number;
    dependenciesCount: number;
    verifiedCount: number;
    uncertainCount: number;
    conflictingCount: number;
    missingCount: number;
    approvedCount: number;
    certificationProgressPercent: number;
  };
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [activeView, setActiveView] = useState<ActiveView>('landing');
  const [project, setProject] = useState<ProjectData>(INITIAL_PROJECT_DATA);
  const [searchQuery, setSearchQuery] = useState('');
  const [evidenceFilter, setEvidenceFilter] = useState<'ALL' | EvidenceStatus>('ALL');
  const [selectedCitation, setSelectedCitation] = useState<EvidenceCitation | null>(null);
  const [selectedFinding, setSelectedFinding] = useState<KnowledgeFinding | null>(null);
  
  // Sync simulation states
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStatusMessage, setSyncStatusMessage] = useState('');

  // Handle URL hash navigation for direct links (#workspace, #sources, etc.)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') as ActiveView;
      const validViews: ActiveView[] = [
        'landing',
        'dashboard',
        'workspace',
        'sources',
        'analysis',
        'evidence',
        'review',
        'handover',
      ];
      if (validViews.includes(hash)) {
        setActiveView(hash);
      }
    };

    if (window.location.hash) {
      handleHashChange();
    }

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Update URL hash when activeView changes
  const handleSetActiveView = (view: ActiveView) => {
    setActiveView(view);
    if (typeof window !== 'undefined') {
      window.location.hash = view;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Run real-time AI sync simulation
  const runAiSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncProgress(10);
    setSyncStatusMessage('Querying connected repositories and channels...');

    await new Promise((r) => setTimeout(r, 600));
    setSyncProgress(35);
    setSyncStatusMessage('Synthesizing commit diffs and ADR documents...');

    await new Promise((r) => setTimeout(r, 700));
    setSyncProgress(70);
    setSyncStatusMessage('Correlating claims against verified code citations...');

    await new Promise((r) => setTimeout(r, 600));
    setSyncProgress(90);
    setSyncStatusMessage('Resolving heuristic semantic conflicts...');

    await new Promise((r) => setTimeout(r, 500));
    setSyncProgress(100);
    setSyncStatusMessage('Reconstruction complete. 0 ungrounded claims generated.');

    setProject((prev) => ({
      ...prev,
      lastAnalysed: 'Just now',
      sources: prev.sources.map((s) => ({
        ...s,
        lastSync: 'Just now',
        status: 'connected',
      })),
    }));

    await new Promise((r) => setTimeout(r, 800));
    setIsSyncing(false);
    setSyncProgress(0);
    setSyncStatusMessage('');
  };

  // Add a new project source (user notes, repo, doc)
  const addSource = (newSourceData: {
    name: string;
    type: ProjectSource['type'];
    content: string;
    description: string;
  }) => {
    const newId = `src-user-${Date.now()}`;
    const newSource: ProjectSource = {
      id: newId,
      name: newSourceData.name,
      type: newSourceData.type,
      status: 'connected',
      lastSync: 'Just now',
      recordCount: Math.max(1, Math.floor(newSourceData.content.length / 50)),
      icon: newSourceData.type === 'github' ? 'commit' : newSourceData.type === 'notes' ? 'edit_note' : 'description',
      description: newSourceData.description || 'Custom ingested project context.',
      privacyLevel: 'LOCAL_READ_ONLY',
    };

    // Synthesize an authentic finding from the content
    const snippetPreview = newSourceData.content.slice(0, 240);
    const findingId = `FIND-INGEST-${Date.now().toString().slice(-4)}`;
    const syntheticFinding: KnowledgeFinding = {
      id: findingId,
      type: 'decision',
      title: `Ingested Context: ${newSourceData.name.replace(/\.[^/.]+$/, '')}`,
      summary: snippetPreview.length > 80 ? snippetPreview + '...' : snippetPreview || 'Ingested operational documentation.',
      reasoning: 'Extracted directly from newly submitted project documentation by user during active session.',
      impact: 'Preserves critical institutional context provided in manual transfer notes.',
      status: 'VERIFIED',
      confidence: 96,
      category: 'User Ingested Notes',
      urgency: 'medium',
      owner: 'Elena Rostova',
      createdDate: new Date().toISOString().split('T')[0],
      approved: false,
      reviewerNotes: 'Pending human review in Review Center.',
      citations: [
        {
          id: `cit-${Date.now()}`,
          sourceId: newId,
          sourceName: newSourceData.name,
          sourceType: newSourceData.type,
          file: newSourceData.name,
          lineRange: '1-15',
          author: 'Session Contributor',
          timestamp: new Date().toUTCString(),
          snippet: newSourceData.content.slice(0, 300),
          contentHash: `sha256:${Math.random().toString(16).slice(2, 10)}`,
          clearanceTier: 'INTERNAL',
          confidence: 96,
        },
      ],
    };

    setProject((prev) => ({
      ...prev,
      sources: [newSource, ...prev.sources],
      findings: [syntheticFinding, ...prev.findings],
      lastAnalysed: 'Just now',
    }));
  };

  // Approve a finding
  const approveFinding = (id: string, reviewerNotes?: string) => {
    setProject((prev) => ({
      ...prev,
      findings: prev.findings.map((f) =>
        f.id === id
          ? {
              ...f,
              approved: true,
              rejected: false,
              reviewerNotes: reviewerNotes || f.reviewerNotes || 'Approved by Lead Architect during human review.',
            }
          : f
      ),
    }));
  };

  // Reject a finding
  const rejectFinding = (id: string, reason?: string) => {
    setProject((prev) => ({
      ...prev,
      findings: prev.findings.map((f) =>
        f.id === id
          ? {
              ...f,
              approved: false,
              rejected: true,
              reviewerNotes: reason || 'Rejected by Lead Reviewer — inaccurate or superseded context.',
            }
          : f
      ),
    }));
  };

  // Edit finding details
  const editFinding = (id: string, updates: Partial<KnowledgeFinding>) => {
    setProject((prev) => ({
      ...prev,
      findings: prev.findings.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    }));
  };

  // Resolve an architectural conflict
  const resolveConflict = (id: string, resolution: string, resolvedBy: string) => {
    const timestamp = new Date().toISOString().split('T')[0];
    setProject((prev) => ({
      ...prev,
      findings: prev.findings.map((f) => {
        if (f.id !== id) return f;
        return {
          ...f,
          status: 'VERIFIED',
          confidence: 98,
          approved: true,
          reviewerNotes: `Conflict resolved by ${resolvedBy}: ${resolution}`,
          conflictDetails: f.conflictDetails
            ? {
                ...f.conflictDetails,
                resolution,
                resolvedBy,
                resolvedAt: timestamp,
              }
            : undefined,
        };
      }),
    }));
  };

  // Certify and seal the final handover dossier
  const certifyHandover = (signerName: string) => {
    const now = new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    const pseudoHash = `SHA256:${Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('')}`;

    setProject((prev) => ({
      ...prev,
      handoverCertified: true,
      certifiedBy: signerName || 'Elena Rostova & Marcus Vance',
      certifiedDate: now,
      certificationHash: pseudoHash,
    }));
  };

  // Reset to original demo
  const resetDemoData = () => {
    setProject(INITIAL_PROJECT_DATA);
    setSelectedCitation(null);
    setSelectedFinding(null);
    setSearchQuery('');
    setEvidenceFilter('ALL');
  };

  // Calculate live statistics
  const totalSources = project.sources.length;
  const totalFindings = project.findings.length;
  const decisionsCount = project.findings.filter((f) => f.type === 'decision').length;
  const tasksCount = project.findings.filter((f) => f.type === 'task').length;
  const risksCount = project.findings.filter((f) => f.type === 'risk').length;
  const dependenciesCount = project.findings.filter((f) => f.type === 'dependency').length;

  const verifiedCount = project.findings.filter((f) => f.status === 'VERIFIED').length;
  const uncertainCount = project.findings.filter((f) => f.status === 'UNCERTAIN').length;
  const conflictingCount = project.findings.filter((f) => f.status === 'CONFLICTING').length;
  const missingCount = project.findings.filter((f) => f.status === 'MISSING').length;

  const approvedCount = project.findings.filter((f) => f.approved).length;
  const certificationProgressPercent = Math.round((approvedCount / (totalFindings || 1)) * 100);

  return (
    <ProjectContext.Provider
      value={{
        activeView,
        setActiveView: handleSetActiveView,
        project,
        searchQuery,
        setSearchQuery,
        evidenceFilter,
        setEvidenceFilter,
        selectedCitation,
        setSelectedCitation,
        selectedFinding,
        setSelectedFinding,
        isSyncing,
        syncProgress,
        syncStatusMessage,
        runAiSync,
        addSource,
        approveFinding,
        rejectFinding,
        editFinding,
        resolveConflict,
        certifyHandover,
        resetDemoData,
        stats: {
          totalSources,
          totalFindings,
          decisionsCount,
          tasksCount,
          risksCount,
          dependenciesCount,
          verifiedCount,
          uncertainCount,
          conflictingCount,
          missingCount,
          approvedCount,
          certificationProgressPercent,
        },
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}
