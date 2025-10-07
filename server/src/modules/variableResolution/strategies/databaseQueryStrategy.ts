/**
 * Database Query Strategy
 * Fetches variable values from database queries
 */

import { logger } from '../../../utils/logger'
import { pool } from '../../../database/connection'
import type { TemplateVariable, ResolutionContext, ResolutionStrategy } from '../types'

export interface DatabaseQueryResult {
  value: any
  source: string
  confidence: number
  query_metadata: Record<string, any>
}

export class DatabaseQueryStrategy {
  async resolve(
    variable: TemplateVariable,
    context: ResolutionContext,
    config: Record<string, any>
  ): Promise<DatabaseQueryResult> {
    try {
      logger.debug('Resolving variable using database query', {
        variableId: variable.variable_id,
        variableName: variable.variable_name
      })

      const startTime = Date.now()

      // Get database query from resolution hints or config
      const query = await this.getDatabaseQuery(variable, config)

      if (!query) {
        throw new Error(`No database query configured for variable ${variable.variable_name}`)
      }

      // Execute database query
      const queryResult = await this.executeDatabaseQuery(query, variable, context, config)

      // Extract value from query result
      const extractedValue = await this.extractValueFromQueryResult(queryResult, variable, config)

      // Validate extracted value
      const validationResult = await this.validateDatabaseValue(extractedValue, variable)
      if (!validationResult.valid) {
        throw new Error(`Database value validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`)
      }

      const processingTime = Date.now() - startTime

      logger.info('Database query resolution completed', {
        variableId: variable.variable_id,
        query,
        processingTime
      })

      return {
        value: extractedValue,
        source: 'database_query',
        confidence: 0.8, // High confidence for database queries
        query_metadata: {
          processing_time: processingTime,
          query: query,
          result_count: queryResult.rowCount,
          variable_type: variable.variable_type,
          query_strategy: 'database_query'
        }
      }

    } catch (error) {
      logger.error('Database query resolution failed', {
        variableId: variable.variable_id,
        error: error.message
      })
      throw error
    }
  }

  private async getDatabaseQuery(variable: TemplateVariable, config: Record<string, any>): Promise<string | null> {
    // Check resolution hints for database query
    if (variable.resolution_hints) {
      for (const hint of variable.resolution_hints) {
        if (hint.hint_type === 'database_table') {
          return this.constructQueryFromTable(hint.hint_value, variable)
        }
      }
    }

    // Check config for database query
    if (config.query) {
      return config.query
    }

    // Check config for table name and construct query
    if (config.table_name) {
      return this.constructQueryFromTable(config.table_name, variable)
    }

    return null
  }

  private constructQueryFromTable(tableName: string, variable: TemplateVariable): string {
    const variableName = variable.variable_name.toLowerCase()
    
    // Construct a simple SELECT query
    return `SELECT * FROM ${tableName} WHERE name ILIKE '%${variableName}%' OR description ILIKE '%${variableName}%' LIMIT 1`
  }

  private async executeDatabaseQuery(
    query: string,
    variable: TemplateVariable,
    context: ResolutionContext,
    config: Record<string, any>
  ): Promise<any> {
    try {
      // Replace query parameters with context values
      const processedQuery = await this.processQueryParameters(query, variable, context, config)

      const result = await pool.query(processedQuery)

      return result

    } catch (error) {
      logger.error('Database query execution failed', {
        query,
        error: error.message
      })
      throw error
    }
  }

  private async processQueryParameters(
    query: string,
    variable: TemplateVariable,
    context: ResolutionContext,
    config: Record<string, any>
  ): Promise<string> {
    let processedQuery = query

    // Replace context variables in the query
    if (context.project_context) {
      const project = context.project_context
      processedQuery = processedQuery.replace(/\{\{project\.id\}\}/g, project.project_id || '')
      processedQuery = processedQuery.replace(/\{\{project\.name\}\}/g, project.project_name || '')
      processedQuery = processedQuery.replace(/\{\{project\.type\}\}/g, project.project_type || '')
    }

    if (context.user_context && context.user_context.user_profile) {
      const user = context.user_context.user_profile
      processedQuery = processedQuery.replace(/\{\{user\.id\}\}/g, user.user_id || '')
      processedQuery = processedQuery.replace(/\{\{user\.name\}\}/g, user.name || '')
      processedQuery = processedQuery.replace(/\{\{user\.role\}\}/g, user.role || '')
    }

    if (context.template_context) {
      const template = context.template_context
      processedQuery = processedQuery.replace(/\{\{template\.id\}\}/g, template.template_id || '')
      processedQuery = processedQuery.replace(/\{\{template\.name\}\}/g, template.template_name || '')
      processedQuery = processedQuery.replace(/\{\{template\.framework\}\}/g, template.template_framework || '')
    }

    // Replace variable-specific parameters
    processedQuery = processedQuery.replace(/\{\{variable\.name\}\}/g, variable.variable_name)
    processedQuery = processedQuery.replace(/\{\{variable\.type\}\}/g, variable.variable_type)

    return processedQuery
  }

  private async extractValueFromQueryResult(
    queryResult: any,
    variable: TemplateVariable,
    config: Record<string, any>
  ): Promise<any> {
    if (queryResult.rows.length === 0) {
      throw new Error(`No results found for variable ${variable.variable_name}`)
    }

    const firstRow = queryResult.rows[0]
    const variableName = variable.variable_name.toLowerCase()

    // Check config for value extraction column
    if (config.value_column) {
      if (firstRow[config.value_column] !== undefined) {
        return firstRow[config.value_column]
      }
    }

    // Try to extract value based on variable name
    if (firstRow[variableName]) {
      return firstRow[variableName]
    }

    // Try common column names
    const commonColumns = ['value', 'data', 'content', 'description', 'name']
    for (const column of commonColumns) {
      if (firstRow[column] !== undefined) {
        return firstRow[column]
      }
    }

    // If no specific column found, return the first row
    return firstRow
  }

  private async validateDatabaseValue(value: any, variable: TemplateVariable): Promise<{
    valid: boolean
    errors: any[]
  }> {
    const errors: any[] = []

    // Type validation
    if (!this.validateType(value, variable.variable_type)) {
      errors.push({
        field: 'value',
        error_code: 'TYPE_MISMATCH',
        message: `Database value type does not match expected type ${variable.variable_type}`,
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

