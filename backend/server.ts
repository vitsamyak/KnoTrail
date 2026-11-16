import fs from 'fs';

// Safely load local environment file in Node 20+ runtime if not already loaded by CLI flags
if (typeof process.loadEnvFile === 'function') {
  try {
    if (fs.existsSync('.env.local')) {
      process.loadEnvFile('.env.local');
    } else if (fs.existsSync('.env')) {
      process.loadEnvFile('.env');
    }
  } catch {
    // Ignore if environment file is missing or already loaded
  }
}

import { app } from './app.ts';

const PORT = parseInt(process.env.PORT || '4000', 10);
const HOST = '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  console.log(`[KnoTrail Backend] Standalone API service running on http://${HOST}:${PORT}`);
  console.log(`[KnoTrail Backend] Health liveness: http://${HOST}:${PORT}/health/live`);
  console.log(`[KnoTrail Backend] Health readiness: http://${HOST}:${PORT}/health/ready`);
  console.log(`[KnoTrail Backend] Storage backend: ${process.env.STORAGE_BACKEND || 'file'}`);

  // Proactive non-blocking schema check on startup when Supabase is active
  if ((process.env.STORAGE_BACKEND || '').toLowerCase() === 'supabase') {
    import('./routes/health.ts').then(({ probeDatabaseSchema }) => {
      probeDatabaseSchema().then(probe => {
        console.log(`[KnoTrail Backend] Remote Supabase Connected: ${probe.supabaseHost || 'Unknown'}`);
        console.log(`[KnoTrail Backend] Database Tables Audit:`, JSON.stringify(probe.tables));
        if (!probe.allTablesReady) {
          console.warn(`[KnoTrail Backend] ⚠️ WARNING: Unapplied database migrations detected! Missing tables: ${probe.missingTables.join(', ')}`);
          console.warn(`[KnoTrail Backend] Run supabase/migrations/20261116000001_knotrail_github_integrations_hotfix.sql in Supabase SQL Editor.`);
        } else {
          console.log(`[KnoTrail Backend] ✅ All 5 PostgreSQL tables verified in Supabase.`);
        }
      }).catch(err => {
        console.warn('[KnoTrail Backend] Startup schema check warning:', err?.message || err);
      });
    }).catch(() => {});
  }
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[KnoTrail Backend] Fatal: Port ${PORT} is already in use.`);
  } else {
    console.error('[KnoTrail Backend] Fatal server startup error:', err.message);
  }
  process.exit(1);
});

// Graceful shutdown handling
function shutdown(signal: string) {
  console.log(`[KnoTrail Backend] Received ${signal}. Closing server gracefully...`);
  server.close(() => {
    console.log('[KnoTrail Backend] HTTP server closed cleanly. Exiting process.');
    process.exit(0);
  });

  // Force close if graceful shutdown hangs
  setTimeout(() => {
    console.error('[KnoTrail Backend] Forcefully shutting down after timeout.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

