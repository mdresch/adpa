# Job Monitor Enhancement - Worker & Queue Visibility

**Status**: 🔵 Planned  
**Priority**: Medium  
**Estimated Effort**: Small-Medium (3-5 days)  
**Dependencies**: Background Job Queue System (✅ Completed)  
**Target Release**: Q1 2026

---

## 📋 Feature Overview

Enhance the Job Monitor dashboard (`/app/jobs/page.tsx`) to provide better visibility into which **workers** are processing which **queues** and add project-specific context data for each job.

---

## 🎯 Problem Statement

**Current State:**
- Job monitor shows job status and progress
- Limited visibility into **which worker** is processing a job
- No clear separation between **queue** and **worker** information
- Missing project context data in job display

**User Pain Points:**
- Cannot see which worker picked up a job
- Cannot tell which queue a job is in
- No project details visible in job list
- Difficult to debug worker-specific issues

---

## ✨ Proposed Solution

Add **Worker & Queue Information Panel** to the Job Monitor with:

1. **Queue Information**
   - Queue name (ai-processing, document-processing, etc.)
   - Queue position
   - Jobs waiting in queue
   - Queue health status

2. **Worker Information**
   - Worker ID processing the job
   - Worker status (idle, processing, stalled)
   - Worker start time
   - Worker process ID

3. **Project Context Data**
   - Project name
   - Project ID
   - Template being used
   - User who initiated the job
   - Document name/type

---

## 🎨 UI/UX Design

### Enhanced Job Card

```
┌────────────────────────────────────────────────────────────┐
│ 📄 Generate Project Charter                        [Active] │
├────────────────────────────────────────────────────────────┤
│                                                              │
│ 📊 Job Details                                               │
│ ├─ Job ID: job-12345                                        │
│ ├─ Status: Processing (65%)                                 │
│ ├─ Duration: 18s / ~30s estimated                           │
│ └─ Created: 2 minutes ago                                   │
│                                                              │
│ 🔧 Worker & Queue Info              ⭐ NEW                   │
│ ├─ Queue: ai-processing                                     │
│ ├─ Position: Currently processing                           │
│ ├─ Worker: worker-ai-001                                    │
│ ├─ Worker Status: Active                                    │
│ └─ Process ID: 47832                                        │
│                                                              │
│ 📁 Project Context                  ⭐ NEW                   │
│ ├─ Project: "Digital Transformation Initiative"             │
│ ├─ Template: PMBOK Project Charter                          │
│ ├─ Initiated by: John Smith                                 │
│ └─ AI Provider: OpenAI GPT-4                                │
│                                                              │
│ [View Details]  [Cancel Job]  [View Logs]                   │
└────────────────────────────────────────────────────────────┘
```

### Queue Dashboard (New Tab)

```
┌────────────────────────────────────────────────────────────┐
│  [Active Jobs]  [Queue Overview]  [Worker Status] ⭐ NEW    │
└────────────────────────────────────────────────────────────┘

Queue Overview Tab:
┌────────────────────────────────────────────────────────────┐
│                                                              │
│  AI Processing Queue                          [🟢 Healthy]  │
│  ├─ Active Jobs: 3                                          │
│  ├─ Waiting: 2                                              │
│  ├─ Completed (last hour): 45                               │
│  ├─ Failed (last hour): 2                                   │
│  └─ Average Duration: 24.3s                                 │
│                                                              │
│  Active Workers:                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ worker-ai-001  [🟢 Processing]  Job: job-12345       │  │
│  │ worker-ai-002  [🟢 Processing]  Job: job-12346       │  │
│  │ worker-ai-003  [⚪ Idle]         Ready                │  │
│  │ worker-ai-004  [🟢 Processing]  Job: job-12347       │  │
│  │ worker-ai-005  [⚪ Idle]         Ready                │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  Document Processing Queue                    [🟢 Healthy]  │
│  ├─ Active Jobs: 1                                          │
│  ├─ Waiting: 0                                              │
│  └─ ...                                                     │
└────────────────────────────────────────────────────────────┘
```

### Worker Status Tab (New)

```
┌────────────────────────────────────────────────────────────┐
│                                                              │
│  AI Processing Workers (5 total)                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Worker ID      Status      Current Job      Uptime   │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ worker-ai-001  Processing  job-12345        2h 34m   │  │
│  │ worker-ai-002  Processing  job-12346        2h 34m   │  │
│  │ worker-ai-003  Idle        -                2h 34m   │  │
│  │ worker-ai-004  Processing  job-12347        2h 34m   │  │
│  │ worker-ai-005  Idle        -                2h 34m   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  Document Processing Workers (3 total)                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ worker-doc-001 Processing  job-56789        2h 34m   │  │
│  │ worker-doc-002 Idle        -                2h 34m   │  │
│  │ worker-doc-003 Idle        -                2h 34m   │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

---

## 🔧 Technical Implementation

### 1. Backend Enhancements

#### Extend Job Metadata
```typescript
// server/src/services/queueService.ts

interface JobMetadata {
  // Existing fields
  jobId: string
  status: string
  progress: number
  
  // NEW: Worker information
  workerId?: string
  workerProcessId?: number
  workerStartTime?: Date
  
  // NEW: Queue information
  queueName: string
  queuePosition?: number
  queuedAt: Date
  processingStartedAt?: Date
  
  // NEW: Project context
  projectId?: string
  projectName?: string
  templateId?: string
  templateName?: string
  userId?: string
  userName?: string
  aiProvider?: string
  aiModel?: string
}
```

#### Worker Registration
```typescript
// server/src/workers/aiWorker.ts

aiQueue.process('generate', 5, async (job, done) => {
  const workerId = `worker-ai-${process.pid}`
  const workerProcessId = process.pid
  
  // Register worker start
  await job.update({
    ...job.data,
    workerId,
    workerProcessId,
    processingStartedAt: new Date()
  })
  
  try {
    // Process job...
    const result = await generateDocument(job.data)
    done(null, result)
  } catch (error) {
    done(error)
  }
})
```

#### New API Endpoints
```typescript
// server/src/routes/jobs.ts

/**
 * GET /api/jobs/queues
 * Get all queue statuses
 */
router.get('/queues', authenticateToken, async (req, res) => {
  const queues = [
    {
      name: 'ai-processing',
      active: await aiQueue.getActiveCount(),
      waiting: await aiQueue.getWaitingCount(),
      completed: await aiQueue.getCompletedCount(),
      failed: await aiQueue.getFailedCount(),
      workers: await getActiveWorkers('ai-processing')
    },
    // ... other queues
  ]
  res.json({ queues })
})

/**
 * GET /api/jobs/workers
 * Get all worker statuses
 */
router.get('/workers', authenticateToken, async (req, res) => {
  const workers = await getAllWorkerStatuses()
  res.json({ workers })
})

/**
 * GET /api/jobs/:jobId/context
 * Get extended job context with project data
 */
router.get('/:jobId/context', authenticateToken, async (req, res) => {
  const job = await aiQueue.getJob(req.params.jobId)
  
  // Fetch project details
  const project = await pool.query(
    'SELECT id, name, description FROM projects WHERE id = $1',
    [job.data.projectId]
  )
  
  // Fetch template details
  const template = await pool.query(
    'SELECT id, name, framework FROM templates WHERE id = $1',
    [job.data.templateId]
  )
  
  // Fetch user details
  const user = await pool.query(
    'SELECT id, email, name FROM users WHERE id = $1',
    [job.data.userId]
  )
  
  res.json({
    job: {
      id: job.id,
      status: await job.getState(),
      progress: job.progress,
      workerId: job.data.workerId,
      queueName: 'ai-processing'
    },
    project: project.rows[0],
    template: template.rows[0],
    user: user.rows[0]
  })
})
```

### 2. Frontend Enhancements

#### Enhanced Job List Component
```typescript
// app/jobs/page.tsx

interface EnhancedJob {
  id: string
  status: string
  progress: number
  
  // Worker info
  workerId?: string
  workerProcessId?: number
  
  // Queue info
  queueName: string
  queuePosition?: number
  
  // Project context
  projectId?: string
  projectName?: string
  templateName?: string
  userName?: string
  aiProvider?: string
}

function JobCard({ job }: { job: EnhancedJob }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{job.templateName || 'Document Generation'}</CardTitle>
        <Badge>{job.status}</Badge>
      </CardHeader>
      
      <CardContent>
        {/* Existing job details */}
        
        {/* NEW: Worker & Queue Info */}
        <div className="mt-4">
          <h4 className="font-semibold mb-2">🔧 Worker & Queue Info</h4>
          <div className="space-y-1 text-sm">
            <div>Queue: <Badge variant="outline">{job.queueName}</Badge></div>
            {job.workerId && (
              <div>Worker: <code>{job.workerId}</code></div>
            )}
            {job.queuePosition !== undefined && (
              <div>Position: {job.queuePosition > 0 ? `#${job.queuePosition} in queue` : 'Processing'}</div>
            )}
          </div>
        </div>
        
        {/* NEW: Project Context */}
        <div className="mt-4">
          <h4 className="font-semibold mb-2">📁 Project Context</h4>
          <div className="space-y-1 text-sm">
            <div>Project: {job.projectName}</div>
            <div>Template: {job.templateName}</div>
            <div>User: {job.userName}</div>
            {job.aiProvider && (
              <div>AI Provider: {job.aiProvider}</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

#### New Queue Dashboard Tab
```typescript
// app/jobs/components/QueueDashboard.tsx

export function QueueDashboard() {
  const [queues, setQueues] = useState<QueueStatus[]>([])
  
  useEffect(() => {
    fetchQueueStatus()
    const interval = setInterval(fetchQueueStatus, 5000) // Refresh every 5s
    return () => clearInterval(interval)
  }, [])
  
  async function fetchQueueStatus() {
    const response = await fetch('/api/jobs/queues')
    const data = await response.json()
    setQueues(data.queues)
  }
  
  return (
    <div className="space-y-6">
      {queues.map(queue => (
        <Card key={queue.name}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{formatQueueName(queue.name)}</CardTitle>
              <Badge variant={queue.failed > 10 ? 'destructive' : 'success'}>
                {queue.failed > 10 ? '🔴 Issues' : '🟢 Healthy'}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="grid grid-cols-4 gap-4 mb-4">
              <Stat label="Active" value={queue.active} />
              <Stat label="Waiting" value={queue.waiting} />
              <Stat label="Completed" value={queue.completed} />
              <Stat label="Failed" value={queue.failed} />
            </div>
            
            <h4 className="font-semibold mb-2">Active Workers:</h4>
            <div className="space-y-2">
              {queue.workers.map(worker => (
                <WorkerBadge key={worker.id} worker={worker} />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
```

#### New Worker Status Tab
```typescript
// app/jobs/components/WorkerStatus.tsx

export function WorkerStatus() {
  const [workers, setWorkers] = useState<WorkerInfo[]>([])
  
  useEffect(() => {
    fetchWorkerStatus()
    const interval = setInterval(fetchWorkerStatus, 3000)
    return () => clearInterval(interval)
  }, [])
  
  async function fetchWorkerStatus() {
    const response = await fetch('/api/jobs/workers')
    const data = await response.json()
    setWorkers(data.workers)
  }
  
  return (
    <div className="space-y-6">
      {Object.entries(groupBy(workers, 'queueName')).map(([queueName, queueWorkers]) => (
        <Card key={queueName}>
          <CardHeader>
            <CardTitle>{formatQueueName(queueName)} Workers ({queueWorkers.length} total)</CardTitle>
          </CardHeader>
          
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Worker ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Current Job</TableHead>
                  <TableHead>Uptime</TableHead>
                  <TableHead>Jobs Processed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queueWorkers.map(worker => (
                  <TableRow key={worker.id}>
                    <TableCell><code>{worker.id}</code></TableCell>
                    <TableCell>
                      <Badge variant={worker.status === 'processing' ? 'default' : 'secondary'}>
                        {worker.status === 'processing' ? '🟢' : '⚪'} {worker.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{worker.currentJobId || '-'}</TableCell>
                    <TableCell>{formatUptime(worker.uptime)}</TableCell>
                    <TableCell>{worker.jobsProcessed}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
```

---

## 📊 Data Flow

```
1. Job Created
   ↓
2. Job added to Redis queue with metadata:
   - projectId, projectName
   - templateId, templateName
   - userId, userName
   - aiProvider, aiModel
   ↓
3. Worker picks up job
   ↓
4. Worker registers itself:
   - workerId (e.g., worker-ai-001)
   - workerProcessId (e.g., 47832)
   - processingStartedAt
   ↓
5. Job metadata updated with worker info
   ↓
6. Frontend polls /api/jobs/queues and /api/jobs/workers
   ↓
7. Dashboard displays:
   - Which queue the job is in
   - Which worker is processing it
   - Project context details
   - Real-time updates
```

---

## 🧪 Testing Plan

### Unit Tests
- ✅ Worker registration on job start
- ✅ Job metadata enrichment
- ✅ Queue status API endpoints
- ✅ Worker status API endpoints

### Integration Tests
- ✅ Job moves through queue with worker info
- ✅ Multiple workers processing same queue
- ✅ Worker failure and recovery
- ✅ Real-time updates via polling

### Manual Testing
- [ ] Create job and verify worker info appears
- [ ] View queue dashboard with multiple active jobs
- [ ] View worker status tab with idle/active workers
- [ ] Verify project context displays correctly
- [ ] Test with multiple queues simultaneously

---

## 📈 Success Metrics

### User Experience
- ✅ Users can identify which worker is processing their job
- ✅ Users can see queue position and wait time
- ✅ Users can view project context without navigating away
- ✅ Admins can monitor worker health and performance

### Technical Metrics
- API response time for `/api/jobs/queues`: < 500ms
- API response time for `/api/jobs/workers`: < 300ms
- UI update frequency: Every 3-5 seconds
- Zero performance impact on job processing

### Business Value
- **Improved Troubleshooting**: 50% faster debugging of job issues
- **Better Visibility**: Admins can identify bottlenecks
- **User Confidence**: Users see detailed job progress
- **Operational Insight**: Monitor worker utilization

---

## 🚀 Rollout Plan

### Phase 1: Backend Infrastructure (Day 1-2)
- Extend job metadata with worker/queue info
- Implement worker registration
- Create new API endpoints

### Phase 2: Frontend UI (Day 2-3)
- Enhance job cards with new information
- Create Queue Dashboard tab
- Create Worker Status tab

### Phase 3: Testing & Polish (Day 4)
- Integration testing
- Performance optimization
- UI polish and refinements

### Phase 4: Deployment (Day 5)
- Deploy to staging
- User acceptance testing
- Deploy to production

---

## 🔒 Security Considerations

- **Authorization**: Only authenticated users can view jobs
- **Isolation**: Users only see their own jobs (admins see all)
- **Worker Info**: Process IDs visible only to admins
- **Rate Limiting**: Queue/worker status endpoints have rate limits

---

## ✅ Acceptance Criteria

- [ ] Job cards display worker ID and queue name
- [ ] Job cards display project context (name, template, user)
- [ ] Queue Dashboard tab shows all queues with active/waiting counts
- [ ] Queue Dashboard tab shows active workers per queue
- [ ] Worker Status tab shows all workers with current job
- [ ] Real-time updates (3-5 second refresh)
- [ ] Works for all queue types (ai, document, baseline, pipeline)
- [ ] Mobile responsive design
- [ ] No performance degradation on job processing
- [ ] Comprehensive error handling

---

## 📚 Related Documentation

- **Background Job System**: `/docs/06-features/BACKGROUND_WORKERS_SUMMARY.md`
- **Job Queue Strategy**: `/docs/06-features/JOB_QUEUE_STRATEGY.md`
- **Current Job Monitor**: `/app/jobs/page.tsx`

---

## 💡 Future Enhancements (Post-MVP)

1. **Worker Performance Metrics**
   - Average job duration per worker
   - Success rate per worker
   - Worker efficiency scores

2. **Queue Optimization**
   - Automatic worker scaling based on queue size
   - Smart job prioritization
   - Load balancing across workers

3. **Advanced Monitoring**
   - Grafana dashboards
   - Prometheus metrics
   - Alert notifications for worker failures

4. **Worker Management**
   - Manually restart workers
   - Reassign jobs to different workers
   - Worker health checks

---

**Created**: October 31, 2025  
**Status**: 🔵 Ready for Implementation  
**Next Steps**: Review with team, prioritize in sprint planning

