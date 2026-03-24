import express from 'express';
import { pool } from '../database/connection';
import { childLogger } from '../utils/logger';
import { authenticateToken } from '../middleware/auth';
import { aiProviderService } from '../services/aiProviderService';

const router = express.Router();

/**
 * AI Model Management Routes
 * Mounted under /api/ai-models
 */

/**
 * GET /api/ai-models/providers/:providerId/models
 * Get all models for a specific provider
 */
router.get('/providers/:providerId/models', async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId });
  try {
    const { providerId } = req.params;

    const result = await pool.query(
      'SELECT id, name, provider_type, configuration, available_models, default_model FROM ai_providers WHERE id = $1',
      [providerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    const provider = result.rows[0];
    
    // Parse available models if it's a string/JSON
    let models = [];
    if (provider.available_models) {
      models = Array.isArray(provider.available_models) 
        ? provider.available_models 
        : (typeof provider.available_models === 'string' ? JSON.parse(provider.available_models) : []);
    } else if (provider.configuration?.models) {
      models = provider.configuration.models;
    }

    // Ensure models is an array of objects
    const formattedModels = models.map((m: any) => {
      if (typeof m === 'string') {
        return { id: m, name: m, enabled: true };
      }
      return m;
    });

    res.json({
      success: true,
      provider: {
        id: provider.id,
        name: provider.name,
        type: provider.provider_type,
        default_model: provider.default_model || provider.configuration?.model
      },
      models: formattedModels
    });
  } catch (error) {
    log.error('Get provider models error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/ai-models/providers/:providerId/models/:modelId
 * Get configuration for a specific model
 */
router.get('/providers/:providerId/models/:modelId', async (req, res) => {
  try {
    const { providerId, modelId } = req.params;
    
    const result = await pool.query(
      'SELECT available_models FROM ai_providers WHERE id = $1',
      [providerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    const models = result.rows[0].available_models || [];
    const model = models.find((m: any) => (m.id === modelId || m === modelId));

    if (!model) {
      return res.status(404).json({ error: 'Model not found' });
    }

    res.json({
      success: true,
      model: typeof model === 'string' ? { id: model, name: model } : model
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/ai-models/providers/:providerId/models
 * Add or update model configuration for a provider
 */
router.post('/providers/:providerId/models', async (req, res) => {
  try {
    const { providerId } = req.params;
    const modelData = req.body;

    const result = await pool.query(
      'SELECT available_models FROM ai_providers WHERE id = $1',
      [providerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    let models = result.rows[0].available_models || [];
    if (typeof models === 'string') models = JSON.parse(models);

    // Update or add the model
    const existingIndex = models.findIndex((m: any) => (m.id === modelData.id || m === modelData.id));
    if (existingIndex >= 0) {
      models[existingIndex] = modelData;
    } else {
      models.push(modelData);
    }

    await pool.query(
      'UPDATE ai_providers SET available_models = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [JSON.stringify(models), providerId]
    );

    res.json({
      success: true,
      message: 'Model configuration updated successfully',
      model: modelData
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/ai-models/providers/:providerId/test-connectivity
 * Test connectivity for a specific provider
 */
router.post('/providers/:providerId/test-connectivity', async (req, res) => {
  const log = childLogger({ requestId: (req as any).requestId });
  try {
    const { providerId } = req.params;
    
    log.info(`Testing connectivity for provider: ${providerId}`);
    const success = await aiProviderService.testProviderById(providerId);

    if (success) {
      res.json({
        success: true,
        message: 'Connectivity test passed'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Connectivity test failed'
      });
    }
  } catch (error: any) {
    log.error('Test connectivity error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Internal server error' 
    });
  }
});

export default router;
