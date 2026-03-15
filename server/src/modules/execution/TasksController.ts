import { Request, Response } from 'express';
import { TaskRepository } from './TaskRepository';
import { pool } from '../../database/connection';
import { childLogger } from '../../utils/logger';
import * as wbsImportService from '../../services/wbsImportService';

export class TasksController {
  private repository = new TaskRepository(pool);
  private logger = childLogger({ component: 'TasksController' });

  getProjectTasks = async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const tasks = await this.repository.findAllByProject(projectId, req.query);
      res.json({ success: true, data: tasks });
    } catch (error) {
      this.logger.error("Get project tasks error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const task = await this.repository.findById(id);
      if (!task) return res.status(404).json({ error: "Task not found" });

      res.json({ success: true, data: task });
    } catch (error) {
      this.logger.error("Get task error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };

  create = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const task = await this.repository.create({
        ...req.body,
        createdBy: userId
      });
      res.status(201).json({ success: true, data: task });
    } catch (error) {
      this.logger.error("Create task error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const task = await this.repository.update(id, req.body);
      if (!task) return res.status(404).json({ error: "Task not found" });

      res.json({ success: true, data: task });
    } catch (error) {
      this.logger.error("Update task error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };

  delete = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await this.repository.delete(id);
      res.json({ success: true, message: "Task deleted" });
    } catch (error) {
      this.logger.error("Delete task error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };

  importWBS = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const { projectId, options } = req.body;
      const result = await wbsImportService.importWBSFromProjectEntities(projectId, userId, options || {});
      res.status(201).json({ success: true, data: result });
    } catch (error: any) {
      this.logger.error("WBS import failed:", error);
      res.status(500).json({ error: error.message || "Failed to import WBS" });
    }
  };
}
