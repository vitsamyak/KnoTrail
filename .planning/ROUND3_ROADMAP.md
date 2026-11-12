# KnoTrail Round 3 Implementation Roadmap

> **Milestone**: CodersInPune Hackathon 2026 — Final Round 3 Build  
> **Team**: Deploy_or_Die (Samyak Gedam & Sanshrey Sanagar)  
> **Date**: 2026-11-12  
> **Status**: APPROVED for Planning (Phase 0 Complete)

---

## Roadmap Overview

Round 3 delivers the three major platform enhancements showcased to hackathon judges:
1. **Role-Based Security**: Manager, Developer, and External access tiers with in-session role switching, API authorization gates, and confidential data redaction while preserving the zero-auth public demo.
2. **GitHub Integration**: Connect GitHub repositories (public or authenticated via PAT), parse commits, pull requests, and issues into verifiable source evidence, and link findings directly to GitHub commit SHAs.
3. **Continuous Knowledge Updates**: Automated source change detection, impact scanning for affected findings, outdated invalidation, and mandatory human review before re-certifying updated handover versions.
4. **Integration, Security & Production Verification**: End-to-end integration, performance profiling, secret isolation, CORS audit, and full automated test suite execution (targeting 170+ passing tests).

```
┌────────────────────────────────────────────────────────────────────────┐
│                   PHASE 1: ROLE-BASED SECURITY                         │
│  - UserRole domain schema (Manager, Developer, External)               │
│  - Header Interactive Role Switcher for zero-auth evaluation           │
│  - Backend roleAuthMiddleware on sensitive mutations                   │
│  - Clearance tier redaction for External perspective                   │
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
│  - Security & secret leakage audit                                     │
│  - Gravitas verification contract execution (170+ tests PASS)          │
│  - Dual production builds: Next.js frontend + standalone Express       │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Phase Details

### Phase 1: Role-Based Security

**Goal**: Deliver role-based security across Manager, Developer, and External access tiers, with an interactive role switcher for zero-auth demo accessibility, API-level authorization gates, and automatic redaction of confidential findings.

- **Dependencies**: None (First Round 3 Phase).
- **Files Likely to be Modified**:
  - `src/lib/types.ts`: Define `UserRole` (`'MANAGER' | 'DEVELOPER' | 'EXTERNAL'`), update `ProjectData` and `EvidenceCitation`.
  - `src/context/ProjectContext.tsx`: Add `currentUserRole`, `setCurrentUserRole`, role persistence in `localStorage`, and role headers in API requests.
  - `src/lib/api-client.ts`: Send `X-KnoTrail-Role` header with all mutation requests.
  - `backend/middleware/roleAuth.ts` (NEW): Middleware enforcing required role levels per endpoint.
  - `backend/routes/handovers.ts`: Guard `POST /api/handovers/certify` (Manager only) and redact exports for External.
  - `backend/routes/conflicts.ts`: Guard `POST /api/conflicts/:id/resolve` (Manager only).
  - `backend/routes/sources.ts`: Guard deletion and upload (Manager/Developer only).
  - `backend/routes/findings.ts`: Guard approval and rejection (Manager/Developer only).
  - `src/components/layout/Header.tsx`: Add interactive Role Switcher dropdown/toggle pill.
  - `src/components/views/ReviewView.tsx`: Disable review actions for External with informational banner.
  - `src/components/views/HandoverView.tsx`: Disable "Certify Handover" button for Developer and External.
  - `src/components/views/EvidenceView.tsx`: Mask `CONFIDENTIAL` citations for External.
- **Database Changes**:
  - None required for core tables. Optional `role` property supported in JSONB `workspaces.project_data`.
- **New APIs**:
  - `GET /api/auth/role` (Returns current workspace role permissions).
- **Security Considerations**:
  - Prevent privilege escalation via request manipulation.
  - Ensure redacted handover exports do not leak confidential findings in JSON metadata.
- **Automated Test Requirements**:
  - `src/__tests__/roleSecurity.test.mjs` (NEW): Test role permission enforcement, API 403 Forbidden responses, redaction logic, and role persistence.
- **Acceptance Criteria**:
  1. Switching to `External` hides/disables review buttons and blocks `POST /api/handovers/certify` with HTTP 403.
  2. Findings marked `clearanceTier: 'CONFIDENTIAL'` are masked with `[REDACTED]` when viewed in External role.
  3. `Developer` can edit and approve findings, but cannot certify handovers or resolve architectural conflicts.
  4. `Manager` retains full access across all operations.
  5. Incognito evaluators can toggle roles freely without login.

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
- **Automated Test Requirements**:
  - `src/__tests__/githubIntegration.test.mjs` (NEW): Mock GitHub API responses, test commit/PR parsing, citation link generation, and rate-limit fallbacks.
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
- **Automated Test Requirements**:
  - `src/__tests__/continuousUpdates.test.mjs` (NEW): Test source modification detection, impact scanner quote verification, finding invalidation, review gate blocking, and version incrementation (`v1.0` -> `v1.1`).
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
  - Full test run executing all test suites: `npm test` targeting **170+ tests passing** with 0 failures.
  - Standalone Express backend build: `npm run backend:build` compiling cleanly to `dist/backend/server.js`.
  - Next.js frontend build: `npm run frontend:build` compiling cleanly with 0 errors across all routes.
- **Security Considerations**:
  - Zero database credentials or API keys exposed in frontend bundles or API responses.
  - Strict CORS policy verified.
- **Acceptance Criteria**:
  1. All 149 previous tests + 25+ new Round 3 tests pass cleanly (100% pass rate).
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
4. **Targeted Test Count**: 170+ automated tests across 12 test suites (all 9 previous suites + 3 new Round 3 suites: `roleSecurity`, `githubIntegration`, `continuousUpdates`).
5. **Production Bundles**:
   - Backend: `dist/backend/server.js` (under 250 KB).
   - Frontend: Next.js static and dynamic routes compiled with zero errors.
