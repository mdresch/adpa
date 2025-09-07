/**
 * Document Templates Service
 * Business logic for document template management
 */

import { pool } from '../../database/connection'
import { cache } from '../../utils/redis'
import { logger } from '../../utils/logger'
import { v4 as uuidv4 } from 'uuid'
import type {
  DocumentTemplate,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  CloneTemplateRequest,
  TemplateListQuery,
  TemplateListResponse,
  AuthenticatedUser
} from './types'

export class DocumentTemplateService {
  /**
   * Get paginated list of templates
   */
  async getTemplates(query: TemplateListQuery, user: AuthenticatedUser): Promise<TemplateListResponse> {
    const { page = 1, limit = 10, framework, category, search, is_public } = query
    const offset = (Number(page) - 1) * Number(limit)

    let sqlQuery = `
      SELECT t.*, u.name as created_by_name
      FROM templates t
      LEFT JOIN users u ON t.created_by = u.id
      WHERE (t.is_public = true OR t.created_by = $1)
        AND t.deleted_at IS NULL
    `

    const params: any[] = [user.id]
    let paramCount = 1

    if (framework) {
      paramCount++
      sqlQuery += ` AND t.framework = $${paramCount}`
      params.push(framework)
    }

    if (category) {
      paramCount++
      sqlQuery += ` AND t.category = $${paramCount}`
      params.push(category)
    }

    if (search) {
      paramCount++
      sqlQuery += ` AND (t.name ILIKE $${paramCount} OR t.description ILIKE $${paramCount})`
      params.push(`%${search}%`)
    }

    if (is_public !== undefined) {
      paramCount++
      sqlQuery += ` AND t.is_public = $${paramCount}`
      params.push(is_public)
    }

    sqlQuery += ` ORDER BY t.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`
    params.push(limit, offset)

    const result = await pool.query(sqlQuery, params)

    // Count total matching templates
    let countQuery = "SELECT COUNT(*) FROM templates t WHERE (t.is_public = true OR t.created_by = $1) AND t.deleted_at IS NULL"
    const countParams = [user.id]
    let countParamCount = 1

    if (framework) {
      countParamCount++
      countQuery += ` AND t.framework = $${countParamCount}`
      countParams.push(framework)
    }

    if (category) {
      countParamCount++
      countQuery += ` AND t.category = $${countParamCount}`
      countParams.push(category)
    }

    if (search) {
      countParamCount++
      countQuery += ` AND (t.name ILIKE $${countParamCount} OR t.description ILIKE $${countParamCount})`
      countParams.push(`%${search}%`)
    }

    if (is_public !== undefined) {
      countParamCount++
      countQuery += ` AND t.is_public = $${countParamCount}`
      countParams.push(is_public)
    }

    const countResult = await pool.query(countQuery, countParams)
    const total = Number.parseInt(countResult.rows[0].count)

    return {
      templates: result.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    }
  }

  /**
   * Get template by ID
   */
  async getTemplateById(id: string, user: AuthenticatedUser): Promise<DocumentTemplate | null> {
    // Check cache first
    const cacheKey = `template:${id}`
    const cached = await cache.get(cacheKey)
    if (cached) {
      return cached as DocumentTemplate
    }

    const result = await pool.query(
      `
      SELECT t.*, u.name as created_by_name
      FROM templates t
      LEFT JOIN users u ON t.created_by = u.id
      WHERE t.id = $1 AND (t.is_public = true OR t.created_by = $2) AND t.deleted_at IS NULL
    `,
      [id, user.id]
    )

    if (result.rows.length === 0) {
      return null
    }

    const template = result.rows[0]

    // Cache the template
    await cache.set(cacheKey, template, 3600) // 1 hour

    return template
  }

  /**
   * Create new template
   */
  async createTemplate(data: CreateTemplateRequest, user: AuthenticatedUser): Promise<DocumentTemplate> {
    const { name, description, framework, category, content, variables = [], is_public = false } = data
    const id = uuidv4()

    const result = await pool.query(
      `
      INSERT INTO templates (id, name, description, framework, category, content, variables, is_public, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
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
        user.id,
      ]
    )

    logger.info(`Template created: ${name} by ${user.email}`)

    return result.rows[0]
  }

  /**
   * Update template
   */
  async updateTemplate(id: string, data: UpdateTemplateRequest, user: AuthenticatedUser): Promise<DocumentTemplate | null> {
    const { name, description, framework, category, content, variables, is_public } = data

    // Check if template exists and user has permission
    const templateCheck = await pool.query(
      "SELECT created_by FROM templates WHERE id = $1 AND deleted_at IS NULL",
      [id]
    )

    if (templateCheck.rows.length === 0) {
      return null
    }

    const template = templateCheck.rows[0]

    if (template.created_by !== user.id && user.role !== "admin") {
      throw new Error("Access denied")
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
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
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
        id,
      ]
    )

    // Clear cache
    await cache.del(`template:${id}`)

    logger.info(`Template updated: ${id} by ${user.email}`)

    return result.rows[0]
  }

  /**
   * Delete template (soft delete)
   */
  async deleteTemplate(id: string, user: AuthenticatedUser): Promise<boolean> {
    // Check if template exists and user has permission
    const templateCheck = await pool.query(
      "SELECT created_by, name FROM templates WHERE id = $1",
      [id]
    )

    if (templateCheck.rows.length === 0) {
      return false
    }

    const template = templateCheck.rows[0]

    if (template.created_by !== user.id && user.role !== "admin") {
      throw new Error("Access denied")
    }

    // Check if template is being used
    const usageCheck = await pool.query(
      "SELECT COUNT(*) FROM documents WHERE template_id = $1",
      [id]
    )

    const usageCount = Number.parseInt(usageCheck.rows[0].count)
    if (usageCount > 0) {
      throw new Error(`Template is being used by ${usageCount} documents and cannot be deleted`)
    }

    // Soft-delete: set deleted_at timestamp and who deleted it
    await pool.query(
      "UPDATE templates SET deleted_at = CURRENT_TIMESTAMP, deleted_by = $2 WHERE id = $1",
      [id, user.id]
    )

    // Clear cache
    await cache.del(`template:${id}`)

    logger.info(`Template soft-deleted: ${id} by ${user.email}`)

    return true
  }

  /**
   * Clone template
   */
  async cloneTemplate(id: string, data: CloneTemplateRequest, user: AuthenticatedUser): Promise<DocumentTemplate | null> {
    const { name, description, is_public = false } = data

    // Get original template
    const originalResult = await pool.query(
      `
      SELECT * FROM templates 
      WHERE id = $1 AND (is_public = true OR created_by = $2) AND deleted_at IS NULL
    `,
      [id, user.id]
    )

    if (originalResult.rows.length === 0) {
      return null
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
        user.id,
      ]
    )

    logger.info(`Template cloned: ${id} -> ${newId} by ${user.email}`)

    return result.rows[0]
  }

  /**
   * Record template usage
   */
  async recordTemplateUsage(id: string, user: AuthenticatedUser): Promise<number | null> {
    const result = await pool.query(
      `
      UPDATE templates 
      SET usage_count = usage_count + 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND (is_public = true OR created_by = $2) AND deleted_at IS NULL
      RETURNING usage_count
    `,
      [id, user.id]
    )

    if (result.rows.length === 0) {
      return null
    }

    // Clear cache to refresh usage count
    await cache.del(`template:${id}`)

    return result.rows[0].usage_count
  }

  /**
   * Get deleted templates (trash)
   */
  async getDeletedTemplates(page: number = 1, limit: number = 10, user: AuthenticatedUser): Promise<TemplateListResponse> {
    const offset = (page - 1) * limit

    // If user is admin, allow viewing all deleted templates; otherwise restrict to templates deleted by the current user
    const isAdmin = user.role === "admin"

    let query = `SELECT t.*, u.name as created_by_name FROM templates t LEFT JOIN users u ON t.created_by = u.id WHERE t.deleted_at IS NOT NULL`
    const params: any[] = []

    if (!isAdmin) {
      params.push(user.id)
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
      countParams.push(user.id)
      countQuery += ` AND t.deleted_by = $${countParams.length}`
    }
    const countResult = await pool.query(countQuery, countParams)
    const total = Number.parseInt(countResult.rows[0].count)

    return {
      templates: result.rows,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
  }

  /**
   * Restore deleted template
   */
  async restoreTemplate(id: string, user: AuthenticatedUser): Promise<DocumentTemplate | null> {
    const templateCheck = await pool.query(
      "SELECT created_by FROM templates WHERE id = $1 AND deleted_at IS NOT NULL",
      [id]
    )

    if (templateCheck.rows.length === 0) {
      return null
    }

    const template = templateCheck.rows[0]
    if (template.created_by !== user.id && user.role !== "admin") {
      throw new Error("Access denied")
    }

    const result = await pool.query(
      "UPDATE templates SET deleted_at = NULL, deleted_by = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *",
      [id]
    )

    await cache.del(`template:${id}`)

    logger.info(`Template restored: ${id} by ${user.email}`)

    return result.rows[0]
  }

  /**
   * Permanently delete template
   */
  async permanentlyDeleteTemplate(id: string, user: AuthenticatedUser): Promise<boolean> {
    const templateCheck = await pool.query(
      "SELECT created_by FROM templates WHERE id = $1 AND deleted_at IS NOT NULL",
      [id]
    )

    if (templateCheck.rows.length === 0) {
      return false
    }

    const template = templateCheck.rows[0]
    if (template.created_by !== user.id && user.role !== "admin") {
      throw new Error("Access denied")
    }

    await pool.query("DELETE FROM templates WHERE id = $1", [id])
    await cache.del(`template:${id}`)

    logger.info(`Template permanently deleted: ${id} by ${user.email}`)

    return true
  }
}

export const documentTemplateService = new DocumentTemplateService()