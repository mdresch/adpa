/**
 * Admin API Routes
 * Endpoints for admin-only functionality including quality trends, SLA monitoring, and notifications
 */

import express, { Request, Response, NextFunction } from 'express'
import { authenticateToken } from '../middleware/auth'
import { logger } from '../utils/logger'
import { pool } from '../database/connection'
import { Parser } from 'json2csv'
import { semanticSearchService } from '../services/semanticSearchService'

const router = express.Router()

/**
 * Middleware to check if user is admin or super_admin
 */
const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id

    const userResult = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [userId]
    )

    const userRole = userResult.rows[0]?.role?.toLowerCase()
    if (userResult.rows.length === 0 || (userRole !== 'admin' && userRole !== 'super_admin')) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      })
    }

    next()
  } catch (error) {
    logger.error('[ADMIN-ROUTES] Admin check failed', { error })
    next(error)
  }
}

/**
 * GET /api/admin/quality-trends
 * Get quality trends data for dashboard
 */
router.get(
  '/quality-trends',
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const period = req.query.period as string || '30days'

      // Parse period to days
      let days = 30
      if (period === '7days') days = 7
      else if (period === '90days') days = 90
      else if (period === '1year') days = 365

      // Get summary stats
      const summaryResult = await pool.query(`
        SELECT 
          ROUND(AVG(overall_score)) as overall_avg_quality,
          COUNT(*) as total_audits,
          COUNT(DISTINCT d.template_id) as templates_analyzed,
          COUNT(DISTINCT CASE WHEN overall_score < 70 THEN d.template_id END) as templates_with_issues
        FROM quality_audits qa
        JOIN documents d ON qa.document_id = d.id
        WHERE qa.audited_at > NOW() - ($1 * INTERVAL '1 day')
      `, [days])

      // Calculate SLA compliance (% of audits >= 85%)
      const slaResult = await pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN overall_score >= 85 THEN 1 END) as compliant
        FROM quality_audits
        WHERE audited_at > NOW() - ($1 * INTERVAL '1 day')
      `, [days])

      const slaCompliance = slaResult.rows[0].total > 0
        ? Math.round((slaResult.rows[0].compliant / slaResult.rows[0].total) * 100)
        : 100

      const summary = {
        overall_avg_quality: summaryResult.rows[0].overall_avg_quality || 0,
        total_audits: parseInt(summaryResult.rows[0].total_audits) || 0,
        templates_with_issues: parseInt(summaryResult.rows[0].templates_with_issues) || 0,
        sla_compliance: slaCompliance
      }

      // Get quality trends over time
      const trendsResult = await pool.query(`
        SELECT 
          DATE(qa.audited_at) as date,
          ROUND(AVG(qa.overall_score)) as avg_quality,
          COUNT(*) as document_count,
          COUNT(DISTINCT d.template_id) as templates_analyzed
        FROM quality_audits qa
        JOIN documents d ON qa.document_id = d.id
        WHERE qa.audited_at > NOW() - ($1 * INTERVAL '1 day')
        GROUP BY DATE(qa.audited_at)
        ORDER BY date ASC
      `, [days])

      // Get template performance with trends
      const templateResult = await pool.query(`
        WITH recent_quality AS (
          SELECT 
            d.template_id,
            t.name as template_name,
            t.framework,
            ROUND(AVG(qa.overall_score)) as avg_quality,
            COUNT(*) as document_count,
            ROUND(AVG(CASE 
              WHEN qa.audited_at > NOW() - INTERVAL '7 days' 
              THEN qa.overall_score 
            END)) as recent_quality,
            ROUND(AVG(CASE 
              WHEN qa.audited_at BETWEEN NOW() - INTERVAL '14 days' AND NOW() - INTERVAL '7 days'
              THEN qa.overall_score 
            END)) as previous_quality
          FROM quality_audits qa
          JOIN documents d ON qa.document_id = d.id
          JOIN templates t ON d.template_id = t.id
          WHERE qa.audited_at > NOW() - ($1 * INTERVAL '1 day')
          GROUP BY d.template_id, t.name, t.framework
        )
        SELECT 
          template_id,
          template_name,
          framework,
          avg_quality,
          document_count,
          CASE 
            WHEN recent_quality > previous_quality + 5 THEN 'up'
            WHEN recent_quality < previous_quality - 5 THEN 'down'
            ELSE 'stable'
          END as trend,
          ROUND(recent_quality - previous_quality) as trend_percentage
        FROM recent_quality
        ORDER BY avg_quality DESC
      `, [days])

      // Get AI provider performance
      const providerResult = await pool.query(`
        SELECT 
          qa.ai_provider as provider,
          qa.ai_model as model,
          ROUND(AVG(qa.overall_score)) as avg_quality,
          COUNT(*) as document_count,
          AVG(qa.analysis_cost) as avg_cost
        FROM quality_audits qa
        WHERE qa.audited_at > NOW() - ($1 * INTERVAL '1 day')
        AND qa.ai_provider IS NOT NULL
        GROUP BY qa.ai_provider, qa.ai_model
        ORDER BY avg_quality DESC
      `, [days])

      res.json({
        success: true,
        summary,
        by_time: trendsResult.rows,
        by_template: templateResult.rows,
        by_provider: providerResult.rows
      })

    } catch (error: unknown) {
      logger.error('[ADMIN-ROUTES] Failed to get quality trends', {
        error: error instanceof Error ? error.message : String(error)
      })
      next(error)
    }
  }
)

/**
 * GET /api/admin/quality-trends/export
 * Export quality trends data to CSV
 */
router.get(
  '/quality-trends/export',
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const period = req.query.period as string || '30days'
      const format = req.query.format as string || 'csv'

      // Parse period to days
      let days = 30
      if (period === '7days') days = 7
      else if (period === '90days') days = 90
      else if (period === '1year') days = 365

      // Get detailed audit data for export
      const exportResult = await pool.query(`
        SELECT 
          qa.id as audit_id,
          qa.audited_at,
          d.id as document_id,
          d.title as document_title,
          t.id as template_id,
          t.name as template_name,
          t.framework,
          qa.overall_score,
          qa.overall_grade,
          qa.completeness_score,
          qa.consistency_score,
          qa.professional_quality_score,
          qa.standards_compliance_score,
          qa.accuracy_score,
          qa.context_relevance_score,
          qa.ai_provider,
          qa.ai_model,
          qa.analysis_tokens,
          qa.analysis_cost
        FROM quality_audits qa
        JOIN documents d ON qa.document_id = d.id
        JOIN templates t ON d.template_id = t.id
        WHERE qa.audited_at > NOW() - ($1 * INTERVAL '1 day')
        ORDER BY qa.audited_at DESC
      `, [days])

      if (format === 'csv') {
        const fields = [
          'audit_id',
          'audited_at',
          'document_id',
          'document_title',
          'template_id',
          'template_name',
          'framework',
          'overall_score',
          'overall_grade',
          'completeness_score',
          'consistency_score',
          'professional_quality_score',
          'standards_compliance_score',
          'accuracy_score',
          'context_relevance_score',
          'ai_provider',
          'ai_model',
          'analysis_tokens',
          'analysis_cost'
        ]

        const json2csvParser = new Parser({ fields })
        const csv = json2csvParser.parse(exportResult.rows)

        res.setHeader('Content-Type', 'text/csv')
        res.setHeader('Content-Disposition', `attachment; filename=quality-trends-${period}-${new Date().toISOString().split('T')[0]}.csv`)
        res.send(csv)
      } else {
        res.json({
          success: true,
          data: exportResult.rows
        })
      }

    } catch (error: unknown) {
      logger.error('[ADMIN-ROUTES] Failed to export quality trends', {
        error: error instanceof Error ? error.message : String(error)
      })
      next(error)
    }
  }
)

/**
 * GET /api/admin/sla-status
 * Get SLA compliance status
 */
router.get(
  '/sla-status',
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // SLA Thresholds
      const thresholds = {
        critical: 85,  // Must be above 85%
        warning: 75    // Warning if below 75%
      }

      // Get overall compliance (last 30 days)
      const overallResult = await pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN overall_score >= $1 THEN 1 END) as compliant
        FROM quality_audits
        WHERE audited_at > NOW() - INTERVAL '30 days'
      `, [thresholds.critical])

      const overallCompliance = overallResult.rows[0].total > 0
        ? Math.round((overallResult.rows[0].compliant / overallResult.rows[0].total) * 100)
        : 100

      // Get violations by template
      const violationsResult = await pool.query(`
        SELECT 
          t.id as template_id,
          t.name as template_name,
          t.framework,
          ROUND(AVG(qa.overall_score)) as current_quality,
          COUNT(*) as violation_count,
          MAX(qa.audited_at) as last_violation
        FROM quality_audits qa
        JOIN documents d ON qa.document_id = d.id
        JOIN templates t ON d.template_id = t.id
        WHERE qa.audited_at > NOW() - INTERVAL '30 days'
        AND qa.overall_score < $1
        GROUP BY t.id, t.name, t.framework
        ORDER BY violation_count DESC, current_quality ASC
      `, [thresholds.critical])

      // Get SLA trend (last 7 days)
      const trendResult = await pool.query(`
        SELECT 
          DATE(audited_at) as date,
          COUNT(*) as total,
          COUNT(CASE WHEN overall_score >= $1 THEN 1 END) as compliant,
          ROUND((COUNT(CASE WHEN overall_score >= $1 THEN 1 END)::numeric / COUNT(*)::numeric) * 100) as compliance_rate
        FROM quality_audits
        WHERE audited_at > NOW() - INTERVAL '7 days'
        GROUP BY DATE(audited_at)
        ORDER BY date ASC
      `, [thresholds.critical])

      res.json({
        success: true,
        overall_compliance: overallCompliance,
        thresholds,
        violations: violationsResult.rows,
        trend: trendResult.rows,
        status: overallCompliance >= thresholds.critical ? 'compliant' : 
                overallCompliance >= thresholds.warning ? 'warning' : 'critical'
      })

    } catch (error: unknown) {
      logger.error('[ADMIN-ROUTES] Failed to get SLA status', {
        error: error instanceof Error ? error.message : String(error)
      })
      next(error)
    }
  }
)

/**
 * ============================================================================
 * SEMANTIC SEARCH MANAGEMENT ENDPOINTS
 * ============================================================================
 */

/**
 * POST /api/admin/semantic-search/generate
 * Generate embeddings for knowledge base entries
 */
router.post(
  '/semantic-search/generate',
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { entryIds, force } = req.body

      logger.info('[ADMIN-ROUTES] Generating embeddings...', { entryIds, force })

      const result = await semanticSearchService.generateKnowledgeBaseEmbeddings(entryIds)

      res.json({
        success: result.success,
        data: {
          processedCount: result.processedCount,
          failedCount: result.failedCount,
          message: result.message
        }
      })
    } catch (error) {
      logger.error('[ADMIN-ROUTES] Embedding generation failed:', error)
      next(error)
    }
  }
)

/**
 * GET /api/admin/semantic-search/status
 * Get status of semantic search system
 */
router.get(
  '/semantic-search/status',
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
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
    } catch (error) {
      logger.error('[ADMIN-ROUTES] Status check failed:', error)
      next(error)
    }
  }
)

/**
 * POST /api/admin/semantic-search/test-query
 * Test semantic search with a query
 */
router.post(
  '/semantic-search/test-query',
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { query, limit = 5 } = req.body

      if (!query) {
        return res.status(400).json({
          success: false,
          error: 'Query is required'
        })
      }

      logger.info('[ADMIN-ROUTES] Testing semantic query:', { query, limit })

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
    } catch (error) {
      logger.error('[ADMIN-ROUTES] Test query failed:', error)
      next(error)
    }
  }
)

/**
 * POST /api/admin/semantic-search/import-documents
 * Bulk import documents as knowledge base entries
 */
router.post(
  '/semantic-search/import-documents',
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { limit = 0, offset = 0 } = req.body  // limit=0 means ALL

      logger.info('[ADMIN-ROUTES] Bulk importing documents to KB', { limit, offset })

      // Get documents without KB entries (check by title to avoid duplicates)
      let query = `
        SELECT 
          d.id,
          d.title,
          COALESCE(d.content, '') as description,
          d.project_id,
          d.created_at,
          d.content
        FROM documents d
        WHERE d.title IS NOT NULL
          AND d.project_id IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM knowledge_base_entries kb 
            WHERE kb.title = d.title AND kb.project_id = d.project_id
          )
        ORDER BY d.created_at DESC
      `
      
      const params: any[] = []
      
      if (limit > 0) {
        query += ` LIMIT $1 OFFSET $2`
        params.push(limit, offset)
      }

      const docsResult = await pool.query(query, params)
      const documents = docsResult.rows
      logger.info(`[ADMIN-ROUTES] Found ${documents.length} documents to import`)

      if (documents.length === 0) {
        return res.json({
          success: true,
          data: {
            imported: 0,
            failed: 0,
            message: 'No new documents to import',
            nextOffset: offset
          }
        })
      }

      let imported = 0
      let failed = 0
      const failedDocs: any[] = []

      // Create KB entries for each document
      for (const doc of documents) {
        try {
          const improvedApproach = {
            description: doc.description || 'Document content',
            implementation_details: doc.content ? doc.content.substring(0, 500) : '',
            tools_used: [],
            techniques: []
          }
          
          const replicationGuide = {
            steps: ['Review the original document for context and details'],
            prerequisites: [],
            resources_needed: [],
            estimated_effort: 'Unknown',
            risks: []
          }

          await pool.query(`
            INSERT INTO knowledge_base_entries (
              project_id,
              entry_type,
              category,
              title,
              description,
              improved_approach,
              replication_guide,
              created_by,
              status
            ) VALUES (
              $1,
              'lesson_learned',
              'best_practice',
              $2,
              $3,
              $4,
              $5,
              $6,
              'draft'
            )
          `, [
            doc.project_id,
            doc.title,
            doc.description || 'Imported from document',
            JSON.stringify(improvedApproach),
            JSON.stringify(replicationGuide),
            'system'
          ])

          imported++
        } catch (error: any) {
          logger.error(`[ADMIN-ROUTES] Failed to import doc ${doc.id}: ${error.message}`)
          failed++
          failedDocs.push({ id: doc.id, error: error.message })
        }
      }

      logger.info(`[ADMIN-ROUTES] Import batch complete: ${imported} imported, ${failed} failed`)

      res.json({
        success: failed === 0,
        data: {
          imported,
          failed,
          failedDocs: failed > 0 ? failedDocs : undefined,
          message: `Imported ${imported}/${documents.length} documents`,
          nextOffset: offset + (limit > 0 ? limit : 0),
          totalProcessed: imported + failed
        }
      })
    } catch (error) {
      logger.error('[ADMIN-ROUTES] Bulk import failed:', error)
      next(error)
    }
  }
)

/**
 * POST /api/admin/semantic-search/generate-all
 * Generate embeddings for all KB entries without embeddings
 */
router.post(
  '/semantic-search/generate-all',
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      logger.info('[ADMIN-ROUTES] Starting full embedding generation')

      const result = await semanticSearchService.generateKnowledgeBaseEmbeddings()

      res.json({
        success: result.success,
        data: result
      })
    } catch (error) {
      logger.error('[ADMIN-ROUTES] Embedding generation failed:', error)
      next(error)
    }
  }
)

/**
 * GET /api/admin/semantic-search/diagnostics
 * Check document and KB entry state for debugging
 */
router.get(
  '/semantic-search/diagnostics',
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Count queries
      const docCount = await pool.query('SELECT COUNT(*) as count FROM documents')
      const docWithName = await pool.query('SELECT COUNT(*) as count FROM documents WHERE title IS NOT NULL AND project_id IS NOT NULL')
      const kbCount = await pool.query('SELECT COUNT(*) as count FROM knowledge_base_entries')
      const kbWithEmbed = await pool.query('SELECT COUNT(*) as count FROM knowledge_base_entries WHERE embedding IS NOT NULL')
      
      const docsWithoutKB = await pool.query(`
        SELECT COUNT(DISTINCT d.id) as count
        FROM documents d
        WHERE d.title IS NOT NULL
          AND d.project_id IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM knowledge_base_entries kb 
            WHERE kb.title = d.title AND kb.project_id = d.project_id
          )
      `)

      const sampleDocs = await pool.query(`
        SELECT id, title, created_at
        FROM documents 
        WHERE title IS NOT NULL
        ORDER BY created_at DESC
        LIMIT 5
      `)

      const sampleKB = await pool.query(`
        SELECT id, title, embedding IS NOT NULL as has_embedding, created_at
        FROM knowledge_base_entries
        ORDER BY created_at DESC
        LIMIT 5
      `)

      res.json({
        success: true,
        data: {
          statistics: {
            total_documents: parseInt(docCount.rows[0].count),
            documents_with_name_and_project: parseInt(docWithName.rows[0].count),
            total_kb_entries: parseInt(kbCount.rows[0].count),
            kb_with_embeddings: parseInt(kbWithEmbed.rows[0].count),
            documents_without_kb: parseInt(docsWithoutKB.rows[0].count)
          },
          sample_documents: sampleDocs.rows,
          sample_kb_entries: sampleKB.rows
        }
      })
    } catch (error: any) {
      logger.error('[ADMIN-ROUTES] Diagnostics failed:', error)
      res.status(500).json({
        success: false,
        error: error.message
      })
    }
  }
)

export default router

