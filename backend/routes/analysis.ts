import { Router, type Request, type Response } from 'express';
import { getStorage } from '../../src/server/db/storage.ts';
import { isValidWorkspaceId } from '../../src/server/db/types.ts';
import { isGeminiConfigured, GeminiConfigError } from '../../src/server/ai/gemini.ts';
import { runKnowledgeExtractionPipeline } from '../../src/server/ai/pipeline.ts';
import { runFullVerification } from '../../src/server/verification/verifier.ts';

export const analysisRouter = Router();

/**
 * GET /api/analysis/extract?workspaceId=...
 * Returns AI configuration status and available source telemetry.
 */
analysisRouter.get('/extract', async (req: Request, res: Response) => {
  try {
    const workspaceId = (req.query.workspaceId as string) || 'default_workspace';

    if (!isValidWorkspaceId(workspaceId)) {
      res.status(400).json({
        error: 'Invalid workspace ID format. Must be 3-64 alphanumeric characters.',
      });
      return;
    }

    const storage = getStorage();
    const project = await storage.getWorkspace(workspaceId);

    const eligibleSourcesCount = (project?.sources || []).filter((s) => {
      const text = s.documentData?.extractedText || s.description || '';
      return text.trim().length > 0;
    }).length;

    res.status(200).json({
      configured: isGeminiConfigured(),
      model: 'gemini-2.5-flash',
      workspaceId,
      eligibleSourcesCount,
      totalSourcesCount: project?.sources?.length || 0,
      totalFindingsCount: project?.findings?.length || 0,
    });
  } catch (err: any) {
    console.error('Error in GET /api/analysis/extract:', err?.message || err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

/**
 * POST /api/analysis/extract
 * Executes real AI extraction using Gemini 2.5 Flash across ingested project documents.
 */
analysisRouter.post('/extract', async (req: Request, res: Response) => {
  try {
    const { workspaceId, sourceIds, model } = req.body || {};

    if (!workspaceId || !isValidWorkspaceId(workspaceId)) {
      res.status(400).json({
        error: 'Valid workspaceId is required (3-64 alphanumeric characters).',
      });
      return;
    }

    // MANDATORY ZERO FAKE AI INVARIANT: Check API key configuration
    if (!isGeminiConfigured()) {
      res.status(428).json({
        success: false,
        configured: false,
        error:
          'GEMINI_API_KEY is not configured on the server. Please set GEMINI_API_KEY in your environment or .env.local file to perform live AI knowledge extraction. (Zero Fake AI Invariant Enforced)',
      });
      return;
    }

    const storage = getStorage();
    let project = await storage.getWorkspace(workspaceId);

    if (!project) {
      project = await storage.createWorkspace(workspaceId);
    }

    // Filter sources
    const eligibleSources = project.sources.filter((s) => {
      if (sourceIds && Array.isArray(sourceIds) && sourceIds.length > 0) {
        if (!sourceIds.includes(s.id)) return false;
      }
      const text = s.documentData?.extractedText || s.description || '';
      return text.trim().length > 0;
    });

    if (eligibleSources.length === 0) {
      res.status(400).json({
        success: false,
        error:
          'No sources with extractable text were found to analyze. Please upload documents (.pdf, .txt, .md) or connect sources first.',
      });
      return;
    }

    // Execute genuine AI extraction pipeline
    const pipelineResult = await runKnowledgeExtractionPipeline(eligibleSources, {
      model: model || 'gemini-2.5-flash',
      sourceIds,
    });

    // Append newly extracted findings to project findings
    const updatedFindings = [...pipelineResult.findings, ...project.findings];

    const updatedProject = {
      ...project,
      findings: updatedFindings,
      lastAnalysed: 'Just now',
    };

    // Persist to durable storage
    await storage.saveProject(workspaceId, updatedProject);

    res.status(200).json({
      success: true,
      count: pipelineResult.count,
      findings: pipelineResult.findings,
      telemetry: pipelineResult.telemetry,
      project: updatedProject,
    });
  } catch (err: any) {
    console.error('Error in POST /api/analysis/extract:', err?.message || err);
    if (err instanceof GeminiConfigError) {
      res.status(428).json({
        success: false,
        configured: false,
        error: err.message,
      });
      return;
    }
    res.status(500).json({
      success: false,
      error: err.message || 'AI extraction failed',
    });
  }
});

/**
 * POST /api/analysis/verify
 * Runs evidence verification and conflict detection across workspace findings and sources.
 */
analysisRouter.post('/verify', async (req: Request, res: Response) => {
  try {
    const { workspaceId: incomingWsId, useAi } = req.body || {};
    const workspaceId = incomingWsId || 'default';

    if (!isValidWorkspaceId(workspaceId)) {
      res.status(400).json({ error: `Invalid workspace ID: "${workspaceId}"` });
      return;
    }

    const storage = getStorage();
    let project = await storage.getWorkspace(workspaceId);
    if (!project) {
      project = await storage.createWorkspace(workspaceId);
    }

    // Run verification & conflict detection
    const result = await runFullVerification(project.findings, project.sources, {
      workspaceId,
      existingConflicts: project.conflicts || [],
      useAi: useAi !== false,
    });

    // Save updated findings & conflicts
    const updatedProject = {
      ...project,
      findings: result.verifiedFindings,
      conflicts: result.conflicts,
      lastAnalysed: 'Just now',
    };

    await storage.saveProject(workspaceId, updatedProject);

    res.status(200).json({
      success: true,
      workspaceId,
      project: updatedProject,
      verifiedFindings: result.verifiedFindings,
      conflicts: result.conflicts,
      summary: result.summary,
    });
  } catch (err: any) {
    console.error('Error running verification & conflict detection:', err?.message || err);
    res.status(500).json({
      error: err.message || 'Internal verification error',
    });
  }
});

