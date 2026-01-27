/**
 * DT Asset Import Service
 *
 * Imports extracted_dt_assets into digital_twin_assets (Digital Twin Assets Register).
 * Mirrors WBS import: entities -> project_tasks. Here: extracted_dt_assets -> digital_twin_assets.
 * Includes source_document_id and source_entity_id for traceability.
 */

import { getDatabasePool } from '../database/connection';
import { logger } from '../utils/logger';

export interface DTAssetImportOptions {
  overwriteExisting?: boolean;
}

export interface DTAssetImportResult {
  assetsCreated: number;
  assetsUpdated: number;
  errors: string[];
}
const PLATFORM = 'Generic';

async function getExtractedDtAssets(
  projectId: string,
  documentId?: string
): Promise<Array<{ id: string; project_id: string; source_document_id: string | null; external_id: string; platform_type: string; name: string; description: string | null; asset_type: string | null; location: unknown; metadata: unknown }>> {
  let q = `SELECT id, project_id, source_document_id, external_id, platform_type, name, description, asset_type, location, metadata
           FROM extracted_dt_assets WHERE project_id = $1`;
  const params: unknown[] = [projectId];
  if (documentId) {
    q += ` AND source_document_id = $2`;
    params.push(documentId);
  }
  q += ` ORDER BY name`;
  const pool = getDatabasePool();
  const res = await pool.query(q, params);
  return res.rows;
}

/**
 * Import DT assets from extracted_dt_assets into digital_twin_assets.
 * When documentId is provided, only assets extracted from that document are imported.
 */
export async function importDTAssetsFromDocument(
  projectId: string,
  documentId: string,
  userId: string,
  options: DTAssetImportOptions = {}
): Promise<DTAssetImportResult> {
  const result: DTAssetImportResult = { assetsCreated: 0, assetsUpdated: 0, errors: [] };
  try {
    logger.info('DT asset import from document', { projectId, documentId, options });
    const entities = await getExtractedDtAssets(projectId, documentId);
    if (!entities.length) {
      result.errors.push('No extracted DT assets found for this document');
      return result;
    }
    return await importExtractedAssets(projectId, userId, entities, result, options);
  } catch (e) {
    logger.error('DT asset import from document failed', { projectId, documentId, error: e });
    result.errors.push(e instanceof Error ? e.message : String(e));
    return result;
  }
}

/**
 * Import all DT assets from extracted_dt_assets for a project.
 */
export async function importDTAssetsFromProjectEntities(
  projectId: string,
  userId: string,
  options: DTAssetImportOptions = {}
): Promise<DTAssetImportResult> {
  const result: DTAssetImportResult = { assetsCreated: 0, assetsUpdated: 0, errors: [] };
  try {
    logger.info('DT asset import from project entities', { projectId, options });
    const entities = await getExtractedDtAssets(projectId);
    if (!entities.length) {
      result.errors.push('No extracted DT assets found for this project. Run extraction first (e.g. from L0 Asset Register documents).');
      return result;
    }
    return await importExtractedAssets(projectId, userId, entities, result, options);
  } catch (e) {
    logger.error('DT asset import from project entities failed', { projectId, error: e });
    result.errors.push(e instanceof Error ? e.message : String(e));
    return result;
  }
}

async function importExtractedAssets(
  projectId: string,
  _userId: string,
  entities: Awaited<ReturnType<typeof getExtractedDtAssets>>,
  result: DTAssetImportResult,
  options: DTAssetImportOptions
): Promise<DTAssetImportResult> {
  const pool = getDatabasePool();
  for (const e of entities) {
    try {
      const existing = await pool.query(
        `SELECT id FROM digital_twin_assets
         WHERE project_id = $1 AND external_id = $2 AND platform_type = $3
           AND (platform_instance_url IS NULL OR platform_instance_url = '')
           AND deleted_at IS NULL`,
        [projectId, e.external_id, e.platform_type]
      );
      const location = e.location != null ? JSON.stringify(e.location) : null;
      const metadata = e.metadata != null ? JSON.stringify(e.metadata) : '{}';

      if (existing.rows.length > 0) {
        if (!options.overwriteExisting) {
          continue;
        }
        await pool.query(
          `UPDATE digital_twin_assets SET
             name = $1, description = $2, asset_type = $3, location = $4, metadata = $5,
             source_document_id = COALESCE($6, source_document_id),
             source_entity_id = COALESCE($7, source_entity_id),
             updated_at = CURRENT_TIMESTAMP
           WHERE id = $8`,
          [e.name, e.description, e.asset_type, location, metadata, e.source_document_id, e.id, existing.rows[0].id]
        );
        result.assetsUpdated++;
      } else {
        await pool.query(
          `INSERT INTO digital_twin_assets (
             project_id, external_id, platform_type, platform_instance_url,
             name, description, asset_type, location, metadata,
             source_document_id, source_entity_id
           ) VALUES ($1, $2, $3, NULL, $4, $5, $6, $7, $8, $9, $10)`,
          [
            projectId,
            e.external_id,
            e.platform_type || PLATFORM,
            e.name,
            e.description,
            e.asset_type,
            location,
            metadata,
            e.source_document_id,
            e.id,
          ]
        );
        result.assetsCreated++;
      }
    } catch (err) {
      const msg = `Failed to import asset "${e.name}" (${e.external_id}): ${err instanceof Error ? err.message : String(err)}`;
      result.errors.push(msg);
      logger.warn('[DT-ASSET-IMPORT] ' + msg);
    }
  }
  logger.info('DT asset import completed', { projectId, ...result });
  return result;
}
