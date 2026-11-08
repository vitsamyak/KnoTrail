# KnoTrail: Complete Website User Journey & Public Demo Architecture

This document defines the authoritative 8-step user journey and public demonstration policy for KnoTrail.

---

## 1. Zero-Authentication Public Access Policy

KnoTrail is designed as a frictionless web application accessible to hackathon judges and prospective users worldwide:
- **No Login / No Signup**: Visitors are never prompted for credentials, passwords, or OAuth authorisations to experience the platform.
- **Incognito & Private Browser Verification**: The complete end-to-end user workflow executes cleanly in a fresh, unauthenticated Incognito session.
- **No Mandatory Auth Redirects**: There are zero middleware walls or route guards redirecting users away from the core product.

---

## 2. Public Demo & Data Protection Policy

- **Ready-to-Use Demo Dataset**: The application bundles a pre-seeded, high-fidelity sample project ("Project Titan Handover") that allows judges to experience state reconstruction, evidence exploration, and review within 3 minutes.
- **Data Anonymization**: All pre-seeded demonstration data uses synthetic or public artifacts. No organizational secrets, private tokens, or proprietary intellectual property are stored in frontend code.
- **Source Access Boundary**: Public application availability does not grant unrestricted access to external private source code repositories. Private data ingestion requires explicit, sandboxed user provision.

---

## 3. The 8-Step User Journey

```
[Step 1: Landing Page]
        │
        ▼
[Step 2: Project Workspace]
        │
        ▼
[Step 3: Add Project Information]
        │
        ▼
[Step 4: AI Project Analysis]
        │
        ▼
[Step 5: Evidence Explorer]
        │
        ▼
[Step 6: Human Review Center]
        │
        ▼
[Step 7: Handover Generation]
        │
        ▼
[Step 8: Handover Delivery]
```

### Step 1: Landing Page
- **Visitor Context**: First-time visitor or hackathon judge opening the deployed web application.
- **Key Information**:
  - Clear value proposition: Eliminating institutional knowledge loss during team turnover.
  - Core philosophy: **RECONSTRUCT → VERIFY → REVIEW → HANDOVER**.
  - Visual explainer on why evidence-backed, human-approved handovers outperform ungrounded chatbots.
- **Primary Actions**:
  - `Try Demo Project` (Instant jump to pre-loaded Project Titan).
  - `Get Started with New Project` (Direct jump to clean workspace).
- **Authentication Requirement**: **NONE**.

### Step 2: Project Workspace
- **Visitor Context**: Visitor exploring active or pre-loaded project state.
- **Key Elements**:
  - Project identity and operational status.
  - Connected sources overview (repositories, docs, notes).
  - High-level metric counters (Verified Decisions, Pending Tasks, Identified Risks, Key Contacts).
  - Quick action: "Load Sample Project" banner for instant evaluation.

### Step 3: Add Project Information
- **Visitor Context**: User attaching or selecting source data for handover reconstruction.
- **Supported Hackathon Sources**:
  - Local document upload (Markdown specifications, architecture notes, text meeting minutes).
  - Git repository commit logs and diffs.
- **Security Guard**: File uploads are processed in a local/sandboxed session with no persistence of sensitive host credentials.

### Step 4: AI Project Analysis
- **System Action**: Background processing engine analyzes project inputs.
- **Extracted Knowledge Categories**:
  1. *Decisions & Rationale*: Key technical choices, alternatives rejected, context.
  2. *Pending Tasks*: Unfinished work, blocked items, assigned owners.
  3. *Responsibilities & Contacts*: Core contributors and their subject-matter ownership.
  4. *Risks & Dependencies*: Cross-service blockers, technical debt, failure points.
  5. *Unresolved Questions & Next Actions*: Concrete recommendations for the incoming member.

### Step 5: Evidence Explorer
- **User Action**: Inspecting the factual grounding behind each AI-generated finding.
- **Key Display Elements**:
  - Finding summary card with direct quote / snippet from source.
  - Source coordinates: File path, line number range, commit SHA, timestamp, and author.
  - Verification Badges:
    - `VERIFIED`: Supported by unambiguous, direct source evidence.
    - `UNCERTAIN`: Inferred or partially supported; requires human confirmation.
    - `CONFLICTING`: Contradictory statements detected across disparate sources.
    - `MISSING EVIDENCE`: Stated assertions lacking source citations.

### Step 6: Human Review Center
- **User Action**: Human-in-the-loop review and editing.
- **Key Capabilities**:
  - Edit summaries or clarify descriptions.
  - Override or resolve conflict flags.
  - Add missing details known only to the departing member.
  - Approve or reject individual findings.
- **Approval Gate**: Mandatory human sign-off button ("Approve Handover") required before handover package finalization.

### Step 7: Handover Generation
- **System Action**: Assembling the final, verified handover package.
- **Structure**:
  - Executive Project Summary.
  - Authoritative Decisions & Architecture Log.
  - Immediate Pending Tasks & Ownership Matrix.
  - Critical Risks & Mitigation Strategies.
  - Key Stakeholders & Contacts.
  - Recommended First 30 Days Action Plan.

### Step 8: Handover Delivery
- **Incoming Member / Evaluator Context**: Reviewing the approved handover.
- **Capabilities**:
  - Search and filter by topic or tag.
  - Click any finding to inspect underlying proof.
  - Toggle between clearance perspectives (Public vs. Internal view).
  - One-click export options: Structured JSON, formatted Markdown, or printable PDF.

