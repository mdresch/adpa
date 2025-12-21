/**
 * Save Critical Path
 */

import { logger } from '../../../../utils/logger'
import type { PoolClient } from 'pg'
import type { PersistenceResult } from '../../base/Persistence'
import type { CriticalPath } from './types'

export async function saveCriticalPath(
    client: PoolClient,
    projectId: string,
    userId: string,
    entities: CriticalPath[]
): Promise<PersistenceResult> {
    if (entities.length === 0) {
        return { saved: 0, skipped: 0, failed: 0 }
    }

    try {
        // Delete existing records for this project
        await client.query('DELETE FROM critical_path WHERE project_id = $1', [projectId])

        const values: any[] = []
        const placeholders: string[] = []

        entities.forEach((e, index) => {
            const offset = index * 8
            placeholders.push(
                `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8})`
            )

            values.push(
                projectId,
                e.path_description || null,
                e.activities || [],
                e.total_duration_days || null,
                e.slack_available || 0,
                e.risks || null,
                e.source_document_id || null,
                userId
            )
        })

        await client.query(
            `INSERT INTO critical_path (
        project_id, path_description, activities, 
        total_duration_days, slack_available, risks,
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
        logger.error('[EXTRACTION-CRITICAL-PATH] Failed to save', {
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
