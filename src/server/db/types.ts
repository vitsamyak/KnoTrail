/**
 * Database schema and server-side model types for KnoTrail.
 * Preserves relationships across Workspaces, Projects, Sources, Findings, Evidence, and Handovers.
 */

import type { KnowledgeFinding, ProjectData, ProjectSource, Stakeholder } from '../../lib/types.ts';

export interface WorkspaceRecord {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  project: ProjectData;
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
