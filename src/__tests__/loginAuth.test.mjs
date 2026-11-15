import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../../backend/app.ts';
import { createDevSessionToken, getSessionSecret } from '../../backend/middleware/auth.ts';
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

test('▶ Round 3: Server-Verified Login & Authentication Test Suite', async (t) => {
  const origStorageBackend = process.env.STORAGE_BACKEND;
  process.env.STORAGE_BACKEND = 'file';

  const { server, baseUrl, close } = await createTestServer();
  const storage = getStorage();

  t.after(async () => {
    process.env.STORAGE_BACKEND = origStorageBackend;
    await close();
  });

  const DEMO_EMAIL = 'manager@knotrail.demo';
  const DEMO_PASSWORD = process.env.DEMO_MANAGER_PASSWORD || 'KnoTrail2026!Manager';

  await t.test('1. GET /api/auth/status returns auth capabilities without leaking passwords', async () => {
    const res = await fetch(`${baseUrl}/api/auth/status`);
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(typeof data.supabaseConfigured, 'boolean');
    assert.equal(data.demoAccountAvailable, true);
    assert.equal(data.demoEmail, DEMO_EMAIL);

    // Verify secret isolation
    const rawText = JSON.stringify(data);
    assert.ok(!rawText.includes(DEMO_PASSWORD), 'Response must not leak demo password');
    assert.ok(!rawText.includes(getSessionSecret()), 'Response must not leak session secret');
  });

  await t.test('2. GET /api/auth/me without token returns unauthenticated state (200)', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`);
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.isAuthenticated, false);
    assert.equal(data.user, null);
  });

  await t.test('3. POST /api/auth/login validates required fields (400 Bad Request)', async () => {
    // Missing email
    const resNoEmail = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: DEMO_PASSWORD }),
    });
    assert.equal(resNoEmail.status, 400);
    const bodyNoEmail = await resNoEmail.json();
    assert.ok(bodyNoEmail.error.includes('Email address is required'));

    // Missing password
    const resNoPass = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: DEMO_EMAIL }),
    });
    assert.equal(resNoPass.status, 400);
    const bodyNoPass = await resNoPass.json();
    assert.ok(bodyNoPass.error.includes('Password is required'));
  });

  await t.test('4. POST /api/auth/login rejects invalid credentials with generic 401', async () => {
    // Wrong password
    const resWrongPass = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: DEMO_EMAIL, password: 'WrongPassword123!' }),
    });
    assert.equal(resWrongPass.status, 401);
    const bodyWrongPass = await resWrongPass.json();
    assert.ok(bodyWrongPass.error.includes('Invalid email or password'));

    // Unknown email
    const resWrongEmail = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'unknown@example.com', password: DEMO_PASSWORD }),
    });
    assert.equal(resWrongEmail.status, 401);
    const bodyWrongEmail = await resWrongEmail.json();
    assert.ok(bodyWrongEmail.error.includes('Invalid email or password'));
  });

  let validToken = '';
  const testWorkspaceId = 'ws_proj_login_' + Date.now();

  await t.test('5. POST /api/auth/login with valid demo credentials succeeds and returns MANAGER role', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        workspaceId: testWorkspaceId,
      }),
    });
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.status, 'authenticated');
    assert.ok(data.token, 'Must return session token');
    assert.ok(data.token.startsWith('kt_hmac.'), 'Session token must be cryptographically signed HMAC token');
    assert.equal(data.user.email, DEMO_EMAIL);
    assert.equal(data.user.role, 'MANAGER');
    assert.equal(data.workspace.id, testWorkspaceId);
    assert.equal(data.workspace.isProtected, true);
    assert.equal(data.workspace.memberRole, 'MANAGER');

    validToken = data.token;

    // Verify user is also recorded in storage repository as MANAGER
    const member = await storage.getWorkspaceMember(testWorkspaceId, data.user.userId);
    assert.ok(member, 'Member record must exist in storage');
    assert.equal(member.role, 'MANAGER');
  });

  await t.test('6. GET /api/auth/me with valid session token returns authenticated user', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me?workspaceId=${testWorkspaceId}`, {
      headers: {
        Authorization: `Bearer ${validToken}`,
      },
    });
    assert.equal(res.status, 200);

    const data = await res.json();
    assert.equal(data.isAuthenticated, true);
    assert.equal(data.user.email, DEMO_EMAIL);
    assert.equal(data.role, 'MANAGER');
    assert.equal(data.workspaceId, testWorkspaceId);
  });

  await t.test('7. GET /api/auth/me rejects tampered or forged HMAC tokens (401)', async () => {
    const tamperedToken = validToken.slice(0, -6) + 'abcdef';
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${tamperedToken}`,
      },
    });
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.ok(body.error.includes('signature') || body.error.includes('Authentication failed'));
  });

  await t.test('8. GET /api/auth/me rejects expired HMAC tokens (401)', async () => {
    // Create an expired token (expired 10 seconds ago)
    const expiredToken = createDevSessionToken(
      { id: 'usr_mgr_expired', email: DEMO_EMAIL },
      -10
    );

    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${expiredToken}`,
      },
    });
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.ok(body.error.includes('expired') || body.error.includes('Authentication failed'));
  });

  await t.test('9. POST /api/auth/logout returns confirmation', async () => {
    const res = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${validToken}`,
      },
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, 'logged_out');
  });

  await t.test('10. Authenticated session permits MANAGER-only operations on protected workspace', async () => {
    // 1. Unauthenticated request to invite member on protected workspace fails with 401
    const unauthRes = await fetch(`${baseUrl}/api/workspaces/${testWorkspaceId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: 'usr_collab_1',
        email: 'collaborator@knotrail.demo',
        role: 'DEVELOPER',
      }),
    });
    assert.equal(unauthRes.status, 401, 'Unauthenticated user must not access protected workspace');

    // 2. Authenticated request with login session token succeeds as MANAGER (201 Created)
    const authRes = await fetch(`${baseUrl}/api/workspaces/${testWorkspaceId}/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${validToken}`,
      },
      body: JSON.stringify({
        userId: 'usr_collab_1',
        email: 'collaborator@knotrail.demo',
        role: 'DEVELOPER',
      }),
    });
    assert.equal(authRes.status, 201, 'Authenticated Manager must be authorized to add workspace members');
    const authBody = await authRes.json();
    assert.equal(authBody.member.email, 'collaborator@knotrail.demo');
    assert.equal(authBody.member.role, 'DEVELOPER');
  });

  await t.test('11. Zero-login public demo workspaces remain completely functional without auth token', async () => {
    const anonWsId = 'ws_anon_public_' + Date.now();
    const res = await fetch(`${baseUrl}/api/workspaces?workspaceId=${anonWsId}`);
    assert.equal(res.status, 200, 'Anonymous workspace must be accessible without login');

    const data = await res.json();
    assert.equal(data.workspaceId, anonWsId);
    assert.equal(typeof data.project.name, 'string');
    assert.ok(data.project.name.length > 0);
  });

  await t.test('12. Password isolation: API responses never expose credentials', async () => {
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: DEMO_EMAIL, password: DEMO_PASSWORD }),
    });
    const bodyText = await loginRes.text();
    assert.ok(!bodyText.includes(DEMO_PASSWORD), 'Login response body must not echo the raw password');
  });
});
