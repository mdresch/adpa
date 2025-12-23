# Jira Issue Linkage Feature

## Overview

The Jira Issue Linkage feature automatically creates or links Jira issues for generated documents, providing seamless integration between ADPA document generation and Jira project management.

## Features

- **Automatic Issue Creation**: Create Jira issues automatically when documents are generated
- **Issue Linking**: Link documents to existing Jira issues based on title matching
- **Confluence Integration**: Attach Confluence page URLs to Jira issues as remote links
- **Document Updates**: Add comments to linked Jira issues when documents are regenerated
- **Configurable Settings**: Customize issue types, priorities, and behavior

## Setup

### 1. Configure Jira Integration

First, you need to set up a Jira integration:

1. Go to **Integrations** page
2. Click **Add Integration**
3. Select **Jira** as the integration type
4. Configure the integration:
   ```json
   {
     "baseUrl": "https://your-domain.atlassian.net",
     "defaultProjectKey": "PROJ",
     "defaultIssueType": "Task",
     "defaultPriority": "Medium"
   }
   ```
5. Add credentials:
   ```json
   {
     "email": "your-email@company.com",
     "apiToken": "your-jira-api-token"
   }
   ```

### 2. Enable Jira Linkage

1. Go to **Settings** → **Jira Linkage** tab
2. Enable the **Jira Linkage** toggle
3. Select your configured Jira integration
4. Configure options:
   - **Auto-create Issues**: Automatically create new issues
   - **Link Confluence Pages**: Attach Confluence URLs
   - **Default Issue Type**: Task, Story, Bug, etc.
   - **Default Priority**: Highest, High, Medium, Low, Lowest

### 3. Test Configuration

Click the **Test** button to verify:
- Connection to Jira instance
- Access to configured project
- Permissions to create issues

## Usage

### Automatic Linkage

When Jira linkage is enabled, the system will:

1. **Document Generation**: 
   - Check for existing issues with similar titles
   - Create new issue if none found
   - Link document to issue in database

2. **Document Regeneration**:
   - Add comment to linked issue
   - Include version information and changes

### Manual Linkage

You can also manually create Jira issues for documents:

```typescript
// API endpoint
POST /api/jira-linkage/create-issue
{
  "documentId": "uuid",
  "issueTitle": "Custom Issue Title",
  "issueDescription": "Custom description",
  "issueType": "Story",
  "priority": "High",
  "confluenceUrl": "https://confluence.company.com/page"
}
```

### Check Document Linkage

```typescript
// API endpoint
GET /api/jira-linkage/document/:documentId
```

Returns:
```json
{
  "linked": true,
  "issueKey": "PROJ-123",
  "issueUrl": "https://company.atlassian.net/browse/PROJ-123",
  "integrationName": "Company Jira",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

## Configuration Options

### System Settings

The following settings are stored in `system_settings` table:

| Setting Key | Description | Default |
|-------------|-------------|---------|
| `jira_linkage_enabled` | Enable/disable feature | `false` |
| `default_jira_integration_id` | Default integration UUID | `null` |
| `jira_auto_create_issues` | Auto-create new issues | `false` |
| `jira_link_confluence_pages` | Attach Confluence URLs | `false` |
| `jira_default_issue_type` | Default issue type | `Task` |
| `jira_default_priority` | Default priority | `Medium` |

### Integration Configuration

Jira integrations support these configuration options:

```json
{
  "baseUrl": "https://company.atlassian.net",
  "defaultProjectKey": "PROJ",
  "defaultIssueType": "Task",
  "defaultPriority": "Medium",
  "autoCreateIssues": true,
  "linkConfluencePages": true
}
```

## Database Schema

### document_jira_links Table

```sql
CREATE TABLE document_jira_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL,
    jira_issue_key VARCHAR(255) NOT NULL,
    jira_issue_url TEXT NOT NULL,
    integration_id UUID NOT NULL REFERENCES integrations(id),
    project_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(document_id, integration_id)
);
```

## API Reference

### Configuration Endpoints

- `GET /api/jira-linkage/config` - Get current configuration
- `PUT /api/jira-linkage/config` - Update configuration

### Document Linkage Endpoints

- `GET /api/jira-linkage/document/:documentId` - Get document linkage
- `POST /api/jira-linkage/create-issue` - Manually create issue
- `POST /api/jira-linkage/test/:integrationId` - Test integration

## Error Handling

The Jira linkage feature is designed to be non-blocking:

- Document generation continues even if Jira linkage fails
- Errors are logged but don't prevent document creation
- Clear error messages in UI for configuration issues
- Graceful fallback when Jira is unavailable

## Security Considerations

- Jira API tokens are encrypted in database
- User permissions checked before creating issues
- Integration access limited to configured projects
- Audit logging for all Jira operations

## Troubleshooting

### Common Issues

1. **Connection Failed**
   - Verify Jira base URL
   - Check API token validity
   - Ensure email has Jira access

2. **Project Access Denied**
   - Verify project key exists
   - Check user permissions in Jira
   - Ensure project allows issue creation

3. **Issues Not Created**
   - Check if auto-create is enabled
   - Verify integration is active
   - Review error logs

### Testing

Run the test script to verify setup:

```bash
cd server
npm run test:jira-integration
```

## Implementation Details

### Service Architecture

- `JiraService`: Core Jira API client
- `JiraIntegration`: Integration wrapper
- `JiraLinkageService`: Business logic and configuration
- `JiraLinkageSettings`: React component for UI

### Integration Points

- Document generation routes
- Document regeneration process
- Settings management
- Integration testing

## Future Enhancements

- Support for custom fields
- Bulk issue creation
- Issue status synchronization
- Advanced workflow integration
- Jira webhook support