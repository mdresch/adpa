/**
 * Context Optimizer
 * Optimizes context data for document generation
 */

import { randomUUID } from 'crypto'
import { logger } from '@/utils/logger'
import type { OptimizedContextData, ContextSourcePriority } from '../types'

export class ContextOptimizer {
  async optimizeContext(integratedContext: any): Promise<OptimizedContextData> {
    try {
      logger.debug('Optimizing context data for document generation')

      const startTime = Date.now()

      // Optimize context sources
      const optimizedSources = await this.optimizeContextSources(integratedContext)
      
      // Prioritize context
      const contextPriorities = await this.prioritizeContext(integratedContext)
      
      // Weight context
      const contextWeights = await this.weightContext(integratedContext)
      
      // Filter context
      const contextFilters = await this.filterContext(integratedContext)
      
      // Aggregate context
      const contextAggregations = await this.aggregateContext(integratedContext)
      
      // Summarize context
      const contextSummaries = await this.summarizeContext(integratedContext)
      
      // Highlight key points
      const contextHighlights = await this.highlightContext(integratedContext)
      
      // Extract key points
      const contextKeyPoints = await this.extractKeyPoints(integratedContext)
      
      // Identify action items
      const contextActionItems = await this.identifyActionItems(integratedContext)
      
      // Identify risks
      const contextRisks = await this.identifyRisks(integratedContext)
      
      // Identify opportunities
      const contextOpportunities = await this.identifyOpportunities(integratedContext)
      
      // Identify decisions
      const contextDecisions = await this.identifyDecisions(integratedContext)
      
      // Identify assumptions
      const contextAssumptions = await this.identifyAssumptions(integratedContext)
      
      // Identify constraints
      const contextConstraints = await this.identifyConstraints(integratedContext)
      
      // Identify success factors
      const contextSuccessFactors = await this.identifySuccessFactors(integratedContext)

      const optimizedContext: OptimizedContextData = {
        optimized_sources: optimizedSources,
        context_priorities: contextPriorities,
        context_weights: contextWeights,
        context_filters: contextFilters,
        context_aggregations: contextAggregations,
        context_summaries: contextSummaries,
        context_highlights: contextHighlights,
        context_key_points: contextKeyPoints,
        context_action_items: contextActionItems,
        context_risks: contextRisks,
        context_opportunities: contextOpportunities,
        context_decisions: contextDecisions,
        context_assumptions: contextAssumptions,
        context_constraints: contextConstraints,
        context_success_factors: contextSuccessFactors,
        metadata: {
          optimization_timestamp: new Date(),
          optimization_duration: Date.now() - startTime,
          optimization_confidence: 0.9,
          optimization_quality: 0.8,
          optimization_impact: 0.7
        }
      }

      logger.info('Context optimization completed successfully', {
        optimizedSources: optimizedSources.length,
        contextPriorities: contextPriorities.length,
        contextKeyPoints: contextKeyPoints.length,
        contextRisks: contextRisks.length,
        optimizationTime: Date.now() - startTime
      })

      return optimizedContext

    } catch (error) {
      logger.error('Context optimization failed', {
        error: error.message
      })
      throw error
    }
  }

  async prioritizeContextSources(integratedContext: any): Promise<ContextSourcePriority[]> {
    try {
      logger.debug('Prioritizing context sources')

      const sourcePriorities: ContextSourcePriority[] = []

      // Prioritize integrated sources
      if (integratedContext.integrated_sources) {
        for (const source of integratedContext.integrated_sources) {
          const priorityScore = this.calculateSourcePriority(source)
          const priorityFactors = this.identifyPriorityFactors(source)
          
          sourcePriorities.push({
            source_id: source.source_id,
            source_name: source.source_name,
            priority_score: priorityScore,
            priority_factors: priorityFactors,
            priority_justification: this.generatePriorityJustification(source, priorityScore),
            priority_recommendations: this.generatePriorityRecommendations(source, priorityScore),
            priority_metadata: {
              optimization_timestamp: new Date(),
              optimization_confidence: 0.8
            }
          })
        }
      }

      // Sort by priority score
      sourcePriorities.sort((a, b) => b.priority_score - a.priority_score)

      logger.debug('Context sources prioritized', {
        sourceCount: sourcePriorities.length,
        highPrioritySources: sourcePriorities.filter(s => s.priority_score > 0.8).length
      })

      return sourcePriorities

    } catch (error) {
      logger.error('Failed to prioritize context sources', {
        error: error.message
      })
      return []
    }
  }

  private async optimizeContextSources(integratedContext: any): Promise<any[]> {
    try {
      const optimizedSources: any[] = []

      // Optimize each integrated source
      if (integratedContext.integrated_sources) {
        for (const source of integratedContext.integrated_sources) {
          const optimizedSource = await this.optimizeSource(source)
          optimizedSources.push(optimizedSource)
        }
      }

      return optimizedSources

    } catch (error) {
      logger.error('Failed to optimize context sources', {
        error: error.message
      })
      return []
    }
  }

  private async prioritizeContext(integratedContext: any): Promise<any[]> {
    try {
      const contextPriorities: any[] = []

      // Prioritize based on context quality scores
      if (integratedContext.context_quality_scores) {
        for (const qualityScore of integratedContext.context_quality_scores) {
          contextPriorities.push({
            priority_id: `priority_${randomUUID()}`,
            context_source: qualityScore.context_source,
            priority_level: this.calculatePriorityLevel(qualityScore.quality_score),
            priority_score: qualityScore.quality_score,
            priority_factors: ['quality_score'],
            priority_justification: `Priority based on quality score: ${qualityScore.quality_score}`,
            priority_metadata: {}
          })
        }
      }

      // Prioritize based on context relevance scores
      if (integratedContext.context_relevance_scores) {
        for (const relevanceScore of integratedContext.context_relevance_scores) {
          contextPriorities.push({
            priority_id: `priority_${randomUUID()}`,
            context_source: relevanceScore.context_source,
            priority_level: this.calculatePriorityLevel(relevanceScore.relevance_score),
            priority_score: relevanceScore.relevance_score,
            priority_factors: ['relevance_score'],
            priority_justification: `Priority based on relevance score: ${relevanceScore.relevance_score}`,
            priority_metadata: {}
          })
        }
      }

      return contextPriorities

    } catch (error) {
      logger.error('Failed to prioritize context', {
        error: error.message
      })
      return []
    }
  }

  private async weightContext(integratedContext: any): Promise<any[]> {
    try {
      const contextWeights: any[] = []

      // Weight based on context confidence scores
      if (integratedContext.context_confidence_scores) {
        for (const confidenceScore of integratedContext.context_confidence_scores) {
          contextWeights.push({
            weight_id: `weight_${randomUUID()}`,
            context_source: confidenceScore.context_source,
            weight_value: confidenceScore.confidence_score,
            weight_factors: ['confidence_score'],
            weight_justification: `Weight based on confidence score: ${confidenceScore.confidence_score}`,
            weight_metadata: {}
          })
        }
      }

      return contextWeights

    } catch (error) {
      logger.error('Failed to weight context', {
        error: error.message
      })
      return []
    }
  }

  private async filterContext(integratedContext: any): Promise<any[]> {
    try {
      const contextFilters: any[] = []

      // Filter based on context quality threshold
      const qualityThreshold = 0.7
      
      if (integratedContext.context_quality_scores) {
        for (const qualityScore of integratedContext.context_quality_scores) {
          if (qualityScore.quality_score >= qualityThreshold) {
            contextFilters.push({
              filter_id: `filter_${randomUUID()}`,
              context_source: qualityScore.context_source,
              filter_type: 'quality_threshold',
              filter_value: qualityThreshold,
              filter_result: 'included',
              filter_justification: `Included due to quality score: ${qualityScore.quality_score}`,
              filter_metadata: {}
            })
          } else {
            contextFilters.push({
              filter_id: `filter_${randomUUID()}`,
              context_source: qualityScore.context_source,
              filter_type: 'quality_threshold',
              filter_value: qualityThreshold,
              filter_result: 'excluded',
              filter_justification: `Excluded due to low quality score: ${qualityScore.quality_score}`,
              filter_metadata: {}
            })
          }
        }
      }

      return contextFilters

    } catch (error) {
      logger.error('Failed to filter context', {
        error: error.message
      })
      return []
    }
  }

  private async aggregateContext(integratedContext: any): Promise<any[]> {
    try {
      const contextAggregations: any[] = []

      // Aggregate context by source type
      const sourceTypes = this.groupContextBySourceType(integratedContext)
      
      for (const [sourceType, sources] of Object.entries(sourceTypes)) {
        contextAggregations.push({
          aggregation_id: `aggregation_${randomUUID()}`,
          aggregation_type: 'source_type',
          aggregation_key: sourceType,
          aggregation_value: sources,
          aggregation_count: Array.isArray(sources) ? sources.length : 1,
          aggregation_metadata: {}
        })
      }

      return contextAggregations

    } catch (error) {
      logger.error('Failed to aggregate context', {
        error: error.message
      })
      return []
    }
  }

  private async summarizeContext(integratedContext: any): Promise<any[]> {
    try {
      const contextSummaries: any[] = []

      // Summarize each context source
      if (integratedContext.integrated_sources) {
        for (const source of integratedContext.integrated_sources) {
          contextSummaries.push({
            summary_id: `summary_${randomUUID()}`,
            context_source: source.source_id,
            summary_type: 'source_summary',
            summary_content: this.generateSourceSummary(source),
            summary_length: this.calculateSummaryLength(source),
            summary_confidence: 0.8,
            summary_metadata: {}
          })
        }
      }

      return contextSummaries

    } catch (error) {
      logger.error('Failed to summarize context', {
        error: error.message
      })
      return []
    }
  }

  private async highlightContext(integratedContext: any): Promise<any[]> {
    try {
      const contextHighlights: any[] = []

      // Highlight key information from each context source
      if (integratedContext.integrated_sources) {
        for (const source of integratedContext.integrated_sources) {
          const highlights = this.extractSourceHighlights(source)
          contextHighlights.push(...highlights)
        }
      }

      return contextHighlights

    } catch (error) {
      logger.error('Failed to highlight context', {
        error: error.message
      })
      return []
    }
  }

  private async extractKeyPoints(integratedContext: any): Promise<any[]> {
    try {
      const contextKeyPoints: any[] = []

      // Extract key points from each context source
      if (integratedContext.integrated_sources) {
        for (const source of integratedContext.integrated_sources) {
          const keyPoints = this.extractSourceKeyPoints(source)
          contextKeyPoints.push(...keyPoints)
        }
      }

      return contextKeyPoints

    } catch (error) {
      logger.error('Failed to extract key points', {
        error: error.message
      })
      return []
    }
  }

  private async identifyActionItems(integratedContext: any): Promise<any[]> {
    try {
      const contextActionItems: any[] = []

      // Identify action items from context conflicts
      if (integratedContext.context_conflicts) {
        for (const conflict of integratedContext.context_conflicts) {
          contextActionItems.push({
            action_id: `action_${randomUUID()}`,
            action_type: 'conflict_resolution',
            action_title: `Resolve ${conflict.conflict_type}`,
            action_description: conflict.conflict_description,
            action_priority: this.mapSeverityToPriority(conflict.conflict_severity),
            action_owner: 'project_manager',
            action_deadline: this.calculateActionDeadline(conflict.conflict_severity),
            action_status: 'pending',
            action_metadata: {}
          })
        }
      }

      // Identify action items from context gaps
      if (integratedContext.context_gaps) {
        for (const gap of integratedContext.context_gaps) {
          contextActionItems.push({
            action_id: `action_${randomUUID()}`,
            action_type: 'gap_resolution',
            action_title: `Address ${gap.gap_type}`,
            action_description: gap.gap_description,
            action_priority: this.mapSeverityToPriority(gap.gap_severity),
            action_owner: 'data_analyst',
            action_deadline: this.calculateActionDeadline(gap.gap_severity),
            action_status: 'pending',
            action_metadata: {}
          })
        }
      }

      return contextActionItems

    } catch (error) {
      logger.error('Failed to identify action items', {
        error: error.message
      })
      return []
    }
  }

  private async identifyRisks(integratedContext: any): Promise<any[]> {
    try {
      const contextRisks: any[] = []

      // Identify risks from context conflicts
      if (integratedContext.context_conflicts) {
        for (const conflict of integratedContext.context_conflicts) {
          contextRisks.push({
            risk_id: `risk_${randomUUID()}`,
            risk_type: 'context_conflict',
            risk_title: `Risk from ${conflict.conflict_type}`,
            risk_description: conflict.conflict_description,
            risk_probability: this.mapSeverityToProbability(conflict.conflict_severity),
            risk_impact: conflict.conflict_impact,
            risk_severity: conflict.conflict_severity,
            risk_mitigation: conflict.conflict_resolution,
            risk_metadata: {}
          })
        }
      }

      // Identify risks from context gaps
      if (integratedContext.context_gaps) {
        for (const gap of integratedContext.context_gaps) {
          contextRisks.push({
            risk_id: `risk_${randomUUID()}`,
            risk_type: 'context_gap',
            risk_title: `Risk from ${gap.gap_type}`,
            risk_description: gap.gap_description,
            risk_probability: this.mapSeverityToProbability(gap.gap_severity),
            risk_impact: gap.gap_impact,
            risk_severity: gap.gap_severity,
            risk_mitigation: gap.gap_solutions.join(', '),
            risk_metadata: {}
          })
        }
      }

      return contextRisks

    } catch (error) {
      logger.error('Failed to identify risks', {
        error: error.message
      })
      return []
    }
  }

  private async identifyOpportunities(integratedContext: any): Promise<any[]> {
    try {
      const contextOpportunities: any[] = []

      // Identify opportunities from context overlaps
      if (integratedContext.context_overlaps) {
        for (const overlap of integratedContext.context_overlaps) {
          contextOpportunities.push({
            opportunity_id: `opportunity_${randomUUID()}`,
            opportunity_type: 'context_overlap',
            opportunity_title: `Opportunity from ${overlap.overlap_type}`,
            opportunity_description: overlap.overlap_description,
            opportunity_potential: overlap.overlap_strength,
            opportunity_confidence: overlap.overlap_confidence,
            opportunity_implementation: overlap.overlap_handling,
            opportunity_metadata: {}
          })
        }
      }

      return contextOpportunities

    } catch (error) {
      logger.error('Failed to identify opportunities', {
        error: error.message
      })
      return []
    }
  }

  private async identifyDecisions(integratedContext: any): Promise<any[]> {
    try {
      const contextDecisions: any[] = []

      // Identify decisions from context conflicts
      if (integratedContext.context_conflicts) {
        for (const conflict of integratedContext.context_conflicts) {
          contextDecisions.push({
            decision_id: `decision_${randomUUID()}`,
            decision_type: 'conflict_resolution',
            decision_title: `Decision for ${conflict.conflict_type}`,
            decision_description: conflict.conflict_description,
            decision_options: [conflict.conflict_resolution],
            decision_criteria: ['conflict_severity', 'conflict_impact'],
            decision_deadline: this.calculateDecisionDeadline(conflict.conflict_severity),
            decision_status: 'pending',
            decision_metadata: {}
          })
        }
      }

      return contextDecisions

    } catch (error) {
      logger.error('Failed to identify decisions', {
        error: error.message
      })
      return []
    }
  }

  private async identifyAssumptions(integratedContext: any): Promise<any[]> {
    try {
      const contextAssumptions: any[] = []

      // Identify assumptions from context gaps
      if (integratedContext.context_gaps) {
        for (const gap of integratedContext.context_gaps) {
          contextAssumptions.push({
            assumption_id: `assumption_${randomUUID()}`,
            assumption_type: 'gap_assumption',
            assumption_title: `Assumption for ${gap.gap_type}`,
            assumption_description: gap.gap_description,
            assumption_confidence: gap.gap_confidence,
            assumption_validation: gap.gap_solutions.join(', '),
            assumption_metadata: {}
          })
        }
      }

      return contextAssumptions

    } catch (error) {
      logger.error('Failed to identify assumptions', {
        error: error.message
      })
      return []
    }
  }

  private async identifyConstraints(integratedContext: any): Promise<any[]> {
    try {
      const contextConstraints: any[] = []

      // Identify constraints from context conflicts
      if (integratedContext.context_conflicts) {
        for (const conflict of integratedContext.context_conflicts) {
          contextConstraints.push({
            constraint_id: `constraint_${randomUUID()}`,
            constraint_type: 'conflict_constraint',
            constraint_title: `Constraint from ${conflict.conflict_type}`,
            constraint_description: conflict.conflict_description,
            constraint_impact: conflict.conflict_impact,
            constraint_mitigation: conflict.conflict_resolution,
            constraint_metadata: {}
          })
        }
      }

      return contextConstraints

    } catch (error) {
      logger.error('Failed to identify constraints', {
        error: error.message
      })
      return []
    }
  }

  private async identifySuccessFactors(integratedContext: any): Promise<any[]> {
    try {
      const contextSuccessFactors: any[] = []

      // Identify success factors from context quality scores
      if (integratedContext.context_quality_scores) {
        for (const qualityScore of integratedContext.context_quality_scores) {
          if (qualityScore.quality_score >= 0.8) {
            contextSuccessFactors.push({
              factor_id: `factor_${randomUUID()}`,
              factor_type: 'quality_success',
              factor_title: `Quality Success Factor: ${qualityScore.context_source}`,
              factor_description: `High quality context from ${qualityScore.context_source}`,
              factor_impact: qualityScore.quality_score,
              factor_confidence: 0.8,
              factor_metadata: {}
            })
          }
        }
      }

      return contextSuccessFactors

    } catch (error) {
      logger.error('Failed to identify success factors', {
        error: error.message
      })
      return []
    }
  }

  // Helper methods
  private async optimizeSource(source: any): Promise<any> {
    return {
      ...source,
      optimized: true,
      optimization_timestamp: new Date(),
      optimization_confidence: 0.8
    }
  }

  private calculateSourcePriority(source: any): number {
    let priorityScore = 0.5 // Base score
    
    // Factor in source quality
    if (source.source_quality) {
      priorityScore += source.source_quality * 0.3
    }
    
    // Factor in source relevance
    if (source.source_relevance) {
      priorityScore += source.source_relevance * 0.3
    }
    
    // Factor in source confidence
    if (source.source_confidence) {
      priorityScore += source.source_confidence * 0.2
    }
    
    return Math.min(1.0, priorityScore)
  }

  private identifyPriorityFactors(source: any): any[] {
    const factors: any[] = []
    
    if (source.source_quality) {
      factors.push({
        factor_name: 'source_quality',
        factor_weight: 0.3,
        factor_score: source.source_quality,
        factor_description: 'Quality of the source data',
        factor_impact: 'high'
      })
    }
    
    if (source.source_relevance) {
      factors.push({
        factor_name: 'source_relevance',
        factor_weight: 0.3,
        factor_score: source.source_relevance,
        factor_description: 'Relevance of the source data',
        factor_impact: 'high'
      })
    }
    
    if (source.source_confidence) {
      factors.push({
        factor_name: 'source_confidence',
        factor_weight: 0.2,
        factor_score: source.source_confidence,
        factor_description: 'Confidence in the source data',
        factor_impact: 'medium'
      })
    }
    
    return factors
  }

  private generatePriorityJustification(source: any, priorityScore: number): string {
    return `Source ${source.source_name} has priority score ${priorityScore.toFixed(2)} based on quality, relevance, and confidence factors.`
  }

  private generatePriorityRecommendations(source: any, priorityScore: number): string[] {
    const recommendations: string[] = []
    
    if (priorityScore >= 0.8) {
      recommendations.push('High priority source - prioritize in document generation')
      recommendations.push('Use as primary context for key decisions')
    } else if (priorityScore >= 0.6) {
      recommendations.push('Medium priority source - include in document generation')
      recommendations.push('Use as supporting context')
    } else {
      recommendations.push('Low priority source - use sparingly')
      recommendations.push('Consider for background information only')
    }
    
    return recommendations
  }

  private calculatePriorityLevel(score: number): string {
    if (score >= 0.8) return 'high'
    if (score >= 0.6) return 'medium'
    return 'low'
  }

  private groupContextBySourceType(integratedContext: any): Record<string, any[]> {
    const sourceTypes: Record<string, any[]> = {}
    
    if (integratedContext.integrated_sources) {
      for (const source of integratedContext.integrated_sources) {
        const sourceType = source.source_type || 'unknown'
        if (!sourceTypes[sourceType]) {
          sourceTypes[sourceType] = []
        }
        sourceTypes[sourceType].push(source)
      }
    }
    
    return sourceTypes
  }

  private generateSourceSummary(source: any): string {
    return `Source ${source.source_name} (${source.source_type}) with quality ${source.source_quality?.toFixed(2) || 'N/A'} and relevance ${source.source_relevance?.toFixed(2) || 'N/A'}.`
  }

  private calculateSummaryLength(source: any): number {
    const summary = this.generateSourceSummary(source)
    return summary.length
  }

  private extractSourceHighlights(source: any): any[] {
    const highlights: any[] = []
    
    if (source.source_quality >= 0.8) {
      highlights.push({
        highlight_id: `highlight_${randomUUID()}`,
        context_source: source.source_id,
        highlight_type: 'quality_highlight',
        highlight_content: `High quality data from ${source.source_name}`,
        highlight_importance: 'high',
        highlight_metadata: {}
      })
    }
    
    if (source.source_relevance >= 0.8) {
      highlights.push({
        highlight_id: `highlight_${randomUUID()}`,
        context_source: source.source_id,
        highlight_type: 'relevance_highlight',
        highlight_content: `Highly relevant data from ${source.source_name}`,
        highlight_importance: 'high',
        highlight_metadata: {}
      })
    }
    
    return highlights
  }

  private extractSourceKeyPoints(source: any): any[] {
    const keyPoints: any[] = []
    
    keyPoints.push({
      key_point_id: `key_point_${randomUUID()}`,
      context_source: source.source_id,
      key_point_type: 'source_characteristics',
      key_point_content: `Source: ${source.source_name}, Type: ${source.source_type}`,
      key_point_importance: 'medium',
      key_point_metadata: {}
    })
    
    if (source.source_quality) {
      keyPoints.push({
        key_point_id: `key_point_${randomUUID()}`,
        context_source: source.source_id,
        key_point_type: 'quality_metric',
        key_point_content: `Quality Score: ${source.source_quality.toFixed(2)}`,
        key_point_importance: 'high',
        key_point_metadata: {}
      })
    }
    
    return keyPoints
  }

  private mapSeverityToPriority(severity: string): string {
    switch (severity) {
      case 'critical': return 'critical'
      case 'high': return 'high'
      case 'medium': return 'medium'
      case 'low': return 'low'
      default: return 'medium'
    }
  }

  private mapSeverityToProbability(severity: string): string {
    switch (severity) {
      case 'critical': return 'high'
      case 'high': return 'high'
      case 'medium': return 'medium'
      case 'low': return 'low'
      default: return 'medium'
    }
  }

  private calculateActionDeadline(severity: string): Date {
    const now = new Date()
    switch (severity) {
      case 'critical': return new Date(now.getTime() + 24 * 60 * 60 * 1000) // 1 day
      case 'high': return new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000) // 3 days
      case 'medium': return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 1 week
      case 'low': return new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000) // 2 weeks
      default: return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 1 week
    }
  }

  private calculateDecisionDeadline(severity: string): Date {
    const now = new Date()
    switch (severity) {
      case 'critical': return new Date(now.getTime() + 12 * 60 * 60 * 1000) // 12 hours
      case 'high': return new Date(now.getTime() + 24 * 60 * 60 * 1000) // 1 day
      case 'medium': return new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000) // 3 days
      case 'low': return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 1 week
      default: return new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000) // 3 days
    }
  }
}
