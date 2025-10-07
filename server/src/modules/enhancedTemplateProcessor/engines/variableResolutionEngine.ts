/**
 * Variable Resolution Engine
 * Resolves template variables with context data
 */

import { logger } from '../../../utils/logger'
import { VariableResolutionEngine as CoreVariableResolutionEngine } from '../../variableResolution'
import type { ContextBundle, VariableResolution } from '../types'

export class VariableResolutionEngine {
  private coreEngine: CoreVariableResolutionEngine

  constructor() {
    this.coreEngine = new CoreVariableResolutionEngine()
  }

  async resolveVariables(variables: any[], context: ContextBundle): Promise<VariableResolution[]> {
    try {
      logger.info('Resolving template variables', { variablesCount: variables.length })
      
      // Use the core variable resolution engine
      const resolutions = await this.coreEngine.resolveVariables(variables, context)
      
      // Convert to the expected format
      const variableResolutions: VariableResolution[] = resolutions.map(resolution => ({
        variable_id: `var_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        variable_name: resolution.variable_name,
        variable_type: resolution.variable_type,
        resolved_value: resolution.resolved_value,
        resolution_confidence: resolution.confidence_score,
        resolution_source: resolution.source,
        resolution_timestamp: new Date(),
        metadata: {
          resolution_method: resolution.resolution_method,
          resolution_context: resolution.context
        }
      }))

      logger.info('Template variables resolved successfully', {
        variablesCount: variables.length,
        resolutionsCount: variableResolutions.length
      })

      return variableResolutions
    } catch (error) {
      logger.error('Failed to resolve template variables', {
        variablesCount: variables.length,
        error: error.message
      })
      throw error
    }
  }
}
