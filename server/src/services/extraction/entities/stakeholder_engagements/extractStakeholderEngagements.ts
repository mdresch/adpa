/**
 * Extract Stakeholder Engagements
 */

import { logger } from '../../../../utils/logger'
import { aiService } from '../../../aiService'
import type { ExtractionContext } from '../../base/ExtractionContext'
import type { ExtractionResult } from '../../base/ExtractionResult'
import { parseAIResponse } from '../../base/Parser'
import { buildExtractionPrompt } from '../../base/PromptBuilder'
import { resolveSourceDocumentIdStrict } from '../../base/SourceDocumentResolver'
import { extractionCacheService } from '../../cache'
import type { StakeholderEngagement } from './types'

export async function extractStakeholderEngagements(
    context: ExtractionContext,
    options: { temperature?: number; maxTokens?: number } = {}
): Promise<ExtractionResult<StakeholderEngagement>> {
    const startTime = Date.now()
    let cacheHit = false
    let rejectedCount = 0

    try {
        logger.info('[EXTRACTION-STAKEHOLDER-ENGAGEMENTS] Starting extraction', {
            projectId: context.projectId,
            documentCount: context.documents.length
        })

        // Check cache
        const cached = await extractionCacheService.get(
            context.projectId,
            context.documentContext,
            'stakeholder_engagements',
            context.provider,
            context.model
        )

        if (cached && cached.length > 0) {
            logger.info(`[EXTRACTION-STAKEHOLDER-ENGAGEMENTS] ✅ Using cached result (${cached.length} entities)`)
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
  "stakeholder_engagements": [
    {
      "stakeholder_name": "Name of stakeholder",
      "engagement_type": "Workshop|Interview|Presentation|Other",
      "engagement_date": "YYYY-MM-DD",
      "objective": "Goal of engagement",
      "outcome": "Summary of what happened",
      "feedback": "Key input from stakeholder",
      "source_document": "EXACT document title from available list"
    }
  ]
}`

        const requirements = [
            'Extract details of interactions with stakeholders',
            'Identify the type of engagement and the objective',
            'Capture key outcomes and feedback provided',
            'Must map to a source document'
        ]

        const prompt = buildExtractionPrompt(
            context,
            'stakeholder_engagements',
            'stakeholder_engagements',
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
        const rawEntities = parsed.stakeholder_engagements || []

        // Post-processing and source resolution
        const validEntities: StakeholderEngagement[] = []

        rawEntities.forEach((entity: any) => {
            const resolution = resolveSourceDocumentIdStrict(
                entity,
                context,
                'STAKEHOLDER_ENGAGEMENTS',
                entity.stakeholder_name || 'Stakeholder Engagement'
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
                'stakeholder_engagements',
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
        logger.error('[EXTRACTION-STAKEHOLDER-ENGAGEMENTS] Extraction failed', {
            projectId: context.projectId,
            error: error instanceof Error ? error.message : String(error)
        })
        throw error
    }
}
