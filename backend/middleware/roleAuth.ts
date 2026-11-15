import type { Request, Response, NextFunction } from 'express';
import { getStorage } from '../../src/server/db/storage.ts';
import { isValidWorkspaceId } from '../../src/server/db/types.ts';
import type { UserRole } from '../../src/lib/types.ts';

export interface WorkspaceAuthContext {
  workspaceId: string;
  isProtected: boolean;
  isAnonymousDemo: boolean;
  userId?: string;
  email?: string;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      workspaceAuth?: WorkspaceAuthContext;
    }
  }
}

export class WorkspaceIdCollisionError extends Error {
  constructor(message: string = 'Workspace ID parameter collision: Contradictory workspace IDs provided in request.') {
    super(message);
    this.name = 'WorkspaceIdCollisionError';
  }
}

/**
 * Extracts and validates workspace ID with strict precedence and collision detection:
 * 1. Route workspace IDs (req.params.workspaceId or req.params.id on workspace routes) take precedence.
 * 2. If contradictory workspace IDs are provided across route, query, or body, throws WorkspaceIdCollisionError.
 * 3. Returns validated workspace ID or null.
 */
export function extractWorkspaceId(req: Request): string | null {
  const isWorkspaceRoute =
    (req.baseUrl && req.baseUrl.includes('workspaces')) ||
    (req.path && req.path.startsWith('/workspaces')) ||
    (req.originalUrl && req.originalUrl.includes('/api/workspaces/'));

  const routeWsId =
    (req.params && typeof req.params.workspaceId === 'string' && req.params.workspaceId.trim()) ||
    (isWorkspaceRoute && req.params && typeof req.params.id === 'string' && req.params.id.trim()) ||
    null;

  const queryWsId =
    (req.query && typeof req.query.workspaceId === 'string' && req.query.workspaceId.trim()) || null;

  const bodyWsId =
    (req.body && typeof req.body === 'object' && typeof req.body.workspaceId === 'string' && req.body.workspaceId.trim()) || null;

  // Collision detection: Check for contradictory workspace IDs across parameters
  const specifiedIds = [routeWsId, queryWsId, bodyWsId].filter((id): id is string => Boolean(id));
  if (specifiedIds.length > 1) {
    const first = specifiedIds[0];
    const hasCollision = specifiedIds.some((id) => id !== first);
    if (hasCollision) {
      throw new WorkspaceIdCollisionError(
        `Workspace ID collision: Contradictory workspace IDs provided across route, query, or body parameters (${specifiedIds.join(' vs ')}).`
      );
    }
  }

  // Precedence: Route parameter takes precedence, followed by query, then body
  const selected = routeWsId || queryWsId || bodyWsId;

  if (selected && isValidWorkspaceId(selected)) {
    return selected;
  }
  return null;
}

/**
 * Middleware: Enforces workspace membership and resolves the authoritative role.
 * - Anonymous demo workspaces (ws_anon_*): Allows access with demo simulation role.
 * - Protected workspaces: Requires verified authentication and database membership.
 * - Client-supplied role headers are strictly ignored for protected workspaces.
 */
export async function requireWorkspaceAccess(req: Request, res: Response, next: NextFunction) {
  let workspaceId: string | null = null;
  try {
    workspaceId = extractWorkspaceId(req);
  } catch (err: any) {
    if (err instanceof WorkspaceIdCollisionError) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.status(400).json({ error: err?.message || 'Invalid workspace parameter.' });
    return;
  }

  if (!workspaceId) {
    res.status(400).json({
      error: 'Valid workspaceId is required (3-64 alphanumeric, hyphen, or underscore characters).',
    });
    return;
  }

  try {
    const storage = getStorage();
    const isProtected = await storage.isWorkspaceProtected(workspaceId);

    // 1. ANONYMOUS DEMO WORKSPACE
    if (!isProtected) {
      // In demo mode, a simulated perspective is allowed strictly for UI demonstration
      const demoPerspectiveHeader = req.headers['x-demo-perspective'] as string | undefined;
      const demoPerspectiveQuery = req.query.demoPerspective as string | undefined;
      const candidate = (demoPerspectiveHeader || demoPerspectiveQuery || 'MANAGER').toUpperCase();
      const demoRole: UserRole =
        candidate === 'DEVELOPER' || candidate === 'EXTERNAL' ? candidate : 'MANAGER';

      req.workspaceAuth = {
        workspaceId,
        isProtected: false,
        isAnonymousDemo: true,
        userId: req.user?.userId || 'demo-user',
        email: req.user?.email || 'demo@knotrail.local',
        role: demoRole,
      };

      return next();
    }

    // 2. PROTECTED WORKSPACE
    // Must be authenticated
    if (!req.user || !req.user.userId) {
      res.status(401).json({
        error: 'Authentication required. This workspace is protected and requires a valid session token.',
      });
      return;
    }

    // Must be a registered member in server records
    const member = await storage.getWorkspaceMember(workspaceId, req.user.userId);

    if (!member) {
      res.status(403).json({
        error: `Access denied: You are not a registered member of protected workspace "${workspaceId}". Cross-workspace access is prohibited.`,
      });
      return;
    }

    // Authoritative role from trusted database record
    req.workspaceAuth = {
      workspaceId,
      isProtected: true,
      isAnonymousDemo: false,
      userId: req.user.userId,
      email: req.user.email,
      role: member.role,
    };

    return next();
  } catch (err: any) {
    console.error(`[Authorization Error] Failed checking access for ${workspaceId}:`, err);
    res.status(500).json({ error: 'Failed to verify workspace permissions.' });
  }
}

/**
 * Middleware Factory: Enforces that the caller holds one of the required roles.
 * Must be mounted after requireWorkspaceAccess.
 */
export function requireRole(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.workspaceAuth) {
      res.status(401).json({ error: 'Authorization context not established.' });
      return;
    }

    const userRole = req.workspaceAuth.role;

    if (!allowedRoles.includes(userRole)) {
      res.status(403).json({
        error: `Forbidden: Action requires one of [${allowedRoles.join(', ')}]. Current role: "${userRole}".`,
      });
      return;
    }

    next();
  };
}
