---
title: PMBOK 8 Alignment Specification
status: in-progress
owners:
  - ai-platform
last-updated: 2025-11-27
---

# PMBOK 8 Alignment Specification

## 1. Purpose

Enable ADPA to extract, store, and visualize project management insights using a **two-tier domain model**:

1. **Tier 1 – Performance Domains (8 domains)**: PMBOK 8's outcome-focused extraction for modern project delivery (Stakeholders, Team, Development Approach, Planning, Project Work, Delivery, Measurement, Uncertainty)

2. **Tier 2 – Knowledge Area Domains (7 domains)**: Function-focused extraction for operational project controls (Governance, Scope, Schedule, Finance, Resources, Risk, Stakeholders Ops)

### Goals
- Extract and store entities for all **15 domains** enabling comprehensive project intelligence
- Maintain backward compatibility with existing PMBOK 6/7 workflows
- Provide domain-aware analytics, KPIs, and dashboards for both tiers
- Support incremental adoption: Tier 1 first, Tier 2 as enhancement
- Single reference for engineers updating schemas, prompts, pipelines, and analytics

## 2. Scope & Goals

### In Scope

1. **Extraction fidelity** – Each of the 15 domains (8 performance + 7 knowledge) gets a tailored AI prompt, schema, validation rules, and KPI definitions.

2. **Data model** – Supabase/Postgres gains:
   - Extended `PMBOK_DOMAIN` enum with tier classification
   - New tables for knowledge domain entities (governance, scope, schedule, finance, resources, risk)
   - JSONB structures with tier-aware KPI snapshots

3. **Pipelines** – Multi-stage processors, Bull queues, and caching logic treat domains as first-class routing keys with tier awareness.

4. **Analytics** – AI analytics dashboard + `ai_provider_usage` tracking:
   - Filter by tier (Performance/Knowledge/All)
   - Per-domain success metrics (success rate, latency, tokens, cache hit rate, costs)
   - Cross-tier insights and coverage reporting

5. **Rollout** – Phased enablement:
   - Phase 1: Performance Domains (Tier 1) – existing
   - Phase 2: Knowledge Domains (Tier 2) – new
   - Phase 3: Full integration with cross-tier analytics

### Out of Scope

- UI polish for domain dashboards (covered in separate feature)
- Supabase Auth migration
- Non-PMBOK frameworks (BABOK, DMBOK, etc. – separate specifications)
- Portfolio-level domain aggregation (future enhancement)

## 3. Domain Architecture

### 3.1 Two-Tier Domain Model

ADPA implements a **two-tier domain model** combining PMBOK 8's outcome-based performance domains with traditional project management knowledge areas:

| Tier | Domain Category | Purpose | Count |
| --- | --- | --- | --- |
| **Tier 1** | Performance Domains (PMBOK 8) | Outcome-focused extraction aligned with modern project delivery | 8 |
| **Tier 2** | Knowledge Area Domains (Supplementary) | Function-focused extraction for operational project controls | 7 |

This hybrid approach ensures:
1. **Future-ready alignment** with PMBOK 8 principles
2. **Operational completeness** for day-to-day PM functions (scope, schedule, budget, etc.)
3. **Backward compatibility** with PMBOK 6/7 workflows

### 3.2 Domain Mapping Overview

| Legacy Process Group | Performance Domain(s) | Knowledge Domains | Primary Documents | Must-Have Entities |
| --- | --- | --- | --- | --- |
| Initiating | Stakeholders, Uncertainty | Governance, Stakeholders, Risk | Stakeholder register, project charter, risk register | Stakeholder profiles, governance decisions, initial risk assessment |
| Planning | Planning, Development Approach, Measurement | Scope, Schedule, Finance, Resources | PMP, WBS, schedule baseline, budget baseline | WBS nodes, schedule activities, cost estimates, resource assignments |
| Executing | Team, Project Work, Delivery | Resources, Scope | Team charter, work plans, release notes | Team assignments, scope deliverables, work items |
| Monitoring & Controlling | Measurement, Project Work, Uncertainty | Schedule, Finance, Risk | Status reports, EVM packs, change logs | Schedule variances, cost variances, risk responses, change requests |
| Closing | Delivery, Stakeholders | Governance, Finance | Acceptance forms, lessons learned, financial closeout | Deliverable sign-off, final cost report, governance approvals |

### 3.3 Complete Domain Enumeration

**Performance Domains (Tier 1):**
1. Stakeholders
2. Team
3. Development Approach & Life Cycle
4. Planning
5. Project Work
6. Delivery
7. Measurement
8. Uncertainty

**Knowledge Area Domains (Tier 2 – Supplementary):**
1. Governance
2. Scope
3. Schedule
4. Finance
5. Resources
6. Risk
7. Stakeholders (shared with Tier 1 – enhanced extraction)

## 4. Domain KPIs & Success Metrics
Each domain needs both **entity extraction coverage** and **operational KPIs** surfaced in analytics. Minimum definitions:

### 4.1 Stakeholders Domain
- Coverage: `% stakeholders with influence+interest populated`
- KPIs: Engagement score (avg), sentiment trend, action backlog aging
- Success: ≥ 90% coverage with <5% stale records (>30 days old)

### 4.2 Team Domain
- Coverage: `% team_members with skills + competency level`
- KPIs: Velocity trend, collaboration score, skill gap count, utilization variance
- Success: Team score ≥ 8/10 with zero critical skill gaps (gap severity < 2)

### 4.3 Development Approach & Life Cycle
- Coverage: `% projects declaring methodology + iteration cadence`
- KPIs: Iteration predictability (planned vs completed), gate pass rate, lead time
- Success: ≥ 1 sprint/phase artifact per iteration, gate SLA compliance ≥ 95%

### 4.4 Planning Domain
- Coverage: `% milestones/activities with dependencies + WBS codes`
- KPIs: Critical path slack, planning confidence index, resource readiness score
- Success: All critical milestones have upstream/downstream links; CPI ≥ 0.95

### 4.5 Project Work Domain
- Coverage: `work_items` with actual hours + blockers logged
- KPIs: Throughput, blocker resolution SLA, utilization vs capacity, defect escape rate
- Success: ≥ 85% of active work items updated weekly; blockers cleared < 3 days

### 4.6 Delivery Domain
- Coverage: `% deliverables with acceptance entries + release metadata`
- KPIs: Acceptance cycle time, defect density, customer satisfaction delta
- Success: ≥ 95% deliverables accepted on first pass; satisfaction ≥ target -0.2 margin

### 4.7 Measurement Domain
- Coverage: `% success criteria with at least one measurement + EVM snapshot`
- KPIs: SPI, CPI, KPI on-track ratio, measurement freshness (<14 days)
- Success: SPI/CPI between 0.95–1.05, ≥ 70% KPIs on-track, measurement freshness 90%

### 4.8 Uncertainty Domain
- Coverage: `% risks & opportunities with response + effectiveness`
- KPIs: Residual risk index, opportunity conversion rate, reserve burn rate
- Success: High+medium risks have responses, reserve variance within ±10%

---

## 5. Knowledge Area Domains (Tier 2) – KPIs & Success Metrics

These supplementary domains enable function-specific extraction for traditional project controls.

### 5.1 Governance Domain
- **Purpose**: Extract governance structures, decision-making frameworks, approvals, and oversight mechanisms
- **Coverage**: `% projects with governance_framework + approval_workflow + steering_committee defined`
- **Entities**:
  - `governance_decisions` – Decision records with outcome, rationale, decision-makers
  - `approval_workflows` – Stage gates, approval chains, escalation paths
  - `steering_committees` – Committee members, meeting cadence, mandate
  - `change_control_boards` – CCB composition, authority levels, meeting logs
  - `policy_compliance` – Policy adherence records, audit findings, remediation
- **KPIs**:
  - Decision cycle time (avg days from request to approval)
  - Escalation rate (% decisions escalated beyond initial authority)
  - Governance health score (composite of compliance + decision velocity)
- **Success**: ≥ 95% decisions documented with rationale; escalation rate < 15%; no critical audit findings open > 30 days

### 5.2 Scope Domain
- **Purpose**: Extract scope definition, WBS, scope changes, and scope control artifacts
- **Coverage**: `% deliverables linked to WBS nodes + requirements traced to scope baseline`
- **Entities**:
  - `scope_baseline` – Approved scope statement, boundaries, exclusions
  - `wbs_nodes` – Hierarchical WBS elements with ownership and status
  - `scope_change_requests` – Change requests with impact analysis, status
  - `requirements_traceability` – Requirement-to-deliverable linkage matrix
  - `scope_verification` – Acceptance criteria validation records
- **KPIs**:
  - Scope creep index (% unapproved scope additions)
  - Requirements coverage (% requirements with deliverable linkage)
  - WBS completeness (% nodes with assigned resources + estimates)
- **Success**: Scope creep < 10%; requirements coverage ≥ 95%; all WBS leaf nodes have estimates

### 5.3 Schedule Domain
- **Purpose**: Extract schedule baselines, critical path, variances, and schedule control data
- **Coverage**: `% activities with baseline_dates + actual_dates + dependencies`
- **Entities**:
  - `schedule_baseline` – Approved schedule with key milestones
  - `schedule_activities` – Activity details with duration, effort, dependencies
  - `critical_path` – Critical path activities with float analysis
  - `schedule_variances` – Variance records with root cause, corrective action
  - `schedule_forecasts` – ETC, EAC schedule projections
- **KPIs**:
  - Schedule Performance Index (SPI) – EV / PV
  - Critical path float (avg float on critical activities)
  - Schedule variance trend (SV trend over reporting periods)
  - Milestone hit rate (% milestones completed on/before target)
- **Success**: SPI between 0.95–1.05; milestone hit rate ≥ 90%; critical path float ≥ 0

### 5.4 Finance Domain
- **Purpose**: Extract budget baselines, cost tracking, EVM financials, and funding records
- **Coverage**: `% cost accounts with budget_baseline + actuals + forecast`
- **Entities**:
  - `budget_baseline` – Approved budget by cost category, phase, WBS
  - `cost_actuals` – Actual costs recorded against baseline
  - `cost_estimates` – Estimates at completion (EAC), estimates to complete (ETC)
  - `funding_tranches` – Funding sources, release schedules, conditions
  - `financial_variances` – Cost variance records with root cause analysis
  - `procurement_costs` – Vendor costs, contract values, payment schedules
- **KPIs**:
  - Cost Performance Index (CPI) – EV / AC
  - Budget utilization (% budget consumed vs timeline)
  - Variance at Completion (VAC) – BAC - EAC
  - Funding runway (months of runway at current burn rate)
- **Success**: CPI between 0.95–1.05; VAC within ±5% of BAC; no funding gaps > 1 month

### 5.5 Resources Domain
- **Purpose**: Extract resource allocation, capacity planning, and resource utilization data
- **Coverage**: `% resources with allocation_plan + skill_profile + availability`
- **Entities**:
  - `resource_assignments` – Resource-to-activity assignments with FTE/hours
  - `resource_pool` – Available resources with skills, availability windows
  - `capacity_forecasts` – Future capacity projections by role/skill
  - `utilization_records` – Actual utilization vs planned
  - `resource_conflicts` – Overallocation warnings, conflict resolution
  - `onboarding_offboarding` – Resource transition plans
- **KPIs**:
  - Utilization rate (actual hours / available hours)
  - Resource conflict rate (% resources with overallocation)
  - Skill match score (% assignments where skill level meets requirement)
  - Bench rate (% available resources unassigned)
- **Success**: Utilization between 75–90%; conflicts resolved < 5 days; skill match ≥ 85%

### 5.6 Risk Domain
- **Purpose**: Extract comprehensive risk management data beyond Uncertainty domain (operational focus)
- **Coverage**: `% risks with complete_assessment + response_plan + trigger_conditions`
- **Entities**:
  - `risk_register` – Full risk inventory with ID, category, owner
  - `risk_assessments` – Probability, impact, detectability (RPN if applicable)
  - `risk_response_plans` – Response strategy, actions, responsible party, deadlines
  - `risk_triggers` – Early warning indicators, thresholds
  - `risk_reviews` – Periodic review records with status changes
  - `contingency_reserves` – Reserve allocation per risk category
  - `risk_metrics` – Trend data (new risks, closed risks, exposure trend)
- **KPIs**:
  - Risk exposure index (sum of P×I for open risks)
  - Response plan coverage (% medium+ risks with active response)
  - Risk velocity (rate of new risks identified per period)
  - Reserve adequacy (reserves vs exposure ratio)
- **Success**: All high risks have response plans; exposure index trending down; reserve adequacy ≥ 1.2×

### 5.7 Stakeholders Domain (Enhanced)
- **Purpose**: Extends Tier 1 Stakeholders domain with operational engagement tracking
- **Coverage**: `% stakeholders with engagement_history + communication_log + satisfaction_scores`
- **Entities** (additions to Tier 1):
  - `engagement_actions` – Specific engagement activities, outcomes
  - `communication_logs` – Communication records with sentiment analysis
  - `satisfaction_surveys` – Survey responses, NPS, feedback themes
  - `stakeholder_issues` – Open issues/concerns with resolution status
  - `relationship_health` – Relationship strength indicators over time
- **KPIs** (additions to Tier 1):
  - Communication frequency compliance (actual vs planned)
  - Issue resolution time (avg days to resolve stakeholder issues)
  - Satisfaction trend (NPS or satisfaction score trend)
  - Engagement action completion rate
- **Success**: Communication compliance ≥ 90%; issue resolution < 7 days; NPS stable or improving

---

## 6. Architecture & Data Model Impacts

### 6.1 Enums & Constants

Extend `PMBOK_DOMAIN` enum to include both tiers:

```typescript
// types/pmbok.ts
export const PMBOK_PERFORMANCE_DOMAINS = [
  'stakeholders', 'team', 'development_approach', 'planning',
  'project_work', 'delivery', 'measurement', 'uncertainty'
] as const

export const PMBOK_KNOWLEDGE_DOMAINS = [
  'governance', 'scope', 'schedule', 'finance',
  'resources', 'risk', 'stakeholders_ops'
] as const

export const PMBOK_DOMAINS = [
  ...PMBOK_PERFORMANCE_DOMAINS,
  ...PMBOK_KNOWLEDGE_DOMAINS
] as const

export type PmbokPerformanceDomain = (typeof PMBOK_PERFORMANCE_DOMAINS)[number]
export type PmbokKnowledgeDomain = (typeof PMBOK_KNOWLEDGE_DOMAINS)[number]
export type PmbokDomain = (typeof PMBOK_DOMAINS)[number]
```

### 6.2 New Tables/Columns

**Performance Domain Tables (Tier 1):**
- `team_members`, `team_dynamics`, `methodology_configs`, `sprints`, `quality_gates`
- `work_items`, `capacity_plans`, `deliverable_acceptance`, `releases`
- `measurements`, `earned_value_snapshots`, `opportunities`, `risk_responses`

**Knowledge Area Domain Tables (Tier 2):**

| Domain | New Tables | Key Columns |
| --- | --- | --- |
| Governance | `governance_decisions`, `approval_workflows`, `steering_committees`, `change_control_boards`, `policy_compliance` | decision_type, outcome, rationale, approvers, compliance_status |
| Scope | `scope_baselines`, `wbs_nodes`, `scope_change_requests`, `requirements_traceability`, `scope_verification` | scope_statement, boundaries, wbs_code, change_impact, verification_status |
| Schedule | `schedule_baselines`, `schedule_activities`, `critical_path_activities`, `schedule_variances`, `schedule_forecasts` | baseline_start, baseline_finish, actual_start, actual_finish, float, spi |
| Finance | `budget_baselines`, `cost_actuals`, `cost_estimates`, `funding_tranches`, `financial_variances`, `procurement_costs` | budget_amount, actual_amount, eac, etc, cpi, funding_source |
| Resources | `resource_assignments`, `resource_pool`, `capacity_forecasts`, `utilization_records`, `resource_conflicts`, `onboarding_offboarding` | allocation_pct, skill_level, available_hours, utilization_rate, conflict_type |
| Risk | `risk_register`, `risk_assessments`, `risk_response_plans`, `risk_triggers`, `risk_reviews`, `contingency_reserves`, `risk_metrics` | probability, impact, rpn, response_strategy, trigger_condition, reserve_amount |
| Stakeholders (Ops) | `engagement_actions`, `communication_logs`, `satisfaction_surveys`, `stakeholder_issues`, `relationship_health` | action_type, sentiment_score, nps_score, issue_status, health_indicator |

### 6.3 JSONB Payloads

Domain-specific KPI snapshots stored per extraction run:

```sql
ALTER TABLE documents ADD COLUMN IF NOT EXISTS domain_metrics JSONB DEFAULT '{}';

-- Example structure
{
  "performance_domains": {
    "stakeholders": { "engagement_score": 0.87, "freshness": 0.92, ... },
    "measurement": { "spi": 1.02, "cpi": 0.98, ... }
  },
  "knowledge_domains": {
    "schedule": { "spi": 1.02, "milestone_hit_rate": 0.88, ... },
    "finance": { "cpi": 0.98, "budget_utilization": 0.72, ... },
    "risk": { "exposure_index": 24.5, "response_coverage": 0.95, ... }
  },
  "extraction_metadata": {
    "run_id": "uuid",
    "completed_at": "ISO8601",
    "domains_extracted": ["stakeholders", "schedule", "finance"]
  }
}
```

### 6.4 Supabase Functions/RLS

- Extend RLS policies so all domain tables inherit `project_id` constraints
- Add domain-level read policies: users see entities for projects they have access to
- Add domain-specific write policies for extraction jobs (service role only)

## 7. Prompt & Extraction Configuration

### 7.1 Prompt Templates

One canonical template per domain stored in `server/src/modules/context/domainExtractionConfig.ts`:

**Performance Domain prompts** (existing – 8 domains):
- Include required document hints, output schema, validation rules, KPI calculations
- Markdown-only content reminders enforced

**Knowledge Area Domain prompts** (new – 7 domains):

| Domain | Prompt Focus | Key Output Schema |
| --- | --- | --- |
| Governance | Decision records, approval chains, compliance status | `decisions[]`, `workflows[]`, `committees[]`, `compliance_findings[]` |
| Scope | WBS hierarchy, scope changes, requirements trace | `wbs_nodes[]`, `change_requests[]`, `traceability_matrix[]` |
| Schedule | Activities, dependencies, variances, forecasts | `activities[]`, `critical_path[]`, `variances[]`, `forecasts{}` |
| Finance | Budget breakdown, actuals, EVM, funding | `budget_items[]`, `cost_actuals[]`, `evm_metrics{}`, `funding[]` |
| Resources | Assignments, pool, utilization, conflicts | `assignments[]`, `pool[]`, `utilization[]`, `conflicts[]` |
| Risk | Full register, assessments, responses, triggers | `risks[]`, `assessments[]`, `responses[]`, `triggers[]`, `reserves[]` |
| Stakeholders (Ops) | Engagement actions, communications, satisfaction | `actions[]`, `comms_log[]`, `surveys[]`, `issues[]` |

### 7.2 Schema Validation

Zod or Joi definitions for each domain output, reused by workers and HTTP handlers:

```typescript
// Example: Schedule domain schema
const ScheduleActivitySchema = z.object({
  activity_id: z.string(),
  name: z.string(),
  wbs_code: z.string().optional(),
  baseline_start: z.string().datetime().optional(),
  baseline_finish: z.string().datetime().optional(),
  actual_start: z.string().datetime().optional(),
  actual_finish: z.string().datetime().optional(),
  duration_days: z.number().optional(),
  float_days: z.number().optional(),
  predecessors: z.array(z.string()).optional(),
  successors: z.array(z.string()).optional(),
  is_critical: z.boolean().default(false),
  status: z.enum(['not_started', 'in_progress', 'completed', 'delayed', 'on_hold'])
})
```

### 7.3 AI Provider Strategy

Domain config declares preferred provider/model + fallback order:

| Domain | Tier | Primary Provider | Fallback Order | Rationale |
| --- | --- | --- | --- | --- |
| Stakeholders | 1 | `openai:gpt-4o` | `google:gemini-1.5-pro` | Stakeholder analysis, engagement |
| Team | 1 | `mistral:large` | `openai:gpt-4o` | Team dynamics, velocity |
| Development Approach | 1 | `google:gemini-1.5-pro` | `openai:gpt-4o-mini` | Methodology parsing |
| Planning | 1 | `openai:gpt-4o` | `anthropic:claude-3-5-sonnet` | Dependency resolution |
| Project Work | 1 | `mistral:large` | `groq:llama-3.1-70b` | Work item tracking |
| Delivery | 1 | `openai:gpt-4o` | `anthropic:claude-3-5-sonnet` | Acceptance criteria |
| Measurement | 1 | `openai:gpt-4o-mini` | `google:gemini-1.5-pro` | Numerical accuracy |
| Uncertainty | 1 | `anthropic:claude-3-opus` | `openai:gpt-4o` | Risk assessment |
| Governance | 2 | `anthropic:claude-3-5-sonnet` | `openai:gpt-4o` | Policy interpretation |
| Scope | 2 | `openai:gpt-4o` | `anthropic:claude-3-5-sonnet` | WBS parsing |
| Schedule | 2 | `openai:gpt-4o` | `google:gemini-1.5-pro` | Date handling, dependencies |
| Finance | 2 | `openai:gpt-4o-mini` | `mistral:large` | Cost efficiency |
| Resources | 2 | `mistral:large` | `openai:gpt-4o-mini` | Capacity planning |
| Risk | 2 | `anthropic:claude-3-opus` | `openai:gpt-4o` | Risk assessment depth |
| Stakeholders (Ops) | 2 | `openai:gpt-4o` | `google:gemini-1.5-pro` | Sentiment analysis |

### 7.4 Caching Tags

Cache keys include `projectId + tier + domain + docHash`:

```typescript
const cacheKey = `extraction:${projectId}:${domainTier}:${domain}:${docHash}`
// Example: extraction:proj-123:knowledge:schedule:abc123def
```

This enables:
- Domain-level cache hit tracking
- Tier-specific cache TTLs (knowledge domains may refresh more frequently)
- Analytics on cache effectiveness per domain type

## 8. Pipeline Changes

### 8.1 Multi-Stage Processor

Extend `server/src/modules/multiStageDocumentProcessor` to:
- Accept `domains[]` input with tier specification
- Run extraction per domain sequentially or in parallel (configurable)
- Persist entity batches + KPI snapshots per tier
- Support mixed-tier extraction in a single run

```typescript
interface DomainExtractionRequest {
  projectId: string
  domains?: PmbokDomain[]          // Specific domains or all
  tiers?: ('performance' | 'knowledge')[]  // Filter by tier
  parallel?: boolean               // Run domains in parallel
  docIds?: string[]                // Limit to specific documents
}
```

### 8.2 Bull Jobs

New queue types for domain extraction:

| Queue | Payload | Purpose |
| --- | --- | --- |
| `domain-extraction` | `{ projectId, domain, tier, provider, docIds }` | Single domain extraction |
| `tier-extraction` | `{ projectId, tier, parallel, provider }` | All domains in a tier |
| `full-extraction` | `{ projectId, parallel, provider }` | All 15 domains |

### 8.3 Idempotency

Domain-level upserts keyed by `project_id + tier + domain + entity natural key`:
- Performance domains: Use existing entity tables
- Knowledge domains: Use new domain-specific tables
- Cross-tier entities (e.g., stakeholders): Merge/reconcile data

### 8.4 Backwards Compatibility

- Default extraction runs legacy flow (8 performance domains)
- Enable knowledge domains via feature flag `PMBOK8_KNOWLEDGE_DOMAINS`
- API accepts `tier` parameter to include/exclude knowledge domains
- Gradual migration path: performance → knowledge → full

## 9. Analytics & Monitoring

### 9.1 AI Analytics Dashboard

Update `app/ai-analytics/page.tsx`:
- **Tier selector**: Filter by Performance Domains, Knowledge Domains, or All
- **Domain filter**: Multi-select individual domains
- **Scorecards per domain**: Success %, latency, cache hit, token usage, cost
- **Trend charts**: KPI compliance over time, grouped by tier
- **Cross-domain insights**: Coverage gaps, extraction recommendations

### 9.2 Server Analytics Routes

| Endpoint | Description |
| --- | --- |
| `GET /api/analytics/domains` | Aggregated metrics for all domains |
| `GET /api/analytics/domains/:tier` | Metrics filtered by tier |
| `GET /api/analytics/domains/:domain/kpis` | KPI history for specific domain |
| `GET /api/analytics/coverage` | Entity coverage across all domains |

### 9.3 `ai_provider_usage` Table Updates

New columns:

| Column | Type | Description |
| --- | --- | --- |
| `domain` | `text` | PMBOK domain name |
| `domain_tier` | `text` | `performance` or `knowledge` |
| `cache_hit` | `boolean` | Whether result was cached |
| `kpi_score` | `numeric` | Domain KPI score at extraction time |
| `extraction_runtime_ms` | `integer` | Total extraction time |
| `entity_count` | `integer` | Entities extracted in this run |

### 9.4 Alerting

| Alert | Threshold | Severity |
| --- | --- | --- |
| Domain success rate drop | < 80% | Warning |
| Measurement freshness breach | > 14 days | Warning |
| Knowledge domain coverage gap | < 50% | Info |
| Cost per entity spike | > 150% of baseline | Warning |
| Critical domain failure | Any Tier 1 domain fails 3x | Critical |

## 10. Testing & Validation Strategy

### 10.1 Unit Tests

- **Domain config builder**: Validate all 15 domain configurations load correctly
- **Prompt generator**: Ensure prompts include tier-specific instructions
- **Schema validation**: Test Zod/Joi schemas for each domain output
- **KPI calculators**: Unit test KPI computation logic per domain

### 10.2 Integration Tests

- **Performance domain extraction**: Run all 8 performance domains with mock AI
- **Knowledge domain extraction**: Run all 7 knowledge domains with mock AI
- **Cross-tier extraction**: Verify stakeholders data merges correctly between tiers
- **Analytics updates**: Confirm `ai_provider_usage` records domain and tier
- **Cache behavior**: Validate cache keys include tier prefix

### 10.3 End-to-End Smoke Tests

- **Domain dashboard**: Renders with seeded data for all 15 domains
- **AI analytics**: Filters by tier and individual domain
- **Extraction API**: Accepts tier parameter, returns correct entities
- **Real AI call**: One domain per tier with actual provider

### 10.4 Data Quality Assurance

- **PMBOK 7 vs 8 comparison**: Extract from sample projects, compare entity coverage
- **Knowledge domain coverage**: Verify new domains capture data previously missed
- **Cross-domain consistency**: Stakeholder data matches between Tier 1 and Tier 2
- **KPI accuracy**: Manual verification of calculated KPIs against source documents

## 11. Rollout Plan

### 11.1 Feature Flags

| Flag | Scope | Default | Purpose |
| --- | --- | --- | --- |
| `PMBOK8_DOMAIN_MODE` | Global | `true` | Enable performance domains (Tier 1) |
| `PMBOK8_KNOWLEDGE_DOMAINS` | Global | `false` | Enable knowledge domains (Tier 2) |
| `PMBOK8_PARALLEL_EXTRACTION` | Global | `false` | Run domains in parallel |
| `PMBOK8_CROSS_TIER_MERGE` | Global | `true` | Merge stakeholder data across tiers |

### 11.2 Migration Order

**Phase 1: Performance Domains (Tier 1)** – Already in progress
1. Create tables (safe) ✅
2. Enable extraction: Stakeholders → Team → Measurement → rest
3. Backfill derived data from existing entities
4. QA sign-off on 8 performance domains

**Phase 2: Knowledge Domains (Tier 2)** – New
1. Create Tier 2 tables via migration
2. Add domain extraction configs for all 7 knowledge domains
3. Enable extraction: Governance → Scope → Schedule → Finance → Resources → Risk → Stakeholders (Ops)
4. Test cross-tier stakeholder merge
5. Update AI analytics dashboard with tier filter
6. QA sign-off on 7 knowledge domains

**Phase 3: Full Integration**
1. Enable `PMBOK8_KNOWLEDGE_DOMAINS` globally
2. Update documentation and runbooks
3. Train support team on two-tier model
4. Monitor KPI compliance and cost metrics

### 11.3 Success Metrics

| Metric | Target | Measurement |
| --- | --- | --- |
| Performance domain KPI compliance | ≥ 80% | Pilot projects within 2 sprints |
| Knowledge domain coverage | ≥ 60% | New entities extracted vs expected |
| AI cost per entity | ≤ 90% of baseline | Via caching improvements |
| Extraction success rate | ≥ 95% | All domains combined |
| User adoption | ≥ 50% projects use Tier 2 | Within 1 month of rollout |

## 12. Open Questions / Follow-ups

### Resolved
- ✅ Two-tier domain model approved for implementation

### Open
- [ ] Confirm whether legacy PMBOK 6 dashboards remain accessible or redirect to domain views
- [ ] Validate AI provider cost caps per domain to adjust fallback order
- [ ] Define how portfolio-level rollups aggregate domain KPIs (weighted vs simple average)
- [ ] Determine if knowledge domains should have separate cache TTLs
- [ ] Clarify stakeholder data merge strategy: Tier 1 primary or combine both?
- [ ] Evaluate if "Stakeholders (Ops)" should be renamed to avoid confusion with Tier 1

### Future Enhancements
- [ ] Portfolio-level domain analytics (aggregate across projects)
- [ ] Custom domain definitions (user-defined extraction rules)
- [ ] Domain-specific notification preferences
- [ ] Integration with external PM tools (Jira, MS Project) per domain

---

## Appendix A: Entity Type Reference

### Performance Domain Entities (Tier 1)

| Domain | Entity Types |
| --- | --- |
| Stakeholders | `stakeholders`, `engagement_strategies`, `communication_requirements` |
| Team | `team_members`, `team_dynamics`, `skill_inventory`, `training_needs` |
| Development Approach | `development_approach`, `project_iterations`, `quality_gates`, `methodology_tailoring` |
| Planning | `milestones`, `activities`, `requirements`, `constraints`, `dependencies`, `wbs_nodes` |
| Project Work | `work_items`, `capacity_plans`, `impediments`, `work_logs` |
| Delivery | `deliverables`, `deliverable_acceptance`, `releases`, `customer_feedback` |
| Measurement | `performance_measurements`, `earned_value_metrics`, `kpi_trends` |
| Uncertainty | `risks`, `risk_responses`, `opportunities`, `reserves` |

### Knowledge Domain Entities (Tier 2)

| Domain | Entity Types |
| --- | --- |
| Governance | `governance_decisions`, `approval_workflows`, `steering_committees`, `change_control_boards`, `policy_compliance` |
| Scope | `scope_baseline`, `wbs_nodes`, `scope_change_requests`, `requirements_traceability`, `scope_verification` |
| Schedule | `schedule_baseline`, `schedule_activities`, `critical_path`, `schedule_variances`, `schedule_forecasts` |
| Finance | `budget_baseline`, `cost_actuals`, `cost_estimates`, `funding_tranches`, `financial_variances`, `procurement_costs` |
| Resources | `resource_assignments`, `resource_pool`, `capacity_forecasts`, `utilization_records`, `resource_conflicts`, `onboarding_offboarding` |
| Risk | `risk_register`, `risk_assessments`, `risk_response_plans`, `risk_triggers`, `risk_reviews`, `contingency_reserves`, `risk_metrics` |
| Stakeholders (Ops) | `engagement_actions`, `communication_logs`, `satisfaction_surveys`, `stakeholder_issues`, `relationship_health` |

---

**Next Action:** Proceed with schema design (`schema-updates` task) using this specification as the reference baseline. Priority: Create Tier 2 tables and update `types/pmbok.ts` with extended domain enums.

