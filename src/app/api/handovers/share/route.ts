import { NextRequest, NextResponse } from 'next/server';
import { getStorage } from '../../../../server/db/storage';
import { isValidWorkspaceId } from '../../../../server/db/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { workspaceId, handoverId } = body;

    if (!workspaceId || !isValidWorkspaceId(workspaceId)) {
      return NextResponse.json({ error: 'Invalid or missing workspaceId' }, { status: 400 });
    }

    const storage = getStorage();
    const shareRecord = await storage.createShareToken(workspaceId, handoverId);

    return NextResponse.json({
      shareRecord,
      shareUrl: `/share/${shareRecord.token}`,
      status: 'created',
    });
  } catch (error: any) {
    console.error('API Error in POST /api/handovers/share:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create share token' },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { workspaceId, token } = body;

    if (!workspaceId || !isValidWorkspaceId(workspaceId)) {
      return NextResponse.json({ error: 'Invalid or missing workspaceId' }, { status: 400 });
    }

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const storage = getStorage();
    await storage.revokeShareToken(workspaceId, token);

    return NextResponse.json({
      status: 'revoked',
    });
  } catch (error: any) {
    console.error('API Error in DELETE /api/handovers/share:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to revoke share token' },
      { status: 500 }
    );
  }
}

