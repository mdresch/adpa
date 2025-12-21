/**
 * Save Project Charter Details
 */

import { logger } from '../../../../utils/logger'
import type { PoolClient } from 'pg'
import type { PersistenceResult } from '../../base/Persistence'
import type { ProjectCharterDetails } from './types'

export async function saveProjectCharterDetails(
    client: PoolClient,
    projectId: string,
    userId: string,
    entities: ProjectCharterDetails[]
): Promise<PersistenceResult> {
    if (entities.length === 0) {
        return { saved: 0, skipped: 0, failed: 0 }
    }

    try {
        // Delete existing records for this project
        await client.query('DELETE FROM project_charter_details WHERE project_id = $1', [projectId])

        const values: any[] = []
        const placeholders: string[] = []

        entities.forEach((e, index) => {
            const offset = index * 12
            placeholders.push(
                `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12})`
            )

            values.push(
                projectId,
                e.project_charter_id || null,
                e.vision || null,
                e.mission || null,
                e.project_manager || null,
                e.sponsor || null,
                e.authority_level || null,
                e.major_milestones || [],
                e.high_level_risks || [],
                e.critical_success_factors || [],
                e.source_document_id || null,
                userId
            )
        })

        await client.query(
            `INSERT INTO project_charter_details (
        project_id, project_charter_id, vision, mission,
        project_manager, sponsor, authority_level,
        major_milestones, high_level_risks, critical_success_factors,
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
        logger.error('[EXTRACTION-CHARTER-DETAILS] Failed to save', {
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
