import { Router, type Request, type Response } from 'express';
import { isSupabaseConfigured, getServerSupabaseClient } from '../../src/server/db/supabaseClient.ts';

export const healthRouter = Router();

/**
 * GET /health/live
 * Fast process liveness check. Does NOT require external dependencies.
 * Used by Render to verify the process is alive and accepting traffic.
 */
healthRouter.get('/live', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /health/ready
 * Deep readiness check. Verifies configuration and remote Supabase connectivity.
 * Returns HTTP 200 when ready, or HTTP 503 when dependencies are unreachable.
 * Never leaks credentials or raw internal stack traces in public responses.
 */
healthRouter.get('/ready', async (req: Request, res: Response) => {
  const backend = (process.env.STORAGE_BACKEND || 'file').toLowerCase();

  // If using file-backed storage (local development/testing), report ready
  if (backend !== 'supabase') {
    res.status(200).json({
      status: 'ready',
      storage: 'file',
      ready: true,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // If Supabase is configured as production backend, verify credentials & connectivity
  if (!isSupabaseConfigured()) {
    res.status(503).json({
      status: 'degraded',
      storage: 'supabase',
      ready: false,
      error: 'Supabase configuration missing (SUPABASE_URL or SUPABASE_SECRET_KEY not set).',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    const client = getServerSupabaseClient();
    
    // Probe database with 4-second timeout to avoid blocking health checks
    const timeoutPromise = new Promise<{ error: Error }>((_, reject) =>
      setTimeout(() => reject(new Error('Database probe timed out')), 4000)
    );
    const queryPromise = client.from('workspaces').select('id').limit(1);

    const result = (await Promise.race([queryPromise, timeoutPromise])) as any;

    if (result?.error) {
      res.status(503).json({
        status: 'degraded',
        storage: 'supabase',
        ready: false,
        error: 'Database returned an error during readiness check.',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.status(200).json({
      status: 'ready',
      storage: 'supabase',
      ready: true,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(503).json({
      status: 'degraded',
      storage: 'supabase',
      ready: false,
      error: 'Database connection failed or timed out.',
      timestamp: new Date().toISOString(),
    });
  }
});

