---
phase: "01"
name: "core-domain-models"
created: 2026-11-08
---

# Phase 1: Core Domain Models, Provenance Schema & Storage Foundation — Context

## Decisions

### 1. Schema Framework: Pydantic v2 & SQLModel / SQLAlchemy
- **Decision**: Define core schemas as Pydantic v2 models that map to relational SQLite tables via SQLModel/SQLAlchemy.
- **Rationale**: Guarantees strict type validation, JSON Schema export (vital for structured LLM extraction in Phase 2), fast serialization, and direct compatibility with FastAPI.

### 2. Immutable Provenance Citation Schema (`EVID-01`, `INGEST-04`)
- **Decision**: Every knowledge finding entity must embed or relate to at least one `ProvenanceCitation` record.
- **Fields**:
  - `id`: UUID / string primary key
  - `source_type`: enum (`git_commit`, `file_content`, `issue_record`, `discussion_note`)
  - `source_uri`: relative file path or repository URL
  - `location_coordinate`: line range (`L10-L25`), commit SHA, or section anchor
  - `author`: name or email of original source author
  - `timestamp`: ISO-8601 datetime of original source creation
  - `content_snippet`: raw source excerpt that serves as proof
  - `content_hash`: SHA-256 hash of the cited snippet for tamper/drift detection
  - `clearance_tier`: security classification (`public`, `internal`, `confidential`)

### 3. Knowledge Finding Entity Hierarchy
- **Decision**: Create a unified `KnowledgeFinding` model with typed discriminators or specialized sub-models for:
  - `DecisionFinding`: Decision statement, context, rationale, rejected alternatives, status.
  - `TaskFinding`: Task title, description, assigned owner, status (`pending`, `in_progress`, `blocked`), dependencies.
  - `RiskFinding`: Risk description, severity (`low`, `medium`, `high`, `critical`), impacted components, mitigation.
  - `ContactFinding`: Name, role/specialty, email, historical ownership areas.
  - `NextActionFinding`: Recommended immediate action, rationale, priority.
- **Verification Status Enum**: `VERIFIED`, `UNCERTAIN`, `MISSING_EVIDENCE`, `CONFLICT`.
- **Constraint**: A finding cannot have status `VERIFIED` if its `evidence` list is empty.

### 4. RBAC & Security Tiers (`SEC-01`)
- **Decision**: Define explicit user roles and clearance tiers:
  - `ADMIN_REVIEWER`: Full access; can view confidential sources; can edit and approve handovers.
  - `INCOMING_MEMBER`: View approved handovers only; redacted/filtered based on assigned clearance tier.
  - `AUDITOR`: Read-only access to findings, full audit history, and provenance citations.
- **Clearance Tiers**: `PUBLIC` (0), `INTERNAL` (1), `CONFIDENTIAL` (2). A user cannot read citations or findings with clearance higher than their clearance level.

### 5. Storage Engine
- **Decision**: Use embedded SQLite database (zero-configuration, zero external daemon) stored at `data/knotrail.db`.
- **Vector Storage**: In-process ChromaDB or local embeddings index initialized alongside SQLite for semantic retrieval.

## Discretion Areas

- Choice of exact test runner (pytest) and test database setup (`:memory:` or temporary SQLite file for isolation).
- Field naming conventions (snake_case in Python, camelCase in JSON export serializers).
- Synthetic test fixtures demonstrating valid and invalid provenance links.

## Deferred Ideas

- Postgres migration scripts (deferred to post-hackathon enterprise roadmap).
- Distributed multi-tenant database partitioning.
