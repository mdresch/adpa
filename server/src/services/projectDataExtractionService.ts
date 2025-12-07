/**
 * Project Data Extraction Service
 * AI-powered extraction of structured entities from project documents
 * Populates: stakeholders, requirements, risks, milestones, constraints, success_criteria, etc.
 * 
 * Related to: CR-2025-001 (RAG Integration) - Enhances context quality
 */

import { pool } from '@/database/connection'
import { logger } from '@/utils/logger'
import { convertQuarterDate, isValidDate, addDays, getCurrentDate } from '@/utils/dateUtils'
import { aiService } from './aiService'
import { aiCacheService } from './aiCacheService'
import type { PoolClient } from 'pg'

interface ExtractionResult {
  stakeholders: Stakeholder[]
  requirements: Requirement[]
  risks: Risk[]
  milestones: Milestone[]
  constraints: Constraint[]
  success_criteria: SuccessCriterion[]
  best_practices: BestPractice[]
  phases: Phase[]
  resources: Resource[]
  technologies: Technology[]
  quality_standards: QualityStandard[]
  deliverables: Deliverable[]
  scope_items: ScopeItem[]
  activities: Activity[]
  team_agreements: TeamAgreement[]
  development_approaches: DevelopmentApproach[]
  project_iterations: ProjectIteration[]
  work_items: WorkItemRecord[]
  capacity_plans: CapacityPlan[]
  performance_measurements: PerformanceMeasurement[]
  earned_value_metrics: EarnedValueMetric[]
  opportunities: OpportunityRecord[]
  risk_responses: RiskResponseRecord[]
  performance_actuals: PerformanceActual[]
}

interface Stakeholder {
  name: string
  role: string
  email?: string
  interest_level: 'high' | 'medium' | 'low'
  influence_level: 'high' | 'medium' | 'low'
  communication_preference?: string
  expectations?: string
  concerns?: string
}

interface Requirement {
  title: string
  description: string
  type: 'functional' | 'non-functional' | 'business' | 'technical'
  priority: 'critical' | 'high' | 'medium' | 'low'
  status: 'proposed' | 'approved' | 'in_progress' | 'completed' | 'deferred'
  acceptance_criteria?: string
  source?: string
}

interface Risk {
  title: string
  description: string
  category: 'technical' | 'schedule' | 'budget' | 'resource' | 'external' | 'quality'
  probability: 'high' | 'medium' | 'low'
  impact: 'high' | 'medium' | 'low'
  mitigation_strategy?: string
  contingency_plan?: string
  owner?: string
}

interface Milestone {
  name: string
  description: string
  due_date: string
  status: 'pending' | 'in_progress' | 'completed' | 'delayed'
  deliverables?: string[]
  dependencies?: string[]
}

interface Constraint {
  title: string
  description: string
  type: 'scope' | 'time' | 'cost' | 'quality' | 'resource' | 'technical' | 'regulatory'
  severity: 'high' | 'medium' | 'low'
  impact_area?: string
}

interface SuccessCriterion {
  title: string
  description: string
  metric: string
  target_value: string
  measurement_method: string
  priority: 'critical' | 'high' | 'medium' | 'low'
}

interface BestPractice {
  title: string
  description: string
  category: string
  applicability?: string
  source?: string
}

interface Phase {
  name: string
  description: string
  start_date?: string
  end_date?: string
  status: 'planned' | 'active' | 'completed' | 'on_hold'
  deliverables?: string[]
  key_activities?: string[]
}

interface Resource {
  name: string
  type: 'human' | 'equipment' | 'material' | 'financial' | 'software' | 'facility' | 'budget'
  role?: string
  allocation?: string
  availability?: string
  cost?: number
  skills?: string[]
  competency_level?: 'junior' | 'intermediate' | 'senior' | 'expert'
  certifications?: string[]
  training_needs?: string[]
  team_assignment?: string
  performance_rating?: number
  development_plan?: string
}

interface QualityStandard {
  title: string
  description: string
  category: 'process' | 'product' | 'performance' | 'compliance'
  standard_type: 'ISO' | 'PMBOK' | 'internal' | 'industry' | 'regulatory' | 'other'
  requirements?: string
  measurement_criteria?: string
  compliance_level?: 'mandatory' | 'recommended' | 'optional'
}

interface ComplianceSecurity {
  title: string
  category: 'compliance' | 'security' | 'legal' | 'standard'
  type?: string // e.g., 'ISO 27001', 'SOC 2', 'GDPR', 'Encryption', 'Authentication'
  description?: string
  requirement_text?: string
  status?: 'applicable' | 'not_applicable' | 'partial' | 'compliant' | 'non_compliant'
  security_score?: number // 0-10
  compliance_score?: number // 0-10
  latest_breach?: string
  data_at_rest_encryption?: string
  multi_factor_authentication?: boolean
  ip_address_restriction?: boolean
  user_audit_trail?: boolean
  admin_audit_trail?: boolean
  data_audit_trail?: boolean
  user_can_upload_data?: boolean
  data_classification?: boolean
  remember_password?: boolean
  user_roles_support?: boolean
  file_sharing?: boolean
  valid_certificate_name?: string
  trusted_certificate?: boolean
  encryption_protocol?: string
  heartbleed_patched?: boolean
  http_security_headers?: boolean
  supports_saml?: boolean
  protected_against_drown?: boolean
  penetration_testing?: boolean
  requires_user_authentication?: boolean
  password_policy?: string
  // Compliance Standards
  iso_27001?: boolean
  iso_27018?: boolean
  iso_27017?: boolean
  iso_27002?: boolean
  finra?: boolean
  fisma?: boolean
  gaap?: boolean
  hipaa?: boolean
  isae_3402?: boolean
  itar?: boolean
  soc_1?: boolean
  soc_2?: boolean
  soc_3?: boolean
  sox?: boolean
  sp_800_53?: boolean
  ssae_18?: boolean
  safe_harbor?: boolean
  pci_dss_version?: string
  glba?: boolean
  fedramp_level?: string
  csa_star_level?: string
  certification?: boolean
  privacy_shield?: boolean
  ffiec?: boolean
  gapp?: boolean
  cobit?: boolean
  coppa?: boolean
  ferpa?: boolean
  hitrust_csf?: boolean
  jericho_forum_commandments?: boolean
  // Legal Requirements
  data_ownership?: string
  dmca?: boolean
  data_retention_policy?: string
  gdpr_readiness_statement?: string
  gdpr_right_to_erasure?: boolean
  gdpr_report_data_breaches?: boolean
  gdpr_data_protection?: boolean
  gdpr_user_ownership?: boolean
  other_standards?: Record<string, any>
}

interface Technology {
  name: string
  category: 'frontend' | 'backend' | 'database' | 'infrastructure' | 'devops' | 'testing' | 'monitoring' | 'other'
  description?: string
  version?: string
  purpose?: string
  license?: string
  vendor?: string
  deployment_environment?: string
}

interface Deliverable {
  name: string
  description: string
  type: 'document' | 'software' | 'hardware' | 'service' | 'report' | 'other'
  due_date?: string
  status: 'planned' | 'in_progress' | 'completed' | 'delayed' | 'cancelled'
  owner?: string
  dependencies?: string[]
  acceptance_criteria?: string
  phase?: string
}

interface ScopeItem {
  title: string
  description: string
  is_in_scope: boolean
  category?: string
  justification?: string
  priority?: 'must_have' | 'should_have' | 'could_have' | 'wont_have'
}

interface Activity {
  name: string
  description: string
  category?: string
  phase?: string
  start_date?: string
  end_date?: string
  duration?: number
  duration_unit?: 'days' | 'weeks' | 'months'
  status: 'planned' | 'in_progress' | 'completed' | 'blocked' | 'cancelled'
  assigned_to?: string
  dependencies?: string[]
  deliverable?: string
  effort_estimate?: number
  effort_unit?: 'hours' | 'days' | 'story_points'
}

interface TeamAgreement {
  title: string
  description?: string
  category:
    | 'working_hours'
    | 'communication'
    | 'decision_making'
    | 'conflict_resolution'
    | 'quality_standards'
    | 'meeting_norms'
    | 'code_of_conduct'
    | 'collaboration_tools'
    | 'response_times'
    | 'knowledge_sharing'
    | 'other'
  agreed_by?: string[]
  facilitated_by?: string
  effective_date?: string
  review_frequency?: string
  next_review_date?: string
  status?: 'draft' | 'active' | 'under_review' | 'revised' | 'deprecated'
  adherence_score?: number
  violations_count?: number
  last_violation_date?: string
  notes?: string
  source_document?: string
}

interface DevelopmentApproach {
  // Approach selection
  approach: 'predictive' | 'adaptive' | 'hybrid' | 'incremental' | 'iterative'
  methodology?: 'waterfall' | 'scrum' | 'kanban' | 'lean' | 'safe' | 'prince2' | 'custom'
  
  // Justification
  justification: string
  
  // Context factors (PMBOK 8 Domain 3)
  uncertainty_level?: 'low' | 'medium' | 'high'
  requirements_stability?: 'stable' | 'evolving' | 'uncertain'
  stakeholder_engagement_model?: string
  delivery_cadence?: 'single' | 'iterative' | 'incremental' | 'continuous'
  
  // Organizational context
  organizational_maturity?: 'low' | 'medium' | 'high'
  team_experience_level?: 'junior' | 'mixed' | 'senior'
  regulatory_constraints?: boolean
  
  // Tailoring decisions
  tailoring_decisions?: Array<{
    area: string
    standard_process: string
    tailored_process: string
    justification: string
  }>
  
  // Life cycle
  life_cycle_phases?: string[]
  iteration_length?: number
  iteration_unit?: 'days' | 'weeks'
  
  // Governance
  governance_approach?: 'lightweight' | 'standard' | 'formal'
  review_gates?: string[]
  
  // Legacy fields (for backward compatibility with existing extraction)
  framework?: string
  lifecycle_model?: string
  iteration_length_weeks?: number
  ceremonies?: string[]
  artifacts?: string[]
  tailoring_decisions_text?: string
  governance_notes?: string
  source_document?: string
}

interface ProjectIteration {
  name: string
  iteration_type?: 'sprint' | 'iteration' | 'program_increment' | 'release' | 'phase'
  sequence_number?: number
  start_date?: string
  end_date?: string
  goals?: string[]
  planned_story_points?: number
  completed_story_points?: number
  velocity?: number
  status?: 'planned' | 'active' | 'completed' | 'cancelled'
  retrospective_summary?: string
  impediments?: string[]
  source_document?: string
}

interface WorkItemRecord {
  name: string
  description?: string
  activity_name?: string
  assigned_to?: string
  estimated_hours?: number
  actual_hours?: number
  progress_percentage?: number
  status?: 'todo' | 'in_progress' | 'review' | 'done' | 'blocked'
  blockers?: string[]
  completed_date?: string
  source_document?: string
}

interface CapacityPlan {
  team_member: string
  role?: string
  period_start: string
  period_end: string
  available_hours?: number
  allocated_hours?: number
  utilization_percentage?: number
  notes?: string
  source_document?: string
}

interface PerformanceMeasurement {
  success_criterion_name: string
  measurement_date: string
  actual_value?: number
  target_value?: number
  units?: string
  variance?: number
  variance_percentage?: number
  trend?: 'improving' | 'stable' | 'declining'
  status?: 'on_track' | 'at_risk' | 'off_track'
  notes?: string
  source_document?: string
  source_document_id?: string
}

interface EarnedValueMetric {
  measurement_date: string
  planned_value?: number
  earned_value?: number
  actual_cost?: number
  schedule_variance?: number
  cost_variance?: number
  schedule_performance_index?: number
  cost_performance_index?: number
  estimate_at_completion?: number
  estimate_to_complete?: number
  notes?: string
  source_document?: string
}

interface PerformanceActual {
  entity_type: 'milestone' | 'deliverable' | 'activity' | 'phase' | 'resource'
  entity_id?: string // UUID - may not exist yet
  entity_name: string // Cached name for reporting
  planned_start_date?: string // ISO date string
  actual_start_date?: string // ISO date string
  planned_end_date?: string // ISO date string
  actual_end_date?: string // ISO date string
  planned_cost?: number
  actual_cost?: number
  planned_progress_percent?: number // 0-100
  actual_progress_percent?: number // 0-100
  quality_score?: number // 0-10
  defects_found?: number
  rework_hours?: number
  notes?: string
  source_document?: string
}

interface OpportunityRecord {
  title: string
  description?: string
  category?: string
  probability?: 'very_high' | 'high' | 'medium' | 'low' | 'very_low'
  benefit_level?: 'very_high' | 'high' | 'medium' | 'low' | 'very_low'
  exploitation_strategy?: string
  owner?: string
  status?: 'identified' | 'planned' | 'exploiting' | 'realized' | 'missed'
  expected_benefit?: number
  trigger_conditions?: string
  source_document?: string
}

interface RiskResponseRecord {
  risk_title?: string
  response_date?: string
  action_taken?: string
  effectiveness?: 'effective' | 'partially_effective' | 'ineffective'
  cost_of_response?: number
  residual_risk_level?: 'very_high' | 'high' | 'medium' | 'low' | 'very_low'
  owner?: string
  notes?: string
  source_document?: string
}

export class ProjectDataExtractionService {
  /**
   * Validate AI response and throw error if empty/invalid
   * This ensures empty responses trigger retries and provider fallback
   */
  private validateAIResponse(
    response: any,
    entityType: string,
    options: { aiProvider?: string; aiModel?: string }
  ): void {
    if (!response || !response.content || response.content.trim().length === 0) {
      const errorMsg = `AI returned empty or invalid response for ${entityType} extraction`
      logger.error(`[EXTRACTION-${entityType.toUpperCase()}] ${errorMsg}`, {
        hasResponse: !!response,
        hasContent: !!(response?.content),
        contentLength: response?.content?.length || 0,
        provider: options.aiProvider,
        model: options.aiModel
      })
      // Throw error to trigger Bull retry and provider fallback
      throw new Error(`${errorMsg} - Provider: ${options.aiProvider || 'unknown'}, Model: ${options.aiModel || 'unknown'}`)
    }
  }

  /**
   * Get the best available AI provider for extraction
   * Model selection is handled by aiService.generate() fallback mechanism
   * This method only selects the provider - model validation/mapping happens in AI service
   */
  private async getBestAIProviderAndModel(
    requestedProvider?: string,
    requestedModel?: string
  ): Promise<{ provider: string; model?: string }> {
    try {
      // If provider is explicitly requested, use it (model will be validated by AI service)
      if (requestedProvider) {
        logger.info(`[EXTRACTION] Using requested provider: ${requestedProvider}`, {
          requestedModel: requestedModel || 'auto-select'
        })
        // Pass model through - aiService.generate() will validate/map it
        return { provider: requestedProvider, model: requestedModel }
      }
      
      // No provider specified - use AI service's centralized fallback mechanism
      // Get available providers (includes is_active flag)
      const availableProviders = await aiService.getAvailableProviders()
      const activeProviders = availableProviders.filter(p => p.is_active)
      
      if (activeProviders.length === 0) {
        throw new Error('No active AI providers configured')
      }
      
      // Use first active provider - let AI service handle model selection
      const selectedProvider = activeProviders[0]
      logger.info(`[EXTRACTION] Auto-selected provider: ${selectedProvider.type}`, {
        providerName: selectedProvider.name,
        defaultModel: selectedProvider.default_model || 'auto-select',
        note: 'Model selection/validation handled by AI service fallback mechanism'
      })
      
      // Pass default_model if available, otherwise let AI service select
      return { 
        provider: selectedProvider.type, 
        model: selectedProvider.default_model || requestedModel 
      }
    } catch (error) {
      logger.error('[EXTRACTION] Error selecting AI provider:', error)
      // Fallback to OpenAI if selection fails - AI service will handle model selection
      return { provider: 'openai' }
    }
  }

  /**
   * Main entry point: Extract all entities from project documents
   */
  async extractProjectEntities(
    projectId: string,
    userId: string,
    options: {
      aiProvider?: string
      aiModel?: string
      documentIds?: string[]
    } = {}
  ): Promise<ExtractionResult> {
    // Get best provider/model using centralized fallback mechanism
    const { provider: bestProvider, model: bestModel } = await this.getBestAIProviderAndModel(
      options.aiProvider,
      options.aiModel
    )
    
    // Override options with best provider/model
    const extractionOptions = {
      ...options,
      aiProvider: bestProvider,
      aiModel: bestModel
    }
    
    try {
      logger.info('[EXTRACTION] Starting project entity extraction', {
        projectId,
        userId,
        provider: bestProvider,
        model: bestModel
      })

      const startTime = Date.now()

      // Step 1: Gather project documents
      const documents = await this.getProjectDocuments(projectId, options.documentIds)
      
      if (documents.length === 0) {
        throw new Error('No documents found for entity extraction')
      }

      logger.info(`[EXTRACTION] Processing ${documents.length} documents`)

      // Step 2: Build document map for source_document_id resolution
      const documentMap = this.buildDocumentMap(documents)
      const documentList = this.buildDocumentList(documents)

      // Step 3: Extract entities using AI (parallel execution for speed)
      const [
        stakeholders,
        requirements,
        risks,
        milestones,
        constraints,
        successCriteria,
        bestPractices,
        phases,
        resources,
        technologies,
        qualityStandards,
        deliverables,
        scopeItems,
        activities,
        teamAgreements,
        developmentApproaches,
        projectIterations,
        workItems,
        capacityPlans,
        performanceMeasurements,
        earnedValueMetrics,
        opportunities,
        riskResponses,
        performanceActuals
      ] = await Promise.all([
        this.extractStakeholders(documents, projectId, extractionOptions, documentMap, documentList),
        this.extractRequirements(documents, projectId, extractionOptions, documentMap, documentList),
        this.extractRisks(documents, projectId, extractionOptions, documentMap, documentList),
        this.extractMilestones(documents, projectId, extractionOptions, documentMap, documentList),
        this.extractConstraints(documents, projectId, extractionOptions, documentMap, documentList),
        this.extractSuccessCriteria(documents, projectId, extractionOptions, documentMap, documentList),
        this.extractBestPractices(documents, projectId, extractionOptions, documentMap, documentList),
        this.extractPhases(documents, projectId, extractionOptions, documentMap, documentList),
        this.extractResources(documents, projectId, extractionOptions, documentMap, documentList),
        this.extractTechnologies(documents, projectId, extractionOptions, documentMap, documentList),
        this.extractQualityStandards(documents, projectId, extractionOptions, documentMap, documentList),
        this.extractDeliverables(documents, projectId, extractionOptions, documentMap, documentList),
        this.extractScopeItems(documents, projectId, extractionOptions, documentMap, documentList),
        this.extractActivities(documents, projectId, extractionOptions, documentMap, documentList),
        this.extractTeamAgreements(documents, projectId, extractionOptions, documentMap, documentList),
        this.extractDevelopmentApproaches(documents, projectId, extractionOptions, documentMap, documentList),
        this.extractProjectIterations(documents, projectId, extractionOptions, documentMap, documentList),
        this.extractWorkItems(documents, projectId, extractionOptions, documentMap, documentList),
        this.extractCapacityPlans(documents, projectId, extractionOptions, documentMap, documentList),
        this.extractPerformanceMeasurements(documents, projectId, extractionOptions, documentMap, documentList),
        this.extractEarnedValueMetrics(documents, projectId, extractionOptions, documentMap, documentList),
        this.extractOpportunities(documents, projectId, extractionOptions, documentMap, documentList),
        this.extractRiskResponses(documents, projectId, extractionOptions, documentMap, documentList),
        this.extractPerformanceActuals(documents, projectId, extractionOptions, documentMap, documentList)
      ])

      const extractionTime = Date.now() - startTime

      logger.info('[EXTRACTION] Entity extraction completed', {
        projectId,
        extractionTime,
        counts: {
          stakeholders: stakeholders.length,
          requirements: requirements.length,
          risks: risks.length,
          milestones: milestones.length,
          constraints: constraints.length,
          successCriteria: successCriteria.length,
          bestPractices: bestPractices.length,
          phases: phases.length,
          resources: resources.length,
          technologies: technologies.length,
          qualityStandards: qualityStandards.length,
          deliverables: deliverables.length,
          scopeItems: scopeItems.length,
          activities: activities.length,
          teamAgreements: teamAgreements.length,
          developmentApproaches: developmentApproaches.length,
          projectIterations: projectIterations.length,
          workItems: workItems.length,
          capacityPlans: capacityPlans.length,
          performanceMeasurements: performanceMeasurements.length,
          earnedValueMetrics: earnedValueMetrics.length,
          opportunities: opportunities.length,
          riskResponses: riskResponses.length,
          performanceActuals: performanceActuals.length
        }
      })

      return {
        stakeholders,
        requirements,
        risks,
        milestones,
        constraints,
        success_criteria: successCriteria,
        best_practices: bestPractices,
        phases,
        resources,
        technologies,
        quality_standards: qualityStandards,
        deliverables,
        scope_items: scopeItems,
        activities,
        team_agreements: teamAgreements,
        development_approaches: developmentApproaches,
        project_iterations: projectIterations,
        work_items: workItems,
        capacity_plans: capacityPlans,
        performance_measurements: performanceMeasurements,
        earned_value_metrics: earnedValueMetrics,
        opportunities,
        risk_responses: riskResponses,
        performance_actuals: performanceActuals
      }
    } catch (error: unknown) {
      logger.error('[EXTRACTION] Entity extraction failed', {
        projectId,
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  /**
   * Save extracted entities to database
   */
  async saveExtractedEntities(
    projectId: string,
    userId: string,
    entities: ExtractionResult
  ): Promise<void> {
    if (!pool) {
      throw new Error('Database pool not initialized')
    }
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')

      logger.info('[EXTRACTION] Saving extracted entities to database', { projectId })

      // Save stakeholders
      if (entities.stakeholders.length > 0) {
        await this.saveStakeholders(client, projectId, userId, entities.stakeholders)
      }

      // Save requirements
      if (entities.requirements.length > 0) {
        await this.saveRequirements(client, projectId, userId, entities.requirements)
      }

      // Save risks
      if (entities.risks.length > 0) {
        await this.saveRisks(client, projectId, userId, entities.risks)
      }

      // Save milestones
      if (entities.milestones.length > 0) {
        await this.saveMilestones(client, projectId, userId, entities.milestones)
      }

      // Save constraints
      if (entities.constraints.length > 0) {
        await this.saveConstraints(client, projectId, userId, entities.constraints)
      }

      // Save success criteria
      if (entities.success_criteria.length > 0) {
        await this.saveSuccessCriteria(client, projectId, userId, entities.success_criteria)
      }

      // Save best practices
      if (entities.best_practices.length > 0) {
        await this.saveBestPractices(client, projectId, userId, entities.best_practices)
      }

      // Save phases
      if (entities.phases.length > 0) {
        await this.savePhases(client, projectId, userId, entities.phases)
      }

      // Save resources
      if (entities.resources.length > 0) {
        await this.saveResources(client, projectId, userId, entities.resources)
      }

      // Save technologies
      if (entities.technologies.length > 0) {
        await this.saveTechnologies(client, projectId, userId, entities.technologies)
      }

      // Save quality standards
      if (entities.quality_standards.length > 0) {
        await this.saveQualityStandards(client, projectId, userId, entities.quality_standards)
      }

      // Save deliverables
      if (entities.deliverables.length > 0) {
        await this.saveDeliverables(client, projectId, userId, entities.deliverables)
      }

      // Save scope items
      if (entities.scope_items.length > 0) {
        await this.saveScopeItems(client, projectId, userId, entities.scope_items)
      }

      // Save activities
      if (entities.activities.length > 0) {
        await this.saveActivities(client, projectId, userId, entities.activities)
      }

      // Save team agreements
      if (entities.team_agreements.length > 0) {
        await this.saveTeamAgreements(client, projectId, userId, entities.team_agreements)
      }

      // Save development approaches
      if (entities.development_approaches.length > 0) {
        await this.saveDevelopmentApproaches(client, projectId, userId, entities.development_approaches)
      }

      // Save project iterations
      if (entities.project_iterations.length > 0) {
        await this.saveProjectIterations(client, projectId, userId, entities.project_iterations)
      }

      // Save work items
      if (entities.work_items.length > 0) {
        await this.saveWorkItems(client, projectId, userId, entities.work_items)
      }

      // Save capacity plans
      if (entities.capacity_plans.length > 0) {
        await this.saveCapacityPlans(client, projectId, userId, entities.capacity_plans)
      }

      // Save performance measurements
      if (entities.performance_measurements.length > 0) {
        await this.savePerformanceMeasurements(client, projectId, userId, entities.performance_measurements)
      }

      // Save earned value metrics
      if (entities.earned_value_metrics.length > 0) {
        await this.saveEarnedValueMetrics(client, projectId, userId, entities.earned_value_metrics)
      }

      // Save opportunities
      if (entities.opportunities.length > 0) {
        await this.saveOpportunities(client, projectId, userId, entities.opportunities)
      }

      // Save risk responses
      if (entities.risk_responses.length > 0) {
        await this.saveRiskResponses(client, projectId, userId, entities.risk_responses)
      }

      // Save performance actuals
      if (entities.performance_actuals.length > 0) {
        await this.savePerformanceActuals(client, projectId, userId, entities.performance_actuals)
      }

      await client.query('COMMIT')

      logger.info('[EXTRACTION] All entities saved successfully', { projectId })
    } catch (error: unknown) {
      await client.query('ROLLBACK')
      logger.error('[EXTRACTION] Failed to save entities', {
        projectId,
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Get project documents for extraction
   */
  private async getProjectDocuments(
    projectId: string,
    documentIds?: string[]
  ): Promise<Array<{ id: string; title: string; content: string; template_name?: string }>> {
    try {
      // Ensure pool is connected before querying
      if (!pool) {
        const { connectDatabase } = await import('@/database/connection')
        await connectDatabase()
      }
      
      let query = `
        SELECT 
          d.id,
          COALESCE(d.title, t.name, 'Untitled Document ' || SUBSTRING(d.id::text, 1, 8)) as title,
          d.content,
          t.name as template_name
        FROM documents d
        LEFT JOIN templates t ON d.template_id = t.id
        WHERE d.project_id = $1
          AND d.deleted_at IS NULL
          AND d.content IS NOT NULL
          AND d.content != ''
          AND d.parent_document_id IS NULL
      `

      const params: any[] = [projectId]

      if (documentIds && documentIds.length > 0) {
        query += ` AND d.id = ANY($2::uuid[])`
        params.push(documentIds)
      }

      query += ` ORDER BY d.created_at ASC`

      if (!pool) {
        throw new Error('Database pool not initialized after connection attempt')
      }
      const result = await pool.query(query, params)
      return result.rows
    } catch (error: unknown) {
      logger.error('[EXTRACTION] Failed to fetch project documents', {
        projectId,
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  /**
   * Extract stakeholders using AI
   */
  private async extractStakeholders(
    documents: Array<{ id: string; title: string; content: string; template_name?: string }>,
    projectId: string,
    options: { aiProvider?: string; aiModel?: string },
    documentMap: Map<string, string>,
    documentList: string
  ): Promise<Stakeholder[]> {
    try {
      logger.info('[EXTRACTION-STAKEHOLDERS] Starting extraction')

      const documentContext = this.buildDocumentContext(documents)
      
      const prompt = `Analyze the following project documents and extract ALL stakeholders mentioned.

${documentContext}

AVAILABLE DOCUMENTS (for source_document matching):
${documentList}

Extract stakeholders in JSON format with the following structure:
{
  "stakeholders": [
    {
      "name": "Stakeholder Name or Role",
      "role": "Their role in the project",
      "interest_level": "high|medium|low",
      "influence_level": "high|medium|low",
      "expectations": "What they expect from the project",
      "concerns": "Any concerns they have",
      "source_document": "EXACT document title from AVAILABLE DOCUMENTS list above"
    }
  ]
}

Requirements:
- Include ALL stakeholders mentioned (sponsors, team members, users, vendors, etc.)
- If specific names aren't mentioned, use role names (e.g., "Project Sponsor")
- AVOID DUPLICATES: If the same person is mentioned multiple times, include them only once
- Use the most specific name available (prefer "John Smith" over "Project Manager")
- For roles without names, use the role title (e.g., "CISO", not "IT Security (CISO)")
- Infer interest and influence levels from context
- Extract expectations and concerns if mentioned
- **source_document MUST match exactly** one of the document titles from AVAILABLE DOCUMENTS list
- Return ONLY valid JSON, no markdown or explanation`

      // Use generateWithFallback for automatic provider fallback and increased token limit
      const response = await aiService.generateWithFallback({
        prompt,
        provider: options.aiProvider || 'openai',
        model: options.aiModel,
        temperature: 0.3,
        max_tokens: 4000 // Increased from 2000 to handle large documents
      }, ['openai', 'google', 'anthropic', 'mistral', 'groq'])

      // Note: response from generateWithFallback includes providerUsed, but validateAIResponse expects standard format
      const standardResponse = {
        content: response.content,
        usage: response.usage,
        model: response.model || options.aiModel
      }
      this.validateAIResponse(standardResponse, 'stakeholders', options)

      const parsed = this.parseAIResponse(response.content)
      
      // Log if parsing returned empty object
      if (!parsed || Object.keys(parsed).length === 0) {
        logger.warn('[EXTRACTION-STAKEHOLDERS] AI response parsed to empty object', {
          contentLength: response.content.length,
          contentPreview: response.content.substring(0, 500)
        })
        return []
      }
      
      const rawStakeholders = parsed.stakeholders || []

      // Deduplicate stakeholders within the extracted batch (no DB check here)
      const stakeholders = this.deduplicateStakeholdersBatch(rawStakeholders)
      
      if (rawStakeholders.length !== stakeholders.length) {
        logger.info(`[EXTRACTION-STAKEHOLDERS] Removed ${rawStakeholders.length - stakeholders.length} duplicates within batch`)
      }

      // Resolve source_document_id for each stakeholder (STRICT: reject if missing)
      const validStakeholders: Stakeholder[] = []
      let rejectedCount = 0
      
      stakeholders.forEach(stakeholder => {
        const isValid = this.resolveSourceDocumentIdStrict(
          stakeholder,
          documentMap,
          documents,
          'STAKEHOLDERS',
          stakeholder.name || 'Unnamed Stakeholder'
        )
        
        if (isValid) {
          validStakeholders.push(stakeholder)
        } else {
          rejectedCount++
        }
      })

      if (rejectedCount > 0) {
        logger.warn(`[EXTRACTION-STAKEHOLDERS] REJECTED ${rejectedCount} stakeholders without valid source_document_id (out of ${stakeholders.length} total)`)
      }
      
      logger.info(`[EXTRACTION-STAKEHOLDERS] Extracted ${validStakeholders.length} stakeholders with valid source_document_id (${rejectedCount} rejected)`)

      return validStakeholders
    } catch (error: unknown) {
      logger.error('[EXTRACTION-STAKEHOLDERS] Extraction failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
      // Re-throw to trigger Bull retry and provider fallback
      throw error
    }
  }

  /**
   * Extract requirements using AI
   */
  private async extractRequirements(
    documents: Array<{ id: string; title: string; content: string; template_name?: string }>,
    projectId: string,
    options: { aiProvider?: string; aiModel?: string },
    documentMap: Map<string, string>,
    documentList: string
  ): Promise<Requirement[]> {
    try {
      logger.info('[EXTRACTION-REQUIREMENTS] Starting extraction')

      const documentContext = this.buildDocumentContext(documents)
      
      const prompt = `Analyze the following project documents and extract ALL requirements mentioned.

${documentContext}

AVAILABLE DOCUMENTS (for source_document matching):
${documentList}

Extract requirements in JSON format with the following structure:
{
  "requirements": [
    {
      "title": "Requirement Title",
      "description": "Detailed description",
      "type": "functional|non-functional|business|technical",
      "priority": "critical|high|medium|low",
      "status": "proposed|approved|in_progress|completed",
      "acceptance_criteria": "How to verify this requirement",
      "source_document": "EXACT document title from AVAILABLE DOCUMENTS list above"
    }
  ]
}

Requirements:
- Include functional requirements (features, capabilities)
- Include non-functional requirements (performance, security, usability)
- Include business requirements (objectives, constraints)
- Include technical requirements (architecture, technology)
- Classify each requirement appropriately
- Infer priority from context (must-have = critical, should-have = high, etc.)
- **source_document MUST match exactly** one of the document titles from AVAILABLE DOCUMENTS list
- Return ONLY valid JSON, no markdown or explanation`

      // Use generateWithFallback for automatic provider fallback and increased token limit
      // Note: Increased to 10000 to handle large documents with extensive requirements (was truncating)
      const response = await aiService.generateWithFallback({
        prompt,
        provider: options.aiProvider || 'openai',
        model: options.aiModel,
        temperature: 0.3,
        max_tokens: 10000 // Increased from 3000 to handle very large requirement extractions
      }, ['openai', 'google', 'anthropic', 'mistral', 'groq'])

      const parsed = this.parseAIResponse(response.content)
      const requirements = parsed.requirements || []

      // Resolve source_document_id for each requirement (STRICT: reject if missing)
      const validRequirements: Requirement[] = []
      let rejectedCount = 0
      
      requirements.forEach((req: any) => {
        const isValid = this.resolveSourceDocumentIdStrict(
          req,
          documentMap,
          documents,
          'REQUIREMENTS',
          req.title || req.name || 'Unnamed Requirement'
        )
        
        if (isValid) {
          validRequirements.push(req)
        } else {
          rejectedCount++
        }
      })

      if (rejectedCount > 0) {
        logger.warn(`[EXTRACTION-REQUIREMENTS] REJECTED ${rejectedCount} requirements without valid source_document_id (out of ${requirements.length} total)`)
      }
      
      logger.info(`[EXTRACTION-REQUIREMENTS] Extracted ${validRequirements.length} requirements with valid source_document_id (${rejectedCount} rejected)`)
      
      return validRequirements
    } catch (error: unknown) {
      logger.error('[EXTRACTION-REQUIREMENTS] Extraction failed', {
        error: error instanceof Error ? error.message : String(error)
      })
      return []
    }
  }

  /**
   * Extract risks using AI
   */
  private async extractRisks(
    documents: Array<{ id: string; title: string; content: string; template_name?: string }>,
    projectId: string,
    options: { aiProvider?: string; aiModel?: string },
    documentMap: Map<string, string>,
    documentList: string
  ): Promise<Risk[]> {
    try {
      logger.info('[EXTRACTION-RISKS] Starting extraction')

      const documentContext = this.buildDocumentContext(documents)
      
      const prompt = `Analyze the following project documents and extract ALL risks mentioned.

${documentContext}

AVAILABLE DOCUMENTS (for source_document matching):
${documentList}

Extract risks in JSON format with the following structure:
{
  "risks": [
    {
      "title": "Risk Title",
      "description": "Detailed description of the risk",
      "category": "technical|schedule|budget|resource|external|quality",
      "probability": "high|medium|low",
      "impact": "high|medium|low",
      "mitigation_strategy": "How to prevent or reduce this risk",
      "contingency_plan": "What to do if the risk occurs",
      "source_document": "EXACT document title from AVAILABLE DOCUMENTS list above"
    }
  ]
}

Requirements:
- Include ALL risks mentioned in any document
- Categorize risks appropriately
- Assess probability and impact from context
- Extract mitigation strategies if mentioned
- Extract contingency plans if mentioned
- **source_document MUST match exactly** one of the document titles from AVAILABLE DOCUMENTS list
- Return ONLY valid JSON, no markdown or explanation`

      // Use generateWithFallback for automatic provider fallback and increased token limit
      const response = await aiService.generateWithFallback({
        prompt,
        provider: options.aiProvider || 'openai',
        model: options.aiModel,
        temperature: 0.3,
        max_tokens: 5000 // Increased from 2500 to handle large documents with many risks
      }, ['openai', 'google', 'anthropic', 'mistral', 'groq'])

      const parsed = this.parseAIResponse(response.content)
      const risks = parsed.risks || []

      // Resolve source_document_id for each risk (STRICT: reject if missing)
      const validRisks: Risk[] = []
      let rejectedCount = 0
      
      risks.forEach((risk: any) => {
        const isValid = this.resolveSourceDocumentIdStrict(
          risk,
          documentMap,
          documents,
          'RISKS',
          risk.title || 'Unnamed Risk'
        )
        
        if (isValid) {
          validRisks.push(risk)
        } else {
          rejectedCount++
        }
      })

      if (rejectedCount > 0) {
        logger.warn(`[EXTRACTION-RISKS] REJECTED ${rejectedCount} risks without valid source_document_id (out of ${risks.length} total)`)
      }
      
      logger.info(`[EXTRACTION-RISKS] Extracted ${validRisks.length} risks with valid source_document_id (${rejectedCount} rejected)`)
      
      return validRisks
    } catch (error: unknown) {
      logger.error('[EXTRACTION-RISKS] Extraction failed', {
        error: error instanceof Error ? error.message : String(error)
      })
      return []
    }
  }

  /**
   * Extract milestones using AI
   */
  private async extractMilestones(
    documents: Array<{ id: string; title: string; content: string; template_name?: string }>,
    projectId: string,
    options: { aiProvider?: string; aiModel?: string },
    documentMap: Map<string, string>,
    documentList: string
  ): Promise<Milestone[]> {
    try {
      logger.info('[EXTRACTION-MILESTONES] Starting extraction')

      const documentContext = this.buildDocumentContext(documents)
      
      const prompt = `Analyze the following project documents and extract ONLY major project milestones.

${documentContext}

AVAILABLE DOCUMENTS (for source_document matching):
${documentList}

**IMPORTANT: Milestones vs Activities:**
- **MILESTONE** = Zero-duration checkpoint marking completion of a major deliverable or phase (e.g., "MVP Launch", "CSRD Deadline", "Project Kickoff", "Go-Live")
- **ACTIVITY** = Work effort with duration (e.g., "Develop frontend module", "Conduct UAT testing") - DO NOT include activities as milestones
- Limit to 10-20 milestones per project (major checkpoints only)

Extract milestones in JSON format with the following structure:
{
  "milestones": [
    {
      "name": "Milestone Name",
      "description": "What this milestone represents (major checkpoint or deliverable completion)",
      "due_date": "YYYY-MM-DD or Quarter/Year if specific date not mentioned",
      "status": "pending|in_progress|completed|delayed",
      "deliverables": ["Deliverable 1", "Deliverable 2"],
      "source_document": "EXACT document title from AVAILABLE DOCUMENTS list above"
    }
  ]
}

Requirements:
- Extract ONLY major project milestones (completion of phases, major deliverables, key decisions, go-live dates)
- Examples: "Project Kickoff", "Requirements Approval", "MVP Launch", "UAT Completion", "Go-Live", "Project Closure"
- DO NOT extract regular activities, tasks, or work packages
- Typical projects have 10-20 milestones maximum
- Extract deliverables associated with each milestone
- If exact dates aren't mentioned, use relative dates like "2025-Q1" or "Month 3"
- Infer status from context (future = pending, past = completed)
- **source_document MUST match exactly** one of the document titles from AVAILABLE DOCUMENTS list
- Return ONLY valid JSON, no markdown or explanation`

      const response = await aiService.generate({
        prompt,
        provider: options.aiProvider!,
        model: options.aiModel,
        temperature: 0.3,
        max_tokens: 2000
      })

      const parsed = this.parseAIResponse(response.content)
      const milestones = parsed.milestones || []

      // Resolve source_document_id for each milestone (STRICT: reject if missing)
      const validMilestones: Milestone[] = []
      let rejectedCount = 0
      
      milestones.forEach((milestone: any) => {
        const isValid = this.resolveSourceDocumentIdStrict(
          milestone,
          documentMap,
          documents,
          'MILESTONES',
          milestone.name || 'Unnamed Milestone'
        )
        
        if (isValid) {
          validMilestones.push(milestone)
        } else {
          rejectedCount++
        }
      })

      if (rejectedCount > 0) {
        logger.warn(`[EXTRACTION-MILESTONES] REJECTED ${rejectedCount} milestones without valid source_document_id (out of ${milestones.length} total)`)
      }
      
      logger.info(`[EXTRACTION-MILESTONES] Extracted ${validMilestones.length} milestones with valid source_document_id (${rejectedCount} rejected)`)
      
      return validMilestones
    } catch (error: unknown) {
      logger.error('[EXTRACTION-MILESTONES] Extraction failed', {
        error: error instanceof Error ? error.message : String(error)
      })
      return []
    }
  }

  /**
   * Extract constraints using AI
   */
  private async extractConstraints(
    documents: Array<{ id: string; title: string; content: string; template_name?: string }>,
    projectId: string,
    options: { aiProvider?: string; aiModel?: string },
    documentMap: Map<string, string>,
    documentList: string
  ): Promise<Constraint[]> {
    try {
      logger.info('[EXTRACTION-CONSTRAINTS] Starting extraction')

      const documentContext = this.buildDocumentContext(documents)
      
      const prompt = `Analyze the following project documents and extract ALL constraints mentioned.

${documentContext}

AVAILABLE DOCUMENTS (for source_document matching):
${documentList}

Extract constraints in JSON format with the following structure:
{
  "constraints": [
    {
      "title": "Constraint Title",
      "description": "Detailed description",
      "type": "scope|time|cost|quality|resource|technical|regulatory",
      "severity": "high|medium|low",
      "impact_area": "Which area of the project is affected",
      "source_document": "EXACT document title from AVAILABLE DOCUMENTS list above"
    }
  ]
}

Requirements:
- Include budget constraints, timeline constraints, resource constraints
- Include technical constraints (technology, platform, integration)
- Include regulatory/compliance constraints
- Include scope constraints (what's out of scope)
- Assess severity based on impact to project
- **source_document MUST match exactly** one of the document titles from AVAILABLE DOCUMENTS list
- Return ONLY valid JSON, no markdown or explanation`

      // Use generateWithFallback for automatic provider fallback and increased token limit
      const response = await aiService.generateWithFallback({
        prompt,
        provider: options.aiProvider || 'openai',
        model: options.aiModel,
        temperature: 0.3,
        max_tokens: 4000 // Increased from 2000 to handle large documents
      }, ['openai', 'google', 'anthropic', 'mistral', 'groq'])

      const parsed = this.parseAIResponse(response.content)
      const constraints = parsed.constraints || []

      // Resolve source_document_id for each constraint (STRICT: reject if missing)
      const validConstraints: Constraint[] = []
      let rejectedCount = 0
      
      constraints.forEach((constraint: any) => {
        const isValid = this.resolveSourceDocumentIdStrict(
          constraint,
          documentMap,
          documents,
          'CONSTRAINTS',
          constraint.title || 'Unnamed Constraint'
        )
        
        if (isValid) {
          validConstraints.push(constraint)
        } else {
          rejectedCount++
        }
      })

      if (rejectedCount > 0) {
        logger.warn(`[EXTRACTION-CONSTRAINTS] REJECTED ${rejectedCount} constraints without valid source_document_id (out of ${constraints.length} total)`)
      }
      
      logger.info(`[EXTRACTION-CONSTRAINTS] Extracted ${validConstraints.length} constraints with valid source_document_id (${rejectedCount} rejected)`)
      
      return validConstraints
    } catch (error: unknown) {
      logger.error('[EXTRACTION-CONSTRAINTS] Extraction failed', {
        error: error instanceof Error ? error.message : String(error)
      })
      return []
    }
  }

  /**
   * Extract success criteria using AI
   */
  private async extractSuccessCriteria(
    documents: Array<{ id: string; title: string; content: string; template_name?: string }>,
    projectId: string,
    options: { aiProvider?: string; aiModel?: string },
    documentMap: Map<string, string>,
    documentList: string
  ): Promise<SuccessCriterion[]> {
    try {
      logger.info('[EXTRACTION-SUCCESS-CRITERIA] Starting extraction')

      const documentContext = this.buildDocumentContext(documents)
      
      const prompt = `Analyze the following project documents and extract ALL success criteria and KPIs mentioned.

${documentContext}

AVAILABLE DOCUMENTS (for source_document matching):
${documentList}

Extract success criteria in JSON format with the following structure:
{
  "success_criteria": [
    {
      "title": "Success Criterion Title",
      "description": "What defines success",
      "metric": "The measurable metric",
      "target_value": "The target value to achieve",
      "measurement_method": "How this will be measured",
      "priority": "critical|high|medium|low",
      "source_document": "EXACT document title from AVAILABLE DOCUMENTS list above"
    }
  ]
}

Requirements:
- Include KPIs (Key Performance Indicators)
- Include acceptance criteria
- Include quality gates
- Include success metrics (time, cost, quality, satisfaction)
- Extract specific measurable targets if mentioned
- **source_document MUST match exactly** one of the document titles from AVAILABLE DOCUMENTS list
- Return ONLY valid JSON, no markdown or explanation`

      // Use generateWithFallback for automatic provider fallback and increased token limit
      // Note: Increased to 10000 to handle large documents with extensive success criteria (was truncating at ~9K chars)
      const response = await aiService.generateWithFallback({
        prompt,
        provider: options.aiProvider || 'openai',
        model: options.aiModel,
        temperature: 0.3,
        max_tokens: 10000 // Increased from 2000 to handle very large success criteria extractions
      }, ['openai', 'google', 'anthropic', 'mistral', 'groq'])

      const parsed = this.parseAIResponse(response.content)
      const successCriteria = parsed.success_criteria || []

      // Resolve source_document_id for each success criterion (STRICT: reject if missing)
      const validSuccessCriteria: SuccessCriterion[] = []
      let rejectedCount = 0
      
      successCriteria.forEach((criterion: any) => {
        const isValid = this.resolveSourceDocumentIdStrict(
          criterion,
          documentMap,
          documents,
          'SUCCESS-CRITERIA',
          criterion.title || 'Unnamed Success Criterion'
        )
        
        if (isValid) {
          validSuccessCriteria.push(criterion)
        } else {
          rejectedCount++
        }
      })

      if (rejectedCount > 0) {
        logger.warn(`[EXTRACTION-SUCCESS-CRITERIA] REJECTED ${rejectedCount} success criteria without valid source_document_id (out of ${successCriteria.length} total)`)
      }
      
      logger.info(`[EXTRACTION-SUCCESS-CRITERIA] Extracted ${validSuccessCriteria.length} success criteria with valid source_document_id (${rejectedCount} rejected)`)
      
      return validSuccessCriteria
    } catch (error: unknown) {
      logger.error('[EXTRACTION-SUCCESS-CRITERIA] Extraction failed', {
        error: error instanceof Error ? error.message : String(error)
      })
      return []
    }
  }

  /**
   * Extract best practices using AI
   */
  private async extractBestPractices(
    documents: Array<{ id: string; title: string; content: string; template_name?: string }>,
    projectId: string,
    options: { aiProvider?: string; aiModel?: string },
    documentMap: Map<string, string>,
    documentList: string
  ): Promise<BestPractice[]> {
    try {
      logger.info('[EXTRACTION-BEST-PRACTICES] Starting extraction')

      const documentContext = this.buildDocumentContext(documents)
      
      const prompt = `Analyze the following project documents and extract ALL best practices, lessons learned, and recommendations mentioned.

${documentContext}

AVAILABLE DOCUMENTS (for source_document matching):
${documentList}

Extract best practices in JSON format with the following structure:
{
  "best_practices": [
    {
      "title": "Best Practice Title",
      "description": "Detailed description",
      "category": "Category (e.g., Development, Testing, Communication)",
      "applicability": "When/where this applies",
      "source_document": "EXACT document title from AVAILABLE DOCUMENTS list above"
    }
  ]
}

Requirements:
- Include best practices mentioned in any document
- Include lessons learned
- Include recommendations for future projects
- Categorize appropriately
- **source_document MUST match exactly** one of the document titles from AVAILABLE DOCUMENTS list
- Return ONLY valid JSON, no markdown or explanation`

      const response = await aiService.generate({
        prompt,
        provider: options.aiProvider!,
        model: options.aiModel,
        temperature: 0.3,
        max_tokens: 1500
      })

      const parsed = this.parseAIResponse(response.content)
      const bestPractices = parsed.best_practices || []

      // Resolve source_document_id for each best practice (STRICT: reject if missing)
      const validBestPractices: BestPractice[] = []
      let rejectedCount = 0
      
      bestPractices.forEach((practice: any) => {
        const isValid = this.resolveSourceDocumentIdStrict(
          practice,
          documentMap,
          documents,
          'BEST-PRACTICES',
          practice.title || 'Unnamed Best Practice'
        )
        
        if (isValid) {
          validBestPractices.push(practice)
        } else {
          rejectedCount++
        }
      })

      if (rejectedCount > 0) {
        logger.warn(`[EXTRACTION-BEST-PRACTICES] REJECTED ${rejectedCount} best practices without valid source_document_id (out of ${bestPractices.length} total)`)
      }
      
      logger.info(`[EXTRACTION-BEST-PRACTICES] Extracted ${validBestPractices.length} best practices with valid source_document_id (${rejectedCount} rejected)`)

      return validBestPractices
    } catch (error: unknown) {
      logger.error('[EXTRACTION-BEST-PRACTICES] Extraction failed', {
        error: error instanceof Error ? error.message : String(error)
      })
      return []
    }
  }

  /**
   * Extract phases using AI
   */
  private async extractPhases(
    documents: Array<{ id: string; title: string; content: string; template_name?: string }>,
    projectId: string,
    options: { aiProvider?: string; aiModel?: string },
    documentMap: Map<string, string>,
    documentList: string
  ): Promise<Phase[]> {
    try {
      logger.info('[EXTRACTION-PHASES] Starting extraction')

      const documentContext = this.buildDocumentContext(documents)
      
      const prompt = `Analyze the following project documents and extract ALL project phases mentioned.

${documentContext}

AVAILABLE DOCUMENTS (for source_document matching):
${documentList}

Extract phases in JSON format with the following structure:
{
  "phases": [
    {
      "name": "Phase Name",
      "description": "What happens in this phase",
      "start_date": "YYYY-MM-DD or relative date",
      "end_date": "YYYY-MM-DD or relative date",
      "status": "planned|active|completed",
      "deliverables": ["Deliverable 1", "Deliverable 2"],
      "key_activities": ["Activity 1", "Activity 2"],
      "source_document": "EXACT document title from AVAILABLE DOCUMENTS list above"
    }
  ]
}

Requirements:
- Include ALL phases mentioned (Initiation, Planning, Execution, Monitoring, Closing, etc.)
- Extract deliverables for each phase
- Extract key activities
- Infer status from context
- **source_document MUST match exactly** one of the document titles from AVAILABLE DOCUMENTS list
- Return ONLY valid JSON, no markdown or explanation`

      // Use generateWithFallback for automatic provider fallback and increased token limit
      // Note: Increased to 8000 to handle large documents with many phases (was truncating)
      const response = await aiService.generateWithFallback({
        prompt,
        provider: options.aiProvider || 'openai',
        model: options.aiModel,
        temperature: 0.3,
        max_tokens: 8000 // Increased from 1500 to handle large documents with many phases (was truncating)
      }, ['openai', 'google', 'anthropic', 'mistral', 'groq'])

      const parsed = this.parseAIResponse(response.content)
      const phases = parsed.phases || []

      // Resolve source_document_id for each phase (STRICT: reject if missing)
      const validPhases: Phase[] = []
      let rejectedCount = 0
      
      phases.forEach((phase: any) => {
        const isValid = this.resolveSourceDocumentIdStrict(
          phase,
          documentMap,
          documents,
          'PHASES',
          phase.name || 'Unnamed Phase'
        )
        
        if (isValid) {
          validPhases.push(phase)
        } else {
          rejectedCount++
        }
      })

      if (rejectedCount > 0) {
        logger.warn(`[EXTRACTION-PHASES] REJECTED ${rejectedCount} phases without valid source_document_id (out of ${phases.length} total)`)
      }
      
      logger.info(`[EXTRACTION-PHASES] Extracted ${validPhases.length} phases with valid source_document_id (${rejectedCount} rejected)`)

      return validPhases
    } catch (error: unknown) {
      logger.error('[EXTRACTION-PHASES] Extraction failed', {
        error: error instanceof Error ? error.message : String(error)
      })
      return []
    }
  }

  /**
   * Extract resources using AI
   */
  private async extractResources(
    documents: Array<{ id: string; title: string; content: string; template_name?: string }>,
    projectId: string,
    options: { aiProvider?: string; aiModel?: string },
    documentMap: Map<string, string>,
    documentList: string
  ): Promise<Resource[]> {
    try {
      logger.info('[EXTRACTION-RESOURCES] Starting extraction')

      const documentContext = this.buildDocumentContext(documents)
      
      const prompt = `Analyze the following project documents and extract ALL resources mentioned.

${documentContext}

AVAILABLE DOCUMENTS (for source_document matching):
${documentList}

Extract resources in JSON format with the following structure:
{
  "resources": [
    {
      "name": "Resource Name or Role",
      "type": "human|equipment|material|financial",
      "role": "Their role (for human resources)",
      "allocation": "Full-time, Part-time, or percentage",
      "availability": "When they are available",
      "skills": ["Skill 1", "Skill 2"],
      "competency_level": "junior|intermediate|senior|expert",
      "certifications": ["Certification 1"],
      "training_needs": ["Training need 1"],
      "team_assignment": "Team or squad name",
      "performance_rating": 0-10 number,
      "development_plan": "Summary of development actions",
      "source_document": "EXACT document title from AVAILABLE DOCUMENTS list above"
    }
  ]
}

Requirements:
- Include human resources (team members, consultants)
- Include equipment/tools
- Include financial resources (budget allocations)
- Extract allocation and availability if mentioned
- For human resources, include skills, competency, certifications, training needs, and performance indicators
- If a value is not provided in documents, use null or an empty array
- **source_document MUST match exactly** one of the document titles from AVAILABLE DOCUMENTS list
- Return ONLY valid JSON, no markdown or explanation`

      const response = await aiService.generate({
        prompt,
        provider: options.aiProvider!,
        model: options.aiModel,
        temperature: 0.3,
        max_tokens: 1500
      })

      const parsed = this.parseAIResponse(response.content)
      const resources = (parsed.resources || []).map((resource: any) => ({
        ...resource,
        skills: Array.isArray(resource?.skills)
          ? resource.skills
          : resource?.skills
            ? [resource.skills]
            : [],
        certifications: Array.isArray(resource?.certifications)
          ? resource.certifications
          : resource?.certifications
            ? [resource.certifications]
            : [],
        training_needs: Array.isArray(resource?.training_needs)
          ? resource.training_needs
          : resource?.training_needs
            ? [resource.training_needs]
            : []
      }))

      // Resolve source_document_id for each resource (with fallback)
      const validResources: Resource[] = []
      let rejectedCount = 0
      
      resources.forEach((resource: any) => {
        const isValid = this.resolveSourceDocumentIdStrict(
          resource,
          documentMap,
          documents,
          'RESOURCES',
          resource.name || 'Unnamed Resource'
        )
        
        if (isValid) {
          validResources.push(resource)
        } else {
          rejectedCount++
        }
      })

      if (rejectedCount > 0) {
        logger.warn(`[EXTRACTION-RESOURCES] REJECTED ${rejectedCount} resources without valid source_document_id (out of ${resources.length} total)`)
      }
      
      logger.info(`[EXTRACTION-RESOURCES] Extracted ${validResources.length} resources with valid source_document_id (${rejectedCount} rejected)`)

      return validResources
    } catch (error: unknown) {
      logger.error('[EXTRACTION-RESOURCES] Extraction failed', {
        error: error instanceof Error ? error.message : String(error)
      })
      return []
    }
  }

  /**
   * Extract technologies using AI
   */
  private async extractTechnologies(
    documents: Array<{ id: string; title: string; content: string; template_name?: string }>,
    projectId: string,
    options: { aiProvider?: string; aiModel?: string },
    documentMap: Map<string, string>,
    documentList: string
  ): Promise<Technology[]> {
    try {
      logger.info('[EXTRACTION-TECHNOLOGIES] Starting extraction')

      const documentContext = this.buildDocumentContext(documents)
      
      const prompt = `You are a **Technology Architect** tasked with extracting and structuring technology recommendations from project documentation to populate a **Technical Architecture Baseline** (PMBOK 7 - Technical Performance Domain).

CONTEXT:
This extraction will populate the **Technical Baseline → Architecture** component of the project baseline, categorizing the technology stack by architectural layer.

${documentContext}

EXTRACTION INSTRUCTIONS:

Extract ALL technologies mentioned across these layers:

1. **Frontend Layer (Presentation Tier)**:
   - UI Frameworks: React, Vue, Angular, Next.js, Svelte
   - Component Libraries: Tailwind CSS, Material-UI, Chakra UI, Radix UI
   - State Management: Redux, Zustand, MobX, Recoil
   - Build Tools: Webpack, Vite, Turbopack

2. **Backend Layer (Business Logic Tier)**:
   - Runtimes: Node.js, Python, Java, Go, .NET
   - Frameworks: Express, NestJS, Django, Spring Boot, FastAPI
   - API Standards: REST, GraphQL, gRPC, WebSocket

3. **Data Layer (Persistence Tier)**:
   - Databases: PostgreSQL, MySQL, MongoDB, Cassandra, DynamoDB
   - Caching: Redis, Memcached, Elasticache
   - Search: Elasticsearch, Algolia, Typesense
   - Message Queues: RabbitMQ, Kafka, AWS SQS, Bull/Redis

4. **Infrastructure Layer (Platform & Hosting)**:
   - Cloud Providers: AWS, Azure, GCP, DigitalOcean
   - Containerization: Docker, Podman
   - Orchestration: Kubernetes, Docker Swarm, ECS, AKS
   - Load Balancers: Nginx, HAProxy, AWS ALB, Cloudflare

5. **DevOps & CI/CD Layer**:
   - Version Control: Git, GitHub, GitLab, Bitbucket
   - CI/CD: GitHub Actions, GitLab CI, Jenkins, CircleCI
   - IaC: Terraform, Pulumi, CloudFormation, Ansible
   - Artifact Repos: Docker Hub, NPM, PyPI, Nexus

6. **Testing & Quality Layer**:
   - Unit Testing: Jest, Pytest, JUnit, Mocha
   - Integration Testing: Supertest, Postman, RestAssured
   - E2E Testing: Cypress, Playwright, Selenium, Puppeteer
   - Code Quality: SonarQube, ESLint, Prettier, CodeClimate

7. **Monitoring & Observability Layer**:
   - APM: Datadog, New Relic, Dynatrace, AppDynamics
   - Logging: ELK Stack, Splunk, Loki, CloudWatch
   - Metrics: Prometheus, Grafana, InfluxDB
   - Error Tracking: Sentry, Rollbar, Bugsnag

AVAILABLE DOCUMENTS (for source_document matching):
${documentList}

OUTPUT FORMAT:
{
  "technologies": [
    {
      "name": "Technology name (e.g., React, PostgreSQL, AWS)",
      "category": "frontend|backend|database|infrastructure|devops|testing|monitoring|other",
      "description": "What this technology does in the project",
      "version": "Version number or range (e.g., 18.3, 15.x, latest)",
      "purpose": "Why this technology was chosen for the project",
      "license": "License type (MIT, Apache 2.0, BSD, Proprietary, Commercial, Open Source)",
      "vendor": "Provider (AWS, Microsoft, Google, HashiCorp, Open Source Community, etc.)",
      "deployment_environment": "Where deployed (production, staging, development, all, cloud, on-premises)",
      "source_document": "EXACT document title from AVAILABLE DOCUMENTS list above"
    }
  ]
}

CRITICAL RULES:
- Extract ALL technologies mentioned in documents (aim for 20-40 technologies)
- Classify each technology into the correct category
- Extract version numbers when explicitly mentioned (use "latest" or version range if unclear)
- Infer purpose from context if not explicitly stated
- For open-source: use "Open Source" as vendor
- For cloud services: use cloud provider as vendor (AWS, Azure, GCP)
- **source_document MUST match exactly** one of the document titles from AVAILABLE DOCUMENTS list
- Return ONLY valid JSON, no markdown formatting, no explanations, no comments
- If a technology serves multiple purposes, include it in the most relevant category
- Extract both primary and supporting technologies (databases, caches, queues, monitoring, etc.)

QUALITY CHECKLIST:
✓ At least 3-5 frontend technologies
✓ At least 3-5 backend technologies
✓ At least 2-3 databases/data stores
✓ At least 2-3 infrastructure technologies
✓ DevOps, testing, and monitoring tools included
✓ Version numbers extracted when available
✓ License information included when mentioned
✓ Deployment environment specified

Return pure JSON only.`

      // Use generateWithFallback for automatic provider fallback and increased token limit
      // Note: Increased to 10000 to handle large documents with extensive technology lists (was truncating at ~8.7K chars)
      const response = await aiService.generateWithFallback({
        prompt,
        provider: options.aiProvider || 'openai',
        model: options.aiModel,
        temperature: 0.3,
        max_tokens: 10000 // Increased from 2000 to handle very large technology extractions
      }, ['openai', 'google', 'anthropic', 'mistral', 'groq'])

      const parsed = this.parseAIResponse(response.content)
      const technologies = parsed.technologies || []

      // Resolve source_document_id for each technology (STRICT: reject if missing)
      const validTechnologies: Technology[] = []
      let rejectedCount = 0
      
      technologies.forEach((tech: any) => {
        const isValid = this.resolveSourceDocumentIdStrict(
          tech,
          documentMap,
          documents,
          'TECHNOLOGIES',
          tech.name || 'Unnamed Technology'
        )
        
        if (isValid) {
          validTechnologies.push(tech)
        } else {
          rejectedCount++
        }
      })

      if (rejectedCount > 0) {
        logger.warn(`[EXTRACTION-TECHNOLOGIES] REJECTED ${rejectedCount} technologies without valid source_document_id (out of ${technologies.length} total)`)
      }
      
      logger.info(`[EXTRACTION-TECHNOLOGIES] Extracted ${validTechnologies.length} technologies with valid source_document_id (${rejectedCount} rejected)`)
      
      return validTechnologies
    } catch (error) {
      logger.error('[EXTRACTION-TECHNOLOGIES] Extraction failed', { error })
      return []
    }
  }

  /**
   * Extract quality standards using AI
   */
  private async extractQualityStandards(
    documents: Array<{ id: string; title: string; content: string; template_name?: string }>,
    projectId: string,
    options: { aiProvider?: string; aiModel?: string },
    documentMap: Map<string, string>,
    documentList: string
  ): Promise<QualityStandard[]> {
    try {
      logger.info('[EXTRACTION-QUALITY] Starting extraction')

      const documentContext = this.buildDocumentContext(documents)
      
      const prompt = `Analyze the following project documents and extract ALL quality standards and requirements mentioned.

${documentContext}

AVAILABLE DOCUMENTS (for source_document matching):
${documentList}

Extract quality standards in JSON format with the following structure:
{
  "quality_standards": [
    {
      "title": "Standard Title",
      "description": "What this standard requires",
      "category": "process|product|performance|compliance",
      "standard_type": "ISO|PMBOK|internal|industry|regulatory|other",
      "requirements": "Specific requirements",
      "measurement_criteria": "How compliance is measured",
      "compliance_level": "mandatory|recommended|optional",
      "source_document": "EXACT document title from AVAILABLE DOCUMENTS list above"
    }
  ]
}

Requirements:
- Include ISO standards (ISO 9001, ISO 27001, etc.)
- Include PMBOK/PMI standards
- Include internal quality standards
- Include industry-specific standards
- Include regulatory/compliance requirements (GDPR, HIPAA, SOX, etc.)
- Include code quality standards (coding conventions, test coverage, etc.)
- Classify each standard appropriately
- **source_document MUST match exactly** one of the document titles from AVAILABLE DOCUMENTS list
- Return ONLY valid JSON, no markdown or explanation`

      const response = await aiService.generate({
        prompt,
        provider: options.aiProvider!,
        model: options.aiModel,
        temperature: 0.3,
        max_tokens: 2000
      })

      const parsed = this.parseAIResponse(response.content)
      const qualityStandards = parsed.quality_standards || []

      // Resolve source_document_id for each quality standard (STRICT: reject if missing)
      const validQualityStandards: QualityStandard[] = []
      let rejectedCount = 0
      
      qualityStandards.forEach((standard: any) => {
        const isValid = this.resolveSourceDocumentIdStrict(
          standard,
          documentMap,
          documents,
          'QUALITY-STANDARDS',
          standard.title || standard.standard_name || 'Unnamed Quality Standard'
        )
        
        if (isValid) {
          validQualityStandards.push(standard)
        } else {
          rejectedCount++
        }
      })

      if (rejectedCount > 0) {
        logger.warn(`[EXTRACTION-QUALITY-STANDARDS] REJECTED ${rejectedCount} quality standards without valid source_document_id (out of ${qualityStandards.length} total)`)
      }
      
      logger.info(`[EXTRACTION-QUALITY-STANDARDS] Extracted ${validQualityStandards.length} quality standards with valid source_document_id (${rejectedCount} rejected)`)

      return validQualityStandards
    } catch (error: unknown) {
      logger.error('[EXTRACTION-QUALITY] Extraction failed', {
        error: error instanceof Error ? error.message : String(error)
      })
      return []
    }
  }

  /**
   * Extract compliance, security, legal, and standards requirements using AI
   */
  private async extractComplianceSecurity(
    documents: Array<{ id: string; title: string; content: string; template_name?: string }>,
    projectId: string,
    options: { aiProvider?: string; aiModel?: string },
    documentMap: Map<string, string>,
    documentList: string
  ): Promise<ComplianceSecurity[]> {
    try {
      logger.info('[EXTRACTION-COMPLIANCE-SECURITY] Starting extraction')

      const documentContext = this.buildDocumentContext(documents)
      
      const prompt = `Analyze the following project documents and extract ALL compliance, security, legal, and standards requirements mentioned.

${documentContext}

AVAILABLE DOCUMENTS (for source_document matching):
${documentList}

Extract compliance, security, legal, and standards requirements in JSON format with the following structure:
{
  "compliance_security": [
    {
      "title": "Requirement Title (e.g., 'ISO 27001 Compliance', 'ISO 9001 Quality Management', 'SOC 2 Type II', 'GDPR Requirements', 'HIPAA Compliance')",
      "category": "compliance|security|legal|standard",
      "type": "Specific type (e.g., 'ISO 27001', 'ISO 27018', 'ISO 27017', 'ISO 27002', 'ISO 9001', 'FINRA', 'FISMA', 'GAAP', 'HIPAA', 'ISAE 3402', 'ITAR', 'SOC 1', 'SOC 2', 'SOC 3', 'SOX', 'SP 800-53', 'SSAE 18', 'Safe Harbor', 'PCI DSS', 'GLBA', 'FedRAMP', 'CSA STAR', 'Privacy Shield', 'FFIEC', 'GAPP', 'COBIT', 'COPPA', 'FERPA', 'HITRUST CSF', 'Jericho Forum Commandments', 'GDPR', 'Encryption', 'Authentication')",
      "description": "Detailed description of the requirement",
      "requirement_text": "Specific requirement text if mentioned",
      "status": "applicable|not_applicable|partial|compliant|non_compliant",
      "security_score": 0-10,
      "compliance_score": 0-10,
      "latest_breach": "YYYY-MM-DD or null",
      "data_at_rest_encryption": "e.g., 'AES', 'AES-256'",
      "multi_factor_authentication": true|false,
      "ip_address_restriction": true|false,
      "user_audit_trail": true|false,
      "admin_audit_trail": true|false,
      "data_audit_trail": true|false,
      "user_can_upload_data": true|false,
      "data_classification": true|false,
      "remember_password": true|false,
      "user_roles_support": true|false,
      "file_sharing": true|false,
      "valid_certificate_name": "Certificate name if mentioned",
      "trusted_certificate": true|false,
      "encryption_protocol": "e.g., 'TLS 1.2', 'TLS 1.3'",
      "heartbleed_patched": true|false,
      "http_security_headers": true|false,
      "supports_saml": true|false,
      "protected_against_drown": true|false,
      "penetration_testing": true|false,
      "requires_user_authentication": true|false,
      "password_policy": "Password policy description",
      "iso_27001": true|false,
      "iso_27018": true|false,
      "iso_27017": true|false,
      "iso_27002": true|false,
      "finra": true|false,
      "fisma": true|false,
      "gaap": true|false,
      "hipaa": true|false,
      "isae_3402": true|false,
      "itar": true|false,
      "soc_1": true|false,
      "soc_2": true|false,
      "soc_3": true|false,
      "sox": true|false,
      "sp_800_53": true|false,
      "ssae_18": true|false,
      "safe_harbor": true|false,
      "pci_dss_version": "e.g., '4', '3.2.1'",
      "glba": true|false,
      "fedramp_level": "e.g., 'High', 'Moderate', 'Low'",
      "csa_star_level": "CSA STAR level if mentioned",
      "certification": true|false,
      "privacy_shield": true|false,
      "ffiec": true|false,
      "gapp": true|false,
      "cobit": true|false,
      "coppa": true|false,
      "ferpa": true|false,
      "hitrust_csf": true|false,
      "jericho_forum_commandments": true|false,
      "data_ownership": "Data ownership description",
      "dmca": true|false,
      "data_retention_policy": "e.g., 'Deleted immediately', 'Retained for 7 years'",
      "gdpr_readiness_statement": "GDPR readiness statement URL or text",
      "gdpr_right_to_erasure": true|false,
      "gdpr_report_data_breaches": true|false,
      "gdpr_data_protection": true|false,
      "gdpr_user_ownership": true|false,
      "other_standards": {"standard_name": "value"} for any international standards not listed above,
      "source_document": "EXACT document title from AVAILABLE DOCUMENTS list above"
    }
  ]
}

Requirements:
- Extract ALL compliance standards mentioned, including but not limited to:
  * ISO Standards: ISO 27001, ISO 27018, ISO 27017, ISO 27002, ISO 9001, ISO 9000 series
  * Financial/Accounting: FINRA, GAAP, SOX (Sarbanes-Oxley), FFIEC
  * Security Frameworks: SOC 1, SOC 2, SOC 3, SSAE 18, ISAE 3402, SP 800-53, FedRAMP, CSA STAR, HITRUST CSF, Jericho Forum Commandments
  * Healthcare: HIPAA, FERPA, COPPA
  * Government: FISMA, ITAR, GLBA
  * Privacy/Data Protection: GDPR, Privacy Shield, Safe Harbor, GAPP
  * Payment Card: PCI DSS (all versions including PCI DSS version 4)
  * IT Governance: COBIT
- Extract ALL quality management standards (ISO 9001, ISO 9000 series, etc.)
- Extract ALL security requirements (encryption, authentication, audit trails, etc.)
- Extract ALL legal requirements (DMCA, data retention, GDPR rights, etc.)
- Extract ALL applicable standards (international or industry-specific)
- For standards not explicitly listed above, include them in the "other_standards" field
- Only include boolean fields (true/false) if explicitly mentioned in the documents
- Only include scores (0-10) if explicitly mentioned or can be inferred
- **source_document MUST match exactly** one of the document titles from AVAILABLE DOCUMENTS list
- Return ONLY valid JSON, no markdown or explanation`

      const response = await aiService.generate({
        prompt,
        provider: options.aiProvider!,
        model: options.aiModel,
        temperature: 0.3,
        max_tokens: 4000 // Larger token limit due to comprehensive extraction
      })

      const parsed = this.parseAIResponse(response.content)
      const complianceSecurityItems = parsed.compliance_security || []

      // Resolve source_document_id for each item (STRICT: reject if missing)
      const validItems: ComplianceSecurity[] = []
      let rejectedCount = 0
      
      complianceSecurityItems.forEach((item: any) => {
        const isValid = this.resolveSourceDocumentIdStrict(
          item,
          documentMap,
          documents,
          'COMPLIANCE-SECURITY',
          item.title || item.type || 'Unnamed Compliance/Security Requirement'
        )
        
        if (isValid) {
          validItems.push(item)
        } else {
          rejectedCount++
        }
      })

      if (rejectedCount > 0) {
        logger.warn(`[EXTRACTION-COMPLIANCE-SECURITY] REJECTED ${rejectedCount} items without valid source_document_id (out of ${complianceSecurityItems.length} total)`)
      }
      
      logger.info(`[EXTRACTION-COMPLIANCE-SECURITY] Extracted ${validItems.length} compliance/security items with valid source_document_id (${rejectedCount} rejected)`)

      return validItems
    } catch (error: unknown) {
      logger.error('[EXTRACTION-COMPLIANCE-SECURITY] Extraction failed', {
        error: error instanceof Error ? error.message : String(error)
      })
      return []
    }
  }

  /**
   * Extract deliverables using AI
   */
  private async extractDeliverables(
    documents: Array<{ id: string; title: string; content: string; template_name?: string }>,
    projectId: string,
    options: { aiProvider?: string; aiModel?: string },
    documentMap: Map<string, string>,
    documentList: string
  ): Promise<Deliverable[]> {
    try {
      logger.info('[EXTRACTION-DELIVERABLES] Starting extraction')

      const documentContext = this.buildDocumentContext(documents)
      
      const prompt = `Analyze the following project documents and extract ALL deliverables mentioned.

${documentContext}

AVAILABLE DOCUMENTS (for source_document matching):
${documentList}

Extract deliverables in JSON format with the following structure:
{
  "deliverables": [
    {
      "name": "Deliverable Name",
      "description": "What this deliverable is",
      "type": "document|software|hardware|service|report|other",
      "due_date": "YYYY-MM-DD or relative date",
      "status": "planned|in_progress|completed|delayed|cancelled",
      "owner": "Who is responsible",
      "acceptance_criteria": "How we know it's done",
      "phase": "Which phase it belongs to",
      "source_document": "EXACT document title from AVAILABLE DOCUMENTS list above"
    }
  ]
}

Requirements:
- Include ALL deliverables mentioned (documents, software, reports, etc.)
- Include interim deliverables and final deliverables
- Extract due dates if mentioned
- Extract ownership if mentioned
- Associate with project phases if mentioned
- Infer status from context
- **source_document MUST match exactly** one of the document titles from AVAILABLE DOCUMENTS list
- Return ONLY valid JSON, no markdown or explanation`

      // Use generateWithFallback for automatic provider fallback and increased token limit
      // Note: Increased to 10000 to handle large documents with extensive deliverables (was truncating at ~10.7K chars)
      const response = await aiService.generateWithFallback({
        prompt,
        provider: options.aiProvider || 'openai',
        model: options.aiModel,
        temperature: 0.3,
        max_tokens: 10000 // Increased from 2500 to handle very large deliverables extractions
      }, ['openai', 'google', 'anthropic', 'mistral', 'groq'])

      const parsed = this.parseAIResponse(response.content)
      const deliverables = parsed.deliverables || []

      // Resolve source_document_id for each deliverable (STRICT: reject if missing)
      const validDeliverables: Deliverable[] = []
      let rejectedCount = 0
      
      deliverables.forEach((deliverable: any) => {
        const isValid = this.resolveSourceDocumentIdStrict(
          deliverable,
          documentMap,
          documents,
          'DELIVERABLES',
          deliverable.name || 'Unnamed Deliverable'
        )
        
        if (isValid) {
          validDeliverables.push(deliverable)
        } else {
          rejectedCount++
        }
      })

      if (rejectedCount > 0) {
        logger.warn(`[EXTRACTION-DELIVERABLES] REJECTED ${rejectedCount} deliverables without valid source_document_id (out of ${deliverables.length} total)`)
      }
      
      logger.info(`[EXTRACTION-DELIVERABLES] Extracted ${validDeliverables.length} deliverables with valid source_document_id (${rejectedCount} rejected)`)

      return validDeliverables
    } catch (error: unknown) {
      logger.error('[EXTRACTION-DELIVERABLES] Extraction failed', {
        error: error instanceof Error ? error.message : String(error)
      })
      return []
    }
  }

  /**
   * Extract scope items using AI
   */
  private async extractScopeItems(
    documents: Array<{ id: string; title: string; content: string; template_name?: string }>,
    projectId: string,
    options: { aiProvider?: string; aiModel?: string },
    documentMap: Map<string, string>,
    documentList: string
  ): Promise<ScopeItem[]> {
    try {
      logger.info('[EXTRACTION-SCOPE] Starting extraction')

      const documentContext = this.buildDocumentContext(documents)
      
      const prompt = `Analyze the following project documents and extract ALL scope items (both in-scope and out-of-scope).

${documentContext}

AVAILABLE DOCUMENTS (for source_document matching):
${documentList}

Extract scope items in JSON format with the following structure:
{
  "scope_items": [
    {
      "title": "Scope Item Title",
      "description": "Detailed description",
      "is_in_scope": true|false,
      "category": "Category (feature, function, module, etc.)",
      "justification": "Why it's in or out of scope",
      "priority": "must_have|should_have|could_have|wont_have",
      "source_document": "EXACT document title from AVAILABLE DOCUMENTS list above"
    }
  ]
}

Requirements:
- Include BOTH in-scope and out-of-scope items
- Extract scope boundaries clearly
- Include features, functions, modules that ARE included
- Include features, functions, modules that are explicitly EXCLUDED
- Classify using MoSCoW prioritization (Must/Should/Could/Won't have)
- Extract justification for scope decisions if mentioned
- **source_document MUST match exactly** one of the document titles from AVAILABLE DOCUMENTS list
- Return ONLY valid JSON, no markdown or explanation`

      // Use generateWithFallback for automatic provider fallback and increased token limit
      // Note: Increased to 12000 to handle very large documents with extensive scope analysis (40+ items)
      const response = await aiService.generateWithFallback({
        prompt,
        provider: options.aiProvider || 'openai',
        model: options.aiModel,
        temperature: 0.3,
        max_tokens: 12000 // Increased from 5000 to handle very large scope extractions (was truncating at ~23K chars)
      }, ['openai', 'google', 'anthropic', 'mistral', 'groq'])

      const parsed = this.parseAIResponse(response.content)
      const scopeItems = parsed.scope_items || []

      // Resolve source_document_id for each scope item (STRICT: reject if missing)
      const validScopeItems: ScopeItem[] = []
      let rejectedCount = 0
      
      scopeItems.forEach((item: any) => {
        const isValid = this.resolveSourceDocumentIdStrict(
          item,
          documentMap,
          documents,
          'SCOPE-ITEMS',
          item.title || item.item_name || 'Unnamed Scope Item'
        )
        
        if (isValid) {
          validScopeItems.push(item)
        } else {
          rejectedCount++
        }
      })

      if (rejectedCount > 0) {
        logger.warn(`[EXTRACTION-SCOPE-ITEMS] REJECTED ${rejectedCount} scope items without valid source_document_id (out of ${scopeItems.length} total)`)
      }
      
      logger.info(`[EXTRACTION-SCOPE-ITEMS] Extracted ${validScopeItems.length} scope items with valid source_document_id (${rejectedCount} rejected)`)

      return validScopeItems
    } catch (error: unknown) {
      logger.error('[EXTRACTION-SCOPE] Extraction failed', {
        error: error instanceof Error ? error.message : String(error)
      })
      return []
    }
  }

  /**
   * Extract activities using AI
   */
  private async extractActivities(
    documents: Array<{ id: string; title: string; content: string; template_name?: string }>,
    projectId: string,
    options: { aiProvider?: string; aiModel?: string },
    documentMap: Map<string, string>,
    documentList: string
  ): Promise<Activity[]> {
    try {
      logger.info('[EXTRACTION-ACTIVITIES] Starting extraction')

      const documentContext = this.buildDocumentContext(documents)
      
      const prompt = `Analyze the following project documents and extract ALL activities, tasks, and work packages mentioned.

${documentContext}

AVAILABLE DOCUMENTS (for source_document matching):
${documentList}

Extract activities in JSON format with the following structure:
{
  "activities": [
    {
      "name": "Activity Name",
      "description": "What this activity involves",
      "category": "Category (development, testing, planning, etc.)",
      "phase": "Which phase it belongs to",
      "start_date": "YYYY-MM-DD or relative date",
      "end_date": "YYYY-MM-DD or relative date",
      "duration": 5,
      "duration_unit": "days|weeks|months",
      "status": "planned|in_progress|completed|blocked|cancelled",
      "assigned_to": "Who is responsible",
      "dependencies": ["Activity 1", "Activity 2"],
      "deliverable": "Related deliverable",
      "effort_estimate": 40,
      "effort_unit": "hours|days|story_points",
      "source_document": "EXACT document title from AVAILABLE DOCUMENTS list above"
    }
  ]
}

Requirements:
- Include ALL activities, tasks, and work packages mentioned
- Include WBS (Work Breakdown Structure) elements
- Extract activity timelines if mentioned
- Extract resource assignments if mentioned
- Extract dependencies between activities
- Link to deliverables if mentioned
- Extract effort estimates if mentioned
- Infer status from context (future = planned, ongoing = in_progress, past = completed)
- **source_document MUST match exactly** one of the document titles from AVAILABLE DOCUMENTS list
- Return ONLY valid JSON, no markdown or explanation`

      // Use generateWithFallback for automatic provider fallback and increased token limit
      // Note: Increased to 10000 to handle large documents with extensive activity lists (was truncating at ~12.7K chars)
      const response = await aiService.generateWithFallback({
        prompt,
        provider: options.aiProvider || 'openai',
        model: options.aiModel,
        temperature: 0.3,
        max_tokens: 10000 // Increased from 3500 to handle very large activities extractions
      }, ['openai', 'google', 'anthropic', 'mistral', 'groq'])

      const parsed = this.parseAIResponse(response.content)
      const activities = parsed.activities || []

      // Resolve source_document_id for each activity (STRICT: reject if missing)
      const validActivities: Activity[] = []
      let rejectedCount = 0
      
      activities.forEach((activity: any) => {
        const isValid = this.resolveSourceDocumentIdStrict(
          activity,
          documentMap,
          documents,
          'ACTIVITIES',
          activity.name || 'Unnamed Activity'
        )
        
        if (isValid) {
          validActivities.push(activity)
        } else {
          rejectedCount++
        }
      })

      if (rejectedCount > 0) {
        logger.warn(`[EXTRACTION-ACTIVITIES] REJECTED ${rejectedCount} activities without valid source_document_id (out of ${activities.length} total)`)
      }
      
      logger.info(`[EXTRACTION-ACTIVITIES] Extracted ${validActivities.length} activities with valid source_document_id (${rejectedCount} rejected)`)

      return validActivities
    } catch (error: unknown) {
      logger.error('[EXTRACTION-ACTIVITIES] Extraction failed', {
        error: error instanceof Error ? error.message : String(error)
      })
      return []
    }
  }

  /**
   * Extract team agreements for PMBOK 8 Team Performance Domain
   */
  private async extractTeamAgreements(
    documents: Array<{ id: string; title: string; content: string; template_name?: string }>,
    projectId: string,
    options: { aiProvider?: string; aiModel?: string },
    documentMap: Map<string, string>,
    documentList: string
  ): Promise<TeamAgreement[]> {
    try {
      logger.info('[EXTRACTION-TEAM-AGREEMENTS] Starting extraction')

      const documentContext = this.buildDocumentContext(documents)

      const prompt = `You are analyzing project documentation to extract **Team Agreements** aligned with the PMBOK 8 **Team Performance Domain**.

SOURCE DOCUMENTS:
${documentContext}

AVAILABLE DOCUMENTS (for source_document matching):
${documentList}

Use the following JSON schema exactly:
{
  "team_agreements": [
    {
      "title": "Agreement title",
      "description": "Summary of the agreement in Markdown",
      "category": "working_hours|communication|decision_making|conflict_resolution|quality_standards|meeting_norms|code_of_conduct|collaboration_tools|response_times|knowledge_sharing|other",
      "agreed_by": ["Name or role"],
      "facilitated_by": "Name or role",
      "effective_date": "YYYY-MM-DD or null",
      "review_frequency": "weekly|monthly|quarterly|annually|as_needed|null",
      "next_review_date": "YYYY-MM-DD or null",
      "status": "draft|active|under_review|revised|deprecated",
      "adherence_score": 0-10 number,
      "violations_count": integer,
      "last_violation_date": "YYYY-MM-DD or null",
      "notes": "Additional context or null",
      "source_document": "EXACT document title from AVAILABLE DOCUMENTS list above"
    }
  ]
}

Rules:
- Capture explicit or implied team working agreements, norms, or ground rules.
- Use arrays for agreed_by even if a single name is mentioned.
- If information is missing, use null or an empty array instead of inventing data.
- **source_document MUST match exactly** one of the document titles from AVAILABLE DOCUMENTS list
- Return ONLY valid JSON.`

      // Use generateWithFallback for automatic provider fallback and increased token limit
      const response = await aiService.generateWithFallback({
        prompt,
        provider: options.aiProvider || 'openai',
        model: options.aiModel,
        temperature: 0.25,
        max_tokens: 4000 // Increased from 2500 to handle large documents with many team agreements
      }, ['openai', 'google', 'anthropic', 'mistral', 'groq'])

      const parsed = this.parseAIResponse(response.content)
      const agreements = (parsed.team_agreements || []).map((agreement: any) => ({
        ...agreement,
        agreed_by: this.ensureStringArray(agreement?.agreed_by),
        adherence_score: this.safeNumber(agreement?.adherence_score),
        violations_count: this.safeInteger(agreement?.violations_count)
      }))

      // Resolve source_document_id for each team agreement (STRICT: reject if missing)
      const validAgreements: TeamAgreement[] = []
      let rejectedCount = 0
      
      agreements.forEach((agreement: any) => {
        const isValid = this.resolveSourceDocumentIdStrict(
          agreement,
          documentMap,
          documents,
          'TEAM-AGREEMENTS',
          agreement.title || 'Unnamed Team Agreement'
        )
        
        if (isValid) {
          validAgreements.push(agreement)
        } else {
          rejectedCount++
        }
      })

      if (rejectedCount > 0) {
        logger.warn(`[EXTRACTION-TEAM-AGREEMENTS] REJECTED ${rejectedCount} team agreements without valid source_document_id (out of ${agreements.length} total)`)
      }
      
      logger.info(`[EXTRACTION-TEAM-AGREEMENTS] Extracted ${validAgreements.length} team agreements with valid source_document_id (${rejectedCount} rejected)`)

      return validAgreements
    } catch (error: unknown) {
      logger.error('[EXTRACTION-TEAM-AGREEMENTS] Extraction failed', {
        error: error instanceof Error ? error.message : String(error)
      })
      return []
    }
  }

  /**
   * Extract development approaches for PMBOK 8 Development Approach & Life Cycle Domain
   */
  /**
   * Extract development approach metadata (TASK-90)
   * Returns a single DevelopmentApproach object (one per project)
   */
  private async extractDevelopmentApproaches(
    documents: Array<{ id: string; title: string; content: string; template_name?: string }>,
    projectId: string,
    options: { aiProvider?: string; aiModel?: string },
    documentMap: Map<string, string>,
    documentList: string
  ): Promise<DevelopmentApproach[]> {
    try {
      logger.info('[EXTRACTION-DEVELOPMENT-APPROACH] Starting extraction (TASK-90)')

      const documentContext = this.buildDocumentContext(documents)

      const prompt = `You are analyzing project documents to extract DEVELOPMENT APPROACH - the methodology selected for this project.
This is project-level metadata (ONE record per project).

Look for:
- "Methodology: Agile/Scrum/Waterfall/Hybrid"
- "Development approach: Predictive/Adaptive"
- "Tailoring justification" or "Why we chose [methodology]"
- Life cycle phases mentioned
- Sprint/iteration lengths
- Delivery cadence (single release vs incremental)
- Governance approach (formal gates, agile ceremonies)
- Context factors: uncertainty level, requirements stability, team experience

SOURCE DOCUMENTS:
${documentContext}

AVAILABLE DOCUMENTS (for source_document matching):
${documentList}

Extract as a single JSON object (not array - one per project):

{
  "approach": "predictive" | "adaptive" | "hybrid" | "incremental" | "iterative",
  "methodology": "waterfall" | "scrum" | "kanban" | "lean" | "safe" | "prince2" | "custom" | null,
  "justification": "Full explanation of why this approach was selected (Markdown format)",
  "uncertainty_level": "low" | "medium" | "high" | null,
  "requirements_stability": "stable" | "evolving" | "uncertain" | null,
  "stakeholder_engagement_model": "periodic" | "continuous" | null,
  "delivery_cadence": "single" | "iterative" | "incremental" | "continuous" | null,
  "organizational_maturity": "low" | "medium" | "high" | null,
  "team_experience_level": "junior" | "mixed" | "senior" | null,
  "regulatory_constraints": boolean | null,
  "life_cycle_phases": ["Phase 1 name", "Phase 2 name", ...],
  "iteration_length": number (if iterative) | null,
  "iteration_unit": "days" | "weeks" | null,
  "governance_approach": "lightweight" | "standard" | "formal" | null,
  "review_gates": ["Gate 1", "Gate 2", ...],
  "tailoring_decisions": [
    {
      "area": "What was tailored",
      "standard_process": "Normal org process",
      "tailored_process": "How it was adapted",
      "justification": "Why"
    }
  ]
}

Guidance:
- Return a single object (not array) - this is project-level metadata
- Use null for unknown values
- Use arrays for phases, review_gates, tailoring_decisions
- justification must be comprehensive Markdown explaining WHY the approach was chosen
- If no methodology information found, return null

Return JSON object only. Return null if no methodology information found.`

      // Log the full prompt for debugging
      logger.info('[EXTRACTION-DEVELOPMENT-APPROACH] Full prompt being sent to AI', {
        promptLength: prompt.length,
        promptPreview: prompt.substring(0, 500),
        fullPrompt: prompt, // Full prompt for debugging
        documentCount: documents.length,
        totalDocumentChars: documents.reduce((sum, doc) => sum + (doc.content?.length || 0), 0)
      })

      // Use generateWithFallback for automatic provider fallback if requested provider is unavailable
      // Note: max_tokens increased to 5000 to accommodate comprehensive justification field (markdown format)
      const response = await aiService.generateWithFallback({
        prompt,
        provider: options.aiProvider || 'openai',
        model: options.aiModel,
        temperature: 0.3,
        max_tokens: 5000 // Increased from 2500 to handle long justification markdown content
      }, ['openai', 'google', 'anthropic', 'mistral', 'groq'])

      // Log the raw response BEFORE any parsing
      logger.info('[EXTRACTION-DEVELOPMENT-APPROACH] Raw AI response received', {
        providerUsed: (response as any).providerUsed || options.aiProvider || 'unknown',
        responseLength: response.content.length,
        responsePreview: response.content.substring(0, 500),
        fullResponse: response.content, // Full raw response for debugging
        usage: response.usage,
        hasCodeBlocks: response.content.includes('```'),
        startsWithJson: response.content.trim().startsWith('{'),
        startsWithCodeBlock: response.content.trim().startsWith('```')
      })

      // Validate AI response - throw error to trigger retry/fallback
      // Note: response from generateWithFallback includes providerUsed, but validateAIResponse expects standard format
      const standardResponse = {
        content: response.content,
        usage: response.usage
      }
      this.validateAIResponse(standardResponse, 'development_approach', options)
      
      // Log which provider was actually used
      logger.info(`[EXTRACTION-DEVELOPMENT-APPROACH] Used provider: ${(response as any).providerUsed || options.aiProvider || 'unknown'}`)

      const parsed = this.parseAIResponse(response.content)
      
      // Log parsing result
      logger.info('[EXTRACTION-DEVELOPMENT-APPROACH] Parsing result', {
        parsedType: typeof parsed,
        isArray: Array.isArray(parsed),
        parsedKeys: parsed && typeof parsed === 'object' ? Object.keys(parsed) : [],
        parsedPreview: parsed ? JSON.stringify(parsed).substring(0, 500) : 'null'
      })
      
      // Log if parsing returned empty object
      if (!parsed || Object.keys(parsed).length === 0 || parsed === null) {
        logger.warn('[EXTRACTION-DEVELOPMENT-APPROACH] AI response parsed to empty object or null', {
          contentLength: response.content.length,
          contentPreview: response.content.substring(0, 500)
        })
        return []
      }
      
      // Handle both single object and array responses (for backward compatibility)
      let approach: any
      if (Array.isArray(parsed.development_approaches)) {
        // Legacy format - take first one
        approach = parsed.development_approaches[0]
      } else if (parsed.approach) {
        // New format - single object
        approach = parsed
      } else {
        logger.warn('[EXTRACTION-DEVELOPMENT-APPROACH] No development approach found in response')
        return []
      }

      if (!approach || !approach.approach) {
        logger.warn('[EXTRACTION-DEVELOPMENT-APPROACH] Invalid approach object')
        return []
      }

      // Normalize the response
      const normalized: DevelopmentApproach = {
        approach: approach.approach,
        methodology: approach.methodology || approach.framework || null,
        justification: approach.justification || approach.tailoring_decisions_text || 'No justification provided',
        uncertainty_level: approach.uncertainty_level || null,
        requirements_stability: approach.requirements_stability || null,
        stakeholder_engagement_model: approach.stakeholder_engagement_model || null,
        delivery_cadence: approach.delivery_cadence || null,
        organizational_maturity: approach.organizational_maturity || null,
        team_experience_level: approach.team_experience_level || null,
        regulatory_constraints: approach.regulatory_constraints || false,
        life_cycle_phases: this.ensureStringArray(approach.life_cycle_phases || (approach.lifecycle_model ? [approach.lifecycle_model] : [])),
        iteration_length: this.safeInteger(approach.iteration_length || approach.iteration_length_weeks ? (approach.iteration_length_weeks * 7) : null),
        iteration_unit: approach.iteration_unit || (approach.iteration_length_weeks ? 'weeks' : null),
        governance_approach: approach.governance_approach || null,
        review_gates: this.ensureStringArray(approach.review_gates),
        tailoring_decisions: Array.isArray(approach.tailoring_decisions) ? approach.tailoring_decisions : [],
        // Legacy fields for backward compatibility
        framework: approach.framework || approach.methodology || null,
        lifecycle_model: approach.lifecycle_model || null,
        iteration_length_weeks: this.safeInteger(approach.iteration_length_weeks || (approach.iteration_length && approach.iteration_unit === 'weeks' ? approach.iteration_length / 7 : null)),
        ceremonies: this.ensureStringArray(approach.ceremonies),
        artifacts: this.ensureStringArray(approach.artifacts),
        tailoring_decisions_text: approach.tailoring_decisions_text || (Array.isArray(approach.tailoring_decisions) ? approach.tailoring_decisions.map((td: any) => `${td.area}: ${td.justification}`).join('\n') : null),
        governance_notes: approach.governance_notes || null,
        source_document: approach.source_document || null
      }

      // Resolve source_document_id (STRICT: reject if missing)
      const isValid = this.resolveSourceDocumentIdStrict(
        normalized,
        documentMap,
        documents,
        'DEVELOPMENT-APPROACHES',
        normalized.approach || 'Unnamed Development Approach'
      )

      if (!isValid) {
        logger.warn(`[EXTRACTION-DEVELOPMENT-APPROACHES] REJECTED development approach "${normalized.approach || 'Unnamed'}" - no valid source_document_id`)
        return []
      }

      logger.info(`[EXTRACTION-DEVELOPMENT-APPROACH] Extracted development approach: ${normalized.approach} (${normalized.methodology || 'N/A'})`)

      // Return as array (for consistency with other extraction methods) but should only have one item
      return [normalized]
    } catch (error: unknown) {
      logger.error('[EXTRACTION-DEVELOPMENT-APPROACH] Extraction failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
      // Re-throw to trigger Bull retry and provider fallback
      throw error
    }
  }

  /**
   * Extract iterations/sprints/releases
   */
  private async extractProjectIterations(
    documents: Array<{ id: string; title: string; content: string; template_name?: string }>,
    projectId: string,
    options: { aiProvider?: string; aiModel?: string },
    documentMap: Map<string, string>,
    documentList: string
  ): Promise<ProjectIteration[]> {
    try {
      logger.info('[EXTRACTION-ITERATIONS] Starting extraction')

      const documentContext = this.buildDocumentContext(documents)

      const prompt = `Extract **iterations / sprints / releases** described in the documentation.

SOURCE DOCUMENTS:
${documentContext}

AVAILABLE DOCUMENTS (for source_document matching):
${documentList}

Output JSON:
{
  "project_iterations": [
    {
      "name": "Iteration / Sprint name",
      "iteration_type": "sprint|iteration|program_increment|release|phase",
      "sequence_number": integer or null,
      "start_date": "YYYY-MM-DD or null",
      "end_date": "YYYY-MM-DD or null",
      "goals": ["Goal 1", "Goal 2"],
      "planned_story_points": integer or null,
      "completed_story_points": integer or null,
      "velocity": integer or null,
      "status": "planned|active|completed|cancelled",
      "retrospective_summary": "Markdown summary or null",
      "impediments": ["Impediment 1"],
      "source_document": "EXACT document title from AVAILABLE DOCUMENTS list above"
    }
  ]
}

Rules:
- Include schedule-based iterations (sprints, increments, phases).
- Convert backlog goals or OKRs into the goals array.
- Use null for unknown numeric values, and arrays for multi-item fields.
- **source_document MUST match exactly** one of the document titles from AVAILABLE DOCUMENTS list
- Return ONLY valid JSON.`

      const response = await aiService.generate({
        prompt,
        provider: options.aiProvider!,
        model: options.aiModel,
        temperature: 0.2,
        max_tokens: 2600
      })

      const parsed = this.parseAIResponse(response.content)
      const iterations = (parsed.project_iterations || []).map((iteration: any) => ({
        ...iteration,
        goals: this.ensureStringArray(iteration?.goals),
        planned_story_points: this.safeInteger(iteration?.planned_story_points),
        completed_story_points: this.safeInteger(iteration?.completed_story_points),
        velocity: this.safeInteger(iteration?.velocity),
        impediments: this.ensureStringArray(iteration?.impediments)
      }))

      // Resolve source_document_id for each iteration (STRICT: reject if missing)
      const validIterations: ProjectIteration[] = []
      let rejectedCount = 0
      
      iterations.forEach((iteration: any) => {
        const isValid = this.resolveSourceDocumentIdStrict(
          iteration,
          documentMap,
          documents,
          'PROJECT-ITERATIONS',
          iteration.name || 'Unnamed Iteration'
        )
        
        if (isValid) {
          validIterations.push(iteration)
        } else {
          rejectedCount++
        }
      })

      if (rejectedCount > 0) {
        logger.warn(`[EXTRACTION-PROJECT-ITERATIONS] REJECTED ${rejectedCount} iterations without valid source_document_id (out of ${iterations.length} total)`)
      }
      
      logger.info(`[EXTRACTION-PROJECT-ITERATIONS] Extracted ${validIterations.length} iterations with valid source_document_id (${rejectedCount} rejected)`)

      return validIterations
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      const errorStack = error instanceof Error ? error.stack : undefined
      logger.error('[EXTRACTION-ITERATIONS] Extraction failed', {
        error: errorMessage,
        stack: errorStack,
        projectId,
        provider: options.aiProvider,
        model: options.aiModel,
        documentCount: documents.length
      })
      // Return empty array instead of throwing to allow partial success
      // The parent job will track this as a failed entity type
      return []
    }
  }

  /**
   * Extract work items for Project Work Performance Domain
   */
  private async extractWorkItems(
    documents: Array<{ id: string; title: string; content: string; template_name?: string }>,
    projectId: string,
    options: { aiProvider?: string; aiModel?: string },
    documentMap: Map<string, string>,
    documentList: string
  ): Promise<WorkItemRecord[]> {
    try {
      logger.info('[EXTRACTION-WORK-ITEMS] Starting extraction')

      const documentContext = this.buildDocumentContext(documents)

      const prompt = `Identify **work items / tasks / backlog items** with effort tracking details.

SOURCE DOCUMENTS:
${documentContext}

AVAILABLE DOCUMENTS (for source_document matching):
${documentList}

JSON schema:
{
  "work_items": [
    {
      "name": "Work item title",
      "description": "Markdown summary",
      "activity_name": "Linked activity name if mentioned",
      "assigned_to": "Person or role",
      "estimated_hours": number or null,
      "actual_hours": number or null,
      "progress_percentage": number 0-100 or null,
      "status": "todo|in_progress|review|done|blocked",
      "blockers": ["Blocker 1"],
      "completed_date": "YYYY-MM-DD or null",
      "source_document": "EXACT document title from AVAILABLE DOCUMENTS list above"
    }
  ]
}

Guidelines:
- Include items with measurable effort or progress tracking.
- Convert percentages like "65%" to numbers.
- Use arrays for blockers even if single.
- **source_document MUST match exactly** one of the document titles from AVAILABLE DOCUMENTS list
- Return ONLY valid JSON.`

      const response = await aiService.generate({
        prompt,
        provider: options.aiProvider!,
        model: options.aiModel,
        temperature: 0.25,
        max_tokens: 2600
      })

      const parsed = this.parseAIResponse(response.content)
      const workItems = (parsed.work_items || []).map((item: any) => ({
        ...item,
        estimated_hours: this.safeNumber(item?.estimated_hours),
        actual_hours: this.safeNumber(item?.actual_hours),
        progress_percentage: this.safeNumber(item?.progress_percentage),
        blockers: this.ensureStringArray(item?.blockers)
      }))

      // Resolve source_document_id for each work item (STRICT: reject if missing)
      const validWorkItems: WorkItemRecord[] = []
      let rejectedCount = 0
      
      workItems.forEach((item: any) => {
        const isValid = this.resolveSourceDocumentIdStrict(
          item,
          documentMap,
          documents,
          'WORK-ITEMS',
          item.name || 'Unnamed Work Item'
        )
        
        if (isValid) {
          validWorkItems.push(item)
        } else {
          rejectedCount++
        }
      })

      if (rejectedCount > 0) {
        logger.warn(`[EXTRACTION-WORK-ITEMS] REJECTED ${rejectedCount} work items without valid source_document_id (out of ${workItems.length} total)`)
      }
      
      logger.info(`[EXTRACTION-WORK-ITEMS] Extracted ${validWorkItems.length} work items with valid source_document_id (${rejectedCount} rejected)`)

      return validWorkItems
    } catch (error: unknown) {
      logger.error('[EXTRACTION-WORK-ITEMS] Extraction failed', {
        error: error instanceof Error ? error.message : String(error)
      })
      return []
    }
  }

  /**
   * Extract capacity plans (staffing plans, allocations)
   */
  private async extractCapacityPlans(
    documents: Array<{ id: string; title: string; content: string; template_name?: string }>,
    projectId: string,
    options: { aiProvider?: string; aiModel?: string },
    documentMap: Map<string, string>,
    documentList: string
  ): Promise<CapacityPlan[]> {
    try {
      logger.info('[EXTRACTION-CAPACITY] Starting extraction')

      const documentContext = this.buildDocumentContext(documents)

      const prompt = `Extract **capacity plans / staffing allocations** for team members.

SOURCE DOCUMENTS:
${documentContext}

AVAILABLE DOCUMENTS (for source_document matching):
${documentList}

JSON format:
{
  "capacity_plans": [
    {
      "team_member": "Name or role",
      "role": "Role description",
      "period_start": "YYYY-MM-DD",
      "period_end": "YYYY-MM-DD",
      "available_hours": number or null,
      "allocated_hours": number or null,
      "utilization_percentage": number or null,
      "notes": "Markdown notes or null",
      "source_document": "EXACT document title from AVAILABLE DOCUMENTS list above"
    }
  ]
}

Rules:
- Always include period_start and period_end (estimate if only month provided; use first/last day of month).
- Convert utilization percentages (e.g., 75%) to numeric values.
- Use null for unknown numeric values.
- **source_document MUST match exactly** one of the document titles from AVAILABLE DOCUMENTS list
- Return ONLY valid JSON.`

      // Use generateWithFallback for automatic provider fallback and increased token limit
      const response = await aiService.generateWithFallback({
        prompt,
        provider: options.aiProvider || 'openai',
        model: options.aiModel,
        temperature: 0.25,
        max_tokens: 4000 // Increased from 2300 to handle large documents
      }, ['openai', 'google', 'anthropic', 'mistral', 'groq'])

      const parsed = this.parseAIResponse(response.content)
      const capacityPlans = (parsed.capacity_plans || []).map((plan: any) => ({
        ...plan,
        available_hours: this.safeNumber(plan?.available_hours),
        allocated_hours: this.safeNumber(plan?.allocated_hours),
        utilization_percentage: this.safeNumber(plan?.utilization_percentage)
      }))

      // Resolve source_document_id for each capacity plan (STRICT: reject if missing)
      const validCapacityPlans: CapacityPlan[] = []
      let rejectedCount = 0
      
      capacityPlans.forEach((plan: any) => {
        const isValid = this.resolveSourceDocumentIdStrict(
          plan,
          documentMap,
          documents,
          'CAPACITY-PLANS',
          plan.team_member || 'Unnamed Capacity Plan'
        )
        
        if (isValid) {
          validCapacityPlans.push(plan)
        } else {
          rejectedCount++
        }
      })

      if (rejectedCount > 0) {
        logger.warn(`[EXTRACTION-CAPACITY-PLANS] REJECTED ${rejectedCount} capacity plans without valid source_document_id (out of ${capacityPlans.length} total)`)
      }
      
      logger.info(`[EXTRACTION-CAPACITY-PLANS] Extracted ${validCapacityPlans.length} capacity plans with valid source_document_id (${rejectedCount} rejected)`)

      return validCapacityPlans
    } catch (error: unknown) {
      logger.error('[EXTRACTION-CAPACITY] Extraction failed', {
        error: error instanceof Error ? error.message : String(error)
      })
      return []
    }
  }

  /**
   * Extract measurement actuals for success criteria
   */
  private async extractPerformanceMeasurements(
    documents: Array<{ id: string; title: string; content: string; template_name?: string }>,
    projectId: string,
    options: { aiProvider?: string; aiModel?: string },
    documentMap: Map<string, string>,
    documentList: string
  ): Promise<PerformanceMeasurement[]> {
    try {
      logger.info('[EXTRACTION-PERFORMANCE-MEASUREMENTS] Starting extraction')

      const documentContext = this.buildDocumentContext(documents)

      const prompt = `Extract **actual performance measurements** for success criteria / KPIs.

SOURCE DOCUMENTS:
${documentContext}

AVAILABLE DOCUMENTS (for source_document matching):
${documentList}

JSON schema:
{
  "performance_measurements": [
    {
      "success_criterion_name": "Name of criterion being measured (MUST match existing success criterion name exactly)",
      "measurement_date": "YYYY-MM-DD (REQUIRED - use document date if measurement date not specified)",
      "actual_value": number or null,
      "target_value": number or null,
      "units": "Units (%, days, USD, etc.) or null",
      "variance": number or null,
      "variance_percentage": number or null,
      "trend": "improving|stable|declining|null",
      "status": "on_track|at_risk|off_track",
      "notes": "Markdown context or null",
      "source_document": "EXACT document title from AVAILABLE DOCUMENTS list above"
    }
  ]
}

Guidelines:
- **measurement_date is REQUIRED**: Extract the date when measurement was taken, or use document date if not specified
- **source_document MUST match exactly** one of the document titles from AVAILABLE DOCUMENTS list
- Extract BOTH actual measurements (historical data) AND target/planned measurements (future goals)
- Convert values to numbers when possible (strip % or currency symbols)
- If only textual comparison exists (e.g., "ahead by 5%"), compute variance when possible
- Use null where numbers aren't available
- Return ONLY valid JSON`

      const response = await aiService.generate({
        prompt,
        provider: options.aiProvider!,
        model: options.aiModel,
        temperature: 0.2,
        max_tokens: 8000 // Increased for large performance measurement extractions (was 2600)
      })

      // Check if response was truncated (common with large extractions)
      const responseContent = response.content || ''
      const isTruncated = responseContent.length > 0 && (
        !responseContent.trim().endsWith('}') && 
        !responseContent.trim().endsWith(']') &&
        !responseContent.includes('```') // If it's in a code block, check for closing marker
      )
      
      if (isTruncated) {
        logger.warn('[EXTRACTION-PERFORMANCE-MEASUREMENTS] Response appears truncated - may have incomplete data', {
          responseLength: responseContent.length,
          lastChars: responseContent.substring(Math.max(0, responseContent.length - 100))
        })
      }

      const parsed = this.parseAIResponse(response.content)
      const measurements = (parsed.performance_measurements || []).map((item: any) => ({
        ...item,
        actual_value: this.safeNumber(item?.actual_value),
        target_value: this.safeNumber(item?.target_value),
        variance: this.safeNumber(item?.variance),
        variance_percentage: this.safeNumber(item?.variance_percentage)
      }))

      // Resolve source_document_id for each measurement (STRICT: reject if missing)
      const validMeasurements: PerformanceMeasurement[] = []
      let rejectedCount = 0
      
      measurements.forEach((measurement: any) => {
        const isValid = this.resolveSourceDocumentIdStrict(
          measurement,
          documentMap,
          documents,
          'PERFORMANCE-MEASUREMENTS',
          measurement.success_criterion_name || 'Unnamed Measurement'
        )
        
        if (isValid) {
          validMeasurements.push(measurement)
        } else {
          rejectedCount++
        }
      })

      if (rejectedCount > 0) {
        logger.warn(`[EXTRACTION-PERFORMANCE-MEASUREMENTS] REJECTED ${rejectedCount} measurements without valid source_document_id (out of ${measurements.length} total)`)
      }
      
      logger.info(`[EXTRACTION-PERFORMANCE-MEASUREMENTS] Extracted ${validMeasurements.length} measurements with valid source_document_id (${rejectedCount} rejected)`)

      return validMeasurements
    } catch (error: unknown) {
      logger.error('[EXTRACTION-PERFORMANCE-MEASUREMENTS] Extraction failed', {
        error: error instanceof Error ? error.message : String(error)
      })
      return []
    }
  }

  /**
   * Extract earned value metrics
   */
  private async extractEarnedValueMetrics(
    documents: Array<{ id: string; title: string; content: string; template_name?: string }>,
    projectId: string,
    options: { aiProvider?: string; aiModel?: string },
    documentMap: Map<string, string>,
    documentList: string
  ): Promise<EarnedValueMetric[]> {
    try {
      logger.info('[EXTRACTION-EVM] Starting extraction')

      const documentContext = this.buildDocumentContext(documents)

      const prompt = `Identify **Earned Value Management (EVM)** metrics reported in the documentation.

SOURCE DOCUMENTS:
${documentContext}

AVAILABLE DOCUMENTS (for source_document matching):
${documentList}

Expected JSON:
{
  "earned_value_metrics": [
    {
      "measurement_date": "YYYY-MM-DD",
      "planned_value": number or null,
      "earned_value": number or null,
      "actual_cost": number or null,
      "schedule_variance": number or null,
      "cost_variance": number or null,
      "schedule_performance_index": number or null,
      "cost_performance_index": number or null,
      "estimate_at_completion": number or null,
      "estimate_to_complete": number or null,
      "notes": "Markdown commentary or null",
      "source_document": "EXACT document title from AVAILABLE DOCUMENTS list above"
    }
  ]
}

Rules:
- Convert currency strings to numeric values (strip $ or commas).
- Provide null when a metric isn't available rather than fabricating it.
- **source_document MUST match exactly** one of the document titles from AVAILABLE DOCUMENTS list
- Return ONLY valid JSON.`

      const response = await aiService.generate({
        prompt,
        provider: options.aiProvider!,
        model: options.aiModel,
        temperature: 0.2,
        max_tokens: 2500
      })

      const parsed = this.parseAIResponse(response.content)
      const evm = (parsed.earned_value_metrics || []).map((metric: any) => ({
        ...metric,
        planned_value: this.safeNumber(metric?.planned_value),
        earned_value: this.safeNumber(metric?.earned_value),
        actual_cost: this.safeNumber(metric?.actual_cost),
        schedule_variance: this.safeNumber(metric?.schedule_variance),
        cost_variance: this.safeNumber(metric?.cost_variance),
        schedule_performance_index: this.safeNumber(metric?.schedule_performance_index),
        cost_performance_index: this.safeNumber(metric?.cost_performance_index),
        estimate_at_completion: this.safeNumber(metric?.estimate_at_completion),
        estimate_to_complete: this.safeNumber(metric?.estimate_to_complete)
      }))

      // Resolve source_document_id for each EVM metric (STRICT: reject if missing)
      const validEVM: EarnedValueMetric[] = []
      let rejectedCount = 0
      
      evm.forEach((metric: any) => {
        const isValid = this.resolveSourceDocumentIdStrict(
          metric,
          documentMap,
          documents,
          'EARNED-VALUE-METRICS',
          `EVM Metric ${metric.measurement_date || 'Unknown Date'}`
        )
        
        if (isValid) {
          validEVM.push(metric)
        } else {
          rejectedCount++
        }
      })

      if (rejectedCount > 0) {
        logger.warn(`[EXTRACTION-EARNED-VALUE-METRICS] REJECTED ${rejectedCount} EVM metrics without valid source_document_id (out of ${evm.length} total)`)
      }
      
      logger.info(`[EXTRACTION-EARNED-VALUE-METRICS] Extracted ${validEVM.length} EVM metrics with valid source_document_id (${rejectedCount} rejected)`)

      return validEVM
    } catch (error: unknown) {
      logger.error('[EXTRACTION-EVM] Extraction failed', {
        error: error instanceof Error ? error.message : String(error)
      })
      return []
    }
  }

  /**
   * Extract opportunity records (positive risks)
   */
  private async extractOpportunities(
    documents: Array<{ id: string; title: string; content: string; template_name?: string }>,
    projectId: string,
    options: { aiProvider?: string; aiModel?: string },
    documentMap: Map<string, string>,
    documentList: string
  ): Promise<OpportunityRecord[]> {
    try {
      logger.info('[EXTRACTION-OPPORTUNITIES] Starting extraction')

      const documentContext = this.buildDocumentContext(documents)

      const prompt = `Extract **opportunities (positive risks)** mentioned in the documentation.

SOURCE DOCUMENTS:
${documentContext}

AVAILABLE DOCUMENTS (for source_document matching):
${documentList}

JSON schema:
{
  "opportunities": [
    {
      "title": "Opportunity name",
      "description": "Markdown description",
      "category": "Strategic, Technical, Market, etc.",
      "probability": "very_high|high|medium|low|very_low",
      "benefit_level": "very_high|high|medium|low|very_low",
      "exploitation_strategy": "Plan to realize the opportunity",
      "owner": "Person or role",
      "status": "identified|planned|exploiting|realized|missed",
      "expected_benefit": number or null,
      "trigger_conditions": "What triggers action",
      "source_document": "EXACT document title from AVAILABLE DOCUMENTS list above"
    }
  ]
}

Rules:
- Map qualitative terms to the enum values. For example "moderate" -> medium.
- If quantitative benefit (e.g., $200k) is mentioned, convert to number.
- **source_document MUST match exactly** one of the document titles from AVAILABLE DOCUMENTS list
- Return ONLY valid JSON.`

      // Use generateWithFallback for automatic provider fallback and increased token limit
      const response = await aiService.generateWithFallback({
        prompt,
        provider: options.aiProvider || 'openai',
        model: options.aiModel,
        temperature: 0.25,
        max_tokens: 4000 // Increased from 2400 to handle large documents with many opportunities
      }, ['openai', 'google', 'anthropic', 'mistral', 'groq'])

      const parsed = this.parseAIResponse(response.content)
      const opportunities = (parsed.opportunities || []).map((item: any) => ({
        ...item,
        expected_benefit: this.safeNumber(item?.expected_benefit)
      }))

      // Resolve source_document_id for each opportunity (STRICT: reject if missing)
      const validOpportunities: OpportunityRecord[] = []
      let rejectedCount = 0
      
      opportunities.forEach((opportunity: any) => {
        const isValid = this.resolveSourceDocumentIdStrict(
          opportunity,
          documentMap,
          documents,
          'OPPORTUNITIES',
          opportunity.title || opportunity.name || 'Unnamed Opportunity'
        )
        
        if (isValid) {
          validOpportunities.push(opportunity)
        } else {
          rejectedCount++
        }
      })

      if (rejectedCount > 0) {
        logger.warn(`[EXTRACTION-OPPORTUNITIES] REJECTED ${rejectedCount} opportunities without valid source_document_id (out of ${opportunities.length} total)`)
      }
      
      logger.info(`[EXTRACTION-OPPORTUNITIES] Extracted ${validOpportunities.length} opportunities with valid source_document_id (${rejectedCount} rejected)`)

      return validOpportunities
    } catch (error: unknown) {
      logger.error('[EXTRACTION-OPPORTUNITIES] Extraction failed', {
        error: error instanceof Error ? error.message : String(error)
      })
      return []
    }
  }

  /**
   * Extract risk response records
   */
  private async extractRiskResponses(
    documents: Array<{ id: string; title: string; content: string; template_name?: string }>,
    projectId: string,
    options: { aiProvider?: string; aiModel?: string },
    documentMap: Map<string, string>,
    documentList: string
  ): Promise<RiskResponseRecord[]> {
    try {
      logger.info('[EXTRACTION-RISK-RESPONSES] Starting extraction')

      const documentContext = this.buildDocumentContext(documents)

      const prompt = `Extract **risk response actions** described in the documentation.

SOURCE DOCUMENTS:
${documentContext}

AVAILABLE DOCUMENTS (for source_document matching):
${documentList}

JSON structure:
{
  "risk_responses": [
    {
      "risk_title": "Name of the risk being addressed",
      "response_date": "YYYY-MM-DD or null",
      "action_taken": "Markdown summary of response actions",
      "effectiveness": "effective|partially_effective|ineffective",
      "cost_of_response": number or null,
      "residual_risk_level": "very_high|high|medium|low|very_low",
      "owner": "Person or role responsible",
      "notes": "Additional context or null",
      "source_document": "EXACT document title from AVAILABLE DOCUMENTS list above"
    }
  ]
}

Guidelines:
- Include both preventative and corrective actions.
- Use null for numeric values that are not given.
- Map qualitative assessments (e.g., "moderate") to the nearest enum.
- **source_document MUST match exactly** one of the document titles from AVAILABLE DOCUMENTS list
- Return ONLY valid JSON.`

      const response = await aiService.generate({
        prompt,
        provider: options.aiProvider!,
        model: options.aiModel,
        temperature: 0.25,
        max_tokens: 2300
      })

      const parsed = this.parseAIResponse(response.content)
      const responses = (parsed.risk_responses || []).map((item: any) => ({
        ...item,
        cost_of_response: this.safeNumber(item?.cost_of_response)
      }))

      // Resolve source_document_id for each risk response (STRICT: reject if missing)
      const validResponses: RiskResponseRecord[] = []
      let rejectedCount = 0
      
      responses.forEach((response: any) => {
        const isValid = this.resolveSourceDocumentIdStrict(
          response,
          documentMap,
          documents,
          'RISK-RESPONSES',
          response.risk_title || 'Unnamed Risk Response'
        )
        
        if (isValid) {
          validResponses.push(response)
        } else {
          rejectedCount++
        }
      })

      if (rejectedCount > 0) {
        logger.warn(`[EXTRACTION-RISK-RESPONSES] REJECTED ${rejectedCount} risk responses without valid source_document_id (out of ${responses.length} total)`)
      }
      
      logger.info(`[EXTRACTION-RISK-RESPONSES] Extracted ${validResponses.length} risk responses with valid source_document_id (${rejectedCount} rejected)`)

      return validResponses
    } catch (error: unknown) {
      logger.error('[EXTRACTION-RISK-RESPONSES] Extraction failed', {
        error: error instanceof Error ? error.message : String(error)
      })
      return []
    }
  }

  /**
   * Extract performance actuals (actual vs. planned performance data)
   * Tracks actual performance across schedule, cost, scope, and quality dimensions
   */
  private async extractPerformanceActuals(
    documents: Array<{ id: string; title: string; content: string; template_name?: string }>,
    projectId: string,
    options: { aiProvider?: string; aiModel?: string },
    documentMap: Map<string, string>,
    documentList: string
  ): Promise<PerformanceActual[]> {
    try {
      logger.info('[EXTRACTION-PERFORMANCE-ACTUALS] Starting extraction (TASK-184)')

      const documentContext = this.buildDocumentContext(documents)

      const prompt = `You are analyzing project documents to extract PERFORMANCE ACTUALS - actual performance data that occurred during project execution.

CRITICAL: Only extract ACTUAL performance data (what happened), NOT planned/future data.

Look for:
- "Actual start date: ...", "Actually started on ...", "Work began on ..."
- "Actual end date: ...", "Completed on ...", "Finished on ..."
- "Actual cost: $X", "Spent $X", "Incurred $X"
- "Progress: X% complete", "X% done", "Completed X%"
- "Behind schedule by X days", "Ahead of schedule", "Delayed by ..."
- "Under budget by $X", "Over budget by $X"
- Status updates, progress reports, actual vs. planned comparisons
- Quality metrics: defects found, rework hours, quality scores

SOURCE DOCUMENTS:
${documentContext}

AVAILABLE DOCUMENTS (for source_document matching):
${documentList}

Extract all performance actuals as a JSON array. For each actual found:

{
  "performance_actuals": [
    {
      "entity_type": "milestone" | "deliverable" | "activity" | "phase" | "resource",
      "entity_name": "Name of the milestone/deliverable/activity",
      "planned_start_date": "YYYY-MM-DD" (if mentioned),
      "actual_start_date": "YYYY-MM-DD" (if mentioned),
      "planned_end_date": "YYYY-MM-DD" (if mentioned),
      "actual_end_date": "YYYY-MM-DD" (if mentioned),
      "planned_cost": number (if mentioned),
      "actual_cost": number (if mentioned),
      "planned_progress_percent": number 0-100 (if mentioned),
      "actual_progress_percent": number 0-100 (if mentioned),
      "quality_score": number 0-10 (if mentioned),
      "defects_found": number (if mentioned),
      "rework_hours": number (if mentioned),
      "notes": "Brief context from the document",
      "source_document": "EXACT document title from AVAILABLE DOCUMENTS list above"
    }
  ]
}

Guidelines:
- ONLY include items with ACTUAL data (not just plans)
- entity_type must be one of: milestone, deliverable, activity, phase, resource
- Dates should be in YYYY-MM-DD format
- Remove currency symbols and convert costs to numbers
- Progress percentages should be 0-100
- Quality scores should be 0-10
- Return empty array if no actuals found
- **source_document MUST match exactly** one of the document titles from AVAILABLE DOCUMENTS list
- Return ONLY valid JSON array.

Output valid JSON object with "performance_actuals" array only.`

      // Use generateWithFallback for automatic provider fallback
      const response = await aiService.generateWithFallback({
        prompt,
        provider: options.aiProvider || 'openai',
        model: options.aiModel,
        temperature: 0.3,
        max_tokens: 4000
      }, ['openai', 'google', 'anthropic', 'mistral', 'groq'])

      this.validateAIResponse(response, 'performance_actuals', options)

      const parsed = this.parseAIResponse(response.content)
      const actuals = (parsed.performance_actuals || []).map((item: any) => ({
        entity_type: item.entity_type || 'milestone',
        entity_id: item.entity_id || null,
        entity_name: item.entity_name || '',
        planned_start_date: this.normalizeDate(item.planned_start_date),
        actual_start_date: this.normalizeDate(item.actual_start_date),
        planned_end_date: this.normalizeDate(item.planned_end_date),
        actual_end_date: this.normalizeDate(item.actual_end_date),
        planned_cost: this.safeNumber(item.planned_cost),
        actual_cost: this.safeNumber(item.actual_cost),
        planned_progress_percent: this.safeNumber(item.planned_progress_percent),
        actual_progress_percent: this.safeNumber(item.actual_progress_percent),
        quality_score: this.safeNumber(item.quality_score),
        defects_found: this.safeInteger(item.defects_found),
        rework_hours: this.safeNumber(item.rework_hours),
        notes: item.notes || null,
        source_document: item.source_document || null
      }))

      // Resolve source_document_id for each performance actual (STRICT: reject if missing)
      const validActuals: PerformanceActual[] = []
      let rejectedCount = 0
      
      actuals.forEach((actual: any) => {
        const isValid = this.resolveSourceDocumentIdStrict(
          actual,
          documentMap,
          documents,
          'PERFORMANCE-ACTUALS',
          actual.entity_name || `Performance Actual ${actual.entity_type || 'Unknown'}`
        )
        
        if (isValid) {
          validActuals.push(actual)
        } else {
          rejectedCount++
        }
      })

      if (rejectedCount > 0) {
        logger.warn(`[EXTRACTION-PERFORMANCE-ACTUALS] REJECTED ${rejectedCount} performance actuals without valid source_document_id (out of ${actuals.length} total)`)
      }

      // Filter out invalid entries (must have at least entity_name and some actual data)
      const filteredActuals = validActuals.filter((actual: PerformanceActual) => {
        return actual.entity_name && (
          actual.actual_start_date ||
          actual.actual_end_date ||
          actual.actual_cost !== null ||
          actual.actual_progress_percent !== null ||
          actual.quality_score !== null
        )
      })

      logger.info(`[EXTRACTION-PERFORMANCE-ACTUALS] Extracted ${filteredActuals.length} performance actuals`)

      return filteredActuals
    } catch (error: unknown) {
      logger.error('[EXTRACTION-PERFORMANCE-ACTUALS] Extraction failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
      return []
    }
  }

  /**
   * Normalize stakeholder name for deduplication
   * Handles variations like "John Smith", "John Smith (PM)", "john smith"
   */
  private normalizeStakeholderName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s*\([^)]*\)\s*$/, '') // Remove trailing (role) suffix
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/[^\w\s]/g, '') // Remove special characters for better matching
  }

  /**
   * Deduplicate stakeholders within the extracted batch only
   * Handles variations like "John Smith", "John Smith (PM)", "john smith"
   */
  private deduplicateStakeholdersBatch(stakeholders: Stakeholder[]): Stakeholder[] {
    const seen = new Map<string, Stakeholder>()
    
    stakeholders.forEach(stakeholder => {
      // Normalize name: lowercase, trim, remove parenthetical suffixes
      const normalized = this.normalizeStakeholderName(stakeholder.name)
      
      if (!seen.has(normalized)) {
        // First occurrence - keep it
        seen.set(normalized, stakeholder)
      } else {
        // Duplicate found - merge information
        const existing = seen.get(normalized)!
        
        // Keep the more detailed name (longer = more info)
        if (stakeholder.name.length > existing.name.length) {
          existing.name = stakeholder.name
        }
        
        // Merge expectations and concerns
        if (stakeholder.expectations && !existing.expectations) {
          existing.expectations = stakeholder.expectations
        }
        if (stakeholder.concerns && !existing.concerns) {
          existing.concerns = stakeholder.concerns
        }
        
        // Use higher interest/influence levels
        if (stakeholder.interest_level === 'high') existing.interest_level = 'high'
        if (stakeholder.influence_level === 'high') existing.influence_level = 'high'
        
        logger.debug(`[DEDUP-BATCH] Merged "${stakeholder.name}" into "${existing.name}"`)
      }
    })
    
    return Array.from(seen.values())
  }

  /**
   * Build document context for AI prompts
   */
  private buildDocumentContext(
    documents: Array<{ id: string; title: string; content: string; template_name?: string }>
  ): string {
    const sections: string[] = []
    
    // Filter out documents with no content
    const validDocuments = documents.filter(doc => doc.content && doc.content.trim().length > 0)
    
    if (validDocuments.length === 0) {
      logger.warn('[EXTRACTION] No documents with valid content found')
      return '[No document content available for extraction]'
    }
    
    if (validDocuments.length < documents.length) {
      logger.warn(`[EXTRACTION] Filtered out ${documents.length - validDocuments.length} documents with empty content`)
    }

    validDocuments.forEach((doc, index) => {
      sections.push(`--- Document ${index + 1}: ${doc.title} ---`)
      sections.push(`Template: ${doc.template_name || 'Unknown'}`)
      sections.push('')
      // Truncate very long documents to fit in token budget
      // Increased limit: 50K chars per doc (supports ~6,000 word documents fully)
      const content = doc.content.length > 50000 
        ? doc.content.substring(0, 50000) + '\n\n[Document truncated for length]'
        : doc.content
      sections.push(content)
      sections.push('')
    })

    const context = sections.join('\n')
    logger.debug(`[EXTRACTION] Built document context: ${validDocuments.length} documents, ${context.length} characters`)
    return context
  }

  /**
   * Get the Knowledge Area Domain name for a given entity type
   * Used for logging and domain-specific configuration
   */
  private getKnowledgeDomainForEntityType(entityType: string): string {
    const domainMap: Record<string, string> = {
      // Governance Domain
      governance_decisions: 'governance',
      approval_workflows: 'governance',
      steering_committees: 'governance',
      change_control_boards: 'governance',
      policy_compliance: 'governance',
      // Scope Domain
      scope_baselines: 'scope',
      wbs_nodes: 'scope',
      scope_change_requests: 'scope',
      requirements_traceability: 'scope',
      scope_verification: 'scope',
      // Schedule Domain
      schedule_baselines: 'schedule',
      schedule_activities: 'schedule',
      critical_path_activities: 'schedule',
      schedule_variances: 'schedule',
      schedule_forecasts: 'schedule',
      // Finance Domain
      budget_baselines: 'finance',
      cost_actuals: 'finance',
      cost_estimates: 'finance',
      funding_tranches: 'finance',
      financial_variances: 'finance',
      procurement_costs: 'finance',
      // Resources Domain
      resource_assignments: 'resources',
      resource_pool: 'resources',
      capacity_forecasts: 'resources',
      utilization_records: 'resources',
      resource_conflicts: 'resources',
      onboarding_offboarding: 'resources',
      // Risk Domain
      risk_assessments: 'risk',
      risk_response_plans: 'risk',
      risk_triggers: 'risk',
      risk_reviews: 'risk',
      contingency_reserves: 'risk',
      risk_metrics: 'risk',
      // Stakeholders Ops Domain
      engagement_actions: 'stakeholders_ops',
      communication_logs: 'stakeholders_ops',
      satisfaction_surveys: 'stakeholders_ops',
      stakeholder_issues: 'stakeholders_ops',
      relationship_health: 'stakeholders_ops'
    }
    return domainMap[entityType] || 'unknown'
  }

  /**
   * Build document title-to-ID mapping for source document resolution
   */
  private buildDocumentMap(
    documents: Array<{ id: string; title: string; content: string; template_name?: string }>
  ): Map<string, string> {
    const documentMap = new Map<string, string>()
    documents.forEach(doc => {
      // Use title, fallback to template_name, fallback to document ID prefix
      const displayTitle = doc.title || doc.template_name || `Document ${doc.id.substring(0, 8)}`
      
      if (displayTitle && doc.id) {
        // Exact match (normalized)
        documentMap.set(displayTitle.toLowerCase().trim(), doc.id)
        // Normalized version (remove special chars for fuzzy matching)
        const normalizedTitle = displayTitle.toLowerCase().trim().replace(/[^\w\s]/g, '')
        if (normalizedTitle !== displayTitle.toLowerCase().trim()) {
          documentMap.set(normalizedTitle, doc.id)
        }
        
        // Also add template_name if different from title (for better matching)
        if (doc.template_name && doc.template_name !== displayTitle) {
          const normalizedTemplate = doc.template_name.toLowerCase().trim()
          documentMap.set(normalizedTemplate, doc.id)
        }
      }
    })
    return documentMap
  }

  /**
   * Resolve source_document_id from source_document title
   * Returns the resolved document ID, or undefined if not found
   */
  private resolveSourceDocumentId(
    sourceDocument: string | undefined,
    documentMap: Map<string, string>
  ): string | undefined {
    if (!sourceDocument) return undefined
    
    const docTitle = sourceDocument.trim()
    if (!docTitle) return undefined
    
    // Try exact match first
    let sourceDocumentId = documentMap.get(docTitle.toLowerCase()) || 
                          documentMap.get(docTitle.toLowerCase().replace(/[^\w\s]/g, ''))
    
    // If not found, try fuzzy matching
    if (!sourceDocumentId) {
      for (const [title, id] of documentMap.entries()) {
        if (docTitle.toLowerCase().includes(title) || title.includes(docTitle.toLowerCase())) {
          sourceDocumentId = id
          logger.debug(`[EXTRACTION] Fuzzy matched document "${docTitle}" to "${title}" (ID: ${id})`)
          break
        }
      }
    }
    
    if (!sourceDocumentId) {
      logger.warn(`[EXTRACTION] Could not resolve source_document_id for "${docTitle}"`)
    }
    
    return sourceDocumentId
  }

  /**
   * Resolve source_document_id - STRICT MODE with fallback: Entities without valid source_document_id use fallback
   * This ensures full traceability - entities always have a traceable source document
   * If AI doesn't provide source_document, uses the first document as fallback
   * 
   * @returns true if source_document_id was successfully resolved (or fallback applied), false otherwise
   */
  private resolveSourceDocumentIdStrict(
    entity: any,
    documentMap: Map<string, string>,
    documents: Array<{ id: string; title: string; content: string; template_name?: string }>,
    entityType: string,
    entityName: string
  ): boolean {
    // Try to resolve from AI-provided source_document
    if (entity.source_document) {
      entity.source_document_id = this.resolveSourceDocumentId(entity.source_document, documentMap)
      
      if (entity.source_document_id) {
        logger.debug(`[EXTRACTION-${entityType.toUpperCase()}] ✅ Resolved source_document_id for "${entityName}" from "${entity.source_document}" → ${entity.source_document_id}`)
        return true
      } else {
        logger.warn(`[EXTRACTION-${entityType.toUpperCase()}] Could not resolve source_document_id for "${entityName}" from "${entity.source_document}" - using fallback`)
        logger.debug(`[EXTRACTION-${entityType.toUpperCase()}] Available documents: ${Array.from(documentMap.keys()).join(', ')}`)
      }
    } else {
      logger.debug(`[EXTRACTION-${entityType.toUpperCase()}] Entity "${entityName}" has no source_document field - using fallback to first document`)
    }
    
    // Fallback: Use first document if available
    if (documents.length > 0 && documents[0].id) {
      entity.source_document_id = documents[0].id
      entity.source_document = documents[0].title || documents[0].template_name || `Document ${documents[0].id.substring(0, 8)}`
      logger.info(`[EXTRACTION-${entityType.toUpperCase()}] ✅ Applied fallback source_document_id for "${entityName}" → ${entity.source_document_id} (${entity.source_document})`)
      return true
    }
    
    // No documents available - reject entity
    logger.error(`[EXTRACTION-${entityType.toUpperCase()}] REJECTED: Entity "${entityName}" - no source_document provided and no documents available for fallback`)
    return false
  }

  /**
   * Build document list string for AI prompts (for source_document matching)
   */
  private buildDocumentList(
    documents: Array<{ id: string; title: string; content: string; template_name?: string }>
  ): string {
    return documents.map((doc, idx) => {
      // Use title, fallback to template_name, fallback to document ID prefix
      const displayTitle = doc.title || doc.template_name || `Document ${doc.id.substring(0, 8)}`
      return `- Document ${idx + 1}: "${displayTitle}"`
    }).join('\n')
  }

  /**
   * Cached AI extraction wrapper
   * Checks cache before calling AI, stores result after
   */
  private async extractWithCache<T>(
    projectId: string,
    documentContext: string,
    entityType: string,
    options: { aiProvider?: string; aiModel?: string },
    extractFn: () => Promise<T[]>
  ): Promise<T[]> {
    // Check cache first
    const cached = await aiCacheService.get(
      projectId,
      documentContext,
      entityType,
      options.aiProvider,
      options.aiModel
    )
    
    if (cached) {
      return cached as T[]
    }
    
    // Cache miss - perform AI extraction
    const result = await extractFn()
    
    // Cache the result (only if extraction succeeded with data)
    if (result.length > 0) {
      await aiCacheService.set(
        projectId,
        documentContext,
        entityType,
        result,
        options.aiProvider,
        options.aiModel
      )
    }
    
    return result
  }

  private ensureStringArray(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value
        .map(item => (typeof item === 'string' ? item : String(item ?? '')).trim())
        .filter(item => item.length > 0)
    }

    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (!trimmed) return []
      if (trimmed.includes(',') || trimmed.includes(';') || trimmed.includes('|')) {
        return trimmed
          .split(/[,;|]/)
          .map(part => part.trim())
          .filter(part => part.length > 0)
      }
      return [trimmed]
    }

    return []
  }

  /**
   * Extract numeric value from various formats:
   * - Currency: €3.1M, $2.5M, £1.8M
   * - Percentages: 50%, <10%, ±5%, from 28% to 80%
   * - Ranges: Extract target value (e.g., "from 28% to 80%" -> 80)
   * - Comparison operators: <, >, ±, ≤, ≥
   * - Million/billion: M, B, K, million, billion, thousand
   */
  private safeNumber(value: unknown): number | undefined {
    if (value === null || value === undefined) {
      return undefined
    }
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : undefined
    }
    if (typeof value === 'string') {
      let trimmed = value.trim()
      if (!trimmed) return undefined

      // Handle ranges: "from 28% to 80%" -> extract 80 (target value)
      const rangeMatch = trimmed.match(/(?:from|between)\s+[\d.,]+\s*(?:%|percent)?\s*(?:to|and)\s+([\d.,]+)/i)
      if (rangeMatch) {
        trimmed = rangeMatch[1] + (trimmed.includes('%') ? '%' : '')
      }

      // Extract the main numeric value (handles comparison operators and currency symbols)
      // Match: <10%, >50%, ±5%, ≤20%, ≥30%, €3.1M, $2.5M, or just 50%
      let numericStr = trimmed.match(/(?:[<>≤≥±€$£¥]|less than|greater than|approximately|about|around)\s*([\d.,]+)/i)?.[1] 
                    || trimmed.match(/(?:[€$£¥]\s*)?([\d.,]+)/i)?.[1]
      
      if (!numericStr) return undefined

      // Remove thousand separators (commas)
      numericStr = numericStr.replace(/,/g, '')

      // Parse base number
      let num = parseFloat(numericStr)
      if (!Number.isFinite(num)) return undefined

      // Handle million/billion multipliers
      const multiplierMatch = trimmed.match(/([MBK]|million|billion|thousand)/i)
      if (multiplierMatch) {
        const multiplier = multiplierMatch[1].toUpperCase()
        if (multiplier === 'B' || multiplier === 'BILLION') {
          num *= 1000000000
        } else if (multiplier === 'M' || multiplier === 'MILLION') {
          num *= 1000000
        } else if (multiplier === 'K' || multiplier === 'THOUSAND') {
          num *= 1000
        }
      }

      // For percentages, keep as-is (50% -> 50, not 0.5)
      // The percentage symbol is informational, not a divisor

      return num
    }
    return undefined
  }

  private safeInteger(value: unknown): number | undefined {
    const num = this.safeNumber(value)
    if (num === undefined) return undefined
    const rounded = Math.round(num)
    return Number.isFinite(rounded) ? rounded : undefined
  }

  private normalizeDate(value?: string | null): string | null {
    if (!value) {
      return null
    }
    let trimmed = value.toString().trim()
    if (!trimmed) {
      return null
    }

    // Skip keywords that aren't dates
    const skipKeywords = ['relative', 'as needed', 'weekly', 'monthly', 'quarterly', 'ongoing', 'tbd', 'n/a']
    if (skipKeywords.some(kw => trimmed.toLowerCase().includes(kw))) {
      return null
    }

    // Extract YYYY-MM-DD pattern from strings with extra text
    // Examples: "2025-12-31 (initial version)" -> "2025-12-31"
    //           "Monthly (first due 2025-11-30)" -> "2025-11-30"
    //           "Bi-weekly (first due 2025-11-15)" -> "2025-11-15"
    const datePatternMatch = trimmed.match(/(\d{4}-\d{2}-\d{2})/)
    if (datePatternMatch) {
      trimmed = datePatternMatch[1]
    }

    // Try quarter date conversion first
    const quarterDate = convertQuarterDate(trimmed)
    if (quarterDate) {
      return quarterDate
    }

    // Check if it's already a valid YYYY-MM-DD date
    if (isValidDate(trimmed)) {
      return trimmed
    }

    // Month name to number mapping
    const monthMap: Record<string, string> = {
      'jan': '01', 'january': '01',
      'feb': '02', 'february': '02',
      'mar': '03', 'march': '03',
      'apr': '04', 'april': '04',
      'may': '05',
      'jun': '06', 'june': '06',
      'jul': '07', 'july': '07',
      'aug': '08', 'august': '08',
      'sep': '09', 'september': '09',
      'oct': '10', 'october': '10',
      'nov': '11', 'november': '11',
      'dec': '12', 'december': '12'
    }

    // Try to extract "Month DD, YYYY" or "Month YYYY" patterns with extra text
    // Examples: "Mar 15, 2026 (prototype approval)" -> "2026-03-15"
    //           "Jan 2026" -> "2026-01-01"
    //           "November 2026" -> "2026-11-01"
    const monthDayYearMatch = trimmed.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)\s+(\d{1,2})[\s,]+(\d{4})\b/i)
    if (monthDayYearMatch) {
      const [, monthStr, dayStr, yearStr] = monthDayYearMatch
      const month = monthMap[monthStr.toLowerCase()]
      if (month) {
        const day = dayStr.padStart(2, '0')
        const result = `${yearStr}-${month}-${day}`
        if (isValidDate(result)) {
          return result
        }
      }
    }

    // Try to extract "Month YYYY" pattern (set to first day of month)
    // Examples: "Jan 2026" -> "2026-01-01"
    //           "November 2026" -> "2026-11-01"
    const monthYearMatch = trimmed.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)\s+(\d{4})\b/i)
    if (monthYearMatch) {
      const [, monthStr, yearStr] = monthYearMatch
      const month = monthMap[monthStr.toLowerCase()]
      if (month) {
        const result = `${yearStr}-${month}-01`
        if (isValidDate(result)) {
          return result
        }
      }
    }

    // Try to extract "DD Month YYYY" patterns
    // Examples: "15 March 2026" -> "2026-03-15"
    const dayMonthYearMatch = trimmed.match(/\b(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)[\s,]+(\d{4})\b/i)
    if (dayMonthYearMatch) {
      const [, dayStr, monthStr, yearStr] = dayMonthYearMatch
      const month = monthMap[monthStr.toLowerCase()]
      if (month) {
        const day = dayStr.padStart(2, '0')
        const result = `${yearStr}-${month}-${day}`
        if (isValidDate(result)) {
          return result
        }
      }
    }

    // Attempt to parse other date formats using Date.parse
    const parsed = Date.parse(trimmed)
    if (!Number.isNaN(parsed)) {
      const date = new Date(parsed)
      if (isValidDate(date.toISOString().split('T')[0])) {
        return date.toISOString().split('T')[0]
      }
    }

    logger.debug(`[EXTRACTION] Unable to normalize date "${value}", storing as null`)
    return null
  }

  private async getActivityIdMap(client: PoolClient, projectId: string): Promise<Map<string, string>> {
    const result = await client.query<{ id: string; activity_name: string | null }>(
      `SELECT id, activity_name FROM activities WHERE project_id = $1`,
      [projectId]
    )
    const map = new Map<string, string>()
    result.rows.forEach(row => {
      if (row.activity_name) {
        map.set(row.activity_name.toLowerCase().trim(), row.id)
      }
    })
    return map
  }

  private async getSuccessCriterionIdMap(
    client: PoolClient,
    projectId: string
  ): Promise<Map<string, string>> {
    const result = await client.query<{ id: string; name: string | null }>(
      `SELECT id, name FROM success_criteria WHERE project_id = $1`,
      [projectId]
    )
    const map = new Map<string, string>()
    result.rows.forEach(row => {
      if (row.name) {
        const normalizedName = row.name.toLowerCase().trim()
        // Store exact match
        map.set(normalizedName, row.id)
        // Store normalized version (remove special chars, extra spaces)
        const cleaned = normalizedName.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ')
        if (cleaned !== normalizedName) {
          map.set(cleaned, row.id)
        }
        // Store key words for partial matching
        const words = cleaned.split(/\s+/).filter(w => w.length > 3)
        words.forEach(word => {
          if (!map.has(`partial:${word}`)) {
            map.set(`partial:${word}`, row.id)
          }
        })
      }
    })
    return map
  }

  /**
   * Find success criterion ID using fuzzy matching
   */
  private findSuccessCriterionId(
    criterionName: string,
    successCriteriaMap: Map<string, string>
  ): string | null {
    if (!criterionName) return null
    
    const normalized = criterionName.toLowerCase().trim()
    
    // Try exact match first
    let criterionId = successCriteriaMap.get(normalized)
    if (criterionId) return criterionId
    
    // Try cleaned version (remove special chars)
    const cleaned = normalized.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ')
    criterionId = successCriteriaMap.get(cleaned)
    if (criterionId) return criterionId
    
    // Try partial matching using key words
    const words = cleaned.split(/\s+/).filter(w => w.length > 3)
    for (const word of words) {
      criterionId = successCriteriaMap.get(`partial:${word}`)
      if (criterionId) {
        logger.debug(`[EXTRACTION] Partial matched criterion "${criterionName}" using word "${word}"`)
        return criterionId
      }
    }
    
    // Try substring matching (criterion name contains or is contained by map key)
    for (const [key, id] of successCriteriaMap.entries()) {
      if (key.startsWith('partial:')) continue // Skip partial keys
      if (normalized.includes(key) || key.includes(normalized)) {
        logger.debug(`[EXTRACTION] Substring matched criterion "${criterionName}" to "${key}"`)
        return id
      }
    }
    
    return null
  }

  private async getRiskIdMap(client: PoolClient, projectId: string): Promise<Map<string, string>> {
    const result = await client.query<{ id: string; name: string | null }>(
      `SELECT id, name FROM risks WHERE project_id = $1`,
      [projectId]
    )
    const map = new Map<string, string>()
    result.rows.forEach(row => {
      if (row.name) {
        map.set(row.name.toLowerCase().trim(), row.id)
      }
    })
    return map
  }

  /**
   * Close incomplete JSON object by adding missing closing braces/brackets
   */
  private closeIncompleteJsonObject(content: string): string {
    let openBraces = 0
    let openBrackets = 0
    let inString = false
    let escapeNext = false
    
    for (let i = 0; i < content.length; i++) {
      const char = content[i]
      
      if (escapeNext) {
        escapeNext = false
        continue
      }
      
      if (char === '\\') {
        escapeNext = true
        continue
      }
      
      if (char === '"') {
        inString = !inString
        continue
      }
      
      if (!inString) {
        if (char === '{') openBraces++
        if (char === '}') openBraces--
        if (char === '[') openBrackets++
        if (char === ']') openBrackets--
      }
    }
    
    // Add missing closing brackets/braces
    let result = ''
    if (openBrackets > 0) {
      result += ']'.repeat(openBrackets)
    }
    if (openBraces > 0) {
      result += '}'.repeat(openBraces)
    }
    
    return result
  }

  /**
   * Parse AI response (handles both JSON and markdown-wrapped JSON)
   * Includes fixes for common JSON malformation issues
   */
  private parseAIResponse(content: string): any {
    logger.debug('[EXTRACTION-PARSE] Starting JSON parsing', {
      originalLength: content.length,
      originalPreview: content.substring(0, 200),
      hasCodeBlocks: content.includes('```'),
      startsWithBrace: content.trim().startsWith('{'),
      startsWithBracket: content.trim().startsWith('[')
    })
    
    let cleanedContent = content.trim()
    
    // Remove markdown code blocks if present
    if (cleanedContent.includes('```')) {
      logger.debug('[EXTRACTION-PARSE] Detected markdown code blocks, extracting JSON')
      // Use manual extraction to find the LAST closing ``` (most reliable for long responses)
      // This handles cases where the JSON is very long and might have escaped backticks
      const firstCodeBlockStart = cleanedContent.indexOf('```')
      if (firstCodeBlockStart !== -1) {
        // Find the end of the opening marker (```json or just ```)
        let codeBlockStart = firstCodeBlockStart + 3 // Skip opening ```
        // Skip optional language identifier (json, etc.)
        while (codeBlockStart < cleanedContent.length && 
               cleanedContent[codeBlockStart] !== '\n' && 
               cleanedContent[codeBlockStart] !== '`') {
          codeBlockStart++
        }
        // Skip newline if present
        if (codeBlockStart < cleanedContent.length && cleanedContent[codeBlockStart] === '\n') {
          codeBlockStart++
        }
        
        // Find the LAST closing ``` (in case there are multiple code blocks or escaped backticks)
        let codeBlockEnd = cleanedContent.lastIndexOf('```')
        if (codeBlockEnd !== -1 && codeBlockEnd > codeBlockStart) {
          // Extract content between code block markers
          cleanedContent = cleanedContent.substring(codeBlockStart, codeBlockEnd).trim()
        } else {
          // No closing marker found - might be incomplete JSON, extract from start to end
          cleanedContent = cleanedContent.substring(codeBlockStart).trim()
          logger.warn('[EXTRACTION-PARSE] No closing code block marker found - JSON may be incomplete', {
            extractedLength: cleanedContent.length,
            lastChars: cleanedContent.substring(Math.max(0, cleanedContent.length - 100))
          })
        }
      }
      
      // Try regex as fallback if manual extraction left code blocks
      if (cleanedContent.includes('```')) {
        logger.debug('[EXTRACTION-PARSE] Manual extraction left code blocks, trying regex fallback')
        const codeBlockMatch = cleanedContent.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/)
        if (codeBlockMatch && codeBlockMatch[1]) {
          cleanedContent = codeBlockMatch[1].trim()
        }
      }
      
      // Final cleanup: remove any remaining markdown artifacts
      cleanedContent = cleanedContent
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/, '')
        .replace(/```\s*$/, '')
        .trim()
      
      // Log extracted content for debugging (first 200 chars)
      if (cleanedContent.length > 0) {
        logger.debug('[EXTRACTION-PARSE] Extracted from code block', {
          preview: cleanedContent.substring(0, 200),
          length: cleanedContent.length,
          hasCodeBlocks: cleanedContent.includes('```'),
          extractedContent: cleanedContent // Full extracted content for debugging
        })
      }
    }
    
    logger.debug('[EXTRACTION-PARSE] Attempting direct JSON parse', {
      cleanedLength: cleanedContent.length,
      cleanedPreview: cleanedContent.substring(0, 300),
      firstChar: cleanedContent[0],
      lastChar: cleanedContent[cleanedContent.length - 1]
    })
    
    // Try direct JSON parse first
    try {
      const parsed = JSON.parse(cleanedContent)
      logger.debug('[EXTRACTION-PARSE] Direct parse successful', {
        parsedType: typeof parsed,
        isArray: Array.isArray(parsed),
        keys: parsed && typeof parsed === 'object' ? Object.keys(parsed) : []
      })
      return parsed
    } catch (parseError: any) {
      // Extract error position for context
      const errorPosMatch = parseError.message.match(/position (\d+)/)
      const errorPosition = errorPosMatch ? parseInt(errorPosMatch[1]) : null
      const contextStart = errorPosition ? Math.max(0, errorPosition - 100) : 0
      const contextEnd = errorPosition ? Math.min(cleanedContent.length, errorPosition + 100) : 500
      const errorContext = errorPosition ? cleanedContent.substring(contextStart, contextEnd) : cleanedContent.substring(0, 500)
      
      // Log the error for debugging
      logger.warn('[EXTRACTION-PARSE] JSON parse error, attempting fixes', {
        error: parseError.message,
        errorPosition: errorPosition?.toString(),
        errorLine: parseError.message.match(/line (\d+)/)?.[1],
        errorColumn: parseError.message.match(/column (\d+)/)?.[1],
        contentLength: cleanedContent.length,
        contentPreview: cleanedContent.substring(0, 500),
        errorContext: errorContext, // Context around the error position
        charAtError: errorPosition !== null && errorPosition < cleanedContent.length ? cleanedContent[errorPosition] : null,
        charsAroundError: errorPosition !== null && errorPosition > 0 && errorPosition < cleanedContent.length - 1 
          ? cleanedContent.substring(Math.max(0, errorPosition - 5), Math.min(cleanedContent.length, errorPosition + 5))
          : null
      })
      
      // Try to fix common JSON issues
      try {
        // Check if error is about control characters
        const isControlCharError = parseError.message.includes('control character')
        
        // Ensure code block is extracted first (in case it wasn't caught earlier)
        let fixed = cleanedContent
        if (fixed.includes('```')) {
          const codeBlockStart = fixed.indexOf('```')
          if (codeBlockStart !== -1) {
            let start = codeBlockStart + 3
            // Skip language identifier
            while (start < fixed.length && fixed[start] !== '\n' && fixed[start] !== '`') {
              start++
            }
            if (fixed[start] === '\n') start++
            
            const codeBlockEnd = fixed.indexOf('```', start)
            if (codeBlockEnd !== -1) {
              fixed = fixed.substring(start, codeBlockEnd).trim()
            } else {
              fixed = fixed.substring(start).trim()
            }
            // Clean up any remaining markdown artifacts
            fixed = fixed.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
          }
        }
        
        // Fix trailing commas in arrays and objects
        fixed = fixed
          .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas before } or ]
          .replace(/,(\s*,)/g, ',') // Remove duplicate commas
        
        // Check if error is about unescaped quotes
        const isUnescapedQuoteError = parseError.message.includes("Expected ',' or '}' after property value") || 
                                      parseError.message.includes("Unterminated string") ||
                                      parseError.message.includes("Unexpected token")
        
        // If control character error OR unescaped quote error, fix both in a single pass
        if (isControlCharError || isUnescapedQuoteError) {
          logger.warn('[EXTRACTION] Fixing control characters and/or unescaped quotes in JSON', {
            originalLength: fixed.length,
            errorPosition: parseError.message.match(/position (\d+)/)?.[1],
            preview: fixed.substring(0, 500),
            isControlCharError,
            isUnescapedQuoteError
          })
          
          // Use a state machine to properly escape control characters only within string literals
          let result = ''
          let inString = false
          let escapeNext = false
          let lastChar = ''
          
          for (let i = 0; i < fixed.length; i++) {
            const char = fixed[i]
            const charCode = char.charCodeAt(0)
            
            // Handle escape sequences
            if (escapeNext) {
              result += char
              escapeNext = false
              lastChar = char
              continue
            }
            
            // Check for backslash (start of escape sequence)
            if (char === '\\') {
              result += char
              escapeNext = true
              lastChar = char
              continue
            }
            
            // Check for quote (start/end of string)
            if (char === '"') {
              if (inString) {
                // We're inside a string - check if this quote is a delimiter or content
                if (lastChar === '\\') {
                  // Already escaped quote - keep as is
                  result += char
                } else {
                  // Unescaped quote - check if it's the end of the string
                  // Look ahead to see if this is followed by : or , or } or ] or whitespace + one of those
                  // Be conservative: only treat as delimiter if clearly followed by JSON structure markers
                  let isStringEnd = false
                  let lookAheadPos = i + 1
                  
                  // Skip whitespace
                  while (lookAheadPos < fixed.length && /\s/.test(fixed[lookAheadPos])) {
                    lookAheadPos++
                  }
                  
                  if (lookAheadPos < fixed.length) {
                    const nextNonWhitespace = fixed[lookAheadPos]
                    // Only treat as delimiter if followed by clear JSON structure markers
                    if (nextNonWhitespace === ':' || nextNonWhitespace === ',' || 
                        nextNonWhitespace === '}' || nextNonWhitespace === ']' ||
                        nextNonWhitespace === '\n') {
                      isStringEnd = true
                    }
                    // If followed by a quote (double quote), it's likely a delimiter
                    else if (nextNonWhitespace === '"' && lookAheadPos < fixed.length - 1) {
                      // Check if next quote is followed by : (property name delimiter)
                      let nextNextPos = lookAheadPos + 1
                      while (nextNextPos < fixed.length && /\s/.test(fixed[nextNextPos])) {
                        nextNextPos++
                      }
                      if (nextNextPos < fixed.length && fixed[nextNextPos] === ':') {
                        isStringEnd = true
                      }
                    }
                  } else {
                    // End of string - this is the closing quote
                    isStringEnd = true
                  }
                  
                  if (isStringEnd) {
                    // This is the string delimiter - don't escape it
                    inString = false
                    result += char
                  } else {
                    // This is an unescaped quote within string content - escape it to be safe
                    result += '\\"'
                  }
                }
              } else {
                // Outside string - this is a string delimiter
                inString = true
                result += char
              }
              lastChar = char
              continue
            }
            
            // If we're inside a string literal, escape control characters and unescaped quotes
            if (inString) {
              // Check for control characters (0x00-0x1F) except already escaped ones
              if (charCode >= 0x00 && charCode <= 0x1F) {
                // Escape common control characters
                if (char === '\n') {
                  result += '\\n'
                } else if (char === '\r') {
                  result += '\\r'
                } else if (char === '\t') {
                  result += '\\t'
                } else if (char === '\b') {
                  result += '\\b'
                } else if (char === '\f') {
                  result += '\\f'
                } else {
                  // Escape other control characters as Unicode
                  result += '\\u' + ('0000' + charCode.toString(16)).slice(-4)
                }
              } else {
                result += char
              }
            } else {
              result += char
            }
            
            lastChar = char
          }
          
          fixed = result
          
          logger.warn('[EXTRACTION-PARSE] Fixed control characters and/or quotes', {
            originalLength: cleanedContent.length,
            fixedLength: fixed.length,
            lengthChange: fixed.length - cleanedContent.length,
            preview: fixed.substring(0, 500),
            fixedContent: fixed // Full fixed content for debugging
          })
        }
        
        logger.debug('[EXTRACTION-PARSE] Attempting parse after fixes', {
          fixedLength: fixed.length,
          fixedPreview: fixed.substring(0, 300)
        })
        
        // Try parsing fixed version
        try {
          const parsed = JSON.parse(fixed)
          logger.debug('[EXTRACTION-PARSE] Parse successful after fixes', {
            parsedType: typeof parsed,
            isArray: Array.isArray(parsed),
            keys: parsed && typeof parsed === 'object' ? Object.keys(parsed) : []
          })
          return parsed
        } catch (parseAfterFixError: any) {
          // Check if the new error is about unescaped quotes (might not have been caught in first pass)
          const isNewUnescapedQuoteError = parseAfterFixError.message.includes("Expected ',' or '}' after property value") || 
                                           parseAfterFixError.message.includes("Unterminated string") ||
                                           parseAfterFixError.message.includes("Unexpected token")
          
          // If we fixed control chars but now have quote error, apply quote fix
          if (isControlCharError && isNewUnescapedQuoteError && !isUnescapedQuoteError) {
            logger.warn('[EXTRACTION] Applying quote fix after control character fix', {
              originalError: parseError.message,
              newError: parseAfterFixError.message
            })
            
            // Apply quote fix to the already-fixed string
            let result = ''
            let inString = false
            let escapeNext = false
            let lastChar = ''
            
            for (let i = 0; i < fixed.length; i++) {
              const char = fixed[i]
              
              if (escapeNext) {
                result += char
                escapeNext = false
                lastChar = char
                continue
              }
              
              if (char === '\\') {
                result += char
                escapeNext = true
                lastChar = char
                continue
              }
              
              if (char === '"') {
                if (inString) {
                  if (lastChar === '\\') {
                    result += char
                  } else {
                    let isStringEnd = false
                    let lookAheadPos = i + 1
                    while (lookAheadPos < fixed.length && /\s/.test(fixed[lookAheadPos])) {
                      lookAheadPos++
                    }
                    if (lookAheadPos < fixed.length) {
                      const nextNonWhitespace = fixed[lookAheadPos]
                      if (nextNonWhitespace === ':' || nextNonWhitespace === ',' || 
                          nextNonWhitespace === '}' || nextNonWhitespace === ']' ||
                          nextNonWhitespace === '\n') {
                        isStringEnd = true
                      } else if (nextNonWhitespace === '"' && lookAheadPos < fixed.length - 1) {
                        let nextNextPos = lookAheadPos + 1
                        while (nextNextPos < fixed.length && /\s/.test(fixed[nextNextPos])) {
                          nextNextPos++
                        }
                        if (nextNextPos < fixed.length && fixed[nextNextPos] === ':') {
                          isStringEnd = true
                        }
                      }
                    } else {
                      isStringEnd = true
                    }
                    
                    if (isStringEnd) {
                      inString = false
                      result += char
                    } else {
                      result += '\\"'
                    }
                  }
                } else {
                  inString = true
                  result += char
                }
                lastChar = char
                continue
              }
              
              result += char
              lastChar = char
            }
            
            fixed = result
            
            // Try parsing again
            try {
              return JSON.parse(fixed)
            } catch (retryError: any) {
              logger.warn('[EXTRACTION] JSON still invalid after quote fix retry', {
                error: retryError.message
              })
              throw retryError
            }
          }
          
          // Check if error is "Unterminated string" at the end - might be incomplete JSON (truncated response)
          const errorPosMatch = parseAfterFixError.message.match(/position (\d+)/)
          const errorPosition = errorPosMatch ? parseInt(errorPosMatch[1]) : null
          const isUnterminatedAtEnd = parseAfterFixError.message.includes('Unterminated string') &&
                                      errorPosition !== null &&
                                      errorPosition >= fixed.length - 50 // Within last 50 chars
          
          if (isUnterminatedAtEnd) {
            logger.warn('[EXTRACTION] Detected incomplete JSON (unterminated string at end) - attempting to close', {
              error: parseAfterFixError.message,
              errorPosition,
              fixedLength: fixed.length,
              lastChars: fixed.substring(Math.max(0, fixed.length - 200))
            })
            
            // Try to salvage partial data by closing the incomplete string and array/object
            let salvaged = fixed
            // Find the last incomplete string (starts with " but doesn't end with ")
            const lastQuoteIndex = salvaged.lastIndexOf('"')
            if (lastQuoteIndex > 0 && lastQuoteIndex >= salvaged.length - 50) {
              // Check if we're inside a string (count quotes before this position)
              let quoteCount = 0
              for (let i = 0; i < lastQuoteIndex; i++) {
                if (salvaged[i] === '"' && (i === 0 || salvaged[i - 1] !== '\\')) {
                  quoteCount++
                }
              }
              // If odd number of quotes, we're inside an incomplete string
              if (quoteCount % 2 === 1) {
                // Close the string
                salvaged = salvaged.substring(0, lastQuoteIndex + 1)
                // Find the last incomplete object/array and close it
                let openBraces = 0
                let openBrackets = 0
                for (let i = 0; i < salvaged.length; i++) {
                  if (salvaged[i] === '{' && (i === 0 || salvaged[i - 1] !== '\\')) openBraces++
                  if (salvaged[i] === '}' && (i === 0 || salvaged[i - 1] !== '\\')) openBraces--
                  if (salvaged[i] === '[' && (i === 0 || salvaged[i - 1] !== '\\')) openBrackets++
                  if (salvaged[i] === ']' && (i === 0 || salvaged[i - 1] !== '\\')) openBrackets--
                }
                // Close arrays first, then objects
                while (openBrackets > 0) {
                  salvaged += ']'
                  openBrackets--
                }
                while (openBraces > 0) {
                  salvaged += '}'
                  openBraces--
                }
                
                logger.info('[EXTRACTION] Attempting to parse salvaged JSON', {
                  salvagedLength: salvaged.length,
                  lastChars: salvaged.substring(Math.max(0, salvaged.length - 100))
                })
                
                try {
                  const salvagedParsed = JSON.parse(salvaged)
                  logger.warn('[EXTRACTION] Successfully parsed salvaged JSON - some data may be incomplete', {
                    keys: salvagedParsed && typeof salvagedParsed === 'object' ? Object.keys(salvagedParsed) : []
                  })
                  return salvagedParsed
                } catch (salvageError: any) {
                  logger.warn('[EXTRACTION] Failed to parse salvaged JSON', {
                    error: salvageError.message
                  })
                }
              }
            }
            
            // Fallback: Use the existing closeIncompleteJsonObject method
            let closedJson = fixed
            // If we detected an incomplete string, close it first
            if (lastQuoteIndex > 0 && lastQuoteIndex >= fixed.length - 50) {
              let quoteCount = 0
              for (let i = 0; i < lastQuoteIndex; i++) {
                if (fixed[i] === '"' && (i === 0 || fixed[i - 1] !== '\\')) {
                  quoteCount++
                }
              }
              if (quoteCount % 2 === 1) {
                closedJson = fixed.substring(0, lastQuoteIndex + 1) + '"'
              }
            }
            closedJson += this.closeIncompleteJsonObject(closedJson)
            
            try {
              const parsed = JSON.parse(closedJson)
              logger.info('[EXTRACTION] Successfully closed incomplete JSON', {
                originalLength: fixed.length,
                closedLength: closedJson.length,
                keys: parsed && typeof parsed === 'object' ? Object.keys(parsed) : []
              })
              return parsed
            } catch (closeError) {
              logger.warn('[EXTRACTION] Failed to close incomplete JSON', {
                error: closeError instanceof Error ? closeError.message : String(closeError),
                closedJsonPreview: closedJson.substring(Math.max(0, closedJson.length - 200))
              })
            }
          }
          
          // If still failing, log and try alternative approach
          logger.warn('[EXTRACTION] JSON still invalid after control character/quote fix', {
            error: parseAfterFixError.message,
            errorPosition: parseAfterFixError.message.match(/position (\d+)/)?.[1],
            fixedPreview: fixed.substring(Math.max(0, (parseInt(parseAfterFixError.message.match(/position (\d+)/)?.[1] || '0') - 100)), parseInt(parseAfterFixError.message.match(/position (\d+)/)?.[1] || '0') + 100)
          })
          throw parseAfterFixError // Re-throw to try next fallback
        }
      } catch (fixError) {
        // Try extracting just the first complete JSON object
        try {
          // Find the first { and try to match balanced braces
          const firstBrace = cleanedContent.indexOf('{')
          if (firstBrace !== -1) {
            let braceCount = 0
            let endPos = firstBrace
            
            for (let i = firstBrace; i < cleanedContent.length; i++) {
              if (cleanedContent[i] === '{') braceCount++
              if (cleanedContent[i] === '}') braceCount--
              if (braceCount === 0) {
                endPos = i + 1
                break
              }
            }
            
            if (braceCount === 0) {
              let extracted = cleanedContent.substring(firstBrace, endPos)
              
              // Apply control character and quote fix to extracted JSON
              const needsFix = parseError.message.includes('control character') ||
                              parseError.message.includes("Expected ',' or '}' after property value") ||
                              parseError.message.includes("Unterminated string") ||
                              parseError.message.includes("Unexpected token")
              if (needsFix) {
                let result = ''
                let inString = false
                let escapeNext = false
                let lastChar = ''
                
                for (let i = 0; i < extracted.length; i++) {
                  const char = extracted[i]
                  const charCode = char.charCodeAt(0)
                  
                  if (escapeNext) {
                    result += char
                    escapeNext = false
                    lastChar = char
                    continue
                  }
                  
                  if (char === '\\') {
                    result += char
                    escapeNext = true
                    lastChar = char
                    continue
                  }
                  
                  if (char === '"') {
                    if (inString) {
                      // We're inside a string - check if this quote is a delimiter or content
                      if (lastChar === '\\') {
                        // Already escaped quote - keep as is
                        result += char
                      } else {
                        // Unescaped quote - check if it's the end of the string
                        // Look ahead to see if this is followed by : or , or } or ] or whitespace + one of those
                        // Be conservative: only treat as delimiter if clearly followed by JSON structure markers
                        let isStringEnd = false
                        let lookAheadPos = i + 1
                        
                        // Skip whitespace
                        while (lookAheadPos < extracted.length && /\s/.test(extracted[lookAheadPos])) {
                          lookAheadPos++
                        }
                        
                        if (lookAheadPos < extracted.length) {
                          const nextNonWhitespace = extracted[lookAheadPos]
                          // Only treat as delimiter if followed by clear JSON structure markers
                          if (nextNonWhitespace === ':' || nextNonWhitespace === ',' || 
                              nextNonWhitespace === '}' || nextNonWhitespace === ']' ||
                              nextNonWhitespace === '\n') {
                            isStringEnd = true
                          }
                          // If followed by a quote (double quote), it's likely a delimiter
                          else if (nextNonWhitespace === '"' && lookAheadPos < extracted.length - 1) {
                            // Check if next quote is followed by : (property name delimiter)
                            let nextNextPos = lookAheadPos + 1
                            while (nextNextPos < extracted.length && /\s/.test(extracted[nextNextPos])) {
                              nextNextPos++
                            }
                            if (nextNextPos < extracted.length && extracted[nextNextPos] === ':') {
                              isStringEnd = true
                            }
                          }
                        } else {
                          // End of string - this is the closing quote
                          isStringEnd = true
                        }
                        
                        if (isStringEnd) {
                          // This is the string delimiter - don't escape it
                          inString = false
                          result += char
                        } else {
                          // This is an unescaped quote within string content - escape it to be safe
                          result += '\\"'
                        }
                      }
                    } else {
                      // Outside string - this is a string delimiter
                      inString = true
                      result += char
                    }
                    lastChar = char
                    continue
                  }
                  
                  if (inString && charCode >= 0x00 && charCode <= 0x1F) {
                    if (char === '\n') {
                      result += '\\n'
                    } else if (char === '\r') {
                      result += '\\r'
                    } else if (char === '\t') {
                      result += '\\t'
                    } else if (char === '\b') {
                      result += '\\b'
                    } else if (char === '\f') {
                      result += '\\f'
                    } else {
                      result += '\\u' + ('0000' + charCode.toString(16)).slice(-4)
                    }
                  } else {
                    result += char
                  }
                  
                  lastChar = char
                }
                
                extracted = result
              }
              
              return JSON.parse(extracted)
            }
          }
        } catch (extractError) {
          // Last resort: try to find any JSON-like structure
          logger.error('[EXTRACTION] All JSON parsing attempts failed', {
            originalError: parseError.message,
            fixError: fixError instanceof Error ? fixError.message : String(fixError),
            extractError: extractError instanceof Error ? extractError.message : String(extractError),
            contentLength: cleanedContent.length,
            contentSample: cleanedContent.substring(0, 1000)
          })
          
          // Return empty object to prevent complete failure
          // The extraction method will handle empty response
          return {}
        }
      }
    }
    
    // Fallback: return empty object
    logger.warn('[EXTRACTION] Failed to parse AI response as JSON, returning empty object')
    return {}
  }

  // Database save methods continue in next message...
  /**
   * Save stakeholders to database
   * Includes deduplication against existing database records
   */
  private async saveStakeholders(
    client: PoolClient,
    projectId: string,
    userId: string,
    stakeholders: Stakeholder[]
  ): Promise<void> {
    if (stakeholders.length === 0) {
      logger.info('[EXTRACTION] No stakeholders to save, skipping')
      return
    }

    // Step 1: Check existing stakeholders in database and filter out duplicates
    let stakeholdersToSave = stakeholders
    try {
      const existingStakeholdersResult = await client.query(
        `SELECT name FROM stakeholders WHERE project_id = $1`,
        [projectId]
      )
      
      const existingStakeholders = existingStakeholdersResult.rows
      
      if (existingStakeholders.length > 0) {
        // Create a set of normalized existing stakeholder names
        const existingNormalized = new Set<string>()
        existingStakeholders.forEach(existing => {
          const normalized = this.normalizeStakeholderName(existing.name)
          existingNormalized.add(normalized)
        })
        
        // Filter out stakeholders that match existing ones
        const newStakeholders: Stakeholder[] = []
        let skippedCount = 0
        
        stakeholders.forEach(stakeholder => {
          const normalized = this.normalizeStakeholderName(stakeholder.name)
          
          if (existingNormalized.has(normalized)) {
            // Match found - skip this stakeholder (already exists)
            skippedCount++
            logger.debug(`[DEDUP-DB] Skipping "${stakeholder.name}" - matches existing stakeholder`)
          } else {
            // New stakeholder - keep it
            newStakeholders.push(stakeholder)
          }
        })
        
        if (skippedCount > 0) {
          logger.info(`[DEDUP-DB] Skipped ${skippedCount} stakeholders that already exist in database (normalized name match)`)
        }
        
        stakeholdersToSave = newStakeholders
      }
    } catch (error) {
      logger.warn(`[DEDUP-DB] Failed to check existing stakeholders, proceeding with all extracted stakeholders:`, error)
      // If database check fails, proceed with all stakeholders (ON CONFLICT will handle exact duplicates)
    }

    if (stakeholdersToSave.length === 0) {
      logger.info('[EXTRACTION] All stakeholders already exist in database, nothing to save')
      return
    }

    const values: any[] = []
    const placeholders: string[] = []

    stakeholdersToSave.forEach((s, index) => {
      const offset = index * 10
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10})`
      )
      
      // Truncate fields to match database constraints
      const name = s.name?.substring(0, 255) || 'Unnamed Stakeholder'
      const role = s.role?.substring(0, 100) || 'Stakeholder'
      // Email is NOT NULL in database, use placeholder if missing
      const email = s.email?.substring(0, 255) || `${name.toLowerCase().replace(/\s+/g, '.')}@placeholder.local`
      
      // Normalize influence_level and interest_level to valid enum values
      const normalizeLevel = (level: string | undefined): 'high' | 'medium' | 'low' => {
        if (!level) return 'medium'
        const normalized = level.toLowerCase().trim()
        if (normalized === 'high' || normalized === 'medium' || normalized === 'low') {
          return normalized as 'high' | 'medium' | 'low'
        }
        // Default to medium for invalid values
        logger.debug(`[EXTRACTION] Invalid level "${level}", defaulting to medium`)
        return 'medium'
      }
      
      const interestLevel = normalizeLevel(s.interest_level)
      const influenceLevel = normalizeLevel(s.influence_level)
      
      // Resolve source_document_id if available
      const sourceDocumentId = (s as any).source_document_id || null
      
      // Log if truncation occurred
      if (s.name && s.name.length > 255) {
        logger.warn(`[EXTRACTION] Stakeholder name truncated from ${s.name.length} to 255 chars: "${s.name.substring(0, 50)}..."`)
      }
      if (s.role && s.role.length > 100) {
        logger.warn(`[EXTRACTION] Stakeholder role truncated from ${s.role.length} to 100 chars: "${s.role.substring(0, 50)}..."`)
      }
      
      values.push(
        projectId,
        name,
        role,
        email,
        interestLevel,
        influenceLevel,
        s.expectations || null,
        s.concerns || null,
        sourceDocumentId,
        userId
      )
    })

    await client.query(`
      INSERT INTO stakeholders (
        project_id, name, role, email, interest_level, influence_level, 
        expectations, concerns, source_document_id, created_by
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (project_id, name) DO UPDATE SET
        role = EXCLUDED.role,
        email = EXCLUDED.email,
        interest_level = EXCLUDED.interest_level,
        influence_level = EXCLUDED.influence_level,
        expectations = EXCLUDED.expectations,
        concerns = EXCLUDED.concerns,
        source_document_id = COALESCE(EXCLUDED.source_document_id, stakeholders.source_document_id),
        updated_at = CURRENT_TIMESTAMP
    `, values)

    logger.info(`[EXTRACTION] Saved ${stakeholdersToSave.length} stakeholders (${stakeholders.length - stakeholdersToSave.length} duplicates skipped)`)
  }

  /**
   * Save requirements to database
   */
  private async saveRequirements(
    client: PoolClient,
    projectId: string,
    userId: string,
    requirements: Requirement[]
  ): Promise<void> {
    if (requirements.length === 0) {
      logger.info('[EXTRACTION] No requirements to save, skipping')
      return
    }

    // Deduplicate requirements by title (AI sometimes extracts same requirement multiple times)
    const deduplicatedMap = new Map<string, Requirement>()
    
    requirements.forEach(req => {
      const normalizedTitle = req.title.trim().toLowerCase()
      
      if (!deduplicatedMap.has(normalizedTitle)) {
        deduplicatedMap.set(normalizedTitle, req)
      } else {
        // Duplicate found - merge details (keep most detailed version)
        const existing = deduplicatedMap.get(normalizedTitle)!
        const merged: Requirement = {
          ...existing,
          description: req.description || existing.description,
          type: req.type || existing.type,
          priority: req.priority || existing.priority,
          status: req.status || existing.status,
          acceptance_criteria: req.acceptance_criteria || existing.acceptance_criteria,
          source: req.source || existing.source
        }
        deduplicatedMap.set(normalizedTitle, merged)
        logger.debug(`[EXTRACTION-REQUIREMENTS] Merged duplicate requirement: "${req.title}"`)
      }
    })
    
    const uniqueRequirements = Array.from(deduplicatedMap.values())
    
    if (uniqueRequirements.length < requirements.length) {
      logger.info(`[EXTRACTION-REQUIREMENTS] Deduplicated ${requirements.length} → ${uniqueRequirements.length} requirements`)
    }

    const values: any[] = []
    const placeholders: string[] = []

    uniqueRequirements.forEach((r, index) => {
      const offset = index * 10
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10})`
      )
      
      // Convert acceptance_criteria string to array if it exists
      let acceptanceCriteria = null
      if (r.acceptance_criteria) {
        // If it's already an array, use it; otherwise split by newlines or commas
        acceptanceCriteria = Array.isArray(r.acceptance_criteria) 
          ? r.acceptance_criteria 
          : [r.acceptance_criteria]
      }
      
      // Map AI status values to database CHECK constraint values
      // DB allows: draft, approved, implemented, verified
      // AI returns: proposed, approved, in_progress, completed, deferred
      const statusMap: Record<string, string> = {
        'proposed': 'draft',
        'approved': 'approved',
        'in_progress': 'draft',
        'completed': 'implemented',
        'deferred': 'draft'
      }
      const mappedStatus = statusMap[r.status] || 'draft'
      
      // Map AI priority values to database CHECK constraint values
      // DB allows: high, medium, low
      // AI returns: critical, high, medium, low
      const priorityMap: Record<string, string> = {
        'critical': 'high',
        'very_high': 'high',
        'high': 'high',
        'medium': 'medium',
        'low': 'low',
        'very_low': 'low'
      }
      const mappedPriority = priorityMap[(r.priority || 'medium').toLowerCase()] || 'medium'
      
      // Map AI type values (hyphen to underscore)
      // DB allows: functional, non_functional, business, technical
      const typeMap: Record<string, string> = {
        'functional': 'functional',
        'non-functional': 'non_functional',
        'non_functional': 'non_functional',
        'business': 'business',
        'technical': 'technical'
      }
      const mappedType = typeMap[(r.type || 'functional').toLowerCase()] || 'functional'
      
      // Resolve source_document_id
      const sourceDocumentId = (r as any).source_document_id || null
      
      values.push(
        projectId,
        r.title,        // For title column
        r.title,        // For name column (NOT NULL requirement)
        r.description,
        mappedType,     // Use mapped type value
        mappedPriority, // Use mapped priority value
        mappedStatus,   // Use mapped status value
        acceptanceCriteria,
        sourceDocumentId,
        userId
      )
    })

    await client.query(`
      INSERT INTO requirements (
        project_id, title, name, description, type, priority, status, 
        acceptance_criteria, source_document_id, created_by
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (project_id, name) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        type = EXCLUDED.type,
        priority = EXCLUDED.priority,
        status = EXCLUDED.status,
        acceptance_criteria = EXCLUDED.acceptance_criteria,
        source_document_id = COALESCE(EXCLUDED.source_document_id, requirements.source_document_id),
        updated_at = CURRENT_TIMESTAMP
    `, values)

    logger.info(`[EXTRACTION] Saved ${uniqueRequirements.length} requirements (deduplicated from ${requirements.length})`)
  }

  /**
   * Save risks to database
   */
  private async saveRisks(
    client: PoolClient,
    projectId: string,
    userId: string,
    risks: Risk[]
  ): Promise<void> {
    if (risks.length === 0) {
      logger.info('[EXTRACTION] No risks to save, skipping')
      return
    }

    // Deduplicate risks by title (AI sometimes extracts same risk multiple times)
    const deduplicatedMap = new Map<string, Risk>()
    
    risks.forEach(risk => {
      const normalizedTitle = risk.title.trim().toLowerCase()
      
      if (!deduplicatedMap.has(normalizedTitle)) {
        // First occurrence - add to map
        deduplicatedMap.set(normalizedTitle, risk)
      } else {
        // Duplicate found - merge details (keep most detailed version)
        const existing = deduplicatedMap.get(normalizedTitle)!
        const merged: Risk = {
          ...existing,
          description: risk.description || existing.description,
          category: risk.category || existing.category,
          probability: risk.probability || existing.probability,
          impact: risk.impact || existing.impact,
          mitigation_strategy: risk.mitigation_strategy || existing.mitigation_strategy,
          contingency_plan: risk.contingency_plan || existing.contingency_plan
        }
        deduplicatedMap.set(normalizedTitle, merged)
        logger.debug(`[EXTRACTION-RISKS] Merged duplicate risk: "${risk.title}"`)
      }
    })
    
    const uniqueRisks = Array.from(deduplicatedMap.values())
    
    if (uniqueRisks.length < risks.length) {
      logger.info(`[EXTRACTION-RISKS] Deduplicated ${risks.length} → ${uniqueRisks.length} risks`)
    }

    const values: any[] = []
    const placeholders: string[] = []

      uniqueRisks.forEach((r, index) => {
      const offset = index * 14  // Updated to 14 values per risk
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14})`
      )
      
      // Validate placeholder count matches expected values count
      const expectedValuesPerRisk = 14  // Updated: project_id, name, description, category, probability, impact, risk_level, mitigation_strategy, contingency_plan, owner, status, title, created_by, source_document_id
      const expectedTotalValues = (index + 1) * expectedValuesPerRisk
      
      // Map AI impact values to database CHECK constraint values
      // DB allows: high, medium, low (exact match required, case-sensitive)
      // AI returns: critical, very_high, high, medium, low
      // IMPORTANT: Validate that impact is actually a risk level, not mitigation_strategy or other text
      const impactMap: Record<string, string> = {
        'critical': 'high',
        'very_high': 'high',
        'high': 'high',
        'medium': 'medium',
        'low': 'low',
        'very_low': 'low'
      }
      const rawImpact = String(r.impact || 'medium').toLowerCase().trim()
      
      // Check if impact looks like it might be mitigation_strategy or other text (too long)
      let mappedImpact = 'medium' // Default
      if (rawImpact.length <= 10 && impactMap[rawImpact]) {
        mappedImpact = impactMap[rawImpact]
      } else {
        logger.warn(`[EXTRACTION-RISKS] Impact value looks invalid (too long or not a risk level): "${rawImpact}", defaulting to 'medium'`, {
          title: r.title,
          impact: r.impact,
          impactLength: rawImpact.length
        })
      }
      
      // Map AI probability values to database CHECK constraint values
      // DB allows: high, medium, low (exact match required, case-sensitive)
      // AI returns: critical, very_high, high, medium, low
      // IMPORTANT: Validate that probability is actually a risk level, not mitigation_strategy or other text
      const probabilityMap: Record<string, string> = {
        'critical': 'high',
        'very_high': 'high',
        'high': 'high',
        'medium': 'medium',
        'low': 'low',
        'very_low': 'low'
      }
      const rawProbability = String(r.probability || 'medium').toLowerCase().trim()
      
      // Check if probability looks like it might be mitigation_strategy or other text (too long)
      let mappedProbability = 'medium' // Default
      if (rawProbability.length <= 10 && probabilityMap[rawProbability]) {
        mappedProbability = probabilityMap[rawProbability]
      } else {
        logger.warn(`[EXTRACTION-RISKS] Probability value looks invalid (too long or not a risk level): "${rawProbability}", defaulting to 'medium'`, {
          title: r.title,
          probability: r.probability,
          probabilityLength: rawProbability.length
        })
      }
      
      // IMPORTANT: risk_level is organizational level ('project', 'program', 'portfolio', 'systemic'), NOT severity
      // For extracted risks from documents, risk_level should always be 'project'
      // Severity is calculated separately and stored in the 'severity' column (if it exists)
      const riskLevel = 'project' // Extracted risks are always project-level
      
      // Resolve source_document_id
      const sourceDocumentId = (r as any).source_document_id || null
      
      // Log final values for debugging
      logger.debug(`[EXTRACTION-RISKS] Final risk values`, {
        title: r.title,
        probability: mappedProbability,
        impact: mappedImpact,
        risk_level: riskLevel, // Always 'project' for extracted risks
        severity: 'calculated separately' // Severity is different from risk_level
      })
      
      // CRITICAL: Final validation before pushing to values array
      // Ensure probability and impact are valid
      const cleanProbability = String(mappedProbability || 'medium').toLowerCase().trim()
      const cleanImpact = String(mappedImpact || 'medium').toLowerCase().trim()
      
      const finalProbability = (['very_high', 'high', 'medium', 'low', 'very_low'].includes(cleanProbability)) ? cleanProbability : 'medium'
      const finalImpact = (['very_high', 'high', 'medium', 'low', 'very_low'].includes(cleanImpact)) ? cleanImpact : 'medium'
      
      // Ensure risk_level is valid organizational level
      const finalRiskLevel = 'project' // Always 'project' for extracted risks
      
      values.push(
        projectId,
        r.title || '',        // name column (required, comes first)
        r.description || '',
        r.category || null,
        finalProbability,  // Use validated probability value
        finalImpact,       // Use validated impact value
        finalRiskLevel,    // Always 'project' for extracted risks (organizational level, not severity)
        r.mitigation_strategy || null,
        r.contingency_plan || null,
        r.owner || null,      // owner column
        'identified',        // status column (default value)
        r.title || '',        // title column (comes after name in schema)
        userId,              // created_by
        sourceDocumentId     // source_document_id
      )
    })

    // CRITICAL: Final validation pass - check all values before insert
    // Values array structure: [projectId, name, description, category, probability, impact, risk_level, mitigation_strategy, contingency_plan, owner, status, title, created_by, source_document_id]
    // For each risk (14 values per risk), validate probability (index 4), impact (index 5), risk_level (index 6)
    // NOTE: risk_level is organizational level ('project', 'program', 'portfolio', 'systemic'), NOT severity
    // For extracted risks, risk_level should always be 'project'
    const validRiskLevels = ['project', 'program', 'portfolio', 'systemic']
    const validProbabilities = ['very_high', 'high', 'medium', 'low', 'very_low']
    const validImpacts = ['very_high', 'high', 'medium', 'low', 'very_low']
    
    for (let i = 0; i < uniqueRisks.length; i++) {
      const probabilityIndex = i * 14 + 4  // Updated index: 0=projectId, 1=name, 2=description, 3=category, 4=probability
      const impactIndex = i * 14 + 5       // Updated index: 5=impact
      const riskLevelIndex = i * 14 + 6    // Updated index: 6=risk_level
      
      if (probabilityIndex < values.length && impactIndex < values.length && riskLevelIndex < values.length) {
        const prob = String(values[probabilityIndex] || '').toLowerCase().trim()
        const impact = String(values[impactIndex] || '').toLowerCase().trim()
        const riskLevel = String(values[riskLevelIndex] || '').toLowerCase().trim()
        
        // Fix any invalid probability values
        if (!validProbabilities.includes(prob)) {
          logger.error(`[EXTRACTION-RISKS] Invalid probability value in values array: "${prob}", fixing to 'medium'`, {
            index: probabilityIndex,
            riskIndex: i,
            title: uniqueRisks[i].title
          })
          values[probabilityIndex] = 'medium'
        }
        
        // Fix any invalid impact values
        if (!validImpacts.includes(impact)) {
          logger.error(`[EXTRACTION-RISKS] Invalid impact value in values array: "${impact}", fixing to 'medium'`, {
            index: impactIndex,
            riskIndex: i,
            title: uniqueRisks[i].title
          })
          values[impactIndex] = 'medium'
        }
        
        // Fix risk_level - must be organizational level, not severity
        // Always normalize risk_level value (trim and lowercase) before inserting
        // For extracted risks, always use 'project' level
        if (!validRiskLevels.includes(riskLevel)) {
          logger.error(`[EXTRACTION-RISKS] Invalid risk_level value in values array: "${riskLevel}" (expected organizational level: project/program/portfolio/systemic), fixing to 'project'`, {
            index: riskLevelIndex,
            riskIndex: i,
            title: uniqueRisks[i].title,
            probability: prob,
            impact: impact
          })
          // Extracted risks are always project-level
          values[riskLevelIndex] = 'project'
        } else {
          // Normalize valid risk_level value to ensure no whitespace/casing issues
          values[riskLevelIndex] = riskLevel
        }
      }
    }

    await client.query(`
      INSERT INTO risks (
        project_id, name, description, category, probability, impact, risk_level,
        mitigation_strategy, contingency_plan, owner, status, title, created_by, source_document_id
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (project_id, name) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        probability = EXCLUDED.probability,
        impact = EXCLUDED.impact,
        risk_level = EXCLUDED.risk_level,
        mitigation_strategy = EXCLUDED.mitigation_strategy,
        contingency_plan = EXCLUDED.contingency_plan,
        source_document_id = COALESCE(EXCLUDED.source_document_id, risks.source_document_id),
        updated_at = CURRENT_TIMESTAMP
    `, values)

    logger.info(`[EXTRACTION] Saved ${risks.length} risks`)
  }

  /**
   * Save milestones to database
   */
  private async saveMilestones(
    client: PoolClient,
    projectId: string,
    userId: string,
    milestones: Milestone[]
  ): Promise<void> {
    if (milestones.length === 0) {
      logger.info('[EXTRACTION] No milestones to save, skipping')
      return
    }

    // Deduplicate milestones by name (AI sometimes extracts same milestone multiple times)
    const deduplicatedMap = new Map<string, Milestone>()
    
    milestones.forEach(milestone => {
      const normalizedName = milestone.name.trim().toLowerCase()
      
      if (!deduplicatedMap.has(normalizedName)) {
        deduplicatedMap.set(normalizedName, milestone)
      } else {
        // Duplicate found - merge details (keep most detailed version)
        const existing = deduplicatedMap.get(normalizedName)!
        const merged: Milestone = {
          ...existing,
          description: milestone.description || existing.description,
          due_date: milestone.due_date || existing.due_date,
          status: milestone.status || existing.status,
          deliverables: milestone.deliverables?.length ? milestone.deliverables : existing.deliverables,
          dependencies: milestone.dependencies?.length ? milestone.dependencies : existing.dependencies
        }
        deduplicatedMap.set(normalizedName, merged)
        logger.debug(`[EXTRACTION-MILESTONES] Merged duplicate milestone: "${milestone.name}"`)
      }
    })
    
    const uniqueMilestones = Array.from(deduplicatedMap.values())
    
    if (uniqueMilestones.length < milestones.length) {
      logger.info(`[EXTRACTION-MILESTONES] Deduplicated ${milestones.length} → ${uniqueMilestones.length} milestones`)
    }

    const values: any[] = []
    const placeholders: string[] = []

    uniqueMilestones.forEach((m, index) => {
      const offset = index * 7
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7})`
      )
      
      // Convert quarter dates like '2025-Q4' to actual dates using utility function
      // due_date is NOT NULL, so provide a default date if missing (1 year from now)
      let dueDate = convertQuarterDate(m.due_date)
      if (!dueDate) {
        // Default to 1 year from now if no date provided
        const defaultDate = new Date()
        defaultDate.setFullYear(defaultDate.getFullYear() + 1)
        dueDate = defaultDate.toISOString().split('T')[0]
      }
      
      // Map AI status values to database CHECK constraint values
      // DB allows: planned, in_progress, completed, delayed
      const statusMap: Record<string, string> = {
        'pending': 'planned',
        'planned': 'planned',
        'not_started': 'planned',
        'in_progress': 'in_progress',
        'active': 'in_progress',
        'completed': 'completed',
        'done': 'completed',
        'delayed': 'delayed',
        'overdue': 'delayed'
      }
      const mappedStatus = statusMap[(m.status || 'planned').toLowerCase()] || 'planned'
      
      // Resolve source_document_id
      const sourceDocumentId = (m as any).source_document_id || null
      
      values.push(
        projectId,
        m.name,
        m.description,
        dueDate,
        mappedStatus,  // Use mapped status value
        sourceDocumentId,
        userId
      )
    })

    await client.query(`
      INSERT INTO milestones (
        project_id, name, description, due_date, status, source_document_id, created_by
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (project_id, name) DO UPDATE SET
        description = EXCLUDED.description,
        due_date = EXCLUDED.due_date,
        status = EXCLUDED.status,
        source_document_id = COALESCE(EXCLUDED.source_document_id, milestones.source_document_id),
        updated_at = CURRENT_TIMESTAMP
    `, values)

    logger.info(`[EXTRACTION] Saved ${uniqueMilestones.length} milestones (deduplicated from ${milestones.length})`)
  }

  /**
   * Save constraints to database
   */
  private async saveConstraints(
    client: PoolClient,
    projectId: string,
    userId: string,
    constraints: Constraint[]
  ): Promise<void> {
    if (constraints.length === 0) {
      logger.info('[EXTRACTION] No constraints to save, skipping')
      return
    }

    // Deduplicate by title (ON CONFLICT requires unique titles)
    const uniqueConstraints = Array.from(
      new Map(constraints.map(c => [(c.title || '').toLowerCase().trim(), c])).values()
    )
    
    if (uniqueConstraints.length < constraints.length) {
      logger.warn(`[EXTRACTION] Deduplicated constraints: ${constraints.length} → ${uniqueConstraints.length}`)
    }

    const values: any[] = []
    const placeholders: string[] = []

    uniqueConstraints.forEach((c, index) => {
      const offset = index * 7
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7})`
      )
      
      // Map AI type values to database CHECK constraint values
      // DB allows: budget, time, resource, technical, regulatory, business
      const typeMap: Record<string, string> = {
        'cost': 'budget',
        'financial': 'budget',
        'budget': 'budget',
        'time': 'time',
        'schedule': 'time',
        'resource': 'resource',
        'resources': 'resource',
        'technical': 'technical',
        'technology': 'technical',
        'regulatory': 'regulatory',
        'compliance': 'regulatory',
        'business': 'business'
      }
      const mappedType = typeMap[(c.type || 'business').toLowerCase()] || 'business'
      
      // Resolve source_document_id
      const sourceDocumentId = (c as any).source_document_id || null
      
      values.push(
        projectId,
        c.title,        // For title column
        c.title,        // For name column (NOT NULL)
        c.description,
        mappedType,     // Use mapped type value
        sourceDocumentId,
        userId
      )
    })

    await client.query(`
      INSERT INTO constraints (
        project_id, title, name, description, type, source_document_id, created_by
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (project_id, name) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        source_document_id = COALESCE(EXCLUDED.source_document_id, constraints.source_document_id),
        type = EXCLUDED.type,
        updated_at = CURRENT_TIMESTAMP
    `, values)

    logger.info(`[EXTRACTION] Saved ${uniqueConstraints.length} constraints`)
  }

  /**
   * Save success criteria to database
   */
  private async saveSuccessCriteria(
    client: PoolClient,
    projectId: string,
    userId: string,
    successCriteria: SuccessCriterion[]
  ): Promise<void> {
    if (successCriteria.length === 0) {
      logger.info('[EXTRACTION] No success_criteria to save, skipping')
      return
    }

    // Deduplicate by title (ON CONFLICT requires unique titles)
    const uniqueCriteria = Array.from(
      new Map(successCriteria.map(sc => [(sc.title || '').toLowerCase().trim(), sc])).values()
    )
    
    if (uniqueCriteria.length < successCriteria.length) {
      logger.warn(`[EXTRACTION] Deduplicated success_criteria: ${successCriteria.length} → ${uniqueCriteria.length}`)
    }

    const values: any[] = []
    const placeholders: string[] = []

    uniqueCriteria.forEach((sc, index) => {
      const offset = index * 9
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9})`
      )
      
      // Extract numeric value using improved safeNumber logic
      const extractNumeric = (value: string | number | null | undefined): number | null => {
        if (typeof value === 'number') return Number.isFinite(value) ? value : null
        if (!value) return null
        
        const extracted = this.safeNumber(value)
        if (extracted === undefined) {
          logger.debug(`[EXTRACTION] Could not extract numeric from: ${value}, setting to null`)
          return null
        }
        return extracted
      }
      
      const targetValue = extractNumeric(sc.target_value)
      
      // Resolve source_document_id
      const sourceDocumentId = (sc as any).source_document_id || null
      
      values.push(
        projectId,
        sc.title,        // For title column
        sc.title,        // For name column (NOT NULL)
        sc.description,
        sc.metric,
        targetValue,     // Use extracted numeric value
        sc.measurement_method,
        sourceDocumentId,
        userId
      )
    })

    await client.query(`
      INSERT INTO success_criteria (
        project_id, title, name, description, metric, target_value, measurement_method, source_document_id, created_by
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (project_id, name) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        metric = EXCLUDED.metric,
        target_value = EXCLUDED.target_value,
        measurement_method = EXCLUDED.measurement_method,
        source_document_id = COALESCE(EXCLUDED.source_document_id, success_criteria.source_document_id),
        updated_at = CURRENT_TIMESTAMP
    `, values)

    logger.info(`[EXTRACTION] Saved ${uniqueCriteria.length} success criteria`)
  }

  /**
   * Save best practices to database
   */
  private async saveBestPractices(
    client: PoolClient,
    projectId: string,
    userId: string,
    bestPractices: BestPractice[]
  ): Promise<void> {
    if (bestPractices.length === 0) {
      logger.info('[EXTRACTION] No best_practices to save, skipping')
      return
    }

    // Deduplicate best practices by title (AI sometimes extracts same practice multiple times)
    const deduplicatedMap = new Map<string, BestPractice>()
    
    bestPractices.forEach(bp => {
      const normalizedTitle = bp.title.trim().toLowerCase()
      
      if (!deduplicatedMap.has(normalizedTitle)) {
        // First occurrence - add to map
        deduplicatedMap.set(normalizedTitle, bp)
      } else {
        // Duplicate found - merge details (keep most detailed version)
        const existing = deduplicatedMap.get(normalizedTitle)!
        const merged: BestPractice = {
          ...existing,
          description: bp.description || existing.description,
          category: bp.category || existing.category
        }
        deduplicatedMap.set(normalizedTitle, merged)
        logger.debug(`[EXTRACTION-BEST_PRACTICES] Merged duplicate: "${bp.title}"`)
      }
    })
    
    const uniqueBestPractices = Array.from(deduplicatedMap.values())
    
    if (uniqueBestPractices.length < bestPractices.length) {
      logger.info(`[EXTRACTION-BEST_PRACTICES] Deduplicated ${bestPractices.length} → ${uniqueBestPractices.length} best practices`)
    }

    const values: any[] = []
    const placeholders: string[] = []

    uniqueBestPractices.forEach((bp, index) => {
      const offset = index * 6
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6})`
      )
      
      // Resolve source_document_id
      const sourceDocumentId = (bp as any).source_document_id || null
      
      values.push(
        projectId,
        bp.title,
        bp.description,
        bp.category,
        sourceDocumentId,
        userId
      )
    })

    await client.query(`
      INSERT INTO best_practices (
        project_id, title, description, category, source_document_id, created_by
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (project_id, title) DO UPDATE SET
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        source_document_id = COALESCE(EXCLUDED.source_document_id, best_practices.source_document_id),
        updated_at = CURRENT_TIMESTAMP
    `, values)

    logger.info(`[EXTRACTION] Saved ${bestPractices.length} best practices`)
  }

  /**
   * Save phases to database
   */
  private async savePhases(
    client: PoolClient,
    projectId: string,
    userId: string,
    phases: Phase[]
  ): Promise<void> {
    if (phases.length === 0) {
      logger.info('[EXTRACTION] No phases to save, skipping')
      return
    }

    // Deduplicate phases by name (AI sometimes extracts same phase multiple times)
    const deduplicatedMap = new Map<string, Phase>()
    
    phases.forEach(phase => {
      const normalizedName = phase.name.trim().toLowerCase()
      
      if (!deduplicatedMap.has(normalizedName)) {
        deduplicatedMap.set(normalizedName, phase)
      } else {
        // Duplicate found - merge details (keep most detailed version)
        const existing = deduplicatedMap.get(normalizedName)!
        const merged: Phase = {
          ...existing,
          description: phase.description || existing.description,
          start_date: phase.start_date || existing.start_date,
          end_date: phase.end_date || existing.end_date,
          status: phase.status || existing.status
        }
        deduplicatedMap.set(normalizedName, merged)
        logger.debug(`[EXTRACTION-PHASES] Merged duplicate phase: "${phase.name}"`)
      }
    })
    
    const uniquePhases = Array.from(deduplicatedMap.values())
    
    if (uniquePhases.length < phases.length) {
      logger.info(`[EXTRACTION-PHASES] Deduplicated ${phases.length} → ${uniquePhases.length} phases`)
    }

    const values: any[] = []
    const placeholders: string[] = []

    uniquePhases.forEach((p, index) => {
      const offset = index * 8
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8})`
      )
      
      // Validate and sanitize dates using utility functions
      // Use normalizeDate to extract dates from strings like "Prior to 2025-11-15"
      let startDate = this.normalizeDate(p.start_date)
      let endDate = this.normalizeDate(p.end_date)
      
      // start_date is NOT NULL in database - provide default if missing
      if (!startDate) {
        startDate = getCurrentDate()
        logger.warn(`[EXTRACTION] Phase "${p.name}" missing start_date, defaulting to ${startDate}`)
      }
      
      // end_date is NOT NULL in database - provide default if missing
      if (!endDate) {
        // Default: 30 days after start_date
        endDate = addDays(startDate, 30)
        logger.warn(`[EXTRACTION] Phase "${p.name}" missing end_date, defaulting to ${endDate}`)
      }
      
      // Resolve source_document_id
      const sourceDocumentId = (p as any).source_document_id || null
      
      values.push(
        projectId,
        p.name,
        p.description,
        startDate,
        endDate,
        p.status,
        sourceDocumentId,
        userId
      )
    })

    await client.query(`
      INSERT INTO phases (
        project_id, name, description, start_date, end_date, status, source_document_id, created_by
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (project_id, name) DO UPDATE SET
        description = EXCLUDED.description,
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date,
        status = EXCLUDED.status,
        source_document_id = COALESCE(EXCLUDED.source_document_id, phases.source_document_id),
        updated_at = CURRENT_TIMESTAMP
    `, values)

    logger.info(`[EXTRACTION] Saved ${uniquePhases.length} phases (deduplicated from ${phases.length})`)
  }

  /**
   * Save resources to database
   */
  private async saveResources(
    client: PoolClient,
    projectId: string,
    userId: string,
    resources: Resource[]
  ): Promise<void> {
    if (resources.length === 0) {
      logger.info('[EXTRACTION] No resources to save, skipping')
      return
    }

    // Deduplicate by name (ON CONFLICT requires unique names)
    const uniqueResources = Array.from(
      new Map(resources.map(r => [r.name.toLowerCase().trim(), r])).values()
    )
    
    if (uniqueResources.length < resources.length) {
      logger.warn(`[EXTRACTION] Deduplicated resources: ${resources.length} → ${uniqueResources.length}`)
    }

    const values: any[] = []
    const placeholders: string[] = []

    uniqueResources.forEach((r, index) => {
      const offset = index * 15
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14}, $${offset + 15})`
      )
      
      // Map AI resource types to database CHECK constraint values
      // DB allows: human, equipment, material, software, facility, budget
      // AI returns: financial, human, equipment, material, software, facility
      const typeMap: Record<string, string> = {
        'financial': 'budget',
        'budget': 'budget',
        'money': 'budget',
        'funding': 'budget',
        'human': 'human',
        'people': 'human',
        'staff': 'human',
        'equipment': 'equipment',
        'hardware': 'equipment',
        'material': 'material',
        'software': 'software',
        'facility': 'facility',
        'facilities': 'facility'
      }
      const mappedType = typeMap[(r.type || 'material').toLowerCase()] || 'material'

      const allowedCompetencies = new Set(['junior', 'intermediate', 'senior', 'expert'])
      const competency = (r.competency_level || '').toLowerCase()
      const competencyLevel = allowedCompetencies.has(competency) ? competency : null

      const performanceRatingRaw = this.safeNumber(r.performance_rating)
      const performanceRating =
        performanceRatingRaw === undefined ? null : Math.max(0, Math.min(10, performanceRatingRaw))
      
      // Resolve source_document_id
      const sourceDocumentId = (r as any).source_document_id || null
      
      values.push(
        projectId,
        r.name,
        mappedType,  // Use mapped type value
        r.role || null,
        r.allocation || null,
        r.availability || null,
        this.ensureStringArray(r.skills),
        competencyLevel,
        this.ensureStringArray(r.certifications),
        this.ensureStringArray(r.training_needs),
        r.team_assignment ? r.team_assignment.substring(0, 255) : null,
        performanceRating,
        r.development_plan || null,
        sourceDocumentId,
        // Align created_by as last column
        userId
      )
    })

    await client.query(`
      INSERT INTO resources (
        project_id, name, type, role, allocation, availability, skills,
        competency_level, certifications, training_needs, team_assignment,
        performance_rating, development_plan, source_document_id, created_by
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (project_id, name) DO UPDATE SET
        type = EXCLUDED.type,
        role = EXCLUDED.role,
        allocation = EXCLUDED.allocation,
        availability = EXCLUDED.availability,
        skills = EXCLUDED.skills,
        competency_level = EXCLUDED.competency_level,
        certifications = EXCLUDED.certifications,
        training_needs = EXCLUDED.training_needs,
        team_assignment = EXCLUDED.team_assignment,
        performance_rating = EXCLUDED.performance_rating,
        development_plan = EXCLUDED.development_plan,
        source_document_id = COALESCE(EXCLUDED.source_document_id, resources.source_document_id),
        updated_at = CURRENT_TIMESTAMP
    `, values)

    logger.info(`[EXTRACTION] Saved ${uniqueResources.length} resources`)
  }

  /**
   * Save technologies to database
   */
  private async saveTechnologies(
    client: PoolClient,
    projectId: string,
    userId: string,
    technologies: Technology[]
  ): Promise<void> {
    if (technologies.length === 0) {
      logger.info('[EXTRACTION] No technologies to save, skipping')
      return
    }

    // Deduplicate by name (ON CONFLICT requires unique names)
    const uniqueTechnologies = Array.from(
      new Map(technologies.map(t => [t.name.toLowerCase().trim(), t])).values()
    )
    
    if (uniqueTechnologies.length < technologies.length) {
      logger.warn(`[EXTRACTION] Deduplicated technologies: ${technologies.length} → ${uniqueTechnologies.length}`)
    }

    const values: any[] = []
    const placeholders: string[] = []

    uniqueTechnologies.forEach((t, index) => {
      const offset = index * 10
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10})`
      )
      
      // Resolve source_document_id
      const sourceDocumentId = (t as any).source_document_id || null
      
      values.push(
        projectId,
        t.name,
        t.category || 'other',
        t.description || null,
        t.version || null,
        t.purpose || null,
        t.license || null,
        t.vendor || null,
        sourceDocumentId,
        userId
      )
    })

    await client.query(`
      INSERT INTO technologies (
        project_id, name, category, description, version, purpose, license, vendor, source_document_id, created_by
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (project_id, name) DO UPDATE SET
        category = EXCLUDED.category,
        description = EXCLUDED.description,
        version = EXCLUDED.version,
        purpose = EXCLUDED.purpose,
        license = EXCLUDED.license,
        vendor = EXCLUDED.vendor,
        source_document_id = COALESCE(EXCLUDED.source_document_id, technologies.source_document_id),
        updated_at = CURRENT_TIMESTAMP
    `, values)

    logger.info(`[EXTRACTION] Saved ${uniqueTechnologies.length} technologies`)
  }

  /**
   * Save quality standards to database
   */
  private async saveQualityStandards(
    client: PoolClient,
    projectId: string,
    userId: string,
    qualityStandards: QualityStandard[]
  ): Promise<void> {
    if (qualityStandards.length === 0) {
      logger.info('[EXTRACTION] No quality_standards to save, skipping')
      return
    }

    // Deduplicate quality standards by title (AI sometimes extracts same standard multiple times)
    const deduplicatedMap = new Map<string, QualityStandard>()
    
    qualityStandards.forEach(qs => {
      const normalizedTitle = qs.title.trim().toLowerCase()
      
      if (!deduplicatedMap.has(normalizedTitle)) {
        deduplicatedMap.set(normalizedTitle, qs)
      } else {
        // Duplicate found - merge details (keep most detailed version)
        const existing = deduplicatedMap.get(normalizedTitle)!
        const merged: QualityStandard = {
          ...existing,
          description: qs.description || existing.description,
          category: qs.category || existing.category,
          measurement_criteria: qs.measurement_criteria || existing.measurement_criteria
        }
        deduplicatedMap.set(normalizedTitle, merged)
        logger.debug(`[EXTRACTION-QUALITY_STANDARDS] Merged duplicate standard: "${qs.title}"`)
      }
    })
    
    const uniqueQualityStandards = Array.from(deduplicatedMap.values())
    
    if (uniqueQualityStandards.length < qualityStandards.length) {
      logger.info(`[EXTRACTION-QUALITY_STANDARDS] Deduplicated ${qualityStandards.length} → ${uniqueQualityStandards.length} quality standards`)
    }

    const values: any[] = []
    const placeholders: string[] = []

    uniqueQualityStandards.forEach((qs, index) => {
      const offset = index * 8
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8})`
      )
      
      // Resolve source_document_id
      const sourceDocumentId = (qs as any).source_document_id || null
      
      values.push(
        projectId,
        qs.title,        // For title column
        qs.title,        // For standard_name column (NOT NULL)
        qs.description,
        qs.category,
        qs.measurement_criteria || null,
        sourceDocumentId,
        userId
      )
    })

    await client.query(`
      INSERT INTO quality_standards (
        project_id, title, standard_name, description, category, 
        measurement_criteria, source_document_id, created_by
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (project_id, standard_name) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        measurement_criteria = EXCLUDED.measurement_criteria,
        source_document_id = COALESCE(EXCLUDED.source_document_id, quality_standards.source_document_id),
        updated_at = CURRENT_TIMESTAMP
    `, values)

    logger.info(`[EXTRACTION] Saved ${uniqueQualityStandards.length} quality standards (deduplicated from ${qualityStandards.length})`)
  }

  /**
   * Save compliance security requirements to database
   */
  private async saveComplianceSecurity(
    client: PoolClient,
    projectId: string,
    userId: string,
    complianceSecurityItems: ComplianceSecurity[]
  ): Promise<void> {
    if (complianceSecurityItems.length === 0) {
      logger.info('[EXTRACTION] No compliance_security items to save, skipping')
      return
    }

    // Deduplicate by title (AI sometimes extracts same requirement multiple times)
    const deduplicatedMap = new Map<string, ComplianceSecurity>()
    
    complianceSecurityItems.forEach(item => {
      const normalizedTitle = (item.title || '').trim().toLowerCase()
      
      if (!normalizedTitle) {
        // Skip items without titles
        return
      }
      
      if (!deduplicatedMap.has(normalizedTitle)) {
        deduplicatedMap.set(normalizedTitle, item)
      } else {
        // Duplicate found - merge details (keep most detailed version)
        const existing = deduplicatedMap.get(normalizedTitle)!
        const merged: ComplianceSecurity = {
          ...existing,
          ...item,
          // Merge boolean fields (if new value is true, keep it)
          multi_factor_authentication: item.multi_factor_authentication ?? existing.multi_factor_authentication,
          ip_address_restriction: item.ip_address_restriction ?? existing.ip_address_restriction,
          // Merge scores (keep higher score)
          security_score: item.security_score !== undefined && existing.security_score !== undefined
            ? Math.max(item.security_score, existing.security_score)
            : item.security_score ?? existing.security_score,
          compliance_score: item.compliance_score !== undefined && existing.compliance_score !== undefined
            ? Math.max(item.compliance_score, existing.compliance_score)
            : item.compliance_score ?? existing.compliance_score,
        }
        deduplicatedMap.set(normalizedTitle, merged)
        logger.debug(`[EXTRACTION-COMPLIANCE-SECURITY] Merged duplicate item: "${item.title}"`)
      }
    })
    
    const uniqueItems = Array.from(deduplicatedMap.values())
    
    if (uniqueItems.length < complianceSecurityItems.length) {
      logger.info(`[EXTRACTION-COMPLIANCE-SECURITY] Deduplicated ${complianceSecurityItems.length} → ${uniqueItems.length} items`)
    }

    const values: any[] = []
    const placeholders: string[] = []

    uniqueItems.forEach((item, index) => {
      const offset = index * 72 // 72 columns total
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14}, $${offset + 15}, $${offset + 16}, $${offset + 17}, $${offset + 18}, $${offset + 19}, $${offset + 20}, $${offset + 21}, $${offset + 22}, $${offset + 23}, $${offset + 24}, $${offset + 25}, $${offset + 26}, $${offset + 27}, $${offset + 28}, $${offset + 29}, $${offset + 30}, $${offset + 31}, $${offset + 32}, $${offset + 33}, $${offset + 34}, $${offset + 35}, $${offset + 36}, $${offset + 37}, $${offset + 38}, $${offset + 39}, $${offset + 40}, $${offset + 41}, $${offset + 42}, $${offset + 43}, $${offset + 44}, $${offset + 45}, $${offset + 46}, $${offset + 47}, $${offset + 48}, $${offset + 49}, $${offset + 50}, $${offset + 51}, $${offset + 52}, $${offset + 53}, $${offset + 54}, $${offset + 55}, $${offset + 56}, $${offset + 57}, $${offset + 58}, $${offset + 59}, $${offset + 60}, $${offset + 61}, $${offset + 62}, $${offset + 63}, $${offset + 64}, $${offset + 65}, $${offset + 66}, $${offset + 67}, $${offset + 68}, $${offset + 69}, $${offset + 70}, $${offset + 71}, $${offset + 72})`
      )
      
      // Resolve source_document_id
      const sourceDocumentId = (item as any).source_document_id || null
      
      // Parse latest_breach date if provided as string
      let latestBreachDate: Date | null = null
      if (item.latest_breach) {
        const parsed = new Date(item.latest_breach)
        if (!isNaN(parsed.getTime())) {
          latestBreachDate = parsed
        }
      }
      
      // Ensure scores are within valid range
      const securityScore = item.security_score !== undefined 
        ? Math.max(0, Math.min(10, item.security_score)) 
        : null
      const complianceScore = item.compliance_score !== undefined 
        ? Math.max(0, Math.min(10, item.compliance_score)) 
        : null
      
      // Ensure category is valid
      const category = ['compliance', 'security', 'legal', 'standard'].includes(item.category)
        ? item.category
        : 'standard'
      
      // Ensure status is valid
      const status = ['applicable', 'not_applicable', 'partial', 'compliant', 'non_compliant'].includes(item.status || '')
        ? (item.status || 'applicable')
        : 'applicable'
      
      values.push(
        projectId,
        item.title,
        category,
        item.type || null,
        item.description || null,
        item.requirement_text || null,
        status,
        securityScore,
        latestBreachDate,
        item.data_at_rest_encryption || null,
        item.multi_factor_authentication ?? null,
        item.ip_address_restriction ?? null,
        item.user_audit_trail ?? null,
        item.admin_audit_trail ?? null,
        item.data_audit_trail ?? null,
        item.user_can_upload_data ?? null,
        item.data_classification ?? null,
        item.remember_password ?? null,
        item.user_roles_support ?? null,
        item.file_sharing ?? null,
        item.valid_certificate_name || null,
        item.trusted_certificate ?? null,
        item.encryption_protocol || null,
        item.heartbleed_patched ?? null,
        item.http_security_headers ?? null,
        item.supports_saml ?? null,
        item.protected_against_drown ?? null,
        item.penetration_testing ?? null,
        item.requires_user_authentication ?? null,
        item.password_policy || null,
        // Compliance Standards
        item.iso_27001 ?? null,
        item.iso_27018 ?? null,
        item.iso_27017 ?? null,
        item.iso_27002 ?? null,
        item.finra ?? null,
        item.fisma ?? null,
        item.gaap ?? null,
        item.hipaa ?? null,
        item.isae_3402 ?? null,
        item.itar ?? null,
        item.soc_1 ?? null,
        item.soc_2 ?? null,
        item.soc_3 ?? null,
        item.sox ?? null,
        item.sp_800_53 ?? null,
        item.ssae_18 ?? null,
        item.safe_harbor ?? null,
        item.pci_dss_version || null,
        item.glba ?? null,
        item.fedramp_level || null,
        item.csa_star_level || null,
        item.certification ?? null,
        item.privacy_shield ?? null,
        item.ffiec ?? null,
        item.gapp ?? null,
        item.cobit ?? null,
        item.coppa ?? null,
        item.ferpa ?? null,
        item.hitrust_csf ?? null,
        item.jericho_forum_commandments ?? null,
        // Legal Requirements
        item.data_ownership || null,
        item.dmca ?? null,
        item.data_retention_policy || null,
        item.gdpr_readiness_statement || null,
        item.gdpr_right_to_erasure ?? null,
        item.gdpr_report_data_breaches ?? null,
        item.gdpr_data_protection ?? null,
        item.gdpr_user_ownership ?? null,
        // Other Standards (as JSONB)
        item.other_standards ? JSON.stringify(item.other_standards) : null,
        complianceScore,
        sourceDocumentId,
        userId
      )
    })

    await client.query(`
      INSERT INTO compliance_security (
        project_id, title, category, type, description, requirement_text, status,
        security_score, latest_breach, data_at_rest_encryption, multi_factor_authentication,
        ip_address_restriction, user_audit_trail, admin_audit_trail, data_audit_trail,
        user_can_upload_data, data_classification, remember_password, user_roles_support,
        file_sharing, valid_certificate_name, trusted_certificate, encryption_protocol,
        heartbleed_patched, http_security_headers, supports_saml, protected_against_drown,
        penetration_testing, requires_user_authentication, password_policy,
        iso_27001, iso_27018, iso_27017, iso_27002, finra, fisma, gaap, hipaa,
        isae_3402, itar, soc_1, soc_2, soc_3, sox, sp_800_53, ssae_18, safe_harbor,
        pci_dss_version, glba, fedramp_level, csa_star_level, certification,
        privacy_shield, ffiec, gapp, cobit, coppa, ferpa, hitrust_csf,
        jericho_forum_commandments, data_ownership, dmca, data_retention_policy,
        gdpr_readiness_statement, gdpr_right_to_erasure, gdpr_report_data_breaches,
        gdpr_data_protection, gdpr_user_ownership, other_standards, compliance_score,
        source_document_id, created_by
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (project_id, title) DO UPDATE SET
        category = EXCLUDED.category,
        type = EXCLUDED.type,
        description = COALESCE(EXCLUDED.description, compliance_security.description),
        requirement_text = COALESCE(EXCLUDED.requirement_text, compliance_security.requirement_text),
        status = EXCLUDED.status,
        security_score = COALESCE(EXCLUDED.security_score, compliance_security.security_score),
        latest_breach = COALESCE(EXCLUDED.latest_breach, compliance_security.latest_breach),
        data_at_rest_encryption = COALESCE(EXCLUDED.data_at_rest_encryption, compliance_security.data_at_rest_encryption),
        multi_factor_authentication = COALESCE(EXCLUDED.multi_factor_authentication, compliance_security.multi_factor_authentication),
        ip_address_restriction = COALESCE(EXCLUDED.ip_address_restriction, compliance_security.ip_address_restriction),
        user_audit_trail = COALESCE(EXCLUDED.user_audit_trail, compliance_security.user_audit_trail),
        admin_audit_trail = COALESCE(EXCLUDED.admin_audit_trail, compliance_security.admin_audit_trail),
        data_audit_trail = COALESCE(EXCLUDED.data_audit_trail, compliance_security.data_audit_trail),
        user_can_upload_data = COALESCE(EXCLUDED.user_can_upload_data, compliance_security.user_can_upload_data),
        data_classification = COALESCE(EXCLUDED.data_classification, compliance_security.data_classification),
        remember_password = COALESCE(EXCLUDED.remember_password, compliance_security.remember_password),
        user_roles_support = COALESCE(EXCLUDED.user_roles_support, compliance_security.user_roles_support),
        file_sharing = COALESCE(EXCLUDED.file_sharing, compliance_security.file_sharing),
        valid_certificate_name = COALESCE(EXCLUDED.valid_certificate_name, compliance_security.valid_certificate_name),
        trusted_certificate = COALESCE(EXCLUDED.trusted_certificate, compliance_security.trusted_certificate),
        encryption_protocol = COALESCE(EXCLUDED.encryption_protocol, compliance_security.encryption_protocol),
        heartbleed_patched = COALESCE(EXCLUDED.heartbleed_patched, compliance_security.heartbleed_patched),
        http_security_headers = COALESCE(EXCLUDED.http_security_headers, compliance_security.http_security_headers),
        supports_saml = COALESCE(EXCLUDED.supports_saml, compliance_security.supports_saml),
        protected_against_drown = COALESCE(EXCLUDED.protected_against_drown, compliance_security.protected_against_drown),
        penetration_testing = COALESCE(EXCLUDED.penetration_testing, compliance_security.penetration_testing),
        requires_user_authentication = COALESCE(EXCLUDED.requires_user_authentication, compliance_security.requires_user_authentication),
        password_policy = COALESCE(EXCLUDED.password_policy, compliance_security.password_policy),
        iso_27001 = COALESCE(EXCLUDED.iso_27001, compliance_security.iso_27001),
        iso_27018 = COALESCE(EXCLUDED.iso_27018, compliance_security.iso_27018),
        iso_27017 = COALESCE(EXCLUDED.iso_27017, compliance_security.iso_27017),
        iso_27002 = COALESCE(EXCLUDED.iso_27002, compliance_security.iso_27002),
        finra = COALESCE(EXCLUDED.finra, compliance_security.finra),
        fisma = COALESCE(EXCLUDED.fisma, compliance_security.fisma),
        gaap = COALESCE(EXCLUDED.gaap, compliance_security.gaap),
        hipaa = COALESCE(EXCLUDED.hipaa, compliance_security.hipaa),
        isae_3402 = COALESCE(EXCLUDED.isae_3402, compliance_security.isae_3402),
        itar = COALESCE(EXCLUDED.itar, compliance_security.itar),
        soc_1 = COALESCE(EXCLUDED.soc_1, compliance_security.soc_1),
        soc_2 = COALESCE(EXCLUDED.soc_2, compliance_security.soc_2),
        soc_3 = COALESCE(EXCLUDED.soc_3, compliance_security.soc_3),
        sox = COALESCE(EXCLUDED.sox, compliance_security.sox),
        sp_800_53 = COALESCE(EXCLUDED.sp_800_53, compliance_security.sp_800_53),
        ssae_18 = COALESCE(EXCLUDED.ssae_18, compliance_security.ssae_18),
        safe_harbor = COALESCE(EXCLUDED.safe_harbor, compliance_security.safe_harbor),
        pci_dss_version = COALESCE(EXCLUDED.pci_dss_version, compliance_security.pci_dss_version),
        glba = COALESCE(EXCLUDED.glba, compliance_security.glba),
        fedramp_level = COALESCE(EXCLUDED.fedramp_level, compliance_security.fedramp_level),
        csa_star_level = COALESCE(EXCLUDED.csa_star_level, compliance_security.csa_star_level),
        certification = COALESCE(EXCLUDED.certification, compliance_security.certification),
        privacy_shield = COALESCE(EXCLUDED.privacy_shield, compliance_security.privacy_shield),
        ffiec = COALESCE(EXCLUDED.ffiec, compliance_security.ffiec),
        gapp = COALESCE(EXCLUDED.gapp, compliance_security.gapp),
        cobit = COALESCE(EXCLUDED.cobit, compliance_security.cobit),
        coppa = COALESCE(EXCLUDED.coppa, compliance_security.coppa),
        ferpa = COALESCE(EXCLUDED.ferpa, compliance_security.ferpa),
        hitrust_csf = COALESCE(EXCLUDED.hitrust_csf, compliance_security.hitrust_csf),
        jericho_forum_commandments = COALESCE(EXCLUDED.jericho_forum_commandments, compliance_security.jericho_forum_commandments),
        data_ownership = COALESCE(EXCLUDED.data_ownership, compliance_security.data_ownership),
        dmca = COALESCE(EXCLUDED.dmca, compliance_security.dmca),
        data_retention_policy = COALESCE(EXCLUDED.data_retention_policy, compliance_security.data_retention_policy),
        gdpr_readiness_statement = COALESCE(EXCLUDED.gdpr_readiness_statement, compliance_security.gdpr_readiness_statement),
        gdpr_right_to_erasure = COALESCE(EXCLUDED.gdpr_right_to_erasure, compliance_security.gdpr_right_to_erasure),
        gdpr_report_data_breaches = COALESCE(EXCLUDED.gdpr_report_data_breaches, compliance_security.gdpr_report_data_breaches),
        gdpr_data_protection = COALESCE(EXCLUDED.gdpr_data_protection, compliance_security.gdpr_data_protection),
        gdpr_user_ownership = COALESCE(EXCLUDED.gdpr_user_ownership, compliance_security.gdpr_user_ownership),
        other_standards = COALESCE(EXCLUDED.other_standards, compliance_security.other_standards),
        compliance_score = COALESCE(EXCLUDED.compliance_score, compliance_security.compliance_score),
        source_document_id = COALESCE(EXCLUDED.source_document_id, compliance_security.source_document_id),
        updated_at = CURRENT_TIMESTAMP
    `, values)

    logger.info(`[EXTRACTION] Saved ${uniqueItems.length} compliance/security items (deduplicated from ${complianceSecurityItems.length})`)
  }

  /**
   * Save deliverables to database
   */
  private async saveDeliverables(
    client: PoolClient,
    projectId: string,
    userId: string,
    deliverables: Deliverable[]
  ): Promise<void> {
    if (deliverables.length === 0) {
      logger.info('[EXTRACTION] No deliverables to save, skipping')
      return
    }

    // Deduplicate deliverables by name (AI sometimes extracts same deliverable multiple times)
    const deduplicatedMap = new Map<string, Deliverable>()
    
    deliverables.forEach(deliverable => {
      const normalizedName = deliverable.name.trim().toLowerCase()
      
      if (!deduplicatedMap.has(normalizedName)) {
        deduplicatedMap.set(normalizedName, deliverable)
      } else {
        // Duplicate found - merge details (keep most detailed version)
        const existing = deduplicatedMap.get(normalizedName)!
        const merged: Deliverable = {
          ...existing,
          description: deliverable.description || existing.description,
          type: deliverable.type || existing.type,
          due_date: deliverable.due_date || existing.due_date,
          status: deliverable.status || existing.status,
          owner: deliverable.owner || existing.owner
        }
        deduplicatedMap.set(normalizedName, merged)
        logger.debug(`[EXTRACTION-DELIVERABLES] Merged duplicate deliverable: "${deliverable.name}"`)
      }
    })
    
    const uniqueDeliverables = Array.from(deduplicatedMap.values())
    
    if (uniqueDeliverables.length < deliverables.length) {
      logger.info(`[EXTRACTION-DELIVERABLES] Deduplicated ${deliverables.length} → ${uniqueDeliverables.length} deliverables`)
    }

    const values: any[] = []
    const placeholders: string[] = []

    uniqueDeliverables.forEach((d, index) => {
      const offset = index * 9
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9})`
      )
      
      // Map AI status values to database CHECK constraint values
      // DB allows: not_started, in_progress, review, completed, delivered
      // AI returns: planned, in_progress, review, completed, delivered
      const statusMap: Record<string, string> = {
        'planned': 'not_started',
        'not_started': 'not_started',
        'pending': 'not_started',
        'in_progress': 'in_progress',
        'active': 'in_progress',
        'review': 'review',
        'reviewing': 'review',
        'completed': 'completed',
        'done': 'completed',
        'delivered': 'delivered'
      }
      const mappedStatus = statusMap[(d.status || 'not_started').toLowerCase()] || 'not_started'
      
      // Validate and parse due_date using the enhanced normalizeDate function
      // This handles formats like "Mar 15, 2026 (prototype approval)", "Jan 2026", etc.
      const parsedDueDate = this.normalizeDate(d.due_date)
      if (d.due_date && !parsedDueDate) {
        logger.warn(`[EXTRACTION] Deliverable "${d.name}" has invalid due_date: ${d.due_date}, setting to null`)
      }

      // Resolve source_document_id
      const sourceDocumentId = (d as any).source_document_id || null

      values.push(
        projectId,
        d.name,
        d.description,
        d.type,
        parsedDueDate,
        mappedStatus,  // Use mapped status value
        d.owner || null,
        sourceDocumentId,
        userId
      )
    })

    await client.query(`
      INSERT INTO deliverables (
        project_id, name, description, type, due_date, status, 
        owner, source_document_id, created_by
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (project_id, name) DO UPDATE SET
        description = EXCLUDED.description,
        type = EXCLUDED.type,
        due_date = EXCLUDED.due_date,
        status = EXCLUDED.status,
        owner = EXCLUDED.owner,
        source_document_id = COALESCE(EXCLUDED.source_document_id, deliverables.source_document_id),
        updated_at = CURRENT_TIMESTAMP
    `, values)

    logger.info(`[EXTRACTION] Saved ${uniqueDeliverables.length} deliverables (deduplicated from ${deliverables.length})`)
  }

  /**
   * Save scope items to database
   */
  private async saveScopeItems(
    client: PoolClient,
    projectId: string,
    userId: string,
    scopeItems: ScopeItem[]
  ): Promise<void> {
    if (scopeItems.length === 0) {
      logger.info('[EXTRACTION] No scope_items to save, skipping')
      return
    }

    // Deduplicate scope items by title (AI sometimes extracts same scope item multiple times)
    const deduplicatedMap = new Map<string, ScopeItem>()
    
    scopeItems.forEach(scopeItem => {
      const normalizedTitle = scopeItem.title.trim().toLowerCase()
      
      if (!deduplicatedMap.has(normalizedTitle)) {
        deduplicatedMap.set(normalizedTitle, scopeItem)
      } else {
        // Duplicate found - merge details (keep most detailed version)
        const existing = deduplicatedMap.get(normalizedTitle)!
        const merged: ScopeItem = {
          ...existing,
          description: scopeItem.description || existing.description,
          is_in_scope: scopeItem.is_in_scope !== undefined ? scopeItem.is_in_scope : existing.is_in_scope,
          category: scopeItem.category || existing.category
        }
        deduplicatedMap.set(normalizedTitle, merged)
        logger.debug(`[EXTRACTION-SCOPE_ITEMS] Merged duplicate scope item: "${scopeItem.title}"`)
      }
    })
    
    const uniqueScopeItems = Array.from(deduplicatedMap.values())
    
    if (uniqueScopeItems.length < scopeItems.length) {
      logger.info(`[EXTRACTION-SCOPE_ITEMS] Deduplicated ${scopeItems.length} → ${uniqueScopeItems.length} scope items`)
    }

    const values: any[] = []
    const placeholders: string[] = []

    uniqueScopeItems.forEach((si, index) => {
      const offset = index * 8
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8})`
      )
      // Map is_in_scope boolean to inclusion_status text
      const inclusionStatus = si.is_in_scope ? 'in_scope' : 'out_of_scope'
      
      // Resolve source_document_id
      const sourceDocumentId = (si as any).source_document_id || null
      
      values.push(
        projectId,
        si.title,        // For title column
        si.title,        // For item_name column (NOT NULL)
        si.description,
        inclusionStatus, // Map to inclusion_status column
        si.category || null,
        sourceDocumentId,
        userId
      )
    })

    await client.query(`
      INSERT INTO scope_items (
        project_id, title, item_name, description, inclusion_status, category, source_document_id, created_by
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (project_id, item_name) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        inclusion_status = EXCLUDED.inclusion_status,
        category = EXCLUDED.category,
        source_document_id = COALESCE(EXCLUDED.source_document_id, scope_items.source_document_id),
        updated_at = CURRENT_TIMESTAMP
    `, values)

    logger.info(`[EXTRACTION] Saved ${uniqueScopeItems.length} scope items (deduplicated from ${scopeItems.length})`)
  }

  /**
   * Save activities to database
   */
  private async saveActivities(
    client: PoolClient,
    projectId: string,
    userId: string,
    activities: Activity[]
  ): Promise<void> {
    if (activities.length === 0) {
      logger.info('[EXTRACTION] No activities to save, skipping')
      return
    }

    // DEDUPLICATE activities by name before database insert
    // AI sometimes extracts the same activity multiple times
    const deduplicatedMap = new Map<string, Activity>()
    
    activities.forEach(activity => {
      const normalizedName = activity.name.trim().toLowerCase()
      
      if (!deduplicatedMap.has(normalizedName)) {
        // First occurrence - add to map
        deduplicatedMap.set(normalizedName, activity)
      } else {
        // Duplicate found - merge details
        const existing = deduplicatedMap.get(normalizedName)!
        const merged: Activity = {
          ...existing,
          description: activity.description || existing.description,
          category: activity.category || existing.category,
          start_date: activity.start_date || existing.start_date,
          end_date: activity.end_date || existing.end_date,
          duration: activity.duration || existing.duration,
          assigned_to: activity.assigned_to || existing.assigned_to,
          dependencies: activity.dependencies?.length ? activity.dependencies : existing.dependencies
        }
        deduplicatedMap.set(normalizedName, merged)
        logger.info(`[EXTRACTION] Merged duplicate activity: "${activity.name}"`)
      }
    })

    const uniqueActivities = Array.from(deduplicatedMap.values())
    logger.info(`[EXTRACTION] Deduplicated ${activities.length} activities to ${uniqueActivities.length} unique activities`)

    const values: any[] = []
    const placeholders: string[] = []

    uniqueActivities.forEach((a, index) => {
      const offset = index * 11  // 11 columns: project_id, name, activity_name, description, category, start_date, end_date, status, assigned_to, source_document_id, created_by
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11})`
      )
      
      // assigned_to must be UUID, not a name string
      // Validate it's a UUID format, otherwise set to null
      const isValidUuid = (str: string | undefined): boolean => {
        if (!str) return false
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        return uuidRegex.test(str)
      }
      
      const assignedTo = isValidUuid(a.assigned_to) ? a.assigned_to : null
      if (a.assigned_to && !assignedTo) {
        logger.warn(`[EXTRACTION] Activity "${a.name}" has invalid assigned_to UUID: ${a.assigned_to}, setting to null`)
      }
      
      // Map AI status values to database CHECK constraint values
      // DB allows: not_started, in_progress, completed, blocked, cancelled
      // AI returns: planned, not_started, in_progress, completed, blocked, cancelled
      const statusMap: Record<string, string> = {
        'planned': 'not_started',
        'pending': 'not_started',
        'not_started': 'not_started',
        'in_progress': 'in_progress',
        'active': 'in_progress',
        'completed': 'completed',
        'done': 'completed',
        'blocked': 'blocked',
        'on_hold': 'blocked',
        'cancelled': 'cancelled',
        'canceled': 'cancelled'
      }
      const mappedStatus = statusMap[(a.status || 'not_started').toLowerCase()] || 'not_started'
      
      // Parse and validate dates (handle quarter formats like "Q1 2026")
      const startDate = a.start_date ? convertQuarterDate(a.start_date) : null
      const endDate = a.end_date ? convertQuarterDate(a.end_date) : null
      
      // Resolve source_document_id
      const sourceDocumentId = (a as any).source_document_id || null
      
      values.push(
        projectId,
        a.name,          // For name column
        a.name,          // For activity_name column (NOT NULL)
        a.description,
        a.category || null,
        startDate,
        endDate,
        mappedStatus,    // Use mapped status value
        assignedTo,      // Use validated UUID or null
        sourceDocumentId,
        userId
      )
    })

    await client.query(`
      INSERT INTO activities (
        project_id, name, activity_name, description, category, start_date, 
        end_date, status, assigned_to, source_document_id, created_by
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (project_id, activity_name) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date,
        status = EXCLUDED.status,
        assigned_to = EXCLUDED.assigned_to,
        source_document_id = COALESCE(EXCLUDED.source_document_id, activities.source_document_id),
        updated_at = CURRENT_TIMESTAMP
    `, values)

    logger.info(`[EXTRACTION] Saved ${uniqueActivities.length} activities (deduplicated from ${activities.length})`)
  }

  /**
   * Save team agreements to database
   */
  private async saveTeamAgreements(
    client: PoolClient,
    projectId: string,
    userId: string,
    teamAgreements: TeamAgreement[]
  ): Promise<void> {
    if (teamAgreements.length === 0) {
      logger.info('[EXTRACTION] No team_agreements to save, skipping')
      return
    }

    // Deduplicate team agreements by title (AI sometimes extracts same agreement multiple times)
    const deduplicatedMap = new Map<string, TeamAgreement>()
    
    teamAgreements.forEach(agreement => {
      const normalizedTitle = (agreement.title || '').trim().toLowerCase()
      
      if (!normalizedTitle) {
        // Skip agreements without titles
        return
      }
      
      if (!deduplicatedMap.has(normalizedTitle)) {
        deduplicatedMap.set(normalizedTitle, agreement)
      } else {
        // Duplicate found - merge details (keep most detailed version)
        const existing = deduplicatedMap.get(normalizedTitle)!
        const merged: TeamAgreement = {
          ...existing,
          description: agreement.description || existing.description,
          category: agreement.category || existing.category,
          agreed_by: agreement.agreed_by?.length ? agreement.agreed_by : existing.agreed_by,
          facilitated_by: agreement.facilitated_by || existing.facilitated_by,
          effective_date: agreement.effective_date || existing.effective_date,
          review_frequency: agreement.review_frequency || existing.review_frequency,
          next_review_date: agreement.next_review_date || existing.next_review_date,
          status: agreement.status || existing.status,
          adherence_score: agreement.adherence_score !== undefined ? agreement.adherence_score : existing.adherence_score,
          violations_count: agreement.violations_count !== undefined ? agreement.violations_count : existing.violations_count,
          last_violation_date: agreement.last_violation_date || existing.last_violation_date,
          notes: agreement.notes || existing.notes
        }
        deduplicatedMap.set(normalizedTitle, merged)
        logger.debug(`[EXTRACTION-TEAM_AGREEMENTS] Merged duplicate agreement: "${agreement.title}"`)
      }
    })
    
    const uniqueTeamAgreements = Array.from(deduplicatedMap.values())
    
    if (uniqueTeamAgreements.length < teamAgreements.length) {
      logger.info(`[EXTRACTION-TEAM_AGREEMENTS] Deduplicated ${teamAgreements.length} → ${uniqueTeamAgreements.length} team agreements`)
    }

    const allowedCategories = new Set([
      'working_hours',
      'communication',
      'decision_making',
      'conflict_resolution',
      'quality_standards',
      'meeting_norms',
      'code_of_conduct',
      'collaboration_tools',
      'response_times',
      'knowledge_sharing',
      'other'
    ])
    const allowedStatuses = new Set(['draft', 'active', 'under_review', 'revised', 'deprecated'])

    const values: any[] = []
    const placeholders: string[] = []

    uniqueTeamAgreements.forEach((agreement, index) => {
      const offset = index * 17
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14}, $${offset + 15}, $${offset + 16}, $${offset + 17})`
      )

      const rawCategory = (agreement.category || 'other').toString().toLowerCase().replace(/\s+/g, '_')
      const category = allowedCategories.has(rawCategory) ? rawCategory : 'other'

      const rawStatus = (agreement.status || 'active').toString().toLowerCase().replace(/\s+/g, '_')
      const status = allowedStatuses.has(rawStatus) ? rawStatus : 'active'

      const reviewFrequency = (() => {
        const raw = (agreement.review_frequency || '').toString().toLowerCase()
        if (!raw) return null
        if (raw.includes('week')) return 'weekly'
        if (raw.includes('month')) return 'monthly'
        if (raw.includes('quarter')) return 'quarterly'
        if (raw.includes('annual') || raw.includes('year')) return 'annually'
        if (raw.includes('need')) return 'as_needed'
        return null
      })()

      const adherenceScoreRaw = this.safeNumber(agreement.adherence_score)
      const adherenceScore =
        adherenceScoreRaw === undefined ? null : Math.max(0, Math.min(10, adherenceScoreRaw))

      const violationsCountRaw = this.safeInteger(agreement.violations_count)
      const violationsCount =
        violationsCountRaw === undefined ? 0 : Math.max(0, violationsCountRaw)

      const notesSegments = []
      if (agreement.notes) {
        notesSegments.push(agreement.notes)
      }
      if (agreement.source_document) {
        notesSegments.push(`Source: ${agreement.source_document}`)
      }
      const notes = notesSegments.length > 0 ? notesSegments.join('\n\n') : null

      // Resolve source_document_id
      // UUID validation regex
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      
      // Validate source_document_id - must be a valid UUID or null
      const rawSourceDocId = (agreement as any).source_document_id
      let sourceDocumentId: string | null = null
      if (rawSourceDocId && typeof rawSourceDocId === 'string') {
        const trimmed = rawSourceDocId.trim()
        if (uuidRegex.test(trimmed)) {
          sourceDocumentId = trimmed
        } else {
          logger.warn(`[EXTRACTION-TEAM_AGREEMENTS] source_document_id "${rawSourceDocId}" is not a valid UUID, setting to NULL`)
        }
      }

      // Ensure agreed_by is properly formatted as JSONB array of UUIDs
      // Handle edge cases: null, undefined, empty arrays, and ensure valid JSON
      // CRITICAL: agreed_by must contain user IDs (UUIDs), not names
      // Filter out any non-UUID values (AI sometimes extracts names instead of IDs)
      const rawAgreedBy = this.ensureStringArray(agreement.agreed_by || [])
      
      if (rawAgreedBy.length > 0) {
        logger.debug(`[EXTRACTION-TEAM_AGREEMENTS] Processing agreed_by array with ${rawAgreedBy.length} items:`, rawAgreedBy)
      }
      
      const agreedByArray = rawAgreedBy
        .map(item => {
          const trimmed = item.trim()
          // Only keep valid UUIDs
          if (uuidRegex.test(trimmed)) {
            return trimmed
          } else {
            logger.warn(`[EXTRACTION-TEAM_AGREEMENTS] Filtered out non-UUID value from agreed_by: "${item}" (agreement: "${agreement.title}")`)
            return null
          }
        })
        .filter((item): item is string => item !== null) // Remove nulls
      
      if (rawAgreedBy.length > 0 && agreedByArray.length === 0) {
        logger.warn(`[EXTRACTION-TEAM_AGREEMENTS] All agreed_by values were filtered out (no valid UUIDs found) for agreement: "${agreement.title}"`)
      }
      
      // Pass as array, not stringified - pg library will convert to JSONB
      const agreedByJson = agreedByArray.length > 0 ? agreedByArray : []

      // effective_date is NOT NULL, so provide default (current date) if not provided
      const effectiveDate = this.normalizeDate(agreement.effective_date) || new Date().toISOString().split('T')[0]

      // facilitated_by must be a UUID (references users.id), not a name string
      // If it's not a valid UUID, set to NULL
      const rawFacilitatedBy = agreement.facilitated_by
      let facilitatedBy: string | null = null
      
      if (rawFacilitatedBy && typeof rawFacilitatedBy === 'string') {
        const trimmed = rawFacilitatedBy.trim()
        if (uuidRegex.test(trimmed)) {
          facilitatedBy = trimmed
        } else {
          logger.warn(`[EXTRACTION-TEAM_AGREEMENTS] facilitated_by "${rawFacilitatedBy}" is not a valid UUID, setting to NULL`)
        }
      }

      values.push(
        projectId,
        agreement.title?.substring(0, 200) || 'Team Agreement',
        agreement.description || 'No description provided', // NOT NULL constraint
        category,
        agreedByJson, // Explicitly stringified JSON for JSONB column
        facilitatedBy, // Only set if valid UUID, otherwise NULL
        effectiveDate, // Use current date as default if not provided (NOT NULL constraint)
        reviewFrequency,
        this.normalizeDate(agreement.next_review_date),
        status,
        adherenceScore,
        violationsCount,
        this.normalizeDate(agreement.last_violation_date),
        sourceDocumentId,
        notes,
        userId,
        userId
      )
    })

    await client.query(
      `
      INSERT INTO team_agreements (
        project_id, title, description, category, agreed_by, facilitated_by,
        effective_date, review_frequency, next_review_date, status,
        adherence_score, violations_count, last_violation_date,
        source_document_id, notes, created_by, updated_by
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (project_id, title) DO UPDATE SET
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        agreed_by = EXCLUDED.agreed_by,
        facilitated_by = EXCLUDED.facilitated_by,
        effective_date = EXCLUDED.effective_date,
        review_frequency = EXCLUDED.review_frequency,
        next_review_date = EXCLUDED.next_review_date,
        status = EXCLUDED.status,
        adherence_score = EXCLUDED.adherence_score,
        violations_count = EXCLUDED.violations_count,
        last_violation_date = EXCLUDED.last_violation_date,
        source_document_id = COALESCE(EXCLUDED.source_document_id, team_agreements.source_document_id),
        notes = EXCLUDED.notes,
        updated_by = EXCLUDED.updated_by,
        updated_at = CURRENT_TIMESTAMP
    `,
      values
    )

    logger.info(`[EXTRACTION] Saved ${uniqueTeamAgreements.length} team agreements (deduplicated from ${teamAgreements.length})`)
  }

  /**
   * Save development approach to database (TASK-90)
   * This is project-level metadata - ONE record per project (UPSERT)
   */
  private async saveDevelopmentApproaches(
    client: PoolClient,
    projectId: string,
    userId: string,
    developmentApproaches: DevelopmentApproach[]
  ): Promise<void> {
    if (developmentApproaches.length === 0) {
      logger.info('[EXTRACTION] No development_approach to save, skipping')
      return
    }

    // TASK-90: This is project-level metadata - take the first (and should be only) approach
    const approach = developmentApproaches[0]

    // Normalize approach values
    const allowedApproaches = new Set(['predictive', 'adaptive', 'hybrid', 'incremental', 'iterative'])
    const rawApproach = (approach.approach || 'hybrid').toString().toLowerCase()
    const normalizedApproach = allowedApproaches.has(rawApproach) ? rawApproach : 'hybrid'

    // Normalize methodology
    const allowedMethodologies = new Set(['waterfall', 'scrum', 'kanban', 'lean', 'safe', 'prince2', 'custom'])
    const rawMethodology = (approach.methodology || approach.framework || '').toString().toLowerCase()
    const normalizedMethodology = allowedMethodologies.has(rawMethodology) ? rawMethodology : null

    // Normalize other enum fields
    const normalizeEnum = (value: any, allowed: Set<string>, defaultValue: string | null = null): string | null => {
      if (!value) return defaultValue
      const normalized = value.toString().toLowerCase()
      return allowed.has(normalized) ? normalized : defaultValue
    }

    const uncertaintyLevel = normalizeEnum(
      approach.uncertainty_level,
      new Set(['low', 'medium', 'high']),
      null
    )

    const requirementsStability = normalizeEnum(
      approach.requirements_stability,
      new Set(['stable', 'evolving', 'uncertain']),
      null
    )

    const deliveryCadence = normalizeEnum(
      approach.delivery_cadence,
      new Set(['single', 'iterative', 'incremental', 'continuous']),
      null
    )

    const organizationalMaturity = normalizeEnum(
      approach.organizational_maturity,
      new Set(['low', 'medium', 'high']),
      null
    )

    const teamExperienceLevel = normalizeEnum(
      approach.team_experience_level,
      new Set(['junior', 'mixed', 'senior']),
      null
    )

    const iterationUnit = normalizeEnum(
      approach.iteration_unit,
      new Set(['days', 'weeks']),
      null
    )

    const governanceApproach = normalizeEnum(
      approach.governance_approach,
      new Set(['lightweight', 'standard', 'formal']),
      null
    )

    // Prepare tailoring decisions JSONB
    const tailoringDecisions = Array.isArray(approach.tailoring_decisions) && approach.tailoring_decisions.length > 0
      ? JSON.stringify(approach.tailoring_decisions)
      : '[]'

    // Prepare life cycle phases JSONB
    const lifeCyclePhases = Array.isArray(approach.life_cycle_phases) && approach.life_cycle_phases.length > 0
      ? JSON.stringify(approach.life_cycle_phases)
      : '[]'

    // Prepare review gates JSONB
    const reviewGates = Array.isArray(approach.review_gates) && approach.review_gates.length > 0
      ? JSON.stringify(approach.review_gates)
      : '[]'

    // Calculate iteration_length (convert weeks to days if needed)
    let iterationLength: number | null = null
    if (approach.iteration_length) {
      iterationLength = approach.iteration_length
    } else if (approach.iteration_length_weeks) {
      iterationLength = approach.iteration_length_weeks * 7 // Convert weeks to days
    }

    // Ensure justification is provided
    const justification = approach.justification || approach.tailoring_decisions_text || 'No justification provided'

    // UPSERT into development_approach table (one per project)
    // Note: Table uses defined_by (not created_by) and has no updated_by column
    // created_at and updated_at are auto-managed by database
    await client.query(
      `
      INSERT INTO development_approach (
        project_id, approach, methodology, justification,
        uncertainty_level, requirements_stability, stakeholder_engagement_model, delivery_cadence,
        organizational_maturity, team_experience_level, regulatory_constraints,
        tailoring_decisions, life_cycle_phases, iteration_length, iteration_unit,
        governance_approach, review_gates,
        source_document_id, defined_by, approved_by, effective_date
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      ON CONFLICT (project_id) DO UPDATE SET
        approach = EXCLUDED.approach,
        methodology = EXCLUDED.methodology,
        justification = EXCLUDED.justification,
        uncertainty_level = EXCLUDED.uncertainty_level,
        requirements_stability = EXCLUDED.requirements_stability,
        stakeholder_engagement_model = EXCLUDED.stakeholder_engagement_model,
        delivery_cadence = EXCLUDED.delivery_cadence,
        organizational_maturity = EXCLUDED.organizational_maturity,
        team_experience_level = EXCLUDED.team_experience_level,
        regulatory_constraints = EXCLUDED.regulatory_constraints,
        tailoring_decisions = EXCLUDED.tailoring_decisions,
        life_cycle_phases = EXCLUDED.life_cycle_phases,
        iteration_length = EXCLUDED.iteration_length,
        iteration_unit = EXCLUDED.iteration_unit,
        governance_approach = EXCLUDED.governance_approach,
        review_gates = EXCLUDED.review_gates,
        source_document_id = COALESCE(EXCLUDED.source_document_id, development_approach.source_document_id),
        defined_by = COALESCE(EXCLUDED.defined_by, development_approach.defined_by),
        approved_by = COALESCE(EXCLUDED.approved_by, development_approach.approved_by),
        effective_date = COALESCE(EXCLUDED.effective_date, development_approach.effective_date),
        updated_at = CURRENT_TIMESTAMP
      `,
      [
        projectId,
        normalizedApproach,
        normalizedMethodology,
        justification,
        uncertaintyLevel,
        requirementsStability,
        approach.stakeholder_engagement_model || null,
        deliveryCadence,
        organizationalMaturity,
        teamExperienceLevel,
        approach.regulatory_constraints || false,
        tailoringDecisions,
        lifeCyclePhases,
        iterationLength,
        iterationUnit,
        governanceApproach,
        reviewGates,
        (approach as any).source_document_id || null, // Resolve source_document_id
        userId, // defined_by
        null, // approved_by - not extracted, would be set manually
        null  // effective_date - not extracted, would be set manually
      ]
    )

    logger.info(`[EXTRACTION] Saved development approach: ${normalizedApproach} (${normalizedMethodology || 'N/A'}) for project ${projectId}`)
  }

  /**
   * Save project iterations to database
   */
  private async saveProjectIterations(
    client: PoolClient,
    projectId: string,
    userId: string,
    projectIterations: ProjectIteration[]
  ): Promise<void> {
    if (projectIterations.length === 0) {
      logger.info('[EXTRACTION] No project_iterations to save, skipping')
      return
    }

    const typeMap: Record<string, string> = {
      sprint: 'sprint',
      iteration: 'iteration',
      increment: 'program_increment',
      'program increment': 'program_increment',
      release: 'release',
      phase: 'phase'
    }
    const statusMap: Record<string, string> = {
      planned: 'planned',
      pending: 'planned',
      active: 'active',
      in_progress: 'active',
      executing: 'active',
      completed: 'completed',
      done: 'completed',
      finished: 'completed',
      cancelled: 'cancelled',
      canceled: 'cancelled'
    }

    const values: any[] = []
    const placeholders: string[] = []

    // Deduplicate project iterations by name (AI sometimes extracts same iteration multiple times)
    const deduplicatedMap = new Map<string, ProjectIteration>()
    
    projectIterations.forEach(iteration => {
      const normalizedName = (iteration.name || '').trim().toLowerCase()
      
      if (!normalizedName) {
        return
      }
      
      if (!deduplicatedMap.has(normalizedName)) {
        deduplicatedMap.set(normalizedName, iteration)
      } else {
        // Duplicate found - merge details (keep most detailed version)
        const existing = deduplicatedMap.get(normalizedName)!
        const merged: ProjectIteration = {
          ...existing,
          iteration_type: iteration.iteration_type || existing.iteration_type,
          sequence_number: iteration.sequence_number !== undefined ? iteration.sequence_number : existing.sequence_number,
          start_date: iteration.start_date || existing.start_date,
          end_date: iteration.end_date || existing.end_date,
          goals: iteration.goals?.length ? iteration.goals : existing.goals,
          planned_story_points: iteration.planned_story_points !== undefined ? iteration.planned_story_points : existing.planned_story_points,
          completed_story_points: iteration.completed_story_points !== undefined ? iteration.completed_story_points : existing.completed_story_points,
          velocity: iteration.velocity !== undefined ? iteration.velocity : existing.velocity,
          status: iteration.status || existing.status,
          retrospective_summary: iteration.retrospective_summary || existing.retrospective_summary,
          impediments: iteration.impediments?.length ? iteration.impediments : existing.impediments
        }
        deduplicatedMap.set(normalizedName, merged)
        logger.debug(`[EXTRACTION-PROJECT_ITERATIONS] Merged duplicate iteration: "${iteration.name}"`)
      }
    })
    
    const uniqueProjectIterations = Array.from(deduplicatedMap.values())
    
    if (uniqueProjectIterations.length < projectIterations.length) {
      logger.info(`[EXTRACTION-PROJECT_ITERATIONS] Deduplicated ${projectIterations.length} → ${uniqueProjectIterations.length} project iterations`)
    }

    uniqueProjectIterations.forEach((iteration, index) => {
      const offset = index * 16
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14}, $${offset + 15}, $${offset + 16})`
      )

      const rawType = (iteration.iteration_type || '').toLowerCase()
      const iterationType = typeMap[rawType] || 'sprint'

      const rawStatus = (iteration.status || 'planned').toLowerCase()
      const status = statusMap[rawStatus] || 'planned'

      values.push(
        projectId,
        iteration.name?.substring(0, 200) || 'Iteration',
        iterationType,
        this.safeInteger(iteration.sequence_number),
        this.normalizeDate(iteration.start_date),
        this.normalizeDate(iteration.end_date),
        this.ensureStringArray(iteration.goals),
        this.safeInteger(iteration.planned_story_points),
        this.safeInteger(iteration.completed_story_points),
        this.safeInteger(iteration.velocity),
        status,
        iteration.retrospective_summary || null,
        this.ensureStringArray(iteration.impediments),
        (iteration as any).source_document_id || null, // Resolve source_document_id
        userId,
        userId
      )
    })

    await client.query(
      `
      INSERT INTO project_iterations (
        project_id, name, iteration_type, sequence_number, start_date, end_date,
        goals, planned_story_points, completed_story_points, velocity, status,
        retrospective_summary, impediments, source_document_id, created_by, updated_by
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (project_id, name) DO UPDATE SET
        iteration_type = EXCLUDED.iteration_type,
        sequence_number = EXCLUDED.sequence_number,
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date,
        goals = EXCLUDED.goals,
        planned_story_points = EXCLUDED.planned_story_points,
        completed_story_points = EXCLUDED.completed_story_points,
        velocity = EXCLUDED.velocity,
        status = EXCLUDED.status,
        retrospective_summary = EXCLUDED.retrospective_summary,
        impediments = EXCLUDED.impediments,
        source_document_id = COALESCE(EXCLUDED.source_document_id, project_iterations.source_document_id),
        updated_by = EXCLUDED.updated_by,
        updated_at = CURRENT_TIMESTAMP
    `,
      values
    )

    logger.info(`[EXTRACTION] Saved ${uniqueProjectIterations.length} project iterations (deduplicated from ${projectIterations.length})`)
  }

  /**
   * Save work items to database
   */
  private async saveWorkItems(
    client: PoolClient,
    projectId: string,
    userId: string,
    workItems: WorkItemRecord[]
  ): Promise<void> {
    if (workItems.length === 0) {
      logger.info('[EXTRACTION] No work_items to save, skipping')
      return
    }

    const statusMap: Record<string, string> = {
      todo: 'todo',
      'to_do': 'todo',
      backlog: 'todo',
      planned: 'todo',
      in_progress: 'in_progress',
      active: 'in_progress',
      doing: 'in_progress',
      review: 'review',
      verifying: 'review',
      done: 'done',
      completed: 'done',
      finished: 'done',
      blocked: 'blocked',
      impeded: 'blocked'
    }

    const activityMap = await this.getActivityIdMap(client, projectId)

    const values: any[] = []
    const placeholders: string[] = []

    // Deduplicate work items by name (AI sometimes extracts same work item multiple times)
    const deduplicatedMap = new Map<string, WorkItemRecord>()
    
    workItems.forEach(item => {
      const normalizedName = (item.name || '').trim().toLowerCase()
      
      if (!normalizedName) {
        return
      }
      
      if (!deduplicatedMap.has(normalizedName)) {
        deduplicatedMap.set(normalizedName, item)
      } else {
        // Duplicate found - merge details (keep most detailed version)
        const existing = deduplicatedMap.get(normalizedName)!
        const merged: WorkItemRecord = {
          ...existing,
          description: item.description || existing.description,
          activity_name: item.activity_name || existing.activity_name,
          assigned_to: item.assigned_to || existing.assigned_to,
          estimated_hours: item.estimated_hours !== undefined ? item.estimated_hours : existing.estimated_hours,
          actual_hours: item.actual_hours !== undefined ? item.actual_hours : existing.actual_hours,
          progress_percentage: item.progress_percentage !== undefined ? item.progress_percentage : existing.progress_percentage,
          status: item.status || existing.status,
          blockers: item.blockers?.length ? item.blockers : existing.blockers,
          completed_date: item.completed_date || existing.completed_date
        }
        deduplicatedMap.set(normalizedName, merged)
        logger.debug(`[EXTRACTION-WORK_ITEMS] Merged duplicate work item: "${item.name}"`)
      }
    })
    
    const uniqueWorkItems = Array.from(deduplicatedMap.values())
    
    if (uniqueWorkItems.length < workItems.length) {
      logger.info(`[EXTRACTION-WORK_ITEMS] Deduplicated ${workItems.length} → ${uniqueWorkItems.length} work items`)
    }

    uniqueWorkItems.forEach((item, index) => {
      const offset = index * 15
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14}, $${offset + 15})`
      )

      const rawStatus = (item.status || 'todo').toLowerCase().replace(/\s+/g, '_')
      const status = statusMap[rawStatus] || 'todo'

      const progressRaw = this.safeNumber(item.progress_percentage)
      const progressPercentage =
        progressRaw === undefined
          ? null
          : Math.max(0, Math.min(100, progressRaw))

      const activityName = item.activity_name ? item.activity_name.toLowerCase().trim() : ''
      const activityId = activityName ? activityMap.get(activityName) || null : null

      values.push(
        projectId,
        item.name?.substring(0, 255) || 'Work Item',
        item.description || null,
        item.activity_name || null,
        activityId,
        item.assigned_to ? item.assigned_to.substring(0, 255) : null,
        this.safeNumber(item.estimated_hours),
        this.safeNumber(item.actual_hours),
        progressPercentage,
        status,
        this.ensureStringArray(item.blockers),
        this.normalizeDate(item.completed_date),
        (item as any).source_document_id || null, // Resolve source_document_id
        userId,
        userId
      )
    })

    await client.query(
      `
      INSERT INTO work_items (
        project_id, name, description, activity_name, activity_id, assigned_to,
        estimated_hours, actual_hours, progress_percentage, status, blockers,
        completed_date, source_document_id, created_by, updated_by
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (project_id, name) DO UPDATE SET
        description = EXCLUDED.description,
        activity_name = EXCLUDED.activity_name,
        activity_id = EXCLUDED.activity_id,
        assigned_to = EXCLUDED.assigned_to,
        estimated_hours = EXCLUDED.estimated_hours,
        actual_hours = EXCLUDED.actual_hours,
        progress_percentage = EXCLUDED.progress_percentage,
        status = EXCLUDED.status,
        blockers = EXCLUDED.blockers,
        completed_date = EXCLUDED.completed_date,
        source_document_id = COALESCE(EXCLUDED.source_document_id, work_items.source_document_id),
        updated_by = EXCLUDED.updated_by,
        updated_at = CURRENT_TIMESTAMP
    `,
      values
    )

    logger.info(`[EXTRACTION] Saved ${uniqueWorkItems.length} work items (deduplicated from ${workItems.length})`)
  }

  /**
   * Save capacity plans to database
   */
  private async saveCapacityPlans(
    client: PoolClient,
    projectId: string,
    userId: string,
    capacityPlans: CapacityPlan[]
  ): Promise<void> {
    if (capacityPlans.length === 0) {
      logger.info('[EXTRACTION] No capacity_plans to save, skipping')
      return
    }

    const values: any[] = []
    const placeholders: string[] = []

    // Deduplicate capacity plans by team_member + period (AI sometimes extracts same plan multiple times)
    const deduplicatedMap = new Map<string, CapacityPlan>()
    
    capacityPlans.forEach(plan => {
      const periodStart = this.normalizeDate(plan.period_start)
      const periodEnd = this.normalizeDate(plan.period_end)
      
      if (!periodStart || !periodEnd || !plan.team_member) {
        return
      }
      
      const key = `${plan.team_member.toLowerCase().trim()}:${periodStart}:${periodEnd}`
      
      if (!deduplicatedMap.has(key)) {
        deduplicatedMap.set(key, plan)
      } else {
        // Duplicate found - merge details (keep most detailed version)
        const existing = deduplicatedMap.get(key)!
        const merged: CapacityPlan = {
          ...existing,
          role: plan.role || existing.role,
          available_hours: plan.available_hours !== undefined ? plan.available_hours : existing.available_hours,
          allocated_hours: plan.allocated_hours !== undefined ? plan.allocated_hours : existing.allocated_hours,
          utilization_percentage: plan.utilization_percentage !== undefined ? plan.utilization_percentage : existing.utilization_percentage,
          notes: plan.notes || existing.notes
        }
        deduplicatedMap.set(key, merged)
        logger.debug(`[EXTRACTION-CAPACITY_PLANS] Merged duplicate capacity plan: "${plan.team_member}" (${periodStart} - ${periodEnd})`)
      }
    })
    
    const uniqueCapacityPlans = Array.from(deduplicatedMap.values())
    
    if (uniqueCapacityPlans.length < capacityPlans.length) {
      logger.info(`[EXTRACTION-CAPACITY_PLANS] Deduplicated ${capacityPlans.length} → ${uniqueCapacityPlans.length} capacity plans`)
    }

    uniqueCapacityPlans.forEach(plan => {
      const periodStart = this.normalizeDate(plan.period_start)
      const periodEnd = this.normalizeDate(plan.period_end)

      if (!periodStart || !periodEnd) {
        logger.warn(
          `[EXTRACTION] Skipping capacity plan for ${plan.team_member} due to invalid period (${plan.period_start} - ${plan.period_end})`
        )
        return
      }

      const rowIndex = placeholders.length
      const offset = rowIndex * 12
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12})`
      )

      const notesSegments = []
      if (plan.notes) {
        notesSegments.push(plan.notes)
      }
      if (plan.source_document) {
        notesSegments.push(`Source: ${plan.source_document}`)
      }
      const notes = notesSegments.length > 0 ? notesSegments.join('\n\n') : null

      values.push(
        projectId,
        plan.team_member?.substring(0, 255) || 'Team Member',
        plan.role ? plan.role.substring(0, 255) : null,
        periodStart,
        periodEnd,
        this.safeNumber(plan.available_hours),
        this.safeNumber(plan.allocated_hours),
        this.safeNumber(plan.utilization_percentage),
        notes,
        (plan as any).source_document_id || null, // Resolve source_document_id
        userId,
        userId
      )
    })

    if (values.length === 0) {
      logger.warn('[EXTRACTION] No valid capacity plans to store after validation')
      return
    }

    await client.query(
      `
      INSERT INTO capacity_plans (
        project_id, team_member, role, period_start, period_end,
        available_hours, allocated_hours, utilization_percentage,
        notes, source_document_id, created_by, updated_by
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (project_id, team_member, period_start, period_end) DO UPDATE SET
        role = EXCLUDED.role,
        available_hours = EXCLUDED.available_hours,
        allocated_hours = EXCLUDED.allocated_hours,
        utilization_percentage = EXCLUDED.utilization_percentage,
        notes = EXCLUDED.notes,
        source_document_id = COALESCE(EXCLUDED.source_document_id, capacity_plans.source_document_id),
        updated_by = EXCLUDED.updated_by,
        updated_at = CURRENT_TIMESTAMP
    `,
      values
    )

    logger.info(`[EXTRACTION] Saved ${uniqueCapacityPlans.length} capacity plan records (deduplicated from ${capacityPlans.length})`)
  }

  /**
   * Save performance measurements to database
   */
  private async savePerformanceMeasurements(
    client: PoolClient,
    projectId: string,
    userId: string,
    performanceMeasurements: PerformanceMeasurement[]
  ): Promise<void> {
    if (performanceMeasurements.length === 0) {
      logger.info('[EXTRACTION] No performance_measurements to save, skipping')
      return
    }

    const successCriteriaMap = await this.getSuccessCriterionIdMap(client, projectId)
    
    // Build document title-to-ID map for source document resolution
    const documentResult = await client.query<{ id: string; title: string }>(
      `SELECT id, title FROM documents WHERE project_id = $1`,
      [projectId]
    )
    const documentMap = new Map<string, string>()
    documentResult.rows.forEach(row => {
      if (row.title && row.id) {
        documentMap.set(row.title.toLowerCase().trim(), row.id)
        // Also map normalized version for fuzzy matching
        const normalizedTitle = row.title.toLowerCase().trim().replace(/[^\w\s]/g, '')
        if (normalizedTitle !== row.title.toLowerCase().trim()) {
          documentMap.set(normalizedTitle, row.id)
        }
      }
    })
    
    const statusMap: Record<string, string> = {
      on_track: 'on_track',
      'on track': 'on_track',
      at_risk: 'at_risk',
      'at risk': 'at_risk',
      off_track: 'off_track',
      'off track': 'off_track'
    }
    const trendOptions = new Set(['improving', 'stable', 'declining'])

    const values: any[] = []
    const placeholders: string[] = []

    // Deduplicate performance measurements by criterion_name + measurement_date (AI sometimes extracts same measurement multiple times)
    const deduplicatedMap = new Map<string, PerformanceMeasurement>()
    
    performanceMeasurements.forEach(measurement => {
      const criterionName = measurement.success_criterion_name?.trim()
      
      if (!criterionName) {
        return
      }
      
      // Use provided date, or fallback to current date if missing
      let measurementDate = this.normalizeDate(measurement.measurement_date)
      if (!measurementDate) {
        measurementDate = new Date().toISOString().split('T')[0]
      }
      
      const key = `${criterionName.toLowerCase()}:${measurementDate}`
      
      if (!deduplicatedMap.has(key)) {
        deduplicatedMap.set(key, measurement)
      } else {
        // Duplicate found - merge details (keep most detailed version)
        const existing = deduplicatedMap.get(key)!
        const merged: PerformanceMeasurement = {
          ...existing,
          actual_value: measurement.actual_value !== undefined ? measurement.actual_value : existing.actual_value,
          target_value: measurement.target_value !== undefined ? measurement.target_value : existing.target_value,
          units: measurement.units || existing.units,
          variance: measurement.variance !== undefined ? measurement.variance : existing.variance,
          variance_percentage: measurement.variance_percentage !== undefined ? measurement.variance_percentage : existing.variance_percentage,
          trend: measurement.trend || existing.trend,
          status: measurement.status || existing.status,
          notes: measurement.notes || existing.notes
        }
        deduplicatedMap.set(key, merged)
        logger.debug(`[EXTRACTION-PERFORMANCE_MEASUREMENTS] Merged duplicate measurement: "${criterionName}" (${measurementDate})`)
      }
    })
    
    const uniquePerformanceMeasurements = Array.from(deduplicatedMap.values())
    
    if (uniquePerformanceMeasurements.length < performanceMeasurements.length) {
      logger.info(`[EXTRACTION-PERFORMANCE_MEASUREMENTS] Deduplicated ${performanceMeasurements.length} → ${uniquePerformanceMeasurements.length} performance measurements`)
    }

    uniquePerformanceMeasurements.forEach(measurement => {
      const criterionName = measurement.success_criterion_name?.trim()
      
      if (!criterionName) {
        logger.warn(
          `[EXTRACTION] Skipping measurement due to missing criterion name (${measurement.success_criterion_name})`
        )
        return
      }

      // Use provided date, or fallback to current date if missing (for planned/target measurements)
      // This allows storing success criteria even when actual measurements haven't been taken yet
      let measurementDate = this.normalizeDate(measurement.measurement_date)
      if (!measurementDate) {
        // Fallback to current date for planned/target measurements
        measurementDate = new Date().toISOString().split('T')[0]
        logger.debug(
          `[EXTRACTION] Using fallback date for measurement "${criterionName}" (no date provided, using today)`
        )
      }

      const rowIndex = placeholders.length
      const offset = rowIndex * 15
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14}, $${offset + 15})`
      )

      // Use fuzzy matching to find success criterion ID
      const criterionId = this.findSuccessCriterionId(criterionName, successCriteriaMap)
      if (!criterionId) {
        logger.warn(`[EXTRACTION] No success criterion found for "${criterionName}", storing without linkage`)
      } else {
        logger.debug(`[EXTRACTION] Matched criterion "${criterionName}" to ID ${criterionId}`)
      }
      
      // Resolve source_document_id
      let sourceDocumentId: string | null = null
      if (measurement.source_document_id) {
        // Already resolved during extraction
        sourceDocumentId = measurement.source_document_id
      } else if (measurement.source_document) {
        // Try to resolve from document title
        const docTitle = measurement.source_document.trim()
        sourceDocumentId = documentMap.get(docTitle.toLowerCase()) || 
                          documentMap.get(docTitle.toLowerCase().replace(/[^\w\s]/g, '')) || null
        
        // Try fuzzy matching if exact match failed
        if (!sourceDocumentId) {
          for (const [title, id] of documentMap.entries()) {
            if (docTitle.toLowerCase().includes(title) || title.includes(docTitle.toLowerCase())) {
              sourceDocumentId = id
              logger.debug(`[EXTRACTION] Fuzzy matched document "${docTitle}" to "${title}" (ID: ${id})`)
              break
            }
          }
        }
        
        if (!sourceDocumentId) {
          logger.warn(`[EXTRACTION] Could not resolve source_document_id for "${docTitle}"`)
        }
      }

      const statusKey = (measurement.status || 'on_track').toLowerCase().replace(/\s+/g, '_')
      const status = statusMap[statusKey] || 'on_track'
      const trendKey = (measurement.trend || '').toLowerCase().trim()
      const trend = trendOptions.has(trendKey) ? trendKey : null

      const notesSegments = []
      if (measurement.notes) {
        notesSegments.push(measurement.notes)
      }
      if (measurement.source_document && !sourceDocumentId) {
        // Only add source document to notes if we couldn't resolve the ID
        notesSegments.push(`Source: ${measurement.source_document}`)
      }
      const notes = notesSegments.length > 0 ? notesSegments.join('\n\n') : null

      values.push(
        projectId,
        criterionId,
        criterionName.substring(0, 255),
        measurementDate,
        this.safeNumber(measurement.actual_value),
        this.safeNumber(measurement.target_value),
        measurement.units ? measurement.units.substring(0, 50) : null,
        this.safeNumber(measurement.variance),
        this.safeNumber(measurement.variance_percentage),
        trend,
        status,
        notes,
        sourceDocumentId, // Now properly resolved
        userId,
        userId
      )
    })

    if (values.length === 0) {
      logger.warn('[EXTRACTION] No valid performance measurements to store after validation')
      return
    }

    await client.query(
      `
      INSERT INTO performance_measurements (
        project_id, success_criterion_id, success_criterion_name, measurement_date,
        actual_value, target_value, units, variance, variance_percentage, trend,
        status, notes, source_document_id, created_by, updated_by
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (project_id, success_criterion_name, measurement_date) DO UPDATE SET
        success_criterion_id = COALESCE(EXCLUDED.success_criterion_id, performance_measurements.success_criterion_id),
        actual_value = EXCLUDED.actual_value,
        target_value = EXCLUDED.target_value,
        units = EXCLUDED.units,
        variance = EXCLUDED.variance,
        variance_percentage = EXCLUDED.variance_percentage,
        trend = EXCLUDED.trend,
        status = EXCLUDED.status,
        notes = EXCLUDED.notes,
        source_document_id = COALESCE(EXCLUDED.source_document_id, performance_measurements.source_document_id),
        updated_by = COALESCE(EXCLUDED.updated_by, performance_measurements.updated_by, EXCLUDED.created_by),
        updated_at = CURRENT_TIMESTAMP
    `,
      values
    )

    logger.info(`[EXTRACTION] Saved ${uniquePerformanceMeasurements.length} performance measurements (deduplicated from ${performanceMeasurements.length})`)
  }

  /**
   * Save earned value metrics to database
   */
  private async saveEarnedValueMetrics(
    client: PoolClient,
    projectId: string,
    userId: string,
    earnedValueMetrics: EarnedValueMetric[]
  ): Promise<void> {
    if (earnedValueMetrics.length === 0) {
      logger.info('[EXTRACTION] No earned_value_metrics to save, skipping')
      return
    }

    // Deduplicate EVM metrics by measurement_date (AI sometimes extracts same metric multiple times)
    const deduplicatedMap = new Map<string, EarnedValueMetric>()
    
    earnedValueMetrics.forEach(metric => {
      const measurementDate = this.normalizeDate(metric.measurement_date)
      if (!measurementDate) {
        return
      }
      
      const key = measurementDate
      
      if (!deduplicatedMap.has(key)) {
        deduplicatedMap.set(key, metric)
      } else {
        // Duplicate found - merge details (keep most detailed version)
        const existing = deduplicatedMap.get(key)!
        const merged: EarnedValueMetric = {
          ...existing,
          planned_value: metric.planned_value !== undefined ? metric.planned_value : existing.planned_value,
          earned_value: metric.earned_value !== undefined ? metric.earned_value : existing.earned_value,
          actual_cost: metric.actual_cost !== undefined ? metric.actual_cost : existing.actual_cost,
          schedule_variance: metric.schedule_variance !== undefined ? metric.schedule_variance : existing.schedule_variance,
          cost_variance: metric.cost_variance !== undefined ? metric.cost_variance : existing.cost_variance,
          schedule_performance_index: metric.schedule_performance_index !== undefined ? metric.schedule_performance_index : existing.schedule_performance_index,
          cost_performance_index: metric.cost_performance_index !== undefined ? metric.cost_performance_index : existing.cost_performance_index,
          estimate_at_completion: metric.estimate_at_completion !== undefined ? metric.estimate_at_completion : existing.estimate_at_completion,
          estimate_to_complete: metric.estimate_to_complete !== undefined ? metric.estimate_to_complete : existing.estimate_to_complete,
          notes: metric.notes || existing.notes
        }
        deduplicatedMap.set(key, merged)
        logger.debug(`[EXTRACTION-EARNED_VALUE_METRICS] Merged duplicate EVM metric: ${measurementDate}`)
      }
    })
    
    const uniqueEarnedValueMetrics = Array.from(deduplicatedMap.values())
    
    if (uniqueEarnedValueMetrics.length < earnedValueMetrics.length) {
      logger.info(`[EXTRACTION-EARNED_VALUE_METRICS] Deduplicated ${earnedValueMetrics.length} → ${uniqueEarnedValueMetrics.length} EVM metrics`)
    }

    const values: any[] = []
    const placeholders: string[] = []

    uniqueEarnedValueMetrics.forEach(metric => {
      const measurementDate = this.normalizeDate(metric.measurement_date)
      if (!measurementDate) {
        logger.warn(`[EXTRACTION] Skipping EVM metric due to invalid date (${metric.measurement_date})`)
        return
      }

      const rowIndex = placeholders.length
      const offset = rowIndex * 15
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14}, $${offset + 15})`
      )

      const notesSegments = []
      if (metric.notes) {
        notesSegments.push(metric.notes)
      }
      if (metric.source_document) {
        notesSegments.push(`Source: ${metric.source_document}`)
      }
      const notes = notesSegments.length > 0 ? notesSegments.join('\n\n') : null

      values.push(
        projectId,
        measurementDate,
        this.safeNumber(metric.planned_value),
        this.safeNumber(metric.earned_value),
        this.safeNumber(metric.actual_cost),
        this.safeNumber(metric.schedule_variance),
        this.safeNumber(metric.cost_variance),
        this.safeNumber(metric.schedule_performance_index),
        this.safeNumber(metric.cost_performance_index),
        this.safeNumber(metric.estimate_at_completion),
        this.safeNumber(metric.estimate_to_complete),
        notes,
        (metric as any).source_document_id || null, // Resolve source_document_id
        userId,
        userId
      )
    })

    if (values.length === 0) {
      logger.warn('[EXTRACTION] No valid earned value metrics to store after validation')
      return
    }

    await client.query(
      `
      INSERT INTO earned_value_metrics (
        project_id, measurement_date, planned_value, earned_value, actual_cost,
        schedule_variance, cost_variance, schedule_performance_index, cost_performance_index,
        estimate_at_completion, estimate_to_complete, notes, source_document_id, created_by, updated_by
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (project_id, measurement_date) DO UPDATE SET
        planned_value = EXCLUDED.planned_value,
        earned_value = EXCLUDED.earned_value,
        actual_cost = EXCLUDED.actual_cost,
        schedule_variance = EXCLUDED.schedule_variance,
        cost_variance = EXCLUDED.cost_variance,
        schedule_performance_index = EXCLUDED.schedule_performance_index,
        cost_performance_index = EXCLUDED.cost_performance_index,
        estimate_at_completion = EXCLUDED.estimate_at_completion,
        estimate_to_complete = EXCLUDED.estimate_to_complete,
        notes = EXCLUDED.notes,
        source_document_id = COALESCE(EXCLUDED.source_document_id, earned_value_metrics.source_document_id),
        updated_by = EXCLUDED.updated_by,
        updated_at = CURRENT_TIMESTAMP
    `,
      values
    )

    logger.info(`[EXTRACTION] Saved ${uniqueEarnedValueMetrics.length} earned value metric snapshots (deduplicated from ${earnedValueMetrics.length})`)
  }

  /**
   * Save opportunities to database
   */
  private async saveOpportunities(
    client: PoolClient,
    projectId: string,
    userId: string,
    opportunities: OpportunityRecord[]
  ): Promise<void> {
    if (opportunities.length === 0) {
      logger.info('[EXTRACTION] No opportunities to save, skipping')
      return
    }

    const scaleMap: Record<string, string> = {
      very_high: 'very_high',
      'very high': 'very_high',
      high: 'high',
      medium: 'medium',
      moderate: 'medium',
      low: 'low',
      very_low: 'very_low',
      'very low': 'very_low'
    }
    const statusMap: Record<string, string> = {
      identified: 'identified',
      planned: 'planned',
      planning: 'planned',
      exploiting: 'exploiting',
      executing: 'exploiting',
      realized: 'realized',
      captured: 'realized',
      won: 'realized',
      missed: 'missed',
      lost: 'missed'
    }

    // Deduplicate opportunities by title (AI sometimes extracts same opportunity multiple times)
    const deduplicatedMap = new Map<string, OpportunityRecord>()
    
    opportunities.forEach(opportunity => {
      const normalizedTitle = (opportunity.title || '').trim().toLowerCase()
      
      if (!normalizedTitle) {
        return
      }
      
      if (!deduplicatedMap.has(normalizedTitle)) {
        deduplicatedMap.set(normalizedTitle, opportunity)
      } else {
        // Duplicate found - merge details (keep most detailed version)
        const existing = deduplicatedMap.get(normalizedTitle)!
        const merged: OpportunityRecord = {
          ...existing,
          description: opportunity.description || existing.description,
          category: opportunity.category || existing.category,
          probability: opportunity.probability || existing.probability,
          benefit_level: opportunity.benefit_level || existing.benefit_level,
          exploitation_strategy: opportunity.exploitation_strategy || existing.exploitation_strategy,
          owner: opportunity.owner || existing.owner,
          status: opportunity.status || existing.status,
          expected_benefit: opportunity.expected_benefit !== undefined ? opportunity.expected_benefit : existing.expected_benefit,
          trigger_conditions: opportunity.trigger_conditions || existing.trigger_conditions
        }
        deduplicatedMap.set(normalizedTitle, merged)
        logger.debug(`[EXTRACTION-OPPORTUNITIES] Merged duplicate opportunity: "${opportunity.title}"`)
      }
    })
    
    const uniqueOpportunities = Array.from(deduplicatedMap.values())
    
    if (uniqueOpportunities.length < opportunities.length) {
      logger.info(`[EXTRACTION-OPPORTUNITIES] Deduplicated ${opportunities.length} → ${uniqueOpportunities.length} opportunities`)
    }

    const values: any[] = []
    const placeholders: string[] = []

    uniqueOpportunities.forEach((opportunity, index) => {
      const offset = index * 14
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14})`
      )

      const probabilityKey = (opportunity.probability || '').toLowerCase()
      const benefitKey = (opportunity.benefit_level || '').toLowerCase()
      const statusKey = (opportunity.status || 'identified').toLowerCase()

      const notesSegments = []
      if (opportunity.source_document) {
        notesSegments.push(`Source: ${opportunity.source_document}`)
      }

      values.push(
        projectId,
        opportunity.title?.substring(0, 255) || 'Opportunity',
        opportunity.description || null,
        opportunity.category || null,
        scaleMap[probabilityKey] || 'medium',
        scaleMap[benefitKey] || 'medium',
        opportunity.exploitation_strategy || null,
        opportunity.owner ? opportunity.owner.substring(0, 255) : null,
        statusMap[statusKey] || 'identified',
        this.safeNumber(opportunity.expected_benefit),
        opportunity.trigger_conditions || null,
        (opportunity as any).source_document_id || null, // Resolve source_document_id
        userId,
        userId
      )
    })

    await client.query(
      `
      INSERT INTO opportunities (
        project_id, title, description, category, probability, benefit_level,
        exploitation_strategy, owner, status, expected_benefit, trigger_conditions,
        source_document_id, created_by, updated_by
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (project_id, title) DO UPDATE SET
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        probability = EXCLUDED.probability,
        benefit_level = EXCLUDED.benefit_level,
        exploitation_strategy = EXCLUDED.exploitation_strategy,
        owner = EXCLUDED.owner,
        status = EXCLUDED.status,
        expected_benefit = EXCLUDED.expected_benefit,
        trigger_conditions = EXCLUDED.trigger_conditions,
        source_document_id = COALESCE(EXCLUDED.source_document_id, opportunities.source_document_id),
        updated_by = EXCLUDED.updated_by,
        updated_at = CURRENT_TIMESTAMP
    `,
      values
    )

    logger.info(`[EXTRACTION] Saved ${uniqueOpportunities.length} opportunities (deduplicated from ${opportunities.length})`)
  }

  /**
   * Save risk responses to database
   */
  private async saveRiskResponses(
    client: PoolClient,
    projectId: string,
    userId: string,
    riskResponses: RiskResponseRecord[]
  ): Promise<void> {
    if (riskResponses.length === 0) {
      logger.info('[EXTRACTION] No risk_responses to save, skipping')
      return
    }

    const effectivenessMap: Record<string, string> = {
      effective: 'effective',
      success: 'effective',
      successful: 'effective',
      partially_effective: 'partially_effective',
      'partially effective': 'partially_effective',
      partial: 'partially_effective',
      ineffective: 'ineffective',
      failed: 'ineffective'
    }
    const scaleMap: Record<string, string> = {
      very_high: 'very_high',
      'very high': 'very_high',
      high: 'high',
      medium: 'medium',
      moderate: 'medium',
      low: 'low',
      very_low: 'very_low',
      'very low': 'very_low'
    }

    const riskMap = await this.getRiskIdMap(client, projectId)

    // Deduplicate risk responses by risk_title + response_date (AI sometimes extracts same response multiple times)
    const deduplicatedMap = new Map<string, RiskResponseRecord>()
    
    riskResponses.forEach(response => {
      const normalizedRiskTitle = (response.risk_title || '').trim().toLowerCase()
      const responseDate = this.normalizeDate(response.response_date)
      
      if (!normalizedRiskTitle || !responseDate) {
        return
      }
      
      const key = `${normalizedRiskTitle}:${responseDate}`
      
      if (!deduplicatedMap.has(key)) {
        deduplicatedMap.set(key, response)
      } else {
        // Duplicate found - merge details (keep most detailed version)
        const existing = deduplicatedMap.get(key)!
        const merged: RiskResponseRecord = {
          ...existing,
          action_taken: response.action_taken || existing.action_taken,
          effectiveness: response.effectiveness || existing.effectiveness,
          cost_of_response: response.cost_of_response !== undefined ? response.cost_of_response : existing.cost_of_response,
          residual_risk_level: response.residual_risk_level || existing.residual_risk_level,
          owner: response.owner || existing.owner,
          notes: response.notes || existing.notes
        }
        deduplicatedMap.set(key, merged)
        logger.debug(`[EXTRACTION-RISK_RESPONSES] Merged duplicate risk response: "${response.risk_title}" (${responseDate})`)
      }
    })
    
    const uniqueRiskResponses = Array.from(deduplicatedMap.values())
    
    if (uniqueRiskResponses.length < riskResponses.length) {
      logger.info(`[EXTRACTION-RISK_RESPONSES] Deduplicated ${riskResponses.length} → ${uniqueRiskResponses.length} risk responses`)
    }

    // Early return if no valid responses after deduplication
    if (uniqueRiskResponses.length === 0) {
      logger.info('[EXTRACTION-RISK_RESPONSES] No valid risk responses to save after deduplication')
      return
    }

    const values: any[] = []
    const placeholders: string[] = []

    uniqueRiskResponses.forEach((response, index) => {
      const offset = index * 13
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13})`
      )

      const normalizedRiskTitle = response.risk_title ? response.risk_title.toLowerCase().trim() : ''
      const riskId = normalizedRiskTitle ? riskMap.get(normalizedRiskTitle) || null : null
      if (!riskId && normalizedRiskTitle) {
        logger.debug(`[EXTRACTION] No risk match for "${response.risk_title}", storing without linkage`)
      }

      const effectivenessKey = (response.effectiveness || '').toLowerCase().replace(/\s+/g, '_')
      const effectiveness = effectivenessMap[effectivenessKey] || 'effective'

      const residualKey = (response.residual_risk_level || '').toLowerCase()
      const residualRiskLevel = scaleMap[residualKey] || null

      const notesSegments = []
      if (response.notes) {
        notesSegments.push(response.notes)
      }
      if (response.source_document) {
        notesSegments.push(`Source: ${response.source_document}`)
      }
      const notes = notesSegments.length > 0 ? notesSegments.join('\n\n') : null

      values.push(
        projectId,
        riskId,
        response.risk_title ? response.risk_title.substring(0, 255) : null,
        this.normalizeDate(response.response_date),
        response.action_taken || null,
        effectiveness,
        this.safeNumber(response.cost_of_response),
        residualRiskLevel,
        response.owner ? response.owner.substring(0, 255) : null,
        notes,
        (response as any).source_document_id || null, // Resolve source_document_id
        userId,
        userId
      )
    })

    // Validate placeholder/value alignment
    const expectedValuesLength = uniqueRiskResponses.length * 13
    if (values.length !== expectedValuesLength) {
      throw new Error(`Placeholder/value misalignment: ${values.length} values but ${uniqueRiskResponses.length} placeholders (expected ${expectedValuesLength} values)`)
    }

    await client.query(
      `INSERT INTO risk_responses (
        project_id, risk_id, risk_title, response_date, action_taken, effectiveness,
        cost_of_response, residual_risk_level, owner, notes, source_document_id,
        created_by, updated_by
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (project_id, risk_title, response_date) DO UPDATE SET
        risk_id = COALESCE(EXCLUDED.risk_id, risk_responses.risk_id),
        action_taken = EXCLUDED.action_taken,
        effectiveness = EXCLUDED.effectiveness,
        cost_of_response = EXCLUDED.cost_of_response,
        residual_risk_level = EXCLUDED.residual_risk_level,
        owner = EXCLUDED.owner,
        notes = EXCLUDED.notes,
        source_document_id = COALESCE(EXCLUDED.source_document_id, risk_responses.source_document_id),
        updated_by = EXCLUDED.updated_by,
        updated_at = CURRENT_TIMESTAMP`,
      values
    )

    logger.info(`[EXTRACTION] Saved ${uniqueRiskResponses.length} risk responses (deduplicated from ${riskResponses.length})`)
  }

  /**
   * Save performance actuals to database
   * Variances are automatically calculated by database trigger
   */
  private async savePerformanceActuals(
    client: PoolClient,
    projectId: string,
    userId: string,
    performanceActuals: PerformanceActual[]
  ): Promise<void> {
    if (performanceActuals.length === 0) {
      logger.info('[EXTRACTION] No performance_actuals to save, skipping')
      return
    }

    // Validate entity_type enum
    const validEntityTypes = new Set(['milestone', 'deliverable', 'activity', 'phase', 'resource'])

    // Deduplicate performance actuals by entity_type + entity_name + measurement_date (AI sometimes extracts same actual multiple times)
    const deduplicatedMap = new Map<string, PerformanceActual>()
    
    performanceActuals.forEach(actual => {
      const entityType = validEntityTypes.has(actual.entity_type) ? actual.entity_type : 'milestone'
      const measurementDate = actual.actual_end_date || actual.actual_start_date || new Date().toISOString().split('T')[0]
      const normalizedMeasurementDate = this.normalizeDate(measurementDate)
      
      if (!normalizedMeasurementDate || !actual.entity_name || actual.entity_name.trim().length === 0) {
        return
      }
      
      const key = `${entityType}:${actual.entity_name.trim().toLowerCase()}:${normalizedMeasurementDate}`
      
      if (!deduplicatedMap.has(key)) {
        deduplicatedMap.set(key, actual)
      } else {
        // Duplicate found - merge details (keep most detailed version)
        const existing = deduplicatedMap.get(key)!
        const merged: PerformanceActual = {
          ...existing,
          entity_id: actual.entity_id || existing.entity_id,
          planned_start_date: actual.planned_start_date || existing.planned_start_date,
          actual_start_date: actual.actual_start_date || existing.actual_start_date,
          planned_end_date: actual.planned_end_date || existing.planned_end_date,
          actual_end_date: actual.actual_end_date || existing.actual_end_date,
          planned_cost: actual.planned_cost !== undefined ? actual.planned_cost : existing.planned_cost,
          actual_cost: actual.actual_cost !== undefined ? actual.actual_cost : existing.actual_cost,
          planned_progress_percent: actual.planned_progress_percent !== undefined ? actual.planned_progress_percent : existing.planned_progress_percent,
          actual_progress_percent: actual.actual_progress_percent !== undefined ? actual.actual_progress_percent : existing.actual_progress_percent,
          quality_score: actual.quality_score !== undefined ? actual.quality_score : existing.quality_score,
          defects_found: actual.defects_found !== undefined ? actual.defects_found : existing.defects_found,
          rework_hours: actual.rework_hours !== undefined ? actual.rework_hours : existing.rework_hours,
          notes: actual.notes || existing.notes
        }
        deduplicatedMap.set(key, merged)
        logger.debug(`[EXTRACTION-PERFORMANCE_ACTUALS] Merged duplicate performance actual: "${actual.entity_name}" (${entityType}, ${normalizedMeasurementDate})`)
      }
    })
    
    const uniquePerformanceActuals = Array.from(deduplicatedMap.values())
    
    if (uniquePerformanceActuals.length < performanceActuals.length) {
      logger.info(`[EXTRACTION-PERFORMANCE_ACTUALS] Deduplicated ${performanceActuals.length} → ${uniquePerformanceActuals.length} performance actuals`)
    }

    const values: any[] = []
    const placeholders: string[] = []
    let validItemCount = 0 // Counter for valid items only (not forEach index)

    uniquePerformanceActuals.forEach((actual) => {
      // Validate entity_type
      const entityType = validEntityTypes.has(actual.entity_type) ? actual.entity_type : 'milestone'
      
      // Use current date as measurement_date if not provided
      const measurementDate = actual.actual_end_date || actual.actual_start_date || new Date().toISOString().split('T')[0]
      const normalizedMeasurementDate = this.normalizeDate(measurementDate)
      
      if (!normalizedMeasurementDate) {
        logger.warn(`[EXTRACTION] Skipping performance actual due to invalid measurement date: ${measurementDate}`)
        return
      }

      if (!actual.entity_name || actual.entity_name.trim().length === 0) {
        logger.warn(`[EXTRACTION] Skipping performance actual due to missing entity_name`)
        return
      }

      // Calculate offset based on valid item count (not forEach index)
      // 19 columns: project_id, entity_type, entity_id, entity_name, planned_start_date, actual_start_date, 
      // planned_end_date, actual_end_date, planned_cost, actual_cost, planned_progress_percent, 
      // actual_progress_percent, quality_score, defects_found, rework_hours, measurement_date, 
      // measurement_method, measured_by, notes
      const offset = validItemCount * 19
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14}, $${offset + 15}, $${offset + 16}, $${offset + 17}, $${offset + 18}, $${offset + 19})`
      )

      const notesSegments = []
      if (actual.notes) {
        notesSegments.push(actual.notes)
      }
      if (actual.source_document) {
        notesSegments.push(`Source: ${actual.source_document}`)
      }
      const notes = notesSegments.length > 0 ? notesSegments.join('\n\n') : null

      values.push(
        projectId,
        entityType,
        actual.entity_id || null,
        actual.entity_name.substring(0, 500),
        actual.planned_start_date ? this.normalizeDate(actual.planned_start_date) : null,
        actual.actual_start_date ? this.normalizeDate(actual.actual_start_date) : null,
        actual.planned_end_date ? this.normalizeDate(actual.planned_end_date) : null,
        actual.actual_end_date ? this.normalizeDate(actual.actual_end_date) : null,
        actual.planned_cost !== null && actual.planned_cost !== undefined ? actual.planned_cost : null,
        actual.actual_cost !== null && actual.actual_cost !== undefined ? actual.actual_cost : null,
        actual.planned_progress_percent !== null && actual.planned_progress_percent !== undefined ? actual.planned_progress_percent : null,
        actual.actual_progress_percent !== null && actual.actual_progress_percent !== undefined ? actual.actual_progress_percent : null,
        actual.quality_score !== null && actual.quality_score !== undefined ? actual.quality_score : null,
        actual.defects_found !== null && actual.defects_found !== undefined ? actual.defects_found : null,
        actual.rework_hours !== null && actual.rework_hours !== undefined ? actual.rework_hours : null,
        normalizedMeasurementDate,
        'extracted', // measurement_method
        userId, // measured_by
        notes
      )

      // Increment counter only after successfully adding a valid item
      validItemCount++
    })

    if (values.length === 0) {
      logger.warn('[EXTRACTION] No valid performance actuals to save after filtering')
      return
    }

    // Verify alignment: values.length should equal placeholders.length * 19
    if (values.length !== placeholders.length * 19) {
      logger.error('[EXTRACTION] Placeholder/value misalignment detected', {
        valuesLength: values.length,
        placeholdersLength: placeholders.length,
        expectedValuesLength: placeholders.length * 19
      })
      throw new Error(`Placeholder/value misalignment: ${values.length} values but ${placeholders.length} placeholders (expected ${placeholders.length * 19} values)`)
    }

    await client.query(
      `
      INSERT INTO performance_actuals (
        project_id, entity_type, entity_id, entity_name,
        planned_start_date, actual_start_date, planned_end_date, actual_end_date,
        planned_cost, actual_cost,
        planned_progress_percent, actual_progress_percent,
        quality_score, defects_found, rework_hours,
        measurement_date, measurement_method, measured_by, notes
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (project_id, entity_type, entity_id, entity_name, measurement_date) DO UPDATE SET
        planned_start_date = COALESCE(EXCLUDED.planned_start_date, performance_actuals.planned_start_date),
        actual_start_date = COALESCE(EXCLUDED.actual_start_date, performance_actuals.actual_start_date),
        planned_end_date = COALESCE(EXCLUDED.planned_end_date, performance_actuals.planned_end_date),
        actual_end_date = COALESCE(EXCLUDED.actual_end_date, performance_actuals.actual_end_date),
        planned_cost = COALESCE(EXCLUDED.planned_cost, performance_actuals.planned_cost),
        actual_cost = COALESCE(EXCLUDED.actual_cost, performance_actuals.actual_cost),
        planned_progress_percent = COALESCE(EXCLUDED.planned_progress_percent, performance_actuals.planned_progress_percent),
        actual_progress_percent = COALESCE(EXCLUDED.actual_progress_percent, performance_actuals.actual_progress_percent),
        quality_score = COALESCE(EXCLUDED.quality_score, performance_actuals.quality_score),
        defects_found = COALESCE(EXCLUDED.defects_found, performance_actuals.defects_found),
        rework_hours = COALESCE(EXCLUDED.rework_hours, performance_actuals.rework_hours),
        notes = COALESCE(EXCLUDED.notes, performance_actuals.notes),
        updated_at = CURRENT_TIMESTAMP
    `,
      values
    )

    logger.info(`[EXTRACTION] Saved ${uniquePerformanceActuals.length} performance actuals (deduplicated from ${performanceActuals.length})`)
  }

  /**
   * Extract a single entity type (for resilient child job processing)
   */
  async extractSingleEntityType(
    projectId: string,
    userId: string,
    entityType: string,
    options: {
      aiProvider?: string
      aiModel?: string
      documentIds?: string[]
    } = {}
  ): Promise<any[]> {
    // Get best provider/model using centralized fallback mechanism
    const { provider: bestProvider, model: bestModel } = await this.getBestAIProviderAndModel(
      options.aiProvider,
      options.aiModel
    )
    
    // Override options with best provider/model
    const extractionOptions = {
      ...options,
      aiProvider: bestProvider,
      aiModel: bestModel
    }
    
    const documents = await this.getProjectDocuments(projectId, options.documentIds)
    
    // Log document retrieval for debugging
    logger.info(`[EXTRACTION-${entityType.toUpperCase()}] Retrieved ${documents.length} documents for extraction`, {
      projectId,
      entityType,
      documentIds: options.documentIds,
      documentTitles: documents.map(d => d.title),
      totalContentLength: documents.reduce((sum, d) => sum + (d.content?.length || 0), 0),
      provider: bestProvider,
      model: bestModel
    })
    
    if (documents.length === 0) {
      logger.warn(`[EXTRACTION-${entityType.toUpperCase()}] No documents found - cannot extract entities`)
      return []
    }

    // Build document context and check cache
    const documentContext = this.buildDocumentContext(documents)
    
    const cached = await aiCacheService.get(
      projectId,
      documentContext,
      entityType,
      bestProvider,
      bestModel
    )
    
    if (cached) {
      logger.info(`[EXTRACTION-${entityType.toUpperCase()}] ✅ Using cached result (${cached.length} entities)`)
      return cached
    }

    // Cache miss - perform AI extraction
    logger.info(`[EXTRACTION-${entityType.toUpperCase()}] ❌ Cache miss, calling AI...`, {
      provider: bestProvider,
      model: bestModel,
      documentCount: documents.length,
      totalContentChars: documents.reduce((sum, d) => sum + (d.content?.length || 0), 0)
    })
    
    // Build documentMap and documentList for source document traceability
    const documentMap = this.buildDocumentMap(documents)
    const documentList = this.buildDocumentList(documents)
    
    let entities: any[]
    
    try {
      // Map entity type to extraction method - pass documents array, extractionOptions, documentMap, and documentList
      switch (entityType) {
      case 'stakeholders':
        entities = await this.extractStakeholders(documents, projectId, extractionOptions, documentMap, documentList)
        break
      case 'requirements':
        entities = await this.extractRequirements(documents, projectId, extractionOptions, documentMap, documentList)
        break
      case 'risks':
        entities = await this.extractRisks(documents, projectId, extractionOptions, documentMap, documentList)
        break
      case 'milestones':
        entities = await this.extractMilestones(documents, projectId, extractionOptions, documentMap, documentList)
        break
      case 'constraints':
        entities = await this.extractConstraints(documents, projectId, extractionOptions, documentMap, documentList)
        break
      case 'success_criteria':
        entities = await this.extractSuccessCriteria(documents, projectId, extractionOptions, documentMap, documentList)
        break
      case 'best_practices':
        entities = await this.extractBestPractices(documents, projectId, extractionOptions, documentMap, documentList)
        break
      case 'phases':
        entities = await this.extractPhases(documents, projectId, extractionOptions, documentMap, documentList)
        break
      case 'resources':
        entities = await this.extractResources(documents, projectId, extractionOptions, documentMap, documentList)
        break
      case 'technologies':
        entities = await this.extractTechnologies(documents, projectId, extractionOptions, documentMap, documentList)
        break
      case 'quality_standards':
        entities = await this.extractQualityStandards(documents, projectId, extractionOptions, documentMap, documentList)
        break
      case 'compliance_security':
        entities = await this.extractComplianceSecurity(documents, projectId, extractionOptions, documentMap, documentList)
        break
      case 'deliverables':
        entities = await this.extractDeliverables(documents, projectId, extractionOptions, documentMap, documentList)
        break
      case 'scope_items':
        entities = await this.extractScopeItems(documents, projectId, extractionOptions, documentMap, documentList)
        break
      case 'activities':
        entities = await this.extractActivities(documents, projectId, extractionOptions, documentMap, documentList)
        break
      case 'team_agreements':
        entities = await this.extractTeamAgreements(documents, projectId, extractionOptions, documentMap, documentList)
        break
      case 'development_approaches':
        entities = await this.extractDevelopmentApproaches(documents, projectId, extractionOptions, documentMap, documentList)
        break
      case 'project_iterations':
        entities = await this.extractProjectIterations(documents, projectId, extractionOptions, documentMap, documentList)
        break
      case 'work_items':
        entities = await this.extractWorkItems(documents, projectId, extractionOptions, documentMap, documentList)
        break
      case 'capacity_plans':
        entities = await this.extractCapacityPlans(documents, projectId, extractionOptions, documentMap, documentList)
        break
      case 'performance_measurements':
        entities = await this.extractPerformanceMeasurements(documents, projectId, extractionOptions, documentMap, documentList)
        break
      case 'earned_value_metrics':
        entities = await this.extractEarnedValueMetrics(documents, projectId, extractionOptions, documentMap, documentList)
        break
      case 'opportunities':
        entities = await this.extractOpportunities(documents, projectId, extractionOptions, documentMap, documentList)
        break
      case 'risk_responses':
        entities = await this.extractRiskResponses(documents, projectId, extractionOptions, documentMap, documentList)
        break
      case 'performance_actuals':
        entities = await this.extractPerformanceActuals(documents, projectId, extractionOptions, documentMap, documentList)
        break
      // ===========================================================================
      // PMBOK 8 Knowledge Area Domain entity types (Tier 2)
      // These are placeholders - full extraction methods to be implemented
      // ===========================================================================
      // Governance Domain
      case 'governance_decisions':
      case 'approval_workflows':
      case 'steering_committees':
      case 'change_control_boards':
      case 'policy_compliance':
      // Scope Domain  
      case 'scope_baselines':
      case 'wbs_nodes':
      case 'scope_change_requests':
      case 'requirements_traceability':
      case 'scope_verification':
      // Schedule Domain
      case 'schedule_baselines':
      case 'schedule_activities':
      case 'critical_path_activities':
      case 'schedule_variances':
      case 'schedule_forecasts':
      // Finance Domain
      case 'budget_baselines':
      case 'cost_actuals':
      case 'cost_estimates':
      case 'funding_tranches':
      case 'financial_variances':
      case 'procurement_costs':
      // Resources Domain
      case 'resource_assignments':
      case 'resource_pool':
      case 'capacity_forecasts':
      case 'utilization_records':
      case 'resource_conflicts':
      case 'onboarding_offboarding':
      // Risk Domain
      case 'risk_assessments':
      case 'risk_response_plans':
      case 'risk_triggers':
      case 'risk_reviews':
      case 'contingency_reserves':
      case 'risk_metrics':
      // Stakeholders Ops Domain
      case 'engagement_actions':
      case 'communication_logs':
      case 'satisfaction_surveys':
      case 'stakeholder_issues':
      case 'relationship_health':
        // Log warning for Knowledge Area Domain entities (not yet implemented)
        logger.warn(`[EXTRACTION-${entityType.toUpperCase()}] Knowledge Area Domain entity type not yet implemented, returning empty array`, {
          entityType,
          projectId,
          domain: this.getKnowledgeDomainForEntityType(entityType)
        })
        entities = []
        break
      default:
        throw new Error(`Unknown entity type: ${entityType}`)
      }
    } catch (extractionError: any) {
      const errorMessage = extractionError?.message || String(extractionError)
      logger.error(`[EXTRACTION-${entityType.toUpperCase()}] Extraction failed: ${errorMessage}`, {
        entityType,
        projectId,
        provider: bestProvider,
        model: bestModel,
        documentCount: documents.length,
        error: errorMessage,
        stack: extractionError?.stack,
        code: extractionError?.code,
        name: extractionError?.name
      })
      // Re-throw with more context so Bull can retry
      throw new Error(`Failed to extract ${entityType}: ${errorMessage}`)
    }
    
    // Cache the result for future extractions (only if successful)
    if (entities && entities.length > 0) {
      try {
        await aiCacheService.set(
          projectId,
          documentContext,
          entityType,
          entities,
          bestProvider,
          bestModel
        )
        logger.info(`[EXTRACTION-${entityType.toUpperCase()}] 💾 Cached ${entities.length} entities for future use`)
      } catch (cacheError: any) {
        // Don't fail extraction if caching fails
        logger.warn(`[EXTRACTION-${entityType.toUpperCase()}] Failed to cache results: ${cacheError?.message || cacheError}`)
      }
    }
    
    return entities || []
  }

  /**
   * Save a single entity type to database (for resilient child job processing)
   */
  async saveSingleEntityType(
    projectId: string,
    userId: string,
    entityType: string,
    entities: any[]
  ): Promise<void> {
    // Ensure pool is connected before saving
    if (!pool) {
      const { connectDatabase } = await import('@/database/connection')
      await connectDatabase()
    }
    
    if (!pool) {
      throw new Error('Database pool not initialized after connection attempt')
    }
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')

      // Map entity type to save method
      switch (entityType) {
        case 'stakeholders':
          await this.saveStakeholders(client, projectId, userId, entities)
          break
        case 'requirements':
          await this.saveRequirements(client, projectId, userId, entities)
          break
        case 'risks':
          await this.saveRisks(client, projectId, userId, entities)
          break
        case 'milestones':
          await this.saveMilestones(client, projectId, userId, entities)
          break
        case 'constraints':
          await this.saveConstraints(client, projectId, userId, entities)
          break
        case 'success_criteria':
          await this.saveSuccessCriteria(client, projectId, userId, entities)
          break
        case 'best_practices':
          await this.saveBestPractices(client, projectId, userId, entities)
          break
        case 'phases':
          await this.savePhases(client, projectId, userId, entities)
          break
        case 'resources':
          await this.saveResources(client, projectId, userId, entities)
          break
        case 'technologies':
          await this.saveTechnologies(client, projectId, userId, entities)
          break
        case 'quality_standards':
          await this.saveQualityStandards(client, projectId, userId, entities)
          break
        case 'compliance_security':
          await this.saveComplianceSecurity(client, projectId, userId, entities)
          break
        case 'deliverables':
          await this.saveDeliverables(client, projectId, userId, entities)
          break
        case 'scope_items':
          await this.saveScopeItems(client, projectId, userId, entities)
          break
        case 'activities':
          await this.saveActivities(client, projectId, userId, entities)
          break
        case 'team_agreements':
          await this.saveTeamAgreements(client, projectId, userId, entities)
          break
        case 'development_approaches':
          await this.saveDevelopmentApproaches(client, projectId, userId, entities)
          break
        case 'project_iterations':
          await this.saveProjectIterations(client, projectId, userId, entities)
          break
        case 'work_items':
          await this.saveWorkItems(client, projectId, userId, entities)
          break
        case 'capacity_plans':
          await this.saveCapacityPlans(client, projectId, userId, entities)
          break
        case 'performance_measurements':
          await this.savePerformanceMeasurements(client, projectId, userId, entities)
          break
        case 'earned_value_metrics':
          await this.saveEarnedValueMetrics(client, projectId, userId, entities)
          break
        case 'opportunities':
          await this.saveOpportunities(client, projectId, userId, entities)
          break
        case 'risk_responses':
          await this.saveRiskResponses(client, projectId, userId, entities)
          break
        case 'performance_actuals':
          await this.savePerformanceActuals(client, projectId, userId, entities)
          break
        // ===========================================================================
        // PMBOK 8 Knowledge Area Domain entity types (Tier 2)
        // These are placeholders - full save methods to be implemented
        // ===========================================================================
        // Governance Domain
        case 'governance_decisions':
        case 'approval_workflows':
        case 'steering_committees':
        case 'change_control_boards':
        case 'policy_compliance':
        // Scope Domain  
        case 'scope_baselines':
        case 'wbs_nodes':
        case 'scope_change_requests':
        case 'requirements_traceability':
        case 'scope_verification':
        // Schedule Domain
        case 'schedule_baselines':
        case 'schedule_activities':
        case 'critical_path_activities':
        case 'schedule_variances':
        case 'schedule_forecasts':
        // Finance Domain
        case 'budget_baselines':
        case 'cost_actuals':
        case 'cost_estimates':
        case 'funding_tranches':
        case 'financial_variances':
        case 'procurement_costs':
        // Resources Domain
        case 'resource_assignments':
        case 'resource_pool':
        case 'capacity_forecasts':
        case 'utilization_records':
        case 'resource_conflicts':
        case 'onboarding_offboarding':
        // Risk Domain
        case 'risk_assessments':
        case 'risk_response_plans':
        case 'risk_triggers':
        case 'risk_reviews':
        case 'contingency_reserves':
        case 'risk_metrics':
        // Stakeholders Ops Domain
        case 'engagement_actions':
        case 'communication_logs':
        case 'satisfaction_surveys':
        case 'stakeholder_issues':
        case 'relationship_health':
          // Log info for Knowledge Area Domain entities (save methods not yet implemented)
          if (entities.length > 0) {
            logger.warn(`[EXTRACTION-${entityType.toUpperCase()}] Save method not yet implemented for Knowledge Area Domain entity`, {
              entityType,
              projectId,
              entityCount: entities.length,
              domain: this.getKnowledgeDomainForEntityType(entityType)
            })
          }
          // Skip saving - these will be empty arrays from extraction anyway
          break
        default:
          throw new Error(`Unknown entity type: ${entityType}`)
      }

      await client.query('COMMIT')
      logger.info(`[EXTRACTION] Successfully saved ${entities.length} ${entityType}`)
      
    } catch (error: any) {
      await client.query('ROLLBACK')
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error(`[EXTRACTION] Failed to save ${entityType}: ${errorMessage}`, {
        entityType,
        projectId,
        userId,
        entityCount: entities.length,
        error: errorMessage,
        stack: error?.stack,
        code: error?.code,
        detail: error?.detail
      })
      // Re-throw with more context
      throw new Error(`Failed to save ${entityType} (${entities.length} entities): ${errorMessage}`)
    } finally {
      client.release()
    }
  }
}

export const projectDataExtractionService = new ProjectDataExtractionService()

