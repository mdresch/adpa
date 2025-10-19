# Visual Pipeline Integration - Complete

## Overview

The visual pipeline UI has been successfully connected to the actual 6-stage document processing pipeline. The integration includes:

1. ✅ **Pipeline API Routes** (`server/src/routes/pipeline.ts`)
2. ✅ **Database Tables** (`server/migrations/011_pipeline_tables.sql`)  
3. ✅ **Queue Worker** (`server/src/workers/pipelineWorker.ts`)
4. ✅ **Frontend UI** with template/project selection
5. ✅ **Real-time Updates** via polling
6. ✅ **Job History** and metrics

## Architecture

### Backend Components

#### 1. API Routes (`/api/pipeline/*`)

- `POST /api/pipeline/start` - Start a new pipeline job
- `GET /api/pipeline/job/:jobId/status` - Get job status  
- `POST /api/pipeline/job/:jobId/cancel` - Cancel a job
- `GET /api/pipeline/jobs` - List all jobs for user
- `GET /api/pipeline/metrics` - Get pipeline metrics
- `GET /api/pipeline/templates` - Get available templates
- `GET /api/pipeline/projects` - Get available projects
- `GET /api/pipeline/job/:jobId/stage/:stageId` - Get stage details

#### 2. Database Tables

**pipeline_executions**
- Stores overall pipeline job state
- Tracks progress, status, timing
- Links to template, project, user

**stage_executions**  
- Stores individual stage execution details
- Input/output data, quality scores
- Execution times and errors

**pipeline_configurations**
- Reusable pipeline configurations
- Stage definitions and quality gates

#### 3. Queue Worker

**pipelineWorker.ts**
- Processes jobs from `pipeline-processing` queue
- Executes all 6 stages via `PipelineOrchestrator`
- Updates database with progress and results
- Handles errors and retries

### Frontend Components

#### 1. Visual Pipeline Page

**Location:** `app/process-flow/visual-pipeline/page.tsx`

**Features:**
- Template and project selection
- Real-time pipeline visualization
- Stage details and progress
- Job history
- Metrics dashboard
- Configurable pipeline options

#### 2. Pipeline API Hook

**Location:** `app/process-flow/visual-pipeline/hooks/usePipelineAPI.ts`

**Functions:**
- `startPipeline()` - Start new job
- `getJobStatus()` - Get job status
- `pollJobStatus()` - Real-time updates
- `cancelJob()` - Cancel running job
- `getJobs()` - List all jobs

## The 6 Stages

1. **Context Gathering** - Gather context from project, documents, integrations
2. **Template Processing** - Process template with context
3. **AI Generation** - Generate content using AI models
4. **Context Injection** - Inject context into generated content
5. **Quality Assurance** - Assess document quality
6. **Output Formatting** - Format final document

## Setup Instructions

### 1. Run Database Migration

```bash
cd server
psql $DATABASE_URL -f migrations/011_pipeline_tables.sql
```

### 2. Restart Backend Server

```bash
cd server
npm run dev
```

The pipeline routes and worker will be automatically registered.

### 3. Verify Queue Worker

Check logs for:
```
Pipeline worker registered successfully
```

### 4. Access Visual Pipeline

Navigate to: `http://localhost:3000/process-flow/visual-pipeline`

## Usage Flow

1. **Select Template** - Choose from available templates
2. **Select Project** - Choose from your projects
3. **Configure Options** (optional) - Enable quality gates, refinement, etc.
4. **Start Pipeline** - Click "Start Pipeline" button
5. **Monitor Progress** - Watch real-time stage execution
6. **View Results** - Check quality scores and final document

## Testing

### Test a Complete Pipeline Run

1. Create a template and project (if needed)
2. Go to visual pipeline page
3. Select template and project
4. Start pipeline
5. Observe:
   - Job created in database
   - Worker picks up job
   - Stages execute sequentially
   - Progress updates in UI
   - Job completes successfully

### Check Database

```sql
-- View pipeline executions
SELECT * FROM pipeline_executions ORDER BY created_at DESC LIMIT 10;

-- View stage executions
SELECT * FROM stage_executions WHERE job_id = 'YOUR_JOB_ID';

-- View metrics
SELECT 
  COUNT(*) as total_jobs,
  COUNT(*) FILTER (WHERE status = 'completed') as completed,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  AVG(overall_quality_score) as avg_quality
FROM pipeline_executions;
```

### Check Queue

```bash
# In Redis CLI or Redis Commander
# Check pipeline-processing queue
LLEN bull:pipeline-processing:wait
LLEN bull:pipeline-processing:active
LLEN bull:pipeline-processing:completed
```

## API Examples

### Start a Pipeline Job

```typescript
const response = await fetch('/api/pipeline/start', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    templateId: '123e4567-e89b-12d3-a456-426614174000',
    projectId: '123e4567-e89b-12d3-a456-426614174001',
    processingConfig: {
      enableQualityGates: true,
      enableRefinement: true,
      maxProcessingTime: 300000
    }
  })
})

const result = await response.json()
// result.data.jobId
```

### Get Job Status

```typescript
const response = await fetch(`/api/pipeline/job/${jobId}/status`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})

const result = await response.json()
// result.data.status, result.data.progress, result.data.stages
```

## Configuration Options

### Processing Config

```typescript
{
  enableParallelProcessing: false,  // Parallel stage execution
  enableQualityGates: true,          // Quality gate checks
  enableRefinement: true,            // Content refinement
  enablePersonalization: true,       // Personalization
  maxProcessingTime: 300000,         // Max time in ms (5 min)
  retryAttempts: 3                   // Number of retries
}
```

## Monitoring & Troubleshooting

### Check Logs

**Server logs:**
```bash
tail -f server/logs/combined.log | grep pipeline
```

**Pipeline-specific logs:**
- Job started: `Starting pipeline processing`
- Stage execution: `Executing stage`  
- Job completed: `Pipeline job completed successfully`
- Job failed: `Pipeline job failed`

### Common Issues

**1. Job stuck in pending**
- Check if worker is running
- Check Redis connection
- Check logs for queue errors

**2. Stage execution fails**
- Check stage-specific logs
- Verify AI provider API keys
- Check database connections

**3. Templates/Projects not loading**
- Verify user has permissions
- Check database for templates/projects
- Check API authentication

**4. Real-time updates not working**
- Verify polling is active
- Check network requests
- Verify job status endpoint returns data

## Performance

### Expected Timings

- Context Gathering: 5-15 seconds
- Template Processing: 3-10 seconds
- AI Generation: 30-120 seconds (depends on AI provider)
- Context Injection: 5-10 seconds
- Quality Assurance: 10-30 seconds
- Output Formatting: 3-10 seconds

**Total:** ~1-3 minutes per job

### Optimization Tips

1. Enable parallel processing (when stages are independent)
2. Cache context gathering results
3. Use faster AI models for testing
4. Adjust quality gate thresholds
5. Limit retry attempts

## Next Steps

### Enhancements

1. **WebSocket Integration** - Replace polling with WebSocket for true real-time updates
2. **Stage Retry** - Allow retrying individual stages
3. **Pipeline Templates** - Save and reuse pipeline configurations
4. **Batch Processing** - Process multiple documents at once
5. **Advanced Metrics** - More detailed analytics and reporting
6. **Export Results** - Download pipeline results in various formats
7. **Stage Preview** - Preview stage outputs before proceeding
8. **A/B Testing** - Compare different pipeline configurations

### Production Considerations

1. **Scaling**
   - Add more queue workers
   - Use Redis cluster
   - Implement horizontal scaling

2. **Monitoring**
   - Set up alerts for failed jobs
   - Track queue depths
   - Monitor stage execution times

3. **Security**
   - Validate all input data
   - Implement rate limiting
   - Audit pipeline executions

4. **Reliability**
   - Implement dead letter queues
   - Add circuit breakers
   - Improve error handling

## Files Changed

### Created
- `server/src/routes/pipeline.ts` - Pipeline API routes
- `server/src/workers/pipelineWorker.ts` - Queue worker
- `server/migrations/011_pipeline_tables.sql` - Database schema

### Modified
- `app/process-flow/visual-pipeline/page.tsx` - Added template/project selection, connected to API
- `app/process-flow/visual-pipeline/hooks/usePipelineAPI.ts` - Updated API calls with auth
- `server/src/services/queueService.ts` - Added pipeline queue and worker
- `server/src/server.ts` - Registered pipeline routes (already done)

## Testing Checklist

- [ ] Database migration applied successfully
- [ ] Backend server starts without errors
- [ ] Pipeline routes accessible
- [ ] Templates endpoint returns data
- [ ] Projects endpoint returns data
- [ ] Can start a pipeline job
- [ ] Job appears in database
- [ ] Worker processes job
- [ ] Stages execute in order
- [ ] UI updates with progress
- [ ] Job completes successfully
- [ ] Can view job history
- [ ] Metrics display correctly
- [ ] Can cancel running job
- [ ] Error handling works

## Support

For issues or questions:
1. Check server logs (`server/logs/`)
2. Review database tables
3. Verify queue status in Redis
4. Check browser console for frontend errors

---

**Status:** ✅ Integration Complete - Ready for Testing
**Date:** 2024-01-15
**Version:** 1.0.0

