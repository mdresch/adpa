import { Router } from 'express';
import { ProjectsController } from './ProjectsController';
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

// Core CRUD Operations
router.get('/', authenticateToken, ProjectsController.getAll);
router.get('/:id', authenticateToken, ProjectsController.getById);
router.post('/', authenticateToken, ProjectsController.create);
router.put('/:id', authenticateToken, ProjectsController.update);
router.delete('/:id', authenticateToken, ProjectsController.delete);

const routes: RouteConfig[] = [
  {
    path: '/projects',
    router: router,
    version: '1',
    category: 'Projects'
  }
];

export default routes;
