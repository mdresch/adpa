/**
 * Extract Earned Value Metrics
 * 
 * Extracts Earned Value Management (EVM) metrics from project documents.
 * EVM metrics track project performance using planned value, earned value, and actual cost.
 */

import { logger } from '../../../../utils/logger'
import { aiService } from '../../../aiService'
import type { ExtractionContext } from '../../base/ExtractionContext'
import type { ExtractionResult } from '../../base/ExtractionResult'
import { parseAIResponse, coerceNumber } from '../../base/Parser'
import { buildExtractionPrompt } from '../../base/PromptBuilder'
import { resolveSourceDocumentIdStrict } from '../../base/SourceDocumentResolver'
import { extractionCacheService } from '../../cache'
import type { EarnedValueMetric } from './types'

/**
 * Extract earned value metrics from documents
 */
export async function extractEarnedValueMetrics(
  context: ExtractionContext,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<ExtractionResult<EarnedValueMetric>> {
  const startTime = Date.now()
  let cacheHit = false
  let totalExtracted = 0
  let afterDeduplication = 0
  let afterSourceResolution = 0
  let rejectedCount = 0

  try {
    logger.info('[EXTRACTION-EARNED-VALUE-METRICS] Starting extraction', {
      projectId: context.projectId,
      documentCount: context.documents.length
    })

    // Check cache
    const cached = await extractionCacheService.get(
      context.projectId,
      context.documentContext,
      'earned_value_metrics',
      context.provider,
      context.model
    )

    if (cached && cached.length > 0) {
      logger.info(`[EXTRACTION-EARNED-VALUE-METRICS] ✅ Using cached result (${cached.length} entities)`)
      cacheHit = true
      
      // Resolve source documents for cached entities
      const validMetrics: EarnedValueMetric[] = []
      cached.forEach((metric: any) => {
        const resolution = resolveSourceDocumentIdStrict(
          metric,
          context,
          'EARNED-VALUE-METRICS',
          `EVM Metric ${metric.measurement_date || 'Unknown Date'}`
        )
        
        if (resolution.resolved) {
          validMetrics.push(metric as EarnedValueMetric)
        } else {
          rejectedCount++
        }
      })

      afterSourceResolution = validMetrics.length

      return {
        entities: validMetrics,
        rejectedCount,
        skippedCount: 0,
        stats: {
          totalExtracted: cached.length,
          afterDeduplication: cached.length,
          afterSourceResolution: validMetrics.length,
          finalCount: validMetrics.length,
          cacheHit: true,
          durationMs: Date.now() - startTime,
          provider: context.provider,
          model: context.model
        }
      }
    }

    // Cache miss - perform AI extraction
    logger.info(`[EXTRACTION-EARNED-VALUE-METRICS] ❌ Cache miss, calling AI...`, {
      provider: context.provider,
      model: context.model,
      documentCount: context.documents.length
    })

    // Build prompt
    const jsonStructure = `{
  "earned_value_metrics": [
    {
      "measurement_date": "YYYY-MM-DD",
      "planned_value": number or null,
      "earned_value": number or null,
      "actual_cost": number or null,
      "schedule_variance": number or null,
      "cost_variance": number or null,
      "schedule_performance_index": number or null,
      "cost_performance_index": number or null,
      "estimate_at_completion": number or null,
      "estimate_to_complete": number or null,
      "notes": "Markdown commentary or null",
      "source_document": "EXACT document title from AVAILABLE DOCUMENTS list above"
    }
  ]
}`

    const requirements = [
      'Convert currency strings to numeric values (strip $ or commas)',
      'Provide null when a metric isn\'t available rather than fabricating it',
      'Extract all EVM metrics mentioned: PV, EV, AC, SV, CV, SPI, CPI, EAC, ETC'
    ]

    const prompt = buildExtractionPrompt(
      context,
      'earned_value_metrics',
      'Earned Value Management (EVM) metrics',
      jsonStructure,
      requirements
    )

    // Call AI
    const response = await aiService.generate({
      prompt,
      provider: context.provider,
      model: context.model,
      temperature: options.temperature ?? 0.2,
      max_tokens: options.maxTokens ?? 8000
    })

    // Parse response
    const parsed = parseAIResponse(response.content)
    const rawMetrics = parsed.earned_value_metrics || []
    totalExtracted = rawMetrics.length

    // Normalize and clean entities
    const metrics: EarnedValueMetric[] = rawMetrics.map((metric: any) => ({
      ...metric,
      planned_value: coerceNumber(metric?.planned_value),
      earned_value: coerceNumber(metric?.earned_value),
      actual_cost: coerceNumber(metric?.actual_cost),
      schedule_variance: coerceNumber(metric?.schedule_variance),
      cost_variance: coerceNumber(metric?.cost_variance),
      schedule_performance_index: coerceNumber(metric?.schedule_performance_index),
      cost_performance_index: coerceNumber(metric?.cost_performance_index),
      estimate_at_completion: coerceNumber(metric?.estimate_at_completion),
      estimate_to_complete: coerceNumber(metric?.estimate_to_complete)
    }))

    afterDeduplication = metrics.length

    // Resolve source_document_id for each EVM metric (STRICT: reject if missing)
    const validMetrics: EarnedValueMetric[] = []
    
    metrics.forEach((metric) => {
      const resolution = resolveSourceDocumentIdStrict(
        metric,
        context,
        'EARNED-VALUE-METRICS',
        `EVM Metric ${metric.measurement_date || 'Unknown Date'}`
      )
      
      if (resolution.resolved) {
        validMetrics.push(metric)
      } else {
        rejectedCount++
      }
    })

    afterSourceResolution = validMetrics.length

    if (rejectedCount > 0) {
      logger.warn(`[EXTRACTION-EARNED-VALUE-METRICS] REJECTED ${rejectedCount} EVM metrics without valid source_document_id (out of ${metrics.length} total)`)
    }
    
    logger.info(`[EXTRACTION-EARNED-VALUE-METRICS] Extracted ${validMetrics.length} EVM metrics with valid source_document_id (${rejectedCount} rejected)`)

    // Cache the result
    if (validMetrics.length > 0) {
      await extractionCacheService.set(
        context.projectId,
        context.documentContext,
        'earned_value_metrics',
        validMetrics,
        context.provider,
        context.model
      )
    }

    return {
      entities: validMetrics,
      rejectedCount,
      skippedCount: 0,
      stats: {
        totalExtracted,
        afterDeduplication,
        afterSourceResolution,
        finalCount: validMetrics.length,
        cacheHit: false,
        durationMs: Date.now() - startTime,
        provider: context.provider,
        model: context.model
      }
    }
  } catch (error: unknown) {
    logger.error('[EXTRACTION-EARNED-VALUE-METRICS] Extraction failed', {
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

