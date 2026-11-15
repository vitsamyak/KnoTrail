# Phase 2 Roadmap: GitHub Integration

**Project**: KnoTrail — Reconstructing Verified, Source-Traceable Project Knowledge  
**Event**: CodersInPune Hackathon 2026 — Final Round 3 Preparation  
**Team**: Deploy_or_Die (Samyak Gedam & Sanshrey Sanagar)  
**Status**: APPROVED IMPLEMENTATION PLAN  

---

## Milestone Breakdown

### Milestone 2.1: Types & Database Schema Migration
- **Goal**: Establish the relational schema for tracking connected GitHub repositories and webhook events, and extend TypeScript interfaces.
- **Files to Create / Modify**:
  - `supabase/migrations/20261112000002_knotrail_github_integrations.sql` (NEW):
    - Table `github_integrations` (`id`, `workspace_id`, `repo_owner`, `repo_name`, `repo_id`, `default_branch`, `selected_branch`, `sync_status`, `last_synced_at`, `last_commit_sha`, `config`).
    - Table `github_webhook_events` (`event_id`, `event_type`, `repo_id`, `processed_at`, `payload_hash`).
    - RLS enabled on both tables, granting access exclusively to `service_role`.
  - `src/server/db/schema.sql`: Add definitions mirroring the migration.
  - `src/lib/types.ts`:
    - Add `GitHubRepoMetadata` and `GitHubIntegrationConfig`.
    - Extend `ProjectSource` with `githubMetadata?: GitHubRepoMetadata`.
    - Extend `EvidenceCitation` with `githubUrl?: string` and `prNumber?: number`.
- **Verification**: Schema compiles cleanly; `npm run backend:build` succeeds.

---

### Milestone 2.2: Backend GitHub Service & Token Manager
- **Goal**: Implement server-side client for GitHub REST API v3 with GitHub App authentication, PAT fallback, rate-limit defense, and pagination controls.
- **Files to Create**:
  - `backend/services/github.ts` (NEW):
    - `generateAppJwt()`: Creates RS256 JWT valid for 10 minutes using `GITHUB_APP_ID` and `GITHUB_APP_PRIVATE_KEY`.
    - `getInstallationToken(installationId)`: Exchanges JWT for 1-hour installation token with caching.
    - `getRepoMetadata(owner, repo)`: Fetches repository info, default branch, description, languages.
    - `getRepoCommits(owner, repo, branch, limit)`: Fetches recent commits with commit message, author, date, and changed file diff stats (capped at 50).
    - `getCommitDiff(owner, repo, sha)`: Fetches patch diff for a specific commit (capped at 100KB).
    - `getRepoPullRequests(owner, repo, state, limit)`: Fetches PRs, descriptions, review comments, and merge status (capped at 30).
    - `getRepoIssues(owner, repo, state, limit)`: Fetches issues, labels, comments, and assignees (capped at 30).
    - `getRepoFileContent(owner, repo, path, ref)`: Fetches specific markdown documentation or README.
- **Verification**: Isolated service tests verify API interactions, rate-limit header parsing, and token management.

---

### Milestone 2.3: Activity Document Synthesizer & Normalizer
- **Goal**: Transform disparate GitHub API responses into a unified, deterministic Markdown document with exact line offsets and citeable diff hunks.
- **Files to Create**:
  - `backend/services/githubSynthesizer.ts` (NEW):
    - `synthesizeRepoActivity(data)`: Assembles README, commits with diff hunks, PR discussions, and issues into structured Markdown.
    - Invariant: Zero fabrication — only formats authentic GitHub data returned by the API.
    - Invariant: Retains content hash (SHA-256) and character/line offsets for precise evidence grounding.
- **Verification**: Unit tests verify that synthesized documents contain verbatim commit messages, diff hunks, and calculate correct line numbers.

---

### Milestone 2.4: Express API Endpoints & Role Authorization
- **Goal**: Mount protected GitHub endpoints guarded by Phase 1 middleware.
- **Files to Create / Modify**:
  - `backend/routes/github.ts` (NEW):
    - `GET /api/github/repos`: Lists connected repositories in workspace (Requires workspace member).
    - `POST /api/github/connect`: Validates repo, fetches activity, synthesizes source document, and saves to workspace sources (Requires `MANAGER` or `DEVELOPER`).
    - `POST /api/github/sync`: Pulls latest commits/PRs/issues since `last_commit_sha` and refreshes source document (Requires `MANAGER` or `DEVELOPER`).
    - `DELETE /api/github/disconnect`: Removes connected repository from workspace (Requires `MANAGER`).
    - `POST /api/github/webhook`: Public webhook endpoint with HMAC-SHA256 signature verification and replay prevention.
  - `backend/routes/index.ts`: Mount `githubRouter` under `/api/github`.
  - `backend/app.ts`: Add raw body preservation for `/api/github/webhook` HMAC verification.
- **Verification**: Express integration tests verify route permissions, 403 on External user, 401 on unauthenticated, and 200/201 on Manager/Developer.

---

### Milestone 2.5: AI Extraction & Grounding Enhancement
- **Goal**: Ensure Gemini 2.5 Flash extracts knowledge from synthesized GitHub sources and grounding attaches valid `commitSha` and direct GitHub URLs.
- **Files to Modify**:
  - `src/server/ai/grounding.ts`:
    - When source is `type: 'github'`, extract `commitSha` from citation context or line range.
    - Attach direct clickable URL: `https://github.com/{owner}/{repo}/commit/{sha}` or `.../pull/{pr}`.
  - `src/server/ai/gemini.ts`:
    - Ensure extraction prompt recognizes commit diffs, PR discussions, and issues as valid operational context for decisions, tasks, risks, and dependencies.
- **Verification**: Test extracting findings from real commit history; verify that generated citations contain valid commit SHAs and URLs.

---

### Milestone 2.6: Frontend UI Components & Source Manager View
- **Goal**: Provide an intuitive, responsive GitHub connection interface within `SourceManagerView.tsx`.
- **Files to Modify / Create**:
  - `src/lib/api-client.ts`: Add `connectGitHubRepo`, `syncGitHubRepo`, `disconnectGitHubRepo`, `listGitHubRepos`.
  - `src/context/ProjectContext.tsx`: Expose `connectGitHubRepository`, `syncGitHubRepository`.
  - `src/components/views/SourceManagerView.tsx`:
    - Add "Connect GitHub Repository" action button and modal.
    - Modal inputs: Repository URL (e.g. `owner/repo` or full GitHub URL), Branch selection, Ingestion options (Commits, PRs, Issues, Docs).
    - Display connected GitHub repository cards with live sync badge, commit count, PR count, and "Sync Now" button.
    - Disable connect/sync buttons for `EXTERNAL` role with explanatory tooltip.
  - `src/components/views/EvidenceView.tsx`:
    - Make `SHA: {citation.commitSha}` badge a clickable external link to GitHub.
- **Verification**: Next.js production build succeeds; UI adapts seamlessly across desktop and mobile.

---

### Milestone 2.7: Comprehensive Automated Test Suite
- **Goal**: Create end-to-end automated test suite covering all GitHub integration requirements.
- **Files to Create**:
  - `src/__tests__/githubIntegration.test.mjs` (NEW):
    - Test 1: GitHub App JWT generation and authorization header formation.
    - Test 2: Repository activity synthesis produces valid, structured Markdown with line offsets.
    - Test 3: Public repository ingestion and source registration in workspace state.
    - Test 4: Role-based authorization: External user receives 403 on connect and sync; Manager succeeds.
    - Test 5: AI knowledge extraction extracts decisions and tasks citing exact commit SHAs.
    - Test 6: Evidence grounding generates valid direct GitHub commit and PR URLs.
    - Test 7: Conflict detection detects contradictory claims between GitHub commits and meeting notes.
    - Test 8: Webhook signature verification accepts valid HMAC-SHA256 and rejects tampered signatures.
    - Test 9: Webhook replay protection drops duplicate delivery IDs.
    - Test 10: Rate-limit defense handles API quota limits gracefully without throwing unhandled exceptions.
- **Verification**: All 10 tests pass alongside existing 161 tests (total 171+ tests).

---

### Milestone 2.8: Final Verification & Handover
- **Goal**: Execute full test suite, build checks, and produce Phase 2 documentation.
- **Tasks**:
  - Run `npm test` (all tests passing).
  - Run `npm run backend:build` and `npm run frontend:build`.
  - Update `.planning/ROUND3_STATE.md` and `.gravitas/contract.json`.
  - Create `PHASE2_GITHUB_VERIFICATION.md`.

