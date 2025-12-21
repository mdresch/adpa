/**
 * Save Issue Log
 */

import { logger } from '../../../../utils/logger'
import type { PoolClient } from 'pg'
import type { PersistenceResult } from '../../base/Persistence'
import type { IssueLog } from './types'

export async function saveIssueLog(
    client: PoolClient,
    projectId: string,
    userId: string,
    entities: IssueLog[]
): Promise<PersistenceResult> {
    if (entities.length === 0) {
        return { saved: 0, skipped: 0, failed: 0 }
    }

    try {
        // Delete existing records for this project
        await client.query('DELETE FROM issue_log WHERE project_id = $1', [projectId])

        const values: any[] = []
        const placeholders: string[] = []

        entities.forEach((e, index) => {
            const offset = index * 13
            placeholders.push(
                `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13})`
            )

            values.push(
                projectId,
                e.issue_id || null,
                e.title || '',
                e.description || null,
                e.priority || 'Medium',
                e.status || 'Open',
                e.owner || null,
                e.opened_date || null,
                e.target_resolution_date || null,
                e.actual_resolution_date || null,
                e.resolution_description || null,
                e.source_document_id || null,
                userId
            )
        })

        await client.query(
            `INSERT INTO issue_log (
        project_id, issue_id, title, description, 
        priority, status, owner, opened_date,
        target_resolution_date, actual_resolution_date, resolution_description,
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
        logger.error('[EXTRACTION-ISSUE-LOG] Failed to save', {
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
