/**
 * Relationship Health Entity Module
 */

import { logger } from '../../../../utils/logger'
import { aiService } from '../../../aiService'
import type { ExtractionContext } from '../../base/ExtractionContext'
import type { ExtractionResult } from '../../base/ExtractionResult'
import { parseAIResponse, coerceArray, coerceNumber } from '../../base/Parser'
import { buildExtractionPrompt } from '../../base/PromptBuilder'
import { resolveSourceDocumentIdStrict } from '../../base/SourceDocumentResolver'
import { extractionCacheService } from '../../cache'
import type { PoolClient } from 'pg'
import type { PersistenceResult } from '../../base/Persistence'

export interface RelationshipHealth {
  stakeholder_id?: string
  stakeholder_name?: string
  assessment_date?: string
  health_score?: number | null
  health_status?: string
  indicators?: string[]
  trend?: string
  notes?: string
  source_document?: string
  source_document_id?: string
}

export async function extractRelationshipHealth(
  context: ExtractionContext,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<ExtractionResult<RelationshipHealth>> {
  const startTime = Date.now()
  let rejectedCount = 0

  try {
    logger.info('[EXTRACTION-RELATIONSHIP-HEALTH] Starting extraction', {
      projectId: context.projectId,
      documentCount: context.documents.length
    })

    const cached = await extractionCacheService.get(
      context.projectId,
      context.documentContext,
      'relationship_health',
      context.provider,
      context.model
    )

    if (cached && cached.length > 0) {
      logger.info(`[EXTRACTION-RELATIONSHIP-HEALTH] ✅ Using cached result (${cached.length} entities)`)
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
  "relationship_health": [
    {
      "stakeholder_id": "Stakeholder ID",
      "stakeholder_name": "Stakeholder name",
      "assessment_date": "YYYY-MM-DD",
      "health_score": 78,
      "health_status": "good|fair|poor",
      "indicators": ["Trust", "Responsiveness"],
      "trend": "improving|stable|declining",
      "notes": "Assessment notes",
      "source_document": "EXACT document title from available list"
    }
  ]
}`

    const requirements = [
      'Provide relationship health score or status when available',
      'Include indicators or reasons for the health assessment',
      'Include assessment date if provided'
    ]

    const prompt = buildExtractionPrompt(
      context,
      'relationship_health',
      'relationship health assessments',
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
    const rawEntities = parsed.relationship_health || []

    const normalized: RelationshipHealth[] = rawEntities.map((entity: RelationshipHealth) => ({
      ...entity,
      health_score: coerceNumber(entity?.health_score),
      indicators: coerceArray<string>(entity?.indicators)
    }))

    const validEntities: RelationshipHealth[] = []
    normalized.forEach((entity) => {
      const resolution = resolveSourceDocumentIdStrict(
        entity,
        context,
        'RELATIONSHIP-HEALTH',
        entity.stakeholder_name || entity.stakeholder_id || 'Relationship Health'
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
        'relationship_health',
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
    logger.error('[EXTRACTION-RELATIONSHIP-HEALTH] Extraction failed', {
      projectId: context.projectId,
      error: error instanceof Error ? error.message : String(error)
    })
    throw error
  }
}

export async function saveRelationshipHealth(
  client: PoolClient,
  projectId: string,
  userId: string,
  entities: RelationshipHealth[]
): Promise<PersistenceResult> {
  if (entities.length === 0) {
    return { saved: 0, skipped: 0, failed: 0 }
  }

  try {
    await client.query('DELETE FROM relationship_health WHERE project_id = $1', [projectId])

    const values: any[] = []
    const placeholders: string[] = []

    entities.forEach((e, index) => {
      const offset = index * 11
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11})`
      )

      values.push(
        projectId,
        e.stakeholder_id || null,
        e.stakeholder_name || null,
        e.assessment_date || null,
        e.health_score ?? null,
        e.health_status || null,
        e.indicators || [],
        e.trend || null,
        e.notes || null,
        e.source_document_id || null,
        userId
      )
    })

    await client.query(
      `INSERT INTO relationship_health (
        project_id, stakeholder_id, stakeholder_name, assessment_date, health_score,
        health_status, indicators, trend, notes, source_document_id, created_by
      )
      VALUES ${placeholders.join(', ')}`,
      values
    )

    return { saved: entities.length, skipped: 0, failed: 0 }
  } catch (error: unknown) {
    logger.error('[EXTRACTION-RELATIONSHIP-HEALTH] Failed to save', {
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
