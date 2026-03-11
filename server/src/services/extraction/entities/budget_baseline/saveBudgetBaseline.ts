/**
 * Save Budget Baseline
 */

import { logger } from '../../../../utils/logger'
import type { PoolClient } from 'pg'
import type { PersistenceResult } from '../../base/Persistence'
import type { BudgetBaseline } from './types'

import { generateBudgetIdempotencyKey } from '../../IdempotencyKeyService'

export async function saveBudgetBaseline(
    client: PoolClient,
    projectId: string,
    userId: string,
    entities: BudgetBaseline[]
): Promise<PersistenceResult> {
    if (entities.length === 0) {
        return { saved: 0, skipped: 0, failed: 0 }
    }

    try {
        const values: any[] = []
        const placeholders: string[] = []

        entities.forEach((e, index) => {
            const offset = index * 9
            placeholders.push(
                `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9})`
            )

            const idempotencyKey = generateBudgetIdempotencyKey(projectId, {
                total_amount: e.total_budget,
                currency: e.currency
            })

            values.push(
                projectId,
                e.total_budget || 0,
                e.currency || 'USD',
                e.categories ? JSON.stringify(e.categories) : null,
                e.approval_date || null,
                e.version || null,
                e.source_document_id || null,
                userId,
                idempotencyKey
            )
        })

        await client.query(
            `INSERT INTO budget_baseline (
                project_id, total_budget, currency, categories, 
                approval_date, version, source_document_id, created_by, idempotency_key
            )
            VALUES ${placeholders.join(', ')}
            ON CONFLICT (project_id, idempotency_key) WHERE idempotency_key IS NOT NULL DO UPDATE SET
                total_budget = EXCLUDED.total_budget,
                currency = EXCLUDED.currency,
                categories = EXCLUDED.categories,
                approval_date = EXCLUDED.approval_date,
                version = EXCLUDED.version,
                source_document_id = COALESCE(EXCLUDED.source_document_id, budget_baseline.source_document_id),
                updated_at = CURRENT_TIMESTAMP`,
            values
        )

        return {
            saved: entities.length,
            skipped: 0,
            failed: 0
        }
    } catch (error: unknown) {
        logger.error('[EXTRACTION-BUDGET-BASELINE] Failed to save', {
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
