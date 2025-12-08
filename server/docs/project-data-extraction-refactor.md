## Refactor Plan: `projectDataExtractionService.ts`

### Goals
- Break down the 8k+ line monolith into focused, testable modules.
- Preserve existing behavior (logging, caching, queue contracts, DB writes).
- Enable incremental rollout with low regression risk.

### Scope (MVP)
- Extract each entity’s extraction + persistence into its own module.
- Centralize shared utilities: prompt builders, parsing/cleanup, source-document resolution, dedupe, persistence helpers, caching wrapper.
- Keep queue/orchestrator inputs & outputs unchanged.

### Proposed Structure
- `src/services/extraction/`
  - `base/ExtractionContext.ts` (projectId, userId, docs, documentMap, provider/model, logger, metrics hooks)
  - `base/PromptBuilder.ts`
  - `base/Parser.ts` (JSON parse, quote/control fixes, number coercion, arrays)
  - `base/SourceDocumentResolver.ts`
  - `base/Deduper.ts`
  - `base/Persistence.ts` (DB write helpers per entity)
  - `base/ExtractionResult.ts` (entities, rejected count, stats)
  - `cache/AICacheService` (wrap existing cache for DI)
  - `entities/<entity>/`
    - `extract<Pascal>.ts` (prompt + AI call + parse)
    - `save<Pascal>.ts` (persist, dedupe rules)
    - `index.ts` exporting `{ extract, save }`
- `ExtractionRegistry.ts` maps entity type → { extract, save }.
- `ExtractionOrchestrator.ts` consumes registry; queue handlers call orchestrator (thin shell).

### Complete Entity Inventory

All entities projected to be extracted from documentation, organized by tier:

#### Tier 1 / Core Entities (High Priority)
- `stakeholders` (46 projected)
- `requirements` (282 projected)
- `risks` (90 projected)
- `milestones` (46 projected)
- `constraints` (91 projected)
- `success_criteria` (98 projected)
- `deliverables` (173 projected)
- `scope_items` (114 projected)
- `activities` (94 projected)

#### Tier 1 / Performance Domain Entities
- `work_items` (25 projected)
- `capacity_plans` (51 projected)
- `performance_measurements` (52 projected)
- `earned_value_metrics` (1 projected)
- `opportunities` (45 projected)
- `risk_responses` (0 projected)
- `performance_actuals` (9 projected)

#### Project Phases & Iterations
- `project_phases` / `phases` (35 projected)
- `project_iterations` (37 projected)
- `performance_domains` (meta-entity for domain grouping)

#### Tier 2 / Governance & Approvals
- `governance_decisions` (0 projected)
- `approval_workflows` (0 projected)
- `steering_committees` (0 projected)
- `change_control_boards` (0 projected)
- `policy_compliance` (0 projected)

#### Tier 2 / Scope & Requirements Operations
- `scope_baselines` (0 projected)
- `wbs_nodes` (0 projected)
- `scope_change_requests` (0 projected)
- `requirements_traceability` (0 projected)
- `scope_verification` (0 projected)

#### Tier 2 / Schedule Management
- `schedule_baselines` (0 projected)
- `schedule_activities` (0 projected)
- `critical_path` (0 projected)
- `schedule_variances` (0 projected)
- `schedule_forecasts` (0 projected)

#### Tier 2 / Cost & Finance
- `budget_baselines` (0 projected)
- `cost_actuals` (0 projected)
- `cost_estimates` (0 projected)
- `funding_tranches` (0 projected)
- `financial_variances` (0 projected)
- `procurement_costs` (0 projected)

#### Tier 2 / Resource Management
- `resource_assignments` (0 projected)
- `resource_pool` (0 projected)
- `capacity_forecasts` (0 projected)
- `utilization_records` (0 projected)
- `resource_conflicts` (0 projected)
- `onboarding_offboarding` (0 projected)
- `resources` (33 projected - if distinct from resource_* entities above)

#### Tier 2 / Risk Management
- `risk_assessments` (0 projected)
- `risk_response_plans` (0 projected)
- `risk_triggers` (0 projected)
- `risk_reviews` (0 projected)
- `contingency_reserves` (0 projected)
- `risk_metrics` (0 projected)

#### Tier 2 / Quality & Compliance
- `quality_standards` (0 projected)
- `compliance_security` (0 projected)
- `best_practices` (0 projected)

#### Tier 2 / Communications & Engagement
- `engagement_actions` (0 projected)
- `communication_logs` (0 projected)
- `satisfaction_surveys` (0 projected)
- `stakeholder_issues` (0 projected)
- `relationship_health` (0 projected)

#### Tier 2 / Knowledge & Technology
- `knowledge_domains` (meta-entity)
- `technologies` (30 projected)
- `development_approach` (1 projected)
- `team_agreements` (8 projected)

#### Aggregate/Meta Entities
- `all_entities` (rollup entity - aggregates counts across all above entities)

**Total Entity Count**: 80+ distinct entity types to be migrated.

**Breakdown by Tier**:
- **Tier 1 / Core**: 9 entities
- **Tier 1 / Performance Domain**: 7 entities
- **Project Phases & Iterations**: 4 entities (including meta domain for performance_domains)
- **Tier 2**: 46 entities across 9 domains
- **Aggregate/Meta**: 1 entity (all_entities rollup)

**Total**: ~67 distinct extraction entities + meta/rollup entities = 80+ total entity types.

**Note**: Projected counts (in parentheses) indicate expected extraction volume from typical documentation sets. Entities with 0 projected may still be extracted but are less common or domain-specific. All entities listed above must be migrated to the new modular structure.

**Per-project variability**: Extraction volumes are dynamic and depend on the documents in each project. Below is the current projection for project `45083436-7e90-4ecf-aa42-e4a73c4b64b7` (RAG integration active). Use this as a runtime snapshot only; the plan remains comprehensive for all entities.
- Tier 1 / Core: stakeholders 176, requirements 622, risks 62, milestones 73, constraints 327, success_criteria 494, deliverables 225, scope_items 339, activities 355.
- Tier 1 / Performance Domain: work_items 133, capacity_plans 123, performance_measurements 138, earned_value_metrics 9, opportunities 98, risk_responses 0, performance_actuals 22.
- Project Phases & Iterations: phases 93, project_iterations 68.
- Tier 2 highlights (non-zero): best_practices 316, resources 255, technologies 161, quality_standards 196, compliance_security 0, team_agreements 33, development_approach 1. All other Tier-2 entities currently 0 in this project snapshot.

### Phased Migration
1) **Scaffold base utilities** next to the current service; no behavior change.
2) **Migrate one entity end-to-end (work_items)** to prove the path; wire registry/orchestrator to use the new module for that entity only. Add parity tests vs legacy output on fixtures.
3) **Migrate by groups**, running tests after each (see Complete Entity Inventory above for full list):
   - **Tier 1 / Performance Domain** (7 entities): work_items, capacity_plans, performance_measurements, earned_value_metrics, opportunities, risk_responses, performance_actuals.
   - **Tier 1 / Core** (9 entities): stakeholders, requirements, risks, milestones, constraints, activities, deliverables, scope_items, success_criteria.
   - **Project Phases & Iterations** (4 entities): project_phases, phases, project_iterations, performance_domains.
   - **Tier 2 / Governance & Approvals** (5 entities): governance_decisions, approval_workflows, steering_committees, change_control_boards, policy_compliance.
   - **Tier 2 / Scope & Requirements Ops** (5 entities): scope_baselines, wbs_nodes, scope_change_requests, requirements_traceability, scope_verification.
   - **Tier 2 / Schedule** (5 entities): schedule_baselines, schedule_activities, critical_path, schedule_variances, schedule_forecasts.
   - **Tier 2 / Cost & Finance** (6 entities): budget_baselines, cost_actuals, cost_estimates, funding_tranches, financial_variances, procurement_costs.
   - **Tier 2 / Resources** (7 entities): resource_assignments, resource_pool, capacity_forecasts, utilization_records, resource_conflicts, onboarding_offboarding, resources.
   - **Tier 2 / Risk** (6 entities): risk_assessments, risk_response_plans, risk_triggers, risk_reviews, contingency_reserves, risk_metrics.
   - **Tier 2 / Quality & Compliance** (3 entities): quality_standards, compliance_security, best_practices.
   - **Tier 2 / Comms & Engagement** (5 entities): engagement_actions, communication_logs, satisfaction_surveys, stakeholder_issues, relationship_health.
   - **Tier 2 / Knowledge & Technology** (4 entities): knowledge_domains, technologies, development_approach, team_agreements.
   - **Aggregate/Meta** (1 entity): all_entities (rollup - ensure orchestrator maintains legacy aggregate outputs across all above entity sets).
4) **Retire legacy code** from `projectDataExtractionService.ts` as each entity moves; keep a thin façade delegating to the orchestrator.
5) **Finalize**: remove dead helpers, keep registry-driven orchestrator as the single entry point.

### Compatibility & Contracts
- Keep queue processor signatures and return shapes unchanged.
- Preserve logging keys/levels and metrics labels.
- Keep cache semantics (project + content hash + provider/model).
- Maintain strict `source_document_id` resolution/rejection rules and dedupe behaviors.

### Feature Flags & Rollback Strategy
- **Per-Entity Feature Flags**: Implement feature flags for each entity to enable/disable new extractor independently.
  - Environment variable: `EXTRACTION_USE_NEW_<ENTITY>` (e.g., `EXTRACTION_USE_NEW_WORK_ITEMS=true`)
  - Registry checks flag before routing to new vs legacy extractor.
  - Allows instant rollback per entity without code deployment.
- **Dual-Run Mode** (Phase 1 entities only): For first 2-3 migrated entities, run both legacy and new extractors in parallel.
  - Log structured diffs when outputs diverge (entity counts, field values, dedupe decisions).
  - Do not fail job on divergence; emit warnings for manual review.
  - Disable dual-run after entity is proven stable (2-3 successful production runs).
- **Percentage Rollout**: Optional gradual rollout per entity (e.g., 10% → 50% → 100% of jobs use new extractor).

### Testing Strategy
- **Unit Tests**: 
  - Prompt builders: assert prompt structure, variable substitution, token count estimation.
  - Parsers: JSON parse, quote/control fixes, number coercion, array handling, edge cases (null, empty, malformed).
  - Dedupers: dedupe key generation, matching logic, conflict resolution per entity.
  - Source document resolvers: exact match, fuzzy match, missing document, ambiguous cases.
  - Persistence helpers: upsert logic, transaction boundaries, error handling.
- **Contract (Golden) Tests**: 
  - Compare new extractor output vs legacy for the same fixture docs.
  - Store expected outputs as golden files in `__tests__/fixtures/golden/`.
  - Run on each entity migration; fail if output diverges (with configurable tolerance for non-breaking changes).
  - Include rejected entity counts, dedupe decisions, and source document assignments in comparison.
- **Integration Tests**:
  - Run `project-data-extraction` job against seeded project with known document set.
  - Assert per-entity counts match expected (created, rejected, skipped) for all 80+ entity types.
  - Verify source_document_id assignments are correct.
  - Validate cache hit rates are within expected range.
  - Test all entity groups: Tier 1 (Performance Domain + Core), Project Phases, Tier 2 (all 9 domains), and aggregate rollups.
- **Regression Tests**:
  - Lint + typecheck (TypeScript strict mode).
  - Smoke dev run on sample project with all entity types.
  - Performance regression: job duration should not increase >20% vs baseline.
  - Cache regression: cache hit rate should remain stable.
- **Edge Case Tests**:
  - Missing source documents, malformed metadata, circular references.
  - Empty document sets, AI provider failures, network timeouts.
  - Concurrent extraction of same entity type.
  - Retry scenarios (idempotency validation).

### Idempotency & Deduplication
- **Deduplication Keys**: Define explicit dedupe keys per entity in `base/Deduper.ts`.
  - Example: `work_items` → `source_document_id + normalized_name + normalized_description_hash`
  - Document dedupe rules per entity in entity module's `save<Pascal>.ts`.
- **Idempotent Persistence**: All persistence helpers must use upsert semantics (PostgreSQL `ON CONFLICT`).
  - Preserve existing `ON CONFLICT DO UPDATE` logic from legacy service.
  - Ensure retry-safe: re-running extraction job on same documents produces identical DB state.
- **Dedupe Validation**: Add unit tests asserting dedupe behavior matches legacy for each entity.

### Cache Parity & Validation
- **Cache Key Stability**: Reuse existing cache helper wrapper; verify cache key generation matches legacy exactly.
  - Format: `project:{projectId}:extraction:{entity}:{contentHash}:{provider}:{model}`
  - Add unit test comparing cache keys generated by new vs legacy for same inputs.
- **Cache Hit Rate Monitoring**: 
  - Log cache hit/miss counts per entity during migration phase.
  - Assert cache hit rate remains stable (within 5% of baseline) after migration.
  - Add metrics: `extraction_cache_hits_total{entity}` and `extraction_cache_misses_total{entity}`.

### Transaction Boundaries
- **Per-Entity Transactions**: Each entity's `save<Pascal>.ts` should wrap its batch writes in a transaction.
  - Use `BEGIN/COMMIT` for multi-row inserts within single entity.
  - Rollback on any parse/persistence error for that entity; do not fail entire job.
- **Cross-Entity Isolation**: Entities are independent; failure in one entity does not rollback others.
  - Orchestrator catches per-entity errors and continues with remaining entities.
  - Log entity-level failures separately; job succeeds if at least one entity extracted successfully.
- **Transaction Scope Documentation**: Document transaction boundaries in `base/Persistence.ts` interface.

### Error Handling & Drift Detection
- **Structured Diff Logging**: When dual-run mode detects divergence, log structured diff:
  ```typescript
  {
    entity: 'work_items',
    legacy_count: 15,
    new_count: 14,
    field_diffs: [{ field: 'name', legacy: 'Task A', new: 'Task A (updated)' }],
    dedupe_diffs: [{ reason: 'different_normalization' }]
  }
  ```
- **Automatic Fallback**: In dual-run mode, if diff exceeds threshold (configurable, default: 10% count difference), automatically fallback to legacy for that entity and alert.
- **Error Classification**: Categorize errors as:
  - **Transient** (AI rate limit, network) → retry with exponential backoff.
  - **Parse errors** (malformed JSON) → log and skip entity, continue job.
  - **Validation errors** (missing required fields) → reject entity, log to `rejected_count`.
  - **DB errors** (constraint violation) → rollback entity transaction, log error, continue.

### Queue & Back-Pressure Considerations
- **Concurrency Limits**: Add configurable concurrency limit for parallel entity extractions.
  - Default: 3 entities in parallel (to avoid overwhelming AI provider).
  - Configurable via `EXTRACTION_MAX_CONCURRENT_ENTITIES` env var.
- **Job Duration Monitoring**: Track job duration per entity and overall.
  - Metrics: `extraction_duration_seconds{entity}` histogram.
  - Alert if job duration increases >20% post-migration.
- **Rate Limiting**: Preserve existing rate limiting behavior (if any) for AI calls.
  - Ensure new extractors respect same rate limits as legacy.
  - Add throttling if concurrent extractions exceed provider limits.

### Source Document Resolution Edge Cases
- **Test Coverage Requirements**: Add explicit test fixtures for:
  - Missing source document (document referenced but not in `documentMap`).
  - Multiple candidate documents (ambiguous resolution).
  - Malformed metadata (invalid `source_document_id` format).
  - Circular references (document A references B, B references A).
- **Resolution Rules Documentation**: Document resolution algorithm in `base/SourceDocumentResolver.ts`:
  - Priority order: exact match → fuzzy match → fallback to first document.
  - Rejection criteria: document not found → entity marked as `rejected`, reason logged.
- **Validation**: Add unit tests for each edge case with expected behavior.

### Metrics & Logging Parity Checklist
- **Logging Contract Test**: Add contract test asserting log fields match legacy:
  - Log keys: `extraction.entity`, `extraction.count`, `extraction.duration`, `extraction.cache_hit`
  - Log levels: `info` for success, `warn` for partial failures, `error` for entity failures.
- **Metrics Labels**: Verify metric labels match existing:
  - `extraction_entities_total{entity, status}` (status: success, rejected, error)
  - `extraction_duration_seconds{entity}`
  - `extraction_cache_hits_total{entity}`
- **Structured Logging**: Ensure all logs use structured format (JSON in production) matching legacy format.

### Risks & Mitigations
- Behavior drift → golden-file comparisons during each migration + dual-run mode for first entities.
- Cache key mismatch → reuse existing cache helper; verify cache hits post-migration + cache key unit tests.
- DB write regressions → reuse existing SQL via shared persistence helper; incremental rollout + transaction isolation.
- Queue impact → migrate incrementally; keep legacy path as fallback until entity is proven + feature flags.
- Idempotency failures → explicit dedupe key definitions + upsert semantics + retry tests.
- Performance degradation → job duration monitoring + concurrency limits + rate limiting preservation.

### Work Plan (incremental)
1) **Base Scaffolding**:
   - Add base utilities (context, parser, resolver, deduper, persistence interface, registry).
   - Implement feature flag system and dual-run mode infrastructure.
   - Add cache wrapper with key validation tests.
   - Set up transaction boundaries and error handling framework.
   - Create metrics/logging contract test framework.

2) **First Entity Migration (`work_items`)**:
   - Migrate `work_items` end-to-end (extract + save).
   - Add golden file tests comparing new vs legacy output.
   - Enable dual-run mode for `work_items` only.
   - Validate cache hit rates, job duration, and entity counts match legacy.
   - Document dedupe keys and transaction boundaries.
   - After 2-3 successful production runs, disable dual-run and enable feature flag.

3) **Performance Domain Entities (Tier 1)**:
   - Migrate remaining Performance Domain entities one at a time.
   - Run tests after each: capacity_plans, performance_measurements, earned_value_metrics, opportunities, risk_responses, performance_actuals.
   - Enable feature flag per entity after validation.
   - Monitor metrics for each entity independently.

4) **Core Entities (Tier 1)**:
   - Migrate Core entities in batches: stakeholders, requirements, risks, milestones, constraints, activities, deliverables, scope_items, success_criteria.
   - Run integration tests after each batch.
   - Validate source document resolution for all core entities.

5) **Project Phases & Iterations**:
   - Migrate all phase-related entities: project_phases, phases, project_iterations, performance_domains.
   - Verify phase-based rollups and any downstream consumers relying on phase segmentation.
   - Run golden tests to ensure phase ordering and mapping remain unchanged.
   - Ensure domain grouping (performance_domains) maintains legacy behavior.

6) **Tier-2 Entities** (46 entities total across 9 domains - see Complete Entity Inventory):
   - **Governance & Approvals** (5 entities): governance_decisions, approval_workflows, steering_committees, change_control_boards, policy_compliance.
   - **Scope & Requirements Ops** (5 entities): scope_baselines, wbs_nodes, scope_change_requests, requirements_traceability, scope_verification.
   - **Schedule** (5 entities): schedule_baselines, schedule_activities, critical_path, schedule_variances, schedule_forecasts.
   - **Cost & Finance** (6 entities): budget_baselines, cost_actuals, cost_estimates, funding_tranches, financial_variances, procurement_costs.
   - **Resources** (7 entities): resource_assignments, resource_pool, capacity_forecasts, utilization_records, resource_conflicts, onboarding_offboarding, resources.
   - **Risk** (6 entities): risk_assessments, risk_response_plans, risk_triggers, risk_reviews, contingency_reserves, risk_metrics.
   - **Quality & Compliance** (3 entities): quality_standards, compliance_security, best_practices.
   - **Comms & Engagement** (5 entities): engagement_actions, communication_logs, satisfaction_surveys, stakeholder_issues, relationship_health.
   - **Knowledge & Technology** (4 entities): knowledge_domains, technologies, development_approach, team_agreements.
   - Migrate in small batches by domain (2-3 entities per batch).
   - Run full integration test suite after each batch.
   - Monitor for performance regressions.

7) **Legacy Cleanup**:
   - Remove legacy blocks from `projectDataExtractionService.ts` as each entity is proven.
   - Keep thin façade delegating to orchestrator until all entities migrated.
   - Remove feature flags after all entities migrated and stable (2+ weeks).
   - Remove dual-run infrastructure (keep code for future migrations).

8) **Finalization**:
   - Remove dead helpers and legacy code paths.
   - Update documentation with new architecture.
   - Performance audit: compare final job duration vs baseline.
   - Cache audit: verify cache hit rates maintained.

### Questions & Clarifications Needed
- **Dual-Run in Production**: Should we dual-run legacy + new for first entity in production to emit diffs before switching queue handler? (Recommended: Yes, for first 2-3 entities)
- **Per-Entity Configuration**: Do we need per-entity configuration for token limits/model selection, or inherit current service defaults? (Assumption: Inherit defaults initially, make configurable if needed)
- **Legacy Holdouts**: Are there any entities that must remain on legacy longer due to downstream consumers not covered by queue contract? (To be determined during migration)
- **Acceptance Criteria**: What constitutes "proven stable" for an entity? (Proposed: 2-3 successful production runs with no drift, cache hit rate stable, job duration within 10% of baseline)

### Deliverables
- Modular extraction folder structure + registry-driven orchestrator.
- Feature flag system for per-entity rollout and rollback.
- Dual-run mode infrastructure (for first entity migrations).
- Parity tests (golden files) and comprehensive integration test coverage.
- Cache parity validation and monitoring.
- Transaction boundary documentation and error handling framework.
- Metrics and logging contract tests.
- Shrunk `projectDataExtractionService.ts`, delegating to the new orchestrator.
- Migration runbook documenting per-entity migration steps and validation criteria.
