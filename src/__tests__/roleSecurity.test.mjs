import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../../backend/app.ts';
import { createDevSessionToken } from '../../backend/middleware/auth.ts';
import { getStorage } from '../server/db/storage.ts';

/**
 * Ephemeral Express test server helper
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

test('▶ Phase 1: Server-Verified Role-Based Security & Access Control Suite', async (t) => {
  const origStorageBackend = process.env.STORAGE_BACKEND;
  process.env.STORAGE_BACKEND = 'file';

  const { server, baseUrl, close } = await createTestServer();
  const storage = getStorage();

  t.after(async () => {
    process.env.STORAGE_BACKEND = origStorageBackend;
    await close();
  });

  // Test identities
  const managerUser = { id: 'usr_mgr_test', email: 'manager@knotrail.local' };
  const developerUser = { id: 'usr_dev_test', email: 'developer@knotrail.local' };
  const externalUser = { id: 'usr_ext_test', email: 'external@knotrail.local' };
  const rogueUser = { id: 'usr_rogue_test', email: 'rogue@knotrail.local' };

  const managerToken = createDevSessionToken(managerUser, 3600);
  const developerToken = createDevSessionToken(developerUser, 3600);
  const externalToken = createDevSessionToken(externalUser, 3600);
  const rogueToken = createDevSessionToken(rogueUser, 3600);

  // Helper to setup a protected workspace with members and sample findings
  const wsId = 'ws_proj_sec_' + Date.now();
  await storage.createWorkspace(wsId);
  await storage.setWorkspaceProtected(wsId, true, managerUser.id);
  await storage.addWorkspaceMember(wsId, { userId: managerUser.id, email: managerUser.email, role: 'MANAGER' });
  await storage.addWorkspaceMember(wsId, { userId: developerUser.id, email: developerUser.email, role: 'DEVELOPER' });
  await storage.addWorkspaceMember(wsId, { userId: externalUser.id, email: externalUser.email, role: 'EXTERNAL' });

  // Add a sample finding with CONFIDENTIAL clearance citation
  const sampleProject = await storage.getWorkspace(wsId);
  sampleProject.findings = [
    {
      id: 'f-confidential-1',
      title: 'Restricted Security Architecture Finding',
      summary: 'Critical internal access details and database secrets.',
      category: 'DECISION',
      status: 'VERIFIED',
      claimStatus: 'VERIFIED',
      approved: true,
      rejected: false,
      reviewerNotes: 'CONFIDENTIAL: Internal auditor review notes only.',
      citations: [
        {
          id: 'cit-conf-1',
          sourceId: 'src-1',
          snippet: 'DB_CONNECTION_STRING=postgres://prod-db...',
          quote: 'DB_CONNECTION_STRING=postgres://prod-db...',
          file: 'infra/secrets.env',
          lineRange: '1-3',
          author: 'DevOps Lead',
          clearanceTier: 'CONFIDENTIAL',
          validity: 'MATCHED',
        },
      ],
    },
    {
      id: 'f-public-1',
      title: 'General Project Milestone',
      summary: 'The project reached Phase 1 release milestone.',
      category: 'DECISION',
      status: 'VERIFIED',
      claimStatus: 'VERIFIED',
      approved: true,
      rejected: false,
      citations: [
        {
          id: 'cit-pub-1',
          sourceId: 'src-2',
          snippet: 'Phase 1 completed on time.',
          quote: 'Phase 1 completed on time.',
          file: 'README.md',
          lineRange: '10-12',
          clearanceTier: 'INTERNAL',
          validity: 'MATCHED',
        },
      ],
    },
  ];
  await storage.saveProject(wsId, sampleProject);

  // 1. Role Header Spoofing Prevention
  await t.test('1. Role header spoofing: client sending X-KnoTrail-Role: MANAGER on Developer token is rejected with 403', async () => {
    const res = await fetch(`${baseUrl}/api/handovers/certify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${developerToken}`,
        'X-KnoTrail-Role': 'MANAGER', // Malicious client header tampering attempt
      },
      body: JSON.stringify({ workspaceId: wsId, signerName: 'Attacker' }),
    });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.match(body.error, /Forbidden: Action requires one of \[MANAGER\]/);
  });

  // 2. Expired Token Rejection
  await t.test('2. Expired token rejection: kt_hmac with exp in the past is rejected with 401', async () => {
    const expiredToken = createDevSessionToken(managerUser, -60); // Expired 60s ago
    const res = await fetch(`${baseUrl}/api/workspaces?workspaceId=${wsId}`, {
      headers: {
        Authorization: `Bearer ${expiredToken}`,
      },
    });

    assert.equal(res.status, 401);
    const body = await res.json();
    assert.match(body.error, /expired/i);
  });

  // 3. Forged HMAC Signature Rejection
  await t.test('3. Forged HMAC signature rejection: tampered token payload or signature rejected with 401', async () => {
    const parts = managerToken.split('.');
    const tamperedToken = `${parts[0]}.${parts[1]}.${parts[2]}.TAMPERED_SIG_12345`;

    const res = await fetch(`${baseUrl}/api/workspaces?workspaceId=${wsId}`, {
      headers: {
        Authorization: `Bearer ${tamperedToken}`,
      },
    });

    assert.equal(res.status, 401);
    const body = await res.json();
    assert.match(body.error, /signature/i);
  });

  // 4. Cross-Workspace Access Denial (BOLA Prevention)
  await t.test('4. Cross-workspace access denial (BOLA): User from Workspace A calling protected Workspace B receives 403', async () => {
    // Rogue user has valid token but is NOT a member of wsId
    const res = await fetch(`${baseUrl}/api/workspaces?workspaceId=${wsId}`, {
      headers: {
        Authorization: `Bearer ${rogueToken}`,
      },
    });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.match(body.error, /Access denied: You are not a registered member/);
  });

  // 5. Anonymous Access Denial on Protected Workspace
  await t.test('5. Anonymous caller accessing protected workspace receives 401', async () => {
    const res = await fetch(`${baseUrl}/api/workspaces?workspaceId=${wsId}`);

    assert.equal(res.status, 401);
    const body = await res.json();
    assert.match(body.error, /Authentication required/);
  });

  // 6. Unauthorized Certification Blocking
  await t.test('6. Unauthorized certification blocking: Developer calling POST /api/handovers/certify receives 403', async () => {
    const res = await fetch(`${baseUrl}/api/handovers/certify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${developerToken}`,
      },
      body: JSON.stringify({ workspaceId: wsId, signerName: 'Developer Name' }),
    });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.match(body.error, /Forbidden/);
  });

  // 7. Unauthorized Conflict Resolution Blocking
  await t.test('7. Unauthorized conflict resolution blocking: Developer calling POST /api/conflicts/:id/resolve receives 403', async () => {
    const res = await fetch(`${baseUrl}/api/conflicts/conflict-test-1/resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${developerToken}`,
      },
      body: JSON.stringify({
        workspaceId: wsId,
        chosenFindingId: 'f-1',
        resolutionNotes: 'Developer decision',
      }),
    });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.match(body.error, /Forbidden/);
  });

  // 8. Member Invitation Permission Control
  await t.test('8. Member invitation permission control: Developer receives 403; Manager succeeds with 201', async () => {
    // Developer tries to invite new member -> 403 Forbidden
    const devAttempt = await fetch(`${baseUrl}/api/workspaces/${wsId}/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${developerToken}`,
      },
      body: JSON.stringify({
        workspaceId: wsId,
        userId: 'usr_invited_by_dev',
        email: 'invited@knotrail.local',
        role: 'DEVELOPER',
      }),
    });
    assert.equal(devAttempt.status, 403);

    // Manager invites new member -> 201 Created
    const mgrAttempt = await fetch(`${baseUrl}/api/workspaces/${wsId}/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`,
      },
      body: JSON.stringify({
        workspaceId: wsId,
        userId: 'usr_invited_by_mgr',
        email: 'invited_by_mgr@knotrail.local',
        role: 'DEVELOPER',
      }),
    });
    assert.equal(mgrAttempt.status, 201);
    const data = await mgrAttempt.json();
    assert.equal(data.status, 'created');
    assert.equal(data.member.userId, 'usr_invited_by_mgr');
    assert.equal(data.member.role, 'DEVELOPER');
  });

  // 9. Confidential Data Leakage Prevention for EXTERNAL Role
  await t.test('9. Confidential data leakage prevention: External user receives redacted output with zero CONFIDENTIAL citations', async () => {
    // Generate handover package first as Manager
    const genRes = await fetch(`${baseUrl}/api/handovers/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`,
      },
      body: JSON.stringify({ workspaceId: wsId, signerName: 'Project Manager' }),
    });
    assert.equal(genRes.status, 200);

    // External user fetches workspace project data
    const wsRes = await fetch(`${baseUrl}/api/workspaces?workspaceId=${wsId}`, {
      headers: {
        Authorization: `Bearer ${externalToken}`,
      },
    });
    assert.equal(wsRes.status, 200);
    const wsData = await wsRes.json();

    const confidentialFinding = wsData.project.findings.find((f) => f.id === 'f-confidential-1');
    assert.ok(confidentialFinding, 'Finding must exist');
    assert.equal(confidentialFinding.reviewerNotes, undefined, 'Internal reviewer notes must be stripped');
    assert.match(confidentialFinding.citations[0].snippet, /REDACTED/, 'Confidential citation snippet must be redacted');
    assert.match(confidentialFinding.citations[0].quote, /REDACTED/, 'Confidential citation quote must be redacted');
    assert.doesNotMatch(JSON.stringify(wsData), /postgres:\/\/prod-db/, 'No raw database credentials may leak');

    // External user exports handover in JSON format
    const exportRes = await fetch(`${baseUrl}/api/handovers/export?workspaceId=${wsId}&format=json`, {
      headers: {
        Authorization: `Bearer ${externalToken}`,
      },
    });
    assert.equal(exportRes.status, 200);
    const exportJson = await exportRes.json();
    assert.doesNotMatch(JSON.stringify(exportJson), /postgres:\/\/prod-db/, 'Handover export must not leak confidential secrets');
  });

  // 10. Public Share Security with Automatic Confidential Redaction
  await t.test('10. Public share security: /api/handovers/share/:token works without login and redacts confidential items', async () => {
    // Manager certifies handover and creates a public share link
    const certRes = await fetch(`${baseUrl}/api/handovers/certify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`,
      },
      body: JSON.stringify({ workspaceId: wsId, signerName: 'Project Manager' }),
    });
    assert.equal(certRes.status, 200);

    const shareRes = await fetch(`${baseUrl}/api/handovers/share`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`,
      },
      body: JSON.stringify({ workspaceId: wsId }),
    });
    assert.equal(shareRes.status, 200);
    const shareData = await shareRes.json();
    const token = shareData.shareRecord.token;
    assert.ok(token);

    // Anonymous recipient queries public share endpoint
    const publicRes = await fetch(`${baseUrl}/api/handovers/share/${token}`);
    assert.equal(publicRes.status, 200);
    const publicData = await publicRes.json();

    assert.equal(publicData.status, 'success');
    assert.ok(publicData.handover);
    assert.doesNotMatch(JSON.stringify(publicData), /postgres:\/\/prod-db/, 'Public share must never leak confidential credentials');
    assert.match(JSON.stringify(publicData), /REDACTED/, 'Confidential citations must be redacted in public share');
  });
});
