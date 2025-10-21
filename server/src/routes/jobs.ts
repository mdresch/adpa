import express from "express"
// Joi already imported above
import { pool } from "../database/connection"
import { authenticateToken, requirePermission } from "../middleware/auth"
import { validateParams, validateQuery, validate, schemas } from "../middleware/validation"
import Joi from "joi"
import { logger, childLogger } from "../utils/logger"
import { getJobStatus, cancelJob, addJob } from "../services/queueService"
import { v4 as uuidv4 } from "uuid"
import AnalyticsTrackingService from "../services/analyticsTrackingService"

const router = express.Router()

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
          j.started_at, 
          j.completed_at, 
          j.created_at,
          j.data as job_data,
          j.result,
          p.name as project_name,
          t.name as template_name,
          d.name as document_name,
          d.id as document_id
        FROM jobs j
        LEFT JOIN projects p ON (j.data->>'projectId')::uuid = p.id OR (j.data->'variables'->>'project_id')::uuid = p.id
        LEFT JOIN templates t ON (j.data->>'template_id')::uuid = t.id
        LEFT JOIN documents d ON d.generation_metadata->>'job_id' = j.id::text
        WHERE j.created_by = $1
      `

      const params: any[] = [req.user?.id]
      let paramCount = 1

      if (status) {
        paramCount++
        query += ` AND status = $${paramCount}`
        params.push(status)
      }

      if (type) {
        paramCount++
        query += ` AND type = $${paramCount}`
        params.push(type)
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`
      params.push(limit, offset)

      const result = await pool.query(query, params)

      // Get total count
      let countQuery = "SELECT COUNT(*) FROM jobs WHERE created_by = $1"
      const countParams = [req.user?.id]
      let countParamCount = 1

      if (status) {
        countParamCount++
        countQuery += ` AND status = $${countParamCount}`
        countParams.push(status as string)
      }

      if (type) {
        countParamCount++
        countQuery += ` AND type = $${countParamCount}`
        countParams.push(type as string)
      }

      const countResult = await pool.query(countQuery, countParams)
      const total = Number.parseInt(countResult.rows[0].count)

      // Format jobs with enriched data
      const enrichedJobs = result.rows.map(job => {
        const jobData = job.job_data || {}
        
        // Build descriptive job name
        let jobName = job.document_name || job.template_name || jobData.template_name || jobData.name || `${job.type} Job`
        if (job.project_name) {
          jobName += ` - ${job.project_name}`
        }
        
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
          queue: job.type === 'ai-generate' ? 'ai-processing' : job.type,
          worker: jobData.worker || 'Unassigned',
          logs: jobData.logs || [],
          // Additional metadata for AI jobs
          metadata: {
            provider: jobData.provider,
            model: jobData.model,
            temperature: jobData.temperature,
            template_id: jobData.template_id,
            template_name: job.template_name || jobData.variables?.template_name,
            project_id: jobData.projectId || jobData.variables?.project_id,
            project_name: job.project_name,
            document_id: job.document_id,
            document_name: job.document_name,
            tokens: jobData.tokens || job.result?.usage,
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
      res.status(500).json({ error: "Internal server error" })
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
        model: Joi.string().optional(),
        templateId: Joi.string().optional(),
        maxTokens: Joi.number().optional(),
      })

      const { error, value } = schema.validate(req.body)
      if (error) return res.status(400).json({ error: error.message })

      const jobId = uuidv4()
      const jobPayload = {
        jobId,
        userId: req.user?.id || null,
        projectId: value.projectId,
        prompt: value.prompt,
        provider: value.provider || "openai",
        model: value.model || null,
        template_id: value.templateId || null,
        max_tokens: value.maxTokens || 1024,
      }

      await addJob("ai-generate", jobPayload)

      res.status(202).json({ jobId })
    } catch (err) {
      const log = childLogger({ requestId: (req as any).requestId })
      log.error("Enqueue AI job error:", err)
      res.status(500).json({ error: "Failed to enqueue job" })
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
        SELECT j.*, u.name as created_by_name
        FROM jobs j
        LEFT JOIN users u ON j.created_by = u.id
        WHERE j.id = $1
      `,
        [id]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Job not found" })
      }

      const job = result.rows[0]

      // Users can only view their own jobs unless they're admin
      if (job.created_by !== req.user?.id && req.user?.role !== "admin") {
        return res.status(403).json({ error: "Access denied" })
      }

      res.json({ job })
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

      if (cancelled) {
        const log = childLogger({ requestId: (req as any).requestId })
        log.info(`Job cancelled: ${id} by ${req.user?.email}`)
        res.json({ message: "Job cancelled successfully" })
      } else {
        res.status(500).json({ error: "Failed to cancel job" })
      }
    } catch (error) {
      const log = childLogger({ requestId: (req as any).requestId })
      log.error("Cancel job error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Retry failed job
router.post("/:id/retry", 
  authenticateToken,
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  async (req, res) => {
    try {
      const { id } = req.params

      // Get original job
      const jobResult = await pool.query(
        "SELECT * FROM jobs WHERE id = $1",
        [id]
      )

      if (jobResult.rows.length === 0) {
        return res.status(404).json({ error: "Job not found" })
      }

      const originalJob = jobResult.rows[0]

      if (originalJob.created_by !== req.user?.id && req.user?.role !== "admin") {
        return res.status(403).json({ error: "Access denied" })
      }

      if (originalJob.status !== "failed") {
        return res.status(400).json({ error: "Only failed jobs can be retried" })
      }

      // Create new job with same data
      const newJobId = uuidv4()
      const jobData = {
        ...originalJob.data,
        jobId: newJobId,
        userId: req.user?.id,
      }

      await addJob(originalJob.type, jobData)

  const log = childLogger({ requestId: (req as any).requestId })
  log.info(`Job retried: ${id} -> ${newJobId} by ${req.user?.email}`)

      res.json({
        message: "Job retried successfully",
        newJobId,
      })
    } catch (error) {
      const log = childLogger({ requestId: (req as any).requestId })
      log.error("Retry job error:", error)
      res.status(500).json({ error: "Internal server error" })
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
          COUNT(*) FILTER (WHERE status = 'processing') as processing_jobs,
          COUNT(*) FILTER (WHERE status = 'completed') as completed_jobs,
          COUNT(*) FILTER (WHERE status = 'failed') as failed_jobs,
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
  async (req, res) => {
    try {
      const { page = 1, limit = 10, status, type, user_id } = req.query
      const offset = (Number(page) - 1) * Number(limit)

      let query = `
        SELECT j.*, u.name as created_by_name, u.email as created_by_email
        FROM jobs j
        LEFT JOIN users u ON j.created_by = u.id
        WHERE 1=1
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

      const result = await pool.query(query, params)

      // Get total count
      let countQuery = "SELECT COUNT(*) FROM jobs j WHERE 1=1"
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

      const countResult = await pool.query(countQuery, countParams)
      const total = Number.parseInt(countResult.rows[0].count)

      res.json({
        jobs: result.rows,
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
      res.status(500).json({ error: "Internal server error" })
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

