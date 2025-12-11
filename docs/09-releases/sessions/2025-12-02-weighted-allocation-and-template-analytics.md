# Session Log – 2025-12-02  
**Topic**: PMBOK 8 Domain Coverage, Weighted Entity Allocation, and Template Analytics  
**Branch**: `adpa-project-charter`  

---

## 1. Context & Objectives

- Project: **ADPA – Advanced Document Processing & Automation**.
- Goal for this session:
  - Fix specific UX/validation issues (risk mitigation plans).
  - Correct and extend **Knowledge Domain** entity allocations (Tier 2).
  - Design and implement a **weighted entity allocation** system across:
    - PMBOK 8 **Performance Domains** (Tier 1 – outcome-focused).
    - PMBOK 8 **Knowledge Domains** (Tier 2 – function-focused).
    - **Project Phases** (Initiating, Planning, Executing, Monitoring & Controlling, Closing).
  - Begin designing **template analytics** so templates and documents can be assigned a **primary purpose** based on extracted entities.

High-level vision: move from “we have extracted entities” → to **project intelligence**, **coverage analysis**, and **PMBOK 8 compliance** driven by those entities.

---

## 2. Fix: Mitigation Plan Update Validation

**Problem**  
Updating an existing mitigation plan produced a `400 VALIDATION_ERROR` from the backend:
- Joi schema for `PUT /mitigation-plans/:id` expected:
  - `id` in the **body** (UUID, required).
  - No `risk_id` in the **update** payload.
- Frontend was sending:
  - `risk_id` in the payload.
  - No `id` field in the JSON body, only in the URL.

**Fix** (`components/risks/MitigationPlanDialog.tsx`):
- Split payload logic into:
  - **Update**:
    - `PUT /mitigation-plans/:id`
    - Payload includes `id: plan.id` plus other fields.
    - Does **not** send `risk_id`.
  - **Create**:
    - `POST /mitigation-plans`
    - Payload includes `risk_id` (from `plan.risk_id` or `riskId` prop).
    - No `id` field.

Result:  
Mitigation plan **updates** and **creates** now pass validation and save correctly.

---

## 3. Knowledge Domains – Correcting Entity Allocation (Tier 2)

**Observation**  
- Tier 2 **Knowledge Domains** (Governance, Scope, Schedule, Finance, Resources, Risk, Stakeholders Ops) were **missing entities** that clearly belonged there.
- Example: `development_approaches` entity stores:
  - `governance_approach`,
  - `review_gates`,
  - `tailoring_decisions`,
  but it was **not counted** under Governance.
- Governance domain initially showed **0 entities**, while the All Entities tab showed rich context (phases, milestones, etc.).

**Backend Mapping**  
File: `server/src/services/queueService.ts`  
Key object: `DOMAIN_ENTITY_MAP: Record<PmbokDomain, EntityType[]>`

Changes (highlights):

- **Governance**:
  - Before: `['governance_decisions', 'approval_workflows', 'steering_committees', 'change_control_boards', 'policy_compliance']`
  - After (added):
    - `development_approaches` (governance approach, review gates),
    - `phases`,
    - `milestones`,
    - `team_agreements`.

- **Scope**:
  - Added:
    - `scope_items`,
    - `requirements`,
    - `deliverables`,
    - `phases`.

- **Schedule**:
  - Added:
    - `milestones`,
    - `activities`,
    - `phases`,
    - `project_iterations`.

- **Resources**:
  - Added:
    - `resources`,
    - `team_agreements`,
    - `capacity_plans`.

- **Risk**:
  - Added:
    - `risks`,
    - `opportunities`,
    - `risk_responses`,
    - `constraints`.

- **Stakeholders Ops**:
  - Added:
    - `stakeholders`.

**Shared Metadata**  
File: `types/pmbok.ts`  
Updated `DOMAIN_METADATA` to mirror the same entity types for each Knowledge Domain.

**Frontend Updates**  
File: `app/projects/[id]/components/ProjectDataExtraction.tsx`
- The Knowledge Domains section had its own hardcoded `entities` arrays per domain.
- Updated `knowledgeDomains` configuration to include the newly mapped entities.
- After fix:
  - Governance domain now shows ~~0~~ → **57+ entities** (in your project) drawn from:
    - `development_approaches`, `phases`, `milestones`, `team_agreements`, etc.

**Result**  
- Knowledge Domains Tier 2 coverage increased from **44** to **67** entity types (+52%).
- Governance is no longer “empty”; it accurately reflects governance-related entities.

---

## 4. Three-Tier Weighted Entity Allocation System

We implemented a **weighted** entity distribution system across three independent perspectives:

1. **Performance Domains** (Tier 1 – PMBOK 8 Outcomes)
2. **Knowledge Domains** (Tier 2 – PM Functions)
3. **Project Phases** (Lifecycle / Time)

The key property:  
> Each perspective sums to **100% of the extracted entities**, i.e. **742.0** for your “Project Momentum Digital Transformation” project.

### 4.1 Shared Weight Matrix (Domains)

File: `types/entity-domain-weights.ts`

- Introduced `ENTITY_DOMAIN_WEIGHTS: EntityWeightMap`:
  - Maps each entity type (snake_case) to one or more `PmbokDomain`s with:
    - `weight` (0–1)  
    - `isPrimary` flag
  - Example:
    - `development_approaches` → 100% Governance (per your design).
    - `milestones` → 60% Schedule, 40% Governance (for Knowledge Domains), and separately used for Performance Domains.
    - `phases` → 60% Schedule, 40% Governance (Knowledge).
    - `risks` → 50% Uncertainty + 50% Risk.
    - `stakeholders` → 60% Stakeholders + 40% Stakeholders Ops.

> Note: We simplified to **single domain-weight configuration** per entity and reuse it in both Performance and Knowledge views, relying on domain tiers (from `DOMAIN_METADATA`) to distinguish.

### 4.2 Phase Weight Matrix (Lifecycle)

Same file: `types/entity-domain-weights.ts`

- Introduced:
  - `ProjectPhase = 'initiating' | 'planning' | 'executing' | 'monitoring_controlling' | 'closing'`
  - `ENTITY_PHASE_WEIGHTS: EntityPhaseWeightMap`
  - `getEntityPhaseWeights(entityType: string)`
- For each entity type, we defined temporal distribution across the 5 phases:
  - Example: **milestones**
    - 5% Initiating,
    - 20% Planning,
    - 30% Executing,
    - 40% Monitoring & Controlling (Primary),
    - 5% Closing.
  - Example: **requirements**
    - 15% Initiating,
    - 60% Planning (Primary),
    - 15% Executing,
    - 10% Monitoring & Controlling.

This models **WHEN** in the lifecycle each entity is most active.

---

## 5. Frontend: Weighted Counts & Badges

File: `app/projects/[id]/components/ProjectDataExtraction.tsx`

Added helper functions:
- `calculateWeightedDomainCount(domain: PmbokDomain, counts: EntityCounts | null): number`
- `getEntityWeightInfo(entityKey: string, domain: PmbokDomain)`
- `calculateWeightedPhaseCount(phase: ProjectPhase, counts: EntityCounts | null)`
- `getEntityPhaseWeightInfo(entityKey: string, phase: ProjectPhase)`
- `calculateTotalExtractedEntities(counts: EntityCounts | null)`
- `validateWeightedAllocations(counts: EntityCounts | null)`
- `validatePhaseWeightedAllocations(counts: EntityCounts | null)`

### 5.1 Performance Domains Tab (Tier 1)

- Instead of summing raw counts of entities, we now:
  - Use `calculateWeightedDomainCount(domain.pmbokDomain, entityCounts)` to get a **decimal weighted count**.
  - Convert that to a percentage of total extracted entities (742).
- Per entity in the domain:
  - We compute per-entity weighted contribution and show:
    - **⭐ / ◆ badge**,
    - Weighted count with 1 decimal,
    - Label: `Primary X%` or `Secondary Y%`.
- Added a validation card:
  - Confirms the **sum of weighted counts across all Performance Domains** equals **total extracted entities** (742.0).
  - Text emphasizes PMBOK 8 Performance Domain coverage and compliance alignment.

### 5.2 Knowledge Domains Tab (Tier 2)

- Similar approach:
  - Domain total = `calculateWeightedDomainCount(domain.pmbokDomain, entityCounts)`.
  - Per-entity badges show contribution to that domain.
- Validation card:
  - Confirms Knowledge Domain distribution also equals **742.0**.
  - Includes explanatory note about **function-focused** coverage.

### 5.3 Project Phases Tab

- For each phase:
  - Phase total = `calculateWeightedPhaseCount(phase.key as ProjectPhase, entityCounts)`.
  - We then show:
    - Weighted entity counts per phase,
    - Percentage of total extracted entities.
- Per-entity badges:
  - `getEntityPhaseWeightInfo(entityKey, phase)` returns:
    - Phase-specific weight,
    - Primary/Secondary flag,
    - Percentage.
  - Displayed similarly as in domain tabs.
- Validation card:
  - Ensures total across all phases equals **742.0**.
  - Explains that this is a **temporal distribution**.

### 5.4 UX Improvements

- Entity grids changed from 3 columns → 2 columns in weighted views to make badges readable.
- Varied badges:
  - **Primary** allocations: bold, `⭐`, strong color.
  - **Secondary** allocations: `◆`, subtler colors.
- All three tabs:
  - Show **(x.y entities, z.z%)** per domain/phase.
  - End with a **Validation Card** indicating:
    - **Validated** (green) or **Warning** (orange).
    - Current total vs expected total.

---

## 6. Documentation Created

To preserve the reasoning and design decisions, several documentation files were created:

- `docs/analysis/knowledge-domains-entity-allocation-review.md`
  - Deep analysis of original Knowledge Domain gaps.
  - Mapping table of entities → domains.
  - Rationale for new domain/entity allocations.

- `docs/implementation/THREE-TIER-WEIGHTED-ALLOCATION-COMPLETE.md`
  - High-level description of the three-tier weighted system:
    - Performance Domains,
    - Knowledge Domains,
    - Project Phases.
  - Testing checklist for all three tabs.
  - Examples of distributions and how they support PMBOK 8 and project coverage.

- `docs/implementation/template-analytics-plan.md`
  - Detailed plan for next steps:
    - Aggregating entity usage per template.
    - Storing `template_entity_profile`.
    - Assigning `inferred_primary_domain` to documents.
    - Using that for coverage gaps and baseline readiness.

These docs serve as **design artifacts** and **onboarding material** for future work on analytics and compliance.

---

## 7. Template & Document Purpose – Future Work (Planned)

Although not fully implemented in this session, a clear plan was defined:

### 7.1 Document Purpose

- Extend `documents` table:
  - `inferred_primary_domain` (TEXT),
  - `inferred_secondary_domains` (JSONB).
- After extraction:
  - Use the same `ENTITY_DOMAIN_WEIGHTS` to compute per-document domain weights.
  - Store the dominant domain as primary and others above a threshold as secondary.

### 7.2 Template Purpose & Analytics

- New table: `template_entity_profile` to store:
  - Average per-entity production.
  - Domain coverage (knowledge & performance).
  - Primary and secondary domains.
- Service: `TemplateAnalyticsService.updateTemplateEntityProfile(templateId?)` to:
  - Aggregate from `document_entity_counts` view.
  - Compute domain coverage and primary/secondary domains.
  - Upsert `template_entity_profile`.

Purpose:
- Identify which templates are **primarily Finance**, **Risk**, **Governance**, etc.
- Determine which templates are needed to **close coverage gaps** for a baseline.
- Understand which non-standard documents effectively behave like which template/domain.

---

## 8. Strategic Impact

This session significantly advanced ADPA from a “document + AI extraction” tool toward a **project intelligence platform**:

- **PMBOK 8 Performance Domains**:
  - Can now be assessed quantitatively using weighted entities.
  - Supports compliance reporting and gap analysis.

- **Knowledge Domains**:
  - Provide a function-focused view of project health.
  - Make it easy to see missing functions (e.g., Finance at 0%).

- **Project Phases**:
  - Reveal whether documentation and planning are front-loaded, execution-heavy, or weak in closing.
  - Inform governance about project lifecycle balance.

- **Weighted Allocation System**:
  - Eliminates double-counting.
  - Preserves **cross-domain** and **cross-phase** relationships.
  - Always reconciles back to the **true number of extracted entities** (e.g., 742).

This provides a robust foundation for:
- Baseline coverage checks,
- Drift detection,
- Root cause analysis,
- Template quality evaluation,
- And standard-agnostic compliance (PMBOK 8 and beyond).


