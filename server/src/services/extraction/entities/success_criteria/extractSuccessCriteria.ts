/**
 * Extract Success Criteria
 * 
 * Extracts success criteria, KPIs, acceptance criteria, and quality gates from project documents.
 */

import { logger } from '../../../../utils/logger'
import { aiService } from '../../../aiService'
import type { ExtractionContext } from '../../base/ExtractionContext'
import type { ExtractionResult } from '../../base/ExtractionResult'
import { parseAIResponse } from '../../base/Parser'
import { buildExtractionPrompt } from '../../base/PromptBuilder'
import { resolveSourceDocumentIdStrict } from '../../base/SourceDocumentResolver'
import { extractionCacheService } from '../../cache'
import type { SuccessCriterion } from './types'

/**
 * Extract success criteria from documents
 */
export async function extractSuccessCriteria(
  context: ExtractionContext,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<ExtractionResult<SuccessCriterion>> {
  const startTime = Date.now()
  let cacheHit = false
  let totalExtracted = 0
  let afterDeduplication = 0
  let afterSourceResolution = 0
  let rejectedCount = 0

  try {
    logger.info('[EXTRACTION-SUCCESS-CRITERIA] Starting extraction', {
      projectId: context.projectId,
      documentCount: context.documents.length
    })

    // Check cache
    const cached = await extractionCacheService.get(
      context.projectId,
      context.documentContext,
      'success_criteria',
      context.provider,
      context.model
    )

    if (cached && cached.length > 0) {
      logger.info(`[EXTRACTION-SUCCESS-CRITERIA] ✅ Using cached result (${cached.length} entities)`)
      cacheHit = true
      
      // Resolve source documents for cached entities
      const validSuccessCriteria: SuccessCriterion[] = []
      cached.forEach((criterion: any) => {
        const resolution = resolveSourceDocumentIdStrict(
          criterion,
          context,
          'SUCCESS-CRITERIA',
          criterion.title || 'Unnamed Success Criterion'
        )
        
        if (resolution.resolved) {
          validSuccessCriteria.push(criterion as SuccessCriterion)
        } else {
          rejectedCount++
        }
      })

      afterSourceResolution = validSuccessCriteria.length

      return {
        entities: validSuccessCriteria,
        rejectedCount,
        skippedCount: 0,
        stats: {
          totalExtracted: cached.length,
          afterDeduplication: cached.length,
          afterSourceResolution: validSuccessCriteria.length,
          finalCount: validSuccessCriteria.length,
          cacheHit: true,
          durationMs: Date.now() - startTime,
          provider: context.provider,
          model: context.model
        }
      }
    }

    // Cache miss - perform AI extraction
    logger.info(`[EXTRACTION-SUCCESS-CRITERIA] ❌ Cache miss, calling AI...`, {
      provider: context.provider,
      model: context.model,
      documentCount: context.documents.length
    })

    // Build prompt
    const jsonStructure = `{
  "success_criteria": [
    {
      "title": "Success Criterion Title",
      "description": "What defines success",
      "metric": "The measurable metric",
      "target_value": "The target value to achieve",
      "measurement_method": "How this will be measured",
      "priority": "critical|high|medium|low",
      "source_document": "EXACT document title from AVAILABLE DOCUMENTS list above"
    }
  ]
}`

    const requirements = [
      'Include KPIs (Key Performance Indicators)',
      'Include acceptance criteria',
      'Include quality gates',
      'Include success metrics (time, cost, quality, satisfaction)',
      'Extract specific measurable targets if mentioned'
    ]

    const prompt = buildExtractionPrompt(
      context,
      'success criteria',
      'success_criteria',
      jsonStructure,
      requirements
    )

    // Call AI with fallback - use 10000 max_tokens for large success criteria extractions
    const response = await aiService.generateWithFallback({
      prompt,
      provider: context.provider,
      model: context.model,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 10000 // Increased from 2000 to handle very large success criteria extractions
    }, ['openai', 'google', 'anthropic', 'mistral', 'groq'])

    // Parse response
    const parsed = parseAIResponse(response.content)
    const rawSuccessCriteria = parsed.success_criteria || []
    totalExtracted = rawSuccessCriteria.length

    // Deduplicate within batch
    const deduplicatedSuccessCriteria = deduplicateSuccessCriteriaBatch(rawSuccessCriteria)
    afterDeduplication = deduplicatedSuccessCriteria.length

    // Resolve source_document_id for each success criterion (STRICT: reject if missing)
    const validSuccessCriteria: SuccessCriterion[] = []
    
    deduplicatedSuccessCriteria.forEach((criterion) => {
      const resolution = resolveSourceDocumentIdStrict(
        criterion,
        context,
        'SUCCESS-CRITERIA',
        criterion.title || 'Unnamed Success Criterion'
      )
      
      if (resolution.resolved) {
        validSuccessCriteria.push(criterion)
      } else {
        rejectedCount++
      }
    })

    afterSourceResolution = validSuccessCriteria.length

    if (rejectedCount > 0) {
      logger.warn(`[EXTRACTION-SUCCESS-CRITERIA] REJECTED ${rejectedCount} success criteria without valid source_document_id (out of ${deduplicatedSuccessCriteria.length} total)`)
    }
    
    logger.info(`[EXTRACTION-SUCCESS-CRITERIA] Extracted ${validSuccessCriteria.length} success criteria with valid source_document_id (${rejectedCount} rejected)`)

    // Cache the result
    if (validSuccessCriteria.length > 0) {
      await extractionCacheService.set(
        context.projectId,
        context.documentContext,
        'success_criteria',
        validSuccessCriteria,
        context.provider,
        context.model
      )
    }

    return {
      entities: validSuccessCriteria,
      rejectedCount,
      skippedCount: 0,
      stats: {
        totalExtracted,
        afterDeduplication,
        afterSourceResolution,
        finalCount: validSuccessCriteria.length,
        cacheHit: false,
        durationMs: Date.now() - startTime,
        provider: context.provider,
        model: context.model
      }
    }
  } catch (error: unknown) {
    logger.error('[EXTRACTION-SUCCESS-CRITERIA] Extraction failed', {
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

/**
 * Deduplicate success criteria within the extracted batch only
 */
function deduplicateSuccessCriteriaBatch(successCriteria: SuccessCriterion[]): SuccessCriterion[] {
  const deduplicatedMap = new Map<string, SuccessCriterion>()
  
  successCriteria.forEach(criterion => {
    const normalizedTitle = (criterion.title || '').toLowerCase().trim()
    
    if (!deduplicatedMap.has(normalizedTitle)) {
      deduplicatedMap.set(normalizedTitle, criterion)
    } else {
      // Duplicate found - keep first occurrence (title is unique key)
      logger.debug(`[EXTRACTION-SUCCESS-CRITERIA] Skipping duplicate success criterion: "${criterion.title}"`)
    }
  })
  
  return Array.from(deduplicatedMap.values())
}

