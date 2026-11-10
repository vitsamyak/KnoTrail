import { Router, type Request, type Response } from 'express';
import { getStorage } from '../../src/server/db/storage.ts';
import { isValidWorkspaceId } from '../../src/server/db/types.ts';

export const workspacesRouter = Router();

/**
 * GET /api/workspaces?workspaceId=...
 * Retrieves or auto-initializes the specified workspace.
 */
workspacesRouter.get('/', async (req: Request, res: Response) => {
  try {
    const workspaceId = req.query.workspaceId as string | undefined;

    if (!workspaceId || !isValidWorkspaceId(workspaceId)) {
      res.status(400).json({
        error: 'Invalid or missing workspaceId. Must be 3-64 alphanumeric/hyphen/underscore characters.',
      });
      return;
    }

    const storage = getStorage();
    let project = await storage.getWorkspace(workspaceId);

    // If workspace does not exist yet (e.g. first visit in Incognito), auto-initialize with demo
    if (!project) {
      project = await storage.createWorkspace(workspaceId);
    }

    res.status(200).json({
      workspaceId,
      project,
      status: 'success',
    });
  } catch (error: any) {
    console.error('API Error in GET /api/workspaces:', error?.message || error);
    res.status(500).json({ error: error?.message || 'Internal server error' });
  }
});

/**
 * POST /api/workspaces
 * Creates or saves a complete workspace project state.
 */
workspacesRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { workspaceId, initialProject, project: incomingProject } = req.body || {};

    if (!workspaceId || !isValidWorkspaceId(workspaceId)) {
      res.status(400).json({
        error: 'Invalid or missing workspaceId. Must be 3-64 alphanumeric/hyphen/underscore characters.',
      });
      return;
    }

    const storage = getStorage();
    let project;
    if (incomingProject) {
      project = await storage.saveProject(workspaceId, incomingProject);
    } else {
      project = await storage.createWorkspace(workspaceId, initialProject);
    }

    res.status(incomingProject ? 200 : 201).json({
      workspaceId,
      project,
      status: incomingProject ? 'saved' : 'created',
    });
  } catch (error: any) {
    console.error('API Error in POST /api/workspaces:', error?.message || error);
    const status = error?.name === 'ConcurrencyConflictError' ? 409 : 500;
    res.status(status).json({ error: error?.message || 'Internal server error' });
  }
});

/**
 * POST /api/workspaces/reset
 * Resets a workspace to clean default state.
 */
workspacesRouter.post('/reset', async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.body || {};

    if (!workspaceId || !isValidWorkspaceId(workspaceId)) {
      res.status(400).json({ error: 'Invalid or missing workspaceId' });
      return;
    }

    const storage = getStorage();
    const resetProject = await storage.resetWorkspace(workspaceId);

    res.status(200).json({
      workspaceId,
      project: resetProject,
      status: 'reset_success',
    });
  } catch (error: any) {
    console.error('API Error in POST /api/workspaces/reset:', error?.message || error);
    res.status(500).json({ error: error?.message || 'Internal server error' });
  }
});

