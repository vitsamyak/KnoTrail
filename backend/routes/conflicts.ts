import { Router, type Request, type Response } from 'express';
import { getStorage } from '../../src/server/db/storage.ts';
import { isValidWorkspaceId } from '../../src/server/db/types.ts';

export const conflictsRouter = Router();

/**
 * POST /api/conflicts/:id/resolve
 * Resolves a two-sided conflict record by picking the authoritative finding.
 */
conflictsRouter.post('/:id/resolve', async (req: Request, res: Response) => {
  try {
    const conflictId = String(req.params.id);
    const { workspaceId, chosenFindingId, resolutionNotes, resolvedBy } = req.body || {};

    if (!workspaceId || !isValidWorkspaceId(workspaceId)) {
      res.status(400).json({ error: `Invalid or missing workspace ID: "${workspaceId}"` });
      return;
    }

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
      resolvedBy
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
