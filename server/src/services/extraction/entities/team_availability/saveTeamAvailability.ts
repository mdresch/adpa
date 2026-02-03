/**
 * Save Team Availability
 */

import { logger } from '../../../../utils/logger'
import type { PoolClient } from 'pg'
import type { PersistenceResult } from '../../base/Persistence'
import { normalizeDate } from '../../base/Persistence'
import type { TeamAvailability } from './types'

export async function saveTeamAvailability(
    client: PoolClient,
    projectId: string,
    userId: string,
    entities: TeamAvailability[]
): Promise<PersistenceResult> {
    if (entities.length === 0) {
        return { saved: 0, skipped: 0, failed: 0 }
    }

    try {
        // Delete existing records for this project
        await client.query('DELETE FROM team_availability WHERE project_id = $1', [projectId])

        const values: any[] = []
        const placeholders: string[] = []

        entities.forEach((e, index) => {
            const offset = index * 8
            placeholders.push(
                `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8})`
            )

            values.push(
                projectId,
                e.person_name || '',
                e.role || null,
                e.availability_percent || 100,
                normalizeDate(e.start_date), // Use normalizeDate
                normalizeDate(e.end_date), // Use normalizeDate
                e.source_document_id || null,
                userId
            )
        })

        await client.query(
            `INSERT INTO team_availability (
        project_id, person_name, role, 
        availability_percent, start_date, end_date,
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
        logger.error('[EXTRACTION-AVAILABILITY] Failed to save', {
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
