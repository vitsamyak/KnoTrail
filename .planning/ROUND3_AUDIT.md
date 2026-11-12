# KnoTrail Round 3 System Audit (Phase 0)

> **Event**: CodersInPune Hackathon 2026 — Round 3 Final Build  
> **Team**: Deploy_or_Die (Samyak Gedam & Sanshrey Sanagar)  
> **Audited Date**: 2026-11-12  
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
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │ LandingView  │  │WorkspaceView │  │SourceManager │  │AnalysisView│  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │ EvidenceView │  │  ReviewView  │  │ HandoverView │  │/share/[tok]│  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘  │
│                                                                        │
│               Centralized API Client: src/lib/api-client.ts            │
│               Context & Cache Sync:   src/context/ProjectContext.tsx   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / REST (CORS Governed)
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                  STANDALONE NODE.JS EXPRESS BACKEND                    │
│                 (Deployed to Render in Singapore)                      │
│                                                                        │
│  Middleware: strictCorsMiddleware, uploadMiddleware (multer, 10MB)     │
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

### 2.4 AI Extraction & Evidence Grounding Engine
- **SDK**: Google GenAI SDK (`@google/genai` v3.0.0). Model: `gemini-2.5-flash`.
- **Zero Fake AI Invariant**: Extraction only runs if `GEMINI_API_KEY` is present and source text exists; returns HTTP 428 Precondition Required otherwise. Zero mock entities fabricated.
- **7 Operational Categories**: `decision`, `task`, `risk`, `dependency`, `contact`, `next_action`, `unresolved_question`.
- **Grounding & Coordinates**: Every finding requires verbatim quotes and exact coordinate calculations (`Page X` for PDFs, `Lines Y-Z` for TXT/MD).
- **Verification Engine**: Dual-status model separating `evidenceValidity` (`MATCHED`, `MISSING`, `MISMATCHED`, `SOURCE_UNAVAILABLE`) from `claimStatus` (`SUPPORTED`, `UNCERTAIN`, `CONFLICTING`, `POSSIBLY_OUTDATED`).

### 2.5 Human Review & Handover Delivery
- **Governance**: Mandatory human review before certified handover generation.
- **Audit Log**: Immutable `ReviewAuditAction` records for all actions (`APPROVE`, `REJECT`, `EDIT`, `RESOLVE_CONFLICT`).
- **Strict Handover Gating**: Handover blocked if:
  1. Open conflicts exist (`unresolvedConflictsCount > 0`).
  2. Unreviewed findings exist (`unreviewedCount > 0`).
  3. Findings marked `NEEDS_CORRECTION` exist.
  4. Unsupported or `MISSING` evidence claims exist.
- **12-Section Formal Handover**: Section A through L (Cover/Meta, Executive Summary, Overview, Decisions, Tasks, Responsibilities, Risks, Dependencies, Questions, Next Actions, Evidence Inventory, Review History).
- **Outdated Invalidation Protocol**: SHA-256 fingerprint hash of findings and sources detects drift and flags `isOutdated: true` if underlying project data changes post-certification.

---

## 3. Audit of the Three Round 3 Requirements

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

### Requirement B: Role-Based Security
| Dimension | Audit Finding | Code Evidence |
| :--- | :--- | :--- |
| **Current Auth System** | **Zero-Auth / Anonymous Workspaces**. Uses random workspace IDs (`ws_anon_<timestamp>_<hex>`). No login, no passwords, no user accounts. | `src/context/ProjectContext.tsx#L128-L138` |
| **Clearance Tiers** | `clearanceTier: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL'` already exists in `EvidenceCitation` and is tested in `evidenceVerification.test.mjs`, but is not enforced on views or API mutations. | `src/lib/types.ts#L54` |
| **Required Roles** | 1. **Manager**: Full access (upload, trigger AI, resolve conflicts, edit/approve/reject, certify handover, view all clearance tiers).<br>2. **Developer**: Collaborative access (upload, trigger AI, view `PUBLIC` and `INTERNAL` clearance, review findings; cannot certify handover or resolve architectural conflicts).<br>3. **External**: Read-only restricted view (views certified handovers and approved findings with `PUBLIC` clearance only; `CONFIDENTIAL` citations redacted). | Aligns with Hackathon prompt for Round 3 |
| **Zero-Auth Demo Preservation** | **Interactive Role Switcher**. In demo / anonymous mode, evaluators can freely switch roles via an interactive top-bar switcher (`Manager` \| `Developer` \| `External`) to inspect and test the permission boundaries without being blocked by an authentication wall. | Aligns with ADR-006 & Incognito Invariant |
| **API Authorization** | Backend middleware `roleAuthMiddleware` to validate role permissions passed via request header `X-KnoTrail-Role` or session token. Blocks unauthorized mutations (e.g. non-Manager certifying handover). | `backend/middleware/` |
| **Component Restrictions** | Frontend conditionally disables/hides "Certify Handover", "Delete Source", and "Resolve Conflict" buttons for Developer/External, and redacts confidential citations for External. | `ReviewView.tsx`, `HandoverView.tsx`, `EvidenceView.tsx` |

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

## 4. Technical Risks & Vulnerability Inventory

| Risk ID | Category | Description | Severity | Mitigation Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **RSK-01** | Security / Auth | Introducing mandatory login would break the zero-auth public demo and fail hackathon evaluation in Incognito mode. | **CRITICAL** | Preserve zero-auth demo with interactive Role Switcher; enforce real role-based permission policies on API routes and UI views without requiring an account. |
| **RSK-02** | External API | Unauthenticated GitHub API calls are rate-limited to 60 requests/hour per IP, risking HTTP 403 errors during judging. | **HIGH** | Support optional GitHub PAT input, cache repository responses in workspace storage, and provide a pre-seeded mock GitHub repository fallback if rate limits are hit. |
| **RSK-03** | Secrets | GitHub Personal Access Tokens or API keys might accidentally leak to the client or public bundles. | **HIGH** | All GitHub API requests must be proxied through the standalone Express backend. GitHub tokens must reside in backend memory or server environment variables only. |
| **RSK-04** | Data Schema | Adding role fields and source versioning might break existing JSONB schemas or tests if not backward-compatible. | **MEDIUM** | Ensure all new fields (`role`, `previousContentHash`, `isOutdatedFinding`) are optional with sensible defaults in domain types and validation helpers. |
| **RSK-05** | CORS | GitHub webhook deliveries do not include browser CORS headers and might be rejected by `strictCorsMiddleware`. | **MEDIUM** | Mount webhook endpoints with webhook-specific middleware that permits GitHub User-Agent payloads while enforcing HMAC signature validation (`X-Hub-Signature-256`). |
| **RSK-06** | Test Regressions | Existing 149 automated tests cover strict contracts across 9 phases. Breaking any existing contract will cause test failures. | **HIGH** | Strict regression testing rule: all 149 tests must continue to pass cleanly after every modification wave. |

---

## 5. Feature Compatibility Matrix

| Feature | Component | Current Implementation Status | Evidence & Code Reference | Required Round 3 Action |
| :--- | :--- | :--- | :--- | :--- |
| **GitHub Integration** | Source Type Schema | **Partially Implemented** | `sourceType: 'github'` exists in `src/lib/types.ts#L43` and `ProjectSource` schema. | Add repository metadata fields (`repoUrl`, `branch`, `commitSha`, `owner`, `repoName`). |
| **GitHub Integration** | API Client & Connector | **Not Implemented** | Zero GitHub API calls exist. `SourceManagerView.tsx#L413` shows GitHub as a disabled "Upcoming" card. | Build `backend/services/github.ts` to fetch commits, PRs, issues via GitHub REST API. |
| **GitHub Integration** | Ingestion & Citation Linking | **Partially Implemented** | `EvidenceCitation.commitSha` exists in `src/lib/types.ts#L46`. Document extractor handles text. | Build GitHub activity synthesizer to format commits/PRs into verifiable source documents. |
| **Role-Based Security** | User Role Schema | **Not Implemented** | Domain models currently lack `UserRole` type (`Manager`, `Developer`, `External`). | Add `UserRole` type to `types.ts` and active role state to `ProjectContext.tsx`. |
| **Role-Based Security** | Clearance Tiers | **Already Implemented** | `clearanceTier: 'PUBLIC' \| 'INTERNAL' \| 'CONFIDENTIAL'` implemented and tested in `evidenceVerification.test.mjs`. | Enforce clearance tier masking/redaction when in `External` role. |
| **Role-Based Security** | API Authorization Gate | **Not Implemented** | Backend routes check `workspaceId` validity but do not check caller role permissions. | Implement `roleAuthMiddleware` to guard certification, resolution, and deletion. |
| **Role-Based Security** | UI Role Switcher | **Not Implemented** | No role switcher exists in the current UI header. | Add interactive Role Switcher in `Header.tsx` allowing instant switching between Manager, Developer, and External. |
| **Continuous Updates** | Post-Cert Invalidation | **Already Implemented** | `computeProjectDataSnapshotHash` flags `isOutdated: true` when project data mutates after certification. | Retain as baseline; expand to granular per-finding invalidation. |
| **Continuous Updates** | Temporal Supersession | **Already Implemented** | `verifier.ts` flags older conflicting claims as `POSSIBLY_OUTDATED`. | Connect to document version changes. |
| **Continuous Updates** | Source Diff & Impact Scanner | **Not Implemented** | No logic scans findings citing a modified source to detect quote displacement. | Build `src/server/updates/impactScanner.ts` to detect displaced quotes upon source update. |
| **Continuous Updates** | Re-review & Version Bump | **Partially Implemented** | `buildHandoverDocument` supports versioning (`v1.0` -> `v1.1`), but requires manual re-certification. | Automate re-review flagging (`NEEDS_CORRECTION`) and version incrementation workflow. |
| **Continuous Updates** | Sync & Webhook Receiver | **Not Implemented** | No sync endpoint or webhook handler exists in `backend/routes/`. | Add `POST /api/sources/:id/sync` and `POST /api/sources/github/webhook`. |
