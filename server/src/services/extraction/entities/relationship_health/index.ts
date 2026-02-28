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

function normalizeRelationshipStrength(value?: string | null): string | null {
  if (!value) return null
  const normalized = value.toLowerCase().trim()
  if (['strong', 'moderate', 'weak', 'at_risk', 'critical'].includes(normalized)) {
    return normalized
  }

  if (['excellent', 'very_good', 'healthy', 'green', 'good'].includes(normalized)) return 'strong'
  if (['fair', 'yellow', 'amber', 'medium'].includes(normalized)) return 'moderate'
  if (['poor', 'low', 'red'].includes(normalized)) return 'weak'
  if (['warning', 'at risk'].includes(normalized)) return 'at_risk'
  return null
}

function isUuid(value?: string | null): boolean {
  if (!value) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

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

    const columnResult = await client.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_name = 'relationship_health'`
    )

    const availableColumns = new Set<string>(
      columnResult.rows.map((row: { column_name: string }) => row.column_name)
    )

    const insertColumns = [
      'project_id',
      'stakeholder_id',
      'stakeholder_name',
      'assessment_date',
      'health_score',
      'overall_health_score',
      'health_status',
      'relationship_strength',
      'health_indicators',
      'indicators',
      'trend',
      'notes',
      'source_document_id',
      'created_by'
    ].filter((column) => availableColumns.has(column))

    if (insertColumns.length === 0) {
      throw new Error('relationship_health table has no expected columns for extraction insert')
    }

    const values: any[] = []
    const placeholders: string[] = []

    entities.forEach((e, index) => {
      const offset = index * insertColumns.length
      placeholders.push(`(${insertColumns.map((_, i) => `$${offset + i + 1}`).join(', ')})`)

      const score = typeof e.health_score === 'number' ? e.health_score : null
      const relationshipStrength = normalizeRelationshipStrength(e.health_status)
      const normalizedAssessmentDate = e.assessment_date || new Date().toISOString().slice(0, 10)
      const normalizedStakeholderId = isUuid(e.stakeholder_id) ? e.stakeholder_id : null
      const normalizedStakeholderName = e.stakeholder_name || (normalizedStakeholderId ? null : e.stakeholder_id) || null
      const rowData: Record<string, unknown> = {
        project_id: projectId,
        stakeholder_id: normalizedStakeholderId,
        stakeholder_name: normalizedStakeholderName,
        assessment_date: normalizedAssessmentDate,
        health_score: score,
        overall_health_score: typeof score === 'number' ? Math.max(1, Math.min(5, score <= 5 ? score : score / 20)) : null,
        health_status: e.health_status || null,
        relationship_strength: relationshipStrength,
        health_indicators: e.indicators || [],
        indicators: e.indicators || [],
        trend: e.trend || null,
        notes: e.notes || null,
        source_document_id: isUuid(e.source_document_id) ? e.source_document_id : null,
        created_by: userId
      }

      insertColumns.forEach((column) => {
        values.push(rowData[column] ?? null)
      })
    })

    await client.query(
      `INSERT INTO relationship_health (
        ${insertColumns.join(', ')}
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
