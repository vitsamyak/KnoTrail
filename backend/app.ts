import express, { type Request, type Response, type NextFunction } from 'express';
import { strictCorsMiddleware } from './middleware/cors.ts';
import { healthRouter } from './routes/health.ts';
import { apiRouter } from './routes/index.ts';

export function createApp() {
  const app = express();

  // Disable x-powered-by header
  app.disable('x-powered-by');

  // Security Headers
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    next();
  });

  // Strict CORS policy
  app.use(strictCorsMiddleware);

  // Body parsers for JSON and URL-encoded forms (10 MB limit)
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Health probe routes (unprefixed at /health)
  app.use('/health', healthRouter);

  // KnoTrail API routes mounted under /api
  app.use('/api', apiRouter);

  // Root welcome / discovery route
  app.get('/', (req: Request, res: Response) => {
    res.status(200).json({
      service: 'KnoTrail Standalone Backend API',
      version: '1.0.0',
      status: 'active',
      health: '/health/live',
      ready: '/health/ready',
    });
  });

  // Catch-all 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
  });

  // Global Error Handler
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    // Safe error logging: log message and name without leaking req.body or headers
    console.error(`[Backend Error] ${err?.name || 'Error'}: ${err?.message || 'Unknown error'}`);
    
    if (res.headersSent) {
      return next(err);
    }

    const statusCode = typeof err?.statusCode === 'number' && err.statusCode >= 400 && err.statusCode < 600
      ? err.statusCode
      : 500;

    res.status(statusCode).json({
      error: err?.message || 'Internal server error',
    });
  });

  return app;
}

export const app = createApp();

