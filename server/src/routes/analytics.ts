import express from "express"
import Joi from "joi"
import { pool } from "../database/connection"
import { authenticateToken, requirePermission } from "../middleware/auth"
import { validateQuery } from "../middleware/validation"
import { logger } from "../utils/logger"
import { cache } from "../utils/redis"

interface AuthRequest extends express.Request {
  user?: {
    id: string
    email: string
    role: string
    permissions: any
  }
}

const router = express.Router()

// Get dashboard analytics
router.get("/dashboard", 
  authenticateToken,
  async (req: AuthRequest, res: express.Response) => {
    try {
      const userId = req.user?.id

      // Check cache first
      const cacheKey = `analytics:dashboard:${userId}`
      const cached = await cache.get(cacheKey)
      if (cached) {
        return res.json(cached)
      }

      // Get user's project statistics
      const projectStats = await pool.query(`
        SELECT 
          COUNT(*) as total_projects,
          COUNT(*) FILTER (WHERE status = 'active') as active_projects,
          COUNT(*) FILTER (WHERE status = 'completed') as completed_projects,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as projects_last_30d
        FROM projects 
        WHERE owner_id = $1 OR team_members ? $1::text
      `, [userId])

      // Get user's document statistics
      const documentStats = await pool.query(`
        SELECT 
          COUNT(*) as total_documents,
          COUNT(*) FILTER (WHERE d.status = 'published') as published_documents,
          COUNT(*) FILTER (WHERE d.created_at >= NOW() - INTERVAL '30 days') as documents_last_30d
        FROM documents d
        JOIN projects p ON d.project_id = p.id
        WHERE p.owner_id = $1 OR p.team_members ? $1::text
      `, [userId])

      // Get user's AI usage statistics
      const aiStats = await pool.query(`
        SELECT 
          COUNT(*) as total_generations,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as generations_last_30d
        FROM audit_logs
        WHERE user_id = $1 AND action = 'ai_generate'
      `, [userId])

      // Get recent activity
      const recentActivity = await pool.query(`
        SELECT 
          action,
          resource_type,
          resource_id,
          created_at
        FROM audit_logs
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 10
      `, [userId])

      const analytics = {
        projects: projectStats.rows[0],
        documents: documentStats.rows[0],
        ai: aiStats.rows[0],
        recent_activity: recentActivity.rows,
        generated_at: new Date().toISOString(),
      }

      // Cache for 5 minutes
      await cache.set(cacheKey, analytics, 300)

      res.json(analytics)
    } catch (error) {
      logger.error("Get dashboard analytics error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Get system analytics (admin only)
router.get("/system", 
  authenticateToken,
  requirePermission("analytics.system"),
  validateQuery(Joi.object({
    period: Joi.string().valid("7d", "30d", "90d", "1y").default("30d"),
  })),
  async (req: AuthRequest, res: express.Response) => {
    try {
      const { period = "30d" } = req.query

      // Convert period to interval
      const intervalMap = {
        "7d": "7 days",
        "30d": "30 days", 
        "90d": "90 days",
        "1y": "1 year",
      }
      const interval = intervalMap[period as keyof typeof intervalMap]

      const cacheKey = `analytics:system:${period}`
      const cached = await cache.get(cacheKey)
      if (cached) {
        return res.json(cached)
      }

      // Overall system statistics
      const systemStats = await pool.query(`
        SELECT 
          (SELECT COUNT(*) FROM users WHERE is_active = true) as active_users,
          (SELECT COUNT(*) FROM projects) as total_projects,
          (SELECT COUNT(*) FROM documents) as total_documents,
          (SELECT COUNT(*) FROM templates WHERE is_public = true) as public_templates,
          (SELECT COUNT(*) FROM jobs WHERE created_at >= NOW() - INTERVAL '${interval}') as jobs_period,
          (SELECT COUNT(*) FROM audit_logs WHERE action = 'ai_generate' AND created_at >= NOW() - INTERVAL '${interval}') as ai_generations_period
      `)

      // User growth over time
      const userGrowth = await pool.query(`
        SELECT 
          DATE_TRUNC('day', created_at) as date,
          COUNT(*) as new_users
        FROM users
        WHERE created_at >= NOW() - INTERVAL '${interval}'
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY date
      `)

      // Project activity over time
      const projectActivity = await pool.query(`
        SELECT 
          DATE_TRUNC('day', created_at) as date,
          COUNT(*) as new_projects
        FROM projects
        WHERE created_at >= NOW() - INTERVAL '${interval}'
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY date
      `)

      // AI usage by provider
      const aiUsageByProvider = await pool.query(`
        SELECT 
          ap.name as provider_name,
          ap.provider_type,
          COUNT(al.*) as usage_count,
          SUM((al.new_values->>'usage'->>'total_tokens')::int) as total_tokens
        FROM audit_logs al
        JOIN ai_providers ap ON al.resource_id::uuid = ap.id
        WHERE al.action = 'ai_generate' AND al.created_at >= NOW() - INTERVAL '${interval}'
        GROUP BY ap.id, ap.name, ap.provider_type
        ORDER BY usage_count DESC
      `)

      // Most active users
      const activeUsers = await pool.query(`
        SELECT 
          u.name,
          u.email,
          COUNT(al.*) as activity_count
        FROM users u
        JOIN audit_logs al ON u.id = al.user_id
        WHERE al.created_at >= NOW() - INTERVAL '${interval}'
        GROUP BY u.id, u.name, u.email
        ORDER BY activity_count DESC
        LIMIT 10
      `)

      // Framework usage
      const frameworkUsage = await pool.query(`
        SELECT 
          framework,
          COUNT(*) as project_count
        FROM projects
        WHERE created_at >= NOW() - INTERVAL '${interval}'
        GROUP BY framework
        ORDER BY project_count DESC
      `)

      const analytics = {
        overview: systemStats.rows[0],
        user_growth: userGrowth.rows,
        project_activity: projectActivity.rows,
        ai_usage_by_provider: aiUsageByProvider.rows,
        active_users: activeUsers.rows,
        framework_usage: frameworkUsage.rows,
        period,
        generated_at: new Date().toISOString(),
      }

      // Cache for 10 minutes
      await cache.set(cacheKey, analytics, 600)

      res.json(analytics)
    } catch (error) {
      logger.error("Get system analytics error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Track custom event
router.post("/events", 
  authenticateToken,
  async (req: AuthRequest, res: express.Response) => {
    try {
      const { event_type, properties = {} } = req.body

      if (!event_type) {
        return res.status(400).json({ error: "Event type is required" })
      }

      await pool.query(`
        INSERT INTO analytics_events (user_id, event_type, properties)
        VALUES ($1, $2, $3)
      `, [req.user?.id, event_type, JSON.stringify(properties)])

      res.json({ message: "Event tracked successfully" })
    } catch (error) {
      logger.error("Track event error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Get user activity timeline
router.get("/activity/:userId", 
  authenticateToken,
  validateQuery(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    action: Joi.string().optional(),
  })),
  async (req: AuthRequest, res: express.Response) => {
    try {
      const { userId } = req.params
      const { page = 1, limit = 20, action } = req.query

      // Users can only view their own activity unless they're admin
      if (req.user?.id !== userId && req.user?.role !== "admin") {
        return res.status(403).json({ error: "Access denied" })
      }

      const offset = (Number(page) - 1) * Number(limit)

      let query = `
        SELECT 
          action,
          resource_type,
          resource_id,
          old_values,
          new_values,
          ip_address,
          created_at
        FROM audit_logs
        WHERE user_id = $1
      `

      const params: (string | number)[] = [userId]
      let paramCount = 1

      if (action) {
        paramCount++
        query += ` AND action = $${paramCount}`
        params.push(action as string)
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`
      params.push(Number(limit), offset)

      const result = await pool.query(query, params)

      // Get total count
      let countQuery = "SELECT COUNT(*) FROM audit_logs WHERE user_id = $1"
      const countParams: (string | number)[] = [userId]
      let countParamCount = 1

      if (action) {
        countParamCount++
        countQuery += ` AND action = $${countParamCount}`
        countParams.push(action as string)
      }

      const countResult = await pool.query(countQuery, countParams)
      const total = Number.parseInt(countResult.rows[0].count)

      res.json({
        activity: result.rows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      })
    } catch (error) {
      logger.error("Get user activity error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Get performance metrics
router.get("/performance", 
  authenticateToken,
  requirePermission("analytics.system"),
  async (req: AuthRequest, res: express.Response) => {
    try {
      const cacheKey = "analytics:performance"
      const cached = await cache.get(cacheKey)
      if (cached) {
        return res.json(cached)
      }

      // Job performance metrics
      const jobMetrics = await pool.query(`
        SELECT 
          type,
          COUNT(*) as total_jobs,
          COUNT(*) FILTER (WHERE status = 'completed') as completed_jobs,
          COUNT(*) FILTER (WHERE status = 'failed') as failed_jobs,
          AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) FILTER (WHERE status = 'completed') as avg_duration_seconds,
          MAX(EXTRACT(EPOCH FROM (completed_at - started_at))) FILTER (WHERE status = 'completed') as max_duration_seconds
        FROM jobs
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY type
      `)

      // Database performance (simplified)
      const dbMetrics = await pool.query(`
        SELECT 
          COUNT(*) as total_connections,
          (SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active') as active_connections
      `)

      // API response times (would need middleware to track this)
      const apiMetrics = {
        avg_response_time: 150, // placeholder
        p95_response_time: 300, // placeholder
        error_rate: 0.02, // placeholder
      }

      const metrics = {
        jobs: jobMetrics.rows,
        database: dbMetrics.rows[0],
        api: apiMetrics,
        generated_at: new Date().toISOString(),
      }

      // Cache for 2 minutes
      await cache.set(cacheKey, metrics, 120)

      res.json(metrics)
    } catch (error) {
      logger.error("Get performance metrics error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

export default router
