# Epic 1: Compliance Rule Threshold Calibration

**Source ADR:** [ADR-030](../07-architecture/ADR-030-compliance-and-standards-alignment-framework.md) — Accepted (2026-10-22)
**Source BRD/FDD:** [BRD-030](../project-docs/Business-Requirements/BRD-030-compliance-rule-calibration.md) / [FDD-030](../project-docs/Functional-Design/FDD-030-compliance-rule-calibration.md)

Sequenced so that nothing is scheduled ahead of its own real prerequisite — the same discipline this whole session applied to Scope/Cost's dependency chain.

## Story 1.1 — Reclassified, 2026-10-22, not a user story

**This is not a code-shaped story — it was found to have no implement-story deliverable (no contract, no SKILL.md, no code) when actually run through the loop once (see `Story-Execution-Register.md`).** Reclassified as **GOV-EX-001** in `Audit-Register.md`'s Governance Exercises section. Story 1.3 below still depends on its outcome — that dependency is unchanged, only the tracking location moved.

## Story 1.2 — Build the adapter interface, cold-start-only

**Status:** Built — 2026-10-22, real run through `implement-story`, see `Story-Execution-Register.md` and `docs/implementation-log.md`
**As** `complianceValidationEngine.ts`, **I want** `ComplianceCalibrationPolicyAdapter.resolveProfile()` callable today, always returning `"standard"`, **so that** the anti-corruption boundary (ADR-030 §4.5) exists before any real calibration logic does, and the validation pipeline never breaks regardless of what Stage 1 finds.

**Acceptance Criteria:**
- $AC_0$: `resolveProfile(ruleId)` returns `"standard"` for every input, unconditionally, in this story's scope.
- $AC_1$: No code path in `complianceValidationEngine.ts` imports `agent-learning` directly — only this adapter.
- $AC_2$: A thrown exception from any future real implementation of this adapter must not propagate — contract-test this with a forced-failure case even though Stage 1 doesn't exist yet.

## Story 1.3 — Stage 1 real calibration logic

**Status:** Blocked — depends on GOV-EX-001 (`Audit-Register.md`) confirming real data exists
**As** a compliance rule with real historical scores, **I want** my threshold profile calibrated from my own score distribution, **so that** naturally noisy rules stop generating disproportionate false flags.

**Acceptance Criteria:** Not yet written — per this project's own discipline, acceptance criteria for blocked work aren't drafted in detail until its prerequisite clears, to avoid designing against data that may not exist in the assumed shape.

## Story 1.4 — Stage 2 gated bandit calibration

**Status:** Blocked — depends on `draco_overrides` gaining rule-level attribution (ADR-030 §4.2), which is not designed, let alone built
**Not yet a story** — named as a placeholder row so the epic's full shape is visible, not drafted until its own prerequisite has a real resolution to design against.
