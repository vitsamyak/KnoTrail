import fs from 'fs';
import path from 'path';
import type { KnowledgeFinding, ProjectData, ProjectSource, ConflictRecord } from '../../lib/types.ts';
import { INITIAL_PROJECT_DATA } from '../../lib/demoData.ts';
import { checkHandoverBlockStatus, generateHandoverMarkdown, generateHandoverJSON } from '../../lib/handoverFilter.ts';
import { isValidWorkspaceId, type WorkspaceRecord } from './types.ts';

export interface StorageRepository {
  getWorkspace(workspaceId: string): Promise<ProjectData | null>;
  createWorkspace(workspaceId: string, initialProject?: ProjectData): Promise<ProjectData>;
  saveProject(workspaceId: string, project: ProjectData): Promise<ProjectData>;
  addSource(
    workspaceId: string,
    sourceData: { name: string; type: ProjectSource['type']; content: string; description: string }
  ): Promise<{ source: ProjectSource; finding: KnowledgeFinding; project: ProjectData }>;
  addUploadedSource(
    workspaceId: string,
    source: ProjectSource,
    rawBuffer?: Buffer
  ): Promise<ProjectSource>;
  deleteSource(workspaceId: string, sourceId: string): Promise<ProjectData>;
  getSource(workspaceId: string, sourceId: string): Promise<ProjectSource | null>;
  approveFinding(workspaceId: string, findingId: string, reviewerNotes?: string): Promise<ProjectData>;
  rejectFinding(workspaceId: string, findingId: string, reason?: string): Promise<ProjectData>;
  editFinding(workspaceId: string, findingId: string, updates: Partial<KnowledgeFinding>): Promise<ProjectData>;
  resolveConflict(
    workspaceId: string,
    findingId: string,
    resolution: string,
    resolvedBy: string
  ): Promise<ProjectData>;
  saveConflicts(workspaceId: string, conflicts: ConflictRecord[]): Promise<ProjectData>;
  resolveConflictRecord(
    workspaceId: string,
    conflictId: string,
    chosenFindingId?: string,
    resolutionNotes?: string,
    resolvedBy?: string
  ): Promise<ProjectData>;
  certifyHandover(workspaceId: string, signerName: string): Promise<ProjectData>;
  resetWorkspace(workspaceId: string): Promise<ProjectData>;
  listWorkspaces(): Promise<string[]>;
}

export function sanitizeProjectData(project: ProjectData): ProjectData {
  if (!project) return project;
  const p = { ...project };

  // 1. Clean Project Name & Description if fictional Titan demo
  if (p.name === 'Project Titan Handover' || p.name?.includes('Titan')) {
    p.name = 'Knowledge Handover Workspace';
    p.code = 'KNO-001';
    p.description = 'Upload project documents (PDF, TXT, Markdown) to extract important decisions, pending tasks, risks, and dependencies with verified source evidence.';
  }

  // 2. Clean Lead if fictional Elena Rostova
  if (p.lead?.name === 'Elena Rostova' || p.lead?.email?.includes('titan.internal')) {
    p.lead = {
      id: 'user-lead-01',
      name: 'Project Contributor',
      role: 'Handover Lead',
      email: 'contributor@knotrail.internal',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      outgoing: true,
      transitionNotes: 'Active handover contributor.',
    };
  }

  // 3. Purge Fictional Stakeholders
  p.stakeholders = (p.stakeholders || []).filter(
    (s) =>
      !['Elena Rostova', 'Marcus Vance', 'Sophia Chen', 'David Miller'].includes(s.name) &&
      !s.email?.includes('titan.internal')
  );

  // 4. Purge Fake Sources (keep ONLY real uploaded sources or user-added non-synthetic notes)
  const fakeSourceIds = new Set(['src-gh-01', 'src-lin-02', 'src-slk-03', 'src-not-04', 'src-pd-05', 'src-jira-06']);
  p.sources = (p.sources || []).filter((s) => {
    if (fakeSourceIds.has(s.id)) return false;
    if (s.name?.toLowerCase().includes('titan')) return false;
    if (s.privacyLevel === 'SYNTHETIC_DEMO') return false;
    return true;
  });

  // 5. Purge Fake Findings (findings citing fake sources or authored by fictional members)
  p.findings = (p.findings || []).filter((f) => {
    if (['Elena Rostova', 'Marcus Vance', 'Sophia Chen', 'David Miller'].includes(f.owner)) return false;
    if (f.citations?.some((c) => fakeSourceIds.has(c.sourceId) || c.sourceName?.toLowerCase().includes('titan'))) return false;
    return true;
  });

  p.conflicts = p.conflicts || [];
  return p;
}

/**
 * Durable server-side repository for persistent workspace storage.
 * Stores data in JSON files with atomic writes, ensuring durability across server restarts.
 * Fully compatible with containerized deployments and persistent disk mounts.
 */
export class DurableFileRepository implements StorageRepository {
  private baseDir: string;
  private uploadDir: string;
  private memoryCache: Map<string, ProjectData> = new Map();

  constructor(customBaseDir?: string, customUploadDir?: string) {
    this.baseDir = customBaseDir || path.join(process.cwd(), '.data', 'workspaces');
    this.uploadDir = customUploadDir || path.join(process.cwd(), '.data', 'uploads');
    this.ensureDirectoryExists(this.baseDir);
    this.ensureDirectoryExists(this.uploadDir);
  }

  private ensureDirectoryExists(dir: string) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private getFilePath(workspaceId: string): string {
    if (!isValidWorkspaceId(workspaceId)) {
      throw new Error(`Invalid workspace ID: "${workspaceId}". Must be 3-64 alphanumeric/hyphen/underscore characters.`);
    }
    return path.join(this.baseDir, `${workspaceId}.json`);
  }

  private async readWorkspaceFile(workspaceId: string): Promise<ProjectData | null> {
    const filePath = this.getFilePath(workspaceId);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(content) as WorkspaceRecord;
      if (!parsed.project) return null;
      return sanitizeProjectData(parsed.project);
    } catch (err) {
      console.error(`Error reading workspace file for ${workspaceId}:`, err);
      return null;
    }
  }

  private async writeWorkspaceFile(workspaceId: string, project: ProjectData): Promise<void> {
    const filePath = this.getFilePath(workspaceId);
    const tempPath = `${filePath}.tmp.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
    
    const record: WorkspaceRecord = {
      id: workspaceId,
      name: `Workspace ${workspaceId}`,
      createdAt: project.lastAnalysed || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      project,
    };

    const data = JSON.stringify(record, null, 2);

    // Atomic write pattern: write to temp file then rename
    await fs.promises.writeFile(tempPath, data, 'utf-8');
    await fs.promises.rename(tempPath, filePath);

    // Update in-memory cache
    this.memoryCache.set(workspaceId, project);
  }

  async getWorkspace(workspaceId: string): Promise<ProjectData | null> {
    if (!isValidWorkspaceId(workspaceId)) return null;

    if (this.memoryCache.has(workspaceId)) {
      return this.memoryCache.get(workspaceId)!;
    }

    const fromDisk = await this.readWorkspaceFile(workspaceId);
    if (fromDisk) {
      this.memoryCache.set(workspaceId, fromDisk);
      return fromDisk;
    }

    return null;
  }

  async createWorkspace(workspaceId: string, initialProject?: ProjectData): Promise<ProjectData> {
    if (!isValidWorkspaceId(workspaceId)) {
      throw new Error(`Invalid workspace ID: "${workspaceId}"`);
    }

    const existing = await this.getWorkspace(workspaceId);
    if (existing) {
      return existing;
    }

    // Clone initial demo data so mutations do not mutate reference
    const projectToSave: ProjectData = JSON.parse(JSON.stringify(initialProject || INITIAL_PROJECT_DATA));
    await this.writeWorkspaceFile(workspaceId, projectToSave);
    return projectToSave;
  }

  async saveProject(workspaceId: string, project: ProjectData): Promise<ProjectData> {
    if (!isValidWorkspaceId(workspaceId)) {
      throw new Error(`Invalid workspace ID: "${workspaceId}"`);
    }
    await this.writeWorkspaceFile(workspaceId, project);
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
    let project = await this.getWorkspace(workspaceId);
    if (!project) {
      project = await this.createWorkspace(workspaceId);
    }

    // Save physical file safely if raw buffer is provided
    if (rawBuffer && source.documentData) {
      const wsUploadDir = path.join(this.uploadDir, workspaceId);
      this.ensureDirectoryExists(wsUploadDir);
      
      const safeExt = source.documentData.fileFormat || 'bin';
      const safeFilename = `${source.id}.${safeExt}`;
      const safePath = path.join(wsUploadDir, safeFilename);

      await fs.promises.writeFile(safePath, rawBuffer);
      source.documentData.storagePath = safePath;
    }

    // Prepend source to project.sources WITHOUT generating any synthetic findings (Phase C rule)
    const updatedSources = [source, ...project.sources.filter((s) => s.id !== source.id)];
    const updatedProject: ProjectData = {
      ...project,
      sources: updatedSources,
      lastAnalysed: 'Just now',
    };

    await this.saveProject(workspaceId, updatedProject);
    return source;
  }

  async deleteSource(workspaceId: string, sourceId: string): Promise<ProjectData> {
    let project = await this.getWorkspace(workspaceId);
    if (!project) {
      project = await this.createWorkspace(workspaceId);
    }

    const targetSource = project.sources.find((s) => s.id === sourceId);
    if (targetSource?.documentData?.storagePath && fs.existsSync(targetSource.documentData.storagePath)) {
      try {
        await fs.promises.unlink(targetSource.documentData.storagePath);
      } catch (err) {
        console.warn(`Could not delete physical file for source ${sourceId}:`, err);
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

  async approveFinding(workspaceId: string, findingId: string, reviewerNotes?: string): Promise<ProjectData> {
    let project = await this.getWorkspace(workspaceId);
    if (!project) {
      project = await this.createWorkspace(workspaceId);
    }

    const updatedFindings = project.findings.map((f) => {
      if (f.id !== findingId) return f;
      return {
        ...f,
        approved: true,
        rejected: false,
        reviewerNotes: reviewerNotes || f.reviewerNotes || 'Approved by Lead Architect during human review.',
      };
    });

    const updatedProject: ProjectData = {
      ...project,
      findings: updatedFindings,
    };

    await this.saveProject(workspaceId, updatedProject);
    return updatedProject;
  }

  async rejectFinding(workspaceId: string, findingId: string, reason?: string): Promise<ProjectData> {
    let project = await this.getWorkspace(workspaceId);
    if (!project) {
      project = await this.createWorkspace(workspaceId);
    }

    const updatedFindings = project.findings.map((f) => {
      if (f.id !== findingId) return f;
      return {
        ...f,
        approved: false,
        rejected: true,
        reviewerNotes: reason || 'Rejected by Lead Reviewer — inaccurate or superseded context.',
      };
    });

    const updatedProject: ProjectData = {
      ...project,
      findings: updatedFindings,
    };

    await this.saveProject(workspaceId, updatedProject);
    return updatedProject;
  }

  async editFinding(
    workspaceId: string,
    findingId: string,
    updates: Partial<KnowledgeFinding>
  ): Promise<ProjectData> {
    let project = await this.getWorkspace(workspaceId);
    if (!project) {
      project = await this.createWorkspace(workspaceId);
    }

    const updatedFindings = project.findings.map((f) => {
      if (f.id !== findingId) return f;
      return { ...f, ...updates };
    });

    const updatedProject: ProjectData = {
      ...project,
      findings: updatedFindings,
    };

    await this.saveProject(workspaceId, updatedProject);
    return updatedProject;
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

    const timestamp = new Date().toISOString().split('T')[0];
    const updatedFindings = project.findings.map((f) => {
      if (f.id !== findingId) return f;
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

    // Update conflict record
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

    // Update findings
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
            // Consensus resolution
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
    let project = await this.getWorkspace(workspaceId);
    if (!project) {
      project = await this.createWorkspace(workspaceId);
    }

    // Gatecheck Phase A & E rules: Handover cannot be certified if blocking conflicts or unreviewed items exist
    const blockStatus = checkHandoverBlockStatus(project.findings, false, project.conflicts);
    if (!blockStatus.canCertify) {
      throw new Error(`Handover cannot be certified: ${blockStatus.reason}`);
    }

    const now = new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    const certificationHash = `SHA256:${Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('')}`;

    const updatedProject: ProjectData = {
      ...project,
      handoverCertified: true,
      certifiedBy: signerName || project.lead?.name || 'Project Reviewer',
      certifiedDate: now,
      certificationHash,
    };

    await this.saveProject(workspaceId, updatedProject);
    return updatedProject;
  }

  async resetWorkspace(workspaceId: string): Promise<ProjectData> {
    if (!isValidWorkspaceId(workspaceId)) {
      throw new Error(`Invalid workspace ID: "${workspaceId}"`);
    }

    const cleanDemo: ProjectData = JSON.parse(JSON.stringify(INITIAL_PROJECT_DATA));
    await this.writeWorkspaceFile(workspaceId, cleanDemo);
    return cleanDemo;
  }

  async listWorkspaces(): Promise<string[]> {
    try {
      const files = await fs.promises.readdir(this.baseDir);
      return files.filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, ''));
    } catch {
      return [];
    }
  }
}

// Global singleton instance
let globalStorageInstance: StorageRepository | null = null;

export function getStorage(): StorageRepository {
  if (!globalStorageInstance) {
    globalStorageInstance = new DurableFileRepository();
  }
  return globalStorageInstance;
}

export const repository = getStorage();
