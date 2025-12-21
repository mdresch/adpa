/**
 * Save Approval Workflows
 */

import { logger } from '../../../../utils/logger'
import type { PoolClient } from 'pg'
import type { PersistenceResult } from '../../base/Persistence'
import type { ApprovalWorkflow } from './types'

export async function saveApprovalWorkflows(
    client: PoolClient,
    projectId: string,
    userId: string,
    entities: ApprovalWorkflow[]
): Promise<PersistenceResult> {
    if (entities.length === 0) {
        return { saved: 0, skipped: 0, failed: 0 }
    }

    try {
        // Delete existing records for this project
        await client.query('DELETE FROM approval_workflows WHERE project_id = $1', [projectId])

        const values: any[] = []
        const placeholders: string[] = []

        entities.forEach((e, index) => {
            const offset = index * 10
            placeholders.push(
                `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10})`
            )

            values.push(
                projectId,
                e.name || '',
                e.description || null,
                e.trigger_condition || null,
                e.approvers || [],
                e.sla_hours || null,
                e.status || 'Active',
                e.gates || [],
                e.source_document_id || null,
                userId
            )
        })

        await client.query(
            `INSERT INTO approval_workflows (
        project_id, name, description, trigger_condition, 
        approvers, sla_hours, status, gates, 
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
        logger.error('[EXTRACTION-APPROVAL-WORKFLOWS] Failed to save', {
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
