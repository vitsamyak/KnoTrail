import { NextRequest, NextResponse } from 'next/server';
import { getStorage } from '../../../../server/db/storage';
import { isValidWorkspaceId } from '../../../../server/db/types';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId || !isValidWorkspaceId(workspaceId)) {
      return NextResponse.json({ error: 'Invalid or missing workspaceId' }, { status: 400 });
    }

    const storage = getStorage();
    const project = await storage.getWorkspace(workspaceId);

    if (!project || project.id !== params.id) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    return NextResponse.json({ project, status: 'success' });
  } catch (error: any) {
    console.error('API Error in GET /api/projects/[id]:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json().catch(() => ({}));
    const { workspaceId, updates } = body;

    if (!workspaceId || !isValidWorkspaceId(workspaceId)) {
      return NextResponse.json({ error: 'Invalid or missing workspaceId' }, { status: 400 });
    }

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json({ error: 'Invalid updates payload' }, { status: 400 });
    }

    const storage = getStorage();
    let project = await storage.getWorkspace(workspaceId);
    if (!project) {
      project = await storage.createWorkspace(workspaceId);
    }

    const updatedProject = await storage.saveProject(workspaceId, {
      ...project,
      ...updates,
      id: params.id, // preserve id
    });

    return NextResponse.json({ project: updatedProject, status: 'updated' });
  } catch (error: any) {
    console.error('API Error in PATCH /api/projects/[id]:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
