/**
 * Resource Conflicts Entity Module
 */

import { logger } from '../../../../utils/logger'
import { aiService } from '../../../aiService'
import type { ExtractionContext } from '../../base/ExtractionContext'
import type { ExtractionResult } from '../../base/ExtractionResult'
import { parseAIResponse, coerceArray } from '../../base/Parser'
import { buildExtractionPrompt } from '../../base/PromptBuilder'
import { resolveSourceDocumentIdStrict } from '../../base/SourceDocumentResolver'
import { extractionCacheService } from '../../cache'
import type { PoolClient } from 'pg'
import type { PersistenceResult } from '../../base/Persistence'
import { randomUUID } from 'crypto'

export interface ResourceConflict {
  conflict_id?: string
  resource_id?: string
  resource_name?: string
  conflict_type?: string
  conflict_description?: string
  impacted_activities?: string[]
  severity?: string
  resolution?: string
  resolution_date?: string
  source_document?: string
  source_document_id?: string
}

function normalizeConflictType(value?: string | null): string | null {
  if (!value) return 'overallocation'
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, '_')

  const map: Record<string, string> = {
    overallocated: 'overallocation',
    overallocation: 'overallocation',
    schedule_clash: 'scheduling',
    scheduling: 'scheduling',
    schedule: 'scheduling',
    skill_gap: 'skill_gap',
    skillgap: 'skill_gap'
  }

  return map[normalized] || 'overallocation'
}

function normalizeSeverity(value?: string | null): string {
  if (!value) return 'medium'
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, '_')

  const map: Record<string, string> = {
    low: 'low',
    minor: 'low',
    medium: 'medium',
    moderate: 'medium',
    med: 'medium',
    high: 'high',
    major: 'high',
    severe: 'high',
    critical: 'critical',
    blocker: 'critical'
  }

  return map[normalized] || 'medium'
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

export async function extractResourceConflicts(
  context: ExtractionContext,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<ExtractionResult<ResourceConflict>> {
  const startTime = Date.now()
  let rejectedCount = 0

  try {
    logger.info('[EXTRACTION-RESOURCE-CONFLICTS] Starting extraction', {
      projectId: context.projectId,
      documentCount: context.documents.length
    })

    const cached = await extractionCacheService.get(
      context.projectId,
      context.documentContext,
      'resource_conflicts',
      context.provider,
      context.model
    )

    if (cached && cached.length > 0) {
      logger.info(`[EXTRACTION-RESOURCE-CONFLICTS] ✅ Using cached result (${cached.length} entities)`)
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
  "resource_conflicts": [
    {
      "resource_id": "Resource ID",
      "resource_name": "Resource name",
      "conflict_type": "Overallocated|Schedule Clash|Skill Gap",
      "conflict_description": "Description of the conflict",
      "impacted_activities": ["Activity A", "Activity B"],
      "severity": "Low|Medium|High",
      "resolution": "Resolution or mitigation plan",
      "resolution_date": "YYYY-MM-DD",
      "source_document": "EXACT document title from available list"
    }
  ]
}`

    const requirements = [
      'List resource conflicts and overallocation issues',
      'Include impacted activities when available',
      'Capture severity and resolution details'
    ]

    const prompt = buildExtractionPrompt(
      context,
      'resource_conflicts',
      'resource conflicts and overallocation issues',
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
    const rawEntities = parsed.resource_conflicts || []

    const normalized: ResourceConflict[] = rawEntities.map((entity: ResourceConflict) => ({
      ...entity,
      impacted_activities: coerceArray<string>(entity?.impacted_activities)
    }))

    const validEntities: ResourceConflict[] = []
    normalized.forEach((entity) => {
      const resolution = resolveSourceDocumentIdStrict(
        entity,
        context,
        'RESOURCE-CONFLICTS',
        entity.resource_name || entity.conflict_type || 'Resource Conflict'
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
        'resource_conflicts',
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
    logger.error('[EXTRACTION-RESOURCE-CONFLICTS] Extraction failed', {
      projectId: context.projectId,
      error: error instanceof Error ? error.message : String(error)
    })
    throw error
  }
}

export async function saveResourceConflicts(
  client: PoolClient,
  projectId: string,
  userId: string,
  entities: ResourceConflict[]
): Promise<PersistenceResult> {
  if (entities.length === 0) {
    return { saved: 0, skipped: 0, failed: 0 }
  }

  try {
    await client.query('DELETE FROM resource_conflicts WHERE project_id = $1', [projectId])

    const allowedConflictTypes = await getAllowedConstraintValues(
      client,
      'resource_conflicts',
      'conflict_type'
    )

    const columnResult = await client.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_name = 'resource_conflicts'`
    )

    const availableColumns = new Set<string>(
      columnResult.rows.map((row: { column_name: string }) => row.column_name)
    )

    const insertColumns = [
      'conflict_id',
      'id',
      'project_id',
      'resource_id',
      'resource_name',
      'conflict_type',
      'conflict_description',
      'impacted_activities',
      'severity',
      'resolution',
      'resolution_date',
      'conflict_date',
      'source_document_id',
      'created_by'
    ].filter((column) => availableColumns.has(column))

    if (insertColumns.length === 0) {
      throw new Error('resource_conflicts table has no expected columns for extraction insert')
    }

    const values: any[] = []
    const placeholders: string[] = []

    entities.forEach((e, index) => {
      const offset = index * insertColumns.length
      placeholders.push(`(${insertColumns.map((_, i) => `$${offset + i + 1}`).join(', ')})`)

      // Ensure resource_id is a valid UUID, otherwise nullify it
      // This prevents errors when the AI extracts a role name into the ID field
      const resourceId = e.resource_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(e.resource_id)
        ? e.resource_id
        : null

      const rowData: Record<string, any> = {
        conflict_id: e.conflict_id || randomUUID(),
        id: randomUUID(),
        project_id: projectId,
        resource_id: resourceId,
        resource_name: e.resource_name || 'Unknown resource',
        conflict_type: (() => {
          const normalizedType = normalizeConflictType(e.conflict_type) || 'overallocation'
          if (!allowedConflictTypes || allowedConflictTypes.length === 0) return normalizedType
          return allowedConflictTypes.includes(normalizedType)
            ? normalizedType
            : (allowedConflictTypes[0] || normalizedType)
        })(),
        conflict_description: e.conflict_description || null,
        impacted_activities: JSON.stringify(e.impacted_activities || []),
        severity: normalizeSeverity(e.severity),
        resolution: e.resolution || null,
        resolution_date: e.resolution_date || null,
        conflict_date: e.resolution_date || null,
        source_document_id: e.source_document_id || null,
        created_by: userId
      }

      insertColumns.forEach((column) => {
        values.push(rowData[column] ?? null)
      })
    })

    await client.query(
      `INSERT INTO resource_conflicts (
        ${insertColumns.join(', ')}
      )
      VALUES ${placeholders.join(', ')}`,
      values
    )

    return { saved: entities.length, skipped: 0, failed: 0 }
  } catch (error: unknown) {
    logger.error('[EXTRACTION-RESOURCE-CONFLICTS] Failed to save', {
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
