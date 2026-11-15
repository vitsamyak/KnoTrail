# Phase 2 Architecture Decision Records (ADRs)

**Project**: KnoTrail — Reconstructing Verified, Source-Traceable Project Knowledge  
**Event**: CodersInPune Hackathon 2026 — Final Round 3 Preparation  
**Team**: Deploy_or_Die (Samyak Gedam & Sanshrey Sanagar)  

---

## ADR-014: GitHub App vs OAuth App vs Personal Access Tokens (PAT)

### Context
KnoTrail must connect to GitHub repositories to read metadata, commits, pull requests, issues, and documentation. We need to select the authorization model that maximizes security, organizational compliance, and rate-limiting limits while maintaining ease of evaluation.

### Decision
Adopt **GitHub App** as the primary enterprise architecture, supplemented by a **server-side PAT fallback** for frictionless hackathon demonstration:
1. **Production / Enterprise**: GitHub App with fine-grained, read-only permissions installed at the organization or repository level. Short-lived (60 min) installation tokens are generated server-side using RS256 JWTs signed with the App's private key.
2. **Hackathon Evaluation / Offline**: Server-side configured Personal Access Token (PAT) or public GitHub REST endpoints for zero-configuration testing of public repositories like `vitsamyak/KnoTrail`.
3. **OAuth App Rejected**: OAuth apps require overly broad scopes (e.g. `repo` gives read AND write access to all code), which violates our least-privilege invariant.

### Consequences
- **Positive**: Strict least privilege (Read-only); 5,000 req/hr rate limits; zero long-lived credentials exposed to clients.
- **Trade-off**: Requires RS256 JWT signing logic in the backend, which is cleanly handled via native Node.js `crypto`.

---

## ADR-015: Ingestion Model: Activity Synthesis vs Raw Relational Records

### Context
When GitHub commits, PRs, and issues are ingested, how should they be structured before knowledge extraction?
- *Option A*: Store raw JSON records in specialized SQL tables (`github_commits`, `github_prs`) and run extraction on disparate JSON fragments.
- *Option B*: Synthesize repository activity into a single, structured Markdown **Repository Activity Document** that enters KnoTrail's existing `ProjectSource` and chunking pipeline.

### Decision
Adopt **Option B (Activity Synthesis Document)**:
`backend/services/githubSynthesizer.ts` compiles repository metadata, README, key architecture files, recent commits with diff hunks, PR discussions, and issues into a deterministic, Markdown-formatted source document.

### Justification
1. **Unifies Pipeline**: Preserves KnoTrail's core invariant that **all sources enter the same knowledge extraction, grounding, and verification pipeline**.
2. **Accurate Coordinates**: Citations can reference exact line numbers in the activity document while preserving original `commitSha`, PR number, and file path metadata.
3. **Cross-Source Conflict Detection**: KnoTrail's existing conflict detector (`src/server/verification/verifier.ts`) seamlessly detects contradictions between a commit diff in the GitHub activity document and a statement in an uploaded PDF handover note.
4. **No Code Duplication**: Avoids duplicating Gemini prompt logic, chunking, or approval workflows.

---

## ADR-016: Least Privilege Permissions & Secret Storage Security

### Context
GitHub integrations handle sensitive code and repository metadata. We must guarantee that private keys and secrets are never leaked.

### Decision
1. **Read-Only Scopes Only**: Request strictly:
   - `metadata: read`
   - `contents: read`
   - `pull_requests: read`
   - `issues: read`
   No write permissions are ever requested.
2. **Server-Side Secret Isolation**:
   - `GITHUB_APP_PRIVATE_KEY` and `GITHUB_WEBHOOK_SECRET` are ingested solely in Node.js server memory.
   - Secrets are excluded from all logging, telemetry, and API responses.
   - Frontend components receive only sanitized repository metadata (name, owner, commit count, sync status).
3. **Exclusion from Frontend Builds**:
   - Variables are kept in `.env.local` without `NEXT_PUBLIC_` prefixes.

---

## ADR-017: Webhook Signature Verification and Idempotency Tracking

### Context
GitHub webhooks notify KnoTrail of new commits, PR merges, and issue updates. Webhooks must be verified to prevent forged events, denial-of-service, or duplicate processing.

### Decision
1. **HMAC-SHA256 Signature Verification**:
   - Every incoming webhook must provide header `X-Hub-Signature-256`.
   - The backend computes the HMAC-SHA256 of the raw request payload using `GITHUB_WEBHOOK_SECRET` and performs a constant-time comparison using `crypto.timingSafeEqual`.
2. **Idempotency & Replay Protection**:
   - Every webhook delivery includes a unique UUID in `X-GitHub-Delivery`.
   - The delivery ID is recorded in the `github_webhook_events` table (or in-memory cache).
   - If an event ID has already been processed within the last 24 hours, the request is acknowledged with HTTP 200 and ignored.

---

## ADR-018: Commit Evidence Grounding: Diff Hunk Verification vs Commit Messages Alone

### Context
Can a commit message alone be treated as conclusive evidence of an implemented architectural decision or bug fix?

### Decision
**No. Commit messages alone are NOT sufficient proof of implementation.**
1. KnoTrail's extraction engine requires commit findings to be grounded in the **actual patch diff** or touched files whenever code changes are involved.
2. If a commit message claims "Fixed memory leak by removing event listener", but the diff only modifies a README typo, KnoTrail's grounding engine flags the claim as `UNCERTAIN` or `MISMATCHED`.
3. Citations for commit findings must store:
   - `commitSha`: Full 40-character commit hash.
   - `file`: Path of the modified file within the repository.
   - `lineRange`: Coordinates within the patch diff hunk.
   - `snippet`: Verbatim diff hunk demonstrating the code change.

---

## ADR-019: Rate Limit Defense and Pagination Controls

### Context
GitHub enforces strict rate limits:
- 60 req/hr for unauthenticated IP requests.
- 5,000 req/hr for authenticated GitHub App installations or Personal Access Tokens.
Large repositories with thousands of commits can quickly exhaust quotas if unbounded.

### Decision
1. **Hard Pagination Limits**:
   - Commits: Ingest maximum 50 most recent commits per sync.
   - Pull Requests: Ingest maximum 30 most recent PRs.
   - Issues: Ingest maximum 30 most recent issues.
   - Diff Excerpts: Cap individual commit diffs at 100 KB.
2. **Rate Limit Header Inspection**:
   - Inspect `x-ratelimit-remaining` on every response.
   - If remaining quota is $< 100$, trigger a warning and throttle further requests.
3. **Source File Filtering**:
   - Exclude generated folders, binaries, lockfiles (`node_modules/`, `dist/`, `.next/`, `package-lock.json`, images, binaries).

---

## ADR-020: Zero-Login Demo Experience for GitHub Integration

### Context
Hackathon evaluators need to test the GitHub integration immediately in Incognito mode without configuring a GitHub App or pasting API keys.

### Decision
1. **Pre-Seeded Repository Source**: The default workspace includes a pre-indexed GitHub source (`vitsamyak/KnoTrail`) populated with authentic commits, PRs, and architectural findings.
2. **Public Repo Ingestion**: Evaluators can input any public repository (e.g. `vitsamyak/KnoTrail` or `facebook/react`) in the demo workspace; the server ingests public activity using the server's public credentials.
3. **Interactive Demo Role Switching**: Evaluators can switch between Manager, Developer, and External perspectives in the Header to verify that External users see read-only repository cards with disabled sync buttons.

---

## ADR-021: Evidence Provenance Preservation & Chain of Custody

### Context
When repository activity is synthesized into a Markdown document for AI extraction, there is a risk that the original GitHub metadata (repository ID, commit SHA, file path, patch hunk, PR review comment, author, and timestamp) is lost or flattened into a plain line number.

### Decision
Define a dedicated, strongly-typed `GitHubEvidenceProvenance` model attached to every `EvidenceCitation`:
1. Preserves `repositoryId`, `repositoryOwner`, `repositoryName`, `branch`, `commitSha`, `filePath`, `originalGitHubUrl`, `diffHunk` (with `startLine`, `endLine`, `patchExcerpt`), `prNumber`, `prReviewId`, `issueNumber`, `author`, `timestamp`, and `contentHash`.
2. Computes the deterministic SHA-256 `contentHash` directly from the raw code hunk or quotation.
3. Dynamically constructs deep external GitHub URLs:
   - File Diff: `https://github.com/{owner}/{repo}/blob/{commitSha}/{filePath}#L{startLine}`
   - Commit: `https://github.com/{owner}/{repo}/commit/{commitSha}`
   - Pull Request: `https://github.com/{owner}/{repo}/pull/{prNumber}`
   - Issue: `https://github.com/{owner}/{repo}/issues/{issueNumber}`
4. Retains dual coordinates: both the synthesized Markdown line range (`120-125`) for in-app text highlighting and the GitHub commit diff coordinates (`src/server/db/config.ts#L45`) for external verification.

---

## ADR-022: In-Memory Installation Token Caching & Proactive Expiration Refresh

### Context
GitHub App installation tokens expire after 60 minutes. Requesting a new token on every API call adds latency and consumes unnecessary token generation quota. Conversely, waiting until a token has expired before refreshing causes in-flight API requests to fail with HTTP 401.

### Decision
1. Implement in-memory token cache: `Map<number, { token: string; expiresAt: number; permissions?: Record<string, string> }>`.
2. Enforce proactive refresh with a **5-minute (300,000 ms) safety buffer**:
   - If `Date.now() < expiresAt - 300_000`, the cached token is reused instantly without network overhead.
   - If within 5 minutes of expiration, the service proactively generates a fresh RS256 JWT, calls GitHub's `/access_tokens` endpoint, and updates the cache.
3. Provide `clearTokenCache()` to support immediate invalidation during key rotations or integration resets.


