# Pending Jobs Diagnostic Report

**Date:** 2025-12-07  
**Status:** ⚠️ Issues Found

## Summary

Found **49 pending jobs** in the database. Most are very old and orphaned (not in Bull queue).

### Key Findings

1. **Orphaned Jobs**: Most jobs are in the database but NOT in the Bull queue
   - These jobs were likely created but failed to add to queue, or the queue was cleared
   - They remain stuck in "pending" status indefinitely

2. **Very Old Jobs**: Many jobs are extremely old (30+ days)
   - Oldest: 48,605 minutes (~33 days)
   - These should be marked as failed or cleaned up

3. **Status Mismatch**: One job is in Bull queue with "failed" status but still "pending" in database
   - Job ID: `7e344cc1...`
   - Age: 73 minutes
   - Queue Status: `failed`
   - Database Status: `pending`

## Recommendations

### Immediate Actions

1. **Clean Up Old Pending Jobs**
   ```bash
   # Mark jobs older than 30 minutes as failed
   POST /api/jobs/diagnostics/fix-pending
   Body: { "action": "mark-failed", "maxAge": 30 }
   ```

2. **Re-add Orphaned Jobs** (if needed)
   ```bash
   # Re-add jobs to queues (only for recent jobs)
   POST /api/jobs/diagnostics/fix-pending
   Body: { "action": "re-add", "maxAge": 60 }
   ```

3. **Fix Status Mismatch**
   - Job `7e344cc1...` should be marked as failed in database

### Long-term Solutions

1. **Auto-cleanup**: Add a scheduled job to automatically mark old pending jobs as failed
2. **Better Error Handling**: Ensure jobs are marked as failed if queue add fails
3. **Status Sync**: Periodically sync Bull queue status with database
4. **Monitoring**: Alert when jobs remain pending for >5 minutes

## Diagnostic Tools

### API Endpoint
```
GET /api/jobs/diagnostics/pending
```
Returns detailed analysis of all pending jobs.

### Script
```bash
cd server
npx tsx scripts/diagnose-pending-jobs.ts
```

## Next Steps

1. Review the diagnostic output
2. Decide on cleanup strategy (mark as failed vs re-add)
3. Implement auto-cleanup for future prevention
4. Monitor for new stuck jobs

