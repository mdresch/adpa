/**
 * User Profile Strategy
 * Extracts variable values from user profile and preferences
 */

import { logger } from '../../../utils/logger'
import type { TemplateVariable, ResolutionContext, ResolutionStrategy } from '../types'

export interface UserProfileResult {
  value: any
  source: string
  confidence: number
  profile_metadata: Record<string, any>
}

export class UserProfileStrategy {
  async resolve(
    variable: TemplateVariable,
    context: ResolutionContext,
    config: Record<string, any>
  ): Promise<UserProfileResult> {
    try {
      logger.debug('Resolving variable using user profile', {
        variableId: variable.variable_id,
        variableName: variable.variable_name
      })

      const startTime = Date.now()

      if (!context.user_context) {
        throw new Error('User context not available for profile-based resolution')
      }

      const userContext = context.user_context
      const variableName = variable.variable_name.toLowerCase()

      let value: any = null
      let source = ''
      let confidence = 0

      // Try to extract from user profile
      if (userContext.user_profile) {
        const profileResult = await this.extractFromUserProfile(variable, userContext.user_profile)
        if (profileResult.value !== null) {
          value = profileResult.value
          source = 'user_profile'
          confidence = profileResult.confidence
        }
      }

      // Try to extract from user preferences
      if (value === null && userContext.user_preferences) {
        const preferenceResult = await this.extractFromUserPreferences(variable, userContext.user_preferences)
        if (preferenceResult.value !== null) {
          value = preferenceResult.value
          source = 'user_preferences'
          confidence = preferenceResult.confidence
        }
      }

      // Try to extract from user expertise
      if (value === null && userContext.user_expertise) {
        const expertiseResult = await this.extractFromUserExpertise(variable, userContext.user_expertise)
        if (expertiseResult.value !== null) {
          value = expertiseResult.value
          source = 'user_expertise'
          confidence = expertiseResult.confidence
        }
      }

      // Try to extract from user writing style
      if (value === null && userContext.user_writing_style) {
        const styleResult = await this.extractFromUserWritingStyle(variable, userContext.user_writing_style)
        if (styleResult.value !== null) {
          value = styleResult.value
          source = 'user_writing_style'
          confidence = styleResult.confidence
        }
      }

      if (value === null) {
        throw new Error(`Could not extract value for variable ${variable.variable_name} from user profile`)
      }

      const processingTime = Date.now() - startTime

      logger.info('User profile resolution completed', {
        variableId: variable.variable_id,
        source,
        confidence,
        processingTime
      })

      return {
        value,
        source,
        confidence,
        profile_metadata: {
          processing_time: processingTime,
          variable_type: variable.variable_type,
          profile_strategy: 'user_profile'
        }
      }

    } catch (error) {
      logger.error('User profile resolution failed', {
        variableId: variable.variable_id,
        error: error.message
      })
      throw error
    }
  }

  private async extractFromUserProfile(variable: TemplateVariable, userProfile: any): Promise<{
    value: any
    confidence: number
  }> {
    const variableName = variable.variable_name.toLowerCase()
    let value: any = null
    let confidence = 0

    // Direct property matching
    if (userProfile[variableName]) {
      value = userProfile[variableName]
      confidence = 0.9
    }

    // Common field mappings
    const fieldMappings: Record<string, string> = {
      'username': 'name',
      'user_name': 'name',
      'full_name': 'name',
      'email_address': 'email',
      'user_email': 'email',
      'job_title': 'role',
      'position': 'role',
      'department_name': 'department',
      'dept': 'department',
      'skills': 'expertise_areas',
      'expertise': 'expertise_areas',
      'domains': 'expertise_areas'
    }

    if (value === null && fieldMappings[variableName]) {
      const mappedField = fieldMappings[variableName]
      if (userProfile[mappedField]) {
        value = userProfile[mappedField]
        confidence = 0.8
      }
    }

    return { value, confidence }
  }

  private async extractFromUserPreferences(variable: TemplateVariable, userPreferences: any[]): Promise<{
    value: any
    confidence: number
  }> {
    const variableName = variable.variable_name.toLowerCase()
    let value: any = null
    let confidence = 0

    for (const preference of userPreferences) {
      if (this.matchesVariableName(variableName, preference.preference_type)) {
        value = preference.preference_value
        confidence = 0.8
        break
      }
    }

    return { value, confidence }
  }

  private async extractFromUserExpertise(variable: TemplateVariable, userExpertise: any[]): Promise<{
    value: any
    confidence: number
  }> {
    const variableName = variable.variable_name.toLowerCase()
    let value: any = null
    let confidence = 0

    for (const expertise of userExpertise) {
      if (this.matchesVariableName(variableName, expertise.domain)) {
        value = expertise
        confidence = 0.7
        break
      }
    }

    return { value, confidence }
  }

  private async extractFromUserWritingStyle(variable: TemplateVariable, userWritingStyle: any): Promise<{
    value: any
    confidence: number
  }> {
    const variableName = variable.variable_name.toLowerCase()
    let value: any = null
    let confidence = 0

    // Direct property matching
    if (userWritingStyle[variableName]) {
      value = userWritingStyle[variableName]
      confidence = 0.8
    }

    // Style-specific mappings
    const styleMappings: Record<string, string> = {
      'writing_tone': 'tone',
      'tone_style': 'tone',
      'formality_level': 'formality',
      'formality': 'formality',
      'structure_pref': 'structure_preference',
      'length_pref': 'length_preference'
    }

    if (value === null && styleMappings[variableName]) {
      const mappedField = styleMappings[variableName]
      if (userWritingStyle[mappedField]) {
        value = userWritingStyle[mappedField]
        confidence = 0.7
      }
    }

    return { value, confidence }
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

