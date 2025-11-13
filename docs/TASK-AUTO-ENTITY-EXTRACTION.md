# Automatic Entity Extraction on Document Creation

## Overview

This feature automatically triggers AI-powered entity extraction whenever a new document is created in the system. Entities (stakeholders, risks, requirements, milestones, etc.) are extracted from the document content and stored in the database without requiring manual intervention.

## Implementation Details

### When Extraction Triggers

Entity extraction automatically triggers when:
- A document is created via `POST /api/documents/project/:projectId`
- A document is created via `POST /api/projects/:projectId/documents`
- A document is created via `POST /api/ai/generate` (AI generation with auto-save)
- A document is created via the AI generation job queue (`ai-generate` job type)
- The document has non-empty content (Markdown text)
- The document is associated with a project (`project_id` is not null)

### How It Works

1. **Document Creation**: User creates a document with content
2. **Job Creation**: System creates a background job record in the `jobs` table
3. **Queue Enqueue**: Extraction job is added to the `extractionQueue` (Bull queue)
4. **Async Processing**: Extraction runs asynchronously without blocking the API response
5. **Entity Extraction**: AI extracts all entity types from the document:
   - Stakeholders
   - Requirements
   - Risks
   - Milestones
   - Constraints
   - Success Criteria
   - Best Practices
   - Phases
   - Resources
   - Technologies
   - Quality Standards
   - Deliverables
   - Scope Items
   - Activities
   - Team Agreements (PMBOK 8)
   - Development Approaches (PMBOK 8)
   - Project Iterations (PMBOK 8)
   - Work Items (PMBOK 8)
   - Capacity Plans (PMBOK 8)
   - Performance Measurements (PMBOK 8)
   - Earned Value Metrics (PMBOK 8)
   - Opportunities (PMBOK 8)
   - Risk Responses (PMBOK 8)
   - Performance Actuals (PMBOK 8)

### Key Features

- **Non-Blocking**: Document creation returns immediately; extraction runs in background
- **Resilient**: Extraction failures don't prevent document creation
- **Targeted**: Only extracts from the newly created document (not all project documents)
- **Trackable**: Extraction job is recorded in `jobs` table with status tracking
- **Automatic**: No user action required - happens automatically

### Code Changes

#### `server/src/routes/documents.ts`
- Added import: `import { extractionQueue } from "../services/queueService"`
- Added automatic extraction trigger after document creation (lines 964-1015)

#### `server/src/routes/projects.ts`
- Added import: `import { extractionQueue } from "../services/queueService"`
- Added automatic extraction trigger after document creation (lines 466-517)

#### `server/src/routes/ai.ts`
- Added automatic extraction trigger when documents are auto-saved via AI generation endpoint

#### `server/src/services/queueService.ts` ⭐ **NEW**
- Added automatic extraction trigger in `ai-generate` job processor (lines 417-474)
- Triggers extraction when documents are created via AI generation job queue
- Includes proper error handling and logging
- Links extraction job back to source AI generation job via `sourceJobId`

### Job Metadata

Extraction jobs include metadata:
```json
{
  "projectId": "uuid",
  "documentIds": ["document-uuid"], // Only the newly created document
  "autoTriggered": true,
  "sourceDocumentId": "uuid",
  "sourceDocumentName": "Document Name",
  "sourceJobId": "uuid" // For AI-generated documents, links back to ai-generate job
}
```

### Error Handling

- Extraction failures are logged but don't affect document creation
- Errors are captured in job records for debugging
- System continues to function normally even if extraction fails

### Monitoring

- Check extraction status: `GET /api/project-data-extraction/status/:jobId`
- View extraction results: `GET /api/project-data-extraction/results/:projectId`
- Monitor jobs: Query `jobs` table with `type = 'project-data-extraction'`

### Performance Considerations

- Extraction runs asynchronously via Bull queue
- Uses Redis-backed job queue for scalability
- Multiple workers can process extraction jobs in parallel
- Extraction typically takes 2-5 minutes depending on document size

### Future Enhancements

- [ ] Add option to disable automatic extraction per document
- [ ] Add extraction progress notifications via WebSocket
- [ ] Support incremental extraction on document updates
- [ ] Add extraction retry logic with exponential backoff
- [ ] Cache extraction results to avoid re-extracting unchanged content

## Testing

### Manual Testing

1. Create a new document with content:
```bash
POST /api/documents/project/:projectId
{
  "name": "Test Document",
  "content": "# Project Charter\n\n## Stakeholders\n- John Doe (Project Manager)\n\n## Risks\n- Technical risk: System integration challenges"
}
```

2. Check extraction job status:
```bash
GET /api/project-data-extraction/status/:jobId
```

3. Verify extracted entities:
```bash
GET /api/project-data-extraction/results/:projectId
```

### Expected Behavior

- Document is created successfully
- Extraction job is created and enqueued
- Entities are extracted and saved to database
- Job status updates to "completed" when finished

## Related Documentation

- [Entity Extraction Service](../server/src/services/projectDataExtractionService.ts)
- [Queue Service](../server/src/services/queueService.ts)
- [Project Data Extraction API](../server/src/routes/projectDataExtraction.ts)

