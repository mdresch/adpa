# Spec: Nesting Child Entity Extraction Jobs & Fixing Started Times

## 1. Goal Description
The job monitor is currently cluttered with dozens of independent child jobs of type `extract-entity-*` for each document generated. Additionally, the job start time (Started) for these extraction jobs frequently reports as "Not started" or "-" even when completed. This design groups the child entity extraction jobs under their parent `extract-project-data` orchestration job, hides them from the main job monitor list, and fixes the started timestamp logic.

## 2. Proposed Changes

### Queue Service
Update the queue service so that:
- It correctly resolves `documentId` and sets `documentName` in the database for child `extract-entity-*` jobs.
- It updates the `started_at` column in the database when a job transitions to the `processing` status.

#### `server/src/services/jobs/queue/QueueService.ts`
- Modify `QueueService.updateJobStatus` to ensure `started_at = COALESCE(started_at, CURRENT_TIMESTAMP)` is updated when the status is `'processing'`.
- Modify `QueueService.addJob` to support `documentId` extraction from `documentIds` for types matching `extract-entity-*`.

### Jobs Router API
Update the jobs router so that:
- Child extraction jobs are excluded from both count queries and main list queries.
- Parent jobs return their child processes/jobs under a new `childJobs` array, containing details of their child job IDs, types, statuses, progress, and times.

#### `server/src/routes/jobs.ts`
- Update count and list queries in `/`, `/:id`, and `/admin/all` endpoints.
- Fetch status of child jobs for returned parent jobs and map them.

### Frontend Job Monitor Page
Update the frontend so that:
- The expanded "Job Details" section renders nested child extraction processes as a sub-process list.

#### `app/jobs/page.tsx`
- Add `childJobs` to the `Job` type declaration.
- Add rendering of child sub-processes under Job Details.

## 3. Verification Plan

### Automated Tests
- Run backend unit tests for queue service and jobs route.
```bash
cd server && npx jest --testPathPattern="QueueService" --no-coverage
```

### Manual Verification
- Generate a new document and verify that the child `extract-entity-*` jobs are not shown on the main jobs page.
- Expand the main `extract-project-data` job card and verify the "Started" timestamp is populated and the individual entity extraction child jobs are listed inside the card details.
