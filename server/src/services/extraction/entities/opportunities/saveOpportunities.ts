/**
 * Save Opportunities
 * 
 * Persists opportunities to the database with deduplication, normalization, and validation.
 * Opportunities are deduplicated by title and have enum fields normalized.
 */

import { logger } from '../../../../utils/logger'
import type { PoolClient } from 'pg'
import type { PersistenceResult } from '../../base/Persistence'
import { truncateString } from '../../base/Persistence'
import { coerceNumber } from '../../base/Parser'
import type { Opportunity } from './types'

/**
 * Normalize probability/benefit scale values
 */
function normalizeScale(rawValue: string | undefined): 'very_high' | 'high' | 'medium' | 'low' | 'very_low' {
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

  if (!rawValue) return 'medium'
  const normalized = rawValue.toLowerCase().trim()
  return scaleMap[normalized] || 'medium'
}

/**
 * Normalize opportunity status
 */
function normalizeStatus(rawStatus: string | undefined): 'identified' | 'planned' | 'exploiting' | 'realized' | 'missed' {
  const statusMap: Record<string, 'identified' | 'planned' | 'exploiting' | 'realized' | 'missed'> = {
    identified: 'identified',
    planned: 'planned',
    planning: 'planned',
    exploiting: 'exploiting',
    executing: 'exploiting',
    realized: 'realized',
    captured: 'realized',
    won: 'realized',
    missed: 'missed',
    lost: 'missed'
  }

  if (!rawStatus) return 'identified'
  const normalized = rawStatus.toLowerCase().trim()
  return statusMap[normalized] || 'identified'
}

/**
 * Deduplicate opportunities by title
 */
function deduplicateOpportunities(opportunities: Opportunity[]): Opportunity[] {
  const deduplicatedMap = new Map<string, Opportunity>()
  
  opportunities.forEach(opportunity => {
    const normalizedTitle = (opportunity.title || '').trim().toLowerCase()
    
    if (!normalizedTitle) {
      return
    }
    
    if (!deduplicatedMap.has(normalizedTitle)) {
      deduplicatedMap.set(normalizedTitle, opportunity)
    } else {
      // Duplicate found - merge details (keep most detailed version)
      const existing = deduplicatedMap.get(normalizedTitle)!
      const merged: Opportunity = {
        ...existing,
        description: opportunity.description || existing.description,
        category: opportunity.category || existing.category,
        probability: opportunity.probability || existing.probability,
        benefit_level: opportunity.benefit_level || existing.benefit_level,
        exploitation_strategy: opportunity.exploitation_strategy || existing.exploitation_strategy,
        owner: opportunity.owner || existing.owner,
        status: opportunity.status || existing.status,
        expected_benefit: opportunity.expected_benefit !== undefined ? opportunity.expected_benefit : existing.expected_benefit,
        trigger_conditions: opportunity.trigger_conditions || existing.trigger_conditions
      }
      deduplicatedMap.set(normalizedTitle, merged)
      logger.debug(`[EXTRACTION-OPPORTUNITIES] Merged duplicate opportunity: "${opportunity.title}"`)
    }
  })
  
  return Array.from(deduplicatedMap.values())
}

/**
 * Save opportunities to database
 */
export async function saveOpportunities(
  client: PoolClient,
  projectId: string,
  userId: string,
  opportunities: Opportunity[]
): Promise<PersistenceResult> {
  if (opportunities.length === 0) {
    logger.info('[EXTRACTION] No opportunities to save, skipping')
    return { saved: 0, skipped: 0, failed: 0 }
  }

  try {
    // Deduplicate opportunities
    const uniqueOpportunities = deduplicateOpportunities(opportunities)
    const skippedCount = opportunities.length - uniqueOpportunities.length

    if (skippedCount > 0) {
      logger.info(`[EXTRACTION-OPPORTUNITIES] Deduplicated ${opportunities.length} → ${uniqueOpportunities.length} opportunities`)
    }

    // Build bulk insert
    const values: any[] = []
    const placeholders: string[] = []

    uniqueOpportunities.forEach((opportunity, index) => {
      const offset = index * 14
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14})`
      )

      const probability = normalizeScale(opportunity.probability)
      const benefitLevel = normalizeScale(opportunity.benefit_level)
      const status = normalizeStatus(opportunity.status)

      values.push(
        projectId,
        truncateString(opportunity.title, 255) || 'Opportunity',
        opportunity.description || null,
        opportunity.category || null,
        probability,
        benefitLevel,
        opportunity.exploitation_strategy || null,
        opportunity.owner ? truncateString(opportunity.owner, 255) : null,
        status,
        coerceNumber(opportunity.expected_benefit) ?? null,
        opportunity.trigger_conditions || null,
        opportunity.source_document_id || null,
        userId,
        userId
      )
    })

    // Execute bulk insert
    await client.query(
      `
      INSERT INTO opportunities (
        project_id, title, description, category, probability, benefit_level,
        exploitation_strategy, owner, status, expected_benefit, trigger_conditions,
        source_document_id, created_by, updated_by
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (project_id, title) DO UPDATE SET
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        probability = EXCLUDED.probability,
        benefit_level = EXCLUDED.benefit_level,
        exploitation_strategy = EXCLUDED.exploitation_strategy,
        owner = EXCLUDED.owner,
        status = EXCLUDED.status,
        expected_benefit = EXCLUDED.expected_benefit,
        trigger_conditions = EXCLUDED.trigger_conditions,
        source_document_id = COALESCE(EXCLUDED.source_document_id, opportunities.source_document_id),
        updated_by = EXCLUDED.updated_by,
        updated_at = CURRENT_TIMESTAMP
    `,
      values
    )

    logger.info(`[EXTRACTION] Saved ${uniqueOpportunities.length} opportunities (deduplicated from ${opportunities.length})`)

    return {
      saved: uniqueOpportunities.length,
      skipped: skippedCount,
      failed: 0
    }
  } catch (error: unknown) {
    logger.error('[EXTRACTION-OPPORTUNITIES] Failed to save opportunities', {
      projectId,
      error: error instanceof Error ? error.message : String(error)
    })
    
    return {
      saved: 0,
      skipped: 0,
      failed: opportunities.length,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

