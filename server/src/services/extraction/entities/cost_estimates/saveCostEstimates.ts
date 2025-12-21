/**
 * Save Cost Estimates
 */

import { logger } from '../../../../utils/logger'
import type { PoolClient } from 'pg'
import type { PersistenceResult } from '../../base/Persistence'
import type { CostEstimate } from './types'

export async function saveCostEstimates(
    client: PoolClient,
    projectId: string,
    userId: string,
    entities: CostEstimate[]
): Promise<PersistenceResult> {
    if (entities.length === 0) {
        return { saved: 0, skipped: 0, failed: 0 }
    }

    try {
        // Delete existing records for this project
        await client.query('DELETE FROM cost_estimates WHERE project_id = $1', [projectId])

        const values: any[] = []
        const placeholders: string[] = []

        entities.forEach((e, index) => {
            const offset = index * 9
            placeholders.push(
                `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9})`
            )

            values.push(
                projectId,
                e.item_name || '',
                e.wbs_code || null,
                e.estimated_cost || 0,
                e.basis_of_estimate || null,
                e.contingency_buffer || 0,
                e.confidence_level || null,
                e.source_document_id || null,
                userId
            )
        })

        await client.query(
            `INSERT INTO cost_estimates (
        project_id, item_name, wbs_code, estimated_cost, 
        basis_of_estimate, contingency_buffer, confidence_level, 
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
        logger.error('[EXTRACTION-COST-ESTIMATES] Failed to save', {
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
