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
  searchProjects,
  searchDocuments,
  searchTemplates,
  searchUsers,
  UniversalSearchRequest,
  SearchResult
} from '../services/searchService'
import { pool } from '../database/connection'
import { cache } from '../utils/redis'
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
    types: Joi.array().items(Joi.string().valid('project', 'document', 'template', 'user')).optional(),
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
        return res.json({
          ...cachedResult,
          cached: true
        })
      }
      
      const results: SearchResult[] = []
      
      // Determine which entity types to search
      const typesToSearch = searchRequest.types && searchRequest.types.length > 0
        ? searchRequest.types
        : ['project', 'document', 'template', 'user']
      
      // Parallel search across entity types
      const searchPromises: Promise<SearchResult[]>[] = []
      
      if (typesToSearch.includes('project')) {
        searchPromises.push(searchProjects(searchRequest, userId))
      }
      if (typesToSearch.includes('document')) {
        searchPromises.push(searchDocuments(searchRequest, userId))
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
        cached: false
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

export default router

