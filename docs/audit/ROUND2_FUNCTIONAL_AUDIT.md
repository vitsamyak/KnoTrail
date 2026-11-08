# KnoTrail: Round 2 Functional & Technical Audit Report

- **Date:** 2026-11-08
- **Auditors:** Senior Software Auditor, Full-Stack Engineer, QA Engineer & Application Security Reviewer
- **Target Version:** Commit `9a1f2bb` (Next.js 14.2.15 Full-Stack Implementation)
- **Scope:** Complete codebase, UI components, state machine, data flow, security, and build pipeline
- **Repository:** `CodersInPune`
- **Team Identity:** `Deploy_or_Die` (Samyak Gedam & Sanshrey Sanagar)

---

## 1. Executive Summary

This audit evaluates the operational state of the **KnoTrail** knowledge-handover platform following the initial implementation of the Google Stitch design system across all eight user journey screens.

### High-Level Verdict:
The application successfully delivers a **high-fidelity, production-styled frontend application** that strictly satisfies the hackathon's **Zero-Auth & Incognito** requirement, compiles cleanly with zero TypeScript errors, and faithfully implements the visual tokens, layout, and UX flows from Google Stitch.

However, behind the visual layer, **the underlying engineering intelligence, persistence, and backend infrastructure are almost entirely simulated**:
- **0% Real AI Processing:** Knowledge extraction, stream synchronization, and confidence calculations are mocked using hardcoded data and timer loops (`setTimeout`). No LLM API is integrated.
- **0% Persistent Storage:** No database (SQLite, PostgreSQL, or vector storage) exists. All state resides in ephemeral React `useState` memory and is permanently lost on page refresh.
- **0% Live External Integrations:** Connectors for GitHub, Linear, Slack, Notion, PagerDuty, and Jira are visual simulations showing static sample records.
- **Critical Logic Flaw in Handover Generation:** The Handover view and exports currently render **all** findings in the project, failing to exclude unapproved or explicitly rejected claims. Furthermore, the dossier displays a "Certified & Signed Off" seal even when the project has not undergone human certification.

The table below summarizes the technical readiness across the six Round 2 core development priorities.

| Core Development Priority | Operational Status | Technical Implementation State | Severity / Risk |
|---|---|---|---|
| **1. Actual Source Ingestion** | **PARTIAL** | Text paste modal works in React state; no file upload (`<input type="file">`), no file parsers, no live Git connection. | **HIGH** |
| **2. Real Knowledge Extraction** | **SIMULATED** | Predefined synthetic findings in `demoData.ts`; `runAiSync` is a mock timer loop; zero LLM API integration. | **CRITICAL** |
| **3. Evidence Verification** | **SIMULATED** | Citations reference non-existent repository files on disk; provenance modal displays mock SHAs and line ranges. | **HIGH** |
| **4. Working Human Approval** | **PARTIAL** | Approve, reject, edit, and conflict resolution update React state; progress meter functions; but unapproved handover lock is bypassed. | **CRITICAL** |
| **5. Handover Generation** | **PARTIAL** | Markdown/JSON export and print work; rejected/unapproved findings are mistakenly included; static certification seal. | **CRITICAL** |
| **6. Data Persistence** | **NOT IMPLEMENTED** | Zero database engines, zero backend API routes, zero `localStorage`/`sessionStorage`; state resets on refresh. | **CRITICAL** |

---

## 2. Existing Technology Architecture

### Current Architectural Map

```
┌────────────────────────────────────────────────────────────────────────┐
│                        BROWSER RUNTIME (Client)                         │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │               App Router: src/app/page.tsx                     │   │
│   │          MainRouter (Switches activeView in AppShell)          │   │
│   └───────────────────────────────┬────────────────────────────────┘   │
│                                   │                                    │
│   ┌───────────────────────────────▼────────────────────────────────┐   │
│   │           ProjectContext (src/context/ProjectContext.tsx)       │   │
│   │    - Holds ProjectData in React.useState(INITIAL_PROJECT_DATA) │   │
│   │    - In-Memory Mutations: addSource, approve, reject, edit     │   │
│   │    - Ephemeral: Resets to demoData.ts on browser reload        │   │
│   └───────────────────────────────┬────────────────────────────────┘   │
│                                   │                                    │
│       ┌───────────────────────────┴───────────────────────────┐        │
│       ▼                                                       ▼        │
│  [Layout Components]                                    [View Screens] │
│  - AppShell.tsx                                         1. LandingView │
│  - Header.tsx                                           2. Dashboard   │
│  - Sidebar.tsx                                          3. Workspace   │
│                                                         4. SourceMgr   │
│                                                         5. Analysis    │
│                                                         6. Evidence    │
│                                                         7. Review      │
│                                                         8. Handover    │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                        [NO BACKEND / NO DATABASE]
                                    │
                                    ▼
                          (Void / Not Implemented)
```

### Technical Inventory
1. **Framework:** Next.js 14.2.15 (React 18.3.1, TypeScript 5.4.5, Tailwind CSS 3.4.4).
2. **Backend API Endpoints:** **0** (the directory `src/app/api` does not exist).
3. **Database Layer:** **None**. No SQLite, PostgreSQL, Prisma, Drizzle, or ORM installed.
4. **AI/LLM SDKs:** **None**. Zero dependencies on `@google/genai`, `openai`, `@anthropic-ai/sdk`, or LangChain.
5. **Client Storage:** **None**. Zero use of `localStorage`, `sessionStorage`, or `IndexedDB`.
6. **Build Target:** Static pre-rendering (`○ (Static) prerendered as static content`).

---

## 3. Eight-Screen UI Audit

### Screen 1: Landing Page (`src/components/views/LandingView.tsx`)
- **Status:** **PASS**
- **Severity:** **LOW**
- **Inspection Findings:**
  - Hero banner with official tagline *"Never Lose the Knowledge Behind Your Projects."* renders cleanly.
  - "Explore Demo" CTA button (`id="cta-explore"`) dispatches `setActiveView('dashboard')` immediately.
  - "How It Works" smoothly scrolls to the 4-stage pipeline anchor (`#how-it-works`).
  - Code inspection mockup (`session-log_handover_v2.kt`) is static/declarative HTML, matching Google Stitch designs.
  - Reassurance pill correctly advertises frictionless access with zero auth.

### Screen 2: Main Dashboard (`src/components/views/DashboardView.tsx`)
- **Status:** **PARTIAL**
- **Severity:** **MEDIUM**
- **Inspection Findings:**
  - Active sprint greeting banner (`Hello, Elena!`) correctly reflects `project.lead.name`.
  - Top 4 KPI metric cards:
    - Primary numbers (`stats.totalSources`, `stats.decisionsCount`, `stats.tasksCount`, `stats.certificationProgressPercent`) are derived dynamically from `ProjectContext`.
    - Secondary labels (`+2 this wk`, `98% Grounded`, `Owner: Marcus Vance`, `1 Conflict to Resolve`) are **hardcoded static strings**.
    - Sparklines are hardcoded static SVG paths, not dynamic charts.
  - Telemetry matrix card statically shows `Stream Density: 99.4%` and `Auto-Sync On`.
  - Sprint Radar Milestone card renders Sprint 37 details in inverted deep sage styling.
  - Activity Feed correctly maps `project.findings.slice(0, 4)` and provides functional navigation to Evidence Explorer.
  - Quick action matrix buttons correctly route to Workspace, Sources, Review, and Handover views.

### Screen 3: Project Workspace (`src/components/views/WorkspaceView.tsx`)
- **Status:** **PASS**
- **Severity:** **LOW**
- **Inspection Findings:**
  - Master project header displays project metadata, code (`TITAN-LEDGER`), version (`v3.4-ledger`), and exit date (`July 15, 2025`).
  - Stakeholder transition pod dynamically maps all four stakeholders (`Elena Rostova`, `Marcus Vance`, `Sophia Chen`, `David Miller`) with badges.
  - Tabbed category filter (`All`, `Decisions`, `Tasks`, `Risks`, `Dependencies`) filters findings in state.
  - Workspace text filter input works in real-time.
  - Action buttons (`View Citations`, `Review`) set `selectedFinding` and transition to the target screens.

### Screen 4: Source Manager (`src/components/views/SourceManagerView.tsx`)
- **Status:** **PARTIAL**
- **Severity:** **HIGH**
- **Inspection Findings:**
  - 6 pipeline cards are displayed (GitHub, Linear, Slack, Notion, PagerDuty, Jira).
  - Every card displays a pulsing green dot and `connected` status, which is **factually misleading** since no live API credentials or webhooks exist.
  - "Add Source or Ingest Notes" button opens a modal form allowing text input.
  - Submitting the form calls `addSource()` in `ProjectContext.tsx`, which injects a new source object into React state.
  - **Missing:** No `<input type="file">` element exists. Users cannot drag-and-drop or upload actual files (`.pdf`, `.md`, `.json`, `.docx`).
  - "Re-sync" button calls `runAiSync()`, which triggers an artificial 3-second delay.

### Screen 5: AI Analysis (`src/components/views/AnalysisView.tsx`)
- **Status:** **SIMULATED**
- **Severity:** **HIGH**
- **Inspection Findings:**
  - Telemetry cards show evidence grounding percentages and conflict counts.
  - Filter tabs (`All`, `Decisions`, `Tasks`, `Risks`) filter the displayed analysis cards.
  - Findings display architectural reasoning and operational impact blocks.
  - "Re-run Analysis" button executes `runAiSync()`: an artificial progress bar (0% $\to$ 100%) that updates the timestamp to "Just now", but **does not make any network requests or invoke an AI model**.

### Screen 6: Evidence Explorer (`src/components/views/EvidenceView.tsx`)
- **Status:** **PARTIAL**
- **Severity:** **MEDIUM**
- **Inspection Findings:**
  - Status filter pill strip (`ALL`, `VERIFIED`, `UNCERTAIN`, `CONFLICTING`, `MISSING`) dynamically filters findings based on `f.status`.
  - Search bar filters across claims, filenames, authors, and commit SHAs.
  - Copy snippet button successfully copies the code snippet to the system clipboard using `navigator.clipboard.writeText`.
  - "Inspect Provenance" opens a detailed modal displaying author, timestamp, content hash, clearance tier, and full snippet.
  - **Limitation:** All citations reference synthetic mock files (`src/auth/jwt_authority.rs`, `migrations/20250602_freeze_guard.sql`) that do not exist in the filesystem.

### Screen 7: Human Review Center (`src/components/views/ReviewView.tsx`)
- **Status:** **PARTIAL**
- **Severity:** **CRITICAL**
- **Inspection Findings:**
  - Strict Human Oversight Mandate banner correctly displays Protocol 4.1.
  - Live approval progress meter dynamically computes `Math.round(approvedCount / totalFindings * 100)`.
  - "Approve Claim" updates `approved: true` in React state.
  - "Reject Claim" updates `rejected: true` and `approved: false` in React state.
  - "Edit Context" opens a modal, allowing modification of `title` and `summary`.
  - "Resolve Conflict" modal offers Option A (RFC-042) vs Option B (Helm values). Submitting updates resolution text, changes status to `VERIFIED`, sets confidence to 98%, and marks the finding as approved.
  - "Certify & Approve Handover" button is disabled if `f.status === 'CONFLICTING'`, but opens confirmation modal and mints a pseudo-random SHA-256 hash when confirmed.
  - **Critical Flaw:** The handover review gate is not enforced at the application navigation level; users can navigate directly to the final handover dossier via the sidebar without completing certification.

### Screen 8: Handover Page (`src/components/views/HandoverView.tsx`)
- **Status:** **PARTIAL**
- **Severity:** **CRITICAL**
- **Inspection Findings:**
  - Dossier header presents metadata: Audit Stamp (`#KT-9921-TITAN-CERT`), Outgoing Lead, Incoming Lead, and Effective Date.
  - **Critical Flaw 1:** The badge statically renders `Certified & Signed Off` in JSX (line 159), regardless of whether `project.handoverCertified` is `true` or `false`.
  - **Critical Flaw 2:** The decisions, tasks, and risks sections render **all** findings of that type, failing to check `if (f.approved)` and failing to exclude rejected findings (`f.rejected`).
  - **Export Markdown:** **PASS**. Generates and downloads a well-formatted `.md` file using `Blob` and object URL.
  - **Export JSON:** **PASS**. Generates and downloads structured JSON representing the project state.
  - **Print View:** **PASS**. Invokes `window.print()` with dedicated `@media print` CSS rules hiding navigation and header bars.
  - **Share Link:** **PARTIAL**. Copies the URL with hash (`#handover`) to the clipboard, but does not transmit state across devices or sessions.

---

## 4. Source Ingestion Audit

| Ingestion Capability | Technical Reality | Classification | Severity |
|---|---|---|---|
| **Document File Upload** | No `<input type="file">` exists anywhere in `src/`. No drag-and-drop handler. | **NOT IMPLEMENTED** | **HIGH** |
| **File Content Parsing** | No parsers for PDF, Markdown AST, DOCX, or CSV are installed or implemented. | **NOT IMPLEMENTED** | **HIGH** |
| **Manual Notes Ingestion** | `<textarea>` in `SourceManagerView.tsx` accepts pasted text. `addSource()` creates a source and finding in React state. | **PASS** | **LOW** |
| **GitHub Integration** | `titan-core-ledger` is a hardcoded entry in `demoData.ts`. No Git CLI, Octokit, or OAuth integration exists. | **SIMULATED** | **HIGH** |
| **Linear Integration** | Static entry in `demoData.ts` (342 issues). No webhook or API connection. | **SIMULATED** | **MEDIUM** |
| **Slack Integration** | Static entry in `demoData.ts` (18,420 messages). No bot token or socket connection. | **SIMULATED** | **MEDIUM** |
| **Notion Integration** | Static entry in `demoData.ts` (86 docs). No integration with Notion API. | **SIMULATED** | **MEDIUM** |
| **Jira / PagerDuty** | Static entries in `demoData.ts`. No webhook or API connection. | **SIMULATED** | **MEDIUM** |
| **Usable Record Generation** | Ingested notes are sliced with `content.slice(0, 240)` to generate a mock finding. | **PARTIAL** | **HIGH** |
| **Unsupported File Validation** | File upload is absent; no file extension or MIME type checks exist. | **NOT IMPLEMENTED** | **LOW** |

---

## 5. AI Knowledge Extraction Audit

| Extraction Dimension | Observed Implementation | Classification | Severity |
|---|---|---|---|
| **Live LLM API Integration** | Zero SDKs, zero API keys, zero outbound fetch calls to AI providers in `src/`. | **NOT IMPLEMENTED** | **CRITICAL** |
| **API Request Execution** | `runAiSync` executes `setTimeout` delays (600ms, 700ms, 600ms, 500ms) with hardcoded status strings. | **SIMULATED** | **CRITICAL** |
| **Dynamic Content Extraction** | When text notes are submitted, the system performs a raw substring slice (`content.slice(0, 240)`), without entity extraction or NLP. | **NOT IMPLEMENTED** | **CRITICAL** |
| **Decisions & Rationale** | All 6 decisions in `demoData.ts` (D-01 to D-06) are static strings written ahead of time. | **SIMULATED** | **CRITICAL** |
| **Tasks & Owners** | All 3 tasks (T-01 to T-03) are static strings with pre-assigned owners. | **SIMULATED** | **HIGH** |
| **Risks & Failure Modes** | Both risks (R-01, R-02) are static strings from `demoData.ts`. | **SIMULATED** | **HIGH** |
| **Dependencies Extraction** | Static dependency entry (DEP-01) for Federal Settlement Core API. | **SIMULATED** | **MEDIUM** |
| **Deterministic Fallback** | The entire system is hardcoded demo data; no AI-to-deterministic fallback tier exists because there is no AI tier. | **NOT IMPLEMENTED** | **MEDIUM** |

---

## 6. Evidence Verification Audit

| Evidence Verification Item | Code Evidence & Technical Reality | Classification | Severity |
|---|---|---|---|
| **Source Citation Grounding** | Citations array contains `file`, `lineRange`, `commitSha`, `author`, `snippet`, `contentHash`, `clearanceTier`. | **PASS (Model Schema)** | **LOW** |
| **Physical File Verification** | Paths like `src/auth/jwt_authority.rs` and `config/kafka-consumer.properties` **do not exist on disk**. | **SIMULATED** | **HIGH** |
| **Commit SHA Validity** | SHAs (`9f12ab7`, `4c72ef1`, `4a88f12`) are synthetic strings, not linked to git objects. | **SIMULATED** | **HIGH** |
| **Evidence Inspection Drawer** | `setActiveInspectorCitation(citation)` displays full snippet, content hash, and author metadata cleanly. | **PASS** | **LOW** |
| **Status Classification** | `VERIFIED`, `UNCERTAIN`, `CONFLICTING`, `MISSING` are manually declared in `demoData.ts`, not calculated algorithmically. | **SIMULATED** | **HIGH** |
| **Ungrounded Fact Filtering** | `HandoverView.tsx` does not filter out unverified or missing claims; all findings pass into the dossier. | **FAIL** | **CRITICAL** |

---

## 7. Human Approval Audit

| Approval Feature | Code Implementation & Behavior | Classification | Severity |
|---|---|---|---|
| **Approve Functionality** | `approveFinding(id)` sets `f.approved = true` and updates reviewer notes in React state. | **PASS** | **LOW** |
| **Reject Functionality** | `rejectFinding(id)` sets `f.approved = false`, `f.rejected = true` in React state. | **PASS** | **LOW** |
| **Edit Functionality** | `editFinding(id, updates)` updates finding title and summary in React state. | **PASS** | **LOW** |
| **Conflict Resolution** | `resolveConflict()` sets resolution text, transitions status to `VERIFIED`, and marks finding approved. | **PASS** | **LOW** |
| **Progress Calculation** | `stats.certificationProgressPercent` accurately recalculates `approvedCount / totalFindings * 100`. | **PASS** | **LOW** |
| **Certification Locking** | `certifyHandover()` mints a SHA-256 hash and records signer credentials in React state. | **PASS** | **LOW** |
| **Unapproved Handover Gating** | User can click "Handovers" in the sidebar at any time and view/export the dossier before approval. | **FAIL** | **CRITICAL** |

---

## 8. Handover Generation Audit

| Handover Functionality | Code Implementation & Behavior | Classification | Severity |
|---|---|---|---|
| **Approved Findings Filter** | `HandoverView.tsx` (lines 27, 44, 59, 264, 319) filters only by `type`, ignoring `f.approved`. | **FAIL** | **CRITICAL** |
| **Rejection Exclusion** | Rejected findings (`f.rejected === true`) are **not excluded** and appear in the dossier. | **FAIL** | **CRITICAL** |
| **Decisions Inclusion** | Decisions are formatted with reasoning, impact, and owner. | **PASS** | **LOW** |
| **Tasks Inclusion** | Tasks are formatted with urgency and owner. | **PASS** | **LOW** |
| **Risks Inclusion** | Risks are formatted with assessment and mitigation status. | **PASS** | **LOW** |
| **Dependencies Inclusion** | Finding type `dependency` is **omitted** from `HandoverView.tsx` rendering and Markdown export. | **PARTIAL** | **MEDIUM** |
| **Evidence Citations Preserved** | File paths, line ranges, and SHAs are included in the generated Markdown and JSON. | **PASS** | **LOW** |
| **Markdown Export** | `handleExportMarkdown` triggers a client-side Blob download of `KnoTrail-Handover-TITAN-LEDGER.md`. | **PASS** | **LOW** |
| **JSON Export** | `handleExportJSON` triggers a client-side Blob download of structured JSON. | **PASS** | **LOW** |
| **Print / PDF Generation** | `window.print()` triggers browser print dialog; `@media print` CSS formats the document cleanly. | **PASS** | **LOW** |
| **Share Link Functionality** | `navigator.clipboard.writeText(window.location.href)` copies current URL; does not share modified state. | **PARTIAL** | **HIGH** |

---

## 9. Data Persistence Audit

| Persistence Vector | Inspection Result | Classification | Severity |
|---|---|---|---|
| **Backend Database** | Zero database engines configured. No SQLite, Postgres, or MongoDB files or connections exist. | **NOT IMPLEMENTED** | **CRITICAL** |
| **Backend API Storage** | No endpoints exist in `src/app/api/` to receive or store project state. | **NOT IMPLEMENTED** | **CRITICAL** |
| **React State Holding** | 100% of data is stored in memory via `useState(INITIAL_PROJECT_DATA)` in `ProjectContext.tsx`. | **PASS (In-Memory)** | **CRITICAL (Arch)** |
| **Browser Storage** | `grep -rnwi "localStorage\|sessionStorage\|indexedDB" src/` returned **0 results**. | **NOT IMPLEMENTED** | **CRITICAL** |
| **Page Refresh Survival** | Hitting browser reload ($\text{Ctrl+R}$ / $\text{Cmd+R}$) completely resets all changes to default demo data. | **FAIL** | **CRITICAL** |
| **Cross-Session Sharing** | Opening the copied share link in a new window loads only the default demo data; custom edits are lost. | **FAIL** | **HIGH** |
| **Multi-User Isolation** | State is isolated to the single active browser tab memory; cannot be viewed by other team members. | **PASS (By default)** | **MEDIUM** |

---

## 10. Security Audit

| Security Domain | Inspection Finding | Verdict |
|---|---|---|
| **API Key Exposure** | Grep audit across `src/` revealed 0 exposed private keys, bearer tokens, or API credentials. | **PASS** |
| **Client-Side Secrets** | No environment variables containing secrets are embedded in client bundles. | **PASS** |
| **File Upload Vulnerabilities** | Since `<input type="file">` is absent, file-based remote code execution or path traversal is not possible. | **PASS** |
| **Public Data Protection** | All pre-seeded data in `demoData.ts` uses synthetic names (`Project Titan`, `Elena Rostova`, `Marcus Vance`). | **PASS** |
| **Unprotected API Endpoints** | There are 0 API endpoints, so no public API route is left unauthenticated or unthrottled. | **PASS** |
| **Clearance Redaction** | `clearanceTier: 'CONFIDENTIAL'` exists as a metadata field, but is not enforced by an active access-control filter. | **PARTIAL** |

---

## 11. Incognito Compatibility Audit

| Requirement | Test Verification | Verdict |
|---|---|---|
| **Zero Login / Signup** | Verified: No login screens, registration forms, or auth redirects exist in the application. | **PASS** |
| **Incognito Standalone Evaluation** | Application opened in fresh incognito session via `http://localhost:3000/` without cookies or local storage. | **PASS** |
| **Instant Demo Scenario** | Landing page "Explore Demo" CTA routes directly to Project Titan Handover in 1 click. | **PASS** |
| **3-Minute Evaluation Workflow** | Complete cycle (Landing $\to$ Workspace $\to$ Sources $\to$ Analysis $\to$ Evidence $\to$ Review $\to$ Handover) testable standalone. | **PASS** |

---

## 12. Build and Code Quality Audit

| Tool / Check | Command Executed | Result | Status |
|---|---|---|---|
| **TypeScript Compilation** | `npx tsc --noEmit` | Exit code 0, 0 type errors | **PASS** |
| **Production Build** | `npm run build` | `✓ Compiled successfully`, static routes `/` (29 kB) and `/_not-found` (875 B) generated | **PASS** |
| **GSD Consistency Validator** | `npx -y --package=@opengsd/gsd-core@latest -- gsd-tools validate consistency` | `passed: true`, 0 errors, 0 warnings | **PASS** |
| **GSD State Validator** | `npx -y --package=@opengsd/gsd-core@latest -- gsd-tools state validate` | `valid: true`, scope: "complete" | **PASS** |
| **ESLint Static Analysis** | `npm run lint` | Prompted for initial config; `.eslintrc.json` is missing from root | **PARTIAL** |
| **Component Architecture** | Inspect directory structure | Clean modular breakdown (`src/components/layout`, `src/components/views`, `src/context`, `src/lib`) | **PASS** |

---

## 13. Critical Findings

### Finding 1: Unfiltered Handover Publishing (Severity: CRITICAL)
- **Location:** `src/components/views/HandoverView.tsx` (lines 26-68, 264-325).
- **Issue:** The Handover view renders all findings matching the category (`f.type === 'decision'`), completely disregarding `f.approved` and `f.rejected`.
- **Impact:** Rejected findings and unapproved claims appear directly inside the final certified dossier and exported files, violating the core value of human approval.

### Finding 2: Total Absence of Data Persistence (Severity: CRITICAL)
- **Location:** `src/context/ProjectContext.tsx` (lines 75-80).
- **Issue:** State is initialized from `INITIAL_PROJECT_DATA` via `useState`. There is no SQLite, no backend API, and not even `localStorage` persistence.
- **Impact:** Any work done by a user (adding notes, editing findings, resolving conflicts, certifying handovers) is permanently lost if the browser tab is refreshed or closed.

### Finding 3: Premature Certification Badge (Severity: HIGH)
- **Location:** `src/components/views/HandoverView.tsx` (lines 159-162).
- **Issue:** The UI displays `Certified & Signed Off` statically in the JSX, regardless of whether `project.handoverCertified` is true.
- **Impact:** Misleads evaluators into believing a handover has been formally signed off before the user has executed the review process.

### Finding 4: Simulated AI Analysis & Stream Sync (Severity: CRITICAL)
- **Location:** `src/context/ProjectContext.tsx` (lines 115-142).
- **Issue:** `runAiSync()` executes chained `setTimeout` promises that update progress percentages and status messages. No LLM API is called, and no text is parsed.
- **Impact:** The core AI claim of the product ("AI Project Analysis Engine") is purely visual theater.

### Finding 5: Simulated Connectors Without File Upload (Severity: HIGH)
- **Location:** `src/components/views/SourceManagerView.tsx`.
- **Issue:** The six connector cards display "connected" with green pulses despite having no backend connections. Furthermore, there is no file upload input (`<input type="file">`) to allow users to upload actual project documents or Markdown folders.
- **Impact:** Users are restricted to pasting text into a form; genuine documents cannot be ingested.

---

## 14. Missing Functionality

1. **Backend Layer:** No server runtime (FastAPI or Next.js Route Handlers) to handle data processing, persistence, or API secret storage.
2. **Database Engine:** No relational database (SQLite/PostgreSQL) to store projects, sources, findings, and immutable audit logs.
3. **Real LLM Integration:** No prompt pipeline or structured JSON generation using Gemini, Claude, or OpenAI.
4. **Document Ingestion Parser:** No file upload component or text extraction library to parse `.pdf`, `.md`, or `.txt` files.
5. **Git Repository Parser:** No parser to read local git commit logs, diffs, or author attribution.
6. **Approval Gating:** No route guard or state lock preventing access to the Handover page when `handoverCertified === false`.
7. **Role-Based Clearance Redaction:** No filtering mechanism that strips `clearanceTier: 'CONFIDENTIAL'` citations when viewed by an incoming or unauthenticated role.
8. **Cross-Session Link Sharing:** No persistent storage mechanism enabling a shared URL to load the specific state generated by another user.

---

## 15. Recommended Development Priorities

Based on the 72-hour hackathon window and the strict two-person team constraint, the recommended sequence of development is:

### Priority 1: Handover Logic Fix & Human Approval Gating (Estimated Effort: 1 Hour)
- Fix `HandoverView.tsx` to strictly filter by `f.approved === true && !f.rejected`.
- Make the `Certified & Signed Off` badge conditional on `project.handoverCertified`.
- Add a gate preventing navigation to Handover if blocking conflicts remain unresolved.
- Include `f.type === 'dependency'` in the Handover dossier and export logic.

### Priority 2: Data Persistence Layer (Estimated Effort: 2-3 Hours)
- Implement lightweight persistence so user actions survive page reload.
- Add Next.js API Route Handlers (`src/app/api/project/route.ts`) backed by embedded SQLite or a persistent `localStorage` / `IndexedDB` sync engine for zero-auth client-side operation.

### Priority 3: Actual Document Upload & Parsing (Estimated Effort: 3-4 Hours)
- Add `<input type="file" accept=".md,.txt,.json,.pdf">` and drag-and-drop file upload to `SourceManagerView.tsx`.
- Implement client-side or server-side text extraction so uploaded Markdown, text, and PDF files are read into actual string buffers.

### Priority 4: Real Knowledge Extraction via LLM Pipeline (Estimated Effort: 4-5 Hours)
- Integrate Google Gemini API (or OpenAI API) using structured JSON output schema (Pydantic / Zod).
- Send the actual uploaded text to the LLM with prompts designed to extract:
  - Decisions + reasoning + impact
  - Tasks + owners + urgency
  - Risks + severity
  - Dependencies
  - Unresolved questions
- Replace the `setTimeout` simulation in `runAiSync` with real API execution.

### Priority 5: Real Evidence Grounding & Verification (Estimated Effort: 3 Hours)
- Compute actual character offsets and line numbers from ingested documents.
- Attach authentic source snippets with real SHA-256 hashes generated from the file contents.
- Implement a basic heuristic conflict detector comparing date-stamped claims across sources.

### Priority 6: Clearance-Tier Redaction & Shareable State (Estimated Effort: 2 Hours)
- Add a simulated Role Switcher (e.g. *Elena Rostova - Full Access* vs *Marcus Vance - Internal Only* vs *Public Auditor - Redacted*).
- Redact `clearanceTier: 'CONFIDENTIAL'` snippets when viewed in lower-clearance perspectives.
- Serialize approved handover dossiers into shareable URLs or persistent project IDs.

