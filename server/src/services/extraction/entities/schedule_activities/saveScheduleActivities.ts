/**
 * Save Schedule Activities
 */

import { logger } from '../../../../utils/logger'
import type { PoolClient } from 'pg'
import type { PersistenceResult } from '../../base/Persistence'
import type { ScheduleActivity } from './types'
import { isValidUUID } from '../../base/Persistence'
import { coerceArray } from '../../base/Parser'

function normalizeTimestamp(value?: string | null): string | null {
    if (!value || typeof value !== 'string') return null
    const trimmed = value.trim()
    if (!trimmed) return null

    const lowered = trimmed.toLowerCase()
    if (['tbd', 'n/a', 'na', 'not specified', 'unknown', 'none', 'pending', 'ongoing', 'yyyy-mm-dd'].includes(lowered)) {
        return null
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return `${trimmed}T00:00:00.000Z`
    const parsed = Date.parse(trimmed)
    return Number.isNaN(parsed) ? null : new Date(parsed).toISOString()
}

export async function saveScheduleActivities(
    client: PoolClient,
    projectId: string,
    userId: string,
    entities: ScheduleActivity[]
): Promise<PersistenceResult> {
    if (entities.length === 0) {
        return { saved: 0, skipped: 0, failed: 0 }
    }

    try {
        // Delete existing records for this project
        await client.query('DELETE FROM schedule_activities WHERE project_id = $1', [projectId])

        const columnResult = await client.query<{ column_name: string }>(
            `SELECT column_name
             FROM information_schema.columns
             WHERE table_schema = 'public'
               AND table_name = 'schedule_activities'`
        )
        const availableColumns = new Set(columnResult.rows.map(row => row.column_name))

        const insertColumns = [
            'project_id', 'activity_id', 'name', 'description',
            'wbs_code', 'start_date', 'end_date', 'duration_days',
            'status', 'percent_complete', 'assigned_to', 'dependencies',
            'is_critical', 'source_document_id', 'created_by'
        ].filter(column => availableColumns.has(column))

        if (insertColumns.length === 0) {
            throw new Error('schedule_activities table has no expected columns for extraction insert')
        }

        const values: any[] = []
        const placeholders: string[] = []

        entities.forEach((e, index) => {
            const offset = index * insertColumns.length
            placeholders.push(`(${insertColumns.map((_, i) => `$${offset + i + 1}`).join(', ')})`)

            const rowData: Record<string, any> = {
                project_id: projectId,
                activity_id: e.activity_id || null,
                name: e.name || '',
                description: e.description || null,
                wbs_code: e.wbs_code || null,
                start_date: normalizeTimestamp(e.start_date),
                end_date: normalizeTimestamp(e.end_date),
                duration_days: e.duration_days || null,
                status: e.status || 'Not Started',
                percent_complete: e.percent_complete || 0,
                assigned_to: coerceArray(e.assigned_to),
                dependencies: coerceArray(e.dependencies),
                is_critical: e.is_critical || false,
                source_document_id: isValidUUID(e.source_document_id) ? e.source_document_id : null,
                created_by: userId
            }

            insertColumns.forEach((column) => {
                values.push(rowData[column] ?? null)
            })
        })

        await client.query(
            `INSERT INTO schedule_activities (
        ${insertColumns.join(', ')}
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
        logger.error('[EXTRACTION-SCHEDULE-ACTIVITIES] Failed to save', {
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
