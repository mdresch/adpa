/**
 * Universal Search API Routes
 * Provides semantic and keyword search across projects, documents, templates, and users
 */

import { Router, Request, Response } from 'express'
import { authenticateToken } from '../middleware/auth'
import { logger, childLogger } from '../utils/logger'
import { validate } from '../middleware/validation'
import Joi from 'joi'
import {
  searchPortfolios,
  searchPrograms,
  searchProjects,
  searchDocuments,
  searchProjectTasks,
  searchChecklistItems,
  searchTodos,
  searchTemplates,
  searchUsers,
  UniversalSearchRequest,
  SearchResult
} from '../services/searchService'
import { pool } from '../database/connection'
import { cache } from '../utils/redis'
import AnalyticsTrackingService from '../services/analyticsTrackingService'
import crypto from 'crypto'

const router = Router()

/**
 * Generate a cache key from search request
 * Includes query, filters, pagination, and user ID for user-specific results
 */
function generateCacheKey(request: UniversalSearchRequest, userId: string): string {
  const cacheData = {
    query: request.query.toLowerCase().trim(),
    types: (request.types || []).sort().join(','),
    frameworks: (request.frameworks || []).sort().join(','),
    authors: (request.authors || []).sort().join(','),
    tags: (request.tags || []).sort().join(','),
    dateRange: request.dateRange ? JSON.stringify(request.dateRange) : '',
    limit: request.limit || 20,
    offset: request.offset || 0,
    sortBy: request.sortBy || 'relevance',
    searchMode: request.searchMode || 'semantic',
    userId
  }
  
  const cacheString = JSON.stringify(cacheData)
  const hash = crypto.createHash('sha256').update(cacheString).digest('hex')
  return `search:${hash.substring(0, 16)}`
}

/**
 * POST /api/search
 * Universal semantic search across all entity types
 */
router.post(
  '/',
  authenticateToken,
  validate(Joi.object({
    query: Joi.string().required().min(2).max(500),
    types: Joi.array().items(
      Joi.string().valid(
        'portfolio',
        'program',
        'project',
        'document',
        'task',
        'checklist_item',
        'todo',
        'template',
        'user'
      )
    ).optional(),
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
    useSemanticSearch: Joi.boolean().default(true),
    searchMode: Joi.string().valid('semantic', 'keyword', 'hybrid').optional()
  })),
  async (req: Request, res: Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const searchRequest: UniversalSearchRequest = {
        query: req.body.query,
        types: req.body.types,
        frameworks: req.body.frameworks,
        authors: req.body.authors,
        tags: req.body.tags,
        dateRange: req.body.dateRange,
        limit: req.body.limit || 20,
        offset: req.body.offset || 0,
        sortBy: req.body.sortBy || 'relevance',
        useSemanticSearch: req.body.useSemanticSearch !== false, // Default to true
        searchMode: req.body.searchMode // 'semantic' | 'keyword' | 'hybrid'
      }
      
      const userId = (req as any).user!.id
      const searchStartTime = Date.now()
      
      log.info('[SEARCH] Universal search request', {
        query: searchRequest.query.substring(0, 100),
        types: searchRequest.types,
        userId
      })
      
      // Generate cache key from search request
      const cacheKey = generateCacheKey(searchRequest, userId)
      
      // Try to get cached results (5-minute TTL)
      const cachedResult = await cache.get(cacheKey)
      if (cachedResult) {
        log.info('[SEARCH] Cache hit', { cacheKey })
        
        // Track search analytics for cached results (get searchId for response)
        const cachedResponseTimeMs = Date.now() - searchStartTime
        let cachedSearchId: string | null = null
        
        try {
          cachedSearchId = await AnalyticsTrackingService.trackSearchAnalytics({
            userId,
            query: searchRequest.query,
            searchMode: searchRequest.searchMode || (searchRequest.useSemanticSearch ? 'semantic' : 'keyword'),
            types: searchRequest.types,
            frameworks: searchRequest.frameworks,
            authors: searchRequest.authors,
            tags: searchRequest.tags,
            hasDateFilter: !!searchRequest.dateRange,
            totalResults: cachedResult.total || 0,
            resultsReturned: cachedResult.results?.length || 0,
            hasResults: (cachedResult.results?.length || 0) > 0,
            responseTimeMs: cachedResponseTimeMs,
            cacheHit: true,
            ipAddress: req.ip || req.socket.remoteAddress,
            userAgent: req.headers['user-agent']
          })
        } catch (error: any) {
          log.warn('[SEARCH] Failed to track cached search analytics:', error.message)
        }
        
        return res.json({
          ...cachedResult,
          cached: true,
          searchId: cachedSearchId || undefined
        })
      }
      
      const results: SearchResult[] = []
      
      // Determine which entity types to search
      const typesToSearch = searchRequest.types && searchRequest.types.length > 0
        ? searchRequest.types
        : ['portfolio', 'program', 'project', 'document', 'task', 'checklist_item', 'todo', 'template', 'user']
      
      // Parallel search across entity types
      const searchPromises: Promise<SearchResult[]>[] = []
      
      if (typesToSearch.includes('portfolio')) {
        searchPromises.push(searchPortfolios(searchRequest, userId))
      }
      if (typesToSearch.includes('program')) {
        searchPromises.push(searchPrograms(searchRequest, userId))
      }
      if (typesToSearch.includes('project')) {
        searchPromises.push(searchProjects(searchRequest, userId))
      }
      if (typesToSearch.includes('document')) {
        searchPromises.push(searchDocuments(searchRequest, userId))
      }
      if (typesToSearch.includes('task')) {
        searchPromises.push(searchProjectTasks(searchRequest, userId))
      }
      if (typesToSearch.includes('checklist_item')) {
        searchPromises.push(searchChecklistItems(searchRequest, userId))
      }
      if (typesToSearch.includes('todo')) {
        searchPromises.push(searchTodos(searchRequest, userId))
      }
      if (typesToSearch.includes('template')) {
        searchPromises.push(searchTemplates(searchRequest, userId))
      }
      if (typesToSearch.includes('user')) {
        searchPromises.push(searchUsers(searchRequest, userId))
      }
      
      const searchResults = await Promise.all(searchPromises)
      
      // Flatten and combine results
      searchResults.forEach(entityResults => {
        results.push(...entityResults)
      })
      
      // Sort by relevance (or other criteria)
      if (searchRequest.sortBy === 'relevance') {
        results.sort((a, b) => b.relevance_score - a.relevance_score)
      } else if (searchRequest.sortBy === 'date') {
        results.sort((a, b) => 
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        )
      } else if (searchRequest.sortBy === 'title') {
        results.sort((a, b) => a.title.localeCompare(b.title))
      }
      
      // Apply pagination
      const paginatedResults = results.slice(
        searchRequest.offset!,
        searchRequest.offset! + searchRequest.limit!
      )
      
      // Track search analytics (asynchronously, but get searchId for response)
      const responseTimeMs = Date.now() - searchStartTime
      let searchId: string | null = null
      
      // Track search (synchronous for searchId, but lightweight)
      try {
        searchId = await AnalyticsTrackingService.trackSearchAnalytics({
          userId,
          query: searchRequest.query,
          searchMode: searchRequest.searchMode || (searchRequest.useSemanticSearch ? 'semantic' : 'keyword'),
          types: searchRequest.types,
          frameworks: searchRequest.frameworks,
          authors: searchRequest.authors,
          tags: searchRequest.tags,
          hasDateFilter: !!searchRequest.dateRange,
          totalResults: results.length,
          resultsReturned: paginatedResults.length,
          hasResults: results.length > 0,
          responseTimeMs,
          cacheHit: false,
          ipAddress: req.ip || req.socket.remoteAddress,
          userAgent: req.headers['user-agent']
        })
      } catch (error: any) {
        log.warn('[SEARCH] Failed to track search analytics:', error.message)
      }
      
      const response = {
        success: true,
        results: paginatedResults,
        total: results.length,
        query: searchRequest.query,
        pagination: {
          limit: searchRequest.limit,
          offset: searchRequest.offset,
          hasMore: results.length > (searchRequest.offset! + searchRequest.limit!)
        },
        cached: false,
        searchId: searchId || undefined // Include searchId for click tracking
      }
      
      // Cache the results (5 minutes = 300 seconds)
      await cache.set(cacheKey, response, 300)
      
      log.info('[SEARCH] Search completed', {
        totalResults: results.length,
        returnedResults: paginatedResults.length,
        types: typesToSearch,
        cacheKey
      })
      
      res.json(response)
      
    } catch (error: any) {
      log.error('[SEARCH] Search failed:', error)
      res.status(500).json({
        success: false,
        error: 'Search failed',
        message: error.message
      })
    }
  }
)

/**
 * GET /api/search/filters
 * Get available filter options (frameworks, authors, etc.)
 */
router.get(
  '/filters',
  // Make filters endpoint work without auth (public data)
  async (req: Request, res: Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      // Optional: Get user ID if authenticated, but continue without it
      const userId = (req as any).user?.id
      
      // Get distinct frameworks from projects, documents, and templates
      const frameworksResult = await pool.query(`
        SELECT DISTINCT framework
        FROM (
          SELECT framework FROM projects WHERE framework IS NOT NULL
          UNION
          SELECT framework FROM documents WHERE deleted_at IS NULL AND framework IS NOT NULL
          UNION
          SELECT framework FROM templates WHERE deleted_at IS NULL AND framework IS NOT NULL
        ) AS all_frameworks
        WHERE framework IS NOT NULL AND framework != ''
        ORDER BY framework ASC
      `)
      
      // Get authors (users who have created projects, documents, or templates)
      const authorsResult = await pool.query(`
        SELECT DISTINCT u.id, u.name, u.email
        FROM users u
        WHERE u.is_active = true
          AND (
            EXISTS (SELECT 1 FROM projects p WHERE p.owner_id = u.id)
            OR EXISTS (SELECT 1 FROM documents d WHERE d.created_by = u.id AND d.deleted_at IS NULL)
            OR EXISTS (SELECT 1 FROM templates t WHERE t.created_by = u.id AND t.deleted_at IS NULL)
          )
        ORDER BY u.name ASC
      `)
      
      const frameworks = frameworksResult.rows.map((r: any) => r.framework).filter(Boolean)
      const authors = authorsResult.rows.map((r: any) => ({
        id: r.id,
        name: r.name || r.email,
        email: r.email
      }))
      
      log.info('[SEARCH-FILTERS] Retrieved filter options', {
        frameworksCount: frameworks.length,
        authorsCount: authors.length
      })
      
      res.json({
        success: true,
        frameworks,
        authors
      })
      
    } catch (error: any) {
      log.error('[SEARCH-FILTERS] Failed to get filters:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to get filter options',
        message: error.message
      })
    }
  }
)

/**
 * POST /api/search/track-click
 * Track when a user clicks on a search result
 */
router.post(
  '/track-click',
  authenticateToken,
  validate(Joi.object({
    searchId: Joi.string().uuid().required(),
    resultId: Joi.string().uuid().required(),
    resultType: Joi.string().valid('project', 'document', 'template', 'user').required(),
    resultTitle: Joi.string().optional(),
    resultPosition: Joi.number().integer().min(1).required(),
    relevanceScore: Joi.number().min(0).max(1).optional(),
    actionType: Joi.string().valid('view', 'download', 'share').default('view')
  })),
  async (req: Request, res: Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const userId = (req as any).user!.id
      
      await AnalyticsTrackingService.trackSearchResultClick({
        searchId: req.body.searchId,
        resultId: req.body.resultId,
        resultType: req.body.resultType,
        resultTitle: req.body.resultTitle,
        resultPosition: req.body.resultPosition,
        relevanceScore: req.body.relevanceScore,
        userId,
        actionType: req.body.actionType
      })
      
      res.json({ success: true })
    } catch (error: any) {
      log.error('[SEARCH-CLICK] Failed to track click:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to track click',
        message: error.message
      })
    }
  }
)

/**
 * POST /api/search/track-suggestion
 * Track when a user clicks on a search suggestion
 */
router.post(
  '/track-suggestion',
  authenticateToken,
  validate(Joi.object({
    suggestionText: Joi.string().required(),
    suggestionType: Joi.string().valid('autocomplete', 'popular', 'recent').required(),
    queryBefore: Joi.string().optional(),
    queryAfter: Joi.string().optional()
  })),
  async (req: Request, res: Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const userId = (req as any).user!.id
      
      await AnalyticsTrackingService.trackSearchSuggestionClick({
        userId,
        suggestionText: req.body.suggestionText,
        suggestionType: req.body.suggestionType,
        queryBefore: req.body.queryBefore,
        queryAfter: req.body.queryAfter || req.body.suggestionText
      })
      
      res.json({ success: true })
    } catch (error: any) {
      log.error('[SEARCH-SUGGESTION] Failed to track suggestion click:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to track suggestion click',
        message: error.message
      })
    }
  }
)

/**
 * GET /api/search/suggestions
 * Get search suggestions (autocomplete, popular searches, recent searches)
 */
router.get(
  '/suggestions',
  authenticateToken,
  validate(Joi.object({
    query: Joi.string().min(1).max(100).optional(),
    limit: Joi.number().min(1).max(20).default(10)
  })),
  async (req: Request, res: Response) => {
    const log = childLogger({ requestId: (req as any).requestId })
    try {
      const userId = (req as any).user!.id
      const query = req.query.query as string | undefined
      const limit = parseInt(req.query.limit as string) || 10
      
      const suggestions: {
        autocomplete: string[]
        popular: string[]
        recent: string[]
      } = {
        autocomplete: [],
        popular: [],
        recent: []
      }
      
      // Autocomplete: Get matching titles/names from projects, documents, templates
      if (query && query.trim().length > 0) {
        const searchTerm = `%${query.trim()}%`
        
        // Search projects
        const projectsResult = await pool.query(`
          SELECT DISTINCT name as suggestion
          FROM projects
          WHERE (owner_id = $1 OR $1::text = ANY(SELECT jsonb_array_elements_text(team_members)))
            AND name ILIKE $2
          ORDER BY name ASC
          LIMIT $3
        `, [userId, searchTerm, Math.ceil(limit / 3)])
        
        // Search documents
        const documentsResult = await pool.query(`
          SELECT DISTINCT d.title as suggestion
          FROM documents d
          JOIN projects p ON d.project_id = p.id
          WHERE d.deleted_at IS NULL
            AND d.title ILIKE $1
            AND (p.owner_id = $2 OR $2::text = ANY(SELECT jsonb_array_elements_text(p.team_members)))
          ORDER BY d.title ASC
          LIMIT $3
        `, [searchTerm, userId, Math.ceil(limit / 3)])
        
        // Search templates
        const templatesResult = await pool.query(`
          SELECT DISTINCT name as suggestion
          FROM templates
          WHERE deleted_at IS NULL
            AND name ILIKE $1
          ORDER BY name ASC
          LIMIT $2
        `, [searchTerm, Math.ceil(limit / 3)])
        
        // Combine and deduplicate
        const allSuggestions = [
          ...projectsResult.rows.map((r: any) => r.suggestion),
          ...documentsResult.rows.map((r: any) => r.suggestion),
          ...templatesResult.rows.map((r: any) => r.suggestion)
        ]
        
        // Remove duplicates and limit
        suggestions.autocomplete = Array.from(new Set(allSuggestions))
          .filter(Boolean)
          .slice(0, limit)
      }
      
      // Popular searches: Get from analytics (if available), fallback to project/document names
      try {
        const popularAnalyticsResult = await pool.query(`
          SELECT query as suggestion, search_count as count
          FROM mv_popular_searches
          ORDER BY search_count DESC
          LIMIT $1
        `, [limit])
        
        if (popularAnalyticsResult.rows.length > 0) {
          suggestions.popular = popularAnalyticsResult.rows
            .map((r: any) => r.suggestion)
            .filter(Boolean)
            .slice(0, limit)
        } else {
          // Fallback: Get common project/document names
          const popularResult = await pool.query(`
            SELECT name as suggestion, COUNT(*) as count
            FROM (
              SELECT name FROM projects WHERE owner_id = $1 OR $1::text = ANY(SELECT jsonb_array_elements_text(team_members))
              UNION ALL
              SELECT title as name FROM documents d
              JOIN projects p ON d.project_id = p.id
              WHERE d.deleted_at IS NULL
                AND (p.owner_id = $1 OR $1::text = ANY(SELECT jsonb_array_elements_text(p.team_members)))
            ) AS all_names
            GROUP BY name
            ORDER BY count DESC, name ASC
            LIMIT $2
          `, [userId, limit])
          
          suggestions.popular = popularResult.rows
            .map((r: any) => r.suggestion)
            .filter(Boolean)
            .slice(0, limit)
        }
      } catch (error: any) {
        // If analytics table doesn't exist yet, fallback to project/document names
        log.warn('[SEARCH-SUGGESTIONS] Analytics table not available, using fallback:', error.message)
        const popularResult = await pool.query(`
          SELECT name as suggestion, COUNT(*) as count
          FROM (
            SELECT name FROM projects WHERE owner_id = $1 OR $1::text = ANY(SELECT jsonb_array_elements_text(team_members))
            UNION ALL
            SELECT title as name FROM documents d
            JOIN projects p ON d.project_id = p.id
            WHERE d.deleted_at IS NULL
              AND (p.owner_id = $1 OR $1::text = ANY(SELECT jsonb_array_elements_text(p.team_members)))
          ) AS all_names
          GROUP BY name
          ORDER BY count DESC, name ASC
          LIMIT $2
        `, [userId, limit])
        
        suggestions.popular = popularResult.rows
          .map((r: any) => r.suggestion)
          .filter(Boolean)
          .slice(0, limit)
      }
      
      // Recent searches: Get from user's search history (stored in localStorage on frontend)
      // Backend doesn't store this, so return empty array
      // Frontend will handle recent searches from localStorage
      suggestions.recent = []
      
      log.info('[SEARCH-SUGGESTIONS] Generated suggestions', {
        autocompleteCount: suggestions.autocomplete.length,
        popularCount: suggestions.popular.length,
        query: query?.substring(0, 50)
      })
      
      res.json({
        success: true,
        suggestions
      })
      
    } catch (error: any) {
      log.error('[SEARCH-SUGGESTIONS] Failed to get suggestions:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to get search suggestions',
        message: error.message
      })
    }
  }
)

export default router

