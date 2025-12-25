# Jira Integration Demo Guide

## 🎯 Overview

The Jira Integration automatically creates or links Jira issues when documents are generated in ADPA, providing seamless project management integration.

## 📋 Demo Flow

### Step 1: Set Up Jira Integration

First, you need to configure a Jira integration in ADPA:

1. **Navigate to Integrations Page**
   - Go to `/integrations` or access via Settings
   
2. **Add New Integration**
   - Click "Add Integration"
   - Select "Jira" as the integration type
   
3. **Configure Integration**
   ```json
   {
     "name": "Company Jira",
     "type": "jira",
     "configuration": {
       "baseUrl": "https://your-domain.atlassian.net",
       "defaultProjectKey": "PROJ",
       "defaultIssueType": "Task",
       "defaultPriority": "Medium"
     },
     "credentials": {
       "email": "your-email@company.com",
       "apiToken": "your-jira-api-token"
     }
   }
   ```

4. **Get Jira API Token**
   - Go to https://id.atlassian.com/manage-profile/security/api-tokens
   - Click "Create API token"
   - Copy the token and use it in the credentials

### Step 2: Enable Jira Linkage

1. **Navigate to Settings**
   - Go to `/settings` → **Jira Linkage** tab

2. **Configure Settings**
   - ✅ **Enable Jira Linkage**: Toggle ON
   - **Select Integration**: Choose your configured Jira integration
   - ✅ **Auto-create Issues**: Automatically create new issues
   - ✅ **Link Confluence Pages**: Attach Confluence URLs to issues
   - **Default Issue Type**: Task, Story, Bug, Epic, etc.
   - **Default Priority**: Highest, High, Medium, Low, Lowest

3. **Test Connection**
   - Click **Test Connection** button
   - Verify:
     - ✅ Connection to Jira instance
     - ✅ Access to configured project
     - ✅ Permissions to create issues

### Step 3: Automatic Linkage (Demo)

When Jira linkage is enabled, the system automatically:

1. **During Document Generation**:
   ```typescript
   // When you generate a document via:
   POST /api/ai/generate
   {
     "projectId": "uuid",
     "templateId": "uuid",
     "name": "Project Charter"
   }
   ```

   **What Happens:**
   - Document is created in ADPA
   - System checks for existing Jira issues with similar title
   - If found: Links document to existing issue
   - If not found AND auto-create enabled: Creates new Jira issue
   - Stores linkage in `document_jira_links` table
   - If Confluence linking enabled: Attaches Confluence page URL as remote link

2. **During Document Regeneration**:
   ```typescript
   // When you regenerate a document:
   POST /api/ai/regenerate
   {
     "documentId": "uuid",
     "provider": "openai",
     "model": "gpt-4"
   }
   ```

   **What Happens:**
   - Document version is updated
   - System finds linked Jira issue
   - Adds comment to Jira issue:
     ```
     Document regenerated using openai (gpt-4)
     New version: 2.1.0
     ```
   - Updates issue with version information

### Step 4: Manual Linkage (Demo)

You can also manually create Jira issues for existing documents:

```typescript
// API Endpoint
POST /api/jira-linkage/create-issue
{
  "documentId": "uuid-of-document",
  "issueTitle": "Custom Issue Title (optional)",
  "issueDescription": "Custom description (optional)",
  "issueType": "Story",
  "priority": "High",
  "confluenceUrl": "https://confluence.company.com/page"
}
```

**Response:**
```json
{
  "message": "Jira issue created successfully",
  "issueKey": "PROJ-123",
  "issueUrl": "https://company.atlassian.net/browse/PROJ-123",
  "created": true
}
```

### Step 5: Check Document Linkage

Query the linkage status for any document:

```typescript
// API Endpoint
GET /api/jira-linkage/document/:documentId
```

**Response (Linked):**
```json
{
  "linked": true,
  "issueKey": "PROJ-123",
  "issueUrl": "https://company.atlassian.net/browse/PROJ-123",
  "integrationName": "Company Jira",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

**Response (Not Linked):**
```json
{
  "linked": false
}
```

## 🎨 UI Components

### Settings Page (`/settings` → Jira Linkage Tab)

The `JiraLinkageSettings` component provides:

- **Enable/Disable Toggle**: Master switch for the feature
- **Integration Selector**: Dropdown of available Jira integrations
- **Auto-create Toggle**: Enable automatic issue creation
- **Confluence Linking Toggle**: Attach Confluence URLs
- **Issue Type Selector**: Task, Story, Bug, Epic, etc.
- **Priority Selector**: Highest, High, Medium, Low, Lowest
- **Test Button**: Verify connection and permissions
- **Save Button**: Persist configuration

### Document View Integration

When viewing a document, you can:
- See if it's linked to a Jira issue
- Click to open the linked Jira issue
- Manually create a Jira issue if not linked

## 🔧 Technical Details

### Database Schema

```sql
CREATE TABLE document_jira_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    jira_issue_key VARCHAR(255) NOT NULL,
    jira_issue_url TEXT NOT NULL,
    integration_id UUID NOT NULL REFERENCES integrations(id),
    project_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(document_id, integration_id)
);
```

### Service Architecture

1. **JiraService** (`server/src/services/jiraService.ts`)
   - Core Jira API client
   - Authentication (Basic Auth with email + API token)
   - Issue CRUD operations
   - Project access verification
   - Comment management
   - Remote link management

2. **JiraIntegration** (`server/src/integrations/jira.ts`)
   - Integration wrapper following ADPA patterns
   - Document-to-issue linkage logic
   - Confluence URL attachment
   - Database linkage storage

3. **JiraLinkageService** (`server/src/services/jiraLinkageService.ts`)
   - Configuration management
   - Business logic orchestration
   - Non-blocking error handling
   - Integration selection

### Integration Points

1. **Document Generation** (`server/src/routes/documentGeneration.ts:306-325`)
   ```typescript
   // Non-blocking Jira linkage
   try {
     jiraLinkage = await jiraLinkageService.linkDocumentToJira(
       documentId,
       name,
       projectId
     )
   } catch (jiraError) {
     log.warn('Failed to link document to Jira (non-blocking):', jiraError)
   }
   ```

2. **Document Regeneration** (`server/src/routes/documentGeneration.ts:610-620`)
   ```typescript
   // Update Jira issue with regeneration info
   try {
     await jiraLinkageService.updateJiraForDocumentRegeneration(
       existingDocumentId,
       newVersion,
       `Document regenerated using ${provider}`
     )
   } catch (jiraError) {
     log.warn('Failed to update Jira issue (non-blocking):', jiraError)
   }
   ```

## 🧪 Testing the Integration

### 1. Test Script

Run the test script to verify setup:

```bash
cd server
npx ts-node scripts/test-jira-integration.ts
```

### 2. Manual Testing Steps

1. **Configure Integration**
   - Set up Jira integration with valid credentials
   - Verify connection test passes

2. **Enable Linkage**
   - Enable Jira linkage in Settings
   - Select integration
   - Enable auto-create

3. **Generate Document**
   - Create a new document
   - Check Jira for new issue
   - Verify issue is linked in database

4. **Regenerate Document**
   - Regenerate the document
   - Check Jira issue for new comment
   - Verify version information

5. **Manual Creation**
   - Use API to manually create issue
   - Verify issue appears in Jira
   - Check linkage in database

## 📊 Example Workflow

### Scenario: Project Charter Generation

1. **User generates "Project Charter" document**
   ```
   POST /api/ai/generate
   {
     "projectId": "proj-123",
     "templateId": "template-456",
     "name": "Project Charter"
   }
   ```

2. **System automatically:**
   - Creates document in ADPA
   - Searches Jira for existing "Project Charter" issue
   - Creates new issue: `PROJ-124: Document: Project Charter`
   - Links document to issue
   - Stores linkage: `document_jira_links`

3. **User publishes to Confluence**
   - Document published to Confluence
   - System attaches Confluence URL to Jira issue as remote link

4. **User regenerates document**
   - Document version updated to 2.0.0
   - System adds comment to Jira issue:
     ```
     Document regenerated using openai (gpt-4)
     New version: 2.0.0
     Previous version: 1.0.0
     ```

5. **Result:**
   - Jira issue tracks document lifecycle
   - Team can see document changes in Jira
   - Confluence link available in Jira issue

## 🔒 Security Features

- **Encrypted Credentials**: Jira API tokens encrypted in database
- **Permission Checking**: User access verified before operations
- **Non-blocking**: Document generation continues if Jira fails
- **Audit Logging**: All Jira operations logged
- **Access Control**: Integration access limited to configured projects

## 🚨 Error Handling

The integration is designed to be **non-blocking**:

- Document generation continues even if Jira linkage fails
- Errors are logged but don't prevent document creation
- Clear error messages in UI for configuration issues
- Graceful fallback when Jira is unavailable

## 📝 Configuration Options

### System Settings

| Setting Key | Description | Default |
|-------------|-------------|---------|
| `jira_linkage_enabled` | Enable/disable feature | `false` |
| `default_jira_integration_id` | Default integration UUID | `null` |
| `jira_auto_create_issues` | Auto-create new issues | `false` |
| `jira_link_confluence_pages` | Attach Confluence URLs | `false` |
| `jira_default_issue_type` | Default issue type | `Task` |
| `jira_default_priority` | Default priority | `Medium` |

## 🎯 Key Features

✅ **Automatic Issue Creation**: Create Jira issues automatically when documents are generated  
✅ **Smart Linking**: Link to existing issues by title matching  
✅ **Confluence Integration**: Attach Confluence page URLs to Jira issues  
✅ **Document Updates**: Add comments to linked Jira issues when documents are regenerated  
✅ **Configurable Settings**: Customize issue types, priorities, and behavior  
✅ **Non-blocking**: Document generation continues even if Jira linkage fails  
✅ **Permission-based**: Access control for all operations  
✅ **Comprehensive Logging**: Full audit trail of Jira operations  

## 🔮 Future Enhancements

- Custom field mapping
- Bulk issue operations
- Webhook support for bidirectional sync
- Advanced workflow integration
- Issue status synchronization
- Jira issue templates
- Multi-project support

---

**Ready to demo?** Start by configuring a Jira integration and enabling the linkage feature in Settings!

