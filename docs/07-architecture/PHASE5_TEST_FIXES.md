# Phase 5.5 Test Fixes

**Date**: 2025-01-27  
**Status**: In Progress

## Test Failures Identified

### 1. BullQueueAdapter.remove ✅ FIXED
- **Issue**: Test expected `bullQueue.remove()` but implementation calls `getJob()` then `job.remove()`
- **Fix**: Updated test to expect `getJob()` and `job.remove()` calls

### 2. QueueService.addJob - Stuck Job Check
- **Issue**: Test assertion too strict - query is called but with different pattern
- **Fix**: Updated to check for query containing the stuck job check pattern

### 3. QueueService.addJob - StuckJobsError
- **Issue**: Mock sequencing not matching actual flow
- **Fix**: Need to properly sequence mocks for: check → cleanup → recheck

### 4. QueueService.addJob - Rollback
- **Issue**: Error wrapping changed - JobQueueError is wrapped in JobDatabaseError
- **Fix**: Need to check error chain or update test expectation

### 5. QueueService.addJob - Database Insert Failure
- **Issue**: Mock not set up correctly for insert failure
- **Fix**: Need to properly mock the insert query to fail

### 6. Integration Test - Cache Operations
- **Issue**: Cache operations not being tracked
- **Fix**: Updated cache mock to track operations

### 7. Integration Test - Database Query Count
- **Issue**: Using `expect.any(Number)` incorrectly
- **Fix**: Changed to check actual call count

## Status

Most fixes applied. Some tests may need additional refinement based on actual implementation behavior.
