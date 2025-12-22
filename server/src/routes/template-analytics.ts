/**
 * Template Analytics Routes
 * 
 * API endpoints for template version control, quality metrics, and maintenance tracking
 */

import express from 'express';
import { authenticateToken, requirePermission } from '../middleware/auth';
import { childLogger } from '../utils/logger';
import TemplateAnalyticsService from '../services/templateAnalyticsService';

const router = express.Router();

// Get template version history
router.get('/:id/versions', authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId });
  try {
    const { id } = req.params;
    const { limit = 20 } = req.query;

    const versions = await TemplateAnalyticsService.getVersionHistory(
      id,
      Number(limit)
    );

    res.json({ versions });
  } catch (error) {
    log.error('Get template versions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get specific version
router.get('/versions/:versionId', authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId });
  try {
    const { versionId } = req.params;

    const version = await TemplateAnalyticsService.getVersion(versionId);

    if (!version) {
      return res.status(404).json({ error: 'Version not found' });
    }

    res.json({ version });
  } catch (error) {
    log.error('Get version error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get template quality metrics
router.get('/:id/metrics', authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId });
  try {
    const { id } = req.params;
    const { period = 'all_time' } = req.query;

    const metrics = await TemplateAnalyticsService.getQualityMetrics(
      id,
      period as string
    );

    if (!metrics) {
      // Calculate if not exists
      await TemplateAnalyticsService.calculateQualityMetrics(id);
      const newMetrics = await TemplateAnalyticsService.getQualityMetrics(id);
      return res.json({ metrics: newMetrics });
    }

    res.json({ metrics });
  } catch (error) {
    log.error('Get template metrics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Recalculate quality metrics
router.post('/:id/metrics/calculate', authenticateToken, requirePermission('templates.update'), async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId });
  try {
    const { id } = req.params;
    const { period = 'all_time', period_start, period_end } = req.body;

    await TemplateAnalyticsService.calculateQualityMetrics(
      id,
      period,
      period_start ? new Date(period_start) : undefined,
      period_end ? new Date(period_end) : undefined
    );

    const metrics = await TemplateAnalyticsService.getQualityMetrics(id, period);

    res.json({ metrics });
  } catch (error) {
    log.error('Calculate metrics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get template performance summary
router.get('/:id/performance', authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId });
  try {
    const { id } = req.params;

    const performance = await TemplateAnalyticsService.getPerformanceSummary(id);

    if (!performance) {
      return res.status(404).json({ error: 'Performance data not found' });
    }

    res.json({ performance });
  } catch (error) {
    log.error('Get performance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get template trends
router.get('/:id/trends', authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId });
  try {
    const { id } = req.params;
    const { days = 30 } = req.query;

    const trends = await TemplateAnalyticsService.getTemplateTrends(
      id,
      Number(days)
    );

    res.json({ trends });
  } catch (error) {
    log.error('Get template trends error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get maintenance log
router.get('/:id/maintenance', authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId });
  try {
    const { id } = req.params;
    const { limit = 20 } = req.query;

    const maintenanceLog = await TemplateAnalyticsService.getMaintenanceLog(
      id,
      Number(limit)
    );

    res.json({ maintenance_log: maintenanceLog });
  } catch (error) {
    log.error('Get maintenance log error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create maintenance action
router.post('/:id/maintenance', authenticateToken, requirePermission('templates.update'), async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId });
  try {
    const { id } = req.params;
    const { action_type, priority, reason, description, assigned_to } = req.body;

    const maintenanceId = await TemplateAnalyticsService.createMaintenanceAction({
      template_id: id,
      action_type,
      action_status: 'pending',
      priority,
      reason,
      description,
      assigned_to,
      performed_by: req.user?.id
    });

    res.status(201).json({ 
      message: 'Maintenance action created',
      maintenance_id: maintenanceId 
    });
  } catch (error) {
    log.error('Create maintenance action error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update maintenance action
router.put('/maintenance/:maintenanceId', authenticateToken, requirePermission('templates.update'), async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId });
  try {
    const { maintenanceId } = req.params;
    const { status, description } = req.body;

    await TemplateAnalyticsService.updateMaintenanceStatus(
      maintenanceId,
      status,
      description
    );

    res.json({ message: 'Maintenance action updated' });
  } catch (error) {
    log.error('Update maintenance action error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get top performing templates
router.get('/analytics/top', authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId });
  try {
    const { limit = 10, framework, category } = req.query;

    const templates = await TemplateAnalyticsService.getTopTemplates(
      Number(limit),
      framework as string | undefined,
      category as string | undefined
    );

    res.json({ templates });
  } catch (error) {
    log.error('Get top templates error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get templates needing maintenance
router.get('/analytics/maintenance-needed', authenticateToken, requirePermission('templates.read'), async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId });
  try {
    const { min_priority = 'medium' } = req.query;

    const templates = await TemplateAnalyticsService.getTemplatesNeedingMaintenance(
      min_priority as string
    );

    res.json({ templates });
  } catch (error) {
    log.error('Get templates needing maintenance error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Compare two templates
router.get('/analytics/compare', authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId });
  try {
    const { template_a, template_b } = req.query;

    if (!template_a || !template_b) {
      return res.status(400).json({ error: 'Both template_a and template_b are required' });
    }

    const comparison = await TemplateAnalyticsService.compareTemplates(
      template_a as string,
      template_b as string
    );

    if (!comparison) {
      return res.status(404).json({ error: 'Comparison failed - templates not found or no metrics available' });
    }

    res.json({ comparison });
  } catch (error) {
    log.error('Compare templates error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get analytics dashboard
router.get('/analytics/dashboard', authenticateToken, async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId });
  try {
    const { framework } = req.query;

    const dashboard = await TemplateAnalyticsService.getDashboard(
      framework as string | undefined
    );

    if (!dashboard) {
      return res.status(500).json({ error: 'Failed to load dashboard data' });
    }

    res.json(dashboard);
  } catch (error) {
    log.error('Get analytics dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Refresh analytics views
router.post('/analytics/refresh', authenticateToken, requirePermission('admin'), async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId });
  try {
    await TemplateAnalyticsService.refreshAnalyticsViews();

    res.json({ message: 'Analytics views refreshed successfully' });
  } catch (error) {
    log.error('Refresh analytics views error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Rebuild template entity profiles (template_entity_profile) from document_entity_counts
router.post('/analytics/rebuild-entity-profiles', authenticateToken, requirePermission('admin'), async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId });
  try {
    await TemplateAnalyticsService.updateTemplateEntityProfile();
    res.json({ message: 'Template entity profiles rebuilt successfully' });
  } catch (error) {
    log.error('Rebuild template entity profiles error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Rebuild template analytics for a specific template
router.post('/analytics/rebuild-template/:templateId', authenticateToken, requirePermission('admin'), async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId });
  try {
    const { templateId } = req.params;
    
    // Validate templateId format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(templateId)) {
      return res.status(400).json({ error: 'Invalid template ID format' });
    }
    
    const { pool } = await import('../database/connection');
    
    // Find all projects using this template
    const projectsRes = await pool.query(
      `SELECT DISTINCT project_id 
       FROM documents 
       WHERE template_id = $1 AND project_id IS NOT NULL`,
      [templateId]
    );
    
    const projectIds = projectsRes.rows.map((row) => row.project_id as string);
    log.info(`Found ${projectIds.length} projects using template ${templateId}`);
    
    // Rebuild document purposes for each project
    if (projectIds.length > 0) {
      const { default: DocumentPurposeService } = await import('../services/documentPurposeService');
      for (const projectId of projectIds) {
        log.info(`Rebuilding document purposes for project ${projectId}`);
        await DocumentPurposeService.rebuildForProject(projectId);
      }
    }
    
    // Rebuild template entity profile
    await TemplateAnalyticsService.updateTemplateEntityProfile(templateId);
    
    res.json({
      message: 'Template analytics rebuilt successfully',
      templateId,
      projectsRebuilt: projectIds.length
    });
  } catch (error) {
    log.error('Rebuild template analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Rebuild document purposes for a specific project
router.post('/analytics/rebuild-document-purposes/:projectId', authenticateToken, requirePermission('admin'), async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId });
  try {
    const { projectId } = req.params;
    
    // Validate projectId format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(projectId)) {
      return res.status(400).json({ error: 'Invalid project ID format' });
    }
    
    const { default: DocumentPurposeService } = await import('../services/documentPurposeService');
    await DocumentPurposeService.rebuildForProject(projectId);
    
    res.json({ 
      message: 'Document purposes rebuilt successfully for project',
      projectId 
    });
  } catch (error) {
    log.error('Rebuild document purposes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Rebuild both document purposes and template entity profiles (full rebuild)
router.post('/analytics/rebuild-all', authenticateToken, requirePermission('admin'), async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId });
  try {
    const { projectId } = req.body; // Optional - if provided, only rebuild for this project
    
    if (projectId) {
      // Validate projectId format if provided
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(projectId)) {
        return res.status(400).json({ error: 'Invalid project ID format' });
      }
      
      // Rebuild for specific project
      const { default: DocumentPurposeService } = await import('../services/documentPurposeService');
      await DocumentPurposeService.rebuildForProject(projectId);
      
      // Update template profiles for templates used in this project
      const { pool } = await import('../database/connection');
      const templatesRes = await pool.query(
        `SELECT DISTINCT template_id
         FROM documents
         WHERE project_id = $1 AND template_id IS NOT NULL`,
        [projectId]
      );
      
      const templateIds = templatesRes.rows.map((row) => row.template_id as string);
      if (templateIds.length > 0) {
        for (const templateId of templateIds) {
          await TemplateAnalyticsService.updateTemplateEntityProfile(templateId);
        }
      }
      
      res.json({ 
        message: 'Document purposes and template entity profiles rebuilt successfully for project',
        projectId,
        templatesUpdated: templateIds.length
      });
    } else {
      // Full system rebuild - this could be expensive, so we'll just rebuild template profiles
      await TemplateAnalyticsService.updateTemplateEntityProfile();
      
      res.json({ 
        message: 'Template entity profiles rebuilt successfully for all templates',
        note: 'To rebuild document purposes, specify a projectId in the request body'
      });
    }
  } catch (error) {
    log.error('Rebuild all analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Diagnostic endpoint to check template analytics data
router.get('/analytics/diagnostic/:templateId', authenticateToken, requirePermission('admin'), async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId });
  try {
    const { templateId } = req.params;
    
    // Validate templateId format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(templateId)) {
      return res.status(400).json({ error: 'Invalid template ID format' });
    }
    
    const { pool } = await import('../database/connection');
    
    // Check documents for this template
    const documentsCheck = await pool.query(
      `SELECT 
        COUNT(*) as total_documents,
        COUNT(CASE WHEN template_id IS NOT NULL THEN 1 END) as with_template_id,
        COUNT(CASE WHEN entity_counts != '{}'::jsonb AND entity_counts IS NOT NULL THEN 1 END) as with_entity_counts,
        COUNT(CASE WHEN template_id IS NOT NULL AND entity_counts != '{}'::jsonb THEN 1 END) as with_both
       FROM documents
       WHERE template_id = $1`,
      [templateId]
    );
    
    // Check view data
    const viewCheck = await pool.query(
      `SELECT * FROM aggregated_template_entity_view WHERE template_id = $1`,
      [templateId]
    );
    
    // Check template_entity_profile
    const profileCheck = await pool.query(
      `SELECT * FROM template_entity_profile WHERE template_id = $1`,
      [templateId]
    );
    
    // Sample a few documents to see their entity_counts
    const sampleDocs = await pool.query(
      `SELECT id, name, template_id, 
              CASE WHEN entity_counts = '{}'::jsonb THEN 'empty' ELSE 'has_data' END as entity_counts_status,
              entity_counts
       FROM documents
       WHERE template_id = $1
       LIMIT 5`,
      [templateId]
    );
    
    res.json({
      templateId,
      documents: documentsCheck.rows[0],
      viewData: viewCheck.rows[0] || null,
      profileData: profileCheck.rows[0] || null,
      sampleDocuments: sampleDocs.rows,
      recommendations: {
        needsExtraction: documentsCheck.rows[0].with_entity_counts === '0',
        needsRebuild: viewCheck.rows.length === 0 && documentsCheck.rows[0].with_both > 0,
        needsDocumentPurposeRebuild: documentsCheck.rows[0].with_template_id > 0 && documentsCheck.rows[0].with_entity_counts === '0'
      }
    });
  } catch (error) {
    log.error('Diagnostic error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

