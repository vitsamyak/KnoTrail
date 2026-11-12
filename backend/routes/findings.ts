import { Router, type Request, type Response } from 'express';
import { getStorage } from '../../src/server/db/storage.ts';
import { requireWorkspaceAccess, requireRole } from '../middleware/roleAuth.ts';

export const findingsRouter = Router();

/**
 * POST /api/findings/:id/approve
 * Approves a finding subject to Phase A and Phase F review gates.
 * Requires MANAGER or DEVELOPER permissions.
 */
findingsRouter.post('/:id/approve', requireWorkspaceAccess, requireRole(['MANAGER', 'DEVELOPER']), async (req: Request, res: Response) => {
  try {
    const workspaceId = req.workspaceAuth!.workspaceId;
    const { reviewerNotes, reviewerName } = req.body || {};
    const findingId = String(req.params.id);

    if (!findingId) {
      res.status(400).json({ error: 'Finding ID is required' });
      return;
    }

    const storage = getStorage();
    const updatedProject = await storage.approveFinding(
      workspaceId,
      findingId,
      reviewerNotes,
      reviewerName || req.workspaceAuth?.email
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
 * Requires MANAGER or DEVELOPER permissions.
 */
findingsRouter.post('/:id/reject', requireWorkspaceAccess, requireRole(['MANAGER', 'DEVELOPER']), async (req: Request, res: Response) => {
  try {
    const workspaceId = req.workspaceAuth!.workspaceId;
    const { reason, reviewerName } = req.body || {};
    const findingId = String(req.params.id);

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
      reviewerName || req.workspaceAuth?.email
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
 * Requires MANAGER or DEVELOPER permissions.
 */
findingsRouter.post('/:id/edit', requireWorkspaceAccess, requireRole(['MANAGER', 'DEVELOPER']), async (req: Request, res: Response) => {
  try {
    const workspaceId = req.workspaceAuth!.workspaceId;
    const { updates, reviewerNotes, reviewerName } = req.body || {};
    const findingId = String(req.params.id);

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
      reviewerName || req.workspaceAuth?.email
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
 * Redacts internal reviewer notes if accessed by EXTERNAL role.
 */
findingsRouter.get('/:id/audit', requireWorkspaceAccess, async (req: Request, res: Response) => {
  try {
    const workspaceId = req.workspaceAuth!.workspaceId;
    const findingId = String(req.params.id);

    if (!findingId) {
      res.status(400).json({ error: 'Finding ID is required' });
      return;
    }

    const storage = getStorage();
    let auditHistory = await storage.getReviewAuditHistory(workspaceId, findingId);

    if (req.workspaceAuth?.role === 'EXTERNAL') {
      auditHistory = auditHistory.map((item) => ({
        ...item,
        reviewerNotes: undefined,
        notes: undefined,
      }));
    }

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
 * Safeguard: ONLY Managers can resolve conflicts.
 */
findingsRouter.post('/:id/resolve-conflict', requireWorkspaceAccess, requireRole(['MANAGER']), async (req: Request, res: Response) => {
  try {
    const workspaceId = req.workspaceAuth!.workspaceId;
    const { resolution, resolvedBy } = req.body || {};
    const findingId = String(req.params.id);

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
      resolvedBy || req.workspaceAuth?.email || 'Lead Architect'
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
