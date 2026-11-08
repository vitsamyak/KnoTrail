# KnoTrail: Project Instructions & Development Governance

<!-- GSD:project-start source:PROJECT.md -->

## Project

**KnoTrail**

KnoTrail is an intelligent knowledge-handover platform designed to eliminate critical knowledge loss when employees, volunteers, or student team members leave a project. By analyzing authorized project sources (repositories, commit logs, task records, and documentation), KnoTrail reconstructs the true operational state of a project—identifying key decisions, pending tasks, unresolved questions, dependencies, and contacts—while attaching original source evidence to every finding and enforcing human review before handover.

**Core Value:** Reconstructing verified, source-traceable project state through an end-to-end knowledge handover workflow (**RECONSTRUCT → VERIFY → REVIEW → HANDOVER**) with mandatory human approval and zero ungrounded claims.
<!-- GSD:project-end -->

---

## 1. Hackathon Context & Team Identity

- **Hackathon**: CodersInPune Hackathon 2026
- **Round**: Round 2 – The Build (72-Hour Duration: 8 Nov 2026, 10:00 AM IST to 11 Nov 2026, 10:00 AM IST)
- **Official Team Name**: Deploy_or_Die
- **Team Roster**:
  - **Samyak Gedam** (samyakgedam69@gmail.com) — Team Leader & Official Submission Representative
  - **Sanshrey Sanagar** (sanshrey7273@gmail.com) — Core Engineer
- **Total Team Size**: Exactly 2 members. Do not introduce additional team members or invent responsibilities.
- **Judge Self-Service Gate**: Judges must be able to open and test the deployed product standalone without assistance.

---

## 2. Persistent Session Rules (MANDATORY FOR ALL AGENTS)

Every AI assistant or agent starting a session in this repository MUST strictly abide by these 10 rules:

1. **Read GSD Context First**: Ground yourself by reading `.planning/PROJECT.md` and `.planning/STATE.md` before starting substantial work.
2. **Consult STATE.md**: Review `.planning/STATE.md` to identify the active phase, current plan, and blockers before choosing any task.
3. **Verify Against REQUIREMENTS.md**: Check `.planning/REQUIREMENTS.md` before implementing any feature to ensure strict adherence to committed requirements.
4. **Respect DECISIONS.md**: Abide by established architectural decisions in `.planning/DECISIONS.md`. Never reverse a recorded decision without an explicit new ADR.
5. **Keep State Updated**: Update `.planning/STATE.md` after completing meaningful work (metrics, progress, blockers, next action).
6. **Record Decisions in Files, Not Chat**: Persist non-trivial technical trade-offs into `.planning/DECISIONS.md` instead of relying on ephemeral chat context.
7. **Never Silently Change Problem Definition**: KnoTrail is a knowledge-handover platform. Do NOT pivot to brand governance or any conflicting external text (see `.planning/OPEN_QUESTIONS.md`).
8. **Truthful Progress (Zero Fabrication)**: Never claim a feature is built or functional unless verified by real command output or test execution in this session.
9. **Preserve Two-Person Scope Constraint**: Keep implementation achievable within the 72-hour window by 2 developers. Avoid microservices or gratuitous complexity.
10. **Synchronize Documentation with Reality**: Keep `.planning/` artifacts, code comments, and project instruction files synchronized with the codebase.

---

## 3. Gravitas Engineering Reliability Invariants

Gravitas governance is active for all repository modifications. Agents must observe the 6 Invariants:

1. **Ground before mutating**: Read the target file, tests, and callers before modifying code. Never act on assumed file state.
2. **Stay in declared scope**: Only write to files within the declared task scope.
3. **Completion needs evidence**: A task is complete ONLY when an actual validator or test passes after the final mutation. Self-review or "looks good" does not count.
4. **Never exact-retry a failure**: If an approach fails, change the diagnosis, context, or strategy before retrying.
5. **Satisfy the contract**: Acceptance criteria define completion.
6. **Say what you can't verify**: Explicitly mark uncertain, missing, or conflicting information; never fabricate certainty.

### Verification Hierarchy:

Executable Evidence > Project Tests > Static Analysis / Linter > Diff Invariants > Self-Review (never completion proof).  
Always conclude verification with: `VERDICT: PASS` or `VERDICT: FAIL -- [reason]`.

---

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-fast` for a trivial task inline, with no subagents and no PLAN.md
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

---

<!-- GSD:stack-start source:STACK.md -->

## Technology Stack

Technology stack not yet documented. Will populate after codebase mapping or first phase.
<!-- GSD:stack-end -->

---

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

---

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

---

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.agents/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->
