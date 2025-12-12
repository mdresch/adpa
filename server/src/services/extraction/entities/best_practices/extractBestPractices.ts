/**
 * Extract Best Practices
 * 
 * Extracts best practices, lessons learned, and recommendations from project documents.
 */

import { logger } from '../../../../utils/logger'
import { aiService } from '../../../aiService'
import type { ExtractionContext } from '../../base/ExtractionContext'
import type { ExtractionResult } from '../../base/ExtractionResult'
import { parseAIResponse } from '../../base/Parser'
import { buildExtractionPrompt } from '../../base/PromptBuilder'
import { resolveSourceDocumentIdStrict } from '../../base/SourceDocumentResolver'
import { extractionCacheService } from '../../cache'
import type { BestPractice } from './types'

/**
 * Extract best practices from documents
 */
export async function extractBestPractices(
  context: ExtractionContext,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<ExtractionResult<BestPractice>> {
  const startTime = Date.now()
  let cacheHit = false
  let totalExtracted = 0
  let afterDeduplication = 0
  let afterSourceResolution = 0
  let rejectedCount = 0

  try {
    logger.info('[EXTRACTION-BEST-PRACTICES] Starting extraction', {
      projectId: context.projectId,
      documentCount: context.documents.length
    })

    // Check cache
    const cached = await extractionCacheService.get(
      context.projectId,
      context.documentContext,
      'best_practices',
      context.provider,
      context.model
    )

    if (cached && cached.length > 0) {
      logger.info(`[EXTRACTION-BEST-PRACTICES] ✅ Using cached result (${cached.length} entities)`)
      cacheHit = true
      
      // Resolve source documents for cached entities
      const validBestPractices: BestPractice[] = []
      cached.forEach((practice: any) => {
        const resolution = resolveSourceDocumentIdStrict(
          practice,
          context,
          'BEST-PRACTICES',
          practice.title || 'Unnamed Best Practice'
        )
        
        if (resolution.resolved) {
          validBestPractices.push(practice as BestPractice)
        } else {
          rejectedCount++
        }
      })

      afterSourceResolution = validBestPractices.length

      return {
        entities: validBestPractices,
        rejectedCount,
        skippedCount: 0,
        stats: {
          totalExtracted: cached.length,
          afterDeduplication: cached.length,
          afterSourceResolution: validBestPractices.length,
          finalCount: validBestPractices.length,
          cacheHit: true,
          durationMs: Date.now() - startTime,
          provider: context.provider,
          model: context.model
        }
      }
    }

    // Cache miss - perform AI extraction
    logger.info(`[EXTRACTION-BEST-PRACTICES] ❌ Cache miss, calling AI...`, {
      provider: context.provider,
      model: context.model,
      documentCount: context.documents.length
    })

    // Build prompt
    const jsonStructure = `{
  "best_practices": [
    {
      "title": "Best Practice Title",
      "description": "Detailed description",
      "category": "Category (e.g., Development, Testing, Communication)",
      "applicability": "When/where this applies",
      "source_document": "EXACT document title from AVAILABLE DOCUMENTS list above"
    }
  ]
}`

    const requirements = [
      'Include best practices mentioned in any document',
      'Include lessons learned',
      'Include recommendations for future projects',
      'Categorize appropriately'
    ]

    const prompt = buildExtractionPrompt(
      context,
      'best practices',
      'best_practices',
      jsonStructure,
      requirements
    )

    // Call AI - use 8000 max_tokens for large best practices extractions
    const response = await aiService.generateWithFallback({
      prompt,
      provider: context.provider,
      model: context.model,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 8000 // Increased for large context windows
    }, ['openai', 'google', 'anthropic', 'mistral', 'groq'])

    // Parse response
    const parsed = parseAIResponse(response.content)
    const rawBestPractices = parsed.best_practices || []
    totalExtracted = rawBestPractices.length

    // Deduplicate within batch
    const deduplicatedBestPractices = deduplicateBestPracticesBatch(rawBestPractices)
    afterDeduplication = deduplicatedBestPractices.length

    // Resolve source_document_id for each best practice (STRICT: reject if missing)
    const validBestPractices: BestPractice[] = []
    
    deduplicatedBestPractices.forEach((practice) => {
      const resolution = resolveSourceDocumentIdStrict(
        practice,
        context,
        'BEST-PRACTICES',
        practice.title || 'Unnamed Best Practice'
      )
      
      if (resolution.resolved) {
        validBestPractices.push(practice)
      } else {
        rejectedCount++
      }
    })

    afterSourceResolution = validBestPractices.length

    if (rejectedCount > 0) {
      logger.warn(`[EXTRACTION-BEST-PRACTICES] REJECTED ${rejectedCount} best practices without valid source_document_id (out of ${deduplicatedBestPractices.length} total)`)
    }
    
    logger.info(`[EXTRACTION-BEST-PRACTICES] Extracted ${validBestPractices.length} best practices with valid source_document_id (${rejectedCount} rejected)`)

    // Cache the result
    if (validBestPractices.length > 0) {
      await extractionCacheService.set(
        context.projectId,
        context.documentContext,
        'best_practices',
        validBestPractices,
        context.provider,
        context.model
      )
    }

    return {
      entities: validBestPractices,
      rejectedCount,
      skippedCount: 0,
      stats: {
        totalExtracted,
        afterDeduplication,
        afterSourceResolution,
        finalCount: validBestPractices.length,
        cacheHit: false,
        durationMs: Date.now() - startTime,
        provider: context.provider,
        model: context.model
      }
    }
  } catch (error: unknown) {
    logger.error('[EXTRACTION-BEST-PRACTICES] Extraction failed', {
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
 * Deduplicate best practices within the extracted batch only
 */
function deduplicateBestPracticesBatch(bestPractices: BestPractice[]): BestPractice[] {
  const deduplicatedMap = new Map<string, BestPractice>()
  
  bestPractices.forEach(practice => {
    const normalizedTitle = practice.title.trim().toLowerCase()
    
    if (!deduplicatedMap.has(normalizedTitle)) {
      deduplicatedMap.set(normalizedTitle, practice)
    } else {
      // Duplicate found - merge details (keep most detailed version)
      const existing = deduplicatedMap.get(normalizedTitle)!
      const merged: BestPractice = {
        ...existing,
        description: practice.description || existing.description,
        category: practice.category || existing.category,
        applicability: practice.applicability || existing.applicability,
        source: practice.source || existing.source
      }
      deduplicatedMap.set(normalizedTitle, merged)
      logger.debug(`[EXTRACTION-BEST-PRACTICES] Merged duplicate best practice: "${practice.title}"`)
    }
  })
  
  return Array.from(deduplicatedMap.values())
}

