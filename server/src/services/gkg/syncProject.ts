/**
 * GKG Phases 1–5 for one project: Program (if any), Project, Documents, Tasks, SemanticUnits, project_dependencies.
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
  programs: number
  documents: number
  tasks: number
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

/** Coerce a value to a Neo4j-safe primitive (string, number, boolean, null). */
function toNeo4jPrimitive(v: unknown): string | number | boolean | null {
  if (v == null) return null
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return v
  if (v instanceof Date) return v.toISOString()
  if (typeof v === "object") return JSON.stringify(v)
  return String(v)
}

export async function runSyncProject(
  pool: Pool,
  driver: Driver,
  database: string,
  projectId: string
): Promise<SyncProjectResult> {
  const out: SyncProjectResult = { project: false, programs: 0, documents: 0, tasks: 0, units: 0, dependencies: 0, errors: [] }
  const session = driver.session({ database })

  try {
    // Phase 1: Project (and Program if project belongs to one)
    const projRes = await pool.query(
      "SELECT id, name, created_at, program_id FROM projects WHERE id = $1",
      [projectId]
    )
    if (projRes.rows.length === 0) {
      logger.warn(`${LOG_TAG} Project not found`, { projectId })
      return out
    }
    const proj = projRes.rows[0] as { id: string; name: string; created_at: string; program_id: string | null }
    await session.run(CYPHER.mergeProject, {
      projectId: String(proj.id),
      name: String(proj.name ?? ""),
      createdAt: toNeo4jPrimitive(proj.created_at),
    })
    out.project = true

    if (proj.program_id) {
      try {
        const progRes = await pool.query(
          "SELECT id, name, description, status, created_at FROM programs WHERE id = $1",
          [proj.program_id]
        )
        if (progRes.rows.length > 0) {
          const prog = progRes.rows[0] as { id: string; name: string; description: string | null; status: string | null; created_at: string | null }
          await session.run(CYPHER.mergeProgram, {
            programId: String(prog.id),
            name: String(prog.name ?? ""),
            description: toNeo4jPrimitive(prog.description),
            status: toNeo4jPrimitive(prog.status),
            createdAt: toNeo4jPrimitive(prog.created_at),
          })
          await session.run(CYPHER.mergeProjectBelongsToProgram, {
            programId: prog.id,
            projectId: proj.id,
          })
          out.programs = 1
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        logger.warn(`${LOG_TAG} Program sync failed (non-fatal)`, { programId: proj.program_id, projectId, error: msg })
      }
    }

    // Phase 2: Documents (with template join for Template node and GENERATED_FROM)
    const docRes = await pool
      .query(
        `SELECT d.id, d.project_id, d.name, d.title, d.template_id, d.template_framework, d.status, d.created_at,
                t.name AS template_name, t.framework AS template_framework_join, t.created_at AS template_created_at
         FROM documents d
         LEFT JOIN templates t ON d.template_id = t.id AND t.deleted_at IS NULL
         WHERE d.project_id = $1`,
        [projectId]
      )
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err)
        logger.warn(`${LOG_TAG} Documents query failed`, { projectId, error: msg })
        return { rows: [] }
      })
    const docRows = (docRes?.rows ?? []) as {
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
    }[]
    for (const d of docRows) {
      await session.run(CYPHER.mergeDocument, {
        documentId: String(d.id),
        projectId: String(d.project_id),
        templateType: toNeo4jPrimitive(d.template_framework ?? d.template_id),
        title: toNeo4jPrimitive(d.title ?? d.name),
        status: toNeo4jPrimitive(d.status ?? 'draft'),
        createdAt: toNeo4jPrimitive(d.created_at),
      })
      await session.run(CYPHER.mergeDocumentBelongsTo, { projectId: d.project_id, documentId: d.id })
      if (d.template_id) {
        await session.run(CYPHER.mergeTemplate, {
          templateId: String(d.template_id),
          name: String(d.template_name ?? d.template_framework_join ?? 'Unknown'),
          framework: toNeo4jPrimitive(d.template_framework_join ?? d.template_framework),
          createdAt: toNeo4jPrimitive(d.template_created_at),
        })
        await session.run(CYPHER.mergeDocumentGeneratedFrom, {
          documentId: String(d.id),
          templateId: String(d.template_id),
        })
      }
      out.documents++
    }

    // Phase 2.5: Tasks (project_tasks)
    try {
      const taskRes = await pool.query(
        `SELECT id, project_id, task_name, description, status, entity_type, wbs_code, created_at
         FROM project_tasks WHERE project_id = $1`,
        [projectId]
      )
      const taskRows = (taskRes?.rows ?? []) as {
        id: string
        project_id: string
        task_name: string
        description: string | null
        status: string | null
        entity_type: string | null
        wbs_code: string | null
        created_at: string | Date | null
      }[]
      for (const t of taskRows) {
        const summary = (t.description ?? t.task_name ?? "").toString().slice(0, 2000)
        await session.run(CYPHER.mergeTask, {
          taskId: String(t.id),
          projectId: String(t.project_id),
          taskName: String(t.task_name ?? ""),
          summary: summary || null,
          status: toNeo4jPrimitive(t.status),
          entityType: toNeo4jPrimitive(t.entity_type),
          wbsCode: toNeo4jPrimitive(t.wbs_code),
          createdAt: toNeo4jPrimitive(t.created_at),
        })
        await session.run(CYPHER.mergeTaskBelongsToProject, { projectId: t.project_id, taskId: t.id })
        out.tasks++
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      logger.warn(`${LOG_TAG} Tasks query failed (non-fatal)`, { projectId, error: msg })
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
            // Neo4j property values must be primitives; store payload as JSON string (all values coerced to primitives)
            const payloadSafe =
              Object.keys(payload).length > 0
                ? Object.fromEntries(
                    Object.entries(payload).map(([k, v]) => [k, toNeo4jPrimitive(v)])
                  )
                : null
            const payloadStr = payloadSafe != null ? JSON.stringify(payloadSafe) : null
            await session.run(CYPHER.mergeSemanticUnit, {
              entityType: String(mapping.gkgEntityType),
              adpaId: String(id),
              projectId: String(projectIdVal),
              documentId: docId != null ? String(docId) : null,
              summary: summary ? String(summary) : null,
              payload: payloadStr,
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

    // Phase 4: Project dependencies (optional table; skip if missing)
    let depRows: { source_project_id: string; target_project_id: string }[] = []
    try {
      const depRes = await pool.query(
        "SELECT source_project_id, target_project_id FROM project_dependencies WHERE source_project_id = $1 OR target_project_id = $1",
        [projectId]
      )
      depRows = (depRes?.rows ?? []) as { source_project_id: string; target_project_id: string }[]
    } catch {
      // Table may not exist or query failed; skip Phase 4
      depRows = []
    }
    for (const row of depRows) {
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
