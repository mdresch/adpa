import { Request, Response, NextFunction } from 'express';
import { RiskRepository } from './RiskRepository';
import { pool } from '../../database/connection';
import { childLogger } from '../../utils/logger';

export class RiskController {
  private repository = new RiskRepository(pool);
  private logger = childLogger({ component: 'RiskController' });

  getRegistry = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = {
        project_id: req.query.project_id as string,
        program_id: req.query.program_id as string,
        risk_level: req.query.risk_level as string,
        status: req.query.status as string,
        priority: req.query.priority as string
      };
      const risks = await this.repository.findRegistry(filters);
      res.json({ success: true, data: risks, count: risks.length });
    } catch (error) {
      next(error);
    }
  };

  getReport = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = {
        project_id: req.query.project_id as string,
        program_id: req.query.program_id as string,
        risk_id: req.query.risk_id as string,
        status: req.query.status as string,
        overdue_only: req.query.overdue_only === 'true'
      };
      const report = await this.repository.findMitigationReport(filters);
      res.json({ success: true, data: report, count: report.length });
    } catch (error) {
      next(error);
    }
  };

  getSummary = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const programId = req.query.program_id as string;
      const summary = await this.repository.findSummary(programId);
      res.json({ success: true, data: summary, count: summary.length });
    } catch (error) {
      next(error);
    }
  };

  getCompliance = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const programId = req.query.program_id as string;
      const compliance = await this.repository.findCompliance(programId);
      res.json({ success: true, data: compliance, count: compliance.length });
    } catch (error) {
      next(error);
    }
  };
}
