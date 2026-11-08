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

## Problem Statement

When engineers, volunteers, or student team members depart from an organization or project, their institutional context and tacit knowledge vanish with them. While static documents may exist, critical decisions, rationale, unfinished work, hidden dependencies, recurring pitfalls, responsibilities, and key contacts remain scattered across chat messages, git repositories, meeting notes, and task trackers.

Incoming project members spend weeks or months attempting to reconstruct context, frequently repeating past errors or abandoning half-finished initiatives.

KnoTrail reconstructs the operational reality of the project from authorized information sources and generates an evidence-grounded, human-reviewed, permission-aware handover package.

The platform explicitly categorizes all extracted knowledge into:
1. **Verified Information**: Supported by unambiguous, direct source evidence.
2. **Uncertain Information**: Inferred or partially supported; flagged for human confirmation.
3. **Missing Evidence**: Areas where expected documentation or rationale is absent.
4. **Conflicting Information**: Contradictory statements or states across different sources.

## Core Product Workflow

```
[Connect Sources] ──> [Collect Data] ──> [Extract & Organize] ──> [Reconstruct State]
                                                                          │
[Approved Handover] <── [Human Review] <── [Attach Evidence & Conflicts] <┘
         │
[Incoming Member Explorer]
```

1. **Connect Authorised Sources**: Connect authorized repositories, documentation, and project communication.
2. **Collect Project Information**: Ingest files, commits, discussions, and issue trackers.
3. **Extract & Organise**: Parse structured and unstructured project artifacts into discrete knowledge nodes.
4. **Reconstruct Project State**: Map key decisions, pending tasks, responsibilities, dependencies, contacts, and next actions.
5. **Detect Uncertainties & Conflicts**: Identify contradictions, ambiguities, and missing proof.
6. **Attach Source Provenance**: Link every single extracted item to its original source file, line, commit, or message.
7. **Human Review & Approval**: Provide a review dashboard where a human owner can correct, verify, or annotate findings.
8. **Generate Approved Handover**: Produce an authorized, permission-filtered handover document and summary.
9. **Deliver to Incoming Member**: Make the handover accessible through an interactive, permission-aware explorer.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Core domain models and provenance schemas (Phase 1)
- [ ] Multi-source ingestion (Git, markdown, documents) & state reconstruction (Phase 2)
- [ ] Evidence grounding, uncertainty scoring, and conflict detection (Phase 3)
- [ ] Human review, editing, and approval workflow (Phase 4)
- [ ] Permission-aware handover viewer & export (Phase 5)
- [ ] Standalone judge evaluation deployment with demo scenarios (Phase 6)

### Out of Scope

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
- **Security**: Role-Based Access Control (RBAC) and permission-aware information filtering

## Development Constraints & Principles

1. **Build Before Decorating**: A functional end-to-end workflow takes absolute precedence over cosmetic UI or empty dashboards.
2. **Core Workflow Priority**: The journey from ingestion to verified handover must execute without interruption.
3. **Mandatory Source Traceability**: Every finding, decision, and task must point to verifiable original source evidence.
4. **Zero Ungrounded Claims**: Unsupported AI assertions must never be presented as factual project state.
5. **Explicit Uncertainty & Conflict**: Ambiguities and contradictions across sources must be highlighted, never smoothed over.
6. **Mandatory Human-in-the-Loop**: An unreviewed handover must never be published or marked as approved.
7. **Permission-Aware Filtering**: Information from restricted sources must never leak to unauthorized users or roles.
8. **Two-Person Achievability**: Architect for a 2-person team over a 72-hour timeline; avoid excessive microservices or operational overhead.
9. **Scope Discipline**: Reject feature creep; stick strictly to the knowledge-handover mission.
10. **Clean, Modular Code**: Maintain clear boundaries between ingestion, extraction, verification, and presentation.
11. **Workflow-Level Testing**: Test the complete user journey end-to-end, not merely isolated unit mocks.
12. **Truthful Progress**: Never declare a feature functional unless it has been empirically verified.
13. **Judge Self-Service**: The deployed application must be usable by hackathon judges without manual intervention.
14. **Documented Decisions**: Record all architectural trade-offs in persistent project memory.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Retain KnoTrail Knowledge Handover Mission | Round 2 selection email contained a discrepant "brand-governance" paragraph; team preserves Round 1 approved problem statement pending organizer clarification. | ✓ Confirmed (See ADR-001 & OPEN_QUESTIONS.md) |
| RECONSTRUCT → VERIFY → REVIEW → HANDOVER Architecture | Differentiates KnoTrail from naive LLM summarizers; guarantees factual integrity and human accountability. | ✓ Confirmed (See ADR-002) |
| FastAPI + Next.js + SQLite Stack | Provides rapid development, strong typing, structured LLM parsing, and local zero-ops persistence within 72 hours. | ⚠️ Proposed / Under Validation (See ADR-003) |
| Gravitas + GSD Governance | Ensures strict verification, persistent cross-session memory, and auditability throughout the hackathon build. | ✓ Confirmed (See ADR-005) |

---
*Last updated: 2026-11-08 at Hackathon Round 2 kickoff*
