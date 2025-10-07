/**
 * Context Transformer
 * Transforms context data into different formats
 */

import { logger } from '../../../utils/logger'
import type { ContextResult } from '../types'

export class ContextTransformer {
  async transform(contextResult: ContextResult, targetFormat: string): Promise<ContextResult> {
    try {
      logger.debug('Transforming context result', {
        source_id: contextResult.source_id,
        target_format: targetFormat
      })

      let transformedData: any

      switch (targetFormat.toLowerCase()) {
        case 'standard':
          transformedData = await this.transformToStandard(contextResult.data)
          break
        case 'markdown':
          transformedData = await this.transformToMarkdown(contextResult.data)
          break
        case 'json':
          transformedData = await this.transformToJson(contextResult.data)
          break
        case 'text':
          transformedData = await this.transformToText(contextResult.data)
          break
        default:
          logger.warn('Unknown target format, using original data', { target_format: targetFormat })
          transformedData = contextResult.data
      }

      // Create transformed result
      const transformedResult: ContextResult = {
        ...contextResult,
        data: transformedData,
        metadata: {
          ...contextResult.metadata,
          transformed_format: targetFormat,
          transformed_at: new Date()
        }
      }

      logger.debug('Context transformation completed', {
        source_id: contextResult.source_id,
        target_format: targetFormat
      })

      return transformedResult

    } catch (error) {
      logger.error('Context transformation failed', {
        source_id: contextResult.source_id,
        target_format: targetFormat,
        error: error.message
      })
      
      // Return original result if transformation fails
      return contextResult
    }
  }

  private async transformToStandard(data: any): Promise<any> {
    // Standard format - ensure consistent structure
    if (typeof data === 'string') {
      return {
        type: 'text',
        content: data,
        length: data.length
      }
    }

    if (typeof data === 'object' && data !== null) {
      return {
        type: 'object',
        content: data,
        keys: Object.keys(data),
        size: JSON.stringify(data).length
      }
    }

    return {
      type: typeof data,
      content: data
    }
  }

  private async transformToMarkdown(data: any): Promise<string> {
    if (typeof data === 'string') {
      return data
    }

    if (typeof data === 'object' && data !== null) {
      return this.objectToMarkdown(data)
    }

    return String(data)
  }

  private async transformToJson(data: any): Promise<any> {
    if (typeof data === 'string') {
      try {
        return JSON.parse(data)
      } catch (error) {
        return { content: data, type: 'text' }
      }
    }

    if (typeof data === 'object' && data !== null) {
      return data
    }

    return { content: data, type: typeof data }
  }

  private async transformToText(data: any): Promise<string> {
    if (typeof data === 'string') {
      return data
    }

    if (typeof data === 'object' && data !== null) {
      return this.objectToText(data)
    }

    return String(data)
  }

  private objectToMarkdown(obj: any, depth: number = 0): string {
    const indent = '  '.repeat(depth)
    let markdown = ''

    for (const [key, value] of Object.entries(obj)) {
      const headerLevel = Math.min(depth + 1, 6)
      const headerPrefix = '#'.repeat(headerLevel)

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        markdown += `${indent}${headerPrefix} ${key}\n\n`
        markdown += this.objectToMarkdown(value, depth + 1)
      } else if (Array.isArray(value)) {
        markdown += `${indent}${headerPrefix} ${key}\n\n`
        value.forEach((item, index) => {
          if (typeof item === 'object' && item !== null) {
            markdown += `${indent}## Item ${index + 1}\n\n`
            markdown += this.objectToMarkdown(item, depth + 1)
          } else {
            markdown += `${indent}- ${item}\n`
          }
        })
        markdown += '\n'
      } else {
        markdown += `${indent}**${key}**: ${value}\n\n`
      }
    }

    return markdown
  }

  private objectToText(obj: any, depth: number = 0): string {
    const indent = '  '.repeat(depth)
    let text = ''

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        text += `${indent}${key}:\n`
        text += this.objectToText(value, depth + 1)
      } else if (Array.isArray(value)) {
        text += `${indent}${key}:\n`
        value.forEach((item, index) => {
          if (typeof item === 'object' && item !== null) {
            text += `${indent}  [${index}]:\n`
            text += this.objectToText(item, depth + 2)
          } else {
            text += `${indent}  - ${item}\n`
          }
        })
      } else {
        text += `${indent}${key}: ${value}\n`
      }
    }

    return text
  }
}
