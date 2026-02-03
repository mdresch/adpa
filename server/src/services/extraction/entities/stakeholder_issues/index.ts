/**
 * Stakeholder Issues Entity Module
 */

import { logger } from '../../../../utils/logger'
import { aiService } from '../../../aiService'
import type { ExtractionContext } from '../../base/ExtractionContext'
import type { ExtractionResult } from '../../base/ExtractionResult'
import { parseAIResponse } from '../../base/Parser'
import { buildExtractionPrompt } from '../../base/PromptBuilder'
import { resolveSourceDocumentIdStrict } from '../../base/SourceDocumentResolver'
import { extractionCacheService } from '../../cache'
import { isValidUUID } from '../../base/Persistence'
import type { PoolClient } from 'pg'
import type { PersistenceResult } from '../../base/Persistence'

export interface StakeholderIssue {
  issue_id?: string
  stakeholder_id?: string
  stakeholder_name?: string
  issue_type?: string
  severity?: string
  description?: string
  status?: string
  reported_date?: string
  resolution_date?: string
  resolution_notes?: string
  source_document?: string
  source_document_id?: string
}

export async function extractStakeholderIssues(
  context: ExtractionContext,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<ExtractionResult<StakeholderIssue>> {
  const startTime = Date.now()
  let rejectedCount = 0

  try {
    logger.info('[EXTRACTION-STAKEHOLDER-ISSUES] Starting extraction', {
      projectId: context.projectId,
      documentCount: context.documents.length
    })

    const cached = await extractionCacheService.get(
      context.projectId,
      context.documentContext,
      'stakeholder_issues',
      context.provider,
      context.model
    )

    if (cached && cached.length > 0) {
      logger.info(`[EXTRACTION-STAKEHOLDER-ISSUES] ✅ Using cached result (${cached.length} entities)`)
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
  "stakeholder_issues": [
    {
      "issue_id": "Issue identifier",
      "stakeholder_id": "Stakeholder ID",
      "stakeholder_name": "Stakeholder name",
      "issue_type": "Concern|Complaint|Change Request",
      "severity": "Low|Medium|High",
      "description": "Issue description",
      "status": "open|in_progress|resolved",
      "reported_date": "YYYY-MM-DD",
      "resolution_date": "YYYY-MM-DD",
      "resolution_notes": "How the issue was resolved",
      "source_document": "EXACT document title from available list"
    }
  ]
}`

    const requirements = [
      'Capture stakeholder issues with severity and status',
      'Include reported and resolution dates when available',
      'Summarize resolution notes if present'
    ]

    const prompt = buildExtractionPrompt(
      context,
      'stakeholder_issues',
      'stakeholder issues and resolutions',
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
    const rawEntities = parsed.stakeholder_issues || []

    const validEntities: StakeholderIssue[] = []
    rawEntities.forEach((entity: StakeholderIssue) => {
      const resolution = resolveSourceDocumentIdStrict(
        entity,
        context,
        'STAKEHOLDER-ISSUES',
        entity.issue_id || entity.stakeholder_name || 'Stakeholder Issue'
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
        'stakeholder_issues',
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
    logger.error('[EXTRACTION-STAKEHOLDER-ISSUES] Extraction failed', {
      projectId: context.projectId,
      error: error instanceof Error ? error.message : String(error)
    })
    throw error
  }
}

export async function saveStakeholderIssues(
  client: PoolClient,
  projectId: string,
  userId: string,
  entities: StakeholderIssue[]
): Promise<PersistenceResult> {
  if (entities.length === 0) {
    return { saved: 0, skipped: 0, failed: 0 }
  }

  try {
    const columnResult = await client.query<{ column_name: string }>(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'stakeholder_issues'`
    )
    const columnSet = new Set(columnResult.rows.map(row => row.column_name))

    const pickColumn = (options: string[]): string | null => {
      for (const option of options) {
        if (columnSet.has(option)) {
          return option
        }
      }
      return null
    }

    const issueTypeColumn = pickColumn(['issue_type', 'issue_category', 'category', 'type'])
    const severityColumn = pickColumn(['severity', 'priority', 'impact'])
    const descriptionColumn = pickColumn(['description', 'issue_description', 'details'])
    const statusColumn = pickColumn(['status', 'issue_status'])
    const reportedDateColumn = pickColumn(['reported_date', 'reported_at'])
    const resolutionDateColumn = pickColumn(['resolution_date', 'resolved_at'])
    const resolutionNotesColumn = pickColumn(['resolution_notes', 'resolution_summary', 'resolution'])
    const stakeholderIdColumn = pickColumn(['stakeholder_id'])
    const stakeholderNameColumn = pickColumn(['stakeholder_name'])
    const issueIdColumn = pickColumn(['issue_id'])
    const sourceDocumentColumn = pickColumn(['source_document_id'])
    const createdByColumn = pickColumn(['created_by'])

    const columnOrder: Array<{ name: string; value: (entity: StakeholderIssue) => any }> = [
      { name: 'project_id', value: () => projectId }
    ]

    if (issueIdColumn) {
      columnOrder.push({ name: issueIdColumn, value: (e) => isValidUUID(e.issue_id) ? e.issue_id : null })
    }
    if (stakeholderIdColumn) {
      columnOrder.push({ name: stakeholderIdColumn, value: (e) => isValidUUID(e.stakeholder_id) ? e.stakeholder_id : null })
    }
    if (stakeholderNameColumn) {
      columnOrder.push({ name: stakeholderNameColumn, value: (e) => e.stakeholder_name || null })
    }
    if (issueTypeColumn) {
      columnOrder.push({ name: issueTypeColumn, value: (e) => e.issue_type || null })
    }
    if (severityColumn) {
      columnOrder.push({ name: severityColumn, value: (e) => e.severity || null })
    }
    if (descriptionColumn) {
      columnOrder.push({ name: descriptionColumn, value: (e) => e.description || null })
    }
    if (statusColumn) {
      columnOrder.push({ name: statusColumn, value: (e) => e.status || null })
    }
    if (reportedDateColumn) {
      columnOrder.push({ name: reportedDateColumn, value: (e) => e.reported_date || null })
    }
    if (resolutionDateColumn) {
      columnOrder.push({ name: resolutionDateColumn, value: (e) => e.resolution_date || null })
    }
    if (resolutionNotesColumn) {
      columnOrder.push({ name: resolutionNotesColumn, value: (e) => e.resolution_notes || null })
    }
    if (sourceDocumentColumn) {
      columnOrder.push({ name: sourceDocumentColumn, value: (e) => e.source_document_id || null })
    }
    if (createdByColumn) {
      columnOrder.push({ name: createdByColumn, value: () => userId })
    }

    if (columnOrder.length === 0) {
      throw new Error('stakeholder_issues table has no writable columns')
    }

    await client.query('DELETE FROM stakeholder_issues WHERE project_id = $1', [projectId])

    const values: any[] = []
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
      `INSERT INTO stakeholder_issues (${columnOrder.map(col => col.name).join(', ')})
      VALUES ${placeholders.join(', ')}`,
      values
    )

    return { saved: entities.length, skipped: 0, failed: 0 }
  } catch (error: unknown) {
    logger.error('[EXTRACTION-STAKEHOLDER-ISSUES] Failed to save', {
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
