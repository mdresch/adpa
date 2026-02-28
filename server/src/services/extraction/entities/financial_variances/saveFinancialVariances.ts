/**
 * Save Financial Variances
 */

import { logger } from '../../../../utils/logger'
import type { PoolClient } from 'pg'
import type { PersistenceResult } from '../../base/Persistence'
import type { FinancialVariance } from './types'
import { normalizeDate } from '../../base/Persistence'
import { coerceNumber } from '../../base/Parser'

export async function saveFinancialVariances(
    client: PoolClient,
    projectId: string,
    userId: string,
    entities: FinancialVariance[]
): Promise<PersistenceResult> {
    if (entities.length === 0) {
        return { saved: 0, skipped: 0, failed: 0 }
    }

    try {
        // Delete existing records for this project
        await client.query('DELETE FROM financial_variances WHERE project_id = $1', [projectId])

        const columnResult = await client.query<{ column_name: string }>(
            `SELECT column_name
             FROM information_schema.columns
             WHERE table_schema = 'public'
               AND table_name = 'financial_variances'`
        )

        const availableColumns = new Set(columnResult.rows.map((row) => row.column_name))
        const insertColumns = [
            'project_id',
            'report_date',
            'cv_value',
            'cpi_value',
            'eac_value',
            'etc_value',
            'variance_explanation',
            'corrective_actions',
            'source_document_id',
            'created_by'
        ].filter((column) => availableColumns.has(column))

        if (insertColumns.length === 0) {
            throw new Error('financial_variances table has no expected columns for extraction insert')
        }

        const values: any[] = []
        const placeholders: string[] = []

        entities.forEach((e, index) => {
            const offset = index * insertColumns.length
            placeholders.push(`(${insertColumns.map((_, i) => `$${offset + i + 1}`).join(', ')})`)

            const rowData: Record<string, any> = {
                project_id: projectId,
                report_date: normalizeDate(e.report_date) || null,
                cv_value: coerceNumber(e.cv_value) ?? null,
                cpi_value: coerceNumber(e.cpi_value) ?? null,
                eac_value: coerceNumber(e.eac_value) ?? null,
                etc_value: coerceNumber(e.etc_value) ?? null,
                variance_explanation: e.variance_explanation || null,
                corrective_actions: e.corrective_actions || null,
                source_document_id: e.source_document_id || null,
                created_by: userId
            }

            insertColumns.forEach((column) => {
                values.push(rowData[column] ?? null)
            })
        })

        await client.query(
            `INSERT INTO financial_variances (
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
        logger.error('[EXTRACTION-FINANCIAL-VARIANCE] Failed to save', {
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
