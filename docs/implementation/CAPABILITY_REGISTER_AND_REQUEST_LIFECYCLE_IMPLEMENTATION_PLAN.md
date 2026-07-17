# Capability Register and Request-Creation Lifecycle — Implementation Plan

**Document ID**: IMP-2026-002
**Version**: 1.0
**Date**: 2026-07-17

Implements [ADR-012: Capability Register and Request-Creation Lifecycle](../07-architecture/ADR-012-capability-register-and-request-lifecycle.md). ADR-012 §6 states each of its eight Action Items is its own PR — this plan keeps that 1:1 for seven of them. Action Item 6 (My Requests, withdraw, write-lockdown) is the exception: it bundles an additive migration, a stored procedure, a refactor of already-shipped decision code, and a DB permission revocation into one described unit, and the execution-strategy section below flags it as the plan's highest-risk PR for exactly that reason. It is broken into four smaller PRs (**PR6a–PR6d**) following an expand/migrate/contract shape, so each carries one risk profile and one clean revert point rather than all four landing or failing together — see Phase 4. **PR1–PR5, PR6a–PR6d, PR7–PR8** below are grouped into five *phases* purely to show the dependency structure between them; a phase is not a bigger PR that bundles its tasks together.

| PR | Action Item | Phase | Depends on |
|---|---|---|---|
| PR1 | 1 — profile/department lookup | Phase 1 | none |
| PR2 | 2 — shared scoping helper | Phase 1 | none |
| PR3 | 4 — retroactive audit_log coverage | Phase 1 | none |
| PR4 | 3 — Capability Register read surface | Phase 2 | PR2 |
| PR5 | 5 — request-creation forms | Phase 3 | PR1, PR3, PR4 |
| PR6a | 6 — withdraw migration + stored procedure (additive) | Phase 4 | PR1, PR3 |
| PR6b | 6 — migrate markApproved/markDenied to the procedure (refactor) | Phase 4 | PR6a |
| PR6c | 6 — trigger + guard-variable lockdown (write-lockdown) | Phase 4 | PR6b |
| PR6d | 6 — My Requests view + withdraw endpoint (net-new) | Phase 4 | PR1, PR6a |
| PR7 | 7 — Researcher Dashboard discovery | Phase 5 | PR4 |
| PR8 | 8 — visible provenance marker | Phase 5 | PR3, PR6c (most useful after PR6d) |

**Why PR5 depends on PR3**: ADR-012 §6 is explicit that ledger coverage (Item 4) must land before any UI write surface ships — an earlier ADR draft sequenced it after the forms and that was corrected as a defect, not a style choice. This is a hard content dependency, not just the risk-driven sequential-execution preference described below.

**Why PR6d doesn't depend on PR6b/PR6c**: `withdraw` only needs `decide_capability_request` to exist (PR6a) — it doesn't need the old `markApproved`/`markDenied` paths migrated (PR6b) or the trigger-based lockdown active (PR6c) to function correctly. They're still recommended in sequence because PR6b/c/d all touch `CapabilityOverrideRequestRepository`, and the plan's general preference for one-agent-sequential execution applies here too.

Extends the existing `federated-capability-ownership` governed-feature packet (`server/governed-features.manifest.json`) — this is not a new packet, and no manifest edit is needed for it. Node changes in PR3, PR4, and PR6a–PR6d go through the Governed Feature Loop (Contract Guards before implementation, `SKILL.md` update, manifest registration) per ADR-012 §6; Blazor/orchestrator changes go through the AEV workflow (`dotnet build -c Release`, orchestration boot success).

The packet's actual current manifest entry (verified against `server/governed-features.manifest.json`, not assumed — an earlier draft of this plan guessed a regex that doesn't match reality):
```json
{
  "id": "federated-capability-ownership",
  "testModuleDir": "federated-capability-ownership",
  "testPathPattern": "modules/federated-capability-ownership"
}
```
Any new test file placed under `server/src/__tests__/modules/federated-capability-ownership/` is already covered by this pattern — none of PR1–PR6d's new Node contract guards need a manifest change, only new test files in the existing directory.

---

## Execution strategy: one agent/PR at a time, not parallel

Recommendation: **sequential, one PR at a time, each validated before the next starts** — not multiple agents working different PRs in parallel. Reasons specific to this plan, not a generic default:

- **Migration numbering collides under parallelism.** PR3 and PR6a each add a new numbered `server/migrations/*.sql` file. Two agents working in parallel will pick the same "next" number from a stale view of `server/migrations/`, and the collision only surfaces at merge time, not at write time.
- **PR6b and PR6c are a real refactor and lockdown of already-shipped code**, not additive work: PR6b migrates `markApproved`/`markDenied` off direct `UPDATE`s onto the new stored procedure, and PR6c then activates a `BEFORE UPDATE` trigger + session-local guard variable that makes `decide_capability_request` the only way `capability_override_requests`'s decision columns can change — the one-way door in this plan (not `REVOKE`; see PR6c's own corrected description). Splitting them from PR6a (purely additive: migration + procedure, no enforcement yet) and PR6d (net-new `withdraw`/`MyRequests.razor`, no lockdown coupling) means each PR carries a single risk profile and a clean revert point instead of bundling "safe to undo" and "not safe to undo" changes into one unit. This needs the existing `federated-capability-ownership` contract guards green *before and after* each of PR6b and PR6c, in isolation — running them alongside unrelated concurrent work makes a regression harder to attribute.
- **The dependency graph is mostly real, not cosmetic**: PR4 needs PR2's helper; PR5 needs PR1, PR3, and PR4; PR6a needs PR1 and PR3; PR6b needs PR6a; PR6c needs PR6b; PR6d needs PR1 and PR6a. Only PR1, PR2, and PR3 (all of Phase 1) are genuinely independent of each other, and even there, the migration-numbering risk above argues for landing them one at a time rather than saving a small amount of wall-clock time.
- **This is governance/audit-trail code.** A mistake here (as this session's own break-glass correction showed on ADR-005) is expensive to unwind after the fact. Validating each PR's AEV/governed-feature gates before starting the next is cheap insurance against exactly that.

If parallelism is wanted anyway, the only safe split is PR1/PR2/PR3 *with an explicit, communicated migration-number reservation* (e.g. "PR1 takes no migration, PR2 takes no migration, PR3 takes 444") — PR4 onward, including all of PR6a–PR6d, should stay strictly sequential regardless.

---

## Phase 1: Independent foundations (PR1, PR2, PR3)

### PR1 — Current-user profile/department lookup (Action Item 1)

**Objective**: give `Adpa.Web`'s session a way to resolve the signed-in Firebase user's `users.id`, `role`, and active department memberships — the gap the Approvals design spec deferred (`2026-07-14-governor-portal-approvals-queue-design.md`, "Deferred / not done").

**Tasks**:
1. Node: confirm the Next.js frontend's existing `/api/v1/auth/me`-equivalent resolves `users.id`/`role`/active `user_departments` rows by Firebase UID; if the orchestrator has no way to reach it yet, add a thin authenticated proxy endpoint (mirroring `CapabilityRegistryClient`'s pattern) rather than a new auth mechanism.
2. Orchestrator: a small `CurrentUserClient`/`CurrentUserService` resolving the caller's profile once per request (or per-circuit, cached), exposed to Blazor pages via DI — the same shape `FirebaseBearerTokenHandler` already establishes for the `"api"` `HttpClient`.
3. Blazor: expose the resolved profile (department memberships, role) through a scoped service consumed by `Capabilities.razor` (PR4), the request forms (PR5), and retroactively by `Approvals.razor` to close its own deferred action-hiding gap.
4. Contract guard: a test asserting the profile resolves the correct active department memberships for a real seeded user, and returns an empty/anonymous profile (not a 500) for a caller with no `user_departments` rows.

### PR2 — Extract shared admin/member scoping helper (Action Item 2)

**Objective**: one place decides "admin/super_admin sees everything; a plain user sees only their own active `functional_owner_department`/`requested_by_department` membership" — today duplicated between `CapabilityOverrideController.listPending` and `CapabilityOverrideExceptionController.listPending`, about to become a third copy in PR4.

**Tasks**:
1. Extract the scoping predicate into one shared repository helper (e.g. `DepartmentScopedQuery` or a shared SQL fragment builder), consumed by both existing `listPending` methods with no behavior change — this task's contract guard is the existing test suite passing unchanged.
2. Name the canonical scoping column explicitly: `functional_owner_department` (on `capability_registry`, joined by `portfolio_id`) for anything scoping *capabilities*; `requested_by_department` (on the request row itself) for anything scoping *requests*. These usually agree but are not the same predicate (see ADR-012 §A) — the helper takes the column as a parameter rather than assuming one.
3. Contract guard: existing `overrides/pending`/`exceptions/pending` scoping tests pass unchanged after extraction; a new test asserts the helper's admin-sees-all and member-sees-own-department branches directly, independent of either controller.

### PR3 — Retroactive audit_log hash-chain coverage (Action Item 4)

**Objective**: close the *existing* gap — `CapabilityOverrideRequestRepository.create()`/`markApproved()`/`markDenied()` (migration 440) are bare, untransacted `INSERT`/`UPDATE`s with no `audit_log` participation today. This must land before PR5 ships more traffic through the same gap.

**Tasks**:
1. Migration `server/migrations/444_capability_override_requests_audit_coverage.sql` (or next free number — coordinate before starting, per the execution-strategy note above): no schema change to `capability_override_requests` itself; this task is about the write path, not the table.
2. Wrap `create()`, `markApproved()`, `markDenied()` (and their exception-table equivalents in `CapabilityOverrideExceptionRepository`) in a transaction that also inserts into `audit_log`, routing through the existing `trg_audit_log_before_insert` hash-chain trigger (`000_baseline.sql:11437-11460`) — matching the `INSERT INTO audit_log(table_name, row_id, action, old_values, new_values)` shape already used elsewhere (`000_baseline.sql:11421-11429`).
3. **Digest, not raw content** (ADR-012 §D, hard requirement): the `new_values`/`old_values` jsonb for these three tables carries a digest of the canonicalized row (e.g. `sha256(canonical_json(row))`), never the raw `justification` text or requester identity — those stay solely in the access-controlled `capability_override_requests`/`capability_override_exceptions` rows. Write the canonicalization function once, shared by this task and PR6a's `decide_capability_request` procedure.
4. Repositories currently take a bare `Pool` — thread a transaction-scoped client through `create`/`markApproved`/`markDenied` (a `PoolClient` parameter) rather than issuing the `audit_log` insert as a separate, unguaranteed second query.
5. Contract guard: a request created via `create()` has a matching `audit_log` row in the same transaction (real-Postgres integration test, not mocked); a forced failure after the request insert but before the audit insert rolls back both (transactional integrity, not just "both usually happen"); the `audit_log` row's `new_values` contains a digest field and does **not** contain the literal justification string.

---

## Phase 2: Capability Register read surface

### PR4 — Capability Register read surface (Action Item 3)

**Depends on**: PR2 (scoping helper).

**Objective**: the Governor Portal's new anchor page — a browsable register, where today there is none.

**Tasks**:
1. Node: `GET /api/v1/capability-registry`, authenticated, using PR2's shared helper scoped by `functional_owner_department`. No pagination in this cut (see ADR-012 §A) — today's scale (~15 governed-features packets × active portfolio count) doesn't need it yet.
2. Orchestrator: `CapabilityRegistryClient.ListAsync`, following the existing `GetRelayAsync` pattern; `CapabilityController.ListCapabilities`, using the existing `RelayList` helper — no new proxy shape.
3. Blazor: `Components/Pages/Capabilities.razor`, `[Authorize]`, one `GovernorCard` per capability (`moduleId`/`portfolioId`, `StatusChip` for `activation_status`, `functionalOwnerDepartment`), reusing ADR-011's library as-is. Status-aware action buttons render per PR1's resolved profile, but the actions themselves (Promote/Request Override/Raise Break-Glass) are wired in PR5 — this PR can ship with those buttons disabled/absent if it lands first.
4. Add `Capabilities` to `MainLayout.razor`'s nav (mirroring `Approvals`/`Ledger`/`Requirements`).
5. Contract guard: an admin caller sees every capability; a plain user sees only capabilities in their active department(s) and portfolio(s); a capability with zero pending requests still appears (proving the endpoint scopes by `functional_owner_department`, not by request rows — the divergence PR2's helper exists to prevent).

---

## Phase 3: Request-creation forms

### PR5 — Request-creation forms (Action Item 5)

**Depends on**: PR1 (profile lookup), PR3 (ledger coverage — ADR-012 §6 requires this land before any UI write surface ships, not just as a risk-driven sequencing preference), PR4 (a page for the forms to live in).

**Objective**: make `override/request`/`exceptions/request` — endpoints that exist today with zero UI callers — reachable from the product.

**Tasks**:
1. `Promote` action wired to the existing `promote` endpoint from `Capabilities.razor`'s card/detail view.
2. **Request Override** form: two-step draft → confirm (not one click), fields `requestedNewStatus`/`justification`/optional `dracoVerdictId`, posting to `override/request`. Justification validated inline (empty/whitespace rejected client-side, mirroring `CapabilityOverrideController.request`'s existing 400).
3. **Raise Break-Glass Exception** form: same shape, posting to `exceptions/request`, deliberately higher-friction UI (confirmation copy makes clear this is the structural-deadlock path, not a convenience shortcut).
4. Gate all three actions on PR1's resolved profile: visible only to an active member of the capability's `functionalOwnerDepartment`, or an admin.
5. DTO extraction (blocking precondition, not incidental): move `PendingOverride`/`PendingException` out of `Approvals.razor`'s private nested classes into a shared location (e.g. `Models/CapabilityRequests.cs`) so `Capabilities.razor` and PR6's `MyRequests.razor` can reference the same shapes.
6. Contract guard: submitting with empty justification is rejected client-side before any HTTP call; a non-member (not admin) never sees the action buttons; the resulting request is visible in the existing `Approvals.razor` pending queue unchanged.

---

## Phase 4: My Requests, withdraw, and write-lockdown consolidation

Action Item 6 covers giving a request a full lifecycle (raise → pending → decided-or-withdrawn) and bringing `capability_override_requests.status` up to the same DB-layer lockdown standard `activation_status` already has. It's split into four PRs — PR6a (additive), PR6b (refactor), PR6c (lockdown), PR6d (net-new feature) — following an expand/migrate/contract shape so the one-way-door enforcement step (PR6c's trigger-and-guard-variable lockdown) is isolated from both the additive setup and the new feature work, instead of all four landing or failing as one unit. See the top-level dependency table and execution-strategy section for why this split exists and why PR6a–PR6d still run strictly sequentially regardless.

**Scope note (applies to all of PR6a–PR6d)**: `withdraw` covers **override requests only**. Break-glass exceptions render read-only in My Requests — their multi-reviewer lifecycle (`exception_review_status`: `pending/active/disabled/escalated`, per-reviewer rows in `override_exception_reviews`) has no self-evident "withdrawn" meaning once a reviewer has already decided; that's a separate, future decision, not this PR's.

### PR6a — Withdraw migration + stored procedure (Action Item 6, additive)

**Depends on**: PR1 (profile lookup — requester identity), PR3 (ledger coverage — the procedure this PR adds must also honor it).

**Objective**: add the schema and the stored procedure the rest of Phase 4 builds on, without touching any existing write path yet. `markApproved`/`markDenied` keep using their current direct `UPDATE`s after this PR lands — the procedure exists and is callable, but isn't yet the only way to change `status`. This keeps the PR purely additive and trivially revertible.

**Tasks**:
1. Migration `server/migrations/44X_capability_override_requests_withdraw.sql` (coordinate the next free number per the execution-strategy note above):
   ```sql
   ALTER TABLE public.capability_override_requests
     DROP CONSTRAINT capability_override_requests_status_check,
     ADD CONSTRAINT capability_override_requests_status_check
       CHECK (status IN ('pending', 'approved', 'denied', 'withdrawn')),
     ADD COLUMN IF NOT EXISTS withdrawn_at timestamptz;
   -- withdrawn_at, not approved_by/decided_at -- the distinct_approver CHECK
   -- (approved_by IS DISTINCT FROM requested_by) forbids recording the
   -- withdrawer there, and the withdrawer IS the requester by definition.
   ```
2. Stored procedure `decide_capability_request(request_id, decision, decided_by, decided_by_department, reason, override_expires_at)` where `decision IN ('approved', 'denied', 'withdrawn')`, `SECURITY DEFINER` with a pinned `search_path` (so it still works once PR6c's trigger is enforcing, the same reasoning `promote_capability_status` establishes for `activation_status`), intended to become (in PR6c) the **only** permitted writer of `capability_override_requests.status`:
   - For `withdrawn`: enforce `decided_by = requested_by` (the narrower, requester-only check — department membership is irrelevant here, unlike every other action in this ADR) and `status = 'pending'` at time of transition.
   - For `approved`/`denied`: same two-distinct-department-member check the app layer already does (ADR-005 Phase 2 task 4's rule), now also enforced here as defense in depth.
   - Performs the `audit_log` insert itself, using PR3's canonicalization/digest function — same transaction by construction, no transaction-client plumbing through repositories required.
3. Contract guard: real-Postgres verification (mocked-pool can't meaningfully test a stored procedure's own logic) that calling `decide_capability_request` directly transitions `status` correctly for all three decisions and writes a matching `audit_log` row, plus the negative cases (non-requester withdraw, self-approval, non-member approval, already-decided request) all raise the expected exception. `server/tests/integration/`'s shared harness is still blocked repo-wide (see PR2/PR3's notes) — verified via a standalone script (`server/scripts/verify-decide-capability-request.ts`, transaction-wrapped and always rolled back, safe to run against a real shared database) instead, matching the precedent `adpa-capability-activation-lifecycle`'s own Phase 6/7 suites already set for this exact blocker. The existing `markApproved`/`markDenied` contract guards still pass unchanged (they don't call the procedure yet, and shouldn't need to).

### PR6b — Migrate markApproved/markDenied to the procedure (Action Item 6, refactor)

**Depends on**: PR6a (the procedure must exist and be verified correct first).

**Objective**: switch the two already-shipped decision paths onto `decide_capability_request`, with `UPDATE` still granted so this PR is revertible on its own if the migration surfaces a regression.

**Tasks**:
1. Migrate `CapabilityOverrideRequestRepository.markApproved`/`markDenied` to call `decide_capability_request` instead of their current direct `UPDATE`s.
2. Land this in isolation from unrelated concurrent work — confirm the existing `federated-capability-ownership` contract guards pass unchanged both before starting and after landing, per the execution-strategy note above.
3. Contract guard: `markApproved`/`markDenied`'s existing contract guards pass unchanged after the migration to the procedure; a test asserting both still work correctly while `UPDATE` remains granted (i.e. this PR does not yet depend on PR6c).

### PR6c — Trigger + guard-variable lockdown (Action Item 6, write-lockdown)

**Depends on**: PR6b (both existing decision paths must already be calling the procedure before the trigger starts enforcing, or they'd break).

**Objective**: the one-way door — make `decide_capability_request` the *only* way `capability_override_requests`'s decision columns can change, closing the gap ADR-012 §D identifies (these columns have never been DB-enforced, unlike `activation_status`).

**Correction (2026-07-17, caught during PR6a's implementation)**: an earlier draft of this task called for `REVOKE UPDATE ... FROM <app role>`. Verified against `adpa-capability-activation-lifecycle`'s own documented invariant for `activation_status`'s existing lockdown — the exact precedent this task is supposed to mirror — and confirmed it is **not** `REVOKE`-based: this app connects to Postgres via one `DATABASE_URL`/role for both migrations and runtime, with no separate low-privilege app role to revoke from without rewiring deployment credentials (that invariant's own words, grepped-and-confirmed against `000_baseline.sql` and every migration file: zero `REVOKE` hits anywhere in this codebase). `activation_status`'s real mechanism — and this task's corrected one — is a `BEFORE UPDATE` trigger checking a session-local guard variable that only the sanctioned procedure sets, mirroring `guard_capability_registry_activation_status` exactly.

**Tasks**:
1. Migration adding `guard_capability_override_requests_decision_columns()` (a `BEFORE UPDATE` trigger function checking whether any of `status`/`approved_by`/`approved_by_department`/`decided_at`/`denial_reason`/`withdrawn_at`/`override_expires_at` changed, and if so, requiring `current_setting('adpa.allow_capability_override_decision_write', true) = 'on'`, else `RAISE EXCEPTION`) and its `BEFORE UPDATE ON capability_override_requests` trigger.
2. `decide_capability_request` (PR6a) updated to `PERFORM set_config('adpa.allow_capability_override_decision_write', 'on', true)` immediately before its own `UPDATE`, and back to `'off'` immediately after — same "close the bypass window right after the one sanctioned write" reasoning `promote_capability_status` already establishes for `activation_status`'s guard.
3. Contract guard: real-Postgres verification (same standalone-script pattern as PR6a) that:
   - a direct `UPDATE capability_override_requests SET status = ...` (bypassing the procedure) is rejected by the trigger;
   - a direct `UPDATE` of any other guarded decision column (`approved_by`, `approved_by_department`, `decided_at`, `denial_reason`, `withdrawn_at`, `override_expires_at`) is likewise rejected when the guard variable isn't set;
   - an `UPDATE` that changes only a non-decision column (e.g. touching some unrelated future column added to this table) still succeeds — proving the trigger protects only the governed decision fields, not the entire row. This is the most common implementation mistake for this shape of trigger: accidentally freezing legitimate maintenance writes along with the governed ones;
   - `markApproved`/`markDenied`'s contract guards still pass unchanged now that the guard is active (proving PR6b's migration was complete — nothing was still relying on an unguarded direct `UPDATE`).

### PR6d — My Requests view + withdraw endpoint (Action Item 6, net-new)

**Depends on**: PR1 (profile lookup — requester identity), PR6a (the procedure `withdraw` calls). Does not require PR6b or PR6c to function — see the top-level dependency table for why it's still sequenced after them.

**Objective**: the actual new feature — give a requester a way to see and withdraw their own pending requests, closing the "one-way submission into a queue someone else owns" gap ADR-012 §B calls out.

**Tasks**:
1. New `withdraw` endpoint/repository method calling `decide_capability_request(..., 'withdrawn', ...)`, authorized by `caller.id == request.requestedBy` — not department membership.
2. Blazor: `MyRequests.razor`, listing the caller's own override requests (pending + decided) via PR5's shared DTOs, with a `Withdraw` action on pending rows only.
3. Contract guard: `withdraw` succeeds for the requester and fails (403, not a DB error) for anyone else regardless of department/admin status; a withdrawn request no longer appears as an available target for `withdraw` a second time (state check, not just authorization).

---

## Phase 5: Discovery and provenance

### PR7 — Researcher Dashboard discovery (Action Item 7)

**Depends on**: PR4 (an endpoint to consume).

**Tasks**:
1. Read-only capability-status view in `app/`, calling PR4's `GET /api/v1/capability-registry` directly through the existing `/api/*` Next.js proxy (no new backend plumbing, no bearer-token relay reimplemented — ADR-012 §C).
2. Deep-links to `/capabilities/{moduleId}/{portfolioId}` in the Governor Portal for any write action; no action buttons of its own.
3. Contract guard: the view renders with zero write-capable elements (a lint/test asserting no `POST`/`PUT`/`PATCH` call originates from that view's code).

### PR8 — Visible provenance marker (Action Item 8)

**Depends on**: PR3 and PR6c (real chain entries to point to, and the lockdown that guarantees every future row has one); most useful after PR6d (decided/withdrawn rows to demonstrate against), though not a hard technical dependency.

**Tasks**:
1. A small provenance marker on every row in `Capabilities.razor`, `Approvals.razor`, and `MyRequests.razor`, using **one canonical format across all three pages** (ADR-012 itself deliberately left the exact display open — "hash-chain position or recorded timestamp" — but three pages independently choosing among that ambiguity would produce three different UIs for the same concept):
   ```
   Chain Entry: <audit_log.id>
   Recorded: <audit_log.occurred_at, UTC>
   ```
   The UI never displays the digest/hash itself — that's an integrity proof for reconciliation tooling, not something a reviewer reads directly. The `audit_log.id` + `occurred_at` pair is what gives a reviewer a stable reference they can correlate against reconciliation output or an audit export, while staying compact enough for routine display. This is the UI-side counterpart to ADR-005 Item 6's reconciliation job, now meaningful because PR3/PR6c guarantee every row actually has a chain entry to point to.
2. Contract guard: the displayed `Chain Entry`/`Recorded` values resolve to a real `audit_log` row for a freshly created request — the `audit_log.id` shown matches the persisted row's `id`, and the displayed timestamp matches that row's `occurred_at` (within normal rendering precision) — proving the marker is sourced from the ledger, not generated client-side as a placeholder.

---

## Sequencing note

PR1, PR2, and PR3 have no dependency on each other but are recommended sequential per the execution-strategy section above. PR4 depends on PR2. PR5 depends on PR1, PR3, and PR4 — PR3 is a hard content dependency here (ADR-012 §6 requires ledger coverage before any UI write surface ships), not just a risk-driven preference. PR6a depends on PR1 and PR3. PR6b depends on PR6a. PR6c depends on PR6b. PR6d depends on PR1 and PR6a (not on PR6b/PR6c, though it's not useful without a UI to raise requests from, and shares a repository file with them). PR7 depends on PR4. PR8 depends on PR3 and PR6c, and is most useful after PR6d. Total ordering if run strictly one-at-a-time: **PR1 → PR2 → PR3 → PR4 → PR5 → PR6a → PR6b → PR6c → PR6d → PR7 → PR8** (PR1/PR2/PR3 are mutually reorderable; the rest are not).
