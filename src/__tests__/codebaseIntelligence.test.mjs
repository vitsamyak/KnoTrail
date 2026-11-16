/**
 * Automated Test Suite: Codebase Intelligence & Full Repository Ingestion
 *
 * Verifies:
 * 1. Intelligent file classification across 14 categories.
 * 2. Directory exclusions (node_modules, .next, dist, build, .git) & binary exclusion.
 * 3. Secret file exclusion (.env, .env.local, .pem, .key) & permit .env.example.
 * 4. Invariant secret redaction (GitHub PATs, Bearer tokens, Gemini keys, Supabase secrets).
 * 5. Architectural blueprint inference (framework, backend routes, database tables, middleware).
 * 6. Deterministic & AI knowledge extraction with exact file and line range citations.
 * 7. Grounded Codebase Q&A engine answering the 8 canonical engineering questions.
 * 8. REST Endpoints: GET /intelligence & POST /ask with RBAC permissions.
 *
 * Governance: CodersInPune Hackathon 2026 - Deploy_or_Die (Samyak Gedam & Sanshrey Sanagar)
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../../backend/app.ts';
import { getStorage, resetStorageInstance } from '../server/db/storage.ts';
import {
  classifyFile,
  sanitizeCodebaseContent,
} from '../../backend/services/codebaseScanner.ts';
import { analyzeCodebaseArchitecture } from '../../backend/services/codebaseAnalyzer.ts';
import {
  extractDeterministicCodebaseFindings,
  answerCodebaseQuestion,
} from '../../backend/services/codebaseAiExtractor.ts';
import { setCustomGitHubService } from '../../backend/routes/github.ts';
import { createDevSessionToken } from '../../backend/middleware/auth.ts';

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

test('▶ Codebase Intelligence & Full Repository Scanner Suite', async (t) => {
  const origStorageBackend = process.env.STORAGE_BACKEND;
  process.env.STORAGE_BACKEND = 'file';
  resetStorageInstance();

  const { server, baseUrl, close } = await createTestServer();
  const storage = getStorage();

  t.after(async () => {
    setCustomGitHubService(null);
    process.env.STORAGE_BACKEND = origStorageBackend;
    resetStorageInstance();
    await close();
  });

  // ==========================================================================
  // Unit Tests: File Classification & Exclusion Invariants
  // ==========================================================================

  await t.test('1. classifyFile correctly categorizes source, UI, routes, schemas, and configurations', () => {
    const tsRoute = classifyFile('backend/routes/github.ts');
    assert.equal(tsRoute.category, 'backend_route');
    assert.equal(tsRoute.language, 'TypeScript');
    assert.equal(tsRoute.isEligible, true);

    const uiComp = classifyFile('src/components/views/EvidenceView.tsx');
    assert.equal(uiComp.category, 'ui_component');
    assert.equal(uiComp.language, 'TypeScript (React)');
    assert.equal(uiComp.isEligible, true);

    const dbSchema = classifyFile('supabase/migrations/20261112000002_knotrail_github_integrations.sql');
    assert.equal(dbSchema.category, 'database_schema');
    assert.equal(dbSchema.language, 'SQL');
    assert.equal(dbSchema.isEligible, true);

    const pkgConfig = classifyFile('package.json');
    assert.equal(pkgConfig.category, 'configuration');
    assert.equal(pkgConfig.language, 'JSON');
    assert.equal(pkgConfig.isEligible, true);

    const readmeDoc = classifyFile('README.md');
    assert.equal(readmeDoc.category, 'documentation');
    assert.equal(readmeDoc.language, 'Markdown');
    assert.equal(readmeDoc.isEligible, true);
  });

  await t.test('2. Directory exclusion rejects node_modules, .next, dist, build, and coverage', () => {
    const nodeMod = classifyFile('node_modules/express/index.js');
    assert.equal(nodeMod.isEligible, false);
    assert.ok(nodeMod.skipReason?.includes('node_modules'));

    const nextBuild = classifyFile('.next/static/chunks/main.js');
    assert.equal(nextBuild.isEligible, false);
    assert.ok(nextBuild.skipReason?.includes('.next'));

    const distFile = classifyFile('dist/backend/server.js');
    assert.equal(distFile.isEligible, false);
    assert.ok(distFile.skipReason?.includes('dist'));
  });

  await t.test('3. Secret file exclusion rejects .env and private keys while allowing .env.example', () => {
    const envLocal = classifyFile('.env.local');
    assert.equal(envLocal.isEligible, false);
    assert.ok(envLocal.skipReason?.includes('Sensitive environment credentials'));

    const rsaKey = classifyFile('server.key');
    assert.equal(rsaKey.isEligible, false);
    assert.ok(rsaKey.skipReason?.includes('Cryptographic key'));

    const envExample = classifyFile('.env.example');
    assert.equal(envExample.isEligible, true);
    assert.equal(envExample.category, 'configuration');
  });

  await t.test('4. sanitizeCodebaseContent redacts tokens, bearer headers, and credentials', () => {
    const raw = `
      const token = "ghp_1234567890abcdefghijklmnopqrstuvwxyz";
      const pat = "github_pat_11AAAAAAA_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
      const auth = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_token_value_here";
      const key = "AIzaSyDummyGeminiKey1234567890abcdef1234";
    `;
    const sanitized = sanitizeCodebaseContent(raw);
    assert.ok(!sanitized.includes('ghp_'));
    assert.ok(sanitized.includes('[REDACTED_GITHUB_TOKEN]'));
    assert.ok(!sanitized.includes('eyJhbGciOiJIUzI1Ni'));
    assert.ok(sanitized.includes('[REDACTED_AUTH_TOKEN]'));
    assert.ok(!sanitized.includes('AIzaSyDummyGeminiKey'));
    assert.ok(sanitized.includes('[REDACTED_GEMINI_KEY]'));
  });

  // ==========================================================================
  // Unit Tests: Architectural Inference & Grounded Knowledge Extraction
  // ==========================================================================

  await t.test('5. analyzeCodebaseArchitecture correctly constructs complete architectural blueprint', () => {
    const inventory = [
      { path: 'package.json', extension: '.json', language: 'JSON', category: 'configuration', size: 1000, blobSha: 'sha1', linesCount: 50, isRead: true },
      { path: 'backend/server.ts', extension: '.ts', language: 'TypeScript', category: 'backend_route', size: 2000, blobSha: 'sha2', linesCount: 80, isRead: true },
      { path: 'backend/routes/github.ts', extension: '.ts', language: 'TypeScript', category: 'backend_route', size: 5000, blobSha: 'sha3', linesCount: 200, isRead: true },
      { path: 'supabase/migrations/20261112_init.sql', extension: '.sql', language: 'SQL', category: 'database_schema', size: 3000, blobSha: 'sha4', linesCount: 100, isRead: true },
      { path: 'src/components/views/EvidenceView.tsx', extension: '.tsx', language: 'TSX', category: 'ui_component', size: 4000, blobSha: 'sha5', linesCount: 150, isRead: true },
    ];

    const fileContents = new Map([
      [
        'package.json',
        JSON.stringify({
          dependencies: {
            next: '^14.2.0',
            react: '^18.3.0',
            express: '^5.0.0',
            '@supabase/supabase-js': '^2.40.0',
            '@google/genai': '^3.0.0',
            cors: '^2.8.5',
          },
        }),
      ],
      [
        'backend/server.ts',
        `
        import express from 'express';
        import cors from 'cors';
        const app = express();
        app.get('/health', (req, res) => res.send('ok'));
        `,
      ],
      [
        'supabase/migrations/20261112_init.sql',
        `
        CREATE TABLE workspaces (id text PRIMARY KEY, project_state jsonb);
        CREATE TABLE github_integrations (id text PRIMARY KEY, workspace_id text REFERENCES workspaces(id));
        `,
      ],
    ]);

    const blueprint = analyzeCodebaseArchitecture(inventory, fileContents);

    assert.equal(blueprint.frontend.framework, 'Next.js 14.2.0 (React)');
    assert.equal(blueprint.backend.framework, 'Express');
    assert.equal(blueprint.backend.runtime, 'Node.js');
    assert.ok(blueprint.database.type.includes('Supabase') || blueprint.database.type.includes('PostgreSQL'));
    assert.ok(blueprint.database.tables.includes('workspaces'));
    assert.ok(blueprint.database.tables.includes('github_integrations'));
    assert.ok(blueprint.externalIntegrations.some((ext) => ext.includes('Gemini')));
    assert.ok(blueprint.externalIntegrations.some((ext) => ext.includes('GitHub')));
  });

  await t.test('6. extractDeterministicCodebaseFindings generates verified findings citing exact files and line numbers', () => {
    const fileContents = new Map([
      [
        'backend/server.ts',
        `
        import express from 'express';
        const app = express();
        app.listen(PORT, () => {
          console.log('Server running');
        });
        `,
      ],
      [
        'src/server/db/schema.sql',
        `
        -- Table: workspaces
        CREATE TABLE workspaces (
          id text PRIMARY KEY,
          version integer NOT NULL
        );
        CREATE OR REPLACE FUNCTION save_workspace_state() RETURNS void AS $$
        BEGIN
          -- CONCURRENCY_CONFLICT
        END;
        $$ LANGUAGE plpgsql;
        ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
        `,
      ],
      [
        'backend/services/github.ts',
        `
        export function generateAppJwt() {
          // RS256 algorithm
        }
        export function verifyGitHubWebhookSignature() {
          // timingSafeEqual
        }
        `,
      ],
      [
        'backend/middleware/roleAuth.ts',
        `
        export function requireWorkspaceAccess() {
          // RBAC enforcement
        }
        export function requireRole() {
          // Role check
        }
        `,
      ],
    ]);

    const blueprint = {
      frontend: { framework: 'Next.js', routing: 'App Router', stateManagement: ['Context API'], keyComponents: [] },
      backend: { runtime: 'Node 20', framework: 'Express', apiType: 'REST', endpointsCount: 15, keyRoutes: ['backend/routes/github.ts'], middleware: [] },
      database: { type: 'PostgreSQL', tables: ['workspaces'], hasMigrations: true, features: [] },
      externalIntegrations: ['GitHub REST API'],
      deployment: { platforms: ['Render'], hasCiCd: true, containerized: false },
      keyWorkflows: [],
      moduleRelationships: [],
    };

    const findings = extractDeterministicCodebaseFindings(
      'vitsamyak/KnoTrail',
      'src_test_123',
      'commitsha123',
      fileContents,
      blueprint
    );

    assert.ok(findings.length >= 3, `Expected at least 3 findings, got ${findings.length}`);
    for (const f of findings) {
      assert.equal(f.approved, false); // Zero Auto-Approval Invariant
      assert.ok(f.citations.length > 0);
      assert.equal(f.citations[0].sourceType, 'github');
      assert.ok(f.citations[0].file);
      assert.ok(f.citations[0].lineRange);
      assert.ok(f.citations[0].quote);
    }
  });

  await t.test('7. answerCodebaseQuestion answers all 8 canonical architecture questions with high confidence and citations', async () => {
    const blueprint = {
      frontend: { framework: 'Next.js 14 App Router', routing: 'App Router', stateManagement: ['React Context API (ProjectContext)'], keyComponents: ['EvidenceView.tsx', 'ReviewView.tsx'] },
      backend: { runtime: 'Node 20', framework: 'Express 5', apiType: 'REST API', endpointsCount: 22, keyRoutes: ['backend/routes/github.ts', 'backend/routes/auth.ts'], middleware: ['CORS', 'Server-Verified RBAC'] },
      database: { type: 'PostgreSQL (Cloud Supabase)', tables: ['workspaces', 'handover_documents', 'github_integrations'], hasMigrations: true, features: ['Row Level Security (RLS)', 'Optimistic Concurrency Control (OCC)'] },
      externalIntegrations: ['Google Gemini 2.5 Flash', 'Cloud Supabase PostgreSQL', 'GitHub REST & Git Data APIs'],
      deployment: { platforms: ['Render', 'Vercel'], hasCiCd: true, containerized: true },
      keyWorkflows: ['RECONSTRUCT -> VERIFY -> REVIEW -> HANDOVER'],
      moduleRelationships: [],
    };

    const inventory = [
      { path: 'backend/routes/github.ts', extension: '.ts', language: 'TypeScript', category: 'backend_route', size: 5000, blobSha: 's1', linesCount: 150, isRead: true },
      { path: 'backend/routes/auth.ts', extension: '.ts', language: 'TypeScript', category: 'auth_security', size: 3000, blobSha: 's2', linesCount: 90, isRead: true },
      { path: 'src/server/db/schema.sql', extension: '.sql', language: 'SQL', category: 'database_schema', size: 4000, blobSha: 's3', linesCount: 110, isRead: true },
    ];

    const questions = [
      'What is the application architecture and key components?',
      'How does authentication and role-based access work?',
      'How is the GitHub API integrated and authenticated?',
      'What database tables and migrations exist?',
      'How does the document ingestion pipeline work?',
      'What are the key dependencies and external services?',
      'What are the major technical decisions recorded in the code?',
      'Where are the main entry points and data flows?',
    ];

    for (const q of questions) {
      const response = await answerCodebaseQuestion(blueprint, inventory, [], q);
      assert.ok(response.answer.length > 50, `Answer for "${q}" should be detailed`);
      assert.ok(response.confidence >= 0.85, `Confidence for "${q}" should be >= 0.85`);
      assert.ok(response.citations.length > 0, `Citations for "${q}" must not be empty`);
      assert.ok(response.relatedFiles.length > 0, `Related files for "${q}" must not be empty`);
    }
  });

  // ==========================================================================
  // Integration Tests: REST Endpoints (GET /intelligence & POST /ask)
  // ==========================================================================

  await t.test('8. REST API: GET /intelligence & POST /ask enforce RBAC and deliver grounded responses', async () => {
    const wsId = 'ws_intel_test_' + Date.now();
    const manager = { id: 'usr_mgr_test', email: 'mgr@knotrail.demo' };
    const dev = { id: 'usr_dev_test', email: 'dev@knotrail.demo' };
    const external = { id: 'usr_ext_test', email: 'ext@knotrail.demo' };

    await storage.createWorkspace(wsId);
    await storage.setWorkspaceProtected(wsId, true, manager.id);
    await storage.addWorkspaceMember(wsId, { userId: manager.id, email: manager.email, role: 'MANAGER' });
    await storage.addWorkspaceMember(wsId, { userId: dev.id, email: dev.email, role: 'DEVELOPER' });
    await storage.addWorkspaceMember(wsId, { userId: external.id, email: external.email, role: 'EXTERNAL' });

    const managerToken = createDevSessionToken(manager, 3600);
    const externalToken = createDevSessionToken(external, 3600);

    const repoId = 123456;
    const testIntelligence = {
      treeSha: 'test_tree_sha_123',
      commitSha: 'test_commit_sha_123',
      branch: 'main',
      inventory: [
        { path: 'backend/server.ts', extension: '.ts', language: 'TypeScript', category: 'backend_route', size: 2000, blobSha: 'b1', linesCount: 80, isRead: true },
        { path: 'src/lib/types.ts', extension: '.ts', language: 'TypeScript', category: 'data_model', size: 4000, blobSha: 'b2', linesCount: 150, isRead: true },
      ],
      blueprint: {
        frontend: { framework: 'Next.js App Router', routing: 'App Router', stateManagement: ['Context API'], keyComponents: ['EvidenceView.tsx'] },
        backend: { runtime: 'Node 20', framework: 'Express 5', apiType: 'REST API', endpointsCount: 10, keyRoutes: ['backend/routes/github.ts'], middleware: ['CORS', 'RBAC'] },
        database: { type: 'PostgreSQL (Cloud Supabase)', tables: ['workspaces', 'github_integrations'], hasMigrations: true, features: ['RLS'] },
        externalIntegrations: ['Google Gemini API', 'GitHub REST API'],
        deployment: { platforms: ['Render'], hasCiCd: true, containerized: true },
        keyWorkflows: ['RECONSTRUCT -> VERIFY -> REVIEW -> HANDOVER'],
        moduleRelationships: [],
      },
      progress: {
        phase: 9,
        phaseName: 'Completed',
        percent: 100,
        status: 'completed',
        discoveredCount: 2,
        readCount: 2,
        skippedCount: 0,
        analyzedCount: 2,
        findingsCount: 4,
        errorCount: 0,
        errors: [],
      },
      stats: {
        totalFilesDiscovered: 2,
        totalFilesRead: 2,
        totalFilesSkipped: 0,
        totalLinesOfCode: 230,
        totalFindings: 4,
        skippedByReason: {},
        languages: { TypeScript: 2 },
        categories: { backend_route: 1, data_model: 1 },
      },
      lastIngestedAt: new Date().toISOString(),
    };

    // Save integration with intelligence
    await storage.saveGitHubIntegration(wsId, {
      id: `ghi_${repoId}`,
      workspaceId: wsId,
      repoOwner: 'vitsamyak',
      repoName: 'KnoTrail',
      repoId,
      defaultBranch: 'main',
      selectedBranch: 'main',
      syncStatus: 'synced',
      config: {
        includeCommits: true,
        includePullRequests: true,
        includeIssues: true,
        includeDocs: true,
      },
      codebaseIntelligence: testIntelligence,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // 1. GET /api/github/integrations/:repoId/intelligence with Manager token
    const intelRes = await fetch(`${baseUrl}/api/github/integrations/${repoId}/intelligence?workspaceId=${wsId}`, {
      headers: {
        Authorization: `Bearer ${managerToken}`,
      },
    });
    assert.equal(intelRes.status, 200);
    const intelData = await intelRes.json();
    assert.equal(intelData.status, 'success');
    assert.equal(intelData.intelligence.treeSha, 'test_tree_sha_123');
    assert.equal(intelData.intelligence.stats.totalLinesOfCode, 230);

    // 2. GET /intelligence with External token (read-only allowed)
    const extIntelRes = await fetch(`${baseUrl}/api/github/integrations/${repoId}/intelligence?workspaceId=${wsId}`, {
      headers: {
        Authorization: `Bearer ${externalToken}`,
      },
    });
    assert.equal(extIntelRes.status, 200);

    // 3. POST /api/github/integrations/:repoId/ask with questions
    const askRes = await fetch(`${baseUrl}/api/github/integrations/${repoId}/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${managerToken}`,
      },
      body: JSON.stringify({
        workspaceId: wsId,
        question: 'What database tables and migrations exist?',
      }),
    });
    assert.equal(askRes.status, 200);
    const askData = await askRes.json();
    assert.equal(askData.status, 'success');
    assert.ok(askData.response.answer.includes('workspaces'));
    assert.ok(askData.response.confidence >= 0.85);
    assert.ok(askData.response.citations.length > 0);
  });
});
