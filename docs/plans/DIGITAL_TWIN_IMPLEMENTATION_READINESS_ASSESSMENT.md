# Digital Twin POC – Implementation Readiness Assessment

**Date**: 2026-01-23  
**Status**: Ready to start – **0% implementation** done; planning and infrastructure complete  
**Verdict**: You can begin Phase 1 now. No blocking dependencies.

---

## Executive Summary

| Area | Status | Notes |
|------|--------|------|
| **Planning** | Done | REVISED plan, design doc, risk assessment, mitigation plan, Cursor skills |
| **ADPA infrastructure** | Ready | Projects, baselines, documents, Bull, Redis, Socket.io, etc. |
| **Digital Twin code** | None | No migrations, services, routes, or UI yet |
| **Blockers** | None | Start with migration 663 + first service |

**Distance from starting implementation**: **Zero.** All prerequisites are met. The remaining work is to create the migration, services, and routes as specified in the plan.

---

## What Exists Today

### Planning and reference (complete)

- [DIGITAL_TWIN_POC_DESIGN.md](../docs/roadmap/DIGITAL_TWIN_POC_DESIGN.md) – design and schema
- [DIGITAL_TWIN_POC_IMPLEMENTATION_PLAN_REVISED.md](./DIGITAL_TWIN_POC_IMPLEMENTATION_PLAN_REVISED.md) – phased implementation
- [DIGITAL_TWIN_POC_RISK_ASSESSMENT.md](./DIGITAL_TWIN_POC_RISK_ASSESSMENT.md) – risks and alignment
- [DIGITAL_TWIN_POC_RISK_MITIGATION_PLAN.md](./DIGITAL_TWIN_POC_RISK_MITIGATION_PLAN.md) – 45 mitigations
- [skills/digital-twin-implementation.SKILL.md](../skills/digital-twin-implementation.SKILL.md) – correct usage
- [skills/digital-twin-safe-implementation.SKILL.md](../skills/digital-twin-safe-implementation.SKILL.md) – risk-aware workflow

### ADPA infrastructure (used by Digital Twin)

- **Projects**: `projectService`, `projects` routes, `projects` table
- **Companies**: `companies` routes, multi-tenancy
- **Documents & templates**: `documentGenerationService`, `templates`, `documents` tables
- **Baselines & drift**: `baselineService`, `driftDetectionService`
- **Jobs**: Bull queue, Redis
- **Real-time**: Socket.io
- **Auth**: JWT
- **Project membership**: `project_members` referenced (e.g. drift notifications)

### Migration and DB pattern

- Migrations: `server/migrations/NNN_description.sql` (e.g. `660_create_batch_files_table.sql`)
- Runners: `server/scripts/run-migration-NNN.ts` or `.js`
- `npm run migrate:361`, `migrate:401`, etc. – same pattern for 663

---

## What Does Not Exist (Gaps)

### 1. Database schema

- **Migration**: `server/migrations/663_create_digital_twin_tables.sql` is **not** present.
- **Tables**: None of `digital_twin_assets`, `digital_twin_asset_states`, `digital_twin_events`, `digital_twin_document_triggers`, `digital_twin_ingestion_sources`, `digital_twin_trigger_rules` exist.
- **Action**: Add the migration (SQL from REVISED plan), then a `run-migration-663` script, and run it.

### 2. Backend services

- **Missing**: `digitalTwinAssetService`, `digitalTwinEventService`, `digitalTwinTriggerService`, `digitalTwinIngestionService`, connectors, `digitalTwinStateUtils`.
- **Action**: Implement per Phase 1 of the REVISED plan.

### 3. API routes

- **Missing**: `digital-twin-assets`, `digital-twin-events`, `digital-twin-ingestion`, `digital-twin-triggers` routes and mount in `server`.
- **Action**: Add route modules and wire them in `server.ts`.

### 4. Frontend

- **Missing**: `components/digital-twin/*`, `app/projects/[id]/digital-twins/` page, “Digital Twins” tab on project.
- **Action**: Phase 2 (Week 3) per plan.

### 5. Tests

- **Missing**: `__tests__/services/digitalTwin*.test.ts`, `__tests__/utils/digitalTwinStateUtils.test.ts`, schema validation, RLS tests.
- **Action**: Add alongside Phase 1–2; use [digital-twin-safe-implementation](../skills/digital-twin-safe-implementation.SKILL.md) checklist.

### 6. RLS / app context (minor)

- **Plan**: RLS uses `current_setting('app.current_user_id')` and `project_members`.
- **Reality**: No `set_config` / `app.current_user_id` in current codebase.
- **Action**: Either (a) add middleware to set `app.current_user_id` per request and keep RLS as designed, or (b) rely on application-level `project_id` scoping and adjust RLS accordingly. Decide before implementing RLS.

---

## Risk Mitigation vs. “Ready to Start”

The risk plan says: *“Implement all Priority 1 mitigations before starting development.”*

Priority 1 includes:

1. Schema validation (Strategy 1.1)  
2. Event idempotency (2.1)  
3. Event queue + retry (2.2)  
4. Rule evaluation tests (3.1)  
5. Multi-hash approach (4.1)  

**Assessment**: These are **implemented during** Phase 1 (schema, event service, trigger service, state utils), not before it. You can start Phase 1 and build them in as you go:

- **Schema validation**: Add `__tests__/migrations/digital-twin-schema-validation.test.ts` once 663 exists; run before merging.
- **Event idempotency / queue / retry**: Implement inside `digitalTwinEventService` and event-processing flow.
- **Rule evaluation tests**: Add `digitalTwinTriggerService.test.ts` when the trigger service exists.
- **Multi-hash**: Implement in `digitalTwinStateUtils` when adding state comparison.

So you are **ready to start**; treat Priority 1 mitigations as part of Phase 1, not a separate pre-phase.

---

## Recommended “Start” Sequence

### Step 1 – Migration (Day 1)

1. Add `server/migrations/663_create_digital_twin_tables.sql` using the SQL from the REVISED plan (tables, indexes, functions, triggers, RLS).
2. Fix circular FK: `digital_twin_assets.current_state_id` → `digital_twin_asset_states` and `digital_twin_asset_states.source_event_id` → `digital_twin_events`. The plan uses deferred constraints or create order (events → states → assets); ensure the migration does the same.
3. Add `server/scripts/run-migration-663.ts` (follow `run-migration-660.ts` pattern).
4. Run against dev DB: `npm run migrate:663` (or equivalent).
5. Optionally add a schema validation test that asserts 663’s schema matches the design doc.

### Step 2 – First service and routes (Week 1)

1. `server/src/utils/digitalTwinStateUtils.ts` – `calculateStateHash`, `detectChangedFields`, etc.
2. `server/src/services/digitalTwinAssetService.ts` – assets CRUD, current state, history.
3. `server/src/routes/digital-twin-assets.ts` – mount at `/api/digital-twin/assets`.
4. Register routes in `server.ts`.

### Step 3 – Event and trigger backbone (Week 1–2)

1. `digitalTwinEventService` – ingest, dedup, queue, process, retry.
2. `digitalTwinTriggerService` – rules, evaluation, document triggers.
3. `digital-twin-events` and `digital-twin-triggers` routes.
4. Integrate with Bull and existing document generation.

### Step 4 – Ingestion and UI (Week 2–3)

1. `digitalTwinIngestionService` + `digital-twin-ingestion` routes.
2. `components/digital-twin/*` and `app/projects/[id]/digital-twins` page.

Use [digital-twin-implementation.SKILL.md](../skills/digital-twin-implementation.SKILL.md) and [digital-twin-safe-implementation.SKILL.md](../skills/digital-twin-safe-implementation.SKILL.md) throughout.

---

## Checklist: “Ready to Start”?

| Prerequisite | Status |
|--------------|--------|
| Design doc and REVISED plan agreed | Yes |
| Risk assessment and mitigation plan | Yes |
| Cursor skills for implementation and safety | Yes |
| ADPA projects, documents, templates, Bull, Redis, Socket.io | Yes |
| Migration 663 created and run | No → **first deliverable** |
| RLS / `app.current_user_id` strategy | Open → **decide before RLS** |

---

## Summary

- **Planning**: Complete.  
- **Infrastructure**: Ready.  
- **Digital Twin implementation**: 0% – no schema, services, routes, or UI yet.  
- **Distance from starting**: **None.**  

**Next concrete action**: Add `663_create_digital_twin_tables.sql`, implement `run-migration-663`, run it, then implement `digitalTwinStateUtils` and `digitalTwinAssetService` plus asset routes. Proceed along the REVISED plan and safe-implementation skill, and close the RLS/app-context design choice early.
