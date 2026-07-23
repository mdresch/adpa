# ADR 019: RBAC & Authorization Model

## 1. Status
**Proposed (2026-07-23)** — the authorization model described here is fully implemented; this ADR records the architecture retroactively.

## 2. Context

ADPA has a dual authentication model (Firebase ID tokens or legacy ADPA JWTs) and a role-plus-permission authorization layer, but no ADR has recorded the RBAC design, the permission naming convention, or the tenant isolation contract. The implementation is spread across:

- `server/src/middleware/auth.ts` — `authenticateToken`, `requireRole`, `requirePermission`, `optionalAuth`, `verifyTenantAccess`
- `server/src/modules/auth/AuthController.ts` — register, login, bootstrap super admin, role elevation
- `server/src/modules/auth/AuthRepository.ts` — user CRUD, company CRUD, permission lookups
- `server/src/modules/departments/` — department membership, Firebase custom claims sync

Verified against running code:

- **Roles**: `super_admin`, `admin`, `user` (case-insensitive).
- **Permissions**: fine-grained JSONB boolean map. Default user has `projects.create/read/update/delete`, `documents.create/read/update/delete`, `templates.create/read/update/delete`, `stakeholders.create/read/update/delete`. Admin adds `admin: true`, `users.*`, `settings.*`, `integrations.*`. Bootstrap super admin gets `ai.*`, `jobs.*`, `security.*`, `analytics.system`, `integrations.sync/test/manage`.
- **Authorization is ad-hoc**: some routes use `requirePermission`, some inline-check `user.role === 'admin'`, and some check `team_members` JSON arrays.
- **No centralized policy engine**: no CASL, Oso, or similar — authorization is middleware + inline checks.
- **Departments** are separate from roles. `UserDepartmentRepository` tracks `portfolioId`, `department`, `departmentRole`, surfaced via `/api/v1/auth/me` but not the primary authorization mechanism.
- **Tenant isolation**: `verifyTenantAccess` middleware enforces `tenantId` and `projectId` at the middleware level; super admins bypass.

## 3. Decision

We adopt a **role-plus-permission model with explicit perimeters and a single tenant-isolation gateway**. The permission map is the authoritative authorization source; roles are convenience shorthands for common permission bundles.

### 3.1 Roles and Permission Bundles

| Role | Permission Bundle | Notes |
|---|---|---|
| `super_admin` | `admin: true`, `users.*`, `settings.*`, `integrations.*`, `ai.*`, `jobs.*`, `security.*`, `analytics.system`, `integrations.sync/test/manage` | Full access; bypasses tenant isolation |
| `admin` | `admin: true`, `users.*`, `settings.*`, `integrations.*` | Company-scoped; can manage users and settings within their company |
| `user` | `projects.{create,read,update,delete}`, `documents.{create,read,update,delete}`, `templates.{create,read,update,delete}`, `stakeholders.{create,read,update,delete}` | Default on registration; scoped by `company_id` or `team_members` |

### 3.2 Permission Naming Convention

Permissions follow the pattern `<resource>.<action>`:

- Resources: `projects`, `documents`, `templates`, `stakeholders`, `users`, `settings`, `integrations`, `ai`, `jobs`, `security`, `analytics`
- Actions: `create`, `read`, `update`, `delete`, plus wildcard `*` for whole-resource access

Wildcards are expanded at the middleware level: `users.*` grants `users.create`, `users.read`, `users.update`, `users.delete`.

### 3.3 Tenant Isolation

`verifyTenantAccess` is the single gateway for tenant and project isolation. Every route that touches project or company data MUST call this middleware. It enforces:

- **Company isolation**: a non-super-admin user can only access resources belonging to their `company_id`.
- **Project isolation**: the middleware checks `project_id` membership via `team_members` JSONB array or ownership.
- **Super-admin bypass**: `super_admin` skips both checks.

The middleware stores `tenantId` and `projectId` in the user's `permissions` object at login time, so downstream handlers can read them without re-querying.

### 3.4 Department Membership

Departments are an orthogonal axis to roles. A user can be `role: user`, `permission: projects.read` (which grants access to projects), and simultaneously `department: Engineering` in `portfolioId: X`, which gates capability-registry overrides and break-glass exceptions. Department membership is surfaced via `/api/v1/auth/me` and synced to Firebase custom claims (`departments` array) by `firebaseClaimsAdmin.ts`.

Department membership is NOT a primary authorization mechanism for document or project CRUD. It is a secondary gate for governance actions (capability overrides, break-glass).

### 3.5 Authorization Enforcement

All authorization checks flow through one of three entry points:

1. `requireRole(['super_admin', 'admin'])` — role shorthand for common cases.
2. `requirePermission('projects.read')` — fine-grained permission check.
3. `verifyTenantAccess` — tenant/project isolation.

No route is allowed to perform inline `if (user.role === 'admin')` after this ADR. New routes MUST use the middleware chain and document any exception explicitly with a comment and a follow-up ticket to move the check into middleware.

## 4. Options Considered

### Option A: Role-only authorization (no permission map)
| Dimension | Assessment |
|---|---|
| Flexibility | Low — every new resource requires a new role |
| Maintenance | High — role proliferation as features grow |

Rejected: the permission map already exists and scales better than role proliferation. ADPA has 51 server modules; a role-only model would require ~51 roles.

### Option B (Recommended): Role + permission map with `verifyTenantAccess` gateway
| Dimension | Assessment |
|---|---|
| Flexibility | High — new permissions are new keys in a JSONB map |
| Maintenance | Medium — requires discipline to use middleware, not inline checks |
| Isolation | Enforced at one gateway |

The current implementation. It is chosen because it is already in production, and the fix to the remaining inline checks is a refactor, not a redesign.

### Option C: External policy engine (CASL / Oso)
| Dimension | Assessment |
|---|---|
| Flexibility | Highest |
| Complexity | High — new dependency, new query surface, new learning curve |

Rejected: not needed at the current feature set. The permission map + three middleware entry points already covers every route. Introducing an external engine adds bundle size and operational complexity without a proven gap that the current model cannot close.

## 5. Consequences

### Positive
- **Centralized enforcement**: `verifyTenantAccess` is the single gateway for tenant and project isolation, making it easy to audit which routes are covered.
- **Fine-grained control**: permission map supports per-resource, per-action grants without role proliferation.
- **Departments as secondary axis**: department membership gates governance actions without polluting document permissions.

### Negative
- **Inline-check drift**: the existing codebase still contains inline `if (user.role === 'admin')` checks that bypass `requireRole`/`requirePermission`. Closing this gap requires a code audit and refactor, not just a policy statement.
- **team_members is JSONB array**: a JSONB array of user IDs on the `projects` table is not as queryable or maintainable as a join table (`project_members`). It works, but querying "all projects user X belongs to" requires `ANY()` or JSONB path queries, which are slower and harder to index than a foreign-key join.

### Risks
- **Permission map growth**: the JSONB map grows unbounded as new modules add permissions. Mitigated by adding a periodic schema review (e.g., quarterly) that removes unused permissions and normalizes naming.
- **Department-to-role confusion**: developers new to the codebase may implement authorization using department membership instead of `requirePermission`, conflating the two axes. Mitigated by adding a README to `auth.ts` explaining the distinction, and by requiring middleware use in new routes.

## 6. Action Items

1. Audit `server/src/routes/` and `server/src/modules/*/routes.ts` for inline role checks; migrate each to `requireRole` or `requirePermission`.
2. Replace `team_members` JSONB array with a proper `project_members` join table (blocked on [ADR-021](ADR-021-multi-tenancy-and-portfolio-architecture.md)'s project hierarchy decision).
3. Document the permission naming convention in `docs/07-architecture/RBAC-PERMISSIONS.md` with a canonical list of all current permission keys.
4. Add `requirePermission` integration tests that verify super-admin bypass, admin scoping by `company_id`, and regular-user `team_members` membership.

## 7. References

- `server/src/middleware/auth.ts` — core middleware: `authenticateToken`, `requireRole`, `requirePermission`, `optionalAuth`, `verifyTenantAccess`
- `server/src/modules/auth/AuthController.ts` — register, login, demo login, bootstrap super admin, role elevation
- `server/src/modules/auth/AuthRepository.ts` — user CRUD, company CRUD, permission lookups
- `server/src/modules/departments/firebaseClaimsAdmin.ts` — department membership sync to Firebase custom claims
- `server/src/modules/departments/CurrentUserDepartmentMembership.ts` — department lookup used by Approvals and Capabilities
- [ADR-009: Unified Authentication Across Tiers](ADR-009-unified-authentication.md) — Firebase as single identity provider, the auth layer this model sits on top of
- [ADR-021: Multi-Tenancy & Portfolio Architecture](ADR-021-multi-tenancy-and-portfolio-architecture.md) — the tenant boundary this model enforces
