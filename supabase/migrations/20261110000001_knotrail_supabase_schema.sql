-- KnoTrail Supabase Production Schema Migration
-- Migration: 20261110000001_knotrail_supabase_schema.sql
-- Target: Supabase PostgreSQL (also compatible with standard PostgreSQL 15+)
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
-- If p_expected_version is specified and does not match the current version, raises CONCURRENCY_CONFLICT.
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
