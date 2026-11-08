# Open Questions & Unresolved Clarifications: KnoTrail

This document tracks all unresolved ambiguities, external organizer inquiries, and architectural questions that require clarification during Round 2.

---

## OQ-001: Organizer Selection Email Discrepancy (Brand Governance vs Knowledge Handover)

- **Date Raised**: 2026-11-08
- **Category**: Requirements / Hackathon Governance
- **Status**: OPEN (Clarification Pending from Organizers)
- **Urgency**: High

### Description
The Round 2 selection email from the hackathon organizers contained a paragraph referencing a completely different product domain:
> *"Build the brand-governance product you proposed: content goes in, it is checked against the approved guidelines, terms, facts or assets, the issues are clearly explained, and a human makes the final decision."*

This description does **NOT** match our Round 1 submitted proposal, which was titled **KnoTrail** and addressed the **knowledge-handover problem**:
- Reconstructing project state, decisions, pending tasks, dependencies, risks, and contacts from scattered project sources when team members depart.
- Evidence-linked knowledge extraction with source citations.
- Detection of uncertainties, missing evidence, and conflicts.
- Human review and approval workflow before handover delivery.
- Role-based access control.

### Current Stance & Decision
Per **ADR-001**:
1. We preserve the original Round 1 knowledge-handover problem statement as our authoritative specification.
2. We do NOT pivot or redesign KnoTrail into a brand-governance system.
3. We do NOT silently replace our problem definition.
4. We treat the brand-governance paragraph as an unconfirmed organizer template/broadcast error or misdirected feedback unless explicitly confirmed otherwise.
5. Team leader Samyak Gedam will send a polite inquiry to the organizers to confirm that our Round 2 evaluation remains anchored to our Round 1 KnoTrail proposal.

### Contingency Analysis
If organizers reply that the brand-governance text was intentional:
- We will evaluate if our core engine architecture (Ingestion → Entity Extraction → Evidence Matching → Contradiction Detection → Human Review Gate → Output) can accommodate domain adaptation without abandoning our core engineering work.
- Until such written clarification is received, 100% of development effort stays on KnoTrail.

---

## OQ-002: Hackathon Deployment Environment & Evaluation Constraints

- **Date Raised**: 2026-11-08
- **Category**: Deployment / Infrastructure
- **Status**: OPEN (Internal Assessment in Phase 1)
- **Urgency**: Medium

### Description
Judges must be able to open the deployed product and evaluate its core workflow without developer assistance or local setup.
We need to determine the optimal hosting topology for the 72-hour delivery:
1. Option A: Monolithic container on Render / Railway / Fly.io combining Next.js frontend and FastAPI backend.
2. Option B: Vercel (Next.js frontend) + Render / Railway (FastAPI backend).

### Current Plan
Option B or Option A must be verified in an incognito window with HTTPS and zero cold-start timeouts. Evaluation will occur during Phase 1 plan 01-02.

---

## OQ-003: Auth/RBAC Scope for 72-Hour Demonstration

- **Date Raised**: 2026-11-08
- **Category**: Security / User Experience
- **Status**: RESOLVED (Adopted as ADR-006)
- **Urgency**: Low (Closed)

### Description
How should user access, authentication, and RBAC demonstration be structured for hackathon evaluation?

### Resolution
Per **ADR-006**, KnoTrail operates as a completely public web application with **ZERO login or signup requirements**. 
- No user accounts, registration forms, or auth redirects are permitted.
- The entire application and its demonstration workflow must function in a fresh Incognito / Private browser window.
- Role-based permissions (Reviewer vs. Incoming Member) and clearance redaction (Public, Internal, Confidential) are demonstrated via an interactive in-workspace persona/role switcher, allowing judges to test permission filtering without credential setup.
- Public demo accessibility is isolated from confidential source data using pre-seeded synthetic sample projects.

---

## OQ-004: Vector Search Footprint (In-Process ChromaDB vs SQLite-vss)

- **Date Raised**: 2026-11-08
- **Category**: Backend Architecture
- **Status**: OPEN (To resolve in Phase 1)
- **Urgency**: Low

### Description
We must decide whether to use in-process ChromaDB or SQLite-vss / FAISS for semantic grounding and vector retrieval.

### Current Plan
Phase 1 Plan 01-02 will benchmark in-process ChromaDB (duckdb/parquet or sqlite backend) against binary size and memory footprint on Mac and Linux containers. Zero external database daemon dependencies is a strict constraint.

