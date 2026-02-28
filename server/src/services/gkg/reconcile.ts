import type { Pool } from "pg"
import type { Driver } from "neo4j-driver"
import { ENTITY_MAPPINGS } from "./mapping"

const ENTITY_TO_TABLE = new Map<string, string>(
  ENTITY_MAPPINGS.map((mapping) => [mapping.gkgEntityType, mapping.adpaTable])
)

type StaleNodeType = "Project" | "Document" | "Template" | "Task"

export interface ReconcileReport {
  scanned: {
    limitPerType: number
    projects: number
    documents: number
    templates: number
    tasks: number
    semanticUnits: number
  }
  staleNodes: {
    projects: string[]
    documents: string[]
    templates: string[]
    tasks: string[]
    semanticUnits: Array<{ entityType: string; adpaId: string }>
  }
  staleEdges: {
    documentBelongsToMismatches: Array<{ documentId: string; expectedProjectId: string; actualProjectId: string }>
    taskBelongsToMismatches: Array<{ taskId: string; expectedProjectId: string; actualProjectId: string }>
    semanticUnitBelongsToMismatches: Array<{ entityType: string; adpaId: string; expectedProjectId: string; actualProjectId: string }>
    semanticUnitExtractedFromMismatches: Array<{ entityType: string; adpaId: string; expectedDocumentId: string; actualDocumentId: string }>
  }
  unknownSemanticUnitEntityTypes: string[]
  cleanup: {
    applied: boolean
    deletedNodes: {
      projects: number
      documents: number
      templates: number
      tasks: number
      semanticUnits: number
    }
    deletedEdges: {
      documentBelongsTo: number
      taskBelongsTo: number
      semanticUnitBelongsTo: number
      semanticUnitExtractedFrom: number
    }
  }
}

function normalizeLimit(limitPerType?: number): number {
  const parsed = Number(limitPerType ?? 500)
  if (!Number.isFinite(parsed)) return 500
  const asInt = Math.floor(parsed)
  if (asInt < 1) return 1
  if (asInt > 5000) return 5000
  return asInt
}

async function fetchNeo4jIds(
  session: { run: (q: string, params?: Record<string, unknown>) => Promise<{ records: Array<{ get: (key: string) => unknown }> }> },
  label: StaleNodeType,
  limit: number
): Promise<string[]> {
  const result = await session.run(
    `
      MATCH (n:${label})
      WHERE n.adpa_id IS NOT NULL
      RETURN toString(n.adpa_id) AS id
      LIMIT toInteger($limit)
    `,
    { limit }
  )

  return result.records
    .map((record) => record.get("id"))
    .filter((value): value is string => typeof value === "string" && value.length > 0)
}

async function fetchExistingIds(pool: Pool, tableName: string, ids: string[]): Promise<Set<string>> {
  if (!ids.length) return new Set<string>()
  const result = await pool.query(`SELECT id::text AS id FROM "${tableName}" WHERE id::text = ANY($1::text[])`, [ids])
  return new Set<string>(result.rows.map((row) => String(row.id)))
}

function findStaleIds(ids: string[], existing: Set<string>): string[] {
  return ids.filter((id) => !existing.has(id))
}

async function deleteStaleNodes(
  session: { run: (q: string, params?: Record<string, unknown>) => Promise<{ records: Array<{ get: (key: string) => unknown }> }> },
  label: StaleNodeType,
  ids: string[]
): Promise<number> {
  if (!ids.length) return 0
  const result = await session.run(
    `
      UNWIND $ids AS id
      MATCH (n:${label} { adpa_id: id })
      WITH collect(n) AS nodes
      WITH nodes, size(nodes) AS deleted
      FOREACH (node IN nodes | DETACH DELETE node)
      RETURN deleted
    `,
    { ids }
  )
  const deleted = result.records[0]?.get("deleted")
  return typeof deleted === "number" ? deleted : Number((deleted as { toNumber?: () => number })?.toNumber?.() ?? deleted ?? 0)
}

async function deleteStaleSemanticUnits(
  session: { run: (q: string, params?: Record<string, unknown>) => Promise<{ records: Array<{ get: (key: string) => unknown }> }> },
  units: Array<{ entityType: string; adpaId: string }>
): Promise<number> {
  if (!units.length) return 0
  const result = await session.run(
    `
      UNWIND $units AS u
      MATCH (n:SemanticUnit { adpa_entity_type: u.entityType, adpa_id: u.adpaId })
      WITH collect(n) AS nodes
      WITH nodes, size(nodes) AS deleted
      FOREACH (node IN nodes | DETACH DELETE node)
      RETURN deleted
    `,
    { units }
  )
  const deleted = result.records[0]?.get("deleted")
  return typeof deleted === "number" ? deleted : Number((deleted as { toNumber?: () => number })?.toNumber?.() ?? deleted ?? 0)
}

async function deleteMismatchedDocBelongsTo(
  session: { run: (q: string, params?: Record<string, unknown>) => Promise<{ records: Array<{ get: (key: string) => unknown }> }> },
  documentIds: string[]
): Promise<number> {
  if (!documentIds.length) return 0
  const result = await session.run(
    `
      MATCH (d:Document)-[r:BELONGS_TO]->(p:Project)
      WHERE d.adpa_id IN $documentIds
        AND d.project_id IS NOT NULL
        AND p.adpa_id <> d.project_id
      WITH collect(r) AS rels
      WITH rels, size(rels) AS deleted
      FOREACH (rel IN rels | DELETE rel)
      RETURN deleted
    `,
    { documentIds }
  )
  const deleted = result.records[0]?.get("deleted")
  return typeof deleted === "number" ? deleted : Number((deleted as { toNumber?: () => number })?.toNumber?.() ?? deleted ?? 0)
}

async function deleteMismatchedTaskBelongsTo(
  session: { run: (q: string, params?: Record<string, unknown>) => Promise<{ records: Array<{ get: (key: string) => unknown }> }> },
  taskIds: string[]
): Promise<number> {
  if (!taskIds.length) return 0
  const result = await session.run(
    `
      MATCH (t:Task)-[r:BELONGS_TO]->(p:Project)
      WHERE t.adpa_id IN $taskIds
        AND t.project_id IS NOT NULL
        AND p.adpa_id <> t.project_id
      WITH collect(r) AS rels
      WITH rels, size(rels) AS deleted
      FOREACH (rel IN rels | DELETE rel)
      RETURN deleted
    `,
    { taskIds }
  )
  const deleted = result.records[0]?.get("deleted")
  return typeof deleted === "number" ? deleted : Number((deleted as { toNumber?: () => number })?.toNumber?.() ?? deleted ?? 0)
}

async function deleteMismatchedUnitBelongsTo(
  session: { run: (q: string, params?: Record<string, unknown>) => Promise<{ records: Array<{ get: (key: string) => unknown }> }> },
  units: Array<{ entityType: string; adpaId: string }>
): Promise<number> {
  if (!units.length) return 0
  const result = await session.run(
    `
      UNWIND $units AS u
      MATCH (su:SemanticUnit { adpa_entity_type: u.entityType, adpa_id: u.adpaId })-[r:BELONGS_TO]->(p:Project)
      WHERE su.project_id IS NOT NULL
        AND p.adpa_id <> su.project_id
      WITH collect(r) AS rels
      WITH rels, size(rels) AS deleted
      FOREACH (rel IN rels | DELETE rel)
      RETURN deleted
    `,
    { units }
  )
  const deleted = result.records[0]?.get("deleted")
  return typeof deleted === "number" ? deleted : Number((deleted as { toNumber?: () => number })?.toNumber?.() ?? deleted ?? 0)
}

async function deleteMismatchedUnitExtractedFrom(
  session: { run: (q: string, params?: Record<string, unknown>) => Promise<{ records: Array<{ get: (key: string) => unknown }> }> },
  units: Array<{ entityType: string; adpaId: string }>
): Promise<number> {
  if (!units.length) return 0
  const result = await session.run(
    `
      UNWIND $units AS u
      MATCH (su:SemanticUnit { adpa_entity_type: u.entityType, adpa_id: u.adpaId })-[r:EXTRACTED_FROM]->(d:Document)
      WHERE su.document_id IS NOT NULL
        AND d.adpa_id <> su.document_id
      WITH collect(r) AS rels
      WITH rels, size(rels) AS deleted
      FOREACH (rel IN rels | DELETE rel)
      RETURN deleted
    `,
    { units }
  )
  const deleted = result.records[0]?.get("deleted")
  return typeof deleted === "number" ? deleted : Number((deleted as { toNumber?: () => number })?.toNumber?.() ?? deleted ?? 0)
}

export async function runGkgReconciliation(
  pool: Pool,
  driver: Driver,
  database: string,
  options?: { cleanup?: boolean; limitPerType?: number }
): Promise<ReconcileReport> {
  const cleanup = options?.cleanup ?? false
  const limitPerType = normalizeLimit(options?.limitPerType)

  const session = driver.session({ database })
  try {
    const [projectIds, documentIds, templateIds, taskIds] = await Promise.all([
      fetchNeo4jIds(session, "Project", limitPerType),
      fetchNeo4jIds(session, "Document", limitPerType),
      fetchNeo4jIds(session, "Template", limitPerType),
      fetchNeo4jIds(session, "Task", limitPerType),
    ])

    const semanticUnitsResult = await session.run(
      `
        MATCH (u:SemanticUnit)
        WHERE u.adpa_entity_type IS NOT NULL AND u.adpa_id IS NOT NULL
        RETURN toString(u.adpa_entity_type) AS entityType, toString(u.adpa_id) AS adpaId
        LIMIT toInteger($limit)
      `,
      { limit: limitPerType }
    )

    const semanticUnits = semanticUnitsResult.records
      .map((record) => ({
        entityType: record.get("entityType"),
        adpaId: record.get("adpaId"),
      }))
      .filter(
        (entry): entry is { entityType: string; adpaId: string } =>
          typeof entry.entityType === "string" &&
          entry.entityType.length > 0 &&
          typeof entry.adpaId === "string" &&
          entry.adpaId.length > 0
      )

    const [existingProjects, existingDocuments, existingTemplates, existingTasks] = await Promise.all([
      fetchExistingIds(pool, "projects", projectIds),
      fetchExistingIds(pool, "documents", documentIds),
      fetchExistingIds(pool, "templates", templateIds),
      fetchExistingIds(pool, "project_tasks", taskIds),
    ])

    const staleProjects = findStaleIds(projectIds, existingProjects)
    const staleDocuments = findStaleIds(documentIds, existingDocuments)
    const staleTemplates = findStaleIds(templateIds, existingTemplates)
    const staleTasks = findStaleIds(taskIds, existingTasks)

    const unitsByType = new Map<string, string[]>()
    for (const unit of semanticUnits) {
      const current = unitsByType.get(unit.entityType) ?? []
      current.push(unit.adpaId)
      unitsByType.set(unit.entityType, current)
    }

    const unknownEntityTypes: string[] = []
    const staleSemanticUnits: Array<{ entityType: string; adpaId: string }> = []

    for (const [entityType, adpaIds] of unitsByType.entries()) {
      const table = ENTITY_TO_TABLE.get(entityType)
      if (!table) {
        unknownEntityTypes.push(entityType)
        continue
      }
      const existing = await fetchExistingIds(pool, table, adpaIds)
      for (const adpaId of adpaIds) {
        if (!existing.has(adpaId)) {
          staleSemanticUnits.push({ entityType, adpaId })
        }
      }
    }

    const documentBelongsToMismatchesResult = await session.run(
      `
        MATCH (d:Document)-[:BELONGS_TO]->(p:Project)
        WHERE d.project_id IS NOT NULL AND p.adpa_id <> d.project_id
        RETURN toString(d.adpa_id) AS documentId,
               toString(d.project_id) AS expectedProjectId,
               toString(p.adpa_id) AS actualProjectId
        LIMIT toInteger($limit)
      `,
      { limit: limitPerType }
    )

    const taskBelongsToMismatchesResult = await session.run(
      `
        MATCH (t:Task)-[:BELONGS_TO]->(p:Project)
        WHERE t.project_id IS NOT NULL AND p.adpa_id <> t.project_id
        RETURN toString(t.adpa_id) AS taskId,
               toString(t.project_id) AS expectedProjectId,
               toString(p.adpa_id) AS actualProjectId
        LIMIT toInteger($limit)
      `,
      { limit: limitPerType }
    )

    const unitBelongsToMismatchesResult = await session.run(
      `
        MATCH (u:SemanticUnit)-[:BELONGS_TO]->(p:Project)
        WHERE u.project_id IS NOT NULL AND p.adpa_id <> u.project_id
        RETURN toString(u.adpa_entity_type) AS entityType,
               toString(u.adpa_id) AS adpaId,
               toString(u.project_id) AS expectedProjectId,
               toString(p.adpa_id) AS actualProjectId
        LIMIT toInteger($limit)
      `,
      { limit: limitPerType }
    )

    const unitExtractedFromMismatchesResult = await session.run(
      `
        MATCH (u:SemanticUnit)-[:EXTRACTED_FROM]->(d:Document)
        WHERE u.document_id IS NOT NULL AND d.adpa_id <> u.document_id
        RETURN toString(u.adpa_entity_type) AS entityType,
               toString(u.adpa_id) AS adpaId,
               toString(u.document_id) AS expectedDocumentId,
               toString(d.adpa_id) AS actualDocumentId
        LIMIT toInteger($limit)
      `,
      { limit: limitPerType }
    )

    const documentBelongsToMismatches = documentBelongsToMismatchesResult.records.map((record) => ({
      documentId: String(record.get("documentId") ?? ""),
      expectedProjectId: String(record.get("expectedProjectId") ?? ""),
      actualProjectId: String(record.get("actualProjectId") ?? ""),
    }))

    const taskBelongsToMismatches = taskBelongsToMismatchesResult.records.map((record) => ({
      taskId: String(record.get("taskId") ?? ""),
      expectedProjectId: String(record.get("expectedProjectId") ?? ""),
      actualProjectId: String(record.get("actualProjectId") ?? ""),
    }))

    const semanticUnitBelongsToMismatches = unitBelongsToMismatchesResult.records.map((record) => ({
      entityType: String(record.get("entityType") ?? ""),
      adpaId: String(record.get("adpaId") ?? ""),
      expectedProjectId: String(record.get("expectedProjectId") ?? ""),
      actualProjectId: String(record.get("actualProjectId") ?? ""),
    }))

    const semanticUnitExtractedFromMismatches = unitExtractedFromMismatchesResult.records.map((record) => ({
      entityType: String(record.get("entityType") ?? ""),
      adpaId: String(record.get("adpaId") ?? ""),
      expectedDocumentId: String(record.get("expectedDocumentId") ?? ""),
      actualDocumentId: String(record.get("actualDocumentId") ?? ""),
    }))

    const report: ReconcileReport = {
      scanned: {
        limitPerType,
        projects: projectIds.length,
        documents: documentIds.length,
        templates: templateIds.length,
        tasks: taskIds.length,
        semanticUnits: semanticUnits.length,
      },
      staleNodes: {
        projects: staleProjects,
        documents: staleDocuments,
        templates: staleTemplates,
        tasks: staleTasks,
        semanticUnits: staleSemanticUnits,
      },
      staleEdges: {
        documentBelongsToMismatches,
        taskBelongsToMismatches,
        semanticUnitBelongsToMismatches,
        semanticUnitExtractedFromMismatches,
      },
      unknownSemanticUnitEntityTypes: Array.from(new Set(unknownEntityTypes)).sort(),
      cleanup: {
        applied: cleanup,
        deletedNodes: {
          projects: 0,
          documents: 0,
          templates: 0,
          tasks: 0,
          semanticUnits: 0,
        },
        deletedEdges: {
          documentBelongsTo: 0,
          taskBelongsTo: 0,
          semanticUnitBelongsTo: 0,
          semanticUnitExtractedFrom: 0,
        },
      },
    }

    if (!cleanup) return report

    report.cleanup.deletedNodes.projects = await deleteStaleNodes(session, "Project", staleProjects)
    report.cleanup.deletedNodes.documents = await deleteStaleNodes(session, "Document", staleDocuments)
    report.cleanup.deletedNodes.templates = await deleteStaleNodes(session, "Template", staleTemplates)
    report.cleanup.deletedNodes.tasks = await deleteStaleNodes(session, "Task", staleTasks)
    report.cleanup.deletedNodes.semanticUnits = await deleteStaleSemanticUnits(session, staleSemanticUnits)

    report.cleanup.deletedEdges.documentBelongsTo = await deleteMismatchedDocBelongsTo(
      session,
      documentBelongsToMismatches.map((entry) => entry.documentId)
    )
    report.cleanup.deletedEdges.taskBelongsTo = await deleteMismatchedTaskBelongsTo(
      session,
      taskBelongsToMismatches.map((entry) => entry.taskId)
    )
    report.cleanup.deletedEdges.semanticUnitBelongsTo = await deleteMismatchedUnitBelongsTo(
      session,
      semanticUnitBelongsToMismatches.map((entry) => ({ entityType: entry.entityType, adpaId: entry.adpaId }))
    )
    report.cleanup.deletedEdges.semanticUnitExtractedFrom = await deleteMismatchedUnitExtractedFrom(
      session,
      semanticUnitExtractedFromMismatches.map((entry) => ({ entityType: entry.entityType, adpaId: entry.adpaId }))
    )

    return report
  } finally {
    await session.close()
  }
}
