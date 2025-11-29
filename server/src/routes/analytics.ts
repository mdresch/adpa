import express from "express"
import Joi from "joi"
import { pool } from "../database/connection"
import { authenticateToken, requirePermission } from "../middleware/auth"
import { validateQuery } from "../middleware/validation"
import { logger, childLogger } from "../utils/logger"
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
  const log = childLogger({ requestId: (req as any).requestId })
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
  log.error("Get dashboard analytics error:", error)
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
    const log = childLogger({ requestId: (req as any).requestId })
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
          (SELECT COUNT(*) FROM users) as total_users,
          (SELECT COUNT(*) FROM users WHERE is_active = true) as active_users,
          (SELECT COUNT(*) FROM projects) as total_projects,
          (SELECT COUNT(*) FROM documents) as total_documents,
          (SELECT COUNT(*) FROM documents WHERE DATE(created_at) = CURRENT_DATE) as documents_today,
          (SELECT COUNT(*) FROM templates WHERE is_public = true) as public_templates,
          (SELECT COUNT(*) FROM jobs WHERE created_at >= NOW() - INTERVAL '${interval}') as jobs_period,
          (SELECT COUNT(*) FROM audit_logs WHERE action = 'ai_generate' AND created_at >= NOW() - INTERVAL '${interval}') as ai_generations_period
      `)

      // Get total sessions from user_activity_logs (if table exists)
      let totalSessions = 0
      try {
        const sessionsResult = await pool.query(`
          SELECT COUNT(DISTINCT session_id) as total_sessions
          FROM user_activity_logs
          WHERE created_at >= NOW() - INTERVAL '${interval}'
        `)
        totalSessions = parseInt(sessionsResult.rows[0]?.total_sessions || '0', 10)
      } catch (error: any) {
        // Table might not exist, log and continue
        if (error?.code !== '42P01') { // 42P01 = table does not exist
          log.warn('Failed to query user_activity_logs for sessions:', error.message)
        }
      }

      // Get API calls from api_request_logs (if table exists)
      let apiCalls = 0
      try {
        const apiCallsResult = await pool.query(`
          SELECT COUNT(*) as api_calls
          FROM api_request_logs
          WHERE created_at >= NOW() - INTERVAL '${interval}'
        `)
        apiCalls = parseInt(apiCallsResult.rows[0]?.api_calls || '0', 10)
      } catch (error: any) {
        // Table might not exist, log and continue
        if (error?.code !== '42P01') { // 42P01 = table does not exist
          log.warn('Failed to query api_request_logs for API calls:', error.message)
        }
      }

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
          SUM(COALESCE((al.new_values->'usage'->>'total_tokens')::int, 0)) as total_tokens
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
        // Phase 1: Key Metrics (for frontend stat cards)
        total_users: parseInt(systemStats.rows[0]?.total_users || '0', 10),
        active_users: parseInt(systemStats.rows[0]?.active_users || '0', 10),
        total_documents: parseInt(systemStats.rows[0]?.total_documents || '0', 10),
        documents_today: parseInt(systemStats.rows[0]?.documents_today || '0', 10),
        total_sessions: totalSessions,
        api_calls: apiCalls,
        // Existing data structure (for backward compatibility)
        overview: {
          ...systemStats.rows[0],
          total_users: parseInt(systemStats.rows[0]?.total_users || '0', 10),
          total_sessions: totalSessions,
          api_calls: apiCalls,
        },
        user_growth: userGrowth.rows,
        project_activity: projectActivity.rows,
        ai_usage_by_provider: aiUsageByProvider.rows,
        active_users_list: activeUsers.rows, // Renamed to avoid conflict
        framework_usage: frameworkUsage.rows,
        period,
        generated_at: new Date().toISOString(),
      }

      // Cache for 10 minutes
      await cache.set(cacheKey, analytics, 600)

  res.json(analytics)
    } catch (error) {
  log.error("Get system analytics error:", error)
  res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Track custom event
router.post("/events", 
  authenticateToken,
  async (req: AuthRequest, res: express.Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
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
  log.error("Track event error:", error)
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
    const log = childLogger({ requestId: (req as any).requestId })
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
      log.error("Get user activity error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Get performance metrics
router.get("/performance", 
  authenticateToken,
  requirePermission("analytics.system"),
  async (req: AuthRequest, res: express.Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
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
  log.error("Get performance metrics error:", error)
  res.status(500).json({ error: "Internal server error" })
    }
  }
)

/**
 * GET /api/analytics/pmbok8-domains/:projectId
 * Get PMBOK 8 Performance Domain analytics for a project
 */
router.get(
  '/pmbok8-domains/:projectId',
  authenticateToken,
  async (req: AuthRequest, res: express.Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { projectId } = req.params
      const userId = req.user?.id

      // Verify user has access to this project
      const projectCheck = await pool.query(
        'SELECT id FROM projects WHERE id = $1 AND (owner_id = $2 OR team_members ? $2::text)',
        [projectId, userId]
      )

      if (projectCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied to this project' })
      }

      const cacheKey = `analytics:pmbok8:${projectId}`
      const cached = await cache.get(cacheKey)
      if (cached) {
        return res.json(cached)
      }

      // Team Performance Domain metrics
      const teamMetrics = await pool.query(`
        SELECT 
          COUNT(*) as total_agreements,
          COUNT(*) FILTER (WHERE status = 'active') as active_agreements,
          COUNT(*) FILTER (WHERE status = 'under_review') as under_review,
          AVG(adherence_score) as avg_adherence_score,
          SUM(violations_count) as total_violations,
          COUNT(*) FILTER (WHERE violations_count > 0) as agreements_with_violations
        FROM team_agreements
        WHERE project_id = $1
      `, [projectId])

      // Development Approach & Life Cycle Domain metrics
      // Note: Uses LEFT JOIN so we get a row even if no iterations exist
      // Since project_id has UNIQUE constraint, we don't need GROUP BY
      const developmentMetrics = await pool.query(`
        SELECT 
          COUNT(DISTINCT da.id)::int as total_approaches,
          COUNT(DISTINCT da.methodology)::int as unique_methodologies,
          COUNT(DISTINCT pi.id)::int as total_iterations,
          COUNT(DISTINCT pi.id) FILTER (WHERE pi.status = 'completed')::int as completed_iterations,
          AVG(pi.velocity) FILTER (WHERE pi.velocity IS NOT NULL) as avg_velocity,
          AVG(pi.completed_story_points) FILTER (WHERE pi.completed_story_points IS NOT NULL) as avg_story_points,
          MAX(da.approach) as approach,
          MAX(da.methodology) as methodology
        FROM development_approach da
        LEFT JOIN project_iterations pi ON pi.project_id = da.project_id
        WHERE da.project_id = $1
      `, [projectId])

      // Project Work Performance Domain metrics
      // Aggregate from activities, deliverables, milestones, work_items, project_iterations, and capacity_plans tables
      // Activities: status IN ('not_started', 'in_progress', 'completed', 'blocked', 'cancelled')
      // Deliverables: status IN ('not_started', 'in_progress', 'review', 'completed', 'delivered')
      // Milestones: status IN ('planned', 'in_progress', 'completed', 'delayed')
      // Work Items: status IN ('todo', 'in_progress', 'review', 'done', 'blocked')
      // Project Iterations: status IN ('planned', 'in_progress', 'completed', 'on_hold')
      // Capacity Plans: No status field (always active, treated as 'active' for counting)
      // Note: deliverables.owner is VARCHAR (name), not UUID, so we use NULL for assigned_to
      const workMetrics = await pool.query(`
        SELECT 
          COALESCE(COUNT(*), 0)::int as total_work_items,
          COALESCE(COUNT(*) FILTER (WHERE status IN ('completed', 'delivered', 'done')), 0)::int as completed_items,
          COALESCE(COUNT(*) FILTER (WHERE status IN ('in_progress', 'review')), 0)::int as in_progress_items,
          COALESCE(COUNT(*) FILTER (WHERE status = 'blocked' OR status = 'delayed' OR status = 'on_hold'), 0)::int as blocked_items,
          COALESCE(COUNT(DISTINCT assigned_to) FILTER (WHERE assigned_to IS NOT NULL), 0)::int as unique_assignees
        FROM (
          SELECT COALESCE(status, 'not_started') as status, assigned_to::text as assigned_to 
          FROM activities 
          WHERE project_id = $1
          UNION ALL
          SELECT COALESCE(status, 'not_started') as status, NULL::text as assigned_to 
          FROM deliverables 
          WHERE project_id = $1
          UNION ALL
          SELECT COALESCE(status, 'planned') as status, NULL::text as assigned_to 
          FROM milestones 
          WHERE project_id = $1 AND deleted_at IS NULL
          UNION ALL
          SELECT COALESCE(status, 'todo') as status, assigned_to::text as assigned_to 
          FROM work_items 
          WHERE project_id = $1
          UNION ALL
          SELECT COALESCE(status, 'planned') as status, NULL::text as assigned_to 
          FROM project_iterations 
          WHERE project_id = $1
          UNION ALL
          SELECT 'active' as status, NULL::text as assigned_to 
          FROM capacity_plans 
          WHERE project_id = $1
        ) combined_work
      `, [projectId])

      const capacityMetrics = await pool.query(`
        SELECT 
          COALESCE(COUNT(*), 0)::int as total_capacity_plans,
          AVG(allocation_percentage) FILTER (WHERE allocation_percentage IS NOT NULL) as avg_utilization,
          COALESCE(COUNT(*) FILTER (WHERE availability IS NOT NULL), 0)::int as resources_with_availability,
          COALESCE(SUM(allocation_percentage) FILTER (WHERE allocation_percentage IS NOT NULL), 0)::numeric as total_allocation_percentage
        FROM resources
        WHERE project_id = $1
      `, [projectId])

      // Measurement Performance Domain metrics
      const measurementMetrics = await pool.query(`
        SELECT 
          COUNT(*) as total_measurements,
          COUNT(*) FILTER (WHERE status = 'on_track') as on_track_count,
          COUNT(*) FILTER (WHERE status = 'at_risk') as at_risk_count,
          COUNT(*) FILTER (WHERE status = 'off_track') as off_track_count,
          AVG(variance_percentage) FILTER (WHERE variance_percentage IS NOT NULL) as avg_variance,
          COUNT(DISTINCT success_criterion_id) FILTER (WHERE success_criterion_id IS NOT NULL) as measured_criteria
        FROM performance_measurements
        WHERE project_id = $1
      `, [projectId])

      const evmMetrics = await pool.query(`
        SELECT 
          COUNT(*) as total_evm_records,
          AVG(schedule_performance_index) FILTER (WHERE schedule_performance_index IS NOT NULL) as avg_spi,
          AVG(cost_performance_index) FILTER (WHERE cost_performance_index IS NOT NULL) as avg_cpi,
          AVG(schedule_variance) FILTER (WHERE schedule_variance IS NOT NULL) as avg_sv,
          AVG(cost_variance) FILTER (WHERE cost_variance IS NOT NULL) as avg_cv,
          MAX(measurement_date) as latest_measurement_date
        FROM earned_value_metrics
        WHERE project_id = $1
      `, [projectId])

      // Uncertainty Performance Domain metrics
      // Note: Using separate subqueries to avoid Cartesian product from JOINing opportunities and risk_responses
      const uncertaintyMetrics = await pool.query(`
        SELECT 
          (SELECT COUNT(*)::int FROM opportunities WHERE project_id = $1) as total_opportunities,
          (SELECT COUNT(*)::int FROM opportunities WHERE project_id = $1 AND status = 'realized') as realized_opportunities,
          (SELECT COUNT(*)::int FROM opportunities WHERE project_id = $1 AND status = 'exploiting') as exploiting_opportunities,
          (SELECT SUM(expected_benefit) FROM opportunities WHERE project_id = $1 AND expected_benefit IS NOT NULL) as total_expected_benefit,
          (SELECT COUNT(*)::int FROM risk_responses WHERE project_id = $1) as total_risk_responses,
          (SELECT COUNT(*)::int FROM risk_responses WHERE project_id = $1 AND effectiveness = 'effective') as effective_responses,
          (SELECT COUNT(*)::int FROM risk_responses WHERE project_id = $1 AND effectiveness = 'ineffective') as ineffective_responses,
          (SELECT AVG(cost_of_response) FROM risk_responses WHERE project_id = $1 AND cost_of_response IS NOT NULL) as avg_response_cost
      `, [projectId])

      // Aggregate domain health scores
      const domainHealth = {
        team: {
          score: teamMetrics.rows[0]?.avg_adherence_score 
            ? Math.min(100, Math.max(0, (teamMetrics.rows[0].avg_adherence_score / 10) * 100))
            : null,
          status: teamMetrics.rows[0]?.total_violations > 0 ? 'needs_attention' : 'healthy'
        },
        developmentApproach: {
          score: developmentMetrics.rows[0]?.avg_velocity 
            ? Math.min(100, Math.max(0, (developmentMetrics.rows[0].avg_velocity / 50) * 100))
            : (parseInt(developmentMetrics.rows[0]?.total_approaches || '0') > 0 ? 50 : null), // Default score if approach exists but no velocity data
          status: parseInt(developmentMetrics.rows[0]?.total_approaches || '0') > 0 ? 'active' : 'inactive'
        },
        projectWork: {
          score: workMetrics.rows[0]?.total_work_items > 0 
            ? ((workMetrics.rows[0]?.completed_items || 0) / workMetrics.rows[0].total_work_items) * 100
            : null,
          status: (workMetrics.rows[0]?.total_work_items || 0) > 0
            ? (workMetrics.rows[0]?.blocked_items > 0 ? 'blocked' : 'active')
            : 'inactive'
        },
        measurement: {
          score: measurementMetrics.rows[0]?.on_track_count 
            ? (measurementMetrics.rows[0].on_track_count / measurementMetrics.rows[0].total_measurements) * 100
            : null,
          status: measurementMetrics.rows[0]?.off_track_count > 0 ? 'at_risk' : 'on_track'
        },
        uncertainty: {
          score: uncertaintyMetrics.rows[0]?.effective_responses 
            ? (uncertaintyMetrics.rows[0].effective_responses / uncertaintyMetrics.rows[0].total_risk_responses) * 100
            : null,
          status: uncertaintyMetrics.rows[0]?.ineffective_responses > 0 ? 'needs_attention' : 'managed'
        }
      }

      const analytics = {
        projectId,
        domains: {
          team: {
            ...teamMetrics.rows[0],
            health: domainHealth.team
          },
          developmentApproach: {
            ...(developmentMetrics.rows[0] || {}),
            total_approaches: parseInt(developmentMetrics.rows[0]?.total_approaches || '0'),
            total_iterations: parseInt(developmentMetrics.rows[0]?.total_iterations || '0'),
            completed_iterations: parseInt(developmentMetrics.rows[0]?.completed_iterations || '0'),
            health: domainHealth.developmentApproach
          },
          projectWork: {
            workItems: workMetrics.rows[0],
            capacity: capacityMetrics.rows[0],
            health: domainHealth.projectWork
          },
          measurement: {
            performance: measurementMetrics.rows[0],
            evm: evmMetrics.rows[0],
            health: domainHealth.measurement
          },
          uncertainty: {
            ...uncertaintyMetrics.rows[0],
            health: domainHealth.uncertainty
          }
        },
        overallHealth: {
          domainsCovered: Object.values(domainHealth).filter(d => d.score !== null).length,
          averageScore: Object.values(domainHealth)
            .map(d => d.score)
            .filter((s): s is number => s !== null)
            .reduce((sum, score, _, arr) => sum + score / arr.length, 0) || 0
        },
        generated_at: new Date().toISOString()
      }

      // Cache for 5 minutes
      await cache.set(cacheKey, analytics, 300)

      res.json(analytics)
    } catch (error) {
      log.error('PMBOK 8 domain analytics error:', error)
      res.status(500).json({ error: 'Failed to fetch PMBOK 8 domain analytics' })
    }
  }
)

/**
 * GET /api/analytics/domain-extraction
 * System-level PMBOK 8 domain extraction analytics (optionally scoped to a project)
 */
router.get(
  '/domain-extraction',
  authenticateToken,
  requirePermission('analytics.system'),
  validateQuery(Joi.object({
    period: Joi.string().valid('7d', '30d', '90d', '1y').default('30d'),
    projectId: Joi.string().uuid().optional()
  })),
  async (req: AuthRequest, res: express.Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { period = '30d', projectId } = req.query as { period?: string; projectId?: string }
      const intervalMap = {
        '7d': '7 days',
        '30d': '30 days',
        '90d': '90 days',
        '1y': '1 year'
      }
      const interval = intervalMap[period as keyof typeof intervalMap] || '30 days'
      const cacheKey = `analytics:domain:${period}:${projectId || 'all'}`
      const cached = await cache.get(cacheKey)
      if (cached) {
        return res.json(cached)
      }

      const buildWhereClause = (columnName: string) => {
        const params: any[] = []
        let clause = `${columnName} >= NOW() - INTERVAL '${interval}'`
        if (projectId) {
          params.push(projectId)
          clause += ` AND project_id = $${params.length}`
        }
        return { clause, params }
      }

      const domainWhere = buildWhereClause('requested_at')

      const summaryResult = await pool.query(
        `SELECT 
          COUNT(*)::int as total_runs,
          COUNT(*) FILTER (WHERE status = 'completed')::int as completed_runs,
          COUNT(*) FILTER (WHERE status = 'failed')::int as failed_runs,
          COUNT(*) FILTER (WHERE status = 'partial')::int as partial_runs,
          COALESCE(AVG(success_rate), 0)::numeric as avg_success_rate,
          COALESCE(AVG(total_entities), 0)::numeric as avg_entities,
          COALESCE(AVG(extraction_runtime_ms), 0)::numeric as avg_runtime_ms
        FROM domain_extraction_runs
        WHERE ${domainWhere.clause}`,
        domainWhere.params
      )

      const domainStats = await pool.query(
        `SELECT 
          domain,
          COUNT(*)::int as total_runs,
          COUNT(*) FILTER (WHERE status = 'completed')::int as completed_runs,
          COUNT(*) FILTER (WHERE status = 'failed')::int as failed_runs,
          COUNT(*) FILTER (WHERE status = 'partial')::int as partial_runs,
          COALESCE(AVG(total_entities), 0)::numeric as avg_entities,
          COALESCE(AVG(success_rate), 0)::numeric as avg_success_rate,
          COALESCE(AVG(cache_hit_rate), 0)::numeric as avg_cache_hit_rate,
          COALESCE(AVG(extraction_runtime_ms), 0)::numeric as avg_runtime_ms,
          MAX(completed_at) as last_run_at
        FROM domain_extraction_runs
        WHERE ${domainWhere.clause}
        GROUP BY domain
        ORDER BY domain`,
        domainWhere.params
      )

      const providerWhere = buildWhereClause('created_at')

      const providerUsage = await pool.query(
        `SELECT 
          COALESCE(provider_name, 'unknown') as provider_name,
          COALESCE(model_name, 'n/a') as model_name,
          COUNT(*)::int as usage_count,
          COALESCE(AVG(response_time_ms), 0)::numeric as avg_response_time_ms,
          COALESCE(SUM(cost_usd), 0)::numeric as total_cost_usd
        FROM ai_provider_usage
        WHERE ${providerWhere.clause}
        GROUP BY provider_name, model_name
        ORDER BY usage_count DESC`,
        providerWhere.params
      )

      const costByDomain = await pool.query(
        `SELECT 
          domain,
          COALESCE(SUM(cost_usd), 0)::numeric as total_cost_usd,
          COALESCE(SUM(total_tokens), 0)::numeric as total_tokens
        FROM ai_provider_usage
        WHERE domain IS NOT NULL AND ${providerWhere.clause}
        GROUP BY domain
        ORDER BY domain`,
        providerWhere.params
      )

      const analytics = {
        success: true,
        period,
        projectId: projectId || null,
        generated_at: new Date().toISOString(),
        summary: summaryResult.rows[0] || {
          total_runs: 0,
          completed_runs: 0,
          failed_runs: 0,
          partial_runs: 0,
          avg_success_rate: 0,
          avg_entities: 0,
          avg_runtime_ms: 0
        },
        domains: domainStats.rows,
        providerUsage: providerUsage.rows,
        costByDomain: costByDomain.rows
      }

      await cache.set(cacheKey, analytics, 300)
      res.json(analytics)
    } catch (error) {
      log.error('Get domain extraction analytics error:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }
)

/**
 * GET /api/analytics/search
 * Get search analytics data
 */
router.get(
  "/search",
  authenticateToken,
  requirePermission("analytics.view"),
  validateQuery(Joi.object({
    startDate: Joi.string().isoDate().optional(),
    endDate: Joi.string().isoDate().optional(),
    timeRange: Joi.string().valid("7d", "30d", "90d", "1y").optional()
  })),
  async (req: AuthRequest, res: express.Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      // Calculate date range
      let startDate: Date
      let endDate: Date = new Date()
      
      if (req.query.timeRange) {
        const days = req.query.timeRange === "7d" ? 7 : req.query.timeRange === "30d" ? 30 : req.query.timeRange === "90d" ? 90 : 365
        startDate = new Date()
        startDate.setDate(startDate.getDate() - days)
      } else if (req.query.startDate && req.query.endDate) {
        startDate = new Date(req.query.startDate as string)
        endDate = new Date(req.query.endDate as string)
      } else {
        // Default to last 30 days
        startDate = new Date()
        startDate.setDate(startDate.getDate() - 30)
      }

      // Refresh materialized views to ensure they have latest data
      // This is safe to do concurrently and won't block reads
      try {
        await pool.query(`SELECT refresh_search_analytics_views()`)
        log.debug('[SEARCH ANALYTICS] Refreshed materialized views')
      } catch (error: any) {
        log.warn('[SEARCH ANALYTICS] Failed to refresh views (non-critical):', error.message)
        // Continue anyway - views may still have some data
      }

      // Get search statistics
      const statsResult = await pool.query(
        `SELECT * FROM get_search_statistics($1, $2)`,
        [startDate, endDate]
      )

      // Get popular searches
      const popularSearches = await pool.query(`
        SELECT * FROM mv_popular_searches
        ORDER BY search_count DESC
        LIMIT 20
      `)

      // Get search mode usage
      const modeUsage = await pool.query(`
        SELECT * FROM mv_search_mode_usage
        WHERE date >= $1
        ORDER BY date DESC, usage_count DESC
      `, [startDate])

      // Get search success rate over time
      const successRate = await pool.query(`
        SELECT * FROM mv_search_success_rate
        WHERE date >= $1
        ORDER BY date DESC
      `, [startDate])

      // Get top clicked results
      const topClicked = await pool.query(`
        SELECT * FROM mv_top_clicked_results
        ORDER BY click_count DESC
        LIMIT 20
      `)

      // Get suggestion usage
      const suggestionUsage = await pool.query(`
        SELECT 
          suggestion_type,
          COUNT(*) as click_count,
          COUNT(DISTINCT user_id) as unique_users
        FROM search_suggestion_clicks
        WHERE created_at >= $1 AND created_at <= $2
        GROUP BY suggestion_type
        ORDER BY click_count DESC
      `, [startDate, endDate])

      // Get searches by hour of day
      const searchesByHour = await pool.query(`
        SELECT 
          EXTRACT(HOUR FROM created_at) as hour,
          COUNT(*) as search_count
        FROM search_analytics
        WHERE created_at >= $1 AND created_at <= $2
        GROUP BY EXTRACT(HOUR FROM created_at)
        ORDER BY hour
      `, [startDate, endDate])

      const analytics = {
        statistics: statsResult.rows[0] || {},
        popularSearches: popularSearches.rows,
        modeUsage: modeUsage.rows,
        successRate: successRate.rows,
        topClickedResults: topClicked.rows,
        suggestionUsage: suggestionUsage.rows,
        searchesByHour: searchesByHour.rows,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        },
        generated_at: new Date().toISOString()
      }

      res.json(analytics)
    } catch (error: any) {
      log.error("Get search analytics error:", error)
      res.status(500).json({ error: "Failed to fetch search analytics", message: error.message })
    }
  }
)

export default router
