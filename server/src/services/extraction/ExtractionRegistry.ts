/**
 * Extraction Registry
 * 
 * Maps entity types to their extract and save functions.
 * Supports feature flags for per-entity rollout and rollback.
 */

import { logger } from '../../utils/logger'
import type { ExtractionContext } from './base/ExtractionContext'
import type { ExtractionResult } from './base/ExtractionResult'
import type { PersistenceResult } from './base/Persistence'
import type { PoolClient } from 'pg'

/**
 * Entity extractor function signature
 */
export type EntityExtractor<T = any> = (
  context: ExtractionContext,
  options?: { temperature?: number; maxTokens?: number }
) => Promise<ExtractionResult<T>>

/**
 * Entity saver function signature
 */
export type EntitySaver<T = any> = (
  client: PoolClient,
  projectId: string,
  userId: string,
  entities: T[]
) => Promise<PersistenceResult>

/**
 * Entity module definition
 */
export interface EntityModule<T = any> {
  extract: EntityExtractor<T>
  save: EntitySaver<T>
}

/**
 * Feature flag configuration
 */
interface FeatureFlags {
  [entityType: string]: boolean
}

/**
 * Extraction Registry
 * 
 * Manages entity extractors and savers with feature flag support.
 */
export class ExtractionRegistry {
  private modules = new Map<string, EntityModule>()
  private featureFlags: FeatureFlags = {}

  /**
   * Register an entity module
   */
  register<T = any>(entityType: string, module: EntityModule<T>): void {
    this.modules.set(entityType, module)
    logger.debug(`[EXTRACTION-REGISTRY] Registered entity module: ${entityType}`)
  }

  /**
   * Get extractor for entity type
   */
  getExtractor(entityType: string): EntityExtractor | null {
    const module = this.modules.get(entityType)
    return module?.extract || null
  }

  /**
   * Get saver for entity type
   */
  getSaver(entityType: string): EntitySaver | null {
    const module = this.modules.get(entityType)
    return module?.save || null
  }

  /**
   * Check if entity type is registered
   */
  hasEntity(entityType: string): boolean {
    return this.modules.has(entityType)
  }

  /**
   * Check if entity type is enabled via feature flag
   */
  isEnabled(entityType: string): boolean {
    // If no feature flag set, default to enabled (for backward compatibility)
    if (!(entityType in this.featureFlags)) {
      return true
    }
    return this.featureFlags[entityType] === true
  }

  /**
   * Enable feature flag for entity type
   */
  enableFeature(entityType: string): void {
    this.featureFlags[entityType] = true
    logger.info(`[EXTRACTION-REGISTRY] Enabled feature flag for: ${entityType}`)
  }

  /**
   * Disable feature flag for entity type
   */
  disableFeature(entityType: string): void {
    this.featureFlags[entityType] = false
    logger.info(`[EXTRACTION-REGISTRY] Disabled feature flag for: ${entityType}`)
  }

  /**
   * Set feature flag from environment variable
   */
  setFeatureFlagFromEnv(entityType: string): void {
    const envKey = `EXTRACTION_USE_NEW_${entityType.toUpperCase().replace(/-/g, '_')}`
    const envValue = process.env[envKey]
    
    if (envValue !== undefined) {
      this.featureFlags[entityType] = envValue === 'true' || envValue === '1'
      logger.info(`[EXTRACTION-REGISTRY] Feature flag for ${entityType} set from ${envKey}=${envValue}`)
    }
  }

  /**
   * Get all registered entity types
   */
  getRegisteredEntities(): string[] {
    return Array.from(this.modules.keys())
  }

  /**
   * Get feature flag status for all entities
   */
  getFeatureFlags(): FeatureFlags {
    return { ...this.featureFlags }
  }
}

/**
 * Global registry instance
 */
export const extractionRegistry = new ExtractionRegistry()

/**
 * Initialize registry with entity modules
 */
export async function initializeRegistry(): Promise<void> {
  // Register work_items module (Phase 2)
  const { extractWorkItems, saveWorkItems } = await import('./entities/work_items')
  extractionRegistry.register('work_items', {
    extract: extractWorkItems,
    save: saveWorkItems
  })

  // Register capacity_plans module (Phase 4)
  const { extractCapacityPlans, saveCapacityPlans } = await import('./entities/capacity_plans')
  extractionRegistry.register('capacity_plans', {
    extract: extractCapacityPlans,
    save: saveCapacityPlans
  })

  // Register performance_measurements module (Phase 5)
  const { extractPerformanceMeasurements, savePerformanceMeasurements } = await import('./entities/performance_measurements')
  extractionRegistry.register('performance_measurements', {
    extract: extractPerformanceMeasurements,
    save: savePerformanceMeasurements
  })

  // Register earned_value_metrics module (Phase 5)
  const { extractEarnedValueMetrics, saveEarnedValueMetrics } = await import('./entities/earned_value_metrics')
  extractionRegistry.register('earned_value_metrics', {
    extract: extractEarnedValueMetrics,
    save: saveEarnedValueMetrics
  })

  // Register opportunities module (Phase 5)
  const { extractOpportunities, saveOpportunities } = await import('./entities/opportunities')
  extractionRegistry.register('opportunities', {
    extract: extractOpportunities,
    save: saveOpportunities
  })

  // Register risk_responses module (Phase 5)
  const { extractRiskResponses, saveRiskResponses } = await import('./entities/risk_responses')
  extractionRegistry.register('risk_responses', {
    extract: extractRiskResponses,
    save: saveRiskResponses
  })

  // Register performance_actuals module (Phase 5)
  const { extractPerformanceActuals, savePerformanceActuals } = await import('./entities/performance_actuals')
  extractionRegistry.register('performance_actuals', {
    extract: extractPerformanceActuals,
    save: savePerformanceActuals
  })

  // Register stakeholders module (Phase 6 - Core Entities)
  const { extractStakeholders, saveStakeholders } = await import('./entities/stakeholders')
  extractionRegistry.register('stakeholders', {
    extract: extractStakeholders,
    save: saveStakeholders
  })

  // Register requirements module (Phase 6 - Core Entities)
  const { extractRequirements, saveRequirements } = await import('./entities/requirements')
  extractionRegistry.register('requirements', {
    extract: extractRequirements,
    save: saveRequirements
  })

  // Register risks module (Phase 6 - Core Entities)
  const { extractRisks, saveRisks } = await import('./entities/risks')
  extractionRegistry.register('risks', {
    extract: extractRisks,
    save: saveRisks
  })

  // Register milestones module (Phase 6 - Core Entities)
  const { extractMilestones, saveMilestones } = await import('./entities/milestones')
  extractionRegistry.register('milestones', {
    extract: extractMilestones,
    save: saveMilestones
  })

  // Register constraints module (Phase 6 - Core Entities)
  const { extractConstraints, saveConstraints } = await import('./entities/constraints')
  extractionRegistry.register('constraints', {
    extract: extractConstraints,
    save: saveConstraints
  })

  // Register activities module (Phase 6 - Core Entities)
  const { extractActivities, saveActivities } = await import('./entities/activities')
  extractionRegistry.register('activities', {
    extract: extractActivities,
    save: saveActivities
  })

  // Register deliverables module (Phase 6 - Core Entities)
  const { extractDeliverables, saveDeliverables } = await import('./entities/deliverables')
  extractionRegistry.register('deliverables', {
    extract: extractDeliverables,
    save: saveDeliverables
  })

  // Register scope_items module (Phase 6 - Core Entities)
  const { extractScopeItems, saveScopeItems } = await import('./entities/scope_items')
  extractionRegistry.register('scope_items', {
    extract: extractScopeItems,
    save: saveScopeItems
  })

  // Register success_criteria module (Phase 6 - Core Entities - FINAL)
  const { extractSuccessCriteria, saveSuccessCriteria } = await import('./entities/success_criteria')
  extractionRegistry.register('success_criteria', {
    extract: extractSuccessCriteria,
    save: saveSuccessCriteria
  })

  // Register phases module (Phase 7 - Project Phases & Iterations)
  const { extractPhases, savePhases } = await import('./entities/phases')
  extractionRegistry.register('phases', {
    extract: extractPhases,
    save: savePhases
  })

  // Register project_iterations module (Phase 7 - Project Phases & Iterations)
  const { extractProjectIterations, saveProjectIterations } = await import('./entities/project_iterations')
  extractionRegistry.register('project_iterations', {
    extract: extractProjectIterations,
    save: saveProjectIterations
  })

  // Register best_practices module (Phase 8 - Tier 2 / Quality & Compliance)
  const { extractBestPractices, saveBestPractices } = await import('./entities/best_practices')
  extractionRegistry.register('best_practices', {
    extract: extractBestPractices,
    save: saveBestPractices
  })

  // Register resources module (Phase 8 - Tier 2 / Resource Management)
  const { extractResources, saveResources } = await import('./entities/resources')
  extractionRegistry.register('resources', {
    extract: extractResources,
    save: saveResources
  })

  // Register technologies module (Phase 8 - Tier 2 / Knowledge & Technology)
  const { extractTechnologies, saveTechnologies } = await import('./entities/technologies')
  extractionRegistry.register('technologies', {
    extract: extractTechnologies,
    save: saveTechnologies
  })

  // Register quality_standards module (Phase 8 - Tier 2 / Quality & Compliance)
  const { extractQualityStandards, saveQualityStandards } = await import('./entities/quality_standards')
  extractionRegistry.register('quality_standards', {
    extract: extractQualityStandards,
    save: saveQualityStandards
  })

  // Register team_agreements module (Phase 8 - Tier 2 / Team Performance Domain)
  const { extractTeamAgreements, saveTeamAgreements } = await import('./entities/team_agreements')
  extractionRegistry.register('team_agreements', {
    extract: extractTeamAgreements,
    save: saveTeamAgreements
  })

  // Register development_approaches module (Phase 8 - Tier 2 / Development Approach & Life Cycle Domain)
  const { extractDevelopmentApproaches, saveDevelopmentApproaches } = await import('./entities/development_approaches')
  extractionRegistry.register('development_approaches', {
    extract: extractDevelopmentApproaches,
    save: saveDevelopmentApproaches
  })

  // Load feature flags from environment
  extractionRegistry.setFeatureFlagFromEnv('work_items')
  extractionRegistry.setFeatureFlagFromEnv('capacity_plans')
  extractionRegistry.setFeatureFlagFromEnv('performance_measurements')
  extractionRegistry.setFeatureFlagFromEnv('earned_value_metrics')
  extractionRegistry.setFeatureFlagFromEnv('opportunities')
  extractionRegistry.setFeatureFlagFromEnv('risk_responses')
  extractionRegistry.setFeatureFlagFromEnv('performance_actuals')
  extractionRegistry.setFeatureFlagFromEnv('stakeholders')
  extractionRegistry.setFeatureFlagFromEnv('requirements')
  extractionRegistry.setFeatureFlagFromEnv('risks')
  extractionRegistry.setFeatureFlagFromEnv('milestones')
  extractionRegistry.setFeatureFlagFromEnv('constraints')
  extractionRegistry.setFeatureFlagFromEnv('activities')
  extractionRegistry.setFeatureFlagFromEnv('deliverables')
  extractionRegistry.setFeatureFlagFromEnv('scope_items')
  extractionRegistry.setFeatureFlagFromEnv('success_criteria')
  extractionRegistry.setFeatureFlagFromEnv('phases')
  extractionRegistry.setFeatureFlagFromEnv('project_iterations')
  extractionRegistry.setFeatureFlagFromEnv('best_practices')
  extractionRegistry.setFeatureFlagFromEnv('resources')
  extractionRegistry.setFeatureFlagFromEnv('technologies')
  extractionRegistry.setFeatureFlagFromEnv('quality_standards')
  extractionRegistry.setFeatureFlagFromEnv('team_agreements')
  extractionRegistry.setFeatureFlagFromEnv('development_approaches')

  logger.info('[EXTRACTION-REGISTRY] Registry initialized', {
    registeredEntities: extractionRegistry.getRegisteredEntities(),
    featureFlags: extractionRegistry.getFeatureFlags()
  })
}

