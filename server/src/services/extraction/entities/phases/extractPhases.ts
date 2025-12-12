/**
 * Extract Phases
 * 
 * Extracts project phases from documents.
 * Phases include Initiation, Planning, Execution, Monitoring, Closing, etc.
 */

import { logger } from '../../../../utils/logger'
import { aiService } from '../../../aiService'
import type { ExtractionContext } from '../../base/ExtractionContext'
import type { ExtractionResult } from '../../base/ExtractionResult'
import { parseAIResponse } from '../../base/Parser'
import { buildExtractionPrompt } from '../../base/PromptBuilder'
import { resolveSourceDocumentIdStrict } from '../../base/SourceDocumentResolver'
import { extractionCacheService } from '../../cache'
import type { Phase } from './types'

/**
 * Extract phases from documents
 */
export async function extractPhases(
  context: ExtractionContext,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<ExtractionResult<Phase>> {
  const startTime = Date.now()
  let cacheHit = false
  let totalExtracted = 0
  let afterDeduplication = 0
  let afterSourceResolution = 0
  let rejectedCount = 0

  try {
    logger.info('[EXTRACTION-PHASES] Starting extraction', {
      projectId: context.projectId,
      documentCount: context.documents.length
    })

    // Check cache
    const cached = await extractionCacheService.get(
      context.projectId,
      context.documentContext,
      'phases',
      context.provider,
      context.model
    )

    if (cached && cached.length > 0) {
      logger.info(`[EXTRACTION-PHASES] ✅ Using cached result (${cached.length} entities)`)
      cacheHit = true
      
      // Resolve source documents for cached entities
      const validPhases: Phase[] = []
      cached.forEach((phase: any) => {
        const resolution = resolveSourceDocumentIdStrict(
          phase,
          context,
          'PHASES',
          phase.name || 'Unnamed Phase'
        )
        
        if (resolution.resolved) {
          validPhases.push(phase as Phase)
        } else {
          rejectedCount++
        }
      })

      afterSourceResolution = validPhases.length

      return {
        entities: validPhases,
        rejectedCount,
        skippedCount: 0,
        stats: {
          totalExtracted: cached.length,
          afterDeduplication: cached.length,
          afterSourceResolution: validPhases.length,
          finalCount: validPhases.length,
          cacheHit: true,
          durationMs: Date.now() - startTime,
          provider: context.provider,
          model: context.model
        }
      }
    }

    // Cache miss - perform AI extraction
    logger.info(`[EXTRACTION-PHASES] ❌ Cache miss, calling AI...`, {
      provider: context.provider,
      model: context.model,
      documentCount: context.documents.length
    })

    // Build prompt
    const jsonStructure = `{
  "phases": [
    {
      "name": "Phase Name",
      "description": "What happens in this phase",
      "start_date": "YYYY-MM-DD or relative date",
      "end_date": "YYYY-MM-DD or relative date",
      "status": "planned|active|completed|on_hold",
      "deliverables": ["Deliverable 1", "Deliverable 2"],
      "key_activities": ["Activity 1", "Activity 2"],
      "source_document": "EXACT document title from AVAILABLE DOCUMENTS list above"
    }
  ]
}`

    const requirements = [
      'Include ALL phases mentioned (Initiation, Planning, Execution, Monitoring, Closing, etc.)',
      'Extract deliverables for each phase',
      'Extract key activities',
      'Infer status from context'
    ]

    const prompt = buildExtractionPrompt(
      context,
      'project phases',
      'phases',
      jsonStructure,
      requirements
    )

    // Call AI with fallback - use 8000 max_tokens for large phase extractions
    const response = await aiService.generateWithFallback({
      prompt,
      provider: context.provider,
      model: context.model,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 8000 // Increased from 1500 to handle large documents with many phases
    }, ['openai', 'google', 'anthropic', 'mistral', 'groq'])

    // Parse response
    const parsed = parseAIResponse(response.content)
    const rawPhases = parsed.phases || []
    totalExtracted = rawPhases.length

    // Deduplicate within batch
    const deduplicatedPhases = deduplicatePhasesBatch(rawPhases)
    afterDeduplication = deduplicatedPhases.length

    // Resolve source_document_id for each phase (STRICT: reject if missing)
    const validPhases: Phase[] = []
    
    deduplicatedPhases.forEach((phase) => {
      const resolution = resolveSourceDocumentIdStrict(
        phase,
        context,
        'PHASES',
        phase.name || 'Unnamed Phase'
      )
      
      if (resolution.resolved) {
        validPhases.push(phase)
      } else {
        rejectedCount++
      }
    })

    afterSourceResolution = validPhases.length

    if (rejectedCount > 0) {
      logger.warn(`[EXTRACTION-PHASES] REJECTED ${rejectedCount} phases without valid source_document_id (out of ${deduplicatedPhases.length} total)`)
    }
    
    logger.info(`[EXTRACTION-PHASES] Extracted ${validPhases.length} phases with valid source_document_id (${rejectedCount} rejected)`)

    // Cache the result
    if (validPhases.length > 0) {
      await extractionCacheService.set(
        context.projectId,
        context.documentContext,
        'phases',
        validPhases,
        context.provider,
        context.model
      )
    }

    return {
      entities: validPhases,
      rejectedCount,
      skippedCount: 0,
      stats: {
        totalExtracted,
        afterDeduplication,
        afterSourceResolution,
        finalCount: validPhases.length,
        cacheHit: false,
        durationMs: Date.now() - startTime,
        provider: context.provider,
        model: context.model
      }
    }
  } catch (error: unknown) {
    logger.error('[EXTRACTION-PHASES] Extraction failed', {
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
 * Deduplicate phases within the extracted batch only
 */
function deduplicatePhasesBatch(phases: Phase[]): Phase[] {
  const deduplicatedMap = new Map<string, Phase>()
  
  phases.forEach(phase => {
    const normalizedName = phase.name.trim().toLowerCase()
    
    if (!deduplicatedMap.has(normalizedName)) {
      deduplicatedMap.set(normalizedName, phase)
    } else {
      // Duplicate found - merge details (keep most detailed version)
      const existing = deduplicatedMap.get(normalizedName)!
      const merged: Phase = {
        ...existing,
        description: phase.description || existing.description,
        start_date: phase.start_date || existing.start_date,
        end_date: phase.end_date || existing.end_date,
        status: phase.status || existing.status,
        deliverables: phase.deliverables || existing.deliverables,
        key_activities: phase.key_activities || existing.key_activities
      }
      deduplicatedMap.set(normalizedName, merged)
      logger.debug(`[EXTRACTION-PHASES] Merged duplicate phase: "${phase.name}"`)
    }
  })
  
  return Array.from(deduplicatedMap.values())
}

