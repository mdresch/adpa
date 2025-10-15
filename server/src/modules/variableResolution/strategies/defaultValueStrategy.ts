/**
 * Default Value Strategy
 * Uses default values from variable definitions
 */

import { logger } from '../../../utils/logger'
import type { TemplateVariable, ResolutionContext, ResolutionStrategy } from '../types'

export interface DefaultValueResult {
  value: any
  source: string
  confidence: number
  default_metadata: Record<string, any>
}

export class DefaultValueStrategy {
  async resolve(
    variable: TemplateVariable,
    context: ResolutionContext,
    config: Record<string, any>
  ): Promise<DefaultValueResult> {
    try {
      logger.debug('Resolving variable using default value', {
        variableId: variable.variable_id,
        variableName: variable.variable_name
      })

      const startTime = Date.now()

      // Get default value from variable definition
      const defaultValue = variable.variable_definition.default_value

      if (defaultValue === undefined || defaultValue === null) {
        throw new Error(`No default value defined for variable ${variable.variable_name}`)
      }

      // Apply default value transformations if needed
      const processedValue = await this.processDefaultValue(defaultValue, variable, context)

      const processingTime = Date.now() - startTime

      logger.info('Default value resolution completed', {
        variableId: variable.variable_id,
        processingTime
      })

      return {
        value: processedValue,
        source: 'default_value',
        confidence: 0.8, // High confidence for default values
        default_metadata: {
          processing_time: processingTime,
          original_default: defaultValue,
          variable_type: variable.variable_type,
          default_strategy: 'default_value'
        }
      }

    } catch (error) {
      logger.error('Default value resolution failed', {
        variableId: variable.variable_id,
        error: error.message
      })
      throw error
    }
  }

  private async processDefaultValue(
    defaultValue: any,
    variable: TemplateVariable,
    context: ResolutionContext
  ): Promise<any> {
    // If default value is a string, try to process it as a template
    if (typeof defaultValue === 'string' && defaultValue.includes('{{')) {
      return await this.processTemplateString(defaultValue, context)
    }

    // If default value is a function (stored as string), evaluate it
    if (typeof defaultValue === 'string' && defaultValue.startsWith('function(')) {
      return await this.evaluateDefaultFunction(defaultValue, context)
    }

    // Return the default value as-is
    return defaultValue
  }

  private async processTemplateString(templateString: string, context: ResolutionContext): Promise<string> {
    let processedString = templateString

    // Replace context variables in the template string
    if (context.project_context) {
      const project = context.project_context
      processedString = processedString.replace(/\{\{project\.name\}\}/g, project.project_name || 'Unknown Project')
      processedString = processedString.replace(/\{\{project\.type\}\}/g, project.project_type || 'Unknown Type')
    }

    if (context.user_context && context.user_context.user_profile) {
      const user = context.user_context.user_profile
      processedString = processedString.replace(/\{\{user\.name\}\}/g, user.name || 'Unknown User')
      processedString = processedString.replace(/\{\{user\.role\}\}/g, user.role || 'Unknown Role')
    }

    return processedString
  }

  private async evaluateDefaultFunction(functionString: string, context: ResolutionContext): Promise<any> {
    try {
      // Create a safe evaluation context
      const evalContext = {
        project: context.project_context,
        user: context.user_context?.user_profile,
        template: context.template_context,
        date: new Date(),
        random: Math.random
      }

      // Evaluate the function in a safe context
      const func = new Function('context', `return (${functionString})(context)`)
      return func(evalContext)

    } catch (error) {
      logger.error('Failed to evaluate default function', {
        functionString,
        error: error.message
      })
      throw error
    }
  }
}

