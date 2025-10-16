import express from "express"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
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

    // Set permissions based on role
    const permissions = role === 'admin' ? ADMIN_PERMISSIONS : DEFAULT_USER_PERMISSIONS

    // Create user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name, role, permissions) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, email, name, role, permissions, created_at`,
      [email, passwordHash, name, role, JSON.stringify(permissions)],
    )

    if (!result.rows || result.rows.length === 0) {
      log.error("User creation failed: No user returned from DB")
      return res.status(500).json({ error: "User creation failed" })
    }

    const user = result.rows[0]

    // Generate JWT
    const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET || "your-secret-key", {
      expiresIn: "24h",
    })

  log.info(`User registered: ${email}`)

    return res.status(201).json({
      message: "User created successfully",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        permissions: user.permissions,
      },
      token,
    })
  } catch (error) {
    log.error("Registration error:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
})

// Login
router.post("/login", async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId })
  log.info(`🔍 Login attempt for: ${req.body.email}`)
  try {
    const { email, password } = req.body

    // Get user
    const result = await pool.query(
      "SELECT id, email, password_hash, name, role, permissions, is_active FROM users WHERE email = $1",
      [email],
    )

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

    return res.json({
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        permissions: user.permissions,
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
    const result = await pool.query(
      "SELECT id, email, name, role, permissions, avatar_url, created_at FROM users WHERE id = $1",
      [req.user?.id?.toString()],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" })
    }

    return res.json({ user: result.rows[0] })
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

export default router
