/**
 * DT Assets Entity Module
 *
 * Extracts dt_assets from documents (YAML L0 blocks) as entities; saves to extracted_dt_assets.
 * When in entities, run Import (POST /api/digital-twin/assets/import) to create
 * digital_twin_assets in the Digital Twin Assets Register, with source_document_id
 * and source_entity_id for traceability (same pattern as tasks → project_tasks).
 */

export * from './types'
export { extractDtAssets } from './extractDtAssets'
export { saveDtAssets } from './saveDtAssets'
