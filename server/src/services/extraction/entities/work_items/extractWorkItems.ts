/**
 * Extract Work Items
 * 
 * Extracts work items / tasks / backlog items with effort tracking details from project documents.
 */

import { logger } from '../../../../utils/logger'
import { aiService } from '../../../aiService'
import type { ExtractionContext } from '../../base/ExtractionContext'
import type { ExtractionResult } from '../../base/ExtractionResult'
import { parseAIResponse, coerceNumber, coerceArray } from '../../base/Parser'
import { buildExtractionPrompt } from '../../base/PromptBuilder'
import { resolveSourceDocumentIdStrict } from '../../base/SourceDocumentResolver'
import { extractionCacheService } from '../../cache'
import type { WorkItem } from './types'

/**
 * Extract work items from documents
 */
export async function extractWorkItems(
  context: ExtractionContext,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<ExtractionResult<WorkItem>> {
  const startTime = Date.now()
  let cacheHit = false
  let totalExtracted = 0
  let afterDeduplication = 0
  let afterSourceResolution = 0
  let rejectedCount = 0

  try {
    logger.info('[EXTRACTION-WORK-ITEMS] Starting extraction', {
      projectId: context.projectId,
      documentCount: context.documents.length
    })

    // Check cache
    const cached = await extractionCacheService.get(
      context.projectId,
      context.documentContext,
      'work_items',
      context.provider,
      context.model
    )

    if (cached && cached.length > 0) {
      logger.info(`[EXTRACTION-WORK-ITEMS] ✅ Using cached result (${cached.length} entities)`)
      cacheHit = true
      
      // Resolve source documents for cached entities
      const validWorkItems: WorkItem[] = []
      cached.forEach((item: any) => {
        const resolution = resolveSourceDocumentIdStrict(
          item,
          context,
          'WORK-ITEMS',
          item.name || 'Unnamed Work Item'
        )
        
        if (resolution.resolved) {
          validWorkItems.push(item as WorkItem)
        } else {
          rejectedCount++
        }
      })

      afterSourceResolution = validWorkItems.length

      return {
        entities: validWorkItems,
        rejectedCount,
        skippedCount: 0,
        stats: {
          totalExtracted: cached.length,
          afterDeduplication: cached.length,
          afterSourceResolution: validWorkItems.length,
          finalCount: validWorkItems.length,
          cacheHit: true,
          durationMs: Date.now() - startTime,
          provider: context.provider,
          model: context.model
        }
      }
    }

    // Cache miss - perform AI extraction
    logger.info(`[EXTRACTION-WORK-ITEMS] ❌ Cache miss, calling AI...`, {
      provider: context.provider,
      model: context.model,
      documentCount: context.documents.length
    })

    // Build prompt
    const jsonStructure = `{
  "work_items": [
    {
      "name": "Work item title",
      "description": "Markdown summary",
      "activity_name": "Linked activity name if mentioned",
      "assigned_to": "Person or role",
      "estimated_hours": number or null,
      "actual_hours": number or null,
      "progress_percentage": number 0-100 or null,
      "status": "todo|in_progress|review|done|blocked",
      "blockers": ["Blocker 1"],
      "completed_date": "YYYY-MM-DD or null",
      "source_document": "EXACT document title from AVAILABLE DOCUMENTS list above"
    }
  ]
}`

    const requirements = [
      'Include **every activity table row as a work item**; do not omit rows that lack hours or assignees.',
      'Include items with measurable effort or progress tracking when present.',
      'Convert percentages like "65%" to numbers.',
      'Use arrays for blockers even if single.',
      'Default status to "todo" when not given.'
    ]

    const prompt = buildExtractionPrompt(
      context,
      'work_items',
      'work items / tasks / backlog items with effort tracking details',
      jsonStructure,
      requirements
    )

    // Add specific instructions for activity list tables
    const enhancedPrompt = `Identify **all work items / tasks / backlog items** with effort tracking details.

IMPORTANT:
- The document contains an "Activity List" table with rows like "Activity ID | Activity Name | WBS Element ID Reference | Predecessors | Successors | Constraint Type | Critical Path".
- Create **one work item per table row** (even if hours/assignee/progress are missing). Do not skip rows.
- Use "Activity Name" as name, and also set activity_name = Activity Name.
- If available, include Activity ID and WBS reference in description for traceability.
- If no hours, progress, or blockers are provided, set estimated_hours = null, actual_hours = null, progress_percentage = null, blockers = [].

${prompt}`

    // Call AI
    const response = await aiService.generate({
      prompt: enhancedPrompt,
      provider: context.provider,
      model: context.model,
      temperature: options.temperature ?? 0.2,
      max_tokens: options.maxTokens ?? 8000
    })

    // Parse response
    const parsed = parseAIResponse(response.content)
    const rawWorkItems = parsed.work_items || []
    totalExtracted = rawWorkItems.length

    // Normalize and clean entities
    const workItems: WorkItem[] = rawWorkItems.map((item: any) => ({
      ...item,
      estimated_hours: coerceNumber(item?.estimated_hours),
      actual_hours: coerceNumber(item?.actual_hours),
      progress_percentage: coerceNumber(item?.progress_percentage),
      blockers: coerceArray<string>(item?.blockers)
    }))

    afterDeduplication = workItems.length

    // Resolve source_document_id for each work item (STRICT: reject if missing)
    const validWorkItems: WorkItem[] = []
    
    workItems.forEach((item) => {
      const resolution = resolveSourceDocumentIdStrict(
        item,
        context,
        'WORK-ITEMS',
        item.name || 'Unnamed Work Item'
      )
      
      if (resolution.resolved) {
        validWorkItems.push(item)
      } else {
        rejectedCount++
      }
    })

    afterSourceResolution = validWorkItems.length

    if (rejectedCount > 0) {
      logger.warn(`[EXTRACTION-WORK-ITEMS] REJECTED ${rejectedCount} work items without valid source_document_id (out of ${workItems.length} total)`)
    }
    
    logger.info(`[EXTRACTION-WORK-ITEMS] Extracted ${validWorkItems.length} work items with valid source_document_id (${rejectedCount} rejected)`)

    // Cache the result
    if (validWorkItems.length > 0) {
      await extractionCacheService.set(
        context.projectId,
        context.documentContext,
        'work_items',
        validWorkItems,
        context.provider,
        context.model
      )
    }

    return {
      entities: validWorkItems,
      rejectedCount,
      skippedCount: 0,
      stats: {
        totalExtracted,
        afterDeduplication,
        afterSourceResolution,
        finalCount: validWorkItems.length,
        cacheHit: false,
        durationMs: Date.now() - startTime,
        provider: context.provider,
        model: context.model
      }
    }
  } catch (error: unknown) {
    logger.error('[EXTRACTION-WORK-ITEMS] Extraction failed', {
      projectId: context.projectId,
      error: error instanceof Error ? error.message : String(error)
    })
    
    return {
      entities: [],
      rejectedCount: 0,
      skippedCount: 0,
      stats: {
        totalExtracted: 0,
        afterDeduplication: 0,
        afterSourceResolution: 0,
        finalCount: 0,
        cacheHit,
        durationMs: Date.now() - startTime,
        provider: context.provider,
        model: context.model
      }
    }
  }
}

