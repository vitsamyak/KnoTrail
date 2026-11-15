# Roadmap: KnoTrail

## Overview

KnoTrail is engineered across three major hackathon milestones:
1. **Round 1 (Planning & Proposal)**: Conceptual proposal, evidence-linked handover architecture, editable Draw.io diagrams, and Round 2 qualification. [COMPLETED]
2. **Round 2 (The Build — Current Milestone)**: 72-hour engineering sprint (8 Nov 2026 10:00 AM IST to 11 Nov 2026 10:00 AM IST) delivering an end-to-end, functional, permission-aware knowledge handover application testable standalone by hackathon judges. [ACTIVE]
3. **Round 3 (Refinement & Final Delivery)**: Multi-workspace synchronization, live collaborative annotations, and real-time enterprise connectors (Slack, Jira, Linear). [ACTIVE]
   - **Phase 1: GitHub Integration (Milestones 1.1 - 1.4)** [COMPLETED]
   - **Improvement 2: Role-Based Security Hardening** [COMPLETED]
   - **Improvement 3: Continuous Knowledge Updates** [PLANNED - AWAITING APPROVAL]

## Phases

- [x] **Phase 1: Core Domain Models, Provenance Schema & Storage Foundation** - Define data schemas for knowledge nodes, evidence links, RBAC permissions, and persistent PostgreSQL/durable storage with anonymous workspace isolation. [COMPLETED - Phase B]
- [ ] **Phase 2: Multi-Source Ingestion & Extraction Pipeline** - Build parsers for Git history, Markdown documentation, task items, and technical decision records.
- [ ] **Phase 3: Evidence Grounding, Conflict & Uncertainty Engine** - Implement cross-source verification, contradiction detection, and citation linking.
- [x] **Phase 4: Human Review, Correction & Handover Approval Workflow** - Construct the reviewer dashboard for inspecting, editing, and officially approving handovers. [COMPLETED - Phase A Hardening]
- [x] **Phase 5: Handover Viewer, Incoming Member Explorer & Permission Filtering** - Create the interactive handover explorer with role-based redaction and export. [COMPLETED - Phase A Hardening]
- [ ] **Phase 6: End-to-End System Integration, Verification & Standalone Judge Packaging** - Wire all components into a seamless, self-contained deployment with demo sample data and full verification.

## Phase Details

### Phase A: Critical Handover Integrity & Human Review Gating
**Goal**: Enforce strict data filtering and human review gating so that unapproved or rejected findings never leak into certified handovers or exports, and handover dossiers cannot be generated with unresolved conflicts.
**Requirements**: REV-01, REV-03, HAND-01, HAND-02, HAND-03
**Status**: COMPLETED (8/8 tests passing, Next.js production build passing)

### Phase B: Persistent Data Storage & Multi-Workspace Isolation Foundation
**Goal**: Implement reliable persistence layer using `DurableFileRepository` with atomic writes, Next.js REST API endpoints, and anonymous workspace isolation (`ws_anon_*`) ensuring zero login/signup barriers.
**Status**: COMPLETED (9/9 tests passing, total 17/17 passing)

### Phase C: Real Document Source Ingestion & Text Extraction
**Goal**: Ingest authentic project documents (PDF, TXT, Markdown), extract page-by-page and line-by-line text, store raw files safely, and preserve original source context with zero simulated AI entity extraction.
**Status**: COMPLETED (13/13 tests passing, total 30/30 passing)

### Phase D: Real AI Knowledge Extraction & Evidence Grounding
**Goal**: Transform authentic uploaded project documents into structured, evidence-backed operational knowledge using Google GenAI SDK (`@google/genai` v3.0.0, Gemini 2.5 Flash), enforce strict verbatim quote grounding, compute exact PDF page and TXT/MD line coordinates, categorize across all 7 operational types, integrate with Human Review Center under Phase A gates, and enforce Zero Fake AI Invariant.
**Status**: COMPLETED (16/16 tests passing, total 46/46 passing, Next.js build passing)

### Phase E: Advanced Evidence Verification & Conflict Detection
**Goal**: Implement dual-status taxonomy (Evidence Validity & Claim Verification), cross-document contradiction detection, two-sided citation provenance, temporal supersession, and strict conflict approval gating.
**Status**: COMPLETED (23/23 tests passing, total 70/70 passing)

### Phase F: Persistent Human Approval & Review Workflow
**Goal**: Enforce mandatory human governance before certified handover generation: immutable audit trail (`ReviewAuditAction`), mandatory rejection reasons, edit revalidation with approval reset, justification gate for UNCERTAIN findings, and conflict approval gates.
**Status**: COMPLETED (16/16 tests passing, total 87/87 passing)

### Phase G: Final Handover Generation & Delivery
**Goal**: Compile verified and human-approved project findings into a formal 12-section HandoverDocument schema (Sections A through L), deterministic rule-based executive summary, multi-format export (Markdown with TOC, typed JSON with 100% parity, printable A4 PDF), versioning (`v1.0` -> `v1.1`), outdated invalidation upon post-certification drift, and zero-auth high-entropy public share links (`/share/[token]`) with on-demand revocation.
**Status**: COMPLETED (22/22 tests passing, total 109/109 passing across 7 test suites, Next.js build passing)

### Phase H: Supabase Backend & Cloud Storage Integration
**Goal**: Implement cloud-native persistent Supabase PostgreSQL storage and private Supabase Storage (`knotrail-source-files`), with canonical JSONB aggregate state, optimistic concurrency control, hashed share tokens, full `StorageRepository` parity, fail-fast configuration checks, zero client secret leaks, and deterministic test adapters without breaking existing API routes or zero-auth public demo access.
**Requirements**: SUPA-01, SUPA-02, SUPA-03, SUPA-04, SUPA-05, SUPA-06, SUPA-07, SUPA-08
**Status**: COMPLETED (18/18 tests passing, total 128/128 passing across 8 test suites, Next.js build passing)

### Phase I: Separate Backend on Render and Frontend on Vercel
**Goal**: Decouple the monolithic Next.js architecture into a standalone Node.js Express backend (`backend/`) deployable to Render and a pure web frontend deployable to Vercel, with 100% route contract parity across all 23 endpoints, strict CORS, health liveness/readiness probes, centralized frontend API client (`src/lib/api-client.ts`), secret isolation, Node 24 LTS support, and zero regressions.
**Requirements**: SEP-01, SEP-02, SEP-03, SEP-04, SEP-05, SEP-06, SEP-07, SEP-08, SEP-09, SEP-10
**Status**: COMPLETED (21/21 tests passing, total 149/149 passing across 9 test suites, backend build in 14ms, frontend Next.js production build passing with 0 errors)

### Round 3 - Phase 1: GitHub Integration
**Goal**: Connect GitHub repositories, ingest commit history, PRs, issues, and READMEs, extract evidence-grounded operational knowledge via Gemini 2.5 Flash, process webhooks securely (HMAC-SHA256, replay protection), and provide full frontend repository management with public demo support.
**Status**: COMPLETED (57/57 tests passing across 5 test suites, total 231/231 passing)

### Round 3 - Improvement 2: Role-Based Security Hardening
**Goal**: Enforce manager-only governance for finding approval/rejection, handover certification, and source deletion; protect developer technical contributions; redact confidential source content and strip server paths for External users; mask team email addresses; defend against workspace state tampering and parameter collisions.
**Status**: COMPLETED (31/31 role security tests passing, total 250/250 passing, builds passing)

### Round 3 - Improvement 3: Continuous Knowledge Updates
**Goal**: Automatically keep project knowledge synchronized with live GitHub activity; monitor push, PR, issue, and discussion events; scan for evidence drift; detect outdated or superseded claims; enforce automatic approval invalidation (forcing human re-review on drifted findings); de-certify handovers upon code drift; maintain persistent update history with retry resilience.
**Status**: IN PROGRESS (Milestones 3.1, 3.2 & 3.3 COMPLETE; 27/27 milestone tests passing; 277/277 repository regression tests passing)
- [x] Milestone 3.1: Continuous Update Engine & Webhook Expansion
- [x] Milestone 3.2: Evidence Drift Scanning & Precise Approval Invalidation
- [x] Milestone 3.3: REST Endpoints & Storage Methods (Frontend Integration)
- [ ] Milestone 3.4: Frontend UI for Continuous Knowledge Tracking (Re-Review Badges & Update Activity Drawer)
- [ ] Milestone 3.5: Comprehensive Testing & Verification



### Phase 1: Core Domain Models, Provenance Schema & Storage Foundation
**Goal**: Establish authoritative data schemas for reconstructed project state, evidence citations, RBAC security profiles, and local persistence.
**Depends on**: Nothing (first phase)
**Requirements**: INGEST-04, EVID-01, SEC-01
**Success Criteria** (what must be TRUE):
  1. Typed data schemas exist for Knowledge Findings (Decisions, Tasks, Risks, Contacts, Next Actions).
  2. Every Knowledge Finding entity strictly requires an immutable provenance citation schema (source, location, hash/sha, timestamp, clearance).
  3. Relational storage (SQLite) models and vector embeddings storage are configured and testable.
  4. RBAC role models (Admin/Reviewer, Incoming Member, Auditor) are defined with explicit read/review permissions.
**Plans**: 2 plans

Plans:
- [ ] 01-01: Define domain models, provenance schemas, and security access tiers
- [ ] 01-02: Setup local SQLite persistence, migrations, and vector storage integration

### Phase 2: Multi-Source Ingestion & Extraction Pipeline
**Goal**: Ingest heterogeneous project artifacts (Git repositories, Markdown notes, commit logs) and extract structured operational state.
**Depends on**: Phase 1
**Requirements**: INGEST-01, INGEST-02, INGEST-03, EXTRACT-01, EXTRACT-02, EXTRACT-03, EXTRACT-04
**Success Criteria** (what must be TRUE):
  1. System parses raw Git commits and commit messages into activity timelines and contributor attribution.
  2. System parses markdown documents, readmes, and meeting notes into discrete candidate findings.
  3. Extractor isolates explicit architectural decisions and rationale from source texts.
  4. Extractor detects unfinished tasks, open PR/issue items, technical risks, and project contacts with evidence coordinates.
**Plans**: 2 plans

Plans:
- [x] 02-01: Implement real document ingestion parsers (PDF, TXT, Markdown) with metadata preservation [COMPLETED - Phase C]
- [ ] 02-02: Build structured knowledge extraction pipelines for decisions, tasks, risks, and contacts

### Phase 3: Evidence Grounding, Conflict & Uncertainty Engine
**Goal**: Couple every extracted finding with immutable source proof, detect cross-source contradictions, and categorize confidence.
**Depends on**: Phase 2
**Requirements**: EVID-02, EVID-03, CONF-01, CONF-02, CONF-03
**Success Criteria** (what must be TRUE):
  1. Every generated finding has a clickable link or exact coordinate to the supporting source snippet.
  2. Contradictory statements between sources (e.g. outdated spec vs active code) are detected and flagged as CONFLICT.
  3. Speculative or ambiguous statements are tagged with UNCERTAIN and rationale.
  4. Critical gaps (e.g. key task without assigned owner, unverified decision) are listed as MISSING EVIDENCE.
  5. Any finding with zero verifiable evidence is blocked from publication.
**Plans**: 2 plans

Plans:
- [ ] 03-01: Implement evidence attachment engine and source-snippet resolver
- [ ] 03-02: Build conflict detection, uncertainty scoring, and missing evidence register

### Phase 4: Human Review, Correction & Handover Approval Workflow
**Goal**: Provide a web interface for the departing member or team lead to review, edit, reject, and formally approve the handover package.
**Depends on**: Phase 3
**Requirements**: REV-01, REV-02, REV-03
**Success Criteria** (what must be TRUE):
  1. Human reviewer can view all reconstructed findings organized into Decisions, Tasks, Risks, Contacts, and Next Actions.
  2. Reviewer can edit summaries, override conflict flags, provide clarifying notes, or reject false findings.
  3. An explicit "Approve Handover" action locks the package and transitions it from Draft to Approved.
  4. System audit log records reviewer identity, modification history, and approval timestamp.
**Plans**: 2 plans

Plans:
- [ ] 04-01: Build human review frontend interface and state management
- [ ] 04-02: Implement review modification, annotation, and cryptographic/audit approval locks

### Phase 5: Handover Viewer, Incoming Member Explorer & Permission Filtering
**Goal**: Allow incoming team members to explore the approved handover package interactively while strictly enforcing permission boundaries.
**Depends on**: Phase 4
**Requirements**: HAND-01, HAND-02, HAND-03, SEC-02, SEC-03
**Success Criteria** (what must be TRUE):
  1. Incoming team member can search and navigate approved decisions, tasks, risks, and contacts with source citations.
  2. Permission-aware filter scrubs confidential sources/snippets when viewed by a role lacking clearance.
  3. Export functionality produces structured JSON and readable markdown/PDF handover summaries.
**Plans**: 2 plans

Plans:
- [ ] 05-01: Build incoming member interactive handover explorer and topic search
- [ ] 05-02: Enforce RBAC redaction engine and export generation (JSON/Markdown/PDF)

### Phase 6: End-to-End System Integration, Verification & Standalone Judge Packaging
**Goal**: Integrate all frontend and backend modules into a frictionless, publicly accessible application with a zero-auth landing page, pre-seeded demonstration scenarios, and 100% Incognito-compatible judge evaluation.
**Depends on**: Phase 5
**Requirements**: PUB-01, PUB-02, PUB-03, PUB-04, PUB-05, PUB-06, PUB-07, DEPLOY-01, DEPLOY-02, DEPLOY-03
**Success Criteria** (what must be TRUE):
  1. The landing page opens and operates without login or signup, featuring clear "Get Started" and "Try Demo" actions.
  2. The complete end-to-end user workflow (Ingest → Reconstruct → Verify → Review → Approve → Handover) operates in a fresh Incognito / Private browser window without authentication redirects.
  3. Pre-seeded synthetic sample project data allows a judge to test the platform in under 3 minutes.
  4. Zero confidential user information or private credentials are exposed in client code.
  5. Project documentation, source repository, and public deployment links are verified and ready for Round 2 submission.
**Plans**: 2 plans

Plans:
- [ ] 06-01: Build frictionless zero-auth landing page, project workspace, and pre-seeded demonstration project
- [ ] 06-02: Deployment packaging, fresh incognito browser verification, and Round 2 submission bundle

## Progress

**Execution Order:**
Phases execute in numeric order: Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Core Domain Models, Provenance Schema & Storage Foundation | 2/2 | Completed (Phase B) | 2026-11-08 |
| 2. Multi-Source Ingestion & Extraction Pipeline | 1/2 | In progress (Phase C Ingestion Done) | 2026-11-08 |
| 3. Evidence Grounding, Conflict & Uncertainty Engine | 0/2 | Not started | - |
| 4. Human Review, Correction & Handover Approval Workflow | 2/2 | Hardened (Phase A) | 2026-11-08 |
| 5. Handover Viewer, Incoming Member Explorer & Permission Filtering | 2/2 | Hardened (Phase A) | 2026-11-08 |
| 6. End-to-End System Integration, Verification & Standalone Judge Packaging | 0/2 | Not started | - |

---

### Round 3 Improvements: Advanced Capabilities & Robustness

| Improvement | Milestones | Status | Completed |
|-------------|:----------:|:------:|:---------:|
| **Improvement 1: GitHub Integration** | 4/4 | Completed | 2026-11-15 |
| - 1.1: GitHub REST Routes & Ingestion Compiler | 1/1 | Completed | 2026-11-15 |
| - 1.2: Gemini Extraction & Evidence Grounding | 1/1 | Completed | 2026-11-15 |
| - 1.3: Secure Webhooks (HMAC-SHA256 & Idempotency) | 1/1 | Completed | 2026-11-15 |
| - 1.4: Frontend GitHub Repository Management | 1/1 | Completed | 2026-11-15 |
| **Improvement 2: Role-Based Security Hardening** | 2/2 | Completed | 2026-11-15 |
| - 2.1: Comprehensive RBAC Security Audit | 1/1 | Completed | 2026-11-15 |
| - 2.2: RBAC Implementation & Data Redaction | 1/1 | Completed | 2026-11-15 |
| **Improvement 3: Continuous Knowledge Updates** | 5/5 | Completed | 2026-11-15 |
| - 3.1: Engine & Webhook Expansion (Mutex & Idempotency) | 1/1 | Completed | 2026-11-15 |
| - 3.2: Evidence Drift Scanning & Selective Invalidation | 1/1 | Completed | 2026-11-15 |
| - 3.3: REST Endpoints & Storage Methods (History & Retry) | 1/1 | Completed | 2026-11-15 |
| - 3.4: Frontend UI for Continuous Tracking (Drawer & Badges) | 1/1 | Completed | 2026-11-15 |
| - 3.5: Comprehensive Testing & Final Verification | 1/1 | Completed | 2026-11-15 |

