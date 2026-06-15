/**
 * Digital Twin Ingestion Service
 * Ingestion source CRUD, sync start/pause, status.
 * @see plans/DIGITAL_TWIN_POC_IMPLEMENTATION_PLAN_REVISED.md
 */

import { getDatabasePool } from '../database/connection';
import { logger } from '../utils/logger';

const PLATFORMS = ['iTwin', 'AzureDT', 'Generic'] as const;
const SYNC_MODES = ['realtime', 'polling', 'batch', 'manual'] as const;
export type PlatformType = (typeof PLATFORMS)[number];
export type SyncMode = (typeof SYNC_MODES)[number];

export interface DigitalTwinIngestionSource {
  id: string;
  project_id: string;
  name: string;
  platform_type: PlatformType;
  connection_config: Record<string, unknown>;
  sync_mode: SyncMode;
  poll_interval_seconds: number;
  last_sync_at: Date | null;
  next_sync_at: Date | null;
  is_active: boolean;
  sync_status: string;
  last_error: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface IngestionSourceInput {
  name: string;
  platform_type: PlatformType;
  connection_config: Record<string, unknown>;
  sync_mode?: SyncMode;
  poll_interval_seconds?: number;
  is_active?: boolean;
}

const pool = () => getDatabasePool();

function parseSource(row: any): DigitalTwinIngestionSource {
  const s = row as DigitalTwinIngestionSource;
  if (typeof s.connection_config === 'string') {
    try {
      (s as any).connection_config = JSON.parse(s.connection_config);
    } catch {
      (s as any).connection_config = {};
    }
  }
  return s;
}

export async function createIngestionSource(
  projectId: string,
  input: IngestionSourceInput
): Promise<DigitalTwinIngestionSource> {
  const res = await pool().query(
    `INSERT INTO digital_twin_ingestion_sources (
       project_id, name, platform_type, connection_config,
       sync_mode, poll_interval_seconds, is_active
     ) VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7)
     RETURNING *`,
    [
      projectId,
      input.name,
      input.platform_type,
      JSON.stringify(input.connection_config ?? {}),
      input.sync_mode ?? 'manual',
      input.poll_interval_seconds ?? 60,
      input.is_active !== false,
    ]
  );
  const row = res.rows[0];
  logger.info({ sourceId: row.id, projectId, name: row.name }, 'Digital Twin ingestion source created');
  return parseSource(row);
}

export async function getIngestionSources(projectId: string): Promise<DigitalTwinIngestionSource[]> {
  const res = await pool().query(
    `SELECT * FROM digital_twin_ingestion_sources
     WHERE project_id = $1
     ORDER BY name`,
    [projectId]
  );
  return res.rows.map(parseSource);
}

export async function getIngestionSourceById(sourceId: string): Promise<DigitalTwinIngestionSource | null> {
  const res = await pool().query(
    `SELECT * FROM digital_twin_ingestion_sources WHERE id = $1`,
    [sourceId]
  );
  if (res.rows.length === 0) return null;
  return parseSource(res.rows[0]);
}

export async function updateIngestionSource(
  sourceId: string,
  updates: Partial<IngestionSourceInput>
): Promise<DigitalTwinIngestionSource | null> {
  const allowed = ['name', 'connection_config', 'sync_mode', 'poll_interval_seconds', 'is_active'];
  const set: string[] = [];
  const vals: unknown[] = [];
  let i = 1;
  for (const [k, v] of Object.entries(updates)) {
    if (!allowed.includes(k)) continue;
    if (k === 'connection_config') {
      set.push(`${k} = $${i}`);
      vals.push(v != null ? JSON.stringify(v) : '{}');
    } else {
      set.push(`${k} = $${i}`);
      vals.push(v ?? null);
    }
    i++;
  }
  if (set.length === 0) return getIngestionSourceById(sourceId);
  set.push('updated_at = CURRENT_TIMESTAMP');
  vals.push(sourceId);
  const res = await pool().query(
    `UPDATE digital_twin_ingestion_sources SET ${set.join(', ')} WHERE id = $${i} RETURNING *`,
    vals
  );
  if (res.rows.length === 0) return null;
  return parseSource(res.rows[0]);
}

/**
 * Start sync: set is_active true, clear last_error, and start connector.
 */
export async function startSync(sourceId: string): Promise<void> {
  const source = await getIngestionSourceById(sourceId);
  if (!source) {
    throw new Error(`Ingestion source not found: ${sourceId}`);
  }

  await pool().query(
    `UPDATE digital_twin_ingestion_sources
     SET is_active = true, last_error = NULL, sync_status = 'active', updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [sourceId]
  );

  // Start connector if active
  try {
    const { connectorManager } = await Promise.resolve().then(() => require());
    await connectorManager.startConnector(source);
    logger.info({ sourceId }, 'Digital Twin ingestion sync started');
  } catch (error: any) {
    logger.error({ sourceId, error: error.message }, 'Failed to start connector');
    await pool().query(
      `UPDATE digital_twin_ingestion_sources
       SET last_error = $1, sync_status = 'error', updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [error.message, sourceId]
    );
    throw error;
  }
}

/**
 * Pause sync: set is_active false and stop connector.
 */
export async function pauseSync(sourceId: string): Promise<void> {
  await pool().query(
    `UPDATE digital_twin_ingestion_sources
     SET is_active = false, updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [sourceId]
  );

  // Stop connector
  try {
    const { connectorManager } = await Promise.resolve().then(() => require());
    await connectorManager.stopConnector(sourceId);
    logger.info({ sourceId }, 'Digital Twin ingestion sync paused');
  } catch (error: any) {
    logger.error({ sourceId, error: error.message }, 'Failed to stop connector');
    // Don't throw - we've already updated the DB
  }
}
