import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import {
  isGeminiConfigured,
  GeminiConfigError,
  buildExtractionPrompt,
  extractWithGemini,
} from '../server/ai/gemini.ts';
import {
  chunkDocument,
  deduplicateFindings,
  calculateTextSimilarity,
} from '../server/ai/chunker.ts';
import {
  findQuoteInText,
  calculateCoordinates,
  groundFinding,
  buildKnowledgeFinding,
} from '../server/ai/grounding.ts';
import { runKnowledgeExtractionPipeline } from '../server/ai/pipeline.ts';
import { DurableFileRepository } from '../server/db/storage.ts';
import { checkHandoverBlockStatus } from '../lib/handoverFilter.ts';

const TEST_DIR = path.join(process.cwd(), '.data', 'test-ai-workspaces');

// Mock source document content
const SAMPLE_TXT_DOC = `KnoTrail Platform Operational Specification v2.4
Author: Elena Rostova (Lead Architect)
Date: October 14, 2026

Section 1: Architecture Decisions
We decided to adopt Redis Cluster for session caching instead of Memcached.
Reasoning: Redis provides built-in persistence (RDB snapshots) and native pub/sub capabilities required for real-time handover sync.
Impact: Reduces database load by 68% and eliminates cache warm-up latency during deployments.

Section 2: Pending Operational Tasks
Task: Marcus Vance must complete the KMS key rotation script before November 12.
Urgency: High.

Section 3: System Dependencies
We depend on AWS KMS for envelope encryption and HashiCorp Vault for credentials storage.
The primary webhook receiver integrates with PagerDuty for on-call escalation.

Section 4: Key Contacts
Transition Lead: Marcus Vance (marcus.vance@deployordie.internal) - Incoming Core Lead
Security Contact: Alex Chen (alex.chen@deployordie.internal) - Cloud Infrastructure Lead

Section 5: Operational Risks
Risk: The Envoy proxy ingress has an unmitigated 15-minute connection spike vulnerability under TLS renegotiation bursts.

Section 6: Open Questions & Next Actions
Question: What is the exact failover timeout for the cross-region Aurora PostgreSQL replica?
Next Action: Benchmark Aurora failover latency in the staging environment using chaos-mesh.
`;

test('Phase D: Real AI Knowledge Extraction Test Suite', async (t) => {
  // Setup clean test directory
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(TEST_DIR, { recursive: true });

  t.after(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  await t.test('1. Server-side environment key validation with explicit error feedback', async () => {
    const originalKey = process.env.GEMINI_API_KEY;
    try {
      delete process.env.GEMINI_API_KEY;
      assert.strictEqual(isGeminiConfigured(), false, 'isGeminiConfigured must return false when key is absent');

      await assert.rejects(
        async () => {
          await extractWithGemini('spec.txt', 'Sample text');
        },
        (err) => {
          assert.ok(err instanceof GeminiConfigError);
          assert.match(err.message, /GEMINI_API_KEY is not configured/);
          return true;
        },
        'extractWithGemini must reject with GeminiConfigError when GEMINI_API_KEY is unset'
      );
    } finally {
      if (originalKey) process.env.GEMINI_API_KEY = originalKey;
    }
  });

  await t.test('2. Extraction prompt enforces Zero Fabrication and all 7 operational categories', () => {
    const prompt = buildExtractionPrompt('Architecture.md', 'Content snippet');

    assert.ok(prompt.includes('ZERO FABRICATION'), 'Prompt must enforce zero fabrication');
    assert.ok(prompt.includes('EXACT QUOTES'), 'Prompt must instruct verbatim supporting quotes');
    assert.ok(prompt.includes('"decision"'), 'Must include decision category');
    assert.ok(prompt.includes('"task"'), 'Must include task category');
    assert.ok(prompt.includes('"risk"'), 'Must include risk category');
    assert.ok(prompt.includes('"dependency"'), 'Must include dependency category');
    assert.ok(prompt.includes('"contact"'), 'Must include contact category');
    assert.ok(prompt.includes('"unresolved_question"'), 'Must include unresolved question category');
    assert.ok(prompt.includes('"next_action"'), 'Must include next action category');
    assert.ok(prompt.includes('reasoning'), 'Must require reasoning for decisions');
    assert.ok(prompt.includes('impact'), 'Must require impact for decisions');
  });

  await t.test('3. Entity Extraction & Grounding: Decisions with reasoning and impact', async () => {
    const rawDecision = {
      type: 'decision',
      title: 'Adopt Redis Cluster for Session Caching',
      summary: 'Replaced Memcached with Redis Cluster for operational session caching.',
      category: 'Architecture',
      urgency: 'high',
      owner: 'Elena Rostova',
      reasoning: 'Redis provides built-in persistence (RDB snapshots) and native pub/sub capabilities.',
      impact: 'Reduces database load by 68% and eliminates cache warm-up latency.',
      supportingQuote: 'We decided to adopt Redis Cluster for session caching instead of Memcached.',
      claimedConfidence: 96,
    };

    const mockSource = {
      id: 'src-spec-01',
      name: 'Specification.txt',
      type: 'docs',
      status: 'connected',
      lastSync: 'Just now',
      recordCount: 1,
      icon: 'description',
      description: 'System specifications',
      privacyLevel: 'LOCAL_READ_ONLY',
      documentData: {
        fileFormat: 'txt',
        mimeType: 'text/plain',
        fileSizeBytes: SAMPLE_TXT_DOC.length,
        fileSizeFormatted: '1.2 KB',
        contentHash: 'mockhash123',
        extractedText: SAMPLE_TXT_DOC,
        lineCount: 26,
      },
    };

    const grounding = groundFinding(rawDecision, mockSource);
    assert.strictEqual(grounding.status, 'VERIFIED', 'Verbatim quote must yield VERIFIED status');
    assert.ok(grounding.confidence >= 90, 'Confidence must be >= 90 for verified quotes');
    assert.strictEqual(grounding.citations.length, 1);
    assert.strictEqual(grounding.citations[0].file, 'Specification.txt');
    assert.match(grounding.citations[0].lineRange, /Line/);

    const finding = buildKnowledgeFinding(rawDecision, grounding);
    assert.strictEqual(finding.type, 'decision');
    assert.strictEqual(finding.approved, false, 'New findings must default to approved: false');
    assert.strictEqual(finding.rejected, false, 'New findings must default to rejected: false');
    assert.strictEqual(finding.reasoning, rawDecision.reasoning);
    assert.strictEqual(finding.impact, rawDecision.impact);
  });

  await t.test('4. Entity Extraction & Grounding: Operational Tasks with owner and urgency', async () => {
    const rawTask = {
      type: 'task',
      title: 'Complete KMS key rotation script',
      summary: 'Marcus Vance must complete the KMS key rotation script before November 12.',
      category: 'Security Runbook',
      urgency: 'high',
      owner: 'Marcus Vance',
      supportingQuote: 'Marcus Vance must complete the KMS key rotation script before November 12.',
      claimedConfidence: 95,
    };

    const mockSource = {
      id: 'src-spec-01',
      name: 'Specification.txt',
      type: 'docs',
      status: 'connected',
      lastSync: 'Just now',
      recordCount: 1,
      icon: 'description',
      description: 'System specifications',
      privacyLevel: 'LOCAL_READ_ONLY',
      documentData: {
        fileFormat: 'txt',
        mimeType: 'text/plain',
        fileSizeBytes: SAMPLE_TXT_DOC.length,
        fileSizeFormatted: '1.2 KB',
        contentHash: 'mockhash123',
        extractedText: SAMPLE_TXT_DOC,
      },
    };

    const grounding = groundFinding(rawTask, mockSource);
    assert.strictEqual(grounding.status, 'VERIFIED');
    const finding = buildKnowledgeFinding(rawTask, grounding);
    assert.strictEqual(finding.type, 'task');
    assert.strictEqual(finding.owner, 'Marcus Vance');
    assert.strictEqual(finding.urgency, 'high');
  });

  await t.test('5. Entity Extraction & Grounding: Operational Risks and Dependencies', async () => {
    const rawRisk = {
      type: 'risk',
      title: 'Envoy Proxy TLS Renegotiation Spike',
      summary: 'Connection spike vulnerability under TLS renegotiation bursts.',
      category: 'Network Security',
      urgency: 'critical',
      owner: 'Unassigned',
      supportingQuote: 'The Envoy proxy ingress has an unmitigated 15-minute connection spike vulnerability under TLS renegotiation bursts.',
      claimedConfidence: 92,
    };

    const rawDep = {
      type: 'dependency',
      title: 'AWS KMS Envelope Encryption',
      summary: 'Dependency on AWS KMS and HashiCorp Vault for credential management.',
      category: 'Cloud Infrastructure',
      urgency: 'medium',
      owner: 'Cloud Infrastructure Lead',
      supportingQuote: 'We depend on AWS KMS for envelope encryption and HashiCorp Vault for credentials storage.',
      claimedConfidence: 94,
    };

    const mockSource = {
      id: 'src-spec-01',
      name: 'Specification.txt',
      type: 'docs',
      status: 'connected',
      lastSync: 'Just now',
      recordCount: 1,
      icon: 'description',
      description: 'System specifications',
      privacyLevel: 'LOCAL_READ_ONLY',
      documentData: {
        fileFormat: 'txt',
        mimeType: 'text/plain',
        fileSizeBytes: SAMPLE_TXT_DOC.length,
        fileSizeFormatted: '1.2 KB',
        contentHash: 'mockhash123',
        extractedText: SAMPLE_TXT_DOC,
      },
    };

    const riskGrounding = groundFinding(rawRisk, mockSource);
    const depGrounding = groundFinding(rawDep, mockSource);

    assert.strictEqual(riskGrounding.status, 'VERIFIED');
    assert.strictEqual(depGrounding.status, 'VERIFIED');

    const riskFinding = buildKnowledgeFinding(rawRisk, riskGrounding);
    const depFinding = buildKnowledgeFinding(rawDep, depGrounding);

    assert.strictEqual(riskFinding.type, 'risk');
    assert.strictEqual(depFinding.type, 'dependency');
  });

  await t.test('6. Entity Extraction & Grounding: Contacts, Questions, and Next Actions', async () => {
    const rawContact = {
      type: 'contact',
      title: 'Incoming Core Lead: Marcus Vance',
      summary: 'Marcus Vance is the assigned transition lead.',
      category: 'Governance',
      urgency: 'medium',
      owner: 'Marcus Vance',
      supportingQuote: 'Transition Lead: Marcus Vance (marcus.vance@deployordie.internal) - Incoming Core Lead',
    };

    const rawQuestion = {
      type: 'unresolved_question',
      title: 'Aurora PostgreSQL Failover Timeout',
      summary: 'Exact failover timeout for cross-region Aurora replica is unconfirmed.',
      category: 'Database Architecture',
      urgency: 'high',
      owner: 'Elena Rostova',
      supportingQuote: 'Question: What is the exact failover timeout for the cross-region Aurora PostgreSQL replica?',
    };

    const rawNextAction = {
      type: 'next_action',
      title: 'Benchmark Aurora Failover Latency',
      summary: 'Run chaos-mesh benchmark against staging Aurora replica.',
      category: 'Testing & Validation',
      urgency: 'medium',
      owner: 'Marcus Vance',
      supportingQuote: 'Next Action: Benchmark Aurora failover latency in the staging environment using chaos-mesh.',
    };

    const mockSource = {
      id: 'src-spec-01',
      name: 'Specification.txt',
      type: 'docs',
      status: 'connected',
      lastSync: 'Just now',
      recordCount: 1,
      icon: 'description',
      description: 'System specifications',
      privacyLevel: 'LOCAL_READ_ONLY',
      documentData: {
        fileFormat: 'txt',
        mimeType: 'text/plain',
        fileSizeBytes: SAMPLE_TXT_DOC.length,
        fileSizeFormatted: '1.2 KB',
        contentHash: 'mockhash123',
        extractedText: SAMPLE_TXT_DOC,
      },
    };

    const contactFinding = buildKnowledgeFinding(rawContact, groundFinding(rawContact, mockSource));
    const questionFinding = buildKnowledgeFinding(rawQuestion, groundFinding(rawQuestion, mockSource));
    const nextActionFinding = buildKnowledgeFinding(rawNextAction, groundFinding(rawNextAction, mockSource));

    assert.strictEqual(contactFinding.type, 'contact');
    assert.strictEqual(questionFinding.type, 'unresolved_question');
    assert.strictEqual(nextActionFinding.type, 'next_action');
    assert.strictEqual(contactFinding.status, 'VERIFIED');
    assert.strictEqual(questionFinding.status, 'VERIFIED');
    assert.strictEqual(nextActionFinding.status, 'VERIFIED');
  });

  await t.test('7. PDF coordinate calculation locates exact page numbers', () => {
    const mockPdfSource = {
      id: 'src-pdf-01',
      name: 'Architecture_Dossier.pdf',
      type: 'docs',
      status: 'connected',
      lastSync: 'Just now',
      recordCount: 2,
      icon: 'picture_as_pdf',
      description: 'Multi-page architecture guide',
      privacyLevel: 'LOCAL_READ_ONLY',
      documentData: {
        fileFormat: 'pdf',
        mimeType: 'application/pdf',
        fileSizeBytes: 2048,
        fileSizeFormatted: '2 KB',
        contentHash: 'pdfhash001',
        extractedText: 'Page 1 Header\nIntroduction\nPage 2 Header\nDatabase shard configuration: 8 shards partitioned by account_id.',
        pageCount: 2,
        pages: [
          { pageNumber: 1, text: 'Page 1 Header\nIntroduction' },
          { pageNumber: 2, text: 'Page 2 Header\nDatabase shard configuration: 8 shards partitioned by account_id.' },
        ],
      },
    };

    const rawFinding = {
      type: 'decision',
      title: 'Database Sharding Scheme',
      summary: 'Configured 8 database shards partitioned by account_id.',
      category: 'Database',
      urgency: 'high',
      supportingQuote: 'Database shard configuration: 8 shards partitioned by account_id.',
    };

    const grounding = groundFinding(rawFinding, mockPdfSource);
    assert.strictEqual(grounding.status, 'VERIFIED');
    assert.strictEqual(grounding.citations.length, 1);
    assert.match(grounding.citations[0].lineRange, /Page 2/);
  });

  await t.test('8. Ungrounded or hallucinated quotes are marked UNCERTAIN with warning', () => {
    const mockSource = {
      id: 'src-txt-01',
      name: 'Notes.txt',
      type: 'docs',
      status: 'connected',
      lastSync: 'Just now',
      recordCount: 1,
      icon: 'description',
      description: 'Notes',
      privacyLevel: 'LOCAL_READ_ONLY',
      documentData: {
        fileFormat: 'txt',
        mimeType: 'text/plain',
        fileSizeBytes: 50,
        fileSizeFormatted: '50 B',
        contentHash: 'hash001',
        extractedText: 'Only mentioning basic system components here.',
      },
    };

    const hallucinatedFinding = {
      type: 'decision',
      title: 'Migrate to Apache Cassandra',
      summary: 'AI invented claim not in text.',
      category: 'Database',
      urgency: 'high',
      supportingQuote: 'We decided to completely replace PostgreSQL with Apache Cassandra in Q4.',
    };

    const grounding = groundFinding(hallucinatedFinding, mockSource);
    assert.strictEqual(grounding.status, 'UNCERTAIN', 'Hallucinated quote must be marked UNCERTAIN');
    assert.ok(grounding.confidence <= 50, 'Confidence must be downgraded');
    assert.match(grounding.reviewerNotes, /Automated validation warning/);
    assert.strictEqual(grounding.citations[0].lineRange, 'Unverified quote in source');
  });

  await t.test('9. Missing quotes are marked MISSING with warning', () => {
    const mockSource = {
      id: 'src-txt-01',
      name: 'Notes.txt',
      type: 'docs',
      status: 'connected',
      lastSync: 'Just now',
      recordCount: 1,
      icon: 'description',
      description: 'Notes',
      privacyLevel: 'LOCAL_READ_ONLY',
      documentData: {
        fileFormat: 'txt',
        mimeType: 'text/plain',
        fileSizeBytes: 50,
        fileSizeFormatted: '50 B',
        contentHash: 'hash001',
        extractedText: 'Some basic notes.',
      },
    };

    const missingQuoteFinding = {
      type: 'task',
      title: 'A Task with No Quote',
      summary: 'Task summary',
      category: 'Operations',
      urgency: 'low',
      supportingQuote: '',
    };

    const grounding = groundFinding(missingQuoteFinding, mockSource);
    assert.strictEqual(grounding.status, 'MISSING');
    assert.strictEqual(grounding.confidence, 25);
    assert.match(grounding.reviewerNotes, /MISSING evidence/);
  });

  await t.test('10. Document chunker preserves offsets and line counts for long texts', () => {
    // Generate a long text (~25,000 characters)
    const longText = Array.from({ length: 250 }, (_, i) => `Paragraph ${i + 1}: Detailed engineering specifications and constraints for component ${i}.\n\n`).join('');

    const longSource = {
      id: 'src-long-01',
      name: 'MassiveSpec.txt',
      type: 'docs',
      status: 'connected',
      lastSync: 'Just now',
      recordCount: 250,
      icon: 'description',
      description: 'Large documentation file',
      privacyLevel: 'LOCAL_READ_ONLY',
      documentData: {
        fileFormat: 'txt',
        mimeType: 'text/plain',
        fileSizeBytes: longText.length,
        fileSizeFormatted: '25 KB',
        contentHash: 'longhash',
        extractedText: longText,
      },
    };

    const chunks = chunkDocument(longSource, 10000, 1000);
    assert.ok(chunks.length >= 2, 'Large text must be split into multiple chunks');
    assert.strictEqual(chunks[0].chunkIndex, 0);
    assert.strictEqual(chunks[0].totalChunks, chunks.length);
    assert.strictEqual(chunks[0].charStart, 0);
    assert.ok(chunks[1].charStart > 0);
  });

  await t.test('11. Deduplication merges overlapping findings and preserves citations', () => {
    const findingA = {
      id: 'FIND-A-01',
      type: 'decision',
      title: 'Adopt Redis Cluster for Session Caching',
      summary: 'We adopted Redis for session caching.',
      category: 'Architecture',
      urgency: 'high',
      owner: 'Elena Rostova',
      reasoning: 'Better persistence',
      status: 'VERIFIED',
      confidence: 95,
      approved: false,
      createdDate: '2026-10-15',
      citations: [
        {
          id: 'cit-1',
          sourceId: 'src-1',
          sourceName: 'spec.txt',
          sourceType: 'docs',
          file: 'spec.txt',
          lineRange: 'Lines 5-7',
          author: 'Elena',
          timestamp: '2026-10-15',
          snippet: 'We decided to adopt Redis Cluster for session caching',
          contentHash: 'hash1',
          clearanceTier: 'INTERNAL',
          confidence: 95,
        },
      ],
    };

    const findingB = {
      id: 'FIND-B-02',
      type: 'decision',
      title: 'Adopt Redis Cluster for Session Caching',
      summary: 'We adopted Redis Cluster for caching sessions.',
      category: 'Architecture',
      urgency: 'high',
      owner: 'Elena Rostova',
      reasoning: 'Better persistence and native pub/sub capabilities.',
      impact: 'Eliminates cache warm-up latency.',
      status: 'VERIFIED',
      confidence: 96,
      approved: false,
      createdDate: '2026-10-15',
      citations: [
        {
          id: 'cit-2',
          sourceId: 'src-2',
          sourceName: 'adr-042.md',
          sourceType: 'docs',
          file: 'adr-042.md',
          lineRange: 'Lines 12-14',
          author: 'Marcus',
          timestamp: '2026-10-15',
          snippet: 'Redis Cluster chosen over Memcached',
          contentHash: 'hash2',
          clearanceTier: 'INTERNAL',
          confidence: 96,
        },
      ],
    };

    const deduplicated = deduplicateFindings([findingA, findingB]);
    assert.strictEqual(deduplicated.length, 1, 'Duplicate findings must be consolidated into 1');
    assert.strictEqual(deduplicated[0].citations.length, 2, 'Citations from both findings must be merged');
    assert.ok(deduplicated[0].reasoning.includes('native pub/sub'), 'Richer reasoning must be preserved');
  });

  await t.test('12. End-to-end pipeline execution with mock LLM client and telemetry', async () => {
    const mockSource = {
      id: 'src-spec-01',
      name: 'Specification.txt',
      type: 'docs',
      status: 'connected',
      lastSync: 'Just now',
      recordCount: 1,
      icon: 'description',
      description: 'System specifications',
      privacyLevel: 'LOCAL_READ_ONLY',
      documentData: {
        fileFormat: 'txt',
        mimeType: 'text/plain',
        fileSizeBytes: SAMPLE_TXT_DOC.length,
        fileSizeFormatted: '1.2 KB',
        contentHash: 'mockhash123',
        extractedText: SAMPLE_TXT_DOC,
      },
    };

    // Custom mock client simulating Gemini response
    const mockClient = {
      generateContent: async () => ({
        text: JSON.stringify([
          {
            type: 'decision',
            title: 'Adopt Redis Cluster for Session Caching',
            summary: 'Adopted Redis Cluster for operational caching.',
            category: 'Architecture',
            urgency: 'high',
            owner: 'Elena Rostova',
            reasoning: 'Redis provides built-in persistence.',
            impact: 'Reduces database load by 68%.',
            supportingQuote: 'We decided to adopt Redis Cluster for session caching instead of Memcached.',
            claimedConfidence: 96,
          },
          {
            type: 'task',
            title: 'KMS Key Rotation Script',
            summary: 'Complete KMS key rotation script.',
            category: 'Security',
            urgency: 'high',
            owner: 'Marcus Vance',
            supportingQuote: 'Marcus Vance must complete the KMS key rotation script before November 12.',
            claimedConfidence: 94,
          },
        ]),
      }),
    };

    const response = await runKnowledgeExtractionPipeline([mockSource], {}, mockClient);

    assert.strictEqual(response.success, true);
    assert.strictEqual(response.count, 2);
    assert.strictEqual(response.findings.length, 2);
    assert.strictEqual(response.telemetry.totalSourcesProcessed, 1);
    assert.strictEqual(response.telemetry.verifiedFindingsCount, 2);
    assert.strictEqual(response.telemetry.groundedPercentage, 100);

    // Verify all findings adhere to human review invariant
    for (const f of response.findings) {
      assert.strictEqual(f.approved, false, 'Extracted findings must default to approved: false');
      assert.strictEqual(f.rejected, false, 'Extracted findings must default to rejected: false');
    }
  });

  await t.test('13. Extracted findings persist in storage and enforce Phase A handover approval gate', async () => {
    const repo = new DurableFileRepository(TEST_DIR);
    const wsId = 'ws_ai_gate_test';
    const project = await repo.createWorkspace(wsId);

    // Initial project findings
    const initialFindingsCount = project.findings.length;

    // Simulate appending newly extracted findings
    const newAiFinding = {
      id: 'FIND-AI-TEST-999',
      type: 'decision',
      title: 'New AI Reconstructed Decision',
      summary: 'Requires human approval before handover inclusion.',
      status: 'VERIFIED',
      confidence: 96,
      citations: [],
      approved: false, // Unapproved!
      rejected: false,
      category: 'AI Pipeline',
      urgency: 'medium',
      owner: 'Elena Rostova',
      createdDate: '2026-11-08',
    };

    const updatedProject = {
      ...project,
      findings: [newAiFinding, ...project.findings],
    };

    await repo.saveProject(wsId, updatedProject);

    // Read back fresh from storage
    const reloaded = await repo.getWorkspace(wsId);
    assert.strictEqual(reloaded.findings.length, initialFindingsCount + 1);

    // Handover Gate Evaluation: Since newly extracted finding is unreviewed, handover must be blocked!
    const blockStatus = checkHandoverBlockStatus(reloaded.findings, false);
    assert.strictEqual(blockStatus.isBlocked, true, 'Handover must be blocked while unreviewed findings exist');
    assert.ok(blockStatus.unreviewedCount > 0, 'Unreviewed count must be > 0');
    assert.strictEqual(blockStatus.canCertify, false, 'Certification must be impossible with unreviewed findings');
  });

  await t.test('14. String similarity helper accurately scores lexical overlaps', () => {
    const sim1 = calculateTextSimilarity(
      'Adopt Redis Cluster for Session Caching',
      'Adopt Redis Cluster for Session Caching'
    );
    assert.strictEqual(sim1, 1.0, 'Identical strings must have similarity 1.0');

    const sim2 = calculateTextSimilarity(
      'Adopt Redis Cluster for Session Caching',
      'Completely unrelated topic about Kubernetes pods'
    );
    assert.ok(sim2 < 0.2, 'Unrelated strings must have low similarity');
  });

  await t.test('15. Live Gemini API integration test (runs conditionally if GEMINI_API_KEY is present)', async () => {
    if (!process.env.GEMINI_API_KEY) {
      console.log('    ℹ SKIPPED: GEMINI_API_KEY not configured in environment. Live API test skipped per Zero Fake AI Invariant.');
      return;
    }

    // Genuine live API call when key is configured
    console.log('    ℹ EXECUTING: GEMINI_API_KEY detected. Running live test with gemini-2.5-flash...');
    try {
      const findings = await extractWithGemini(
        'TestDoc.txt',
        'We decided to switch database port to 5433 to avoid port collision. Lead Engineer will update firewall.',
        { model: 'gemini-2.5-flash' }
      );

      assert.ok(Array.isArray(findings), 'Live API must return an array of findings');
      assert.ok(findings.length > 0, 'Live API must extract findings from clear input text');
      assert.ok(findings[0].supportingQuote, 'Live findings must include supporting quotes');
    } catch (err) {
      if (
        err?.status === 503 ||
        err?.status === 429 ||
        err?.message?.includes('high demand') ||
        err?.message?.includes('Spikes in demand') ||
        err?.message?.includes('RESOURCE_EXHAUSTED') ||
        err?.message?.includes('UNAVAILABLE')
      ) {
        console.log(`    ℹ Live Gemini API transient load spike (${err.status || 503}). Test handled gracefully.`);
        return;
      }
      throw err;
    }
  });
});

