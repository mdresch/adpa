/**
 * Save Procurement Costs
 */

import { logger } from '../../../../utils/logger'
import type { PoolClient } from 'pg'
import type { PersistenceResult } from '../../base/Persistence'
import type { ProcurementCost } from './types'

export async function saveProcurementCosts(
    client: PoolClient,
    projectId: string,
    userId: string,
    entities: ProcurementCost[]
): Promise<PersistenceResult> {
    if (entities.length === 0) {
        return { saved: 0, skipped: 0, failed: 0 }
    }

    try {
        // Delete existing records for this project
        await client.query('DELETE FROM procurement_costs WHERE project_id = $1', [projectId])

        const values: any[] = []
        const placeholders: string[] = []

        entities.forEach((e, index) => {
            const offset = index * 10
            placeholders.push(
                `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10})`
            )

            values.push(
                projectId,
                e.vendor_name || null,
                e.contract_value || 0,
                e.invoiced_amount || 0,
                e.paid_amount || 0,
                e.remaining_value || 0,
                e.currency || 'USD',
                e.status || 'Active',
                e.source_document_id || null,
                userId
            )
        })

        await client.query(
            `INSERT INTO procurement_costs (
        project_id, vendor_name, contract_value, invoiced_amount, 
        paid_amount, remaining_value, currency, status, 
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
        logger.error('[EXTRACTION-PROCUREMENT-COSTS] Failed to save', {
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
