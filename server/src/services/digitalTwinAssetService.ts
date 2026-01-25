/**
 * Digital Twin Asset Service
 * Asset CRUD, current state, state history. Project-scoped.
 * @see plans/DIGITAL_TWIN_POC_IMPLEMENTATION_PLAN_REVISED.md
 */

import { getDatabasePool } from '../database/connection';
import { logger } from '../utils/logger';

export type PlatformType = 'iTwin' | 'AzureDT' | 'Generic';

export interface DigitalTwinAsset {
  id: string;
  project_id: string;
  company_id: string | null;
  external_id: string;
  platform_type: PlatformType;
  platform_instance_url: string | null;
  name: string;
  description: string | null;
  asset_type: string | null;
  location: Record<string, unknown> | null;
  current_state_id: string | null;
  current_state_version: number;
  metadata: Record<string, unknown>;
  last_synced_at: Date | null;
  sync_status: 'active' | 'paused' | 'error' | 'disconnected';
  sync_error_message: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface DigitalTwinAssetState {
  id: string;
  asset_id: string;
  state_snapshot: Record<string, unknown>;
  state_version: number;
  changed_fields: string[];
  previous_state_id: string | null;
  source_event_id: string | null;
  is_current: boolean;
  state_hash: string | null;
  change_summary: string | null;
  timestamp: Date;
  created_at: Date;
}

export interface DigitalTwinAssetInput {
  external_id: string;
  platform_type: PlatformType;
  platform_instance_url?: string | null;
  name: string;
  description?: string | null;
  asset_type?: string | null;
  location?: Record<string, unknown> | null;
  company_id?: string | null;
  metadata?: Record<string, unknown>;
}

const pool = () => getDatabasePool();

export async function getAssetsByProject(projectId: string): Promise<DigitalTwinAsset[]> {
  const res = await pool().query(
    `SELECT * FROM digital_twin_assets
     WHERE project_id = $1 AND deleted_at IS NULL
     ORDER BY name`,
    [projectId]
  );
  return res.rows as DigitalTwinAsset[];
}

export async function getAssetById(assetId: string): Promise<DigitalTwinAsset | null> {
  const res = await pool().query(
    `SELECT * FROM digital_twin_assets WHERE id = $1 AND deleted_at IS NULL`,
    [assetId]
  );
  return (res.rows[0] as DigitalTwinAsset) ?? null;
}

export async function registerAsset(
  projectId: string,
  input: DigitalTwinAssetInput
): Promise<DigitalTwinAsset> {
  const inst = input.platform_instance_url ?? '';
  const res = await pool().query(
    `INSERT INTO digital_twin_assets (
       project_id, company_id, external_id, platform_type, platform_instance_url,
       name, description, asset_type, location, metadata
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      projectId,
      input.company_id ?? null,
      input.external_id,
      input.platform_type,
      inst || null,
      input.name,
      input.description ?? null,
      input.asset_type ?? null,
      input.location ? JSON.stringify(input.location) : null,
      input.metadata ? JSON.stringify(input.metadata) : '{}',
    ]
  );
  const row = res.rows[0] as DigitalTwinAsset;
  logger.info('Digital Twin asset registered', { assetId: row.id, projectId, name: row.name });
  return row;
}

export async function updateAsset(
  assetId: string,
  updates: Partial<Pick<DigitalTwinAssetInput, 'name' | 'description' | 'asset_type' | 'location' | 'metadata' | 'sync_status' | 'sync_error_message'>>
): Promise<DigitalTwinAsset | null> {
  const allowed = ['name', 'description', 'asset_type', 'location', 'metadata', 'sync_status', 'sync_error_message'];
  const set: string[] = [];
  const vals: unknown[] = [];
  let i = 1;
  for (const [k, v] of Object.entries(updates)) {
    if (!allowed.includes(k)) continue;
    if (k === 'location' || k === 'metadata') {
      set.push(`${k} = $${i}`);
      vals.push(v != null ? JSON.stringify(v) : null);
    } else {
      set.push(`${k} = $${i}`);
      vals.push(v ?? null);
    }
    i++;
  }
  if (set.length === 0) return getAssetById(assetId);
  set.push(`updated_at = CURRENT_TIMESTAMP`);
  vals.push(assetId);
  const res = await pool().query(
    `UPDATE digital_twin_assets SET ${set.join(', ')} WHERE id = $${i} AND deleted_at IS NULL RETURNING *`,
    vals
  );
  return (res.rows[0] as DigitalTwinAsset) ?? null;
}

export async function deleteAsset(assetId: string): Promise<boolean> {
  const res = await pool().query(
    `UPDATE digital_twin_assets SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id`,
    [assetId]
  );
  return res.rowCount > 0;
}

export async function getCurrentState(assetId: string): Promise<DigitalTwinAssetState | null> {
  const res = await pool().query(
    `SELECT * FROM digital_twin_asset_states
     WHERE asset_id = $1 AND is_current = true
     LIMIT 1`,
    [assetId]
  );
  const row = res.rows[0];
  if (!row) return null;
  if (typeof row.changed_fields === 'string') {
    try {
      row.changed_fields = JSON.parse(row.changed_fields);
    } catch {
      row.changed_fields = [];
    }
  }
  return row as DigitalTwinAssetState;
}

export async function getStateHistory(
  assetId: string,
  limit = 50
): Promise<DigitalTwinAssetState[]> {
  const res = await pool().query(
    `SELECT * FROM digital_twin_asset_states
     WHERE asset_id = $1
     ORDER BY state_version DESC
     LIMIT $2`,
    [assetId, limit]
  );
  const rows = res.rows as DigitalTwinAssetState[];
  for (const r of rows) {
    if (typeof r.changed_fields === 'string') {
      try {
        (r as any).changed_fields = JSON.parse(r.changed_fields);
      } catch {
        (r as any).changed_fields = [];
      }
    }
  }
  return rows;
}
