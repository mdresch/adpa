/**
 * Context Enricher
 * Enriches resolution context with additional data
 */

import { logger } from '../../../utils/logger'
import type { ResolutionContext, TemplateVariable, EnrichedContext } from '../types'

export class ContextEnricher {
  async enrichContext(context: ResolutionContext, variables: TemplateVariable[]): Promise<EnrichedContext> {
    try {
      logger.info('Enriching context', {
        contextId: context.context_id,
        variableCount: variables.length
      })

      const startTime = Date.now()

      // Create enriched context
      const enrichedContext: EnrichedContext = {
        original_context: context,
        enriched_data: {},
        enrichment_sources: [],
        enrichment_confidence: 0.8,
        enrichment_metadata: {
          enrichment_time: Date.now() - startTime,
          variables_processed: variables.length,
          enrichment_strategies: []
        }
      }

      // Enrich with variable-specific data
      await this.enrichWithVariableData(enrichedContext, variables)

      // Enrich with cross-references
      await this.enrichWithCrossReferences(enrichedContext, variables)

      // Enrich with computed values
      await this.enrichWithComputedValues(enrichedContext, variables)

      const enrichmentTime = Date.now() - startTime

      logger.info('Context enrichment completed', {
        contextId: context.context_id,
        enrichmentSources: enrichedContext.enrichment_sources.length,
        enrichmentTime
      })

      return enrichedContext

    } catch (error) {
      logger.error('Context enrichment failed', {
        contextId: context.context_id,
        error: error.message
      })
      throw error
    }
  }

  private async enrichWithVariableData(enrichedContext: EnrichedContext, variables: TemplateVariable[]): Promise<void> {
    // Add variable metadata to enriched data
    enrichedContext.enriched_data.variables = {
      count: variables.length,
      types: variables.map(v => v.variable_type),
      names: variables.map(v => v.variable_name),
      required: variables.filter(v => v.variable_definition.required).length,
      optional: variables.filter(v => !v.variable_definition.required).length
    }

    enrichedContext.enrichment_sources.push('variable_metadata')
    enrichedContext.enrichment_metadata.enrichment_strategies.push('variable_data_enrichment')
  }

  private async enrichWithCrossReferences(enrichedContext: EnrichedContext, variables: TemplateVariable[]): Promise<void> {
    // Create cross-reference mappings
    const crossReferences: Record<string, string[]> = {}

    for (const variable of variables) {
      const references: string[] = []
      const variableName = variable.variable_name.toLowerCase()

      // Find variables that might reference this one
      for (const otherVariable of variables) {
        if (otherVariable.variable_id !== variable.variable_id) {
          const otherName = otherVariable.variable_name.toLowerCase()
          if (otherName.includes(variableName) || variableName.includes(otherName)) {
            references.push(otherVariable.variable_id)
          }
        }
      }

      if (references.length > 0) {
        crossReferences[variable.variable_id] = references
      }
    }

    enrichedContext.enriched_data.cross_references = crossReferences
    enrichedContext.enrichment_sources.push('cross_references')
    enrichedContext.enrichment_metadata.enrichment_strategies.push('cross_reference_enrichment')
  }

  private async enrichWithComputedValues(enrichedContext: EnrichedContext, variables: TemplateVariable[]): Promise<void> {
    // Add computed context values
    const computedValues: Record<string, any> = {}

    // Compute context statistics
    if (enrichedContext.original_context.project_context) {
      const project = enrichedContext.original_context.project_context
      computedValues.project_stats = {
        stakeholder_count: project.stakeholders?.length || 0,
        requirement_count: project.requirements?.length || 0,
        risk_count: project.risks?.length || 0,
        milestone_count: project.milestones?.length || 0
      }
    }

    if (enrichedContext.original_context.user_context) {
      const user = enrichedContext.original_context.user_context
      computedValues.user_stats = {
        preference_count: user.user_preferences?.length || 0,
        expertise_count: user.user_expertise?.length || 0,
        domain_knowledge_count: user.user_domain_knowledge?.length || 0
      }
    }

    enrichedContext.enriched_data.computed_values = computedValues
    enrichedContext.enrichment_sources.push('computed_values')
    enrichedContext.enrichment_metadata.enrichment_strategies.push('computed_value_enrichment')
  }
}

