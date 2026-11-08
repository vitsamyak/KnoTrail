import { NextRequest, NextResponse } from 'next/server';
import { getStorage } from '../../../../server/db/storage';
import { isValidWorkspaceId } from '../../../../server/db/types';
import { generateHandoverMarkdown, generateHandoverJSON } from '../../../../lib/handoverFilter';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { workspaceId, signerName } = body;

    if (!workspaceId || !isValidWorkspaceId(workspaceId)) {
      return NextResponse.json({ error: 'Invalid or missing workspaceId' }, { status: 400 });
    }

    const storage = getStorage();
    const certifiedProject = await storage.certifyHandover(
      workspaceId,
      signerName || 'Elena Rostova & Marcus Vance'
    );

    const markdown = generateHandoverMarkdown(certifiedProject);
    const json = generateHandoverJSON(certifiedProject);

    return NextResponse.json({
      project: certifiedProject,
      markdown,
      json,
      status: 'certified',
    });
  } catch (error: any) {
    console.error('API Error in POST /api/handovers/certify:', error);
    // If blocked by Phase A gatecheck, return 400 with specific reason
    return NextResponse.json(
      { error: error?.message || 'Handover certification failed' },
      { status: 400 }
    );
  }
}
