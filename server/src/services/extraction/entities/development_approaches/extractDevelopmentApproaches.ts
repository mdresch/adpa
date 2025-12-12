/**
 * Extract Development Approaches
 * 
 * Extracts project-level development approach metadata (ONE record per project).
 * Aligned with PMBOK 8 Development Approach & Life Cycle Performance Domain.
 */

import { logger } from '../../../../utils/logger'
import { aiService } from '../../../aiService'
import type { ExtractionContext } from '../../base/ExtractionContext'
import type { ExtractionResult } from '../../base/ExtractionResult'
import { parseAIResponse, coerceInteger } from '../../base/Parser'
import { resolveSourceDocumentIdStrict } from '../../base/SourceDocumentResolver'
import { extractionCacheService } from '../../cache'
import type { DevelopmentApproach } from './types'

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
 * Extract development approach from documents
 * Returns array with single item (for consistency with other extractors)
 */
export async function extractDevelopmentApproaches(
  context: ExtractionContext,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<ExtractionResult<DevelopmentApproach>> {
  const startTime = Date.now()
  let cacheHit = false
  let totalExtracted = 0
  let afterDeduplication = 0
  let afterSourceResolution = 0
  let rejectedCount = 0

  try {
    logger.info('[EXTRACTION-DEVELOPMENT-APPROACH] Starting extraction (TASK-90)', {
      projectId: context.projectId,
      documentCount: context.documents.length
    })

    // Check cache
    const cached = await extractionCacheService.get(
      context.projectId,
      context.documentContext,
      'development_approaches',
      context.provider,
      context.model
    )

    if (cached && cached.length > 0) {
      logger.info(`[EXTRACTION-DEVELOPMENT-APPROACH] ✅ Using cached result (${cached.length} entities)`)
      cacheHit = true
      
      // Resolve source documents for cached entities
      const validApproaches: DevelopmentApproach[] = []
      cached.forEach((approach: any) => {
        const resolution = resolveSourceDocumentIdStrict(
          approach,
          context,
          'DEVELOPMENT-APPROACHES',
          approach.approach || 'Unnamed Development Approach'
        )
        
        if (resolution.resolved) {
          validApproaches.push(approach as DevelopmentApproach)
        } else {
          rejectedCount++
        }
      })

      afterSourceResolution = validApproaches.length

      return {
        entities: validApproaches,
        rejectedCount,
        skippedCount: 0,
        stats: {
          totalExtracted: cached.length,
          afterDeduplication: cached.length,
          afterSourceResolution: validApproaches.length,
          finalCount: validApproaches.length,
          cacheHit: true,
          durationMs: Date.now() - startTime,
          provider: context.provider,
          model: context.model
        }
      }
    }

    // Cache miss - perform AI extraction
    logger.info(`[EXTRACTION-DEVELOPMENT-APPROACH] ❌ Cache miss, calling AI...`, {
      provider: context.provider,
      model: context.model,
      documentCount: context.documents.length
    })

    // Build detailed prompt for development approach
    const documentContext = context.documentContext
    const documentList = context.documents.map(d => `- ${d.title}`).join('\n')
    
    const prompt = `You are analyzing project documents to extract DEVELOPMENT APPROACH - the methodology selected for this project.
This is project-level metadata (ONE record per project).

Look for:
- "Methodology: Agile/Scrum/Waterfall/Hybrid"
- "Development approach: Predictive/Adaptive"
- "Tailoring justification" or "Why we chose [methodology]"
- Life cycle phases mentioned
- Sprint/iteration lengths
- Delivery cadence (single release vs incremental)
- Governance approach (formal gates, agile ceremonies)
- Context factors: uncertainty level, requirements stability, team experience

SOURCE DOCUMENTS:
${documentContext}

AVAILABLE DOCUMENTS (for source_document matching):
${documentList}

Extract as a single JSON object (not array - one per project):

{
  "approach": "predictive" | "adaptive" | "hybrid" | "incremental" | "iterative",
  "methodology": "waterfall" | "scrum" | "kanban" | "lean" | "safe" | "prince2" | "custom" | null,
  "justification": "Full explanation of why this approach was selected (Markdown format)",
  "uncertainty_level": "low" | "medium" | "high" | null,
  "requirements_stability": "stable" | "evolving" | "uncertain" | null,
  "stakeholder_engagement_model": "periodic" | "continuous" | null,
  "delivery_cadence": "single" | "iterative" | "incremental" | "continuous" | null,
  "organizational_maturity": "low" | "medium" | "high" | null,
  "team_experience_level": "junior" | "mixed" | "senior" | null,
  "regulatory_constraints": boolean | null,
  "life_cycle_phases": ["Phase 1 name", "Phase 2 name", ...],
  "iteration_length": number (if iterative) | null,
  "iteration_unit": "days" | "weeks" | null,
  "governance_approach": "lightweight" | "standard" | "formal" | null,
  "review_gates": ["Gate 1", "Gate 2", ...],
  "tailoring_decisions": [
    {
      "area": "What was tailored",
      "standard_process": "Normal org process",
      "tailored_process": "How it was adapted",
      "justification": "Why"
    }
  ],
  "source_document": "EXACT document title from AVAILABLE DOCUMENTS list above"
}

Guidance:
- Return a single object (not array) - this is project-level metadata
- Use null for unknown values
- Use arrays for phases, review_gates, tailoring_decisions
- justification must be comprehensive Markdown explaining WHY the approach was chosen
- If no methodology information found, return null
- **source_document MUST match exactly** one of the document titles from AVAILABLE DOCUMENTS list

Return JSON object only. Return null if no methodology information found.`

    // Call AI with fallback - use 8000 max_tokens for comprehensive justification
    const response = await aiService.generateWithFallback({
      prompt,
      provider: context.provider,
      model: context.model,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 8000 // Increased for large context windows
    }, ['openai', 'google', 'anthropic', 'mistral', 'groq'])

    // Parse response
    const parsed = parseAIResponse(response.content)
    
    // Log parsing result
    logger.info('[EXTRACTION-DEVELOPMENT-APPROACH] Parsing result', {
      parsedType: typeof parsed,
      isArray: Array.isArray(parsed),
      parsedKeys: parsed && typeof parsed === 'object' ? Object.keys(parsed) : [],
      parsedPreview: parsed ? JSON.stringify(parsed).substring(0, 500) : 'null'
    })
    
    // Handle both single object and array responses (for backward compatibility)
    let approach: any
    if (Array.isArray(parsed.development_approaches)) {
      // Legacy format - take first one
      approach = parsed.development_approaches[0]
    } else if (parsed.approach) {
      // New format - single object
      approach = parsed
    } else {
      logger.warn('[EXTRACTION-DEVELOPMENT-APPROACH] No development approach found in response')
      return {
        entities: [],
        rejectedCount: 0,
        skippedCount: 0,
        stats: {
          totalExtracted: 0,
          afterDeduplication: 0,
          afterSourceResolution: 0,
          finalCount: 0,
          cacheHit: false,
          durationMs: Date.now() - startTime,
          provider: context.provider,
          model: context.model
        }
      }
    }

    if (!approach || !approach.approach) {
      logger.warn('[EXTRACTION-DEVELOPMENT-APPROACH] Invalid approach object')
      return {
        entities: [],
        rejectedCount: 0,
        skippedCount: 0,
        stats: {
          totalExtracted: 0,
          afterDeduplication: 0,
          afterSourceResolution: 0,
          finalCount: 0,
          cacheHit: false,
          durationMs: Date.now() - startTime,
          provider: context.provider,
          model: context.model
        }
      }
    }

    // Normalize the response
    const normalized: DevelopmentApproach = {
      approach: approach.approach,
      methodology: approach.methodology || approach.framework || null,
      justification: approach.justification || approach.tailoring_decisions_text || 'No justification provided',
      uncertainty_level: approach.uncertainty_level || null,
      requirements_stability: approach.requirements_stability || null,
      stakeholder_engagement_model: approach.stakeholder_engagement_model || null,
      delivery_cadence: approach.delivery_cadence || null,
      organizational_maturity: approach.organizational_maturity || null,
      team_experience_level: approach.team_experience_level || null,
      regulatory_constraints: approach.regulatory_constraints || false,
      life_cycle_phases: ensureStringArray(approach.life_cycle_phases || (approach.lifecycle_model ? [approach.lifecycle_model] : [])),
      iteration_length: coerceInteger(approach.iteration_length || (approach.iteration_length_weeks ? (approach.iteration_length_weeks * 7) : null)),
      iteration_unit: approach.iteration_unit || (approach.iteration_length_weeks ? 'weeks' : null),
      governance_approach: approach.governance_approach || null,
      review_gates: ensureStringArray(approach.review_gates),
      tailoring_decisions: Array.isArray(approach.tailoring_decisions) ? approach.tailoring_decisions : [],
      // Legacy fields for backward compatibility
      framework: approach.framework || approach.methodology || null,
      lifecycle_model: approach.lifecycle_model || null,
      iteration_length_weeks: coerceInteger(approach.iteration_length_weeks || (approach.iteration_length && approach.iteration_unit === 'weeks' ? approach.iteration_length / 7 : null)),
      ceremonies: ensureStringArray(approach.ceremonies),
      artifacts: ensureStringArray(approach.artifacts),
      tailoring_decisions_text: approach.tailoring_decisions_text || (Array.isArray(approach.tailoring_decisions) ? approach.tailoring_decisions.map((td: any) => `${td.area}: ${td.justification}`).join('\n') : null),
      governance_notes: approach.governance_notes || null,
      source_document: approach.source_document || null
    }

    totalExtracted = 1
    afterDeduplication = 1

    // Resolve source_document_id (STRICT: reject if missing)
    const resolution = resolveSourceDocumentIdStrict(
      normalized,
      context,
      'DEVELOPMENT-APPROACHES',
      normalized.approach || 'Unnamed Development Approach'
    )

    if (!resolution.resolved) {
      logger.warn(`[EXTRACTION-DEVELOPMENT-APPROACHES] REJECTED development approach "${normalized.approach || 'Unnamed'}" - no valid source_document_id`)
      return {
        entities: [],
        rejectedCount: 1,
        skippedCount: 0,
        stats: {
          totalExtracted: 1,
          afterDeduplication: 1,
          afterSourceResolution: 0,
          finalCount: 0,
          cacheHit: false,
          durationMs: Date.now() - startTime,
          provider: context.provider,
          model: context.model
        }
      }
    }

    afterSourceResolution = 1

    logger.info(`[EXTRACTION-DEVELOPMENT-APPROACH] Extracted development approach: ${normalized.approach} (${normalized.methodology || 'N/A'})`)

    // Cache the result
    await extractionCacheService.set(
      context.projectId,
      context.documentContext,
      'development_approaches',
      [normalized], // Cache as array for consistency
      context.provider,
      context.model
    )

    // Return as array (for consistency with other extraction methods) but should only have one item
    return {
      entities: [normalized],
      rejectedCount: 0,
      skippedCount: 0,
      stats: {
        totalExtracted: 1,
        afterDeduplication: 1,
        afterSourceResolution: 1,
        finalCount: 1,
        cacheHit: false,
        durationMs: Date.now() - startTime,
        provider: context.provider,
        model: context.model
      }
    }
  } catch (error: unknown) {
    logger.error('[EXTRACTION-DEVELOPMENT-APPROACH] Extraction failed', {
      projectId: context.projectId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
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

