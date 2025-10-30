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
import type { AIGenerateRequest } from './aiService'
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
  quality_standards: QualityStandard[]
  deliverables: Deliverable[]
  scope_items: ScopeItem[]
  activities: Activity[]
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
  type: 'human' | 'equipment' | 'material' | 'financial'
  role?: string
  allocation?: string
  availability?: string
  cost?: number
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

export class ProjectDataExtractionService {
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
    try {
      logger.info('[EXTRACTION] Starting project entity extraction', {
        projectId,
        userId,
        provider: options.aiProvider || 'default'
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
        qualityStandards,
        deliverables,
        scopeItems,
        activities
      ] = await Promise.all([
        this.extractStakeholders(documents, projectId, options),
        this.extractRequirements(documents, projectId, options),
        this.extractRisks(documents, projectId, options),
        this.extractMilestones(documents, projectId, options),
        this.extractConstraints(documents, projectId, options),
        this.extractSuccessCriteria(documents, projectId, options),
        this.extractBestPractices(documents, projectId, options),
        this.extractPhases(documents, projectId, options),
        this.extractResources(documents, projectId, options),
        this.extractQualityStandards(documents, projectId, options),
        this.extractDeliverables(documents, projectId, options),
        this.extractScopeItems(documents, projectId, options),
        this.extractActivities(documents, projectId, options)
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
          qualityStandards: qualityStandards.length,
          deliverables: deliverables.length,
          scopeItems: scopeItems.length,
          activities: activities.length
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
        quality_standards: qualityStandards,
        deliverables,
        scope_items: scopeItems,
        activities
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
        provider: options.aiProvider || 'openai',
        model: options.aiModel || 'gpt-4-turbo-preview',
        temperature: 0.3,
        max_tokens: 2000
      })

      const parsed = this.parseAIResponse(response.content)
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
        error: error instanceof Error ? error.message : String(error)
      })
      return []
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
        provider: options.aiProvider || 'openai',
        model: options.aiModel || 'gpt-4-turbo-preview',
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
        provider: options.aiProvider || 'openai',
        model: options.aiModel || 'gpt-4-turbo-preview',
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
      
      const prompt = `Analyze the following project documents and extract ALL milestones and key dates mentioned.

${documentContext}

Extract milestones in JSON format with the following structure:
{
  "milestones": [
    {
      "name": "Milestone Name",
      "description": "What this milestone represents",
      "due_date": "YYYY-MM-DD or Quarter/Year if specific date not mentioned",
      "status": "pending|in_progress|completed|delayed",
      "deliverables": ["Deliverable 1", "Deliverable 2"]
    }
  ]
}

Requirements:
- Include ALL milestones, deadlines, and key dates mentioned
- Extract deliverables associated with each milestone
- If exact dates aren't mentioned, use relative dates like "2025-Q1" or "Month 3"
- Infer status from context (future = pending, past = completed)
- Return ONLY valid JSON, no markdown or explanation`

      const response = await aiService.generate({
        prompt,
        provider: options.aiProvider || 'openai',
        model: options.aiModel || 'gpt-4-turbo-preview',
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
        provider: options.aiProvider || 'openai',
        model: options.aiModel || 'gpt-4-turbo-preview',
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
        provider: options.aiProvider || 'openai',
        model: options.aiModel || 'gpt-4-turbo-preview',
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
        provider: options.aiProvider || 'openai',
        model: options.aiModel || 'gpt-4-turbo-preview',
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
        provider: options.aiProvider || 'openai',
        model: options.aiModel || 'gpt-4-turbo-preview',
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
      "availability": "When they are available"
    }
  ]
}

Requirements:
- Include human resources (team members, consultants)
- Include equipment/tools
- Include financial resources (budget allocations)
- Extract allocation and availability if mentioned
- Return ONLY valid JSON, no markdown or explanation`

      const response = await aiService.generate({
        prompt,
        provider: options.aiProvider || 'openai',
        model: options.aiModel || 'gpt-4-turbo-preview',
        temperature: 0.3,
        max_tokens: 1500
      })

      const parsed = this.parseAIResponse(response.content)
      const resources = parsed.resources || []

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
        provider: options.aiProvider || 'openai',
        model: options.aiModel || 'gpt-4-turbo-preview',
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
        provider: options.aiProvider || 'openai',
        model: options.aiModel || 'gpt-4-turbo-preview',
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
        provider: options.aiProvider || 'openai',
        model: options.aiModel || 'gpt-4-turbo-preview',
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
        provider: options.aiProvider || 'openai',
        model: options.aiModel || 'gpt-4-turbo-preview',
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

    documents.forEach((doc, index) => {
      sections.push(`--- Document ${index + 1}: ${doc.title} ---`)
      sections.push(`Template: ${doc.template_name || 'Unknown'}`)
      sections.push('')
      // Truncate very long documents to fit in token budget
      const content = doc.content.length > 15000 
        ? doc.content.substring(0, 15000) + '\n\n[Document truncated for length]'
        : doc.content
      sections.push(content)
      sections.push('')
    })

    return sections.join('\n')
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
      values.push(
        projectId,
        s.name,
        s.role,
        s.email || null,
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

    const values: any[] = []
    const placeholders: string[] = []

    risks.forEach((r, index) => {
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
        project_id, name, description, date, status, created_by
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (project_id, name) DO UPDATE SET
        description = EXCLUDED.description,
        date = EXCLUDED.date,
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

    // Deduplicate by name (ON CONFLICT requires unique names)
    const uniqueConstraints = Array.from(
      new Map(constraints.map(c => [(c.name || c.title || '').toLowerCase().trim(), c])).values()
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

    // Deduplicate by name (ON CONFLICT requires unique names)
    const uniqueCriteria = Array.from(
      new Map(successCriteria.map(sc => [(sc.name || sc.title || '').toLowerCase().trim(), sc])).values()
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

    const values: any[] = []
    const placeholders: string[] = []

    bestPractices.forEach((bp, index) => {
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
      const startDate = isValidDate(p.start_date) ? p.start_date : null
      let endDate = isValidDate(p.end_date) ? p.end_date : null
      
      // end_date is NOT NULL in database - provide default if missing
      if (!endDate) {
        if (startDate) {
          // Default: 30 days after start_date
          endDate = addDays(startDate, 30)
        } else {
          // No valid dates at all - use current date + 30 days
          endDate = addDays(getCurrentDate(), 30)
        }
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
      const offset = index * 7
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7})`
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
      
      values.push(
        projectId,
        r.name,
        mappedType,  // Use mapped type value
        r.role || null,
        r.allocation || null,
        r.availability || null,
        userId
      )
    })

    await client.query(`
      INSERT INTO resources (
        project_id, name, type, role, allocation, availability, created_by
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (project_id, name) DO UPDATE SET
        type = EXCLUDED.type,
        role = EXCLUDED.role,
        allocation = EXCLUDED.allocation,
        availability = EXCLUDED.availability,
        updated_at = CURRENT_TIMESTAMP
    `, values)

    logger.info(`[EXTRACTION] Saved ${uniqueResources.length} resources`)
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
      
      values.push(
        projectId,
        d.name,
        d.description,
        d.type,
        d.due_date || null,
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
      
      values.push(
        projectId,
        a.name,          // For name column
        a.name,          // For activity_name column (NOT NULL)
        a.description,
        a.category || null,
        a.start_date || null,
        a.end_date || null,
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
    const documents = await this.getProjectDocuments(projectId, options.documentIds)
    
    if (documents.length === 0) {
      logger.warn(`[EXTRACTION] No documents found for ${entityType}`)
      return []
    }

    // Build document context and check cache
    const documentContext = this.buildDocumentContext(documents)
    
    const cached = await aiCacheService.get(
      projectId,
      documentContext,
      entityType,
      options.aiProvider,
      options.aiModel
    )
    
    if (cached) {
      logger.info(`[EXTRACTION-${entityType.toUpperCase()}] ✅ Using cached result (${cached.length} entities)`)
      return cached
    }

    // Cache miss - perform AI extraction
    logger.info(`[EXTRACTION-${entityType.toUpperCase()}] ❌ Cache miss, calling AI...`)
    
    let entities: any[]
    
    // Map entity type to extraction method - pass documents array and options
    switch (entityType) {
      case 'stakeholders':
        entities = await this.extractStakeholders(documents, projectId, options)
        break
      case 'requirements':
        entities = await this.extractRequirements(documents, projectId, options)
        break
      case 'risks':
        entities = await this.extractRisks(documents, projectId, options)
        break
      case 'milestones':
        entities = await this.extractMilestones(documents, projectId, options)
        break
      case 'constraints':
        entities = await this.extractConstraints(documents, projectId, options)
        break
      case 'success_criteria':
        entities = await this.extractSuccessCriteria(documents, projectId, options)
        break
      case 'best_practices':
        entities = await this.extractBestPractices(documents, projectId, options)
        break
      case 'phases':
        entities = await this.extractPhases(documents, projectId, options)
        break
      case 'resources':
        entities = await this.extractResources(documents, projectId, options)
        break
      case 'quality_standards':
        entities = await this.extractQualityStandards(documents, projectId, options)
        break
      case 'deliverables':
        entities = await this.extractDeliverables(documents, projectId, options)
        break
      case 'scope_items':
        entities = await this.extractScopeItems(documents, projectId, options)
        break
      case 'activities':
        entities = await this.extractActivities(documents, projectId, options)
        break
      default:
        throw new Error(`Unknown entity type: ${entityType}`)
    }
    
    // Cache the result for future extractions (only if successful)
    if (entities.length > 0) {
      await aiCacheService.set(
        projectId,
        documentContext,
        entityType,
        entities,
        options.aiProvider,
        options.aiModel
      )
      logger.info(`[EXTRACTION-${entityType.toUpperCase()}] 💾 Cached ${entities.length} entities for future use`)
    }
    
    return entities
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
        default:
          throw new Error(`Unknown entity type: ${entityType}`)
      }

      await client.query('COMMIT')
      logger.info(`[EXTRACTION] Successfully saved ${entities.length} ${entityType}`)
      
    } catch (error) {
      await client.query('ROLLBACK')
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error(`[EXTRACTION] Failed to save ${entityType}: ${errorMessage}`)
      throw error
    } finally {
      client.release()
    }
  }
}

export const projectDataExtractionService = new ProjectDataExtractionService()

