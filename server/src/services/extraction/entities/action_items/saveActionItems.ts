import { logger } from '../../../../utils/logger'
import type { PoolClient } from 'pg'
import type { PersistenceResult } from '../../base/Persistence'
import type { ActionItem } from './types'
import { generateGenericIdempotencyKey } from '../../IdempotencyKeyService'

export async function saveActionItems(
    client: PoolClient,
    projectId: string,
    userId: string,
    entities: ActionItem[]
): Promise<PersistenceResult> {
    if (entities.length === 0) {
        return { saved: 0, skipped: 0, failed: 0 }
    }

    try {
        const values: any[] = []
        const placeholders: string[] = []

        entities.forEach((e, index) => {
            const offset = index * 11
            placeholders.push(
                `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11})`
            )

            const idempotencyKey = generateGenericIdempotencyKey(projectId, 'action_item', {
                item_id: e.item_id || '',
                description: e.description || ''
            })

            values.push(
                projectId,
                e.item_id || null,
                e.description || '',
                e.owner || null,
                e.priority || null,
                e.status || null,
                e.due_date || null,
                e.completion_date || null,
                e.source_document_id || null,
                userId,
                idempotencyKey
            )
        })

        await client.query(
            `INSERT INTO action_items (
                project_id, item_id, description, owner, 
                priority, status, due_date, completion_date,
                source_document_id, created_by, idempotency_key
            )
            VALUES ${placeholders.join(', ')}
            ON CONFLICT (project_id, idempotency_key) WHERE idempotency_key IS NOT NULL DO UPDATE SET
                item_id = EXCLUDED.item_id,
                description = EXCLUDED.description,
                owner = EXCLUDED.owner,
                priority = EXCLUDED.priority,
                status = EXCLUDED.status,
                due_date = EXCLUDED.due_date,
                completion_date = EXCLUDED.completion_date,
                source_document_id = COALESCE(EXCLUDED.source_document_id, action_items.source_document_id),
                updated_at = CURRENT_TIMESTAMP`,
            values
        )

        return {
            saved: entities.length,
            skipped: 0,
            failed: 0
        }
    } catch (error: unknown) {
        logger.error('[EXTRACTION-ACTION-ITEMS] Failed to save', {
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
