/**
 * Save Scope Change Requests
 */

import { logger } from '../../../../utils/logger'
import type { PoolClient } from 'pg'
import type { PersistenceResult } from '../../base/Persistence'
import type { ScopeChangeRequest } from './types'

export async function saveScopeChangeRequests(
    client: PoolClient,
    projectId: string,
    userId: string,
    entities: ScopeChangeRequest[]
): Promise<PersistenceResult> {
    if (entities.length === 0) {
        return { saved: 0, skipped: 0, failed: 0 }
    }

    try {
        // Delete existing records for this project
        await client.query('DELETE FROM scope_change_requests WHERE project_id = $1', [projectId])

        const values: any[] = []
        const placeholders: string[] = []

        entities.forEach((e, index) => {
            const offset = index * 12
            placeholders.push(
                `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12})`
            )

            values.push(
                projectId,
                e.request_id || null,
                e.title || '',
                e.description || null,
                e.requestor || null,
                e.impact_analysis || null,
                e.cost_impact || null,
                e.schedule_impact_days || null,
                e.status || 'Pending',
                e.decision_date || null,
                e.source_document_id || null,
                userId
            )
        })

        await client.query(
            `INSERT INTO scope_change_requests (
        project_id, request_id, title, description, 
        requestor, impact_analysis, cost_impact, 
        schedule_impact_days, status, decision_date,
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
        logger.error('[EXTRACTION-SCOPE-CHANGE] Failed to save', {
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
