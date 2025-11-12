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

// Get all users (admin only)
router.get("/", 
  authenticateToken, 
  requireRole(["admin"]),
  validateQuery(Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    role: Joi.string().valid("admin", "manager", "user", "viewer", "ccb").optional(),
    search: Joi.string().max(100).optional(),
    is_active: Joi.boolean().optional(),
  })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { page = 1, limit = 10, role, search, is_active } = req.query
      const offset = (Number(page) - 1) * Number(limit)

      let query = `
        SELECT id, email, name, role, is_active, avatar_url, last_login, created_at, updated_at
        FROM users
        WHERE 1=1
      `

      const params: any[] = []
      let paramCount = 0

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

      const result = await pool.query(query, params)

      // Get total count
      let countQuery = "SELECT COUNT(*) FROM users WHERE 1=1"
      const countParams: any[] = []
      let countParamCount = 0

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

      res.json({
        users: result.rows,
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

// Get user by ID
router.get("/:id", 
  authenticateToken,
  validateParams(Joi.object({ id: schemas.uuid })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params

      // Users can only view their own profile unless they're admin
      if (req.user?.id !== id && req.user?.role !== "admin") {
        return res.status(403).json({ error: "Access denied" })
      }

      // Check cache first
      const cacheKey = `user:${id}`
      const cached = await cache.get(cacheKey)
      if (cached) {
        return res.json({ user: cached })
      }

      const result = await pool.query(
        `
        SELECT id, email, name, role, permissions, avatar_url, is_active, last_login, created_at, updated_at
        FROM users 
        WHERE id = $1
      `,
        [id]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "User not found" })
      }

      const user = result.rows[0]

      // Cache the user data
      await cache.set(cacheKey, user, 1800) // 30 minutes

      res.json({ user })
    } catch (error) {
      log.error("Get user error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Create user (admin only)
router.post("/", 
  authenticateToken, 
  requireRole(["admin"]),
  validate(schemas.createUser),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { email, password, name, role = "user" } = req.body

      // Check if user exists
      const existingUser = await pool.query("SELECT id FROM users WHERE email = $1", [email])
      if (existingUser.rows.length > 0) {
        return res.status(400).json({ error: "User already exists" })
      }

      // Hash password
      const saltRounds = 12
      const passwordHash = await bcrypt.hash(password, saltRounds)

      const id = uuidv4()

      const result = await pool.query(
        `
        INSERT INTO users (id, email, password_hash, name, role)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, email, name, role, is_active, created_at
      `,
        [id, email, passwordHash, name, role]
      )

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
      const { email, name, role, is_active, permissions } = req.body

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

      const result = await pool.query(
        `
        UPDATE users 
        SET email = COALESCE($1, email),
            name = COALESCE($2, name),
            role = COALESCE($3, role),
            is_active = COALESCE($4, is_active),
            permissions = COALESCE($5, permissions),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $6
        RETURNING id, email, name, role, permissions, is_active, avatar_url, last_login, created_at, updated_at
      `,
        [email, name, role, is_active, permissions ? JSON.stringify(permissions) : null, id]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "User not found" })
      }

      // Clear cache
      await cache.del(`user:${id}`)

  log.info(`User updated: ${id} by ${req.user?.email}`)

      res.json({
        message: "User updated successfully",
        user: result.rows[0],
      })
    } catch (error) {
      log.error("Update user error:", error)
      res.status(500).json({ error: "Internal server error" })
    }
  }
)

// Delete user (admin only)
router.delete("/:id", 
  authenticateToken, 
  requireRole(["admin"]),
  validateParams(Joi.object({ id: schemas.uuid })),
  async (req, res) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const { id } = req.params

      // Cannot delete self
      if (req.user?.id === id) {
        return res.status(400).json({ error: "Cannot delete your own account" })
      }

      const result = await pool.query("DELETE FROM users WHERE id = $1 RETURNING email", [id])

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "User not found" })
      }

      // Clear cache
      await cache.del(`user:${id}`)

  log.info(`User deleted: ${id} by ${req.user?.email}`)

      res.json({ message: "User deleted successfully" })
    } catch (error) {
      log.error("Delete user error:", error)
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
