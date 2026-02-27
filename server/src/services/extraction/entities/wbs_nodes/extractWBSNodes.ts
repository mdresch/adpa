/**
 * Extract WBS Nodes
 */

import { logger } from '../../../../utils/logger'
import { aiService } from '../../../aiService'
import type { ExtractionContext } from '../../base/ExtractionContext'
import type { ExtractionResult } from '../../base/ExtractionResult'
import { parseAIResponse } from '../../base/Parser'
import { buildExtractionPrompt } from '../../base/PromptBuilder'
import { resolveSourceDocumentIdStrict } from '../../base/SourceDocumentResolver'
import { extractionCacheService } from '../../cache'
import type { WBSNode } from './types'

export async function extractWBSNodes(
    context: ExtractionContext,
    options: { temperature?: number; maxTokens?: number } = {}
): Promise<ExtractionResult<WBSNode>> {
    const startTime = Date.now()
    let cacheHit = false
    let rejectedCount = 0

    try {
        logger.info('[EXTRACTION-WBS-NODES] Starting extraction', {
            projectId: context.projectId,
            documentCount: context.documents.length
        })

        // Check cache
        const cached = await extractionCacheService.get(
            context.projectId,
            context.documentContext,
            'wbs_nodes',
            context.provider,
            context.model
        )

        if (cached && cached.length > 0) {
            logger.info(`[EXTRACTION-WBS-NODES] ✅ Using cached result (${cached.length} entities)`)
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
  "wbs_nodes": [
    {
      "wbs_code": "1.1",
      "name": "Phase Name or Work Package",
      "level": 2,
      "parent_code": "1.0",
      "description": "Details of the work",
      "owner": "Responsible person/role",
      "status": "Not Started|In Progress|Completed",
      "estimated_effort": 40,
      "estimated_cost": 5000,
      "source_document": "EXACT document title from available list"
    }
  ]
}`

        const requirements = [
            'Extract items from the Work Breakdown Structure (WBS)',
            'Identify codes (e.g., 1.1, 1.2.1) and titles',
            'Capture the level in the hierarchy and the parent code if available',
            'Identify the owner, status, and any estimates associated with the node',
            'Must map to a source document'
        ]

        const prompt = buildExtractionPrompt(
            context,
            'wbs_nodes',
            'wbs_nodes',
            jsonStructure,
            requirements
        )

        const response = await aiService.generateWithFallback({
            prompt,
            provider: context.provider,
            model: context.model,
            temperature: options.temperature ?? 0.1,
            max_tokens: options.maxTokens ?? 4000
        }, ['google', 'mistral', 'openai', 'anthropic', 'xai', 'ollama'])

        const parsed = parseAIResponse(response.content)
        const rawEntities = parsed.wbs_nodes || []

        // Post-processing and source resolution
        const validEntities: WBSNode[] = []

        rawEntities.forEach((entity: any) => {
            const resolution = resolveSourceDocumentIdStrict(
                entity,
                context,
                'WBS_NODES',
                entity.name || 'WBS Node'
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
                'wbs_nodes',
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
        logger.error('[EXTRACTION-WBS-NODES] Extraction failed', {
            projectId: context.projectId,
            error: error instanceof Error ? error.message : String(error)
        })
        throw error
    }
}
