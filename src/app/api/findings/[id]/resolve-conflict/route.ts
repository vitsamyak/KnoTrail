import { NextRequest, NextResponse } from 'next/server';
import { getStorage } from '../../../../../server/db/storage';
import { isValidWorkspaceId } from '../../../../../server/db/types';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json().catch(() => ({}));
    const { workspaceId, resolution, resolvedBy } = body;

    if (!workspaceId || !isValidWorkspaceId(workspaceId)) {
      return NextResponse.json({ error: 'Invalid or missing workspaceId' }, { status: 400 });
    }

    const findingId = params.id;
    if (!findingId) {
      return NextResponse.json({ error: 'Finding ID is required' }, { status: 400 });
    }

    if (!resolution || typeof resolution !== 'string') {
      return NextResponse.json({ error: 'Resolution explanation is required' }, { status: 400 });
    }

    const storage = getStorage();
    const updatedProject = await storage.resolveConflict(
      workspaceId,
      findingId,
      resolution,
      resolvedBy || 'Lead Architect'
    );
    const resolvedFinding = updatedProject.findings.find((f) => f.id === findingId);

    return NextResponse.json({
      finding: resolvedFinding,
      project: updatedProject,
      status: 'resolved',
    });
  } catch (error: any) {
    console.error('API Error in POST /api/findings/[id]/resolve-conflict:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
