import express from "express"
// Joi already imported above
import { pool } from "../database/connection"
import { authenticateToken, requirePermission } from "../middleware/auth"
import { validateParams, validateQuery, validate, schemas } from "../middleware/validation"
import Joi from "joi"
import { logger, childLogger } from "../utils/logger"
import { getJobStatus, cancelJob, addJob } from "../services/queueService"
import { v4 as uuidv4 } from "uuid"
import { JobType } from "../services/jobs/types"
import AnalyticsTrackingService from "../services/analyticsTrackingService"

const router = express.Router()

// Helper function to get queue name from job type
function getQueueNameFromType(jobType: string): string {
  const queueMap: Record<string, string> = {
    'ai-generate': 'ai-processing',
    'save-inline-entities': 'ai-processing',
    'document-convert': 'document-processing',
    'pipeline-processing': 'pipeline-processing',
    'baseline-extract': 'baseline-processing',
    'process-flow': 'process-flow-processing',
    'document-regeneration': 'document-regeneration',
    'quality-audit': 'quality-audit',
    'extract-project-data': 'project-data-extraction',
    // Handle child extraction jobs (extract-entity-*)
    'extract-entity-stakeholders': 'project-data-extraction',
    'extract-entity-requirements': 'project-data-extraction',
    'extract-entity-risks': 'project-data-extraction',
    'extract-entity-assumptions': 'project-data-extraction',
    'extract-entity-constraints': 'project-data-extraction',
    'extract-entity-dependencies': 'project-data-extraction',
    'extract-entity-milestones': 'project-data-extraction',
    'extract-entity-deliverables': 'project-data-extraction',
    'extract-entity-activities': 'project-data-extraction',
    'extract-entity-resources': 'project-data-extraction',
    'extract-entity-budget': 'project-data-extraction',
    'extract-entity-timeline': 'project-data-extraction',
    'extract-entity-quality': 'project-data-extraction',
    'extract-entity-communication': 'project-data-extraction',
    'extract-entity-procurement': 'project-data-extraction',
    'extract-entity-stakeholder': 'project-data-extraction',
  }
  
  // Check exact match first
  if (queueMap[jobType]) {
    return queueMap[jobType]
  }
  
  // Check if it's a child extraction job (extract-entity-*)
  if (jobType.startsWith('extract-entity-')) {
    return 'project-data-extraction'
  }
  
  // Default fallback - try to infer from job type
  if (jobType.includes('ai') || jobType.includes('generate')) {
    return 'ai-processing'
  }
  if (jobType.includes('document') || jobType.includes('convert')) {
    return 'document-processing'
  }
  if (jobType.includes('pipeline')) {
    return 'pipeline-processing'
  }
  if (jobType.includes('baseline')) {
    return 'baseline-processing'
  }
  if (jobType.includes('process-flow') || jobType.includes('processflow')) {
    return 'process-flow-processing'
  }
  if (jobType.includes('quality') || jobType.includes('audit')) {
    return 'quality-audit'
  }
  if (jobType.includes('extract') || jobType.includes('extraction')) {
    return 'project-data-extraction'
  }
  
  // Last resort: return a generic queue name based on job type
  return jobType + '-queue'
}

function parseJobData(raw: unknown): Record<string, unknown> {
  if (!raw) return {}
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Record<string, unknown>
    } catch {
      return {}
    }
  }
  if (typeof raw === "object") return raw as Record<string, unknown>
  return {}
}

/** List endpoints only — omits large blobs (prompts, context, generated content). */
const SLIM_JOB_DATA_SQL = `jsonb_build_object(
  'childJobIds', CASE WHEN jsonb_typeof(j.data->'childJobIds') = 'array' THEN j.data->'childJobIds' ELSE '[]'::jsonb END,
  'name', j.data->'name',
  'documentName', j.data->'documentName',
  'document_name', j.data->'document_name',
  'template_name', j.data->'template_name',
  'variables', jsonb_build_object(
    'template_name', j.data->'variables'->'template_name',
    'project_name', j.data->'variables'->'project_name',
    'project_id', j.data->'variables'->'project_id'
  ),
  'projectName', j.data->'projectName',
  'priority', j.data->'priority',
  'provider', j.data->'provider',
  'model', j.data->'model',
  'temperature', j.data->'temperature',
  'template_id', j.data->'template_id',
  'projectId', j.data->'projectId',
  'documentId', j.data->'documentId',
  'document_id', j.data->'document_id',
  'tokens', j.data->'tokens',
  'llmRequestCount', COALESCE(jsonb_array_length(j.data->'llm_insights'->'requests'), 0),
  'llmProgressSteps', COALESCE(j.data->'llmProgressSteps', '[]'::jsonb),
  'worker_id', j.data->'worker_id',
  'worker', j.data->'worker',
  'currentStep', j.data->'currentStep',
  'compressionProgress', j.data->'compressionProgress',
  'currentDocument', j.data->'currentDocument',
  'stepProgress', j.data->'stepProgress',
  'activeDocuments', j.data->'activeDocuments',
  'providerAssignments', j.data->'providerAssignments'
) AS job_data`

// Lightweight recent-activity feed for sidebar (no document joins / child-job fan-out)
router.get(
  "/activity",
  authenticateToken,
  validateQuery(
    Joi.object({
      limit: Joi.number().integer().min(1).max(20).default(5),
      type: Joi.string().default("ai-generate"),
    })
  ),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { limit = 5, type = "ai-generate" } = req.query
      const result = await pool.query(
        `SELECT
          j.id,
          j.type,
          j.status,
          j.created_at AT TIME ZONE 'UTC' AS created_at,
          COALESCE(j.project_name, j.data->>'projectName', j.data->'variables'->>'project_name') AS project_name,
          COALESCE(j.template_name, j.data->>'template_name', j.data->'variables'->>'template_name') AS template_name,
          COALESCE(j.document_name, j.data->>'documentName', j.data->>'name') AS document_name,
          COALESCE(j.project_id::text, j.data->>'projectId', j.data->'variables'->>'project_id') AS project_id,
          COALESCE(j.data->>'documentId', j.data->>'sourceDocumentId', j.data->'documentIds'->>0) AS document_id
        FROM jobs j
        WHERE j.created_by = $1 AND j.type = $2
        ORDER BY j.created_at DESC
        LIMIT $3`,
        [req.user?.id, type, limit]
      )
      res.json({ jobs: result.rows })
    } catch (error) {
      log.error("Get job activity error:", error)
      const message = error instanceof Error ? error.message : String(error)
      const status =
        message.includes("circuit open") || message.includes("temporarily unavailable") ? 503 : 500
      res.status(status).json({ error: message })
    }
  }
)

// Get user's jobs
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

      let query = `
        SELECT 
          j.id, 
          j.type, 
          j.status, 
          j.progress, 
          j.error_message, 
          j.started_at AT TIME ZONE 'UTC' AS started_at, 
          j.completed_at AT TIME ZONE 'UTC' AS completed_at, 
          j.created_at AT TIME ZONE 'UTC' AS created_at,
          ${SLIM_JOB_DATA_SQL},
          j.worker_id,
          j.worker_process_id,
          j.queue_name,
          j.queue_position,
          j.queued_at AT TIME ZONE 'UTC' AS queued_at,
          j.processing_started_at AT TIME ZONE 'UTC' AS processing_started_at,
          COALESCE(j.project_name, p.name) as project_name,
          COALESCE(j.template_name, t.name) as template_name,
          COALESCE(j.document_name, d1.name, d2.name) as document_name,
          COALESCE(d1.id, d2.id) as document_id,
          u.name as user_name,
          u.email as user_email
        FROM jobs j
        LEFT JOIN projects p ON p.id = COALESCE(
          j.project_id,
          (CASE WHEN j.data->>'projectId' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN (j.data->>'projectId')::uuid ELSE NULL END),
          (CASE WHEN j.data->'variables'->>'project_id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN (j.data->'variables'->>'project_id')::uuid ELSE NULL END)
        )
        LEFT JOIN templates t ON 
          (CASE WHEN j.data->>'template_id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN (j.data->>'template_id')::uuid ELSE NULL END) = t.id
        LEFT JOIN documents d1 ON d1.id = COALESCE(
          (CASE WHEN j.data->>'documentId' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN (j.data->>'documentId')::uuid ELSE NULL END),
          (CASE WHEN j.data->>'sourceDocumentId' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN (j.data->>'sourceDocumentId')::uuid ELSE NULL END),
          (CASE WHEN j.data->'documentIds' IS NOT NULL AND jsonb_typeof(j.data->'documentIds') = 'array' AND jsonb_array_length(j.data->'documentIds') > 0 AND (j.data->'documentIds'->>0) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN (j.data->'documentIds'->>0)::uuid ELSE NULL END)
        )
        LEFT JOIN documents d2 ON d2.generation_metadata->>'job_id' = j.id::text
        LEFT JOIN users u ON j.created_by = u.id
        WHERE j.created_by = $1 AND NOT j.type LIKE 'extract-entity-%'
      `

      const params: any[] = [req.user?.id]
      let paramCount = 1

      if (status) {
        paramCount++
        query += ` AND j.status = $${paramCount}`
        params.push(status)
      }

      if (type) {
        paramCount++
        query += ` AND j.type = $${paramCount}`
        params.push(type)
      }

      query += ` ORDER BY j.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`
      params.push(limit, offset)

      const result = await pool.query(query, params)

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const allChildJobIds: string[] = []
      result.rows.forEach(job => {
        const jobData = parseJobData(job.job_data)
        if (Array.isArray(jobData.childJobIds)) {
          // Limit to prevent OOM on massive child job arrays
          let count = 0;
          jobData.childJobIds.forEach((id: any) => {
            if (typeof id === 'string' && uuidRegex.test(id) && count < 50) {
              allChildJobIds.push(id)
              count++
            }
          })
        }
      })

      const childJobsMap = new Map<string, any>()
      if (allChildJobIds.length > 0) {
        const childJobsResult = await pool.query(
          `SELECT id, type, status, progress, error_message, started_at AT TIME ZONE 'UTC' as started_at, completed_at AT TIME ZONE 'UTC' as completed_at
           FROM jobs
           WHERE id = ANY($1::uuid[])`,
          [allChildJobIds]
        )
        childJobsResult.rows.forEach(cj => {
          childJobsMap.set(cj.id, {
            id: cj.id,
            type: cj.type,
            status: cj.status,
            progress: cj.progress || 0,
            error: cj.error_message,
            startTime: cj.started_at,
            completedTime: cj.completed_at
          })
        })
      }

      // Get total count
      let countQuery = "SELECT COUNT(*) FROM jobs j WHERE j.created_by = $1 AND NOT j.type LIKE 'extract-entity-%'"
      const countParams = [req.user?.id]
      let countParamCount = 1

      if (status) {
        countParamCount++
        countQuery += ` AND j.status = $${countParamCount}`
        countParams.push(status as string)
      }

      if (type) {
        countParamCount++
        countQuery += ` AND j.type = $${countParamCount}`
        countParams.push(type as string)
      }

      const countResult = await pool.query(countQuery, countParams)
      const total = Number.parseInt(countResult.rows[0].count)

      // Format jobs with enriched data
      const enrichedJobs = result.rows.map(job => {
        const jobData = parseJobData(job.job_data)
        
        // Build descriptive job name: "Document Name - Project Name" or fallback to template/type
        let jobName = ''
        
        // Priority 1: Document name (most specific)
        const docName = job.document_name || jobData.documentName || jobData.document_name || jobData.name
        
        // Priority 2: Template name (for new documents being generated)
        const templateName = job.template_name || jobData.template_name || jobData.variables?.template_name
        
        // Priority 3: Generic name
        const genericName = jobData.name || `${job.type} Job`
        
        // Build name with project context
        if (docName && job.project_name) {
          jobName = `${docName} - ${job.project_name}`
        } else if (templateName && job.project_name) {
          jobName = `${templateName} - ${job.project_name}`
        } else if (docName) {
          jobName = docName
        } else if (templateName) {
          jobName = templateName
        } else if (job.project_name) {
          jobName = `${genericName} - ${job.project_name}`
        } else {
          jobName = genericName
        }
        
        // If job has an error message but status is still "processing", treat it as "failed"
        // This handles cases where cleanup scripts marked jobs but workers reset status
        const effectiveStatus = (job.error_message && job.status === 'processing') 
          ? 'failed' 
          : job.status
        
        const childJobsList: any[] = []
        if (Array.isArray(jobData.childJobIds)) {
          jobData.childJobIds.forEach((id: string) => {
            const childJob = childJobsMap.get(id)
            if (childJob) {
              childJobsList.push(childJob)
            }
          })
        }

        return {
          id: job.id,
          name: jobName,
          type: job.type,
          status: effectiveStatus,
          progress: job.progress || 0,
          error: job.error_message,
          startTime: job.started_at,
          completedTime: job.completed_at,
          queuedTime: job.queued_at || job.created_at,
          processingStartedAt: job.processing_started_at,
          priority: jobData.priority || 'medium',
          queue: job.queue_name || getQueueNameFromType(job.type),
          worker: job.worker_id || jobData.worker_id || jobData.worker || 'Unassigned',
          workerProcessId: job.worker_process_id,
          queuePosition: job.queue_position,
          // logs: jobData.logs || [], // Omitted from list endpoints to prevent OOM
          childJobs: childJobsList,
          projectName: job.project_name || jobData.projectName || jobData.variables?.project_name,
          templateName: job.template_name,
          documentName: docName,
          userName: job.user_name,
          // Additional metadata for AI jobs
          metadata: {
            provider: jobData.provider,
            model: jobData.model,
            temperature: jobData.temperature,
            template_id: jobData.template_id,
            template_name: job.template_name || jobData.variables?.template_name,
            project_id: jobData.projectId || jobData.variables?.project_id,
            project_name: job.project_name || jobData.projectName || jobData.variables?.project_name,
            document_id: job.document_id,
            document_name: docName,
            tokens: jobData.tokens,
            llmRequestCount: typeof jobData.llmRequestCount === "number"
              ? jobData.llmRequestCount
              : (Array.isArray(jobData.llm_insights?.requests) ? jobData.llm_insights.requests.length : 0),
            llmProgressSteps: Array.isArray(jobData.llmProgressSteps) ? jobData.llmProgressSteps : [],
            // Worker and queue information
            worker_id: job.worker_id,
            worker_process_id: job.worker_process_id,
            queue_name: job.queue_name,
            queue_position: job.queue_position,
            user_name: job.user_name,
            user_email: job.user_email,
            // Process-flow specific progress fields
            currentStep: jobData.currentStep,
            compressionProgress: jobData.compressionProgress,
            currentDocument: jobData.currentDocument,
            stepProgress: jobData.stepProgress,
            activeDocuments: jobData.activeDocuments || [],
            providerAssignments: jobData.providerAssignments || [],
            parallelCount: jobData.activeDocuments?.length || 0
          }
        }
      })
      
      res.json({
        jobs: enrichedJobs,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      })
    } catch (error) {
      log.error("Get jobs error:", error)
      const message = error instanceof Error ? error.message : String(error)
      const status = message.includes("circuit open") || message.includes("temporarily unavailable") ? 503 : 500
      res.status(status).json({ error: message })
    }
  }
)

// Enqueue an AI generation job
router.post(
  "/ai-generate",
  authenticateToken,
  async (req, res) => {
    try {
      const schema = Joi.object({
        projectId: Joi.string().required(),
        prompt: Joi.string().required(),
        provider: Joi.string().optional(),
        model: Joi.string().allow(null, "").optional(),
        templateId: Joi.string().uuid().optional().allow(null),
        maxTokens: Joi.number().integer().min(1).max(200000).optional(),
        temperature: Joi.number().min(0).max(2).optional(),
        documentName: Joi.string().max(500).allow("").optional(),
        description: Joi.string().allow("").optional(),
        variables: Joi.object().unknown(true).optional(),
        useContext: Joi.boolean().optional(),
      })

      const { error, value } = schema.validate(req.body)
      if (error) return res.status(400).json({ error: error.message })

      const jobId = uuidv4()
      const templateNameFromVars =
        value.variables && typeof (value.variables as any).template_name === "string"
          ? (value.variables as any).template_name
          : undefined

      const jobPayload = {
        jobId,
        userId: req.user?.id || null,
        projectId: value.projectId,
        prompt: value.prompt,
        provider: value.provider || "openai",
        model: value.model || null,
        temperature: value.temperature,
        template_id: value.templateId || null,
        max_tokens: value.maxTokens ?? 32768,
        name: value.documentName?.trim() || undefined,
        description: value.description?.trim() || undefined,
        variables: value.variables || undefined,
        use_context: value.useContext !== false,
        template_name: templateNameFromVars,
      }

      await addJob("ai-generate", jobPayload)

      res.status(202).json({ jobId })
    } catch (err) {
      const log = childLogger({ requestId: (req as any).requestId })
      log.error("Enqueue AI job error:", err)
      const message = err instanceof Error ? err.message : "Failed to enqueue job"
      res.status(500).json({ error: message })
    }
  }
)

// Get job by ID
router.get("/:id", 
  authenticateToken,
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  async (req, res) => {
    try {
      const { id } = req.params

      const result = await pool.query(
        `
        SELECT 
          j.*, 
          COALESCE(j.project_name, p.name) as project_name,
          COALESCE(j.document_name, d1.name, d2.name) as document_name,
          u.name as created_by_name
        FROM jobs j
        LEFT JOIN users u ON j.created_by = u.id
        LEFT JOIN projects p ON p.id = COALESCE(
          j.project_id,
          (CASE WHEN j.data->>'projectId' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN (j.data->>'projectId')::uuid ELSE NULL END),
          (CASE WHEN j.data->'variables'->>'project_id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN (j.data->'variables'->>'project_id')::uuid ELSE NULL END)
        )
        LEFT JOIN documents d1 ON d1.id = COALESCE(
          (CASE WHEN j.data->>'documentId' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN (j.data->>'documentId')::uuid ELSE NULL END),
          (CASE WHEN j.data->>'sourceDocumentId' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN (j.data->>'sourceDocumentId')::uuid ELSE NULL END),
          (CASE WHEN j.data->'documentIds' IS NOT NULL AND jsonb_typeof(j.data->'documentIds') = 'array' AND jsonb_array_length(j.data->'documentIds') > 0 AND (j.data->'documentIds'->>0) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN (j.data->'documentIds'->>0)::uuid ELSE NULL END)
        )
        LEFT JOIN documents d2 ON d2.generation_metadata->>'job_id' = j.id::text
        WHERE j.id = $1
      `,
        [id]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Job not found" })
      }

      const job = result.rows[0]
      const jobData = typeof job.data === 'string' ? JSON.parse(job.data) : (job.data || {})
      const detailProjectName = job.project_name || jobData.projectName || jobData.variables?.project_name
      const detailDocumentName = job.document_name || jobData.documentName || jobData.document_name || jobData.name
      const detailTemplateName = job.template_name || jobData.template_name || jobData.variables?.template_name

      // Users can only view their own jobs unless they're admin
      if (job.created_by !== req.user?.id && req.user?.role !== "admin") {
        return res.status(403).json({ error: "Access denied" })
      }

      let childJobsList: any[] = []
      if (Array.isArray(jobData.childJobIds) && jobData.childJobIds.length > 0) {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const validChildIds = jobData.childJobIds.filter((id: any) => typeof id === 'string' && uuidRegex.test(id));
        
        if (validChildIds.length > 0) {
          const childJobsResult = await pool.query(
            `SELECT id, type, status, progress, error_message, started_at AT TIME ZONE 'UTC' as started_at, completed_at AT TIME ZONE 'UTC' as completed_at
             FROM jobs
             WHERE id = ANY($1::uuid[])
             ORDER BY type ASC`,
            [validChildIds]
          )
          childJobsList = childJobsResult.rows.map(cj => ({
            id: cj.id,
            type: cj.type,
            status: cj.status,
            progress: cj.progress || 0,
            error: cj.error_message,
            startTime: cj.started_at,
            completedTime: cj.completed_at
          }))
        }
      }

      res.json({
        job: {
          ...job,
          project_name: detailProjectName,
          document_name: detailDocumentName,
          template_name: detailTemplateName,
          childJobs: childJobsList,
          metadata: {
            provider: jobData.provider,
            model: jobData.model,
            temperature: jobData.temperature,
            template_id: jobData.template_id,
            template_name: detailTemplateName,
            project_id: job.project_id || jobData.projectId || jobData.variables?.project_id,
            project_name: detailProjectName,
            document_id: jobData.documentId || jobData.document_id,
            document_name: detailDocumentName,
            llmInsights: jobData.llm_insights || null,
          },
        }
      })
    } catch (error) {
      const log = childLogger({ requestId: (req as any).requestId })
      log.error("Get job error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Cancel job
router.post("/:id/cancel", 
  authenticateToken,
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  async (req, res) => {
    try {
      const { id } = req.params

      // Check if job exists and belongs to user
      const jobResult = await pool.query(
        "SELECT created_by, status FROM jobs WHERE id = $1",
        [id]
      )

      if (jobResult.rows.length === 0) {
        return res.status(404).json({ error: "Job not found" })
      }

      const job = jobResult.rows[0]

      if (job.created_by !== req.user?.id && req.user?.role !== "admin") {
        return res.status(403).json({ error: "Access denied" })
      }

      if (!["pending", "processing"].includes(job.status)) {
        return res.status(400).json({ error: "Job cannot be cancelled" })
      }

      const cancelled = await cancelJob(id)

      try {
        await cancelJob(id)
        const log = childLogger({ requestId: (req as any).requestId })
        log.info(`Job cancelled: ${id} by ${req.user?.email}`)
        res.json({ message: "Job cancelled successfully" })
      } catch (cancelError) {
        res.status(500).json({ error: "Failed to cancel job" })
      }
    } catch (error) {
      const log = childLogger({ requestId: (req as any).requestId })
      log.error("Cancel job error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Retry failed job - REMOVED DUPLICATE (see line 464 for working version that handles stuck jobs)

// Clean up stuck cancelled jobs from queues (admin only)
router.post("/cleanup",
  authenticateToken,
  requirePermission("jobs.manage"),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      // Get all cancelled jobs from database
      const cancelledJobs = await pool.query(
        `SELECT id, type FROM jobs WHERE status = 'cancelled'`
      )
      
      let cleanedCount = 0
      
      // Import queues
      const { aiQueue, documentQueue, pipelineQueue, processFlowQueue } = await import("../services/queueService")
      
      // Remove from all queues
      for (const job of cancelledJobs.rows) {
        const jobId = job.id
        
        // Check each queue
        const queues = [
          { name: 'aiQueue', queue: aiQueue },
          { name: 'documentQueue', queue: documentQueue },
          { name: 'pipelineQueue', queue: pipelineQueue },
          { name: 'processFlowQueue', queue: processFlowQueue }
        ]
        
        for (const { name, queue } of queues) {
          const bullJob = await queue.getJob(jobId)
          if (bullJob) {
            await bullJob.remove()
            log.info(`Removed job ${jobId} from ${name}`)
            cleanedCount++
          }
        }
      }
      
      log.info(`Cleaned up ${cleanedCount} stuck jobs from queues`)
      
      res.json({
        success: true,
        message: `Cleaned up ${cleanedCount} stuck jobs`,
        cancelledJobsChecked: cancelledJobs.rows.length
      })
      
    } catch (error) {
      log.error("Cleanup jobs error:", error)
      res.status(500).json({ error: "Failed to cleanup jobs" })
    }
  }
)

// Get job statistics (admin only)
router.get("/stats/overview", 
  authenticateToken,
  requirePermission("jobs.stats"),
  async (req, res) => {
    try {
      const stats = await pool.query(`
        SELECT 
          COUNT(*) as total_jobs,
          COUNT(*) FILTER (WHERE status = 'pending') as pending_jobs,
          COUNT(*) FILTER (WHERE status = 'processing' AND error_message IS NULL) as processing_jobs,
          COUNT(*) FILTER (WHERE status = 'completed') as completed_jobs,
          COUNT(*) FILTER (WHERE status = 'failed' OR (status = 'processing' AND error_message IS NOT NULL)) as failed_jobs,
          COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_jobs,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as jobs_last_24h,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as jobs_last_7d,
          AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) FILTER (WHERE status = 'completed') as avg_processing_time
        FROM jobs
      `)

      const typeStats = await pool.query(`
        SELECT 
          type,
          COUNT(*) as count,
          COUNT(*) FILTER (WHERE status = 'completed') as completed,
          COUNT(*) FILTER (WHERE status = 'failed') as failed
        FROM jobs
        GROUP BY type
        ORDER BY count DESC
      `)

      res.json({
        overview: stats.rows[0],
        byType: typeStats.rows,
      })
    } catch (error) {
      const log = childLogger({ requestId: (req as any).requestId })
      log.error("Get job stats error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Get all jobs (admin only)
router.get("/admin/all", 
  authenticateToken,
  requirePermission("jobs.admin"),
  validateQuery(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    status: Joi.string().valid("pending", "processing", "completed", "failed", "cancelled").optional(),
    type: Joi.string().optional(),
    user_id: Joi.string().uuid().optional(),
  })),
  async (req: any, res: any) => {
    try {
      const { page = 1, limit = 10, status, type, user_id } = req.query
      const offset = (Number(page) - 1) * Number(limit)

      let query = `
        SELECT 
          j.id,
          j.type,
          j.status,
          j.progress,
          j.error_message,
          ${SLIM_JOB_DATA_SQL},
          j.worker_id,
          j.worker_process_id,
          j.queue_name,
          j.queue_position,
          j.project_id,
          COALESCE(j.project_name, j.data->>'projectName', j.data->'variables'->>'project_name') as project_name,
          COALESCE(j.template_name, j.data->>'template_name', j.data->'variables'->>'template_name') as template_name,
          COALESCE(j.document_name, j.data->>'documentName', j.data->>'name') as document_name,
          j.created_by,
          j.started_at AT TIME ZONE 'UTC' AS started_at,
          j.completed_at AT TIME ZONE 'UTC' AS completed_at,
          j.created_at AT TIME ZONE 'UTC' AS created_at,
          j.queued_at AT TIME ZONE 'UTC' AS queued_at,
          j.processing_started_at AT TIME ZONE 'UTC' AS processing_started_at,
          u.name as created_by_name, 
          u.email as created_by_email
        FROM jobs j
        LEFT JOIN users u ON j.created_by = u.id
        WHERE NOT j.type LIKE 'extract-entity-%'
      `

      const params: any[] = []
      let paramCount = 0

      if (status) {
        paramCount++
        query += ` AND j.status = $${paramCount}`
        params.push(status)
      }

      if (type) {
        paramCount++
        query += ` AND j.type = $${paramCount}`
        params.push(type)
      }

      if (user_id) {
        paramCount++
        query += ` AND j.created_by = $${paramCount}`
        params.push(user_id)
      }

      query += ` ORDER BY j.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`
      params.push(limit, offset)

      let countQuery = "SELECT COUNT(*) FROM jobs j WHERE NOT j.type LIKE 'extract-entity-%'"
      const countParams: any[] = []
      let countParamCount = 0

      if (status) {
        countParamCount++
        countQuery += ` AND j.status = $${countParamCount}`
        countParams.push(status)
      }

      if (type) {
        countParamCount++
        countQuery += ` AND j.type = $${countParamCount}`
        countParams.push(type)
      }

      if (user_id) {
        countParamCount++
        countQuery += ` AND j.created_by = $${countParamCount}`
        countParams.push(user_id)
      }

      const [result, countResult] = await Promise.all([
        pool.query(query, params),
        pool.query(countQuery, countParams),
      ])
      const total = Number.parseInt(countResult.rows[0].count)

      // Fetch child jobs if any are referenced
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const allChildJobIds: string[] = []
      result.rows.forEach(job => {
        const jobData = parseJobData(job.job_data)
        if (Array.isArray(jobData.childJobIds)) {
          // Limit to prevent OOM on massive child job arrays
          let count = 0;
          jobData.childJobIds.forEach((id: any) => {
            if (typeof id === 'string' && uuidRegex.test(id) && count < 50) {
              allChildJobIds.push(id)
              count++
            }
          })
        }
      })

      const childJobsMap = new Map<string, any>()
      if (allChildJobIds.length > 0) {
        const childJobsResult = await pool.query(
          `SELECT id, type, status, progress, error_message, started_at AT TIME ZONE 'UTC' as started_at, completed_at AT TIME ZONE 'UTC' as completed_at
           FROM jobs
           WHERE id = ANY($1::uuid[])`,
          [allChildJobIds]
        )
        childJobsResult.rows.forEach(cj => {
          childJobsMap.set(cj.id, {
            id: cj.id,
            type: cj.type,
            status: cj.status,
            progress: cj.progress || 0,
            error: cj.error_message,
            startTime: cj.started_at,
            completedTime: cj.completed_at
          })
        })
      }

      // Enrich jobs with queue names (same logic as regular endpoint)
      const enrichedJobs = result.rows.map((job: any) => {
        const jobData = parseJobData(job.job_data)
        const variables = (jobData.variables ?? {}) as Record<string, unknown>
        
        // Build descriptive job name
        let jobName = ''
        const docName = job.document_name || jobData.documentName || jobData.document_name || jobData.name
        const templateName = job.template_name || jobData.template_name || variables.template_name
        const genericName = jobData.name || `${job.type} Job`
        const projectName = job.project_name || jobData.projectName || variables.project_name
        
        if (docName && projectName) {
          jobName = `${docName} - ${projectName}`
        } else if (templateName && projectName) {
          jobName = `${templateName} - ${projectName}`
        } else if (docName) {
          jobName = docName
        } else if (templateName) {
          jobName = templateName
        } else if (projectName) {
          jobName = `${genericName} - ${projectName}`
        } else {
          jobName = genericName
        }
        
        // If job has an error message but status is still "processing", treat it as "failed"
        const effectiveStatus = (job.error_message && job.status === 'processing') 
          ? 'failed' 
          : job.status
        
        const childJobsList: any[] = []
        if (Array.isArray(jobData.childJobIds)) {
          jobData.childJobIds.forEach((id: string) => {
            const childJob = childJobsMap.get(id)
            if (childJob) {
              childJobsList.push(childJob)
            }
          })
        }

        return {
          id: job.id,
          name: jobName,
          type: job.type,
          status: effectiveStatus,
          progress: job.progress || 0,
          error: job.error_message,
          startTime: job.started_at,
          completedTime: job.completed_at,
          queuedTime: job.queued_at || job.created_at,
          processingStartedAt: job.processing_started_at,
          priority: jobData.priority || 'medium',
          queue: job.queue_name || getQueueNameFromType(job.type),
          worker: job.worker_id || jobData.worker_id || jobData.worker || 'Unassigned',
          workerProcessId: job.worker_process_id,
          queuePosition: job.queue_position,
          // logs: jobData.logs || [], // Omitted from list endpoints to prevent OOM
          childJobs: childJobsList,
          projectName,
          templateName,
          documentName: docName,
          userName: job.created_by_name,
          userEmail: job.created_by_email,
          metadata: {
            provider: jobData.provider,
            model: jobData.model,
            temperature: jobData.temperature,
            template_id: jobData.template_id,
            template_name: templateName,
            project_id: jobData.projectId || variables.project_id,
            project_name: projectName,
            document_id: jobData.documentId || jobData.document_id,
            document_name: docName,
            tokens: jobData.tokens,
            llmRequestCount: typeof jobData.llmRequestCount === "number"
              ? jobData.llmRequestCount
              : (Array.isArray(jobData.llm_insights?.requests) ? jobData.llm_insights.requests.length : 0),
            llmProgressSteps: Array.isArray(jobData.llmProgressSteps) ? jobData.llmProgressSteps : [],
            worker_id: job.worker_id,
            worker_process_id: job.worker_process_id,
            queue_name: job.queue_name,
            queue_position: job.queue_position,
            user_name: job.created_by_name,
            user_email: job.created_by_email,
            currentStep: jobData.currentStep,
            compressionProgress: jobData.compressionProgress,
            currentDocument: jobData.currentDocument,
            stepProgress: jobData.stepProgress,
            activeDocuments: jobData.activeDocuments || [],
            providerAssignments: jobData.providerAssignments || [],
            parallelCount: Array.isArray(jobData.activeDocuments) ? jobData.activeDocuments.length : 0
          }
        }
      })

      res.json({
        jobs: enrichedJobs,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      })
    } catch (error) {
      const log = childLogger({ requestId: (req as any).requestId })
      log.error("Get all jobs error:", error)
      const message = error instanceof Error ? error.message : String(error)
      const status = message.includes("circuit open") || message.includes("temporarily unavailable") ? 503 : 500
      res.status(status).json({ error: message })
    }
  }
)

/**
 * POST /api/jobs/:id/retry
 * Retry a specific failed or stalled job
 */
router.post(
  "/:id/retry",
  authenticateToken,
  requirePermission("jobs.create"),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    
    try {
      const { id } = req.params
      const userId = req.user?.id
      const userRole = req.user?.role?.toLowerCase()
      const isAdmin = userRole === 'admin' || userRole === 'super_admin'
      
      // Get the job - admins can retry any job, regular users can only retry their own
      let jobResult
      if (isAdmin) {
        jobResult = await pool.query(
          "SELECT * FROM jobs WHERE id = $1",
          [id]
        )
      } else {
        jobResult = await pool.query(
          "SELECT * FROM jobs WHERE id = $1 AND created_by = $2",
          [id, userId]
        )
      }
      
      if (jobResult.rows.length === 0) {
        return res.status(404).json({ error: "Job not found" })
      }
      
      const job = jobResult.rows[0]
      
      // Can retry failed, stuck, processing, cancelled, or orphaned pending jobs
      if (!['failed', 'stuck', 'processing', 'cancelled', 'pending'].includes(job.status)) {
        return res.status(400).json({ error: "Can only retry failed, stuck, cancelled, or orphaned pending jobs" })
      }
      
      // Create new job with same data
      const { v4: uuidv4 } = await import('uuid')
      const { addJob } = await import('../services/queueService')
      const { validateJobType } = await import('../services/jobs/validation')
      
      const newJobId = uuidv4()
      const jobData = typeof job.data === 'string' ? JSON.parse(job.data) : job.data
      
      // Normalize job type (handles legacy names like 'project-data-extraction' -> 'extract-project-data')
      let normalizedJobType: string
      try {
        normalizedJobType = validateJobType(job.type)
      } catch (typeError) {
        log.error("Invalid job type for retry:", { 
          originalType: job.type, 
          error: typeError instanceof Error ? typeError.message : String(typeError) 
        })
        return res.status(400).json({ 
          error: "Invalid job type", 
          details: typeError instanceof Error ? typeError.message : String(typeError),
          jobType: job.type
        })
      }
      
      const newJobData = {
        ...jobData,
        jobId: newJobId,
        retryOf: id,
        retryCount: (jobData.retryCount || 0) + 1
      }
      
      // Mark old job as cancelled
      await pool.query(
        "UPDATE jobs SET status = 'cancelled', error_message = 'Retried manually' WHERE id = $1",
        [id]
      )
      
      // Add new job to queue with normalized type
      await addJob(normalizedJobType as JobType, newJobData)
      
      log.info(`Job ${id} retried as ${newJobId}`, { 
        originalType: job.type, 
        normalizedType: normalizedJobType 
      })
      
      res.json({
        success: true,
        message: "Job queued for retry",
        newJobId,
        originalJobId: id
      })
    } catch (error: any) {
      log.error("Retry job error:", error)
      
      // Return more detailed error information
      const errorMessage = error?.message || "Failed to retry job"
      const errorCode = error?.code || "RETRY_ERROR"
      const errorDetails = error?.details || (error instanceof Error ? error.stack : undefined)
      
      res.status(500).json({ 
        error: errorMessage,
        code: errorCode,
        ...(process.env.NODE_ENV === 'development' && errorDetails ? { details: errorDetails } : {})
      })
    }
  }
)

/**
 * POST /api/jobs/retry-all-failed
 * Retry all failed jobs for the current user
 */
router.post(
  "/retry-all-failed",
  authenticateToken,
  requirePermission("jobs.create"),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    
    try {
      const { v4: uuidv4 } = await import('uuid')
      const { addJob } = await import('../services/queueService')
      
      // Get all failed jobs for user
      const jobsResult = await pool.query(
        `SELECT * FROM jobs 
         WHERE status = 'failed' 
         AND created_by = $1
         ORDER BY created_at DESC
         LIMIT 50`,
        [req.user?.id]
      )
      
      if (jobsResult.rows.length === 0) {
        return res.json({
          success: true,
          message: "No failed jobs to retry",
          retriedCount: 0
        })
      }
      
      const retriedJobs = []
      
      for (const job of jobsResult.rows) {
        try {
          // Create new job with same data
          const newJobId = uuidv4()
          const jobData = typeof job.data === 'string' ? JSON.parse(job.data) : job.data
          
          const newJobData = {
            ...jobData,
            jobId: newJobId,
            retryOf: job.id,
            retryCount: (jobData.retryCount || 0) + 1
          }
          
          // Mark old job as cancelled
          await pool.query(
            "UPDATE jobs SET status = 'cancelled', error_message = 'Retried in bulk' WHERE id = $1",
            [job.id]
          )
          
          // Add to queue
          await addJob(job.type, newJobData)
          
          retriedJobs.push({
            originalJobId: job.id,
            newJobId,
            type: job.type
          })
          
          log.info(`Retried job ${job.id} as ${newJobId}`)
        } catch (err) {
          log.error(`Failed to retry job ${job.id}:`, err)
        }
      }
      
      res.json({
        success: true,
        message: `Retried ${retriedJobs.length} failed jobs`,
        retriedCount: retriedJobs.length,
        totalFailed: jobsResult.rows.length,
        retriedJobs
      })
    } catch (error) {
      log.error("Retry all failed jobs error:", error)
      res.status(500).json({ error: "Failed to retry jobs" })
    }
  }
)

/**
 * POST /api/jobs/clean-stalled
 * Clean up stalled jobs (stuck in processing after backend restart)
 */
router.post(
  "/clean-stalled",
  authenticateToken,
  requirePermission("jobs.create"),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    
    try {
      // Find jobs stuck in processing for more than 10 minutes
      const stalledResult = await pool.query(
        `SELECT * FROM jobs 
         WHERE status = 'processing' 
         AND created_by = $1
         -- Some older jobs (especially extraction jobs) were started before we
         -- consistently set started_at; fall back to processing_started_at or
         -- created_at so they can still be detected as stalled.
         AND COALESCE(started_at, processing_started_at, created_at) < NOW() - INTERVAL '10 minutes'
         ORDER BY COALESCE(started_at, processing_started_at, created_at) DESC`,
        [req.user?.id]
      )
      
      if (stalledResult.rows.length === 0) {
        return res.json({
          success: true,
          message: "No stalled jobs found",
          cleanedCount: 0
        })
      }
      
      const cleanedJobs = []
      
      for (const job of stalledResult.rows) {
        try {
          // Mark as failed
          await pool.query(
            `UPDATE jobs 
             SET status = 'failed', 
                 error_message = 'Job stalled - backend restart detected',
                 completed_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [job.id]
          )
          
          cleanedJobs.push({
            jobId: job.id,
            type: job.type,
            stalledDuration: Math.floor(
              (Date.now() - new Date(job.started_at).getTime()) / 1000 / 60
            ) + ' minutes'
          })
          
          log.info(`Cleaned stalled job ${job.id}`)
        } catch (err) {
          log.error(`Failed to clean stalled job ${job.id}:`, err)
        }
      }
      
      res.json({
        success: true,
        message: `Cleaned ${cleanedJobs.length} stalled jobs`,
        cleanedCount: cleanedJobs.length,
        totalStalled: stalledResult.rows.length,
        cleanedJobs
      })
    } catch (error) {
      log.error("Clean stalled jobs error:", error)
      res.status(500).json({ error: "Failed to clean stalled jobs" })
    }
  }
)

/**
 * POST /api/jobs/clean-orphaned-pending
 * Clean orphaned pending jobs that exist in DB but not in Bull queue
 */
router.post(
  "/clean-orphaned-pending",
  authenticateToken,
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    
    try {
      // Import the queues
      const { 
        aiQueue, 
        documentQueue, 
        pipelineQueue, 
        processFlowQueue, 
        baselineQueue,
        regenerationQueue,
        extractionQueue
      } = await import('../services/queueService')
      
      const queueMap: Record<string, any> = {
        'ai-processing': aiQueue,
        'document-processing': documentQueue,
        'pipeline-processing': pipelineQueue,
        'process-flow-processing': processFlowQueue,
        'baseline-processing': baselineQueue,
        'document-regeneration': regenerationQueue,
        'project-data-extraction': extractionQueue
      }
      
      // Find pending jobs older than 5 minutes (orphaned)
      const orphanedResult = await pool.query(
        `SELECT id, type, queue_name, data, created_by
         FROM jobs 
         WHERE status = 'pending' 
         AND created_by = $1
         AND COALESCE(queued_at, created_at) < NOW() - INTERVAL '5 minutes'
         ORDER BY created_at DESC`,
        [req.user?.id]
      )
      
      if (orphanedResult.rows.length === 0) {
        return res.json({
          success: true,
          message: "No orphaned pending jobs found",
          cleanedCount: 0
        })
      }
      
      const cleanedJobs = []
      const requeuedJobs = []
      
      for (const job of orphanedResult.rows) {
        try {
          const queueName = job.queue_name || 'ai-processing'
          const queue = queueMap[queueName]
          
          if (!queue) {
            // No queue found, mark as failed
            await pool.query(
              `UPDATE jobs 
               SET status = 'failed', 
                   error_message = 'Orphaned job - no queue found for: ' || $2,
                   completed_at = CURRENT_TIMESTAMP
               WHERE id = $1`,
              [job.id, queueName]
            )
            cleanedJobs.push({ jobId: job.id, action: 'marked_failed', reason: 'no_queue' })
            continue
          }
          
          // Check if job exists in Bull queue
          const bullJob = await queue.getJob(job.id)
          
          if (bullJob) {
            // Job exists in queue, just waiting - skip
            log.info(`Job ${job.id} exists in queue, skipping`)
            continue
          }
          
          // Job not in queue - try to re-add it
          const jobData = typeof job.data === 'string' ? JSON.parse(job.data) : job.data
          
          try {
            await queue.add(job.type, { ...jobData, jobId: job.id }, {
              jobId: job.id,
              priority: jobData.priority || 0,
            })
            
            requeuedJobs.push({ jobId: job.id, queue: queueName })
            log.info(`Re-queued orphaned job ${job.id} to ${queueName}`)
          } catch (queueError) {
            // Failed to re-queue, mark as failed
            await pool.query(
              `UPDATE jobs 
               SET status = 'failed', 
                   error_message = 'Orphaned job - failed to re-queue: ' || $2,
                   completed_at = CURRENT_TIMESTAMP
               WHERE id = $1`,
              [job.id, queueError instanceof Error ? queueError.message : String(queueError)]
            )
            cleanedJobs.push({ jobId: job.id, action: 'marked_failed', reason: 'requeue_failed' })
          }
        } catch (err) {
          log.error(`Failed to process orphaned job ${job.id}:`, err)
        }
      }
      
      res.json({
        success: true,
        message: `Processed ${orphanedResult.rows.length} orphaned pending jobs`,
        totalOrphaned: orphanedResult.rows.length,
        requeuedCount: requeuedJobs.length,
        cleanedCount: cleanedJobs.length,
        requeuedJobs,
        cleanedJobs
      })
    } catch (error) {
      log.error("Clean orphaned pending jobs error:", error)
      res.status(500).json({ error: "Failed to clean orphaned pending jobs" })
    }
  }
)


export default router

// Job details endpoint: returns enriched metadata from jobs table and analytics logs
router.get(
  "/:id/details",
  authenticateToken,
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params

      // Fetch job
      const jobResult = await pool.query(
        `SELECT j.*, u.name as created_by_name, u.email as created_by_email
         FROM jobs j
         LEFT JOIN users u ON j.created_by = u.id
         WHERE j.id = $1`,
        [id]
      )
      if (jobResult.rows.length === 0) return res.status(404).json({ error: "Job not found" })
      const job = jobResult.rows[0]

      // Authorization: owner or admin
      if (job.created_by !== req.user?.id && req.user?.role !== "admin") {
        return res.status(403).json({ error: "Access denied" })
      }

      // Stage executions (if pipeline job)
      const stages = await pool.query(
        `SELECT stage_id, stage_type, execution_time, quality_score, status, started_at, completed_at,
                input_data, output_data
         FROM stage_executions WHERE job_id = $1 ORDER BY started_at ASC`,
        [id]
      )

      // AI usage tied to this job via request_id or response_metadata.jobId (best-effort)
      const aiUsage = await pool.query(
        `SELECT provider_type, model_name, request_type, input_tokens, output_tokens, total_tokens,
                response_time_ms, success, estimated_cost, created_at, request_payload, response_metadata
         FROM ai_usage_logs
         WHERE (response_metadata->>'jobId') = $1 OR (request_payload->>'jobId') = $1
         ORDER BY created_at ASC`,
        [id]
      )

      // Job execution analytics (per-stage synthetic entries)
      const jobExec = await pool.query(
        `SELECT status, queue_name, duration_ms, success, created_at
         FROM job_execution_logs
         WHERE job_id = $1 OR job_id LIKE $2
         ORDER BY created_at ASC`,
        [id, `${id}:%`]
      )

      // Compose summary
      const tokens = aiUsage.rows.reduce(
        (acc, r) => {
          acc.input += Number(r.input_tokens || 0)
          acc.output += Number(r.output_tokens || 0)
          acc.total += Number(r.total_tokens || 0)
          acc.cost += Number(r.estimated_cost || 0)
          return acc
        },
        { input: 0, output: 0, total: 0, cost: 0 }
      )

      // Attempt to infer compression metrics from AI usage metadata
      const compression = aiUsage.rows.reduce(
        (acc: any, r: any) => {
          try {
            const meta = r.response_metadata || {}
            const req = r.request_payload || {}
            const raw = Number(meta.rawTokens || req.rawTokens || 0)
            const comp = Number(meta.compressedTokens || req.compressedTokens || 0)
            const level = Number(meta.compressionLevel || req.compressionLevel || 0)
            if (raw > 0 && comp >= 0) {
              acc.raw += raw
              acc.compressed += comp
              if (level) acc.levels.push(level)
            }
          } catch (_) {}
          return acc
        },
        { raw: 0, compressed: 0, levels: [] as number[] }
      )
      const compression_ratio = compression.raw > 0 ? (compression.compressed / compression.raw) : null
      const avg_compression_level = compression.levels.length ? (compression.levels.reduce((a, b) => a + b, 0) / compression.levels.length) : null

      // Build enriched steps from stage outputs where possible
      const steps = stages.rows.map((s: any) => {
        const outMeta = (s.output_data && s.output_data.metadata) ? s.output_data.metadata : null
        const stepTokens = outMeta && outMeta.tokens ? outMeta.tokens : null
        const stepCompression = outMeta && outMeta.compression ? outMeta.compression : null
        return {
          stage_id: s.stage_id,
          stage_type: s.stage_type,
          status: s.status,
          execution_time: s.execution_time,
          quality_score: s.quality_score,
          started_at: s.started_at,
          completed_at: s.completed_at,
          tokens: stepTokens,
          compression: stepCompression,
        }
      })

      return res.json({
        job,
        stages: steps,
        ai_usage: aiUsage.rows,
        job_execution: jobExec.rows,
        summary: {
          tokens,
          compression: {
            raw_tokens: compression.raw || null,
            compressed_tokens: compression.compressed || null,
            ratio: compression_ratio,
            avg_level: avg_compression_level,
          },
          stage_count: stages.rows.length,
          started_at: job.started_at,
          completed_at: job.completed_at,
          duration_ms:
            job.started_at && job.completed_at
              ? Math.max(0, new Date(job.completed_at).getTime() - new Date(job.started_at).getTime())
              : null,
        },
      })
    } catch (error) {
      log.error("Get job details error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

