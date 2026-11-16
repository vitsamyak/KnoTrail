import { Router, type Request, type Response } from 'express';
import {
  isSupabaseConfigured,
  getSupabaseConfig,
  getServerSupabaseClient,
} from '../../src/server/db/supabaseClient.ts';

export const healthRouter = Router();

export interface TableProbeResult {
  table: string;
  status: 'ready' | 'missing' | 'forbidden' | 'error';
  error?: string;
}

/**
 * Probes the 5 required KnoTrail PostgreSQL tables via Supabase PostgREST
 * to verify schema provisioning and PostgREST schema cache readiness.
 */
export async function probeDatabaseSchema(): Promise<{
  supabaseHost: string | null;
  supabaseProjectRef: string | null;
  tables: Record<string, string>;
  allTablesReady: boolean;
  missingTables: string[];
}> {
  const config = getSupabaseConfig();
  let supabaseHost: string | null = null;
  let supabaseProjectRef: string | null = null;

  try {
    const parsed = new URL(config.url);
    supabaseHost = parsed.host;
    supabaseProjectRef = parsed.host.split('.')[0] || null;
  } catch {
    // Ignore URL parse error
  }

  const client = getServerSupabaseClient();
  const tablesToCheck = [
    'workspaces',
    'handover_shares',
    'workspace_members',
    'github_integrations',
    'github_webhook_events',
  ];

  const tableStatuses: Record<string, string> = {};
  const missingTables: string[] = [];

  for (const table of tablesToCheck) {
    try {
      const { error } = await client.from(table).select('*', { count: 'exact', head: true });
      if (!error) {
        tableStatuses[table] = 'ready';
      } else if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
        tableStatuses[table] = 'missing';
        missingTables.push(table);
      } else if (error.code === '42501') {
        tableStatuses[table] = 'forbidden';
        missingTables.push(table);
      } else {
        tableStatuses[table] = `error: ${error.message}`;
        missingTables.push(table);
      }
    } catch (err: any) {
      tableStatuses[table] = `error: ${err?.message || 'unknown'}`;
      missingTables.push(table);
    }
  }

  return {
    supabaseHost,
    supabaseProjectRef,
    tables: tableStatuses,
    allTablesReady: missingTables.length === 0,
    missingTables,
  };
}

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

  let probeTimer: NodeJS.Timeout | undefined;
  try {
    // Probe database with 5-second timeout to avoid blocking health checks
    const timeoutPromise = new Promise<never>((_, reject) => {
      probeTimer = setTimeout(() => reject(new Error('Database probe timed out')), 5000);
      if (probeTimer && typeof probeTimer.unref === 'function') {
        probeTimer.unref();
      }
    });

    const probe = await Promise.race([probeDatabaseSchema(), timeoutPromise]);
    if (probeTimer) clearTimeout(probeTimer);

    const isDegraded = !probe.allTablesReady;
    const statusCode = isDegraded ? 503 : 200;

    res.status(statusCode).json({
      status: isDegraded ? 'degraded' : 'ready',
      storage: 'supabase',
      ready: probe.allTablesReady,
      supabaseHost: probe.supabaseHost,
      supabaseProjectRef: probe.supabaseProjectRef,
      tables: probe.tables,
      missingTables: isDegraded ? probe.missingTables : undefined,
      migrationNotice: isDegraded
        ? 'Required PostgreSQL tables missing from schema. Run supabase/migrations/20261116000001_knotrail_github_integrations_hotfix.sql in the Supabase SQL Editor.'
        : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    if (probeTimer) clearTimeout(probeTimer);
    res.status(503).json({
      status: 'degraded',
      storage: 'supabase',
      ready: false,
      error: 'Database connection failed or timed out.',
      timestamp: new Date().toISOString(),
    });
  }
});

