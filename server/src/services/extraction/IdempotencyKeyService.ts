/**
 * Idempotency Key Service
 * 
 * Provides deterministic, SHA-256 based idempotency keys for entity deduplication.
 * Enables safe re-runs and multi-batch extraction without duplicates.
 * 
 * Strategy:
 * - Deterministic content hash: SHA256(projectId + entityType + stableContent)
 * - Survives AI response variance (same facts → same hash)
 * - Safe for concurrent/retried extractions
 * - Better than title-based dedup (handles title changes)
 */

import { createHash } from 'crypto'
import { logger } from '../../utils/logger'

/**
 * Generate SHA-256 idempotency key from stable content fields
 */
export function generateIdempotencyKey(
  projectId: string,
  entityType: string,
  stableContent: Record<string, string | number | boolean | null | undefined>
): string {
  try {
    // Build deterministic content string from stable fields
    // Include entity type to prevent cross-entity collisions
    const contentString = Object.keys(stableContent)
      .sort() // Sort keys for deterministic ordering
      .map(key => {
        const value = stableContent[key]
        // Normalize to string, handle nulls
        const stringValue = value === null || value === undefined ? '' : String(value).toLowerCase().trim()
        return `${key}:${stringValue}`
      })
      .join('|')

    const fullContent = `${projectId}:${entityType}:${contentString}`

    const hash = createHash('sha256')
      .update(fullContent)
      .digest('hex')

    logger.debug(`[IDEMPOTENCY-KEY] Generated key for ${entityType}`, {
      projectId: projectId.substring(0, 8),
      key: hash.substring(0, 16)
    })

    return hash
  } catch (error: unknown) {
    logger.error('[IDEMPOTENCY-KEY] Failed to generate key', {
      entityType,
      error: error instanceof Error ? error.message : String(error)
    })
    throw error
  }
}

/**
 * Generate idempotency key for risk entity
 * Stable fields: title, category, probability, impact
 */
export function generateRiskIdempotencyKey(
  projectId: string,
  risk: {
    title?: string
    category?: string
    probability?: string
    impact?: string
  }
): string {
  return generateIdempotencyKey(projectId, 'risk', {
    title: risk.title || '',
    category: risk.category || '',
    probability: risk.probability || '',
    impact: risk.impact || ''
  })
}

/**
 * Generate idempotency key for stakeholder entity
 * Stable fields: name, role, organization
 */
export function generateStakeholderIdempotencyKey(
  projectId: string,
  stakeholder: {
    name?: string
    role?: string
    organization?: string
  }
): string {
  return generateIdempotencyKey(projectId, 'stakeholder', {
    name: stakeholder.name || '',
    role: stakeholder.role || '',
    organization: stakeholder.organization || ''
  })
}

/**
 * Generate idempotency key for requirement entity
 * Stable fields: title, description (partial)
 */
export function generateRequirementIdempotencyKey(
  projectId: string,
  requirement: {
    title?: string
    description?: string
  }
): string {
  // Use first 200 chars of description to avoid keys changing with minor description edits
  const descPartial = requirement.description ? requirement.description.substring(0, 200) : ''

  return generateIdempotencyKey(projectId, 'requirement', {
    title: requirement.title || '',
    description_partial: descPartial
  })
}

/**
 * Generate idempotency key for milestone entity
 * Stable fields: name, planned_date (if available)
 */
export function generateMilestoneIdempotencyKey(
  projectId: string,
  milestone: {
    name?: string
    planned_date?: string
  }
): string {
  return generateIdempotencyKey(projectId, 'milestone', {
    name: milestone.name || '',
    planned_date: milestone.planned_date || ''
  })
}

/**
 * Generate idempotency key for deliverable entity
 * Stable fields: name, description (partial)
 */
export function generateDeliverableIdempotencyKey(
  projectId: string,
  deliverable: {
    name?: string
    description?: string
  }
): string {
  const descPartial = deliverable.description ? deliverable.description.substring(0, 200) : ''

  return generateIdempotencyKey(projectId, 'deliverable', {
    name: deliverable.name || '',
    description_partial: descPartial
  })
}

/**
 * Generate idempotency key for budget entity
 * Stable fields: name, total_amount, currency
 */
export function generateBudgetIdempotencyKey(
  projectId: string,
  budget: {
    name?: string
    total_amount?: number | string
    currency?: string
  }
): string {
  return generateIdempotencyKey(projectId, 'budget', {
    name: budget.name || '',
    total_amount: String(budget.total_amount || ''),
    currency: budget.currency || ''
  })
}

/**
 * Generate idempotency key for WBS node
 * Stable fields: wbs_code, name
 */
export function generateWBSNodeIdempotencyKey(
  projectId: string,
  node: {
    wbs_code?: string
    name?: string
  }
): string {
  return generateIdempotencyKey(projectId, 'wbs_node', {
    wbs_code: node.wbs_code || '',
    name: node.name || ''
  })
}

/**
 * Generate idempotency key for generic entity
 * Caller specifies stable fields
 */
export function generateGenericIdempotencyKey(
  projectId: string,
  entityType: string,
  stableFields: Record<string, string | number | boolean | null | undefined>
): string {
  return generateIdempotencyKey(projectId, entityType, stableFields)
}

/**
 * Idempotency key service singleton
 */
export const idempotencyKeyService = {
  generateIdempotencyKey,
  generateRiskIdempotencyKey,
  generateStakeholderIdempotencyKey,
  generateRequirementIdempotencyKey,
  generateMilestoneIdempotencyKey,
  generateDeliverableIdempotencyKey,
  generateBudgetIdempotencyKey,
  generateWBSNodeIdempotencyKey,
  generateGenericIdempotencyKey
}
