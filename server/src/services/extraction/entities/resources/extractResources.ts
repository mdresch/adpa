/**
 * Extract Resources
 * 
 * Extracts resources from project documents including human resources, equipment, materials, and financial resources.
 */

import { logger } from '../../../../utils/logger'
import { aiService } from '../../../aiService'
import type { ExtractionContext } from '../../base/ExtractionContext'
import type { ExtractionResult } from '../../base/ExtractionResult'
import { parseAIResponse } from '../../base/Parser'
import { buildExtractionPrompt } from '../../base/PromptBuilder'
import { resolveSourceDocumentIdStrict } from '../../base/SourceDocumentResolver'
import { extractionCacheService } from '../../cache'
import type { Resource } from './types'

/**
 * Ensure value is a string array
 */
function ensureStringArray(value: any): string[] {
  if (Array.isArray(value)) {
    return value.filter(item => typeof item === 'string').map(item => String(item).trim()).filter(Boolean)
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return []
    return [trimmed]
  }
  return []
}

/**
 * Extract resources from documents
 */
export async function extractResources(
  context: ExtractionContext,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<ExtractionResult<Resource>> {
  const startTime = Date.now()
  let cacheHit = false
  let totalExtracted = 0
  let afterDeduplication = 0
  let afterSourceResolution = 0
  let rejectedCount = 0

  try {
    logger.info('[EXTRACTION-RESOURCES] Starting extraction', {
      projectId: context.projectId,
      documentCount: context.documents.length
    })

    // Check cache
    const cached = await extractionCacheService.get(
      context.projectId,
      context.documentContext,
      'resources',
      context.provider,
      context.model
    )

    if (cached && cached.length > 0) {
      logger.info(`[EXTRACTION-RESOURCES] ✅ Using cached result (${cached.length} entities)`)
      cacheHit = true
      
      // Resolve source documents for cached entities
      const validResources: Resource[] = []
      cached.forEach((resource: any) => {
        const resolution = resolveSourceDocumentIdStrict(
          resource,
          context,
          'RESOURCES',
          resource.name || 'Unnamed Resource'
        )
        
        if (resolution.resolved) {
          validResources.push(resource as Resource)
        } else {
          rejectedCount++
        }
      })

      afterSourceResolution = validResources.length

      return {
        entities: validResources,
        rejectedCount,
        skippedCount: 0,
        stats: {
          totalExtracted: cached.length,
          afterDeduplication: cached.length,
          afterSourceResolution: validResources.length,
          finalCount: validResources.length,
          cacheHit: true,
          durationMs: Date.now() - startTime,
          provider: context.provider,
          model: context.model
        }
      }
    }

    // Cache miss - perform AI extraction
    logger.info(`[EXTRACTION-RESOURCES] ❌ Cache miss, calling AI...`, {
      provider: context.provider,
      model: context.model,
      documentCount: context.documents.length
    })

    // Build prompt
    const jsonStructure = `{
  "resources": [
    {
      "name": "Resource Name or Role",
      "type": "human|equipment|material|financial|software|facility|budget",
      "role": "Their role (for human resources)",
      "allocation": "Full-time, Part-time, or percentage",
      "availability": "When they are available",
      "cost": number or null,
      "skills": ["Skill 1", "Skill 2"],
      "competency_level": "junior|intermediate|senior|expert",
      "certifications": ["Certification 1"],
      "training_needs": ["Training need 1"],
      "team_assignment": "Team or squad name",
      "performance_rating": 0-10 number or null,
      "development_plan": "Summary of development actions",
      "source_document": "EXACT document title from AVAILABLE DOCUMENTS list above"
    }
  ]
}`

    const requirements = [
      'Include human resources (team members, consultants)',
      'Include equipment/tools',
      'Include financial resources (budget allocations)',
      'Extract allocation and availability if mentioned',
      'For human resources, include skills, competency, certifications, training needs, and performance indicators',
      'If a value is not provided in documents, use null or an empty array'
    ]

    const prompt = buildExtractionPrompt(
      context,
      'resources',
      'resources',
      jsonStructure,
      requirements
    )

    // Call AI - use 8000 max_tokens for large resource extractions
    const response = await aiService.generateWithFallback({
      prompt,
      provider: context.provider,
      model: context.model,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 8000 // Increased for large context windows
    }, ['openai', 'google', 'anthropic', 'mistral', 'groq'])

    // Parse response
    const parsed = parseAIResponse(response.content)
    const rawResources = (parsed.resources || []).map((resource: any) => ({
      ...resource,
      skills: ensureStringArray(resource?.skills),
      certifications: ensureStringArray(resource?.certifications),
      training_needs: ensureStringArray(resource?.training_needs)
    }))
    totalExtracted = rawResources.length

    // Deduplicate within batch
    const deduplicatedResources = deduplicateResourcesBatch(rawResources)
    afterDeduplication = deduplicatedResources.length

    // Resolve source_document_id for each resource (STRICT: reject if missing)
    const validResources: Resource[] = []
    
    deduplicatedResources.forEach((resource) => {
      const resolution = resolveSourceDocumentIdStrict(
        resource,
        context,
        'RESOURCES',
        resource.name || 'Unnamed Resource'
      )
      
      if (resolution.resolved) {
        validResources.push(resource)
      } else {
        rejectedCount++
      }
    })

    afterSourceResolution = validResources.length

    if (rejectedCount > 0) {
      logger.warn(`[EXTRACTION-RESOURCES] REJECTED ${rejectedCount} resources without valid source_document_id (out of ${deduplicatedResources.length} total)`)
    }
    
    logger.info(`[EXTRACTION-RESOURCES] Extracted ${validResources.length} resources with valid source_document_id (${rejectedCount} rejected)`)

    // Cache the result
    if (validResources.length > 0) {
      await extractionCacheService.set(
        context.projectId,
        context.documentContext,
        'resources',
        validResources,
        context.provider,
        context.model
      )
    }

    return {
      entities: validResources,
      rejectedCount,
      skippedCount: 0,
      stats: {
        totalExtracted,
        afterDeduplication,
        afterSourceResolution,
        finalCount: validResources.length,
        cacheHit: false,
        durationMs: Date.now() - startTime,
        provider: context.provider,
        model: context.model
      }
    }
  } catch (error: unknown) {
    logger.error('[EXTRACTION-RESOURCES] Extraction failed', {
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
 * Deduplicate resources within the extracted batch only
 */
function deduplicateResourcesBatch(resources: Resource[]): Resource[] {
  // Deduplicate by normalized name
  const uniqueMap = new Map<string, Resource>()
  
  resources.forEach(resource => {
    const normalizedName = resource.name.toLowerCase().trim()
    if (!uniqueMap.has(normalizedName)) {
      uniqueMap.set(normalizedName, resource)
    } else {
      // Duplicate found - keep first occurrence
      logger.debug(`[EXTRACTION-RESOURCES] Skipping duplicate resource: "${resource.name}"`)
    }
  })
  
  return Array.from(uniqueMap.values())
}

