# Project Integration Settings Feature

## Overview

Implemented per-project settings for Confluence and Jira integrations, allowing project-specific configuration for document publishing and issue creation.

## Features Implemented

### 1. Database Migration
- **File**: `server/src/database/migrations/401_project_integration_settings.sql`
- **Adds columns to `project_integrations` table**:
  - `confluence_enabled` - Enable/disable Confluence publishing per project
  - `confluence_space_key_override` - Override default Confluence space
  - `confluence_parent_page_id_override` - Override default parent page
  - `confluence_auto_publish` - Auto-publish documents when created
  - `jira_enabled` - Enable/disable Jira integration per project
  - `jira_project_key_override` - Override default Jira project key
  - `jira_issue_type_override` - Override default issue type
  - `jira_priority_override` - Override default priority
  - `jira_auto_create` - Auto-create Jira issues when documents are created
  - `integration_settings` - JSONB for additional settings

### 2. API Endpoints
- **File**: `server/src/routes/projectSettings.ts`
- **Endpoints**:
  - `GET /api/projects/:projectId/integrations` - Get project integration settings
  - `PUT /api/projects/:projectId/integrations` - Update project integration settings
- **Features**:
  - RBAC: Requires `projects.read` and `projects.update` permissions
  - Access control: Verifies user has access to project
  - Returns merged settings (overrides + defaults)

### 3. Project Settings UI
- **File**: `app/projects/[id]/components/IntegrationsTab.tsx`
- **Location**: Project page → "Integrations" tab
- **Features**:
  - Toggle Confluence/Jira integration on/off per project
  - Configure space keys, project keys, issue types, priorities
  - Enable auto-publish and auto-create options
  - Real-time save with change detection
  - Visual indicators (green checkmark when enabled)

### 4. Document View Enhancements
- **File**: `app/projects/[id]/documents/[docId]/view/page.tsx`
- **Features**:
  - "Publish to Jira" button (when no Jira issue exists)
  - "View in Jira" button (when issue exists)
  - "Configure Project Settings" link in Export Options card
  - Links directly to project Integrations tab

### 5. Backend Integration Updates

#### Confluence Integration
- **File**: `server/src/integrations/confluence.ts`
- **Updates**:
  - Checks `confluence_enabled` before publishing
  - Uses `confluence_space_key_override` if set
  - Uses `confluence_parent_page_id_override` for page hierarchy
  - Falls back to integration defaults if project settings not configured

#### Jira Linkage Service
- **File**: `server/src/services/jiraLinkageService.ts`
- **Updates**:
  - Checks `jira_enabled` before creating issues
  - Uses project-specific overrides for:
    - Project key
    - Issue type
    - Priority
    - Auto-create setting
  - Falls back to global/system settings if not configured

#### Routes Updated
- **File**: `server/src/routes/confluenceRoutes.ts`
  - Passes project settings to `uploadDocument()`
  
- **File**: `server/src/routes/jiraLinkage.ts`
  - Checks project `jira_enabled` before allowing issue creation
  - Uses project-specific overrides

## Usage

### Setting Up Project Integration Settings

1. **Navigate to Project** → **Integrations Tab**
2. **Enable Confluence**:
   - Toggle "Enable Confluence Publishing"
   - Set Space Key (e.g., "ADPA")
   - Optionally set Parent Page ID
   - Enable "Auto-Publish Documents" if desired

3. **Enable Jira**:
   - Toggle "Enable Jira Integration"
   - Set Project Key (e.g., "PROJ")
   - Set Default Issue Type (e.g., "Task")
   - Set Default Priority (e.g., "Medium")
   - Enable "Auto-Create Issues" if desired

4. **Click "Save Settings"**

### Publishing Documents

#### From Document View:
1. Open any document in the project
2. Scroll to "Export Options" card
3. Click **"Publish to Confluence"** or **"Publish to Jira"**
4. Document will be published using project-specific settings

#### Automatic Publishing:
- If `confluence_auto_publish` is enabled, documents are automatically published when created
- If `jira_auto_create` is enabled, Jira issues are automatically created when documents are created

## Settings Priority

Settings are resolved in this order (highest to lowest priority):

### Confluence:
1. Project `confluence_space_key_override`
2. Project `confluence_space_key` (legacy)
3. Integration `target_space_key`

### Jira:
1. Project `jira_project_key_override`
2. Project `jira_project_key` (legacy)
3. Integration `defaultProjectKey`
4. System settings

## API Examples

### Get Project Settings
```bash
GET /api/projects/{projectId}/integrations
Authorization: Bearer {token}

Response:
{
  "confluence": {
    "enabled": true,
    "spaceKey": "ADPA",
    "parentPageId": "123456",
    "autoPublish": false
  },
  "jira": {
    "enabled": true,
    "projectKey": "PROJ",
    "issueType": "Task",
    "priority": "Medium",
    "autoCreate": false
  },
  "settings": {}
}
```

### Update Project Settings
```bash
PUT /api/projects/{projectId}/integrations
Authorization: Bearer {token}
Content-Type: application/json

{
  "confluence": {
    "enabled": true,
    "spaceKey": "ADPA",
    "autoPublish": true
  },
  "jira": {
    "enabled": true,
    "projectKey": "PROJ",
    "issueType": "Story",
    "priority": "High"
  }
}
```

## Migration

Run the migration to add the new columns:

```bash
# Using psql
psql $DATABASE_URL -f server/src/database/migrations/401_project_integration_settings.sql

# Or via migration system
npm run migrate
```

## Files Modified/Created

### Backend
- ✅ `server/src/database/migrations/401_project_integration_settings.sql` (NEW)
- ✅ `server/src/routes/projectSettings.ts` (NEW)
- ✅ `server/src/routes/projects.ts` (route registration)
- ✅ `server/src/integrations/confluence.ts` (project settings support)
- ✅ `server/src/services/jiraLinkageService.ts` (project settings support)
- ✅ `server/src/routes/confluenceRoutes.ts` (project settings support)
- ✅ `server/src/routes/jiraLinkage.ts` (project settings check)
- ✅ `server/src/database/projectIntegrations.ts` (interface update)

### Frontend
- ✅ `app/projects/[id]/components/IntegrationsTab.tsx` (NEW)
- ✅ `app/projects/[id]/page.tsx` (added Integrations tab)
- ✅ `app/projects/[id]/documents/[docId]/view/page.tsx` (Publish to Jira button, settings link)

## Benefits

1. **Per-Project Control**: Each project can have different Confluence spaces and Jira projects
2. **Flexibility**: Override global settings per project
3. **User-Friendly**: Simple UI for configuration
4. **Backward Compatible**: Falls back to existing settings if project settings not configured
5. **Security**: Respects RBAC and project access controls

## Next Steps (Optional Enhancements)

1. **Bulk Operations**: Configure settings for multiple projects at once
2. **Templates**: Save project integration settings as templates
3. **Validation**: Validate space keys and project keys before saving
4. **History**: Track changes to integration settings
5. **Notifications**: Notify users when auto-publish/auto-create triggers

