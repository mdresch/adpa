---
name: adpa-dependency-graph
description: Use when building, validating, or modifying the Document Dependency Graph (DAG) and Cascading Regeneration engine.
---

# ADPA Document Dependency Graph

## Purpose
Establishes topological ordering and dependencies between documents (e.g., PMBOK cascading of Scope -> Schedule -> Risk -> PMP). Used to trigger cascading regeneration when positive drift is detected or a Change Request is approved.

## Invariants
- Must always: Validate that the dependency graph is a strict DAG (Directed Acyclic Graph) to prevent infinite loops.
- Must always: Enforce that the Project Management Plan (PMP) regeneration hits a DRACO gate before finalization.
- Must never: Regenerate downstream documents out of topological order.
- Must never: Dispatch cascading jobs without recording the ChangeRequest or Drift triggering event.

## Interaction Rules
- Depends on: `adpa-doc-gen-queue` — regeneration requests MUST flow through the standard bull queue via `documentGenerationService`.
- Must not break: `adpa-compliance-layer-pillar4` — DRACO gate for high-risk aggregations (like Level 5 PMP).

## Key Files
| File | Role |
|------|------|
| `server/src/modules/dependency-graph/DocumentDependencyGraph.ts` | Builds and sorts the DAG |
| `server/src/modules/dependency-graph/CascadingRegenerationService.ts` | Dispatches jobs based on topology |
| `server/src/__tests__/modules/document-dependency-graph/documentDependencyGraph.test.ts` | Contract Guards |

## Commands
```powershell
cd server
npm run test:features -- document-dependency-graph
npm run test:features -- cascading-regeneration
npm run verify:governed-features
```

## Related Skills
- `adpa-doc-gen-queue`
- `adpa-compliance-layer-pillar4`
- `adpa-governed-feature-loop`
