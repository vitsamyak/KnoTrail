import multer from 'multer';
import type { Request, Response, NextFunction } from 'express';
import { MAX_FILE_SIZE_BYTES, MAX_FILES_PER_BATCH } from '../../src/server/documents/extractor.ts';

// In-memory buffer storage so files can be processed directly by extractDocument
const storage = multer.memoryStorage();

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: MAX_FILES_PER_BATCH,
  },
});

/**
 * Custom error handler for Multer upload errors to ensure standard JSON error formatting
 */
export function handleUploadErrors(err: any, req: Request, res: Response, next: NextFunction): void {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({
        error: `File size limit exceeded: Maximum 10 MB per document.`,
      });
      return;
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      res.status(400).json({
        error: `Upload batch limit exceeded: Maximum ${MAX_FILES_PER_BATCH} files allowed per request.`,
      });
      return;
    }
    res.status(400).json({ error: `Upload error: ${err.message}` });
    return;
  }

  if (err) {
    res.status(400).json({ error: err.message || 'File upload failed' });
    return;
  }

  next();
}

