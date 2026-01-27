/**
 * Digital Twin Event Service
 * Ingest events, process (create state from event), retry failed.
 * @see plans/DIGITAL_TWIN_POC_IMPLEMENTATION_PLAN_REVISED.md
 */

import { getDatabasePool } from '../database/connection';
import { logger } from '../utils/logger';
import { calculateStateHash, detectChangedFields, generateStateDiff } from '../utils/digitalTwinStateUtils';
import { getAssetById, getCurrentState } from './digitalTwinAssetService';
import type { PlatformType } from './digitalTwinAssetService';
import { evaluateTriggerRules } from './digitalTwinTriggerService';

const EVENT_TYPES = [
  'state_change',
  'attribute_change',
  'relationship_change',
  'creation',
  'deletion',
  'alert',
  'sync_error',
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export interface DigitalTwinEvent {
  id: string;
  asset_id: string;
  event_type: EventType;
  event_payload: Record<string, unknown>;
  event_summary: string | null;
  platform_event_id: string | null;
  platform_type: PlatformType;
  processed_at: Date | null;
  processing_status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';
  processing_error: string | null;
  retry_count: number;
  event_timestamp: Date;
  ingested_at: Date;
}

export interface IngestEventInput {
  asset_id: string;
  event_type: EventType;
  event_payload: Record<string, unknown>;
  event_summary?: string | null;
  platform_event_id?: string | null;
  platform_type: PlatformType;
  event_timestamp?: Date | string;
}

const pool = () => getDatabasePool();

function parseEvent(row: any): DigitalTwinEvent {
  const e = row as DigitalTwinEvent;
  if (typeof e.event_payload === 'string') {
    try {
      (e as any).event_payload = JSON.parse(e.event_payload);
    } catch {
      (e as any).event_payload = {};
    }
  }
  return e;
}

/**
 * Idempotent ingest: insert event. On conflict (platform_event_id, platform_type, asset_id), return existing.
 */
export async function ingestEvent(input: IngestEventInput): Promise<DigitalTwinEvent> {
  const asset = await getAssetById(input.asset_id);
  if (!asset) throw new Error('Asset not found');

  const ts = input.event_timestamp
    ? new Date(input.event_timestamp)
    : new Date();
  const payload = input.event_payload && typeof input.event_payload === 'object'
    ? input.event_payload
    : {};
  const payloadJson = JSON.stringify(payload);

  if (input.platform_event_id != null && input.platform_event_id !== '') {
    const existing = await pool().query(
      `SELECT * FROM digital_twin_events
       WHERE platform_event_id = $1 AND platform_type = $2 AND asset_id = $3`,
      [input.platform_event_id, input.platform_type, input.asset_id]
    );
    if (existing.rows.length > 0) {
      logger.info('Digital Twin event dedup: already ingested', {
        platform_event_id: input.platform_event_id,
        asset_id: input.asset_id,
      });
      return parseEvent(existing.rows[0]);
    }
  }

  const res = await pool().query(
    `INSERT INTO digital_twin_events (
       asset_id, event_type, event_payload, event_summary,
       platform_event_id, platform_type, event_timestamp
     ) VALUES ($1, $2, $3::jsonb, $4, $5, $6, $7)
     RETURNING *`,
    [
      input.asset_id,
      input.event_type,
      payloadJson,
      input.event_summary ?? null,
      input.platform_event_id ?? null,
      input.platform_type,
      ts,
    ]
  );
  const row = res.rows[0];
  const event = parseEvent(row);
  logger.info('Digital Twin event ingested', { eventId: event.id, asset_id: input.asset_id, event_type: input.event_type });

  // Queue event for processing
  try {
    const { digitalTwinEventQueue } = await import('../services/queueService');
    await digitalTwinEventQueue.add('process-event', { eventId: event.id }, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    });
    logger.debug('Digital Twin event queued for processing', { eventId: event.id });
  } catch (error: any) {
    logger.error('Failed to queue event for processing', { eventId: event.id, error: error.message });
    // Don't throw - event is still ingested, just not queued
  }

  return event;
}

/**
 * Process event: create state from event, mark completed/failed.
 */
export async function processEvent(eventId: string): Promise<void> {
  const ev = await pool().query(
    `SELECT * FROM digital_twin_events WHERE id = $1`,
    [eventId]
  );
  const row = ev.rows[0];
  if (!row) throw new Error('Event not found');
  const event = parseEvent(row);

  if (event.processing_status === 'completed') {
    logger.info('Digital Twin event already completed', { eventId });
    return;
  }
  if (event.processing_status === 'skipped') return;

  await pool().query(
    `UPDATE digital_twin_events
     SET processing_status = 'processing', processed_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [eventId]
  );

  try {
    const { id: stateId } = await createStateFromEvent(eventId);
    await evaluateTriggerRules(event.asset_id, stateId, eventId, event.event_type);
    await pool().query(
      `UPDATE digital_twin_events
       SET processing_status = 'completed', processing_error = NULL
       WHERE id = $1`,
      [eventId]
    );
  } catch (err: any) {
    const msg = err?.message || String(err);
    await pool().query(
      `UPDATE digital_twin_events
       SET processing_status = 'failed', processing_error = $2
       WHERE id = $1`,
      [eventId, msg]
    );
    logger.error('Digital Twin event processing failed', { eventId, error: msg });
    throw err;
  }
}

/**
 * Create state snapshot from event. Uses event_payload as state_snapshot; computes hash and changed fields.
 */
export async function createStateFromEvent(eventId: string): Promise<{ id: string }> {
  const ev = await pool().query(
    `SELECT * FROM digital_twin_events WHERE id = $1`,
    [eventId]
  );
  const row = ev.rows[0];
  if (!row) throw new Error('Event not found');
  const event = parseEvent(row);

  const prevState = await getCurrentState(event.asset_id);
  const prevSnapshot = (prevState?.state_snapshot as Record<string, unknown>) ?? null;
  const newSnapshot = event.event_payload && typeof event.event_payload === 'object'
    ? (event.event_payload as Record<string, unknown>)
    : { _raw: event.event_payload };

  const diff = generateStateDiff(prevSnapshot, newSnapshot);
  const stateHash = calculateStateHash(newSnapshot);
  const changedFields = diff.changedFields;
  const changeSummary = diff.changeSummary ?? null;

  const nextVersion = await pool().query(
    `SELECT COALESCE(MAX(state_version), 0) + 1 AS v FROM digital_twin_asset_states WHERE asset_id = $1`,
    [event.asset_id]
  );
  const stateVersion = Number(nextVersion.rows[0]?.v ?? 1);
  const previousStateId = prevState?.id ?? null;

  const ins = await pool().query(
    `INSERT INTO digital_twin_asset_states (
       asset_id, state_snapshot, state_version, changed_fields,
       previous_state_id, source_event_id, is_current, state_hash, change_summary,
       timestamp
     ) VALUES ($1, $2::jsonb, $3, $4::jsonb, $5, $6, true, $7, $8, $9)
     RETURNING id`,
    [
      event.asset_id,
      JSON.stringify(newSnapshot),
      stateVersion,
      JSON.stringify(changedFields),
      previousStateId,
      eventId,
      stateHash,
      changeSummary,
      new Date(event.event_timestamp),
    ]
  );
  const stateId = ins.rows[0].id;
  logger.info('Digital Twin state created from event', { eventId, stateId, asset_id: event.asset_id, state_version: stateVersion });
  return { id: stateId };
}

export async function retryFailedEvent(eventId: string): Promise<void> {
  const r = await pool().query(
    `SELECT id, processing_status, retry_count FROM digital_twin_events WHERE id = $1`,
    [eventId]
  );
  const row = r.rows[0];
  if (!row) throw new Error('Event not found');
  if (row.processing_status !== 'failed') {
    throw new Error('Only failed events can be retried');
  }

  await pool().query(
    `UPDATE digital_twin_events
     SET processing_status = 'pending', processing_error = NULL, retry_count = retry_count + 1
     WHERE id = $1`,
    [eventId]
  );
  await processEvent(eventId);
}

export async function getPendingEvents(limit = 100): Promise<DigitalTwinEvent[]> {
  const res = await pool().query(
    `SELECT * FROM digital_twin_events
     WHERE processing_status = 'pending'
     ORDER BY ingested_at ASC
     LIMIT $1`,
    [limit]
  );
  return res.rows.map(parseEvent);
}

export async function getEventById(eventId: string): Promise<DigitalTwinEvent | null> {
  const res = await pool().query(
    `SELECT * FROM digital_twin_events WHERE id = $1`,
    [eventId]
  );
  if (res.rows.length === 0) return null;
  return parseEvent(res.rows[0]);
}

export async function getEventHistory(assetId: string, limit = 50): Promise<DigitalTwinEvent[]> {
  const res = await pool().query(
    `SELECT * FROM digital_twin_events
     WHERE asset_id = $1
     ORDER BY event_timestamp DESC
     LIMIT $2`,
    [assetId, limit]
  );
  return res.rows.map(parseEvent);
}
