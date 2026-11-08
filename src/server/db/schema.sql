-- KnoTrail Relational Database Schema
-- Production Target: PostgreSQL (compatible with Supabase, Neon, AWS RDS, Railway, Vercel Postgres)
-- Governance: CodersInPune Hackathon 2026 - Deploy_or_Die (Samyak Gedam & Sanshrey Sanagar)

-- 1. Anonymous Workspaces
CREATE TABLE IF NOT EXISTS workspaces (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL DEFAULT 'Anonymous Workspace',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Projects
CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(64) PRIMARY KEY,
    workspace_id VARCHAR(64) NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(64) NOT NULL,
    description TEXT NOT NULL,
    target_exit_date VARCHAR(64) NOT NULL,
    version VARCHAR(32) NOT NULL DEFAULT '1.0.0',
    last_analysed VARCHAR(64) NOT NULL DEFAULT 'Just now',
    executive_summary TEXT NOT NULL,
    handover_certified BOOLEAN NOT NULL DEFAULT FALSE,
    certified_by VARCHAR(255),
    certified_date VARCHAR(64),
    certification_hash VARCHAR(128),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Project Stakeholders
CREATE TABLE IF NOT EXISTS stakeholders (
    id VARCHAR(64) PRIMARY KEY,
    project_id VARCHAR(64) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    avatar VARCHAR(512),
    outgoing BOOLEAN NOT NULL DEFAULT FALSE,
    transition_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Project Sources
CREATE TABLE IF NOT EXISTS project_sources (
    id VARCHAR(64) PRIMARY KEY,
    project_id VARCHAR(64) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(32) NOT NULL, -- github, linear, slack, notion, docs, notes, pagerduty, jira
    status VARCHAR(32) NOT NULL DEFAULT 'connected', -- connected, syncing, error, idle
    last_sync VARCHAR(64) NOT NULL DEFAULT 'Just now',
    record_count INTEGER NOT NULL DEFAULT 0,
    icon VARCHAR(64) NOT NULL DEFAULT 'description',
    description TEXT,
    privacy_level VARCHAR(32) NOT NULL DEFAULT 'LOCAL_READ_ONLY',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 5. Knowledge Findings (Decisions, Tasks, Risks, Dependencies, Contacts, Next Actions)
CREATE TABLE IF NOT EXISTS knowledge_findings (
    id VARCHAR(64) PRIMARY KEY,
    project_id VARCHAR(64) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    type VARCHAR(32) NOT NULL, -- decision, task, risk, dependency, contact, next_action
    title VARCHAR(512) NOT NULL,
    summary TEXT NOT NULL,
    reasoning TEXT,
    impact TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'VERIFIED', -- VERIFIED, UNCERTAIN, CONFLICTING, MISSING
    confidence INTEGER NOT NULL DEFAULT 85,
    approved BOOLEAN NOT NULL DEFAULT FALSE,
    rejected BOOLEAN NOT NULL DEFAULT FALSE,
    reviewer_notes TEXT,
    category VARCHAR(128) NOT NULL,
    urgency VARCHAR(32) NOT NULL DEFAULT 'medium', -- critical, high, medium, low
    owner VARCHAR(255) NOT NULL,
    created_date VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. Evidence Citations (Grounding to source files, line ranges, commits)
CREATE TABLE IF NOT EXISTS evidence_citations (
    id VARCHAR(64) PRIMARY KEY,
    finding_id VARCHAR(64) NOT NULL REFERENCES knowledge_findings(id) ON DELETE CASCADE,
    source_id VARCHAR(64) NOT NULL REFERENCES project_sources(id) ON DELETE CASCADE,
    source_name VARCHAR(255) NOT NULL,
    source_type VARCHAR(32) NOT NULL,
    file_path VARCHAR(512) NOT NULL,
    line_range VARCHAR(64) NOT NULL,
    commit_sha VARCHAR(64),
    author VARCHAR(255) NOT NULL,
    timestamp VARCHAR(64) NOT NULL,
    snippet TEXT NOT NULL,
    content_hash VARCHAR(128) NOT NULL,
    clearance_tier VARCHAR(32) NOT NULL DEFAULT 'INTERNAL', -- PUBLIC, INTERNAL, CONFIDENTIAL
    confidence INTEGER NOT NULL DEFAULT 95,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. Conflict Details
CREATE TABLE IF NOT EXISTS conflict_details (
    id VARCHAR(64) PRIMARY KEY,
    finding_id VARCHAR(64) NOT NULL UNIQUE REFERENCES knowledge_findings(id) ON DELETE CASCADE,
    source_a_name VARCHAR(255) NOT NULL,
    source_a_claim TEXT NOT NULL,
    source_a_reference VARCHAR(512) NOT NULL,
    source_b_name VARCHAR(255) NOT NULL,
    source_b_claim TEXT NOT NULL,
    source_b_reference VARCHAR(512) NOT NULL,
    resolution TEXT,
    resolved_by VARCHAR(255),
    resolved_at VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8. Human Review Audit Log
CREATE TABLE IF NOT EXISTS human_review_actions (
    id VARCHAR(64) PRIMARY KEY,
    project_id VARCHAR(64) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    finding_id VARCHAR(64) REFERENCES knowledge_findings(id) ON DELETE SET NULL,
    action_type VARCHAR(32) NOT NULL, -- APPROVE, REJECT, EDIT, RESOLVE_CONFLICT, CERTIFY
    reviewer_name VARCHAR(255) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 9. Generated Handover Dossiers
CREATE TABLE IF NOT EXISTS handovers (
    id VARCHAR(64) PRIMARY KEY,
    project_id VARCHAR(64) NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
    certified_by VARCHAR(255) NOT NULL,
    certified_date VARCHAR(64) NOT NULL,
    certification_hash VARCHAR(128) NOT NULL,
    markdown_content TEXT NOT NULL,
    json_content JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_workspace ON projects(workspace_id);
CREATE INDEX IF NOT EXISTS idx_sources_project ON project_sources(project_id);
CREATE INDEX IF NOT EXISTS idx_findings_project ON knowledge_findings(project_id);
CREATE INDEX IF NOT EXISTS idx_findings_type ON knowledge_findings(type);
CREATE INDEX IF NOT EXISTS idx_findings_status ON knowledge_findings(status);
CREATE INDEX IF NOT EXISTS idx_citations_finding ON evidence_citations(finding_id);
