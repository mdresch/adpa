/**
 * Context Validator
 * Validates context data quality and completeness
 */

import { logger } from '@/utils/logger'
import type { ContextGap, ContextValidationResult } from '../types'

export class ContextValidator {
  async identifyContextGaps(contextData: any): Promise<ContextGap[]> {
    try {
      logger.debug('Identifying context gaps')

      const contextGaps: ContextGap[] = []

      // Check for missing project context
      if (!contextData.project_context || !contextData.project_context.project_id) {
        contextGaps.push({
          gap_id: `gap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          gap_type: 'missing_data',
          gap_description: 'Project context is missing or incomplete',
          gap_severity: 'high',
          gap_impact: 'High impact on document generation quality',
          gap_cause: 'Project context not properly gathered',
          gap_solutions: [
            {
              solution_id: `solution_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              solution_type: 'data_collection',
              solution_description: 'Gather complete project context data',
              solution_effort: 'medium',
              solution_success_probability: 0.8,
              solution_implementation: 'Query project database for complete project information',
              solution_metrics: []
            }
          ],
          gap_priority: 1,
          gap_status: 'identified',
          metadata: {}
        })
      }

      // Check for missing user profile context
      if (!contextData.user_profile_context || !contextData.user_profile_context.user_id) {
        contextGaps.push({
          gap_id: `gap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          gap_type: 'missing_data',
          gap_description: 'User profile context is missing or incomplete',
          gap_severity: 'medium',
          gap_impact: 'Medium impact on document personalization',
          gap_cause: 'User profile context not properly gathered',
          gap_solutions: [
            {
              solution_id: `solution_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              solution_type: 'data_collection',
              solution_description: 'Gather complete user profile context data',
              solution_effort: 'low',
              solution_success_probability: 0.9,
              solution_implementation: 'Query user database for complete user information',
              solution_metrics: []
            }
          ],
          gap_priority: 2,
          gap_status: 'identified',
          metadata: {}
        })
      }

      // Check for missing template context
      if (!contextData.template_context || !contextData.template_context.template_id) {
        contextGaps.push({
          gap_id: `gap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          gap_type: 'missing_data',
          gap_description: 'Template context is missing or incomplete',
          gap_severity: 'critical',
          gap_impact: 'Critical impact on document generation',
          gap_cause: 'Template context not properly gathered',
          gap_solutions: [
            {
              solution_id: `solution_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              solution_type: 'data_collection',
              solution_description: 'Gather complete template context data',
              solution_effort: 'low',
              solution_success_probability: 0.95,
              solution_implementation: 'Query template database for complete template information',
              solution_metrics: []
            }
          ],
          gap_priority: 0,
          gap_status: 'identified',
          metadata: {}
        })
      }

      // Check for low quality data
      const qualityGaps = this.identifyQualityGaps(contextData)
      contextGaps.push(...qualityGaps)

      // Check for outdated data
      const freshnessGaps = this.identifyFreshnessGaps(contextData)
      contextGaps.push(...freshnessGaps)

      // Check for incomplete data
      const completenessGaps = this.identifyCompletenessGaps(contextData)
      contextGaps.push(...completenessGaps)

      logger.info('Context gaps identified', {
        gapCount: contextGaps.length,
        criticalGaps: contextGaps.filter(g => g.gap_severity === 'critical').length,
        highGaps: contextGaps.filter(g => g.gap_severity === 'high').length
      })

      return contextGaps

    } catch (error) {
      logger.error('Failed to identify context gaps', {
        error: error.message
      })
      throw error
    }
  }

  async validateContextCompleteness(contextData: any): Promise<ContextValidationResult> {
    try {
      logger.debug('Validating context completeness')

      const validationErrors: any[] = []
      const validationWarnings: any[] = []
      const validationSuggestions: any[] = []

      let validationScore = 1.0
      let valid = true

      // Validate project context completeness
      if (contextData.project_context) {
        const projectValidation = this.validateProjectContext(contextData.project_context)
        if (!projectValidation.valid) {
          valid = false
          validationScore -= 0.2
          validationErrors.push(...projectValidation.errors)
          validationWarnings.push(...projectValidation.warnings)
        }
        validationSuggestions.push(...projectValidation.suggestions)
      } else {
        valid = false
        validationScore -= 0.3
        validationErrors.push({
          error_id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          error_type: 'missing_context',
          error_message: 'Project context is missing',
          error_severity: 'high',
          error_location: 'contextData.project_context',
          error_context: {},
          error_suggestions: ['Gather project context data']
        })
      }

      // Validate user profile context completeness
      if (contextData.user_profile_context) {
        const userValidation = this.validateUserProfileContext(contextData.user_profile_context)
        if (!userValidation.valid) {
          validationScore -= 0.1
          validationWarnings.push(...userValidation.warnings)
        }
        validationSuggestions.push(...userValidation.suggestions)
      } else {
        validationScore -= 0.15
        validationWarnings.push({
          warning_id: `warning_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          warning_type: 'missing_context',
          warning_message: 'User profile context is missing',
          warning_impact: 'Document personalization may be limited',
          warning_location: 'contextData.user_profile_context',
          warning_context: {},
          warning_suggestions: ['Gather user profile context data']
        })
      }

      // Validate template context completeness
      if (contextData.template_context) {
        const templateValidation = this.validateTemplateContext(contextData.template_context)
        if (!templateValidation.valid) {
          valid = false
          validationScore -= 0.2
          validationErrors.push(...templateValidation.errors)
          validationWarnings.push(...templateValidation.warnings)
        }
        validationSuggestions.push(...templateValidation.suggestions)
      } else {
        valid = false
        validationScore -= 0.3
        validationErrors.push({
          error_id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          error_type: 'missing_context',
          error_message: 'Template context is missing',
          error_severity: 'critical',
          error_location: 'contextData.template_context',
          error_context: {},
          error_suggestions: ['Gather template context data']
        })
      }

      // Validate document history context completeness
      if (contextData.document_history_context) {
        const historyValidation = this.validateDocumentHistoryContext(contextData.document_history_context)
        if (!historyValidation.valid) {
          validationScore -= 0.05
          validationWarnings.push(...historyValidation.warnings)
        }
        validationSuggestions.push(...historyValidation.suggestions)
      }

      // Validate external context completeness
      if (contextData.external_context) {
        const externalValidation = this.validateExternalContext(contextData.external_context)
        if (!externalValidation.valid) {
          validationScore -= 0.05
          validationWarnings.push(...externalValidation.warnings)
        }
        validationSuggestions.push(...externalValidation.suggestions)
      }

      const validationResult: ContextValidationResult = {
        valid,
        validation_score: Math.max(0, validationScore),
        validation_errors: validationErrors,
        validation_warnings: validationWarnings,
        validation_suggestions: validationSuggestions,
        validation_metadata: {
          validation_timestamp: new Date(),
          validation_duration: 100, // Simplified
          context_sources_validated: Object.keys(contextData).length,
          validation_confidence: 0.9
        }
      }

      logger.info('Context completeness validation completed', {
        valid,
        validationScore,
        errorCount: validationErrors.length,
        warningCount: validationWarnings.length,
        suggestionCount: validationSuggestions.length
      })

      return validationResult

    } catch (error) {
      logger.error('Failed to validate context completeness', {
        error: error.message
      })
      throw error
    }
  }

  private identifyQualityGaps(contextData: any): ContextGap[] {
    const qualityGaps: ContextGap[] = []

    // Check project context quality
    if (contextData.project_context?.metadata?.analysis_confidence < 0.7) {
      qualityGaps.push({
        gap_id: `gap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        gap_type: 'low_quality_data',
        gap_description: 'Project context has low quality score',
        gap_severity: 'medium',
        gap_impact: 'Medium impact on document accuracy',
        gap_cause: 'Incomplete or inaccurate project data',
        gap_solutions: [
          {
            solution_id: `solution_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            solution_type: 'data_improvement',
            solution_description: 'Improve project data quality',
            solution_effort: 'medium',
            solution_success_probability: 0.7,
            solution_implementation: 'Validate and enhance project data sources',
            solution_metrics: []
          }
        ],
        gap_priority: 3,
        gap_status: 'identified',
        metadata: {}
      })
    }

    // Check user profile context quality
    if (contextData.user_profile_context?.metadata?.analysis_confidence < 0.7) {
      qualityGaps.push({
        gap_id: `gap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        gap_type: 'low_quality_data',
        gap_description: 'User profile context has low quality score',
        gap_severity: 'low',
        gap_impact: 'Low impact on document personalization',
        gap_cause: 'Incomplete or inaccurate user profile data',
        gap_solutions: [
          {
            solution_id: `solution_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            solution_type: 'data_improvement',
            solution_description: 'Improve user profile data quality',
            solution_effort: 'low',
            solution_success_probability: 0.8,
            solution_implementation: 'Validate and enhance user profile data',
            solution_metrics: []
          }
        ],
        gap_priority: 4,
        gap_status: 'identified',
        metadata: {}
      })
    }

    return qualityGaps
  }

  private identifyFreshnessGaps(contextData: any): ContextGap[] {
    const freshnessGaps: ContextGap[] = []

    // Check project context freshness
    if (contextData.project_context?.metadata?.data_freshness) {
      const freshness = new Date(contextData.project_context.metadata.data_freshness)
      const now = new Date()
      const hoursDiff = (now.getTime() - freshness.getTime()) / (1000 * 60 * 60)
      
      if (hoursDiff > 24) {
        freshnessGaps.push({
          gap_id: `gap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          gap_type: 'outdated_data',
          gap_description: 'Project context data is outdated',
          gap_severity: 'medium',
          gap_impact: 'Medium impact on document accuracy',
          gap_cause: 'Project context not refreshed recently',
          gap_solutions: [
            {
              solution_id: `solution_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              solution_type: 'data_refresh',
              solution_description: 'Refresh project context data',
              solution_effort: 'low',
              solution_success_probability: 0.9,
              solution_implementation: 'Trigger project context refresh',
              solution_metrics: []
            }
          ],
          gap_priority: 3,
          gap_status: 'identified',
          metadata: {}
        })
      }
    }

    return freshnessGaps
  }

  private identifyCompletenessGaps(contextData: any): ContextGap[] {
    const completenessGaps: ContextGap[] = []

    // Check if project context has essential fields
    if (contextData.project_context && !contextData.project_context.stakeholders?.length) {
      completenessGaps.push({
        gap_id: `gap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        gap_type: 'incomplete_data',
        gap_description: 'Project context missing stakeholder information',
        gap_severity: 'medium',
        gap_impact: 'Medium impact on stakeholder analysis',
        gap_cause: 'Stakeholder data not gathered',
        gap_solutions: [
          {
            solution_id: `solution_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            solution_type: 'data_collection',
            solution_description: 'Gather stakeholder information',
            solution_effort: 'medium',
            solution_success_probability: 0.8,
            solution_implementation: 'Query stakeholder database',
            solution_metrics: []
          }
        ],
        gap_priority: 3,
        gap_status: 'identified',
        metadata: {}
      })
    }

    // Check if user profile context has essential fields
    if (contextData.user_profile_context && !contextData.user_profile_context.user_preferences?.length) {
      completenessGaps.push({
        gap_id: `gap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        gap_type: 'incomplete_data',
        gap_description: 'User profile context missing preferences',
        gap_severity: 'low',
        gap_impact: 'Low impact on personalization',
        gap_cause: 'User preferences not gathered',
        gap_solutions: [
          {
            solution_id: `solution_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            solution_type: 'data_collection',
            solution_description: 'Gather user preferences',
            solution_effort: 'low',
            solution_success_probability: 0.9,
            solution_implementation: 'Query user preferences database',
            solution_metrics: []
          }
        ],
        gap_priority: 4,
        gap_status: 'identified',
        metadata: {}
      })
    }

    return completenessGaps
  }

  private validateProjectContext(projectContext: any): any {
    const errors: any[] = []
    const warnings: any[] = []
    const suggestions: any[] = []
    let valid = true

    // Validate required fields
    if (!projectContext.project_id) {
      valid = false
      errors.push({
        error_id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        error_type: 'missing_field',
        error_message: 'Project ID is required',
        error_severity: 'critical',
        error_location: 'project_context.project_id',
        error_context: {},
        error_suggestions: ['Provide valid project ID']
      })
    }

    if (!projectContext.project_name) {
      warnings.push({
        warning_id: `warning_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        warning_type: 'missing_field',
        warning_message: 'Project name is missing',
        warning_impact: 'Document may lack project identification',
        warning_location: 'project_context.project_name',
        warning_context: {},
        warning_suggestions: ['Provide project name']
      })
    }

    // Validate data quality
    if (projectContext.metadata?.analysis_confidence < 0.8) {
      suggestions.push({
        suggestion_id: `suggestion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        suggestion_type: 'quality_improvement',
        suggestion_message: 'Consider improving project data quality',
        suggestion_impact: 'Better document generation results',
        suggestion_location: 'project_context.metadata.analysis_confidence',
        suggestion_context: {},
        suggestion_implementation: 'Validate and enhance project data sources'
      })
    }

    return { valid, errors, warnings, suggestions }
  }

  private validateUserProfileContext(userProfileContext: any): any {
    const errors: any[] = []
    const warnings: any[] = []
    const suggestions: any[] = []
    let valid = true

    // Validate required fields
    if (!userProfileContext.user_id) {
      valid = false
      errors.push({
        error_id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        error_type: 'missing_field',
        error_message: 'User ID is required',
        error_severity: 'critical',
        error_location: 'user_profile_context.user_id',
        error_context: {},
        error_suggestions: ['Provide valid user ID']
      })
    }

    // Validate data completeness
    if (!userProfileContext.user_preferences?.length) {
      warnings.push({
        warning_id: `warning_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        warning_type: 'incomplete_data',
        warning_message: 'User preferences are missing',
        warning_impact: 'Limited personalization options',
        warning_location: 'user_profile_context.user_preferences',
        warning_context: {},
        warning_suggestions: ['Gather user preferences']
      })
    }

    return { valid, errors, warnings, suggestions }
  }

  private validateTemplateContext(templateContext: any): any {
    const errors: any[] = []
    const warnings: any[] = []
    const suggestions: any[] = []
    let valid = true

    // Validate required fields
    if (!templateContext.template_id) {
      valid = false
      errors.push({
        error_id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        error_type: 'missing_field',
        error_message: 'Template ID is required',
        error_severity: 'critical',
        error_location: 'template_context.template_id',
        error_context: {},
        error_suggestions: ['Provide valid template ID']
      })
    }

    if (!templateContext.template_name) {
      warnings.push({
        warning_id: `warning_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        warning_type: 'missing_field',
        warning_message: 'Template name is missing',
        warning_impact: 'Document may lack template identification',
        warning_location: 'template_context.template_name',
        warning_context: {},
        warning_suggestions: ['Provide template name']
      })
    }

    // Validate template variables
    if (!templateContext.template_variables?.length) {
      warnings.push({
        warning_id: `warning_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        warning_type: 'incomplete_data',
        warning_message: 'Template variables are missing',
        warning_impact: 'Limited template customization',
        warning_location: 'template_context.template_variables',
        warning_context: {},
        warning_suggestions: ['Define template variables']
      })
    }

    return { valid, errors, warnings, suggestions }
  }

  private validateDocumentHistoryContext(documentHistoryContext: any): any {
    const errors: any[] = []
    const warnings: any[] = []
    const suggestions: any[] = []
    let valid = true

    // Document history is optional, so no critical errors
    if (!documentHistoryContext.document_history?.length) {
      suggestions.push({
        suggestion_id: `suggestion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        suggestion_type: 'data_enhancement',
        suggestion_message: 'Consider gathering document history for better context',
        suggestion_impact: 'Improved document generation based on historical patterns',
        suggestion_location: 'document_history_context.document_history',
        suggestion_context: {},
        suggestion_implementation: 'Query document history database'
      })
    }

    return { valid, errors, warnings, suggestions }
  }

  private validateExternalContext(externalContext: any): any {
    const errors: any[] = []
    const warnings: any[] = []
    const suggestions: any[] = []
    let valid = true

    // External context is optional, so no critical errors
    if (!externalContext.external_sources?.length) {
      suggestions.push({
        suggestion_id: `suggestion_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        suggestion_type: 'data_enhancement',
        suggestion_message: 'Consider gathering external context for richer information',
        suggestion_impact: 'Enhanced document content with external insights',
        suggestion_location: 'external_context.external_sources',
        suggestion_context: {},
        suggestion_implementation: 'Configure external data sources'
      })
    }

    return { valid, errors, warnings, suggestions }
  }
}
