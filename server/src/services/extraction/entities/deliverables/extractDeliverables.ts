/**
 * Extract Deliverables
 * 
 * Extracts deliverables from project documents.
 * Deliverables include documents, software, hardware, services, and reports.
 */

import { logger } from '../../../../utils/logger'
import { aiService } from '../../../aiService'
import type { ExtractionContext } from '../../base/ExtractionContext'
import type { ExtractionResult } from '../../base/ExtractionResult'
import { parseAIResponse } from '../../base/Parser'
import { buildExtractionPrompt } from '../../base/PromptBuilder'
import { resolveSourceDocumentIdStrict } from '../../base/SourceDocumentResolver'
import { extractionCacheService } from '../../cache'
import type { Deliverable } from './types'

/**
 * Extract deliverables from documents
 */
export async function extractDeliverables(
  context: ExtractionContext,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<ExtractionResult<Deliverable>> {
  const startTime = Date.now()
  let cacheHit = false
  let totalExtracted = 0
  let afterDeduplication = 0
  let afterSourceResolution = 0
  let rejectedCount = 0

  try {
    logger.info('[EXTRACTION-DELIVERABLES] Starting extraction', {
      projectId: context.projectId,
      documentCount: context.documents.length
    })

    // Check cache
    const cached = await extractionCacheService.get(
      context.projectId,
      context.documentContext,
      'deliverables',
      context.provider,
      context.model
    )

    if (cached && cached.length > 0) {
      logger.info(`[EXTRACTION-DELIVERABLES] ✅ Using cached result (${cached.length} entities)`)
      cacheHit = true
      
      // Resolve source documents for cached entities
      const validDeliverables: Deliverable[] = []
      cached.forEach((deliverable: any) => {
        const resolution = resolveSourceDocumentIdStrict(
          deliverable,
          context,
          'DELIVERABLES',
          deliverable.name || 'Unnamed Deliverable'
        )
        
        if (resolution.resolved) {
          validDeliverables.push(deliverable as Deliverable)
        } else {
          rejectedCount++
        }
      })

      afterSourceResolution = validDeliverables.length

      return {
        entities: validDeliverables,
        rejectedCount,
        skippedCount: 0,
        stats: {
          totalExtracted: cached.length,
          afterDeduplication: cached.length,
          afterSourceResolution: validDeliverables.length,
          finalCount: validDeliverables.length,
          cacheHit: true,
          durationMs: Date.now() - startTime,
          provider: context.provider,
          model: context.model
        }
      }
    }

    // Cache miss - perform AI extraction
    logger.info(`[EXTRACTION-DELIVERABLES] ❌ Cache miss, calling AI...`, {
      provider: context.provider,
      model: context.model,
      documentCount: context.documents.length
    })

    // Build prompt
    const jsonStructure = `{
  "deliverables": [
    {
      "name": "Deliverable Name",
      "description": "What this deliverable is",
      "type": "document|software|hardware|service|report|other",
      "due_date": "YYYY-MM-DD or relative date",
      "status": "planned|in_progress|completed|delayed|cancelled",
      "owner": "Who is responsible",
      "acceptance_criteria": "How we know it's done",
      "phase": "Which phase it belongs to",
      "source_document": "EXACT document title from AVAILABLE DOCUMENTS list above"
    }
  ]
}`

    const requirements = [
      'Include ALL deliverables mentioned (documents, software, reports, etc.)',
      'Include interim deliverables and final deliverables',
      'Extract due dates if mentioned',
      'Extract ownership if mentioned',
      'Associate with project phases if mentioned',
      'Infer status from context'
    ]

    const prompt = buildExtractionPrompt(
      context,
      'deliverables',
      'deliverables',
      jsonStructure,
      requirements
    )

    // Call AI with fallback - use 10000 max_tokens for large deliverables extractions
    const response = await aiService.generateWithFallback({
      prompt,
      provider: context.provider,
      model: context.model,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 10000 // Increased from 2500 to handle very large deliverables extractions
    }, ['openai', 'google', 'anthropic', 'mistral', 'groq'])

    // Parse response
    const parsed = parseAIResponse(response.content)
    const rawDeliverables = parsed.deliverables || []
    totalExtracted = rawDeliverables.length

    // Deduplicate within batch
    const deduplicatedDeliverables = deduplicateDeliverablesBatch(rawDeliverables)
    afterDeduplication = deduplicatedDeliverables.length

    // Resolve source_document_id for each deliverable (STRICT: reject if missing)
    const validDeliverables: Deliverable[] = []
    
    deduplicatedDeliverables.forEach((deliverable) => {
      const resolution = resolveSourceDocumentIdStrict(
        deliverable,
        context,
        'DELIVERABLES',
        deliverable.name || 'Unnamed Deliverable'
      )
      
      if (resolution.resolved) {
        validDeliverables.push(deliverable)
      } else {
        rejectedCount++
      }
    })

    afterSourceResolution = validDeliverables.length

    if (rejectedCount > 0) {
      logger.warn(`[EXTRACTION-DELIVERABLES] REJECTED ${rejectedCount} deliverables without valid source_document_id (out of ${deduplicatedDeliverables.length} total)`)
    }
    
    logger.info(`[EXTRACTION-DELIVERABLES] Extracted ${validDeliverables.length} deliverables with valid source_document_id (${rejectedCount} rejected)`)

    // Cache the result
    if (validDeliverables.length > 0) {
      await extractionCacheService.set(
        context.projectId,
        context.documentContext,
        'deliverables',
        validDeliverables,
        context.provider,
        context.model
      )
    }

    return {
      entities: validDeliverables,
      rejectedCount,
      skippedCount: 0,
      stats: {
        totalExtracted,
        afterDeduplication,
        afterSourceResolution,
        finalCount: validDeliverables.length,
        cacheHit: false,
        durationMs: Date.now() - startTime,
        provider: context.provider,
        model: context.model
      }
    }
  } catch (error: unknown) {
    logger.error('[EXTRACTION-DELIVERABLES] Extraction failed', {
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
 * Deduplicate deliverables within the extracted batch only
 */
function deduplicateDeliverablesBatch(deliverables: Deliverable[]): Deliverable[] {
  const deduplicatedMap = new Map<string, Deliverable>()
  
  deliverables.forEach(deliverable => {
    const normalizedName = deliverable.name.trim().toLowerCase()
    
    if (!deduplicatedMap.has(normalizedName)) {
      deduplicatedMap.set(normalizedName, deliverable)
    } else {
      // Duplicate found - merge details (keep most detailed version)
      const existing = deduplicatedMap.get(normalizedName)!
      const merged: Deliverable = {
        ...existing,
        description: deliverable.description || existing.description,
        type: deliverable.type || existing.type,
        due_date: deliverable.due_date || existing.due_date,
        status: deliverable.status || existing.status,
        owner: deliverable.owner || existing.owner,
        acceptance_criteria: deliverable.acceptance_criteria || existing.acceptance_criteria,
        phase: deliverable.phase || existing.phase
      }
      deduplicatedMap.set(normalizedName, merged)
      logger.debug(`[EXTRACTION-DELIVERABLES] Merged duplicate deliverable: "${deliverable.name}"`)
    }
  })
  
  return Array.from(deduplicatedMap.values())
}

