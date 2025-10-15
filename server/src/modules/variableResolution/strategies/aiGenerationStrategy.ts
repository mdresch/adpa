/**
 * AI Generation Strategy
 * Generates variable values using AI models
 */

import { logger } from '@/utils/logger'
import { AIService } from '@/services/aiService'
import type { TemplateVariable, ResolutionContext, ResolutionStrategy } from '../types'

export interface AIGenerationResult {
  value: any
  source: string
  confidence: number
  generation_prompt: string
  generation_metadata: Record<string, any>
}

export class AIGenerationStrategy {
  private aiService: AIService

  constructor() {
    this.aiService = new AIService()
  }

  async resolve(
    variable: TemplateVariable,
    context: ResolutionContext,
    config: Record<string, any>
  ): Promise<AIGenerationResult> {
    try {
      logger.debug('Generating variable value using AI', {
        variableId: variable.variable_id,
        variableName: variable.variable_name
      })

      const startTime = Date.now()

      // Generate prompt for the variable
      const prompt = await this.generatePrompt(variable, context, config)

      // Generate value using AI
      const generatedValue = await this.generateValue(prompt, variable, config)

      // Validate generated value
      const validationResult = await this.validateGeneratedValue(generatedValue, variable)
      if (!validationResult.valid) {
        throw new Error(`Generated value validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`)
      }

      // Calculate confidence based on validation and context
      const confidence = await this.calculateConfidence(generatedValue, variable, context, validationResult)

      const generationTime = Date.now() - startTime

      logger.info('AI generation completed', {
        variableId: variable.variable_id,
        confidence,
        generationTime
      })

      return {
        value: generatedValue,
        source: 'ai_generation',
        confidence,
        generation_prompt: prompt,
        generation_metadata: {
          generation_time: generationTime,
          variable_type: variable.variable_type,
          validation_result: validationResult,
          model_used: response.model,
          provider_used: response.provider,
          generation_strategy: 'ai_generation'
        }
      }

    } catch (error) {
      logger.error('AI generation failed', {
        variableId: variable.variable_id,
        error: error.message
      })
      throw error
    }
  }

  private async generatePrompt(
    variable: TemplateVariable,
    context: ResolutionContext,
    config: Record<string, any>
  ): Promise<string> {
    const variableName = variable.variable_name
    const variableType = variable.variable_type
    const variableDescription = variable.variable_definition.description
    const variableExamples = variable.variable_definition.examples || []

    // Build context information
    const contextInfo = await this.buildContextInfo(context)

    // Build prompt
    let prompt = `Generate a value for the variable "${variableName}" of type "${variableType}".\n\n`
    
    if (variableDescription) {
      prompt += `Description: ${variableDescription}\n\n`
    }

    if (variableExamples.length > 0) {
      prompt += `Examples:\n`
      variableExamples.forEach((example, index) => {
        prompt += `${index + 1}. ${JSON.stringify(example)}\n`
      })
      prompt += '\n'
    }

    if (contextInfo) {
      prompt += `Context Information:\n${contextInfo}\n\n`
    }

    // Add variable constraints
    if (variable.variable_definition.constraints) {
      prompt += `Constraints:\n`
      variable.variable_definition.constraints.forEach(constraint => {
        prompt += `- ${constraint.constraint_type}: ${constraint.constraint_value}\n`
      })
      prompt += '\n'
    }

    // Add generation instructions
    prompt += `Instructions:\n`
    prompt += `- Generate a realistic and appropriate value for this variable\n`
    prompt += `- Ensure the value matches the specified type and constraints\n`
    prompt += `- Use the context information to make the value relevant and meaningful\n`
    prompt += `- Return only the value, not the variable name or any explanation\n`

    // Add format instructions based on variable type
    switch (variableType) {
      case 'string':
        prompt += `- Return a string value\n`
        break
      case 'number':
        prompt += `- Return a numeric value\n`
        break
      case 'boolean':
        prompt += `- Return true or false\n`
        break
      case 'date':
        prompt += `- Return a date in ISO format (YYYY-MM-DD)\n`
        break
      case 'array':
        prompt += `- Return a JSON array\n`
        break
      case 'object':
        prompt += `- Return a JSON object\n`
        break
      case 'markdown':
        prompt += `- Return markdown formatted text\n`
        break
      case 'html':
        prompt += `- Return HTML formatted text\n`
        break
      case 'json':
        prompt += `- Return valid JSON\n`
        break
    }

    return prompt
  }

  private async generateValue(
    prompt: string,
    variable: TemplateVariable,
    config: Record<string, any>
  ): Promise<any> {
    try {
      const response = await this.aiService.generate({
        prompt: prompt,
        provider: config.provider || 'openai',
        model: config.model || 'gpt-4',
        temperature: config.temperature || 0.7,
        max_tokens: config.max_tokens || 500,
        template_id: config.template_id,
        variables: config.variables
      })

      const generatedText = response.content?.trim()
      if (!generatedText) {
        throw new Error('No content generated by AI')
      }

      // Parse the generated value based on variable type
      return await this.parseGeneratedValue(generatedText, variable.variable_type)

    } catch (error) {
      logger.error('AI API call failed', {
        variableId: variable.variable_id,
        error: error.message
      })
      throw error
    }
  }

  private async parseGeneratedValue(generatedText: string, variableType: string): Promise<any> {
    try {
      switch (variableType) {
        case 'string':
          return generatedText

        case 'number':
          const num = parseFloat(generatedText)
          if (isNaN(num)) {
            throw new Error(`Invalid number: ${generatedText}`)
          }
          return num

        case 'boolean':
          const lowerText = generatedText.toLowerCase()
          if (lowerText === 'true' || lowerText === 'yes' || lowerText === '1') {
            return true
          } else if (lowerText === 'false' || lowerText === 'no' || lowerText === '0') {
            return false
          } else {
            throw new Error(`Invalid boolean: ${generatedText}`)
          }

        case 'date':
          const date = new Date(generatedText)
          if (isNaN(date.getTime())) {
            throw new Error(`Invalid date: ${generatedText}`)
          }
          return date.toISOString().split('T')[0] // Return YYYY-MM-DD format

        case 'array':
        case 'object':
        case 'json':
          try {
            return JSON.parse(generatedText)
          } catch (parseError) {
            throw new Error(`Invalid JSON: ${generatedText}`)
          }

        case 'markdown':
        case 'html':
          return generatedText

        default:
          return generatedText
      }
    } catch (error) {
      logger.error('Failed to parse generated value', {
        generatedText,
        variableType,
        error: error.message
      })
      throw error
    }
  }

  private async validateGeneratedValue(
    value: any,
    variable: TemplateVariable
  ): Promise<{ valid: boolean; errors: any[]; warnings: any[] }> {
    const errors: any[] = []
    const warnings: any[] = []

    // Type validation
    if (!this.validateType(value, variable.variable_type)) {
      errors.push({
        field: 'value',
        error_code: 'TYPE_MISMATCH',
        message: `Value type does not match expected type ${variable.variable_type}`,
        severity: 'error'
      })
    }

    // Constraint validation
    if (variable.variable_definition.constraints) {
      for (const constraint of variable.variable_definition.constraints) {
        const constraintResult = this.validateConstraint(value, constraint)
        if (!constraintResult.valid) {
          if (constraintResult.severity === 'error') {
            errors.push(constraintResult)
          } else {
            warnings.push(constraintResult)
          }
        }
      }
    }

    // Required validation
    if (variable.variable_definition.required && (value === null || value === undefined || value === '')) {
      errors.push({
        field: 'value',
        error_code: 'REQUIRED_FIELD',
        message: 'Value is required but is empty',
        severity: 'error'
      })
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }

  private validateType(value: any, expectedType: string): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string'
      case 'number':
        return typeof value === 'number' && !isNaN(value)
      case 'boolean':
        return typeof value === 'boolean'
      case 'date':
        return typeof value === 'string' && !isNaN(Date.parse(value))
      case 'array':
        return Array.isArray(value)
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value)
      case 'json':
        return typeof value === 'object' && value !== null
      case 'markdown':
      case 'html':
        return typeof value === 'string'
      default:
        return true
    }
  }

  private validateConstraint(value: any, constraint: any): { valid: boolean; severity: string; [key: string]: any } {
    switch (constraint.constraint_type) {
      case 'min_length':
        if (typeof value === 'string' && value.length < constraint.constraint_value) {
          return {
            valid: false,
            severity: 'error',
            field: 'value',
            error_code: 'MIN_LENGTH_VIOLATION',
            message: constraint.error_message || `Value length is less than minimum ${constraint.constraint_value}`
          }
        }
        break

      case 'max_length':
        if (typeof value === 'string' && value.length > constraint.constraint_value) {
          return {
            valid: false,
            severity: 'error',
            field: 'value',
            error_code: 'MAX_LENGTH_VIOLATION',
            message: constraint.error_message || `Value length exceeds maximum ${constraint.constraint_value}`
          }
        }
        break

      case 'min_value':
        if (typeof value === 'number' && value < constraint.constraint_value) {
          return {
            valid: false,
            severity: 'error',
            field: 'value',
            error_code: 'MIN_VALUE_VIOLATION',
            message: constraint.error_message || `Value is less than minimum ${constraint.constraint_value}`
          }
        }
        break

      case 'max_value':
        if (typeof value === 'number' && value > constraint.constraint_value) {
          return {
            valid: false,
            severity: 'error',
            field: 'value',
            error_code: 'MAX_VALUE_VIOLATION',
            message: constraint.error_message || `Value exceeds maximum ${constraint.constraint_value}`
          }
        }
        break

      case 'pattern':
        if (typeof value === 'string' && !new RegExp(constraint.constraint_value).test(value)) {
          return {
            valid: false,
            severity: 'error',
            field: 'value',
            error_code: 'PATTERN_VIOLATION',
            message: constraint.error_message || `Value does not match required pattern`
          }
        }
        break

      case 'enum':
        if (!constraint.constraint_value.includes(value)) {
          return {
            valid: false,
            severity: 'error',
            field: 'value',
            error_code: 'ENUM_VIOLATION',
            message: constraint.error_message || `Value is not in allowed values: ${constraint.constraint_value.join(', ')}`
          }
        }
        break
    }

    return { valid: true, severity: 'info' }
  }

  private async calculateConfidence(
    value: any,
    variable: TemplateVariable,
    context: ResolutionContext,
    validationResult: any
  ): Promise<number> {
    let confidence = 0.5 // Base confidence

    // Increase confidence based on validation
    if (validationResult.valid) {
      confidence += 0.2
    }

    // Increase confidence based on context availability
    if (context.project_context) confidence += 0.1
    if (context.user_context) confidence += 0.1
    if (context.historical_context) confidence += 0.1

    // Increase confidence based on variable definition quality
    if (variable.variable_definition.description) confidence += 0.05
    if (variable.variable_definition.examples && variable.variable_definition.examples.length > 0) {
      confidence += 0.05
    }

    // Decrease confidence for complex types
    if (['object', 'array', 'json'].includes(variable.variable_type)) {
      confidence -= 0.1
    }

    // Ensure confidence is within bounds
    return Math.max(0.1, Math.min(1.0, confidence))
  }

  private async buildContextInfo(context: ResolutionContext): Promise<string> {
    let contextInfo = ''

    // Project context
    if (context.project_context) {
      const project = context.project_context
      contextInfo += `Project: ${project.project_name || 'Unknown'}\n`
      contextInfo += `Project Type: ${project.project_type || 'Unknown'}\n`
      if (project.project_description) {
        contextInfo += `Project Description: ${project.project_description}\n`
      }
      if (project.stakeholders && project.stakeholders.length > 0) {
        contextInfo += `Stakeholders: ${project.stakeholders.map(s => s.name).join(', ')}\n`
      }
    }

    // User context
    if (context.user_context && context.user_context.user_profile) {
      const user = context.user_context.user_profile
      contextInfo += `User: ${user.name || 'Unknown'}\n`
      contextInfo += `Role: ${user.role || 'Unknown'}\n`
      contextInfo += `Department: ${user.department || 'Unknown'}\n`
      if (user.expertise_areas && user.expertise_areas.length > 0) {
        contextInfo += `Expertise: ${user.expertise_areas.join(', ')}\n`
      }
    }

    // Template context
    if (context.template_context) {
      const template = context.template_context
      contextInfo += `Template: ${template.template_name || 'Unknown'}\n`
      contextInfo += `Framework: ${template.template_framework || 'Unknown'}\n`
      contextInfo += `Category: ${template.template_category || 'Unknown'}\n`
    }

    return contextInfo
  }
}

