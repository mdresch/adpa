/**
 * Conditional Logic Strategy
 * Resolves variable values using conditional logic and rules
 */

import { logger } from '../../../utils/logger'
import type { TemplateVariable, ResolutionContext, ResolutionStrategy } from '../types'

export interface ConditionalLogicResult {
  value: any
  source: string
  confidence: number
  conditional_metadata: Record<string, any>
}

export class ConditionalLogicStrategy {
  async resolve(
    variable: TemplateVariable,
    context: ResolutionContext,
    config: Record<string, any>
  ): Promise<ConditionalLogicResult> {
    try {
      logger.debug('Resolving variable using conditional logic', {
        variableId: variable.variable_id,
        variableName: variable.variable_name
      })

      const startTime = Date.now()

      // Get conditional rules from resolution hints or config
      const rules = await this.getConditionalRules(variable, config)

      if (!rules || rules.length === 0) {
        throw new Error(`No conditional rules configured for variable ${variable.variable_name}`)
      }

      // Evaluate conditional rules
      const resolvedValue = await this.evaluateConditionalRules(rules, variable, context, config)

      // Validate resolved value
      const validationResult = await this.validateConditionalValue(resolvedValue, variable)
      if (!validationResult.valid) {
        throw new Error(`Conditional value validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`)
      }

      const processingTime = Date.now() - startTime

      logger.info('Conditional logic resolution completed', {
        variableId: variable.variable_id,
        rulesCount: rules.length,
        processingTime
      })

      return {
        value: resolvedValue,
        source: 'conditional_logic',
        confidence: 0.8, // High confidence for conditional logic
        conditional_metadata: {
          processing_time: processingTime,
          rules_evaluated: rules.length,
          variable_type: variable.variable_type,
          conditional_strategy: 'conditional_logic'
        }
      }

    } catch (error) {
      logger.error('Conditional logic resolution failed', {
        variableId: variable.variable_id,
        error: error.message
      })
      throw error
    }
  }

  private async getConditionalRules(variable: TemplateVariable, config: Record<string, any>): Promise<any[] | null> {
    // Check resolution hints for conditional rules
    if (variable.resolution_hints) {
      for (const hint of variable.resolution_hints) {
        if (hint.hint_type === 'conditional_logic') {
          return hint.hint_value
        }
      }
    }

    // Check config for conditional rules
    if (config.rules) {
      return config.rules
    }

    return null
  }

  private async evaluateConditionalRules(
    rules: any[],
    variable: TemplateVariable,
    context: ResolutionContext,
    config: Record<string, any>
  ): Promise<any> {
    // Create evaluation context
    const evaluationContext = await this.createEvaluationContext(context, config)

    // Evaluate rules in order
    for (const rule of rules) {
      const conditionResult = await this.evaluateCondition(rule.condition, evaluationContext)
      
      if (conditionResult) {
        // Condition is true, return the corresponding value
        return await this.resolveRuleValue(rule.value, evaluationContext)
      }
    }

    // No conditions matched, return default value
    if (config.default_value !== undefined) {
      return config.default_value
    }

    throw new Error(`No conditional rules matched for variable ${variable.variable_name}`)
  }

  private async createEvaluationContext(context: ResolutionContext, config: Record<string, any>): Promise<any> {
    const evaluationContext: any = {
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
        length: (str: string) => str.length,
        contains: (str: string, substr: string) => str.includes(substr)
      }
    }

    // Add context data
    if (context.project_context) {
      evaluationContext.project = context.project_context
    }

    if (context.user_context) {
      evaluationContext.user = context.user_context
    }

    if (context.template_context) {
      evaluationContext.template = context.template_context
    }

    // Add config data
    if (config.variables) {
      evaluationContext.variables = config.variables
    }

    return evaluationContext
  }

  private async evaluateCondition(condition: any, context: any): Promise<boolean> {
    try {
      // Handle different condition types
      if (typeof condition === 'string') {
        // String expression
        return await this.evaluateStringCondition(condition, context)
      } else if (typeof condition === 'object' && condition !== null) {
        // Object condition
        return await this.evaluateObjectCondition(condition, context)
      } else {
        // Boolean condition
        return Boolean(condition)
      }
    } catch (error) {
      logger.error('Condition evaluation failed', {
        condition,
        error: error.message
      })
      return false
    }
  }

  private async evaluateStringCondition(condition: string, context: any): Promise<boolean> {
    try {
      // Create a safe evaluation function
      const func = new Function('context', `
        with (context) {
          return ${condition};
        }
      `)

      return Boolean(func(context))
    } catch (error) {
      logger.error('String condition evaluation failed', {
        condition,
        error: error.message
      })
      return false
    }
  }

  private async evaluateObjectCondition(condition: any, context: any): Promise<boolean> {
    try {
      // Handle different condition operators
      switch (condition.operator) {
        case 'equals':
          return this.getConditionValue(condition.left, context) === this.getConditionValue(condition.right, context)
        
        case 'not_equals':
          return this.getConditionValue(condition.left, context) !== this.getConditionValue(condition.right, context)
        
        case 'greater_than':
          return this.getConditionValue(condition.left, context) > this.getConditionValue(condition.right, context)
        
        case 'less_than':
          return this.getConditionValue(condition.left, context) < this.getConditionValue(condition.right, context)
        
        case 'greater_than_or_equal':
          return this.getConditionValue(condition.left, context) >= this.getConditionValue(condition.right, context)
        
        case 'less_than_or_equal':
          return this.getConditionValue(condition.left, context) <= this.getConditionValue(condition.right, context)
        
        case 'contains':
          const leftValue = this.getConditionValue(condition.left, context)
          const rightValue = this.getConditionValue(condition.right, context)
          return String(leftValue).includes(String(rightValue))
        
        case 'not_contains':
          const leftValue2 = this.getConditionValue(condition.left, context)
          const rightValue2 = this.getConditionValue(condition.right, context)
          return !String(leftValue2).includes(String(rightValue2))
        
        case 'in':
          const leftValue3 = this.getConditionValue(condition.left, context)
          const rightValue3 = this.getConditionValue(condition.right, context)
          return Array.isArray(rightValue3) && rightValue3.includes(leftValue3)
        
        case 'not_in':
          const leftValue4 = this.getConditionValue(condition.left, context)
          const rightValue4 = this.getConditionValue(condition.right, context)
          return Array.isArray(rightValue4) && !rightValue4.includes(leftValue4)
        
        case 'and':
          return condition.conditions.every((c: any) => this.evaluateCondition(c, context))
        
        case 'or':
          return condition.conditions.some((c: any) => this.evaluateCondition(c, context))
        
        case 'not':
          return !this.evaluateCondition(condition.condition, context)
        
        default:
          logger.warn('Unknown condition operator', { operator: condition.operator })
          return false
      }
    } catch (error) {
      logger.error('Object condition evaluation failed', {
        condition,
        error: error.message
      })
      return false
    }
  }

  private getConditionValue(value: any, context: any): any {
    if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
      // Template variable
      const path = value.slice(2, -2).trim()
      return this.getNestedValue(context, path)
    } else if (typeof value === 'string' && value.includes('.')) {
      // Context path
      return this.getNestedValue(context, value)
    } else {
      // Literal value
      return value
    }
  }

  private getNestedValue(obj: any, path: string): any {
    const pathParts = path.split('.')
    let current = obj

    for (const part of pathParts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part]
      } else {
        return undefined
      }
    }

    return current
  }

  private async resolveRuleValue(value: any, context: any): Promise<any> {
    if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
      // Template variable
      const path = value.slice(2, -2).trim()
      return this.getNestedValue(context, path)
    } else if (typeof value === 'string' && value.includes('${')) {
      // Template string
      return this.resolveTemplateString(value, context)
    } else {
      // Literal value
      return value
    }
  }

  private resolveTemplateString(template: string, context: any): string {
    return template.replace(/\${([^}]+)}/g, (match, path) => {
      const value = this.getNestedValue(context, path.trim())
      return value !== undefined ? String(value) : match
    })
  }

  private async validateConditionalValue(value: any, variable: TemplateVariable): Promise<{
    valid: boolean
    errors: any[]
  }> {
    const errors: any[] = []

    // Type validation
    if (!this.validateType(value, variable.variable_type)) {
      errors.push({
        field: 'value',
        error_code: 'TYPE_MISMATCH',
        message: `Conditional value type does not match expected type ${variable.variable_type}`,
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

