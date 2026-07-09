# Federated Capability Ownership — Implementation Plan

Implements [ADR-005: Federated Capability Ownership for Module Activation](../07-architecture/ADR-005-federated-capability-ownership.md) (Option C). Eight phases below map 1:1 to the ADR's Action Items 1–8.

**Naming note**: the ADR refers to concepts in camelCase (`platformOperator`, `functionalOwner`, `controlDefinitionOwner`) since it's describing the architectural property, not an implementation. This plan's SQL uses snake_case (`platform_operator`, `functional_owner_department`) per normal Postgres convention; API/JSON payloads and Firebase claims should map these to camelCase (`functionalOwnerDepartment`, `departments`) at the serialization boundary. Same concepts, different naming conventions per layer — not a discrepancy.

This spans two independently built/deployed tiers with two different validation gates. Phases 0, 1, 4 (Node/Postgres) go through the Governed Feature Loop (Contract Guards before implementation, `SKILL.md`, registration in `server/governed-features.manifest.json`). Phases 2, 3, 6, 7 (the .NET orchestrator / Blazor Governor Portal) go through the AEV workflow instead (`dotnet build -c Release`, orchestration boot success, governance-invariant check), since the Jest-based governed-feature loop doesn't cover `orchestrator/`. Phase 5 straddles both — the schema change is Node-side, but it protects orchestrator-owned data, so it needs sign-off from both gates.

Proposed packet for the Node-side pieces:
```json
{
  "id": "federated-capability-ownership",
  "description": "Department-scoped ownership registry and activation gating for governed modules",
  "skills": ["adpa-federated-capability-ownership"],
  "spec": "docs/07-architecture/ADR-005-federated-capability-ownership.md",
  "testPathPattern": "capabilityOwnership|moduleActivation"
}
```

---

## Cross-tier identity mechanism (resolved, not an open decision)

`TaskApprovalGate` and `RitualController` live in the .NET orchestrator, which authenticates purely via Firebase-issued JWT validation — confirmed at `orchestrator/Adpa.Orchestrator/Program.cs:39-49` (`Authority = https://securetoken.google.com/{firebaseProjectId}`). There is no local user/account table in the orchestrator and no DB-backed identity lookup at all; the RPAS governance module's only identity mechanism today is the JWT itself.

This settles what was going to be an open question: **department must travel as a Firebase custom claim, not a Postgres column the orchestrator reads directly.** Concretely:

- **Node side is still the source of truth.** `user_departments` (Phase 0) is a real Postgres table — it's what the Governor Portal queries for approval-queue membership, what Phase 0's seed/backfill operates on, and what the "deputy" override concept (see Open Questions) is expressed against.
- **Firebase custom claims are the sync target, not a replacement.** Whenever a `user_departments` row changes, the Node auth layer calls `admin.auth().setCustomUserClaims(uid, { departments: [...] })` so the department travels inside the ID token the orchestrator already validates — no new orchestrator-side DB coupling, no new service call, no new failure mode on the approval path.
- **Caveat, not a blocker**: Firebase ID tokens are short-lived and refreshed automatically by client SDKs, so a department change takes effect on next token refresh, not instantly. Acceptable for this use case (department reassignment isn't an emergency-latency operation); worth a one-line note in the `SKILL.md` so a future agent doesn't treat it as a bug.
- **The orchestrator's job is just to read the claim**, not resolve it. `TaskApprovalGate` extends to read `departments` off `HttpContext.User.Claims` — the same trust boundary Firebase JWT validation already establishes for everything else in `Program.cs`.

---

## Phase 0 (Action Item 1): Identity extension — `user_departments` + Firebase claim sync

**Objective**: Give ADPA identity a department/accountable-role attribute. Nothing today plays this role — `resource_capacity_settings.department` and `stakeholders.department` are free-text, per-record fields (`server/migrations/000_baseline.sql:5853,7230`), not identity.

**Shape decision**: many-to-many with a role column, not a single flat string — a user can be a `member` of Compliance and a `deputy` for Legal simultaneously, and the override-deadlock question (Open Questions §1) needs a deputy concept expressible in the schema.

**Tasks**:
1. Migration `server/migrations/431_user_departments.sql` (`430_add_portfolio_prioritization_tables.sql` / `430_fix_numeric_score_truncation.sql` are the current highest) — create the `departments` reference table **here**, not deferred to Phase 7, and FK both `user_departments.department` and (later) `capability_registry.functional_owner_department` against it. Without a shared constraint from the start, a typo (`'Complience'`) in `user_departments` would sync cleanly to a Firebase claim and only fail silently much later at gate-validation or the Phase 7 FK — domain integrity needs to exist where the string is first captured, not three phases downstream:
   ```sql
   CREATE TABLE IF NOT EXISTS public.departments (
     code varchar(50) PRIMARY KEY -- 'IT' | 'Compliance' | 'Legal' | 'Finance' | 'HR' | 'Risk'
   );
   INSERT INTO public.departments (code) VALUES ('IT'),('Compliance'),('Legal'),('Finance'),('HR'),('Risk')
     ON CONFLICT (code) DO NOTHING;

   CREATE TABLE IF NOT EXISTS public.user_departments (
     id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
     user_id uuid NOT NULL REFERENCES public.users(id),
     department varchar(50) NOT NULL REFERENCES public.departments(code),
     department_role varchar(20) DEFAULT 'member', -- 'member' | 'deputy' | 'head'
     is_active boolean DEFAULT true,
     created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
     UNIQUE (user_id, department)
   );
   CREATE INDEX IF NOT EXISTS idx_user_departments_department ON public.user_departments(department) WHERE is_active;
   ```
2. Node service: on insert/update/deactivate of a `user_departments` row, recompute the claim payload from active rows only (`WHERE is_active = true`) and call Firebase Admin SDK `setCustomUserClaims(uid, { departments: [...] })` — never include deactivated rows, both for the 1000-byte custom-claims size cap and because an inactive row is exactly the membership that must stop being trusted. On removal specifically (a row transitioning to `is_active = false`, not on add/update) additionally call `admin.auth().revokeRefreshTokens(uid)` — token refresh isn't guaranteed on any particular schedule, and someone just removed from a department (mid-investigation, offboarded for cause) shouldn't be able to hold a live approval credential until their existing token happens to expire. **This DB write + external Firebase API call is a classic dual-write**: if the DB commit succeeds but the Firebase call fails (rate limit, timeout, credential issue), the two systems silently and permanently diverge, since nothing else re-checks the claim later. Don't call Firebase inline — persist a `sync_claims_job` row transactionally with the `user_departments` write, and process it via a background worker (matching the Bull job pattern used elsewhere in this plan) with retries, marking the job complete only on a successful Firebase response.
3. Approval/override endpoints specifically (not general API traffic) must not trust the JWT's claims alone for revocation: `revokeRefreshTokens` only blocks issuing a *new* ID token — an already-issued ID token remains valid up to its normal expiry (up to ~1h) regardless of revocation, since standard stateless JWT bearer validation (what `Program.cs` does today) never checks a revocation status. For `TaskApprovalGate` specifically, verify the token's `iat` claim against the user's `tokensValidAfterTime` (fetched via the Firebase Auth Admin REST API using a service account — there's no official Firebase Admin SDK for .NET, so this is a small custom call, not a config flag) before accepting an approval or override. This trades a network hop for real enforcement, but only on this specific high-value action, not on every request. This outbound call needs its own failure handling, consistent with Phase 2 task 3's default-deny principle rather than left as an implementation-time judgment call: a short timeout (3–5s) so a degraded Firebase Admin API can't hang the orchestrator, and a failed/timed-out check must **fail closed** (treated as deny, same as a missing attestation) — the entire point of this check is defeated if its own unavailability becomes a way to let a revoked credential through.
4. Contract guard: table shape/constraint tests (including the `departments` FK rejecting an invalid code), a test asserting the claims-sync path enqueues a job rather than calling Firebase inline, a test asserting the sync worker retries on failure and only marks the job complete on success, and a test asserting removal triggers `revokeRefreshTokens` while add/update do not (mock the Firebase Admin calls, don't hit real Firebase in CI).

---

## Phase 1 (Action Item 2): Capability ownership registry

**Objective**: Give every governed module three declared owners, as a runtime-queryable, constraint-enforceable table — not the static `governed-features.manifest.json`, which is a build-time file with no way to enforce a `NOT NULL` FK at activation time (that's Phase 7's job).

**Scoping decision needed** (flag to ADR owner, don't decide in code): is activation global per-deployment, or per-tenant? `public.users` already carries `company_id`/`tenant_id` (`server/migrations/000_baseline.sql:8290-8291`), meaning ADPA is multi-tenant-capable. If activation is per-tenant, `capability_registry` needs a `tenant_id` column and the uniqueness constraint becomes `(module_id, tenant_id)` instead of `(module_id)` — this changes Phase 3's stored procedures materially, so it needs answering before Phase 1 ships, not after.

**Tasks** (assuming per-deployment scope below; revise if per-tenant is chosen):
1. Migration `server/migrations/432_capability_registry.sql`:
   ```sql
   CREATE TABLE IF NOT EXISTS public.capability_registry (
     id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
     module_id varchar(100) NOT NULL UNIQUE, -- matches governed-features.manifest.json "id" where applicable
     platform_operator varchar(50) DEFAULT 'IT' NOT NULL,
     functional_owner_type varchar(20) DEFAULT 'department' NOT NULL, -- reserved for future non-department owner types (committee, role); unused in logic today
     functional_owner_department varchar(50), -- nullable until Phase 7's NOT NULL/FK lands
     control_definition_owner_department varchar(50),
     functional_owner_assigned_at timestamptz,
     attestation_due_at timestamptz, -- lapsed attestation triggers pending-re-approval, see Phase 3 task 5
     created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
     updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
   );
   ```
2. `functional_owner_type` is a cheap forward-compatibility hedge (raised in external ADR review), not the full "accountability group" abstraction from Open Question §7 — it costs nothing today (every row is `'department'`, nothing branches on it) but avoids a schema migration later if a genuine cross-functional-ownership case shows up.
3. Seed one row per existing governed-features packet (`rag`, `doc-gen`, `compliance`, `ip-governance`, `knowledge-graph`, ...) with owner columns NULL — which department actually owns `compliance` is a business decision, not something to guess in a migration.
4. Attestation cadence (e.g. quarterly) is a business decision, not a hardcoded constant — expose it as configuration, not a migration literal.
5. Extend `verify:governed-features` (`server/scripts/run-governed-features.mjs` or its check layer) to fail if any `governed-features.manifest.json` packet has no corresponding `capability_registry` row, or vice versa — otherwise a new module can ship with a valid manifest entry (satisfying CI) but no registry row, meaning it never enters this lifecycle at all and runs permanently ungated. This is the mechanism that keeps the two registries from drifting apart as new modules ship after the initial seed in task 3.
6. Contract guard: table shape, uniqueness on `module_id`.

---

## Phase 2 (Action Item 3): Department-aware `TaskApprovalGate`

**Objective**: Stop accepting `DecidedBy` as an arbitrary string.

**Tasks** (`.NET`, AEV workflow):
1. Extend `TaskApprovalAttestation` (`orchestrator/Adpa.Orchestrator/Services/TaskApprovalGate.cs:16-116`) to read `departments` off the caller's validated JWT claims (per the resolved mechanism above) rather than trusting a caller-supplied string. Also apply the `iat`-vs-`tokensValidAfterTime` revocation check from Phase 0 task 3 here — this is the specific endpoint it protects.
2. `TaskApprovalGate` validates: the caller's claimed department == the target module's `functional_owner_department` (`capability_registry`, joined by whatever the ritual maps to a `module_id`).
3. Default-deny: if `functional_owner_department` is NULL (not yet populated, Phase 1 task 2) or the claim doesn't match, gate returns 400 — same shape as today's missing-attestation case.
4. Override path: a second attestation from a distinct user whose claimed department/role matches `functional_owner_department` (`member`/`deputy`/`head` per Phase 0), plus a `Justification` field, persisted the way `RtmAmendment.DecisionNotes` already persists reasoning (`orchestrator/Adpa.Orchestrator/Models/Rituals/RtmAmendment.cs:49-56`). The resulting `active` transition is not permanent on the strength of the override alone: it carries an `override_expires_at` (Phase 3 schema), after which it auto-reverts to `pending-re-approval` unless a normal, non-override approval has since replaced it. This bounds the override's effect; it is not a fix for ordinary approval latency, which still needs the SLA/escalation path in Open Question §1.
5. `dotnet build -c Release`; verify orchestration boot succeeds (AEV workflow).

---

## Phase 3 (Action Item 4): Module activation lifecycle

**Objective**: draft → pending-department-approval → active → disabled, re-firing on drift, modeled on `template-lifecycle`'s stored-procedure pattern (`server/migrations/000_baseline.sql:11336-11410`).

**Tasks**:
1. Migration `server/migrations/433_module_activation_lifecycle.sql`:
   ```sql
   ALTER TABLE public.capability_registry
     ADD COLUMN IF NOT EXISTS activation_status varchar(30) DEFAULT 'draft' NOT NULL;
     -- draft | pending_department_approval | active | pending_re_approval | disabled

   CREATE TABLE IF NOT EXISTS public.capability_activation_history (
     id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
     capability_id uuid NOT NULL REFERENCES public.capability_registry(id),
     old_status varchar(30), new_status varchar(30) NOT NULL,
     changed_by uuid REFERENCES public.users(id),
     reason text,
     draco_verdict_id uuid,
     is_override boolean DEFAULT false,
     override_expires_at timestamptz, -- set only when is_override; NULL for normal approvals
     warned_24h_at timestamptz, -- idempotency markers for Phase 3 task 5's pre-expiry warnings, not re-derivable from override_expires_at alone
     warned_12h_at timestamptz,
     config_snapshot_hash text, -- content hash of the module's config/control data at time of this transition, see Phase 5 task 3
     changed_at timestamptz DEFAULT CURRENT_TIMESTAMP
   );
   ```
2. Stored procedure `promote_capability_status(capability_id, new_status, changed_by, reason, draco_verdict_id)` — the only permitted writer of `activation_status`; revoke direct `UPDATE` on that column from the application DB role, matching `template_status_history`'s lockdown.
3. Drift trigger: an `AFTER UPDATE` trigger on each module's linked config/control table calls `promote_capability_status(..., 'pending_re_approval', ...)` automatically — not application code, so a new code path can't forget to fire it, and a trigger fires regardless of the calling role's privilege level, which is a genuinely stronger guarantee than an application-layer check would give. Which tables count as "linked" per module is resolved concretely, not left implicit: add `module_drift_sources(module_id, table_name, monitored_columns text[])`, a metadata-driven mapping the trigger reads rather than a hardcoded per-module trigger body, which also gives Phase 5 task 3's content-hash check an explicit list of what to hash. **Recursion risk**: if the approval process itself writes back to the watched table (e.g. an `approved_at`/`last_approved_by` column on the config row), a naive `AFTER UPDATE` trigger re-fires on that write and immediately re-flips the module back to `pending_re_approval` right after approving it. Guard the trigger with a `WHEN` clause comparing only `monitored_columns` (e.g. `WHEN (OLD.config_payload IS DISTINCT FROM NEW.config_payload)`), explicitly excluding metadata columns, so approval bookkeeping writes don't self-trigger. **Shared-table storm**: if multiple modules' `monitored_columns` point at the same shared reference table (e.g. a global policy/threshold table), one change can legitimately re-open several modules' approvals simultaneously — that may be the *correct* behavior (their approved configuration did just change), but it should be visible and alertable, not a silent mass event; surface "N modules re-opened by one change" the same way other governance anomalies surface elsewhere in this codebase, rather than treating it as N independent, unrelated transitions. Residual gap: a superuser or migration script can still run `ALTER TABLE ... DISABLE TRIGGER` before a "one-time data fix" and silently skip drift detection — add a migration-review convention (or an automated CI check) that flags any migration touching trigger-enable status on `capability_registry` or its linked tables, since this is the one bypass path that doesn't require touching the stored procedure at all.
4. Contract guard: status transitions only succeed via the stored procedure; a direct `UPDATE capability_registry SET activation_status = 'active'` is rejected by DB permissions in a test against a real Postgres test DB.
5. Scheduled job (Bull, matching existing job patterns in `server/src/jobs/`) that finds `capability_registry` rows where `attestation_due_at < now()` and calls `promote_capability_status(..., 'pending_re_approval', ...)` for each — the same enforced path as any other drift transition, not a special case. The same job also finds `active` modules whose latest `capability_activation_history` row has `is_override = true` and `override_expires_at < now()` with no subsequent normal-approval row, and reverts those to `pending_re_approval` too. Silently flipping a live, production-active module back to `pending_re_approval` the moment an override expires risks a self-inflicted outage (blocked document generation, blocked compliance flows) with no warning — dispatch a notification at 24h and 12h before `override_expires_at` to the module's `functionalOwner` department, not only at the moment of reversion. Track `warned_24h_at`/`warned_12h_at` timestamps on the relevant `capability_activation_history` row so a job that runs more frequently than the warning cadence (e.g. hourly) doesn't re-send the same warning on every tick it finds the override still inside that window — the dispatch must be idempotent, not just correctly timed.

---

## Phase 4 (Action Item 5): DRACO wiring

**Objective**: DRACO board review required, not just displayed, before activation.

**Tasks** (Node, governed-feature-loop applies):
1. When `activation_status` transitions to `pending_department_approval`, enqueue a DRACO board review (`server/src/services/dracoService.ts`) scoped to the module's config/control artifact.
2. `promote_capability_status`'s transition to `active` requires a non-null `draco_verdict_id` referencing a completed review — enforced in the procedure, not just application code.
3. **Confirmed against `server/src/services/dracoVerdictEngine.ts:184-190,349-358`: DRACO returns three verdicts, not two — `PASS`, `CONDITIONAL_PASS`, `REJECT`.** `CONDITIONAL_PASS` sets `advisable_to_publish: true` but carries `conditions_for_approval` (specific unresolved findings) — this is not a clean pass. The stored procedure must require the Phase 2 override fields (second `functionalOwner`-department attestation + justification) for **any verdict other than a clean `PASS`** — `CONDITIONAL_PASS` included, not only `REJECT`. As originally scoped (REJECT-only), a `CONDITIONAL_PASS` with unresolved findings would silently qualify for ordinary single-approval, which is exactly the loophole this task exists to close. This resolves Open Question §2 outright rather than leaving it open — it was a real gap in the original scoping, confirmed against running code, not a hypothetical.
4. The attestation record must include, per individual DRACO finding, whether it was accepted or is being overridden with justification — referencing the aggregate verdict ID (task 2) is necessary but not sufficient; a single free-text note against the whole verdict is still coarse enough to rubber-stamp. Group findings by risk/control category for the primary decision, with per-finding drill-down available, so this doesn't degrade into a wall of checkboxes that gets clicked through as fast as the single verdict ID would have been.
5. Contract guard: activation with no verdict fails; activation with a `REJECT` **or `CONDITIONAL_PASS`** verdict and no override fails; activation with either verdict plus valid override succeeds and records both; an attestation missing per-finding acknowledgment fails validation even with a valid verdict ID present.

---

## Phase 5 (Action Item 6): Hash-chain `governance_ledger`

**Objective**: Tamper-evidence for the orchestrator's ledger, matching `audit_log`'s existing pattern (`server/migrations/000_baseline.sql:566-567`, `11437-11460`).

**Tasks**:
1. EF Core migration adding `prev_hash`/`hash` to `governance_ledger` (`orchestrator/Adpa.Orchestrator/Migrations/`), computed the same way `audit_log_before_insert()` does (SHA-256 over row content + prior hash) — as a Postgres trigger if the orchestrator's DB permissions support it, or as `SaveChanges` interception in EF Core otherwise.
2. Revoke direct `INSERT`/`UPDATE` privileges on `governance_ledger` and `capability_activation_history` from the application DB role, the same way Phase 3 locks down `activation_status` — a one-time grep for existing direct writes outside the stored procedures / EF Core service layer is a useful starting sanity check, but only a standing privilege revocation stops next month's PR from quietly adding a new bypass that a point-in-time grep will never see. Hash-chaining proves integrity of what's recorded, not completeness of what gets recorded — the privilege revocation, not the audit, is what actually closes that gap.
3. Independent detective control, not a substitute for task 2: a periodic reconciliation job comparing live `capability_registry.activation_status` against `capability_activation_history`'s recorded transitions, flagging any active module with no corresponding activation record or any config change with no matching drift-triggered entry. Prevention (task 2) and detection (this task) are deliberately redundant — a permission model can have a hole neither of us has thought of yet; the reconciliation job is what catches it in practice instead of in theory. Presence of a matching ledger row is necessary but not sufficient: also recompute a content hash of each active module's current config/control data and compare against `config_snapshot_hash` recorded at its last approval (Phase 3 schema) — this catches drift that reaches production without tripping the trigger (a bug, a direct restore, a replication edge case), which a presence-only check would miss entirely.
4. The reconciliation job needs its own liveness monitoring — a detective control that silently stops running decays exactly the way an unmaintained registry or lapsed attestation does, just less visibly, since nothing else depends on its output to notice. Add an alert if the job hasn't completed successfully within, say, 2x its scheduled interval.

---

## Phase 6 (Action Item 7): Governor Portal UI

**Objective**: Make the Governor Portal's dead buttons real.

**Tasks** (`.razor`, AEV workflow):
1. `Ledger.razor` / `RPASGovernanceCenter.razor`: wire `@onclick` on "Approve"/"Review"/"View Audit" to the Phase 2 endpoints, replacing today's no-op buttons.
2. New `ApprovalQueue.razor` (or extend `RPASGovernanceCenter.razor`): list `capability_registry` rows in `pending_department_approval`/`pending_re_approval`, scoped to the logged-in user's department(s) from their JWT claims.
3. Surface the Phase 4 DRACO verdict inline, and make the approve action require the verdict panel to have been expanded/viewed before it enables — otherwise "required field" (Phase 4) degrades back to "displayed but ignorable" at the UI layer.

---

## Phase 7 (Action Item 8): Enforce partial-delivery lockout

**Objective**: Make it structurally impossible for activation to succeed before Phases 0–2 exist — not documented as forbidden, enforced.

**Tasks**:
1. `ALTER TABLE public.capability_registry ALTER COLUMN functional_owner_department SET NOT NULL` — deferred until Phase 1 task 2's seed data is populated for every module; if it isn't, this migration fails outright, which is itself a useful forcing function rather than a problem to work around.
2. Add a foreign key from `functional_owner_department` to the `departments` reference table (created in Phase 0, not here — domain integrity for "what's a valid department" needs to exist from the point the string is first captured, not deferred to this phase) rather than leaving it free text — `NOT NULL` alone doesn't stop a placeholder value from satisfying the constraint while Phase 2's actual validation logic is still unbuilt; the FK at least forces it to be a real department.
3. `promote_capability_status`'s transition to `pending_department_approval`/`active` additionally requires the resolved department to have at least one active `user_departments` row — a department with no members can't be the target of an approval nobody can ever provide, which would otherwise be a silent deadlock distinct from the emergency-override deadlock in Open Question §1. Note this only guarantees the *normal* approval path is satisfiable (needs one member); the *override* path (Phase 2 task 4) needs two distinct active members and has no equivalent guard here — a department with exactly one active member can receive normal approvals but can structurally never invoke an override, regardless of availability. This is sharper than Open Question §1's "unreachable department" framing: it's a permanent structural impossibility, not a transient availability problem. Add the equivalent check: block `pending_department_approval`/`active` transitions requiring override for a department with fewer than two active members, or route to escalation instead of silently stalling.
4. Portal: surface capabilities where `functional_owner_department` is NULL as a distinct "ownership not yet assigned" state, visually separate from "pending approval" — operator clarity, not the enforcement mechanism (tasks 1–3 are).

---

## Sequencing note

Phase 0 must land before Phase 2 (nothing to check without it) and before Phase 7's FK (nothing to reference). Phase 1 can land in parallel with Phase 0 — additive, no cross-dependency — but Phase 7's `NOT NULL` can't land until Phase 1's seed data is complete for every module. Phase 3 depends on Phase 1 (`capability_registry` must exist) and Phase 2 (the gate it plugs into). Phase 4 depends on Phase 3 (needs the `pending_department_approval` transition to trigger from). Phase 5 is independent and can land anytime. Phase 6 depends on Phases 2–4 (nothing to call otherwise). Phase 7 is last by construction — it's the constraint that makes early/partial delivery of everything else harmless instead of misleading.

## Open questions (carried from ADR review — refine during implementation, not blockers to starting Phase 0)

1. **Override deadlock — still open, now with a concrete candidate answer**: (a) *transient* — an entire department is temporarily unreachable (holiday, outage); Phase 0's `deputy`/`head` roles partially address this. (b) *structural, permanent* — a department with fewer than two active members can never satisfy the 2-distinct-approver override requirement, regardless of availability (see Phase 7 task 3's note). A third-round reviewer proposed a concrete resolution for both: designate a standing, cross-department "break-glass" body (e.g. an Executive Governance Committee or Risk Officers group) that can supply the second signature for *any* department's override, rather than requiring the second signer to come from the same department or leaving it as "any two departments" ad hoc. This is a specific, well-reasoned instantiation of the break-glass idea already named here, not a new mechanism — more auditable than "any two departments," since the fallback body is fixed and known in advance. Still requires a business decision (who sits on that committee, and whether that itself creates a standing bypass risk worth its own scrutiny) before Phase 2's override path is finalized.
2. **Resolved — DRACO verdict granularity**: confirmed against `dracoVerdictEngine.ts:184-190,349-358` that DRACO returns `PASS`/`CONDITIONAL_PASS`/`REJECT`, not a binary. Fixed in Phase 4 task 3 — both `CONDITIONAL_PASS` and `REJECT` now require the override path; the original REJECT-only scoping was a confirmed gap, not a hypothetical.
3. **Resolved — scope of "linked control definition"**: Phase 3 now specifies a `module_drift_sources(module_id, table_name, monitored_columns)` mapping table instead of leaving this implicit, plus a `WHEN`-clause guard preventing the approval process's own writes from re-triggering the drift trigger (a real recursion risk a hardcoded, ungated trigger would have hit), and a note that a shared-reference-table change re-opening multiple modules at once should be surfaced as a visible event, not silently absorbed as N unrelated transitions.
4. **NOT NULL is a backstop, not the validator**: Phase 7's FK stops the state machine from being usable before Phases 0–1 land, but Phase 2's runtime check is still what makes the gate meaningful once the constraint is satisfiable. Confirm in code review that no path treats "FK resolves to a valid department" as equivalent to "the requesting user is actually a member of that department" — the latter is a materially stronger check than the former.
5. **`user_departments` tenant scoping**: if Phase 1's multi-tenancy question resolves to per-tenant activation, confirm whether `user_departments` also needs a `tenant_id`/`company_id` scope. Concrete failure scenario if this is skipped: a Compliance Officer at Company A could approve a module activation for Company B, since nothing today ties department membership to a tenant. Likely unnecessary if a user belongs to exactly one company via `users.company_id`, but worth confirming explicitly alongside that decision rather than assuming it falls out for free.
6. **Resolved (partially) — provisional/time-boxed activation**: a second-round reviewer reframed this as "same 2 functionalOwner-member approvers, same justification, plus an expiry timestamp." Adopted in that form (Phase 2 task 4, Phase 3 schema's `override_expires_at`) — but this does not solve ordinary approval latency, since the override still requires the same department's involvement, just two members instead of one. It bounds how long an override-granted activation can substitute for a normal approval, nothing more. The actual latency/availability problem — a department slow or entirely unreachable — is still Open Question §1's SLA/escalation path, unresolved and requiring its own policy decision.
7. **"Accountability group" abstraction over raw department strings** (raised in external ADR review): generalizing `functionalOwner`/`department` into a first-class group entity (type: department/role/committee, with members and an escalation path) would handle matrix organizations, shared compliance/legal functions, and external advisors more gracefully than a flat department enum. No concrete ADPA requirement is driving this yet, and the repo's own engineering principle is not to design for hypothetical future requirements. A minimal, no-cost hedge is taken in Phase 1 (`functional_owner_type` column, defaulted and unused today) so this remains cheap to grow into later without a schema migration — but the full abstraction (group membership, escalation path) is not being built now.
