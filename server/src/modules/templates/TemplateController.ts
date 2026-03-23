import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { TemplateRepository } from './TemplateRepository';
import { pool } from '../../database/connection';
import { cache } from '../../utils/redis';
import { childLogger } from '../../utils/logger';
import { trackActivity } from '../../middleware/analyticsMiddleware';
import TemplateAnalyticsService from '../../services/templateAnalyticsService';

export class TemplateController {
  private repository = new TemplateRepository(pool);
  private logger = childLogger({ component: 'TemplateController' });

  getAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page = 1, limit = 100, framework, category, search, is_public, template_scope } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const user = (req as any).user;
      const isSuperAdmin = user?.role?.toLowerCase() === 'super_admin';
      
      let userCompanyId: string | null = null;
      if (user?.id && !isSuperAdmin) {
        const userResult = await pool.query("SELECT company_id FROM users WHERE id = $1", [user.id]);
        userCompanyId = userResult.rows[0]?.company_id || null;
      }

      const filters = { framework, category, search, is_public, template_scope, limit, offset };
      
      const [templates, total] = await Promise.all([
        this.repository.findTemplates(filters, isSuperAdmin, userCompanyId, user?.id),
        this.repository.countTemplates(filters, isSuperAdmin, userCompanyId, user?.id)
      ]);

      res.json({
        templates,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      next(error);
    }
  };

  getTrash = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Number(req.query.page || 1);
      const limit = Math.min(Number(req.query.limit || 10), 100);
      const offset = (page - 1) * limit;

      const user = (req as any).user;
      const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

      const [templates, total] = await Promise.all([
        this.repository.findTrash(isAdmin, user.id, limit, offset),
        this.repository.countTrash(isAdmin, user.id)
      ]);

      res.json({
        templates,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      const isSuperAdmin = user?.role?.toLowerCase() === 'super_admin';

      // Cache check
      const cacheKey = `template:${id}`;
      const cached = await cache.get(cacheKey);

      let userCompanyId: string | null = null;
      if (user?.id && !isSuperAdmin) {
        const userResult = await pool.query("SELECT company_id FROM users WHERE id = $1", [user.id]);
        userCompanyId = userResult.rows[0]?.company_id || null;
      }

      const [template, recentUsage, versionHistory, optimizationHistory] = await Promise.all([
        cached ? Promise.resolve(JSON.parse(cached)) : this.repository.findById(id, isSuperAdmin, userCompanyId, user.id),
        this.repository.findRecentUsage(id),
        this.repository.findVersionHistory(id),
        this.repository.findOptimizationHistory(id)
      ]);

      if (!template) return res.status(404).json({ error: "Template not found" });

      if (!cached) {
        await cache.set(cacheKey, JSON.stringify(template), 3600);
      }

      if (user?.id) {
        trackActivity.viewTemplate(user.id, id);
      }

      res.json({ template, recentUsage, versionHistory, optimizationHistory });
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { template_scope = 'user', company_id, name, framework, category, is_public, variables } = req.body;
      const user = (req as any).user;

      if (template_scope === 'standard' && user?.role !== 'super_admin') {
        return res.status(403).json({ error: "Only super administrators can create standard templates" });
      }

      let finalCompanyId = company_id || null;
      if (template_scope === 'company' && !finalCompanyId) {
        const userResult = await pool.query("SELECT company_id FROM users WHERE id = $1", [user.id]);
        finalCompanyId = userResult.rows[0]?.company_id || null;
      }

      const data = {
        ...req.body,
        id: uuidv4(),
        company_id: finalCompanyId,
        is_read_only: template_scope === 'standard',
        created_by: user.id
      };

      const template = await this.repository.create(data);

      trackActivity.createTemplate(user.id, template.id, {
        name, framework, category, is_public,
        variable_count: variables?.length || 0
      });

      await TemplateAnalyticsService.createVersion({
        template_id: template.id,
        version_number: '1.0.0',
        change_type: 'created',
        change_summary: 'Initial template creation',
        created_by: user.id
      });

      res.status(201).json({ message: "Template created successfully", template });
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      const template = await this.repository.update(id, req.body);
      if (!template) return res.status(404).json({ error: "Template not found or no changes made" });

      await cache.del(`template:${id}`);
      trackActivity.updateTemplate(user.id, id);

      res.json({ message: "Template updated successfully", template });
    } catch (error) {
      next(error);
    }
  };

  restore = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const template = await this.repository.restore(id);
      if (!template) return res.status(404).json({ error: "Template not found or not deleted" });

      await cache.del(`template:${id}`);
      res.json({ message: "Template restored", template });
    } catch (error) {
      next(error);
    }
  };

  promoteToCompany = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      const userResult = await pool.query("SELECT company_id FROM users WHERE id = $1", [user.id]);
      const userCompanyId = userResult.rows[0]?.company_id || null;

      if (!userCompanyId) return res.status(400).json({ error: "You must be assigned to a company to promote templates" });

      const template = await this.repository.promoteToCompany(id, userCompanyId);
      if (!template) return res.status(404).json({ error: "Template not found" });

      await cache.del(`template:${id}`);
      trackActivity.updateTemplate(user.id, id, { promotion: { from_scope: 'user', to_scope: 'company', company_id: userCompanyId } });

      const versions = await TemplateAnalyticsService.getVersionHistory(id, 1);
      const currentVersion = versions[0]?.version_number || '1.0.0';
      const [major, minor] = currentVersion.split('.').map(Number);
      const newVersion = `${major}.${minor + 1}.0`;

      await TemplateAnalyticsService.createVersion({
        template_id: id,
        version_number: newVersion,
        change_type: 'republished',
        change_summary: `Promoted to company template`,
        created_by: user.id
      });

      res.json({ message: "Template promoted to company successfully", template });
    } catch (error) {
      next(error);
    }
  };

  promoteToStandard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const user = (req as any).user;

      const template = await this.repository.promoteToStandard(id);
      if (!template) return res.status(404).json({ error: "Template not found" });

      await cache.del(`template:${id}`);
      trackActivity.updateTemplate(user.id, id, { promotion: { to_scope: 'standard' } });

      const versions = await TemplateAnalyticsService.getVersionHistory(id, 1);
      const currentVersion = versions[0]?.version_number || '1.0.0';
      const [major, minor] = currentVersion.split('.').map(Number);
      const newVersion = `${major}.${minor + 1}.0`;

      await TemplateAnalyticsService.createVersion({
        template_id: id,
        version_number: newVersion,
        change_type: 'republished',
        change_summary: `Promoted to standard template`,
        created_by: user.id
      });

      res.json({ message: "Template promoted to standard successfully", template });
    } catch (error) {
      next(error);
    }
  };

  clone = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { name, description, is_public } = req.body;
      const user = (req as any).user;

      const userCompanyIdResult = await pool.query("SELECT company_id FROM users WHERE id = $1", [user.id]);
      const userCompanyId = userCompanyIdResult.rows[0]?.company_id || null;

      const original = await this.repository.findById(id, true, null, user.id); // Get without scope check for cloning if public
      if (!original) return res.status(404).json({ error: "Template not found" });

      const data = {
        ...original,
        id: uuidv4(),
        name,
        description: description || `Clone of ${original.name}`,
        is_public,
        company_id: userCompanyId,
        template_scope: 'user',
        is_read_only: false,
        created_by: user.id
      };

      const template = await this.repository.create(data);
      res.status(201).json({ message: "Template cloned successfully", template });
    } catch (error) {
      next(error);
    }
  };

  use = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      const usage_count = await this.repository.incrementUsage(id, user.id);
      if (usage_count === null) return res.status(404).json({ error: "Template not found" });

      await cache.del(`template:${id}`);
      res.json({ message: "Template usage recorded", usage_count });
    } catch (error) {
      next(error);
    }
  };

  promoteStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const user = (req as any).user;

      const result = await this.repository.promoteStatus(id, user.id, reason);
      if (!result || !result.success) return res.status(400).json(result || { error: "Promotion failed" });

      await cache.del(`template:${id}`);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  archive = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const user = (req as any).user;

      const result = await this.repository.archive(id, user.id, reason);
      if (!result || !result.success) return res.status(400).json(result || { error: "Archive failed" });

      await cache.del(`template:${id}`);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  approveCompliance = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { compliance_score, notes } = req.body;
      const user = (req as any).user;

      const result = await this.repository.approveCompliance(id, user.id, compliance_score, notes);
      if (!result || !result.success) return res.status(400).json(result || { error: "Compliance approval failed" });

      await cache.del(`template:${id}`);
      res.json(result);
    } catch (error) {
      next(error);
    }
  };

  softDelete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      const template = await this.repository.softDelete(id, user.id);
      if (!template) return res.status(404).json({ error: "Template not found" });

      await cache.del(`template:${id}`);
      trackActivity.deleteTemplate(user.id, id);

      res.json({ message: "Template moved to trash", template });
    } catch (error) {
      next(error);
    }
  };

  hardDelete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const success = await this.repository.hardDelete(id);
      if (!success) return res.status(404).json({ error: "Template not found" });

      await cache.del(`template:${id}`);
      res.json({ message: "Template permanently deleted" });
    } catch (error) {
      next(error);
    }
  };

  // Analytics Proxy Methods
  getVersions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { limit = 20 } = req.query;
      const versions = await TemplateAnalyticsService.getVersionHistory(id, Number(limit));
      res.json({ versions });
    } catch (error) {
      next(error);
    }
  };

  getMetrics = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { period = 'all_time' } = req.query;
      let metrics = await TemplateAnalyticsService.getQualityMetrics(id, period as string);
      if (!metrics) {
        await TemplateAnalyticsService.calculateQualityMetrics(id);
        metrics = await TemplateAnalyticsService.getQualityMetrics(id);
      }
      res.json({ metrics });
    } catch (error) {
      next(error);
    }
  };

  getPerformance = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const performance = await TemplateAnalyticsService.getPerformanceSummary(id);
      if (!performance) return res.status(404).json({ error: 'Performance data not found' });
      res.json({ performance });
    } catch (error) {
      next(error);
    }
  };

  getTrends = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { days = 30 } = req.query;
      const trends = await TemplateAnalyticsService.getTemplateTrends(id, Number(days));
      res.json({ trends });
    } catch (error) {
      next(error);
    }
  };

  getMaintenanceLog = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { limit = 20 } = req.query;
      const maintenanceLog = await TemplateAnalyticsService.getMaintenanceLog(id, Number(limit));
      res.json({ maintenance_log: maintenanceLog });
    } catch (error) {
      next(error);
    }
  };

  getDashboard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { framework } = req.query;
      const dashboard = await TemplateAnalyticsService.getDashboard(framework as string | undefined);
      if (!dashboard) return res.status(500).json({ error: 'Failed to load dashboard data' });
      res.json(dashboard);
    } catch (error) {
      next(error);
    }
  };

  getStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await this.repository.findStatistics();
      res.json({ statistics: stats, total_templates: stats.length });
    } catch (error) {
      next(error);
    }
  };

  getStatsById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { templateId } = req.params;
      const [statistics, usage_history] = await Promise.all([
        this.repository.findStatisticsById(templateId),
        this.repository.findRecentUsage(templateId, 50)
      ]);
      if (!statistics) return res.status(404).json({ error: "Template not found" });
      res.json({ statistics, usage_history });
    } catch (error) {
      next(error);
    }
  };

  // Admin Analytics Rebuild Methods
  refreshAnalytics = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await TemplateAnalyticsService.refreshAnalyticsViews();
      res.json({ message: 'Analytics views refreshed successfully' });
    } catch (error) {
      next(error);
    }
  };

  rebuildEntityProfiles = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await TemplateAnalyticsService.updateTemplateEntityProfile();
      res.json({ message: 'Template entity profiles rebuilt successfully' });
    } catch (error) {
      next(error);
    }
  };

  rebuildTemplateAnalytics = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { templateId } = req.params;
      
      const projectsRes = await pool.query(
        `SELECT DISTINCT project_id FROM documents WHERE template_id = $1 AND project_id IS NOT NULL`,
        [templateId]
      );
      
      const projectIds = projectsRes.rows.map((row) => row.project_id as string);
      
      if (projectIds.length > 0) {
        const { default: DocumentPurposeService } = await import('../../services/documentPurposeService');
        for (const projectId of projectIds) {
          await DocumentPurposeService.rebuildForProject(projectId);
        }
      }
      
      await TemplateAnalyticsService.updateTemplateEntityProfile(templateId);
      
      res.json({
        message: 'Template analytics rebuilt successfully',
        templateId,
        projectsRebuilt: projectIds.length
      });
    } catch (error) {
      next(error);
    }
  };

  rebuildDocumentPurposes = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.params;
      const { default: DocumentPurposeService } = await import('../../services/documentPurposeService');
      await DocumentPurposeService.rebuildForProject(projectId);
      res.json({ message: 'Document purposes rebuilt successfully for project', projectId });
    } catch (error) {
      next(error);
    }
  };

  rebuildAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { projectId } = req.body;
      if (projectId) {
        const { default: DocumentPurposeService } = await import('../../services/documentPurposeService');
        await DocumentPurposeService.rebuildForProject(projectId);
        
        const templatesRes = await pool.query(
          `SELECT DISTINCT template_id FROM documents WHERE project_id = $1 AND template_id IS NOT NULL`,
          [projectId]
        );
        
        const templateIds = templatesRes.rows.map((row) => row.template_id as string);
        for (const templateId of templateIds) {
          await TemplateAnalyticsService.updateTemplateEntityProfile(templateId);
        }
        
        res.json({ message: 'Rebuilt for project', projectId, templatesUpdated: templateIds.length });
      } else {
        await TemplateAnalyticsService.updateTemplateEntityProfile();
        res.json({ message: 'Template entity profiles rebuilt successfully for all templates' });
      }
    } catch (error) {
      next(error);
    }
  };

  getDiagnostic = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { templateId } = req.params;
      
      const [docsCheck, viewCheck, profileCheck, sampleDocs] = await Promise.all([
        pool.query(`SELECT COUNT(*) as total_documents, COUNT(CASE WHEN template_id IS NOT NULL THEN 1 END) as with_template_id, COUNT(CASE WHEN entity_counts != '{}'::jsonb AND entity_counts IS NOT NULL THEN 1 END) as with_entity_counts, COUNT(CASE WHEN template_id IS NOT NULL AND entity_counts != '{}'::jsonb THEN 1 END) as with_both FROM documents WHERE template_id = $1`, [templateId]),
        pool.query(`SELECT * FROM aggregated_template_entity_view WHERE template_id = $1`, [templateId]),
        pool.query(`SELECT * FROM template_entity_profile WHERE template_id = $1`, [templateId]),
        pool.query(`SELECT id, name, template_id, CASE WHEN entity_counts = '{}'::jsonb THEN 'empty' ELSE 'has_data' END as entity_counts_status, entity_counts FROM documents WHERE template_id = $1 LIMIT 5`, [templateId])
      ]);
      
      res.json({
        templateId,
        documents: docsCheck.rows[0],
        viewData: viewCheck.rows[0] || null,
        profileData: profileCheck.rows[0] || null,
        sampleDocuments: sampleDocs.rows,
        recommendations: {
          needsExtraction: docsCheck.rows[0].with_entity_counts === '0',
          needsRebuild: viewCheck.rows.length === 0 && docsCheck.rows[0].with_both > 0,
          needsDocumentPurposeRebuild: docsCheck.rows[0].with_template_id > 0 && docsCheck.rows[0].with_entity_counts === '0'
        }
      });
    } catch (error) {
      next(error);
    }
  };
}
