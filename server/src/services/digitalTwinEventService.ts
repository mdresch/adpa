import { pool } from '../database/connection'
import { logger } from '../utils/logger'
import { v4 as uuidv4 } from 'uuid'

export type PlatformType = 'iTwin' | 'AzureDT' | 'Generic' | 'Visio'

export interface DigitalTwinEventInput {
  asset_id: string
  event_type: 'state_change' | 'attribute_change' | 'relationship_change' | 'creation' | 'deletion' | 'alert' | 'sync_error'
  event_payload: any
  event_summary?: string
  platform_event_id?: string
  platform_type: PlatformType
  event_timestamp: Date
  processing_status?: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped'
}

export type EventType = DigitalTwinEventInput['event_type'];
export type IngestEventInput = DigitalTwinEventInput;

/**
 * Log an incoming event
 */
export async function ingestEvent(data: DigitalTwinEventInput) {
  try {
    const {
      asset_id, event_type, event_payload, event_summary,
      platform_event_id, platform_type, event_timestamp, processing_status = 'pending'
    } = data

    const res = await pool.query(
      `INSERT INTO digital_twin_events 
       (asset_id, event_type, event_payload, event_summary, platform_event_id, platform_type, event_timestamp, processing_status, ingested_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING *`,
      [asset_id, event_type, JSON.stringify(event_payload), event_summary, platform_event_id, platform_type, event_timestamp, processing_status]
    )

    const event = res.rows[0]

    // Trigger Rule Evaluation
    // We process asynchronously so we don't block the ingestion response
    try {
      const { evaluateTriggerRules } = await import('./digitalTwinTriggerService')
      // Fire and forget (or could await if critical)
      evaluateTriggerRules(event.asset_id, event.asset_id, event.id, event.event_type)
        .catch(err => logger.error({ error: err.message, eventId: event.id }, 'Failed to evaluate triggers'))
    } catch (err) {
      logger.error({ error: err }, 'Failed to import digitalTwinTriggerService')
    }

    return event
  } catch (error) {
    logger.error({ error }, 'digitalTwinEventService.ingestEvent error')
    throw error
  }
}

export async function getEventsByAsset(assetId: string, limit = 50) {
  try {
    const res = await pool.query(
      `SELECT * FROM digital_twin_events WHERE asset_id = $1 ORDER BY event_timestamp DESC LIMIT $2`,
      [assetId, limit]
    )
    return res.rows
  } catch (error) {
    logger.error({ error }, 'digitalTwinEventService.getEventsByAsset error')
    throw error
  }
}

// Alias for route compatibility
export const getEventHistory = getEventsByAsset;

export async function getEventById(id: string) {
  try {
    const res = await pool.query(
      `SELECT * FROM digital_twin_events WHERE id = $1`,
      [id]
    )
    return res.rows[0] || null
  } catch (error) {
    logger.error({ error }, 'digitalTwinEventService.getEventById error')
    throw error
  }
}

export async function getPendingEvents(limit = 100) {
  try {
    const res = await pool.query(
      `SELECT * FROM digital_twin_events WHERE processing_status = 'pending' ORDER BY event_timestamp ASC LIMIT $1`,
      [limit]
    )
    return res.rows
  } catch (error) {
    logger.error({ error }, 'digitalTwinEventService.getPendingEvents error')
    throw error
  }
}

export async function updateEventStatus(eventId: string, status: string, error?: string) {
  try {
    await pool.query(
      `UPDATE digital_twin_events SET processing_status = $1, processing_error = $2, processed_at = NOW() WHERE id = $3`,
      [status, error, eventId]
    )
  } catch (error) {
    logger.error({ error }, 'digitalTwinEventService.updateEventStatus error')
    throw error
  }
}

export async function processEvent(eventId: string) {
  try {
    // Basic implementation: find event and trigger rules
    const event = await getEventById(eventId);
    if (!event) throw new Error('Event not found');

    await updateEventStatus(eventId, 'processing');

    const { evaluateTriggerRules } = await import('./digitalTwinTriggerService');
    await evaluateTriggerRules(event.asset_id, event.asset_id, event.id, event.event_type);

    await updateEventStatus(eventId, 'completed');
  } catch (error) {
    logger.error({ error }, 'digitalTwinEventService.processEvent error')
    await updateEventStatus(eventId, 'failed', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

export async function retryFailedEvent(eventId: string) {
  try {
    const event = await getEventById(eventId);
    if (!event) throw new Error('Event not found');
    if (event.processing_status !== 'failed') {
      throw new Error('Only failed events can be retried');
    }
    return processEvent(eventId);
  } catch (error) {
    logger.error({ error }, 'digitalTwinEventService.retryFailedEvent error')
    throw error;
  }
}

export const digitalTwinEventService = {
  ingestEvent,
  getEventsByAsset,
  getEventHistory,
  getEventById,
  getPendingEvents,
  updateEventStatus,
  processEvent,
  retryFailedEvent
}
