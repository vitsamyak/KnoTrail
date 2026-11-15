-- KnoTrail Authoritative Database Schema
-- Production Target: PostgreSQL / Supabase
-- Mirror of: supabase/migrations/20261110000001_knotrail_supabase_schema.sql
-- Governance: CodersInPune Hackathon 2026 - Deploy_or_Die (Samyak Gedam & Sanshrey Sanagar)

-- 1. Workspaces Table (Canonical JSONB Aggregate State with Versioning)
CREATE TABLE IF NOT EXISTS workspaces (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL DEFAULT 'Anonymous Workspace',
    project_data JSONB NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_workspaces_updated ON workspaces(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_workspaces_project_data ON workspaces USING gin (project_data);

-- 2. Handover Shares Table (Hashed Share Tokens for O(1) Public Handover Retrieval)
CREATE TABLE IF NOT EXISTS handover_shares (
    token_hash VARCHAR(64) PRIMARY KEY,
    workspace_id VARCHAR(64) NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    handover_id VARCHAR(64) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_handover_shares_workspace ON handover_shares(workspace_id);
CREATE INDEX IF NOT EXISTS idx_handover_shares_active ON handover_shares(token_hash) WHERE is_active = TRUE;

-- 3. Stored Procedure: save_workspace_state
-- Performs atomic, row-locked updates with optimistic concurrency control.
-- If p_expected_version is specified and does not match current version, raises CONCURRENCY_CONFLICT.
CREATE OR REPLACE FUNCTION save_workspace_state(
    p_workspace_id VARCHAR(64),
    p_project_data JSONB,
    p_expected_version INTEGER DEFAULT NULL
)
RETURNS TABLE (new_version INTEGER, updated_at TIMESTAMPTZ) AS $$
DECLARE
    v_current_version INTEGER;
BEGIN
    SELECT version INTO v_current_version FROM workspaces WHERE id = p_workspace_id FOR UPDATE;

    IF NOT FOUND THEN
        -- Insert new workspace if it does not exist
        INSERT INTO workspaces (id, name, project_data, version, created_at, updated_at)
        VALUES (
            p_workspace_id,
            COALESCE(p_project_data->>'name', 'Anonymous Workspace'),
            p_project_data,
            1,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        )
        RETURNING workspaces.version, workspaces.updated_at INTO new_version, updated_at;
        RETURN NEXT;
        RETURN;
    END IF;

    -- Check optimistic concurrency version if specified
    IF p_expected_version IS NOT NULL AND v_current_version <> p_expected_version THEN
        RAISE EXCEPTION 'CONCURRENCY_CONFLICT: Stale update rejected for workspace %. Expected version %, but current version is %.',
            p_workspace_id, p_expected_version, v_current_version
            USING ERRCODE = 'P0001';
    END IF;

    UPDATE workspaces
    SET project_data = p_project_data,
        name = COALESCE(p_project_data->>'name', workspaces.name),
        version = v_current_version + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_workspace_id
    RETURNING workspaces.version, workspaces.updated_at INTO new_version, updated_at;

    RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE handover_shares ENABLE ROW LEVEL SECURITY;

-- Restrict public (anon and authenticated) access - server secret role only
DROP POLICY IF EXISTS "Deny anon access on workspaces" ON workspaces;
CREATE POLICY "Deny anon access on workspaces" ON workspaces
    FOR ALL TO anon USING (false);

DROP POLICY IF EXISTS "Deny authenticated access on workspaces" ON workspaces;
CREATE POLICY "Deny authenticated access on workspaces" ON workspaces
    FOR ALL TO authenticated USING (false);

DROP POLICY IF EXISTS "Deny anon access on handover_shares" ON handover_shares;
CREATE POLICY "Deny anon access on handover_shares" ON handover_shares
    FOR ALL TO anon USING (false);

DROP POLICY IF EXISTS "Deny authenticated access on handover_shares" ON handover_shares;
CREATE POLICY "Deny authenticated access on handover_shares" ON handover_shares
    FOR ALL TO authenticated USING (false);

-- Grant privileges to service_role if role exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        GRANT ALL ON TABLE workspaces TO service_role;
        GRANT ALL ON TABLE handover_shares TO service_role;
        GRANT EXECUTE ON FUNCTION save_workspace_state TO service_role;
    END IF;
END $$;

-- 5. Safe Supabase Storage Bucket Initialization (if storage schema exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES (
            'knotrail-source-files',
            'knotrail-source-files',
            FALSE,
            10485760, -- 10 MB limit
            ARRAY['application/pdf', 'text/plain', 'text/markdown']
        )
        ON CONFLICT (id) DO UPDATE SET
            public = FALSE,
            file_size_limit = 10485760,
            allowed_mime_types = ARRAY['application/pdf', 'text/plain', 'text/markdown'];
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Notice: storage.buckets configuration skipped: %', SQLERRM;
END $$;

-- 6. Workspace Members Table & Protected Workspace Tracking (Round 3 RBAC)
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

ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Deny anon access on workspace_members" ON workspace_members;
CREATE POLICY "Deny anon access on workspace_members" ON workspace_members
    FOR ALL TO anon USING (false);

DROP POLICY IF EXISTS "Deny authenticated access on workspace_members" ON workspace_members;
CREATE POLICY "Deny authenticated access on workspace_members" ON workspace_members
    FOR ALL TO authenticated USING (false);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        GRANT ALL ON TABLE workspace_members TO service_role;
    END IF;
END $$;

-- 7. GitHub Integration & Webhook Delivery Tracking (Phase 2)
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

CREATE TABLE IF NOT EXISTS github_webhook_events (
    event_id VARCHAR(100) PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    repo_id BIGINT NOT NULL,
    payload_hash VARCHAR(64) NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_github_webhook_events_processed ON github_webhook_events(processed_at DESC);
CREATE INDEX IF NOT EXISTS idx_github_webhook_events_repo ON github_webhook_events(repo_id);

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

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        GRANT ALL ON TABLE github_integrations TO service_role;
        GRANT ALL ON TABLE github_webhook_events TO service_role;
    END IF;
END $$;

