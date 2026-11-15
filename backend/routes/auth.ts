/**
 * Authentication Router (Round 3 - Server-Verified Login System)
 *
 * Implements server-verified email/password authentication supporting both
 * Supabase Auth and server-verified Demo Account authentication with signed
 * HMAC session tokens, session verification (/me), and logout.
 *
 * SECURITY INVARIANTS:
 * 1. Passwords and service-role secrets are NEVER logged or returned in responses.
 * 2. Password verification uses timing-safe hash comparison (crypto.timingSafeEqual).
 * 3. Client-supplied role claims are strictly ignored; roles are assigned server-side.
 * 4. Anonymous public demo workspaces remain accessible with zero login.
 *
 * Governance: CodersInPune Hackathon 2026 - Deploy_or_Die (Samyak Gedam & Sanshrey Sanagar)
 */

import crypto from 'crypto';
import { Router, type Request, type Response } from 'express';
import { isSupabaseConfigured, getServerSupabaseClient } from '../../src/server/db/supabaseClient.ts';
import { createDevSessionToken } from '../middleware/auth.ts';
import { getStorage } from '../../src/server/db/storage.ts';
import { isValidWorkspaceId } from '../../src/server/db/types.ts';
import type { UserRole } from '../../src/lib/types.ts';

export const authRouter = Router();

// Server-configured demo manager credentials (configurable via environment variables)
export function getDemoCredentials(): { email: string; password: string } {
  return {
    email: (process.env.DEMO_MANAGER_EMAIL || 'manager@knotrail.demo').trim().toLowerCase(),
    password: process.env.DEMO_MANAGER_PASSWORD || 'KnoTrail2026!Manager',
  };
}

/**
 * Constant-time password comparison using SHA-256 digests to prevent timing attacks.
 */
function verifyPasswordTimingSafe(provided: string, expected: string): boolean {
  if (!provided || !expected) return false;
  const providedHash = crypto.createHash('sha256').update(String(provided)).digest();
  const expectedHash = crypto.createHash('sha256').update(String(expected)).digest();
  return crypto.timingSafeEqual(providedHash, expectedHash);
}

/**
 * POST /api/auth/login
 * Authenticates user via email and password server-side.
 * 1. Tries Supabase Auth signInWithPassword if configured and reachable.
 * 2. Falls back to server-verified demo account credentials.
 * 3. Issues server-verified session token and registers user as MANAGER.
 */
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password, workspaceId } = req.body || {};

    if (!email || typeof email !== 'string' || !email.trim()) {
      res.status(400).json({ error: 'Email address is required.' });
      return;
    }

    if (!password || typeof password !== 'string' || !password.trim()) {
      res.status(400).json({ error: 'Password is required.' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const demo = getDemoCredentials();

    let authenticatedUserId: string | null = null;
    let authenticatedEmail: string | null = null;
    let sessionToken: string | null = null;
    let authProvider: 'supabase' | 'server_demo' = 'server_demo';

    // 1. Try Supabase Auth if configured
    if (isSupabaseConfigured()) {
      try {
        const supabase = getServerSupabaseClient();
        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password: password,
        });

        if (!error && data?.session?.access_token && data.user) {
          authenticatedUserId = data.user.id;
          authenticatedEmail = data.user.email || normalizedEmail;
          sessionToken = data.session.access_token;
          authProvider = 'supabase';
        }
      } catch (supabaseErr: any) {
        // Supabase network unreachable or project paused - continue to server demo verification
        console.warn('[Auth Service] Supabase Auth connection failed, checking server-verified credentials:', supabaseErr?.message || supabaseErr);
      }
    }

    // 2. Check Server-Verified Demo Credentials
    if (!authenticatedUserId) {
      const isEmailMatch = normalizedEmail === demo.email;
      const isPasswordMatch = verifyPasswordTimingSafe(password, demo.password);

      if (isEmailMatch && isPasswordMatch) {
        authenticatedUserId = 'usr_mgr_demo_2026';
        authenticatedEmail = demo.email;
        // Generate signed HMAC token valid for 24 hours (86400 seconds)
        sessionToken = createDevSessionToken(
          { id: authenticatedUserId, email: authenticatedEmail },
          86400
        );
        authProvider = 'server_demo';
      }
    }

    // If authentication failed
    if (!authenticatedUserId || !sessionToken) {
      res.status(401).json({
        error: 'Invalid email or password. Please verify your credentials.',
      });
      return;
    }

    // 3. Target Workspace Binding & Manager Role Assignment
    let targetWorkspaceId = workspaceId && isValidWorkspaceId(workspaceId) ? workspaceId : 'ws_proj_demo';
    let memberRole: UserRole = 'MANAGER';

    try {
      const storage = getStorage();

      // Ensure workspace exists
      let project = await storage.getWorkspace(targetWorkspaceId);
      if (!project) {
        project = await storage.createWorkspace(targetWorkspaceId);
      }

      // Mark workspace protected and assign owner
      await storage.setWorkspaceProtected(targetWorkspaceId, true, authenticatedUserId);

      // Register user as MANAGER in authoritative database/storage record
      const member = await storage.addWorkspaceMember(targetWorkspaceId, {
        userId: authenticatedUserId,
        email: authenticatedEmail || normalizedEmail,
        role: 'MANAGER',
      });
      if (member?.role) {
        memberRole = member.role;
      }
    } catch (storageErr: any) {
      console.warn('[Auth Service] Workspace binding warning (remote database sync skipped or failed):', storageErr?.message || storageErr);
      // Fallback: The signed HMAC session token still authenticates the user as MANAGER
    }

    res.status(200).json({
      status: 'authenticated',
      token: sessionToken,
      authProvider,
      user: {
        userId: authenticatedUserId,
        email: authenticatedEmail || normalizedEmail,
        role: memberRole,
      },
      workspace: {
        id: targetWorkspaceId,
        isProtected: true,
        memberRole,
      },
    });
  } catch (error: any) {
    console.error('API Error in POST /api/auth/login:', error?.message || error);
    res.status(500).json({ error: error?.message || 'Internal server error during authentication.' });
  }
});

/**
 * GET /api/auth/me
 * Returns authenticated user info and verified role for active workspace.
 */
authRouter.get('/me', async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.user.userId) {
      res.status(200).json({
        isAuthenticated: false,
        user: null,
      });
      return;
    }

    const workspaceId = req.query.workspaceId as string | undefined;
    let role: UserRole = 'MANAGER';

    if (workspaceId && isValidWorkspaceId(workspaceId)) {
      const storage = getStorage();
      const member = await storage.getWorkspaceMember(workspaceId, req.user.userId);
      if (member) {
        role = member.role;
      }
    }

    res.status(200).json({
      isAuthenticated: true,
      user: {
        userId: req.user.userId,
        email: req.user.email,
        authProvider: req.user.authProvider,
      },
      role,
      workspaceId: workspaceId || null,
    });
  } catch (error: any) {
    console.error('API Error in GET /api/auth/me:', error?.message || error);
    res.status(500).json({ error: error?.message || 'Failed to retrieve user session.' });
  }
});

/**
 * POST /api/auth/logout
 * Invalidate session client-side and return confirmation.
 */
authRouter.post('/logout', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'logged_out',
    message: 'User logged out successfully.',
  });
});

/**
 * GET /api/auth/status
 * Returns server auth capabilities for client UI hints (never reveals passwords).
 */
authRouter.get('/status', (req: Request, res: Response) => {
  const demo = getDemoCredentials();
  res.status(200).json({
    supabaseConfigured: isSupabaseConfigured(),
    demoAccountAvailable: true,
    demoEmail: demo.email,
  });
});
