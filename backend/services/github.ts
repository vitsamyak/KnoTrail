/**
 * Backend GitHub Service (Phase 2 - Milestone 2.2)
 *
 * Implements secure GitHub App authentication (RS256 JWT), installation token
 * management with in-memory caching and proactive refresh, authenticated
 * GitHub REST API v3 operations, rate-limit awareness, pagination, error
 * normalization, and evidence provenance preservation.
 *
 * SECURITY INVARIANTS:
 * 1. GitHub App private keys, installation tokens, and PATs are strictly server-side.
 * 2. Secrets are never returned to clients, logged, or exposed in error messages.
 * 3. Client-supplied repository IDs and roles are NEVER trusted.
 * 4. All outbound requests use strict timeouts (AbortController).
 *
 * Governance: CodersInPune Hackathon 2026 - Deploy_or_Die (Samyak Gedam & Sanshrey Sanagar)
 */

import crypto from 'crypto';
import type {
  GitHubCommit,
  GitHubCommitFile,
  GitHubEvidenceProvenance,
  GitHubIssue,
  GitHubIssueComment,
  GitHubPullRequest,
  GitHubPullRequestReview,
  GitHubRepositoryMetadata,
} from '../../src/lib/types.ts';

// ============================================================================
// Error Normalization Hierarchy
// ============================================================================

export class GitHubApiError extends Error {
  public statusCode: number;
  public statusText: string;
  public endpoint: string;
  public data?: any;

  constructor(message: string, statusCode: number = 500, statusText: string = 'Internal Server Error', endpoint: string = '', data?: any) {
    // Sanitize message to guarantee no bearer tokens or keys are leaked
    const sanitizedMessage = message.replace(/(ghp_[a-zA-Z0-9]+|ghs_[a-zA-Z0-9]+|github_pat_[a-zA-Z0-9_]+|Bearer\s+[^\s]+)/gi, '[REDACTED_CREDENTIAL]');
    super(sanitizedMessage);
    this.name = 'GitHubApiError';
    this.statusCode = statusCode;
    this.statusText = statusText;
    this.endpoint = endpoint;
    this.data = data;
  }
}

export class GitHubNotFoundError extends GitHubApiError {
  constructor(endpoint: string, message = 'Requested GitHub repository, commit, or resource was not found.') {
    super(message, 404, 'Not Found', endpoint);
    this.name = 'GitHubNotFoundError';
  }
}

export class GitHubRateLimitError extends GitHubApiError {
  public resetTime: number; // Unix epoch seconds
  public limit: number;
  public remaining: number;

  constructor(endpoint: string, resetTime: number, limit: number, remaining: number) {
    const resetDate = new Date(resetTime * 1000).toISOString();
    super(
      `GitHub API rate limit exceeded (${remaining}/${limit} remaining). Resets at ${resetDate}.`,
      403,
      'Rate Limit Exceeded',
      endpoint
    );
    this.name = 'GitHubRateLimitError';
    this.resetTime = resetTime;
    this.limit = limit;
    this.remaining = remaining;
  }
}

export class GitHubAuthError extends GitHubApiError {
  constructor(endpoint: string, message = 'GitHub authentication failed or insufficient repository permissions.') {
    super(message, 401, 'Unauthorized', endpoint);
    this.name = 'GitHubAuthError';
  }
}

export class GitHubConfigError extends Error {
  constructor(message = 'GitHub App credentials (GITHUB_APP_ID or GITHUB_APP_PRIVATE_KEY) are not configured.') {
    super(message);
    this.name = 'GitHubConfigError';
  }
}

// ============================================================================
// Types & Options
// ============================================================================

export interface GitHubRateLimitState {
  limit: number;
  remaining: number;
  resetTime: number; // Unix epoch seconds
  used: number;
}

export interface GitHubServiceOptions {
  appId?: string;
  privateKeyPem?: string;
  devPat?: string;
  baseUrl?: string;
  timeoutMs?: number;
  customFetch?: typeof fetch;
}

export interface GitHubRequestOptions {
  installationId?: number | null;
  authToken?: string; // Explicit token if already resolved
  useDevPatIfAvailable?: boolean;
  timeoutMs?: number;
}

export interface CommitQueryOptions {
  branch?: string;
  since?: string;
  until?: string;
  path?: string;
  limit?: number; // Capped at 100
  page?: number;
}

export interface PRQueryOptions {
  state?: 'open' | 'closed' | 'all';
  sort?: 'created' | 'updated';
  direction?: 'asc' | 'desc';
  limit?: number;
  page?: number;
}

export interface IssueQueryOptions {
  state?: 'open' | 'closed' | 'all';
  labels?: string;
  sort?: 'created' | 'updated';
  direction?: 'asc' | 'desc';
  limit?: number;
  page?: number;
}

interface CachedToken {
  token: string;
  expiresAt: number; // Unix epoch ms
  permissions?: Record<string, string>;
}

// ============================================================================
// Core GitHub Service Implementation
// ============================================================================

export class GitHubService {
  private appId?: string;
  private privateKeyPem?: string;
  private devPat?: string;
  private baseUrl: string;
  private timeoutMs: number;
  private customFetch?: typeof fetch;

  // In-memory token cache: installationId -> CachedToken
  private installationTokenCache = new Map<number, CachedToken>();

  // Rate limit telemetry
  private lastRateLimit: GitHubRateLimitState = {
    limit: 60,
    remaining: 60,
    resetTime: Math.floor(Date.now() / 1000) + 3600,
    used: 0,
  };

  constructor(options: GitHubServiceOptions = {}) {
    this.appId = options.appId || process.env.GITHUB_APP_ID;
    this.privateKeyPem = options.privateKeyPem || process.env.GITHUB_APP_PRIVATE_KEY;
    this.devPat = options.devPat || process.env.GITHUB_DEV_PAT || process.env.GITHUB_TOKEN;
    this.baseUrl = (options.baseUrl || process.env.GITHUB_API_BASE_URL || 'https://api.github.com').replace(/\/+$/, '');
    this.timeoutMs = options.timeoutMs || 15000;
    this.customFetch = options.customFetch;
  }

  // --------------------------------------------------------------------------
  // 1. GitHub App JWT Generation (RS256)
  // --------------------------------------------------------------------------

  /**
   * Generates a signed RS256 JWT for GitHub App authentication.
   * Header: { alg: "RS256", typ: "JWT" }
   * Payload: { iat: now - 60, exp: now + 600, iss: appId }
   */
  public generateAppJwt(appId?: string, privateKeyPem?: string): string {
    const activeAppId = appId || this.appId;
    const activeKey = privateKeyPem || this.privateKeyPem;

    if (!activeAppId || !activeKey) {
      throw new GitHubConfigError();
    }

    // Normalize PEM if escaped in environment variable
    let normalizedPem = activeKey.trim();
    if (normalizedPem.includes('\\n')) {
      normalizedPem = normalizedPem.replace(/\\n/g, '\n');
    }

    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT' };
    const payload = {
      iat: now - 60, // 60s in past for clock skew buffer
      exp: now + 600, // 10 minutes maximum allowed by GitHub
      iss: String(activeAppId),
    };

    const b64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
    const b64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const unsignedToken = `${b64Header}.${b64Payload}`;

    try {
      const sign = crypto.createSign('RSA-SHA256');
      sign.update(unsignedToken);
      const signature = sign.sign(normalizedPem, 'base64url');
      return `${unsignedToken}.${signature}`;
    } catch (err: any) {
      throw new GitHubAuthError('', `Failed to generate GitHub App RS256 signature: ${err?.message || 'Invalid private key format'}`);
    }
  }

  // --------------------------------------------------------------------------
  // 2. Installation Access Token Acquisition & Caching
  // --------------------------------------------------------------------------

  /**
   * Acquires a 60-minute installation access token for a given installation ID.
   * Caches token in memory and proactively refreshes if within 5 minutes of expiration.
   */
  public async getInstallationToken(installationId: number): Promise<string> {
    if (!installationId || typeof installationId !== 'number') {
      throw new GitHubAuthError('', 'A valid numeric GitHub App installation ID is required.');
    }

    const cached = this.installationTokenCache.get(installationId);
    const now = Date.now();

    // Proactive refresh: reuse if token is valid for at least 5 more minutes (300,000 ms)
    if (cached && cached.expiresAt > now + 300000) {
      return cached.token;
    }

    // Generate fresh JWT
    const jwt = this.generateAppJwt();

    const response = await this.rawRequest<any>(
      `/app/installations/${installationId}/access_tokens`,
      {
        method: 'POST',
      },
      `Bearer ${jwt}`
    );

    const token = response.token;
    const expiresAt = new Date(response.expires_at).getTime();

    this.installationTokenCache.set(installationId, {
      token,
      expiresAt,
      permissions: response.permissions,
    });

    return token;
  }

  /**
   * Clears in-memory installation token cache (useful for testing and key revocation).
   */
  public clearTokenCache(): void {
    this.installationTokenCache.clear();
  }

  // --------------------------------------------------------------------------
  // 3. Low-Level HTTP Request Dispatcher
  // --------------------------------------------------------------------------

  private async rawRequest<T>(
    endpoint: string,
    init: RequestInit = {},
    authHeader?: string,
    timeoutMs?: number
  ): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const effectiveTimeout = timeoutMs || this.timeoutMs;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), effectiveTimeout);

    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'KnoTrail-Knowledge-Reconstruction/1.0.0 (+https://github.com/vitsamyak/KnoTrail)',
      ...(init.headers as Record<string, string>),
    };

    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    try {
      const fetchImpl = this.customFetch || fetch;
      const res = await fetchImpl(url, {
        ...init,
        headers,
        signal: controller.signal,
      });

      // Update rate-limit state from response headers
      this.updateRateLimitFromHeaders(res.headers);

      // Handle rate limit errors (403 or 429)
      if (res.status === 403 || res.status === 429) {
        const errorBody: any = await res.json().catch(() => ({}));
        const message = (errorBody?.message || '').toLowerCase();
        if (message.includes('rate limit') || message.includes('api rate limit exceeded') || this.lastRateLimit.remaining === 0) {
          throw new GitHubRateLimitError(
            endpoint,
            this.lastRateLimit.resetTime,
            this.lastRateLimit.limit,
            this.lastRateLimit.remaining
          );
        }
      }

      // Handle not found
      if (res.status === 404) {
        throw new GitHubNotFoundError(endpoint);
      }

      // Handle auth errors
      if (res.status === 401 || (res.status === 403 && !res.headers.get('x-ratelimit-remaining'))) {
        const errData: any = await res.json().catch(() => ({}));
        throw new GitHubAuthError(endpoint, errData?.message || 'GitHub authentication failed or access is unauthorized.');
      }

      if (!res.ok) {
        const errorData: any = await res.json().catch(() => ({}));
        throw new GitHubApiError(
          errorData?.message || `GitHub API request failed with status ${res.status}`,
          res.status,
          res.statusText,
          endpoint,
          errorData
        );
      }

      // 204 No Content
      if (res.status === 204) {
        return undefined as unknown as T;
      }

      return (await res.json()) as T;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new GitHubApiError(`GitHub request timed out after ${effectiveTimeout}ms: ${endpoint}`, 504, 'Gateway Timeout', endpoint);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  private updateRateLimitFromHeaders(headers: Headers): void {
    const limit = headers.get('x-ratelimit-limit');
    const remaining = headers.get('x-ratelimit-remaining');
    const reset = headers.get('x-ratelimit-reset');
    const used = headers.get('x-ratelimit-used');

    if (limit && remaining && reset) {
      this.lastRateLimit = {
        limit: parseInt(limit, 10),
        remaining: parseInt(remaining, 10),
        resetTime: parseInt(reset, 10),
        used: used ? parseInt(used, 10) : 0,
      };
    }
  }

  /**
   * Resolves appropriate Authorization header based on request options.
   */
  private async resolveAuthHeader(options?: GitHubRequestOptions): Promise<string | undefined> {
    if (options?.authToken) {
      return `Bearer ${options.authToken}`;
    }

    if (options?.installationId) {
      const token = await this.getInstallationToken(options.installationId);
      return `Bearer ${token}`;
    }

    // Development-only PAT fallback (evaluates instance devPat or dynamic process.env fallback)
    const effectiveDevPat = this.devPat || process.env.GITHUB_DEV_PAT || process.env.GITHUB_TOKEN;
    if (options?.useDevPatIfAvailable && effectiveDevPat) {
      return `Bearer ${effectiveDevPat}`;
    }

    return undefined;
  }

  public getDevPat(): string | undefined {
    return this.devPat || process.env.GITHUB_DEV_PAT || process.env.GITHUB_TOKEN;
  }

  public setDevPat(token?: string): void {
    this.devPat = token;
  }

  public getRateLimitState(): GitHubRateLimitState {
    return { ...this.lastRateLimit };
  }

  // --------------------------------------------------------------------------
  // 4. Authenticated REST Operations
  // --------------------------------------------------------------------------

  /**
   * Fetches normalized repository metadata.
   */
  public async getRepository(
    owner: string,
    repo: string,
    options?: GitHubRequestOptions
  ): Promise<GitHubRepositoryMetadata> {
    if (!owner || !repo) {
      throw new GitHubApiError('Repository owner and name are required', 400, 'Bad Request');
    }

    const authHeader = await this.resolveAuthHeader(options);
    const data: any = await this.rawRequest<any>(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
      { method: 'GET' },
      authHeader,
      options?.timeoutMs
    );

    return {
      id: data.id,
      nodeId: data.node_id,
      name: data.name,
      fullName: data.full_name,
      owner: data.owner?.login || owner,
      ownerType: data.owner?.type === 'Organization' ? 'Organization' : 'User',
      htmlUrl: data.html_url,
      description: data.description || null,
      defaultBranch: data.default_branch || 'main',
      isPrivate: Boolean(data.private),
      isFork: Boolean(data.fork),
      language: data.language || null,
      topics: data.topics || [],
      starsCount: data.stargazers_count || 0,
      forksCount: data.forks_count || 0,
      openIssuesCount: data.open_issues_count || 0,
      updatedAt: data.updated_at,
      pushedAt: data.pushed_at,
    };
  }

  /**
   * Fetches recent commits with pagination and message/diff parsing.
   */
  public async getCommits(
    owner: string,
    repo: string,
    query: CommitQueryOptions = {},
    options?: GitHubRequestOptions
  ): Promise<GitHubCommit[]> {
    const authHeader = await this.resolveAuthHeader(options);
    const limit = Math.min(Math.max(query.limit || 30, 1), 100);

    const params = new URLSearchParams();
    if (query.branch) params.set('sha', query.branch);
    if (query.since) params.set('since', query.since);
    if (query.until) params.set('until', query.until);
    if (query.path) params.set('path', query.path);
    params.set('per_page', String(limit));
    if (query.page) params.set('page', String(query.page));

    const endpoint = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?${params.toString()}`;
    const rawCommits: any[] = await this.rawRequest<any[]>(endpoint, { method: 'GET' }, authHeader, options?.timeoutMs);

    if (!Array.isArray(rawCommits)) {
      return [];
    }

    return rawCommits.slice(0, limit).map((c: any) => ({
      sha: c.sha,
      shortSha: c.sha.substring(0, 7),
      message: c.commit?.message || '',
      author: {
        name: c.commit?.author?.name || c.author?.login || 'Unknown',
        email: c.commit?.author?.email || '',
        date: c.commit?.author?.date || new Date().toISOString(),
        username: c.author?.login,
        avatarUrl: c.author?.avatar_url,
      },
      committer: c.commit?.committer
        ? {
            name: c.commit.committer.name,
            email: c.commit.committer.email,
            date: c.commit.committer.date,
          }
        : undefined,
      htmlUrl: c.html_url,
      stats: c.stats
        ? {
            total: c.stats.total || 0,
            additions: c.stats.additions || 0,
            deletions: c.stats.deletions || 0,
          }
        : undefined,
    }));
  }

  /**
   * Fetches full commit details including files changed and diff patches.
   */
  public async getCommit(
    owner: string,
    repo: string,
    sha: string,
    options?: GitHubRequestOptions
  ): Promise<GitHubCommit> {
    const authHeader = await this.resolveAuthHeader(options);
    const data: any = await this.rawRequest<any>(
      `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits/${encodeURIComponent(sha)}`,
      { method: 'GET' },
      authHeader,
      options?.timeoutMs
    );

    const files: GitHubCommitFile[] = (data.files || []).map((f: any) => ({
      filename: f.filename,
      status: f.status as any,
      additions: f.additions || 0,
      deletions: f.deletions || 0,
      changes: f.changes || 0,
      patch: f.patch,
    }));

    return {
      sha: data.sha,
      shortSha: data.sha.substring(0, 7),
      message: data.commit?.message || '',
      author: {
        name: data.commit?.author?.name || data.author?.login || 'Unknown',
        email: data.commit?.author?.email || '',
        date: data.commit?.author?.date || new Date().toISOString(),
        username: data.author?.login,
        avatarUrl: data.author?.avatar_url,
      },
      htmlUrl: data.html_url,
      files,
      stats: data.stats
        ? {
            total: data.stats.total || 0,
            additions: data.stats.additions || 0,
            deletions: data.stats.deletions || 0,
          }
        : undefined,
    };
  }

  /**
   * Fetches pull requests with state, review decisions, and merge status.
   */
  public async getPullRequests(
    owner: string,
    repo: string,
    query: PRQueryOptions = {},
    options?: GitHubRequestOptions
  ): Promise<GitHubPullRequest[]> {
    const authHeader = await this.resolveAuthHeader(options);
    const limit = Math.min(Math.max(query.limit || 30, 1), 100);

    const params = new URLSearchParams();
    params.set('state', query.state || 'all');
    params.set('sort', query.sort || 'updated');
    params.set('direction', query.direction || 'desc');
    params.set('per_page', String(limit));
    if (query.page) params.set('page', String(query.page));

    const endpoint = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls?${params.toString()}`;
    const rawPRs: any[] = await this.rawRequest<any[]>(endpoint, { method: 'GET' }, authHeader, options?.timeoutMs);

    if (!Array.isArray(rawPRs)) {
      return [];
    }

    return rawPRs.slice(0, limit).map((pr: any) => ({
      id: pr.id,
      number: pr.number,
      title: pr.title,
      body: pr.body || null,
      state: pr.state as 'open' | 'closed',
      isMerged: Boolean(pr.merged_at),
      mergedAt: pr.merged_at || null,
      mergeCommitSha: pr.merge_commit_sha || null,
      htmlUrl: pr.html_url,
      author: pr.user?.login || 'Unknown',
      authorAvatarUrl: pr.user?.avatar_url,
      baseBranch: pr.base?.ref || 'main',
      headBranch: pr.head?.ref || '',
      createdAt: pr.created_at,
      updatedAt: pr.updated_at,
      labels: (pr.labels || []).map((l: any) => l.name),
    }));
  }

  /**
   * Fetches reviews for a specific pull request.
   */
  public async getPullRequestReviews(
    owner: string,
    repo: string,
    pullNumber: number,
    options?: GitHubRequestOptions
  ): Promise<GitHubPullRequestReview[]> {
    const authHeader = await this.resolveAuthHeader(options);
    const endpoint = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/pulls/${pullNumber}/reviews`;
    const rawReviews: any[] = await this.rawRequest<any[]>(endpoint, { method: 'GET' }, authHeader, options?.timeoutMs);

    if (!Array.isArray(rawReviews)) return [];

    return rawReviews.map((r: any) => ({
      id: r.id,
      user: r.user?.login || 'Unknown',
      state: r.state as any,
      submittedAt: r.submitted_at,
      body: r.body || '',
    }));
  }

  /**
   * Fetches repository issues (strictly excluding Pull Requests).
   */
  public async getIssues(
    owner: string,
    repo: string,
    query: IssueQueryOptions = {},
    options?: GitHubRequestOptions
  ): Promise<GitHubIssue[]> {
    const authHeader = await this.resolveAuthHeader(options);
    const limit = Math.min(Math.max(query.limit || 30, 1), 100);

    const params = new URLSearchParams();
    params.set('state', query.state || 'all');
    params.set('sort', query.sort || 'updated');
    params.set('direction', query.direction || 'desc');
    params.set('per_page', String(limit));
    if (query.page) params.set('page', String(query.page));
    if (query.labels) params.set('labels', query.labels);

    const endpoint = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues?${params.toString()}`;
    const rawIssues: any[] = await this.rawRequest<any[]>(endpoint, { method: 'GET' }, authHeader, options?.timeoutMs);

    if (!Array.isArray(rawIssues)) return [];

    // Filter out pull requests (GitHub Issues API returns PRs unless pull_request is checked)
    const pureIssues = rawIssues.filter((item: any) => !item.pull_request);

    return pureIssues.slice(0, limit).map((issue: any) => ({
      id: issue.id,
      number: issue.number,
      title: issue.title,
      body: issue.body || null,
      state: issue.state as 'open' | 'closed',
      htmlUrl: issue.html_url,
      author: issue.user?.login || 'Unknown',
      authorAvatarUrl: issue.user?.avatar_url,
      assignees: (issue.assignees || []).map((a: any) => a.login),
      labels: (issue.labels || []).map((l: any) => l.name),
      commentsCount: issue.comments || 0,
      createdAt: issue.created_at,
      updatedAt: issue.updated_at,
      closedAt: issue.closed_at || null,
      isPullRequest: false,
    }));
  }

  /**
   * Fetches issue discussion comments.
   */
  public async getIssueComments(
    owner: string,
    repo: string,
    issueNumber: number,
    options?: GitHubRequestOptions
  ): Promise<GitHubIssueComment[]> {
    const authHeader = await this.resolveAuthHeader(options);
    const endpoint = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues/${issueNumber}/comments`;
    const rawComments: any[] = await this.rawRequest<any[]>(endpoint, { method: 'GET' }, authHeader, options?.timeoutMs);

    if (!Array.isArray(rawComments)) return [];

    return rawComments.map((c: any) => ({
      id: c.id,
      author: c.user?.login || 'Unknown',
      body: c.body || '',
      createdAt: c.created_at,
      htmlUrl: c.html_url,
    }));
  }

  /**
   * Fetches file content (e.g. README.md, docs/architecture.md).
   */
  public async getFileContent(
    owner: string,
    repo: string,
    filePath: string,
    ref: string = 'main',
    options?: GitHubRequestOptions
  ): Promise<{ content: string; sha: string; size: number } | null> {
    const authHeader = await this.resolveAuthHeader(options);
    const endpoint = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodeURIComponent(filePath)}?ref=${encodeURIComponent(ref)}`;

    try {
      const data: any = await this.rawRequest<any>(endpoint, { method: 'GET' }, authHeader, options?.timeoutMs);

      if (!data || data.type !== 'file' || !data.content) {
        return null;
      }

      // Decode base64 content
      const content = Buffer.from(data.content, 'base64').toString('utf-8');
      return {
        content,
        sha: data.sha,
        size: data.size || content.length,
      };
    } catch (err: any) {
      if (err instanceof GitHubNotFoundError) {
        return null;
      }
      throw err;
    }
  }

  // --------------------------------------------------------------------------
  // 5. Evidence Provenance Constructor
  // --------------------------------------------------------------------------

  /**
   * Constructs an authoritative GitHub evidence provenance record, preserving
   * the chain of custody from original GitHub entity to KnoTrail citation.
   */
  public buildEvidenceProvenance(params: {
    repositoryId: number;
    repositoryOwner: string;
    repositoryName: string;
    branch?: string;
    commitSha?: string;
    filePath?: string;
    diffHunk?: { startLine?: number; endLine?: number; patchExcerpt?: string };
    prNumber?: number;
    prReviewId?: number;
    issueNumber?: number;
    author: string;
    timestamp: string;
    rawSnippet: string;
    synthesizedLineNumber?: number;
    synthesizedLineRange?: string;
  }): GitHubEvidenceProvenance {
    const fullName = `${params.repositoryOwner}/${params.repositoryName}`;
    const branch = params.branch || 'main';

    let originalGitHubUrl = `https://github.com/${fullName}`;
    if (params.commitSha) {
      if (params.filePath && params.diffHunk?.startLine) {
        originalGitHubUrl = `https://github.com/${fullName}/blob/${params.commitSha}/${params.filePath}#L${params.diffHunk.startLine}`;
      } else {
        originalGitHubUrl = `https://github.com/${fullName}/commit/${params.commitSha}`;
      }
    } else if (params.prNumber) {
      originalGitHubUrl = `https://github.com/${fullName}/pull/${params.prNumber}`;
    } else if (params.issueNumber) {
      originalGitHubUrl = `https://github.com/${fullName}/issues/${params.issueNumber}`;
    }

    const contentHash = crypto.createHash('sha256').update(params.rawSnippet.trim()).digest('hex');

    return {
      repositoryId: params.repositoryId,
      repositoryOwner: params.repositoryOwner,
      repositoryName: params.repositoryName,
      repositoryFullName: fullName,
      branch,
      commitSha: params.commitSha,
      filePath: params.filePath,
      originalGitHubUrl,
      diffHunk: params.diffHunk,
      prNumber: params.prNumber,
      prReviewId: params.prReviewId,
      issueNumber: params.issueNumber,
      author: params.author,
      timestamp: params.timestamp,
      contentHash,
      synthesizedLineNumber: params.synthesizedLineNumber,
      synthesizedLineRange: params.synthesizedLineRange,
    };
  }
}

// Global default service instance
export const gitHubService = new GitHubService();
