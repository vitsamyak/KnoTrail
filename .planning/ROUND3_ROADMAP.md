# KnoTrail Round 3 Implementation Roadmap (Revised Security Architecture)

> **Milestone**: CodersInPune Hackathon 2026 — Final Round 3 Build  
> **Team**: Deploy_or_Die (Samyak Gedam & Sanshrey Sanagar)  
> **Date**: 2026-11-12 (Security Revision 2.0)  
> **Status**: APPROVED for Planning (Phase 0 Complete)

---

## Roadmap Overview

Round 3 delivers the three major platform enhancements showcased to hackathon judges:
1. **Server-Verified Role-Based Security**: Manager, Developer, and External access tiers governed by server-side membership records and Express authorization middleware, with strict confidential data redaction, cross-workspace access prevention, and an interactive Demo Perspective Switcher for zero-login evaluation.
2. **GitHub Integration**: Connect GitHub repositories (public or authenticated via PAT), parse commits, pull requests, and issues into verifiable source evidence, and link findings directly to GitHub commit SHAs.
3. **Continuous Knowledge Updates**: Automated source change detection, impact scanning for affected findings, outdated invalidation, and mandatory human review before re-certifying updated handover versions.
4. **Integration, Security & Production Verification**: End-to-end integration, performance profiling, secret isolation, CORS audit, and full automated test suite execution (targeting 170+ passing tests).

```
┌────────────────────────────────────────────────────────────────────────┐
│             PHASE 1: SERVER-VERIFIED ROLE-BASED SECURITY               │
│  - Database table: workspace_members (workspace_id, user_id, role)     │
│  - Express authMiddleware: verifies Supabase / HMAC session tokens     │
│  - Express roleAuthMiddleware: checks trusted membership & permissions │
│  - Dual-Space: Demo (ws_anon_*) vs Protected (ws_proj_*) isolation     │
│  - Server-side redactor: strips CONFIDENTIAL citations for External    │
│  - Header Demo Perspective Switcher (clearly marked as simulation)     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   PHASE 2: GITHUB INTEGRATION                          │
│  - GitHub REST API connector (commits, PRs, issues)                    │
│  - Activity document synthesizer & source ingestion                    │
│  - Direct commit SHA & PR evidence citation linking                    │
│  - SourceManagerView GitHub connection modal & cards                   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│              PHASE 3: CONTINUOUS KNOWLEDGE UPDATES                     │
│  - Source version tracking & SHA-256 diff detection                    │
│  - Impact scanner for displaced quotes and outdated claims             │
│  - Review Center "Needs Re-Review" gate and handover drift             │
│  - Version bumping (v1.0 -> v1.1) and re-certification history         │
│  - On-demand sync API and GitHub webhook receiver                      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│           PHASE 4: INTEGRATION, SECURITY & PRODUCTION TEST             │
│  - End-to-end cross-feature workflow verification                      │
│  - Security & secret leakage audit (verifying no token leaks)          │
│  - Gravitas verification contract execution (170+ tests PASS)          │
│  - Dual production builds: Next.js frontend + standalone Express       │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Phase Details

### Phase 1: Server-Verified Role-Based Security

**Goal**: Deliver genuine, server-verified role-based security across Manager, Developer, and External access tiers. Authoritative roles and workspace memberships are stored in trusted server-side database records. Zero reliance on client-supplied headers. Strict Express middleware guards every protected API route, prevents cross-workspace data tampering, segregates anonymous demo workspaces from protected workspaces, and redacts confidential findings from External users.

- **Dependencies**: None (First Round 3 Phase).
- **Files Likely to be Modified**:
  - `src/lib/types.ts`: Define `UserRole` (`'MANAGER' | 'DEVELOPER' | 'EXTERNAL'`), `WorkspaceMemberRecord`, and `AuthSessionState`.
  - `src/server/db/schema.sql` & `supabase/migrations/20261112000001_knotrail_workspace_members.sql` (NEW):
    - Create `workspace_members` table (`workspace_id`, `user_id`, `email`, `role`, `created_at`, `updated_at`).
    - Enable RLS on `workspace_members` (deny anon/authenticated; grant service_role).
  - `src/server/db/storage.ts`: Add `StorageRepository` methods: `getWorkspaceMember(wsId, userId)`, `addWorkspaceMember(wsId, member)`, `listWorkspaceMembers(wsId)`.
  - `src/server/db/supabaseStorage.ts`: Implement Supabase database queries for `workspace_members`.
  - `backend/middleware/auth.ts` (NEW): Verifies Bearer session tokens via Supabase Auth (`supabase.auth.getUser`) or server-signed HMAC tokens in offline development.
  - `backend/middleware/roleAuth.ts` (NEW): Resolves authoritative role from trusted server records for `(workspaceId, userId)`. Rejects client-supplied role headers. Enforces permission boundaries per route.
  - `src/server/security/redactor.ts` (NEW): Server-side utility that redacts `clearanceTier: 'CONFIDENTIAL'` findings, citations, and sensitive emails for External users.
  - `backend/routes/handovers.ts`: Guard certification and share revocation (`MANAGER` only). Apply redaction to `GET /api/handovers/export/:format` for `EXTERNAL`.
  - `backend/routes/conflicts.ts`: Guard conflict resolution (`MANAGER` only).
  - `backend/routes/sources.ts`: Guard upload and deletion (`MANAGER` or `DEVELOPER` only).
  - `backend/routes/findings.ts`: Guard approval and rejection (`MANAGER` or `DEVELOPER` only).
  - `src/components/layout/Header.tsx`: Add Demo Perspective Switcher (labeled `"Demo Simulation Mode — Not an Authentication Boundary"` in `ws_anon_*` workspaces).
  - `src/components/views/ReviewView.tsx`: Disable action controls for `EXTERNAL` users with informational banner.
  - `src/components/views/HandoverView.tsx`: Disable "Certify Handover" button for `DEVELOPER` and `EXTERNAL`.
  - `src/components/views/EvidenceView.tsx`: Render masked citations for `EXTERNAL`.
- **Database Changes**:
  - New table: `workspace_members` with foreign key `workspace_id REFERENCES workspaces(id) ON DELETE CASCADE`.
  - Primary key: `(workspace_id, user_id)`.
  - Index: `idx_workspace_members_user ON workspace_members(user_id)`.
- **New APIs**:
  - `GET /api/workspaces/:id/members`: Lists workspace members (Manager only).
  - `POST /api/workspaces/:id/members`: Invites/adds a member with a role (Manager only).
  - `GET /api/auth/session`: Returns current authenticated user and resolved role for the workspace.
- **Security Considerations**:
  - **Zero Trust in Client Headers**: `X-KnoTrail-Role` is strictly forbidden as an authorization mechanism.
  - **Cross-Workspace Protection**: Users cannot access or mutate workspaces they are not members of (HTTP 403 Forbidden).
  - **Demo Space Segregation**: Unauthenticated users are strictly confined to `ws_anon_*` workspaces. Requests targeting `ws_proj_*` without valid tokens receive HTTP 401 Unauthorized.
  - **Confidential Redaction**: `CONFIDENTIAL` citations and findings are stripped server-side before sending JSON to External users.
  - **No Service Role Leakage**: `SUPABASE_SECRET_KEY` remains strictly backend-only.
- **Automated Test Requirements (`src/__tests__/roleSecurity.test.mjs`)**:
  1. *Role Spoofing Rejection*: A client sending an arbitrary role header or claiming to be Manager must be rejected.
  2. *Cross-Workspace Access Denial*: User A from Workspace 1 attempting to read or modify Workspace 2 receives HTTP 403 Forbidden.
  3. *Anonymous Boundary*: Unauthenticated requests attempting to access protected workspaces (`ws_proj_*`) receive HTTP 401/403.
  4. *Unauthorized Action Blocking*: A Developer attempting `POST /api/handovers/certify` or `POST /api/conflicts/:id/resolve` receives HTTP 403 Forbidden.
  5. *Confidential Data Leakage Prevention*: External user calling `GET /api/workspaces` or exporting handovers receives redacted output with zero `CONFIDENTIAL` citations.
  6. *Manager Authority*: Valid Manager can execute all actions cleanly.
  7. *Public Share Link Independence*: Public share links (`/share/[token]`) continue working without login.
- **Acceptance Criteria**:
  1. All 7 security test scenarios pass with zero failures.
  2. Protected workspaces reject unauthorized requests at the Express middleware layer before route handlers run.
  3. External users cannot see confidential evidence or bypass export filters.
  4. Incognito evaluators can test the demo workspace immediately.

---

### Phase 2: GitHub Integration

**Goal**: Ingest GitHub repository commits, pull requests, and issues into structured source documents, extract knowledge findings using Gemini 2.5 Flash, and attach clickable GitHub evidence citations with commit SHAs.

- **Dependencies**: Phase 1.
- **Files Likely to be Modified**:
  - `src/lib/types.ts`: Add `GitHubRepoMetadata` and `GitHubSourceConfig` to `ProjectSource`.
  - `backend/services/github.ts` (NEW): GitHub REST API client using native `fetch` (commits, PRs, issues).
  - `backend/routes/sources.ts`: Add `POST /api/sources/github/connect` to validate repo and ingest activity.
  - `src/lib/api-client.ts`: Add `connectGitHubSource(workspaceId, repoUrl, token?)`.
  - `src/components/views/SourceManagerView.tsx`: Activate the GitHub integration card with a connection modal (Repo URL, optional PAT, branch selector).
  - `src/components/views/EvidenceView.tsx`: Render GitHub commit SHA badges with clickable external links to GitHub.
  - `src/server/ai/pipeline.ts`: Ensure GitHub markdown logs are formatted for optimal Gemini 2.5 Flash extraction.
- **Database Changes**:
  - None. Stored within `workspaces.project_data.sources` as typed `ProjectSource` items.
- **New APIs**:
  - `POST /api/sources/github/connect`: Fetches repository activity, formats text document, and adds source to workspace.
  - `GET /api/sources/github/status`: Validates token or repository availability.
- **Dependencies Required**:
  - Native `fetch` (built-in Node 20/24 LTS); zero heavy external packages needed.
- **Security Considerations**:
  - Rate-limit handling (handle 403 with friendly fallback message).
  - GitHub PATs stored in backend memory during sync; never returned in client JSON responses.
- **Automated Test Requirements (`src/__tests__/githubIntegration.test.mjs`)**:
  - Mock GitHub API responses, test commit/PR parsing, citation link generation, and rate-limit fallbacks.
- **Acceptance Criteria**:
  1. Providing a public GitHub repository (e.g. `facebook/react` or team repository) fetches recent commits and PRs.
  2. Synthesized GitHub source document appears in Source Manager with record count and commit icon.
  3. Running AI analysis on the GitHub source extracts valid decisions and tasks citing exact commit SHAs.
  4. Clicking a citation opens the exact commit URL on GitHub.

---

### Phase 3: Continuous Knowledge Updates

**Goal**: Implement automated change detection for updated project sources, scan existing findings for displaced evidence, flag outdated claims, enforce human review before re-certification, and archive previous handover versions.

- **Dependencies**: Phase 1 and Phase 2.
- **Files Likely to be Modified**:
  - `src/lib/types.ts`: Add `isOutdated` and `outdatedReason` to `KnowledgeFinding`. Extend `ProjectSource` with `version` and `previousContentHash`.
  - `src/server/updates/impactScanner.ts` (NEW): Compares source versions, checks verbatim quote existence, and flags affected findings.
  - `src/server/handover/generator.ts`: Support handover version bumping (`v1.0` -> `v1.1`), archival in `project.handovers`, and re-certification audit trail.
  - `backend/routes/sources.ts`: Add `POST /api/sources/:id/sync` to check for remote updates.
  - `backend/routes/webhooks.ts` (NEW): Webhook endpoint for GitHub `push` events.
  - `src/components/views/SourceManagerView.tsx`: Add "Check for Updates" / "Re-sync" button on connected sources.
  - `src/components/views/ReviewView.tsx`: Add "Outdated Sources" filter tab highlighting findings whose underlying source changed.
  - `src/components/views/HandoverView.tsx`: Display version history badge (`v1.1` showing previous `v1.0` archive) and outdated drift banner.
- **Database Changes**:
  - None. Supported within existing JSONB aggregate schema.
- **New APIs**:
  - `POST /api/sources/:id/sync`: Re-fetches source, runs impact scan, and returns updated findings count.
  - `POST /api/sources/github/webhook`: Webhook listener for automatic background sync.
- **Security Considerations**:
  - Validate GitHub webhook `X-Hub-Signature-256` HMAC signature.
  - Cooldown timers on sync endpoints to prevent Denial-of-Service / rate-limit exhaustion.
- **Automated Test Requirements (`src/__tests__/continuousUpdates.test.mjs`)**:
  - Test source modification detection, impact scanner quote verification, finding invalidation, review gate blocking, and version incrementation (`v1.0` -> `v1.1`).
- **Acceptance Criteria**:
  1. Modifying a source document and re-syncing flags all findings with displaced/missing quotes as `claimStatus: 'POSSIBLY_OUTDATED'`.
  2. Handover status changes to `isOutdated: true` with explicit drift explanation.
  3. Re-certification is blocked until the reviewer reviews and approves the updated findings in Review Center.
  4. Re-certifying increments the handover version and stores the previous version in history.

---

### Phase 4: Integration, Security & Production Verification

**Goal**: Perform full system integration, security audit for zero secret leakage, performance benchmarking, Gravitas verification contract execution, and production build verification across Next.js and standalone Express.

- **Dependencies**: Phases 1, 2, and 3.
- **Files Likely to be Modified**:
  - `.gravitas/contract.json`: Update verification contract to include all Round 3 test suites and acceptance criteria.
  - `render.yaml`: Ensure any new environment variables (`GITHUB_TOKEN`, `GITHUB_WEBHOOK_SECRET`) are documented.
  - `docs/DEPLOYMENT.md`: Update runbook with Round 3 deployment steps.
- **Automated Test Requirements**:
  - Full test run executing all test suites: `npm test` targeting **175+ tests passing** with 0 failures.
  - Standalone Express backend build: `npm run backend:build` compiling cleanly to `dist/backend/server.js`.
  - Next.js frontend build: `npm run frontend:build` compiling cleanly with 0 errors across all routes.
- **Security Considerations**:
  - Zero database credentials or API keys exposed in frontend bundles or API responses.
  - Strict CORS policy verified.
- **Acceptance Criteria**:
  1. All 149 previous tests + 26+ new Round 3 tests pass cleanly (100% pass rate).
  2. Production builds for backend and frontend compile with zero warnings or errors.
  3. Complete 8-step user journey verified end-to-end.
  4. Public share links and demo workflows remain fully operational.

---

## Gravitas Verification Contract Plan (Round 3)

The existing Gravitas contract ([.gravitas/contract.json](file:///Users/samyakvikasgedam/My%20Files/COLLEGE/CodersInPune/.gravitas/contract.json)) currently verifies Phase I with 149 passing tests.

For Round 3, the contract will be upgraded to verify:
1. **Command**: `npm test && npm run backend:build && npm run frontend:build`
2. **Exit Code**: `0`
3. **Targeted Verdict**: `PASS`
4. **Targeted Test Count**: 175+ automated tests across 12 test suites (all 9 previous suites + 3 new Round 3 suites: `roleSecurity`, `githubIntegration`, `continuousUpdates`).
5. **Production Bundles**:
   - Backend: `dist/backend/server.js` (under 250 KB).
   - Frontend: Next.js static and dynamic routes compiled with zero errors.
