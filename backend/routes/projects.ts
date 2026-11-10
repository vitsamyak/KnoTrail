import { Router, type Request, type Response } from 'express';
import { getStorage } from '../../src/server/db/storage.ts';
import { isValidWorkspaceId } from '../../src/server/db/types.ts';

export const projectsRouter = Router();

/**
 * GET /api/projects/:id?workspaceId=...
 * Retrieves the project matching the ID in the specified workspace.
 */
projectsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const workspaceId = req.query.workspaceId as string | undefined;

    if (!workspaceId || !isValidWorkspaceId(workspaceId)) {
      res.status(400).json({ error: 'Invalid or missing workspaceId' });
      return;
    }

    const storage = getStorage();
    const project = await storage.getWorkspace(workspaceId);

    if (!project || project.id !== req.params.id) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    res.status(200).json({ project, status: 'success' });
  } catch (error: any) {
    console.error('API Error in GET /api/projects/:id:', error?.message || error);
    res.status(500).json({ error: error?.message || 'Internal server error' });
  }
});

/**
 * PATCH /api/projects/:id
 * Updates specified project properties within the workspace.
 */
projectsRouter.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { workspaceId, updates } = req.body || {};

    if (!workspaceId || !isValidWorkspaceId(workspaceId)) {
      res.status(400).json({ error: 'Invalid or missing workspaceId' });
      return;
    }

    if (!updates || typeof updates !== 'object') {
      res.status(400).json({ error: 'Invalid updates payload' });
      return;
    }

    const storage = getStorage();
    let project = await storage.getWorkspace(workspaceId);
    if (!project) {
      project = await storage.createWorkspace(workspaceId);
    }

    const updatedProject = await storage.saveProject(workspaceId, {
      ...project,
      ...updates,
      id: req.params.id, // preserve id
    });

    res.status(200).json({ project: updatedProject, status: 'updated' });
  } catch (error: any) {
    console.error('API Error in PATCH /api/projects/:id:', error?.message || error);
    const status = error?.name === 'ConcurrencyConflictError' ? 409 : 500;
    res.status(status).json({ error: error?.message || 'Internal server error' });
  }
});

