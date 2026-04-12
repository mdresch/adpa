import { Request, Response, NextFunction } from 'express';
import { PlaybookRepository } from './PlaybookRepository';
import { playbookService } from '../../services/playbookService';
import { pool } from '../../database/connection';
import { childLogger } from '../../utils/logger';

export class PlaybookController {
  private repository = new PlaybookRepository(pool);
  private logger = childLogger({ component: 'PlaybookController' });

  getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = {
        project_id: req.query.project_id as string,
        category: req.query.category ? (req.query.category as string).split(',') : undefined,
        trigger_type: req.query.trigger_type ? (req.query.trigger_type as string).split(',') : undefined,
        is_active: req.query.is_active === 'true' ? true : req.query.is_active === 'false' ? false : undefined,
        search: req.query.search as string
      };
      const playbooks = await this.repository.findPlaybooks(filters);
      res.json({ success: true, data: playbooks });
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      const playbook = await playbookService.getPlaybookById(req.params.id, userId);
      if (!playbook) return res.status(404).json({ success: false, error: 'Playbook not found' });
      res.json({ success: true, data: playbook });
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const playbook = await playbookService.createPlaybook(req.body, userId);
      res.status(201).json({ success: true, data: playbook });
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const playbook = await playbookService.updatePlaybook(req.params.id, req.body, userId);
      res.json({ success: true, data: playbook });
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const deleted = await playbookService.deletePlaybook(req.params.id, userId);
      if (!deleted) return res.status(404).json({ success: false, error: 'Playbook not found or access denied' });
      res.json({ success: true, message: 'Playbook deleted successfully' });
    } catch (error) {
      next(error);
    }
  };

  match = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const criteria = {
        project_id: req.query.project_id as string,
        risk_category: req.query.risk_category as string,
        severity_level: req.query.severity_level as string,
        priority_level: req.query.priority_level as string,
        impact: req.query.impact as string,
        probability: req.query.probability as string
      };
      if (!criteria.project_id) return res.status(400).json({ success: false, error: 'Missing project_id' });
      const matches = await playbookService.findMatchingPlaybooks(criteria);
      res.json({ success: true, data: matches });
    } catch (error) {
      next(error);
    }
  };

  getExecutions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filters = {
        playbook_id: req.query.playbook_id as string,
        status: req.query.status ? (req.query.status as string).split(',') : undefined,
        project_id: req.query.project_id as string
      };
      const executions = await this.repository.findExecutions(filters);
      res.json({ success: true, data: executions });
    } catch (error) {
      next(error);
    }
  };

  getExecutionById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const execution = await playbookService.getExecutionById(req.params.id);
      if (!execution) return res.status(404).json({ success: false, error: 'Execution not found' });
      res.json({ success: true, data: execution });
    } catch (error) {
      next(error);
    }
  };

  execute = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const input = { playbook_id: req.params.id, ...req.body };
      const execution = await playbookService.executePlaybook(input, userId);
      res.status(201).json({ success: true, data: execution });
    } catch (error) {
      next(error);
    }
  };

  cancelExecution = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const execution = await playbookService.cancelExecution(req.params.id, userId, req.body.reason);
      res.json({ success: true, data: execution });
    } catch (error) {
      next(error);
    }
  };

  completeStep = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const stepExecution = await playbookService.completeStep(
        req.params.id,
        req.params.stepId,
        userId,
        req.body.notes,
        req.body.evidence
      );
      res.json({ success: true, data: stepExecution });
    } catch (error) {
      next(error);
    }
  };

  updateStepNotes = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const stepExecution = await playbookService.updateStepNotes(
        req.params.id,
        req.params.stepId,
        userId,
        req.body.notes,
        req.body.evidence
      );
      res.json({ success: true, data: stepExecution });
    } catch (error) {
      next(error);
    }
  };
}
