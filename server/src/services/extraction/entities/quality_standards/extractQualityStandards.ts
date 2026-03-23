/**
 * Extract Quality Standards
 * 
 * Extracts quality standards from project documents including ISO, PMBOK, internal, industry, and regulatory standards.
 */

import { logger } from '../../../../utils/logger'
import { aiService } from '../../../aiService'
import type { ExtractionContext } from '../../base/ExtractionContext'
import type { ExtractionResult } from '../../base/ExtractionResult'
import { parseAIResponse } from '../../base/Parser'
import { buildExtractionPrompt } from '../../base/PromptBuilder'
import { resolveSourceDocumentIdStrict } from '../../base/SourceDocumentResolver'
import { extractionCacheService } from '../../cache'
import type { QualityStandard } from './types'

/**
 * Extract quality standards from documents
 */
export async function extractQualityStandards(
  context: ExtractionContext,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<ExtractionResult<QualityStandard>> {
  const startTime = Date.now()
  let cacheHit = false
  let totalExtracted = 0
  let afterDeduplication = 0
  let afterSourceResolution = 0
  let rejectedCount = 0

  try {
    logger.info('[EXTRACTION-QUALITY-STANDARDS] Starting extraction', {
      projectId: context.projectId,
      documentCount: context.documents.length
    })

    // Check cache
    const cached = await extractionCacheService.get(
      context.projectId,
      context.documentContext,
      'quality_standards',
      context.provider,
      context.model
    )

    if (cached && cached.length > 0) {
      logger.info(`[EXTRACTION-QUALITY-STANDARDS] ✅ Using cached result (${cached.length} entities)`)
      cacheHit = true
      
      // Resolve source documents for cached entities
      const validQualityStandards: QualityStandard[] = []
      cached.forEach((standard: any) => {
        const resolution = resolveSourceDocumentIdStrict(
          standard,
          context,
          'QUALITY-STANDARDS',
          standard.title || 'Unnamed Quality Standard'
        )
        
        if (resolution.resolved) {
          validQualityStandards.push(standard as QualityStandard)
        } else {
          rejectedCount++
        }
      })

      afterSourceResolution = validQualityStandards.length

      return {
        entities: validQualityStandards,
        rejectedCount,
        skippedCount: 0,
        stats: {
          totalExtracted: cached.length,
          afterDeduplication: cached.length,
          afterSourceResolution: validQualityStandards.length,
          finalCount: validQualityStandards.length,
          cacheHit: true,
          durationMs: Date.now() - startTime,
          provider: context.provider,
          model: context.model
        }
      }
    }

    // Cache miss - perform AI extraction
    logger.info(`[EXTRACTION-QUALITY-STANDARDS] ❌ Cache miss, calling AI...`, {
      provider: context.provider,
      model: context.model,
      documentCount: context.documents.length
    })

    // Build prompt
    const jsonStructure = `{
  "quality_standards": [
    {
      "title": "Standard Title",
      "description": "What this standard requires",
      "category": "process|product|performance|compliance",
      "standard_type": "ISO|PMBOK|internal|industry|regulatory|other",
      "requirements": "Specific requirements",
      "measurement_criteria": "How compliance is measured",
      "compliance_level": "mandatory|recommended|optional",
      "source_document": "EXACT document title from AVAILABLE DOCUMENTS list above"
    }
  ]
}`

    const requirements = [
      'Include ISO standards (ISO 9001, ISO 27001, etc.)',
      'Include PMBOK/PMI standards',
      'Include internal quality standards',
      'Include industry-specific standards',
      'Include regulatory/compliance requirements (GDPR, HIPAA, SOX, etc.)',
      'Include code quality standards (coding conventions, test coverage, etc.)',
      'Classify each standard appropriately'
    ]

    const prompt = buildExtractionPrompt(
      context,
      'quality standards',
      'quality_standards',
      jsonStructure,
      requirements
    )

    // Call AI - use 8000 max_tokens for large quality standards extractions
    const response = await aiService.generateWithFallback({
      prompt,
      provider: context.provider,
      model: context.model,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 8000 // Increased for large context windows
    }, ['openai', 'google', 'anthropic', 'mistral', 'groq'])

    // Parse response
    const parsed = parseAIResponse(response.content)
    const rawQualityStandards = parsed.quality_standards || []
    totalExtracted = rawQualityStandards.length

    // Deduplicate within batch
    const deduplicatedQualityStandards = deduplicateQualityStandardsBatch(rawQualityStandards)
    afterDeduplication = deduplicatedQualityStandards.length

    // Resolve source_document_id for each quality standard (STRICT: reject if missing)
    const validQualityStandards: QualityStandard[] = []
    
    deduplicatedQualityStandards.forEach((standard) => {
      const resolution = resolveSourceDocumentIdStrict(
        standard,
        context,
        'QUALITY-STANDARDS',
        standard.title || 'Unnamed Quality Standard'
      )
      
      if (resolution.resolved) {
        validQualityStandards.push(standard)
      } else {
        rejectedCount++
      }
    })

    afterSourceResolution = validQualityStandards.length

    if (rejectedCount > 0) {
      logger.warn(`[EXTRACTION-QUALITY-STANDARDS] REJECTED ${rejectedCount} quality standards without valid source_document_id (out of ${deduplicatedQualityStandards.length} total)`)
    }
    
    logger.info(`[EXTRACTION-QUALITY-STANDARDS] Extracted ${validQualityStandards.length} quality standards with valid source_document_id (${rejectedCount} rejected)`)

    // Cache the result
    if (validQualityStandards.length > 0) {
      await extractionCacheService.set(
        context.projectId,
        context.documentContext,
        'quality_standards',
        validQualityStandards,
        context.provider,
        context.model
      )
    }

    return {
      entities: validQualityStandards,
      rejectedCount,
      skippedCount: 0,
      stats: {
        totalExtracted,
        afterDeduplication,
        afterSourceResolution,
        finalCount: validQualityStandards.length,
        cacheHit: false,
        durationMs: Date.now() - startTime,
        provider: context.provider,
        model: context.model
      }
    }
  } catch (error: unknown) {
    logger.error('[EXTRACTION-QUALITY-STANDARDS] Extraction failed', {
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
 * Deduplicate quality standards within the extracted batch only
 */
function deduplicateQualityStandardsBatch(qualityStandards: QualityStandard[]): QualityStandard[] {
  const deduplicatedMap = new Map<string, QualityStandard>()
  
  qualityStandards.forEach(qs => {
    const normalizedTitle = qs.title.trim().toLowerCase()
    
    if (!deduplicatedMap.has(normalizedTitle)) {
      deduplicatedMap.set(normalizedTitle, qs)
    } else {
      // Duplicate found - merge details (keep most detailed version)
      const existing = deduplicatedMap.get(normalizedTitle)!
      const merged: QualityStandard = {
        ...existing,
        description: qs.description || existing.description,
        category: qs.category || existing.category,
        standard_type: qs.standard_type || existing.standard_type,
        requirements: qs.requirements || existing.requirements,
        measurement_criteria: qs.measurement_criteria || existing.measurement_criteria,
        compliance_level: qs.compliance_level || existing.compliance_level
      }
      deduplicatedMap.set(normalizedTitle, merged)
      logger.debug(`[EXTRACTION-QUALITY-STANDARDS] Merged duplicate standard: "${qs.title}"`)
    }
  })
  
  return Array.from(deduplicatedMap.values())
}

