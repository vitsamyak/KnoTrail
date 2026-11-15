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
import {
  gitHubService,
  GitHubService,
  type GitHubRequestOptions,
} from './github.ts';
import type {
  GitHubCommit,
  GitHubEvidenceProvenance,
  GitHubIssue,
  GitHubPullRequest,
  GitHubRepositoryMetadata,
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
  includeCommits?: boolean;
  includePullRequests?: boolean;
  includeIssues?: boolean;
  includeDocs?: boolean;
  authToken?: string;
  installationId?: number;
  integrationId?: string;
}

export interface GitHubIngestionRecordCounts {
  commits: number;
  pullRequests: number;
  issues: number;
  docs: number;
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

  // 2. Concurrently fetch requested entities
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

  const lastCommitSha = commits[0]?.sha;
  const totalRecords = commits.length + pullRequests.length + issues.length + docsCount;

  const recordCounts: GitHubIngestionRecordCounts = {
    commits: commits.length,
    pullRequests: pullRequests.length,
    issues: issues.length,
    docs: docsCount,
    total: totalRecords,
  };

  // 5. Build ProjectSource Object
  const sourceId = existingSource?.id || `src_gh_${repoMeta.id}`;
  const source: ProjectSource = {
    id: sourceId,
    name: `GitHub: ${repoMeta.fullName}`,
    type: 'github',
    status: 'connected',
    lastSync: new Date().toISOString(),
    recordCount: totalRecords,
    icon: 'commit',
    description: `Ingested ${commits.length} commits, ${pullRequests.length} pull requests, ${issues.length} issues, and ${docsCount} doc(s) from ${repoMeta.fullName} (${selectedBranch}).`,
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
  };
}
