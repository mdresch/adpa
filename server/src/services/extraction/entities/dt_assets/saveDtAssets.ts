/**
 * Save DT Assets
 *
 * Persists extracted DT assets as entities to extracted_dt_assets.
 * Upserts by (project_id, external_id, platform_type); keeps source_document_id for traceability.
 * Import (dtAssetImportService) creates digital_twin_assets from these entities, with
 * source_document_id and source_entity_id on each register row.
 */

import { logger } from '../../../../utils/logger'
import type { PoolClient } from 'pg'
import type { PersistenceResult } from '../../base/Persistence'
import type { DtAsset } from './types'

export async function saveDtAssets(
  client: PoolClient,
  projectId: string,
  userId: string,
  assets: DtAsset[]
): Promise<PersistenceResult> {
  if (assets.length === 0) {
    logger.info('[EXTRACTION-DT_ASSETS] No DT assets to save, skipping')
    return { saved: 0, skipped: 0, failed: 0 }
  }

  try {
    const values: unknown[] = []
    const placeholders: string[] = []
    const cols = 10

    assets.forEach((a, i) => {
      const o = i * cols
      placeholders.push(
        `($${o + 1}, $${o + 2}, $${o + 3}, $${o + 4}, $${o + 5}, $${o + 6}, $${o + 7}, $${o + 8}, $${o + 9}, $${o + 10})`
      )
      values.push(
        projectId,
        a.source_document_id ?? null,
        a.external_id,
        a.platform_type,
        a.name,
        a.description ?? null,
        a.asset_type ?? null,
        a.location ? JSON.stringify(a.location) : null,
        a.metadata ? JSON.stringify(a.metadata) : '{}',
        userId
      )
    })

    await client.query(
      `INSERT INTO extracted_dt_assets (
        project_id, source_document_id, external_id, platform_type, name, description, asset_type, location, metadata, created_by
      ) VALUES ${placeholders.join(', ')}
      ON CONFLICT (project_id, external_id, platform_type) DO UPDATE SET
        source_document_id = COALESCE(EXCLUDED.source_document_id, extracted_dt_assets.source_document_id),
        name = EXCLUDED.name,
        description = COALESCE(EXCLUDED.description, extracted_dt_assets.description),
        asset_type = COALESCE(EXCLUDED.asset_type, extracted_dt_assets.asset_type),
        location = COALESCE(EXCLUDED.location, extracted_dt_assets.location),
        metadata = EXCLUDED.metadata,
        updated_at = CURRENT_TIMESTAMP`,
      values
    )

    logger.info('[EXTRACTION-DT_ASSETS] Saved ' + assets.length + ' DT assets')
    return { saved: assets.length, skipped: 0, failed: 0 }
  } catch (e) {
    logger.error('[EXTRACTION-DT_ASSETS] Failed to save DT assets', {
      projectId,
      error: e instanceof Error ? e.message : String(e),
    })
    return {
      saved: 0,
      skipped: 0,
      failed: assets.length,
      error: e instanceof Error ? e.message : String(e),
    }
  }
}
