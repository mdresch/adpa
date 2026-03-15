import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { UserRepository } from './UserRepository';
import { pool } from '../../database/connection';
import { childLogger } from '../../utils/logger';
import { cache } from '../../utils/redis';

export class UsersController {
  private repository = new UserRepository(pool);
  private logger = childLogger({ component: 'UsersController' });

  getAll = async (req: Request, res: Response) => {
    try {
      const { page = 1, limit = 10, role, search, is_active } = req.query;
      const offset = (Number(page) - 1) * Number(limit);
      const userRole = (req as any).user?.role?.toLowerCase();
      const isSuperAdmin = userRole === 'super_admin';

      let companyId = (req as any).user?.company_id;
      if (isSuperAdmin) companyId = null;

      const users = await this.repository.findAll({
        limit: Number(limit),
        offset,
        role: role as string,
        search: search as string,
        is_active: is_active === undefined ? undefined : is_active === 'true',
        company_id: companyId
      });

      const total = await this.repository.count({
        role: role as string,
        search: search as string,
        is_active: is_active === undefined ? undefined : is_active === 'true',
        company_id: companyId
      });

      res.json({
        users,
        pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) }
      });
    } catch (error) {
      this.logger.error("Get users error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const user = await this.repository.findById(id);

      if (!user) return res.status(404).json({ error: "User not found" });

      // Access control (handled by middleware usually, but controller can double check)
      const currentUser = (req as any).user;
      if (currentUser.id !== id && currentUser.role !== 'admin' && currentUser.role !== 'super_admin') {
        return res.status(403).json({ error: "Access denied" });
      }

      res.json({ user });
    } catch (error) {
      this.logger.error("Get user error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };

  create = async (req: Request, res: Response) => {
    try {
      const { email, password, name, role = "user", company_id } = req.body;
      const existing = await this.repository.findByEmail(email);
      if (existing) return res.status(400).json({ error: "User already exists" });

      const passwordHash = await bcrypt.hash(password, 12);
      const user = await this.repository.create({
        email, password_hash: passwordHash, name, role, company_id
      });

      res.status(201).json({ message: "User created successfully", user });
    } catch (error) {
      this.logger.error("Create user error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      // Sensitive fields protection
      if ((req as any).user.role !== 'admin' && (req as any).user.role !== 'super_admin') {
        delete updates.role;
        delete updates.is_active;
        delete updates.company_id;
      }

      const user = await this.repository.update(id, updates);
      if (!user) return res.status(404).json({ error: "User not found" });

      await cache.del(`user:${id}`);
      res.json({ message: "User updated successfully", user });
    } catch (error) {
      this.logger.error("Update user error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };

  getPreferences = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const user = await this.repository.findById(userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      res.json({
        preferences: {
          timezone: user.timezone || 'UTC',
          date_format: user.date_format || 'MM/DD/YYYY',
          email: user.email,
          name: user.name
        }
      });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  };

  updatePreferences = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const { timezone, date_format } = req.body;

      const user = await this.repository.update(userId, { timezone, date_format });
      await cache.del(`user:${userId}`);

      res.json({
        message: "Preferences updated successfully",
        preferences: {
          timezone: user.timezone,
          date_format: user.date_format,
          email: user.email,
          name: user.name
        }
      });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  };
}
