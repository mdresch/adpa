# ADR 013: Capability Register Attestation Deadline and Drift-Reason Visibility

## 1. Status
**Proposed (2026-07-18) — revised 2026-07-18** after review: the history lookup in §3/§6 now filters on the transition's `new_status = 'pending_re_approval'` rather than simply taking the capability's latest `capability_activation_history` row. Verified against `promote_capability_status`'s current transition graph, the two queries return the same row for any capability whose status genuinely is `pending_re_approval` today — the procedure writes `activation_status` and its history row atomically, so no further row can be appended without also moving the capability off that status. The filtered version is still the correct one to build: it directly answers "why did this become pending re-approval" instead of relying on an invariant that holds by construction of today's code, not by any enforced constraint, and would stay correct even if that invariant later stopped holding.

**Revised again 2026-07-18**: scope broadened to also close a second, related read-path gap surfaced by the shipped PR7 discovery view (`app/capability-registry/page.tsx`) — every capability card identifies its portfolio by raw UUID, with no name anywhere in the response to show instead. Folded in here rather than given its own ADR because it's the same query, the same DTO, and the same two UI surfaces this ADR already touches; see §2/§3/§6's added bullets.

Deciders: Owner(s) of the Governor Portal (`orchestrator/Adpa.Web`) and the `capability_registry` domain ([ADR-005](ADR-005-federated-capability-ownership.md)).

## 2. Context

[ADR-005](ADR-005-federated-capability-ownership.md) Phase 3 already built and runs two independent mechanisms that can demote an `active` capability to `pending_re_approval`, both verified in code, not hypothetical:

- **Drift detection.** `capability_drift_trigger_fn()` (`server/migrations/435_module_activation_lifecycle.sql`), attached per-module via `attach_module_drift_trigger`/`module_drift_sources`, fires when a linked config/control table changes and calls `promote_capability_status(..., 'pending_re_approval', ..., 'drift detected on ' || TG_TABLE_NAME, ...)`. The reason string lands in `capability_activation_history.reason`.
- **Attestation lapse.** `capability_registry.attestation_due_at` (`server/migrations/433_capability_registry.sql`) is checked by a real, running hourly sweep (`server/src/jobs/capabilityAttestationJob.ts`, using the pure predicate in `server/src/modules/capabilityRegistry/attestationLapseCheck.ts`), which likewise demotes a lapsed `active` capability to `pending_re_approval`.

[ADR-012](ADR-012-capability-register-and-request-lifecycle.md) then built the Capability Register as the Governor Portal's first browsable read surface for this data (`Capabilities.razor`, `GET /api/v1/capability-registry`), and its own Consequences section named this exact follow-on without scoping it: *"The Capability Register becomes the natural home for capability-lifecycle features ADR-005 already modeled but never surfaced (drift/`pending-re-approval` visibility, attestation deadlines)."*

Verified against the current implementation, the gap is real but narrow:

- `Capabilities.razor` already renders `pending_re_approval` as its own `StatusChip` state ("Pending re-approval", distinct from `active`/`disabled`) — the *state* is visible today.
- `CapabilityRegistryRepository.listForUser` (the query behind `GET /api/v1/capability-registry`) selects only `id, module_id, portfolio_id, platform_operator, functional_owner_type, functional_owner_department, control_definition_owner_department, activation_status`. It does not select `attestation_due_at`, and nothing in the list path joins `capability_activation_history` for a reason.
- The practical consequence: a department member sees "Pending re-approval" on a card and has no way, from the Register itself, to tell whether that's config/control drift (something changed and needs re-review) or a routine lapsed attestation (a calendar-driven re-check) — the two have different implications for what the reviewer should go look at. And the Register only ever reflects state *after* a demotion has already happened; there is no visibility into an *approaching* attestation deadline that would let a department re-attest before the lapse fires at all.
- A second, related gap: `capability_registry.portfolio_id` is a `NOT NULL` FK to `portfolio_governance(id)` (`server/migrations/433_capability_registry.sql:9`), and `portfolio_governance.portfolio_name` (`server/migrations/000_baseline.sql:4155`) already exists as its human-readable name — but `listForUser` selects only `portfolio_id`, never joining for the name. Both existing consumers work around this differently, and neither well: `Capabilities.razor` truncates the raw UUID to 8 characters plus an ellipsis (`Shorten()`); the PR7 Researcher Dashboard discovery view (`app/capability-registry/page.tsx`) shows the full, untruncated UUID with no workaround at all — literally `Portfolio {capability.portfolioId}`. Neither surface can identify a portfolio by name today.

## 3. Decision

Extend the Capability Register's existing read path only — no new endpoint, no new background job, no schema change, since `attestation_due_at` and `capability_activation_history.reason` already exist and the attestation sweep already runs:

- `CapabilityRegistryRepository.listForUser` additionally selects `attestation_due_at`, and — only for rows currently in `pending_re_approval` — the `reason` of that row's most recent `capability_activation_history` entry **whose `new_status = 'pending_re_approval'`** (ordered by `changed_at DESC LIMIT 1`), joined per-row rather than fetched separately. Under `promote_capability_status`'s current transition graph, `activation_status` and `capability_activation_history` are always written atomically by the same call (`435_module_activation_lifecycle.sql`), so for a capability whose current status genuinely is `pending_re_approval`, its single latest history row and its latest row with `new_status = 'pending_re_approval'` are the same row today — there is no code path that inserts a further history row without also moving `activation_status` off `pending_re_approval`. The explicit `new_status` filter is nonetheless the correct query to write: it answers "why did this become pending re-approval" directly, rather than depending on an invariant (latest row always matches current status) that holds only because of how the procedure happens to be written, not because anything constrains it to. A future change to the transition graph, or any future write path that appends to `capability_activation_history` without matching `promote_capability_status`'s exact atomicity, would silently break the "latest row" version while leaving the `new_status`-filtered version correct. Bounding the lookup to `pending_re_approval` rows keeps the added cost proportional to how many capabilities are actually in that state, not the full register.
- `CapabilityRegistryController.listForUser` passes both fields through in the JSON response as `attestationDueAt` (nullable) and `pendingReApprovalReason` (nullable, only populated when `activationStatus === 'pending_re_approval'`).
- `Capabilities.razor`'s `CapabilityRegistryEntry` DTO gains the two matching fields. Each `GovernorCard` renders:
  - a small reason line under the `StatusChip` when `pendingReApprovalReason` is present, so "drift detected on X" and a lapsed-attestation demotion read differently at a glance instead of both collapsing to the same chip text;
  - an attestation badge when `attestationDueAt` is set: "Attestation due `<date>`" in neutral styling while more than 14 days out, and a warning-styled "Attestation overdue" / "Attestation due in `<n>` days" once inside that window — surfaced before the sweep demotes the capability, not only after.
- The same query additionally joins `portfolio_governance` (a plain `JOIN`, not `LEFT JOIN` — the FK is `NOT NULL` and always resolves, unlike the conditional attestation-reason lookup) to select `portfolio_name`, passed through as `portfolioName`. Both `Capabilities.razor` and the PR7 discovery view (`app/capability-registry/page.tsx`, plus its `CapabilityRegistryListItem` type in `lib/api.ts`) render the name in place of the identifier they show today — replacing `Shorten(item.PortfolioId)` in the former, and the raw, untruncated `capability.portfolioId` in the latter. The underlying `portfolioId` isn't removed from either DTO, only no longer what's *displayed*; nothing today depends on the UUID being visible on the card itself.

Fourteen days is a starting threshold, not a tuned constant; adjusting it later is a UI-only change with no data model impact.

## 4. Options Considered

### Option A: Status quo — leave `pending_re_approval` opaque
| Dimension | Assessment |
|---|---|
| Complexity | None |
| Cost | None upfront |
| Closes the gap ADR-012 flagged | No |

Cheapest, but leaves exactly the ambiguity described above: a reviewer can see *that* something needs re-approval but not *why*, and never sees a deadline coming before it lapses.

### Option B (Recommended): Extend the existing list DTO + `Capabilities.razor` cards only
| Dimension | Assessment |
|---|---|
| Complexity | Low — two existing columns/tables already populated, one bounded join, DTO fields, card rendering |
| Cost | No new endpoint, job, or migration |
| Closes the gap ADR-012 flagged | Yes, for the Register specifically |

Matches ADR-012's own read path exactly; nothing here is new infrastructure, only exposing data that already exists and is already being written by mechanisms ADR-005 shipped.

### Option C: Build proactive notifications (email/Slack) ahead of attestation deadlines
| Dimension | Assessment |
|---|---|
| Complexity | High — new delivery channel, scheduling, per-user preferences |
| Cost | Meaningful new subsystem |
| Closes the gap ADR-012 flagged | Over-delivers relative to the gap |

Rejected for this ADR: the identified gap is that the Register a department member already visits doesn't show information that already exists in Postgres — it is a visibility problem, not a missing-mechanism problem. A notification channel is a reasonable future ADR built on top of the same `attestation_due_at` column, not a prerequisite for closing this gap.

## 5. Consequences

### Positive
- Closes the specific follow-on ADR-012's Consequences section named but didn't scope, without inventing new mechanism — both data points already exist and are already correctly written.
- A reviewer can distinguish "this needs review because something changed" from "this needs a routine re-attestation" without leaving the Register.
- An approaching attestation deadline becomes visible before the hourly sweep acts on it, giving a department a chance to re-attest proactively instead of only reacting after demotion.
- Both Register surfaces identify a portfolio by name instead of a truncated or raw UUID — a readability fix that costs one join, since the data already exists in `portfolio_governance`.

### Negative
- `listForUser`'s query gets marginally heavier (a per-row bounded lookup against `capability_activation_history` for `pending_re_approval` rows only, plus one unconditional join to `portfolio_governance`) — acceptable at today's scale (~15 governed-features packets × active portfolio count, per ADR-012 §6 Item 3's own note), but worth watching if either count grows substantially.
- `capability_activation_history.reason` is free text written by whatever called `promote_capability_status` (the drift trigger, the attestation sweep, or a human's own justification on a manual transition) — legible today, but not a structured/categorized reason. This ADR surfaces the text as-is; making it structured (e.g. an enum plus optional detail) is a separate, unscoped improvement.
- The two consumers touched by the portfolio-name change (`Capabilities.razor`, `app/capability-registry/page.tsx`) sit in different tiers (Blazor, Next.js) with independent DTOs — both must be updated in the same PR or one surface silently regresses relative to the other while the underlying data is already available to it.

## 6. Action Items

Single PR, following the Governed Feature Loop (contract guard before implementation, registered under the existing `federated-capability-ownership` packet in `server/governed-features.manifest.json` — no manifest change needed, only a new test file under `server/src/__tests__/modules/federated-capability-ownership/`):

1. Extend `CapabilityRegistryRepository.listForUser` to select `attestation_due_at` and, for `pending_re_approval` rows, the `reason` of the most recent `capability_activation_history` row **filtered on `new_status = 'pending_re_approval'`** (not simply the latest row for the capability); join `portfolio_governance` to also select `portfolio_name`. Extend `CapabilityRegistryController.listForUser`'s response shape accordingly (`attestationDueAt`, `pendingReApprovalReason`, `portfolioName`).
2. Extend `Capabilities.razor`'s `CapabilityRegistryEntry` DTO and card rendering with the reason subline, the attestation badge (neutral beyond 14 days, warning-styled inside it), and `portfolioName` in place of the current `Shorten(item.PortfolioId)` display.
3. Extend `app/capability-registry/page.tsx`'s `CapabilityRegistryListItem` type (`lib/api.ts`) with `portfolioName`, and render it in place of the current raw, untruncated `capability.portfolioId`. This is the only Action Item touching the Next.js tier — the attestation badge and pending-re-approval reason stay Governor-Portal-only, matching this ADR's original scope; the portfolio name is a plain identifier shown on both surfaces today, so it's fixed on both.
4. Contract guard: a capability in `pending_re_approval` from a simulated drift demotion returns a `pendingReApprovalReason` containing "drift detected on"; one demoted by a simulated lapsed attestation returns a reason reflecting that path; a capability more than 14 days from `attestation_due_at` renders no warning state, one inside the window does, and one with a null `attestation_due_at` renders no badge at all; a capability with a synthetic later history row whose `new_status` is not `pending_re_approval` (e.g. seeded directly for the test, since `promote_capability_status` itself cannot produce this today) still returns the correct demotion reason, proving the query filters on `new_status` rather than trusting recency alone; every returned row's `portfolioName` matches its `portfolio_id`'s seeded `portfolio_governance.portfolio_name`.

## 7. References
- Drift trigger and `pending_re_approval` transition: `server/migrations/435_module_activation_lifecycle.sql` (`capability_drift_trigger_fn`, `attach_module_drift_trigger`, `module_drift_sources`, `promote_capability_status`)
- Attestation deadline column: `server/migrations/433_capability_registry.sql` (`attestation_due_at`, and `portfolio_id`'s `NOT NULL REFERENCES portfolio_governance(id)`)
- Portfolio name column: `server/migrations/000_baseline.sql:4155` (`portfolio_governance.portfolio_name`)
- The running sweep and its pure predicate: `server/src/jobs/capabilityAttestationJob.ts`, `server/src/modules/capabilityRegistry/attestationLapseCheck.ts`
- The existing list path this ADR extends: `server/src/modules/capabilityRegistry/CapabilityRegistryRepository.ts` (`listForUser`), `CapabilityRegistryController.ts` (`listForUser`)
- The card rendering this ADR extends: `orchestrator/Adpa.Web/Components/Pages/Capabilities.razor`
- The PR7 discovery view and its type this ADR also extends: `app/capability-registry/page.tsx`, `CapabilityRegistryListItem` in `lib/api.ts`
- The orchestrator's list relay confirmed to be a raw-body passthrough, requiring no C# model change for the new fields: `RelayList` in `orchestrator/Adpa.Orchestrator/Controllers/CapabilityController.cs`

## Related ADRs
- [ADR-005: Federated Capability Ownership](ADR-005-federated-capability-ownership.md) — Phase 3 Action Item 4, the source of both the drift mechanism and the attestation deadline this ADR surfaces; neither is rebuilt here, only exposed.
- [ADR-012: Capability Register and Request-Creation Lifecycle](ADR-012-capability-register-and-request-lifecycle.md) — built the Register read surface this ADR extends, and is the origin of the gap this ADR closes (its own Consequences section named it without scoping it).
