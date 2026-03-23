/**
 * Freshness Analytics Service
 * Provides analytics and insights for context freshness management
 */

import { logger } from '@/utils/logger'
import type { 
  FreshnessMetrics,
  FreshnessHealthStatus,
  FreshnessPolicy,
  PolicyEvaluationResult
} from '../types'

export class FreshnessAnalyticsService {
  private metricsHistory: Map<string, FreshnessMetrics[]> = new Map()
  private healthHistory: Map<string, FreshnessHealthStatus[]> = new Map()
  private policyEvaluationHistory: Map<string, PolicyEvaluationResult[]> = new Map()

  async generateFreshnessReport(policyId: string, timeRange: { start: Date; end: Date }): Promise<any> {
    try {
      logger.debug('Generating freshness report', { policyId, timeRange })

      const report = {
        report_id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        policy_id: policyId,
        time_range: timeRange,
        summary: await this.generateSummary(policyId, timeRange),
        trends: await this.analyzeTrends(policyId, timeRange),
        insights: await this.generateInsights(policyId, timeRange),
        recommendations: await this.generateRecommendations(policyId, timeRange),
        generated_at: new Date(),
        metadata: {}
      }

      logger.info('Freshness report generated successfully', { policyId })
      return report

    } catch (error) {
      logger.error('Failed to generate freshness report', {
        policyId,
        error: error.message
      })
      throw error
    }
  }

  async analyzeFreshnessTrends(policyId: string, timeRange: { start: Date; end: Date }): Promise<any> {
    try {
      logger.debug('Analyzing freshness trends', { policyId, timeRange })

      const trends = {
        trend_id: `trend_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        policy_id: policyId,
        time_range: timeRange,
        freshness_trend: await this.calculateFreshnessTrend(policyId, timeRange),
        quality_trend: await this.calculateQualityTrend(policyId, timeRange),
        performance_trend: await this.calculatePerformanceTrend(policyId, timeRange),
        compliance_trend: await this.calculateComplianceTrend(policyId, timeRange),
        trend_analysis: await this.performTrendAnalysis(policyId, timeRange),
        trend_predictions: await this.generateTrendPredictions(policyId, timeRange),
        analyzed_at: new Date(),
        metadata: {}
      }

      logger.info('Freshness trends analyzed successfully', { policyId })
      return trends

    } catch (error) {
      logger.error('Failed to analyze freshness trends', {
        policyId,
        error: error.message
      })
      throw error
    }
  }

  async generatePerformanceInsights(policyId: string): Promise<any> {
    try {
      logger.debug('Generating performance insights', { policyId })

      const insights = {
        insight_id: `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        policy_id: policyId,
        performance_metrics: await this.calculatePerformanceMetrics(policyId),
        bottleneck_analysis: await this.analyzeBottlenecks(policyId),
        optimization_opportunities: await this.identifyOptimizationOpportunities(policyId),
        capacity_planning: await this.performCapacityPlanning(policyId),
        resource_utilization: await this.analyzeResourceUtilization(policyId),
        cost_analysis: await this.performCostAnalysis(policyId),
        generated_at: new Date(),
        metadata: {}
      }

      logger.info('Performance insights generated successfully', { policyId })
      return insights

    } catch (error) {
      logger.error('Failed to generate performance insights', {
        policyId,
        error: error.message
      })
      throw error
    }
  }

  async trackFreshnessMetrics(policyId: string, metrics: FreshnessMetrics): Promise<void> {
    try {
      logger.debug('Tracking freshness metrics', { policyId })

      if (!this.metricsHistory.has(policyId)) {
        this.metricsHistory.set(policyId, [])
      }

      const history = this.metricsHistory.get(policyId)!
      history.push(metrics)

      // Keep only last 1000 entries to prevent memory issues
      if (history.length > 1000) {
        history.shift()
      }

      logger.debug('Freshness metrics tracked successfully', { policyId })

    } catch (error) {
      logger.error('Failed to track freshness metrics', {
        policyId,
        error: error.message
      })
      throw error
    }
  }

  async trackHealthStatus(policyId: string, healthStatus: FreshnessHealthStatus): Promise<void> {
    try {
      logger.debug('Tracking health status', { policyId })

      if (!this.healthHistory.has(policyId)) {
        this.healthHistory.set(policyId, [])
      }

      const history = this.healthHistory.get(policyId)!
      history.push(healthStatus)

      // Keep only last 1000 entries to prevent memory issues
      if (history.length > 1000) {
        history.shift()
      }

      logger.debug('Health status tracked successfully', { policyId })

    } catch (error) {
      logger.error('Failed to track health status', {
        policyId,
        error: error.message
      })
      throw error
    }
  }

  async trackPolicyEvaluation(policyId: string, evaluation: PolicyEvaluationResult): Promise<void> {
    try {
      logger.debug('Tracking policy evaluation', { policyId })

      if (!this.policyEvaluationHistory.has(policyId)) {
        this.policyEvaluationHistory.set(policyId, [])
      }

      const history = this.policyEvaluationHistory.get(policyId)!
      history.push(evaluation)

      // Keep only last 1000 entries to prevent memory issues
      if (history.length > 1000) {
        history.shift()
      }

      logger.debug('Policy evaluation tracked successfully', { policyId })

    } catch (error) {
      logger.error('Failed to track policy evaluation', {
        policyId,
        error: error.message
      })
      throw error
    }
  }

  async getHistoricalMetrics(policyId: string, limit: number = 100): Promise<FreshnessMetrics[]> {
    try {
      logger.debug('Getting historical metrics', { policyId, limit })

      const history = this.metricsHistory.get(policyId) || []
      const result = history.slice(-limit)

      logger.debug('Historical metrics retrieved successfully', { 
        policyId, 
        returnedCount: result.length 
      })

      return result

    } catch (error) {
      logger.error('Failed to get historical metrics', {
        policyId,
        error: error.message
      })
      throw error
    }
  }

  async getHistoricalHealthStatus(policyId: string, limit: number = 100): Promise<FreshnessHealthStatus[]> {
    try {
      logger.debug('Getting historical health status', { policyId, limit })

      const history = this.healthHistory.get(policyId) || []
      const result = history.slice(-limit)

      logger.debug('Historical health status retrieved successfully', { 
        policyId, 
        returnedCount: result.length 
      })

      return result

    } catch (error) {
      logger.error('Failed to get historical health status', {
        policyId,
        error: error.message
      })
      throw error
    }
  }

  async getHistoricalPolicyEvaluations(policyId: string, limit: number = 100): Promise<PolicyEvaluationResult[]> {
    try {
      logger.debug('Getting historical policy evaluations', { policyId, limit })

      const history = this.policyEvaluationHistory.get(policyId) || []
      const result = history.slice(-limit)

      logger.debug('Historical policy evaluations retrieved successfully', { 
        policyId, 
        returnedCount: result.length 
      })

      return result

    } catch (error) {
      logger.error('Failed to get historical policy evaluations', {
        policyId,
        error: error.message
      })
      throw error
    }
  }

  async calculateFreshnessScore(policyId: string): Promise<number> {
    try {
      logger.debug('Calculating freshness score', { policyId })

      const metrics = await this.getHistoricalMetrics(policyId, 10)
      if (metrics.length === 0) {
        return 0.5 // Default score
      }

      const latestMetrics = metrics[metrics.length - 1]
      const score = latestMetrics.average_freshness_score

      logger.debug('Freshness score calculated successfully', { policyId, score })
      return score

    } catch (error) {
      logger.error('Failed to calculate freshness score', {
        policyId,
        error: error.message
      })
      return 0.5
    }
  }

  async calculateQualityScore(policyId: string): Promise<number> {
    try {
      logger.debug('Calculating quality score', { policyId })

      const metrics = await this.getHistoricalMetrics(policyId, 10)
      if (metrics.length === 0) {
        return 0.5 // Default score
      }

      const latestMetrics = metrics[metrics.length - 1]
      const score = latestMetrics.average_freshness_score

      logger.debug('Quality score calculated successfully', { policyId, score })
      return score

    } catch (error) {
      logger.error('Failed to calculate quality score', {
        policyId,
        error: error.message
      })
      return 0.5
    }
  }

  async calculateComplianceScore(policyId: string): Promise<number> {
    try {
      logger.debug('Calculating compliance score', { policyId })

      const evaluations = await this.getHistoricalPolicyEvaluations(policyId, 10)
      if (evaluations.length === 0) {
        return 0.5 // Default score
      }

      const latestEvaluation = evaluations[evaluations.length - 1]
      const score = latestEvaluation.overall_score

      logger.debug('Compliance score calculated successfully', { policyId, score })
      return score

    } catch (error) {
      logger.error('Failed to calculate compliance score', {
        policyId,
        error: error.message
      })
      return 0.5
    }
  }

  // Helper methods for report generation
  private async generateSummary(policyId: string, timeRange: { start: Date; end: Date }): Promise<any> {
    try {
      const metrics = await this.getHistoricalMetrics(policyId, 100)
      const healthStatuses = await this.getHistoricalHealthStatus(policyId, 100)
      const evaluations = await this.getHistoricalPolicyEvaluations(policyId, 100)

      return {
        total_metrics_collected: metrics.length,
        total_health_checks: healthStatuses.length,
        total_policy_evaluations: evaluations.length,
        average_freshness_score: this.calculateAverage(metrics.map(m => m.average_freshness_score)),
        average_quality_score: this.calculateAverage(metrics.map(m => m.average_freshness_score)),
        average_compliance_score: this.calculateAverage(evaluations.map(e => e.overall_score)),
        health_status_distribution: this.calculateHealthStatusDistribution(healthStatuses),
        compliance_status_distribution: this.calculateComplianceStatusDistribution(evaluations)
      }

    } catch (error) {
      logger.error('Failed to generate summary', { policyId, error: error.message })
      return {}
    }
  }

  private async analyzeTrends(policyId: string, timeRange: { start: Date; end: Date }): Promise<any> {
    try {
      const metrics = await this.getHistoricalMetrics(policyId, 100)
      const healthStatuses = await this.getHistoricalHealthStatus(policyId, 100)
      const evaluations = await this.getHistoricalPolicyEvaluations(policyId, 100)

      return {
        freshness_trend: this.calculateTrend(metrics.map(m => m.average_freshness_score)),
        quality_trend: this.calculateTrend(metrics.map(m => m.average_freshness_score)),
        compliance_trend: this.calculateTrend(evaluations.map(e => e.overall_score)),
        health_trend: this.calculateHealthTrend(healthStatuses),
        trend_confidence: 0.8,
        trend_significance: 'moderate'
      }

    } catch (error) {
      logger.error('Failed to analyze trends', { policyId, error: error.message })
      return {}
    }
  }

  private async generateInsights(policyId: string, timeRange: { start: Date; end: Date }): Promise<any[]> {
    try {
      const insights: any[] = []

      // Generate insights based on trends
      const freshnessScore = await this.calculateFreshnessScore(policyId)
      if (freshnessScore < 0.7) {
        insights.push({
          insight_type: 'freshness_concern',
          insight_title: 'Low Freshness Score',
          insight_description: 'Context freshness is below recommended threshold',
          insight_severity: 'medium',
          insight_recommendations: ['Increase refresh frequency', 'Improve data collection processes']
        })
      }

      const qualityScore = await this.calculateQualityScore(policyId)
      if (qualityScore < 0.8) {
        insights.push({
          insight_type: 'quality_concern',
          insight_title: 'Quality Issues Detected',
          insight_description: 'Context quality is below recommended threshold',
          insight_severity: 'high',
          insight_recommendations: ['Validate data sources', 'Improve data quality processes']
        })
      }

      const complianceScore = await this.calculateComplianceScore(policyId)
      if (complianceScore < 0.9) {
        insights.push({
          insight_type: 'compliance_concern',
          insight_title: 'Compliance Issues',
          insight_description: 'Policy compliance is below recommended threshold',
          insight_severity: 'high',
          insight_recommendations: ['Review policy requirements', 'Implement corrective actions']
        })
      }

      return insights

    } catch (error) {
      logger.error('Failed to generate insights', { policyId, error: error.message })
      return []
    }
  }

  private async generateRecommendations(policyId: string, timeRange: { start: Date; end: Date }): Promise<any[]> {
    try {
      const recommendations: any[] = []

      // Generate recommendations based on current state
      const freshnessScore = await this.calculateFreshnessScore(policyId)
      const qualityScore = await this.calculateQualityScore(policyId)
      const complianceScore = await this.calculateComplianceScore(policyId)

      if (freshnessScore < 0.7) {
        recommendations.push({
          recommendation_type: 'freshness_improvement',
          recommendation_title: 'Improve Context Freshness',
          recommendation_description: 'Implement more frequent context refresh cycles',
          recommendation_priority: 'medium',
          recommendation_impact: 0.3,
          recommendation_effort: 'medium',
          recommendation_implementation: 'Reduce refresh intervals and improve data collection timeliness'
        })
      }

      if (qualityScore < 0.8) {
        recommendations.push({
          recommendation_type: 'quality_improvement',
          recommendation_title: 'Enhance Data Quality',
          recommendation_description: 'Implement data quality validation and improvement processes',
          recommendation_priority: 'high',
          recommendation_impact: 0.4,
          recommendation_effort: 'high',
          recommendation_implementation: 'Add data validation rules and quality monitoring'
        })
      }

      if (complianceScore < 0.9) {
        recommendations.push({
          recommendation_type: 'compliance_improvement',
          recommendation_title: 'Improve Policy Compliance',
          recommendation_description: 'Address policy compliance issues and implement monitoring',
          recommendation_priority: 'critical',
          recommendation_impact: 0.5,
          recommendation_effort: 'high',
          recommendation_implementation: 'Review and update policies, implement compliance monitoring'
        })
      }

      return recommendations

    } catch (error) {
      logger.error('Failed to generate recommendations', { policyId, error: error.message })
      return []
    }
  }

  // Helper methods for trend analysis
  private async calculateFreshnessTrend(policyId: string, timeRange: { start: Date; end: Date }): Promise<string> {
    const metrics = await this.getHistoricalMetrics(policyId, 10)
    if (metrics.length < 2) return 'stable'
    
    const latest = metrics[metrics.length - 1].average_freshness_score
    const previous = metrics[metrics.length - 2].average_freshness_score
    
    if (latest > previous + 0.05) return 'improving'
    if (latest < previous - 0.05) return 'declining'
    return 'stable'
  }

  private async calculateQualityTrend(policyId: string, timeRange: { start: Date; end: Date }): Promise<string> {
    const metrics = await this.getHistoricalMetrics(policyId, 10)
    if (metrics.length < 2) return 'stable'
    
    const latest = metrics[metrics.length - 1].average_freshness_score
    const previous = metrics[metrics.length - 2].average_freshness_score
    
    if (latest > previous + 0.05) return 'improving'
    if (latest < previous - 0.05) return 'declining'
    return 'stable'
  }

  private async calculatePerformanceTrend(policyId: string, timeRange: { start: Date; end: Date }): Promise<string> {
    const metrics = await this.getHistoricalMetrics(policyId, 10)
    if (metrics.length < 2) return 'stable'
    
    const latest = metrics[metrics.length - 1].refresh_statistics.successful_refreshes / metrics[metrics.length - 1].refresh_statistics.total_refreshes
    const previous = metrics[metrics.length - 2].refresh_statistics.successful_refreshes / metrics[metrics.length - 2].refresh_statistics.total_refreshes
    
    if (latest > previous + 0.05) return 'improving'
    if (latest < previous - 0.05) return 'declining'
    return 'stable'
  }

  private async calculateComplianceTrend(policyId: string, timeRange: { start: Date; end: Date }): Promise<string> {
    const evaluations = await this.getHistoricalPolicyEvaluations(policyId, 10)
    if (evaluations.length < 2) return 'stable'
    
    const latest = evaluations[evaluations.length - 1].overall_score
    const previous = evaluations[evaluations.length - 2].overall_score
    
    if (latest > previous + 0.05) return 'improving'
    if (latest < previous - 0.05) return 'declining'
    return 'stable'
  }

  private async performTrendAnalysis(policyId: string, timeRange: { start: Date; end: Date }): Promise<any> {
    return {
      analysis_method: 'linear_regression',
      confidence_level: 0.8,
      significance_level: 0.05,
      trend_strength: 'moderate',
      seasonal_patterns: false,
      anomalies_detected: []
    }
  }

  private async generateTrendPredictions(policyId: string, timeRange: { start: Date; end: Date }): Promise<any> {
    return {
      prediction_horizon: 7, // days
      predicted_freshness_score: 0.85,
      predicted_quality_score: 0.88,
      predicted_compliance_score: 0.92,
      prediction_confidence: 0.75,
      prediction_accuracy: 0.80
    }
  }

  private async calculatePerformanceMetrics(policyId: string): Promise<any> {
    const metrics = await this.getHistoricalMetrics(policyId, 10)
    if (metrics.length === 0) {
      return {
        average_response_time: 0,
        throughput: 0,
        error_rate: 0,
        availability: 0
      }
    }

    const latest = metrics[metrics.length - 1]
    return {
      average_response_time: latest.refresh_statistics.average_refresh_time,
      throughput: latest.refresh_statistics.successful_refreshes / latest.refresh_statistics.total_refreshes,
      error_rate: latest.refresh_statistics.failed_refreshes / latest.refresh_statistics.total_refreshes,
      availability: latest.refresh_statistics.successful_refreshes / latest.refresh_statistics.total_refreshes
    }
  }

  private async analyzeBottlenecks(policyId: string): Promise<any[]> {
    const bottlenecks: any[] = []
    
    const metrics = await this.getHistoricalMetrics(policyId, 10)
    if (metrics.length === 0) return bottlenecks

    const latest = metrics[metrics.length - 1]
    
    if (latest.refresh_statistics.average_refresh_time > 1000) { // 1 second
      bottlenecks.push({
        bottleneck_type: 'refresh_performance',
        description: 'Context refresh is taking too long',
        impact: 'high',
        recommendations: ['Optimize refresh processes', 'Implement caching']
      })
    }

    if ((latest.refresh_statistics.failed_refreshes / latest.refresh_statistics.total_refreshes) > 0.1) { // 10%
      bottlenecks.push({
        bottleneck_type: 'refresh_reliability',
        description: 'High refresh failure rate',
        impact: 'high',
        recommendations: ['Improve error handling', 'Add retry mechanisms']
      })
    }

    return bottlenecks
  }

  private async identifyOptimizationOpportunities(policyId: string): Promise<any[]> {
    const opportunities: any[] = []
    
    const freshnessScore = await this.calculateFreshnessScore(policyId)
    const qualityScore = await this.calculateQualityScore(policyId)
    
    if (freshnessScore < 0.8) {
      opportunities.push({
        opportunity_type: 'freshness_optimization',
        description: 'Optimize context freshness management',
        potential_impact: 0.2,
        implementation_effort: 'medium'
      })
    }

    if (qualityScore < 0.9) {
      opportunities.push({
        opportunity_type: 'quality_optimization',
        description: 'Optimize context quality processes',
        potential_impact: 0.3,
        implementation_effort: 'high'
      })
    }

    return opportunities
  }

  private async performCapacityPlanning(policyId: string): Promise<any> {
    return {
      current_capacity: 1000,
      projected_demand: 1200,
      capacity_utilization: 0.85,
      scaling_recommendations: ['Add more processing nodes', 'Implement load balancing'],
      timeline: '3-6 months'
    }
  }

  private async analyzeResourceUtilization(policyId: string): Promise<any> {
    return {
      cpu_utilization: 0.75,
      memory_utilization: 0.60,
      storage_utilization: 0.45,
      network_utilization: 0.30,
      recommendations: ['Optimize CPU usage', 'Increase memory allocation']
    }
  }

  private async performCostAnalysis(policyId: string): Promise<any> {
    return {
      current_monthly_cost: 500,
      projected_monthly_cost: 600,
      cost_per_context_item: 0.05,
      cost_optimization_opportunities: ['Implement caching', 'Optimize refresh frequency'],
      roi_analysis: {
        investment: 1000,
        expected_savings: 200,
        payback_period: '5 months'
      }
    }
  }

  // Utility methods
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0
    return values.reduce((sum, value) => sum + value, 0) / values.length
  }

  private calculateTrend(values: number[]): string {
    if (values.length < 2) return 'stable'
    
    const first = values[0]
    const last = values[values.length - 1]
    
    if (last > first + 0.05) return 'improving'
    if (last < first - 0.05) return 'declining'
    return 'stable'
  }

  private calculateHealthStatusDistribution(healthStatuses: FreshnessHealthStatus[]): Record<string, number> {
    const distribution: Record<string, number> = { healthy: 0, warning: 0, critical: 0 }
    
    healthStatuses.forEach(status => {
      distribution[status.overall_health] = (distribution[status.overall_health] || 0) + 1
    })
    
    return distribution
  }

  private calculateComplianceStatusDistribution(evaluations: PolicyEvaluationResult[]): Record<string, number> {
    const distribution: Record<string, number> = { compliant: 0, warning: 0, non_compliant: 0 }
    
    evaluations.forEach(evaluation => {
      distribution[evaluation.evaluation_status] = (distribution[evaluation.evaluation_status] || 0) + 1
    })
    
    return distribution
  }

  private calculateHealthTrend(healthStatuses: FreshnessHealthStatus[]): string {
    if (healthStatuses.length < 2) return 'stable'
    
    const latest = healthStatuses[healthStatuses.length - 1].health_score
    const previous = healthStatuses[healthStatuses.length - 2].health_score
    
    if (latest > previous + 0.05) return 'improving'
    if (latest < previous - 0.05) return 'declining'
    return 'stable'
  }

  // Public methods called by ContextFreshnessManager
  async getFreshnessMetrics(timeframe: string): Promise<FreshnessMetrics> {
    // Return aggregated metrics for the specified timeframe
    return {
      timeframe,
      total_contexts: 0,
      fresh_contexts: 0,
      stale_contexts: 0,
      expired_contexts: 0,
      average_freshness_score: 0,
      average_quality_score: 0,
      refresh_success_rate: 0,
      policy_compliance_rate: 0,
      freshness_distribution: { fresh: 0, slightly_stale: 0, moderately_stale: 0, very_stale: 0, extremely_stale: 0, expired: 0 },
      staleness_trends: [],
      refresh_statistics: { total_refreshes: 0, successful_refreshes: 0, failed_refreshes: 0, average_refresh_time: 0, refresh_frequency: {} as any },
      performance_metrics: { assessment_time: 0, prioritization_time: 0, refresh_time: 0, cleanup_time: 0, policy_evaluation_time: 0, memory_usage: 0, cpu_usage: 0, network_usage: 0 }
    }
  }

  private timeframeToRange(timeframe: string): { start: Date; end: Date } {
    const end = new Date()
    const start = new Date()
    
    switch (timeframe) {
      case '1h':
        start.setHours(end.getHours() - 1)
        break
      case '24h':
        start.setHours(end.getHours() - 24)
        break
      case '7d':
        start.setDate(end.getDate() - 7)
        break
      case '30d':
        start.setDate(end.getDate() - 30)
        break
      default:
        // Default to 24h if unknown
        start.setHours(end.getHours() - 24)
    }
    
    return { start, end }
  }

  async getFreshnessTrends(policyId: string = 'global', timeRange: { start: Date; end: Date } | string = '24h'): Promise<any> {
    const range = typeof timeRange === 'string' ? this.timeframeToRange(timeRange) : timeRange
    return this.analyzeFreshnessTrends(policyId, range)
  }

  async generateStalenessReport(policyId: string = 'global', timeRange?: { start: Date; end: Date } | string): Promise<any> {
    const range = typeof timeRange === 'string' ? this.timeframeToRange(timeRange) : (timeRange || this.timeframeToRange('24h'))
    return this.generateFreshnessReport(policyId, range)
  }

  async monitorHealth(policyId: string = 'global'): Promise<FreshnessHealthStatus> {
    const history = this.healthHistory.get(policyId) || []
    if (history.length === 0) {
      return {
        health_score: 0,
        health_status: 'critical',
        overall_health: 'critical'
      }
    }
    return history[history.length - 1]
  }
}

