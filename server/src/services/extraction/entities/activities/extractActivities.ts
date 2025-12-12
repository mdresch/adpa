/**
 * Extract Activities
 * 
 * Extracts activities, tasks, and work packages from project documents.
 * Activities are work efforts with duration (unlike milestones which are zero-duration checkpoints).
 */

import { logger } from '../../../../utils/logger'
import { aiService } from '../../../aiService'
import type { ExtractionContext } from '../../base/ExtractionContext'
import type { ExtractionResult } from '../../base/ExtractionResult'
import { parseAIResponse, coerceNumber } from '../../base/Parser'
import { buildExtractionPrompt } from '../../base/PromptBuilder'
import { resolveSourceDocumentIdStrict } from '../../base/SourceDocumentResolver'
import { extractionCacheService } from '../../cache'
import type { Activity } from './types'

/**
 * Extract activities from documents
 */
export async function extractActivities(
  context: ExtractionContext,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<ExtractionResult<Activity>> {
  const startTime = Date.now()
  let cacheHit = false
  let totalExtracted = 0
  let afterDeduplication = 0
  let afterSourceResolution = 0
  let rejectedCount = 0

  try {
    logger.info('[EXTRACTION-ACTIVITIES] Starting extraction', {
      projectId: context.projectId,
      documentCount: context.documents.length
    })

    // Check cache
    const cached = await extractionCacheService.get(
      context.projectId,
      context.documentContext,
      'activities',
      context.provider,
      context.model
    )

    if (cached && cached.length > 0) {
      logger.info(`[EXTRACTION-ACTIVITIES] ✅ Using cached result (${cached.length} entities)`)
      cacheHit = true
      
      // Resolve source documents for cached entities
      const validActivities: Activity[] = []
      cached.forEach((activity: any) => {
        const resolution = resolveSourceDocumentIdStrict(
          activity,
          context,
          'ACTIVITIES',
          activity.name || 'Unnamed Activity'
        )
        
        if (resolution.resolved) {
          validActivities.push(activity as Activity)
        } else {
          rejectedCount++
        }
      })

      afterSourceResolution = validActivities.length

      return {
        entities: validActivities,
        rejectedCount,
        skippedCount: 0,
        stats: {
          totalExtracted: cached.length,
          afterDeduplication: cached.length,
          afterSourceResolution: validActivities.length,
          finalCount: validActivities.length,
          cacheHit: true,
          durationMs: Date.now() - startTime,
          provider: context.provider,
          model: context.model
        }
      }
    }

    // Cache miss - perform AI extraction
    logger.info(`[EXTRACTION-ACTIVITIES] ❌ Cache miss, calling AI...`, {
      provider: context.provider,
      model: context.model,
      documentCount: context.documents.length
    })

    // Build prompt
    const jsonStructure = `{
  "activities": [
    {
      "name": "Activity Name",
      "description": "What this activity involves",
      "category": "Category (development, testing, planning, etc.)",
      "phase": "Which phase it belongs to",
      "start_date": "YYYY-MM-DD or relative date",
      "end_date": "YYYY-MM-DD or relative date",
      "duration": 5,
      "duration_unit": "days|weeks|months",
      "status": "planned|in_progress|completed|blocked|cancelled",
      "assigned_to": "Who is responsible",
      "dependencies": ["Activity 1", "Activity 2"],
      "deliverable": "Related deliverable",
      "effort_estimate": 40,
      "effort_unit": "hours|days|story_points",
      "source_document": "EXACT document title from AVAILABLE DOCUMENTS list above"
    }
  ]
}`

    const requirements = [
      'Include ALL activities, tasks, and work packages mentioned',
      'Include WBS (Work Breakdown Structure) elements',
      'Extract activity timelines if mentioned',
      'Extract resource assignments if mentioned',
      'Extract dependencies between activities',
      'Link to deliverables if mentioned',
      'Extract effort estimates if mentioned',
      'Infer status from context (future = planned, ongoing = in_progress, past = completed)'
    ]

    const prompt = buildExtractionPrompt(
      context,
      'activities',
      'activities, tasks, and work packages',
      jsonStructure,
      requirements
    )

    // Call AI with fallback - use 10000 max_tokens for large activity lists
    const response = await aiService.generateWithFallback({
      prompt,
      provider: context.provider,
      model: context.model,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 10000 // Increased from 8000 to handle very large activities extractions
    }, ['openai', 'google', 'anthropic', 'mistral', 'groq'])

    // Parse response
    const parsed = parseAIResponse(response.content)
    const rawActivities = parsed.activities || []
    totalExtracted = rawActivities.length

    // Normalize numeric values
    const activities: Activity[] = rawActivities.map((item: any) => ({
      ...item,
      duration: coerceNumber(item?.duration),
      effort_estimate: coerceNumber(item?.effort_estimate)
    }))

    // Deduplicate within batch
    const deduplicatedActivities = deduplicateActivitiesBatch(activities)
    afterDeduplication = deduplicatedActivities.length

    // Resolve source_document_id for each activity (STRICT: reject if missing)
    const validActivities: Activity[] = []
    
    deduplicatedActivities.forEach((activity) => {
      const resolution = resolveSourceDocumentIdStrict(
        activity,
        context,
        'ACTIVITIES',
        activity.name || 'Unnamed Activity'
      )
      
      if (resolution.resolved) {
        validActivities.push(activity)
      } else {
        rejectedCount++
      }
    })

    afterSourceResolution = validActivities.length

    if (rejectedCount > 0) {
      logger.warn(`[EXTRACTION-ACTIVITIES] REJECTED ${rejectedCount} activities without valid source_document_id (out of ${deduplicatedActivities.length} total)`)
    }
    
    logger.info(`[EXTRACTION-ACTIVITIES] Extracted ${validActivities.length} activities with valid source_document_id (${rejectedCount} rejected)`)

    // Cache the result
    if (validActivities.length > 0) {
      await extractionCacheService.set(
        context.projectId,
        context.documentContext,
        'activities',
        validActivities,
        context.provider,
        context.model
      )
    }

    return {
      entities: validActivities,
      rejectedCount,
      skippedCount: 0,
      stats: {
        totalExtracted,
        afterDeduplication,
        afterSourceResolution,
        finalCount: validActivities.length,
        cacheHit: false,
        durationMs: Date.now() - startTime,
        provider: context.provider,
        model: context.model
      }
    }
  } catch (error: unknown) {
    logger.error('[EXTRACTION-ACTIVITIES] Extraction failed', {
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
 * Deduplicate activities within the extracted batch only
 */
function deduplicateActivitiesBatch(activities: Activity[]): Activity[] {
  const deduplicatedMap = new Map<string, Activity>()
  
  activities.forEach(activity => {
    const normalizedName = activity.name.trim().toLowerCase()
    
    if (!deduplicatedMap.has(normalizedName)) {
      deduplicatedMap.set(normalizedName, activity)
    } else {
      // Duplicate found - merge details
      const existing = deduplicatedMap.get(normalizedName)!
      const merged: Activity = {
        ...existing,
        description: activity.description || existing.description,
        category: activity.category || existing.category,
        start_date: activity.start_date || existing.start_date,
        end_date: activity.end_date || existing.end_date,
        duration: activity.duration || existing.duration,
        assigned_to: activity.assigned_to || existing.assigned_to,
        dependencies: activity.dependencies?.length ? activity.dependencies : existing.dependencies
      }
      deduplicatedMap.set(normalizedName, merged)
      logger.debug(`[EXTRACTION-ACTIVITIES] Merged duplicate activity: "${activity.name}"`)
    }
  })
  
  return Array.from(deduplicatedMap.values())
}

