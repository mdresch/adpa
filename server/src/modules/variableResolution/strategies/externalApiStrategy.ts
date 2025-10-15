/**
 * External API Strategy
 * Fetches variable values from external APIs
 */

import { logger } from '../../../utils/logger'
import type { TemplateVariable, ResolutionContext, ResolutionStrategy } from '../types'

export interface ExternalApiResult {
  value: any
  source: string
  confidence: number
  api_metadata: Record<string, any>
}

export class ExternalApiStrategy {
  async resolve(
    variable: TemplateVariable,
    context: ResolutionContext,
    config: Record<string, any>
  ): Promise<ExternalApiResult> {
    try {
      logger.debug('Resolving variable using external API', {
        variableId: variable.variable_id,
        variableName: variable.variable_name
      })

      const startTime = Date.now()

      // Get API endpoint from resolution hints or config
      const apiEndpoint = await this.getApiEndpoint(variable, config)

      if (!apiEndpoint) {
        throw new Error(`No API endpoint configured for variable ${variable.variable_name}`)
      }

      // Make API request
      const apiResponse = await this.makeApiRequest(apiEndpoint, variable, context, config)

      // Extract value from API response
      const extractedValue = await this.extractValueFromResponse(apiResponse, variable, config)

      // Validate extracted value
      const validationResult = await this.validateApiValue(extractedValue, variable)
      if (!validationResult.valid) {
        throw new Error(`API value validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`)
      }

      const processingTime = Date.now() - startTime

      logger.info('External API resolution completed', {
        variableId: variable.variable_id,
        apiEndpoint,
        processingTime
      })

      return {
        value: extractedValue,
        source: 'external_api',
        confidence: 0.7, // Moderate confidence for external APIs
        api_metadata: {
          processing_time: processingTime,
          api_endpoint: apiEndpoint,
          response_status: apiResponse.status,
          variable_type: variable.variable_type,
          api_strategy: 'external_api'
        }
      }

    } catch (error) {
      logger.error('External API resolution failed', {
        variableId: variable.variable_id,
        error: error.message
      })
      throw error
    }
  }

  private async getApiEndpoint(variable: TemplateVariable, config: Record<string, any>): Promise<string | null> {
    // Check resolution hints for API endpoint
    if (variable.resolution_hints) {
      for (const hint of variable.resolution_hints) {
        if (hint.hint_type === 'external_api_endpoint') {
          return hint.hint_value
        }
      }
    }

    // Check config for API endpoint
    if (config.api_endpoint) {
      return config.api_endpoint
    }

    // Check config for API base URL and construct endpoint
    if (config.api_base_url && config.api_path) {
      return `${config.api_base_url}${config.api_path}`
    }

    return null
  }

  private async makeApiRequest(
    apiEndpoint: string,
    variable: TemplateVariable,
    context: ResolutionContext,
    config: Record<string, any>
  ): Promise<any> {
    try {
      const requestConfig: RequestInit = {
        method: config.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...config.headers
        }
      }

      // Add authentication if configured
      if (config.api_key) {
        requestConfig.headers = {
          ...requestConfig.headers,
          'Authorization': `Bearer ${config.api_key}`
        }
      }

      // Add request body if configured
      if (config.request_body) {
        requestConfig.body = JSON.stringify(config.request_body)
      }

      // Add query parameters if configured
      if (config.query_params) {
        const url = new URL(apiEndpoint)
        Object.entries(config.query_params).forEach(([key, value]) => {
          url.searchParams.append(key, value as string)
        })
        apiEndpoint = url.toString()
      }

      const response = await fetch(apiEndpoint, requestConfig)

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`)
      }

      const responseData = await response.json()

      return {
        status: response.status,
        data: responseData,
        headers: response.headers
      }

    } catch (error) {
      logger.error('API request failed', {
        apiEndpoint,
        error: error.message
      })
      throw error
    }
  }

  private async extractValueFromResponse(
    apiResponse: any,
    variable: TemplateVariable,
    config: Record<string, any>
  ): Promise<any> {
    const responseData = apiResponse.data

    // Check config for value extraction path
    if (config.value_path) {
      return this.extractValueByPath(responseData, config.value_path)
    }

    // Check resolution hints for value extraction path
    if (variable.resolution_hints) {
      for (const hint of variable.resolution_hints) {
        if (hint.hint_type === 'context_path') {
          return this.extractValueByPath(responseData, hint.hint_value)
        }
      }
    }

    // Try to extract value based on variable name
    const variableName = variable.variable_name.toLowerCase()
    if (responseData[variableName]) {
      return responseData[variableName]
    }

    // Try to extract from common response structures
    if (responseData.data && responseData.data[variableName]) {
      return responseData.data[variableName]
    }

    if (responseData.result && responseData.result[variableName]) {
      return responseData.result[variableName]
    }

    // If response is an array, try to extract from first item
    if (Array.isArray(responseData) && responseData.length > 0) {
      const firstItem = responseData[0]
      if (firstItem[variableName]) {
        return firstItem[variableName]
      }
    }

    throw new Error(`Could not extract value for variable ${variable.variable_name} from API response`)
  }

  private extractValueByPath(data: any, path: string): any {
    const pathParts = path.split('.')
    let current = data

    for (const part of pathParts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part]
      } else {
        throw new Error(`Path ${path} not found in API response`)
      }
    }

    return current
  }

  private async validateApiValue(value: any, variable: TemplateVariable): Promise<{
    valid: boolean
    errors: any[]
  }> {
    const errors: any[] = []

    // Type validation
    if (!this.validateType(value, variable.variable_type)) {
      errors.push({
        field: 'value',
        error_code: 'TYPE_MISMATCH',
        message: `API value type does not match expected type ${variable.variable_type}`,
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

