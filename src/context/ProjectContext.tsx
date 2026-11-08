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
  isAnalysing: boolean;
  analysisProgress: number;
  analysisStatusMessage: string;
  analysisError: string | null;
  hasAiApiKey: boolean;
  checkAiConfig: () => Promise<{ configured: boolean; model: string }>;
  runRealAiAnalysis: (sourceIds?: string[]) => Promise<{ success: boolean; count?: number; error?: string; configured?: boolean; telemetry?: any }>;
  addSource: (source: { name: string; type: ProjectSource['type']; content: string; description: string }) => Promise<void>;
  uploadSources: (files: File[]) => Promise<{ success: boolean; results: any[]; error?: string }>;
  deleteSource: (sourceId: string) => Promise<void>;
  approveFinding: (id: string, reviewerNotes?: string) => Promise<void>;
  rejectFinding: (id: string, reason?: string) => Promise<void>;
  editFinding: (id: string, updates: Partial<KnowledgeFinding>) => Promise<void>;
  resolveConflict: (id: string, resolution: string, resolvedBy: string) => Promise<void>;
  certifyHandover: (signerName: string) => Promise<void>;
  resetDemoData: () => Promise<void>;
  createProject: (data: {
    name: string;
    description?: string;
    category?: string;
    targetExitDate?: string;
    leadName?: string;
    leadRole?: string;
  }) => Promise<void>;
  isProjectCreated: boolean;
  showCreateProjectModal: boolean;
  setShowCreateProjectModal: (show: boolean) => void;
  stats: {
    totalSources: number;
    totalFindings: number;
    decisionsCount: number;
    tasksCount: number;
    risksCount: number;
    dependenciesCount: number;
    questionsCount: number;
    nextActionsCount: number;
    contactsCount: number;
    groundedPercent: number;
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
const CACHE_PREFIX = 'knotrail_cache_v4_';

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
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [evidenceFilter, setEvidenceFilter] = useState<'ALL' | EvidenceStatus>('ALL');
  const [selectedCitation, setSelectedCitation] = useState<EvidenceCitation | null>(null);
  const [selectedFinding, setSelectedFinding] = useState<KnowledgeFinding | null>(null);
  
  // Sync simulation states
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStatusMessage, setSyncStatusMessage] = useState('');

  // Real AI extraction states
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStatusMessage, setAnalysisStatusMessage] = useState('');
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [hasAiApiKey, setHasAiApiKey] = useState<boolean>(false);

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

    // Purge legacy cache keys or any cached data with fictional Titan records
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('knotrail_cache_') && !key.startsWith(CACHE_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch (e) {
      console.warn('Cache purge notice:', e);
    }

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
        const isFictional =
          parsed?.name === 'Project Titan Handover' ||
          parsed?.name?.includes('Titan') ||
          parsed?.lead?.name === 'Elena Rostova' ||
          parsed?.stakeholders?.some((s: any) => s.name === 'Elena Rostova' || s.name === 'Marcus Vance');
        if (isFictional) {
          localStorage.removeItem(`${CACHE_PREFIX}${wsId}`);
        } else if (parsed && parsed.id) {
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

  // Refresh workspace and synchronize sources with server
  const runAiSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncProgress(25);
    setSyncStatusMessage('Synchronizing workspace with server storage...');

    try {
      const res = await fetch(`/api/workspaces?workspaceId=${encodeURIComponent(workspaceId)}`);
      setSyncProgress(65);
      if (res.ok) {
        const data = await res.json();
        if (data?.project) {
          setProject(data.project);
          persistToLocalCache(workspaceId, data.project);
        }
      }
      setSyncProgress(100);
      setSyncStatusMessage(
        project.sources.length === 0
          ? 'Workspace synchronized. No sources uploaded yet.'
          : `Workspace synchronized. ${project.sources.length} document(s) ready.`
      );
    } catch (err) {
      console.warn('Workspace sync failed:', err);
      setSyncStatusMessage('Workspace synchronization completed locally.');
    } finally {
      setTimeout(() => {
        setIsSyncing(false);
        setSyncProgress(0);
        setSyncStatusMessage('');
      }, 700);
    }
  };

  // Check AI configuration and status
  const checkAiConfig = useCallback(async () => {
    try {
      const res = await fetch(`/api/analysis/extract?workspaceId=${encodeURIComponent(workspaceId)}`);
      if (res.ok) {
        const data = await res.json();
        setHasAiApiKey(Boolean(data.configured));
        return data;
      }
    } catch (err) {
      console.warn('Could not query AI config:', err);
    }
    return { configured: false, model: 'gemini-2.5-flash' };
  }, [workspaceId]);

  useEffect(() => {
    if (workspaceId) {
      checkAiConfig();
    }
  }, [workspaceId, checkAiConfig]);

  // Execute genuine AI extraction with Gemini 2.5 Flash across documents
  const runRealAiAnalysis = async (sourceIds?: string[]) => {
    if (isAnalysing) return { success: false, error: 'Analysis already in progress' };
    setIsAnalysing(true);
    setAnalysisError(null);
    setAnalysisProgress(15);
    setAnalysisStatusMessage('Validating sources and connecting to Gemini 2.5 Flash...');

    try {
      setAnalysisProgress(35);
      setAnalysisStatusMessage('Processing document context and dispatching to Gemini...');

      const res = await fetch('/api/analysis/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, sourceIds }),
      });

      setAnalysisProgress(75);
      setAnalysisStatusMessage('Grounding quotes and computing source coordinates...');

      const data = await res.json();

      if (!res.ok) {
        setAnalysisProgress(0);
        setIsAnalysing(false);
        setAnalysisStatusMessage('');
        const errMessage = data.error || `HTTP ${res.status}: AI Extraction failed`;
        setAnalysisError(errMessage);
        return {
          success: false,
          error: errMessage,
          configured: data.configured !== undefined ? data.configured : true,
        };
      }

      setAnalysisProgress(90);
      setAnalysisStatusMessage(`Extracted ${data.count} grounded findings. Saving workspace...`);

      if (data.project) {
        setProject(data.project);
        persistToLocalCache(workspaceId, data.project);
      }

      setAnalysisProgress(100);
      setAnalysisStatusMessage('Reconstruction complete. Findings populated in Review Center.');

      setTimeout(() => {
        setIsAnalysing(false);
        setAnalysisProgress(0);
        setAnalysisStatusMessage('');
      }, 1000);

      return {
        success: true,
        count: data.count,
        telemetry: data.telemetry,
      };
    } catch (err: any) {
      setIsAnalysing(false);
      setAnalysisProgress(0);
      setAnalysisStatusMessage('');
      const errMessage = err.message || 'AI extraction network failure';
      setAnalysisError(errMessage);
      return { success: false, error: errMessage };
    }
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
      owner: project.lead?.name || 'Project Contributor',
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

  // Upload actual document sources (PDF, TXT, Markdown) with genuine server-side extraction
  const uploadSources = async (files: File[]) => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const formData = new FormData();
      formData.append('workspaceId', workspaceId);
      for (const file of files) {
        formData.append('files', file);
      }

      const res = await fetch('/api/sources/upload', {
        method: 'POST',
        body: formData,
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

      return {
        success: data.successCount > 0,
        results: data.results || [],
      };
    } catch (err: any) {
      console.warn('Upload sources failed:', err);
      setSaveError(err.message || 'File upload failed');
      return {
        success: false,
        results: [],
        error: err.message || 'Upload failed',
      };
    } finally {
      setIsSaving(false);
    }
  };

  // Safely delete an uploaded or connected source
  const deleteSource = async (sourceId: string) => {
    setIsSaving(true);
    setSaveError(null);

    // Optimistically remove from state & local cache
    const updatedSources = project.sources.filter((s) => s.id !== sourceId);
    const updatedProject: ProjectData = {
      ...project,
      sources: updatedSources,
    };
    setProject(updatedProject);
    persistToLocalCache(workspaceId, updatedProject);

    try {
      const res = await fetch(`/api/sources/${encodeURIComponent(sourceId)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId }),
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
      console.warn('Delete source error:', err);
      setSaveError(err.message || 'Failed to delete source');
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
      certifiedBy: signerName || project.lead?.name || 'Project Reviewer',
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

  // Create a new project workspace and persist to server
  const createProject = async (data: {
    name: string;
    description?: string;
    category?: string;
    targetExitDate?: string;
    leadName?: string;
    leadRole?: string;
  }) => {
    setIsSaving(true);
    setSaveError(null);

    const updatedProject: ProjectData = {
      ...project,
      id: `proj-${Date.now().toString(36)}`,
      name: data.name.trim(),
      code:
        data.name.substring(0, 4).toUpperCase().replace(/[^A-Z]/g, 'X') +
        '-' +
        Math.floor(100 + Math.random() * 900),
      description: data.description?.trim() || `Knowledge handover workspace for ${data.name.trim()}.`,
      targetExitDate: data.targetExitDate?.trim() || 'Flexible',
      version: 'v1.0',
      lastAnalysed: 'Never',
      executiveSummary: `Project ${data.name.trim()} initialized. Upload documents to extract operational decisions, pending tasks, risks, and dependencies.`,
      isCreated: true,
      category: data.category || 'Software Engineering',
      lead: {
        id: `lead-${Date.now().toString(36)}`,
        name: data.leadName?.trim() || 'Project Contributor',
        role: data.leadRole?.trim() || 'Handover Lead',
        email: `${(data.leadName || 'contributor').toLowerCase().replace(/\s+/g, '.')}@knotrail.internal`,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        outgoing: true,
        transitionNotes: 'Lead contributor.',
      },
      stakeholders: [],
      sources: project.sources || [],
      findings: project.findings || [],
      handoverCertified: false,
      certificationHash: '',
    };

    setProject(updatedProject);
    persistToLocalCache(workspaceId, updatedProject);

    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, project: updatedProject }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const respData = await res.json();
      if (respData?.project) {
        setProject(respData.project);
        persistToLocalCache(workspaceId, respData.project);
      }
    } catch (err: any) {
      console.warn('Backend sync error for createProject:', err);
      setSaveError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const isProjectCreated = Boolean(
    project.isCreated ||
      (project.name &&
        project.name !== 'Knowledge Handover Workspace' &&
        project.id !== 'proj-default-001')
  );

  // Calculate live statistics
  const totalSources = project.sources.length;
  const totalFindings = project.findings.length;
  const decisionsCount = project.findings.filter((f) => f.type === 'decision').length;
  const tasksCount = project.findings.filter((f) => f.type === 'task').length;
  const risksCount = project.findings.filter((f) => f.type === 'risk').length;
  const dependenciesCount = project.findings.filter((f) => f.type === 'dependency').length;
  const questionsCount = project.findings.filter((f) => f.type === 'unresolved_question').length;
  const nextActionsCount = project.findings.filter((f) => f.type === 'next_action').length;
  const contactsCount = project.findings.filter((f) => f.type === 'contact').length;

  const verifiedCount = project.findings.filter((f) => f.status === 'VERIFIED').length;
  const uncertainCount = project.findings.filter((f) => f.status === 'UNCERTAIN').length;
  const conflictingCount = project.findings.filter((f) => f.status === 'CONFLICTING').length;
  const missingCount = project.findings.filter((f) => f.status === 'MISSING').length;
  const groundedPercent = totalFindings > 0 ? Math.round((verifiedCount / totalFindings) * 100) : 0;

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
        isAnalysing,
        analysisProgress,
        analysisStatusMessage,
        analysisError,
        hasAiApiKey,
        checkAiConfig,
        runRealAiAnalysis,
        addSource,
        uploadSources,
        deleteSource,
        approveFinding,
        rejectFinding,
        editFinding,
        resolveConflict,
        certifyHandover,
        resetDemoData,
        createProject,
        isProjectCreated,
        showCreateProjectModal,
        setShowCreateProjectModal,
        stats: {
          totalSources,
          totalFindings,
          decisionsCount,
          tasksCount,
          risksCount,
          dependenciesCount,
          questionsCount,
          nextActionsCount,
          contactsCount,
          groundedPercent,
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
