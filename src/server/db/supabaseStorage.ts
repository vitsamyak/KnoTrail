import crypto from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  KnowledgeFinding,
  ProjectData,
  ProjectSource,
  ConflictRecord,
  ReviewAuditAction,
  HandoverDocument,
  HandoverShareRecord,
} from '../../lib/types.ts';
import { INITIAL_PROJECT_DATA } from '../../lib/demoData.ts';
import { revalidateEditedFinding } from '../verification/verifier.ts';
import { buildHandoverDocument, computeProjectDataSnapshotHash } from '../handover/generator.ts';
import {
  isValidWorkspaceId,
  ConcurrencyConflictError,
  hashShareToken,
  type DatabaseWorkspaceRow,
  type DatabaseHandoverShareRow,
} from './types.ts';
import {
  getServerSupabaseClient,
  getSupabaseConfig,
  DEFAULT_STORAGE_BUCKET,
} from './supabaseClient.ts';
import { sanitizeProjectData, type StorageRepository } from './storage.ts';

export interface SupabaseStorageOptions {
  client?: SupabaseClient;
  bucket?: string;
}

/**
 * Supabase-backed implementation of StorageRepository.
 * Persists complete ProjectData in PostgreSQL JSONB with optimistic concurrency control
 * and stores original document files in private Supabase Storage.
 */
export class SupabaseStorageRepository implements StorageRepository {
  private client: SupabaseClient;
  private bucket: string;
  private workspaceVersions: Map<string, number> = new Map();

  constructor(options?: SupabaseStorageOptions) {
    if (options?.client) {
      this.client = options.client;
      this.bucket = options?.bucket || DEFAULT_STORAGE_BUCKET;
    } else {
      const config = getSupabaseConfig();
      this.client = getServerSupabaseClient();
      this.bucket = options?.bucket || config.bucket || DEFAULT_STORAGE_BUCKET;
    }
  }

  async getWorkspace(workspaceId: string): Promise<ProjectData | null> {
    if (!isValidWorkspaceId(workspaceId)) return null;

    try {
      const { data, error } = await this.client
        .from('workspaces')
        .select('id, name, project_data, version')
        .eq('id', workspaceId)
        .maybeSingle();

      if (error || !data || !data.project_data) {
        return null;
      }

      if (typeof data.version === 'number') {
        this.workspaceVersions.set(workspaceId, data.version);
      }

      return sanitizeProjectData(data.project_data as ProjectData);
    } catch (err) {
      console.error(`Error querying workspace ${workspaceId} from Supabase:`, err);
      return null;
    }
  }

  async createWorkspace(workspaceId: string, initialProject?: ProjectData): Promise<ProjectData> {
    if (!isValidWorkspaceId(workspaceId)) {
      throw new Error(`Invalid workspace ID: "${workspaceId}"`);
    }

    const existing = await this.getWorkspace(workspaceId);
    if (existing) {
      return existing;
    }

    const projectToSave: ProjectData = JSON.parse(JSON.stringify(initialProject || INITIAL_PROJECT_DATA));
    await this.saveProject(workspaceId, projectToSave);
    return projectToSave;
  }

  async saveProject(workspaceId: string, project: ProjectData): Promise<ProjectData> {
    if (!isValidWorkspaceId(workspaceId)) {
      throw new Error(`Invalid workspace ID: "${workspaceId}"`);
    }

    // Invalidation check: If currentHandover exists, check if data has drifted
    if (project.currentHandover && project.currentHandover.sourceSnapshotHash) {
      const currentHash = computeProjectDataSnapshotHash(project);
      if (currentHash !== project.currentHandover.sourceSnapshotHash) {
        project.currentHandover.isOutdated = true;
        project.currentHandover.outdatedReason =
          'Project findings or source documents were modified after handover generation.';
      }
    }

    const expectedVersion = this.workspaceVersions.get(workspaceId);

    // Attempt RPC save_workspace_state first
    let rpcHandled = false;
    try {
      const { data, error } = await this.client.rpc('save_workspace_state', {
        p_workspace_id: workspaceId,
        p_project_data: project,
        p_expected_version: expectedVersion !== undefined ? expectedVersion : null,
      });

      if (error) {
        const errorMsg = error.message || '';
        if (
          errorMsg.includes('CONCURRENCY_CONFLICT') ||
          error.code === 'P0001' ||
          error.details?.includes('CONCURRENCY_CONFLICT')
        ) {
          throw new ConcurrencyConflictError(
            `Stale update rejected for workspace "${workspaceId}". Workspace was modified concurrently.`
          );
        }
        // If function doesn't exist, fall through to direct table update
        if (error.code === '42883' || errorMsg.includes('function') || errorMsg.includes('does not exist')) {
          rpcHandled = false;
        } else {
          throw new Error(`Database error saving workspace ${workspaceId}: ${error.message}`);
        }
      } else {
        rpcHandled = true;
        if (data && data[0]?.new_version) {
          this.workspaceVersions.set(workspaceId, data[0].new_version);
        } else {
          this.workspaceVersions.set(workspaceId, (expectedVersion || 0) + 1);
        }
      }
    } catch (rpcErr: any) {
      if (rpcErr instanceof ConcurrencyConflictError) {
        throw rpcErr;
      }
      rpcHandled = false;
    }

    // Direct table operation if RPC was not handled
    if (!rpcHandled) {
      if (expectedVersion !== undefined && expectedVersion > 0) {
        const { data: updatedRows, error: updateErr } = await this.client
          .from('workspaces')
          .update({
            project_data: project,
            name: project.name || 'Anonymous Workspace',
            version: expectedVersion + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', workspaceId)
          .eq('version', expectedVersion)
          .select('version');

        if (updateErr) {
          throw new Error(`Database error saving workspace ${workspaceId}: ${updateErr.message}`);
        }

        if (!updatedRows || updatedRows.length === 0) {
          throw new ConcurrencyConflictError(
            `Stale update rejected for workspace "${workspaceId}". Workspace was modified concurrently.`
          );
        }

        this.workspaceVersions.set(workspaceId, expectedVersion + 1);
      } else {
        const nextVersion = (expectedVersion || 0) + 1;
        const { data: upsertRows, error: upsertErr } = await this.client
          .from('workspaces')
          .upsert({
            id: workspaceId,
            name: project.name || 'Anonymous Workspace',
            project_data: project,
            version: nextVersion,
            updated_at: new Date().toISOString(),
          })
          .select('version');

        if (upsertErr) {
          throw new Error(`Database error upserting workspace ${workspaceId}: ${upsertErr.message}`);
        }

        const savedVersion = upsertRows?.[0]?.version || nextVersion;
        this.workspaceVersions.set(workspaceId, savedVersion);
      }
    }

    return project;
  }

  async addSource(
    workspaceId: string,
    sourceData: { name: string; type: ProjectSource['type']; content: string; description: string }
  ): Promise<{ source: ProjectSource; finding: KnowledgeFinding; project: ProjectData }> {
    let project = await this.getWorkspace(workspaceId);
    if (!project) {
      project = await this.createWorkspace(workspaceId);
    }

    const newSourceId = `src-user-${Date.now()}`;
    const newSource: ProjectSource = {
      id: newSourceId,
      name: sourceData.name,
      type: sourceData.type,
      status: 'connected',
      lastSync: 'Just now',
      recordCount: Math.max(1, Math.floor((sourceData.content || '').length / 50)),
      icon: sourceData.type === 'github' ? 'commit' : sourceData.type === 'notes' ? 'edit_note' : 'description',
      description: sourceData.description || 'Custom ingested project context.',
      privacyLevel: 'LOCAL_READ_ONLY',
    };

    const snippetPreview = (sourceData.content || '').slice(0, 240);
    const findingId = `FIND-INGEST-${Date.now().toString().slice(-4)}`;
    const syntheticFinding: KnowledgeFinding = {
      id: findingId,
      type: 'decision',
      title: `Ingested Context: ${sourceData.name.replace(/\.[^/.]+$/, '')}`,
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
          sourceId: newSourceId,
          sourceName: sourceData.name,
          sourceType: sourceData.type,
          file: sourceData.name,
          lineRange: '1-15',
          author: 'Session Contributor',
          timestamp: new Date().toUTCString(),
          snippet: (sourceData.content || '').slice(0, 300),
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

    await this.saveProject(workspaceId, updatedProject);
    return { source: newSource, finding: syntheticFinding, project: updatedProject };
  }

  async addUploadedSource(
    workspaceId: string,
    source: ProjectSource,
    rawBuffer?: Buffer
  ): Promise<ProjectSource> {
    if (!isValidWorkspaceId(workspaceId)) {
      throw new Error(`Invalid workspace ID: "${workspaceId}"`);
    }

    let project = await this.getWorkspace(workspaceId);
    if (!project) {
      project = await this.createWorkspace(workspaceId);
    }

    let uploadedStoragePath: string | null = null;

    if (rawBuffer && source.documentData) {
      const fileExt = source.documentData.fileFormat || 'bin';
      const storagePath = `${workspaceId}/${source.id}.${fileExt}`;
      const contentType = source.documentData.mimeType || 'application/octet-stream';

      const { error: uploadError } = await this.client.storage
        .from(this.bucket)
        .upload(storagePath, rawBuffer, {
          contentType,
          upsert: true,
        });

      if (uploadError) {
        throw new Error(`Supabase Storage upload failed: ${uploadError.message}`);
      }

      uploadedStoragePath = storagePath;
      source.documentData.storagePath = storagePath;
    }

    try {
      const updatedSources = [source, ...project.sources.filter((s) => s.id !== source.id)];
      const updatedProject: ProjectData = {
        ...project,
        sources: updatedSources,
        lastAnalysed: 'Just now',
      };

      await this.saveProject(workspaceId, updatedProject);
      return source;
    } catch (saveError) {
      // Orphan cleanup: if database save fails after storage upload, delete the uploaded object
      if (uploadedStoragePath) {
        try {
          await this.client.storage.from(this.bucket).remove([uploadedStoragePath]);
        } catch (cleanupErr) {
          console.warn(`Failed to clean up orphaned storage object ${uploadedStoragePath}:`, cleanupErr);
        }
      }
      throw saveError;
    }
  }

  async deleteSource(workspaceId: string, sourceId: string): Promise<ProjectData> {
    if (!isValidWorkspaceId(workspaceId)) {
      throw new Error(`Invalid workspace ID: "${workspaceId}"`);
    }

    let project = await this.getWorkspace(workspaceId);
    if (!project) {
      project = await this.createWorkspace(workspaceId);
    }

    const targetSource = project.sources.find((s) => s.id === sourceId);
    if (targetSource?.documentData?.storagePath) {
      try {
        await this.client.storage.from(this.bucket).remove([targetSource.documentData.storagePath]);
      } catch (err) {
        console.warn(`Could not delete storage object for source ${sourceId}:`, err);
      }
    }

    const updatedSources = project.sources.filter((s) => s.id !== sourceId);
    const updatedProject: ProjectData = {
      ...project,
      sources: updatedSources,
    };

    await this.saveProject(workspaceId, updatedProject);
    return updatedProject;
  }

  async getSource(workspaceId: string, sourceId: string): Promise<ProjectSource | null> {
    const project = await this.getWorkspace(workspaceId);
    if (!project) return null;
    return project.sources.find((s) => s.id === sourceId) || null;
  }

  async approveFinding(
    workspaceId: string,
    findingId: string,
    reviewerNotes?: string,
    reviewerName?: string
  ): Promise<ProjectData> {
    let project = await this.getWorkspace(workspaceId);
    if (!project) {
      project = await this.createWorkspace(workspaceId);
    }

    const targetFinding = project.findings.find((f) => f.id === findingId);
    if (!targetFinding) {
      throw new Error(`Finding "${findingId}" not found in workspace.`);
    }

    const openConflict = (project.conflicts || []).find(
      (c) =>
        (c.findingIdA === findingId || c.findingIdB === findingId) &&
        c.status === 'OPEN'
    );

    if (targetFinding.status === 'CONFLICTING' || openConflict) {
      throw new Error(
        `Cannot directly approve finding "${findingId}": It is involved in an unresolved conflict (${openConflict?.id || 'Active Contradiction'}). You must resolve the conflict in the Review Center before approving this claim.`
      );
    }

    if (targetFinding.status === 'MISSING' || targetFinding.evidenceValidity === 'MISSING') {
      throw new Error(
        `Cannot approve finding "${findingId}": It lacks verifiable primary source evidence (MISSING). Correct the finding or attach valid documentation before approval.`
      );
    }

    if (targetFinding.status === 'UNCERTAIN' || targetFinding.claimStatus === 'UNCERTAIN') {
      if (!reviewerNotes || reviewerNotes.trim().length < 5) {
        throw new Error(
          `Cannot approve uncertain finding "${findingId}" without documented review justification. Provide reviewer notes explaining how this claim was verified.`
        );
      }
    }

    const reviewer = reviewerName || project.lead?.name || 'Workspace Reviewer';
    const timestamp = new Date().toISOString();
    const finalNotes = reviewerNotes?.trim() || targetFinding.reviewerNotes || 'Approved during human review.';
    const prevStatus = targetFinding.reviewStatus || (targetFinding.rejected ? 'REJECTED' : 'PENDING_REVIEW');

    const updatedFindings = project.findings.map((f) => {
      if (f.id !== findingId) return f;
      return {
        ...f,
        approved: true,
        rejected: false,
        reviewStatus: 'APPROVED' as const,
        reviewedBy: reviewer,
        reviewedAt: timestamp,
        reviewerNotes: finalNotes,
      };
    });

    const auditAction: ReviewAuditAction = {
      id: `AUDIT-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      findingId,
      workspaceId,
      actionType: 'APPROVE',
      previousStatus: prevStatus,
      newStatus: 'APPROVED',
      reviewerName: reviewer,
      reviewerNotes: finalNotes,
      timestamp,
      evidenceReferences: (targetFinding.citations || []).map((c) => ({
        sourceName: c.sourceName,
        location: `${c.file}:${c.lineRange}`,
        quote: c.snippet,
      })),
    };

    const updatedAuditHistory = [...(project.reviewAuditHistory || []), auditAction];

    const updatedProject: ProjectData = {
      ...project,
      findings: updatedFindings,
      reviewAuditHistory: updatedAuditHistory,
    };

    await this.saveProject(workspaceId, updatedProject);
    return updatedProject;
  }

  async rejectFinding(
    workspaceId: string,
    findingId: string,
    reason: string,
    reviewerName?: string
  ): Promise<ProjectData> {
    let project = await this.getWorkspace(workspaceId);
    if (!project) {
      project = await this.createWorkspace(workspaceId);
    }

    const targetFinding = project.findings.find((f) => f.id === findingId);
    if (!targetFinding) {
      throw new Error(`Finding "${findingId}" not found in workspace.`);
    }

    if (!reason || reason.trim().length === 0) {
      throw new Error('A rejection reason is strictly required to reject a finding.');
    }

    const reviewer = reviewerName || project.lead?.name || 'Workspace Reviewer';
    const timestamp = new Date().toISOString();
    const cleanReason = reason.trim();
    const prevStatus = targetFinding.reviewStatus || (targetFinding.approved ? 'APPROVED' : 'PENDING_REVIEW');

    const updatedFindings = project.findings.map((f) => {
      if (f.id !== findingId) return f;
      return {
        ...f,
        approved: false,
        rejected: true,
        reviewStatus: 'REJECTED' as const,
        reviewedBy: reviewer,
        reviewedAt: timestamp,
        rejectionReason: cleanReason,
        reviewerNotes: cleanReason,
      };
    });

    const auditAction: ReviewAuditAction = {
      id: `AUDIT-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      findingId,
      workspaceId,
      actionType: 'REJECT',
      previousStatus: prevStatus,
      newStatus: 'REJECTED',
      reviewerName: reviewer,
      reviewerNotes: cleanReason,
      timestamp,
      evidenceReferences: (targetFinding.citations || []).map((c) => ({
        sourceName: c.sourceName,
        location: `${c.file}:${c.lineRange}`,
        quote: c.snippet,
      })),
    };

    const updatedAuditHistory = [...(project.reviewAuditHistory || []), auditAction];

    const updatedProject: ProjectData = {
      ...project,
      findings: updatedFindings,
      reviewAuditHistory: updatedAuditHistory,
    };

    await this.saveProject(workspaceId, updatedProject);
    return updatedProject;
  }

  async editFinding(
    workspaceId: string,
    findingId: string,
    updates: Partial<KnowledgeFinding>,
    reviewerNotes?: string,
    reviewerName?: string
  ): Promise<ProjectData> {
    let project = await this.getWorkspace(workspaceId);
    if (!project) {
      project = await this.createWorkspace(workspaceId);
    }

    const targetFinding = project.findings.find((f) => f.id === findingId);
    if (!targetFinding) {
      throw new Error(`Finding "${findingId}" not found in workspace.`);
    }

    const reviewer = reviewerName || project.lead?.name || 'Workspace Reviewer';
    const timestamp = new Date().toISOString();
    const prevStatus = targetFinding.reviewStatus || (targetFinding.approved ? 'APPROVED' : 'PENDING_REVIEW');

    const candidateFinding: KnowledgeFinding = {
      ...targetFinding,
      title: updates.title !== undefined ? updates.title.trim() : targetFinding.title,
      summary: updates.summary !== undefined ? updates.summary.trim() : targetFinding.summary,
      reasoning: updates.reasoning !== undefined ? updates.reasoning.trim() : targetFinding.reasoning,
      impact: updates.impact !== undefined ? updates.impact.trim() : targetFinding.impact,
      category: updates.category || targetFinding.category,
      urgency: updates.urgency || targetFinding.urgency,
      owner: updates.owner || targetFinding.owner,
    };

    const revalidation = revalidateEditedFinding(candidateFinding, project.sources || []);

    const updatedFinding: KnowledgeFinding = {
      ...candidateFinding,
      status: revalidation.status,
      claimStatus: revalidation.claimStatus,
      evidenceValidity: revalidation.evidenceValidity,
      reviewStatus: revalidation.reviewStatus,
      confidence: revalidation.confidence,
      approved: false,
      rejected: false,
      reviewedBy: reviewer,
      reviewedAt: timestamp,
      reviewerNotes: reviewerNotes?.trim() || revalidation.explanation,
    };

    const updatedFindings = project.findings.map((f) => (f.id === findingId ? updatedFinding : f));

    const auditAction: ReviewAuditAction = {
      id: `AUDIT-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      findingId,
      workspaceId,
      actionType: 'EDIT',
      previousStatus: prevStatus,
      newStatus: updatedFinding.reviewStatus || 'PENDING_REVIEW',
      reviewerName: reviewer,
      reviewerNotes: reviewerNotes?.trim() || revalidation.explanation,
      timestamp,
      evidenceReferences: (updatedFinding.citations || []).map((c) => ({
        sourceName: c.sourceName,
        location: `${c.file}:${c.lineRange}`,
        quote: c.snippet,
      })),
    };

    const updatedAuditHistory = [...(project.reviewAuditHistory || []), auditAction];

    const updatedProject: ProjectData = {
      ...project,
      findings: updatedFindings,
      reviewAuditHistory: updatedAuditHistory,
    };

    await this.saveProject(workspaceId, updatedProject);
    return updatedProject;
  }

  async addReviewerNote(
    workspaceId: string,
    findingId: string,
    note: string,
    reviewerName?: string
  ): Promise<ProjectData> {
    let project = await this.getWorkspace(workspaceId);
    if (!project) {
      project = await this.createWorkspace(workspaceId);
    }

    const targetFinding = project.findings.find((f) => f.id === findingId);
    if (!targetFinding) {
      throw new Error(`Finding "${findingId}" not found in workspace.`);
    }

    if (!note || note.trim().length === 0) {
      throw new Error('Reviewer note cannot be empty.');
    }

    const reviewer = reviewerName || project.lead?.name || 'Workspace Reviewer';
    const timestamp = new Date().toISOString();
    const cleanNote = note.trim();
    const prevStatus = targetFinding.reviewStatus || 'PENDING_REVIEW';

    const updatedFindings = project.findings.map((f) => {
      if (f.id !== findingId) return f;
      return {
        ...f,
        reviewerNotes: cleanNote,
        reviewedBy: reviewer,
        reviewedAt: timestamp,
      };
    });

    const auditAction: ReviewAuditAction = {
      id: `AUDIT-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      findingId,
      workspaceId,
      actionType: 'ADD_NOTE',
      previousStatus: prevStatus,
      newStatus: prevStatus,
      reviewerName: reviewer,
      reviewerNotes: cleanNote,
      timestamp,
      evidenceReferences: (targetFinding.citations || []).map((c) => ({
        sourceName: c.sourceName,
        location: `${c.file}:${c.lineRange}`,
        quote: c.snippet,
      })),
    };

    const updatedAuditHistory = [...(project.reviewAuditHistory || []), auditAction];

    const updatedProject: ProjectData = {
      ...project,
      findings: updatedFindings,
      reviewAuditHistory: updatedAuditHistory,
    };

    await this.saveProject(workspaceId, updatedProject);
    return updatedProject;
  }

  async getReviewAuditHistory(
    workspaceId: string,
    findingId?: string
  ): Promise<ReviewAuditAction[]> {
    const project = await this.getWorkspace(workspaceId);
    if (!project || !project.reviewAuditHistory) return [];
    if (findingId) {
      return project.reviewAuditHistory.filter((a) => a.findingId === findingId);
    }
    return project.reviewAuditHistory;
  }

  async resolveConflict(
    workspaceId: string,
    findingId: string,
    resolution: string,
    resolvedBy: string
  ): Promise<ProjectData> {
    let project = await this.getWorkspace(workspaceId);
    if (!project) {
      project = await this.createWorkspace(workspaceId);
    }

    const targetFinding = project.findings.find((f) => f.id === findingId);
    const timestamp = new Date().toISOString().split('T')[0];
    const prevStatus = targetFinding?.reviewStatus || 'CONFLICT_REQUIRES_RESOLUTION';

    const updatedFindings = project.findings.map((f) => {
      if (f.id !== findingId) return f;
      return {
        ...f,
        status: 'VERIFIED' as const,
        claimStatus: 'SUPPORTED' as const,
        reviewStatus: 'APPROVED' as const,
        confidence: 98,
        approved: true,
        rejected: false,
        reviewedBy: resolvedBy,
        reviewedAt: new Date().toISOString(),
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

    const auditAction: ReviewAuditAction = {
      id: `AUDIT-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      findingId,
      workspaceId,
      actionType: 'RESOLVE_CONFLICT',
      previousStatus: prevStatus,
      newStatus: 'APPROVED',
      reviewerName: resolvedBy,
      reviewerNotes: `Conflict resolved: ${resolution}`,
      timestamp: new Date().toISOString(),
      evidenceReferences: (targetFinding?.citations || []).map((c) => ({
        sourceName: c.sourceName,
        location: `${c.file}:${c.lineRange}`,
        quote: c.snippet,
      })),
    };

    const updatedAuditHistory = [...(project.reviewAuditHistory || []), auditAction];

    const updatedProject: ProjectData = {
      ...project,
      findings: updatedFindings,
      reviewAuditHistory: updatedAuditHistory,
    };

    await this.saveProject(workspaceId, updatedProject);
    return updatedProject;
  }

  async saveConflicts(workspaceId: string, conflicts: ConflictRecord[]): Promise<ProjectData> {
    let project = await this.getWorkspace(workspaceId);
    if (!project) {
      project = await this.createWorkspace(workspaceId);
    }

    const updatedProject: ProjectData = {
      ...project,
      conflicts,
    };

    await this.saveProject(workspaceId, updatedProject);
    return updatedProject;
  }

  async resolveConflictRecord(
    workspaceId: string,
    conflictId: string,
    chosenFindingId?: string,
    resolutionNotes?: string,
    resolvedBy?: string
  ): Promise<ProjectData> {
    let project = await this.getWorkspace(workspaceId);
    if (!project) {
      project = await this.createWorkspace(workspaceId);
    }

    const timestamp = new Date().toISOString();
    const reviewer = resolvedBy || 'Review Lead';
    const notes = resolutionNotes || 'Conflict resolved during human review.';

    const updatedConflicts = (project.conflicts || []).map((c) => {
      if (c.id !== conflictId) return c;
      return {
        ...c,
        status: 'RESOLVED' as const,
        resolution: {
          resolvedAt: timestamp,
          resolvedBy: reviewer,
          chosenFindingId,
          resolutionNotes: notes,
        },
      };
    });

    const targetConflict = (project.conflicts || []).find((c) => c.id === conflictId);
    let updatedFindings = project.findings;

    if (targetConflict) {
      updatedFindings = project.findings.map((f) => {
        if (f.id === targetConflict.findingIdA || f.id === targetConflict.findingIdB) {
          if (chosenFindingId) {
            if (f.id === chosenFindingId) {
              return {
                ...f,
                status: 'VERIFIED' as const,
                claimStatus: 'SUPPORTED' as const,
                approved: true,
                rejected: false,
                reviewerNotes: `Accepted as prevailing claim in conflict resolution: ${notes}`,
              };
            } else {
              return {
                ...f,
                approved: false,
                rejected: true,
                reviewerNotes: `Superseded or rejected in conflict resolution: ${notes}`,
              };
            }
          } else {
            return {
              ...f,
              status: 'VERIFIED' as const,
              claimStatus: 'SUPPORTED' as const,
              reviewerNotes: `Resolved via consensus: ${notes}`,
            };
          }
        }
        return f;
      });
    }

    const updatedProject: ProjectData = {
      ...project,
      conflicts: updatedConflicts,
      findings: updatedFindings,
    };

    await this.saveProject(workspaceId, updatedProject);
    return updatedProject;
  }

  async certifyHandover(workspaceId: string, signerName: string): Promise<ProjectData> {
    const result = await this.generateAndSaveHandover(workspaceId, signerName);
    return result.project;
  }

  async generateAndSaveHandover(
    workspaceId: string,
    signerName?: string,
    options?: { version?: string; regenerate?: boolean }
  ): Promise<{ project: ProjectData; handover: HandoverDocument }> {
    let project = await this.getWorkspace(workspaceId);
    if (!project) {
      project = await this.createWorkspace(workspaceId);
    }

    const handoverDoc = await buildHandoverDocument(project, {
      signerName,
      version: options?.version,
      regenerate: options?.regenerate,
    });

    const previousHandovers = project.handovers || [];
    const updatedHandovers = [...previousHandovers, handoverDoc];

    const updatedProject: ProjectData = {
      ...project,
      handoverCertified: true,
      certifiedBy: handoverDoc.certifiedBy,
      certifiedDate: handoverDoc.certifiedDate,
      certificationHash: handoverDoc.certificationHash,
      handovers: updatedHandovers,
      currentHandover: handoverDoc,
    };

    await this.saveProject(workspaceId, updatedProject);
    return { project: updatedProject, handover: handoverDoc };
  }

  async getHandover(workspaceId: string, handoverId?: string): Promise<HandoverDocument | null> {
    const project = await this.getWorkspace(workspaceId);
    if (!project) return null;

    let targetHandover: HandoverDocument | null = null;
    if (handoverId) {
      targetHandover = (project.handovers || []).find((h) => h.id === handoverId) || null;
    } else {
      targetHandover = project.currentHandover || null;
    }

    if (!targetHandover) return null;

    const currentHash = computeProjectDataSnapshotHash(project);
    if (targetHandover.sourceSnapshotHash && targetHandover.sourceSnapshotHash !== currentHash) {
      targetHandover.isOutdated = true;
      targetHandover.outdatedReason =
        'Project findings or source documents were modified after handover generation.';
    }

    return targetHandover;
  }

  async getHandoverHistory(workspaceId: string): Promise<HandoverDocument[]> {
    const project = await this.getWorkspace(workspaceId);
    if (!project || !project.handovers) return [];
    return project.handovers;
  }

  async createShareToken(workspaceId: string, handoverId: string): Promise<HandoverShareRecord> {
    if (!isValidWorkspaceId(workspaceId)) {
      throw new Error(`Invalid workspace ID: "${workspaceId}"`);
    }

    let project = await this.getWorkspace(workspaceId);
    if (!project) {
      throw new Error(`Workspace "${workspaceId}" not found.`);
    }

    if (!project.handoverCertified) {
      throw new Error('Cannot share uncertified handover. Complete review and certification first.');
    }

    const handover =
      (project.handovers || []).find((h) => h.id === handoverId) || project.currentHandover;
    if (!handover) {
      throw new Error('Handover record not found.');
    }

    // High-entropy read-only share token (crypto-secure random)
    const token = `kt_share_${crypto.randomBytes(24).toString('hex')}`;
    const tokenHash = hashShareToken(token);
    const createdAt = new Date().toISOString();

    // Store in dedicated handover_shares table (hashed only, zero plaintext in database)
    const { error: insertError } = await this.client
      .from('handover_shares')
      .insert({
        token_hash: tokenHash,
        workspace_id: workspaceId,
        handover_id: handover.id,
        is_active: true,
        created_at: createdAt,
      });

    if (insertError) {
      throw new Error(`Database error storing share token: ${insertError.message}`);
    }

    // Update project state with hashed/sanitized token representation
    const sanitizedShareRecord: HandoverShareRecord = {
      token: tokenHash, // Store SHA-256 hash in project JSON state; NEVER raw token
      handoverId: handover.id,
      workspaceId,
      createdAt,
      isActive: true,
    };

    const updatedShareRecords = [
      ...(project.shareRecords || []).filter((r) => r.handoverId !== handover.id || !r.isActive),
      sanitizedShareRecord,
    ];

    const updatedProject: ProjectData = {
      ...project,
      shareRecords: updatedShareRecords,
      currentHandover:
        project.currentHandover?.id === handover.id
          ? { ...handover, shareRecord: sanitizedShareRecord }
          : project.currentHandover,
    };

    await this.saveProject(workspaceId, updatedProject);

    // Return the plaintext token strictly to the immediate creator caller
    return {
      token,
      handoverId: handover.id,
      workspaceId,
      createdAt,
      isActive: true,
    };
  }

  async getSharedHandover(token: string): Promise<{ handover: HandoverDocument; projectName: string }> {
    if (!token || typeof token !== 'string') {
      throw new Error('Invalid share token.');
    }

    const tokenHash = hashShareToken(token);

    // O(1) indexed lookup on hashed token
    const { data: shareRow, error: shareErr } = await this.client
      .from('handover_shares')
      .select('token_hash, workspace_id, handover_id, is_active, revoked_at')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (shareErr || !shareRow) {
      throw new Error('Share link not found or expired.');
    }

    if (!shareRow.is_active) {
      throw new Error('This share link has been revoked by the project reviewer.');
    }

    const project = await this.getWorkspace(shareRow.workspace_id);
    if (!project) {
      throw new Error('Certified handover package not found.');
    }

    const handover =
      (project.handovers || []).find((h) => h.id === shareRow.handover_id) || project.currentHandover;

    if (!handover) {
      throw new Error('Certified handover package not found.');
    }

    // Check invalidation against project data
    const currentHash = computeProjectDataSnapshotHash(project);
    if (handover.sourceSnapshotHash && handover.sourceSnapshotHash !== currentHash) {
      handover.isOutdated = true;
      handover.outdatedReason =
        'Project findings or source documents were modified after handover generation.';
    }

    // Return strictly read-only handover document without leaking workspace data
    return {
      handover,
      projectName: project.name,
    };
  }

  async revokeShareToken(workspaceId: string, token: string): Promise<boolean> {
    if (!isValidWorkspaceId(workspaceId)) {
      throw new Error(`Invalid workspace ID: "${workspaceId}"`);
    }

    if (!token) return false;

    const tokenHash = hashShareToken(token);

    const { data: updateData, error: updateErr } = await this.client
      .from('handover_shares')
      .update({
        is_active: false,
        revoked_at: new Date().toISOString(),
      })
      .eq('token_hash', tokenHash)
      .eq('workspace_id', workspaceId)
      .select('token_hash');

    if (updateErr) {
      console.warn(`Error revoking share token in Supabase:`, updateErr);
      return false;
    }

    const found = Boolean(updateData && updateData.length > 0);

    // Also update project_data JSON state
    let project = await this.getWorkspace(workspaceId);
    if (project && project.shareRecords) {
      project.shareRecords = project.shareRecords.map((r) => {
        if (r.token === tokenHash || r.token === token) {
          return { ...r, isActive: false, revokedAt: new Date().toISOString() };
        }
        return r;
      });

      if (
        project.currentHandover?.shareRecord?.token === tokenHash ||
        project.currentHandover?.shareRecord?.token === token
      ) {
        project.currentHandover.shareRecord.isActive = false;
        project.currentHandover.shareRecord.revokedAt = new Date().toISOString();
      }

      await this.saveProject(workspaceId, project);
    }

    return found;
  }

  async resetWorkspace(workspaceId: string): Promise<ProjectData> {
    if (!isValidWorkspaceId(workspaceId)) {
      throw new Error(`Invalid workspace ID: "${workspaceId}"`);
    }

    const cleanDemo: ProjectData = JSON.parse(JSON.stringify(INITIAL_PROJECT_DATA));
    await this.saveProject(workspaceId, cleanDemo);
    return cleanDemo;
  }

  async listWorkspaces(): Promise<string[]> {
    try {
      const { data, error } = await this.client.from('workspaces').select('id');
      if (error || !data) {
        return [];
      }
      return data.map((r: { id: string }) => r.id);
    } catch {
      return [];
    }
  }
}
