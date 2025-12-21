/**
 * Save WBS Nodes
 */

import { logger } from '../../../../utils/logger'
import type { PoolClient } from 'pg'
import type { PersistenceResult } from '../../base/Persistence'
import type { WBSNode } from './types'

export async function saveWBSNodes(
    client: PoolClient,
    projectId: string,
    userId: string,
    entities: WBSNode[]
): Promise<PersistenceResult> {
    if (entities.length === 0) {
        return { saved: 0, skipped: 0, failed: 0 }
    }

    try {
        // Delete existing records for this project
        await client.query('DELETE FROM wbs_nodes WHERE project_id = $1', [projectId])

        const values: any[] = []
        const placeholders: string[] = []

        entities.forEach((e, index) => {
            const offset = index * 12
            placeholders.push(
                `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12})`
            )

            values.push(
                projectId,
                e.wbs_code || '',
                e.name || '',
                e.level || null,
                e.parent_code || null,
                e.description || null,
                e.owner || null,
                e.status || null,
                e.estimated_effort || null,
                e.estimated_cost || null,
                e.source_document_id || null,
                userId
            )
        })

        await client.query(
            `INSERT INTO wbs_nodes (
        project_id, wbs_code, name, level, 
        parent_code, description, owner, 
        status, estimated_effort, estimated_cost,
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
        logger.error('[EXTRACTION-WBS-NODES] Failed to save', {
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
