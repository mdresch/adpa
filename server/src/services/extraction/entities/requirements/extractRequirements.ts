/**
 * Extract Requirements
 * 
 * Extracts requirements from project documents.
 * Includes functional, non-functional, business, and technical requirements.
 */

import { logger } from '../../../../utils/logger'
import { aiService } from '../../../aiService'
import type { ExtractionContext } from '../../base/ExtractionContext'
import type { ExtractionResult } from '../../base/ExtractionResult'
import { parseAIResponse } from '../../base/Parser'
import { buildExtractionPrompt } from '../../base/PromptBuilder'
import { resolveSourceDocumentIdStrict } from '../../base/SourceDocumentResolver'
import { extractionCacheService } from '../../cache'
import type { Requirement } from './types'

/**
 * Extract requirements from documents
 */
export async function extractRequirements(
  context: ExtractionContext,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<ExtractionResult<Requirement>> {
  const startTime = Date.now()
  let cacheHit = false
  let totalExtracted = 0
  let afterDeduplication = 0
  let afterSourceResolution = 0
  let rejectedCount = 0

  try {
    logger.info('[EXTRACTION-REQUIREMENTS] Starting extraction', {
      projectId: context.projectId,
      correlationId: context.correlationId,
      documentCount: context.documents.length
    })

    // Check cache
    const cached = await extractionCacheService.get(
      context.projectId,
      context.documentContext,
      'requirements',
      context.provider,
      context.model,
      context.correlationId
    )

    if (cached && cached.length > 0) {
      logger.info(`[EXTRACTION-REQUIREMENTS] ✅ Using cached result (${cached.length} entities)`)
      cacheHit = true

      // Resolve source documents for cached entities
      const validRequirements: Requirement[] = []
      cached.forEach((requirement: any) => {
        const resolution = resolveSourceDocumentIdStrict(
          requirement,
          context,
          'REQUIREMENTS',
          requirement.title || requirement.name || 'Unnamed Requirement'
        )

        if (resolution.resolved) {
          validRequirements.push(requirement as Requirement)
        } else {
          rejectedCount++
        }
      })

      afterSourceResolution = validRequirements.length

      return {
        entities: validRequirements,
        rejectedCount,
        skippedCount: 0,
        stats: {
          totalExtracted: cached.length,
          afterDeduplication: cached.length,
          afterSourceResolution: validRequirements.length,
          finalCount: validRequirements.length,
          cacheHit: true,
          durationMs: Date.now() - startTime,
          provider: context.provider,
          model: context.model,
          correlationId: context.correlationId
        }
      }
    }

    // Cache miss - perform AI extraction
    logger.info(`[EXTRACTION-REQUIREMENTS] ❌ Cache miss, calling AI...`, {
      projectId: context.projectId,
      correlationId: context.correlationId,
      provider: context.provider,
      model: context.model,
      documentCount: context.documents.length
    })

    // Build prompt
    const jsonStructure = `{
  "requirements": [
    {
      "title": "Requirement Title",
      "description": "Detailed description",
      "type": "functional|non-functional|business|technical",
      "priority": "critical|high|medium|low",
      "status": "proposed|approved|in_progress|completed",
      "acceptance_criteria": "How to verify this requirement",
      "source_document": "EXACT document title from AVAILABLE DOCUMENTS list above"
    }
  ]
}`

    const requirements = [
      'Include functional requirements (features, capabilities)',
      'Include non-functional requirements (performance, security, usability)',
      'Include business requirements (objectives, constraints)',
      'Include technical requirements (architecture, technology)',
      'Classify each requirement appropriately',
      'Infer priority from context (must-have = critical, should-have = high, etc.)'
    ]

    const prompt = buildExtractionPrompt(
      context,
      'requirements',
      'requirements',
      jsonStructure,
      requirements
    )

    // Call AI with fallback - use 10000 max_tokens for large requirement extractions
    const response = await aiService.generateWithFallback({
      prompt,
      provider: context.provider,
      model: context.model,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 10000 // Increased from 8000 to handle very large requirement extractions
    }, ['openai', 'google', 'anthropic', 'mistral', 'groq'])

    // Parse response
    const parsed = parseAIResponse(response.content)
    const rawRequirements = parsed.requirements || []
    totalExtracted = rawRequirements.length

    // Deduplicate within batch
    const deduplicatedRequirements = deduplicateRequirementsBatch(rawRequirements)
    afterDeduplication = deduplicatedRequirements.length

    // Resolve source_document_id for each requirement (STRICT: reject if missing)
    const validRequirements: Requirement[] = []

    deduplicatedRequirements.forEach((requirement) => {
      const resolution = resolveSourceDocumentIdStrict(
        requirement,
        context,
        'REQUIREMENTS',
        requirement.title || 'Unnamed Requirement'
      )

      if (resolution.resolved) {
        validRequirements.push(requirement)
      } else {
        rejectedCount++
      }
    })

    afterSourceResolution = validRequirements.length

    if (rejectedCount > 0) {
      logger.warn(`[EXTRACTION-REQUIREMENTS] REJECTED ${rejectedCount} requirements without valid source_document_id (out of ${deduplicatedRequirements.length} total)`, {
        projectId: context.projectId,
        correlationId: context.correlationId
      })
    }

    logger.info(`[EXTRACTION-REQUIREMENTS] Extracted ${validRequirements.length} requirements with valid source_document_id (${rejectedCount} rejected)`, {
      projectId: context.projectId,
      correlationId: context.correlationId
    })

    // Cache the result
    if (validRequirements.length > 0) {
      await extractionCacheService.set(
        context.projectId,
        context.documentContext,
        'requirements',
        validRequirements,
        context.provider,
        context.model,
        context.correlationId
      )
    }

    return {
      entities: validRequirements,
      rejectedCount,
      skippedCount: 0,
      stats: {
        totalExtracted,
        afterDeduplication,
        afterSourceResolution,
        finalCount: validRequirements.length,
        cacheHit: false,
        durationMs: Date.now() - startTime,
        provider: context.provider,
        model: context.model,
        correlationId: context.correlationId
      }
    }
  } catch (error: unknown) {
    logger.error('[EXTRACTION-REQUIREMENTS] Extraction failed', {
      projectId: context.projectId,
      correlationId: context.correlationId,
      error: error instanceof Error ? error.message : String(error)
    })

    // Re-throw to trigger Orchestrator dead-letter logging and Bull retry
    throw error
  }
}

/**
 * Deduplicate requirements within the extracted batch only
 */
function deduplicateRequirementsBatch(requirements: Requirement[]): Requirement[] {
  const deduplicatedMap = new Map<string, Requirement>()

  requirements.forEach(req => {
    const normalizedTitle = req.title.trim().toLowerCase()

    if (!deduplicatedMap.has(normalizedTitle)) {
      deduplicatedMap.set(normalizedTitle, req)
    } else {
      // Duplicate found - merge details (keep most detailed version)
      const existing = deduplicatedMap.get(normalizedTitle)!
      const merged: Requirement = {
        ...existing,
        description: req.description || existing.description,
        type: req.type || existing.type,
        priority: req.priority || existing.priority,
        status: req.status || existing.status,
        acceptance_criteria: req.acceptance_criteria || existing.acceptance_criteria,
        source: req.source || existing.source
      }
      deduplicatedMap.set(normalizedTitle, merged)
      logger.debug(`[EXTRACTION-REQUIREMENTS] Merged duplicate requirement: "${req.title}"`)
    }
  })

  return Array.from(deduplicatedMap.values())
}

