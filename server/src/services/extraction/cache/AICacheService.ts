/**
 * AI Cache Service Wrapper
 * 
 * Wraps the existing aiCacheService for dependency injection and consistent interface.
 */

import { aiCacheService } from '../../aiCacheService'
import type { ExtractionDocument } from '../base/ExtractionResult'

/**
 * Cache service interface for extraction operations
 */
export interface IExtractionCacheService {
  get(
    projectId: string,
    documentContext: string,
    entityType: string,
    aiProvider?: string,
    aiModel?: string,
    correlationId?: string
  ): Promise<any[] | null>

  set(
    projectId: string,
    documentContext: string,
    entityType: string,
    entities: any[],
    aiProvider?: string,
    aiModel?: string,
    correlationId?: string,
    ttl?: number
  ): Promise<void>

  invalidateProject(projectId: string): Promise<void>
}

/**
 * Wrapper around existing aiCacheService for extraction operations
 * Provides dependency injection support while maintaining backward compatibility
 */
export class ExtractionCacheService implements IExtractionCacheService {
  /**
   * Get cached entities
   */
  async get(
    projectId: string,
    documentContext: string,
    entityType: string,
    aiProvider?: string,
    aiModel?: string,
    correlationId?: string
  ): Promise<any[] | null> {
    return aiCacheService.get(
      projectId,
      documentContext,
      entityType,
      aiProvider,
      aiModel,
      correlationId
    )
  }

  /**
   * Cache entities
   */
  async set(
    projectId: string,
    documentContext: string,
    entityType: string,
    entities: any[],
    aiProvider?: string,
    aiModel?: string,
    correlationId?: string,
    ttl?: number
  ): Promise<void> {
    return aiCacheService.set(
      projectId,
      documentContext,
      entityType,
      entities,
      aiProvider,
      aiModel,
      correlationId,
      ttl
    )
  }

  /**
   * Invalidate cache for a project
   */
  async invalidateProject(projectId: string): Promise<void> {
    return aiCacheService.invalidateProject(projectId)
  }
}

/**
 * Default cache service instance
 */
export const extractionCacheService = new ExtractionCacheService()
