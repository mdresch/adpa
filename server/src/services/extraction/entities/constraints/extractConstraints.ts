/**
 * Extract Constraints
 * 
 * Extracts constraints from project documents.
 * Constraints include budget, timeline, resource, technical, and regulatory constraints.
 */

import { logger } from '../../../../utils/logger'
import { aiService } from '../../../aiService'
import type { ExtractionContext } from '../../base/ExtractionContext'
import type { ExtractionResult } from '../../base/ExtractionResult'
import { parseAIResponse } from '../../base/Parser'
import { buildExtractionPrompt } from '../../base/PromptBuilder'
import { resolveSourceDocumentIdStrict } from '../../base/SourceDocumentResolver'
import { extractionCacheService } from '../../cache'
import type { Constraint } from './types'

/**
 * Extract constraints from documents
 */
export async function extractConstraints(
  context: ExtractionContext,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<ExtractionResult<Constraint>> {
  const startTime = Date.now()
  let cacheHit = false
  let totalExtracted = 0
  let afterDeduplication = 0
  let afterSourceResolution = 0
  let rejectedCount = 0

  try {
    logger.info('[EXTRACTION-CONSTRAINTS] Starting extraction', {
      projectId: context.projectId,
      documentCount: context.documents.length
    })

    // Check cache
    const cached = await extractionCacheService.get(
      context.projectId,
      context.documentContext,
      'constraints',
      context.provider,
      context.model
    )

    if (cached && cached.length > 0) {
      logger.info(`[EXTRACTION-CONSTRAINTS] ✅ Using cached result (${cached.length} entities)`)
      cacheHit = true
      
      // Resolve source documents for cached entities
      const validConstraints: Constraint[] = []
      cached.forEach((constraint: any) => {
        const resolution = resolveSourceDocumentIdStrict(
          constraint,
          context,
          'CONSTRAINTS',
          constraint.title || 'Unnamed Constraint'
        )
        
        if (resolution.resolved) {
          validConstraints.push(constraint as Constraint)
        } else {
          rejectedCount++
        }
      })

      afterSourceResolution = validConstraints.length

      return {
        entities: validConstraints,
        rejectedCount,
        skippedCount: 0,
        stats: {
          totalExtracted: cached.length,
          afterDeduplication: cached.length,
          afterSourceResolution: validConstraints.length,
          finalCount: validConstraints.length,
          cacheHit: true,
          durationMs: Date.now() - startTime,
          provider: context.provider,
          model: context.model
        }
      }
    }

    // Cache miss - perform AI extraction
    logger.info(`[EXTRACTION-CONSTRAINTS] ❌ Cache miss, calling AI...`, {
      provider: context.provider,
      model: context.model,
      documentCount: context.documents.length
    })

    // Build prompt
    const jsonStructure = `{
  "constraints": [
    {
      "title": "Constraint Title",
      "description": "Detailed description",
      "type": "scope|time|cost|quality|resource|technical|regulatory",
      "severity": "high|medium|low",
      "impact_area": "Which area of the project is affected",
      "source_document": "EXACT document title from AVAILABLE DOCUMENTS list above"
    }
  ]
}`

    const requirements = [
      'Include budget constraints, timeline constraints, resource constraints',
      'Include technical constraints (technology, platform, integration)',
      'Include regulatory/compliance constraints',
      'Include scope constraints (what\'s out of scope)',
      'Assess severity based on impact to project'
    ]

    const prompt = buildExtractionPrompt(
      context,
      'constraints',
      'constraints',
      jsonStructure,
      requirements
    )

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
    const rawConstraints = parsed.constraints || []
    totalExtracted = rawConstraints.length

    // Deduplicate within batch
    const deduplicatedConstraints = deduplicateConstraintsBatch(rawConstraints)
    afterDeduplication = deduplicatedConstraints.length

    // Resolve source_document_id for each constraint (STRICT: reject if missing)
    const validConstraints: Constraint[] = []
    
    deduplicatedConstraints.forEach((constraint) => {
      const resolution = resolveSourceDocumentIdStrict(
        constraint,
        context,
        'CONSTRAINTS',
        constraint.title || 'Unnamed Constraint'
      )
      
      if (resolution.resolved) {
        validConstraints.push(constraint)
      } else {
        rejectedCount++
      }
    })

    afterSourceResolution = validConstraints.length

    if (rejectedCount > 0) {
      logger.warn(`[EXTRACTION-CONSTRAINTS] REJECTED ${rejectedCount} constraints without valid source_document_id (out of ${deduplicatedConstraints.length} total)`)
    }
    
    logger.info(`[EXTRACTION-CONSTRAINTS] Extracted ${validConstraints.length} constraints with valid source_document_id (${rejectedCount} rejected)`)

    // Cache the result
    if (validConstraints.length > 0) {
      await extractionCacheService.set(
        context.projectId,
        context.documentContext,
        'constraints',
        validConstraints,
        context.provider,
        context.model
      )
    }

    return {
      entities: validConstraints,
      rejectedCount,
      skippedCount: 0,
      stats: {
        totalExtracted,
        afterDeduplication,
        afterSourceResolution,
        finalCount: validConstraints.length,
        cacheHit: false,
        durationMs: Date.now() - startTime,
        provider: context.provider,
        model: context.model
      }
    }
  } catch (error: unknown) {
    logger.error('[EXTRACTION-CONSTRAINTS] Extraction failed', {
      projectId: context.projectId,
      error: error instanceof Error ? error.message : String(error)
    })
    
    return {
      entities: [],
      rejectedCount: 0,
      skippedCount: 0,
      stats: {
        totalExtracted: 0,
        afterDeduplication: 0,
        afterSourceResolution: 0,
        finalCount: 0,
        cacheHit,
        durationMs: Date.now() - startTime,
        provider: context.provider,
        model: context.model
      }
    }
  }
}

/**
 * Deduplicate constraints within the extracted batch only
 */
function deduplicateConstraintsBatch(constraints: Constraint[]): Constraint[] {
  const deduplicatedMap = new Map<string, Constraint>()
  
  constraints.forEach(constraint => {
    const normalizedTitle = constraint.title.trim().toLowerCase()
    
    if (!deduplicatedMap.has(normalizedTitle)) {
      deduplicatedMap.set(normalizedTitle, constraint)
    } else {
      // Duplicate found - merge details (keep most detailed version)
      const existing = deduplicatedMap.get(normalizedTitle)!
      const merged: Constraint = {
        ...existing,
        description: constraint.description || existing.description,
        type: constraint.type || existing.type,
        severity: constraint.severity || existing.severity,
        impact_area: constraint.impact_area || existing.impact_area
      }
      deduplicatedMap.set(normalizedTitle, merged)
      logger.debug(`[EXTRACTION-CONSTRAINTS] Merged duplicate constraint: "${constraint.title}"`)
    }
  })
  
  return Array.from(deduplicatedMap.values())
}

