/**
 * Save Project Team Evaluations
 */

import { logger } from '../../../../utils/logger'
import type { PoolClient } from 'pg'
import type { PersistenceResult } from '../../base/Persistence'
import type { ProjectTeamEvaluation } from './types'

export async function saveProjectTeamEvaluations(
    client: PoolClient,
    projectId: string,
    userId: string,
    entities: ProjectTeamEvaluation[]
): Promise<PersistenceResult> {
    if (entities.length === 0) {
        return { saved: 0, skipped: 0, failed: 0 }
    }

    try {
        // Delete existing records for this project
        await client.query('DELETE FROM project_team_evaluations WHERE project_id = $1', [projectId])

        const values: any[] = []
        const placeholders: string[] = []

        entities.forEach((e, index) => {
            const offset = index * 9
            placeholders.push(
                `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9})`
            )

            values.push(
                projectId,
                e.team_member_name || '',
                e.role || null,
                e.evaluation_date || null,
                e.performance_rating || null,
                e.strengths || [],
                e.improvement_areas || [],
                e.source_document_id || null,
                userId
            )
        })

        await client.query(
            `INSERT INTO project_team_evaluations (
        project_id, team_member_name, role, evaluation_date, 
        performance_rating, strengths, improvement_areas,
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
        logger.error('[EXTRACTION-TEAM-EVALUATIONS] Failed to save', {
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
