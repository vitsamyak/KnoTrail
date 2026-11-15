import { Router } from 'express';
import { workspacesRouter } from './workspaces.ts';
import { projectsRouter } from './projects.ts';
import { sourcesRouter } from './sources.ts';
import { analysisRouter } from './analysis.ts';
import { findingsRouter } from './findings.ts';
import { conflictsRouter } from './conflicts.ts';
import { handoversRouter } from './handovers.ts';
import { authRouter } from './auth.ts';
import { githubRouter } from './github.ts';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/workspaces', workspacesRouter);
apiRouter.use('/projects', projectsRouter);
apiRouter.use('/sources', sourcesRouter);
apiRouter.use('/analysis', analysisRouter);
apiRouter.use('/findings', findingsRouter);
apiRouter.use('/conflicts', conflictsRouter);
apiRouter.use('/handovers', handoversRouter);
apiRouter.use('/github', githubRouter);

