/**
 * Freshness Policy Engine
 * Manages and evaluates context freshness policies
 */

import { logger } from '../../../utils/logger'
import type { 
  IFreshnessPolicyEngine, 
  ContextFreshnessPolicy, 
  PolicyEvaluationResult,
  FreshnessMetrics,
  FreshnessHealthStatus
} from '../types'

export class FreshnessPolicyEngine implements IFreshnessPolicyEngine {
  private policies: Map<string, ContextFreshnessPolicy> = new Map()

  constructor() {
    this.initializeDefaultPolicies()
  }

  async createPolicy(policy: ContextFreshnessPolicy): Promise<ContextFreshnessPolicy> {
    try {
      logger.debug('Creating freshness policy', { policyId: policy.policy_id })

      this.policies.set(policy.policy_id, policy)

      logger.info('Freshness policy created successfully', { policyId: policy.policy_id })
      return policy

    } catch (error) {
      logger.error('Failed to create freshness policy', {
        policyId: policy.policy_id,
        error: error.message
      })
      throw error
    }
  }

  async updatePolicy(policyId: string, updates: Partial<ContextFreshnessPolicy>): Promise<ContextFreshnessPolicy> {
    try {
      logger.debug('Updating freshness policy', { policyId })

      const existingPolicy = this.policies.get(policyId)
      if (!existingPolicy) {
        throw new Error(`Policy not found: ${policyId}`)
      }

      const updatedPolicy = { ...existingPolicy, ...updates, updated_at: new Date() }
      this.policies.set(policyId, updatedPolicy)

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

  async deletePolicy(policyId: string): Promise<boolean> {
    try {
      logger.debug('Deleting freshness policy', { policyId })

      const deleted = this.policies.delete(policyId)

      if (deleted) {
        logger.info('Freshness policy deleted successfully', { policyId })
      } else {
        logger.warn('Freshness policy not found for deletion', { policyId })
      }

      return deleted

    } catch (error) {
      logger.error('Failed to delete freshness policy', {
        policyId,
        error: error.message
      })
      throw error
    }
  }

  async getPolicy(policyId: string): Promise<ContextFreshnessPolicy | null> {
    try {
      logger.debug('Getting freshness policy', { policyId })

      const policy = this.policies.get(policyId) || null

      if (policy) {
        logger.debug('Freshness policy retrieved successfully', { policyId })
      } else {
        logger.warn('Freshness policy not found', { policyId })
      }

      return policy

    } catch (error) {
      logger.error('Failed to get freshness policy', {
        policyId,
        error: error.message
      })
      throw error
    }
  }

  async listPolicies(): Promise<ContextFreshnessPolicy[]> {
    try {
      logger.debug('Listing freshness policies')

      const policies = Array.from(this.policies.values())

      logger.debug('Freshness policies listed successfully', { policyCount: policies.length })
      return policies

    } catch (error) {
      logger.error('Failed to list freshness policies', {
        error: error.message
      })
      throw error
    }
  }

  async evaluatePolicy(policyId: string, contextData: any): Promise<PolicyEvaluationResult> {
    try {
      logger.debug('Evaluating freshness policy', { policyId })

      const policy = this.policies.get(policyId)
      if (!policy) {
        throw new Error(`Policy not found: ${policyId}`)
      }

      const evaluationResult = await this.performPolicyEvaluation(policy, contextData)

      logger.info('Freshness policy evaluated successfully', {
        policyId,
        evaluationScore: evaluationResult.evaluation_score,
        evaluationStatus: evaluationResult.evaluation_status
      })

      return evaluationResult

    } catch (error) {
      logger.error('Failed to evaluate freshness policy', {
        policyId,
        error: error.message
      })
      throw error
    }
  }

  async evaluateAllPolicies(contextData: any): Promise<PolicyEvaluationResult[]> {
    try {
      logger.debug('Evaluating all freshness policies')

      const evaluationResults: PolicyEvaluationResult[] = []

      for (const [policyId, policy] of this.policies) {
        try {
          const result = await this.evaluatePolicy(policyId, contextData)
          evaluationResults.push(result)
        } catch (error) {
          logger.warn('Failed to evaluate policy', {
            policyId,
            error: error.message
          })
        }
      }

      logger.info('All freshness policies evaluated successfully', {
        totalPolicies: this.policies.size,
        successfulEvaluations: evaluationResults.length
      })

      return evaluationResults

    } catch (error) {
      logger.error('Failed to evaluate all freshness policies', {
        error: error.message
      })
      throw error
    }
  }

  async optimizePolicy(policyId: string, metrics: FreshnessMetrics): Promise<ContextFreshnessPolicy> {
    try {
      logger.debug('Optimizing freshness policy', { policyId })

      const policy = this.policies.get(policyId)
      if (!policy) {
        throw new Error(`Policy not found: ${policyId}`)
      }

      const optimizedPolicy = await this.performPolicyOptimization(policy, metrics)

      this.policies.set(policyId, optimizedPolicy)

      logger.info('Freshness policy optimized successfully', { policyId })
      return optimizedPolicy

    } catch (error) {
      logger.error('Failed to optimize freshness policy', {
        policyId,
        error: error.message
      })
      throw error
    }
  }

  async getPolicyMetrics(policyId: string): Promise<FreshnessMetrics> {
    try {
      logger.debug('Getting policy metrics', { policyId })

      const policy = this.policies.get(policyId)
      if (!policy) {
        throw new Error(`Policy not found: ${policyId}`)
      }

      const metrics = await this.calculatePolicyMetrics(policy)

      logger.debug('Policy metrics retrieved successfully', { policyId })
      return metrics

    } catch (error) {
      logger.error('Failed to get policy metrics', {
        policyId,
        error: error.message
      })
      throw error
    }
  }

  async getPolicyHealthStatus(policyId: string): Promise<FreshnessHealthStatus> {
    try {
      logger.debug('Getting policy health status', { policyId })

      const policy = this.policies.get(policyId)
      if (!policy) {
        throw new Error(`Policy not found: ${policyId}`)
      }

      const healthStatus = await this.calculatePolicyHealthStatus(policy)

      logger.debug('Policy health status retrieved successfully', { policyId })
      return healthStatus

    } catch (error) {
      logger.error('Failed to get policy health status', {
        policyId,
        error: error.message
      })
      throw error
    }
  }

  private async performPolicyEvaluation(policy: ContextFreshnessPolicy, contextData: any): Promise<PolicyEvaluationResult> {
    try {
      let evaluationScore = 0.0
      const evaluationFactors: string[] = []
      const evaluationViolations: string[] = []

      // Evaluate freshness thresholds
      if (policy.freshness_thresholds) {
        for (const threshold of policy.freshness_thresholds) {
          const contextAge = this.calculateContextAge(contextData, threshold.context_type)
          if (contextAge > threshold.max_age_hours) {
            evaluationViolations.push(`Context ${threshold.context_type} exceeds max age threshold`)
            evaluationScore -= 0.1
          } else {
            evaluationFactors.push(`Context ${threshold.context_type} within age threshold`)
            evaluationScore += 0.1
          }
        }
      }

      // Evaluate refresh requirements
      if (policy.refresh_requirements) {
        for (const requirement of policy.refresh_requirements) {
          const lastRefresh = this.getLastRefreshTime(contextData, requirement.context_type)
          const refreshInterval = requirement.refresh_interval_hours
          
          if (lastRefresh && (Date.now() - lastRefresh.getTime()) > (refreshInterval * 60 * 60 * 1000)) {
            evaluationViolations.push(`Context ${requirement.context_type} requires refresh`)
            evaluationScore -= 0.1
          } else {
            evaluationFactors.push(`Context ${requirement.context_type} refresh up to date`)
            evaluationScore += 0.1
          }
        }
      }

      // Evaluate quality requirements
      if (policy.quality_requirements) {
        for (const requirement of policy.quality_requirements) {
          const qualityScore = this.getQualityScore(contextData, requirement.context_type)
          if (qualityScore < requirement.min_quality_score) {
            evaluationViolations.push(`Context ${requirement.context_type} quality below threshold`)
            evaluationScore -= 0.1
          } else {
            evaluationFactors.push(`Context ${requirement.context_type} quality meets threshold`)
            evaluationScore += 0.1
          }
        }
      }

      // Normalize evaluation score
      evaluationScore = Math.max(0, Math.min(1, evaluationScore))

      const evaluationResult: PolicyEvaluationResult = {
        evaluation_id: `eval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        policy_id: policy.policy_id,
        evaluation_timestamp: new Date(),
        evaluation_score: evaluationScore,
        evaluation_status: evaluationScore >= 0.7 ? 'compliant' : evaluationScore >= 0.4 ? 'warning' : 'non_compliant',
        evaluation_factors: evaluationFactors,
        evaluation_violations: evaluationViolations,
        evaluation_confidence: 0.8,
        evaluation_recommendations: this.generateEvaluationRecommendations(evaluationScore, evaluationViolations),
        evaluation_metadata: {
          policy_name: policy.policy_name,
          policy_version: policy.policy_version,
          evaluation_duration: 100 // Simplified
        }
      }

      return evaluationResult

    } catch (error) {
      logger.error('Failed to perform policy evaluation', {
        policyId: policy.policy_id,
        error: error.message
      })
      throw error
    }
  }

  private async performPolicyOptimization(policy: ContextFreshnessPolicy, metrics: FreshnessMetrics): Promise<ContextFreshnessPolicy> {
    try {
      const optimizedPolicy = { ...policy }

      // Optimize freshness thresholds based on metrics
      if (metrics.average_freshness_score < 0.7) {
        optimizedPolicy.freshness_thresholds = optimizedPolicy.freshness_thresholds?.map(threshold => ({
          ...threshold,
          max_age_hours: Math.max(1, threshold.max_age_hours * 0.8) // Reduce threshold by 20%
        }))
      }

      // Optimize refresh requirements based on metrics
      if (metrics.refresh_success_rate < 0.8) {
        optimizedPolicy.refresh_requirements = optimizedPolicy.refresh_requirements?.map(requirement => ({
          ...requirement,
          refresh_interval_hours: Math.max(1, requirement.refresh_interval_hours * 0.9) // Reduce interval by 10%
        }))
      }

      // Optimize quality requirements based on metrics
      if (metrics.average_quality_score < 0.8) {
        optimizedPolicy.quality_requirements = optimizedPolicy.quality_requirements?.map(requirement => ({
          ...requirement,
          min_quality_score: Math.max(0.5, requirement.min_quality_score * 0.9) // Reduce threshold by 10%
        }))
      }

      optimizedPolicy.updated_at = new Date()
      optimizedPolicy.policy_version = (parseFloat(optimizedPolicy.policy_version || '1.0') + 0.1).toFixed(1)

      return optimizedPolicy

    } catch (error) {
      logger.error('Failed to perform policy optimization', {
        policyId: policy.policy_id,
        error: error.message
      })
      throw error
    }
  }

  private async calculatePolicyMetrics(policy: ContextFreshnessPolicy): Promise<FreshnessMetrics> {
    try {
      return {
        total_context_items: 100, // Simplified
        fresh_context_items: 85,
        stale_context_items: 15,
        average_freshness_score: 0.85,
        average_quality_score: 0.82,
        refresh_success_rate: 0.88,
        refresh_failure_rate: 0.12,
        average_refresh_time: 150, // milliseconds
        policy_compliance_rate: 0.90,
        metrics_timestamp: new Date(),
        metrics_metadata: {
          policy_id: policy.policy_id,
          policy_name: policy.policy_name
        }
      }

    } catch (error) {
      logger.error('Failed to calculate policy metrics', {
        policyId: policy.policy_id,
        error: error.message
      })
      throw error
    }
  }

  private async calculatePolicyHealthStatus(policy: ContextFreshnessPolicy): Promise<FreshnessHealthStatus> {
    try {
      const metrics = await this.calculatePolicyMetrics(policy)
      
      let healthScore = 0.0
      const healthFactors: string[] = []

      // Calculate health score based on metrics
      healthScore += metrics.average_freshness_score * 0.3
      healthScore += metrics.average_quality_score * 0.3
      healthScore += metrics.refresh_success_rate * 0.2
      healthScore += metrics.policy_compliance_rate * 0.2

      // Add health factors
      if (metrics.average_freshness_score >= 0.8) {
        healthFactors.push('Good freshness score')
      }
      if (metrics.average_quality_score >= 0.8) {
        healthFactors.push('Good quality score')
      }
      if (metrics.refresh_success_rate >= 0.8) {
        healthFactors.push('Good refresh success rate')
      }
      if (metrics.policy_compliance_rate >= 0.8) {
        healthFactors.push('Good policy compliance rate')
      }

      const healthStatus: FreshnessHealthStatus = {
        health_id: `health_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        policy_id: policy.policy_id,
        health_score: healthScore,
        health_status: healthScore >= 0.8 ? 'healthy' : healthScore >= 0.6 ? 'warning' : 'critical',
        health_factors: healthFactors,
        health_metrics: metrics,
        health_timestamp: new Date(),
        health_metadata: {
          policy_name: policy.policy_name,
          policy_version: policy.policy_version
        }
      }

      return healthStatus

    } catch (error) {
      logger.error('Failed to calculate policy health status', {
        policyId: policy.policy_id,
        error: error.message
      })
      throw error
    }
  }

  private initializeDefaultPolicies(): void {
    try {
      // Default policy for project context
      const projectPolicy: ContextFreshnessPolicy = {
        policy_id: 'default_project_policy',
        policy_name: 'Default Project Context Policy',
        policy_description: 'Default freshness policy for project context data',
        policy_type: 'context_freshness',
        policy_version: '1.0',
        policy_priority: 1,
        policy_enabled: true,
        freshness_thresholds: [
          {
            context_type: 'project_data',
            max_age_hours: 24,
            threshold_description: 'Project data should be refreshed within 24 hours'
          }
        ],
        refresh_requirements: [
          {
            context_type: 'project_data',
            refresh_interval_hours: 12,
            refresh_method: 'automatic',
            refresh_priority: 'high'
          }
        ],
        quality_requirements: [
          {
            context_type: 'project_data',
            min_quality_score: 0.8,
            quality_factors: ['completeness', 'accuracy', 'timeliness']
          }
        ],
        policy_conditions: [],
        policy_actions: [],
        created_at: new Date(),
        updated_at: new Date(),
        created_by: 'system',
        policy_metadata: {}
      }

      this.policies.set(projectPolicy.policy_id, projectPolicy)

      // Default policy for user profile context
      const userPolicy: ContextFreshnessPolicy = {
        policy_id: 'default_user_policy',
        policy_name: 'Default User Profile Policy',
        policy_description: 'Default freshness policy for user profile context data',
        policy_type: 'context_freshness',
        policy_version: '1.0',
        policy_priority: 2,
        policy_enabled: true,
        freshness_thresholds: [
          {
            context_type: 'user_profile',
            max_age_hours: 168, // 1 week
            threshold_description: 'User profile data should be refreshed within 1 week'
          }
        ],
        refresh_requirements: [
          {
            context_type: 'user_profile',
            refresh_interval_hours: 72, // 3 days
            refresh_method: 'automatic',
            refresh_priority: 'medium'
          }
        ],
        quality_requirements: [
          {
            context_type: 'user_profile',
            min_quality_score: 0.7,
            quality_factors: ['completeness', 'accuracy']
          }
        ],
        policy_conditions: [],
        policy_actions: [],
        created_at: new Date(),
        updated_at: new Date(),
        created_by: 'system',
        policy_metadata: {}
      }

      this.policies.set(userPolicy.policy_id, userPolicy)

      logger.info('Default freshness policies initialized', {
        policyCount: this.policies.size
      })

    } catch (error) {
      logger.error('Failed to initialize default policies', {
        error: error.message
      })
    }
  }

  private calculateContextAge(contextData: any, contextType: string): number {
    // Simplified context age calculation
    if (contextData[contextType]?.metadata?.data_freshness) {
      const freshness = contextData[contextType].metadata.data_freshness
      const now = new Date()
      const hoursDiff = (now.getTime() - new Date(freshness).getTime()) / (1000 * 60 * 60)
      return hoursDiff
    }
    return 0
  }

  private getLastRefreshTime(contextData: any, contextType: string): Date | null {
    // Simplified last refresh time retrieval
    if (contextData[contextType]?.metadata?.analysis_timestamp) {
      return new Date(contextData[contextType].metadata.analysis_timestamp)
    }
    return null
  }

  private getQualityScore(contextData: any, contextType: string): number {
    // Simplified quality score retrieval
    if (contextData[contextType]?.metadata?.analysis_confidence) {
      return contextData[contextType].metadata.analysis_confidence
    }
    return 0.5
  }

  private generateEvaluationRecommendations(evaluationScore: number, violations: string[]): string[] {
    const recommendations: string[] = []

    if (evaluationScore < 0.7) {
      recommendations.push('Improve context freshness management')
      recommendations.push('Review and update refresh schedules')
    }

    if (violations.length > 0) {
      recommendations.push('Address policy violations')
      recommendations.push('Implement corrective actions')
    }

    if (evaluationScore >= 0.8) {
      recommendations.push('Maintain current freshness policies')
      recommendations.push('Continue monitoring context quality')
    }

    return recommendations
  }
}