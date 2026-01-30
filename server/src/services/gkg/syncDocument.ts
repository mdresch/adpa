/**
 * GKG Phase 2 for one document: upsert Document + BELONGS_TO.
 * Idempotent. Use when a single document is created/updated.
 */

import type { Pool } from "pg"
import type { Driver } from "neo4j-driver"
import { logger } from "../../utils/logger"
import { CYPHER } from "./cypher"

const LOG_TAG = "[GKG-SYNC-DOCUMENT]"

export async function runSyncDocument(
  pool: Pool,
  driver: Driver,
  database: string,
  documentId: string
): Promise<{ ok: boolean }> {
  const session = driver.session({ database })
  try {
    const res = await pool.query(
      `SELECT d.id, d.project_id, d.name, d.title, d.template_id, d.template_framework, d.status, d.created_at,
              t.name AS template_name, t.framework AS template_framework_join, t.created_at AS template_created_at
       FROM documents d
       LEFT JOIN templates t ON d.template_id = t.id AND t.deleted_at IS NULL
       WHERE d.id = $1`,
      [documentId]
    )
    if (!res?.rows?.length) {
      logger.warn(`${LOG_TAG} Document not found`, { documentId })
      return { ok: false }
    }
    const d = res.rows[0] as {
      id: string
      project_id: string
      name: string
      title: string | null
      template_id: string | null
      template_framework: string | null
      status: string | null
      created_at: string | Date | null
      template_name: string | null
      template_framework_join: string | null
      template_created_at: string | Date | null
    }
    const toPrim = (v: unknown): string | number | boolean | null =>
      v == null ? null : typeof v === "object" && v instanceof Date ? v.toISOString() : typeof v === "object" ? JSON.stringify(v) : typeof v === "string" || typeof v === "number" || typeof v === "boolean" ? v : String(v)
    await session.run(CYPHER.mergeDocument, {
      documentId: String(d.id),
      projectId: String(d.project_id),
      templateType: toPrim(d.template_framework ?? d.template_id),
      title: toPrim(d.title ?? d.name),
      status: toPrim(d.status ?? 'draft'),
      createdAt: toPrim(d.created_at),
    })
    await session.run(CYPHER.mergeDocumentBelongsTo, { projectId: d.project_id, documentId: d.id })
    if (d.template_id) {
      await session.run(CYPHER.mergeTemplate, {
        templateId: String(d.template_id),
        name: String(d.template_name ?? d.template_framework_join ?? 'Unknown'),
        framework: toPrim(d.template_framework_join ?? d.template_framework),
        createdAt: toPrim(d.template_created_at),
      })
      await session.run(CYPHER.mergeDocumentGeneratedFrom, {
        documentId: String(d.id),
        templateId: String(d.template_id),
      })
    }
    logger.info(`${LOG_TAG} Complete`, { documentId })
    return { ok: true }
  } finally {
    await session.close()
  }
}
