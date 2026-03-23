/**
 * Freshness Assessor Service
 * Assesses context freshness and calculates freshness scores
 */

import { logger } from '../../../utils/logger'
import type {
  ContextItem,
  FreshnessAssessment,
  StalenessLevel,
  FreshnessTrend,
  FreshnessRecommendation,
  RecommendationType
} from '../types'

export class FreshnessAssessor {
  async assess(context: ContextItem): Promise<FreshnessAssessment> {
    try {
      logger.debug('Assessing context freshness', { contextId: context.id })

      // Calculate freshness score
      const freshnessScore = await this.calculateFreshnessScore(context)
      
      // Calculate decay rate
      const decayRate = await this.calculateDecayRate(context)
      
      // Determine staleness level
      const stalenessLevel = this.determineStalenessLevel(freshnessScore, context)
      
      // Calculate time since update and access
      const timeSinceUpdate = this.calculateTimeSinceUpdate(context)
      const timeSinceAccess = this.calculateTimeSinceAccess(context)
      
      // Analyze freshness trend
      const freshnessTrend = await this.analyzeFreshnessTrend(context)
      
      // Generate recommendations
      const recommendations = await this.generateRecommendations(context, freshnessScore, stalenessLevel)
      
      // Calculate next assessment time
      const nextAssessmentAt = this.calculateNextAssessmentTime(context, freshnessScore)

      const assessment: FreshnessAssessment = {
        context_id: context.id,
        assessed_at: new Date(),
        freshness_score: freshnessScore,
        staleness_level: stalenessLevel,
        decay_rate: decayRate,
        time_since_update: timeSinceUpdate,
        time_since_access: timeSinceAccess,
        freshness_trend: freshnessTrend,
        recommendations,
        next_assessment_at: nextAssessmentAt
      }

      logger.info('Context freshness assessment completed', {
        contextId: context.id,
        freshnessScore,
        stalenessLevel
      })

      return assessment

    } catch (error) {
      logger.error('Failed to assess context freshness', {
        contextId: context.id,
        error: error.message
      })
      throw error
    }
  }

  async calculateFreshnessScore(context: ContextItem): Promise<number> {
    try {
      // Base freshness score starts at 1.0
      let freshnessScore = 1.0
      
      // Factor 1: Time since last update (40% weight)
      const timeSinceUpdate = this.calculateTimeSinceUpdate(context)
      const updateFreshness = this.calculateTimeBasedFreshness(timeSinceUpdate, context.freshness.update_frequency)
      freshnessScore *= (updateFreshness * 0.4 + 0.6) // Weighted contribution
      
      // Factor 2: Access pattern (25% weight)
      const accessFreshness = this.calculateAccessBasedFreshness(context)
      freshnessScore *= (accessFreshness * 0.25 + 0.75) // Weighted contribution
      
      // Factor 3: Data quality (20% weight)
      const qualityFreshness = this.calculateQualityBasedFreshness(context)
      freshnessScore *= (qualityFreshness * 0.2 + 0.8) // Weighted contribution
      
      // Factor 4: Source reliability (15% weight)
      const reliabilityFreshness = this.calculateReliabilityBasedFreshness(context)
      freshnessScore *= (reliabilityFreshness * 0.15 + 0.85) // Weighted contribution
      
      // Apply decay rate
      const decayRate = await this.calculateDecayRate(context)
      freshnessScore *= (1 - decayRate)
      
      // Ensure score is between 0 and 1
      return Math.max(0, Math.min(1, freshnessScore))

    } catch (error) {
      logger.error('Failed to calculate freshness score', {
        contextId: context.id,
        error: error.message
      })
      return 0
    }
  }

  async calculateDecayRate(context: ContextItem): Promise<number> {
    try {
      // Base decay rate based on context type
      let decayRate = this.getBaseDecayRate(context.type)
      
      // Adjust based on update frequency
      const frequencyMultiplier = this.getFrequencyMultiplier(context.freshness.update_frequency)
      decayRate *= frequencyMultiplier
      
      // Adjust based on access pattern
      const accessMultiplier = this.getAccessMultiplier(context.access_pattern)
      decayRate *= accessMultiplier
      
      // Adjust based on importance level
      const importanceMultiplier = this.getImportanceMultiplier(context.metadata.importance_level)
      decayRate *= importanceMultiplier
      
      // Ensure decay rate is between 0 and 1
      return Math.max(0, Math.min(1, decayRate))

    } catch (error) {
      logger.error('Failed to calculate decay rate', {
        contextId: context.id,
        error: error.message
      })
      return 0.1 // Default decay rate
    }
  }

  private determineStalenessLevel(freshnessScore: number, context: ContextItem): StalenessLevel {
    // Determine staleness level based on freshness score and context
    if (freshnessScore >= 0.9) return 'fresh'
    if (freshnessScore >= 0.7) return 'slightly_stale'
    if (freshnessScore >= 0.5) return 'moderately_stale'
    if (freshnessScore >= 0.3) return 'very_stale'
    if (freshnessScore >= 0.1) return 'extremely_stale'
    return 'expired'
  }

  private calculateTimeSinceUpdate(context: ContextItem): number {
    const now = new Date()
    const lastUpdate = context.updated_at
    return (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60) // Hours
  }

  private calculateTimeSinceAccess(context: ContextItem): number {
    if (!context.last_accessed_at) {
      return Infinity // Never accessed
    }
    
    const now = new Date()
    const lastAccess = context.last_accessed_at
    return (now.getTime() - lastAccess.getTime()) / (1000 * 60 * 60) // Hours
  }

  private calculateTimeBasedFreshness(timeSinceUpdate: number, updateFrequency: string): number {
    // Calculate freshness based on time since update and expected frequency
    const expectedInterval = this.getExpectedInterval(updateFrequency)
    
    if (timeSinceUpdate <= expectedInterval) {
      return 1.0 // Fresh
    }
    
    // Exponential decay based on how much time has passed beyond expected interval
    const excessTime = timeSinceUpdate - expectedInterval
    const decayFactor = Math.exp(-excessTime / expectedInterval)
    
    return Math.max(0, decayFactor)
  }

  private calculateAccessBasedFreshness(context: ContextItem): number {
    const accessPattern = context.access_pattern
    
    // Factor in access frequency
    const frequencyScore = Math.min(1, accessPattern.access_frequency / 10) // Normalize to 0-1
    
    // Factor in access trend
    let trendScore = 0.5 // Neutral
    if (accessPattern.access_trend === 'increasing') {
      trendScore = 0.8
    } else if (accessPattern.access_trend === 'decreasing') {
      trendScore = 0.2
    }
    
    // Factor in time since last access
    const timeSinceAccess = this.calculateTimeSinceAccess(context)
    const recencyScore = Math.exp(-timeSinceAccess / 24) // Decay over 24 hours
    
    // Combine factors
    return (frequencyScore * 0.4 + trendScore * 0.3 + recencyScore * 0.3)
  }

  private calculateQualityBasedFreshness(context: ContextItem): number {
    // Factor in data quality from metadata
    const dataQuality = context.metadata.data_quality || 0.5
    
    // Factor in source reliability
    const sourceReliability = context.metadata.source_reliability || 0.5
    
    // Factor in validation status from update history
    const recentUpdates = context.update_history
      .filter(update => {
        const hoursSinceUpdate = (new Date().getTime() - update.timestamp.getTime()) / (1000 * 60 * 60)
        return hoursSinceUpdate <= 24 // Last 24 hours
      })
    
    let validationScore = 0.5 // Default
    if (recentUpdates.length > 0) {
      const validUpdates = recentUpdates.filter(update => update.validation_status === 'valid')
      validationScore = validUpdates.length / recentUpdates.length
    }
    
    // Combine quality factors
    return (dataQuality * 0.4 + sourceReliability * 0.3 + validationScore * 0.3)
  }

  private calculateReliabilityBasedFreshness(context: ContextItem): number {
    // Factor in source reliability
    const sourceReliability = context.metadata.source_reliability || 0.5
    
    // Factor in update history reliability
    const updateHistory = context.update_history
    let historyReliability = 0.5 // Default
    
    if (updateHistory.length > 0) {
      const recentUpdates = updateHistory.slice(-10) // Last 10 updates
      const successfulUpdates = recentUpdates.filter(update => update.validation_status === 'valid')
      historyReliability = successfulUpdates.length / recentUpdates.length
    }
    
    // Factor in context type reliability
    const typeReliability = this.getTypeReliability(context.type)
    
    // Combine reliability factors
    return (sourceReliability * 0.5 + historyReliability * 0.3 + typeReliability * 0.2)
  }

  private async analyzeFreshnessTrend(context: ContextItem): Promise<FreshnessTrend> {
    // Analyze freshness trend from history
    const freshnessHistory = context.freshness.freshness_history
    
    if (freshnessHistory.length < 2) {
      return {
        context_id: context.id,
        direction: 'stable',
        rate: 0,
        confidence: 0,
        timeframe: '24h',
        data_points: freshnessHistory.length,
        trend_data: [],
        trend_direction: 'stable',
        trend_strength: 0,
        seasonality: false,
        forecast: {
          next_freshness_score: 0.8,
          confidence_interval: [0.7, 0.9],
          forecast_horizon: 24,
          accuracy: 0.9,
          factors: []
        }
      }
    }
    
    // Calculate trend direction and rate
    const recentScores = freshnessHistory.slice(-10).map(entry => entry.freshness_score)
    const trendDirection = this.calculateTrendDirection(recentScores)
    const trendRate = this.calculateTrendRate(recentScores)
    const confidence = this.calculateTrendConfidence(recentScores)
    
    return {
      context_id: context.id,
      direction: trendDirection,
      rate: trendRate,
      confidence,
      timeframe: '24h',
      data_points: recentScores.length,
      trend_data: freshnessHistory.slice(-10).map(h => ({
        timestamp: h.timestamp,
        freshness_score: h.freshness_score,
        access_count: h.access_count,
        update_count: 1,
        quality_score: h.quality_score
      })),
      trend_direction: trendDirection,
      trend_strength: Math.abs(trendRate) * 10,
      seasonality: false,
      forecast: {
        next_freshness_score: recentScores[recentScores.length - 1],
        confidence_interval: [0.5, 1.0],
        forecast_horizon: 24,
        accuracy: confidence,
        factors: []
      }
    }
  }

  private async generateRecommendations(
    context: ContextItem, 
    freshnessScore: number, 
    stalenessLevel: StalenessLevel
  ): Promise<FreshnessRecommendation[]> {
    const recommendations: FreshnessRecommendation[] = []
    
    // Generate recommendations based on staleness level
    if (stalenessLevel === 'expired' || stalenessLevel === 'extremely_stale') {
      recommendations.push({
        type: 'refresh_immediately',
        priority: 'critical',
        title: 'Immediate Refresh Required',
        description: 'Context is extremely stale and requires immediate refresh',
        action: 'Refresh context data immediately',
        expected_impact: 0.9,
        implementation_effort: 'low',
        timeframe: 'immediate'
      })
    }
    
    if (stalenessLevel === 'very_stale' || stalenessLevel === 'moderately_stale') {
      recommendations.push({
        type: 'schedule_refresh',
        priority: 'high',
        title: 'Schedule Refresh',
        description: 'Context is stale and should be refreshed soon',
        action: 'Schedule context refresh within next hour',
        expected_impact: 0.7,
        implementation_effort: 'low',
        timeframe: '1 hour'
      })
    }
    
    // Generate recommendations based on access pattern
    if (context.access_pattern.access_frequency > 10 && freshnessScore < 0.8) {
      recommendations.push({
        type: 'update_frequency',
        priority: 'medium',
        title: 'Increase Update Frequency',
        description: 'High access frequency suggests need for more frequent updates',
        action: 'Increase update frequency to match access pattern',
        expected_impact: 0.6,
        implementation_effort: 'medium',
        timeframe: '1 day'
      })
    }
    
    // Generate recommendations based on quality
    if (context.metadata.data_quality < 0.7) {
      recommendations.push({
        type: 'improve_quality',
        priority: 'medium',
        title: 'Improve Data Quality',
        description: 'Low data quality is affecting freshness score',
        action: 'Improve data quality through better validation and processing',
        expected_impact: 0.5,
        implementation_effort: 'high',
        timeframe: '1 week'
      })
    }
    
    // Generate recommendations based on access pattern
    if (context.access_pattern.access_trend === 'decreasing' && freshnessScore < 0.6) {
      recommendations.push({
        type: 'optimize_access',
        priority: 'low',
        title: 'Optimize Access Pattern',
        description: 'Decreasing access trend suggests context may not be needed',
        action: 'Consider archiving or reducing update frequency',
        expected_impact: 0.3,
        implementation_effort: 'low',
        timeframe: '1 week'
      })
    }
    
    return recommendations
  }

  private calculateNextAssessmentTime(context: ContextItem, freshnessScore: number): Date {
    // Calculate next assessment time based on freshness score and context type
    const baseInterval = this.getBaseAssessmentInterval(context.type)
    const freshnessMultiplier = this.getFreshnessMultiplier(freshnessScore)
    const interval = baseInterval * freshnessMultiplier
    
    const nextAssessment = new Date()
    nextAssessment.setHours(nextAssessment.getHours() + interval)
    
    return nextAssessment
  }

  // Helper methods
  private getBaseDecayRate(contextType: string): number {
    const decayRates: Record<string, number> = {
      'project_data': 0.05,
      'user_preferences': 0.02,
      'document_history': 0.01,
      'template_data': 0.03,
      'framework_data': 0.01,
      'external_api': 0.1,
      'database_query': 0.08,
      'file_content': 0.06,
      'semantic_search': 0.04,
      'historical_analysis': 0.02,
      'best_practices': 0.01,
      'pattern_data': 0.03
    }
    
    return decayRates[contextType] || 0.05
  }

  private getFrequencyMultiplier(updateFrequency: string): number {
    const multipliers: Record<string, number> = {
      'real_time': 0.1,
      'hourly': 0.2,
      'daily': 0.5,
      'weekly': 1.0,
      'monthly': 2.0,
      'quarterly': 3.0,
      'yearly': 5.0,
      'manual': 1.5,
      'event_driven': 0.3
    }
    
    return multipliers[updateFrequency] || 1.0
  }

  private getAccessMultiplier(accessPattern: any): number {
    const frequency = accessPattern.access_frequency || 1
    const trend = accessPattern.access_trend || 'stable'
    
    let multiplier = 1.0
    
    // Adjust based on access frequency
    if (frequency > 10) {
      multiplier *= 0.5 // High access = slower decay
    } else if (frequency < 1) {
      multiplier *= 2.0 // Low access = faster decay
    }
    
    // Adjust based on access trend
    if (trend === 'increasing') {
      multiplier *= 0.7
    } else if (trend === 'decreasing') {
      multiplier *= 1.5
    }
    
    return multiplier
  }

  private getImportanceMultiplier(importanceLevel: string): number {
    const multipliers: Record<string, number> = {
      'critical': 0.1,
      'high': 0.3,
      'medium': 0.7,
      'low': 1.5
    }
    
    return multipliers[importanceLevel] || 1.0
  }

  private getExpectedInterval(updateFrequency: string): number {
    const intervals: Record<string, number> = {
      'real_time': 0.1,
      'hourly': 1,
      'daily': 24,
      'weekly': 168,
      'monthly': 720,
      'quarterly': 2160,
      'yearly': 8760,
      'manual': 24,
      'event_driven': 1
    }
    
    return intervals[updateFrequency] || 24
  }

  private getTypeReliability(contextType: string): number {
    const reliabilities: Record<string, number> = {
      'project_data': 0.8,
      'user_preferences': 0.9,
      'document_history': 0.95,
      'template_data': 0.85,
      'framework_data': 0.9,
      'external_api': 0.6,
      'database_query': 0.8,
      'file_content': 0.7,
      'semantic_search': 0.75,
      'historical_analysis': 0.85,
      'best_practices': 0.9,
      'pattern_data': 0.8
    }
    
    return reliabilities[contextType] || 0.7
  }

  private calculateTrendDirection(scores: number[]): 'improving' | 'declining' | 'stable' {
    if (scores.length < 2) return 'stable'
    
    const firstHalf = scores.slice(0, Math.floor(scores.length / 2))
    const secondHalf = scores.slice(Math.floor(scores.length / 2))
    
    const firstAvg = firstHalf.reduce((sum, score) => sum + score, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((sum, score) => sum + score, 0) / secondHalf.length
    
    const difference = secondAvg - firstAvg
    
    if (difference > 0.1) return 'improving'
    if (difference < -0.1) return 'declining'
    return 'stable'
  }

  private calculateTrendRate(scores: number[]): number {
    if (scores.length < 2) return 0
    
    const firstScore = scores[0]
    const lastScore = scores[scores.length - 1]
    
    return (lastScore - firstScore) / scores.length
  }

  private calculateTrendConfidence(scores: number[]): number {
    if (scores.length < 3) return 0
    
    // Calculate confidence based on consistency of trend
    const differences = []
    for (let i = 1; i < scores.length; i++) {
      differences.push(scores[i] - scores[i - 1])
    }
    
    const avgDifference = differences.reduce((sum, diff) => sum + diff, 0) / differences.length
    const variance = differences.reduce((sum, diff) => sum + Math.pow(diff - avgDifference, 2), 0) / differences.length
    
    // Lower variance = higher confidence
    return Math.max(0, 1 - variance)
  }

  private getBaseAssessmentInterval(contextType: string): number {
    const intervals: Record<string, number> = {
      'project_data': 1,
      'user_preferences': 6,
      'document_history': 12,
      'template_data': 4,
      'framework_data': 24,
      'external_api': 0.5,
      'database_query': 2,
      'file_content': 8,
      'semantic_search': 6,
      'historical_analysis': 24,
      'best_practices': 48,
      'pattern_data': 12
    }
    
    return intervals[contextType] || 6
  }

  private getFreshnessMultiplier(freshnessScore: number): number {
    // More frequent assessment for lower freshness scores
    if (freshnessScore < 0.3) return 0.5
    if (freshnessScore < 0.5) return 0.7
    if (freshnessScore < 0.7) return 1.0
    if (freshnessScore < 0.9) return 1.5
    return 2.0
  }
}
