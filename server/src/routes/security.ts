import express from "express"
import Joi from "joi"
import { pool } from "../database/connection"
import { authenticateToken, requirePermission } from "../middleware/auth"
import { validateQuery, validateParams } from "../middleware/validation"
import { logger, childLogger } from "../utils/logger"
import { v4 as uuidv4 } from "uuid"

const router = express.Router()

// Log security event
export async function logSecurityEvent(
  eventType: string,
  severity: "low" | "medium" | "high" | "critical",
  details: any,
  userId?: string,
  sourceIp?: string,
  resource?: string,
  action?: string,
  log?: any
) {
  const l = log || logger
  try {
    await pool.query(
      `
      INSERT INTO security_events (id, event_type, severity, source_ip, user_id, resource, action, details)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `,
      [uuidv4(), eventType, severity, sourceIp, userId, resource, action, JSON.stringify(details)]
    )
  } catch (error) {
    l.error("Failed to log security event:", error)
  }
}

// Get security events (admin only)
router.get("/events", 
  authenticateToken,
  requirePermission("security.view"),
  validateQuery(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    severity: Joi.string().valid("low", "medium", "high", "critical").optional(),
    event_type: Joi.string().optional(),
    resolved: Joi.boolean().optional(),
    user_id: Joi.string().uuid().optional(),
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { page = 1, limit = 20, severity, event_type, resolved, user_id } = req.query
      const offset = (Number(page) - 1) * Number(limit)

      let query = `
        SELECT se.*, u.name as user_name, u.email as user_email
        FROM security_events se
        LEFT JOIN users u ON se.user_id = u.id
        WHERE 1=1
      `

      const params: any[] = []
      let paramCount = 0

      if (severity) {
        paramCount++
        query += ` AND se.severity = $${paramCount}`
        params.push(severity)
      }

      if (event_type) {
        paramCount++
        query += ` AND se.event_type = $${paramCount}`
        params.push(event_type)
      }

      if (resolved !== undefined) {
        paramCount++
        query += ` AND se.resolved = $${paramCount}`
        params.push(resolved)
      }

      if (user_id) {
        paramCount++
        query += ` AND se.user_id = $${paramCount}`
        params.push(user_id)
      }

      query += ` ORDER BY se.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`
      params.push(limit, offset)

  const result = await pool.query(query, params)

      // Get total count
      let countQuery = "SELECT COUNT(*) FROM security_events se WHERE 1=1"
      const countParams: any[] = []
      let countParamCount = 0

      if (severity) {
        countParamCount++
        countQuery += ` AND se.severity = $${countParamCount}`
        countParams.push(severity)
      }

      if (event_type) {
        countParamCount++
        countQuery += ` AND se.event_type = $${countParamCount}`
        countParams.push(event_type)
      }

      if (resolved !== undefined) {
        countParamCount++
        countQuery += ` AND se.resolved = $${countParamCount}`
        countParams.push(resolved)
      }

      if (user_id) {
        countParamCount++
        countQuery += ` AND se.user_id = $${countParamCount}`
        countParams.push(user_id)
      }

  const countResult = await pool.query(countQuery, countParams)
      const total = Number.parseInt(countResult.rows[0].count)

      res.json({
        events: result.rows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      })
    } catch (error) {
      log.error("Get security events error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Get security event by ID
router.get("/events/:id", 
  authenticateToken,
  requirePermission("security.view"),
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params

      const result = await pool.query(
        `
        SELECT se.*, u.name as user_name, u.email as user_email
        FROM security_events se
        LEFT JOIN users u ON se.user_id = u.id
        WHERE se.id = $1
      `,
        [id]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Security event not found" })
      }

      res.json({ event: result.rows[0] })
    } catch (error) {
      log.error("Get security event error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Mark security event as resolved
router.put("/events/:id/resolve", 
  authenticateToken,
  requirePermission("security.manage"),
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params

      const result = await pool.query(
        "UPDATE security_events SET resolved = true WHERE id = $1 RETURNING *",
        [id]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Security event not found" })
      }

  log.info(`Security event resolved: ${id} by ${req.user?.email}`)

      res.json({
        message: "Security event marked as resolved",
        event: result.rows[0],
      })
    } catch (error) {
  log.error("Resolve security event error:", error)
  res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Get security dashboard
router.get("/dashboard", 
  authenticateToken,
  requirePermission("security.view"),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      // Security event statistics
      const eventStats = await pool.query(`
        SELECT 
          COUNT(*) as total_events,
          COUNT(*) FILTER (WHERE severity = 'critical') as critical_events,
          COUNT(*) FILTER (WHERE severity = 'high') as high_events,
          COUNT(*) FILTER (WHERE severity = 'medium') as medium_events,
          COUNT(*) FILTER (WHERE severity = 'low') as low_events,
          COUNT(*) FILTER (WHERE resolved = false) as unresolved_events,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as events_last_24h,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as events_last_7d
        FROM security_events
      `)

      // Recent critical events
      const criticalEvents = await pool.query(`
        SELECT se.*, u.name as user_name
        FROM security_events se
        LEFT JOIN users u ON se.user_id = u.id
        WHERE se.severity = 'critical' AND se.resolved = false
        ORDER BY se.created_at DESC
        LIMIT 10
      `)

      // Top event types
      const eventTypes = await pool.query(`
        SELECT 
          event_type,
          COUNT(*) as count,
          COUNT(*) FILTER (WHERE resolved = false) as unresolved_count
        FROM security_events
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY event_type
        ORDER BY count DESC
        LIMIT 10
      `)

      // Failed login attempts by IP
      const failedLogins = await pool.query(`
        SELECT 
          source_ip,
          COUNT(*) as attempts,
          MAX(created_at) as last_attempt
        FROM security_events
        WHERE event_type = 'failed_login' AND created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY source_ip
        ORDER BY attempts DESC
        LIMIT 10
      `)

      // User activity anomalies
      const anomalies = await pool.query(`
        SELECT 
          u.name,
          u.email,
          COUNT(se.*) as security_events,
          MAX(se.created_at) as last_event
        FROM users u
        JOIN security_events se ON u.id = se.user_id
        WHERE se.created_at >= NOW() - INTERVAL '7 days'
        GROUP BY u.id, u.name, u.email
        HAVING COUNT(se.*) > 5
        ORDER BY security_events DESC
        LIMIT 10
      `)

      res.json({
        overview: eventStats.rows[0],
        critical_events: criticalEvents.rows,
        event_types: eventTypes.rows,
        failed_logins: failedLogins.rows,
        user_anomalies: anomalies.rows,
        generated_at: new Date().toISOString(),
      })
    } catch (error) {
      log.error("Get security dashboard error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Report security incident
router.post("/incidents", 
  authenticateToken,
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { event_type, description, severity = "medium" } = req.body

      if (!event_type || !description) {
        return res.status(400).json({ error: "Event type and description are required" })
      }

      await logSecurityEvent(
        event_type,
        severity,
        { description, reported_by: req.user?.email },
        req.user?.id,
        req.ip,
        "manual_report",
        "incident_report",
        log
      )

  log.info(`Security incident reported: ${event_type} by ${req.user?.email}`)

      res.json({ message: "Security incident reported successfully" })
    } catch (error) {
  log.error("Report security incident error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Get audit trail
router.get("/audit", 
  authenticateToken,
  requirePermission("security.audit"),
  validateQuery(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    user_id: Joi.string().uuid().optional(),
    action: Joi.string().optional(),
    resource_type: Joi.string().optional(),
    start_date: Joi.date().optional(),
    end_date: Joi.date().optional(),
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { page = 1, limit = 20, user_id, action, resource_type, start_date, end_date } = req.query
      const offset = (Number(page) - 1) * Number(limit)

      let query = `
        SELECT al.*, u.name as user_name, u.email as user_email
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE 1=1
      `

      const params: any[] = []
      let paramCount = 0

      if (user_id) {
        paramCount++
        query += ` AND al.user_id = $${paramCount}`
        params.push(user_id)
      }

      if (action) {
        paramCount++
        query += ` AND al.action = $${paramCount}`
        params.push(action)
      }

      if (resource_type) {
        paramCount++
        query += ` AND al.resource_type = $${paramCount}`
        params.push(resource_type)
      }

      if (start_date) {
        paramCount++
        query += ` AND al.created_at >= $${paramCount}`
        params.push(start_date)
      }

      if (end_date) {
        paramCount++
        query += ` AND al.created_at <= $${paramCount}`
        params.push(end_date)
      }

      query += ` ORDER BY al.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`
      params.push(limit, offset)

      const result = await pool.query(query, params)

      // Get total count with same filters
      let countQuery = "SELECT COUNT(*) FROM audit_logs al WHERE 1=1"
      const countParams: any[] = []
      let countParamCount = 0

      if (user_id) {
        countParamCount++
        countQuery += ` AND al.user_id = $${countParamCount}`
        countParams.push(user_id)
      }

      if (action) {
        countParamCount++
        countQuery += ` AND al.action = $${countParamCount}`
        countParams.push(action)
      }

      if (resource_type) {
        countParamCount++
        countQuery += ` AND al.resource_type = $${countParamCount}`
        countParams.push(resource_type)
      }

      if (start_date) {
        countParamCount++
        countQuery += ` AND al.created_at >= $${countParamCount}`
        countParams.push(start_date)
      }

      if (end_date) {
        countParamCount++
        countQuery += ` AND al.created_at <= $${countParamCount}`
        countParams.push(end_date)
      }

      const countResult = await pool.query(countQuery, countParams)
      const total = Number.parseInt(countResult.rows[0].count)

      res.json({
        audit_logs: result.rows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      })
    } catch (error) {
      log.error("Get audit trail error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

export default router
