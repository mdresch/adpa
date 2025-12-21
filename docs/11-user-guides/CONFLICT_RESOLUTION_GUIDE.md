# Conflict Resolution Guide for Document Regeneration

## Table of Contents
- [Overview](#overview)
- [Conflict Detection](#conflict-detection)
- [Template Conflict Resolution Strategies](#template-conflict-resolution-strategies)
- [Conflict Resolution Methods](#conflict-resolution-methods)
- [WebSocket Events](#websocket-events)
- [Step-by-Step Conflict Resolution](#step-by-step-conflict-resolution)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

The ADPA system includes an advanced conflict-aware document regeneration workflow that detects and resolves template conflicts in real-time. This guide explains how conflict detection and resolution works, the different strategies and methods available, and how to effectively manage conflicts during document creation and regeneration.

## Conflict Detection

### What is a Template Conflict?
A template conflict occurs when you attempt to create or regenerate a document using a template that is already in use within the same project. The system detects these conflicts to:

- Prevent accidental duplication of critical documents
- Maintain document version integrity
- Ensure proper audit trails
- Provide users with control over how conflicts are resolved

### When Conflicts Are Detected
Conflicts are detected in the following scenarios:

1. **Document Creation**: When creating a new document from a template that's already used in the project
2. **Document Regeneration**: When regenerating an existing document using a different template that conflicts with other documents
3. **Version Creation**: When creating a new version of an existing document that would cause template conflicts

## Template Conflict Resolution Strategies

Templates can be configured with different conflict resolution strategies that determine how the system handles conflicts:

| Strategy | Behavior | When to Use |
|----------|----------|-------------|
| `deny` | Blocks document creation/regeneration and shows an error | Critical templates that should never have duplicates (e.g., Project Charter, Master Plan)
| `auto_create_new` | Automatically creates a new document with a modified name | Non-critical templates where multiple versions are acceptable (e.g., Meeting Minutes, Status Reports)
| `auto_overwrite` | Automatically overwrites the existing document | Templates where only the latest version should exist (e.g., Current Budget, Active Risk Register)
| `prompt_user` | Shows a conflict resolution dialog to the user | Most templates where user input is valuable for decision making

## Conflict Resolution Methods

When the `prompt_user` strategy is used, you'll see a conflict resolution dialog with these options:

| Method | Description | Outcome |
|--------|-------------|---------|
| **Create New Version** | Creates a new version of the existing document | - Preserves version history
- Updates the existing document
- Maintains the same document ID
- Increments version number (e.g., v1.1 → v1.2)
| **Create Separate Document** | Creates a completely new document with a modified name | - Creates a new document with new ID
- Original document remains unchanged
- New document appears in the document library
- Useful for alternative versions or different approaches
| **View Existing Document** | Opens the existing document in the viewer | - No changes are made
- You can review the existing document
- You can decide later how to proceed
| **Overwrite** | Replaces the existing document completely | - Existing content is replaced
- Version history may be lost
- Use with caution
| **Merge** | Combines content from both documents | - Creates a new version with merged content
- Requires manual review of changes
| **Archive Existing** | Archives the existing document and creates a new one | - Existing document is marked as archived
- New document is created
- Useful when replacing outdated documents
| **Cancel** | Cancels the operation | - No changes are made
- You can choose a different template or modify your request

## WebSocket Events

The conflict-aware regeneration workflow uses real-time WebSocket events to keep you informed:

| Event | Description | When Triggered | Payload |
|-------|-------------|----------------|---------|
| `document:regeneration:conflict_detected` | A template conflict has been detected during regeneration | When a template conflict is found during document regeneration | `jobId`, `conflictId`, `conflictDetails`, `resolutionOptions` |
| `document:conflict_detected` | A template conflict has been detected during document creation | When a template conflict is found during new document creation | `conflictId`, `templateId`, `templateName`, `projectId`, `existingDocumentCount`, `resolutionOptions` |
| `document:conflict_resolved` | A conflict has been successfully resolved | After a user selects a resolution method or an auto-resolution occurs | `conflictId`, `resolutionMethod`, `documentId`, `newVersionId` |
| `document:regeneration:completed` | Document regeneration has completed successfully | After conflict resolution and document processing is finished | `jobId`, `versionId`, `versionNumber`, `documentName` |

## Step-by-Step Conflict Resolution

### Resolving Conflicts During Document Creation

1. **Start Document Creation**: Click "Generate Document" and select a template
2. **Conflict Detected**: If a conflict exists, you'll see the Template Conflict Dialog
3. **Review Conflict**: The dialog shows:
   - The template name that's causing the conflict
   - The existing document that uses this template
   - The project where the conflict exists
4. **Choose Resolution**: Select one of the available resolution methods
5. **Confirm Selection**: Click the appropriate button to resolve the conflict
6. **Document Created**: The system creates the document according to your selected method

### Resolving Conflicts During Document Regeneration

1. **Start Regeneration**: Click "Create new Version" or "Regenerate" on an existing document
2. **Select Template**: Choose a different template for regeneration
3. **Conflict Detected**: If a conflict exists with the new template, you'll receive a real-time notification
4. **Review Options**: The Template Conflict Dialog appears with resolution options
5. **Choose Resolution**: Select how you want to handle the conflict
6. **Regeneration Completes**: The system processes your request and creates the appropriate version

## Best Practices

### For Template Designers
1. **Choose Appropriate Strategies**: Select the conflict resolution strategy that best fits the template's purpose
2. **Use `deny` for Critical Documents**: Prevent accidental duplication of essential documents
3. **Use `prompt_user` for Most Cases**: Give users control over how conflicts are resolved
4. **Document Template Purpose**: Clearly describe what each template is for and when it should be used

### For Document Creators
1. **Review Conflicts Carefully**: Before resolving conflicts, review the existing document to understand what content already exists
2. **Use Versioning for Iterative Work**: When refining documents, use "Create New Version" to maintain history
3. **Create Separate Documents for Alternatives**: When exploring different approaches, use "Create Separate Document"
4. **Communicate Changes**: When overwriting or archiving documents, inform stakeholders about the changes
5. **Monitor WebSocket Notifications**: Pay attention to real-time notifications about conflict resolution and regeneration completion

### For Project Managers
1. **Establish Document Naming Conventions**: Create clear naming guidelines to reduce confusion
2. **Define Document Ownership**: Assign responsibility for critical documents to specific team members
3. **Review Conflict Resolutions**: Monitor how conflicts are resolved to ensure consistency
4. **Train Team Members**: Ensure all team members understand conflict resolution processes

## Troubleshooting

### Common Issues and Solutions

**Issue: Conflict dialog doesn't appear**
- *Cause*: WebSocket connection may be disrupted
- *Solution*: Refresh the page and try again. Check your network connection.

**Issue: Regeneration seems stuck**
- *Cause*: Background job may be processing or stuck
- *Solution*: Wait a few moments and refresh the document list. If the issue persists, contact support with the job ID.

**Issue: Unexpected document appears after conflict resolution**
- *Cause*: You may have selected "Create Separate Document" instead of "Create New Version"
- *Solution*: Check the document library for the newly created document and archive/delete if not needed.

**Issue: Conflict detected but no existing document is shown**
- *Cause*: The conflict may be with a document in a different project or the template may be restricted
- *Solution*: Contact your administrator to check template restrictions and cross-project conflicts.

**Issue: WebSocket notifications aren't appearing**
- *Cause*: Browser may be blocking WebSocket connections or the WebSocket service may be down
- *Solution*: Refresh the page, check browser settings, or contact IT support.

### Error Messages

| Error Message | Meaning | Recommended Action |
|---------------|---------|---------------------|
| "Template conflict detected" | A template is already in use in this project | Review the conflict dialog and choose a resolution method |
| "Conflict resolution failed" | The system couldn't complete your selected resolution method | Try a different resolution method or contact support |
| "Document regeneration failed" | The regeneration process encountered an error | Check error details and try again, or contact support with the job ID |
| "Template is restricted" | The template cannot be used due to administrative restrictions | Choose a different template or contact your administrator |

## Frequently Asked Questions

**Q: What happens if I ignore a conflict?**
A: If you select "Cancel" in the conflict dialog, no document will be created or modified. You can choose a different template or modify your document name to avoid the conflict.

**Q: Can I change the conflict resolution strategy for a template?**
A: Template strategies are set by template designers and administrators. Contact your administrator if you believe a strategy should be changed.

**Q: How do I know which resolution method to choose?**
A: Consider the purpose of the document and your intent:
- Choose "Create New Version" when improving or updating an existing document
- Choose "Create Separate Document" when creating alternative versions or different approaches
- Choose "Overwrite" only when you're certain you want to replace the existing content completely
- Choose "Merge" when you want to combine content from multiple sources

**Q: Are conflicts detected across different projects?**
A: No, template conflicts are only detected within the same project. Different projects can use the same templates without conflicts.

**Q: What happens to the version history when I overwrite a document?**
A: When you overwrite a document, the previous content may be lost. If you want to preserve version history, use "Create New Version" instead.

**Q: Can I resolve conflicts after the document has been created?**
A: Once a document is created, conflicts are resolved. However, you can always create new versions, merge content, or archive documents as needed.

**Q: How do WebSocket events help with conflict resolution?**
A: WebSocket events provide real-time notifications about:
- When conflicts are detected
- When conflicts are resolved
- When document regeneration completes
This allows you to stay informed about the status of your documents without refreshing the page.