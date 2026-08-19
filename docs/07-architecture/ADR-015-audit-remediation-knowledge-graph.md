# ADR 015: CAM/KAM Audit Finding Standardization — Remediation Reference Architecture

## 1. Status
**Proposed (2026-07-20), revised twice same day.** First revision incorporated a fuller taxonomy and workflow definition supplied by the Project Owner (Menno Drescher, [LinkedIn](https://www.linkedin.com/in/mennodrescher/), post "Learn to Communicate: in the age of AI communication becomes more important," 2026-07-19, and the resulting discussion thread). Second revision renamed the `Playbook` node type to `RemediationPlaybookDoc` (§3.1, §2.3) after cross-checking against [ADR-016](ADR-016-generated-document-risk-to-issue-escalation.md), which surfaced that `Playbook` already exists in this codebase as a relational, project-scoped, step-executed entity (`operational_playbooks`, `playbookService.ts`'s exported `Playbook` interface) — a genuinely different shape and scope from what this ADR describes, and a direct TypeScript identifier collision had both been implemented as written. This remains a net-new capability proposal — verified against the current codebase (§2) that nothing today models external-audit findings or a remediation-archetype taxonomy. Scoped here as a decision on shape and extension points, not a fully specified implementation.

Deciders: Owners of `server/src/services/gkg/` (Governance Knowledge Graph), the `compliance` governed-feature packet, and DRACO governance (ADR-004).

## 2. Context

### 2.1 The problem
Critical Audit Matters (CAMs) and Key Audit Matters (KAMs) — the matters an external auditor's report highlights as most significant under PCAOB AS 3101 / ISA 701 — read as unique each cycle, but a review of CAMs/KAMs, regulator inspection reports (PCAOB, FRC, IAASB, ASIC, AFM), and internal audit findings across organizations shows the *remediation* work behind them is highly repeatable: roughly 80% falls into a relatively small number of recurring patterns. The prevailing model is **Finding → Project → Closure**, re-solving the same problem each time it resurfaces rather than recognizing it as a known, previously-solved capability gap. The proposed model is **Finding → Capability Gap → Standard Remediation Pattern → Evidence of Effectiveness**, built on a knowledge graph — a *Remediation Reference Architecture* — where each recurring finding type is modeled as a reusable architectural pattern rather than a static document.

### 2.2 Finding taxonomy (seed set)
The source material organizes recurring findings into five tiers, ranked by return on investment — Tier 1 findings recur in nearly every audit programme and are the most automatable; later tiers involve more judgment or are earlier in their maturity curve:

| Tier | Domain | Example archetypes | Representative systems |
|---|---|---|---|
| 1 — Enterprise control failures | The "factory" opportunities: nearly universal, highly rule-based | Identity & Access Management (excessive privileged access, dormant/orphaned accounts, weak MFA, joiner/mover/leaver failures); Segregation of Duties (conflicting create/approve roles); IT General Controls (change management, backups, patching, config drift) | Entra ID, SailPoint, Okta, CyberArk, Active Directory, SAP GRC, Oracle, Dynamics 365, Workday |
| 2 — Finance process remediation | More business judgment, still pattern-based | Record-to-Report (late reconciliations, manual journals, close delays); Revenue Recognition (contract management, manual allocation); Procure-to-Pay (duplicate suppliers/payments, three-way match failures) | SAP, Oracle, BlackLine, Trintech |
| 3 — Data governance | Rapidly increasing in volume | Duplicate master data, missing ownership, poor lineage, inconsistent definitions | Collibra, Microsoft Purview, Informatica |
| 4 — Cyber & operational resilience | Aligns to established frameworks | Asset inventory gaps, vulnerability/patch management, logging & monitoring, incident response, backup testing | Maps to NIST CSF, ISO/IEC 27001 |
| 5 — Emerging assurance domains | Newer, growing rapidly | ESG Reporting (data lineage, manual calculations, weak sustainability-metric controls); AI Governance (unapproved AI usage, missing model inventories, insufficient validation, prompt-management gaps, data leakage, missing human oversight) | Maps to ISO/IEC 42001, EU AI Act |

Tier 5's AI Governance archetype is worth flagging explicitly: its example findings (model inventories, validation, prompt management, human oversight) describe categories this repo's own DRACO governance (ADR-004) already partially addresses for AI-generated document content. That overlap is noted here as an observation, not a design decision — whether ADPA's own DRACO review trail should eventually be ingestible as `AuditFinding` evidence under this same architecture is out of scope for this ADR and would need its own follow-on.

This taxonomy is a **seed set, not a closed list** — Tier 5 in particular is described as likely to grow. The schema in §3 treats archetypes as data (seeded rows), not a hardcoded enum, so new archetypes can be added without a schema change.

### 2.3 What already exists in this repo (verified, not assumed)
This is genuinely net-new — no existing module, table, or doc models CAM/KAM, this finding taxonomy, or remediation playbooks. Three things sound adjacent but are not, and the naming below is chosen specifically to avoid conflating them:

- **`server/src/modules/compliance/` is not this.** Its `ComplianceFinding`/`RemediationGuidance`/`RemediationStep` types (`server/src/modules/compliance/types.ts`) validate *AI-generated document content* against PMBOK/BABOK/DMBOK rule packs — "finding" there means "a generated document violated a standards rule," not "an external auditor's CAM/KAM." This ADR uses `AuditFinding` specifically to keep the two apart in code and docs.
- **`server/src/services/gkg/` (Governance Knowledge Graph) is the real Neo4j-backed graph** in this repo (`server/modules/knowledge-graph/` is a small in-memory test stub, not this). Its current node types are narrowly `Requirement | Risk | Stakeholder | Milestone | Constraint | Deliverable` (`gkgContextService.ts:28`), used exclusively to build Markdown RAG context for document generation. It is the natural place to add new node types, but its current single consumer (document-generation context assembly) means adding audit-remediation node types is a genuine scope expansion, not a drop-in fit.
- **"Capability" already means something different in this repo.** [ADR-005](ADR-005-federated-capability-ownership.md)'s capability registry (extended by [ADR-012](ADR-012-capability-register-and-request-lifecycle.md)/[ADR-013](ADR-013-capability-register-attestation-and-drift-visibility.md)) tracks ADPA's own *platform* capabilities — governed-feature modules/packets, each with an owner and attestation deadline, stored in the `capability_registry` Postgres table. This ADR's "business capability" (e.g., "Identity & Access Management" as an enterprise function) is an unrelated, EA-style concept that happens to share the same English word. This ADR uses the graph node type `EnterpriseCapability` to avoid any collision with `capability_registry`/`CapabilityRegistryEntry` in code, queries, or UI.
- **DRACO (ADR-004)** is a reusable *pattern* — a multi-agent review board (Evidence Validator, Governance Evaluator, Counterfactual Challenger) with a human-override protocol, currently gating AI-generated document publication (`draco_reviews` schema, `server/migrations/003_add_draco_review_schema.sql`). It validates AI-generated content grounding, not whether remediation evidence (control test results, sign-offs, screenshots) satisfies an auditor. This ADR reuses the *pattern* for an escalation review board, not DRACO's existing schema or scope directly.
- **`Playbook` is already a first-class concept in this codebase, and it is not this.** `operational_playbooks` / `playbook_executions` / `playbook_response_steps` / `playbook_scenarios` / `playbook_step_executions` (`server/migrations/000_baseline.sql:3697-3999`), driven by `server/src/services/playbookService.ts` (which exports `interface Playbook`, `playbookService.ts:15`) and `server/src/modules/execution/{PlaybookController,PlaybookRepository}.ts`, with a UI at `app/(dashboard)/playbooks/page.tsx`. It is a **project-scoped** (`operational_playbooks.project_id` is `NOT NULL`), **structured, step-executed runbook** — ordered `playbook_response_steps` with `assigned_role`/`sla_hours`, tracked via `playbook_executions.current_step_id`/`completed_steps` — matched to a triggering issue/risk by `playbookService.findMatchingPlaybooks()` scoring `applicable_risk_categories`/`applicable_severity_levels`/`applicable_priority_levels`. This is structurally and scope-wise a different thing from what §3.1 originally called `Playbook`: a versioned Markdown-in-JSONB *document* generated once per `RemediationArchetype` (not per project) via `documentGenerationService`, with narrative sections rather than executable steps. Reusing the identifier `Playbook` for both would collide directly in code (`playbookService.ts:15` already exports that name) and conceptually (one is an authored reference document describing a remediation pattern in general; the other is a per-project operational runbook with SLAs and execution tracking). §3.1 therefore uses `RemediationPlaybookDoc` for this ADR's node type. The two remain related, not merged: see §3.4's new bullet on how a `RemediationPlaybookDoc`'s steps could seed a project-specific `operational_playbooks` entry when a matched archetype is actually applied — a forward-looking integration note, not a decision made here.

## 3. Decision

Extend the GKG schema with a new set of node and relationship types under a new governed-feature packet, layered on top of (not inside) GKG's existing document-generation-context scope. The taxonomy in §2.2 is seeded as data, not hardcoded as an enum, so it can grow without a schema migration.

### 3.1 Node types
| Node | Purpose |
|---|---|
| `AuditFinding` | A CAM/KAM, internal-audit finding, or regulator observation. Carries source type (external audit / internal audit / regulator inspection — PCAOB, FRC, IAASB, ASIC, AFM), severity, date raised. |
| `RemediationArchetype` | One row per seeded taxonomy entry (§2.2) — the reusable pattern, e.g. "Identity & Access Management," "Segregation of Duties." Findings classify *against* this seeded set; new archetypes can be added as data. |
| `EnterpriseCapability` | Business capability affected (distinct from `capability_registry` — see §2.3). |
| `BusinessProcess` | e.g. Order-to-Cash, Procure-to-Pay, Record-to-Report. |
| `ApplicationPlatform` | The system(s) involved (Entra ID, SAP GRC, BlackLine, Collibra, etc. — instances, not new node types per system). |
| `DataEntity` | For data-lineage-relevant findings (Tier 3 in particular). |
| `Control` | Reuses/extends GKG's existing control concept. |
| `ControlFramework` | COSO, COBIT, NIST CSF, ISO/IEC 27001, ISO/IEC 42001 — distinct from `RegulatoryRequirement`. |
| `RegulatoryRequirement` | EU AI Act, SOX, GDPR, etc. — law/regulator-specific, not a control framework. |
| `RootCause` | Categorized per the workflow's Root Cause Analysis step: `process \| people \| technology \| data \| governance \| policy`. |
| `RemediationAction` | A corrective action, linked to the SOP it follows. |
| `SOP` | Standard operating procedure a remediation action follows. |
| `EvidenceRequirement` | What an auditor needs to see to accept the remediation as closed. |
| `KPI` | Continuous-monitoring metric proving the control stays effective post-remediation. |
| `RemediationPlaybookDoc` | The authored reference instantiation of a `RemediationArchetype` — versioned, Markdown-in-JSONB (consistent with ADPA's canonical-storage rule), generated once an archetype's finding volume justifies it. Deliberately named to avoid colliding with this codebase's existing `Playbook` (`playbookService.ts:15`, `operational_playbooks`) — a project-scoped, step-executed runbook entity that is a different shape and scope; see §2.3. |

### 3.2 Key relationships
`AuditFinding -[CLASSIFIED_AS]-> RemediationArchetype`, `-[AFFECTS]-> EnterpriseCapability`, `-[IMPACTS]-> BusinessProcess`, `-[INVOLVES]-> ApplicationPlatform`, `-[TOUCHES]-> DataEntity`, `-[HAS_ROOT_CAUSE]-> RootCause`; `RootCause -[RESOLVED_BY]-> RemediationAction`; `RemediationAction -[FOLLOWS]-> SOP`, `-[PRODUCES]-> EvidenceRequirement`, `-[MONITORED_BY]-> KPI`; `Control -[MITIGATES]-> Risk` (reusing GKG's existing `Risk` node), `-[GOVERNED_BY]-> ControlFramework`; `Risk -[GOVERNED_BY]-> RegulatoryRequirement`; `RemediationArchetype -[STANDARDIZED_AS]-> RemediationPlaybookDoc`.

### 3.3 The ten-step workflow, mapped to mechanism
The source material's workflow is consistent across every tier; each step maps to a specific mechanism rather than being purely procedural:

1. **Detection** — finding ingestion (manual entry or import) creates an `AuditFinding` node.
2. **Classification** — `CLASSIFIED_AS` a `RemediationArchetype`; severity/regulatory-implication tagging.
3. **Root Cause Analysis** — graph traversal to `RootCause`, categorized (process/people/technology/data/governance/policy).
4. **Impact Assessment** — graph traversal from the finding to affected `EnterpriseCapability`, `BusinessProcess`, `ApplicationPlatform`, `DataEntity`, `Risk`/`Control`.
5. **Remediation Design** — if a `RemediationPlaybookDoc` already exists for the matched archetype, propose it; otherwise draft a new `RemediationAction`/`SOP` pairing.
6. **Implementation** — execution tracking (out of this ADR's graph-schema scope; likely integrates with existing project/task tracking rather than duplicating it).
7. **Validation** — reuses DRACO's review-board pattern (Evidence Validator role) to test remediation effectiveness before closure.
8. **Evidence Collection** — populates `EvidenceRequirement` nodes with actual artifacts.
9. **Closure** — human governance sign-off, reusing DRACO's human-override protocol.
10. **Knowledge Capture** — the feedback loop this ADR's first draft was missing: outcomes feed back into refining the matched `RemediationPlaybookDoc` (or spawning a new `RemediationArchetype` if the finding didn't fit any existing one), so the taxonomy itself improves over time rather than staying static.

A **validation-round batch job** (same scheduling pattern as the existing `templateAnalysisJob.ts`) periodically re-ranks `RemediationArchetype`s by matched-finding frequency — this ranking is what determines which archetypes get a generated `RemediationPlaybookDoc` first.

### 3.4 Integration with existing ADPA systems
The mechanisms in §3.1–§3.3 are not a bolt-on system next to ADPA's document-generation engine — most of them are specific reuses of it. Made explicit here because the schema/workflow tables above describe *what* connects without saying *how*:

- **Generated documents feed the graph, not just the reverse.** §3.3 step 1 (Detection) says "manual entry or import," but the same inline-extraction pattern that already turns generated Markdown into structured entities (`ExtractionRegistry.ts`, `inlineEntityExtractionPrompt.ts` — the mechanism behind `business_case_details` and the other H8-extracted entity types) is the natural way to populate `AuditFinding` automatically whenever an audit report or risk assessment document is generated or uploaded. This needs one new extractor module under `server/src/services/extraction/entities/` following the existing per-entity-type pattern, not new extraction infrastructure.
- **The graph feeds generated documents back.** A `RemediationPlaybookDoc` (§3.1) is not a bespoke document type needing its own renderer — it is a new template category run through the existing `documentGenerationService.generateDocument()` pipeline (plan → draft sections → assemble → `quality-audit` job), the same pipeline that generated every Cost/Resource/Communication Management Plan referenced elsewhere in this session. One draft section per ten-step-workflow stage (§3.3), same multi-stage machinery, same versioning-on-regeneration behavior Knowledge Capture (step 10) needs.
- **A `RemediationPlaybookDoc` is a reference, not a runbook — but it can seed one.** When a matched archetype's remediation is actually applied to a specific audit engagement, its `RemediationAction`/`SOP` steps (§3.2) are the natural input to create a project-scoped `operational_playbooks` row (§2.3) via `playbookService`, giving that specific remediation SLA-tracked, role-assigned, `playbook_executions`-tracked steps — the same operational machinery [ADR-016](ADR-016-generated-document-risk-to-issue-escalation.md) wires up for project risks. This is a plausible Phase 6+ integration, not a decision made here: the two systems stay conceptually and schematically distinct (§2.3), and whether/how one instantiates the other needs its own design pass.
- **Risk entities require no new plumbing.** §3.2's `Control -[MITIGATES]-> Risk` already specifies reusing GKG's *existing* `Risk` node type (`gkgContextService.ts:28`) rather than creating a parallel one, so a project's tracked risks and this system's audit findings are traversable in the same graph from day one. Separately, `draftSection`'s signal-based context injection (`documentGenerationService.ts:1636`, the `signals.risks` regex over section heading/goal text) already pulls relevant risk context into any generated section whose content is risk-related — a `RemediationPlaybookDoc`'s "Impact Assessment" section gets this automatically, with no new code, the same way every other risk-relevant document section does today.
- **Issue escalation belongs in the Governor Portal, not the Researcher Dashboard.** Per this repo's tier separation (CLAUDE.md: Orchestration Tier = "sole execution authority for governance rituals," Experience Tier = "read-only/decision" exploration), a human sign-off on whether a remediation is closed is a high-integrity decision — the same category as the Capability Register (ADR-012/013), which lives in `orchestrator/Adpa.Web` (Blazor), not `app/` (Next.js). DRACO's human-override *protocol* is the pattern to copy for this reviewer UI; its `draco_reviews` schema (`server/migrations/003_add_draco_review_schema.sql`) is not reused directly, since it validates document-grounding evidence, not remediation evidence — a structurally similar but distinct table is expected.

## 4. Options Considered

### Option A: Status quo — no standardization, findings stay project-by-project
Rejected: this is precisely the "Finding → Project → Closure" loop the proposal is trying to break.

### Option B: Fully emergent taxonomy — cluster findings bottom-up, no seeded archetype list
| Dimension | Assessment |
|---|---|
| Complexity | Lower initial modeling effort |
| Time to value | Slow — needs a large finding corpus before useful clusters emerge |
| Matches source material | No — the source material provides a specific, opinionated 5-tier/~15-archetype starting taxonomy precisely to avoid this cold-start problem |

Rejected as the default, but the underlying clustering mechanism (§3.3 step 10, Knowledge Capture) is retained as the mechanism for *extending* the seeded taxonomy over time.

### Option C: Standalone new module + isolated graph database (not GKG)
| Dimension | Assessment |
|---|---|
| Isolation | Clean — zero risk of GKG scope creep |
| Cost | Duplicates infra (driver, connection management, reconcile machinery) `server/src/services/gkg/` already has working |

Rejected as the default: the isolation benefit doesn't justify re-standing-up Neo4j connection/lifecycle machinery this repo already has, when the actual risk (GKG scope creep) can be managed with a distinct label namespace instead (§6 Phase 0).

### Option D (Recommended): Seeded taxonomy + GKG schema extension + new governed-feature module
Combines a curated starting taxonomy (§2.2, avoiding Option B's cold-start problem) with GKG's existing Neo4j infrastructure (avoiding Option C's duplication), plus a new governed-feature module for the domain logic (ingestion, classification, validation-round ranking, escalation, playbook generation, knowledge-capture feedback).

## 5. Consequences

### Positive
- A curated starting taxonomy (§2.2) gives immediate value instead of waiting for emergent clustering to accumulate enough data to be useful.
- The validation round's frequency ranking gives an objective priority order for which playbooks to build first.
- The ten-step workflow's Knowledge Capture step (§3.3 step 10) closes the loop — the taxonomy improves from real outcomes instead of staying a static document.
- Reuses existing Neo4j/GKG infrastructure and DRACO's review-board pattern rather than standing up parallel infrastructure.

### Negative
- Genuinely new schema and module, now larger than the first draft — fifteen node types, not the original ten, plus a two-tier concept (`RemediationArchetype` as curated taxonomy vs. `RemediationPlaybookDoc` as its generated instantiation) that must stay clearly distinguished in implementation.
- Naming collisions are real and must be enforced in code review, not just this document: `AuditFinding` vs. `compliance`'s `ComplianceFinding`; `EnterpriseCapability` vs. `capability_registry`'s platform capabilities; `BusinessProcess` should not be confused with ADPA's own internal document-generation pipeline stages; `RemediationPlaybookDoc` vs. the existing `Playbook` (`playbookService.ts`, `operational_playbooks`) — this last one was missed in the first two revisions of this ADR and only caught by cross-checking against ADR-016, which is itself a caution about how easily this class of collision slips through a single-pass review.
- Expanding GKG beyond its current single consumer (document-generation RAG context) is a scope decision this ADR does not finish making — §6 Phase 0 is a required spike, not a formality.
- `AuditFinding` records likely contain sensitive, pre-disclosure audit information; access control on this subgraph needs its own design pass before any UI exposes it, distinct from GKG's current RAG-context access model which assumes project-scoped document context, not audit-firm-confidentiality-scoped data.
- Tier 5's AI Governance archetype creates a self-referential edge case (§2.2) worth tracking even though it's explicitly out of scope here.

## 6. Action Items

Phased, following the Governed Feature Loop (contract guards before implementation; new packet id `audit-remediation-knowledge-graph` in `server/governed-features.manifest.json`, since none of the existing `compliance`/`knowledge-graph`/`ip-governance` packets fit):

1. **Phase 0 (spike, required before Phase 1)**: decide whether the new node types share GKG's existing Neo4j graph (with a distinct label prefix, e.g. `Audit_*`) or use an isolated database/graph within the same Neo4j instance.
2. **Phase 1**: schema (§3.1/§3.2), contract guards proving the dual-store invariants `DualStoreTransactionManager.ts`'s pattern already tests for Pillar 3 hold for the new types too, new manifest packet.
3. **Phase 2**: seed the Tier 1–5 `RemediationArchetype` taxonomy (§2.2) as data; ingest a first batch of `AuditFinding`s (manual entry or import) and classify against it.
4. **Phase 3**: validation-round batch job (node-cron, mirroring `templateAnalysisJob.ts`) producing the archetype frequency ranking that drives playbook-generation priority.
5. **Phase 4**: `RemediationPlaybookDoc` generation as Markdown-in-JSONB for the highest-ranked archetypes, following the ten-step structure (§3.3) as the document's own outline.
6. **Phase 5**: escalation/validation/closure review board reusing DRACO's multi-agent pattern and human-override protocol (ADR-004), scoped to remediation-evidence sufficiency rather than document grounding.
7. **Phase 6**: Knowledge Capture feedback loop — outcomes update the matched `RemediationPlaybookDoc`, or, when a finding doesn't fit any seeded archetype, propose a new one for human review rather than silently forcing a mismatch.
8. **Phase 7 (optional, needs its own design pass)**: evaluate whether an applied `RemediationPlaybookDoc` should seed a project-scoped `operational_playbooks` entry via `playbookService` (§3.4), giving a specific engagement's remediation SLA-tracked, role-assigned execution steps rather than leaving the reference document as the only artifact.

## 7. References
- Project Owner's LinkedIn post "Learn to Communicate: in the age of AI communication becomes more important" (Menno Drescher, [profile](https://www.linkedin.com/in/mennodrescher/), 2026-07-19) and its discussion thread — source of the finding taxonomy (§2.2) and the ten-step workflow (§3.3).
- `server/src/modules/compliance/types.ts` — `ComplianceFinding`, `RemediationGuidance`/`RemediationStep`, `ComplianceRecommendation`, `ComplianceAuditEntry`: the document-content compliance concept this ADR's `AuditFinding` must stay distinct from.
- `server/src/services/gkg/gkgContextService.ts:28` — current GKG node types and their document-generation-context-only scope.
- `docs/07-architecture/GKG_CONTEXT_STRATEGY.md`, `docs/07-architecture/GKG_SCHEMA.md` — existing GKG design this ADR extends.
- `server/src/modules/knowledge-graph/DualStoreTransactionManager.ts` — the dual-store (Postgres + Neo4j) atomicity pattern the new node types must also satisfy.
- `server/migrations/003_add_draco_review_schema.sql` — DRACO's existing review schema, the pattern (not the schema) reused for escalation/validation/closure.
- `server/governed-features.manifest.json` — existing packets checked for overlap (`compliance`, `knowledge-graph`, `ip-governance`); none fit, confirming a new packet is needed.
- `server/src/services/playbookService.ts:15` (`export interface Playbook`), `server/migrations/000_baseline.sql:3697-3999` (`operational_playbooks` and related tables) — the pre-existing `Playbook` concept this ADR's `RemediationPlaybookDoc` was renamed to avoid colliding with; see §2.3.

## Related ADRs
- [ADR-004: DRACO AI Governance](ADR-004-DRACO-AI-GOVERNANCE.md) — source of the multi-agent review-board pattern and human-override protocol reused for Validation/Closure (§3.3 steps 7, 9).
- [ADR-005: Federated Capability Ownership](ADR-005-federated-capability-ownership.md) — owns the *other*, unrelated meaning of "capability" in this repo; named explicitly here to prevent conflation with `EnterpriseCapability`.
- [ADR-012: Capability Register and Request-Creation Lifecycle](ADR-012-capability-register-and-request-lifecycle.md), [ADR-013: Capability Register Attestation Deadline and Drift-Reason Visibility](ADR-013-capability-register-attestation-and-drift-visibility.md) — same naming-collision note as ADR-005.
- [ADR-016: Generated-Document Risk Detection → Risk Register → Issue Escalation → Remediation Playbooks](ADR-016-generated-document-risk-to-issue-escalation.md) — the project-risk equivalent of this ADR's Finding→Register→Playbook shape, but an *integration* decision on existing relational tables (`risks`, `issues`, `operational_playbooks`) rather than a net-new GKG schema. Cross-checking against it is what surfaced the `Playbook` naming collision fixed in this revision (§2.3); it also owns the existing `Playbook`/`operational_playbooks` concept this ADR's `RemediationPlaybookDoc` must stay distinct from.
