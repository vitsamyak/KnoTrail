import { Router, type Request, type Response } from 'express';
import { getStorage } from '../../src/server/db/storage.ts';
import { isValidWorkspaceId } from '../../src/server/db/types.ts';
import { extractDocument, MAX_FILES_PER_BATCH } from '../../src/server/documents/extractor.ts';
import { uploadMiddleware, handleUploadErrors } from '../middleware/upload.ts';
import type { ProjectSource } from '../../src/lib/types.ts';

export const sourcesRouter = Router();

/**
 * GET /api/sources?workspaceId=...
 * Lists all sources in the given workspace.
 */
sourcesRouter.get('/', async (req: Request, res: Response) => {
  try {
    const workspaceId = req.query.workspaceId as string | undefined;

    if (!workspaceId || !isValidWorkspaceId(workspaceId)) {
      res.status(400).json({ error: 'Invalid or missing workspaceId' });
      return;
    }

    const storage = getStorage();
    let project = await storage.getWorkspace(workspaceId);
    if (!project) {
      project = await storage.createWorkspace(workspaceId);
    }

    res.status(200).json({ sources: project.sources, status: 'success' });
  } catch (error: any) {
    console.error('API Error in GET /api/sources:', error?.message || error);
    res.status(500).json({ error: error?.message || 'Internal server error' });
  }
});

/**
 * POST /api/sources
 * Creates a text/notes source in the workspace.
 */
sourcesRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { workspaceId, name, type, content, description } = req.body || {};

    if (!workspaceId || !isValidWorkspaceId(workspaceId)) {
      res.status(400).json({ error: 'Invalid or missing workspaceId' });
      return;
    }

    if (!name || typeof name !== 'string') {
      res.status(400).json({ error: 'Source name is required' });
      return;
    }

    if (!type || typeof type !== 'string') {
      res.status(400).json({ error: 'Source type is required' });
      return;
    }

    const storage = getStorage();
    const result = await storage.addSource(workspaceId, {
      name,
      type: type as any,
      content: typeof content === 'string' ? content : '',
      description: typeof description === 'string' ? description : '',
    });

    res.status(201).json({
      source: result.source,
      finding: result.finding,
      project: result.project,
      status: 'created',
    });
  } catch (error: any) {
    console.error('API Error in POST /api/sources:', error?.message || error);
    res.status(500).json({ error: error?.message || 'Internal server error' });
  }
});

/**
 * POST /api/sources/upload
 * Handles multipart file upload (PDF, TXT, MD) up to 10MB per file and 5 files per batch.
 */
sourcesRouter.post(
  '/upload',
  uploadMiddleware.array('files', MAX_FILES_PER_BATCH),
  handleUploadErrors,
  async (req: Request, res: Response) => {
    try {
      const workspaceId = req.body?.workspaceId as string | undefined;

      if (!workspaceId || !isValidWorkspaceId(workspaceId)) {
        res.status(400).json({
          error: 'Invalid or missing workspaceId. Must be 3-64 alphanumeric/hyphen/underscore characters.',
        });
        return;
      }

      const files = req.files as Express.Multer.File[] | undefined;

      if (!files || files.length === 0) {
        res.status(400).json({ error: 'No files provided for upload.' });
        return;
      }

      if (files.length > MAX_FILES_PER_BATCH) {
        res.status(400).json({
          error: `Upload batch limit exceeded: Maximum ${MAX_FILES_PER_BATCH} files allowed per request.`,
        });
        return;
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
          const buffer = file.buffer;
          const extraction = await extractDocument(file.originalname, buffer, file.mimetype);

          if (!extraction.success) {
            results.push({
              filename: file.originalname,
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
            name: file.originalname,
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
            filename: file.originalname,
            success: true,
            sourceId,
            status: extraction.status,
            pageCount: extraction.pageCount,
            lineCount: extraction.lineCount,
          });
        } catch (fileErr: any) {
          results.push({
            filename: file.originalname,
            success: false,
            error: fileErr?.message || 'Processing failed',
          });
        }
      }

      const updatedProject = await storage.getWorkspace(workspaceId);
      const successCount = results.filter((r) => r.success).length;
      const failureCount = results.length - successCount;

      res.status(200).json({
        workspaceId,
        results,
        successCount,
        failureCount,
        project: updatedProject,
        status: successCount > 0 ? 'success' : 'failed',
      });
    } catch (error: any) {
      console.error('API Error in POST /api/sources/upload:', error?.message || error);
      res.status(500).json({ error: error?.message || 'Internal server error' });
    }
  }
);

/**
 * GET /api/sources/:id?workspaceId=...
 * Retrieves single source metadata.
 */
sourcesRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const workspaceId = req.query.workspaceId as string | undefined;

    if (!workspaceId || !isValidWorkspaceId(workspaceId)) {
      res.status(400).json({ error: 'Invalid or missing workspaceId' });
      return;
    }

    const storage = getStorage();
    const sourceId = String(req.params.id);
    const source = await storage.getSource(workspaceId, sourceId);

    if (!source) {
      res.status(404).json({ error: 'Source not found' });
      return;
    }

    res.status(200).json({ source, status: 'success' });
  } catch (error: any) {
    console.error('API Error in GET /api/sources/:id:', error?.message || error);
    res.status(500).json({ error: error?.message || 'Internal server error' });
  }
});

/**
 * DELETE /api/sources/:id
 * Deletes a source and its uploaded raw document.
 */
sourcesRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    let workspaceId = (req.query.workspaceId || req.body?.workspaceId) as string | undefined;

    if (!workspaceId || !isValidWorkspaceId(workspaceId)) {
      res.status(400).json({ error: 'Invalid or missing workspaceId' });
      return;
    }

    const storage = getStorage();
    const sourceId = String(req.params.id);
    const updatedProject = await storage.deleteSource(workspaceId, sourceId);

    res.status(200).json({
      project: updatedProject,
      deletedSourceId: sourceId,
      status: 'deleted',
    });
  } catch (error: any) {
    console.error('API Error in DELETE /api/sources/:id:', error?.message || error);
    res.status(500).json({ error: error?.message || 'Internal server error' });
  }
});
