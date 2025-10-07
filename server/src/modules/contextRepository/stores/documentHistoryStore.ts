/**
 * Document History Store
 * Manages document history and patterns for AI-enhanced document generation
 */

import { pool } from '../../../database/connection'
import { logger } from '../../../utils/logger'
import type {
  DocumentHistory,
  UsagePattern,
  QualityMetrics,
  BestPractice,
  QualityTrend,
  DocumentFilters
} from '../types'

export class DocumentHistoryStore {
  async getDocumentHistory(documentId: string): Promise<DocumentHistory | null> {
    try {
      logger.debug('Fetching document history', { document_id: documentId })

      const result = await pool.query(
        `
        SELECT 
          d.id,
          d.name,
          d.content,
          d.template_id,
          d.project_id,
          d.created_by,
          d.created_at,
          d.updated_at,
          d.version,
          d.status,
          d.metadata,
          t.name as template_name,
          t.framework,
          t.category,
          p.name as project_name,
          u.name as created_by_name
        FROM documents d
        LEFT JOIN templates t ON d.template_id = t.id
        LEFT JOIN projects p ON d.project_id = p.id
        LEFT JOIN users u ON d.created_by = u.id
        WHERE d.id = $1 AND d.deleted_at IS NULL
        `,
        [documentId]
      )

      if (result.rows.length === 0) {
        return null
      }

      const docRow = result.rows[0]

      // Fetch related data
      const [
        tags,
        similarDocuments,
        usagePatterns,
        qualityMetrics
      ] = await Promise.all([
        this.getDocumentTags(documentId),
        this.getSimilarDocuments(docRow.template_id, docRow.project_id, 5),
        this.getDocumentPatterns(docRow.framework, docRow.category),
        this.getDocumentQualityMetrics(documentId)
      ])

      const documentHistory: DocumentHistory = {
        document_id: docRow.id,
        name: docRow.name,
        content: docRow.content,
        template_id: docRow.template_id,
        template_name: docRow.template_name,
        framework: docRow.framework,
        category: docRow.category,
        project_id: docRow.project_id,
        project_name: docRow.project_name,
        created_by: docRow.created_by,
        created_by_name: docRow.created_by_name,
        created_at: docRow.created_at,
        updated_at: docRow.updated_at,
        version: docRow.version,
        status: docRow.status,
        quality_score: qualityMetrics?.overall_score,
        metadata: docRow.metadata,
        tags,
        similar_documents: similarDocuments.map(doc => doc.document_id),
        usage_patterns: usagePatterns,
        quality_metrics: qualityMetrics || this.getDefaultQualityMetrics()
      }

      logger.debug('Document history retrieved successfully', {
        document_id: documentId,
        tags_count: tags.length,
        similar_documents_count: similarDocuments.length,
        patterns_count: usagePatterns.length
      })

      return documentHistory

    } catch (error) {
      logger.error('Failed to fetch document history', {
        document_id: documentId,
        error: error.message
      })
      throw error
    }
  }

  async getSimilarDocuments(templateId: string, projectId?: string, limit: number = 10): Promise<DocumentHistory[]> {
    try {
      let sql = `
        SELECT 
          d.id,
          d.name,
          d.content,
          d.template_id,
          d.project_id,
          d.created_by,
          d.created_at,
          d.updated_at,
          d.version,
          d.status,
          d.metadata,
          t.name as template_name,
          t.framework,
          t.category,
          p.name as project_name,
          u.name as created_by_name
        FROM documents d
        LEFT JOIN templates t ON d.template_id = t.id
        LEFT JOIN projects p ON d.project_id = p.id
        LEFT JOIN users u ON d.created_by = u.id
        WHERE d.deleted_at IS NULL
        AND d.template_id = $1
      `
      const params: any[] = [templateId]
      let paramIndex = 2

      if (projectId) {
        sql += ` AND d.project_id = $${paramIndex}`
        params.push(projectId)
        paramIndex++
      }

      sql += ` ORDER BY d.updated_at DESC LIMIT $${paramIndex}`
      params.push(limit)

      const result = await pool.query(sql, params)

      const similarDocuments: DocumentHistory[] = []
      for (const row of result.rows) {
        const tags = await this.getDocumentTags(row.id)
        const qualityMetrics = await this.getDocumentQualityMetrics(row.id)

        const document: DocumentHistory = {
          document_id: row.id,
          name: row.name,
          content: row.content,
          template_id: row.template_id,
          template_name: row.template_name,
          framework: row.framework,
          category: row.category,
          project_id: row.project_id,
          project_name: row.project_name,
          created_by: row.created_by,
          created_by_name: row.created_by_name,
          created_at: row.created_at,
          updated_at: row.updated_at,
          version: row.version,
          status: row.status,
          quality_score: qualityMetrics?.overall_score,
          metadata: row.metadata,
          tags,
          similar_documents: [],
          usage_patterns: [],
          quality_metrics: qualityMetrics || this.getDefaultQualityMetrics()
        }
        similarDocuments.push(document)
      }

      return similarDocuments

    } catch (error) {
      logger.error('Failed to get similar documents', {
        template_id: templateId,
        project_id: projectId,
        error: error.message
      })
      return []
    }
  }

  async getDocumentsByFramework(framework: string, limit: number = 20): Promise<DocumentHistory[]> {
    try {
      const result = await pool.query(
        `
        SELECT 
          d.id,
          d.name,
          d.content,
          d.template_id,
          d.project_id,
          d.created_by,
          d.created_at,
          d.updated_at,
          d.version,
          d.status,
          d.metadata,
          t.name as template_name,
          t.framework,
          t.category,
          p.name as project_name,
          u.name as created_by_name
        FROM documents d
        LEFT JOIN templates t ON d.template_id = t.id
        LEFT JOIN projects p ON d.project_id = p.id
        LEFT JOIN users u ON d.created_by = u.id
        WHERE d.deleted_at IS NULL
        AND t.framework = $1
        ORDER BY d.updated_at DESC
        LIMIT $2
        `,
        [framework, limit]
      )

      const documents: DocumentHistory[] = []
      for (const row of result.rows) {
        const tags = await this.getDocumentTags(row.id)
        const qualityMetrics = await this.getDocumentQualityMetrics(row.id)

        const document: DocumentHistory = {
          document_id: row.id,
          name: row.name,
          content: row.content,
          template_id: row.template_id,
          template_name: row.template_name,
          framework: row.framework,
          category: row.category,
          project_id: row.project_id,
          project_name: row.project_name,
          created_by: row.created_by,
          created_by_name: row.created_by_name,
          created_at: row.created_at,
          updated_at: row.updated_at,
          version: row.version,
          status: row.status,
          quality_score: qualityMetrics?.overall_score,
          metadata: row.metadata,
          tags,
          similar_documents: [],
          usage_patterns: [],
          quality_metrics: qualityMetrics || this.getDefaultQualityMetrics()
        }
        documents.push(document)
      }

      return documents

    } catch (error) {
      logger.error('Failed to get documents by framework', {
        framework,
        error: error.message
      })
      return []
    }
  }

  async getDocumentsByCategory(category: string, limit: number = 20): Promise<DocumentHistory[]> {
    try {
      const result = await pool.query(
        `
        SELECT 
          d.id,
          d.name,
          d.content,
          d.template_id,
          d.project_id,
          d.created_by,
          d.created_at,
          d.updated_at,
          d.version,
          d.status,
          d.metadata,
          t.name as template_name,
          t.framework,
          t.category,
          p.name as project_name,
          u.name as created_by_name
        FROM documents d
        LEFT JOIN templates t ON d.template_id = t.id
        LEFT JOIN projects p ON d.project_id = p.id
        LEFT JOIN users u ON d.created_by = u.id
        WHERE d.deleted_at IS NULL
        AND t.category = $1
        ORDER BY d.updated_at DESC
        LIMIT $2
        `,
        [category, limit]
      )

      const documents: DocumentHistory[] = []
      for (const row of result.rows) {
        const tags = await this.getDocumentTags(row.id)
        const qualityMetrics = await this.getDocumentQualityMetrics(row.id)

        const document: DocumentHistory = {
          document_id: row.id,
          name: row.name,
          content: row.content,
          template_id: row.template_id,
          template_name: row.template_name,
          framework: row.framework,
          category: row.category,
          project_id: row.project_id,
          project_name: row.project_name,
          created_by: row.created_by,
          created_by_name: row.created_by_name,
          created_at: row.created_at,
          updated_at: row.updated_at,
          version: row.version,
          status: row.status,
          quality_score: qualityMetrics?.overall_score,
          metadata: row.metadata,
          tags,
          similar_documents: [],
          usage_patterns: [],
          quality_metrics: qualityMetrics || this.getDefaultQualityMetrics()
        }
        documents.push(document)
      }

      return documents

    } catch (error) {
      logger.error('Failed to get documents by category', {
        category,
        error: error.message
      })
      return []
    }
  }

  async getDocumentsByUser(userId: string, limit: number = 20): Promise<DocumentHistory[]> {
    try {
      const result = await pool.query(
        `
        SELECT 
          d.id,
          d.name,
          d.content,
          d.template_id,
          d.project_id,
          d.created_by,
          d.created_at,
          d.updated_at,
          d.version,
          d.status,
          d.metadata,
          t.name as template_name,
          t.framework,
          t.category,
          p.name as project_name,
          u.name as created_by_name
        FROM documents d
        LEFT JOIN templates t ON d.template_id = t.id
        LEFT JOIN projects p ON d.project_id = p.id
        LEFT JOIN users u ON d.created_by = u.id
        WHERE d.deleted_at IS NULL
        AND d.created_by = $1
        ORDER BY d.updated_at DESC
        LIMIT $2
        `,
        [userId, limit]
      )

      const documents: DocumentHistory[] = []
      for (const row of result.rows) {
        const tags = await this.getDocumentTags(row.id)
        const qualityMetrics = await this.getDocumentQualityMetrics(row.id)

        const document: DocumentHistory = {
          document_id: row.id,
          name: row.name,
          content: row.content,
          template_id: row.template_id,
          template_name: row.template_name,
          framework: row.framework,
          category: row.category,
          project_id: row.project_id,
          project_name: row.project_name,
          created_by: row.created_by,
          created_by_name: row.created_by_name,
          created_at: row.created_at,
          updated_at: row.updated_at,
          version: row.version,
          status: row.status,
          quality_score: qualityMetrics?.overall_score,
          metadata: row.metadata,
          tags,
          similar_documents: [],
          usage_patterns: [],
          quality_metrics: qualityMetrics || this.getDefaultQualityMetrics()
        }
        documents.push(document)
      }

      return documents

    } catch (error) {
      logger.error('Failed to get documents by user', {
        user_id: userId,
        error: error.message
      })
      return []
    }
  }

  async getDocumentsByProject(projectId: string, limit: number = 20): Promise<DocumentHistory[]> {
    try {
      const result = await pool.query(
        `
        SELECT 
          d.id,
          d.name,
          d.content,
          d.template_id,
          d.project_id,
          d.created_by,
          d.created_at,
          d.updated_at,
          d.version,
          d.status,
          d.metadata,
          t.name as template_name,
          t.framework,
          t.category,
          p.name as project_name,
          u.name as created_by_name
        FROM documents d
        LEFT JOIN templates t ON d.template_id = t.id
        LEFT JOIN projects p ON d.project_id = p.id
        LEFT JOIN users u ON d.created_by = u.id
        WHERE d.deleted_at IS NULL
        AND d.project_id = $1
        ORDER BY d.updated_at DESC
        LIMIT $2
        `,
        [projectId, limit]
      )

      const documents: DocumentHistory[] = []
      for (const row of result.rows) {
        const tags = await this.getDocumentTags(row.id)
        const qualityMetrics = await this.getDocumentQualityMetrics(row.id)

        const document: DocumentHistory = {
          document_id: row.id,
          name: row.name,
          content: row.content,
          template_id: row.template_id,
          template_name: row.template_name,
          framework: row.framework,
          category: row.category,
          project_id: row.project_id,
          project_name: row.project_name,
          created_by: row.created_by,
          created_by_name: row.created_by_name,
          created_at: row.created_at,
          updated_at: row.updated_at,
          version: row.version,
          status: row.status,
          quality_score: qualityMetrics?.overall_score,
          metadata: row.metadata,
          tags,
          similar_documents: [],
          usage_patterns: [],
          quality_metrics: qualityMetrics || this.getDefaultQualityMetrics()
        }
        documents.push(document)
      }

      return documents

    } catch (error) {
      logger.error('Failed to get documents by project', {
        project_id: projectId,
        error: error.message
      })
      return []
    }
  }

  async searchDocuments(query: string, filters?: DocumentFilters): Promise<DocumentHistory[]> {
    try {
      let sql = `
        SELECT 
          d.id,
          d.name,
          d.content,
          d.template_id,
          d.project_id,
          d.created_by,
          d.created_at,
          d.updated_at,
          d.version,
          d.status,
          d.metadata,
          t.name as template_name,
          t.framework,
          t.category,
          p.name as project_name,
          u.name as created_by_name
        FROM documents d
        LEFT JOIN templates t ON d.template_id = t.id
        LEFT JOIN projects p ON d.project_id = p.id
        LEFT JOIN users u ON d.created_by = u.id
        WHERE d.deleted_at IS NULL
      `
      const params: any[] = []
      let paramIndex = 1

      // Add text search
      if (query) {
        sql += ` AND (d.name ILIKE $${paramIndex} OR d.content ILIKE $${paramIndex})`
        params.push(`%${query}%`)
        paramIndex++
      }

      // Add filters
      if (filters) {
        if (filters.framework && filters.framework.length > 0) {
          sql += ` AND t.framework = ANY($${paramIndex})`
          params.push(filters.framework)
          paramIndex++
        }

        if (filters.category && filters.category.length > 0) {
          sql += ` AND t.category = ANY($${paramIndex})`
          params.push(filters.category)
          paramIndex++
        }

        if (filters.template_id) {
          sql += ` AND d.template_id = $${paramIndex}`
          params.push(filters.template_id)
          paramIndex++
        }

        if (filters.project_id) {
          sql += ` AND d.project_id = $${paramIndex}`
          params.push(filters.project_id)
          paramIndex++
        }

        if (filters.created_by) {
          sql += ` AND d.created_by = $${paramIndex}`
          params.push(filters.created_by)
          paramIndex++
        }

        if (filters.status && filters.status.length > 0) {
          sql += ` AND d.status = ANY($${paramIndex})`
          params.push(filters.status)
          paramIndex++
        }

        if (filters.created_from) {
          sql += ` AND d.created_at >= $${paramIndex}`
          params.push(filters.created_from)
          paramIndex++
        }

        if (filters.created_to) {
          sql += ` AND d.created_at <= $${paramIndex}`
          params.push(filters.created_to)
          paramIndex++
        }
      }

      sql += ` ORDER BY d.updated_at DESC LIMIT 50`

      const result = await pool.query(sql, params)

      const documents: DocumentHistory[] = []
      for (const row of result.rows) {
        const tags = await this.getDocumentTags(row.id)
        const qualityMetrics = await this.getDocumentQualityMetrics(row.id)

        const document: DocumentHistory = {
          document_id: row.id,
          name: row.name,
          content: row.content,
          template_id: row.template_id,
          template_name: row.template_name,
          framework: row.framework,
          category: row.category,
          project_id: row.project_id,
          project_name: row.project_name,
          created_by: row.created_by,
          created_by_name: row.created_by_name,
          created_at: row.created_at,
          updated_at: row.updated_at,
          version: row.version,
          status: row.status,
          quality_score: qualityMetrics?.overall_score,
          metadata: row.metadata,
          tags,
          similar_documents: [],
          usage_patterns: [],
          quality_metrics: qualityMetrics || this.getDefaultQualityMetrics()
        }
        documents.push(document)
      }

      return documents

    } catch (error) {
      logger.error('Failed to search documents', {
        query,
        filters,
        error: error.message
      })
      return []
    }
  }

  async getDocumentPatterns(framework: string, category?: string): Promise<UsagePattern[]> {
    try {
      let sql = `
        SELECT 
          pattern_type,
          pattern_data,
          frequency,
          confidence,
          examples
        FROM document_patterns dp
        WHERE dp.framework = $1
      `
      const params: any[] = [framework]
      let paramIndex = 2

      if (category) {
        sql += ` AND dp.category = $${paramIndex}`
        params.push(category)
        paramIndex++
      }

      sql += ` ORDER BY dp.frequency DESC, dp.confidence DESC LIMIT 20`

      const result = await pool.query(sql, params)

      return result.rows.map(row => ({
        pattern_type: row.pattern_type,
        pattern_data: row.pattern_data,
        frequency: row.frequency,
        confidence: row.confidence,
        examples: row.examples || []
      }))

    } catch (error) {
      logger.error('Failed to get document patterns', {
        framework,
        category,
        error: error.message
      })
      return []
    }
  }

  async getBestPractices(framework: string, category?: string): Promise<BestPractice[]> {
    try {
      let sql = `
        SELECT 
          id,
          name,
          description,
          framework,
          category,
          practice_type,
          effectiveness_score,
          usage_frequency,
          examples,
          implementation_guidance,
          success_metrics,
          metadata
        FROM best_practices bp
        WHERE bp.framework = $1
      `
      const params: any[] = [framework]
      let paramIndex = 2

      if (category) {
        sql += ` AND bp.category = $${paramIndex}`
        params.push(category)
        paramIndex++
      }

      sql += ` ORDER BY bp.effectiveness_score DESC, bp.usage_frequency DESC LIMIT 20`

      const result = await pool.query(sql, params)

      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        framework: row.framework,
        category: row.category,
        practice_type: row.practice_type,
        effectiveness_score: row.effectiveness_score,
        usage_frequency: row.usage_frequency,
        examples: row.examples || [],
        implementation_guidance: row.implementation_guidance,
        success_metrics: row.success_metrics || [],
        metadata: row.metadata
      }))

    } catch (error) {
      logger.error('Failed to get best practices', {
        framework,
        category,
        error: error.message
      })
      return []
    }
  }

  async getQualityTrends(timeframe: string): Promise<QualityTrend[]> {
    try {
      const result = await pool.query(
        `
        SELECT 
          timeframe,
          average_quality_score,
          trend_direction,
          data_points,
          framework_breakdown,
          category_breakdown,
          common_issues,
          improvement_areas
        FROM quality_trends qt
        WHERE qt.timeframe = $1
        ORDER BY qt.average_quality_score DESC
        `,
        [timeframe]
      )

      return result.rows.map(row => ({
        timeframe: row.timeframe,
        average_quality_score: row.average_quality_score,
        trend_direction: row.trend_direction,
        data_points: row.data_points,
        framework_breakdown: row.framework_breakdown || {},
        category_breakdown: row.category_breakdown || {},
        common_issues: row.common_issues || [],
        improvement_areas: row.improvement_areas || []
      }))

    } catch (error) {
      logger.error('Failed to get quality trends', {
        timeframe,
        error: error.message
      })
      return []
    }
  }

  private async getDocumentTags(documentId: string): Promise<string[]> {
    try {
      const result = await pool.query(
        `
        SELECT tag
        FROM document_tags dt
        WHERE dt.document_id = $1
        ORDER BY dt.tag
        `,
        [documentId]
      )

      return result.rows.map(row => row.tag)

    } catch (error) {
      logger.error('Failed to get document tags', {
        document_id: documentId,
        error: error.message
      })
      return []
    }
  }

  private async getDocumentQualityMetrics(documentId: string): Promise<QualityMetrics | null> {
    try {
      const result = await pool.query(
        `
        SELECT 
          completeness_score,
          clarity_score,
          accuracy_score,
          consistency_score,
          overall_score,
          assessment_date,
          assessor,
          feedback
        FROM document_quality_metrics dqm
        WHERE dqm.document_id = $1
        ORDER BY dqm.assessment_date DESC
        LIMIT 1
        `,
        [documentId]
      )

      if (result.rows.length === 0) {
        return null
      }

      const row = result.rows[0]

      return {
        completeness_score: row.completeness_score,
        clarity_score: row.clarity_score,
        accuracy_score: row.accuracy_score,
        consistency_score: row.consistency_score,
        overall_score: row.overall_score,
        assessment_date: row.assessment_date,
        assessor: row.assessor,
        feedback: row.feedback || []
      }

    } catch (error) {
      logger.error('Failed to get document quality metrics', {
        document_id: documentId,
        error: error.message
      })
      return null
    }
  }

  private getDefaultQualityMetrics(): QualityMetrics {
    return {
      completeness_score: 0,
      clarity_score: 0,
      accuracy_score: 0,
      consistency_score: 0,
      overall_score: 0,
      assessment_date: new Date(),
      assessor: 'system',
      feedback: []
    }
  }
}
