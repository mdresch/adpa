/**
 * Staleness Manager Service
 * Manages stale contexts and cleanup operations
 */

import { logger } from '../../../utils/logger'
import { pool } from '../../../database/connection'
import type {
  StaleContext,
  CleanupResult,
  CleanupError,
  CleanupSummary,
  ImpactAssessment,
  CleanupRecommendation,
  CleanupAction
} from '../types'

export class StalenessManager {
  async identifyStaleContexts(threshold?: number): Promise<StaleContext[]> {
    try {
      logger.info('Identifying stale contexts', { threshold })

      const stalenessThreshold = threshold || 0.3
      const staleContexts: StaleContext[] = []

      // Get all contexts with freshness score below threshold
      const result = await pool.query(
        `
        SELECT ci.*, 
               EXTRACT(EPOCH FROM (NOW() - ci.updated_at))/3600 as hours_since_update,
               EXTRACT(EPOCH FROM (NOW() - COALESCE(ci.last_accessed_at, ci.created_at)))/3600 as hours_since_access
        FROM context_items ci
        WHERE ci.freshness_score < $1
        ORDER BY ci.freshness_score ASC
        `,
        [stalenessThreshold]
      )

      for (const row of result.rows) {
        const stalenessLevel = this.determineStalenessLevel(row.freshness_score)
        const impactAssessment = await this.assessImpact(row)
        const cleanupRecommendation = await this.generateCleanupRecommendation(row, stalenessLevel)

        staleContexts.push({
          context_id: row.id,
          staleness_level: stalenessLevel,
          freshness_score: row.freshness_score,
          time_since_update: row.hours_since_update,
          time_since_access: row.hours_since_access,
          impact_assessment: impactAssessment,
          cleanup_recommendation: cleanupRecommendation,
          last_assessment: new Date()
        })
      }

      logger.info('Stale contexts identification completed', {
        threshold: stalenessThreshold,
        staleContextsCount: staleContexts.length
      })

      return staleContexts

    } catch (error) {
      logger.error('Failed to identify stale contexts', {
        threshold,
        error: error.message
      })
      throw error
    }
  }

  async markAsStale(contextId: string, reason: string): Promise<void> {
    try {
      logger.info('Marking context as stale', { contextId, reason })

      // Update context to mark as stale
      await pool.query(
        `
        UPDATE context_items 
        SET is_stale = true, staleness_reason = $2, marked_stale_at = CURRENT_TIMESTAMP
        WHERE id = $1
        `,
        [contextId, reason]
      )

      // Log the staleness marking
      await pool.query(
        `
        INSERT INTO context_staleness_log (
          context_id, action, reason, performed_at, performed_by
        ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4)
        `,
        [contextId, 'mark_stale', reason, 'system']
      )

      logger.info('Context marked as stale successfully', { contextId })

    } catch (error) {
      logger.error('Failed to mark context as stale', {
        contextId,
        reason,
        error: error.message
      })
      throw error
    }
  }

  async markAsFresh(contextId: string): Promise<void> {
    try {
      logger.info('Marking context as fresh', { contextId })

      // Update context to mark as fresh
      await pool.query(
        `
        UPDATE context_items 
        SET is_stale = false, staleness_reason = NULL, marked_stale_at = NULL
        WHERE id = $1
        `,
        [contextId]
      )

      // Log the freshness marking
      await pool.query(
        `
        INSERT INTO context_staleness_log (
          context_id, action, reason, performed_at, performed_by
        ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4)
        `,
        [contextId, 'mark_fresh', 'Context refreshed', 'system']
      )

      logger.info('Context marked as fresh successfully', { contextId })

    } catch (error) {
      logger.error('Failed to mark context as fresh', {
        contextId,
        error: error.message
      })
      throw error
    }
  }

  async cleanupStaleContexts(threshold?: number): Promise<CleanupResult> {
    try {
      logger.info('Cleaning up stale contexts', { threshold })

      const cleanupId = `cleanup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const startTime = Date.now()
      const startedAt = new Date()

      // Identify stale contexts
      const staleContexts = await this.identifyStaleContexts(threshold)
      
      let contextsProcessed = 0
      let contextsCleaned = 0
      let contextsRefreshed = 0
      let contextsArchived = 0
      let contextsDeleted = 0
      let storageFreed = 0
      const errors: CleanupError[] = []

      // Process each stale context
      for (const staleContext of staleContexts) {
        try {
          contextsProcessed++
          
          const cleanupAction = staleContext.cleanup_recommendation.action
          
          switch (cleanupAction) {
            case 'refresh':
              await this.refreshStaleContext(staleContext.context_id)
              contextsRefreshed++
              break
              
            case 'archive':
              await this.archiveStaleContext(staleContext.context_id)
              contextsArchived++
              storageFreed += await this.calculateStorageFreed(staleContext.context_id)
              break
              
            case 'delete':
              await this.deleteStaleContext(staleContext.context_id)
              contextsDeleted++
              storageFreed += await this.calculateStorageFreed(staleContext.context_id)
              break
              
            case 'merge':
              await this.mergeStaleContext(staleContext.context_id)
              contextsCleaned++
              break
              
            case 'consolidate':
              await this.consolidateStaleContext(staleContext.context_id)
              contextsCleaned++
              break
              
            case 'update_policy':
              await this.updateStalenessPolicy(staleContext.context_id)
              contextsCleaned++
              break
              
            default:
              logger.warn('Unknown cleanup action', { 
                contextId: staleContext.context_id, 
                action: cleanupAction 
              })
          }
          
          contextsCleaned++
          
        } catch (error) {
          errors.push({
            context_id: staleContext.context_id,
            error_type: 'cleanup_error',
            error_message: error.message,
            timestamp: new Date()
          })
          
          logger.error('Failed to cleanup stale context', {
            contextId: staleContext.context_id,
            error: error.message
          })
        }
      }

      const completedAt = new Date()
      const duration = Date.now() - startTime
      
      // Calculate performance improvement
      const performanceImprovement = await this.calculatePerformanceImprovement(staleContexts.length, contextsCleaned)

      const cleanupResult: CleanupResult = {
        cleanup_id: cleanupId,
        started_at: startedAt,
        completed_at: completedAt,
        duration,
        contexts_processed: contextsProcessed,
        contexts_cleaned: contextsCleaned,
        contexts_refreshed: contextsRefreshed,
        contexts_archived: contextsArchived,
        contexts_deleted: contextsDeleted,
        storage_freed: storageFreed,
        performance_improvement: performanceImprovement,
        errors,
        summary: {
          total_contexts: staleContexts.length,
          stale_contexts: staleContexts.length,
          cleaned_contexts: contextsCleaned,
          storage_saved: storageFreed,
          performance_gain: performanceImprovement,
          quality_improvement: 0.1 // Placeholder
        }
      }

      // Store cleanup result
      await this.storeCleanupResult(cleanupResult)

      logger.info('Stale contexts cleanup completed', {
        cleanupId,
        contextsProcessed,
        contextsCleaned,
        storageFreed,
        performanceImprovement
      })

      return cleanupResult

    } catch (error) {
      logger.error('Failed to cleanup stale contexts', {
        threshold,
        error: error.message
      })
      throw error
    }
  }

  async getStalenessStatistics(): Promise<any> {
    try {
      logger.info('Getting staleness statistics')

      const result = await pool.query(
        `
        SELECT 
          COUNT(*) as total_contexts,
          COUNT(CASE WHEN is_stale = true THEN 1 END) as stale_contexts,
          COUNT(CASE WHEN freshness_score < 0.3 THEN 1 END) as very_stale_contexts,
          COUNT(CASE WHEN freshness_score < 0.5 THEN 1 END) as moderately_stale_contexts,
          AVG(freshness_score) as average_freshness_score,
          MIN(freshness_score) as min_freshness_score,
          MAX(freshness_score) as max_freshness_score
        FROM context_items
        `
      )

      const stats = result.rows[0]

      logger.info('Staleness statistics retrieved successfully', {
        totalContexts: stats.total_contexts,
        staleContexts: stats.stale_contexts,
        averageFreshnessScore: stats.average_freshness_score
      })

      return stats

    } catch (error) {
      logger.error('Failed to get staleness statistics', {
        error: error.message
      })
      throw error
    }
  }

  // Private helper methods
  private determineStalenessLevel(freshnessScore: number): any {
    if (freshnessScore >= 0.7) return 'slightly_stale'
    if (freshnessScore >= 0.5) return 'moderately_stale'
    if (freshnessScore >= 0.3) return 'very_stale'
    if (freshnessScore >= 0.1) return 'extremely_stale'
    return 'expired'
  }

  private async assessImpact(context: any): Promise<ImpactAssessment> {
    // Assess impact of stale context
    const userImpact = this.calculateUserImpact(context)
    const systemImpact = this.calculateSystemImpact(context)
    const businessImpact = this.calculateBusinessImpact(context)
    const riskLevel = this.calculateRiskLevel(context)

    return {
      user_impact: userImpact,
      system_impact: systemImpact,
      business_impact: businessImpact,
      risk_level: riskLevel,
      affected_users: await this.calculateAffectedUsers(context.id),
      affected_processes: await this.getAffectedProcesses(context.id)
    }
  }

  private async generateCleanupRecommendation(context: any, stalenessLevel: any): Promise<CleanupRecommendation> {
    // Generate cleanup recommendation based on context and staleness level
    let action: CleanupAction = 'refresh'
    let priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'
    let reason = 'Context is stale and needs attention'
    let expectedBenefit = 'Improved data freshness and system performance'
    let implementationEffort: 'low' | 'medium' | 'high' = 'low'
    let timeframe = '1 hour'

    // Determine action based on staleness level and context type
    if (stalenessLevel === 'expired' || stalenessLevel === 'extremely_stale') {
      if (context.importance_level === 'critical') {
        action = 'refresh'
        priority = 'critical'
        timeframe = 'immediate'
      } else {
        action = 'archive'
        priority = 'high'
        timeframe = '1 day'
      }
    } else if (stalenessLevel === 'very_stale') {
      action = 'refresh'
      priority = 'high'
      timeframe = '4 hours'
    } else if (stalenessLevel === 'moderately_stale') {
      action = 'refresh'
      priority = 'medium'
      timeframe = '1 day'
    } else {
      action = 'update_policy'
      priority = 'low'
      timeframe = '1 week'
    }

    return {
      action,
      priority,
      reason,
      expected_benefit: expectedBenefit,
      implementation_effort: implementationEffort,
      timeframe,
      dependencies: []
    }
  }

  private async refreshStaleContext(contextId: string): Promise<void> {
    // Refresh stale context
    await pool.query(
      `
      UPDATE context_items 
      SET is_stale = false, staleness_reason = NULL, marked_stale_at = NULL,
          freshness_score = 0.9, last_refreshed_at = CURRENT_TIMESTAMP
      WHERE id = $1
      `,
      [contextId]
    )
  }

  private async archiveStaleContext(contextId: string): Promise<void> {
    // Archive stale context
    await pool.query(
      `
      UPDATE context_items 
      SET is_archived = true, archived_at = CURRENT_TIMESTAMP
      WHERE id = $1
      `,
      [contextId]
    )
  }

  private async deleteStaleContext(contextId: string): Promise<void> {
    // Delete stale context
    await pool.query(
      'DELETE FROM context_items WHERE id = $1',
      [contextId]
    )
  }

  private async mergeStaleContext(contextId: string): Promise<void> {
    // Merge stale context with similar contexts
    // This would implement merging logic
    logger.info('Merging stale context', { contextId })
  }

  private async consolidateStaleContext(contextId: string): Promise<void> {
    // Consolidate stale context
    // This would implement consolidation logic
    logger.info('Consolidating stale context', { contextId })
  }

  private async updateStalenessPolicy(contextId: string): Promise<void> {
    // Update staleness policy for context
    // This would implement policy update logic
    logger.info('Updating staleness policy', { contextId })
  }

  private calculateUserImpact(context: any): 'low' | 'medium' | 'high' {
    // Calculate user impact based on context properties
    if (context.importance_level === 'critical') return 'high'
    if (context.importance_level === 'high') return 'medium'
    return 'low'
  }

  private calculateSystemImpact(context: any): 'low' | 'medium' | 'high' {
    // Calculate system impact based on context properties
    if (context.freshness_score < 0.1) return 'high'
    if (context.freshness_score < 0.3) return 'medium'
    return 'low'
  }

  private calculateBusinessImpact(context: any): 'low' | 'medium' | 'high' {
    // Calculate business impact based on context properties
    if (context.importance_level === 'critical') return 'high'
    if (context.importance_level === 'high') return 'medium'
    return 'low'
  }

  private calculateRiskLevel(context: any): 'low' | 'medium' | 'high' | 'critical' {
    // Calculate risk level based on context properties
    if (context.freshness_score < 0.1 && context.importance_level === 'critical') return 'critical'
    if (context.freshness_score < 0.3 && context.importance_level === 'high') return 'high'
    if (context.freshness_score < 0.5) return 'medium'
    return 'low'
  }

  private async calculateAffectedUsers(contextId: string): Promise<number> {
    // Calculate number of affected users
    // This would implement user impact calculation
    return 1
  }

  private async getAffectedProcesses(contextId: string): Promise<string[]> {
    // Get list of affected processes
    // This would implement process impact calculation
    return ['document_generation', 'context_retrieval']
  }

  private async calculateStorageFreed(contextId: string): Promise<number> {
    // Calculate storage freed by cleanup action
    // This would implement storage calculation
    return 1024 // Placeholder: 1KB
  }

  private async calculatePerformanceImprovement(totalContexts: number, cleanedContexts: number): Promise<number> {
    // Calculate performance improvement from cleanup
    if (totalContexts === 0) return 0
    return (cleanedContexts / totalContexts) * 0.1 // 10% improvement per cleaned context
  }

  private async storeCleanupResult(cleanupResult: CleanupResult): Promise<void> {
    try {
      await pool.query(
        `
        INSERT INTO context_cleanup_results (
          cleanup_id, started_at, completed_at, duration, contexts_processed,
          contexts_cleaned, contexts_refreshed, contexts_archived, contexts_deleted,
          storage_freed, performance_improvement, errors, summary
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `,
        [
          cleanupResult.cleanup_id,
          cleanupResult.started_at,
          cleanupResult.completed_at,
          cleanupResult.duration,
          cleanupResult.contexts_processed,
          cleanupResult.contexts_cleaned,
          cleanupResult.contexts_refreshed,
          cleanupResult.contexts_archived,
          cleanupResult.contexts_deleted,
          cleanupResult.storage_freed,
          cleanupResult.performance_improvement,
          JSON.stringify(cleanupResult.errors),
          JSON.stringify(cleanupResult.summary)
        ]
      )

    } catch (error) {
      logger.error('Failed to store cleanup result', {
        cleanupId: cleanupResult.cleanup_id,
        error: error.message
      })
    }
  }
}
