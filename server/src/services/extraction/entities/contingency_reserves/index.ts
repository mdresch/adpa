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

export interface ContingencyReserve {
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

    const values: any[] = []
    const placeholders: string[] = []

    entities.forEach((e, index) => {
      const offset = index * 11
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11})`
      )

      values.push(
        projectId,
        e.category || null,
        e.reserve_type || null,
        e.allocated_to || null,
        e.amount ?? null,
        e.remaining_amount ?? null,
        e.utilization ?? null,
        e.approval_date || null,
        e.notes || null,
        e.source_document_id || null,
        userId
      )
    })

    await client.query(
      `INSERT INTO contingency_reserves (
        project_id, category, reserve_type, allocated_to, amount, remaining_amount,
        utilization, approval_date, notes, source_document_id, created_by
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
