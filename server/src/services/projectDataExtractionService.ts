; (async function () { try { await (require('../lib/db')).initDb() } catch (e) { } })();
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
import { analytics } from '@/utils/analytics'
import { domainSpecificExtractionService } from './domainSpecificExtractionService'
import { ExtractionContext } from './extraction/base/ExtractionContext'
import type { ExtractionDocument, ExtractionResult as ModuleExtractionResult } from './extraction/base/ExtractionResult'
import type { PersistenceResult } from './extraction/base/Persistence'
import { resolveSourceDocumentIdStrict as resolveSourceIdStrict } from './extraction/base/SourceDocumentResolver'
import { deduplicateEntities } from './extraction/base/Deduper'
import type { PoolClient } from 'pg'
import { normalizeBatchingConfig, planDocumentBatches } from './extraction/batchPlanner'
import type { ExtractionBatchingConfig, ExtractionBatchProgressMeta } from './jobs/types'

type ModuleExtractor = (
  context: ExtractionContext,
  options?: { temperature?: number; maxTokens?: number }
) => Promise<ModuleExtractionResult<unknown>>

type ModuleSaver = (
  client: PoolClient,
  projectId: string,
  userId: string,
  entities: unknown[]
) => Promise<PersistenceResult>

type ExtractionSourceDocument = {
  id: string
  title: string
  content: string
  template_name?: string
}

interface SingleEntityExtractionOptions extends ExtractionBatchingConfig {
  aiProvider?: string
  aiModel?: string
  documentIds?: string[]
  parentJobId?: string
  childJobId?: string
  entityIndex?: number
  totalEntities?: number
  correlationId?: string
  _skipBatchingInternal?: boolean
}

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
  infrastructure_data: any[]
  supply_chain_data: any[]
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
  source_document_id?: string
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
  private entityModuleCache = new Map<
    string,
    { normalizedType: string; extractor?: ModuleExtractor; saver?: ModuleSaver }
  >()
  private entityModuleCacheMax = 200

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
        logger.warn('[EXTRACTION] No active AI providers configured in database, using local fallback provider', {
          fallbackProvider: 'ollama'
        })
        return { provider: 'ollama', model: requestedModel }
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
      // Fallback to local provider if selection fails
      return { provider: 'ollama', model: requestedModel }
    }
  }

  /**
   * Build a map of document titles to IDs for easier resolution
   */
  private buildDocumentMap(documents: ExtractionSourceDocument[]): Map<string, string> {
    const map = new Map<string, string>()
    documents.forEach(doc => {
      if (doc.title && doc.id) {
        const title = doc.title.toLowerCase().trim()
        map.set(title, doc.id)
        // Also add sanitized version
        const sanitized = title.replace(/[^\w\s]/g, '')
        if (sanitized !== title) map.set(sanitized, doc.id)
      }
    })
    return map
  }

  /**
   * Build a bulleted list of document titles for the AI prompt
   */
  private buildDocumentList(documents: ExtractionSourceDocument[]): string {
    return documents.map((doc, idx) => `- Document ${idx + 1}: "${doc.title || 'Untitled'}"`).join('\n')
  }

  /**
   * Combine document contents into a contextual string for the prompt
   */
  private buildDocumentContext(documents: ExtractionSourceDocument[]): string {
    return documents.map((doc, idx) => {
      return `--- Document ${idx + 1}: ${doc.title || 'Untitled'} ---\n${doc.content || ''}\n`
    }).join('\n\n')
  }

  /**
   * Parse JSON from AI response, handling markdown blocks
   */
  private parseAIResponse(content: string): any {
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/)
      const jsonString = jsonMatch ? jsonMatch[1] : content
      return JSON.parse(jsonString.trim())
    } catch (error) {
      logger.error('[EXTRACTION] Failed to parse AI response as JSON', { error })
      return null
    }
  }

  /**
   * Strictly resolve source_document_id and validate it on the entity
   */
  private resolveSourceDocumentIdStrict(
    entity: any,
    documentMap: Map<string, string>,
    documents: any[],
    entityType: string,
    entityLabel: string
  ): boolean {
    // Create a temporary context for the resolver
    const context = new ExtractionContext('', '', documents, {})
    const result = resolveSourceIdStrict(entity, context, entityType, entityLabel)
    return result.resolved
  }

  /**
   * Remove duplicate stakeholders from a batch
   */
  private deduplicateStakeholdersBatch(stakeholders: Stakeholder[]): Stakeholder[] {
    return deduplicateEntities(stakeholders, (s) => `${s.name?.toLowerCase().trim()}|${s.role?.toLowerCase().trim()}`, 'stakeholders')
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

    const startTime = Date.now()
    try {
      logger.info('[EXTRACTION] Starting project entity extraction', {
        projectId,
        userId,
        provider: bestProvider,
        model: bestModel
      })

      // Step 1: Gather project documents
      const documents = await this.getProjectDocuments(projectId, options.documentIds)

      if (documents.length === 0) {
        throw new Error('No documents found for entity extraction')
      }

      // Track extraction start
      analytics.trackEntityExtractionStart(
        projectId,
        userId,
        documents.length,
        bestProvider,
        bestModel
      )

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
        performanceActuals,
        domainData
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
        this.extractPerformanceActuals(documents, projectId, extractionOptions, documentMap, documentList),
        this.extractDomainData(documents, projectId, extractionOptions, documentMap, documentList)
      ])

      const infrastructure_data = domainData.infrastructure_data || []
      const supply_chain_data = domainData.supply_chain_data || []

      const duration = Date.now() - startTime

      // Calculate entity counts for analytics
      const entityCounts = {
        stakeholders: stakeholders.length,
        requirements: requirements.length,
        risks: risks.length,
        milestones: milestones.length,
        constraints: constraints.length,
        success_criteria: successCriteria.length,
        best_practices: bestPractices.length,
        phases: phases.length,
        resources: resources.length,
        technologies: technologies.length,
        quality_standards: qualityStandards.length,
        deliverables: deliverables.length,
        scope_items: scopeItems.length,
        activities: activities.length,
        team_agreements: teamAgreements.length,
        development_approaches: developmentApproaches.length,
        project_iterations: projectIterations.length,
        work_items: workItems.length,
        capacity_plans: capacityPlans.length,
        performance_measurements: performanceMeasurements.length,
        earned_value_metrics: earnedValueMetrics.length,
        opportunities: opportunities.length,
        risk_responses: riskResponses.length,
        performance_actuals: performanceActuals.length
      }

      // Track extraction completion
      analytics.trackEntityExtractionComplete(
        projectId,
        userId,
        duration,
        entityCounts,
        bestProvider,
        bestModel
      )

      logger.info('[EXTRACTION] Entity extraction completed', {
        projectId,
        duration,
        totalEntities: Object.values(entityCounts).reduce((sum, count) => sum + count, 0),
        entityCounts
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
        performance_actuals: performanceActuals,
        infrastructure_data,
        supply_chain_data
      }
    } catch (error: unknown) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)

      logger.error('[EXTRACTION] Entity extraction failed', {
        projectId,
        error: errorMessage
      })

      // Track extraction failure
      analytics.trackEntityExtractionFailure(
        projectId,
        userId,
        errorMessage,
        bestProvider,
        bestModel,
        duration
      )

      throw error
    }
  }

  /**
   * Save extracted entities to database
   */
  async saveExtractedEntities(
    projectId: string,
    userId: string,
    entities: ExtractionResult,
    correlationId?: string
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
        await this.saveStakeholders(client, projectId, userId, entities.stakeholders, correlationId)
      }

      // Save requirements
      if (entities.requirements.length > 0) {
        await this.saveRequirements(client, projectId, userId, entities.requirements, correlationId)
      }

      // Save risks
      if (entities.risks.length > 0) {
        await this.saveRisks(client, projectId, userId, entities.risks, correlationId)
      }

      // Save milestones
      if (entities.milestones.length > 0) {
        await this.saveMilestones(client, projectId, userId, entities.milestones, correlationId)
      }

      // Save constraints
      if (entities.constraints.length > 0) {
        await this.saveConstraints(client, projectId, userId, entities.constraints, correlationId)
      }

      // Save success criteria
      if (entities.success_criteria.length > 0) {
        await this.saveSuccessCriteria(client, projectId, userId, entities.success_criteria, correlationId)
      }

      // Save best practices
      if (entities.best_practices.length > 0) {
        await this.saveBestPractices(client, projectId, userId, entities.best_practices, correlationId)
      }

      // Save phases
      if (entities.phases.length > 0) {
        await this.savePhases(client, projectId, userId, entities.phases, correlationId)
      }

      // Save resources
      if (entities.resources.length > 0) {
        await this.saveResources(client, projectId, userId, entities.resources, correlationId)
      }

      // Save technologies
      if (entities.technologies.length > 0) {
        await this.saveTechnologies(client, projectId, userId, entities.technologies, correlationId)
      }

      // Save quality standards
      if (entities.quality_standards.length > 0) {
        await this.saveQualityStandards(client, projectId, userId, entities.quality_standards, correlationId)
      }

      // Save deliverables
      if (entities.deliverables.length > 0) {
        await this.saveDeliverables(client, projectId, userId, entities.deliverables, correlationId)
      }

      // Save scope items
      if (entities.scope_items.length > 0) {
        await this.saveScopeItems(client, projectId, userId, entities.scope_items, correlationId)
      }

      // Save activities
      if (entities.activities.length > 0) {
        await this.saveActivities(client, projectId, userId, entities.activities, correlationId)
      }

      // Save team agreements
      if (entities.team_agreements.length > 0) {
        await this.saveTeamAgreements(client, projectId, userId, entities.team_agreements, correlationId)
      }

      // Save development approaches
      if (entities.development_approaches.length > 0) {
        await this.saveDevelopmentApproaches(client, projectId, userId, entities.development_approaches, correlationId)
      }

      // Save project iterations
      if (entities.project_iterations.length > 0) {
        await this.saveProjectIterations(client, projectId, userId, entities.project_iterations, correlationId)
      }

      // Save work items
      if (entities.work_items.length > 0) {
        await this.saveWorkItems(client, projectId, userId, entities.work_items, correlationId)
      }

      // Save capacity plans
      if (entities.capacity_plans.length > 0) {
        await this.saveCapacityPlans(client, projectId, userId, entities.capacity_plans, correlationId)
      }

      // Save performance measurements
      if (entities.performance_measurements.length > 0) {
        await this.savePerformanceMeasurements(client, projectId, userId, entities.performance_measurements, correlationId)
      }

      // Save earned value metrics
      if (entities.earned_value_metrics.length > 0) {
        await this.saveEarnedValueMetrics(client, projectId, userId, entities.earned_value_metrics, correlationId)
      }

      // Save opportunities
      if (entities.opportunities.length > 0) {
        await this.saveOpportunities(client, projectId, userId, entities.opportunities, correlationId)
      }

      // Save risk responses
      if (entities.risk_responses.length > 0) {
        await this.saveRiskResponses(client, projectId, userId, entities.risk_responses, correlationId)
      }

      // Save performance actuals
      if (entities.performance_actuals.length > 0) {
        await this.savePerformanceActuals(client, projectId, userId, entities.performance_actuals, correlationId)
      }

      // Save domain-specific entities (Phase 8)
      if (entities.infrastructure_data.length > 0) {
        await this.saveDomainEntities(client, projectId, userId, 'infrastructure', entities.infrastructure_data, correlationId)
      }
      if (entities.supply_chain_data.length > 0) {
        await this.saveDomainEntities(client, projectId, userId, 'supply_chain', entities.supply_chain_data, correlationId)
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
   * Universal bridge to the modular extraction registry for saving
   */
  private async bridgeSave(entityType: string, client: PoolClient, projectId: string, userId: string, entities: any[], correlationId?: string): Promise<PersistenceResult> {
    const { extractionRegistry } = await import('./extraction/ExtractionRegistry')
    const saver = extractionRegistry.getSaver(entityType)
    if (!saver) {
       logger.warn(`[EXTRACTION-BRIDGE] No saver found for ${entityType}`)
       return { saved: 0, skipped: 0, failed: entities.length, error: 'No saver found' }
    }
    return saver(client, projectId, userId, entities)
  }

  /**
   * Universal bridge to the modular extraction registry for extraction
   */
  private async bridgeExtract(entityType: string, documents: any[], projectId: string, options: any): Promise<any[]> {
    const { extractionRegistry } = await import('./extraction/ExtractionRegistry')
    const extractor = extractionRegistry.getExtractor(entityType)
    if (!extractor) {
        logger.warn(`[EXTRACTION-BRIDGE] No extractor found for ${entityType}`)
        return []
    }
    const context = new ExtractionContext(projectId, 'system', documents as any, options)
    const result = await extractor(context, options)
    return result.entities
  }

  // Bridged Save Methods
  public async saveStakeholders(client: PoolClient, projectId: string, userId: string, entities: any[], correlationId?: string) { return this.bridgeSave('stakeholders', client, projectId, userId, entities, correlationId) }
  public async saveRequirements(client: PoolClient, projectId: string, userId: string, entities: any[], correlationId?: string) { return this.bridgeSave('requirements', client, projectId, userId, entities, correlationId) }
  public async saveRisks(client: PoolClient, projectId: string, userId: string, entities: any[], correlationId?: string) { return this.bridgeSave('risks', client, projectId, userId, entities, correlationId) }
  public async saveMilestones(client: PoolClient, projectId: string, userId: string, entities: any[], correlationId?: string) { return this.bridgeSave('milestones', client, projectId, userId, entities, correlationId) }
  public async saveConstraints(client: PoolClient, projectId: string, userId: string, entities: any[], correlationId?: string) { return this.bridgeSave('constraints', client, projectId, userId, entities, correlationId) }
  public async saveSuccessCriteria(client: PoolClient, projectId: string, userId: string, entities: any[], correlationId?: string) { return this.bridgeSave('success_criteria', client, projectId, userId, entities, correlationId) }
  public async saveBestPractices(client: PoolClient, projectId: string, userId: string, entities: any[], correlationId?: string) { return this.bridgeSave('best_practices', client, projectId, userId, entities, correlationId) }
  public async savePhases(client: PoolClient, projectId: string, userId: string, entities: any[], correlationId?: string) { return this.bridgeSave('phases', client, projectId, userId, entities, correlationId) }
  public async saveResources(client: PoolClient, projectId: string, userId: string, entities: any[], correlationId?: string) { return this.bridgeSave('resources', client, projectId, userId, entities, correlationId) }
  public async saveTechnologies(client: PoolClient, projectId: string, userId: string, entities: any[], correlationId?: string) { return this.bridgeSave('technologies', client, projectId, userId, entities, correlationId) }
  public async saveQualityStandards(client: PoolClient, projectId: string, userId: string, entities: any[], correlationId?: string) { return this.bridgeSave('quality_standards', client, projectId, userId, entities, correlationId) }
  public async saveDeliverables(client: PoolClient, projectId: string, userId: string, entities: any[], correlationId?: string) { return this.bridgeSave('deliverables', client, projectId, userId, entities, correlationId) }
  public async saveScopeItems(client: PoolClient, projectId: string, userId: string, entities: any[], correlationId?: string) { return this.bridgeSave('scope_items', client, projectId, userId, entities, correlationId) }
  public async saveActivities(client: PoolClient, projectId: string, userId: string, entities: any[], correlationId?: string) { return this.bridgeSave('activities', client, projectId, userId, entities, correlationId) }
  public async saveTeamAgreements(client: PoolClient, projectId: string, userId: string, entities: any[], correlationId?: string) { return this.bridgeSave('team_agreements', client, projectId, userId, entities, correlationId) }
  public async saveDevelopmentApproaches(client: PoolClient, projectId: string, userId: string, entities: any[], correlationId?: string) { return this.bridgeSave('development_approaches', client, projectId, userId, entities, correlationId) }
  public async saveProjectIterations(client: PoolClient, projectId: string, userId: string, entities: any[], correlationId?: string) { return this.bridgeSave('project_iterations', client, projectId, userId, entities, correlationId) }
  public async saveWorkItems(client: PoolClient, projectId: string, userId: string, entities: any[], correlationId?: string) { return this.bridgeSave('work_items', client, projectId, userId, entities, correlationId) }
  public async saveCapacityPlans(client: PoolClient, projectId: string, userId: string, entities: any[], correlationId?: string) { return this.bridgeSave('capacity_plans', client, projectId, userId, entities, correlationId) }
  public async savePerformanceMeasurements(client: PoolClient, projectId: string, userId: string, entities: any[], correlationId?: string) { return this.bridgeSave('performance_measurements', client, projectId, userId, entities, correlationId) }
  public async saveEarnedValueMetrics(client: PoolClient, projectId: string, userId: string, entities: any[], correlationId?: string) { return this.bridgeSave('earned_value_metrics', client, projectId, userId, entities, correlationId) }
  public async saveOpportunities(client: PoolClient, projectId: string, userId: string, entities: any[], correlationId?: string) { return this.bridgeSave('opportunities', client, projectId, userId, entities, correlationId) }
  public async saveRiskResponses(client: PoolClient, projectId: string, userId: string, entities: any[], correlationId?: string) { return this.bridgeSave('risk_responses', client, projectId, userId, entities, correlationId) }
  public async savePerformanceActuals(client: PoolClient, projectId: string, userId: string, entities: any[], correlationId?: string) { return this.bridgeSave('performance_actuals', client, projectId, userId, entities, correlationId) }

  public async saveDomainEntities(client: PoolClient, projectId: string, userId: string, domain: string, entities: any[], correlationId?: string): Promise<PersistenceResult> {
    const entityType = domain === 'infrastructure' ? 'dt_assets' : 'supply_chain_data'
    return this.bridgeSave(entityType, client, projectId, userId, entities, correlationId)
  }

  // Bridged Extract Methods
  public async extractQualityStandards(documents: any[], projectId: string, options: any, documentMap: Map<string, string>, documentList: string) { return this.bridgeExtract('quality_standards', documents, projectId, options) }
  public async extractDeliverables(documents: any[], projectId: string, options: any, documentMap: Map<string, string>, documentList: string) { return this.bridgeExtract('deliverables', documents, projectId, options) }
  public async extractScopeItems(documents: any[], projectId: string, options: any, documentMap: Map<string, string>, documentList: string) { return this.bridgeExtract('scope_items', documents, projectId, options) }
  public async extractActivities(documents: any[], projectId: string, options: any, documentMap: Map<string, string>, documentList: string) { return this.bridgeExtract('activities', documents, projectId, options) }
  public async extractTeamAgreements(documents: any[], projectId: string, options: any, documentMap: Map<string, string>, documentList: string) { return this.bridgeExtract('team_agreements', documents, projectId, options) }
  public async extractDevelopmentApproaches(documents: any[], projectId: string, options: any, documentMap: Map<string, string>, documentList: string) { return this.bridgeExtract('development_approaches', documents, projectId, options) }
  public async extractProjectIterations(documents: any[], projectId: string, options: any, documentMap: Map<string, string>, documentList: string) { return this.bridgeExtract('project_iterations', documents, projectId, options) }
  public async extractWorkItems(documents: any[], projectId: string, options: any, documentMap: Map<string, string>, documentList: string) { return this.bridgeExtract('work_items', documents, projectId, options) }
  public async extractCapacityPlans(documents: any[], projectId: string, options: any, documentMap: Map<string, string>, documentList: string) { return this.bridgeExtract('capacity_plans', documents, projectId, options) }
  public async extractPerformanceMeasurements(documents: any[], projectId: string, options: any, documentMap: Map<string, string>, documentList: string) { return this.bridgeExtract('performance_measurements', documents, projectId, options) }
  public async extractEarnedValueMetrics(documents: any[], projectId: string, options: any, documentMap: Map<string, string>, documentList: string) { return this.bridgeExtract('earned_value_metrics', documents, projectId, options) }
  public async extractOpportunities(documents: any[], projectId: string, options: any, documentMap: Map<string, string>, documentList: string) { return this.bridgeExtract('opportunities', documents, projectId, options) }
  public async extractRiskResponses(documents: any[], projectId: string, options: any, documentMap: Map<string, string>, documentList: string) { return this.bridgeExtract('risk_responses', documents, projectId, options) }
  public async extractPerformanceActuals(documents: any[], projectId: string, options: any, documentMap: Map<string, string>, documentList: string) { return this.bridgeExtract('performance_actuals', documents, projectId, options) }
  public async extractDomainData(documents: any[], projectId: string, options: any, documentMap: Map<string, string>, documentList: string) {
    return domainSpecificExtractionService.extractDomainDataWithLocations(documents, projectId, options)
  }

  /**
   * Get project documents for extraction
   */
  private async getProjectDocuments(
    projectId: string,
    documentIds?: string[]
  ): Promise<ExtractionSourceDocument[]> {
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
    const startTime = Date.now()

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
        max_tokens: 8000 // Increased for large context windows
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

      const duration = Date.now() - startTime

      // Track successful entity type extraction
      analytics.trackEntityTypeExtraction(
        projectId,
        'system', // userId not available in private method
        'stakeholders',
        validStakeholders.length,
        duration,
        true
      )

      return validStakeholders
    } catch (error: unknown) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)

      logger.error('[EXTRACTION-STAKEHOLDERS] Extraction failed', {
        error: errorMessage,
      })

      // Track failed entity type extraction
      analytics.trackEntityTypeExtraction(
        projectId,
        'system', // userId not available in private method
        'stakeholders',
        0,
        duration,
        false,
        errorMessage
      )

      logger.error('[EXTRACTION-STAKEHOLDERS] Extraction failed', {
        error: errorMessage,
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
        max_tokens: 8000 // Increased for large context windows
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

      const response = await aiService.generateWithFallback({
        prompt,
        provider: options.aiProvider!,
        model: options.aiModel,
        temperature: 0.3,
        max_tokens: 8000 // Increased for large context windows
      }, ['openai', 'google', 'anthropic', 'mistral', 'groq'])

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
        max_tokens: 8000 // Increased for large context windows
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

      const response = await aiService.generateWithFallback({
        prompt,
        provider: options.aiProvider!,
        model: options.aiModel,
        temperature: 0.3,
        max_tokens: 8000 // Increased for large context windows
      }, ['openai', 'google', 'anthropic', 'mistral', 'groq'])

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

      const response = await aiService.generateWithFallback({
        prompt,
        provider: options.aiProvider!,
        model: options.aiModel,
        temperature: 0.3,
        max_tokens: 8000 // Increased for large context windows
      }, ['openai', 'google', 'anthropic', 'mistral', 'groq'])

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

Extract technologies in JSON format with the following structure:
{
  "technologies": [
    {
      "name": "Technology Name",
      "category": "frontend|backend|database|infrastructure|devops|testing|monitoring|other",
      "description": "Short description",
      "version": "Version if mentioned",
      "purpose": "What it is used for",
      "license": "License if mentioned",
      "vendor": "Vendor if mentioned",
      "deployment_environment": "Cloud, On-prem, etc."
    }
  ]
}

Requirements:
- Extract all technologies mentioned in the architecture or technology stack
- Use the predefined categories as much as possible
- If a value is not provided, use null or omit optional fields
- Return ONLY valid JSON, no markdown or explanation`

      const response = await aiService.generateWithFallback({
        prompt,
        provider: options.aiProvider || 'openai',
        model: options.aiModel,
        temperature: 0.3,
        max_tokens: 4000
      }, ['openai', 'google', 'anthropic', 'mistral', 'groq'])

      const parsed = this.parseAIResponse(response.content)
      const technologies = parsed.technologies || []

      return technologies
    } catch (error: unknown) {
      logger.error('[EXTRACTION-TECHNOLOGIES] Extraction failed', {
        error: error instanceof Error ? error.message : String(error)
      })
      return []
    }
  }
}
