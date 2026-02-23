import { pool } from '../database/connection'
import { logger } from '../utils/logger'
import { v4 as uuidv4 } from 'uuid'
import { evaluateTriggerRules } from './digitalTwinTriggerService'

export interface DigitalTwinAssetInput {
  project_id: string
  company_id?: string
  external_id: string
  platform_type: 'iTwin' | 'AzureDT' | 'Generic' | 'Visio'
  platform_instance_url?: string
  name: string
  description?: string
  asset_type?: string
  location?: any
  metadata?: any
  source_document_id?: string
  source_entity_id?: string
}

export interface DigitalTwinAssetStateInput {
  asset_id: string
  state_snapshot: any
  state_version: number
  previous_state_id?: string
  source_event_id?: string
  is_current: boolean
  state_hash?: string
  change_summary?: string
  changed_fields?: any
}

/**
 * Register or Update a Digital Twin Asset
 */
export async function registerAsset(data: DigitalTwinAssetInput) {
  try {
    const {
      project_id, company_id, external_id, platform_type, platform_instance_url,
      name, description, asset_type, location, metadata, source_document_id, source_entity_id
    } = data

    // Check if asset exists
    const existingRes = await pool.query(
      `SELECT id FROM digital_twin_assets 
       WHERE external_id = $1 AND platform_type = $2 AND (platform_instance_url = $3 OR ($3 IS NULL AND platform_instance_url IS NULL))`,
      [external_id, platform_type, platform_instance_url]
    )

    if (existingRes.rows.length > 0) {
      // Update existing
      const id = existingRes.rows[0].id
      const updateRes = await pool.query(
        `UPDATE digital_twin_assets 
         SET name = $1, description = $2, asset_type = $3, location = $4, metadata = COALESCE(metadata, '{}'::jsonb) || $5::jsonb, updated_at = NOW()
         WHERE id = $6
         RETURNING *`,
        [name, description, asset_type, location, JSON.stringify(metadata || {}), id]
      )
      return { asset: updateRes.rows[0], isNew: false }
    } else {
      // Create new
      const insertRes = await pool.query(
        `INSERT INTO digital_twin_assets 
         (project_id, company_id, external_id, platform_type, platform_instance_url, name, description, asset_type, location, metadata, source_document_id, source_entity_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [project_id, company_id, external_id, platform_type, platform_instance_url, name, description, asset_type, location, JSON.stringify(metadata || {}), source_document_id, source_entity_id]
      )
      return { asset: insertRes.rows[0], isNew: true }
    }
  } catch (error) {
    logger.error('digitalTwinAssetService.registerAsset error', { error })
    throw error
  }
}

export async function getAssetsByProject(projectId: string) {
  try {
    const result = await pool.query(
      `SELECT * FROM digital_twin_assets WHERE project_id = $1 ORDER BY name ASC`,
      [projectId]
    )
    return result.rows
  } catch (error) {
    logger.error('digitalTwinAssetService.getAssetsByProject error', { error })
    throw error
  }
}

export async function getAssetById(id: string) {
  try {
    const result = await pool.query(
      `SELECT * FROM digital_twin_assets WHERE id = $1`,
      [id]
    )
    return result.rows[0] || null
  } catch (error) {
    logger.error('digitalTwinAssetService.getAssetById error', { error })
    throw error
  }
}

/**
 * Create a new state snapshot for an asset
  */
export async function createState(data: DigitalTwinAssetStateInput) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const {
      asset_id, state_snapshot, state_version, previous_state_id,
      source_event_id, is_current, state_hash, change_summary, changed_fields
    } = data

    // If is_current is true, update old current state to false
    if (is_current) {
      await client.query(
        `UPDATE digital_twin_asset_states SET is_current = false WHERE asset_id = $1 AND is_current = true`,
        [asset_id]
      )
    }

    const insertRes = await client.query(
      `INSERT INTO digital_twin_asset_states 
       (asset_id, state_snapshot, state_version, previous_state_id, source_event_id, is_current, state_hash, change_summary, changed_fields)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [asset_id, JSON.stringify(state_snapshot), state_version, previous_state_id, source_event_id, is_current, state_hash, change_summary, JSON.stringify(changed_fields || [])]
    )

    const newState = insertRes.rows[0]

    // If current, update parent asset
    if (is_current) {
      await client.query(
        `UPDATE digital_twin_assets 
         SET current_state_id = $1, current_state_version = $2, updated_at = NOW()
         WHERE id = $3`,
        [newState.id, state_version, asset_id]
      )
    }

    await client.query('COMMIT')

    // Trigger rule evaluation (fire and forget or await depending on requirements)
    // We await it here to ensure it's logged, but wrapped in try/catch to not fail the request
    try {
      await evaluateTriggerRules(
        asset_id,
        newState.id,
        source_event_id || null,
        'state_change'
      )
    } catch (triggerError) {
      logger.error('Failed to evaluate triggers for new state', {
        assetId: asset_id,
        stateId: newState.id,
        error: triggerError
      })
    }

    return newState

  } catch (error) {
    await client.query('ROLLBACK')
    logger.error('digitalTwinAssetService.createState error', { error })
    throw error
  } finally {
    client.release()
  }
}

export async function getCurrentState(assetId: string) {
  try {
    const res = await pool.query(
      `SELECT * FROM digital_twin_asset_states WHERE asset_id = $1 AND is_current = true`,
      [assetId]
    )
    return res.rows[0] || null
  } catch (error) {
    logger.error('digitalTwinAssetService.getCurrentState error', { error })
    throw error
  }
}

export async function getStateHistory(assetId: string, limit = 20) {
  try {
    const res = await pool.query(
      `SELECT * FROM digital_twin_asset_states WHERE asset_id = $1 ORDER BY timestamp DESC LIMIT $2`,
      [assetId, limit]
    )
    return res.rows
  } catch (error) {
    logger.error('digitalTwinAssetService.getStateHistory error', { error })
    throw error
  }
}

export const digitalTwinAssetService = {
  registerAsset,
  getAssetsByProject,
  getAssetById,
  createState,
  getCurrentState,
  getStateHistory
}
