# ✅ RPAS‑CM Amendment Record: AMD‑2026‑06‑02‑0001

## 1. Metadata
- **Type**: INT (Integration) / GOV (Governance)
- **Status**: Proposed (Pre-Debriefing Draft)
- **Version Impact**: v0.5 (PMBOK Stage Gating & Adaptive Cognitive Relevance - Pre-Debriefing)
- **Task Class**: TCL-GOV + TCL-UX
- **Governance Gate**: AEV Gates 1-4
- **Reference**: RPAS-CM-GRA-001 (Guardrails) & CP8 — PMBOK Stage Gating and Adaptive Cognitive Relevance

## 2. Change Description

This amendment establishes **CP8 — PMBOK Stage Gating and Adaptive Cognitive Relevance**, a programmatic policy and execution layer that coordinates document generation dependencies and user cognitive tailoring within the ADPA framework.

### Core Provisions:

1. **PMBOK 6th Edition Stage Dependency Gating**
   - No document template or process-defined output may be generated within ADPA unless all its upstream input prerequisites (as mapped by the PMBOK 6th Edition process tree) exist and are validated in the project's document library.
   - Example: The *Project Management Plan* (Process 4.2) cannot be generated if the *Project Charter* (Process 4.1) or *Stakeholder Engagement Plan* (Process 13.2) is missing.
   - Any attempt to bypass this tree triggers a programmatic `GOVERNANCE_DEPENDENCY_LOCKOUT` error.

2. **Decoupled Dependency Registry**
   - The dependency map (49 processes and their prerequisite inputs) is separated from code constraints. It is recorded in a decoupled, queryable format (PostgreSQL schema or Neo4j GKG) accessible by the generation engine and UI checking panels.
   - Supports context lineage filtering where search algorithms (RAG/GKG) query the registry to restrict semantic ingestion specifically to validated prerequisite inputs, eliminating irrelevant context noise.

3. **Adaptive Cognitive Level & Competency-Specific Tailoring**
   - ADPA must adapt its LLM generation voice, technical depth, context density, and instruction length to the user's registered seniority level (Junior, Medior, Senior) to improve comprehension.
   - **Dynamic Skill & Competency Ingestion Matrix**: Rather than a flat, global seniority value, the system maps the target document's template to its PMBOK Knowledge Area (e.g. *Risk*, *Scope*, *Cost*, *Procurement*). It then resolves the user's registered competency level for that *specific* domain:
     - **Novice/Learner (Junior)**: Accessible professional tone, extensive explanation of terms, context compaction limited to 20%–40% density (using summary tables).
     - **Practitioner (Medior)**: Balanced business-professional tone, standard jargon, context compaction at 60%–80% density.
     - **Expert/Auditor (Senior)**: Compliance-dense technical vocabulary, default uncompacted citations (100% full-text density).
   - **Audience Profile Schema Compiling**: Before transmitting prompts to LLM endpoints, the engine compiles a structured JSON parameter block containing the author's role/department, their specific domain competencies, target reader roles, and style/tone snippets derived from their writing style profile. This compiler provides the model with concrete audience parameters, eliminating generic defaults and steering output vocabulary to align with internal and external reader requirements.
   - Core competency levels are retrieved from the user's registered skills database, permitting a single user to receive senior-level technical context in their areas of expertise while benefiting from simplified, educational guidance in unfamiliar domains.
   - Profile overrides and general style settings are stored in `user_writing_style` and profile tables for forward-compatibility.

4. **Composite Source Authority Framework**
   - The system tracks source document authority dynamically in the `source_authority` table.
   - Composite Authority Score is computed programmatically:
     $$\text{Composite Score} = S_{\text{pmbok\_native}} + S_{\text{status}} + S_{\text{author\_role}} - \text{Decay}(\text{recency\_hours})$$
   - On name conflicts or deduplication, attributes from higher-authority sources are preserved as primary, while lower-authority data is written to a versioned history.

## 3. Files Created/Modified

| File | Purpose | Change Type |
|------|---------|-------------|
| [pmbokAuthorityMapper.ts](file:///f:/Source/Repos/adpa/server/src/services/extraction/pmbokAuthorityMapper.ts) | Decoupled PMBOK registry mapper and prerequisite resolver | [NEW] |
| [entityExtractionService.ts](file:///f:/Source/Repos/adpa/server/src/services/entityExtractionService.ts) | Compute composite authority scores and manage entity conflict history | [MODIFY] |
| [documentGenerationService.ts](file:///f:/Source/Repos/adpa/server/src/services/documentGenerationService.ts) | Enforce PMBOK dependency gating and inject cognitive voice prompts / context density guides | [MODIFY] |
| [gkgContextService.ts](file:///f:/Source/Repos/adpa/server/src/services/gkg/gkgContextService.ts) | Query authority scores to prioritize high-trust context windows | [MODIFY] |

## 4. Governance Lineage

| Field | Value |
|---|---|
| Artifact ID | `AMD-2026-06-02-0001` |
| Version | `v0.5` |
| Maturity | Proposed (Pre-Debriefing of Board members and approval requests) |
| Parent | `RPAS-CM-ENV-001 v2.3.0 (CSR-42)` |
| Related | `RPAS-CM-TCL-001`, `RPAS-CM-AEV-001`, `RPAS-OPM.md` |
| Author | Agent (advisory) — proposed for board review |
| CSR Epoch | Pending board attestation |

## 5. Board Action Required

Per **G1 (Authority Boundary)** and **RPAS-HIL**, this amendment requires:

- [ ] Board review and approval of the gating rules
- [ ] Attestation of cognitive leveling constraints
- [ ] Permission to proceed with technical implementation of `CP8` files
- [ ] Assignment of version baseline `v2.5.0`

---

## 6. Pre-empted Board Questions & Technical Answers (FAQ)

### Q1: Can a user override the PMBOK Stage Dependency Gate in an emergency?
**A**: Yes, but under strict **RPAS-HIL (Human-in-the-Loop)** rules. A project administrator can issue an override token via the Governor Portal. This bypass is logged as a security event in the PostgreSQL Ledger, detailing the justification, user ID, and temporary access lease window. It does *not* bypass structural parsing.

### Q2: Does cognitive voice tailoring affect the compliance of the generated documents?
**A**: No. The document's primary copy (100% density) remains fully compliant, containing all technical H8 tags and detailed regulatory terminology. The cognitive tailoring affects:
1. **The style of supplementary explanation prompts** presented to the user.
2. **The compression levels (summaries)** generated in the background (p20/p40 for Junior, p60/p80 for Medior).
This ensures that the final audited artifact satisfies compliance, while the human user interface adapts to user comprehension.

### Q3: How is the composite authority decay calculated without impacting DB performance?
**A**: The decay value uses the difference between `created_at` and the current timestamp in hours. Because authority scores are calculated on-write (when saving/updating entities or registering new documents) and stored statically in the `source_authority` table, search queries read a pre-calculated indexed column without computing values on-the-fly.

### Q4: If an entity is updated by a lower-authority document, does it discard the change?
**A**: No. To preserve data integrity and prevent loss of information, the change is written into the `sources_history` field within the entity's JSONB structure. This allows human operators to inspect alternate inputs while preserving the primary values from the higher-authority source.

### Q5: How do we prevent false-positive merges in entity deduplication (e.g. "Primary Database" vs. "Replica Database")?
**A**: Deduplication relies on strict entity-type scoping combined with regex normalization (alphanumeric stripping). If two entities belong to the same type but differ in key attributes (such as names that do not share a normalized substring match), they are treated as separate records. We also reserve a manual "Disambiguation Queue" status in the UI to allow operators to split mistakenly merged entities.

### Q6: Since Neo4j (Graph) is an optional dependency, how do we guarantee consistency of the Knowledge Graph?
**A**: PostgreSQL remains the single source of truth (authority) for entity extractions. Writes to PostgreSQL are fully transactional. Synchronization to the Neo4j GKG (Global Knowledge Graph) is handled asynchronously via a background worker queue. If Neo4j goes offline or fails, the worker retries the sync events without blocking document generation or PostgreSQL operations.

### Q7: Can a junior user manually alter their settings to "Senior" to bypass cognitive leveling?
**A**: Seniority guidelines are governed at two layers:
1. **Presentation layer (Cognitive Voice)**: Users can adjust their interface reading preferences (Junior/Senior styles) to control density on their dashboard.
2. **Authority layer (Ledger and Roles)**: Actual access controls, approval gates, and document signature weightings are strictly verified against the user's role in the security ledger, which cannot be self-modified.

### Q8: How easy is it to swap or upgrade the process dependency map (e.g. from PMBOK 6 to PMBOK 7)?
**A**: The `pmbokAuthorityMapper.ts` engine decouples the registry configuration from implementation code. Swapping frameworks simply requires loading a different dependency map metadata schema (e.g. loading a PMBOK 7 or BABOK JSON schema contract) into the mapper database. No code modifications are needed in the core generation boundaries.

### Q9: How are the user's skills and competencies mapped to the PMBOK Knowledge Areas?
**A**: When a document generation or context query is triggered, the system resolves the document's template to its target PMBOK Knowledge Area (e.g. *Risk Management*). It then queries the user's competency matrix database (e.g. checking their registered competency level for *Risk*). If the user holds a Level 4/5 (Expert) rating, the system serves raw technical context (100% density). If they hold a Level 1/2 (Novice) rating, the system adjusts the prompt to use simpler terminology and compacts the context to p20/p40 summaries with explanatory notes.

### Q10: How does the PMBOK Gating engine verify if a prerequisite input document is complete, rather than just a placeholder?
**A**: Because ADPA extracts and synchronizes detailed H8 entities (e.g. stakeholders, deliverables, requirements) under strict validation rules, we do not require a separate completeness tracking layer. The entities themselves represent the document's maturity. When enforcing the gate, the engine queries the `entity_extractions` table for the prerequisite `document_id`. The gate validates that the document has yielded a minimum density of high-confidence, verified entities (e.g. at least 1 Sponsor and 2 Scope requirements for a Project Charter) and that their attributes do not contain placeholder values (like "TBD" or "none"). If these thresholds are not met, the document is flagged as incomplete, and downstream generation is locked.

---

## 7. Certification Statement

Upon approval, this amendment certifies that:
1. PMBOK stage constraints are programmatically enforced at the boundaries of the generation service.
2. Context windows and extracted entities are weighted and lineage-filtered to prioritize validated inputs.
3. Injected instructions will dynamically scale vocabulary density to match the user's cognitive maturity level.

**Status**: ⏳ Awaiting Human/Board Authorization

