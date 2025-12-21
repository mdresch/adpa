/**
 * Save Change Control Boards
 */

import { logger } from '../../../../utils/logger'
import type { PoolClient } from 'pg'
import type { PersistenceResult } from '../../base/Persistence'
import type { ChangeControlBoard } from './types'

export async function saveChangeControlBoards(
    client: PoolClient,
    projectId: string,
    userId: string,
    entities: ChangeControlBoard[]
): Promise<PersistenceResult> {
    if (entities.length === 0) {
        return { saved: 0, skipped: 0, failed: 0 }
    }

    try {
        // Delete existing records for this project
        await client.query('DELETE FROM change_control_boards WHERE project_id = $1', [projectId])

        const values: any[] = []
        const placeholders: string[] = []

        entities.forEach((e, index) => {
            const offset = index * 7
            placeholders.push(
                `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7})`
            )

            values.push(
                projectId,
                e.name || '',
                e.authority_level || null,
                e.members || [],
                e.decision_criteria || null,
                e.source_document_id || null,
                userId
            )
        })

        await client.query(
            `INSERT INTO change_control_boards (
        project_id, name, authority_level, members, 
        decision_criteria, source_document_id, created_by
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
        logger.error('[EXTRACTION-CCB] Failed to save', {
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
