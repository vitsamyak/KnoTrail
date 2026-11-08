import { NextRequest, NextResponse } from 'next/server';
import { getStorage } from '../../../../server/db/storage';
import { isValidWorkspaceId } from '../../../../server/db/types';
import {
  extractDocument,
  isAllowedFile,
  MAX_FILE_SIZE_BYTES,
  MAX_FILES_PER_BATCH,
} from '../../../../server/documents/extractor';
import type { ProjectSource } from '../../../../lib/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const workspaceId = formData.get('workspaceId') as string | null;

    if (!workspaceId || !isValidWorkspaceId(workspaceId)) {
      return NextResponse.json(
        { error: 'Invalid or missing workspaceId. Must be 3-64 alphanumeric/hyphen/underscore characters.' },
        { status: 400 }
      );
    }

    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided for upload.' }, { status: 400 });
    }

    if (files.length > MAX_FILES_PER_BATCH) {
      return NextResponse.json(
        { error: `Upload batch limit exceeded: Maximum ${MAX_FILES_PER_BATCH} files allowed per request.` },
        { status: 400 }
      );
    }

    const storage = getStorage();
    const results: Array<{
      filename: string;
      success: boolean;
      sourceId?: string;
      error?: string;
      status?: string;
      pageCount?: number;
      lineCount?: number;
    }> = [];

    // Process each file individually so one invalid file does not invalidate the batch
    for (const file of files) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Perform server-side extraction
        const extraction = await extractDocument(file.name, buffer, file.type);

        if (!extraction.success) {
          results.push({
            filename: file.name,
            success: false,
            error: extraction.errorMessage || 'Extraction failed',
            status: extraction.status,
          });
          continue;
        }

        const sourceId = `src-upload-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const fileExt = extraction.fileFormat;

        const newSource: ProjectSource = {
          id: sourceId,
          name: file.name,
          type: 'docs',
          status: extraction.status === 'ERROR' ? 'error' : 'connected',
          lastSync: 'Just now',
          recordCount: extraction.lineCount || extraction.pageCount || 1,
          icon:
            fileExt === 'pdf'
              ? 'picture_as_pdf'
              : fileExt === 'md'
              ? 'article'
              : 'description',
          description: `Uploaded ${fileExt.toUpperCase()} document (${extraction.fileSizeFormatted}) • SHA-256: ${extraction.contentHash.slice(0, 8)}...`,
          privacyLevel: 'LOCAL_READ_ONLY',
          isUploaded: true,
          documentData: {
            fileFormat: extraction.fileFormat,
            mimeType: extraction.mimeType,
            fileSizeBytes: extraction.fileSizeBytes,
            fileSizeFormatted: extraction.fileSizeFormatted,
            contentHash: extraction.contentHash,
            extractedText: extraction.extractedText,
            lineCount: extraction.lineCount,
            pageCount: extraction.pageCount,
            pages: extraction.pages,
            isScannedPdf: extraction.isScannedPdf,
          },
        };

        // Persist source record and raw file without generating synthetic findings (Phase C rule)
        await storage.addUploadedSource(workspaceId, newSource, buffer);

        results.push({
          filename: file.name,
          success: true,
          sourceId,
          status: extraction.status,
          pageCount: extraction.pageCount,
          lineCount: extraction.lineCount,
        });
      } catch (fileErr: any) {
        results.push({
          filename: file.name,
          success: false,
          error: fileErr?.message || 'Processing failed',
        });
      }
    }

    const updatedProject = await storage.getWorkspace(workspaceId);
    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.length - successCount;

    return NextResponse.json({
      workspaceId,
      results,
      successCount,
      failureCount,
      project: updatedProject,
      status: successCount > 0 ? 'success' : 'failed',
    });
  } catch (error: any) {
    console.error('API Error in POST /api/sources/upload:', error);
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}

