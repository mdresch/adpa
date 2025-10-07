/**
 * Template Inheritance Strategy
 * Inherits variable values from parent templates or similar templates
 */

import { logger } from '../../../utils/logger'
import type { TemplateVariable, ResolutionContext, ResolutionStrategy } from '../types'

export interface TemplateInheritanceResult {
  value: any
  source: string
  confidence: number
  inheritance_metadata: Record<string, any>
}

export class TemplateInheritanceStrategy {
  async resolve(
    variable: TemplateVariable,
    context: ResolutionContext,
    config: Record<string, any>
  ): Promise<TemplateInheritanceResult> {
    try {
      logger.debug('Resolving variable using template inheritance', {
        variableId: variable.variable_id,
        variableName: variable.variable_name
      })

      const startTime = Date.now()

      if (!context.template_context) {
        throw new Error('Template context not available for inheritance-based resolution')
      }

      const templateContext = context.template_context
      const variableName = variable.variable_name

      let value: any = null
      let source = ''
      let confidence = 0

      // Try to inherit from parent template
      if (templateContext.template_metadata?.parent_template_id) {
        const parentResult = await this.inheritFromParentTemplate(variable, templateContext.template_metadata.parent_template_id)
        if (parentResult.value !== null) {
          value = parentResult.value
          source = 'parent_template'
          confidence = parentResult.confidence
        }
      }

      // Try to inherit from similar templates
      if (value === null && templateContext.template_framework) {
        const similarResult = await this.inheritFromSimilarTemplates(variable, templateContext.template_framework)
        if (similarResult.value !== null) {
          value = similarResult.value
          source = 'similar_templates'
          confidence = similarResult.confidence
        }
      }

      // Try to inherit from template category
      if (value === null && templateContext.template_category) {
        const categoryResult = await this.inheritFromTemplateCategory(variable, templateContext.template_category)
        if (categoryResult.value !== null) {
          value = categoryResult.value
          source = 'template_category'
          confidence = categoryResult.confidence
        }
      }

      if (value === null) {
        throw new Error(`Could not inherit value for variable ${variable.variable_name} from templates`)
      }

      const processingTime = Date.now() - startTime

      logger.info('Template inheritance resolution completed', {
        variableId: variable.variable_id,
        source,
        confidence,
        processingTime
      })

      return {
        value,
        source,
        confidence,
        inheritance_metadata: {
          processing_time: processingTime,
          variable_type: variable.variable_type,
          inheritance_strategy: 'template_inheritance'
        }
      }

    } catch (error) {
      logger.error('Template inheritance resolution failed', {
        variableId: variable.variable_id,
        error: error.message
      })
      throw error
    }
  }

  private async inheritFromParentTemplate(variable: TemplateVariable, parentTemplateId: string): Promise<{
    value: any
    confidence: number
  }> {
    try {
      // Query database for parent template
      const result = await pool.query(
        'SELECT variables FROM templates WHERE id = $1',
        [parentTemplateId]
      )

      if (result.rows.length === 0) {
        return { value: null, confidence: 0 }
      }

      const parentVariables = result.rows[0].variables || []
      const parentVariable = parentVariables.find((v: any) => v.variable_name === variable.variable_name)

      if (parentVariable && parentVariable.variable_definition?.default_value !== undefined) {
        return {
          value: parentVariable.variable_definition.default_value,
          confidence: 0.8
        }
      }

      return { value: null, confidence: 0 }

    } catch (error) {
      logger.error('Failed to inherit from parent template', {
        parentTemplateId,
        error: error.message
      })
      return { value: null, confidence: 0 }
    }
  }

  private async inheritFromSimilarTemplates(variable: TemplateVariable, framework: string): Promise<{
    value: any
    confidence: number
  }> {
    try {
      // Query database for similar templates
      const result = await pool.query(
        'SELECT variables FROM templates WHERE framework = $1 AND id != $2 LIMIT 5',
        [framework, variable.variable_id]
      )

      if (result.rows.length === 0) {
        return { value: null, confidence: 0 }
      }

      // Find common variable values
      const commonValues: any[] = []
      for (const row of result.rows) {
        const variables = row.variables || []
        const similarVariable = variables.find((v: any) => v.variable_name === variable.variable_name)
        if (similarVariable && similarVariable.variable_definition?.default_value !== undefined) {
          commonValues.push(similarVariable.variable_definition.default_value)
        }
      }

      if (commonValues.length > 0) {
        // Return the most common value
        const valueCounts = commonValues.reduce((acc, val) => {
          acc[val] = (acc[val] || 0) + 1
          return acc
        }, {})

        const mostCommonValue = Object.keys(valueCounts).reduce((a, b) => 
          valueCounts[a] > valueCounts[b] ? a : b
        )

        return {
          value: mostCommonValue,
          confidence: 0.6
        }
      }

      return { value: null, confidence: 0 }

    } catch (error) {
      logger.error('Failed to inherit from similar templates', {
        framework,
        error: error.message
      })
      return { value: null, confidence: 0 }
    }
  }

  private async inheritFromTemplateCategory(variable: TemplateVariable, category: string): Promise<{
    value: any
    confidence: number
  }> {
    try {
      // Query database for templates in the same category
      const result = await pool.query(
        'SELECT variables FROM templates WHERE category = $1 AND id != $2 LIMIT 10',
        [category, variable.variable_id]
      )

      if (result.rows.length === 0) {
        return { value: null, confidence: 0 }
      }

      // Find common variable values
      const commonValues: any[] = []
      for (const row of result.rows) {
        const variables = row.variables || []
        const categoryVariable = variables.find((v: any) => v.variable_name === variable.variable_name)
        if (categoryVariable && categoryVariable.variable_definition?.default_value !== undefined) {
          commonValues.push(categoryVariable.variable_definition.default_value)
        }
      }

      if (commonValues.length > 0) {
        // Return the most common value
        const valueCounts = commonValues.reduce((acc, val) => {
          acc[val] = (acc[val] || 0) + 1
          return acc
        }, {})

        const mostCommonValue = Object.keys(valueCounts).reduce((a, b) => 
          valueCounts[a] > valueCounts[b] ? a : b
        )

        return {
          value: mostCommonValue,
          confidence: 0.5
        }
      }

      return { value: null, confidence: 0 }

    } catch (error) {
      logger.error('Failed to inherit from template category', {
        category,
        error: error.message
      })
      return { value: null, confidence: 0 }
    }
  }
}

