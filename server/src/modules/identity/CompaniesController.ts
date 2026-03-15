import { Request, Response } from 'express';
import { CompanyRepository } from './CompanyRepository';
import { pool } from '../../database/connection';
import { childLogger } from '../../utils/logger';

export class CompaniesController {
  private repository = new CompanyRepository(pool);
  private logger = childLogger({ component: 'CompaniesController' });

  getAll = async (req: Request, res: Response) => {
    try {
      const { page = 1, limit = 10, search } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const companies = await this.repository.findAll({
        limit: Number(limit),
        offset,
        search: search as string
      });

      const total = await this.repository.count({ search: search as string });

      res.json({
        companies,
        pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) }
      });
    } catch (error) {
      this.logger.error("Get companies error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const company = await this.repository.findById(id);
      if (!company) return res.status(404).json({ error: "Company not found" });

      res.json({ company });
    } catch (error) {
      this.logger.error("Get company error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };

  create = async (req: Request, res: Response) => {
    try {
      const company = await this.repository.create(req.body);
      res.status(201).json({ message: "Company created successfully", company });
    } catch (error) {
      this.logger.error("Create company error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const company = await this.repository.update(id, req.body);
      if (!company) return res.status(404).json({ error: "Company not found" });

      res.json({ message: "Company updated successfully", company });
    } catch (error) {
      this.logger.error("Update company error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };

  delete = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await this.repository.delete(id);
      res.json({ message: "Company deleted successfully" });
    } catch (error) {
      this.logger.error("Delete company error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
}
