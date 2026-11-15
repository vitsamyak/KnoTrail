/**
 * Database schema and server-side model types for KnoTrail.
 * Preserves relationships across Workspaces, Projects, Sources, Findings, Evidence, and Handovers.
 */

import crypto from 'crypto';
import type { KnowledgeFinding, ProjectData, ProjectSource, Stakeholder } from '../../lib/types.ts';

export interface WorkspaceRecord {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  project: ProjectData;
  version?: number;
}

export interface DatabaseWorkspaceRow {
  id: string;
  name: string;
  project_data: ProjectData;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface DatabaseHandoverShareRow {
  token_hash: string;
  workspace_id: string;
  handover_id: string;
  is_active: boolean;
  created_at: string;
  revoked_at?: string | null;
}

export interface DatabaseWorkspaceMemberRow {
  workspace_id: string;
  user_id: string;
  email: string;
  role: 'MANAGER' | 'DEVELOPER' | 'EXTERNAL';
  created_at: string;
  updated_at: string;
}

export interface DatabaseGitHubIntegrationRow {
  id: string;
  workspace_id: string;
  installation_id: number | null;
  repo_owner: string;
  repo_name: string;
  repo_id: number;
  default_branch: string;
  selected_branch: string;
  sync_status: 'idle' | 'syncing' | 'synced' | 'error';
  last_synced_at: string | null;
  last_commit_sha: string | null;
  error_message: string | null;
  config: any;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export interface DatabaseGitHubWebhookEventRow {
  event_id: string;
  event_type: string;
  repo_id: number;
  payload_hash: string;
  processed_at: string;
}

export interface HumanReviewActionRecord {
  id: string;
  projectId: string;
  findingId?: string;
  actionType: 'APPROVE' | 'REJECT' | 'EDIT' | 'RESOLVE_CONFLICT' | 'CERTIFY';
  reviewerName: string;
  notes?: string;
  createdAt: string;
}

export interface HandoverRecord {
  id: string;
  projectId: string;
  certifiedBy: string;
  certifiedDate: string;
  certificationHash: string;
  markdownContent: string;
  jsonContent: ProjectData;
  createdAt: string;
}

export class ConcurrencyConflictError extends Error {
  constructor(message?: string) {
    super(
      message ||
        'Concurrent modification conflict detected: Workspace was updated by another request. Please reload and retry.'
    );
    this.name = 'ConcurrencyConflictError';
  }
}

/**
 * Validates workspace IDs to strictly prevent path traversal and injection attacks.
 * Allowed: alphanumeric characters, hyphens, and underscores between 3 and 64 characters.
 */
export function isValidWorkspaceId(id: unknown): id is string {
  if (typeof id !== 'string') return false;
  return /^[a-zA-Z0-9_-]{3,64}$/.test(id);
}

/**
 * Sanitizes and validates workspace input ID, returning a valid ID or null.
 */
export function sanitizeWorkspaceId(id: unknown): string | null {
  if (!isValidWorkspaceId(id)) return null;
  return id;
}

/**
 * Generates a cryptographically secure, unguessable anonymous workspace ID.
 * Format: ws_anon_<base36_timestamp>_<hex_random> (48-52 chars, conforms to regex).
 */
export function generateSecureWorkspaceId(): string {
  const timestamp = Date.now().toString(36);
  const randomBytes = crypto.randomBytes(16).toString('hex');
  return `ws_anon_${timestamp}_${randomBytes}`;
}

/**
 * Determines whether a workspace ID is an ephemeral anonymous demo workspace.
 * Format: ws_anon_*
 */
export function isAnonymousWorkspace(id: unknown): boolean {
  return typeof id === 'string' && id.startsWith('ws_anon_');
}

/**
 * Computes deterministic SHA-256 hash of a share token.
 * Raw share tokens are NEVER stored in plaintext in the database or logs.
 */
export function hashShareToken(token: string): string {
  if (!token || typeof token !== 'string') {
    throw new Error('Cannot hash invalid or empty share token.');
  }
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}
