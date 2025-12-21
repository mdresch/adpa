/**
 * Save General Change Requests
 */

import { logger } from '../../../../utils/logger'
import type { PoolClient } from 'pg'
import type { PersistenceResult } from '../../base/Persistence'
import type { GeneralChangeRequest } from './types'

export async function saveGeneralChangeRequests(
    client: PoolClient,
    projectId: string,
    userId: string,
    entities: GeneralChangeRequest[]
): Promise<PersistenceResult> {
    if (entities.length === 0) {
        return { saved: 0, skipped: 0, failed: 0 }
    }

    try {
        // Delete existing records for this project
        await client.query('DELETE FROM general_change_requests WHERE project_id = $1', [projectId])

        const values: any[] = []
        const placeholders: string[] = []

        entities.forEach((e, index) => {
            const offset = index * 11
            placeholders.push(
                `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11})`
            )

            values.push(
                projectId,
                e.request_id || null,
                e.title || '',
                e.description || null,
                e.priority || 'Medium',
                e.status || 'Pending',
                e.request_date || null,
                e.decision_date || null,
                e.decision_reason || null,
                e.source_document_id || null,
                userId
            )
        })

        await client.query(
            `INSERT INTO general_change_requests (
        project_id, request_id, title, description, 
        priority, status, request_date, 
        decision_date, decision_reason,
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
        logger.error('[EXTRACTION-CHANGE-REQUESTS] Failed to save', {
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
