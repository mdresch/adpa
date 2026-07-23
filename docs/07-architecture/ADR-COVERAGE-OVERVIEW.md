# ADPA Architecture Decision Records — Coverage Analysis

## Purpose

This document catalogs every ADR in `docs/07-architecture/`, maps each to the core
functional and non-functional pillars ADPA exhibits in code, and identifies the
largest gaps where a feature or subsystem with a running implementation has no
architectural record at all. It is the basis for writing new ADRs that extend
coverage without re-litigating decisions that have already been made.

---

## 1. Current ADR Inventory

| # | Title | Status | Pillar |
|---|---|---|---|
| 001 | Stakeholder Role Catalog | Accepted | Data Architecture & Entity Management |
| 004 | DRACO AI Governance | Accepted / Operationalized | AI Governance & Document Quality |
| 005 | Federated Capability Ownership | Proposed | Governance, Compliance & Regulatory |
| 006 | Digital Twin L0 Conformance Verification | Proposed | Digital Twin & Asset Intelligence |
| 007 | xAI Developer Tools Suite | Proposed | AI Provider Strategy (single provider) |
| 008 | Markdown to Styling | Accepted | Experience Tier (Researcher Dashboard) |
| 009 | Unified Authentication | Accepted | Authentication & Identity |
| 010 | Digital Twin L1/L2 Generation Pipeline | Proposed | Digital Twin & Asset Intelligence |
| 011 | Governor Portal Visual Design System | Accepted | Governor Portal / Orchestration Tier |
| 012 | Capability Register and Request Lifecycle | Proposed | Governance, Compliance & Regulatory |

**Missing from sequence:** 002, 003 — never assigned.

---

## 2. ADPA Core Pillars

The following pillars were derived by cross-referencing all `server/src/modules/*`
directories, the `app/` route tree, the governed-features manifest, and the README
feature list against the existing ADR set.

| Pillar | Domain | Current ADR Coverage |
|---|---|---|
| **P1 — Document Generation Pipeline** | The multi-stage AI pipeline that turns templates + context into Markdown documents | None |
| **P2 — Context & Knowledge Management** | Context gathering, retrieval (RAG), injection, freshness, variable resolution, access control | None |
| **P3 — Entity Extraction & Knowledge Graph** | H8 inline entity extraction, dual-store Neo4j/PostgreSQL sync, entity matching, entity audit | None |
| **P4 — AI Governance & Document Quality** | DRACO board, QA stage pipeline, quality gates, prompt management, compliance rulesets | ADR-004 (DRACO only — broad QA and compliance rulesets uncovered) |
| **P5 — AI Provider Strategy & Multi-Model Orchestration** | Provider adapters, failover, model discovery, cost optimization, observability, prompt routing | ADR-007 (xAI single provider only) |
| **P6 — Template Lifecycle & Template Management** | Template state machine, template-driven generation, quality regression detection, prompt optimization | None |
| **P7 — Digital Twin & Asset Intelligence** | L0/L1/L2 asset register, conformance verification, topology, telemetry, iTwin/Azure DT rendering | ADR-006 + ADR-010 (well covered) |
| **P8 — Authentication & Identity** | Firebase single IdP, JWT, RBAC, department membership, session management, SSO | ADR-009 (well covered, one open item) |
| **P9 — Governance, Compliance & Regulatory** | Federated capability ownership, DRACO verdict gating, module activation lifecycle, capability register lifecycle, BPMS governance, EU AI Act scoring, PMBOK/BABOK/DMBOK alignment | ADR-004 + ADR-005 + ADR-012 (partial — BPMS, EU AI Act, standards-scoring uncovered) |
| **P10 — Experience Tier (Researcher Dashboard)** | Frontend styling, Markdown rendering, AI chat (Morphic), search, real-time collaboration | ADR-008 (styling only; Morphic AI chat, search, collaboration uncovered) |
| **P11 — Governor Portal / Orchestration Tier** | Blazor UI, design system, approval workflows, override/break-glass panels | ADR-011 + ADR-012 (well covered) |
| **P12 — Data Architecture & Entity Management** | Entity extraction framework, context management, knowledge graphs, database strategy | ADR-001 (stakeholder roles only; entity extraction framework, KG, and broader DB strategy uncovered) |
| **P13 — Integration Ecosystem** | Confluence, SharePoint, GitHub, Adobe Document Services, e-signature | None |
| **P14 — Infrastructure & Deployment** | Docker, API/Worker split, multi-environment deployment, circuit breakers, connection resilience | None |
| **P15 — Multi-tenancy & Portfolio Architecture** | Portfolio isolation, resource capacity, project hierarchy, context items | None |
| **P16 — Queue & Async Processing** | Bull/Redis job queues, background orchestration, parallel AI processing, cascading regeneration | None |
| **P17 — Drift Resolution & Document Versioning** | Document drift detection, version comparison, baseline management, cascading regeneration triggers | None |
| **P18 — Project Delivery & Execution** | Project CRUD, PMBOK process execution, issues, risks, tasks, playbook QA, change control | None |
| **P19 — Analytics & Observability** | Real-time analytics, AI generation tracking, monitoring dashboards, audit trail | None |
| **P20 — Agent Orchestration** | Agent registry, tool registry, ECS, project phase orchestration, Rovo/Gemini/AI agents | None |

---

## 3. Current ADR-to-Pillar Coverage Map

```
ADR-001  ░░░░░░░░▓▓░░░░░░░░░░░░░░░░░░  Data Architecture (P12, partial)
ADR-004  ░░░░░░▓▓▓▓▓░░░░░░░░░░░░░░░░░░  AI Governance (P4, partial)
ADR-005  ░░░░░░░░░░▓▓▓▓▓▓▓░░░░░░░░░░░░  Governance (P9, partial)
ADR-006  ░░░░░░░░░░░░░░░░░▓▓░░░░░░░░░░  Digital Twin (P7, L0 only)
ADR-007  ░░░░░░░░░░░░░░░░░░░▓▓░░░░░░░░  AI Provider (P5, xAI only)
ADR-008  ░░░░░░░░░░░░░░░░░░░░░░▓▓░░░░░  Experience Tier (P10, styling only)
ADR-009  ░░░░░░░░░░░░░░░░░░░░░░░░▓▓▓░░  Auth & Identity (P8)
ADR-010  ░░░░░░░░░░░░░░░░░░░▓▓▓▓░░░░░░  Digital Twin (P7, L1/L2)
ADR-011  ░░░░░░░░░░░░░░░░░░░░░░░░░▓▓░░  Governor Portal (P11)
ADR-012  ░░░░░░░░░░░░░░░░▓▓▓▓▓▓▓▓░░░░░  Governance (P9, capability register)
```

Where `▓` = ADR covers this pillar, `░` = no coverage.

### Pillars with zero ADR coverage (the largest gaps)

| Priority | Pillar | Why It Matters |
|---|---|---|
| **Critical** | P1 — Document Generation Pipeline | The central feature of ADPA. The multi-stage processor (context gathering → template processing → AI generation → QA → output formatting → cascading regeneration) has an ~10.7K-line implementation (`multiStageDocumentProcessor/`) but no architectural record of the pipeline design itself. |
| **Critical** | P2 — Context & Knowledge Management | Ten modules (`context`, `contextGathering`, `contextOrchestrator`, `contextBundle`, `contextInjection`, `contextRetrieval`, `contextFreshness`, `contextRepository`, `contextAccessControl`, `variableResolution`) implement a full context pipeline feeding the document generator. No ADR explains why each exists, how they interact, or the freshness/access-control trade-offs. |
| **Critical** | P3 — Entity Extraction & Knowledge Graph | H8 entity inline extraction, dual-store Neo4j/PostgreSQL transactional atomicity, entity matching, entity freshness, and template analytics profiling are core differentiating features. No ADR. |
| **High** | P5 — AI Provider Strategy (beyond xAI) | ADR-007 covers xAI exclusively. The `ai/` module has adapters for OpenAI, Google, Mistral, Ollama, Azure, and Copilot with a `FallbackExecutor`. That multi-provider failover, cost optimization, and provider selection model is undocumented at the ADR level. |
| **High** | P16 — Queue & Async Processing | Bull/Redis queues, `AIGenerationJobService`, `jobManager`, parallel AI processing, and the `StuckJobMonitor` drive the entire async pipeline. No ADR. |
| **High** | P15 — Multi-tenancy & Portfolio Architecture | Portfolio isolation, resource capacity, project hierarchy, and the `portfolioDomains` system are load-bearing for every other tier yet have no architectural record. |
| **High** | P6 — Template Lifecycle & Template Management | The template state machine (`template-lifecycle`), quality regression detection, template health tracking, and system prompt optimization have governed-features tests but no ADR. |
| **Medium** | P9 — Compliance (beyond DRACO/capability) | BPMS governance rulesets, EU AI Act scoring, PMBOK/BABOK/DMBOK compliance alignment are implemented (`compliance/` module with `babokRuleset`, `pmbokRuleset`, `dmbokRuleset`) but ADR-004 covers DRACO only. |
| **Medium** | P10 — Morphic AI Chat | The Morphic AI chat experience (`server/src/modules/morphic/` backend module with frontend pieces in `components/morphic/`, `lib/morphic/`, and `app/api/morphic/`) is a primary user-facing feature with no architectural record. |
| **Medium** | P13 — Integration Ecosystem | The README lists Confluence OAuth2, SharePoint, GitHub, and Adobe Document Services as differentiators. The `integrations/` module exists. No ADR. |
| **Medium** | P14 — Infrastructure & Deployment | API/Worker split, lazy Puppeteer, Langfuse telemetry restrictions are governed-features-governed but not ADR'd. |
| **Medium** | P17 — Drift & Cascading Regeneration | `document-dependency-graph`, `cascading-regeneration`, and the `drift/` UI are visible features with no ADR. |
| **Medium** | P18 — Project Delivery & Execution | PMBOK process execution (`execution/`), playbook management, issues, risks, tasks, and playbook QA are the operational core. No ADR. |
| **Lower** | P19 — Analytics & Observability | Real-time dashboard, AI generation tracking, monitoring — no ADR. |
| **Lower** | P20 — Agent Orchestration | Multi-agent orchestration with Rovo/Gemini/AI tools — no ADR. |
| **Lower** | P12 — Data Architecture (beyond stakeholders) | Entity extraction framework, knowledge graph schema, database strategy — broader than ADR-001's stakeholder-specific scope. |

---

## 4. Recommended New ADRs (Prioritized)

### Tier 1 — Write These Next (core differentiating features with no ADR)

**ADR-013: Document Generation Pipeline Architecture**

- **Pillar:** P1
- **Why:** The central feature of ADPA. The multi-stage processor (stages: context gathering → template processing → AI generation → quality assurance → output formatting → cascading regeneration) has a full implementation (`multiStageDocumentProcessor/`, ~10.7K lines across stages, engines, services) but no architectural record explaining the pipeline design, stage contracts, error propagation, or the rationale for the specific stage ordering. Every developer working on doc-gen currently reverse-engineers this from the code.
- **Scope:** Define the canonical pipeline shape, stage contracts, abort/retry semantics, stage-output schema, and the decision to keep doc generation Markdown-only (JSONB in Postgres, PDF/DOCX export only on demand).

**ADR-014: Context & Knowledge Management Framework**

- **Pillar:** P2
- **Why:** Ten modules implement context gathering, orchestration, bundling, injection, retrieval, freshness tracking, repository storage, and access control. These are the substrate that makes AI-generated context scoped to project + source document rather than generic. No ADR explains the pipeline shape, the freshness strategy, or the access-control model.
- **Scope:** Define the end-to-end context pipeline (gather → bundle → inject → retrieve), the freshness/expiry model, the token-budgeting approach, and the tenant-isolation boundary for context access.

**ADR-015: Entity Extraction & Knowledge Graph Architecture**

- **Pillar:** P3
- **Why:** H8 inline entity extraction, dual-store Neo4j/PostgreSQL transactional atomicity, entity matching scoring, entity freshness tracking, and template analytics profiling are core differentiating capabilities with no architectural record.
- **Scope:** Define the inline extraction contract, the dual-store write path, the matching/scoring model, and the relationship between extracted entities and the knowledge graph.

### Tier 2 — Write After Tier 1 (strategic and operational pillars)

**ADR-016: Multi-Provider AI Strategy and Failover Architecture**

- **Pillar:** P5
- **Why:** ADR-007 covers xAI only. The `ai/` module has production adapters for OpenAI, Google, Mistral, Ollama, Azure, and Copilot with a `FallbackExecutor` and provider test suite. Multi-provider failover, provider selection, cost optimization, and model discovery are load-bearing for reliability and cost control. The README names these providers as a differentiator.
- **Scope:** Define the provider abstraction, failover policy (primary/fallback ordering), cost-aware routing, model version management, and the `AIProviderTestSuite` contract.

**ADR-017: Queue & Background Processing Architecture**

- **Pillar:** P16
- **Why:** Bull/Redis queues, `AIGenerationJobService`, `jobManager`, parallel AI processing, `StuckJobMonitor` requeue, and cascading regeneration jobs drive the entire async pipeline. No ADR documents the job lifecycle, queue topology, parallelism model, or stuck-job recovery.
- **Scope:** Define the queue topology (which queues exist, what they carry), job lifecycle states, parallelism and concurrency limits, stuck-job detection/recovery, and the relationship between job processing and document cascading.

**ADR-018: Multi-Tenancy & Portfolio Architecture**

- **Pillar:** P15
- **Why:** Portfolio isolation, resource capacity, project hierarchy, portfolio domains, and context items are load-bearing for every other tier. The database schema enforces portfolio-scoped isolation, and the Governor Portal's approval gating is portfolio-aware, yet no ADR records the tenancy model.
- **Scope:** Define the tenant boundary (company → portfolio → project → document), isolation guarantees (what a user in Portfolio A can never see from Portfolio B), resource capacity model, and the `portfolioDomains` extension mechanism.

**ADR-019: Template Lifecycle & Governed Feature Management**

- **Pillar:** P6
- **Why:** The template state machine (draft → … → compliance → archived), quality regression detection, template health tracking, and system prompt optimization exist in production code with governed-features tests. No ADR explains the lifecycle stages, the quality feedback loop, or the relationship between template lifecycle and governed feature activation.
- **Scope:** Define the template lifecycle stages and transitions, the quality feedback loop (generation → DRACO review → template improvement), the health-tracking model, and the coupling between template lifecycle and feature governance.

**ADR-020: Compliance & Standards Alignment Framework**

- **Pillar:** P9 (broader)
- **Why:** ADR-004 covers DRACO, ADR-005 covers capability activation gating, and ADR-012 covers the request lifecycle — but the broader compliance framework (BPMS governance rulesets, EU AI Act scoring, PMBOK/BABOK/DMBOK alignment) has no architectural record. The `compliance/` module implements three standards rulesets and a validation engine.
- **Scope:** Define the compliance standards strategy, the scoring model, the validation engine architecture, and how compliance results feed back into DRACO review and document generation.

### Tier 3 — Write When Corresponding Feature Matures

**ADR-021: Morphic AI Chat Architecture**

- **Pillar:** P10 (Morphic component)
- **Why:** The Morphic AI chat experience is a primary user-facing feature (streaming, citations, KaTeX math, reasoning artifacts, multi-turn context). No ADR.

**ADR-022: Integration Ecosystem Architecture**

- **Pillar:** P13
- **Why:** Confluence, SharePoint, GitHub, and Adobe integrations are named README differentiators. The `integrations/` module exists. No ADR.

**ADR-023: Drift Resolution & Document Versioning**

- **Pillar:** P17
- **Why:** Drift detection, version comparison, baseline management, and cascading regeneration are visible, implemented features. No ADR.

**ADR-024: Analytics & Observability**

- **Pillar:** P19
- **Why:** Real-time analytics, AI generation tracking, performance insights, and monitoring dashboards have no ADR.

**ADR-025: Agent Orchestration Framework**

- **Pillar:** P20
- **Why:** Multi-agent orchestration (Rovo, Gemini, general-purpose agents), agent registry, tool registry, ECS, and project phase orchestration have no ADR.

---

## 5. Coverage Gap Summary

| Metric | Count |
|---|---|
| Existing ADRs | 10 |
| Pillars with at least one ADR | 10 of 20 |
| Pillars with zero ADR coverage | 10 of 20 |
| Modules (`server/src/modules/*`) with no ADR coverage | ~28 of 51 |

### The biggest risk: P1 and P2 have zero ADR coverage

The document generation pipeline (P1) and the context/knowledge management framework (P2) are the two pillars that make ADPA's "AI-generated, standards-compliant documentation" claim technical rather than aspirational. Every other pillar feeds into or depends on these two. The fact that neither has an ADR is the highest-priority gap.

---

## 6. How to Use This Document

1. **Validate the pillar model:** If a pillar here seems misnamed or mis-scoped, that's a signal to improve the understanding before writing ADRs, not during.
2. **Pick a Tier:** Write Tier 1 ADRs first (013, 014, 015), then Tier 2, then Tier 3. Each ADR is independently useful.
3. **Don't re-litigate decided questions:** The existing ADRs (004, 005, 009, 011, 012) are accepted or proposed. New ADRs should reference them for inherited decisions, not revisit them.
4. **Follow the existing pattern:** Every current ADR follows the same shape — Status, Context, Decision, Options Considered, Consequences, Action Items, References. Use the same structure.
5. **Keep the numbering clean:** The next ADR should be ADR-013 (002 and 003 are gaps in the sequence, not reusable).
