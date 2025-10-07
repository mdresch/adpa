/**
 * Time-Based Prioritizer Service
 * Prioritizes contexts based on time-based factors and freshness
 */

import { logger } from '../../../utils/logger'
import type {
  ContextItem,
  PrioritizedContext
} from '../types'

export class TimeBasedPrioritizer {
  async prioritizeByFreshness(contexts: ContextItem[]): Promise<PrioritizedContext[]> {
    try {
      logger.debug('Prioritizing contexts by freshness', { contextsCount: contexts.length })

      const prioritizedContexts: PrioritizedContext[] = []

      for (const context of contexts) {
        const priorityScore = await this.calculateFreshnessPriorityScore(context)
        const freshnessScore = context.freshness.freshness_score
        const timeDecayScore = await this.calculateTimeDecayScore(context)
        const accessPatternScore = await this.calculateAccessPatternScore(context)
        const importanceScore = this.calculateImportanceScore(context)
        
        const combinedScore = this.calculateCombinedScore({
          freshness: freshnessScore,
          timeDecay: timeDecayScore,
          accessPattern: accessPatternScore,
          importance: importanceScore
        })

        prioritizedContexts.push({
          context,
          priority_score: priorityScore,
          freshness_score: freshnessScore,
          time_decay_score: timeDecayScore,
          access_pattern_score: accessPatternScore,
          importance_score: importanceScore,
          combined_score: combinedScore,
          ranking: 0, // Will be set after sorting
          prioritization_reason: this.generatePrioritizationReason(context, combinedScore)
        })
      }

      // Sort by combined score (descending) and assign rankings
      prioritizedContexts.sort((a, b) => b.combined_score - a.combined_score)
      prioritizedContexts.forEach((item, index) => {
        item.ranking = index + 1
      })

      logger.info('Context prioritization by freshness completed', {
        contextsCount: contexts.length,
        prioritizedCount: prioritizedContexts.length
      })

      return prioritizedContexts

    } catch (error) {
      logger.error('Failed to prioritize contexts by freshness', {
        contextsCount: contexts.length,
        error: error.message
      })
      throw error
    }
  }

  async prioritizeByTimeDecay(contexts: ContextItem[]): Promise<PrioritizedContext[]> {
    try {
      logger.debug('Prioritizing contexts by time decay', { contextsCount: contexts.length })

      const prioritizedContexts: PrioritizedContext[] = []

      for (const context of contexts) {
        const timeDecayScore = await this.calculateTimeDecayScore(context)
        const freshnessScore = context.freshness.freshness_score
        const accessPatternScore = await this.calculateAccessPatternScore(context)
        const importanceScore = this.calculateImportanceScore(context)
        
        const combinedScore = this.calculateCombinedScore({
          freshness: freshnessScore * 0.3, // Reduced weight for freshness
          timeDecay: timeDecayScore * 0.4, // Increased weight for time decay
          accessPattern: accessPatternScore * 0.2,
          importance: importanceScore * 0.1
        })

        prioritizedContexts.push({
          context,
          priority_score: timeDecayScore,
          freshness_score: freshnessScore,
          time_decay_score: timeDecayScore,
          access_pattern_score: accessPatternScore,
          importance_score: importanceScore,
          combined_score: combinedScore,
          ranking: 0,
          prioritization_reason: this.generateTimeDecayPrioritizationReason(context, timeDecayScore)
        })
      }

      // Sort by time decay score (descending) and assign rankings
      prioritizedContexts.sort((a, b) => b.time_decay_score - a.time_decay_score)
      prioritizedContexts.forEach((item, index) => {
        item.ranking = index + 1
      })

      logger.info('Context prioritization by time decay completed', {
        contextsCount: contexts.length,
        prioritizedCount: prioritizedContexts.length
      })

      return prioritizedContexts

    } catch (error) {
      logger.error('Failed to prioritize contexts by time decay', {
        contextsCount: contexts.length,
        error: error.message
      })
      throw error
    }
  }

  async prioritizeByUpdateFrequency(contexts: ContextItem[]): Promise<PrioritizedContext[]> {
    try {
      logger.debug('Prioritizing contexts by update frequency', { contextsCount: contexts.length })

      const prioritizedContexts: PrioritizedContext[] = []

      for (const context of contexts) {
        const updateFrequencyScore = this.calculateUpdateFrequencyScore(context)
        const freshnessScore = context.freshness.freshness_score
        const timeDecayScore = await this.calculateTimeDecayScore(context)
        const accessPatternScore = await this.calculateAccessPatternScore(context)
        const importanceScore = this.calculateImportanceScore(context)
        
        const combinedScore = this.calculateCombinedScore({
          freshness: freshnessScore * 0.2,
          timeDecay: timeDecayScore * 0.2,
          accessPattern: accessPatternScore * 0.2,
          importance: importanceScore * 0.1,
          updateFrequency: updateFrequencyScore * 0.3 // Increased weight for update frequency
        })

        prioritizedContexts.push({
          context,
          priority_score: updateFrequencyScore,
          freshness_score: freshnessScore,
          time_decay_score: timeDecayScore,
          access_pattern_score: accessPatternScore,
          importance_score: importanceScore,
          combined_score: combinedScore,
          ranking: 0,
          prioritization_reason: this.generateUpdateFrequencyPrioritizationReason(context, updateFrequencyScore)
        })
      }

      // Sort by update frequency score (descending) and assign rankings
      prioritizedContexts.sort((a, b) => b.priority_score - a.priority_score)
      prioritizedContexts.forEach((item, index) => {
        item.ranking = index + 1
      })

      logger.info('Context prioritization by update frequency completed', {
        contextsCount: contexts.length,
        prioritizedCount: prioritizedContexts.length
      })

      return prioritizedContexts

    } catch (error) {
      logger.error('Failed to prioritize contexts by update frequency', {
        contextsCount: contexts.length,
        error: error.message
      })
      throw error
    }
  }

  async prioritizeByAccessPattern(contexts: ContextItem[]): Promise<PrioritizedContext[]> {
    try {
      logger.debug('Prioritizing contexts by access pattern', { contextsCount: contexts.length })

      const prioritizedContexts: PrioritizedContext[] = []

      for (const context of contexts) {
        const accessPatternScore = await this.calculateAccessPatternScore(context)
        const freshnessScore = context.freshness.freshness_score
        const timeDecayScore = await this.calculateTimeDecayScore(context)
        const importanceScore = this.calculateImportanceScore(context)
        
        const combinedScore = this.calculateCombinedScore({
          freshness: freshnessScore * 0.2,
          timeDecay: timeDecayScore * 0.2,
          accessPattern: accessPatternScore * 0.4, // Increased weight for access pattern
          importance: importanceScore * 0.2
        })

        prioritizedContexts.push({
          context,
          priority_score: accessPatternScore,
          freshness_score: freshnessScore,
          time_decay_score: timeDecayScore,
          access_pattern_score: accessPatternScore,
          importance_score: importanceScore,
          combined_score: combinedScore,
          ranking: 0,
          prioritization_reason: this.generateAccessPatternPrioritizationReason(context, accessPatternScore)
        })
      }

      // Sort by access pattern score (descending) and assign rankings
      prioritizedContexts.sort((a, b) => b.access_pattern_score - a.access_pattern_score)
      prioritizedContexts.forEach((item, index) => {
        item.ranking = index + 1
      })

      logger.info('Context prioritization by access pattern completed', {
        contextsCount: contexts.length,
        prioritizedCount: prioritizedContexts.length
      })

      return prioritizedContexts

    } catch (error) {
      logger.error('Failed to prioritize contexts by access pattern', {
        contextsCount: contexts.length,
        error: error.message
      })
      throw error
    }
  }

  private async calculateFreshnessPriorityScore(context: ContextItem): Promise<number> {
    // Calculate priority score based on freshness
    const freshnessScore = context.freshness.freshness_score
    
    // Higher freshness = higher priority
    return freshnessScore
  }

  private async calculateTimeDecayScore(context: ContextItem): Promise<number> {
    // Calculate time decay score based on how much time has passed
    const now = new Date()
    const lastUpdate = context.updated_at
    const timeSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60) // Hours
    
    // Get expected update interval based on frequency
    const expectedInterval = this.getExpectedUpdateInterval(context.freshness.update_frequency)
    
    // Calculate decay score (higher score = more urgent)
    if (timeSinceUpdate <= expectedInterval) {
      return 0.1 // Not urgent
    }
    
    // Exponential increase in urgency as time passes
    const excessTime = timeSinceUpdate - expectedInterval
    const decayScore = Math.min(1, excessTime / expectedInterval)
    
    return decayScore
  }

  private async calculateAccessPatternScore(context: ContextItem): Promise<number> {
    const accessPattern = context.access_pattern
    
    // Factor in access frequency
    const frequencyScore = Math.min(1, accessPattern.access_frequency / 10)
    
    // Factor in access trend
    let trendScore = 0.5
    if (accessPattern.access_trend === 'increasing') {
      trendScore = 0.8
    } else if (accessPattern.access_trend === 'decreasing') {
      trendScore = 0.2
    }
    
    // Factor in time since last access
    const timeSinceAccess = this.calculateTimeSinceAccess(context)
    const recencyScore = Math.exp(-timeSinceAccess / 24) // Decay over 24 hours
    
    // Factor in peak access times
    const peakAccessScore = this.calculatePeakAccessScore(context)
    
    // Combine factors
    return (frequencyScore * 0.3 + trendScore * 0.2 + recencyScore * 0.3 + peakAccessScore * 0.2)
  }

  private calculateUpdateFrequencyScore(context: ContextItem): Promise<number> {
    // Calculate score based on update frequency
    const updateFrequency = context.freshness.update_frequency
    const timeSinceUpdate = this.calculateTimeSinceUpdate(context)
    const expectedInterval = this.getExpectedUpdateInterval(updateFrequency)
    
    // Score based on how close we are to the expected update time
    const ratio = timeSinceUpdate / expectedInterval
    
    if (ratio <= 0.5) {
      return 0.1 // Not urgent
    } else if (ratio <= 1.0) {
      return 0.5 // Getting urgent
    } else if (ratio <= 2.0) {
      return 0.8 // Urgent
    } else {
      return 1.0 // Very urgent
    }
  }

  private calculateImportanceScore(context: ContextItem): number {
    // Calculate importance score based on metadata
    const importanceLevel = context.metadata.importance_level
    
    const importanceScores: Record<string, number> = {
      'critical': 1.0,
      'high': 0.8,
      'medium': 0.5,
      'low': 0.2
    }
    
    return importanceScores[importanceLevel] || 0.5
  }

  private calculateCombinedScore(scores: {
    freshness: number
    timeDecay: number
    accessPattern: number
    importance: number
    updateFrequency?: number
  }): number {
    // Calculate combined score with weights
    let combinedScore = 0
    
    if (scores.updateFrequency !== undefined) {
      // Include update frequency in calculation
      combinedScore = (
        scores.freshness * 0.2 +
        scores.timeDecay * 0.2 +
        scores.accessPattern * 0.2 +
        scores.importance * 0.1 +
        scores.updateFrequency * 0.3
      )
    } else {
      // Standard calculation without update frequency
      combinedScore = (
        scores.freshness * 0.3 +
        scores.timeDecay * 0.3 +
        scores.accessPattern * 0.3 +
        scores.importance * 0.1
      )
    }
    
    return Math.max(0, Math.min(1, combinedScore))
  }

  private calculateTimeSinceAccess(context: ContextItem): number {
    if (!context.last_accessed_at) {
      return Infinity // Never accessed
    }
    
    const now = new Date()
    const lastAccess = context.last_accessed_at
    return (now.getTime() - lastAccess.getTime()) / (1000 * 60 * 60) // Hours
  }

  private calculateTimeSinceUpdate(context: ContextItem): number {
    const now = new Date()
    const lastUpdate = context.updated_at
    return (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60) // Hours
  }

  private calculatePeakAccessScore(context: ContextItem): number {
    const accessPattern = context.access_pattern
    const now = new Date()
    const currentHour = now.getHours()
    
    // Check if current time is in peak access times
    const isPeakTime = accessPattern.peak_access_times.some(peakTime => {
      const peakHour = new Date(peakTime).getHours()
      return Math.abs(currentHour - peakHour) <= 1 // Within 1 hour of peak
    })
    
    return isPeakTime ? 0.8 : 0.2
  }

  private getExpectedUpdateInterval(updateFrequency: string): number {
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

  private generatePrioritizationReason(context: ContextItem, combinedScore: number): string {
    const reasons: string[] = []
    
    if (context.freshness.freshness_score < 0.5) {
      reasons.push('low freshness score')
    }
    
    if (context.metadata.importance_level === 'critical') {
      reasons.push('critical importance')
    }
    
    if (context.access_pattern.access_frequency > 5) {
      reasons.push('high access frequency')
    }
    
    if (context.access_pattern.access_trend === 'increasing') {
      reasons.push('increasing access trend')
    }
    
    if (reasons.length === 0) {
      reasons.push('standard prioritization')
    }
    
    return `Prioritized due to: ${reasons.join(', ')}`
  }

  private generateTimeDecayPrioritizationReason(context: ContextItem, timeDecayScore: number): string {
    const timeSinceUpdate = this.calculateTimeSinceUpdate(context)
    const expectedInterval = this.getExpectedUpdateInterval(context.freshness.update_frequency)
    
    if (timeSinceUpdate > expectedInterval * 2) {
      return 'Significantly overdue for update'
    } else if (timeSinceUpdate > expectedInterval) {
      return 'Overdue for update'
    } else if (timeSinceUpdate > expectedInterval * 0.8) {
      return 'Approaching update deadline'
    } else {
      return 'Within expected update window'
    }
  }

  private generateUpdateFrequencyPrioritizationReason(context: ContextItem, updateFrequencyScore: number): string {
    const updateFrequency = context.freshness.update_frequency
    
    if (updateFrequencyScore > 0.8) {
      return `High priority due to ${updateFrequency} update frequency`
    } else if (updateFrequencyScore > 0.5) {
      return `Medium priority due to ${updateFrequency} update frequency`
    } else {
      return `Low priority due to ${updateFrequency} update frequency`
    }
  }

  private generateAccessPatternPrioritizationReason(context: ContextItem, accessPatternScore: number): string {
    const reasons: string[] = []
    
    if (context.access_pattern.access_frequency > 5) {
      reasons.push('high access frequency')
    }
    
    if (context.access_pattern.access_trend === 'increasing') {
      reasons.push('increasing access trend')
    }
    
    if (this.calculatePeakAccessScore(context) > 0.5) {
      reasons.push('peak access time')
    }
    
    if (reasons.length === 0) {
      reasons.push('standard access pattern')
    }
    
    return `Prioritized due to: ${reasons.join(', ')}`
  }
}
