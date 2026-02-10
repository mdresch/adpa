# Jira Task Creation Verification Guide

## Overview

This guide explains how to verify that Jira issues are being automatically created when documents are generated in ADPA.

## Prerequisites

1. **Jira Integration Configured**
   - Navigate to `/integrations` page
   - Ensure Jira integration is configured with:
     - Base URL (e.g., `https://your-domain.atlassian.net`)
     - Email and API Token
     - Default Project Key
     - **Auto-create Issues** enabled (toggle switch)
   - Click "Test Connection" to verify connectivity
   - Click "Save Configuration"

2. **Verify Configuration Settings**
   - In the Jira tab, ensure:
     - `autoCreateIssues: true` (enabled)
     - `defaultProjectKey` is set (e.g., "PROJ")
     - `defaultIssueType` is set (e.g., "Task")
     - `defaultPriority` is set (e.g., "Medium")

## Verification Methods

### Method 1: Check Server Logs

When a document is generated, look for these log messages:

```bash
# Check server logs (server/logs/combined.log or terminal output)
grep -i "jira" server/logs/combined.log

# Expected log messages:
# ✅ Success:
# "Document {documentId} linked to Jira issue {issueKey}"
# "Created new Jira issue {issueKey} for document {documentId}"

# ❌ Errors:
# "Failed to link document {documentId} to Jira"
# "Auto-create disabled, skipping Jira issue creation"
# "Configured Jira integration not found or inactive"
```

### Method 2: Check Database

Query the `document_jira_links` table to see if linkages exist:

```sql
-- Check if Jira linkage exists for a document
SELECT 
  d.id as document_id,
  d.name as document_name,
  djl.jira_issue_key,
  djl.jira_issue_url,
  djl.created_at as linked_at
FROM documents d
LEFT JOIN document_jira_links djl ON d.id = djl.document_id
WHERE d.id = 'your-document-id-here'
ORDER BY djl.created_at DESC;

-- Check all documents with Jira linkages
SELECT 
  d.name as document_name,
  djl.jira_issue_key,
  djl.jira_issue_url,
  djl.created_at
FROM document_jira_links djl
JOIN documents d ON djl.document_id = d.id
ORDER BY djl.created_at DESC
LIMIT 20;
```

### Method 3: Check API Response

When generating a document via API, check the response:

```json
{
  "message": "Document generated successfully",
  "document": { ... },
  "generation": { ... },
  "jiraLinkage": {
    "issueKey": "PROJ-123",
    "issueUrl": "https://your-domain.atlassian.net/browse/PROJ-123",
    "created": true
  }
}
```

**Note:** If `jiraLinkage` is `null`, it means:
- Jira linkage is disabled
- Auto-create is disabled
- Integration not configured
- Error occurred (check logs)

### Method 4: Check Jira Directly

1. **Navigate to your Jira project**
   - Go to: `https://your-domain.atlassian.net/projects/PROJ/issues`
   - Look for issues with:
     - Summary: `Document: {Document Name}`
     - Labels: `adpa-generated`, `document`
     - Description contains: `Generated document from ADPA project`

2. **Check Issue Details**
   - Open the issue
   - Verify it has:
     - Correct issue type (Task, Story, etc.)
     - Correct priority
     - Document ID and Project ID in description
     - Confluence page link (if `linkConfluencePages` is enabled)

### Method 5: Use API Endpoint

Query the Jira linkage API directly:

```bash
# Get Jira linkage for a specific document
curl -X GET \
  "http://localhost:5000/api/jira-linkage/document/{documentId}" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected response:
{
  "success": true,
  "linkage": {
    "document_id": "...",
    "jira_issue_key": "PROJ-123",
    "jira_issue_url": "https://...",
    "created_at": "2024-01-20T10:00:00Z"
  }
}
```

### Method 6: Check Document Generation Response

When generating a document through the UI:

1. **Generate a new document** via:
   - `/projects/{id}` → "Generate New Document"
   - Select a template
   - Click "Generate"

2. **Check the response**:
   - Open browser DevTools (F12)
   - Go to Network tab
   - Find the request to `/api/document-generator/generate` or `/api/ai/generate`
   - Check the response JSON for `jiraLinkage` field

3. **If using AI Generation Job**:
   - Check the job completion response
   - The `jiraLinkage` should be included in the result

## Troubleshooting

### Issue: No Jira Issue Created

**Check 1: Integration Status**
```sql
SELECT id, type, name, is_active, configuration
FROM integrations
WHERE type = 'jira' AND is_active = true;
```

**Check 2: Configuration Settings**
```sql
SELECT setting_key, setting_value
FROM settings
WHERE setting_key IN (
  'jira_auto_create_issues',
  'jira_link_confluence_pages',
  'jira_default_issue_type',
  'jira_default_priority'
);
```

**Check 3: Server Logs**
- Look for errors in `server/logs/error.log`
- Check for authentication failures
- Verify API token is valid

### Issue: "Auto-create disabled" Error

**Solution:**
1. Go to `/integrations` → Jira tab
2. Enable "Auto-create Issues" toggle
3. Click "Save Configuration"
4. Try generating a document again

### Issue: "No default project key configured"

**Solution:**
1. Go to `/integrations` → Jira tab
2. Set "Default Project Key" (e.g., "PROJ")
3. Click "Save Configuration"
4. Try generating a document again

### Issue: "Integration not found or inactive"

**Solution:**
1. Verify Jira integration exists:
   ```sql
   SELECT * FROM integrations WHERE type = 'jira';
   ```
2. Ensure `is_active = true`
3. Re-configure if needed via `/integrations` page

## Testing Workflow

### Step-by-Step Test

1. **Configure Jira Integration**
   ```
   Navigate to: http://localhost:3000/integrations
   → Jira Tab
   → Fill in all required fields
   → Enable "Auto-create Issues"
   → Click "Test Connection" (should succeed ✅)
   → Click "Save Configuration"
   ```

2. **Generate a Test Document**
   ```
   Navigate to: http://localhost:3000/projects/{projectId}
   → Click "Generate New Document"
   → Select a template
   → Click "Generate"
   → Wait for completion
   ```

3. **Verify Creation**
   ```
   Option A: Check Database
   → Run SQL query from Method 2 above
   
   Option B: Check Jira
   → Go to Jira project
   → Look for new issue with document name
   
   Option C: Check Logs
   → Look for "Created new Jira issue" message
   ```

4. **Verify Linkage**
   ```
   Option A: API Call
   → Use Method 5 API endpoint
   
   Option B: Database Query
   → Check document_jira_links table
   ```

## Expected Behavior

### When Auto-Create is Enabled

✅ **New Document Generated**:
- Jira issue is automatically created
- Issue key stored in `document_jira_links` table
- Issue URL stored for quick access
- Confluence page linked (if enabled)

✅ **Document Already Has Issue**:
- Existing issue is found and linked
- No duplicate issue created
- Linkage updated if needed

### When Auto-Create is Disabled

❌ **No Issue Created**:
- System searches for existing issue
- If found, links to it
- If not found, returns error (non-blocking)
- Document generation still succeeds

## Additional Notes

- **Non-Blocking**: Jira linkage failures don't block document generation
- **Error Handling**: Errors are logged but don't fail the document creation
- **Confluence Linking**: If `linkConfluencePages` is enabled, Confluence page URLs are added as remote links to Jira issues
- **Issue Updates**: When documents are regenerated, Jira issues can be updated (if configured)

## Quick Verification Script

```bash
# Check recent document generations with Jira linkages
psql $DATABASE_URL -c "
SELECT 
  d.name,
  d.created_at as doc_created,
  djl.jira_issue_key,
  djl.jira_issue_url,
  djl.created_at as linked_at
FROM documents d
LEFT JOIN document_jira_links djl ON d.id = djl.document_id
WHERE d.created_at > NOW() - INTERVAL '1 day'
ORDER BY d.created_at DESC
LIMIT 10;
"
```

