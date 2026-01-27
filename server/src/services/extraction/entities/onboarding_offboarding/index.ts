/**
 * Onboarding/Offboarding Entity Module
 */

import { logger } from '../../../../utils/logger'
import { aiService } from '../../../aiService'
import type { ExtractionContext } from '../../base/ExtractionContext'
import type { ExtractionResult } from '../../base/ExtractionResult'
import { parseAIResponse } from '../../base/Parser'
import { buildExtractionPrompt } from '../../base/PromptBuilder'
import { resolveSourceDocumentIdStrict } from '../../base/SourceDocumentResolver'
import { extractionCacheService } from '../../cache'
import type { PoolClient } from 'pg'
import type { PersistenceResult } from '../../base/Persistence'

export interface OnboardingOffboarding {
  resource_id?: string
  resource_name?: string
  action_type?: 'onboarding' | 'offboarding'
  start_date?: string
  end_date?: string
  status?: string
  checklist_status?: string
  notes?: string
  source_document?: string
  source_document_id?: string
}

export async function extractOnboardingOffboarding(
  context: ExtractionContext,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<ExtractionResult<OnboardingOffboarding>> {
  const startTime = Date.now()
  let rejectedCount = 0

  try {
    logger.info('[EXTRACTION-ONBOARDING-OFFBOARDING] Starting extraction', {
      projectId: context.projectId,
      documentCount: context.documents.length
    })

    const cached = await extractionCacheService.get(
      context.projectId,
      context.documentContext,
      'onboarding_offboarding',
      context.provider,
      context.model
    )

    if (cached && cached.length > 0) {
      logger.info(`[EXTRACTION-ONBOARDING-OFFBOARDING] ✅ Using cached result (${cached.length} entities)`)
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
  "onboarding_offboarding": [
    {
      "resource_id": "Resource ID",
      "resource_name": "Resource name",
      "action_type": "onboarding|offboarding",
      "start_date": "YYYY-MM-DD",
      "end_date": "YYYY-MM-DD",
      "status": "planned|in_progress|completed",
      "checklist_status": "complete|partial|not_started",
      "notes": "Additional context",
      "source_document": "EXACT document title from available list"
    }
  ]
}`

    const requirements = [
      'Capture onboarding and offboarding plans with dates',
      'Include checklist status or completion notes when available',
      'Use action_type = onboarding or offboarding'
    ]

    const prompt = buildExtractionPrompt(
      context,
      'onboarding_offboarding',
      'onboarding and offboarding plans',
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
    const rawEntities = parsed.onboarding_offboarding || []

    const validEntities: OnboardingOffboarding[] = []
    rawEntities.forEach((entity: OnboardingOffboarding) => {
      const resolution = resolveSourceDocumentIdStrict(
        entity,
        context,
        'ONBOARDING-OFFBOARDING',
        entity.resource_name || 'Onboarding/Offboarding'
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
        'onboarding_offboarding',
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
        afterDeduplication: rawEntities.length,
        afterSourceResolution: validEntities.length,
        finalCount: validEntities.length,
        cacheHit: false,
        durationMs: Date.now() - startTime,
        provider: context.provider,
        model: context.model
      }
    }
  } catch (error: unknown) {
    logger.error('[EXTRACTION-ONBOARDING-OFFBOARDING] Extraction failed', {
      projectId: context.projectId,
      error: error instanceof Error ? error.message : String(error)
    })
    throw error
  }
}

export async function saveOnboardingOffboarding(
  client: PoolClient,
  projectId: string,
  userId: string,
  entities: OnboardingOffboarding[]
): Promise<PersistenceResult> {
  if (entities.length === 0) {
    return { saved: 0, skipped: 0, failed: 0 }
  }

  try {
    await client.query('DELETE FROM onboarding_offboarding WHERE project_id = $1', [projectId])

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
        e.action_type || null,
        e.start_date || null,
        e.end_date || null,
        e.status || null,
        e.checklist_status || null,
        e.notes || null,
        e.source_document_id || null,
        userId
      )
    })

    await client.query(
      `INSERT INTO onboarding_offboarding (
        project_id, resource_id, resource_name, action_type, start_date, end_date,
        status, checklist_status, notes, source_document_id, created_by
      )
      VALUES ${placeholders.join(', ')}`,
      values
    )

    return { saved: entities.length, skipped: 0, failed: 0 }
  } catch (error: unknown) {
    logger.error('[EXTRACTION-ONBOARDING-OFFBOARDING] Failed to save', {
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
