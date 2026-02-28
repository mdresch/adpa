/**
 * Extract Financial Variances
 */

import { logger } from '../../../../utils/logger'
import { aiService } from '../../../aiService'
import type { ExtractionContext } from '../../base/ExtractionContext'
import type { ExtractionResult } from '../../base/ExtractionResult'
import { parseAIResponse, coerceNumber } from '../../base/Parser'
import { buildExtractionPrompt } from '../../base/PromptBuilder'
import { resolveSourceDocumentIdStrict } from '../../base/SourceDocumentResolver'
import { extractionCacheService } from '../../cache'
import type { FinancialVariance } from './types'
import { normalizeDate } from '../../base/Persistence'

export async function extractFinancialVariances(
    context: ExtractionContext,
    options: { temperature?: number; maxTokens?: number } = {}
): Promise<ExtractionResult<FinancialVariance>> {
    const startTime = Date.now()
    let cacheHit = false
    let rejectedCount = 0

    try {
        logger.info('[EXTRACTION-FINANCIAL-VARIANCE] Starting extraction', {
            projectId: context.projectId,
            documentCount: context.documents.length
        })

        // Check cache
        const cached = await extractionCacheService.get(
            context.projectId,
            context.documentContext,
            'financial_variances',
            context.provider,
            context.model
        )

        if (cached && cached.length > 0) {
            logger.info(`[EXTRACTION-FINANCIAL-VARIANCE] ✅ Using cached result (${cached.length} entities)`)
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
                    model: context.model
                }
            }
        }

        // Cache miss - perform AI extraction
        const jsonStructure = `{
  "financial_variances": [
    {
      "report_date": "YYYY-MM-DD",
      "cv_value": -5000,
      "cpi_value": 0.92,
      "eac_value": 265000,
      "etc_value": 15000,
      "variance_explanation": "Higher hardware costs than anticipated",
      "corrective_actions": "Negotiate with alternative vendors",
      "source_document": "EXACT document title from available list"
    }
  ]
}`

        const requirements = [
            'Extract financial performance and cost variances',
            'Identify CV (Cost Variance) and CPI (Cost Performance Index) values',
            'Identify EAC (Estimate at Completion) and ETC (Estimate to Complete) values',
            'Capture explanations for variances and planned corrective actions',
            'Identify the report or measurement date',
            'Must map to a source document'
        ]

        const prompt = buildExtractionPrompt(
            context,
            'financial_variances',
            'financial_variances',
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
        const rawEntities = parsed.financial_variances || []

        // Post-processing and source resolution
        const validEntities: FinancialVariance[] = []

        rawEntities.forEach((entity: any) => {
            entity.report_date = normalizeDate(entity.report_date) || undefined
            entity.cv_value = coerceNumber(entity.cv_value) ?? undefined
            entity.cpi_value = coerceNumber(entity.cpi_value) ?? undefined
            entity.eac_value = coerceNumber(entity.eac_value) ?? undefined
            entity.etc_value = coerceNumber(entity.etc_value) ?? undefined

            const resolution = resolveSourceDocumentIdStrict(
                entity,
                context,
                'FINANCIAL_VARIANCES',
                'Financial Variance'
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
                'financial_variances',
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
        logger.error('[EXTRACTION-FINANCIAL-VARIANCE] Extraction failed', {
            projectId: context.projectId,
            error: error instanceof Error ? error.message : String(error)
        })
        throw error
    }
}
