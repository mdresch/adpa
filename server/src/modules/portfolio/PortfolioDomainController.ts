import { Request, Response } from 'express';
import { PortfolioDomainRepository } from './PortfolioDomainRepository';
import { pool } from '../../database/connection';
import { childLogger } from '../../utils/logger';

export class PortfolioDomainController {
  private repository = new PortfolioDomainRepository(pool);
  private logger = childLogger({ component: 'PortfolioDomainController' });

  getAll = async (req: Request, res: Response) => {
    try {
      const domains = await this.repository.findAll();
      res.json({ success: true, data: domains });
    } catch (error) {
      this.logger.error("Get portfolio domains error:", error);
      res.status(500).json({ success: false, error: "Failed to fetch portfolio domains" });
    }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const domain = await this.repository.findById(id);
      if (!domain) {
        return res.status(404).json({ success: false, error: "Portfolio domain not found" });
      }
      res.json({ success: true, data: domain });
    } catch (error) {
      this.logger.error("Get portfolio domain error:", error);
      res.status(500).json({ success: false, error: "Failed to fetch portfolio domain" });
    }
  };
}
