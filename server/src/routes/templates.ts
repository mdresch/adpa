import express from "express"
import Joi from "joi"
import { pool } from "../database/connection"
import { authenticateToken, requirePermission } from "../middleware/auth"
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
    framework: Joi.string().valid("TOGAF", "SABSA", "COBIT", "ITIL", "Custom", "BABOK", "BABOK v3", "PMBOK", "PMBOK 7", "DMBOK", "DMBOK 2.0").optional(),
    category: Joi.string().max(100).optional(),
    search: Joi.string().max(100).optional(),
    is_public: Joi.boolean().optional(),
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { page = 1, limit = 100, framework, category, search, is_public } = req.query
      const offset = (Number(page) - 1) * Number(limit)
      
      log.info(`Fetching templates: page=${page}, limit=${limit}, framework=${framework || 'all'}`)

      let query = `
        SELECT t.*, u.name as created_by_name
        FROM templates t
        LEFT JOIN users u ON t.created_by = u.id
        WHERE (t.is_public = true OR t.created_by = $1)
          AND t.deleted_at IS NULL
      `

      const params: any[] = [req.user?.id]
      let paramCount = 1

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

      query += ` ORDER BY t.usage_count DESC, t.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`
      params.push(limit, offset)

      const result = await pool.query(query, params)

      // Get total count
  let countQuery = "SELECT COUNT(*) FROM templates t WHERE (t.is_public = true OR t.created_by = $1) AND t.deleted_at IS NULL"
      const countParams = [req.user?.id]
      let countParamCount = 1

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

// Get template by ID
router.get("/:id", 
  authenticateToken,
  validateParams(Joi.object({ id: Joi.string().uuid().required() })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params

      // Check cache first
      const cacheKey = `template:${id}`
      const cached = await cache.get(cacheKey)
      if (cached) {
        return res.json({ template: cached })
      }

      const result = await pool.query(
        `
        SELECT t.*, u.name as created_by_name
        FROM templates t
        LEFT JOIN users u ON t.created_by = u.id
        WHERE t.id = $1 AND (t.is_public = true OR t.created_by = $2) AND t.deleted_at IS NULL
      `,
        [id, req.user?.id]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Template not found" })
      }

      const template = result.rows[0]

      // Cache the template
      await cache.set(cacheKey, template, 3600) // 1 hour

      // Track template view
      if (req.user?.id) {
        trackActivity.viewTemplate(req.user.id, id)
      }

      res.json({ template })
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
      const { name, description, framework, category, content, variables, is_public, system_prompt, template_paragraphs } = req.body

      const id = uuidv4()

      const result = await pool.query(
        `
        INSERT INTO templates (id, name, description, framework, category, content, variables, is_public, created_by, system_prompt, template_paragraphs)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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
    framework: Joi.string().valid("TOGAF", "SABSA", "COBIT", "ITIL", "Custom").optional(),
    category: Joi.string().max(100).optional(),
    content: Joi.object().optional(),
    variables: Joi.array().optional(),
    is_public: Joi.boolean().optional(),
    system_prompt: Joi.string().max(5000).optional(),
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
      const { name, description, framework, category, content, variables, is_public, system_prompt, template_paragraphs } = req.body

      // Check if template exists and user has permission
      const templateCheck = await pool.query(
        "SELECT created_by FROM templates WHERE id = $1 AND deleted_at IS NULL",
        [id]
      )

      if (templateCheck.rows.length === 0) {
        return res.status(404).json({ error: "Template not found" })
      }

      const template = templateCheck.rows[0]

      if (template.created_by !== req.user?.id && req.user?.role !== "admin") {
        return res.status(403).json({ error: "Access denied" })
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
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $10
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
        "SELECT created_by, name FROM templates WHERE id = $1",
        [id]
      )

      if (templateCheck.rows.length === 0) {
        return res.status(404).json({ error: "Template not found" })
      }

      const template = templateCheck.rows[0]

      if (template.created_by !== req.user?.id && req.user?.role !== "admin") {
        return res.status(403).json({ error: "Access denied" })
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

export default router

// --- Trash endpoints ---
// List soft-deleted templates (admin or owner) - optional admin-only in production
router.get(
  "/trash",
  authenticateToken,
  requirePermission("templates.view"),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const page = Number(req.query.page || 1)
      const limit = Math.min(Number(req.query.limit || 10), 100)
      const offset = (page - 1) * limit

      // If user is admin, allow viewing all deleted templates; otherwise restrict to templates deleted by the current user
      const isAdmin = req.user?.role === "admin"

      let query = `SELECT t.*, u.name as created_by_name FROM templates t LEFT JOIN users u ON t.created_by = u.id WHERE t.deleted_at IS NOT NULL`
      const params: any[] = []

      if (!isAdmin) {
        params.push(req.user?.id)
        query += ` AND t.deleted_by = $${params.length}`
      }

      // Order by deletion time desc, apply pagination
      query += ` ORDER BY t.deleted_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`
      params.push(limit, offset)

      const result = await pool.query(query, params)

      // Count total matching
      let countQuery = `SELECT COUNT(*) FROM templates t WHERE t.deleted_at IS NOT NULL`
      const countParams: any[] = []
      if (!isAdmin) {
        countParams.push(req.user?.id)
        countQuery += ` AND t.deleted_by = $${countParams.length}`
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
