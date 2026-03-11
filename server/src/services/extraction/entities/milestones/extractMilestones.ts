/**
 * Extract Milestones
 * 
 * Extracts project milestones from documents.
 * Milestones are zero-duration checkpoints marking completion of major deliverables or phases.
 */

import { logger } from '../../../../utils/logger'
import { aiService } from '../../../aiService'
import type { ExtractionContext } from '../../base/ExtractionContext'
import type { ExtractionResult } from '../../base/ExtractionResult'
import { parseAIResponse } from '../../base/Parser'
import { buildExtractionPrompt } from '../../base/PromptBuilder'
import { resolveSourceDocumentIdStrict } from '../../base/SourceDocumentResolver'
import { extractionCacheService } from '../../cache'
import type { Milestone } from './types'

/**
 * Extract milestones from documents
 */
export async function extractMilestones(
  context: ExtractionContext,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<ExtractionResult<Milestone>> {
  const startTime = Date.now()
  let cacheHit = false
  let totalExtracted = 0
  let afterDeduplication = 0
  let afterSourceResolution = 0
  let rejectedCount = 0

  try {
    logger.info('[EXTRACTION-MILESTONES] Starting extraction', {
      projectId: context.projectId,
      correlationId: context.correlationId,
      documentCount: context.documents.length
    })

    // Check cache
    const cached = await extractionCacheService.get(
      context.projectId,
      context.documentContext,
      'milestones',
      context.provider,
      context.model,
      context.correlationId
    )

    if (cached && cached.length > 0) {
      logger.info(`[EXTRACTION-MILESTONES] ✅ Using cached result (${cached.length} entities)`)
      cacheHit = true

      // Resolve source documents for cached entities
      const validMilestones: Milestone[] = []
      cached.forEach((milestone: any) => {
        const resolution = resolveSourceDocumentIdStrict(
          milestone,
          context,
          'MILESTONES',
          milestone.name || 'Unnamed Milestone'
        )

        if (resolution.resolved) {
          validMilestones.push(milestone as Milestone)
        } else {
          rejectedCount++
        }
      })

      afterSourceResolution = validMilestones.length

      return {
        entities: validMilestones,
        rejectedCount,
        skippedCount: 0,
        stats: {
          totalExtracted: cached.length,
          afterDeduplication: cached.length,
          afterSourceResolution: validMilestones.length,
          finalCount: validMilestones.length,
          cacheHit: true,
          durationMs: Date.now() - startTime,
          provider: context.provider,
          model: context.model,
          correlationId: context.correlationId
        }
      }
    }

    // Cache miss - perform AI extraction
    logger.info(`[EXTRACTION-MILESTONES] ❌ Cache miss, calling AI...`, {
      projectId: context.projectId,
      correlationId: context.correlationId,
      provider: context.provider,
      model: context.model,
      documentCount: context.documents.length
    })

    // Build prompt with emphasis on milestones vs activities
    const jsonStructure = `{
  "milestones": [
    {
      "name": "Milestone Name",
      "description": "What this milestone represents (major checkpoint or deliverable completion)",
      "due_date": "YYYY-MM-DD or Quarter/Year if specific date not mentioned",
      "status": "pending|in_progress|completed|delayed",
      "deliverables": ["Deliverable 1", "Deliverable 2"],
      "source_document": "EXACT document title from AVAILABLE DOCUMENTS list above"
    }
  ]
}`

    const requirements = [
      'Extract ONLY major project milestones (completion of phases, major deliverables, key decisions, go-live dates)',
      'Examples: "Project Kickoff", "Requirements Approval", "MVP Launch", "UAT Completion", "Go-Live", "Project Closure"',
      'DO NOT extract regular activities, tasks, or work packages',
      'Typical projects have 10-20 milestones maximum',
      'Extract deliverables associated with each milestone',
      'If exact dates aren\'t mentioned, use relative dates like "2025-Q1" or "Month 3"',
      'Infer status from context (future = pending, past = completed)'
    ]

    const basePrompt = buildExtractionPrompt(
      context,
      'milestones',
      'major project milestones',
      jsonStructure,
      requirements
    )

    // Enhance prompt with milestone vs activity distinction
    const prompt = `Analyze the following project documents and extract ONLY major project milestones.

**IMPORTANT: Milestones vs Activities:**
- **MILESTONE** = Zero-duration checkpoint marking completion of a major deliverable or phase (e.g., "MVP Launch", "CSRD Deadline", "Project Kickoff", "Go-Live")
- **ACTIVITY** = Work effort with duration (e.g., "Develop frontend module", "Conduct UAT testing") - DO NOT include activities as milestones
- Limit to 10-20 milestones per project (major checkpoints only)

${basePrompt}`

    // Call AI with fallback
    const response = await aiService.generateWithFallback({
      prompt,
      provider: context.provider,
      model: context.model,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 8000
    }, ['openai', 'google', 'anthropic', 'mistral', 'groq'])

    // Parse response
    const parsed = parseAIResponse(response.content)
    const rawMilestones = parsed.milestones || []
    totalExtracted = rawMilestones.length

    // Deduplicate within batch
    const deduplicatedMilestones = deduplicateMilestonesBatch(rawMilestones)
    afterDeduplication = deduplicatedMilestones.length

    // Resolve source_document_id for each milestone (STRICT: reject if missing)
    const validMilestones: Milestone[] = []

    deduplicatedMilestones.forEach((milestone) => {
      const resolution = resolveSourceDocumentIdStrict(
        milestone,
        context,
        'MILESTONES',
        milestone.name || 'Unnamed Milestone'
      )

      if (resolution.resolved) {
        validMilestones.push(milestone)
      } else {
        rejectedCount++
      }
    })

    afterSourceResolution = validMilestones.length

    if (rejectedCount > 0) {
      logger.warn(`[EXTRACTION-MILESTONES] REJECTED ${rejectedCount} milestones without valid source_document_id (out of ${deduplicatedMilestones.length} total)`, {
        projectId: context.projectId,
        correlationId: context.correlationId
      })
    }

    logger.info(`[EXTRACTION-MILESTONES] Extracted ${validMilestones.length} milestones with valid source_document_id (${rejectedCount} rejected)`, {
      projectId: context.projectId,
      correlationId: context.correlationId
    })

    // Cache the result
    if (validMilestones.length > 0) {
      await extractionCacheService.set(
        context.projectId,
        context.documentContext,
        'milestones',
        validMilestones,
        context.provider,
        context.model,
        context.correlationId
      )
    }

    return {
      entities: validMilestones,
      rejectedCount,
      skippedCount: 0,
      stats: {
        totalExtracted,
        afterDeduplication,
        afterSourceResolution,
        finalCount: validMilestones.length,
        cacheHit: false,
        durationMs: Date.now() - startTime,
        provider: context.provider,
        model: context.model
      }
    }
  } catch (error: unknown) {
    logger.error('[EXTRACTION-MILESTONES] Extraction failed', {
      projectId: context.projectId,
      correlationId: context.correlationId,
      error: error instanceof Error ? error.message : String(error)
    })

    // Re-throw to trigger Orchestrator dead-letter logging and Bull retry
    throw error
  }
}

/**
 * Deduplicate milestones within the extracted batch only
 */
function deduplicateMilestonesBatch(milestones: Milestone[]): Milestone[] {
  const deduplicatedMap = new Map<string, Milestone>()

  milestones.forEach(milestone => {
    const normalizedName = milestone.name.trim().toLowerCase()

    if (!deduplicatedMap.has(normalizedName)) {
      deduplicatedMap.set(normalizedName, milestone)
    } else {
      // Duplicate found - merge details (keep most detailed version)
      const existing = deduplicatedMap.get(normalizedName)!
      const merged: Milestone = {
        ...existing,
        description: milestone.description || existing.description,
        due_date: milestone.due_date || existing.due_date,
        status: milestone.status || existing.status,
        deliverables: milestone.deliverables?.length ? milestone.deliverables : existing.deliverables,
        dependencies: milestone.dependencies?.length ? milestone.dependencies : existing.dependencies
      }
      deduplicatedMap.set(normalizedName, merged)
      logger.debug(`[EXTRACTION-MILESTONES] Merged duplicate milestone: "${milestone.name}"`)
    }
  })

  return Array.from(deduplicatedMap.values())
}

