# ADR 021: Multi-Tenancy & Portfolio Architecture

## 1. Status
**Proposed (2026-07-23)** — the tenant model, portfolio hierarchy, and project scoping described here are implemented in the database schema and enforced partially by middleware; this ADR records the architecture retroactively.

## 2. Context

ADPA organizes work in a **company → portfolio → program → project → document** hierarchy. Isolation is structural (SQL joins enforce relationships) in most places and middleware-enforced in others. The `portfolioDomains` extension mechanism and resource capacity model exist in the schema but have no architectural record.

Verified against running code:

- **Hierarchy**:
  - `companies` (`companies.id`) ← `users.company_id`
  - `portfolios` (`portfolio_governance.id`, with `portfolio_name`) ← `programs.portfolio_id`
  - `programs` (`programs.id`, with `program_name`) ← `projects.program_id`
  - `projects` (`projects.id`) ← `documents.project_id`
- **Project access control**:
  - `super_admin`: sees all projects.
  - `admin`: scoped by `company_id`.
  - Regular `user`: scoped to `company_id` OR `owner_id` OR `team_members` JSON array membership.
- **Tenant isolation middleware** (`verifyTenantAccess`): enforces `tenantId` and `projectId` at the middleware level; super admins bypass.
- **Department / portfolio membership**: `CurrentUserDepartmentMembership` = `{ portfolioId, department, departmentRole }`, resolved via `listActiveDepartmentsByUser` and returned on `/api/v1/auth/me`.
- **`portfolioDomains`**: exists as a DB concept for extending portfolio behavior with custom domains.
- **`team_members`**: stored as a JSONB array of user IDs on the `projects` table, not a join table.
- **`correlation_id`**: stored on projects for distributed tracing, not for multi-tenancy.

## 3. Decision

We adopt a **structural multi-tenancy model** where company boundaries are the primary tenant boundary, portfolio hierarchy is the primary organizational boundary, and project membership is the primary access boundary. Isolation is enforced by the database schema for relationships and by `verifyTenantAccess` middleware for API routes.

### 3.1 Tenant Boundary

The **company** is the tenant. Every user belongs to exactly one company (`users.company_id`). Every project belongs to exactly one company (`projects.company_id`). All tenant-scoped queries filter by `company_id` for non-super-admin callers. Super admins are global readers with the explicit understanding that their access is auditable.

### 3.2 Portfolio Hierarchy

Portfolios group programs for regulatory, budget, or governance purposes. The hierarchy is:

```
Portfolio
  ├── Program A
  │     ├── Project A1
  │     └── Project A2
  └── Program B
        └── Project B1
```

Portfolio boundaries are used for:
- **Department membership**: a user's `CurrentUserDepartmentMembership` is scoped to a `portfolioId`, which gates capability-registry overrides and break-glass exceptions.
- **Governance isolation**: ADR-005's capability activation gating is portfolio-aware; a capability registered in Portfolio A is not visible to Portfolio B.

Programs are primarily a join table (`programs.portfolio_id`) and do not have a dedicated controller — they are pulled into project `findById` via raw SQL joins. This is intentional: programs are structural, not a first-class write surface.

### 3.3 Project Membership and Scoping

Project access is granted by three mechanisms, OR'd together:

1. **Company membership**: any user in the project's `company_id` can read projects from that company.
2. **Ownership**: the user who created the project (`projects.owner_id` or equivalent) can read it.
3. **Team membership**: the user's ID appears in the `team_members` JSONB array on the `projects` table.

All three are evaluated inside `verifyTenantAccess`. Super admins bypass all three.

### 3.4 Portfolio Isolation Guarantees

A user in Portfolio A with no cross-portfolio assignments **cannot** access:
- Projects belonging to Portfolio B's programs.
- Capability states or overrides scoped to Portfolio B.
- Documents generated from Portfolio B projects.

A user in Portfolio A who is also a super admin **can** access Portfolio B, but every such access is logged in the audit trail because `verifyTenantAccess` records the bypass event.

### 3.5 Resource Capacity

Resource capacity exists as a conceptual model (budget, headcount, timeline) encoded in `resource_assignments`, `capacity_forecasts`, and `utilization_records` tables. These tables are scoped to `project_id`, not `portfolio_id`, so capacity planning is project-level. Portfolio-level capacity aggregation is a query-time JOIN, not a pre-aggregated rollup. This is acceptable at current scale but must be revisited if portfolio-level dashboards require sub-second aggregation of thousands of projects.

## 4. Options Considered

### Option A: Company-only tenancy (no portfolio hierarchy)
| Dimension | Assessment |
|---|---|
| Isolation | Simple — one filter per query |
| Governance | Impossible — department membership, capability gating, and ADR-005's federal ownership model all require a finer grain than company |

Rejected: the codebase already has `portfolio_governance`, `programs`, and `team_members` in production. Flattening back to company-only would remove the governance granularity that makes the system useful for large enterprise deployments.

### Option B (Recommended): Company → portfolio → program → project hierarchy with `verifyTenantAccess`
| Dimension | Assessment |
|---|---|
| Isolation | Structural (DB FK) + enforced (middleware on API routes) |
| Governance | Portfolio-aware capability gating works as designed |
| Complexity | Medium — three levels of hierarchy, but each is a single FK column |

The current implementation. Retained because it is already operating in production and the only missing piece (a formal ADR) is what this document provides.

### Option C: Full microservice tenancy (one database per portfolio)
| Dimension | Assessment |
|---|---|
| Isolation | Maximum — physical separation |
| Cost | Very high — connection pooling, backup, and migration complexity per tenant |
| Operational burden | None for isolation, exponential for ops |

Rejected: the database is single-tenant (one Postgres) with tenant isolation enforced at the query level. This matches the current scale and team size. Physical separation is a future option if customer data-sovereignty requirements demand it.

## 5. Consequences

### Positive
- **Governance granularity**: portfolios give ADR-005 a second-level scope that companies alone cannot provide (different departments own different capabilities within the same company).
- **Simple isolation contract**: `verifyTenantAccess` is the single enforcement point. New routes only need to add the middleware to inherit tenant isolation.
- **Portfolio-aware scoping**: department membership, capability gating, and break-glass exceptions all operate at the portfolio level, which matches enterprise governance expectations.

### Negative
- **`team_members` is JSONB, not a join table**: querying "all projects user X belongs to" uses JSONB path queries, which are slower and harder to index than a foreign-key join. Replacement with `project_members` is tracked as a follow-up.
- **No resource capacity rollup**: portfolio-level aggregate capacity is computed at query time, not pre-aggregated. Sub-second dashboards for portfolios with thousands of projects will lag.

### Risks
- **Middleware bypass**: a route added without `verifyTenantAccess` silently exposes company or project data to unauthorized callers. Mitigated by adding a lint or CI rule that checks for `verifyTenantAccess` on every route definition.
- **super_admin scope creep**: the current implementation treats super_admin as globally bypassing tenant checks. As ADPA grows, this may need to be scoped (e.g., super_admin can read anything but cannot write across companies without a second auth factor). Tracked as an open question.

## 6. Action Items

1. Replace `team_members` JSONB array with a `project_members` join table (blocked on schema migration and contract guards).
2. Add a CI step that verifies every route in `server/src/modules/*/routes.ts` includes `verifyTenantAccess` (or is explicitly annotated as public).
3. Document portfolio/program/project hierarchy in `docs/06-features/PROJECT-HIERARCHY.md`.
4. Define super_admin write-scope policy (see Risks above) and track as an ADR supplement.

## 7. References

- `server/migrations/000_baseline.sql` — `companies`, `projects`, `programs`, `portfolio_governance`, `documents` tables
- `server/src/modules/projects/ProjectsController.ts`, `ProjectRepository.ts` — project CRUD
- `server/src/modules/auth/AuthRepository.ts` — user/company CRUD, permission lookups
- `server/src/middleware/auth.ts` — `verifyTenantAccess` middleware
- `server/src/modules/departments/` — department membership, Firebase claims sync
- `server/src/modules/capabilityRegistry/` — ADR-005 capability gating at portfolio level
- [ADR-005: Federated Capability Ownership](ADR-005-federated-capability-ownership.md) — department-scoped ownership that depends on portfolio hierarchy
- [ADR-009: Unified Authentication Across Tiers](ADR-009-unified-authentication.md) — the identity layer this tenant model sits on top of
- [ADR-019: RBAC & Authorization Model](ADR-019-rbac-and-authorization-model.md) — the permission enforcement model that uses tenant isolation
