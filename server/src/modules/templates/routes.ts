import express from 'express';
import { TemplateController } from './TemplateController';
import { authenticateToken, requirePermission, requireRole } from '../../middleware/auth';
import { validate, validateParams, validateQuery } from '../../middleware/validation';
import Joi from 'joi';

const router = express.Router();
const controller = new TemplateController();

// Template CRUD
router.get('/', authenticateToken, controller.getAll);
router.get('/trash', authenticateToken, requirePermission('templates.view'), controller.getTrash);
router.get('/:id', authenticateToken, controller.getById);
router.post('/', authenticateToken, requirePermission('templates.create'), controller.create);
router.put('/:id', authenticateToken, requirePermission('templates.update'), controller.update);
router.post('/:id/restore', authenticateToken, requirePermission('templates.update'), controller.restore);
router.delete('/:id', authenticateToken, requirePermission('templates.delete'), controller.softDelete);
router.delete('/:id/hard', authenticateToken, requirePermission('templates.delete'), controller.hardDelete);

// Template Lifecycle & Actions
router.post('/:id/promote-to-company', authenticateToken, requireRole(['admin', 'super_admin']), controller.promoteToCompany);
router.post('/:id/promote-to-standard', authenticateToken, requireRole(['super_admin']), controller.promoteToStandard);
router.post('/:id/clone', authenticateToken, requirePermission('templates.create'), controller.clone);
router.post('/:id/use', authenticateToken, controller.use);
router.post('/:id/promote', authenticateToken, requirePermission('templates.update'), controller.promoteStatus);
router.post('/:id/archive', authenticateToken, requirePermission('templates.update'), controller.archive);
router.post('/:id/compliance/approve', authenticateToken, requirePermission('templates.update'), controller.approveCompliance);

// Analytics & Stats
router.get('/:id/versions', authenticateToken, controller.getVersions);
router.get('/:id/metrics', authenticateToken, controller.getMetrics);
router.get('/:id/performance', authenticateToken, controller.getPerformance);
router.get('/:id/trends', authenticateToken, controller.getTrends);
router.get('/:id/maintenance', authenticateToken, controller.getMaintenanceLog);

// Standalone Analytics & Stats
router.get('/analytics/dashboard', authenticateToken, controller.getDashboard);
router.get('/statistics', authenticateToken, controller.getStats);
router.get('/statistics/:templateId', authenticateToken, controller.getStatsById);

// Admin Analytics Rebuild
router.post('/analytics/refresh', authenticateToken, requireRole(['admin', 'super_admin']), controller.refreshAnalytics);
router.post('/analytics/rebuild-entity-profiles', authenticateToken, requireRole(['admin', 'super_admin']), controller.rebuildEntityProfiles);
router.post('/analytics/rebuild-template/:templateId', authenticateToken, requireRole(['admin', 'super_admin']), controller.rebuildTemplateAnalytics);
router.post('/analytics/rebuild-document-purposes/:projectId', authenticateToken, requireRole(['admin', 'super_admin']), controller.rebuildDocumentPurposes);
router.post('/analytics/rebuild-all', authenticateToken, requireRole(['admin', 'super_admin']), controller.rebuildAll);
router.get('/analytics/diagnostic/:templateId', authenticateToken, requireRole(['admin', 'super_admin']), controller.getDiagnostic);

export default router;
