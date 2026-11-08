import { NextRequest, NextResponse } from 'next/server';
import { repository } from '../../../../server/db/storage.ts';
import { runFullVerification } from '../../../../server/verification/verifier.ts';
import { isValidWorkspaceId } from '../../../../server/db/types.ts';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const workspaceId = body.workspaceId || 'default';
    const useAi = body.useAi !== false;

    if (!isValidWorkspaceId(workspaceId)) {
      return NextResponse.json(
        { error: `Invalid workspace ID: "${workspaceId}"` },
        { status: 400 }
      );
    }

    let project = await repository.getWorkspace(workspaceId);
    if (!project) {
      project = await repository.createWorkspace(workspaceId);
    }

    // Run verification & conflict detection
    const result = await runFullVerification(project.findings, project.sources, {
      workspaceId,
      existingConflicts: project.conflicts || [],
      useAi,
    });

    // Save updated findings & conflicts
    const updatedProject = {
      ...project,
      findings: result.verifiedFindings,
      conflicts: result.conflicts,
      lastAnalysed: 'Just now',
    };

    await repository.saveProject(workspaceId, updatedProject);

    return NextResponse.json({
      success: true,
      workspaceId,
      project: updatedProject,
      verifiedFindings: result.verifiedFindings,
      conflicts: result.conflicts,
      summary: result.summary,
    });
  } catch (err: any) {
    console.error('Error running verification & conflict detection:', err);
    return NextResponse.json(
      { error: err.message || 'Internal verification error' },
      { status: 500 }
    );
  }
}
