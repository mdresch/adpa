/**
 * ADPA Playbook Service
 * Integrates playbook template generation with document generation system
 * Provides standardized playbook creation from project data
 */

import { PlaybookTemplateGenerator, PLAYBOOK_TEMPLATE_CONFIGS } from './playbookTemplate'
import { documentTemplateService } from './service'
import { documentGeneratorService } from '../documentGenerator/service'
import { getContextForStrategy } from '../../services/gkg/gkgContextService'
import { logger } from '../../utils/logger'
import { 
  OutputFormat,
  type DocumentGenerationRequest, 
  AuthenticatedUser,
  GenerationOptions
} from '../documentGenerator/types'

export interface PlaybookGenerationRequest {
  projectId: string
  playbookType: 'program' | 'framework' | 'operational'
  targetAudience: 'executive' | 'technical' | 'operational'
  complexity: 'basic' | 'standard' | 'comprehensive'
  outputFormat: 'pdf' | 'docx' | 'markdown' | 'html'
  customVariables?: Record<string, any>
  includeGkgContext?: boolean
}

export interface PlaybookGenerationResponse {
  success: boolean
  documentId?: string
  downloadUrl?: string
  templateId?: string
  generationId?: string
  error?: string
  metadata?: {
    playbookType: string
    targetAudience: string
    complexity: string
    sectionsGenerated: number
    gkgUnitsUsed: number
    generationTime: number
  }
}

export class PlaybookService {
  private templateGenerator = new PlaybookTemplateGenerator()

  /**
   * Convert string output format to OutputFormat enum
   */
  private convertToOutputFormat(format: string): OutputFormat {
    switch (format.toLowerCase()) {
      case 'pdf':
        return OutputFormat.PDF
      case 'docx':
        return OutputFormat.DOCX
      case 'markdown':
        return OutputFormat.MARKDOWN
      case 'html':
        return OutputFormat.HTML
      default:
        return OutputFormat.PDF
    }
  }

  /**
   * Generate ADPA Playbook from project data
   */
  static async generatePlaybook(
    request: PlaybookGenerationRequest,
    user: AuthenticatedUser
  ): Promise<PlaybookGenerationResponse> {
    const startTime = Date.now()
    
    try {
      logger.info('[Playbook Service] Starting playbook generation', {
        projectId: request.projectId,
        playbookType: request.playbookType,
        targetAudience: request.targetAudience,
        complexity: request.complexity,
        outputFormat: request.outputFormat
      })

      // 1. Create playbook template
      const templateConfig = {
        playbookType: request.playbookType,
        targetAudience: request.targetAudience,
        complexity: request.complexity,
        includeGkgContext: request.includeGkgContext ?? true
      }

      const template = PlaybookTemplateGenerator.generatePlaybookTemplate(templateConfig)
      
      // 2. Save template to database
      const savedTemplate = await documentTemplateService.createTemplate(template, user)
      
      // 3. Prepare template data with GKG context
      const templateData = await this.prepareTemplateData(request, savedTemplate.id)
      
      // 4. Generate document - always store as Markdown in database
      const generationRequest: DocumentGenerationRequest = {
        template_id: savedTemplate.id,
        output_format: OutputFormat.MARKDOWN, // Always store as Markdown
        data: templateData,
        options: {
          quality: 95, // Convert quality to number
          include_toc: true,
          include_watermark: false,
          custom_css: this.getPlaybookStyles(request)
        } as GenerationOptions
      }

      const generationResult = await documentGeneratorService.generateDocument(
        generationRequest,
        user
      )

      const generationTime = Date.now() - startTime

      logger.info('[Playbook Service] Playbook generation completed', {
        templateId: savedTemplate.id,
        documentId: generationResult.id,
        generationTime
      })

      return {
        success: true,
        documentId: generationResult.id,
        downloadUrl: generationResult.file_url,
        templateId: savedTemplate.id,
        generationId: generationResult.id,
        metadata: {
          playbookType: request.playbookType,
          targetAudience: request.targetAudience,
          complexity: request.complexity,
          sectionsGenerated: template.content.sections.length,
          gkgUnitsUsed: templateData.gkgContext?.unitsCount || 0,
          generationTime
        }
      }

    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.error('[Playbook Service] Playbook generation failed', {
        error: errorMessage,
        projectId: request.projectId,
        playbookType: request.playbookType
      })

      return {
        success: false,
        error: errorMessage
      }
    }
  }

  /**
   * Generate playbook using predefined template configuration
   */
  static async generateStandardPlaybook(
    configKey: keyof typeof PLAYBOOK_TEMPLATE_CONFIGS,
    projectId: string,
    outputFormat: 'markdown' | 'pdf' | 'docx' = 'pdf',
    user: AuthenticatedUser
  ): Promise<PlaybookGenerationResponse> {
    const config = PLAYBOOK_TEMPLATE_CONFIGS[configKey]
    
    return this.generatePlaybook({
      projectId,
      playbookType: config.playbookType,
      targetAudience: config.targetAudience,
      complexity: config.complexity,
      outputFormat,
      includeGkgContext: config.includeGkgContext
    }, user)
  }

  /**
   * Prepare template data with GKG context and project information
   */
  private static async prepareTemplateData(
    request: PlaybookGenerationRequest,
    templateId: string
  ): Promise<Record<string, any>> {
    const baseData = {
      // Core template variables
      title: this.generatePlaybookTitle(request),
      projectId: request.projectId,
      playbookType: request.playbookType,
      targetAudience: request.targetAudience,
      preparedBy: 'ADPA System',
      currentDate: new Date().toISOString().split('T')[0],
      version: '1.0',
      lastUpdated: new Date().toISOString(),
      
      // Custom variables
      ...request.customVariables
    }

    // Add GKG context if enabled
    if (request.includeGkgContext) {
      try {
        const gkgContext = await getContextForStrategy(
          request.projectId,
          {
            profile: 'governance_full',
            scope: 'same_project',
            maxUnits: request.complexity === 'comprehensive' ? 200 : 100,
            traceableOnly: true,
            documentStatusFilter: 'approved_published_only'
          }
        )

        baseData.gkgContext = gkgContext.markdown
        
        // Extract specific entities for structured sections
        baseData.gkgStakeholders = this.extractStakeholders(gkgContext.markdown)
        baseData.gkgRisks = this.extractRisks(gkgContext.markdown)
        baseData.gkgRequirements = this.extractRequirements(gkgContext.markdown)

      } catch (error) {
        logger.warn('[Playbook Service] Failed to retrieve GKG context', {
          error: error instanceof Error ? error.message : String(error),
          projectId: request.projectId
        })
        
        baseData.gkgContext = `
# Project Context

**Project ID**: ${request.projectId}  
**Note**: GKG context not available. Please ensure the project has been synced to the Governance Knowledge Graph.

## Manual Context Available
The project contains comprehensive documentation including:
- Project charter and requirements
- Risk register and mitigation strategies  
- Stakeholder register and engagement plans
- Operational procedures and guidelines

Please run GKG sync to access semantic context for enhanced playbook generation.
        `.trim()
      }
    }

    // Add complexity-specific data
    if (request.complexity === 'comprehensive') {
      baseData.targetObjective = this.generateTargetObjective(request)
      baseData.expectedBenefits = this.generateExpectedBenefits(request)
      baseData.riskMitigationLevel = 'comprehensive'
      baseData.successMeasurement = 'balanced scorecard approach with KPIs'
    }

    // Add mock data for demonstration
    baseData.objectives = this.generateObjectives(request)
    baseData.qualityMetrics = this.generateQualityMetrics(request)
    baseData.operationalMetrics = this.generateOperationalMetrics(request)
    baseData.governanceMetrics = this.generateGovernanceMetrics(request)
    baseData.businessMetrics = this.generateBusinessMetrics(request)
    baseData.integrations = this.generateIntegrations(request)
    baseData.templates = this.generateTemplateReferences(request)
    baseData.references = this.generateReferences(request)
    baseData.contacts = this.generateContacts(request)

    return baseData
  }

  private static generatePlaybookTitle(request: PlaybookGenerationRequest): string {
    const typeMap = {
      'program': 'ADPA Program Playbook',
      'framework': 'ADPAF Framework Playbook',
      'operational': 'ADPA Operational Playbook'
    }
    
    const audienceMap = {
      'executive': 'Executive Edition',
      'technical': 'Technical Edition', 
      'operational': 'Operational Edition'
    }

    return `${typeMap[request.playbookType]} - ${audienceMap[request.targetAudience]}`
  }

  private static generateTargetObjective(request: PlaybookGenerationRequest): string {
    const objectives = {
      'program': 'standardize governance, workflows, and project integration across the ADPA program',
      'framework': 'provide technical guidance for semantic processing and knowledge graph integration',
      'operational': 'establish standardized procedures for day-to-day ADPA operations and maintenance'
    }
    
    return objectives[request.playbookType]
  }

  private static generateExpectedBenefits(request: PlaybookGenerationRequest): string {
    return `operational efficiency through standardized workflows, governance alignment with clear decision rights, accelerated onboarding through structured guidance, and enhanced analytics capabilities through semantic processing`
  }

  private static generateObjectives(request: PlaybookGenerationRequest): string[] {
    const baseObjectives = [
      'Establish standardized operational procedures',
      'Ensure governance compliance and alignment',
      'Enable scalable implementation across projects',
      'Provide clear guidance for stakeholders'
    ]

    if (request.playbookType === 'program') {
      baseObjectives.push('Define program-level governance structure')
      baseObjectives.push('Standardize project integration workflows')
    } else if (request.playbookType === 'framework') {
      baseObjectives.push('Document technical architecture and patterns')
      baseObjectives.push('Specify semantic processing requirements')
    } else if (request.playbookType === 'operational') {
      baseObjectives.push('Define day-to-day operational procedures')
      baseObjectives.push('Establish escalation and response protocols')
    }

    return baseObjectives
  }

  private static generateQualityMetrics(request: PlaybookGenerationRequest): any {
    return {
      accuracy: '95',
      completeness: '98',
      timeliness: '24'
    }
  }

  private static generateOperationalMetrics(request: PlaybookGenerationRequest): any[] {
    return [
      { name: 'Document Processing Time', target: '2 hours', current: '2.5 hours' },
      { name: 'Quality Assurance Pass Rate', target: '98%', current: '95%' },
      { name: 'User Satisfaction', target: '4.5/5', current: '4.2/5' }
    ]
  }

  private static generateGovernanceMetrics(request: PlaybookGenerationRequest): any {
    return {
      compliance: '95',
      satisfaction: '4.2',
      decisionTimeliness: '3'
    }
  }

  private static generateBusinessMetrics(request: PlaybookGenerationRequest): any {
    return {
      roi: '180',
      costSavings: '$500K annually',
      efficiencyGain: '40'
    }
  }

  private static generateIntegrations(request: PlaybookGenerationRequest): any[] {
    return [
      { name: 'GKG Semantic Layer', description: 'Governance Knowledge Graph integration', status: 'Active' },
      { name: 'Document Generator', description: 'Automated document creation', status: 'Active' },
      { name: 'Quality Assurance', description: 'Automated quality checks', status: 'In Development' }
    ]
  }

  private static generateTemplateReferences(request: PlaybookGenerationRequest): any[] {
    return [
      { name: 'Project Charter Template', description: 'Standard project initiation template' },
      { name: 'Risk Register Template', description: 'Risk management template' },
      { name: 'Stakeholder Register Template', description: 'Stakeholder management template' }
    ]
  }

  private static generateReferences(request: PlaybookGenerationRequest): any[] {
    return [
      { title: 'PMBOK Guide Seventh Edition', source: 'PMI', year: '2021' },
      { title: 'ADPA Technical Architecture', source: 'Internal', year: '2026' },
      { title: 'Governance Knowledge Graph Design', source: 'Internal', year: '2026' }
    ]
  }

  private static generateContacts(request: PlaybookGenerationRequest): any[] {
    return [
      { role: 'Program Manager', name: 'Menno Drescher', email: 'program.manager@adpa.org' },
      { role: 'Technical Lead', name: 'Technical Architect', email: 'tech.lead@adpa.org' },
      { role: 'PMO Lead', name: 'PMO Manager', email: 'pmo@adpa.org' }
    ]
  }

  private static extractStakeholders(gkgContext: string): any[] {
    // Parse GKG context to extract stakeholder information
    // This is a simplified implementation - in production, you'd parse the structured data
    const stakeholders: any[] = []
    
    // Look for stakeholder patterns in the context
    const stakeholderMatches = gkgContext.match(/\*\*Stakeholder\*\*: ([^\n]+)/g)
    
    if (stakeholderMatches) {
      stakeholderMatches.forEach((match, index) => {
        const name = match.replace(/\*\*Stakeholder\*\*: /, '').trim()
        stakeholders.push({
          name,
          role: 'Stakeholder',
          responsibility: 'Project governance and oversight'
        })
      })
    }

    // Fallback stakeholders if none found
    if (stakeholders.length === 0) {
      stakeholders.push(
        { name: 'Steering Committee', role: 'Governance', responsibility: 'Strategic oversight' },
        { name: 'Program Manager', role: 'Management', responsibility: 'Program execution' },
        { name: 'Technical Team', role: 'Implementation', responsibility: 'Technical delivery' }
      )
    }

    return stakeholders
  }

  private static extractRisks(gkgContext: string): any[] {
    // Parse GKG context to extract risk information
    const risks: any[] = []
    
    // Look for risk patterns in the context
    const riskMatches = gkgContext.match(/\*\*Risk\*\*: ([^\n]+)/g)
    
    if (riskMatches) {
      riskMatches.forEach((match, index) => {
        const title = match.replace(/\*\*Risk\*\*: /, '').trim()
        risks.push({
          title,
          description: 'Risk identified from project context',
          impact: 'Medium',
          probability: 'Medium',
          mitigation: 'Implement standardized procedures and monitoring',
          owner: 'Risk Manager'
        })
      })
    }

    // Fallback risks if none found
    if (risks.length === 0) {
      risks.push(
        { 
          title: 'Operational Inconsistency', 
          description: 'Lack of standardized workflows across projects',
          impact: 'High', 
          probability: 'Medium',
          mitigation: 'Implement comprehensive playbook with standardized procedures',
          owner: 'Operations Manager'
        },
        {
          title: 'Technology Adoption',
          description: 'Resistance to new semantic processing technologies',
          impact: 'Medium',
          probability: 'Low',
          mitigation: 'Provide comprehensive training and change management',
          owner: 'Change Manager'
        }
      )
    }

    return risks
  }

  private static extractRequirements(gkgContext: string): any[] {
    // Parse GKG context to extract requirement information
    const requirements: any[] = []
    
    // Look for requirement patterns in the context
    const requirementMatches = gkgContext.match(/\*\*Requirement\*\*: ([^\n]+)/g)
    
    if (requirementMatches) {
      requirementMatches.forEach((match, index) => {
        const description = match.replace(/\*\*Requirement\*\*: /, '').trim()
        requirements.push({
          id: `REQ-${index + 1}`,
          description,
          priority: 'High',
          category: 'Functional'
        })
      })
    }

    return requirements
  }

  private static getPlaybookStyles(request: PlaybookGenerationRequest): string {
    return `
      .playbook-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 2rem;
        border-radius: 8px;
        margin-bottom: 2rem;
      }
      
      .section-header {
        border-bottom: 3px solid #667eea;
        padding-bottom: 0.5rem;
        margin-top: 2rem;
      }
      
      .governance-table {
        border-collapse: collapse;
        width: 100%;
        margin: 1rem 0;
      }
      
      .governance-table th,
      .governance-table td {
        border: 1px solid #ddd;
        padding: 0.75rem;
        text-align: left;
      }
      
      .governance-table th {
        background-color: #f8f9fa;
        font-weight: 600;
      }
      
      .metric-card {
        background: #f8f9fa;
        border-left: 4px solid #667eea;
        padding: 1rem;
        margin: 0.5rem 0;
      }
      
      @media print {
        .playbook-header {
          background: #667eea !important;
          -webkit-print-color-adjust: exact;
        }
      }
    `
  }

  /**
   * Get available playbook template configurations
   */
  static getAvailableTemplates(): Array<{
    key: keyof typeof PLAYBOOK_TEMPLATE_CONFIGS
    name: string
    description: string
    config: typeof PLAYBOOK_TEMPLATE_CONFIGS[keyof typeof PLAYBOOK_TEMPLATE_CONFIGS]
  }> {
    return [
      {
        key: 'programExecutive',
        name: 'ADPA Program Playbook - Executive Edition',
        description: 'High-level program playbook for executive stakeholders with basic complexity',
        config: PLAYBOOK_TEMPLATE_CONFIGS.programExecutive
      },
      {
        key: 'programTechnical',
        name: 'ADPA Program Playbook - Technical Edition',
        description: 'Detailed program playbook for technical stakeholders with standard complexity',
        config: PLAYBOOK_TEMPLATE_CONFIGS.programTechnical
      },
      {
        key: 'frameworkTechnical',
        name: 'ADPAF Framework Playbook - Technical Edition',
        description: 'Comprehensive framework playbook for technical implementation teams',
        config: PLAYBOOK_TEMPLATE_CONFIGS.frameworkTechnical
      },
      {
        key: 'operationalStandard',
        name: 'ADPA Operational Playbook - Standard Edition',
        description: 'Standard operational playbook for day-to-day ADPA operations',
        config: PLAYBOOK_TEMPLATE_CONFIGS.operationalStandard
      }
    ]
  }
}
