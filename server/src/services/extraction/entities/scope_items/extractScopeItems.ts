/**
 * Extract Scope Items
 * 
 * Extracts scope items (both in-scope and out-of-scope) from project documents.
 * Handles MoSCoW prioritization and scope boundary extraction.
 */

import { logger } from '../../../../utils/logger'
import { aiService } from '../../../aiService'
import type { ExtractionContext } from '../../base/ExtractionContext'
import type { ExtractionResult } from '../../base/ExtractionResult'
import { parseAIResponse } from '../../base/Parser'
import { buildExtractionPrompt } from '../../base/PromptBuilder'
import { resolveSourceDocumentIdStrict } from '../../base/SourceDocumentResolver'
import { extractionCacheService } from '../../cache'
import type { ScopeItem } from './types'

/**
 * Extract scope items from documents
 */
export async function extractScopeItems(
  context: ExtractionContext,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<ExtractionResult<ScopeItem>> {
  const startTime = Date.now()
  let cacheHit = false
  let totalExtracted = 0
  let afterDeduplication = 0
  let afterSourceResolution = 0
  let rejectedCount = 0

  try {
    logger.info('[EXTRACTION-SCOPE-ITEMS] Starting extraction', {
      projectId: context.projectId,
      documentCount: context.documents.length
    })

    // Check cache
    const cached = await extractionCacheService.get(
      context.projectId,
      context.documentContext,
      'scope_items',
      context.provider,
      context.model
    )

    if (cached && cached.length > 0) {
      logger.info(`[EXTRACTION-SCOPE-ITEMS] ✅ Using cached result (${cached.length} entities)`)
      cacheHit = true
      
      // Resolve source documents for cached entities
      const validScopeItems: ScopeItem[] = []
      cached.forEach((item: any) => {
        const resolution = resolveSourceDocumentIdStrict(
          item,
          context,
          'SCOPE-ITEMS',
          item.title || 'Unnamed Scope Item'
        )
        
        if (resolution.resolved) {
          validScopeItems.push(item as ScopeItem)
        } else {
          rejectedCount++
        }
      })

      afterSourceResolution = validScopeItems.length

      return {
        entities: validScopeItems,
        rejectedCount,
        skippedCount: 0,
        stats: {
          totalExtracted: cached.length,
          afterDeduplication: cached.length,
          afterSourceResolution: validScopeItems.length,
          finalCount: validScopeItems.length,
          cacheHit: true,
          durationMs: Date.now() - startTime,
          provider: context.provider,
          model: context.model
        }
      }
    }

    // Cache miss - perform AI extraction
    logger.info(`[EXTRACTION-SCOPE-ITEMS] ❌ Cache miss, calling AI...`, {
      provider: context.provider,
      model: context.model,
      documentCount: context.documents.length
    })

    // Build prompt
    const jsonStructure = `{
  "scope_items": [
    {
      "title": "Scope Item Title",
      "description": "Detailed description",
      "is_in_scope": true|false,
      "category": "Category (feature, function, module, etc.)",
      "justification": "Why it's in or out of scope",
      "priority": "must_have|should_have|could_have|wont_have",
      "source_document": "EXACT document title from AVAILABLE DOCUMENTS list above"
    }
  ]
}`

    const requirements = [
      'Include BOTH in-scope and out-of-scope items',
      'Extract scope boundaries clearly',
      'Include features, functions, modules that ARE included',
      'Include features, functions, modules that are explicitly EXCLUDED',
      'Classify using MoSCoW prioritization (Must/Should/Could/Won\'t have)',
      'Extract justification for scope decisions if mentioned'
    ]

    const prompt = buildExtractionPrompt(
      context,
      'scope items',
      'scope_items',
      jsonStructure,
      requirements
    )

    // Call AI with fallback - use 12000 max_tokens for large scope extractions
    const response = await aiService.generateWithFallback({
      prompt,
      provider: context.provider,
      model: context.model,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 12000 // Increased from 5000 to handle very large scope extractions (was truncating at ~23K chars)
    }, ['openai', 'google', 'anthropic', 'mistral', 'groq'])

    // Parse response
    const parsed = parseAIResponse(response.content)
    const rawScopeItems = parsed.scope_items || []
    totalExtracted = rawScopeItems.length

    // Deduplicate within batch
    const deduplicatedScopeItems = deduplicateScopeItemsBatch(rawScopeItems)
    afterDeduplication = deduplicatedScopeItems.length

    // Resolve source_document_id for each scope item (STRICT: reject if missing)
    const validScopeItems: ScopeItem[] = []
    
    deduplicatedScopeItems.forEach((item) => {
      const resolution = resolveSourceDocumentIdStrict(
        item,
        context,
        'SCOPE-ITEMS',
        item.title || 'Unnamed Scope Item'
      )
      
      if (resolution.resolved) {
        validScopeItems.push(item)
      } else {
        rejectedCount++
      }
    })

    afterSourceResolution = validScopeItems.length

    if (rejectedCount > 0) {
      logger.warn(`[EXTRACTION-SCOPE-ITEMS] REJECTED ${rejectedCount} scope items without valid source_document_id (out of ${deduplicatedScopeItems.length} total)`)
    }
    
    logger.info(`[EXTRACTION-SCOPE-ITEMS] Extracted ${validScopeItems.length} scope items with valid source_document_id (${rejectedCount} rejected)`)

    // Cache the result
    if (validScopeItems.length > 0) {
      await extractionCacheService.set(
        context.projectId,
        context.documentContext,
        'scope_items',
        validScopeItems,
        context.provider,
        context.model
      )
    }

    return {
      entities: validScopeItems,
      rejectedCount,
      skippedCount: 0,
      stats: {
        totalExtracted,
        afterDeduplication,
        afterSourceResolution,
        finalCount: validScopeItems.length,
        cacheHit: false,
        durationMs: Date.now() - startTime,
        provider: context.provider,
        model: context.model
      }
    }
  } catch (error: unknown) {
    logger.error('[EXTRACTION-SCOPE-ITEMS] Extraction failed', {
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
 * Deduplicate scope items within the extracted batch only
 */
function deduplicateScopeItemsBatch(scopeItems: ScopeItem[]): ScopeItem[] {
  const deduplicatedMap = new Map<string, ScopeItem>()
  
  scopeItems.forEach(scopeItem => {
    const normalizedTitle = scopeItem.title.trim().toLowerCase()
    
    if (!deduplicatedMap.has(normalizedTitle)) {
      deduplicatedMap.set(normalizedTitle, scopeItem)
    } else {
      // Duplicate found - merge details (keep most detailed version)
      const existing = deduplicatedMap.get(normalizedTitle)!
      const merged: ScopeItem = {
        ...existing,
        description: scopeItem.description || existing.description,
        is_in_scope: scopeItem.is_in_scope !== undefined ? scopeItem.is_in_scope : existing.is_in_scope,
        category: scopeItem.category || existing.category,
        justification: scopeItem.justification || existing.justification,
        priority: scopeItem.priority || existing.priority
      }
      deduplicatedMap.set(normalizedTitle, merged)
      logger.debug(`[EXTRACTION-SCOPE-ITEMS] Merged duplicate scope item: "${scopeItem.title}"`)
    }
  })
  
  return Array.from(deduplicatedMap.values())
}

