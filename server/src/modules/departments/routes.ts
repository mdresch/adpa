import { Router } from 'express';
import { UserDepartmentsController } from './UserDepartmentsController';
import { authenticateToken, requireRole } from '../../middleware/auth';
import { RouteConfig } from '../../routes/registry';

const router = Router();
const departments = new UserDepartmentsController();

/**
 * Modular Department Membership Routes (ADR-005 Phase 0)
 * Mounted under /api/v1/departments
 */
router.get('/portfolios/:portfolioId/members', authenticateToken, requireRole(['admin', 'super_admin']), departments.listByPortfolio);
router.get('/users/:userId', authenticateToken, departments.listByUser); // self-or-admin checked in the handler
router.post('/users/:userId/memberships', authenticateToken, requireRole(['admin', 'super_admin']), departments.create);
router.patch('/memberships/:id', authenticateToken, requireRole(['admin', 'super_admin']), departments.setActive);

const departmentRoutes: RouteConfig[] = [
  {
    path: '/departments',
    router: router,
    version: '1',
    category: 'Departments'
  }
];

export default departmentRoutes;
