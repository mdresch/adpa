/**
 * Save Stakeholders
 * 
 * Persists stakeholders to the database with deduplication, normalization, and validation.
 * Handles both batch-level deduplication (within extracted set) and DB-level deduplication (against existing records).
 */

import { logger } from '../../../../utils/logger'
import type { PoolClient } from 'pg'
import type { PersistenceResult } from '../../base/Persistence'
import { truncateString } from '../../base/Persistence'
import type { Stakeholder } from './types'
import { generateStakeholderIdempotencyKey } from '../../IdempotencyKeyService'

/**
 * Normalize stakeholder name for deduplication
 * Handles variations like "John Smith", "John Smith (PM)", "john smith"
 */
function normalizeStakeholderName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s*\([^)]*\)\s*$/, '') // Remove trailing (role) suffix
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[^\w\s]/g, '') // Remove special characters for better matching
}

/**
 * Normalize level value to valid enum
 */
function normalizeLevel(level: string | undefined): 'high' | 'medium' | 'low' {
  if (!level) return 'medium'
  const normalized = level.toLowerCase().trim()
  if (normalized === 'high' || normalized === 'medium' || normalized === 'low') {
    return normalized as 'high' | 'medium' | 'low'
  }
  // Default to medium for invalid values
  logger.debug(`[EXTRACTION] Invalid level "${level}", defaulting to medium`)
  return 'medium'
}

/**
 * Generate placeholder email if missing
 */
function generatePlaceholderEmail(name: string): string {
  return `${name.toLowerCase().replace(/\s+/g, '.')}@placeholder.local`
}

/**
 * Check existing stakeholders in database and filter out duplicates
 */
async function filterExistingStakeholders(
  client: PoolClient,
  projectId: string,
  stakeholders: Stakeholder[]
): Promise<Stakeholder[]> {
  try {
    const existingStakeholdersResult = await client.query(
      `SELECT name FROM stakeholders WHERE project_id = $1`,
      [projectId]
    )

    const existingStakeholders = existingStakeholdersResult.rows

    if (existingStakeholders.length === 0) {
      return stakeholders
    }

    // Create a set of normalized existing stakeholder names
    const existingNormalized = new Set<string>()
    existingStakeholders.forEach(existing => {
      const normalized = normalizeStakeholderName(existing.name)
      existingNormalized.add(normalized)
    })

    // Filter out stakeholders that match existing ones
    const newStakeholders: Stakeholder[] = []
    let skippedCount = 0

    stakeholders.forEach(stakeholder => {
      const normalized = normalizeStakeholderName(stakeholder.name)

      if (existingNormalized.has(normalized)) {
        // Match found - skip this stakeholder (already exists)
        skippedCount++
        logger.debug(`[DEDUP-DB] Skipping "${stakeholder.name}" - matches existing stakeholder`)
      } else {
        // New stakeholder - keep it
        newStakeholders.push(stakeholder)
      }
    })

    if (skippedCount > 0) {
      logger.info(`[DEDUP-DB] Skipped ${skippedCount} stakeholders that already exist in database (normalized name match)`)
    }

    return newStakeholders
  } catch (error) {
    logger.warn(`[DEDUP-DB] Failed to check existing stakeholders, proceeding with all extracted stakeholders:`, error)
    // If database check fails, proceed with all stakeholders (ON CONFLICT will handle exact duplicates)
    return stakeholders
  }
}

/**
 * Save stakeholders to database
 */
export async function saveStakeholders(
  client: PoolClient,
  projectId: string,
  userId: string,
  stakeholders: Stakeholder[]
): Promise<PersistenceResult> {
  if (stakeholders.length === 0) {
    logger.info('[EXTRACTION] No stakeholders to save, skipping')
    return { saved: 0, skipped: 0, failed: 0 }
  }

  try {
    // Step 1: Check existing stakeholders in database and filter out duplicates
    const stakeholdersToSave = await filterExistingStakeholders(client, projectId, stakeholders)
    const skippedCount = stakeholders.length - stakeholdersToSave.length

    if (stakeholdersToSave.length === 0) {
      logger.info('[EXTRACTION] All stakeholders already exist in database, nothing to save')
      return { saved: 0, skipped: skippedCount, failed: 0 }
    }

    // Build bulk insert
    const values: any[] = []
    const placeholders: string[] = []

    stakeholdersToSave.forEach((s, index) => {
      const offset = index * 11
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11})`
      )

      // Truncate fields to match database constraints
      const name = s.name ? truncateString(s.name, 255) : 'Unnamed Stakeholder'
      const role = s.role ? truncateString(s.role, 100) : 'Stakeholder'
      // Email is NOT NULL in database, use placeholder if missing
      const email = s.email ? truncateString(s.email, 255) : generatePlaceholderEmail(name)

      // Normalize influence_level and interest_level to valid enum values
      const interestLevel = normalizeLevel(s.interest_level)
      const influenceLevel = normalizeLevel(s.influence_level)

      // Resolve source_document_id if available
      const sourceDocumentId = s.source_document_id || null

      // Generate idempotency key for safe re-runs
      const idempotencyKey = generateStakeholderIdempotencyKey(projectId, {
        name,
        role,
        organization: s.department || ''
      })

      values.push(
        projectId,
        name,
        role,
        email,
        interestLevel,
        influenceLevel,
        s.expectations || null,
        s.concerns || null,
        sourceDocumentId,
        userId,
        idempotencyKey
      )
    })

    // Execute bulk insert
    await client.query(
      `INSERT INTO stakeholders (
        project_id, name, role, email, interest_level, influence_level, 
        expectations, concerns, source_document_id, created_by, idempotency_key
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (project_id, idempotency_key) WHERE idempotency_key IS NOT NULL DO UPDATE SET
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        email = EXCLUDED.email,
        interest_level = EXCLUDED.interest_level,
        influence_level = EXCLUDED.influence_level,
        expectations = EXCLUDED.expectations,
        concerns = EXCLUDED.concerns,
        source_document_id = COALESCE(EXCLUDED.source_document_id, stakeholders.source_document_id),
        updated_at = CURRENT_TIMESTAMP`,
      values
    )

    logger.info(`[EXTRACTION] Saved ${stakeholdersToSave.length} stakeholders (${stakeholders.length - stakeholdersToSave.length} duplicates skipped)`)

    return {
      saved: stakeholdersToSave.length,
      skipped: skippedCount,
      failed: 0
    }
  } catch (error: unknown) {
    logger.error('[EXTRACTION-STAKEHOLDERS] Failed to save stakeholders', {
      projectId,
      error: error instanceof Error ? error.message : String(error)
    })

    return {
      saved: 0,
      skipped: 0,
      failed: stakeholders.length,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

