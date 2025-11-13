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

      // Step 2: Extract entities using AI (parallel execution for speed)
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
        riskResponses
      ] = await Promise.all([
        this.extractStakeholders(documents, projectId, extractionOptions),
        this.extractRequirements(documents, projectId, extractionOptions),
        this.extractRisks(documents, projectId, extractionOptions),
        this.extractMilestones(documents, projectId, extractionOptions),
        this.extractConstraints(documents, projectId, extractionOptions),
        this.extractSuccessCriteria(documents, projectId, extractionOptions),
        this.extractBestPractices(documents, projectId, extractionOptions),
        this.extractPhases(documents, projectId, extractionOptions),
        this.extractResources(documents, projectId, extractionOptions),
        this.extractTechnologies(documents, projectId, extractionOptions),
        this.extractQualityStandards(documents, projectId, extractionOptions),
        this.extractDeliverables(documents, projectId, extractionOptions),
        this.extractScopeItems(documents, projectId, extractionOptions),
        this.extractActivities(documents, projectId, extractionOptions),
        this.extractTeamAgreements(documents, projectId, extractionOptions),
        this.extractDevelopmentApproaches(documents, projectId, extractionOptions),
        this.extractProjectIterations(documents, projectId, extractionOptions),
        this.extractWorkItems(documents, projectId, extractionOptions),
        this.extractCapacityPlans(documents, projectId, extractionOptions),
        this.extractPerformanceMeasurements(documents, projectId, extractionOptions),
        this.extractEarnedValueMetrics(documents, projectId, extractionOptions),
        this.extractOpportunities(documents, projectId, extractionOptions),
        this.extractRiskResponses(documents, projectId, extractionOptions)
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
          riskResponses: riskResponses.length
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
        risk_responses: riskResponses
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
          d.title,
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
    options: { aiProvider?: string; aiModel?: string }
  ): Promise<Stakeholder[]> {
    try {
      logger.info('[EXTRACTION-STAKEHOLDERS] Starting extraction')

      const documentContext = this.buildDocumentContext(documents)
      
      const prompt = `Analyze the following project documents and extract ALL stakeholders mentioned.

${documentContext}

Extract stakeholders in JSON format with the following structure:
{
  "stakeholders": [
    {
      "name": "Stakeholder Name or Role",
      "role": "Their role in the project",
      "interest_level": "high|medium|low",
      "influence_level": "high|medium|low",
      "expectations": "What they expect from the project",
      "concerns": "Any concerns they have"
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
- Return ONLY valid JSON, no markdown or explanation`

      const response = await aiService.generate({
        prompt,
        provider: options.aiProvider!,
        model: options.aiModel,
        temperature: 0.3,
        max_tokens: 2000
      })

      // Validate AI response - throw error to trigger retry/fallback
      this.validateAIResponse(response, 'stakeholders', options)

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

      // Deduplicate stakeholders by normalized name
      const stakeholders = this.deduplicateStakeholders(rawStakeholders)
      
      if (rawStakeholders.length !== stakeholders.length) {
        logger.info(`[EXTRACTION-STAKEHOLDERS] Removed ${rawStakeholders.length - stakeholders.length} duplicates`)
      }

      logger.info(`[EXTRACTION-STAKEHOLDERS] Extracted ${stakeholders.length} stakeholders`)

      return stakeholders
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
    options: { aiProvider?: string; aiModel?: string }
  ): Promise<Requirement[]> {
    try {
      logger.info('[EXTRACTION-REQUIREMENTS] Starting extraction')

      const documentContext = this.buildDocumentContext(documents)
      
      const prompt = `Analyze the following project documents and extract ALL requirements mentioned.

${documentContext}

Extract requirements in JSON format with the following structure:
{
  "requirements": [
    {
      "title": "Requirement Title",
      "description": "Detailed description",
      "type": "functional|non-functional|business|technical",
      "priority": "critical|high|medium|low",
      "status": "proposed|approved|in_progress|completed",
      "acceptance_criteria": "How to verify this requirement"
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
- Return ONLY valid JSON, no markdown or explanation`

      const response = await aiService.generate({
        prompt,
        provider: options.aiProvider!,
        model: options.aiModel,
        temperature: 0.3,
        max_tokens: 3000
      })

      const parsed = this.parseAIResponse(response.content)
      const requirements = parsed.requirements || []

      logger.info(`[EXTRACTION-REQUIREMENTS] Extracted ${requirements.length} requirements`)

      return requirements
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
    options: { aiProvider?: string; aiModel?: string }
  ): Promise<Risk[]> {
    try {
      logger.info('[EXTRACTION-RISKS] Starting extraction')

      const documentContext = this.buildDocumentContext(documents)
      
      const prompt = `Analyze the following project documents and extract ALL risks mentioned.

${documentContext}

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
      "contingency_plan": "What to do if the risk occurs"
    }
  ]
}

Requirements:
- Include ALL risks mentioned in any document
- Categorize risks appropriately
- Assess probability and impact from context
- Extract mitigation strategies if mentioned
- Extract contingency plans if mentioned
- Return ONLY valid JSON, no markdown or explanation`

      const response = await aiService.generate({
        prompt,
        provider: options.aiProvider!,
        model: options.aiModel,
        temperature: 0.3,
        max_tokens: 2500
      })

      const parsed = this.parseAIResponse(response.content)
      const risks = parsed.risks || []

      logger.info(`[EXTRACTION-RISKS] Extracted ${risks.length} risks`)

      return risks
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
    options: { aiProvider?: string; aiModel?: string }
  ): Promise<Milestone[]> {
    try {
      logger.info('[EXTRACTION-MILESTONES] Starting extraction')

      const documentContext = this.buildDocumentContext(documents)
      
      const prompt = `Analyze the following project documents and extract ONLY major project milestones.

${documentContext}

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
      "deliverables": ["Deliverable 1", "Deliverable 2"]
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

      logger.info(`[EXTRACTION-MILESTONES] Extracted ${milestones.length} milestones`)

      return milestones
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
    options: { aiProvider?: string; aiModel?: string }
  ): Promise<Constraint[]> {
    try {
      logger.info('[EXTRACTION-CONSTRAINTS] Starting extraction')

      const documentContext = this.buildDocumentContext(documents)
      
      const prompt = `Analyze the following project documents and extract ALL constraints mentioned.

${documentContext}

Extract constraints in JSON format with the following structure:
{
  "constraints": [
    {
      "title": "Constraint Title",
      "description": "Detailed description",
      "type": "scope|time|cost|quality|resource|technical|regulatory",
      "severity": "high|medium|low",
      "impact_area": "Which area of the project is affected"
    }
  ]
}

Requirements:
- Include budget constraints, timeline constraints, resource constraints
- Include technical constraints (technology, platform, integration)
- Include regulatory/compliance constraints
- Include scope constraints (what's out of scope)
- Assess severity based on impact to project
- Return ONLY valid JSON, no markdown or explanation`

      const response = await aiService.generate({
        prompt,
        provider: options.aiProvider!,
        model: options.aiModel,
        temperature: 0.3,
        max_tokens: 2000
      })

      const parsed = this.parseAIResponse(response.content)
      const constraints = parsed.constraints || []

      logger.info(`[EXTRACTION-CONSTRAINTS] Extracted ${constraints.length} constraints`)

      return constraints
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
    options: { aiProvider?: string; aiModel?: string }
  ): Promise<SuccessCriterion[]> {
    try {
      logger.info('[EXTRACTION-SUCCESS-CRITERIA] Starting extraction')

      const documentContext = this.buildDocumentContext(documents)
      
      const prompt = `Analyze the following project documents and extract ALL success criteria and KPIs mentioned.

${documentContext}

Extract success criteria in JSON format with the following structure:
{
  "success_criteria": [
    {
      "title": "Success Criterion Title",
      "description": "What defines success",
      "metric": "The measurable metric",
      "target_value": "The target value to achieve",
      "measurement_method": "How this will be measured",
      "priority": "critical|high|medium|low"
    }
  ]
}

Requirements:
- Include KPIs (Key Performance Indicators)
- Include acceptance criteria
- Include quality gates
- Include success metrics (time, cost, quality, satisfaction)
- Extract specific measurable targets if mentioned
- Return ONLY valid JSON, no markdown or explanation`

      const response = await aiService.generate({
        prompt,
        provider: options.aiProvider!,
        model: options.aiModel,
        temperature: 0.3,
        max_tokens: 2000
      })

      const parsed = this.parseAIResponse(response.content)
      const successCriteria = parsed.success_criteria || []

      logger.info(`[EXTRACTION-SUCCESS-CRITERIA] Extracted ${successCriteria.length} success criteria`)

      return successCriteria
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
    options: { aiProvider?: string; aiModel?: string }
  ): Promise<BestPractice[]> {
    try {
      logger.info('[EXTRACTION-BEST-PRACTICES] Starting extraction')

      const documentContext = this.buildDocumentContext(documents)
      
      const prompt = `Analyze the following project documents and extract ALL best practices, lessons learned, and recommendations mentioned.

${documentContext}

Extract best practices in JSON format with the following structure:
{
  "best_practices": [
    {
      "title": "Best Practice Title",
      "description": "Detailed description",
      "category": "Category (e.g., Development, Testing, Communication)",
      "applicability": "When/where this applies"
    }
  ]
}

Requirements:
- Include best practices mentioned in any document
- Include lessons learned
- Include recommendations for future projects
- Categorize appropriately
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

      logger.info(`[EXTRACTION-BEST-PRACTICES] Extracted ${bestPractices.length} best practices`)

      return bestPractices
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
    options: { aiProvider?: string; aiModel?: string }
  ): Promise<Phase[]> {
    try {
      logger.info('[EXTRACTION-PHASES] Starting extraction')

      const documentContext = this.buildDocumentContext(documents)
      
      const prompt = `Analyze the following project documents and extract ALL project phases mentioned.

${documentContext}

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
      "key_activities": ["Activity 1", "Activity 2"]
    }
  ]
}

Requirements:
- Include ALL phases mentioned (Initiation, Planning, Execution, Monitoring, Closing, etc.)
- Extract deliverables for each phase
- Extract key activities
- Infer status from context
- Return ONLY valid JSON, no markdown or explanation`

      const response = await aiService.generate({
        prompt,
        provider: options.aiProvider!,
        model: options.aiModel,
        temperature: 0.3,
        max_tokens: 1500
      })

      const parsed = this.parseAIResponse(response.content)
      const phases = parsed.phases || []

      logger.info(`[EXTRACTION-PHASES] Extracted ${phases.length} phases`)

      return phases
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
    options: { aiProvider?: string; aiModel?: string }
  ): Promise<Resource[]> {
    try {
      logger.info('[EXTRACTION-RESOURCES] Starting extraction')

      const documentContext = this.buildDocumentContext(documents)
      
      const prompt = `Analyze the following project documents and extract ALL resources mentioned.

${documentContext}

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
      "development_plan": "Summary of development actions"
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

      logger.info(`[EXTRACTION-RESOURCES] Extracted ${resources.length} resources`)

      return resources
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
    options: { aiProvider?: string; aiModel?: string }
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
      "deployment_environment": "Where deployed (production, staging, development, all, cloud, on-premises)"
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

      const response = await aiService.generate({
        prompt,
        provider: options.aiProvider!,
        model: options.aiModel,
        temperature: 0.3,
        max_tokens: 2000
      })

      const parsed = this.parseAIResponse(response.content)
      const technologies = parsed.technologies || []

      logger.info(`[EXTRACTION-TECHNOLOGIES] Extracted ${technologies.length} technologies`)
      
      return technologies
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
    options: { aiProvider?: string; aiModel?: string }
  ): Promise<QualityStandard[]> {
    try {
      logger.info('[EXTRACTION-QUALITY] Starting extraction')

      const documentContext = this.buildDocumentContext(documents)
      
      const prompt = `Analyze the following project documents and extract ALL quality standards and requirements mentioned.

${documentContext}

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
      "compliance_level": "mandatory|recommended|optional"
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

      logger.info(`[EXTRACTION-QUALITY] Extracted ${qualityStandards.length} quality standards`)

      return qualityStandards
    } catch (error: unknown) {
      logger.error('[EXTRACTION-QUALITY] Extraction failed', {
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
    options: { aiProvider?: string; aiModel?: string }
  ): Promise<Deliverable[]> {
    try {
      logger.info('[EXTRACTION-DELIVERABLES] Starting extraction')

      const documentContext = this.buildDocumentContext(documents)
      
      const prompt = `Analyze the following project documents and extract ALL deliverables mentioned.

${documentContext}

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
      "phase": "Which phase it belongs to"
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
- Return ONLY valid JSON, no markdown or explanation`

      const response = await aiService.generate({
        prompt,
        provider: options.aiProvider!,
        model: options.aiModel,
        temperature: 0.3,
        max_tokens: 2500
      })

      const parsed = this.parseAIResponse(response.content)
      const deliverables = parsed.deliverables || []

      logger.info(`[EXTRACTION-DELIVERABLES] Extracted ${deliverables.length} deliverables`)

      return deliverables
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
    options: { aiProvider?: string; aiModel?: string }
  ): Promise<ScopeItem[]> {
    try {
      logger.info('[EXTRACTION-SCOPE] Starting extraction')

      const documentContext = this.buildDocumentContext(documents)
      
      const prompt = `Analyze the following project documents and extract ALL scope items (both in-scope and out-of-scope).

${documentContext}

Extract scope items in JSON format with the following structure:
{
  "scope_items": [
    {
      "title": "Scope Item Title",
      "description": "Detailed description",
      "is_in_scope": true|false,
      "category": "Category (feature, function, module, etc.)",
      "justification": "Why it's in or out of scope",
      "priority": "must_have|should_have|could_have|wont_have"
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
- Return ONLY valid JSON, no markdown or explanation`

      const response = await aiService.generate({
        prompt,
        provider: options.aiProvider!,
        model: options.aiModel,
        temperature: 0.3,
        max_tokens: 2500
      })

      const parsed = this.parseAIResponse(response.content)
      const scopeItems = parsed.scope_items || []

      logger.info(`[EXTRACTION-SCOPE] Extracted ${scopeItems.length} scope items`)

      return scopeItems
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
    options: { aiProvider?: string; aiModel?: string }
  ): Promise<Activity[]> {
    try {
      logger.info('[EXTRACTION-ACTIVITIES] Starting extraction')

      const documentContext = this.buildDocumentContext(documents)
      
      const prompt = `Analyze the following project documents and extract ALL activities, tasks, and work packages mentioned.

${documentContext}

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
      "effort_unit": "hours|days|story_points"
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
- Return ONLY valid JSON, no markdown or explanation`

      const response = await aiService.generate({
        prompt,
        provider: options.aiProvider!,
        model: options.aiModel,
        temperature: 0.3,
        max_tokens: 3500
      })

      const parsed = this.parseAIResponse(response.content)
      const activities = parsed.activities || []

      logger.info(`[EXTRACTION-ACTIVITIES] Extracted ${activities.length} activities`)

      return activities
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
    options: { aiProvider?: string; aiModel?: string }
  ): Promise<TeamAgreement[]> {
    try {
      logger.info('[EXTRACTION-TEAM-AGREEMENTS] Starting extraction')

      const documentContext = this.buildDocumentContext(documents)

      const prompt = `You are analyzing project documentation to extract **Team Agreements** aligned with the PMBOK 8 **Team Performance Domain**.

SOURCE DOCUMENTS:
${documentContext}

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
      "source_document": "Document title where this was found"
    }
  ]
}

Rules:
- Capture explicit or implied team working agreements, norms, or ground rules.
- Use arrays for agreed_by even if a single name is mentioned.
- If information is missing, use null or an empty array instead of inventing data.
- Return ONLY valid JSON.`

      const response = await aiService.generate({
        prompt,
        provider: options.aiProvider!,
        model: options.aiModel,
        temperature: 0.25,
        max_tokens: 2500
      })

      const parsed = this.parseAIResponse(response.content)
      const agreements = (parsed.team_agreements || []).map((agreement: any) => ({
        ...agreement,
        agreed_by: this.ensureStringArray(agreement?.agreed_by),
        adherence_score: this.safeNumber(agreement?.adherence_score),
        violations_count: this.safeInteger(agreement?.violations_count)
      }))

      logger.info(`[EXTRACTION-TEAM-AGREEMENTS] Extracted ${agreements.length} team agreements`)

      return agreements
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
    options: { aiProvider?: string; aiModel?: string }
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

      // Use generateWithFallback for automatic provider fallback if requested provider is unavailable
      const response = await aiService.generateWithFallback({
        prompt,
        provider: options.aiProvider || 'openai',
        model: options.aiModel,
        temperature: 0.3,
        max_tokens: 2500
      }, ['openai', 'google', 'anthropic', 'mistral', 'groq'])

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
        life_cycle_phases: this.ensureStringArray(approach.life_cycle_phases || approach.lifecycle_model ? [approach.lifecycle_model] : []),
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
    options: { aiProvider?: string; aiModel?: string }
  ): Promise<ProjectIteration[]> {
    try {
      logger.info('[EXTRACTION-ITERATIONS] Starting extraction')

      const documentContext = this.buildDocumentContext(documents)

      const prompt = `Extract **iterations / sprints / releases** described in the documentation.

SOURCE DOCUMENTS:
${documentContext}

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
      "source_document": "Document title"
    }
  ]
}

Rules:
- Include schedule-based iterations (sprints, increments, phases).
- Convert backlog goals or OKRs into the goals array.
- Use null for unknown numeric values, and arrays for multi-item fields.
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

      logger.info(`[EXTRACTION-ITERATIONS] Extracted ${iterations.length} iterations`)

      return iterations
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
    options: { aiProvider?: string; aiModel?: string }
  ): Promise<WorkItemRecord[]> {
    try {
      logger.info('[EXTRACTION-WORK-ITEMS] Starting extraction')

      const documentContext = this.buildDocumentContext(documents)

      const prompt = `Identify **work items / tasks / backlog items** with effort tracking details.

SOURCE DOCUMENTS:
${documentContext}

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
      "source_document": "Document title"
    }
  ]
}

Guidelines:
- Include items with measurable effort or progress tracking.
- Convert percentages like "65%" to numbers.
- Use arrays for blockers even if single.
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

      logger.info(`[EXTRACTION-WORK-ITEMS] Extracted ${workItems.length} work items`)

      return workItems
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
    options: { aiProvider?: string; aiModel?: string }
  ): Promise<CapacityPlan[]> {
    try {
      logger.info('[EXTRACTION-CAPACITY] Starting extraction')

      const documentContext = this.buildDocumentContext(documents)

      const prompt = `Extract **capacity plans / staffing allocations** for team members.

SOURCE DOCUMENTS:
${documentContext}

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
      "source_document": "Document title"
    }
  ]
}

Rules:
- Always include period_start and period_end (estimate if only month provided; use first/last day of month).
- Convert utilization percentages (e.g., 75%) to numeric values.
- Use null for unknown numeric values.
- Return ONLY valid JSON.`

      const response = await aiService.generate({
        prompt,
        provider: options.aiProvider!,
        model: options.aiModel,
        temperature: 0.25,
        max_tokens: 2300
      })

      const parsed = this.parseAIResponse(response.content)
      const capacityPlans = (parsed.capacity_plans || []).map((plan: any) => ({
        ...plan,
        available_hours: this.safeNumber(plan?.available_hours),
        allocated_hours: this.safeNumber(plan?.allocated_hours),
        utilization_percentage: this.safeNumber(plan?.utilization_percentage)
      }))

      logger.info(`[EXTRACTION-CAPACITY] Extracted ${capacityPlans.length} capacity plan entries`)

      return capacityPlans
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
    options: { aiProvider?: string; aiModel?: string }
  ): Promise<PerformanceMeasurement[]> {
    try {
      logger.info('[EXTRACTION-PERFORMANCE-MEASUREMENTS] Starting extraction')

      const documentContext = this.buildDocumentContext(documents)

      const prompt = `Extract **actual performance measurements** for success criteria / KPIs.

SOURCE DOCUMENTS:
${documentContext}

JSON schema:
{
  "performance_measurements": [
    {
      "success_criterion_name": "Name of criterion being measured",
      "measurement_date": "YYYY-MM-DD",
      "actual_value": number or null,
      "target_value": number or null,
      "units": "Units (%, days, USD, etc.) or null",
      "variance": number or null,
      "variance_percentage": number or null,
      "trend": "improving|stable|declining|null",
      "status": "on_track|at_risk|off_track",
      "notes": "Markdown context or null",
      "source_document": "Document title"
    }
  ]
}

Guidelines:
- Convert values to numbers when possible (strip % or currency symbols).
- If only textual comparison exists (e.g., "ahead by 5%"), compute variance when possible.
- Use null where numbers aren't available.
- Return ONLY valid JSON.`

      const response = await aiService.generate({
        prompt,
        provider: options.aiProvider!,
        model: options.aiModel,
        temperature: 0.2,
        max_tokens: 2600
      })

      const parsed = this.parseAIResponse(response.content)
      const measurements = (parsed.performance_measurements || []).map((item: any) => ({
        ...item,
        actual_value: this.safeNumber(item?.actual_value),
        target_value: this.safeNumber(item?.target_value),
        variance: this.safeNumber(item?.variance),
        variance_percentage: this.safeNumber(item?.variance_percentage)
      }))

      logger.info(`[EXTRACTION-PERFORMANCE-MEASUREMENTS] Extracted ${measurements.length} measurements`)

      return measurements
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
    options: { aiProvider?: string; aiModel?: string }
  ): Promise<EarnedValueMetric[]> {
    try {
      logger.info('[EXTRACTION-EVM] Starting extraction')

      const documentContext = this.buildDocumentContext(documents)

      const prompt = `Identify **Earned Value Management (EVM)** metrics reported in the documentation.

SOURCE DOCUMENTS:
${documentContext}

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
      "source_document": "Document title"
    }
  ]
}

Rules:
- Convert currency strings to numeric values (strip $ or commas).
- Provide null when a metric isn't available rather than fabricating it.
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

      logger.info(`[EXTRACTION-EVM] Extracted ${evm.length} earned value metric snapshots`)

      return evm
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
    options: { aiProvider?: string; aiModel?: string }
  ): Promise<OpportunityRecord[]> {
    try {
      logger.info('[EXTRACTION-OPPORTUNITIES] Starting extraction')

      const documentContext = this.buildDocumentContext(documents)

      const prompt = `Extract **opportunities (positive risks)** mentioned in the documentation.

SOURCE DOCUMENTS:
${documentContext}

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
      "source_document": "Document title"
    }
  ]
}

Rules:
- Map qualitative terms to the enum values. For example "moderate" -> medium.
- If quantitative benefit (e.g., $200k) is mentioned, convert to number.
- Return ONLY valid JSON.`

      const response = await aiService.generate({
        prompt,
        provider: options.aiProvider!,
        model: options.aiModel,
        temperature: 0.25,
        max_tokens: 2400
      })

      const parsed = this.parseAIResponse(response.content)
      const opportunities = (parsed.opportunities || []).map((item: any) => ({
        ...item,
        expected_benefit: this.safeNumber(item?.expected_benefit)
      }))

      logger.info(`[EXTRACTION-OPPORTUNITIES] Extracted ${opportunities.length} opportunities`)

      return opportunities
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
    options: { aiProvider?: string; aiModel?: string }
  ): Promise<RiskResponseRecord[]> {
    try {
      logger.info('[EXTRACTION-RISK-RESPONSES] Starting extraction')

      const documentContext = this.buildDocumentContext(documents)

      const prompt = `Extract **risk response actions** described in the documentation.

SOURCE DOCUMENTS:
${documentContext}

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
      "source_document": "Document title"
    }
  ]
}

Guidelines:
- Include both preventative and corrective actions.
- Use null for numeric values that are not given.
- Map qualitative assessments (e.g., "moderate") to the nearest enum.
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

      logger.info(`[EXTRACTION-RISK-RESPONSES] Extracted ${responses.length} risk responses`)

      return responses
    } catch (error: unknown) {
      logger.error('[EXTRACTION-RISK-RESPONSES] Extraction failed', {
        error: error instanceof Error ? error.message : String(error)
      })
      return []
    }
  }

  /**
   * Deduplicate stakeholders by normalized name
   * Handles variations like "John Smith", "John Smith (PM)", "john smith"
   */
  private deduplicateStakeholders(stakeholders: Stakeholder[]): Stakeholder[] {
    const seen = new Map<string, Stakeholder>()
    
    stakeholders.forEach(stakeholder => {
      // Normalize name: lowercase, trim, remove parenthetical suffixes
      const normalized = stakeholder.name
        .toLowerCase()
        .trim()
        .replace(/\s*\([^)]*\)\s*$/, '') // Remove trailing (role) suffix
        .replace(/\s+/g, ' ') // Normalize whitespace
      
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
        
        logger.debug(`[DEDUP] Merged "${stakeholder.name}" into "${existing.name}"`)
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

  private safeNumber(value: unknown): number | undefined {
    if (value === null || value === undefined) {
      return undefined
    }
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : undefined
    }
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (!trimmed) return undefined

      const normalized = trimmed
        .replace(/percent/gi, '')
        .replace(/[%,$]/g, '')
        .replace(/[^0-9.+\-]/g, ' ')
        .trim()

      if (!normalized) return undefined

      const num = Number(normalized)
      return Number.isFinite(num) ? num : undefined
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
    const trimmed = value.toString().trim()
    if (!trimmed) {
      return null
    }

    const quarterDate = convertQuarterDate(trimmed)
    if (quarterDate) {
      return quarterDate
    }

    if (isValidDate(trimmed)) {
      return trimmed
    }

    // Attempt to parse simple Month YYYY formats (e.g., "March 2025")
    const parsed = Date.parse(trimmed)
    if (!Number.isNaN(parsed)) {
      return new Date(parsed).toISOString().split('T')[0]
    }

    logger.warn(`[EXTRACTION] Unable to normalize date "${trimmed}", storing as null`)
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
        map.set(row.name.toLowerCase().trim(), row.id)
      }
    })
    return map
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
   * Parse AI response (handles both JSON and markdown-wrapped JSON)
   */
  private parseAIResponse(content: string): any {
    try {
      // Try direct JSON parse
      return JSON.parse(content)
    } catch {
      // Try extracting JSON from markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1])
      }
      
      // Try finding JSON object without markdown
      const objectMatch = content.match(/\{[\s\S]*\}/)
      if (objectMatch) {
        return JSON.parse(objectMatch[0])
      }
      
      logger.warn('[EXTRACTION] Failed to parse AI response as JSON')
      return {}
    }
  }

  // Database save methods continue in next message...
  /**
   * Save stakeholders to database
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

    const values: any[] = []
    const placeholders: string[] = []

    stakeholders.forEach((s, index) => {
      const offset = index * 9
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9})`
      )
      
      // Truncate fields to match database constraints
      const name = s.name?.substring(0, 255) || 'Unnamed Stakeholder'
      const role = s.role?.substring(0, 100) || 'Stakeholder'
      const email = s.email?.substring(0, 255) || null
      
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
        s.interest_level,
        s.influence_level,
        s.expectations || null,
        s.concerns || null,
        userId
      )
    })

    await client.query(`
      INSERT INTO stakeholders (
        project_id, name, role, email, interest_level, influence_level, 
        expectations, concerns, created_by
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (project_id, name) DO UPDATE SET
        role = EXCLUDED.role,
        email = EXCLUDED.email,
        interest_level = EXCLUDED.interest_level,
        influence_level = EXCLUDED.influence_level,
        expectations = EXCLUDED.expectations,
        concerns = EXCLUDED.concerns,
        updated_at = CURRENT_TIMESTAMP
    `, values)

    logger.info(`[EXTRACTION] Saved ${stakeholders.length} stakeholders`)
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

    const values: any[] = []
    const placeholders: string[] = []

    requirements.forEach((r, index) => {
      const offset = index * 9
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9})`
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
      
      values.push(
        projectId,
        r.title,        // For title column
        r.title,        // For name column (NOT NULL requirement)
        r.description,
        mappedType,     // Use mapped type value
        mappedPriority, // Use mapped priority value
        mappedStatus,   // Use mapped status value
        acceptanceCriteria,
        userId
      )
    })

    await client.query(`
      INSERT INTO requirements (
        project_id, title, name, description, type, priority, status, 
        acceptance_criteria, created_by
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (project_id, name) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        type = EXCLUDED.type,
        priority = EXCLUDED.priority,
        status = EXCLUDED.status,
        acceptance_criteria = EXCLUDED.acceptance_criteria,
        updated_at = CURRENT_TIMESTAMP
    `, values)

    logger.info(`[EXTRACTION] Saved ${requirements.length} requirements`)
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
      const offset = index * 10
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10})`
      )
      
      // Map AI impact values to database CHECK constraint values
      // DB allows: high, medium, low
      // AI returns: critical, very_high, high, medium, low
      const impactMap: Record<string, string> = {
        'critical': 'high',
        'very_high': 'high',
        'high': 'high',
        'medium': 'medium',
        'low': 'low',
        'very_low': 'low'
      }
      const mappedImpact = impactMap[(r.impact || 'medium').toLowerCase()] || 'medium'
      
      values.push(
        projectId,
        r.title,        // For title column
        r.title,        // For name column (populate both with same value)
        r.description,
        r.category,
        r.probability,
        mappedImpact,   // Use mapped impact value
        r.mitigation_strategy || null,
        r.contingency_plan || null,
        userId
      )
    })

    await client.query(`
      INSERT INTO risks (
        project_id, title, name, description, category, probability, impact,
        mitigation_strategy, contingency_plan, created_by
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (project_id, name) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        probability = EXCLUDED.probability,
        impact = EXCLUDED.impact,
        mitigation_strategy = EXCLUDED.mitigation_strategy,
        contingency_plan = EXCLUDED.contingency_plan,
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

    const values: any[] = []
    const placeholders: string[] = []

    milestones.forEach((m, index) => {
      const offset = index * 6
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6})`
      )
      
      // Convert quarter dates like '2025-Q4' to actual dates using utility function
      const dueDate = convertQuarterDate(m.due_date)
      
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
      
      values.push(
        projectId,
        m.name,
        m.description,
        dueDate,
        mappedStatus,  // Use mapped status value
        userId
      )
    })

    await client.query(`
      INSERT INTO milestones (
        project_id, name, description, due_date, status, created_by
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (project_id, name) DO UPDATE SET
        description = EXCLUDED.description,
        due_date = EXCLUDED.due_date,
        status = EXCLUDED.status,
        updated_at = CURRENT_TIMESTAMP
    `, values)

    logger.info(`[EXTRACTION] Saved ${milestones.length} milestones`)
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
      const offset = index * 6  // Changed from 7 to 6 (removed severity)
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6})`
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
      
      values.push(
        projectId,
        c.title,        // For title column
        c.title,        // For name column (NOT NULL)
        c.description,
        mappedType,     // Use mapped type value
        userId
      )
    })

    await client.query(`
      INSERT INTO constraints (
        project_id, title, name, description, type, created_by
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (project_id, name) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
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
      const offset = index * 8
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8})`
      )
      
      // Extract numeric value from strings like "90% within 6 months" or "95"
      const extractNumeric = (value: string | number | null | undefined): number | null => {
        if (typeof value === 'number') return value
        if (!value) return null
        const numericMatch = String(value).match(/^(\d+(?:\.\d+)?)/)
        if (numericMatch) {
          return parseFloat(numericMatch[1])
        }
        logger.warn(`[EXTRACTION] Could not extract numeric from: ${value}, setting to null`)
        return null
      }
      
      const targetValue = extractNumeric(sc.target_value)
      
      values.push(
        projectId,
        sc.title,        // For title column
        sc.title,        // For name column (NOT NULL)
        sc.description,
        sc.metric,
        targetValue,     // Use extracted numeric value
        sc.measurement_method,
        userId
      )
    })

    await client.query(`
      INSERT INTO success_criteria (
        project_id, title, name, description, metric, target_value, measurement_method, created_by
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (project_id, name) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        metric = EXCLUDED.metric,
        target_value = EXCLUDED.target_value,
        measurement_method = EXCLUDED.measurement_method,
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
      const offset = index * 5
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`
      )
      values.push(
        projectId,
        bp.title,
        bp.description,
        bp.category,
        userId
      )
    })

    await client.query(`
      INSERT INTO best_practices (
        project_id, title, description, category, created_by
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (project_id, title) DO UPDATE SET
        description = EXCLUDED.description,
        category = EXCLUDED.category,
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

    const values: any[] = []
    const placeholders: string[] = []

    phases.forEach((p, index) => {
      const offset = index * 7
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7})`
      )
      
      // Validate and sanitize dates using utility functions
      let startDate = isValidDate(p.start_date) ? p.start_date : null
      let endDate = isValidDate(p.end_date) ? p.end_date : null
      
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
      
      values.push(
        projectId,
        p.name,
        p.description,
        startDate,
        endDate,
        p.status,
        userId
      )
    })

    await client.query(`
      INSERT INTO phases (
        project_id, name, description, start_date, end_date, status, created_by
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (project_id, name) DO UPDATE SET
        description = EXCLUDED.description,
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date,
        status = EXCLUDED.status,
        updated_at = CURRENT_TIMESTAMP
    `, values)

    logger.info(`[EXTRACTION] Saved ${phases.length} phases`)
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
      const offset = index * 14
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14})`
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
        // Align created_by as last column
        userId
      )
    })

    await client.query(`
      INSERT INTO resources (
        project_id, name, type, role, allocation, availability, skills,
        competency_level, certifications, training_needs, team_assignment,
        performance_rating, development_plan, created_by
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
      const offset = index * 9
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9})`
      )
      
      values.push(
        projectId,
        t.name,
        t.category || 'other',
        t.description || null,
        t.version || null,
        t.purpose || null,
        t.license || null,
        t.vendor || null,
        userId
      )
    })

    await client.query(`
      INSERT INTO technologies (
        project_id, name, category, description, version, purpose, license, vendor, created_by
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (project_id, name) DO UPDATE SET
        category = EXCLUDED.category,
        description = EXCLUDED.description,
        version = EXCLUDED.version,
        purpose = EXCLUDED.purpose,
        license = EXCLUDED.license,
        vendor = EXCLUDED.vendor,
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

    const values: any[] = []
    const placeholders: string[] = []

    qualityStandards.forEach((qs, index) => {
      const offset = index * 7  // Changed from 8 to 7 (removed standard_type and requirements)
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7})`
      )
      values.push(
        projectId,
        qs.title,        // For title column
        qs.title,        // For standard_name column (NOT NULL)
        qs.description,
        qs.category,
        qs.measurement_criteria || null,
        userId
      )
    })

    await client.query(`
      INSERT INTO quality_standards (
        project_id, title, standard_name, description, category, 
        measurement_criteria, created_by
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (project_id, standard_name) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        measurement_criteria = EXCLUDED.measurement_criteria,
        updated_at = CURRENT_TIMESTAMP
    `, values)

    logger.info(`[EXTRACTION] Saved ${qualityStandards.length} quality standards`)
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

    const values: any[] = []
    const placeholders: string[] = []

    deliverables.forEach((d, index) => {
      const offset = index * 8
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8})`
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
      
      // Validate and parse due_date
      let parsedDueDate = null
      if (d.due_date) {
        // Check if it's a valid date format
        if (isValidDate(d.due_date)) {
          parsedDueDate = d.due_date
        } else {
          // Try quarter date conversion (YYYY-Q1, etc.)
          const quarterDate = convertQuarterDate(d.due_date)
          if (quarterDate) {
            parsedDueDate = quarterDate
          } else {
            logger.warn(`[EXTRACTION] Deliverable "${d.name}" has invalid due_date: ${d.due_date}, setting to null`)
          }
        }
      }

      values.push(
        projectId,
        d.name,
        d.description,
        d.type,
        parsedDueDate,
        mappedStatus,  // Use mapped status value
        d.owner || null,
        userId
      )
    })

    await client.query(`
      INSERT INTO deliverables (
        project_id, name, description, type, due_date, status, 
        owner, created_by
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (project_id, name) DO UPDATE SET
        description = EXCLUDED.description,
        type = EXCLUDED.type,
        due_date = EXCLUDED.due_date,
        status = EXCLUDED.status,
        owner = EXCLUDED.owner,
        updated_at = CURRENT_TIMESTAMP
    `, values)

    logger.info(`[EXTRACTION] Saved ${deliverables.length} deliverables`)
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

    const values: any[] = []
    const placeholders: string[] = []

    scopeItems.forEach((si, index) => {
      const offset = index * 7  // Changed from 8 to 7 (removed priority)
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7})`
      )
      // Map is_in_scope boolean to inclusion_status text
      const inclusionStatus = si.is_in_scope ? 'in_scope' : 'out_of_scope'
      
      values.push(
        projectId,
        si.title,        // For title column
        si.title,        // For item_name column (NOT NULL)
        si.description,
        inclusionStatus, // Map to inclusion_status column
        si.category || null,
        userId
      )
    })

    await client.query(`
      INSERT INTO scope_items (
        project_id, title, item_name, description, inclusion_status, category, created_by
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (project_id, item_name) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        inclusion_status = EXCLUDED.inclusion_status,
        category = EXCLUDED.category,
        updated_at = CURRENT_TIMESTAMP
    `, values)

    logger.info(`[EXTRACTION] Saved ${scopeItems.length} scope items`)
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
      const offset = index * 10  // Changed from 11 to 10 (removed phase, duration, effort_estimate)
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10})`
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
        userId
      )
    })

    await client.query(`
      INSERT INTO activities (
        project_id, name, activity_name, description, category, start_date, 
        end_date, status, assigned_to, created_by
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

    teamAgreements.forEach((agreement, index) => {
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

      values.push(
        projectId,
        agreement.title?.substring(0, 200) || 'Team Agreement',
        agreement.description || null,
        category,
        this.ensureStringArray(agreement.agreed_by),
        agreement.facilitated_by ? agreement.facilitated_by.substring(0, 255) : null,
        this.normalizeDate(agreement.effective_date),
        reviewFrequency,
        this.normalizeDate(agreement.next_review_date),
        status,
        adherenceScore,
        violationsCount,
        this.normalizeDate(agreement.last_violation_date),
        null, // source_document_id not resolved yet
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
        notes = EXCLUDED.notes,
        updated_by = EXCLUDED.updated_by,
        updated_at = CURRENT_TIMESTAMP
    `,
      values
    )

    logger.info(`[EXTRACTION] Saved ${teamAgreements.length} team agreements`)
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
    await client.query(
      `
      INSERT INTO development_approach (
        project_id, approach, methodology, justification,
        uncertainty_level, requirements_stability, stakeholder_engagement_model, delivery_cadence,
        organizational_maturity, team_experience_level, regulatory_constraints,
        tailoring_decisions, life_cycle_phases, iteration_length, iteration_unit,
        governance_approach, review_gates,
        source_document_id, defined_by, approved_by, effective_date,
        created_by, updated_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
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
        updated_by = EXCLUDED.updated_by,
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
        null, // source_document_id - would need to resolve from source_document name
        userId, // defined_by
        null, // approved_by - not extracted, would be set manually
        null, // effective_date - not extracted, would be set manually
        userId, // created_by
        userId  // updated_by
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

    projectIterations.forEach((iteration, index) => {
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
        null, // source_document_id placeholder
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
        updated_by = EXCLUDED.updated_by,
        updated_at = CURRENT_TIMESTAMP
    `,
      values
    )

    logger.info(`[EXTRACTION] Saved ${projectIterations.length} project iterations`)
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

    workItems.forEach((item, index) => {
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
        null, // source_document_id placeholder
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
        updated_by = EXCLUDED.updated_by,
        updated_at = CURRENT_TIMESTAMP
    `,
      values
    )

    logger.info(`[EXTRACTION] Saved ${workItems.length} work items`)
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

    capacityPlans.forEach(plan => {
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
        null, // source_document_id placeholder
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
        updated_by = EXCLUDED.updated_by,
        updated_at = CURRENT_TIMESTAMP
    `,
      values
    )

    logger.info(`[EXTRACTION] Saved ${capacityPlans.length} capacity plan records`)
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

    performanceMeasurements.forEach(measurement => {
      const measurementDate = this.normalizeDate(measurement.measurement_date)
      const criterionName = measurement.success_criterion_name?.trim()

      if (!measurementDate || !criterionName) {
        logger.warn(
          `[EXTRACTION] Skipping measurement due to missing date or criterion (${measurement.measurement_date}, ${measurement.success_criterion_name})`
        )
        return
      }

      const rowIndex = placeholders.length
      const offset = rowIndex * 15
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14}, $${offset + 15})`
      )

      const normalizedCriterionKey = criterionName.toLowerCase()
      const criterionId = successCriteriaMap.get(normalizedCriterionKey) || null
      if (!criterionId) {
        logger.warn(`[EXTRACTION] No success criterion found for "${criterionName}", storing without linkage`)
      }

      const statusKey = (measurement.status || 'on_track').toLowerCase().replace(/\s+/g, '_')
      const status = statusMap[statusKey] || 'on_track'
      const trendKey = (measurement.trend || '').toLowerCase().trim()
      const trend = trendOptions.has(trendKey) ? trendKey : null

      const notesSegments = []
      if (measurement.notes) {
        notesSegments.push(measurement.notes)
      }
      if (measurement.source_document) {
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
        null, // source_document_id placeholder
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
        updated_by = EXCLUDED.updated_by,
        updated_at = CURRENT_TIMESTAMP
    `,
      values
    )

    logger.info(`[EXTRACTION] Saved ${performanceMeasurements.length} performance measurements`)
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

    const values: any[] = []
    const placeholders: string[] = []

    earnedValueMetrics.forEach(metric => {
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
        null, // source_document_id placeholder
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
        updated_by = EXCLUDED.updated_by,
        updated_at = CURRENT_TIMESTAMP
    `,
      values
    )

    logger.info(`[EXTRACTION] Saved ${earnedValueMetrics.length} earned value metric snapshots`)
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

    const values: any[] = []
    const placeholders: string[] = []

    opportunities.forEach((opportunity, index) => {
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
        null, // source_document_id placeholder
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
        updated_by = EXCLUDED.updated_by,
        updated_at = CURRENT_TIMESTAMP
    `,
      values
    )

    logger.info(`[EXTRACTION] Saved ${opportunities.length} opportunities`)
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

    const values: any[] = []
    const placeholders: string[] = []

    riskResponses.forEach((response, index) => {
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
        null, // source_document_id placeholder
        userId,
        userId
      )
    })

    await client.query(
      `
      INSERT INTO risk_responses (
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
        updated_by = EXCLUDED.updated_by,
        updated_at = CURRENT_TIMESTAMP
    `,
      values
    )

    logger.info(`[EXTRACTION] Saved ${riskResponses.length} risk responses`)
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
    
    let entities: any[]
    
    try {
      // Map entity type to extraction method - pass documents array and extractionOptions
      switch (entityType) {
      case 'stakeholders':
        entities = await this.extractStakeholders(documents, projectId, extractionOptions)
        break
      case 'requirements':
        entities = await this.extractRequirements(documents, projectId, extractionOptions)
        break
      case 'risks':
        entities = await this.extractRisks(documents, projectId, extractionOptions)
        break
      case 'milestones':
        entities = await this.extractMilestones(documents, projectId, extractionOptions)
        break
      case 'constraints':
        entities = await this.extractConstraints(documents, projectId, extractionOptions)
        break
      case 'success_criteria':
        entities = await this.extractSuccessCriteria(documents, projectId, extractionOptions)
        break
      case 'best_practices':
        entities = await this.extractBestPractices(documents, projectId, extractionOptions)
        break
      case 'phases':
        entities = await this.extractPhases(documents, projectId, extractionOptions)
        break
      case 'resources':
        entities = await this.extractResources(documents, projectId, extractionOptions)
        break
      case 'technologies':
        entities = await this.extractTechnologies(documents, projectId, extractionOptions)
        break
      case 'quality_standards':
        entities = await this.extractQualityStandards(documents, projectId, extractionOptions)
        break
      case 'deliverables':
        entities = await this.extractDeliverables(documents, projectId, extractionOptions)
        break
      case 'scope_items':
        entities = await this.extractScopeItems(documents, projectId, extractionOptions)
        break
      case 'activities':
        entities = await this.extractActivities(documents, projectId, extractionOptions)
        break
      case 'team_agreements':
        entities = await this.extractTeamAgreements(documents, projectId, extractionOptions)
        break
      case 'development_approaches':
        entities = await this.extractDevelopmentApproaches(documents, projectId, extractionOptions)
        break
      case 'project_iterations':
        entities = await this.extractProjectIterations(documents, projectId, extractionOptions)
        break
      case 'work_items':
        entities = await this.extractWorkItems(documents, projectId, extractionOptions)
        break
      case 'capacity_plans':
        entities = await this.extractCapacityPlans(documents, projectId, extractionOptions)
        break
      case 'performance_measurements':
        entities = await this.extractPerformanceMeasurements(documents, projectId, extractionOptions)
        break
      case 'earned_value_metrics':
        entities = await this.extractEarnedValueMetrics(documents, projectId, extractionOptions)
        break
      case 'opportunities':
        entities = await this.extractOpportunities(documents, projectId, extractionOptions)
        break
      case 'risk_responses':
        entities = await this.extractRiskResponses(documents, projectId, extractionOptions)
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

