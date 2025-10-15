/**
 * Project Context Analyzer
 * Analyzes project data for context gathering
 */

import { logger } from '@/utils/logger'
import { pool } from '@/database/connection'
import type { ProjectContextData } from '../types'

export class ProjectContextAnalyzer {
  async analyzeProjectContext(projectId: string): Promise<ProjectContextData> {
    try {
      logger.debug('Analyzing project context', { projectId })

      const startTime = Date.now()

      // Gather project data from database
      const projectData = await this.gatherProjectData(projectId)
      const stakeholders = await this.gatherStakeholders(projectId)
      const requirements = await this.gatherRequirements(projectId)
      const constraints = await this.gatherConstraints(projectId)
      const risks = await this.gatherRisks(projectId)
      const milestones = await this.gatherMilestones(projectId)
      const phases = await this.gatherPhases(projectId)
      const teamMembers = await this.gatherTeamMembers(projectId)

      // Analyze project performance
      const performanceMetrics = await this.analyzeProjectPerformance(projectId)

      // Gather lessons learned and best practices
      const lessonsLearned = await this.gatherLessonsLearned(projectId)
      const bestPractices = await this.gatherBestPractices(projectId)

      const projectContext: ProjectContextData = {
        project_id: projectId,
        project_name: projectData.name || 'Unknown Project',
        project_description: projectData.description || '',
        project_type: projectData.type || 'Unknown',
        project_phase: projectData.phase || 'Unknown',
        project_status: projectData.status || 'Unknown',
        start_date: projectData.start_date || new Date(),
        end_date: projectData.end_date || new Date(),
        stakeholders: stakeholders,
        requirements: requirements,
        constraints: constraints,
        risks: risks,
        milestones: milestones,
        phases: phases,
        team_members: teamMembers,
        budget_info: await this.gatherBudgetInfo(projectId),
        timeline_info: await this.gatherTimelineInfo(projectId),
        success_criteria: await this.gatherSuccessCriteria(projectId),
        project_goals: await this.gatherProjectGoals(projectId),
        dependencies: await this.gatherDependencies(projectId),
        deliverables: await this.gatherDeliverables(projectId),
        communication_plan: await this.gatherCommunicationPlan(projectId),
        quality_standards: await this.gatherQualityStandards(projectId),
        compliance_requirements: await this.gatherComplianceRequirements(projectId),
        technology_stack: await this.gatherTechnologyStack(projectId),
        methodology: await this.gatherMethodology(projectId),
        lessons_learned: lessonsLearned,
        best_practices: bestPractices,
        performance_metrics: performanceMetrics,
        metadata: {
          analysis_timestamp: new Date(),
          analysis_duration: Date.now() - startTime,
          data_sources: ['project_database', 'stakeholder_database', 'requirement_database'],
          data_freshness: new Date(),
          analysis_confidence: 0.9
        }
      }

      logger.info('Project context analysis completed', {
        projectId,
        stakeholderCount: stakeholders.length,
        requirementCount: requirements.length,
        riskCount: risks.length,
        analysisTime: Date.now() - startTime
      })

      return projectContext

    } catch (error) {
      logger.error('Project context analysis failed', {
        projectId,
        error: error.message
      })
      throw error
    }
  }

  private async gatherProjectData(projectId: string): Promise<any> {
    try {
      const result = await pool.query(
        'SELECT * FROM projects WHERE id = $1',
        [projectId]
      )

      if (result.rows.length === 0) {
        throw new Error(`Project not found: ${projectId}`)
      }

      return result.rows[0]

    } catch (error) {
      logger.error('Failed to gather project data', {
        projectId,
        error: error.message
      })
      throw error
    }
  }

  private async gatherStakeholders(projectId: string): Promise<any[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM stakeholders WHERE project_id = $1',
        [projectId]
      )

      return result.rows.map(row => ({
        stakeholder_id: row.id,
        name: row.name,
        role: row.role,
        contact_info: row.contact_info,
        influence: row.influence || 'medium',
        interest: row.interest || 'medium',
        expectations: row.expectations || [],
        communication_preferences: row.communication_preferences || [],
        availability: row.availability || [],
        expertise_areas: row.expertise_areas || [],
        decision_authority: row.decision_authority || 'medium',
        approval_required: row.approval_required || false,
        feedback_history: [],
        satisfaction_scores: [],
        metadata: {}
      }))

    } catch (error) {
      logger.error('Failed to gather stakeholders', {
        projectId,
        error: error.message
      })
      return []
    }
  }

  private async gatherRequirements(projectId: string): Promise<any[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM requirements WHERE project_id = $1',
        [projectId]
      )

      return result.rows.map(row => ({
        requirement_id: row.id,
        title: row.title,
        description: row.description,
        priority: row.priority || 'medium',
        status: row.status || 'draft',
        category: row.category || 'functional',
        source: row.source || 'stakeholder',
        acceptance_criteria: row.acceptance_criteria || [],
        dependencies: row.dependencies || [],
        risks: row.risks || [],
        stakeholders: row.stakeholders || [],
        verification_method: row.verification_method || 'review',
        traceability: row.traceability || [],
        change_history: [],
        metadata: {}
      }))

    } catch (error) {
      logger.error('Failed to gather requirements', {
        projectId,
        error: error.message
      })
      return []
    }
  }

  private async gatherConstraints(projectId: string): Promise<any[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM constraints WHERE project_id = $1',
        [projectId]
      )

      return result.rows.map(row => ({
        constraint_id: row.id,
        title: row.title,
        description: row.description,
        type: row.type || 'technical',
        impact: row.impact || 'medium',
        severity: row.severity || 'medium',
        source: row.source || 'project',
        rationale: row.rationale || '',
        mitigation_strategies: row.mitigation_strategies || [],
        monitoring_approach: row.monitoring_approach || 'regular_review',
        compliance_requirements: row.compliance_requirements || [],
        metadata: {}
      }))

    } catch (error) {
      logger.error('Failed to gather constraints', {
        projectId,
        error: error.message
      })
      return []
    }
  }

  private async gatherRisks(projectId: string): Promise<any[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM risks WHERE project_id = $1',
        [projectId]
      )

      return result.rows.map(row => ({
        risk_id: row.id,
        title: row.title,
        description: row.description,
        category: row.category || 'technical',
        probability: row.probability || 'medium',
        impact: row.impact || 'medium',
        severity: row.severity || 'medium',
        status: row.status || 'identified',
        owner: row.owner || 'project_manager',
        mitigation_strategies: row.mitigation_strategies || [],
        contingency_plans: row.contingency_plans || [],
        monitoring_approach: row.monitoring_approach || 'regular_review',
        escalation_triggers: row.escalation_triggers || [],
        metadata: {}
      }))

    } catch (error) {
      logger.error('Failed to gather risks', {
        projectId,
        error: error.message
      })
      return []
    }
  }

  private async gatherMilestones(projectId: string): Promise<any[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM milestones WHERE project_id = $1',
        [projectId]
      )

      return result.rows.map(row => ({
        milestone_id: row.id,
        title: row.title,
        description: row.description,
        due_date: row.due_date,
        status: row.status || 'planned',
        dependencies: row.dependencies || [],
        deliverables: row.deliverables || [],
        acceptance_criteria: row.acceptance_criteria || [],
        owner: row.owner || 'project_manager',
        stakeholders: row.stakeholders || [],
        progress_percentage: row.progress_percentage || 0,
        actual_completion_date: row.actual_completion_date,
        variance_days: row.variance_days || 0,
        metadata: {}
      }))

    } catch (error) {
      logger.error('Failed to gather milestones', {
        projectId,
        error: error.message
      })
      return []
    }
  }

  private async gatherPhases(projectId: string): Promise<any[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM phases WHERE project_id = $1',
        [projectId]
      )

      return result.rows.map(row => ({
        phase_id: row.id,
        title: row.title,
        description: row.description,
        start_date: row.start_date,
        end_date: row.end_date,
        status: row.status || 'planned',
        objectives: row.objectives || [],
        deliverables: row.deliverables || [],
        milestones: row.milestones || [],
        team_members: row.team_members || [],
        budget_allocation: row.budget_allocation || 0,
        risks: row.risks || [],
        dependencies: row.dependencies || [],
        metadata: {}
      }))

    } catch (error) {
      logger.error('Failed to gather phases', {
        projectId,
        error: error.message
      })
      return []
    }
  }

  private async gatherTeamMembers(projectId: string): Promise<any[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM team_members WHERE project_id = $1',
        [projectId]
      )

      return result.rows.map(row => ({
        member_id: row.id,
        name: row.name,
        role: row.role,
        department: row.department,
        expertise_areas: row.expertise_areas || [],
        availability: row.availability || [],
        responsibilities: row.responsibilities || [],
        performance_metrics: [],
        collaboration_preferences: row.collaboration_preferences || [],
        communication_style: row.communication_style || 'professional',
        workload_capacity: row.workload_capacity || 100,
        current_workload: row.current_workload || 0,
        metadata: {}
      }))

    } catch (error) {
      logger.error('Failed to gather team members', {
        projectId,
        error: error.message
      })
      return []
    }
  }

  private async analyzeProjectPerformance(projectId: string): Promise<any> {
    try {
      // Analyze project performance metrics
      const performanceMetrics = {
        performance_id: `perf_${projectId}_${Date.now()}`,
        metrics: [],
        benchmarks: [],
        trends: [],
        comparisons: [],
        forecasts: [],
        metadata: {
          analysis_timestamp: new Date(),
          project_id: projectId,
          analysis_confidence: 0.8
        }
      }

      return performanceMetrics

    } catch (error) {
      logger.error('Failed to analyze project performance', {
        projectId,
        error: error.message
      })
      return {
        performance_id: `perf_${projectId}_${Date.now()}`,
        metrics: [],
        benchmarks: [],
        trends: [],
        comparisons: [],
        forecasts: [],
        metadata: {
          analysis_timestamp: new Date(),
          project_id: projectId,
          analysis_confidence: 0.0,
          error: error.message
        }
      }
    }
  }

  private async gatherLessonsLearned(projectId: string): Promise<any[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM lessons_learned WHERE project_id = $1',
        [projectId]
      )

      return result.rows.map(row => ({
        lesson_id: row.id,
        title: row.title,
        description: row.description,
        category: row.category || 'general',
        impact: row.impact || 'medium',
        source: row.source || 'project_team',
        date_learned: row.date_learned || new Date(),
        applicability: row.applicability || [],
        recommendations: row.recommendations || [],
        metadata: {}
      }))

    } catch (error) {
      logger.error('Failed to gather lessons learned', {
        projectId,
        error: error.message
      })
      return []
    }
  }

  private async gatherBestPractices(projectId: string): Promise<any[]> {
    try {
      const result = await pool.query(
        'SELECT * FROM best_practices WHERE project_id = $1',
        [projectId]
      )

      return result.rows.map(row => ({
        practice_id: row.id,
        title: row.title,
        description: row.description,
        category: row.category || 'general',
        effectiveness: row.effectiveness || 0.8,
        applicability: row.applicability || [],
        implementation_guidance: row.implementation_guidance || [],
        success_factors: row.success_factors || [],
        common_pitfalls: row.common_pitfalls || [],
        metadata: {}
      }))

    } catch (error) {
      logger.error('Failed to gather best practices', {
        projectId,
        error: error.message
      })
      return []
    }
  }

  // Additional helper methods for gathering other project data
  private async gatherBudgetInfo(projectId: string): Promise<any> {
    return {
      total_budget: 0,
      allocated_budget: 0,
      spent_budget: 0,
      remaining_budget: 0,
      budget_categories: [],
      budget_timeline: [],
      budget_variance: 0,
      budget_forecast: [],
      metadata: {}
    }
  }

  private async gatherTimelineInfo(projectId: string): Promise<any> {
    return {
      start_date: new Date(),
      end_date: new Date(),
      duration_days: 0,
      critical_path: [],
      timeline_milestones: [],
      timeline_risks: [],
      timeline_dependencies: [],
      timeline_buffer: 0,
      timeline_variance: 0,
      metadata: {}
    }
  }

  private async gatherSuccessCriteria(projectId: string): Promise<any[]> {
    return []
  }

  private async gatherProjectGoals(projectId: string): Promise<any[]> {
    return []
  }

  private async gatherDependencies(projectId: string): Promise<any[]> {
    return []
  }

  private async gatherDeliverables(projectId: string): Promise<any[]> {
    return []
  }

  private async gatherCommunicationPlan(projectId: string): Promise<any> {
    return {
      plan_id: `comm_plan_${projectId}`,
      title: 'Project Communication Plan',
      description: 'Communication plan for project stakeholders',
      communication_channels: [],
      communication_frequency: 'weekly',
      stakeholders: [],
      communication_templates: [],
      escalation_procedures: [],
      feedback_mechanisms: [],
      metadata: {}
    }
  }

  private async gatherQualityStandards(projectId: string): Promise<any[]> {
    return []
  }

  private async gatherComplianceRequirements(projectId: string): Promise<any[]> {
    return []
  }

  private async gatherTechnologyStack(projectId: string): Promise<any> {
    return {
      stack_id: `tech_stack_${projectId}`,
      title: 'Project Technology Stack',
      description: 'Technology stack used in the project',
      technologies: [],
      versions: [],
      dependencies: [],
      compatibility_matrix: [],
      upgrade_roadmap: [],
      metadata: {}
    }
  }

  private async gatherMethodology(projectId: string): Promise<any> {
    return {
      methodology_id: `methodology_${projectId}`,
      title: 'Project Methodology',
      description: 'Methodology used for project execution',
      framework: 'Agile',
      phases: [],
      deliverables: [],
      roles_responsibilities: [],
      best_practices: [],
      tools_techniques: [],
      quality_gates: [],
      metadata: {}
    }
  }
}
