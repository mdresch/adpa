/**
 * Extract Performance Measurements
 * 
 * Extracts actual performance measurements for success criteria / KPIs from project documents.
 * This entity links to success_criteria and requires careful matching.
 */

import { logger } from '../../../../utils/logger'
import { aiService } from '../../../aiService'
import type { ExtractionContext } from '../../base/ExtractionContext'
import type { ExtractionResult } from '../../base/ExtractionResult'
import { parseAIResponse, coerceNumber } from '../../base/Parser'
import { buildExtractionPrompt } from '../../base/PromptBuilder'
import { resolveSourceDocumentIdStrict } from '../../base/SourceDocumentResolver'
import { extractionCacheService } from '../../cache'
import type { PerformanceMeasurement } from './types'

/**
 * Extract performance measurements from documents
 */
export async function extractPerformanceMeasurements(
  context: ExtractionContext,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<ExtractionResult<PerformanceMeasurement>> {
  const startTime = Date.now()
  let cacheHit = false
  let totalExtracted = 0
  let afterDeduplication = 0
  let afterSourceResolution = 0
  let rejectedCount = 0

  try {
    logger.info('[EXTRACTION-PERFORMANCE-MEASUREMENTS] Starting extraction', {
      projectId: context.projectId,
      documentCount: context.documents.length
    })

    // Check cache
    const cached = await extractionCacheService.get(
      context.projectId,
      context.documentContext,
      'performance_measurements',
      context.provider,
      context.model
    )

    if (cached && cached.length > 0) {
      logger.info(`[EXTRACTION-PERFORMANCE-MEASUREMENTS] ✅ Using cached result (${cached.length} entities)`)
      cacheHit = true
      
      // Resolve source documents for cached entities
      const validMeasurements: PerformanceMeasurement[] = []
      cached.forEach((measurement: any) => {
        const resolution = resolveSourceDocumentIdStrict(
          measurement,
          context,
          'PERFORMANCE-MEASUREMENTS',
          measurement.success_criterion_name || 'Unnamed Measurement'
        )
        
        if (resolution.resolved) {
          validMeasurements.push(measurement as PerformanceMeasurement)
        } else {
          rejectedCount++
        }
      })

      afterSourceResolution = validMeasurements.length

      return {
        entities: validMeasurements,
        rejectedCount,
        skippedCount: 0,
        stats: {
          totalExtracted: cached.length,
          afterDeduplication: cached.length,
          afterSourceResolution: validMeasurements.length,
          finalCount: validMeasurements.length,
          cacheHit: true,
          durationMs: Date.now() - startTime,
          provider: context.provider,
          model: context.model
        }
      }
    }

    // Cache miss - perform AI extraction
    logger.info(`[EXTRACTION-PERFORMANCE-MEASUREMENTS] ❌ Cache miss, calling AI...`, {
      provider: context.provider,
      model: context.model,
      documentCount: context.documents.length
    })

    // Build prompt
    const jsonStructure = `{
  "performance_measurements": [
    {
      "success_criterion_name": "Name of criterion being measured (MUST match existing success criterion name exactly)",
      "measurement_date": "YYYY-MM-DD (REQUIRED - use document date if measurement date not specified)",
      "actual_value": number or null,
      "target_value": number or null,
      "units": "Units (%, days, USD, etc.) or null",
      "variance": number or null,
      "variance_percentage": number or null,
      "trend": "improving|stable|declining|null",
      "status": "on_track|at_risk|off_track",
      "notes": "Markdown context or null",
      "source_document": "EXACT document title from AVAILABLE DOCUMENTS list above"
    }
  ]
}`

    const requirements = [
      'measurement_date is REQUIRED: Extract the date when measurement was taken, or use document date if not specified',
      'Extract BOTH actual measurements (historical data) AND target/planned measurements (future goals)',
      'Convert values to numbers when possible (strip % or currency symbols)',
      'If only textual comparison exists (e.g., "ahead by 5%"), compute variance when possible',
      'Use null where numbers aren\'t available'
    ]

    const prompt = buildExtractionPrompt(
      context,
      'performance_measurements',
      'actual performance measurements for success criteria / KPIs',
      jsonStructure,
      requirements
    )

    // Call AI with fallback
    const response = await aiService.generateWithFallback({
      prompt,
      provider: context.provider,
      model: context.model,
      temperature: options.temperature ?? 0.2,
      max_tokens: options.maxTokens ?? 8000
    }, ['openai', 'google', 'anthropic', 'mistral', 'groq'])

    // Check if response was truncated (common with large extractions)
    const responseContent = response.content || ''
    const isTruncated = responseContent.length > 0 && (
      !responseContent.trim().endsWith('}') && 
      !responseContent.trim().endsWith(']') &&
      !responseContent.includes('```')
    )
    
    if (isTruncated) {
      logger.warn('[EXTRACTION-PERFORMANCE-MEASUREMENTS] Response appears truncated - may have incomplete data', {
        responseLength: responseContent.length,
        lastChars: responseContent.substring(Math.max(0, responseContent.length - 100))
      })
    }

    // Parse response
    const parsed = parseAIResponse(response.content)
    const rawMeasurements = parsed.performance_measurements || []
    totalExtracted = rawMeasurements.length

    // Normalize and clean entities
    const measurements: PerformanceMeasurement[] = rawMeasurements.map((item: any) => ({
      ...item,
      actual_value: coerceNumber(item?.actual_value),
      target_value: coerceNumber(item?.target_value),
      variance: coerceNumber(item?.variance),
      variance_percentage: coerceNumber(item?.variance_percentage)
    }))

    afterDeduplication = measurements.length

    // Resolve source_document_id for each measurement (STRICT: reject if missing)
    const validMeasurements: PerformanceMeasurement[] = []
    
    measurements.forEach((measurement) => {
      const resolution = resolveSourceDocumentIdStrict(
        measurement,
        context,
        'PERFORMANCE-MEASUREMENTS',
        measurement.success_criterion_name || 'Unnamed Measurement'
      )
      
      if (resolution.resolved) {
        validMeasurements.push(measurement)
      } else {
        rejectedCount++
      }
    })

    afterSourceResolution = validMeasurements.length

    if (rejectedCount > 0) {
      logger.warn(`[EXTRACTION-PERFORMANCE-MEASUREMENTS] REJECTED ${rejectedCount} measurements without valid source_document_id (out of ${measurements.length} total)`)
    }
    
    logger.info(`[EXTRACTION-PERFORMANCE-MEASUREMENTS] Extracted ${validMeasurements.length} measurements with valid source_document_id (${rejectedCount} rejected)`)

    // Cache the result
    if (validMeasurements.length > 0) {
      await extractionCacheService.set(
        context.projectId,
        context.documentContext,
        'performance_measurements',
        validMeasurements,
        context.provider,
        context.model
      )
    }

    return {
      entities: validMeasurements,
      rejectedCount,
      skippedCount: 0,
      stats: {
        totalExtracted,
        afterDeduplication,
        afterSourceResolution,
        finalCount: validMeasurements.length,
        cacheHit: false,
        durationMs: Date.now() - startTime,
        provider: context.provider,
        model: context.model
      }
    }
  } catch (error: unknown) {
    logger.error('[EXTRACTION-PERFORMANCE-MEASUREMENTS] Extraction failed', {
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

