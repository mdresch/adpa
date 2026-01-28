# GKG Ingestion Design

**Status**: Design  
**Prerequisites**: [GKG_SCHEMA.md](./GKG_SCHEMA.md), Neo4j connection (`server/src/utils/neo4j.ts`)  
**Purpose**: Define how ADPA PostgreSQL data is synced into the Governance Knowledge Graph (Neo4j).

---

## 1. Overview

Ingestion is **pull-from-ADPA**: the server reads from PostgreSQL and writes to Neo4j via the official driver. Sync is **idempotent** (MERGE on `adpa_id`) and can be **incremental** (by `updated_at` or `synced_at`). Triggers: **on-demand API**, **post-extraction hook**, and **scheduled** (optional).

---

## 2. Ingestion Phases and Order

Data must be written in dependency order so that relationships can be created.

| Phase | Description | Order |
|-------|-------------|-------|
| **0. Bootstrap** | Reference nodes: `GovernanceDomain`, `MaturityLevel`. Run once per environment (or idempotent at start). | First |
| **1. Projects** | Upsert `Project` from `projects`. | Before documents/units |
| **2. Documents** | Upsert `Document` from `documents`; create `(Document)-[:BELONGS_TO]->(Project)`. | After projects |
| **3. SemanticUnits** | Upsert `SemanticUnit` from entity tables; create `BELONGS_TO`, `EXTRACTED_FROM`. | After documents (for doc-linked units) |
| **4. Project dependencies** | Create `(Project)-[:DEPENDS_ON]->(Project)` from `project_dependencies`. | After projects |
| **5. ECS / Governance** | Authority, Evidence, TemporalRange, IN_DOMAIN, GOVERNED_BY, TRACES_TO, CONFLICTS_WITH. | Future; after pipeline exists |

Phases 0–4 are sufficient for a first implementation. Phase 5 depends on ECS and DME outputs.

---

## 3. Triggers

| Trigger | When | Scope | Job type |
|---------|------|--------|----------|
| **API** | `POST /api/gkg/sync` (or similar) with `{ projectId? }` or `{ documentId? }`. | One project, one document, or full re-sync. | `gkg-sync-project`, `gkg-sync-document`, `gkg-bootstrap` |
| **Post-extraction** | After extraction parent job completes (all entity children done). | The project that was extracted. | `gkg-sync-project` |
| **Scheduled** | Cron (e.g. nightly) for incremental or full sync. | All projects or only changed since last run. | `gkg-sync-incremental` or `gkg-sync-project` per project |

**Recommendation**: Start with **API** and **post-extraction**. Add **scheduled** when a “last synced” watermark (e.g. `gkg_sync_state` table or Neo4j `synced_at`) is in place.

---

## 4. Job Types and Payloads

Jobs are processed by a dedicated queue (e.g. `gkgSyncQueue` or reuse an existing queue with new job types). Below, “queue” is logical; actual implementation can use Rabbit/Bull-style queues already in use.

| Job type | Payload | Responsibility |
|----------|---------|-----------------|
| `gkg-bootstrap` | `{}` or `{ force?: boolean }` | Ensure ref nodes exist (GovernanceDomain, MaturityLevel). Optionally run Phase 0 + full Phase 1–2 (all projects/documents). |
| `gkg-sync-project` | `{ projectId: string }` | Phases 1–4 for one project: upsert Project, its Documents, all SemanticUnits for that project, and project_dependencies. |
| `gkg-sync-document` | `{ documentId: string }` | Phase 2 for one document (upsert Document + BELONGS_TO). Optionally Phase 3 for units that have `document_id = documentId` only (if doing doc-scoped incremental). |
| `gkg-sync-entity-type` | `{ projectId: string, entityType: string }` | Phase 3 for one project and one ADPA entity type (e.g. `requirements`, `risks`). Enables parallelizing by entity type. |
| `gkg-sync-incremental` | `{ since: string (ISO datetime) }` | Projects/documents/entities updated after `since`; requires querying ADPA by `updated_at`. |

**Orchestration**: `gkg-sync-project` can run Phase 1–2 in-process, then either (a) run Phase 3 in one go (all entity types in a single job), or (b) enqueue one `gkg-sync-entity-type` per entity type and wait for completion (similar to extraction parent/child pattern).

---

## 5. Entity-Type Mapping (ADPA → GKG)

Sync reads from PostgreSQL and writes `SemanticUnit` nodes. Table names and primary keys come from the DB; “summary” is used for `SemanticUnit.summary`; “document_id source” is the column used for `EXTRACTED_FROM` (and for `SemanticUnit.document_id`).

**Conventions**:

- **ADPA table**: PostgreSQL table name (e.g. `requirements`).
- **GKG `adpa_entity_type`**: PascalCase label used in GKG (e.g. `Requirement`).
- **PK column**: Primary key column in ADPA (almost always `id`).
- **Summary**: Column(s) to concatenate or use as `SemanticUnit.summary` (e.g. `title`, `name`, `description` truncated).
- **project_id**: Column; always `project_id` in ADPA.
- **document_id**: Column for source document; often `source_document_id` or `document_id`.

### 5.1 Core mapping table (Phase 3)

| ADPA table | GKG `adpa_entity_type` | PK | Summary source | document_id column |
|------------|------------------------|----|----------------|--------------------|
| `requirements` | `Requirement` | `id` | `title` or `name` | `source_document_id` |
| `risks` | `Risk` | `id` | `title` or `name` | `source_document_id`¹ |
| `stakeholders` | `Stakeholder` | `id` | `name` | — |
| `milestones` | `Milestone` | `id` | `name` | `source_document_id`² |
| `constraints` | `Constraint` | `id` | `title` or `name` | `source_document_id` |
| `governance_decisions` | `GovernanceDecision` | `id` | `description` or `decision_id` | `source_document_id` |
| `action_items` | `ActionItem` | `id` | `title` or `description` | `source_document_id` |
| `deliverables` | `Deliverable` | `id` | `name` or `description` | `source_document_id` |
| `phases` | `Phase` | `id` | `name` | `source_document_id` |
| `activities` | `Activity` | `id` | `name` or `title` | `source_document_id` |
| `work_items` | `WorkItem` | `id` | `title` or `name` | `source_document_id` |
| `scope_baseline` | `ScopeBaseline` | `id` | `name` or summary | `source_document_id` |
| `wbs_nodes` | `WBSNode` | `id` | `name` or `code` | `source_document_id` |
| `budget_baseline` | `BudgetBaseline` | `id` | `name` or summary | `source_document_id` |
| `schedule_baseline` | `ScheduleBaseline` | `id` | `name` or summary | `source_document_id` |
| `best_practices` | `BestPractice` | `id` | `title` or `description` | `source_document_id` |
| `success_criteria` | `SuccessCriteria` | `id` | `description` or `name` | `source_document_id` |
| `opportunities` | `Opportunity` | `id` | `title` or `description` | `source_document_id` |
| `issues` (or `issue_log`) | `Issue` | `id` | `title` or `description` | `source_document_id` |
| `dt_assets` / `extracted_dt_assets` | `DTAsset` | `id` | `name` | `source_document_id` |

¹ Some risk tables use `document_id`; normalize to whichever column exists.  
² Same for milestones, etc.; use the column that exists in the current schema.

For any **other** entity type in the extraction registry: use the ADPA table name in PascalCase as `adpa_entity_type`, and `id` / `project_id` / `source_document_id` (or `document_id`) when present. Omit `document_id` in GKG when the ADPA row has no source document.

### 5.2 Extended mapping (extraction registry alignment)

These match the extraction queue’s entity types. Use the same rules: PK `id`, `project_id`, and `source_document_id` when the table has it. Summary = `title` or `name` or `description` (truncated, e.g. 500 chars).

| ADPA table | GKG `adpa_entity_type` |
|------------|------------------------|
| `success_criteria` | `SuccessCriteria` |
| `best_practices` | `BestPractice` |
| `phases` | `Phase` |
| `resources` | `Resource` |
| `technologies` | `Technology` |
| `quality_standards` | `QualityStandard` |
| `compliance_security` | `ComplianceSecurity` |
| `scope_items` | `ScopeItem` |
| `activities` | `Activity` |
| `team_agreements` | `TeamAgreement` |
| `development_approaches` | `DevelopmentApproach` |
| `project_iterations` | `ProjectIteration` |
| `work_items` | `WorkItem` |
| `capacity_plans` | `CapacityPlan` |
| `performance_measurements` | `PerformanceMeasurement` |
| `earned_value_metrics` | `EarnedValueMetric` |
| `opportunities` | `Opportunity` |
| `risk_responses` | `RiskResponse` |
| `performance_actuals` | `PerformanceActual` |
| `schedule_baselines` | `ScheduleBaseline` |
| `governance_decisions` | `GovernanceDecision` |
| `approval_workflows` | `ApprovalWorkflow` |
| `steering_committees` | `SteeringCommittee` |
| `change_control_boards` | `ChangeControlBoard` |
| `policy_compliance` | `PolicyCompliance` |
| `scope_baseline` | `ScopeBaseline` |
| `wbs_nodes` | `WBSNode` |
| `scope_change_requests` | `ScopeChangeRequest` |
| `scope_verification` | `ScopeVerification` |
| `requirements_traceability` | `RequirementsTraceability` |
| `dt_assets` / `extracted_dt_assets` | `DTAsset` |
| `schedule_activities` | `ScheduleActivity` |
| `critical_path` | `CriticalPath` |
| `schedule_variances` | `ScheduleVariance` |
| `schedule_forecasts` | `ScheduleForecast` |
| `budget_baseline` / `budget_baselines` | `BudgetBaseline` |
| `cost_actuals` | `CostActual` |
| `cost_estimates` | `CostEstimate` |
| `funding_tranches` | `FundingTranche` |
| `financial_variances` | `FinancialVariance` |
| `procurement_costs` | `ProcurementCost` |
| `communication_logs` | `CommunicationLog` |
| `satisfaction_surveys` | `SatisfactionSurvey` |
| `stakeholder_issues` | `StakeholderIssue` |
| `relationship_health` | `RelationshipHealth` |

Implementation can build a single map from “ADPA table name” → `{ entityType, summaryColumn, documentIdColumn }` and use it for all Phase 3 syncs.

---

## 6. Idempotency and Cypher Patterns

All writes use MERGE so that re-runs do not duplicate nodes or relationships.

### 6.1 Phase 0 – Reference nodes

```cypher
MERGE (d:GovernanceDomain {code: $code}) ON CREATE SET d.name = $name;
MERGE (m:MaturityLevel {level: $level}) ON CREATE SET m.name = $name, m.criteria_summary = $criteria;
```

Run for each PMBOK domain and each maturity level (1–5). See [GKG_SCHEMA_CYPHER.md](./GKG_SCHEMA_CYPHER.md#3-optional-seed-pmbok-governancedomain-nodes).

### 6.2 Phase 1 – Project

```cypher
MERGE (p:Project {adpa_id: $projectId})
ON CREATE SET p.name = $name, p.created_at = $createdAt
ON MATCH SET p.name = $name, p.created_at = $createdAt;
```

### 6.3 Phase 2 – Document and BELONGS_TO

```cypher
MERGE (d:Document {adpa_id: $documentId})
ON CREATE SET d.project_id = $projectId, d.template_type = $templateType, d.title = $title, d.created_at = $createdAt
ON MATCH SET d.project_id = $projectId, d.template_type = $templateType, d.title = $title;

MATCH (p:Project {adpa_id: $projectId}), (d:Document {adpa_id: $documentId})
MERGE (d)-[:BELONGS_TO]->(p);
```

### 6.4 Phase 3 – SemanticUnit, BELONGS_TO, EXTRACTED_FROM

```cypher
MERGE (u:SemanticUnit {adpa_entity_type: $entityType, adpa_id: $adpaId})
ON CREATE SET
  u.project_id = $projectId,
  u.document_id = $documentId,
  u.summary = $summary,
  u.payload = $payload,
  u.synced_at = datetime()
ON MATCH SET
  u.project_id = $projectId,
  u.document_id = $documentId,
  u.summary = $summary,
  u.payload = $payload,
  u.synced_at = datetime();

MATCH (p:Project {adpa_id: $projectId}), (u:SemanticUnit {adpa_entity_type: $entityType, adpa_id: $adpaId})
MERGE (u)-[:BELONGS_TO]->(p);

// When document_id is not null
MATCH (d:Document {adpa_id: $documentId}), (u:SemanticUnit {adpa_entity_type: $entityType, adpa_id: $adpaId})
MERGE (u)-[:EXTRACTED_FROM]->(d);
```

Use separate statements or a single script with multiple parameters; `document_id` may be null — in that case only `BELONGS_TO` is created, not `EXTRACTED_FROM`.

### 6.5 Phase 4 – Project dependencies

```cypher
MATCH (a:Project {adpa_id: $sourceProjectId}), (b:Project {adpa_id: $targetProjectId})
MERGE (a)-[:DEPENDS_ON]->(b);
```

Run for each row in `project_dependencies` (source_project_id → target_project_id).

---

## 7. Batching and Transactions

- **Projects / Documents**: Small volumes; one transaction per project (all its documents) or per document is fine.
- **SemanticUnits**: For large projects, batch by entity type. E.g. fetch up to **500** rows per entity type, run one Neo4j transaction per batch (multiple MERGEs in one `session.run` or multiple `run` calls in one transaction). Then fetch the next 500 until done.
- **Neo4j driver**: Use a single session per job; use transactional functions (`session.executeWrite`) when the driver supports it so that each batch is one transaction.
- **Failure**: If a batch fails, retry that batch (idempotent). Optionally persist “last synced” per project/entity-type for incremental resumes.

---

## 8. Hook: Post-Extraction

After the **extraction parent** job completes (all `extract-entity-*` children finished), enqueue a GKG sync for that project so the graph is updated with newly extracted entities.

**Placement**: In `ExtractionOrchestrationService`, after the parent marks itself completed and before returning, call the queue to add a job:

- Job type: `gkg-sync-project`
- Payload: `{ projectId }` (from the extraction job)

**Condition**: Only enqueue when Neo4j is configured (`isNeo4jConfigured()`) and, if desired, when a feature flag or project setting allows GKG sync.

**Example** (pseudocode where the parent completes):

```ts
if (isNeo4jConfigured() && projectId) {
  await addJob('gkg-sync-project', { projectId }, { attempts: 2, backoff: { type: 'exponential', delay: 5000 } })
}
```

This requires a new queue (or reuse of an existing one) and a worker that processes `gkg-sync-project`.

---

## 9. API (On-Demand Trigger)

Example contract for an internal or admin-only API:

- `POST /api/gkg/sync`
  - Body: `{ "projectId"?: string, "documentId"?: string, "bootstrap"?: boolean }`
  - If `bootstrap`: run Phase 0 (and optionally full Phase 1–2).
  - If `projectId`: enqueue `gkg-sync-project` for that project (or run synchronously for small scope).
  - If `documentId`: enqueue `gkg-sync-document` for that document (and optionally Phase 3 for units with that document_id).
  - Returns `{ jobId?, status }` when a job is enqueued.

Auth and rate-limiting should follow existing ADPA patterns (e.g. authenticate, require admin or project membership).

---

## 10. Incremental Sync (Optional)

To sync only changed data:

1. **Watermark**: Store `last_synced_at` per project (or per project+entity_type) in PostgreSQL (e.g. `gkg_sync_state`) or derive from Neo4j `SemanticUnit.synced_at` (max per project).
2. **Queries**: For Phase 2, `SELECT * FROM documents WHERE project_id = $1 AND (updated_at > $since OR created_at > $since)`. For Phase 3, same per entity table: `WHERE project_id = $1 AND updated_at > $since`.
3. **SemanticUnits**: For units that were **deleted** in ADPA, either (a) leave them in Neo4j and rely on “stale” flags later, or (b) run a separate “reconcile” job that deletes SemanticUnit nodes whose `adpa_id` is no longer in the ADPA table. (b) requires careful handling of uniqueness and relationships.)

Start without incremental; add it when scaling or when scheduled jobs are introduced.

---

## 11. Implementation Checklist

- [ ] **Neo4j schema**: Run [GKG_SCHEMA_CYPHER.md](./GKG_SCHEMA_CYPHER.md) (constraints, indexes, seed domains/levels).
- [ ] **Bootstrap job**: Implement `gkg-bootstrap` (Phase 0 + optionally 1–2).
- [ ] **Project sync job**: Implement `gkg-sync-project` (Phases 1–4), with entity-type mapping and batching.
- [ ] **Document sync job**: Implement `gkg-sync-document` (Phase 2, optional Phase 3 for that document).
- [ ] **Queue**: Add `gkgSyncQueue` (or equivalent) and register processors for `gkg-bootstrap`, `gkg-sync-project`, `gkg-sync-document`.
- [ ] **Post-extraction hook**: In extraction parent completion path, enqueue `gkg-sync-project` when Neo4j is configured.
- [ ] **API**: Add `POST /api/gkg/sync` with optional `projectId` / `documentId` / `bootstrap`.
- [ ] **Logging and errors**: Log per-phase and per-entity-type counts; on failure, log projectId/documentId/entityType and rethrow or retry according to job policy.

---

## 12. File and Module Layout (Proposal)

- **`server/src/services/gkg/`** (or `server/src/modules/gkg/`)
  - `types.ts` – payload types, entity-type enum or map.
  - `mapping.ts` – ADPA table → GKG entity type, summary column, document_id column (driven by §5.1).
  - `cypher.ts` – parameterized Cypher builders or strings for Phase 0–4.
  - `syncProject.ts` – Phase 1–4 logic for one project (uses `getNeo4jDriver()`, `getNeo4jDatabase()`).
  - `syncBootstrap.ts` – Phase 0 + optional full 1–2.
  - `gkgSyncJob.ts` – queue job handler that calls syncBootstrap / syncProject / syncDocument.
- **Route**: `server/src/routes/gkg.ts` – `POST /api/gkg/sync` (and optionally `GET /api/gkg/status`).
- **Queue registration**: In `queueService.ts` (or equivalent), register `gkg-sync-project`, `gkg-sync-document`, `gkg-bootstrap` on a GKG queue.

This layout keeps GKG logic in one place and reuses existing Neo4j and queue patterns.
