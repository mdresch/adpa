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

// Config & Administrative
router.get('/config/models', authenticateToken, (req, res) => MorphicController.getModelsConfig(req, res));

// Admin - AI Providers
router.get('/admin/providers', authenticateToken, (req, res) => MorphicController.listAIProviders(req, res));
router.post('/admin/providers', authenticateToken, (req, res) => MorphicController.upsertAIProvider(req, res));

// Admin - AI Models
router.get('/admin/models', authenticateToken, (req, res) => MorphicController.listAIModels(req, res));
router.post('/admin/models', authenticateToken, (req, res) => MorphicController.upsertAIModel(req, res));

// Admin - AI Model Config Slots
router.get('/admin/config', authenticateToken, (req, res) => MorphicController.getAIModelConfigs(req, res));
router.post('/admin/config', authenticateToken, (req, res) => MorphicController.upsertAIModelConfig(req, res));

const routes: RouteConfig[] = [
    {
        path: '/morphic',
        router: router,
        version: '1',
        category: 'AI-Search'
    }
];

export default routes;
