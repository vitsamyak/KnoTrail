import { NextRequest, NextResponse } from 'next/server';
import { getStorage } from '../../../../server/db/storage';
import { isValidWorkspaceId } from '../../../../server/db/types';
import {
  exportHandoverMarkdown,
  exportHandoverJson,
  generatePrintableHtml,
} from '../../../../lib/handoverFilter';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');
    const format = searchParams.get('format') || 'markdown';
    const handoverId = searchParams.get('handoverId') || undefined;

    if (!workspaceId || !isValidWorkspaceId(workspaceId)) {
      return NextResponse.json({ error: 'Invalid or missing workspaceId' }, { status: 400 });
    }

    const storage = getStorage();
    const handover = await storage.getHandover(workspaceId, handoverId);

    if (!handover) {
      return NextResponse.json(
        { error: 'No certified handover found. Generate a handover first.' },
        { status: 404 }
      );
    }

    if (format === 'json') {
      return new NextResponse(exportHandoverJson(handover), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="KnoTrail-Handover-${handover.metadata.projectCode}.json"`,
        },
      });
    }

    if (format === 'html' || format === 'pdf') {
      return new NextResponse(generatePrintableHtml(handover), {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
      });
    }

    // Default: markdown
    return new NextResponse(exportHandoverMarkdown(handover), {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="KnoTrail-Handover-${handover.metadata.projectCode}.md"`,
      },
    });
  } catch (error: any) {
    console.error('API Error in GET /api/handovers/export:', error);
    return NextResponse.json({ error: error?.message || 'Export failed' }, { status: 500 });
  }
}

