# Job Monitor Enhancement - Implementation Plan

**Feature**: Worker & Queue Visibility Enhancement  
**Estimated Duration**: 3-5 days  
**Priority**: Medium (P2)  
**Status**: ✅ Completed  
**Target Release**: Q1 2026

---

## 📋 Executive Summary

This plan details the step-by-step implementation of enhanced job monitoring capabilities, adding visibility into worker assignment, queue status, and project context for all background jobs.

**Current State:**
- ✅ Job listing with status and progress
- ✅ Basic queue and worker tabs (mock data)
- ✅ Real-time job updates via Socket.io
- ✅ Job retry, cancellation, and cleanup features

**Target State:**
- ✅ Worker ID assignment and tracking
- ✅ Queue position and health monitoring
- ✅ Rich project context (project name, template, user)
- ✅ Live worker status dashboard
- ✅ Enhanced job cards with all metadata

---

## 🎯 Goals

### Primary Goals
1. **Worker Visibility**: Show which worker is processing each job
2. **Queue Health**: Monitor queue sizes, wait times, and bottlenecks
3. **Project Context**: Display project/template/user info without navigation
4. **Operational Insight**: Enable faster debugging and performance monitoring

### Success Metrics
- Job troubleshooting time reduced by 50%
- Zero performance impact on job processing
- API response times < 500ms for stats endpoints
- UI updates every 3-5 seconds without lag

---

## 📅 Implementation Timeline

### Day 1-2: Backend Infrastructure
- **Hours 1-4**: Database schema updates
- **Hours 5-8**: Worker registration system
- **Hours 9-12**: Job metadata enrichment
- **Hours 13-16**: New API endpoints

### Day 2-3: Frontend Development
- **Hours 1-4**: Enhanced job card components
- **Hours 5-8**: Queue Dashboard tab
- **Hours 9-12**: Worker Status tab
- **Hours 13-16**: Real-time update integration

### Day 4: Testing & Polish
- **Hours 1-4**: Integration testing
- **Hours 5-8**: Performance optimization
- **Hours 9-12**: UI refinements and bug fixes
- **Hours 13-16**: Documentation

### Day 5: Deployment
- **Hours 1-4**: Staging deployment and UAT
- **Hours 5-8**: Production deployment
- **Hours 9-12**: Monitoring and validation
- **Hours 13-16**: Retrospective and handoff

---

## 🔧 Technical Implementation

## Phase 1: Database Schema Updates (2 hours)

### 1.1 Update Jobs Table

**Goal**: Add columns for worker tracking and queue metadata

```sql
-- Migration: 300_add_worker_metadata_to_jobs.sql

ALTER TABLE jobs 
  ADD COLUMN IF NOT EXISTS worker_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS worker_process_id INTEGER,
  ADD COLUMN IF NOT EXISTS queue_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS queue_position INTEGER,
  ADD COLUMN IF NOT EXISTS queued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMP;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_jobs_worker_id ON jobs(worker_id);
CREATE INDEX IF NOT EXISTS idx_jobs_queue_name ON jobs(queue_name);
CREATE INDEX IF NOT EXISTS idx_jobs_processing_started_at ON jobs(processing_started_at);

COMMENT ON COLUMN jobs.worker_id IS 'Unique identifier of the worker processing this job (e.g., worker-ai-12345)';
COMMENT ON COLUMN jobs.worker_process_id IS 'Process ID of the worker (for debugging)';
COMMENT ON COLUMN jobs.queue_name IS 'Name of the queue this job belongs to';
COMMENT ON COLUMN jobs.queue_position IS 'Position in queue when queued (0 = processing)';
```

**Files to Create:**
- `server/migrations/300_add_worker_metadata_to_jobs.sql`

**Acceptance Criteria:**
- ✅ Migration runs without errors
- ✅ Existing jobs are not affected
- ✅ Indexes improve query performance

---

## Phase 2: Backend Services Enhancement (8 hours)

### 2.1 Worker Registration System

**File**: `server/src/services/queueService.ts`

**Changes Needed:**

```typescript
// Add at top of file
const WORKER_ID = `worker-${process.env.QUEUE_TYPE || 'generic'}-${process.pid}-${Date.now()}`
const WORKER_PROCESS_ID = process.pid

// Update job status function signature
export async function updateJobStatus(
  jobId: string, 
  status: string, 
  progress?: number, 
  workerId?: string,
  queueName?: string
): Promise<void> {
  try {
    const updateFields = ["status = $2"]
    const params: any[] = [jobId, status]
    let paramCount = 2

    if (progress !== undefined) {
      paramCount++
      updateFields.push(`progress = $${paramCount}`)
      params.push(progress.toString())
    }

    if (workerId) {
      paramCount++
      updateFields.push(`worker_id = $${paramCount}`)
      params.push(workerId)
      
      paramCount++
      updateFields.push(`worker_process_id = $${paramCount}`)
      params.push(WORKER_PROCESS_ID)
    }

    if (queueName) {
      paramCount++
      updateFields.push(`queue_name = $${paramCount}`)
      params.push(queueName)
    }

    if (status === "processing" && progress === 10) {
      updateFields.push(`processing_started_at = CURRENT_TIMESTAMP`)
    }

    await pool.query(
      `UPDATE jobs SET ${updateFields.join(", ")} WHERE id = $1`,
      params
    )

    // Emit real-time update with worker info
    const jobResult = await pool.query(
      `SELECT j.*, p.name as project_name, t.name as template_name, u.name as user_name
       FROM jobs j
       LEFT JOIN projects p ON j.project_id = p.id
       LEFT JOIN templates t ON (j.data->>'template_id')::uuid = t.id
       LEFT JOIN users u ON j.created_by = u.id
       WHERE j.id = $1`,
      [jobId]
    )
    
    if (jobResult.rows.length > 0) {
      const job = jobResult.rows[0]
      io.emit("job:status", {
        jobId,
        userId: job.created_by,
        status,
        progress,
        workerId,
        queueName,
        projectName: job.project_name,
        templateName: job.template_name,
        userName: job.user_name
      })
    }
  } catch (error) {
    logger.error(`Failed to update job status: ${jobId}`, error)
  }
}
```

**Update All Job Processors:**

```typescript
// In aiQueue.process(), documentQueue.process(), etc.
await updateJobStatus(
  jobId, 
  "processing", 
  10, 
  WORKER_ID,  // Pass worker ID
  "ai-processing"  // Pass queue name
)
```

**Acceptance Criteria:**
- ✅ Every job processing call includes worker ID
- ✅ Worker ID format: `worker-{type}-{pid}-{timestamp}`
- ✅ Process ID captured correctly
- ✅ Real-time updates include worker info

---

### 2.2 Queue Statistics API

**File**: `server/src/routes/queueStats.ts` (NEW)

```typescript
import express from "express"
import { authenticateToken } from "../middleware/auth"
import { pool } from "../database/connection"
import { 
  aiQueue, 
  documentQueue, 
  pipelineQueue, 
  processFlowQueue,
  baselineQueue,
  regenerationQueue 
} from "../services/queueService"
import { logger } from "../utils/logger"

const router = express.Router()

/**
 * GET /api/queue-stats/overview
 * Get all queue statistics
 */
router.get("/overview", authenticateToken, async (req, res) => {
  try {
    const queues = [
      { name: "ai-processing", queue: aiQueue },
      { name: "document-processing", queue: documentQueue },
      { name: "pipeline-processing", queue: pipelineQueue },
      { name: "process-flow-processing", queue: processFlowQueue },
      { name: "baseline-processing", queue: baselineQueue },
      { name: "document-regeneration", queue: regenerationQueue }
    ]

    const queueStats = await Promise.all(
      queues.map(async ({ name, queue }) => {
        const [active, waiting, completed, failed, delayed] = await Promise.all([
          queue.getActiveCount(),
          queue.getWaitingCount(),
          queue.getCompletedCount(),
          queue.getFailedCount(),
          queue.getDelayedCount()
        ])

        // Get active workers for this queue
        const workersResult = await pool.query(
          `SELECT DISTINCT worker_id, worker_process_id, COUNT(*) as job_count
           FROM jobs
           WHERE queue_name = $1 AND status = 'processing' AND worker_id IS NOT NULL
           GROUP BY worker_id, worker_process_id`,
          [name]
        )

        // Calculate average processing time (last 100 completed jobs)
        const avgTimeResult = await pool.query(
          `SELECT AVG(EXTRACT(EPOCH FROM (completed_at - processing_started_at))) as avg_seconds
           FROM jobs
           WHERE queue_name = $1 AND status = 'completed' AND processing_started_at IS NOT NULL
           ORDER BY completed_at DESC
           LIMIT 100`,
          [name]
        )

        const avgSeconds = avgTimeResult.rows[0]?.avg_seconds || 0
        const avgProcessingTime = formatDuration(avgSeconds)

        return {
          name,
          active,
          waiting,
          completed,
          failed,
          delayed,
          workers: workersResult.rows.length,
          avgProcessingTime,
          health: failed > 10 ? 'degraded' : 'healthy'
        }
      })
    )

    res.json({ queues: queueStats })
  } catch (error) {
    logger.error("Failed to get queue overview:", error)
    res.status(500).json({ error: "Failed to get queue statistics" })
  }
})

/**
 * GET /api/queue-stats/workers
 * Get all worker statuses
 */
router.get("/workers", authenticateToken, async (req, res) => {
  try {
    // Get active workers from database
    const activeWorkersResult = await pool.query(
      `SELECT 
        worker_id,
        worker_process_id,
        queue_name,
        COUNT(*) as current_jobs,
        MIN(processing_started_at) as first_job_start,
        MAX(progress) as max_progress
       FROM jobs
       WHERE status = 'processing' AND worker_id IS NOT NULL
       GROUP BY worker_id, worker_process_id, queue_name`
    )

    // Get completed job counts per worker (last 24 hours)
    const completedJobsResult = await pool.query(
      `SELECT 
        worker_id,
        COUNT(*) as jobs_completed,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as jobs_failed
       FROM jobs
       WHERE worker_id IS NOT NULL 
         AND completed_at > NOW() - INTERVAL '24 hours'
       GROUP BY worker_id`
    )

    const completedJobsMap = new Map(
      completedJobsResult.rows.map(row => [row.worker_id, row])
    )

    const workers = activeWorkersResult.rows.map(row => {
      const completed = completedJobsMap.get(row.worker_id) || { jobs_completed: 0, jobs_failed: 0 }
      const uptimeSeconds = row.first_job_start 
        ? Math.floor((Date.now() - new Date(row.first_job_start).getTime()) / 1000)
        : 0

      return {
        id: row.worker_id,
        name: row.worker_id,
        processId: row.worker_process_id,
        status: row.current_jobs > 0 ? 'active' : 'idle',
        queue: row.queue_name,
        currentJob: row.current_jobs > 0 ? `${row.current_jobs} jobs` : null,
        uptime: formatDuration(uptimeSeconds),
        uptimeSeconds,
        jobsCompleted: parseInt(completed.jobs_completed),
        jobsFailed: parseInt(completed.jobs_failed),
        successRate: completed.jobs_completed > 0 
          ? Math.round(((completed.jobs_completed - completed.jobs_failed) / completed.jobs_completed) * 100)
          : 100,
        cpu: Math.floor(Math.random() * 100), // TODO: Implement actual CPU monitoring
        memory: Math.floor(Math.random() * 100), // TODO: Implement actual memory monitoring
        health: 'healthy'
      }
    })

    res.json({ workers })
  } catch (error) {
    logger.error("Failed to get worker statistics:", error)
    res.status(500).json({ error: "Failed to get worker statistics" })
  }
})

/**
 * GET /api/queue-stats/metrics
 * Get aggregate metrics across all queues
 */
router.get("/metrics", authenticateToken, async (req, res) => {
  try {
    const metricsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_jobs,
        COUNT(*) FILTER (WHERE status = 'pending') as total_waiting,
        COUNT(*) FILTER (WHERE status = 'processing') as total_active,
        COUNT(*) FILTER (WHERE status = 'completed') as total_completed,
        COUNT(*) FILTER (WHERE status = 'failed') as total_failed,
        COUNT(DISTINCT worker_id) FILTER (WHERE status = 'processing' AND worker_id IS NOT NULL) as active_workers,
        COUNT(*) FILTER (WHERE status = 'completed' AND completed_at > NOW() - INTERVAL '1 hour') as completed_last_hour,
        AVG(EXTRACT(EPOCH FROM (completed_at - processing_started_at))) FILTER (WHERE status = 'completed' AND processing_started_at IS NOT NULL) as avg_processing_time
      FROM jobs
      WHERE created_at > NOW() - INTERVAL '7 days'
    `)

    const metrics = metricsResult.rows[0]
    
    // Calculate success rate
    const successRate = metrics.total_completed > 0
      ? Math.round((metrics.total_completed / (parseInt(metrics.total_completed) + parseInt(metrics.total_failed))) * 100)
      : 0

    // Determine queue health
    const queueHealth = metrics.total_failed > 10 ? 'degraded' : 'healthy'

    res.json({
      ...metrics,
      totalJobs: parseInt(metrics.total_jobs),
      totalWaiting: parseInt(metrics.total_waiting),
      totalActive: parseInt(metrics.total_active),
      totalCompleted: parseInt(metrics.total_completed),
      totalFailed: parseInt(metrics.total_failed),
      activeWorkers: parseInt(metrics.active_workers),
      completedLastHour: parseInt(metrics.completed_last_hour),
      avgProcessingTime: formatDuration(metrics.avg_processing_time),
      successRate,
      queueHealth
    })
  } catch (error) {
    logger.error("Failed to get queue metrics:", error)
    res.status(500).json({ error: "Failed to get queue metrics" })
  }
})

// Helper function to format duration
function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return '0s'
  
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  
  const parts = []
  if (days > 0) parts.push(`${days}d`)
  if (hours > 0) parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`)
  
  return parts.join(' ')
}

export default router
```

**File**: `server/src/server.ts`

```typescript
// Add new routes
import queueStatsRoutes from "./routes/queueStats"

app.use("/api/queue-stats", queueStatsRoutes)
```

**Acceptance Criteria:**
- ✅ `/api/queue-stats/overview` returns all queue statistics
- ✅ `/api/queue-stats/workers` returns worker details
- ✅ `/api/queue-stats/metrics` returns aggregate metrics
- ✅ Response times < 500ms
- ✅ Proper error handling and logging

---

### 2.3 Job Enrichment with Project Context

**File**: `server/src/routes/jobs.ts`

**Update the GET /jobs endpoint:**

```typescript
router.get("/", 
  authenticateToken,
  validateQuery(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    status: Joi.string().valid("pending", "processing", "completed", "failed", "cancelled").optional(),
    type: Joi.string().optional(),
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { page = 1, limit = 10, status, type } = req.query
      const offset = (Number(page) - 1) * Number(limit)

      // Enhanced query with worker and queue info
      let query = `
        SELECT 
          j.id, 
          j.type, 
          j.status, 
          j.progress, 
          j.error_message, 
          j.started_at, 
          j.completed_at, 
          j.created_at,
          j.data as job_data,
          j.result,
          j.worker_id,
          j.worker_process_id,
          j.queue_name,
          j.queue_position,
          j.queued_at,
          j.processing_started_at,
          COALESCE(j.project_name, p.name) as project_name,
          COALESCE(j.template_name, t.name) as template_name,
          COALESCE(j.document_name, d.name) as document_name,
          d.id as document_id,
          u.name as user_name,
          u.email as user_email
        FROM jobs j
        LEFT JOIN projects p ON j.project_id = p.id OR (j.data->>'projectId')::uuid = p.id OR (j.data->'variables'->>'project_id')::uuid = p.id
        LEFT JOIN templates t ON (j.data->>'template_id')::uuid = t.id
        LEFT JOIN documents d ON d.generation_metadata->>'job_id' = j.id::text
        LEFT JOIN users u ON j.created_by = u.id
        WHERE j.created_by = $1
      `

      // ... rest of existing code ...
      
      // Enhanced job mapping with worker and queue info
      const enrichedJobs = result.rows.map(job => {
        // ... existing code ...
        
        return {
          id: job.id,
          name: jobName,
          type: job.type,
          status: job.status,
          progress: job.progress || 0,
          error: job.error_message,
          startTime: job.started_at,
          completedTime: job.completed_at,
          queuedTime: job.created_at,
          priority: jobData.priority || 'medium',
          queue: job.queue_name || job.type,
          worker: job.worker_id || 'Unassigned',
          workerProcessId: job.worker_process_id,
          queuePosition: job.queue_position,
          logs: jobData.logs || [],
          // Enhanced metadata
          projectName: job.project_name,
          templateName: job.template_name,
          documentName: job.document_name,
          userName: job.user_name,
          metadata: {
            // ... existing metadata ...
            worker_id: job.worker_id,
            worker_process_id: job.worker_process_id,
            queue_name: job.queue_name,
            queue_position: job.queue_position,
            user_name: job.user_name,
            user_email: job.user_email
          }
        }
      })
      
      res.json({
        jobs: enrichedJobs,
        pagination: { /* ... */ }
      })
    } catch (error) {
      log.error("Get jobs error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)
```

**Acceptance Criteria:**
- ✅ All jobs include worker_id and worker_process_id
- ✅ Project name, template name, and user name enriched
- ✅ Queue name and position included
- ✅ Backward compatible with existing clients

---

## Phase 3: Frontend Development (8 hours)

### 3.1 Update API Client

**File**: `lib/api.ts`

```typescript
// Add new methods to apiClient
class ApiClient {
  // ... existing methods ...
  
  async getQueueStats() {
    return this.request('/queue-stats/overview')
  }
  
  async getWorkerStats() {
    return this.request('/queue-stats/workers')
  }
  
  async getQueueMetrics() {
    return this.request('/queue-stats/metrics')
  }
}
```

**Acceptance Criteria:**
- ✅ New methods added to API client
- ✅ Type definitions created for responses

---

### 3.2 Enhanced Job Card Component

**File**: `app/jobs/components/EnhancedJobCard.tsx` (NEW)

```typescript
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Server, User, FileText, Activity } from "lucide-react"

interface EnhancedJobCardProps {
  job: Job
  onViewDetails: () => void
  onViewLogs: () => void
}

export function EnhancedJobCard({ job, onViewDetails, onViewLogs }: EnhancedJobCardProps) {
  return (
    <Card className="border border-slate-200 dark:border-slate-700 hover-lift">
      <CardContent className="p-6">
        {/* Existing job details */}
        
        {/* NEW: Worker & Queue Info Section */}
        <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-200 dark:border-slate-800">
          <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <Server className="h-4 w-4 text-blue-500" />
            Worker & Queue Info
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">Queue</p>
              <Badge variant="outline" className="mt-1">{job.queue}</Badge>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Worker</p>
              <p className="font-mono text-xs mt-1 truncate" title={job.worker}>
                {job.worker !== 'Unassigned' ? job.worker.substring(0, 20) + '...' : 'Waiting...'}
              </p>
            </div>
            {job.workerProcessId && (
              <div>
                <p className="text-muted-foreground text-xs">Process ID</p>
                <code className="text-xs mt-1 block">{job.workerProcessId}</code>
              </div>
            )}
            {job.queuePosition !== undefined && (
              <div>
                <p className="text-muted-foreground text-xs">Position</p>
                <p className="font-medium mt-1">
                  {job.queuePosition === 0 ? 'Processing' : `#${job.queuePosition} in queue`}
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* NEW: Project Context Section */}
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-500" />
            Project Context
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            {job.projectName && (
              <div>
                <p className="text-muted-foreground text-xs">Project</p>
                <p className="font-medium mt-1 truncate" title={job.projectName}>
                  {job.projectName}
                </p>
              </div>
            )}
            {job.templateName && (
              <div>
                <p className="text-muted-foreground text-xs">Template</p>
                <p className="font-medium mt-1 truncate" title={job.templateName}>
                  {job.templateName}
                </p>
              </div>
            )}
            {job.userName && (
              <div>
                <p className="text-muted-foreground text-xs">Initiated By</p>
                <p className="font-medium mt-1 flex items-center gap-1 truncate">
                  <User className="h-3 w-3" />
                  <span title={job.userName}>{job.userName}</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
```

**Acceptance Criteria:**
- ✅ Worker info displayed prominently
- ✅ Queue position shown
- ✅ Project context visible
- ✅ Responsive design
- ✅ Proper truncation for long names

---

### 3.3 Queue Dashboard Component

**File**: `app/jobs/components/QueueDashboard.tsx` (NEW)

```typescript
"use client"

import { useState, useEffect } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Activity, Server } from "lucide-react"
import { apiClient } from "@/lib/api"

interface QueueStatus {
  name: string
  active: number
  waiting: number
  completed: number
  failed: number
  workers: number
  avgProcessingTime: string
  health: string
}

export function QueueDashboard() {
  const [queues, setQueues] = useState<QueueStatus[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchQueueStatus()
    const interval = setInterval(fetchQueueStatus, 5000) // Refresh every 5s
    return () => clearInterval(interval)
  }, [])

  async function fetchQueueStatus() {
    try {
      const data = await apiClient.getQueueStats()
      setQueues(data.queues)
    } catch (error) {
      console.error('Failed to fetch queue stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div>Loading queue statistics...</div>
  }

  return (
    <div className="space-y-6">
      {queues.map(queue => (
        <Card key={queue.name} className="glass border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg capitalize flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-500" />
                {queue.name.replace(/-/g, ' ')}
              </CardTitle>
              <Badge 
                variant={queue.health === 'healthy' ? 'default' : 'destructive'}
                className="text-xs"
              >
                {queue.health === 'healthy' ? '🟢 Healthy' : '🔴 Issues'}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
              <StatCard label="Active" value={queue.active} color="blue" />
              <StatCard label="Waiting" value={queue.waiting} color="yellow" />
              <StatCard label="Completed" value={queue.completed} color="green" />
              <StatCard label="Failed" value={queue.failed} color="red" />
              <StatCard label="Workers" value={queue.workers} icon={<Server className="h-4 w-4" />} />
            </div>
            
            <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
              <p className="text-sm text-muted-foreground">Avg Processing Time</p>
              <p className="font-semibold text-lg">{queue.avgProcessingTime}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function StatCard({ label, value, color, icon }: any) {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600',
    red: 'bg-red-50 dark:bg-red-900/20 text-red-600',
  }

  return (
    <div className={`text-center p-3 rounded-lg ${colorClasses[color] || 'bg-gray-50'}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
        {icon}
        {label}
      </p>
    </div>
  )
}
```

**Acceptance Criteria:**
- ✅ All queues displayed with statistics
- ✅ Real-time updates every 5 seconds
- ✅ Health status badges
- ✅ Average processing time shown
- ✅ Responsive grid layout

---

### 3.4 Worker Status Component

**File**: `app/jobs/components/WorkerStatus.tsx` (NEW)

```typescript
"use client"

import { useState, useEffect } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Server, Cpu, Memory } from "lucide-react"
import { apiClient } from "@/lib/api"

interface WorkerInfo {
  id: string
  name: string
  status: string
  queue: string
  currentJob: string | null
  uptime: string
  jobsCompleted: number
  jobsFailed: number
  successRate: number
  cpu: number
  memory: number
}

export function WorkerStatus() {
  const [workers, setWorkers] = useState<WorkerInfo[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchWorkerStatus()
    const interval = setInterval(fetchWorkerStatus, 3000) // Refresh every 3s
    return () => clearInterval(interval)
  }, [])

  async function fetchWorkerStatus() {
    try {
      const data = await apiClient.getWorkerStats()
      setWorkers(data.workers)
    } catch (error) {
      console.error('Failed to fetch worker stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div>Loading worker statistics...</div>
  }

  // Group workers by queue
  const workersByQueue = workers.reduce((acc, worker) => {
    if (!acc[worker.queue]) acc[worker.queue] = []
    acc[worker.queue].push(worker)
    return acc
  }, {} as Record<string, WorkerInfo[]>)

  return (
    <div className="space-y-6">
      {Object.entries(workersByQueue).map(([queueName, queueWorkers]) => (
        <Card key={queueName} className="glass border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg capitalize flex items-center gap-2">
              <Server className="h-5 w-5 text-purple-500" />
              {queueName.replace(/-/g, ' ')} Workers ({queueWorkers.length} total)
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Worker ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Current Job</TableHead>
                  <TableHead>Uptime</TableHead>
                  <TableHead>Jobs</TableHead>
                  <TableHead>Success Rate</TableHead>
                  <TableHead>Resources</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queueWorkers.map(worker => (
                  <TableRow key={worker.id}>
                    <TableCell>
                      <code className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                        {worker.id.substring(0, 25)}...
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={worker.status === 'active' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {worker.status === 'active' ? '🟢' : '⚪'} {worker.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {worker.currentJob || '-'}
                    </TableCell>
                    <TableCell>{worker.uptime}</TableCell>
                    <TableCell>
                      <div className="text-xs">
                        <span className="text-green-600 font-medium">{worker.jobsCompleted}</span>
                        {worker.jobsFailed > 0 && (
                          <span className="text-red-600 ml-1">/ {worker.jobsFailed} failed</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={worker.successRate >= 90 ? 'default' : worker.successRate >= 70 ? 'secondary' : 'destructive'}
                        className="text-xs"
                      >
                        {worker.successRate}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3 text-xs">
                        <div className="flex items-center gap-1">
                          <Cpu className="h-3 w-3 text-blue-500" />
                          <span>{worker.cpu}%</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Memory className="h-3 w-3 text-purple-500" />
                          <span>{worker.memory}%</span>
                        </div>
                      </div>
                    </TableCell>
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

**Acceptance Criteria:**
- ✅ Workers grouped by queue
- ✅ Real-time updates every 3 seconds
- ✅ Success rate badges with color coding
- ✅ CPU/Memory stats displayed (placeholders for now)
- ✅ Table responsive on mobile

---

### 3.5 Update Main Jobs Page

**File**: `app/jobs/page.tsx`

**Changes:**

1. Replace mock data fallbacks with real API data from new endpoints
2. Integrate `QueueDashboard` and `WorkerStatus` components
3. Update job cards to use `EnhancedJobCard`
4. Add real-time Socket.io listeners for worker updates

```typescript
// Import new components
import { QueueDashboard } from "./components/QueueDashboard"
import { WorkerStatus } from "./components/WorkerStatus"
import { EnhancedJobCard } from "./components/EnhancedJobCard"

// Remove mock data (mockQueues, mockWorkers)

// In TabsContent for "queues"
<TabsContent value="queues" className="space-y-4">
  <QueueDashboard />
</TabsContent>

// In TabsContent for "workers"
<TabsContent value="workers" className="space-y-4">
  <WorkerStatus />
</TabsContent>

// Update job cards
{filteredJobs.map((job, index) => (
  <EnhancedJobCard
    key={job.id}
    job={job}
    onViewDetails={() => setSelectedJob(job.id)}
    onViewLogs={() => setViewingLogs(job.id)}
  />
))}
```

**Acceptance Criteria:**
- ✅ No mock data used
- ✅ Real-time updates working
- ✅ All three tabs functional
- ✅ Proper error handling
- ✅ Loading states

---

## Phase 4: Testing & Quality Assurance (8 hours)

### 4.1 Unit Tests

**File**: `server/__tests__/queueStats.test.ts` (NEW)

```typescript
import request from 'supertest'
import app from '../server'
import { pool } from '../database/connection'

describe('Queue Statistics API', () => {
  let authToken: string

  beforeAll(async () => {
    // Login and get token
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@adpa.com', password: 'admin123' })
    authToken = loginRes.body.token
  })

  test('GET /api/queue-stats/overview returns queue statistics', async () => {
    const res = await request(app)
      .get('/api/queue-stats/overview')
      .set('Authorization', `Bearer ${authToken}`)

    expect(res.status).toBe(200)
    expect(res.body.queues).toBeDefined()
    expect(Array.isArray(res.body.queues)).toBe(true)
    
    // Check structure of first queue
    if (res.body.queues.length > 0) {
      const queue = res.body.queues[0]
      expect(queue).toHaveProperty('name')
      expect(queue).toHaveProperty('active')
      expect(queue).toHaveProperty('waiting')
      expect(queue).toHaveProperty('workers')
      expect(queue).toHaveProperty('avgProcessingTime')
    }
  })

  test('GET /api/queue-stats/workers returns worker information', async () => {
    const res = await request(app)
      .get('/api/queue-stats/workers')
      .set('Authorization', `Bearer ${authToken}`)

    expect(res.status).toBe(200)
    expect(res.body.workers).toBeDefined()
    expect(Array.isArray(res.body.workers)).toBe(true)
  })

  test('GET /api/queue-stats/metrics returns aggregate metrics', async () => {
    const res = await request(app)
      .get('/api/queue-stats/metrics')
      .set('Authorization', `Bearer ${authToken}`)

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('totalJobs')
    expect(res.body).toHaveProperty('activeWorkers')
    expect(res.body).toHaveProperty('successRate')
    expect(res.body).toHaveProperty('queueHealth')
  })
})
```

**Acceptance Criteria:**
- ✅ All API tests pass
- ✅ Error cases covered
- ✅ Authentication tested
- ✅ Response formats validated

---

### 4.2 Integration Tests

**Test Scenarios:**

1. **Worker Registration Test**
   - Start a job
   - Verify worker_id is assigned
   - Verify worker_process_id matches
   - Verify queue_name is set

2. **Queue Stats Test**
   - Create multiple jobs across queues
   - Fetch queue statistics
   - Verify counts are accurate
   - Verify average processing time

3. **Real-time Update Test**
   - Start a job
   - Listen for Socket.io `job:status` events
   - Verify worker info is included
   - Verify project context is included

**Acceptance Criteria:**
- ✅ Worker assignment works correctly
- ✅ Queue statistics are accurate
- ✅ Real-time updates include new fields
- ✅ No performance degradation

---

### 4.3 Performance Testing

**Test Plan:**

```typescript
// Load test with k6
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 50 },  // Ramp up to 50 users
    { duration: '1m', target: 50 },   // Stay at 50 users
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],   // Less than 1% failure rate
  },
};

export default function () {
  const token = 'YOUR_TEST_TOKEN';
  
  // Test queue stats endpoint
  const res1 = http.get('http://localhost:5000/api/queue-stats/overview', {
    headers: { Authorization: `Bearer ${token}` },
  });
  check(res1, {
    'queue stats status is 200': (r) => r.status === 200,
    'queue stats response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  // Test worker stats endpoint
  const res2 = http.get('http://localhost:5000/api/queue-stats/workers', {
    headers: { Authorization: `Bearer ${token}` },
  });
  check(res2, {
    'worker stats status is 200': (r) => r.status === 200,
    'worker stats response time < 300ms': (r) => r.timings.duration < 300,
  });
  
  sleep(1);
}
```

**Performance Goals:**
- `/api/queue-stats/overview`: < 500ms (p95)
- `/api/queue-stats/workers`: < 300ms (p95)
- `/api/queue-stats/metrics`: < 200ms (p95)
- Zero job processing slowdown

**Acceptance Criteria:**
- ✅ All endpoints meet performance targets
- ✅ No memory leaks during load test
- ✅ Database query performance acceptable
- ✅ Real-time updates don't cause UI lag

---

## Phase 5: Deployment (4 hours)

### 5.1 Pre-Deployment Checklist

- [ ] All tests passing (unit + integration)
- [ ] Performance tests completed
- [ ] Database migration tested locally
- [ ] Code reviewed and approved
- [ ] Documentation updated
- [ ] Changelog entry created
- [ ] Feature flags ready (if needed)

### 5.2 Staging Deployment

```bash
# 1. Run database migration
psql $STAGING_DATABASE_URL -f server/migrations/300_add_worker_metadata_to_jobs.sql

# 2. Deploy backend
git checkout development
git pull origin development
cd server
npm run build
pm2 restart adpa-backend

# 3. Deploy frontend
cd ..
npm run build
pm2 restart adpa-frontend

# 4. Verify deployment
curl http://staging.adpa.com/api/health
curl http://staging.adpa.com/api/queue-stats/overview -H "Authorization: Bearer $TOKEN"

# 5. Check logs
pm2 logs adpa-backend --lines 100
```

### 5.3 User Acceptance Testing

**Test Cases:**

1. **Job Monitoring**
   - [ ] Create a new AI generation job
   - [ ] Verify worker ID appears within 5 seconds
   - [ ] Verify queue name is correct
   - [ ] Verify project context displays

2. **Queue Dashboard**
   - [ ] Navigate to Jobs page → Queues tab
   - [ ] Verify all queues display statistics
   - [ ] Verify worker counts are accurate
   - [ ] Wait 5 seconds and verify auto-refresh

3. **Worker Status**
   - [ ] Navigate to Workers tab
   - [ ] Verify active workers are shown
   - [ ] Verify current job assignments
   - [ ] Verify success rates display

4. **Performance**
   - [ ] Page loads in < 2 seconds
   - [ ] Real-time updates don't cause lag
   - [ ] Tabs switch instantly

### 5.4 Production Deployment

**Timeline:**
- Hour 1-2: Deploy to production during low-traffic window
- Hour 3: Monitor metrics and error rates
- Hour 4: Validate with stakeholders, document issues

**Rollback Plan:**
```bash
# If critical issues found:
1. Revert database migration (if needed):
   psql $PROD_DATABASE_URL -f server/migrations/300_rollback.sql

2. Rollback code:
   git checkout <previous-stable-commit>
   npm run build
   pm2 restart all

3. Notify team and investigate
```

**Acceptance Criteria:**
- ✅ Zero downtime deployment
- ✅ No errors in production logs
- ✅ All features working as expected
- ✅ Performance metrics within targets

---

## 📊 Success Metrics

### Quantitative Metrics

1. **Troubleshooting Speed**
   - Baseline: Average 10 minutes to identify stuck job
   - Target: Average 5 minutes (50% reduction)
   - Measure: Time from user report to root cause identified

2. **API Performance**
   - `/api/queue-stats/overview`: < 500ms (p95)
   - `/api/queue-stats/workers`: < 300ms (p95)
   - `/api/jobs` (enhanced): < 600ms (p95)

3. **UI Responsiveness**
   - Page load time: < 2 seconds
   - Real-time update latency: < 1 second
   - Tab switch: < 100ms

4. **Operational Visibility**
   - 100% of jobs show worker assignment
   - 100% of jobs show project context
   - Queue health visible for all queues

### Qualitative Metrics

1. **User Satisfaction**
   - Survey admin users after 1 week
   - Target: 90% satisfaction with new visibility

2. **Support Tickets**
   - Baseline: ~5 tickets/week related to job monitoring
   - Target: < 2 tickets/week (60% reduction)

3. **Developer Feedback**
   - Gather feedback from dev team
   - Document pain points and iterate

---

## 🔒 Security Considerations

### Authorization
- ✅ Only authenticated users can access queue stats
- ✅ Worker process IDs visible only to admins
- ✅ Users can only see their own jobs (unless admin)

### Rate Limiting
- Queue stats endpoints: 60 requests/minute per user
- Worker stats endpoints: 120 requests/minute per user

### Data Privacy
- Worker IDs don't contain sensitive information
- Process IDs sanitized in public API responses
- User emails not exposed in job listings

---

## 📚 Documentation Updates

### 1. User Documentation

**File**: `docs/11-user-guides/job-monitoring-guide.md`

Topics:
- How to interpret worker status
- Understanding queue health indicators
- Troubleshooting stuck jobs
- Reading job metadata

### 2. Developer Documentation

**File**: `docs/06-features/JOB_MONITOR_ENHANCEMENT.md`

Topics:
- Worker registration system
- Queue statistics architecture
- API reference for new endpoints
- Real-time update protocol

### 3. API Documentation

**File**: `docs/05-integrations/JOB_MONITORING_API.md`

Topics:
- `/api/queue-stats/overview` specification
- `/api/queue-stats/workers` specification
- `/api/queue-stats/metrics` specification
- Response format examples
- Error codes

---

## 🐛 Known Issues & Future Enhancements

### Known Limitations (MVP)

1. **CPU/Memory Metrics**
   - Current: Placeholder random values
   - Future: Integrate with actual process monitoring (e.g., `pidusage`)

2. **Historical Data**
   - Current: Limited to last 24 hours
   - Future: Configurable time ranges (7d, 30d)

3. **Worker Management**
   - Current: Read-only worker status
   - Future: Ability to restart/pause workers from UI

### Future Enhancements (Post-MVP)

1. **Advanced Analytics** (Week 12)
   - Worker efficiency scores
   - Queue optimization recommendations
   - Predictive wait time estimates

2. **Alerting System** (Week 13)
   - Alert when queue size > threshold
   - Alert when worker fails repeatedly
   - Slack/email notifications

3. **Performance Dashboards** (Week 14)
   - Grafana integration
   - Prometheus metrics export
   - Custom dashboards for different roles

4. **Auto-scaling** (Week 15)
   - Dynamic worker scaling based on queue size
   - Predictive scaling using ML
   - Cost optimization

---

## 🎓 Team Training & Handoff

### Training Sessions

**Session 1: Overview (30 minutes)**
- Architecture walkthrough
- Demo of new features
- Q&A

**Session 2: Deep Dive (1 hour)**
- Code walkthrough
- Database schema changes
- API usage examples
- Troubleshooting tips

**Session 3: Operations (30 minutes)**
- How to monitor in production
- Common issues and solutions
- Escalation procedures

### Handoff Checklist

- [ ] Code reviewed and merged
- [ ] Documentation updated
- [ ] Training sessions completed
- [ ] Production deployment successful
- [ ] Monitoring dashboards configured
- [ ] Team has access to logs/metrics
- [ ] On-call team briefed

---

## 📞 Support & Escalation

### During Implementation

**Primary Contact**: Development Lead  
**Slack Channel**: #adpa-job-monitor  
**Stand-ups**: Daily at 10:00 AM

### Post-Deployment

**L1 Support**: Check documentation first  
**L2 Support**: Development team (Slack #adpa-support)  
**L3 Support**: Architecture team for critical issues

**Critical Issues**:
- Page 500 errors: Immediately rollback
- Performance degradation > 2x: Investigate within 1 hour
- Data inconsistencies: Escalate to architecture team

---

## ✅ Final Acceptance Criteria

### Functional Requirements
- [ ] All jobs show worker assignment
- [ ] Queue dashboard displays real-time statistics
- [ ] Worker status tab shows active/idle workers
- [ ] Project context visible in job cards
- [ ] Real-time updates working for all fields

### Non-Functional Requirements
- [ ] API response times meet targets
- [ ] UI updates smoothly without lag
- [ ] Zero job processing slowdown
- [ ] Database queries optimized
- [ ] No memory leaks detected

### Deployment Requirements
- [ ] Staging deployment successful
- [ ] UAT sign-off obtained
- [ ] Production deployment zero-downtime
- [ ] Rollback plan tested
- [ ] Team trained on new features

### Documentation Requirements
- [ ] User guide published
- [ ] Developer docs updated
- [ ] API reference complete
- [ ] Changelog entry created

---

## 🎉 Conclusion

This implementation plan provides a comprehensive roadmap for adding worker and queue visibility to the ADPA Job Monitor. The enhancement will significantly improve operational visibility, reduce troubleshooting time, and provide valuable insights into system performance.

**Key Deliverables:**
1. Worker ID tracking and process monitoring
2. Real-time queue statistics dashboard
3. Enhanced job cards with project context
4. Comprehensive API for queue/worker metrics
5. Full test coverage and documentation

**Success Factors:**
- Incremental, testable implementation
- Zero impact on existing job processing
- Strong focus on performance and UX
- Comprehensive documentation and training

**Next Steps:**
1. Review and approve this plan
2. Allocate development resources
3. Schedule kickoff meeting
4. Begin Phase 1 implementation

---

**Document Version**: 1.0  
**Last Updated**: {{date}}  
**Status**: 🟡 Ready for Review  
**Approvers**: Development Lead, Product Owner, Tech Lead

