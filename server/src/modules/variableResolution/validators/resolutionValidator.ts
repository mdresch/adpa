/**
 * Resolution Validator
 * Validates variable resolutions and definitions
 */

import { logger } from '../../../utils/logger'
import type { TemplateVariable, VariableResolution, ValidationResult } from '../types'

export class ResolutionValidator {
  async validateResolution(variable: TemplateVariable, resolution: VariableResolution): Promise<ValidationResult> {
    try {
      logger.debug('Validating resolution', {
        variableId: variable.variable_id,
        resolutionId: resolution.resolution_id
      })

      const errors: any[] = []
      const warnings: any[] = []
      const suggestions: any[] = []

      // Validate resolution structure
      this.validateResolutionStructure(resolution, errors, warnings)

      // Validate resolution value
      this.validateResolutionValue(variable, resolution, errors, warnings, suggestions)

      // Validate resolution metadata
      this.validateResolutionMetadata(resolution, errors, warnings)

      const result: ValidationResult = {
        valid: errors.length === 0,
        errors,
        warnings,
        suggestions
      }

      logger.debug('Resolution validation completed', {
        variableId: variable.variable_id,
        valid: result.valid,
        errorCount: errors.length,
        warningCount: warnings.length
      })

      return result

    } catch (error) {
      logger.error('Resolution validation failed', {
        variableId: variable.variable_id,
        error: error.message
      })
      throw error
    }
  }

  async validateVariableDefinitions(variables: TemplateVariable[]): Promise<ValidationResult> {
    try {
      logger.debug('Validating variable definitions', {
        variableCount: variables.length
      })

      const errors: any[] = []
      const warnings: any[] = []
      const suggestions: any[] = []

      for (const variable of variables) {
        this.validateVariableDefinition(variable, errors, warnings, suggestions)
      }

      // Validate cross-variable consistency
      this.validateCrossVariableConsistency(variables, errors, warnings, suggestions)

      const result: ValidationResult = {
        valid: errors.length === 0,
        errors,
        warnings,
        suggestions
      }

      logger.debug('Variable definition validation completed', {
        variableCount: variables.length,
        valid: result.valid,
        errorCount: errors.length,
        warningCount: warnings.length
      })

      return result

    } catch (error) {
      logger.error('Variable definition validation failed', {
        error: error.message
      })
      throw error
    }
  }

  private validateResolutionStructure(resolution: VariableResolution, errors: any[], warnings: any[]): void {
    // Check required fields
    if (!resolution.resolution_id) {
      errors.push({
        field: 'resolution_id',
        error_code: 'MISSING_RESOLUTION_ID',
        message: 'Resolution ID is required',
        severity: 'error'
      })
    }

    if (!resolution.variable_id) {
      errors.push({
        field: 'variable_id',
        error_code: 'MISSING_VARIABLE_ID',
        message: 'Variable ID is required',
        severity: 'error'
      })
    }

    if (resolution.resolved_value === undefined || resolution.resolved_value === null) {
      errors.push({
        field: 'resolved_value',
        error_code: 'MISSING_RESOLVED_VALUE',
        message: 'Resolved value is required',
        severity: 'error'
      })
    }

    // Check confidence score
    if (resolution.resolution_confidence < 0 || resolution.resolution_confidence > 1) {
      errors.push({
        field: 'resolution_confidence',
        error_code: 'INVALID_CONFIDENCE_SCORE',
        message: 'Resolution confidence must be between 0 and 1',
        severity: 'error'
      })
    }

    // Check quality score
    if (resolution.resolution_quality < 0 || resolution.resolution_quality > 1) {
      errors.push({
        field: 'resolution_quality',
        error_code: 'INVALID_QUALITY_SCORE',
        message: 'Resolution quality must be between 0 and 1',
        severity: 'error'
      })
    }

    // Check duration
    if (resolution.resolution_duration < 0) {
      warnings.push({
        field: 'resolution_duration',
        warning_code: 'NEGATIVE_DURATION',
        message: 'Resolution duration is negative',
        impact: 'May indicate timing issues'
      })
    }
  }

  private validateResolutionValue(
    variable: TemplateVariable,
    resolution: VariableResolution,
    errors: any[],
    warnings: any[],
    suggestions: any[]
  ): void {
    const value = resolution.resolved_value

    // Type validation
    if (!this.validateType(value, variable.variable_type)) {
      errors.push({
        field: 'resolved_value',
        error_code: 'TYPE_MISMATCH',
        message: `Resolved value type does not match expected type ${variable.variable_type}`,
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
        field: 'resolved_value',
        error_code: 'REQUIRED_FIELD_EMPTY',
        message: 'Required variable has empty value',
        severity: 'error'
      })
    }

    // Quality suggestions
    if (resolution.resolution_confidence < 0.7) {
      suggestions.push({
        field: 'resolution_confidence',
        suggestion: 'Consider using a different resolution strategy',
        reason: 'Low confidence score indicates potential issues',
        impact: 'May improve resolution quality'
      })
    }
  }

  private validateResolutionMetadata(resolution: VariableResolution, errors: any[], warnings: any[]): void {
    // Check metadata structure
    if (!resolution.metadata) {
      warnings.push({
        field: 'metadata',
        warning_code: 'MISSING_METADATA',
        message: 'Resolution metadata is missing',
        impact: 'May affect debugging and analysis'
      })
    } else {
      // Validate metadata fields
      if (!resolution.metadata.resolution_version) {
        warnings.push({
          field: 'metadata.resolution_version',
          warning_code: 'MISSING_VERSION',
          message: 'Resolution version is missing',
          impact: 'May affect version tracking'
        })
      }

      if (!resolution.metadata.resolution_engine) {
        warnings.push({
          field: 'metadata.resolution_engine',
          warning_code: 'MISSING_ENGINE',
          message: 'Resolution engine is missing',
          impact: 'May affect debugging'
        })
      }
    }
  }

  private validateVariableDefinition(
    variable: TemplateVariable,
    errors: any[],
    warnings: any[],
    suggestions: any[]
  ): void {
    // Check required fields
    if (!variable.variable_id) {
      errors.push({
        field: 'variable_id',
        error_code: 'MISSING_VARIABLE_ID',
        message: 'Variable ID is required',
        severity: 'error'
      })
    }

    if (!variable.variable_name) {
      errors.push({
        field: 'variable_name',
        error_code: 'MISSING_VARIABLE_NAME',
        message: 'Variable name is required',
        severity: 'error'
      })
    }

    if (!variable.variable_type) {
      errors.push({
        field: 'variable_type',
        error_code: 'MISSING_VARIABLE_TYPE',
        message: 'Variable type is required',
        severity: 'error'
      })
    }

    // Check variable definition
    if (!variable.variable_definition) {
      errors.push({
        field: 'variable_definition',
        error_code: 'MISSING_VARIABLE_DEFINITION',
        message: 'Variable definition is required',
        severity: 'error'
      })
    } else {
      // Validate definition fields
      if (!variable.variable_definition.description) {
        warnings.push({
          field: 'variable_definition.description',
          warning_code: 'MISSING_DESCRIPTION',
          message: 'Variable description is missing',
          impact: 'May affect understanding and maintenance'
        })
      }

      if (variable.variable_definition.required === undefined) {
        warnings.push({
          field: 'variable_definition.required',
          warning_code: 'MISSING_REQUIRED_FLAG',
          message: 'Required flag is not specified',
          impact: 'May affect validation logic'
        })
      }
    }

    // Check naming conventions
    if (variable.variable_name) {
      const name = variable.variable_name
      if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(name)) {
        warnings.push({
          field: 'variable_name',
          warning_code: 'INVALID_NAMING_CONVENTION',
          message: 'Variable name does not follow standard naming conventions',
          impact: 'May cause issues in some contexts'
        })
      }
    }

    // Check type appropriateness
    if (variable.variable_type && variable.variable_name) {
      if (!this.isTypeAppropriate(variable)) {
        suggestions.push({
          field: 'variable_type',
          suggestion: `Consider changing type to better match variable name: ${variable.variable_name}`,
          reason: 'Variable type may not be appropriate for the name',
          impact: 'May improve clarity and usability'
        })
      }
    }
  }

  private validateCrossVariableConsistency(
    variables: TemplateVariable[],
    errors: any[],
    warnings: any[],
    suggestions: any[]
  ): void {
    // Check for duplicate variable names
    const nameCounts: Record<string, number> = {}
    for (const variable of variables) {
      nameCounts[variable.variable_name] = (nameCounts[variable.variable_name] || 0) + 1
    }

    for (const [name, count] of Object.entries(nameCounts)) {
      if (count > 1) {
        errors.push({
          field: 'variable_name',
          error_code: 'DUPLICATE_VARIABLE_NAME',
          message: `Duplicate variable name: ${name}`,
          severity: 'error'
        })
      }
    }

    // Check for naming consistency
    const namingStyles = variables.map(v => {
      const name = v.variable_name
      if (/^[a-z]+(_[a-z]+)*$/.test(name)) return 'snake_case'
      if (/^[a-z]+([A-Z][a-z]+)*$/.test(name)) return 'camelCase'
      return 'mixed'
    })

    const styleCounts = namingStyles.reduce((acc, style) => {
      acc[style] = (acc[style] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    if (Object.keys(styleCounts).length > 1) {
      warnings.push({
        field: 'variable_name',
        warning_code: 'INCONSISTENT_NAMING',
        message: 'Variable names use inconsistent naming conventions',
        impact: 'May affect code readability and maintenance'
      })
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
            field: 'resolved_value',
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
            field: 'resolved_value',
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
            field: 'resolved_value',
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
            field: 'resolved_value',
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
            field: 'resolved_value',
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
            field: 'resolved_value',
            error_code: 'ENUM_VIOLATION',
            message: constraint.error_message || `Value is not in allowed values: ${constraint.constraint_value.join(', ')}`
          }
        }
        break
    }

    return { valid: true, severity: 'info' }
  }

  private isTypeAppropriate(variable: TemplateVariable): boolean {
    const name = variable.variable_name.toLowerCase()
    const type = variable.variable_type

    // Simple heuristics for type appropriateness
    if (name.includes('count') || name.includes('number') || name.includes('size')) {
      return type === 'number'
    }
    if (name.includes('date') || name.includes('time')) {
      return type === 'date'
    }
    if (name.includes('list') || name.includes('array')) {
      return type === 'array'
    }
    if (name.includes('config') || name.includes('settings')) {
      return type === 'object' || type === 'json'
    }

    return true // Default to appropriate if no clear indicators
  }
}

