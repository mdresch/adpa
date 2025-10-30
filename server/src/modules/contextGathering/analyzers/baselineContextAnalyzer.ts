/**
 * Baseline Context Analyzer
 * Retrieves and structures approved project baseline for context-aware document generation
 * CR-2026-001: Baseline & Drift Detection Integration
 */

import { logger } from '@/utils/logger'
import { pool } from '@/database/connection'
import { ContextRetrievalService } from '@/modules/contextRetrieval/contextRetrievalService'
import type { BaselineContextData } from '../types'

export class BaselineContextAnalyzer {
  private retrieval?: ContextRetrievalService

  constructor(retrieval?: ContextRetrievalService) {
    this.retrieval = retrieval
  }

  /**
   * Main entry point: Analyze baseline context for a project
   */
  async analyzeBaselineContext(projectId: string): Promise<BaselineContextData | null> {
    try {
      logger.debug('Analyzing baseline context', { projectId })

      const startTime = Date.now()

      // Fetch the latest approved baseline for this project
      const baseline = await this.gatherApprovedBaseline(projectId)

      if (!baseline) {
        logger.info('No approved baseline found for project', { projectId })
        return null
      }

      // Extract structured baseline components
      const scopeBaseline = this.extractScopeBaseline(baseline)
      const technicalBaseline = this.extractTechnicalBaseline(baseline)
      const timelineBaseline = this.extractTimelineBaseline(baseline)
      const costBaseline = this.extractCostBaseline(baseline)
      const resourceBaseline = this.extractResourceBaseline(baseline)
      const successCriteria = this.extractSuccessCriteriaBaseline(baseline)

      // Build structured baseline context
      const baselineContext: BaselineContextData = {
        baseline_id: baseline.id,
        project_id: projectId,
        baseline_version: baseline.version,
        approval_status: baseline.approval_status,
        scope_baseline: scopeBaseline,
        technical_baseline: technicalBaseline,
        timeline_baseline: timelineBaseline,
        cost_baseline: costBaseline,
        resource_baseline: resourceBaseline,
        success_criteria: successCriteria,
        extraction_confidence: baseline.extraction_confidence || 0.85,
        completeness_score: baseline.completeness_score || 0.80,
        consistency_score: baseline.consistency_score || 0.85,
        clarity_score: baseline.clarity_score || 0.80,
        approved_by: baseline.approved_by,
        approved_at: baseline.approved_at,
        baseline_snapshot_hash: baseline.baseline_snapshot_hash,
        metadata: {
          analysis_timestamp: new Date(),
          analysis_duration: Date.now() - startTime,
          project_id: projectId,
          baseline_id: baseline.id,
          data_sources: ['baselines_table'],
          data_freshness: baseline.created_at || new Date(),
          analysis_confidence: 0.95 // High confidence for approved baselines
        }
      }

      logger.info('Baseline context analysis completed', {
        projectId,
        baselineId: baseline.id,
        approvalStatus: baseline.approval_status,
        completenessScore: baseline.completeness_score,
        analysisTime: Date.now() - startTime
      })

      return baselineContext

    } catch (error: unknown) {
      logger.error('Failed to analyze baseline context', {
        projectId,
        error: error instanceof Error ? error.message : String(error)
      })
      // Return null instead of throwing - baseline is optional context
      return null
    }
  }

  /**
   * Fetch the latest approved baseline for a project
   */
  private async gatherApprovedBaseline(projectId: string): Promise<any> {
    try {
      const result = await pool!.query(
        `SELECT 
          id,
          project_id,
          version,
          approval_status,
          scope_baseline,
          technical_baseline,
          timeline_baseline,
          cost_baseline,
          resource_baseline,
          success_criteria,
          extraction_confidence,
          completeness_score,
          consistency_score,
          clarity_score,
          approved_by,
          approved_at,
          baseline_snapshot_hash,
          created_at,
          updated_at
        FROM baselines
        WHERE project_id = $1
          AND approval_status = 'approved'
          AND deleted_at IS NULL
        ORDER BY version DESC, approved_at DESC
        LIMIT 1`,
        [projectId]
      )

      return result.rows.length > 0 ? result.rows[0] : null

    } catch (error: unknown) {
      logger.error('Failed to gather approved baseline', {
        projectId,
        error: error instanceof Error ? error.message : String(error)
      })
      return null
    }
  }

  /**
   * Extract scope baseline from raw baseline data
   */
  private extractScopeBaseline(baseline: any): BaselineContextData['scope_baseline'] {
    const scope = baseline.scope_baseline || {}
    
    return {
      in_scope_items: Array.isArray(scope.in_scope_items) ? scope.in_scope_items : 
                      Array.isArray(scope.in_scope) ? scope.in_scope : [],
      out_of_scope_items: Array.isArray(scope.out_of_scope_items) ? scope.out_of_scope_items :
                          Array.isArray(scope.out_of_scope) ? scope.out_of_scope : [],
      assumptions: Array.isArray(scope.assumptions) ? scope.assumptions : [],
      constraints: Array.isArray(scope.constraints) ? scope.constraints : [],
      deliverables: Array.isArray(scope.deliverables) ? scope.deliverables : []
    }
  }

  /**
   * Extract technical baseline from raw baseline data
   */
  private extractTechnicalBaseline(baseline: any): BaselineContextData['technical_baseline'] {
    const technical = baseline.technical_baseline || {}
    
    return {
      architecture_approach: technical.architecture_approach || technical.approach || '',
      key_technologies: Array.isArray(technical.key_technologies) ? technical.key_technologies :
                        Array.isArray(technical.technologies) ? technical.technologies : [],
      integration_points: Array.isArray(technical.integration_points) ? technical.integration_points :
                          Array.isArray(technical.integrations) ? technical.integrations : [],
      technical_constraints: Array.isArray(technical.technical_constraints) ? technical.technical_constraints :
                            Array.isArray(technical.constraints) ? technical.constraints : [],
      quality_standards: Array.isArray(technical.quality_standards) ? technical.quality_standards :
                        Array.isArray(technical.standards) ? technical.standards : []
    }
  }

  /**
   * Extract timeline baseline from raw baseline data
   */
  private extractTimelineBaseline(baseline: any): BaselineContextData['timeline_baseline'] {
    const timeline = baseline.timeline_baseline || {}
    
    return {
      key_milestones: Array.isArray(timeline.key_milestones) ? timeline.key_milestones :
                      Array.isArray(timeline.milestones) ? timeline.milestones : [],
      critical_path: Array.isArray(timeline.critical_path) ? timeline.critical_path : [],
      dependencies: Array.isArray(timeline.dependencies) ? timeline.dependencies : [],
      buffer_time: timeline.buffer_time || timeline.buffer || ''
    }
  }

  /**
   * Extract cost baseline from raw baseline data
   */
  private extractCostBaseline(baseline: any): BaselineContextData['cost_baseline'] {
    const cost = baseline.cost_baseline || {}
    
    return {
      budget_total: cost.budget_total || cost.total_budget || 0,
      cost_breakdown: cost.cost_breakdown || cost.breakdown || {},
      contingency_reserves: cost.contingency_reserves || cost.contingency || 0,
      management_reserves: cost.management_reserves || cost.reserves || 0
    }
  }

  /**
   * Extract resource baseline from raw baseline data
   */
  private extractResourceBaseline(baseline: any): BaselineContextData['resource_baseline'] {
    const resource = baseline.resource_baseline || {}
    
    return {
      team_structure: Array.isArray(resource.team_structure) ? resource.team_structure :
                      Array.isArray(resource.team) ? resource.team : [],
      key_roles: Array.isArray(resource.key_roles) ? resource.key_roles :
                Array.isArray(resource.roles) ? resource.roles : [],
      resource_requirements: Array.isArray(resource.resource_requirements) ? resource.resource_requirements :
                            Array.isArray(resource.requirements) ? resource.requirements : [],
      skill_requirements: Array.isArray(resource.skill_requirements) ? resource.skill_requirements :
                          Array.isArray(resource.skills) ? resource.skills : []
    }
  }

  /**
   * Extract success criteria from raw baseline data
   */
  private extractSuccessCriteriaBaseline(baseline: any): BaselineContextData['success_criteria'] {
    const criteria = baseline.success_criteria || {}
    
    return {
      kpis: Array.isArray(criteria.kpis) ? criteria.kpis : [],
      acceptance_criteria: Array.isArray(criteria.acceptance_criteria) ? criteria.acceptance_criteria :
                          Array.isArray(criteria.acceptance) ? criteria.acceptance : [],
      quality_gates: Array.isArray(criteria.quality_gates) ? criteria.quality_gates :
                    Array.isArray(criteria.gates) ? criteria.gates : []
    }
  }

  /**
   * Format baseline for LLM context (human-readable structured format)
   */
  formatBaselineForContext(baselineContext: BaselineContextData): string {
    const sections: string[] = []

    sections.push('## APPROVED PROJECT BASELINE')
    sections.push(`Baseline ID: ${baselineContext.baseline_id}`)
    sections.push(`Version: ${baselineContext.baseline_version}`)
    sections.push(`Status: ${baselineContext.approval_status}`)
    sections.push(`Confidence: ${(baselineContext.extraction_confidence * 100).toFixed(1)}%`)
    sections.push('')

    // Scope Baseline
    if (baselineContext.scope_baseline.in_scope_items.length > 0) {
      sections.push('### Scope Baseline')
      sections.push('**In Scope:**')
      baselineContext.scope_baseline.in_scope_items.forEach(item => {
        sections.push(`- ${item}`)
      })
      if (baselineContext.scope_baseline.out_of_scope_items.length > 0) {
        sections.push('\n**Out of Scope:**')
        baselineContext.scope_baseline.out_of_scope_items.forEach(item => {
          sections.push(`- ${item}`)
        })
      }
      if (baselineContext.scope_baseline.constraints.length > 0) {
        sections.push('\n**Constraints:**')
        baselineContext.scope_baseline.constraints.forEach(item => {
          sections.push(`- ${item}`)
        })
      }
      sections.push('')
    }

    // Technical Baseline
    if (baselineContext.technical_baseline.architecture_approach || 
        baselineContext.technical_baseline.key_technologies.length > 0) {
      sections.push('### Technical Baseline')
      if (baselineContext.technical_baseline.architecture_approach) {
        sections.push(`**Architecture:** ${baselineContext.technical_baseline.architecture_approach}`)
      }
      if (baselineContext.technical_baseline.key_technologies.length > 0) {
        sections.push('**Technologies:**')
        baselineContext.technical_baseline.key_technologies.forEach(tech => {
          sections.push(`- ${tech}`)
        })
      }
      sections.push('')
    }

    // Timeline Baseline
    if (baselineContext.timeline_baseline.key_milestones.length > 0) {
      sections.push('### Timeline Baseline')
      sections.push('**Key Milestones:**')
      baselineContext.timeline_baseline.key_milestones.forEach(milestone => {
        sections.push(`- ${milestone.name} (${milestone.date}): ${milestone.description}`)
      })
      sections.push('')
    }

    // Success Criteria
    if (baselineContext.success_criteria.kpis.length > 0 || 
        baselineContext.success_criteria.acceptance_criteria.length > 0) {
      sections.push('### Success Criteria')
      if (baselineContext.success_criteria.kpis.length > 0) {
        sections.push('**KPIs:**')
        baselineContext.success_criteria.kpis.forEach(kpi => {
          sections.push(`- ${kpi.metric}: ${kpi.target} (${kpi.measurement})`)
        })
      }
      if (baselineContext.success_criteria.acceptance_criteria.length > 0) {
        sections.push('\n**Acceptance Criteria:**')
        baselineContext.success_criteria.acceptance_criteria.forEach(criteria => {
          sections.push(`- ${criteria}`)
        })
      }
      sections.push('')
    }

    sections.push('---')
    sections.push('*This baseline is APPROVED and should be respected in document generation*')
    sections.push('*Any deviations will be detected post-generation for drift analysis*')

    return sections.join('\n')
  }
}

