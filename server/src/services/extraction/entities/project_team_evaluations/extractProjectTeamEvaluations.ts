/**
 * Extract Project Team Evaluations
 */

import { logger } from '../../../../utils/logger'
import { aiService } from '../../../aiService'
import type { ExtractionContext } from '../../base/ExtractionContext'
import type { ExtractionResult } from '../../base/ExtractionResult'
import { parseAIResponse } from '../../base/Parser'
import { buildExtractionPrompt } from '../../base/PromptBuilder'
import { resolveSourceDocumentIdStrict } from '../../base/SourceDocumentResolver'
import { extractionCacheService } from '../../cache'
import type { ProjectTeamEvaluation } from './types'

export async function extractProjectTeamEvaluations(
    context: ExtractionContext,
    options: { temperature?: number; maxTokens?: number } = {}
): Promise<ExtractionResult<ProjectTeamEvaluation>> {
    const startTime = Date.now()
    let cacheHit = false
    let rejectedCount = 0

    try {
        logger.info('[EXTRACTION-TEAM-EVALUATIONS] Starting extraction', {
            projectId: context.projectId,
            documentCount: context.documents.length
        })

        // Check cache
        const cached = await extractionCacheService.get(
            context.projectId,
            context.documentContext,
            'project_team_evaluations',
            context.provider,
            context.model
        )

        if (cached && cached.length > 0) {
            logger.info(`[EXTRACTION-TEAM-EVALUATIONS] ✅ Using cached result (${cached.length} entities)`)
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
  "project_team_evaluations": [
    {
      "team_member_name": "John Doe",
      "role": "Lead Developer",
      "evaluation_date": "2024-12-01",
      "performance_rating": 9,
      "strengths": ["Quick problem solver", "Good mentor"],
      "improvement_areas": ["Documentation speed", "Unit test coverage"],
      "source_document": "EXACT document title from available list"
    }
  ]
}`

        const requirements = [
            'Extract details from team performance assessments or evaluations',
            'Capture the team member name and their role during the project',
            'Identify the performance rating (typically 1-10 or 1-5 scale)',
            'Extract strengths and improvement areas as lists',
            'Capture the evaluation date if available',
            'Must map to a source document'
        ]

        const prompt = buildExtractionPrompt(
            context,
            'project_team_evaluations',
            'project_team_evaluations',
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
        const rawEntities = parsed.project_team_evaluations || []

        // Post-processing and source resolution
        const validEntities: ProjectTeamEvaluation[] = []

        rawEntities.forEach((entity: any) => {
            const resolution = resolveSourceDocumentIdStrict(
                entity,
                context,
                'PROJECT_TEAM_EVALUATIONS',
                entity.team_member_name || 'Team Evaluation'
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
                'project_team_evaluations',
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
        logger.error('[EXTRACTION-TEAM-EVALUATIONS] Extraction failed', {
            projectId: context.projectId,
            error: error instanceof Error ? error.message : String(error)
        })
        throw error
    }
}
