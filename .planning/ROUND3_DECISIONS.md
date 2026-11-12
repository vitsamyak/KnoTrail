# KnoTrail Round 3 Architecture Decision Records (ADRs)

> **Milestone**: CodersInPune Hackathon 2026 — Round 3 Final Build  
> **Team**: Deploy_or_Die (Samyak Gedam & Sanshrey Sanagar)  
> **Date**: 2026-11-12  
> **Status**: APPROVED for Planning

---

## ADR-013: Hybrid Role-Based Security with Zero-Auth Public Demo Preservation

### Context
Round 3 requires implementing Role-Based Access Control (RBAC) supporting three distinct tiers:
1. **Manager**: Full administrative control (upload, trigger AI, resolve conflicts, edit/approve/reject, certify handovers, manage shares).
2. **Developer**: Collaborative operational access (upload, trigger AI, inspect findings, propose edits, review; cannot certify handovers or resolve architectural conflicts).
3. **External**: Read-only restricted view (views certified handovers and approved findings with `PUBLIC` clearance only; `CONFIDENTIAL` citations redacted; cannot review or modify data).

Simultaneously, ADR-006 and the Core Incognito Invariant strictly mandate that hackathon judges and external evaluators must be able to experience the complete platform in an Incognito browser window without encountering a login, signup, or registration wall.

### Decision
Implement a **Dual-Mode Role Security Architecture**:
1. **Interactive Session Role Switcher**:
   - In demo and anonymous workspaces, the platform displays an interactive Role Switcher in the top navigation header:  
     `[Manager (Admin)] | [Developer] | [External Viewer]`
   - Switching roles immediately updates client context (`currentUserRole`) and passes the active role via request headers (`X-KnoTrail-Role: manager|developer|external`).
   - Judges can toggle roles with a single click to instantly evaluate how permissions, view restrictions, and confidential data redaction work live.
2. **Backend API Permission Enforcement**:
   - Introduce `roleAuthMiddleware` on the standalone Express backend.
   - Enforces strict role gates:
     - `POST /api/handovers/certify` -> Requires `Manager`. Returns HTTP 403 Forbidden otherwise.
     - `DELETE /api/handovers/share/:token` -> Requires `Manager`.
     - `POST /api/conflicts/:id/resolve` -> Requires `Manager`.
     - `POST /api/sources`, `POST /api/sources/upload`, `DELETE /api/sources/:id` -> Requires `Manager` or `Developer`.
     - `PATCH /api/findings/:id/approve` -> Requires `Manager` or `Developer`.
     - `GET /api/handovers/export/:format` -> When requested by `External`, redacts `CONFIDENTIAL` findings and sensitive stakeholder emails.

### Consequences
- **Positive**: Evaluators can thoroughly test all three role perspectives without authentication friction. Real API-level and UI-level security boundaries are strictly enforced.
- **Negative**: Role switching in demo mode is client-driven; production enterprise deployment will eventually require binding roles to authenticated user identities.

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
