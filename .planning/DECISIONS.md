# Architectural & Product Decision Records: KnoTrail

This document tracks authoritative architectural, technical, and product decisions made for KnoTrail. Every non-trivial decision must be documented here with its context, options considered, rationale, trade-offs, and current status.

---

## ADR-001: Preservation of KnoTrail Handover Problem Statement vs Brand-Governance Email Anomaly

- **Date**: 2026-11-08 (Hackathon Round 2 Kickoff)
- **Status**: Approved / Active
- **Deciders**: Deploy_or_Die (Samyak Gedam, Sanshrey Sanagar)

### Context
The Round 2 selection email from the hackathon organizers contained a paragraph that contradicted our Round 1 proposal:
> *"Build the brand-governance product you proposed: content goes in, it is checked against the approved guidelines, terms, facts or assets, the issues are clearly explained, and a human makes the final decision."*

Our Round 1 proposal established **KnoTrail** as an intelligent knowledge-handover platform for departing team members (reconstructing project state, decisions, unfinished work, dependencies, contacts, evidence links, and human approval).

### Decision
1. We will NOT silently replace KnoTrail's problem definition.
2. We will NOT redesign the product as a brand-governance tool.
3. We record this discrepancy as an unresolved organizer question (`OQ-001` in `.planning/OPEN_QUESTIONS.md`).
4. We uphold our Round 1 approved problem statement as our authoritative product specification.
5. Team leader Samyak Gedam will submit a polite clarification request to the organizers while engineering proceeds on KnoTrail.

### Alternatives Considered
- *Pivot to brand-governance*: Discards all Round 1 architectural work, diagrams, and domain modeling. High risk of building an unvalidated product.
- *Hybrid product*: Attempting to combine brand governance with knowledge handover creates an unfocused product that satisfies neither goal.

### Consequences
- Team maintains momentum on the validated, highly differentiated knowledge-handover platform.
- Project memory maintains an explicit audit trail explaining why brand-governance references exist in organizer correspondence.

---

## ADR-002: Evidence-First Architecture (RECONSTRUCT → VERIFY → REVIEW → HANDOVER)

- **Date**: 2026-11-08
- **Status**: Approved / Core Architecture
- **Deciders**: Deploy_or_Die (Samyak Gedam, Sanshrey Sanagar)

### Context
Generic LLM summarization tools suffer from hallucinations, lack of factual grounding, and inability to trace where specific recommendations originate. For mission-critical project handovers, unverifiable claims can lead an incoming engineer to catastrophic errors or wasted effort.

### Decision
Adopt a strict 4-stage pipeline:
1. **RECONSTRUCT**: Ingest authorized sources (Git commits, PRs, docs, notes) and extract discrete candidate entities (Decisions, Tasks, Risks, Contacts, Next Actions).
2. **VERIFY**: Attach primary source coordinates (file, line range, commit SHA, message ID) to every entity. Actively detect cross-source contradictions and uncertainties. Flag unsupported entities as Missing Evidence.
3. **REVIEW**: Present extracted operational state to a human reviewer (departing member or team lead) for verification, correction, and explicit sign-off.
4. **HANDOVER**: Generate a permission-filtered, structured handover package for incoming members.

### Consequences
- Prohibits "magical" unchecked generation; ensures high factual accuracy.
- Requires building explicit citation links and contradiction detection mechanisms.

---

## ADR-003: Technology Stack Selection & Validation Strategy

- **Date**: 2026-11-08
- **Status**: Proposed / Under Validation
- **Deciders**: Deploy_or_Die (Samyak Gedam, Sanshrey Sanagar)

### Context
In Round 1, the following tech stack was proposed:
- Frontend: React / Next.js / Tailwind CSS
- Backend: FastAPI / Python
- AI: LLM API with structured output
- Storage: SQLite and ChromaDB
- Integrations: Git CLI and GitHub REST API
- Security: Role-based access control (RBAC)

### Decision
Validate this stack during Phase 1 & Phase 2 against 72-hour feasibility:
1. **Backend**: FastAPI with Pydantic v2 ensures rapid development, strict validation of LLM JSON outputs, and native async support.
2. **Frontend**: Next.js (App Router) + Tailwind CSS provides modern reactive UI components for the reviewer dashboard and incoming member explorer.
3. **Persistence**: Embedded SQLite for structured relational data and ChromaDB (or SQLite-vss) for vector similarity. Avoid external database services that add deployment fragility.
4. **LLM Integration**: Use LLM structured schema generation (JSON mode / function calling) to prevent syntax parsing failures.

### Consequences
- Zero external database hosting dependencies; entire platform can be run locally or packaged into a single container for judge evaluation.
- Architecture must be kept modular to allow mocking or fallback if external LLM APIs experience rate limits during hackathon testing.

---

## ADR-004: Two-Person Scope & Standalone Judge Evaluation Guardrails

- **Date**: 2026-11-08
- **Status**: Approved / Permanent Constraint
- **Deciders**: Deploy_or_Die (Samyak Gedam, Sanshrey Sanagar)

### Context
The team comprises strictly two members (Samyak Gedam and Sanshrey Sanagar) with a fixed 72-hour build window. Judges must be able to test the application independently without developer assistance.

### Decision
1. Strictly prioritize the core workflow over decorative, non-functional screens.
2. Bundle realistic sample project datasets (e.g., an authentic departing engineer's repository scenario) directly into the application.
3. Provide an intuitive "Load Demo Scenario" feature that allows judges to experience the full ingestion → reconstruction → review → handover cycle in under 3 minutes.
4. Enforce incognito browser testing before submission.

### Consequences
- Eliminates reliance on complex live external OAuth setups during initial judge screening.
- Keeps development focused on demonstrable, testable features.

---

## ADR-005: Dual Gravitas & GSD Engineering Governance

- **Date**: 2026-11-08
- **Status**: Approved / Operating Standard
- **Deciders**: Deploy_or_Die (Samyak Gedam, Sanshrey Sanagar)

### Context
Multi-session hackathon development with AI agents frequently suffers from context drift, hallucinated completion, and broken dependencies across restarts.

### Decision
Adopt both:
1. **GSD (Get Shit Done) v1.16.0**: For structured project memory (`PROJECT.md`, `REQUIREMENTS.md`, `ROADMAP.md`, `STATE.md`), phased planning, and milestone tracking.
2. **Gravitas Core**: For engineering reliability, enforcement of the 6 Invariants (ground before mutating, stay in scope, evidence-backed completion, no exact-retry, satisfy contract, report uncertainties), and task-contract gates.

### Consequences
- Guarantees that any future session can instantly resume with full factual awareness.
- Requires recording actual observed tool output and diagnostic evidence before marking tasks complete.

---

## ADR-006: Frictionless Public Web Architecture & Zero-Auth Demo Policy (No Login/Signup)

- **Date**: 2026-11-08
- **Status**: Approved / Core Architecture Constraint
- **Deciders**: Deploy_or_Die (Samyak Gedam, Sanshrey Sanagar)

### Context
Hackathon judges evaluate dozens of projects in limited time windows. Forcing user registration, email verification, login screens, or account creation creates high friction, causes cold-start failures, and breaks in Incognito browser testing. At the same time, a public application must not expose private organizational secrets or allow unauthorized access to private repositories.

### Decision
1. **No Login or Signup**: KnoTrail will be a 100% publicly accessible web application. No registration, signup, login, or account creation screens will exist.
2. **Mandatory Incognito Compatibility**: The complete core demonstration workflow (Ingest/Select Demo -> Reconstruct -> Verify -> Review -> Approve -> Handover) must work seamlessly in a fresh Incognito/Private browser window without an existing session.
3. **Pre-Seeded Demonstration Project**: The platform will ship with ready-to-use, synthetic/anonymized demonstration data ("Project Titan Handover") accessible in one click.
4. **Public Access Security Boundary**: Public application access does NOT grant unrestricted access to private source repositories. Secrets and tokens are kept out of frontend code. Private data integrations are cleanly separated from the public demo sandbox.
5. **Simulated Role Perspectives**: Role-based access control (RBAC) and permission-aware redaction (Reviewer vs. Incoming Member view) will be demonstrated through an interactive perspective switcher, completely avoiding the need for individual user accounts.

### Alternatives Considered
- *Mandatory OAuth (GitHub Login)*: Rejected. Introduces rate limits, third-party dependency failures, and friction for judges who do not wish to authenticate.
- *Local email/password auth*: Rejected. Adds unnecessary tables, password hashing, and session management overhead for a 72-hour build while degrading judge UX.

### Consequences
- Removes all authentication barriers; guarantees judges can evaluate the core product within 3 minutes in Incognito mode.
- Requires robust, pre-seeded sample data and careful isolation of client-side code from sensitive credentials.

---

## ADR-007: Strict Handover Integrity Gating & Approved-Only Export Policy

- **Date**: 2026-11-08
- **Status**: Approved / Implemented (Phase A)
- **Deciders**: Deploy_or_Die (Samyak Gedam, Sanshrey Sanagar)

### Context
During the functional audit of the initial handover implementation, multiple integrity issues were identified:
1. Findings marked as unreviewed or rejected could appear in handover exports if filtering was naive.
2. The "Certified & Signed Off" badge was statically rendered regardless of whether human sign-off had actually occurred.
3. Handover generation was accessible even when unresolved cross-source conflicts or unreviewed items existed in the project.
4. Dependencies were omitted from the handover dossier summaries and export files.
5. Inconsistent filtering logic between UI display, JSON exports, and Markdown exports risked data leakage.

### Decision
1. **Approved-Only Filtering**: All handover consumption channels (`HandoverView`, `generateHandoverMarkdown`, `generateHandoverJSON`) strictly consume findings via `getApprovedFindings(findings)` (`approved === true && !rejected`).
2. **Exclusion of Rejected Items**: Rejected findings are permanently purged from final handover dossiers and exported artifacts.
3. **Exclusion of Unapproved Items**: Unapproved candidate findings are excluded from the certified handover.
4. **Conditional Certification Status**: The "Certified & Signed Off" badge renders only when `project.handoverCertified === true`. Otherwise, the dossier displays "Draft / Uncertified".
5. **Human Review Gatekeeper**: Handover dossier generation is hard-blocked via `checkHandoverBlockStatus(findings, handoverCertified)` whenever unresolved conflicts count > 0 or unreviewed findings count > 0. A dedicated locked-gate screen is rendered in `HandoverView` explaining exact blocking reasons and providing a direct action to the Human Review Center.
6. **First-Class Dependencies**: Dependencies are promoted to first-class handover entities (`getHandoverDependencies`), included in category counts, the interactive dossier, and export files.
7. **Export Parity**: Markdown (`generateHandoverMarkdown`) and JSON (`generateHandoverJSON`) exports share the identical filtering pipeline, guaranteeing zero divergence between export formats and UI rendering.
8. **Sidebar Gate Awareness**: The sidebar navigation displays a lock indicator and "Locked" badge when handover prerequisites are incomplete.

### Consequences
- Strictly fulfills the core product principle: *Keep humans in control of final approval* and *Zero ungrounded claims*.
- Verifiable via automated unit tests (`src/__tests__/handoverIntegrity.test.mjs`, 8/8 tests passing).
- Cleanly isolates draft findings from certified handovers without requiring server-side state or complex authentication.

---

## ADR-008: Persistent Storage Architecture & Anonymous Workspace Isolation

- **Date**: 2026-11-08
- **Status**: Approved / Implemented (Phase B)
- **Deciders**: Deploy_or_Die (Samyak Gedam, Sanshrey Sanagar)

### Context
Prior to Phase B, application state resided entirely in ephemeral React `useState` memory, causing all user edits, uploaded notes, reviews, approvals, and certifications to vanish upon browser refresh. Furthermore:
1. Standard SQLite embedded databases fail catastrophically in serverless deployment environments (e.g., Vercel, AWS Lambda, Netlify) because the local filesystem is read-only or ephemeral (`/tmp` is recycled across invocations and cannot be shared across serverless instances).
2. The non-negotiable hackathon rule mandates **Zero Login, Zero Signup, and 100% Incognito compatibility**. An incoming evaluator or judge must never be prompted to create an account or sign in.
3. Multiple concurrent visitors must have isolated workspaces so that edits or reviews by one evaluator never bleed into another evaluator's demonstration session.

### Decision
1. **Target Relational Database: PostgreSQL**:
   - PostgreSQL is selected as the primary relational persistence target for production deployment (supporting Supabase, Neon, AWS RDS, Railway, or Vercel Postgres).
   - Authored formal relational DDL in `src/server/db/schema.sql` covering 8 tables: `workspaces`, `projects`, `stakeholders`, `project_sources`, `knowledge_findings`, `evidence_citations`, `conflict_details`, `human_review_actions`, and `handovers`.
2. **Durable File-Backed Repository with Atomic Writes for Local & Container Environments**:
   - Implemented `DurableFileRepository` in `src/server/db/storage.ts` storing workspace records at `.data/workspaces/<workspaceId>.json`.
   - Employs an atomic write pattern (write to `.tmp.<timestamp>` then `fs.rename`) to guarantee zero partial-write corruption or race condition loss.
   - Operates with an in-memory cache layer for sub-millisecond hot lookups.
   - Guarantees that local evaluations, CI test runners, and offline environments run reliably with zero external database provisioning hurdles.
3. **Anonymous Workspace Isolation**:
   - Each browser session auto-generates or retrieves a unique anonymous workspace identifier: `ws_anon_<timestamp>_<random>`.
   - On initial visit (including fresh Incognito tabs), the workspace auto-seeds a clean clone of the Project Titan Handover dataset.
   - All state mutations (approving findings, editing titles, adding sources, resolving conflicts, certifying handovers) are scoped strictly to the caller's `workspaceId`.
   - Workspace identifiers are strictly validated (`/^[a-zA-Z0-9_-]{3,64}$/`) to permanently prevent path traversal (`../`) and illegal character injection.
4. **Hybrid Client-Server Persistence Sync**:
   - Client-side `ProjectContext` maintains an immediate cache in `localStorage` (`knotrail_cache_<workspaceId>`) for instant, zero-flicker hydration upon reload.
   - Simultaneously communicates with 10 dedicated Next.js App Router API endpoints (`/api/workspaces`, `/api/sources`, `/api/findings/[id]/approve`, `/api/findings/[id]/reject`, `/api/findings/[id]/edit`, `/api/findings/[id]/resolve-conflict`, `/api/handovers/certify`, `/api/workspaces/reset`).
   - Telemetry badge in `Header.tsx` provides transparent auto-save confirmation ("Auto-saved" / "Saving...").

### Consequences
- User actions (approvals, edits, notes, conflict resolutions, certifications) permanently survive page reloads.
- Multiple visitors evaluate the platform concurrently with absolute data isolation and zero account registration friction.
- Verified by 9 new persistence tests (`src/__tests__/persistence.test.mjs`, total 18/18 passing).

---

## ADR-009: Real Document Source Ingestion & Server-Side Text Extraction Methodology

- **Date**: 2026-11-08
- **Status**: Approved / Implemented (Phase C)
- **Deciders**: Deploy_or_Die (Samyak Gedam, Sanshrey Sanagar)

### Context
Prior to Phase C, project sources were limited to preloaded synthetic streams and text-pasted notes. Real project documents (PDF runbooks, system specifications, architecture notes) could not be uploaded or parsed. Furthermore, simulated ingestion in previous prototypes erroneously hallucinated artificial decisions and tasks upon upload, violating KnoTrail's core guarantee of truthful provenance and zero ungrounded claims.

### Decision
1. **Core Supported Formats**:
   - PDF (`.pdf`): Real server-side page-by-page text extraction using `unpdf`, preserving exact 1-indexed page references (`pages: [{ pageNumber, text }]`) and detecting scanned/image-only PDFs with zero embedded text.
   - Plain Text (`.txt`): UTF-8 decoding with exact line numbers and binary byte detection.
   - Markdown (`.md`, `.markdown`): Heading and code-block preserving text extraction with line counting.
2. **Strict No-Fake-AI Policy**:
   - Ingestion is decoupled from AI entity generation. Uploading documents stores genuine extracted text, page/line metadata, and raw file buffers. It strictly does NOT synthesize speculative decisions, tasks, or risks. Genuine extracted text is preserved for Phase D AI analysis.
3. **Security & Storage Isolation**:
   - Enforce 10 MB per-file limit and maximum 5 files per upload batch.
   - Storage isolation: Raw files are stored under `.data/uploads/<workspaceId>/<sourceId>.<ext>` using sanitized unique identifiers, permanently eliminating path traversal (`../`) vulnerabilities.
   - Multi-visitor workspace isolation: Uploaded files belong exclusively to the uploading visitor's workspace.
4. **Backend API & UI Integration**:
   - `POST /api/sources/upload`: `multipart/form-data` endpoint processing batch files individually with granular success/error telemetry.
   - `GET /api/sources/[id]` & `DELETE /api/sources/[id]`: Retrieval of full extracted text and safe source removal with physical file cleanup.
   - Upgraded `SourceManagerView` with interactive drag-and-drop zone, file browser, format filtering, document inspection drawer, and deletion confirmation.

### Consequences
- Incoming engineers and evaluators can upload authentic project documentation, view genuinely extracted content, and verify exact page/line coordinates.
- Validated by 12 new automated test scenarios (`src/__tests__/sourceIngestion.test.mjs`), bringing test suite total to 30 passing tests.

---

## ADR-010: Real AI Knowledge Extraction Architecture & Evidence Grounding Engine

- **Date**: 2026-11-08
- **Status**: Approved / Implemented (Phase D)
- **Deciders**: Deploy_or_Die (Samyak Gedam, Sanshrey Sanagar)

### Context
Following Phase C's real document source ingestion, KnoTrail needed to transform authentic project documentation (PDFs, TXT, MD) into structured, evidence-grounded operational knowledge. Crucially, the system had to eliminate AI hallucinations, enforce mandatory verbatim source quotes, calculate exact coordinates (PDF page numbers, TXT/MD line numbers), integrate seamlessly with the Human Review Center without bypassing Phase A handover approval gates, and adhere strictly to the Zero Fake AI Invariant (never substituting hardcoded findings when an API key is absent).

### Decision
1. **Google GenAI SDK Integration**:
   - Integrated Google's official GenAI SDK (`@google/genai` v3.0.0) with model `gemini-2.5-flash`.
   - Structured JSON response mode with temperature 0.1 for high-fidelity factual extraction.
   - Server-side environment key validation (`GEMINI_API_KEY`). When missing or unconfigured, the server returns HTTP 428 Precondition Required with actionable configuration guidance; zero simulated or canned findings are fabricated.
2. **7 Operational Knowledge Categories**:
   - Architectural Decisions: Captures reasoning and operational impact.
   - Pending Tasks: Runbook items with assignees and urgency tags.
   - Operational Risks: System, security, or financial risks.
   - Technical Dependencies: Cloud services, libraries, and cross-team integrations.
   - Key Contacts / Responsibilities: Domain leads and transition owners.
   - Unresolved Questions: Open RFCs, unverified assumptions, and architectural ambiguities.
   - Immediate Next Actions: Actionable onboarding steps for incoming personnel.
3. **Strict Backend Evidence Grounding Engine (`grounding.ts`)**:
   - The LLM's proposed `supportingQuote` is never trusted blindly.
   - The backend independently searches the source document's extracted text:
     - Exact & normalized whitespace matching.
     - For PDFs: Scans `source.documentData.pages` to locate the exact 1-indexed `pageNumber` and line numbers.
     - For TXT/MD: Calculates line range (`Lines X-Y`) by scanning newline characters.
     - Computes SHA-256 `contentHash` of the verified snippet.
     - Verbatim matches are marked `status: 'VERIFIED'` with 90-98% confidence.
     - Hallucinated or non-matching quotes are explicitly downgraded to `status: 'UNCERTAIN'` (confidence $\le 50\%$) with validation warning notes.
     - Missing quotes are marked `status: 'MISSING'` (confidence 25%).
4. **Document Chunking & Deduplication**:
   - Documents $> 12,000$ characters are chunked into overlapping windows (1,000 character overlap) with start/end offset and line preservation.
   - Cross-chunk and cross-document deduplication uses lexical overlap (Dice coefficient $> 0.75$) to merge duplicate claims, combine citations, and retain the highest-fidelity reasoning.
5. **Human Review Center Integration**:
   - All newly generated findings default to `approved: false, rejected: false`.
   - Newly extracted items immediately populate the Human Review Center for mandatory human review and sign-off.
   - Phase A handover gates remain fully enforced: handover preview and export are blocked until all findings are reviewed and conflicts resolved.
6. **UI & Telemetry Upgrade**:
   - `AnalysisView.tsx` features an interactive document selector, real-time extraction progress telemetry, live grounding percentage calculations, category filtering across all 7 types, and Gemini API setup instructions.

### Consequences
- Incoming team members receive 100% source-traceable knowledge dossiers backed by authentic document citations.
- Evaluators can test with real documents and verify exact quotes and page coordinates.
- Validated by 16 automated test scenarios (`src/__tests__/aiExtraction.test.mjs`), bringing total passing test suite to 46 tests. Production build compiles cleanly with zero errors.

---

## ADR-011: Complete Synthetic Data Removal & UX Content Simplification

- **Date**: 2026-11-08
- **Status**: Approved / Implemented
- **Deciders**: Deploy_or_Die (Samyak Gedam, Sanshrey Sanagar)

### Context
Following the successful completion of Phase D (Real AI Knowledge Extraction & Evidence Grounding), the application contained residual synthetic and hardcoded demo artifacts from earlier development phases. These included:
1. Fictional project stakeholders (Elena Rostova, Marcus Vance, Sophia Chen, David Miller).
2. Hardcoded preloaded findings, fake Git commit hashes, fake citations, fake sprint items (Sprint 37), and fake Slack/Linear/Notion integration statuses.
3. Overly complex and speculative terminology on the Landing Page and Dashboard (e.g., "Modular Telemetry Matrix Active", "Recent Knowledge Reconstructions", "Handover Milestone Radar", "Epistemic Grounding Engine").
4. A non-negotiable hackathon and enterprise invariant required that *only information originating from actual user-provided sources or genuinely generated and validated AI results may appear as project findings*.

### Decision
1. **Complete Dummy Data Removal**:
   - Replaced `INITIAL_PROJECT_DATA` with `EMPTY_PROJECT_DATA` in `src/lib/demoData.ts`: fresh workspaces start clean with 0 findings and 0 sources.
   - Removed all hardcoded fictional personas, avatars, and names across all views, storage methods, and API routes.
   - Isolated synthetic test data strictly into test suites (`TEST_SEED_PROJECT` in `src/__tests__/persistence.test.mjs`), ensuring tests never pollute production runtime.
2. **Honest Empty States Across All Views**:
   - Implemented honest, actionable empty states across all screens:
     - Dashboard: Prompt to start handover and upload documents.
     - Workspace: Informative message when 0 findings or 0 team members exist.
     - Sources: Clear invitation to upload PDF, Markdown, or Text files.
     - Analysis: Direct guidance to select uploaded documents and run AI extraction.
     - Evidence Explorer: Honest status indicating no grounded evidence yet.
     - Review Center: Empty queue notice until documents are uploaded and extracted.
     - Handover Dossier: Locked gate explaining prerequisite review steps.
3. **Source Manager Cleanup**:
   - Divided integrations into two transparent categories:
     - Operational (Active): PDF (.pdf with page tracking), Markdown (.md with heading preservation), Plain Text (.txt with line tracking).
     - Upcoming Cloud Connectors: GitHub, Slack, Linear, Notion, Jira—honestly labeled with "Coming Soon" badges.
4. **Simple, Professional English Rewrite**:
   - Landing Page:
     - Hero heading: "Keep Your Project Knowledge Even When People Leave."
     - Hero description: "KnoTrail helps teams collect project information, find important decisions and pending work, and prepare clear handovers with links to the original sources."
     - Replaced simulated terminal streams and fake metrics with an honest 3-step workflow (1. Collect Project Information, 2. Find Important Knowledge, 3. Review and Generate Handover).
   - Dashboard:
     - Replaced complex jargon with plain terms ("Project Overview", "Recent Activity", "Important Decisions", "Pending Tasks", "Identified Risks", "Connected Sources").
     - All metric cards display genuinely computed counts from active records.
5. **Zero-Auth & Incognito Preservation**:
   - Zero login, signup, or account barrier preserved; 100% functional in private/incognito windows.

### Consequences
- Application is 100% free of fictional claims, dummy personas, fake integration statuses, and speculative terminology.
- 46/46 automated test scenarios pass cleanly with isolated fixtures.
- Next.js production build compiles with zero errors (13 API endpoints + 6 static pages).

---

## ADR-012: Complete Runtime Data Purge, Cache Migration, and Empty Workspace Architecture

- **Date**: 2026-11-08
- **Status**: Approved / Implemented
- **Deciders**: Deploy_or_Die (Samyak Gedam, Sanshrey Sanagar)

### Context
Following ADR-011, runtime user workspaces created prior to the cleanup still contained persisted JSON files holding fictional "Project Titan Handover" records, fake stakeholders (Elena Rostova, Marcus Vance, Sophia Chen, David Miller), 6 fake connected sources, and 12 synthetic findings. In addition, browser `localStorage` retained legacy cached payloads (`knotrail_cache_`), and user-facing headers and sidebars displayed "Demo Mode" and fictional profile cards.

### Decision
1. **Server Storage Sanitization & Disk Purge**:
   - Implemented automated `sanitizeProjectData` in `storage.ts` that strips all fake sources (`src-gh-01`, `src-lin-02`, `src-slk-03`, `src-not-04`, `src-pd-05`, `src-jira-06`), fictional stakeholders, and synthetic findings on read and write.
   - Reset the active visitor workspace file `.data/workspaces/ws_anon_mw7gr569_lmoh1q.json` to clean `EMPTY_PROJECT_DATA`.
   - Copied sample testing document `KnoTrail_Source_Ingestion_Test_Document.pdf` to `public/samples/` for on-demand evaluation.
2. **Client-Side Cache Migration**:
   - Bumped cache prefix from `knotrail_cache_` to `knotrail_cache_v4_` in `ProjectContext.tsx`.
   - On hydration, automatically purges all legacy `knotrail_cache_` keys and discards any payload containing fictional Titan or Elena records.
3. **Interactive Project Creation**:
   - Implemented `CreateProjectModal` accessible globally from the Header, Dashboard, and Projects views.
   - Provides fields for Project Name (required), Project Description, Domain/Category, Target Handover Date, and Handover Lead Name & Role.
   - Saves to persistent server storage via `POST /api/workspaces` and opens the workspace without authentication.
4. **Exact Empty State Copy Across All 8 Screens**:
   - **Dashboard**: Heading: "Your Project Overview", Description: "Upload your project documents to discover important decisions, pending tasks, risks and dependencies.", 0-valued metrics, buttons "Create Project" & "Upload Documents".
   - **Projects**: Heading: "No projects yet.", Description: "Create your first project to start organising and preserving project knowledge.", button "Create Project".
   - **Sources**: Heading: "No project documents uploaded yet.", Buttons: Upload PDF, Upload TXT, Upload Markdown, Add Project Notes.
   - **AI Analysis**: Heading: "No analysis available.", Description: "Upload project documents and run AI analysis to discover important project information."
   - **Evidence Explorer**: Heading: "No evidence available yet."
   - **Review Center**: Heading: "No findings awaiting review."
   - **Handover**: Heading: "No approved handover available."
5. **Header & Sidebar Modernization**:
   - Removed "Demo Mode (Zero-Auth Open Access)" badge.
   - Replaced Elena Rostova profile with neutral "Your Workspace" anonymous session indicator and quick actions (Create New Project, Reset Workspace, Back to Landing).
   - Replaced Active Sprint card with "Workspace Ready" / active project name.

### Consequences
- Active browser sessions immediately refresh to clean, honest empty states with 0 fake stakeholders, 0 fake sources, and 0 fake findings.
- Zero-auth incognito invariant strictly preserved.
- All 46 automated tests pass and production build succeeds with 0 errors.

---

## ADR-014: Phase E Targeted Corrections — Conflict Provenance, Approval Gating, and Verification Metric Dynamic Integrity

- **Date**: 2026-11-08
- **Status**: Approved / Operating Standard
- **Deciders**: Deploy_or_Die (Samyak Gedam, Sanshrey Sanagar)

### Context
Manual testing of the Phase E implementation revealed critical areas requiring alignment with project governance:
1. Two-sided conflicts occasionally only displayed a single citation in certain finding card contexts rather than preserving both quotations (e.g. Meeting Notes Page 2: completed vs. QA Report Page 3: email delivery failed and release readiness blocked).
2. Direct approval was accessible via UI/API for findings in an active conflicting state before the conflict was resolved.
3. The Evidence Inspector contained static copy ("TAMPER-PROOF EVIDENCE", hardcoded 96% verification) rather than displaying verified source hash and semantic claim grounding results.
4. UI telemetry badges across several views displayed absolute or unsupported guarantees ("Zero Fabrications", hardcoded percentages) rather than dynamically computed statistics.

### Decision
1. **Preserve Complete Two-Sided Conflict Provenance**:
   - Both `ConflictRecord` and finding `conflictDetails` must retain verbatim quotations (`quoteA` and `quoteB`) alongside file names, page numbers, line ranges, and claims.
   - Updated `EvidenceView.tsx` and `ReviewView.tsx` to render two-sided side-by-side comparison cards displaying both quotes and sources.
2. **Strict Conflict Approval Gate (Triple-Layer Enforcement)**:
   - **Storage Layer**: `DurableFileRepository.approveFinding` throws an explicit error if `targetFinding.status === 'CONFLICTING'` or if an open conflict involves the finding.
   - **API Route**: `POST /api/findings/[id]/approve` returns HTTP 400 Bad Request with an explicit error explaining that the conflict must be resolved first.
   - **UI Layer**: `ReviewView.tsx` disables the "Approve Claim" button (`Approval Locked`) with tooltip and provides a prominent "Resolve Conflict" action.
3. **Dual-Layer Provenance Inspector**:
   - Replaced "TAMPER-PROOF EVIDENCE" with a two-part evidence inspector:
     1. Source Hash & Coordinate Verification (SHA-256 Checksum validated against original source).
     2. Semantic Claim Grounding (displays actual finding status `VERIFIED | UNCERTAIN | CONFLICTING | MISSING` and dynamic confidence percentage).
4. **Dynamic Verification Statistics**:
   - Calculated all statistics (`verifiedCount`, `uncertainCount`, `conflictingCount`, `groundedPercent`, `totalCitationsCount`) dynamically from actual findings in state.
   - Replaced static "0 Fabrications" and "Zero Fabrications" copy with dynamic indicators ("{verifiedCount} of {totalFindings} Claims Verified", "Strict Evidence Grounding").
5. **Regression Verification**:
   - Added automated tests 19–23 in `src/__tests__/evidenceVerification.test.mjs`. Total suite increased to 70 tests (100% pass rate). Production build cleanly compiles.

### Consequences
- Resolves all 5 manual testing findings with executable proof.
- Direct approval of contradictory findings is strictly prevented across storage, API, and UI.
- All 70 automated tests pass and production build succeeds with 0 errors.


---

## ADR-015: Phase F — Persistent Human Approval & Review Workflow Architecture

- **Date**: 2026-11-08
- **Status**: Approved / Operating Standard
- **Deciders**: Deploy_or_Die (Samyak Gedam, Sanshrey Sanagar)

### Context
In high-stakes knowledge handovers, AI generation must never unilaterally publish decisions, tasks, or risks into certified handovers. Phase F mandates an airtight, persistent Human Approval Workflow where human reviewers retain total authority over every piece of reconstructed knowledge before it enters a certified handover dossier.

### Decision
1. **Immutable Review Audit Trail (`ReviewAuditAction`)**:
   - Every review action (`APPROVE`, `REJECT`, `EDIT`, `RESOLVE_CONFLICT`, `ADD_NOTE`) is permanently recorded in `project.reviewAuditHistory` with timestamp, reviewer identity, action type, previous status, new status, reviewer notes, and evidence references snapshot.
2. **Mandatory Rejection Reasons**:
   - Findings cannot be rejected without a documented technical reason ($\ge 1$ character). Enforced at the storage layer, API route (`HTTP 400`), and interactive Reject Modal.
3. **Automated Evidence Revalidation & Approval Reset upon Editing**:
   - Material edits to finding title or summary trigger automated lexical and semantic revalidation (`revalidateEditedFinding`) against original document texts.
   - Ungrounded edits that contradict or lack source support are automatically classified as `status: 'UNCERTAIN'`, `claimStatus: 'UNCERTAIN'`, and `reviewStatus: 'NEEDS_CORRECTION'`, resetting `approved: false`.
4. **Documented Justification Gate for Uncertain Findings**:
   - Approving an `UNCERTAIN` finding strictly requires documented reviewer justification ($\ge 5$ characters) explaining how the claim was verified. The factual status remains honestly tagged as `UNCERTAIN` rather than silently falsified.
5. **Conflict and Missing Evidence Approval Gates**:
   - Findings involved in unresolved conflicts or lacking primary source evidence (`MISSING`) cannot be directly approved (enforced across storage, API, and UI).
6. **Zero-Auth & Incognito Reviewer Identity**:
   - Reviewer identity is attributed to a neutral workspace reviewer (*e.g., "Workspace Reviewer"*) or customized by the active reviewer, preserving frictionless Incognito access without registration or login walls.
7. **Comprehensive Review Center Experience**:
   - Filter pill strip: `All`, `Pending Review`, `Approved`, `Rejected`, `Conflicting`, `Needs Correction`.
   - Badges for Review Status (`PENDING_REVIEW`, `APPROVED`, `REJECTED`, `NEEDS_CORRECTION`, `CONFLICT_REQUIRES_RESOLUTION`), Evidence Validity (`MATCHED`, `MISMATCHED`, `MISSING`), and Claim Status (`SUPPORTED`, `UNCERTAIN`, `CONFLICTING`).
   - Modals: Reject Modal (mandatory reason), Edit Modal (full fields + revalidation note), Approve Justification Modal (for uncertain claims), and Audit Trail Drawer (chronological log).
8. **Automated Verification**:
   - 16 new automated tests in `src/__tests__/humanApprovalWorkflow.test.mjs`. Total project test suite now stands at 87/87 passing tests (100% pass rate). Production build cleanly compiles with 0 errors.

### Consequences
- Human reviewers have complete, auditable governance over the knowledge handover lifecycle.
- Zero unreviewed, rejected, or conflicting findings can enter certified exports.
- Next.js production build PASS (17 API routes + 6 static pages).

---

## ADR-016: Phase G — Final Handover Generation & Delivery Architecture

- **Date**: 2026-11-09
- **Status**: Approved / Implemented (Phase G)
- **Deciders**: Deploy_or_Die (Samyak Gedam, Sanshrey Sanagar)

### Context
Phase G is the culmination of KnoTrail's core workflow (**RECONSTRUCT → VERIFY → REVIEW → HANDOVER**). The objective is to transform verified, human-approved project knowledge into a professional, structured, and multi-format downloadable handover report with high-entropy share links, version incrementing, and automatic invalidation upon data drift.

### Decision
1. **Strict Eligibility & Integrity Gating**:
   - Only findings that have `approved: true` and `reviewStatus === 'APPROVED'` enter the final handover.
   - Any finding with `rejected: true`, open conflicting claims, unreviewed status, or missing evidence is strictly excluded.
   - Findings accepted with noted uncertainty retain `status: 'UNCERTAIN'` with an explicit "Accepted with Uncertainty" badge and reviewer justification notes.
2. **Comprehensive 12-Section Handover Document Schema (`HandoverDocument`)**:
   - Section A: Cover & Project Metadata (name, code, version, audit stamp, certification hash, outgoing/incoming leads, target exit date).
   - Section B: Executive Summary (deterministic, rule-based summary generated strictly from eligible facts with zero hallucination).
   - Section C: Project Overview (purpose, scope, operational status, connected sources count).
   - Section D: Important Architectural Decisions (with uncertainty badges, reviewer justifications, and citations).
   - Section E: Pending Operational Tasks (priority badges, status, assignees, and citations).
   - Section F: Responsibilities & Ownership (team member task counts + distinct Unassigned Tasks alert).
   - Section G: Critical Risks & Mitigations (impact, severity, mitigation strategy, and citations).
   - Section H: Technical Dependencies & Integrations (category, version, impact, and citations).
   - Section I: Unresolved Questions (priority, question text, and context).
   - Section J: Prioritized Next Actions (Immediate, Short-Term, Follow-Up).
   - Section K: Evidence & Source Inventory (all approved claims mapped to exact primary source snippets, page/line numbers, and validity status).
   - Section L: Human Review & Audit Trail (metrics on approvals, rejections, resolved conflicts, and chronological review audit log).
3. **Multi-Format Export with 100% Data Parity**:
   - **Markdown Export (`exportHandoverMarkdown`)**: Complete markdown with Table of Contents, exact citations, and all 12 sections.
   - **JSON Export (`exportHandoverJson`)**: Typed JSON containing the full `HandoverDocument` schema.
   - **Printable PDF Export (`generatePrintableHtml`)**: Standalone, clean A4 `@media print` layout with page-break rules, no clipped tables, and sage-green branding.
4. **Handover Versioning & Outdated Invalidation Protocol**:
   - Each generation increments the document version (`v1.0` -> `v1.1`), saving previous snapshots in `project.handovers` history.
   - A SHA-256 snapshot hash of all findings and sources is embedded in `handover.sourceSnapshotHash`.
   - When project data mutates after certification (e.g. edited finding, added source, resolved conflict), `saveProject` detects hash mismatch and immediately flags `currentHandover.isOutdated = true` with an explanatory reason, prompting reviewer re-certification.
5. **High-Entropy Read-Only Public Share Links**:
   - High-entropy cryptographic tokens (`kt_share_<uuid>`) permit zero-auth, read-only viewing of certified handovers via `/share/[token]`.
   - Token records are stored per workspace and can be revoked on-demand, disabling external access immediately.
6. **Automated Verification**:
   - 21 new automated test scenarios in `src/__tests__/handoverGeneration.test.mjs`. Total project test suite now stands at 109/109 passing tests (100% pass rate). Production build cleanly compiles with 0 errors across 23 routes.

### Consequences
- Incoming team members and evaluators receive a complete, beautiful, and verifiable 12-section handover package.
- Full parity between on-screen view, PDF export, Markdown download, and JSON payload.
- Zero-auth, Incognito-compatible sharing without registration walls.

---

## ADR-011: Persistent Supabase PostgreSQL & Supabase Storage Integration Architecture

- **Date**: 2026-11-10
- **Status**: Approved / In Implementation (Phase H)
- **Deciders**: Deploy_or_Die (Samyak Gedam, Sanshrey Sanagar)

### Context
KnoTrail previously persisted workspaces as JSON files on the local filesystem via `DurableFileRepository` in `.data/workspaces` and raw document files in `.data/uploads`. In containerized, serverless, or cloud deployment environments (such as Vercel or cloud runtimes), local ephemeral disk writes are lost on redeployment or scale-out. A durable, cloud-native storage backend is required using Supabase PostgreSQL and Supabase Storage without breaking the existing Next.js App Router API contracts, AI extraction, evidence verification, human review gating, or handover delivery workflows.

### Decision & Architectural Specifications

1. **Canonical JSONB Workspace-State Record Model**:
   - The authoritative `StorageRepository` interface is aggregate-oriented: reading, mutating, and saving a full `ProjectData` structure containing complex nested structures (sources with documentData and pages, findings with citations and dual statuses, two-sided conflict records, chronological review audit actions, versioned 12-section handovers, and share records).
   - Attempting a partially normalized 10-table schema creates extreme fragility, synchronization hazards, and data impedance mismatch.
   - We adopt a canonical PostgreSQL table `workspaces`:
     ```sql
     CREATE TABLE IF NOT EXISTS workspaces (
         id VARCHAR(64) PRIMARY KEY,
         name VARCHAR(255) NOT NULL DEFAULT 'Anonymous Workspace',
         project_data JSONB NOT NULL,
         version INTEGER NOT NULL DEFAULT 1,
         created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
         updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
     );
     ```
   - This preserves 100% fidelity to `ProjectData` without data loss or synchronization drift across unrelated tables.

2. **Preservation of Handover Version History**:
   - The initial schema draft had `handovers.project_id UNIQUE`, which broke multi-version handover tracking. In the canonical JSONB model, `project_data.handovers` contains the full array of versioned `HandoverDocument` objects (`v1.0`, `v1.1`, etc.) along with Section A through L details, audit stamps, and snapshot hashes. `project_data.currentHandover` points to the active handover.

3. **Preservation of Conflict Records & Review Audit History**:
   - Two-sided `ConflictRecord` items (connecting Finding A/B, Source A/B, quotes, locations, temporal tags, and human resolutions) are preserved inside `project_data.conflicts`.
   - Immutable `ReviewAuditAction` items (recording `actionType`, `previousStatus`, `newStatus`, `reviewerName`, `reviewerNotes`, `timestamp`, and `evidenceReferences`) are preserved inside `project_data.reviewAuditHistory`.

4. **Private Supabase Storage for Uploaded Documents**:
   - Original document files (PDF, TXT, Markdown) are stored in a private Supabase Storage bucket named `knotrail-source-files`.
   - Storage paths are strictly workspace-scoped relative paths: `<workspaceId>/<sourceId>.<extension>` (e.g. `ws_anon_01/src-upload-123.pdf`). Absolute local paths are prohibited in production.
   - Server-side authorization checks are enforced before any storage read or delete.
   - When a source is deleted (`deleteSource`), the associated storage object in `knotrail-source-files` is removed.
   - Orphan cleanup: If storage upload succeeds but the subsequent database write fails, the uploaded object is cleaned up automatically.
   - Extracted text, page/line counts, content hashes, and page text chunks remain saved in `project_data.sources[i].documentData`.

5. **Safe Share-Token Persistence & O(1) Public Lookup**:
   - A dedicated relational table `handover_shares` stores only cryptographic SHA-256 hashes of share tokens:
     ```sql
     CREATE TABLE IF NOT EXISTS handover_shares (
         token_hash VARCHAR(64) PRIMARY KEY,
         workspace_id VARCHAR(64) NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
         handover_id VARCHAR(64) NOT NULL,
         is_active BOOLEAN NOT NULL DEFAULT TRUE,
         created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
         revoked_at TIMESTAMPTZ
     );
     ```
   - Raw tokens (`kt_share_<random>`) are NEVER stored in plaintext in database rows, JSON state, or logs.
   - Public retrieval via `/share/[token]` hashes the token with SHA-256 and performs an O(1) indexed lookup on `token_hash`. If active, it retrieves strictly the read-only handover document without leaking workspace data.
   - Revocation instantly marks `is_active = FALSE` and sets `revoked_at`. Subsequent lookups immediately fail with HTTP 403.

6. **Workspace Isolation & Capability-Based Access**:
   - Workspace IDs act as capability credentials and must be cryptographically unguessable (`crypto.randomBytes`).
   - Every operation (read, save, add source, delete source, approve, reject, edit, certify, share) strictly scopes database queries and storage keys to `workspace_id`.
   - Workspace IDs are validated against `^[a-zA-Z0-9_-]{3,64}$` to strictly prevent injection and path traversal.
   - No public endpoint exists to enumerate all workspaces.
   - There is no user login/signup (No-Auth Invariant). Public demo uses synthetic test data; judges can test seamlessly in Incognito windows.

7. **Optimistic Concurrency Control (OCC)**:
   - To prevent concurrent requests from silently overwriting each other's changes, the `workspaces` table maintains an integer `version` column.
   - Updates perform atomic conditional checks (`WHERE id = $id AND version = $expected_version`) or use a PostgreSQL stored function `save_workspace_state`.
   - Stale writes throw a `ConcurrencyConflictError` (HTTP 409) rather than clobbering concurrent edits.

8. **Dual Repository Architecture & Testing Strategy**:
   - `DurableFileRepository` is preserved completely intact for deterministic local testing and zero-credential offline development.
   - `SupabaseStorageRepository` implements the exact same `StorageRepository` interface.
   - A repository factory `getStorage()` selects the backend based on `STORAGE_BACKEND=supabase` vs `file` (default).
   - If `STORAGE_BACKEND=supabase` is configured but credentials (`SUPABASE_URL`, `SUPABASE_SECRET_KEY`) are missing, it fails fast with a clear server configuration error rather than silently writing to ephemeral disk.
   - Deterministic automated tests run using a mock Supabase client adapter with zero network dependencies; live integration tests are optional and gated by explicit environment variables.

### Consequences
- Full durability and cloud deployment readiness across Supabase PostgreSQL and Supabase Storage.
- Zero breaking changes to existing 23 API routes, 7 test suites (109 tests), and frontend user journey.
- Zero leakage of raw share tokens or server secrets.
- Deterministic CI/CD tests remain fast and offline.

---

## ADR-012: Separate Frontend (Vercel) and Standalone Node.js Backend (Render) Architecture

- **Date**: 2026-11-10
- **Status**: Approved / In Implementation (Phase I)
- **Deciders**: Deploy_or_Die (Samyak Gedam, Sanshrey Sanagar)

### Context
KnoTrail previously ran as a monolithic Next.js 14 App Router application with all 23 API endpoints residing in `src/app/api/`. In production, separating the client presentation layer (hosted on Vercel) from the long-running, CPU/IO-intensive backend API service (hosted on Render) provides superior operational isolation, independent scaling, dedicated compute resources for AI extraction and PDF parsing, and strict infrastructure-level secret isolation.

### Decision & Architectural Specifications

1. **Decoupled Deployment Architecture**:
   - **Frontend**: Next.js 14 App Router, React 18, Tailwind CSS deployed to Vercel as a pure web client.
   - **Backend**: Standalone Node.js + TypeScript + Express service located in `backend/` deployed to Render as a Web Service (Singapore region, lowest latency to Mumbai Supabase).
   - **Persistence & Cloud Storage**: Managed Supabase PostgreSQL and private Supabase Storage (`knotrail-source-files`).

2. **Framework-Independent Domain Reusability**:
   - The standalone Express backend reuses domain logic from `src/server/db/`, `src/server/ai/`, `src/server/documents/`, `src/server/verification/`, and `src/server/handover/`, along with types and utilities from `src/lib/`.
   - The backend avoids importing any Next.js runtime modules (`NextRequest`, `NextResponse`, `next/server`), App Router handlers, or browser UI components.
   - Zero duplication of core business logic.

3. **100% API Contract & Route Parity**:
   - The Express backend implements exact routes matching all 23 Next.js endpoint handlers:
     - `/api/workspaces` (GET, POST)
     - `/api/workspaces/reset` (POST)
     - `/api/projects/:id` (GET, PATCH)
     - `/api/sources` (GET, POST)
     - `/api/sources/:id` (GET, DELETE)
     - `/api/sources/upload` (POST, multipart)
     - `/api/analysis/extract` (GET, POST)
     - `/api/analysis/verify` (POST)
     - `/api/findings/:id/approve` (POST)
     - `/api/findings/:id/reject` (POST)
     - `/api/findings/:id/edit` (POST)
     - `/api/findings/:id/audit` (GET)
     - `/api/findings/:id/resolve-conflict` (POST)
     - `/api/conflicts/:id/resolve` (POST)
     - `/api/handovers` (GET)
     - `/api/handovers/generate` (POST)
     - `/api/handovers/certify` (POST)
     - `/api/handovers/export` (GET)
     - `/api/handovers/share` (POST, DELETE)
     - `/api/handovers/share/:token` (GET)
   - Status codes, query parameter handling, and JSON payload structures are preserved identically.

4. **Health Check Protocol**:
   - `GET /health/live`: Fast process liveness check returning `{ status: 'ok', uptime: number }`. Does not depend on external services; allows Render to detect container responsiveness immediately.
   - `GET /health/ready`: Deep readiness probe verifying database connectivity and configuration. Returns HTTP 200 `{ status: 'ready', ... }` if ready, or safe HTTP 503 `{ status: 'degraded', ... }` if database/dependencies are unreachable. Never leaks raw credentials or internal stack traces.

5. **Strict CORS Policy**:
   - Configured via comma-separated `CORS_ORIGINS` environment variable (e.g. `https://knotrail.vercel.app,http://localhost:3000`).
   - Supports preflight OPTIONS requests with explicit methods (`GET, POST, PATCH, DELETE, OPTIONS`) and headers (`Content-Type, Authorization, X-Workspace-ID`).
   - Disallows wildcard (`*`) origins in production. Uncredentialed (`credentials: false`) because KnoTrail uses capability workspace IDs in headers/payloads rather than session cookies.

6. **Centralized Frontend API Client (`src/lib/api-client.ts`)**:
   - The frontend routes all API calls through a centralized client that respects `NEXT_PUBLIC_API_BASE_URL`.
   - Normalizes trailing slashes and handles non-2xx errors gracefully.
   - Handles `FormData` multipart uploads seamlessly without corrupting `Content-Type` boundaries.
   - The public `/share/[token]` route fetches handover data from the backend API, decoupling Vercel from direct database access.

7. **Strict Secret Isolation**:
   - `SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `GEMINI_API_KEY` reside exclusively on Render.
   - Vercel only receives public frontend configurations (`NEXT_PUBLIC_API_BASE_URL`).

8. **Node Runtime & Build Artifacts**:
   - Target modern Node 24 LTS runtime (`engines: { node: ">=20.18.0" }`).
   - The Render backend compiles via TypeScript to a production `dist/` bundle executed with `node dist/backend/server.js`.

### Consequences
- True separation of concerns: Vercel serves static/SSR UI, while Render handles compute/API workload.
- Independent deployment cycles and fail-safe scaling.
- Preserves 100% of the zero-auth public demo journey, workspace isolation, and all 128 baseline tests.

