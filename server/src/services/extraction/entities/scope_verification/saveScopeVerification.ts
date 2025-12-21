/**
 * Save Scope Verification
 */

import { logger } from '../../../../utils/logger'
import type { PoolClient } from 'pg'
import type { PersistenceResult } from '../../base/Persistence'
import type { ScopeVerification } from './types'

export async function saveScopeVerification(
    client: PoolClient,
    projectId: string,
    userId: string,
    entities: ScopeVerification[]
): Promise<PersistenceResult> {
    if (entities.length === 0) {
        return { saved: 0, skipped: 0, failed: 0 }
    }

    try {
        // Delete existing records for this project
        await client.query('DELETE FROM scope_verification WHERE project_id = $1', [projectId])

        const values: any[] = []
        const placeholders: string[] = []

        entities.forEach((e, index) => {
            const offset = index * 9
            placeholders.push(
                `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9})`
            )

            values.push(
                projectId,
                e.deliverable_name || '',
                e.verification_date || null,
                e.verifier || null,
                e.method || null,
                e.outcome || null,
                e.comments || null,
                e.source_document_id || null,
                userId
            )
        })

        await client.query(
            `INSERT INTO scope_verification (
        project_id, deliverable_name, verification_date, 
        verifier, method, outcome, comments, source_document_id, created_by
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
        logger.error('[EXTRACTION-SCOPE-VERIFICATION] Failed to save', {
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
