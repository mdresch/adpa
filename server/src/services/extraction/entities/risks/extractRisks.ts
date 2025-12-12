/**
 * Extract Risks
 * 
 * Extracts risks from project documents.
 * Risks include technical, schedule, budget, resource, external, and quality risks.
 */

import { logger } from '../../../../utils/logger'
import { aiService } from '../../../aiService'
import type { ExtractionContext } from '../../base/ExtractionContext'
import type { ExtractionResult } from '../../base/ExtractionResult'
import { parseAIResponse } from '../../base/Parser'
import { buildExtractionPrompt } from '../../base/PromptBuilder'
import { resolveSourceDocumentIdStrict } from '../../base/SourceDocumentResolver'
import { extractionCacheService } from '../../cache'
import type { Risk } from './types'

/**
 * Extract risks from documents
 */
export async function extractRisks(
  context: ExtractionContext,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<ExtractionResult<Risk>> {
  const startTime = Date.now()
  let cacheHit = false
  let totalExtracted = 0
  let afterDeduplication = 0
  let afterSourceResolution = 0
  let rejectedCount = 0

  try {
    logger.info('[EXTRACTION-RISKS] Starting extraction', {
      projectId: context.projectId,
      documentCount: context.documents.length
    })

    // Check cache
    const cached = await extractionCacheService.get(
      context.projectId,
      context.documentContext,
      'risks',
      context.provider,
      context.model
    )

    if (cached && cached.length > 0) {
      logger.info(`[EXTRACTION-RISKS] ✅ Using cached result (${cached.length} entities)`)
      cacheHit = true
      
      // Resolve source documents for cached entities
      const validRisks: Risk[] = []
      cached.forEach((risk: any) => {
        const resolution = resolveSourceDocumentIdStrict(
          risk,
          context,
          'RISKS',
          risk.title || 'Unnamed Risk'
        )
        
        if (resolution.resolved) {
          validRisks.push(risk as Risk)
        } else {
          rejectedCount++
        }
      })

      afterSourceResolution = validRisks.length

      return {
        entities: validRisks,
        rejectedCount,
        skippedCount: 0,
        stats: {
          totalExtracted: cached.length,
          afterDeduplication: cached.length,
          afterSourceResolution: validRisks.length,
          finalCount: validRisks.length,
          cacheHit: true,
          durationMs: Date.now() - startTime,
          provider: context.provider,
          model: context.model
        }
      }
    }

    // Cache miss - perform AI extraction
    logger.info(`[EXTRACTION-RISKS] ❌ Cache miss, calling AI...`, {
      provider: context.provider,
      model: context.model,
      documentCount: context.documents.length
    })

    // Build prompt
    const jsonStructure = `{
  "risks": [
    {
      "title": "Risk Title",
      "description": "Detailed description of the risk",
      "category": "technical|schedule|budget|resource|external|quality",
      "probability": "high|medium|low",
      "impact": "high|medium|low",
      "mitigation_strategy": "How to prevent or reduce this risk",
      "contingency_plan": "What to do if the risk occurs",
      "source_document": "EXACT document title from AVAILABLE DOCUMENTS list above"
    }
  ]
}`

    const requirements = [
      'Include ALL risks mentioned in any document',
      'Categorize risks appropriately',
      'Assess probability and impact from context',
      'Extract mitigation strategies if mentioned',
      'Extract contingency plans if mentioned'
    ]

    const prompt = buildExtractionPrompt(
      context,
      'risks',
      'risks',
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
    const rawRisks = parsed.risks || []
    totalExtracted = rawRisks.length

    // Deduplicate within batch
    const deduplicatedRisks = deduplicateRisksBatch(rawRisks)
    afterDeduplication = deduplicatedRisks.length

    // Resolve source_document_id for each risk (STRICT: reject if missing)
    const validRisks: Risk[] = []
    
    deduplicatedRisks.forEach((risk) => {
      const resolution = resolveSourceDocumentIdStrict(
        risk,
        context,
        'RISKS',
        risk.title || 'Unnamed Risk'
      )
      
      if (resolution.resolved) {
        validRisks.push(risk)
      } else {
        rejectedCount++
      }
    })

    afterSourceResolution = validRisks.length

    if (rejectedCount > 0) {
      logger.warn(`[EXTRACTION-RISKS] REJECTED ${rejectedCount} risks without valid source_document_id (out of ${deduplicatedRisks.length} total)`)
    }
    
    logger.info(`[EXTRACTION-RISKS] Extracted ${validRisks.length} risks with valid source_document_id (${rejectedCount} rejected)`)

    // Cache the result
    if (validRisks.length > 0) {
      await extractionCacheService.set(
        context.projectId,
        context.documentContext,
        'risks',
        validRisks,
        context.provider,
        context.model
      )
    }

    return {
      entities: validRisks,
      rejectedCount,
      skippedCount: 0,
      stats: {
        totalExtracted,
        afterDeduplication,
        afterSourceResolution,
        finalCount: validRisks.length,
        cacheHit: false,
        durationMs: Date.now() - startTime,
        provider: context.provider,
        model: context.model
      }
    }
  } catch (error: unknown) {
    logger.error('[EXTRACTION-RISKS] Extraction failed', {
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
 * Deduplicate risks within the extracted batch only
 */
function deduplicateRisksBatch(risks: Risk[]): Risk[] {
  const deduplicatedMap = new Map<string, Risk>()
  
  risks.forEach(risk => {
    const normalizedTitle = risk.title.trim().toLowerCase()
    
    if (!deduplicatedMap.has(normalizedTitle)) {
      deduplicatedMap.set(normalizedTitle, risk)
    } else {
      // Duplicate found - merge details (keep most detailed version)
      const existing = deduplicatedMap.get(normalizedTitle)!
      const merged: Risk = {
        ...existing,
        description: risk.description || existing.description,
        category: risk.category || existing.category,
        probability: risk.probability || existing.probability,
        impact: risk.impact || existing.impact,
        mitigation_strategy: risk.mitigation_strategy || existing.mitigation_strategy,
        contingency_plan: risk.contingency_plan || existing.contingency_plan,
        owner: risk.owner || existing.owner
      }
      deduplicatedMap.set(normalizedTitle, merged)
      logger.debug(`[EXTRACTION-RISKS] Merged duplicate risk: "${risk.title}"`)
    }
  })
  
  return Array.from(deduplicatedMap.values())
}

