/**
 * Save Labor Rates
 */

import { logger } from '../../../../utils/logger'
import type { PoolClient } from 'pg'
import type { PersistenceResult } from '../../base/Persistence'
import type { LaborRate } from './types'

export async function saveLaborRates(
    client: PoolClient,
    projectId: string,
    userId: string,
    entities: LaborRate[]
): Promise<PersistenceResult> {
    if (entities.length === 0) {
        return { saved: 0, skipped: 0, failed: 0 }
    }

    try {
        // Delete existing records for this project
        await client.query('DELETE FROM labor_rates WHERE project_id = $1', [projectId])

        const values: any[] = []
        const placeholders: string[] = []

        entities.forEach((e, index) => {
            const offset = index * 7
            placeholders.push(
                `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7})`
            )

            values.push(
                projectId,
                e.resource_category || '',
                e.hourly_rate || 0,
                e.currency || 'USD',
                e.effective_date || null,
                e.source_document_id || null,
                userId
            )
        })

        await client.query(
            `INSERT INTO labor_rates (
        project_id, resource_category, hourly_rate, 
        currency, effective_date, source_document_id, created_by
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
        logger.error('[EXTRACTION-LABOR-RATES] Failed to save', {
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
