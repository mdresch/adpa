/**
 * Digital Twin Ingestion API
 * GET/POST /api/digital-twin/ingestion/sources, GET/PUT .../sources/:id,
 * POST .../sources/:id/start, POST .../sources/:id/pause
 */

import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  createIngestionSource,
  getIngestionSources,
  getIngestionSourceById,
  updateIngestionSource,
  startSync,
  pauseSync,
  type IngestionSourceInput,
  type PlatformType,
} from '../services/digitalTwinIngestionService';
import { logger } from '../utils/logger';

const router = Router();
const PLATFORMS: PlatformType[] = ['iTwin', 'AzureDT', 'Generic'];
const SYNC_MODES = ['realtime', 'polling', 'batch', 'manual'] as const;

/**
 * GET /api/digital-twin/ingestion/sources?projectId=...
 */
router.get('/sources', authenticateToken, async (req: Request, res: Response) => {
  try {
    const projectId = (req.query.projectId ?? req.query.project_id) as string | undefined;
    if (!projectId) {
      return res.status(400).json({ error: 'projectId query is required' });
    }
    const sources = await getIngestionSources(projectId);
    res.json({ sources });
  } catch (e: any) {
    logger.error('Digital Twin ingestion sources list failed', { error: e?.message });
    res.status(500).json({ error: 'Failed to list ingestion sources' });
  }
});

/**
 * POST /api/digital-twin/ingestion/sources
 * Body: { projectId, name, platform_type, connection_config, sync_mode?, poll_interval_seconds?, is_active? }
 */
router.post('/sources', authenticateToken, async (req: Request, res: Response) => {
  try {
    const projectId = (req.body?.projectId ?? req.body?.project_id) as string | undefined;
    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required' });
    }
    const { name, platform_type, connection_config, sync_mode, poll_interval_seconds, is_active } = req.body ?? {};
    if (!name || !platform_type) {
      return res.status(400).json({ error: 'name and platform_type are required' });
    }
    if (!PLATFORMS.includes(platform_type)) {
      return res.status(400).json({ error: `platform_type must be one of: ${PLATFORMS.join(', ')}` });
    }
    const sync = sync_mode && SYNC_MODES.includes(sync_mode) ? sync_mode : 'manual';
    const input: IngestionSourceInput = {
      name,
      platform_type,
      connection_config: connection_config && typeof connection_config === 'object' ? connection_config : {},
      sync_mode: sync,
      poll_interval_seconds: poll_interval_seconds ?? 60,
      is_active,
    };
    const source = await createIngestionSource(projectId, input);
    res.status(201).json({ source });
  } catch (e: any) {
    logger.error('Digital Twin ingestion source create failed', { error: e?.message });
    res.status(500).json({ error: 'Failed to create ingestion source' });
  }
});

/**
 * POST /api/digital-twin/ingestion/sources/:id/start
 */
router.post('/sources/:id/start', authenticateToken, async (req: Request, res: Response) => {
  try {
    const source = await getIngestionSourceById(req.params.id);
    if (!source) return res.status(404).json({ error: 'Ingestion source not found' });
    await startSync(req.params.id);
    const updated = await getIngestionSourceById(req.params.id);
    res.json({ source: updated });
  } catch (e: any) {
    logger.error('Digital Twin ingestion start failed', { error: e?.message });
    res.status(500).json({ error: 'Failed to start sync' });
  }
});

/**
 * POST /api/digital-twin/ingestion/sources/:id/pause
 */
router.post('/sources/:id/pause', authenticateToken, async (req: Request, res: Response) => {
  try {
    const source = await getIngestionSourceById(req.params.id);
    if (!source) return res.status(404).json({ error: 'Ingestion source not found' });
    await pauseSync(req.params.id);
    const updated = await getIngestionSourceById(req.params.id);
    res.json({ source: updated });
  } catch (e: any) {
    logger.error('Digital Twin ingestion pause failed', { error: e?.message });
    res.status(500).json({ error: 'Failed to pause sync' });
  }
});

/**
 * GET /api/digital-twin/ingestion/sources/:id
 */
router.get('/sources/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const source = await getIngestionSourceById(req.params.id);
    if (!source) return res.status(404).json({ error: 'Ingestion source not found' });
    res.json({ source });
  } catch (e: any) {
    logger.error('Digital Twin ingestion source get failed', { error: e?.message });
    res.status(500).json({ error: 'Failed to get ingestion source' });
  }
});

/**
 * PUT /api/digital-twin/ingestion/sources/:id
 */
router.put('/sources/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const updates = req.body ?? {};
    const source = await updateIngestionSource(req.params.id, updates);
    if (!source) return res.status(404).json({ error: 'Ingestion source not found' });
    res.json({ source });
  } catch (e: any) {
    logger.error('Digital Twin ingestion source update failed', { error: e?.message });
    res.status(500).json({ error: 'Failed to update ingestion source' });
  }
});

/**
 * POST /api/digital-twin/ingestion/webhook/:sourceId
 * Webhook endpoint for platforms to send events
 */
router.post('/webhook/:sourceId', async (req: Request, res: Response) => {
  try {
    const { sourceId } = req.params;
    const source = await getIngestionSourceById(sourceId);
    if (!source) {
      return res.status(404).json({ error: 'Ingestion source not found' });
    }

    // Get connector and handle webhook
    const { connectorManager } = await import('../services/connectors/connectorManager');
    await connectorManager.handleWebhook(sourceId, req.body);

    res.json({ success: true, message: 'Webhook processed' });
  } catch (e: any) {
    logger.error('Digital Twin webhook processing failed', { error: e?.message, sourceId: req.params.sourceId });
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

export default router;
