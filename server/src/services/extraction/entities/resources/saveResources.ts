/**
 * Save Resources
 * 
 * Persists resources to the database with deduplication, type normalization, and validation.
 * Handles array fields (skills, certifications, training_needs) and numeric normalization.
 */

import { logger } from '../../../../utils/logger'
import type { PoolClient } from 'pg'
import type { PersistenceResult } from '../../base/Persistence'
import { coerceNumber } from '../../base/Parser'
import type { Resource } from './types'

/**
 * Ensure value is a string array
 */
function ensureStringArray(value: any): string[] {
  if (Array.isArray(value)) {
    return value.filter(item => typeof item === 'string').map(item => String(item).trim()).filter(Boolean)
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return []
    return [trimmed]
  }
  return []
}

/**
 * Normalize resource type to database enum
 * DB allows: human, equipment, material, software, facility, budget
 * AI returns: financial, human, equipment, material, software, facility
 */
function normalizeResourceType(rawType: string | undefined): 'human' | 'equipment' | 'material' | 'software' | 'facility' | 'budget' {
  const typeMap: Record<string, 'human' | 'equipment' | 'material' | 'software' | 'facility' | 'budget'> = {
    'financial': 'budget',
    'budget': 'budget',
    'money': 'budget',
    'funding': 'budget',
    'human': 'human',
    'people': 'human',
    'staff': 'human',
    'equipment': 'equipment',
    'hardware': 'equipment',
    'material': 'material',
    'software': 'software',
    'facility': 'facility',
    'facilities': 'facility'
  }
  
  if (!rawType) return 'material'
  const normalized = rawType.toLowerCase().trim()
  return typeMap[normalized] || 'material'
}

/**
 * Normalize competency level
 */
function normalizeCompetencyLevel(rawLevel: string | undefined): 'junior' | 'intermediate' | 'senior' | 'expert' | null {
  const allowedCompetencies = new Set(['junior', 'intermediate', 'senior', 'expert'])
  if (!rawLevel) return null
  const competency = rawLevel.toLowerCase().trim()
  return allowedCompetencies.has(competency) ? (competency as 'junior' | 'intermediate' | 'senior' | 'expert') : null
}

/**
 * Normalize performance rating (0-10)
 */
function normalizePerformanceRating(rawRating: any): number | null {
  const coerced = coerceNumber(rawRating)
  if (coerced === null) return null
  return Math.max(0, Math.min(10, coerced))
}

/**
 * Deduplicate resources by name
 */
function deduplicateResources(resources: Resource[]): Resource[] {
  // Deduplicate by normalized name (ON CONFLICT requires unique names)
  const uniqueMap = new Map<string, Resource>()
  
  resources.forEach(resource => {
    const normalizedName = resource.name.toLowerCase().trim()
    if (!uniqueMap.has(normalizedName)) {
      uniqueMap.set(normalizedName, resource)
    } else {
      // Duplicate found - keep first occurrence
      logger.debug(`[EXTRACTION-RESOURCES] Skipping duplicate resource: "${resource.name}"`)
    }
  })
  
  return Array.from(uniqueMap.values())
}

/**
 * Save resources to database
 */
export async function saveResources(
  client: PoolClient,
  projectId: string,
  userId: string,
  resources: Resource[]
): Promise<PersistenceResult> {
  if (resources.length === 0) {
    logger.info('[EXTRACTION] No resources to save, skipping')
    return { saved: 0, skipped: 0, failed: 0 }
  }

  try {
    // Deduplicate resources
    const uniqueResources = deduplicateResources(resources)
    const skippedCount = resources.length - uniqueResources.length

    if (skippedCount > 0) {
      logger.warn(`[EXTRACTION] Deduplicated resources: ${resources.length} → ${uniqueResources.length}`)
    }

    // Build bulk insert
    const values: any[] = []
    const placeholders: string[] = []

    uniqueResources.forEach((r, index) => {
      const offset = index * 15
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14}, $${offset + 15})`
      )
      
      // Normalize type
      const mappedType = normalizeResourceType(r.type)
      
      // Normalize competency level
      const competencyLevel = normalizeCompetencyLevel(r.competency_level)
      
      // Normalize performance rating (0-10)
      const performanceRating = normalizePerformanceRating(r.performance_rating)
      
      // Resolve source_document_id
      const sourceDocumentId = r.source_document_id || null
      
      values.push(
        projectId,
        r.name,
        mappedType,  // Use mapped type value
        r.role || null,
        r.allocation || null,
        r.availability || null,
        ensureStringArray(r.skills),
        competencyLevel,
        ensureStringArray(r.certifications),
        ensureStringArray(r.training_needs),
        r.team_assignment ? r.team_assignment.substring(0, 255) : null, // Truncate to 255 chars
        performanceRating,
        r.development_plan || null,
        sourceDocumentId,
        userId
      )
    })

    // Execute bulk insert
    await client.query(
      `INSERT INTO resources (
        project_id, name, type, role, allocation, availability, skills,
        competency_level, certifications, training_needs, team_assignment,
        performance_rating, development_plan, source_document_id, created_by
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (project_id, name) DO UPDATE SET
        type = EXCLUDED.type,
        role = EXCLUDED.role,
        allocation = EXCLUDED.allocation,
        availability = EXCLUDED.availability,
        skills = EXCLUDED.skills,
        competency_level = EXCLUDED.competency_level,
        certifications = EXCLUDED.certifications,
        training_needs = EXCLUDED.training_needs,
        team_assignment = EXCLUDED.team_assignment,
        performance_rating = EXCLUDED.performance_rating,
        development_plan = EXCLUDED.development_plan,
        source_document_id = COALESCE(EXCLUDED.source_document_id, resources.source_document_id),
        updated_at = CURRENT_TIMESTAMP`,
      values
    )

    logger.info(`[EXTRACTION] Saved ${uniqueResources.length} resources`)

    return {
      saved: uniqueResources.length,
      skipped: skippedCount,
      failed: 0
    }
  } catch (error: unknown) {
    logger.error('[EXTRACTION-RESOURCES] Failed to save resources', {
      projectId,
      error: error instanceof Error ? error.message : String(error)
    })
    
    return {
      saved: 0,
      skipped: 0,
      failed: resources.length,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

