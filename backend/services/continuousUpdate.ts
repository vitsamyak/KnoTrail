/**
 * Backend Continuous Update Service (Round 3 - Improvement 3)
 *
 * Implements the continuous knowledge synchronization engine:
 * 1. Per-repository concurrency serialization (locks per workspace:repoId)
 * 2. Ingestion vs Knowledge Processing status separation
 * 3. Zero Auto-Approval Invariant enforcement
 * 4. Durable retry & recovery state tracking
 * 5. Append-only update history records
 *
 * Governance: CodersInPune Hackathon 2026 - Deploy_or_Die (Samyak Gedam & Sanshrey Sanagar)
 */

import crypto from 'crypto';
import { getStorage } from '../../src/server/db/storage.ts';
import {
  gitHubService,
  GitHubService,
  GitHubNotFoundError,
} from './github.ts';
import { ingestGitHubRepository, type GitHubIngestionResult } from './githubIngestion.ts';
import { isGeminiConfigured } from '../../src/server/ai/gemini.ts';
import { runKnowledgeExtractionPipeline } from '../../src/server/ai/pipeline.ts';
import { deduplicateFindings } from '../../src/server/ai/chunker.ts';
import { scanWorkspaceEvidenceDrift } from '../../src/server/verification/driftDetector.ts';
import type {
  ContinuousUpdateRecord,
  ContinuousUpdateTrigger,
  GitHubIntegration,
  ProjectData,
  ProjectSource,
  IngestionJobState,
  IngestionJobCounters,
} from '../../src/lib/types.ts';

// ============================================================================
// Asynchronous Job & Scan Cache Registries
// ============================================================================

export const activeIngestionJobs = new Map<string, IngestionJobState>();

export function getIngestionJob(jobId: string): IngestionJobState | null {
  return activeIngestionJobs.get(jobId) || null;
}

export function getActiveJobForRepo(workspaceId: string, repoId: number): IngestionJobState | null {
  for (const job of Array.from(activeIngestionJobs.values())) {
    if (job.workspaceId === workspaceId && job.repoId === repoId && job.status === 'in_progress') {
      return job;
    }
  }
  return null;
}

export interface CachedScanData {
  workspaceId: string;
  repoId: number;
  ingestionResult: GitHubIngestionResult;
  commitSha: string;
  timestamp: number;
}

export const activeScanCache = new Map<string, CachedScanData>();

export function getCachedScan(workspaceId: string, repoId: number): CachedScanData | null {
  const cached = activeScanCache.get(`${workspaceId}_${repoId}`);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > 30 * 60 * 1000) {
    activeScanCache.delete(`${workspaceId}_${repoId}`);
    return null;
  }
  return cached;
}

// ============================================================================
// Per-Repository Concurrency Serialization (Mutex Queue)
// ============================================================================

const repoLockQueues = new Map<string, Promise<any>>();

/**
 * Executes an async task with per-repository serialization.
 * Ensures concurrent webhooks or sync requests for the same repository
 * are queued and executed sequentially without race conditions.
 */
export async function withRepositoryLock<T>(
  workspaceId: string,
  repoId: number,
  task: () => Promise<T>
): Promise<T> {
  const lockKey = `${workspaceId}:${repoId}`;
  const previousLock = repoLockQueues.get(lockKey) || Promise.resolve();

  let releaseCurrentLock: () => void;
  const currentLock = new Promise<void>((resolve) => {
    releaseCurrentLock = resolve;
  });

  repoLockQueues.set(lockKey, currentLock);

  try {
    // Await completion of any previously enqueued task on this repository
    await previousLock.catch(() => {});
    return await task();
  } finally {
    releaseCurrentLock!();
    if (repoLockQueues.get(lockKey) === currentLock) {
      repoLockQueues.delete(lockKey);
    }
  }
}

// ============================================================================
// Types
// ============================================================================

export interface ContinuousUpdateOptions {
  trigger: ContinuousUpdateTrigger;
  eventType: string;
  deliveryId?: string;
  reason?: string;
  runAiExtraction?: boolean;
  service?: GitHubService;
  onProgress?: (progress: {
    phase: number;
    phaseName: string;
    percent: number;
    counters?: IngestionJobCounters;
  }) => void;
}

export interface ContinuousUpdateExecutionResult {
  status: 'success' | 'partial' | 'failed' | 'no_change';
  record: ContinuousUpdateRecord;
  integration: GitHubIntegration;
  source?: ProjectSource;
  recordCounts: { commits: number; pullRequests: number; issues: number; docs: number };
  isChanged: boolean;
  findingsAdded: number;
}

// ============================================================================
// Core Continuous Update Runner
// ============================================================================

/**
 * Executes a serialized continuous update cycle for a connected repository.
 */
export async function executeContinuousUpdate(
  workspaceId: string,
  repoId: number,
  options: ContinuousUpdateOptions
): Promise<ContinuousUpdateExecutionResult> {
  return withRepositoryLock(workspaceId, repoId, async () => {
    const storage = getStorage();
    const integration = await storage.getGitHubIntegration(workspaceId, repoId);

    if (!integration) {
      throw new GitHubNotFoundError(
        `Integration for repository ID ${repoId} was not found in workspace "${workspaceId}".`
      );
    }

    const updateId = `cur_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    const shouldRunAi = options.runAiExtraction !== false && isGeminiConfigured();

    // 1. Initialize Continuous Update Record
    const record: ContinuousUpdateRecord = {
      id: updateId,
      workspaceId,
      integrationId: integration.id,
      repoOwner: integration.repoOwner,
      repoName: integration.repoName,
      repoId,
      trigger: options.trigger,
      eventType: options.eventType,
      deliveryId: options.deliveryId,
      reason: options.reason || `Continuous update triggered via ${options.trigger} (${options.eventType})`,
      ingestionStatus: 'synced',
      knowledgeStatus: shouldRunAi ? 'extracting' : 'idle',
      status: 'success',
      retryCount: 0,
      maxRetries: 3,
      findingsAdded: 0,
      findingsInvalidated: 0,
      conflictsDetected: 0,
      handoverInvalidated: false,
      timestamp: new Date().toISOString(),
    };

    // 2. Mark Syncing State on Integration
    integration.syncStatus = 'syncing';
    integration.knowledgeStatus = shouldRunAi ? 'extracting' : 'idle';
    integration.updatedAt = new Date().toISOString();
    await storage.saveGitHubIntegration(workspaceId, integration);

    let project = await storage.getWorkspace(workspaceId);
    if (!project) {
      project = await storage.createWorkspace(workspaceId);
    }

    const existingSource = (project.sources || []).find(
      (s) => s.githubIntegrationId === integration.id || s.id === `src_gh_${repoId}`
    );

    const activeService = options.service || gitHubService;
    let ingestionResult: GitHubIngestionResult;

    // 3. Ingestion Step
    try {
      options.onProgress?.({
        phase: 2,
        phaseName: 'Fetching Git Tree via Git Trees API',
        percent: 20,
      });

      ingestionResult = await ingestGitHubRepository(
        integration.repoOwner,
        integration.repoName,
        {
          branch: integration.selectedBranch || integration.defaultBranch,
          installationId: integration.installationId ?? undefined,
          includeCommits: integration.config.includeCommits,
          includePullRequests: integration.config.includePullRequests,
          includeIssues: integration.config.includeIssues,
          includeDocs: integration.config.includeDocs,
          maxCommits: integration.config.maxCommits,
          maxPullRequests: integration.config.maxPullRequests,
          maxIssues: integration.config.maxIssues,
          integrationId: integration.id,
          onProgress: (p) => {
            options.onProgress?.({
              phase: p.phase ?? 2,
              phaseName: p.phaseName ?? 'Processing',
              percent: p.percent ?? 10,
              counters: {
                discovered: p.discoveredCount || 0,
                read: p.readCount || 0,
                skipped: p.skippedCount || 0,
                analyzed: p.analyzedCount || p.readCount || 0,
                findings: p.findingsCount || 0,
              },
            });
          },
        },
        existingSource,
        activeService
      );
    } catch (ingestErr: any) {
      record.ingestionStatus = 'failed';
      record.knowledgeStatus = 'failed';
      record.status = 'failed';
      record.errorMessage = `Ingestion failed: ${ingestErr?.message || ingestErr}`;
      record.completedAt = new Date().toISOString();

      integration.syncStatus = 'error';
      integration.knowledgeStatus = 'failed';
      integration.errorMessage = record.errorMessage;
      integration.updatedAt = new Date().toISOString();

      await storage.saveGitHubIntegration(workspaceId, integration).catch(() => {});
      await storage.recordContinuousUpdate(workspaceId, record).catch(() => {});

      throw ingestErr;
    }

    record.commitSha = ingestionResult.lastCommitSha;

    // 4. Check for Content Drift
    if (!ingestionResult.isChanged) {
      record.ingestionStatus = 'unchanged';
      record.knowledgeStatus = 'skipped';
      record.status = 'no_change';
      record.completedAt = new Date().toISOString();

      integration.syncStatus = 'synced';
      integration.knowledgeStatus = 'idle';
      integration.lastSyncedAt = new Date().toISOString();
      integration.lastCommitSha = ingestionResult.lastCommitSha;
      integration.errorMessage = undefined;
      integration.updatedAt = new Date().toISOString();

      await storage.saveGitHubIntegration(workspaceId, integration);
      await storage.recordContinuousUpdate(workspaceId, record);

      return {
        status: 'no_change',
        record,
        integration,
        source: ingestionResult.source,
        recordCounts: ingestionResult.recordCounts,
        isChanged: false,
        findingsAdded: 0,
      };
    }

    // 5. Update Source in Workspace
    const existingIdx = (project.sources || []).findIndex(
      (s) => s.id === ingestionResult.source.id || s.githubIntegrationId === integration.id
    );

    let updatedSources = [...(project.sources || [])];
    if (existingIdx !== -1) {
      updatedSources[existingIdx] = ingestionResult.source;
    } else {
      updatedSources = [ingestionResult.source, ...updatedSources];
    }

    // 6. Invalidate Handover Certification (Repository Content Drift)
    if (project.currentHandover) {
      project.currentHandover.isOutdated = true;
      project.currentHandover.outdatedReason =
        options.reason ||
        `Repository ${integration.repoOwner}/${integration.repoName} received updates (${ingestionResult.recordCounts.commits} commits, ${ingestionResult.recordCounts.pullRequests} PRs, ${ingestionResult.recordCounts.issues} issues).`;
    }
    // De-certify handover on content drift
    project.handoverCertified = false;
    record.handoverInvalidated = true;

    // 7. Incremental AI Knowledge Extraction & Codebase Findings
    let findingsAdded = 0;
    let updatedFindings = [...(project.findings || [])];

    // Merge grounded codebase intelligence findings (always available)
    if (ingestionResult.codebaseFindings && ingestionResult.codebaseFindings.length > 0) {
      const unapprovedCodeFindings = ingestionResult.codebaseFindings.map((f) => ({
        ...f,
        approved: false,
        rejected: false,
        reviewStatus: 'PENDING_REVIEW' as const,
      }));
      const beforeCount = updatedFindings.length;
      updatedFindings = deduplicateFindings([...unapprovedCodeFindings, ...updatedFindings]);
      findingsAdded += Math.max(0, updatedFindings.length - beforeCount);
    }

    if (shouldRunAi) {
      try {
        options.onProgress?.({
          phase: 7,
          phaseName: 'Synthesizing knowledge findings with Gemini AI',
          percent: 88,
          counters: {
            discovered: ingestionResult.codebaseIntelligence?.stats?.totalFilesDiscovered || 0,
            read: ingestionResult.codebaseIntelligence?.stats?.totalFilesRead || 0,
            skipped: ingestionResult.codebaseIntelligence?.stats?.totalFilesSkipped || 0,
            analyzed: ingestionResult.codebaseIntelligence?.inventory?.length || 0,
            findings: updatedFindings.length,
          },
        });

        // Safe 30s timeout and bounded 2-chunk extraction to guarantee fast, resilient sync
        const aiExtractionPromise = runKnowledgeExtractionPipeline([ingestionResult.source], {
          maxChunks: 2,
        });
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('AI knowledge extraction timeout (exceeded 30s limit)')), 30000)
        );

        const extractionRes = await Promise.race([aiExtractionPromise, timeoutPromise]);
        if (extractionRes.findings && extractionRes.findings.length > 0) {
          // Strictly enforce Zero Auto-Approval Invariant: default to approved: false
          const unapprovedFindings = extractionRes.findings.map((f) => ({
            ...f,
            approved: false,
            rejected: false,
            reviewStatus: 'PENDING_REVIEW' as const,
          }));

          const beforeCount = updatedFindings.length;
          updatedFindings = deduplicateFindings([...unapprovedFindings, ...updatedFindings]);
          findingsAdded += Math.max(0, updatedFindings.length - beforeCount);
        }

        record.knowledgeStatus = 'completed';
        integration.knowledgeStatus = 'completed';
      } catch (aiErr: any) {
        console.warn('[Continuous Update AI Warning]: AI extraction failed or timed out during sync:', aiErr?.message || aiErr);
        // Distinguish ingestion success from knowledge-processing success (graceful degradation)
        record.knowledgeStatus = 'failed';
        record.status = 'partial';
        record.errorMessage = `Ingestion succeeded, but knowledge extraction encountered an issue: ${aiErr?.message || aiErr}`;

        integration.knowledgeStatus = 'failed';
        integration.errorMessage = record.errorMessage;
      }
    } else {
      record.knowledgeStatus = 'skipped';
      integration.knowledgeStatus = 'skipped';
    }

    // 8. Evidence Drift Detection & Selective Approval Invalidation
    const driftScan = scanWorkspaceEvidenceDrift(
      workspaceId,
      ingestionResult.source.id,
      {
        ...project,
        sources: updatedSources,
        findings: updatedFindings,
      }
    );

    updatedFindings = driftScan.updatedFindings;
    record.findingsInvalidated = driftScan.invalidatedFindingIds.length;

    let updatedAuditHistory = [...(project.reviewAuditHistory || [])];
    if (driftScan.auditActions.length > 0) {
      updatedAuditHistory = [...updatedAuditHistory, ...driftScan.auditActions];
    }

    if (driftScan.handoverInvalidated) {
      project.handoverCertified = false;
      record.handoverInvalidated = true;
      if (project.currentHandover) {
        project.currentHandover.isOutdated = true;
        project.currentHandover.outdatedReason = driftScan.driftSummary;
      }
    }

    record.findingsAdded = findingsAdded;
    record.completedAt = new Date().toISOString();

    // Signal Phase 8: Saving Persistent Knowledge
    options.onProgress?.({
      phase: 8,
      phaseName: 'Saving Persistent Knowledge into Storage',
      percent: 92,
      counters: {
        discovered: ingestionResult.codebaseIntelligence?.stats?.totalFilesDiscovered || 0,
        read: ingestionResult.codebaseIntelligence?.stats?.totalFilesRead || 0,
        skipped: ingestionResult.codebaseIntelligence?.stats?.totalFilesSkipped || 0,
        analyzed: ingestionResult.codebaseIntelligence?.inventory?.length || 0,
        findings: updatedFindings.length,
      },
    });

    // Cache the scan result in memory for fast, resilient recovery if persistence needs retry
    activeScanCache.set(`${workspaceId}_${repoId}`, {
      workspaceId,
      repoId,
      ingestionResult,
      commitSha: ingestionResult.lastCommitSha || 'main',
      timestamp: Date.now(),
    });

    // 9. Persist Workspace State (Deduplicate findings to guarantee idempotency)
    updatedFindings = deduplicateFindings(updatedFindings);
    const updatedProject: ProjectData = {
      ...project,
      sources: updatedSources,
      findings: updatedFindings,
      reviewAuditHistory: updatedAuditHistory,
      handoverCertified: project.handoverCertified,
      currentHandover: project.currentHandover,
      lastAnalysed: 'Just now',
    };

    await storage.saveProject(workspaceId, updatedProject);

    // 10. Persist Integration State
    integration.syncStatus = 'synced';
    integration.codebaseIntelligence = ingestionResult.codebaseIntelligence || integration.codebaseIntelligence;
    integration.lastSyncedAt = new Date().toISOString();
    integration.lastCommitSha = ingestionResult.lastCommitSha;
    integration.errorMessage = undefined;
    integration.updatedAt = new Date().toISOString();
    await storage.saveGitHubIntegration(workspaceId, integration);

    // 11. Persist Immutable Update History Record
    await storage.recordContinuousUpdate(workspaceId, record);

    // Signal Phase 9: Completed
    options.onProgress?.({
      phase: 9,
      phaseName: 'Completed',
      percent: 100,
      counters: {
        discovered: ingestionResult.codebaseIntelligence?.stats?.totalFilesDiscovered || 0,
        read: ingestionResult.codebaseIntelligence?.stats?.totalFilesRead || 0,
        skipped: ingestionResult.codebaseIntelligence?.stats?.totalFilesSkipped || 0,
        analyzed: ingestionResult.codebaseIntelligence?.inventory?.length || 0,
        findings: updatedFindings.length,
      },
    });

    return {
      status: record.status,
      record,
      integration,
      source: ingestionResult.source,
      recordCounts: ingestionResult.recordCounts,
      isChanged: true,
      findingsAdded,
    };
  });
}

/**
 * Resumes persistence (Phase 8) specifically using cached scan data.
 * Skips GitHub file fetching and Gemini AI extraction completely.
 */
export async function resumePersistenceOnly(
  workspaceId: string,
  repoId: number
): Promise<{ success: boolean; error?: string; findingsAdded?: number }> {
  const cached = getCachedScan(workspaceId, repoId);
  if (!cached) {
    return {
      success: false,
      error: 'No cached repository scan data available to persist. Please trigger a full synchronization.',
    };
  }

  const storage = getStorage();
  const integration = await storage.getGitHubIntegration(workspaceId, repoId);
  if (!integration) {
    return { success: false, error: `Integration for repoId ${repoId} not found.` };
  }

  let project = await storage.getWorkspace(workspaceId);
  if (!project) {
    project = await storage.createWorkspace(workspaceId);
  }

  const { ingestionResult } = cached;

  // 1. Update source
  const existingIdx = (project.sources || []).findIndex(
    (s) => s.id === ingestionResult.source.id || s.githubIntegrationId === integration.id
  );
  let updatedSources = [...(project.sources || [])];
  if (existingIdx !== -1) {
    updatedSources[existingIdx] = ingestionResult.source;
  } else {
    updatedSources = [ingestionResult.source, ...updatedSources];
  }

  // 2. Deduplicate and merge findings
  let updatedFindings = [...(project.findings || [])];
  let findingsAdded = 0;
  if (ingestionResult.codebaseFindings && ingestionResult.codebaseFindings.length > 0) {
    const unapproved = ingestionResult.codebaseFindings.map((f) => ({
      ...f,
      approved: false,
      rejected: false,
      reviewStatus: 'PENDING_REVIEW' as const,
    }));
    const beforeCount = updatedFindings.length;
    updatedFindings = deduplicateFindings([...unapproved, ...updatedFindings]);
    findingsAdded += Math.max(0, updatedFindings.length - beforeCount);
  }

  // 3. Persist workspace state
  const updatedProject: ProjectData = {
    ...project,
    sources: updatedSources,
    findings: updatedFindings,
    lastAnalysed: 'Just now',
  };
  await storage.saveProject(workspaceId, updatedProject);

  // 4. Persist integration
  integration.syncStatus = 'synced';
  integration.codebaseIntelligence = ingestionResult.codebaseIntelligence || integration.codebaseIntelligence;
  integration.lastSyncedAt = new Date().toISOString();
  integration.lastCommitSha = ingestionResult.lastCommitSha;
  integration.errorMessage = undefined;
  integration.updatedAt = new Date().toISOString();
  await storage.saveGitHubIntegration(workspaceId, integration);

  return { success: true, findingsAdded };
}

// ============================================================================
// Durable Retry & Recovery Runner
// ============================================================================

/**
 * Resumes a failed or partial continuous update job.
 * Avoids re-fetching Git history if the source was already ingested.
 */
export async function retryContinuousUpdateJob(
  workspaceId: string,
  updateId: string,
  customClient?: any
): Promise<{
  success: boolean;
  record: ContinuousUpdateRecord;
  findingsAdded: number;
  error?: string;
  message?: string;
}> {
  const storage = getStorage();
  const record = await storage.getContinuousUpdate(workspaceId, updateId);

  if (!record) {
    throw new Error(`Continuous update record "${updateId}" not found in workspace "${workspaceId}".`);
  }

  // Prevent duplicate processing if update has already succeeded
  if (record.status === 'success' && record.knowledgeStatus === 'completed') {
    return {
      success: true,
      record,
      findingsAdded: 0,
      message: `Update "${updateId}" has already completed successfully. No retry required.`,
    };
  }

  if (record.retryCount >= record.maxRetries) {
    throw new Error(
      `Max retry limit (${record.maxRetries}) reached for update "${updateId}". Please trigger a fresh synchronization.`
    );
  }

  const updatedRetryCount = record.retryCount + 1;

  // Retrieve project and target source
  const project = await storage.getWorkspace(workspaceId);
  if (!project) {
    throw new Error(`Workspace "${workspaceId}" not found.`);
  }

  const targetSource = (project.sources || []).find(
    (s) => s.githubIntegrationId === record.integrationId || s.id === `src_gh_${record.repoId}`
  );

  if (!targetSource) {
    throw new Error(
      `Source for repository ID ${record.repoId} is missing in workspace "${workspaceId}".`
    );
  }

  try {
    const extractionRes = await runKnowledgeExtractionPipeline([targetSource], {}, customClient);
    let findingsAdded = 0;

    if (extractionRes.findings && extractionRes.findings.length > 0) {
      const unapprovedFindings = extractionRes.findings.map((f) => ({
        ...f,
        approved: false,
        rejected: false,
        reviewStatus: 'PENDING_REVIEW' as const,
      }));

      const beforeCount = (project.findings || []).length;
      const updatedFindings = deduplicateFindings([...unapprovedFindings, ...(project.findings || [])]);
      findingsAdded = Math.max(0, updatedFindings.length - beforeCount);

      project.findings = updatedFindings;
      project.handoverCertified = false;
      if (project.currentHandover) {
        project.currentHandover.isOutdated = true;
      }
      await storage.saveProject(workspaceId, project);
    }

    // Update Record Status
    const updatedRecord = await storage.updateContinuousUpdateStatus(workspaceId, updateId, {
      retryCount: updatedRetryCount,
      knowledgeStatus: 'completed',
      status: 'success',
      findingsAdded: record.findingsAdded + findingsAdded,
      errorMessage: undefined,
    });

    // Update Integration
    const integration = await storage.getGitHubIntegration(workspaceId, record.repoId);
    if (integration) {
      integration.knowledgeStatus = 'completed';
      integration.errorMessage = undefined;
      await storage.saveGitHubIntegration(workspaceId, integration);
    }

    return {
      success: true,
      record: updatedRecord || record,
      findingsAdded,
    };
  } catch (err: any) {
    const updatedRecord = await storage.updateContinuousUpdateStatus(workspaceId, updateId, {
      retryCount: updatedRetryCount,
      knowledgeStatus: 'failed',
      status: 'partial',
      errorMessage: `Retry #${updatedRetryCount} failed: ${err?.message || err}`,
    });

    return {
      success: false,
      record: updatedRecord || record,
      findingsAdded: 0,
      error: err?.message || 'Retry failed',
    };
  }
}
