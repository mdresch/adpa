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
  
  if (!authHeader) {
    return res.status(401).json({ error: "Access token required" })
  }

  // Extract token from "Bearer <token>" format
  const parts = authHeader.split(" ")
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return res.status(401).json({ error: "Invalid authorization header format. Expected: Bearer <token>" })
  }

  const token = parts[1]?.trim()

  if (!token || token.length === 0) {
    return res.status(401).json({ error: "Access token is empty" })
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
