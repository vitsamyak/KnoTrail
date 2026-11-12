# KnoTrail Round 3 System Audit (Phase 0 - Revised Security Architecture)

> **Event**: CodersInPune Hackathon 2026 — Round 3 Final Build  
> **Team**: Deploy_or_Die (Samyak Gedam & Sanshrey Sanagar)  
> **Audited Date**: 2026-11-12 (Security Revision 2.0)  
> **Repository**: `/Users/samyakvikasgedam/My Files/COLLEGE/CodersInPune`  
> **Status**: COMPLETED — Phase 0 Planning & Audit Only (Zero Code Modifications)

---

## 1. Existing System Architecture Overview

KnoTrail is architected as a **decoupled, multi-cloud knowledge handover platform** operating under an end-to-end operational pipeline:  
**RECONSTRUCT → VERIFY → REVIEW → HANDOVER**

```
┌────────────────────────────────────────────────────────────────────────┐
│                        NEXT.JS 14 WEB FRONTEND                         │
│                    (Deployed to Vercel / Client)                       │
│                                                                        │
│  8 Application Views + Public Share Viewer:                            │
│  LandingView, WorkspaceView, SourceManagerView, AnalysisView,          │
│  EvidenceView, ReviewView, HandoverView, /share/[token]                │
│                                                                        │
│  Centralized API Client: src/lib/api-client.ts                         │
│  State & Cache Sync:    src/context/ProjectContext.tsx                 │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / REST (Bearer Auth & CORS)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                  STANDALONE NODE.JS EXPRESS BACKEND                    │
│                 (Deployed to Render in Singapore)                      │
│                                                                        │
│  Middleware: strictCorsMiddleware, authMiddleware, roleAuthMiddleware, │
│              uploadMiddleware (multer, 10MB)                           │
│  Routes: /api/workspaces, /api/projects, /api/sources, /api/analysis,  │
│          /api/findings, /api/conflicts, /api/handovers, /health/*      │
│  Engines: Gemini 2.5 Flash Pipeline, Verification & Grounding Engine,  │
│           Deterministic Handover Generator, Document Text Extractor    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Supabase Service Role (Private)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                PERSISTENCE: SUPABASE POSTGRESQL & STORAGE              │
│                       (Hosted in Mumbai ap-south-1)                    │
│                                                                        │
│  Table: workspaces (Canonical JSONB project_data, version, OCC)        │
│  Table: workspace_members (Trusted server membership & roles)          │
│  Table: handover_shares (SHA-256 token_hash, workspace_id, is_active)  │
│  Stored Proc: save_workspace_state() (Row locks, OCC validation)       │
│  Storage Bucket: knotrail-source-files (Private, 10MB limit)           │
│  Fallback: DurableFileRepository (.data/workspaces/*.json)             │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Component-by-Component Architectural Audit

### 2.1 Frontend Architecture
- **Framework**: Next.js 14.2.15 App Router (`src/app/`) with React 18.3.1, TypeScript 5.4.5, Tailwind CSS 3.4.4.
- **State Store**: [ProjectContext.tsx](file:///Users/samyakvikasgedam/My%20Files/COLLEGE/CodersInPune/src/context/ProjectContext.tsx) (1,142 lines). Manages single-page app view routing (`activeView`), reactive workspace mutations, background sync telemetry, and local caching in `localStorage` (`knotrail_cache_v4_`).
- **Application Views** (8 screens + 1 public viewer):
  1. `LandingView.tsx`: Product introduction, "How It Works" 4-step workflow, "What's New in KnoTrail?" (Round 3 feature showcase), "Why Teams Choose KnoTrail" value pillars, and final call-to-action.
  2. `DashboardView.tsx`: Project health telemetry, live finding breakdown, verification status metrics, and activity timeline.
  3. `WorkspaceView.tsx`: Project overview, stakeholder pods, category findings explorer, and quick-action shortcuts.
  4. `SourceManagerView.tsx`: Drag-and-drop document upload (PDF, TXT, MD), text inspection drawer, manual note creator, and deletion with orphan file cleanup.
  5. `AnalysisView.tsx`: Live Gemini 2.5 Flash AI extraction trigger, source document selector, extraction progress telemetry, and API key configuration card.
  6. `EvidenceView.tsx`: Evidence citation inspector, coordinate bounds viewer, dual-status badges (`MATCHED`, `MISMATCHED`, `MISSING`), and code snippet explorer drawer.
  7. `ReviewView.tsx`: Human oversight center, interactive conflict resolution modal, finding edit drawer, reject modal with mandatory reason, and certification readiness gate.
  8. `HandoverView.tsx`: Final handover dossier with 12 structured sections, locked gate screen if unresolved conflicts exist, export parity (JSON, Markdown, Printable PDF), and share-link generator.
  9. `src/app/share/[token]/page.tsx`: Server-rendered read-only view for public recipients with zero login requirements.
- **Client Networking**: [api-client.ts](file:///Users/samyakvikasgedam/My%20Files/COLLEGE/CodersInPune/src/lib/api-client.ts) (475 lines). Normalized base URL (`NEXT_PUBLIC_API_BASE_URL` or fallback `http://localhost:4000`), timeout guards (30s), error deserialization, and strict typed API methods.

### 2.2 Backend Architecture
- **Framework**: Standalone Node.js + Express 5.3.0 (`backend/app.ts`, `backend/server.ts`).
- **Compilation**: Compiled via `esbuild` (`npm run backend:build`) into `dist/backend/server.js` (190 KB) targeting Node 20/24 LTS.
- **Middleware**:
  - `strictCorsMiddleware`: Governed by `CORS_ORIGINS`. Preflight `OPTIONS` handled with HTTP 204.
  - `uploadMiddleware`: Multer in-memory storage, 10 MB per-file limit, batch limit of 5 files.
  - Security headers: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `x-powered-by: false`.
- **API Endpoints (23 active routes)**:
  - `GET /health/live`, `GET /health/ready`
  - `GET /api/workspaces`, `POST /api/workspaces`, `POST /api/workspaces/reset`
  - `GET /api/projects/:id`, `PATCH /api/projects/:id`
  - `GET /api/sources`, `POST /api/sources`, `POST /api/sources/upload`, `GET /api/sources/:id`, `DELETE /api/sources/:id`
  - `GET /api/analysis/extract`, `POST /api/analysis/extract`, `POST /api/analysis/verify`
  - `PATCH /api/findings/:id/approve`, `PATCH /api/findings/:id/reject`, `PATCH /api/findings/:id`, `GET /api/findings/audit`
  - `POST /api/conflicts/:id/resolve`
  - `GET /api/handovers`, `POST /api/handovers/generate`, `POST /api/handovers/certify`, `GET /api/handovers/export/:format`, `POST /api/handovers/share`, `GET /api/handovers/share/:token`, `DELETE /api/handovers/share/:token`

### 2.3 Database & Storage Layer
- **PostgreSQL / Supabase Schema**: [schema.sql](file:///Users/samyakvikasgedam/My%20Files/COLLEGE/CodersInPune/src/server/db/schema.sql)
  - `workspaces`: `id VARCHAR(64) PRIMARY KEY`, `name VARCHAR(255)`, `project_data JSONB NOT NULL`, `version INTEGER NOT NULL DEFAULT 1`, `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`.
  - `handover_shares`: `token_hash VARCHAR(64) PRIMARY KEY`, `workspace_id VARCHAR(64) REFERENCES workspaces(id)`, `handover_id VARCHAR(64)`, `is_active BOOLEAN`, `created_at TIMESTAMPTZ`, `revoked_at TIMESTAMPTZ`.
  - Stored Procedure `save_workspace_state`: Atomic row locks (`FOR UPDATE`) with Optimistic Concurrency Control (OCC). Rejects stale writes with error code `P0001`.
  - Row Level Security (RLS): Enabled on all tables. Denies anon and authenticated public roles. Only `service_role` has access.
  - Supabase Storage: Bucket `knotrail-source-files` (private, 10MB limit).
- **Dual-Storage Engine**:
  - `SupabaseStorageRepository`: Direct cloud database + cloud object storage.
  - `DurableFileRepository`: Local disk storage (`.data/workspaces/*.json`) with atomic `fs.rename` writes.
  - Dynamic routing via `STORAGE_BACKEND=supabase` or `STORAGE_BACKEND=file`.

---

## 3. Security Audit & Flaw Analysis of Initial Proposal

### 3.1 The Flaw: Client-Controlled Role Headers
The initial proposal suggested sending `X-KnoTrail-Role: manager|developer|external` from the frontend. This was **critically flawed**:
1. **Broken Object Level Authorization (BOLA)**: Any client using `curl`, Postman, or browser devtools could modify the header to `X-KnoTrail-Role: manager` and bypass all role restrictions.
2. **Missing Function Level Access Control**: The server had no way to verify if the caller actually had the rights to assume that role.
3. **No Workspace Boundary**: Clients could pass any `workspaceId` and declare themselves `manager`, gaining administrative control over another team's workspace.

### 3.2 The Revised Security Architecture: Dual-Space Segregation
To solve this without breaking the hackathon Incognito demo requirement, the platform is segregated into two strictly separated spaces:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SPACE 1: ANONYMOUS DEMO                         │
│                           (ws_anon_*)                                  │
│                                                                        │
│  - Zero authentication required; preserves Incognito testing.          │
│  - Sandboxed ephemeral workspace.                                      │
│  - Visual Perspective Switcher: strictly a DEMO UI SIMULATION.         │
│  - The server marks this workspace as isDemo = true.                   │
│  - CANNOT access, read, or modify protected workspaces (ws_proj_*).    │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│                       SPACE 2: PROTECTED WORKSPACES                    │
│                           (ws_proj_*)                                  │
│                                                                        │
│  - Requires server-verified authentication (Bearer session token).     │
│  - Authoritative role & workspace membership stored in server records  │
│    (workspace_members table in Supabase / server membership registry). │
│  - ZERO trust in client headers (X-KnoTrail-Role is strictly ignored). │
│  - Express authMiddleware verifies token signature.                    │
│  - Express roleAuthMiddleware checks (workspaceId, userId) membership. │
│  - Enforces Manager, Developer, External permission gates on every API.│
│  - External users automatically receive redacted payloads (CONFIDENTIAL│
│    citations stripped server-side).                                    │
└────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Supabase Authentication & Session Verification Evaluation
- **Current Setup**: Supabase project is configured in Mumbai (`ap-south-1`).
- **Can it support secure authentication?**: **YES**.
  - Supabase provides full Auth capabilities (`gotrue` engine).
  - The standalone Express backend already has `@supabase/supabase-js` installed.
  - The backend can securely verify incoming Supabase Auth JWTs using `supabaseClient.auth.getUser(bearerToken)`.
  - This verifies cryptographic JWT signatures with zero risk of client spoofing.
  - In local offline environments (`STORAGE_BACKEND=file`), a cryptographically signed HMAC token (`kt_sec_<userId>.<timestamp>.<hmac>`) signed with server-side `SESSION_SECRET` provides identical verification parity.
- **Service Role Key Isolation**:
  - `SUPABASE_SECRET_KEY` / `SUPABASE_SERVICE_ROLE_KEY` resides strictly on Render.
  - Frontend only interacts with the Express backend, never directly with Supabase.
  - Database RLS remains fully enabled (denying all direct public access).

---

## 4. Audit of the Three Round 3 Requirements

### Requirement A: GitHub Integration
| Dimension | Audit Finding | Code Evidence |
| :--- | :--- | :--- |
| **Existing Integration** | **None** (Mock types only). Enum variants `type: 'github'` exist in `types.ts`. In `SourceManagerView.tsx`, GitHub is shown under "Upcoming Integrations" with no active connector. | `src/components/views/SourceManagerView.tsx#L413`, `src/lib/types.ts#L43` |
| **Connection Feasibility** | **High**. GitHub REST API v3 supports fetching commits, PRs, issues, and files. Supports both public repository URLs (`owner/repo`) without authentication, and private repositories via Personal Access Token (PAT). | Tested GitHub REST API endpoints `GET /repos/{owner}/{repo}/*` |
| **OAuth vs Token** | **Recommendation: Hybrid**. Pure OAuth requires registering a GitHub OAuth App with specific callback URLs and credentials, creating a barrier for evaluators testing locally or in unfamiliar environments. Providing a direct repository connection (with optional PAT) allows immediate evaluation in judge environments. | Supported by ADR-006 (Zero-Auth public accessibility) |
| **Required API Endpoints** | 1. `GET /repos/{owner}/{repo}` (Metadata, default branch)<br>2. `GET /repos/{owner}/{repo}/commits` (Commit log, author, message, timestamp, SHA)<br>3. `GET /repos/{owner}/{repo}/pulls?state=all` (PRs, title, description, merge state, author)<br>4. `GET /repos/{owner}/{repo}/issues?state=all` (Issues, title, body, status, labels, assignees) | GitHub Octokit / standard REST API v3 |
| **Ingestion Pipeline Mapping** | Commits, PRs, and issues are synthesized into structured text/markdown documents with `type: 'github'` and ingested as standard `ProjectSource` objects with `documentData` containing line numbers and SHA hashes. | Feeds seamlessly into `runKnowledgeExtractionPipeline` in `src/server/ai/pipeline.ts` |
| **Evidence & Citations** | Citations will store `commitSha`, PR/Issue number, file path, and line coordinates. Clickable links will point to `https://github.com/{owner}/{repo}/commit/{commitSha}`. | `EvidenceCitation` interface already defines `commitSha?: string` |
| **Rate Limits & Security** | Unauthenticated API: 60 req/hr per IP. Authenticated: 5,000 req/hr. Tokens must NEVER be stored in frontend state or public bundles. Must be kept strictly server-side. | Backend proxy route `/api/sources/github/connect` required |

### Requirement B: Role-Based Security (Revised)
| Dimension | Audit Finding | Revised Architecture |
| :--- | :--- | :--- |
| **Auth System** | Dual-space: Anonymous demo (`ws_anon_*`) vs Protected (`ws_proj_*`). | Anonymous workspaces allow instant testing. Protected workspaces require server-verified tokens. |
| **Trusted Membership Storage** | Not implemented currently. | Server-side `workspace_members` table storing `(workspace_id, user_id, email, role)`. |
| **Authorization Check** | Initially proposed client headers (rejected). | Server-side Express `roleAuthMiddleware` querying trusted membership records for `(workspaceId, userId)`. |
| **Manager Role** | Full administrative authority. | Can upload/delete sources, run AI, resolve conflicts, edit/approve/reject, certify handovers, manage share links, view `CONFIDENTIAL`. |
| **Developer Role** | Operational collaboration. | Can upload sources, run AI, edit/approve findings, view `PUBLIC` and `INTERNAL`. Blocked from certifying handovers or resolving architectural conflicts (HTTP 403). |
| **External Role** | Read-only restricted view. | Can view certified handovers and approved findings with `PUBLIC` clearance only. Blocked from review/upload actions (HTTP 403). `CONFIDENTIAL` citations redacted server-side. |
| **Cross-Workspace Protection** | Missing in previous setup. | Middleware verifies caller is a member of the requested `workspaceId`. Cross-workspace requests rejected with HTTP 403 Forbidden. |

### Requirement C: Continuous Knowledge Updates
| Dimension | Audit Finding | Code Evidence |
| :--- | :--- | :--- |
| **Current Source Tracking** | Basic source metadata (`lastSync`, `contentHash`) and post-certification drift detection (`computeProjectDataSnapshotHash` flags `isOutdated: true`). | `src/server/handover/generator.ts#L51`, `src/server/db/storage.ts#L251` |
| **Temporal Supersession** | Existing `verifier.ts` compares chronological dates and flags older conflicting claims as `claimStatus: 'POSSIBLY_OUTDATED'`. | `src/server/verification/verifier.ts#L638` |
| **Missing Update Mechanics** | No continuous polling, no webhook receiver, no automated diffing between source versions, and no impact analysis to identify specifically which findings are affected by an updated document. | Not yet implemented |
| **Change Detection Architecture** | 1. **Source Versioning**: Record previous vs new SHA-256 hash.<br>2. **Impact Scanner**: Scan existing findings where `citation.sourceId === updatedSource.id`.<br>3. **Evidence Drift Verification**: Verify if cited quotes still exist in updated text. If quotes missing or changed, flag finding with `claimStatus: 'POSSIBLY_OUTDATED'` and `isOutdated: true`. | Uses existing `verifyFindingEvidence` in `verifier.ts` |
| **Approval Gate Protocol** | Outdated findings automatically reset `approved: false` and set `reviewStatus: 'NEEDS_CORRECTION'`. The Review Center surfaces an "Outdated / Needs Re-review" tab. Handover cannot be re-certified until reviewed. | Enforces Phase F approval invariants |
| **Version History & Handovers** | Re-certifying after source changes archives the previous handover into `project.handovers` and increments version (`v1.0` -> `v1.1`). | Extends existing `buildHandoverDocument` |
| **Webhook / Sync Trigger** | 1. `POST /api/sources/:id/sync` (On-demand re-sync button in UI).<br>2. `POST /api/sources/github/webhook` (Receives GitHub `push` event payloads). | Backend route additions |

---

## 5. Security Risks & Threat Modeling

| Threat ID | Threat Category | Attack Vector | Impact | Revised Mitigation |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | Role Impersonation / Header Spoofing | Attacker sends `X-KnoTrail-Role: manager` on API request. | Unauthorized handover certification or source deletion. | **Client headers strictly ignored.** Authorization relies solely on server-verified session token and trusted database membership query. |
| **SEC-02** | Cross-Workspace Access (BOLA) | User belonging to Workspace A sends request targeting Workspace B. | Data tampering or unauthorized data access. | Middleware checks that `(req.auth.userId, targetWorkspaceId)` exists in `workspace_members`. Returns 403 Forbidden on mismatch. |
| **SEC-03** | Anonymous to Protected Intrusion | Anonymous demo user calls API targeting `ws_proj_*`. | Tampering with production workspaces. | Anonymous access strictly confined to `ws_anon_*`. Protected workspaces require valid server-verified token. |
| **SEC-04** | Confidential Data Leakage | External user fetches findings or exports handover. | Exposure of internal credentials, IP, or confidential designs. | Server-side redaction filter strips `CONFIDENTIAL` citations and findings before JSON serialization. |
| **SEC-05** | GitHub Token Leakage | GitHub PAT exposed in client state or API responses. | Compromise of user's GitHub account. | PATs reside in backend server memory/env only; never returned in client JSON responses. |
| **SEC-06** | Webhook Forgery | Attacker sends fake GitHub push webhook payload. | Triggers unauthorized source re-syncs. | Validates GitHub `X-Hub-Signature-256` HMAC signature using server secret. |

---

## 6. Revised Feature Compatibility Matrix

| Feature | Component | Status | Evidence | Required Round 3 Action |
| :--- | :--- | :--- | :--- | :--- |
| **Role-Based Security** | Membership Storage | **Not Implemented** | Only `workspaces` table exists; no membership table. | Add `workspace_members` table and migration. |
| **Role-Based Security** | Token Verification Middleware | **Not Implemented** | Backend routes only validate `isValidWorkspaceId`. | Implement `backend/middleware/auth.ts` verifying Bearer tokens. |
| **Role-Based Security** | Role Authorization Middleware | **Not Implemented** | No role check on routes. | Implement `backend/middleware/roleAuth.ts` enforcing Manager / Developer / External rules. |
| **Role-Based Security** | Clearance Redaction Engine | **Partially Implemented** | `clearanceTier` exists in domain types and verifier. | Build server-side redaction utility filtering `CONFIDENTIAL` for External role. |
| **Role-Based Security** | Demo Perspective Switcher | **Not Implemented** | Header has no switcher. | Add visual switcher in `Header.tsx` explicitly labeled as "Demo Simulation Mode". |
| **GitHub Integration** | API Client & Connector | **Not Implemented** | Zero GitHub API calls exist. | Build `backend/services/github.ts` using GitHub REST API v3. |
| **GitHub Integration** | Commit/PR Citation Linking | **Partially Implemented** | `EvidenceCitation.commitSha` exists in `types.ts`. | Synthesize activity documents; generate direct GitHub URLs. |
| **Continuous Updates** | Source Version Tracking | **Partially Implemented** | Post-cert hash exists. | Add `version` and `previousContentHash` to `ProjectSource`. |
| **Continuous Updates** | Impact Scanner | **Not Implemented** | No quote drift scanner. | Build `src/server/updates/impactScanner.ts`. |
| **Continuous Updates** | On-Demand Sync & Webhook | **Not Implemented** | No sync/webhook routes. | Add `/api/sources/:id/sync` and `/api/sources/github/webhook`. |
