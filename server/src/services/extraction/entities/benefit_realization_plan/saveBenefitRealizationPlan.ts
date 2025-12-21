/**
 * Save Benefit Realization Plan
 */

import { logger } from '../../../../utils/logger'
import type { PoolClient } from 'pg'
import type { PersistenceResult } from '../../base/Persistence'
import type { BenefitRealizationPlan } from './types'

export async function saveBenefitRealizationPlan(
    client: PoolClient,
    projectId: string,
    userId: string,
    entities: BenefitRealizationPlan[]
): Promise<PersistenceResult> {
    if (entities.length === 0) {
        return { saved: 0, skipped: 0, failed: 0 }
    }

    try {
        // Delete existing records for this project
        await client.query('DELETE FROM benefit_realization_plan WHERE project_id = $1', [projectId])

        const values: any[] = []
        const placeholders: string[] = []

        entities.forEach((e, index) => {
            const offset = index * 9
            placeholders.push(
                `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9})`
            )

            values.push(
                projectId,
                e.benefit_name || '',
                e.target_value || null,
                e.actual_value || null,
                e.realization_date || null,
                e.owner || null,
                e.strategic_alignment || null,
                e.source_document_id || null,
                userId
            )
        })

        await client.query(
            `INSERT INTO benefit_realization_plan (
        project_id, benefit_name, target_value, actual_value,
        realization_date, owner, strategic_alignment,
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
        logger.error('[EXTRACTION-BENEFIT-PLAN] Failed to save', {
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
