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

/**
 * Extracts workspace ID from query, body, or route parameters.
 */
export function extractWorkspaceId(req: Request): string | null {
  const wsId =
    (req.query.workspaceId as string) ||
    (req.body && typeof req.body === 'object' && req.body.workspaceId) ||
    (req.params && req.params.workspaceId) ||
    ((req.baseUrl.includes('workspaces') || req.path.startsWith('/workspaces')) &&
      req.params &&
      req.params.id);

  if (typeof wsId === 'string' && isValidWorkspaceId(wsId.trim())) {
    return wsId.trim();
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
  const workspaceId = extractWorkspaceId(req);

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
