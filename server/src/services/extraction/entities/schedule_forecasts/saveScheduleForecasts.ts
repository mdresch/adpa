/**
 * Save Schedule Forecasts
 */

import { logger } from '../../../../utils/logger'
import type { PoolClient } from 'pg'
import type { PersistenceResult } from '../../base/Persistence'
import type { ScheduleForecast } from './types'

export async function saveScheduleForecasts(
    client: PoolClient,
    projectId: string,
    userId: string,
    entities: ScheduleForecast[]
): Promise<PersistenceResult> {
    if (entities.length === 0) {
        return { saved: 0, skipped: 0, failed: 0 }
    }

    try {
        // Delete existing records for this project
        await client.query('DELETE FROM schedule_forecasts WHERE project_id = $1', [projectId])

        const values: any[] = []
        const placeholders: string[] = []

        entities.forEach((e, index) => {
            const offset = index * 8
            placeholders.push(
                `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8})`
            )

            values.push(
                projectId,
                e.forecast_date || null,
                e.estimated_completion_date || null,
                e.variance_at_completion_days || null,
                e.confidence_level || null,
                e.assumptions || null,
                e.source_document_id || null,
                userId
            )
        })

        await client.query(
            `INSERT INTO schedule_forecasts (
        project_id, forecast_date, estimated_completion_date, 
        variance_at_completion_days, confidence_level, assumptions,
        source_document_id, created_by
      )
      VALUES ${placeholders.join(', ')}`,
            values
        )

        return {
            saved: entities.length,
            skipped: 0,
            failed: 0
        }
    } catch (error: unknown) {
        logger.error('[EXTRACTION-SCHEDULE-FORECAST] Failed to save', {
            projectId,
            error: error instanceof Error ? error.message : String(error)
        })
        return {
            saved: 0,
            skipped: 0,
            failed: entities.length,
            error: error instanceof Error ? error.message : String(error)
        }
    }
}
