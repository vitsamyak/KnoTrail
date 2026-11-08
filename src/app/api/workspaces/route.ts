import { NextRequest, NextResponse } from 'next/server';
import { getStorage } from '../../../server/db/storage';
import { isValidWorkspaceId } from '../../../server/db/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId || !isValidWorkspaceId(workspaceId)) {
      return NextResponse.json(
        { error: 'Invalid or missing workspaceId. Must be 3-64 alphanumeric/hyphen/underscore characters.' },
        { status: 400 }
      );
    }

    const storage = getStorage();
    let project = await storage.getWorkspace(workspaceId);

    // If workspace does not exist yet (e.g. first visit in Incognito), auto-initialize with demo
    if (!project) {
      project = await storage.createWorkspace(workspaceId);
    }

    return NextResponse.json({
      workspaceId,
      project,
      status: 'success',
    });
  } catch (error: any) {
    console.error('API Error in GET /api/workspaces:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { workspaceId, initialProject, project: incomingProject } = body;

    if (!workspaceId || !isValidWorkspaceId(workspaceId)) {
      return NextResponse.json(
        { error: 'Invalid or missing workspaceId. Must be 3-64 alphanumeric/hyphen/underscore characters.' },
        { status: 400 }
      );
    }

    const storage = getStorage();
    let project;
    if (incomingProject) {
      project = await storage.saveProject(workspaceId, incomingProject);
    } else {
      project = await storage.createWorkspace(workspaceId, initialProject);
    }

    return NextResponse.json(
      {
        workspaceId,
        project,
        status: incomingProject ? 'saved' : 'created',
      },
      { status: incomingProject ? 200 : 201 }
    );
  } catch (error: any) {
    console.error('API Error in POST /api/workspaces:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
