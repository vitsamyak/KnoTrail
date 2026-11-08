import { NextRequest, NextResponse } from 'next/server';
import { getStorage } from '../../../../server/db/storage';
import { isValidWorkspaceId } from '../../../../server/db/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { workspaceId } = body;

    if (!workspaceId || !isValidWorkspaceId(workspaceId)) {
      return NextResponse.json(
        { error: 'Invalid or missing workspaceId' },
        { status: 400 }
      );
    }

    const storage = getStorage();
    const resetProject = await storage.resetWorkspace(workspaceId);

    return NextResponse.json({
      workspaceId,
      project: resetProject,
      status: 'reset_success',
    });
  } catch (error: any) {
    console.error('API Error in POST /api/workspaces/reset:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
