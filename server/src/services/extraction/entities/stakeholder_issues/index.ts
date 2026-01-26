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
    await client.query('DELETE FROM stakeholder_issues WHERE project_id = $1', [projectId])

    const values: any[] = []
    const placeholders: string[] = []

    entities.forEach((e, index) => {
      const offset = index * 13
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13})`
      )

      values.push(
        projectId,
        e.issue_id || null,
        e.stakeholder_id || null,
        e.stakeholder_name || null,
        e.issue_type || null,
        e.severity || null,
        e.description || null,
        e.status || null,
        e.reported_date || null,
        e.resolution_date || null,
        e.resolution_notes || null,
        e.source_document_id || null,
        userId
      )
    })

    await client.query(
      `INSERT INTO stakeholder_issues (
        project_id, issue_id, stakeholder_id, stakeholder_name, issue_type, severity,
        description, status, reported_date, resolution_date, resolution_notes,
        source_document_id, created_by
      )
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
