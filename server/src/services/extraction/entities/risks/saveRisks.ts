/**
 * Save Risks
 * 
 * Persists risks to the database with deduplication, normalization, and validation.
 * Uses idempotency keys (SHA-256) for safe re-runs and retry scenarios.
 * Handles enum mapping for probability and impact fields, with validation to prevent text injection.
 */

import { logger } from '../../../../utils/logger'
import type { PoolClient } from 'pg'
import type { PersistenceResult } from '../../base/Persistence'
import type { Risk } from './types'
import { generateRiskIdempotencyKey } from '../../IdempotencyKeyService'

/**
 * Normalize impact value to database enum
 * DB allows: high, medium, low
 * AI returns: critical, very_high, high, medium, low
 * IMPORTANT: Validate that impact is actually a risk level, not mitigation_strategy or other text
 */
function normalizeImpact(rawImpact: string | undefined): 'high' | 'medium' | 'low' {
  const impactMap: Record<string, 'high' | 'medium' | 'low'> = {
    'critical': 'high',
    'very_high': 'high',
    'high': 'high',
    'medium': 'medium',
    'low': 'low',
    'very_low': 'low'
  }

  if (!rawImpact) return 'medium'
  const raw = String(rawImpact).toLowerCase().trim()

  // Check if impact looks like it might be mitigation_strategy or other text (too long)
  if (raw.length <= 10 && impactMap[raw]) {
    return impactMap[raw]
  } else {
    logger.warn(`[EXTRACTION-RISKS] Impact value looks invalid (too long or not a risk level): "${raw}", defaulting to 'medium'`, {
      impact: rawImpact,
      impactLength: raw.length
    })
    return 'medium'
  }
}

/**
 * Normalize probability value to database enum
 * DB allows: high, medium, low
 * AI returns: critical, very_high, high, medium, low
 * IMPORTANT: Validate that probability is actually a risk level, not mitigation_strategy or other text
 */
function normalizeProbability(rawProbability: string | undefined): 'high' | 'medium' | 'low' {
  const probabilityMap: Record<string, 'high' | 'medium' | 'low'> = {
    'critical': 'high',
    'very_high': 'high',
    'high': 'high',
    'medium': 'medium',
    'low': 'low',
    'very_low': 'low'
  }

  if (!rawProbability) return 'medium'
  const raw = String(rawProbability).toLowerCase().trim()

  // Check if probability looks like it might be mitigation_strategy or other text (too long)
  if (raw.length <= 10 && probabilityMap[raw]) {
    return probabilityMap[raw]
  } else {
    logger.warn(`[EXTRACTION-RISKS] Probability value looks invalid (too long or not a risk level): "${raw}", defaulting to 'medium'`, {
      probability: rawProbability,
      probabilityLength: raw.length
    })
    return 'medium'
  }
}

/**
 * Deduplicate risks by idempotency key within batch
 */
function deduplicateRisks(risks: Risk[]): Risk[] {
  const deduplicatedMap = new Map<string, Risk>()

  risks.forEach(risk => {
    // Use title or name as fallback key if idempotency_key not yet present
    const riskTitle = risk.title || risk.name || 'untitled'
    const dedupKey = riskTitle.trim().toLowerCase()

    if (!deduplicatedMap.has(dedupKey)) {
      deduplicatedMap.set(dedupKey, risk)
    } else {
      // Duplicate found - merge details (keep most detailed version)
      const existing = deduplicatedMap.get(dedupKey)!
      const merged: Risk = {
        ...existing,
        description: risk.description || existing.description,
        category: risk.category || existing.category,
        probability: risk.probability || existing.probability,
        impact: risk.impact || existing.impact,
        mitigation_strategy: risk.mitigation_strategy || existing.mitigation_strategy,
        contingency_plan: risk.contingency_plan || existing.contingency_plan,
        owner: risk.owner || existing.owner
      }
      deduplicatedMap.set(dedupKey, merged)
      logger.debug(`[EXTRACTION-RISKS] Merged duplicate risk: "${riskTitle}"`)
    }
  })

  return Array.from(deduplicatedMap.values())
}

/**
 * Save risks to database
 */
export async function saveRisks(
  client: PoolClient,
  projectId: string,
  userId: string,
  risks: Risk[]
): Promise<PersistenceResult> {
  if (risks.length === 0) {
    logger.info('[EXTRACTION] No risks to save, skipping')
    return { saved: 0, skipped: 0, failed: 0 }
  }

  try {
    // Deduplicate risks
    const uniqueRisks = deduplicateRisks(risks)
    const skippedCount = risks.length - uniqueRisks.length

    if (skippedCount > 0) {
      logger.info(`[EXTRACTION-RISKS] Deduplicated ${risks.length} → ${uniqueRisks.length} risks`)
    }

    // Query existing risks for this project to handle case-insensitive conflicts
    const existingRisksRes = await client.query(
      `SELECT name, title FROM risks WHERE project_id = $1`,
      [projectId]
    )
    const existingTitleMap = new Map<string, { name: string, title: string }>()
    const existingNameMap = new Map<string, { name: string, title: string }>()
    existingRisksRes.rows.forEach((row: any) => {
      if (row.title) {
        existingTitleMap.set(row.title.toLowerCase().trim(), { name: row.name, title: row.title })
      }
      if (row.name) {
        existingNameMap.set(row.name.toLowerCase().trim(), { name: row.name, title: row.title })
      }
    });

    // Build bulk insert
    const values: any[] = []
    const placeholders: string[] = []

    uniqueRisks.forEach((r, index) => {
      const offset = index * 15
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14}, $${offset + 15})`
      )

      // Normalize enum values with validation
      const mappedProbability = normalizeProbability(r.probability)
      const mappedImpact = normalizeImpact(r.impact)

      // IMPORTANT: risk_level is organizational level ('project', 'program', 'portfolio', 'systemic'), NOT severity
      // For extracted risks from documents, risk_level should always be 'project'
      const riskLevel = 'project' // Extracted risks are always project-level

      const rawName = r.title || r.name || 'Untitled Risk'
      const normKey = rawName.toLowerCase().trim()

      let finalName = rawName
      let finalTitle = rawName

      const existing = existingTitleMap.get(normKey) || existingNameMap.get(normKey)
      if (existing) {
        finalName = existing.name
        finalTitle = existing.title
      }

      // Generate idempotency key for safe re-runs
      const idempotencyKey = generateRiskIdempotencyKey(projectId, {
        title: finalTitle,
        category: r.category,
        probability: mappedProbability,
        impact: mappedImpact
      })

      // Resolve source_document_id
      const sourceDocumentId = r.source_document_id || null

      logger.debug(`[EXTRACTION-RISKS] Final risk values`, {
        title: finalTitle,
        probability: mappedProbability,
        impact: mappedImpact,
        risk_level: riskLevel,
        idempotencyKey: idempotencyKey.substring(0, 16)
      })

      const riskDescription = r.description || finalName

      values.push(
        projectId,
        finalName,        // name column (required, comes first)
        riskDescription,
        r.category || null,
        mappedProbability,  // Use validated probability value
        mappedImpact,       // Use validated impact value
        riskLevel,          // Always 'project' for extracted risks (organizational level, not severity)
        r.mitigation_strategy || null,
        r.contingency_plan || null,
        r.owner || null,      // owner column
        'identified',        // status column (default for extracted risks)
        finalTitle,          // title column (duplicate of name for compatibility)
        userId,              // created_by
        sourceDocumentId,    // source_document_id
        idempotencyKey       // idempotency_key (NEW in Phase 1.5)
      )
    })

    // Execute bulk insert with name conflict handling (matches strict project_name index)
    await client.query(
      `INSERT INTO risks (
        project_id, name, description, category, probability, impact, risk_level,
        mitigation_strategy, contingency_plan, owner, status, title,
        created_by, source_document_id, idempotency_key
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (project_id, name) DO UPDATE SET
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        probability = EXCLUDED.probability,
        impact = EXCLUDED.impact,
        risk_level = EXCLUDED.risk_level,
        mitigation_strategy = EXCLUDED.mitigation_strategy,
        contingency_plan = EXCLUDED.contingency_plan,
        owner = EXCLUDED.owner,
        status = EXCLUDED.status,
        title = EXCLUDED.title,
        source_document_id = COALESCE(EXCLUDED.source_document_id, risks.source_document_id),
        idempotency_key = EXCLUDED.idempotency_key,
        updated_at = CURRENT_TIMESTAMP`,
      values
    )

    logger.info(`[EXTRACTION] Saved ${uniqueRisks.length} risks (deduplicated from ${risks.length})`, {
      projectId,
      saved: uniqueRisks.length,
      skipped: skippedCount
    })

    return {
      saved: uniqueRisks.length,
      skipped: skippedCount,
      failed: 0
    }
  } catch (error: unknown) {
    logger.error('[EXTRACTION-RISKS] Failed to save risks', {
      projectId,
      error: error instanceof Error ? error.message : String(error)
    })

    return {
      saved: 0,
      skipped: 0,
      failed: risks.length,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}
