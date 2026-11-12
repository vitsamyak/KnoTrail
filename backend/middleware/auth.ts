import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { isSupabaseConfigured, getServerSupabaseClient } from '../../src/server/db/supabaseClient.ts';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  authProvider: 'supabase' | 'hmac_dev';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

const DEFAULT_DEV_SECRET = 'knotrail_hmac_session_secret_2026_strict';

export function getSessionSecret(): string {
  return process.env.SESSION_SECRET || DEFAULT_DEV_SECRET;
}

/**
 * Generates a cryptographically signed HMAC session token for local/testing environments.
 * Follows JWT specification with strict issuer, audience, and expiry claims.
 */
export function createDevSessionToken(
  user: { id: string; email: string },
  expiresInSeconds: number = 3600,
  secretOverride?: string
): string {
  const secret = secretOverride || getSessionSecret();
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    sub: user.id,
    email: user.email,
    iss: 'knotrail-server',
    aud: 'knotrail-api',
    iat: now,
    exp: now + expiresInSeconds,
  };

  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64url');

  return `kt_hmac.${headerB64}.${payloadB64}.${signature}`;
}

/**
 * Verifies a dev HMAC token with strict checks on signature, issuer, audience, and expiry.
 */
function verifyDevHmacToken(token: string): AuthenticatedUser | null {
  if (!token.startsWith('kt_hmac.')) return null;

  const parts = token.split('.');
  if (parts.length !== 4) {
    throw new Error('Malformed HMAC authentication token.');
  }

  const [, headerB64, payloadB64, signature] = parts;
  const secret = getSessionSecret();

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${headerB64}.${payloadB64}`)
    .digest('base64url');

  // Constant-time comparison to prevent timing attacks
  const sigBuffer = Buffer.from(signature);
  const expectedSigBuffer = Buffer.from(expectedSignature);

  if (sigBuffer.length !== expectedSigBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedSigBuffer)) {
    throw new Error('Invalid authentication token signature.');
  }

  let payload: any;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8'));
  } catch {
    throw new Error('Malformed token payload.');
  }

  // Strict claims validation
  if (payload.iss !== 'knotrail-server') {
    throw new Error(`Invalid token issuer: expected "knotrail-server", received "${payload.iss}".`);
  }

  if (payload.aud !== 'knotrail-api') {
    throw new Error(`Invalid token audience: expected "knotrail-api", received "${payload.aud}".`);
  }

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== 'number' || payload.exp < now) {
    throw new Error('Authentication token has expired.');
  }

  if (!payload.sub || typeof payload.sub !== 'string') {
    throw new Error('Token missing valid subject (user ID).');
  }

  return {
    userId: payload.sub,
    email: payload.email || `${payload.sub}@knotrail.local`,
    authProvider: 'hmac_dev',
  };
}

/**
 * Verifies a Supabase Auth access token using Supabase server client.
 */
async function verifySupabaseToken(token: string): Promise<AuthenticatedUser | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const supabase = getServerSupabaseClient();
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      return null;
    }

    return {
      userId: data.user.id,
      email: data.user.email || `${data.user.id}@supabase.auth`,
      authProvider: 'supabase',
    };
  } catch {
    return null;
  }
}

/**
 * Authentication Middleware:
 * Extracts Bearer token from Authorization header and verifies it server-side.
 * Populates req.user with trusted identity.
 * Does not block anonymous demo requests (roleAuth middleware handles authorization).
 */
export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    // No token provided; leave req.user undefined
    return next();
  }

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    res.status(401).json({ error: 'Malformed Authorization header. Format: "Bearer <token>"' });
    return;
  }

  const token = match[1].trim();

  try {
    // 1. Try HMAC dev token verification
    if (token.startsWith('kt_hmac.')) {
      req.user = verifyDevHmacToken(token) || undefined;
      return next();
    }

    // 2. Try Supabase Auth verification
    const supabaseUser = await verifySupabaseToken(token);
    if (supabaseUser) {
      req.user = supabaseUser;
      return next();
    }

    // Token was provided but failed verification
    res.status(401).json({ error: 'Invalid or expired authentication token.' });
  } catch (err: any) {
    res.status(401).json({ error: err.message || 'Authentication failed.' });
  }
}
