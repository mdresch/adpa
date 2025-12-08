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

### Phased Migration
1) **Scaffold base utilities** next to the current service; no behavior change.
2) **Migrate one entity end-to-end (work_items)** to prove the path; wire registry/orchestrator to use the new module for that entity only. Add parity tests vs legacy output on fixtures.
3) **Migrate by groups**, running tests after each:
   - Performance Domain: work_items, capacity_plans, performance_measurements, earned_value_metrics, opportunities, risk_responses, performance_actuals.
   - Core: stakeholders, requirements, risks, milestones, constraints, activities, deliverables, scope_items, success_criteria.
   - Tier-2 (governance/scope/schedule/finance/resources/risk/stakeholders_ops) in small batches.
4) **Retire legacy code** from `projectDataExtractionService.ts` as each entity moves; keep a thin façade delegating to the orchestrator.
5) **Finalize**: remove dead helpers, keep registry-driven orchestrator as the single entry point.

### Compatibility & Contracts
- Keep queue processor signatures and return shapes unchanged.
- Preserve logging keys/levels and metrics labels.
- Keep cache semantics (project + content hash + provider/model).
- Maintain strict `source_document_id` resolution/rejection rules and dedupe behaviors.

### Testing Strategy
- Unit: prompt builders, parsers, dedupers per entity.
- Contract (golden) tests: compare new extractor output vs legacy for the same fixture docs.
- Integration: run `project-data-extraction` job against a seeded project; assert per-entity counts.
- Regression: lint + typecheck; smoke dev run on a sample project.

### Risks & Mitigations
- Behavior drift → golden-file comparisons during each migration.
- Cache key mismatch → reuse existing cache helper; verify cache hits post-migration.
- DB write regressions → reuse existing SQL via shared persistence helper; incremental rollout.
- Queue impact → migrate incrementally; keep legacy path as fallback until entity is proven.

### Work Plan (incremental)
1) Add base scaffolding (context, parser, resolver, deduper, persistence interface, registry).
2) Migrate `work_items` first; validate against Activity List sample; add parity tests.
3) Migrate remaining Performance Domain entities.
4) Migrate Core entities.
5) Migrate Tier-2 entities in batches with tests.
6) Remove legacy blocks from `projectDataExtractionService.ts`; leave a delegating shell.

### Deliverables
- Modular extraction folder structure + registry-driven orchestrator.
- Parity tests (golden) and integration smoke coverage.
- Shrunk `projectDataExtractionService.ts`, delegating to the new orchestrator.
