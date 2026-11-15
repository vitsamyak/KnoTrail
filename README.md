# KnoTrail: Continuous Knowledge Handover Platform

> **CodersInPune Hackathon 2026 (Round 2 & Round 3 Build)**  
> **Team Name**: Deploy_or_Die  
> **Team Roster**:  
> - **Samyak Gedam** (samyakgedam69@gmail.com) — Team Leader & Official Representative  
> - **Sanshrey Sanagar** (sanshrey7273@gmail.com) — Core Engineer  
>
> **Core Value**: Reconstructing verified, source-traceable project state through an end-to-end knowledge handover workflow (**RECONSTRUCT → VERIFY → REVIEW → HANDOVER**) with mandatory human approval, zero ungrounded claims, and continuous repository synchronization.

---

## Table of Contents

1. [Overview & Problem Statement](#overview--problem-statement)
2. [Core Principles & Zero-Fabrication Guarantee](#core-principles--zero-fabrication-guarantee)
3. [The 8-Step User Journey](#the-8-step-user-journey)
4. [Round 3 System Architecture & Improvements](#round-3-system-architecture--improvements)
   - [Improvement 1: GitHub Source Integration & Ingestion](#improvement-1-github-source-integration--ingestion)
   - [Improvement 2: Role-Based Security Hardening (RBAC)](#improvement-2-role-based-security-hardening-rbac)
   - [Improvement 3: Continuous Knowledge Updates](#improvement-3-continuous-knowledge-updates)
5. [Role-Based Access Control Matrix](#role-based-access-control-matrix)
6. [Continuous Update Engine & Evidence Drift Lifecycle](#continuous-update-engine--evidence-drift-lifecycle)
7. [Environment Variables & Configuration](#environment-variables--configuration)
8. [Database & Storage Setup (Supabase & File Storage)](#database--storage-setup-supabase--file-storage)
9. [Local Development & Testing](#local-development--testing)
10. [Production Deployment Guide](#production-deployment-guide)
11. [Judge Self-Service & Demo Verification](#judge-self-service--demo-verification)
12. [Known Limitations & Failure Recovery](#known-limitations--failure-recovery)

---

## Overview & Problem Statement

When engineers, researchers, or student leaders leave a software team, vital institutional knowledge is lost:
- Architectural decisions and implementation tradeoffs remain undocumented.
- Lingering technical debt, open tasks, and risks disappear into forgotten commit logs and PR comment threads.
- New team members spend weeks rediscovering operational reality through painful trial and error.

**KnoTrail** solves this problem by ingesting authorized project sources (Git repositories, commit histories, pull requests, issues, markdown documentation, and meeting notes), synthesizing candidate operational findings with Google Gemini AI, anchoring every finding to immutable source coordinates, detecting cross-document contradictions, and enforcing mandatory human review and sign-off before generating certified 12-section handover packages.

---

## Core Principles & Zero-Fabrication Guarantee

1. **Zero Hallucination / Zero Fabrication**: Findings cannot exist without verifiable source proof. Every finding cites an exact file path, commit hash, line range, and direct quote.
2. **Dual-Status Integrity**: Every item carries both an algorithmic verification state (`MATCHED`, `MISMATCHED`, `UNCERTAIN`, `MISSING`) and an authoritative human review status (`PENDING_REVIEW`, `APPROVED`, `REJECTED`, `NEEDS_CORRECTION`, `CONFLICT_REQUIRES_RESOLUTION`).
3. **Mandatory Human Sign-Off Gate**: AI suggests; only human Managers certify. Certified handovers require 100% review completion and 0 unresolved contradictions.
4. **Frictionless Zero-Auth Access**: Evaluators, judges, and incoming team members can explore, analyze, and review projects immediately in an Incognito window without registration, signup, or login hurdles.

---

## The 8-Step User Journey

```
[1. Landing Page] (Zero-auth intro, "Try Demo")
        │
        ▼
[2. Project Workspace] (Overview, status, sources, pending work, sample loader)
        │
        ▼
[3. Add Project Information] (Git repos, docs, notes, tasks)
        │
        ▼
[4. AI Project Analysis] (Decisions, tasks, responsibilities, risks, questions)
        │
        ▼
[5. Evidence Explorer] (Grounding, citations: VERIFIED | UNCERTAIN | CONFLICTING | MISSING)
        │
        ▼
[6. Human Review Center] (Review, edit, add missing, resolve conflicts, mandatory sign-off)
        │
        ▼
[7. Handover Generation] (Structured, approved handover package creation)
        │
        ▼
[8. Handover Delivery] (Interactive viewer, export JSON/Markdown/PDF, shareable link)
```

---

## Round 3 System Architecture & Improvements

KnoTrail is built as a modern decoupled full-stack platform:
- **Frontend**: Next.js 14 App Router, React 18, Tailwind CSS with Material Design 3 soft-green visual identity, Framer Motion animations.
- **Backend**: Node.js 20, Express, TypeScript, RESTful architecture.
- **AI Engine**: Google Gemini 2.5 Flash via official `@google/genai` SDK with strict JSON schema structured output.
- **Persistence**: Abstracted storage repository supporting both **Durable File-Based JSON Storage** (local/offline) and **Supabase PostgreSQL JSONB & Cloud Storage** (production).

### Improvement 1: GitHub Source Integration & Ingestion
- First-class GitHub repository connection (`GET/POST/DELETE /api/github/integrations`).
- Ingestion compiler converting commits, pull requests, issues, and documentation into structured `ProjectSource` artifacts with SHA-256 content hashing.
- AI extraction pipeline synthesizing 7 operational categories with cryptographic `gitHubProvenance` citation anchors.

### Improvement 2: Role-Based Security Hardening (RBAC)
- Strict governance gating: Manager role required for approving/rejecting findings, resolving conflicts, and generating/certifying handovers.
- Source data redaction: External role querying `/api/sources` receives redacted confidential content and stripped internal file paths.
- Tamper resistance: Non-managers cannot pre-certify handovers or overwrite `updateHistory` via workspace updates.

### Improvement 3: Continuous Knowledge Updates
- **Webhook Expansion**: Real-time handling of `push`, `pull_request`, `issues`, `issue_comment`, `pull_request_review`, and `pull_request_review_comment` events.
- **Mutex Concurrency Queue**: Serializes simultaneous webhook arrivals per repository (`withRepositoryLock`) to prevent race conditions.
- **Precision Evidence Drift Detection**: Content-aware sliding-window overlap scanner that ignores whitespace/formatting changes (Zero False Positives) and detects missing, modified, or contradicted evidence.
- **Selective Approval Invalidation**: Materially drifted findings have approval revoked and are flagged with `needsReReview: true` without invalidating unaffected findings.
- **Outdated Handover Invalidation**: De-certifies certified handovers and activates outdated warning banners when underlying knowledge drifts.
- **Update Activity Drawer**: Paginated audit log (`GET /api/github/integrations/:repoId/history`) with retry actions and error diagnostics.

---

## Role-Based Access Control Matrix

| Capability / Action | MANAGER | DEVELOPER | EXTERNAL |
|---------------------|:-------:|:---------:|:--------:|
| View Workspace, Sources & Handover | ✅ Full | ✅ Full | ⚠️ Redacted Sources |
| Connect / Disconnect GitHub Repositories | ✅ Yes | ❌ No | ❌ No |
| Manual Repository Synchronization | ✅ Yes | ✅ Yes | ❌ No |
| Retry Failed Updates | ✅ Yes | ✅ Yes | ❌ No |
| Add / Upload Project Sources | ✅ Yes | ✅ Yes | ❌ No |
| Delete Project Sources | ✅ Yes | ❌ No | ❌ No |
| Edit Finding Details | ✅ Yes | ✅ Yes | ❌ No |
| Approve / Reject Findings | ✅ Yes | ❌ No (Read-Only) | ❌ No (Read-Only) |
| Resolve Contradictions & Conflicts | ✅ Yes | ❌ No | ❌ No |
| Generate & Certify Handover Packages | ✅ Yes | ❌ No | ❌ No |
| Create & Revoke Public Share Links | ✅ Yes | ❌ No | ❌ No |

---

## Continuous Update Engine & Evidence Drift Lifecycle

```
GitHub Push / PR / Issue
        │
        ▼
POST /api/github/webhook
(HMAC-SHA256 Signature Verification & Idempotency Check)
        │
        ▼
withRepositoryLock(workspaceId, repoId)
(Mutex Concurrency Serialization)
        │
        ▼
Ingestion Compiler (Raw commits/PRs -> ProjectSource)
        │
        ▼
Continuous Update Engine (Separated Ingestion & Knowledge Status)
        │
        ▼
Evidence Drift Scanner (Whitespace-Insensitive Overlap Analysis)
   ├── Unaffected Findings ────────► Preserved (Approved)
   ├── Uncertain Findings ─────────► Flagged for Review (Needs Re-Review)
   └── Materially Drifted Claims ──► Approval Revoked (Needs Re-Review)
                                      │
                                      ▼
                             Handover De-Certified
                             (isOutdated: true)
                                      │
                                      ▼
                             Manager Re-Review in UI
                                      │
                                      ▼
                             Re-Certification & Export
```

---

## Environment Variables & Configuration

Create a `.env.local` file in the root directory for local development:

```bash
# --- Server & Networking ---
PORT=3000
NODE_ENV=development
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000

# --- Storage Engine ---
# Options: 'file' (default offline storage) or 'supabase'
STORAGE_BACKEND=file

# --- Google Gemini AI ---
# Required for live AI knowledge extraction and semantic conflict verification
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash

# --- GitHub Integration & Webhooks ---
# Optional: Personal Access Token for extended GitHub API rate limits (5,000 req/hr)
GITHUB_ACCESS_TOKEN=your_optional_github_token_here
# Secret configured in your GitHub App / Webhook settings
GITHUB_WEBHOOK_SECRET=your_webhook_hmac_secret_here

# --- Supabase (Optional for Cloud Persistence) ---
# Required only if STORAGE_BACKEND=supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```

> **Security Note**: Never commit actual secrets or API keys. `.env.local` is listed in `.gitignore`.

---

## Database & Storage Setup (Supabase & File Storage)

KnoTrail runs out of the box with zero external infrastructure using **Durable File Storage** (`STORAGE_BACKEND=file`). Data is stored locally in `.data/workspaces/`.

### Supabase Cloud Setup (Optional)
If deploying with Supabase cloud persistence:
1. Set `STORAGE_BACKEND=supabase`.
2. Apply the SQL migration located in `supabase/migrations/20261110_init_schema.sql` in the Supabase SQL Editor.
3. The migration sets up:
   - `workspaces` table with JSONB state and optimistic concurrency control (`version` check).
   - `handover_shares` table with SHA-256 hashed tokens and expiration timestamps.
   - `project_sources` private storage bucket with workspace-scoped isolation policies.
   - `save_workspace_state` atomic RPC procedure.

---

## Local Development & Testing

### Installation
```bash
npm install
```

### Running Locally
To run both the Next.js frontend and Express backend concurrently:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### Running Test Suites
KnoTrail features a comprehensive automated test suite (289 tests across 22 test files):

```bash
# Run all unit, integration, and E2E regression tests
npm test

# Run Continuous Knowledge Updates test suites
npm run test:continuous

# Run TypeScript typecheck
npx tsc --noEmit

# Run production builds
npm run backend:build
npm run frontend:build
```

---

## Production Deployment Guide

KnoTrail is architected for clean production deployment on containerized platforms (Railway, Render, Fly.io, Google Cloud Run) or VPS:

```bash
# 1. Install production dependencies
npm ci

# 2. Compile TypeScript backend
npm run backend:build

# 3. Compile Next.js frontend
npm run frontend:build

# 4. Start production server
npm start
```

### Health & Monitoring Endpoints
- **Liveness Probe**: `GET /health/live` (Returns HTTP 200 and server uptime).
- **Readiness Probe**: `GET /health/ready` (Returns HTTP 200 when storage repository is accessible; HTTP 503 if degraded).

---

## Judge Self-Service & Demo Verification

Judges can evaluate KnoTrail standalone in an **Incognito / Private Window** in under 3 minutes:

1. Open `http://localhost:3000` (or the deployed public URL).
2. Click **"Try Demo"** on the landing page — automatically initialises a clean sandbox workspace (`ws_anon_*`) with pre-seeded synthetic data.
3. **Workspace Explorer**: Inspect project overview, executive summary, and pending review counts.
4. **Source Manager**:
   - Inspect connected repositories and uploaded documents.
   - Click **"Connect GitHub Repository"** to link a public repository (e.g. `facebook/react` or `deployteam/knotrail-core`).
   - Click **"Activity"** on a repository card to view the paginated **Continuous Update History Drawer**.
5. **AI Extraction & Evidence Explorer**:
   - Inspect extracted architectural decisions, tasks, risks, and dependencies.
   - Click **"Supporting Evidence"** to inspect exact source quotes, file paths, commit hashes, and verification badges.
6. **Review Center**:
   - Filter by **"Needs Re-Review"** to inspect findings affected by evidence drift.
   - Note the amber **"Needs Re-Review"** badge and drift explanation box.
   - Test Manager controls: Edit or Approve findings with documented review notes.
7. **Handover Dossier**:
   - View the 12-section certified handover dossier.
   - Observe the prominent **Outdated Invalidation Banner** when repository updates occur.
   - Click **"Regenerate Handover"** to re-compile the certified dossier.
   - Export to **Markdown**, **JSON**, or print to **PDF**.

---

## Known Limitations & Failure Recovery

| Potential Failure Mode | System Behavior & Recovery Strategy |
|------------------------|-------------------------------------|
| **Gemini API Unavailable / Quota Exceeded** | Ingestion succeeds cleanly. Knowledge status is set to `partial` or `failed`. Update history records the exact error. Integration status is never falsely marked `synced`. Users can trigger **Retry** via UI once quota is restored. |
| **GitHub API Rate Limit (403/429)** | Catches HTTP 403/429 without server crash. Returns a clean structured error message advising the user to supply an optional `GITHUB_ACCESS_TOKEN` or wait for limit reset. |
| **Invalid Webhook Signature** | HMAC-SHA256 signature mismatch immediately returns HTTP 401 Unauthorized. Untrusted payload is discarded without touching storage. |
| **Duplicate Webhook Delivery** | `X-GitHub-Delivery` idempotency cache detects replay attacks or duplicate deliveries. Returns HTTP 200 with `status: 'duplicate'` without executing duplicate ingestion. |
| **Simultaneous Webhook Events** | Mutex serialization (`withRepositoryLock`) queues concurrent updates sequentially per repository, preventing race conditions and corrupted source state. |
| **Backend Restart During Update** | Storage layer persists `updateHistory` append-only records with atomic file writes / Supabase JSONB transactions. State is fully recovered upon backend reboot. |
| **Supabase Cloud Unavailable** | Storage factory gracefully falls back to local file-based storage or signals degraded readiness (`/health/ready`), ensuring demo evaluation is never blocked. |

---

## Submission Identity & Verification Sign-Off

- **Hackathon**: CodersInPune Hackathon 2026
- **Team**: Deploy_or_Die (Samyak Gedam & Sanshrey Sanagar)
- **Status**: Round 3 Improvements 1, 2, and 3 Fully Verified and Complete.
- **Test Pass Rate**: 289 / 289 Tests Passing (100%).
- **Verification Verdict**: `VERDICT: PASS`
