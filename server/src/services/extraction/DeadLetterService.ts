/**
 * Dead-Letter Service for Extraction Failures
 * 
 * Handles logging failed extractions to the extraction_failures table
 * for debugging, monitoring, and retry orchestration.
 */

import { pool } from '../../database/connection'
import { logger } from '../../utils/logger'
import type { PoolClient } from 'pg'

/**
 * Extraction failure record
 */
export interface ExtractionFailure {
  id?: string
  projectId: string
  entityType: string
  errorMessage: string
  stackTrace?: Record<string, any>
  aiProvider?: string
  aiModel?: string
  aiResponseRaw?: string
  correlationId?: string
  retryCount?: number
  status?: 'pending' | 'retried' | 'resolved' | 'abandoned'
  retryAt?: Date
  resolvedAt?: Date
  resolutionNotes?: string
  createdAt?: Date
}

/**
 * Dead-letter service for extraction failures
 */
export class DeadLetterService {
  /**
   * Log an extraction failure to the dead-letter table
   */
  async logFailure(failure: ExtractionFailure): Promise<string> {
    if (!pool) {
      logger.error('[DEAD-LETTER] Database pool not initialized')
      throw new Error('Database pool not initialized')
    }

    try {
      const query = `
        INSERT INTO extraction_failures (
          project_id,
          entity_type,
          error_message,
          stack_trace,
          ai_provider,
          ai_model,
          ai_response_raw,
          correlation_id,
          retry_count,
          status,
          retry_at,
          resolution_notes
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
        )
        RETURNING id
      `

      const values = [
        failure.projectId,
        failure.entityType,
        failure.errorMessage,
        failure.stackTrace ? JSON.stringify(failure.stackTrace) : null,
        failure.aiProvider || null,
        failure.aiModel || null,
        failure.aiResponseRaw || null,
        failure.correlationId || null,
        failure.retryCount ?? 0,
        failure.status ?? 'pending',
        failure.retryAt || null,
        failure.resolutionNotes || null
      ]

      const result = await pool.query(query, values)
      const failureId = result.rows[0].id

      logger.info('[DEAD-LETTER] Logged extraction failure', {
        failureId,
        projectId: failure.projectId,
        entityType: failure.entityType,
        correlationId: failure.correlationId,
        status: failure.status
      })

      return failureId
    } catch (error: unknown) {
      logger.error('[DEAD-LETTER] Failed to log extraction failure', {
        projectId: failure.projectId,
        entityType: failure.entityType,
        correlationId: failure.correlationId,
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  /**
   * Get pending failures for a project
   */
  async getPendingFailures(projectId: string): Promise<ExtractionFailure[]> {
    if (!pool) {
      logger.error('[DEAD-LETTER] Database pool not initialized')
      throw new Error('Database pool not initialized')
    }

    try {
      const query = `
        SELECT 
          id,
          project_id as "projectId",
          entity_type as "entityType",
          error_message as "errorMessage",
          stack_trace as "stackTrace",
          ai_provider as "aiProvider",
          ai_model as "aiModel",
          ai_response_raw as "aiResponseRaw",
          correlation_id as "correlationId",
          retry_count as "retryCount",
          status,
          retry_at as "retryAt",
          resolved_at as "resolvedAt",
          resolution_notes as "resolutionNotes",
          created_at as "createdAt"
        FROM extraction_failures
        WHERE project_id = $1 AND status = 'pending'
        ORDER BY created_at DESC
      `

      const result = await pool.query(query, [projectId])
      return result.rows
    } catch (error: unknown) {
      logger.error('[DEAD-LETTER] Failed to get pending failures', {
        projectId,
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  /**
   * Get failures for a correlation ID
   */
  async getFailuresByCorrelationId(correlationId: string): Promise<ExtractionFailure[]> {
    if (!pool) {
      logger.error('[DEAD-LETTER] Database pool not initialized')
      throw new Error('Database pool not initialized')
    }

    try {
      const query = `
        SELECT 
          id,
          project_id as "projectId",
          entity_type as "entityType",
          error_message as "errorMessage",
          stack_trace as "stackTrace",
          ai_provider as "aiProvider",
          ai_model as "aiModel",
          ai_response_raw as "aiResponseRaw",
          correlation_id as "correlationId",
          retry_count as "retryCount",
          status,
          retry_at as "retryAt",
          resolved_at as "resolvedAt",
          resolution_notes as "resolutionNotes",
          created_at as "createdAt"
        FROM extraction_failures
        WHERE correlation_id = $1
        ORDER BY created_at DESC
      `

      const result = await pool.query(query, [correlationId])
      return result.rows
    } catch (error: unknown) {
      logger.error('[DEAD-LETTER] Failed to get failures by correlation ID', {
        correlationId,
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  /**
   * Mark a failure as resolved
   */
  async markResolved(
    failureId: string,
    resolutionNotes?: string
  ): Promise<void> {
    if (!pool) {
      logger.error('[DEAD-LETTER] Database pool not initialized')
      throw new Error('Database pool not initialized')
    }

    try {
      const query = `
        UPDATE extraction_failures
        SET status = 'resolved', resolved_at = NOW(), resolution_notes = $2
        WHERE id = $1
      `

      await pool.query(query, [failureId, resolutionNotes || null])

      logger.info('[DEAD-LETTER] Marked failure as resolved', {
        failureId,
        resolutionNotes
      })
    } catch (error: unknown) {
      logger.error('[DEAD-LETTER] Failed to mark failure as resolved', {
        failureId,
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  /**
   * Schedule a failure for retry
   */
  async scheduleRetry(
    failureId: string,
    retryAt: Date
  ): Promise<void> {
    if (!pool) {
      logger.error('[DEAD-LETTER] Database pool not initialized')
      throw new Error('Database pool not initialized')
    }

    try {
      const query = `
        UPDATE extraction_failures
        SET 
          status = 'pending',
          retry_at = $2,
          retry_count = retry_count + 1
        WHERE id = $1
      `

      await pool.query(query, [failureId, retryAt])

      logger.info('[DEAD-LETTER] Scheduled failure for retry', {
        failureId,
        retryAt
      })
    } catch (error: unknown) {
      logger.error('[DEAD-LETTER] Failed to schedule failure for retry', {
        failureId,
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  /**
   * Get failure statistics by entity type for a project
   */
  async getFailureStats(projectId: string): Promise<Record<string, number>> {
    if (!pool) {
      logger.error('[DEAD-LETTER] Database pool not initialized')
      throw new Error('Database pool not initialized')
    }

    try {
      const query = `
        SELECT entity_type, COUNT(*) as count
        FROM extraction_failures
        WHERE project_id = $1 AND status = 'pending'
        GROUP BY entity_type
      `

      const result = await pool.query(query, [projectId])

      const stats: Record<string, number> = {}
      result.rows.forEach(row => {
        stats[row.entity_type] = parseInt(row.count, 10)
      })

      return stats
    } catch (error: unknown) {
      logger.error('[DEAD-LETTER] Failed to get failure statistics', {
        projectId,
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }
}

/**
 * Export singleton instance
 */
export const deadLetterService = new DeadLetterService()
