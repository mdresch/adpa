# Standards Compliance & Governance Framework Design

Date: 2026-05-13
Topic: SC-28 parent story split for standards compliance and governance
Status: Approved design draft

## Goal

Convert SC-28 into a parent story and split the work into smaller implementation stories that align with the existing ADPA governance, scoring, audit, and dashboard foundations.

## Context

The repo already contains relevant platform foundations that reduce the need for a net-new governance stack:

- DRACO governance review orchestration in the backend
- Existing compliance scoring documentation and dimensions
- Audit and governance ledger patterns
- Existing compliance and governance dashboard surfaces

Because those shared foundations already exist, the standards compliance feature should be delivered as an extension of the current governance platform rather than as a separate subsystem.

## Design Choice

Use a hybrid split:

1. Shared platform stories first
2. Standard-specific ruleset stories second

This keeps reusable platform work centralized while allowing PMBOK, BABOK, and DMBOK alignment to be delivered as traceable child stories.

## Parent Story

Title:
SC-28: Standards Compliance & Governance Framework Foundation

Description:
Build the standards compliance governance capability for ADPA by extending the existing governance, scoring, audit, and dashboard foundations. SC-28 becomes the parent story for a reusable compliance platform that evaluates documents against configurable standards-inspired rulesets, records traceable audit evidence, surfaces compliance status and trends, and provides remediation guidance. Standard-specific rulesets for PMBOK, BABOK, and DMBOK are delivered as child stories on top of the shared platform.

Parent note:
Foundational governance, scoring, audit, and dashboard capabilities already exist in the platform. This story group extends those foundations into a reusable standards compliance workflow rather than creating a separate governance stack.

## Child Stories

### 1. Shared Compliance Rule Model and Standards Mapping Foundation

Purpose:
Build the configurable compliance rule model, rule metadata, severity levels, standards references, and document-to-rule mapping structure used by all standards packs.

Why first:
All later validation, audit, and recommendation work depends on a stable shared rule model.

### 2. Document Compliance Validation Engine and Result Persistence

Purpose:
Implement the reusable validation engine that runs rules against analyzed documents, produces structured non-compliance findings, and persists validation results for later retrieval.

Why second:
This is the core execution layer that turns the rule model into actual compliance results.

### 3. Compliance Audit Trail and Verification History

Purpose:
Extend auditability so each compliance run records inputs, executed checks, timestamps, outcomes, and traceable evidence suitable for governance review and verification.

Why separate:
This makes traceability explicit and keeps audit requirements visible as a first-class delivery item.

### 4. Compliance Dashboard and Trend Visibility

Purpose:
Add UI and API support for overall adherence rates, issue severity summaries, rule-level findings, and trend metrics across validation runs.

Why separate:
Dashboard and retrieval concerns should not be hidden inside backend validation work.

### 5. Compliance Recommendations and Gap Remediation Guidance

Purpose:
Generate actionable recommendations tied to failed rules and missing elements so users can understand what to fix and why.

Why separate:
Recommendations are a distinct user-facing capability, not just a byproduct of validation.

### 6. PMBOK Ruleset for Standards Compliance Validation

Purpose:
Implement the PMBOK-aligned ruleset on top of the shared platform, using configurable mappings and explicit findings.

### 7. BABOK Ruleset for Standards Compliance Validation

Purpose:
Implement the BABOK-aligned ruleset on top of the shared platform, using the same shared engine, audit, and dashboard surfaces.

### 8. DMBOK Ruleset for Standards Compliance Validation

Purpose:
Implement the DMBOK-aligned ruleset on top of the shared platform, using the same shared engine, audit, and dashboard surfaces.

## Delivery Order

Recommended order:

1. Shared Compliance Rule Model and Standards Mapping Foundation
2. Document Compliance Validation Engine and Result Persistence
3. Compliance Audit Trail and Verification History
4. Compliance Dashboard and Trend Visibility
5. Compliance Recommendations and Gap Remediation Guidance
6. PMBOK Ruleset for Standards Compliance Validation
7. BABOK Ruleset for Standards Compliance Validation
8. DMBOK Ruleset for Standards Compliance Validation

## Acceptance Intent for the Story Group

The overall story group should ensure that:

- documents can be evaluated against configurable standards-aligned rulesets
- non-compliance findings are traceable to standards references and severity levels
- compliance runs are auditable with timestamps, executed checks, and results
- users can retrieve status, findings, and trend information through UI and API surfaces
- users receive actionable remediation guidance for identified gaps

## Scope Boundaries

Included:

- standards-inspired compliance workflow design and story decomposition
- reuse of existing governance, scoring, and dashboard foundations
- child story structure that supports phased implementation

Excluded:

- direct reproduction of proprietary standards content
- net-new standalone governance subsystem outside existing platform patterns
- implementation-level schema or API details beyond what is needed for story shaping

## Risks and Controls

Risk: The stories drift into three separate standard-specific implementations.
Control: Keep shared platform capabilities complete before standard-specific story execution.

Risk: Dashboard and audit features become implicit and under-specified.
Control: Maintain separate child stories for auditability and trend visibility.

Risk: Standards compliance language implies official certification or licensed content use.
Control: Keep story wording aligned to standards-inspired rulesets and configurable mappings, not official embedded standards text.

## Outcome

SC-28 becomes a parent foundation story with eight child implementation stories that map cleanly to the current ADPA architecture and provide a phased path to deliver standards compliance capabilities.