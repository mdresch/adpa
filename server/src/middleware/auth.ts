import type { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"
import { pool } from "../database/connection"
import { logger } from "../utils/logger"

interface AuthRequest extends Request {
  user?: {
    id: string
    email: string
    role: string
    permissions: any
  }
}

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers["authorization"]
  const token = authHeader && authHeader.split(" ")[1]

  if (!token) {
    return res.status(401).json({ error: "Access token required" })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key") as any

    // Get user from database
    const result = await pool.query("SELECT id, email, role, permissions, is_active FROM users WHERE id = $1", [
      decoded.userId,
    ])

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "User not found" })
    }

    const user = result.rows[0]

    if (!user.is_active) {
      return res.status(401).json({ error: "Account deactivated" })
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
    }

    // Update last login
    await pool.query("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1", [user.id])

    next()
  } catch (error) {
    logger.error("Token verification failed:", error)
    return res.status(403).json({ error: "Invalid token" })
  }
}

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" })
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" })
    }

    next()
  }
}

export const requirePermission = (permission: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" })
    }

    // Admins have all permissions
    if (req.user.role === 'admin') {
      return next()
    }

    const userPermissions = req.user.permissions || {}
    if (!userPermissions[permission]) {
      return res.status(403).json({ error: `Permission '${permission}' required` })
    }

    next()
  }
}

// Backwards-compatible alias used across the codebase and tests
export const authMiddleware = authenticateToken
