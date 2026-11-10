import type {
  ProjectData,
  ProjectSource,
  KnowledgeFinding,
  ConflictRecord,
  ReviewAuditAction,
  HandoverDocument,
  HandoverShareRecord,
} from './types.ts';

/**
 * Returns the normalized backend API base URL.
 * Reads NEXT_PUBLIC_API_BASE_URL (e.g. "https://knotrail-api.onrender.com").
 * In local browser development, falls back to "http://localhost:4000" if unset.
 * Trailing slashes are strictly stripped.
 */
export function getApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (envUrl && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:4000';
    }
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
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${baseUrl}${normalizedEndpoint}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  };

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
        `Backend request timed out after ${timeoutMs / 1000} seconds. Please verify the Render backend is active.`,
        504
      );
    }

    // Network / CORS failure
    throw new ApiClientError(
      `Cannot connect to KnoTrail backend API (${url}). Ensure the Render API service is running and CORS_ORIGINS permits this origin.`,
      0,
      { originalError: error.message }
    );
  }
}

/**
 * Centralized KnoTrail Frontend API Client
 */
export const apiClient = {
  // Base URL introspection
  getBaseUrl: getApiBaseUrl,

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
};
