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

function isUuid(value?: string | null): boolean {
  if (!value) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function normalizeProcessType(value?: string | null): 'onboarding' | 'offboarding' {
  const normalized = (value || '').toLowerCase().trim()
  if (normalized === 'offboarding') return 'offboarding'
  return 'onboarding'
}

function normalizeDate(value?: string | null): string | null {
  if (!value || typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed || /^yyyy-mm-dd$/i.test(trimmed)) return null
  if (/^\[.*\]$/.test(trimmed)) return null
  if (/\btbd\b|unknown|n\/a|to be determined/i.test(trimmed)) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
  if (/^\d{4}-\d{2}$/.test(trimmed)) return `${trimmed}-01`
  return null
}

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

    const columnResult = await client.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_name = 'onboarding_offboarding'`
    )

    const availableColumns = new Set<string>(
      columnResult.rows.map((row: { column_name: string }) => row.column_name)
    )

    const insertColumns = [
      'project_id',
      'resource_id',
      'resource_name',
      'process_type',
      'action_type',
      'start_date',
      'end_date',
      'planned_start_date',
      'actual_start_date',
      'planned_completion_date',
      'actual_completion_date',
      'planned_date',
      'actual_date',
      'status',
      'checklist_status',
      'tasks',
      'required_training',
      'required_access',
      'handover_notes',
      'notes',
      'description',
      'assigned_to',
      'source_document_id',
      'created_by'
    ].filter((column) => availableColumns.has(column))

    if (insertColumns.length === 0) {
      throw new Error('onboarding_offboarding table has no expected columns for extraction insert')
    }

    const values: any[] = []
    const placeholders: string[] = []

    entities.forEach((e, index) => {
      const offset = index * insertColumns.length
      placeholders.push(
        `(${insertColumns.map((_, i) => `$${offset + i + 1}`).join(', ')})`
      )

      const processType = normalizeProcessType(e.action_type)
      const normalizedStartDate = normalizeDate(e.start_date)
      const normalizedEndDate = normalizeDate(e.end_date)

      const rowData: Record<string, any> = {
        project_id: projectId,
        resource_id: isUuid(e.resource_id) ? e.resource_id : null,
        resource_name: e.resource_name || e.resource_id || 'Unknown resource',
        process_type: processType,
        action_type: e.action_type || processType,
        start_date: normalizedStartDate,
        end_date: normalizedEndDate,
        planned_start_date: normalizedStartDate,
        actual_start_date: null,
        planned_completion_date: normalizedEndDate,
        actual_completion_date: null,
        planned_date: normalizedStartDate,
        actual_date: normalizedEndDate,
        status: e.status || null,
        checklist_status: e.checklist_status || null,
        tasks: [],
        required_training: [],
        required_access: [],
        handover_notes: e.notes || null,
        notes: e.notes || null,
        description: e.notes || null,
        assigned_to: null,
        source_document_id: e.source_document_id || null,
        created_by: userId
      }

      insertColumns.forEach((column) => {
        values.push(rowData[column] ?? null)
      })
    })

    await client.query(
      `INSERT INTO onboarding_offboarding (
        ${insertColumns.join(', ')}
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
