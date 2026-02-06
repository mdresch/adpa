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

  let token: string | undefined

  // Check header first
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1]?.trim()
  }

  // Fallback to query param (useful for downloads/WebSockets)
  if (!token && req.query && typeof req.query.token === 'string') {
    token = req.query.token
  }

  if (!token || token.length === 0) {
    return res.status(401).json({ error: "Access token required" })
  }

  // Basic JWT format validation (should have 3 parts separated by dots)
  const jwtParts = token.split(".")
  if (jwtParts.length !== 3) {
    logger.warn("Malformed JWT token received", {
      tokenLength: token.length,
      partsCount: jwtParts.length,
      hasToken: !!token
    })
    return res.status(401).json({ error: "Invalid token format" })
  }

  // Verify JWT first and handle token-specific errors separately
  let decoded: any
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key") as any
  } catch (error: any) {
    if (error && error.name === "TokenExpiredError") {
      logger.warn("Token expired:", { expiredAt: error.expiredAt })
      return res.status(401).json({ error: "Token expired", expiredAt: error.expiredAt })
    }

    logger.error("Token verification failed:", error)
    return res.status(401).json({ error: "Invalid token" })
  }

  // Now perform database lookup in its own error scope so DB failures don't surface as token errors
  try {
    const result = await pool.query("SELECT id, email, role, permissions, is_active FROM users WHERE id = $1", [
      decoded.userId,
    ])

    if (!result || !result.rows) {
      logger.error('Database lookup returned invalid result during authentication', { userId: decoded.userId, result })
      return res.status(503).json({ error: 'Service unavailable' })
    }

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

    // Update last login (best-effort; log but don't fail auth if update errors)
    try {
      await pool.query("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1", [user.id])
    } catch (updateErr) {
      logger.warn('Failed to update last_login for user during authentication', { userId: user.id, error: updateErr })
    }

    next()
  } catch (dbError) {
    logger.error('Database error during authentication:', dbError)
    return res.status(503).json({ error: 'Service unavailable' })
  }
}

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" })
    }

    // Case-insensitive role comparison
    const userRole = req.user.role?.toLowerCase()
    const normalizedRoles = roles.map(r => r.toLowerCase())

    if (!userRole || !normalizedRoles.includes(userRole)) {
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

    // Super admins and admins have all permissions (case-insensitive comparison)
    const userRole = req.user.role?.toLowerCase()
    if (userRole === 'super_admin' || userRole === 'admin') {
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
