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
      "SELECT id, project_id, template_type, title, created_at FROM documents WHERE id = $1",
      [documentId]
    )
    if (res.rows.length === 0) {
      logger.warn(`${LOG_TAG} Document not found`, { documentId })
      return { ok: false }
    }
    const d = res.rows[0] as { id: string; project_id: string; template_type: string; title: string; created_at: string }
    await session.run(CYPHER.mergeDocument, {
      documentId: d.id,
      projectId: d.project_id,
      templateType: d.template_type ?? null,
      title: d.title ?? null,
      createdAt: d.created_at ?? null,
    })
    await session.run(CYPHER.mergeDocumentBelongsTo, { projectId: d.project_id, documentId: d.id })
    logger.info(`${LOG_TAG} Complete`, { documentId })
    return { ok: true }
  } finally {
    await session.close()
  }
}
