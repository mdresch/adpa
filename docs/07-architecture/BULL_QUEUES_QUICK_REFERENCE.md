# Bull Queues - Quick Reference

## Common Commands

```bash
# Cleanup
npm run cleanup:queues          # General cleanup (daily)
npm run cleanup:force           # Force fix stuck jobs
npm run cleanup:final           # Final database update
npm run cleanup:remove-queues   # Remove specific jobs
npm run cleanup:aggressive      # Aggressive cleanup
```

## Queue Names

- `ai-processing` - AI text generation
- `document-processing` - Document operations
- `pipeline-processing` - Multi-stage pipelines
- `baseline-processing` - Baseline snapshots
- `process-flow-processing` - Process flow execution
- `document-regeneration` - Document regeneration
- `quality-audit` - Quality checks
- `project-data-extraction` - Data extraction

## Job Types

- `ai-generate` → `ai-processing`
- `document-convert` → `document-processing`
- `pipeline-processing` → `pipeline-processing`
- `baseline-extract` → `baseline-processing`
- `process-flow` → `process-flow-processing`
- `document-regeneration` → `document-regeneration`
- `quality-audit` → `quality-audit`
- `extract-project-data` → `project-data-extraction`

## Adding a Job

```typescript
import { addJob } from '../services/queueService'

const jobId = await addJob('ai-generate', {
  jobId: uuidv4(),
  userId: 'user-123',
  projectId: 'project-456',
  templateId: 'template-789',
  variables: { projectName: 'My Project' },
})
```

## Processing a Job

```typescript
import { updateJobStatus } from '../services/queueService'

queue.process('job-type', 1, async (job) => {
  const { jobId } = job.data
  
  try {
    await updateJobStatus(jobId, 'processing', 10)
    // Do work
    await updateJobStatus(jobId, 'completed', 100)
    return result
  } catch (error: any) {
    await updateJobStatus(jobId, 'failed', 0, undefined, undefined, error.message)
    throw error
  }
})
```

## Job States

- `pending` - Created, not yet queued
- `processing` - Currently being processed
- `completed` - Finished successfully
- `failed` - Failed after all retries
- `cancelled` - Manually cancelled

## Bull Queue States

- `waiting` - Queued, waiting for worker
- `active` - Currently being processed
- `completed` - Finished successfully
- `failed` - Failed after all retries
- `delayed` - Scheduled for future
- `stalled` - Worker died/crashed

## Troubleshooting

### Jobs Stuck in Processing

```bash
npm run cleanup:force
```

### Jobs Not Being Processed

1. Check workers are running
2. Check server logs
3. Verify processor registered

### High Memory Usage

```bash
npm run cleanup:queues
```

## Database Queries

```sql
-- Stuck jobs
SELECT id, type, started_at, error_message
FROM jobs
WHERE status = 'processing'
AND started_at < NOW() - INTERVAL '1 hour';

-- Failed jobs
SELECT id, type, error_message, created_at
FROM jobs
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 10;
```

## Configuration Template

```typescript
const queueOptions = {
  redis: bullRedisConfig,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    timeout: 600000, // 10 minutes
  },
  settings: {
    lockDuration: 600000,
    stallInterval: 30000,
    maxStalledCount: 2,
  },
}

export const myQueue = new Bull('my-queue', queueOptions)
```

---

**See**: [BULL_QUEUES_COMPLETE_GUIDE.md](./BULL_QUEUES_COMPLETE_GUIDE.md) for full documentation.

