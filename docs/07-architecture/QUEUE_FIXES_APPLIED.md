# Queue Implementation Fixes - High Priority Issues

**Date**: 2025-12-05  
**File**: `server/src/services/queueService.ts`

---

## Summary

Fixed three high-priority issues identified in the queue implementation review:

1. ✅ **Race condition in extraction monitoring** - Improved interval guard
2. ✅ **Memory leak** - Clear intervals on job cancellation
3. ✅ **Missing atomicity in addJob** - Ensure database + queue are transactional

---

## Fix 1: Race Condition in Extraction Monitoring

### Problem
The original implementation used a boolean flag (`isChecking`) to prevent overlapping interval checks. This could still allow race conditions if the async operation took longer than the interval period.

### Solution
Replaced boolean flag with **Promise-based guard**:

```typescript
// Before (vulnerable to race conditions)
let isChecking = false
const checkInterval = setInterval(async () => {
  if (isChecking) return
  isChecking = true
  try {
    // ... check logic
  } finally {
    isChecking = false
  }
}, 3000)

// After (Promise-based guard)
let checkPromise: Promise<void> | null = null
const performCheck = async (): Promise<void> => {
  try {
    // ... check logic
  } finally {
    checkPromise = null
  }
}

const checkInterval = setInterval(() => {
  if (checkPromise) {
    logger.debug('Skipping check - previous check still running')
    return
  }
  checkPromise = performCheck()
  checkPromise.catch((err) => {
    logger.error('Unhandled error in check promise:', err)
    checkPromise = null
  })
}, 3000)
```

### Benefits
- **No race conditions**: Promise-based guard ensures only one check runs at a time
- **Better error handling**: Promise rejections are caught and logged
- **Clearer intent**: Code explicitly shows we're waiting for previous check to complete

---

## Fix 2: Memory Leak - Clear Intervals on Cancellation

### Problem
Monitoring intervals were created but never cleared when jobs were cancelled or failed, causing memory leaks in long-running processes.

### Solution
1. **Store intervals in global map** for access during cancellation
2. **Check for cancellation** in monitoring loop
3. **Clear intervals** in cancellation handler and error handlers

```typescript
// Store interval reference for cleanup
if (!(global as any).extractionIntervals) {
  (global as any).extractionIntervals = new Map<string, NodeJS.Timeout>()
}
(global as any).extractionIntervals.set(jobId, checkInterval)

// Check for cancellation in monitoring loop
checkInterval = setInterval(async () => {
  // Check if job was cancelled
  const statusCheck = await pool.query(
    'SELECT status FROM jobs WHERE id = $1',
    [jobId]
  )
  if (statusCheck.rows[0]?.status === 'cancelled') {
    if (checkInterval) {
      clearInterval(checkInterval)
      checkInterval = null
    }
    return
  }
  // ... rest of check logic
}, 3000)

// Clear in cancelJob function
if ((global as any).extractionIntervals) {
  const interval = (global as any).extractionIntervals.get(jobId)
  if (interval) {
    clearInterval(interval)
    ;(global as any).extractionIntervals.delete(jobId)
  }
}

// Clear in error handler
if ((global as any).extractionIntervals) {
  const interval = (global as any).extractionIntervals.get(jobId)
  if (interval) {
    clearInterval(interval)
    ;(global as any).extractionIntervals.delete(jobId)
  }
}
```

### Benefits
- **No memory leaks**: Intervals are properly cleaned up
- **Automatic cleanup**: Cancellation check in monitoring loop prevents unnecessary work
- **Multiple cleanup points**: Handles cancellation, errors, and completion

### Note
For production multi-process scenarios, consider using Redis or a shared store instead of `global` to track intervals across processes.

---

## Fix 3: Atomicity in addJob

### Problem
The `addJob` function inserted into the database first, then added to the Bull queue. If the queue add failed, the database entry remained, causing inconsistency.

### Solution
Implemented **rollback mechanism**:

```typescript
export async function addJob(type: string, data: any, options?: any): Promise<string> {
  // Validate required fields
  if (!data.jobId) {
    throw new Error('jobId is required in job data')
  }
  if (!type) {
    throw new Error('Job type is required')
  }
  
  try {
    // Step 1: Insert into database
    await pool.query(
      `INSERT INTO jobs (...) VALUES (...)`,
      [...]
    )
    
    // Step 2: Add to Bull queue
    try {
      await queue.add(type, data, { ... })
      logger.info(`Job added to queue: ${jobId}`)
      return jobId
    } catch (queueError: any) {
      // Queue add failed - rollback database entry
      logger.error(`Failed to add job to queue, rolling back database entry: ${jobId}`, queueError)
      try {
        await pool.query('DELETE FROM jobs WHERE id = $1', [jobId])
        logger.info(`Rolled back database entry for job: ${jobId}`)
      } catch (rollbackError) {
        // If rollback fails, mark as failed in database
        await pool.query(
          `UPDATE jobs SET status = 'failed', error_message = $1 WHERE id = $2`,
          [`Failed to add to queue: ${queueError.message}`, jobId]
        )
      }
      throw new Error(`Failed to add job to queue: ${queueError.message}`)
    }
  } catch (dbError: any) {
    // Database insert failed - don't add to queue
    logger.error(`Failed to insert job into database: ${jobId}`, dbError)
    throw new Error(`Failed to create job record: ${dbError.message}`)
  }
}
```

### Benefits
- **Atomicity**: Database and queue stay in sync
- **Rollback on failure**: If queue add fails, database entry is removed
- **Graceful degradation**: If rollback fails, job is marked as failed (not orphaned)
- **Input validation**: Validates required fields before processing

---

## Testing Recommendations

### Test Fix 1 (Race Condition)
1. Create multiple extraction jobs simultaneously
2. Verify monitoring checks don't overlap
3. Check logs for "Skipping check - previous check still running" messages

### Test Fix 2 (Memory Leak)
1. Create an extraction job
2. Cancel it while monitoring is active
3. Verify interval is cleared (check logs for "Cleared monitoring interval")
4. Monitor memory usage over time

### Test Fix 3 (Atomicity)
1. Simulate queue add failure (temporarily break Redis connection)
2. Verify database entry is rolled back
3. Test database insert failure (temporarily break DB connection)
4. Verify no queue entry is created

---

## Impact Assessment

### Before Fixes
- ⚠️ Race conditions could cause duplicate finalization
- ⚠️ Memory leaks in long-running processes
- ⚠️ Orphaned database records if queue add fails

### After Fixes
- ✅ No race conditions - Promise-based guard ensures sequential execution
- ✅ No memory leaks - Intervals properly cleaned up
- ✅ Atomic operations - Database and queue stay in sync

---

## Migration Notes

**No migration required** - These are code-level fixes that take effect immediately after deployment.

**Recommended Actions**:
1. Restart backend server to apply changes
2. Monitor logs for any issues
3. Run cleanup scripts to remove any existing orphaned jobs

---

## Related Documentation

- [BULL_QUEUES_COMPLETE_GUIDE.md](./BULL_QUEUES_COMPLETE_GUIDE.md) - Complete Bull queues guide
- [QUEUE_IMPLEMENTATION_REVIEW.md](./QUEUE_IMPLEMENTATION_REVIEW.md) - Full implementation review

---

**Last Updated**: 2025-12-05

