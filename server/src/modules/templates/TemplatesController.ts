import { Request, Response } from 'express';
import { TemplateRepository } from './TemplateRepository';
import { pool } from '../../database/connection';
import { childLogger } from '../../utils/logger';

export class TemplatesController {
  private repository = new TemplateRepository(pool);
  private logger = childLogger({ component: 'TemplatesController' });

  getAll = async (req: Request, res: Response) => {
    try {
      const { page = 1, limit = 100, framework, category, search, is_public, template_scope } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const userRole = (req as any).user?.role?.toLowerCase();
      const isSuperAdmin = userRole === 'super_admin' || userRole === 'admin';

      // Simple company ID fetch for now, can be improved
      const userResult = await pool.query("SELECT company_id FROM users WHERE id = $1", [(req as any).user?.id]);
      const companyId = userResult.rows[0]?.company_id || null;

      const templates = await this.repository.findAll({
        limit: Number(limit),
        offset,
        framework: framework as string,
        category: category as string,
        search: search as string,
        is_public: is_public === 'true',
        template_scope: template_scope as string,
        companyId,
        userId: (req as any).user?.id,
        isSuperAdmin
      });

      res.json({ success: true, data: templates });
    } catch (error) {
      this.logger.error("Get templates error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const template = await this.repository.findById(id);
      if (!template) return res.status(404).json({ error: "Template not found" });

      res.json({ success: true, data: template });
    } catch (error) {
      this.logger.error("Get template error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };

  create = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const template = await this.repository.create({
        ...req.body,
        created_by: userId
      });
      res.status(201).json({ success: true, data: template });
    } catch (error) {
      this.logger.error("Create template error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const template = await this.repository.update(id, req.body);
      if (!template) return res.status(404).json({ error: "Template not found" });

      res.json({ success: true, data: template });
    } catch (error) {
      this.logger.error("Update template error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };

  delete = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      await this.repository.softDelete(id, userId);
      res.json({ success: true, message: "Template archived" });
    } catch (error) {
      this.logger.error("Delete template error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
}
