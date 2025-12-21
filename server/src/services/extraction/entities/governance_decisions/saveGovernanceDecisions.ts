/**
 * Save Governance Decisions
 */

import { logger } from '../../../../utils/logger'
import type { PoolClient } from 'pg'
import type { PersistenceResult } from '../../base/Persistence'
import { truncateString } from '../../base/Persistence'
import type { GovernanceDecision } from './types'

export async function saveGovernanceDecisions(
    client: PoolClient,
    projectId: string,
    userId: string,
    entities: GovernanceDecision[]
): Promise<PersistenceResult> {
    if (entities.length === 0) {
        return { saved: 0, skipped: 0, failed: 0 }
    }

    try {
        // Delete existing records for this project to perform a full refresh (simplest strategy for now)
        // Alternatively, we could do upserts if we had stable unique keys.
        // For now, assume extraction replaces previous state for this entity type.
        await client.query('DELETE FROM governance_decisions WHERE project_id = $1', [projectId])

        const values: any[] = []
        const placeholders: string[] = []

        entities.forEach((e, index) => {
            const offset = index * 11
            placeholders.push(
                `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11})`
            )

            values.push(
                projectId,
                truncateString(e.decision_id, 100),
                truncateString(e.decision_type, 100),
                e.description || null,
                truncateString(e.outcome, 50),
                e.rationale || null,
                e.decision_makers || [],
                e.decision_date || null,
                truncateString(e.implementation_status, 50),
                e.source_document_id || null,
                userId
            )
        })

        await client.query(
            `INSERT INTO governance_decisions (
        project_id, decision_id, decision_type, description, outcome, rationale, 
        decision_makers, decision_date, implementation_status, source_document_id, created_by
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
        logger.error('[EXTRACTION-GOVERNANCE-DECISIONS] Failed to save', {
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
