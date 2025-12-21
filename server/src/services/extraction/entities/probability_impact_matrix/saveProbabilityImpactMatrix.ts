/**
 * Save Probability Impact Matrix
 */

import { logger } from '../../../../utils/logger'
import type { PoolClient } from 'pg'
import type { PersistenceResult } from '../../base/Persistence'
import type { ProbabilityImpactMatrix } from './types'

export async function saveProbabilityImpactMatrix(
    client: PoolClient,
    projectId: string,
    userId: string,
    entities: ProbabilityImpactMatrix[]
): Promise<PersistenceResult> {
    if (entities.length === 0) {
        return { saved: 0, skipped: 0, failed: 0 }
    }

    try {
        // Delete existing records for this project
        await client.query('DELETE FROM probability_impact_matrix WHERE project_id = $1', [projectId])

        const values: any[] = []
        const placeholders: string[] = []

        entities.forEach((e, index) => {
            const offset = index * 7
            placeholders.push(
                `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7})`
            )

            values.push(
                projectId,
                e.probability_level || null,
                e.impact_level || null,
                e.risk_score || null,
                e.action_level || null,
                e.source_document_id || null,
                userId
            )
        })

        await client.query(
            `INSERT INTO probability_impact_matrix (
        project_id, probability_level, impact_level, 
        risk_score, action_level, source_document_id, created_by
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
        logger.error('[EXTRACTION-PI-MATRIX] Failed to save', {
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
