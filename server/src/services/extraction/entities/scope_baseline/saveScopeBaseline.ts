/**
 * Save Scope Baseline
 */

import { logger } from '../../../../utils/logger'
import type { PoolClient } from 'pg'
import type { PersistenceResult } from '../../base/Persistence'
import type { ScopeBaseline } from './types'

export async function saveScopeBaseline(
    client: PoolClient,
    projectId: string,
    userId: string,
    entities: ScopeBaseline[]
): Promise<PersistenceResult> {
    if (entities.length === 0) {
        return { saved: 0, skipped: 0, failed: 0 }
    }

    try {
        // Delete existing records for this project
        await client.query('DELETE FROM scope_baseline WHERE project_id = $1', [projectId])

        const values: any[] = []
        const placeholders: string[] = []

        entities.forEach((e, index) => {
            const offset = index * 11
            placeholders.push(
                `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11})`
            )

            values.push(
                projectId,
                e.statement || null,
                e.boundaries || null,
                e.inclusions || [],
                e.exclusions || [],
                e.assumptions || [],
                e.constraints || [],
                e.approval_date || null,
                e.version || null,
                e.source_document_id || null,
                userId
            )
        })

        await client.query(
            `INSERT INTO scope_baseline (
        project_id, statement, boundaries, inclusions, 
        exclusions, assumptions, constraints, 
        approval_date, version, source_document_id, created_by
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
        logger.error('[EXTRACTION-SCOPE-BASELINE] Failed to save', {
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
