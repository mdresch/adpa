import express from 'express';
import { AuthController } from '../modules/auth/AuthController';
import { authenticateToken } from '../middleware/auth';

/**
 * Minimal Express app for integration testing.
 * Bypasses the complex routes/registry chain to avoid hangs.
 */
export function createTestApp() {
  const app = express();
  app.use(express.json());

  // Manually mount the Auth routes we need for Issue #613
  const router = express.Router();
  
  router.post('/register', AuthController.register);
  router.post('/login', AuthController.login);
  router.get('/me', authenticateToken, AuthController.getMe);
  router.post('/logout', authenticateToken, AuthController.logout);
  router.post('/refresh', authenticateToken, AuthController.refresh);

  app.use('/api/auth', router);

  return app;
}

export const app = createTestApp();
