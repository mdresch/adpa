/**
 * Extract Project Iterations
 * 
 * Extracts iterations, sprints, releases, and program increments from project documents.
 */

import { logger } from '../../../../utils/logger'
import { aiService } from '../../../aiService'
import type { ExtractionContext } from '../../base/ExtractionContext'
import type { ExtractionResult } from '../../base/ExtractionResult'
import { parseAIResponse, coerceInteger, coerceArray } from '../../base/Parser'
import { buildExtractionPrompt } from '../../base/PromptBuilder'
import { resolveSourceDocumentIdStrict } from '../../base/SourceDocumentResolver'
import { extractionCacheService } from '../../cache'
import type { ProjectIteration } from './types'

/**
 * Ensure value is a string array
 * Handles arrays, comma/semicolon/pipe-separated strings, and single strings
 */
function ensureStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map(item => (typeof item === 'string' ? item : String(item ?? '')).trim())
      .filter(item => item.length > 0)
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return []
    if (trimmed.includes(',') || trimmed.includes(';') || trimmed.includes('|')) {
      return trimmed
        .split(/[,;|]/)
        .map(part => part.trim())
        .filter(part => part.length > 0)
    }
    return [trimmed]
  }

  return []
}

/**
 * Extract project iterations from documents
 */
export async function extractProjectIterations(
  context: ExtractionContext,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<ExtractionResult<ProjectIteration>> {
  const startTime = Date.now()
  let cacheHit = false
  let totalExtracted = 0
  let afterDeduplication = 0
  let afterSourceResolution = 0
  let rejectedCount = 0

  try {
    logger.info('[EXTRACTION-PROJECT-ITERATIONS] Starting extraction', {
      projectId: context.projectId,
      documentCount: context.documents.length
    })

    // Check cache
    const cached = await extractionCacheService.get(
      context.projectId,
      context.documentContext,
      'project_iterations',
      context.provider,
      context.model
    )

    if (cached && cached.length > 0) {
      logger.info(`[EXTRACTION-PROJECT-ITERATIONS] ✅ Using cached result (${cached.length} entities)`)
      cacheHit = true
      
      // Resolve source documents for cached entities
      const validIterations: ProjectIteration[] = []
      cached.forEach((iteration: any) => {
        const resolution = resolveSourceDocumentIdStrict(
          iteration,
          context,
          'PROJECT-ITERATIONS',
          iteration.name || 'Unnamed Iteration'
        )
        
        if (resolution.resolved) {
          validIterations.push(iteration as ProjectIteration)
        } else {
          rejectedCount++
        }
      })

      afterSourceResolution = validIterations.length

      return {
        entities: validIterations,
        rejectedCount,
        skippedCount: 0,
        stats: {
          totalExtracted: cached.length,
          afterDeduplication: cached.length,
          afterSourceResolution: validIterations.length,
          finalCount: validIterations.length,
          cacheHit: true,
          durationMs: Date.now() - startTime,
          provider: context.provider,
          model: context.model
        }
      }
    }

    // Cache miss - perform AI extraction
    logger.info(`[EXTRACTION-PROJECT-ITERATIONS] ❌ Cache miss, calling AI...`, {
      provider: context.provider,
      model: context.model,
      documentCount: context.documents.length
    })

    // Build prompt
    const jsonStructure = `{
  "project_iterations": [
    {
      "name": "Iteration / Sprint name",
      "iteration_type": "sprint|iteration|program_increment|release|phase",
      "sequence_number": integer or null,
      "start_date": "YYYY-MM-DD or null",
      "end_date": "YYYY-MM-DD or null",
      "goals": ["Goal 1", "Goal 2"],
      "planned_story_points": integer or null,
      "completed_story_points": integer or null,
      "velocity": integer or null,
      "status": "planned|active|completed|cancelled",
      "retrospective_summary": "Markdown summary or null",
      "impediments": ["Impediment 1"],
      "source_document": "EXACT document title from AVAILABLE DOCUMENTS list above"
    }
  ]
}`

    const requirements = [
      'Include schedule-based iterations (sprints, increments, phases)',
      'Convert backlog goals or OKRs into the goals array',
      'Use null for unknown numeric values, and arrays for multi-item fields'
    ]

    const prompt = buildExtractionPrompt(
      context,
      'iterations / sprints / releases',
      'project_iterations',
      jsonStructure,
      requirements
    )

    // Call AI - use 8000 max_tokens for large iteration extractions
    const response = await aiService.generateWithFallback({
      prompt,
      provider: context.provider,
      model: context.model,
      temperature: options.temperature ?? 0.2,
      max_tokens: options.maxTokens ?? 8000 // Increased for large context windows
    }, ['openai', 'google', 'anthropic', 'mistral', 'groq'])

    // Parse response
    const parsed = parseAIResponse(response.content)
    const rawIterations = (parsed.project_iterations || []).map((iteration: any) => ({
      ...iteration,
      goals: ensureStringArray(iteration?.goals),
      planned_story_points: coerceInteger(iteration?.planned_story_points),
      completed_story_points: coerceInteger(iteration?.completed_story_points),
      velocity: coerceInteger(iteration?.velocity),
      impediments: ensureStringArray(iteration?.impediments)
    }))
    totalExtracted = rawIterations.length

    // Deduplicate within batch
    const deduplicatedIterations = deduplicateProjectIterationsBatch(rawIterations)
    afterDeduplication = deduplicatedIterations.length

    // Resolve source_document_id for each iteration (STRICT: reject if missing)
    const validIterations: ProjectIteration[] = []
    
    deduplicatedIterations.forEach((iteration) => {
      const resolution = resolveSourceDocumentIdStrict(
        iteration,
        context,
        'PROJECT-ITERATIONS',
        iteration.name || 'Unnamed Iteration'
      )
      
      if (resolution.resolved) {
        validIterations.push(iteration)
      } else {
        rejectedCount++
      }
    })

    afterSourceResolution = validIterations.length

    if (rejectedCount > 0) {
      logger.warn(`[EXTRACTION-PROJECT-ITERATIONS] REJECTED ${rejectedCount} iterations without valid source_document_id (out of ${deduplicatedIterations.length} total)`)
    }
    
    logger.info(`[EXTRACTION-PROJECT-ITERATIONS] Extracted ${validIterations.length} iterations with valid source_document_id (${rejectedCount} rejected)`)

    // Cache the result
    if (validIterations.length > 0) {
      await extractionCacheService.set(
        context.projectId,
        context.documentContext,
        'project_iterations',
        validIterations,
        context.provider,
        context.model
      )
    }

    return {
      entities: validIterations,
      rejectedCount,
      skippedCount: 0,
      stats: {
        totalExtracted,
        afterDeduplication,
        afterSourceResolution,
        finalCount: validIterations.length,
        cacheHit: false,
        durationMs: Date.now() - startTime,
        provider: context.provider,
        model: context.model
      }
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    logger.error('[EXTRACTION-PROJECT-ITERATIONS] Extraction failed', {
      projectId: context.projectId,
      error: errorMessage,
      stack: errorStack,
      provider: context.provider,
      model: context.model,
      documentCount: context.documents.length
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
 * Deduplicate project iterations within the extracted batch only
 */
function deduplicateProjectIterationsBatch(iterations: ProjectIteration[]): ProjectIteration[] {
  const deduplicatedMap = new Map<string, ProjectIteration>()
  
  iterations.forEach(iteration => {
    const normalizedName = (iteration.name || '').trim().toLowerCase()
    
    if (!normalizedName) {
      return // Skip iterations without names
    }
    
    if (!deduplicatedMap.has(normalizedName)) {
      deduplicatedMap.set(normalizedName, iteration)
    } else {
      // Duplicate found - merge details (keep most detailed version)
      const existing = deduplicatedMap.get(normalizedName)!
      const merged: ProjectIteration = {
        ...existing,
        iteration_type: iteration.iteration_type || existing.iteration_type,
        sequence_number: iteration.sequence_number !== undefined ? iteration.sequence_number : existing.sequence_number,
        start_date: iteration.start_date || existing.start_date,
        end_date: iteration.end_date || existing.end_date,
        goals: iteration.goals?.length ? iteration.goals : existing.goals,
        planned_story_points: iteration.planned_story_points !== undefined ? iteration.planned_story_points : existing.planned_story_points,
        completed_story_points: iteration.completed_story_points !== undefined ? iteration.completed_story_points : existing.completed_story_points,
        velocity: iteration.velocity !== undefined ? iteration.velocity : existing.velocity,
        status: iteration.status || existing.status,
        retrospective_summary: iteration.retrospective_summary || existing.retrospective_summary,
        impediments: iteration.impediments?.length ? iteration.impediments : existing.impediments
      }
      deduplicatedMap.set(normalizedName, merged)
      logger.debug(`[EXTRACTION-PROJECT-ITERATIONS] Merged duplicate iteration: "${iteration.name}"`)
    }
  })
  
  return Array.from(deduplicatedMap.values())
}

