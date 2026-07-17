# ADR 012: Capability Register and Request-Creation Lifecycle

## 1. Status
**Proposed (2026-07-15) — revised 2026-07-17** after a code-level review: §D corrected against the actual state of `capability_override_requests` (no existing DB-layer lockdown, no existing decision procedure), withdraw scoped to override requests only, ledger coverage re-sequenced ahead of the UI forms, and Governed Feature Loop obligations made explicit.

Deciders: Owner(s) of the Governor Portal (`orchestrator/Adpa.Web`), the Researcher Dashboard (`app/`), and the `capability_registry` domain ([ADR-005](ADR-005-federated-capability-ownership.md)).

## 2. Context

[ADR-005](ADR-005-federated-capability-ownership.md)'s Action Item 7 called for "a working front door" so a department reviewer never needs to hit the API directly. [ADR-009](ADR-009-unified-authentication.md) (auth) and [ADR-011](ADR-011-governor-portal-design-system.md) (design system) delivered half of that: `Approvals.razor` at `/approvals` lists pending override requests and break-glass exceptions and lets a reviewer decide on them (approve/deny/decide/activate), all through a real, authenticated, bearer-token-relayed UI.

It delivered *decision*, not *request*. Verified in code, not assumed:

- `CapabilityController`/`CapabilityOverrideController`/`CapabilityOverrideExceptionController` expose `POST {moduleId}/{portfolioId}/override/request` and `POST {moduleId}/{portfolioId}/exceptions/request` — the two endpoints that actually originate a pending item. Neither has a UI caller anywhere in the platform. `Approvals.razor` only calls `GET overrides/pending`, `GET exceptions/pending`, and the four decision actions.
- A search of the Next.js Researcher Dashboard (`app/`) for any reference to `capability` or `capability-registry` returns nothing. The dashboard has its own, unrelated `app/approvals` (`ApprovalRequest`: `request_type`/`status`/`priority`/`sla_deadline`/`escalated`, with a `CreateApprovalDialog.tsx`) — a generic document/project approval workflow with no relationship to `capability_registry`. This ADR does not extend or merge with that system; the naming collision is coincidental and must stay that way to avoid confusing the two.
- There is no "list all capabilities" endpoint at any tier. `CapabilityRegistryController.getByModuleAndPortfolio` is the only read path against `capability_registry`, and it is deliberately unauthenticated and internal — a service-to-service lookup for the orchestrator's `TaskApprovalGate`, not something a human can browse. A department member has no way to see which capabilities their department owns, or what state any of them are in, without already knowing a `moduleId`/`portfolioId` pair from some other source.
- The Approvals design spec already flags the missing piece that blocks more than just Approvals: Adpa.Web's session knows the caller's Firebase UID/email and nothing else — no `users.id`, `role`, or department memberships. That gap is why Approvals can't hide actions the caller isn't authorized for; it would equally block any attempt to gate a new "Request Override" button to only the capability's actual owning department.
- Per the tier boundaries this repo already documents (`CLAUDE.md`): the Experience Tier (Researcher Dashboard) is "read-only/decision," for exploration and AI-assisted drafting; the Orchestration Tier (`Adpa.Web`, the Governor Portal) is the sole authority for high-integrity decisions. A researcher is plausibly the person who *notices* a capability needs a status change — mid-generation, mid-template-work — but today has no in-platform path from that discovery to raising a request. The only route is out-of-band (chat, email) to someone who does have API access.

## 3. Decision

Close ADR-005 Action Item 7 the rest of the way: add a Capability Register as the Governor Portal's new anchor page, make request-creation a first-class UI action gated by department membership, and give the Researcher Dashboard a read-only discovery view that deep-links into it — without duplicating the write surface. Every new write extends the same tamper-evident ledger discipline ADR-005 Action Item 6 already requires for decisions.

### A. Capability Register (`/capabilities`, Governor Portal — the new anchor page)

- **Node**: add `GET /api/v1/capability-registry`, authenticated, scoped the same way `overrides/pending`/`exceptions/pending` already are (admin/super_admin sees every capability; a plain user sees only capabilities whose `functional_owner_department` they're an active member of, in that portfolio) — consuming the shared admin-sees-all/member-sees-own-department helper extracted beforehand (Action Item 2), not a third copy of that logic. One subtlety item 2 must resolve rather than paper over: the existing pending-list predicates (`CapabilityOverrideRequestRepository.listPendingForUser` and its exception counterpart) filter on the *request's* `requested_by_department`, while this list must filter on the *capability's* `functional_owner_department`. These usually carry the same value — the request column is populated from the capability's at creation time — but they are not the same predicate, and a capability with no pending requests has no request row to scope by at all. The shared helper names `functional_owner_department` (joined per portfolio) as the canonical scoping column; otherwise "one shared helper" quietly becomes two.
- **Orchestrator**: `CapabilityRegistryClient` gains a `ListAsync` following the existing `GetRelayAsync` pattern; `CapabilityController` gains a `ListCapabilities` action using the existing `RelayList` helper — no new proxy pattern needed, the one built for the pending-list endpoints already fits.
- **Blazor**: `Components/Pages/Capabilities.razor`, `[Authorize]`, rendering each capability as a `GovernorCard` (reusing ADR-011's library as-is): `moduleId`/`portfolioId`, `StatusChip` for current status, `functionalOwnerDepartment`, and status-aware action buttons (below).

### B. Request-creation as a first-class action

Each capability's card/detail view exposes actions appropriate to its current state and the caller's department membership:

- **Promote** — the existing `promote` endpoint, which (like override/exception request) also has no UI trigger today; wire it here rather than leaving a second decorative gap.
- **Request Override** — a form (moduleId/portfolioId pre-filled, `requestedNewStatus`, `justification`, optional `dracoVerdictId`) posting to `override/request`.
- **Raise Break-Glass Exception** — same shape, posting to `exceptions/request`, deliberately higher-friction (see UI requirements below) — this path exists for structural deadlock, not convenience.

None of these render for a caller who isn't an active member of the capability's `functionalOwnerDepartment` (or an admin). This requires building the profile/department lookup the Approvals design spec already deferred — do it once, consumed by both Capabilities and (retroactively) Approvals' own action-hiding gap.

Requesters also get a **My Requests** view: their own override/exception requests, pending and decided, plus a **withdraw** action on their own still-pending requests — a symmetric counterpart to `deny`, requester-initiated, so a request has a real lifecycle (raise → pending → decided-or-withdrawn) instead of a one-way submission into a queue someone else owns. `withdraw`'s authorization is narrower than every other check in this ADR: department membership is irrelevant here, and the only question is whether the caller is the request's own requester — a different, simpler rule than the `functionalOwnerDepartment` membership check everything else in this section uses, worth stating explicitly so an implementer doesn't reach for the same department check by pattern-matching the surrounding code.

`withdraw` covers **override requests only** in this ADR. Break-glass exceptions have a structurally different lifecycle — `exception_review_status` runs `pending/active/disabled/escalated` (not pending/decided), each exception carries multiple per-reviewer review rows, and activation is a separate super-admin step. "Withdrawn" has no self-evident meaning once one of several reviewers has already recorded a decision, and defining it deserves its own decision, not a footnote here. In My Requests, a requester's exceptions render read-only.

### C. Researcher Dashboard: discovery, not a second write surface

Add a read-only capability-status view in `app/` that calls item A's new list endpoint directly (the Next.js `/api/*` proxy to Express already covers this — no new backend plumbing). When a capability isn't `active` or otherwise needs attention, the view deep-links to the Governor Portal's `/capabilities/{moduleId}/{portfolioId}` request form rather than growing its own override/exception UI. This preserves the tier boundary as documented rather than quietly duplicating Adpa.Web's Firebase-bearer-token relay ([ADR-009](ADR-009-unified-authentication.md)) a second time in Next.js. Explicitly not a rename or extension of `app/approvals`'s `ApprovalRequest` — a different table, a different domain, no shared UI.

### D. Ledger requirements for the new writes

Every new write path (`override/request`, `exceptions/request`, the new `withdraw`) must land in the same tamper-evident trail ADR-005 Action Item 6 already mandates for activation *decisions* — route through `audit_log`'s existing hash-chain trigger, in the same transaction as the `capability_override_requests`/exception insert, not a bare status-column write with an audit row added "alongside" it. A request that exists in the requests table but not in the hash chain reopens exactly the "coverage, not just integrity" gap ADR-005 Item 6 already calls out for decisions — one write-path further upstream is not a reason to exempt it. Consistent with keeping confidential request content (justification text, requester identity) inside the access-controlled Postgres row and only a cryptographic integrity proof in the append-only chain: the hash proves a request existed and wasn't altered after the fact; it does not itself disclose the request's contents outside the controlled system.

That confidentiality claim is a hard requirement on the *shape* of the audit row, not just its existence. `audit_log.old_values`/`new_values` are jsonb, and the natural pattern for that table — serializing the whole changed row — would replicate the justification text and requester identity into the append-only log: outside the access-controlled row, and beyond the reach of any correction or erasure later applied to `capability_override_requests`. The chain entry for these writes therefore carries a digest of the canonicalized row content (e.g. sha256), never the raw justification. Note this coverage gap is not created by this ADR's UI — `create()` in `CapabilityOverrideRequestRepository` is today a bare, untransacted `INSERT` with no audit row at all, so the API-only endpoints are already outside the chain. Action Item 4 closes that independently of, and before, any form shipping.

`withdraw` additionally needs the write-lockdown discipline ADR-005 Phase 3 task 2 applies to `activation_status` — but stating that honestly requires correcting a premise: `capability_override_requests.status` is *not* currently DB-enforced anywhere. `markApproved`/`markDenied` are plain app-layer `UPDATE`s, and no request-decision stored procedure exists to extend. Revoking `UPDATE` for withdraw's sake alone would break approve/deny. The decision: lock down the whole `status` column at once — one `decide_capability_request` stored procedure becomes the only permitted writer for all three transitions (`approved`, `denied`, `withdrawn`), `UPDATE` is revoked from the application role, and `markApproved`/`markDenied` are migrated to call the procedure. That is more scope than withdraw alone, and this ADR owns it (Action Item 6) rather than leaving the newest, least-dangerous transition as the only one held to ADR-005's standard. The procedure also performs the audit_log insert itself — same transaction by construction, enforced at the DB layer, and no transaction-client plumbing through repositories that currently take a bare pool.

Two migration facts an implementer will otherwise hit mid-PR: migration 440's `capability_override_requests_status_check` allows only `pending/approved/denied`, so `withdrawn` requires a constraint change; and its `capability_override_requests_distinct_approver` CHECK (`approved_by IS DISTINCT FROM requested_by`) makes it impossible to record the withdrawer in `approved_by` — the withdrawer *is* the requester by definition. Withdraw records into its own column (`withdrawn_at`, alongside `decided_at` semantics the reconciliation job treats uniformly) rather than overloading the decision columns against an existing constraint.

### UI requirements specific to entries in both registers (Capability Register writes and the Governance/RTM ledger's own creation actions)

- **Two-step, not one-click.** Every create action this ADR adds (override request, exception request) requires an explicit draft-then-confirm step, not a single button press. ADR-005 already requires a real justification; a one-click submit undersells how consequential the write is. RTM amendment proposals in `RPASGovernanceCenter`/`AIWorkspace` share the same "irreversible-feeling ledger write" shape and should eventually match — but retrofitting an existing page is a different, unscoped change; nothing in this ADR's Action Items covers it, and this bullet isn't a requirement on those pages until something does.
- **Justification is validated inline, not round-tripped.** The API already 400s on an empty/whitespace justification (`CapabilityOverrideController.request`); the form must enforce that client-side before submit, not rely on the server round-trip to teach the user the rule.
- **DRACO evidence surfaces before submission, not only before decision.** Once ADR-005 Item 5's DRACO integration lands, the request-creation form — not only the approver's review screen — is where a requester should see the verdict, mirroring ADR-005 §3 Item 5's "briefing before the decision" principle one step earlier in the flow.
- **One DTO shape per concept, reused everywhere.** Capabilities, Approvals, and My Requests all render the same underlying override/exception request shape (`PendingOverride`/`PendingException`) — no new ad hoc JSON shape introduced per page. These are currently `private sealed class` types nested inside `Approvals.razor`'s own `@code` block, which two other pages can't reference — moving them to a shared location (e.g. a `Models/` folder) is a precondition for this bullet, not an afterthought discovered mid-implementation.
- **Visible provenance on every displayed entry.** Any rendered ledger/register row (a request, a decision, an RTM amendment) shows a marker tying it back to its audit-log/hash-chain position or recorded timestamp, so a reviewer can tell "this is backed by the tamper-evident chain" from a raw table read — the UI-side counterpart to ADR-005 Item 6's reconciliation job.

## 4. Options Considered

### Option A: Leave request-creation API-only (status quo)
| Dimension | Assessment |
|---|---|
| Complexity | None |
| Cost | None upfront |
| Closes ADR-005 Action Item 7 | No — half-delivered indefinitely |

Cheapest, but leaves the exact gap this ADR exists to close: a "governed platform" (this repo's own description) with no UI path into the mechanism that starts governance review.

### Option B: Build request-creation in the Researcher Dashboard directly, skip the Governor Portal
| Dimension | Assessment |
|---|---|
| Complexity | Medium — new Next.js forms, but a second auth path into the same Node endpoints |
| Cost | Duplicates ADR-009's bearer-token relay in a second stack |
| Tier boundary | Violates it — Experience Tier is documented as read-only/decision, not a write authority |

Rejected: collides with the documented tier split, and would need its own Firebase-token-relay implementation in Next.js just to reach the same Node endpoints Adpa.Web can already call.

### Option C (Recommended): Capability Register + request lifecycle in the Governor Portal; Researcher Dashboard gets read-only discovery + deep link
| Dimension | Assessment |
|---|---|
| Complexity | Medium-high — one new list endpoint + scoping helper, one new anchor page, request forms, a profile/department lookup, one read-only Next.js view |
| Cost | Reuses ADR-009 auth and ADR-011 components entirely; no new design system or auth model |
| Tier boundary | Respected — one write surface, one discovery surface |

Matches the documented architecture, reuses the most existing infrastructure, and keeps "who could have submitted this" answerable against a single write path instead of two.

## 5. Consequences

### Positive
- ADR-005 Action Item 7 is closed for the requests that feed decisions, not only the decisions themselves.
- The Capability Register becomes the natural home for capability-lifecycle features ADR-005 already modeled but never surfaced (drift/`pending-re-approval` visibility, attestation deadlines).
- Zero new auth model or design system: ADR-009's bearer-token relay and ADR-011's component library cover the new page and forms as-is.
- The profile/department lookup this ADR requires also retroactively closes Approvals' own deferred action-hiding gap — one build serves two existing problems.

### Negative
- A third place (`capability-registry` list) must maintain the admin-sees-all/member-sees-own-department scoping rule — mitigated by extracting a shared repository helper now rather than after a third copy drifts from the first two.
- The profile/department lookup becomes a blocking prerequisite for two features landing at once (this ADR's action-gating, and Approvals' pre-existing deferred gap) — a sequencing risk if it slips.
- Adds transactional coupling between the new request-insert and the `audit_log` hash-chain write; getting this wrong (write succeeds, chain entry doesn't) reopens the exact "coverage, not integrity" gap ADR-005 Item 6 was written against, one write-path further upstream.
- The `status`-column lockdown migrates `markApproved`/`markDenied` from working app-layer `UPDATE`s to the new stored procedure — touching two live decision paths in order to hold three transitions to one standard. The `federated-capability-ownership` packet's existing contract guards passing unchanged is the regression net for that refactor.

### Explicitly out of scope
- **The Researcher Dashboard does not gain a capability write path.** Read-only discovery and a deep link out, full stop — see Option B's rejection.
- **`app/approvals`'s `ApprovalRequest` system is untouched.** No shared table, no shared UI, no rename.
- **DRACO integration itself** (verdict generation, per-finding acknowledgment) is ADR-005 Item 5's scope; this ADR only specifies where the request-creation form surfaces it once it exists.
- **Withdrawing break-glass exceptions.** See §B — the multi-reviewer exception lifecycle makes "withdrawn" ill-defined mid-review; a future decision can add it deliberately.
- **The internal, unauthenticated single-row read (`GET /:moduleId/:portfolioId`) stays as-is.** A browsable register makes its existence more visible than before; restricting it to service-to-service traffic at the network layer is a reasonable follow-up, but not this ADR's scope.

## 6. Action Items

Each numbered item below is its own PR, sequenced in this order — the same one-logical-change-per-PR discipline ADR-005 shipped under (its eight Action Items landed as separate, phase-numbered changes, not one delivery). Item 1 blocks items 5–6; item 2 blocks item 3. Item 4 (ledger coverage) deliberately lands *before* any UI write surface ships — the first draft of this ADR sequenced it after the forms, which would have violated §D's own coverage requirement for the duration of items 4–5; and since the gap it closes already exists today for API callers, it depends on nothing else in this list.

Non-trivial Node changes here (items 3, 4, 6) follow the Governed Feature Loop: contract guards written before implementation, registered in `server/governed-features.manifest.json` under the `federated-capability-ownership` packet, with its `SKILL.md` updated — tests under `server/src/__tests__/modules/` without a matching manifest entry fail CI.

1. Build the current-user profile/department lookup end-to-end (Node's equivalent likely already exists per the Next.js frontend's own `/api/v1/auth/me`; extend the orchestrator relay + an `Adpa.Web` session read) — blocking prerequisite for items 5–6.
2. Extract the admin-sees-all/member-sees-own-department scoping logic (currently duplicated across `overrides/pending` and `exceptions/pending`) into one shared repository helper, naming `functional_owner_department` as the canonical scoping column (see §A's predicate-divergence note) — lands *before* item 3 so the new list endpoint consumes it rather than adding a third copy.
3. Add `GET /api/v1/capability-registry` (Node, authenticated, using item 2's shared scoping helper) + orchestrator `ListAsync`/`ListCapabilities` proxy + `Capabilities.razor` at `/capabilities`. No pagination in this first cut — revisit if the registry's row count grows enough to matter (today: ~15 governed-features packets × active portfolio count).
4. Extend the audit_log hash-chain coverage (ADR-005 Item 6) to the *existing* `override/request`/`exceptions/request` writes — in the same transaction as the repository insert (today `create()` is a bare, untransacted `INSERT`), with digest-only jsonb per §D, never the raw justification. This fixes a gap API callers already have; sequenced before item 5 so the UI never ships a write outside the chain.
5. Add the Request Override and Break-Glass Exception creation forms as two-step draft/confirm UI, gated on item 1's department membership, posting to the existing `override/request`/`exceptions/request` endpoints with inline justification validation.
6. Add the requester-facing **My Requests** view and a new `withdraw` action/endpoint for a requester's own still-pending **override** requests (exceptions are read-only here — see §B), gated on item 1. `withdraw` must verify the caller *is* the request's own `requested_by` — department membership alone is the wrong check here, unlike every other action in this ADR. Per §D this item also delivers: the migration amending migration 440's `status` CHECK to admit `withdrawn` and adding `withdrawn_at` (the `distinct_approver` CHECK forbids recording the withdrawer in `approved_by`); the `decide_capability_request` stored procedure as the sole permitted writer for `approved`/`denied`/`withdrawn`, with the audit_log insert inside the procedure; `UPDATE` revoked from the application role; and `markApproved`/`markDenied` migrated to call the procedure, with the existing contract guards passing unchanged as the regression net.
7. Add the Researcher Dashboard's read-only capability discovery view (Next.js), consuming item 3's endpoint directly, deep-linking to the Governor Portal for any write action.
8. Add the visible provenance marker (hash-chain position/timestamp) to Capabilities, Approvals, and My Requests list rows.

## 7. References
- Pending-list endpoints and their scoping (the pattern items 2 and 3 extend): `server/src/modules/capabilityRegistry/routes.ts`, `CapabilityOverrideController.listPending`, `CapabilityOverrideExceptionController.listPending`
- The only existing read path against `capability_registry` (internal, unauthenticated, single-row only): `CapabilityRegistryController.getByModuleAndPortfolio` in `server/src/modules/capabilityRegistry/CapabilityRegistryController.ts`
- Request-creation endpoints with no UI caller today: `CapabilityOverrideController.request`, `CapabilityOverrideExceptionController.request`
- The orchestrator relay pattern being reused, not reinvented: `CapabilityController.Relay`/`RelayList` in `orchestrator/Adpa.Orchestrator/Controllers/CapabilityController.cs`
- The existing decision-only consumer this ADR extends: `orchestrator/Adpa.Web/Components/Pages/Approvals.razor`
- The deferred profile/role lookup this ADR makes a hard dependency: [`2026-07-14-governor-portal-approvals-queue-design.md`](../superpowers/specs/2026-07-14-governor-portal-approvals-queue-design.md), "Deferred / not done"
- The unrelated, pre-existing generic approval workflow this ADR does not touch: `app/approvals/page.tsx`, `app/approvals/components/CreateApprovalDialog.tsx`
- The constraints item 6's migration must amend (`status` CHECK, `distinct_approver`): `server/migrations/440_capability_override_requests.sql`
- The app-layer decision writes item 6 migrates to the stored procedure: `CapabilityOverrideRequestRepository.markApproved`/`markDenied`
- The hash-chain trigger the new coverage routes through: `trg_audit_log_before_insert` on `audit_log` (`server/migrations/000_baseline.sql`)
- The Governed Feature Loop obligations for items 3, 4, 6: `server/governed-features.manifest.json` (`federated-capability-ownership`), `.agents/skills/adpa-governed-feature-loop/SKILL.md`

## 8. UI Mockup

Four screens, one per Action Item that adds a UI surface — rendered against the real ADR-011 tokens (`design-tokens.css`, `gp-components.css`), not a hypothetical redesign. [View the mockup](https://claude.ai/code/artifact/d3386623-a5c3-4506-bcb2-66d36810cdee).

- **Capability Register (`/capabilities`)** — a card grid (`GovernorCard`), one per capability the signed-in user's departments own: module ID, shortened portfolio ID, a `StatusChip` for `activation_status`, owning department, and status-aware actions (`Promote` for `draft`, `Request override` for `active`, `Raise break-glass` when the mockup's own annotation calls out zero active department members — the exact Phase 3 task 6 deadlock condition). Filter pills default to "My departments," matching the same admin-sees-all/member-sees-own-department scoping as the list endpoint itself (Action Item 2).
- **Request Override, draft → confirm** — the two-step requirement rendered literally: a numbered step indicator, the justification pre-filled with realistic text and shown in a read-only review state before "Review request" is enabled, and a right-hand panel surfacing what happens next (second-attestation requirement, 72h override expiry) so the requester isn't guessing at consequences they can't see until after submitting.
- **My Requests** — the requester-facing lifecycle table (Action Item 6): pending override requests carry a `Withdraw` action (exceptions render read-only, per §B); decided ones show the visible provenance marker (Action Item 8) as a small ledger reference instead of a bare status word, so "this is backed by the tamper-evident chain" is legible from the row itself.
- **Researcher Dashboard discovery** — deliberately rendered in a distinct, cooler visual system (not ADR-011), with no action buttons at all — only "Open in Governor Portal" deep-links out, reinforcing Option C's tier boundary (Experience Tier reads, Orchestration Tier decides) at the pixel level, not just in the routing logic.

## Related ADRs
- [ADR-005: Federated Capability Ownership](ADR-005-federated-capability-ownership.md) — Action Item 7, the "working front door" this ADR finishes delivering; Action Item 6, the ledger discipline every new write here must extend, not bypass.
- [ADR-009: Unified Authentication Across Tiers](ADR-009-unified-authentication.md) — the auth/bearer-token relay this ADR's new page and forms consume as-is; also the reason Option B (write access from Next.js) was rejected rather than re-implemented.
- [ADR-011: Governor Portal Design System](ADR-011-governor-portal-design-system.md) — the component library (`GovernorCard`, `StatusChip`, `PillButton`, `JustificationBlock`, `ReviewerStrip`) the Capability Register and request forms are built from, not a new visual system.
- [ADR-008: Markdown to Styling](ADR-008-markdown-to-styling.md) — the Next.js tier's own styling decision, relevant to the read-only discovery view added here.
