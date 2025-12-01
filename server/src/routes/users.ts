import express from "express"
import bcrypt from "bcryptjs"
import Joi from "joi"
import { pool } from "../database/connection"
import { authenticateToken, requireRole, requirePermission } from "../middleware/auth"
import { validate, validateParams, validateQuery, schemas } from "../middleware/validation"
import { logger, childLogger } from "../utils/logger"
import { cache } from "../utils/redis"
import { v4 as uuidv4 } from "uuid"

const router = express.Router()

// Get all users (admin/super_admin only)
router.get("/", 
  authenticateToken, 
  requireRole(["admin", "super_admin"]),
  validateQuery(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    role: Joi.string().valid("super_admin", "admin", "manager", "user", "viewer", "ccb").optional(),
    search: Joi.string().max(100).optional(),
    is_active: Joi.boolean().optional(),
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { page = 1, limit = 10, role, search, is_active } = req.query
      const offset = (Number(page) - 1) * Number(limit)

      // Get user's role and company_id for filtering
      const userRole = req.user?.role?.toLowerCase()
      const isSuperAdmin = userRole === 'super_admin'
      
      let userCompanyId: string | null = null
      if (!isSuperAdmin && req.user?.id) {
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

      // Try to query with metadata and company_id, fallback if column doesn't exist
      let query = `
        SELECT u.id, u.email, u.name, u.role, u.is_active, u.avatar_url, u.last_login, u.timezone, u.date_format, u.created_at, u.updated_at, u.metadata, u.company_id, c.name as company_name
        FROM users u
        LEFT JOIN companies c ON u.company_id = c.id
        WHERE 1=1
      `

      const params: any[] = []
      let paramCount = 0

      // Filter by company_id for regular admins (super_admin sees all)
      if (!isSuperAdmin && userCompanyId) {
        paramCount++
        query += ` AND u.company_id = $${paramCount}`
        params.push(userCompanyId)
      }

      if (role) {
        paramCount++
        query += ` AND role = $${paramCount}`
        params.push(role)
      }

      if (is_active !== undefined) {
        paramCount++
        query += ` AND is_active = $${paramCount}`
        params.push(is_active)
      }

      if (search) {
        paramCount++
        query += ` AND (name ILIKE $${paramCount} OR email ILIKE $${paramCount})`
        params.push(`%${search}%`)
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`
      params.push(limit, offset)

      let result
      try {
        result = await pool.query(query, params)
      } catch (err: any) {
        // If metadata or company_id column doesn't exist, query without them
        if (err.message?.includes('column "metadata"') || err.message?.includes('column "company_id"') || err.code === '42703') {
          log.warn('Metadata or company_id column not found, querying without them')
          
          // Rebuild query without metadata and company_id
          let fallbackQuery = `
            SELECT u.id, u.email, u.name, u.role, u.is_active, u.avatar_url, u.last_login, u.timezone, u.date_format, u.created_at, u.updated_at
            FROM users u
            WHERE 1=1
          `
          
          const fallbackParams: any[] = []
          let fallbackParamCount = 0

          // Filter by company_id for regular admins (super_admin sees all)
          if (!isSuperAdmin && userCompanyId) {
            fallbackParamCount++
            fallbackQuery += ` AND u.company_id = $${fallbackParamCount}`
            fallbackParams.push(userCompanyId)
          }

          if (role) {
            fallbackParamCount++
            fallbackQuery += ` AND u.role = $${fallbackParamCount}`
            fallbackParams.push(role)
          }

          if (is_active !== undefined) {
            fallbackParamCount++
            fallbackQuery += ` AND u.is_active = $${fallbackParamCount}`
            fallbackParams.push(is_active)
          }

          if (search) {
            fallbackParamCount++
            fallbackQuery += ` AND (u.name ILIKE $${fallbackParamCount} OR u.email ILIKE $${fallbackParamCount})`
            fallbackParams.push(`%${search}%`)
          }

          fallbackQuery += ` ORDER BY u.created_at DESC LIMIT $${fallbackParamCount + 1} OFFSET $${fallbackParamCount + 2}`
          fallbackParams.push(limit, offset)
          
          result = await pool.query(fallbackQuery, fallbackParams)
          // Add null metadata and company_id to each row
          result.rows = result.rows.map((row: any) => ({ ...row, metadata: null, company_id: null, company_name: null }))
        } else {
          throw err
        }
      }

      // Get total count (with company filter for regular admins)
      let countQuery = `
        SELECT COUNT(*) 
        FROM users u
        WHERE 1=1
      `
      const countParams: any[] = []
      let countParamCount = 0

      // Filter by company_id for regular admins (super_admin sees all)
      if (!isSuperAdmin && userCompanyId) {
        countParamCount++
        countQuery += ` AND u.company_id = $${countParamCount}`
        countParams.push(userCompanyId)
      }

      if (role) {
        countParamCount++
        countQuery += ` AND role = $${countParamCount}`
        countParams.push(role)
      }

      if (is_active !== undefined) {
        countParamCount++
        countQuery += ` AND is_active = $${countParamCount}`
        countParams.push(is_active)
      }

      if (search) {
        countParamCount++
        countQuery += ` AND (name ILIKE $${countParamCount} OR email ILIKE $${countParamCount})`
        countParams.push(`%${search}%`)
      }

      const countResult = await pool.query(countQuery, countParams)
      const total = Number.parseInt(countResult.rows[0].count)

      // Normalize metadata - ensure it's always an object (not string) for consistent frontend handling
      const normalizedUsers = result.rows.map((row: any) => {
        if (row.metadata) {
          // If metadata is a string, parse it; if it's already an object, use it as-is
          if (typeof row.metadata === 'string') {
            try {
              row.metadata = JSON.parse(row.metadata)
            } catch (e) {
              // If parsing fails, set to empty object
              log.warn(`Failed to parse metadata string for user ${row.id}:`, e)
              row.metadata = {}
            }
          }
          // If it's already an object, keep it as-is (PostgreSQL JSONB returns as object)
        } else {
          // If metadata is null or undefined, set to empty object
          row.metadata = {}
        }
        
        return row
      })

      res.json({
        users: normalizedUsers,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      })
    } catch (error) {
      log.error("Get users error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Get current user's preferences (timezone, etc.)
// IMPORTANT: This must be before /:id route to avoid route conflict
router.get("/me/preferences",
  authenticateToken,
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" })
      }

      const result = await pool.query(
        `SELECT id, email, name, timezone, date_format, created_at, updated_at
         FROM users 
         WHERE id = $1`,
        [userId]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "User not found" })
      }

      const user = result.rows[0]
      res.json({
        preferences: {
          timezone: user.timezone || 'UTC',
          date_format: user.date_format || 'MM/DD/YYYY',
          email: user.email,
          name: user.name
        }
      })
    } catch (error) {
      log.error("Get preferences error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Update current user's preferences (timezone, etc.)
// IMPORTANT: This must be before /:id route to avoid route conflict
router.put("/me/preferences",
  authenticateToken,
  validate(Joi.object({
    timezone: Joi.string().max(50).optional()
      .pattern(/^[A-Za-z_]+\/[A-Za-z_]+$|^UTC$/)
      .messages({
        'string.pattern.base': 'Timezone must be a valid IANA timezone (e.g., America/New_York, Europe/Amsterdam) or UTC'
      }),
    date_format: Joi.string().valid('MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD').optional()
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const userId = req.user?.id
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" })
      }

      const { timezone, date_format } = req.body

      // Build update query dynamically
      const updates: string[] = []
      const params: any[] = []
      let paramCount = 0

      if (timezone !== undefined) {
        paramCount++
        updates.push(`timezone = $${paramCount}`)
        params.push(timezone || 'UTC')
      }

      if (date_format !== undefined) {
        paramCount++
        updates.push(`date_format = $${paramCount}`)
        params.push(date_format || 'MM/DD/YYYY')
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: "No preferences to update" })
      }

      // Always update updated_at
      updates.push(`updated_at = NOW()`)
      
      // Add WHERE clause separately
      paramCount++
      params.push(userId)

      const query = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING id, email, name, timezone, date_format, updated_at`
      
      const result = await pool.query(query, params)

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "User not found" })
      }

      // Invalidate cache
      await cache.del(`user:${userId}`)

      log.info(`Preferences updated for user: ${userId} by ${req.user?.email}`)

      res.json({
        message: "Preferences updated successfully",
        preferences: {
          timezone: result.rows[0].timezone || 'UTC',
          date_format: result.rows[0].date_format || 'MM/DD/YYYY',
          email: result.rows[0].email,
          name: result.rows[0].name
        }
      })
    } catch (error) {
      log.error("Update preferences error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Get user by ID
router.get("/:id", 
  authenticateToken,
  validateParams(Joi.object({ id: schemas.uuid })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params

      // Get user's role and company_id for access control
      const userRole = req.user?.role?.toLowerCase()
      const isSuperAdmin = userRole === 'super_admin'
      const isAdmin = userRole === 'admin'
      
      // Users can view their own profile, admins can view users in their company, super_admin can view all
      if (req.user?.id !== id) {
        if (!isAdmin && !isSuperAdmin) {
          return res.status(403).json({ error: "Access denied" })
        }
        
        // For regular admins, check if the user belongs to their company
        if (isAdmin && !isSuperAdmin) {
          let userCompanyId: string | null = null
          let targetUserCompanyId: string | null = null
          
          try {
            const adminResult = await pool.query("SELECT company_id FROM users WHERE id = $1", [req.user.id])
            userCompanyId = adminResult.rows[0]?.company_id || null
            
            const targetResult = await pool.query("SELECT company_id FROM users WHERE id = $1", [id])
            targetUserCompanyId = targetResult.rows[0]?.company_id || null
          } catch (err) {
            log.warn("Failed to fetch company_id for access check:", err)
          }
          
          // Regular admin can only view users from their own company
          if (userCompanyId !== targetUserCompanyId) {
            return res.status(403).json({ error: "Access denied: You can only view users from your company" })
          }
        }
      }

      // Check cache first
      const cacheKey = `user:${id}`
      const cached = await cache.get(cacheKey)
      if (cached) {
        return res.json({ user: cached })
      }

      // Try to query with metadata and company_id, fallback if column doesn't exist
      let result
      try {
        result = await pool.query(
          `
          SELECT u.id, u.email, u.name, u.role, u.permissions, u.avatar_url, u.is_active, u.last_login, u.timezone, u.date_format, u.created_at, u.updated_at, u.metadata, u.company_id, c.name as company_name
          FROM users u
          LEFT JOIN companies c ON u.company_id = c.id
          WHERE u.id = $1
        `,
          [id]
        )
      } catch (err: any) {
        // If metadata or company_id column doesn't exist, query without them
        if (err.message?.includes('column "metadata"') || err.message?.includes('column "company_id"') || err.code === '42703') {
          log.warn('Metadata or company_id column not found, querying without them')
          result = await pool.query(
            `
            SELECT id, email, name, role, permissions, avatar_url, is_active, last_login, timezone, date_format, created_at, updated_at
            FROM users 
            WHERE id = $1
          `,
            [id]
          )
          // Add null metadata and company_id to result
          if (result.rows.length > 0) {
            result.rows[0].metadata = null
            result.rows[0].company_id = null
            result.rows[0].company_name = null
          }
        } else {
          throw err
        }
      }

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "User not found" })
      }

      const user = result.rows[0]

      // Normalize metadata - ensure it's always an object (not string) for consistent frontend handling
      if (user.metadata) {
        if (typeof user.metadata === 'string') {
          try {
            user.metadata = JSON.parse(user.metadata)
          } catch (e) {
            user.metadata = {}
          }
        }
      } else {
        user.metadata = {}
      }

      // Cache the user data
      await cache.set(cacheKey, user, 1800) // 30 minutes

      res.json({ user })
    } catch (error) {
      log.error("Get user error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Create user (admin/super_admin only)
router.post("/", 
  authenticateToken, 
  requireRole(["admin", "super_admin"]),
  validate(schemas.createUser),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { email, password, name, role = "user", companyName, company_id } = req.body

      // Get user's role and company_id
      const userRole = req.user?.role?.toLowerCase()
      const isSuperAdmin = userRole === 'super_admin'
      const isAdmin = userRole === 'admin'
      
      // Get admin's company_id (regular admins must assign users to their company)
      let adminCompanyId: string | null = null
      if (isAdmin && !isSuperAdmin && req.user?.id) {
        try {
          const adminResult = await pool.query("SELECT company_id FROM users WHERE id = $1", [req.user.id])
          adminCompanyId = adminResult.rows[0]?.company_id || null
          if (!adminCompanyId) {
            return res.status(400).json({ error: "You must be assigned to a company to create users" })
          }
        } catch (err) {
          log.warn("Failed to fetch admin company_id:", err)
        }
      }

      // Check if user exists
      const existingUser = await pool.query("SELECT id FROM users WHERE email = $1", [email])
      if (existingUser.rows.length > 0) {
        return res.status(400).json({ error: "User already exists" })
      }

      // Hash password
      const saltRounds = 12
      const passwordHash = await bcrypt.hash(password, saltRounds)

      const id = uuidv4()

      // Determine company_id for new user
      // Super admin can assign to any company (or none), regular admin assigns to their company
      let finalCompanyId: string | null = company_id || null
      if (isAdmin && !isSuperAdmin) {
        // Regular admin must assign to their own company
        finalCompanyId = adminCompanyId
      }

      // Handle company name in metadata
      let metadataValue = null
      if (companyName && companyName.trim()) {
        metadataValue = JSON.stringify({ company_name: companyName.trim() })
      }

      let result
      try {
        // Try with metadata and company_id
        if (metadataValue || finalCompanyId) {
          result = await pool.query(
            `
            INSERT INTO users (id, email, password_hash, name, role, metadata, company_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, email, name, role, is_active, created_at, metadata, company_id
          `,
            [id, email, passwordHash, name, role, metadataValue, finalCompanyId]
          )
        } else {
          result = await pool.query(
            `
            INSERT INTO users (id, email, password_hash, name, role)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, email, name, role, is_active, created_at
          `,
            [id, email, passwordHash, name, role]
          )
          // Add metadata and company_id as null if columns don't exist
          if (result.rows.length > 0) {
            result.rows[0].metadata = null
            result.rows[0].company_id = null
          }
        }
      } catch (err: any) {
        if (err.message?.includes('column "metadata"') || err.code === '42703') {
          log.warn('Metadata column not found, creating user without metadata')
          result = await pool.query(
            `
            INSERT INTO users (id, email, password_hash, name, role)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, email, name, role, is_active, created_at
          `,
            [id, email, passwordHash, name, role]
          )
          if (result.rows.length > 0) {
            result.rows[0].metadata = null
          }
        } else {
          throw err
        }
      }

  log.info(`User created: ${email} with role ${role} by ${req.user?.email}`)

      res.status(201).json({
        message: "User created successfully",
        user: result.rows[0],
      })
    } catch (error) {
      log.error("Create user error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Update user
router.put("/:id", 
  authenticateToken,
  validateParams(Joi.object({ id: schemas.uuid })),
  validate(schemas.updateUser),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params
      const { email, name, role, is_active, permissions, companyName, company_id } = req.body

      // Users can only update their own profile unless they're admin
      if (req.user?.id !== id && req.user?.role !== "admin") {
        return res.status(403).json({ error: "Access denied" })
      }

      // Non-admin users cannot change role or is_active
      if (req.user?.role !== "admin" && (role || is_active !== undefined)) {
        return res.status(403).json({ error: "Insufficient permissions to modify role or status" })
      }

      // Prevent admins from changing their own role (to avoid locking themselves out)
      if (req.user?.id === id && req.user?.role === "admin" && role && role !== "admin") {
        return res.status(400).json({ 
          error: "Cannot change your own role from admin",
          message: "Admins cannot change their own role. Please have another admin make this change, or create a separate user account for CCB access."
        })
      }

      // Prevent admins from deactivating themselves
      if (req.user?.id === id && req.user?.role === "admin" && is_active === false) {
        return res.status(400).json({ 
          error: "Cannot deactivate your own account",
          message: "Admins cannot deactivate their own account. Please have another admin make this change."
        })
      }

      // Check if email is already taken by another user
      if (email) {
        const existingUser = await pool.query("SELECT id FROM users WHERE email = $1 AND id != $2", [email, id])
        if (existingUser.rows.length > 0) {
          return res.status(400).json({ error: "Email already taken" })
        }
      }

      // Handle company name in metadata
      let metadataUpdate: string | null = null
      if (companyName !== undefined) {
        // Get current metadata if it exists - try with metadata, fallback if column doesn't exist
        let currentUserResult
        try {
          currentUserResult = await pool.query("SELECT metadata FROM users WHERE id = $1", [id])
        } catch (err: any) {
          // If metadata column doesn't exist, set empty metadata
          if (err.message?.includes('column "metadata"') || err.code === '42703') {
            log.warn('Metadata column not found, using empty metadata')
            currentUserResult = { rows: [{ metadata: null }] }
          } else {
            throw err
          }
        }
        const rawCurrentMetadata = currentUserResult.rows[0]?.metadata
        const currentMetadata = rawCurrentMetadata || {}
        
        // Parse if it's a string
        let parsedMetadata: any
        if (typeof currentMetadata === 'string') {
          try {
            parsedMetadata = JSON.parse(currentMetadata)
          } catch (e) {
            log.warn(`Failed to parse metadata string for user ${id}:`, e)
            parsedMetadata = {}
          }
        } else if (typeof currentMetadata === 'object' && currentMetadata !== null) {
          // Already an object (PostgreSQL JSONB returns as object)
          parsedMetadata = { ...currentMetadata } // Create a copy to avoid mutating
        } else {
          parsedMetadata = {}
        }
        
        // Update company_name in metadata
        if (companyName && companyName.trim()) {
          parsedMetadata = { ...parsedMetadata, company_name: companyName.trim() }
        } else {
          // Remove company_name if empty (user wants to clear it)
          delete parsedMetadata.company_name
        }
        
        // Always update metadata if companyName was provided (even if empty object, to ensure update happens)
        metadataUpdate = JSON.stringify(parsedMetadata)
      }

      // Build update query - try with metadata first, fallback if column doesn't exist
      let result
      try {
        if (metadataUpdate !== null && metadataUpdate !== undefined) {
          // Always update metadata when companyName is provided (even if empty object "{}")
          // Validate JSON before sending to DB
          try {
            JSON.parse(metadataUpdate)
          } catch (e) {
            log.error(`Invalid JSON in metadataUpdate for user ${id}:`, metadataUpdate, e)
            throw new Error(`Invalid metadata JSON: ${metadataUpdate}`)
          }
          
          // Validate company_id if provided
          if (company_id !== undefined && company_id !== null && company_id !== '') {
            const companyCheck = await pool.query("SELECT id FROM companies WHERE id = $1", [company_id])
            if (companyCheck.rows.length === 0) {
              return res.status(400).json({ error: "Invalid company_id: Company not found" })
            }
          }

          result = await pool.query(
            `
            UPDATE users 
            SET email = COALESCE($1, email),
                name = COALESCE($2, name),
                role = COALESCE($3, role),
                is_active = COALESCE($4, is_active),
                permissions = COALESCE($5, permissions),
                metadata = $6::jsonb,
                company_id = COALESCE($7, company_id),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $8
            RETURNING id, email, name, role, permissions, is_active, avatar_url, last_login, created_at, updated_at, metadata, company_id
          `,
            [email, name, role, is_active, permissions ? JSON.stringify(permissions) : null, metadataUpdate, company_id || null, id]
          )
        } else {
          // Validate company_id if provided
          if (company_id !== undefined && company_id !== null && company_id !== '') {
            const companyCheck = await pool.query("SELECT id FROM companies WHERE id = $1", [company_id])
            if (companyCheck.rows.length === 0) {
              return res.status(400).json({ error: "Invalid company_id: Company not found" })
            }
          }

          result = await pool.query(
            `
            UPDATE users 
            SET email = COALESCE($1, email),
                name = COALESCE($2, name),
                role = COALESCE($3, role),
                is_active = COALESCE($4, is_active),
                permissions = COALESCE($5, permissions),
                company_id = COALESCE($6, company_id),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $7
            RETURNING id, email, name, role, permissions, is_active, avatar_url, last_login, created_at, updated_at, metadata, company_id
          `,
            [email, name, role, is_active, permissions ? JSON.stringify(permissions) : null, company_id || null, id]
          )
        }
      } catch (err: any) {
        // If metadata column doesn't exist, try without it
        if (err.message?.includes('column "metadata"') || err.code === '42703') {
          log.warn('Metadata column not found, updating user without metadata')
          // Try to update without metadata column in both SET and RETURNING
          try {
            // Validate company_id if provided
            if (company_id !== undefined && company_id !== null && company_id !== '') {
              const companyCheck = await pool.query("SELECT id FROM companies WHERE id = $1", [company_id])
              if (companyCheck.rows.length === 0) {
                return res.status(400).json({ error: "Invalid company_id: Company not found" })
              }
            }

            if (metadataUpdate !== null) {
              // If we were trying to update metadata, skip it
              result = await pool.query(
                `
                UPDATE users 
                SET email = COALESCE($1, email),
                    name = COALESCE($2, name),
                    role = COALESCE($3, role),
                    is_active = COALESCE($4, is_active),
                    permissions = COALESCE($5, permissions),
                    company_id = COALESCE($6, company_id),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $7
                RETURNING id, email, name, role, permissions, is_active, avatar_url, last_login, created_at, updated_at, company_id
              `,
                [email, name, role, is_active, permissions ? JSON.stringify(permissions) : null, company_id || null, id]
              )
            } else {
              result = await pool.query(
                `
                UPDATE users 
                SET email = COALESCE($1, email),
                    name = COALESCE($2, name),
                    role = COALESCE($3, role),
                    is_active = COALESCE($4, is_active),
                    permissions = COALESCE($5, permissions),
                    company_id = COALESCE($6, company_id),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $7
                RETURNING id, email, name, role, permissions, is_active, avatar_url, last_login, created_at, updated_at, company_id
              `,
                [email, name, role, is_active, permissions ? JSON.stringify(permissions) : null, company_id || null, id]
              )
            }
            // Add null metadata to result rows
            if (result.rows.length > 0) {
              result.rows.forEach((row: any) => {
                row.metadata = null
              })
            }
          } catch (fallbackErr: any) {
            log.error('Fallback update also failed:', fallbackErr)
            throw fallbackErr
          }
        } else {
          throw err
        }
      }

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "User not found" })
      }

      // Clear cache
      await cache.del(`user:${id}`)

      // Normalize metadata in response - ensure it's always an object
      const updatedUser = result.rows[0]
      const rawMetadata = updatedUser.metadata
      
      if (rawMetadata !== null && rawMetadata !== undefined) {
        if (typeof rawMetadata === 'string') {
          try {
            updatedUser.metadata = JSON.parse(rawMetadata)
          } catch (e) {
            log.warn(`Failed to parse metadata string for user ${id}:`, e)
            updatedUser.metadata = {}
          }
        } else if (typeof rawMetadata === 'object') {
          // Already an object (PostgreSQL JSONB returns as object)
          updatedUser.metadata = rawMetadata
        } else {
          // Unexpected type, set to empty object
          log.warn(`Unexpected metadata type for user ${id}:`, typeof rawMetadata)
          updatedUser.metadata = {}
        }
      } else {
        // Only set to empty object if metadata is null/undefined
        updatedUser.metadata = {}
      }

      log.info(`User updated: ${id} by ${req.user?.email}`)

      res.json({
        message: "User updated successfully",
        user: updatedUser,
      })
    } catch (error) {
      log.error("Update user error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Delete user (admin/super_admin only) - Actually deactivates the user instead of deleting
// This preserves data integrity and historical records
// Also handles company/tenant relationships
router.delete("/:id", 
  authenticateToken, 
  requireRole(["admin", "super_admin"]),
  validateParams(Joi.object({ id: schemas.uuid })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params

      // Cannot delete/deactivate self
      if (req.user?.id === id) {
        return res.status(400).json({ error: "Cannot deactivate your own account" })
      }

      // Check if user exists and get company/tenant info
      const userCheck = await pool.query(
        `SELECT id, email, name, is_active, company_id, tenant_id 
         FROM users WHERE id = $1`,
        [id]
      )
      if (userCheck.rows.length === 0) {
        return res.status(404).json({ error: "User not found" })
      }

      const user = userCheck.rows[0]

      // If already inactive, just return success
      if (!user.is_active) {
        return res.json({ 
          message: "User is already deactivated",
          user: { id: user.id, email: user.email, is_active: false }
        })
      }

      // Check if this is the last active user in the company/tenant
      let companyInfo = null
      let otherActiveUsersCount = 0
      
      if (user.company_id) {
        // Check how many other active users exist in this company
        const otherUsersResult = await pool.query(
          `SELECT COUNT(*) as count FROM users 
           WHERE company_id = $1 AND id != $2 AND is_active = true`,
          [user.company_id, id]
        )
        otherActiveUsersCount = parseInt(otherUsersResult.rows[0]?.count || '0')

        // Get company info
        const companyResult = await pool.query(
          "SELECT id, name, is_active FROM companies WHERE id = $1",
          [user.company_id]
        )
        if (companyResult.rows.length > 0) {
          companyInfo = companyResult.rows[0]
        }
      }

      // Deactivate the user instead of deleting
      const result = await pool.query(
        "UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id, email, name, is_active, company_id, tenant_id",
        [id]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "User not found" })
      }

      // If this was the last active user in the company, optionally deactivate the company too
      // (This is optional - you may want to keep the company active for historical data)
      let companyDeactivated = false
      if (companyInfo && otherActiveUsersCount === 0 && companyInfo.is_active) {
        // Option: Deactivate company if no active users remain
        // Uncomment the following lines if you want to auto-deactivate companies:
        /*
        await pool.query(
          "UPDATE companies SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1",
          [user.company_id]
        )
        companyDeactivated = true
        log.info(`Company deactivated: ${user.company_id} (${companyInfo.name}) - no active users remaining`)
        */
      }

      // Clear cache
      await cache.del(`user:${id}`)
      if (user.company_id) {
        await cache.del(`company:${user.company_id}`)
      }

      log.info(`User deactivated: ${id} (${user.email}) by ${req.user?.email}${companyInfo ? ` - Company: ${companyInfo.name}` : ''}`)

      const response: any = {
        message: "User deactivated successfully. The user account and all associated data have been preserved but the user can no longer log in.",
        user: result.rows[0]
      }

      if (companyInfo) {
        response.company = {
          id: companyInfo.id,
          name: companyInfo.name,
          remainingActiveUsers: otherActiveUsersCount,
          deactivated: companyDeactivated
        }
        
        if (otherActiveUsersCount === 0) {
          response.warning = "This was the last active user in the company. Consider deactivating the company if no longer needed."
        }
      }

      res.json(response)
    } catch (error: any) {
      log.error("Deactivate user error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Update user password
router.put("/:id/password", 
  authenticateToken,
  validateParams(Joi.object({ id: schemas.uuid })),
  validate(Joi.object({
    current_password: Joi.string().required(),
    new_password: schemas.password,
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params
      const { current_password, new_password } = req.body

      // Users can only change their own password unless they're admin
      if (req.user?.id !== id && req.user?.role !== "admin") {
        return res.status(403).json({ error: "Access denied" })
      }

      // Get current password hash
      const userResult = await pool.query("SELECT password_hash FROM users WHERE id = $1", [id])
      
      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: "User not found" })
      }

      // Verify current password (skip for admin changing other user's password)
      if (req.user?.id === id) {
        const isValidPassword = await bcrypt.compare(current_password, userResult.rows[0].password_hash)
        if (!isValidPassword) {
          return res.status(400).json({ error: "Current password is incorrect" })
        }
      }

      // Hash new password
      const saltRounds = 12
      const newPasswordHash = await bcrypt.hash(new_password, saltRounds)

      await pool.query(
        "UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
        [newPasswordHash, id]
      )

  log.info(`Password updated for user: ${id} by ${req.user?.email}`)

      res.json({ message: "Password updated successfully" })
    } catch (error) {
      log.error("Update password error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

export default router
