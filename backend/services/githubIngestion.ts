/**
 * Backend GitHub Ingestion Compiler (Phase 1 - Milestone 1.1)
 *
 * Fetches commits, pull requests, reviews, and issue discussions from connected
 * GitHub repositories, compiles them into structured, readable project source
 * documents, generates immutable SHA-256 content hashes to prevent duplicate ingestion,
 * and attaches cryptographic GitHubEvidenceProvenance records.
 *
 * Governance: CodersInPune Hackathon 2026 - Deploy_or_Die (Samyak Gedam & Sanshrey Sanagar)
 */

import crypto from 'crypto';
import path from 'path';
import {
  gitHubService,
  GitHubService,
  type GitHubRequestOptions,
} from './github.ts';
import {
  scanRepositoryCodebase,
  type CodebaseScanResult,
} from './codebaseScanner.ts';
import {
  analyzeCodebaseArchitecture,
} from './codebaseAnalyzer.ts';
import {
  extractDeterministicCodebaseFindings,
} from './codebaseAiExtractor.ts';
import type {
  CodebaseArchitectureBlueprint,
  CodebaseIngestionProgress,
  CodebaseIntelligence,
  GitHubCommit,
  GitHubEvidenceProvenance,
  GitHubIssue,
  GitHubPullRequest,
  GitHubRepositoryMetadata,
  KnowledgeFinding,
  ProjectSource,
} from '../../src/lib/types.ts';

// ============================================================================
// Types & Contracts
// ============================================================================

export interface GitHubIngestionOptions {
  branch?: string;
  maxCommits?: number; // Capped at 100, default 30
  maxPullRequests?: number; // Capped at 50, default 20
  maxIssues?: number; // Capped at 50, default 20
  maxFilesToRead?: number; // Capped at 150, default 60
  includeCommits?: boolean;
  includePullRequests?: boolean;
  includeIssues?: boolean;
  includeDocs?: boolean;
  includeCodebase?: boolean;
  authToken?: string;
  installationId?: number;
  integrationId?: string;
  onProgress?: (progress: Partial<CodebaseIngestionProgress>) => void;
}

export interface GitHubIngestionRecordCounts {
  commits: number;
  pullRequests: number;
  issues: number;
  docs: number;
  codebaseFiles?: number;
  total: number;
}

export interface GitHubIngestionResult {
  repository: GitHubRepositoryMetadata;
  source: ProjectSource;
  contentHash: string;
  isChanged: boolean;
  lastCommitSha?: string;
  recordCounts: GitHubIngestionRecordCounts;
  provenanceItems: GitHubEvidenceProvenance[];
  compiledText: string;
  codebaseIntelligence?: CodebaseIntelligence;
  codebaseFindings?: KnowledgeFinding[];
}

// ============================================================================
// Helpers
// ============================================================================

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function truncateString(str: string, maxLen: number): string {
  if (!str) return '';
  const trimmed = str.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return trimmed.slice(0, maxLen) + '... [truncated for safe context window]';
}

// ============================================================================
// Ingestion Compiler
// ============================================================================

/**
 * Ingests repository entities (commits, pull requests, issues, documentation)
 * and compiles them into a structured, evidence-grounded ProjectSource document.
 */
export async function ingestGitHubRepository(
  owner: string,
  repo: string,
  options: GitHubIngestionOptions = {},
  existingSource?: ProjectSource,
  customService?: GitHubService
): Promise<GitHubIngestionResult> {
  const service = customService || gitHubService;

  const requestOptions: GitHubRequestOptions = {
    installationId: options.installationId,
    authToken: options.authToken,
    useDevPatIfAvailable: true,
  };

  // 1. Fetch Authoritative Repository Metadata
  const repoMeta = await service.getRepository(owner, repo, requestOptions);
  const selectedBranch = options.branch || repoMeta.defaultBranch || 'main';

  // Caps & Defaults
  const maxCommits = Math.min(Math.max(options.maxCommits || 30, 1), 100);
  const maxPRs = Math.min(Math.max(options.maxPullRequests || 20, 1), 50);
  const maxIssues = Math.min(Math.max(options.maxIssues || 20, 1), 50);

  const shouldFetchCommits = options.includeCommits !== false;
  const shouldFetchPRs = options.includePullRequests !== false;
  const shouldFetchIssues = options.includeIssues !== false;
  const shouldFetchDocs = options.includeDocs !== false;

  // 2. Concurrently fetch requested entities and scan codebase
  const shouldScanCodebase = options.includeCodebase !== false;
  let scanResult: CodebaseScanResult | null = null;
  let architectureBlueprint: CodebaseArchitectureBlueprint | null = null;
  let codebaseFindings: KnowledgeFinding[] = [];

  const [commits, pullRequests, issues, readmeContent] = await Promise.all([
    shouldFetchCommits
      ? service
          .getCommits(owner, repo, { branch: selectedBranch, limit: maxCommits }, requestOptions)
          .catch((err) => {
            console.warn(`[GitHub Ingestion] Could not fetch commits for ${owner}/${repo}: ${err.message}`);
            return [] as GitHubCommit[];
          })
      : Promise.resolve([] as GitHubCommit[]),

    shouldFetchPRs
      ? service
          .getPullRequests(owner, repo, { state: 'all', limit: maxPRs }, requestOptions)
          .catch((err) => {
            console.warn(`[GitHub Ingestion] Could not fetch PRs for ${owner}/${repo}: ${err.message}`);
            return [] as GitHubPullRequest[];
          })
      : Promise.resolve([] as GitHubPullRequest[]),

    shouldFetchIssues
      ? service
          .getIssues(owner, repo, { state: 'all', limit: maxIssues }, requestOptions)
          .catch((err) => {
            console.warn(`[GitHub Ingestion] Could not fetch issues for ${owner}/${repo}: ${err.message}`);
            return [] as GitHubIssue[];
          })
      : Promise.resolve([] as GitHubIssue[]),

    shouldFetchDocs
      ? service
          .getFileContent(owner, repo, 'README.md', selectedBranch, requestOptions)
          .catch(() => null)
      : Promise.resolve(null),
  ]);

  const lastCommitSha = commits[0]?.sha || selectedBranch;
  const sourceId = existingSource?.id || `src_gh_${repoMeta.id}`;

  // 2b. Execute Codebase Scanning & Deep Architecture Inference
  if (shouldScanCodebase) {
    try {
      options.onProgress?.({
        phase: 2,
        phaseName: 'Fetching repository tree via Git Trees API',
        percent: 15,
      });

      scanResult = await scanRepositoryCodebase(owner, repo, selectedBranch, {
        requestOptions,
        existingInventory: existingSource?.codebaseIntelligence?.inventory,
        maxFilesToRead: options.maxFilesToRead || 70,
        onProgress: options.onProgress,
        customService: service,
      });

      options.onProgress?.({
        phase: 5,
        phaseName: 'Analyzing architecture, frameworks, and dependency relationships',
        percent: 75,
        analyzedCount: scanResult.filesRead,
      });

      architectureBlueprint = analyzeCodebaseArchitecture(scanResult.inventory, scanResult.fileContents);

      options.onProgress?.({
        phase: 6,
        phaseName: 'Extracting grounded technical decisions, tasks, and invariants',
        percent: 85,
        analyzedCount: scanResult.filesRead,
      });

      codebaseFindings = extractDeterministicCodebaseFindings(
        repoMeta.fullName,
        sourceId,
        lastCommitSha,
        scanResult.fileContents,
        architectureBlueprint
      );

      options.onProgress?.({
        phase: 7,
        phaseName: `Grounded ${codebaseFindings.length} findings with verified line coordinates`,
        percent: 92,
        findingsCount: codebaseFindings.length,
      });
    } catch (scanErr: any) {
      console.warn(`[GitHub Ingestion] Codebase scanning encountered non-fatal error: ${scanErr?.message || scanErr}`);
    }
  }

  // 3. Compile structured Markdown document & track provenance
  const lines: string[] = [];
  const provenanceItems: GitHubEvidenceProvenance[] = [];

  const addLine = (line = '') => lines.push(line);

  // Document Header
  addLine(`# GitHub Repository: ${repoMeta.fullName}`);
  addLine(`Source Type: GitHub Repository Integration | Default Branch: ${repoMeta.defaultBranch} | Synced Branch: ${selectedBranch}`);
  addLine(`Language: ${repoMeta.language || 'Unspecified'} | Stars: ${repoMeta.starsCount} | Forks: ${repoMeta.forksCount} | Visibility: ${repoMeta.isPrivate ? 'Private' : 'Public'}`);
  addLine(`Repository URL: ${repoMeta.htmlUrl}`);
  if (repoMeta.pushedAt) {
    addLine(`Last Pushed: ${repoMeta.pushedAt}`);
  }
  if (repoMeta.description) {
    addLine(`Description: ${repoMeta.description}`);
  }
  addLine();

  // ── SECTION 0: CODEBASE ARCHITECTURE BLUEPRINT ────────────────────────
  if (architectureBlueprint) {
    const archLineStart = lines.length + 1;
    addLine('## Section 0: System Architecture & Technical Blueprint');
    addLine('---');
    addLine(`- Frontend: ${architectureBlueprint.frontend.framework} | UI: ${architectureBlueprint.frontend.uiLibrary} | Routing: ${architectureBlueprint.frontend.routing}`);
    addLine(`- Backend: ${architectureBlueprint.backend.framework} (${architectureBlueprint.backend.runtime}) | API: ${architectureBlueprint.backend.apiType}`);
    addLine(`- Database: ${architectureBlueprint.database.type} | Tables: ${architectureBlueprint.database.tables.join(', ') || 'Auto-migrated'}`);
    addLine(`- Features: ${architectureBlueprint.database.features.join(', ') || 'Standard'}`);
    if (architectureBlueprint.externalIntegrations.length > 0) {
      addLine(`- External Integrations: ${architectureBlueprint.externalIntegrations.join(', ')}`);
    }
    addLine(`- Deployment Platforms: ${architectureBlueprint.deployment.platforms.join(', ')}`);
    addLine();

    addLine('### Key Discovered Workflows:');
    for (const wf of architectureBlueprint.keyWorkflows) {
      addLine(`  * ${wf}`);
    }
    addLine();

    if (architectureBlueprint.moduleRelationships.length > 0) {
      addLine('### Code Relationships & Data Flow:');
      for (const rel of architectureBlueprint.moduleRelationships) {
        addLine(`  * [${rel.relation}] ${rel.from} -> ${rel.to}`);
      }
      addLine();
    }

    const archLineEnd = lines.length;
    provenanceItems.push(
      service.buildEvidenceProvenance({
        repositoryId: repoMeta.id,
        repositoryOwner: repoMeta.owner,
        repositoryName: repoMeta.name,
        branch: selectedBranch,
        commitSha: lastCommitSha,
        filePath: 'architecture.blueprint',
        author: 'KnoTrail Architecture Analyzer',
        timestamp: new Date().toISOString(),
        rawSnippet: `Architecture: ${architectureBlueprint.frontend.framework} / ${architectureBlueprint.backend.framework} / ${architectureBlueprint.database.type}`,
        synthesizedLineNumber: archLineStart,
        synthesizedLineRange: `${archLineStart}-${archLineEnd}`,
      })
    );
  }

  // ── SECTION 1: REPOSITORY FILE INVENTORY ──────────────────────────────
  if (scanResult && scanResult.inventory.length > 0) {
    const invLineStart = lines.length + 1;
    addLine(`## Section 1: Complete Repository Inventory (${scanResult.totalDiscovered} discovered files, ${scanResult.filesRead} read)`);
    addLine('---');
    addLine();

    // Group files by category
    const categoriesMap: Record<string, typeof scanResult.inventory> = {};
    for (const item of scanResult.inventory) {
      if (!categoriesMap[item.category]) categoriesMap[item.category] = [];
      categoriesMap[item.category].push(item);
    }

    for (const [cat, files] of Object.entries(categoriesMap)) {
      addLine(`### Category: ${cat.toUpperCase().replace(/_/g, ' ')} (${files.length} files)`);
      for (const f of files.slice(0, 20)) {
        const statusStr = f.isRead ? `${f.linesCount} lines` : `SKIPPED: ${f.skipReason || 'Non-essential'}`;
        addLine(`  - \`${f.path}\` (${f.language}) [${formatBytes(f.size)}] - ${statusStr}`);
      }
      if (files.length > 20) {
        addLine(`  - ... and ${files.length - 20} additional files in this category`);
      }
      addLine();
    }

    const invLineEnd = lines.length;
    provenanceItems.push(
      service.buildEvidenceProvenance({
        repositoryId: repoMeta.id,
        repositoryOwner: repoMeta.owner,
        repositoryName: repoMeta.name,
        branch: selectedBranch,
        commitSha: lastCommitSha,
        filePath: 'repository.inventory',
        author: 'KnoTrail Codebase Scanner',
        timestamp: new Date().toISOString(),
        rawSnippet: `Discovered: ${scanResult.totalDiscovered} files, read: ${scanResult.filesRead}`,
        synthesizedLineNumber: invLineStart,
        synthesizedLineRange: `${invLineStart}-${invLineEnd}`,
      })
    );
  }

  // ── SECTION 2: AUTHORITATIVE SOURCE CODE EXCERPTS ─────────────────────
  if (scanResult && scanResult.fileContents.size > 0) {
    addLine('## Section 2: Core Source Code Implementations');
    addLine('---');
    addLine();

    // Priority sample files to include in compiled document
    const sampleFiles = Array.from(scanResult.fileContents.entries()).slice(0, 15);
    for (const [filePath, content] of sampleFiles) {
      const codeLineStart = lines.length + 1;
      const fileLines = content.split('\n');
      const excerpt = fileLines.slice(0, 50).join('\n'); // First 50 lines

      addLine(`### Source File: \`${filePath}\` (${fileLines.length} lines)`);
      addLine('```' + (path.extname(filePath).slice(1) || 'text'));
      addLine(excerpt);
      if (fileLines.length > 50) {
        addLine(`// ... [${fileLines.length - 50} more lines in repository file]`);
      }
      addLine('```');
      addLine();

      const codeLineEnd = lines.length;
      provenanceItems.push(
        service.buildEvidenceProvenance({
          repositoryId: repoMeta.id,
          repositoryOwner: repoMeta.owner,
          repositoryName: repoMeta.name,
          branch: selectedBranch,
          commitSha: lastCommitSha,
          filePath,
          author: 'Core Engineering',
          timestamp: new Date().toISOString(),
          rawSnippet: excerpt.slice(0, 300),
          synthesizedLineNumber: codeLineStart,
          synthesizedLineRange: `${codeLineStart}-${codeLineEnd}`,
        })
      );
    }
  }

  // ── SECTION A: COMMITS ──────────────────────────────────────────────────
  if (commits.length > 0) {
    addLine(`## Section 1: Commit History (${commits.length} commits on ${selectedBranch})`);
    addLine('---');
    addLine();

    for (const commit of commits) {
      const lineStart = lines.length + 1;
      const shortSha = commit.shortSha || commit.sha?.slice(0, 7) || 'unknown';
      const commitUrl = commit.htmlUrl || `https://github.com/${repoMeta.fullName}/commit/${commit.sha}`;
      const authorName = commit.author?.name || (commit as any).authorName || 'Unknown';
      const authorEmail = commit.author?.email || (commit as any).authorEmail || '';
      const authorDate = commit.author?.date || (commit as any).date || '';

      addLine(`### Commit ${shortSha}`);
      addLine(`- Full SHA: ${commit.sha}`);
      addLine(`- Author: ${authorName} <${authorEmail}>`);
      addLine(`- Date: ${authorDate}`);
      addLine(`- URL: ${commitUrl}`);
      addLine('- Message:');

      const messagePreview = truncateString(commit.message, 1500);
      for (const msgLine of messagePreview.split('\n')) {
        addLine(`  ${msgLine}`);
      }

      if (commit.files && commit.files.length > 0) {
        addLine('- Files Changed:');
        for (const file of commit.files.slice(0, 10)) {
          addLine(`  * [${file.status}] ${file.filename} (+${file.additions}, -${file.deletions})`);
        }
      }
      addLine();

      const lineEnd = lines.length;
      provenanceItems.push(
        service.buildEvidenceProvenance({
          repositoryId: repoMeta.id,
          repositoryOwner: repoMeta.owner,
          repositoryName: repoMeta.name,
          branch: selectedBranch,
          commitSha: commit.sha,
          author: commit.author.name,
          timestamp: commit.author.date,
          rawSnippet: commit.message,
          synthesizedLineNumber: lineStart,
          synthesizedLineRange: `${lineStart}-${lineEnd}`,
        })
      );
    }
  }

  // ── SECTION B: PULL REQUESTS ───────────────────────────────────────────
  if (pullRequests.length > 0) {
    addLine(`## Section 2: Pull Requests (${pullRequests.length} recent pull requests)`);
    addLine('---');
    addLine();

    for (const pr of pullRequests) {
      const lineStart = lines.length + 1;
      const prUrl = pr.htmlUrl || `https://github.com/${repoMeta.fullName}/pull/${pr.number}`;
      const stateLabel = pr.isMerged ? 'MERGED' : pr.state.toUpperCase();

      addLine(`### Pull Request #${pr.number}: ${pr.title}`);
      addLine(`- State: ${stateLabel}`);
      addLine(`- Author: ${pr.author} | Base: ${pr.baseBranch} <- Head: ${pr.headBranch}`);
      addLine(`- Created: ${pr.createdAt}${pr.mergedAt ? ` | Merged: ${pr.mergedAt}` : ''}`);
      addLine(`- URL: ${prUrl}`);
      if (pr.labels && pr.labels.length > 0) {
        addLine(`- Labels: ${pr.labels.join(', ')}`);
      }
      addLine('- Description:');

      const bodyPreview = pr.body ? truncateString(pr.body, 2000) : '(No description provided)';
      for (const bodyLine of bodyPreview.split('\n')) {
        addLine(`  ${bodyLine}`);
      }

      if (pr.reviews && pr.reviews.length > 0) {
        addLine('- Reviews:');
        for (const rev of pr.reviews) {
          addLine(`  * ${rev.user} [${rev.state}]: ${truncateString(rev.body || '', 300)}`);
        }
      }
      addLine();

      const lineEnd = lines.length;
      provenanceItems.push(
        service.buildEvidenceProvenance({
          repositoryId: repoMeta.id,
          repositoryOwner: repoMeta.owner,
          repositoryName: repoMeta.name,
          branch: pr.baseBranch,
          prNumber: pr.number,
          commitSha: pr.mergeCommitSha || undefined,
          author: pr.author,
          timestamp: pr.createdAt,
          rawSnippet: `${pr.title}\n${pr.body || ''}`,
          synthesizedLineNumber: lineStart,
          synthesizedLineRange: `${lineStart}-${lineEnd}`,
        })
      );
    }
  }

  // ── SECTION C: ISSUES ──────────────────────────────────────────────────
  if (issues.length > 0) {
    addLine(`## Section 3: Issues & Discussions (${issues.length} recent issues)`);
    addLine('---');
    addLine();

    for (const issue of issues) {
      const lineStart = lines.length + 1;
      const issueUrl = issue.htmlUrl || `https://github.com/${repoMeta.fullName}/issues/${issue.number}`;

      addLine(`### Issue #${issue.number}: ${issue.title}`);
      addLine(`- State: ${issue.state.toUpperCase()} | Author: ${issue.author}`);
      addLine(`- Created: ${issue.createdAt}${issue.closedAt ? ` | Closed: ${issue.closedAt}` : ''}`);
      addLine(`- URL: ${issueUrl}`);
      if (issue.labels && issue.labels.length > 0) {
        addLine(`- Labels: ${issue.labels.join(', ')}`);
      }
      if (issue.assignees && issue.assignees.length > 0) {
        addLine(`- Assignees: ${issue.assignees.join(', ')}`);
      }
      addLine('- Description:');

      const bodyPreview = issue.body ? truncateString(issue.body, 2000) : '(No description provided)';
      for (const bodyLine of bodyPreview.split('\n')) {
        addLine(`  ${bodyLine}`);
      }

      if (issue.comments && issue.comments.length > 0) {
        addLine('- Comments:');
        for (const comment of issue.comments) {
          addLine(`  * ${comment.author} (${comment.createdAt}): ${truncateString(comment.body, 300)}`);
        }
      }
      addLine();

      const lineEnd = lines.length;
      provenanceItems.push(
        service.buildEvidenceProvenance({
          repositoryId: repoMeta.id,
          repositoryOwner: repoMeta.owner,
          repositoryName: repoMeta.name,
          issueNumber: issue.number,
          author: issue.author,
          timestamp: issue.createdAt,
          rawSnippet: `${issue.title}\n${issue.body || ''}`,
          synthesizedLineNumber: lineStart,
          synthesizedLineRange: `${lineStart}-${lineEnd}`,
        })
      );
    }
  }

  // ── SECTION D: REPOSITORY DOCUMENTATION (README.md) ───────────────────
  let docsCount = 0;
  if (readmeContent && readmeContent.content) {
    docsCount = 1;
    addLine('## Section 4: Architecture & Project Documentation (README.md)');
    addLine('---');
    addLine(`File: README.md | SHA: ${readmeContent.sha} | Size: ${formatBytes(readmeContent.size)}`);
    addLine();
    const docExcerpt = truncateString(readmeContent.content, 4000);
    addLine(docExcerpt);
    addLine();
  }

  const compiledText = lines.join('\n');
  const fileSizeBytes = Buffer.byteLength(compiledText, 'utf-8');

  // 4. Stable SHA-256 Content Hash
  const contentHash = crypto.createHash('sha256').update(compiledText).digest('hex');

  // Check if content changed since last sync
  const isChanged = !existingSource || existingSource.documentData?.contentHash !== contentHash;

  const codebaseFilesCount = scanResult ? scanResult.filesRead : 0;
  const totalRecords = commits.length + pullRequests.length + issues.length + docsCount + codebaseFilesCount;

  const recordCounts: GitHubIngestionRecordCounts = {
    commits: commits.length,
    pullRequests: pullRequests.length,
    issues: issues.length,
    docs: docsCount,
    codebaseFiles: codebaseFilesCount,
    total: totalRecords,
  };

  // Build Codebase Intelligence Model
  const codebaseIntelligence: CodebaseIntelligence | undefined =
    scanResult && architectureBlueprint
      ? {
          treeSha: scanResult.treeSha,
          commitSha: lastCommitSha,
          branch: selectedBranch,
          inventory: scanResult.inventory,
          blueprint: architectureBlueprint,
          progress: {
            phase: 9,
            phaseName: 'Ingestion completed',
            percent: 100,
            status: 'completed',
            discoveredCount: scanResult.totalDiscovered,
            readCount: scanResult.filesRead,
            skippedCount: scanResult.filesSkipped,
            analyzedCount: scanResult.filesRead,
            findingsCount: codebaseFindings.length,
            errorCount: 0,
            errors: [],
            completedAt: new Date().toISOString(),
          },
          stats: {
            totalFilesDiscovered: scanResult.totalDiscovered,
            totalFilesRead: scanResult.filesRead,
            totalFilesSkipped: scanResult.filesSkipped,
            totalLinesOfCode: scanResult.totalLinesOfCode,
            totalFindings: codebaseFindings.length,
            skippedByReason: scanResult.skippedSummary,
            languages: scanResult.languages,
            categories: scanResult.categories,
          },
          lastIngestedAt: new Date().toISOString(),
        }
      : undefined;

  // 5. Build ProjectSource Object
  const source: ProjectSource = {
    id: sourceId,
    name: `GitHub: ${repoMeta.fullName}`,
    type: 'github',
    status: 'connected',
    lastSync: new Date().toISOString(),
    recordCount: totalRecords,
    icon: 'commit',
    description: scanResult
      ? `Ingested complete codebase (${scanResult.totalDiscovered} files discovered, ${scanResult.filesRead} read, ${scanResult.totalLinesOfCode} lines of code), ${commits.length} commits, ${pullRequests.length} pull requests, and ${issues.length} issues from ${repoMeta.fullName} (${selectedBranch}).`
      : `Ingested ${commits.length} commits, ${pullRequests.length} pull requests, ${issues.length} issues, and ${docsCount} doc(s) from ${repoMeta.fullName} (${selectedBranch}).`,
    privacyLevel: 'LOCAL_READ_ONLY',
    isUploaded: false,
    documentData: {
      fileFormat: 'md',
      mimeType: 'text/markdown',
      fileSizeBytes,
      fileSizeFormatted: formatBytes(fileSizeBytes),
      contentHash,
      extractedText: compiledText,
      lineCount: lines.length,
    },
    githubMetadata: repoMeta,
    githubIntegrationId: options.integrationId,
    codebaseIntelligence,
  };

  return {
    repository: repoMeta,
    source,
    contentHash,
    isChanged,
    lastCommitSha,
    recordCounts,
    provenanceItems,
    compiledText,
    codebaseIntelligence,
    codebaseFindings,
  };
}
