/**
 * Save Roles and Responsibilities
 */

import { logger } from '../../../../utils/logger'
import type { PoolClient } from 'pg'
import type { PersistenceResult } from '../../base/Persistence'
import type { RoleResponsibility } from './types'

export async function saveRolesAndResponsibilities(
    client: PoolClient,
    projectId: string,
    userId: string,
    entities: RoleResponsibility[]
): Promise<PersistenceResult> {
    if (entities.length === 0) {
        return { saved: 0, skipped: 0, failed: 0 }
    }

    try {
        // Delete existing records for this project
        await client.query('DELETE FROM roles_and_responsibilities WHERE project_id = $1', [projectId])

        const values: any[] = []
        const placeholders: string[] = []

        entities.forEach((e, index) => {
            const offset = index * 8
            placeholders.push(
                `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8})`
            )

            values.push(
                projectId,
                e.role_name || '',
                e.responsibilities || null,
                e.raci_category || null,
                e.assigned_to || [],
                e.authority_level || null,
                e.source_document_id || null,
                userId
            )
        })

        await client.query(
            `INSERT INTO roles_and_responsibilities (
        project_id, role_name, responsibilities, 
        raci_category, assigned_to, authority_level, 
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
        logger.error('[EXTRACTION-ROLES] Failed to save', {
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
