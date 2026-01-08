/**
 * Project Charter Agent Service
 * 
 * AI-powered agent that guides users through developing a comprehensive Project Charter
 * by extracting and organizing stakeholders, success criteria, constraints, and best practices.
 * 
 * AI Techniques Used:
 * - NLP Summarization: Extracts key information from project documents
 * - Stakeholder Analysis: Power/Interest matrix classification
 * - Constraint Classification: Categorizes and prioritizes constraints
 * - Standards Rule-Check: Validates against PMBOK, PRINCE2, ISO standards
 * - Template Assembly: Generates structured output documents
 * 
 * Generated Outputs:
 * - Project Charter
 * - Assumptions Log
 * - Initial Stakeholder Register
 */

import { v4 as uuidv4 } from 'uuid'
import { pool } from '../../database/connection'
import { logger } from '../../utils/logger'
import { aiService } from '../../services/aiService'
import { extractionRegistry } from '../../services/extraction/ExtractionRegistry'
import { ExtractionContext } from '../../services/extraction/base/ExtractionContext'
import { documentGeneratorService } from '../documentGenerator/service'
import type {
  ProjectCharterData,
  CharterWorkflowState,
  CharterWorkflowStep,
  CharterStakeholder,
  CharterSuccessCriterion,
  CharterConstraint,
  CharterAssumption,
  CharterBestPractice,
  CharterRisk,
  CharterMilestone,
  ValidationIssue,
  AISuggestion,
  InitiateCharterRequest,
  InitiateCharterResponse,
  ExtractEntitiesRequest,
  ExtractEntitiesResponse,
  GenerateCharterRequest,
  GenerateCharterResponse,
  GeneratedDocument,
  StakeholderAnalysis,
  ConstraintClassification,
  StandardsRuleCheck,
  PowerInterestMatrix,
  ProjectCharterConfig
} from './types'
import { DEFAULT_CHARTER_CONFIG } from './types'

export class ProjectCharterAgentService {
  private config: ProjectCharterConfig
  private workflowStates: Map<string, CharterWorkflowState> = new Map()

  constructor(config?: Partial<ProjectCharterConfig>) {
    this.config = { ...DEFAULT_CHARTER_CONFIG, ...config }
    logger.info('[PROJECT-CHARTER-AGENT] Service initialized', {
      provider: this.config.default_ai_provider,
      model: this.config.default_ai_model
    })
  }

  // ============================================================================
  // Workflow Management
  // ============================================================================

  /**
   * Initialize a new Project Charter development workflow
   */
  async initiateCharter(
    request: InitiateCharterRequest,
    userId: string
  ): Promise<InitiateCharterResponse> {
    const workflowId = uuidv4()
    const startTime = Date.now()

    try {
      logger.info('[PROJECT-CHARTER-AGENT] Initiating charter workflow', {
        workflowId,
        projectId: request.project_id,
        userId
      })

      // Verify project exists
      const project = await this.getProject(request.project_id)
      if (!project) {
        throw new Error(`Project not found: ${request.project_id}`)
      }

      // Get source documents
      const documents = await this.getProjectDocuments(
        request.project_id,
        request.source_documents
      )

      logger.info('[PROJECT-CHARTER-AGENT] Found documents for analysis', {
        count: documents.length,
        documents: documents.map(d => d.title)
      })

      // Define workflow steps
      const steps: CharterWorkflowStep[] = [
        {
          id: uuidv4(),
          name: 'Document Analysis',
          description: 'Analyze project documents using NLP to extract key information',
          status: 'pending',
          order: 1,
          ai_technique: 'NLP Summarization'
        },
        {
          id: uuidv4(),
          name: 'Stakeholder Extraction',
          description: 'Extract and classify stakeholders using power/interest analysis',
          status: 'pending',
          order: 2,
          ai_technique: 'Stakeholder Analysis',
          entities_created: ['stakeholders']
        },
        {
          id: uuidv4(),
          name: 'Success Criteria Definition',
          description: 'Extract and validate measurable success criteria',
          status: 'pending',
          order: 3,
          ai_technique: 'NLP Summarization',
          entities_created: ['success_criteria']
        },
        {
          id: uuidv4(),
          name: 'Constraint Classification',
          description: 'Identify and classify project constraints by type and severity',
          status: 'pending',
          order: 4,
          ai_technique: 'Constraint Classification',
          entities_created: ['constraints']
        },
        {
          id: uuidv4(),
          name: 'Assumption Logging',
          description: 'Extract assumptions and assess risk if false',
          status: 'pending',
          order: 5,
          ai_technique: 'NLP Summarization',
          entities_created: ['assumptions']
        },
        {
          id: uuidv4(),
          name: 'Best Practices Integration',
          description: 'Match project context to relevant best practices and standards',
          status: 'pending',
          order: 6,
          ai_technique: 'Standards Rule-Check',
          entities_created: ['best_practices']
        },
        {
          id: uuidv4(),
          name: 'Risk Identification',
          description: 'Extract initial project risks from documents',
          status: 'pending',
          order: 7,
          ai_technique: 'NLP Summarization',
          entities_created: ['risks']
        },
        {
          id: uuidv4(),
          name: 'Validation & Completeness Check',
          description: 'Validate charter completeness and flag missing elements',
          status: 'pending',
          order: 8,
          ai_technique: 'Standards Rule-Check'
        },
        {
          id: uuidv4(),
          name: 'Document Generation',
          description: 'Assemble Project Charter and supporting documents',
          status: 'pending',
          order: 9,
          ai_technique: 'Template Assembly'
        }
      ]

      // Initialize workflow state
      const workflowState: CharterWorkflowState = {
        id: workflowId,
        project_id: request.project_id,
        current_step: 0,
        steps,
        charter_data: {
          project_name: project.name,
          project_description: project.description || '',
          project_purpose: '',
          stakeholders: [],
          success_criteria: [],
          constraints: [],
          assumptions: [],
          best_practices: [],
          risks: [],
          milestones: [],
          objectives: [],
          in_scope: [],
          out_of_scope: [],
          start_date: project.start_date,
          end_date: project.end_date,
          budget_estimate: project.budget,
          currency: project.currency || 'EUR'
        },
        validation_issues: [],
        suggestions: [],
        created_at: new Date(),
        updated_at: new Date(),
        status: 'initializing'
      }

      // Store workflow state
      this.workflowStates.set(workflowId, workflowState)

      // Also persist to database
      await this.saveWorkflowState(workflowState, userId)

      logger.info('[PROJECT-CHARTER-AGENT] Charter workflow initialized', {
        workflowId,
        projectId: request.project_id,
        stepCount: steps.length,
        durationMs: Date.now() - startTime
      })

      return {
        workflow_id: workflowId,
        status: 'initialized',
        message: `Project Charter workflow initiated for "${project.name}". Ready to begin extraction.`,
        steps
      }
    } catch (error) {
      logger.error('[PROJECT-CHARTER-AGENT] Failed to initiate charter', {
        projectId: request.project_id,
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  /**
   * Execute entity extraction for the charter
   */
  async extractEntities(
    request: ExtractEntitiesRequest,
    userId: string
  ): Promise<ExtractEntitiesResponse> {
    const startTime = Date.now()

    try {
      const workflowState = this.workflowStates.get(request.workflow_id)
      if (!workflowState) {
        throw new Error(`Workflow not found: ${request.workflow_id}`)
      }

      workflowState.status = 'extracting'
      workflowState.updated_at = new Date()

      const results: ExtractEntitiesResponse['extracted'] = []
      const allValidationIssues: ValidationIssue[] = []
      const allSuggestions: AISuggestion[] = []

      // Get project documents for context
      const documents = await this.getProjectDocuments(workflowState.project_id)
      
      // Create extraction context
      const context = new ExtractionContext(
        workflowState.project_id,
        userId,
        documents,
        {
          temperature: request.options?.temperature ?? this.config.extraction_temperature,
          maxTokens: request.options?.max_tokens ?? this.config.max_extraction_tokens
        }
      )

      // Extract each requested entity type
      for (const entityType of request.entity_types) {
        const stepIndex = workflowState.steps.findIndex(s => 
          s.entities_created?.includes(entityType)
        )
        
        if (stepIndex >= 0) {
          workflowState.steps[stepIndex].status = 'in_progress'
          workflowState.steps[stepIndex].started_at = new Date()
        }

        try {
          const extracted = await this.extractEntityType(
            context,
            entityType,
            workflowState,
            request.options
          )

          results.push({
            entity_type: entityType,
            count: extracted.entities.length,
            entities: extracted.entities,
            rejected_count: extracted.rejectedCount
          })

          // Update workflow state with extracted entities
          this.updateCharterDataWithEntities(
            workflowState.charter_data,
            entityType,
            extracted.entities
          )

          if (stepIndex >= 0) {
            workflowState.steps[stepIndex].status = 'completed'
            workflowState.steps[stepIndex].completed_at = new Date()
          }

          // Generate suggestions based on extracted data
          const suggestions = await this.generateSuggestions(
            entityType,
            extracted.entities,
            workflowState.charter_data
          )
          allSuggestions.push(...suggestions)

        } catch (error) {
          logger.error(`[PROJECT-CHARTER-AGENT] Failed to extract ${entityType}`, {
            workflowId: request.workflow_id,
            error: error instanceof Error ? error.message : String(error)
          })

          if (stepIndex >= 0) {
            workflowState.steps[stepIndex].status = 'failed'
            workflowState.steps[stepIndex].error = error instanceof Error ? error.message : String(error)
          }

          results.push({
            entity_type: entityType,
            count: 0,
            entities: [],
            rejected_count: 0
          })
        }
      }

      // Validate extracted data
      const validationIssues = await this.validateCharterData(workflowState.charter_data)
      allValidationIssues.push(...validationIssues)

      workflowState.validation_issues = allValidationIssues
      workflowState.suggestions = [...workflowState.suggestions, ...allSuggestions]
      workflowState.updated_at = new Date()

      // Save workflow state
      await this.saveWorkflowState(workflowState, userId)

      logger.info('[PROJECT-CHARTER-AGENT] Entity extraction completed', {
        workflowId: request.workflow_id,
        entityTypes: request.entity_types,
        totalExtracted: results.reduce((sum, r) => sum + r.count, 0),
        validationIssues: allValidationIssues.length,
        suggestions: allSuggestions.length,
        durationMs: Date.now() - startTime
      })

      return {
        workflow_id: request.workflow_id,
        extracted: results,
        validation_issues: allValidationIssues,
        suggestions: allSuggestions
      }
    } catch (error) {
      logger.error('[PROJECT-CHARTER-AGENT] Entity extraction failed', {
        workflowId: request.workflow_id,
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  /**
   * Extract a specific entity type using AI
   */
  private async extractEntityType(
    context: ExtractionContext,
    entityType: string,
    workflowState: CharterWorkflowState,
    options?: ExtractEntitiesRequest['options']
  ): Promise<{ entities: any[]; rejectedCount: number }> {
    
    // Map charter entity types to extraction registry types
    const registryTypeMap: Record<string, string> = {
      'stakeholders': 'stakeholders',
      'success_criteria': 'success_criteria',
      'constraints': 'constraints',
      'assumptions': 'assumptions',
      'best_practices': 'best_practices',
      'risks': 'risks',
      'milestones': 'milestones'
    }

    const registryType = registryTypeMap[entityType]
    
    // Check if we have a registered extractor
    if (extractionRegistry.hasEntity(registryType)) {
      const extractor = extractionRegistry.getExtractor(registryType)
      if (extractor) {
        const result = await extractor(context, {
          temperature: options?.temperature,
          maxTokens: options?.max_tokens
        })
        return {
          entities: result.entities,
          rejectedCount: result.rejectedCount
        }
      }
    }

    // Fallback: Use custom extraction for entity types not in registry
    return this.customExtraction(context, entityType, options)
  }

  /**
   * Custom AI extraction for entity types not in the registry
   */
  private async customExtraction(
    context: ExtractionContext,
    entityType: string,
    options?: ExtractEntitiesRequest['options']
  ): Promise<{ entities: any[]; rejectedCount: number }> {
    
    const prompts: Record<string, { json: string; requirements: string[] }> = {
      'assumptions': {
        json: `{
  "assumptions": [
    {
      "assumption": "The assumption statement",
      "description": "Detailed description",
      "category": "technical|business|resource|schedule|budget|external|organizational",
      "risk_if_false": "high|medium|low",
      "validation_approach": "How to validate this assumption",
      "owner": "Person responsible for validation",
      "source_document": "Document title from the list above"
    }
  ]
}`,
        requirements: [
          'Extract ALL assumptions mentioned or implied in the documents',
          'Assumptions are things taken for granted without proof',
          'Categorize each assumption appropriately',
          'Assess the risk level if the assumption proves false',
          'Suggest a validation approach for each assumption'
        ]
      }
    }

    const config = prompts[entityType]
    if (!config) {
      logger.warn(`[PROJECT-CHARTER-AGENT] No custom extraction config for: ${entityType}`)
      return { entities: [], rejectedCount: 0 }
    }

    const documentContext = context.documents.map(d => 
      `### ${d.title}\n${d.content?.substring(0, 5000) || ''}`
    ).join('\n\n')

    const prompt = `You are a project management expert extracting ${entityType} from project documents.

## AVAILABLE DOCUMENTS:
${context.documents.map(d => `- "${d.title}"`).join('\n')}

## DOCUMENT CONTENT:
${documentContext}

## EXTRACTION REQUIREMENTS:
${config.requirements.map(r => `- ${r}`).join('\n')}

## OUTPUT FORMAT:
Return ONLY valid JSON in this format:
${config.json}

IMPORTANT:
- The "source_document" field MUST exactly match one of the document titles from AVAILABLE DOCUMENTS
- Extract ALL relevant ${entityType} from ALL documents
- Be thorough but avoid duplicates`

    try {
      const response = await aiService.generateWithFallback({
        prompt,
        provider: context.provider,
        model: context.model,
        temperature: options?.temperature ?? 0.3,
        max_tokens: options?.max_tokens ?? 8000
      }, ['openai', 'google', 'anthropic'])

      // Parse response
      const jsonMatch = response.content.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        logger.warn(`[PROJECT-CHARTER-AGENT] No JSON found in response for ${entityType}`)
        return { entities: [], rejectedCount: 0 }
      }

      const parsed = JSON.parse(jsonMatch[0])
      const entities = parsed[entityType] || []

      // Resolve source documents
      const validEntities = entities.filter((entity: any) => {
        if (!entity.source_document) return false
        const doc = context.documents.find(d => 
          d.title.toLowerCase() === entity.source_document.toLowerCase()
        )
        if (doc) {
          entity.source_document_id = doc.id
          return true
        }
        return false
      })

      return {
        entities: validEntities,
        rejectedCount: entities.length - validEntities.length
      }
    } catch (error) {
      logger.error(`[PROJECT-CHARTER-AGENT] Custom extraction failed for ${entityType}`, {
        error: error instanceof Error ? error.message : String(error)
      })
      return { entities: [], rejectedCount: 0 }
    }
  }

  // ============================================================================
  // Stakeholder Analysis
  // ============================================================================

  /**
   * Perform stakeholder analysis with power/interest matrix
   */
  async analyzeStakeholders(
    workflowId: string,
    userId: string
  ): Promise<StakeholderAnalysis> {
    const workflowState = this.workflowStates.get(workflowId)
    if (!workflowState) {
      throw new Error(`Workflow not found: ${workflowId}`)
    }

    const stakeholders = workflowState.charter_data.stakeholders || []

    // Build power/interest matrix
    const matrix: PowerInterestMatrix = {
      manage_closely: [],
      keep_satisfied: [],
      keep_informed: [],
      monitor: []
    }

    stakeholders.forEach(s => {
      const highPower = s.influence_level === 'high'
      const highInterest = s.interest_level === 'high'

      if (highPower && highInterest) {
        matrix.manage_closely.push(s)
      } else if (highPower && !highInterest) {
        matrix.keep_satisfied.push(s)
      } else if (!highPower && highInterest) {
        matrix.keep_informed.push(s)
      } else {
        matrix.monitor.push(s)
      }
    })

    // Generate engagement recommendations using AI
    const recommendations = await this.generateStakeholderRecommendations(stakeholders)

    // Identify missing roles
    const missingRoles = await this.identifyMissingStakeholderRoles(stakeholders)

    const analysis: StakeholderAnalysis = {
      total_count: stakeholders.length,
      by_category: this.groupBy(stakeholders, 'category'),
      by_interest: this.groupBy(stakeholders, 'interest_level'),
      by_influence: this.groupBy(stakeholders, 'influence_level'),
      power_interest_matrix: matrix,
      engagement_recommendations: recommendations,
      missing_roles: missingRoles
    }

    logger.info('[PROJECT-CHARTER-AGENT] Stakeholder analysis completed', {
      workflowId,
      totalStakeholders: analysis.total_count,
      manageClosely: matrix.manage_closely.length,
      missingRoles: missingRoles.length
    })

    return analysis
  }

  private async generateStakeholderRecommendations(
    stakeholders: CharterStakeholder[]
  ): Promise<string[]> {
    if (stakeholders.length === 0) {
      return ['No stakeholders identified. Consider reviewing project documents for key participants.']
    }

    const prompt = `Based on the following stakeholders, provide 3-5 specific engagement recommendations:

${JSON.stringify(stakeholders.slice(0, 20), null, 2)}

Focus on:
- Communication frequency and methods
- Key engagement activities
- Risk mitigation for key stakeholders
- Building coalition support

Return a JSON array of recommendation strings.`

    try {
      const response = await aiService.generateWithFallback({
        prompt,
        provider: this.config.default_ai_provider,
        model: this.config.default_ai_model,
        temperature: 0.5,
        max_tokens: 1000
      }, ['openai', 'google', 'anthropic'])

      const jsonMatch = response.content.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    } catch (error) {
      logger.warn('[PROJECT-CHARTER-AGENT] Failed to generate stakeholder recommendations')
    }

    return [
      'Schedule regular communication with high-power stakeholders',
      'Create a stakeholder communication matrix',
      'Identify potential coalition partners among stakeholders'
    ]
  }

  private async identifyMissingStakeholderRoles(
    stakeholders: CharterStakeholder[]
  ): Promise<string[]> {
    const existingRoles = new Set(stakeholders.map(s => s.role?.toLowerCase()))
    
    const criticalRoles = [
      'Project Sponsor',
      'Project Manager',
      'Business Analyst',
      'Technical Lead',
      'Quality Assurance',
      'Change Manager',
      'End User Representative',
      'Finance Representative'
    ]

    return criticalRoles.filter(role => 
      !existingRoles.has(role.toLowerCase()) &&
      !Array.from(existingRoles).some(r => r?.includes(role.toLowerCase().split(' ')[0]))
    )
  }

  // ============================================================================
  // Constraint Classification
  // ============================================================================

  /**
   * Classify and analyze constraints
   */
  async classifyConstraints(
    workflowId: string,
    userId: string
  ): Promise<ConstraintClassification> {
    const workflowState = this.workflowStates.get(workflowId)
    if (!workflowState) {
      throw new Error(`Workflow not found: ${workflowId}`)
    }

    const constraints = workflowState.charter_data.constraints || []

    const classification: ConstraintClassification = {
      total_count: constraints.length,
      by_type: this.groupBy(constraints, 'type'),
      by_severity: this.groupBy(constraints, 'severity'),
      critical_constraints: constraints.filter(c => c.severity === 'critical'),
      interdependencies: await this.identifyConstraintDependencies(constraints),
      mitigation_priorities: await this.prioritizeMitigations(constraints)
    }

    return classification
  }

  private async identifyConstraintDependencies(
    constraints: CharterConstraint[]
  ): Promise<{ constraint_id: string; depends_on: string[]; impacts: string[] }[]> {
    // Use AI to identify interdependencies
    if (constraints.length < 2) return []

    const prompt = `Analyze these project constraints and identify interdependencies:

${JSON.stringify(constraints, null, 2)}

Return JSON array with format:
[{ "constraint_id": "title", "depends_on": ["other constraint titles"], "impacts": ["areas affected"] }]

Only include constraints that have clear dependencies on others.`

    try {
      const response = await aiService.generateWithFallback({
        prompt,
        provider: this.config.default_ai_provider,
        model: this.config.default_ai_model,
        temperature: 0.3,
        max_tokens: 2000
      }, ['openai', 'google'])

      const jsonMatch = response.content.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    } catch (error) {
      logger.warn('[PROJECT-CHARTER-AGENT] Failed to identify constraint dependencies')
    }

    return []
  }

  private async prioritizeMitigations(constraints: CharterConstraint[]): Promise<string[]> {
    const critical = constraints.filter(c => c.severity === 'critical' || c.severity === 'high')
    return critical.map(c => `Address "${c.title}" - ${c.workaround || 'No workaround identified'}`)
  }

  // ============================================================================
  // Standards Compliance
  // ============================================================================

  /**
   * Check charter against project management standards
   */
  async checkStandardsCompliance(
    workflowId: string,
    standard: string = 'PMBOK 7'
  ): Promise<StandardsRuleCheck> {
    const workflowState = this.workflowStates.get(workflowId)
    if (!workflowState) {
      throw new Error(`Workflow not found: ${workflowId}`)
    }

    const prompt = `Evaluate this Project Charter data against ${standard} standards:

${JSON.stringify(workflowState.charter_data, null, 2)}

Check for compliance with ${standard} Project Charter requirements including:
- Project purpose and justification
- Measurable objectives
- Success criteria
- Stakeholder identification
- Assumptions and constraints
- Risk identification
- Milestone definition
- Authority levels

Return JSON:
{
  "compliance_score": 0-100,
  "passed_rules": ["rule descriptions that pass"],
  "failed_rules": [
    { "rule_id": "id", "rule_name": "name", "description": "what's missing", "severity": "critical|major|minor", "remediation": "how to fix" }
  ],
  "recommendations": ["improvement suggestions"]
}`

    try {
      const response = await aiService.generateWithFallback({
        prompt,
        provider: this.config.default_ai_provider,
        model: this.config.default_ai_model,
        temperature: 0.2,
        max_tokens: 4000
      }, ['openai', 'anthropic', 'google'])

      const jsonMatch = response.content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0])
        return {
          standard,
          compliance_score: result.compliance_score || 0,
          passed_rules: result.passed_rules || [],
          failed_rules: result.failed_rules || [],
          recommendations: result.recommendations || []
        }
      }
    } catch (error) {
      logger.error('[PROJECT-CHARTER-AGENT] Standards check failed', { error })
    }

    return {
      standard,
      compliance_score: 0,
      passed_rules: [],
      failed_rules: [],
      recommendations: ['Unable to perform standards check. Please try again.']
    }
  }

  // ============================================================================
  // Document Generation
  // ============================================================================

  /**
   * Generate Project Charter and supporting documents
   */
  async generateCharterDocuments(
    request: GenerateCharterRequest,
    userId: string
  ): Promise<GenerateCharterResponse> {
    const startTime = Date.now()

    try {
      const workflowState = this.workflowStates.get(request.workflow_id)
      if (!workflowState) {
        throw new Error(`Workflow not found: ${request.workflow_id}`)
      }

      // Update workflow status
      workflowState.status = 'generating'
      const genStep = workflowState.steps.find(s => s.name === 'Document Generation')
      if (genStep) {
        genStep.status = 'in_progress'
        genStep.started_at = new Date()
      }

      const supportingDocuments: GeneratedDocument[] = []

      // Generate main Project Charter
      const charterContent = await this.assembleCharterContent(workflowState.charter_data)
      const charterDocument = await this.generateDocument(
        `Project Charter - ${workflowState.charter_data.project_name}`,
        charterContent,
        request.output_format,
        'project_charter',
        userId
      )

      // Generate Stakeholder Register if requested
      let stakeholderRegister: GeneratedDocument | undefined
      if (request.options?.include_stakeholder_register !== false) {
        const stakeholderContent = await this.assembleStakeholderRegister(
          workflowState.charter_data.stakeholders || []
        )
        stakeholderRegister = await this.generateDocument(
          `Stakeholder Register - ${workflowState.charter_data.project_name}`,
          stakeholderContent,
          request.output_format,
          'stakeholder_register',
          userId
        )
      }

      // Generate Assumptions Log if requested
      let assumptionsLog: GeneratedDocument | undefined
      if (request.options?.include_assumptions_log !== false) {
        const assumptionsContent = await this.assembleAssumptionsLog(
          workflowState.charter_data.assumptions || [],
          workflowState.charter_data.constraints || []
        )
        assumptionsLog = await this.generateDocument(
          `Assumptions Log - ${workflowState.charter_data.project_name}`,
          assumptionsContent,
          request.output_format,
          'assumptions_log',
          userId
        )
      }

      // Generate Risk Register if requested
      if (request.options?.include_risk_register) {
        const riskContent = await this.assembleRiskRegister(
          workflowState.charter_data.risks || []
        )
        const riskDocument = await this.generateDocument(
          `Initial Risk Register - ${workflowState.charter_data.project_name}`,
          riskContent,
          request.output_format,
          'risk_register',
          userId
        )
        supportingDocuments.push(riskDocument)
      }

      // Update workflow completion
      if (genStep) {
        genStep.status = 'completed'
        genStep.completed_at = new Date()
      }
      workflowState.status = 'completed'
      workflowState.completed_at = new Date()
      workflowState.updated_at = new Date()

      await this.saveWorkflowState(workflowState, userId)

      // Save entities to database
      await this.saveEntitiesToDatabase(workflowState, userId)

      logger.info('[PROJECT-CHARTER-AGENT] Charter documents generated', {
        workflowId: request.workflow_id,
        charterGenerated: true,
        stakeholderRegister: !!stakeholderRegister,
        assumptionsLog: !!assumptionsLog,
        supportingDocs: supportingDocuments.length,
        durationMs: Date.now() - startTime
      })

      return {
        charter_document: charterDocument,
        stakeholder_register: stakeholderRegister,
        assumptions_log: assumptionsLog,
        supporting_documents: supportingDocuments
      }
    } catch (error) {
      logger.error('[PROJECT-CHARTER-AGENT] Document generation failed', {
        workflowId: request.workflow_id,
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  /**
   * Assemble Project Charter content in Markdown
   */
  private async assembleCharterContent(data: Partial<ProjectCharterData>): Promise<string> {
    const sections: string[] = []

    // Header
    sections.push(`# Project Charter: ${data.project_name || 'Untitled Project'}`)
    sections.push('')
    sections.push(`**Version:** ${data.version || '1.0'}`)
    sections.push(`**Date:** ${new Date().toISOString().split('T')[0]}`)
    sections.push('')

    // Executive Summary
    sections.push('## 1. Executive Summary')
    sections.push('')
    sections.push('### Project Purpose')
    sections.push(data.project_purpose || '_To be defined_')
    sections.push('')
    sections.push('### Project Description')
    sections.push(data.project_description || '_To be defined_')
    sections.push('')

    // Business Case
    if (data.business_case || data.business_need) {
      sections.push('## 2. Business Case')
      sections.push('')
      sections.push('### Business Need')
      sections.push(data.business_need || '_To be defined_')
      sections.push('')
      if (data.expected_benefits?.length) {
        sections.push('### Expected Benefits')
        data.expected_benefits.forEach(b => sections.push(`- ${b}`))
        sections.push('')
      }
    }

    // Objectives
    if (data.objectives?.length) {
      sections.push('## 3. Project Objectives')
      sections.push('')
      data.objectives.forEach((obj, i) => {
        sections.push(`### ${i + 1}. ${obj.name}`)
        sections.push(obj.description)
        if (obj.measurable_target) {
          sections.push(`**Target:** ${obj.measurable_target}`)
        }
        sections.push('')
      })
    }

    // Success Criteria
    if (data.success_criteria?.length) {
      sections.push('## 4. Success Criteria')
      sections.push('')
      sections.push('| Criterion | Measurement Method | Target | Category | Priority |')
      sections.push('|-----------|-------------------|--------|----------|----------|')
      data.success_criteria.forEach(sc => {
        sections.push(`| ${sc.criterion} | ${sc.measurement_method} | ${sc.target_value} | ${sc.category} | ${sc.priority} |`)
      })
      sections.push('')
    }

    // Scope
    sections.push('## 5. Project Scope')
    sections.push('')
    sections.push('### In Scope')
    if (data.in_scope?.length) {
      data.in_scope.forEach(s => sections.push(`- ${s}`))
    } else {
      sections.push('_To be defined_')
    }
    sections.push('')
    sections.push('### Out of Scope')
    if (data.out_of_scope?.length) {
      data.out_of_scope.forEach(s => sections.push(`- ${s}`))
    } else {
      sections.push('_To be defined_')
    }
    sections.push('')

    // Key Stakeholders
    if (data.stakeholders?.length) {
      sections.push('## 6. Key Stakeholders')
      sections.push('')
      sections.push('| Name | Role | Interest | Influence | Category |')
      sections.push('|------|------|----------|-----------|----------|')
      data.stakeholders.slice(0, 15).forEach(s => {
        sections.push(`| ${s.name} | ${s.role} | ${s.interest_level} | ${s.influence_level} | ${s.category} |`)
      })
      if (data.stakeholders.length > 15) {
        sections.push(`_... and ${data.stakeholders.length - 15} more (see Stakeholder Register)_`)
      }
      sections.push('')
    }

    // Assumptions and Constraints
    sections.push('## 7. Assumptions and Constraints')
    sections.push('')
    sections.push('### Assumptions')
    if (data.assumptions?.length) {
      data.assumptions.forEach(a => {
        sections.push(`- **${a.assumption}** _(Risk if false: ${a.risk_if_false})_`)
      })
    } else {
      sections.push('_No assumptions documented_')
    }
    sections.push('')
    sections.push('### Constraints')
    if (data.constraints?.length) {
      data.constraints.forEach(c => {
        sections.push(`- **${c.title}** _(${c.type}, Severity: ${c.severity})_: ${c.description}`)
      })
    } else {
      sections.push('_No constraints documented_')
    }
    sections.push('')

    // Risks
    if (data.risks?.length) {
      sections.push('## 8. Initial Risks')
      sections.push('')
      sections.push('| Risk | Probability | Impact | Mitigation |')
      sections.push('|------|-------------|--------|------------|')
      data.risks.slice(0, 10).forEach(r => {
        sections.push(`| ${r.title} | ${r.probability} | ${r.impact} | ${r.mitigation_strategy || 'TBD'} |`)
      })
      sections.push('')
    }

    // Milestones
    if (data.milestones?.length) {
      sections.push('## 9. Key Milestones')
      sections.push('')
      sections.push('| Milestone | Due Date | Deliverables |')
      sections.push('|-----------|----------|--------------|')
      data.milestones.forEach(m => {
        sections.push(`| ${m.name} | ${m.due_date || 'TBD'} | ${m.deliverables?.join(', ') || 'TBD'} |`)
      })
      sections.push('')
    }

    // Timeline and Budget
    sections.push('## 10. Timeline and Budget')
    sections.push('')
    sections.push(`- **Start Date:** ${data.start_date || 'TBD'}`)
    sections.push(`- **End Date:** ${data.end_date || 'TBD'}`)
    sections.push(`- **Duration:** ${data.duration_estimate || 'TBD'}`)
    sections.push(`- **Budget:** ${data.budget_estimate ? `${data.currency || 'EUR'} ${data.budget_estimate.toLocaleString()}` : 'TBD'}`)
    sections.push('')

    // Authority
    sections.push('## 11. Project Authority')
    sections.push('')
    sections.push(`- **Project Sponsor:** ${data.project_sponsor || 'TBD'}`)
    sections.push(`- **Project Manager:** ${data.project_manager || 'TBD'}`)
    sections.push('')

    // Approvals
    sections.push('## 12. Approvals')
    sections.push('')
    sections.push('| Role | Name | Signature | Date |')
    sections.push('|------|------|-----------|------|')
    sections.push('| Project Sponsor | | | |')
    sections.push('| Project Manager | | | |')
    sections.push('')

    return sections.join('\n')
  }

  /**
   * Assemble Stakeholder Register content
   */
  private async assembleStakeholderRegister(
    stakeholders: CharterStakeholder[]
  ): Promise<string> {
    const sections: string[] = []

    sections.push('# Stakeholder Register')
    sections.push('')
    sections.push(`**Total Stakeholders:** ${stakeholders.length}`)
    sections.push(`**Generated:** ${new Date().toISOString().split('T')[0]}`)
    sections.push('')

    // Summary by category
    const byCategory = this.groupBy(stakeholders, 'category')
    sections.push('## Summary by Category')
    sections.push('')
    Object.entries(byCategory).forEach(([cat, count]) => {
      sections.push(`- **${cat}:** ${count}`)
    })
    sections.push('')

    // Detailed list
    sections.push('## Stakeholder Details')
    sections.push('')

    stakeholders.forEach((s, i) => {
      sections.push(`### ${i + 1}. ${s.name}`)
      sections.push('')
      sections.push(`- **Role:** ${s.role}`)
      sections.push(`- **Category:** ${s.category}`)
      sections.push(`- **Interest Level:** ${s.interest_level}`)
      sections.push(`- **Influence Level:** ${s.influence_level}`)
      if (s.email) sections.push(`- **Email:** ${s.email}`)
      if (s.organization) sections.push(`- **Organization:** ${s.organization}`)
      if (s.expectations) sections.push(`- **Expectations:** ${s.expectations}`)
      if (s.concerns) sections.push(`- **Concerns:** ${s.concerns}`)
      if (s.engagement_strategy) sections.push(`- **Engagement Strategy:** ${s.engagement_strategy}`)
      sections.push('')
    })

    return sections.join('\n')
  }

  /**
   * Assemble Assumptions Log content
   */
  private async assembleAssumptionsLog(
    assumptions: CharterAssumption[],
    constraints: CharterConstraint[]
  ): Promise<string> {
    const sections: string[] = []

    sections.push('# Assumptions and Constraints Log')
    sections.push('')
    sections.push(`**Generated:** ${new Date().toISOString().split('T')[0]}`)
    sections.push('')

    // Assumptions
    sections.push('## Assumptions')
    sections.push('')
    sections.push('| ID | Assumption | Category | Risk if False | Validation Status | Owner |')
    sections.push('|----|------------|----------|---------------|-------------------|-------|')
    
    assumptions.forEach((a, i) => {
      sections.push(`| A${String(i + 1).padStart(3, '0')} | ${a.assumption} | ${a.category} | ${a.risk_if_false} | ${a.validation_status} | ${a.owner || 'TBD'} |`)
    })
    sections.push('')

    // Constraints
    sections.push('## Constraints')
    sections.push('')
    sections.push('| ID | Constraint | Type | Severity | Impact Area | Workaround |')
    sections.push('|----|------------|------|----------|-------------|------------|')
    
    constraints.forEach((c, i) => {
      sections.push(`| C${String(i + 1).padStart(3, '0')} | ${c.title} | ${c.type} | ${c.severity} | ${c.impact_area} | ${c.workaround || 'N/A'} |`)
    })
    sections.push('')

    return sections.join('\n')
  }

  /**
   * Assemble Risk Register content
   */
  private async assembleRiskRegister(risks: CharterRisk[]): Promise<string> {
    const sections: string[] = []

    sections.push('# Initial Risk Register')
    sections.push('')
    sections.push(`**Total Risks:** ${risks.length}`)
    sections.push(`**Generated:** ${new Date().toISOString().split('T')[0]}`)
    sections.push('')

    sections.push('| ID | Risk | Category | Probability | Impact | Score | Mitigation | Owner |')
    sections.push('|----|------|----------|-------------|--------|-------|------------|-------|')
    
    risks.forEach((r, i) => {
      const score = r.risk_score || this.calculateRiskScore(r.probability, r.impact)
      sections.push(`| R${String(i + 1).padStart(3, '0')} | ${r.title} | ${r.category} | ${r.probability} | ${r.impact} | ${score} | ${r.mitigation_strategy || 'TBD'} | ${r.owner || 'TBD'} |`)
    })
    sections.push('')

    return sections.join('\n')
  }

  private calculateRiskScore(
    probability: string,
    impact: string
  ): number {
    const probMap: Record<string, number> = {
      'very_high': 5, 'high': 4, 'medium': 3, 'low': 2, 'very_low': 1
    }
    const impactMap: Record<string, number> = {
      'very_high': 5, 'high': 4, 'medium': 3, 'low': 2, 'very_low': 1
    }
    return (probMap[probability] || 3) * (impactMap[impact] || 3)
  }

  /**
   * Generate document in specified format
   */
  private async generateDocument(
    name: string,
    content: string,
    format: string,
    type: string,
    userId: string
  ): Promise<GeneratedDocument> {
    const docId = uuidv4()

    // For now, return the markdown content
    // In production, this would use documentGeneratorService for PDF/DOCX
    return {
      id: docId,
      name,
      type,
      format,
      content,
      metadata: {
        generated_by: userId,
        generated_at: new Date().toISOString()
      }
    }
  }

  // ============================================================================
  // Validation
  // ============================================================================

  /**
   * Validate charter data completeness
   */
  private async validateCharterData(
    data: Partial<ProjectCharterData>
  ): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = []

    // Required fields
    if (!data.project_name) {
      issues.push({
        id: uuidv4(),
        field: 'project_name',
        type: 'missing',
        message: 'Project name is required',
        severity: 'error'
      })
    }

    if (!data.project_purpose) {
      issues.push({
        id: uuidv4(),
        field: 'project_purpose',
        type: 'missing',
        message: 'Project purpose should be defined',
        severity: 'warning',
        suggestion: 'Add a clear statement of why this project exists'
      })
    }

    // Stakeholders
    if (!data.stakeholders?.length) {
      issues.push({
        id: uuidv4(),
        field: 'stakeholders',
        type: 'missing',
        message: 'No stakeholders identified',
        severity: 'error',
        suggestion: 'Review project documents to identify key stakeholders'
      })
    } else {
      const hasSponsors = data.stakeholders.some(s => 
        s.category === 'sponsor' || s.role?.toLowerCase().includes('sponsor')
      )
      if (!hasSponsors) {
        issues.push({
          id: uuidv4(),
          field: 'stakeholders',
          type: 'incomplete',
          message: 'No project sponsor identified',
          severity: 'warning',
          suggestion: 'Identify and add the project sponsor'
        })
      }
    }

    // Success criteria
    if (!data.success_criteria?.length) {
      issues.push({
        id: uuidv4(),
        field: 'success_criteria',
        type: 'missing',
        message: 'No success criteria defined',
        severity: 'warning',
        suggestion: 'Define measurable success criteria for the project'
      })
    }

    // Constraints
    if (!data.constraints?.length) {
      issues.push({
        id: uuidv4(),
        field: 'constraints',
        type: 'incomplete',
        message: 'No constraints documented (unusual for a project)',
        severity: 'info',
        suggestion: 'Consider documenting budget, time, or resource constraints'
      })
    }

    // Scope
    if (!data.in_scope?.length && !data.out_of_scope?.length) {
      issues.push({
        id: uuidv4(),
        field: 'scope',
        type: 'missing',
        message: 'Project scope not defined',
        severity: 'warning',
        suggestion: 'Define what is in scope and out of scope'
      })
    }

    return issues
  }

  /**
   * Generate AI suggestions based on extracted data
   */
  private async generateSuggestions(
    entityType: string,
    entities: any[],
    charterData: Partial<ProjectCharterData>
  ): Promise<AISuggestion[]> {
    const suggestions: AISuggestion[] = []

    if (entityType === 'stakeholders' && entities.length > 0) {
      const highInfluence = entities.filter(s => s.influence_level === 'high')
      if (highInfluence.length > 3) {
        suggestions.push({
          id: uuidv4(),
          category: 'stakeholder_management',
          title: 'Multiple High-Influence Stakeholders',
          description: `${highInfluence.length} high-influence stakeholders identified. Consider creating a governance structure.`,
          rationale: 'Projects with many high-influence stakeholders need clear decision-making processes',
          confidence: 0.85
        })
      }
    }

    if (entityType === 'constraints') {
      const criticalConstraints = entities.filter(c => c.severity === 'critical')
      if (criticalConstraints.length > 0) {
        suggestions.push({
          id: uuidv4(),
          category: 'risk_management',
          title: 'Critical Constraints Identified',
          description: `${criticalConstraints.length} critical constraint(s) found. Ensure mitigation strategies are in place.`,
          rationale: 'Critical constraints can derail the project if not properly managed',
          confidence: 0.9
        })
      }
    }

    return suggestions
  }

  // ============================================================================
  // Persistence
  // ============================================================================

  /**
   * Save workflow state to database
   */
  private async saveWorkflowState(
    state: CharterWorkflowState,
    userId: string
  ): Promise<void> {
    try {
      await pool.query(`
        INSERT INTO charter_workflows (
          id, project_id, status, current_step, steps, charter_data,
          validation_issues, suggestions, created_by, created_at, updated_at, completed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          current_step = EXCLUDED.current_step,
          steps = EXCLUDED.steps,
          charter_data = EXCLUDED.charter_data,
          validation_issues = EXCLUDED.validation_issues,
          suggestions = EXCLUDED.suggestions,
          updated_at = EXCLUDED.updated_at,
          completed_at = EXCLUDED.completed_at
      `, [
        state.id,
        state.project_id,
        state.status,
        state.current_step,
        JSON.stringify(state.steps),
        JSON.stringify(state.charter_data),
        JSON.stringify(state.validation_issues),
        JSON.stringify(state.suggestions),
        userId,
        state.created_at,
        state.updated_at,
        state.completed_at
      ])
    } catch (error) {
      logger.error('[PROJECT-CHARTER-AGENT] Failed to save workflow state', {
        workflowId: state.id,
        error: error instanceof Error ? error.message : String(error)
      })
      // Don't throw - workflow can continue even if persistence fails
    }
  }

  /**
   * Save extracted entities to their respective tables
   */
  private async saveEntitiesToDatabase(
    state: CharterWorkflowState,
    userId: string
  ): Promise<void> {
    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      const projectId = state.project_id

      // Save stakeholders
      if (state.charter_data.stakeholders?.length) {
        for (const s of state.charter_data.stakeholders) {
          await client.query(`
            INSERT INTO stakeholders (
              project_id, name, role, interest, influence, expectations,
              engagement_strategy, extracted_from_document_id, confidence_score,
              metadata, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (project_id, name) DO UPDATE SET
              role = EXCLUDED.role,
              interest = EXCLUDED.interest,
              influence = EXCLUDED.influence,
              expectations = EXCLUDED.expectations,
              engagement_strategy = EXCLUDED.engagement_strategy,
              updated_at = NOW()
          `, [
            projectId, s.name, s.role, s.interest_level, s.influence_level,
            s.expectations, s.engagement_strategy, s.source_document_id,
            s.confidence_score || 0.85,
            JSON.stringify({ category: s.category, concerns: s.concerns }),
            userId
          ])
        }
      }

      // Save success criteria
      if (state.charter_data.success_criteria?.length) {
        for (const sc of state.charter_data.success_criteria) {
          await client.query(`
            INSERT INTO success_criteria (
              project_id, criterion, description, measurement_method, target_value,
              category, extracted_from_document_id, confidence_score, metadata, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          `, [
            projectId, sc.criterion, sc.description, sc.measurement_method,
            sc.target_value, sc.category, sc.source_document_id,
            sc.confidence_score || 0.85,
            JSON.stringify({ priority: sc.priority, owner: sc.owner }),
            userId
          ])
        }
      }

      // Save constraints
      if (state.charter_data.constraints?.length) {
        for (const c of state.charter_data.constraints) {
          await client.query(`
            INSERT INTO constraints (
              project_id, title, description, type, severity, impact_area,
              workaround, extracted_from_document_id, confidence_score, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          `, [
            projectId, c.title, c.description, c.type, c.severity,
            c.impact_area, c.workaround, c.source_document_id,
            c.confidence_score || 0.85, userId
          ])
        }
      }

      // Save best practices
      if (state.charter_data.best_practices?.length) {
        for (const bp of state.charter_data.best_practices) {
          await client.query(`
            INSERT INTO best_practices (
              project_id, title, description, category, source, applicability,
              implementation_notes, extracted_from_document_id, confidence_score, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          `, [
            projectId, bp.title, bp.description, bp.category, bp.source,
            bp.applicability, bp.implementation_notes, bp.source_document_id,
            bp.confidence_score || 0.85, userId
          ])
        }
      }

      await client.query('COMMIT')

      logger.info('[PROJECT-CHARTER-AGENT] Entities saved to database', {
        projectId,
        stakeholders: state.charter_data.stakeholders?.length || 0,
        successCriteria: state.charter_data.success_criteria?.length || 0,
        constraints: state.charter_data.constraints?.length || 0,
        bestPractices: state.charter_data.best_practices?.length || 0
      })
    } catch (error) {
      await client.query('ROLLBACK')
      logger.error('[PROJECT-CHARTER-AGENT] Failed to save entities', {
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    } finally {
      client.release()
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private async getProject(projectId: string): Promise<any> {
    const result = await pool.query(
      'SELECT * FROM projects WHERE id = $1 AND deleted_at IS NULL',
      [projectId]
    )
    return result.rows[0]
  }

  private async getProjectDocuments(
    projectId: string,
    documentIds?: string[]
  ): Promise<any[]> {
    let query = `
      SELECT d.id, d.title, d.content, t.name as template_name
      FROM documents d
      LEFT JOIN templates t ON d.template_id = t.id
      WHERE d.project_id = $1
        AND d.deleted_at IS NULL
        AND d.content IS NOT NULL
        AND d.content != ''
    `
    const params: any[] = [projectId]

    if (documentIds?.length) {
      query += ` AND d.id = ANY($2::uuid[])`
      params.push(documentIds)
    }

    query += ` ORDER BY d.created_at ASC`

    const result = await pool.query(query, params)
    return result.rows
  }

  private updateCharterDataWithEntities(
    charterData: Partial<ProjectCharterData>,
    entityType: string,
    entities: any[]
  ): void {
    switch (entityType) {
      case 'stakeholders':
        charterData.stakeholders = entities as CharterStakeholder[]
        break
      case 'success_criteria':
        charterData.success_criteria = entities as CharterSuccessCriterion[]
        break
      case 'constraints':
        charterData.constraints = entities as CharterConstraint[]
        break
      case 'assumptions':
        charterData.assumptions = entities as CharterAssumption[]
        break
      case 'best_practices':
        charterData.best_practices = entities as CharterBestPractice[]
        break
      case 'risks':
        charterData.risks = entities as CharterRisk[]
        break
      case 'milestones':
        charterData.milestones = entities as CharterMilestone[]
        break
    }
  }

  private groupBy<T>(array: T[], key: keyof T): Record<string, number> {
    return array.reduce((acc, item) => {
      const value = String(item[key] || 'unknown')
      acc[value] = (acc[value] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  // ============================================================================
  // Public API for Workflow Retrieval
  // ============================================================================

  /**
   * Get workflow state by ID
   */
  async getWorkflowState(workflowId: string): Promise<CharterWorkflowState | null> {
    // Check in-memory first
    if (this.workflowStates.has(workflowId)) {
      return this.workflowStates.get(workflowId) || null
    }

    // Load from database
    try {
      const result = await pool.query(
        'SELECT * FROM charter_workflows WHERE id = $1',
        [workflowId]
      )

      if (result.rows[0]) {
        const row = result.rows[0]
        const state: CharterWorkflowState = {
          id: row.id,
          project_id: row.project_id,
          current_step: row.current_step,
          steps: row.steps,
          charter_data: row.charter_data,
          validation_issues: row.validation_issues || [],
          suggestions: row.suggestions || [],
          created_at: row.created_at,
          updated_at: row.updated_at,
          completed_at: row.completed_at,
          status: row.status
        }
        this.workflowStates.set(workflowId, state)
        return state
      }
    } catch (error) {
      logger.error('[PROJECT-CHARTER-AGENT] Failed to load workflow', { workflowId, error })
    }

    return null
  }

  /**
   * Get all workflows for a project
   */
  async getProjectWorkflows(projectId: string): Promise<CharterWorkflowState[]> {
    const result = await pool.query(
      'SELECT * FROM charter_workflows WHERE project_id = $1 ORDER BY created_at DESC',
      [projectId]
    )

    return result.rows.map(row => ({
      id: row.id,
      project_id: row.project_id,
      current_step: row.current_step,
      steps: row.steps,
      charter_data: row.charter_data,
      validation_issues: row.validation_issues || [],
      suggestions: row.suggestions || [],
      created_at: row.created_at,
      updated_at: row.updated_at,
      completed_at: row.completed_at,
      status: row.status
    }))
  }
}

// Export singleton instance
export const projectCharterAgentService = new ProjectCharterAgentService()
