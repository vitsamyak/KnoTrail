import { NextRequest, NextResponse } from 'next/server';
import { getStorage } from '../../../../server/db/storage';
import { isValidWorkspaceId } from '../../../../server/db/types';
import { exportHandoverMarkdown, exportHandoverJson } from '../../../../lib/handoverFilter';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { workspaceId, signerName, version, regenerate } = body;

    if (!workspaceId || !isValidWorkspaceId(workspaceId)) {
      return NextResponse.json({ error: 'Invalid or missing workspaceId' }, { status: 400 });
    }

    const storage = getStorage();
    const result = await storage.generateAndSaveHandover(workspaceId, signerName, {
      version,
      regenerate: Boolean(regenerate),
    });

    const markdown = exportHandoverMarkdown(result.handover);
    const json = exportHandoverJson(result.handover);

    return NextResponse.json({
      project: result.project,
      handover: result.handover,
      markdown,
      json,
      status: 'generated',
    });
  } catch (error: any) {
    console.error('API Error in POST /api/handovers/generate:', error);
    return NextResponse.json(
      { error: error?.message || 'Handover generation failed' },
      { status: 400 }
    );
  }
}

