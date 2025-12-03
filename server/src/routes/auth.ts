import express from "express"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { v4 as uuidv4 } from "uuid"
import { pool } from "../database/connection"
import { logger, childLogger } from "../utils/logger"

// Static module-level logger for module-load events
const staticLog = childLogger({ component: "authRoutes" })
import { authenticateToken } from "../middleware/auth"
import { trackActivity } from "../middleware/analyticsMiddleware"

// Extend Express Request type to include 'user'
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        permissions: any;
        [key: string]: any;
      };
    }
  }
}

const router = express.Router()

staticLog.info("🔧 Auth routes module loaded")

// Default permissions for new users
const DEFAULT_USER_PERMISSIONS = {
  'projects.create': true,
  'projects.read': true,
  'projects.update': true,
  'projects.delete': true,
  'documents.create': true,
  'documents.read': true,
  'documents.update': true,
  'documents.delete': true,
  'templates.create': true,
  'templates.read': true,
  'templates.update': true,
  'templates.delete': true,
  'stakeholders.create': true,
  'stakeholders.read': true,
  'stakeholders.update': true,
  'stakeholders.delete': true,
}

const ADMIN_PERMISSIONS = {
  'admin': true,
  ...DEFAULT_USER_PERMISSIONS,
  'users.create': true,
  'users.read': true,
  'users.update': true,
  'users.delete': true,
  'settings.read': true,
  'settings.update': true,
  'integrations.create': true,
  'integrations.read': true,
  'integrations.update': true,
  'integrations.delete': true,
}

// Register
router.post("/register", async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN') // Start transaction
    
    const { email, password, name, role: _requestedRole, companyName } = req.body

    // Check if user exists
    const existingUser = await client.query("SELECT id FROM users WHERE email = $1", [email])
    if (existingUser.rows.length > 0) {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: "User already exists" })
    }

    // Hash password
    const saltRounds = 12
    const passwordHash = await bcrypt.hash(password, saltRounds)

    // We ignore any client-provided role for public registration.
    // Actual role is derived from company context:
    // - First active user in a company becomes 'admin'
    // - Subsequent users for that company are regular 'user' accounts.
    let actualRole: 'admin' | 'user' = 'user'
    let permissions = DEFAULT_USER_PERMISSIONS

    // Handle company creation/assignment if companyName is provided
    let companyId: string | null = null
    if (companyName && companyName.trim()) {
      // Check if company already exists (case-insensitive)
      const existingCompany = await client.query(
        "SELECT id FROM companies WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) AND is_active = true",
        [companyName.trim()]
      )

      if (existingCompany.rows.length > 0) {
        // Use existing company
        companyId = existingCompany.rows[0].id
        log.info(`Using existing company: ${companyName} (ID: ${companyId})`)
      } else {
        // Create new company
        companyId = uuidv4()
        
        // Extract domain from email if possible
        const emailDomain = email.split('@')[1] || null
        
        await client.query(
          `INSERT INTO companies (id, name, domain, is_active, created_at, updated_at)
           VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [companyId, companyName.trim(), emailDomain, true]
        )
        log.info(`Created new company: ${companyName} (ID: ${companyId})`)
      }
    }

    // Determine role based on company user count (first user per company is admin)
    if (companyId) {
      try {
        const companyUserCountResult = await client.query(
          `SELECT COUNT(*) AS count 
           FROM users 
           WHERE company_id = $1 AND is_active = true`,
          [companyId]
        )
        const existingCount = parseInt(companyUserCountResult.rows[0]?.count || '0', 10)

        if (existingCount === 0) {
          actualRole = 'admin'
          permissions = ADMIN_PERMISSIONS
          log.info(`Assigning first user for company ${companyId} as admin`)
        } else {
          actualRole = 'user'
          permissions = DEFAULT_USER_PERMISSIONS
          log.info(`Assigning new user for existing company ${companyId} as regular user`, {
            existingCompanyUsers: existingCount
          })
        }
      } catch (err: any) {
        // If company_id column or query fails, fall back to safe default (user)
        log.warn('Failed to determine company user count during registration, defaulting to user role', {
          error: err?.message,
        })
        actualRole = 'user'
        permissions = DEFAULT_USER_PERMISSIONS
      }
    } else {
      // No company context (should be rare) – default to regular user
      actualRole = 'user'
      permissions = DEFAULT_USER_PERMISSIONS
    }

    // Build metadata object with company name if provided
    const metadata = companyName ? { company_name: companyName.trim() } : null

    // Create user - check if metadata/company_id columns exist, otherwise fall back gracefully.
    // First, try with metadata column and company_id.
    let result
    try {
      result = await client.query(
        `INSERT INTO users (email, password_hash, name, role, permissions, metadata, company_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) 
         RETURNING id, email, name, role, permissions, created_at, company_id, metadata`,
        [
          email,
          passwordHash,
          name,
          actualRole,
          JSON.stringify(permissions),
          metadata ? JSON.stringify(metadata) : null,
          companyId
        ],
      )
    } catch (err: any) {
      // If metadata or company_id column doesn't exist, try without them
      if (err.message?.includes('column "metadata"') || err.message?.includes('column "company_id"') || err.code === '42703') {
        log.warn('Metadata or company_id column not found, creating user without them')
        try {
          // Try with company_id but without metadata
          result = await client.query(
          `INSERT INTO users (email, password_hash, name, role, permissions, company_id) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             RETURNING id, email, name, role, permissions, created_at, company_id`,
            [email, passwordHash, name, actualRole, JSON.stringify(permissions), companyId],
          )
        } catch (err2: any) {
          // If company_id also doesn't exist, create without both
          if (err2.message?.includes('column "company_id"') || err2.code === '42703') {
            result = await client.query(
              `INSERT INTO users (email, password_hash, name, role, permissions) 
               VALUES ($1, $2, $3, $4, $5) 
               RETURNING id, email, name, role, permissions, created_at`,
              [email, passwordHash, name, actualRole, JSON.stringify(permissions)],
            )
          } else {
            throw err2
          }
        }
      } else {
        throw err
      }
    }

    if (!result.rows || result.rows.length === 0) {
      await client.query('ROLLBACK')
      log.error("User creation failed: No user returned from DB")
      return res.status(500).json({ error: "User creation failed" })
    }

    await client.query('COMMIT') // Commit transaction
    
    const user = result.rows[0]

    // Generate JWT
    const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET || "your-secret-key", {
      expiresIn: "24h",
    })

    log.info(`User registered: ${email}${companyId ? ` (Company: ${companyName}, ID: ${companyId})` : ''}`)

    // Normalize metadata for response
    let normalizedMetadata = {}
    if (user.metadata) {
      if (typeof user.metadata === 'string') {
        try {
          normalizedMetadata = JSON.parse(user.metadata)
        } catch (e) {
          normalizedMetadata = {}
        }
      } else if (typeof user.metadata === 'object' && user.metadata !== null) {
        normalizedMetadata = user.metadata
      }
    }

    return res.status(201).json({
      message: "User created successfully",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        permissions: user.permissions,
        company_id: user.company_id || null,
        metadata: normalizedMetadata,
      },
      token,
      company: companyId ? {
        id: companyId,
        name: companyName,
      } : null,
    })
  } catch (error: any) {
    await client.query('ROLLBACK').catch(() => {}) // Rollback on error
    log.error("Registration error:", error)
    return res.status(500).json({ 
      error: "Internal server error",
      message: error.message || "Failed to create user account"
    })
  } finally {
    client.release()
  }
})

// Login
router.post("/login", async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  log.info(`🔍 Login attempt for: ${req.body.email}`)
  try {
    const { email, password } = req.body

    // Get user - try with metadata and company_id, join with companies to get company name
    let result
    try {
      result = await pool.query(
        `SELECT 
          u.id, u.email, u.password_hash, u.name, u.role, u.permissions, u.is_active, 
          u.metadata, u.company_id,
          c.name as company_name
        FROM users u
        LEFT JOIN companies c ON u.company_id = c.id
        WHERE u.email = $1`,
        [email],
      )
    } catch (err: any) {
      // If metadata or company_id column doesn't exist, query without them
      if (err.message?.includes('column "metadata"') || err.message?.includes('column "company_id"') || err.code === '42703') {
        log.warn('Metadata or company_id column not found, querying without them')
        try {
          // Try with company_id but without metadata
          result = await pool.query(
            `SELECT 
              u.id, u.email, u.password_hash, u.name, u.role, u.permissions, u.is_active,
              u.company_id,
              c.name as company_name
            FROM users u
            LEFT JOIN companies c ON u.company_id = c.id
            WHERE u.email = $1`,
            [email],
          )
          if (result.rows.length > 0) {
            result.rows[0].metadata = null
          }
        } catch (err2: any) {
          // If company_id also doesn't exist, query without both
          if (err2.message?.includes('column "company_id"') || err2.code === '42703') {
            result = await pool.query(
              "SELECT id, email, password_hash, name, role, permissions, is_active FROM users WHERE email = $1",
              [email],
            )
            if (result.rows.length > 0) {
              result.rows[0].metadata = null
              result.rows[0].company_id = null
              result.rows[0].company_name = null
            }
          } else {
            throw err2
          }
        }
      } else {
        throw err
      }
    }

  log.info(`🔍 User query result: ${result.rows.length} rows`)

    if (result.rows.length === 0) {
  log.warn(`❌ User not found: ${email}`)
      return res.status(401).json({ error: "Invalid credentials" })
    }

    const user = result.rows[0]
  log.info(`✅ User found: ${user.email}, Active: ${user.is_active}`)

    if (!user.is_active) {
  log.warn("❌ User account deactivated")
      return res.status(401).json({ error: "Account deactivated" })
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash)
  log.info(`🔐 Password verification result: ${isValidPassword}`)

    if (!isValidPassword) {
  log.warn(`❌ Invalid password for user: ${email}`)
      return res.status(401).json({ error: "Invalid credentials" })
    }

  log.info(`✅ Login successful for: ${email}`)

    // Generate JWT
    const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET || "your-secret-key", {
      expiresIn: "24h",
    })

    // Update last login
    await pool.query("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1", [user.id])

  log.info(`User logged in: ${email}`)

    // Track login activity (skip in production until database schema is verified)
    if (process.env.NODE_ENV !== 'production') {
      trackActivity.login(user.id, token.substring(0, 20)) // Use token prefix as session ID
    }

    // Normalize metadata for response
    let normalizedMetadata = {}
    if (user.metadata) {
      if (typeof user.metadata === 'string') {
        try {
          normalizedMetadata = JSON.parse(user.metadata)
        } catch (e) {
          normalizedMetadata = {}
        }
      } else if (typeof user.metadata === 'object' && user.metadata !== null) {
        normalizedMetadata = user.metadata
      }
    }
    
    // If company_name is available from join but not in metadata, add it to metadata
    if (user.company_name && !normalizedMetadata.company_name) {
      normalizedMetadata.company_name = user.company_name
    }

    return res.json({
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        permissions: user.permissions,
        metadata: normalizedMetadata,
        company_id: user.company_id || null,
      },
      token,
    })
  } catch (error) {
    log.error("Login error:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
})

// Get current user
router.get("/me", authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    // Try to query with metadata and company_id, join with companies to get company name
    let result
    try {
      result = await pool.query(
        `SELECT 
          u.id, u.email, u.name, u.role, u.permissions, u.avatar_url, u.created_at, 
          u.metadata, u.company_id,
          c.name as company_name
        FROM users u
        LEFT JOIN companies c ON u.company_id = c.id
        WHERE u.id = $1`,
        [req.user?.id?.toString()],
      )
    } catch (err: any) {
      if (err.message?.includes('column "metadata"') || err.message?.includes('column "company_id"') || err.code === '42703') {
        log.warn('Metadata or company_id column not found, querying without them for /me')
        try {
          // Try with company_id but without metadata
          result = await pool.query(
            `SELECT 
              u.id, u.email, u.name, u.role, u.permissions, u.avatar_url, u.created_at,
              u.company_id,
              c.name as company_name
            FROM users u
            LEFT JOIN companies c ON u.company_id = c.id
            WHERE u.id = $1`,
            [req.user?.id?.toString()],
          )
          if (result.rows.length > 0) {
            result.rows[0].metadata = null
          }
        } catch (err2: any) {
          // If company_id also doesn't exist, query without both
          if (err2.message?.includes('column "company_id"') || err2.code === '42703') {
            result = await pool.query(
              "SELECT id, email, name, role, permissions, avatar_url, created_at FROM users WHERE id = $1",
              [req.user?.id?.toString()],
            )
            if (result.rows.length > 0) {
              result.rows[0].metadata = null
              result.rows[0].company_id = null
              result.rows[0].company_name = null
            }
          } else {
            throw err2
          }
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
    
    // If company_name is available from join but not in metadata, add it to metadata
    if (user.company_name && !user.metadata.company_name) {
      user.metadata.company_name = user.company_name
    }
    
    return res.json({ user })
  } catch (error) {
    log.error("Get user error:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
})

// Logout
router.post("/logout", authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    // Track logout activity (skip in production until database schema is verified)
    if (req.user?.id && process.env.NODE_ENV !== 'production') {
      trackActivity.logout(req.user.id)
    }

    res.json({ message: "Logged out successfully" })
  } catch (error) {
    log.error("Logout error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Refresh token
router.post("/refresh", authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const token = jwt.sign(
      { userId: req.user?.id, email: req.user?.email },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "24h" },
    )

    res.json({ token })
  } catch (error) {
    log.error("Token refresh error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Dev-only: create or return a demo admin user and issue a token
router.post("/demo", async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })

  if (process.env.NODE_ENV === "production") {
    log.warn("Demo endpoint attempted in production")
    return res.status(404).json({ error: "Not found" })
  }

  try {
    const demoEmail = process.env.DEMO_EMAIL || "admin@adpa.com"
    const demoPassword = process.env.DEMO_PASSWORD || "admin123"

    // Check if user exists
    const existing = await pool.query("SELECT id, email, name, role, permissions, is_active FROM users WHERE email = $1", [demoEmail])
    let user

    if (existing.rows.length === 0) {
      // Create demo admin user
      const saltRounds = 12
      const passwordHash = await bcrypt.hash(demoPassword, saltRounds)
      const created = await pool.query(
        `INSERT INTO users (email, password_hash, name, role, permissions, is_active)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, email, name, role, permissions, is_active, created_at`,
        [demoEmail, passwordHash, "Demo Admin", "admin", JSON.stringify({ admin: true }), true],
      )
      user = created.rows[0]
      log.info(`Demo user created: ${demoEmail}`)
    } else {
      user = existing.rows[0]
      log.info(`Demo user exists: ${demoEmail}`)
    }

    // Issue token
    const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET || "your-secret-key", {
      expiresIn: "24h",
    })

    return res.json({ message: "Demo login", user: { id: user.id, email: user.email, name: user.name, role: user.role, permissions: user.permissions }, token })
  } catch (error) {
    log.error("Demo login error:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
})

// Change Password (authenticated users only)
router.post("/change-password", authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  try {
    const { currentPassword, newPassword } = req.body
    const userId = (req as any).user.id  // Fixed: authenticateToken sets user.id, not user.userId

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Current password and new password are required" })
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: "New password must be at least 8 characters long" })
    }

    // Get user's current password hash
    const userResult = await pool.query(
      "SELECT password_hash FROM users WHERE id = $1",
      [userId]
    )

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" })
    }

    const user = userResult.rows[0]

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash)
    if (!isValidPassword) {
      log.warn(`Failed password change attempt for user ${userId}`)
      return res.status(401).json({ error: "Current password is incorrect" })
    }

    // Hash new password
    const saltRounds = 12
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds)

    // Update password
    await pool.query(
      "UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
      [newPasswordHash, userId]
    )

    log.info(`Password changed successfully for user ${userId}`)

    return res.json({
      message: "Password changed successfully"
    })
  } catch (error) {
    log.error("Password change error:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
})

export default router
