import { Request, Response } from 'express';
import { ProgramRepository } from './ProgramRepository';
import { pool } from '../../database/connection';
import { childLogger } from '../../utils/logger';

export class ProgramsController {
  private repository = new ProgramRepository(pool);
  private logger = childLogger({ component: 'ProgramsController' });

  getAll = async (req: Request, res: Response) => {
    try {
      const { limit, offset, owner_id, status, search } = req.query;
      const programs = await this.repository.findAll({
        limit: limit ? Number(limit) : undefined,
        offset: offset ? Number(offset) : undefined,
        ownerId: owner_id as string,
        status: status as string,
        search: search as string
      });

      res.json({ success: true, data: programs });
    } catch (error) {
      this.logger.error("Get programs error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const program = await this.repository.findById(id);
      if (!program) return res.status(404).json({ error: "Program not found" });

      res.json({ success: true, data: program });
    } catch (error) {
      this.logger.error("Get program error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };

  create = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const program = await this.repository.create({
        ...req.body,
        owner_id: userId,
        created_by: userId
      });
      res.status(201).json({ success: true, data: program });
    } catch (error) {
      this.logger.error("Create program error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const program = await this.repository.update(id, req.body);
      if (!program) return res.status(404).json({ error: "Program not found" });

      res.json({ success: true, data: program });
    } catch (error) {
      this.logger.error("Update program error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };

  delete = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await this.repository.delete(id);
      res.json({ success: true });
    } catch (error) {
      this.logger.error("Delete program error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
}
