# KnoTrail

## What This Is

KnoTrail is an intelligent knowledge-handover platform designed to eliminate critical knowledge loss when employees, volunteers, or student team members leave a project. By analyzing authorized project sources (repositories, commit logs, task records, and documentation), KnoTrail reconstructs the true operational state of a project—identifying key decisions, pending tasks, unresolved questions, dependencies, and contacts—while attaching original source evidence to every finding and enforcing human review before handover.

## Core Value

Reconstructing verified, source-traceable project state through an end-to-end knowledge handover workflow (**RECONSTRUCT → VERIFY → REVIEW → HANDOVER**) with mandatory human approval and zero ungrounded claims.

## Product Identity

- **Product Name**: KnoTrail
- **Official Tagline**: "Knowledge Never Leaves a Trail Behind."
- **Hackathon**: CodersInPune Hackathon 2026
- **Round**: Round 2 – The Build (72-Hour Build: 8 November 2026, 10:00 AM IST to 11 November 2026, 10:00 AM IST)
- **Official Team Name**: Deploy_or_Die
- **Team Size**: 2 members (Strict Constraint)
- **Team Leader & Official Representative**: Samyak Gedam (samyakgedam69@gmail.com)
- **Core Engineer**: Sanshrey Sanagar (sanshrey7273@gmail.com)

## Critical Architecture Requirement: Zero-Auth Public Accessibility

KnoTrail is architected as a **frictionless, publicly accessible web application**.

The application strictly **DOES NOT REQUIRE**:
- User registration
- Login or signin
- Signup
- Account creation
- Authentication gates before accessing the core product

**Core Incognito Invariant**: Any visitor or hackathon judge must be able to open the deployed URL in a clean **Incognito / Private browser window** and immediately experience the complete core demonstration workflow from beginning to end without encountering an authentication screen, login form, or redirect wall.

## Public Demo & Data Protection Policy

Because the application is publicly accessible without login:
1. **Pre-Loaded Demonstration Project**: The platform ships with a rich, ready-to-use demonstration project ("Project Titan - Departing Lead Handover") pre-seeded and accessible in one click.
2. **Synthetic & Anonymized Data**: Demonstration datasets use synthetic, scrubbed, or publicly available project artifacts. No confidential organizational information or personal credentials are exposed.
3. **No Secrets in Frontend**: Secrets, tokens, and private API keys are strictly kept out of client-side code and public bundles.
4. **Public Access Boundary**: Public access to the KnoTrail application does **NOT** grant unrestricted access to private source repositories. For the hackathon MVP, development prioritizes a safe, sandboxed demonstration environment with prepared sample data. Any future private-source integrations will feature dedicated, isolated authorization mechanisms.

## Core Product Principles

The core operating cycle is: **RECONSTRUCT → VERIFY → REVIEW → HANDOVER**

1. **Preserve project knowledge**: Prevent loss of vital operational context when key team members depart.
2. **Reconstruct project context from available sources**: Synthesize the true current state across repositories, task records, and documentation.
3. **Link generated findings to original evidence**: Every finding must cite its immutable source coordinates.
4. **Identify uncertainty and conflicting information**: Explicitly highlight contradictions, missing proof, and ambiguity.
5. **Keep humans in control of final approval**: Mandatory human review and sign-off before generating the final handover.
6. **Protect confidential information**: Preserve source clearance boundaries and prevent unauthorized disclosure.
7. **Make the core workflow usable without an account**: Zero barrier to entry for incoming members, evaluators, and judges.

## Complete 8-Step Website User Journey

The web product is structured around an intuitive, end-to-end 8-step journey:

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

1. **Step 1: Landing Page**: The visitor opens KnoTrail. The homepage clearly communicates what KnoTrail is, the problem of lost institutional knowledge, the 4-stage pipeline, and why evidence-backed handovers matter. Features prominent "Get Started" and "Try Demo" buttons without any login/signup friction.
2. **Step 2: Project Workspace**: The visitor enters the main workspace displaying project overview, operational status, connected sources, recent findings, and pending tasks, with a one-click button to load the prepared demonstration project.
3. **Step 3: Add Project Information**: The user can provide project sources (local folder upload, markdown notes, meeting transcripts, or git repository history). Integrations are kept focused and achievable for the 72-hour window.
4. **Step 4: AI Project Analysis**: The backend pipeline extracts and organizes discrete findings: important decisions and their rationale, pending tasks and assigned owners, technical risks, dependencies, unresolved questions, and recommended next actions.
5. **Step 5: Evidence Explorer**: Users inspect the supporting proof behind every finding. Findings are clearly categorized with visual badges: `VERIFIED`, `UNCERTAIN`, `CONFLICTING`, or `MISSING EVIDENCE`. Unsupported assumptions are never presented as facts.
6. **Step 6: Human Review Center**: The reviewer (departing member or lead) inspects findings, corrects errors, adds missing context, resolves conflicts, and approves or rejects items. An explicit human approval action is mandatory to seal the handover.
7. **Step 7: Handover Generation**: System compiles the approved findings into a standardized Handover Package: Executive Overview, Key Decisions, Pending Tasks, Responsibilities, Risks & Dependencies, Unresolved Questions, and Next Actions.
8. **Step 8: Handover Delivery**: Incoming members and evaluators can interactively explore the verified handover, filter by category or tag, view underlying citations, and export to structured JSON or readable Markdown/PDF.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Core domain models and provenance schemas (Phase 1)
- [ ] Multi-source ingestion (Git, markdown, documents) & state reconstruction (Phase 2)
- [ ] Evidence grounding, uncertainty scoring, and conflict detection (Phase 3)
- [ ] Human review, editing, and approval workflow (Phase 4)
- [ ] Zero-auth handover viewer, incoming member explorer & export (Phase 5)
- [ ] Frictionless landing page, pre-seeded demo scenario & incognito judge packaging (Phase 6)

### Out of Scope

- Mandatory User Registration, Login, and Signup — Explicitly prohibited; core product must remain public and friction-free
- Brand-governance engine — Unconfirmed organizer email anomaly; preserved original knowledge-handover specification (see OPEN_QUESTIONS.md)
- Unbounded conversational chatbot — Prevents ungrounded hallucinations; every finding must have source proof
- Automatic unapproved handover dispatch — Bypasses mandatory human review gate
- Enterprise SAML/SSO — High operational overhead for 72-hour build

## Context

KnoTrail is developed for CodersInPune Hackathon 2026 Round 2 (The Build). Round 1 was completed successfully with the submission of the architectural proposal and editable Draw.io diagrams. The current sprint is a 72-hour build (8 Nov 2026 10:00 AM IST to 11 Nov 2026 10:00 AM IST).

## Proposed Technology Context

*Subject to feasibility and complexity validation during Phase 1/Phase 2:*
- **Frontend**: React / Next.js / Tailwind CSS (Clean, responsive, interactive review and handover viewer)
- **Backend**: FastAPI / Python (Async pipeline, structured parsing, modular services)
- **AI / LLM**: LLM API with strict structured output (JSON schema enforcement, zero hallucination)
- **Storage**: SQLite (metadata, relational state, review annotations) and ChromaDB / vector store (semantic grounding and search)
- **Integrations**: Git CLI and GitHub REST API (source ingestion and commit history analysis)
- **Security & RBAC**: In-session role simulation (Reviewer vs. Incoming Member view) with zero mandatory authentication walls

## Development Constraints & Principles

1. **Build Before Decorating**: A functional end-to-end workflow takes absolute precedence over cosmetic UI or empty dashboards.
2. **Core Workflow Priority**: The journey from ingestion to verified handover must execute without interruption.
3. **Mandatory Source Traceability**: Every finding, decision, and task must point to verifiable original source evidence.
4. **Zero Ungrounded Claims**: Unsupported AI assertions must never be presented as factual project state.
5. **Explicit Uncertainty & Conflict**: Ambiguities and contradictions across sources must be highlighted, never smoothed over.
6. **Mandatory Human-in-the-Loop**: An unreviewed handover must never be published or marked as approved.
7. **Permission-Aware Filtering & Safe Demos**: Public demo accessibility is isolated from confidential source data; synthetic demo data is used.
8. **No Login / Signup Requirement**: Core product operates freely in Incognito mode without account barriers.
9. **Two-Person Achievability**: Architect for a 2-person team over a 72-hour timeline; avoid excessive microservices or operational overhead.
10. **Scope Discipline**: Reject feature creep; stick strictly to the knowledge-handover mission.
11. **Clean, Modular Code**: Maintain clear boundaries between ingestion, extraction, verification, and presentation.
12. **Workflow-Level Testing**: Test the complete user journey end-to-end, not merely isolated unit mocks.
13. **Truthful Progress**: Never declare a feature functional unless it has been empirically verified.
14. **Judge Self-Service**: The deployed application must be usable by hackathon judges without manual intervention.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Retain KnoTrail Knowledge Handover Mission | Round 2 selection email contained a discrepant "brand-governance" paragraph; team preserves Round 1 approved problem statement pending organizer clarification. | ✓ Confirmed (See ADR-001 & OPEN_QUESTIONS.md) |
| RECONSTRUCT → VERIFY → REVIEW → HANDOVER Architecture | Differentiates KnoTrail from naive LLM summarizers; guarantees factual integrity and human accountability. | ✓ Confirmed (See ADR-002) |
| FastAPI + Next.js + SQLite Stack | Provides rapid development, strong typing, structured LLM parsing, and local zero-ops persistence within 72 hours. | ⚠️ Proposed / Under Validation (See ADR-003) |
| Two-Person Scope & Standalone Judge Evaluation | Guarantees testability within 72 hours by two engineers; mandates sample data seeding. | ✓ Confirmed (See ADR-004) |
| Gravitas + GSD Governance | Ensures strict verification, persistent cross-session memory, and auditability throughout the hackathon build. | ✓ Confirmed (See ADR-005) |
| Frictionless Public Web App & Zero-Auth Demo Policy | Eliminates login/signup friction; guarantees 100% functionality in Incognito windows for hackathon judges. | ✓ Confirmed (See ADR-006 & OPEN_QUESTIONS.md) |

---
*Last updated: 2026-11-08 at Hackathon Round 2 kickoff*
