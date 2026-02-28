# ADPA Langfuse Naming Conventions

This document defines stable naming rules for traces, sessions, users, IDs, tags, scores, datasets, prompts, and metadata used by ADPA in Langfuse.

## Goals

- Keep naming stable across environments and releases.
- Enable reliable filtering, aggregation, and dashboards.
- Avoid high-cardinality noise in tag keys and metric dimensions.
- Make traces linkable back to ADPA project, document, template, and extracted entities.

## Canonical Patterns

### Trace Names

Pattern:

- adpa.<environment>.<process-area>.<action>

Examples:

- adpa.production.change-control.recommendation
- adpa.staging.benefits-realization.recommendation
- adpa.production.mitigation-planning.recommendation

Rules:

- Use lowercase kebab-case for process-area and action.
- Keep 3-5 segments only.
- Do not embed IDs directly in trace name.

### Session IDs

Pattern:

- adpa-session-<domain>-<run-id>

Example:

- adpa-session-governance-adpa-prod-run-2026-02-27T20-15-03-123Z

Rules:

- Domain is required.
- run-id should be timestamp-based or UUID-based.
- Reuse same session ID for logically grouped conversation/thread flows.

### User IDs

Pattern:

- adpa.user.<role-or-persona>

Examples:

- adpa.user.portfolio-lead
- adpa.user.pmo-analyst
- adpa.user.risk-manager

Rules:

- Use stable, non-PII identifiers.
- Do not store emails as user IDs.

## Source Context IDs

These IDs are required in trace metadata.sourceContext and should also be tag-encoded for filtering.

### Document ID

Pattern:

- doc-adpa-<numeric-or-uuid>

Examples:

- doc-adpa-001
- doc-adpa-7d9f4c2a

### Project ID

Pattern:

- proj-adpa-<slug>

Examples:

- proj-adpa-portfolio-transformation
- proj-adpa-security-controls-program

### Template ID

Pattern:

- tpl-adpa-<slug>-v<major>

Examples:

- tpl-adpa-ccb-governance-v2
- tpl-adpa-risk-escalation-v3

Rules:

- Keep all IDs lowercase.
- Use dashes as separators.
- Version template IDs explicitly (v1, v2, v3).

## Tags

Required tags on trace:

- adpa
- compliance
- recommendation
- <domain>
- <risk-category>
- project:<projectId>
- template:<templateId>
- document:<documentId>

Rules:

- Keep tag key prefixes stable: project:, template:, document:.
- Do not add free-form sentence tags.
- Prefer metadata for rich objects; tags for filter pivots only.

## Metadata Schema

### Trace metadata (required)

- datasetItemId: string
- runName: string
- observationLevelStrategy: [DEBUG, DEFAULT, WARNING, ERROR]
- sourceContext:
  - documentId: string
  - projectId: string
  - templateId: string
- extraction:
  - entityCount: number
  - extractedEntities: string[]

### Generation metadata (recommended)

- promptTemplate: string
- policyPack: string
- sourceDocumentId: string
- extractedEntities: string[]

### Validation/Event metadata (recommended)

- validator: string
- sourceContext:
  - documentId: string
  - projectId: string
  - templateId: string

## Extracted Entities Naming

Pattern:

- PascalCase noun phrases

Examples:

- ChangeControlBoard
- ScopeDelta
- MitigationAction
- ControlOwner

Rules:

- Keep singular where possible.
- Avoid spaces and punctuation.
- Keep entity vocabulary controlled; maintain a shared glossary.

## Score Names

Stable score names:

- compliance_score
- llm_judge_recommendation_quality
- session_compliance_score

Rules:

- snake_case only.
- Do not version score names; version logic in score metadata.
- Keep score range conventions explicit in score configs.

## Prompt Naming and Labels

### Prompt Name

Pattern:

- adpa_<capability>_<scope>

Example:

- adpa_recommendation_core

### Labels

Allowed labels:

- production
- staging
- canary

Rules:

- Use labels for deployment routing.
- Do not overload prompt name to represent environment.

## Dataset Naming

Pattern:

- adpa-<capability>-validation-v<major>

Example:

- adpa-compliance-validation-v1

Dataset Item ID pattern:

- adpa-ds-<3-digit or UUID suffix>

Examples:

- adpa-ds-001
- adpa-ds-02f9a1

Run Name pattern:

- adpa-prod-run-<iso-timestamp-safe>

## Environments

Allowed values:

- production
- staging
- development

Rules:

- Use one source of truth from NODE_ENV mapping.
- Never mix environments in one dashboard panel unless explicitly intended.

## Anti-Patterns

- Putting IDs inside trace names.
- Random one-off tag keys per trace.
- Using mutable business text as IDs.
- Embedding sensitive data (PII/secrets) in tags or IDs.

## Validation Checklist

Before rollout, confirm:

- Trace name matches canonical pattern.
- sourceContext has documentId/projectId/templateId.
- Required tag prefixes exist.
- extractedEntities list is present and controlled.
- Score names match configured set.
- Prompt labels are set for production/staging.

## Ownership

- Primary owner: ADPA Observability
- Change process: update this document first, then update script validations and dashboards.
