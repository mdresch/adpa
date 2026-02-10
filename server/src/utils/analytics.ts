/**
 * Server-side Analytics Utilities
 * Tracks server-side operations for Microsoft Clarity and internal analytics
 */

import { logger } from './logger'
import InfluxDBService from '@/services/influxdbService'

interface AnalyticsEvent {
  event: string
  properties?: Record<string, string | number | boolean>
  timestamp?: Date
  userId?: string
  projectId?: string
}

class AnalyticsService {
  private isEnabled: boolean = process.env.NODE_ENV === 'production' || process.env.ENABLE_ANALYTICS === 'true'

  /**
   * Track an analytics event
   */
  track(event: AnalyticsEvent): void {
    if (!this.isEnabled) {
      return
    }

    const eventData: AnalyticsEvent = {
      ...event,
      timestamp: event.timestamp || new Date(),
    }

    // Log to server logs (can be extended to send to analytics services)
    logger.info('[ANALYTICS]', {
      event: eventData.event,
      properties: eventData.properties,
      userId: eventData.userId,
      projectId: eventData.projectId,
      timestamp: eventData.timestamp?.toISOString(),
    })

    // In production, you could send this to:
    // - Microsoft Clarity via server-side API
    // - Internal analytics database
    // - Third-party analytics services
  }

  /**
   * Track entity extraction start
   */
  trackEntityExtractionStart(
    projectId: string,
    userId: string,
    documentCount: number,
    provider: string,
    model: string
  ): void {
    this.track({
      event: 'entity_extraction_started',
      properties: {
        document_count: documentCount,
        ai_provider: provider,
        ai_model: model,
        extraction_type: 'full_project'
      },
      userId,
      projectId,
    })
  }

  /**
   * Track entity extraction completion
   */
  trackEntityExtractionComplete(
    projectId: string,
    userId: string,
    duration: number,
    entityCounts: Record<string, number>,
    provider: string,
    model: string
  ): void {
    const totalEntities = Object.values(entityCounts).reduce((sum, count) => sum + count, 0)

    this.track({
      event: 'entity_extraction_completed',
      properties: {
        duration_ms: duration,
        total_entities: totalEntities,
        ai_provider: provider,
        ai_model: model,
        extraction_type: 'full_project',
        ...entityCounts
      },
      userId,
      projectId,
    })
  }

  /**
   * Track entity extraction failure
   */
  trackEntityExtractionFailure(
    projectId: string,
    userId: string,
    error: string,
    provider: string,
    model: string,
    duration?: number
  ): void {
    this.track({
      event: 'entity_extraction_failed',
      properties: {
        error_type: error,
        ai_provider: provider,
        ai_model: model,
        duration_ms: duration || 0,
        extraction_type: 'full_project'
      },
      userId,
      projectId,
    })
  }

  /**
   * Track specific entity type extraction
   */
  async trackEntityTypeExtraction(
    projectId: string,
    userId: string,
    entityType: string,
    count: number,
    duration: number,
    success: boolean,
    error?: string
  ): Promise<void> {
    this.track({
      event: 'entity_type_extraction',
      properties: {
        entity_type: entityType,
        count,
        duration_ms: duration,
        success,
        error: error || null
      },
      userId,
      projectId,
    })

    // Log to InfluxDB
    await InfluxDBService.recordEntityOperation(
      entityType,
      'extract',
      count,
      {
        project_id: projectId,
        user_id: userId,
        success: String(success)
      }
    )
  }

  /**
   * Track entity persistence (Create/Update/Delete)
   */
  async trackEntityPersistence(
    projectId: string,
    userId: string,
    entityType: string,
    operation: 'create' | 'update' | 'delete',
    count: number,
    metadata?: Record<string, string>
  ): Promise<void> {
    this.track({
      event: 'entity_persistence',
      properties: {
        entity_type: entityType,
        operation,
        count,
        ...metadata
      },
      userId,
      projectId,
    })

    // Log to InfluxDB
    await InfluxDBService.recordEntityOperation(
      entityType,
      operation,
      count,
      {
        project_id: projectId,
        user_id: userId,
        ...metadata
      }
    )
  }

  /**
   * Track entity viewing
   */
  async trackEntityView(
    projectId: string,
    userId: string,
    entityType: string,
    count: number = 1
  ): Promise<void> {
    this.track({
      event: 'entity_view',
      properties: {
        entity_type: entityType,
        count
      },
      userId,
      projectId,
    })

    // Log to InfluxDB
    await InfluxDBService.recordEntityOperation(
      entityType,
      'view',
      count,
      {
        project_id: projectId,
        user_id: userId
      }
    )
  }

  /**
   * Track AI provider usage
   */
  trackAIUsage(
    projectId: string,
    userId: string,
    provider: string,
    model: string,
    tokens: number,
    responseTime: number,
    success: boolean
  ): void {
    this.track({
      event: 'ai_usage',
      properties: {
        ai_provider: provider,
        ai_model: model,
        tokens_used: tokens,
        response_time_ms: responseTime,
        success
      },
      userId,
      projectId,
    })
  }

  /**
   * Track document processing
   */
  trackDocumentProcessing(
    projectId: string,
    userId: string,
    documentId: string,
    operation: string,
    duration: number,
    success: boolean,
    metadata?: Record<string, string | number>
  ): void {
    this.track({
      event: 'document_processing',
      properties: {
        document_id: documentId,
        operation,
        duration_ms: duration,
        success,
        ...metadata
      },
      userId,
      projectId,
    })
  }

  /**
   * Track template generation
   */
  trackTemplateGeneration(
    projectId: string,
    userId: string,
    templateName: string,
    status: 'started' | 'completed' | 'failed',
    duration?: number,
    tokens?: number,
    error?: string
  ): void {
    this.track({
      event: 'template_generation',
      properties: {
        template_name: templateName,
        status,
        duration_ms: duration || 0,
        tokens_used: tokens || 0,
        error: error || null
      },
      userId,
      projectId,
    })
  }

  /**
   * Track quality audit
   */
  trackQualityAudit(
    projectId: string,
    userId: string,
    documentId: string,
    score: number | null,
    grade: string | null,
    duration: number
  ): void {
    this.track({
      event: 'quality_audit',
      properties: {
        document_id: documentId,
        audit_score: score || null,
        audit_grade: grade || null,
        duration_ms: duration
      },
      userId,
      projectId,
    })
  }

  /**
   * Track user session
   */
  trackUserSession(
    userId: string,
    projectId: string,
    action: string,
    metadata?: Record<string, string | number>
  ): void {
    this.track({
      event: 'user_session',
      properties: {
        action,
        ...metadata
      },
      userId,
      projectId,
    })
  }

  /**
   * Track performance metrics
   */
  trackPerformance(
    projectId: string,
    userId: string,
    metric: string,
    value: number,
    unit: string = 'ms',
    context?: Record<string, string>
  ): void {
    this.track({
      event: 'performance',
      properties: {
        metric,
        value,
        unit,
        ...context
      },
      userId,
      projectId,
    })
  }

  /**
   * Track error events
   */
  trackError(
    projectId: string,
    userId: string,
    errorType: string,
    errorMessage: string,
    context?: Record<string, string>,
    fatal: boolean = false
  ): void {
    this.track({
      event: 'error',
      properties: {
        error_type: errorType,
        error_message: errorMessage,
        fatal,
        ...context
      },
      userId,
      projectId,
    })
  }

  /**
   * Track feature usage
   */
  trackFeatureUsage(
    projectId: string,
    userId: string,
    feature: string,
    action: string,
    metadata?: Record<string, string | number>
  ): void {
    this.track({
      event: 'feature_usage',
      properties: {
        feature,
        action,
        ...metadata
      },
      userId,
      projectId,
    })
  }

  /**
   * Check if analytics is enabled
   */
  isAnalyticsEnabled(): boolean {
    return this.isEnabled
  }
}

// Export singleton instance
export const analytics = new AnalyticsService()

// Export convenience functions
export const {
  track,
  trackEntityExtractionStart,
  trackEntityExtractionComplete,
  trackEntityExtractionFailure,
  trackEntityTypeExtraction,
  trackAIUsage,
  trackDocumentProcessing,
  trackTemplateGeneration,
  trackQualityAudit,
  trackUserSession,
  trackPerformance,
  trackError,
  trackFeatureUsage,
  isAnalyticsEnabled,
} = analytics
