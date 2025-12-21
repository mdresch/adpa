/**
 * Extract Project Charter Details
 */

import { logger } from '../../../../utils/logger'
import { aiService } from '../../../aiService'
import type { ExtractionContext } from '../../base/ExtractionContext'
import type { ExtractionResult } from '../../base/ExtractionResult'
import { parseAIResponse } from '../../base/Parser'
import { buildExtractionPrompt } from '../../base/PromptBuilder'
import { resolveSourceDocumentIdStrict } from '../../base/SourceDocumentResolver'
import { extractionCacheService } from '../../cache'
import type { ProjectCharterDetails } from './types'

export async function extractProjectCharterDetails(
    context: ExtractionContext,
    options: { temperature?: number; maxTokens?: number } = {}
): Promise<ExtractionResult<ProjectCharterDetails>> {
    const startTime = Date.now()
    let cacheHit = false
    let rejectedCount = 0

    try {
        logger.info('[EXTRACTION-CHARTER-DETAILS] Starting extraction', {
            projectId: context.projectId,
            documentCount: context.documents.length
        })

        // Check cache
        const cached = await extractionCacheService.get(
            context.projectId,
            context.documentContext,
            'project_charter_details',
            context.provider,
            context.model
        )

        if (cached && cached.length > 0) {
            logger.info(`[EXTRACTION-CHARTER-DETAILS] ✅ Using cached result (${cached.length} entities)`)
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
  "project_charter_details": [
    {
      "project_charter_id": "CH-2024-001",
      "vision": "A world-class database solution",
      "mission": "To provide high-performance data access",
      "project_manager": "Alice Wong",
      "sponsor": "Bob Smith",
      "authority_level": "Full Budgetary Authority",
      "major_milestones": ["Kickoff - Jan 1", "MVP - June 1"],
      "high_level_risks": ["Resource shortage", "Technical complexity"],
      "critical_success_factors": ["Customer adoption", "Uptime > 99.9%"],
      "source_document": "EXACT document title from available list"
    }
  ]
}`

        const requirements = [
            'Extract core project definition elements from the Project Charter',
            'Identify the vision and mission statements',
            'Capture the project manager and sponsor names',
            'Identify the PM authority level',
            'Extract major milestones, high-level risks, and critical success factors as lists',
            'Must map to a source document'
        ]

        const prompt = buildExtractionPrompt(
            context,
            'project_charter_details',
            'project_charter_details',
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
        const rawEntities = parsed.project_charter_details || []

        // Post-processing and source resolution
        const validEntities: ProjectCharterDetails[] = []

        rawEntities.forEach((entity: any) => {
            const resolution = resolveSourceDocumentIdStrict(
                entity,
                context,
                'PROJECT_CHARTER_DETAILS',
                'Project Charter Detail'
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
                'project_charter_details',
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
        logger.error('[EXTRACTION-CHARTER-DETAILS] Extraction failed', {
            projectId: context.projectId,
            error: error instanceof Error ? error.message : String(error)
        })
        throw error
    }
}
