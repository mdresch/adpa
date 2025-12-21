/**
 * Save Project Org Chart
 */

import { logger } from '../../../../utils/logger'
import type { PoolClient } from 'pg'
import type { PersistenceResult } from '../../base/Persistence'
import type { ProjectOrgChartNode } from './types'

export async function saveProjectOrgChart(
    client: PoolClient,
    projectId: string,
    userId: string,
    entities: ProjectOrgChartNode[]
): Promise<PersistenceResult> {
    if (entities.length === 0) {
        return { saved: 0, skipped: 0, failed: 0 }
    }

    try {
        // Delete existing records for this project
        await client.query('DELETE FROM project_org_chart WHERE project_id = $1', [projectId])

        const values: any[] = []
        const placeholders: string[] = []

        entities.forEach((e, index) => {
            const offset = index * 7
            placeholders.push(
                `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7})`
            )

            values.push(
                projectId,
                e.person_name || '',
                e.title || null,
                e.reports_to || null,
                e.department || null,
                e.source_document_id || null,
                userId
            )
        })

        await client.query(
            `INSERT INTO project_org_chart (
        project_id, person_name, title, reports_to, department,
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
        logger.error('[EXTRACTION-ORG-CHART] Failed to save', {
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
