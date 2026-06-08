/**
 * File Content Strategy
 * Extracts variable values from file contents
 */

import { logger } from '../../../utils/logger'
import { promises as fs } from 'fs'
import { join } from 'path'
import type { TemplateVariable, ResolutionContext, ResolutionStrategy } from '../types'

export interface FileContentResult {
  value: any
  source: string
  confidence: number
  file_metadata: Record<string, any>
}

export class FileContentStrategy {
  async resolve(
    variable: TemplateVariable,
    context: ResolutionContext,
    config: Record<string, any>
  ): Promise<FileContentResult> {
    try {
      logger.debug('Resolving variable using file content', {
        variableId: variable.variable_id,
        variableName: variable.variable_name
      })

      const startTime = Date.now()

      // Get file path from resolution hints or config
      const filePath = await this.getFilePath(variable, config)

      if (!filePath) {
        throw new Error(`No file path configured for variable ${variable.variable_name}`)
      }

      // Read file content
      const fileContent = await this.readFileContent(filePath, config)

      // Extract value from file content
      const extractedValue = await this.extractValueFromFileContent(fileContent, variable, config)

      // Validate extracted value
      const validationResult = await this.validateFileValue(extractedValue, variable)
      if (!validationResult.valid) {
        throw new Error(`File value validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`)
      }

      const processingTime = Date.now() - startTime

      logger.info('File content resolution completed', {
        variableId: variable.variable_id,
        filePath,
        processingTime
      })

      return {
        value: extractedValue,
        source: 'file_content',
        confidence: 0.7, // Moderate confidence for file content
        file_metadata: {
          processing_time: processingTime,
          file_path: filePath,
          file_size: fileContent.length,
          variable_type: variable.variable_type,
          file_strategy: 'file_content'
        }
      }

    } catch (error) {
      logger.error('File content resolution failed', {
        variableId: variable.variable_id,
        error: error.message
      })
      throw error
    }
  }

  private async getFilePath(variable: TemplateVariable, config: Record<string, any>): Promise<string | null> {
    // Check resolution hints for file path
    if (variable.resolution_hints) {
      for (const hint of variable.resolution_hints) {
        if (hint.hint_type === 'file_path') {
          return hint.hint_value
        }
      }
    }

    // Check config for file path
    if (config.file_path) {
      return config.file_path
    }

    // Check config for file directory and construct path
    if (config.file_directory && config.file_name) {
      return join(config.file_directory, config.file_name)
    }

    return null
  }

  private async readFileContent(filePath: string, config: Record<string, any>): Promise<string> {
    try {
      // Check if file exists
      await fs.access(filePath)

      // Read file content
      const content = await fs.readFile(filePath, 'utf8')

      return content

    } catch (error) {
      logger.error('Failed to read file content', {
        filePath,
        error: error.message
      })
      throw error
    }
  }

  private async extractValueFromFileContent(
    fileContent: string,
    variable: TemplateVariable,
    config: Record<string, any>
  ): Promise<any> {
    const variableName = variable.variable_name.toLowerCase()

    // Check config for extraction method
    if (config.extraction_method) {
      switch (config.extraction_method) {
        case 'json':
          return this.extractFromJson(fileContent, variable, config)
        case 'yaml':
          return this.extractFromYaml(fileContent, variable, config)
        case 'xml':
          return this.extractFromXml(fileContent, variable, config)
        case 'csv':
          return this.extractFromCsv(fileContent, variable, config)
        case 'regex':
          return this.extractFromRegex(fileContent, variable, config)
        default:
          return this.extractFromText(fileContent, variable, config)
      }
    }

    // Auto-detect file type and extract accordingly
    if (fileContent.trim().startsWith('{') || fileContent.trim().startsWith('[')) {
      return this.extractFromJson(fileContent, variable, config)
    } else if (fileContent.includes('---') || fileContent.includes(':')) {
      return this.extractFromYaml(fileContent, variable, config)
    } else if (fileContent.includes('<?xml') || fileContent.includes('<')) {
      return this.extractFromXml(fileContent, variable, config)
    } else if (fileContent.includes(',') && fileContent.includes('\n')) {
      return this.extractFromCsv(fileContent, variable, config)
    } else {
      return this.extractFromText(fileContent, variable, config)
    }
  }

  private async extractFromJson(fileContent: string, variable: TemplateVariable, config: Record<string, any>): Promise<any> {
    try {
      const jsonData = JSON.parse(fileContent)
      const variableName = variable.variable_name.toLowerCase()

      // Check config for value extraction path
      if (config.value_path) {
        return this.extractValueByPath(jsonData, config.value_path)
      }

      // Try to extract value based on variable name
      if (jsonData[variableName]) {
        return jsonData[variableName]
      }

      // Try to extract from nested objects
      return this.extractFromNestedObject(jsonData, variableName)

    } catch (error) {
      logger.error('Failed to extract from JSON', {
        error: error.message
      })
      throw error
    }
  }

  private async extractFromYaml(fileContent: string, variable: TemplateVariable, config: Record<string, any>): Promise<any> {
    try {
      // Simple YAML parsing (would need a proper YAML library in production)
      const lines = fileContent.split('\n')
      const variableName = variable.variable_name.toLowerCase()

      for (const line of lines) {
        if (line.includes(':')) {
          const [key, value] = line.split(':').map(s => s.trim())
          if (key.toLowerCase() === variableName) {
            return value
          }
        }
      }

      throw new Error(`Variable ${variable.variable_name} not found in YAML file`)

    } catch (error) {
      logger.error('Failed to extract from YAML', {
        error: error.message
      })
      throw error
    }
  }

  private async extractFromXml(fileContent: string, variable: TemplateVariable, config: Record<string, any>): Promise<any> {
    try {
      // Simple XML parsing (would need a proper XML library in production)
      const variableName = variable.variable_name.toLowerCase()
      const regex = new RegExp(`<${variableName}[^>]*>([^<]*)</${variableName}>`, 'i')
      const match = fileContent.match(regex)

      if (match) {
        return match[1]
      }

      throw new Error(`Variable ${variable.variable_name} not found in XML file`)

    } catch (error) {
      logger.error('Failed to extract from XML', {
        error: error.message
      })
      throw error
    }
  }

  private async extractFromCsv(fileContent: string, variable: TemplateVariable, config: Record<string, any>): Promise<any> {
    try {
      const lines = fileContent.split('\n')
      if (lines.length < 2) {
        throw new Error('CSV file must have at least a header and one data row')
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
      const variableName = variable.variable_name.toLowerCase()

      // Find the column index for the variable
      const columnIndex = headers.findIndex(h => h === variableName)
      if (columnIndex === -1) {
        throw new Error(`Variable ${variable.variable_name} not found in CSV headers`)
      }

      // Return the value from the first data row
      const firstDataRow = lines[1].split(',')
      if (firstDataRow[columnIndex]) {
        return firstDataRow[columnIndex].trim()
      }

      throw new Error(`No value found for variable ${variable.variable_name} in CSV file`)

    } catch (error) {
      logger.error('Failed to extract from CSV', {
        error: error.message
      })
      throw error
    }
  }

  private async extractFromRegex(fileContent: string, variable: TemplateVariable, config: Record<string, any>): Promise<any> {
    try {
      const regex = new RegExp(config.regex_pattern, 'i')
      const match = fileContent.match(regex)

      if (match) {
        return match[1] || match[0]
      }

      throw new Error(`Variable ${variable.variable_name} not found using regex pattern`)

    } catch (error) {
      logger.error('Failed to extract from regex', {
        error: error.message
      })
      throw error
    }
  }

  private async extractFromText(fileContent: string, variable: TemplateVariable, config: Record<string, any>): Promise<any> {
    const variableName = variable.variable_name.toLowerCase()

    // Try to find the variable in the text
    const lines = fileContent.split('\n')
    for (const line of lines) {
      const lowerLine = line.toLowerCase()
      const variableIndex = lowerLine.indexOf(variableName)
      if (variableIndex >= 0) {
        const remainder = line.slice(variableIndex + variableName.length)
        const match = remainder.match(/^[\s:=]+([^\n]+)/i)
        if (match?.[1]) {
          return match[1].trim()
        }
      }
    }

    throw new Error(`Variable ${variable.variable_name} not found in text file`)
  }

  private extractValueByPath(data: any, path: string): any {
    const pathParts = path.split('.')
    let current = data

    for (const part of pathParts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part]
      } else {
        throw new Error(`Path ${path} not found in file content`)
      }
    }

    return current
  }

  private extractFromNestedObject(obj: any, variableName: string): any {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        if (key.toLowerCase() === variableName) {
          return obj[key]
        }
        
        if (typeof obj[key] === 'object' && obj[key] !== null) {
          const nested = this.extractFromNestedObject(obj[key], variableName)
          if (nested !== undefined) {
            return nested
          }
        }
      }
    }

    return undefined
  }

  private async validateFileValue(value: any, variable: TemplateVariable): Promise<{
    valid: boolean
    errors: any[]
  }> {
    const errors: any[] = []

    // Type validation
    if (!this.validateType(value, variable.variable_type)) {
      errors.push({
        field: 'value',
        error_code: 'TYPE_MISMATCH',
        message: `File value type does not match expected type ${variable.variable_type}`,
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

