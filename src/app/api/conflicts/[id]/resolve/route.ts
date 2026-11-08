import { NextRequest, NextResponse } from 'next/server';
import { repository } from '../../../../../server/db/storage.ts';
import { isValidWorkspaceId } from '../../../../../server/db/types.ts';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const conflictId = params.id;
    const body = await req.json().catch(() => ({}));
    const { workspaceId, chosenFindingId, resolutionNotes, resolvedBy } = body;

    if (!workspaceId || !isValidWorkspaceId(workspaceId)) {
      return NextResponse.json(
        { error: `Invalid or missing workspace ID: "${workspaceId}"` },
        { status: 400 }
      );
    }

    if (!conflictId) {
      return NextResponse.json(
        { error: 'Conflict ID is required' },
        { status: 400 }
      );
    }

    const updatedProject = await repository.resolveConflictRecord(
      workspaceId,
      conflictId,
      chosenFindingId,
      resolutionNotes,
      resolvedBy
    );

    return NextResponse.json({
      success: true,
      conflictId,
      project: updatedProject,
    });
  } catch (err: any) {
    console.error('Error resolving conflict record:', err);
    return NextResponse.json(
      { error: err.message || 'Error resolving conflict record' },
      { status: 500 }
    );
  }
}
