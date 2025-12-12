/**
 * Save Risk Responses
 * 
 * Persists risk responses to the database with deduplication, risk linking, and validation.
 * Risk responses are linked to risks via fuzzy name matching.
 */

import { logger } from '../../../../utils/logger'
import type { PoolClient } from 'pg'
import type { PersistenceResult } from '../../base/Persistence'
import { normalizeDate, truncateString } from '../../base/Persistence'
import { coerceNumber } from '../../base/Parser'
import type { RiskResponse } from './types'

/**
 * Get risk ID map for linking responses to risks
 */
async function getRiskIdMap(
  client: PoolClient,
  projectId: string
): Promise<Map<string, string>> {
  const result = await client.query<{ id: string; name: string | null }>(
    `SELECT id, name FROM risks WHERE project_id = $1`,
    [projectId]
  )
  const map = new Map<string, string>()
  result.rows.forEach(row => {
    if (row.name) {
      map.set(row.name.toLowerCase().trim(), row.id)
    }
  })
  return map
}

/**
 * Normalize effectiveness value
 */
function normalizeEffectiveness(rawValue: string | undefined): 'effective' | 'partially_effective' | 'ineffective' {
  const effectivenessMap: Record<string, 'effective' | 'partially_effective' | 'ineffective'> = {
    effective: 'effective',
    success: 'effective',
    successful: 'effective',
    partially_effective: 'partially_effective',
    'partially effective': 'partially_effective',
    partial: 'partially_effective',
    ineffective: 'ineffective',
    failed: 'ineffective'
  }

  if (!rawValue) return 'effective'
  const normalized = rawValue.toLowerCase().replace(/\s+/g, '_')
  return effectivenessMap[normalized] || 'effective'
}

/**
 * Normalize risk level scale values
 */
function normalizeRiskLevel(rawValue: string | undefined): 'very_high' | 'high' | 'medium' | 'low' | 'very_low' | null {
  const scaleMap: Record<string, 'very_high' | 'high' | 'medium' | 'low' | 'very_low'> = {
    very_high: 'very_high',
    'very high': 'very_high',
    high: 'high',
    medium: 'medium',
    moderate: 'medium',
    low: 'low',
    very_low: 'very_low',
    'very low': 'very_low'
  }

  if (!rawValue) return null
  const normalized = rawValue.toLowerCase().trim()
  return scaleMap[normalized] || null
}

/**
 * Deduplicate risk responses by risk_title + response_date
 */
function deduplicateResponses(responses: RiskResponse[]): RiskResponse[] {
  const deduplicatedMap = new Map<string, RiskResponse>()
  
  responses.forEach(response => {
    const normalizedRiskTitle = (response.risk_title || '').trim().toLowerCase()
    const responseDate = normalizeDate(response.response_date)
    
    if (!normalizedRiskTitle || !responseDate) {
      return
    }
    
    const key = `${normalizedRiskTitle}:${responseDate}`
    
    if (!deduplicatedMap.has(key)) {
      deduplicatedMap.set(key, response)
    } else {
      // Duplicate found - merge details (keep most detailed version)
      const existing = deduplicatedMap.get(key)!
      const merged: RiskResponse = {
        ...existing,
        action_taken: response.action_taken || existing.action_taken,
        effectiveness: response.effectiveness || existing.effectiveness,
        cost_of_response: response.cost_of_response !== undefined ? response.cost_of_response : existing.cost_of_response,
        residual_risk_level: response.residual_risk_level || existing.residual_risk_level,
        owner: response.owner || existing.owner,
        notes: response.notes || existing.notes
      }
      deduplicatedMap.set(key, merged)
      logger.debug(`[EXTRACTION-RISK_RESPONSES] Merged duplicate risk response: "${response.risk_title}" (${responseDate})`)
    }
  })
  
  return Array.from(deduplicatedMap.values())
}

/**
 * Save risk responses to database
 */
export async function saveRiskResponses(
  client: PoolClient,
  projectId: string,
  userId: string,
  responses: RiskResponse[]
): Promise<PersistenceResult> {
  if (responses.length === 0) {
    logger.info('[EXTRACTION] No risk_responses to save, skipping')
    return { saved: 0, skipped: 0, failed: 0 }
  }

  try {
    // Get risk map for linking
    const riskMap = await getRiskIdMap(client, projectId)

    // Deduplicate responses
    const uniqueResponses = deduplicateResponses(responses)
    const skippedCount = responses.length - uniqueResponses.length

    if (skippedCount > 0) {
      logger.info(`[EXTRACTION-RISK_RESPONSES] Deduplicated ${responses.length} → ${uniqueResponses.length} risk responses`)
    }

    // Early return if no valid responses after deduplication
    if (uniqueResponses.length === 0) {
      logger.info('[EXTRACTION-RISK_RESPONSES] No valid risk responses to save after deduplication')
      return { saved: 0, skipped: skippedCount, failed: 0 }
    }

    // Build bulk insert
    const values: any[] = []
    const placeholders: string[] = []

    uniqueResponses.forEach((response, index) => {
      const offset = index * 13
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13})`
      )

      // Link to risk via fuzzy matching
      const normalizedRiskTitle = response.risk_title ? response.risk_title.toLowerCase().trim() : ''
      const riskId = normalizedRiskTitle ? riskMap.get(normalizedRiskTitle) || null : null
      if (!riskId && normalizedRiskTitle) {
        logger.debug(`[EXTRACTION] No risk match for "${response.risk_title}", storing without linkage`)
      }

      const effectiveness = normalizeEffectiveness(response.effectiveness)
      const residualRiskLevel = normalizeRiskLevel(response.residual_risk_level)

      const notesSegments = []
      if (response.notes) {
        notesSegments.push(response.notes)
      }
      if (response.source_document) {
        notesSegments.push(`Source: ${response.source_document}`)
      }
      const notes = notesSegments.length > 0 ? notesSegments.join('\n\n') : null

      values.push(
        projectId,
        riskId,
        response.risk_title ? truncateString(response.risk_title, 255) : null,
        normalizeDate(response.response_date),
        response.action_taken || null,
        effectiveness,
        coerceNumber(response.cost_of_response) ?? null,
        residualRiskLevel,
        response.owner ? truncateString(response.owner, 255) : null,
        notes,
        response.source_document_id || null,
        userId,
        userId
      )
    })

    // Validate placeholder/value alignment
    const expectedValuesLength = uniqueResponses.length * 13
    if (values.length !== expectedValuesLength) {
      throw new Error(`Placeholder/value misalignment: ${values.length} values but ${uniqueResponses.length} placeholders (expected ${expectedValuesLength} values)`)
    }

    // Execute bulk insert
    await client.query(
      `INSERT INTO risk_responses (
        project_id, risk_id, risk_title, response_date, action_taken, effectiveness,
        cost_of_response, residual_risk_level, owner, notes, source_document_id,
        created_by, updated_by
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (project_id, risk_title, response_date) DO UPDATE SET
        risk_id = COALESCE(EXCLUDED.risk_id, risk_responses.risk_id),
        action_taken = EXCLUDED.action_taken,
        effectiveness = EXCLUDED.effectiveness,
        cost_of_response = EXCLUDED.cost_of_response,
        residual_risk_level = EXCLUDED.residual_risk_level,
        owner = EXCLUDED.owner,
        notes = EXCLUDED.notes,
        source_document_id = COALESCE(EXCLUDED.source_document_id, risk_responses.source_document_id),
        updated_by = EXCLUDED.updated_by,
        updated_at = CURRENT_TIMESTAMP`,
      values
    )

    logger.info(`[EXTRACTION] Saved ${uniqueResponses.length} risk responses (deduplicated from ${responses.length})`)

    return {
      saved: uniqueResponses.length,
      skipped: skippedCount,
      failed: 0
    }
  } catch (error: unknown) {
    logger.error('[EXTRACTION-RISK-RESPONSES] Failed to save risk responses', {
      projectId,
      error: error instanceof Error ? error.message : String(error)
    })
    
    return {
      saved: 0,
      skipped: 0,
      failed: responses.length,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

