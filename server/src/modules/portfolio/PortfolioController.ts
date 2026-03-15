import { Request, Response } from 'express';
import { PortfolioRepository } from './PortfolioRepository';
import { pool } from '../../database/connection';
import { childLogger } from '../../utils/logger';
import Joi from 'joi';

const createPortfolioSchema = Joi.object({
  company_id: Joi.string().uuid().optional().allow(null),
  portfolio_name: Joi.string().required().max(255),
  description: Joi.string().optional().allow(null, ''),
  owner_id: Joi.string().uuid().optional().allow(null),
  portfolio_lead: Joi.string().uuid().optional().allow(null),
  status: Joi.string().valid('active', 'archived', 'paused').default('active'),
  budget: Joi.number().optional().allow(null),
  budget_currency: Joi.string().max(3).optional().allow(null),
  start_date: Joi.date().optional().allow(null),
  end_date: Joi.date().optional().allow(null),
  last_risk_review_at: Joi.date().optional().allow(null),
  next_risk_review_due: Joi.date().optional().allow(null),
  risk_review_notes: Joi.string().optional().allow(null, ''),
});

const updatePortfolioSchema = Joi.object({
  company_id: Joi.string().uuid().optional().allow(null),
  portfolio_name: Joi.string().optional().max(255),
  description: Joi.string().optional().allow(null, ''),
  owner_id: Joi.string().uuid().optional().allow(null),
  portfolio_lead: Joi.string().uuid().optional().allow(null),
  status: Joi.string().valid('active', 'archived', 'paused').optional(),
  budget: Joi.number().optional().allow(null),
  budget_currency: Joi.string().max(3).optional().allow(null),
  start_date: Joi.date().optional().allow(null),
  end_date: Joi.date().optional().allow(null),
  last_risk_review_at: Joi.date().optional().allow(null),
  next_risk_review_due: Joi.date().optional().allow(null),
  risk_review_notes: Joi.string().optional().allow(null, ''),
});

export class PortfolioController {
  private repository = new PortfolioRepository(pool);
  private logger = childLogger({ component: 'PortfolioController' });

  getAll = async (req: Request, res: Response) => {
    try {
      const { status, limit, offset, sort_by, sort_order } = req.query;
      const result = await this.repository.findAll({
        status: status as string,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
        sortBy: sort_by as string,
        sortOrder: sort_order as 'asc' | 'desc'
      });

      res.json({
        success: true,
        data: result.rows,
        pagination: {
          total: result.total,
          limit: limit ? parseInt(limit as string) : 50,
          offset: offset ? parseInt(offset as string) : 0,
          hasMore: result.total > (offset ? parseInt(offset as string) : 0) + result.rows.length
        }
      });
    } catch (error) {
      this.logger.error("Get portfolios error:", error);
      res.status(500).json({ success: false, error: "Failed to fetch portfolios" });
    }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const portfolio = await this.repository.findById(id);
      if (!portfolio) {
        return res.status(404).json({ success: false, error: "Portfolio not found" });
      }

      res.json({ success: true, data: portfolio });
    } catch (error) {
      this.logger.error("Get portfolio error:", error);
      res.status(500).json({ success: false, error: "Failed to fetch portfolio" });
    }
  };

  create = async (req: Request, res: Response) => {
    try {
      const { error, value } = createPortfolioSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ success: false, error: error.details[0].message });
      }

      const userId = (req as any).user?.id || null;
      const portfolio = await this.repository.create({
        ...value,
        created_by: userId
      });

      res.status(201).json({ success: true, data: portfolio });
    } catch (error: any) {
      this.logger.error("Create portfolio error:", error);
      if (error.code === '23505') {
        return res.status(409).json({ success: false, error: "A portfolio with this name already exists" });
      }
      res.status(500).json({ success: false, error: "Failed to create portfolio" });
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { error, value } = updatePortfolioSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ success: false, error: error.details[0].message });
      }

      const portfolio = await this.repository.update(id, value);
      if (!portfolio) {
        return res.status(404).json({ success: false, error: "Portfolio not found" });
      }

      res.json({ success: true, data: portfolio });
    } catch (error: any) {
      this.logger.error("Update portfolio error:", error);
      if (error.code === '23505') {
        return res.status(409).json({ success: false, error: "A portfolio with this name already exists" });
      }
      res.status(500).json({ success: false, error: "Failed to update portfolio" });
    }
  };

  delete = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await this.repository.softDelete(id);
      res.json({ success: true, message: "Portfolio archived successfully" });
    } catch (error) {
      this.logger.error("Delete portfolio error:", error);
      res.status(500).json({ success: false, error: "Failed to delete portfolio" });
    }
  };

  getRisks = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const risks = await this.repository.getRisks(id);
      res.json({ success: true, data: risks });
    } catch (error) {
      this.logger.error("Get portfolio risks error:", error);
      res.status(500).json({ success: false, error: "Failed to fetch portfolio risks" });
    }
  };
}
