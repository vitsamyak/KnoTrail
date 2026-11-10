import { Router, type Request, type Response } from 'express';
import { getStorage } from '../../src/server/db/storage.ts';
import { isValidWorkspaceId } from '../../src/server/db/types.ts';

export const findingsRouter = Router();

/**
 * POST /api/findings/:id/approve
 * Approves a finding subject to Phase A and Phase F review gates.
 */
findingsRouter.post('/:id/approve', async (req: Request, res: Response) => {
  try {
    const { workspaceId, reviewerNotes, reviewerName } = req.body || {};
    const findingId = String(req.params.id);

    if (!workspaceId || !isValidWorkspaceId(workspaceId)) {
      res.status(400).json({ error: 'Invalid or missing workspaceId' });
      return;
    }

    if (!findingId) {
      res.status(400).json({ error: 'Finding ID is required' });
      return;
    }

    const storage = getStorage();
    const updatedProject = await storage.approveFinding(
      workspaceId,
      findingId,
      reviewerNotes,
      reviewerName
    );
    const approvedFinding = updatedProject.findings.find((f) => f.id === findingId);

    res.status(200).json({
      finding: approvedFinding,
      project: updatedProject,
      status: 'approved',
    });
  } catch (error: any) {
    console.error('API Error in POST /api/findings/:id/approve:', error?.message || error);
    const isGateBlock =
      error?.message?.includes('Cannot directly approve finding') ||
      error?.message?.includes('Cannot approve finding') ||
      error?.message?.includes('Cannot approve uncertain finding');
    res.status(isGateBlock ? 400 : 500).json({
      error: error?.message || 'Internal server error',
    });
  }
});

/**
 * POST /api/findings/:id/reject
 * Rejects a finding with mandatory documented reason.
 */
findingsRouter.post('/:id/reject', async (req: Request, res: Response) => {
  try {
    const { workspaceId, reason, reviewerName } = req.body || {};
    const findingId = String(req.params.id);

    if (!workspaceId || !isValidWorkspaceId(workspaceId)) {
      res.status(400).json({ error: 'Invalid or missing workspaceId' });
      return;
    }

    if (!findingId) {
      res.status(400).json({ error: 'Finding ID is required' });
      return;
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      res.status(400).json({ error: 'Rejection reason is required' });
      return;
    }

    const storage = getStorage();
    const updatedProject = await storage.rejectFinding(
      workspaceId,
      findingId,
      reason.trim(),
      reviewerName
    );
    const rejectedFinding = updatedProject.findings.find((f) => f.id === findingId);

    res.status(200).json({
      finding: rejectedFinding,
      project: updatedProject,
      status: 'rejected',
    });
  } catch (error: any) {
    console.error('API Error in POST /api/findings/:id/reject:', error?.message || error);
    res.status(500).json({ error: error?.message || 'Internal server error' });
  }
});

/**
 * POST /api/findings/:id/edit
 * Edits a finding, resets approval on material edits, and logs audit action.
 */
findingsRouter.post('/:id/edit', async (req: Request, res: Response) => {
  try {
    const { workspaceId, updates, reviewerNotes, reviewerName } = req.body || {};
    const findingId = String(req.params.id);

    if (!workspaceId || !isValidWorkspaceId(workspaceId)) {
      res.status(400).json({ error: 'Invalid or missing workspaceId' });
      return;
    }

    if (!findingId) {
      res.status(400).json({ error: 'Finding ID is required' });
      return;
    }

    if (!updates || typeof updates !== 'object') {
      res.status(400).json({ error: 'Updates object is required' });
      return;
    }

    const storage = getStorage();
    const updatedProject = await storage.editFinding(
      workspaceId,
      findingId,
      updates,
      reviewerNotes,
      reviewerName
    );
    const editedFinding = updatedProject.findings.find((f) => f.id === findingId);

    res.status(200).json({
      finding: editedFinding,
      project: updatedProject,
      status: 'edited',
    });
  } catch (error: any) {
    console.error('API Error in POST /api/findings/:id/edit:', error?.message || error);
    res.status(500).json({ error: error?.message || 'Internal server error' });
  }
});

/**
 * GET /api/findings/:id/audit?workspaceId=...
 * Retrieves chronological review audit trail for a finding.
 */
findingsRouter.get('/:id/audit', async (req: Request, res: Response) => {
  try {
    const workspaceId = req.query.workspaceId as string | undefined;
    const findingId = String(req.params.id);

    if (!workspaceId || !isValidWorkspaceId(workspaceId)) {
      res.status(400).json({ error: 'Invalid or missing workspaceId' });
      return;
    }

    if (!findingId) {
      res.status(400).json({ error: 'Finding ID is required' });
      return;
    }

    const storage = getStorage();
    const auditHistory = await storage.getReviewAuditHistory(workspaceId, findingId);

    res.status(200).json({
      findingId,
      auditHistory,
      count: auditHistory.length,
    });
  } catch (error: any) {
    console.error('API Error in GET /api/findings/:id/audit:', error?.message || error);
    res.status(500).json({ error: error?.message || 'Internal server error' });
  }
});

/**
 * POST /api/findings/:id/resolve-conflict
 * Resolves a conflict on a specific finding.
 */
findingsRouter.post('/:id/resolve-conflict', async (req: Request, res: Response) => {
  try {
    const { workspaceId, resolution, resolvedBy } = req.body || {};
    const findingId = String(req.params.id);

    if (!workspaceId || !isValidWorkspaceId(workspaceId)) {
      res.status(400).json({ error: 'Invalid or missing workspaceId' });
      return;
    }

    if (!findingId) {
      res.status(400).json({ error: 'Finding ID is required' });
      return;
    }

    if (!resolution || typeof resolution !== 'string') {
      res.status(400).json({ error: 'Resolution explanation is required' });
      return;
    }

    const storage = getStorage();
    const updatedProject = await storage.resolveConflict(
      workspaceId,
      findingId,
      resolution,
      resolvedBy || 'Lead Architect'
    );
    const resolvedFinding = updatedProject.findings.find((f) => f.id === findingId);

    res.status(200).json({
      finding: resolvedFinding,
      project: updatedProject,
      status: 'resolved',
    });
  } catch (error: any) {
    console.error('API Error in POST /api/findings/:id/resolve-conflict:', error?.message || error);
    res.status(500).json({ error: error?.message || 'Internal server error' });
  }
});
