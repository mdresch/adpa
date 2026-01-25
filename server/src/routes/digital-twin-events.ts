/**
 * Digital Twin Events API
 * GET /api/digital-twin/events?assetId=..., GET /api/digital-twin/events/pending,
 * GET /api/digital-twin/events/:id, POST /api/digital-twin/events (ingest),
 * POST /api/digital-twin/events/:id/retry
 */

import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  ingestEvent,
  processEvent,
  retryFailedEvent,
  getPendingEvents,
  getEventById,
  getEventHistory,
  type IngestEventInput,
  type EventType,
} from '../services/digitalTwinEventService';
import { getAssetById } from '../services/digitalTwinAssetService';
import { logger } from '../utils/logger';

const router = Router();
const PLATFORMS = ['iTwin', 'AzureDT', 'Generic'] as const;
const EVENT_TYPES = [
  'state_change',
  'attribute_change',
  'relationship_change',
  'creation',
  'deletion',
  'alert',
  'sync_error',
] as const;

/**
 * GET /api/digital-twin/events/pending?limit=100
 */
router.get('/pending', authenticateToken, async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit || '100'), 10) || 100, 500);
    const events = await getPendingEvents(limit);
    res.json({ events });
  } catch (e: any) {
    logger.error('Digital Twin pending events failed', { error: e?.message });
    res.status(500).json({ error: 'Failed to list pending events' });
  }
});

/**
 * GET /api/digital-twin/events?assetId=...&limit=50
 */
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const assetId = (req.query.assetId ?? req.query.asset_id) as string | undefined;
    if (!assetId) {
      return res.status(400).json({ error: 'assetId (or asset_id) query is required' });
    }
    const limit = Math.min(parseInt(String(req.query.limit || '50'), 10) || 50, 200);
    const events = await getEventHistory(assetId, limit);
    res.json({ events });
  } catch (e: any) {
    logger.error('Digital Twin event history failed', { error: e?.message });
    res.status(500).json({ error: 'Failed to list events' });
  }
});

/**
 * POST /api/digital-twin/events
 * Body: IngestEventInput (asset_id, event_type, event_payload, platform_type, ...)
 */
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { asset_id, event_type, event_payload, event_summary, platform_event_id, platform_type, event_timestamp } = req.body ?? {};
    if (!asset_id || !event_type || !platform_type) {
      return res.status(400).json({
        error: 'asset_id, event_type, and platform_type are required',
      });
    }
    if (!EVENT_TYPES.includes(event_type)) {
      return res.status(400).json({
        error: `event_type must be one of: ${EVENT_TYPES.join(', ')}`,
      });
    }
    if (!PLATFORMS.includes(platform_type)) {
      return res.status(400).json({
        error: `platform_type must be one of: ${PLATFORMS.join(', ')}`,
      });
    }
    const asset = await getAssetById(asset_id);
    if (!asset) return res.status(404).json({ error: 'Asset not found' });

    const input: IngestEventInput = {
      asset_id,
      event_type: event_type as EventType,
      event_payload: event_payload && typeof event_payload === 'object' ? event_payload : {},
      event_summary: event_summary ?? null,
      platform_event_id: platform_event_id ?? null,
      platform_type,
      event_timestamp: event_timestamp ?? new Date(),
    };
    const event = await ingestEvent(input);
    res.status(201).json({ event });
  } catch (e: any) {
    logger.error('Digital Twin event ingest failed', { error: e?.message });
    if (e?.message === 'Asset not found') return res.status(404).json({ error: 'Asset not found' });
    res.status(500).json({ error: 'Failed to ingest event' });
  }
});

/**
 * POST /api/digital-twin/events/:id/process
 * Process a pending event (create state, mark completed).
 */
router.post('/:id/process', authenticateToken, async (req: Request, res: Response) => {
  try {
    await processEvent(req.params.id);
    const event = await getEventById(req.params.id);
    res.json({ event });
  } catch (e: any) {
    logger.error('Digital Twin event process failed', { error: e?.message });
    if (e?.message === 'Event not found') return res.status(404).json({ error: 'Event not found' });
    res.status(500).json({ error: 'Failed to process event' });
  }
});

/**
 * POST /api/digital-twin/events/:id/retry
 * Retry a failed event.
 */
router.post('/:id/retry', authenticateToken, async (req: Request, res: Response) => {
  try {
    await retryFailedEvent(req.params.id);
    const event = await getEventById(req.params.id);
    res.json({ event });
  } catch (e: any) {
    logger.error('Digital Twin event retry failed', { error: e?.message });
    if (e?.message === 'Event not found') return res.status(404).json({ error: 'Event not found' });
    if (e?.message === 'Only failed events can be retried') {
      return res.status(400).json({ error: e.message });
    }
    res.status(500).json({ error: 'Failed to retry event' });
  }
});

/**
 * GET /api/digital-twin/events/:id
 */
router.get('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const event = await getEventById(req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    res.json({ event });
  } catch (e: any) {
    logger.error('Digital Twin event get failed', { error: e?.message });
    res.status(500).json({ error: 'Failed to get event' });
  }
});

export default router;
