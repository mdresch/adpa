/**
 * GKG-Enriched Search Routes
 * 
 * API endpoints for performing searches enriched with Graph Knowledge Graph context
 * and knowledge base recommendations
 */

import { Router, Request, Response } from 'express'
import { authenticateToken } from '../middleware/auth'
import { logger, childLogger } from '../utils/logger'
import { validate } from '../middleware/validation'
import Joi from 'joi'
import GKGEnrichedSearchService, {
  GKGEnrichedSearchRequest,
  GKGEnrichedResult
} from '../services/gkgEnrichedSearch'
import {
  searchPortfolios,
  searchPrograms,
  searchProjects,
  searchDocuments,
  searchProjectTasks,
  searchTemplates,
  UniversalSearchRequest
} from '../services/searchService'
import { cache } from '../utils/redis'
import AnalyticsTrackingService from '../services/analyticsTrackingService'

const router = Router()

/**
 * Generate cache key for enriched search results
 */
function generateEnrichedCacheKey(request: GKGEnrichedSearchRequest, userId: string): string {
  const key = {
    query: request.query.toLowerCase().trim(),
    types: (request.types || []).sort().join(','),
    includeRelationships: request.includeRelationships,
    relationshipDepth: request.relationshipDepth,
    includeKB: request.includeKnowledgeBase,
    limit: request.limit || 20,
    offset: request.offset || 0,
    userId
  }
  return `gkg-search:${JSON.stringify(key)}`
}

/**
 * POST /api/search/enriched
 * 
 * Perform semantic/keyword search enriched with:
 * - GKG relationships and related entities
 * - Knowledge base recommendations
 * - Entity context and connections
 * 
 * Request body:
 * {
 *   "query": "string (required)",
 *   "types": ["document", "project"] (optional),
 *   "includeRelationships": true (default),
 *   "relationshipDepth": 2 (default, 1-3),
 *   "relationshipTypes": ["depends_on", "impacts"] (optional),
 *   "includeKnowledgeBase": true (default),
 *   "limit": 20,
 *   "offset": 0
 * }
 */
router.post(
  '/enriched',
  authenticateToken,
  validate(Joi.object({
    query: Joi.string().required().min(2).max(500),
    types: Joi.array()
      .items(Joi.string().valid('portfolio', 'program', 'project', 'document', 'task', 'template'))
      .optional(),
    frameworks: Joi.array().items(Joi.string()).optional(),
    authors: Joi.array().items(Joi.string()).optional(),
    tags: Joi.array().items(Joi.string()).optional(),
    dateRange: Joi.object({
      start: Joi.string().isoDate().optional(),
      end: Joi.string().isoDate().optional()
    }).optional(),
    limit: Joi.number().min(1).max(100).default(20),
    offset: Joi.number().min(0).default(0),
    sortBy: Joi.string().valid('relevance', 'date', 'title').default('relevance'),
    includeRelationships: Joi.boolean().default(true),
    relationshipDepth: Joi.number().min(1).max(3).default(2),
    relationshipTypes: Joi.array().items(Joi.string()).optional(),
    excludeGKGTypes: Joi.array().items(Joi.string()).optional(),
    includeKnowledgeBase: Joi.boolean().default(true),
    allowAIClustering: Joi.boolean().default(false)
  })),
  async (req: Request, res: Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    const userId = (req as any).user?.id

    try {
      const enrichedRequest: GKGEnrichedSearchRequest = {
        query: req.body.query,
        types: req.body.types,
        frameworks: req.body.frameworks,
        authors: req.body.authors,
        tags: req.body.tags,
        dateRange: req.body.dateRange,
        limit: req.body.limit || 20,
        offset: req.body.offset || 0,
        sortBy: req.body.sortBy || 'relevance',
        includeRelationships: req.body.includeRelationships !== false,
        relationshipDepth: req.body.relationshipDepth || 2,
        relationshipTypes: req.body.relationshipTypes,
        excludeGKGTypes: req.body.excludeGKGTypes,
        includeKnowledgeBase: req.body.includeKnowledgeBase !== false,
        allowAIClustering: req.body.allowAIClustering || false
      }

      const searchStartTime = Date.now()
      const cacheKey = generateEnrichedCacheKey(enrichedRequest, userId)

      log.info('[SEARCH-ENRICHED] Request', {
        query: enrichedRequest.query.substring(0, 100),
        types: enrichedRequest.types,
        gkgEnabled: enrichedRequest.includeRelationships
      })

      // Check cache first
      const cachedResult = await cache.get(cacheKey)
      if (cachedResult) {
        log.info('[SEARCH-ENRICHED] Cache hit', { cacheKey })
        const responseTime = Date.now() - searchStartTime

        // Track analytics
        try {
          await AnalyticsTrackingService.trackSearchAnalytics({
            userId,
            query: enrichedRequest.query,
            searchMode: enrichedRequest.includeRelationships ? 'semantic' : 'keyword',
            types: enrichedRequest.types,
            frameworks: enrichedRequest.frameworks,
            authors: enrichedRequest.authors,
            tags: enrichedRequest.tags,
            hasDateFilter: !!enrichedRequest.dateRange,
            totalResults: cachedResult.total || 0,
            resultsReturned: cachedResult.results?.length || 0,
            hasResults: (cachedResult.results?.length || 0) > 0,
            responseTimeMs: responseTime,
            cacheHit: true,
            ipAddress: req.ip || req.socket.remoteAddress,
            userAgent: req.headers['user-agent']
          })
        } catch (analyticsError) {
          log.warn('[SEARCH-ENRICHED] Analytics tracking failed', { error: analyticsError })
        }

        return res.json({
          results: cachedResult.results,
          total: cachedResult.total,
          responseTimeMs: responseTime,
          cached: true,
          gkgStatus: 'cached'
        })
      }

      // Perform base search
      const baseSearchRequest: UniversalSearchRequest = {
        query: enrichedRequest.query,
        types: enrichedRequest.types,
        frameworks: enrichedRequest.frameworks,
        authors: enrichedRequest.authors,
        tags: enrichedRequest.tags,
        dateRange: enrichedRequest.dateRange,
        limit: enrichedRequest.limit,
        offset: enrichedRequest.offset,
        sortBy: enrichedRequest.sortBy
      }

      const allResults: any[] = []

      // Execute type-specific searches
      if (!enrichedRequest.types || enrichedRequest.types.includes('portfolio')) {
        const portfolioResults = await searchPortfolios(baseSearchRequest, userId)
        allResults.push(...portfolioResults)
      }
      if (!enrichedRequest.types || enrichedRequest.types.includes('program')) {
        const programResults = await searchPrograms(baseSearchRequest, userId)
        allResults.push(...programResults)
      }
      if (!enrichedRequest.types || enrichedRequest.types.includes('project')) {
        const projectResults = await searchProjects(baseSearchRequest, userId)
        allResults.push(...projectResults)
      }
      if (!enrichedRequest.types || enrichedRequest.types.includes('document')) {
        const docResults = await searchDocuments(baseSearchRequest, userId)
        allResults.push(...docResults)
      }
      if (!enrichedRequest.types || enrichedRequest.types.includes('task')) {
        const taskResults = await searchProjectTasks(baseSearchRequest, userId)
        allResults.push(...taskResults)
      }
      if (!enrichedRequest.types || enrichedRequest.types.includes('template')) {
        const templateResults = await searchTemplates(baseSearchRequest, userId)
        allResults.push(...templateResults)
      }

      // Enrich with GKG if enabled
      let enrichedResults: GKGEnrichedResult[] = allResults
      let gkgStatus = 'disabled'

      if (enrichedRequest.includeRelationships) {
        enrichedResults = await GKGEnrichedSearchService.enrichResults(
          allResults,
          enrichedRequest,
          userId
        )
        gkgStatus = 'enriched'
      }

      // Sort results
      const sortedResults = enrichedResults.sort((a, b) => {
        if (enrichedRequest.sortBy === 'date') {
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        }
        if (enrichedRequest.sortBy === 'title') {
          return a.title.localeCompare(b.title)
        }
        // relevance (default)
        return (b.relevance_score || 0) - (a.relevance_score || 0)
      })

      // Paginate
      const paginatedResults = sortedResults.slice(
        enrichedRequest.offset || 0,
        (enrichedRequest.offset || 0) + (enrichedRequest.limit || 20)
      )

      const responseTime = Date.now() - searchStartTime

      // Cache results (5-minute TTL)
      await cache.set(
        cacheKey,
        {
          results: paginatedResults,
          total: sortedResults.length
        },
        300
      )

      // Track analytics
      try {
        await AnalyticsTrackingService.trackSearchAnalytics({
          userId,
          query: enrichedRequest.query,
          searchMode: enrichedRequest.includeRelationships ? 'semantic' : 'keyword',
          types: enrichedRequest.types,
          frameworks: enrichedRequest.frameworks,
          authors: enrichedRequest.authors,
          tags: enrichedRequest.tags,
          hasDateFilter: !!enrichedRequest.dateRange,
          totalResults: sortedResults.length,
          resultsReturned: paginatedResults.length,
          hasResults: paginatedResults.length > 0,
          responseTimeMs: responseTime,
          cacheHit: false,
          ipAddress: req.ip || req.socket.remoteAddress,
          userAgent: req.headers['user-agent']
        })
      } catch (analyticsError) {
        log.warn('[SEARCH-ENRICHED] Analytics tracking failed', { error: analyticsError })
      }

      log.info('[SEARCH-ENRICHED] Results', {
        total: sortedResults.length,
        returned: paginatedResults.length,
        responseTimeMs: responseTime,
        gkgStatus
      })

      return res.json({
        results: paginatedResults,
        total: sortedResults.length,
        limit: enrichedRequest.limit,
        offset: enrichedRequest.offset,
        responseTimeMs: responseTime,
        cached: false,
        gkgStatus,
        suggestion: gkgStatus === 'enriched' 
          ? 'Results include GKG relationships under gkgMetadata. Check related entities and knowledge recommendations.'
          : undefined
      })
    } catch (error: any) {
      log.error('[SEARCH-ENRICHED] Failed', { error: error.message })
      return res.status(500).json({
        error: 'Search failed',
        message: error.message
      })
    }
  }
)

/**
 * GET /api/search/related/:entityId
 * 
 * Get entities related to a specific entity via GKG traversal
 * 
 * Query parameters:
 * - entityType: Type of the source entity (project, document, task, etc.)
 * - relationshipTypes: Comma-separated list of relationship types to follow
 * - depth: Graph traversal depth (1-3, default 2)
 */
router.get(
  '/related/:entityId',
  authenticateToken,
  async (req: Request, res: Response) => {
    const log = childLogger({ requestId: (req as any).requestId })

    try {
      const { entityId } = req.params
      const entityType = (req.query.entityType as string) || 'document'
      const relationshipTypes = (req.query.relationshipTypes as string)?.split(',').map(t => t.trim()) || undefined
      const depth = Math.min(parseInt(req.query.depth as string) || 2, 3)

      log.info('[SEARCH-RELATED] Request', { entityId, entityType, depth })

      const related = await GKGEnrichedSearchService.getRelatedEntities(
        entityId,
        entityType,
        relationshipTypes,
        depth
      )

      log.info('[SEARCH-RELATED] Found', { count: related.length })

      return res.json({
        entityId,
        entityType,
        relationshipTypes,
        depth,
        count: related.length,
        related
      })
    } catch (error: any) {
      log.error('[SEARCH-RELATED] Failed', { error: error.message })
      return res.status(500).json({
        error: 'Failed to retrieve related entities',
        message: error.message
      })
    }
  }
)

/**
 * GET /api/search/suggestions/:entityId
 * 
 * Get suggested follow-up searches based on entity relationships
 */
router.get(
  '/suggestions/:entityId',
  authenticateToken,
  async (req: Request, res: Response) => {
    const log = childLogger({ requestId: (req as any).requestId })

    try {
      const { entityId } = req.params
      const entityType = (req.query.entityType as string) || 'document'

      const suggestions = await GKGEnrichedSearchService.getSuggestedFollowUps(
        entityId,
        entityType
      )

      return res.json({
        entityId,
        suggestions
      })
    } catch (error: any) {
      log.error('[SEARCH-SUGGESTIONS] Failed', { error: error.message })
      return res.status(500).json({
        error: 'Failed to generate suggestions',
        message: error.message
      })
    }
  }
)

export default router
