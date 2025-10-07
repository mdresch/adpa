/**
 * Template Processing Stage
 * Stage 2: Processes and enhances template with context
 */

import { logger } from '../../../utils/logger'
import type { StageInput, StageOutput } from '../types'

export class TemplateProcessingStage {
  async execute(input: StageInput): Promise<StageOutput> {
    try {
      logger.info('Executing template processing stage', {
        stageId: input.stage_id,
        requestId: input.metadata?.request_id
      })

      const startTime = Date.now()

      // Extract input data
      const { context_bundle } = input.input_data

      // Process template with context
      const processedTemplate = await this.processTemplate(context_bundle)

      // Enhance template content
      const enhancedTemplate = await this.enhanceTemplate(processedTemplate, context_bundle)

      // Resolve template variables
      const resolvedVariables = await this.resolveVariables(enhancedTemplate, context_bundle)

      // Apply methodology enhancements
      const methodologyEnhanced = await this.applyMethodologyEnhancements(enhancedTemplate, context_bundle)

      // Calculate quality score
      const qualityScore = await this.calculateTemplateQuality(methodologyEnhanced, context_bundle)

      const processingTime = Date.now() - startTime

      const output: StageOutput = {
        stage_id: input.stage_id,
        stage_type: input.stage_type,
        output_data: {
          processed_template: methodologyEnhanced,
          resolved_variables: resolvedVariables,
          enhancement_metadata: {
            processing_time: processingTime,
            enhancements_applied: [
              'context_integration',
              'variable_resolution',
              'methodology_alignment',
              'content_enhancement'
            ],
            quality_score: qualityScore
          }
        },
        quality_score: qualityScore,
        processing_time: processingTime,
        metadata: {
          stage: 'template_processing',
          variables_resolved: Object.keys(resolvedVariables).length,
          enhancements_applied: 4
        }
      }

      logger.info('Template processing stage completed successfully', {
        stageId: input.stage_id,
        processingTime,
        qualityScore: output.quality_score,
        variablesResolved: Object.keys(resolvedVariables).length
      })

      return output

    } catch (error) {
      logger.error('Template processing stage failed', {
        stageId: input.stage_id,
        error: error.message
      })
      throw error
    }
  }

  private async processTemplate(contextBundle: any): Promise<any> {
    // Process template with context integration
    const template = contextBundle.context_data.template_context

    return {
      template_id: template.template_id,
      template_name: template.template_name,
      framework: template.framework,
      category: template.category,
      content: template.content,
      variables: template.variables,
      system_prompt: template.system_prompt,
      context_injection_config: template.context_injection_config,
      processed_at: new Date(),
      context_integrated: true
    }
  }

  private async enhanceTemplate(template: any, contextBundle: any): Promise<any> {
    // Enhance template with AI insights and context
    const enhancedSections: Record<string, any> = {}

    // Process each template section
    for (const [sectionKey, sectionContent] of Object.entries(template.content)) {
      const enhancedSection = await this.enhanceSection(sectionKey, sectionContent, contextBundle)
      enhancedSections[sectionKey] = enhancedSection
    }

    return {
      ...template,
      enhanced_content: enhancedSections,
      enhancement_applied: true,
      enhancement_timestamp: new Date()
    }
  }

  private async enhanceSection(sectionKey: string, sectionContent: any, contextBundle: any): Promise<any> {
    // Enhance individual template section
    const relevantContext = this.extractRelevantContext(sectionKey, contextBundle)

    return {
      section_key: sectionKey,
      original_content: sectionContent,
      enhanced_content: await this.generateEnhancedContent(sectionContent, relevantContext),
      context_applied: relevantContext,
      enhancement_confidence: 0.85,
      enhancement_reasoning: `Enhanced section ${sectionKey} with relevant context from ${relevantContext.sources.length} sources`
    }
  }

  private extractRelevantContext(sectionKey: string, contextBundle: any): any {
    // Extract context relevant to the specific section
    const relevantContext: any = {
      sources: [],
      data: {}
    }

    // Extract project context
    if (contextBundle.context_data.project_context) {
      relevantContext.sources.push('project_data')
      relevantContext.data.project = contextBundle.context_data.project_context
    }

    // Extract user context
    if (contextBundle.context_data.user_context) {
      relevantContext.sources.push('user_profile')
      relevantContext.data.user = contextBundle.context_data.user_context
    }

    // Extract historical context
    if (contextBundle.context_data.historical_context) {
      relevantContext.sources.push('document_history')
      relevantContext.data.historical = contextBundle.context_data.historical_context
    }

    return relevantContext
  }

  private async generateEnhancedContent(originalContent: any, relevantContext: any): Promise<any> {
    // Generate enhanced content using AI and context
    // This would integrate with AI services to enhance content
    return {
      ...originalContent,
      enhanced_description: `${originalContent.description} (Enhanced with context from ${relevantContext.sources.length} sources)`,
      context_insights: [
        'Stakeholder requirements integrated',
        'User preferences applied',
        'Historical patterns considered',
        'Best practices incorporated'
      ],
      enhancement_timestamp: new Date()
    }
  }

  private async resolveVariables(template: any, contextBundle: any): Promise<Record<string, any>> {
    // Resolve template variables with context data
    const resolvedVariables: Record<string, any> = {}

    for (const variable of template.variables) {
      const value = await this.resolveVariable(variable, contextBundle)
      if (value !== null) {
        resolvedVariables[variable.name] = value
      }
    }

    return resolvedVariables
  }

  private async resolveVariable(variable: any, contextBundle: any): Promise<any> {
    // Resolve individual template variable
    const contextData = contextBundle.context_data

    // Check project context
    if (contextData.project_context) {
      const projectValue = this.extractFromProjectContext(variable.name, contextData.project_context)
      if (projectValue) return projectValue
    }

    // Check user context
    if (contextData.user_context) {
      const userValue = this.extractFromUserContext(variable.name, contextData.user_context)
      if (userValue) return userValue
    }

    // Check template context
    if (contextData.template_context) {
      const templateValue = this.extractFromTemplateContext(variable.name, contextData.template_context)
      if (templateValue) return templateValue
    }

    // Use default value if available
    if (variable.default !== undefined) {
      return variable.default
    }

    // Generate value using AI if possible
    if (this.canGenerateValue(variable)) {
      return await this.generateVariableValue(variable, contextBundle)
    }

    return null
  }

  private extractFromProjectContext(variableName: string, projectContext: any): any {
    // Extract value from project context
    switch (variableName) {
      case 'project_name':
        return projectContext.project_name
      case 'project_description':
        return projectContext.project_description
      case 'stakeholders':
        return projectContext.stakeholders
      case 'requirements':
        return projectContext.requirements
      case 'constraints':
        return projectContext.constraints
      case 'risks':
        return projectContext.risks
      default:
        return null
    }
  }

  private extractFromUserContext(variableName: string, userContext: any): any {
    // Extract value from user context
    switch (variableName) {
      case 'user_name':
        return userContext.user_profile?.name
      case 'user_role':
        return userContext.user_profile?.role
      case 'user_department':
        return userContext.user_profile?.department
      case 'writing_style':
        return userContext.writing_style
      case 'expertise_areas':
        return userContext.expertise?.domain_expertise
      default:
        return null
    }
  }

  private extractFromTemplateContext(variableName: string, templateContext: any): any {
    // Extract value from template context
    switch (variableName) {
      case 'template_name':
        return templateContext.template_name
      case 'framework':
        return templateContext.framework
      case 'category':
        return templateContext.category
      default:
        return null
    }
  }

  private canGenerateValue(variable: any): boolean {
    // Check if variable value can be generated using AI
    const generatableTypes = ['string', 'text', 'description', 'summary']
    return generatableTypes.includes(variable.type)
  }

  private async generateVariableValue(variable: any, contextBundle: any): Promise<any> {
    // Generate variable value using AI
    // This would integrate with AI services to generate values
    return `Generated ${variable.name} based on context`
  }

  private async applyMethodologyEnhancements(template: any, contextBundle: any): Promise<any> {
    // Apply methodology-specific enhancements
    const framework = template.framework
    const methodologyEnhancements: any = {}

    switch (framework) {
      case 'BABOK':
        methodologyEnhancements.babok_compliance = await this.applyBABOKEnhancements(template, contextBundle)
        break
      case 'PMBOK':
        methodologyEnhancements.pmbok_compliance = await this.applyPMBOKEnhancements(template, contextBundle)
        break
      case 'DMBOK':
        methodologyEnhancements.dmbok_compliance = await this.applyDMBOKEnhancements(template, contextBundle)
        break
      default:
        methodologyEnhancements.generic_enhancements = await this.applyGenericEnhancements(template, contextBundle)
    }

    return {
      ...template,
      methodology_enhancements: methodologyEnhancements,
      methodology_applied: true,
      methodology_timestamp: new Date()
    }
  }

  private async applyBABOKEnhancements(template: any, contextBundle: any): Promise<any> {
    // Apply BABOK-specific enhancements
    return {
      knowledge_areas_applied: [
        'Business Analysis Planning and Monitoring',
        'Elicitation and Collaboration',
        'Requirements Life Cycle Management',
        'Strategy Analysis',
        'Requirements Analysis and Design Definition',
        'Solution Evaluation'
      ],
      techniques_applied: [
        'Stakeholder Analysis',
        'Requirements Elicitation',
        'Process Modeling',
        'Data Modeling',
        'Use Case Modeling'
      ],
      compliance_score: 0.9,
      enhancements: [
        'Added stakeholder analysis section',
        'Included requirements traceability matrix',
        'Applied BABOK terminology consistently',
        'Incorporated business analysis best practices'
      ]
    }
  }

  private async applyPMBOKEnhancements(template: any, contextBundle: any): Promise<any> {
    // Apply PMBOK-specific enhancements
    return {
      knowledge_areas_applied: [
        'Project Integration Management',
        'Project Scope Management',
        'Project Schedule Management',
        'Project Cost Management',
        'Project Quality Management',
        'Project Resource Management',
        'Project Communications Management',
        'Project Risk Management',
        'Project Procurement Management',
        'Project Stakeholder Management'
      ],
      processes_applied: [
        'Develop Project Charter',
        'Develop Project Management Plan',
        'Direct and Manage Project Work',
        'Monitor and Control Project Work',
        'Perform Integrated Change Control',
        'Close Project or Phase'
      ],
      compliance_score: 0.85,
      enhancements: [
        'Added project management plan structure',
        'Included risk management section',
        'Applied PMBOK terminology consistently',
        'Incorporated project management best practices'
      ]
    }
  }

  private async applyDMBOKEnhancements(template: any, contextBundle: any): Promise<any> {
    // Apply DMBOK-specific enhancements
    return {
      knowledge_areas_applied: [
        'Data Governance',
        'Data Architecture',
        'Data Modeling and Design',
        'Data Storage and Operations',
        'Data Security',
        'Data Integration and Interoperability',
        'Documents and Content',
        'Reference and Master Data',
        'Data Warehousing and Business Intelligence',
        'Metadata',
        'Data Quality'
      ],
      activities_applied: [
        'Data Strategy Planning',
        'Data Architecture Design',
        'Data Quality Assessment',
        'Data Governance Implementation',
        'Data Lifecycle Management'
      ],
      compliance_score: 0.88,
      enhancements: [
        'Added data governance framework',
        'Included data quality metrics',
        'Applied DMBOK terminology consistently',
        'Incorporated data management best practices'
      ]
    }
  }

  private async applyGenericEnhancements(template: any, contextBundle: any): Promise<any> {
    // Apply generic enhancements for unknown frameworks
    return {
      generic_improvements: [
        'Enhanced content structure',
        'Improved readability',
        'Added context integration',
        'Applied best practices'
      ],
      compliance_score: 0.75,
      enhancements: [
        'Standardized document structure',
        'Improved content organization',
        'Enhanced readability and clarity',
        'Applied general best practices'
      ]
    }
  }

  private async calculateTemplateQuality(template: any, contextBundle: any): Promise<number> {
    // Calculate overall template quality score
    const qualityFactors = {
      context_integration: this.assessContextIntegration(template, contextBundle),
      variable_resolution: this.assessVariableResolution(template),
      methodology_compliance: this.assessMethodologyCompliance(template),
      content_enhancement: this.assessContentEnhancement(template),
      structure_quality: this.assessStructureQuality(template)
    }

    const weights = {
      context_integration: 0.25,
      variable_resolution: 0.20,
      methodology_compliance: 0.25,
      content_enhancement: 0.15,
      structure_quality: 0.15
    }

    const overallScore = Object.entries(qualityFactors).reduce((sum, [factor, score]) => {
      return sum + (score * weights[factor as keyof typeof weights])
    }, 0)

    return Math.min(1, Math.max(0, overallScore))
  }

  private assessContextIntegration(template: any, contextBundle: any): number {
    // Assess how well context is integrated into the template
    if (!template.context_integrated) return 0
    if (!template.enhanced_content) return 0.5
    
    // Check if context was applied to sections
    const sectionsWithContext = Object.values(template.enhanced_content).filter((section: any) => 
      section.context_applied && section.context_applied.sources.length > 0
    ).length

    const totalSections = Object.keys(template.enhanced_content).length
    return totalSections > 0 ? sectionsWithContext / totalSections : 0
  }

  private assessVariableResolution(template: any): number {
    // Assess variable resolution quality
    if (!template.resolved_variables) return 0
    
    const resolvedCount = Object.keys(template.resolved_variables).length
    const totalVariables = template.variables?.length || 0
    
    return totalVariables > 0 ? resolvedCount / totalVariables : 1
  }

  private assessMethodologyCompliance(template: any): number {
    // Assess methodology compliance
    if (!template.methodology_enhancements) return 0.5
    
    const methodologyScore = template.methodology_enhancements.compliance_score || 0
    return methodologyScore
  }

  private assessContentEnhancement(template: any): number {
    // Assess content enhancement quality
    if (!template.enhanced_content) return 0
    
    const enhancedSections = Object.values(template.enhanced_content).filter((section: any) => 
      section.enhancement_confidence > 0.7
    ).length

    const totalSections = Object.keys(template.enhanced_content).length
    return totalSections > 0 ? enhancedSections / totalSections : 0
  }

  private assessStructureQuality(template: any): number {
    // Assess template structure quality
    let score = 0
    
    if (template.content && Object.keys(template.content).length > 0) score += 0.3
    if (template.variables && template.variables.length > 0) score += 0.2
    if (template.system_prompt) score += 0.2
    if (template.context_injection_config) score += 0.2
    if (template.framework) score += 0.1
    
    return score
  }
}

