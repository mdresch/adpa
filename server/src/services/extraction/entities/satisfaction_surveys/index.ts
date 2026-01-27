/**
 * Satisfaction Surveys Entity Module
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

export interface SatisfactionSurvey {
  stakeholder_id?: string
  stakeholder_name?: string
  survey_date?: string
  nps_score?: number | null
  satisfaction_score?: number | null
  sentiment?: string
  feedback_summary?: string
  themes?: string[]
  source_document?: string
  source_document_id?: string
}

export async function extractSatisfactionSurveys(
  context: ExtractionContext,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<ExtractionResult<SatisfactionSurvey>> {
  const startTime = Date.now()
  let rejectedCount = 0

  try {
    logger.info('[EXTRACTION-SATISFACTION-SURVEYS] Starting extraction', {
      projectId: context.projectId,
      documentCount: context.documents.length
    })

    const cached = await extractionCacheService.get(
      context.projectId,
      context.documentContext,
      'satisfaction_surveys',
      context.provider,
      context.model
    )

    if (cached && cached.length > 0) {
      logger.info(`[EXTRACTION-SATISFACTION-SURVEYS] ✅ Using cached result (${cached.length} entities)`)
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
  "satisfaction_surveys": [
    {
      "stakeholder_id": "Stakeholder ID",
      "stakeholder_name": "Stakeholder name",
      "survey_date": "YYYY-MM-DD",
      "nps_score": 35,
      "satisfaction_score": 4.2,
      "sentiment": "positive|neutral|negative",
      "feedback_summary": "Summary of feedback",
      "themes": ["Communication", "Delivery"],
      "source_document": "EXACT document title from available list"
    }
  ]
}`

    const requirements = [
      'Include NPS or satisfaction scores when present',
      'Capture feedback themes as an array',
      'Include survey date if provided'
    ]

    const prompt = buildExtractionPrompt(
      context,
      'satisfaction_surveys',
      'stakeholder satisfaction survey results',
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
    const rawEntities = parsed.satisfaction_surveys || []

    const normalized: SatisfactionSurvey[] = rawEntities.map((entity: SatisfactionSurvey) => ({
      ...entity,
      nps_score: coerceNumber(entity?.nps_score),
      satisfaction_score: coerceNumber(entity?.satisfaction_score),
      themes: coerceArray<string>(entity?.themes)
    }))

    const validEntities: SatisfactionSurvey[] = []
    normalized.forEach((entity) => {
      const resolution = resolveSourceDocumentIdStrict(
        entity,
        context,
        'SATISFACTION-SURVEYS',
        entity.stakeholder_name || entity.stakeholder_id || 'Satisfaction Survey'
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
        'satisfaction_surveys',
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
    logger.error('[EXTRACTION-SATISFACTION-SURVEYS] Extraction failed', {
      projectId: context.projectId,
      error: error instanceof Error ? error.message : String(error)
    })
    throw error
  }
}

export async function saveSatisfactionSurveys(
  client: PoolClient,
  projectId: string,
  userId: string,
  entities: SatisfactionSurvey[]
): Promise<PersistenceResult> {
  if (entities.length === 0) {
    return { saved: 0, skipped: 0, failed: 0 }
  }

  try {
    await client.query('DELETE FROM satisfaction_surveys WHERE project_id = $1', [projectId])

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
        e.survey_date || null,
        e.nps_score ?? null,
        e.satisfaction_score ?? null,
        e.sentiment || null,
        e.feedback_summary || null,
        e.themes || [],
        e.source_document_id || null,
        userId
      )
    })

    await client.query(
      `INSERT INTO satisfaction_surveys (
        project_id, stakeholder_id, stakeholder_name, survey_date, nps_score,
        satisfaction_score, sentiment, feedback_summary, themes, source_document_id, created_by
      )
      VALUES ${placeholders.join(', ')}`,
      values
    )

    return { saved: entities.length, skipped: 0, failed: 0 }
  } catch (error: unknown) {
    logger.error('[EXTRACTION-SATISFACTION-SURVEYS] Failed to save', {
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
