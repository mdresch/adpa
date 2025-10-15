/**
 * Context Extraction Strategy
 * Extracts variable values from project, user, and historical context
 */

import { logger } from '../../../utils/logger'
import type { TemplateVariable, ResolutionContext, ResolutionStrategy } from '../types'

export interface ContextExtractionResult {
  value: any
  source: string
  confidence: number
  extraction_path: string
  extraction_metadata: Record<string, any>
}

export class ContextExtractionStrategy {
  async resolve(
    variable: TemplateVariable,
    context: ResolutionContext,
    config: Record<string, any>
  ): Promise<ContextExtractionResult> {
    try {
      logger.debug('Extracting variable from context', {
        variableId: variable.variable_id,
        variableName: variable.variable_name
      })

      const startTime = Date.now()

      // Try to extract from different context sources
      let extractedValue: any = null
      let extractionSource = ''
      let extractionPath = ''
      let confidence = 0

      // Extract from project context
      if (context.project_context) {
        const projectResult = await this.extractFromProjectContext(variable, context.project_context)
        if (projectResult.value !== null && projectResult.confidence > confidence) {
          extractedValue = projectResult.value
          extractionSource = 'project_context'
          extractionPath = projectResult.path
          confidence = projectResult.confidence
        }
      }

      // Extract from user context
      if (context.user_context && confidence < 0.8) {
        const userResult = await this.extractFromUserContext(variable, context.user_context)
        if (userResult.value !== null && userResult.confidence > confidence) {
          extractedValue = userResult.value
          extractionSource = 'user_context'
          extractionPath = userResult.path
          confidence = userResult.confidence
        }
      }

      // Extract from template context
      if (context.template_context && confidence < 0.8) {
        const templateResult = await this.extractFromTemplateContext(variable, context.template_context)
        if (templateResult.value !== null && templateResult.confidence > confidence) {
          extractedValue = templateResult.value
          extractionSource = 'template_context'
          extractionPath = templateResult.path
          confidence = templateResult.confidence
        }
      }

      // Extract from historical context
      if (context.historical_context && confidence < 0.7) {
        const historicalResult = await this.extractFromHistoricalContext(variable, context.historical_context)
        if (historicalResult.value !== null && historicalResult.confidence > confidence) {
          extractedValue = historicalResult.value
          extractionSource = 'historical_context'
          extractionPath = historicalResult.path
          confidence = historicalResult.confidence
        }
      }

      // Extract from external context
      if (context.external_context && confidence < 0.6) {
        const externalResult = await this.extractFromExternalContext(variable, context.external_context)
        if (externalResult.value !== null && externalResult.confidence > confidence) {
          extractedValue = externalResult.value
          extractionSource = 'external_context'
          extractionPath = externalResult.path
          confidence = externalResult.confidence
        }
      }

      const extractionTime = Date.now() - startTime

      if (extractedValue === null) {
        throw new Error(`Could not extract value for variable ${variable.variable_name} from context`)
      }

      logger.info('Context extraction completed', {
        variableId: variable.variable_id,
        extractionSource,
        extractionPath,
        confidence,
        extractionTime
      })

      return {
        value: extractedValue,
        source: extractionSource,
        confidence,
        extraction_path: extractionPath,
        extraction_metadata: {
          extraction_time: extractionTime,
          variable_type: variable.variable_type,
          extraction_strategy: 'context_extraction'
        }
      }

    } catch (error) {
      logger.error('Context extraction failed', {
        variableId: variable.variable_id,
        error: error.message
      })
      throw error
    }
  }

  private async extractFromProjectContext(variable: TemplateVariable, projectContext: any): Promise<{
    value: any
    path: string
    confidence: number
  }> {
    const variableName = variable.variable_name.toLowerCase()
    let value: any = null
    let path = ''
    let confidence = 0

    // Try direct property matching
    if (projectContext[variableName]) {
      value = projectContext[variableName]
      path = `project_context.${variableName}`
      confidence = 0.9
    }

    // Try nested property matching
    if (value === null) {
      const nestedPaths = [
        'project_name',
        'project_description',
        'project_type',
        'stakeholders',
        'requirements',
        'constraints',
        'risks',
        'milestones',
        'phases'
      ]

      for (const nestedPath of nestedPaths) {
        if (projectContext[nestedPath]) {
          if (this.matchesVariableName(variableName, nestedPath)) {
            value = projectContext[nestedPath]
            path = `project_context.${nestedPath}`
            confidence = 0.8
            break
          }
        }
      }
    }

    // Try array/object extraction
    if (value === null) {
      value = await this.extractFromProjectArrays(variable, projectContext)
      if (value !== null) {
        path = 'project_context.arrays'
        confidence = 0.7
      }
    }

    return { value, path, confidence }
  }

  private async extractFromUserContext(variable: TemplateVariable, userContext: any): Promise<{
    value: any
    path: string
    confidence: number
  }> {
    const variableName = variable.variable_name.toLowerCase()
    let value: any = null
    let path = ''
    let confidence = 0

    // Try user profile extraction
    if (userContext.user_profile) {
      const profile = userContext.user_profile
      if (profile[variableName]) {
        value = profile[variableName]
        path = `user_context.user_profile.${variableName}`
        confidence = 0.9
      }
    }

    // Try user preferences extraction
    if (value === null && userContext.user_preferences) {
      for (const preference of userContext.user_preferences) {
        if (this.matchesVariableName(variableName, preference.preference_type)) {
          value = preference.preference_value
          path = `user_context.user_preferences.${preference.preference_type}`
          confidence = 0.8
          break
        }
      }
    }

    // Try user expertise extraction
    if (value === null && userContext.user_expertise) {
      for (const expertise of userContext.user_expertise) {
        if (this.matchesVariableName(variableName, expertise.domain)) {
          value = expertise
          path = `user_context.user_expertise.${expertise.domain}`
          confidence = 0.7
          break
        }
      }
    }

    return { value, path, confidence }
  }

  private async extractFromTemplateContext(variable: TemplateVariable, templateContext: any): Promise<{
    value: any
    path: string
    confidence: number
  }> {
    const variableName = variable.variable_name.toLowerCase()
    let value: any = null
    let path = ''
    let confidence = 0

    // Try template metadata extraction
    if (templateContext.template_metadata) {
      const metadata = templateContext.template_metadata
      if (metadata[variableName]) {
        value = metadata[variableName]
        path = `template_context.template_metadata.${variableName}`
        confidence = 0.8
      }
    }

    // Try template structure extraction
    if (value === null && templateContext.template_structure) {
      value = await this.extractFromTemplateStructure(variable, templateContext.template_structure)
      if (value !== null) {
        path = 'template_context.template_structure'
        confidence = 0.7
      }
    }

    return { value, path, confidence }
  }

  private async extractFromHistoricalContext(variable: TemplateVariable, historicalContext: any): Promise<{
    value: any
    path: string
    confidence: number
  }> {
    const variableName = variable.variable_name.toLowerCase()
    let value: any = null
    let path = ''
    let confidence = 0

    // Try document history extraction
    if (historicalContext.document_history) {
      for (const doc of historicalContext.document_history) {
        if (this.matchesVariableName(variableName, doc.document_name)) {
          value = doc
          path = `historical_context.document_history.${doc.document_id}`
          confidence = 0.6
          break
        }
      }
    }

    // Try usage patterns extraction
    if (value === null && historicalContext.usage_patterns) {
      for (const pattern of historicalContext.usage_patterns) {
        if (this.matchesVariableName(variableName, pattern.pattern_type)) {
          value = pattern
          path = `historical_context.usage_patterns.${pattern.pattern_id}`
          confidence = 0.5
          break
        }
      }
    }

    return { value, path, confidence }
  }

  private async extractFromExternalContext(variable: TemplateVariable, externalContext: any): Promise<{
    value: any
    path: string
    confidence: number
  }> {
    const variableName = variable.variable_name.toLowerCase()
    let value: any = null
    let path = ''
    let confidence = 0

    // Try API responses extraction
    if (externalContext.api_responses) {
      for (const response of externalContext.api_responses) {
        if (response.response_data && typeof response.response_data === 'object') {
          const extracted = await this.extractFromObject(variable, response.response_data)
          if (extracted !== null) {
            value = extracted
            path = `external_context.api_responses.${response.response_id}`
            confidence = 0.6
            break
          }
        }
      }
    }

    // Try file contents extraction
    if (value === null && externalContext.file_contents) {
      for (const file of externalContext.file_contents) {
        if (file.file_content && typeof file.file_content === 'object') {
          const extracted = await this.extractFromObject(variable, file.file_content)
          if (extracted !== null) {
            value = extracted
            path = `external_context.file_contents.${file.file_id}`
            confidence = 0.5
            break
          }
        }
      }
    }

    return { value, path, confidence }
  }

  private async extractFromProjectArrays(variable: TemplateVariable, projectContext: any): Promise<any> {
    const variableName = variable.variable_name.toLowerCase()

    // Try to extract from stakeholders
    if (projectContext.stakeholders && Array.isArray(projectContext.stakeholders)) {
      for (const stakeholder of projectContext.stakeholders) {
        if (this.matchesVariableName(variableName, stakeholder.name) || 
            this.matchesVariableName(variableName, stakeholder.role)) {
          return stakeholder
        }
      }
    }

    // Try to extract from requirements
    if (projectContext.requirements && Array.isArray(projectContext.requirements)) {
      for (const requirement of projectContext.requirements) {
        if (this.matchesVariableName(variableName, requirement.title)) {
          return requirement
        }
      }
    }

    // Try to extract from risks
    if (projectContext.risks && Array.isArray(projectContext.risks)) {
      for (const risk of projectContext.risks) {
        if (this.matchesVariableName(variableName, risk.title)) {
          return risk
        }
      }
    }

    return null
  }

  private async extractFromTemplateStructure(variable: TemplateVariable, templateStructure: any): Promise<any> {
    const variableName = variable.variable_name.toLowerCase()

    // Try to extract from sections
    if (templateStructure.sections && Array.isArray(templateStructure.sections)) {
      for (const section of templateStructure.sections) {
        if (this.matchesVariableName(variableName, section.section_name)) {
          return section
        }
      }
    }

    return null
  }

  private async extractFromObject(variable: TemplateVariable, obj: any): Promise<any> {
    const variableName = variable.variable_name.toLowerCase()

    // Try direct property access
    if (obj[variableName]) {
      return obj[variableName]
    }

    // Try nested property access
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (this.matchesVariableName(variableName, key)) {
          return obj[key]
        }
        
        // Try nested objects
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          const nested = await this.extractFromObject(variable, obj[key])
          if (nested !== null) {
            return nested
          }
        }
      }
    }

    return null
  }

  private matchesVariableName(variableName: string, targetName: string): boolean {
    if (!targetName) return false
    
    const target = targetName.toLowerCase()
    
    // Exact match
    if (variableName === target) return true
    
    // Partial match
    if (variableName.includes(target) || target.includes(variableName)) return true
    
    // Word boundary match
    const variableWords = variableName.split(/[_\s-]+/)
    const targetWords = target.split(/[_\s-]+/)
    
    for (const vWord of variableWords) {
      for (const tWord of targetWords) {
        if (vWord === tWord && vWord.length > 2) return true
      }
    }
    
    return false
  }
}

