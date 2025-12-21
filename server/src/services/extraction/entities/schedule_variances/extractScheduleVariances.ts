/**
 * Extract Schedule Variances
 */

import { logger } from '../../../../utils/logger'
import { aiService } from '../../../aiService'
import type { ExtractionContext } from '../../base/ExtractionContext'
import type { ExtractionResult } from '../../base/ExtractionResult'
import { parseAIResponse } from '../../base/Parser'
import { buildExtractionPrompt } from '../../base/PromptBuilder'
import { resolveSourceDocumentIdStrict } from '../../base/SourceDocumentResolver'
import { extractionCacheService } from '../../cache'
import type { ScheduleVariance } from './types'

export async function extractScheduleVariances(
    context: ExtractionContext,
    options: { temperature?: number; maxTokens?: number } = {}
): Promise<ExtractionResult<ScheduleVariance>> {
    const startTime = Date.now()
    let cacheHit = false
    let rejectedCount = 0

    try {
        logger.info('[EXTRACTION-SCHEDULE-VARIANCE] Starting extraction', {
            projectId: context.projectId,
            documentCount: context.documents.length
        })

        // Check cache
        const cached = await extractionCacheService.get(
            context.projectId,
            context.documentContext,
            'schedule_variances',
            context.provider,
            context.model
        )

        if (cached && cached.length > 0) {
            logger.info(`[EXTRACTION-SCHEDULE-VARIANCE] ✅ Using cached result (${cached.length} entities)`)
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
  "schedule_variances": [
    {
      "report_date": "YYYY-MM-DD",
      "sv_value": -1500,
      "spi_value": 0.85,
      "variance_explanation": "Delay in equipment delivery",
      "corrective_actions": "Fast-track installation phase",
      "source_document": "EXACT document title from available list"
    }
  ]
}`

        const requirements = [
            'Extract schedule performance metrics and variances',
            'Identify SV (Schedule Variance) and SPI (Schedule Performance Index) values',
            'Capture explanations for variances and planned corrective actions',
            'Identify the report or measurement date',
            'Must map to a source document'
        ]

        const prompt = buildExtractionPrompt(
            context,
            'schedule_variances',
            'schedule_variances',
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
        const rawEntities = parsed.schedule_variances || []

        // Post-processing and source resolution
        const validEntities: ScheduleVariance[] = []

        rawEntities.forEach((entity: any) => {
            const resolution = resolveSourceDocumentIdStrict(
                entity,
                context,
                'SCHEDULE_VARIANCES',
                'Schedule Variance'
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
                'schedule_variances',
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
        logger.error('[EXTRACTION-SCHEDULE-VARIANCE] Extraction failed', {
            projectId: context.projectId,
            error: error instanceof Error ? error.message : String(error)
        })
        throw error
    }
}
