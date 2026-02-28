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
import { normalizeDate } from '../../base/Persistence'
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
const DEFAULT_PROB_IMPACT = 'medium'
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function normalizeProbImpact(v: unknown): string | null {
  if (!v) return null
  const s = String(v).toLowerCase().trim().replace(/\s+/g, '_')
  if (PROB_IMPACT.has(s)) return s
  const map: Record<string, string> = {
    veryhigh: 'very_high', verylow: 'very_low'
  }
  return map[s] ?? null
}

function normalizeProbImpactToInteger(v: unknown): number | null {
  if (v === null || v === undefined) return null

  if (typeof v === 'number' && Number.isFinite(v)) {
    if (v >= 0 && v <= 1) return Math.round(v * 100)
    return Math.round(v)
  }

  const normalized = normalizeProbImpact(v)
  if (normalized) {
    const map: Record<string, number> = {
      very_low: 1,
      low: 2,
      medium: 3,
      high: 4,
      very_high: 5
    }
    return map[normalized] ?? 3
  }

  const parsed = coerceNumber(v)
  if (parsed === null) return null
  if (parsed >= 0 && parsed <= 1) return Math.round(parsed * 100)
  return Math.round(parsed)
}

function asUuidOrNull(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return UUID_PATTERN.test(trimmed) ? trimmed : null
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
    const columnResult = await client.query<{ column_name: string; data_type: string; udt_name: string }>(
      `SELECT column_name, data_type, udt_name
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'risk_assessments'`
    )
    const columnSet = new Set(columnResult.rows.map(row => row.column_name))
    const columnTypeMap = new Map(
      columnResult.rows.map(row => [
        row.column_name,
        `${row.data_type}|${row.udt_name}`.toLowerCase()
      ])
    )

    const pickColumn = (options: string[]): string | null => {
      for (const option of options) {
        if (columnSet.has(option)) {
          return option
        }
      }
      return null
    }

    const isUuidColumn = (columnName: string | null): boolean => {
      if (!columnName) return false
      const type = columnTypeMap.get(columnName)
      return type ? type.includes('uuid') : false
    }

    const isNumericLikeColumn = (columnName: string | null): boolean => {
      if (!columnName) return false
      const type = columnTypeMap.get(columnName) || ''
      return (
        type.includes('integer') ||
        type.includes('bigint') ||
        type.includes('smallint') ||
        type.includes('numeric') ||
        type.includes('double') ||
        type.includes('real')
      )
    }

    const riskIdColumn = pickColumn(['risk_id', 'risk_identifier'])
    const riskTitleColumn = pickColumn(['risk_title', 'risk_name', 'title'])
    const assessmentDateColumn = pickColumn(['assessment_date', 'assessed_at', 'review_date'])
    const probabilityColumn = pickColumn(['probability', 'likelihood'])
    const impactColumn = pickColumn(['impact'])
    const detectabilityColumn = pickColumn(['detectability', 'detection_score'])
    const rpnColumn = pickColumn(['rpn', 'risk_priority_number'])
    const assessorColumn = pickColumn(['assessor', 'assessed_by'])
    const notesColumn = pickColumn(['notes', 'assessment_notes'])
    const sourceDocumentColumn = pickColumn(['source_document_id'])
    const createdByColumn = pickColumn(['created_by'])

    const columnOrder: Array<{ name: string; value: (entity: RiskAssessment) => any }> = [
      { name: 'project_id', value: () => projectId }
    ]

    if (riskIdColumn) {
      columnOrder.push({
        name: riskIdColumn,
        value: (e) => (isUuidColumn(riskIdColumn) ? asUuidOrNull(e.risk_id) : (e.risk_id || null))
      })
    }
    if (riskTitleColumn) {
      columnOrder.push({ name: riskTitleColumn, value: (e) => e.risk_title || null })
    }
    if (assessmentDateColumn) {
      columnOrder.push({
        name: assessmentDateColumn,
        value: (e) => normalizeDate(e.assessment_date) || new Date().toISOString().split('T')[0]
      })
    }
    if (probabilityColumn) {
      columnOrder.push({
        name: probabilityColumn,
        value: (e) => {
          if (isNumericLikeColumn(probabilityColumn)) {
            return normalizeProbImpactToInteger(e.probability)
          }
          return normalizeProbImpact(e.probability) ?? DEFAULT_PROB_IMPACT
        }
      })
    }
    if (impactColumn) {
      columnOrder.push({
        name: impactColumn,
        value: (e) => {
          if (isNumericLikeColumn(impactColumn)) {
            return normalizeProbImpactToInteger(e.impact)
          }
          return normalizeProbImpact(e.impact) ?? DEFAULT_PROB_IMPACT
        }
      })
    }
    if (detectabilityColumn) {
      columnOrder.push({ name: detectabilityColumn, value: (e) => e.detectability ?? null })
    }
    if (rpnColumn) {
      columnOrder.push({ name: rpnColumn, value: (e) => e.rpn ?? null })
    }
    if (assessorColumn) {
      columnOrder.push({ name: assessorColumn, value: (e) => e.assessor || null })
    }
    if (notesColumn) {
      columnOrder.push({ name: notesColumn, value: (e) => e.notes || null })
    }
    if (sourceDocumentColumn) {
      columnOrder.push({ name: sourceDocumentColumn, value: (e) => asUuidOrNull(e.source_document_id) })
    }
    if (createdByColumn) {
      columnOrder.push({ name: createdByColumn, value: () => userId })
    }

    if (columnOrder.length === 0) {
      throw new Error('risk_assessments table has no writable columns')
    }

    await client.query('DELETE FROM risk_assessments WHERE project_id = $1', [projectId])

    const values: unknown[] = []
    const placeholders: string[] = []

    entities.forEach((e, index) => {
      const offset = index * columnOrder.length
      const rowPlaceholders = columnOrder.map((_, columnIndex) => `$${offset + columnIndex + 1}`)
      placeholders.push(`(${rowPlaceholders.join(', ')})`)
      columnOrder.forEach(column => {
        values.push(column.value(e))
      })
    })

    await client.query(
      `INSERT INTO risk_assessments (${columnOrder.map(col => col.name).join(', ')})
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
