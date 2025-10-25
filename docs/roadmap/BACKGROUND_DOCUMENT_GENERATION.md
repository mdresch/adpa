# Background Document Generation with Toast Notifications

**Status**: 🔵 Planned  
**Priority**: High  
**Estimated Effort**: Medium (2-3 days)  
**Dependencies**: Bull Queue System, WebSocket/SSE for real-time updates

---

## 📋 Feature Overview

Enable truly asynchronous document generation where users can continue working while documents are generated in the background. Provide clear feedback through toast notifications at job start and completion.

---

## 🎯 User Experience Goals

### Current Behavior (Blocking)
```
1. User clicks "Generate Document"
2. Dialog shows loading spinner
3. User must wait 30-120 seconds
4. Dialog shows success/error
5. User can continue
```

**Problems**:
- ❌ User is blocked during generation
- ❌ Cannot start multiple documents
- ❌ No ability to navigate away
- ❌ Poor UX for long-running generations

### Desired Behavior (Non-Blocking)
```
1. User clicks "Generate Document"
2. Toast: "🚀 Document generation started..."
3. Dialog closes immediately
4. User continues working (can start other tasks)
5. [30-120 seconds later]
6. Toast: "✅ [Document Name] is ready for review!" (with View button)
7. User clicks "View" → opens document viewer
```

**Benefits**:
- ✅ Non-blocking workflow
- ✅ Can queue multiple documents
- ✅ Clear status feedback
- ✅ Professional UX
- ✅ Better for long-running AI generations

---

## 🎨 UI/UX Design

### 1. Job Start Toast (Immediate)

```
┌─────────────────────────────────────────┐
│ 🚀 Document Generation Started          │
│                                          │
│ Risk Management Plan                    │
│ Using Google Gemini 2.5 Pro             │
│                                          │
│ [View Progress]     [Dismiss]           │
└─────────────────────────────────────────┘
```

**Properties**:
- **Duration**: 5 seconds (auto-dismiss)
- **Position**: Bottom-right
- **Color**: Blue/Info
- **Actions**: 
  - "View Progress" → opens job queue panel
  - "Dismiss" → closes toast

### 2. Job Progress Updates (Optional, Real-time)

```
┌─────────────────────────────────────────┐
│ 🔄 Generating Risk Management Plan...   │
│                                          │
│ ████████████░░░░░░░░  60%               │
│ Reading source documents (3/5)          │
└─────────────────────────────────────────┘
```

**Properties**:
- **Duration**: Persistent (until complete)
- **Updates**: Every 10 seconds via WebSocket
- **Can be minimized**: User choice

### 3. Job Completion Toast (When Ready)

```
┌─────────────────────────────────────────┐
│ ✅ Document Ready for Review            │
│                                          │
│ Risk Management Plan                    │
│ 4,206 words • 6.2/10 Quality Score      │
│ Generated in 45s                         │
│                                          │
│ [View Document]     [Dismiss]           │
└─────────────────────────────────────────┘
```

**Properties**:
- **Duration**: 15 seconds (auto-dismiss) OR until clicked
- **Position**: Bottom-right (stacks if multiple)
- **Color**: Green/Success
- **Sound**: Optional success sound
- **Actions**:
  - "View Document" → opens document viewer
  - "Dismiss" → closes toast

### 4. Job Failure Toast (On Error)

```
┌─────────────────────────────────────────┐
│ ❌ Document Generation Failed           │
│                                          │
│ Risk Management Plan                    │
│ Error: AI provider timeout              │
│                                          │
│ [Retry]     [View Details]   [Dismiss]  │
└─────────────────────────────────────────┘
```

**Properties**:
- **Duration**: Persistent (manual dismiss)
- **Color**: Red/Error
- **Actions**:
  - "Retry" → re-enqueues job with same params
  - "View Details" → shows error log
  - "Dismiss" → closes toast

---

## 🏗️ Technical Implementation

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                    │
│  ┌────────────────┐  ┌───────────────┐  ┌────────────┐ │
│  │ Generate Dialog│→ │ Job Enqueue   │→ │ Toast Start│ │
│  └────────────────┘  │   API Call    │  └────────────┘ │
│                      └───────────────┘                   │
│                             ↓                            │
│                      [Dialog Closes]                     │
│                             ↓                            │
│                   ┌─────────────────┐                   │
│                   │   WebSocket     │                   │
│                   │   Listener      │                   │
│                   └─────────────────┘                   │
│                             ↓                            │
│                   ┌─────────────────┐                   │
│                   │ Toast Complete  │                   │
│                   │ (with View btn) │                   │
│                   └─────────────────┘                   │
└─────────────────────────────────────────────────────────┘
                            ↕ HTTP/WS
┌─────────────────────────────────────────────────────────┐
│                   Backend (Express + Bull)               │
│  ┌────────────────┐  ┌───────────────┐  ┌────────────┐ │
│  │ POST /api/jobs │→ │ Bull Queue    │→ │ Worker     │ │
│  │   /ai-generate │  │ (Redis)       │  │ Process    │ │
│  └────────────────┘  └───────────────┘  └────────────┘ │
│                                                 ↓        │
│                                          ┌────────────┐ │
│                                          │ AI Service │ │
│                                          └────────────┘ │
│                                                 ↓        │
│                                          ┌────────────┐ │
│                                          │ Save to DB │ │
│                                          └────────────┘ │
│                                                 ↓        │
│                                          ┌────────────┐ │
│                                          │ WebSocket  │ │
│                                          │ Emit Event │ │
│                                          └────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### 1. Frontend Changes

#### **File: `app/projects/[id]/page.tsx`**

**Current Flow** (lines ~850-1000):
```typescript
const handleCreateDocument = async () => {
  // Validation...
  setCreatingDocument(true) // Blocks UI
  
  try {
    const response = await apiClient.generateContent(...)
    // Wait for completion (30-120s)
    
    toast.success("Document created!")
    setCreatingDocument(false) // Unblocks
  } catch (error) {
    toast.error("Generation failed")
    setCreatingDocument(false)
  }
}
```

**New Flow** (Async):
```typescript
const handleCreateDocument = async () => {
  // Validation...
  setCreatingDocument(true)
  
  try {
    // 1. Enqueue job (fast, returns immediately)
    const job = await apiClient.enqueueDocumentGeneration({
      projectId,
      templateId,
      documentName,
      provider,
      model,
      temperature,
      sourceDocuments, // Context
      contextStats
    })
    
    // 2. Show start toast
    toast.info(
      <div>
        <div className="font-semibold">🚀 Document Generation Started</div>
        <div className="text-sm mt-1">{documentName}</div>
        <div className="text-xs text-muted-foreground">Using {provider} {model}</div>
      </div>,
      {
        duration: 5000,
        action: {
          label: "View Progress",
          onClick: () => router.push(`/jobs?id=${job.id}`)
        }
      }
    )
    
    // 3. Close dialog immediately
    setGenerateDialogOpen(false)
    setCreatingDocument(false)
    
    // 4. Register job listener (WebSocket)
    subscribeToJob(job.id, (status) => {
      if (status === 'completed') {
        handleJobComplete(job)
      } else if (status === 'failed') {
        handleJobFailed(job)
      }
    })
    
  } catch (error) {
    // Only if enqueue fails (not generation failure)
    toast.error("Failed to start generation")
    setCreatingDocument(false)
  }
}

const handleJobComplete = (job: Job) => {
  // Show completion toast with document info
  toast.success(
    <div>
      <div className="font-semibold">✅ Document Ready for Review</div>
      <div className="text-sm mt-1">{job.documentName}</div>
      <div className="text-xs text-muted-foreground">
        {job.metadata.wordCount} words • {job.metadata.qualityScore}/10 quality
      </div>
    </div>,
    {
      duration: 15000, // 15 seconds
      action: {
        label: "View Document",
        onClick: () => router.push(`/projects/${projectId}/documents/${job.documentId}/view`)
      }
    }
  )
  
  // Refresh document list in background
  await fetchDocuments()
}

const handleJobFailed = (job: Job) => {
  toast.error(
    <div>
      <div className="font-semibold">❌ Document Generation Failed</div>
      <div className="text-sm mt-1">{job.documentName}</div>
      <div className="text-xs text-muted-foreground">{job.error}</div>
    </div>,
    {
      duration: Infinity, // Manual dismiss
      action: {
        label: "Retry",
        onClick: () => retryJob(job.id)
      }
    }
  )
}
```

#### **File: `lib/api.ts`** (New Methods)

```typescript
// New API client methods
export const apiClient = {
  // ... existing methods ...
  
  /**
   * Enqueue a document generation job (non-blocking)
   */
  async enqueueDocumentGeneration(params: DocumentGenerationParams): Promise<Job> {
    const response = await fetch(`${API_BASE_URL}/api/jobs/ai-generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    })
    if (!response.ok) throw new Error('Failed to enqueue job')
    return response.json() // Returns { id, status, queuePosition, estimatedTime }
  },
  
  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<JobStatus> {
    const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}`)
    if (!response.ok) throw new Error('Failed to get job status')
    return response.json()
  },
  
  /**
   * Retry a failed job
   */
  async retryJob(jobId: string): Promise<Job> {
    const response = await fetch(`${API_BASE_URL}/api/jobs/${jobId}/retry`, {
      method: 'POST'
    })
    if (!response.ok) throw new Error('Failed to retry job')
    return response.json()
  }
}
```

#### **File: `contexts/WebSocketContext.tsx`** (Enhance)

```typescript
// Add job subscription support
export const WebSocketContext = createContext<WebSocketContextType>(null!)

export function WebSocketProvider({ children }) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const jobListeners = useRef<Map<string, (status: JobStatus) => void>>(new Map())
  
  useEffect(() => {
    const socketInstance = io(API_BASE_URL)
    
    // Listen for job updates
    socketInstance.on('job:progress', (data: JobProgressEvent) => {
      const listener = jobListeners.current.get(data.jobId)
      if (listener) listener(data.status)
    })
    
    socketInstance.on('job:completed', (data: JobCompletedEvent) => {
      const listener = jobListeners.current.get(data.jobId)
      if (listener) {
        listener('completed')
        jobListeners.current.delete(data.jobId) // Clean up
      }
    })
    
    socketInstance.on('job:failed', (data: JobFailedEvent) => {
      const listener = jobListeners.current.get(data.jobId)
      if (listener) {
        listener('failed')
        jobListeners.current.delete(data.jobId)
      }
    })
    
    setSocket(socketInstance)
    return () => socketInstance.disconnect()
  }, [])
  
  const subscribeToJob = (jobId: string, callback: (status: string) => void) => {
    jobListeners.current.set(jobId, callback)
    socket?.emit('job:subscribe', { jobId })
  }
  
  return (
    <WebSocketContext.Provider value={{ socket, subscribeToJob }}>
      {children}
    </WebSocketContext.Provider>
  )
}
```

### 2. Backend Changes

#### **File: `server/src/routes/jobs.ts`** (New Route File)

```typescript
import { Router } from 'express'
import { authenticateToken } from '../middleware/auth'
import { documentGenerationQueue } from '../queues/documentGeneration'
import { validateBody } from '../middleware/validation'
import Joi from 'joi'

const router = Router()

/**
 * POST /api/jobs/ai-generate
 * Enqueue a document generation job (non-blocking)
 */
router.post(
  '/ai-generate',
  authenticateToken,
  validateBody(Joi.object({
    projectId: Joi.string().uuid().required(),
    templateId: Joi.string().uuid().required(),
    documentName: Joi.string().required(),
    description: Joi.string().allow(''),
    provider: Joi.string().required(),
    model: Joi.string().required(),
    temperature: Joi.number().min(0).max(2),
    sourceDocuments: Joi.array().items(Joi.object()),
    contextStats: Joi.object()
  })),
  async (req, res) => {
    try {
      const userId = req.user!.id
      
      // Add job to Bull queue
      const job = await documentGenerationQueue.add('generate', {
        userId,
        projectId: req.body.projectId,
        templateId: req.body.templateId,
        documentName: req.body.documentName,
        description: req.body.description || '',
        provider: req.body.provider,
        model: req.body.model,
        temperature: req.body.temperature || 0.7,
        sourceDocuments: req.body.sourceDocuments || [],
        contextStats: req.body.contextStats || {}
      }, {
        priority: 1, // Higher = more important
        attempts: 3, // Retry on failure
        backoff: {
          type: 'exponential',
          delay: 5000 // 5s, 10s, 20s
        }
      })
      
      // Log job creation
      logger.info('Document generation job enqueued', {
        jobId: job.id,
        userId,
        projectId: req.body.projectId,
        templateId: req.body.templateId,
        queuePosition: await job.getPosition()
      })
      
      res.status(202).json({
        success: true,
        job: {
          id: job.id,
          status: 'queued',
          queuePosition: await job.getPosition(),
          estimatedTime: await estimateJobTime(job)
        }
      })
      
    } catch (error) {
      logger.error('Failed to enqueue document generation', { error })
      res.status(500).json({ error: 'Failed to enqueue job' })
    }
  }
)

/**
 * GET /api/jobs/:jobId
 * Get job status and progress
 */
router.get(
  '/:jobId',
  authenticateToken,
  async (req, res) => {
    try {
      const job = await documentGenerationQueue.getJob(req.params.jobId)
      
      if (!job) {
        return res.status(404).json({ error: 'Job not found' })
      }
      
      // Security: Ensure user owns this job
      if (job.data.userId !== req.user!.id) {
        return res.status(403).json({ error: 'Forbidden' })
      }
      
      const state = await job.getState()
      const progress = job.progress
      
      res.json({
        id: job.id,
        status: state,
        progress,
        data: job.data,
        result: state === 'completed' ? job.returnvalue : null,
        error: state === 'failed' ? job.failedReason : null
      })
      
    } catch (error) {
      logger.error('Failed to get job status', { error })
      res.status(500).json({ error: 'Failed to get job status' })
    }
  }
)

/**
 * POST /api/jobs/:jobId/retry
 * Retry a failed job
 */
router.post(
  '/:jobId/retry',
  authenticateToken,
  async (req, res) => {
    try {
      const oldJob = await documentGenerationQueue.getJob(req.params.jobId)
      
      if (!oldJob) {
        return res.status(404).json({ error: 'Job not found' })
      }
      
      if (oldJob.data.userId !== req.user!.id) {
        return res.status(403).json({ error: 'Forbidden' })
      }
      
      // Create new job with same data
      const newJob = await documentGenerationQueue.add('generate', oldJob.data, {
        priority: 2, // Higher priority for retries
        attempts: 3
      })
      
      logger.info('Job retry requested', {
        oldJobId: oldJob.id,
        newJobId: newJob.id,
        userId: req.user!.id
      })
      
      res.json({
        success: true,
        job: {
          id: newJob.id,
          status: 'queued'
        }
      })
      
    } catch (error) {
      logger.error('Failed to retry job', { error })
      res.status(500).json({ error: 'Failed to retry job' })
    }
  }
)

export default router
```

#### **File: `server/src/queues/documentGeneration.ts`** (New Queue File)

```typescript
import Queue from 'bull'
import { redisClient } from '../config/redis'
import { generateDocument } from '../services/aiService'
import { query } from '../config/database'
import { io } from '../server' // Socket.io instance
import logger from '../utils/logger'

export const documentGenerationQueue = new Queue('document-generation', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD
  }
})

// Process jobs with concurrency
documentGenerationQueue.process('generate', 5, async (job, done) => {
  const { userId, projectId, templateId, documentName, ...params } = job.data
  
  try {
    logger.info('Starting document generation', {
      jobId: job.id,
      documentName,
      userId
    })
    
    // Update progress: 10% - Starting
    await job.progress(10)
    emitJobProgress(userId, job.id, 10, 'Initializing...')
    
    // Update progress: 30% - Reading context
    await job.progress(30)
    emitJobProgress(userId, job.id, 30, 'Reading source documents...')
    
    // Generate document (main work)
    const result = await generateDocument({
      projectId,
      templateId,
      documentName,
      ...params
    })
    
    // Update progress: 80% - Saving
    await job.progress(80)
    emitJobProgress(userId, job.id, 80, 'Saving document...')
    
    // Save to database
    const insertResult = await query(
      `INSERT INTO documents 
       (project_id, template_id, title, content, author, status, generation_metadata, metadata, word_count, character_count) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
       RETURNING id`,
      [
        projectId,
        templateId,
        documentName,
        result.content,
        'System Administrator',
        'draft',
        JSON.stringify(result.metadata),
        JSON.stringify({}),
        result.metadata?.contentMetrics?.words || 0,
        result.metadata?.contentMetrics?.characters || 0
      ]
    )
    
    const documentId = insertResult.rows[0].id
    
    // Update progress: 100% - Complete
    await job.progress(100)
    
    logger.info('Document generation completed', {
      jobId: job.id,
      documentId,
      userId
    })
    
    // Emit completion event via WebSocket
    io.to(`user:${userId}`).emit('job:completed', {
      jobId: job.id,
      documentId,
      documentName,
      metadata: result.metadata,
      timestamp: new Date()
    })
    
    done(null, { documentId, metadata: result.metadata })
    
  } catch (error) {
    logger.error('Document generation failed', {
      jobId: job.id,
      error: error.message,
      stack: error.stack
    })
    
    // Emit failure event via WebSocket
    io.to(`user:${userId}`).emit('job:failed', {
      jobId: job.id,
      documentName,
      error: error.message,
      timestamp: new Date()
    })
    
    done(new Error(error.message))
  }
})

// Helper: Emit progress updates
function emitJobProgress(userId: string, jobId: string, progress: number, message: string) {
  io.to(`user:${userId}`).emit('job:progress', {
    jobId,
    progress,
    message,
    timestamp: new Date()
  })
}

// Monitor queue events
documentGenerationQueue.on('completed', (job, result) => {
  logger.info('Job completed successfully', {
    jobId: job.id,
    documentId: result.documentId
  })
})

documentGenerationQueue.on('failed', (job, err) => {
  logger.error('Job failed', {
    jobId: job.id,
    error: err.message,
    attempts: job.attemptsMade
  })
})

documentGenerationQueue.on('stalled', (job) => {
  logger.warn('Job stalled (worker may have crashed)', {
    jobId: job.id
  })
})
```

#### **File: `server/src/server.ts`** (Update Socket.io)

```typescript
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import jobsRouter from './routes/jobs' // NEW

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
  }
})

// Socket.io connection handler
io.on('connection', (socket) => {
  logger.info('WebSocket client connected', { socketId: socket.id })
  
  // Join user-specific room for job updates
  socket.on('authenticate', ({ userId }) => {
    socket.join(`user:${userId}`)
    logger.info('User authenticated for job updates', { userId })
  })
  
  // Subscribe to specific job
  socket.on('job:subscribe', ({ jobId }) => {
    socket.join(`job:${jobId}`)
  })
  
  socket.on('disconnect', () => {
    logger.info('WebSocket client disconnected', { socketId: socket.id })
  })
})

// Mount routes
app.use('/api/jobs', jobsRouter) // NEW
// ... existing routes ...

export { io } // Export for use in queue processor
export default httpServer
```

### 3. Database Schema (Job Tracking - Optional)

If you want persistent job history:

```sql
-- Optional: Store job history in PostgreSQL
CREATE TABLE job_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  project_id UUID NOT NULL REFERENCES projects(id),
  template_id UUID REFERENCES templates(id),
  job_type VARCHAR(50) NOT NULL, -- 'document_generation', 'export', etc.
  status VARCHAR(20) NOT NULL, -- 'queued', 'processing', 'completed', 'failed'
  progress INTEGER DEFAULT 0,
  input_data JSONB,
  result_data JSONB,
  error_message TEXT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_job_history_user (user_id),
  INDEX idx_job_history_status (status),
  INDEX idx_job_history_created (created_at DESC)
);
```

---

## 📊 Progress Tracking (Optional Enhancement)

### Real-time Progress Bar in UI

```typescript
// Optional: Show progress in a persistent panel
function JobProgressPanel() {
  const { activeJobs } = useJobs()
  
  if (activeJobs.length === 0) return null
  
  return (
    <div className="fixed bottom-4 right-4 w-80 space-y-2">
      {activeJobs.map(job => (
        <Card key={job.id}>
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{job.name}</span>
              <span className="text-xs text-muted-foreground">{job.progress}%</span>
            </div>
            <Progress value={job.progress} />
            <p className="text-xs text-muted-foreground mt-1">{job.message}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
```

---

## 🧪 Testing Plan

### Unit Tests
- ✅ Job enqueue endpoint
- ✅ Job status retrieval
- ✅ Job retry logic
- ✅ WebSocket event emission

### Integration Tests
- ✅ End-to-end job flow
- ✅ Multiple concurrent jobs
- ✅ Job failure and retry
- ✅ WebSocket connection handling

### Manual Testing Checklist
- [ ] Enqueue job → dialog closes immediately
- [ ] Start toast appears with correct info
- [ ] Can navigate away during generation
- [ ] Can start multiple jobs concurrently
- [ ] Completion toast appears when done
- [ ] "View Document" button opens correct document
- [ ] Failed jobs show retry option
- [ ] Progress updates work in real-time
- [ ] Jobs survive page refresh (stored in Redis)

---

## 🚀 Rollout Plan

### Phase 1: Core Implementation (Day 1-2)
1. Set up Bull queue system
2. Create job enqueue endpoint
3. Implement worker process
4. Add basic WebSocket events

### Phase 2: Frontend Integration (Day 2-3)
1. Update document generation flow
2. Implement toast notifications
3. Add job subscription logic
4. Test concurrent jobs

### Phase 3: Polish & Testing (Day 3)
1. Add progress tracking UI
2. Implement retry logic
3. Error handling improvements
4. Comprehensive testing

### Phase 4: Deployment
1. Deploy Bull queue to production Redis
2. Update backend with worker processes
3. Monitor job queue performance
4. Gradual rollout to users

---

## 📈 Success Metrics

### User Experience
- **Dialog Close Time**: < 500ms (vs 30-120s currently)
- **User Satisfaction**: Ability to start multiple documents
- **Completion Notification**: 100% delivery via toast

### System Performance
- **Job Queue Latency**: < 1s to enqueue
- **Concurrent Jobs**: Support 10+ simultaneous generations
- **Retry Success Rate**: > 90% on transient failures
- **WebSocket Delivery**: > 99% notification delivery

---

## 🔒 Security Considerations

1. **Job Authorization**: Verify user owns the job before showing status
2. **WebSocket Auth**: Require authentication before joining user rooms
3. **Rate Limiting**: Limit jobs per user (e.g., 10 concurrent max)
4. **Input Validation**: Sanitize all job parameters
5. **Error Messages**: Don't expose sensitive data in failure toasts

---

## 🎯 Alternative Implementations

### Option A: Bull Queue (Recommended)
- ✅ Mature, battle-tested
- ✅ Built-in retry logic
- ✅ Progress tracking
- ✅ Redis-backed persistence
- ❌ Requires Redis

### Option B: Database Polling
- ✅ No additional infrastructure
- ❌ Higher latency
- ❌ More DB load
- ❌ No real-time updates

### Option C: Server-Sent Events (SSE)
- ✅ Simpler than WebSockets
- ✅ One-way real-time updates
- ❌ Less flexible
- ❌ HTTP/1.1 connection limits

**Recommendation**: Use **Bull Queue + WebSocket** (Option A) for production-grade async job processing.

---

## 📚 Related Documentation

- [Bull Queue Documentation](https://github.com/OptimalBits/bull)
- [Socket.io Server-side Rooms](https://socket.io/docs/v4/rooms/)
- [Toast Notification Best Practices](https://www.nngroup.com/articles/toast-notifications/)
- [Background Job Processing Patterns](https://martinfowler.com/articles/patterns-of-distributed-systems/background-jobs.html)

---

## ✅ Acceptance Criteria

- [ ] User clicks "Generate" → dialog closes within 500ms
- [ ] Start toast appears with document name and provider info
- [ ] User can navigate away and start other documents
- [ ] Completion toast appears when document is ready
- [ ] "View Document" button opens the correct document
- [ ] Failed jobs show error message and retry option
- [ ] Multiple jobs can run concurrently (tested with 5+)
- [ ] Jobs survive page refresh (persisted in Redis)
- [ ] No regression in generation quality or metadata
- [ ] Comprehensive error handling for all failure modes

---

**Status**: 🔵 Ready for Implementation  
**Next Steps**: Review with team, estimate timeline, begin Phase 1

