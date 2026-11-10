import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { SupabaseStorageRepository } from '../server/db/supabaseStorage.ts';
import {
  isValidWorkspaceId,
  generateSecureWorkspaceId,
  hashShareToken,
  ConcurrencyConflictError,
} from '../server/db/types.ts';
import {
  getStorage,
  setStorageInstance,
  resetStorageInstance,
} from '../server/db/storage.ts';
import {
  isSupabaseConfigured,
  getSupabaseConfig,
  SupabaseConfigError,
  DEFAULT_STORAGE_BUCKET,
} from '../server/db/supabaseClient.ts';
import { exportHandoverMarkdown, exportHandoverJson } from '../lib/handoverFilter.ts';

/**
 * Creates an in-memory mock Supabase client that emulates PostgreSQL tables,
 * RPC function save_workspace_state with optimistic concurrency control,
 * and Supabase Storage bucket operations.
 */
function createMockSupabaseClient() {
  const workspacesTable = new Map(); // id -> DatabaseWorkspaceRow
  const handoverSharesTable = new Map(); // token_hash -> DatabaseHandoverShareRow
  const storageBuckets = new Map(); // bucketName -> Map(path, { buffer, contentType })

  // Initialize private bucket
  storageBuckets.set(DEFAULT_STORAGE_BUCKET, new Map());

  const client = {
    _workspaces: workspacesTable,
    _shares: handoverSharesTable,
    _storage: storageBuckets,

    from(table) {
      if (table === 'workspaces') {
        return {
          select(columns) {
            return {
              eq(col, val) {
                return {
                  async maybeSingle() {
                    const row = workspacesTable.get(val);
                    if (!row) return { data: null, error: null };
                    return {
                      data: {
                        id: row.id,
                        name: row.name,
                        project_data: JSON.parse(JSON.stringify(row.project_data)),
                        version: row.version,
                      },
                      error: null,
                    };
                  },
                };
              },
              async then(resolve) {
                const rows = Array.from(workspacesTable.values()).map((r) => ({
                  id: r.id,
                  name: r.name,
                  version: r.version,
                }));
                resolve({ data: rows, error: null });
              },
            };
          },

          upsert(record) {
            return {
              select(columns) {
                const existing = workspacesTable.get(record.id);
                const version = (existing?.version || 0) + 1;
                const savedRow = {
                  id: record.id,
                  name: record.name || 'Anonymous Workspace',
                  project_data: JSON.parse(JSON.stringify(record.project_data)),
                  version,
                  created_at: existing?.created_at || new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                };
                workspacesTable.set(record.id, savedRow);
                return Promise.resolve({ data: [{ version }], error: null });
              },
              async then(resolve) {
                const existing = workspacesTable.get(record.id);
                const version = (existing?.version || 0) + 1;
                workspacesTable.set(record.id, {
                  id: record.id,
                  name: record.name || 'Anonymous Workspace',
                  project_data: JSON.parse(JSON.stringify(record.project_data)),
                  version,
                  created_at: existing?.created_at || new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                });
                resolve({ data: [{ version }], error: null });
              },
            };
          },

          update(updates) {
            return {
              eq(col1, val1) {
                return {
                  eq(col2, val2) {
                    return {
                      select(columns) {
                        const row = workspacesTable.get(val1);
                        if (!row || row[col2] !== val2) {
                          // Version mismatch or row not found -> stale update
                          return Promise.resolve({ data: [], error: null });
                        }
                        const newVersion = row.version + 1;
                        row.project_data = JSON.parse(JSON.stringify(updates.project_data));
                        row.name = updates.name || row.name;
                        row.version = newVersion;
                        row.updated_at = new Date().toISOString();
                        workspacesTable.set(val1, row);
                        return Promise.resolve({ data: [{ version: newVersion }], error: null });
                      },
                    };
                  },
                };
              },
            };
          },
        };
      }

      if (table === 'handover_shares') {
        return {
          async insert(record) {
            handoverSharesTable.set(record.token_hash, {
              token_hash: record.token_hash,
              workspace_id: record.workspace_id,
              handover_id: record.handover_id,
              is_active: record.is_active ?? true,
              created_at: record.created_at || new Date().toISOString(),
              revoked_at: null,
            });
            return { data: [record], error: null };
          },

          select(columns) {
            return {
              eq(col, val) {
                return {
                  async maybeSingle() {
                    const row = handoverSharesTable.get(val);
                    if (!row) return { data: null, error: null };
                    return { data: { ...row }, error: null };
                  },
                };
              },
            };
          },

          update(updates) {
            return {
              eq(col1, val1) {
                return {
                  eq(col2, val2) {
                    return {
                      select(columns) {
                        const row = handoverSharesTable.get(val1);
                        if (!row || row.workspace_id !== val2) {
                          return Promise.resolve({ data: [], error: null });
                        }
                        Object.assign(row, updates);
                        handoverSharesTable.set(val1, row);
                        return Promise.resolve({ data: [row], error: null });
                      },
                      async then(resolve) {
                        const row = handoverSharesTable.get(val1);
                        if (!row || row.workspace_id !== val2) {
                          resolve({ data: [], error: null });
                          return;
                        }
                        Object.assign(row, updates);
                        handoverSharesTable.set(val1, row);
                        resolve({ data: [row], error: null });
                      },
                    };
                  },
                };
              },
            };
          },
        };
      }

      throw new Error(`MockSupabase: Unsupported table "${table}"`);
    },

    async rpc(funcName, params) {
      if (funcName === 'save_workspace_state') {
        const { p_workspace_id, p_project_data, p_expected_version } = params;
        const existing = workspacesTable.get(p_workspace_id);

        if (!existing) {
          const newRow = {
            id: p_workspace_id,
            name: p_project_data?.name || 'Anonymous Workspace',
            project_data: JSON.parse(JSON.stringify(p_project_data)),
            version: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          workspacesTable.set(p_workspace_id, newRow);
          return { data: [{ new_version: 1, updated_at: newRow.updated_at }], error: null };
        }

        if (p_expected_version !== null && p_expected_version !== undefined && existing.version !== p_expected_version) {
          return {
            data: null,
            error: {
              message: `CONCURRENCY_CONFLICT: Stale update rejected for workspace ${p_workspace_id}. Expected version ${p_expected_version}, but current version is ${existing.version}.`,
              code: 'P0001',
              details: 'CONCURRENCY_CONFLICT',
            },
          };
        }

        existing.project_data = JSON.parse(JSON.stringify(p_project_data));
        existing.name = p_project_data?.name || existing.name;
        existing.version += 1;
        existing.updated_at = new Date().toISOString();
        workspacesTable.set(p_workspace_id, existing);

        return {
          data: [{ new_version: existing.version, updated_at: existing.updated_at }],
          error: null,
        };
      }

      return { data: null, error: { message: `Unknown function ${funcName}`, code: '42883' } };
    },

    storage: {
      from(bucketName) {
        let bucket = storageBuckets.get(bucketName);
        if (!bucket) {
          bucket = new Map();
          storageBuckets.set(bucketName, bucket);
        }

        return {
          async upload(storagePath, buffer, options) {
            bucket.set(storagePath, {
              buffer: Buffer.from(buffer),
              contentType: options?.contentType || 'application/octet-stream',
              uploadedAt: new Date().toISOString(),
            });
            return { data: { path: storagePath }, error: null };
          },

          async remove(paths) {
            for (const p of paths) {
              bucket.delete(p);
            }
            return { data: paths, error: null };
          },

          async download(storagePath) {
            const file = bucket.get(storagePath);
            if (!file) {
              return { data: null, error: { message: 'Object not found' } };
            }
            return { data: file.buffer, error: null };
          },
        };
      },
    },
  };

  return client;
}

test('▶ Phase H: Supabase Backend & Cloud Storage Integration Suite', async (t) => {
  // 1. Workspace create/read/save persistence
  await t.test('1. Workspace create, read, and save persistence', async () => {
    const mockClient = createMockSupabaseClient();
    const repo = new SupabaseStorageRepository({ client: mockClient });
    const wsId = generateSecureWorkspaceId();

    const created = await repo.createWorkspace(wsId);
    assert.ok(created);
    assert.strictEqual(created.handoverCertified, false);

    // Modify and save
    created.name = 'Updated Engineering Handover';
    created.code = 'ENG-2026';
    const saved = await repo.saveProject(wsId, created);
    assert.strictEqual(saved.name, 'Updated Engineering Handover');

    // Read back
    const fetched = await repo.getWorkspace(wsId);
    assert.ok(fetched);
    assert.strictEqual(fetched.name, 'Updated Engineering Handover');
    assert.strictEqual(fetched.code, 'ENG-2026');
  });

  // 2. Persistence across fresh repository instances
  await t.test('2. Persistence across fresh repository instances', async () => {
    const mockClient = createMockSupabaseClient();
    const repo1 = new SupabaseStorageRepository({ client: mockClient });
    const wsId = generateSecureWorkspaceId();

    await repo1.createWorkspace(wsId);
    await repo1.addSource(wsId, {
      name: 'architecture.md',
      type: 'notes',
      content: 'Core architecture documentation for cloud storage cutover.',
      description: 'Persistent cloud architecture notes',
    });

    // Instantiate repo2 pointing to the exact same database client
    const repo2 = new SupabaseStorageRepository({ client: mockClient });
    const reloaded = await repo2.getWorkspace(wsId);
    assert.ok(reloaded);
    assert.strictEqual(reloaded.sources.length, 1);
    assert.strictEqual(reloaded.sources[0].name, 'architecture.md');
    assert.strictEqual(reloaded.findings.length, 1);
  });

  // 3. Separate workspace isolation
  await t.test('3. Cross-workspace isolation preserves separate states', async () => {
    const mockClient = createMockSupabaseClient();
    const repo = new SupabaseStorageRepository({ client: mockClient });
    const wsA = generateSecureWorkspaceId();
    const wsB = generateSecureWorkspaceId();

    await repo.createWorkspace(wsA);
    await repo.createWorkspace(wsB);

    await repo.addSource(wsA, {
      name: 'workspace_a_doc.txt',
      type: 'docs',
      content: 'Confidential Workspace A notes.',
      description: 'WS-A Notes',
    });

    const projectA = await repo.getWorkspace(wsA);
    const projectB = await repo.getWorkspace(wsB);

    assert.strictEqual(projectA.sources.length, 1);
    assert.strictEqual(projectB.sources.length, 0);
  });

  // 4. Invalid workspace ID rejection
  await t.test('4. Workspace ID validation strictly prevents injection and traversal', async () => {
    const mockClient = createMockSupabaseClient();
    const repo = new SupabaseStorageRepository({ client: mockClient });

    assert.strictEqual(isValidWorkspaceId('../path/traversal'), false);
    assert.strictEqual(isValidWorkspaceId('ws!@#$invalid'), false);
    assert.strictEqual(isValidWorkspaceId(''), false);
    assert.strictEqual(isValidWorkspaceId('a'.repeat(65)), false);
    assert.strictEqual(isValidWorkspaceId('ws_valid_1234-xyz_abc'), true);

    const invalidRes = await repo.getWorkspace('../traversal');
    assert.strictEqual(invalidRes, null);

    await assert.rejects(
      async () => {
        await repo.createWorkspace('../traversal');
      },
      /Invalid workspace ID/i
    );
  });

  // 5. Concurrent / stale update behavior (Optimistic Concurrency Control)
  await t.test('5. Optimistic Concurrency Control rejects stale writes', async () => {
    const mockClient = createMockSupabaseClient();
    const repo1 = new SupabaseStorageRepository({ client: mockClient });
    const repo2 = new SupabaseStorageRepository({ client: mockClient });
    const wsId = generateSecureWorkspaceId();

    await repo1.createWorkspace(wsId);

    // Both read version 1
    const p1 = await repo1.getWorkspace(wsId);
    const p2 = await repo2.getWorkspace(wsId);

    // Client 1 saves update (version advances to 2)
    p1.description = 'Updated by Client 1';
    await repo1.saveProject(wsId, p1);

    // Client 2 attempts to save with stale version 1 -> Must throw ConcurrencyConflictError!
    p2.description = 'Updated by Client 2 (stale)';
    await assert.rejects(
      async () => {
        await repo2.saveProject(wsId, p2);
      },
      (err) => err instanceof ConcurrencyConflictError || /CONCURRENCY_CONFLICT/i.test(err.message)
    );
  });

  // 6. Source upload to private Storage with workspace-scoped paths
  await t.test('6. Source upload to private Supabase Storage bucket with workspace-scoped path', async () => {
    const mockClient = createMockSupabaseClient();
    const repo = new SupabaseStorageRepository({ client: mockClient });
    const wsId = generateSecureWorkspaceId();
    await repo.createWorkspace(wsId);

    const sampleBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Title (Arch) >>\nendobj\ntrailer\n<< >>\n%%EOF');
    const sourceId = `src-upload-${Date.now()}`;
    const source = {
      id: sourceId,
      name: 'architecture_diagram.pdf',
      type: 'docs',
      status: 'connected',
      lastSync: 'Just now',
      recordCount: 1,
      icon: 'picture_as_pdf',
      description: 'Architecture diagram',
      privacyLevel: 'LOCAL_READ_ONLY',
      isUploaded: true,
      documentData: {
        fileFormat: 'pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: sampleBuffer.length,
        fileSizeFormatted: `${sampleBuffer.length} B`,
        contentHash: crypto.createHash('sha256').update(sampleBuffer).digest('hex'),
        extractedText: 'Architecture diagram content',
      },
    };

    const uploaded = await repo.addUploadedSource(wsId, source, sampleBuffer);
    assert.strictEqual(uploaded.id, sourceId);
    assert.strictEqual(uploaded.documentData.storagePath, `${wsId}/${sourceId}.pdf`);

    // Verify object exists in private bucket
    const bucket = mockClient._storage.get(DEFAULT_STORAGE_BUCKET);
    const storedObject = bucket.get(`${wsId}/${sourceId}.pdf`);
    assert.ok(storedObject);
    assert.strictEqual(storedObject.contentType, 'application/pdf');
    assert.deepStrictEqual(storedObject.buffer, sampleBuffer);
  });

  // 7. Source retrieval and deletion with storage object cleanup
  await t.test('7. Source retrieval and deletion cleans up associated storage object', async () => {
    const mockClient = createMockSupabaseClient();
    const repo = new SupabaseStorageRepository({ client: mockClient });
    const wsId = generateSecureWorkspaceId();
    await repo.createWorkspace(wsId);

    const sampleBuffer = Buffer.from('Database cutover notes');
    const sourceId = `src-test-${Date.now()}`;
    const source = {
      id: sourceId,
      name: 'notes.txt',
      type: 'notes',
      status: 'connected',
      lastSync: 'Just now',
      recordCount: 1,
      icon: 'description',
      description: 'Notes',
      privacyLevel: 'LOCAL_READ_ONLY',
      isUploaded: true,
      documentData: {
        fileFormat: 'txt',
        mimeType: 'text/plain',
        fileSizeBytes: sampleBuffer.length,
        fileSizeFormatted: `${sampleBuffer.length} B`,
        contentHash: crypto.createHash('sha256').update(sampleBuffer).digest('hex'),
        extractedText: 'Database cutover notes',
      },
    };

    await repo.addUploadedSource(wsId, source, sampleBuffer);
    const fetchedSource = await repo.getSource(wsId, sourceId);
    assert.ok(fetchedSource);
    assert.strictEqual(fetchedSource.name, 'notes.txt');

    // Delete source
    const updated = await repo.deleteSource(wsId, sourceId);
    assert.strictEqual(updated.sources.find((s) => s.id === sourceId), undefined);

    // Verify physical storage object was cleaned up
    const bucket = mockClient._storage.get(DEFAULT_STORAGE_BUCKET);
    assert.strictEqual(bucket.has(`${wsId}/${sourceId}.txt`), false);
  });

  // 8. Cleanup after partial upload / database failures (Orphan prevention)
  await t.test('8. Partial failure cleans up orphaned storage objects', async () => {
    const mockClient = createMockSupabaseClient();
    const repo = new SupabaseStorageRepository({ client: mockClient });
    const wsId = generateSecureWorkspaceId();
    await repo.createWorkspace(wsId);

    // Simulate database failure by corrupting saveProject on repo
    const originalSave = repo.saveProject.bind(repo);
    repo.saveProject = async () => {
      throw new Error('Simulated database write failure!');
    };

    const buffer = Buffer.from('Orphan test document');
    const sourceId = `src-orphan-${Date.now()}`;
    const source = {
      id: sourceId,
      name: 'orphan.txt',
      type: 'docs',
      status: 'connected',
      lastSync: 'Just now',
      recordCount: 1,
      icon: 'description',
      description: 'Orphan test',
      privacyLevel: 'LOCAL_READ_ONLY',
      isUploaded: true,
      documentData: {
        fileFormat: 'txt',
        mimeType: 'text/plain',
        fileSizeBytes: buffer.length,
        fileSizeFormatted: `${buffer.length} B`,
        contentHash: 'hash',
        extractedText: 'text',
      },
    };

    await assert.rejects(
      async () => {
        await repo.addUploadedSource(wsId, source, buffer);
      },
      /Simulated database write failure/
    );

    // Verify storage object was cleaned up (no orphaned file in bucket)
    const bucket = mockClient._storage.get(DEFAULT_STORAGE_BUCKET);
    assert.strictEqual(bucket.has(`${wsId}/${sourceId}.txt`), false);

    // Restore saveProject
    repo.saveProject = originalSave;
  });

  // 9. Findings and citations persistence
  await t.test('9. Findings and exact source citations persist faithfully', async () => {
    const mockClient = createMockSupabaseClient();
    const repo = new SupabaseStorageRepository({ client: mockClient });
    const wsId = generateSecureWorkspaceId();
    const project = await repo.createWorkspace(wsId);

    const finding = {
      id: 'FIND-DEC-01',
      type: 'decision',
      title: 'PostgreSQL Relational Schema',
      summary: 'Adopted Supabase PostgreSQL JSONB aggregate model.',
      reasoning: 'ACID compliance and zero data impedance.',
      impact: 'Zero-downtime cutover.',
      status: 'VERIFIED',
      evidenceValidity: 'MATCHED',
      claimStatus: 'SUPPORTED',
      confidence: 98,
      category: 'Architecture',
      urgency: 'high',
      owner: 'Sanshrey Sanagar',
      createdDate: '2026-11-10',
      approved: false,
      rejected: false,
      citations: [
        {
          id: 'cit-01',
          sourceId: 'src-01',
          sourceName: 'schema.sql',
          sourceType: 'docs',
          file: 'schema.sql',
          lineRange: '1-30',
          pageNumber: 1,
          lineNumber: 10,
          author: 'Sanshrey Sanagar',
          timestamp: new Date().toISOString(),
          snippet: 'CREATE TABLE IF NOT EXISTS workspaces',
          contentHash: 'sha256:abcd1234',
          clearanceTier: 'INTERNAL',
          confidence: 98,
        },
      ],
    };

    project.findings = [finding];
    await repo.saveProject(wsId, project);

    const reloaded = await repo.getWorkspace(wsId);
    assert.strictEqual(reloaded.findings.length, 1);
    const f = reloaded.findings[0];
    assert.strictEqual(f.title, 'PostgreSQL Relational Schema');
    assert.strictEqual(f.citations.length, 1);
    assert.strictEqual(f.citations[0].snippet, 'CREATE TABLE IF NOT EXISTS workspaces');
    assert.strictEqual(f.citations[0].pageNumber, 1);
  });

  // 10. Review approval, rejection, and audit history persistence
  await t.test('10. Review approval, rejection, and audit history persistence', async () => {
    const mockClient = createMockSupabaseClient();
    const repo = new SupabaseStorageRepository({ client: mockClient });
    const wsId = generateSecureWorkspaceId();
    const project = await repo.createWorkspace(wsId);

    project.findings = [
      {
        id: 'FIND-REV-01',
        type: 'task',
        title: 'Run migrations',
        summary: 'Execute schema migrations.',
        status: 'VERIFIED',
        evidenceValidity: 'MATCHED',
        claimStatus: 'SUPPORTED',
        confidence: 95,
        category: 'Database',
        urgency: 'critical',
        owner: 'Samyak Gedam',
        createdDate: '2026-11-10',
        approved: false,
        rejected: false,
        citations: [
          {
            id: 'c1',
            sourceId: 's1',
            sourceName: 'mig.sql',
            sourceType: 'docs',
            file: 'mig.sql',
            lineRange: '1-5',
            author: 'Samyak',
            timestamp: new Date().toISOString(),
            snippet: 'CREATE TABLE',
            contentHash: 'hash',
            clearanceTier: 'INTERNAL',
            confidence: 95,
          },
        ],
      },
    ];
    await repo.saveProject(wsId, project);

    // Approve finding
    const approvedProj = await repo.approveFinding(wsId, 'FIND-REV-01', 'Verified migrations pass', 'Sanshrey');
    const fApproved = approvedProj.findings[0];
    assert.strictEqual(fApproved.approved, true);
    assert.strictEqual(fApproved.reviewStatus, 'APPROVED');

    // Verify audit log
    const auditHistory = await repo.getReviewAuditHistory(wsId, 'FIND-REV-01');
    assert.strictEqual(auditHistory.length, 1);
    assert.strictEqual(auditHistory[0].actionType, 'APPROVE');
    assert.strictEqual(auditHistory[0].reviewerName, 'Sanshrey');

    // Reject finding with reason
    const rejectedProj = await repo.rejectFinding(wsId, 'FIND-REV-01', 'Postgres version incompatible', 'Sanshrey');
    const fRejected = rejectedProj.findings[0];
    assert.strictEqual(fRejected.approved, false);
    assert.strictEqual(fRejected.rejected, true);
    assert.strictEqual(fRejected.reviewStatus, 'REJECTED');

    // Reject without reason must fail
    await assert.rejects(
      async () => {
        await repo.rejectFinding(wsId, 'FIND-REV-01', '', 'Sanshrey');
      },
      /rejection reason is strictly required/i
    );
  });

  // 11. Conflict persistence and resolution
  await t.test('11. Conflict record persistence and interactive resolution', async () => {
    const mockClient = createMockSupabaseClient();
    const repo = new SupabaseStorageRepository({ client: mockClient });
    const wsId = generateSecureWorkspaceId();
    const project = await repo.createWorkspace(wsId);

    const findingA = {
      id: 'FIND-CONF-A',
      type: 'decision',
      title: 'Target DB: PostgreSQL',
      summary: 'PostgreSQL adopted.',
      status: 'CONFLICTING',
      claimStatus: 'CONFLICTING',
      confidence: 80,
      category: 'DB',
      urgency: 'high',
      owner: 'Alice',
      createdDate: '2026-11-08',
      approved: false,
      citations: [],
    };
    const findingB = {
      id: 'FIND-CONF-B',
      type: 'decision',
      title: 'Target DB: MySQL',
      summary: 'MySQL chosen.',
      status: 'CONFLICTING',
      claimStatus: 'CONFLICTING',
      confidence: 80,
      category: 'DB',
      urgency: 'high',
      owner: 'Bob',
      createdDate: '2026-11-09',
      approved: false,
      citations: [],
    };

    project.findings = [findingA, findingB];
    const conflict = {
      id: 'CONF-001',
      workspaceId: wsId,
      findingIdA: 'FIND-CONF-A',
      findingIdB: 'FIND-CONF-B',
      claimA: 'PostgreSQL adopted',
      claimB: 'MySQL chosen',
      sourceIdA: 'sA',
      sourceNameA: 'RFC-1',
      sourceIdB: 'sB',
      sourceNameB: 'RFC-2',
      quoteA: 'PostgreSQL',
      locationA: 'RFC-1:10',
      quoteB: 'MySQL',
      locationB: 'RFC-2:5',
      conflictCategory: 'architecture',
      explanation: 'Conflicting database targets',
      severity: 'critical',
      status: 'OPEN',
    };

    project.findings = [findingA, findingB];
    project.conflicts = [conflict];
    await repo.saveProject(wsId, project);

    // Resolve conflict choosing finding A
    const resolvedProj = await repo.resolveConflictRecord(
      wsId,
      'CONF-001',
      'FIND-CONF-A',
      'PostgreSQL confirmed as authoritative',
      'Lead Reviewer'
    );

    const updatedConf = resolvedProj.conflicts[0];
    assert.strictEqual(updatedConf.status, 'RESOLVED');
    assert.strictEqual(updatedConf.resolution.chosenFindingId, 'FIND-CONF-A');

    const resolvedA = resolvedProj.findings.find((f) => f.id === 'FIND-CONF-A');
    const resolvedB = resolvedProj.findings.find((f) => f.id === 'FIND-CONF-B');
    assert.strictEqual(resolvedA.approved, true);
    assert.strictEqual(resolvedB.rejected, true);
  });

  // 12. Existing handover approval and conflict gates
  await t.test('12. Handover gates enforce review approvals and block conflicts', async () => {
    const mockClient = createMockSupabaseClient();
    const repo = new SupabaseStorageRepository({ client: mockClient });
    const wsId = generateSecureWorkspaceId();
    const project = await repo.createWorkspace(wsId);

    // Open conflict blocks direct approval
    project.conflicts = [
      {
        id: 'CONF-GATE',
        workspaceId: wsId,
        findingIdA: 'F1',
        findingIdB: 'F2',
        claimA: 'A',
        claimB: 'B',
        sourceIdA: 'sA',
        sourceNameA: 'nA',
        sourceIdB: 'sB',
        sourceNameB: 'nB',
        quoteA: 'qA',
        locationA: 'lA',
        quoteB: 'qB',
        locationB: 'lB',
        conflictCategory: 'general',
        explanation: 'Conflict',
        severity: 'high',
        status: 'OPEN',
      },
    ];
    project.findings = [
      {
        id: 'F1',
        type: 'decision',
        title: 'Finding 1',
        summary: 'Summary',
        status: 'CONFLICTING',
        confidence: 80,
        category: 'Cat',
        urgency: 'medium',
        owner: 'Owner',
        createdDate: '2026-11-10',
        approved: false,
        citations: [],
      },
    ];
    await repo.saveProject(wsId, project);

    await assert.rejects(
      async () => {
        await repo.approveFinding(wsId, 'F1', 'Approve conflicting claim', 'Reviewer');
      },
      /unresolved conflict/i
    );
  });

  // 13. Handover version history preservation
  await t.test('13. Handover versioning increments and archives previous versions', async () => {
    const mockClient = createMockSupabaseClient();
    const repo = new SupabaseStorageRepository({ client: mockClient });
    const wsId = generateSecureWorkspaceId();
    const project = await repo.createWorkspace(wsId);

    // Add eligible approved finding
    project.findings = [
      {
        id: 'F-APPROVED',
        type: 'decision',
        title: 'Core Engine Cutover',
        summary: 'Migrated to Supabase backend.',
        status: 'VERIFIED',
        evidenceValidity: 'MATCHED',
        claimStatus: 'SUPPORTED',
        reviewStatus: 'APPROVED',
        confidence: 99,
        category: 'Core',
        urgency: 'high',
        owner: 'Sanshrey',
        createdDate: '2026-11-10',
        approved: true,
        rejected: false,
        citations: [
          {
            id: 'c1',
            sourceId: 's1',
            sourceName: 'doc.md',
            sourceType: 'docs',
            file: 'doc.md',
            lineRange: '1-10',
            author: 'Sanshrey',
            timestamp: new Date().toISOString(),
            snippet: 'Migrated to Supabase',
            contentHash: 'hash',
            clearanceTier: 'INTERNAL',
            confidence: 99,
          },
        ],
      },
    ];
    await repo.saveProject(wsId, project);

    // Generate version 1.0
    const v1 = await repo.generateAndSaveHandover(wsId, 'Sanshrey', { version: 'v1.0' });
    assert.strictEqual(v1.handover.version, 'v1.0');
    assert.strictEqual(v1.project.handoverCertified, true);

    // Generate version 1.1
    const v2 = await repo.generateAndSaveHandover(wsId, 'Sanshrey', { version: 'v1.1' });
    assert.strictEqual(v2.handover.version, 'v1.1');

    const history = await repo.getHandoverHistory(wsId);
    assert.strictEqual(history.length, 2);
    assert.strictEqual(history[0].version, 'v1.0');
    assert.strictEqual(history[1].version, 'v1.1');
  });

  // 14. Share-link creation, retrieval, and revocation
  await t.test('14. Public share-link creation, O(1) retrieval, and revocation', async () => {
    const mockClient = createMockSupabaseClient();
    const repo = new SupabaseStorageRepository({ client: mockClient });
    const wsId = generateSecureWorkspaceId();
    const project = await repo.createWorkspace(wsId);

    project.findings = [
      {
        id: 'F-SHARE',
        type: 'decision',
        title: 'Share Verification Test',
        summary: 'Verifying zero-auth public share.',
        status: 'VERIFIED',
        evidenceValidity: 'MATCHED',
        claimStatus: 'SUPPORTED',
        reviewStatus: 'APPROVED',
        confidence: 99,
        category: 'Share',
        urgency: 'low',
        owner: 'Sanshrey',
        createdDate: '2026-11-10',
        approved: true,
        rejected: false,
        citations: [],
      },
    ];
    await repo.saveProject(wsId, project);

    const gen = await repo.generateAndSaveHandover(wsId, 'Sanshrey');
    const share = await repo.createShareToken(wsId, gen.handover.id);

    assert.ok(share.token.startsWith('kt_share_'));
    assert.strictEqual(share.isActive, true);

    // Public retrieval via share token
    const publicResult = await repo.getSharedHandover(share.token);
    assert.ok(publicResult.handover);
    assert.strictEqual(publicResult.handover.id, gen.handover.id);
    assert.strictEqual(publicResult.projectName, project.name);

    // Revoke share token
    const revoked = await repo.revokeShareToken(wsId, share.token);
    assert.strictEqual(revoked, true);

    // Subsequent retrieval must fail
    await assert.rejects(
      async () => {
        await repo.getSharedHandover(share.token);
      },
      /revoked/i
    );
  });

  // 15. Share tokens are stored hashed, not in plaintext
  await t.test('15. Share tokens are stored strictly as SHA-256 hashes in database and state', async () => {
    const mockClient = createMockSupabaseClient();
    const repo = new SupabaseStorageRepository({ client: mockClient });
    const wsId = generateSecureWorkspaceId();
    const project = await repo.createWorkspace(wsId);

    project.findings = [
      {
        id: 'F-HASH',
        type: 'task',
        title: 'Security check',
        summary: 'Token hashing verification',
        status: 'VERIFIED',
        evidenceValidity: 'MATCHED',
        claimStatus: 'SUPPORTED',
        reviewStatus: 'APPROVED',
        confidence: 99,
        category: 'Sec',
        urgency: 'high',
        owner: 'Sanshrey',
        createdDate: '2026-11-10',
        approved: true,
        citations: [],
      },
    ];
    await repo.saveProject(wsId, project);

    const gen = await repo.generateAndSaveHandover(wsId, 'Sanshrey');
    const share = await repo.createShareToken(wsId, gen.handover.id);
    const rawToken = share.token;

    // Check handover_shares table in mockClient
    const expectedHash = hashShareToken(rawToken);
    assert.ok(mockClient._shares.has(expectedHash));
    const shareRow = mockClient._shares.get(expectedHash);
    assert.strictEqual(shareRow.token_hash, expectedHash);
    assert.strictEqual(shareRow.token, undefined); // No plaintext token column!

    // Check workspaces table project_data JSON string
    const wsRow = mockClient._workspaces.get(wsId);
    const jsonStr = JSON.stringify(wsRow.project_data);
    assert.strictEqual(
      jsonStr.includes(rawToken),
      false,
      'Security Invariant Violated: Raw share token was found stored in plaintext inside workspace JSONB state!'
    );
  });

  // 16. Security & Credential Protection: No secret credentials in client responses or bundles
  await t.test('16. Supabase secret keys are never exposed in client context', async () => {
    assert.strictEqual(typeof window, 'undefined');
    assert.strictEqual(process.env.NEXT_PUBLIC_SUPABASE_SECRET_KEY, undefined);
    assert.strictEqual(process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY, undefined);
  });

  // 17. Storage factory and fail-fast configuration checks
  await t.test('17. Storage factory routes based on STORAGE_BACKEND and fails fast when unconfigured', async () => {
    resetStorageInstance();
    const origBackend = process.env.STORAGE_BACKEND;
    const origUrl = process.env.SUPABASE_URL;
    const origKey = process.env.SUPABASE_SECRET_KEY;
    const origServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    try {
      // 1. Default backend should return DurableFileRepository
      delete process.env.STORAGE_BACKEND;
      const defaultStorage = getStorage();
      assert.ok(defaultStorage);
      resetStorageInstance();

      // 2. Explicit 'file' backend
      process.env.STORAGE_BACKEND = 'file';
      const fileStorage = getStorage();
      assert.ok(fileStorage);
      resetStorageInstance();

      // 3. STORAGE_BACKEND=supabase with missing credentials must throw SupabaseConfigError
      process.env.STORAGE_BACKEND = 'supabase';
      delete process.env.SUPABASE_URL;
      delete process.env.SUPABASE_SECRET_KEY;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      assert.throws(
        () => {
          getStorage();
        },
        (err) => err instanceof SupabaseConfigError || /Supabase/i.test(err.message)
      );
    } finally {
      // Clean up and restore original environment variables
      if (origBackend !== undefined) process.env.STORAGE_BACKEND = origBackend; else delete process.env.STORAGE_BACKEND;
      if (origUrl !== undefined) process.env.SUPABASE_URL = origUrl; else delete process.env.SUPABASE_URL;
      if (origKey !== undefined) process.env.SUPABASE_SECRET_KEY = origKey; else delete process.env.SUPABASE_SECRET_KEY;
      if (origServiceKey !== undefined) process.env.SUPABASE_SERVICE_ROLE_KEY = origServiceKey; else delete process.env.SUPABASE_SERVICE_ROLE_KEY;
      resetStorageInstance();
    }
  });

  // 18. Optional live Supabase integration test (runs conditionally when explicitly enabled)
  await t.test('18. Live Supabase integration test (conditional)', async () => {
    if (process.env.RUN_LIVE_SUPABASE_TEST !== 'true') {
      console.log('  ℹ SKIPPED: Live Supabase integration test disabled (set RUN_LIVE_SUPABASE_TEST=true after applying migrations to run).');
      return;
    }

    if (!isSupabaseConfigured()) {
      console.log('  ℹ SKIPPED: Live Supabase credentials not set in environment. Skipping live test.');
      return;
    }

    const config = getSupabaseConfig();
    const liveRepo = new SupabaseStorageRepository({ bucket: config.bucket });
    const liveWsId = `ws_live_test_${Date.now().toString(36)}`;

    try {
      const created = await liveRepo.createWorkspace(liveWsId);
      assert.ok(created);
      assert.strictEqual(created.handoverCertified, false);

      created.name = 'Live Supabase Test Workspace';
      await liveRepo.saveProject(liveWsId, created);

      const fetched = await liveRepo.getWorkspace(liveWsId);
      assert.ok(fetched);
      assert.strictEqual(fetched.name, 'Live Supabase Test Workspace');
    } finally {
      // Clean up test workspace from live database
      try {
        const client = liveRepo.client;
        if (client) {
          await client.from('workspaces').delete().eq('id', liveWsId);
        }
      } catch (cleanupErr) {
        console.warn('Warning: Could not clean up live test workspace:', cleanupErr);
      }
    }
  });
});
