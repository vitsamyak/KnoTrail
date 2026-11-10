import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../../backend/app.ts';
import { apiClient, ApiClientError, getApiBaseUrl } from '../lib/api-client.ts';
import { getStorage } from '../server/db/storage.ts';
import { generateSecureWorkspaceId } from '../server/db/types.ts';

/**
 * Helper to spin up ephemeral Express server for HTTP tests
 */
async function createTestServer() {
  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'string' ? 0 : address.port;
      const baseUrl = `http://127.0.0.1:${port}`;
      resolve({
        server,
        baseUrl,
        close: () => new Promise((res) => server.close(res)),
      });
    });
  });
}

test('▶ Phase I: Standalone Express Backend & Decoupled Frontend API Suite', async (t) => {
  const origStorageBackend = process.env.STORAGE_BACKEND;
  process.env.STORAGE_BACKEND = 'file';

  const { server, baseUrl, close } = await createTestServer();

  t.after(async () => {
    process.env.STORAGE_BACKEND = origStorageBackend;
    await close();
  });

  // 1. Process Liveness Health Check
  await t.test('1. Health liveness probe (/health/live) returns 200 and uptime', async () => {
    const res = await fetch(`${baseUrl}/health/live`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'ok');
    assert.equal(typeof data.uptime, 'number');
    assert.ok(data.timestamp);
  });

  // 2. Health Readiness Probe with local storage
  await t.test('2. Health readiness probe (/health/ready) returns 200 with file storage', async () => {
    const origBackend = process.env.STORAGE_BACKEND;
    process.env.STORAGE_BACKEND = 'file';
    try {
      const res = await fetch(`${baseUrl}/health/ready`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.status, 'ready');
      assert.equal(data.storage, 'file');
      assert.equal(data.ready, true);
    } finally {
      process.env.STORAGE_BACKEND = origBackend;
    }
  });

  // 3. Health Readiness Probe with unconfigured Supabase
  await t.test('3. Health readiness probe returns 503 degraded when Supabase credentials missing', async () => {
    const origBackend = process.env.STORAGE_BACKEND;
    const origUrl = process.env.SUPABASE_URL;
    const origKey = process.env.SUPABASE_SECRET_KEY;
    const origRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

    process.env.STORAGE_BACKEND = 'supabase';
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SECRET_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    try {
      const res = await fetch(`${baseUrl}/health/ready`);
      assert.equal(res.status, 503);
      const data = await res.json();
      assert.equal(data.status, 'degraded');
      assert.equal(data.ready, false);
      assert.ok(data.error.includes('Supabase configuration missing'));
      // Ensure zero credentials in payload
      assert.equal(data.secretKey, undefined);
      assert.equal(data.url, undefined);
    } finally {
      process.env.STORAGE_BACKEND = origBackend;
      if (origUrl) process.env.SUPABASE_URL = origUrl;
      if (origKey) process.env.SUPABASE_SECRET_KEY = origKey;
      if (origRole) process.env.SUPABASE_SERVICE_ROLE_KEY = origRole;
    }
  });

  // 4. Strict CORS Preflight & Headers
  await t.test('4. Strict CORS middleware permits configured origins and handles OPTIONS preflight', async () => {
    const origOrigins = process.env.CORS_ORIGINS;
    process.env.CORS_ORIGINS = 'https://knotrail.vercel.app,http://localhost:3000';

    try {
      // Preflight OPTIONS from allowed origin
      const preflightRes = await fetch(`${baseUrl}/api/workspaces`, {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://knotrail.vercel.app',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type, X-Workspace-ID',
        },
      });
      assert.equal(preflightRes.status, 204);
      assert.equal(preflightRes.headers.get('access-control-allow-origin'), 'https://knotrail.vercel.app');
      assert.ok(preflightRes.headers.get('access-control-allow-methods').includes('POST'));

      // OPTIONS from disallowed origin
      const disallowedRes = await fetch(`${baseUrl}/api/workspaces`, {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://evil-unauthorized-site.com',
          'Access-Control-Request-Method': 'POST',
        },
      });
      assert.equal(disallowedRes.status, 403);
      assert.equal(disallowedRes.headers.get('access-control-allow-origin'), null);
    } finally {
      process.env.CORS_ORIGINS = origOrigins;
    }
  });

  // 5. Workspaces GET and Auto-initialization
  await t.test('5. GET /api/workspaces auto-initializes clean workspace on first visit', async () => {
    const wsId = generateSecureWorkspaceId();
    const res = await fetch(`${baseUrl}/api/workspaces?workspaceId=${wsId}`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.workspaceId, wsId);
    assert.equal(data.status, 'success');
    assert.ok(data.project);
    assert.ok(data.project.id);
  });

  // 6. Workspaces ID Validation Prevents Traversal & Injection
  await t.test('6. Workspace ID validation rejects path traversal and malformed identifiers', async () => {
    const invalidIds = ['../etc/passwd', 'ws/injection', 'ab', 'a'.repeat(65), 'ws!@#$'];
    for (const badId of invalidIds) {
      const res = await fetch(`${baseUrl}/api/workspaces?workspaceId=${encodeURIComponent(badId)}`);
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.ok(data.error);
    }
  });

  // 7. Workspaces POST Saves Project State
  await t.test('7. POST /api/workspaces saves project state and updates version', async () => {
    const wsId = generateSecureWorkspaceId();
    const storage = getStorage();
    const project = await storage.createWorkspace(wsId);

    const updatedProject = {
      ...project,
      name: 'Render Express Test Project',
      version: 'v1.1',
    };

    const res = await fetch(`${baseUrl}/api/workspaces`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId: wsId, project: updatedProject }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'saved');
    assert.equal(data.project.name, 'Render Express Test Project');
  });

  // 8. Workspaces Reset Endpoint
  await t.test('8. POST /api/workspaces/reset resets workspace to clean default', async () => {
    const wsId = generateSecureWorkspaceId();
    const storage = getStorage();
    await storage.createWorkspace(wsId);

    const res = await fetch(`${baseUrl}/api/workspaces/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId: wsId }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'reset_success');
    assert.ok(data.project);
  });

  // 9. Projects API (GET & PATCH)
  await t.test('9. GET and PATCH /api/projects/:id read and update project metadata', async () => {
    const wsId = generateSecureWorkspaceId();
    const storage = getStorage();
    const project = await storage.createWorkspace(wsId);
    const projId = project.id;

    // GET
    const getRes = await fetch(`${baseUrl}/api/projects/${projId}?workspaceId=${wsId}`);
    assert.equal(getRes.status, 200);
    const getData = await getRes.json();
    assert.equal(getData.project.id, projId);

    // PATCH
    const patchRes = await fetch(`${baseUrl}/api/projects/${projId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: wsId,
        updates: { targetExitDate: '2026-12-31' },
      }),
    });
    assert.equal(patchRes.status, 200);
    const patchData = await patchRes.json();
    assert.equal(patchData.project.targetExitDate, '2026-12-31');
    assert.equal(patchData.status, 'updated');
  });

  // 10. Sources API (GET, POST, DELETE)
  await t.test('10. /api/sources CRUD manages source notes and deletion', async () => {
    const wsId = generateSecureWorkspaceId();
    const storage = getStorage();
    await storage.createWorkspace(wsId);

    // POST add source
    const postRes = await fetch(`${baseUrl}/api/sources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: wsId,
        name: 'Deployment Notes',
        type: 'notes',
        content: 'Express backend deployment instructions.',
        description: 'Server notes',
      }),
    });
    assert.equal(postRes.status, 201);
    const postData = await postRes.json();
    assert.equal(postData.source.name, 'Deployment Notes');
    const sourceId = postData.source.id;

    // GET single source
    const getSingle = await fetch(`${baseUrl}/api/sources/${sourceId}?workspaceId=${wsId}`);
    assert.equal(getSingle.status, 200);
    const singleData = await getSingle.json();
    assert.equal(singleData.source.id, sourceId);

    // DELETE source
    const delRes = await fetch(`${baseUrl}/api/sources/${sourceId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId: wsId }),
    });
    assert.equal(delRes.status, 200);
    const delData = await delRes.json();
    assert.equal(delData.status, 'deleted');
    assert.equal(delData.deletedSourceId, sourceId);
  });

  // 11. Sources Upload API (Multipart Form)
  await t.test('11. POST /api/sources/upload accepts multipart files and extracts content', async () => {
    const wsId = generateSecureWorkspaceId();
    const storage = getStorage();
    await storage.createWorkspace(wsId);

    const formData = new FormData();
    formData.append('workspaceId', wsId);

    const sampleText = 'Project Titan architecture decision: PostgreSQL for durable storage.\nSecond line notes.';
    const textBlob = new Blob([sampleText], { type: 'text/plain' });
    formData.append('files', textBlob, 'architecture.txt');

    const res = await fetch(`${baseUrl}/api/sources/upload`, {
      method: 'POST',
      body: formData,
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.successCount, 1);
    assert.equal(data.failureCount, 0);
    assert.equal(data.results[0].filename, 'architecture.txt');
    assert.equal(data.results[0].success, true);
    assert.equal(data.results[0].lineCount, 2);
  });

  // 12. Upload Limits Enforcement
  await t.test('12. POST /api/sources/upload enforces batch size limit of 5 files', async () => {
    const wsId = generateSecureWorkspaceId();
    const formData = new FormData();
    formData.append('workspaceId', wsId);

    // 6 files exceeds MAX_FILES_PER_BATCH (5)
    for (let i = 1; i <= 6; i++) {
      formData.append('files', new Blob([`Content ${i}`], { type: 'text/plain' }), `doc_${i}.txt`);
    }

    const res = await fetch(`${baseUrl}/api/sources/upload`, {
      method: 'POST',
      body: formData,
    });

    assert.equal(res.status, 400);
    const data = await res.json();
    assert.ok(data.error.includes('batch limit exceeded'));
  });

  // 13. AI Analysis Extract Telemetry & Key Guard
  await t.test('13. /api/analysis/extract enforces Zero Fake AI Invariant when unconfigured', async () => {
    const wsId = generateSecureWorkspaceId();
    const storage = getStorage();
    await storage.createWorkspace(wsId);

    // GET telemetry
    const getRes = await fetch(`${baseUrl}/api/analysis/extract?workspaceId=${wsId}`);
    assert.equal(getRes.status, 200);
    const getData = await getRes.json();
    assert.equal(getData.workspaceId, wsId);
    assert.equal(getData.model, 'gemini-2.5-flash');

    // POST extraction without GEMINI_API_KEY returns 428 Precondition Required
    const origKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    try {
      const postRes = await fetch(`${baseUrl}/api/analysis/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: wsId }),
      });
      assert.equal(postRes.status, 428);
      const postData = await postRes.json();
      assert.equal(postData.configured, false);
      assert.ok(postData.error.includes('GEMINI_API_KEY is not configured'));
    } finally {
      if (origKey) process.env.GEMINI_API_KEY = origKey;
    }
  });

  // 14. Evidence Verification & Conflict Detection
  await t.test('14. POST /api/analysis/verify executes verification and conflict detection', async () => {
    const wsId = generateSecureWorkspaceId();
    const storage = getStorage();
    const project = await storage.createWorkspace(wsId);

    // Seed finding and source
    const sampleFinding = {
      id: 'find-exp-1',
      title: 'PostgreSQL Relational DB Decision',
      claim: 'Use Supabase PostgreSQL for persistent workspaces.',
      type: 'decision',
      status: 'VERIFIED',
      confidence: 95,
      impact: 'HIGH',
      approved: false,
      rejected: false,
      citations: [
        {
          sourceId: 'src-1',
          sourceName: 'Arch Spec',
          quote: 'Use Supabase PostgreSQL for persistent workspaces.',
          location: 'Line 1',
          validity: 'MATCHED',
        },
      ],
    };

    const sampleSource = {
      id: 'src-1',
      name: 'Arch Spec',
      type: 'docs',
      status: 'connected',
      description: 'Spec',
      isUploaded: false,
      documentData: {
        extractedText: 'Use Supabase PostgreSQL for persistent workspaces.',
        lineCount: 1,
      },
    };

    project.findings = [sampleFinding];
    project.sources = [sampleSource];
    await storage.saveProject(wsId, project);

    const res = await fetch(`${baseUrl}/api/analysis/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId: wsId, useAi: false }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(Array.isArray(data.verifiedFindings));
    assert.ok(Array.isArray(data.conflicts));
  });

  // 15. Findings Review Workflow (Edit, Reject, Approve)
  await t.test('15. /api/findings/:id review endpoints enforce edit, reject, and approve rules', async () => {
    const wsId = generateSecureWorkspaceId();
    const storage = getStorage();
    const project = await storage.createWorkspace(wsId);

    const finding = {
      id: 'find-review-test',
      title: 'Review Test Finding',
      summary: 'Initial summary text for review workflow testing.',
      type: 'task',
      status: 'VERIFIED',
      confidence: 90,
      approved: false,
      rejected: false,
      citations: [{ sourceId: 's1', sourceName: 'Doc', quote: 'Initial claim text', validity: 'MATCHED' }],
    };
    project.findings = [finding];
    await storage.saveProject(wsId, project);

    // Edit finding
    const editRes = await fetch(`${baseUrl}/api/findings/find-review-test/edit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: wsId,
        updates: { summary: 'Updated summary text by reviewer' },
        reviewerNotes: 'Corrected terminology',
        reviewerName: 'Sanshrey Sanagar',
      }),
    });
    assert.equal(editRes.status, 200);
    const editData = await editRes.json();
    assert.equal(editData.status, 'edited');
    assert.equal(editData.finding.summary, 'Updated summary text by reviewer');

    // Reject finding
    const rejectRes = await fetch(`${baseUrl}/api/findings/find-review-test/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: wsId,
        reason: 'Outdated task superseded by cloud migration',
        reviewerName: 'Sanshrey Sanagar',
      }),
    });
    assert.equal(rejectRes.status, 200);
    const rejectData = await rejectRes.json();
    assert.equal(rejectData.status, 'rejected');
    assert.equal(rejectData.finding.rejected, true);

    // Approve finding (approved: true)
    const approveRes = await fetch(`${baseUrl}/api/findings/find-review-test/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: wsId,
        reviewerNotes: 'Verified and approved after re-check',
        reviewerName: 'Samyak Gedam',
      }),
    });
    assert.equal(approveRes.status, 200);
    const approveData = await approveRes.json();
    assert.equal(approveData.status, 'approved');
    assert.equal(approveData.finding.approved, true);

    // Audit History GET
    const auditRes = await fetch(`${baseUrl}/api/findings/find-review-test/audit?workspaceId=${wsId}`);
    assert.equal(auditRes.status, 200);
    const auditData = await auditRes.json();
    assert.equal(auditData.findingId, 'find-review-test');
    assert.ok(auditData.count >= 3); // edit, reject, approve
  });

  // 16. Conflict Resolution Endpoints
  await t.test('16. /api/conflicts/:id/resolve resolves cross-document conflicts', async () => {
    const wsId = generateSecureWorkspaceId();
    const storage = getStorage();
    const project = await storage.createWorkspace(wsId);

    const conflict = {
      id: 'conflict-test-1',
      findingIdA: 'fa',
      findingIdB: 'fb',
      sourceIdA: 'sa',
      sourceIdB: 'sb',
      sourceNameA: 'Spec A',
      sourceNameB: 'Spec B',
      quoteA: 'Use SQLite',
      quoteB: 'Use PostgreSQL',
      locationA: 'Line 5',
      locationB: 'Line 10',
      contradictionExplanation: 'Database choice conflict',
      conflictType: 'DIRECT_CONTRADICTION',
      status: 'OPEN',
    };
    project.conflicts = [conflict];
    project.findings = [
      { id: 'fa', title: 'DB', claim: 'Use SQLite', type: 'decision', status: 'CONFLICT', citations: [] },
      { id: 'fb', title: 'DB', claim: 'Use PostgreSQL', type: 'decision', status: 'CONFLICT', citations: [] },
    ];
    await storage.saveProject(wsId, project);

    const res = await fetch(`${baseUrl}/api/conflicts/conflict-test-1/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspaceId: wsId,
        chosenFindingId: 'fb',
        resolutionNotes: 'PostgreSQL chosen for cloud persistence.',
        resolvedBy: 'Lead Architect',
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.conflictId, 'conflict-test-1');
  });

  // 17. Handover Generation, Certification, and Export
  await t.test('17. /api/handovers endpoints generate, certify, and export handovers', async () => {
    const wsId = generateSecureWorkspaceId();
    const storage = getStorage();
    const project = await storage.createWorkspace(wsId);

    // Seed approved finding
    project.findings = [
      {
        id: 'find-handover-1',
        title: 'Backend Architecture',
        summary: 'Render standalone Express backend service.',
        type: 'decision',
        status: 'VERIFIED',
        confidence: 99,
        approved: true,
        rejected: false,
        reviewStatus: 'APPROVED',
        citations: [{ sourceId: 's1', sourceName: 'Doc', quote: 'Standalone backend', validity: 'MATCHED' }],
      },
    ];
    await storage.saveProject(wsId, project);

    // Generate handover
    const genRes = await fetch(`${baseUrl}/api/handovers/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId: wsId, signerName: 'Sanshrey Sanagar' }),
    });
    assert.equal(genRes.status, 200);
    const genData = await genRes.json();
    assert.equal(genData.status, 'generated');
    assert.ok(genData.handover);
    assert.ok(genData.markdown.includes('Render standalone Express backend service.'));

    // Certify handover
    const certRes = await fetch(`${baseUrl}/api/handovers/certify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId: wsId, signerName: 'Sanshrey Sanagar' }),
    });
    assert.equal(certRes.status, 200);
    const certData = await certRes.json();
    assert.equal(certData.status, 'certified');
    assert.equal(certData.handover.certifiedBy, 'Sanshrey Sanagar');

    // Export Markdown
    const exportMd = await fetch(`${baseUrl}/api/handovers/export?workspaceId=${wsId}&format=markdown`);
    assert.equal(exportMd.status, 200);
    assert.ok(exportMd.headers.get('content-type').includes('text/markdown'));
    const mdText = await exportMd.text();
    assert.ok(mdText.includes('Render standalone Express backend service.'));

    // Export JSON
    const exportJson = await fetch(`${baseUrl}/api/handovers/export?workspaceId=${wsId}&format=json`);
    assert.equal(exportJson.status, 200);
    assert.ok(exportJson.headers.get('content-type').includes('application/json'));
    const jsonBody = await exportJson.json();
    assert.ok(jsonBody.metadata);
  });

  // 18. Public Share Link Creation, Lookup, and Revocation
  await t.test('18. /api/handovers/share creates high-entropy token, retrieves read-only data, and revokes', async () => {
    const wsId = generateSecureWorkspaceId();
    const storage = getStorage();
    const project = await storage.createWorkspace(wsId);

    // Seed approved finding and generate certified handover
    project.findings = [
      {
        id: 'find-share-1',
        title: 'Share Test Finding',
        claim: 'Verified handover finding for share test.',
        type: 'decision',
        status: 'VERIFIED',
        confidence: 95,
        approved: true,
        rejected: false,
        citations: [{ sourceId: 's1', sourceName: 'Doc', quote: 'Verified handover', validity: 'MATCHED' }],
      },
    ];
    await storage.saveProject(wsId, project);
    const genResult = await storage.generateAndSaveHandover(wsId, 'Review Lead');
    await storage.certifyHandover(wsId, 'Review Lead');

    // Create share link
    const shareRes = await fetch(`${baseUrl}/api/handovers/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId: wsId, handoverId: genResult.handover.id }),
    });
    assert.equal(shareRes.status, 200);
    const shareData = await shareRes.json();
    assert.equal(shareData.status, 'created');
    const token = shareData.shareRecord.token;
    assert.ok(token.startsWith('kt_share_'));

    // Retrieve via public endpoint /api/handovers/share/:token (zero auth)
    const publicRes = await fetch(`${baseUrl}/api/handovers/share/${token}`);
    assert.equal(publicRes.status, 200);
    const publicData = await publicRes.json();
    assert.equal(publicData.status, 'success');
    assert.ok(publicData.handover);
    assert.ok(publicData.markdown);

    // Revoke share token
    const revokeRes = await fetch(`${baseUrl}/api/handovers/share`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspaceId: wsId, token }),
    });
    assert.equal(revokeRes.status, 200);
    const revokeData = await revokeRes.json();
    assert.equal(revokeData.status, 'revoked');

    // Subsequent retrieval returns 403 Forbidden
    const afterRevokeRes = await fetch(`${baseUrl}/api/handovers/share/${token}`);
    assert.equal(afterRevokeRes.status, 403);
  });

  // 19. Secret Isolation Verification
  await t.test('19. Secret isolation: API responses never leak SUPABASE_SECRET_KEY, SERVICE_ROLE, or GEMINI_API_KEY', async () => {
    const wsId = generateSecureWorkspaceId();
    const endpoints = [
      `/health/live`,
      `/health/ready`,
      `/api/workspaces?workspaceId=${wsId}`,
      `/api/analysis/extract?workspaceId=${wsId}`,
      `/api/handovers?workspaceId=${wsId}`,
    ];

    for (const ep of endpoints) {
      const res = await fetch(`${baseUrl}${ep}`);
      const text = await res.text();
      // Ensure no raw secrets exist in responses
      assert.equal(text.includes('eyJhbGciOi'), false, `Secret JWT found in ${ep}`);
      assert.equal(text.includes('SUPABASE_SECRET_KEY='), false, `Env leak in ${ep}`);
      assert.equal(text.includes('GEMINI_API_KEY='), false, `Env leak in ${ep}`);
    }
  });

  // 20. Centralized Frontend API Client Verification
  await t.test('20. Frontend apiClient correctly normalizes URLs and interfaces with standalone backend', async () => {
    const origEnv = process.env.NEXT_PUBLIC_API_BASE_URL;
    process.env.NEXT_PUBLIC_API_BASE_URL = `${baseUrl}///`; // test trailing slash normalization

    try {
      assert.equal(apiClient.getBaseUrl(), baseUrl);

      const wsId = generateSecureWorkspaceId();
      const wsData = await apiClient.getWorkspace(wsId);
      assert.equal(wsData.workspaceId, wsId);
      assert.equal(wsData.status, 'success');
      assert.ok(wsData.project);

      // Verify ApiClientError wrapping on 404
      await assert.rejects(
        () => apiClient.getProject(wsId, 'non-existent-project-id'),
        (err) => {
          assert.ok(err instanceof ApiClientError);
          assert.equal(err.statusCode, 404);
          return true;
        }
      );
    } finally {
      process.env.NEXT_PUBLIC_API_BASE_URL = origEnv;
    }
  });
});
