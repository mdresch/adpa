/**
 * Save Team Agreements
 * 
 * Persists team agreements to the database with deduplication, validation, and normalization.
 * Handles UUID validation for agreed_by and facilitated_by, date normalization, and enum mapping.
 */

import { logger } from '../../../../utils/logger'
import type { PoolClient } from 'pg'
import type { PersistenceResult } from '../../base/Persistence'
import { normalizeDate } from '../../base/Persistence'
import { coerceNumber, coerceInteger } from '../../base/Parser'
import { isValidUUID } from '../../base/Persistence'
import type { TeamAgreement } from './types'

/**
 * Ensure value is a string array
 * Handles arrays, comma/semicolon/pipe-separated strings, and single strings
 */
function ensureStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map(item => (typeof item === 'string' ? item : String(item ?? '')).trim())
      .filter(item => item.length > 0)
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return []
    if (trimmed.includes(',') || trimmed.includes(';') || trimmed.includes('|')) {
      return trimmed
        .split(/[,;|]/)
        .map(part => part.trim())
        .filter(part => part.length > 0)
    }
    return [trimmed]
  }

  return []
}

/**
 * Normalize review frequency string to enum value
 */
function normalizeReviewFrequency(value: unknown): 'weekly' | 'monthly' | 'quarterly' | 'annually' | 'as_needed' | null {
  if (!value) return null
  
  const raw = String(value).toLowerCase()
  if (raw.includes('week')) return 'weekly'
  if (raw.includes('month')) return 'monthly'
  if (raw.includes('quarter')) return 'quarterly'
  if (raw.includes('annual') || raw.includes('year')) return 'annually'
  if (raw.includes('need')) return 'as_needed'
  return null
}

/**
 * Deduplicate team agreements by title
 */
function deduplicateTeamAgreements(teamAgreements: TeamAgreement[]): TeamAgreement[] {
  const deduplicatedMap = new Map<string, TeamAgreement>()
  
  teamAgreements.forEach(agreement => {
    const normalizedTitle = (agreement.title || '').trim().toLowerCase()
    
    if (!normalizedTitle) {
      // Skip agreements without titles
      return
    }
    
    if (!deduplicatedMap.has(normalizedTitle)) {
      deduplicatedMap.set(normalizedTitle, agreement)
    } else {
      // Duplicate found - merge details (keep most detailed version)
      const existing = deduplicatedMap.get(normalizedTitle)!
      const merged: TeamAgreement = {
        ...existing,
        description: agreement.description || existing.description,
        category: agreement.category || existing.category,
        agreed_by: agreement.agreed_by?.length ? agreement.agreed_by : existing.agreed_by,
        facilitated_by: agreement.facilitated_by || existing.facilitated_by,
        effective_date: agreement.effective_date || existing.effective_date,
        review_frequency: agreement.review_frequency || existing.review_frequency,
        next_review_date: agreement.next_review_date || existing.next_review_date,
        status: agreement.status || existing.status,
        adherence_score: agreement.adherence_score !== undefined ? agreement.adherence_score : existing.adherence_score,
        violations_count: agreement.violations_count !== undefined ? agreement.violations_count : existing.violations_count,
        last_violation_date: agreement.last_violation_date || existing.last_violation_date,
        notes: agreement.notes || existing.notes
      }
      deduplicatedMap.set(normalizedTitle, merged)
      logger.debug(`[EXTRACTION-TEAM_AGREEMENTS] Merged duplicate agreement: "${agreement.title}"`)
    }
  })
  
  return Array.from(deduplicatedMap.values())
}

/**
 * Save team agreements to database
 */
export async function saveTeamAgreements(
  client: PoolClient,
  projectId: string,
  userId: string,
  teamAgreements: TeamAgreement[]
): Promise<PersistenceResult> {
  if (teamAgreements.length === 0) {
    logger.info('[EXTRACTION] No team_agreements to save, skipping')
    return { saved: 0, skipped: 0, failed: 0 }
  }

  try {
    // Deduplicate team agreements
    const uniqueTeamAgreements = deduplicateTeamAgreements(teamAgreements)
    const skippedCount = teamAgreements.length - uniqueTeamAgreements.length

    if (skippedCount > 0) {
      logger.info(`[EXTRACTION-TEAM_AGREEMENTS] Deduplicated ${teamAgreements.length} → ${uniqueTeamAgreements.length} team agreements`)
    }

    // Define allowed values
    const allowedCategories = new Set([
      'working_hours',
      'communication',
      'decision_making',
      'conflict_resolution',
      'quality_standards',
      'meeting_norms',
      'code_of_conduct',
      'collaboration_tools',
      'response_times',
      'knowledge_sharing',
      'other'
    ])
    const allowedStatuses = new Set(['draft', 'active', 'under_review', 'revised', 'deprecated'])

    // Build bulk insert
    const values: any[] = []
    const placeholders: string[] = []

    uniqueTeamAgreements.forEach((agreement, index) => {
      const offset = index * 17
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14}, $${offset + 15}, $${offset + 16}, $${offset + 17})`
      )

      // Normalize category
      const rawCategory = (agreement.category || 'other').toString().toLowerCase().replace(/\s+/g, '_')
      const category = allowedCategories.has(rawCategory) ? rawCategory : 'other'

      // Normalize status
      const rawStatus = (agreement.status || 'active').toString().toLowerCase().replace(/\s+/g, '_')
      const status = allowedStatuses.has(rawStatus) ? rawStatus : 'active'

      // Normalize review frequency
      const reviewFrequency = normalizeReviewFrequency(agreement.review_frequency)

      // Clamp adherence score (0-10)
      const adherenceScoreRaw = coerceNumber(agreement.adherence_score)
      const adherenceScore = adherenceScoreRaw === null || adherenceScoreRaw === undefined
        ? null
        : Math.max(0, Math.min(10, adherenceScoreRaw))

      // Normalize violations count (non-negative)
      const violationsCountRaw = coerceInteger(agreement.violations_count)
      const violationsCount = violationsCountRaw === null || violationsCountRaw === undefined
        ? 0
        : Math.max(0, violationsCountRaw)

      // Build notes (concatenate notes and source_document if present)
      const notesSegments: string[] = []
      if (agreement.notes) {
        notesSegments.push(agreement.notes)
      }
      if (agreement.source_document) {
        notesSegments.push(`Source: ${agreement.source_document}`)
      }
      const notes = notesSegments.length > 0 ? notesSegments.join('\n\n') : null

      // Validate and normalize source_document_id (must be valid UUID or null)
      const sourceDocumentId = agreement.source_document_id && isValidUUID(agreement.source_document_id)
        ? agreement.source_document_id
        : null

      // Validate and normalize agreed_by (must be array of UUIDs)
      const rawAgreedBy = ensureStringArray(agreement.agreed_by || [])
      const agreedByArray = rawAgreedBy
        .map(item => {
          const trimmed = item.trim()
          // Only keep valid UUIDs
          if (isValidUUID(trimmed)) {
            return trimmed
          } else {
            logger.warn(`[EXTRACTION-TEAM_AGREEMENTS] Filtered out non-UUID value from agreed_by: "${item}" (agreement: "${agreement.title}")`)
            return null
          }
        })
        .filter((item): item is string => item !== null) // Remove nulls

      if (rawAgreedBy.length > 0 && agreedByArray.length === 0) {
        logger.warn(`[EXTRACTION-TEAM_AGREEMENTS] All agreed_by values were filtered out (no valid UUIDs found) for agreement: "${agreement.title}"`)
      }

      // Pass as array, not stringified - pg library will convert to JSONB
      const agreedByJson = agreedByArray.length > 0 ? agreedByArray : []

      // effective_date is NOT NULL, so provide default (current date) if not provided
      const effectiveDate = normalizeDate(agreement.effective_date) || new Date().toISOString().split('T')[0]

      // facilitated_by must be a UUID (references users.id), not a name string
      // If it's not a valid UUID, set to NULL
      const rawFacilitatedBy = agreement.facilitated_by
      const facilitatedBy = rawFacilitatedBy && isValidUUID(rawFacilitatedBy)
        ? rawFacilitatedBy
        : null

      if (rawFacilitatedBy && !facilitatedBy) {
        logger.warn(`[EXTRACTION-TEAM_AGREEMENTS] facilitated_by "${rawFacilitatedBy}" is not a valid UUID, setting to NULL`)
      }

      values.push(
        projectId,
        (agreement.title?.substring(0, 200) || 'Team Agreement'), // Truncate to 200 chars
        agreement.description || 'No description provided', // NOT NULL constraint
        category,
        agreedByJson, // JSONB array of UUIDs
        facilitatedBy, // Only set if valid UUID, otherwise NULL
        effectiveDate, // Use current date as default if not provided (NOT NULL constraint)
        reviewFrequency,
        normalizeDate(agreement.next_review_date),
        status,
        adherenceScore,
        violationsCount,
        normalizeDate(agreement.last_violation_date),
        sourceDocumentId,
        notes,
        userId,
        userId // updated_by
      )
    })

    // Execute bulk insert
    await client.query(
      `INSERT INTO team_agreements (
        project_id, title, description, category, agreed_by, facilitated_by,
        effective_date, review_frequency, next_review_date, status,
        adherence_score, violations_count, last_violation_date,
        source_document_id, notes, created_by, updated_by
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (project_id, title) DO UPDATE SET
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        agreed_by = EXCLUDED.agreed_by,
        facilitated_by = EXCLUDED.facilitated_by,
        effective_date = EXCLUDED.effective_date,
        review_frequency = EXCLUDED.review_frequency,
        next_review_date = EXCLUDED.next_review_date,
        status = EXCLUDED.status,
        adherence_score = EXCLUDED.adherence_score,
        violations_count = EXCLUDED.violations_count,
        last_violation_date = EXCLUDED.last_violation_date,
        source_document_id = COALESCE(EXCLUDED.source_document_id, team_agreements.source_document_id),
        notes = EXCLUDED.notes,
        updated_by = EXCLUDED.updated_by,
        updated_at = CURRENT_TIMESTAMP`,
      values
    )

    logger.info(`[EXTRACTION] Saved ${uniqueTeamAgreements.length} team agreements (deduplicated from ${teamAgreements.length})`)

    return {
      saved: uniqueTeamAgreements.length,
      skipped: skippedCount,
      failed: 0
    }
  } catch (error: unknown) {
    logger.error('[EXTRACTION-TEAM-AGREEMENTS] Failed to save team agreements', {
      projectId,
      error: error instanceof Error ? error.message : String(error)
    })
    
    return {
      saved: 0,
      skipped: 0,
      failed: teamAgreements.length,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

