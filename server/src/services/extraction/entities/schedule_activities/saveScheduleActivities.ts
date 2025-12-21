/**
 * Save Schedule Activities
 */

import { logger } from '../../../../utils/logger'
import type { PoolClient } from 'pg'
import type { PersistenceResult } from '../../base/Persistence'
import type { ScheduleActivity } from './types'

export async function saveScheduleActivities(
    client: PoolClient,
    projectId: string,
    userId: string,
    entities: ScheduleActivity[]
): Promise<PersistenceResult> {
    if (entities.length === 0) {
        return { saved: 0, skipped: 0, failed: 0 }
    }

    try {
        // Delete existing records for this project
        await client.query('DELETE FROM schedule_activities WHERE project_id = $1', [projectId])

        const values: any[] = []
        const placeholders: string[] = []

        entities.forEach((e, index) => {
            const offset = index * 15
            placeholders.push(
                `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14}, $${offset + 15})`
            )

            values.push(
                projectId,
                e.activity_id || null,
                e.name || '',
                e.description || null,
                e.wbs_code || null,
                e.start_date || null,
                e.end_date || null,
                e.duration_days || null,
                e.status || 'Not Started',
                e.percent_complete || 0,
                e.assigned_to || [],
                e.dependencies || [],
                e.is_critical || false,
                e.source_document_id || null,
                userId
            )
        })

        await client.query(
            `INSERT INTO schedule_activities (
        project_id, activity_id, name, description, 
        wbs_code, start_date, end_date, duration_days, 
        status, percent_complete, assigned_to, dependencies, 
        is_critical, source_document_id, created_by
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
        logger.error('[EXTRACTION-SCHEDULE-ACTIVITIES] Failed to save', {
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
