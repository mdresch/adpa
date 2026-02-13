# Document Generation Flow Trace

This document traces the complete flow of document generation from API request to job queue processing.

## Overview

The document generation process follows this flow:
1. **API Request** → User triggers document generation
2. **Job Queuing** → Request is queued for background processing
3. **Worker Pickup** → Worker picks up job from queue
4. **Processing** → Document is generated and saved

---

## 1. API Request Entry Point

### Route: `POST /api/document-generator/generate`

**File:** `server/src/routes/documentGeneration.ts`

**Location:** Lines 116-500

**Flow:**
```typescript
router.post("/generate",
  authenticateToken,
  requirePermission("documents.create"),
  validate(generateDocumentSchema),
  async (req, res) => {
    // 1. Validate request
    const { projectId, name, templateId, userPrompt, provider, model, ... } = req.body
    
    // 2. Check project access
    const projectCheck = await pool.query(...)
    
    // 3. Check template conflicts (if templateId provided)
    if (templateId) {
      const versioningService = new VersioningService()
      const creationResult = await versioningService.createDocumentFromTemplate(...)
      if (creationResult.conflict) {
        return res.status(409).json({ conflict: true, ... })
      }
    }
    
    // 4. Generate document synchronously (NOT queued)
    const result = await documentGenerationService.generateDocument({
      projectId,
      templateId,
      userPrompt,
      provider,
      model,
      temperature,
      userId: req.user?.id || '',
    })
    
    // 5. Calculate metrics
    const wordCount = result.content.trim().split(/\s+/).filter(Boolean).length
    const characterCount = result.content.length
    // ... more metrics
    
    // 6. Create document in database immediately
    const documentId = uuidv4()
    const documentResult = await pool.query(
      `INSERT INTO documents (...) VALUES (...) RETURNING *`,
      [documentId, projectId, name, result.content, ...]
    )
    
    // 7. Auto-integration (async, non-blocking)
    setImmediate(() => {
      (async () => {
        // Confluence auto-publish
        // Jira auto-create
      })().catch(...)
    })
    
    // 8. Return response immediately
    res.status(201).json({
      message: "Document generated successfully",
      document: documentResult.rows[0],
      generation: result.metadata,
    })
  }
)
```

**Key Points:**
- This route generates documents **synchronously** (not queued)
- Document is created immediately in the database
- Auto-integration (Confluence/Jira) happens asynchronously
- Response is returned immediately after document creation

---

## 2. Alternative: AI Generation via Queue

### Route: `POST /api/ai/generate`

**File:** `server/src/routes/ai.ts`

**Location:** Lines 28-414

**Flow:**
```typescript
router.post("/generate",
  authenticateToken,
  validate(schemas.aiGenerate),
  async (req, res) => {
    // 1. Generate unique job ID
    const jobId = uuidv4()
    
    // 2. Check for duplicate requests (deduplication)
    const dedupeKey = `ai-generate:${userId}:${hash}`
    const existingJobId = await cache.get(dedupeKey)
    if (existingJobId) {
      return res.json({ jobId: existingJobId, status: "queued" })
    }
    
    // 3. Set deduplication key
    await cache.set(dedupeKey, jobId, 10)
    
    // 4. Prepare job data
    const jobData = {
      jobId,
      userId: req.user?.id,
      prompt,
      provider,
      model,
      temperature,
      max_tokens,
      template_id,
      variables,
      use_context: useContext,
      projectId: req.body.project_id,
      projectName: req.body.project_name,
      documentIds: req.body.document_ids,
      include_integrations: req.body.include_integrations,
      custom_context: req.body.custom_context,
    }
    
    // 5. Add job to queue
    const { getQueueService } = await import('../services/queueService')
    const queueService = getQueueService()
    const createdJobId = await queueService.addJob('ai-generate', jobData, {
      jobId,
    })
    
    // 6. Return immediately with job ID
    res.json({
      message: "Document generation started",
      jobId,
      status: "queued"
    })
  }
)
```

**Key Points:**
- This route queues jobs for **asynchronous processing**
- Returns immediately with `jobId`
- Job is processed by worker in background
- Includes deduplication to prevent duplicate requests

---

## 3. Job Queue Service

### File: `server/src/services/queueService.ts`

**Location:** Lines 350-500

### Adding Job to Queue

```typescript
export async function addJob(
  queueName: QueueName,
  jobData: JobData,
  options?: JobOptions
): Promise<string> {
  // 1. Validate job type and data
  validateJobType(queueName)
  validateJobData(queueName, jobData)
  
  // 2. Get the appropriate queue
  const queue = getQueueByName(queueName)
  
  // 3. Create job record in database FIRST
  const jobId = options?.jobId || uuidv4()
  await pool.query(
    `INSERT INTO jobs (id, type, status, data, user_id, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())`,
    [jobId, queueName, 'queued', JSON.stringify(jobData), jobData.userId]
  )
  
  // 4. Add job to Bull queue
  const bullJob = await queue.add(jobData.jobType || queueName, jobData, {
    jobId, // Use our database job ID
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
  })
  
  // 5. Emit WebSocket event
  io.emit('job:queued', {
    jobId,
    type: queueName,
    status: 'queued',
    userId: jobData.userId
  })
  
  return jobId
}
```

**Key Points:**
- Job is created in database **before** being added to Bull queue
- This ensures job tracking even if queue fails
- WebSocket event is emitted for real-time updates
- Job ID is preserved across database and queue

---

## 4. Worker Processing

### Queue Processor Registration

**File:** `server/src/services/queueService.ts`

**Location:** Lines 480-500

```typescript
// Register processor for 'ai-generate' jobs
aiQueue.process("ai-generate", 1, async (job) => {
  logger.info(`[WORKER] AI generation worker ${WORKER_ID} picked up job: ${job.id}`)
  
  // Delegate to AIGenerationJobService
  const { AIGenerationJobService } = await import('./jobs/AIGenerationJobService')
  const deps = await getQueueServiceDependencies()
  
  // Ensure jobId matches
  const actualJobId = job.data?.jobId || job.id.toString()
  
  logger.info(`[WORKER] Processing AI generation job with ID: ${actualJobId}`)
  
  return await AIGenerationJobService.processJob(job, {
    workerId: WORKER_ID,
    updateJobStatus,
    dependencies: deps
  }, deps)
})

logger.info(`[QUEUE] Registered ai-generate processor on aiQueue with worker ID: ${WORKER_ID}`)
```

**Key Points:**
- Processor is registered when `queueService.ts` is loaded
- Concurrency: 1 job at a time per worker
- Worker ID is logged for tracking
- Delegates to `AIGenerationJobService` for actual processing

---

## 5. AI Generation Job Service

### File: `server/src/services/jobs/AIGenerationJobService.ts`

**Location:** Lines 79-200

### Processing Flow

```typescript
static async processJob(job: Bull.Job, options: ProcessJobOptions, deps?: QueueServiceDependencies): Promise<any> {
  const jobData = job.data as AIGenerationJobData
  const { jobId, userId, prompt, provider, model, temperature, max_tokens, template_id, variables } = jobData
  const { workerId, updateJobStatus } = options
  
  // 1. Get actual job ID
  const actualJobId = jobId || job.id.toString()
  
  try {
    // 2. Update job status to processing (10%)
    await updateJobStatus(actualJobId, "processing", 10, workerId, "ai-processing")
    
    // 3. Generate content using AI service
    const result = await this.generateContent(jobData, deps)
    
    // 4. Update job status to 50%
    await updateJobStatus(actualJobId, "processing", 50, workerId, "ai-processing")
    
    // 5. Update usage stats
    if (result.usage) {
      await ai.updateUsageStats(provider || 'openai', result.usage)
    }
    
    // 6. Update job status to 90%
    await updateJobStatus(actualJobId, "processing", 90, workerId, "ai-processing")
    
    // 7. Create document from generated content
    const { documentId, documentRow } = await this.createDocument(jobData, result, deps)
    
    // 8. Validate document against baseline (if applicable)
    if (documentId) {
      await this.validateAgainstBaseline(jobData, documentId, result, deps)
    }
    
    // 9. Save final result to database
    const finalResult = {
      ai: result,
      documentId,
    }
    
    await db.query(
      `UPDATE jobs 
       SET status = 'completed', result = $1, progress = 100, 
           worker_id = COALESCE(worker_id, $3),
           started_at = COALESCE(started_at, CURRENT_TIMESTAMP),
           processing_started_at = COALESCE(processing_started_at, CURRENT_TIMESTAMP),
           completed_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [JSON.stringify(finalResult), actualJobId, workerId]
    )
    
    // 10. Emit WebSocket completion event
    ws.to(`user:${userId}`).emit('job:completed', {
      jobId: actualJobId,
      status: 'completed',
      result: finalResult
    })
    
    return finalResult
  } catch (error) {
    // Error handling...
    await updateJobStatus(actualJobId, "failed", 0, workerId, "ai-processing", error.message)
    throw error
  }
}
```

### Content Generation

**Location:** Lines 200-300

```typescript
private static async generateContent(
  jobData: AIGenerationJobData,
  deps?: QueueServiceDependencies
): Promise<any> {
  const { prompt, provider, model, temperature, max_tokens, use_context, projectId, documentIds, custom_context } = jobData
  
  // 1. Gather context if enabled
  if (use_context && projectId) {
    const contextService = new ContextAwareAIService()
    const context = await contextService.gatherContext({
      projectId,
      documentIds: documentIds || [],
      customContext: custom_context,
      maxTokens: 8000, // Leave room for prompt and response
    })
    
    // Enhance prompt with context
    const enhancedPrompt = `${prompt}\n\nContext:\n${context.summary}`
    // ... use enhancedPrompt
  }
  
  // 2. Call AI service
  const result = await aiService.generateText({
    prompt: enhancedPrompt || prompt,
    provider: provider || 'openai',
    model: model || 'gpt-4',
    temperature: temperature || 0.7,
    maxTokens: max_tokens || 4000,
  })
  
  return result
}
```

### Document Creation

**Location:** Lines 300-400

```typescript
private static async createDocument(
  jobData: AIGenerationJobData,
  result: any,
  deps?: QueueServiceDependencies
): Promise<{ documentId: string, documentRow: any }> {
  const db = deps?.database || { query: pool.query.bind(pool) } as any
  const ws = deps?.websocket || io
  
  // 1. Extract content from AI result
  const content = result.content || result.text || ''
  
  // 2. Calculate metrics
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length
  const characterCount = content.length
  
  // 3. Create document in database
  const documentId = uuidv4()
  const insertResult = await db.query(
    `INSERT INTO documents 
     (id, project_id, name, content, template_id, created_by, 
      metadata, generation_metadata, status, word_count, character_count,
      version, semantic_version)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING *`,
    [
      documentId,
      jobData.projectId,
      jobData.projectName || 'Generated Document',
      content, // Markdown content
      jobData.template_id || null,
      jobData.userId,
      JSON.stringify({ generated: true }),
      JSON.stringify({
        aiProcessing: {
          provider: result.provider,
          model: result.model,
          tokens: result.usage
        }
      }),
      'draft',
      wordCount,
      characterCount,
      1, // version
      '1.0.0' // semantic_version
    ]
  )
  
  // 4. Emit WebSocket event
  ws.to(`user:${jobData.userId}`).emit('document:created', {
    documentId,
    projectId: jobData.projectId,
    name: jobData.projectName
  })
  
  return {
    documentId,
    documentRow: insertResult.rows[0]
  }
}
```

---

## 6. Job Status Updates

### Function: `updateJobStatus`

**File:** `server/src/services/queueService.ts`

**Location:** Lines 700-800

```typescript
async function updateJobStatus(
  jobId: string,
  status: JobStatus,
  progress: number,
  workerId?: string,
  queueName?: QueueName | string,
  errorMessage?: string
): Promise<void> {
  // 1. Update database
  await pool.query(
    `UPDATE jobs 
     SET status = $1, progress = $2, 
         worker_id = COALESCE(worker_id, $3),
         updated_at = NOW(),
         ${status === 'processing' ? 'processing_started_at = COALESCE(processing_started_at, NOW()),' : ''}
         ${status === 'completed' ? 'completed_at = NOW(),' : ''}
         ${status === 'failed' ? 'failed_at = NOW(), error_message = $4,' : ''}
     WHERE id = $5`,
    [status, progress, workerId, errorMessage, jobId]
  )
  
  // 2. Emit WebSocket event
  const jobData = await pool.query('SELECT user_id, type FROM jobs WHERE id = $1', [jobId])
  if (jobData.rows.length > 0) {
    const userId = jobData.rows[0].user_id
    io.to(`user:${userId}`).emit('job:status', {
      jobId,
      status,
      progress,
      workerId,
      queueName,
      errorMessage
    })
  }
}
```

**Key Points:**
- Updates both database and emits WebSocket events
- Tracks worker assignment
- Records timestamps for different status transitions

---

## 7. WebSocket Events

### Real-time Updates

The system emits WebSocket events at key points:

1. **Job Queued:**
   ```typescript
   io.emit('job:queued', { jobId, type, status: 'queued', userId })
   ```

2. **Job Status Update:**
   ```typescript
   io.to(`user:${userId}`).emit('job:status', {
     jobId, status, progress, workerId, queueName
   })
   ```

3. **Job Completed:**
   ```typescript
   io.to(`user:${userId}`).emit('job:completed', {
     jobId, status: 'completed', result
   })
   ```

4. **Document Created:**
   ```typescript
   io.to(`user:${userId}`).emit('document:created', {
     documentId, projectId, name
   })
   ```

---

## 8. Flow Summary

### Synchronous Generation (documentGeneration.ts)

```
User Request
  ↓
POST /api/document-generator/generate
  ↓
Validate & Check Access
  ↓
Generate Document (synchronous)
  ↓
Create Document in DB
  ↓
Auto-integration (async)
  ↓
Return Response
```

### Asynchronous Generation (ai.ts)

```
User Request
  ↓
POST /api/ai/generate
  ↓
Generate Job ID
  ↓
Check Deduplication
  ↓
Add Job to Queue (queueService.addJob)
  ├─ Create DB Record
  ├─ Add to Bull Queue
  └─ Emit 'job:queued' event
  ↓
Return Job ID Immediately
  ↓
[Background Processing]
  ↓
Worker Picks Up Job
  ├─ Update Status: processing (10%)
  ├─ Generate Content (AI)
  ├─ Update Status: processing (50%)
  ├─ Create Document
  ├─ Update Status: processing (90%)
  ├─ Validate Baseline
  └─ Update Status: completed (100%)
  ↓
Emit 'job:completed' event
```

---

## 9. Key Files Reference

| File | Purpose | Key Functions |
|------|---------|---------------|
| `server/src/routes/documentGeneration.ts` | Synchronous document generation | `POST /generate` |
| `server/src/routes/ai.ts` | Asynchronous AI generation | `POST /generate` |
| `server/src/services/queueService.ts` | Queue management | `addJob()`, `updateJobStatus()` |
| `server/src/services/jobs/AIGenerationJobService.ts` | Job processing | `processJob()`, `generateContent()`, `createDocument()` |
| `server/src/workers/pipelineWorker.ts` | Pipeline processing | `processPipelineJob()` |

---

## 10. Monitoring & Debugging

### Log Points

1. **Job Queued:**
   ```
   [QUEUE] Job added to queue and database: {jobId}
   ```

2. **Worker Pickup:**
   ```
   [WORKER] AI generation worker {WORKER_ID} picked up job: {job.id}
   ```

3. **Processing Start:**
   ```
   [AIGenerationJobService] Processing job: {jobId}
   ```

4. **Content Generation:**
   ```
   [AI] Generating content with provider: {provider}, model: {model}
   ```

5. **Document Created:**
   ```
   [AIGenerationJobService] Document created: {documentId}
   ```

6. **Job Completed:**
   ```
   [AIGenerationJobService] Job completed: {jobId}
   ```

### Database Queries

```sql
-- Check job status
SELECT id, type, status, progress, worker_id, created_at, started_at, completed_at
FROM jobs
WHERE id = 'job-id-here';

-- Check recent jobs
SELECT id, type, status, progress, user_id, created_at
FROM jobs
ORDER BY created_at DESC
LIMIT 10;

-- Check worker activity
SELECT worker_id, COUNT(*) as job_count, 
       MIN(created_at) as first_job, 
       MAX(completed_at) as last_completion
FROM jobs
WHERE worker_id IS NOT NULL
GROUP BY worker_id;
```

---

## 11. Error Handling

### Job Failure Flow

```typescript
try {
  // Process job
} catch (error) {
  // 1. Update job status to failed
  await updateJobStatus(actualJobId, "failed", 0, workerId, "ai-processing", error.message)
  
  // 2. Emit error event
  ws.to(`user:${userId}`).emit('job:failed', {
    jobId: actualJobId,
    error: error.message
  })
  
  // 3. Log error
  log.error(`[AIGenerationJobService] Job failed: ${actualJobId}`, error)
  
  // 4. Re-throw for Bull retry mechanism
  throw error
}
```

### Retry Mechanism

- **Attempts:** 3 retries
- **Backoff:** Exponential (2s, 4s, 8s)
- **Timeout:** 10 minutes per attempt

---

## Conclusion

The document generation system supports both:
1. **Synchronous generation** - Immediate response, document created instantly
2. **Asynchronous generation** - Queued processing, real-time progress updates

Both flows create documents in the database with Markdown content and support auto-integration with Confluence and Jira.

