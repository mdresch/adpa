import { Router } from 'express';
import { AnalyticsController } from './AnalyticsController';
import { authenticateToken, requirePermission } from '../../middleware/auth';
import { RouteConfig } from '../../routes/registry';

const router = Router();
const controller = new AnalyticsController();

/**
 * Modular Intelligence Routes
 * Mounted under /api/v1/intelligence
 */

router.get('/dashboard', authenticateToken, controller.getDashboard);
router.get('/system', authenticateToken, requirePermission('analytics.system'), controller.getSystem);
router.post('/events', authenticateToken, controller.trackEvent);
router.get('/metrics', controller.getMetrics);

const intelligenceRoutes: RouteConfig[] = [
  {
    path: '/intelligence',
    router: router,
    version: '1',
    category: 'Intelligence'
  }
];

export default intelligenceRoutes;
