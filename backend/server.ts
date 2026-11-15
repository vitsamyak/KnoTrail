import { app } from './app.ts';

const PORT = parseInt(process.env.PORT || '4000', 10);
const HOST = '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  console.log(`[KnoTrail Backend] Standalone API service running on http://${HOST}:${PORT}`);
  console.log(`[KnoTrail Backend] Health liveness: http://${HOST}:${PORT}/health/live`);
  console.log(`[KnoTrail Backend] Health readiness: http://${HOST}:${PORT}/health/ready`);
  console.log(`[KnoTrail Backend] Storage backend: ${process.env.STORAGE_BACKEND || 'file'}`);
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

