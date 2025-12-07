# Bull Queues - Complete Operations Guide

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [How Bull Queues Work](#how-bull-queues-work)
4. [Queue Configuration](#queue-configuration)
5. [Job Lifecycle](#job-lifecycle)
6. [Regular Maintenance](#regular-maintenance)
7. [Implementing New Queues](#implementing-new-queues)
8. [Adding New Workers](#adding-new-workers)
9. [Hooking New Processing Items](#hooking-new-processing-items)
10. [Best Practices](#best-practices)
11. [Troubleshooting](#troubleshooting)
12. [Monitoring & Observability](#monitoring--observability)

---

## Overview

**Bull** is a Redis-based queue system for Node.js that handles distributed job processing. In ADPA, Bull queues manage background tasks like AI generation, document processing, data extraction, and more.

### Key Concepts

- **Queue**: A named channel for jobs (e.g., `ai-processing`, `document-processing`)
- **Job**: A unit of work with data and options
- **Worker**: A process that processes jobs from a queue
- **Redis**: The backend storage for queues (job state, locks, etc.)
- **Database**: PostgreSQL stores job records for persistence and tracking

### Why Bull?

- **Reliability**: Jobs persist in Redis, survive server restarts
- **Scalability**: Multiple workers can process jobs in parallel
- **Retry Logic**: Built-in retry with exponential backoff
- **Priority**: Support for job priorities
- **Delayed Jobs**: Schedule jobs for future execution
- **Rate Limiting**: Control job processing rate
- **Job Progress**: Track job completion percentage

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Express Backend Server                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   API Route  │  │  Service     │  │  Controller  │     │
│  │   Handler    │→ │  Layer       │→ │  Logic       │     │
│  └──────────────┘  └──────┬───────┘  └──────────────┘     │
│                            │                                │
│                            ↓                                │
│                   ┌─────────────────┐                       │
│                   │  queueService   │                       │
│                   │  (addJob)       │                       │
│                   └────────┬────────┘                       │
└────────────────────────────┼────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                    Bull Queue (Redis)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Waiting   │  │   Active     │  │   Completed  │     │
│  │   Jobs      │→ │   Jobs       │→ │   Jobs       │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │   Delayed    │  │   Failed     │                        │
│  │   Jobs      │  │   Jobs       │                        │
│  └──────────────┘  └──────────────┘                        │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                    Worker Process                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Queue     │  │   Processor  │  │   Business   │     │
│  │   Listener  │→ │   Function   │→ │   Logic      │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL Database                       │
│  ┌──────────────┐                                           │
│  │   jobs       │  ← Job status, progress, errors          │
│  │   table      │                                           │
│  └──────────────┘                                           │
└─────────────────────────────────────────────────────────────┘
```

### Queue Types in ADPA

| Queue Name | Purpose | Concurrency | Timeout |
|------------|---------|-------------|---------|
| `ai-processing` | AI text generation | 1 | 10 min |
| `document-processing` | Document operations | 1 | 5 min |
| `pipeline-processing` | Multi-stage pipelines | 1 | 10 min |
| `baseline-processing` | Baseline snapshots | 1 | 5 min |
| `process-flow-processing` | Process flow execution | 1 | 30 min |
| `document-regeneration` | Document regeneration | 1 | 10 min |
| `quality-audit` | Quality checks | 1 | 5 min |
| `project-data-extraction` | Data extraction | 1 | 10 min |

---

## How Bull Queues Work

### Job States

A job moves through these states:

1. **Waiting**: Job is queued, waiting to be processed
2. **Active**: Job is currently being processed by a worker
3. **Completed**: Job finished successfully
4. **Failed**: Job failed after all retry attempts
5. **Delayed**: Job scheduled for future execution
6. **Stalled**: Job was active but worker died/crashed

### Job Flow

```
1. API Request → addJob() → Job added to Redis queue (WAITING)
                                    ↓
2. Worker picks up job → Job moves to ACTIVE
                                    ↓
3. Processor function executes → Updates progress
                                    ↓
4a. Success → Job moves to COMPLETED → Removed after retention period
4b. Failure → Retry with backoff → After max attempts → FAILED
4c. Worker crash → Job detected as STALLED → Moved to FAILED
```

### Redis Storage

Bull stores jobs in Redis using these key patterns:

- `bull:{queueName}:wait` - Waiting jobs (sorted set)
- `bull:{queueName}:active` - Active jobs (sorted set)
- `bull:{queueName}:completed` - Completed jobs (sorted set)
- `bull:{queueName}:failed` - Failed jobs (sorted set)
- `bull:{queueName}:delayed` - Delayed jobs (sorted set)
- `bull:{queueName}:{jobId}` - Job data (hash)
- `bull:{queueName}:{jobId}:lock` - Job lock (for active jobs)

### Database Integration

ADPA maintains a `jobs` table in PostgreSQL that:

- **Tracks job status** (pending, processing, completed, failed, cancelled)
- **Stores job metadata** (type, data, result, error messages)
- **Records progress** (0-100%)
- **Links to entities** (project_id, document_id, user_id)
- **Enables querying** (filter by status, type, user, date)

**Important**: The database is the source of truth for job status in the UI. Bull queues are the execution engine.

---

## Queue Configuration

### Basic Queue Setup

```typescript
import Bull from 'bull'

const redisConfig = {
  host: 'localhost',
  port: 6379,
  password: undefined,
  maxRetriesPerRequest: null, // Important for cloud Redis
  enableReadyCheck: false,
}

const queueOptions = {
  redis: redisConfig,
  defaultJobOptions: {
    removeOnComplete: 100,  // Keep last 100 completed jobs
    removeOnFail: 50,       // Keep last 50 failed jobs
    attempts: 3,            // Retry 3 times on failure
    backoff: {
      type: 'exponential',  // or 'fixed'
      delay: 2000,          // Initial delay (ms)
    },
    timeout: 600000,        // 10 minutes timeout
  },
  settings: {
    lockDuration: 600000,   // Lock duration (ms)
    stallInterval: 30000,   // Check for stalls every 30s
    maxStalledCount: 2,     // Max stalls before failing
  },
}

export const myQueue = new Bull('my-queue-name', queueOptions)
```

### Configuration Options Explained

#### `defaultJobOptions`

- **`removeOnComplete`**: Number of completed jobs to keep in Redis (0 = keep all, false = remove immediately)
- **`removeOnFail`**: Number of failed jobs to keep in Redis
- **`attempts`**: Maximum retry attempts
- **`backoff`**: Retry strategy
  - `type: 'exponential'` - Delay doubles each retry (2s, 4s, 8s)
  - `type: 'fixed'` - Fixed delay between retries
  - `delay`: Initial delay in milliseconds
- **`timeout`**: Maximum job execution time (milliseconds)
- **`priority`**: Job priority (higher = processed first)
- **`delay`**: Delay before processing (milliseconds)

#### `settings`

- **`lockDuration`**: How long a job is locked when active (prevents multiple workers from processing same job)
- **`stallInterval`**: How often to check for stalled jobs (jobs that are active but worker died)
- **`maxStalledCount`**: How many times a job can be detected as stalled before failing

### Redis Configuration

For cloud Redis (Railway, Vercel KV, etc.):

```typescript
function parseBullRedisConfig() {
  const redisUrl = process.env.REDIS_URL // e.g., rediss://default:password@host:port
  
  if (!redisUrl) {
    return { host: 'localhost', port: 6379 }
  }
  
  const url = new URL(redisUrl)
  return {
    host: url.hostname,
    port: parseInt(url.port) || 6379,
    password: url.password || undefined,
    username: url.username !== 'default' ? url.username : undefined,
    tls: url.protocol === 'rediss:' ? { rejectUnauthorized: false } : undefined,
    maxRetriesPerRequest: null, // Critical for cloud Redis
    enableReadyCheck: false,
  }
}
```

---

## Job Lifecycle

### Adding a Job

```typescript
import { addJob } from '../services/queueService'

// Simple job
const jobId = await addJob('ai-generate', {
  jobId: uuidv4(),
  projectId: 'project-123',
  userId: 'user-456',
  templateId: 'template-789',
  variables: { projectName: 'My Project' },
})

// Job with options
const jobId = await addJob('ai-generate', jobData, {
  priority: 10,        // Higher priority
  delay: 5000,         // Wait 5 seconds
  attempts: 5,         // Override default attempts
  removeOnComplete: true, // Remove immediately on success
})
```

### Processing a Job

```typescript
// Register processor
myQueue.process('job-type', concurrency, async (job) => {
  const { jobId, data } = job.data
  
  try {
    // Update status to processing
    await updateJobStatus(jobId, 'processing', 10)
    
    // Do work
    const result = await doWork(data)
    
    // Update progress
    await job.progress(50)
    
    // More work
    await doMoreWork(result)
    
    // Complete
    await updateJobStatus(jobId, 'completed', 100)
    return result
  } catch (error) {
    // Update status to failed
    await updateJobStatus(jobId, 'failed', 0, undefined, undefined, error.message)
    throw error // Bull will retry if attempts remain
  }
})
```

### Job Events

```typescript
// Listen to job events
job.on('progress', (progress) => {
  console.log(`Job ${job.id} progress: ${progress}%`)
})

job.on('completed', (result) => {
  console.log(`Job ${job.id} completed:`, result)
})

job.on('failed', (error) => {
  console.log(`Job ${job.id} failed:`, error.message)
})

// Queue-level events
queue.on('completed', (job, result) => {
  console.log(`Job ${job.id} completed`)
})

queue.on('failed', (job, error) => {
  console.log(`Job ${job.id} failed:`, error.message)
})

queue.on('stalled', (job) => {
  console.log(`Job ${job.id} stalled`)
})
```

---

## Regular Maintenance

### Daily Maintenance

Run these scripts daily to keep queues healthy:

```bash
# Clean up old completed/failed jobs
cd server
npm run cleanup:queues
```

**What it does:**
- Removes completed jobs older than 30 days (keeps last 100)
- Removes failed jobs older than 7 days
- Removes stuck jobs in "active" state for > 60 minutes
- Cleans up orphaned jobs (in queue but not in database)

### Weekly Maintenance

```bash
# Force cleanup of stuck jobs
npm run cleanup:force

# Remove specific jobs from all queues
npm run cleanup:remove-queues
```

### Monitoring Queue Health

Check queue metrics:

```typescript
const counts = await queue.getJobCounts()
console.log({
  waiting: counts.waiting,
  active: counts.active,
  completed: counts.completed,
  failed: counts.failed,
  delayed: counts.delayed,
})
```

### Common Maintenance Tasks

1. **Clean Stuck Jobs**: Jobs stuck in "active" state
   ```bash
   npm run cleanup:force
   ```

2. **Remove Old Jobs**: Free up Redis memory
   ```bash
   npm run cleanup:queues
   ```

3. **Fix Inconsistent States**: Jobs marked "processing" but have errors
   ```bash
   npm run cleanup:final
   ```

4. **Clear Specific Jobs**: Remove known problematic jobs
   ```bash
   npm run cleanup:remove-queues
   ```

### Maintenance Scripts

All cleanup scripts are in `server/scripts/`:

- `cleanup-all-queues.ts` - General cleanup (old jobs, stuck jobs)
- `force-cleanup-stuck-jobs.ts` - Force fix inconsistent job states
- `final-job-cleanup.ts` - Final database update for stuck jobs
- `remove-jobs-from-all-queues.ts` - Remove specific jobs from all queue states

---

## Implementing New Queues

### Step 1: Define Queue Configuration

In `server/src/services/queueService.ts`:

```typescript
// 1. Define queue options
const myNewQueueOptions = {
  redis: bullRedisConfig,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    timeout: 300000, // 5 minutes
  },
  settings: {
    lockDuration: 300000, // 5 minutes
    stallInterval: 30000, // 30 seconds
    maxStalledCount: 2,
  },
}

// 2. Create queue instance
export const myNewQueue = new Bull('my-new-queue', myNewQueueOptions)
```

### Step 2: Register Processor

```typescript
// Register processor for job type
myNewQueue.process('my-job-type', 1, async (job) => {
  const { jobId, data } = job.data
  
  try {
    // Update database status
    await updateJobStatus(jobId, 'processing', 10)
    
    // Do work
    const result = await processMyJob(data)
    
    // Update progress
    await job.progress(50)
    await updateJobStatus(jobId, 'processing', 50)
    
    // Complete
    await updateJobStatus(jobId, 'completed', 100)
    return result
  } catch (error: any) {
    await updateJobStatus(jobId, 'failed', 0, undefined, undefined, error.message)
    throw error
  }
})
```

### Step 3: Add Job Function

```typescript
// Add to QUEUE_TYPE_MAP
const QUEUE_TYPE_MAP: Record<string, string> = {
  'my-job-type': 'my-new-queue',
  // ... other mappings
}

// Add to addJob function
export async function addJob(
  type: string,
  data: any,
  options?: Bull.JobOptions
): Promise<string> {
  const queueName = QUEUE_TYPE_MAP[type] || 'ai-processing'
  const queue = getQueueByName(queueName)
  
  // Create database record first
  const jobId = data.jobId || uuidv4()
  await pool.query(
    `INSERT INTO jobs (id, type, status, data, created_by, project_id, document_id)
     VALUES ($1, $2, 'pending', $3, $4, $5, $6)`,
    [jobId, type, JSON.stringify(data), data.userId, data.projectId, data.documentId]
  )
  
  // Add to Bull queue
  await queue.add(type, { ...data, jobId }, options)
  
  return jobId
}
```

### Step 4: Export Queue

```typescript
// Export queue for use in other modules
export { myNewQueue }
```

### Step 5: Add to Cleanup Scripts

Update `server/scripts/cleanup-all-queues.ts`:

```typescript
const QUEUE_CONFIGS = [
  { name: 'my-new-queue', displayName: 'My New Queue' },
  // ... other queues
]
```

---

## Adding New Workers

### What is a Worker?

A **worker** is a Node.js process that processes jobs from Bull queues. In ADPA, workers run in the same process as the Express server, but you can run them separately for scaling.

### In-Process Workers (Current Setup)

Workers are registered when the server starts:

```typescript
// In queueService.ts
myQueue.process('job-type', 1, async (job) => {
  // Processor function
})
```

The `1` is the **concurrency** - how many jobs this worker processes simultaneously.

### Separate Worker Process

For production scaling, run workers separately:

**`server/src/worker.ts`**:

```typescript
import dotenv from 'dotenv'
import path from 'path'
import { myNewQueue } from './services/queueService'

dotenv.config({ path: path.join(__dirname, '../.env') })

// Register processors
myNewQueue.process('my-job-type', 1, async (job) => {
  // Process job
})

console.log('Worker started, waiting for jobs...')
```

**Run worker**:

```bash
# Development
tsx src/worker.ts

# Production
node dist/worker.js
```

### Worker Best Practices

1. **Error Handling**: Always catch errors and update database
2. **Progress Updates**: Update progress regularly for long-running jobs
3. **Database Sync**: Keep database status in sync with Bull state
4. **Graceful Shutdown**: Handle SIGTERM to finish current jobs
5. **Health Checks**: Monitor worker health

### Worker ID

Each worker has a unique ID:

```typescript
const WORKER_ID = `worker-${process.pid}-${Date.now()}`

// Use in updateJobStatus
await updateJobStatus(jobId, 'processing', 10, WORKER_ID, 'my-new-queue')
```

This helps track which worker is processing which job.

---

## Hooking New Processing Items

### Adding a New Job Type to Existing Queue

If you want to add a new job type to an existing queue (e.g., `ai-processing`):

```typescript
// 1. Register processor
aiQueue.process('my-new-ai-job', 1, async (job) => {
  const { jobId, data } = job.data
  
  try {
    await updateJobStatus(jobId, 'processing', 10)
    
    // Your processing logic
    const result = await processNewAITask(data)
    
    await updateJobStatus(jobId, 'completed', 100)
    return result
  } catch (error: any) {
    await updateJobStatus(jobId, 'failed', 0, undefined, undefined, error.message)
    throw error
  }
})

// 2. Add to QUEUE_TYPE_MAP
const QUEUE_TYPE_MAP: Record<string, string> = {
  'my-new-ai-job': 'ai-processing',
  // ... other mappings
}

// 3. Use addJob to queue it
await addJob('my-new-ai-job', {
  jobId: uuidv4(),
  userId: 'user-123',
  // ... other data
})
```

### Adding Processing to API Route

```typescript
// In your API route
router.post('/api/my-endpoint', authenticateToken, async (req, res) => {
  const { projectId, data } = req.body
  
  // Create job
  const jobId = await addJob('my-new-ai-job', {
    jobId: uuidv4(),
    userId: req.user.id,
    projectId,
    data,
  })
  
  res.json({ success: true, jobId })
})
```

### Processing with Dependencies

If your job depends on other jobs:

```typescript
// Parent job
const parentJobId = await addJob('parent-job', parentData)

// Child jobs (wait for parent)
const childJobId = await addJob('child-job', {
  ...childData,
  parentJobId,
  waitForParent: true,
})

// In processor
myQueue.process('child-job', 1, async (job) => {
  const { parentJobId } = job.data
  
  // Wait for parent to complete
  const parentJob = await myQueue.getJob(parentJobId)
  await parentJob.finished()
  
  // Now process child
  // ...
})
```

### Chaining Jobs

```typescript
// Job 1
const job1Id = await addJob('step-1', data1)

// Job 2 (runs after Job 1)
job1.on('completed', async () => {
  await addJob('step-2', data2)
})
```

---

## Best Practices

### 1. Always Update Database Status

```typescript
// ✅ GOOD
await updateJobStatus(jobId, 'processing', 10)
await job.progress(50)
await updateJobStatus(jobId, 'processing', 50)

// ❌ BAD
await job.progress(50) // Database not updated
```

### 2. Handle Errors Properly

```typescript
try {
  await processJob(data)
} catch (error: any) {
  // Update database
  await updateJobStatus(jobId, 'failed', 0, undefined, undefined, error.message)
  // Re-throw for Bull retry logic
  throw error
}
```

### 3. Check Database Before Processing

```typescript
myQueue.process('job-type', 1, async (job) => {
  const { jobId } = job.data
  
  // Check if job is already failed/cancelled
  const jobCheck = await pool.query(
    'SELECT status, error_message FROM jobs WHERE id = $1',
    [jobId]
  )
  
  if (jobCheck.rows[0]?.status === 'failed' || jobCheck.rows[0]?.error_message) {
    await job.remove()
    return
  }
  
  // Process job
})
```

### 4. Use Appropriate Timeouts

```typescript
// Long-running jobs
timeout: 600000 // 10 minutes

// Quick jobs
timeout: 60000 // 1 minute
```

### 5. Set Appropriate Concurrency

```typescript
// CPU-intensive: concurrency = 1
queue.process('cpu-intensive', 1, processor)

// I/O-bound: concurrency = 5-10
queue.process('io-bound', 5, processor)
```

### 6. Clean Up Old Jobs

```typescript
defaultJobOptions: {
  removeOnComplete: 100, // Keep last 100
  removeOnFail: 50,     // Keep last 50
}
```

### 7. Use Job Priorities

```typescript
// High priority
await addJob('type', data, { priority: 10 })

// Low priority
await addJob('type', data, { priority: 1 })
```

### 8. Monitor Queue Health

```typescript
// Regular health checks
setInterval(async () => {
  const counts = await queue.getJobCounts()
  if (counts.failed > 100) {
    logger.warn('High number of failed jobs', counts)
  }
}, 60000) // Every minute
```

---

## Troubleshooting

### Jobs Stuck in "Processing"

**Symptoms**: Jobs show status "processing" but haven't updated in hours.

**Causes**:
- Worker crashed while processing
- Backend restarted without graceful shutdown
- Job timeout exceeded but not marked failed

**Solution**:
```bash
# Run force cleanup
npm run cleanup:force

# Or remove from queues
npm run cleanup:remove-queues
```

**Prevention**: Add database check in processor (see Best Practices #3).

### Jobs Not Being Processed

**Symptoms**: Jobs stuck in "waiting" state.

**Causes**:
- No workers running
- Workers crashed
- Queue processor not registered

**Solution**:
1. Check if workers are running: `ps aux | grep node`
2. Check server logs for errors
3. Verify processor is registered: `queue.process('job-type', ...)`

### Jobs Failing Immediately

**Symptoms**: Jobs fail on first attempt.

**Causes**:
- Invalid job data
- Missing dependencies
- Database connection issues

**Solution**:
1. Check job data: `job.data`
2. Check error message in database
3. Verify database connection
4. Check processor error handling

### Redis Connection Issues

**Symptoms**: "Redis connection failed" errors.

**Causes**:
- Redis server down
- Wrong Redis URL
- Network issues

**Solution**:
1. Check Redis is running: `redis-cli ping`
2. Verify `REDIS_URL` in `.env`
3. Check network connectivity

### High Memory Usage

**Symptoms**: Redis memory usage growing.

**Causes**:
- Too many completed/failed jobs retained
- Jobs not being cleaned up

**Solution**:
```bash
# Run cleanup
npm run cleanup:queues

# Adjust retention
defaultJobOptions: {
  removeOnComplete: 50, // Reduce from 100
  removeOnFail: 25,     // Reduce from 50
}
```

### Jobs Processing Multiple Times

**Symptoms**: Same job processed by multiple workers.

**Causes**:
- Lock duration too short
- Multiple workers with same queue name

**Solution**:
```typescript
settings: {
  lockDuration: 600000, // Increase lock duration
}
```

---

## Monitoring & Observability

### Queue Metrics

```typescript
// Get queue counts
const counts = await queue.getJobCounts()
console.log({
  waiting: counts.waiting,
  active: counts.active,
  completed: counts.completed,
  failed: counts.failed,
  delayed: counts.delayed,
})

// Get job by ID
const job = await queue.getJob(jobId)
const state = await job.getState()
console.log('Job state:', state)
```

### Database Queries

```sql
-- Jobs by status
SELECT status, COUNT(*) 
FROM jobs 
GROUP BY status;

-- Failed jobs with errors
SELECT id, type, error_message, created_at
FROM jobs
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 10;

-- Stuck jobs (processing > 1 hour)
SELECT id, type, started_at, error_message
FROM jobs
WHERE status = 'processing'
AND started_at < NOW() - INTERVAL '1 hour';
```

### Logging

```typescript
// In processor
logger.info('Processing job', { jobId, type: job.data.type })
logger.error('Job failed', { jobId, error: error.message })
```

### Health Check Endpoint

```typescript
router.get('/health/queues', async (req, res) => {
  const queueHealth = {}
  
  for (const queueName of QUEUE_NAMES) {
    const queue = getQueueByName(queueName)
    const counts = await queue.getJobCounts()
    queueHealth[queueName] = counts
  }
  
  res.json({ queues: queueHealth })
})
```

---

## Summary

### Key Takeaways

1. **Bull queues** handle background job processing using Redis
2. **Database** tracks job status for UI and persistence
3. **Workers** process jobs from queues
4. **Regular maintenance** keeps queues healthy
5. **Best practices** prevent common issues

### Quick Reference

```bash
# Cleanup
npm run cleanup:queues          # General cleanup
npm run cleanup:force           # Force fix stuck jobs
npm run cleanup:remove-queues   # Remove specific jobs

# Monitoring
# Check /api/jobs endpoint for job status
# Check /health/queues for queue metrics
```

### Next Steps

1. Review existing queue implementations
2. Add monitoring dashboards
3. Set up automated cleanup (cron jobs)
4. Document your specific queue configurations
5. Train team on queue operations

---

**Last Updated**: 2025-12-05  
**Maintained By**: ADPA Development Team

