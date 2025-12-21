/**
 * Save Requirements Traceability
 */

import { logger } from '../../../../utils/logger'
import type { PoolClient } from 'pg'
import type { PersistenceResult } from '../../base/Persistence'
import type { RequirementsTraceability } from './types'

export async function saveRequirementsTraceability(
    client: PoolClient,
    projectId: string,
    userId: string,
    entities: RequirementsTraceability[]
): Promise<PersistenceResult> {
    if (entities.length === 0) {
        return { saved: 0, skipped: 0, failed: 0 }
    }

    try {
        // Delete existing records for this project
        await client.query('DELETE FROM requirements_traceability WHERE project_id = $1', [projectId])

        const values: any[] = []
        const placeholders: string[] = []

        entities.forEach((e, index) => {
            const offset = index * 8
            placeholders.push(
                `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8})`
            )

            values.push(
                projectId,
                e.requirement_id || null,
                e.deliverable_id || null,
                e.wbs_code || null,
                e.test_case_id || null,
                e.status || null,
                e.source_document_id || null,
                userId
            )
        })

        await client.query(
            `INSERT INTO requirements_traceability (
        project_id, requirement_id, deliverable_id, 
        wbs_code, test_case_id, status, source_document_id, created_by
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
        logger.error('[EXTRACTION-REQUIREMENTS-TRACE] Failed to save', {
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
