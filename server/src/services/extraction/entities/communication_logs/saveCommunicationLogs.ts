/**
 * Save Communication Logs
 */

import { logger } from '../../../../utils/logger'
import type { PoolClient } from 'pg'
import type { PersistenceResult } from '../../base/Persistence'
import type { CommunicationLog } from './types'

function normalizeTimestamp(value: unknown): string | null {
    if (!value || typeof value !== 'string') return null
    const trimmed = value.trim()
    if (!trimmed) return null

    const parsed = Date.parse(trimmed)
    if (Number.isNaN(parsed)) return null

    return new Date(parsed).toISOString()
}

export async function saveCommunicationLogs(
    client: PoolClient,
    projectId: string,
    userId: string,
    entities: CommunicationLog[]
): Promise<PersistenceResult> {
    if (entities.length === 0) {
        return { saved: 0, skipped: 0, failed: 0 }
    }

    try {
        // Delete existing records for this project
        await client.query('DELETE FROM communication_logs WHERE project_id = $1', [projectId])

        const values: any[] = []
        const placeholders: string[] = []

        entities.forEach((e, index) => {
            const offset = index * 10
            placeholders.push(
                `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10})`
            )

            values.push(
                projectId,
                e.sender || null,
                e.recipient || null,
                e.communication_type || null,
                normalizeTimestamp(e.communication_date),
                e.subject || null,
                e.content_summary || null,
                e.key_decisions_made || null,
                e.source_document_id || null,
                userId
            )
        })

        await client.query(
            `INSERT INTO communication_logs (
        project_id, sender, recipient, communication_type, 
        communication_date, subject, content_summary, 
        key_decisions_made, source_document_id, created_by
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
        logger.error('[EXTRACTION-COMMUNICATION-LOGS] Failed to save', {
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
