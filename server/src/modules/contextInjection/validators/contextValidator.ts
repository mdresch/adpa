/**
 * Context Validator
 * Validates context data quality and structure
 */

import { logger } from '../../../utils/logger'
import type { ContextResult } from '../types'

export class ContextValidator {
  async validate(contextResult: ContextResult): Promise<boolean> {
    try {
      logger.debug('Validating context result', { source_id: contextResult.source_id })

      // Basic validation checks
      const checks = [
        this.validateBasicStructure(contextResult),
        this.validateMetadata(contextResult),
        this.validateDataQuality(contextResult),
        this.validateSizeLimits(contextResult)
      ]

      const results = await Promise.all(checks)
      const isValid = results.every(result => result === true)

      logger.debug('Context validation completed', {
        source_id: contextResult.source_id,
        is_valid: isValid
      })

      return isValid

    } catch (error) {
      logger.error('Context validation failed', {
        source_id: contextResult.source_id,
        error: error.message
      })
      return false
    }
  }

  private validateBasicStructure(contextResult: ContextResult): boolean {
    // Check required fields
    if (!contextResult.source_id) {
      logger.warn('Context result missing source_id')
      return false
    }

    if (!contextResult.source_name) {
      logger.warn('Context result missing source_name')
      return false
    }

    if (!contextResult.metadata) {
      logger.warn('Context result missing metadata')
      return false
    }

    return true
  }

  private validateMetadata(contextResult: ContextResult): boolean {
    const metadata = contextResult.metadata

    // Check required metadata fields
    if (typeof metadata.retrieved_at !== 'object' || !(metadata.retrieved_at instanceof Date)) {
      logger.warn('Context result metadata missing or invalid retrieved_at')
      return false
    }

    if (typeof metadata.relevance_score !== 'number' || metadata.relevance_score < 0 || metadata.relevance_score > 1) {
      logger.warn('Context result metadata missing or invalid relevance_score')
      return false
    }

    if (typeof metadata.freshness_score !== 'number' || metadata.freshness_score < 0 || metadata.freshness_score > 1) {
      logger.warn('Context result metadata missing or invalid freshness_score')
      return false
    }

    if (typeof metadata.confidence_score !== 'number' || metadata.confidence_score < 0 || metadata.confidence_score > 1) {
      logger.warn('Context result metadata missing or invalid confidence_score')
      return false
    }

    if (typeof metadata.size_bytes !== 'number' || metadata.size_bytes < 0) {
      logger.warn('Context result metadata missing or invalid size_bytes')
      return false
    }

    return true
  }

  private validateDataQuality(contextResult: ContextResult): boolean {
    // Check if data exists
    if (contextResult.data === null || contextResult.data === undefined) {
      logger.warn('Context result has null or undefined data')
      return false
    }

    // Check for errors
    if (contextResult.errors && contextResult.errors.length > 0) {
      logger.warn('Context result has errors', { errors: contextResult.errors })
      return false
    }

    // Check data type and structure
    if (typeof contextResult.data === 'object') {
      // For objects, check if they're not empty
      if (Object.keys(contextResult.data).length === 0) {
        logger.warn('Context result has empty object data')
        return false
      }
    } else if (typeof contextResult.data === 'string') {
      // For strings, check if they're not empty
      if (contextResult.data.trim().length === 0) {
        logger.warn('Context result has empty string data')
        return false
      }
    }

    return true
  }

  private validateSizeLimits(contextResult: ContextResult): boolean {
    const maxSizeBytes = 10 * 1024 * 1024 // 10MB limit

    if (contextResult.metadata.size_bytes > maxSizeBytes) {
      logger.warn('Context result exceeds size limit', {
        size_bytes: contextResult.metadata.size_bytes,
        max_size_bytes: maxSizeBytes
      })
      return false
    }

    return true
  }

  async validateContextBundle(contextResults: ContextResult[]): Promise<{
    isValid: boolean
    validResults: ContextResult[]
    invalidResults: ContextResult[]
    errors: string[]
  }> {
    const validResults: ContextResult[] = []
    const invalidResults: ContextResult[] = []
    const errors: string[] = []

    for (const result of contextResults) {
      try {
        const isValid = await this.validate(result)
        if (isValid) {
          validResults.push(result)
        } else {
          invalidResults.push(result)
          errors.push(`Validation failed for source ${result.source_id}`)
        }
      } catch (error) {
        invalidResults.push(result)
        errors.push(`Validation error for source ${result.source_id}: ${error.message}`)
      }
    }

    return {
      isValid: invalidResults.length === 0,
      validResults,
      invalidResults,
      errors
    }
  }
}
