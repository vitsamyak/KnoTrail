import type { Request, Response, NextFunction } from 'express';

/**
 * Parses the CORS_ORIGINS environment variable into a normalized set of allowed origins.
 * Supports comma-separated origins: e.g. "https://knotrail.vercel.app,http://localhost:3000"
 */
export function getAllowedOrigins(): string[] {
  const envOrigins = process.env.CORS_ORIGINS;
  if (!envOrigins || envOrigins.trim().length === 0) {
    // Default safe local origins for development
    return [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
    ];
  }

  return envOrigins
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, '')) // strip trailing slashes
    .filter((origin) => origin.length > 0);
}

/**
 * Strict CORS Middleware:
 * - Validates Origin header against explicitly configured CORS_ORIGINS
 * - Disallows wildcard '*' origins in production
 * - Permits preflight OPTIONS requests with explicit status 204
 * - Uncredentialed: credentials=false (KnoTrail uses capability workspace IDs, not cookies)
 */
export function strictCorsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const origin = req.headers.origin;
  const allowedOrigins = getAllowedOrigins();

  // If no Origin header (e.g. server-to-server, curl, health probes), allow request
  if (!origin) {
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Workspace-ID');
    return next();
  }

  const normalizedOrigin = origin.trim().replace(/\/+$/, '');
  const isAllowed = allowedOrigins.includes(normalizedOrigin);

  if (isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', normalizedOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Workspace-ID, Range');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Content-Type, Content-Length');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  } else {
    // If origin is not allowed and it's an OPTIONS preflight, reject with 403
    if (req.method === 'OPTIONS') {
      res.status(403).json({ error: `Origin "${origin}" is not permitted by CORS policy.` });
      return;
    }
  }

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  next();
}

