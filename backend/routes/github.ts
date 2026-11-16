/**
 * Backend GitHub REST Router (Phase 1 - Milestone 1.1)
 *
 * Implements workspace-level GitHub integration endpoints:
 * - GET /api/github/integrations: List connected repositories
 * - POST /api/github/integrations: Connect a repository (RBAC: MANAGER)
 * - POST /api/github/integrations/:repoId/sync: Synchronize repository context (RBAC: MANAGER, DEVELOPER)
 * - DELETE /api/github/integrations/:repoId: Disconnect repository (RBAC: MANAGER)
 * - GET /api/github/rate-limit: Query current rate-limit telemetry
 *
 * Governance: CodersInPune Hackathon 2026 - Deploy_or_Die (Samyak Gedam & Sanshrey Sanagar)
 */

import { Router, type Request, type Response } from 'express';
import crypto from 'crypto';
import { getStorage } from '../../src/server/db/storage.ts';
import {
  gitHubService,
  GitHubService,
  GitHubRateLimitError,
  GitHubNotFoundError,
  GitHubAuthError,
} from '../services/github.ts';
import { ingestGitHubRepository } from '../services/githubIngestion.ts';
import {
  executeContinuousUpdate,
  retryContinuousUpdateJob,
} from '../services/continuousUpdate.ts';
import { answerCodebaseQuestion } from '../services/codebaseAiExtractor.ts';
import { requireWorkspaceAccess, requireRole } from '../middleware/roleAuth.ts';
import type {
  GitHubIntegration,
  ProjectData,
  ProjectSource,
  ContinuousUpdateRecord,
  ContinuousKnowledgeStatus,
} from '../../src/lib/types.ts';
import { isGeminiConfigured } from '../../src/server/ai/gemini.ts';
import { runKnowledgeExtractionPipeline } from '../../src/server/ai/pipeline.ts';
import { deduplicateFindings } from '../../src/server/ai/chunker.ts';

export const githubRouter = Router();

// ============================================================================
// Service Injection for Deterministic Testing
// ============================================================================

let customService: GitHubService | null = null;
let webhookSecretOverride: string | null = null;

export function setCustomGitHubService(service: GitHubService | null) {
  customService = service;
}

export function getActiveGitHubService(): GitHubService {
  return customService || gitHubService;
}

export function setWebhookSecretOverride(secret: string | null) {
  webhookSecretOverride = secret;
}

export function getWebhookSecret(): string | undefined {
  if (webhookSecretOverride !== null) {
    return webhookSecretOverride;
  }
  return process.env.GITHUB_WEBHOOK_SECRET;
}

// ============================================================================
// Webhook Security & Signature Verification
// ============================================================================

/**
 * Timing-safe HMAC-SHA256 signature verification for GitHub webhooks.
 * Validates that the payload was genuinely sent by GitHub without tampering.
 */
export function verifyGitHubWebhookSignature(
  rawBody: Buffer | string,
  signatureHeader: string | undefined,
  secret: string
): boolean {
  if (!signatureHeader || !secret) {
    return false;
  }

  // GitHub signatures always use "sha256=<hex_digest>"
  if (!signatureHeader.startsWith('sha256=')) {
    return false;
  }

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(rawBody);
  const calculatedSignature = `sha256=${hmac.digest('hex')}`;

  const providedBuffer = Buffer.from(signatureHeader, 'utf-8');
  const calculatedBuffer = Buffer.from(calculatedSignature, 'utf-8');

  if (providedBuffer.length !== calculatedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(providedBuffer, calculatedBuffer);
}

// ============================================================================
// Core Repository Synchronization
// ============================================================================

/**
 * Shared synchronization logic used by both REST API and Webhooks.
 * Delegates to the continuous update engine with per-repository concurrency serialization,
 * immutable update history tracking, and Zero Auto-Approval Invariant enforcement.
 */
export async function executeRepositorySync(
  workspaceId: string,
  repoId: number,
  options: {
    service?: GitHubService;
    runAiExtraction?: boolean;
    reason?: string;
    trigger?: 'webhook' | 'manual_sync' | 'retry';
    eventType?: string;
    deliveryId?: string;
  } = {}
): Promise<{
  status: 'synced';
  knowledgeStatus: ContinuousKnowledgeStatus;
  integration: GitHubIntegration;
  source: ProjectSource;
  recordCounts: { commits: number; pullRequests: number; issues: number; docs: number };
  isChanged: boolean;
  findingsAdded: number;
  updateRecord?: ContinuousUpdateRecord;
}> {
  const activeService = options.service || getActiveGitHubService();
  const updateResult = await executeContinuousUpdate(workspaceId, repoId, {
    trigger: options.trigger || 'manual_sync',
    eventType: options.eventType || 'manual',
    deliveryId: options.deliveryId,
    reason: options.reason,
    runAiExtraction: options.runAiExtraction,
    service: activeService,
  });

  return {
    status: 'synced',
    knowledgeStatus: updateResult.record.knowledgeStatus,
    integration: updateResult.integration,
    source: updateResult.source!,
    recordCounts: updateResult.recordCounts,
    isChanged: updateResult.isChanged,
    findingsAdded: updateResult.findingsAdded,
    updateRecord: updateResult.record,
  };
}

// ============================================================================
// Route Handlers
// ============================================================================

/**
 * GET /api/github/integrations?workspaceId=...
 * Lists all connected GitHub repositories for the authenticated workspace.
 */
githubRouter.get('/integrations', requireWorkspaceAccess, async (req: Request, res: Response) => {
  try {
    const workspaceId = req.workspaceAuth!.workspaceId;
    const storage = getStorage();

    const integrations = await storage.listGitHubIntegrations(workspaceId);

    res.status(200).json({
      integrations,
      status: 'success',
      count: integrations.length,
    });
  } catch (error: any) {
    console.error('[GitHub API Error] GET /api/github/integrations:', error?.message || error);
    res.status(500).json({ error: error?.message || 'Failed to list GitHub integrations' });
  }
});

/**
 * POST /api/github/integrations
 * Connects a GitHub repository to the workspace.
 * Requires MANAGER permissions.
 */
githubRouter.post(
  '/integrations',
  requireWorkspaceAccess,
  requireRole(['MANAGER']),
  async (req: Request, res: Response) => {
    try {
      const workspaceId = req.workspaceAuth!.workspaceId;
      const { repoOwner, repoName, installationId, selectedBranch, config, authToken } = req.body || {};

      // 1. Validate Input
      if (!repoOwner || typeof repoOwner !== 'string' || !repoName || typeof repoName !== 'string') {
        res.status(400).json({
          error: 'Repository owner and name are required strings (e.g. repoOwner: "owner", repoName: "repo").',
        });
        return;
      }

      const trimmedOwner = repoOwner.trim();
      const trimmedRepo = repoName.trim();

      // GitHub repository slug regex validation
      const slugRegex = /^[a-zA-Z0-9_.-]+$/;
      if (!slugRegex.test(trimmedOwner) || !slugRegex.test(trimmedRepo)) {
        res.status(400).json({
          error: 'Invalid repository owner or name format. Must contain only alphanumeric characters, periods, hyphens, or underscores.',
        });
        return;
      }

      const activeService = getActiveGitHubService();

      // 2. Verify repository existence and access via GitHub Service
      const repoMeta = await activeService.getRepository(trimmedOwner, trimmedRepo, {
        installationId: installationId ? Number(installationId) : undefined,
        authToken: (authToken && typeof authToken === 'string') ? authToken.trim() : undefined,
        useDevPatIfAvailable: true,
      });

      const storage = getStorage();

      // 3. Prevent duplicate connection within same workspace
      const existing = await storage.getGitHubIntegration(workspaceId, repoMeta.id);
      if (existing) {
        res.status(409).json({
          error: `Repository "${repoMeta.fullName}" is already connected to workspace "${workspaceId}".`,
        });
        return;
      }

      // 4. Construct Integration Record
      const integration: GitHubIntegration = {
        id: `ghi_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`,
        workspaceId,
        installationId: installationId ? Number(installationId) : undefined,
        repoOwner: repoMeta.owner,
        repoName: repoMeta.name,
        repoId: repoMeta.id,
        defaultBranch: repoMeta.defaultBranch || 'main',
        selectedBranch: (selectedBranch && typeof selectedBranch === 'string') ? selectedBranch.trim() : (repoMeta.defaultBranch || 'main'),
        syncStatus: 'idle',
        config: {
          includeCommits: config?.includeCommits !== false,
          includePullRequests: config?.includePullRequests !== false,
          includeIssues: config?.includeIssues !== false,
          includeDocs: config?.includeDocs !== false,
          maxCommits: typeof config?.maxCommits === 'number' ? config.maxCommits : 30,
          maxPullRequests: typeof config?.maxPullRequests === 'number' ? config.maxPullRequests : 20,
          maxIssues: typeof config?.maxIssues === 'number' ? config.maxIssues : 20,
        },
        metadata: repoMeta,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 5. Persist Integration
      await storage.saveGitHubIntegration(workspaceId, integration);

      res.status(201).json({
        integration,
        status: 'created',
      });
    } catch (error: any) {
      if (error instanceof GitHubNotFoundError) {
        res.status(404).json({
          error: error.message || 'Repository not found on GitHub or private access is unauthorized.',
        });
        return;
      }

      if (error instanceof GitHubRateLimitError) {
        res.status(429).json({
          error: error.message,
          resetTime: error.resetTime,
        });
        return;
      }

      if (error instanceof GitHubAuthError) {
        res.status(401).json({
          error: error.message || 'GitHub authentication failed or credentials lack read access.',
        });
        return;
      }

      console.error('[GitHub API Error] POST /api/github/integrations:', error?.message || error);
      res.status(error?.statusCode || 500).json({
        error: error?.message || 'Failed to connect GitHub repository.',
      });
    }
  }
);

/**
 * POST /api/github/integrations/:repoId/sync
 * Ingests commits, PRs, and issues for the connected repository and compiles a ProjectSource.
 * Requires MANAGER or DEVELOPER permissions.
 */
githubRouter.post(
  '/integrations/:repoId/sync',
  requireWorkspaceAccess,
  requireRole(['MANAGER', 'DEVELOPER']),
  async (req: Request, res: Response) => {
    const workspaceId = req.workspaceAuth!.workspaceId;
    const repoIdParam = Array.isArray(req.params.repoId) ? req.params.repoId[0] : req.params.repoId;
    const repoId = parseInt(repoIdParam, 10);

    if (isNaN(repoId) || repoId <= 0) {
      res.status(400).json({ error: 'Valid numeric repoId parameter is required.' });
      return;
    }

    try {
      const rawRunAi = req.body?.runAiExtraction;
      const runAiExtraction = typeof rawRunAi === 'boolean'
        ? rawRunAi
        : isGeminiConfigured();

      const syncResult = await executeRepositorySync(workspaceId, repoId, {
        service: getActiveGitHubService(),
        runAiExtraction,
        reason: req.body?.reason || 'Manual repository synchronization',
        trigger: 'manual_sync',
        eventType: 'manual',
      });

      res.status(200).json(syncResult);
    } catch (error: any) {
      if (error instanceof GitHubRateLimitError) {
        res.status(429).json({
          error: error.message,
          resetTime: error.resetTime,
          status: 'error',
        });
        return;
      }

      if (error instanceof GitHubNotFoundError) {
        res.status(404).json({
          error: error.message,
          status: 'error',
        });
        return;
      }

      if (error instanceof GitHubAuthError) {
        res.status(401).json({
          error: error.message,
          status: 'error',
        });
        return;
      }

      console.error('[GitHub API Error] POST /api/github/integrations/:repoId/sync:', error?.stack || error?.message || error);
      res.status(error?.statusCode || 500).json({
        error: error?.message || 'Failed to synchronize repository context.',
        status: 'error',
      });
    }
  }
);

/**
 * POST /api/github/webhook
 * Receives and processes real-time GitHub webhook events (push, pull_request, issues).
 *
 * Security:
 * - HMAC-SHA256 verification using raw request body and timing-safe comparison.
 * - Idempotency & replay protection via X-GitHub-Delivery.
 * - Non-blocking asynchronous processing to avoid GitHub 10s timeouts.
 * - Zero secret or token leakage in logs and response payloads.
 */
githubRouter.post('/webhook', async (req: Request, res: Response) => {
  try {
    // 1. Validate Delivery Header
    const deliveryId = req.headers['x-github-delivery'];
    if (!deliveryId || typeof deliveryId !== 'string' || deliveryId.trim().length === 0) {
      res.status(400).json({ error: 'Missing or invalid X-GitHub-Delivery header.' });
      return;
    }

    // 2. Validate Event Header
    const eventType = req.headers['x-github-event'] as string | undefined;
    if (!eventType || typeof eventType !== 'string' || eventType.trim().length === 0) {
      res.status(400).json({ error: 'Missing or invalid X-GitHub-Event header.' });
      return;
    }

    // 3. Verify Signature
    const secret = getWebhookSecret();
    if (!secret) {
      res.status(500).json({ error: 'GitHub webhook secret is not configured on the server.' });
      return;
    }

    const signatureHeader = req.headers['x-hub-signature-256'] as string | undefined;
    if (!signatureHeader) {
      res.status(400).json({ error: 'Missing X-Hub-Signature-256 header.' });
      return;
    }

    const rawBody = req.rawBody || Buffer.from(typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {}));
    const isValidSignature = verifyGitHubWebhookSignature(rawBody, signatureHeader, secret);
    if (!isValidSignature) {
      res.status(401).json({ error: 'Invalid webhook signature.' });
      return;
    }

    // 4. Ping Event Handshake
    if (eventType === 'ping') {
      res.status(200).json({ status: 'pong', message: 'GitHub ping received successfully.' });
      return;
    }

    // 5. Payload Validation (Malformed Payload)
    const payload = req.body;
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      res.status(400).json({ error: 'Malformed webhook payload: Expected JSON object body.' });
      return;
    }

    const repository = payload.repository;
    if (!repository || typeof repository !== 'object' || typeof repository.id !== 'number') {
      res.status(400).json({ error: 'Malformed webhook payload: repository object with numeric id is required.' });
      return;
    }

    const repoId = repository.id;

    // 6. Idempotency Check
    const storage = getStorage();
    const isAlreadyProcessed = await storage.isWebhookDeliveryProcessed(deliveryId);
    if (isAlreadyProcessed) {
      res.status(200).json({
        status: 'duplicate',
        deliveryId,
        message: `Delivery ${deliveryId} has already been processed (idempotent duplicate).`,
      });
      return;
    }

    // 7. Record Delivery (Replay Protection)
    const payloadHash = crypto.createHash('sha256').update(rawBody).digest('hex');
    await storage.recordWebhookDelivery(deliveryId, eventType, repoId, payloadHash);

    // 8. Event Filtering & Reason Derivation
    let reason = '';

    if (eventType === 'push') {
      if (payload.deleted === true) {
        res.status(200).json({ status: 'ignored', message: 'Push branch deletion event ignored.' });
        return;
      }
      const headSha = payload.after || payload.head_commit?.id || 'new commits';
      reason = `Push event on branch ${payload.ref || 'default'}: ${String(headSha).slice(0, 7)}`;
    } else if (eventType === 'pull_request') {
      const monitoredPrActions = ['opened', 'closed', 'reopened', 'synchronize', 'synchronized'];
      if (!monitoredPrActions.includes(payload.action)) {
        res.status(200).json({ status: 'ignored', message: `Pull request action "${payload.action}" does not trigger synchronization.` });
        return;
      }
      reason = `Pull request #${payload.pull_request?.number || ''} ${payload.action}`;
    } else if (eventType === 'issues') {
      const monitoredIssueActions = ['opened', 'closed', 'reopened', 'edited'];
      if (!monitoredIssueActions.includes(payload.action)) {
        res.status(200).json({ status: 'ignored', message: `Issue action "${payload.action}" does not trigger synchronization.` });
        return;
      }
      reason = `Issue #${payload.issue?.number || ''} ${payload.action}`;
    } else if (eventType === 'issue_comment') {
      const monitoredCommentActions = ['created', 'edited'];
      if (!monitoredCommentActions.includes(payload.action)) {
        res.status(200).json({ status: 'ignored', message: `Issue comment action "${payload.action}" does not trigger synchronization.` });
        return;
      }
      reason = `Issue comment #${payload.issue?.number || ''} by ${payload.comment?.user?.login || 'contributor'} (${payload.action})`;
    } else if (eventType === 'pull_request_review') {
      const monitoredReviewActions = ['submitted', 'edited'];
      if (!monitoredReviewActions.includes(payload.action)) {
        res.status(200).json({ status: 'ignored', message: `PR review action "${payload.action}" does not trigger synchronization.` });
        return;
      }
      reason = `PR #${payload.pull_request?.number || ''} review by ${payload.review?.user?.login || 'reviewer'} (${payload.action})`;
    } else if (eventType === 'pull_request_review_comment') {
      const monitoredPrCommentActions = ['created', 'edited'];
      if (!monitoredPrCommentActions.includes(payload.action)) {
        res.status(200).json({ status: 'ignored', message: `PR review comment action "${payload.action}" does not trigger synchronization.` });
        return;
      }
      reason = `PR #${payload.pull_request?.number || ''} code comment by ${payload.comment?.user?.login || 'reviewer'} (${payload.action})`;
    } else {
      res.status(200).json({ status: 'ignored', message: `Event type "${eventType}" is not monitored for synchronization.` });
      return;
    }

    // 9. Unknown Repository Check
    const integrations = await storage.findIntegrationsByRepoId(repoId);
    if (integrations.length === 0) {
      res.status(200).json({
        status: 'ignored',
        deliveryId,
        message: `Repository ID ${repoId} (${repository.full_name || 'unknown'}) is not connected to any workspace in KnoTrail.`,
      });
      return;
    }

    // 10. Execution: Synchronous (in tests or when x-knotrail-wait-sync is passed) or Asynchronous (production)
    const waitSync = req.headers['x-knotrail-wait-sync'] === 'true' || req.query.wait === 'true';

    if (waitSync) {
      const results = [];
      for (const integ of integrations) {
        const syncRes = await executeRepositorySync(integ.workspaceId, repoId, {
          service: getActiveGitHubService(),
          runAiExtraction: true,
          reason,
          trigger: 'webhook',
          eventType,
          deliveryId,
        });
        results.push({ workspaceId: integ.workspaceId, ...syncRes });
      }
      res.status(200).json({
        status: 'synced',
        deliveryId,
        eventType,
        repoId,
        results,
      });
      return;
    }

    // Non-blocking processing for production webhooks (avoids GitHub 10s timeout)
    Promise.allSettled(
      integrations.map((integ) =>
        executeRepositorySync(integ.workspaceId, repoId, {
          service: getActiveGitHubService(),
          runAiExtraction: true,
          reason,
          trigger: 'webhook',
          eventType,
          deliveryId,
        })
      )
    ).catch((err) => {
      console.error('[GitHub Webhook Background Sync Error]:', err?.message || err);
    });

    res.status(202).json({
      status: 'accepted',
      deliveryId,
      eventType,
      repoId,
      workspacesAffected: integrations.map((i) => i.workspaceId),
      message: 'GitHub webhook accepted and repository synchronization queued.',
    });
  } catch (error: any) {
    console.error('[GitHub Webhook Error]:', error?.message || error);
    res.status(500).json({
      error: 'An internal error occurred while processing the GitHub webhook.',
    });
  }
});

/**
 * DELETE /api/github/integrations/:repoId
 * Disconnects a GitHub repository from the workspace and removes associated sources.
 * Requires MANAGER permissions.
 */
githubRouter.delete(
  '/integrations/:repoId',
  requireWorkspaceAccess,
  requireRole(['MANAGER']),
  async (req: Request, res: Response) => {
    try {
      const workspaceId = req.workspaceAuth!.workspaceId;
      const repoIdParam = Array.isArray(req.params.repoId) ? req.params.repoId[0] : req.params.repoId;
      const repoId = parseInt(repoIdParam, 10);

      if (isNaN(repoId) || repoId <= 0) {
        res.status(400).json({ error: 'Valid numeric repoId parameter is required.' });
        return;
      }

      const storage = getStorage();

      // 1. Locate Integration
      const integration = await storage.getGitHubIntegration(workspaceId, repoId);
      if (!integration) {
        res.status(404).json({
          error: `Integration for repository ID ${repoId} was not found in workspace "${workspaceId}".`,
        });
        return;
      }

      // 2. Delete Integration from storage
      await storage.deleteGitHubIntegration(workspaceId, repoId);

      // 3. Remove associated GitHub ProjectSource from workspace
      const project = await storage.getWorkspace(workspaceId);
      if (project && project.sources) {
        const filteredSources = project.sources.filter(
          (s) => s.githubIntegrationId !== integration.id && s.id !== `src_gh_${repoId}`
        );

        const updatedProject: ProjectData = {
          ...project,
          sources: filteredSources,
        };

        await storage.saveProject(workspaceId, updatedProject);
      }

      res.status(200).json({
        message: `GitHub repository integration ${integration.repoOwner}/${integration.repoName} disconnected successfully.`,
        repoId,
        status: 'deleted',
      });
    } catch (error: any) {
      console.error('[GitHub API Error] DELETE /api/github/integrations/:repoId:', error?.message || error);
      res.status(500).json({ error: error?.message || 'Failed to disconnect GitHub integration.' });
    }
  }
);

/**
 * GET /api/github/integrations/:repoId/history?workspaceId=...&limit=...&offset=...
 * Retrieves append-only continuous update history for the repository.
 * Read-only access permitted for MANAGER, DEVELOPER, and EXTERNAL roles.
 */
githubRouter.get(
  '/integrations/:repoId/history',
  requireWorkspaceAccess,
  requireRole(['MANAGER', 'DEVELOPER', 'EXTERNAL']),
  async (req: Request, res: Response) => {
    try {
      const workspaceId = req.workspaceAuth!.workspaceId;
      const repoIdParam = Array.isArray(req.params.repoId) ? req.params.repoId[0] : req.params.repoId;
      const repoId = parseInt(repoIdParam, 10);

      if (isNaN(repoId) || repoId <= 0) {
        res.status(400).json({ error: 'Valid numeric repoId parameter is required.' });
        return;
      }

      const limitParam = parseInt(req.query.limit as string, 10);
      const offsetParam = parseInt(req.query.offset as string, 10);

      const limit = !isNaN(limitParam) && limitParam > 0 ? Math.min(100, limitParam) : 50;
      const offset = !isNaN(offsetParam) && offsetParam >= 0 ? offsetParam : 0;

      const storage = getStorage();
      const history = await storage.getContinuousUpdateHistory(workspaceId, 500);
      const repoHistory = history.filter((h) => h.repoId === repoId);
      const total = repoHistory.length;
      const paginatedHistory = repoHistory.slice(offset, offset + limit);

      res.status(200).json({
        history: paginatedHistory,
        total,
        limit,
        offset,
        hasMore: offset + paginatedHistory.length < total,
        status: 'success',
      });
    } catch (error: any) {
      console.error('[GitHub API Error] GET /api/github/integrations/:repoId/history:', error?.message || error);
      res.status(500).json({ error: error?.message || 'Failed to retrieve update history.' });
    }
  }
);

/**
 * GET /api/github/integrations/:repoId/intelligence?workspaceId=...
 * Retrieves the deep Codebase Intelligence analysis (inventory, blueprint, LOC, and progress).
 * Accessible to MANAGER, DEVELOPER, and EXTERNAL roles.
 */
githubRouter.get(
  '/integrations/:repoId/intelligence',
  requireWorkspaceAccess,
  requireRole(['MANAGER', 'DEVELOPER', 'EXTERNAL']),
  async (req: Request, res: Response) => {
    try {
      const workspaceId = req.workspaceAuth!.workspaceId;
      const repoIdParam = Array.isArray(req.params.repoId) ? req.params.repoId[0] : req.params.repoId;
      const repoId = parseInt(repoIdParam, 10);

      if (isNaN(repoId) || repoId <= 0) {
        res.status(400).json({ error: 'Valid numeric repoId parameter is required.' });
        return;
      }

      const storage = getStorage();
      const integration = await storage.getGitHubIntegration(workspaceId, repoId);
      if (!integration) {
        res.status(404).json({ error: `GitHub integration for repoId ${repoId} not found.` });
        return;
      }

      let intelligence = integration.codebaseIntelligence;
      if (!intelligence) {
        const project = await storage.getWorkspace(workspaceId);
        const source = project?.sources?.find(
          (s) => s.githubIntegrationId === integration.id || s.id === `src_gh_${repoId}`
        );
        if (source?.codebaseIntelligence) {
          intelligence = source.codebaseIntelligence;
        }
      }

      res.status(200).json({
        intelligence: intelligence || null,
        status: 'success',
      });
    } catch (error: any) {
      console.error('[GitHub API Error] GET /api/github/integrations/:repoId/intelligence:', error?.message || error);
      res.status(500).json({ error: error?.message || 'Failed to retrieve codebase intelligence.' });
    }
  }
);

/**
 * POST /api/github/integrations/:repoId/ask
 * Ask an architectural, security, or implementation question about the connected codebase.
 * Returns grounded answer with exact file paths, line ranges, and verbatim quotes.
 * Accessible to MANAGER, DEVELOPER, and EXTERNAL roles.
 */
githubRouter.post(
  '/integrations/:repoId/ask',
  requireWorkspaceAccess,
  requireRole(['MANAGER', 'DEVELOPER', 'EXTERNAL']),
  async (req: Request, res: Response) => {
    try {
      const workspaceId = req.workspaceAuth!.workspaceId;
      const repoIdParam = Array.isArray(req.params.repoId) ? req.params.repoId[0] : req.params.repoId;
      const repoId = parseInt(repoIdParam, 10);

      if (isNaN(repoId) || repoId <= 0) {
        res.status(400).json({ error: 'Valid numeric repoId parameter is required.' });
        return;
      }

      const { question } = req.body || {};
      if (!question || typeof question !== 'string' || question.trim().length === 0) {
        res.status(400).json({ error: 'A valid non-empty question string is required.' });
        return;
      }

      const storage = getStorage();
      const integration = await storage.getGitHubIntegration(workspaceId, repoId);
      if (!integration) {
        res.status(404).json({ error: `GitHub integration for repoId ${repoId} not found.` });
        return;
      }

      const project = await storage.getWorkspace(workspaceId);
      const source = project?.sources?.find(
        (s) => s.githubIntegrationId === integration.id || s.id === `src_gh_${repoId}`
      );
      const intelligence = integration.codebaseIntelligence || source?.codebaseIntelligence;

      if (!intelligence) {
        res.status(400).json({
          error: 'Codebase intelligence has not been generated for this repository yet. Please synchronize the repository first.',
        });
        return;
      }

      const response = await answerCodebaseQuestion(
        intelligence.blueprint,
        intelligence.inventory,
        project?.findings || [],
        question.trim()
      );

      res.status(200).json({
        response,
        status: 'success',
      });
    } catch (error: any) {
      console.error('[GitHub API Error] POST /api/github/integrations/:repoId/ask:', error?.message || error);
      res.status(500).json({ error: error?.message || 'Failed to answer codebase question.' });
    }
  }
);

/**
 * POST /api/github/integrations/:repoId/retry-update
 * Retries a failed or partial continuous update job.
 * Requires MANAGER or DEVELOPER permissions.
 */
githubRouter.post(
  '/integrations/:repoId/retry-update',
  requireWorkspaceAccess,
  requireRole(['MANAGER', 'DEVELOPER']),
  async (req: Request, res: Response) => {
    try {
      const workspaceId = req.workspaceAuth!.workspaceId;
      const { updateId } = req.body || {};

      if (!updateId || typeof updateId !== 'string') {
        res.status(400).json({ error: 'Valid updateId string parameter is required.' });
        return;
      }

      const result = await retryContinuousUpdateJob(workspaceId, updateId);

      res.status(result.success ? 200 : 422).json({
        ...result,
        status: result.success ? 'success' : 'partial',
      });
    } catch (error: any) {
      const isNotFound = error?.message?.includes('not found');
      const isMaxRetries = error?.message?.includes('Max retry limit');
      const statusCode = isNotFound ? 404 : isMaxRetries ? 422 : 500;
      console.error('[GitHub API Error] POST /api/github/integrations/:repoId/retry-update:', error?.message || error);
      res.status(statusCode).json({ error: error?.message || 'Failed to retry continuous update.' });
    }
  }
);

/**
 * GET /api/github/rate-limit?workspaceId=...
 * Exposes non-sensitive rate-limit telemetry to callers without leaking secrets.
 */
githubRouter.get('/rate-limit', requireWorkspaceAccess, (req: Request, res: Response) => {
  const activeService = getActiveGitHubService();
  res.status(200).json({
    rateLimit: activeService.getRateLimitState(),
    status: 'success',
  });
});
