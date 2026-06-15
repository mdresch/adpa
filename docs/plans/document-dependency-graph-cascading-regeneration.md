# Implementation Plan: Document Dependency Graph & Cascading Regeneration

**Date**: 2026-06-15  
**Priority**: HIGH — Core intelligence backbone for the ADPA governance engine  
**Spec ID**: RPAS-CM-ENV-DG-001  
**Governed Feature IDs to Create**: `document-dependency-graph`, `entity-source-traceability`, `cascading-regeneration`

---

## Goal Description

The platform already operates with a powerful, interlocking set of capabilities:

- ✅ Template-driven document generation with quality scoring loops
- ✅ Inline H8 entity extraction with dual-store persistence (PostgreSQL + Neo4j)
- ✅ Drift detection and baseline savings
- ✅ Quality regression notifications and template optimization loops
- ✅ RAG context injection into all LLM processes
- ✅ Entity audit lineage (cryptographic chain)

**What is missing** is the connective tissue that transforms these isolated capabilities into a **self-healing, PMBOK-aligned Document Lifecycle System**:

1. **Full Entity Source Traceability** — "Which source document generated this entity, and in which version?"
2. **Document Dependency Graph** — A directed acyclic graph (DAG) of management plans and their upstream/downstream relationships culminating in the Project Management Plan (PMP).
3. **Cascading Regeneration** — When positive drift is detected or a Change Request is approved, automatically identify all documents affected up/downstream and queue their regeneration in topological order.

---

## Architecture Overview

```
[Change Request Approved]  [Positive Drift Detected]
            │                          │
            └────────────┬─────────────┘
                         ▼
           [DependencyGraphService]
           (Build affected subgraph)
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
   [Scope Plan]   [Schedule Plan]  [Risk Plan]
   (regenerate)   (regenerate)     (regenerate)
          │              │              │
          └──────────────┼──────────────┘
                         ▼
               [Communications Plan]
               (regenerate, depends on all above)
                         │
                         ▼
           [Project Management Plan]
           (aggregates all sub-plans)
```

---

## Feature 1: Full Entity Source Traceability

### Problem
The `EntityAuditController` tracks *what changed* on an entity (temporal versioning + crypto chain) but does not record **which document** was being generated when the entity was first produced or subsequently updated. This breaks the "entity → source document → section → template prompt" provenance chain.

### Proposed Changes

#### [MODIFY] `server/src/modules/knowledge-graph/DualStoreTransactionManager.ts`
- Add `sourceDocumentId: string` and `sourceSection: string` to the entity write payload.
- Persist `source_document_id`, `source_section`, and `generation_run_id` onto the PostgreSQL entity record and as a Neo4j relationship property `[:EXTRACTED_FROM {section, generationRunId}]`.

#### [MODIFY] `server/src/modules/inline-extraction/inlineExtractionContract.ts`
- Extend the `ExtractedEntity` interface to require `sourceDocumentId` and `sourceSection`.
- The Contract Guard invariant must assert: *every entity persisted to the dual store MUST carry a non-null `sourceDocumentId`.*

#### [NEW] `server/src/modules/entityAudit/EntityProvenanceController.ts`
- New API endpoint: `GET /api/v1/entities/:entityId/provenance`
- Returns the full provenance chain: `Entity → Source Document → Section → Template → Generation Run → AI Provider`.
- Answers: "Where in the codebase did this entity originate, and what generation event created it?"

#### [NEW] Database Migration
- Add columns to the entities table:
  ```sql
  ALTER TABLE entities ADD COLUMN source_document_id UUID REFERENCES documents(id);
  ALTER TABLE entities ADD COLUMN source_section TEXT;
  ALTER TABLE entities ADD COLUMN generation_run_id UUID;
  ```

---

## Feature 2: Document Dependency Graph

### Problem
ADPA generates documents independently. There is no machine-readable declaration that the **Risk Management Plan** *depends on* data produced by the **Scope Management Plan** (because risk items reference scope boundaries). When scope changes, there is no automated way to know that the Risk plan is stale.

### PMBOK Dependency Topology (Canonical)

The following DAG represents the standard PMBOK management plan dependency order:

```
Level 1 (Foundation):
  - Project Charter (source of truth, no deps)
  - Stakeholder Register

Level 2 (Scope & Time):
  - Scope Management Plan  (depends on: Charter)
  - Schedule Management Plan (depends on: Charter, Scope)

Level 3 (Cost & Quality):
  - Cost Management Plan (depends on: Charter, Scope, Schedule)
  - Quality Management Plan (depends on: Charter, Scope)
  - Resource Management Plan (depends on: Charter, Scope, Schedule)

Level 4 (Controls):
  - Risk Management Plan (depends on: Scope, Cost, Schedule, Quality)
  - Communications Plan (depends on: Stakeholder Register, Resource Plan)
  - Procurement Plan (depends on: Scope, Cost, Resource)
  - Change Management Plan (depends on: all Level 1-3 plans)

Level 5 (Apex):
  - Project Management Plan (depends on: ALL subsidiary plans)
```

### Proposed Changes

#### [NEW] `server/src/modules/dependency-graph/DocumentDependencyGraph.ts`
- Define the canonical adjacency list structure encoding the PMBOK DAG.
- Support a `customDependencies` override per-project so project managers can declare additional dependencies (e.g., a project-specific "Vendor Qualification Plan" depends on the Procurement Plan).
- Expose methods:
  - `getUpstreamDependencies(documentId)` → all documents this document depends on.
  - `getDownstreamDependencies(documentId)` → all documents that depend on this document.
  - `getAffectedSubgraph(documentId)` → topologically sorted list of documents to regenerate after a change to `documentId`.

#### [NEW] `server/src/modules/dependency-graph/DependencyGraphController.ts`
- `GET /api/v1/projects/:projectId/dependency-graph` → Returns full project DAG as JSON for visualization.
- `GET /api/v1/documents/:docId/impact-analysis` → Returns the affected subgraph for a proposed change.

#### [NEW] Database Schema
```sql
CREATE TABLE document_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),
  source_document_id UUID NOT NULL REFERENCES documents(id),  -- "depends on"
  dependent_document_id UUID NOT NULL REFERENCES documents(id),  -- "is depended on by"
  dependency_type TEXT NOT NULL DEFAULT 'content', -- 'content' | 'entity' | 'structural'
  is_custom BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### [NEW] `.agents/skills/adpa-dependency-graph/SKILL.md`
- Guide for agents on how to declare and query document dependencies.
- Defines when to add `is_custom = TRUE` relationships.

---

## Feature 3: Cascading Regeneration Engine

### Problem
When a Change Request is approved (or positive drift is auto-detected), the system currently has no mechanism to determine *which other documents are now stale* and trigger their regeneration in the correct topological order (upstream documents regenerated before downstream ones).

### Proposed Changes

#### [NEW] `server/src/modules/dependency-graph/CascadingRegenerationService.ts`
The core orchestration service. Logic:

1. **Trigger Event**: Receives either a `ChangeRequestApproval` or `PositiveDriftDetected` event.
2. **Subgraph Extraction**: Calls `DocumentDependencyGraph.getAffectedSubgraph(sourceDocumentId)`.
3. **Topological Sort**: Ensures Level 2 plans are regenerated before Level 3, and the PMP is always regenerated last.
4. **Queue Dispatch**: Dispatches individual `DocumentGenerationJob` events for each affected document to the existing Redis Bull queue, with explicit `dependsOnJobId` chaining to enforce ordering.
5. **Notification**: Emits a `CascadeRegenerationStarted` event to the WebSocket layer, listing all affected documents and their queue position.

```typescript
interface CascadeRegenerationPayload {
  triggerDocumentId: string
  triggerType: 'CHANGE_REQUEST_APPROVAL' | 'POSITIVE_DRIFT' | 'MANUAL'
  changeRequestId?: string
  approvedBy?: string
  affectedDocuments: {
    documentId: string
    documentType: string
    level: number  // 1-5 per PMBOK topology
    jobId: string
    estimatedStart: Date
  }[]
}
```

#### [MODIFY] `server/src/modules/compliance/DRACOEngine.ts`
- **Cascade DRACO Gate**: Any `CascadingRegenerationService` call that would affect a Level 5 document (Project Management Plan) MUST pass through the DRACO `executeHighRiskDocument` gate, requiring either a human override or an advisory escalation.
- This ensures the PMP — the apex governance document — is never regenerated without explicit human acknowledgment.

#### [MODIFY] `server/src/modules/documentGenerator/`
- Add `upstreamContext` field to the `DocumentGenerationJob`: a summary of regenerated upstream documents is automatically injected into the RAG context for the downstream document generation, ensuring full narrative coherence.

#### [NEW] `server/src/modules/dependency-graph/ChangeRequestProcessor.ts`
- Listens for `ChangeRequest.status = APPROVED` events from the governance workflow.
- Resolves the change request to the affected source document(s).
- Triggers `CascadingRegenerationService` with the correct payload.

---

## Feature 4: Dependency Graph Visualization (Frontend)

#### [NEW] `app/projects/[id]/dependency-graph/page.tsx`
- Interactive DAG visualization using a library like `react-flow` or `d3-dag`.
- Each node represents a management plan document with:
  - Current quality score (color-coded: green ≥ 90%, amber ≥ 75%, red < 75%).
  - Staleness indicator (how many upstream changes have not yet been cascaded).
  - Quick action: "Regenerate" or "View Impact Analysis".
- Edges are directional arrows showing dependencies.
- Hovering a node highlights all transitive upstream/downstream relationships.
- The PMP node at the apex pulses when any downstream document has an outstanding cascade.

---

## Governed Feature Registration

Three new entries in `server/governed-features.manifest.json`:

```json
{
  "id": "entity-source-traceability",
  "description": "Full provenance chain from entity back to source document, section, and generation run",
  "skills": ["adpa-inline-entity-extraction", "adpa-knowledge-graph-pillar3"],
  "testModuleDir": "entity-source-traceability",
  "testPathPattern": "modules/entity-source-traceability"
},
{
  "id": "document-dependency-graph",
  "description": "PMBOK-aligned directed acyclic graph of document dependencies per project",
  "skills": ["adpa-dependency-graph"],
  "testModuleDir": "document-dependency-graph",
  "testPathPattern": "modules/document-dependency-graph"
},
{
  "id": "cascading-regeneration",
  "description": "Topologically ordered document regeneration triggered by drift or CR approval",
  "skills": ["adpa-dependency-graph", "adpa-doc-gen-queue", "adpa-compliance-layer-pillar4"],
  "testModuleDir": "cascading-regeneration",
  "testPathPattern": "modules/cascading-regeneration"
}
```

---

## Verification Plan

### Automated Tests (Contract Guards)

**Entity Source Traceability**:
- `REQ-EST-001`: Every entity persisted via the inline extraction pipeline MUST carry a non-null `sourceDocumentId`. Invariant: Assert the dual-store write is rejected if `sourceDocumentId` is absent.
- `REQ-EST-002`: `GET /entities/:id/provenance` returns the complete 6-level provenance chain.

**Dependency Graph**:
- `REQ-DG-001`: `getAffectedSubgraph('scope-plan')` for the canonical PMBOK topology returns documents in topological level order (no Level 4 doc appears before a Level 3 doc it depends on).
- `REQ-DG-002`: Custom project-level dependencies are respected and do not break the topological sort.

**Cascading Regeneration**:
- `REQ-CR-001`: A `PositiveDriftDetected` event on the Scope Plan queues regeneration jobs for all Level 3+ documents and the PMP in the correct topological order.
- `REQ-CR-002`: The PMP regeneration job MUST be blocked by the DRACO gate and returns `ADVISORY_APPROVED` if confidence < 0.75.
- `REQ-CR-003`: If a Change Request approval triggers cascade, the `changeRequestId` is recorded in the `AuditLogger` before any job is dispatched.

### Manual Verification
1. Generate the full suite of subsidiary management plans for a test project.
2. Navigate to `/projects/:id/dependency-graph` and verify the DAG renders correctly with the PMP at the apex.
3. Approve a Change Request affecting the Scope Plan.
4. Observe the cascade: Schedule, Cost, Risk, Communications plans automatically queue for regeneration in order.
5. Verify the PMP queue job is held pending DRACO advisory acknowledgment.
6. Confirm every regenerated document's newly extracted entities carry `source_document_id` pointing to that document.

---

## Open Questions

> [!IMPORTANT]
> **Change Request Integration**: Is the Change Request approval workflow already implemented in the governance module, or does it need to be created as part of this plan? This affects the scope of `ChangeRequestProcessor.ts`.

> [!IMPORTANT]
> **Drift Detection Threshold**: What threshold (delta%) on the drift detection score constitutes "positive drift" sufficient to trigger an automatic cascade? Or should cascades always require explicit human approval (i.e., they only trigger from approved Change Requests, never from automated drift detection alone)?

> [!NOTE]
> **Partial Cascade**: Should the system support "partial cascade" where an operator selects a subset of affected documents to regenerate (vs. the full topological subgraph)? This would allow cost-conscious regeneration skipping low-value documents.
