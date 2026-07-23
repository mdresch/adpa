# ADR 018: Template Lifecycle & Governed Feature Management

## 1. Status
**Proposed (2026-07-23)** — the template lifecycle state machine and governed feature loop described here are fully implemented; this ADR records the architecture retroactively.

## 2. Context

ADPA's document templates are not static Markdown files. They are versioned, scoped, and governed through a state machine that controls when a template can be used for production generation, when it is safe for testing, and how quality regressions are detected and fed back into the template. The template lifecycle is intimately coupled with the Governed Feature Loop: every non-trivial backend feature must be registered in `governed-features.manifest.json`, and templates are one of the consumers of that governance discipline.

Verified against running code:

- **State machine values**: `draft`, `testing`, `validated`, `production`, `compliance`, `archived`. `archived` is equivalent to soft-delete (`deleted_at` is also set).
- **State transitions**:
  - Creating a template sets `is_public = false` and `development_status = 'draft'`.
  - Updating any template forces `development_status = 'testing'`.
  - Archiving sets `deleted_at` AND `development_status = 'archived'`.
- **Scope levels**: `standard`, `company`, `user` — controls visibility (who can select the template for generation).
- **Background lifecycle audit**: on create and update, `templateAuditService.runAudit` launches a DRACO Governance Evaluator + Counterfactual Challenger in parallel via `aiService.generateWithFallback`. Verdict: `pass` / `flagged` / `fail`.
- **Health tracking**: `success_count / validation_count` forms the template health rating.
- **System prompt**: templates carry `system_prompt`, `context_injection_config`, `prompt_build_up`, `template_paragraphs`, and `gkg_context_strategy`.
- **Governed feature tests**: `server/src/__tests__/modules/template-lifecycle/` exists.

## 3. Decision

We adopt a **governed template lifecycle** where every template transition is auditable, every regression is traceable to a generation result, and the Governed Feature Loop's Contract Guards apply to template behavior changes just as they do to backend code.

### 3.1 State Machine and Transitions

```
draft → testing (on any update)
       ↓
    validated (manual / automated),
       ↓
    production (manual promotion),
       ↓
    compliance (manual promotion),
       ↓
    archived (soft delete)
```

Only `archived` is reversible (back to `draft`). All other transitions are one-way within a generation. A template in `draft` can still be used in dev/test environments; it cannot be used for customer-facing generation.

### 3.2 Quality Feedback Loop

Every template used for generation produces a generation result (success, DRACO verdict, entity extraction scores). These are routed to `templateAuditService` asynchronously:

- **Pass**: `success_count` increments.
- **Flagged / Fail**: `validation_count` increments, health rating decays.
- **Regression threshold**: if health rating drops below a configurable threshold, the template is automatically moved from `production` back to `testing`.

This creates a closed loop: templates degrade gracefully if the generations they produce degrade, without requiring manual review of every generated document.

### 3.3 Scope and Visibility

Templates are scoped at three levels:

- `standard`: available to any project.
- `company`: available to projects within the creator's company, gated by `company_id`.
- `user`: available only to the creating user.

Scope is enforced at the list endpoint and at generation time. A template is not just "published" or "unpublished" — its scope determines which users see it at all.

### 3.4 Governed Feature Coupling

The template service is covered by the Governed Feature Loop. Any change to template state machine transitions, health thresholds, or audit behavior requires:

1. A Contract Guard test written before the change.
2. Registration in `server/governed-features.manifest.json` under `template-lifecycle`.
3. The `template-lifecycle` packet's `SKILL.md` updated before tests are marked passing.

This ensures template governance changes are validated against the same regression net as backend logic.

## 4. Options Considered

### Option A: No lifecycle — templates are active/inactive booleans
| Dimension | Assessment |
|---|---|
| Complexity | Lowest |
| Safety | Low — a half-edited template can be used for customer generation |
| Feedback | None — no health tracking |

Rejected: the current multi-state machine already provides safety rails that a boolean cannot match. Reverting to a boolean would remove the testing/validation/compliance stages that currently protect production generation.

### Option B (Recommended): State machine + DRACO audit + governed feature registration
| Dimension | Assessment |
|---|---|
| Complexity | Medium |
| Safety | High — explicit progression through testing before production |
| Feedback | Automatic health regression detection |

The current implementation. It is chosen because the existing state machine has already been operating in production and the governance discipline (Contract Guards, manifest registration) is the standard for non-trivial backend features.

### Option C: Full CI/CD pipeline for templates (build, test, deploy)
| Dimension | Assessment |
|---|---|
| Safety | Highest |
| Complexity | Very high — templates are not code artifacts; they live in the DB, versioned by row rather than git commit |

Rejected: premature. The state machine + DRACO audit already provides staged promotion. A full CI/CD layer would require a template artifact format (ZIP, tarball, etc.) that does not currently exist and would add complexity without a proven need.

## 5. Consequences

### Positive
- **Staged promotion**: templates must pass through `testing` before reaching `production`, catching structural issues before customer-facing use.
- **Self-healing health**: degraded templates regress to `testing` automatically, reducing manual QA load.
- **Governed change surface**: template behavior changes follow the same Contract Guard discipline as backend code, so regressions are caught before deploy.

### Negative
- **Audit latency**: DRACO audits run asynchronously. If the audit service is slow, a template can sit in `testing` longer than the author expects.
- **Scope granularity mismatch**: `company` scope compares `company_id`, but `team_members` is a JSONB array on `projects`. A user who is a member of a project's team but not the template creator's company cannot use a `company`-scoped template even though they have project access. This is a correctness gap in the current implementation, not a design choice.

### Risks
- **Health-threshold tuning**: the regression threshold is configurable, but the wrong value either over-promotes bad templates (threshold too high) or under-utilizes good ones (threshold too low). Mitigated by logging health events in the jobs table so ops can see distribution trends.
- **Audit spam**: updating a template triggers an audit. Rapid iterative updates during template authoring can flood the audit queue. Mitigated by debouncing audits in `templateAuditService` (verified to be present in code).

## 6. Action Items

1. Fix the `company` scope/`team_members` mismatch — route scope checks through the same `verifyTenantAccess` middleware the rest of the API uses.
2. Publish template state transition rules in the template authoring guide (`docs/06-features/TEMPLATE_CONTENT_STRUCTURE.md`).
3. Add a template health dashboard (read-only) in the Governor Portal so template owners can see regression events without querying the DB directly.

## 7. References

- `server/src/modules/documentTemplates/service.ts` — template CRUD, lifecycle state enforcement
- `server/src/modules/documentTemplates/types.ts` — template metadata fields
- `server/src/modules/documentTemplates/controller.ts` — API endpoints
- `server/src/modules/documentTemplates/routes.ts` — route registration
- `server/src/services/templateAuditService.ts` — DRACO-backed lifecycle audit
- `server/src/__tests__/modules/template-lifecycle/` — governed feature tests
- `server/governed-features.manifest.json` — template-lifecycle packet registration
- `docs/06-features/TEMPLATE_CONTENT_STRUCTURE.md` — template authoring guide (to be updated)
- [ADR-004: DRACO AI Governance](ADR-004-DRACO-AI-GOVERNANCE.md) — the audit evaluator template lifecycle consumes
- [ADR-013: Document Generation Pipeline Architecture](ADR-013-document-generation-pipeline-architecture.md) — the generation stage that consumes templates
