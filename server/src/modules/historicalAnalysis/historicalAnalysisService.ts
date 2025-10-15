/**
 * Historical Analysis Service
 * Main service for historical document analysis and pattern recognition
 */

import { logger } from '../../utils/logger'
import { pool } from '../../database/connection'
import { DocumentAnalyzer } from './services/documentAnalyzer'
import { PatternRecognitionService } from './services/patternRecognitionService'
import type {
  HistoricalAnalysisService as IHistoricalAnalysisService,
  DocumentAnalysis,
  PatternRecognitionResult,
  BestPractice,
  ImprovementSuggestion,
  HistoricalTrend,
  FrameworkAnalysis,
  UserAnalysis,
  ProjectAnalysis,
  TrendFilters,
  RecommendationContext,
  PatternValidationResult
} from './types'

export interface HistoricalAnalysisConfig {
  enableLearning: boolean
  learningThreshold: number
  minPatternFrequency: number
  minConfidence: number
  maxAnalysisDepth: number
  enableTrendAnalysis: boolean
  trendAnalysisWindow: number
}

export class HistoricalAnalysisService implements IHistoricalAnalysisService {
  private documentAnalyzer: DocumentAnalyzer
  private patternRecognitionService: PatternRecognitionService
  private config: HistoricalAnalysisConfig

  constructor(config: HistoricalAnalysisConfig) {
    this.config = config
    this.documentAnalyzer = new DocumentAnalyzer()
    this.patternRecognitionService = new PatternRecognitionService({
      minPatternFrequency: config.minPatternFrequency,
      minConfidence: config.minConfidence,
      maxPatternsPerDocument: 20,
      enableLearning: config.enableLearning,
      learningThreshold: config.learningThreshold
    })
  }

  async analyzeDocumentPatterns(documentId: string): Promise<PatternRecognitionResult> {
    try {
      logger.info('Starting document pattern analysis', { documentId })

      const result = await this.patternRecognitionService.analyzeDocumentPatterns(documentId)

      logger.info('Document pattern analysis completed', {
        documentId,
        patternsFound: result.patterns_found.length,
        confidence: result.pattern_confidence
      })

      return result

    } catch (error) {
      logger.error('Failed to analyze document patterns', {
        documentId,
        error: error.message
      })
      throw error
    }
  }

  async detectPatterns(content: string, framework: string): Promise<any[]> {
    try {
      logger.debug('Detecting patterns in content', { contentLength: content.length, framework })

      const patterns = await this.patternRecognitionService.detectPatterns(content, framework)

      logger.info('Pattern detection completed', {
        framework,
        patternsDetected: patterns.length
      })

      return patterns

    } catch (error) {
      logger.error('Failed to detect patterns', {
        contentLength: content.length,
        framework,
        error: error.message
      })
      return []
    }
  }

  async identifyBestPractices(documentId: string): Promise<BestPractice[]> {
    try {
      logger.info('Identifying best practices', { documentId })

      const bestPractices = await this.patternRecognitionService.identifyBestPractices(documentId)

      logger.info('Best practices identification completed', {
        documentId,
        bestPracticesCount: bestPractices.length
      })

      return bestPractices

    } catch (error) {
      logger.error('Failed to identify best practices', {
        documentId,
        error: error.message
      })
      return []
    }
  }

  async compareWithHistoricalData(documentId: string): Promise<DocumentAnalysis> {
    try {
      logger.info('Comparing with historical data', { documentId })

      // Get document information
      const document = await this.getDocument(documentId)
      if (!document) {
        throw new Error(`Document not found: ${documentId}`)
      }

      // Perform comprehensive analysis
      const [
        patternAnalysis,
        bestPractices,
        qualityMetrics,
        complianceAssessment
      ] = await Promise.all([
        this.analyzeDocumentPatterns(documentId),
        this.identifyBestPractices(documentId),
        this.documentAnalyzer.assessQuality(document.content, document.framework),
        this.documentAnalyzer.assessCompliance(document.content, document.framework)
      ])

      // Generate improvement suggestions
      const improvementSuggestions = await this.identifyImprovementOpportunities(documentId)

      const analysis: DocumentAnalysis = {
        document_id: documentId,
        analysis_type: 'comprehensive_analysis',
        patterns_detected: patternAnalysis.patterns_found.map(p => ({
          id: p.pattern_id,
          pattern_type: p.pattern_type,
          pattern_name: p.pattern_name,
          description: '',
          framework: document.framework,
          category: document.category || '',
          frequency: p.confidence,
          confidence: p.confidence,
          effectiveness_score: p.match_score,
          examples: p.variations,
          implementation_guidance: '',
          success_metrics: [],
          metadata: {},
          created_at: new Date(),
          updated_at: new Date()
        })),
        best_practices_applied: bestPractices,
        quality_metrics: qualityMetrics,
        compliance_score: complianceAssessment.compliance_score,
        improvement_suggestions: improvementSuggestions,
        metadata: {
          framework: document.framework,
          category: document.category,
          analyzed_at: new Date().toISOString()
        },
        analyzed_at: new Date()
      }

      // Store analysis results
      await this.storeDocumentAnalysis(analysis)

      logger.info('Historical data comparison completed', {
        documentId,
        patternsDetected: analysis.patterns_detected.length,
        bestPracticesApplied: analysis.best_practices_applied.length,
        improvementSuggestions: analysis.improvement_suggestions.length
      })

      return analysis

    } catch (error) {
      logger.error('Failed to compare with historical data', {
        documentId,
        error: error.message
      })
      throw error
    }
  }

  async analyzeQualityTrends(timeframe: string, filters?: TrendFilters): Promise<HistoricalTrend[]> {
    try {
      logger.info('Analyzing quality trends', { timeframe, filters })

      // Get quality data for the timeframe
      const qualityData = await this.getQualityTrendData(timeframe, filters)
      
      // Calculate trends
      const trends = this.calculateQualityTrends(qualityData, timeframe)

      logger.info('Quality trends analysis completed', {
        timeframe,
        trendsCount: trends.length
      })

      return trends

    } catch (error) {
      logger.error('Failed to analyze quality trends', {
        timeframe,
        filters,
        error: error.message
      })
      return []
    }
  }

  async analyzeFrameworkTrends(framework: string, timeframe: string): Promise<FrameworkAnalysis> {
    try {
      logger.info('Analyzing framework trends', { framework, timeframe })

      // Get framework-specific data
      const [
        totalDocuments,
        averageQualityScore,
        commonPatterns,
        bestPractices,
        qualityTrends,
        improvementAreas,
        strengths,
        recommendations
      ] = await Promise.all([
        this.getFrameworkDocumentCount(framework, timeframe),
        this.getFrameworkAverageQuality(framework, timeframe),
        this.getFrameworkCommonPatterns(framework),
        this.getFrameworkBestPractices(framework),
        this.analyzeQualityTrends(timeframe, { framework: [framework] }),
        this.identifyFrameworkImprovementAreas(framework),
        this.identifyFrameworkStrengths(framework),
        this.generateFrameworkRecommendations(framework)
      ])

      const analysis: FrameworkAnalysis = {
        framework,
        total_documents: totalDocuments,
        average_quality_score: averageQualityScore,
        common_patterns: commonPatterns,
        best_practices: bestPractices,
        quality_trends: qualityTrends,
        improvement_areas: improvementAreas,
        strengths,
        recommendations,
        analyzed_at: new Date()
      }

      logger.info('Framework trends analysis completed', {
        framework,
        totalDocuments,
        averageQualityScore
      })

      return analysis

    } catch (error) {
      logger.error('Failed to analyze framework trends', {
        framework,
        timeframe,
        error: error.message
      })
      throw error
    }
  }

  async analyzeUserTrends(userId: string, timeframe: string): Promise<UserAnalysis> {
    try {
      logger.info('Analyzing user trends', { userId, timeframe })

      // Get user-specific data
      const [
        totalDocuments,
        averageQualityScore,
        writingPatterns,
        improvementAreas,
        strengths,
        recommendations,
        qualityTrends
      ] = await Promise.all([
        this.getUserDocumentCount(userId, timeframe),
        this.getUserAverageQuality(userId, timeframe),
        this.getUserWritingPatterns(userId),
        this.identifyUserImprovementAreas(userId),
        this.identifyUserStrengths(userId),
        this.generateUserRecommendations(userId),
        this.analyzeQualityTrends(timeframe, { user_id: userId })
      ])

      const analysis: UserAnalysis = {
        user_id: userId,
        total_documents: totalDocuments,
        average_quality_score: averageQualityScore,
        writing_patterns: writingPatterns,
        improvement_areas: improvementAreas,
        strengths,
        recommendations,
        quality_trends: qualityTrends,
        analyzed_at: new Date()
      }

      logger.info('User trends analysis completed', {
        userId,
        totalDocuments,
        averageQualityScore
      })

      return analysis

    } catch (error) {
      logger.error('Failed to analyze user trends', {
        userId,
        timeframe,
        error: error.message
      })
      throw error
    }
  }

  async analyzeProjectTrends(projectId: string, timeframe: string): Promise<ProjectAnalysis> {
    try {
      logger.info('Analyzing project trends', { projectId, timeframe })

      // Get project-specific data
      const [
        totalDocuments,
        averageQualityScore,
        documentTypes,
        qualityDistribution,
        commonIssues,
        bestPracticesApplied,
        improvementOpportunities
      ] = await Promise.all([
        this.getProjectDocumentCount(projectId, timeframe),
        this.getProjectAverageQuality(projectId, timeframe),
        this.getProjectDocumentTypes(projectId),
        this.getProjectQualityDistribution(projectId),
        this.identifyProjectCommonIssues(projectId),
        this.getProjectBestPracticesApplied(projectId),
        this.identifyProjectImprovementOpportunities(projectId)
      ])

      const analysis: ProjectAnalysis = {
        project_id: projectId,
        total_documents: totalDocuments,
        average_quality_score: averageQualityScore,
        document_types: documentTypes,
        quality_distribution: qualityDistribution,
        common_issues: commonIssues,
        best_practices_applied: bestPracticesApplied,
        improvement_opportunities: improvementOpportunities,
        analyzed_at: new Date()
      }

      logger.info('Project trends analysis completed', {
        projectId,
        totalDocuments,
        averageQualityScore
      })

      return analysis

    } catch (error) {
      logger.error('Failed to analyze project trends', {
        projectId,
        timeframe,
        error: error.message
      })
      throw error
    }
  }

  async extractBestPractices(framework: string, category?: string): Promise<BestPractice[]> {
    try {
      logger.info('Extracting best practices', { framework, category })

      // Get best practices from database
      const bestPractices = await this.getFrameworkBestPractices(framework, category)
      
      // Analyze historical documents to extract additional best practices
      const historicalBestPractices = await this.extractHistoricalBestPractices(framework, category)
      
      // Combine and rank best practices
      const allBestPractices = this.combineBestPractices(bestPractices, historicalBestPractices)
      const rankedBestPractices = this.rankBestPractices(allBestPractices)

      logger.info('Best practices extraction completed', {
        framework,
        category,
        bestPracticesCount: rankedBestPractices.length
      })

      return rankedBestPractices

    } catch (error) {
      logger.error('Failed to extract best practices', {
        framework,
        category,
        error: error.message
      })
      return []
    }
  }

  async identifyImprovementOpportunities(documentId: string): Promise<ImprovementSuggestion[]> {
    try {
      logger.info('Identifying improvement opportunities', { documentId })

      // Get document analysis
      const analysis = await this.compareWithHistoricalData(documentId)
      
      // Generate improvement suggestions based on analysis
      const suggestions = await this.generateImprovementSuggestions(analysis)

      logger.info('Improvement opportunities identification completed', {
        documentId,
        suggestionsCount: suggestions.length
      })

      return suggestions

    } catch (error) {
      logger.error('Failed to identify improvement opportunities', {
        documentId,
        error: error.message
      })
      return []
    }
  }

  async generateRecommendations(context: RecommendationContext): Promise<ImprovementSuggestion[]> {
    try {
      logger.info('Generating recommendations', { context })

      // Get user analysis
      const userAnalysis = await this.analyzeUserTrends(context.user_id, 'monthly')
      
      // Get framework analysis
      const frameworkAnalysis = await this.analyzeFrameworkTrends(context.framework, 'monthly')
      
      // Generate personalized recommendations
      const recommendations = await this.generatePersonalizedRecommendations(context, userAnalysis, frameworkAnalysis)

      logger.info('Recommendations generation completed', {
        userId: context.user_id,
        framework: context.framework,
        recommendationsCount: recommendations.length
      })

      return recommendations

    } catch (error) {
      logger.error('Failed to generate recommendations', {
        context,
        error: error.message
      })
      return []
    }
  }

  async learnFromDocument(documentId: string): Promise<void> {
    try {
      logger.info('Learning from document', { documentId })

      await this.patternRecognitionService.learnFromDocument(documentId)

      logger.info('Document learning completed', { documentId })

    } catch (error) {
      logger.error('Failed to learn from document', {
        documentId,
        error: error.message
      })
      throw error
    }
  }

  async updatePatternDatabase(): Promise<void> {
    try {
      logger.info('Updating pattern database')

      await this.patternRecognitionService.updatePatternDatabase()

      logger.info('Pattern database update completed')

    } catch (error) {
      logger.error('Failed to update pattern database', {
        error: error.message
      })
      throw error
    }
  }

  async validatePatterns(): Promise<PatternValidationResult[]> {
    try {
      logger.info('Validating patterns')

      // Get all patterns
      const patterns = await this.getAllPatterns()
      
      // Validate each pattern
      const validationResults = await Promise.all(
        patterns.map(pattern => this.validatePattern(pattern))
      )

      logger.info('Pattern validation completed', {
        patternsValidated: validationResults.length
      })

      return validationResults

    } catch (error) {
      logger.error('Failed to validate patterns', {
        error: error.message
      })
      return []
    }
  }

  // Helper methods
  private async getDocument(documentId: string): Promise<any> {
    try {
      const result = await pool.query(
        `
        SELECT d.id, d.name, d.content, d.framework, d.category, d.created_at
        FROM documents d
        WHERE d.id = $1 AND d.deleted_at IS NULL
        `,
        [documentId]
      )

      return result.rows[0] || null

    } catch (error) {
      logger.error('Failed to get document', {
        documentId,
        error: error.message
      })
      return null
    }
  }

  private async storeDocumentAnalysis(analysis: DocumentAnalysis): Promise<void> {
    try {
      await pool.query(
        `
        INSERT INTO document_analysis (
          document_id, analysis_type, patterns_detected, best_practices_applied,
          quality_metrics, compliance_score, improvement_suggestions, metadata, analyzed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (document_id) DO UPDATE SET
          analysis_type = EXCLUDED.analysis_type,
          patterns_detected = EXCLUDED.patterns_detected,
          best_practices_applied = EXCLUDED.best_practices_applied,
          quality_metrics = EXCLUDED.quality_metrics,
          compliance_score = EXCLUDED.compliance_score,
          improvement_suggestions = EXCLUDED.improvement_suggestions,
          metadata = EXCLUDED.metadata,
          analyzed_at = EXCLUDED.analyzed_at
        `,
        [
          analysis.document_id,
          analysis.analysis_type,
          JSON.stringify(analysis.patterns_detected),
          JSON.stringify(analysis.best_practices_applied),
          JSON.stringify(analysis.quality_metrics),
          analysis.compliance_score,
          JSON.stringify(analysis.improvement_suggestions),
          JSON.stringify(analysis.metadata),
          analysis.analyzed_at
        ]
      )

    } catch (error) {
      logger.error('Failed to store document analysis', {
        documentId: analysis.document_id,
        error: error.message
      })
    }
  }

  private async getQualityTrendData(timeframe: string, filters?: TrendFilters): Promise<any[]> {
    try {
      let sql = `
        SELECT 
          DATE_TRUNC('day', d.created_at) as date,
          AVG(dqm.overall_score) as avg_quality,
          COUNT(*) as document_count
        FROM documents d
        LEFT JOIN document_quality_metrics dqm ON d.id = dqm.document_id
        WHERE d.deleted_at IS NULL
      `
      const params: any[] = []
      let paramIndex = 1

      // Add timeframe filter
      if (timeframe === 'daily') {
        sql += ` AND d.created_at >= NOW() - INTERVAL '30 days'`
      } else if (timeframe === 'weekly') {
        sql += ` AND d.created_at >= NOW() - INTERVAL '12 weeks'`
      } else if (timeframe === 'monthly') {
        sql += ` AND d.created_at >= NOW() - INTERVAL '12 months'`
      }

      // Add additional filters
      if (filters) {
        if (filters.framework && filters.framework.length > 0) {
          sql += ` AND d.framework = ANY($${paramIndex})`
          params.push(filters.framework)
          paramIndex++
        }

        if (filters.user_id) {
          sql += ` AND d.created_by = $${paramIndex}`
          params.push(filters.user_id)
          paramIndex++
        }

        if (filters.project_id) {
          sql += ` AND d.project_id = $${paramIndex}`
          params.push(filters.project_id)
          paramIndex++
        }
      }

      sql += ` GROUP BY DATE_TRUNC('day', d.created_at) ORDER BY date`

      const result = await pool.query(sql, params)
      return result.rows

    } catch (error) {
      logger.error('Failed to get quality trend data', {
        timeframe,
        filters,
        error: error.message
      })
      return []
    }
  }

  private calculateQualityTrends(qualityData: any[], timeframe: string): HistoricalTrend[] {
    const trends: HistoricalTrend[] = []

    if (qualityData.length < 2) {
      return trends
    }

    for (let i = 1; i < qualityData.length; i++) {
      const current = qualityData[i]
      const previous = qualityData[i - 1]
      
      const change = current.avg_quality - previous.avg_quality
      const changePercentage = previous.avg_quality > 0 ? (change / previous.avg_quality) * 100 : 0
      
      let trendDirection: 'improving' | 'declining' | 'stable' = 'stable'
      if (changePercentage > 5) {
        trendDirection = 'improving'
      } else if (changePercentage < -5) {
        trendDirection = 'declining'
      }

      trends.push({
        timeframe: current.date.toISOString(),
        metric_name: 'quality_score',
        metric_value: current.avg_quality,
        trend_direction: trendDirection,
        change_percentage: changePercentage,
        data_points: current.document_count,
        confidence: 0.8,
        metadata: {
          timeframe,
          document_count: current.document_count
        }
      })
    }

    return trends
  }

  private async getFrameworkDocumentCount(framework: string, timeframe: string): Promise<number> {
    try {
      const result = await pool.query(
        `
        SELECT COUNT(*) as count
        FROM documents d
        WHERE d.framework = $1 AND d.deleted_at IS NULL
        AND d.created_at >= NOW() - INTERVAL '1 ${timeframe}'
        `,
        [framework]
      )

      return parseInt(result.rows[0]?.count) || 0

    } catch (error) {
      logger.error('Failed to get framework document count', {
        framework,
        timeframe,
        error: error.message
      })
      return 0
    }
  }

  private async getFrameworkAverageQuality(framework: string, timeframe: string): Promise<number> {
    try {
      const result = await pool.query(
        `
        SELECT AVG(dqm.overall_score) as avg_quality
        FROM documents d
        LEFT JOIN document_quality_metrics dqm ON d.id = dqm.document_id
        WHERE d.framework = $1 AND d.deleted_at IS NULL
        AND d.created_at >= NOW() - INTERVAL '1 ${timeframe}'
        `,
        [framework]
      )

      return parseFloat(result.rows[0]?.avg_quality) || 0

    } catch (error) {
      logger.error('Failed to get framework average quality', {
        framework,
        timeframe,
        error: error.message
      })
      return 0
    }
  }

  private async getFrameworkCommonPatterns(framework: string): Promise<any[]> {
    try {
      const result = await pool.query(
        `
        SELECT * FROM document_patterns
        WHERE framework = $1
        ORDER BY frequency DESC, confidence DESC
        LIMIT 10
        `,
        [framework]
      )

      return result.rows

    } catch (error) {
      logger.error('Failed to get framework common patterns', {
        framework,
        error: error.message
      })
      return []
    }
  }

  private async getFrameworkBestPractices(framework: string, category?: string): Promise<BestPractice[]> {
    try {
      let sql = `
        SELECT * FROM best_practices
        WHERE framework = $1
      `
      const params: any[] = [framework]
      let paramIndex = 2

      if (category) {
        sql += ` AND category = $${paramIndex}`
        params.push(category)
        paramIndex++
      }

      sql += ` ORDER BY effectiveness_score DESC, usage_frequency DESC LIMIT 20`

      const result = await pool.query(sql, params)

      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        framework: row.framework,
        category: row.category || '',
        practice_type: row.practice_type,
        effectiveness_score: row.effectiveness_score || 0,
        usage_frequency: row.usage_frequency || 0,
        success_rate: 0,
        examples: row.examples || [],
        implementation_guidance: row.implementation_guidance || '',
        success_metrics: row.success_metrics || [],
        prerequisites: [],
        related_practices: [],
        metadata: row.metadata || {},
        created_at: row.created_at,
        updated_at: row.updated_at
      }))

    } catch (error) {
      logger.error('Failed to get framework best practices', {
        framework,
        category,
        error: error.message
      })
      return []
    }
  }

  private async identifyFrameworkImprovementAreas(framework: string): Promise<string[]> {
    // This would implement framework improvement area identification
    return []
  }

  private async identifyFrameworkStrengths(framework: string): Promise<string[]> {
    // This would implement framework strength identification
    return []
  }

  private async generateFrameworkRecommendations(framework: string): Promise<string[]> {
    // This would implement framework recommendation generation
    return []
  }

  private async getUserDocumentCount(userId: string, timeframe: string): Promise<number> {
    try {
      const result = await pool.query(
        `
        SELECT COUNT(*) as count
        FROM documents d
        WHERE d.created_by = $1 AND d.deleted_at IS NULL
        AND d.created_at >= NOW() - INTERVAL '1 ${timeframe}'
        `,
        [userId]
      )

      return parseInt(result.rows[0]?.count) || 0

    } catch (error) {
      logger.error('Failed to get user document count', {
        userId,
        timeframe,
        error: error.message
      })
      return 0
    }
  }

  private async getUserAverageQuality(userId: string, timeframe: string): Promise<number> {
    try {
      const result = await pool.query(
        `
        SELECT AVG(dqm.overall_score) as avg_quality
        FROM documents d
        LEFT JOIN document_quality_metrics dqm ON d.id = dqm.document_id
        WHERE d.created_by = $1 AND d.deleted_at IS NULL
        AND d.created_at >= NOW() - INTERVAL '1 ${timeframe}'
        `,
        [userId]
      )

      return parseFloat(result.rows[0]?.avg_quality) || 0

    } catch (error) {
      logger.error('Failed to get user average quality', {
        userId,
        timeframe,
        error: error.message
      })
      return 0
    }
  }

  private async getUserWritingPatterns(userId: string): Promise<any[]> {
    // This would implement user writing pattern analysis
    return []
  }

  private async identifyUserImprovementAreas(userId: string): Promise<string[]> {
    // This would implement user improvement area identification
    return []
  }

  private async identifyUserStrengths(userId: string): Promise<string[]> {
    // This would implement user strength identification
    return []
  }

  private async generateUserRecommendations(userId: string): Promise<string[]> {
    // This would implement user recommendation generation
    return []
  }

  private async getProjectDocumentCount(projectId: string, timeframe: string): Promise<number> {
    try {
      const result = await pool.query(
        `
        SELECT COUNT(*) as count
        FROM documents d
        WHERE d.project_id = $1 AND d.deleted_at IS NULL
        AND d.created_at >= NOW() - INTERVAL '1 ${timeframe}'
        `,
        [projectId]
      )

      return parseInt(result.rows[0]?.count) || 0

    } catch (error) {
      logger.error('Failed to get project document count', {
        projectId,
        timeframe,
        error: error.message
      })
      return 0
    }
  }

  private async getProjectAverageQuality(projectId: string, timeframe: string): Promise<number> {
    try {
      const result = await pool.query(
        `
        SELECT AVG(dqm.overall_score) as avg_quality
        FROM documents d
        LEFT JOIN document_quality_metrics dqm ON d.id = dqm.document_id
        WHERE d.project_id = $1 AND d.deleted_at IS NULL
        AND d.created_at >= NOW() - INTERVAL '1 ${timeframe}'
        `,
        [projectId]
      )

      return parseFloat(result.rows[0]?.avg_quality) || 0

    } catch (error) {
      logger.error('Failed to get project average quality', {
        projectId,
        timeframe,
        error: error.message
      })
      return 0
    }
  }

  private async getProjectDocumentTypes(projectId: string): Promise<string[]> {
    try {
      const result = await pool.query(
        `
        SELECT DISTINCT t.category
        FROM documents d
        LEFT JOIN templates t ON d.template_id = t.id
        WHERE d.project_id = $1 AND d.deleted_at IS NULL
        `,
        [projectId]
      )

      return result.rows.map(row => row.category).filter(Boolean)

    } catch (error) {
      logger.error('Failed to get project document types', {
        projectId,
        error: error.message
      })
      return []
    }
  }

  private async getProjectQualityDistribution(projectId: string): Promise<Record<string, number>> {
    try {
      const result = await pool.query(
        `
        SELECT 
          CASE 
            WHEN dqm.overall_score >= 8 THEN 'high'
            WHEN dqm.overall_score >= 6 THEN 'medium'
            ELSE 'low'
          END as quality_level,
          COUNT(*) as count
        FROM documents d
        LEFT JOIN document_quality_metrics dqm ON d.id = dqm.document_id
        WHERE d.project_id = $1 AND d.deleted_at IS NULL
        GROUP BY quality_level
        `,
        [projectId]
      )

      const distribution: Record<string, number> = {}
      for (const row of result.rows) {
        distribution[row.quality_level] = parseInt(row.count)
      }

      return distribution

    } catch (error) {
      logger.error('Failed to get project quality distribution', {
        projectId,
        error: error.message
      })
      return {}
    }
  }

  private async identifyProjectCommonIssues(projectId: string): Promise<string[]> {
    // This would implement project common issue identification
    return []
  }

  private async getProjectBestPracticesApplied(projectId: string): Promise<BestPractice[]> {
    // This would implement project best practices analysis
    return []
  }

  private async identifyProjectImprovementOpportunities(projectId: string): Promise<string[]> {
    // This would implement project improvement opportunity identification
    return []
  }

  private async extractHistoricalBestPractices(framework: string, category?: string): Promise<BestPractice[]> {
    // This would implement historical best practice extraction
    return []
  }

  private combineBestPractices(dbPractices: BestPractice[], historicalPractices: BestPractice[]): BestPractice[] {
    const combined = new Map<string, BestPractice>()

    // Add database practices
    for (const practice of dbPractices) {
      combined.set(practice.id, practice)
    }

    // Add historical practices
    for (const practice of historicalPractices) {
      const existing = combined.get(practice.id)
      if (existing) {
        // Combine scores
        existing.effectiveness_score = (existing.effectiveness_score + practice.effectiveness_score) / 2
        existing.usage_frequency = existing.usage_frequency + practice.usage_frequency
      } else {
        combined.set(practice.id, practice)
      }
    }

    return Array.from(combined.values())
  }

  private rankBestPractices(bestPractices: BestPractice[]): BestPractice[] {
    return bestPractices
      .sort((a, b) => {
        const scoreA = a.effectiveness_score * 0.7 + (a.usage_frequency / 100) * 0.3
        const scoreB = b.effectiveness_score * 0.7 + (b.usage_frequency / 100) * 0.3
        return scoreB - scoreA
      })
      .slice(0, 20) // Return top 20
  }

  private async generateImprovementSuggestions(analysis: DocumentAnalysis): Promise<ImprovementSuggestion[]> {
    const suggestions: ImprovementSuggestion[] = []

    // Generate suggestions based on quality metrics
    if (analysis.quality_metrics.overall_score < 7) {
      suggestions.push({
        id: `quality-${analysis.document_id}`,
        type: 'quality_improvement',
        priority: 'high',
        title: 'Improve Overall Document Quality',
        description: 'The document quality score is below the recommended threshold',
        current_state: `Current quality score: ${analysis.quality_metrics.overall_score}`,
        suggested_improvement: 'Focus on improving completeness, clarity, and structure',
        expected_benefit: 'Higher quality score and better document effectiveness',
        implementation_effort: 'medium',
        related_patterns: [],
        related_practices: [],
        examples: []
      })
    }

    // Generate suggestions based on missing patterns
    if (analysis.patterns_detected.length < 5) {
      suggestions.push({
        id: `patterns-${analysis.document_id}`,
        type: 'structure_improvement',
        priority: 'medium',
        title: 'Add More Document Structure Patterns',
        description: 'The document could benefit from more structured patterns',
        current_state: `Current patterns: ${analysis.patterns_detected.length}`,
        suggested_improvement: 'Add more structured sections and formatting patterns',
        expected_benefit: 'Better document organization and readability',
        implementation_effort: 'low',
        related_patterns: [],
        related_practices: [],
        examples: []
      })
    }

    return suggestions
  }

  private async generatePersonalizedRecommendations(
    context: RecommendationContext,
    userAnalysis: UserAnalysis,
    frameworkAnalysis: FrameworkAnalysis
  ): Promise<ImprovementSuggestion[]> {
    const recommendations: ImprovementSuggestion[] = []

    // Generate recommendations based on user analysis
    if (userAnalysis.average_quality_score < 7) {
      recommendations.push({
        id: `user-quality-${context.user_id}`,
        type: 'quality_improvement',
        priority: 'high',
        title: 'Improve Document Quality',
        description: 'Your average document quality score could be improved',
        current_state: `Current average: ${userAnalysis.average_quality_score}`,
        suggested_improvement: 'Focus on the improvement areas identified in your analysis',
        expected_benefit: 'Higher quality documents and better outcomes',
        implementation_effort: 'medium',
        related_patterns: [],
        related_practices: [],
        examples: []
      })
    }

    // Generate recommendations based on framework analysis
    if (frameworkAnalysis.improvement_areas.length > 0) {
      recommendations.push({
        id: `framework-${context.framework}`,
        type: 'process_optimization',
        priority: 'medium',
        title: 'Address Framework Improvement Areas',
        description: 'There are identified improvement areas for this framework',
        current_state: `Improvement areas: ${frameworkAnalysis.improvement_areas.join(', ')}`,
        suggested_improvement: 'Focus on the identified improvement areas',
        expected_benefit: 'Better framework compliance and document quality',
        implementation_effort: 'medium',
        related_patterns: [],
        related_practices: [],
        examples: []
      })
    }

    return recommendations
  }

  private async getAllPatterns(): Promise<any[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM document_patterns ORDER BY frequency DESC'
      )

      return result.rows

    } catch (error) {
      logger.error('Failed to get all patterns', {
        error: error.message
      })
      return []
    }
  }

  private async validatePattern(pattern: any): Promise<PatternValidationResult> {
    // Simple pattern validation
    const validationErrors: string[] = []
    const suggestions: string[] = []

    if (pattern.confidence < 0.5) {
      validationErrors.push('Pattern confidence is too low')
      suggestions.push('Consider improving pattern detection or removing low-confidence patterns')
    }

    if (pattern.frequency < 2) {
      validationErrors.push('Pattern frequency is too low')
      suggestions.push('Pattern may not be representative enough')
    }

    if (pattern.examples.length === 0) {
      validationErrors.push('No examples provided for pattern')
      suggestions.push('Add examples to improve pattern recognition')
    }

    const validationStatus = validationErrors.length === 0 ? 'valid' : 
                           validationErrors.length < 2 ? 'needs_review' : 'invalid'

    return {
      pattern_id: pattern.id,
      validation_status: validationStatus,
      confidence_score: pattern.confidence,
      validation_errors: validationErrors,
      suggestions,
      validated_at: new Date()
    }
  }
}
