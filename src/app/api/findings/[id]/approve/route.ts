import { NextRequest, NextResponse } from 'next/server';
import { getStorage } from '../../../../../server/db/storage';
import { isValidWorkspaceId } from '../../../../../server/db/types';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json().catch(() => ({}));
    const { workspaceId, reviewerNotes, reviewerName } = body;

    if (!workspaceId || !isValidWorkspaceId(workspaceId)) {
      return NextResponse.json({ error: 'Invalid or missing workspaceId' }, { status: 400 });
    }

    const findingId = params.id;
    if (!findingId) {
      return NextResponse.json({ error: 'Finding ID is required' }, { status: 400 });
    }

    const storage = getStorage();
    const updatedProject = await storage.approveFinding(workspaceId, findingId, reviewerNotes, reviewerName);
    const approvedFinding = updatedProject.findings.find((f) => f.id === findingId);

    return NextResponse.json({
      finding: approvedFinding,
      project: updatedProject,
      status: 'approved',
    });
  } catch (error: any) {
    console.error('API Error in POST /api/findings/[id]/approve:', error);
    const isGateBlock = 
      error?.message?.includes('Cannot directly approve finding') ||
      error?.message?.includes('Cannot approve finding') ||
      error?.message?.includes('Cannot approve uncertain finding');
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: isGateBlock ? 400 : 500 }
    );
  }
}

