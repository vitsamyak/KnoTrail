import { NextRequest, NextResponse } from 'next/server';
import { getStorage } from '../../../../../server/db/storage';
import { isValidWorkspaceId } from '../../../../../server/db/types';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json().catch(() => ({}));
    const { workspaceId, updates, reviewerNotes, reviewerName } = body;

    if (!workspaceId || !isValidWorkspaceId(workspaceId)) {
      return NextResponse.json({ error: 'Invalid or missing workspaceId' }, { status: 400 });
    }

    const findingId = params.id;
    if (!findingId) {
      return NextResponse.json({ error: 'Finding ID is required' }, { status: 400 });
    }

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json({ error: 'Updates object is required' }, { status: 400 });
    }

    const storage = getStorage();
    const updatedProject = await storage.editFinding(workspaceId, findingId, updates, reviewerNotes, reviewerName);
    const editedFinding = updatedProject.findings.find((f) => f.id === findingId);

    return NextResponse.json({
      finding: editedFinding,
      project: updatedProject,
      status: 'edited',
    });
  } catch (error: any) {
    console.error('API Error in POST /api/findings/[id]/edit:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}

