import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DurableFileRepository } from '../server/db/storage.ts';
import { isValidWorkspaceId, sanitizeWorkspaceId } from '../server/db/types.ts';

const TEST_STORAGE_DIR = path.join(process.cwd(), '.data', 'test-workspaces');

// Helper to create clean test repository
function createTestRepo() {
  if (fs.existsSync(TEST_STORAGE_DIR)) {
    fs.rmSync(TEST_STORAGE_DIR, { recursive: true, force: true });
  }
  return new DurableFileRepository(TEST_STORAGE_DIR);
}

// Cleanup helper
function cleanupTestRepo() {
  if (fs.existsSync(TEST_STORAGE_DIR)) {
    fs.rmSync(TEST_STORAGE_DIR, { recursive: true, force: true });
  }
}

test('Persistence & Multi-Workspace Isolation Test Suite', async (t) => {
  t.after(cleanupTestRepo);

  await t.test('Scenario A & F: New anonymous workspace initializes preloaded Project Titan demo', async () => {
    const repo = createTestRepo();
    const workspaceId = 'ws_anon_visitor_001';

    const project = await repo.createWorkspace(workspaceId);
    assert.ok(project, 'Project must be created');
    assert.strictEqual(project.id, 'proj-titan-001');
    assert.strictEqual(project.name, 'Project Titan Handover');
    assert.ok(project.findings.length >= 10, 'Must have pre-seeded findings');
    assert.ok(project.sources.length >= 4, 'Must have pre-seeded sources');
  });

  await t.test('Scenario B: Finding approval persists across fresh repository read', async () => {
    const repo = createTestRepo();
    const workspaceId = 'ws_anon_visitor_002';
    await repo.createWorkspace(workspaceId);

    // Target an unapproved finding
    const targetFindingId = 'FIND-DEC-04'; // Cache Strategy Conflict
    const reviewerNotes = 'Lead Architect human verification approved during audit.';

    await repo.approveFinding(workspaceId, targetFindingId, reviewerNotes);

    // Read afresh from a new repository instance pointing to the same storage dir
    const freshRepo = new DurableFileRepository(TEST_STORAGE_DIR);
    const refreshedProject = await freshRepo.getWorkspace(workspaceId);

    assert.ok(refreshedProject, 'Project must exist after reload');
    const updatedFinding = refreshedProject.findings.find((f) => f.id === targetFindingId);
    assert.ok(updatedFinding, 'Finding must exist');
    assert.strictEqual(updatedFinding.approved, true, 'Approved state must be persisted');
    assert.strictEqual(updatedFinding.rejected, false, 'Rejected must be false');
    assert.strictEqual(updatedFinding.reviewerNotes, reviewerNotes, 'Reviewer notes must persist');
  });

  await t.test('Scenario C: Finding edit persists across fresh repository read', async () => {
    const repo = createTestRepo();
    const workspaceId = 'ws_anon_visitor_003';
    await repo.createWorkspace(workspaceId);

    const targetFindingId = 'FIND-DEC-01';
    const newTitle = 'Updated PostgreSQL Cluster Migration Decision';
    const newImpact = 'Zero-downtime cutover validated in staging.';

    await repo.editFinding(workspaceId, targetFindingId, {
      title: newTitle,
      impact: newImpact,
    });

    const freshRepo = new DurableFileRepository(TEST_STORAGE_DIR);
    const refreshedProject = await freshRepo.getWorkspace(workspaceId);
    const edited = refreshedProject.findings.find((f) => f.id === targetFindingId);

    assert.strictEqual(edited.title, newTitle, 'Edited title must persist');
    assert.strictEqual(edited.impact, newImpact, 'Edited impact must persist');
  });

  await t.test('Scenario D: Added project notes & synthetic finding persist across reload', async () => {
    const repo = createTestRepo();
    const workspaceId = 'ws_anon_visitor_004';
    await repo.createWorkspace(workspaceId);

    const sourceData = {
      name: 'architecture_transfer_notes_v2.md',
      type: 'notes',
      content: 'Critical deployment rule: Never deploy database migrations without testing rollback script.',
      description: 'Handover transfer notes provided by outgoing lead.',
    };

    const result = await repo.addSource(workspaceId, sourceData);
    assert.ok(result.source.id, 'New source ID must be generated');
    assert.ok(result.finding.id, 'Synthetic finding must be generated');

    // Reload from storage
    const freshRepo = new DurableFileRepository(TEST_STORAGE_DIR);
    const refreshed = await freshRepo.getWorkspace(workspaceId);

    const persistedSource = refreshed.sources.find((s) => s.id === result.source.id);
    const persistedFinding = refreshed.findings.find((f) => f.id === result.finding.id);

    assert.ok(persistedSource, 'Source must persist');
    assert.strictEqual(persistedSource.name, sourceData.name);
    assert.ok(persistedFinding, 'Synthetic finding must persist');
    assert.strictEqual(persistedFinding.citations[0].sourceName, sourceData.name);
  });

  await t.test('Scenario E: Conflict resolution and handover certification persist', async () => {
    const repo = createTestRepo();
    const workspaceId = 'ws_anon_visitor_005';
    const project = await repo.createWorkspace(workspaceId);

    // Resolve the conflicting finding FIND-DEC-04
    await repo.resolveConflict(
      workspaceId,
      'FIND-DEC-04',
      'Adopted Redis Cluster v7 with active TTL replication.',
      'Samyak Gedam'
    );

    // Approve all remaining findings to satisfy Phase A gate
    const current = await repo.getWorkspace(workspaceId);
    for (const f of current.findings) {
      if (!f.approved) {
        await repo.approveFinding(workspaceId, f.id, 'Batch reviewed and verified');
      }
    }

    // Now certify the handover
    const certified = await repo.certifyHandover(workspaceId, 'Elena Rostova & Marcus Vance');
    assert.strictEqual(certified.handoverCertified, true, 'Handover must be marked certified');
    assert.ok(certified.certificationHash.startsWith('SHA256:'), 'Certification hash must exist');

    // Reload afresh
    const freshRepo = new DurableFileRepository(TEST_STORAGE_DIR);
    const reloaded = await freshRepo.getWorkspace(workspaceId);

    assert.strictEqual(reloaded.handoverCertified, true, 'Certification status must persist on reload');
    assert.strictEqual(reloaded.certifiedBy, 'Elena Rostova & Marcus Vance');
    assert.strictEqual(reloaded.certificationHash, certified.certificationHash);
  });

  await t.test('Scenario F: Multi-visitor anonymous workspace isolation', async () => {
    const repo = createTestRepo();
    const workspaceA = 'ws_anon_user_alpha';
    const workspaceB = 'ws_anon_user_beta';

    await repo.createWorkspace(workspaceA);
    await repo.createWorkspace(workspaceB);

    // Mutate Workspace A: approve finding FIND-DEC-04, edit project title
    await repo.approveFinding(workspaceA, 'FIND-DEC-04', 'Reviewed only in Alpha');
    await repo.editFinding(workspaceA, 'FIND-DEC-01', { title: 'Alpha Custom Title' });

    // Read Workspace B: must NOT have Alpha mutations
    const freshRepo = new DurableFileRepository(TEST_STORAGE_DIR);
    const projectB = await freshRepo.getWorkspace(workspaceB);
    const projectA = await freshRepo.getWorkspace(workspaceA);

    const finding004InB = projectB.findings.find((f) => f.id === 'FIND-DEC-04');
    const finding004InA = projectA.findings.find((f) => f.id === 'FIND-DEC-04');

    assert.strictEqual(finding004InA.approved, true, 'Finding in Workspace A must be approved');
    assert.strictEqual(finding004InB.approved, false, 'Finding in Workspace B must remain unapproved');

    const finding001InB = projectB.findings.find((f) => f.id === 'FIND-DEC-01');
    assert.notStrictEqual(finding001InB.title, 'Alpha Custom Title', 'Workspace B must not be polluted by A');
  });

  await t.test('Scenario G: Reset workspace restores clean initial demo data', async () => {
    const repo = createTestRepo();
    const workspaceId = 'ws_anon_reset_test';
    await repo.createWorkspace(workspaceId);

    // Mutate finding
    await repo.approveFinding(workspaceId, 'FIND-DEC-04', 'Mutated');
    const mutated = await repo.getWorkspace(workspaceId);
    assert.strictEqual(mutated.findings.find((f) => f.id === 'FIND-DEC-04').approved, true);

    // Reset
    const reset = await repo.resetWorkspace(workspaceId);
    assert.strictEqual(reset.findings.find((f) => f.id === 'FIND-DEC-04').approved, false, 'Reset must restore unapproved state');

    // Reload
    const fresh = await repo.getWorkspace(workspaceId);
    assert.strictEqual(fresh.findings.find((f) => f.id === 'FIND-DEC-04').approved, false);
  });

  await t.test('Security: Workspace ID validation strictly prevents path traversal and invalid characters', async () => {
    assert.strictEqual(isValidWorkspaceId('valid_workspace_123'), true);
    assert.strictEqual(isValidWorkspaceId('ws-user-abc-456'), true);
    assert.strictEqual(isValidWorkspaceId('../etc/passwd'), false, 'Path traversal must be rejected');
    assert.strictEqual(isValidWorkspaceId('ws/sub/dir'), false, 'Path slashes must be rejected');
    assert.strictEqual(isValidWorkspaceId('ws space'), false, 'Spaces must be rejected');
    assert.strictEqual(isValidWorkspaceId('ab'), false, 'Too short ID must be rejected');
    assert.strictEqual(isValidWorkspaceId(null), false, 'Non-string must be rejected');

    assert.strictEqual(sanitizeWorkspaceId('clean_ws_id'), 'clean_ws_id');
    assert.strictEqual(sanitizeWorkspaceId('../../hacked'), null);
  });

  await t.test('Phase A Gate: Persistence prevents handover certification if blockers exist', async () => {
    const repo = createTestRepo();
    const workspaceId = 'ws_anon_blocked_cert';
    await repo.createWorkspace(workspaceId);

    // Initial project has unresolved conflict (FIND-009) and unreviewed items
    await assert.rejects(
      async () => {
        await repo.certifyHandover(workspaceId, 'Signer');
      },
      /Handover cannot be certified/,
      'Must reject certification when unreviewed items or conflicts exist'
    );
  });
});
