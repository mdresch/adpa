import { Router } from 'express';
import { ProjectsController } from './ProjectsController';
import {
  ProjectContextItemsController,
  projectContextItemsUploadMiddleware,
} from './ProjectContextItemsController';
import { RouteConfig } from '../../routes/registry';
import { authenticateToken } from '../../middleware/auth';

const router = Router();

/**
 * Modular Project Routes
 * These are automatically discovered and mounted under /api/v1/projects
 * 
 * Precedence: Specific routes before parameter routes.
 */

// Test endpoint: GET /api/v1/projects/modular-test
router.get('/modular-test', ProjectsController.testModular);

// Project context items (must be before /:id)
router.get('/:id/context-items/analytics', authenticateToken, ProjectContextItemsController.analytics);
router.get('/:id/context-items/recommendations', authenticateToken, ProjectContextItemsController.recommendations);
router.get('/:id/context-items/integration-pages', authenticateToken, ProjectContextItemsController.integrationPages);
router.post('/:id/context-items/fetch-url', authenticateToken, ProjectContextItemsController.fetchUrl);
router.post(
  '/:id/context-items/:itemId/log-usage',
  authenticateToken,
  ProjectContextItemsController.logUsage
);
router.put('/:id/context-items/:itemId', authenticateToken, ProjectContextItemsController.update);
router.delete('/:id/context-items/:itemId', authenticateToken, ProjectContextItemsController.remove);
router.get('/:id/context-items', authenticateToken, ProjectContextItemsController.list);
router.post(
  '/:id/context-items',
  authenticateToken,
  projectContextItemsUploadMiddleware,
  ProjectContextItemsController.create
);

// Core CRUD Operations
router.get('/', authenticateToken, ProjectsController.getAll);
router.get('/:id', authenticateToken, ProjectsController.getById);
router.post('/', authenticateToken, ProjectsController.create);
router.put('/:id', authenticateToken, ProjectsController.update);
router.delete('/:id', authenticateToken, ProjectsController.delete);
router.get('/:id/integrations', authenticateToken, ProjectsController.getIntegrations);
router.get('/:id/drift-detections', authenticateToken, ProjectsController.getDriftDetections);

const routes: RouteConfig[] = [
  {
    path: '/projects',
    router: router,
    version: '1',
    category: 'Projects'
  }
];

export default routes;
