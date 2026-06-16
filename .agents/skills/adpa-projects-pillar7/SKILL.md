---
name: adpa-projects-pillar7
description: Pillar 7 Project Governance & Lifecycle Management. Use when working on project CRUD, authorization boundaries, tenant isolation, context items, team membership, or project status transitions.
---

# ADPA Project Governance & Lifecycle (Pillar 7)

## Purpose
Pillar 7 ensures projects are governed entities with strict authorization boundaries, tenant isolation, lifecycle state management, and context item traceability. It guarantees that project data integrity, access control, and team membership invariants hold across all operations.

## Invariants
- Must always: Enforce authorization boundaries — only owner, team members, or admin/super_admin may access a project (REQ-PRJ-001)
- Must always: Validate project identity — reject malformed or missing UUIDs before any DB operation (REQ-PRJ-002)
- Must always: Auto-include the creator as a team member on project creation (REQ-PRJ-003)
- Must always: Enforce tenant isolation — non-super_admin users only see projects within their company scope (REQ-PRJ-004)
- Must always: Require project name on creation — reject empty or missing names (REQ-PRJ-005)
- Must always: Enforce project access checks before any context item operation (REQ-PRJ-006)

## Interaction Rules
- Depends on: Pillar 4 (Compliance) for audit logging of project lifecycle events
- Depends on: Pillar 5 (Data Infrastructure) for database pool resilience
- Must not break: Document generation pipeline, context injection, knowledge graph entity linking
- Integrates with: `ProjectsController`, `ProjectRepository`, `ProjectContextItemsController`, `AuthRepository`

## Key Files
| File | Role |
|------|------|
| `server/src/modules/projects/ProjectsController.ts` | Project CRUD + access control |
| `server/src/modules/projects/ProjectRepository.ts` | Database queries + transactions |
| `server/src/modules/projects/ProjectContextItemsController.ts` | Context item lifecycle |
| `server/src/modules/projects/routes.ts` | Route definitions |
| `server/src/__tests__/modules/projects/pillar7-invariants.test.ts` | Contract Guards |

## Commands
```powershell
cd server
npm run test:features -- projects
```

## Implementation Details

### REQ-PRJ-001: Authorization Boundary Enforcement
- `getById` checks owner_id, team_members array, or admin/super_admin role
- `update` and `delete` restrict to owner or admin/super_admin
- Non-authorized access returns 403 with "Access denied"
- Context item operations delegate to `requireProjectAccess` guard

### REQ-PRJ-002: Project Identity Validation
- All endpoints accepting project ID validate UUID format via regex
- Invalid or missing IDs return 400 before any database query
- Prevents SQL injection and unnecessary DB round-trips

### REQ-PRJ-003: Creator Auto-Membership
- On `create`, the authenticated user's ID is always prepended to team_members
- Duplicate IDs are deduplicated via `Set`
- Creator cannot be removed from team_members during creation

### REQ-PRJ-004: Tenant Isolation
- Non-super_admin users are scoped to their company_id
- If company_id lookup fails, falls back to owner/team filtering
- Super_admin bypasses tenant scoping for cross-company visibility

### REQ-PRJ-005: Project Name Validation
- `create` rejects requests with missing or empty `name` field
- Returns 400 with descriptive error message

### REQ-PRJ-006: Context Item Access Guard
- All context item operations call `requireProjectAccess` before proceeding
- Access check verifies project existence and user authorization
- Failed access returns 403 or 404 depending on the failure reason
