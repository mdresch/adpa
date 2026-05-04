import { Request, Response } from 'express';
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { AuthRepository } from './AuthRepository';
import { childLogger } from "../../utils/logger";
import { trackActivity } from "../../middleware/analyticsMiddleware";
import { pool } from "../../database/connection";

/**
 * AuthController (Modular)
 * Handles authentication logic for modular routes.
 * Uses AuthRepository for data persistence.
 */

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
};

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
};

/** Full permission map applied when claiming bootstrap elevation (matches typical admin seed scripts). */
const BOOTSTRAP_SUPER_ADMIN_PERMISSIONS: Record<string, boolean> = {
  admin: true,
  "ai.read": true,
  "ai.generate": true,
  "ai.configure": true,
  "jobs.admin": true,
  "jobs.stats": true,
  "users.create": true,
  "users.read": true,
  "users.update": true,
  "users.delete": true,
  "projects.create": true,
  "projects.read": true,
  "projects.update": true,
  "projects.delete": true,
  "documents.create": true,
  "documents.read": true,
  "documents.update": true,
  "documents.delete": true,
  "templates.create": true,
  "templates.read": true,
  "templates.update": true,
  "templates.delete": true,
  "stakeholders.create": true,
  "stakeholders.read": true,
  "stakeholders.update": true,
  "stakeholders.delete": true,
  "integrations.create": true,
  "integrations.read": true,
  "integrations.update": true,
  "integrations.delete": true,
  "integrations.sync": true,
  "integrations.test": true,
  "integrations.manage": true,
  "security.view": true,
  "security.audit": true,
  "security.manage": true,
  "analytics.system": true,
  "settings.read": true,
  "settings.update": true,
};

const BOOTSTRAP_TOKEN_CONSUMED_KEY = "adpa_bootstrap_token_consumed";

export class AuthController {
  private static _repository: AuthRepository;
  private static get repository() {
    if (!this._repository) this._repository = new AuthRepository();
    return this._repository;
  }

  /**
   * POST /api/v1/auth/register
   * Registers a new user and optionally a company.
   */
  public static async register(req: Request, res: Response) {
    const log = childLogger({ requestId: (req as any).requestId });

    try {
      const { email, password, name, companyName } = req.body;

      // Check if user exists
      const existingUser = await AuthController.repository.findByEmail(email);
      if (existingUser.rows.length > 0) {
        return res.status(400).json({ error: "User already exists" });
      }

      // Hash password
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      const result = await AuthController.repository.withTransaction(async (client) => {
        let actualRole: 'admin' | 'user' = 'user';
        let permissions = DEFAULT_USER_PERMISSIONS;

        // Handle company creation/assignment
        let companyId: string | null = null;
        if (companyName && companyName.trim()) {
          const existingCompany = await AuthController.repository.findCompanyByName(companyName.trim(), client);

          if (existingCompany.rows.length > 0) {
            companyId = existingCompany.rows[0].id;
          } else {
            companyId = uuidv4();
            const emailDomain = email.split('@')[1] || null;
            await AuthController.repository.createCompany({
              id: companyId,
              name: companyName.trim(),
              domain: emailDomain,
              is_active: true
            }, client);
          }
        }

        // Determine role based on company user count
        if (companyId) {
          try {
            const existingCount = await AuthController.repository.getCompanyUserCount(companyId, client);
            if (existingCount === 0) {
              actualRole = 'admin';
              permissions = ADMIN_PERMISSIONS;
            }
          } catch (err) {
            log.warn('Failed to determine company user count, defaulting to user role');
          }
        }

        const metadata = companyName ? { company_name: companyName.trim() } : null;

        // Create user
        const createUserResult = await AuthController.repository.createUser({
          email,
          password_hash: passwordHash,
          name,
          role: actualRole,
          permissions: JSON.stringify(permissions),
          metadata: metadata ? JSON.stringify(metadata) : null,
          company_id: companyId
        }, client);

        if (!createUserResult.rows || createUserResult.rows.length === 0) {
          throw new Error("User creation failed");
        }

        return createUserResult;
      });

      const user = result.rows[0];
      const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET || "your-secret-key", {
        expiresIn: "24h",
      });

      res.status(201).json({
        success: true,
        token,
        user: { 
          id: user.id, 
          email: user.email, 
          name: user.name, 
          role: user.role,
          permissions: typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions
        }
      });
    } catch (error: any) {
      if (error.message === "User creation failed") {
        return res.status(500).json({ error: error.message });
      }
      log.error("Register error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * POST /api/v1/auth/login
   * Authenticates a user and returns a JWT.
   */
  public static async login(req: Request, res: Response) {
    const log = childLogger({ requestId: (req as any).requestId });
    try {
      const { email, password } = req.body;

      const result = await AuthController.repository.findByEmail(email);

      if (result.rows.length === 0) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const user = result.rows[0];
      if (user.is_active === false) {
        return res.status(401).json({ error: "Account deactivated" });
      }

      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET || "your-secret-key", {
        expiresIn: "24h",
      });

      try {
        await AuthController.repository.updateLastLogin(user.id);
      } catch (updateErr) {
        log.warn('Failed to update last_login for user (database column may not exist yet)', { userId: user.id });
      }

      if (process.env.NODE_ENV !== 'production') {
        trackActivity.login(user.id, token.substring(0, 20)).catch((err) => {
          log.warn('Failed to track login activity', { error: err.message });
        });
      }

      res.json({
        success: true,
        token,
        user: { 
          id: user.id, 
          email: user.email, 
          name: user.name, 
          role: user.role,
          permissions: typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions
        }
      });
    } catch (error) {
      log.error("Login error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * GET /api/v1/auth/me
   * Returns the current authenticated user's information.
   */
  public static async getMe(req: Request, res: Response) {
    const log = childLogger({ requestId: (req as any).requestId });
    const userId = (req as any).user?.id;
    
    try {
      if (!userId) {
        log.warn("getMe called without userId in request");
        return res.status(401).json({ error: "Unauthorized" });
      }

      const result = await AuthController.repository.findById(userId);

      if (result.rows.length === 0) {
        log.warn(`User profile not found in database for ID: ${userId}`);
        return res.status(404).json({ error: "User not found" });
      }

      const user = result.rows[0];
      
      // SAFE PERMISSION PARSING: Ensure permissions is an object
      if (typeof user.permissions === 'string') {
        try {
          user.permissions = JSON.parse(user.permissions);
        } catch (e) {
          log.error(`Failed to parse permissions string for user ${userId}:`, user.permissions);
          user.permissions = {};
        }
      }

      res.json({ success: true, user });
    } catch (error: any) {
      if (error?.code === "DB_CIRCUIT_OPEN") {
        return res.status(503).json({ error: "Service temporarily unavailable" });
      }
      log.error(`GetMe error for user ${userId}:`, {
        message: error.message,
        stack: error.stack
      });
      res.status(500).json({ 
        error: "Internal server error",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * POST /api/v1/auth/logout
   * Logs out the current user.
   */
  public static async logout(req: Request, res: Response) {
    const log = childLogger({ requestId: (req as any).requestId });
    try {
      const userId = (req as any).user?.id;
      if (userId && process.env.NODE_ENV !== 'production') {
        trackActivity.logout(userId).catch((err) => {
          log.warn('Failed to track logout activity', { error: err.message });
        });
      }
      res.json({ success: true, message: "Logged out successfully" });
    } catch (error) {
      log.error("Logout error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * POST /api/v1/auth/refresh
   * Refreshes the JWT token.
   */
  public static async refresh(req: Request, res: Response) {
    const log = childLogger({ requestId: (req as any).requestId });
    try {
      const userId = (req as any).user?.id;
      const email = (req as any).user?.email;

      const token = jwt.sign(
        { userId, email },
        process.env.JWT_SECRET || "your-secret-key",
        { expiresIn: "24h" }
      );

      res.json({ success: true, token });
    } catch (error) {
      log.error("Token refresh error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * POST /api/v1/auth/demo
   * Dev-only: creates or returns a demo admin user and issues a token.
   */
  public static async demo(req: Request, res: Response) {
    const log = childLogger({ requestId: (req as any).requestId });

    if (process.env.NODE_ENV === "production" && !process.env.ALLOW_DEMO_IN_PROD) {
      log.warn("Demo endpoint attempted in production");
      return res.status(404).json({ error: "Not found" });
    }

    try {
      const demoEmail = process.env.DEMO_EMAIL || "admin@adpa.com";
      const demoPassword = process.env.DEMO_PASSWORD || "admin123";

      const existing = await AuthController.repository.findByEmail(demoEmail);
      let user;

      if (existing.rows.length === 0) {
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(demoPassword, saltRounds);

        const client = await AuthController.repository.getClient();
        try {
          const created = await AuthController.repository.createUser({
            email: demoEmail,
            password_hash: passwordHash,
            name: "Demo Admin",
            role: "admin",
            permissions: JSON.stringify({ admin: true }),
            is_active: true
          }, client);
          user = created.rows[0];
          log.info(`Demo user created: ${demoEmail}`);
        } finally {
          client.release();
        }
      } else {
        user = existing.rows[0];
        log.info(`Demo user exists: ${demoEmail}`);
      }

      const token = jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_SECRET || "your-secret-key", {
        expiresIn: "24h",
      });

      return res.json({
        success: true,
        message: "Demo login",
        user: { 
          id: user.id, 
          email: user.email, 
          name: user.name, 
          role: user.role, 
          permissions: typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions 
        },
        token
      });
    } catch (error) {
      log.error("Demo login error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * POST /api/v1/auth/change-password
   * Changes the current user's password.
   */
  /**
   * POST /api/v1/auth/bootstrap-elevation
   * Elevates the **currently authenticated** Firebase user to `admin` or `super_admin` when:
   * 1) **Cold start**: there are no `admin` / `super_admin` users in the database (one-time org bootstrap), or
   * 2) **Recovery**: header `x-adpa-bootstrap-token` matches env `ADPA_BOOTSTRAP_TOKEN` (single use; stored in system_settings).
   */
  public static async claimBootstrapElevation(req: Request, res: Response) {
    const log = childLogger({ requestId: (req as any).requestId });
    const userId = (req as any).user?.id as string | undefined;
    const userEmail = (req as any).user?.email as string | undefined;

    if (!userId || !userEmail) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const rawRole = (req.body?.role as string | undefined)?.toLowerCase?.() || "super_admin";
    const targetRole = rawRole === "admin" ? "admin" : "super_admin";

    try {
      const selfRow = await pool.query(
        `SELECT id, email, role FROM users WHERE id = $1`,
        [userId]
      );
      if (selfRow.rows.length === 0) {
        return res.status(404).json({ error: "User record not found" });
      }

      const currentRole = String(selfRow.rows[0].role || "").toLowerCase();
      if (currentRole === "admin" || currentRole === "super_admin") {
        return res.status(400).json({
          error: "Account already has an elevated role",
          role: selfRow.rows[0].role,
        });
      }

      const privCount = await pool.query(
        `SELECT COUNT(*)::int AS c FROM users WHERE LOWER(TRIM(role::text)) IN ('admin', 'super_admin')`
      );
      const hasPrivilegedUsers = (privCount.rows[0]?.c ?? 0) > 0;

      let viaToken = false;
      if (hasPrivilegedUsers) {
        const expected = process.env.ADPA_BOOTSTRAP_TOKEN;
        if (!expected || expected.length < 16) {
          return res.status(403).json({
            error:
              "Bootstrap via token is not configured. Set a strong ADPA_BOOTSTRAP_TOKEN (16+ chars) on the server, or use DB/SQL to promote a user.",
          });
        }
        const supplied =
          (req.headers["x-adpa-bootstrap-token"] as string | undefined)?.trim() ||
          (typeof req.body?.bootstrapToken === "string" ? req.body.bootstrapToken.trim() : "");
        if (supplied !== expected) {
          log.warn("[Auth] Bootstrap elevation denied: invalid bootstrap token");
          return res.status(403).json({ error: "Invalid bootstrap token" });
        }

        const consumed = await pool.query(
          `SELECT setting_key FROM system_settings WHERE setting_key = $1 LIMIT 1`,
          [BOOTSTRAP_TOKEN_CONSUMED_KEY]
        );
        if (consumed.rows.length > 0) {
          return res.status(403).json({
            error: "Bootstrap token was already used. Rotate ADPA_BOOTSTRAP_TOKEN and clear system_settings row if you must repeat (not recommended).",
          });
        }
        viaToken = true;
      }

      const permissionsJson =
        targetRole === "super_admin"
          ? BOOTSTRAP_SUPER_ADMIN_PERMISSIONS
          : { ...BOOTSTRAP_SUPER_ADMIN_PERMISSIONS, ...ADMIN_PERMISSIONS };

      let row: any;
      if (viaToken) {
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          const updated = await client.query(
            `UPDATE users
             SET role = $1,
                 permissions = $2::jsonb,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $3
             RETURNING id, email, name, role, permissions, is_active, company_id, created_at, updated_at`,
            [targetRole, JSON.stringify(permissionsJson), userId]
          );
          row = updated.rows[0];
          if (!row) {
            await client.query("ROLLBACK");
            return res.status(500).json({ error: "Failed to update user" });
          }
          await client.query(
            `INSERT INTO system_settings (setting_key, setting_value, description, updated_by)
             VALUES ($1, $2, $3, $4)`,
            [
              BOOTSTRAP_TOKEN_CONSUMED_KEY,
              new Date().toISOString(),
              "One-time ADPA_BOOTSTRAP_TOKEN consumption (auth bootstrap-elevation)",
              userEmail,
            ]
          );
          await client.query("COMMIT");
        } catch (e) {
          try {
            await client.query("ROLLBACK");
          } catch {
            /* ignore */
          }
          throw e;
        } finally {
          client.release();
        }
      } else {
        const updated = await pool.query(
          `UPDATE users
           SET role = $1,
               permissions = $2::jsonb,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $3
           RETURNING id, email, name, role, permissions, is_active, company_id, created_at, updated_at`,
          [targetRole, JSON.stringify(permissionsJson), userId]
        );
        row = updated.rows[0];
        if (!row) {
          return res.status(500).json({ error: "Failed to update user" });
        }
      }

      log.info("[Auth] Bootstrap elevation applied", {
        userId,
        email: userEmail,
        targetRole,
        viaToken,
        coldStart: !hasPrivilegedUsers,
      });

      let perms = row.permissions;
      if (typeof perms === "string") {
        try {
          perms = JSON.parse(perms);
        } catch {
          perms = {};
        }
      }

      return res.json({
        success: true,
        message: hasPrivilegedUsers
          ? "Elevated via one-time bootstrap token. Remove ADPA_BOOTSTRAP_TOKEN from production when finished."
          : "Elevated: no administrator existed yet (cold start).",
        user: {
          id: row.id,
          email: row.email,
          name: row.name,
          role: row.role,
          permissions: perms,
        },
      });
    } catch (error: any) {
      log.error("[Auth] Bootstrap elevation error:", error);
      return res.status(500).json({
        error: "Bootstrap elevation failed",
        details: process.env.NODE_ENV === "development" ? error?.message : undefined,
      });
    }
  }

  public static async changePassword(req: Request, res: Response) {
    const log = childLogger({ requestId: (req as any).requestId });
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = (req as any).user.id;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Current password and new password are required" });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({ error: "New password must be at least 8 characters long" });
      }

      const userResult = await AuthController.repository.findById(userId);
      if (userResult.rows.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      const user = userResult.rows[0];
      const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isValidPassword) {
        log.warn(`Failed password change attempt for user ${userId}`);
        return res.status(401).json({ error: "Current password is incorrect" });
      }

      const newPasswordHash = await bcrypt.hash(newPassword, 12);
      await AuthController.repository.updatePassword(userId, newPasswordHash);

      log.info(`Password changed successfully for user ${userId}`);
      return res.json({ success: true, message: "Password changed successfully" });
    } catch (error) {
      log.error("Password change error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
}
