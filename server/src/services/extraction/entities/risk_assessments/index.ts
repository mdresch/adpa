/**
 * Risk Assessments Entity Module
 */

import { logger } from '../../../../utils/logger'
import { aiService } from '../../../aiService'
import type { ExtractionContext } from '../../base/ExtractionContext'
import type { ExtractionResult } from '../../base/ExtractionResult'
import { parseAIResponse, coerceNumber } from '../../base/Parser'
import { buildExtractionPrompt } from '../../base/PromptBuilder'
import { resolveSourceDocumentIdStrict } from '../../base/SourceDocumentResolver'
import { extractionCacheService } from '../../cache'
import type { PoolClient } from 'pg'
import type { PersistenceResult } from '../../base/Persistence'

export interface RiskAssessment {
  risk_id?: string
  risk_title?: string
  assessment_date?: string
  probability?: string
  impact?: string
  detectability?: number | null
  rpn?: number | null
  assessor?: string
  notes?: string
  source_document?: string
  source_document_id?: string
}

export async function extractRiskAssessments(
  context: ExtractionContext,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<ExtractionResult<RiskAssessment>> {
  const startTime = Date.now()
  let rejectedCount = 0

  try {
    logger.info('[EXTRACTION-RISK-ASSESSMENTS] Starting extraction', {
      projectId: context.projectId,
      documentCount: context.documents.length
    })

    const cached = await extractionCacheService.get(
      context.projectId,
      context.documentContext,
      'risk_assessments',
      context.provider,
      context.model
    )

    if (cached && cached.length > 0) {
      logger.info(`[EXTRACTION-RISK-ASSESSMENTS] ✅ Using cached result (${cached.length} entities)`)
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
  "risk_assessments": [
    {
      "risk_id": "Risk identifier",
      "risk_title": "Risk title",
      "assessment_date": "YYYY-MM-DD",
      "probability": "Low|Medium|High",
      "impact": "Low|Medium|High",
      "detectability": 5,
      "rpn": 120,
      "assessor": "Name or role",
      "notes": "Assessment notes",
      "source_document": "EXACT document title from available list"
    }
  ]
}`

    const requirements = [
      'Capture probability, impact, and detectability for each assessed risk',
      'Provide a risk priority number (RPN) when possible',
      'Include assessment date if provided'
    ]

    const prompt = buildExtractionPrompt(
      context,
      'risk_assessments',
      'risk assessments with probability, impact, and RPN',
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
    const rawEntities = parsed.risk_assessments || []

    const normalized: RiskAssessment[] = rawEntities.map((entity: RiskAssessment) => ({
      ...entity,
      detectability: coerceNumber(entity?.detectability),
      rpn: coerceNumber(entity?.rpn)
    }))

    const validEntities: RiskAssessment[] = []
    normalized.forEach((entity) => {
      const resolution = resolveSourceDocumentIdStrict(
        entity,
        context,
        'RISK-ASSESSMENTS',
        entity.risk_title || entity.risk_id || 'Risk Assessment'
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
        'risk_assessments',
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
    logger.error('[EXTRACTION-RISK-ASSESSMENTS] Extraction failed', {
      projectId: context.projectId,
      error: error instanceof Error ? error.message : String(error)
    })
    throw error
  }
}

export async function saveRiskAssessments(
  client: PoolClient,
  projectId: string,
  userId: string,
  entities: RiskAssessment[]
): Promise<PersistenceResult> {
  if (entities.length === 0) {
    return { saved: 0, skipped: 0, failed: 0 }
  }

  try {
    await client.query('DELETE FROM risk_assessments WHERE project_id = $1', [projectId])

    const values: any[] = []
    const placeholders: string[] = []

    entities.forEach((e, index) => {
      const offset = index * 12
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12})`
      )

      values.push(
        projectId,
        e.risk_id || null,
        e.risk_title || null,
        e.assessment_date || null,
        e.probability || null,
        e.impact || null,
        e.detectability ?? null,
        e.rpn ?? null,
        e.assessor || null,
        e.notes || null,
        e.source_document_id || null,
        userId
      )
    })

    await client.query(
      `INSERT INTO risk_assessments (
        project_id, risk_id, risk_title, assessment_date, probability,
        impact, detectability, rpn, assessor, notes, source_document_id, created_by
      )
      VALUES ${placeholders.join(', ')}`,
      values
    )

    return { saved: entities.length, skipped: 0, failed: 0 }
  } catch (error: unknown) {
    logger.error('[EXTRACTION-RISK-ASSESSMENTS] Failed to save', {
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
