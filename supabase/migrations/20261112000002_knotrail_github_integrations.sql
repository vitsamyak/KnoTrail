-- Migration: 20261112000002_knotrail_github_integrations.sql
-- Description: Phase 2 GitHub Integration Schema & Webhook Delivery Tracking
-- Governance: CodersInPune Hackathon 2026 - Deploy_or_Die (Samyak Gedam & Sanshrey Sanagar)

-- 1. Table: github_integrations
-- Tracks connected GitHub repositories per workspace with synchronization status and metadata.
-- SECURITY RULE: Never store GitHub App private keys or installation access tokens in plaintext database fields.
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

-- Appropriate indexes for fast lookups by workspace, repo, and owner/name
CREATE INDEX IF NOT EXISTS idx_github_integrations_ws ON github_integrations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_github_integrations_repo ON github_integrations(repo_id);
CREATE INDEX IF NOT EXISTS idx_github_integrations_owner_name ON github_integrations(repo_owner, repo_name);

-- 2. Table: github_webhook_events
-- Implements delivery idempotency and replay protection for GitHub webhooks.
CREATE TABLE IF NOT EXISTS github_webhook_events (
    event_id VARCHAR(100) PRIMARY KEY, -- From X-GitHub-Delivery UUID
    event_type VARCHAR(50) NOT NULL,    -- e.g. 'push', 'pull_request', 'issues'
    repo_id BIGINT NOT NULL,
    payload_hash VARCHAR(64) NOT NULL,  -- SHA-256 of raw webhook payload
    processed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_github_webhook_events_processed ON github_webhook_events(processed_at DESC);
CREATE INDEX IF NOT EXISTS idx_github_webhook_events_repo ON github_webhook_events(repo_id);

-- 3. Row Level Security (RLS) Enforcement
-- Integration records and webhook events contain infrastructure details.
-- Deny direct access to anon and authenticated clients; grant strictly to service_role.
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

-- Grant privileges to service_role and postgres roles if they exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        GRANT ALL ON TABLE github_integrations TO service_role;
        GRANT ALL ON TABLE github_webhook_events TO service_role;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'postgres') THEN
        GRANT ALL ON TABLE github_integrations TO postgres;
        GRANT ALL ON TABLE github_webhook_events TO postgres;
    END IF;
END $$;

-- 4. Reload PostgREST Schema Cache
-- Explicitly signal PostgREST listener on PostgreSQL notification channel 'pgrst'
-- to immediately refresh its schema cache without requiring server reboot.
NOTIFY pgrst, 'reload schema';
