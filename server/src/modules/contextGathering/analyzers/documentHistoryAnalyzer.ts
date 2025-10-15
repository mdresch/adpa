/**
 * Document History Analyzer
 * Analyzes document history for context gathering
 */

import { logger } from '@/utils/logger'
import { pool } from '@/database/connection'
import type { DocumentHistoryContextData } from '../types'

export class DocumentHistoryAnalyzer {
  async analyzeDocumentHistory(templateId: string, projectId: string, userId: string): Promise<DocumentHistoryContextData> {
    try {
      logger.debug('Analyzing document history context', {
        templateId,
        projectId,
        userId
      })

      const startTime = Date.now()

      // Gather document history data
      const documentHistory = await this.gatherDocumentHistory(templateId, projectId, userId)
      const usagePatterns = await this.analyzeUsagePatterns(templateId, projectId, userId)
      const qualityTrends = await this.analyzeQualityTrends(templateId, projectId, userId)
      const bestPractices = await this.gatherBestPractices(templateId, projectId, userId)
      const lessonsLearned = await this.gatherLessonsLearned(templateId, projectId, userId)

      // Analyze template usage and generation patterns
      const templateUsage = await this.analyzeTemplateUsage(templateId, projectId, userId)
      const generationPatterns = await this.analyzeGenerationPatterns(templateId, projectId, userId)
      const userInteractions = await this.analyzeUserInteractions(templateId, projectId, userId)

      // Analyze performance and quality metrics
      const performanceMetrics = await this.analyzeDocumentPerformanceMetrics(templateId, projectId, userId)
      const qualityMetrics = await this.analyzeDocumentQualityMetrics(templateId, projectId, userId)

      const documentHistoryContext: DocumentHistoryContextData = {
        document_history: documentHistory,
        usage_patterns: usagePatterns,
        quality_trends: qualityTrends,
        best_practices: bestPractices,
        lessons_learned: lessonsLearned,
        template_usage: templateUsage,
        generation_patterns: generationPatterns,
        user_interactions: userInteractions,
        feedback_history: await this.gatherFeedbackHistory(templateId, projectId, userId),
        revision_history: await this.gatherRevisionHistory(templateId, projectId, userId),
        collaboration_patterns: await this.analyzeCollaborationPatterns(templateId, projectId, userId),
        performance_metrics: performanceMetrics,
        quality_metrics: qualityMetrics,
        compliance_history: await this.gatherComplianceHistory(templateId, projectId, userId),
        approval_patterns: await this.analyzeApprovalPatterns(templateId, projectId, userId),
        distribution_patterns: await this.analyzeDistributionPatterns(templateId, projectId, userId),
        access_patterns: await this.analyzeAccessPatterns(templateId, projectId, userId),
        metadata: {
          analysis_timestamp: new Date(),
          analysis_duration: Date.now() - startTime,
          template_id: templateId,
          project_id: projectId,
          user_id: userId,
          data_sources: ['document_history', 'usage_patterns', 'quality_metrics'],
          data_freshness: new Date(),
          analysis_confidence: 0.9
        }
      }

      logger.info('Document history context analysis completed', {
        templateId,
        projectId,
        userId,
        documentCount: documentHistory.length,
        patternCount: usagePatterns.length,
        analysisTime: Date.now() - startTime
      })

      return documentHistoryContext

    } catch (error) {
      logger.error('Document history context analysis failed', {
        templateId,
        projectId,
        userId,
        error: error.message
      })
      throw error
    }
  }

  private async gatherDocumentHistory(templateId: string, projectId: string, userId: string): Promise<any[]> {
    try {
      const result = await pool.query(`
        SELECT * FROM document_history 
        WHERE template_id = $1 AND project_id = $2 AND created_by = $3
        ORDER BY created_at DESC
        LIMIT 100
      `, [templateId, projectId, userId])

      return result.rows.map(row => ({
        document_id: row.id,
        document_name: row.document_name,
        document_type: row.document_type,
        template_id: row.template_id,
        project_id: row.project_id,
        created_by: row.created_by,
        created_at: row.created_at,
        updated_at: row.updated_at,
        usage_count: row.usage_count || 0,
        quality_score: row.quality_score || 0.0,
        status: row.status || 'draft',
        metadata: {}
      }))

    } catch (error) {
      logger.error('Failed to gather document history', {
        templateId,
        projectId,
        userId,
        error: error.message
      })
      return []
    }
  }

  private async analyzeUsagePatterns(templateId: string, projectId: string, userId: string): Promise<any[]> {
    try {
      const result = await pool.query(`
        SELECT 
          DATE_TRUNC('day', created_at) as usage_date,
          COUNT(*) as usage_count,
          AVG(quality_score) as avg_quality,
          COUNT(DISTINCT created_by) as unique_users
        FROM document_history 
        WHERE template_id = $1 AND project_id = $2
        GROUP BY DATE_TRUNC('day', created_at)
        ORDER BY usage_date DESC
        LIMIT 30
      `, [templateId, projectId])

      return result.rows.map(row => ({
        pattern_id: `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        pattern_type: 'daily_usage',
        pattern_description: `Daily usage pattern for template ${templateId}`,
        pattern_frequency: row.usage_count,
        pattern_confidence: 0.8,
        usage_date: row.usage_date,
        usage_count: parseInt(row.usage_count),
        avg_quality: parseFloat(row.avg_quality) || 0.0,
        unique_users: parseInt(row.unique_users),
        metadata: {}
      }))

    } catch (error) {
      logger.error('Failed to analyze usage patterns', {
        templateId,
        projectId,
        error: error.message
      })
      return []
    }
  }

  private async analyzeQualityTrends(templateId: string, projectId: string, userId: string): Promise<any[]> {
    try {
      const result = await pool.query(`
        SELECT 
          DATE_TRUNC('week', created_at) as week,
          AVG(quality_score) as avg_quality,
          MIN(quality_score) as min_quality,
          MAX(quality_score) as max_quality,
          COUNT(*) as document_count
        FROM document_history 
        WHERE template_id = $1 AND project_id = $2
        GROUP BY DATE_TRUNC('week', created_at)
        ORDER BY week DESC
        LIMIT 12
      `, [templateId, projectId])

      return result.rows.map(row => ({
        trend_id: `trend_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        metric_name: 'quality_score',
        trend_data: [
          {
            timestamp: row.week,
            value: parseFloat(row.avg_quality) || 0.0,
            context: {
              min_quality: parseFloat(row.min_quality) || 0.0,
              max_quality: parseFloat(row.max_quality) || 0.0,
              document_count: parseInt(row.document_count)
            }
          }
        ],
        trend_direction: 'stable',
        metadata: {}
      }))

    } catch (error) {
      logger.error('Failed to analyze quality trends', {
        templateId,
        projectId,
        error: error.message
      })
      return []
    }
  }

  private async gatherBestPractices(templateId: string, projectId: string, userId: string): Promise<any[]> {
    try {
      const result = await pool.query(`
        SELECT * FROM best_practices 
        WHERE template_id = $1 OR project_id = $2
        ORDER BY effectiveness DESC
        LIMIT 20
      `, [templateId, projectId])

      return result.rows.map(row => ({
        practice_id: row.id,
        title: row.title,
        description: row.description,
        category: row.category || 'general',
        effectiveness: parseFloat(row.effectiveness) || 0.8,
        applicability: row.applicability || [],
        implementation_guidance: row.implementation_guidance || [],
        success_factors: row.success_factors || [],
        common_pitfalls: row.common_pitfalls || [],
        metadata: {}
      }))

    } catch (error) {
      logger.error('Failed to gather best practices', {
        templateId,
        projectId,
        error: error.message
      })
      return []
    }
  }

  private async gatherLessonsLearned(templateId: string, projectId: string, userId: string): Promise<any[]> {
    try {
      const result = await pool.query(`
        SELECT * FROM lessons_learned 
        WHERE template_id = $1 OR project_id = $2
        ORDER BY date_learned DESC
        LIMIT 20
      `, [templateId, projectId])

      return result.rows.map(row => ({
        lesson_id: row.id,
        title: row.title,
        description: row.description,
        category: row.category || 'general',
        impact: row.impact || 'medium',
        source: row.source || 'project_team',
        date_learned: row.date_learned || new Date(),
        applicability: row.applicability || [],
        recommendations: row.recommendations || [],
        metadata: {}
      }))

    } catch (error) {
      logger.error('Failed to gather lessons learned', {
        templateId,
        projectId,
        error: error.message
      })
      return []
    }
  }

  private async analyzeTemplateUsage(templateId: string, projectId: string, userId: string): Promise<any> {
    try {
      const result = await pool.query(`
        SELECT 
          COUNT(*) as total_usage,
          COUNT(DISTINCT created_by) as unique_users,
          AVG(quality_score) as avg_quality,
          MIN(created_at) as first_usage,
          MAX(created_at) as last_usage
        FROM document_history 
        WHERE template_id = $1
      `, [templateId])

      if (result.rows.length === 0) {
        return {
          template_id: templateId,
          total_usage: 0,
          unique_users: 0,
          avg_quality: 0.0,
          first_usage: null,
          last_usage: null,
          usage_frequency: 'low',
          quality_trend: 'stable',
          user_satisfaction: 0.0,
          metadata: {}
        }
      }

      const row = result.rows[0]
      return {
        template_id: templateId,
        total_usage: parseInt(row.total_usage),
        unique_users: parseInt(row.unique_users),
        avg_quality: parseFloat(row.avg_quality) || 0.0,
        first_usage: row.first_usage,
        last_usage: row.last_usage,
        usage_frequency: this.calculateUsageFrequency(parseInt(row.total_usage)),
        quality_trend: 'stable',
        user_satisfaction: parseFloat(row.avg_quality) || 0.0,
        metadata: {}
      }

    } catch (error) {
      logger.error('Failed to analyze template usage', {
        templateId,
        error: error.message
      })
      return {
        template_id: templateId,
        total_usage: 0,
        unique_users: 0,
        avg_quality: 0.0,
        first_usage: null,
        last_usage: null,
        usage_frequency: 'low',
        quality_trend: 'stable',
        user_satisfaction: 0.0,
        metadata: {}
      }
    }
  }

  private async analyzeGenerationPatterns(templateId: string, projectId: string, userId: string): Promise<any[]> {
    try {
      const result = await pool.query(`
        SELECT 
          DATE_TRUNC('hour', created_at) as hour,
          COUNT(*) as generation_count,
          AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_generation_time
        FROM document_history 
        WHERE template_id = $1 AND project_id = $2
        GROUP BY DATE_TRUNC('hour', created_at)
        ORDER BY hour DESC
        LIMIT 24
      `, [templateId, projectId])

      return result.rows.map(row => ({
        pattern_id: `gen_pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        pattern_type: 'generation_timing',
        pattern_description: `Generation patterns for template ${templateId}`,
        pattern_frequency: parseInt(row.generation_count),
        pattern_confidence: 0.7,
        hour: row.hour,
        generation_count: parseInt(row.generation_count),
        avg_generation_time: parseFloat(row.avg_generation_time) || 0.0,
        metadata: {}
      }))

    } catch (error) {
      logger.error('Failed to analyze generation patterns', {
        templateId,
        projectId,
        error: error.message
      })
      return []
    }
  }

  private async analyzeUserInteractions(templateId: string, projectId: string, userId: string): Promise<any[]> {
    try {
      const result = await pool.query(`
        SELECT 
          created_by,
          COUNT(*) as interaction_count,
          AVG(quality_score) as avg_quality,
          MIN(created_at) as first_interaction,
          MAX(created_at) as last_interaction
        FROM document_history 
        WHERE template_id = $1 AND project_id = $2
        GROUP BY created_by
        ORDER BY interaction_count DESC
        LIMIT 10
      `, [templateId, projectId])

      return result.rows.map(row => ({
        interaction_id: `interaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        user_id: row.created_by,
        interaction_type: 'document_generation',
        interaction_count: parseInt(row.interaction_count),
        avg_quality: parseFloat(row.avg_quality) || 0.0,
        first_interaction: row.first_interaction,
        last_interaction: row.last_interaction,
        interaction_frequency: this.calculateInteractionFrequency(parseInt(row.interaction_count)),
        metadata: {}
      }))

    } catch (error) {
      logger.error('Failed to analyze user interactions', {
        templateId,
        projectId,
        error: error.message
      })
      return []
    }
  }

  private async analyzeDocumentPerformanceMetrics(templateId: string, projectId: string, userId: string): Promise<any> {
    try {
      const result = await pool.query(`
        SELECT 
          COUNT(*) as total_documents,
          AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_generation_time,
          AVG(quality_score) as avg_quality,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
          COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_count
        FROM document_history 
        WHERE template_id = $1 AND project_id = $2
      `, [templateId, projectId])

      if (result.rows.length === 0) {
        return {
          total_documents: 0,
          avg_generation_time: 0,
          avg_quality: 0.0,
          completion_rate: 0.0,
          success_rate: 0.0,
          performance_trends: [],
          metadata: {}
        }
      }

      const row = result.rows[0]
      const totalDocuments = parseInt(row.total_documents)
      const completedCount = parseInt(row.completed_count)
      const draftCount = parseInt(row.draft_count)

      return {
        total_documents: totalDocuments,
        avg_generation_time: parseFloat(row.avg_generation_time) || 0.0,
        avg_quality: parseFloat(row.avg_quality) || 0.0,
        completion_rate: totalDocuments > 0 ? completedCount / totalDocuments : 0.0,
        success_rate: totalDocuments > 0 ? completedCount / totalDocuments : 0.0,
        performance_trends: [],
        metadata: {
          analysis_timestamp: new Date(),
          template_id: templateId,
          project_id: projectId
        }
      }

    } catch (error) {
      logger.error('Failed to analyze document performance metrics', {
        templateId,
        projectId,
        error: error.message
      })
      return {
        total_documents: 0,
        avg_generation_time: 0,
        avg_quality: 0.0,
        completion_rate: 0.0,
        success_rate: 0.0,
        performance_trends: [],
        metadata: {
          analysis_timestamp: new Date(),
          error: error.message
        }
      }
    }
  }

  private async analyzeDocumentQualityMetrics(templateId: string, projectId: string, userId: string): Promise<any> {
    try {
      const result = await pool.query(`
        SELECT 
          AVG(quality_score) as avg_quality,
          MIN(quality_score) as min_quality,
          MAX(quality_score) as max_quality,
          COUNT(CASE WHEN quality_score >= 0.8 THEN 1 END) as high_quality_count,
          COUNT(CASE WHEN quality_score < 0.5 THEN 1 END) as low_quality_count
        FROM document_history 
        WHERE template_id = $1 AND project_id = $2
      `, [templateId, projectId])

      if (result.rows.length === 0) {
        return {
          avg_quality: 0.0,
          min_quality: 0.0,
          max_quality: 0.0,
          quality_distribution: {},
          quality_trends: [],
          metadata: {}
        }
      }

      const row = result.rows[0]
      const totalDocuments = parseInt(row.high_quality_count) + parseInt(row.low_quality_count)

      return {
        avg_quality: parseFloat(row.avg_quality) || 0.0,
        min_quality: parseFloat(row.min_quality) || 0.0,
        max_quality: parseFloat(row.max_quality) || 0.0,
        quality_distribution: {
          high_quality: parseInt(row.high_quality_count),
          low_quality: parseInt(row.low_quality_count),
          total_documents: totalDocuments
        },
        quality_trends: [],
        metadata: {
          analysis_timestamp: new Date(),
          template_id: templateId,
          project_id: projectId
        }
      }

    } catch (error) {
      logger.error('Failed to analyze document quality metrics', {
        templateId,
        projectId,
        error: error.message
      })
      return {
        avg_quality: 0.0,
        min_quality: 0.0,
        max_quality: 0.0,
        quality_distribution: {},
        quality_trends: [],
        metadata: {
          analysis_timestamp: new Date(),
          error: error.message
        }
      }
    }
  }

  // Additional helper methods
  private calculateUsageFrequency(usageCount: number): string {
    if (usageCount >= 100) return 'high'
    if (usageCount >= 20) return 'medium'
    return 'low'
  }

  private calculateInteractionFrequency(interactionCount: number): string {
    if (interactionCount >= 10) return 'high'
    if (interactionCount >= 3) return 'medium'
    return 'low'
  }

  private async gatherFeedbackHistory(templateId: string, projectId: string, userId: string): Promise<any[]> {
    return []
  }

  private async gatherRevisionHistory(templateId: string, projectId: string, userId: string): Promise<any[]> {
    return []
  }

  private async analyzeCollaborationPatterns(templateId: string, projectId: string, userId: string): Promise<any[]> {
    return []
  }

  private async gatherComplianceHistory(templateId: string, projectId: string, userId: string): Promise<any[]> {
    return []
  }

  private async analyzeApprovalPatterns(templateId: string, projectId: string, userId: string): Promise<any[]> {
    return []
  }

  private async analyzeDistributionPatterns(templateId: string, projectId: string, userId: string): Promise<any[]> {
    return []
  }

  private async analyzeAccessPatterns(templateId: string, projectId: string, userId: string): Promise<any[]> {
    return []
  }
}
