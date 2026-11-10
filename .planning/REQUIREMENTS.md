# Requirements: KnoTrail

**Defined:** 2026-11-08  
**Core Value:** Reconstructing verified, source-traceable project state through an end-to-end knowledge handover workflow (RECONSTRUCT → VERIFY → REVIEW → HANDOVER) with mandatory human approval and zero ungrounded claims.

## v1 Requirements

Requirements committed for Round 2 ("The Build", 72-hour delivery). Each requirement maps to a phase in ROADMAP.md.

### Public Access & Incognito Evaluation (PUB)

- [x] **PUB-01**: Landing page opens and operates without user registration, login, or signup.
- [x] **PUB-02**: Core project workspace opens immediately without account creation or sign-in requirements.
- [x] **PUB-03**: Ready-made demonstration project ("Project Titan Handover") is pre-loaded and accessible to first-time visitors in one click.
- [x] **PUB-04**: Complete product demonstration workflow operates seamlessly in a fresh Incognito / Private browser session.
- [x] **PUB-05**: System prohibits mandatory authentication redirects or login walls anywhere in the core demonstration workflow.
- [x] **PUB-06**: Demo data uses synthetic, anonymized, or public project artifacts; zero confidential personal information or secrets are exposed in client code.
- [ ] **PUB-07**: Public deployment is directly accessible and evaluatable by hackathon judges without developer assistance or credentials.

### Ingestion & Source Integration (INGEST)

- [x] **INGEST-01**: System can ingest project documentation, Markdown files, and plain text notes from authorized local or uploaded paths.
- [ ] **INGEST-02**: System can ingest Git repository commit history, changed files, and commit messages to reconstruct historical activity.
- [ ] **INGEST-03**: System provides a modular source connector interface supporting extension to external APIs (e.g. GitHub issues, pull requests).
- [x] **INGEST-04**: System preserves source origin metadata (file path, commit hash, author, timestamp, access restriction tier) for every ingested item.

### Knowledge Extraction & State Reconstruction (EXTRACT)

- [x] **EXTRACT-01**: Pipeline extracts explicit architectural and technical decisions along with their stated rationale.
- [x] **EXTRACT-02**: Pipeline identifies pending, in-progress, and unassigned tasks with associated owners or historical contributors.
- [x] **EXTRACT-03**: Pipeline identifies technical dependencies, cross-service requirements, and known risks or failure modes.
- [x] **EXTRACT-04**: Pipeline extracts key project contacts and their historical areas of responsibility.

### Evidence & Provenance Grounding (EVID)

- [x] **EVID-01**: Every reconstructed finding is permanently coupled to at least one primary source citation (file, line range, commit SHA, or message ID).
- [ ] **EVID-02**: System provides one-click navigation from any finding directly to its underlying raw source evidence snippet.
- [x] **EVID-03**: System prohibits emitting ungrounded facts; assertions lacking verifiable source evidence are rejected or routed to the Missing Evidence register.

### Uncertainty & Conflict Detection (CONF)

- [x] **CONF-01**: System explicitly flags uncertain statements (findings with partial or ambiguous support) and presents them with an UNCERTAIN badge.
- [ ] **CONF-02**: System detects contradictory statements across different sources (e.g., outdated README vs recent commit or meeting note) and flags them as CONFLICT.
- [x] **CONF-03**: System identifies missing evidence gaps (e.g., undocumented decisions or unassigned critical dependencies) and lists them under MISSING EVIDENCE.

### Human Review & Correction Workflow (REV)

- [x] **REV-01**: Human reviewer dashboard displays reconstructed state categorized into decisions, tasks, risks, contacts, and next actions.
- [x] **REV-02**: Human reviewer can edit, verify, reject, or annotate any generated finding, conflict, or uncertainty.
- [x] **REV-03**: System enforces an explicit "Approve Handover" gate; an unapproved handover cannot be published or finalized.

### Approved Handover & Incoming Member Explorer (HAND)

- [x] **HAND-01**: System generates a standardized, structured Handover Package containing all approved findings, evidence trails, and recommended next actions.
- [x] **HAND-02**: Interactive explorer interface allows an incoming team member to search, filter by topic/tag, and view evidence-backed project context.
- [x] **HAND-03**: System allows exporting the approved handover package into portable formats (structured JSON and readable Markdown/PDF).

### Security & Role-Based Access Control (SEC)

- [x] **SEC-01**: System provides role-based perspective simulation (Departing Member Reviewer, Incoming Member, Auditor) without requiring user accounts.
- [ ] **SEC-02**: System enforces source-level access filters so confidential or restricted source snippets are never leaked to unauthorized roles.
- [ ] **SEC-03**: Handover export and viewer automatically sanitize or omit restricted sections based on the simulated viewer clearance tier.

### Deployment & Standalone Judge Experience (DEPLOY)

- [ ] **DEPLOY-01**: The deployed application executes the end-to-end workflow (connect/upload → reconstruct → review → approve → view handover) without developer assistance.
- [ ] **DEPLOY-02**: System includes bundled sample project scenarios allowing instant judge evaluation in under 3 minutes.
- [ ] **DEPLOY-03**: Deployed application passes verification in an incognito browser window with zero local environment dependencies.

### Supabase Backend & Cloud Storage Integration (SUPA)

- [x] **SUPA-01**: Persistent Supabase PostgreSQL storage with canonical JSONB aggregate model, optimistic concurrency control (`version`), and RLS security.
- [x] **SUPA-02**: Private Supabase Storage bucket (`knotrail-source-files`) for uploaded PDFs, TXTs, and Markdown documents with workspace-scoped object paths.
- [x] **SUPA-03**: Full `StorageRepository` interface implementation in `SupabaseStorageRepository` with 100% method and feature parity.
- [x] **SUPA-04**: Dedicated `handover_shares` table storing only SHA-256 hashed share tokens; zero plaintext tokens in DB or logs; O(1) public retrieval and instant revocation.
- [x] **SUPA-05**: Storage factory dynamically switches between Supabase and DurableFileRepository based on `STORAGE_BACKEND`.
- [x] **SUPA-06**: Explicit server-side fail-fast configuration validation: missing credentials when `STORAGE_BACKEND=supabase` throws immediate configuration errors rather than silent local disk fallback.
- [x] **SUPA-07**: Server credentials (`SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) are strictly restricted to server-side code; never exposed to browser bundles or API responses.
- [x] **SUPA-08**: Deterministic test suite with mock adapter runs offline in `npm test` without live Supabase credentials; optional live integration tests run when credentials are provided.

## v2 Requirements

Deferred to Round 3 / post-hackathon releases. Tracked but not in the 72-hour build scope.

### Advanced Connectors (CONN)

- **CONN-01**: Live Slack and Discord workspace integrations with thread reconstruction.
- **CONN-02**: Jira, Linear, and Asana bi-directional synchronization.
- **CONN-03**: Google Drive, Notion, and Confluence native workspace crawlers.

### Multi-Agent Autonomous Exploration (AGENT)

- **AGENT-01**: Interactive Q&A conversational agent that answers incoming member questions grounded strictly in the approved handover package.
- **AGENT-02**: Continuous delta-handover updates triggered by new git pushes or sprint transitions.

## Out of Scope

Explicitly excluded to prevent scope creep during the 72-hour build.

| Feature | Reason |
|---------|--------|
| Mandatory Login / Registration / Signup Screens | Prohibited by core product requirement. The application must be 100% publicly accessible and testable in Incognito mode without accounts. |
| Brand-Governance Engine | The selection email contained a discrepant reference to brand guidelines; KnoTrail remains strictly a knowledge-handover platform per Round 1 proposal (see OPEN_QUESTIONS.md). |
| Unbounded Freeform Chatbot | KnoTrail is an evidence-backed state reconstruction platform. Open-ended conversational chatbots without strict citations lead to hallucinations and fail Core Value. |
| Automatic Unapproved Handover Dispatch | Bypassing human review violates the RECONSTRUCT → VERIFY → REVIEW → HANDOVER principle. |
| Enterprise SSO / SAML 2.0 | High configuration complexity for 72 hours; mock RBAC simulation satisfies hackathon criteria cleanly. |
| Distributed Microservices | Single modular backend (FastAPI) and clean frontend (Next.js) minimizes deployment failure risks. |

## Traceability

Mapping of v1 requirements to implementation phases in ROADMAP.md.

| Requirement | Phase | Status |
|-------------|-------|--------|
| PUB-01 | Phase 6 | Pending |
| PUB-02 | Phase 6 | Pending |
| PUB-03 | Phase 6 | Pending |
| PUB-04 | Phase 6 | Pending |
| PUB-05 | Phase 6 | Pending |
| PUB-06 | Phase 6 | Pending |
| PUB-07 | Phase 6 | Pending |
| INGEST-01 | Phase 2 | Pending |
| INGEST-02 | Phase 2 | Pending |
| INGEST-03 | Phase 2 | Pending |
| INGEST-04 | Phase 1 | Pending |
| EXTRACT-01 | Phase 2 | Pending |
| EXTRACT-02 | Phase 2 | Pending |
| EXTRACT-03 | Phase 2 | Pending |
| EXTRACT-04 | Phase 2 | Pending |
| EVID-01 | Phase 1 | Pending |
| EVID-02 | Phase 3 | Pending |
| EVID-03 | Phase 3 | Pending |
| CONF-01 | Phase 3 | Pending |
| CONF-02 | Phase 3 | Pending |
| CONF-03 | Phase 3 | Pending |
| REV-01 | Phase 4 | Pending |
| REV-02 | Phase 4 | Pending |
| REV-03 | Phase 4 | Pending |
| HAND-01 | Phase 5 | Pending |
| HAND-02 | Phase 5 | Pending |
| HAND-03 | Phase 5 | Pending |
| SEC-01 | Phase 1 | Pending |
| SEC-02 | Phase 5 | Pending |
| SEC-03 | Phase 5 | Pending |
| DEPLOY-01 | Phase 6 | Pending |
| DEPLOY-02 | Phase 6 | Pending |
| DEPLOY-03 | Phase 6 | Pending |
| SUPA-01 | Phase H | Complete |
| SUPA-02 | Phase H | Complete |
| SUPA-03 | Phase H | Complete |
| SUPA-04 | Phase H | Complete |
| SUPA-05 | Phase H | Complete |
| SUPA-06 | Phase H | Complete |
| SUPA-07 | Phase H | Complete |
| SUPA-08 | Phase H | Complete |

**Coverage:**
- v1 requirements: 40 total
- Mapped to phases: 40
- Unmapped: 0

---
*Requirements defined: 2026-11-08*  
*Last updated: 2026-11-10 with Phase H Supabase Backend Integration Requirements*
