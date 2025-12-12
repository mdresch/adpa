/**
 * Save Project Iterations
 * 
 * Persists project iterations to the database with deduplication, type/status normalization, and validation.
 * Handles array fields (goals, impediments) and numeric fields (story points, velocity).
 */

import { logger } from '../../../../utils/logger'
import type { PoolClient } from 'pg'
import type { PersistenceResult } from '../../base/Persistence'
import { normalizeDate } from '../../base/Persistence'
import { coerceInteger } from '../../base/Parser'
import type { ProjectIteration } from './types'

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
 * Normalize iteration type to database enum
 */
function normalizeIterationType(rawType: string | undefined): 'sprint' | 'iteration' | 'program_increment' | 'release' | 'phase' {
  const typeMap: Record<string, 'sprint' | 'iteration' | 'program_increment' | 'release' | 'phase'> = {
    'sprint': 'sprint',
    'iteration': 'iteration',
    'increment': 'program_increment',
    'program increment': 'program_increment',
    'program_increment': 'program_increment',
    'release': 'release',
    'phase': 'phase'
  }
  
  if (!rawType) return 'sprint'
  const normalized = rawType.toLowerCase().trim()
  return typeMap[normalized] || 'sprint'
}

/**
 * Normalize status to database enum
 */
function normalizeStatus(rawStatus: string | undefined): 'planned' | 'active' | 'completed' | 'cancelled' {
  const statusMap: Record<string, 'planned' | 'active' | 'completed' | 'cancelled'> = {
    'planned': 'planned',
    'pending': 'planned',
    'active': 'active',
    'in_progress': 'active',
    'executing': 'active',
    'completed': 'completed',
    'done': 'completed',
    'finished': 'completed',
    'cancelled': 'cancelled',
    'canceled': 'cancelled'
  }
  
  if (!rawStatus) return 'planned'
  const normalized = rawStatus.toLowerCase().trim()
  return statusMap[normalized] || 'planned'
}

/**
 * Deduplicate project iterations by name
 */
function deduplicateProjectIterations(iterations: ProjectIteration[]): ProjectIteration[] {
  const deduplicatedMap = new Map<string, ProjectIteration>()
  
  iterations.forEach(iteration => {
    const normalizedName = (iteration.name || '').trim().toLowerCase()
    
    if (!normalizedName) {
      return // Skip iterations without names
    }
    
    if (!deduplicatedMap.has(normalizedName)) {
      deduplicatedMap.set(normalizedName, iteration)
    } else {
      // Duplicate found - merge details (keep most detailed version)
      const existing = deduplicatedMap.get(normalizedName)!
      const merged: ProjectIteration = {
        ...existing,
        iteration_type: iteration.iteration_type || existing.iteration_type,
        sequence_number: iteration.sequence_number !== undefined ? iteration.sequence_number : existing.sequence_number,
        start_date: iteration.start_date || existing.start_date,
        end_date: iteration.end_date || existing.end_date,
        goals: iteration.goals?.length ? iteration.goals : existing.goals,
        planned_story_points: iteration.planned_story_points !== undefined ? iteration.planned_story_points : existing.planned_story_points,
        completed_story_points: iteration.completed_story_points !== undefined ? iteration.completed_story_points : existing.completed_story_points,
        velocity: iteration.velocity !== undefined ? iteration.velocity : existing.velocity,
        status: iteration.status || existing.status,
        retrospective_summary: iteration.retrospective_summary || existing.retrospective_summary,
        impediments: iteration.impediments?.length ? iteration.impediments : existing.impediments
      }
      deduplicatedMap.set(normalizedName, merged)
      logger.debug(`[EXTRACTION-PROJECT-ITERATIONS] Merged duplicate iteration: "${iteration.name}"`)
    }
  })
  
  return Array.from(deduplicatedMap.values())
}

/**
 * Save project iterations to database
 */
export async function saveProjectIterations(
  client: PoolClient,
  projectId: string,
  userId: string,
  projectIterations: ProjectIteration[]
): Promise<PersistenceResult> {
  if (projectIterations.length === 0) {
    logger.info('[EXTRACTION] No project_iterations to save, skipping')
    return { saved: 0, skipped: 0, failed: 0 }
  }

  try {
    // Deduplicate project iterations
    const uniqueIterations = deduplicateProjectIterations(projectIterations)
    const skippedCount = projectIterations.length - uniqueIterations.length

    if (skippedCount > 0) {
      logger.info(`[EXTRACTION-PROJECT-ITERATIONS] Deduplicated ${projectIterations.length} → ${uniqueIterations.length} project iterations`)
    }

    // Build bulk insert
    const values: any[] = []
    const placeholders: string[] = []

    uniqueIterations.forEach((iteration, index) => {
      const offset = index * 16
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14}, $${offset + 15}, $${offset + 16})`
      )

      const iterationType = normalizeIterationType(iteration.iteration_type)
      const status = normalizeStatus(iteration.status)

      values.push(
        projectId,
        (iteration.name?.substring(0, 200) || 'Iteration'), // Truncate name to 200 chars
        iterationType,
        coerceInteger(iteration.sequence_number),
        normalizeDate(iteration.start_date),
        normalizeDate(iteration.end_date),
        ensureStringArray(iteration.goals),
        coerceInteger(iteration.planned_story_points),
        coerceInteger(iteration.completed_story_points),
        coerceInteger(iteration.velocity),
        status,
        iteration.retrospective_summary || null,
        ensureStringArray(iteration.impediments),
        iteration.source_document_id || null,
        userId,
        userId
      )
    })

    // Execute bulk insert
    await client.query(
      `INSERT INTO project_iterations (
        project_id, name, iteration_type, sequence_number, start_date, end_date,
        goals, planned_story_points, completed_story_points, velocity, status,
        retrospective_summary, impediments, source_document_id, created_by, updated_by
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (project_id, name) DO UPDATE SET
        iteration_type = EXCLUDED.iteration_type,
        sequence_number = EXCLUDED.sequence_number,
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date,
        goals = EXCLUDED.goals,
        planned_story_points = EXCLUDED.planned_story_points,
        completed_story_points = EXCLUDED.completed_story_points,
        velocity = EXCLUDED.velocity,
        status = EXCLUDED.status,
        retrospective_summary = EXCLUDED.retrospective_summary,
        impediments = EXCLUDED.impediments,
        source_document_id = COALESCE(EXCLUDED.source_document_id, project_iterations.source_document_id),
        updated_by = EXCLUDED.updated_by,
        updated_at = CURRENT_TIMESTAMP`,
      values
    )

    logger.info(`[EXTRACTION] Saved ${uniqueIterations.length} project iterations (deduplicated from ${projectIterations.length})`)

    return {
      saved: uniqueIterations.length,
      skipped: skippedCount,
      failed: 0
    }
  } catch (error: unknown) {
    logger.error('[EXTRACTION-PROJECT-ITERATIONS] Failed to save project iterations', {
      projectId,
      error: error instanceof Error ? error.message : String(error)
    })
    
    return {
      saved: 0,
      skipped: 0,
      failed: projectIterations.length,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

