# federated-capability-ownership (Phase 7: Partial-Delivery Lockout) Design Spec

**Date**: 2026-07-12
**Status**: Draft
**Feature ID**: federated-capability-ownership (same governed-feature packet as [Phase 0](2026-07-09-federated-capability-ownership-phase0-design.md)/[Phase 1](2026-07-10-federated-capability-ownership-phase1-design.md)/[Phase 3](2026-07-11-federated-capability-ownership-phase3-design.md)/[Phase 4](2026-07-12-federated-capability-ownership-phase4-design.md)/[Phase 5](2026-07-12-federated-capability-ownership-phase5-design.md)/[Phase 6](2026-07-12-federated-capability-ownership-phase6-design.md))

---

## Problem

[ADR-005](../../07-architecture/ADR-005-federated-capability-ownership.md) is explicit that Phase 7 is "the constraint that makes early/partial delivery of everything else harmless instead of misleading" — every phase since Phase 1 has shipped real, working mechanism (the ownership registry, the activation lifecycle, DRACO gating, tamper evidence, an authenticated write endpoint) while `functional_owner_department` stayed nullable. Nothing yet stops a module from being `active` with no declared, verifiable accountable department — the exact Purview-style failure mode ADR-005's Context section opens with.

Phase 1 task 3 deliberately deferred *which* department owns each module as "a business decision, never guessed by a migration or the row builder." That decision was still undecided at the start of this phase: **every** `capability_registry` row in the real database had `functional_owner_department IS NULL` — confirmed by grepping for any write to that column outside the (empty) seed defaults. Phase 7's `NOT NULL` constraint, applied naively, would therefore fail outright against real data. The implementation plan itself anticipated this ("if it isn't [populated], this migration fails outright, which is itself a useful forcing function rather than a problem to work around") — but a migration that's *designed* to block `pnpm migrate` for the whole team is a real operational decision, not a default to make unilaterally.

**Scope, decided explicitly with the user before implementation**: rather than ship a knowingly-blocking migration, the actual owner-department business decision is made now, as part of this phase, and recorded in code (`moduleOwnerAssignments.ts`) rather than left for someone to reverse-engineer from a failed migration later.

## Decision

### The owner assignment itself

Confirmed with the ADR owner: only the three governed-features.manifest.json packets that encode actual business-domain policy get a non-IT functional owner —

| Packet | functionalOwnerDepartment | controlDefinitionOwnerDepartment |
|---|---|---|
| `compliance` | Compliance | Compliance |
| `ip-governance` | Legal | Legal |
| `template-lifecycle` | Compliance | Compliance |

Every other packet (`rag`, `doc-gen`, `test-teardown-guard`, `codacy`, `infrastructure`, `inline-extraction`, `document-generation-resiliency`, `knowledge-graph`, `document-dependency-graph`, `cascading-regeneration`, `api-worker-split`, `projects`, and `federated-capability-ownership` itself) defaults to `IT` for both columns — an honest reflection of today's org reality (pure platform engineering, no separate accountable business department exists), not a placeholder value chosen to satisfy the constraint. Assigning a fabricated non-IT owner to a packet that doesn't actually have one would recreate exactly the "governance-sounding field that's actually just a hope" anti-pattern the implementation plan calls out elsewhere (see its note on `portfolio_governance.approval_authority_matrix`).

This mapping lives in `server/src/modules/capabilityRegistry/moduleOwnerAssignments.ts` (`MODULE_OWNER_DEPARTMENTS`, `resolveModuleOwnerDepartments`), not inline in either the migration or the seed runner, so there is exactly one place a future reassignment gets made.

### Migration 438: one-time backfill

Every existing `capability_registry` row with `functional_owner_department IS NULL` gets the resolved owner via a `CASE module_id ... ELSE 'IT'` UPDATE, matching `moduleOwnerAssignments.ts` by hand (a one-time SQL migration and a TypeScript map have no shared source of truth; a future edit to the map doesn't retroactively change already-migrated rows, which is correct — those are historical). Only touches still-null rows, so it can never clobber an owner a human already assigned by hand after Phase 1 shipped.

`seedCapabilityRegistry.ts` (the ongoing reconciliation runner, not a one-time migration) now calls `resolveModuleOwnerDepartments(moduleId)` when building rows for missing `(module_id, portfolio_id)` pairs — so a *new* portfolio's rows, or a *new* manifest packet's rows, get a real owner immediately rather than null, going forward.

### Migration 439: NOT NULL + FK + portfolio-scoped active-member gate

Three changes, one migration (all interdependent, and Postgres has no partial `ALTER FUNCTION`, so `promote_capability_status` gets its now-familiar full redefinition):

1. **Task 1**: `ALTER TABLE capability_registry ALTER COLUMN functional_owner_department SET NOT NULL`.
2. **Task 2**: FK `functional_owner_department` → `departments(code)` (migration 434) — `NOT NULL` alone doesn't stop a typo'd placeholder from satisfying the constraint; the FK forces a real department. `control_definition_owner_department` gets the same FK for consistency (same domain of values) but stays nullable — only `functional_owner_department` was the plan's stated `NOT NULL` target.
3. **Task 3**: `promote_capability_status`'s transition to `pending_department_approval` or `active` now additionally requires at least one active `user_departments` row for the resolved `functional_owner_department`, scoped to the capability's own `portfolio_id` — not merely somewhere in the system. A department can have plenty of active members overall but zero in this specific portfolio, which was a silent, unresolvable deadlock before this check existed. On failure: `RAISE EXCEPTION 'functional_owner_department % has no active member in portfolio % -- activation blocked pending break-glass escalation'`.

This check runs **after** the transition-graph validation (an illegal transition still fails with its own, more specific message first) but **before** the DRACO verdict gate — deliberately: "is there anyone who could even approve this" is a more fundamental precondition than "did the specific evidence pass review."

**Deliberately does not gate `disabled`**: a module whose department is deadlocked (zero active members in this portfolio) must still be shuttable — the whole point of the check is to stop *activating* something nobody can be accountable for, not to trap a module in its current state once the accountable department disappears.

**Deliberately not bypassed by the admin role bypass Phase 6 added**: Phase 6's `promote` endpoint lets an admin/super_admin call the endpoint without being a department member themselves — that bypass is about *this caller's own* standing to invoke the write path. It is not, and was never meant to be, a bypass of Phase 7's separate, DB-level question of whether the department itself has anyone active in this portfolio. An admin can still promote a `Compliance`-owned module in a portfolio where *some* Compliance member (not necessarily the admin) is active; an admin cannot force a promotion into a portfolio where Compliance has zero active members, because at the DB layer that's structurally the same deadlock this task exists to catch, not a matter of who's asking. Confirmed by fixing `federated-capability-ownership-phase6.test.ts`'s existing "admin bypass" test, which now explicitly asserts this — an admin bypass with no department member present anywhere in that portfolio is expected to be **denied**, not (as it was previously asserted) unconditionally allowed.

### What this does *not* build

- **Phase 3 task 6's break-glass mechanism** — the five-party review group that's the designed answer to a *structural* deadlock (fewer than two active members, blocking the override path specifically). This migration's task 3 check is the *detection* of that deadlock for the *normal* approval path (one member, not two); routing a detected deadlock to break-glass is still Phase 3 task 6's unbuilt job. Until it exists, a genuinely deadlocked department simply blocks normal activation with no automated escalation — visible in the raised exception's message, not yet actionable beyond that.
- **Reassignment tooling.** There is no endpoint or UI to change a module's `functional_owner_department` after initial assignment — `moduleOwnerAssignments.ts` and migration 438 are a one-time bootstrap, not an ongoing reassignment mechanism. A future reassignment would go through a direct `UPDATE` (owner columns aren't lockdown-protected the way `activation_status` is) or a new, not-yet-built endpoint.

## Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| REQ-PHASE7-001 | Every current manifest packet resolves to a real (non-null) functional/control-definition owner department via `resolveModuleOwnerDepartments`. | P0 |
| REQ-PHASE7-002 | `compliance` and `template-lifecycle` resolve to `Compliance`; `ip-governance` resolves to `Legal`; every other packet resolves to `IT`. | P0 |
| REQ-PHASE7-003 | An INSERT into `capability_registry` with a null `functional_owner_department` is rejected. | P0 |
| REQ-PHASE7-004 | An INSERT with a `functional_owner_department` not present in `departments` is rejected (FK violation). | P0 |
| REQ-PHASE7-005 | After migration 438, no pre-existing `capability_registry` row still has a null `functional_owner_department`. | P0 |
| REQ-PHASE7-006 | `promote_capability_status` denies a transition to `pending_department_approval`/`active` when the target department has zero active `user_departments` members in the capability's own `portfolio_id`. | P0 |
| REQ-PHASE7-007 | The same check is scoped correctly: an active member of the right department in a *different* portfolio does not satisfy it. | P0 |
| REQ-PHASE7-008 | An inactive (`is_active = false`) member does not satisfy the check. | P0 |
| REQ-PHASE7-009 | The check passes once a real active member exists in the correct department + portfolio. | P0 |
| REQ-PHASE7-010 | Transitions to `disabled` are never gated by this check, regardless of department membership. | P1 |

## Verification

- Unit (DB-free, `npm run test:features -- federated-capability-ownership`): `resolveModuleOwnerDepartments` — REQ-PHASE7-001/002, in `server/src/__tests__/modules/federated-capability-ownership/capabilityRegistry.test.ts` (REQ-CAP-009).
- Integration (real Azure Postgres, `server/tests/integration/federated-capability-ownership-phase7.test.ts`): REQ-PHASE7-003..010. Currently blocked from actually running by the same pre-existing Jest ESM harness issue noted in every prior phase's integration suite (verified instead via a standalone script, see below).
- Fixed forward, not newly broken by this phase but only now actually exercised: `federated-capability-ownership-phase1/phase3/phase4/phase6.test.ts` all created `capability_registry` rows without a `functional_owner_department`, and phase3/phase4 promoted to `pending_department_approval`/`active` with no department membership set up — both assumptions this phase's schema changes invalidate. All four files were updated to supply a real department and (where they promote past `draft`) a matching active `user_departments` row. Phase 6's "admin bypass" test was corrected to reflect the interaction documented above, and its "no functional owner department" 403 test was rewritten to assert the now-impossible-to-reach state fails at the INSERT itself (a stronger guarantee than the app-level check it used to exercise).
- Standalone real-DB script (same pattern used for every prior phase): exercises the full backfill, the NOT NULL/FK rejections, and the department-membership gate (deny with zero members, deny with wrong-portfolio member, deny with inactive member, allow with a real active member, `disabled` ungated) against a scratch database, then discarded.
