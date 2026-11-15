/**
 * Comprehensive Expanded Role-Based Security Test Suite
 * (KnoTrail Round 3 - Improvement 2: Role-Based Security Hardening)
 *
 * Verifies:
 * 1. Manager-only governance:
 *    - Developer CANNOT approve findings (403)
 *    - Developer CANNOT reject findings (403)
 *    - Developer CANNOT generate handovers (403)
 *    - Developer CANNOT delete sources (403)
 *    - Manager CAN approve, reject, generate, and delete (200/201)
 * 2. Legitimate Developer technical contributions:
 *    - Developer CAN create text note sources (201)
 *    - Developer CAN edit findings (200, resets approved state)
 * 3. State tampering protection on POST /api/workspaces:
 *    - Developer submitting tampered handoverCertified / pre-approved findings has security fields reverted
 * 4. External role source data redaction & clearance enforcement:
 *    - External CANNOT modify sources (POST 403, DELETE 403)
 *    - External receives redacted extractedText on confidential sources (GET /api/sources, GET /api/sources/:id)
 *    - Internal server storagePath is stripped for External role
 *    - Legitimate non-confidential source content is readable
 * 5. External role member privacy:
 *    - External caller on GET /api/workspaces/:id/members receives masked email addresses
 * 6. Workspace ID parameter collision protection:
 *    - Contradictory workspace IDs between route parameter and query/body parameter are rejected with HTTP 400
 * 7. Zero-auth public demo stability:
 *    - Public anonymous demo workspaces remain functional without login
 *
 * Governance: CodersInPune Hackathon 2026 - Deploy_or_Die (Samyak Gedam & Sanshrey Sanagar)
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../../backend/app.ts';
import { createDevSessionToken } from '../../backend/middleware/auth.ts';
import { getStorage } from '../server/db/storage.ts';

/**
 * Spins up an ephemeral HTTP server on a random port.
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

test('▶ Improvement 2: Role-Based Security Hardening Suite', async (t) => {
  const origStorageBackend = process.env.STORAGE_BACKEND;
  process.env.STORAGE_BACKEND = 'file';

  const { server, baseUrl, close } = await createTestServer();
  const storage = getStorage();

  t.after(async () => {
    process.env.STORAGE_BACKEND = origStorageBackend;
    await close();
  });

  // Test identities
  const managerUser = { id: 'usr_sec_mgr_' + Date.now(), email: 'manager@knotrail.demo' };
  const developerUser = { id: 'usr_sec_dev_' + Date.now(), email: 'developer@knotrail.demo' };
  const externalUser = { id: 'usr_sec_ext_' + Date.now(), email: 'external@knotrail.demo' };

  const managerToken = createDevSessionToken(managerUser, 3600);
  const developerToken = createDevSessionToken(developerUser, 3600);
  const externalToken = createDevSessionToken(externalUser, 3600);

  // Setup a protected workspace with members
  const wsId = 'ws_proj_harden_' + Date.now();
  await storage.createWorkspace(wsId);
  await storage.setWorkspaceProtected(wsId, true, managerUser.id);
  await storage.addWorkspaceMember(wsId, { userId: managerUser.id, email: managerUser.email, role: 'MANAGER' });
  await storage.addWorkspaceMember(wsId, { userId: developerUser.id, email: developerUser.email, role: 'DEVELOPER' });
  await storage.addWorkspaceMember(wsId, { userId: externalUser.id, email: externalUser.email, role: 'EXTERNAL' });

  // Add initial test finding and sources to workspace
  const testProject = await storage.getWorkspace(wsId);
  testProject.findings = [
    {
      id: 'find-sec-1',
      title: 'PostgreSQL Local Collision Mitigation',
      summary: 'Switched local port to 5433 to avoid port collisions.',
      type: 'decision',
      category: 'architecture',
      status: 'VERIFIED',
      confidence: 95,
      approved: false,
      rejected: false,
      citations: [
        {
          id: 'cit-sec-1',
          sourceId: 'src-sec-conf',
          sourceName: 'Database Infrastructure Secrets',
          file: 'infra/database.env',
          lineRange: '1-4',
          author: 'DevOps Lead',
          timestamp: '2026-11-14T10:00:00Z',
          snippet: 'DB_CONNECTION_STRING=postgres://app_user:secret_pass@prod-cluster:5432/knotrail',
          quote: 'DB_CONNECTION_STRING=postgres://app_user:secret_pass@prod-cluster:5432/knotrail',
          contentHash: 'sha256:abc123456789',
          clearanceTier: 'CONFIDENTIAL',
          confidence: 95,
        },
      ],
      createdDate: new Date().toISOString(),
      owner: 'Samyak Gedam',
      urgency: 'high',
    },
    {
      id: 'find-sec-2',
      title: 'Open Source UI Framework',
      summary: 'Adopted React 18 and Tailwind CSS for frontend.',
      type: 'decision',
      category: 'frontend',
      status: 'VERIFIED',
      confidence: 90,
      approved: false,
      rejected: false,
      citations: [
        {
          id: 'cit-sec-2',
          sourceId: 'src-sec-pub',
          sourceName: 'Architecture Overview',
          file: 'docs/ARCHITECTURE.md',
          lineRange: '10-15',
          author: 'Sanshrey Sanagar',
          timestamp: '2026-11-14T11:00:00Z',
          snippet: 'React 18 Single Page Application architecture',
          quote: 'React 18 Single Page Application architecture',
          contentHash: 'sha256:def987654321',
          clearanceTier: 'PUBLIC',
          confidence: 90,
        },
      ],
      createdDate: new Date().toISOString(),
      owner: 'Sanshrey Sanagar',
      urgency: 'medium',
    },
  ];

  testProject.sources = [
    {
      id: 'src-sec-conf',
      name: 'secrets.env',
      type: 'docs',
      status: 'connected',
      lastSync: new Date().toISOString(),
      recordCount: 4,
      icon: 'description',
      description: 'CONFIDENTIAL database credentials and infrastructure secrets',
      privacyLevel: 'LOCAL_READ_ONLY',
      isUploaded: true,
      documentData: {
        fileFormat: 'env',
        extractedText: 'DB_CONNECTION_STRING=postgres://app_user:secret_pass@prod-cluster:5432/knotrail\nSECRET_KEY=prod_super_secret',
        storagePath: '/var/data/knotrail/secrets.env',
      },
    },
    {
      id: 'src-sec-pub',
      name: 'ARCHITECTURE.md',
      type: 'docs',
      status: 'connected',
      lastSync: new Date().toISOString(),
      recordCount: 20,
      icon: 'article',
      description: 'Public architectural documentation and system overview',
      privacyLevel: 'LOCAL_READ_ONLY',
      isUploaded: true,
      documentData: {
        fileFormat: 'md',
        extractedText: '# KnoTrail System Architecture\nPublic frontend and backend communication specification.',
        storagePath: '/var/data/knotrail/ARCHITECTURE.md',
      },
    },
  ];

  await storage.saveProject(wsId, testProject);

  // --------------------------------------------------------------------------
  // 1. Manager-Only Governance: Finding Approval & Rejection
  // --------------------------------------------------------------------------
  await t.test('1. Developer CANNOT approve findings (HTTP 403 Forbidden)', async () => {
    const res = await fetch(`${baseUrl}/api/findings/find-sec-2/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${developerToken}`,
      },
      body: JSON.stringify({ workspaceId: wsId, reviewerNotes: 'Developer attempting approval' }),
    });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.match(body.error, /Forbidden.*MANAGER/);
  });

  await t.test('2. Developer CANNOT reject findings (HTTP 403 Forbidden)', async () => {
    const res = await fetch(`${baseUrl}/api/findings/find-sec-2/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${developerToken}`,
      },
      body: JSON.stringify({ workspaceId: wsId, reason: 'Developer attempting rejection' }),
    });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.match(body.error, /Forbidden.*MANAGER/);
  });

  await t.test('3. Manager CAN approve finding (HTTP 200 OK)', async () => {
    const res = await fetch(`${baseUrl}/api/findings/find-sec-2/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`,
      },
      body: JSON.stringify({ workspaceId: wsId, reviewerNotes: 'Manager sign-off' }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'approved');
    assert.equal(body.finding.approved, true);
  });

  // --------------------------------------------------------------------------
  // 2. Manager-Only Governance: Handover Package Generation
  // --------------------------------------------------------------------------
  await t.test('4. Developer CANNOT generate handover packages (HTTP 403 Forbidden)', async () => {
    const res = await fetch(`${baseUrl}/api/handovers/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${developerToken}`,
      },
      body: JSON.stringify({ workspaceId: wsId, signerName: 'Developer' }),
    });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.match(body.error, /Forbidden.*MANAGER/);
  });

  await t.test('5. Manager CAN generate handover packages (HTTP 200 OK)', async () => {
    // Approve remaining finding find-sec-1 so mandatory human review invariant is satisfied
    await fetch(`${baseUrl}/api/findings/find-sec-1/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`,
      },
      body: JSON.stringify({ workspaceId: wsId, reviewerNotes: 'Manager approves finding 1' }),
    });

    const res = await fetch(`${baseUrl}/api/handovers/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`,
      },
      body: JSON.stringify({ workspaceId: wsId, signerName: 'Project Manager' }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'generated');
    assert.ok(body.handover);
  });

  // --------------------------------------------------------------------------
  // 3. Manager-Only Governance: Source Deletion
  // --------------------------------------------------------------------------
  await t.test('6. Developer CANNOT delete sources (HTTP 403 Forbidden)', async () => {
    const res = await fetch(`${baseUrl}/api/sources/src-sec-pub`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${developerToken}`,
      },
      body: JSON.stringify({ workspaceId: wsId }),
    });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.match(body.error, /Forbidden.*MANAGER/);
  });

  // --------------------------------------------------------------------------
  // 4. Legitimate Developer Technical Contributions
  // --------------------------------------------------------------------------
  await t.test('7. Developer CAN contribute new source notes (HTTP 201 Created)', async () => {
    const res = await fetch(`${baseUrl}/api/sources`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${developerToken}`,
      },
      body: JSON.stringify({
        workspaceId: wsId,
        name: 'Technical Architecture Notes',
        type: 'notes',
        content: 'Implemented Redis cache layer for high-throughput queries.',
        description: 'Developer infrastructure design note.',
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.status, 'created');
    assert.equal(body.source.name, 'Technical Architecture Notes');
  });

  await t.test('8. Developer CAN edit finding content, and edits automatically reset approval', async () => {
    const res = await fetch(`${baseUrl}/api/findings/find-sec-2/edit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${developerToken}`,
      },
      body: JSON.stringify({
        workspaceId: wsId,
        updates: { summary: 'Adopted React 18 and Tailwind CSS with custom theme variables.' },
        reviewerNotes: 'Clarified custom theme tokens',
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'edited');
    // Approval was reset to false upon edit
    assert.equal(body.finding.approved, false);
  });

  // --------------------------------------------------------------------------
  // 5. State Tampering Protection on POST /api/workspaces
  // --------------------------------------------------------------------------
  await t.test('9. Developer CANNOT overwrite handover certification or pre-approve findings via POST /api/workspaces', async () => {
    // Create an uncertified workspace with an unapproved finding
    const uncertWsId = 'ws_tamper_test_' + Date.now();
    await storage.createWorkspace(uncertWsId, {
      id: uncertWsId,
      name: 'Tamper Prevention Test',
      description: 'Workspace for state tampering verification',
      handoverCertified: false,
      certificationHash: '',
      findings: [
        {
          id: 'find-tamper-1',
          title: 'Unapproved Finding',
          summary: 'Original unreviewed finding summary',
          type: 'decision',
          category: 'backend',
          status: 'VERIFIED',
          confidence: 85,
          approved: false,
          rejected: false,
          citations: [],
          createdDate: new Date().toISOString(),
          owner: 'Developer',
          urgency: 'low',
        },
      ],
      sources: testProject.sources,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await storage.setWorkspaceProtected(uncertWsId, true, managerUser.id);
    await storage.addWorkspaceMember(uncertWsId, { userId: developerUser.id, email: developerUser.email, role: 'DEVELOPER' });

    // Developer attempts to submit an unearned certified state with pre-approved confidential finding
    const maliciousProject = {
      name: 'Tampered Project',
      handoverCertified: true,
      certificationHash: 'forged_cert_hash_999',
      findings: [
        {
          id: 'find-tamper-1',
          approved: true, // Attempt to mark unapproved finding as approved
          rejected: false,
          title: 'Tampered Title',
        },
      ],
    };

    const res = await fetch(`${baseUrl}/api/workspaces`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${developerToken}`,
      },
      body: JSON.stringify({
        workspaceId: uncertWsId,
        project: maliciousProject,
      }),
    });

    assert.equal(res.status, 200);
    const data = await res.json();

    // Verify server reverted the tampered security fields
    assert.equal(data.project.handoverCertified, false, 'handoverCertified must be reverted');
    assert.equal(data.project.certificationHash, '', 'certificationHash must be reverted');
    const find1 = data.project.findings.find((f) => f.id === 'find-tamper-1');
    assert.equal(find1.approved, false, 'Pre-approved finding must be reverted to existing false');
  });

  // --------------------------------------------------------------------------
  // 6. External Role Source Data Redaction & Clearance Controls
  // --------------------------------------------------------------------------
  await t.test('10. External CANNOT modify sources (POST and DELETE return HTTP 403 Forbidden)', async () => {
    // External tries POST /api/sources
    const postRes = await fetch(`${baseUrl}/api/sources`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${externalToken}`,
      },
      body: JSON.stringify({ workspaceId: wsId, name: 'Ext Note', type: 'notes', content: 'test' }),
    });
    assert.equal(postRes.status, 403);

    // External tries DELETE /api/sources/:id
    const delRes = await fetch(`${baseUrl}/api/sources/src-sec-pub`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${externalToken}`,
      },
      body: JSON.stringify({ workspaceId: wsId }),
    });
    assert.equal(delRes.status, 403);
  });

  await t.test('11. External role querying GET /api/sources receives redacted confidential content and stripped storage paths', async () => {
    const res = await fetch(`${baseUrl}/api/sources?workspaceId=${wsId}`, {
      headers: {
        Authorization: `Bearer ${externalToken}`,
      },
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'success');

    // 1. Confidential source is redacted
    const confSource = data.sources.find((s) => s.id === 'src-sec-conf');
    assert.ok(confSource, 'Confidential source record must be listed');
    assert.match(confSource.documentData.extractedText, /REDACTED/, 'Confidential text must be redacted');
    assert.doesNotMatch(JSON.stringify(confSource), /secret_pass/, 'Secret password must never leak');
    assert.equal(confSource.documentData.storagePath, undefined, 'Physical storagePath must be stripped');

    // 2. Public source is readable without redaction, but storagePath is stripped
    const pubSource = data.sources.find((s) => s.id === 'src-sec-pub');
    assert.ok(pubSource);
    assert.match(pubSource.documentData.extractedText, /KnoTrail System Architecture/);
    assert.equal(pubSource.documentData.storagePath, undefined, 'storagePath must be stripped on public source');
  });

  await t.test('12. External role querying single confidential source GET /api/sources/:id is redacted', async () => {
    const res = await fetch(`${baseUrl}/api/sources/src-sec-conf?workspaceId=${wsId}`, {
      headers: {
        Authorization: `Bearer ${externalToken}`,
      },
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.match(data.source.documentData.extractedText, /REDACTED/);
    assert.doesNotMatch(JSON.stringify(data), /secret_pass/);
    assert.equal(data.source.documentData.storagePath, undefined);
  });

  // --------------------------------------------------------------------------
  // 7. External Member Privacy Protection
  // --------------------------------------------------------------------------
  await t.test('13. External role querying GET /api/workspaces/:id/members receives masked email addresses', async () => {
    const res = await fetch(`${baseUrl}/api/workspaces/${wsId}/members`, {
      headers: {
        Authorization: `Bearer ${externalToken}`,
      },
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'success');

    for (const member of data.members) {
      assert.match(member.email, /\*{3}/, `Email "${member.email}" must be masked for External role`);
      assert.doesNotMatch(member.email, /^manager@knotrail\.demo$/, 'Raw manager email must not be exposed');
    }
  });

  await t.test('14. Manager querying GET /api/workspaces/:id/members receives unmasked email addresses', async () => {
    const res = await fetch(`${baseUrl}/api/workspaces/${wsId}/members`, {
      headers: {
        Authorization: `Bearer ${managerToken}`,
      },
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    const mgrMember = data.members.find((m) => m.userId === managerUser.id);
    assert.equal(mgrMember.email, 'manager@knotrail.demo');
  });

  // --------------------------------------------------------------------------
  // 8. Parameter Collision & Pollution Defense
  // --------------------------------------------------------------------------
  await t.test('15. Contradictory workspace IDs between route parameter and query parameter are rejected with HTTP 400', async () => {
    const res = await fetch(`${baseUrl}/api/workspaces/${wsId}/members?workspaceId=ws_other_rogue_999`, {
      headers: {
        Authorization: `Bearer ${managerToken}`,
      },
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /collision|Contradictory/i);
  });

  await t.test('16. Contradictory workspace IDs between query and body parameter are rejected with HTTP 400', async () => {
    const res = await fetch(`${baseUrl}/api/sources?workspaceId=${wsId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${developerToken}`,
      },
      body: JSON.stringify({
        workspaceId: 'ws_different_body_id',
        name: 'Collision Note',
        type: 'notes',
        content: 'test',
      }),
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.match(body.error, /collision|Contradictory/i);
  });

  // --------------------------------------------------------------------------
  // 9. Manager Retains Legitimate Source Deletion
  // --------------------------------------------------------------------------
  await t.test('17. Manager CAN delete sources (HTTP 200 OK)', async () => {
    const res = await fetch(`${baseUrl}/api/sources/src-sec-pub`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`,
      },
      body: JSON.stringify({ workspaceId: wsId }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'deleted');
  });

  // --------------------------------------------------------------------------
  // 10. Public Zero-Auth Demo Functionality Preservation
  // --------------------------------------------------------------------------
  await t.test('18. Anonymous public demo workspace remains functional without credentials', async () => {
    const demoWsId = 'ws_anon_public_demo_' + Date.now();
    const res = await fetch(`${baseUrl}/api/workspaces?workspaceId=${demoWsId}`);

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'success');
    assert.equal(body.isProtected, false);
    assert.equal(body.workspaceId, demoWsId);
  });
});
