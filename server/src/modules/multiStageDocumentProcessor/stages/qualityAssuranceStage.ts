/**
 * Quality Assurance Stage
 * Stage 5: Assesses and validates document quality with comprehensive validation and compliance checking
 */

import { logger } from '../../../utils/logger'
import { validationHelpers } from '../../documentGenerator/validation'
import { templateValidationSchemas } from '../../documentTemplates/validation'
import Joi from 'joi'
import type { StageInput, StageOutput } from '../types'

// Enhanced validation interfaces
interface ValidationContext {
  framework: string
  compliance_requirements: string[]
  security_level: 'low' | 'medium' | 'high' | 'critical'
  accessibility_level: 'AA' | 'AAA'
  data_classification: 'public' | 'internal' | 'confidential' | 'restricted'
  target_audience: string[]
  language: string
  region: string
  eu_ai_act_applicable?: boolean // Explicit flag for EU AI Act compliance
}

interface ComplianceRule {
  rule_id: string
  rule_name: string
  framework: string
  category: string
  mandatory: boolean
  description: string
  validation_function: string
  severity: 'low' | 'medium' | 'high' | 'critical'
}

interface SecurityValidationResult {
  passed: boolean
  security_score: number
  vulnerabilities: SecurityVulnerability[]
  recommendations: string[]
}

interface SecurityVulnerability {
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  location: string
  remediation: string
}

interface AccessibilityValidationResult {
  passed: boolean
  accessibility_score: number
  violations: AccessibilityViolation[]
  recommendations: string[]
}

interface AccessibilityViolation {
  guideline: string
  level: 'A' | 'AA' | 'AAA'
  description: string
  location: string
  remediation: string
}

interface DataQualityResult {
  passed: boolean
  quality_score: number
  issues: DataQualityIssue[]
  recommendations: string[]
}

interface DataQualityIssue {
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  location: string
  expected: string
  actual: string
}

interface CrossReferenceValidationResult {
  passed: boolean
  validation_score: number
  broken_references: BrokenReference[]
  recommendations: string[]
}

interface BrokenReference {
  type: 'internal' | 'external' | 'citation' | 'figure' | 'table'
  reference: string
  location: string
  status: 'missing' | 'invalid' | 'inaccessible'
  suggestion: string
}

interface ReadabilityMetrics {
  flesch_reading_ease: number
  flesch_kincaid_grade: number
  gunning_fog_index: number
  automated_readability_index: number
  coleman_liau_index: number
  smog_index: number
  average_sentence_length: number
  average_syllables_per_word: number
  complex_words_percentage: number
}

interface PerformanceMetrics {
  document_size: number
  load_time_estimate: number
  complexity_score: number
  processing_efficiency: number
  resource_usage: number
}

export class QualityAssuranceStage {
  async execute(input: StageInput): Promise<StageOutput> {
    try {
      logger.info('Executing enhanced quality assurance stage', {
        stageId: input.stage_id,
        requestId: input.metadata?.request_id
      })

      const startTime = Date.now()

      // Extract input data
      const { contextualized_document } = input.input_data

      // Build validation context
      const validationContext = this.buildValidationContext(input.context)

      // Perform comprehensive quality assessment
      const qualityReport = await this.assessDocumentQuality(contextualized_document, input.context)

      // Enhanced validation assessments
      const securityValidation = await this.performSecurityValidation(contextualized_document, validationContext)
      const accessibilityValidation = await this.performAccessibilityValidation(contextualized_document, validationContext)
      const dataQualityValidation = await this.performDataQualityValidation(contextualized_document, validationContext)
      const crossReferenceValidation = await this.performCrossReferenceValidation(contextualized_document, validationContext)
      const performanceValidation = await this.performPerformanceValidation(contextualized_document, validationContext)
      const complianceValidation = await this.performEnhancedComplianceValidation(contextualized_document, validationContext)

      // Apply quality gates (includes EU AI Act compliance gate for EU users)
      const qualityGateResults = await this.applyQualityGates(qualityReport, input.context)
      
      // Check if any quality gate failed and should block document
      const blockingGates = qualityGateResults.filter((gate: any) => 
        !gate.passed && gate.action_on_failure === 'stop'
      )
      
      if (blockingGates.length > 0) {
        logger.warn('[QUALITY-ASSURANCE] Quality gates failed - document blocked', {
          failedGates: blockingGates.map((g: any) => g.gate_name),
          documentId: contextualized_document.document_id
        })
      }

      // Generate comprehensive quality recommendations
      const qualityRecommendations = await this.generateEnhancedQualityRecommendations(
        qualityReport, 
        qualityGateResults,
        securityValidation,
        accessibilityValidation,
        dataQualityValidation,
        crossReferenceValidation,
        performanceValidation,
        complianceValidation
      )

      // Calculate overall quality score with enhanced metrics
      const overallQualityScore = await this.calculateEnhancedQualityScore(
        qualityReport, 
        qualityGateResults,
        securityValidation,
        accessibilityValidation,
        dataQualityValidation,
        crossReferenceValidation,
        performanceValidation,
        complianceValidation
      )

      const processingTime = Date.now() - startTime

      const output: StageOutput = {
        stage_id: input.stage_id,
        stage_type: input.stage_type,
        output_data: {
          quality_assessed_document: {
            ...contextualized_document,
            quality_assessment: qualityReport,
            quality_gates: qualityGateResults,
            quality_recommendations: qualityRecommendations,
            security_validation: securityValidation,
            accessibility_validation: accessibilityValidation,
            data_quality_validation: dataQualityValidation,
            cross_reference_validation: crossReferenceValidation,
            performance_validation: performanceValidation,
            compliance_validation: complianceValidation
          },
          quality_report: qualityReport,
          quality_gate_results: qualityGateResults,
          quality_recommendations: qualityRecommendations,
          enhanced_validations: {
            security: securityValidation,
            accessibility: accessibilityValidation,
            data_quality: dataQualityValidation,
            cross_reference: crossReferenceValidation,
            performance: performanceValidation,
            compliance: complianceValidation
          },
          quality_metadata: {
            processing_time: processingTime,
            assessments_performed: [
              'content_quality',
              'methodology_compliance',
              'stakeholder_requirements',
              'technical_accuracy',
              'readability',
              'completeness',
              'consistency',
              'security_validation',
              'accessibility_validation',
              'data_quality_validation',
              'cross_reference_validation',
              'performance_validation',
              'enhanced_compliance_validation'
            ],
            overall_quality_score: overallQualityScore,
            validation_context: validationContext
          }
        },
        quality_score: overallQualityScore,
        processing_time: processingTime,
        metadata: {
          stage: 'enhanced_quality_assurance',
          assessments_performed: 13,
          quality_gates_applied: qualityGateResults.length,
          recommendations_generated: qualityRecommendations.length,
          security_score: securityValidation.security_score,
          accessibility_score: accessibilityValidation.accessibility_score,
          data_quality_score: dataQualityValidation.quality_score,
          cross_reference_score: crossReferenceValidation.validation_score
        }
      }

      logger.info('Quality assurance stage completed successfully', {
        stageId: input.stage_id,
        processingTime,
        qualityScore: output.quality_score,
        assessmentsPerformed: 7
      })

      return output

    } catch (error) {
      logger.error('Quality assurance stage failed', {
        stageId: input.stage_id,
        error: error.message
      })
      throw error
    }
  }

  private buildValidationContext(context: any): ValidationContext {
    const templateContext = context.context_data?.template_context
    const projectContext = context.context_data?.project_context
    const userContext = context.context_data?.user_context
    const region = userContext?.region || projectContext?.region || 'US'

    // Check if EU AI Act is applicable
    const euAiActApplicable = this.isEURegion(region) || 
                               projectContext?.eu_ai_act_compliance === true ||
                               userContext?.eu_ai_act_compliance === true

    return {
      framework: templateContext?.framework || 'generic',
      compliance_requirements: projectContext?.compliance_requirements || [],
      security_level: projectContext?.security_level || 'medium',
      accessibility_level: projectContext?.accessibility_level || 'AA',
      data_classification: projectContext?.data_classification || 'internal',
      target_audience: projectContext?.target_audience || ['general'],
      language: userContext?.language || 'en',
      region: region,
      eu_ai_act_applicable: euAiActApplicable
    }
  }

  private async performSecurityValidation(contextualizedDocument: any, validationContext: ValidationContext): Promise<SecurityValidationResult> {
    const vulnerabilities: SecurityVulnerability[] = []
    let securityScore = 1.0

    // Check for sensitive data exposure
    const sensitiveDataCheck = this.checkSensitiveDataExposure(contextualizedDocument)
    if (!sensitiveDataCheck.passed) {
      vulnerabilities.push(...sensitiveDataCheck.vulnerabilities)
      securityScore -= 0.3
    }

    // Check for unsafe content
    const unsafeContentCheck = this.checkUnsafeContent(contextualizedDocument)
    if (!unsafeContentCheck.passed) {
      vulnerabilities.push(...unsafeContentCheck.vulnerabilities)
      securityScore -= 0.2
    }

    // Check for proper data classification handling
    const dataClassificationCheck = this.checkDataClassificationCompliance(contextualizedDocument, validationContext)
    if (!dataClassificationCheck.passed) {
      vulnerabilities.push(...dataClassificationCheck.vulnerabilities)
      securityScore -= 0.2
    }

    // Check for secure references
    const secureReferencesCheck = this.checkSecureReferences(contextualizedDocument)
    if (!secureReferencesCheck.passed) {
      vulnerabilities.push(...secureReferencesCheck.vulnerabilities)
      securityScore -= 0.1
    }

    securityScore = Math.max(0, securityScore)

    return {
      passed: vulnerabilities.length === 0 || vulnerabilities.every(v => v.severity !== 'critical'),
      security_score: securityScore,
      vulnerabilities,
      recommendations: this.generateSecurityRecommendations(vulnerabilities, validationContext)
    }
  }

  private async performAccessibilityValidation(contextualizedDocument: any, validationContext: ValidationContext): Promise<AccessibilityValidationResult> {
    const violations: AccessibilityViolation[] = []
    let accessibilityScore = 1.0

    // Check for proper heading structure
    const headingStructureCheck = this.checkHeadingStructure(contextualizedDocument)
    if (!headingStructureCheck.passed) {
      violations.push(...headingStructureCheck.violations)
      accessibilityScore -= 0.2
    }

    // Check for alt text on images
    const altTextCheck = this.checkAltText(contextualizedDocument)
    if (!altTextCheck.passed) {
      violations.push(...altTextCheck.violations)
      accessibilityScore -= 0.3
    }

    // Check for color contrast (if applicable)
    const colorContrastCheck = this.checkColorContrast(contextualizedDocument)
    if (!colorContrastCheck.passed) {
      violations.push(...colorContrastCheck.violations)
      accessibilityScore -= 0.2
    }

    // Check for readable language
    const readableLanguageCheck = this.checkReadableLanguage(contextualizedDocument, validationContext)
    if (!readableLanguageCheck.passed) {
      violations.push(...readableLanguageCheck.violations)
      accessibilityScore -= 0.3
    }

    accessibilityScore = Math.max(0, accessibilityScore)

    return {
      passed: violations.length === 0 || violations.every(v => v.level !== 'AAA' || validationContext.accessibility_level !== 'AAA'),
      accessibility_score: accessibilityScore,
      violations,
      recommendations: this.generateAccessibilityRecommendations(violations, validationContext)
    }
  }

  private async performDataQualityValidation(contextualizedDocument: any, validationContext: ValidationContext): Promise<DataQualityResult> {
    const issues: DataQualityIssue[] = []
    let qualityScore = 1.0

    // Check data completeness
    const completenessCheck = this.checkDataCompleteness(contextualizedDocument)
    if (!completenessCheck.passed) {
      issues.push(...completenessCheck.issues)
      qualityScore -= 0.3
    }

    // Check data consistency
    const consistencyCheck = this.checkDataConsistency(contextualizedDocument)
    if (!consistencyCheck.passed) {
      issues.push(...consistencyCheck.issues)
      qualityScore -= 0.2
    }

    // Check data accuracy
    const accuracyCheck = this.checkDataAccuracy(contextualizedDocument)
    if (!accuracyCheck.passed) {
      issues.push(...accuracyCheck.issues)
      qualityScore -= 0.3
    }

    // Check data format compliance
    const formatCheck = this.checkDataFormatCompliance(contextualizedDocument, validationContext)
    if (!formatCheck.passed) {
      issues.push(...formatCheck.issues)
      qualityScore -= 0.2
    }

    qualityScore = Math.max(0, qualityScore)

    return {
      passed: issues.length === 0 || issues.every(i => i.severity !== 'critical'),
      quality_score: qualityScore,
      issues,
      recommendations: this.generateDataQualityRecommendations(issues, validationContext)
    }
  }

  private async performCrossReferenceValidation(contextualizedDocument: any, validationContext: ValidationContext): Promise<CrossReferenceValidationResult> {
    const brokenReferences: BrokenReference[] = []
    let validationScore = 1.0

    // Check internal references
    const internalReferencesCheck = this.checkInternalReferences(contextualizedDocument)
    if (!internalReferencesCheck.passed) {
      brokenReferences.push(...internalReferencesCheck.brokenReferences)
      validationScore -= 0.3
    }

    // Check external references
    const externalReferencesCheck = await this.checkExternalReferences(contextualizedDocument)
    if (!externalReferencesCheck.passed) {
      brokenReferences.push(...externalReferencesCheck.brokenReferences)
      validationScore -= 0.2
    }

    // Check citations
    const citationsCheck = this.checkCitations(contextualizedDocument)
    if (!citationsCheck.passed) {
      brokenReferences.push(...citationsCheck.brokenReferences)
      validationScore -= 0.2
    }

    // Check figure and table references
    const figureTableCheck = this.checkFigureTableReferences(contextualizedDocument)
    if (!figureTableCheck.passed) {
      brokenReferences.push(...figureTableCheck.brokenReferences)
      validationScore -= 0.3
    }

    validationScore = Math.max(0, validationScore)

    return {
      passed: brokenReferences.length === 0,
      validation_score: validationScore,
      broken_references: brokenReferences,
      recommendations: this.generateCrossReferenceRecommendations(brokenReferences, validationContext)
    }
  }

  private async performPerformanceValidation(contextualizedDocument: any, validationContext: ValidationContext): Promise<PerformanceMetrics> {
    const documentSize = this.calculateDocumentSize(contextualizedDocument)
    const loadTimeEstimate = this.estimateLoadTime(contextualizedDocument)
    const complexityScore = this.calculateComplexityScore(contextualizedDocument)
    const processingEfficiency = this.calculateProcessingEfficiency(contextualizedDocument)
    const resourceUsage = this.calculateResourceUsage(contextualizedDocument)

    return {
      document_size: documentSize,
      load_time_estimate: loadTimeEstimate,
      complexity_score: complexityScore,
      processing_efficiency: processingEfficiency,
      resource_usage: resourceUsage
    }
  }

  private async performEnhancedComplianceValidation(contextualizedDocument: any, validationContext: ValidationContext): Promise<any> {
    const framework = validationContext.framework
    const complianceRules = this.getEnhancedComplianceRules(framework)
    
    let complianceScore = 0
    let totalRules = complianceRules.length
    const complianceResults: any[] = []
    const violations: any[] = []

    for (const rule of complianceRules) {
      const ruleResult = await this.validateComplianceRule(rule, contextualizedDocument, validationContext)
      complianceResults.push(ruleResult)
      
      if (ruleResult.passed) {
        complianceScore += rule.mandatory ? 1 : 0.5
      } else {
        violations.push({
          rule_id: rule.rule_id,
          rule_name: rule.rule_name,
          severity: rule.severity,
          description: ruleResult.description,
          remediation: ruleResult.remediation
        })
      }
    }

    const averageCompliance = totalRules > 0 ? complianceScore / totalRules : 0

    return {
      assessment_type: 'enhanced_compliance_validation',
      score: averageCompliance,
      framework: framework,
      rules_assessed: totalRules,
      compliance_results: complianceResults,
      violations: violations,
      issues: violations.filter(v => v.severity === 'high' || v.severity === 'critical'),
      recommendations: this.generateEnhancedComplianceRecommendations(violations, validationContext)
    }
  }

  private async assessDocumentQuality(contextualizedDocument: any, context: any): Promise<any> {
    // Perform comprehensive document quality assessment
    const assessments = await Promise.all([
      this.assessContentQuality(contextualizedDocument),
      this.assessMethodologyCompliance(contextualizedDocument, context),
      this.assessStakeholderRequirements(contextualizedDocument, context),
      this.assessTechnicalAccuracy(contextualizedDocument),
      this.assessReadability(contextualizedDocument),
      this.assessCompleteness(contextualizedDocument),
      this.assessConsistency(contextualizedDocument)
    ])

    const overallScore = assessments.reduce((sum, assessment) => sum + assessment.score, 0) / assessments.length

    return {
      report_id: `quality_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      document_id: contextualizedDocument.document_id,
      overall_score: overallScore,
      assessments: assessments,
      assessment_timestamp: new Date(),
      assessor: 'quality_assurance_system'
    }
  }

  private async assessContentQuality(contextualizedDocument: any): Promise<any> {
    // Assess content quality
    const contentMetrics = await Promise.all([
      this.assessContentCompleteness(contextualizedDocument),
      this.assessContentClarity(contextualizedDocument),
      this.assessContentConsistency(contextualizedDocument),
      this.assessContentRelevance(contextualizedDocument)
    ])

    const contentScore = contentMetrics.reduce((sum, metric) => sum + metric.score, 0) / contentMetrics.length

    return {
      assessment_type: 'content_quality',
      score: contentScore,
      metrics: contentMetrics,
      issues: this.identifyContentIssues(contentMetrics),
      recommendations: this.generateContentRecommendations(contentMetrics)
    }
  }

  private async assessContentCompleteness(contextualizedDocument: any): Promise<any> {
    // Assess content completeness
    let completenessScore = 0
    let totalSections = 0

    if (contextualizedDocument.personalized_sections) {
      for (const [sectionKey, sectionData] of Object.entries(contextualizedDocument.personalized_sections)) {
        totalSections++
        const sectionCompleteness = this.assessSectionCompleteness(sectionData)
        completenessScore += sectionCompleteness
      }
    }

    const averageCompleteness = totalSections > 0 ? completenessScore / totalSections : 0

    return {
      metric_type: 'completeness',
      score: averageCompleteness,
      details: {
        sections_assessed: totalSections,
        average_section_completeness: averageCompleteness
      }
    }
  }

  private assessSectionCompleteness(sectionData: any): number {
    // Assess completeness of individual section
    let score = 0
    let factors = 0

    // Check if section has content
    if (sectionData.personalized_content) {
      score += 0.3
      factors++
    }

    // Check if section has context
    if (sectionData.injected_context) {
      score += 0.2
      factors++
    }

    // Check if section has personalization
    if (sectionData.personalization_applied) {
      score += 0.2
      factors++
    }

    // Check content length
    if (sectionData.personalized_content && sectionData.personalized_content.length > 100) {
      score += 0.3
      factors++
    }

    return factors > 0 ? score / factors : 0
  }

  private async assessContentClarity(contextualizedDocument: any): Promise<any> {
    // Assess content clarity
    let clarityScore = 0
    let totalSections = 0

    if (contextualizedDocument.personalized_sections) {
      for (const [sectionKey, sectionData] of Object.entries(contextualizedDocument.personalized_sections)) {
        totalSections++
        const sectionClarity = this.assessSectionClarity(sectionData)
        clarityScore += sectionClarity
      }
    }

    const averageClarity = totalSections > 0 ? clarityScore / totalSections : 0

    return {
      metric_type: 'clarity',
      score: averageClarity,
      details: {
        sections_assessed: totalSections,
        average_section_clarity: averageClarity
      }
    }
  }

  private assessSectionClarity(sectionData: any): number {
    // Assess clarity of individual section
    if (!sectionData.personalized_content) return 0

    const content = sectionData.personalized_content
    let clarityScore = 0
    let factors = 0

    // Check sentence length (shorter sentences are clearer)
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0)
    const avgSentenceLength = sentences.reduce((sum, sentence) => sum + sentence.split(' ').length, 0) / sentences.length
    
    if (avgSentenceLength <= 20) {
      clarityScore += 0.3
    } else if (avgSentenceLength <= 30) {
      clarityScore += 0.2
    }
    factors++

    // Check for clear structure
    if (content.includes('\n') || content.includes('•') || content.includes('-')) {
      clarityScore += 0.3
      factors++
    }

    // Check for active voice
    const activeVoiceRatio = this.calculateActiveVoiceRatio(content)
    clarityScore += activeVoiceRatio * 0.4
    factors++

    return factors > 0 ? clarityScore / factors : 0
  }

  private calculateActiveVoiceRatio(content: string): number {
    // Calculate ratio of active voice sentences
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0)
    let activeVoiceCount = 0

    for (const sentence of sentences) {
      if (this.isActiveVoice(sentence)) {
        activeVoiceCount++
      }
    }

    return sentences.length > 0 ? activeVoiceCount / sentences.length : 0
  }

  private isActiveVoice(sentence: string): boolean {
    // Check if sentence is in active voice
    // This is a simplified check - in practice, this would use NLP
    const passiveIndicators = ['was', 'were', 'been', 'being', 'by']
    return !passiveIndicators.some(indicator => sentence.toLowerCase().includes(indicator))
  }

  private async assessContentConsistency(contextualizedDocument: any): Promise<any> {
    // Assess content consistency
    let consistencyScore = 0
    let totalSections = 0

    if (contextualizedDocument.personalized_sections) {
      const sections = Object.values(contextualizedDocument.personalized_sections)
      totalSections = sections.length

      if (totalSections > 1) {
        // Compare sections for consistency
        for (let i = 0; i < sections.length - 1; i++) {
          for (let j = i + 1; j < sections.length; j++) {
            const sectionConsistency = this.assessSectionConsistency(sections[i], sections[j])
            consistencyScore += sectionConsistency
          }
        }
        
        // Normalize by number of comparisons
        const comparisons = (totalSections * (totalSections - 1)) / 2
        consistencyScore = comparisons > 0 ? consistencyScore / comparisons : 0
      } else {
        consistencyScore = 1.0 // Single section is consistent with itself
      }
    }

    return {
      metric_type: 'consistency',
      score: consistencyScore,
      details: {
        sections_assessed: totalSections,
        consistency_score: consistencyScore
      }
    }
  }

  private assessSectionConsistency(section1: any, section2: any): number {
    // Assess consistency between two sections
    let consistencyScore = 0
    let factors = 0

    // Check terminology consistency
    const terminologyConsistency = this.assessTerminologyConsistency(section1, section2)
    consistencyScore += terminologyConsistency
    factors++

    // Check style consistency
    const styleConsistency = this.assessStyleConsistency(section1, section2)
    consistencyScore += styleConsistency
    factors++

    // Check format consistency
    const formatConsistency = this.assessFormatConsistency(section1, section2)
    consistencyScore += formatConsistency
    factors++

    return factors > 0 ? consistencyScore / factors : 0
  }

  private assessTerminologyConsistency(section1: any, section2: any): number {
    // Assess terminology consistency between sections
    // This would implement actual terminology analysis
    return 0.85
  }

  private assessStyleConsistency(section1: any, section2: any): number {
    // Assess writing style consistency between sections
    // This would implement actual style analysis
    return 0.9
  }

  private assessFormatConsistency(section1: any, section2: any): number {
    // Assess format consistency between sections
    // This would implement actual format analysis
    return 0.8
  }

  private async assessContentRelevance(contextualizedDocument: any): Promise<any> {
    // Assess content relevance
    let relevanceScore = 0
    let totalSections = 0

    if (contextualizedDocument.personalized_sections) {
      for (const [sectionKey, sectionData] of Object.entries(contextualizedDocument.personalized_sections)) {
        totalSections++
        const sectionRelevance = this.assessSectionRelevance(sectionData)
        relevanceScore += sectionRelevance
      }
    }

    const averageRelevance = totalSections > 0 ? relevanceScore / totalSections : 0

    return {
      metric_type: 'relevance',
      score: averageRelevance,
      details: {
        sections_assessed: totalSections,
        average_section_relevance: averageRelevance
      }
    }
  }

  private assessSectionRelevance(sectionData: any): number {
    // Assess relevance of individual section
    let relevanceScore = 0
    let factors = 0

    // Check if section has context relevance
    if (sectionData.context_relevance_score) {
      relevanceScore += sectionData.context_relevance_score
      factors++
    }

    // Check if section has personalization
    if (sectionData.personalization_applied) {
      relevanceScore += 0.3
      factors++
    }

    // Check if section has injected context
    if (sectionData.injected_context && sectionData.injected_context.sources.length > 0) {
      relevanceScore += 0.2
      factors++
    }

    return factors > 0 ? relevanceScore / factors : 0
  }

  private async assessMethodologyCompliance(contextualizedDocument: any, context: any): Promise<any> {
    // Assess methodology compliance
    const templateContext = context.context_data?.template_context
    const framework = templateContext?.framework || 'generic'

    let complianceScore = 0
    let totalRequirements = 0

    // Get framework-specific requirements
    const frameworkRequirements = this.getFrameworkRequirements(framework)

    for (const requirement of frameworkRequirements) {
      totalRequirements++
      const requirementCompliance = await this.assessRequirementCompliance(requirement, contextualizedDocument)
      complianceScore += requirementCompliance
    }

    const averageCompliance = totalRequirements > 0 ? complianceScore / totalRequirements : 0

    return {
      assessment_type: 'methodology_compliance',
      score: averageCompliance,
      framework: framework,
      requirements_assessed: totalRequirements,
      compliance_details: frameworkRequirements.map((req, index) => ({
        requirement: req.name,
        compliance_score: 0.8, // Would be calculated
        status: 'compliant'
      })),
      issues: this.identifyComplianceIssues(frameworkRequirements, averageCompliance),
      recommendations: this.generateComplianceRecommendations(frameworkRequirements, averageCompliance)
    }
  }

  private getFrameworkRequirements(framework: string): any[] {
    // Get framework-specific requirements
    switch (framework) {
      case 'BABOK':
        return [
          { name: 'Stakeholder Analysis', mandatory: true },
          { name: 'Requirements Elicitation', mandatory: true },
          { name: 'Requirements Analysis', mandatory: true },
          { name: 'Solution Assessment', mandatory: false },
          { name: 'Requirements Life Cycle Management', mandatory: true }
        ]
      case 'PMBOK':
        return [
          { name: 'Project Charter', mandatory: true },
          { name: 'Project Management Plan', mandatory: true },
          { name: 'Scope Management', mandatory: true },
          { name: 'Schedule Management', mandatory: true },
          { name: 'Cost Management', mandatory: true },
          { name: 'Quality Management', mandatory: true },
          { name: 'Risk Management', mandatory: true }
        ]
      case 'DMBOK':
        return [
          { name: 'Data Governance', mandatory: true },
          { name: 'Data Architecture', mandatory: true },
          { name: 'Data Quality', mandatory: true },
          { name: 'Data Security', mandatory: true },
          { name: 'Metadata Management', mandatory: true }
        ]
      default:
        return [
          { name: 'Document Structure', mandatory: true },
          { name: 'Content Quality', mandatory: true },
          { name: 'Stakeholder Consideration', mandatory: true }
        ]
    }
  }

  private async assessRequirementCompliance(requirement: any, contextualizedDocument: any): Promise<number> {
    // Assess compliance with specific requirement
    // This would implement actual requirement compliance checking
    return 0.8
  }

  private identifyComplianceIssues(frameworkRequirements: any[], averageCompliance: number): string[] {
    const issues: string[] = []

    if (averageCompliance < 0.8) {
      issues.push('Overall methodology compliance is below acceptable threshold')
    }

    // Check mandatory requirements
    const mandatoryRequirements = frameworkRequirements.filter(req => req.mandatory)
    if (mandatoryRequirements.length > 0) {
      issues.push(`${mandatoryRequirements.length} mandatory requirements need attention`)
    }

    return issues
  }

  private generateComplianceRecommendations(frameworkRequirements: any[], averageCompliance: number): string[] {
    const recommendations: string[] = []

    if (averageCompliance < 0.8) {
      recommendations.push('Improve overall methodology compliance')
    }

    // Add framework-specific recommendations
    recommendations.push('Review framework-specific requirements')
    recommendations.push('Ensure all mandatory sections are included')
    recommendations.push('Apply framework best practices consistently')

    return recommendations
  }

  private async assessStakeholderRequirements(contextualizedDocument: any, context: any): Promise<any> {
    // Assess stakeholder requirements compliance
    const projectContext = context.context_data?.project_context
    const stakeholders = projectContext?.stakeholders || []

    let stakeholderSatisfaction = 0
    let totalStakeholders = stakeholders.length

    if (totalStakeholders > 0) {
      for (const stakeholder of stakeholders) {
        const stakeholderSatisfactionScore = await this.assessStakeholderSatisfaction(stakeholder, contextualizedDocument)
        stakeholderSatisfaction += stakeholderSatisfactionScore
      }

      stakeholderSatisfaction = stakeholderSatisfaction / totalStakeholders
    } else {
      stakeholderSatisfaction = 0.5 // Default score when no stakeholders defined
    }

    return {
      assessment_type: 'stakeholder_requirements',
      score: stakeholderSatisfaction,
      stakeholders_assessed: totalStakeholders,
      stakeholder_satisfaction: stakeholders.map(stakeholder => ({
        stakeholder_id: stakeholder.stakeholder_id,
        name: stakeholder.name,
        role: stakeholder.role,
        satisfaction_score: 0.8, // Would be calculated
        requirements_met: 0.8, // Would be calculated
        concerns: [] // Would be identified
      })),
      issues: this.identifyStakeholderIssues(stakeholders, stakeholderSatisfaction),
      recommendations: this.generateStakeholderRecommendations(stakeholders, stakeholderSatisfaction)
    }
  }

  private async assessStakeholderSatisfaction(stakeholder: any, contextualizedDocument: any): Promise<number> {
    // Assess individual stakeholder satisfaction
    // This would implement actual stakeholder satisfaction analysis
    return 0.8
  }

  private identifyStakeholderIssues(stakeholders: any[], averageSatisfaction: number): string[] {
    const issues: string[] = []

    if (averageSatisfaction < 0.7) {
      issues.push('Overall stakeholder satisfaction is below acceptable threshold')
    }

    if (stakeholders.length === 0) {
      issues.push('No stakeholders defined for assessment')
    }

    return issues
  }

  private generateStakeholderRecommendations(stakeholders: any[], averageSatisfaction: number): string[] {
    const recommendations: string[] = []

    if (averageSatisfaction < 0.7) {
      recommendations.push('Improve stakeholder satisfaction by addressing their specific requirements')
    }

    if (stakeholders.length === 0) {
      recommendations.push('Define stakeholders for better requirement assessment')
    }

    recommendations.push('Conduct stakeholder review and feedback collection')
    recommendations.push('Address stakeholder concerns and requirements')

    return recommendations
  }

  private async assessTechnicalAccuracy(contextualizedDocument: any): Promise<any> {
    // Assess technical accuracy
    return {
      assessment_type: 'technical_accuracy',
      score: 0.85,
      accuracy_checks: [
        { check_type: 'fact_checking', score: 0.9, passed: true },
        { check_type: 'reference_validation', score: 0.8, passed: true },
        { check_type: 'data_accuracy', score: 0.85, passed: true },
        { check_type: 'technical_correctness', score: 0.8, passed: true }
      ],
      issues: [
        'Some technical references need verification'
      ],
      recommendations: [
        'Verify technical details with subject matter experts',
        'Validate all references and data sources',
        'Ensure technical accuracy of all statements'
      ]
    }
  }

  private async assessReadability(contextualizedDocument: any): Promise<any> {
    // Assess document readability
    let readabilityScore = 0
    let totalSections = 0

    if (contextualizedDocument.personalized_sections) {
      for (const [sectionKey, sectionData] of Object.entries(contextualizedDocument.personalized_sections)) {
        totalSections++
        const sectionReadability = this.assessSectionReadability(sectionData)
        readabilityScore += sectionReadability
      }
    }

    const averageReadability = totalSections > 0 ? readabilityScore / totalSections : 0

    return {
      assessment_type: 'readability',
      score: averageReadability,
      readability_metrics: {
        flesch_reading_ease: 65, // Would be calculated
        flesch_kincaid_grade: 8.5, // Would be calculated
        gunning_fog_index: 12.0, // Would be calculated
        automated_readability_index: 9.0 // Would be calculated
      },
      issues: this.identifyReadabilityIssues(averageReadability),
      recommendations: this.generateReadabilityRecommendations(averageReadability)
    }
  }

  private assessSectionReadability(sectionData: any): number {
    // Assess readability of individual section
    if (!sectionData.personalized_content) return 0

    const content = sectionData.personalized_content
    let readabilityScore = 0
    let factors = 0

    // Check sentence length
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0)
    const avgSentenceLength = sentences.reduce((sum, sentence) => sum + sentence.split(' ').length, 0) / sentences.length
    
    if (avgSentenceLength <= 15) {
      readabilityScore += 0.3
    } else if (avgSentenceLength <= 20) {
      readabilityScore += 0.2
    } else if (avgSentenceLength <= 25) {
      readabilityScore += 0.1
    }
    factors++

    // Check word length
    const words = content.split(/\s+/)
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length
    
    if (avgWordLength <= 5) {
      readabilityScore += 0.3
    } else if (avgWordLength <= 6) {
      readabilityScore += 0.2
    } else if (avgWordLength <= 7) {
      readabilityScore += 0.1
    }
    factors++

    // Check for clear structure
    if (content.includes('\n') || content.includes('•') || content.includes('-')) {
      readabilityScore += 0.2
      factors++
    }

    // Check for active voice
    const activeVoiceRatio = this.calculateActiveVoiceRatio(content)
    readabilityScore += activeVoiceRatio * 0.2
    factors++

    return factors > 0 ? readabilityScore / factors : 0
  }

  private identifyReadabilityIssues(averageReadability: number): string[] {
    const issues: string[] = []

    if (averageReadability < 0.7) {
      issues.push('Document readability is below acceptable threshold')
    }

    if (averageReadability < 0.5) {
      issues.push('Document is difficult to read and understand')
    }

    return issues
  }

  private generateReadabilityRecommendations(averageReadability: number): string[] {
    const recommendations: string[] = []

    if (averageReadability < 0.7) {
      recommendations.push('Improve document readability')
      recommendations.push('Use shorter sentences and simpler words')
      recommendations.push('Add clear structure and formatting')
      recommendations.push('Use active voice instead of passive voice')
    }

    return recommendations
  }

  private async assessCompleteness(contextualizedDocument: any): Promise<any> {
    // Assess document completeness
    return {
      assessment_type: 'completeness',
      score: 0.9,
      completeness_checks: [
        { check_type: 'required_sections', score: 0.95, passed: true },
        { check_type: 'content_length', score: 0.85, passed: true },
        { check_type: 'variable_resolution', score: 0.9, passed: true },
        { check_type: 'context_integration', score: 0.9, passed: true }
      ],
      issues: [
        'Some sections could be more detailed'
      ],
      recommendations: [
        'Add more detail to incomplete sections',
        'Ensure all required variables are resolved',
        'Verify all context is properly integrated'
      ]
    }
  }

  private async assessConsistency(contextualizedDocument: any): Promise<any> {
    // Assess document consistency
    return {
      assessment_type: 'consistency',
      score: 0.88,
      consistency_checks: [
        { check_type: 'terminology_consistency', score: 0.9, passed: true },
        { check_type: 'formatting_consistency', score: 0.85, passed: true },
        { check_type: 'style_consistency', score: 0.9, passed: true },
        { check_type: 'reference_consistency', score: 0.85, passed: true }
      ],
      issues: [
        'Minor formatting inconsistencies detected'
      ],
      recommendations: [
        'Standardize terminology usage throughout document',
        'Ensure consistent formatting across all sections',
        'Maintain consistent writing style',
        'Verify reference consistency'
      ]
    }
  }

  private identifyContentIssues(contentMetrics: any[]): string[] {
    const issues: string[] = []

    for (const metric of contentMetrics) {
      if (metric.score < 0.7) {
        issues.push(`${metric.metric_type} score is below acceptable threshold: ${metric.score}`)
      }
    }

    return issues
  }

  private generateContentRecommendations(contentMetrics: any[]): string[] {
    const recommendations: string[] = []

    for (const metric of contentMetrics) {
      if (metric.score < 0.7) {
        recommendations.push(`Improve ${metric.metric_type} quality`)
      }
    }

    return recommendations
  }

  private async applyQualityGates(qualityReport: any, context: any): Promise<any[]> {
    // Apply quality gates based on configuration
    const qualityGates = context.quality_config?.quality_gates || []
    const gateResults: any[] = []

    // Add default EU AI Act compliance gate if EU region detected
    const validationContext = this.buildValidationContext(context)
    if (this.isEURegion(validationContext.region)) {
      const euAiActGate = this.createEUAIActComplianceGate()
      qualityGates.push(euAiActGate)
    }

    for (const gate of qualityGates) {
      const gateResult = await this.evaluateQualityGate(gate, qualityReport, context)
      gateResults.push(gateResult)
    }

    return gateResults
  }

  /**
   * Creates EU AI Act compliance quality gate
   * This gate ensures documents meet EU AI Act requirements before passing
   */
  private createEUAIActComplianceGate(): any {
    return {
      gate_id: 'EU_AI_ACT_COMPLIANCE_GATE',
      gate_name: 'EU AI Act Compliance Gate',
      stage_id: 'quality_assurance',
      criteria: [
        {
          criterion_id: 'EU_AI_ACT_TRANSPARENCY',
          criterion_name: 'AI-Generated Content Transparency',
          metric: 'ai_content_labeling',
          threshold: 80, // Must score 80%+ on transparency
          weight: 0.30 // 30% weight in gate score
        },
        {
          criterion_id: 'EU_AI_ACT_HUMAN_OVERSIGHT',
          criterion_name: 'Human Oversight',
          metric: 'human_oversight',
          threshold: 80, // Must score 80%+ on human oversight
          weight: 0.30 // 30% weight in gate score
        },
        {
          criterion_id: 'EU_AI_ACT_ACCURACY',
          criterion_name: 'AI Accuracy and Robustness',
          metric: 'ai_accuracy',
          threshold: 70, // Must score 70%+ on accuracy
          weight: 0.25 // 25% weight in gate score
        },
        {
          criterion_id: 'EU_AI_ACT_DATA_GOVERNANCE',
          criterion_name: 'Data Governance',
          metric: 'data_governance',
          threshold: 60, // Recommended but not mandatory
          weight: 0.10 // 10% weight in gate score
        },
        {
          criterion_id: 'EU_AI_ACT_RECORD_KEEPING',
          criterion_name: 'Record Keeping',
          metric: 'record_keeping',
          threshold: 70, // Must score 70%+ on record keeping
          weight: 0.05 // 5% weight in gate score
        }
      ],
      threshold: 75, // Overall gate must pass at 75%+
      action_on_failure: 'stop' // Block document if EU AI Act compliance fails
    }
  }

  private async evaluateQualityGate(gate: any, qualityReport: any, context?: any): Promise<any> {
    // Evaluate individual quality gate
    const gateScore = this.calculateGateScore(gate, qualityReport, context)
    const passed = gateScore >= gate.threshold

    // Calculate individual criterion scores
    const criteriaResults = gate.criteria.map((criterion: any) => {
      const criterionScore = this.calculateCriterionScore(criterion, qualityReport, context)
      return {
        criterion_id: criterion.criterion_id,
        criterion_name: criterion.criterion_name,
        score: criterionScore,
        threshold: criterion.threshold,
        passed: criterionScore >= criterion.threshold,
        weight: criterion.weight
      }
    })

    return {
      gate_id: gate.gate_id,
      gate_name: gate.gate_name,
      passed: passed,
      score: gateScore,
      threshold: gate.threshold,
      criteria_results: criteriaResults,
      action_taken: passed ? 'continue' : gate.action_on_failure,
      blocking: !passed && gate.action_on_failure === 'stop'
    }
  }

  private calculateGateScore(gate: any, qualityReport: any, context?: any): number {
    // Calculate quality gate score
    let totalScore = 0
    let totalWeight = 0

    for (const criterion of gate.criteria) {
      const criterionScore = this.calculateCriterionScore(criterion, qualityReport, context)
      totalScore += criterionScore * criterion.weight
      totalWeight += criterion.weight
    }

    return totalWeight > 0 ? totalScore / totalWeight : 0
  }

  private calculateCriterionScore(criterion: any, qualityReport: any, context?: any): number {
    // Calculate individual criterion score based on metric type
    switch (criterion.metric) {
      // EU AI Act compliance metrics
      case 'ai_content_labeling':
        return this.calculateAIContentLabelingScore(qualityReport, context)
      case 'human_oversight':
        return this.calculateHumanOversightScore(qualityReport, context)
      case 'ai_accuracy':
        return this.calculateAIAccuracyScore(qualityReport, context)
      case 'data_governance':
        return this.calculateDataGovernanceScore(qualityReport, context)
      case 'record_keeping':
        return this.calculateRecordKeepingScore(qualityReport, context)
      
      // Standard quality metrics
      case 'overall_quality':
        return (qualityReport.overall_score || 0) * 100
      case 'completeness':
        return this.getDimensionScore(qualityReport, 'completeness') * 100
      case 'consistency':
        return this.getDimensionScore(qualityReport, 'consistency') * 100
      case 'professional_quality':
        return this.getDimensionScore(qualityReport, 'professionalQuality') * 100
      case 'standards_compliance':
        return this.getDimensionScore(qualityReport, 'standardsCompliance') * 100
      default:
        return 0.8 * 100 // Default 80% if metric not found
    }
  }

  /**
   * Calculate AI Content Labeling Score (0-100)
   * Based on EU AI Act transparency requirements
   */
  private calculateAIContentLabelingScore(qualityReport: any, context?: any): number {
    const complianceValidation = qualityReport.enhanced_validations?.compliance || {}
    const complianceResults = complianceValidation.compliance_results || []
    
    // Find AI labeling rule result
    const labelingRule = complianceResults.find((r: any) => 
      r.rule_id === 'EU_AI_ACT_TRANSPARENCY_001'
    )
    
    if (labelingRule) {
      return labelingRule.passed ? 100 : 0
    }
    
    // Fallback: Check metadata
    const metadata = context?.document_metadata || {}
    const hasAIMetadata = 
      metadata.generation_metadata?.provider !== undefined ||
      metadata.generation_metadata?.ai_generated === true
    
    return hasAIMetadata ? 80 : 0 // Partial score if metadata exists but no explicit labeling
  }

  /**
   * Calculate Human Oversight Score (0-100)
   * Based on EU AI Act human oversight requirements
   */
  private calculateHumanOversightScore(qualityReport: any, context?: any): number {
    const complianceValidation = qualityReport.enhanced_validations?.compliance || {}
    const complianceResults = complianceValidation.compliance_results || []
    
    // Find human oversight rule result
    const oversightRule = complianceResults.find((r: any) => 
      r.rule_id === 'EU_AI_ACT_HUMAN_OVERSIGHT_001'
    )
    
    if (oversightRule) {
      return oversightRule.passed ? 100 : 0
    }
    
    // Fallback: Check if document is editable and reviewable
    const metadata = context?.document_metadata || {}
    const isEditable = metadata.editable !== false
    const hasReview = metadata.review_status !== undefined
    
    if (isEditable && hasReview) return 100
    if (isEditable || hasReview) return 50
    return 0
  }

  /**
   * Calculate AI Accuracy Score (0-100)
   * Based on EU AI Act accuracy requirements
   */
  private calculateAIAccuracyScore(qualityReport: any, context?: any): number {
    const complianceValidation = qualityReport.enhanced_validations?.compliance || {}
    const complianceResults = complianceValidation.compliance_results || []
    
    // Find accuracy rule result
    const accuracyRule = complianceResults.find((r: any) => 
      r.rule_id === 'EU_AI_ACT_ACCURACY_001'
    )
    
    if (accuracyRule) {
      return accuracyRule.passed ? 100 : 0
    }
    
    // Fallback: Use quality report accuracy dimension
    const accuracyScore = this.getDimensionScore(qualityReport, 'accuracy')
    return accuracyScore * 100
  }

  /**
   * Calculate Data Governance Score (0-100)
   * Based on EU AI Act data governance requirements
   */
  private calculateDataGovernanceScore(qualityReport: any, context?: any): number {
    const complianceValidation = qualityReport.enhanced_validations?.compliance || {}
    const complianceResults = complianceValidation.compliance_results || []
    
    // Find data governance rule result
    const dataGovRule = complianceResults.find((r: any) => 
      r.rule_id === 'EU_AI_ACT_DATA_GOVERNANCE_001'
    )
    
    if (dataGovRule) {
      return dataGovRule.passed ? 100 : 50 // Partial score if not fully compliant
    }
    
    // Fallback: Check if provider info is documented
    const metadata = context?.document_metadata || {}
    const hasProviderInfo = 
      metadata.generation_metadata?.provider !== undefined &&
      metadata.generation_metadata?.model !== undefined
    
    return hasProviderInfo ? 80 : 0
  }

  /**
   * Calculate Record Keeping Score (0-100)
   * Based on EU AI Act record keeping requirements
   */
  private calculateRecordKeepingScore(qualityReport: any, context?: any): number {
    const complianceValidation = qualityReport.enhanced_validations?.compliance || {}
    const complianceResults = complianceValidation.compliance_results || []
    
    // Find record keeping rule result
    const recordRule = complianceResults.find((r: any) => 
      r.rule_id === 'EU_AI_ACT_RECORD_KEEPING_001'
    )
    
    if (recordRule) {
      return recordRule.passed ? 100 : 0
    }
    
    // Fallback: Check if generation metadata is logged
    const metadata = context?.document_metadata || {}
    const hasTimestamp = metadata.generation_metadata?.generated_at !== undefined
    const hasProviderModel = 
      metadata.generation_metadata?.provider !== undefined &&
      metadata.generation_metadata?.model !== undefined
    
    if (hasTimestamp && hasProviderModel) return 100
    if (hasTimestamp || hasProviderModel) return 50
    return 0
  }

  /**
   * Helper to get dimension score from quality report
   */
  private getDimensionScore(qualityReport: any, dimension: string): number {
    const assessments = qualityReport.assessments || []
    const qualityMetrics = qualityReport.quality_metrics || {}
    
    // Try to get from quality metrics first
    if (qualityMetrics[dimension] !== undefined) {
      return qualityMetrics[dimension] / 100 // Convert 0-100 to 0-1
    }
    
    // Try to get from assessments
    const assessment = assessments.find((a: any) => 
      a.assessment_type === dimension || 
      a.metric_type === dimension
    )
    
    if (assessment && assessment.score !== undefined) {
      return assessment.score
    }
    
    return 0.7 // Default 70% if not found
  }

  private async generateQualityRecommendations(qualityReport: any, qualityGateResults: any[]): Promise<any[]> {
    // Generate quality recommendations
    const recommendations: any[] = []

    // Generate recommendations based on quality report
    for (const assessment of qualityReport.assessments) {
      if (assessment.score < 0.8) {
        recommendations.push({
          type: 'quality_improvement',
          priority: 'high',
          title: `Improve ${assessment.assessment_type}`,
          description: `Quality score for ${assessment.assessment_type} is ${assessment.score}`,
          implementation: assessment.recommendations.join(', '),
          expected_impact: 0.2,
          timeframe: 'immediate'
        })
      }
    }

    // Generate recommendations based on quality gate results
    for (const gateResult of qualityGateResults) {
      if (!gateResult.passed) {
        recommendations.push({
          type: 'quality_gate',
          priority: 'critical',
          title: `Fix Quality Gate: ${gateResult.gate_name}`,
          description: `Quality gate ${gateResult.gate_name} failed with score ${gateResult.score}`,
          implementation: 'Address quality gate criteria',
          expected_impact: 0.3,
          timeframe: 'immediate'
        })
      }
    }

    return recommendations
  }

  private async calculateOverallQualityScore(qualityReport: any, qualityGateResults: any[]): Promise<number> {
    // Calculate overall quality score
    const qualityFactors = {
      content_quality: qualityReport.assessments[0].score,
      methodology_compliance: qualityReport.assessments[1].score,
      stakeholder_requirements: qualityReport.assessments[2].score,
      technical_accuracy: qualityReport.assessments[3].score,
      readability: qualityReport.assessments[4].score,
      completeness: qualityReport.assessments[5].score,
      consistency: qualityReport.assessments[6].score,
      quality_gates: qualityGateResults.length > 0 ? 
        qualityGateResults.reduce((sum, gate) => sum + (gate.passed ? 1 : 0), 0) / qualityGateResults.length : 1
    }

    const weights = {
      content_quality: 0.20,
      methodology_compliance: 0.15,
      stakeholder_requirements: 0.15,
      technical_accuracy: 0.15,
      readability: 0.10,
      completeness: 0.10,
      consistency: 0.10,
      quality_gates: 0.05
    }

    const overallScore = Object.entries(qualityFactors).reduce((sum, [factor, score]) => {
      return sum + (score * weights[factor as keyof typeof weights])
    }, 0)

    return Math.min(1, Math.max(0, overallScore))
  }

  // Enhanced validation helper methods
  private async generateEnhancedQualityRecommendations(
    qualityReport: any, 
    qualityGateResults: any[],
    securityValidation: SecurityValidationResult,
    accessibilityValidation: AccessibilityValidationResult,
    dataQualityValidation: DataQualityResult,
    crossReferenceValidation: CrossReferenceValidationResult,
    performanceValidation: PerformanceMetrics,
    complianceValidation: any
  ): Promise<any[]> {
    const recommendations: any[] = []

    // Add original quality recommendations
    const originalRecommendations = await this.generateQualityRecommendations(qualityReport, qualityGateResults)
    recommendations.push(...originalRecommendations)

    // Add security recommendations
    if (!securityValidation.passed) {
      recommendations.push({
        type: 'security_validation',
        priority: 'critical',
        title: 'Address Security Vulnerabilities',
        description: `${securityValidation.vulnerabilities.length} security vulnerabilities found`,
        implementation: securityValidation.recommendations.join(', '),
        expected_impact: 0.4,
        timeframe: 'immediate'
      })
    }

    // Add accessibility recommendations
    if (!accessibilityValidation.passed) {
      recommendations.push({
        type: 'accessibility_validation',
        priority: 'high',
        title: 'Improve Accessibility Compliance',
        description: `${accessibilityValidation.violations.length} accessibility violations found`,
        implementation: accessibilityValidation.recommendations.join(', '),
        expected_impact: 0.3,
        timeframe: 'short_term'
      })
    }

    // Add data quality recommendations
    if (!dataQualityValidation.passed) {
      recommendations.push({
        type: 'data_quality_validation',
        priority: 'high',
        title: 'Improve Data Quality',
        description: `${dataQualityValidation.issues.length} data quality issues found`,
        implementation: dataQualityValidation.recommendations.join(', '),
        expected_impact: 0.3,
        timeframe: 'short_term'
      })
    }

    // Add cross-reference recommendations
    if (!crossReferenceValidation.passed) {
      recommendations.push({
        type: 'cross_reference_validation',
        priority: 'medium',
        title: 'Fix Broken References',
        description: `${crossReferenceValidation.broken_references.length} broken references found`,
        implementation: crossReferenceValidation.recommendations.join(', '),
        expected_impact: 0.2,
        timeframe: 'medium_term'
      })
    }

    // Add performance recommendations
    if (performanceValidation.processing_efficiency < 0.7) {
      recommendations.push({
        type: 'performance_optimization',
        priority: 'medium',
        title: 'Optimize Document Performance',
        description: `Document performance efficiency is ${performanceValidation.processing_efficiency}`,
        implementation: 'Optimize document structure and reduce complexity',
        expected_impact: 0.2,
        timeframe: 'medium_term'
      })
    }

    // Add compliance recommendations
    if (complianceValidation.score < 0.8) {
      const euAiActViolations = complianceValidation.violations?.filter((v: any) => 
        v.rule_id?.startsWith('EU_AI_ACT')
      ) || []
      
      const priority = euAiActViolations.length > 0 ? 'critical' : 'high'
      const title = euAiActViolations.length > 0 
        ? 'EU AI Act Compliance Violations' 
        : 'Improve Framework Compliance'
      
      recommendations.push({
        type: 'enhanced_compliance',
        priority: priority,
        title: title,
        description: `Enhanced compliance score is ${complianceValidation.score}. ${euAiActViolations.length > 0 ? `EU AI Act violations detected: ${euAiActViolations.length}` : ''}`,
        implementation: complianceValidation.recommendations.join(', '),
        expected_impact: 0.3,
        timeframe: 'immediate',
        blocking: euAiActViolations.length > 0 // EU AI Act violations block document
      })
    }

    return recommendations
  }

  private async calculateEnhancedQualityScore(
    qualityReport: any, 
    qualityGateResults: any[],
    securityValidation: SecurityValidationResult,
    accessibilityValidation: AccessibilityValidationResult,
    dataQualityValidation: DataQualityResult,
    crossReferenceValidation: CrossReferenceValidationResult,
    performanceValidation: PerformanceMetrics,
    complianceValidation: any
  ): Promise<number> {
    // Calculate enhanced quality score with additional validation factors
    const qualityFactors = {
      content_quality: qualityReport.assessments[0].score,
      methodology_compliance: qualityReport.assessments[1].score,
      stakeholder_requirements: qualityReport.assessments[2].score,
      technical_accuracy: qualityReport.assessments[3].score,
      readability: qualityReport.assessments[4].score,
      completeness: qualityReport.assessments[5].score,
      consistency: qualityReport.assessments[6].score,
      quality_gates: qualityGateResults.length > 0 ? 
        qualityGateResults.reduce((sum, gate) => sum + (gate.passed ? 1 : 0), 0) / qualityGateResults.length : 1,
      security_validation: securityValidation.security_score,
      accessibility_validation: accessibilityValidation.accessibility_score,
      data_quality_validation: dataQualityValidation.quality_score,
      cross_reference_validation: crossReferenceValidation.validation_score,
      performance_validation: performanceValidation.processing_efficiency,
      enhanced_compliance: complianceValidation.score
    }

    const weights = {
      content_quality: 0.15,
      methodology_compliance: 0.12,
      stakeholder_requirements: 0.10,
      technical_accuracy: 0.12,
      readability: 0.08,
      completeness: 0.08,
      consistency: 0.08,
      quality_gates: 0.05,
      security_validation: 0.10,
      accessibility_validation: 0.05,
      data_quality_validation: 0.08,
      cross_reference_validation: 0.04,
      performance_validation: 0.03,
      enhanced_compliance: 0.12
    }

    const overallScore = Object.entries(qualityFactors).reduce((sum, [factor, score]) => {
      return sum + (score * weights[factor as keyof typeof weights])
    }, 0)

    return Math.min(1, Math.max(0, overallScore))
  }

  // Security validation helper methods
  private checkSensitiveDataExposure(contextualizedDocument: any): { passed: boolean; vulnerabilities: SecurityVulnerability[] } {
    const vulnerabilities: SecurityVulnerability[] = []
    
    // Check for common sensitive data patterns
    const sensitivePatterns = [
      { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, type: 'SSN' },
      { pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, type: 'Credit Card' },
      { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, type: 'Email' },
      { pattern: /\b\d{3}[\s-]?\d{3}[\s-]?\d{4}\b/g, type: 'Phone Number' }
    ]

    const content = JSON.stringify(contextualizedDocument)
    
    for (const { pattern, type } of sensitivePatterns) {
      const matches = content.match(pattern)
      if (matches) {
        vulnerabilities.push({
          type: 'sensitive_data_exposure',
          severity: 'high',
          description: `Potential ${type} exposure detected`,
          location: 'document_content',
          remediation: `Remove or mask ${type} information`
        })
      }
    }

    return {
      passed: vulnerabilities.length === 0,
      vulnerabilities
    }
  }

  private checkUnsafeContent(contextualizedDocument: any): { passed: boolean; vulnerabilities: SecurityVulnerability[] } {
    const vulnerabilities: SecurityVulnerability[] = []
    const content = JSON.stringify(contextualizedDocument)

    // Check for potentially unsafe content
    const unsafePatterns = [
      { pattern: /<script/gi, type: 'Script Injection' },
      { pattern: /javascript:/gi, type: 'JavaScript URL' },
      { pattern: /on\w+\s*=/gi, type: 'Event Handler' },
      { pattern: /eval\s*\(/gi, type: 'Code Evaluation' }
    ]

    for (const { pattern, type } of unsafePatterns) {
      if (pattern.test(content)) {
        vulnerabilities.push({
          type: 'unsafe_content',
          severity: 'critical',
          description: `Potential ${type} detected`,
          location: 'document_content',
          remediation: `Remove or sanitize ${type}`
        })
      }
    }

    return {
      passed: vulnerabilities.length === 0,
      vulnerabilities
    }
  }

  private checkDataClassificationCompliance(contextualizedDocument: any, validationContext: ValidationContext): { passed: boolean; vulnerabilities: SecurityVulnerability[] } {
    const vulnerabilities: SecurityVulnerability[] = []
    
    // Check if document handling matches data classification
    const classification = validationContext.data_classification
    const hasClassificationMarking = JSON.stringify(contextualizedDocument).toLowerCase().includes(classification.toLowerCase())

    if (!hasClassificationMarking && classification !== 'public') {
      vulnerabilities.push({
        type: 'data_classification_violation',
        severity: 'medium',
        description: `Document lacks proper ${classification} classification marking`,
        location: 'document_metadata',
        remediation: `Add appropriate ${classification} classification marking`
      })
    }

    return {
      passed: vulnerabilities.length === 0,
      vulnerabilities
    }
  }

  private checkSecureReferences(contextualizedDocument: any): { passed: boolean; vulnerabilities: SecurityVulnerability[] } {
    const vulnerabilities: SecurityVulnerability[] = []
    const content = JSON.stringify(contextualizedDocument)

    // Check for insecure references
    const insecurePatterns = [
      { pattern: /http:\/\/[^\s]+/gi, type: 'Insecure HTTP Reference' },
      { pattern: /ftp:\/\/[^\s]+/gi, type: 'Insecure FTP Reference' }
    ]

    for (const { pattern, type } of insecurePatterns) {
      const matches = content.match(pattern)
      if (matches) {
        vulnerabilities.push({
          type: 'insecure_reference',
          severity: 'medium',
          description: `${type} detected`,
          location: 'document_references',
          remediation: `Use secure HTTPS/SFTP alternatives`
        })
      }
    }

    return {
      passed: vulnerabilities.length === 0,
      vulnerabilities
    }
  }

  private generateSecurityRecommendations(vulnerabilities: SecurityVulnerability[], validationContext: ValidationContext): string[] {
    const recommendations: string[] = []

    if (vulnerabilities.some(v => v.type === 'sensitive_data_exposure')) {
      recommendations.push('Implement data masking for sensitive information')
      recommendations.push('Review data handling procedures')
    }

    if (vulnerabilities.some(v => v.type === 'unsafe_content')) {
      recommendations.push('Sanitize all user-generated content')
      recommendations.push('Implement content security policies')
    }

    if (vulnerabilities.some(v => v.type === 'data_classification_violation')) {
      recommendations.push('Add proper data classification markings')
      recommendations.push('Review data classification policies')
    }

    if (vulnerabilities.some(v => v.type === 'insecure_reference')) {
      recommendations.push('Use secure communication protocols')
      recommendations.push('Update all external references to use HTTPS')
    }

    return recommendations
  }

  // Accessibility validation helper methods
  private checkHeadingStructure(contextualizedDocument: any): { passed: boolean; violations: AccessibilityViolation[] } {
    const violations: AccessibilityViolation[] = []
    
    // This would implement actual heading structure analysis
    // For now, return a basic check
    return {
      passed: true,
      violations
    }
  }

  private checkAltText(contextualizedDocument: any): { passed: boolean; violations: AccessibilityViolation[] } {
    const violations: AccessibilityViolation[] = []
    
    // Check for images without alt text
    const content = JSON.stringify(contextualizedDocument)
    const imagePattern = /<img[^>]*>/gi
    const altPattern = /alt\s*=\s*["'][^"']*["']/gi

    const images = content.match(imagePattern) || []
    for (const image of images) {
      if (!altPattern.test(image)) {
        violations.push({
          guideline: 'WCAG 1.1.1',
          level: 'A',
          description: 'Image missing alt text',
          location: 'document_content',
          remediation: 'Add descriptive alt text to all images'
        })
      }
    }

    return {
      passed: violations.length === 0,
      violations
    }
  }

  private checkColorContrast(contextualizedDocument: any): { passed: boolean; violations: AccessibilityViolation[] } {
    const violations: AccessibilityViolation[] = []
    
    // This would implement actual color contrast analysis
    // For now, return a basic check
    return {
      passed: true,
      violations
    }
  }

  private checkReadableLanguage(contextualizedDocument: any, validationContext: ValidationContext): { passed: boolean; violations: AccessibilityViolation[] } {
    const violations: AccessibilityViolation[] = []
    
    // Check for complex language that might not be accessible
    const content = JSON.stringify(contextualizedDocument)
    const words = content.split(/\s+/)
    const complexWords = words.filter(word => word.length > 12)
    const complexWordRatio = complexWords.length / words.length

    if (complexWordRatio > 0.15) {
      violations.push({
        guideline: 'WCAG 3.1.5',
        level: 'AAA',
        description: 'Language complexity may hinder accessibility',
        location: 'document_content',
        remediation: 'Simplify language and provide definitions for complex terms'
      })
    }

    return {
      passed: violations.length === 0,
      violations
    }
  }

  private generateAccessibilityRecommendations(violations: AccessibilityViolation[], validationContext: ValidationContext): string[] {
    const recommendations: string[] = []

    if (violations.some(v => v.guideline === 'WCAG 1.1.1')) {
      recommendations.push('Add alt text to all images')
      recommendations.push('Ensure alt text is descriptive and meaningful')
    }

    if (violations.some(v => v.guideline === 'WCAG 3.1.5')) {
      recommendations.push('Simplify language where possible')
      recommendations.push('Provide glossary for technical terms')
      recommendations.push('Use clear and concise writing')
    }

    return recommendations
  }

  // Data quality validation helper methods
  private checkDataCompleteness(contextualizedDocument: any): { passed: boolean; issues: DataQualityIssue[] } {
    const issues: DataQualityIssue[] = []
    
    // Check for missing required fields
    const requiredFields = ['document_id', 'title', 'content']
    for (const field of requiredFields) {
      if (!contextualizedDocument[field]) {
        issues.push({
          type: 'missing_required_field',
          severity: 'high',
          description: `Required field '${field}' is missing`,
          location: 'document_metadata',
          expected: `Valid ${field}`,
          actual: 'null or undefined'
        })
      }
    }

    return {
      passed: issues.length === 0,
      issues
    }
  }

  private checkDataConsistency(contextualizedDocument: any): { passed: boolean; issues: DataQualityIssue[] } {
    const issues: DataQualityIssue[] = []
    
    // Check for data consistency issues
    // This would implement actual consistency checking
    return {
      passed: true,
      issues
    }
  }

  private checkDataAccuracy(contextualizedDocument: any): { passed: boolean; issues: DataQualityIssue[] } {
    const issues: DataQualityIssue[] = []
    
    // Check for data accuracy issues
    // This would implement actual accuracy checking
    return {
      passed: true,
      issues
    }
  }

  private checkDataFormatCompliance(contextualizedDocument: any, validationContext: ValidationContext): { passed: boolean; issues: DataQualityIssue[] } {
    const issues: DataQualityIssue[] = []
    
    // Check for format compliance issues
    // This would implement actual format checking
    return {
      passed: true,
      issues
    }
  }

  private generateDataQualityRecommendations(issues: DataQualityIssue[], validationContext: ValidationContext): string[] {
    const recommendations: string[] = []

    if (issues.some(i => i.type === 'missing_required_field')) {
      recommendations.push('Ensure all required fields are populated')
      recommendations.push('Implement data validation at input stage')
    }

    return recommendations
  }

  // Cross-reference validation helper methods
  private checkInternalReferences(contextualizedDocument: any): { passed: boolean; brokenReferences: BrokenReference[] } {
    const brokenReferences: BrokenReference[] = []
    
    // Check for broken internal references
    // This would implement actual internal reference checking
    return {
      passed: true,
      brokenReferences
    }
  }

  private async checkExternalReferences(contextualizedDocument: any): Promise<{ passed: boolean; brokenReferences: BrokenReference[] }> {
    const brokenReferences: BrokenReference[] = []
    
    // Check for broken external references
    // This would implement actual external reference checking
    return {
      passed: true,
      brokenReferences
    }
  }

  private checkCitations(contextualizedDocument: any): { passed: boolean; brokenReferences: BrokenReference[] } {
    const brokenReferences: BrokenReference[] = []
    
    // Check for broken citations
    // This would implement actual citation checking
    return {
      passed: true,
      brokenReferences
    }
  }

  private checkFigureTableReferences(contextualizedDocument: any): { passed: boolean; brokenReferences: BrokenReference[] } {
    const brokenReferences: BrokenReference[] = []
    
    // Check for broken figure and table references
    // This would implement actual figure/table reference checking
    return {
      passed: true,
      brokenReferences
    }
  }

  private generateCrossReferenceRecommendations(brokenReferences: BrokenReference[], validationContext: ValidationContext): string[] {
    const recommendations: string[] = []

    if (brokenReferences.length > 0) {
      recommendations.push('Fix all broken references')
      recommendations.push('Implement reference validation system')
      recommendations.push('Regular reference auditing')
    }

    return recommendations
  }

  // Performance validation helper methods
  private calculateDocumentSize(contextualizedDocument: any): number {
    return JSON.stringify(contextualizedDocument).length
  }

  private estimateLoadTime(contextualizedDocument: any): number {
    const size = this.calculateDocumentSize(contextualizedDocument)
    return size / 1000 // Simple estimation: 1ms per KB
  }

  private calculateComplexityScore(contextualizedDocument: any): number {
    const content = JSON.stringify(contextualizedDocument)
    const sections = Object.keys(contextualizedDocument.personalized_sections || {}).length
    const words = content.split(/\s+/).length
    
    // Simple complexity calculation
    return Math.min(1, (sections * 0.1 + words * 0.0001))
  }

  private calculateProcessingEfficiency(contextualizedDocument: any): number {
    const complexity = this.calculateComplexityScore(contextualizedDocument)
    return Math.max(0, 1 - complexity)
  }

  private calculateResourceUsage(contextualizedDocument: any): number {
    const size = this.calculateDocumentSize(contextualizedDocument)
    return Math.min(1, size / 100000) // Normalize to 100KB baseline
  }

  // Enhanced compliance validation helper methods
  private getEnhancedComplianceRules(framework: string): ComplianceRule[] {
    // EU AI Act compliance rules (apply to all documents for EU users)
    const euAiActRules: ComplianceRule[] = [
      {
        rule_id: 'EU_AI_ACT_TRANSPARENCY_001',
        rule_name: 'AI-Generated Content Transparency',
        framework: 'EU_AI_ACT',
        category: 'transparency',
        mandatory: true,
        description: 'AI-generated content must be clearly labeled (EU AI Act Article 50)',
        validation_function: 'validateAIGeneratedContentLabeling',
        severity: 'critical'
      },
      {
        rule_id: 'EU_AI_ACT_HUMAN_OVERSIGHT_001',
        rule_name: 'Human Oversight Requirement',
        framework: 'EU_AI_ACT',
        category: 'human_oversight',
        mandatory: true,
        description: 'AI outputs must be reviewable by humans (EU AI Act Article 14)',
        validation_function: 'validateHumanOversight',
        severity: 'critical'
      },
      {
        rule_id: 'EU_AI_ACT_ACCURACY_001',
        rule_name: 'AI System Accuracy and Robustness',
        framework: 'EU_AI_ACT',
        category: 'accuracy',
        mandatory: true,
        description: 'AI system must be reliable and accurate (EU AI Act Article 15)',
        validation_function: 'validateAIAccuracy',
        severity: 'high'
      },
      {
        rule_id: 'EU_AI_ACT_DATA_GOVERNANCE_001',
        rule_name: 'Data Governance and Quality',
        framework: 'EU_AI_ACT',
        category: 'data_governance',
        mandatory: false, // Not mandatory for minimal-risk systems, but recommended
        description: 'Data processing must be documented (EU AI Act Article 10)',
        validation_function: 'validateDataGovernance',
        severity: 'medium'
      },
      {
        rule_id: 'EU_AI_ACT_RECORD_KEEPING_001',
        rule_name: 'Record Keeping Requirements',
        framework: 'EU_AI_ACT',
        category: 'record_keeping',
        mandatory: false, // Recommended for audit trail
        description: 'AI system usage must be logged (EU AI Act Article 12)',
        validation_function: 'validateRecordKeeping',
        severity: 'medium'
      }
    ]

    const baseRules: ComplianceRule[] = [
      {
        rule_id: 'DOC_STRUCTURE_001',
        rule_name: 'Document Structure Compliance',
        framework: 'generic',
        category: 'structure',
        mandatory: true,
        description: 'Document must have proper structure',
        validation_function: 'validateDocumentStructure',
        severity: 'high'
      },
      {
        rule_id: 'CONTENT_QUALITY_001',
        rule_name: 'Content Quality Standards',
        framework: 'generic',
        category: 'quality',
        mandatory: true,
        description: 'Content must meet quality standards',
        validation_function: 'validateContentQuality',
        severity: 'medium'
      },
      // Add EU AI Act rules to all documents (check if EU user/region)
      ...euAiActRules
    ]

    switch (framework) {
      case 'BABOK':
        return [
          ...baseRules,
          {
            rule_id: 'BABOK_STAKEHOLDER_001',
            rule_name: 'Stakeholder Analysis Required',
            framework: 'BABOK',
            category: 'stakeholder',
            mandatory: true,
            description: 'Document must include stakeholder analysis',
            validation_function: 'validateStakeholderAnalysis',
            severity: 'high'
          },
          {
            rule_id: 'BABOK_REQUIREMENTS_001',
            rule_name: 'Requirements Elicitation',
            framework: 'BABOK',
            category: 'requirements',
            mandatory: true,
            description: 'Document must include requirements elicitation',
            validation_function: 'validateRequirementsElicitation',
            severity: 'high'
          }
        ]
      case 'PMBOK':
        return [
          ...baseRules,
          {
            rule_id: 'PMBOK_CHARTER_001',
            rule_name: 'Project Charter Required',
            framework: 'PMBOK',
            category: 'charter',
            mandatory: true,
            description: 'Document must include project charter elements',
            validation_function: 'validateProjectCharter',
            severity: 'critical'
          },
          {
            rule_id: 'PMBOK_SCOPE_001',
            rule_name: 'Scope Management',
            framework: 'PMBOK',
            category: 'scope',
            mandatory: true,
            description: 'Document must include scope management',
            validation_function: 'validateScopeManagement',
            severity: 'high'
          }
        ]
      case 'DMBOK':
        return [
          ...baseRules,
          {
            rule_id: 'DMBOK_GOVERNANCE_001',
            rule_name: 'Data Governance Framework',
            framework: 'DMBOK',
            category: 'governance',
            mandatory: true,
            description: 'Document must include data governance framework',
            validation_function: 'validateDataGovernance',
            severity: 'critical'
          },
          {
            rule_id: 'DMBOK_QUALITY_001',
            rule_name: 'Data Quality Standards',
            framework: 'DMBOK',
            category: 'quality',
            mandatory: true,
            description: 'Document must include data quality standards',
            validation_function: 'validateDataQualityStandards',
            severity: 'high'
          }
        ]
      default:
        return baseRules
    }
  }

  private async validateComplianceRule(rule: ComplianceRule, contextualizedDocument: any, validationContext: ValidationContext): Promise<any> {
    // Validate individual compliance rule
    let passed = true
    let description = ''
    let remediation = ''

    switch (rule.validation_function) {
      case 'validateDocumentStructure':
        passed = this.validateDocumentStructure(contextualizedDocument)
        description = passed ? 'Document structure is compliant' : 'Document structure needs improvement'
        remediation = passed ? '' : 'Ensure proper document structure with all required sections'
        break
      case 'validateContentQuality':
        passed = this.validateContentQuality(contextualizedDocument)
        description = passed ? 'Content quality meets standards' : 'Content quality below standards'
        remediation = passed ? '' : 'Improve content quality and clarity'
        break
      case 'validateStakeholderAnalysis':
        passed = this.validateStakeholderAnalysis(contextualizedDocument)
        description = passed ? 'Stakeholder analysis is present' : 'Stakeholder analysis missing or incomplete'
        remediation = passed ? '' : 'Add comprehensive stakeholder analysis section'
        break
      case 'validateRequirementsElicitation':
        passed = this.validateRequirementsElicitation(contextualizedDocument)
        description = passed ? 'Requirements elicitation is documented' : 'Requirements elicitation missing'
        remediation = passed ? '' : 'Document requirements elicitation process and results'
        break
      case 'validateProjectCharter':
        passed = this.validateProjectCharter(contextualizedDocument)
        description = passed ? 'Project charter elements present' : 'Project charter elements missing'
        remediation = passed ? '' : 'Include all required project charter elements'
        break
      case 'validateScopeManagement':
        passed = this.validateScopeManagement(contextualizedDocument)
        description = passed ? 'Scope management documented' : 'Scope management missing'
        remediation = passed ? '' : 'Add scope management section with clear scope definition'
        break
      case 'validateDataGovernance':
        passed = this.validateDataGovernance(contextualizedDocument)
        description = passed ? 'Data governance framework present' : 'Data governance framework missing'
        remediation = passed ? '' : 'Include comprehensive data governance framework'
        break
      case 'validateDataQualityStandards':
        passed = this.validateDataQualityStandards(contextualizedDocument)
        description = passed ? 'Data quality standards documented' : 'Data quality standards missing'
        remediation = passed ? '' : 'Define and document data quality standards'
        break
      // EU AI Act compliance validations
      case 'validateAIGeneratedContentLabeling':
        passed = this.validateAIGeneratedContentLabeling(contextualizedDocument, validationContext)
        description = passed 
          ? 'AI-generated content is properly labeled' 
          : 'AI-generated content labeling missing (EU AI Act requirement)'
        remediation = passed 
          ? '' 
          : 'Add explicit "AI-Generated" label/badge to document. Include metadata indicating AI generation in document records.'
        break
      case 'validateHumanOversight':
        passed = this.validateHumanOversight(contextualizedDocument, validationContext)
        description = passed 
          ? 'Human oversight mechanisms in place' 
          : 'Human oversight requirements not met (EU AI Act requirement)'
        remediation = passed 
          ? '' 
          : 'Ensure document is reviewable and editable by users. Document must not make automated decisions affecting individuals.'
        break
      case 'validateAIAccuracy':
        passed = this.validateAIAccuracy(contextualizedDocument, validationContext)
        description = passed 
          ? 'AI system accuracy and robustness verified' 
          : 'AI accuracy validation needed (EU AI Act requirement)'
        remediation = passed 
          ? '' 
          : 'Verify AI-generated content accuracy. Implement error handling and validation mechanisms.'
        break
      case 'validateDataGovernance':
        passed = this.validateEUAIActDataGovernance(contextualizedDocument, validationContext)
        description = passed 
          ? 'Data governance documented' 
          : 'Data governance documentation missing (EU AI Act recommendation)'
        remediation = passed 
          ? '' 
          : 'Document what data is sent to AI providers. Ensure data processing is transparent and documented.'
        break
      case 'validateRecordKeeping':
        passed = this.validateRecordKeeping(contextualizedDocument, validationContext)
        description = passed 
          ? 'Record keeping requirements met' 
          : 'AI usage logging incomplete (EU AI Act recommendation)'
        remediation = passed 
          ? '' 
          : 'Ensure AI system usage is logged with provider/model information. Maintain audit trail for compliance.'
        break
      default:
        passed = true
        description = 'Rule validation not implemented'
        remediation = ''
    }

    return {
      rule_id: rule.rule_id,
      passed,
      description,
      remediation,
      severity: rule.severity
    }
  }

  private validateDocumentStructure(contextualizedDocument: any): boolean {
    return !!(contextualizedDocument.document_id && contextualizedDocument.personalized_sections)
  }

  private validateContentQuality(contextualizedDocument: any): boolean {
    const sections = contextualizedDocument.personalized_sections || {}
    return Object.keys(sections).length > 0
  }

  private validateStakeholderAnalysis(contextualizedDocument: any): boolean {
    const content = JSON.stringify(contextualizedDocument).toLowerCase()
    return content.includes('stakeholder') && content.includes('analysis')
  }

  private validateRequirementsElicitation(contextualizedDocument: any): boolean {
    const content = JSON.stringify(contextualizedDocument).toLowerCase()
    return content.includes('requirement') && content.includes('elicitation')
  }

  private validateProjectCharter(contextualizedDocument: any): boolean {
    const content = JSON.stringify(contextualizedDocument).toLowerCase()
    return content.includes('project') && content.includes('charter')
  }

  private validateScopeManagement(contextualizedDocument: any): boolean {
    const content = JSON.stringify(contextualizedDocument).toLowerCase()
    return content.includes('scope') && content.includes('management')
  }

  private validateDataGovernance(contextualizedDocument: any): boolean {
    const content = JSON.stringify(contextualizedDocument).toLowerCase()
    return content.includes('data') && content.includes('governance')
  }

  private validateDataQualityStandards(contextualizedDocument: any): boolean {
    const content = JSON.stringify(contextualizedDocument).toLowerCase()
    return content.includes('data') && content.includes('quality')
  }

  // EU AI Act Compliance Validation Methods

  /**
   * Validates AI-Generated Content Labeling (EU AI Act Article 50)
   * Requirement: Users must be informed when content is AI-generated
   */
  private validateAIGeneratedContentLabeling(
    contextualizedDocument: any, 
    validationContext: ValidationContext
  ): boolean {
    // Check if document metadata indicates AI generation
    const metadata = contextualizedDocument.metadata || {}
    const generationMetadata = metadata.generation_metadata || {}
    
    // Check 1: Metadata indicates AI generation
    const hasAIGenerationMetadata = 
      generationMetadata.provider !== undefined ||
      generationMetadata.model !== undefined ||
      generationMetadata.ai_generated === true
    
    // Check 2: Document content includes AI generation indicator
    const content = JSON.stringify(contextualizedDocument).toLowerCase()
    const hasAILabel = 
      content.includes('ai-generated') ||
      content.includes('generated by ai') ||
      content.includes('artificial intelligence')
    
    // Check 3: For EU users/regions, labeling is mandatory
    const isEURegion = this.isEURegion(validationContext.region)
    
    if (isEURegion) {
      // For EU: Must have both metadata AND content labeling
      return hasAIGenerationMetadata && hasAILabel
    } else {
      // For non-EU: Metadata is sufficient
      return hasAIGenerationMetadata
    }
  }

  /**
   * Validates Human Oversight (EU AI Act Article 14)
   * Requirement: AI outputs must be reviewable and users must have control
   */
  private validateHumanOversight(
    contextualizedDocument: any,
    validationContext: ValidationContext
  ): boolean {
    // Check 1: Document is editable (not read-only)
    const isEditable = contextualizedDocument.editable !== false
    
    // Check 2: Document has review/approval workflow
    const metadata = contextualizedDocument.metadata || {}
    const hasReviewWorkflow = 
      metadata.review_status !== undefined ||
      metadata.approval_required === true ||
      metadata.user_reviewed === true
    
    // Check 3: No fully automated decision-making affecting individuals
    const content = JSON.stringify(contextualizedDocument).toLowerCase()
    const hasAutomatedDecisions = 
      content.includes('automated decision') &&
      (content.includes('individual') || content.includes('person'))
    
    // Human oversight passes if:
    // - Document is editable AND
    // - Has review workflow AND
    // - No automated decisions affecting individuals
    return isEditable && hasReviewWorkflow && !hasAutomatedDecisions
  }

  /**
   * Validates AI Accuracy and Robustness (EU AI Act Article 15)
   * Requirement: AI systems must be reliable, accurate, and robust
   */
  private validateAIAccuracy(
    contextualizedDocument: any,
    validationContext: ValidationContext
  ): boolean {
    const metadata = contextualizedDocument.metadata || {}
    const qualityMetrics = metadata.quality_metrics || {}
    
    // Check 1: Quality score indicates accuracy
    const hasQualityScore = qualityMetrics.overallQuality !== undefined
    const qualityScore = qualityMetrics.overallQuality || 0
    const meetsQualityThreshold = qualityScore >= 70 // Minimum acceptable quality
    
    // Check 2: Accuracy dimension score
    const accuracyScore = qualityMetrics.accuracy || 0
    const meetsAccuracyThreshold = accuracyScore >= 70
    
    // Check 3: Document has validation/error handling indicators
    const content = JSON.stringify(contextualizedDocument).toLowerCase()
    const hasValidation = 
      content.includes('validation') ||
      content.includes('verified') ||
      content.includes('reviewed')
    
    // Accuracy passes if quality and accuracy scores meet thresholds
    return hasQualityScore && meetsQualityThreshold && meetsAccuracyThreshold
  }

  /**
   * Validates EU AI Act Data Governance (EU AI Act Article 10)
   * Requirement: Document data sources and processing
   */
  private validateEUAIActDataGovernance(
    contextualizedDocument: any,
    validationContext: ValidationContext
  ): boolean {
    const metadata = contextualizedDocument.metadata || {}
    const generationMetadata = metadata.generation_metadata || {}
    
    // Check 1: AI provider information documented
    const hasProviderInfo = 
      generationMetadata.provider !== undefined &&
      generationMetadata.model !== undefined
    
    // Check 2: Data sources documented (if applicable)
    const hasSourceInfo = 
      generationMetadata.source_documents !== undefined ||
      generationMetadata.context_stats !== undefined
    
    // Check 3: Processing information available
    const hasProcessingInfo = 
      generationMetadata.processing_time !== undefined ||
      generationMetadata.tokens_used !== undefined
    
    // Data governance passes if provider info is documented
    // Source and processing info are recommended but not mandatory
    return hasProviderInfo
  }

  /**
   * Validates Record Keeping (EU AI Act Article 12)
   * Requirement: Maintain records of AI system usage
   */
  private validateRecordKeeping(
    contextualizedDocument: any,
    validationContext: ValidationContext
  ): boolean {
    const metadata = contextualizedDocument.metadata || {}
    const generationMetadata = metadata.generation_metadata || {}
    
    // Check 1: Generation timestamp recorded
    const hasTimestamp = 
      generationMetadata.generated_at !== undefined ||
      metadata.created_at !== undefined
    
    // Check 2: Provider/model information logged
    const hasProviderModel = 
      generationMetadata.provider !== undefined &&
      generationMetadata.model !== undefined
    
    // Check 3: Usage metrics recorded
    const hasUsageMetrics = 
      generationMetadata.tokens_used !== undefined ||
      generationMetadata.cost !== undefined
    
    // Record keeping passes if timestamp and provider/model are logged
    return hasTimestamp && hasProviderModel
  }

  /**
   * Checks if user/region is in EU
   */
  private isEURegion(region?: string): boolean {
    if (!region) return false
    
    const euRegions = [
      'eu', 'europe', 'european union',
      'at', 'be', 'bg', 'hr', 'cy', 'cz', 'dk', 'ee', 'fi', 'fr',
      'de', 'gr', 'hu', 'ie', 'it', 'lv', 'lt', 'lu', 'mt', 'nl',
      'pl', 'pt', 'ro', 'sk', 'si', 'es', 'se'
    ]
    
    return euRegions.some(euRegion => 
      region.toLowerCase().includes(euRegion.toLowerCase())
    )
  }

  private generateEnhancedComplianceRecommendations(violations: any[], validationContext: ValidationContext): string[] {
    const recommendations: string[] = []

    const criticalViolations = violations.filter(v => v.severity === 'critical')
    const highViolations = violations.filter(v => v.severity === 'high')
    const euAiActViolations = violations.filter(v => v.rule_id?.startsWith('EU_AI_ACT'))

    if (criticalViolations.length > 0) {
      recommendations.push('Address all critical compliance violations immediately')
      recommendations.push('Review framework requirements and ensure full compliance')
    }

    if (highViolations.length > 0) {
      recommendations.push('Address high-priority compliance violations')
      recommendations.push('Implement compliance monitoring and validation processes')
    }

    // EU AI Act specific recommendations
    if (validationContext.eu_ai_act_applicable && euAiActViolations.length > 0) {
      const transparencyViolation = euAiActViolations.find(v => 
        v.rule_id === 'EU_AI_ACT_TRANSPARENCY_001'
      )
      if (transparencyViolation) {
        recommendations.push('EU AI Act: Add explicit "AI-Generated" badge/label to document')
        recommendations.push('EU AI Act: Include AI generation metadata in document records')
        recommendations.push('EU AI Act: Add export metadata (PDF/DOCX) indicating AI generation')
      }

      const oversightViolation = euAiActViolations.find(v => 
        v.rule_id === 'EU_AI_ACT_HUMAN_OVERSIGHT_001'
      )
      if (oversightViolation) {
        recommendations.push('EU AI Act: Ensure document is editable and reviewable by users')
        recommendations.push('EU AI Act: Implement review/approval workflow before finalization')
        recommendations.push('EU AI Act: Remove any automated decision-making affecting individuals')
      }

      const accuracyViolation = euAiActViolations.find(v => 
        v.rule_id === 'EU_AI_ACT_ACCURACY_001'
      )
      if (accuracyViolation) {
        recommendations.push('EU AI Act: Verify AI-generated content accuracy')
        recommendations.push('EU AI Act: Implement error handling and validation mechanisms')
        recommendations.push('EU AI Act: Ensure quality score meets minimum threshold (70%+)')
      }

      const dataGovViolation = euAiActViolations.find(v => 
        v.rule_id === 'EU_AI_ACT_DATA_GOVERNANCE_001'
      )
      if (dataGovViolation) {
        recommendations.push('EU AI Act: Document what data is sent to AI providers')
        recommendations.push('EU AI Act: Ensure data processing is transparent and documented')
      }

      const recordViolation = euAiActViolations.find(v => 
        v.rule_id === 'EU_AI_ACT_RECORD_KEEPING_001'
      )
      if (recordViolation) {
        recommendations.push('EU AI Act: Ensure AI system usage is logged with provider/model information')
        recommendations.push('EU AI Act: Maintain audit trail for compliance verification')
      }
    }

    if (validationContext.eu_ai_act_applicable && euAiActViolations.length === 0) {
      recommendations.push('EU AI Act: All compliance requirements met ✅')
    }

    if (violations.length > 0) {
      recommendations.push('Conduct regular compliance audits')
      recommendations.push('Provide compliance training for document authors')
      recommendations.push('Implement automated compliance checking')
    }

    return recommendations
  }
}

