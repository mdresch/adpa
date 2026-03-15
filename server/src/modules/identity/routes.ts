import { Router } from 'express';
import { UsersController } from './UsersController';
import { CompaniesController } from './CompaniesController';
import { authenticateToken, requireRole } from '../../middleware/auth';
import { RouteConfig } from '../../routes/registry';

const router = Router();
const users = new UsersController();
const companies = new CompaniesController();

/**
 * Modular Identity Routes
 * Mounted under /api/v1/identity
 */

// User Preferences (Current User)
router.get('/users/me/preferences', authenticateToken, users.getPreferences);
router.put('/users/me/preferences', authenticateToken, users.updatePreferences);

// User Management (Admin Only)
router.get('/users', authenticateToken, requireRole(['admin', 'super_admin']), users.getAll);
router.get('/users/:id', authenticateToken, users.getById);
router.post('/users', authenticateToken, requireRole(['admin', 'super_admin']), users.create);
router.put('/users/:id', authenticateToken, users.update);

// Company Management (Super Admin/Admin)
router.get('/companies', authenticateToken, requireRole(['admin', 'super_admin']), companies.getAll);
router.get('/companies/:id', authenticateToken, companies.getById);
router.post('/companies', authenticateToken, requireRole(['super_admin']), companies.create);
router.put('/companies/:id', authenticateToken, requireRole(['super_admin', 'admin']), companies.update);
router.delete('/companies/:id', authenticateToken, requireRole(['super_admin']), companies.delete);

const identityRoutes: RouteConfig[] = [
  {
    path: '/identity',
    router: router,
    version: '1',
    category: 'Identity'
  }
];

export default identityRoutes;
