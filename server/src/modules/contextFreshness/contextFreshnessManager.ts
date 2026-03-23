/**
 * Context Freshness Manager
 * Manages context freshness with time-based prioritization and intelligent refresh strategies
 */

import { logger } from '../../utils/logger'
import { pool } from '../../database/connection'
import { FreshnessAssessor } from './services/freshnessAssessor'
import { TimeBasedPrioritizer } from './services/timeBasedPrioritizer'
import { RefreshScheduler } from './services/refreshScheduler'
import { StalenessManager } from './services/stalenessManager'
import { FreshnessPolicyEngine } from './services/freshnessPolicyEngine'
import { FreshnessAnalyticsService } from './services/freshnessAnalytics'
import type {
  ContextFreshnessManager as IContextFreshnessManager,
  ContextItem,
  FreshnessAssessment,
  PrioritizedContext,
  RefreshResult,
  RefreshSchedule,
  StaleContext,
  CleanupResult,
  FreshnessPolicy,
  PolicyResult,
  PolicyEvaluation,
  FreshnessMetrics,
  FreshnessTrend,
  StalenessReport,
  FreshnessHealthStatus
} from './types'

export interface ContextFreshnessConfig {
  defaultStalenessThreshold: number
  defaultRefreshInterval: number
  enableAutoRefresh: boolean
  enableStalenessCleanup: boolean
  maxConcurrentRefreshes: number
  refreshTimeout: number
  cleanupBatchSize: number
  enableAnalytics: boolean
  enableHealthMonitoring: boolean
}

export class ContextFreshnessManager implements IContextFreshnessManager {
  private freshnessAssessor: FreshnessAssessor
  private timeBasedPrioritizer: TimeBasedPrioritizer
  private refreshScheduler: RefreshScheduler
  private stalenessManager: StalenessManager
  private freshnessPolicyEngine: FreshnessPolicyEngine
  private freshnessAnalytics: FreshnessAnalyticsService
  private config: ContextFreshnessConfig

  constructor(config: ContextFreshnessConfig) {
    this.config = config
    this.freshnessAssessor = new FreshnessAssessor()
    this.timeBasedPrioritizer = new TimeBasedPrioritizer()
    this.refreshScheduler = new RefreshScheduler()
    this.stalenessManager = new StalenessManager()
    this.freshnessPolicyEngine = new FreshnessPolicyEngine()
    this.freshnessAnalytics = new FreshnessAnalyticsService()
  }

  async assessFreshness(contextId: string): Promise<FreshnessAssessment> {
    try {
      logger.info('Assessing context freshness', { contextId })

      // Get context item
      const context = await this.getContextItem(contextId)
      if (!context) {
        throw new Error(`Context not found: ${contextId}`)
      }

      // Assess freshness
      const assessment = await this.freshnessAssessor.assess(context)

      // Store assessment results
      await this.storeFreshnessAssessment(assessment)

      logger.info('Context freshness assessment completed', {
        contextId,
        freshnessScore: assessment.freshness_score,
        stalenessLevel: assessment.staleness_level
      })

      return assessment

    } catch (error) {
      logger.error('Failed to assess context freshness', {
        contextId,
        error: error.message
      })
      throw error
    }
  }

  async assessBatchFreshness(contextIds: string[]): Promise<FreshnessAssessment[]> {
    try {
      logger.info('Assessing batch context freshness', { contextIdsCount: contextIds.length })

      const assessments: FreshnessAssessment[] = []

      // Process in batches to avoid overwhelming the system
      const batchSize = 10
      for (let i = 0; i < contextIds.length; i += batchSize) {
        const batch = contextIds.slice(i, i + batchSize)
        
        const batchAssessments = await Promise.all(
          batch.map(contextId => this.assessFreshness(contextId))
        )
        
        assessments.push(...batchAssessments)
      }

      logger.info('Batch context freshness assessment completed', {
        totalContexts: contextIds.length,
        assessmentsCount: assessments.length
      })

      return assessments

    } catch (error) {
      logger.error('Failed to assess batch context freshness', {
        contextIdsCount: contextIds.length,
        error: error.message
      })
      throw error
    }
  }

  async calculateFreshnessScore(context: ContextItem): Promise<number> {
    try {
      return await this.freshnessAssessor.calculateFreshnessScore(context)

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
      return await this.freshnessAssessor.calculateDecayRate(context)

    } catch (error) {
      logger.error('Failed to calculate decay rate', {
        contextId: context.id,
        error: error.message
      })
      return 0
    }
  }

  async prioritizeByFreshness(contexts: ContextItem[]): Promise<PrioritizedContext[]> {
    try {
      logger.info('Prioritizing contexts by freshness', { contextsCount: contexts.length })

      const prioritizedContexts = await this.timeBasedPrioritizer.prioritizeByFreshness(contexts)

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
      logger.info('Prioritizing contexts by time decay', { contextsCount: contexts.length })

      const prioritizedContexts = await this.timeBasedPrioritizer.prioritizeByTimeDecay(contexts)

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
      logger.info('Prioritizing contexts by update frequency', { contextsCount: contexts.length })

      const prioritizedContexts = await this.timeBasedPrioritizer.prioritizeByUpdateFrequency(contexts)

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
      logger.info('Prioritizing contexts by access pattern', { contextsCount: contexts.length })

      const prioritizedContexts = await this.timeBasedPrioritizer.prioritizeByAccessPattern(contexts)

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

  async refreshContext(contextId: string): Promise<RefreshResult> {
    try {
      logger.info('Refreshing context', { contextId })

      // Get context item
      const context = await this.getContextItem(contextId)
      if (!context) {
        throw new Error(`Context not found: ${contextId}`)
      }

      // Refresh context
      const refreshResult = await this.refreshScheduler.refreshContext(context)

      // Store refresh result
      await this.storeRefreshResult(refreshResult)

      logger.info('Context refresh completed', {
        contextId,
        success: refreshResult.success,
        newFreshnessScore: refreshResult.new_freshness_score
      })

      return refreshResult

    } catch (error) {
      logger.error('Failed to refresh context', {
        contextId,
        error: error.message
      })
      throw error
    }
  }

  async refreshBatchContexts(contextIds: string[]): Promise<RefreshResult[]> {
    try {
      logger.info('Refreshing batch contexts', { contextIdsCount: contextIds.length })

      const refreshResults: RefreshResult[] = []

      // Process in batches to avoid overwhelming the system
      const batchSize = this.config.maxConcurrentRefreshes
      for (let i = 0; i < contextIds.length; i += batchSize) {
        const batch = contextIds.slice(i, i + batchSize)
        
        const batchResults = await Promise.all(
          batch.map(contextId => this.refreshContext(contextId))
        )
        
        refreshResults.push(...batchResults)
      }

      logger.info('Batch context refresh completed', {
        totalContexts: contextIds.length,
        successfulRefreshes: refreshResults.filter(r => r.success).length,
        failedRefreshes: refreshResults.filter(r => !r.success).length
      })

      return refreshResults

    } catch (error) {
      logger.error('Failed to refresh batch contexts', {
        contextIdsCount: contextIds.length,
        error: error.message
      })
      throw error
    }
  }

  async scheduleRefresh(contextId: string, schedule: RefreshSchedule): Promise<void> {
    try {
      logger.info('Scheduling context refresh', { contextId, scheduleType: schedule.schedule_type })

      await this.refreshScheduler.scheduleRefresh(contextId, schedule)

      logger.info('Context refresh scheduled successfully', { contextId })

    } catch (error) {
      logger.error('Failed to schedule context refresh', {
        contextId,
        error: error.message
      })
      throw error
    }
  }

  async cancelScheduledRefresh(contextId: string): Promise<void> {
    try {
      logger.info('Cancelling scheduled context refresh', { contextId })

      await this.refreshScheduler.cancelScheduledRefresh(contextId)

      logger.info('Scheduled context refresh cancelled successfully', { contextId })

    } catch (error) {
      logger.error('Failed to cancel scheduled context refresh', {
        contextId,
        error: error.message
      })
      throw error
    }
  }

  async identifyStaleContexts(threshold?: number): Promise<StaleContext[]> {
    try {
      logger.info('Identifying stale contexts', { threshold })

      const staleContexts = await this.stalenessManager.identifyStaleContexts(threshold)

      logger.info('Stale contexts identification completed', {
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

      await this.stalenessManager.markAsStale(contextId, reason)

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

      await this.stalenessManager.markAsFresh(contextId)

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

      const cleanupResult = await this.stalenessManager.cleanupStaleContexts(threshold)

      logger.info('Stale contexts cleanup completed', {
        contextsProcessed: cleanupResult.contexts_processed,
        contextsCleaned: cleanupResult.contexts_cleaned
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

  async applyFreshnessPolicy(contextId: string, policy: FreshnessPolicy): Promise<PolicyResult> {
    try {
      logger.info('Applying freshness policy', { contextId, policyId: policy.policy_id })

      const policyResult = await this.freshnessPolicyEngine.applyPolicy(contextId, policy)

      // Store policy result
      await this.storePolicyResult(policyResult)

      logger.info('Freshness policy applied successfully', {
        contextId,
        policyId: policy.policy_id,
        success: policyResult.success
      })

      return policyResult

    } catch (error) {
      logger.error('Failed to apply freshness policy', {
        contextId,
        policyId: policy.policy_id,
        error: error.message
      })
      throw error
    }
  }

  async evaluateFreshnessPolicy(policy: FreshnessPolicy, contexts: ContextItem[]): Promise<PolicyEvaluation> {
    try {
      logger.info('Evaluating freshness policy', { policyId: policy.policy_id, contextsCount: contexts.length })

      const evaluationResult = await this.freshnessPolicyEngine.evaluatePolicy(policy.policy_id, contexts)

      const evaluation: PolicyEvaluation = {
        policy_id: policy.policy_id,
        evaluated_at: new Date(),
        contexts_evaluated: contexts.length,
        actions_recommended: [],
        actions_executed: [],
        success_rate: evaluationResult.success_rate || 0,
        performance_impact: {
          processing_time_change: 0,
          memory_usage_change: 0,
          cpu_usage_change: 0,
          network_usage_change: 0,
          storage_usage_change: 0
        },
        quality_impact: {
          freshness_improvement: 0,
          accuracy_improvement: 0,
          completeness_improvement: 0,
          consistency_improvement: 0,
          reliability_improvement: 0
        },
        cost_benefit_analysis: {
          implementation_cost: 0,
          operational_cost: 0,
          quality_benefit: 0,
          performance_benefit: 0,
          user_satisfaction_benefit: 0,
          roi: 0,
          payback_period: 0
        },
        recommendations: [],
        evaluation_score: evaluationResult.evaluation_score
      }

      // Store policy evaluation
      await this.storePolicyEvaluation(evaluation)

      logger.info('Freshness policy evaluation completed', {
        policyId: policy.policy_id,
        successRate: evaluation.success_rate
      })

      return evaluation

    } catch (error) {
      logger.error('Failed to evaluate freshness policy', {
        policyId: policy.policy_id,
        contextsCount: contexts.length,
        error: error.message
      })
      throw error
    }
  }

  async updateFreshnessPolicy(policyId: string, updates: Partial<FreshnessPolicy>): Promise<FreshnessPolicy> {
    try {
      logger.info('Updating freshness policy', { policyId })

      const updatedPolicy = await this.freshnessPolicyEngine.updatePolicy(policyId, updates)

      logger.info('Freshness policy updated successfully', { policyId })

      return updatedPolicy

    } catch (error) {
      logger.error('Failed to update freshness policy', {
        policyId,
        error: error.message
      })
      throw error
    }
  }

  async getFreshnessMetrics(timeframe: string): Promise<FreshnessMetrics> {
    try {
      logger.info('Getting freshness metrics', { timeframe })

      const metrics = await this.freshnessAnalytics.getFreshnessMetrics(timeframe)

      logger.info('Freshness metrics retrieved successfully', {
        timeframe,
        totalContexts: metrics.total_contexts,
        averageFreshnessScore: metrics.average_freshness_score
      })

      return metrics

    } catch (error) {
      logger.error('Failed to get freshness metrics', {
        timeframe,
        error: error.message
      })
      throw error
    }
  }

  async getFreshnessTrends(contextId: string, timeframe: string): Promise<FreshnessTrend[]> {
    try {
      logger.info('Getting freshness trends', { contextId, timeframe })

      const trends = await this.freshnessAnalytics.getFreshnessTrends(contextId, timeframe)

      logger.info('Freshness trends retrieved successfully', {
        contextId,
        timeframe,
        trendsCount: trends.length
      })

      return trends

    } catch (error) {
      logger.error('Failed to get freshness trends', {
        contextId,
        timeframe,
        error: error.message
      })
      throw error
    }
  }

  async getStalenessReport(): Promise<StalenessReport> {
    try {
      logger.info('Generating staleness report')

      const report = await this.freshnessAnalytics.generateStalenessReport()

      logger.info('Staleness report generated successfully', {
        totalContexts: report.total_contexts,
        staleContexts: report.stale_contexts
      })

      return report

    } catch (error) {
      logger.error('Failed to generate staleness report', {
        error: error.message
      })
      throw error
    }
  }

  async monitorFreshnessHealth(): Promise<FreshnessHealthStatus> {
    try {
      logger.info('Monitoring freshness health')

      const healthStatus = await this.freshnessAnalytics.monitorHealth()

      logger.info('Freshness health monitoring completed', {
        overallHealth: healthStatus.overall_health,
        healthScore: healthStatus.health_score
      })

      return healthStatus

    } catch (error) {
      logger.error('Failed to monitor freshness health', {
        error: error.message
      })
      throw error
    }
  }

  // Private helper methods
  private async getContextItem(contextId: string): Promise<ContextItem | null> {
    try {
      // This would retrieve context item from database
      // For now, return null as placeholder
      return null

    } catch (error) {
      logger.error('Failed to get context item', {
        contextId,
        error: error.message
      })
      return null
    }
  }

  private async storeFreshnessAssessment(assessment: FreshnessAssessment): Promise<void> {
    try {
      await pool.query(
        `
        INSERT INTO context_freshness_assessments (
          context_id, assessed_at, freshness_score, staleness_level, decay_rate,
          time_since_update, time_since_access, freshness_trend, recommendations, next_assessment_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `,
        [
          assessment.context_id,
          assessment.assessed_at,
          assessment.freshness_score,
          assessment.staleness_level,
          assessment.decay_rate,
          assessment.time_since_update,
          assessment.time_since_access,
          JSON.stringify(assessment.freshness_trend),
          JSON.stringify(assessment.recommendations),
          assessment.next_assessment_at
        ]
      )

    } catch (error) {
      logger.error('Failed to store freshness assessment', {
        contextId: assessment.context_id,
        error: error.message
      })
    }
  }

  private async storeRefreshResult(refreshResult: RefreshResult): Promise<void> {
    try {
      await pool.query(
        `
        INSERT INTO context_refresh_results (
          context_id, refreshed_at, refresh_duration, success, new_freshness_score,
          changes_detected, change_summary, error_message, performance_metrics
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `,
        [
          refreshResult.context_id,
          refreshResult.refreshed_at,
          refreshResult.refresh_duration,
          refreshResult.success,
          refreshResult.new_freshness_score,
          refreshResult.changes_detected,
          JSON.stringify(refreshResult.change_summary),
          refreshResult.error_message,
          JSON.stringify(refreshResult.performance_metrics)
        ]
      )

    } catch (error) {
      logger.error('Failed to store refresh result', {
        contextId: refreshResult.context_id,
        error: error.message
      })
    }
  }

  private async storePolicyResult(policyResult: PolicyResult): Promise<void> {
    try {
      await pool.query(
        `
        INSERT INTO context_freshness_policy_results (
          policy_id, context_id, applied_at, success, actions_taken,
          performance_impact, quality_impact, error_message
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `,
        [
          policyResult.policy_id,
          policyResult.context_id,
          policyResult.applied_at,
          policyResult.success,
          JSON.stringify(policyResult.actions_taken),
          JSON.stringify(policyResult.performance_impact),
          JSON.stringify(policyResult.quality_impact),
          policyResult.error_message
        ]
      )

    } catch (error) {
      logger.error('Failed to store policy result', {
        policyId: policyResult.policy_id,
        contextId: policyResult.context_id,
        error: error.message
      })
    }
  }

  private async storePolicyEvaluation(evaluation: PolicyEvaluation): Promise<void> {
    try {
      await pool.query(
        `
        INSERT INTO context_freshness_policy_evaluations (
          policy_id, evaluated_at, contexts_evaluated, actions_recommended, actions_executed,
          success_rate, performance_impact, quality_impact, cost_benefit_analysis, recommendations
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `,
        [
          evaluation.policy_id,
          evaluation.evaluated_at,
          evaluation.contexts_evaluated,
          evaluation.actions_recommended,
          evaluation.actions_executed,
          evaluation.success_rate,
          JSON.stringify(evaluation.performance_impact),
          JSON.stringify(evaluation.quality_impact),
          JSON.stringify(evaluation.cost_benefit_analysis),
          JSON.stringify(evaluation.recommendations)
        ]
      )

    } catch (error) {
      logger.error('Failed to store policy evaluation', {
        policyId: evaluation.policy_id,
        error: error.message
      })
    }
  }
}
