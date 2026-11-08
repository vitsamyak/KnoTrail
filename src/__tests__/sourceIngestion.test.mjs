import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { extractDocument, formatBytes, isAllowedFile, MAX_FILE_SIZE_BYTES } from '../server/documents/extractor.ts';
import { DurableFileRepository } from '../server/db/storage.ts';

const TEST_STORAGE_DIR = path.join(process.cwd(), '.data', 'test-source-workspaces');
const TEST_UPLOAD_DIR = path.join(process.cwd(), '.data', 'test-source-uploads');

// Valid minimal PDF buffer generator
function createValidPdfBuffer(text = 'KnoTrail Architecture Handover Document Page 1') {
  return Buffer.from(`%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length ${text.length + 30} >> stream
BT
/F1 18 Tf
50 720 Td
(${text}) Tj
ET
endstream endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000350 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
430
%%EOF`);
}

// Scanned / empty-page PDF buffer generator (has page object but no text drawing stream)
function createScannedPdfBuffer() {
  return Buffer.from(`%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >> endobj
xref
0 4
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
trailer << /Size 4 /Root 1 0 R >>
startxref
200
%%EOF`);
}

function cleanupDirs() {
  if (fs.existsSync(TEST_STORAGE_DIR)) {
    fs.rmSync(TEST_STORAGE_DIR, { recursive: true, force: true });
  }
  if (fs.existsSync(TEST_UPLOAD_DIR)) {
    fs.rmSync(TEST_UPLOAD_DIR, { recursive: true, force: true });
  }
}

test('Phase C: Real Document Source Ingestion & Extraction Test Suite', async (t) => {
  t.beforeEach(cleanupDirs);
  t.after(cleanupDirs);

  await t.test('1. Valid TXT upload & extraction with accurate line numbers', async () => {
    const filename = 'incident-runbook.txt';
    const content = 'Step 1: Check Kafka lag\nStep 2: Restart consumers\nStep 3: Verify billing reconciliation';
    const buffer = Buffer.from(content, 'utf-8');

    const result = await extractDocument(filename, buffer, 'text/plain');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.fileFormat, 'txt');
    assert.strictEqual(result.lineCount, 3, 'Must count 3 lines');
    assert.strictEqual(result.extractedText, content);
    assert.ok(result.contentHash.length === 64, 'Must compute SHA-256');
    assert.strictEqual(result.status, 'PROCESSED');
  });

  await t.test('2. Valid Markdown upload & extraction preserving headings and structure', async () => {
    const filename = 'ADR-042-authentication.md';
    const content = '# ADR-042: Internal JWT Authority\n\n## Status\nAccepted\n\n## Decision\nUse Ed25519 asymmetric cryptography.';
    const buffer = Buffer.from(content, 'utf-8');

    const result = await extractDocument(filename, buffer, 'text/markdown');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.fileFormat, 'md');
    assert.ok(result.lineCount >= 7, 'Must count lines');
    assert.ok(result.extractedText.includes('# ADR-042: Internal JWT Authority'));
    assert.ok(result.extractedText.includes('Use Ed25519 asymmetric cryptography.'));
    assert.strictEqual(result.status, 'PROCESSED');
  });

  await t.test('3 & 11. Valid PDF upload & extraction with accurate page references', async () => {
    const filename = 'system_topology_v3.pdf';
    const expectedText = 'Production Cluster Failover Topology 2026';
    const buffer = createValidPdfBuffer(expectedText);

    const result = await extractDocument(filename, buffer, 'application/pdf');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.fileFormat, 'pdf');
    assert.strictEqual(result.pageCount, 1);
    assert.ok(result.pages && result.pages.length === 1);
    assert.strictEqual(result.pages[0].pageNumber, 1, 'Page number must be 1-indexed');
    assert.ok(result.pages[0].text.includes(expectedText), 'Must extract page text');
    assert.strictEqual(result.isScannedPdf, false);
    assert.strictEqual(result.status, 'PROCESSED');
  });

  await t.test('4. Scanned / image-only PDF detection without failure', async () => {
    const filename = 'scanned_receipt.pdf';
    const buffer = createScannedPdfBuffer();

    const result = await extractDocument(filename, buffer, 'application/pdf');

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.isScannedPdf, true);
    assert.strictEqual(result.status, 'SCANNED_NO_TEXT');
    assert.ok(result.extractedText.includes('Scanned or image-only PDF detected'));
  });

  await t.test('5. Unsupported file extension rejection', async () => {
    const filename = 'payload.exe';
    const buffer = Buffer.from('binary-code');

    const result = await extractDocument(filename, buffer);
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.status, 'ERROR');
    assert.ok(result.errorMessage.includes('Unsupported file extension'));
  });

  await t.test('6. Malformed PDF rejection (invalid header)', async () => {
    const filename = 'corrupted.pdf';
    const buffer = Buffer.from('THIS IS NOT A VALID PDF HEADER');

    const result = await extractDocument(filename, buffer);
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.status, 'ERROR');
    assert.ok(result.errorMessage.includes('missing standard "%PDF-" header'));
  });

  await t.test('7. Empty document handling (0 bytes)', async () => {
    const filename = 'empty.txt';
    const buffer = Buffer.alloc(0);

    const result = await extractDocument(filename, buffer);
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.status, 'ERROR');
    assert.ok(result.errorMessage.includes('Empty document'));
  });

  await t.test('8. File-size limit enforcement (> 10 MB)', async () => {
    const filename = 'massive.txt';
    // Allocate 10 MB + 100 bytes
    const buffer = Buffer.alloc(MAX_FILE_SIZE_BYTES + 100);

    const result = await extractDocument(filename, buffer);
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.status, 'ERROR');
    assert.ok(result.errorMessage.includes('File size exceeds 10 MB limit'));
  });

  await t.test('9 & 10. Document persistence & workspace isolation in storage repository', async () => {
    const repo = new DurableFileRepository(TEST_STORAGE_DIR, TEST_UPLOAD_DIR);
    const workspaceA = 'ws_ingest_alpha';
    const workspaceB = 'ws_ingest_beta';

    await repo.createWorkspace(workspaceA);
    await repo.createWorkspace(workspaceB);

    const sourceContent = '# Alpha Confidential Architecture\nLine 2 details';
    const bufferA = Buffer.from(sourceContent, 'utf-8');
    const extractionA = await extractDocument('alpha_architecture.md', bufferA);

    const sourceA = {
      id: 'src-upload-alpha-001',
      name: 'alpha_architecture.md',
      type: 'docs',
      status: 'connected',
      lastSync: 'Just now',
      recordCount: extractionA.lineCount || 1,
      icon: 'article',
      description: 'Uploaded Markdown document (200 B)',
      privacyLevel: 'LOCAL_READ_ONLY',
      isUploaded: true,
      documentData: {
        fileFormat: extractionA.fileFormat,
        mimeType: extractionA.mimeType,
        fileSizeBytes: extractionA.fileSizeBytes,
        fileSizeFormatted: extractionA.fileSizeFormatted,
        contentHash: extractionA.contentHash,
        extractedText: extractionA.extractedText,
        lineCount: extractionA.lineCount,
      },
    };

    // Add uploaded source to Workspace A
    await repo.addUploadedSource(workspaceA, sourceA, bufferA);

    // Verify raw file exists in safe directory
    const expectedFilePath = path.join(TEST_UPLOAD_DIR, workspaceA, 'src-upload-alpha-001.md');
    assert.ok(fs.existsSync(expectedFilePath), 'Raw file must be saved in workspace upload folder');

    // Read afresh from new repository instance
    const freshRepo = new DurableFileRepository(TEST_STORAGE_DIR, TEST_UPLOAD_DIR);
    const refreshedProjectA = await freshRepo.getWorkspace(workspaceA);
    const refreshedProjectB = await freshRepo.getWorkspace(workspaceB);

    // Workspace A must have the uploaded source
    const persistedSourceA = refreshedProjectA.sources.find((s) => s.id === 'src-upload-alpha-001');
    assert.ok(persistedSourceA, 'Uploaded source must persist in Workspace A');
    assert.strictEqual(persistedSourceA.documentData.extractedText, sourceContent);
    assert.strictEqual(persistedSourceA.isUploaded, true);

    // Workspace B must NOT have the uploaded source (Strict Isolation)
    const sourceInB = refreshedProjectB.sources.find((s) => s.id === 'src-upload-alpha-001');
    assert.strictEqual(sourceInB, undefined, 'Workspace B must NOT contain Workspace A uploaded files');
  });

  await t.test('12. Zero fake AI extraction guarantee (findings count unaffected by upload)', async () => {
    const repo = new DurableFileRepository(TEST_STORAGE_DIR, TEST_UPLOAD_DIR);
    const workspaceId = 'ws_no_fake_ai';
    const initialProject = await repo.createWorkspace(workspaceId);
    const initialFindingsCount = initialProject.findings.length;

    const buffer = Buffer.from('Notes on redis cache TTL', 'utf-8');
    const extraction = await extractDocument('redis_notes.txt', buffer);

    const source = {
      id: 'src-upload-real-001',
      name: 'redis_notes.txt',
      type: 'notes',
      status: 'connected',
      lastSync: 'Just now',
      recordCount: 1,
      icon: 'description',
      description: 'Uploaded notes',
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
      },
    };

    await repo.addUploadedSource(workspaceId, source, buffer);

    const updated = await repo.getWorkspace(workspaceId);
    assert.strictEqual(
      updated.findings.length,
      initialFindingsCount,
      'Uploading a source must NOT invent synthetic decisions, tasks, or risks'
    );
  });

  await t.test('13 & 14. Source retrieval and deletion with raw file cleanup', async () => {
    const repo = new DurableFileRepository(TEST_STORAGE_DIR, TEST_UPLOAD_DIR);
    const workspaceId = 'ws_delete_test';
    await repo.createWorkspace(workspaceId);

    const buffer = Buffer.from('Temporary scratch doc', 'utf-8');
    const extraction = await extractDocument('scratch.txt', buffer);

    const source = {
      id: 'src-to-delete',
      name: 'scratch.txt',
      type: 'docs',
      status: 'connected',
      lastSync: 'Just now',
      recordCount: 1,
      icon: 'description',
      description: 'Scratch',
      privacyLevel: 'LOCAL_READ_ONLY',
      isUploaded: true,
      documentData: {
        fileFormat: extraction.fileFormat,
        mimeType: extraction.mimeType,
        fileSizeBytes: extraction.fileSizeBytes,
        fileSizeFormatted: extraction.fileSizeFormatted,
        contentHash: extraction.contentHash,
        extractedText: extraction.extractedText,
        lineCount: 1,
      },
    };

    await repo.addUploadedSource(workspaceId, source, buffer);

    // Retrieve single source
    const retrieved = await repo.getSource(workspaceId, 'src-to-delete');
    assert.ok(retrieved);
    assert.strictEqual(retrieved.name, 'scratch.txt');

    // Confirm physical file exists
    const filePath = retrieved.documentData.storagePath;
    assert.ok(filePath && fs.existsSync(filePath), 'Physical file must exist');

    // Delete source
    const afterDelete = await repo.deleteSource(workspaceId, 'src-to-delete');
    assert.strictEqual(afterDelete.sources.some((s) => s.id === 'src-to-delete'), false);
    assert.strictEqual(fs.existsSync(filePath), false, 'Physical file must be unlinked upon deletion');
  });
});
