/**
 * Extract Capacity Plans
 * 
 * Extracts capacity plans / staffing allocations for team members from project documents.
 */

import { logger } from '../../../../utils/logger'
import { aiService } from '../../../aiService'
import type { ExtractionContext } from '../../base/ExtractionContext'
import type { ExtractionResult } from '../../base/ExtractionResult'
import { parseAIResponse, coerceNumber } from '../../base/Parser'
import { buildExtractionPrompt } from '../../base/PromptBuilder'
import { resolveSourceDocumentIdStrict } from '../../base/SourceDocumentResolver'
import { extractionCacheService } from '../../cache'
import type { CapacityPlan } from './types'

/**
 * Extract capacity plans from documents
 */
export async function extractCapacityPlans(
  context: ExtractionContext,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<ExtractionResult<CapacityPlan>> {
  const startTime = Date.now()
  let cacheHit = false
  let totalExtracted = 0
  let afterDeduplication = 0
  let afterSourceResolution = 0
  let rejectedCount = 0

  try {
    logger.info('[EXTRACTION-CAPACITY-PLANS] Starting extraction', {
      projectId: context.projectId,
      documentCount: context.documents.length
    })

    // Check cache
    const cached = await extractionCacheService.get(
      context.projectId,
      context.documentContext,
      'capacity_plans',
      context.provider,
      context.model
    )

    if (cached && cached.length > 0) {
      logger.info(`[EXTRACTION-CAPACITY-PLANS] ✅ Using cached result (${cached.length} entities)`)
      cacheHit = true
      
      // Resolve source documents for cached entities
      const validCapacityPlans: CapacityPlan[] = []
      cached.forEach((plan: any) => {
        const resolution = resolveSourceDocumentIdStrict(
          plan,
          context,
          'CAPACITY-PLANS',
          plan.team_member || 'Unnamed Capacity Plan'
        )
        
        if (resolution.resolved) {
          validCapacityPlans.push(plan as CapacityPlan)
        } else {
          rejectedCount++
        }
      })

      afterSourceResolution = validCapacityPlans.length

      return {
        entities: validCapacityPlans,
        rejectedCount,
        skippedCount: 0,
        stats: {
          totalExtracted: cached.length,
          afterDeduplication: cached.length,
          afterSourceResolution: validCapacityPlans.length,
          finalCount: validCapacityPlans.length,
          cacheHit: true,
          durationMs: Date.now() - startTime,
          provider: context.provider,
          model: context.model
        }
      }
    }

    // Cache miss - perform AI extraction
    logger.info(`[EXTRACTION-CAPACITY-PLANS] ❌ Cache miss, calling AI...`, {
      provider: context.provider,
      model: context.model,
      documentCount: context.documents.length
    })

    // Build prompt
    const jsonStructure = `{
  "capacity_plans": [
    {
      "team_member": "Name or role",
      "role": "Role description",
      "period_start": "YYYY-MM-DD",
      "period_end": "YYYY-MM-DD",
      "available_hours": number or null,
      "allocated_hours": number or null,
      "utilization_percentage": number or null,
      "notes": "Markdown notes or null",
      "source_document": "EXACT document title from AVAILABLE DOCUMENTS list above"
    }
  ]
}`

    const requirements = [
      'Always include period_start and period_end (estimate if only month provided; use first/last day of month).',
      'Convert utilization percentages (e.g., 75%) to numeric values.',
      'Use null for unknown numeric values.'
    ]

    const prompt = buildExtractionPrompt(
      context,
      'capacity_plans',
      'capacity plans / staffing allocations for team members',
      jsonStructure,
      requirements
    )

    // Call AI
    const response = await aiService.generateWithFallback({
      prompt,
      provider: context.provider,
      model: context.model,
      temperature: options.temperature ?? 0.25,
      max_tokens: options.maxTokens ?? 8000
    }, ['openai', 'google', 'anthropic', 'mistral', 'groq'])

    // Parse response
    const parsed = parseAIResponse(response.content)
    const rawCapacityPlans = parsed.capacity_plans || []
    totalExtracted = rawCapacityPlans.length

    // Normalize and clean entities
    const capacityPlans: CapacityPlan[] = rawCapacityPlans.map((plan: any) => ({
      ...plan,
      available_hours: coerceNumber(plan?.available_hours),
      allocated_hours: coerceNumber(plan?.allocated_hours),
      utilization_percentage: coerceNumber(plan?.utilization_percentage)
    }))

    afterDeduplication = capacityPlans.length

    // Resolve source_document_id for each capacity plan (STRICT: reject if missing)
    const validCapacityPlans: CapacityPlan[] = []
    
    capacityPlans.forEach((plan) => {
      const resolution = resolveSourceDocumentIdStrict(
        plan,
        context,
        'CAPACITY-PLANS',
        plan.team_member || 'Unnamed Capacity Plan'
      )
      
      if (resolution.resolved) {
        validCapacityPlans.push(plan)
      } else {
        rejectedCount++
      }
    })

    afterSourceResolution = validCapacityPlans.length

    if (rejectedCount > 0) {
      logger.warn(`[EXTRACTION-CAPACITY-PLANS] REJECTED ${rejectedCount} capacity plans without valid source_document_id (out of ${capacityPlans.length} total)`)
    }
    
    logger.info(`[EXTRACTION-CAPACITY-PLANS] Extracted ${validCapacityPlans.length} capacity plans with valid source_document_id (${rejectedCount} rejected)`)

    // Cache the result
    if (validCapacityPlans.length > 0) {
      await extractionCacheService.set(
        context.projectId,
        context.documentContext,
        'capacity_plans',
        validCapacityPlans,
        context.provider,
        context.model
      )
    }

    return {
      entities: validCapacityPlans,
      rejectedCount,
      skippedCount: 0,
      stats: {
        totalExtracted,
        afterDeduplication,
        afterSourceResolution,
        finalCount: validCapacityPlans.length,
        cacheHit: false,
        durationMs: Date.now() - startTime,
        provider: context.provider,
        model: context.model
      }
    }
  } catch (error: unknown) {
    logger.error('[EXTRACTION-CAPACITY-PLANS] Extraction failed', {
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

