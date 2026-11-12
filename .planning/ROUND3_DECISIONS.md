# KnoTrail Round 3 Architecture Decision Records (ADRs)

> **Milestone**: CodersInPune Hackathon 2026 — Round 3 Final Build  
> **Team**: Deploy_or_Die (Samyak Gedam & Sanshrey Sanagar)  
> **Date**: 2026-11-12 (Revised Security Architecture)  
> **Status**: APPROVED for Planning

---

## ADR-013: Server-Verified Role-Based Security with Dual-Space Isolation & Trusted Server Memberships

### Context
Round 3 requires implementing Role-Based Access Control (RBAC) across three distinct tiers:
1. **Manager**: Full administrative control (upload, trigger AI, resolve conflicts, edit/approve/reject, certify handovers, manage shares).
2. **Developer**: Collaborative operational access (upload, trigger AI, inspect findings, propose edits, review; cannot certify handovers or resolve architectural conflicts).
3. **External**: Read-only restricted view (views certified handovers and approved findings with `PUBLIC` clearance only; `CONFIDENTIAL` citations redacted; cannot review or modify data).

An initial proposal considered a client-supplied `X-KnoTrail-Role` header. This was rejected because client-controlled headers are vulnerable to spoofing, privilege escalation, and Broken Object Level Authorization (BOLA).

Simultaneously, ADR-006 and the Core Incognito Invariant mandate that hackathon judges must be able to experience KnoTrail in an Incognito browser window without encountering a mandatory login wall.

### Decision
Implement a **Dual-Space Server-Verified Security Architecture**:

#### 1. Dual-Space Segregation
- **Space 1: Anonymous Demo Workspaces (`ws_anon_*`)**:
  - Unauthenticated access permitted exclusively for workspaces with the `ws_anon_` prefix.
  - Completely isolated from protected workspaces.
  - In demo workspaces, a visual **Demo Perspective Switcher** exists in the header, allowing judges to observe how UI views adapt across Manager, Developer, and External roles.
  - The UI explicitly marks this as a **"Demo Simulation Mode"** and clarifies that it is an interactive preview, not an authenticated security boundary.
  - Anonymous requests cannot access or mutate protected workspaces.
- **Space 2: Protected Workspaces (`ws_proj_*`)**:
  - Requires server-verified authentication via `Authorization: Bearer <token>`.
  - The backend verifies cryptographic session token signatures via Supabase Auth (`supabaseClient.auth.getUser(token)`) or server-signed HMAC tokens in offline development.
  - Anonymous requests attempting to access protected workspaces are rejected with HTTP 401 Unauthorized / 403 Forbidden.

#### 2. Trusted Server-Side Membership Records
- Workspace membership and authoritative roles are stored in a trusted server-side table:
  ```sql
  CREATE TABLE IF NOT EXISTS workspace_members (
      workspace_id VARCHAR(64) NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      user_id VARCHAR(64) NOT NULL,
      email VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL CHECK (role IN ('MANAGER', 'DEVELOPER', 'EXTERNAL')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (workspace_id, user_id)
  );
  ```
- Stored identically in `DurableFileRepository` via `.data/memberships/{workspaceId}.json`.
- **Zero Trust in Client Headers**: Client-supplied role headers (such as `X-KnoTrail-Role`) are strictly ignored. The caller's role is resolved exclusively by querying the database for `(workspaceId, verifiedUserId)`.

#### 3. Express Authorization Middleware (`roleAuthMiddleware`)
- Every protected route is guarded by server-side middleware:
  - Verifies workspace membership: ensures the authenticated user is a registered member of the target `workspaceId`. Rejects cross-workspace access attempts with HTTP 403 Forbidden.
  - Verifies role permissions:
    - `POST /api/handovers/certify` -> Requires `MANAGER`. Returns HTTP 403 Forbidden if called by Developer or External.
    - `DELETE /api/handovers/share/:token` -> Requires `MANAGER`.
    - `POST /api/conflicts/:id/resolve` -> Requires `MANAGER`.
    - `POST /api/sources`, `POST /api/sources/upload`, `DELETE /api/sources/:id` -> Requires `MANAGER` or `DEVELOPER`.
    - `PATCH /api/findings/:id/approve` -> Requires `MANAGER` or `DEVELOPER`.
    - `PATCH /api/findings/:id/reject` -> Requires `MANAGER` or `DEVELOPER`.

#### 4. Server-Side Confidential Data Redaction
- When a user with the `EXTERNAL` role calls read endpoints (`GET /api/workspaces`, `GET /api/findings`, `GET /api/handovers/export/:format`):
  - Findings with `clearanceTier: 'CONFIDENTIAL'` are automatically stripped or masked server-side (`[REDACTED - INTERNAL ONLY]`).
  - Sensitive stakeholder email addresses and internal reviewer notes are excluded from JSON payloads.
  - Raw confidential evidence citations are never transmitted to External clients.

#### 5. Preservation of Public Handover Sharing
- Public share links (`/share/[token]`) continue to function without authentication using their existing SHA-256 hash lookup in `handover_shares`.
- Shared handovers only contain approved, certified findings and do not expose workspace administration endpoints.

### Consequences
- **Positive**: Eliminates role spoofing and cross-workspace access vulnerabilities. Protects confidential data at the API level. Preserves zero-login demo testing for hackathon evaluators.
- **Negative**: Requires maintaining the `workspace_members` table and session verification middleware.

---

## ADR-014: Secure GitHub Ingestion & Evidence Linking Pipeline

### Context
KnoTrail must understand GitHub repositories through commits, pull requests, and issues, and connect extracted findings directly to their original GitHub evidence coordinates.

### Decision
1. **Connector Architecture**:
   - Implement `backend/services/github.ts` using the GitHub REST API v3.
   - Support two connection mechanisms:
     - **Direct Repository URL (`owner/repo`)**: Fetches public repository activity without requiring tokens (fallback for quick judge testing).
     - **Personal Access Token (PAT) Auth**: User provides a GitHub PAT (scopes: `public_repo` or `repo:read`) for private repositories and higher rate limits (5,000 req/hr).
     - **Pre-Configured Server Token**: Supports `GITHUB_TOKEN` environment variable on the backend for zero-friction judge evaluation of sample repositories.
2. **Activity Ingestion & Document Synthesis**:
   - GitHub data is parsed and synthesized into structured Markdown documents:
     - **Commit Activity Document**: Formatted list of commits with SHA, author, timestamp, commit message, and changed files.
     - **Pull Request Document**: PR title, number, author, description, merge state, and discussion highlights.
     - **Issue Document**: Issue title, number, state, labels, and assignees.
   - Synthesized documents are registered as `ProjectSource` items with `type: 'github'` and `documentData` containing line numbers and SHA hashes.
3. **AI Pipeline Integration**:
   - Ingested GitHub source documents feed directly into the existing Gemini 2.5 Flash knowledge extraction pipeline (`runKnowledgeExtractionPipeline`).
   - Findings citing GitHub sources populate `EvidenceCitation` with:
     - `sourceType: 'github'`
     - `commitSha`: Full 40-character commit hash.
     - `lineRange`: Line numbers in synthesized log.
     - Clickable link: Direct link to `https://github.com/{owner}/{repo}/commit/{commitSha}` or `https://github.com/{owner}/{repo}/pull/{prNumber}`.

### Consequences
- **Positive**: Uses existing, battle-tested text extraction and grounding engines without reinventing citation structures.
- **Negative**: Repository history is summarized into key recent commits/PRs (default 30 items) to prevent token exhaustion and rate-limit spikes.

---

## ADR-015: Continuous Knowledge Updates & Outdated Invalidation Protocol

### Context
When project sources change (e.g. new commits pushed, documents updated), existing knowledge findings may become obsolete, inaccurate, or displaced. Handover documents must reflect whether the knowledge is fresh or outdated, and human review must be enforced before updating handovers.

### Decision
1. **Source Version Tracking**:
   - Extend `ProjectSource` with `version: number`, `previousContentHash?: string`, and `lastModified: string`.
   - On re-sync (manual trigger or webhook), compute new SHA-256 hash. If different, increment source version and record previous hash.
2. **Impact Scanner (`impactScanner.ts`)**:
   - Identify all existing findings citing the updated source (`citation.sourceId === updatedSource.id`).
   - For each citing finding:
     - Check if the original verbatim quote still exists in the updated document text.
     - If quote is missing or coordinates shifted:
       - Update finding status: `claimStatus = 'POSSIBLY_OUTDATED'`, `evidenceValidity = 'SOURCE_UNAVAILABLE'`, `status = 'UNCERTAIN'`.
       - Set `isOutdated: true` and `outdatedReason: 'Source document "..." was updated after this finding was extracted.'`.
       - Reset `approved: false` and set `reviewStatus = 'NEEDS_CORRECTION'`.
3. **Handover Invalidation & Re-Certification Gate**:
   - Any outdated finding immediately marks `currentHandover.isOutdated = true`.
   - Handover cannot be re-certified until the reviewer reviews and approves/updates the affected findings.
   - Upon re-certification, the handover version is incremented (e.g. `v1.0` -> `v1.1`), and the previous handover is archived in `project.handovers`.
   - Audit trail records `actionType: 'REVALIDATE'` with timestamp and reviewer identity.

### Consequences
- **Positive**: Automated drift detection pinpoints exactly which claims are affected by source updates; prevents outdated handovers from being passed to new members.
- **Negative**: Updating a heavily cited source requires human reviewers to inspect multiple invalidated findings before re-certifying.

---

## ADR-016: Webhook Delivery & In-Memory Sync Security

### Context
Continuous updates require receiving GitHub webhook notifications (`POST /api/sources/github/webhook`) and performing on-demand synchronization (`POST /api/sources/:id/sync`) without compromising CORS policies or exposing secrets.

### Decision
1. **Webhook Security**:
   - GitHub webhook endpoint is mounted with a specialized middleware bypassing browser-only CORS checks (GitHub servers do not send browser `Origin` headers).
   - Validates incoming `X-Hub-Signature-256` HMAC signature using `GITHUB_WEBHOOK_SECRET` when configured.
   - Accepts `push` events, extracts repository full name, locates matching workspace source, and enqueues an asynchronous re-sync.
2. **On-Demand Sync Endpoint**:
   - `POST /api/sources/:id/sync` allows reviewers to trigger an immediate update check from the UI.
   - Rate-limited to prevent abuse (minimum 30-second cooldown between syncs per source).
3. **Secret Isolation**:
   - Webhook secrets and GitHub PATs are never stored in client bundles or public responses.

### Consequences
- **Positive**: Clean separation between browser CORS policies and external webhook deliveries; reliable live updates.
- **Negative**: In local development without tunneling (e.g. ngrok), live webhook delivery cannot reach `localhost`; on-demand sync button provides the primary local testing path.
