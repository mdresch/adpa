# Confluence Publishing Hook Implementation

## Overview

This document describes the implementation of WA-88.3: Document Generation hook + publish job to Confluence. The feature automatically publishes generated documents to Confluence when a project is mapped to a Confluence space.

## Architecture

### Components

1. **Post-Generation Hook** (`DocumentGeneratorService.enqueueConfluencePublishing`)
   - Triggered after successful document generation
   - Checks for project Confluence mapping
   - Validates document format (markdown only)
   - Enqueues publishing job

2. **Confluence Publishing Queue** (`confluenceQueue`)
   - Dedicated Bull queue for Confluence publishing jobs
   - Configured with retries and exponential backoff
   - 2-minute timeout for publishing operations

3. **Confluence Publishing Job Service** (`PublishToConfluenceJobService`)
   - Processes Confluence publishing jobs
   - Handles page creation/updates
   - Stores Confluence page URL in document metadata

### Flow Diagram

```
Document Generation Request
         ↓
Generate Document (markdown)
         ↓
Post-Generation Hook
         ↓
Check Project Mapping ──→ No Mapping ──→ Skip Publishing
         ↓ Has Mapping
Enqueue Confluence Job
         ↓
Confluence Publishing Queue
         ↓
PublishToConfluenceJobService
         ↓
Create/Update Confluence Page
         ↓
Store Page URL in Document Metadata
```

## Implementation Details

### 1. Queue Configuration

```typescript
// Confluence Publishing Queue Options
const confluenceQueueOptions = {
  redis: bullRedisConfig,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    timeout: 120000, // 2 minutes timeout
  },
  settings: {
    lockDuration: 120000, // 2 minutes lock
    stallInterval: 30000, // Check every 30 seconds
    maxStalledCount: 2,
  }
}
```

### 2. Job Data Structure

```typescript
interface PublishToConfluenceJobData extends BaseJobData {
  documentId?: string
  projectId: string
  title: string
  markdown: string
}
```

### 3. Post-Generation Hook

The hook is triggered in `DocumentGeneratorService.generateDocument()` after successful document generation:

```typescript
// Post-generation hook: Enqueue Confluence publishing if project is mapped
await this.enqueueConfluencePublishing(response, request, user)
```

### 4. Publishing Logic

1. **Project Mapping Check**: Verifies project has `confluence_space_key` in `project_integrations` table
2. **Format Validation**: Only publishes markdown documents
3. **Content Processing**: Reads generated markdown file
4. **Title Generation**: Creates title from template name + timestamp
5. **Job Enqueueing**: Adds job to Confluence publishing queue

### 5. Confluence Integration

- Uses existing `ConfluenceService` for API operations
- Supports page creation and updates
- Handles existing page detection by title
- Stores page URL in `documents.confluence_page_url` column

## Configuration

### Environment Variables

Required for Confluence publishing:

```bash
CONFLUENCE_BASE_URL=https://your-domain.atlassian.net
CONFLUENCE_USERNAME=your-email@domain.com
CONFLUENCE_API_TOKEN=your-api-token
```

Alternative variable names (for backward compatibility):

```bash
ATLASSIAN_CONFLUENCE_BASE_URL=https://your-domain.atlassian.net
ATLASSIAN_USERNAME=your-email@domain.com
ATLASSIAN_API_TOKEN=your-api-token
```

### Project Integration Setup

Projects must have Confluence mapping configured:

```sql
INSERT INTO project_integrations (project_id, confluence_space_key, confluence_parent_page_id)
VALUES ('project-uuid', 'SPACE_KEY', 'optional-parent-page-id');
```

## Usage

### Automatic Publishing

1. Generate a markdown document with `projectId` in request data
2. Ensure project has Confluence mapping
3. Document will be automatically published to Confluence
4. Confluence page URL will be stored in document metadata

### Manual Job Enqueueing

```typescript
import { addJob } from '../services/queueService'

const jobId = await addJob(
  'confluence-publishing',
  'publish-to-confluence',
  {
    jobId: uuidv4(),
    userId: user.id,
    documentId: documentId,
    projectId: projectId,
    title: 'Document Title',
    markdown: markdownContent
  },
  {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    timeout: 120000
  }
)
```

## Error Handling

### Retry Logic

- **Attempts**: 3 retries with exponential backoff
- **Backoff**: Starting at 2 seconds, doubling each retry
- **Timeout**: 2 minutes per attempt

### Error Scenarios

1. **No Project Mapping**: Job returns `{ success: false }` without error
2. **Missing Credentials**: Job returns `{ success: false }` with warning log
3. **Confluence API Errors**: Job throws error, triggers retry
4. **Network Issues**: Job throws error, triggers retry

### Graceful Degradation

- Document generation never fails due to Confluence publishing issues
- Publishing failures are logged but don't affect document generation
- Missing credentials result in warning logs, not errors

## Monitoring and Metrics

### Logging

All operations include structured logging:

```typescript
logger.info(`[PUBLISH-CONFLUENCE] Published page for project ${projectId}: ${url}`, {
  pageId: page.id,
  spaceKey,
  processingTimeMs: processingTime,
  title
})
```

### Metrics Tracked

- Job processing time
- Success/failure rates
- Page creation vs. updates
- Queue depth and processing rates

### Queue Events

```typescript
confluenceQueue.on("completed", (job, result) => {
  logger.info(`Confluence publishing job completed: ${job.id}`, { pageUrl: result?.pageUrl })
})

confluenceQueue.on("failed", (job, err) => {
  logger.error(`Confluence publishing job failed: ${job.id}`, err)
})
```

## Testing

### Test Script

Run the test script to verify the implementation:

```bash
cd server
npm run ts-node scripts/test-confluence-publishing.ts
```

### Test Environment Variables

```bash
TEST_CONFLUENCE_SPACE_KEY=TEST  # Optional, defaults to 'TEST'
```

### Manual Testing

1. Set up Confluence credentials
2. Create a project with Confluence mapping
3. Generate a markdown document with the project ID
4. Verify document appears in Confluence space
5. Check document metadata for Confluence URL

## Database Schema

### Documents Table

```sql
ALTER TABLE documents ADD COLUMN IF NOT EXISTS confluence_page_url TEXT;
CREATE INDEX IF NOT EXISTS idx_documents_confluence_page_url ON documents(confluence_page_url);
```

### Project Integrations Table

```sql
-- Existing table structure
CREATE TABLE project_integrations (
  project_id UUID PRIMARY KEY,
  confluence_space_key TEXT,
  confluence_parent_page_id TEXT,
  -- other fields...
);
```

## Security Considerations

1. **API Token Security**: Store Confluence API tokens securely
2. **Access Control**: Verify user permissions before publishing
3. **Content Validation**: Sanitize markdown content before publishing
4. **Rate Limiting**: Respect Confluence API rate limits

## Future Enhancements

1. **Format Support**: Extend to support PDF and DOCX publishing
2. **Template Mapping**: Map document templates to specific Confluence templates
3. **Batch Publishing**: Support publishing multiple documents in a single job
4. **Webhook Integration**: Add webhooks for publishing status updates
5. **Content Synchronization**: Bi-directional sync between ADPA and Confluence

## Troubleshooting

### Common Issues

1. **Job Stuck in Queue**: Check Redis connection and worker processes
2. **Authentication Failures**: Verify Confluence credentials
3. **Permission Errors**: Ensure API token has space write permissions
4. **Content Formatting**: Check markdown to Confluence storage conversion

### Debug Commands

```bash
# Check queue status
npm run ts-node scripts/check-queues.ts

# View job details
npm run ts-node scripts/inspect-job.ts <job-id>

# Test Confluence connection
npm run ts-node scripts/test-confluence-connection.ts
```

## Definition of Done ✅

- [x] Add post-generation hook in documentGenerator service/route
- [x] Implement Bull job for publishToConfluence with retries/backoff
- [x] Store Confluence page URL on document metadata
- [x] Successful publish to a test space (via test script)
- [x] Job retries on transient errors (3 attempts with exponential backoff)
- [x] Metrics/logs emitted (structured logging with processing times)

## Related Documentation

- [Confluence Integration Guide](../05-integrations/CONFLUENCE_INTEGRATION_COMPLETE.md)
- [Queue System Architecture](../07-architecture/BULL_QUEUES_COMPLETE_GUIDE.md)
- [Document Generation Service](../06-features/DOCUMENT_GENERATION_METHODS.md)