import { Request, Response } from 'express';
import { PortfolioFinancialRepository } from './PortfolioFinancialRepository';
import { pool } from '../../database/connection';
import { childLogger } from '../../utils/logger';

export class PortfolioFinancialController {
  private repository = new PortfolioFinancialRepository(pool);
  private logger = childLogger({ component: 'PortfolioFinancialController' });

  getPortfolioMetrics = async (req: Request, res: Response) => {
    try {
      const metrics = await this.repository.getPortfolioMetrics();
      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      this.logger.error("Get portfolio financial metrics error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve portfolio financial metrics",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  };

  getCostBreakdown = async (req: Request, res: Response) => {
    try {
      const breakdown = await this.repository.getCostBreakdown();
      res.json({
        success: true,
        data: breakdown
      });
    } catch (error) {
      this.logger.error("Get cost breakdown error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve portfolio cost breakdown",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  };

  getProgramMetrics = async (req: Request, res: Response) => {
    try {
      const { programId } = req.params;
      if (!programId) {
        return res.status(400).json({
          success: false,
          error: "Missing programId parameter"
        });
      }

      const metrics = await this.repository.getProgramMetrics(programId);
      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      this.logger.error(`Get program financial metrics error for ${req.params.programId}:`, error);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve program financial metrics",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  };
}
