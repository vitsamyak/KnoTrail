# Phase 2 Architecture: GitHub Integration

**Project**: KnoTrail — Reconstructing Verified, Source-Traceable Project Knowledge  
**Event**: CodersInPune Hackathon 2026 — Final Round 3 Preparation  
**Team**: Deploy_or_Die (Samyak Gedam & Sanshrey Sanagar)  
**Status**: APPROVED ARCHITECTURE FOR PHASE 2  
**Target Repository**: `https://github.com/vitsamyak/KnoTrail`  

---

## 1. Architectural Overview & Design Philosophy

KnoTrail's mission is to eliminate knowledge loss during team transitions by transforming authentic project activity into structured, verified, and source-traceable knowledge handovers.

In Phase 2, we extend KnoTrail's source ingestion engine beyond static uploaded documents (PDF, Markdown, Text) to **live GitHub repositories**. Rather than inventing a detached, parallel workflow for code repositories, GitHub data enters KnoTrail's **canonical knowledge pipeline**:

```mermaid
flowchart TD
    subgraph GitHub Cloud
        GH_REPO["GitHub Repository\n(Metadata, Commits, PRs, Issues, Docs)"]
        GH_WEBHOOK["GitHub Webhooks\n(Push, PR, Issues events)"]
    end

    subgraph KnoTrail Backend (Express 5)
        GH_SVC["GitHub App Service\n(backend/services/github.ts)\nJWT Auth / Token Cache / Octokit REST"]
        GH_SYNTH["Activity Document Synthesizer\n(backend/services/githubSynthesizer.ts)\nMarkdown Normalization with Hunks & Line Offsets"]
        GH_ROUTES["GitHub API Router\n(backend/routes/github.ts)\nRole-Guarded Endpoints"]
        WH_ROUTER["Webhook Router\n(backend/routes/webhooks.ts)\nSignature Verification & Idempotency"]
        AUTH_MW["Phase 1 Role Security Middleware\n(requireWorkspaceAccess, requireRole)"]
    end

    subgraph Storage Layer
        DB_GH["github_integrations Table\n(repo_id, installation_id, branch, sync_status)"]
        DB_WH["github_webhook_events Table\n(event_id, payload_hash, processed_at)"]
        WS_STORAGE["Workspace Project State\n(ProjectSource of type 'github' in project_data)"]
    end

    subgraph Canonical KnoTrail AI Pipeline
        AI_CHUNKER["Document Chunker\n(Chunk by Commits / PRs / Sections)"]
        GEMINI["Gemini 2.5 Flash\n(Zero Fabrication Extraction)"]
        GROUNDING["Evidence Grounding Engine\n(Exact Quote Matching & Commit SHA Linking)"]
        VERIFIER["Evidence Verifier & Conflict Detector\n(Dual-Status Evaluation)"]
        HUMAN_REV["Human Review & Approval Gate\n(Manager / Developer Review)"]
        HANDOVER["Certified Handover Document\n(With Direct Clickable GitHub URLs)"]
    end

    GH_REPO -->|REST API v3| GH_SVC
    GH_WEBHOOK -->|HMAC-SHA256 Payload| WH_ROUTER
    WH_ROUTER -->|Verified Event| GH_SVC
    GH_SVC --> GH_SYNTH
    GH_SYNTH --> GH_ROUTES
    GH_ROUTES --> AUTH_MW
    AUTH_MW --> DB_GH
    AUTH_MW --> WS_STORAGE
    WH_ROUTER --> DB_WH

    WS_STORAGE --> AI_CHUNKER
    AI_CHUNKER --> GEMINI
    GEMINI --> GROUNDING
    GROUNDING --> VERIFIER
    VERIFIER --> HUMAN_REV
    HUMAN_REV --> HANDOVER
```

---

## 2. GitHub App Integration Model (Preferred Architecture)

We adopt a **GitHub App-based integration** as our primary architecture, supplemented with a server-side PAT fallback for flexible hackathon evaluation and isolated local testing.

### Why GitHub App over OAuth App?
1. **Granular, Least-Privilege Permissions**: OAuth Apps request broad scopes (`repo` grants read/write to all public/private code). GitHub Apps allow exact, fine-grained, read-only permissions on specific repositories.
2. **Short-Lived Installation Tokens**: Authenticates via RS256 JWT signed with the App's private key to acquire an installation access token that expires in 60 minutes.
3. **No User Impersonation**: GitHub App acts as a trusted machine integration on behalf of the organization.
4. **Higher Rate Limits**: 5,000 requests/hour per installation (compared to 60 req/hr for unauthenticated calls).

### Required Minimum Permissions (Least-Privilege)
| Scope | Permission Level | Justification |
| :--- | :--- | :--- |
| **Repository Metadata** | **Read-only** | Read repository name, default branch, stars, description, license |
| **Repository Contents** | **Read-only** | Ingest `README.md`, documentation, `package.json`, and commit diffs |
| **Pull Requests** | **Read-only** | Ingest PR descriptions, review comments, review status, and merge commits |
| **Issues** | **Read-only** | Ingest issue discussions, task labels, assignees, and bug reports |

> [!IMPORTANT]
> Write access is strictly prohibited. KnoTrail never commits code, opens issues, or modifies repository settings.

### Server-Side Credential Ingestion & Isolation
All GitHub credentials are kept strictly server-side:
- `GITHUB_APP_ID`: Numeric App ID
- `GITHUB_APP_PRIVATE_KEY`: PEM-encoded RSA private key
- `GITHUB_CLIENT_ID`: OAuth Client ID (for installation flow)
- `GITHUB_CLIENT_SECRET`: OAuth Client Secret
- `GITHUB_WEBHOOK_SECRET`: High-entropy shared secret for webhook HMAC verification
- `GITHUB_PAT_FALLBACK` (Optional): Server-side Personal Access Token for quick evaluation

> [!CAUTION]
> Under no circumstances are GitHub private keys, client secrets, webhook secrets, or installation tokens exposed in API responses, frontend bundles, or committed to source control.

---

## 3. Repository Activity Synthesis (The Normalization Layer)

A core insight of KnoTrail's architecture is that **heterogeneous external data must be normalized into deterministic, citeable text documents** before entering the AI knowledge pipeline.

Rather than running AI extraction on raw JSON blobs from the GitHub API, `backend/services/githubSynthesizer.ts` transforms repository activity into a structured, Markdown-formatted **Repository Activity Document**.

### Synthesized Document Structure
```markdown
# Repository Activity: {owner}/{repo}
Branch: {branch} | Head Commit: {headSha} | Ingested At: {isoTimestamp}

## 1. Repository Overview
- **Repository**: {owner}/{repo}
- **Description**: {description}
- **Default Branch**: {defaultBranch}
- **Language / Tech Stack**: {languages}

## 2. Architecture & Documentation
### File: README.md
{readmeContent}

### File: docs/architecture.md
{docContent}

## 3. Pull Requests & Architectural Debates
### PR #{number}: {title}
- **State**: {state} (Merged: {mergedAt})
- **Author**: @{author} | **Reviewers**: @{reviewers}
- **Decision**: {reviewStatus}
- **Description**:
{description}
- **Review Discussions**:
> @{reviewer}: "{commentBody}"

## 4. Commit History & Code Diffs
### Commit {sha} ({shortSha}) by @{author} on {date}
- **Message**: {commitMessage}
- **Files Modified**: {filesSummary}
- **Diff Excerpt**:
```diff
@@ -45,6 +45,8 @@
- const port = 5432;
+ const port = 5433; // Switched to avoid local collision
```

## 5. Active & Closed Issues
### Issue #{number}: {title}
- **State**: {state} | **Assignee**: @{assignee} | **Labels**: {labels}
- **Description**:
{issueBody}
```

### Benefits of Activity Synthesis:
1. **Accurate Line & Coordinate Grounding**: Every commit diff hunk and PR comment has deterministic line numbers within the source document, allowing KnoTrail's `groundFinding()` and `calculateCoordinates()` to function identically to uploaded documents.
2. **Deduplication & Chunking**: Standard document chunking (`chunkDocument`) divides large repositories without losing contextual headers.
3. **Traceability**: Findings cite both the document line number AND the explicit `commitSha` or PR URL.

---

## 4. Evidence Grounding & Clickable URL Formatting

When Gemini extracts a finding from the synthesized GitHub source, KnoTrail's grounding engine attaches an `EvidenceCitation` with GitHub-specific metadata:

```typescript
export interface EvidenceCitation {
  id: string;
  sourceId: string;
  sourceName: string;
  sourceType: 'github';
  file: string;             // e.g. "src/server/db/storage.ts" or "PR #14"
  lineRange: string;        // e.g. "45-52"
  commitSha?: string;       // e.g. "7a9b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b"
  author: string;           // e.g. "samyakvikasgedam"
  timestamp: string;        // e.g. "2026-11-12T14:30:00Z"
  snippet: string;          // Diff hunk or review comment excerpt
  quote?: string;           // Verbatim substring matched from activity doc
  contentHash: string;      // SHA-256 of quote
  clearanceTier: 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL';
  confidence: number;
}
```

### URL Resolution Rules:
- **Commit Citation**: `https://github.com/{owner}/{repo}/commit/{commitSha}`
- **Commit File Citation**: `https://github.com/{owner}/{repo}/blob/{commitSha}/{filePath}#L{startLine}-L{endLine}`
- **Pull Request Citation**: `https://github.com/{owner}/{repo}/pull/{prNumber}#discussion_r{commentId}`
- **Issue Citation**: `https://github.com/{owner}/{repo}/issues/{issueNumber}`

---

## 5. Security & Authorization Boundaries

Phase 2 strictly adheres to the server-verified role-based access control established in Phase 1:

1. **Role Enforcement**:
   - `POST /api/github/connect`: Requires `MANAGER` or `DEVELOPER` role. `EXTERNAL` callers receive `403 Forbidden`.
   - `POST /api/github/sync`: Requires `MANAGER` or `DEVELOPER` role. `EXTERNAL` callers receive `403 Forbidden`.
   - `DELETE /api/github/disconnect`: Requires `MANAGER` role. `DEVELOPER` and `EXTERNAL` receive `403 Forbidden`.
   - `GET /api/github/repos` / `GET /api/github/status`: Requires workspace membership (`MANAGER`, `DEVELOPER`, or `EXTERNAL`).
2. **Dual-Space Isolation**:
   - In anonymous demo workspaces (`ws_anon_*`), GitHub integration connects to public repositories without requiring credentials or modifying server configs.
   - In protected workspaces (`ws_proj_*`), authenticated users connect organizational repositories verified against server membership.
3. **Webhook Security**:
   - Signature validation via `X-Hub-Signature-256` header:
     ```typescript
     const expectedSig = 'sha256=' + crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex');
     const isValid = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig));
     ```
   - Replay protection: Deliveries record `X-GitHub-Delivery` in `github_webhook_events`. Duplicate delivery IDs are dropped immediately with HTTP 200.
4. **Rate Limit Throttling**:
   - Rate limit tracking monitors `x-ratelimit-remaining`. If remaining requests drop below 100, ingestion gracefully falls back to cached commits or returns an informative rate-limit advisory.

---

## 6. Zero-Login Demo Experience

To ensure hackathon evaluators can test the GitHub integration in 10 seconds without setting up a GitHub App or entering secrets:
1. **Pre-Seeded Demo Source**: The default demo workspace includes `KnoTrail Core Repository (GitHub)` as a pre-indexed GitHub source showing recent commits, PRs, and architectural decisions.
2. **Public Repo Ingestion**: Evaluators can input any public GitHub URL (e.g. `vitsamyak/KnoTrail`) in the Demo Workspace. The backend fetches public repository activity using the server's public GitHub client and immediately displays synthesized commits and extracted findings.
3. **Clickable Links**: Evaluators can click the commit SHAs directly to jump to the real GitHub commit on `github.com`.

