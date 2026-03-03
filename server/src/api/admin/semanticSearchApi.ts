/**
 * Semantic Search Management API
 * Admin endpoints for managing embeddings and semantic search configuration
 */

import { Router, Request, Response } from 'express'
import { semanticSearchService } from '../../services/semanticSearchService'
import { logger } from '../../utils/logger'

const router = Router()

/**
 * POST /api/admin/semantic-search/generate-embeddings
 * Generate embeddings for knowledge base entries
 * 
 * Query params:
 *  - entryIds[] (optional): Specific entry IDs to embed
 *  - force (optional): Force regeneration of existing embeddings
 */
router.post('/generate-embeddings', async (req: Request, res: Response) => {
  try {
    const { entryIds, force } = req.body
    
    logger.info('[SEMANTIC-SEARCH-API] Generating embeddings...', { entryIds, force })
    
    const result = await semanticSearchService.generateKnowledgeBaseEmbeddings(entryIds)
    
    res.json({
      success: result.success,
      data: {
        processedCount: result.processedCount,
        failedCount: result.failedCount,
        message: result.message
      }
    })
  } catch (error: any) {
    logger.error('[SEMANTIC-SEARCH-API] Embedding generation failed:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * GET /api/admin/semantic-search/status
 * Get status of semantic search system
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const { pool } = require('../../database/connection')
    
    // Check embedding status
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_entries,
        SUM(CASE WHEN embedding IS NOT NULL THEN 1 ELSE 0 END) as embedded_entries,
        MAX(embedding_generated_at) as last_generated,
        COUNT(DISTINCT embedding_model) as embedding_models
      FROM knowledge_base_entries
    `)
    
    const stats = result.rows[0]
    const embeddedPercent = stats.total_entries > 0 
      ? Math.round((stats.embedded_entries / stats.total_entries) * 100)
      : 0
    
    res.json({
      success: true,
      data: {
        total_entries: parseInt(stats.total_entries),
        embedded_entries: parseInt(stats.embedded_entries || 0),
        embedded_percentage: embeddedPercent,
        last_generated: stats.last_generated,
        models: stats.embedding_models
      }
    })
  } catch (error: any) {
    logger.error('[SEMANTIC-SEARCH-API] Status check failed:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * POST /api/admin/semantic-search/test-query
 * Test semantic search with a query
 */
router.post('/test-query', async (req: Request, res: Response) => {
  try {
    const { query, limit = 5 } = req.body
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query is required'
      })
    }
    
    logger.info('[SEMANTIC-SEARCH-API] Testing query:', { query, limit })
    
    const results = await semanticSearchService.semanticSearch(query, limit)
    
    res.json({
      success: true,
      data: {
        query,
        results: results.map(r => ({
          id: r.id,
          title: r.title,
          description: r.description.substring(0, 150),
          semantic_score: r.semantic_score.toFixed(3)
        }))
      }
    })
  } catch (error: any) {
    logger.error('[SEMANTIC-SEARCH-API] Test query failed:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * POST /api/admin/semantic-search/rebuild-all
 * Rebuild all embeddings from scratch
 */
router.post('/rebuild-all', async (req: Request, res: Response) => {
  try {
    logger.info('[SEMANTIC-SEARCH-API] Starting full rebuild of all embeddings...')
    
    // This will regenerate embeddings for ALL entries
    const result = await semanticSearchService.generateKnowledgeBaseEmbeddings()
    
    res.json({
      success: result.success,
      data: {
        processedCount: result.processedCount,
        failedCount: result.failedCount,
        message: result.message,
        startedAt: new Date().toISOString()
      }
    })
  } catch (error: any) {
    logger.error('[SEMANTIC-SEARCH-API] Rebuild failed:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * GET /api/admin/semantic-search/entries/:limit
 * Get list of knowledge base entries with embedding status
 */
router.get('/entries/:limit?', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.params.limit || '20'), 100)
    
    const { pool } = require('../../database/connection')
    
    const result = await pool.query(`
      SELECT 
        id,
        title,
        description,
        embedding_model,
        embedding_generated_at,
        (embedding IS NOT NULL) as has_embedding,
        created_at
      FROM knowledge_base_entries
      ORDER BY created_at DESC
      LIMIT $1
    `, [limit])
    
    res.json({
      success: true,
      data: {
        entries: result.rows,
        count: result.rows.length
      }
    })
  } catch (error: any) {
    logger.error('[SEMANTIC-SEARCH-API] Entries listing failed:', error)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

export default router
