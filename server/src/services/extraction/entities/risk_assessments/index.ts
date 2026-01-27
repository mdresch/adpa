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

const PROB_IMPACT = new Set(['very_high', 'high', 'medium', 'low', 'very_low'])

function normalizeProbImpact(v: unknown): string | null {
  if (!v) return null
  const s = String(v).toLowerCase().trim().replace(/\s+/g, '_')
  if (PROB_IMPACT.has(s)) return s
  const map: Record<string, string> = {
    veryhigh: 'very_high', verylow: 'very_low'
  }
  return map[s] ?? null
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
    const columnResult = await client.query<{ column_name: string }>(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'risk_assessments'`
    )
    const columnSet = new Set(columnResult.rows.map(row => row.column_name))

    const pick = (opts: string[]) => opts.find(c => columnSet.has(c)) ?? null

    const assessmentDateCol = pick(['assessment_date', 'assessed_at'])
    const probabilityCol = pick(['probability'])
    const impactCol = pick(['impact'])
    const assessorCol = pick(['assessor'])
    const riskIdCol = pick(['risk_id'])
    const riskScoreCol = pick(['risk_score'])
    const detectabilityCol = pick(['detectability'])
    const rpnCol = pick(['rpn'])
    const riskLevelCol = pick(['risk_level'])
    const methodologyCol = pick(['assessment_methodology', 'methodology', 'notes'])
    const assumptionsCol = pick(['assumptions'])
    const sourceDocCol = pick(['source_document_id'])
    const createdByCol = pick(['created_by'])

    const columnOrder: Array<{ name: string; value: (e: RiskAssessment) => unknown }> = [
      { name: 'project_id', value: () => projectId }
    ]
    if (assessmentDateCol) {
      columnOrder.push({
        name: assessmentDateCol,
        value: (e) => e.assessment_date || new Date().toISOString().split('T')[0]
      })
    }
    if (probabilityCol) {
      columnOrder.push({
        name: probabilityCol,
        value: (e) => normalizeProbImpact(e.probability) ?? 'medium'
      })
    }
    if (impactCol) {
      columnOrder.push({
        name: impactCol,
        value: (e) => normalizeProbImpact(e.impact) ?? 'medium'
      })
    }
    if (assessorCol) columnOrder.push({ name: assessorCol, value: (e) => e.assessor || null })
    if (riskIdCol) {
      columnOrder.push({
        name: riskIdCol,
        value: (e) => {
          const v = e.risk_id
          if (!v) return null
          const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
          return typeof v === 'string' && uuid.test(v) ? v : null
        }
      })
    }
    if (riskScoreCol) columnOrder.push({ name: riskScoreCol, value: (e) => e.rpn ?? null })
    if (detectabilityCol) {
      columnOrder.push({
        name: detectabilityCol,
        value: (e) => {
          if (typeof e.detectability === 'number') return null
          return normalizeProbImpact(e.detectability as string) ?? null
        }
      })
    }
    if (rpnCol) columnOrder.push({ name: rpnCol, value: (e) => (typeof e.rpn === 'number' ? e.rpn : null) })
    if (riskLevelCol) columnOrder.push({ name: riskLevelCol, value: () => null })
    if (methodologyCol) columnOrder.push({ name: methodologyCol, value: (e) => e.notes || null })
    if (assumptionsCol) columnOrder.push({ name: assumptionsCol, value: () => [] })
    if (sourceDocCol) columnOrder.push({ name: sourceDocCol, value: (e) => e.source_document_id || null })
    if (createdByCol) columnOrder.push({ name: createdByCol, value: () => userId })

    if (columnOrder.length <= 1) {
      throw new Error('risk_assessments table has no writable columns')
    }

    await client.query('DELETE FROM risk_assessments WHERE project_id = $1', [projectId])

    const values: unknown[] = []
    const placeholders: string[] = []

    entities.forEach((e, index) => {
      const offset = index * columnOrder.length
      placeholders.push(
        columnOrder.map((_, i) => `$${offset + i + 1}`).join(', ')
      )
      columnOrder.forEach(col => values.push(col.value(e)))
    })

    await client.query(
      `INSERT INTO risk_assessments (${columnOrder.map(c => c.name).join(', ')})
       VALUES ${placeholders.map(p => `(${p})`).join(', ')}`,
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
