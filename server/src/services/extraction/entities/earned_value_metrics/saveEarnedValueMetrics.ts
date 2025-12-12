/**
 * Save Earned Value Metrics
 * 
 * Persists earned value metrics to the database with deduplication and validation.
 * EVM metrics are deduplicated by measurement_date (one metric per date).
 */

import { logger } from '../../../../utils/logger'
import type { PoolClient } from 'pg'
import type { PersistenceResult } from '../../base/Persistence'
import { normalizeDate } from '../../base/Persistence'
import { coerceNumber } from '../../base/Parser'
import type { EarnedValueMetric } from './types'

/**
 * Deduplicate EVM metrics by measurement_date
 * AI sometimes extracts the same metric multiple times
 */
function deduplicateMetrics(metrics: EarnedValueMetric[]): EarnedValueMetric[] {
  const deduplicatedMap = new Map<string, EarnedValueMetric>()
  
  metrics.forEach(metric => {
    const measurementDate = normalizeDate(metric.measurement_date)
    if (!measurementDate) {
      return
    }
    
    const key = measurementDate
    
    if (!deduplicatedMap.has(key)) {
      deduplicatedMap.set(key, metric)
    } else {
      // Duplicate found - merge details (keep most detailed version)
      const existing = deduplicatedMap.get(key)!
      const merged: EarnedValueMetric = {
        ...existing,
        planned_value: metric.planned_value !== undefined ? metric.planned_value : existing.planned_value,
        earned_value: metric.earned_value !== undefined ? metric.earned_value : existing.earned_value,
        actual_cost: metric.actual_cost !== undefined ? metric.actual_cost : existing.actual_cost,
        schedule_variance: metric.schedule_variance !== undefined ? metric.schedule_variance : existing.schedule_variance,
        cost_variance: metric.cost_variance !== undefined ? metric.cost_variance : existing.cost_variance,
        schedule_performance_index: metric.schedule_performance_index !== undefined ? metric.schedule_performance_index : existing.schedule_performance_index,
        cost_performance_index: metric.cost_performance_index !== undefined ? metric.cost_performance_index : existing.cost_performance_index,
        estimate_at_completion: metric.estimate_at_completion !== undefined ? metric.estimate_at_completion : existing.estimate_at_completion,
        estimate_to_complete: metric.estimate_to_complete !== undefined ? metric.estimate_to_complete : existing.estimate_to_complete,
        notes: metric.notes || existing.notes
      }
      deduplicatedMap.set(key, merged)
      logger.debug(`[EXTRACTION-EARNED_VALUE_METRICS] Merged duplicate EVM metric: ${measurementDate}`)
    }
  })
  
  return Array.from(deduplicatedMap.values())
}

/**
 * Save earned value metrics to database
 */
export async function saveEarnedValueMetrics(
  client: PoolClient,
  projectId: string,
  userId: string,
  metrics: EarnedValueMetric[]
): Promise<PersistenceResult> {
  if (metrics.length === 0) {
    logger.info('[EXTRACTION] No earned_value_metrics to save, skipping')
    return { saved: 0, skipped: 0, failed: 0 }
  }

  try {
    // Deduplicate metrics
    const uniqueMetrics = deduplicateMetrics(metrics)
    const skippedCount = metrics.length - uniqueMetrics.length

    if (skippedCount > 0) {
      logger.info(`[EXTRACTION-EARNED_VALUE_METRICS] Deduplicated ${metrics.length} → ${uniqueMetrics.length} EVM metrics`)
    }

    // Build bulk insert
    const values: any[] = []
    const placeholders: string[] = []

    uniqueMetrics.forEach((metric, index) => {
      const measurementDate = normalizeDate(metric.measurement_date)
      if (!measurementDate) {
        logger.warn(`[EXTRACTION] Skipping EVM metric due to invalid date (${metric.measurement_date})`)
        return
      }

      const offset = index * 15
      placeholders.push(
        `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14}, $${offset + 15})`
      )

      const notesSegments = []
      if (metric.notes) {
        notesSegments.push(metric.notes)
      }
      if (metric.source_document) {
        notesSegments.push(`Source: ${metric.source_document}`)
      }
      const notes = notesSegments.length > 0 ? notesSegments.join('\n\n') : null

      values.push(
        projectId,
        measurementDate,
        coerceNumber(metric.planned_value) ?? null,
        coerceNumber(metric.earned_value) ?? null,
        coerceNumber(metric.actual_cost) ?? null,
        coerceNumber(metric.schedule_variance) ?? null,
        coerceNumber(metric.cost_variance) ?? null,
        coerceNumber(metric.schedule_performance_index) ?? null,
        coerceNumber(metric.cost_performance_index) ?? null,
        coerceNumber(metric.estimate_at_completion) ?? null,
        coerceNumber(metric.estimate_to_complete) ?? null,
        notes,
        metric.source_document_id || null,
        userId,
        userId
      )
    })

    if (values.length === 0) {
      logger.warn('[EXTRACTION] No valid earned value metrics to store after validation')
      return { saved: 0, skipped: skippedCount, failed: 0 }
    }

    // Execute bulk insert
    await client.query(
      `
      INSERT INTO earned_value_metrics (
        project_id, measurement_date, planned_value, earned_value, actual_cost,
        schedule_variance, cost_variance, schedule_performance_index, cost_performance_index,
        estimate_at_completion, estimate_to_complete, notes, source_document_id, created_by, updated_by
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (project_id, measurement_date) DO UPDATE SET
        planned_value = EXCLUDED.planned_value,
        earned_value = EXCLUDED.earned_value,
        actual_cost = EXCLUDED.actual_cost,
        schedule_variance = EXCLUDED.schedule_variance,
        cost_variance = EXCLUDED.cost_variance,
        schedule_performance_index = EXCLUDED.schedule_performance_index,
        cost_performance_index = EXCLUDED.cost_performance_index,
        estimate_at_completion = EXCLUDED.estimate_at_completion,
        estimate_to_complete = EXCLUDED.estimate_to_complete,
        notes = EXCLUDED.notes,
        source_document_id = COALESCE(EXCLUDED.source_document_id, earned_value_metrics.source_document_id),
        updated_by = EXCLUDED.updated_by,
        updated_at = CURRENT_TIMESTAMP
    `,
      values
    )

    logger.info(`[EXTRACTION] Saved ${uniqueMetrics.length} earned value metric snapshots (deduplicated from ${metrics.length})`)

    return {
      saved: uniqueMetrics.length,
      skipped: skippedCount,
      failed: 0
    }
  } catch (error: unknown) {
    logger.error('[EXTRACTION-EARNED-VALUE-METRICS] Failed to save earned value metrics', {
      projectId,
      error: error instanceof Error ? error.message : String(error)
    })
    
    return {
      saved: 0,
      skipped: 0,
      failed: metrics.length,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

