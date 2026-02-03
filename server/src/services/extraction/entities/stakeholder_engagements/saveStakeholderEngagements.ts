/**
 * Save Stakeholder Engagements
 */

import { logger } from '../../../../utils/logger'
import type { PoolClient } from 'pg'
import type { PersistenceResult } from '../../base/Persistence'
import { normalizeDate } from '../../base/Persistence'
import type { StakeholderEngagement } from './types'

export async function saveStakeholderEngagements(
    client: PoolClient,
    projectId: string,
    userId: string,
    entities: StakeholderEngagement[]
): Promise<PersistenceResult> {
    if (entities.length === 0) {
        return { saved: 0, skipped: 0, failed: 0 }
    }

    try {
        // Delete existing records for this project
        await client.query('DELETE FROM stakeholder_engagements WHERE project_id = $1', [projectId])

        const values: any[] = []
        const placeholders: string[] = []

        entities.forEach((e, index) => {
            const offset = index * 9
            placeholders.push(
                `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9})`
            )

            values.push(
                projectId,
                e.stakeholder_name || '',
                e.engagement_type || 'Other',
                normalizeDate(e.engagement_date), // Use normalizeDate
                e.objective || null,
                e.outcome || null,
                e.feedback || null,
                e.source_document_id || null,
                userId
            )
        })

        await client.query(
            `INSERT INTO stakeholder_engagements (
        project_id, stakeholder_name, engagement_type, 
        engagement_date, objective, outcome, feedback, 
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
        logger.error('[EXTRACTION-STAKEHOLDER-ENGAGEMENTS] Failed to save', {
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
