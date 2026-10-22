# Component Skill: Compliance Rule Calibration

**Governing ADR:** [ADR-030: Compliance & Standards Alignment Framework](../../../docs/07-architecture/ADR-030-compliance-and-standards-alignment-framework.md) — **Accepted (2026-10-22)**
**Governing Story:** Epic 1, Story 1.1 (not yet built — see `docs/user-stories/epic-1-compliance-rule-calibration.md`)
**Contract files:** `server/src/__tests__/modules/compliance/complianceCalibrationPolicyAdapter.test.ts` (Story 1.2, 4/4 passing) — covers the cold-start adapter only. Stage 1's real calibration logic (Story 1.3) still has no contract; blocked on GOV-EX-001.

**Note on naming convention (2026-10-22):** ADPA's real test convention is `server/src/__tests__/modules/<module>/`, not SocialEngage's `contracts/epic-<N>/story-X.Y...` layout — confirmed by checking the existing `pillar4-invariants.test.ts` file before writing this one. `implement-story`'s own contract-location guidance is adapted accordingly.

## What this component does (once built)

Calibrates `ComplianceRule` threshold profiles (`strict`/`standard`/`lenient`) per ADR-030 §4.1's Stage 1 (offline statistical baselining from real `compliance_rule_results` history) and, later, Stage 2 (an `agent-learning` `TaskPolicy` bandit, gated on a real ground-truth reward — ADR-030 §4.2).

## Load-bearing constraints — real, not assumed

- **Stage 1 cannot start until a live row-count check confirms real data exists.** `EMPTY_TABLES_PURPOSE_AUDIT.md` found `compliance_rule_results` held zero rows as of 2026-07-05; nothing since has confirmed that's changed (ADR-030 §3/§4.3).
- **Stage 2 cannot start until `draco_overrides` gets rule-level attribution.** Confirmed via direct inspection: `draco_overrides` (`dracoService.ts:498`) has no `ruleId` column — only `review_id`, `document_id`, `user_id`, `reason`, `override_at`. ADR-030 §4.2 names two resolution options; neither is decided.
- **`weight` stays static.** ADR-030 §4.4 — this component must never calibrate `ComplianceRule.weight`, only `thresholds.pass/warning/fail`.
- **Anti-corruption layer required.** ADR-030 §4.5 — `complianceValidationEngine.ts` must stay unaware of `agent-learning`; all calls go through a `ComplianceCalibrationPolicyAdapter` that falls back to `standard` if the SDK is unavailable or a rule is cold-start.

## Extension guidance

Do not implement Stage 2 before Stage 1's prerequisite (the live row-count check) is actually run. Do not implement either stage's reward/calibration logic without first re-confirming this file's constraints against the current state of ADR-030 — if that ADR is ever amended, this file is stale until re-checked, the same discipline SocialEngage's own `implementation-methodology.md` applies to every `SKILL.md`.

## Real call-site relationships

The adapter exists in code now (`complianceCalibrationPolicyAdapter.ts`), but is **not yet called by `complianceValidationEngine.ts`** — Story 1.2 deliberately scoped to building the adapter standalone, not wiring it in, since there's nothing yet for Stage 1 to meaningfully act on the result of. AC1's contract test is a regression guard (confirms the engine has no `agent-learning` import today) rather than proof of active integration. Wiring it in is real, scoped work for a later story, not assumed done here.
