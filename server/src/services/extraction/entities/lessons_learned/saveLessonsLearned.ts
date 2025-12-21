/**
 * Save Lessons Learned
 */

import { logger } from '../../../../utils/logger'
import type { PoolClient } from 'pg'
import type { PersistenceResult } from '../../base/Persistence'
import type { LessonsLearned } from './types'

export async function saveLessonsLearned(
    client: PoolClient,
    projectId: string,
    userId: string,
    entities: LessonsLearned[]
): Promise<PersistenceResult> {
    if (entities.length === 0) {
        return { saved: 0, skipped: 0, failed: 0 }
    }

    try {
        // Delete existing records for this project
        await client.query('DELETE FROM lessons_learned WHERE project_id = $1', [projectId])

        const values: any[] = []
        const placeholders: string[] = []

        entities.forEach((e, index) => {
            const offset = index * 17
            placeholders.push(
                `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9},
                 $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14}, $${offset + 15}, $${offset + 16}, $${offset + 17})`
            )

            values.push(
                projectId,
                e.title || '',
                e.description || '',
                e.category || 'other',
                e.situation || null,
                e.outcome || null,
                Array.isArray(e.recommendations) ? e.recommendations : (e.recommendations ? [e.recommendations] : []),
                e.positive_or_negative ?? true,
                e.impact || 'medium',
                e.source_document_id || null,
                e.source_document_title || null,  // Changed from source_document to source_document_title
                e.source_section || null,
                e.ai_confidence || null,
                e.ai_analysis ? JSON.stringify(e.ai_analysis) : null,
                e.date_learned || new Date().toISOString().split('T')[0],
                userId,
                userId
            )
        })

        await client.query(
            `INSERT INTO lessons_learned (
        project_id, title, description, category,
        situation, outcome, recommendations, positive_or_negative, impact,
        source_document_id, source_document_title, source_section,
        ai_confidence, ai_analysis, date_learned, created_by, updated_by
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
        logger.error('[EXTRACTION-LESSONS-LEARNED] Failed to save', {
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
