/**
 * Extract Approval Workflows
 */

import { logger } from '../../../../utils/logger'
import { aiService } from '../../../aiService'
import type { ExtractionContext } from '../../base/ExtractionContext'
import type { ExtractionResult } from '../../base/ExtractionResult'
import { parseAIResponse } from '../../base/Parser'
import { buildExtractionPrompt } from '../../base/PromptBuilder'
import { resolveSourceDocumentIdStrict } from '../../base/SourceDocumentResolver'
import { extractionCacheService } from '../../cache'
import type { ApprovalWorkflow } from './types'

export async function extractApprovalWorkflows(
    context: ExtractionContext,
    options: { temperature?: number; maxTokens?: number } = {}
): Promise<ExtractionResult<ApprovalWorkflow>> {
    const startTime = Date.now()
    let cacheHit = false
    let rejectedCount = 0

    try {
        logger.info('[EXTRACTION-APPROVAL-WORKFLOWS] Starting extraction', {
            projectId: context.projectId,
            documentCount: context.documents.length
        })

        // Check cache
        const cached = await extractionCacheService.get(
            context.projectId,
            context.documentContext,
            'approval_workflows',
            context.provider,
            context.model
        )

        if (cached && cached.length > 0) {
            logger.info(`[EXTRACTION-APPROVAL-WORKFLOWS] ✅ Using cached result (${cached.length} entities)`)
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
  "approval_workflows": [
    {
      "name": "Name of the workflow",
      "description": "What this workflow handles",
      "trigger_condition": "When this workflow starts",
      "approvers": ["Role 1", "Name 1"],
      "sla_hours": 48,
      "status": "Active|Draft|Retired",
      "gates": ["Gate 1", "Gate 2"],
      "source_document": "EXACT document title from available list"
    }
  ]
}`

        const requirements = [
            'Extract formal approval processes or workflows',
            'Identify the triggers and the people/roles responsible for approval',
            'Capture any SLA or time limits mentioned',
            'List the specific gates or stages in the workflow',
            'Must map to a source document'
        ]

        const prompt = buildExtractionPrompt(
            context,
            'approval_workflows',
            'approval_workflows',
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
        const rawEntities = parsed.approval_workflows || []

        // Post-processing and source resolution
        const validEntities: ApprovalWorkflow[] = []

        rawEntities.forEach((entity: any) => {
            const resolution = resolveSourceDocumentIdStrict(
                entity,
                context,
                'APPROVAL_WORKFLOWS',
                entity.name || 'Approval Workflow'
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
                'approval_workflows',
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
        logger.error('[EXTRACTION-APPROVAL-WORKFLOWS] Extraction failed', {
            projectId: context.projectId,
            error: error instanceof Error ? error.message : String(error)
        })
        throw error
    }
}
