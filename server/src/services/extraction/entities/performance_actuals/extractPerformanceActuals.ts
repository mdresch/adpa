/**
 * Extract Performance Actuals
 * 
 * Extracts actual performance data from project documents.
 * CRITICAL: Only extracts ACTUAL performance data (what happened), NOT planned/future data.
 */

import { logger } from '../../../../utils/logger'
import { aiService } from '../../../aiService'
import type { ExtractionContext } from '../../base/ExtractionContext'
import type { ExtractionResult } from '../../base/ExtractionResult'
import { parseAIResponse, coerceNumber, coerceInteger } from '../../base/Parser'
import { buildExtractionPrompt } from '../../base/PromptBuilder'
import { resolveSourceDocumentIdStrict } from '../../base/SourceDocumentResolver'
import { extractionCacheService } from '../../cache'
import { normalizeDate } from '../../base/Persistence'
import type { PerformanceActual } from './types'

/**
 * Extract performance actuals from documents
 */
export async function extractPerformanceActuals(
  context: ExtractionContext,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<ExtractionResult<PerformanceActual>> {
  const startTime = Date.now()
  let cacheHit = false
  let totalExtracted = 0
  let afterDeduplication = 0
  let afterSourceResolution = 0
  let afterFiltering = 0
  let rejectedCount = 0

  try {
    logger.info('[EXTRACTION-PERFORMANCE-ACTUALS] Starting extraction', {
      projectId: context.projectId,
      documentCount: context.documents.length
    })

    // Check cache
    const cached = await extractionCacheService.get(
      context.projectId,
      context.documentContext,
      'performance_actuals',
      context.provider,
      context.model
    )

    if (cached && cached.length > 0) {
      logger.info(`[EXTRACTION-PERFORMANCE-ACTUALS] ✅ Using cached result (${cached.length} entities)`)
      cacheHit = true
      
      // Resolve source documents for cached entities
      const validActuals: PerformanceActual[] = []
      cached.forEach((actual: any) => {
        const resolution = resolveSourceDocumentIdStrict(
          actual,
          context,
          'PERFORMANCE-ACTUALS',
          actual.entity_name || `Performance Actual ${actual.entity_type || 'Unknown'}`
        )
        
        if (resolution.resolved) {
          validActuals.push(actual as PerformanceActual)
        } else {
          rejectedCount++
        }
      })

      afterSourceResolution = validActuals.length

      // Filter out invalid entries (must have at least entity_name and some actual data)
      const filteredActuals = validActuals.filter((actual: PerformanceActual) => {
        return actual.entity_name && (
          actual.actual_start_date ||
          actual.actual_end_date ||
          actual.actual_cost !== null ||
          actual.actual_progress_percent !== null ||
          actual.quality_score !== null
        )
      })

      afterFiltering = filteredActuals.length

      return {
        entities: filteredActuals,
        rejectedCount,
        skippedCount: 0,
        stats: {
          totalExtracted: cached.length,
          afterDeduplication: cached.length,
          afterSourceResolution: validActuals.length,
          finalCount: filteredActuals.length,
          cacheHit: true,
          durationMs: Date.now() - startTime,
          provider: context.provider,
          model: context.model
        }
      }
    }

    // Cache miss - perform AI extraction
    logger.info(`[EXTRACTION-PERFORMANCE-ACTUALS] ❌ Cache miss, calling AI...`, {
      provider: context.provider,
      model: context.model,
      documentCount: context.documents.length
    })

    // Build prompt with emphasis on ACTUAL data only
    const jsonStructure = `{
  "performance_actuals": [
    {
      "entity_type": "milestone|deliverable|activity|phase|resource",
      "entity_name": "Name of the milestone/deliverable/activity",
      "planned_start_date": "YYYY-MM-DD (if mentioned)",
      "actual_start_date": "YYYY-MM-DD (if mentioned)",
      "planned_end_date": "YYYY-MM-DD (if mentioned)",
      "actual_end_date": "YYYY-MM-DD (if mentioned)",
      "planned_cost": number (if mentioned),
      "actual_cost": number (if mentioned),
      "planned_progress_percent": number 0-100 (if mentioned),
      "actual_progress_percent": number 0-100 (if mentioned),
      "quality_score": number 0-10 (if mentioned),
      "defects_found": number (if mentioned),
      "rework_hours": number (if mentioned),
      "notes": "Brief context from the document",
      "source_document": "EXACT document title from AVAILABLE DOCUMENTS list above"
    }
  ]
}`

    const requirements = [
      'CRITICAL: Only extract ACTUAL performance data (what happened), NOT planned/future data',
      'Look for: "Actual start date", "Actually started on", "Completed on", "Spent $X", "Progress: X% complete"',
      'entity_type must be one of: milestone, deliverable, activity, phase, resource',
      'Dates should be in YYYY-MM-DD format',
      'Remove currency symbols and convert costs to numbers',
      'Progress percentages should be 0-100',
      'Quality scores should be 0-10',
      'Return empty array if no actuals found'
    ]

    const basePrompt = buildExtractionPrompt(
      context,
      'performance_actuals',
      'actual performance data that occurred during project execution',
      jsonStructure,
      requirements
    )

    // Enhance prompt with specific instructions
    const prompt = `You are analyzing project documents to extract PERFORMANCE ACTUALS - actual performance data that occurred during project execution.

CRITICAL: Only extract ACTUAL performance data (what happened), NOT planned/future data.

Look for:
- "Actual start date: ...", "Actually started on ...", "Work began on ..."
- "Actual end date: ...", "Completed on ...", "Finished on ..."
- "Actual cost: $X", "Spent $X", "Incurred $X"
- "Progress: X% complete", "X% done", "Completed X%"
- "Behind schedule by X days", "Ahead of schedule", "Delayed by ..."
- "Under budget by $X", "Over budget by $X"
- Status updates, progress reports, actual vs. planned comparisons
- Quality metrics: defects found, rework hours, quality scores

${basePrompt}`

    // Call AI with fallback
    const response = await aiService.generateWithFallback({
      prompt,
      provider: context.provider,
      model: context.model,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 8000
    }, ['openai', 'google', 'anthropic', 'mistral', 'groq'])

    // Parse response
    const parsed = parseAIResponse(response.content)
    const rawActuals = parsed.performance_actuals || []
    totalExtracted = rawActuals.length

    // Normalize and clean entities
    const actuals: PerformanceActual[] = rawActuals.map((item: any) => ({
      entity_type: item.entity_type || 'milestone',
      entity_id: item.entity_id || null,
      entity_name: item.entity_name || '',
      planned_start_date: normalizeDate(item.planned_start_date) || undefined,
      actual_start_date: normalizeDate(item.actual_start_date) || undefined,
      planned_end_date: normalizeDate(item.planned_end_date) || undefined,
      actual_end_date: normalizeDate(item.actual_end_date) || undefined,
      planned_cost: coerceNumber(item.planned_cost),
      actual_cost: coerceNumber(item.actual_cost),
      planned_progress_percent: coerceNumber(item.planned_progress_percent),
      actual_progress_percent: coerceNumber(item.actual_progress_percent),
      quality_score: coerceNumber(item.quality_score),
      defects_found: coerceInteger(item.defects_found),
      rework_hours: coerceNumber(item.rework_hours),
      notes: item.notes || null,
      source_document: item.source_document || null
    }))

    afterDeduplication = actuals.length

    // Resolve source_document_id for each performance actual (STRICT: reject if missing)
    const validActuals: PerformanceActual[] = []
    
    actuals.forEach((actual) => {
      const resolution = resolveSourceDocumentIdStrict(
        actual,
        context,
        'PERFORMANCE-ACTUALS',
        actual.entity_name || `Performance Actual ${actual.entity_type || 'Unknown'}`
      )
      
      if (resolution.resolved) {
        validActuals.push(actual)
      } else {
        rejectedCount++
      }
    })

    afterSourceResolution = validActuals.length

    // Filter out invalid entries (must have at least entity_name and some actual data)
    const filteredActuals = validActuals.filter((actual: PerformanceActual) => {
      return actual.entity_name && (
        actual.actual_start_date ||
        actual.actual_end_date ||
        actual.actual_cost !== null ||
        actual.actual_progress_percent !== null ||
        actual.quality_score !== null
      )
    })

    afterFiltering = filteredActuals.length

    if (rejectedCount > 0) {
      logger.warn(`[EXTRACTION-PERFORMANCE-ACTUALS] REJECTED ${rejectedCount} performance actuals without valid source_document_id (out of ${actuals.length} total)`)
    }

    const filteredOutCount = validActuals.length - filteredActuals.length
    if (filteredOutCount > 0) {
      logger.info(`[EXTRACTION-PERFORMANCE-ACTUALS] Filtered out ${filteredOutCount} performance actuals without actual data`)
    }
    
    logger.info(`[EXTRACTION-PERFORMANCE-ACTUALS] Extracted ${filteredActuals.length} performance actuals`)

    // Cache the result
    if (filteredActuals.length > 0) {
      await extractionCacheService.set(
        context.projectId,
        context.documentContext,
        'performance_actuals',
        filteredActuals,
        context.provider,
        context.model
      )
    }

    return {
      entities: filteredActuals,
      rejectedCount,
      skippedCount: 0,
      stats: {
        totalExtracted,
        afterDeduplication,
        afterSourceResolution,
        finalCount: filteredActuals.length,
        cacheHit: false,
        durationMs: Date.now() - startTime,
        provider: context.provider,
        model: context.model
      }
    }
  } catch (error: unknown) {
    logger.error('[EXTRACTION-PERFORMANCE-ACTUALS] Extraction failed', {
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

