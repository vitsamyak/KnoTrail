import { NextRequest, NextResponse } from 'next/server';
import { getStorage } from '../../../../../server/db/storage';
import { exportHandoverMarkdown } from '../../../../../lib/handoverFilter';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token;
    if (!token) {
      return NextResponse.json({ error: 'Share token is required' }, { status: 400 });
    }

    const storage = getStorage();
    const { handover, projectName } = await storage.getSharedHandover(token);
    const markdown = exportHandoverMarkdown(handover);

    return NextResponse.json({
      handover,
      projectName,
      markdown,
      status: 'success',
    });
  } catch (error: any) {
    const isRevoked = error?.message?.includes('revoked');
    const status = isRevoked ? 403 : 404;
    return NextResponse.json(
      { error: error?.message || 'Handover not found or link has expired' },
      { status }
    );
  }
}

