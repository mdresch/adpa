/**
 * Resource Pool Entity Module
 */

import { logger } from '../../../../utils/logger'
import { aiService } from '../../../aiService'
import type { ExtractionContext } from '../../base/ExtractionContext'
import type { ExtractionResult } from '../../base/ExtractionResult'
import { parseAIResponse, coerceNumber, coerceArray } from '../../base/Parser'
import { buildExtractionPrompt } from '../../base/PromptBuilder'
import { resolveSourceDocumentIdStrict } from '../../base/SourceDocumentResolver'
import { extractionCacheService } from '../../cache'
import type { PoolClient } from 'pg'
import type { PersistenceResult } from '../../base/Persistence'

export interface ResourcePoolEntry {
  resource_name?: string
  role?: string
  resource_type?: string
  skills?: string[]
  availability_pct?: number | null
  cost_rate?: number | null
  capacity_hours?: number | null
  location?: string
  source_document?: string
  source_document_id?: string
}

export async function extractResourcePool(
  context: ExtractionContext,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<ExtractionResult<ResourcePoolEntry>> {
  const startTime = Date.now()
  let rejectedCount = 0

  try {
    logger.info('[EXTRACTION-RESOURCE-POOL] Starting extraction', {
      projectId: context.projectId,
      documentCount: context.documents.length
    })

    const cached = await extractionCacheService.get(
      context.projectId,
      context.documentContext,
      'resource_pool',
      context.provider,
      context.model
    )

    if (cached && cached.length > 0) {
      logger.info(`[EXTRACTION-RESOURCE-POOL] ✅ Using cached result (${cached.length} entities)`)
      return {
        entities: cached,
        rejectedCount: 0,
        skippedCount: 0,
        stats: {
          totalExtracted: cached.length,
          afterDeduplication: cached.length,
          afterSourceResolution: cached.length,
          finalCount: cached.length,
          cacheHit: true,
          durationMs: Date.now() - startTime,
          provider: context.provider,
          model: context.model
        }
      }
    }

    const jsonStructure = `{
  "resource_pool": [
    {
      "resource_name": "Resource name",
      "role": "Role or title",
      "resource_type": "Human|Equipment|Contractor",
      "skills": ["Skill 1", "Skill 2"],
      "availability_pct": 75,
      "cost_rate": 120,
      "capacity_hours": 160,
      "location": "Location or timezone",
      "source_document": "EXACT document title from available list"
    }
  ]
}`

    const requirements = [
      'List available resources with roles and skills',
      'Include availability percentages or capacity hours when provided',
      'Capture cost rates if available'
    ]

    const prompt = buildExtractionPrompt(
      context,
      'resource_pool',
      'resource pool entries with skills and availability',
      jsonStructure,
      requirements
    )

    const response = await aiService.generateWithFallback(
      {
        prompt,
        provider: context.provider,
        model: context.model,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.maxTokens ?? 4000
      },
      ['openai', 'google', 'anthropic']
    )

    const parsed = parseAIResponse(response.content)
    const rawEntities = parsed.resource_pool || []

    const normalized: ResourcePoolEntry[] = rawEntities.map((entity: ResourcePoolEntry) => ({
      ...entity,
      skills: coerceArray<string>(entity?.skills),
      availability_pct: coerceNumber(entity?.availability_pct),
      cost_rate: coerceNumber(entity?.cost_rate),
      capacity_hours: coerceNumber(entity?.capacity_hours)
    }))

    const validEntities: ResourcePoolEntry[] = []
    normalized.forEach((entity) => {
      const resolution = resolveSourceDocumentIdStrict(
        entity,
        context,
        'RESOURCE-POOL',
        entity.resource_name || 'Resource'
      )

      if (resolution.resolved) {
        validEntities.push(entity)
      } else {
        rejectedCount++
      }
    })

    if (validEntities.length > 0) {
      await extractionCacheService.set(
        context.projectId,
        context.documentContext,
        'resource_pool',
        validEntities,
        context.provider,
        context.model
      )
    }

    return {
      entities: validEntities,
      rejectedCount,
      skippedCount: 0,
      stats: {
        totalExtracted: rawEntities.length,
        afterDeduplication: normalized.length,
        afterSourceResolution: validEntities.length,
        finalCount: validEntities.length,
        cacheHit: false,
        durationMs: Date.now() - startTime,
        provider: context.provider,
        model: context.model
      }
    }
  } catch (error: unknown) {
    logger.error('[EXTRACTION-RESOURCE-POOL] Extraction failed', {
      projectId: context.projectId,
      error: error instanceof Error ? error.message : String(error)
    })
    throw error
  }
}

export async function saveResourcePool(
  client: PoolClient,
  projectId: string,
  userId: string,
  entities: ResourcePoolEntry[]
): Promise<PersistenceResult> {
  if (entities.length === 0) {
    return { saved: 0, skipped: 0, failed: 0 }
  }

  try {
    await client.query('DELETE FROM resources WHERE project_id = $1', [projectId])

    const values: any[] = []
    const placeholders: string[] = []

    entities.forEach((e, index) => {
      const offset = index * 14
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14})`
      )

      values.push(
        projectId,
        e.resource_name || '',
        e.resource_type || 'human',
        null, // description (not available from resource_pool)
        e.availability_pct ? String(e.availability_pct) : null, // allocation
        e.cost_rate || null, // cost_estimate
        e.skills || [],
        e.role || null,
        e.availability_pct || null,
        e.cost_rate || null,
        e.location || null,
        e.source_document_id || null,
        new Date().toISOString(), // created_at
        new Date().toISOString()  // updated_at
      )
    })

    await client.query(
      `INSERT INTO resources (
        project_id, name, type, description, allocation, cost_estimate, 
        skills, role, availability_pct, cost_rate, location,
        source_document_id, created_at, updated_at
      )
      VALUES ${placeholders.join(', ')}`,
      values
    )

    return { saved: entities.length, skipped: 0, failed: 0 }
  } catch (error: unknown) {
    logger.error('[EXTRACTION-RESOURCE-POOL] Failed to save', {
      projectId,
      error: error instanceof Error ? error.message : String(error)
    })
    return {
      saved: 0,
      skipped: 0,
      failed: entities.length,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}
