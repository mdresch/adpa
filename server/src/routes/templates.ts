import express from "express"
import Joi from "joi"
import { pool } from "../database/connection"
import { authenticateToken, requirePermission, requireRole } from "../middleware/auth"
import { validate, validateParams, validateQuery, schemas } from "../middleware/validation"
import { logger, childLogger } from "../utils/logger"
import { cache } from "../utils/redis"
import { v4 as uuidv4 } from "uuid"
import { trackActivity } from "../middleware/analyticsMiddleware"
import TemplateAnalyticsService from "../services/templateAnalyticsService"

const router = express.Router()

// Get templates
router.get("/",
  authenticateToken,
  validateQuery(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(200).default(100),
    framework: Joi.string().valid("TOGAF", "SABSA", "COBIT", "ITIL", "Custom", "BABOK", "BABOK v3", "PMBOK", "PMBOK 7", "DMBOK", "DMBOK 2.0", "Construction").optional(),
    category: Joi.string().max(100).optional(),
    search: Joi.string().max(100).optional(),
    is_public: Joi.boolean().optional(),
    template_scope: Joi.string().valid("standard", "company", "user", "all").optional(),
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { page = 1, limit = 100, framework, category, search, is_public, template_scope } = req.query
      const offset = (Number(page) - 1) * Number(limit)

      log.info(`Fetching templates: page=${page}, limit=${limit}, framework=${framework || 'all'}, scope=${template_scope || 'all'}`)

      // Check if user is super_admin
      const userRole = (req as any).user?.role?.toLowerCase()
      const isSuperAdmin = userRole === 'super_admin'

      // Get user's company_id for filtering company templates
      let userCompanyId: string | null = null
      if (req.user?.id && !isSuperAdmin) {
        try {
          const userResult = await pool.query(
            "SELECT company_id FROM users WHERE id = $1",
            [req.user.id]
          )
          userCompanyId = userResult.rows[0]?.company_id || null
        } catch (err) {
          log.warn("Failed to fetch user company_id:", err)
        }
      }

      let query = `
        SELECT 
          t.*, 
          u.name as created_by_name,
          c.name as company_name,
          CASE 
            WHEN t.validation_count = 0 THEN 0
            ELSE ROUND((t.success_count::NUMERIC / t.validation_count::NUMERIC * 100), 2)
          END as success_rate,
          CASE
            WHEN t.validation_count = 0 THEN 'Not tested yet'
            WHEN (t.success_count::NUMERIC / NULLIF(t.validation_count, 0)) >= 0.90 THEN 'Excellent'
            WHEN (t.success_count::NUMERIC / NULLIF(t.validation_count, 0)) >= 0.75 THEN 'Good'
            WHEN (t.success_count::NUMERIC / NULLIF(t.validation_count, 0)) >= 0.50 THEN 'Fair'
            ELSE 'Needs Improvement'
          END as health_rating,
          tep.avg_entity_counts,
          tep.knowledge_domain_coverage,
          tep.performance_domain_coverage,
          tep.primary_knowledge_domain,
          tep.secondary_knowledge_domains,
          tep.primary_performance_domain
        FROM templates t
        LEFT JOIN users u ON t.created_by = u.id
        LEFT JOIN companies c ON t.company_id = c.id
        LEFT JOIN template_entity_profile tep ON tep.template_id = t.id
        WHERE t.deleted_at IS NULL
          AND (t.development_status IS NULL OR t.development_status != 'archived')
      `

      const params: any[] = []
      let paramCount = 0

      // Super admin can see all templates - no scope filtering
      if (!isSuperAdmin) {
        query += ` AND (
            -- Standard templates: available to everyone
            t.template_scope = 'standard'
            OR
            -- Company templates: available to users in the same company
            (t.template_scope = 'company' AND t.company_id = $${paramCount + 1})
            OR
            -- User templates: available to the creator or if public
            (t.template_scope = 'user' AND (t.is_public = true OR t.created_by = $${paramCount + 2}))
          )`
        params.push(userCompanyId, req.user?.id)
        paramCount = 2
      }

      if (framework) {
        paramCount++
        query += ` AND t.framework = $${paramCount}`
        params.push(framework)
      }

      if (category) {
        paramCount++
        query += ` AND t.category = $${paramCount}`
        params.push(category)
      }

      if (search) {
        paramCount++
        query += ` AND (t.name ILIKE $${paramCount} OR t.description ILIKE $${paramCount})`
        params.push(`%${search}%`)
      }

      if (is_public !== undefined) {
        paramCount++
        query += ` AND t.is_public = $${paramCount}`
        params.push(is_public)
      }

      // Filter by template_scope if specified
      if (template_scope && template_scope !== 'all') {
        paramCount++
        query += ` AND t.template_scope = $${paramCount}`
        params.push(template_scope)
      }

      query += ` ORDER BY 
        CASE t.template_scope 
          WHEN 'standard' THEN 1 
          WHEN 'company' THEN 2 
          WHEN 'user' THEN 3 
        END,
        t.usage_count DESC, 
        t.created_at DESC 
        LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`
      params.push(limit, offset)

      const result = await pool.query(query, params)

      // Parse JSONB fields if they're strings (PostgreSQL sometimes returns JSONB as strings)
      result.rows.forEach((template: any) => {
        if (template.avg_entity_counts && typeof template.avg_entity_counts === 'string') {
          try {
            template.avg_entity_counts = JSON.parse(template.avg_entity_counts)
          } catch (e) {
            template.avg_entity_counts = {}
          }
        }
        if (template.knowledge_domain_coverage && typeof template.knowledge_domain_coverage === 'string') {
          try {
            template.knowledge_domain_coverage = JSON.parse(template.knowledge_domain_coverage)
          } catch (e) {
            template.knowledge_domain_coverage = {}
          }
        }
        if (template.performance_domain_coverage && typeof template.performance_domain_coverage === 'string') {
          try {
            template.performance_domain_coverage = JSON.parse(template.performance_domain_coverage)
          } catch (e) {
            template.performance_domain_coverage = {}
          }
        }
        if (template.secondary_knowledge_domains && typeof template.secondary_knowledge_domains === 'string') {
          try {
            template.secondary_knowledge_domains = JSON.parse(template.secondary_knowledge_domains)
          } catch (e) {
            template.secondary_knowledge_domains = []
          }
        }
      })

      // Get total count (exclude archived templates)
      let countQuery = `
        SELECT COUNT(*) 
        FROM templates t
        WHERE t.deleted_at IS NULL
          AND (t.development_status IS NULL OR t.development_status != 'archived')
      `
      const countParams: any[] = []
      let countParamCount = 0

      // Super admin can see all templates - no scope filtering
      if (!isSuperAdmin) {
        countQuery += ` AND (
            t.template_scope = 'standard'
            OR
            (t.template_scope = 'company' AND t.company_id = $${countParamCount + 1})
            OR
            (t.template_scope = 'user' AND (t.is_public = true OR t.created_by = $${countParamCount + 2}))
          )`
        countParams.push(userCompanyId, req.user?.id)
        countParamCount = 2
      }

      if (framework) {
        countParamCount++
        countQuery += ` AND t.framework = $${countParamCount}`
        countParams.push(framework as string)
      }

      if (category) {
        countParamCount++
        countQuery += ` AND t.category = $${countParamCount}`
        countParams.push(category as string)
      }

      if (search) {
        countParamCount++
        countQuery += ` AND (t.name ILIKE $${countParamCount} OR t.description ILIKE $${countParamCount})`
        countParams.push(`%${search}%`)
      }

      if (is_public !== undefined) {
        countParamCount++
        countQuery += ` AND t.is_public = $${countParamCount}`
        countParams.push(is_public ? "true" : "false")
      }

      if (template_scope && template_scope !== 'all') {
        countParamCount++
        countQuery += ` AND t.template_scope = $${countParamCount}`
        countParams.push(template_scope)
      }

      const countResult = await pool.query(countQuery, countParams)
      const total = Number.parseInt(countResult.rows[0].count)

      log.info(`Returning ${result.rows.length} templates out of ${total} total`)

      res.json({
        templates: result.rows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      })
    } catch (error) {
      log.error("Get templates error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// --- Trash endpoints (MUST come before /:id route) ---
// List soft-deleted templates (admin or owner) - optional admin-only in production
router.get(
  "/trash",
  authenticateToken,
  requirePermission("templates.view"),
  validateQuery(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10)
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const page = Number(req.query.page || 1)
      const limit = Math.min(Number(req.query.limit || 10), 100)
      const offset = (page - 1) * limit

      // If user is admin, allow viewing all deleted/archived templates; otherwise restrict to templates deleted by the current user
      const isAdmin = req.user?.role === "admin"

      // Include both soft-deleted templates AND templates with archived status
      let query = `SELECT t.*, u.name as created_by_name FROM templates t LEFT JOIN users u ON t.created_by = u.id WHERE (t.deleted_at IS NOT NULL OR t.development_status = 'archived')`
      const params: any[] = []

      if (!isAdmin) {
        params.push(req.user?.id)
        query += ` AND (t.deleted_by = $${params.length} OR t.created_by = $${params.length})`
      }

      // Order by deletion time desc (or updated_at for archived templates), apply pagination
      query += ` ORDER BY COALESCE(t.deleted_at, t.updated_at) DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
      params.push(limit, offset)

      const result = await pool.query(query, params)

      // Count total matching (soft-deleted OR archived)
      let countQuery = `SELECT COUNT(*) FROM templates t WHERE (t.deleted_at IS NOT NULL OR t.development_status = 'archived')`
      const countParams: any[] = []
      if (!isAdmin) {
        countParams.push(req.user?.id)
        countQuery += ` AND (t.deleted_by = $${countParams.length} OR t.created_by = $${countParams.length})`
      }
      const countResult = await pool.query(countQuery, countParams)
      const total = Number.parseInt(countResult.rows[0].count)

      res.json({
        templates: result.rows,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      })
    } catch (error) {
      log.error("Get trash templates error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Restore soft-deleted template
router.post("/:id/restore",
  authenticateToken,
  requirePermission("templates.update"),
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params

      const templateCheck = await pool.query("SELECT created_by FROM templates WHERE id = $1 AND deleted_at IS NOT NULL", [id])
      if (templateCheck.rows.length === 0) return res.status(404).json({ error: "Template not found or not deleted" })

      const template = templateCheck.rows[0]
      if (template.created_by !== req.user?.id && req.user?.role !== "admin") {
        return res.status(403).json({ error: "Access denied" })
      }

      const result = await pool.query("UPDATE templates SET deleted_at = NULL, deleted_by = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *", [id])
      await cache.del(`template:${id}`)
      res.json({ message: "Template restored", template: result.rows[0] })
    } catch (error) {
      log.error("Restore template error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Hard delete (permanent)
router.delete("/:id/hard",
  authenticateToken,
  requirePermission("templates.delete"),
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  async (req, res) => {
    try {
      const { id } = req.params
      const templateCheck = await pool.query("SELECT created_by FROM templates WHERE id = $1 AND deleted_at IS NOT NULL", [id])
      if (templateCheck.rows.length === 0) return res.status(404).json({ error: "Template not found or not deleted" })

      const template = templateCheck.rows[0]
      if (template.created_by !== req.user?.id && req.user?.role !== "admin") {
        return res.status(403).json({ error: "Access denied" })
      }

      // Optionally check documents referencing this template and handle cascade or block
      await pool.query("DELETE FROM templates WHERE id = $1", [id])
      await cache.del(`template:${id}`)
      res.json({ message: "Template permanently deleted" })
    } catch (error) {
      const log = childLogger({ requestId: (req as any).requestId })
      log.error("Hard delete template error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Get template by ID
router.get("/:id",
  authenticateToken,
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params

      // Check cache first (but always fetch recent usage as it changes frequently)
      const cacheKey = `template:${id}`
      const cached = await cache.get(cacheKey)

      // Get recent template usage (always fetch fresh, not cached)
      const usageResult = await pool.query(
        `
        SELECT 
          tu.id,
          tu.document_id,
          tu.used_at,
          tu.quality_score,
          tu.success,
          tu.word_count,
          tu.generation_time_ms,
          tu.ai_provider,
          tu.ai_model,
          d.name as document_name,
          d.status as document_status,
          p.id as project_id,
          p.name as project_name,
          u.name as user_name
        FROM template_usage tu
        LEFT JOIN documents d ON tu.document_id = d.id
        LEFT JOIN projects p ON tu.project_id = p.id
        LEFT JOIN users u ON tu.user_id = u.id
        WHERE tu.template_id = $1
        ORDER BY tu.used_at DESC
        LIMIT 10
        `,
        [id]
      )

      const recentUsage = usageResult.rows.map((row: any) => ({
        id: row.id,
        document_id: row.document_id,
        document_name: row.document_name,
        document_status: row.document_status,
        project_id: row.project_id,
        project_name: row.project_name,
        user_name: row.user_name,
        used_at: row.used_at,
        quality_score: row.quality_score,
        success: row.success,
        word_count: row.word_count,
        generation_time_ms: row.generation_time_ms,
        ai_provider: row.ai_provider,
        ai_model: row.ai_model,
      }))

      // Get template version history (optimizations and amendments)
      const versionHistoryResult = await pool.query(
        `
        SELECT 
          tv.id,
          tv.version_number,
          tv.change_type,
          tv.change_summary,
          tv.created_at,
          tv.created_by,
          u.name as created_by_name,
          tis.id as optimization_suggestion_id,
          tis.expected_quality_gain,
          tis.implemented_at,
          tis.status as suggestion_status
        FROM template_versions tv
        LEFT JOIN users u ON tv.created_by = u.id
        LEFT JOIN template_improvement_suggestions tis ON tv.improvement_suggestion_id = tis.id
        WHERE tv.template_id = $1
        ORDER BY tv.created_at DESC
        LIMIT 10
        `,
        [id]
      )

      // Get implemented optimization suggestions (AI optimizations)
      const optimizationHistoryResult = await pool.query(
        `
        SELECT 
          tis.id,
          tis.status,
          tis.expected_quality_gain,
          tis.current_avg_quality,
          tis.implemented_at,
          tis.implemented_by,
          u.name as implemented_by_name,
          tis.created_at,
          tis.suggested_improvements
        FROM template_improvement_suggestions tis
        LEFT JOIN users u ON tis.implemented_by = u.id
        WHERE tis.template_id = $1
          AND tis.status = 'implemented'
          AND (
            -- AI optimizations (have full template content in suggested_improvements)
            EXISTS (
              SELECT 1 FROM jsonb_array_elements(tis.suggested_improvements) AS imp
              WHERE (
                (imp->'metadata'->>'optimization_type')::text = '"ai_generated"'
                OR (imp->>'change_type')::text = '"template_optimization"'
              )
            )
          )
        ORDER BY tis.implemented_at DESC NULLS LAST, tis.created_at DESC
        LIMIT 10
        `,
        [id]
      )

      const versionHistory = versionHistoryResult.rows.map((row: any) => ({
        id: row.id,
        version_number: row.version_number,
        change_type: row.change_type,
        change_summary: row.change_summary,
        created_at: row.created_at,
        created_by: row.created_by,
        created_by_name: row.created_by_name,
        is_optimization: !!row.optimization_suggestion_id,
        expected_quality_gain: row.expected_quality_gain,
        implemented_at: row.implemented_at,
      }))

      const optimizationHistory = optimizationHistoryResult.rows.map((row: any) => ({
        id: row.id,
        expected_quality_gain: row.expected_quality_gain,
        current_avg_quality: row.current_avg_quality,
        implemented_at: row.implemented_at,
        implemented_by: row.implemented_by,
        implemented_by_name: row.implemented_by_name,
        created_at: row.created_at,
      }))

      if (cached) {
        // Ensure JSONB fields are parsed even in cached data
        const template = { ...cached }
        if (template.avg_entity_counts && typeof template.avg_entity_counts === 'string') {
          try {
            template.avg_entity_counts = JSON.parse(template.avg_entity_counts)
          } catch (e) {
            template.avg_entity_counts = {}
          }
        }
        if (template.knowledge_domain_coverage && typeof template.knowledge_domain_coverage === 'string') {
          try {
            template.knowledge_domain_coverage = JSON.parse(template.knowledge_domain_coverage)
          } catch (e) {
            template.knowledge_domain_coverage = {}
          }
        }
        if (template.performance_domain_coverage && typeof template.performance_domain_coverage === 'string') {
          try {
            template.performance_domain_coverage = JSON.parse(template.performance_domain_coverage)
          } catch (e) {
            template.performance_domain_coverage = {}
          }
        }
        if (template.secondary_knowledge_domains && typeof template.secondary_knowledge_domains === 'string') {
          try {
            template.secondary_knowledge_domains = JSON.parse(template.secondary_knowledge_domains)
          } catch (e) {
            template.secondary_knowledge_domains = []
          }
        }
        // Return fetched versionHistory and optimizationHistory even for cached templates
        return res.json({ template, recentUsage, versionHistory, optimizationHistory })
      }

      // Check if user is super_admin
      const userRole = (req as any).user?.role?.toLowerCase()
      const isSuperAdmin = userRole === 'super_admin'

      // Get user's company_id for permission checking
      let userCompanyId: string | null = null
      if (req.user?.id && !isSuperAdmin) {
        try {
          const userResult = await pool.query(
            "SELECT company_id FROM users WHERE id = $1",
            [req.user.id]
          )
          userCompanyId = userResult.rows[0]?.company_id || null
        } catch (err) {
          log.warn("Failed to fetch user company_id:", err)
        }
      }

      let query = `
        SELECT 
          t.*, 
          u.name as created_by_name,
          c.name as company_name,
          CASE 
            WHEN t.validation_count = 0 THEN 0
            ELSE ROUND((t.success_count::NUMERIC / t.validation_count::NUMERIC * 100), 2)
          END as success_rate,
          CASE
            WHEN t.validation_count = 0 THEN 'Not tested yet'
            WHEN (t.success_count::NUMERIC / NULLIF(t.validation_count, 0)) >= 0.90 THEN 'Excellent'
            WHEN (t.success_count::NUMERIC / NULLIF(t.validation_count, 0)) >= 0.75 THEN 'Good'
            WHEN (t.success_count::NUMERIC / NULLIF(t.validation_count, 0)) >= 0.50 THEN 'Fair'
            ELSE 'Needs Improvement'
          END as health_rating,
          tep.avg_entity_counts,
          tep.knowledge_domain_coverage,
          tep.performance_domain_coverage,
          tep.primary_knowledge_domain,
          tep.secondary_knowledge_domains,
          tep.primary_performance_domain
        FROM templates t
        LEFT JOIN users u ON t.created_by = u.id
        LEFT JOIN companies c ON t.company_id = c.id
        LEFT JOIN template_entity_profile tep ON tep.template_id = t.id
        WHERE t.id = $1 
          AND t.deleted_at IS NULL
      `

      const params: any[] = [id]

      // Super admin can see all templates - no scope filtering
      if (!isSuperAdmin) {
        query += ` AND (
            -- Standard templates: available to everyone
            t.template_scope = 'standard'
            OR
            -- Company templates: available to users in the same company
            (t.template_scope = 'company' AND t.company_id = $2)
            OR
            -- User templates: available to the creator or if public
            (t.template_scope = 'user' AND (t.is_public = true OR t.created_by = $3))
          )`
        params.push(userCompanyId, req.user?.id)
      }

      const result = await pool.query(query, params)

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Template not found" })
      }

      const template = result.rows[0]

      // Parse JSONB fields if they're strings (PostgreSQL sometimes returns JSONB as strings)
      if (template.avg_entity_counts && typeof template.avg_entity_counts === 'string') {
        try {
          template.avg_entity_counts = JSON.parse(template.avg_entity_counts)
        } catch (e) {
          log.warn('Failed to parse avg_entity_counts:', e)
          template.avg_entity_counts = {}
        }
      }
      if (template.knowledge_domain_coverage && typeof template.knowledge_domain_coverage === 'string') {
        try {
          template.knowledge_domain_coverage = JSON.parse(template.knowledge_domain_coverage)
        } catch (e) {
          log.warn('Failed to parse knowledge_domain_coverage:', e)
          template.knowledge_domain_coverage = {}
        }
      }
      if (template.performance_domain_coverage && typeof template.performance_domain_coverage === 'string') {
        try {
          template.performance_domain_coverage = JSON.parse(template.performance_domain_coverage)
        } catch (e) {
          log.warn('Failed to parse performance_domain_coverage:', e)
          template.performance_domain_coverage = {}
        }
      }
      if (template.secondary_knowledge_domains && typeof template.secondary_knowledge_domains === 'string') {
        try {
          template.secondary_knowledge_domains = JSON.parse(template.secondary_knowledge_domains)
        } catch (e) {
          log.warn('Failed to parse secondary_knowledge_domains:', e)
          template.secondary_knowledge_domains = []
        }
      }

      // Cache the template
      await cache.set(cacheKey, template, 3600) // 1 hour

      // Track template view
      if (req.user?.id) {
        trackActivity.viewTemplate(req.user.id, id)
      }

      res.json({ template, recentUsage, versionHistory, optimizationHistory })
    } catch (error) {
      log.error("Get template error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Create template
router.post("/",
  authenticateToken,
  requirePermission("templates.create"),
  validate(schemas.createTemplate),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { name, description, framework, category, content, variables, is_public, template_scope = 'user', company_id, system_prompt, template_paragraphs } = req.body

      // Only super admins can create standard templates
      if (template_scope === 'standard' && req.user?.role !== 'super_admin') {
        return res.status(403).json({ error: "Only super administrators can create standard templates" })
      }

      // Get user's company_id if not provided and scope is 'company'
      let finalCompanyId: string | null = company_id || null
      if (template_scope === 'company') {
        if (!finalCompanyId && req.user?.id) {
          try {
            const userResult = await pool.query(
              "SELECT company_id FROM users WHERE id = $1",
              [req.user.id]
            )
            finalCompanyId = userResult.rows[0]?.company_id || null
          } catch (err) {
            log.warn("Failed to fetch user company_id:", err)
          }
        }
        if (!finalCompanyId) {
          return res.status(400).json({ error: "company_id is required for company-scoped templates" })
        }
      } else {
        // Ensure company_id is NULL for standard and user templates
        finalCompanyId = null
      }

      // Set is_read_only for standard templates
      const is_read_only = template_scope === 'standard'

      const id = uuidv4()

      const result = await pool.query(
        `
        INSERT INTO templates (id, name, description, framework, category, content, variables, is_public, template_scope, company_id, is_read_only, created_by, system_prompt, template_paragraphs)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *
      `,
        [
          id,
          name,
          description,
          framework,
          category,
          JSON.stringify(content),
          JSON.stringify(variables),
          is_public,
          template_scope,
          finalCompanyId,
          is_read_only,
          req.user?.id,
          system_prompt || null,
          template_paragraphs ? JSON.stringify(template_paragraphs) : null,
        ]
      )

      log.info(`Template created: ${name} by ${req.user?.email}`)

      // Track template creation
      if (req.user?.id) {
        trackActivity.createTemplate(
          req.user.id,
          id,
          {
            name,
            framework,
            category,
            is_public,
            variable_count: variables?.length || 0
          }
        )

        // Create initial version
        try {
          await TemplateAnalyticsService.createVersion({
            template_id: id,
            version_number: '1.0.0',
            change_type: 'created',
            change_summary: 'Initial template creation',
            created_by: req.user.id
          })
        } catch (error) {
          log.warn('Failed to create initial version:', error)
        }
      }

      res.status(201).json({
        message: "Template created successfully",
        template: result.rows[0],
      })
    } catch (error) {
      log.error("Create template error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Update template
router.put("/:id",
  authenticateToken,
  requirePermission("templates.update"),
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  validate(Joi.object({
    name: Joi.string().min(2).max(255).optional(),
    description: Joi.string().max(1000).optional(),
    framework: Joi.string().valid("TOGAF", "SABSA", "COBIT", "ITIL", "Custom", "BABOK", "BABOK v3", "PMBOK", "PMBOK 7", "DMBOK", "DMBOK 2.0").optional(),
    category: Joi.string().max(100).optional(),
    content: Joi.object().optional(),
    variables: Joi.array().optional(),
    is_public: Joi.boolean().optional(),
    system_prompt: Joi.string().max(50000).optional(), // Increased for comprehensive prompts
    quality_threshold: Joi.number().min(0).max(1).optional(),
    prompt_version: Joi.number().integer().min(1).optional(),
    template_paragraphs: Joi.array().items(Joi.object({
      section_name: Joi.string().required(),
      section_type: Joi.string().valid("header", "paragraph", "list", "table", "code_block", "summary", "conclusion").required(),
      description: Joi.string().required(),
      required: Joi.boolean().default(true),
      order: Joi.number().integer().min(1).required(),
      prompt_guidance: Joi.string().max(1000).optional(),
    })).optional(),
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params
      const { name, description, framework, category, content, variables, is_public, system_prompt, template_paragraphs, quality_threshold, prompt_version } = req.body

      // Check if template exists and user has permission
      const templateCheck = await pool.query(
        "SELECT created_by, template_scope, company_id, is_read_only FROM templates WHERE id = $1 AND deleted_at IS NULL",
        [id]
      )

      if (templateCheck.rows.length === 0) {
        return res.status(404).json({ error: "Template not found" })
      }

      const template = templateCheck.rows[0]

      // Prevent editing standard templates (read-only)
      if (template.is_read_only || template.template_scope === 'standard') {
        return res.status(403).json({ error: "Standard templates cannot be edited" })
      }

      // Super admin can edit any template (except read-only standard templates)
      const userRole = (req as any).user?.role?.toLowerCase()
      const isSuperAdmin = userRole === 'super_admin'

      // Check permissions based on scope (unless super admin)
      if (!isSuperAdmin) {
        if (template.template_scope === 'company') {
          // Get user's company_id
          let userCompanyId: string | null = null
          if (req.user?.id) {
            try {
              const userResult = await pool.query(
                "SELECT company_id FROM users WHERE id = $1",
                [req.user.id]
              )
              userCompanyId = userResult.rows[0]?.company_id || null
            } catch (err) {
              log.warn("Failed to fetch user company_id:", err)
            }
          }
          // Only users in the same company or admins can edit company templates
          if (template.company_id !== userCompanyId && req.user?.role !== "admin") {
            return res.status(403).json({ error: "Access denied: You can only edit templates from your company" })
          }
        } else if (template.template_scope === 'user') {
          // Only the creator or admins can edit user templates
          if (template.created_by !== req.user?.id && req.user?.role !== "admin") {
            return res.status(403).json({ error: "Access denied" })
          }
        }
      }

      const result = await pool.query(
        `
        UPDATE templates 
        SET name = COALESCE($1, name),
            description = COALESCE($2, description),
            framework = COALESCE($3, framework),
            category = COALESCE($4, category),
            content = COALESCE($5, content),
            variables = COALESCE($6, variables),
            is_public = COALESCE($7, is_public),
            system_prompt = COALESCE($8, system_prompt),
            template_paragraphs = COALESCE($9, template_paragraphs),
            quality_threshold = COALESCE($10, quality_threshold),
            prompt_version = COALESCE($11, prompt_version),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $12
        RETURNING *
      `,
        [
          name,
          description,
          framework,
          category,
          content ? JSON.stringify(content) : null,
          variables ? JSON.stringify(variables) : null,
          is_public,
          system_prompt || null,
          template_paragraphs ? JSON.stringify(template_paragraphs) : null,
          quality_threshold,
          prompt_version,
          id,
        ]
      )

      // Clear cache
      await cache.del(`template:${id}`)

      log.info(`Template updated: ${id} by ${req.user?.email}`)

      // Track template update
      if (req.user?.id && result.rows[0]) {
        trackActivity.updateTemplate(
          req.user.id,
          id,
          {
            name,
            framework,
            category,
            content_updated: !!content
          }
        )

        // Create new version if significant changes
        if (content || system_prompt || template_paragraphs) {
          try {
            // Get current version to increment
            const versions = await TemplateAnalyticsService.getVersionHistory(id, 1)
            const currentVersion = versions[0]?.version_number || '1.0.0'
            const [major, minor, patch] = currentVersion.split('.').map(Number)

            // Increment patch version for updates
            const newVersion = `${major}.${minor}.${patch + 1}`

            await TemplateAnalyticsService.createVersion({
              template_id: id,
              version_number: newVersion,
              change_type: 'updated',
              change_summary: 'Template updated',
              change_details: {
                content_changed: !!content,
                system_prompt_changed: !!system_prompt,
                paragraphs_changed: !!template_paragraphs
              },
              created_by: req.user.id
            })
          } catch (error) {
            log.warn('Failed to create version:', error)
          }
        }
      }

      res.json({
        message: "Template updated successfully",
        template: result.rows[0],
      })
    } catch (error) {
      log.error("Update template error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Delete template
router.delete("/:id",
  authenticateToken,
  requirePermission("templates.delete"),
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params

      // Check if template exists and user has permission
      const templateCheck = await pool.query(
        "SELECT created_by, name, template_scope, company_id, is_read_only FROM templates WHERE id = $1",
        [id]
      )

      if (templateCheck.rows.length === 0) {
        return res.status(404).json({ error: "Template not found" })
      }

      const template = templateCheck.rows[0]

      // Prevent deleting standard templates (read-only)
      if (template.is_read_only || template.template_scope === 'standard') {
        return res.status(403).json({ error: "Standard templates cannot be deleted" })
      }

      // Super admin can delete any template (except read-only standard templates)
      const userRole = (req as any).user?.role?.toLowerCase()
      const isSuperAdmin = userRole === 'super_admin'

      // Check permissions based on scope (unless super admin)
      if (!isSuperAdmin) {
        if (template.template_scope === 'company') {
          // Get user's company_id
          let userCompanyId: string | null = null
          if (req.user?.id) {
            try {
              const userResult = await pool.query(
                "SELECT company_id FROM users WHERE id = $1",
                [req.user.id]
              )
              userCompanyId = userResult.rows[0]?.company_id || null
            } catch (err) {
              log.warn("Failed to fetch user company_id:", err)
            }
          }
          // Only users in the same company or admins can delete company templates
          if (template.company_id !== userCompanyId && req.user?.role !== "admin") {
            return res.status(403).json({ error: "Access denied: You can only delete templates from your company" })
          }
        } else if (template.template_scope === 'user') {
          // Only the creator or admins can delete user templates
          if (template.created_by !== req.user?.id && req.user?.role !== "admin") {
            return res.status(403).json({ error: "Access denied" })
          }
        }
      }

      // Check if template is being used
      const usageCheck = await pool.query(
        "SELECT COUNT(*) FROM documents WHERE template_id = $1",
        [id]
      )

      const usageCount = Number.parseInt(usageCheck.rows[0].count)
      if (usageCount > 0) {
        return res.status(400).json({
          error: "Template is being used by documents and cannot be deleted",
          usage_count: usageCount,
        })
      }

      // Soft-delete: set deleted_at timestamp and who deleted it so content is preserved for some time
      await pool.query("UPDATE templates SET deleted_at = CURRENT_TIMESTAMP, deleted_by = $2 WHERE id = $1", [id, req.user?.id])

      // Clear cache
      await cache.del(`template:${id}`)

      log.info(`Template soft-deleted: ${id} by ${req.user?.email}`)

      // Track template deletion
      if (req.user?.id) {
        trackActivity.deleteTemplate(req.user.id, id)
      }

      res.json({ message: "Template deleted (soft) successfully" })
    } catch (error) {
      log.error("Delete template error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Promote template to company (company admin/admin only)
// This allows company admins/admins to promote user templates to company-wide templates
router.post("/:id/promote-to-company",
  authenticateToken,
  requireRole(["admin", "super_admin"]), // Company admins and admins can promote to company
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params

      // Get template details
      const templateCheck = await pool.query(
        `
        SELECT 
          id, name, template_scope, company_id, is_read_only, 
          created_by, framework, category
        FROM templates 
        WHERE id = $1 AND deleted_at IS NULL
      `,
        [id]
      )

      if (templateCheck.rows.length === 0) {
        return res.status(404).json({ error: "Template not found" })
      }

      const template = templateCheck.rows[0]

      // Can only promote user templates to company (not already company or standard)
      if (template.template_scope !== 'user') {
        return res.status(400).json({ error: `Can only promote user templates to company. Current scope: ${template.template_scope}` })
      }

      // Get user's company_id
      let userCompanyId: string | null = null
      if (req.user?.id) {
        try {
          const userResult = await pool.query(
            "SELECT company_id FROM users WHERE id = $1",
            [req.user.id]
          )
          userCompanyId = userResult.rows[0]?.company_id || null
        } catch (err) {
          log.warn("Failed to fetch user company_id:", err)
        }
      }

      if (!userCompanyId) {
        return res.status(400).json({ error: "You must be assigned to a company to promote templates to company scope" })
      }

      // Promote the template to company scope
      const result = await pool.query(
        `
        UPDATE templates 
        SET 
          template_scope = 'company',
          company_id = $1,
          is_read_only = false, -- Company templates can still be edited
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        RETURNING *
      `,
        [userCompanyId, id]
      )

      // Clear cache
      await cache.del(`template:${id}`)

      log.info(`Template promoted to company: ${id} (${template.name}) by ${req.user?.email} (company: ${userCompanyId})`)

      // Track template promotion
      if (req.user?.id) {
        trackActivity.updateTemplate(
          req.user.id,
          id,
          {
            name: template.name,
            framework: template.framework,
            category: template.category,
            promotion: {
              from_scope: 'user',
              to_scope: 'company',
              company_id: userCompanyId
            }
          }
        )

        // Create version entry for the promotion
        try {
          const versions = await TemplateAnalyticsService.getVersionHistory(id, 1)
          const currentVersion = versions[0]?.version_number || '1.0.0'
          const [major, minor] = currentVersion.split('.').map(Number)

          // Increment minor version for promotion (e.g., 1.0.0 -> 1.1.0)
          const newVersion = `${major}.${minor + 1}.0`

          await TemplateAnalyticsService.createVersion({
            template_id: id,
            version_number: newVersion,
            change_type: 'republished',
            change_summary: `Promoted to company template (was user-scoped)`,
            change_details: {
              promotion: true,
              from_scope: 'user',
              to_scope: 'company',
              company_id: userCompanyId,
              promoted_by: req.user.id,
              promoted_at: new Date().toISOString()
            },
            created_by: req.user.id
          })
        } catch (error) {
          log.warn('Failed to create version entry for promotion:', error)
        }
      }

      res.json({
        message: "Template promoted to company successfully",
        template: result.rows[0],
        promotion: {
          from_scope: 'user',
          to_scope: 'company',
          company_id: userCompanyId
        }
      })
    } catch (error) {
      log.error("Promote template to company error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Promote template to standard (super admin only)
// This allows super admins to promote company templates to standard (out-of-the-box) templates
router.post("/:id/promote-to-standard",
  authenticateToken,
  requireRole(["super_admin"]), // Only super admins can promote to standard
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params

      // Get template details
      const templateCheck = await pool.query(
        `
        SELECT 
          id, name, template_scope, company_id, is_read_only, 
          created_by, framework, category
        FROM templates 
        WHERE id = $1 AND deleted_at IS NULL
      `,
        [id]
      )

      if (templateCheck.rows.length === 0) {
        return res.status(404).json({ error: "Template not found" })
      }

      const template = templateCheck.rows[0]

      // Can only promote company templates to standard (not user or already standard)
      if (template.template_scope !== 'company') {
        return res.status(400).json({ error: `Can only promote company templates to standard. Current scope: ${template.template_scope}` })
      }

      // Promote the template
      const result = await pool.query(
        `
        UPDATE templates 
        SET 
          template_scope = 'standard',
          is_read_only = true,
          company_id = NULL, -- Clear company_id for standard templates
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `,
        [id]
      )

      // Clear cache
      await cache.del(`template:${id}`)

      log.info(`Template promoted to standard: ${id} (${template.name}) by ${req.user?.email}`)

      // Track template promotion
      if (req.user?.id) {
        trackActivity.updateTemplate(
          req.user.id,
          id,
          {
            name: template.name,
            framework: template.framework,
            category: template.category,
            promotion: {
              from_scope: template.template_scope,
              to_scope: 'standard',
              previous_company_id: template.company_id
            }
          }
        )

        // Create version entry for the promotion
        try {
          const versions = await TemplateAnalyticsService.getVersionHistory(id, 1)
          const currentVersion = versions[0]?.version_number || '1.0.0'
          const [major, minor] = currentVersion.split('.').map(Number)

          // Increment minor version for promotion (e.g., 1.0.0 -> 1.1.0)
          const newVersion = `${major}.${minor + 1}.0`

          await TemplateAnalyticsService.createVersion({
            template_id: id,
            version_number: newVersion,
            change_type: 'republished',
            change_summary: `Promoted to standard template (was ${template.template_scope}-scoped)`,
            change_details: {
              promotion: true,
              from_scope: template.template_scope,
              to_scope: 'standard',
              previous_company_id: template.company_id,
              promoted_by: req.user.id,
              promoted_at: new Date().toISOString()
            },
            created_by: req.user.id
          })
        } catch (error) {
          log.warn('Failed to create version entry for promotion:', error)
        }
      }

      res.json({
        message: "Template promoted to standard successfully",
        template: result.rows[0],
        promotion: {
          from_scope: template.template_scope,
          to_scope: 'standard',
          previous_company_id: template.company_id
        }
      })
    } catch (error) {
      log.error("Promote template error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Clone template
router.post("/:id/clone",
  authenticateToken,
  requirePermission("templates.create"),
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  validate(Joi.object({
    name: Joi.string().min(2).max(255).required(),
    description: Joi.string().max(1000).optional(),
    is_public: Joi.boolean().default(false),
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params
      const { name, description, is_public } = req.body

      // Get original template
      const originalResult = await pool.query(
        `
        SELECT * FROM templates 
        WHERE id = $1 AND (is_public = true OR created_by = $2) AND deleted_at IS NULL
      `,
        [id, req.user?.id]
      )

      if (originalResult.rows.length === 0) {
        return res.status(404).json({ error: "Template not found" })
      }

      const original = originalResult.rows[0]
      const newId = uuidv4()

      const result = await pool.query(
        `
        INSERT INTO templates (id, name, description, framework, category, content, variables, is_public, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `,
        [
          newId,
          name,
          description || `Clone of ${original.name}`,
          original.framework,
          original.category,
          original.content,
          original.variables,
          is_public,
          req.user?.id,
        ]
      )

      log.info(`Template cloned: ${id} -> ${newId} by ${req.user?.email}`)

      res.status(201).json({
        message: "Template cloned successfully",
        template: result.rows[0],
      })
    } catch (error) {
      log.error("Clone template error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Increment template usage
router.post("/:id/use",
  authenticateToken,
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params

      const result = await pool.query(
        `
        UPDATE templates 
        SET usage_count = usage_count + 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND (is_public = true OR created_by = $2) AND deleted_at IS NULL
        RETURNING usage_count
      `,
        [id, req.user?.id]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Template not found" })
      }

      // Clear cache to refresh usage count
      await cache.del(`template:${id}`)

      res.json({
        message: "Template usage recorded",
        usage_count: result.rows[0].usage_count,
      })
    } catch (error) {
      log.error("Record template usage error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Promote template status (lifecycle management)
router.post("/:id/promote",
  authenticateToken,
  requirePermission("templates.update"),
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params
      const { reason } = req.body

      log.info('Template promotion requested', { template_id: id, reason })

      // Check if user owns template or is admin
      const ownerCheck = await pool.query(
        "SELECT created_by FROM templates WHERE id = $1 AND deleted_at IS NULL",
        [id]
      )

      if (ownerCheck.rows.length === 0) {
        return res.status(404).json({ error: "Template not found" })
      }

      const isOwner = ownerCheck.rows[0].created_by === req.user?.id
      const isAdmin = req.user?.role === 'admin' || req.user?.role === 'super_admin'

      if (!isOwner && !isAdmin) {
        return res.status(403).json({ error: "Only template owner or admin can promote" })
      }

      // Call promotion function
      const result = await pool.query(
        'SELECT * FROM promote_template_status($1, $2, $3)',
        [id, req.user?.id, reason || null]
      )

      if (result.rows.length === 0 || !result.rows[0].success) {
        return res.status(400).json({
          success: false,
          message: result.rows[0]?.message || 'Promotion failed',
          new_status: result.rows[0]?.new_status
        })
      }

      log.info('Template promoted successfully', {
        template_id: id,
        new_status: result.rows[0].new_status,
        message: result.rows[0].message
      })

      // Clear cache
      await cache.del(`template:${id}`)

      res.json({
        success: true,
        new_status: result.rows[0].new_status,
        message: result.rows[0].message
      })

    } catch (error) {
      log.error("Promote template error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Archive template (from any stage)
router.post("/:id/archive",
  authenticateToken,
  requirePermission("templates.update"),
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params
      const { reason } = req.body

      log.info('Template archive requested', { template_id: id, reason })

      // Permission check: owner or admin
      const templateCheck = await pool.query(
        'SELECT created_by FROM templates WHERE id = $1 AND deleted_at IS NULL',
        [id]
      )

      if (templateCheck.rows.length === 0) {
        return res.status(404).json({ error: "Template not found" })
      }

      const isOwner = templateCheck.rows[0].created_by === req.user?.id
      const isAdmin = req.user?.role === 'admin' || req.user?.role === 'system_admin'

      if (!isOwner && !isAdmin) {
        return res.status(403).json({ error: "Only template owner or admin can archive" })
      }

      // Call archive function
      const result = await pool.query(
        'SELECT * FROM archive_template($1, $2, $3)',
        [id, req.user?.id, reason || 'Archived by user']
      )

      if (result.rows.length === 0 || !result.rows[0].success) {
        return res.status(400).json({
          success: false,
          message: result.rows[0]?.message || 'Archive failed'
        })
      }

      log.info('Template archived successfully', {
        template_id: id,
        old_status: result.rows[0].old_status,
        message: result.rows[0].message
      })

      // Clear cache
      await cache.del(`template:${id}`)

      res.json({
        success: true,
        old_status: result.rows[0].old_status,
        message: result.rows[0].message
      })

    } catch (error) {
      log.error("Archive template error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Approve template compliance
router.post("/:id/compliance/approve",
  authenticateToken,
  requirePermission("templates.update"),
  validateParams(Joi.object({
    id: Joi.string().uuid().required()
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params
      const { compliance_score, notes } = req.body

      log.info('Template compliance approval requested', {
        template_id: id,
        compliance_score
      })

      // Validate compliance score
      if (!compliance_score || compliance_score < 0 || compliance_score > 100) {
        return res.status(400).json({
          error: "Compliance score must be between 0 and 100"
        })
      }

      // Call compliance approval function
      const result = await pool.query(
        'SELECT * FROM approve_template_compliance($1, $2, $3, $4)',
        [id, req.user?.id, compliance_score, notes || null]
      )

      if (result.rows.length === 0 || !result.rows[0].success) {
        return res.status(400).json({
          success: false,
          message: result.rows[0]?.message || 'Compliance approval failed'
        })
      }

      log.info('Template compliance approved', {
        template_id: id,
        compliance_score,
        message: result.rows[0].message
      })

      // Clear cache
      await cache.del(`template:${id}`)

      res.json({
        success: true,
        message: result.rows[0].message
      })

    } catch (error) {
      log.error("Compliance approval error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

export default router
