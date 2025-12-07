# User Access Configuration Summary

**Date:** 2025-12-07  
**Status:** ✅ Configured

## Overview

This document summarizes the access configuration for two key users:
1. **Super Admin**: `menno.drescher@gmail.com` - Full system access
2. **Admin**: `john.doe@exampl.co` - Admin access limited to "Example Co" company

---

## 1. Super Admin: menno.drescher@gmail.com

### Configuration
- **Role**: `super_admin`
- **Company**: `NULL` (no company assignment)
- **User ID**: `42ca7333-b37e-4e1b-bd50-ac04abd7e682`

### Access Rights
✅ **All Projects**: Can see ALL projects from ALL companies (no company filter)  
✅ **All Documents**: Can see ALL documents from ALL projects (no company filter)  
✅ **All Extracted Entities**: Can see ALL extracted entities from ALL projects (no company filter)  
✅ **All Companies**: Can see ALL companies in the system (company_id = NULL)  
✅ **All Jobs**: Can see ALL jobs from ALL users (via `jobs.admin` permission)  
✅ **All Users**: Can manage ALL users in the system  
✅ **System Settings**: Full access to all system configuration

### Implementation Details
- Projects route: `isSuperAdmin` check bypasses company_id filtering
- Documents route: Inherits project access (all projects = all documents)
- Entities route: Inherits project access (all projects = all entities)
- Companies route: No company_id filter for super_admin
- Jobs route: Uses admin endpoint (`/api/jobs/admin/all`)

---

## 2. Admin: john.doe@exampl.co

### Configuration
- **Role**: `admin`
- **Company**: `Example Co` (ID: `1cbe4b38-be2d-4459-b7cf-a1771360c949`)
- **User ID**: `94c5c0f7-8a64-475b-8bea-c7b3f42984a2`
- **Temporary Password**: `TempPassword123!` (should be changed on first login)

### Access Rights
✅ **Projects**: Can see projects for "Example Co" only (filtered by company_id)  
✅ **Documents**: Can see documents for "Example Co" projects only (inherited from projects)  
✅ **Extracted Entities**: Can see entities for "Example Co" projects only (inherited from projects)  
✅ **Companies**: Can see "Example Co" only (filtered by company_id)  
✅ **Jobs**: Can see all jobs (admin role grants `jobs.admin` permission)  
✅ **Users**: Can manage users within "Example Co" only  
✅ **System Settings**: Limited to company-scoped settings

### Implementation Details
- Projects route: Filters by `company_id = '1cbe4b38-be2d-4459-b7cf-a1771360c949'`
- Documents route: Inherits project filtering (only documents from Example Co projects)
- Entities route: Inherits project filtering (only entities from Example Co projects)
- Companies route: Filters by `company_id = '1cbe4b38-be2d-4459-b7cf-a1771360c949'`
- Jobs route: Uses admin endpoint but can see all jobs (admin privilege)

---

## Access Control Implementation

### Projects (`/api/projects`)
```typescript
// Super admin: No company filter
if (isSuperAdmin) {
  // See all projects
} else if (userCompanyId) {
  // Regular admin/user: Filter by company_id
  query += ` AND p.company_id = $${paramCount}`
} else {
  // No company: Filter by ownership/team membership
  query += ` AND (p.owner_id = $${paramCount} OR p.team_members ? $${paramCount}::text)`
}
```

### Documents (`/api/documents`)
- Documents are accessed through projects
- Company filtering is inherited from project access
- Super admin sees all documents (all projects)
- Regular admin sees documents from their company's projects only

### Extracted Entities (`/api/project-data-extraction`)
- Entities are accessed through projects
- Company filtering is inherited from project access
- Super admin sees all entities (all projects)
- Regular admin sees entities from their company's projects only

### Companies (`/api/companies`)
```typescript
// Super admin: No company filter
if (!isSuperAdmin && userCompanyId) {
  query += ` AND c.id = $${paramCount}`  // Filter to user's company
  params.push(userCompanyId)
}
```

---

## Verification

### Check Super Admin Access
```bash
cd server
npx tsx scripts/check-user-role.ts menno.drescher@gmail.com
```

### Check Admin Access
```bash
cd server
npx tsx scripts/check-user-role.ts john.doe@exampl.co
```

### Re-run Configuration
```bash
cd server
npx tsx scripts/configure-user-access.ts
```

---

## Notes

1. **Email Variation**: The admin user was created with email `john.doe@exampl.co` (as specified). If you meant `john.doe@example.com`, you can update it:
   ```sql
   UPDATE users SET email = 'john.doe@example.com' WHERE email = 'john.doe@exampl.co';
   ```

2. **Password Reset**: The admin user has a temporary password. They should change it on first login.

3. **Company Filtering**: All company-based filtering relies on the `company_id` column in the `users` table. Super admins have `company_id = NULL` to bypass filtering.

4. **Job Access**: Both super admin and regular admin can see all jobs (admin privilege). This is by design for system monitoring.

---

## Related Files

- **Configuration Script**: `server/scripts/configure-user-access.ts`
- **Role Check Script**: `server/scripts/check-user-role.ts`
- **Projects Route**: `server/src/routes/projects.ts`
- **Companies Route**: `server/src/routes/companies.ts`
- **Documents Route**: `server/src/routes/documents.ts`
- **Entities Route**: `server/src/routes/projectDataExtraction.ts`

---

**Last Updated**: 2025-12-07

