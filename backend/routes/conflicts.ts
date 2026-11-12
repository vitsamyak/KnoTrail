import { Router, type Request, type Response } from 'express';
import { getStorage } from '../../src/server/db/storage.ts';
import { requireWorkspaceAccess, requireRole } from '../middleware/roleAuth.ts';

export const conflictsRouter = Router();

/**
 * POST /api/conflicts/:id/resolve
 * Resolves a two-sided conflict record by picking the authoritative finding.
 * Safeguard: ONLY Managers can resolve architectural conflicts.
 */
conflictsRouter.post('/:id/resolve', requireWorkspaceAccess, requireRole(['MANAGER']), async (req: Request, res: Response) => {
  try {
    const conflictId = String(req.params.id);
    const workspaceId = req.workspaceAuth!.workspaceId;
    const { chosenFindingId, resolutionNotes, resolvedBy } = req.body || {};

    if (!conflictId) {
      res.status(400).json({ error: 'Conflict ID is required' });
      return;
    }

    const storage = getStorage();
    const updatedProject = await storage.resolveConflictRecord(
      workspaceId,
      conflictId,
      chosenFindingId,
      resolutionNotes,
      resolvedBy || req.workspaceAuth?.email || 'Project Manager'
    );

    res.status(200).json({
      success: true,
      conflictId,
      project: updatedProject,
    });
  } catch (err: any) {
    console.error('Error resolving conflict record:', err?.message || err);
    res.status(500).json({
      error: err.message || 'Error resolving conflict record',
    });
  }
});
