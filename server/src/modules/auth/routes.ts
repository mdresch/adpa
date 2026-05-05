import { Router } from 'express';
import { AuthController } from './AuthController';
import { RouteConfig } from '../../routes/registry';
import { authenticateToken } from '../../middleware/auth';

const router = Router();

/**
 * Modular Auth Routes
 * These are automatically discovered and mounted under /api/v1/auth
 */

// Public routes
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/demo', AuthController.demo);

// Protected routes
router.get('/me', authenticateToken, AuthController.getMe);
router.post('/bootstrap-elevation', authenticateToken, AuthController.claimBootstrapElevation);
router.post('/logout', authenticateToken, AuthController.logout);
router.post('/refresh', authenticateToken, AuthController.refresh);
router.post('/change-password', authenticateToken, AuthController.changePassword);

const routes: RouteConfig[] = [
  {
    path: '/auth',
    router: router,
    version: '1',
    category: 'Auth'
  }
];

export default routes;
