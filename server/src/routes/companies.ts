import express from "express"
import Joi from "joi"
import { pool } from "../database/connection"
import { authenticateToken, requireRole } from "../middleware/auth"
import { validate, validateParams, validateQuery, schemas } from "../middleware/validation"
import { childLogger } from "../utils/logger"
import { cache } from "../utils/redis"
import { v4 as uuidv4 } from "uuid"

const router = express.Router()

// Get all companies (admin only)
router.get("/",
  authenticateToken,
  requireRole(["admin", "super_admin"]),
  validateQuery(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    search: Joi.string().max(100).optional(),
    is_active: Joi.boolean().optional(),
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { page = 1, limit = 10, search, is_active } = req.query
      const offset = (Number(page) - 1) * Number(limit)

      // Check if user is super_admin (sees all companies) or regular admin (sees only their company)
      const userRole = (req as any).user?.role?.toLowerCase()
      const isSuperAdmin = userRole === 'super_admin'
      
      // Get user's company_id if not super_admin
      let userCompanyId: string | null = null
      if (!isSuperAdmin) {
        try {
          const userResult = await pool.query(
            'SELECT company_id FROM users WHERE id = $1',
            [(req as any).user?.id]
          )
          if (userResult.rows.length > 0) {
            userCompanyId = userResult.rows[0].company_id
          }
        } catch (err: any) {
          // If company_id column doesn't exist, log warning but continue
          if (err.message?.includes('column "company_id"') || err.code === '42703') {
            log.warn('company_id column not found on users table')
          } else {
            throw err
          }
        }
      }

      let query = `
        SELECT 
          c.id, c.name, c.domain, c.metadata, c.is_active, c.created_at, c.updated_at,
          COUNT(DISTINCT u.id) as user_count,
          COUNT(DISTINCT CASE WHEN u.is_active = true THEN u.id END) as active_user_count
        FROM companies c
        LEFT JOIN users u ON u.company_id = c.id
        WHERE 1=1
      `
      const params: any[] = []
      let paramCount = 0

      // Filter by company_id for regular admins (super_admin sees all)
      if (!isSuperAdmin && userCompanyId) {
        paramCount++
        query += ` AND c.id = $${paramCount}`
        params.push(userCompanyId)
      }

      if (is_active !== undefined) {
        paramCount++
        query += ` AND c.is_active = $${paramCount}`
        params.push(is_active)
      }

      if (search) {
        paramCount++
        query += ` AND (c.name ILIKE $${paramCount} OR c.domain ILIKE $${paramCount})`
        params.push(`%${search}%`)
      }

      query += ` GROUP BY c.id, c.name, c.domain, c.metadata, c.is_active, c.created_at, c.updated_at`
      query += ` ORDER BY c.created_at DESC`
      query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`
      params.push(limit, offset)

      const result = await pool.query(query, params)

      // Get total count
      let countQuery = "SELECT COUNT(*) FROM companies WHERE 1=1"
      const countParams: any[] = []
      let countParamCount = 0

      // Filter by company_id for regular admins (super_admin sees all)
      if (!isSuperAdmin && userCompanyId) {
        countParamCount++
        countQuery += ` AND id = $${countParamCount}`
        countParams.push(userCompanyId)
      }

      if (is_active !== undefined) {
        countParamCount++
        countQuery += ` AND is_active = $${countParamCount}`
        countParams.push(is_active)
      }

      if (search) {
        countParamCount++
        countQuery += ` AND (name ILIKE $${countParamCount} OR domain ILIKE $${countParamCount})`
        countParams.push(`%${search}%`)
      }

      const countResult = await pool.query(countQuery, countParams)
      const total = parseInt(countResult.rows[0].count)

      res.json({
        companies: result.rows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      })
    } catch (error) {
      log.error("Get companies error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Get company by ID
router.get("/:id",
  authenticateToken,
  validateParams(Joi.object({ id: schemas.uuid })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params
      const userId = req.user?.id

      // Check if user has access (admin or user in same company)
      if (req.user?.role !== "admin") {
        const userCheck = await pool.query(
          "SELECT company_id FROM users WHERE id = $1",
          [userId]
        )
        if (userCheck.rows.length === 0 || userCheck.rows[0].company_id !== id) {
          return res.status(403).json({ error: "Access denied" })
        }
      }

      const result = await pool.query(
        `SELECT 
          c.*,
          COUNT(DISTINCT u.id) as user_count,
          COUNT(DISTINCT CASE WHEN u.is_active = true THEN u.id END) as active_user_count
         FROM companies c
         LEFT JOIN users u ON u.company_id = c.id
         WHERE c.id = $1
         GROUP BY c.id`,
        [id]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Company not found" })
      }

      res.json({ company: result.rows[0] })
    } catch (error) {
      log.error("Get company error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Create company (admin only)
router.post("/",
  authenticateToken,
  requireRole(["admin", "super_admin"]),
  validate(Joi.object({
    name: Joi.string().min(2).max(255).required(),
    domain: Joi.string().max(255).optional().allow('', null),
    metadata: Joi.object().optional(),
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { name, domain, metadata } = req.body

      const id = uuidv4()

      const result = await pool.query(
        `INSERT INTO companies (id, name, domain, metadata)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name, domain, metadata, is_active, created_at, updated_at`,
        [id, name, domain || null, metadata ? JSON.stringify(metadata) : null]
      )

      log.info(`Company created: ${id} (${name}) by ${req.user?.email}`)

      res.status(201).json({
        message: "Company created successfully",
        company: result.rows[0],
      })
    } catch (error) {
      log.error("Create company error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Update company (admin only)
router.put("/:id",
  authenticateToken,
  requireRole(["admin", "super_admin"]),
  validateParams(Joi.object({ id: schemas.uuid })),
  validate(Joi.object({
    name: Joi.string().min(2).max(255).optional(),
    domain: Joi.string().max(255).optional().allow('', null),
    metadata: Joi.object().optional(),
    is_active: Joi.boolean().optional(),
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params
      const { name, domain, metadata, is_active } = req.body

      const result = await pool.query(
        `UPDATE companies 
         SET name = COALESCE($1, name),
             domain = COALESCE($2, domain),
             metadata = COALESCE($3, metadata),
             is_active = COALESCE($4, is_active),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $5
         RETURNING id, name, domain, metadata, is_active, created_at, updated_at`,
        [
          name,
          domain !== undefined ? (domain || null) : undefined,
          metadata ? JSON.stringify(metadata) : undefined,
          is_active,
          id,
        ]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Company not found" })
      }

      // Clear cache
      await cache.del(`company:${id}`)

      log.info(`Company updated: ${id} by ${req.user?.email}`)

      res.json({
        message: "Company updated successfully",
        company: result.rows[0],
      })
    } catch (error) {
      log.error("Update company error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Delete company (admin only) - Actually deactivates
router.delete("/:id",
  authenticateToken,
  requireRole(["admin", "super_admin"]),
  validateParams(Joi.object({ id: schemas.uuid })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params

      // Check if company exists
      const companyCheck = await pool.query(
        "SELECT id, name, is_active FROM companies WHERE id = $1",
        [id]
      )
      if (companyCheck.rows.length === 0) {
        return res.status(404).json({ error: "Company not found" })
      }

      const company = companyCheck.rows[0]

      // Check for active users in this company
      const usersResult = await pool.query(
        "SELECT COUNT(*) as count FROM users WHERE company_id = $1 AND is_active = true",
        [id]
      )
      const activeUsersCount = parseInt(usersResult.rows[0]?.count || '0')

      if (activeUsersCount > 0) {
        return res.status(400).json({
          error: "Cannot deactivate company",
          message: `Company has ${activeUsersCount} active user(s). Please deactivate all users first.`,
          activeUsersCount,
        })
      }

      // If already inactive, just return success
      if (!company.is_active) {
        return res.json({
          message: "Company is already deactivated",
          company: { id: company.id, name: company.name, is_active: false },
        })
      }

      // Deactivate the company
      const result = await pool.query(
        "UPDATE companies SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, name, is_active",
        [id]
      )

      // Clear cache
      await cache.del(`company:${id}`)

      log.info(`Company deactivated: ${id} (${company.name}) by ${req.user?.email}`)

      res.json({
        message: "Company deactivated successfully. All associated data has been preserved.",
        company: result.rows[0],
      })
    } catch (error: any) {
      log.error("Deactivate company error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

export default router

