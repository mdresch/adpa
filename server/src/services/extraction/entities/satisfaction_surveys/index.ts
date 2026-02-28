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
import { randomUUID } from 'crypto'

export interface SatisfactionSurvey {
  survey_id?: string
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

function isUuid(value?: string | null): boolean {
  if (!value) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function normalizeSurveyDate(value?: string | null): string | null {
  if (!value || typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null

  const lowered = trimmed.toLowerCase()
  if (['tbd', 'n/a', 'na', 'not specified', 'unknown', 'none', 'pending', 'ongoing', 'yyyy-mm-dd'].includes(lowered)) {
    return null
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
  const parsed = Date.parse(trimmed)
  if (Number.isNaN(parsed)) return null
  return new Date(parsed).toISOString().slice(0, 10)
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
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

    const columnResult = await client.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_name = 'satisfaction_surveys'`
    )

    const availableColumns = new Set<string>(
      columnResult.rows.map((row: { column_name: string }) => row.column_name)
    )

    const insertColumns = [
      'survey_id',
      'id',
      'project_id',
      'stakeholder_id',
      'stakeholder_name',
      'survey_date',
      'survey_type',
      'nps_score',
      'overall_satisfaction_score',
      'satisfaction_score',
      'sentiment',
      'feedback_summary',
      'summary',
      'feedback_themes',
      'themes',
      'response_categories',
      'verbatim_feedback',
      'improvement_suggestions',
      'source_document_id',
      'created_by'
    ].filter((column) => availableColumns.has(column))

    if (insertColumns.length === 0) {
      throw new Error('satisfaction_surveys table has no expected columns for extraction insert')
    }

    const values: any[] = []
    const placeholders: string[] = []

    entities.forEach((e, index) => {
      const offset = index * insertColumns.length
      placeholders.push(`(${insertColumns.map((_, i) => `$${offset + i + 1}`).join(', ')})`)

      const generatedId = randomUUID()
      const normalizedSurveyDate = normalizeSurveyDate(e.survey_date)
      const rawNps = typeof e.nps_score === 'number' ? e.nps_score : null
      const rawSatisfaction = typeof e.satisfaction_score === 'number' ? e.satisfaction_score : null
      const normalizedNps = rawNps === null ? null : Math.round(clamp(rawNps, -100, 100))
      const normalizedSatisfaction = rawSatisfaction === null ? null : Number(clamp(rawSatisfaction, 0, 9.99).toFixed(2))
      const rowData: Record<string, any> = {
        survey_id: e.survey_id || generatedId,
        id: generatedId,
        project_id: projectId,
        stakeholder_id: isUuid(e.stakeholder_id) ? e.stakeholder_id : null,
        stakeholder_name: e.stakeholder_name || 'Unknown stakeholder',
        survey_date: normalizedSurveyDate || new Date().toISOString().slice(0, 10),
        survey_type: 'custom',
        nps_score: normalizedNps,
        overall_satisfaction_score: normalizedSatisfaction === null ? null : Number(clamp(normalizedSatisfaction <= 5 ? normalizedSatisfaction : normalizedSatisfaction / 2, 1, 5).toFixed(2)),
        satisfaction_score: normalizedSatisfaction,
        sentiment: e.sentiment || null,
        feedback_summary: e.feedback_summary || null,
        summary: e.feedback_summary || null,
        feedback_themes: e.themes || [],
        themes: e.themes || [],
        response_categories: {},
        verbatim_feedback: e.feedback_summary || null,
        improvement_suggestions: [],
        source_document_id: e.source_document_id || null,
        created_by: userId
      }

      insertColumns.forEach((column) => {
        values.push(rowData[column] ?? null)
      })
    })

    await client.query(
      `INSERT INTO satisfaction_surveys (
        ${insertColumns.join(', ')}
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
