import { NextRequest, NextResponse } from 'next/server';
import { getStorage } from '../../../server/db/storage';
import { isValidWorkspaceId } from '../../../server/db/types';
import {
  checkHandoverBlockStatus,
  generateHandoverMarkdown,
  generateHandoverJSON,
  exportHandoverMarkdown,
  exportHandoverJson,
} from '../../../lib/handoverFilter';

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

    const blockStatus = checkHandoverBlockStatus(project.findings, project.handoverCertified, project.conflicts);
    const currentHandover = await storage.getHandover(workspaceId);
    const handovers = await storage.getHandoverHistory(workspaceId);

    const markdown = currentHandover
      ? exportHandoverMarkdown(currentHandover)
      : generateHandoverMarkdown(project);
    const json = currentHandover
      ? currentHandover
      : generateHandoverJSON(project);

    return NextResponse.json({
      workspaceId,
      project,
      blockStatus,
      currentHandover,
      handovers,
      markdown,
      json,
      status: 'success',
    });
  } catch (error: any) {
    console.error('API Error in GET /api/handovers:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
