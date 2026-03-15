import { Router } from 'express';
import { IntegrationController } from './IntegrationController';
import { authenticateToken, requirePermission } from '../../middleware/auth';
import { RouteConfig } from '../../routes/registry';

const router = Router();
const controller = new IntegrationController();

/**
 * Modular Integration Routes
 * Mounted under /api/v1/integrations
 */

router.get('/', authenticateToken, controller.getAll);
router.get('/:id', authenticateToken, controller.getById);
router.post('/', authenticateToken, requirePermission('integrations.create'), controller.create);
router.put('/:id', authenticateToken, requirePermission('integrations.update'), controller.update);
router.delete('/:id', authenticateToken, requirePermission('integrations.delete'), controller.delete);

const integrationRoutes: RouteConfig[] = [
  {
    path: '/integrations',
    router: router,
    version: '1',
    category: 'Integrations'
  }
];

export default integrationRoutes;
