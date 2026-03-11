/**
 * Extract Cost Estimates
 */

import { logger } from '../../../../utils/logger'
import { aiService } from '../../../aiService'
import type { ExtractionContext } from '../../base/ExtractionContext'
import type { ExtractionResult } from '../../base/ExtractionResult'
import { parseAIResponse } from '../../base/Parser'
import { buildExtractionPrompt } from '../../base/PromptBuilder'
import { resolveSourceDocumentIdStrict } from '../../base/SourceDocumentResolver'
import { extractionCacheService } from '../../cache'
import type { CostEstimate } from './types'

export async function extractCostEstimates(
    context: ExtractionContext,
    options: { temperature?: number; maxTokens?: number } = {}
): Promise<ExtractionResult<CostEstimate>> {
    const startTime = Date.now()
    let cacheHit = false
    let rejectedCount = 0

    try {
        logger.info('[EXTRACTION-COST-ESTIMATES] Starting extraction', {
            projectId: context.projectId,
            correlationId: context.correlationId,
            documentCount: context.documents.length
        })

        // Check cache
        const cached = await extractionCacheService.get(
            context.projectId,
            context.documentContext,
            'cost_estimates',
            context.provider,
            context.model,
            context.correlationId
        )

        if (cached && cached.length > 0) {
            logger.info(`[EXTRACTION-COST-ESTIMATES] ✅ Using cached result (${cached.length} entities)`)
            cacheHit = true
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
                    model: context.model,
                    correlationId: context.correlationId
                }
            }
        }

        // Cache miss - perform AI extraction
        const jsonStructure = `{
  "cost_estimates": [
    {
      "item_name": "Senior Developer Role",
      "wbs_code": "1.2.1",
      "estimated_cost": 45000,
      "basis_of_estimate": "Based on market hourly rates for 6 months",
      "contingency_buffer": 5000,
      "confidence_level": "High|Medium|Low",
      "source_document": "EXACT document title from available list"
    }
  ]
}`

        const requirements = [
            'Extract detailed cost estimation items',
            'Identify the item name, WBS code, and estimated cost',
            'Capture the basis of the estimate (how it was calculated)',
            'Identify any contingency buffers or confidence levels',
            'Must map to a source document'
        ]

        const prompt = buildExtractionPrompt(
            context,
            'cost_estimates',
            'cost_estimates',
            jsonStructure,
            requirements
        )

        const response = await aiService.generateWithFallback({
            prompt,
            provider: context.provider,
            model: context.model,
            temperature: options.temperature ?? 0.1,
            max_tokens: options.maxTokens ?? 4000
        }, ['openai', 'google', 'anthropic'])

        const parsed = parseAIResponse(response.content)
        const rawEntities = parsed.cost_estimates || []

        // Post-processing and source resolution
        const validEntities: CostEstimate[] = []

        rawEntities.forEach((entity: any) => {
            const resolution = resolveSourceDocumentIdStrict(
                entity,
                context,
                'COST_ESTIMATES',
                entity.item_name || 'Cost Estimate'
            )

            if (resolution.resolved) {
                entity.source_document_id = resolution.documentId
                validEntities.push(entity)
            } else {
                rejectedCount++
            }
        })

        // Cache result
        if (validEntities.length > 0) {
            await extractionCacheService.set(
                context.projectId,
                context.documentContext,
                'cost_estimates',
                validEntities,
                context.provider,
                context.model,
                context.correlationId
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
                model: context.model,
                correlationId: context.correlationId
            }
        }
    } catch (error: unknown) {
        logger.error('[EXTRACTION-COST-ESTIMATES] Extraction failed', {
            projectId: context.projectId,
            correlationId: context.correlationId,
            error: error instanceof Error ? error.message : String(error)
        })
        throw error
    }
}
