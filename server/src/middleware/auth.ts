import type { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"
import { pool } from "../database/connection"
import { logger } from "../utils/logger"
import { v4 as uuidv4 } from "uuid"

// Default permissions for new JIT-provisioned users
const DEFAULT_USER_PERMISSIONS = {
  'projects.read': true,
  'documents.read': true,
  'templates.read': true,
  'stakeholders.read': true,
};

// Dynamic import helper to prevent frontend build crashes
// We use a variable for the module name to hide it from static analysis
const getAdmin = async () => {
  const moduleName = "firebase-admin";
  return await import(moduleName);
};

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

  // DUAL-AUTH: Verify JWT first and handle token-specific errors separately
  let decoded: any
  try {
    // Attempt Firebase verification first
    try {
      const admin = await getAdmin();
      const firebaseUser = await admin.auth().verifyIdToken(token)
      // Map Firebase user to our internal format
      decoded = { 
        fromFirebase: true, 
        email: firebaseUser.email, 
        firebaseUid: firebaseUser.uid 
      }
    } catch (fbError: any) {
      // Log the specific Firebase error for diagnostics
      logger.warn("Firebase token verification failed:", {
        message: fbError.message,
        code: fbError.code,
        tokenPrefix: token.substring(0, 10)
      })
      
      // Fallback to legacy JWT if Firebase fails
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key") as any
      } catch (jwtError: any) {
        // Log both errors if they both fail
        logger.error("Token verification failed (Both Firebase and Legacy JWT failed):", {
          firebaseError: fbError.message,
          jwtError: jwtError.message,
          tokenLength: token.length
        })
        
        return res.status(401).json({ 
          error: "Invalid token", 
          details: process.env.NODE_ENV === 'production' 
            ? "Authentication failed" 
            : `Firebase: ${fbError.message} | JWT: ${jwtError.message}`
        })
      }
    }
  } catch (error: any) {
    if (error && error.name === "TokenExpiredError") {
      logger.warn("Token expired:", { expiredAt: error.expiredAt })
      return res.status(401).json({ error: "Token expired", expiredAt: error.expiredAt })
    }

    logger.error("Token verification failed (Unhandled):", error)
    return res.status(401).json({ error: "Invalid token" })
  }

  // Now perform database lookup in its own error scope
  try {
    let query: string
    let params: any[]

    if (decoded.fromFirebase) {
      // Look up by email for Firebase users
      query = "SELECT id, email, role, permissions, is_active FROM users WHERE email = $1"
      params = [decoded.email]
    } else {
      // Look up by internal userId for legacy JWTs
      query = "SELECT id, email, role, permissions, is_active FROM users WHERE id = $1"
      params = [decoded.userId]
    }

    const result = await pool.query(query, params)

    if (!result || !result.rows) {
      logger.error('Database lookup returned invalid result during authentication', { userId: decoded.userId, result })
      return res.status(503).json({ error: 'Service unavailable' })
    }

    if (result.rows.length === 0) {
      if (decoded.fromFirebase) {
        // JIT PROVISIONING: Create the user on the fly if they are verified by Firebase
        logger.info(`[Auth] JIT provisioning new Firebase user: ${decoded.email}`);
        
        const newUserId = uuidv4();
        const role = 'user';
        const permissions = DEFAULT_USER_PERMISSIONS;
        
        let user;
        try {
          const insertResult = await pool.query(
            "INSERT INTO users (id, email, role, permissions, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING *",
            [newUserId, decoded.email, role, JSON.stringify(permissions), true]
          );
          
          user = insertResult.rows[0];
          logger.info(`[Auth] JIT Provisioned new user: ${decoded.email}`);
        } catch (insertErr: any) {
          if (insertErr?.code === "DB_CIRCUIT_OPEN") {
            return res.status(503).json({ error: "Service unavailable" })
          }
          // Check for Unique Constraint Violation (Postgres code 23505)
          // This happens if a concurrent request already created the user
          if (insertErr.code === '23505') {
            logger.warn(`[Auth] JIT Race condition detected for ${decoded.email}. Fetching existing record.`);
            const retryResult = await pool.query(
              "SELECT * FROM users WHERE email = $1 OR id = $2",
              [decoded.email, newUserId]
            );
            
            user = retryResult.rows[0];
          } else {
            logger.error('[Auth] JIT Provisioning failed on non-conflict error:', insertErr);
            return res.status(500).json({ error: "Failed to provision user account" });
          }
        }
        
        // Crucial: After the catch/retry, ensure 'user' exists before assigning to req.user
        if (!user) {
          logger.error(`[Auth] User provisioning failed: record not found after insert attempt for ${decoded.email}`);
          return res.status(500).json({ error: "User provisioning failed: record not found after insert attempt." });
        }
        
        // Use the newly created or fetched user for the rest of the request
        req.user = {
          id: user.id,
          email: user.email,
          role: user.role,
          permissions: typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions,
        };
        
        return next();
      }
      
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

// Backwards-compatible aliases used across the codebase and tests
export const authMiddleware = authenticateToken
export const authenticate = authenticateToken

/**
 * Optional authentication middleware
 * Sets req.user if valid token is provided, but allows unauthenticated requests to proceed
 */
export const optionalAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
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

  // If no token provided, just continue without authentication
  if (!token || token.length === 0) {
    return next()
  }

  // Basic JWT format validation
  const jwtParts = token.split(".")
  if (jwtParts.length !== 3) {
    // Invalid format - continue without authentication
    return next()
  }

  try {
    let decoded: any
    
    // Attempt Firebase verification first
    try {
      const admin = await getAdmin();
      const firebaseUser = await admin.auth().verifyIdToken(token)
      decoded = { 
        fromFirebase: true, 
        email: firebaseUser.email, 
        firebaseUid: firebaseUser.uid 
      }
    } catch {
      // Fallback to legacy JWT
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key") as any
      } catch {
        // Token invalid - continue without authentication
        return next()
      }
    }

    // Database lookup
    let query: string
    let params: any[]

    if (decoded.fromFirebase) {
      query = "SELECT id, email, role, permissions, is_active FROM users WHERE email = $1"
      params = [decoded.email]
    } else {
      query = "SELECT id, email, role, permissions, is_active FROM users WHERE id = $1"
      params = [decoded.userId]
    }

    const result = await pool.query(query, params)

    if (result && result.rows && result.rows.length > 0) {
      const user = result.rows[0]
      if (user.is_active) {
        req.user = {
          id: user.id,
          email: user.email,
          role: user.role,
          permissions: user.permissions,
        }
      }
    }

    next()
  } catch (error) {
    // Any error - just continue without authentication
    logger.debug('Optional auth failed:', error)
    next()
  }
}
