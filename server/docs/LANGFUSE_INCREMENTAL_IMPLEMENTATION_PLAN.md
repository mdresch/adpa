# ADPA Langfuse Incremental Implementation Plan

## Purpose

Implement Langfuse in small, production-safe increments instead of one large rollout. Each increment must be independently testable, reversible, and documented.

## Delivery Principles

- One feature slice at a time.
- No cross-slice schema drift.
- Every slice has explicit entry/exit criteria.
- Every slice ends with PASS/FAIL validation checks.
- Prefer stable IDs, low-cardinality tags, rich structured metadata.

## Phase 0: Foundations (Already Established)

- Naming standard documented in LANGFUSE_NAMING_CONVENTIONS.md.
- Production readiness runbook in LANGFUSE_PRODUCTION_READINESS.md.
- Initial implementation script in scripts/seed-langfuse-adpa-rich.ts.

## Phase 1: Baseline Trace Contract

### Scope

- Standard trace/session/user naming patterns.
- Required trace tags and required metadata keys.
- Strict runtime validator for baseline fields.

### Deliverables

- Baseline contract schema block in script.
- Validation check: traces include required sourceContext and extraction skeleton.
- Failure mode: hard fail if required fields are absent or malformed.

### Exit Criteria

- Trace creation succeeds with required fields only.
- Validator reports PASS for baseline checks in production-like run.

## Phase 2: Entity Reference Schema

### Scope

- Canonical entity references for:
  - document
  - project
  - template
  - program
  - portfolio
- Consistent relation fields in metadata (sourceContext + references).

### Deliverables

- Metadata reference object contract.
- Validation checks for ID shape and required relationships.

### Exit Criteria

- All references present and convention-compliant in sampled traces.

## Phase 3: Document Extraction Telemetry

### Scope

- Extraction event and generation metadata.
- Extracted entities list, count, confidence, and section/source linkage.

### Deliverables

- Observation events for extraction lifecycle.
- Structured extraction payload in metadata.

### Exit Criteria

- Extraction events visible and filterable by document and template.

## Phase 4: Project/Task/Checklist Telemetry

### Scope

- Task and checklist instrumentation:
  - task IDs
  - checklist item IDs
  - state transitions
  - owner context

### Deliverables

- Task/checklist observation events and tags.
- Validation checks for task lifecycle coverage.

### Exit Criteria

- Trace timelines show task/checklist progression with stable identifiers.

## Phase 5: Risk/Quality/Scope/Schedule Telemetry

### Scope

- Risk and control tracking.
- Quality checks and outcomes.
- Scope deltas and schedule variance fields.

### Deliverables

- Domain-specific metadata blocks and event types.
- Severity/status tagging conventions.

### Exit Criteria

- Risk/quality/scope/schedule can be independently queried in Langfuse.

## Phase 6: Program/Portfolio/Maturity Telemetry

### Scope

- Program and portfolio linkage from projects.
- Maturity model dimensions and maturity scores.

### Deliverables

- Program/portfolio context fields.
- Maturity score observations and metadata schema.

### Exit Criteria

- Program and portfolio rollups are traceable through context fields.

## Phase 7: Prompt + Score Integration

### Scope

- Prompt lifecycle management:
  - prompt versions
  - labels
  - prompt-to-trace linkage
- Score pipeline:
  - compliance scores
  - llm_judge_recommendation_quality
  - session_compliance_score

### Deliverables

- Prompt provisioning/verification.
- Score config provisioning/verification.
- Score validation checks per trace/session.

### Exit Criteria

- Prompt versions and score outputs consistently linked to traces/observations.

## Phase 8: Dataset + Human Annotation Loop

### Scope

- Dataset items and run linkage.
- Annotation queue integration for human review.
- Retrieval of annotation outcomes for feedback loops.

### Deliverables

- Dataset run item linking in telemetry flow.
- Annotation queue API checks and integration behavior.

### Exit Criteria

- Dataset-driven runs and annotation status are observable end-to-end.

## Phase 9: Feature-by-Feature Validation Suite

### Scope

- Consolidated PASS/FAIL matrix across all implemented phases.
- Repeatable validation modes for setup, test, all.

### Deliverables

- Validation report with per-check status and failure diagnostics.
- Operational run command set for CI/manual ops.

### Exit Criteria

- Full matrix passes in target production environment.

## Execution Model

For each phase:

1. Define exact schema delta.
2. Implement only that delta.
3. Run phase validation checks.
4. Update docs with observed outputs and caveats.
5. Freeze phase before proceeding.

## Suggested Backlog Order

1. Baseline Trace Contract
2. Entity Reference Schema
3. Document Extraction Telemetry
4. Project/Task/Checklist Telemetry
5. Risk/Quality/Scope/Schedule
6. Program/Portfolio/Maturity
7. Prompt + Score Integration
8. Dataset + Annotation Loop
9. Full Validation Suite

## Parking State

Current status: plan documented and parked for phased execution.
Next resume point: Phase 1 Baseline Trace Contract implementation and validator hardening.
