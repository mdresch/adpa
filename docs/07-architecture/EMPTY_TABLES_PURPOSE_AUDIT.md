# Empty Tables Purpose Audit

**Date**: 2026-07-05
**Trigger**: Post-migration audit after the Supabase → Azure Database for PostgreSQL cutover. Of 437 tables now on Azure, 203 hold zero rows (matching zero rows on the old Supabase source — this is not a migration artifact, these tables were already empty in production).
**Scope**: This document explains *why* each empty table exists — the feature it was built for, whether that feature is actually wired into the running application, and whether it should be trusted, finished, or removed. It supplements (not replaces) `DATABASE_SCHEMA_OVERVIEW.md` (structural/domain grouping, dated 2025-10-31) and `database-schema-audit.md` (auto-generated column/index dump).
**Method**: Every table below was traced to its creating migration and cross-referenced against `server/src/{routes,services,modules}` for actual read/write usage, plus any related `SKILL.md` or design doc.

## Status legend

- **wired** — real application code queries this table (reads and/or writes). Empty just means the feature hasn't produced data yet in this environment.
- **wired (read-only)** — application code reads from it, but no code path anywhere writes to it. Structurally guaranteed to stay empty until a writer is built.
- **stub** — no application code references it at all. Schema was built ahead of (or instead of) the feature; likely dead or paused.
- **superseded** — a different, actively-used table now serves this purpose; this one is a stale remnant.

---

## ⚠️ Critical finding (resolved): a stale, dangerous cleanup script existed

`scripts/cleanup-empty-tables.sql` was a **proposed, never-executed** script (it required "approval from architecture team" per its own header) that `DROP TABLE ... CASCADE`d 43 tables it believed were empty and unused, plus an *optional* Phase 2 dropping 7 more.

It had gone dangerously out of date — it targeted several tables for deletion that now hold real production data (from the Supabase → Azure migration): `best_practices` (13,171 rows) and `constraints` (11,808 rows). It also targeted several tables now confirmed **wired** in this audit (e.g. `compression_feedback`, `context_freshness_policy_evaluations`, `context_freshness_policy_results`, `context_gathering_metrics`, `stage_jobs`) — actively used by real code paths, just not yet exercised in this environment.

**The script has been deleted (2026-07-05) to prevent it ever being run.** Several older planning docs (`docs/07-architecture/database-optimization-plan.md`, `DATABASE_CLEANUP_SUMMARY.md`, `ANALYTICS_IMPLEMENTATION_STATUS.md`, `SESSION_SUMMARY_ANALYTICS_DATABASE.md`, `docs/09-releases/session-notes/SESSION_SUMMARY_2025-10-18.md`) still reference it as an executable artifact — those are historical records of the Oct 2025 planning session and were left as-is, but the script itself no longer exists and should not be recreated without regenerating its table list against current row counts and cross-checking against the "wired" status column in this document.

---

## Cross-cutting issues found

- **Duplicate/conflicting schemas**: `document_dependencies` and `project_dependencies` each have two different `CREATE TABLE` definitions with different column shapes — one in the `server/migrations/` track (427/baseline), one in `server/src/database/migrations/002_ecs_system.sql`. Needs reconciliation to determine which is authoritative (see migration-pipeline note below).
- **Two migration pipelines**: as documented elsewhere in this project's history, `server/migrations/*.sql` and `server/src/database/migrations/*.sql` are separate, independently-tracked migration chains. Several tables below were created by the second pipeline and silently duplicate or conflict with the first — this audit surfaced a few more instances of that pattern beyond the ones already fixed during the Azure migration.
- **Read-only "wired" tables**: a large cluster (most of `template_*`, several `context_*`) are queried by `templateContextAnalyzer.ts` / `contextGathering` analyzers but have **no corresponding writer anywhere in the codebase**. These aren't bugs — the analyzers gracefully fall back to defaults on empty results — but they represent half-built features (read path shipped, write path never built).
- **Orphaned demo schema**: `quantum_stability_audit`, `infrared_thermal_conductance_log`, `optical_spectrum_processing_log` (from `003_quantum_stability.sql` / `002_ecs_system.sql`) are a fictional "Quantum Stability Monitor" — qubit coherence, thermal conductance, speed-of-light constants. Zero application code references them anywhere. This looks like a stray/test migration, not a real feature. Candidate for removal.

---

## Already documented elsewhere (not repeated in full here)

- **Playbook lifecycle** (`playbook_templates`, `playbook_versions`, `playbook_extracted_entities`, `playbook_drift_records`, `playbook_qa_results`, `playbook_escalation_records`, `playbook_resolution_analytics`) — see `server/src/database/migrations/SCHEMA_DOCUMENTATION.md` for full column-level detail. All wired to `server/src/services/playbookService.ts` and the drift/QA pipeline.
- ~60 other tables already have brief purpose one-liners in `docs/07-architecture/DATABASE_SCHEMA_OVERVIEW.md` (dated 2025-10-31) — not re-verified here.

---

## Governance, Compliance, DRACO, IP

| Table | Purpose | Migration | Status | Evidence |
|---|---|---|---|---|
| `draco_governance_cache` | Read-model cache of PMBOK Registry V7 project governance/health-score reports for the DRACO Board | `005_add_draco_governance_cache.sql` | wired | `dracoRegistryConsumer.ts:115,143`, called from `dracoService.ts:339` |
| `draco_overrides` | Records a human's formal override of a DRACO REJECT verdict | `004_add_draco_overrides.sql` | wired | `dracoService.ts:498` |
| `draco_provider_performance` | Per-AI-provider/model/board-role stats used to weight board-member rotation | `004_add_draco_overrides.sql` | wired | `dracoReviewBoard.ts:157-165`, `dracoService.ts:464` |
| `draco_reviews` | Main DRACO AI Review Board verdict/score record per document | `004_add_draco_overrides.sql` | wired | `dracoService.ts:99,433,459` |
| `ip_claim_entities` | Provenance links between an `ip_claims` record and the source entities that generated it | `426_ip_novelty_governance.sql` | **stub** | No hits outside the migration; `IPNoveltyAssessmentService.ts` etc. never reference it |
| `ip_claims` | Tracks IP novelty claims (patent/copyright/trade-secret) from detection through legal review and filing | `426_ip_novelty_governance.sql` | wired | Heavy use in `server/src/modules/ip-governance/*.ts`, `routes/ipGovernance.ts` |
| `compliance_audit_trail` | Append-only audit/verification history of compliance-validation events | `408_standards_compliance_framework.sql` | wired | `routes/complianceRoutes.ts`, `complianceValidationEngine.ts` |
| `compliance_recommendations` | Gap-remediation guidance from failed compliance rules | `408_standards_compliance_framework.sql` | wired | `complianceRoutes.ts`, `multiFormatOutputEngine.ts` |
| `compliance_rule_results` | Per-rule pass/fail/partial detail underlying a compliance run | `408_standards_compliance_framework.sql` | wired | `complianceRoutes.ts`, `complianceValidationEngine.ts` |
| `compliance_security` | Extracted security/compliance requirements (ISO27001, SOC2, GDPR, HIPAA) pulled from documents | `000_baseline.sql` | wired | Part of `ENTITY_TYPES` in `registerWorkers.ts:360`; note `docs/07-architecture/ENTITY_DEFINITIONS.md` still calls it "Proposed" — stale doc |
| `compliance_trends` | Daily-aggregated compliance score/finding trends for dashboards | `408_standards_compliance_framework.sql` | **wired (read-only)** | `complianceRoutes.ts:570` reads it; its only writer, DB function `aggregate_compliance_trends()`, is never invoked by any app code or cron |
| `compliance_validation_results` | Top-level per-document standards-compliance validation run | `408_standards_compliance_framework.sql` | wired | `complianceValidationEngine.ts`, `policyRegressionRunner.ts` |
| `review_action_items` | Action items assigned from a governance review meeting | squashed into `000_baseline.sql` (orig. `339_review_cadence_scheduling.sql`) | wired | `reviewSchedulingService.ts:454`, `routes/reviewRoutes.ts` |
| `review_decisions` | Formal decisions/approvals recorded during a program/project review | same as above | wired | `reviewSchedulingService.ts:419`, `programService.ts:174` |
| `sla_violations` | Logs template quality-score SLA breaches for alerting | squashed into `000_baseline.sql` (orig. `059_add_sla_violations.sql`) | **stub (orphaned)** | Writer exists (`qualitySLAJob.ts:85`) but `scheduleSLAMonitoring()` is never imported/called anywhere — job never runs |

## Risk & Escalation Management

| Table | Purpose | Migration | Status | Evidence |
|---|---|---|---|---|
| `risk_checklists` | Per-project risk checklist items captured during document extraction | `000_baseline.sql` | wired | `extraction/entities/risk_checklists/{saveRiskChecklists,extractRiskChecklists}.ts` |
| `risk_escalation_event_steps` | Per-step completion of an in-flight risk escalation vs. its policy | `000_baseline.sql` | **stub** | No references anywhere |
| `risk_escalation_events` | Triggered escalation instances for a portfolio risk | `000_baseline.sql` | **stub** | No references anywhere |
| `risk_escalation_policies` | Reusable risk-escalation policy rules (thresholds, SLA, channel) | `000_baseline.sql` | **stub** | No references anywhere |
| `risk_escalation_steps` | Ordered notification steps belonging to a risk escalation policy | `000_baseline.sql` | **stub** | No references anywhere |
| `risk_reviews` | Periodic project risk-review records (risks reviewed/closed/escalated) | `000_baseline.sql` | wired | `extraction/entities/risk_reviews/index.ts` |
| `escalation_alert_history` | Audit trail of actions taken on an escalation alert | `000_baseline.sql` | wired | `escalationService.ts` |
| `escalation_alerts` | Alerts raised from drift detections that get escalated | `000_baseline.sql` | wired | `escalationService.ts`, `routes/escalation.ts` |
| `approval_escalations` | Escalation of a stalled/overdue approval request | `000_baseline.sql` | wired | `approvalWorkflowService.ts:854` |
| `approval_notifications` | Notifications sent for approval workflow events | `000_baseline.sql` | wired | `approvalWorkflowService.ts:723` |
| `meeting_escalation_history` | Escalation-level changes for meetings | `000_baseline.sql` | **stub** | No references anywhere |
| `drift_detection_rules` | Configurable drift-detection thresholds/severity rules | `000_baseline.sql` | wired | `driftDetectionService.ts:777` |
| `drift_detections` | Individual detected drifts vs. a baseline | `000_baseline.sql` | wired | `driftDetectionService.ts` (INSERT/SELECT/UPDATE) |
| `drift_root_causes` | Root-cause analysis for recurring project drift | `000_baseline.sql` | **wired (read-only)** | `projectContextAnalyzer.ts:198`; no writer found |
| `baseline_drift_findings` | Structured baseline-drift findings for context assembly | `000_baseline.sql` | **superseded** | Read-only (`projectContextAnalyzer.ts:169`); real data lives in the actively-used `baseline_drift_detection` table (169 rows) |
| `baselines` | Generic project baseline snapshot | `000_baseline.sql` | **superseded** | Read-only remnant across 3 analyzers; real baseline CRUD flows through `project_baselines` (`routes/baselines.ts`, `baselineService.ts`) |

**Note**: the four `risk_escalation_*` tables plus `meeting_escalation_history` form a complete, fully-designed workflow schema (policies → steps → events → per-event step tracking) with **zero code anywhere**. This looks like a planned-but-unbuilt risk-escalation feature, distinct from the working `escalation_alerts`/`escalation_alert_history` pair (which serves drift-triggered escalation instead).

## Context Engineering

| Table | Purpose | Migration | Status | Evidence |
|---|---|---|---|---|
| `context_building_sessions` | Session for building a template's context strategy (priority matrix, dependency map) | `005_context_building_system.sql` | **stub** | No references anywhere |
| `context_freshness_health_status` | Snapshot of overall context-freshness subsystem health | `000_baseline.sql` | **stub** | `contextFreshnessManager.ts` computes health in-memory, never writes here; already flagged for removal in the stale cleanup script |
| `context_freshness_policy_evaluations` | Results of a periodic freshness-policy evaluation run | `400_context_orchestrator_tables.sql` | wired | `contextFreshnessManager.ts:726-747` |
| `context_freshness_policy_results` | Outcome of applying one freshness-policy action to a context item | `400_context_orchestrator_tables.sql` | wired | `contextFreshnessManager.ts:696-724` |
| `context_gathering_metrics` | Per-request aggregate metrics for the context-gathering stage | `400_context_orchestrator_tables.sql` | wired | `contextOrchestrator.ts:643`, `routes/contextOrchestrator.ts` |
| `context_injection_metrics` | Per-bundle metrics for the context-injection stage | `400_context_orchestrator_tables.sql` | wired (write-only) | `contextOrchestrator.ts:738`; no read route found |
| `context_injection_rules` | Per-template rules for how/when to inject context | `005_context_building_system.sql` | **stub** | No real references (only an unrelated `templates.context_injection_rules` column exists) |
| `context_source_logs` | Logs each individual context-source retrieval attempt | `400_context_orchestrator_tables.sql` | wired | `contextOrchestrator.ts:710`, `routes/contextOrchestrator.ts` |
| `context_value_assessments` | Scores a document's context value for a given template | `005_context_building_system.sql` | **stub** | No references anywhere |
| `document_context_cache` | Cache of computed document importance/context dimensions per document+project | `002_ecs_system.sql` | **stub/superseded** | Design doc describes it as a planned "Layer 2" cache; actual caching is Redis-only |
| `document_context_priorities` | Ranks a document's priority for injection into a specific template | `005_context_building_system.sql` | **stub** | No references anywhere |
| `document_context_relationships` | Directed relationships between documents (depends_on/influences/etc.) | `005_context_building_system.sql` | **stub** | No references anywhere |

The wired subset here all come from `400_context_orchestrator_tables.sql` and are used by `contextOrchestrator.ts`/`contextFreshnessManager.ts` — genuinely active code, just not yet exercised in this environment. The stub subset splits into two abandoned designs: the `005_context_building_system.sql` "document prioritization" schema, and the `002_ecs_system.sql` "ECS" (Evaluative Contextual Synthesis) experiment.

## Template Lifecycle

| Table | Purpose | Migration | Status | Evidence |
|---|---|---|---|---|
| `template_access_controls` | Per-role/permission ACL entries for a template | `000_baseline.sql` | **wired (read-only)** | `templateContextAnalyzer.ts:605`; no writer |
| `template_approval_history` | Approver decisions/comments as a template moves through review | `000_baseline.sql` | **wired (read-only)** | `templateContextAnalyzer.ts:694`; no writer |
| `template_collaboration` | Collaborators/edit history for shared template editing | `000_baseline.sql` | **wired (read-only)** | `templateContextAnalyzer.ts:631`; no writer |
| `template_creation_dependencies` | Parent/child dependency graph between templates | `005_context_building_system.sql` | **stub** | No references anywhere |
| `template_customizations` | Project-specific customization overrides for a base template | `000_baseline.sql` | **wired (read-only)** | `templateContextAnalyzer.ts:551`; no writer |
| `template_dependencies` | Generic template-to-template dependency links | `000_baseline.sql` | **wired (read-only)** | `templateContextAnalyzer.ts:525`, `contextIntegrator.ts:381`; no writer |
| `template_extracted_entities` | Cache of LLM-extracted entities tied to a policy rule_code | `417_clear_stuck_pipeline_jobs.sql` | **stub** | No references anywhere |
| `template_feedback` | User ratings/comments on a template | `000_baseline.sql` | **wired (read-only)** | `templateContextAnalyzer.ts:469`; no writer |
| `template_improvements` | Legacy simple improvement-suggestion log | `000_baseline.sql` | **superseded** | Only read, never written; the active Pillar 6 lifecycle feature uses `template_improvement_suggestions` instead (has real data) |
| `template_metadata` | Arbitrary JSONB metadata blob per template | `000_baseline.sql` | **wired (read-only)** | `templateContextAnalyzer.ts:237`; no writer (distinct from the actively-used `documents.template_metadata` *column*) |
| `template_performance` | Per-generation performance/quality/cost metrics tied to prompt templates | `000_baseline.sql` | wired | `promptAssistantService.ts:265,343` (has a real writer) |
| `template_structure` | Parsed section/hierarchy/complexity breakdown of a template | `000_baseline.sql` | **wired (read-only)** | `templateContextAnalyzer.ts:184`, consumed downstream; no writer |
| `template_validation_rules` | Named validation rule definitions for a template | `000_baseline.sql` | **wired (read-only)** | `templateContextAnalyzer.ts:578`; no writer |
| `template_variables` | Variable definitions (name/type/required/default) for a template | `000_baseline.sql` | **wired (read-only)** | `templateContextAnalyzer.ts:158`, consumed in 4 other modules; no writer |

11 of these 14 share the same pattern: real, reachable `SELECT` queries in `templateContextAnalyzer.ts` (part of the production document pipeline), but **no INSERT path exists anywhere in the codebase**. This is a half-built feature — the read side shipped, the write side didn't. `template_performance` is the one exception with a genuine writer.

## User Preferences & Profile

| Table | Purpose | Migration | Status | Evidence |
|---|---|---|---|---|
| `user_accessibility_preferences` | Per-user UI accessibility settings (font size, contrast, motion) | `000_baseline.sql` | wired | `userProfileAnalyzer.ts:463` |
| `user_devices` | Tracks user's device/OS/browser for context-aware generation | `000_baseline.sql` | wired | `userProfileAnalyzer.ts:480` |
| `user_feedback` | Generic per-entity user rating/comment feedback | `000_baseline.sql` | wired | `userProfileAnalyzer.ts:391` |
| `user_known_gaps` | Known knowledge/skill gaps per user, informs content tailoring | `000_baseline.sql` | wired | `userProfileAnalyzer.ts:549` |
| `user_locale_preferences` | Per-user locale/timezone/date format | `000_baseline.sql` | wired | `userProfileAnalyzer.ts:428` |
| `user_model_preferences` | Per-user, per-task-type preferred AI model override | `000_baseline.sql` | **stub** | No references anywhere |
| `user_notification_preferences` | Per-user notification channel/frequency/quiet-hours | `000_baseline.sql` | wired | `userProfileAnalyzer.ts:446` |
| `user_projects` | User-to-project membership/role join table | `000_baseline.sql` | wired | `userProfileAnalyzer.ts:518` |
| `user_rule_group_memberships` | Many-to-many join between user_rules and user_rule_groups | `001_user_rules_preferences.sql` | **stub** | No references outside the migration + a design doc |
| `user_rule_groups` | Organizes a user's custom rules into named groups | `001_user_rules_preferences.sql` | **stub** | No routes/services found |
| `user_rules` | Core table for a business-rules-engine feature (workflow/notification/access rules) | `001_user_rules_preferences.sql` | **stub** | Documented in `docs/01-getting-started/user-rules-preferences.md` but never wired to any route/service |
| `user_security_settings` | Per-user MFA/password-age/IP-allowlist posture | `000_baseline.sql` | wired | `userProfileAnalyzer.ts:492` |
| `user_time_preferences` | Per-user working-hours/meeting-time preferences | `000_baseline.sql` | wired | `userProfileAnalyzer.ts:504` |

All 9 "wired" tables are queried by `userProfileAnalyzer.ts` (part of the multi-stage document processor's context-gathering stage), wrapped in try/catch with hardcoded fallback defaults — which is exactly why they can sit at 0 rows with zero visible failures. The `user_rules*` cluster is a separate, fully-designed-but-unbuilt rules-engine feature (documented, never implemented) — distinct from the real, actively-used `user_preferences` table (which has data and isn't in this list).

## Program Financials, Documents, PMBOK7, Resources

| Table | Purpose | Migration | Status | Evidence |
|---|---|---|---|---|
| `program_cash_flow` | Monthly program cash flow (funding vs. costs, forecast vs. actual) | `000_baseline.sql` | **stub** | No app code, only docs |
| `program_financial_analysis` | Periodic ROI/NPV/IRR/payback analysis per program | `000_baseline.sql` | wired | `programFinancialService.ts:477` |
| `program_forecasts` | Rolling program cost/completion/benefit forecasts | `000_baseline.sql` | wired | `programFinancialService.ts:560` |
| `program_funding` | Program funding sources, committed/available/spent | `000_baseline.sql` | **stub** | No app code, only docs |
| `program_resource_plan` | Planned resource needs at program level | `000_baseline.sql` | wired | `resourceService.ts:204,274,324` |
| `program_resource_risks` | Program-level resource risk register | `000_baseline.sql` | wired | `resourceService.ts:996,1066` |
| `portfolio_kpi_history` | Time-series snapshots of portfolio KPI measurements | `000_baseline.sql` | **stub** | No app code, only docs |
| `portfolio_risks` | Portfolio-level (aggregated) risk register | `000_baseline.sql` | wired | `PortfolioRepository.ts:56,110,174` |
| `project_expenses` | Line-item project expenses by cost category | `000_baseline.sql` | **stub** | Only referenced inside a DB function, never by app code |
| `budget_baselines` | Approved budget baseline snapshot per project | `000_baseline.sql` | wired | Generic entity-extraction pipeline (`entityTypeTables.ts`, `AnalysisController.ts`) |
| `goal_milestones` | Milestones tied to project_goals | `000_baseline.sql` | wired | `goalService.ts:126` |
| `document_dependencies` | Which documents depend on/regenerate from others | `427_document_dependency_schema.sql` **(⚠️ conflicting duplicate in `002_ecs_system.sql`)** | **stub** | Feature documented in `docs/features/implemented/document-dependency-graph-cascading-regeneration.md` but never wired |
| `document_history` | Historical document records used as RAG context source | `000_baseline.sql` | **wired (read-only)** | `documentHistoryAnalyzer.ts`, `templateContextAnalyzer.ts`, `userProfileAnalyzer.ts` |
| `document_ingestion_queue` | Per-document ingestion pipeline status/progress/retries | `040_document_ingestion_schema.sql` | wired | `documentIngestionRepository.ts` (full CRUD) |
| `document_integrations` | Sync status with external systems (D365 Guides, Confluence, SharePoint) | `000_baseline.sql` / `406_document_integrations.sql` | wired | `dynamics365GuidesRoutes.ts:227` |
| `document_sections` | Parsed document sections for entity extraction & full-text search | `040_document_ingestion_schema.sql` | wired | `documentIngestionRepository.ts` |
| `document_signatures` | E-signature workflow state for documents | `000_baseline.sql` | wired | `signatureService.ts`, `routes/signatures.ts` |
| `document_tags` | Free-text tags attached to documents | `000_baseline.sql` | wired | `documentHistoryStore.ts:774` |
| `project_dependencies` | Cross-project dependency links | `000_baseline.sql` **(⚠️ conflicting duplicate in `002_ecs_system.sql`)** | wired | `gkg/syncProject.ts:254` |
| `deliverable_acceptance` | Formal review/acceptance record for deliverables | `000_baseline.sql` | **stub** | Only appears as AI-prompt config metadata, never queried |
| `issue_status_history` | Audit trail of issue status transitions | `000_baseline.sql` | wired | `issueService.ts:497`, `issuesService.ts:335` |
| `pmbok6_to_pmbok7_principle_mapping` | Cross-reference of PMBOK6 processes to PMBOK7 principles | `000_baseline.sql` | **stub** | "Database layer complete" per docs, zero application follow-through |
| `document_pmbok7_principle_refs` | Links documents to PMBOK7 principles they reference | `000_baseline.sql` | **stub** | Same as above |
| `project_pmbok7_domains` | Project maturity against PMBOK7's 8 performance domains | `000_baseline.sql` | **stub** | Same as above |
| `project_pmbok7_principles` | Project alignment against PMBOK7's 12 principles | `000_baseline.sql` | **stub** | Same as above |
| `resource_assignments` | Assigns named resources to project activities | `000_baseline.sql` | wired | `extraction/entities/resource_assignments/index.ts` |
| `resource_pool` | Catalog of available resources per project | `000_baseline.sql` | wired | `extraction/entities/resource_pool/index.ts` |
| `resource_templates` | CMS-style published resource/template articles | `000_baseline.sql` | **stub** | No app code at all — looks like an unbuilt public resource-library feature |
| `resource_unavailability` | Planned unavailability (leave/holiday) for capacity planning | `000_baseline.sql` | wired | `resourceCapacityService.ts` (full CRUD) |
| `time_entries` | Timesheet entries tied to assignments | `000_baseline.sql` | wired | `timeTrackingService.ts` (full CRUD) |
| `critical_path_activities` | Per-project critical-path schedule analysis | `000_baseline.sql` | wired | Generic entity-extraction pipeline |
| `critical_success_factors` | Project CSFs linked to requirements | `002_ecs_system.sql` | **stub** | No references; file has an anomalous `optical_spectrum` column too — likely a placeholder migration |
| `releases` | Project release records (notes, go-live checklist, rollback plan) | `000_baseline.sql` | **stub** | Only descriptive metadata, never queried |

**PMBOK7 cluster note**: the 4 `pmbok7`/`pmbok6_to_pmbok7` tables are a clean, fully-documented-as-complete-but-never-coded stub cluster — likely awaiting an API/UI phase that never happened.

## Misc: Agent Runs, Playbook Scenarios, AI Models, Knowledge Base, Demo Schema

| Table | Purpose | Migration | Status | Evidence |
|---|---|---|---|---|
| `agent_runs` | Top-level PMBOK agent orchestration run record | `006_agent_runs.sql` | wired | `AgentRunStore.ts` (full CRUD) |
| `agent_run_phases` | Per-phase record within an agent run | `006_agent_runs.sql` | wired | `AgentRunStore.ts` |
| `agent_run_events` | Individual streaming events within an agent run phase | `006_agent_runs.sql` | wired | `AgentRunStore.ts` |
| `playbook_scenarios` | Trigger-condition rules defining when a playbook auto-fires | `000_baseline.sql` | wired | `playbookService.ts` (not in `SCHEMA_DOCUMENTATION.md`, despite being playbook-related) |
| `adpa_pipeline_jobs` | Job-state queue for document-generation pipeline runs | `417_clear_stuck_pipeline_jobs.sql` | **stub** | Only the migration's own cleanup UPDATE touches it |
| `ai_fallback_chain_entries` | Individual model entries within an AI fallback chain | `000_baseline.sql` | wired | `ModelRepository.ts` |
| `ai_fallback_chains` | Named AI-model fallback chain definitions per task type | `000_baseline.sql` | wired | `ModelRepository.ts` |
| `ai_models` | Per-provider AI model catalog for selection/fallback | `000_baseline.sql` | wired | `ModelRepository.ts`, `MorphicRepository.ts` |
| `batch_files` | Per-file status within a batch upload job | `660_create_batch_files_table.sql` | **stub** | Distinct from the actively-used `upload_batches`; no route/service usage |
| `compression_feedback` | User ratings on document compression quality | `000_baseline.sql` | wired | `documentCompressionService.ts` |
| `digital_twin_ingestion_sources` | Configured external data-source connections for digital-twin ingestion | `000_baseline.sql` | wired | `digitalTwinIngestionService.ts`, `skills/adpa-digital-twin/SKILL.md` |
| `domain_entities` | Generic/dynamic PMBOK domain-entity storage | `000_baseline.sql` | **stub** | No app code |
| `domain_kpi_snapshots` | Point-in-time KPI snapshots per PMBOK domain/project | `000_baseline.sql` | **stub** | Only referenced by a test's existence check |
| `entity_relationships` | Graph edges between extracted domain entities | `000_baseline.sql` | **stub** | No SQL usage anywhere |
| `integration_usage_metrics` | Per-integration API call/success/response-time stats | analytics migration | **stub** | Only a console.log in an apply-script |
| `knowledge_base_entry_relationships` | Linking table for related knowledge-base entries | `000_baseline.sql` | **stub** | No app code |
| `knowledge_base_reviews` | Peer review/feedback on knowledge-base entries | `000_baseline.sql` | wired | `modules/knowledgeBase/service.ts` |
| `emergency_meetings` | Emergency/escalation project meeting records | `000_baseline.sql` | wired | `emergencyMeetingService.ts` |
| `meeting_attendees` | Attendee roster linked to emergency_meetings | `000_baseline.sql` | wired | `emergencyMeetingService.ts` |
| `quantum_stability_audit` | Fictional/demo "Quantum Stability Monitor" event log | `003_quantum_stability.sql` | **stub (orphaned demo)** | Zero references anywhere; not a real feature |
| `infrared_thermal_conductance_log` | Same demo schema, thermal-conductance log | `003_quantum_stability.sql` | **stub (orphaned demo)** | Same as above |
| `optical_spectrum_processing_log` | Same demo family, "optical spectrum" processing log | `002_ecs_system.sql` | **stub (orphaned demo)** | Same as above |
| `semantic_units` | Chunked/segmented text units for search/RAG | `000_baseline.sql` | **stub** | No app code |
| `signature_recipients` | Per-recipient e-signature tracking | `000_baseline.sql` | wired | `signatureService.ts`, `routes/signatures.ts` |
| `role_competencies` | Required competency levels per project role | `000_baseline.sql` | wired | `competenciesManagementService.ts` |
| `stakeholder_competencies` | Actual competency levels held by stakeholders | `000_baseline.sql` | wired | `competenciesManagementService.ts` |
| `team_members` | Project team roster used by context-gathering | `000_baseline.sql` | wired | `projectContextAnalyzer.ts` |
| `rule_executions` | Audit log of user-defined automation rule firings | `001_user_rules_preferences.sql` | **stub** | Part of the unbuilt `user_rules` feature |
| `general_change_requests` | Extracted general (non-scope) change requests | `029_strategy_governance_entities.sql` | wired | `extraction/entities/general_change_requests/saveGeneralChangeRequests.ts` |
| `development_approaches` | Per-project SDLC/delivery-approach tailoring record | `013_development_approaches.sql` | wired | `pineconeEntitySync.ts`, extraction pipeline |
| `project_team_evaluations` | Extracted team-member performance evaluations | `029_strategy_governance_entities.sql` | wired | `extraction/entities/project_team_evaluations/saveProjectTeamEvaluations.ts` |
| `schedule_baselines` | Approved project schedule baseline snapshots | `000_baseline.sql` | wired | `ExtractionOrchestrationService.ts`, `entityTypeTables.ts` |
| `scope_baselines` | Approved project scope baseline snapshots | `000_baseline.sql` | wired | Same as above + `inlineEntityParserService.ts` |
| `maturity_assessments` | Process/entity-management maturity scoring snapshots | `000_baseline.sql` | **stub** | Only in legacy spec docs and a one-off migration script |

---

## Summary

Of the ~140 tables freshly investigated in this audit:

- **~75 wired** — real application code queries them; empty is expected for a database this early in real usage.
- **~15 wired (read-only)** — a genuine read path exists but no writer was ever built. Half-finished features, not bugs.
- **~45 stub** — no application code references them at all. Candidates for either finishing the feature or removing the schema.
- **~5 superseded** — a different table now serves the same purpose; these are safe removal candidates.
- **3 orphaned demo** (`quantum_stability_audit`, `infrared_thermal_conductance_log`, `optical_spectrum_processing_log`) — not a real feature, safe removal candidates.

## Recommendations

1. ~~Do not run `scripts/cleanup-empty-tables.sql` as-is~~ — **done**: the script was deleted (2026-07-05). If a cleanup pass is wanted in future, regenerate it from scratch against current row counts and this document's status column.
2. **Resolve the `document_dependencies`/`project_dependencies` duplicate-schema conflict** — determine which migration pipeline's shape is authoritative and drop the other.
3. **Decide the fate of the `user_rules`/`rule_templates`/`rule_executions` business-rules-engine** — fully documented, fully un-implemented. Either build it or remove the schema + doc.
4. **Decide the fate of the 4 `risk_escalation_*` + `meeting_escalation_history` tables** — a complete, unimplemented workflow design.
5. **Remove the 3 orphaned "quantum stability" demo tables** unless there's a reason to keep them.
6. **`superseded` tables** (`baselines`, `baseline_drift_findings`, `template_improvements`) can likely be dropped once confirmed no other code depends on their read paths.
