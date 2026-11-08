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





