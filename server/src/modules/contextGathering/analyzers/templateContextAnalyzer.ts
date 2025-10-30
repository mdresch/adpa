/**
 * Template Context Analyzer
 * Analyzes template data for context gathering
 */

import { logger } from '@/utils/logger'
import { pool } from '@/database/connection'
import { ContextRetrievalService } from '@/modules/contextRetrieval/contextRetrievalService'
import type { TemplateContextData } from '../types'

export class TemplateContextAnalyzer {
  private retrieval?: ContextRetrievalService

  constructor(retrieval?: ContextRetrievalService) {
    this.retrieval = retrieval
  }

  async analyzeTemplateContext(templateId: string): Promise<TemplateContextData> {
    try {
      logger.debug('Analyzing template context', { templateId })

      const startTime = Date.now()

      // Gather template data
      const templateData = await this.gatherTemplateData(templateId)
      const templateVariables = await this.gatherTemplateVariables(templateId)
      const templateStructure = await this.analyzeTemplateStructure(templateId)
      const templateMetadata = await this.gatherTemplateMetadata(templateId)

      // Analyze template usage and performance
      const usageStats = await this.analyzeTemplateUsageStats(templateId)
      const qualityMetrics = await this.analyzeTemplateQualityMetrics(templateId)
      const performanceMetrics = await this.analyzeTemplatePerformanceMetrics(templateId)

      // Gather template feedback and improvements
      const feedback = await this.gatherTemplateFeedback(templateId)
      const improvements = await this.gatherTemplateImprovements(templateId)
      const dependencies = await this.gatherTemplateDependencies(templateId)
      const customizations = await this.gatherTemplateCustomizations(templateId)

      // Analyze template validation and access controls
      const validationRules = await this.gatherTemplateValidationRules(templateId)
      const accessControls = await this.gatherTemplateAccessControls(templateId)
      const collaborationData = await this.gatherTemplateCollaborationData(templateId)

      // Gather template version and approval history
      const versionHistory = await this.gatherTemplateVersionHistory(templateId)
      const approvalHistory = await this.gatherTemplateApprovalHistory(templateId)

      const templateContext: TemplateContextData = {
        template_id: templateId,
        template_name: templateData.name || 'Unknown Template',
        template_description: templateData.description || '',
        template_framework: templateData.framework || 'Unknown',
        template_category: templateData.category || 'General',
        template_type: templateData.type || 'document',
        template_version: templateData.version || '1.0.0',
        template_variables: templateVariables,
        template_structure: templateStructure,
        template_metadata: templateMetadata,
        template_usage_stats: usageStats,
        template_quality_metrics: qualityMetrics,
        template_performance_metrics: performanceMetrics,
        template_feedback: feedback,
        template_improvements: improvements,
        template_dependencies: dependencies,
        template_customizations: customizations,
        template_validation_rules: validationRules,
        template_access_controls: accessControls,
        template_collaboration_data: collaborationData,
        template_version_history: versionHistory,
        template_approval_history: approvalHistory,
        metadata: {
          analysis_timestamp: new Date(),
          analysis_duration: Date.now() - startTime,
          template_id: templateId,
          data_sources: ['template_database', 'usage_metrics', 'feedback_data'],
          data_freshness: new Date(),
          analysis_confidence: 0.9
        }
      }

      // Optional RAG enrichment for template-targeted context
      if (process.env.ENABLE_RAG_CONTEXT_RETRIEVAL === 'true' && this.retrieval) {
        try {
          const framework = templateData.framework || ''
          const queries = [
            `validation rules for ${framework} sections`,
            'examples of high-quality outputs for this template',
            'common pitfalls and corrections for this template type',
            'variable resolution examples and guidance'
          ]
          const ragChunks = [] as Array<{ chunk_id: string; document_id: string; title: string | null; score: number; content_preview: string }>
          for (const q of queries) {
            const found = await this.retrieval.searchChunks({ projectId: templateMetadata?.project_id || '', query: q, topK: 8 })
            for (const c of found) {
              ragChunks.push({
                chunk_id: c.id,
                document_id: c.document_id,
                title: c.title,
                score: c.score,
                content_preview: c.content.substring(0, 400)
              })
            }
          }
          if (ragChunks.length > 0) {
            ;(templateContext as any).rag_template_context = ragChunks
            templateContext.metadata.data_sources.push('rag_template_chunks')
          }
        } catch (e: any) {
          logger.warn('RAG template context enrichment skipped', { error: e.message })
        }
      }

      logger.info('Template context analysis completed', {
        templateId,
        variableCount: templateVariables.length,
        usageCount: usageStats.total_usage || 0,
        analysisTime: Date.now() - startTime
      })

      return templateContext

    } catch (error) {
      logger.error('Template context analysis failed', {
        templateId,
        error: error.message
      })
      throw error
    }
  }

  private async gatherTemplateData(templateId: string): Promise<any> {
    try {
      const result = await pool.query(
        'SELECT * FROM templates WHERE id = $1',
        [templateId]
      )

      if (result.rows.length === 0) {
        throw new Error(`Template not found: ${templateId}`)
      }

      return result.rows[0]

    } catch (error) {
      logger.error('Failed to gather template data', {
        templateId,
        error: error.message
      })
      throw error
    }
  }

  private async gatherTemplateVariables(templateId: string): Promise<any[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM template_variables WHERE template_id = $1',
        [templateId]
      )

      return result.rows.map(row => ({
        variable_id: row.id,
        variable_name: row.variable_name,
        variable_type: row.variable_type,
        variable_definition: row.variable_definition,
        validation_rules: row.validation_rules || [],
        resolution_hints: row.resolution_hints || [],
        metadata: row.metadata || {}
      }))

    } catch (error) {
      logger.error('Failed to gather template variables', {
        templateId,
        error: error.message
      })
      return []
    }
  }

  private async analyzeTemplateStructure(templateId: string): Promise<any> {
    try {
      const result = await pool.query(
        'SELECT * FROM template_structure WHERE template_id = $1',
        [templateId]
      )

      if (result.rows.length === 0) {
        return {
          structure_id: `structure_${templateId}`,
          sections: [],
          hierarchy: {
            root_section: 'main',
            section_relationships: []
          },
          complexity_score: 0.5,
          structure_metadata: {},
          metadata: {}
        }
      }

      const structure = result.rows[0]
      return {
        structure_id: structure.id,
        sections: structure.sections || [],
        hierarchy: structure.hierarchy || {
          root_section: 'main',
          section_relationships: []
        },
        complexity_score: this.calculateStructureComplexity(structure),
        structure_metadata: structure.metadata || {},
        metadata: {}
      }

    } catch (error) {
      logger.error('Failed to analyze template structure', {
        templateId,
        error: error.message
      })
      return {
        structure_id: `structure_${templateId}`,
        sections: [],
        hierarchy: {
          root_section: 'main',
          section_relationships: []
        },
        complexity_score: 0.5,
        structure_metadata: {},
        metadata: {}
      }
    }
  }

  private async gatherTemplateMetadata(templateId: string): Promise<any> {
    try {
      const result = await pool.query(
        'SELECT * FROM template_metadata WHERE template_id = $1',
        [templateId]
      )

      if (result.rows.length === 0) {
        return {
        metadata_id: `metadata_${templateId}`,
        template_id: templateId,
        metadata: {},
        created_at: new Date(),
        updated_at: new Date()
        }
      }

      return result.rows[0]

    } catch (error) {
      logger.error('Failed to gather template metadata', {
        templateId,
        error: error.message
      })
      return {
        metadata_id: `metadata_${templateId}`,
        template_id: templateId,
        metadata: {},
        created_at: new Date(),
        updated_at: new Date()
      }
    }
  }

  private async analyzeTemplateUsageStats(templateId: string): Promise<any> {
    try {
      const result = await pool.query(`
        SELECT 
          COUNT(*) as total_usage,
          COUNT(DISTINCT created_by) as unique_users,
          AVG(quality_score) as avg_quality,
          MIN(created_at) as first_usage,
          MAX(created_at) as last_usage,
          COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as recent_usage
        FROM document_history 
        WHERE template_id = $1
      `, [templateId])

      if (result.rows.length === 0) {
        return {
          total_usage: 0,
          unique_users: 0,
          avg_quality: 0.0,
          first_usage: null,
          last_usage: null,
          recent_usage: 0,
          usage_frequency: 'low',
          popularity_score: 0.0,
          metadata: {}
        }
      }

      const row = result.rows[0]
      const totalUsage = parseInt(row.total_usage)
      const uniqueUsers = parseInt(row.unique_users)
      const recentUsage = parseInt(row.recent_usage)

      return {
        total_usage: totalUsage,
        unique_users: uniqueUsers,
        avg_quality: parseFloat(row.avg_quality) || 0.0,
        first_usage: row.first_usage,
        last_usage: row.last_usage,
        recent_usage: recentUsage,
        usage_frequency: this.calculateUsageFrequency(totalUsage),
        popularity_score: this.calculatePopularityScore(totalUsage, uniqueUsers, recentUsage),
        metadata: {}
      }

    } catch (error) {
      logger.error('Failed to analyze template usage stats', {
        templateId,
        error: error.message
      })
      return {
        total_usage: 0,
        unique_users: 0,
        avg_quality: 0.0,
        first_usage: null,
        last_usage: null,
        recent_usage: 0,
        usage_frequency: 'low',
        popularity_score: 0.0,
        metadata: {}
      }
    }
  }

  private async analyzeTemplateQualityMetrics(templateId: string): Promise<any> {
    try {
      const result = await pool.query(`
        SELECT 
          AVG(quality_score) as avg_quality,
          MIN(quality_score) as min_quality,
          MAX(quality_score) as max_quality,
          COUNT(CASE WHEN quality_score >= 0.8 THEN 1 END) as high_quality_count,
          COUNT(CASE WHEN quality_score < 0.5 THEN 1 END) as low_quality_count,
          COUNT(CASE WHEN quality_score >= 0.5 AND quality_score < 0.8 THEN 1 END) as medium_quality_count
        FROM document_history 
        WHERE template_id = $1
      `, [templateId])

      if (result.rows.length === 0) {
        return {
          avg_quality: 0.0,
          min_quality: 0.0,
          max_quality: 0.0,
          quality_distribution: {
            high_quality: 0,
            medium_quality: 0,
            low_quality: 0
          },
          quality_trend: 'stable',
          quality_consistency: 0.0,
          metadata: {}
        }
      }

      const row = result.rows[0]
      const totalDocuments = parseInt(row.high_quality_count) + parseInt(row.medium_quality_count) + parseInt(row.low_quality_count)

      return {
        avg_quality: parseFloat(row.avg_quality) || 0.0,
        min_quality: parseFloat(row.min_quality) || 0.0,
        max_quality: parseFloat(row.max_quality) || 0.0,
        quality_distribution: {
          high_quality: parseInt(row.high_quality_count),
          medium_quality: parseInt(row.medium_quality_count),
          low_quality: parseInt(row.low_quality_count)
        },
        quality_trend: this.calculateQualityTrend(parseFloat(row.avg_quality)),
        quality_consistency: this.calculateQualityConsistency(
          parseFloat(row.min_quality),
          parseFloat(row.max_quality),
          parseFloat(row.avg_quality)
        ),
        metadata: {}
      }

    } catch (error) {
      logger.error('Failed to analyze template quality metrics', {
        templateId,
        error: error.message
      })
      return {
        avg_quality: 0.0,
        min_quality: 0.0,
        max_quality: 0.0,
        quality_distribution: {
          high_quality: 0,
          medium_quality: 0,
          low_quality: 0
        },
        quality_trend: 'stable',
        quality_consistency: 0.0,
        metadata: {}
      }
    }
  }

  private async analyzeTemplatePerformanceMetrics(templateId: string): Promise<any> {
    try {
      const result = await pool.query(`
        SELECT 
          COUNT(*) as total_documents,
          AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_generation_time,
          MIN(EXTRACT(EPOCH FROM (updated_at - created_at))) as min_generation_time,
          MAX(EXTRACT(EPOCH FROM (updated_at - created_at))) as max_generation_time,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
          COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_count,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count
        FROM document_history 
        WHERE template_id = $1
      `, [templateId])

      if (result.rows.length === 0) {
        return {
          total_documents: 0,
          avg_generation_time: 0,
          min_generation_time: 0,
          max_generation_time: 0,
          completion_rate: 0.0,
          success_rate: 0.0,
          performance_trend: 'stable',
          metadata: {}
        }
      }

      const row = result.rows[0]
      const totalDocuments = parseInt(row.total_documents)
      const completedCount = parseInt(row.completed_count)
      const failedCount = parseInt(row.failed_count)

      return {
        total_documents: totalDocuments,
        avg_generation_time: parseFloat(row.avg_generation_time) || 0.0,
        min_generation_time: parseFloat(row.min_generation_time) || 0.0,
        max_generation_time: parseFloat(row.max_generation_time) || 0.0,
        completion_rate: totalDocuments > 0 ? completedCount / totalDocuments : 0.0,
        success_rate: totalDocuments > 0 ? (completedCount + parseInt(row.draft_count)) / totalDocuments : 0.0,
        performance_trend: this.calculatePerformanceTrend(parseFloat(row.avg_generation_time)),
        metadata: {}
      }

    } catch (error) {
      logger.error('Failed to analyze template performance metrics', {
        templateId,
        error: error.message
      })
      return {
        total_documents: 0,
        avg_generation_time: 0,
        min_generation_time: 0,
        max_generation_time: 0,
        completion_rate: 0.0,
        success_rate: 0.0,
        performance_trend: 'stable',
        metadata: {}
      }
    }
  }

  private async gatherTemplateFeedback(templateId: string): Promise<any[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM template_feedback WHERE template_id = $1 ORDER BY created_at DESC',
        [templateId]
      )

      return result.rows.map(row => ({
        feedback_id: row.id,
        template_id: row.template_id,
        user_id: row.user_id,
        feedback_type: row.feedback_type,
        feedback_content: row.feedback_content,
        feedback_rating: row.feedback_rating,
        feedback_sentiment: row.feedback_sentiment,
        created_at: row.created_at,
        metadata: {}
      }))

    } catch (error) {
      logger.error('Failed to gather template feedback', {
        templateId,
        error: error.message
      })
      return []
    }
  }

  private async gatherTemplateImprovements(templateId: string): Promise<any[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM template_improvements WHERE template_id = $1 ORDER BY created_at DESC',
        [templateId]
      )

      return result.rows.map(row => ({
        improvement_id: row.id,
        template_id: row.template_id,
        improvement_type: row.improvement_type,
        improvement_description: row.improvement_description,
        improvement_priority: row.improvement_priority,
        improvement_status: row.improvement_status,
        improvement_impact: row.improvement_impact,
        created_at: row.created_at,
        metadata: {}
      }))

    } catch (error) {
      logger.error('Failed to gather template improvements', {
        templateId,
        error: error.message
      })
      return []
    }
  }

  private async gatherTemplateDependencies(templateId: string): Promise<any[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM template_dependencies WHERE template_id = $1',
        [templateId]
      )

      return result.rows.map(row => ({
        dependency_id: row.id,
        template_id: row.template_id,
        dependency_type: row.dependency_type,
        dependency_target: row.dependency_target,
        dependency_relationship: row.dependency_relationship,
        dependency_required: row.dependency_required,
        metadata: {}
      }))

    } catch (error) {
      logger.error('Failed to gather template dependencies', {
        templateId,
        error: error.message
      })
      return []
    }
  }

  private async gatherTemplateCustomizations(templateId: string): Promise<any[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM template_customizations WHERE template_id = $1',
        [templateId]
      )

      return result.rows.map(row => ({
        customization_id: row.id,
        template_id: row.template_id,
        user_id: row.user_id,
        customization_type: row.customization_type,
        customization_data: row.customization_data,
        customization_active: row.customization_active,
        created_at: row.created_at,
        metadata: {}
      }))

    } catch (error) {
      logger.error('Failed to gather template customizations', {
        templateId,
        error: error.message
      })
      return []
    }
  }

  private async gatherTemplateValidationRules(templateId: string): Promise<any[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM template_validation_rules WHERE template_id = $1',
        [templateId]
      )

      return result.rows.map(row => ({
        rule_id: row.id,
        template_id: row.template_id,
        rule_type: row.rule_type,
        rule_expression: row.rule_expression,
        rule_message: row.rule_message,
        rule_severity: row.rule_severity,
        rule_active: row.rule_active,
        metadata: {}
      }))

    } catch (error) {
      logger.error('Failed to gather template validation rules', {
        templateId,
        error: error.message
      })
      return []
    }
  }

  private async gatherTemplateAccessControls(templateId: string): Promise<any[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM template_access_controls WHERE template_id = $1',
        [templateId]
      )

      return result.rows.map(row => ({
        access_control_id: row.id,
        template_id: row.template_id,
        access_type: row.access_type,
        access_level: row.access_level,
        access_conditions: row.access_conditions,
        access_permissions: row.access_permissions,
        metadata: {}
      }))

    } catch (error) {
      logger.error('Failed to gather template access controls', {
        templateId,
        error: error.message
      })
      return []
    }
  }

  private async gatherTemplateCollaborationData(templateId: string): Promise<any> {
    try {
      const result = await pool.query(
        'SELECT * FROM template_collaboration WHERE template_id = $1',
        [templateId]
      )

      if (result.rows.length === 0) {
        return {
          collaboration_id: `collaboration_${templateId}`,
          template_id: templateId,
          collaborators: [],
          collaboration_history: [],
          collaboration_permissions: [],
          metadata: {}
        }
      }

      return result.rows[0]

    } catch (error) {
      logger.error('Failed to gather template collaboration data', {
        templateId,
        error: error.message
      })
      return {
        collaboration_id: `collaboration_${templateId}`,
        template_id: templateId,
        collaborators: [],
        collaboration_history: [],
        collaboration_permissions: [],
        metadata: {}
      }
    }
  }

  private async gatherTemplateVersionHistory(templateId: string): Promise<any[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM template_version_history WHERE template_id = $1 ORDER BY version_number DESC',
        [templateId]
      )

      return result.rows.map(row => ({
        version_id: row.id,
        template_id: row.template_id,
        version_number: row.version_number,
        version_description: row.version_description,
        version_changes: row.version_changes,
        version_author: row.version_author,
        version_timestamp: row.created_at,
        metadata: {}
      }))

    } catch (error) {
      logger.error('Failed to gather template version history', {
        templateId,
        error: error.message
      })
      return []
    }
  }

  private async gatherTemplateApprovalHistory(templateId: string): Promise<any[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM template_approval_history WHERE template_id = $1 ORDER BY created_at DESC',
        [templateId]
      )

      return result.rows.map(row => ({
        approval_id: row.id,
        template_id: row.template_id,
        approval_status: row.approval_status,
        approval_author: row.approval_author,
        approval_notes: row.approval_notes,
        approval_timestamp: row.created_at,
        metadata: {}
      }))

    } catch (error) {
      logger.error('Failed to gather template approval history', {
        templateId,
        error: error.message
      })
      return []
    }
  }

  // Helper methods for calculations
  private calculateStructureComplexity(structure: any): number {
    // Simplified complexity calculation
    const sectionCount = structure.sections ? structure.sections.length : 0
    const relationshipCount = structure.hierarchy?.section_relationships?.length || 0
    
    return Math.min(1.0, (sectionCount * 0.1) + (relationshipCount * 0.05))
  }

  private calculateUsageFrequency(totalUsage: number): string {
    if (totalUsage >= 100) return 'high'
    if (totalUsage >= 20) return 'medium'
    return 'low'
  }

  private calculatePopularityScore(totalUsage: number, uniqueUsers: number, recentUsage: number): number {
    const usageScore = Math.min(1.0, totalUsage / 100)
    const userScore = Math.min(1.0, uniqueUsers / 50)
    const recentScore = Math.min(1.0, recentUsage / 20)
    
    return (usageScore + userScore + recentScore) / 3
  }

  private calculateQualityTrend(avgQuality: number): string {
    if (avgQuality >= 0.8) return 'improving'
    if (avgQuality >= 0.6) return 'stable'
    return 'declining'
  }

  private calculateQualityConsistency(minQuality: number, maxQuality: number, avgQuality: number): number {
    if (maxQuality === minQuality) return 1.0
    return 1.0 - ((maxQuality - minQuality) / avgQuality)
  }

  private calculatePerformanceTrend(avgGenerationTime: number): string {
    if (avgGenerationTime <= 300) return 'improving' // 5 minutes
    if (avgGenerationTime <= 600) return 'stable' // 10 minutes
    return 'declining'
  }

  /**
   * Gather semantic template examples using RAG
   * CR-2025-001: RAG Integration - Find similar high-quality template usage examples
   */
  async gatherSemanticTemplateExamples(templateId: string, projectId: string): Promise<any[]> {
    if (!this.retrieval) {
      logger.warn('[RAG] ContextRetrievalService not available for semantic template examples')
      return []
    }

    try {
      const semanticQuery = 'template examples best practices high quality successful generation patterns'
      
      logger.info('[RAG-TEMPLATE] Performing semantic search for template examples')
      
      const chunks = await this.retrieval.searchChunks({
        projectId,
        query: semanticQuery,
        topK: 15,
        templateId
      })

      logger.info(`[RAG-TEMPLATE] Retrieved ${chunks.length} semantically relevant template example chunks`)

      return chunks.map(chunk => ({
        chunk_id: chunk.id,
        document_id: chunk.document_id,
        document_title: chunk.title,
        content: chunk.content,
        relevance_score: chunk.score,
        retrieval_method: 'semantic_search',
        example_type: 'template_usage'
      }))

    } catch (error: unknown) {
      logger.error('[RAG-TEMPLATE] Semantic search failed', {
        error: error instanceof Error ? error.message : String(error)
      })
      return []
    }
  }
}
