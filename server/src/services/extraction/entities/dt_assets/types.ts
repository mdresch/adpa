/**
 * DT Assets Entity Types
 *
 * Digital Twin assets extracted from documents (e.g. L0 Layout & Asset Register).
 * Stored in extracted_dt_assets; imported into digital_twin_assets with source traceability.
 */

export type DtAssetPlatformType = 'iTwin' | 'AzureDT' | 'Generic'

export interface DtAsset {
  /** Stable external ID (e.g. mec-amsterdam::zone-entrance) */
  external_id: string
  /** Platform type */
  platform_type: DtAssetPlatformType
  /** Display name */
  name: string
  /** Optional description */
  description?: string
  /** Asset type: zone, product_station, sensor, etc. */
  asset_type?: string
  /** Location (zone, etc.) */
  location?: Record<string, unknown>
  /** Flexible metadata */
  metadata?: Record<string, unknown>
  /** Source document ID for traceability */
  source_document_id?: string
}
