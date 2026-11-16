import type {
  ProjectData,
  ProjectSource,
  KnowledgeFinding,
  ConflictRecord,
  ReviewAuditAction,
  HandoverDocument,
  HandoverShareRecord,
  UserRole,
  WorkspaceMemberRecord,
  GitHubIntegration,
  GitHubIntegrationConfig,
  ContinuousUpdateRecord,
  ContinuousUpdateHistoryResponse,
  ContinuousUpdateRetryResponse,
  CodebaseIntelligence,
  CodebaseQuestionResponse,
  IngestionJobCounters,
  IngestionJobState,
} from './types.ts';

// In-memory auth token and demo perspective state
let clientAuthToken: string | null = null;
let clientDemoPerspective: UserRole | null = null;

const SESSION_STORAGE_KEY = 'knotrail_auth_token';

export function initClientSessionFromStorage(): string | null {
  if (typeof window !== 'undefined') {
    try {
      const stored = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (stored && stored.trim().length > 0) {
        clientAuthToken = stored.trim();
        return clientAuthToken;
      }
    } catch {
      // sessionStorage unavailable
    }
  }
  return clientAuthToken;
}

export function setClientAuthToken(token: string | null) {
  clientAuthToken = token;
  if (typeof window !== 'undefined') {
    try {
      if (token) {
        window.sessionStorage.setItem(SESSION_STORAGE_KEY, token);
      } else {
        window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
      }
    } catch {
      // ignore
    }
  }
}

export function getClientAuthToken(): string | null {
  return clientAuthToken;
}

export function setClientDemoPerspective(role: UserRole | null) {
  clientDemoPerspective = role;
}

export function getClientDemoPerspective(): UserRole | null {
  return clientDemoPerspective;
}

/**
 * Returns the normalized backend API base URL.
 * Priority order:
 * 1. Explicit NEXT_PUBLIC_API_BASE_URL environment variable (Render backend, e.g. "https://knotrail-backend.onrender.com")
 * 2. Local browser development on localhost / 127.0.0.1 (defaults to "http://localhost:4000")
 * 3. Local Node.js test environment (defaults to "http://localhost:4000")
 * 4. Production deployments without NEXT_PUBLIC_API_BASE_URL return "" and raise an explicit configuration error.
 */
export function getApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (envUrl && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // Local development check in browser
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:4000';
    }
    // In production browser environments (e.g. deployed on Vercel), do NOT silently fall back to localhost
    return '';
  }

  // Local development / testing in Node.js runtime
  if (process.env.NODE_ENV !== 'production') {
    return 'http://localhost:4000';
  }

  return '';
}

/**
 * Standard API error structure with helpful diagnostics
 */
export class ApiClientError extends Error {
  public statusCode: number;
  public details?: any;

  constructor(message: string, statusCode: number = 500, details?: any) {
    super(message);
    this.name = 'ApiClientError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Core HTTP helper handling URL construction, timeouts, non-2xx status parsing, and network failures.
 */
async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  timeoutMs: number = 30000
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    throw new ApiClientError(
      'KnoTrail backend API base URL is not configured. Please set NEXT_PUBLIC_API_BASE_URL in your deployment environment (e.g. Vercel Dashboard) pointing to your active Render backend service.',
      0
    );
  }
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${baseUrl}${normalizedEndpoint}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // Attach verified authentication token if available
  if (clientAuthToken && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${clientAuthToken}`;
  }

  // Attach demo perspective for anonymous demo preview if configured
  if (clientDemoPerspective && !headers['X-Demo-Perspective']) {
    headers['X-Demo-Perspective'] = clientDemoPerspective;
  }

  // If body is NOT FormData, set Content-Type: application/json
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      let errorMessage = `HTTP Error ${response.status}: ${response.statusText}`;
      let errorDetails: any = null;

      try {
        const errorJson = await response.json();
        if (errorJson && errorJson.error) {
          errorMessage = errorJson.error;
        }
        errorDetails = errorJson;
      } catch {
        // Plain text or HTML fallback
        const text = await response.text().catch(() => '');
        if (text) errorMessage = text.slice(0, 200);
      }

      throw new ApiClientError(errorMessage, response.status, errorDetails);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return (await response.json()) as T;
  } catch (error: any) {
    clearTimeout(timer);

    if (error instanceof ApiClientError) {
      throw error;
    }

    if (error.name === 'AbortError') {
      throw new ApiClientError(
        `Backend request timed out after ${timeoutMs / 1000} seconds. The backend may still be processing intensive operations in the background.`,
        504
      );
    }

    // Network / CORS failure
    const isLocal = url.includes('localhost') || url.includes('127.0.0.1');
    const diagnostic = isLocal
      ? `Cannot connect to KnoTrail backend API (${url}). If running locally, ensure the backend API server is running on port 4000 (run "npm run backend:dev" or "npm run backend:start").`
      : `Cannot connect to KnoTrail backend API (${url}). Ensure the Render backend service is active and CORS_ORIGINS permits this origin.`;

    throw new ApiClientError(diagnostic, 0, { originalError: error.message });
  }
}

/**
 * Centralized KnoTrail Frontend API Client
 */
export const apiClient = {
  // Base URL introspection
  getBaseUrl: getApiBaseUrl,

  // --- Authentication ---
  async login(credentials: {
    email: string;
    password: string;
    workspaceId?: string;
  }): Promise<{
    status: string;
    token: string;
    authProvider: string;
    user: { userId: string; email: string; role: UserRole };
    workspace: { id: string; isProtected: boolean; memberRole: UserRole };
  }> {
    const res = await request<{
      status: string;
      token: string;
      authProvider: string;
      user: { userId: string; email: string; role: UserRole };
      workspace: { id: string; isProtected: boolean; memberRole: UserRole };
    }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    if (res.token) {
      setClientAuthToken(res.token);
    }
    return res;
  },

  async logout(): Promise<{ status: string; message: string }> {
    try {
      const res = await request<{ status: string; message: string }>('/api/auth/logout', {
        method: 'POST',
      });
      return res;
    } finally {
      setClientAuthToken(null);
    }
  },

  async getAuthSession(workspaceId?: string): Promise<{
    isAuthenticated: boolean;
    user: { userId: string; email: string; authProvider: string } | null;
    role?: UserRole;
    workspaceId?: string | null;
  }> {
    const query = workspaceId ? `?workspaceId=${encodeURIComponent(workspaceId)}` : '';
    return request(`/api/auth/me${query}`);
  },

  async getAuthStatus(): Promise<{
    supabaseConfigured: boolean;
    demoAccountAvailable: boolean;
    demoEmail: string;
    demoAccounts?: Array<{
      role: UserRole;
      email: string;
      name: string;
      description: string;
    }>;
  }> {
    return request('/api/auth/status');
  },

  // --- Workspaces ---
  async getWorkspace(workspaceId: string): Promise<{ workspaceId: string; project: ProjectData; status: string }> {
    return request<{ workspaceId: string; project: ProjectData; status: string }>(
      `/api/workspaces?workspaceId=${encodeURIComponent(workspaceId)}`
    );
  },

  async saveWorkspace(
    workspaceId: string,
    project: ProjectData
  ): Promise<{ workspaceId: string; project: ProjectData; status: string }> {
    return request<{ workspaceId: string; project: ProjectData; status: string }>('/api/workspaces', {
      method: 'POST',
      body: JSON.stringify({ workspaceId, project }),
    });
  },

  async createWorkspace(
    workspaceId: string,
    initialProject?: ProjectData
  ): Promise<{ workspaceId: string; project: ProjectData; status: string }> {
    return request<{ workspaceId: string; project: ProjectData; status: string }>('/api/workspaces', {
      method: 'POST',
      body: JSON.stringify({ workspaceId, initialProject }),
    });
  },

  async resetWorkspace(workspaceId: string): Promise<{ workspaceId: string; project: ProjectData; status: string }> {
    return request<{ workspaceId: string; project: ProjectData; status: string }>('/api/workspaces/reset', {
      method: 'POST',
      body: JSON.stringify({ workspaceId }),
    });
  },

  async claimWorkspace(
    workspaceId: string
  ): Promise<{ status: string; workspaceId: string; member: WorkspaceMemberRecord; isProtected: boolean }> {
    return request<{ status: string; workspaceId: string; member: WorkspaceMemberRecord; isProtected: boolean }>(
      `/api/workspaces/${encodeURIComponent(workspaceId)}/claim`,
      { method: 'POST' }
    );
  },

  async getWorkspaceMembers(
    workspaceId: string
  ): Promise<{ workspaceId: string; members: WorkspaceMemberRecord[]; status: string }> {
    return request<{ workspaceId: string; members: WorkspaceMemberRecord[]; status: string }>(
      `/api/workspaces/${encodeURIComponent(workspaceId)}/members?workspaceId=${encodeURIComponent(workspaceId)}`
    );
  },

  async addWorkspaceMember(
    workspaceId: string,
    member: { userId: string; email: string; role: UserRole }
  ): Promise<{ status: string; workspaceId: string; member: WorkspaceMemberRecord }> {
    return request<{ status: string; workspaceId: string; member: WorkspaceMemberRecord }>(
      `/api/workspaces/${encodeURIComponent(workspaceId)}/members`,
      {
        method: 'POST',
        body: JSON.stringify({ workspaceId, ...member }),
      }
    );
  },

  async removeWorkspaceMember(
    workspaceId: string,
    userId: string
  ): Promise<{ status: string; workspaceId: string; userId: string }> {
    return request<{ status: string; workspaceId: string; userId: string }>(
      `/api/workspaces/${encodeURIComponent(workspaceId)}/members/${encodeURIComponent(userId)}?workspaceId=${encodeURIComponent(workspaceId)}`,
      {
        method: 'DELETE',
      }
    );
  },

  // --- Projects ---
  async getProject(workspaceId: string, projectId: string): Promise<{ project: ProjectData; status: string }> {
    return request<{ project: ProjectData; status: string }>(
      `/api/projects/${encodeURIComponent(projectId)}?workspaceId=${encodeURIComponent(workspaceId)}`
    );
  },

  async updateProject(
    workspaceId: string,
    projectId: string,
    updates: Partial<ProjectData>
  ): Promise<{ project: ProjectData; status: string }> {
    return request<{ project: ProjectData; status: string }>(
      `/api/projects/${encodeURIComponent(projectId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ workspaceId, updates }),
      }
    );
  },

  // --- Sources & Documents ---
  async getSources(workspaceId: string): Promise<{ sources: ProjectSource[]; status: string }> {
    return request<{ sources: ProjectSource[]; status: string }>(
      `/api/sources?workspaceId=${encodeURIComponent(workspaceId)}`
    );
  },

  async addSource(
    workspaceId: string,
    data: { name: string; type: string; content?: string; description?: string }
  ): Promise<{ source: ProjectSource; finding?: KnowledgeFinding; project: ProjectData; status: string }> {
    return request<{ source: ProjectSource; finding?: KnowledgeFinding; project: ProjectData; status: string }>(
      '/api/sources',
      {
        method: 'POST',
        body: JSON.stringify({ workspaceId, ...data }),
      }
    );
  },

  async getSource(workspaceId: string, sourceId: string): Promise<{ source: ProjectSource; status: string }> {
    return request<{ source: ProjectSource; status: string }>(
      `/api/sources/${encodeURIComponent(sourceId)}?workspaceId=${encodeURIComponent(workspaceId)}`
    );
  },

  async deleteSource(
    workspaceId: string,
    sourceId: string
  ): Promise<{ project: ProjectData; deletedSourceId: string; status: string }> {
    return request<{ project: ProjectData; deletedSourceId: string; status: string }>(
      `/api/sources/${encodeURIComponent(sourceId)}`,
      {
        method: 'DELETE',
        body: JSON.stringify({ workspaceId }),
      }
    );
  },

  async uploadFiles(
    workspaceId: string,
    files: File[]
  ): Promise<{
    workspaceId: string;
    results: Array<{
      filename: string;
      success: boolean;
      sourceId?: string;
      error?: string;
      status?: string;
      pageCount?: number;
      lineCount?: number;
    }>;
    successCount: number;
    failureCount: number;
    project: ProjectData;
    status: string;
  }> {
    const formData = new FormData();
    formData.append('workspaceId', workspaceId);
    for (const file of files) {
      formData.append('files', file);
    }

    return request(
      '/api/sources/upload',
      {
        method: 'POST',
        body: formData,
      },
      60000 // 60s timeout for large uploads
    );
  },

  // --- AI Extraction & Grounding ---
  async getAiConfig(workspaceId: string): Promise<{
    configured: boolean;
    model: string;
    workspaceId: string;
    eligibleSourcesCount: number;
    totalSourcesCount: number;
    totalFindingsCount: number;
  }> {
    return request(
      `/api/analysis/extract?workspaceId=${encodeURIComponent(workspaceId)}`
    );
  },

  async runAiExtraction(
    workspaceId: string,
    sourceIds?: string[],
    model?: string
  ): Promise<{
    success: boolean;
    count: number;
    findings: KnowledgeFinding[];
    telemetry: any;
    project: ProjectData;
  }> {
    return request(
      '/api/analysis/extract',
      {
        method: 'POST',
        body: JSON.stringify({ workspaceId, sourceIds, model }),
      },
      90000 // 90s timeout for multi-source LLM extraction
    );
  },

  async runVerification(
    workspaceId: string,
    useAi: boolean = true
  ): Promise<{
    success: boolean;
    workspaceId: string;
    project: ProjectData;
    verifiedFindings: KnowledgeFinding[];
    conflicts: ConflictRecord[];
    summary: any;
  }> {
    return request('/api/analysis/verify', {
      method: 'POST',
      body: JSON.stringify({ workspaceId, useAi }),
    });
  },

  // --- Human Review & Oversight ---
  async approveFinding(
    workspaceId: string,
    findingId: string,
    reviewerNotes?: string,
    reviewerName?: string
  ): Promise<{ finding: KnowledgeFinding; project: ProjectData; status: string }> {
    return request(`/api/findings/${encodeURIComponent(findingId)}/approve`, {
      method: 'POST',
      body: JSON.stringify({ workspaceId, reviewerNotes, reviewerName }),
    });
  },

  async rejectFinding(
    workspaceId: string,
    findingId: string,
    reason: string,
    reviewerName?: string
  ): Promise<{ finding: KnowledgeFinding; project: ProjectData; status: string }> {
    return request(`/api/findings/${encodeURIComponent(findingId)}/reject`, {
      method: 'POST',
      body: JSON.stringify({ workspaceId, reason, reviewerName }),
    });
  },

  async editFinding(
    workspaceId: string,
    findingId: string,
    updates: Partial<KnowledgeFinding>,
    reviewerNotes?: string,
    reviewerName?: string
  ): Promise<{ finding: KnowledgeFinding; project: ProjectData; status: string }> {
    return request(`/api/findings/${encodeURIComponent(findingId)}/edit`, {
      method: 'POST',
      body: JSON.stringify({ workspaceId, updates, reviewerNotes, reviewerName }),
    });
  },

  async getAuditHistory(
    workspaceId: string,
    findingId: string
  ): Promise<{ findingId: string; auditHistory: ReviewAuditAction[]; count: number }> {
    return request(
      `/api/findings/${encodeURIComponent(findingId)}/audit?workspaceId=${encodeURIComponent(workspaceId)}`
    );
  },

  async resolveConflict(
    workspaceId: string,
    findingId: string,
    resolution: string,
    resolvedBy?: string
  ): Promise<{ finding: KnowledgeFinding; project: ProjectData; status: string }> {
    return request(`/api/findings/${encodeURIComponent(findingId)}/resolve-conflict`, {
      method: 'POST',
      body: JSON.stringify({ workspaceId, resolution, resolvedBy }),
    });
  },

  async resolveConflictRecord(
    workspaceId: string,
    conflictId: string,
    chosenFindingId?: string,
    resolutionNotes?: string,
    resolvedBy?: string
  ): Promise<{ success: boolean; conflictId: string; project: ProjectData }> {
    return request(`/api/conflicts/${encodeURIComponent(conflictId)}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ workspaceId, chosenFindingId, resolutionNotes, resolvedBy }),
    });
  },

  // --- Handover Dossier & Delivery ---
  async getHandovers(workspaceId: string): Promise<{
    workspaceId: string;
    project: ProjectData;
    blockStatus: any;
    currentHandover: HandoverDocument | null;
    handovers: HandoverDocument[];
    markdown: string;
    json: any;
    status: string;
  }> {
    return request(`/api/handovers?workspaceId=${encodeURIComponent(workspaceId)}`);
  },

  async generateHandover(
    workspaceId: string,
    signerName?: string,
    options?: { version?: string; regenerate?: boolean }
  ): Promise<{
    project: ProjectData;
    handover: HandoverDocument;
    markdown: string;
    json: any;
    status: string;
  }> {
    return request('/api/handovers/generate', {
      method: 'POST',
      body: JSON.stringify({ workspaceId, signerName, ...options }),
    });
  },

  async certifyHandover(
    workspaceId: string,
    signerName?: string
  ): Promise<{
    project: ProjectData;
    handover: HandoverDocument;
    markdown: string;
    json: any;
    status: string;
  }> {
    return request('/api/handovers/certify', {
      method: 'POST',
      body: JSON.stringify({ workspaceId, signerName }),
    });
  },

  getExportUrl(
    workspaceId: string,
    format: 'markdown' | 'json' | 'html' | 'pdf' = 'markdown',
    handoverId?: string
  ): string {
    const baseUrl = getApiBaseUrl();
    const params = new URLSearchParams({ workspaceId, format });
    if (handoverId) params.append('handoverId', handoverId);
    return `${baseUrl}/api/handovers/export?${params.toString()}`;
  },

  async createShareLink(
    workspaceId: string,
    handoverId: string
  ): Promise<{ shareRecord: HandoverShareRecord; shareUrl: string; status: string }> {
    return request('/api/handovers/share', {
      method: 'POST',
      body: JSON.stringify({ workspaceId, handoverId }),
    });
  },

  async revokeShareLink(workspaceId: string, token: string): Promise<{ status: string }> {
    return request('/api/handovers/share', {
      method: 'DELETE',
      body: JSON.stringify({ workspaceId, token }),
    });
  },

  async getSharedHandover(
    token: string
  ): Promise<{
    handover: HandoverDocument;
    projectName: string;
    markdown: string;
    status: string;
  }> {
    return request(`/api/handovers/share/${encodeURIComponent(token)}`);
  },

  // ============================================================================
  // GitHub Integration & Repository Management
  // ============================================================================

  async listGitHubIntegrations(
    workspaceId: string
  ): Promise<{ integrations: GitHubIntegration[]; status: string; count: number }> {
    return request(`/api/github/integrations?workspaceId=${encodeURIComponent(workspaceId)}`);
  },

  async connectGitHubRepository(
    workspaceId: string,
    params: {
      repoOwner: string;
      repoName: string;
      selectedBranch?: string;
      installationId?: number | null;
      config?: Partial<GitHubIntegrationConfig>;
    }
  ): Promise<{ integration: GitHubIntegration; status: string; message: string }> {
    return request('/api/github/integrations', {
      method: 'POST',
      body: JSON.stringify({ workspaceId, ...params }),
    });
  },

  async syncGitHubIntegration(
    workspaceId: string,
    repoId: number,
    options?: {
      runAiExtraction?: boolean;
      reason?: string;
    }
  ): Promise<{
    status: string;
    knowledgeStatus?: 'extracting' | 'completed' | 'failed' | 'skipped' | 'idle';
    integration: GitHubIntegration;
    source: ProjectSource;
    recordCounts: { commits: number; pullRequests: number; issues: number; docs: number };
    isChanged: boolean;
    findingsAdded?: number;
    updateRecord?: ContinuousUpdateRecord;
  }> {
    // 120-second timeout for synchronous full repository synchronization
    return request(
      `/api/github/integrations/${encodeURIComponent(repoId)}/sync`,
      {
        method: 'POST',
        body: JSON.stringify({ workspaceId, ...options }),
      },
      120000
    );
  },

  /**
   * Starts an asynchronous background repository synchronization job.
   * Returns immediately with a jobId so the frontend can poll real-time progress.
   */
  async startAsyncSync(
    workspaceId: string,
    repoId: number,
    options?: {
      runAiExtraction?: boolean;
      reason?: string;
    }
  ): Promise<{
    jobId: string;
    status: string;
    phase: number;
    phaseName: string;
    percent: number;
    counters?: IngestionJobCounters;
    message: string;
  }> {
    return request(
      `/api/github/integrations/${encodeURIComponent(repoId)}/sync`,
      {
        method: 'POST',
        body: JSON.stringify({ workspaceId, async: true, ...options }),
      },
      15000
    );
  },

  /**
   * Polls real-time progress, active phase, and telemetry counters for an ingestion job.
   */
  async getSyncJobStatus(
    workspaceId: string,
    repoId: number,
    jobId: string
  ): Promise<{
    job: IngestionJobState;
    status: string;
  }> {
    return request(
      `/api/github/integrations/${encodeURIComponent(repoId)}/job/${encodeURIComponent(jobId)}?workspaceId=${encodeURIComponent(workspaceId)}`,
      {},
      10000
    );
  },

  /**
   * Resumes Phase 8 (persistence) specifically using cached scan data.
   * Skips GitHub file fetching and Gemini AI extraction completely.
   */
  async resumePersistence(
    workspaceId: string,
    repoId: number
  ): Promise<{
    success: boolean;
    error?: string;
    findingsAdded?: number;
  }> {
    return request(
      `/api/github/integrations/${encodeURIComponent(repoId)}/resume-persist`,
      {
        method: 'POST',
        body: JSON.stringify({ workspaceId }),
      },
      30000
    );
  },

  async getContinuousUpdateHistory(
    workspaceId: string,
    repoId: number,
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<ContinuousUpdateHistoryResponse> {
    const params = new URLSearchParams({ workspaceId: String(workspaceId) });
    if (typeof options?.limit === 'number') {
      params.set('limit', String(options.limit));
    }
    if (typeof options?.offset === 'number') {
      params.set('offset', String(options.offset));
    }
    return request(`/api/github/integrations/${encodeURIComponent(repoId)}/history?${params.toString()}`);
  },

  async retryContinuousUpdate(
    workspaceId: string,
    repoId: number,
    updateId: string
  ): Promise<ContinuousUpdateRetryResponse> {
    return request(`/api/github/integrations/${encodeURIComponent(repoId)}/retry-update`, {
      method: 'POST',
      body: JSON.stringify({ workspaceId, updateId }),
    });
  },

  async disconnectGitHubRepository(
    workspaceId: string,
    repoId: number
  ): Promise<{ status: string; repoId: number; message: string }> {
    return request(`/api/github/integrations/${encodeURIComponent(repoId)}`, {
      method: 'DELETE',
      body: JSON.stringify({ workspaceId }),
    });
  },

  async getGitHubRateLimit(
    workspaceId: string
  ): Promise<{ rateLimit: any; status: string }> {
    return request(`/api/github/rate-limit?workspaceId=${encodeURIComponent(workspaceId)}`);
  },

  async getCodebaseIntelligence(
    workspaceId: string,
    repoId: number
  ): Promise<{ intelligence: CodebaseIntelligence | null; status: string }> {
    return request(`/api/github/integrations/${encodeURIComponent(repoId)}/intelligence?workspaceId=${encodeURIComponent(workspaceId)}`);
  },

  async askCodebaseQuestion(
    workspaceId: string,
    repoId: number,
    question: string
  ): Promise<{ response: CodebaseQuestionResponse; status: string }> {
    return request(`/api/github/integrations/${encodeURIComponent(repoId)}/ask`, {
      method: 'POST',
      body: JSON.stringify({ workspaceId, question }),
    });
  },
};
