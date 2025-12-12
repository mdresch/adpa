/**
 * Extract Opportunities
 * 
 * Extracts opportunities (positive risks) from project documents.
 * Opportunities are potential positive events that can benefit the project.
 */

import { logger } from '../../../../utils/logger'
import { aiService } from '../../../aiService'
import type { ExtractionContext } from '../../base/ExtractionContext'
import type { ExtractionResult } from '../../base/ExtractionResult'
import { parseAIResponse, coerceNumber } from '../../base/Parser'
import { buildExtractionPrompt } from '../../base/PromptBuilder'
import { resolveSourceDocumentIdStrict } from '../../base/SourceDocumentResolver'
import { extractionCacheService } from '../../cache'
import type { Opportunity } from './types'

/**
 * Extract opportunities from documents
 */
export async function extractOpportunities(
  context: ExtractionContext,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<ExtractionResult<Opportunity>> {
  const startTime = Date.now()
  let cacheHit = false
  let totalExtracted = 0
  let afterDeduplication = 0
  let afterSourceResolution = 0
  let rejectedCount = 0

  try {
    logger.info('[EXTRACTION-OPPORTUNITIES] Starting extraction', {
      projectId: context.projectId,
      documentCount: context.documents.length
    })

    // Check cache
    const cached = await extractionCacheService.get(
      context.projectId,
      context.documentContext,
      'opportunities',
      context.provider,
      context.model
    )

    if (cached && cached.length > 0) {
      logger.info(`[EXTRACTION-OPPORTUNITIES] ✅ Using cached result (${cached.length} entities)`)
      cacheHit = true
      
      // Resolve source documents for cached entities
      const validOpportunities: Opportunity[] = []
      cached.forEach((opportunity: any) => {
        const resolution = resolveSourceDocumentIdStrict(
          opportunity,
          context,
          'OPPORTUNITIES',
          opportunity.title || 'Unnamed Opportunity'
        )
        
        if (resolution.resolved) {
          validOpportunities.push(opportunity as Opportunity)
        } else {
          rejectedCount++
        }
      })

      afterSourceResolution = validOpportunities.length

      return {
        entities: validOpportunities,
        rejectedCount,
        skippedCount: 0,
        stats: {
          totalExtracted: cached.length,
          afterDeduplication: cached.length,
          afterSourceResolution: validOpportunities.length,
          finalCount: validOpportunities.length,
          cacheHit: true,
          durationMs: Date.now() - startTime,
          provider: context.provider,
          model: context.model
        }
      }
    }

    // Cache miss - perform AI extraction
    logger.info(`[EXTRACTION-OPPORTUNITIES] ❌ Cache miss, calling AI...`, {
      provider: context.provider,
      model: context.model,
      documentCount: context.documents.length
    })

    // Build prompt
    const jsonStructure = `{
  "opportunities": [
    {
      "title": "Opportunity name",
      "description": "Markdown description",
      "category": "Strategic, Technical, Market, etc.",
      "probability": "very_high|high|medium|low|very_low",
      "benefit_level": "very_high|high|medium|low|very_low",
      "exploitation_strategy": "Plan to realize the opportunity",
      "owner": "Person or role",
      "status": "identified|planned|exploiting|realized|missed",
      "expected_benefit": number or null,
      "trigger_conditions": "What triggers action",
      "source_document": "EXACT document title from AVAILABLE DOCUMENTS list above"
    }
  ]
}`

    const requirements = [
      'Map qualitative terms to the enum values. For example "moderate" -> medium',
      'If quantitative benefit (e.g., $200k) is mentioned, convert to number'
    ]

    const prompt = buildExtractionPrompt(
      context,
      'opportunities',
      'opportunities (positive risks)',
      jsonStructure,
      requirements
    )

    // Call AI with fallback
    const response = await aiService.generateWithFallback({
      prompt,
      provider: context.provider,
      model: context.model,
      temperature: options.temperature ?? 0.25,
      max_tokens: options.maxTokens ?? 8000
    }, ['openai', 'google', 'anthropic', 'mistral', 'groq'])

    // Parse response
    const parsed = parseAIResponse(response.content)
    const rawOpportunities = parsed.opportunities || []
    totalExtracted = rawOpportunities.length

    // Normalize and clean entities
    const opportunities: Opportunity[] = rawOpportunities.map((item: any) => ({
      ...item,
      expected_benefit: coerceNumber(item?.expected_benefit)
    }))

    afterDeduplication = opportunities.length

    // Resolve source_document_id for each opportunity (STRICT: reject if missing)
    const validOpportunities: Opportunity[] = []
    
    opportunities.forEach((opportunity) => {
      const resolution = resolveSourceDocumentIdStrict(
        opportunity,
        context,
        'OPPORTUNITIES',
        opportunity.title || 'Unnamed Opportunity'
      )
      
      if (resolution.resolved) {
        validOpportunities.push(opportunity)
      } else {
        rejectedCount++
      }
    })

    afterSourceResolution = validOpportunities.length

    if (rejectedCount > 0) {
      logger.warn(`[EXTRACTION-OPPORTUNITIES] REJECTED ${rejectedCount} opportunities without valid source_document_id (out of ${opportunities.length} total)`)
    }
    
    logger.info(`[EXTRACTION-OPPORTUNITIES] Extracted ${validOpportunities.length} opportunities with valid source_document_id (${rejectedCount} rejected)`)

    // Cache the result
    if (validOpportunities.length > 0) {
      await extractionCacheService.set(
        context.projectId,
        context.documentContext,
        'opportunities',
        validOpportunities,
        context.provider,
        context.model
      )
    }

    return {
      entities: validOpportunities,
      rejectedCount,
      skippedCount: 0,
      stats: {
        totalExtracted,
        afterDeduplication,
        afterSourceResolution,
        finalCount: validOpportunities.length,
        cacheHit: false,
        durationMs: Date.now() - startTime,
        provider: context.provider,
        model: context.model
      }
    }
  } catch (error: unknown) {
    logger.error('[EXTRACTION-OPPORTUNITIES] Extraction failed', {
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

