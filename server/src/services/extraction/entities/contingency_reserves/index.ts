/**
 * Contingency Reserves Entity Module
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
import { randomUUID } from 'crypto'

function normalizeReserveType(value?: string | null): string {
  if (!value) return 'contingency'
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, '_')
  const map: Record<string, string> = {
    contingency: 'contingency',
    management: 'management',
    mgmt: 'management',
    management_reserve: 'management',
    contingency_reserve: 'contingency',
    reserve: 'contingency'
  }
  return map[normalized] || 'contingency'
}

async function getAllowedConstraintValues(
  client: PoolClient,
  tableName: string,
  constraintNameHint: string
): Promise<string[] | null> {
  const result = await client.query(
    `SELECT pg_get_constraintdef(c.oid) AS constraint_def
     FROM pg_constraint c
     JOIN pg_class t ON c.conrelid = t.oid
     JOIN pg_namespace n ON t.relnamespace = n.oid
     WHERE t.relname = $1
       AND c.conname ILIKE $2
       AND c.contype = 'c'
     LIMIT 1`,
    [tableName, `%${constraintNameHint}%`]
  )

  const constraintDef: string | undefined = result.rows[0]?.constraint_def
  if (!constraintDef) return null

  const matches = [...constraintDef.matchAll(/'([^']+)'/g)].map((m) => m[1].toLowerCase())
  return matches.length > 0 ? matches : null
}

export interface ContingencyReserve {
  reserve_id?: string
  contingency_reserve_id?: string
  category?: string
  reserve_type?: string
  allocated_to?: string
  amount?: number | null
  remaining_amount?: number | null
  utilization?: number | null
  approval_date?: string
  notes?: string
  source_document?: string
  source_document_id?: string
}

export async function extractContingencyReserves(
  context: ExtractionContext,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<ExtractionResult<ContingencyReserve>> {
  const startTime = Date.now()
  let rejectedCount = 0

  try {
    logger.info('[EXTRACTION-CONTINGENCY-RESERVES] Starting extraction', {
      projectId: context.projectId,
      documentCount: context.documents.length
    })

    const cached = await extractionCacheService.get(
      context.projectId,
      context.documentContext,
      'contingency_reserves',
      context.provider,
      context.model
    )

    if (cached && cached.length > 0) {
      logger.info(`[EXTRACTION-CONTINGENCY-RESERVES] ✅ Using cached result (${cached.length} entities)`)
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
  "contingency_reserves": [
    {
      "category": "Cost|Schedule|Technical",
      "reserve_type": "contingency|management",
      "allocated_to": "Risk category or WBS element",
      "amount": 25000,
      "remaining_amount": 18000,
      "utilization": 70,
      "approval_date": "YYYY-MM-DD",
      "notes": "Usage conditions or constraints",
      "source_document": "EXACT document title from available list"
    }
  ]
}`

    const requirements = [
      'Capture reserve amount and remaining amount when available',
      'Include allocation target and reserve type',
      'Include approval date if specified'
    ]

    const prompt = buildExtractionPrompt(
      context,
      'contingency_reserves',
      'contingency reserves with allocation details',
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
    const rawEntities = parsed.contingency_reserves || []

    const normalized: ContingencyReserve[] = rawEntities.map((entity: ContingencyReserve) => ({
      ...entity,
      amount: coerceNumber(entity?.amount),
      remaining_amount: coerceNumber(entity?.remaining_amount),
      utilization: coerceNumber(entity?.utilization)
    }))

    const validEntities: ContingencyReserve[] = []
    normalized.forEach((entity) => {
      const resolution = resolveSourceDocumentIdStrict(
        entity,
        context,
        'CONTINGENCY-RESERVES',
        entity.category || 'Contingency Reserve'
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
        'contingency_reserves',
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
    logger.error('[EXTRACTION-CONTINGENCY-RESERVES] Extraction failed', {
      projectId: context.projectId,
      error: error instanceof Error ? error.message : String(error)
    })
    throw error
  }
}

export async function saveContingencyReserves(
  client: PoolClient,
  projectId: string,
  userId: string,
  entities: ContingencyReserve[]
): Promise<PersistenceResult> {
  if (entities.length === 0) {
    return { saved: 0, skipped: 0, failed: 0 }
  }

  try {
    await client.query('DELETE FROM contingency_reserves WHERE project_id = $1', [projectId])

    const allowedReserveTypes = await getAllowedConstraintValues(
      client,
      'contingency_reserves',
      'reserve_type'
    )

    const columnResult = await client.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_name = 'contingency_reserves'`
    )

    const availableColumns = new Set<string>(
      columnResult.rows.map((row: { column_name: string }) => row.column_name)
    )

    const insertColumns = [
      'reserve_id',
      'contingency_reserve_id',
      'id',
      'project_id',
      'category',
      'reserve_type',
      'allocated_to',
      'amount',
      'remaining_amount',
      'utilization',
      'approval_date',
      'approved_at',
      'notes',
      'description',
      'source_document_id',
      'created_by'
    ].filter((column) => availableColumns.has(column))

    if (insertColumns.length === 0) {
      throw new Error('contingency_reserves table has no expected columns for extraction insert')
    }

    const values: any[] = []
    const placeholders: string[] = []

    entities.forEach((e, index) => {
      const offset = index * insertColumns.length
      placeholders.push(`(${insertColumns.map((_, i) => `$${offset + i + 1}`).join(', ')})`)

      const generatedId = randomUUID()
      const rowData: Record<string, any> = {
        reserve_id: e.reserve_id || generatedId,
        contingency_reserve_id: e.contingency_reserve_id || generatedId,
        id: generatedId,
        project_id: projectId,
        category: e.category || null,
        reserve_type: (() => {
          const normalizedType = normalizeReserveType(e.reserve_type)
          if (!allowedReserveTypes || allowedReserveTypes.length === 0) return normalizedType
          return allowedReserveTypes.includes(normalizedType)
            ? normalizedType
            : (allowedReserveTypes[0] || 'contingency')
        })(),
        allocated_to: e.allocated_to || null,
        amount: e.amount ?? null,
        remaining_amount: e.remaining_amount ?? null,
        utilization: e.utilization ?? null,
        approval_date: e.approval_date || null,
        approved_at: e.approval_date || null,
        notes: e.notes || null,
        description: e.notes || null,
        source_document_id: e.source_document_id || null,
        created_by: userId
      }

      insertColumns.forEach((column) => {
        values.push(rowData[column] ?? null)
      })
    })

    await client.query(
      `INSERT INTO contingency_reserves (
        ${insertColumns.join(', ')}
      )
      VALUES ${placeholders.join(', ')}`,
      values
    )

    return { saved: entities.length, skipped: 0, failed: 0 }
  } catch (error: unknown) {
    logger.error('[EXTRACTION-CONTINGENCY-RESERVES] Failed to save', {
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
