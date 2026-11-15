/**
 * Automated Test Suite: GitHub AI Knowledge Extraction & Grounding
 * (KnoTrail Round 3 Phase 1 - Milestone 1.2)
 *
 * Verifies the end-to-end knowledge extraction and evidence grounding pipeline
 * for ingested GitHub repository sources (commits, PRs, issues, and docs):
 * 1. Commit-based extraction: technical decisions, implementation context, commit SHA & URL.
 * 2. PR-based extraction: feature descriptions, reviews, merge status, PR number & URL.
 * 3. Issue-based extraction: operational blockers, bug resolutions, issue number & URL.
 * 4. GitHub provenance propagation: full GitHubEvidenceProvenance attached to EvidenceCitation.
 * 5. Invalid/missing evidence rejection: empty quotes marked MISSING, hallucinated quotes marked UNCERTAIN.
 * 6. Verification pipeline enforcement: verifyFindingEvidence validates coordinates and flags mismatches.
 * 7. Human review integration: newly extracted GitHub findings require explicit human approval (approved: false).
 * 8. Approved-only handover export: unapproved findings are strictly excluded from generated handovers.
 *
 * Governance: CodersInPune Hackathon 2026 - Deploy_or_Die (Samyak Gedam & Sanshrey Sanagar)
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  groundFinding,
  buildKnowledgeFinding,
  findQuoteInText,
  calculateCoordinates,
  extractGitHubProvenanceFromText,
} from '../server/ai/grounding.ts';
import { runKnowledgeExtractionPipeline } from '../server/ai/pipeline.ts';
import { buildExtractionPrompt } from '../server/ai/gemini.ts';
import { verifyFindingEvidence, deriveCompositeStatus } from '../server/verification/verifier.ts';
import { getEligibleHandoverFindings, buildHandoverDocument } from '../server/handover/generator.ts';

// Deterministic Mock GitHub Repository Source Document
const MOCK_GITHUB_SOURCE_TEXT = `# GitHub Repository: vitsamyak/KnoTrail-Core
Source Type: GitHub Repository Integration | Default Branch: main | Synced Branch: main
Language: TypeScript | Stars: 42 | Forks: 5 | Visibility: Public
Repository URL: https://github.com/vitsamyak/KnoTrail-Core
Last Pushed: 2026-11-15T12:00:00Z
Description: Engineering knowledge continuity engine for technical teams

## Section 1: Commit History (2 commits on main)
---
### Commit a1b2c3d
- Full SHA: a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2
- Author: Samyak Gedam <samyak@knotrail.demo>
- Date: 2026-11-14T10:00:00Z
- URL: https://github.com/vitsamyak/KnoTrail-Core/commit/a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2
- Message:
  feat(db): switch PostgreSQL port from 5432 to 5433 to avoid local port collision
  Architectural decision to isolate local database containers from host postgres service.
- Files Changed:
  * [modified] src/server/db/config.ts (+3, -1)

### Commit b2c3d4e
- Full SHA: b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3
- Author: Sanshrey Sanagar <sanshrey@knotrail.demo>
- Date: 2026-11-13T16:00:00Z
- URL: https://github.com/vitsamyak/KnoTrail-Core/commit/b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3
- Message:
  refactor(auth): enforce HMAC-SHA256 server session verification for all protected routes

## Section 2: Pull Requests (1 recent pull requests)
---
### Pull Request #14: Enforce Zero Fake AI Invariant across all ingestion endpoints
- State: MERGED
- Author: samyakvikasgedam | Base: main <- Head: feat/zero-fake-ai
- Created: 2026-11-13T18:00:00Z | Merged: 2026-11-14T11:00:00Z
- URL: https://github.com/vitsamyak/KnoTrail-Core/pull/14
- Labels: security, core-logic
- Description:
  Decided that unconfigured AI requests must return 428 status instead of synthesizing fabricated claims.
  This preserves the zero-hallucination invariant during judge evaluations.
- Reviews:
  * sanshrey7273 [APPROVED]: LGTMT. Zero fake AI guarantee verified.

## Section 3: Issues & Discussions (1 recent issues)
---
### Issue #22: Deprecate legacy mock storage in production runtime
- State: CLOSED | Author: samyakvikasgedam
- Created: 2026-11-12T09:00:00Z | Closed: 2026-11-13T15:00:00Z
- URL: https://github.com/vitsamyak/KnoTrail-Core/issues/22
- Labels: bug, infrastructure
- Assignees: sanshrey7273
- Description:
  Operational decision: Storage backend must fail-fast if Supabase credentials are missing in production.
- Comments:
  * sanshrey7273 (2026-11-13T14:30:00Z): Implemented storage factory fail-fast check in Phase H.

## Section 4: Architecture & Project Documentation (README.md)
---
File: README.md | SHA: readme_sha_12345 | Size: 78 B

# KnoTrail Core
Deterministic operational knowledge handover platform.
`;

const mockGitHubSource = {
  id: 'src_gh_12345678',
  name: 'GitHub: vitsamyak/KnoTrail-Core',
  type: 'github',
  status: 'connected',
  lastSync: '2026-11-15T12:00:00Z',
  recordCount: 5,
  icon: 'commit',
  description: 'Ingested 2 commits, 1 pull requests, and 1 issues from vitsamyak/KnoTrail-Core (main).',
  privacyLevel: 'LOCAL_READ_ONLY',
  documentData: {
    fileFormat: 'md',
    mimeType: 'text/markdown',
    fileSizeBytes: Buffer.byteLength(MOCK_GITHUB_SOURCE_TEXT),
    fileSizeFormatted: '2.5 KB',
    contentHash: 'mock_sha256_hash_github_source',
    extractedText: MOCK_GITHUB_SOURCE_TEXT,
    lineCount: MOCK_GITHUB_SOURCE_TEXT.split('\n').length,
  },
  githubMetadata: {
    id: 12345678,
    owner: 'vitsamyak',
    name: 'KnoTrail-Core',
    fullName: 'vitsamyak/KnoTrail-Core',
    defaultBranch: 'main',
    htmlUrl: 'https://github.com/vitsamyak/KnoTrail-Core',
  },
  githubIntegrationId: 'ghi_test_integration_1',
};

test('▶ Phase 1 - Milestone 1.2: GitHub AI Knowledge Extraction & Evidence Grounding', async (t) => {
  // 1. Prompt builder domain rules for GitHub sources
  await t.test('1. Prompt builder: adds specialized GitHub extraction rules for commits, PRs, and issues', () => {
    const prompt = buildExtractionPrompt(mockGitHubSource.name, mockGitHubSource.documentData.extractedText);
    assert.ok(prompt.includes('GITHUB REPOSITORY EXTRACTION RULES'));
    assert.ok(prompt.includes('Do NOT treat trivial typo fixes'));
    assert.ok(prompt.includes('From pull requests: Extract feature descriptions'));
    assert.ok(prompt.includes('From issues: Extract verified bugs'));
  });

  // 2. Commit-based knowledge extraction & grounding
  await t.test('2. Commit extraction: extracts technical decision with commit SHA, author, and commit URL', () => {
    const rawFinding = {
      type: 'decision',
      title: 'PostgreSQL Host Port Reconfiguration',
      summary: 'Switched database port from 5432 to 5433 to avoid local host collision.',
      category: 'Database Infrastructure',
      urgency: 'high',
      reasoning: 'Isolates local container PostgreSQL from any existing system service on host.',
      impact: 'Eliminates bind socket errors during development initialization.',
      supportingQuote: 'switch PostgreSQL port from 5432 to 5433 to avoid local port collision',
      sourceId: mockGitHubSource.id,
      claimedConfidence: 95,
      isConflict: false,
    };

    const grounding = groundFinding(rawFinding, mockGitHubSource);
    assert.equal(grounding.status, 'VERIFIED');
    assert.equal(grounding.confidence, 95);
    assert.equal(grounding.citations.length, 1);

    const citation = grounding.citations[0];
    assert.equal(citation.sourceType, 'github');
    assert.equal(citation.commitSha, 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2');
    assert.equal(citation.author, 'Samyak Gedam');
    assert.equal(
      citation.githubUrl,
      'https://github.com/vitsamyak/KnoTrail-Core/commit/a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2'
    );
    assert.ok(citation.lineRange.includes('Line'));

    // Verify KnowledgeFinding structure
    const finding = buildKnowledgeFinding(rawFinding, grounding);
    assert.equal(finding.status, 'VERIFIED');
    assert.equal(finding.owner, 'Samyak Gedam', 'Should resolve owner to commit author');
    assert.equal(finding.approved, false, 'MANDATORY INVARIANT: Newly extracted findings must be unapproved');
  });

  // 3. Pull Request-based knowledge extraction & grounding
  await t.test('3. PR extraction: extracts decision with PR number, PR author, and pull request URL', () => {
    const rawFinding = {
      type: 'decision',
      title: 'Zero Fake AI Policy Enforcement',
      summary: 'Unconfigured AI requests return status 428 to prevent synthesized or hallucinated claims.',
      category: 'System Security',
      urgency: 'critical',
      reasoning: 'Guarantees truthful evaluation during judge review.',
      impact: 'Blocks fake AI output from being presented as real evidence.',
      supportingQuote: 'unconfigured AI requests must return 428 status instead of synthesizing fabricated claims',
      sourceId: mockGitHubSource.id,
      claimedConfidence: 98,
      isConflict: false,
    };

    const grounding = groundFinding(rawFinding, mockGitHubSource);
    assert.equal(grounding.status, 'VERIFIED');
    assert.equal(grounding.citations.length, 1);

    const citation = grounding.citations[0];
    assert.equal(citation.sourceType, 'github');
    assert.equal(citation.prNumber, 14);
    assert.equal(citation.author, 'samyakvikasgedam');
    assert.equal(citation.githubUrl, 'https://github.com/vitsamyak/KnoTrail-Core/pull/14');

    const finding = buildKnowledgeFinding(rawFinding, grounding);
    assert.equal(finding.owner, 'samyakvikasgedam');
    assert.equal(finding.approved, false);
  });

  // 4. Issue-based knowledge extraction & grounding
  await t.test('4. Issue extraction: extracts operational task & resolution with issue number, assignee, and issue URL', () => {
    const rawFinding = {
      type: 'task',
      title: 'Legacy Mock Storage Deprecation',
      summary: 'Storage backend must fail fast when Supabase credentials are not configured in production.',
      category: 'Infrastructure Resilience',
      urgency: 'high',
      owner: 'sanshrey7273',
      supportingQuote: 'Storage backend must fail-fast if Supabase credentials are missing in production',
      sourceId: mockGitHubSource.id,
      claimedConfidence: 94,
      isConflict: false,
    };

    const grounding = groundFinding(rawFinding, mockGitHubSource);
    assert.equal(grounding.status, 'VERIFIED');

    const citation = grounding.citations[0];
    assert.equal(citation.sourceType, 'github');
    assert.equal(citation.issueNumber, 22);
    assert.equal(citation.githubUrl, 'https://github.com/vitsamyak/KnoTrail-Core/issues/22');

    const finding = buildKnowledgeFinding(rawFinding, grounding);
    assert.equal(finding.owner, 'sanshrey7273');
    assert.equal(finding.approved, false);
  });

  // 5. GitHub Provenance structure propagation
  await t.test('5. Provenance integrity: constructs complete GitHubEvidenceProvenance object', () => {
    const rawFinding = {
      type: 'decision',
      title: 'Postgres Configuration',
      summary: 'Switch port',
      category: 'DB',
      urgency: 'high',
      supportingQuote: 'Architectural decision to isolate local database containers from host postgres service.',
    };

    const grounding = groundFinding(rawFinding, mockGitHubSource);
    const citation = grounding.citations[0];
    assert.ok(citation.gitHubProvenance, 'gitHubProvenance must be defined on verified GitHub citations');

    const prov = citation.gitHubProvenance;
    assert.equal(prov.repositoryId, 12345678);
    assert.equal(prov.repositoryOwner, 'vitsamyak');
    assert.equal(prov.repositoryName, 'KnoTrail-Core');
    assert.equal(prov.repositoryFullName, 'vitsamyak/KnoTrail-Core');
    assert.equal(prov.branch, 'main');
    assert.equal(prov.commitSha, 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2');
    assert.ok(prov.contentHash.startsWith('sha256:'));
    assert.ok(prov.originalGitHubUrl.includes('commit/a1b2c3d'));
  });

  // 6. Invalid and missing evidence rejection
  await t.test('6. Evidence rejection: ungrounded quote marked UNCERTAIN; missing quote marked MISSING', () => {
    // A. Missing quote
    const missingFinding = {
      type: 'decision',
      title: 'Unsubstantiated Decision',
      summary: 'No proof provided',
      category: 'General',
      urgency: 'low',
      supportingQuote: '',
    };
    const missingGrounding = groundFinding(missingFinding, mockGitHubSource);
    assert.equal(missingGrounding.status, 'MISSING');
    assert.equal(missingGrounding.confidence, 25);
    assert.equal(missingGrounding.citations[0].gitHubProvenance, undefined, 'Must not attach GitHub provenance for missing quote');

    // B. Hallucinated / ungrounded quote not in GitHub source
    const hallucinatedFinding = {
      type: 'decision',
      title: 'Fabricated Migration',
      summary: 'Claims we migrated to CouchDB',
      category: 'Database',
      urgency: 'high',
      supportingQuote: 'We decided to migrate the entire system to CouchDB in commit 999999',
    };
    const hallucinatedGrounding = groundFinding(hallucinatedFinding, mockGitHubSource);
    assert.equal(hallucinatedGrounding.status, 'UNCERTAIN');
    assert.equal(hallucinatedGrounding.confidence, 45);
    assert.equal(hallucinatedGrounding.citations[0].author, 'AI Model (Ungrounded)');
    assert.equal(hallucinatedGrounding.citations[0].gitHubProvenance, undefined, 'Must not attach GitHub provenance for hallucinated quote');
  });

  // 7. Verification pipeline: verifyFindingEvidence checks
  await t.test('7. Verification pipeline: verifyFindingEvidence accurately verifies matched quotes and rejects mismatches', () => {
    const rawValid = {
      type: 'decision',
      title: 'Port Switch',
      summary: 'Database port change',
      category: 'DB',
      urgency: 'medium',
      supportingQuote: 'switch PostgreSQL port from 5432 to 5433 to avoid local port collision',
    };
    const validGrounding = groundFinding(rawValid, mockGitHubSource);
    const validFinding = buildKnowledgeFinding(rawValid, validGrounding);

    // 1. Verifying valid finding against workspace sources gives MATCHED
    const result1 = verifyFindingEvidence(validFinding, [mockGitHubSource]);
    assert.equal(result1.validity, 'MATCHED');
    assert.equal(result1.sourceFound, true);
    assert.equal(result1.validCoordinates, true);

    // 2. Tampered quote gives MISMATCHED
    const tamperedFinding = {
      ...validFinding,
      citations: [
        {
          ...validFinding.citations[0],
          snippet: 'Completely fabricated snippet not in document',
        },
      ],
    };
    const result2 = verifyFindingEvidence(tamperedFinding, [mockGitHubSource]);
    assert.equal(result2.validity, 'MISMATCHED');

    // 3. Out-of-bounds line numbers gives MISMATCHED
    const invalidCoordsFinding = {
      ...validFinding,
      citations: [
        {
          ...validFinding.citations[0],
          lineRange: 'Lines 9999-10000',
        },
      ],
    };
    const result3 = verifyFindingEvidence(invalidCoordsFinding, [mockGitHubSource]);
    assert.equal(result3.validity, 'MISMATCHED');
    assert.equal(result3.validCoordinates, false);
  });

  // 8. Human Review Workflow & Handover Gate Enforcement
  await t.test('8. Human review & handover: unapproved findings are strictly excluded from handover packages', async () => {
    const rawFinding = {
      type: 'decision',
      title: 'Port Switch Decision',
      summary: 'Database port change',
      category: 'DB',
      urgency: 'high',
      supportingQuote: 'switch PostgreSQL port from 5432 to 5433 to avoid local port collision',
    };
    const grounding = groundFinding(rawFinding, mockGitHubSource);
    const finding = buildKnowledgeFinding(rawFinding, grounding);

    // 1. Newly generated finding is unapproved
    assert.equal(finding.approved, false);
    assert.equal(finding.rejected, false);

    // 2. Handover filter strictly excludes unapproved finding
    const eligibleBefore = getEligibleHandoverFindings([finding]);
    assert.equal(eligibleBefore.length, 0, 'Unapproved GitHub findings MUST NOT be eligible for handover');

    // 3. Human reviewer approves the finding in Review Center
    const approvedFinding = {
      ...finding,
      approved: true,
      reviewStatus: 'APPROVED',
      reviewedBy: 'manager@knotrail.demo',
      reviewedAt: new Date().toISOString(),
      reviewerNotes: 'Verified against GitHub commit a1b2c3d.',
    };

    const eligibleAfter = getEligibleHandoverFindings([approvedFinding]);
    assert.equal(eligibleAfter.length, 1, 'Approved finding must be included in handover');
    assert.equal(eligibleAfter[0].citations[0].commitSha, 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2');

    // 4. Generate formal handover document and verify section counts
    const mockProject = {
      id: 'proj-test',
      name: 'KnoTrail Handover Test',
      code: 'KT-01',
      description: 'Handover testing with GitHub sources',
      targetExitDate: '2026-11-30',
      version: '1.0.0',
      lastAnalysed: 'Just now',
      lead: { id: 'lead-1', name: 'Samyak Gedam', role: 'Lead', email: 'lead@knotrail.demo', avatar: '', outgoing: true, transitionNotes: '' },
      stakeholders: [],
      sources: [mockGitHubSource],
      findings: [approvedFinding],
    };

    const handover = await buildHandoverDocument(mockProject);
    assert.equal(handover.sectionCounts.decisions, 1);
    assert.equal(handover.sectionCounts.totalApprovedFindings, 1);
    assert.equal(handover.evidenceInventory.length, 1);
    assert.equal(handover.evidenceInventory[0].citations[0].sourceType, 'github');
    assert.equal(handover.evidenceInventory[0].citations[0].commitSha, 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2');
  });

  // 9. End-to-end pipeline execution with mock LLM client
  await t.test('9. Pipeline execution: processes GitHub source with mock LLM client and returns grounded findings', async () => {
    const mockAiClient = {
      async generateContent() {
        return JSON.stringify([
          {
            type: 'decision',
            title: 'Database Port Relocation',
            summary: 'Moved port to 5433',
            category: 'Infrastructure',
            urgency: 'high',
            reasoning: 'Prevent port collision',
            impact: 'Seamless dev start',
            supportingQuote: 'switch PostgreSQL port from 5432 to 5433 to avoid local port collision',
            claimedConfidence: 95,
          },
          {
            type: 'task',
            title: 'Deprecate Legacy Storage',
            summary: 'Fail fast if credentials missing',
            category: 'Database',
            urgency: 'medium',
            supportingQuote: 'Storage backend must fail-fast if Supabase credentials are missing in production',
            claimedConfidence: 90,
          },
        ]);
      },
    };

    const response = await runKnowledgeExtractionPipeline([mockGitHubSource], {}, mockAiClient);

    assert.equal(response.success, true);
    assert.equal(response.findings.length, 2);
    assert.equal(response.telemetry.totalSourcesProcessed, 1);
    assert.equal(response.telemetry.verifiedFindingsCount, 2);

    const f1 = response.findings[0];
    assert.equal(f1.status, 'VERIFIED');
    assert.equal(f1.citations[0].sourceType, 'github');
    assert.equal(f1.citations[0].commitSha, 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2');

    const f2 = response.findings[1];
    assert.equal(f2.status, 'VERIFIED');
    assert.equal(f2.citations[0].sourceType, 'github');
    assert.equal(f2.citations[0].issueNumber, 22);
  });
});
