/**
 * Resource Conflicts Entity Module
 */

import { logger } from '../../../../utils/logger'
import { aiService } from '../../../aiService'
import type { ExtractionContext } from '../../base/ExtractionContext'
import type { ExtractionResult } from '../../base/ExtractionResult'
import { parseAIResponse, coerceArray } from '../../base/Parser'
import { buildExtractionPrompt } from '../../base/PromptBuilder'
import { resolveSourceDocumentIdStrict } from '../../base/SourceDocumentResolver'
import { extractionCacheService } from '../../cache'
import type { PoolClient } from 'pg'
import type { PersistenceResult } from '../../base/Persistence'

export interface ResourceConflict {
  resource_id?: string
  resource_name?: string
  conflict_type?: string
  conflict_description?: string
  impacted_activities?: string[]
  severity?: string
  resolution?: string
  resolution_date?: string
  source_document?: string
  source_document_id?: string
}

export async function extractResourceConflicts(
  context: ExtractionContext,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<ExtractionResult<ResourceConflict>> {
  const startTime = Date.now()
  let rejectedCount = 0

  try {
    logger.info('[EXTRACTION-RESOURCE-CONFLICTS] Starting extraction', {
      projectId: context.projectId,
      documentCount: context.documents.length
    })

    const cached = await extractionCacheService.get(
      context.projectId,
      context.documentContext,
      'resource_conflicts',
      context.provider,
      context.model
    )

    if (cached && cached.length > 0) {
      logger.info(`[EXTRACTION-RESOURCE-CONFLICTS] ✅ Using cached result (${cached.length} entities)`)
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
  "resource_conflicts": [
    {
      "resource_id": "Resource ID",
      "resource_name": "Resource name",
      "conflict_type": "Overallocated|Schedule Clash|Skill Gap",
      "conflict_description": "Description of the conflict",
      "impacted_activities": ["Activity A", "Activity B"],
      "severity": "Low|Medium|High",
      "resolution": "Resolution or mitigation plan",
      "resolution_date": "YYYY-MM-DD",
      "source_document": "EXACT document title from available list"
    }
  ]
}`

    const requirements = [
      'List resource conflicts and overallocation issues',
      'Include impacted activities when available',
      'Capture severity and resolution details'
    ]

    const prompt = buildExtractionPrompt(
      context,
      'resource_conflicts',
      'resource conflicts and overallocation issues',
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
    const rawEntities = parsed.resource_conflicts || []

    const normalized: ResourceConflict[] = rawEntities.map((entity: ResourceConflict) => ({
      ...entity,
      impacted_activities: coerceArray<string>(entity?.impacted_activities)
    }))

    const validEntities: ResourceConflict[] = []
    normalized.forEach((entity) => {
      const resolution = resolveSourceDocumentIdStrict(
        entity,
        context,
        'RESOURCE-CONFLICTS',
        entity.resource_name || entity.conflict_type || 'Resource Conflict'
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
        'resource_conflicts',
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
    logger.error('[EXTRACTION-RESOURCE-CONFLICTS] Extraction failed', {
      projectId: context.projectId,
      error: error instanceof Error ? error.message : String(error)
    })
    throw error
  }
}

export async function saveResourceConflicts(
  client: PoolClient,
  projectId: string,
  userId: string,
  entities: ResourceConflict[]
): Promise<PersistenceResult> {
  if (entities.length === 0) {
    return { saved: 0, skipped: 0, failed: 0 }
  }

  try {
    await client.query('DELETE FROM resource_conflicts WHERE project_id = $1', [projectId])

    const values: any[] = []
    const placeholders: string[] = []

    entities.forEach((e, index) => {
      const offset = index * 11
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11})`
      )

      values.push(
        projectId,
        e.resource_id || null,
        e.resource_name || null,
        e.conflict_type || null,
        e.conflict_description || null,
        e.impacted_activities || [],
        e.severity || null,
        e.resolution || null,
        e.resolution_date || null,
        e.source_document_id || null,
        userId
      )
    })

    await client.query(
      `INSERT INTO resource_conflicts (
        project_id, resource_id, resource_name, conflict_type, conflict_description,
        impacted_activities, severity, resolution, resolution_date, source_document_id, created_by
      )
      VALUES ${placeholders.join(', ')}`,
      values
    )

    return { saved: entities.length, skipped: 0, failed: 0 }
  } catch (error: unknown) {
    logger.error('[EXTRACTION-RESOURCE-CONFLICTS] Failed to save', {
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
