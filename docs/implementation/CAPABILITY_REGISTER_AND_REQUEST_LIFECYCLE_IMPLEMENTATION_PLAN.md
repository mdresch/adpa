# Capability Register and Request-Creation Lifecycle — Implementation Plan

**Document ID**: IMP-2026-002
**Version**: 1.0
**Date**: 2026-07-17

Implements [ADR-012: Capability Register and Request-Creation Lifecycle](../07-architecture/ADR-012-capability-register-and-request-lifecycle.md). ADR-012 §6 states each of its eight Action Items is its own PR — this plan keeps that 1:1. **PR1–PR8** below, one per Action Item, grouped into five *phases* purely to show the dependency structure between them; a phase is not a bigger PR that bundles its tasks together.

| PR | Action Item | Phase | Depends on |
|---|---|---|---|
| PR1 | 1 — profile/department lookup | Phase 1 | none |
| PR2 | 2 — shared scoping helper | Phase 1 | none |
| PR3 | 4 — retroactive audit_log coverage | Phase 1 | none |
| PR4 | 3 — Capability Register read surface | Phase 2 | PR2 |
| PR5 | 5 — request-creation forms | Phase 3 | PR1, PR4 |
| PR6 | 6 — My Requests, withdraw, write-lockdown | Phase 4 | PR1, PR3 |
| PR7 | 7 — Researcher Dashboard discovery | Phase 5 | PR4 |
| PR8 | 8 — visible provenance marker | Phase 5 | PR3, PR6 (most useful after) |

Extends the existing `federated-capability-ownership` governed-feature packet (`server/governed-features.manifest.json`) — this is not a new packet. Node changes in PR3, PR4, and PR6 go through the Governed Feature Loop (Contract Guards before implementation, `SKILL.md` update, manifest registration) per ADR-012 §6; Blazor/orchestrator changes go through the AEV workflow (`dotnet build -c Release`, orchestration boot success).

```json
{
  "id": "federated-capability-ownership",
  "testPathPattern": "capabilityOwnership|moduleActivation|capabilityRegister|capabilityRequestLifecycle"
}
```

---

## Execution strategy: one agent/PR at a time, not parallel

Recommendation: **sequential, one PR at a time, each validated before the next starts** — not multiple agents working different PRs in parallel. Reasons specific to this plan, not a generic default:

- **Migration numbering collides under parallelism.** PR3 and PR6 each add a new numbered `server/migrations/*.sql` file. Two agents working in parallel will pick the same "next" number from a stale view of `server/migrations/`, and the collision only surfaces at merge time, not at write time.
- **PR6 is a real refactor of already-shipped code**, not additive work: it revokes direct `UPDATE` on `capability_override_requests.status` and migrates `markApproved`/`markDenied` to a new stored procedure. This needs the existing `federated-capability-ownership` contract guards green *before and after*, in isolation — running it alongside unrelated concurrent work makes a regression harder to attribute.
- **The dependency graph is mostly real, not cosmetic**: PR4 needs PR2's helper; PR5 needs PR1 and PR4; PR6 needs PR1 and PR3. Only PR1, PR2, and PR3 (all of Phase 1) are genuinely independent of each other, and even there, the migration-numbering risk above argues for landing them one at a time rather than saving a small amount of wall-clock time.
- **This is governance/audit-trail code.** A mistake here (as this session's own break-glass correction showed on ADR-005) is expensive to unwind after the fact. Validating each PR's AEV/governed-feature gates before starting the next is cheap insurance against exactly that.

If parallelism is wanted anyway, the only safe split is PR1/PR2/PR3 *with an explicit, communicated migration-number reservation* (e.g. "PR1 takes no migration, PR2 takes no migration, PR3 takes 444") — PR4 onward should stay strictly sequential regardless.

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

**Correction (2026-07-17, verified against the actual repositories):** an earlier draft of this plan (and of ADR-012 §A/§6 Item 2) asserted the admin-sees-all/member-sees-own-department predicate is duplicated across *both* `CapabilityOverrideController.listPending` and `CapabilityOverrideExceptionController.listPending`. It is not. `CapabilityOverrideExceptionRepository.listPendingForUser`'s non-admin branch authorizes by **named-reviewer-assignment** (`EXISTS (... override_exception_reviews rev WHERE rev.reviewer_user_id = $2 AND rev.decision IS NULL)`) — a different table, a different mechanism, no department check at all — matching its own doc comment ("a plain user sees only exceptions where THEY are a named reviewer... matches `decideReview`'s own authorization"). Only `CapabilityOverrideRequestRepository.listPendingForUser` genuinely shares the admin-sees-all/department-membership predicate this PR extracts. See ADR-012 §A's matching correction.

**Objective**: one place decides "admin/super_admin sees everything; a plain user sees only their own active department membership" — today implemented once, correctly, in `CapabilityOverrideRequestRepository.listPendingForUser`, about to become a second, easily-drifting copy in PR4's new capability-registry list endpoint. `CapabilityOverrideExceptionController.listPending` is not a consumer of this helper — its reviewer-assignment authorization is a distinct, already-correct concern this PR does not touch.

**Tasks**:
1. Extract the scoping predicate into one shared repository helper (e.g. `DepartmentScopedQuery` or a shared SQL fragment builder), consumed by `CapabilityOverrideRequestRepository.listPendingForUser` with no behavior change — this task's contract guard is the existing test suite passing unchanged. `CapabilityOverrideExceptionRepository.listPendingForUser` is left as-is.
2. Name the canonical scoping column explicitly: `functional_owner_department` (on `capability_registry`, joined by `portfolio_id`) for anything scoping *capabilities* (PR4's consumer); `requested_by_department` (on the request row itself) for anything scoping *requests* (this PR's consumer, `listPendingForUser`). These usually agree but are not the same predicate (see ADR-012 §A) — the helper takes the column as a parameter rather than assuming one.
3. Contract guard: the existing `overrides/pending` scoping test passes unchanged after extraction; a new test asserts the helper's admin-sees-all and member-sees-own-department branches directly, independent of the controller. `exceptions/pending`'s existing tests are untouched by this PR (no code path of theirs changes).

### PR3 — Retroactive audit_log hash-chain coverage (Action Item 4)

**Objective**: close the *existing* gap — `CapabilityOverrideRequestRepository.create()`/`markApproved()`/`markDenied()` (migration 440) are bare, untransacted `INSERT`/`UPDATE`s with no `audit_log` participation today. This must land before PR5 ships more traffic through the same gap.

**Tasks**:
1. Migration `server/migrations/444_capability_override_requests_audit_coverage.sql` (or next free number — coordinate before starting, per the execution-strategy note above): no schema change to `capability_override_requests` itself; this task is about the write path, not the table.
2. Wrap `create()`, `markApproved()`, `markDenied()` (and their exception-table equivalents in `CapabilityOverrideExceptionRepository`) in a transaction that also inserts into `audit_log`, routing through the existing `trg_audit_log_before_insert` hash-chain trigger (`000_baseline.sql:11437-11460`) — matching the `INSERT INTO audit_log(table_name, row_id, action, old_values, new_values)` shape already used elsewhere (`000_baseline.sql:11421-11429`).
3. **Digest, not raw content** (ADR-012 §D, hard requirement): the `new_values`/`old_values` jsonb for these three tables carries a digest of the canonicalized row (e.g. `sha256(canonical_json(row))`), never the raw `justification` text or requester identity — those stay solely in the access-controlled `capability_override_requests`/`capability_override_exceptions` rows. Write the canonicalization function once, shared by this task and PR6's `decide_capability_request` procedure.
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

**Depends on**: PR1 (profile lookup), PR4 (a page for the forms to live in).

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

### PR6 — My Requests, withdraw, write-lockdown (Action Item 6)

**Depends on**: PR1 (profile lookup — requester identity), PR3 (ledger coverage — the procedure this PR adds must also honor it).

**Objective**: give a request a full lifecycle (raise → pending → decided-or-withdrawn) instead of a one-way submission, and — since this is the one place ADR-012 touches an already-shipped write path — bring `capability_override_requests.status` up to the same DB-layer lockdown standard `activation_status` already has.

**Scope note**: `withdraw` covers **override requests only**. Break-glass exceptions render read-only in My Requests — their multi-reviewer lifecycle (`exception_review_status`: `pending/active/disabled/escalated`, per-reviewer rows in `override_exception_reviews`) has no self-evident "withdrawn" meaning once a reviewer has already decided; that's a separate, future decision, not this PR's.

**Tasks**:
1. Migration `server/migrations/44X_capability_override_requests_withdraw.sql`:
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
2. Stored procedure `decide_capability_request(request_id, decision, decided_by, decided_by_department, reason, override_expires_at)` where `decision IN ('approved', 'denied', 'withdrawn')` — the **only** permitted writer of `capability_override_requests.status` going forward:
   - `REVOKE UPDATE (status, approved_by, approved_by_department, decided_at, denial_reason, withdrawn_at) ON capability_override_requests FROM <app role>`.
   - For `withdrawn`: enforce `decided_by = requested_by` (the narrower, requester-only check — department membership is irrelevant here, unlike every other action in this ADR) and `status = 'pending'` at time of transition.
   - For `approved`/`denied`: same two-distinct-department-member check the app layer already does (ADR-005 Phase 2 task 4's rule), now also enforced here as defense in depth.
   - Performs the `audit_log` insert itself, using PR3's canonicalization/digest function — same transaction by construction, no transaction-client plumbing through repositories required.
3. Migrate `CapabilityOverrideRequestRepository.markApproved`/`markDenied` to call `decide_capability_request` instead of their current direct `UPDATE`s. This is the refactor risk called out in the execution-strategy note above — land it in isolation, confirm the existing `federated-capability-ownership` contract guards still pass unchanged before proceeding.
4. New `withdraw` endpoint/repository method calling `decide_capability_request(..., 'withdrawn', ...)`, authorized by `caller.id == request.requestedBy` — not department membership.
5. Blazor: `MyRequests.razor`, listing the caller's own override requests (pending + decided) via PR5's shared DTOs, with a `Withdraw` action on pending rows only.
6. Contract guard: a direct `UPDATE capability_override_requests SET status = ...` is rejected by DB permissions (real-Postgres test, mirroring ADR-005 Phase 3 task 4's equivalent guard for `activation_status`); `withdraw` succeeds for the requester and fails (403, not a DB error) for anyone else regardless of department/admin status; `markApproved`/`markDenied`'s existing contract guards pass unchanged after the migration to the procedure.

---

## Phase 5: Discovery and provenance

### PR7 — Researcher Dashboard discovery (Action Item 7)

**Depends on**: PR4 (an endpoint to consume).

**Tasks**:
1. Read-only capability-status view in `app/`, calling PR4's `GET /api/v1/capability-registry` directly through the existing `/api/*` Next.js proxy (no new backend plumbing, no bearer-token relay reimplemented — ADR-012 §C).
2. Deep-links to the Governor Portal for any write action; no action buttons of its own. **Correction (caught during implementation)**: the plan originally specified `/capabilities/{moduleId}/{portfolioId}` as the link target, but no such per-capability route exists — `Capabilities.razor` is mounted only at the flat `/capabilities` list route (§ confirmed against the file's own `@page` directive), and this task's own framing ("no new backend plumbing") scopes PR7 to the Next.js side only. Linking to the existing `/capabilities` list is what's actually implementable without adding orchestrator routing out of this PR's scope; a true per-row deep link is future work if it's ever wanted, not something PR7 silently assumes into existence.
3. Contract guard: the view renders with zero write-capable elements (a lint/test asserting no `POST`/`PUT`/`PATCH` call originates from that view's code).

### PR8 — Visible provenance marker (Action Item 8)

**Depends on**: PR3 (real chain entries to point to); most useful after PR6 (decided/withdrawn rows to demonstrate against), though not a hard technical dependency.

**Tasks**:
1. A small ledger reference (hash-chain position or recorded timestamp) on every row in `Capabilities.razor`, `Approvals.razor`, and `MyRequests.razor` — the UI-side counterpart to ADR-005 Item 6's reconciliation job, now meaningful because PR3/PR6 guarantee every row actually has a chain entry to point to.
2. Contract guard: the provenance marker resolves to a real `audit_log` row for a freshly created request, not a placeholder.

---

## Sequencing note

PR1, PR2, and PR3 have no dependency on each other but are recommended sequential per the execution-strategy section above. PR4 depends on PR2. PR5 depends on PR1 and PR4. PR6 depends on PR1 and PR3 (not on PR4 or PR5, though it's not useful without a UI to raise requests from). PR7 depends on PR4. PR8 depends on PR3 and is most useful after PR6. Total ordering if run strictly one-at-a-time: **PR1 → PR2 → PR3 → PR4 → PR5 → PR6 → PR7 → PR8** (PR1/PR2/PR3 are mutually reorderable; the rest are not).
