/**
 * Extract Communication Logs
 */

import { logger } from '../../../../utils/logger'
import { aiService } from '../../../aiService'
import type { ExtractionContext } from '../../base/ExtractionContext'
import type { ExtractionResult } from '../../base/ExtractionResult'
import { parseAIResponse } from '../../base/Parser'
import { buildExtractionPrompt } from '../../base/PromptBuilder'
import { resolveSourceDocumentIdStrict } from '../../base/SourceDocumentResolver'
import { extractionCacheService } from '../../cache'
import type { CommunicationLog } from './types'

export async function extractCommunicationLogs(
    context: ExtractionContext,
    options: { temperature?: number; maxTokens?: number } = {}
): Promise<ExtractionResult<CommunicationLog>> {
    const startTime = Date.now()
    let cacheHit = false
    let rejectedCount = 0

    try {
        logger.info('[EXTRACTION-COMMUNICATION-LOGS] Starting extraction', {
            projectId: context.projectId,
            documentCount: context.documents.length
        })

        // Check cache
        const cached = await extractionCacheService.get(
            context.projectId,
            context.documentContext,
            'communication_logs',
            context.provider,
            context.model
        )

        if (cached && cached.length > 0) {
            logger.info(`[EXTRACTION-COMMUNICATION-LOGS] ✅ Using cached result (${cached.length} entities)`)
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
  "communication_logs": [
    {
      "sender": "Person who sent the communication",
      "recipient": "Person who received the communication",
      "communication_type": "Email|Call|Memo|Slack|Meeting",
      "communication_date": "YYYY-MM-DD",
      "subject": "Topic or title of the communication",
      "content_summary": "Short summary of the discussion",
      "key_decisions_made": "Specific decisions mentioned in this log",
      "source_document": "EXACT document title from available list"
    }
  ]
}`

        const requirements = [
            'Extract logs of specific communications or messages',
            'Identify the sender, recipient, and the type of communication',
            'Capture the essence of the content and any decisions made',
            'Must map to a source document'
        ]

        const prompt = buildExtractionPrompt(
            context,
            'communication_logs',
            'communication_logs',
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
        const rawEntities = parsed.communication_logs || []

        // Post-processing and source resolution
        const validEntities: CommunicationLog[] = []

        rawEntities.forEach((entity: any) => {
            const resolution = resolveSourceDocumentIdStrict(
                entity,
                context,
                'COMMUNICATION_LOGS',
                entity.subject || 'Communication Log'
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
                'communication_logs',
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
        logger.error('[EXTRACTION-COMMUNICATION-LOGS] Extraction failed', {
            projectId: context.projectId,
            error: error instanceof Error ? error.message : String(error)
        })
        throw error
    }
}
