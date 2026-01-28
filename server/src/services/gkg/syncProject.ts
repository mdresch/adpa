/**
 * GKG Phases 1–4 for one project: Project, Documents, SemanticUnits, project_dependencies.
 * Uses PostgreSQL (pool) for read, Neo4j (driver) for write. Idempotent.
 */

import type { Pool } from "pg"
import type { Driver } from "neo4j-driver"
import { logger } from "../../utils/logger"
import { CYPHER } from "./cypher"
import { ENTITY_MAPPINGS, getSummaryFromRow } from "./mapping"

const LOG_TAG = "[GKG-SYNC-PROJECT]"
const BATCH_SIZE = 500

export interface SyncProjectResult {
  project: boolean
  documents: number
  units: number
  dependencies: number
  errors: string[]
}

function toRecord(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const k of Object.keys(row)) {
    const v = row[k]
    if (v !== undefined && v !== null) out[k] = v
  }
  return out
}

export async function runSyncProject(
  pool: Pool,
  driver: Driver,
  database: string,
  projectId: string
): Promise<SyncProjectResult> {
  const out: SyncProjectResult = { project: false, documents: 0, units: 0, dependencies: 0, errors: [] }
  const session = driver.session({ database })

  try {
    // Phase 1: Project
    const projRes = await pool.query(
      "SELECT id, name, created_at FROM projects WHERE id = $1",
      [projectId]
    )
    if (projRes.rows.length === 0) {
      logger.warn(`${LOG_TAG} Project not found`, { projectId })
      return out
    }
    const proj = projRes.rows[0] as { id: string; name: string; created_at: string }
    await session.run(CYPHER.mergeProject, {
      projectId: proj.id,
      name: proj.name ?? "",
      createdAt: proj.created_at ?? null,
    })
    out.project = true

    // Phase 2: Documents
    const docRes = await pool.query(
      "SELECT id, project_id, template_type, title, created_at FROM documents WHERE project_id = $1",
      [projectId]
    )
    for (const d of docRes.rows as { id: string; project_id: string; template_type: string; title: string; created_at: string }[]) {
      await session.run(CYPHER.mergeDocument, {
        documentId: d.id,
        projectId: d.project_id,
        templateType: d.template_type ?? null,
        title: d.title ?? null,
        createdAt: d.created_at ?? null,
      })
      await session.run(CYPHER.mergeDocumentBelongsTo, { projectId: d.project_id, documentId: d.id })
      out.documents++
    }

    // Phase 3: SemanticUnits per entity table (SELECT *; mapping picks summary/doc from row)
    for (const mapping of ENTITY_MAPPINGS) {
      try {
        const table = mapping.adpaTable
        const docCol = mapping.documentIdColumn
        const res = await pool.query(
          `SELECT * FROM "${table}" WHERE project_id = $1`,
          [projectId]
        ).catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err)
          if (msg.includes("does not exist") || msg.includes("relation")) return { rows: [] }
          throw err
        })
        const rows = (res as { rows: Record<string, unknown>[] }).rows ?? []
        for (let i = 0; i < rows.length; i += BATCH_SIZE) {
          const batch = rows.slice(i, i + BATCH_SIZE)
          for (const row of batch) {
            const id = row.id as string
            const projectIdVal = (row.project_id as string) ?? projectId
            const docId = docCol ? (row[docCol] as string | null) ?? null : null
            const summary = getSummaryFromRow(row, mapping.summaryColumns)
            const payload = toRecord(row)
            delete (payload as Record<string, unknown>).id
            delete (payload as Record<string, unknown>).project_id
            if (docCol) delete (payload as Record<string, unknown>)[docCol]
            await session.run(CYPHER.mergeSemanticUnit, {
              entityType: mapping.gkgEntityType,
              adpaId: id,
              projectId: projectIdVal,
              documentId: docId,
              summary: summary || null,
              payload: Object.keys(payload).length ? payload : null,
            })
            await session.run(CYPHER.mergeUnitBelongsTo, {
              projectId: projectIdVal,
              entityType: mapping.gkgEntityType,
              adpaId: id,
            })
            if (docId) {
              await session.run(CYPHER.mergeUnitExtractedFrom, {
                documentId: docId,
                entityType: mapping.gkgEntityType,
                adpaId: id,
              })
            }
            out.units++
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        out.errors.push(`${mapping.adpaTable}: ${msg}`)
        logger.warn(`${LOG_TAG} Entity table failed`, { table: mapping.adpaTable, projectId, error: msg })
      }
    }

    // Phase 4: Project dependencies (only create edges when both endpoints exist)
    const depRes = await pool.query(
      "SELECT source_project_id, target_project_id FROM project_dependencies WHERE source_project_id = $1 OR target_project_id = $1",
      [projectId]
    ).catch(() => ({ rows: [] }))
    for (const row of (depRes.rows ?? []) as { source_project_id: string; target_project_id: string }[]) {
      try {
        await session.run(CYPHER.mergeDependsOn, {
          sourceProjectId: row.source_project_id,
          targetProjectId: row.target_project_id,
        })
        out.dependencies++
      } catch {
        // One of the projects may not be in the graph yet; skip
      }
    }

    logger.info(`${LOG_TAG} Complete`, { projectId, ...out })
    return out
  } finally {
    await session.close()
  }
}
