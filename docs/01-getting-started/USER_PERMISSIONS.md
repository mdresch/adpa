# User Permissions System

## Overview
ADPA uses a role-based permission system to control access to various features and resources. Permissions are stored as a JSON object in the `users.permissions` column.

## Permission Model

### Default User Permissions
All regular users receive these permissions automatically upon registration:

```json
{
  "projects.create": true,
  "projects.read": true,
  "projects.update": true,
  "projects.delete": true,
  "documents.create": true,
  "documents.read": true,
  "documents.update": true,
  "documents.delete": true,
  "templates.create": true,
  "templates.read": true,
  "templates.update": true,
  "templates.delete": true,
  "stakeholders.create": true,
  "stakeholders.read": true,
  "stakeholders.update": true,
  "stakeholders.delete": true
}
```

### Admin Permissions
Admin users receive all default permissions plus:

```json
{
  "admin": true,
  "users.create": true,
  "users.read": true,
  "users.update": true,
  "users.delete": true,
  "settings.read": true,
  "settings.update": true,
  "integrations.create": true,
  "integrations.read": true,
  "integrations.update": true,
  "integrations.delete": true
}
```

## Permission Categories

### Projects
- `projects.create` - Create new projects
- `projects.read` - View projects
- `projects.update` - Edit existing projects
- `projects.delete` - Delete projects

### Documents
- `documents.create` - Create new documents
- `documents.read` - View documents
- `documents.update` - Edit existing documents
- `documents.delete` - Delete documents

### Templates
- `templates.create` - Create new templates
- `templates.read` - View templates
- `templates.update` - Edit existing templates
- `templates.delete` - Delete templates

### Stakeholders
- `stakeholders.create` - Add new stakeholders
- `stakeholders.read` - View stakeholders
- `stakeholders.update` - Edit stakeholder information
- `stakeholders.delete` - Remove stakeholders

### Users (Admin only)
- `users.create` - Create new users
- `users.read` - View user information
- `users.update` - Edit user details
- `users.delete` - Delete users

### Settings (Admin only)
- `settings.read` - View system settings
- `settings.update` - Modify system settings

### Integrations (Admin only)
- `integrations.create` - Add new integrations
- `integrations.read` - View integrations
- `integrations.update` - Edit integrations
- `integrations.delete` - Remove integrations

## Implementation

### Middleware
Permissions are enforced using the `requirePermission` middleware:

```typescript
import { requirePermission } from '../middleware/auth'

router.post("/projects", 
  authenticateToken, 
  requirePermission("projects.create"), 
  async (req, res) => {
    // Create project logic
  }
)
```

### Permission Checking Logic
1. Admin users (`role === 'admin'`) bypass permission checks and have access to everything
2. Regular users need the specific permission set to `true` in their permissions object
3. Missing or `false` permissions result in a 403 Forbidden response

## Fixing Permissions

### For Existing Users
If users were created before the permission system was implemented, run:

```bash
cd server
npx tsx ../scripts/fix-user-permissions.ts
```

This script will:
- Add default permissions to all users without permissions
- Add admin permissions to users with `role = 'admin'`
- Preserve any custom permissions already granted

### Manually Granting Permissions
To manually grant a permission to a user:

```sql
UPDATE users 
SET permissions = jsonb_set(
  COALESCE(permissions, '{}'::jsonb), 
  '{permission.name}', 
  'true'::jsonb
)
WHERE email = 'user@example.com';
```

Example - Grant template deletion to a specific user:
```sql
UPDATE users 
SET permissions = jsonb_set(
  COALESCE(permissions, '{}'::jsonb), 
  '{templates.delete}', 
  'true'::jsonb
)
WHERE email = 'user@example.com';
```

### Revoking Permissions
To revoke a permission:

```sql
UPDATE users 
SET permissions = jsonb_set(
  COALESCE(permissions, '{}'::jsonb), 
  '{permission.name}', 
  'false'::jsonb
)
WHERE email = 'user@example.com';
```

## Common Issues

### "Permission 'projects.create' required" Error
**Cause**: User doesn't have the required permission in their permissions object.

**Solution**: 
1. Run the fix script: `npx tsx ../scripts/fix-user-permissions.ts`
2. Or manually grant: `UPDATE users SET permissions = ... WHERE email = '...'`

### Projects Not Saving
**Cause**: Missing `projects.create` permission.

**Solution**: Ensure the logged-in user has `projects.create: true` in their permissions.

### Newly Registered Users Can't Access Features
**Cause**: Registration endpoint not granting default permissions (fixed in latest version).

**Solution**: Upgrade to the latest version where registration automatically grants default permissions.

## Best Practices

1. **Principle of Least Privilege**: Only grant permissions that users actually need
2. **Role-Based Groups**: Consider creating predefined permission sets for common roles
3. **Audit Trail**: Log permission changes for security auditing
4. **Regular Review**: Periodically review and update user permissions
5. **Testing**: Always test permission changes in a development environment first

## Future Enhancements

Potential improvements to the permission system:
- Permission groups/roles for easier management
- Time-based permissions (expiring access)
- Resource-level permissions (access to specific projects only)
- Permission inheritance and delegation
- UI for permission management in admin dashboard

