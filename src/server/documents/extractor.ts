import crypto from 'crypto';
import path from 'path';
import { extractText } from 'unpdf';
import type { DocumentPage, ExtractedDocumentData } from '../../lib/types.ts';

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB limit
export const MAX_FILES_PER_BATCH = 5;
export const ALLOWED_EXTENSIONS = ['.pdf', '.txt', '.md', '.markdown'] as const;

export type SupportedExtension = typeof ALLOWED_EXTENSIONS[number];

export interface ExtractionResult {
  success: boolean;
  fileFormat: 'pdf' | 'txt' | 'md';
  originalFilename: string;
  mimeType: string;
  fileSizeBytes: number;
  fileSizeFormatted: string;
  contentHash: string;
  extractedText: string;
  lineCount?: number;
  pageCount?: number;
  pages?: DocumentPage[];
  isScannedPdf?: boolean;
  status: 'PROCESSED' | 'SCANNED_NO_TEXT' | 'ERROR';
  errorMessage?: string;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function getFileExtension(filename: string): string {
  return path.extname(filename || '').toLowerCase();
}

export function isAllowedFile(filename: string): boolean {
  const ext = getFileExtension(filename);
  return (ALLOWED_EXTENSIONS as readonly string[]).includes(ext);
}

/**
 * Checks whether buffer contains binary / null bytes in the first 1024 bytes.
 */
function isBinaryBuffer(buffer: Buffer): boolean {
  const checkLen = Math.min(buffer.length, 1024);
  for (let i = 0; i < checkLen; i++) {
    if (buffer[i] === 0) {
      return true;
    }
  }
  return false;
}

/**
 * Processes and extracts structured text from PDF, Plain Text, or Markdown buffers.
 */
export async function extractDocument(
  filename: string,
  buffer: Buffer,
  declaredMimeType?: string
): Promise<ExtractionResult> {
  const ext = getFileExtension(filename);
  const fileSizeBytes = buffer.length;
  const fileSizeFormatted = formatBytes(fileSizeBytes);
  const contentHash = crypto.createHash('sha256').update(buffer).digest('hex');

  // 1. Enforce size limit
  if (fileSizeBytes > MAX_FILE_SIZE_BYTES) {
    return {
      success: false,
      fileFormat: ext === '.pdf' ? 'pdf' : ext === '.txt' ? 'txt' : 'md',
      originalFilename: filename,
      mimeType: declaredMimeType || 'application/octet-stream',
      fileSizeBytes,
      fileSizeFormatted,
      contentHash,
      extractedText: '',
      status: 'ERROR',
      errorMessage: `File size exceeds 10 MB limit (${fileSizeFormatted})`,
    };
  }

  // 2. Enforce non-empty document
  if (fileSizeBytes === 0) {
    return {
      success: false,
      fileFormat: ext === '.pdf' ? 'pdf' : ext === '.txt' ? 'txt' : 'md',
      originalFilename: filename,
      mimeType: declaredMimeType || 'application/octet-stream',
      fileSizeBytes: 0,
      fileSizeFormatted: '0 B',
      contentHash,
      extractedText: '',
      status: 'ERROR',
      errorMessage: 'Empty document. Uploaded file contains 0 bytes.',
    };
  }

  // 3. Enforce supported file format
  if (!isAllowedFile(filename)) {
    return {
      success: false,
      fileFormat: 'txt',
      originalFilename: filename,
      mimeType: declaredMimeType || 'application/octet-stream',
      fileSizeBytes,
      fileSizeFormatted,
      contentHash,
      extractedText: '',
      status: 'ERROR',
      errorMessage: `Unsupported file extension "${ext}". KnoTrail accepts .pdf, .txt, .md, and .markdown documents.`,
    };
  }

  // 4. PDF Extraction
  if (ext === '.pdf') {
    // Validate PDF magic bytes (%PDF-)
    const header = buffer.slice(0, 5).toString('ascii');
    if (!header.startsWith('%PDF-')) {
      return {
        success: false,
        fileFormat: 'pdf',
        originalFilename: filename,
        mimeType: 'application/pdf',
        fileSizeBytes,
        fileSizeFormatted,
        contentHash,
        extractedText: '',
        status: 'ERROR',
        errorMessage: 'Malformed or invalid PDF: missing standard "%PDF-" header signature.',
      };
    }

    try {
      const uint8 = new Uint8Array(buffer);
      const parsed = await extractText(uint8, { mergePages: false });
      const pageTexts = Array.isArray(parsed.text) ? parsed.text : [parsed.text || ''];
      const totalPages = parsed.totalPages || pageTexts.length || 1;

      const pages: DocumentPage[] = pageTexts.map((txt, idx) => ({
        pageNumber: idx + 1,
        text: txt.trim(),
      }));

      // Check if PDF is image-only / scanned with zero extractable text
      const hasAnyText = pages.some((p) => p.text.length > 0);

      if (!hasAnyText) {
        return {
          success: true,
          fileFormat: 'pdf',
          originalFilename: filename,
          mimeType: 'application/pdf',
          fileSizeBytes,
          fileSizeFormatted,
          contentHash,
          extractedText: '[Notice: Scanned or image-only PDF detected. No embedded text found.]',
          pageCount: totalPages,
          pages,
          isScannedPdf: true,
          status: 'SCANNED_NO_TEXT',
        };
      }

      const combinedText = pages
        .map((p) => `--- Page ${p.pageNumber} ---\n${p.text}`)
        .join('\n\n');

      return {
        success: true,
        fileFormat: 'pdf',
        originalFilename: filename,
        mimeType: 'application/pdf',
        fileSizeBytes,
        fileSizeFormatted,
        contentHash,
        extractedText: combinedText,
        pageCount: totalPages,
        pages,
        isScannedPdf: false,
        status: 'PROCESSED',
      };
    } catch (err: any) {
      return {
        success: false,
        fileFormat: 'pdf',
        originalFilename: filename,
        mimeType: 'application/pdf',
        fileSizeBytes,
        fileSizeFormatted,
        contentHash,
        extractedText: '',
        status: 'ERROR',
        errorMessage: `Failed to parse PDF document: ${err?.message || 'Corrupted internal PDF streams'}`,
      };
    }
  }

  // 5. Plain Text (.txt)
  if (ext === '.txt') {
    if (isBinaryBuffer(buffer)) {
      return {
        success: false,
        fileFormat: 'txt',
        originalFilename: filename,
        mimeType: 'text/plain',
        fileSizeBytes,
        fileSizeFormatted,
        contentHash,
        extractedText: '',
        status: 'ERROR',
        errorMessage: 'Binary file disguised as .txt: invalid null bytes detected in character stream.',
      };
    }

    const text = buffer.toString('utf-8');
    const lines = text.split(/\r?\n/);
    const lineCount = lines.length;

    return {
      success: true,
      fileFormat: 'txt',
      originalFilename: filename,
      mimeType: 'text/plain',
      fileSizeBytes,
      fileSizeFormatted,
      contentHash,
      extractedText: text,
      lineCount,
      status: 'PROCESSED',
    };
  }

  // 6. Markdown (.md, .markdown)
  if (ext === '.md' || ext === '.markdown') {
    if (isBinaryBuffer(buffer)) {
      return {
        success: false,
        fileFormat: 'md',
        originalFilename: filename,
        mimeType: 'text/markdown',
        fileSizeBytes,
        fileSizeFormatted,
        contentHash,
        extractedText: '',
        status: 'ERROR',
        errorMessage: 'Binary file disguised as Markdown: invalid null bytes detected in character stream.',
      };
    }

    const text = buffer.toString('utf-8');
    const lines = text.split(/\r?\n/);
    const lineCount = lines.length;

    return {
      success: true,
      fileFormat: 'md',
      originalFilename: filename,
      mimeType: 'text/markdown',
      fileSizeBytes,
      fileSizeFormatted,
      contentHash,
      extractedText: text,
      lineCount,
      status: 'PROCESSED',
    };
  }

  return {
    success: false,
    fileFormat: 'txt',
    originalFilename: filename,
    mimeType: declaredMimeType || 'application/octet-stream',
    fileSizeBytes,
    fileSizeFormatted,
    contentHash,
    extractedText: '',
    status: 'ERROR',
    errorMessage: `Unsupported file type: ${ext}`,
  };
}
