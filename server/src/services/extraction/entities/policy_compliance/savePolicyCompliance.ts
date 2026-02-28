/**
 * Save Policy Compliance
 */

import { logger } from '../../../../utils/logger'
import type { PoolClient } from 'pg'
import type { PersistenceResult } from '../../base/Persistence'
import type { PolicyCompliance } from './types'

function normalizeTimestamp(value: unknown): string | null {
    if (!value || typeof value !== 'string') return null
    const trimmed = value.trim()
    if (!trimmed) return null

    const lowered = trimmed.toLowerCase()
    if (['n/a', 'na', 'not specified', 'unknown', 'tbd', 'yyyy-mm-dd'].includes(lowered)) {
        return null
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        return `${trimmed}T00:00:00.000Z`
    }

    const parsed = Date.parse(trimmed)
    if (Number.isNaN(parsed)) return null
    return new Date(parsed).toISOString()
}

export async function savePolicyCompliance(
    client: PoolClient,
    projectId: string,
    userId: string,
    entities: PolicyCompliance[]
): Promise<PersistenceResult> {
    if (entities.length === 0) {
        return { saved: 0, skipped: 0, failed: 0 }
    }

    try {
        // Delete existing records for this project
        await client.query('DELETE FROM policy_compliance WHERE project_id = $1', [projectId])

        const values: any[] = []
        const placeholders: string[] = []

        entities.forEach((e, index) => {
            const offset = index * 9
            placeholders.push(
                `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9})`
            )

            values.push(
                projectId,
                e.policy_name || '',
                e.category || null,
                e.compliance_status || null,
                e.findings || null,
                normalizeTimestamp(e.last_audit_date),
                normalizeTimestamp(e.next_audit_date),
                e.source_document_id || null,
                userId
            )
        })

        await client.query(
            `INSERT INTO policy_compliance (
        project_id, policy_name, category, compliance_status, 
        findings, last_audit_date, next_audit_date, 
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
        logger.error('[EXTRACTION-POLICY-COMPLIANCE] Failed to save', {
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
