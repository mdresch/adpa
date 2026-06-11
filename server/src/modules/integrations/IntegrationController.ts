import { Request, Response } from 'express';
import { IntegrationRepository } from './IntegrationRepository';
import { pool } from '../../database/connection';
import { childLogger } from '../../utils/logger';

export class IntegrationController {
  private repository = new IntegrationRepository(pool);
  private logger = childLogger({ component: 'IntegrationController' });

  getAll = async (req: Request, res: Response) => {
    try {
      const { page = 1, limit = 10, type, is_active } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const integrations = await this.repository.findAll({
        limit: Number(limit),
        offset,
        type: type as string,
        is_active: is_active === undefined ? undefined : is_active === 'true'
      });

      const total = await this.repository.count({
        type: type as string,
        is_active: is_active === undefined ? undefined : is_active === 'true'
      });

      res.json({
        integrations,
        pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) }
      });
    } catch (error) {
      this.logger.error("Get integrations error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const integration = await this.repository.findById(id);
      if (!integration) return res.status(404).json({ error: "Integration not found" });

      res.json({ integration });
    } catch (error) {
      this.logger.error("Get integration error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };

  create = async (req: Request, res: Response) => {
    try {
      const { name, type, configuration, credentials, is_active } = req.body;
      const singletonTypes = new Set(["mongodb", "pinecone", "supabase", "neo4j"]);
      if (singletonTypes.has(type)) {
        const existing = await this.repository.findByType(type);
        if (existing.length > 0) {
          return res.status(409).json({
            error: "Integration already exists",
            message: `A ${type} integration already exists. Enable or update the existing record instead of creating another.`,
            integration: existing[0],
          });
        }
      }

      const encryptedCredentials = Buffer.from(JSON.stringify(credentials)).toString("base64");
      
      const integration = await this.repository.create({
        name, type, configuration, credentials_encrypted: encryptedCredentials, is_active,
        created_by: (req as any).user?.id
      });

      res.status(201).json({ message: "Integration created successfully", integration });
    } catch (error) {
      this.logger.error("Create integration error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      if (updates.credentials) {
        updates.credentials_encrypted = Buffer.from(JSON.stringify(updates.credentials)).toString("base64");
        delete updates.credentials;
      }

      const integration = await this.repository.update(id, updates);
      if (!integration) return res.status(404).json({ error: "Integration not found" });

      res.json({ message: "Integration updated successfully", integration });
    } catch (error) {
      this.logger.error("Update integration error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };

  delete = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await this.repository.delete(id);
      res.json({ message: "Integration deleted successfully" });
    } catch (error) {
      this.logger.error("Delete integration error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  };
}
