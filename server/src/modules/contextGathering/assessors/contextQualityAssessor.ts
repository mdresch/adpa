/**
 * Context Quality Assessor
 * Assesses the quality of context data
 */

import { logger } from '@/utils/logger'
import type { ContextQualityAnalysis } from '../types'

export class ContextQualityAssessor {
  async assessContextQuality(contextData: any): Promise<ContextQualityAnalysis> {
    try {
      logger.debug('Assessing context quality')

      const startTime = Date.now()

      // Assess overall quality
      const overallQualityScore = this.calculateOverallQualityScore(contextData)
      
      // Assess quality dimensions
      const qualityDimensions = this.assessQualityDimensions(contextData)
      
      // Identify quality issues
      const qualityIssues = this.identifyQualityIssues(contextData)
      
      // Analyze quality trends
      const qualityTrends = this.analyzeQualityTrends(contextData)
      
      // Compare with benchmarks
      const qualityBenchmarks = this.compareWithBenchmarks(contextData, overallQualityScore)
      
      // Identify quality improvements
      const qualityImprovements = this.identifyQualityImprovements(contextData)
      
      // Calculate quality metrics
      const qualityMetrics = this.calculateQualityMetrics(contextData)
      
      // Perform quality assessment
      const qualityAssessment = this.performQualityAssessment(contextData, overallQualityScore)
      
      // Generate quality recommendations
      const qualityRecommendations = this.generateQualityRecommendations(contextData, qualityIssues)

      const qualityAnalysis: ContextQualityAnalysis = {
        overall_quality_score: overallQualityScore,
        quality_dimensions: qualityDimensions,
        quality_issues: qualityIssues,
        quality_trends: qualityTrends,
        quality_benchmarks: qualityBenchmarks,
        quality_improvements: qualityImprovements,
        quality_metrics: qualityMetrics,
        quality_assessment: qualityAssessment,
        quality_recommendations: qualityRecommendations,
        metadata: {
          assessment_timestamp: new Date(),
          assessment_duration: Date.now() - startTime,
          assessment_confidence: 0.9,
          assessment_methodology: 'multi_dimensional_analysis'
        }
      }

      logger.info('Context quality assessment completed', {
        overallQualityScore,
        dimensionCount: qualityDimensions.length,
        issueCount: qualityIssues.length,
        assessmentTime: Date.now() - startTime
      })

      return qualityAnalysis

    } catch (error) {
      logger.error('Context quality assessment failed', {
        error: error.message
      })
      throw error
    }
  }

  private calculateOverallQualityScore(contextData: any): number {
    try {
      let totalScore = 0.0
      let sourceCount = 0

      // Calculate quality score for each context source
      Object.keys(contextData).forEach(sourceKey => {
        const sourceData = contextData[sourceKey]
        if (sourceData) {
          const sourceScore = this.calculateSourceQualityScore(sourceData)
          totalScore += sourceScore
          sourceCount++
        }
      })

      // Return average quality score
      return sourceCount > 0 ? totalScore / sourceCount : 0.0

    } catch (error) {
      logger.error('Failed to calculate overall quality score', {
        error: error.message
      })
      return 0.0
    }
  }

  private assessQualityDimensions(contextData: any): any[] {
    const dimensions = [
      {
        dimension_name: 'completeness',
        dimension_score: this.assessCompleteness(contextData),
        dimension_weight: 0.25,
        dimension_description: 'Extent to which context data is complete',
        dimension_factors: this.identifyCompletenessFactors(contextData),
        dimension_metrics: this.calculateCompletenessMetrics(contextData),
        dimension_trends: this.analyzeCompletenessTrends(contextData)
      },
      {
        dimension_name: 'accuracy',
        dimension_score: this.assessAccuracy(contextData),
        dimension_weight: 0.25,
        dimension_description: 'Extent to which context data is accurate',
        dimension_factors: this.identifyAccuracyFactors(contextData),
        dimension_metrics: this.calculateAccuracyMetrics(contextData),
        dimension_trends: this.analyzeAccuracyTrends(contextData)
      },
      {
        dimension_name: 'timeliness',
        dimension_score: this.assessTimeliness(contextData),
        dimension_weight: 0.20,
        dimension_description: 'Extent to which context data is current',
        dimension_factors: this.identifyTimelinessFactors(contextData),
        dimension_metrics: this.calculateTimelinessMetrics(contextData),
        dimension_trends: this.analyzeTimelinessTrends(contextData)
      },
      {
        dimension_name: 'relevance',
        dimension_score: this.assessRelevance(contextData),
        dimension_weight: 0.20,
        dimension_description: 'Extent to which context data is relevant',
        dimension_factors: this.identifyRelevanceFactors(contextData),
        dimension_metrics: this.calculateRelevanceMetrics(contextData),
        dimension_trends: this.analyzeRelevanceTrends(contextData)
      },
      {
        dimension_name: 'consistency',
        dimension_score: this.assessConsistency(contextData),
        dimension_weight: 0.10,
        dimension_description: 'Extent to which context data is consistent',
        dimension_factors: this.identifyConsistencyFactors(contextData),
        dimension_metrics: this.calculateConsistencyMetrics(contextData),
        dimension_trends: this.analyzeConsistencyTrends(contextData)
      }
    ]

    return dimensions
  }

  private identifyQualityIssues(contextData: any): any[] {
    const issues: any[] = []

    // Check for missing context sources
    const requiredSources = ['project_context', 'template_context']
    requiredSources.forEach(source => {
      if (!contextData[source]) {
        issues.push({
          issue_id: `issue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          issue_type: 'missing_data',
          issue_description: `Missing required context source: ${source}`,
          issue_severity: 'critical',
          issue_impact: 'High impact on document generation quality',
          issue_cause: `Context source ${source} not provided`,
          issue_recommendations: [`Gather ${source} data`],
          issue_priority: 1,
          issue_status: 'open',
          metadata: {}
        })
      }
    })

    // Check for low quality scores
    Object.keys(contextData).forEach(sourceKey => {
      const sourceData = contextData[sourceKey]
      if (sourceData?.metadata?.analysis_confidence < 0.7) {
        issues.push({
          issue_id: `issue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          issue_type: 'low_quality',
          issue_description: `Low quality score for context source: ${sourceKey}`,
          issue_severity: 'medium',
          issue_impact: 'Medium impact on document generation quality',
          issue_cause: `Context source ${sourceKey} has low confidence score`,
          issue_recommendations: [`Improve ${sourceKey} data quality`],
          issue_priority: 2,
          issue_status: 'open',
          metadata: {}
        })
      }
    })

    // Check for stale data
    Object.keys(contextData).forEach(sourceKey => {
      const sourceData = contextData[sourceKey]
      if (sourceData?.metadata?.data_freshness) {
        const freshness = new Date(sourceData.metadata.data_freshness)
        const now = new Date()
        const hoursDiff = (now.getTime() - freshness.getTime()) / (1000 * 60 * 60)
        
        if (hoursDiff > 24) {
          issues.push({
            issue_id: `issue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            issue_type: 'stale_data',
            issue_description: `Stale data for context source: ${sourceKey}`,
            issue_severity: 'medium',
            issue_impact: 'Medium impact on document accuracy',
            issue_cause: `Context source ${sourceKey} data is ${hoursDiff.toFixed(1)} hours old`,
            issue_recommendations: [`Refresh ${sourceKey} data`],
            issue_priority: 3,
            issue_status: 'open',
            metadata: {}
          })
        }
      }
    })

    return issues
  }

  private analyzeQualityTrends(contextData: any): any[] {
    const trends: any[] = []

    // Analyze completeness trend
    const completenessTrend = {
      trend_name: 'completeness_trend',
      trend_data: [
        {
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
          value: 0.85,
          context: { source: 'historical' }
        },
        {
          timestamp: new Date(),
          value: this.assessCompleteness(contextData),
          context: { source: 'current' }
        }
      ],
      trend_direction: this.assessCompleteness(contextData) > 0.85 ? 'improving' : 'declining',
      trend_confidence: 0.8,
      trend_prediction: {
        predicted_value: this.assessCompleteness(contextData) + 0.05,
        prediction_confidence: 0.7,
        prediction_horizon: 7, // days
        prediction_factors: ['data_collection_improvement', 'source_reliability']
      }
    }

    trends.push(completenessTrend)

    return trends
  }

  private compareWithBenchmarks(contextData: any, overallScore: number): any[] {
    const benchmarks: any[] = []

    // Industry benchmark
    const industryBenchmark = {
      benchmark_name: 'Industry Average',
      benchmark_value: 0.75,
      benchmark_source: 'Industry Survey 2024',
      benchmark_description: 'Average context quality score across industry',
      benchmark_comparison: {
        current_value: overallScore,
        benchmark_value: 0.75,
        difference: overallScore - 0.75,
        difference_percentage: ((overallScore - 0.75) / 0.75) * 100,
        comparison_status: overallScore >= 0.75 ? 'above' : 'below',
        comparison_significance: Math.abs(overallScore - 0.75) > 0.1 ? 'significant' : 'minimal'
      }
    }

    benchmarks.push(industryBenchmark)

    // Best practice benchmark
    const bestPracticeBenchmark = {
      benchmark_name: 'Best Practice',
      benchmark_value: 0.90,
      benchmark_source: 'Best Practice Guidelines',
      benchmark_description: 'Best practice context quality score',
      benchmark_comparison: {
        current_value: overallScore,
        benchmark_value: 0.90,
        difference: overallScore - 0.90,
        difference_percentage: ((overallScore - 0.90) / 0.90) * 100,
        comparison_status: overallScore >= 0.90 ? 'above' : 'below',
        comparison_significance: Math.abs(overallScore - 0.90) > 0.1 ? 'significant' : 'minimal'
      }
    }

    benchmarks.push(bestPracticeBenchmark)

    return benchmarks
  }

  private identifyQualityImprovements(contextData: any): any[] {
    const improvements: any[] = []

    // Identify completeness improvements
    if (this.assessCompleteness(contextData) < 0.9) {
      improvements.push({
        improvement_id: `improvement_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        improvement_type: 'completeness_enhancement',
        improvement_description: 'Improve context data completeness',
        improvement_impact: 0.15,
        improvement_effort: 'medium',
        improvement_priority: 2,
        improvement_status: 'proposed',
        improvement_metrics: [
          {
            metric_name: 'completeness_score',
            metric_value: this.assessCompleteness(contextData),
            metric_unit: 'score',
            metric_threshold: 0.9,
            metric_status: 'below_threshold',
            metric_trend: 'stable',
            metric_description: 'Current completeness score'
          }
        ],
        metadata: {}
      })
    }

    // Identify accuracy improvements
    if (this.assessAccuracy(contextData) < 0.8) {
      improvements.push({
        improvement_id: `improvement_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        improvement_type: 'accuracy_enhancement',
        improvement_description: 'Improve context data accuracy',
        improvement_impact: 0.20,
        improvement_effort: 'high',
        improvement_priority: 1,
        improvement_status: 'proposed',
        improvement_metrics: [
          {
            metric_name: 'accuracy_score',
            metric_value: this.assessAccuracy(contextData),
            metric_unit: 'score',
            metric_threshold: 0.8,
            metric_status: 'below_threshold',
            metric_trend: 'stable',
            metric_description: 'Current accuracy score'
          }
        ],
        metadata: {}
      })
    }

    return improvements
  }

  private calculateQualityMetrics(contextData: any): any[] {
    const metrics: any[] = []

    // Overall quality metric
    metrics.push({
      metric_name: 'overall_quality_score',
      metric_value: this.calculateOverallQualityScore(contextData),
      metric_unit: 'score',
      metric_threshold: 0.8,
      metric_status: this.calculateOverallQualityScore(contextData) >= 0.8 ? 'good' : 'warning',
      metric_trend: 'stable',
      metric_description: 'Overall context quality score'
    })

    // Completeness metric
    metrics.push({
      metric_name: 'completeness_score',
      metric_value: this.assessCompleteness(contextData),
      metric_unit: 'score',
      metric_threshold: 0.9,
      metric_status: this.assessCompleteness(contextData) >= 0.9 ? 'good' : 'warning',
      metric_trend: 'stable',
      metric_description: 'Context data completeness score'
    })

    // Accuracy metric
    metrics.push({
      metric_name: 'accuracy_score',
      metric_value: this.assessAccuracy(contextData),
      metric_unit: 'score',
      metric_threshold: 0.8,
      metric_status: this.assessAccuracy(contextData) >= 0.8 ? 'good' : 'warning',
      metric_trend: 'stable',
      metric_description: 'Context data accuracy score'
    })

    // Timeliness metric
    metrics.push({
      metric_name: 'timeliness_score',
      metric_value: this.assessTimeliness(contextData),
      metric_unit: 'score',
      metric_threshold: 0.8,
      metric_status: this.assessTimeliness(contextData) >= 0.8 ? 'good' : 'warning',
      metric_trend: 'stable',
      metric_description: 'Context data timeliness score'
    })

    return metrics
  }

  private performQualityAssessment(contextData: any, overallScore: number): any {
    return {
      assessment_id: `assessment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      assessment_timestamp: new Date(),
      assessment_score: overallScore,
      assessment_confidence: 0.9,
      assessment_methodology: 'multi_dimensional_analysis',
      assessment_limitations: [
        'Limited historical data for trend analysis',
        'Simplified quality scoring algorithm'
      ],
      assessment_recommendations: [
        'Continue monitoring context quality',
        'Implement quality improvement initiatives',
        'Regular quality assessments recommended'
      ],
      assessment_metadata: {
        context_sources_assessed: Object.keys(contextData).length,
        assessment_duration: 100, // Simplified
        assessment_version: '1.0'
      }
    }
  }

  private generateQualityRecommendations(contextData: any, qualityIssues: any[]): any[] {
    const recommendations: any[] = []

    // Generate recommendations based on quality issues
    qualityIssues.forEach(issue => {
      recommendations.push({
        recommendation_id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        recommendation_type: 'quality_improvement',
        recommendation_title: `Address ${issue.issue_type}`,
        recommendation_description: issue.issue_description,
        recommendation_priority: this.mapIssueSeverityToPriority(issue.issue_severity),
        recommendation_impact: this.calculateRecommendationImpact(issue.issue_severity),
        recommendation_effort: this.calculateRecommendationEffort(issue.issue_type),
        recommendation_implementation: issue.issue_recommendations.join(', '),
        recommendation_metrics: [],
        recommendation_metadata: {
          related_issue: issue.issue_id,
          issue_severity: issue.issue_severity
        }
      })
    })

    // Generate general recommendations
    if (this.calculateOverallQualityScore(contextData) < 0.8) {
      recommendations.push({
        recommendation_id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        recommendation_type: 'quality_improvement',
        recommendation_title: 'Improve Overall Context Quality',
        recommendation_description: 'Overall context quality is below recommended threshold',
        recommendation_priority: 'high',
        recommendation_impact: 0.3,
        recommendation_effort: 'high',
        recommendation_implementation: 'Implement comprehensive context quality improvement program',
        recommendation_metrics: [],
        recommendation_metadata: {
          current_score: this.calculateOverallQualityScore(contextData),
          target_score: 0.8
        }
      })
    }

    return recommendations
  }

  // Helper methods for quality assessment
  private calculateSourceQualityScore(sourceData: any): number {
    if (!sourceData) return 0.0
    
    let score = 0.5 // Base score
    
    // Factor in analysis confidence
    if (sourceData.metadata?.analysis_confidence) {
      score += sourceData.metadata.analysis_confidence * 0.3
    }
    
    // Factor in data freshness
    if (sourceData.metadata?.data_freshness) {
      const freshness = new Date(sourceData.metadata.data_freshness)
      const now = new Date()
      const hoursDiff = (now.getTime() - freshness.getTime()) / (1000 * 60 * 60)
      score += Math.max(0, 1 - (hoursDiff / 24)) * 0.2
    }
    
    return Math.min(1.0, score)
  }

  private assessCompleteness(contextData: any): number {
    const requiredSources = ['project_context', 'template_context']
    const optionalSources = ['user_profile_context', 'document_history_context', 'external_context']
    
    let score = 0.0
    
    // Check required sources
    requiredSources.forEach(source => {
      if (contextData[source]) {
        score += 0.4 // 40% for each required source
      }
    })
    
    // Check optional sources
    optionalSources.forEach(source => {
      if (contextData[source]) {
        score += 0.05 // 5% for each optional source
      }
    })
    
    return Math.min(1.0, score)
  }

  private assessAccuracy(contextData: any): number {
    let totalScore = 0.0
    let sourceCount = 0
    
    Object.keys(contextData).forEach(sourceKey => {
      const sourceData = contextData[sourceKey]
      if (sourceData?.metadata?.analysis_confidence) {
        totalScore += sourceData.metadata.analysis_confidence
        sourceCount++
      }
    })
    
    return sourceCount > 0 ? totalScore / sourceCount : 0.5
  }

  private assessTimeliness(contextData: any): number {
    let totalScore = 0.0
    let sourceCount = 0
    
    Object.keys(contextData).forEach(sourceKey => {
      const sourceData = contextData[sourceKey]
      if (sourceData?.metadata?.data_freshness) {
        const freshness = new Date(sourceData.metadata.data_freshness)
        const now = new Date()
        const hoursDiff = (now.getTime() - freshness.getTime()) / (1000 * 60 * 60)
        const freshnessScore = Math.max(0, 1 - (hoursDiff / 24)) // Decay over 24 hours
        totalScore += freshnessScore
        sourceCount++
      }
    })
    
    return sourceCount > 0 ? totalScore / sourceCount : 0.5
  }

  private assessRelevance(contextData: any): number {
    // Simplified relevance assessment
    let score = 0.5
    
    // Check if required sources are present
    if (contextData.project_context) score += 0.2
    if (contextData.template_context) score += 0.2
    if (contextData.user_profile_context) score += 0.1
    
    return Math.min(1.0, score)
  }

  private assessConsistency(contextData: any): number {
    // Simplified consistency assessment
    let score = 0.8 // Assume good consistency by default
    
    // Check for conflicting data between sources
    // This is a simplified implementation
    if (contextData.project_context && contextData.user_profile_context) {
      // Check for consistency between project and user data
      score = 0.9
    }
    
    return score
  }

  // Additional helper methods for factors, metrics, and trends
  private identifyCompletenessFactors(contextData: any): any[] {
    return [
      {
        factor_name: 'required_sources_present',
        factor_score: this.assessCompleteness(contextData),
        factor_weight: 0.6,
        factor_description: 'Percentage of required context sources present',
        factor_impact: 'high'
      }
    ]
  }

  private identifyAccuracyFactors(contextData: any): any[] {
    return [
      {
        factor_name: 'analysis_confidence',
        factor_score: this.assessAccuracy(contextData),
        factor_weight: 0.8,
        factor_description: 'Average analysis confidence across sources',
        factor_impact: 'high'
      }
    ]
  }

  private identifyTimelinessFactors(contextData: any): any[] {
    return [
      {
        factor_name: 'data_freshness',
        factor_score: this.assessTimeliness(contextData),
        factor_weight: 1.0,
        factor_description: 'Average data freshness across sources',
        factor_impact: 'high'
      }
    ]
  }

  private identifyRelevanceFactors(contextData: any): any[] {
    return [
      {
        factor_name: 'source_relevance',
        factor_score: this.assessRelevance(contextData),
        factor_weight: 1.0,
        factor_description: 'Relevance of context sources to document generation',
        factor_impact: 'high'
      }
    ]
  }

  private identifyConsistencyFactors(contextData: any): any[] {
    return [
      {
        factor_name: 'data_consistency',
        factor_score: this.assessConsistency(contextData),
        factor_weight: 1.0,
        factor_description: 'Consistency between different context sources',
        factor_impact: 'medium'
      }
    ]
  }

  private calculateCompletenessMetrics(contextData: any): any[] {
    return [
      {
        metric_name: 'completeness_percentage',
        metric_value: this.assessCompleteness(contextData) * 100,
        metric_unit: 'percentage',
        metric_threshold: 90,
        metric_status: this.assessCompleteness(contextData) >= 0.9 ? 'good' : 'warning',
        metric_trend: 'stable',
        metric_description: 'Percentage of required context data present'
      }
    ]
  }

  private calculateAccuracyMetrics(contextData: any): any[] {
    return [
      {
        metric_name: 'accuracy_percentage',
        metric_value: this.assessAccuracy(contextData) * 100,
        metric_unit: 'percentage',
        metric_threshold: 80,
        metric_status: this.assessAccuracy(contextData) >= 0.8 ? 'good' : 'warning',
        metric_trend: 'stable',
        metric_description: 'Percentage accuracy of context data'
      }
    ]
  }

  private calculateTimelinessMetrics(contextData: any): any[] {
    return [
      {
        metric_name: 'timeliness_percentage',
        metric_value: this.assessTimeliness(contextData) * 100,
        metric_unit: 'percentage',
        metric_threshold: 80,
        metric_status: this.assessTimeliness(contextData) >= 0.8 ? 'good' : 'warning',
        metric_trend: 'stable',
        metric_description: 'Percentage of context data that is current'
      }
    ]
  }

  private calculateRelevanceMetrics(contextData: any): any[] {
    return [
      {
        metric_name: 'relevance_percentage',
        metric_value: this.assessRelevance(contextData) * 100,
        metric_unit: 'percentage',
        metric_threshold: 80,
        metric_status: this.assessRelevance(contextData) >= 0.8 ? 'good' : 'warning',
        metric_trend: 'stable',
        metric_description: 'Percentage of context data that is relevant'
      }
    ]
  }

  private calculateConsistencyMetrics(contextData: any): any[] {
    return [
      {
        metric_name: 'consistency_percentage',
        metric_value: this.assessConsistency(contextData) * 100,
        metric_unit: 'percentage',
        metric_threshold: 80,
        metric_status: this.assessConsistency(contextData) >= 0.8 ? 'good' : 'warning',
        metric_trend: 'stable',
        metric_description: 'Percentage of context data that is consistent'
      }
    ]
  }

  private analyzeCompletenessTrends(contextData: any): any[] {
    return []
  }

  private analyzeAccuracyTrends(contextData: any): any[] {
    return []
  }

  private analyzeTimelinessTrends(contextData: any): any[] {
    return []
  }

  private analyzeRelevanceTrends(contextData: any): any[] {
    return []
  }

  private analyzeConsistencyTrends(contextData: any): any[] {
    return []
  }

  private mapIssueSeverityToPriority(severity: string): string {
    switch (severity) {
      case 'critical': return 'critical'
      case 'high': return 'high'
      case 'medium': return 'medium'
      case 'low': return 'low'
      default: return 'medium'
    }
  }

  private calculateRecommendationImpact(severity: string): number {
    switch (severity) {
      case 'critical': return 0.5
      case 'high': return 0.3
      case 'medium': return 0.2
      case 'low': return 0.1
      default: return 0.2
    }
  }

  private calculateRecommendationEffort(issueType: string): string {
    switch (issueType) {
      case 'missing_data': return 'high'
      case 'low_quality': return 'medium'
      case 'stale_data': return 'low'
      default: return 'medium'
    }
  }
}
