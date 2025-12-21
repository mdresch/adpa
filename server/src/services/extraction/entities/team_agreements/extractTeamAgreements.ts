/**
 * Extract Team Agreements
 * 
 * Extracts team agreements from project documents aligned with PMBOK 8 Team Performance Domain.
 */

import { logger } from '../../../../utils/logger'
import { aiService } from '../../../aiService'
import type { ExtractionContext } from '../../base/ExtractionContext'
import type { ExtractionResult } from '../../base/ExtractionResult'
import { parseAIResponse, coerceNumber, coerceInteger } from '../../base/Parser'
import { buildExtractionPrompt } from '../../base/PromptBuilder'
import { resolveSourceDocumentIdStrict } from '../../base/SourceDocumentResolver'
import { extractionCacheService } from '../../cache'
import type { TeamAgreement } from './types'

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
 * Extract team agreements from documents
 */
export async function extractTeamAgreements(
  context: ExtractionContext,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<ExtractionResult<TeamAgreement>> {
  const startTime = Date.now()
  let cacheHit = false
  let totalExtracted = 0
  let afterDeduplication = 0
  let afterSourceResolution = 0
  let rejectedCount = 0

  try {
    logger.info('[EXTRACTION-TEAM-AGREEMENTS] Starting extraction', {
      projectId: context.projectId,
      documentCount: context.documents.length
    })

    // Check cache
    const cached = await extractionCacheService.get(
      context.projectId,
      context.documentContext,
      'team_agreements',
      context.provider,
      context.model
    )

    if (cached && cached.length > 0) {
      logger.info(`[EXTRACTION-TEAM-AGREEMENTS] ✅ Using cached result (${cached.length} entities)`)
      cacheHit = true

      // Resolve source documents for cached entities
      const validAgreements: TeamAgreement[] = []
      cached.forEach((agreement: any) => {
        const resolution = resolveSourceDocumentIdStrict(
          agreement,
          context,
          'TEAM-AGREEMENTS',
          agreement.title || 'Unnamed Team Agreement'
        )

        if (resolution.resolved) {
          validAgreements.push(agreement as TeamAgreement)
        } else {
          rejectedCount++
        }
      })

      afterSourceResolution = validAgreements.length

      return {
        entities: validAgreements,
        rejectedCount,
        skippedCount: 0,
        stats: {
          totalExtracted: cached.length,
          afterDeduplication: cached.length,
          afterSourceResolution: validAgreements.length,
          finalCount: validAgreements.length,
          cacheHit: true,
          durationMs: Date.now() - startTime,
          provider: context.provider,
          model: context.model
        }
      }
    }

    // Cache miss - perform AI extraction
    logger.info(`[EXTRACTION-TEAM-AGREEMENTS] ❌ Cache miss, calling AI...`, {
      provider: context.provider,
      model: context.model,
      documentCount: context.documents.length
    })

    // Build detailed prompt for team agreements
    const documentContext = context.documentContext
    const documentList = context.documents.map(d => `- ${d.title}`).join('\n')

    const prompt = `You are analyzing project documentation to extract **Team Agreements** aligned with the PMBOK 8 **Team Performance Domain**.

SOURCE DOCUMENTS:
${documentContext}

AVAILABLE DOCUMENTS (for source_document matching):
${documentList}

Use the following JSON schema exactly:
{
  "team_agreements": [
    {
      "title": "Agreement title",
      "description": "Summary of the agreement in Markdown",
      "category": "working_hours|communication|decision_making|conflict_resolution|quality_standards|meeting_norms|code_of_conduct|collaboration_tools|response_times|knowledge_sharing|other",
      "agreed_by": ["Role or name of team member"],
      "facilitated_by": "Role or name of facilitator",
      "effective_date": "YYYY-MM-DD or null",
      "review_frequency": "weekly|monthly|quarterly|annually|as_needed|null",
      "next_review_date": "YYYY-MM-DD or null",
      "status": "draft|active|under_review|revised|deprecated",
      "adherence_score": 0-10 number,
      "violations_count": integer,
      "last_violation_date": "YYYY-MM-DD or null",
      "notes": "Additional context or null",
      "source_document": "EXACT document title from AVAILABLE DOCUMENTS list above"
    }
  ]
}

Rules:
- Capture explicit or implied team working agreements, norms, or ground rules.
- Extract role names or team member names for agreed_by and facilitated_by fields
- Use arrays for agreed_by even if a single name is mentioned
- If information is missing, use null or an empty array instead of inventing data.
- **source_document MUST match exactly** one of the document titles from AVAILABLE DOCUMENTS list
- Return ONLY valid JSON.`

    // Call AI with fallback - use 8000 max_tokens for large team agreements extractions
    const response = await aiService.generateWithFallback({
      prompt,
      provider: context.provider,
      model: context.model,
      temperature: options.temperature ?? 0.25,
      max_tokens: options.maxTokens ?? 8000 // Increased for large context windows
    }, ['openai', 'google', 'anthropic', 'mistral', 'groq'])

    // Parse response
    const parsed = parseAIResponse(response.content)
    const rawAgreements = (parsed.team_agreements || []).map((agreement: any) => ({
      ...agreement,
      agreed_by: ensureStringArray(agreement?.agreed_by),
      adherence_score: coerceNumber(agreement?.adherence_score),
      violations_count: coerceInteger(agreement?.violations_count)
    }))
    totalExtracted = rawAgreements.length

    // Deduplicate within batch
    const deduplicatedAgreements = deduplicateTeamAgreementsBatch(rawAgreements)
    afterDeduplication = deduplicatedAgreements.length

    // Resolve source_document_id for each team agreement (STRICT: reject if missing)
    const validAgreements: TeamAgreement[] = []

    deduplicatedAgreements.forEach((agreement) => {
      const resolution = resolveSourceDocumentIdStrict(
        agreement,
        context,
        'TEAM-AGREEMENTS',
        agreement.title || 'Unnamed Team Agreement'
      )

      if (resolution.resolved) {
        validAgreements.push(agreement)
      } else {
        rejectedCount++
      }
    })

    afterSourceResolution = validAgreements.length

    if (rejectedCount > 0) {
      logger.warn(`[EXTRACTION-TEAM-AGREEMENTS] REJECTED ${rejectedCount} team agreements without valid source_document_id (out of ${deduplicatedAgreements.length} total)`)
    }

    logger.info(`[EXTRACTION-TEAM-AGREEMENTS] Extracted ${validAgreements.length} team agreements with valid source_document_id (${rejectedCount} rejected)`)

    // Cache the result
    if (validAgreements.length > 0) {
      await extractionCacheService.set(
        context.projectId,
        context.documentContext,
        'team_agreements',
        validAgreements,
        context.provider,
        context.model
      )
    }

    return {
      entities: validAgreements,
      rejectedCount,
      skippedCount: 0,
      stats: {
        totalExtracted,
        afterDeduplication,
        afterSourceResolution,
        finalCount: validAgreements.length,
        cacheHit: false,
        durationMs: Date.now() - startTime,
        provider: context.provider,
        model: context.model
      }
    }
  } catch (error: unknown) {
    logger.error('[EXTRACTION-TEAM-AGREEMENTS] Extraction failed', {
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
 * Deduplicate team agreements within the extracted batch only
 */
function deduplicateTeamAgreementsBatch(agreements: TeamAgreement[]): TeamAgreement[] {
  const deduplicatedMap = new Map<string, TeamAgreement>()

  agreements.forEach(agreement => {
    const normalizedTitle = (agreement.title || '').trim().toLowerCase()

    if (!normalizedTitle) {
      // Skip agreements without titles
      return
    }

    if (!deduplicatedMap.has(normalizedTitle)) {
      deduplicatedMap.set(normalizedTitle, agreement)
    } else {
      // Duplicate found - merge details (keep most detailed version)
      const existing = deduplicatedMap.get(normalizedTitle)!
      const merged: TeamAgreement = {
        ...existing,
        description: agreement.description || existing.description,
        category: agreement.category || existing.category,
        agreed_by: agreement.agreed_by?.length ? agreement.agreed_by : existing.agreed_by,
        facilitated_by: agreement.facilitated_by || existing.facilitated_by,
        effective_date: agreement.effective_date || existing.effective_date,
        review_frequency: agreement.review_frequency || existing.review_frequency,
        next_review_date: agreement.next_review_date || existing.next_review_date,
        status: agreement.status || existing.status,
        adherence_score: agreement.adherence_score !== undefined ? agreement.adherence_score : existing.adherence_score,
        violations_count: agreement.violations_count !== undefined ? agreement.violations_count : existing.violations_count,
        last_violation_date: agreement.last_violation_date || existing.last_violation_date,
        notes: agreement.notes || existing.notes
      }
      deduplicatedMap.set(normalizedTitle, merged)
      logger.debug(`[EXTRACTION-TEAM-AGREEMENTS] Merged duplicate agreement: "${agreement.title}"`)
    }
  })

  return Array.from(deduplicatedMap.values())
}

