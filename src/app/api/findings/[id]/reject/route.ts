import { NextRequest, NextResponse } from 'next/server';
import { getStorage } from '../../../../../server/db/storage';
import { isValidWorkspaceId } from '../../../../../server/db/types';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json().catch(() => ({}));
    const { workspaceId, reason, reviewerName } = body;

    if (!workspaceId || !isValidWorkspaceId(workspaceId)) {
      return NextResponse.json({ error: 'Invalid or missing workspaceId' }, { status: 400 });
    }

    const findingId = params.id;
    if (!findingId) {
      return NextResponse.json({ error: 'Finding ID is required' }, { status: 400 });
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 });
    }

    const storage = getStorage();
    const updatedProject = await storage.rejectFinding(workspaceId, findingId, reason.trim(), reviewerName);
    const rejectedFinding = updatedProject.findings.find((f) => f.id === findingId);

    return NextResponse.json({
      finding: rejectedFinding,
      project: updatedProject,
      status: 'rejected',
    });
  } catch (error: any) {
    console.error('API Error in POST /api/findings/[id]/reject:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}

