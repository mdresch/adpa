/**
 * Extract Risk Responses
 * 
 * Extracts risk response actions from project documents.
 * Risk responses are actions taken to address identified risks.
 */

import { logger } from '../../../../utils/logger'
import { aiService } from '../../../aiService'
import type { ExtractionContext } from '../../base/ExtractionContext'
import type { ExtractionResult } from '../../base/ExtractionResult'
import { parseAIResponse, coerceNumber } from '../../base/Parser'
import { buildExtractionPrompt } from '../../base/PromptBuilder'
import { resolveSourceDocumentIdStrict } from '../../base/SourceDocumentResolver'
import { extractionCacheService } from '../../cache'
import type { RiskResponse } from './types'

/**
 * Extract risk responses from documents
 */
export async function extractRiskResponses(
  context: ExtractionContext,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<ExtractionResult<RiskResponse>> {
  const startTime = Date.now()
  let cacheHit = false
  let totalExtracted = 0
  let afterDeduplication = 0
  let afterSourceResolution = 0
  let rejectedCount = 0

  try {
    logger.info('[EXTRACTION-RISK-RESPONSES] Starting extraction', {
      projectId: context.projectId,
      documentCount: context.documents.length
    })

    // Check cache
    const cached = await extractionCacheService.get(
      context.projectId,
      context.documentContext,
      'risk_responses',
      context.provider,
      context.model
    )

    if (cached && cached.length > 0) {
      logger.info(`[EXTRACTION-RISK-RESPONSES] ✅ Using cached result (${cached.length} entities)`)
      cacheHit = true
      
      // Resolve source documents for cached entities
      const validResponses: RiskResponse[] = []
      cached.forEach((response: any) => {
        const resolution = resolveSourceDocumentIdStrict(
          response,
          context,
          'RISK-RESPONSES',
          response.risk_title || 'Unnamed Risk Response'
        )
        
        if (resolution.resolved) {
          validResponses.push(response as RiskResponse)
        } else {
          rejectedCount++
        }
      })

      afterSourceResolution = validResponses.length

      return {
        entities: validResponses,
        rejectedCount,
        skippedCount: 0,
        stats: {
          totalExtracted: cached.length,
          afterDeduplication: cached.length,
          afterSourceResolution: validResponses.length,
          finalCount: validResponses.length,
          cacheHit: true,
          durationMs: Date.now() - startTime,
          provider: context.provider,
          model: context.model
        }
      }
    }

    // Cache miss - perform AI extraction
    logger.info(`[EXTRACTION-RISK-RESPONSES] ❌ Cache miss, calling AI...`, {
      provider: context.provider,
      model: context.model,
      documentCount: context.documents.length
    })

    // Build prompt
    const jsonStructure = `{
  "risk_responses": [
    {
      "risk_title": "Name of the risk being addressed",
      "response_date": "YYYY-MM-DD or null",
      "action_taken": "Markdown summary of response actions",
      "effectiveness": "effective|partially_effective|ineffective",
      "cost_of_response": number or null,
      "residual_risk_level": "very_high|high|medium|low|very_low",
      "owner": "Person or role responsible",
      "notes": "Additional context or null",
      "source_document": "EXACT document title from AVAILABLE DOCUMENTS list above"
    }
  ]
}`

    const requirements = [
      'Include both preventative and corrective actions',
      'Use null for numeric values that are not given',
      'Map qualitative assessments (e.g., "moderate") to the nearest enum'
    ]

    const prompt = buildExtractionPrompt(
      context,
      'risk_responses',
      'risk response actions',
      jsonStructure,
      requirements
    )

    // Call AI
    const response = await aiService.generate({
      prompt,
      provider: context.provider,
      model: context.model,
      temperature: options.temperature ?? 0.25,
      max_tokens: options.maxTokens ?? 8000
    })

    // Parse response
    const parsed = parseAIResponse(response.content)
    const rawResponses = parsed.risk_responses || []
    totalExtracted = rawResponses.length

    // Normalize and clean entities
    const responses: RiskResponse[] = rawResponses.map((item: any) => ({
      ...item,
      cost_of_response: coerceNumber(item?.cost_of_response)
    }))

    afterDeduplication = responses.length

    // Resolve source_document_id for each risk response (STRICT: reject if missing)
    const validResponses: RiskResponse[] = []
    
    responses.forEach((response) => {
      const resolution = resolveSourceDocumentIdStrict(
        response,
        context,
        'RISK-RESPONSES',
        response.risk_title || 'Unnamed Risk Response'
      )
      
      if (resolution.resolved) {
        validResponses.push(response)
      } else {
        rejectedCount++
      }
    })

    afterSourceResolution = validResponses.length

    if (rejectedCount > 0) {
      logger.warn(`[EXTRACTION-RISK-RESPONSES] REJECTED ${rejectedCount} risk responses without valid source_document_id (out of ${responses.length} total)`)
    }
    
    logger.info(`[EXTRACTION-RISK-RESPONSES] Extracted ${validResponses.length} risk responses with valid source_document_id (${rejectedCount} rejected)`)

    // Cache the result
    if (validResponses.length > 0) {
      await extractionCacheService.set(
        context.projectId,
        context.documentContext,
        'risk_responses',
        validResponses,
        context.provider,
        context.model
      )
    }

    return {
      entities: validResponses,
      rejectedCount,
      skippedCount: 0,
      stats: {
        totalExtracted,
        afterDeduplication,
        afterSourceResolution,
        finalCount: validResponses.length,
        cacheHit: false,
        durationMs: Date.now() - startTime,
        provider: context.provider,
        model: context.model
      }
    }
  } catch (error: unknown) {
    logger.error('[EXTRACTION-RISK-RESPONSES] Extraction failed', {
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

