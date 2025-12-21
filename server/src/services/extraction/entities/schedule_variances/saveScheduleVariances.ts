/**
 * Save Schedule Variances
 */

import { logger } from '../../../../utils/logger'
import type { PoolClient } from 'pg'
import type { PersistenceResult } from '../../base/Persistence'
import type { ScheduleVariance } from './types'

export async function saveScheduleVariances(
    client: PoolClient,
    projectId: string,
    userId: string,
    entities: ScheduleVariance[]
): Promise<PersistenceResult> {
    if (entities.length === 0) {
        return { saved: 0, skipped: 0, failed: 0 }
    }

    try {
        // Delete existing records for this project
        await client.query('DELETE FROM schedule_variances WHERE project_id = $1', [projectId])

        const values: any[] = []
        const placeholders: string[] = []

        entities.forEach((e, index) => {
            const offset = index * 8
            placeholders.push(
                `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8})`
            )

            values.push(
                projectId,
                e.report_date || null,
                e.sv_value || null,
                e.spi_value || null,
                e.variance_explanation || null,
                e.corrective_actions || null,
                e.source_document_id || null,
                userId
            )
        })

        await client.query(
            `INSERT INTO schedule_variances (
        project_id, report_date, sv_value, 
        spi_value, variance_explanation, corrective_actions,
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
        logger.error('[EXTRACTION-SCHEDULE-VARIANCE] Failed to save', {
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
