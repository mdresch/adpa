/**
 * Extract Stakeholders
 * 
 * Extracts stakeholders from project documents.
 * Stakeholders include sponsors, team members, users, vendors, and other project participants.
 */

import { logger } from '../../../../utils/logger'
import { aiService } from '../../../aiService'
import type { ExtractionContext } from '../../base/ExtractionContext'
import type { ExtractionResult } from '../../base/ExtractionResult'
import { parseAIResponse } from '../../base/Parser'
import { buildExtractionPrompt } from '../../base/PromptBuilder'
import { resolveSourceDocumentIdStrict } from '../../base/SourceDocumentResolver'
import { extractionCacheService } from '../../cache'
import type { Stakeholder } from './types'

/**
 * Extract stakeholders from documents
 */
export async function extractStakeholders(
  context: ExtractionContext,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<ExtractionResult<Stakeholder>> {
  const startTime = Date.now()
  let cacheHit = false
  let totalExtracted = 0
  let afterDeduplication = 0
  let afterSourceResolution = 0
  let rejectedCount = 0

  try {
    logger.info('[EXTRACTION-STAKEHOLDERS] Starting extraction', {
      projectId: context.projectId,
      documentCount: context.documents.length
    })

    // Check cache
    const cached = await extractionCacheService.get(
      context.projectId,
      context.documentContext,
      'stakeholders',
      context.provider,
      context.model
    )

    if (cached && cached.length > 0) {
      logger.info(`[EXTRACTION-STAKEHOLDERS] ✅ Using cached result (${cached.length} entities)`)
      cacheHit = true
      
      // Resolve source documents for cached entities
      const validStakeholders: Stakeholder[] = []
      cached.forEach((stakeholder: any) => {
        const resolution = resolveSourceDocumentIdStrict(
          stakeholder,
          context,
          'STAKEHOLDERS',
          stakeholder.name || 'Unnamed Stakeholder'
        )
        
        if (resolution.resolved) {
          validStakeholders.push(stakeholder as Stakeholder)
        } else {
          rejectedCount++
        }
      })

      afterSourceResolution = validStakeholders.length

      return {
        entities: validStakeholders,
        rejectedCount,
        skippedCount: 0,
        stats: {
          totalExtracted: cached.length,
          afterDeduplication: cached.length,
          afterSourceResolution: validStakeholders.length,
          finalCount: validStakeholders.length,
          cacheHit: true,
          durationMs: Date.now() - startTime,
          provider: context.provider,
          model: context.model
        }
      }
    }

    // Cache miss - perform AI extraction
    logger.info(`[EXTRACTION-STAKEHOLDERS] ❌ Cache miss, calling AI...`, {
      provider: context.provider,
      model: context.model,
      documentCount: context.documents.length
    })

    // Build prompt
    const jsonStructure = `{
  "stakeholders": [
    {
      "name": "Stakeholder Name or Role",
      "role": "Their role in the project",
      "interest_level": "high|medium|low",
      "influence_level": "high|medium|low",
      "expectations": "What they expect from the project",
      "concerns": "Any concerns they have",
      "source_document": "EXACT document title from AVAILABLE DOCUMENTS list above"
    }
  ]
}`

    const requirements = [
      'Include ALL stakeholders mentioned (sponsors, team members, users, vendors, etc.)',
      'If specific names aren\'t mentioned, use role names (e.g., "Project Sponsor")',
      'AVOID DUPLICATES: If the same person is mentioned multiple times, include them only once',
      'Use the most specific name available (prefer "John Smith" over "Project Manager")',
      'For roles without names, use the role title (e.g., "CISO", not "IT Security (CISO)")',
      'Infer interest and influence levels from context',
      'Extract expectations and concerns if mentioned'
    ]

    const prompt = buildExtractionPrompt(
      context,
      'stakeholders',
      'stakeholders',
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
    const rawStakeholders = parsed.stakeholders || []
    totalExtracted = rawStakeholders.length

    // Deduplicate within batch
    const deduplicatedStakeholders = deduplicateStakeholdersBatch(rawStakeholders)
    afterDeduplication = deduplicatedStakeholders.length

    // Resolve source_document_id for each stakeholder (STRICT: reject if missing)
    const validStakeholders: Stakeholder[] = []
    
    deduplicatedStakeholders.forEach((stakeholder) => {
      const resolution = resolveSourceDocumentIdStrict(
        stakeholder,
        context,
        'STAKEHOLDERS',
        stakeholder.name || 'Unnamed Stakeholder'
      )
      
      if (resolution.resolved) {
        validStakeholders.push(stakeholder)
      } else {
        rejectedCount++
      }
    })

    afterSourceResolution = validStakeholders.length

    if (rejectedCount > 0) {
      logger.warn(`[EXTRACTION-STAKEHOLDERS] REJECTED ${rejectedCount} stakeholders without valid source_document_id (out of ${deduplicatedStakeholders.length} total)`)
    }
    
    logger.info(`[EXTRACTION-STAKEHOLDERS] Extracted ${validStakeholders.length} stakeholders with valid source_document_id (${rejectedCount} rejected)`)

    // Cache the result
    if (validStakeholders.length > 0) {
      await extractionCacheService.set(
        context.projectId,
        context.documentContext,
        'stakeholders',
        validStakeholders,
        context.provider,
        context.model
      )
    }

    return {
      entities: validStakeholders,
      rejectedCount,
      skippedCount: 0,
      stats: {
        totalExtracted,
        afterDeduplication,
        afterSourceResolution,
        finalCount: validStakeholders.length,
        cacheHit: false,
        durationMs: Date.now() - startTime,
        provider: context.provider,
        model: context.model
      }
    }
  } catch (error: unknown) {
    logger.error('[EXTRACTION-STAKEHOLDERS] Extraction failed', {
      projectId: context.projectId,
      error: error instanceof Error ? error.message : String(error)
    })
    
    // Re-throw to trigger Bull retry and provider fallback
    throw error
  }
}

/**
 * Normalize stakeholder name for deduplication
 * Handles variations like "John Smith", "John Smith (PM)", "john smith"
 */
function normalizeStakeholderName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s*\([^)]*\)\s*$/, '') // Remove trailing (role) suffix
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[^\w\s]/g, '') // Remove special characters for better matching
}

/**
 * Deduplicate stakeholders within the extracted batch only
 * Handles variations like "John Smith", "John Smith (PM)", "john smith"
 */
function deduplicateStakeholdersBatch(stakeholders: Stakeholder[]): Stakeholder[] {
  const seen = new Map<string, Stakeholder>()
  
  stakeholders.forEach(stakeholder => {
    // Normalize name: lowercase, trim, remove parenthetical suffixes
    const normalized = normalizeStakeholderName(stakeholder.name)
    
    if (!seen.has(normalized)) {
      // First occurrence - keep it
      seen.set(normalized, stakeholder)
    } else {
      // Duplicate found - merge information
      const existing = seen.get(normalized)!
      
      // Keep the more detailed name (longer = more info)
      if (stakeholder.name.length > existing.name.length) {
        existing.name = stakeholder.name
      }
      
      // Merge expectations and concerns
      if (stakeholder.expectations && !existing.expectations) {
        existing.expectations = stakeholder.expectations
      }
      if (stakeholder.concerns && !existing.concerns) {
        existing.concerns = stakeholder.concerns
      }
      
      // Use higher interest/influence levels
      if (stakeholder.interest_level === 'high') existing.interest_level = 'high'
      if (stakeholder.influence_level === 'high') existing.influence_level = 'high'
      
      logger.debug(`[DEDUP-BATCH] Merged "${stakeholder.name}" into "${existing.name}"`)
    }
  })
  
  return Array.from(seen.values())
}

