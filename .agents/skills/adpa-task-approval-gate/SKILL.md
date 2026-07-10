---
name: adpa-task-approval-gate
description: Department-aware TaskApprovalGate in the .NET orchestrator (ADR-005 Phase 2) — validates that the authenticated caller is an active member of the target module's functional owner department for the correct portfolio, not just that DecidedBy is a non-empty string. Load when touching TaskApprovalGate.cs, RitualController's approval endpoints, or CapabilityRegistryClient.
---

# ADPA Task Approval Gate

## Purpose

`TaskApprovalGate.EnsureJitApproval` is the only real approval gate in the orchestrator, protecting `phase0/approve` and `rtm/apply-amendment`. Before Phase 2 it only checked that `DecidedBy`/`HumanDecisionId` were non-empty strings — anyone could type any name. Phase 2 adds a genuine check: the caller's own JWT `departments` claim must contain an active membership matching the target module's `capability_registry.functionalOwnerDepartment`, scoped to the correct `portfolio_id` (department name alone is not sufficient — a department can exist identically-named across multiple portfolios). See [the implementation plan's Phase 2 section](../../../docs/implementation/FEDERATED_CAPABILITY_OWNERSHIP_IMPLEMENTATION_PLAN.md#phase-2-action-item-3-department-aware-taskapprovalgate) for the resolved design gaps this packet closed.

This is `.NET` orchestrator work validated via the **AEV workflow** (`dotnet build -c Release`, orchestration boot, governance-invariant check) — not the Jest-based governed-feature loop, which doesn't cover `orchestrator/`. Depends on Phase 0 (`departments` claim shape) and Phase 1 (`capability_registry` row shape); see `adpa-federated-capability-ownership` and `adpa-capability-registry`.

## Invariants

- Must always: read the caller's department membership from the validated JWT's `departments` claim (`DepartmentClaimsReader.Read`), never from `approval.DecidedBy` — that field is a display label persisted alongside the decision, not a security check.
- Must always: match **both** `portfolioId` and `department` (`DepartmentClaimsReader.HasMatchingMembership`) — never department name alone. A department can exist identically-named across multiple portfolios; matching name alone would let a Compliance member at Portfolio A approve a module owned by Compliance at Portfolio B.
- Must always: default-deny when `capability_registry` has no row for `(moduleId, portfolioId)`, or a row exists but `functionalOwnerDepartment` is null (ownership not yet assigned — Phase 1 task 3 is a business decision, never guessed). Same response shape as the pre-existing missing-attestation case.
- Must always: fail closed on a `CapabilityRegistryClient` lookup failure (timeout, 5xx, network error) — catch and deny, never let an unavailable lookup silently skip the check. The `HttpClient` has a 5s timeout so a degraded Node backend can't hang the approval endpoint.
- Must always: keep this check *additive* to the pre-existing JIT mechanics (scope match, taskId match, expiry window) — those still run first and unchanged; the department check is the last gate before success.
- Must always: run `TaskApprovalGate.ValidateConfigurationAtStartup` fail-fast when `Governance:ApprovalsEnforced=true` and `Governance:PortfolioId` is unset — don't let a missing portfolio scope surface only on the first real approval request.
- Must never: add `[Authorize]` to `phase0/approve`/`rtm/apply-amendment` as a way to enforce authentication. `Governance:ApprovalsEnforced=false` (today's Aspire local-dev default) is meant to bypass JIT approval entirely via `EnsureJitApproval`'s own early-return; `[Authorize]` runs in ASP.NET Core middleware *before* that return, so it would break the dev-bypass regardless of the flag. The department check is fail-closed by construction instead — an unauthenticated caller has no `departments` claim and is denied the same way any non-member is.
- Must never: treat `module_id` as anything other than the existing `TaskApprovalScopes` string (`phase0.approve` / `rtm.apply_amendment`) and `portfolio_id` as anything other than the single configured `Governance:PortfolioId` — `BusinessCase`/`RtmAmendment` carry no per-object portfolio scoping today (see the plan's Phase 2 resolution notes); don't invent per-object scoping without re-confirming that assumption still holds.
- Must never: query `capability_registry` directly from the orchestrator's `GovernanceDbContext` — it is a physically separate Postgres database (Aspire-provisioned `governance-ledger`) from Node's `adpa`/`adpa_test`. Always go through `CapabilityRegistryClient`.

## Interaction Rules

- Depends on: `adpa-federated-capability-ownership` (Phase 0 — the `departments` claim shape `DepartmentClaimsReader` parses) and `adpa-capability-registry` (Phase 1 — the `capability_registry` row shape `CapabilityRegistryClient` consumes, and the Node-side lookup endpoint itself).
- Must not break the pre-existing JIT approval checks (scope, taskId, humanDecisionId/decidedBy presence, expiry window) — Phase 2 only adds a check, it doesn't remove or reorder the existing ones.
- Deferred, not yet built: task 3's `iat`-vs-`tokensValidAfterTime` revocation check (needs Firebase Admin service-account credentials not yet provisioned) and task 4's override path (needs Phase 3's `capability_activation_history.override_expires_at` schema). Both are noted explicitly in the implementation plan, not silently dropped.

## Key Files

| File | Role |
|------|------|
| `orchestrator/Adpa.Orchestrator/Services/TaskApprovalGate.cs` | `EnsureJitApproval` — now `async`, takes a `ClaimsPrincipal user`; department/portfolio check runs after the pre-existing JIT checks |
| `orchestrator/Adpa.Orchestrator/Services/DepartmentClaimsReader.cs` | Parses the `departments` JWT claim; `HasMatchingMembership` — both portfolioId and department must match |
| `orchestrator/Adpa.Orchestrator/Models/Governance/DepartmentClaim.cs` | `{PortfolioId, Department, Role}` — mirrors Node's `buildDepartmentClaims()` output shape |
| `orchestrator/Adpa.Orchestrator/Clients/CapabilityRegistryClient.cs` | Typed HttpClient calling Node's `GET /api/v1/capability-registry/:moduleId/:portfolioId`; 5s timeout, fail-closed on any error |
| `orchestrator/Adpa.Orchestrator/Controllers/RitualController.cs` | Both `EnsureJitApproval` call sites (`phase0/approve`, `rtm/apply-amendment`) now `await` and pass `User` |
| `orchestrator/Adpa.Orchestrator/Program.cs` | `CapabilityRegistryClient` HttpClient registration (`CAPABILITY_REGISTRY_URL` env var, `localhost:5000` dev fallback) |

## Commands

```powershell
dotnet build orchestrator/Adpa.Orchestrator -c Release
dotnet watch run --project orchestrator/Adpa.AppHost   # Aspire dashboard: http://localhost:18888
```

AEV Gate 4 (governance check) for this packet specifically: confirm the department check is additive (existing JIT checks still all present and in order), confirm default-deny paths return 400 not 500 except for genuine misconfiguration (missing `Governance:PortfolioId`), confirm no direct-DB-query path to `capability_registry` was added to `GovernanceDbContext`.

## Related Skills

- `adpa-federated-capability-ownership` — Phase 0, the `departments` claim's source
- `adpa-capability-registry` — Phase 1, the `capability_registry` row shape and the Node-side lookup endpoint this packet consumes
- `adpa-aev-workflow` — the validation workflow this packet follows
