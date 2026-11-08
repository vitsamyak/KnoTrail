import { NextRequest, NextResponse } from 'next/server';
import { getStorage } from '../../../../server/db/storage';
import { isValidWorkspaceId } from '../../../../server/db/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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
    const source = await storage.getSource(workspaceId, params.id);

    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    return NextResponse.json({ source, status: 'success' });
  } catch (error: any) {
    console.error('API Error in GET /api/sources/[id]:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    let workspaceId: string | null = null;

    // Check query params first, then json body
    const { searchParams } = new URL(request.url);
    workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
      const body = await request.json().catch(() => ({}));
      workspaceId = body.workspaceId;
    }

    if (!workspaceId || !isValidWorkspaceId(workspaceId)) {
      return NextResponse.json({ error: 'Invalid or missing workspaceId' }, { status: 400 });
    }

    const storage = getStorage();
    const updatedProject = await storage.deleteSource(workspaceId, params.id);

    return NextResponse.json({
      project: updatedProject,
      deletedSourceId: params.id,
      status: 'deleted',
    });
  } catch (error: any) {
    console.error('API Error in DELETE /api/sources/[id]:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}

