-- ============================================================================
-- KnoTrail: Production Hotfix Migration for GitHub Integration & Schema Cache
-- Migration: 20261116000001_knotrail_github_integrations_hotfix.sql
-- Description: Idempotent provisioning of github_integrations and webhook tables,
--              ensuring RLS policies, role grants, and PostgREST schema cache reload.
-- Team: Deploy_or_Die (Samyak Gedam & Sanshrey Sanagar)
-- Hackathon: CodersInPune Hackathon 2026
-- ============================================================================

-- Step 1: Ensure Workspaces Table and Supporting Columns Exist
CREATE TABLE IF NOT EXISTS workspaces (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL DEFAULT 'Anonymous Workspace',
    project_data JSONB NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'workspaces' AND column_name = 'is_protected'
    ) THEN
        ALTER TABLE workspaces ADD COLUMN is_protected BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'workspaces' AND column_name = 'owner_id'
    ) THEN
        ALTER TABLE workspaces ADD COLUMN owner_id VARCHAR(64);
    END IF;
END $$;

-- Step 2: Ensure Workspace Members Table Exists
CREATE TABLE IF NOT EXISTS workspace_members (
    workspace_id VARCHAR(64) NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id VARCHAR(64) NOT NULL,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('MANAGER', 'DEVELOPER', 'EXTERNAL')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (workspace_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_ws ON workspace_members(workspace_id);

ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Deny anon access on workspace_members" ON workspace_members;
CREATE POLICY "Deny anon access on workspace_members" ON workspace_members
    FOR ALL TO anon USING (false);

DROP POLICY IF EXISTS "Deny authenticated access on workspace_members" ON workspace_members;
CREATE POLICY "Deny authenticated access on workspace_members" ON workspace_members
    FOR ALL TO authenticated USING (false);

-- Step 3: Create GitHub Integrations Table
-- SECURITY INVARIANT: GitHub tokens and private keys are never stored in plaintext fields.
CREATE TABLE IF NOT EXISTS github_integrations (
    id VARCHAR(64) PRIMARY KEY,
    workspace_id VARCHAR(64) NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    installation_id BIGINT,
    repo_owner VARCHAR(255) NOT NULL,
    repo_name VARCHAR(255) NOT NULL,
    repo_id BIGINT NOT NULL,
    default_branch VARCHAR(100) NOT NULL DEFAULT 'main',
    selected_branch VARCHAR(100) NOT NULL DEFAULT 'main',
    sync_status VARCHAR(50) NOT NULL DEFAULT 'idle' CHECK (sync_status IN ('idle', 'syncing', 'synced', 'error')),
    last_synced_at TIMESTAMPTZ,
    last_commit_sha VARCHAR(40),
    error_message TEXT,
    config JSONB NOT NULL DEFAULT '{"includeCommits": true, "includePullRequests": true, "includeIssues": true, "includeDocs": true}'::jsonb,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_workspace_repo UNIQUE (workspace_id, repo_id)
);

CREATE INDEX IF NOT EXISTS idx_github_integrations_ws ON github_integrations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_github_integrations_repo ON github_integrations(repo_id);
CREATE INDEX IF NOT EXISTS idx_github_integrations_owner_name ON github_integrations(repo_owner, repo_name);

-- Step 4: Create GitHub Webhook Events Table
CREATE TABLE IF NOT EXISTS github_webhook_events (
    event_id VARCHAR(100) PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    repo_id BIGINT NOT NULL,
    payload_hash VARCHAR(64) NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_github_webhook_events_processed ON github_webhook_events(processed_at DESC);
CREATE INDEX IF NOT EXISTS idx_github_webhook_events_repo ON github_webhook_events(repo_id);

-- Step 5: Enable Row Level Security (RLS)
ALTER TABLE github_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE github_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Deny anon access on github_integrations" ON github_integrations;
CREATE POLICY "Deny anon access on github_integrations" ON github_integrations
    FOR ALL TO anon USING (false);

DROP POLICY IF EXISTS "Deny authenticated access on github_integrations" ON github_integrations;
CREATE POLICY "Deny authenticated access on github_integrations" ON github_integrations
    FOR ALL TO authenticated USING (false);

DROP POLICY IF EXISTS "Deny anon access on github_webhook_events" ON github_webhook_events;
CREATE POLICY "Deny anon access on github_webhook_events" ON github_webhook_events
    FOR ALL TO anon USING (false);

DROP POLICY IF EXISTS "Deny authenticated access on github_webhook_events" ON github_webhook_events;
CREATE POLICY "Deny authenticated access on github_webhook_events" ON github_webhook_events
    FOR ALL TO authenticated USING (false);

-- Step 6: Grant Server Role Access
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        GRANT ALL ON TABLE workspaces TO service_role;
        GRANT ALL ON TABLE workspace_members TO service_role;
        GRANT ALL ON TABLE github_integrations TO service_role;
        GRANT ALL ON TABLE github_webhook_events TO service_role;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN
        GRANT ALL ON TABLE workspaces TO postgres;
        GRANT ALL ON TABLE workspace_members TO postgres;
        GRANT ALL ON TABLE github_integrations TO postgres;
        GRANT ALL ON TABLE github_webhook_events TO postgres;
    END IF;
END $$;

-- Step 7: Force PostgREST Schema Cache Reload
-- Instructs PostgREST to immediately rebuild its OpenAPI definitions and table schema cache.
NOTIFY pgrst, 'reload schema';
