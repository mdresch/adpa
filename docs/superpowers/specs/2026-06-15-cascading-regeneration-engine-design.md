# Cascading Regeneration Engine

Date: 2026-06-15
Status: Draft

## Problem
The ADPA system provides advanced document generation, drift detection, and RAG injection, but documents exist in isolation. When a foundational document (like a Project Charter or Scope Management Plan) changes, downstream documents (like Risk or Project Management Plans) remain stale, breaking PMBOK coherence.

## Success Criteria
- [ ] Positive drift approvals and change requests automatically trigger updates to dependent documents.
- [ ] Regeneration jobs execute in topological order (Level 1 to Level 5).
- [ ] Level 5 (Project Management Plan) aggregates downstream contexts but stops at the DRACO gate before final aggregation.
- [ ] Entities extracted carry source document and section provenance for absolute lineage.

## Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-EST-001 | Entities MUST be persisted with `sourceDocumentId` linking back to origin. | P0 |
| REQ-EST-002 | Provenance endpoint returns a 6-level chain (Entity->Doc->Sec->Tpl->GenRun->AI). | P1 |
| REQ-DG-001 | Document dependencies must form a DAG following the PMBOK canonical structure. | P0 |
| REQ-DG-002 | System exposes upstream and downstream query capabilities via `DocumentDependencyGraph`. | P0 |
| REQ-CR-001 | CascadingRegenerationService processes changes, builds a topological subgraph, and queues jobs. | P0 |
| REQ-CR-002 | PMP regeneration (Level 5) MUST trigger the DRACO engine as a high-risk action. | P0 |

## Interaction Rules (Overlap)

This feature MUST NOT break:
- `adpa-doc-gen-queue` — cascaded jobs must flow through standard document generation queuing.
- `adpa-knowledge-graph-pillar3` — dual-store entity writes must retain their atomicity even with the new provenance columns.

New interaction tests required when:
- Dispatching multiple generation jobs (queue backpressure handling).
- The DRACO gate pauses a job queue.

## Risks

| Risk | Mitigation |
|------|------------|
| Circular dependencies in custom graphs | DAG validation on save; strict PMBOK baseline. |
| OOM from massive cascading job queues | Queue concurrency limits and rate limiting via `documentGenerationService`. |
| Entity provenance mismatch | Contract Guard asserting `sourceDocumentId` before save. |

## Test Plan

| REQ | Test file / describe block |
|-----|---------------------------|
| REQ-EST-001 | `entitySourceTraceability.test.ts` → "rejects write if sourceDocumentId is missing" |
| REQ-DG-001 | `documentDependencyGraph.test.ts` → "topological sort returns correct Level 1->5 order" |
| REQ-CR-001 | `cascadingRegeneration.test.ts` → "queues downstream jobs in topological order" |
| REQ-CR-002 | `cascadingRegeneration.test.ts` → "blocks PMP generation at DRACO gate" |
