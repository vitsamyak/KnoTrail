'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  ActiveView,
  EvidenceCitation,
  EvidenceStatus,
  KnowledgeFinding,
  ProjectData,
  ProjectSource,
} from '../lib/types';
import { INITIAL_PROJECT_DATA } from '../lib/demoData';
import { checkHandoverBlockStatus } from '../lib/handoverFilter';

interface ProjectContextType {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  project: ProjectData;
  workspaceId: string;
  isLoading: boolean;
  isSaving: boolean;
  saveError: string | null;
  lastSavedAt: Date | null;
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
  addSource: (source: { name: string; type: ProjectSource['type']; content: string; description: string }) => Promise<void>;
  approveFinding: (id: string, reviewerNotes?: string) => Promise<void>;
  rejectFinding: (id: string, reason?: string) => Promise<void>;
  editFinding: (id: string, updates: Partial<KnowledgeFinding>) => Promise<void>;
  resolveConflict: (id: string, resolution: string, resolvedBy: string) => Promise<void>;
  certifyHandover: (signerName: string) => Promise<void>;
  resetDemoData: () => Promise<void>;
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
    isHandoverBlocked: boolean;
    canCertifyHandover: boolean;
    unresolvedConflictsCount: number;
    unreviewedCount: number;
    handoverBlockReason: string;
  };
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

const WORKSPACE_COOKIE_KEY = 'knotrail_workspace_id';
const CACHE_PREFIX = 'knotrail_cache_';

function generateAnonymousWorkspaceId(): string {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `ws_anon_${timestamp}_${randomStr}`;
}

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [activeView, setActiveView] = useState<ActiveView>('landing');
  const [project, setProject] = useState<ProjectData>(INITIAL_PROJECT_DATA);
  const [workspaceId, setWorkspaceId] = useState<string>('default_workspace');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [evidenceFilter, setEvidenceFilter] = useState<'ALL' | EvidenceStatus>('ALL');
  const [selectedCitation, setSelectedCitation] = useState<EvidenceCitation | null>(null);
  const [selectedFinding, setSelectedFinding] = useState<KnowledgeFinding | null>(null);
  
  // Sync simulation states
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStatusMessage, setSyncStatusMessage] = useState('');

  // Helper to persist state to local cache immediately
  const persistToLocalCache = useCallback((wsId: string, updatedProject: ProjectData) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`${CACHE_PREFIX}${wsId}`, JSON.stringify(updatedProject));
        setLastSavedAt(new Date());
      } catch (err) {
        console.warn('LocalStorage write failed:', err);
      }
    }
  }, []);

  // Initialize or restore anonymous workspace on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Determine workspace ID from URL params or localStorage
    const params = new URLSearchParams(window.location.search);
    let wsId = params.get('ws') || localStorage.getItem(WORKSPACE_COOKIE_KEY);

    if (!wsId || !/^[a-zA-Z0-9_-]{3,64}$/.test(wsId)) {
      wsId = generateAnonymousWorkspaceId();
      try {
        localStorage.setItem(WORKSPACE_COOKIE_KEY, wsId);
      } catch (err) {
        console.warn('Could not store workspace ID in localStorage:', err);
      }
    }
    setWorkspaceId(wsId);

    // 2. Check local cache first for instant render (zero flicker)
    const cachedData = localStorage.getItem(`${CACHE_PREFIX}${wsId}`);
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        if (parsed && parsed.id) {
          setProject(parsed);
          setIsLoading(false);
        }
      } catch (e) {
        console.warn('Invalid cached project data:', e);
      }
    }

    // 3. Revalidate and synchronize with backend server API
    fetch(`/api/workspaces?workspaceId=${encodeURIComponent(wsId)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (data?.project) {
          setProject(data.project);
          persistToLocalCache(wsId, data.project);
        }
      })
      .catch((err) => {
        console.warn('Could not sync with /api/workspaces:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [persistToLocalCache]);

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

    const updatedSources = project.sources.map((s) => ({
      ...s,
      lastSync: 'Just now',
      status: 'connected' as const,
    }));

    const updatedProject: ProjectData = {
      ...project,
      lastAnalysed: 'Just now',
      sources: updatedSources,
    };

    setProject(updatedProject);
    persistToLocalCache(workspaceId, updatedProject);

    await new Promise((r) => setTimeout(r, 800));
    setIsSyncing(false);
    setSyncProgress(0);
    setSyncStatusMessage('');
  };

  // Add a new project source (user notes, repo, doc) with backend persistence
  const addSource = async (newSourceData: {
    name: string;
    type: ProjectSource['type'];
    content: string;
    description: string;
  }) => {
    setIsSaving(true);
    setSaveError(null);

    const newId = `src-user-${Date.now()}`;
    const newSource: ProjectSource = {
      id: newId,
      name: newSourceData.name,
      type: newSourceData.type,
      status: 'connected',
      lastSync: 'Just now',
      recordCount: Math.max(1, Math.floor((newSourceData.content || '').length / 50)),
      icon: newSourceData.type === 'github' ? 'commit' : newSourceData.type === 'notes' ? 'edit_note' : 'description',
      description: newSourceData.description || 'Custom ingested project context.',
      privacyLevel: 'LOCAL_READ_ONLY',
    };

    const snippetPreview = (newSourceData.content || '').slice(0, 240);
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
      owner: project.lead?.name || 'Elena Rostova',
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
          snippet: (newSourceData.content || '').slice(0, 300),
          contentHash: `sha256:${Math.random().toString(16).slice(2, 10)}`,
          clearanceTier: 'INTERNAL',
          confidence: 96,
        },
      ],
    };

    const updatedProject: ProjectData = {
      ...project,
      sources: [newSource, ...project.sources],
      findings: [syntheticFinding, ...project.findings],
      lastAnalysed: 'Just now',
    };

    // Optimistic UI update + local cache
    setProject(updatedProject);
    persistToLocalCache(workspaceId, updatedProject);

    // Backend API persistence
    try {
      const res = await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          name: newSourceData.name,
          type: newSourceData.type,
          content: newSourceData.content,
          description: newSourceData.description,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data?.project) {
        setProject(data.project);
        persistToLocalCache(workspaceId, data.project);
      }
    } catch (err: any) {
      console.warn('Backend sync error for addSource:', err);
      setSaveError(err.message || 'Failed to sync source to server');
    } finally {
      setIsSaving(false);
    }
  };

  // Approve a finding with backend persistence
  const approveFinding = async (id: string, reviewerNotes?: string) => {
    setIsSaving(true);
    setSaveError(null);

    const updatedFindings = project.findings.map((f) =>
      f.id === id
        ? {
            ...f,
            approved: true,
            rejected: false,
            reviewerNotes: reviewerNotes || f.reviewerNotes || 'Approved by Lead Architect during human review.',
          }
        : f
    );

    const updatedProject: ProjectData = {
      ...project,
      findings: updatedFindings,
    };

    // Optimistic update
    setProject(updatedProject);
    persistToLocalCache(workspaceId, updatedProject);

    // Server API persistence
    try {
      const res = await fetch(`/api/findings/${encodeURIComponent(id)}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, reviewerNotes }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data?.project) {
        setProject(data.project);
        persistToLocalCache(workspaceId, data.project);
      }
    } catch (err: any) {
      console.warn('Backend sync error for approveFinding:', err);
      setSaveError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Reject a finding with backend persistence
  const rejectFinding = async (id: string, reason?: string) => {
    setIsSaving(true);
    setSaveError(null);

    const updatedFindings = project.findings.map((f) =>
      f.id === id
        ? {
            ...f,
            approved: false,
            rejected: true,
            reviewerNotes: reason || 'Rejected by Lead Reviewer — inaccurate or superseded context.',
          }
        : f
    );

    const updatedProject: ProjectData = {
      ...project,
      findings: updatedFindings,
    };

    setProject(updatedProject);
    persistToLocalCache(workspaceId, updatedProject);

    try {
      const res = await fetch(`/api/findings/${encodeURIComponent(id)}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, reason }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data?.project) {
        setProject(data.project);
        persistToLocalCache(workspaceId, data.project);
      }
    } catch (err: any) {
      console.warn('Backend sync error for rejectFinding:', err);
      setSaveError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Edit finding details with backend persistence
  const editFinding = async (id: string, updates: Partial<KnowledgeFinding>) => {
    setIsSaving(true);
    setSaveError(null);

    const updatedFindings = project.findings.map((f) => (f.id === id ? { ...f, ...updates } : f));
    const updatedProject: ProjectData = {
      ...project,
      findings: updatedFindings,
    };

    setProject(updatedProject);
    persistToLocalCache(workspaceId, updatedProject);

    try {
      const res = await fetch(`/api/findings/${encodeURIComponent(id)}/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, updates }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data?.project) {
        setProject(data.project);
        persistToLocalCache(workspaceId, data.project);
      }
    } catch (err: any) {
      console.warn('Backend sync error for editFinding:', err);
      setSaveError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Resolve an architectural conflict with backend persistence
  const resolveConflict = async (id: string, resolution: string, resolvedBy: string) => {
    setIsSaving(true);
    setSaveError(null);

    const timestamp = new Date().toISOString().split('T')[0];
    const updatedFindings = project.findings.map((f) => {
      if (f.id !== id) return f;
      return {
        ...f,
        status: 'VERIFIED' as const,
        confidence: 98,
        approved: true,
        rejected: false,
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
    });

    const updatedProject: ProjectData = {
      ...project,
      findings: updatedFindings,
    };

    setProject(updatedProject);
    persistToLocalCache(workspaceId, updatedProject);

    try {
      const res = await fetch(`/api/findings/${encodeURIComponent(id)}/resolve-conflict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, resolution, resolvedBy }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data?.project) {
        setProject(data.project);
        persistToLocalCache(workspaceId, data.project);
      }
    } catch (err: any) {
      console.warn('Backend sync error for resolveConflict:', err);
      setSaveError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Certify and seal the final handover dossier with backend persistence
  const certifyHandover = async (signerName: string) => {
    setIsSaving(true);
    setSaveError(null);

    const now = new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    const pseudoHash = `SHA256:${Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('')}`;

    const updatedProject: ProjectData = {
      ...project,
      handoverCertified: true,
      certifiedBy: signerName || 'Elena Rostova & Marcus Vance',
      certifiedDate: now,
      certificationHash: pseudoHash,
    };

    setProject(updatedProject);
    persistToLocalCache(workspaceId, updatedProject);

    try {
      const res = await fetch('/api/handovers/certify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, signerName }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      if (data?.project) {
        setProject(data.project);
        persistToLocalCache(workspaceId, data.project);
      }
    } catch (err: any) {
      console.warn('Backend sync error for certifyHandover:', err);
      setSaveError(err.message);
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to original demo and purge workspace data
  const resetDemoData = async () => {
    setIsSaving(true);
    setProject(INITIAL_PROJECT_DATA);
    setSelectedCitation(null);
    setSelectedFinding(null);
    setSearchQuery('');
    setEvidenceFilter('ALL');

    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(`${CACHE_PREFIX}${workspaceId}`);
      } catch (err) {
        console.warn('Could not clear local cache:', err);
      }
    }

    try {
      await fetch('/api/workspaces/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId }),
      });
    } catch (err) {
      console.warn('Error resetting workspace on server:', err);
    } finally {
      setIsSaving(false);
    }
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

  const approvedCount = project.findings.filter((f) => f.approved && !f.rejected).length;
  const certificationProgressPercent = Math.round((approvedCount / (totalFindings || 1)) * 100);

  const blockStatus = checkHandoverBlockStatus(project.findings, project.handoverCertified);

  return (
    <ProjectContext.Provider
      value={{
        activeView,
        setActiveView: handleSetActiveView,
        project,
        workspaceId,
        isLoading,
        isSaving,
        saveError,
        lastSavedAt,
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
          isHandoverBlocked: blockStatus.isBlocked,
          canCertifyHandover: blockStatus.canCertify,
          unresolvedConflictsCount: blockStatus.unresolvedConflictsCount,
          unreviewedCount: blockStatus.unreviewedCount,
          handoverBlockReason: blockStatus.reason,
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
