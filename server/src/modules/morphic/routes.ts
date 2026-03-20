import { Router } from 'express';
import { MorphicController } from './MorphicController';
import { authenticateToken } from '../../middleware/auth';
import { RouteConfig } from '../../routes/registry';

const router = Router();

/**
 * Morphic (AI-Search) Routes
 * Mounted under /api/v1/morphic
 */

// AI Search & Chat
router.post('/chat', authenticateToken, (req, res) => MorphicController.chat(req, res));

// History
router.get('/history', authenticateToken, (req, res) => MorphicController.getHistory(req, res));

// Specific Chat
router.get('/chat/:id', authenticateToken, (req, res) => MorphicController.getChat(req, res));
router.delete('/chat/:id', authenticateToken, (req, res) => MorphicController.deleteChat(req, res));

const routes: RouteConfig[] = [
    {
        path: '/morphic',
        router: router,
        version: '1',
        category: 'AI-Search'
    }
];

export default routes;
