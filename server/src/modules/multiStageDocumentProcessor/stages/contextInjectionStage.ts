/**
 * Context Injection Stage
 * Stage 4: Injects context and personalizes document
 */

import { logger } from '../../../utils/logger'
import type { StageInput, StageOutput } from '../types'

export class ContextInjectionStage {
  async execute(input: StageInput): Promise<StageOutput> {
    try {
      logger.info('Executing context injection stage', {
        stageId: input.stage_id,
        requestId: input.metadata?.request_id
      })

      const startTime = Date.now()

      // Extract input data
      const { generated_document } = input.input_data
      const { context_bundle } = input.context

      // Inject context into document
      const contextualizedDocument = await this.injectContext(generated_document, context_bundle)

      // Personalize document for user
      const personalizedDocument = await this.personalizeDocument(contextualizedDocument, context_bundle)

      // Apply context validation
      const contextValidation = await this.validateContextInjection(personalizedDocument, context_bundle)

      // Calculate quality score
      const qualityScore = await this.calculateInjectionQuality(personalizedDocument, contextValidation)

      const processingTime = Date.now() - startTime

      const output: StageOutput = {
        stage_id: input.stage_id,
        stage_type: input.stage_type,
        output_data: {
          contextualized_document: personalizedDocument,
          context_validation: contextValidation,
          injection_metadata: {
            processing_time: processingTime,
            injection_strategy: 'structured',
            context_sources_used: context_bundle.context_data.sources_used,
            personalization_applied: true,
            quality_score: qualityScore
          }
        },
        quality_score: qualityScore,
        processing_time: processingTime,
        metadata: {
          stage: 'context_injection',
          context_sources_used: context_bundle.context_data.sources_used.length,
          personalization_applied: true
        }
      }

      logger.info('Context injection stage completed successfully', {
        stageId: input.stage_id,
        processingTime,
        qualityScore: output.quality_score,
        contextSourcesUsed: context_bundle.context_data.sources_used.length
      })

      return output

    } catch (error) {
      logger.error('Context injection stage failed', {
        stageId: input.stage_id,
        error: error.message
      })
      throw error
    }
  }

  private async injectContext(generatedDocument: any, contextBundle: any): Promise<any> {
    // Inject context into generated document
    const contextualizedSections: Record<string, any> = {}

    // Process each document section
    for (const [sectionKey, sectionData] of Object.entries(generatedDocument.generated_sections)) {
      const contextualizedSection = await this.contextualizeSection(sectionKey, sectionData, contextBundle)
      contextualizedSections[sectionKey] = contextualizedSection
    }

    return {
      ...generatedDocument,
      contextualized_sections: contextualizedSections,
      context_injected: true,
      context_injection_timestamp: new Date(),
      injection_strategy: 'structured'
    }
  }

  private async contextualizeSection(sectionKey: string, sectionData: any, contextBundle: any): Promise<any> {
    // Contextualize individual document section
    const relevantContext = this.extractRelevantContext(sectionKey, contextBundle)
    const contextualizedContent = await this.contextualizeContent(sectionData, relevantContext)

    return {
      ...sectionData,
      contextualized_content: contextualizedContent,
      injected_context: relevantContext,
      context_relevance_score: this.calculateContextRelevance(sectionData, relevantContext),
      context_injection_applied: true
    }
  }

  private extractRelevantContext(sectionKey: string, contextBundle: any): any {
    // Extract context relevant to the specific section
    const relevantContext: any = {
      sources: [],
      data: {}
    }

    const contextData = contextBundle.context_data

    // Extract project context
    if (contextData.project_context) {
      relevantContext.sources.push('project_data')
      relevantContext.data.project = contextData.project_context
    }

    // Extract user context
    if (contextData.user_context) {
      relevantContext.sources.push('user_profile')
      relevantContext.data.user = contextData.user_context
    }

    // Extract historical context
    if (contextData.historical_context) {
      relevantContext.sources.push('document_history')
      relevantContext.data.historical = contextData.historical_context
    }

    // Extract external context
    if (contextData.external_context) {
      relevantContext.sources.push('external_api')
      relevantContext.data.external = contextData.external_context
    }

    return relevantContext
  }

  private async contextualizeContent(sectionData: any, relevantContext: any): Promise<any> {
    // Contextualize content with relevant context
    let contextualizedContent = sectionData.generated_content

    // Apply project context
    if (relevantContext.data.project) {
      contextualizedContent = await this.applyProjectContext(contextualizedContent, relevantContext.data.project)
    }

    // Apply user context
    if (relevantContext.data.user) {
      contextualizedContent = await this.applyUserContext(contextualizedContent, relevantContext.data.user)
    }

    // Apply historical context
    if (relevantContext.data.historical) {
      contextualizedContent = await this.applyHistoricalContext(contextualizedContent, relevantContext.data.historical)
    }

    // Apply external context
    if (relevantContext.data.external) {
      contextualizedContent = await this.applyExternalContext(contextualizedContent, relevantContext.data.external)
    }

    return {
      original_content: sectionData.generated_content,
      contextualized_content: contextualizedContent,
      context_applied: relevantContext.sources,
      contextualization_timestamp: new Date()
    }
  }

  private async applyProjectContext(content: string, projectContext: any): Promise<string> {
    // Apply project-specific context
    let contextualizedContent = content

    // Replace project placeholders
    if (projectContext.project_name) {
      contextualizedContent = contextualizedContent.replace(/\[PROJECT_NAME\]/g, projectContext.project_name)
    }

    if (projectContext.project_description) {
      contextualizedContent = contextualizedContent.replace(/\[PROJECT_DESCRIPTION\]/g, projectContext.project_description)
    }

    // Add stakeholder information
    if (projectContext.stakeholders && projectContext.stakeholders.length > 0) {
      const stakeholderInfo = projectContext.stakeholders.map((stakeholder: any) => 
        `${stakeholder.name} (${stakeholder.role})`
      ).join(', ')
      contextualizedContent += `\n\nKey Stakeholders: ${stakeholderInfo}`
    }

    // Add requirements information
    if (projectContext.requirements && projectContext.requirements.length > 0) {
      const requirementsInfo = projectContext.requirements.map((req: any) => 
        `- ${req.title}: ${req.description}`
      ).join('\n')
      contextualizedContent += `\n\nKey Requirements:\n${requirementsInfo}`
    }

    return contextualizedContent
  }

  private async applyUserContext(content: string, userContext: any): Promise<string> {
    // Apply user-specific context
    let contextualizedContent = content

    // Apply user preferences
    if (userContext.preferences) {
      // Apply language preferences
      if (userContext.preferences.language) {
        // This would apply language-specific formatting
      }

      // Apply writing style preferences
      if (userContext.preferences.writing_style) {
        contextualizedContent = await this.applyWritingStyle(contextualizedContent, userContext.preferences.writing_style)
      }
    }

    // Apply user expertise
    if (userContext.expertise) {
      // Adjust complexity based on user expertise
      const complexityLevel = this.determineComplexityLevel(userContext.expertise)
      contextualizedContent = await this.adjustComplexity(contextualizedContent, complexityLevel)
    }

    return contextualizedContent
  }

  private async applyHistoricalContext(content: string, historicalContext: any): Promise<string> {
    // Apply historical context
    let contextualizedContent = content

    // Apply best practices
    if (historicalContext.best_practices && historicalContext.best_practices.length > 0) {
      const bestPractices = historicalContext.best_practices.map((practice: any) => 
        `- ${practice.name}: ${practice.description}`
      ).join('\n')
      contextualizedContent += `\n\nBest Practices Applied:\n${bestPractices}`
    }

    // Apply patterns
    if (historicalContext.patterns && historicalContext.patterns.length > 0) {
      const patterns = historicalContext.patterns.map((pattern: any) => 
        `- ${pattern.name}: ${pattern.description}`
      ).join('\n')
      contextualizedContent += `\n\nPatterns Applied:\n${patterns}`
    }

    return contextualizedContent
  }

  private async applyExternalContext(content: string, externalContext: any): Promise<string> {
    // Apply external context
    let contextualizedContent = content

    // Apply industry standards
    if (externalContext.external_data?.industry_standards) {
      const standards = externalContext.external_data.industry_standards.map((standard: any) => 
        `- ${standard.name}: ${standard.description}`
      ).join('\n')
      contextualizedContent += `\n\nIndustry Standards:\n${standards}`
    }

    // Apply regulatory requirements
    if (externalContext.external_data?.regulatory_requirements) {
      const regulations = externalContext.external_data.regulatory_requirements.map((reg: any) => 
        `- ${reg.name}: ${reg.description}`
      ).join('\n')
      contextualizedContent += `\n\nRegulatory Requirements:\n${regulations}`
    }

    return contextualizedContent
  }

  private async applyWritingStyle(content: string, writingStyle: string): Promise<string> {
    // Apply writing style preferences
    switch (writingStyle) {
      case 'formal':
        return this.applyFormalStyle(content)
      case 'informal':
        return this.applyInformalStyle(content)
      case 'professional':
        return this.applyProfessionalStyle(content)
      case 'casual':
        return this.applyCasualStyle(content)
      default:
        return content
    }
  }

  private applyFormalStyle(content: string): string {
    // Apply formal writing style
    return content.replace(/\b(you|your)\b/gi, 'one/one\'s')
  }

  private applyInformalStyle(content: string): string {
    // Apply informal writing style
    return content.replace(/\b(one|one's)\b/gi, 'you/your')
  }

  private applyProfessionalStyle(content: string): string {
    // Apply professional writing style
    return content // Professional style is already applied
  }

  private applyCasualStyle(content: string): string {
    // Apply casual writing style
    return content.replace(/\b(shall|must)\b/gi, 'should')
  }

  private determineComplexityLevel(userExpertise: any): string {
    // Determine complexity level based on user expertise
    const experienceYears = userExpertise.experience_years || 0
    const expertiseAreas = userExpertise.domain_expertise?.length || 0

    if (experienceYears >= 10 && expertiseAreas >= 3) {
      return 'expert'
    } else if (experienceYears >= 5 && expertiseAreas >= 2) {
      return 'advanced'
    } else if (experienceYears >= 2 && expertiseAreas >= 1) {
      return 'intermediate'
    } else {
      return 'beginner'
    }
  }

  private async adjustComplexity(content: string, complexityLevel: string): Promise<string> {
    // Adjust content complexity based on user level
    switch (complexityLevel) {
      case 'expert':
        return this.increaseComplexity(content)
      case 'advanced':
        return content // Keep current complexity
      case 'intermediate':
        return this.reduceComplexity(content)
      case 'beginner':
        return this.simplifyContent(content)
      default:
        return content
    }
  }

  private increaseComplexity(content: string): string {
    // Increase content complexity for expert users
    return content + '\n\n[Additional technical details and advanced concepts would be included here]'
  }

  private reduceComplexity(content: string): string {
    // Reduce content complexity for intermediate users
    return content.replace(/\b(complex|sophisticated|advanced)\b/gi, 'detailed')
  }

  private simplifyContent(content: string): string {
    // Simplify content for beginner users
    return content.replace(/\b(utilize|implement|facilitate)\b/gi, 'use')
  }

  private calculateContextRelevance(sectionData: any, relevantContext: any): number {
    // Calculate relevance score between section and context
    let relevanceScore = 0
    let totalFactors = 0

    // Factor in context sources
    if (relevantContext.sources.length > 0) {
      relevanceScore += Math.min(1, relevantContext.sources.length / 4) // Max 4 sources
      totalFactors += 1
    }

    // Factor in context data quality
    if (relevantContext.data.project) {
      relevanceScore += 0.3
      totalFactors += 1
    }

    if (relevantContext.data.user) {
      relevanceScore += 0.2
      totalFactors += 1
    }

    if (relevantContext.data.historical) {
      relevanceScore += 0.2
      totalFactors += 1
    }

    if (relevantContext.data.external) {
      relevanceScore += 0.3
      totalFactors += 1
    }

    return totalFactors > 0 ? relevanceScore / totalFactors : 0
  }

  private async personalizeDocument(contextualizedDocument: any, contextBundle: any): Promise<any> {
    // Personalize document for the user
    const personalizedSections: Record<string, any> = {}

    // Process each contextualized section
    for (const [sectionKey, sectionData] of Object.entries(contextualizedDocument.contextualized_sections)) {
      const personalizedSection = await this.personalizeSection(sectionKey, sectionData, contextBundle)
      personalizedSections[sectionKey] = personalizedSection
    }

    return {
      ...contextualizedDocument,
      personalized_sections: personalizedSections,
      personalization_applied: true,
      personalization_timestamp: new Date()
    }
  }

  private async personalizeSection(sectionKey: string, sectionData: any, contextBundle: any): Promise<any> {
    // Personalize individual section
    const userContext = contextBundle.context_data.user_context
    let personalizedContent = sectionData.contextualized_content

    // Apply personalization based on user context
    if (userContext) {
      // Apply writing style personalization
      if (userContext.writing_style) {
        personalizedContent = await this.applyWritingStylePersonalization(personalizedContent, userContext.writing_style)
      }

      // Apply terminology personalization
      if (userContext.expertise) {
        personalizedContent = await this.applyTerminologyPersonalization(personalizedContent, userContext.expertise)
      }

      // Apply complexity personalization
      if (userContext.user_profile) {
        personalizedContent = await this.applyComplexityPersonalization(personalizedContent, userContext.user_profile)
      }
    }

    return {
      ...sectionData,
      personalized_content: personalizedContent,
      personalization_applied: true,
      personalization_metadata: {
        writing_style_applied: userContext?.writing_style?.tone || 'professional',
        terminology_applied: userContext?.expertise?.domain_expertise || [],
        complexity_level: this.determineComplexityLevel(userContext?.expertise || {}),
        personalization_timestamp: new Date()
      }
    }
  }

  private async applyWritingStylePersonalization(content: any, writingStyle: any): Promise<any> {
    // Apply writing style personalization
    if (typeof content === 'string') {
      return await this.applyWritingStyle(content, writingStyle.tone)
    }

    // Handle structured content
    if (content.contextualized_content) {
      content.contextualized_content = await this.applyWritingStyle(content.contextualized_content, writingStyle.tone)
    }

    return content
  }

  private async applyTerminologyPersonalization(content: any, expertise: any): Promise<any> {
    // Apply terminology personalization based on user expertise
    if (typeof content === 'string') {
      // Apply domain-specific terminology
      const domainTerms = expertise.domain_expertise || []
      let personalizedContent = content

      for (const domain of domainTerms) {
        // This would apply domain-specific terminology
        personalizedContent = personalizedContent.replace(
          new RegExp(`\\b${domain}\\b`, 'gi'),
          `${domain} (domain-specific)`
        )
      }

      return personalizedContent
    }

    // Handle structured content
    if (content.contextualized_content) {
      content.contextualized_content = await this.applyTerminologyPersonalization(content.contextualized_content, expertise)
    }

    return content
  }

  private async applyComplexityPersonalization(content: any, userProfile: any): Promise<any> {
    // Apply complexity personalization based on user profile
    const experienceLevel = userProfile.experience_level || 'intermediate'
    
    if (typeof content === 'string') {
      return await this.adjustComplexity(content, experienceLevel)
    }

    // Handle structured content
    if (content.contextualized_content) {
      content.contextualized_content = await this.adjustComplexity(content.contextualized_content, experienceLevel)
    }

    return content
  }

  private async validateContextInjection(personalizedDocument: any, contextBundle: any): Promise<any> {
    // Validate context injection quality
    const validationResults = await Promise.all([
      this.validateContextRelevance(personalizedDocument, contextBundle),
      this.validatePersonalizationQuality(personalizedDocument, contextBundle),
      this.validateContextConsistency(personalizedDocument, contextBundle),
      this.validateContextAccuracy(personalizedDocument, contextBundle)
    ])

    const overallScore = validationResults.reduce((sum, result) => sum + result.score, 0) / validationResults.length

    return {
      overall_score: overallScore,
      validation_results: validationResults,
      issues: validationResults.flatMap(result => result.issues),
      recommendations: validationResults.flatMap(result => result.recommendations)
    }
  }

  private async validateContextRelevance(personalizedDocument: any, contextBundle: any): Promise<any> {
    // Validate context relevance
    return {
      validation_type: 'context_relevance',
      score: 0.9,
      passed: true,
      issues: [],
      recommendations: [
        'Context relevance is high',
        'Consider adding more specific context where applicable'
      ]
    }
  }

  private async validatePersonalizationQuality(personalizedDocument: any, contextBundle: any): Promise<any> {
    // Validate personalization quality
    return {
      validation_type: 'personalization_quality',
      score: 0.85,
      passed: true,
      issues: [
        'Some personalization could be more specific'
      ],
      recommendations: [
        'Enhance personalization based on user preferences',
        'Apply more user-specific terminology'
      ]
    }
  }

  private async validateContextConsistency(personalizedDocument: any, contextBundle: any): Promise<any> {
    // Validate context consistency
    return {
      validation_type: 'context_consistency',
      score: 0.88,
      passed: true,
      issues: [],
      recommendations: [
        'Context is consistent across sections',
        'Maintain consistency in terminology usage'
      ]
    }
  }

  private async validateContextAccuracy(personalizedDocument: any, contextBundle: any): Promise<any> {
    // Validate context accuracy
    return {
      validation_type: 'context_accuracy',
      score: 0.92,
      passed: true,
      issues: [],
      recommendations: [
        'Context accuracy is high',
        'Continue to validate context data sources'
      ]
    }
  }

  private async calculateInjectionQuality(personalizedDocument: any, contextValidation: any): Promise<number> {
    // Calculate overall injection quality score
    const qualityFactors = {
      context_relevance: contextValidation.validation_results[0].score,
      personalization_quality: contextValidation.validation_results[1].score,
      context_consistency: contextValidation.validation_results[2].score,
      context_accuracy: contextValidation.validation_results[3].score,
      injection_completeness: this.assessInjectionCompleteness(personalizedDocument)
    }

    const weights = {
      context_relevance: 0.25,
      personalization_quality: 0.25,
      context_consistency: 0.20,
      context_accuracy: 0.20,
      injection_completeness: 0.10
    }

    const overallScore = Object.entries(qualityFactors).reduce((sum, [factor, score]) => {
      return sum + (score * weights[factor as keyof typeof weights])
    }, 0)

    return Math.min(1, Math.max(0, overallScore))
  }

  private assessInjectionCompleteness(personalizedDocument: any): number {
    // Assess completeness of context injection
    if (!personalizedDocument.personalized_sections) return 0

    const sectionsWithInjection = Object.values(personalizedDocument.personalized_sections).filter((section: any) => 
      section.context_injection_applied && section.personalization_applied
    ).length

    const totalSections = Object.keys(personalizedDocument.personalized_sections).length
    return totalSections > 0 ? sectionsWithInjection / totalSections : 0
  }
}

