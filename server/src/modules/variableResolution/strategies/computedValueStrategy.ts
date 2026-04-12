/**
 * Computed Value Strategy
 * Computes variable values using expressions and calculations
 */

import { Parser } from 'expr-eval';
import { logger } from '../../../utils/logger'
import type { TemplateVariable, ResolutionContext, ResolutionStrategy } from '../types'

export interface ComputedValueResult {
  value: any
  source: string
  confidence: number
  computation_metadata: Record<string, any>
}

export class ComputedValueStrategy {
  async resolve(
    variable: TemplateVariable,
    context: ResolutionContext,
    config: Record<string, any>
  ): Promise<ComputedValueResult> {
    try {
      logger.debug('Computing variable value', {
        variableId: variable.variable_id,
        variableName: variable.variable_name
      })

      const startTime = Date.now()

      // Get computation expression from resolution hints or config
      const expression = await this.getComputationExpression(variable, config)

      if (!expression) {
        throw new Error(`No computation expression configured for variable ${variable.variable_name}`)
      }

      // Compute value using expression
      const computedValue = await this.computeValue(expression, variable, context, config)

      // Validate computed value
      const validationResult = await this.validateComputedValue(computedValue, variable)
      if (!validationResult.valid) {
        throw new Error(`Computed value validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`)
      }

      const processingTime = Date.now() - startTime

      logger.info('Computed value resolution completed', {
        variableId: variable.variable_id,
        expression,
        processingTime
      })

      return {
        value: computedValue,
        source: 'computed_value',
        confidence: 0.9, // High confidence for computed values
        computation_metadata: {
          processing_time: processingTime,
          expression: expression,
          variable_type: variable.variable_type,
          computation_strategy: 'computed_value'
        }
      }

    } catch (error) {
      logger.error('Computed value resolution failed', {
        variableId: variable.variable_id,
        error: error.message
      })
      throw error
    }
  }

  private async getComputationExpression(variable: TemplateVariable, config: Record<string, any>): Promise<string | null> {
    // Check resolution hints for computation expression
    if (variable.resolution_hints) {
      for (const hint of variable.resolution_hints) {
        if (hint.hint_type === 'computation_expression') {
          return hint.hint_value
        }
      }
    }

    // Check config for computation expression
    if (config.expression) {
      return config.expression
    }

    return null
  }

  private async computeValue(
    expression: string,
    variable: TemplateVariable,
    context: ResolutionContext,
    config: Record<string, any>
  ): Promise<any> {
    try {
      // Create computation context
      const computationContext = await this.createComputationContext(context, config)

      // Evaluate expression safely
      const result = await this.evaluateExpression(expression, computationContext)

      return result

    } catch (error) {
      logger.error('Computation failed', {
        expression,
        error: error.message
      })
      throw error
    }
  }

  private async createComputationContext(context: ResolutionContext, config: Record<string, any>): Promise<any> {
    const computationContext: any = {
      // Date utilities
      date: new Date(),
      now: new Date(),
      today: new Date().toISOString().split('T')[0],
      
      // Math utilities
      math: Math,
      random: Math.random,
      
      // String utilities
      string: {
        upper: (str: string) => str.toUpperCase(),
        lower: (str: string) => str.toLowerCase(),
        trim: (str: string) => str.trim(),
        length: (str: string) => str.length
      }
    }

    // Add context data
    if (context.project_context) {
      computationContext.project = context.project_context
    }

    if (context.user_context) {
      computationContext.user = context.user_context
    }

    if (context.template_context) {
      computationContext.template = context.template_context
    }

    // Add config data
    if (config.variables) {
      computationContext.variables = config.variables
    }

    return computationContext
  }

  private async evaluateExpression(expression: string, context: any): Promise<any> {
    try {
      const parser = new Parser();
      const expr = parser.parse(expression);
      return expr.evaluate(context);

    } catch (error) {
      logger.error('Expression evaluation failed', {
        expression,
        error: error.message
      })
      throw error
    }
  }

  private async validateComputedValue(value: any, variable: TemplateVariable): Promise<{
    valid: boolean
    errors: any[]
  }> {
    const errors: any[] = []

    // Type validation
    if (!this.validateType(value, variable.variable_type)) {
      errors.push({
        field: 'value',
        error_code: 'TYPE_MISMATCH',
        message: `Computed value type does not match expected type ${variable.variable_type}`,
        severity: 'error'
      })
    }

    // Constraint validation
    if (variable.variable_definition.constraints) {
      for (const constraint of variable.variable_definition.constraints) {
        const constraintResult = this.validateConstraint(value, constraint)
        if (!constraintResult.valid) {
          errors.push(constraintResult)
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
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

  private validateConstraint(value: any, constraint: any): { valid: boolean; [key: string]: any } {
    switch (constraint.constraint_type) {
      case 'min_length':
        if (typeof value === 'string' && value.length < constraint.constraint_value) {
          return {
            valid: false,
            field: 'value',
            error_code: 'MIN_LENGTH_VIOLATION',
            message: constraint.error_message || `Value length is less than minimum ${constraint.constraint_value}`,
            severity: 'error'
          }
        }
        break

      case 'max_length':
        if (typeof value === 'string' && value.length > constraint.constraint_value) {
          return {
            valid: false,
            field: 'value',
            error_code: 'MAX_LENGTH_VIOLATION',
            message: constraint.error_message || `Value length exceeds maximum ${constraint.constraint_value}`,
            severity: 'error'
          }
        }
        break

      case 'min_value':
        if (typeof value === 'number' && value < constraint.constraint_value) {
          return {
            valid: false,
            field: 'value',
            error_code: 'MIN_VALUE_VIOLATION',
            message: constraint.error_message || `Value is less than minimum ${constraint.constraint_value}`,
            severity: 'error'
          }
        }
        break

      case 'max_value':
        if (typeof value === 'number' && value > constraint.constraint_value) {
          return {
            valid: false,
            field: 'value',
            error_code: 'MAX_VALUE_VIOLATION',
            message: constraint.error_message || `Value exceeds maximum ${constraint.constraint_value}`,
            severity: 'error'
          }
        }
        break

      case 'pattern':
        if (typeof value === 'string' && !new RegExp(constraint.constraint_value).test(value)) {
          return {
            valid: false,
            field: 'value',
            error_code: 'PATTERN_VIOLATION',
            message: constraint.error_message || `Value does not match required pattern`,
            severity: 'error'
          }
        }
        break

      case 'enum':
        if (!constraint.constraint_value.includes(value)) {
          return {
            valid: false,
            field: 'value',
            error_code: 'ENUM_VIOLATION',
            message: constraint.error_message || `Value is not in allowed values: ${constraint.constraint_value.join(', ')}`,
            severity: 'error'
          }
        }
        break
    }

    return { valid: true }
  }
}

