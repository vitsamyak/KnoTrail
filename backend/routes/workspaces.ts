import { Router, type Request, type Response } from 'express';
import { getStorage } from '../../src/server/db/storage.ts';
import { isValidWorkspaceId } from '../../src/server/db/types.ts';
import { requireWorkspaceAccess, requireRole } from '../middleware/roleAuth.ts';
import { redactProjectDataForRole } from '../../src/server/security/redactor.ts';
import type { UserRole } from '../../src/lib/types.ts';

export const workspacesRouter = Router();

/**
 * GET /api/workspaces?workspaceId=...
 * Retrieves or auto-initializes the specified workspace.
 * Applies server-side confidential data redaction for External roles.
 */
workspacesRouter.get('/', requireWorkspaceAccess, async (req: Request, res: Response) => {
  try {
    const workspaceId = req.workspaceAuth!.workspaceId;
    const storage = getStorage();
    let project = await storage.getWorkspace(workspaceId);

    // If workspace does not exist yet (e.g. first visit in Incognito), auto-initialize with demo
    if (!project) {
      project = await storage.createWorkspace(workspaceId);
    }

    // Attach verified caller role to project payload
    project.currentUserRole = req.workspaceAuth!.role;
    project.isProtected = req.workspaceAuth!.isProtected;

    // Server-side redaction for EXTERNAL role
    const sanitizedProject = redactProjectDataForRole(project, req.workspaceAuth!.role);

    res.status(200).json({
      workspaceId,
      project: sanitizedProject,
      role: req.workspaceAuth!.role,
      isProtected: req.workspaceAuth!.isProtected,
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
 * Requires MANAGER or DEVELOPER permissions.
 */
workspacesRouter.post('/', requireWorkspaceAccess, requireRole(['MANAGER', 'DEVELOPER']), async (req: Request, res: Response) => {
  try {
    const workspaceId = req.workspaceAuth!.workspaceId;
    const { initialProject, project: incomingProject } = req.body || {};

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
 * Requires MANAGER permission.
 */
workspacesRouter.post('/reset', requireWorkspaceAccess, requireRole(['MANAGER']), async (req: Request, res: Response) => {
  try {
    const workspaceId = req.workspaceAuth!.workspaceId;
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

/**
 * POST /api/workspaces/:id/claim
 * Claims an un-protected/anonymous workspace, marking it protected and assigning the authenticated
 * caller as the initial trusted MANAGER.
 * Safeguard: The first Manager must be assigned through a trusted server-side creation process.
 */
workspacesRouter.post('/:id/claim', async (req: Request, res: Response) => {
  try {
    const workspaceId = req.params.id;

    if (!workspaceId || !isValidWorkspaceId(workspaceId)) {
      res.status(400).json({ error: 'Valid workspaceId is required' });
      return;
    }

    if (!req.user || !req.user.userId) {
      res.status(401).json({ error: 'Authentication required to claim and protect a workspace.' });
      return;
    }

    const storage = getStorage();
    const isAlreadyProtected = await storage.isWorkspaceProtected(workspaceId);

    if (isAlreadyProtected) {
      res.status(409).json({ error: 'This workspace is already claimed and protected.' });
      return;
    }

    // Set workspace protected and assign owner
    await storage.setWorkspaceProtected(workspaceId, true, req.user.userId);

    // Register caller as initial MANAGER
    const member = await storage.addWorkspaceMember(workspaceId, {
      userId: req.user.userId,
      email: req.user.email,
      role: 'MANAGER',
    });

    res.status(200).json({
      status: 'claimed',
      workspaceId,
      member,
      isProtected: true,
    });
  } catch (error: any) {
    console.error('API Error in POST /api/workspaces/:id/claim:', error?.message || error);
    res.status(500).json({ error: error?.message || 'Internal server error' });
  }
});

/**
 * GET /api/workspaces/:id/members
 * Lists all registered members and their roles.
 * Available to Manager, Developer, and External members.
 */
workspacesRouter.get('/:id/members', requireWorkspaceAccess, requireRole(['MANAGER', 'DEVELOPER', 'EXTERNAL']), async (req: Request, res: Response) => {
  try {
    const workspaceId = req.workspaceAuth!.workspaceId;
    const storage = getStorage();
    const members = await storage.listWorkspaceMembers(workspaceId);

    res.status(200).json({
      workspaceId,
      members,
      status: 'success',
    });
  } catch (error: any) {
    console.error('API Error in GET /api/workspaces/:id/members:', error?.message || error);
    res.status(500).json({ error: error?.message || 'Internal server error' });
  }
});

/**
 * POST /api/workspaces/:id/members
 * Invites or assigns a new member with a specified role.
 * Safeguard: ONLY Managers can invite or assign additional workspace members.
 */
workspacesRouter.post('/:id/members', requireWorkspaceAccess, requireRole(['MANAGER']), async (req: Request, res: Response) => {
  try {
    const workspaceId = req.workspaceAuth!.workspaceId;
    const { userId, email, role } = req.body || {};

    if (!userId || typeof userId !== 'string') {
      res.status(400).json({ error: 'Valid userId is required.' });
      return;
    }

    if (!email || typeof email !== 'string') {
      res.status(400).json({ error: 'Valid email is required.' });
      return;
    }

    const validRoles: UserRole[] = ['MANAGER', 'DEVELOPER', 'EXTERNAL'];
    if (!role || !validRoles.includes(role)) {
      res.status(400).json({
        error: `Invalid role "${role}". Must be one of: ${validRoles.join(', ')}.`,
      });
      return;
    }

    const storage = getStorage();
    const member = await storage.addWorkspaceMember(workspaceId, {
      userId: userId.trim(),
      email: email.trim(),
      role,
    });

    res.status(201).json({
      status: 'created',
      workspaceId,
      member,
    });
  } catch (error: any) {
    console.error('API Error in POST /api/workspaces/:id/members:', error?.message || error);
    res.status(500).json({ error: error?.message || 'Internal server error' });
  }
});

/**
 * DELETE /api/workspaces/:id/members/:userId
 * Removes a member from the workspace.
 * Safeguard: ONLY Managers can remove members.
 */
workspacesRouter.delete('/:id/members/:userId', requireWorkspaceAccess, requireRole(['MANAGER']), async (req: Request, res: Response) => {
  try {
    const workspaceId = req.workspaceAuth!.workspaceId;
    const targetUserId = String(req.params.userId);

    if (!targetUserId || targetUserId === 'undefined') {
      res.status(400).json({ error: 'Target userId is required.' });
      return;
    }

    const storage = getStorage();
    const removed = await storage.removeWorkspaceMember(workspaceId, targetUserId);

    res.status(200).json({
      status: removed ? 'removed' : 'not_found',
      workspaceId,
      userId: targetUserId,
    });
  } catch (error: any) {
    console.error('API Error in DELETE /api/workspaces/:id/members/:userId:', error?.message || error);
    res.status(500).json({ error: error?.message || 'Internal server error' });
  }
});
