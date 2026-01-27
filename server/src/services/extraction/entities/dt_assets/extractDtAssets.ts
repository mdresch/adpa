/**
 * Extract DT Assets
 *
 * Parses dt_assets YAML blocks from project documents (e.g. L0 Layout & Asset Register).
 * Deterministic extraction — no AI. Each asset is tied to its source_document_id.
 * Output is stored as entities in extracted_dt_assets; Import creates digital_twin_assets
 * in the Digital Twin Assets Register (same flow as tasks: entities → project_tasks).
 */

import yaml from 'js-yaml'
import { logger } from '../../../../utils/logger'
import type { ExtractionContext } from '../../base/ExtractionContext'
import type { ExtractionResult } from '../../base/ExtractionResult'
import type { DtAsset } from './types'

const PLATFORM_TYPES = ['iTwin', 'AzureDT', 'Generic'] as const

function isValidPlatformType(s: string): s is (typeof PLATFORM_TYPES)[number] {
  return (PLATFORM_TYPES as readonly string[]).includes(s)
}

/**
 * Extract YAML blocks from markdown (```yaml ... ```)
 */
function extractYamlBlocks(content: string): string[] {
  const blocks: string[] = []
  const re = /```(?:yaml|yml)\s*\n([\s\S]*?)```/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(content)) !== null) {
    blocks.push(m[1].trim())
  }
  return blocks
}

/**
 * Parse dt_assets from a YAML block. Returns array of raw asset objects.
 */
function parseDtAssetsFromYaml(yamlStr: string): Array<Record<string, unknown>> {
  try {
    const parsed = yaml.load(yamlStr) as Record<string, unknown>
    if (!parsed || typeof parsed !== 'object') return []
    const raw = parsed.dt_assets
    if (!Array.isArray(raw)) return []
    return raw.filter((x) => x && typeof x === 'object') as Array<Record<string, unknown>>
  } catch (e) {
    logger.warn('[EXTRACTION-DT_ASSETS] YAML parse error', { error: (e as Error).message })
    return []
  }
}

/**
 * Normalize a raw asset into DtAsset shape
 */
function normalizeAsset(
  raw: Record<string, unknown>,
  sourceDocumentId: string
): DtAsset | null {
  const externalId = raw.external_id ?? raw.externalId
  const name = raw.name
  if (!externalId || !name || typeof externalId !== 'string' || typeof name !== 'string') {
    return null
  }
  const platformType = (raw.platform_type ?? raw.platformType ?? 'Generic') as string
  const asset: DtAsset = {
    external_id: externalId.trim(),
    platform_type: isValidPlatformType(platformType) ? platformType : 'Generic',
    name: String(name).trim(),
    description: typeof raw.description === 'string' ? raw.description : undefined,
    asset_type: typeof raw.asset_type === 'string' ? raw.asset_type : undefined,
    location:
      raw.location && typeof raw.location === 'object' && !Array.isArray(raw.location)
        ? (raw.location as Record<string, unknown>)
        : undefined,
    metadata:
      raw.metadata && typeof raw.metadata === 'object' && !Array.isArray(raw.metadata)
        ? (raw.metadata as Record<string, unknown>)
        : undefined,
    source_document_id: sourceDocumentId,
  }
  return asset
}

/**
 * Extract dt_assets from project documents.
 * Scans each document for ```yaml dt_assets: ... ``` blocks and parses them.
 */
export async function extractDtAssets(
  context: ExtractionContext,
  _options: { temperature?: number; maxTokens?: number } = {}
): Promise<ExtractionResult<DtAsset>> {
  const startTime = Date.now()
  const entities: DtAsset[] = []
  const seen = new Set<string>()

  for (const doc of context.documents) {
    const raw = doc.content
    const content = typeof raw === 'string' ? raw : raw != null ? JSON.stringify(raw) : ''
    if (!content.trim()) continue
    const blocks = extractYamlBlocks(content)
    for (const block of blocks) {
      const rawList = parseDtAssetsFromYaml(block)
      for (const raw of rawList) {
        const asset = normalizeAsset(raw, doc.id)
        if (!asset) continue
        const key = `${context.projectId}::${asset.external_id}::${asset.platform_type}`
        if (seen.has(key)) continue
        seen.add(key)
        entities.push(asset)
      }
    }
  }

  logger.info('[EXTRACTION-DT_ASSETS] Extraction completed', {
    projectId: context.projectId,
    documentCount: context.documents.length,
    totalExtracted: entities.length,
    durationMs: Date.now() - startTime,
  })

  return {
    entities,
    rejectedCount: 0,
    skippedCount: 0,
    stats: {
      totalExtracted: entities.length,
      afterDeduplication: entities.length,
      afterSourceResolution: entities.length,
      finalCount: entities.length,
      cacheHit: false,
      durationMs: Date.now() - startTime,
      provider: undefined,
      model: undefined,
    },
  }
}
