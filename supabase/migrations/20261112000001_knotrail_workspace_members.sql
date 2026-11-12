-- KnoTrail Round 3: Trusted Workspace Membership & Role Table
-- Migration: 20261112000001_knotrail_workspace_members.sql
-- Governance: CodersInPune Hackathon 2026 - Deploy_or_Die (Samyak Gedam & Sanshrey Sanagar)

-- 1. Create workspace_members table
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

-- 2. Add is_protected and owner_id columns to workspaces table if not present
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

-- 3. Enable Row Level Security (RLS) on workspace_members
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- Deny direct public (anon and authenticated) access - server service_role only
DROP POLICY IF EXISTS "Deny anon access on workspace_members" ON workspace_members;
CREATE POLICY "Deny anon access on workspace_members" ON workspace_members
    FOR ALL TO anon USING (false);

DROP POLICY IF EXISTS "Deny authenticated access on workspace_members" ON workspace_members;
CREATE POLICY "Deny authenticated access on workspace_members" ON workspace_members
    FOR ALL TO authenticated USING (false);

-- Grant privileges to service_role
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        GRANT ALL ON TABLE workspace_members TO service_role;
    END IF;
END $$;

