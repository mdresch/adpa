import express from "express"
// Joi already imported above
import { pool } from "../database/connection"
import { authenticateToken, requirePermission } from "../middleware/auth"
import { validateParams, validateQuery, validate, schemas } from "../middleware/validation"
import Joi from "joi"
import { logger } from "../utils/logger"
import { getJobStatus, cancelJob, addJob } from "../services/queueService"
import { v4 as uuidv4 } from "uuid"

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
    try {
      const { page = 1, limit = 10, status, type } = req.query
      const offset = (Number(page) - 1) * Number(limit)

      let query = `
        SELECT id, type, status, progress, error_message, started_at, completed_at, created_at
        FROM jobs
        WHERE created_by = $1
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
      logger.error("Get jobs error:", error)
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
      logger.error("Enqueue AI job error:", err)
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
      logger.error("Get job error:", error)
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
        logger.info(`Job cancelled: ${id} by ${req.user?.email}`)
        res.json({ message: "Job cancelled successfully" })
      } else {
        res.status(500).json({ error: "Failed to cancel job" })
      }
    } catch (error) {
      logger.error("Cancel job error:", error)
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

      logger.info(`Job retried: ${id} -> ${newJobId} by ${req.user?.email}`)

      res.json({
        message: "Job retried successfully",
        newJobId,
      })
    } catch (error) {
      logger.error("Retry job error:", error)
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
      logger.error("Get job stats error:", error)
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
      logger.error("Get all jobs error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

export default router

