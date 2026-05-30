/**
 * Save Resource Plans
 */

import { logger } from '../../../../utils/logger'
import type { PoolClient } from 'pg'
import type { PersistenceResult } from '../../base/Persistence'
import type { ResourcePlan } from './types'
import { coerceArray } from '../../base/Parser'

export async function saveResourcePlans(
    client: PoolClient,
    projectId: string,
    userId: string,
    entities: ResourcePlan[]
): Promise<PersistenceResult> {
    if (entities.length === 0) {
        return { saved: 0, skipped: 0, failed: 0 }
    }

    try {
        // Delete existing records for this project
        await client.query('DELETE FROM resource_plans WHERE project_id = $1', [projectId])

        const values: any[] = []
        const placeholders: string[] = []

        entities.forEach((e, index) => {
            const offset = index * 10
            placeholders.push(
                `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10})`
            )

            values.push(
                projectId,
                e.resource_description || null,
                e.required_quantity || null,
                e.start_date || null,
                e.end_date || null,
                coerceArray(e.skill_set),
                e.location || null,
                e.status || 'Planned',
                e.source_document_id || null,
                userId
            )
        })

        await client.query(
            `INSERT INTO resource_plans (
        project_id, resource_description, required_quantity, 
        start_date, end_date, skill_set, location, status, 
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
        logger.error('[EXTRACTION-RESOURCE-PLAN] Failed to save', {
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
