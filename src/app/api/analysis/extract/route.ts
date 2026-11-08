import { NextRequest, NextResponse } from 'next/server';
import { getStorage } from '../../../../server/db/storage.ts';
import { isValidWorkspaceId } from '../../../../server/db/types.ts';
import { isGeminiConfigured, GeminiConfigError } from '../../../../server/ai/gemini.ts';
import { runKnowledgeExtractionPipeline } from '../../../../server/ai/pipeline.ts';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/analysis/extract?workspaceId=...
 * Returns the AI configuration status and available source telemetry.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId') || 'default_workspace';

    if (!isValidWorkspaceId(workspaceId)) {
      return NextResponse.json(
        { error: 'Invalid workspace ID format. Must be 3-64 alphanumeric characters.' },
        { status: 400 }
      );
    }

    const storage = getStorage();
    const project = await storage.getWorkspace(workspaceId);

    const eligibleSourcesCount = (project?.sources || []).filter((s) => {
      const text = s.documentData?.extractedText || s.description || '';
      return text.trim().length > 0;
    }).length;

    return NextResponse.json({
      configured: isGeminiConfigured(),
      model: 'gemini-2.5-flash',
      workspaceId,
      eligibleSourcesCount,
      totalSourcesCount: project?.sources?.length || 0,
      totalFindingsCount: project?.findings?.length || 0,
    });
  } catch (err: any) {
    console.error('Error in GET /api/analysis/extract:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/analysis/extract
 * Executes real AI extraction using Gemini 2.5 Flash across ingested project documents.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { workspaceId, sourceIds, model } = body;

    if (!workspaceId || !isValidWorkspaceId(workspaceId)) {
      return NextResponse.json(
        { error: 'Valid workspaceId is required (3-64 alphanumeric characters).' },
        { status: 400 }
      );
    }

    // MANDATORY ZERO FAKE AI INVARIANT: Check API key configuration
    if (!isGeminiConfigured()) {
      return NextResponse.json(
        {
          success: false,
          configured: false,
          error:
            'GEMINI_API_KEY is not configured on the server. Please set GEMINI_API_KEY in your environment or .env.local file to perform live AI knowledge extraction. (Zero Fake AI Invariant Enforced)',
        },
        { status: 428 } // Precondition Required
      );
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
      return NextResponse.json(
        {
          success: false,
          error:
            'No sources with extractable text were found to analyze. Please upload documents (.pdf, .txt, .md) or connect sources first.',
        },
        { status: 400 }
      );
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

    return NextResponse.json({
      success: true,
      count: pipelineResult.count,
      findings: pipelineResult.findings,
      telemetry: pipelineResult.telemetry,
      project: updatedProject,
    });
  } catch (err: any) {
    console.error('Error in POST /api/analysis/extract:', err);
    if (err instanceof GeminiConfigError) {
      return NextResponse.json(
        { success: false, configured: false, error: err.message },
        { status: 428 }
      );
    }
    return NextResponse.json(
      { success: false, error: err.message || 'AI extraction failed' },
      { status: 500 }
    );
  }
}
