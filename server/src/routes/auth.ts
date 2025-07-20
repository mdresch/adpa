import express from "express"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { pool } from "../database/connection"
import { logger } from "../utils/logger"
import { authenticateToken } from "../middleware/auth"

const router = express.Router()

// Register
router.post("/register", async (req, res) => {
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

    // Create user
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, name, role) 
       VALUES ($1, $2, $3, $4) 
       RETURNING id, email, name, role, created_at`,
      [email, passwordHash, name, role],
    )

    const user = result.rows[0]

    // Generate JWT
    const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET || "your-secret-key", {
      expiresIn: "24h",
    })

    logger.info(`User registered: ${email}`)

    res.status(201).json({
      message: "User created successfully",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      token,
    })
  } catch (error) {
    logger.error("Registration error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body

    // Get user
    const result = await pool.query(
      "SELECT id, email, password_hash, name, role, permissions, is_active FROM users WHERE email = $1",
      [email],
    )

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials" })
    }

    const user = result.rows[0]

    if (!user.is_active) {
      return res.status(401).json({ error: "Account deactivated" })
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash)
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid credentials" })
    }

    // Generate JWT
    const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET || "your-secret-key", {
      expiresIn: "24h",
    })

    // Update last login
    await pool.query("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1", [user.id])

    logger.info(`User logged in: ${email}`)

    res.json({
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
    logger.error("Login error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Get current user
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, email, name, role, permissions, avatar_url, created_at FROM users WHERE id = $1",
      [req.user?.id],
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" })
    }

    res.json({ user: result.rows[0] })
  } catch (error) {
    logger.error("Get user error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

// Refresh token
router.post("/refresh", authenticateToken, async (req, res) => {
  try {
    const token = jwt.sign(
      { userId: req.user?.id, email: req.user?.email },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "24h" },
    )

    res.json({ token })
  } catch (error) {
    logger.error("Token refresh error:", error)
    res.status(500).json({ error: "Internal server error" })
  }
})

export default router
