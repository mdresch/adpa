# ADPA Governance Context Gathering Strategy

**Target Deliverable**: Implementation Governance Playbook  
**Framework Alignment**: PMBOK-8, ADPA Multi-Stage Onboarding  
**Status**: Active / Template-Ready

## 1. Objective
To dynamically assemble the "Relevant Context" required for the **Implementation Governance Playbook** by bridging static onboarding data with semantic knowledge extracted from the **Governance Knowledge Graph (GKG)**.

---

## 2. Context Sources & Hierarchy

ADPA identifies context across three hierarchical layers to ensure "Compounding Intelligence":

| Layer | Source | Description |
|---|---|---|
| **L1: Static Inputs** | `/docs/onboarding/inputs/*.json` | Raw data captured during initial client discovery (Stakeholders, Org, Objectives). |
| **L2: Semantic Units** | GKG (Neo4j) | Atomic facts extracted from project charters, ERP discovery logs, and legacy risk registers. |
| **L3: Performance Actuals**| GKG (Temporal/Evidence) | Real-time signals from ongoing delivery (Jira metrics, Decision logs, Gate status). |

---

## 3. GKG Context Strategy (Template Config)

This configuration should be applied to the `gkg_context_strategy` field of the **Governance Playbook Template**.

```json
{
  "profile": "governance_full",
  "entityTypes": [
    "Stakeholder",
    "Requirement",
    "Risk",
    "Milestone",
    "Phase",
    "GovernanceDecision",
    "Deliverable",
    "ActionItem"
  ],
  "scope": "same_project_top_docs",
  "maxDocuments": 10,
  "maxUnits": 2000,
  "traceableOnly": true,
  "documentStatusFilter": "include_draft_review"
}
```

### Retrieval Logic:
1. **Stakeholders**: Maps to Core Team (1.3) and RACI (Annex A).
2. **Requirements**: Maps to Strategic Objectives (2.1) and Scope (2.3).
3. **Risks**: Maps to Annex B (Scored via Risk Signature Index).
4. **Milestones/Phases**: Maps to Phase Gates (Annex D).
5. **GovernanceDecisions**: Maps to Decision Log (Annex F).

---

## 4. Extraction & Normalization Flow

To obtain the `inputs/*.json` required for the AI Gateway, ADPA follows this transformation pipeline:

### 1. Discovery Stage (Input Gathering)
- **Tool**: ADPA Onboarding UI.
- **Action**: User completes hierarchical forms.
- **Output**: `raw_discovery.json`.

### 2. Semantic Enrichment (GKG Linkage)
- **Tool**: GKG Ingestion Engine.
- **Action**: ADPA scans `raw_discovery.json` and links entities to existing GKG nodes (e.g., linking a "Project Champion" to an existing Enterprise Architect node).
- **Output**: `enriched_context.json`.

### 3. Domain Scoring
- **Tool**: PMBOK-8 Performance Scorer.
- **Action**: Computes maturity signals (Stakeholder, Planning, Delivery, Measurement).
- **Output**: `maturity_scores.json`.

---

## 5. Metadata Tracking & Quality Gating

Every piece of context gathered must carry the following metadata for **Traceability**:

- **Provenance**: `source_doc_id` or `onboarding_field_id`.
- **Timestamp**: `extracted_at` (ISO8601).
- **Confidence**: `completeness_score` (0-1).

### Validation Checklist:
- [ ] **Stakeholder Matrix**: At least one Sponsor, one PM, and one Architect identified.
- [ ] **Risk Threshold**: At least 3 high-impact risks identified.
- [ ] **Strategic Mapping**: Every Objective must map to at least one ERP Capability.
- [ ] **KPI Baseline**: At least one metric per Performance Domain.

---

## 6. AI Gateway Implementation

The AI Gateway uses these strategies to inject context into the final prompt:

```text
# Context Injection Order:
1. Inject Client Metadata (Client Name, BU, Region).
2. Inject Static Onboarding JSON (Stakeholders, Objectives, Risks).
3. Inject GKG Semantic Units (Context snippets from linked documents).
4. Inject Domain Maturity Scores (To set the tone for the Governance Philosophy).
```

---

## 7. Operationalizing the Strategy

Save gathered context to:
- Directory: `/docs/onboarding/governance/inputs/`
- Pattern: `governance_context_[TIMESTAMP].json`

This ensures that the **Governance Playbook** is not just a template, but a living deliverable that evolves with every onboarding interaction.
