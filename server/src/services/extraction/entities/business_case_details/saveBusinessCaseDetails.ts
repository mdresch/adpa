/**
 * Save Business Case Details
 */

import { logger } from '../../../../utils/logger'
import type { PoolClient } from 'pg'
import type { PersistenceResult } from '../../base/Persistence'
import type { BusinessCaseDetails } from './types'

export async function saveBusinessCaseDetails(
    client: PoolClient,
    projectId: string,
    userId: string,
    entities: BusinessCaseDetails[]
): Promise<PersistenceResult> {
    if (entities.length === 0) {
        return { saved: 0, skipped: 0, failed: 0 }
    }

    try {
        // Delete existing records for this project
        await client.query('DELETE FROM business_case_details WHERE project_id = $1', [projectId])

        const values: any[] = []
        const placeholders: string[] = []

        entities.forEach((e, index) => {
            const offset = index * 9
            placeholders.push(
                `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9})`
            )

            values.push(
                projectId,
                e.problem_statement || null,
                e.proposed_solution || null,
                e.estimated_roi || null,
                e.payback_period_months || null,
                e.npv_value || null,
                e.strategic_category || null,
                e.source_document_id || null,
                userId
            )
        })

        await client.query(
            `INSERT INTO business_case_details (
        project_id, problem_statement, proposed_solution, estimated_roi, 
        payback_period_months, npv_value, strategic_category, 
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
        logger.error('[EXTRACTION-BUSINESS-CASE] Failed to save', {
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
