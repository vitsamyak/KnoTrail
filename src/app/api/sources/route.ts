import { NextRequest, NextResponse } from 'next/server';
import { getStorage } from '../../../server/db/storage';
import { isValidWorkspaceId } from '../../../server/db/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId || !isValidWorkspaceId(workspaceId)) {
      return NextResponse.json({ error: 'Invalid or missing workspaceId' }, { status: 400 });
    }

    const storage = getStorage();
    let project = await storage.getWorkspace(workspaceId);
    if (!project) {
      project = await storage.createWorkspace(workspaceId);
    }

    return NextResponse.json({ sources: project.sources, status: 'success' });
  } catch (error: any) {
    console.error('API Error in GET /api/sources:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { workspaceId, name, type, content, description } = body;

    if (!workspaceId || !isValidWorkspaceId(workspaceId)) {
      return NextResponse.json({ error: 'Invalid or missing workspaceId' }, { status: 400 });
    }

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Source name is required' }, { status: 400 });
    }

    if (!type || typeof type !== 'string') {
      return NextResponse.json({ error: 'Source type is required' }, { status: 400 });
    }

    const storage = getStorage();
    const result = await storage.addSource(workspaceId, {
      name,
      type: type as any,
      content: typeof content === 'string' ? content : '',
      description: typeof description === 'string' ? description : '',
    });

    return NextResponse.json(
      {
        source: result.source,
        finding: result.finding,
        project: result.project,
        status: 'created',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('API Error in POST /api/sources:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
