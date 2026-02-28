import type { Pool } from "pg"
import type { Driver } from "neo4j-driver"
import { ENTITY_MAPPINGS } from "./mapping"

const ENTITY_TO_TABLE = new Map<string, string>(
  ENTITY_MAPPINGS.map((mapping) => [mapping.gkgEntityType, mapping.adpaTable])
)

const SAMPLE_LIMIT = 100

type NodeLabel = "Project" | "Document" | "Template" | "Task"

type NeoRecord = { get: (key: string) => unknown }
type NeoSession = {
  run: (
    query: string,
    params?: Record<string, unknown>
  ) => Promise<{ records: NeoRecord[] }>
  close: () => Promise<void>
}

export interface FullReconcileReport {
  scanned: {
    batchSize: number
    projects: number
    documents: number
    templates: number
    tasks: number
    semanticUnits: number
  }
  staleCounts: {
    projects: number
    documents: number
    templates: number
    tasks: number
    semanticUnits: number
  }
  staleSamples: {
    projects: string[]
    documents: string[]
    templates: string[]
    tasks: string[]
    semanticUnits: Array<{ entityType: string; adpaId: string }>
  }
  staleEdges: {
    documentBelongsToMismatches: {
      count: number
      sample: Array<{ documentId: string; expectedProjectId: string; actualProjectId: string }>
    }
    taskBelongsToMismatches: {
      count: number
      sample: Array<{ taskId: string; expectedProjectId: string; actualProjectId: string }>
    }
    semanticUnitBelongsToMismatches: {
      count: number
      sample: Array<{ entityType: string; adpaId: string; expectedProjectId: string; actualProjectId: string }>
    }
    semanticUnitExtractedFromMismatches: {
      count: number
      sample: Array<{ entityType: string; adpaId: string; expectedDocumentId: string; actualDocumentId: string }>
    }
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

function toNumber(value: unknown): number {
  if (typeof value === "number") return value
  if (value && typeof value === "object" && "toNumber" in value) {
    const maybe = (value as { toNumber?: () => number }).toNumber?.()
    if (typeof maybe === "number") return maybe
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function normalizeBatchSize(batchSize?: number): number {
  const parsed = Number(batchSize ?? 1000)
  if (!Number.isFinite(parsed)) return 1000
  const asInt = Math.floor(parsed)
  if (asInt < 100) return 100
  if (asInt > 5000) return 5000
  return asInt
}

function pushSample<T>(target: T[], entry: T): void {
  if (target.length < SAMPLE_LIMIT) {
    target.push(entry)
  }
}

async function fetchExistingIds(pool: Pool, tableName: string, ids: string[]): Promise<Set<string>> {
  if (!ids.length) return new Set<string>()
  const result = await pool.query(`SELECT id::text AS id FROM "${tableName}" WHERE id::text = ANY($1::text[])`, [ids])
  return new Set<string>(result.rows.map((row) => String(row.id)))
}

async function fetchNodeBatch(
  session: NeoSession,
  label: NodeLabel,
  skip: number,
  limit: number
): Promise<string[]> {
  const result = await session.run(
    `
      MATCH (n:${label})
      WHERE n.adpa_id IS NOT NULL
      RETURN toString(n.adpa_id) AS id
      ORDER BY toString(n.adpa_id)
      SKIP toInteger($skip)
      LIMIT toInteger($limit)
    `,
    { skip, limit }
  )
  return result.records
    .map((record) => record.get("id"))
    .filter((entry): entry is string => typeof entry === "string" && entry.length > 0)
}

async function deleteNodesByIds(session: NeoSession, label: NodeLabel, ids: string[]): Promise<number> {
  if (!ids.length) return 0
  const result = await session.run(
    `
      UNWIND $ids AS id
      MATCH (n:${label} {adpa_id: id})
      WITH collect(n) AS nodes
      WITH nodes, size(nodes) AS deleted
      FOREACH (node IN nodes | DETACH DELETE node)
      RETURN deleted
    `,
    { ids }
  )
  return toNumber(result.records[0]?.get("deleted"))
}

async function fetchSemanticUnitBatch(
  session: NeoSession,
  skip: number,
  limit: number
): Promise<Array<{ entityType: string; adpaId: string }>> {
  const result = await session.run(
    `
      MATCH (u:SemanticUnit)
      WHERE u.adpa_entity_type IS NOT NULL AND u.adpa_id IS NOT NULL
      RETURN toString(u.adpa_entity_type) AS entityType, toString(u.adpa_id) AS adpaId
      ORDER BY toString(u.adpa_entity_type), toString(u.adpa_id)
      SKIP toInteger($skip)
      LIMIT toInteger($limit)
    `,
    { skip, limit }
  )

  return result.records
    .map((record) => ({
      entityType: record.get("entityType"),
      adpaId: record.get("adpaId"),
    }))
    .filter(
      (entry): entry is { entityType: string; adpaId: string } =>
        typeof entry.entityType === "string" &&
        typeof entry.adpaId === "string" &&
        entry.entityType.length > 0 &&
        entry.adpaId.length > 0
    )
}

async function deleteSemanticUnitsByIds(
  session: NeoSession,
  units: Array<{ entityType: string; adpaId: string }>
): Promise<number> {
  if (!units.length) return 0
  const result = await session.run(
    `
      UNWIND $units AS u
      MATCH (n:SemanticUnit {adpa_entity_type: u.entityType, adpa_id: u.adpaId})
      WITH collect(n) AS nodes
      WITH nodes, size(nodes) AS deleted
      FOREACH (node IN nodes | DETACH DELETE node)
      RETURN deleted
    `,
    { units }
  )
  return toNumber(result.records[0]?.get("deleted"))
}

export async function runGkgFullReconciliation(
  pool: Pool,
  driver: Driver,
  database: string,
  options?: { cleanup?: boolean; batchSize?: number }
): Promise<FullReconcileReport> {
  const cleanup = options?.cleanup === true
  const batchSize = normalizeBatchSize(options?.batchSize)
  const session = driver.session({ database })

  const report: FullReconcileReport = {
    scanned: {
      batchSize,
      projects: 0,
      documents: 0,
      templates: 0,
      tasks: 0,
      semanticUnits: 0,
    },
    staleCounts: {
      projects: 0,
      documents: 0,
      templates: 0,
      tasks: 0,
      semanticUnits: 0,
    },
    staleSamples: {
      projects: [],
      documents: [],
      templates: [],
      tasks: [],
      semanticUnits: [],
    },
    staleEdges: {
      documentBelongsToMismatches: { count: 0, sample: [] },
      taskBelongsToMismatches: { count: 0, sample: [] },
      semanticUnitBelongsToMismatches: { count: 0, sample: [] },
      semanticUnitExtractedFromMismatches: { count: 0, sample: [] },
    },
    unknownSemanticUnitEntityTypes: [],
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

  try {
    const nodeTypeConfig: Array<{
      label: NodeLabel
      table: string
      scannedKey: "projects" | "documents" | "templates" | "tasks"
      staleKey: "projects" | "documents" | "templates" | "tasks"
      deletedKey: "projects" | "documents" | "templates" | "tasks"
    }> = [
      { label: "Project", table: "projects", scannedKey: "projects", staleKey: "projects", deletedKey: "projects" },
      { label: "Document", table: "documents", scannedKey: "documents", staleKey: "documents", deletedKey: "documents" },
      { label: "Template", table: "templates", scannedKey: "templates", staleKey: "templates", deletedKey: "templates" },
      { label: "Task", table: "project_tasks", scannedKey: "tasks", staleKey: "tasks", deletedKey: "tasks" },
    ]

    for (const cfg of nodeTypeConfig) {
      let skip = 0
      for (;;) {
        const ids = await fetchNodeBatch(session, cfg.label, skip, batchSize)
        if (ids.length === 0) break

        report.scanned[cfg.scannedKey] += ids.length
        const existing = await fetchExistingIds(pool, cfg.table, ids)
        const staleIds = ids.filter((id) => !existing.has(id))

        report.staleCounts[cfg.staleKey] += staleIds.length
        for (const staleId of staleIds) {
          pushSample(report.staleSamples[cfg.staleKey], staleId)
        }

        if (cleanup && staleIds.length > 0) {
          report.cleanup.deletedNodes[cfg.deletedKey] += await deleteNodesByIds(
            session,
            cfg.label,
            staleIds
          )
        }

        skip += ids.length
      }
    }

    let unitSkip = 0
    const unknownTypeSet = new Set<string>()

    for (;;) {
      const units = await fetchSemanticUnitBatch(session, unitSkip, batchSize)
      if (units.length === 0) break

      report.scanned.semanticUnits += units.length
      const byType = new Map<string, string[]>()
      for (const unit of units) {
        const ids = byType.get(unit.entityType) ?? []
        ids.push(unit.adpaId)
        byType.set(unit.entityType, ids)
      }

      const staleBatchUnits: Array<{ entityType: string; adpaId: string }> = []

      for (const [entityType, adpaIds] of byType.entries()) {
        const tableName = ENTITY_TO_TABLE.get(entityType)
        if (!tableName) {
          unknownTypeSet.add(entityType)
          continue
        }

        const existing = await fetchExistingIds(pool, tableName, adpaIds)
        for (const adpaId of adpaIds) {
          if (!existing.has(adpaId)) {
            report.staleCounts.semanticUnits += 1
            const stale = { entityType, adpaId }
            staleBatchUnits.push(stale)
            pushSample(report.staleSamples.semanticUnits, stale)
          }
        }
      }

      if (cleanup && staleBatchUnits.length > 0) {
        report.cleanup.deletedNodes.semanticUnits += await deleteSemanticUnitsByIds(
          session,
          staleBatchUnits
        )
      }

      unitSkip += units.length
    }

    report.unknownSemanticUnitEntityTypes = Array.from(unknownTypeSet).sort()

    const edgeCountQueries = {
      documentBelongsTo: `
        MATCH (d:Document)-[r:BELONGS_TO]->(p:Project)
        WHERE d.project_id IS NOT NULL AND p.adpa_id <> d.project_id
        RETURN count(r) AS count
      `,
      taskBelongsTo: `
        MATCH (t:Task)-[r:BELONGS_TO]->(p:Project)
        WHERE t.project_id IS NOT NULL AND p.adpa_id <> t.project_id
        RETURN count(r) AS count
      `,
      unitBelongsTo: `
        MATCH (u:SemanticUnit)-[r:BELONGS_TO]->(p:Project)
        WHERE u.project_id IS NOT NULL AND p.adpa_id <> u.project_id
        RETURN count(r) AS count
      `,
      unitExtractedFrom: `
        MATCH (u:SemanticUnit)-[r:EXTRACTED_FROM]->(d:Document)
        WHERE u.document_id IS NOT NULL AND d.adpa_id <> u.document_id
        RETURN count(r) AS count
      `,
    } as const

    const [docCount, taskCount, unitBelongsCount, unitExtractedCount] = await Promise.all([
      session.run(edgeCountQueries.documentBelongsTo),
      session.run(edgeCountQueries.taskBelongsTo),
      session.run(edgeCountQueries.unitBelongsTo),
      session.run(edgeCountQueries.unitExtractedFrom),
    ])

    report.staleEdges.documentBelongsToMismatches.count = toNumber(docCount.records[0]?.get("count"))
    report.staleEdges.taskBelongsToMismatches.count = toNumber(taskCount.records[0]?.get("count"))
    report.staleEdges.semanticUnitBelongsToMismatches.count = toNumber(unitBelongsCount.records[0]?.get("count"))
    report.staleEdges.semanticUnitExtractedFromMismatches.count = toNumber(unitExtractedCount.records[0]?.get("count"))

    const [docSample, taskSample, unitBelongsSample, unitExtractedSample] = await Promise.all([
      session.run(
        `
          MATCH (d:Document)-[:BELONGS_TO]->(p:Project)
          WHERE d.project_id IS NOT NULL AND p.adpa_id <> d.project_id
          RETURN toString(d.adpa_id) AS documentId,
                 toString(d.project_id) AS expectedProjectId,
                 toString(p.adpa_id) AS actualProjectId
          LIMIT toInteger($limit)
        `,
        { limit: SAMPLE_LIMIT }
      ),
      session.run(
        `
          MATCH (t:Task)-[:BELONGS_TO]->(p:Project)
          WHERE t.project_id IS NOT NULL AND p.adpa_id <> t.project_id
          RETURN toString(t.adpa_id) AS taskId,
                 toString(t.project_id) AS expectedProjectId,
                 toString(p.adpa_id) AS actualProjectId
          LIMIT toInteger($limit)
        `,
        { limit: SAMPLE_LIMIT }
      ),
      session.run(
        `
          MATCH (u:SemanticUnit)-[:BELONGS_TO]->(p:Project)
          WHERE u.project_id IS NOT NULL AND p.adpa_id <> u.project_id
          RETURN toString(u.adpa_entity_type) AS entityType,
                 toString(u.adpa_id) AS adpaId,
                 toString(u.project_id) AS expectedProjectId,
                 toString(p.adpa_id) AS actualProjectId
          LIMIT toInteger($limit)
        `,
        { limit: SAMPLE_LIMIT }
      ),
      session.run(
        `
          MATCH (u:SemanticUnit)-[:EXTRACTED_FROM]->(d:Document)
          WHERE u.document_id IS NOT NULL AND d.adpa_id <> u.document_id
          RETURN toString(u.adpa_entity_type) AS entityType,
                 toString(u.adpa_id) AS adpaId,
                 toString(u.document_id) AS expectedDocumentId,
                 toString(d.adpa_id) AS actualDocumentId
          LIMIT toInteger($limit)
        `,
        { limit: SAMPLE_LIMIT }
      ),
    ])

    report.staleEdges.documentBelongsToMismatches.sample = docSample.records.map((record) => ({
      documentId: String(record.get("documentId") ?? ""),
      expectedProjectId: String(record.get("expectedProjectId") ?? ""),
      actualProjectId: String(record.get("actualProjectId") ?? ""),
    }))

    report.staleEdges.taskBelongsToMismatches.sample = taskSample.records.map((record) => ({
      taskId: String(record.get("taskId") ?? ""),
      expectedProjectId: String(record.get("expectedProjectId") ?? ""),
      actualProjectId: String(record.get("actualProjectId") ?? ""),
    }))

    report.staleEdges.semanticUnitBelongsToMismatches.sample = unitBelongsSample.records.map((record) => ({
      entityType: String(record.get("entityType") ?? ""),
      adpaId: String(record.get("adpaId") ?? ""),
      expectedProjectId: String(record.get("expectedProjectId") ?? ""),
      actualProjectId: String(record.get("actualProjectId") ?? ""),
    }))

    report.staleEdges.semanticUnitExtractedFromMismatches.sample = unitExtractedSample.records.map(
      (record) => ({
        entityType: String(record.get("entityType") ?? ""),
        adpaId: String(record.get("adpaId") ?? ""),
        expectedDocumentId: String(record.get("expectedDocumentId") ?? ""),
        actualDocumentId: String(record.get("actualDocumentId") ?? ""),
      })
    )

    if (cleanup) {
      const [deleteDocEdges, deleteTaskEdges, deleteUnitBelongsEdges, deleteUnitExtractedEdges] =
        await Promise.all([
          session.run(
            `
              MATCH (d:Document)-[r:BELONGS_TO]->(p:Project)
              WHERE d.project_id IS NOT NULL AND p.adpa_id <> d.project_id
              WITH collect(r) AS rels
              WITH rels, size(rels) AS deleted
              FOREACH (rel IN rels | DELETE rel)
              RETURN deleted
            `
          ),
          session.run(
            `
              MATCH (t:Task)-[r:BELONGS_TO]->(p:Project)
              WHERE t.project_id IS NOT NULL AND p.adpa_id <> t.project_id
              WITH collect(r) AS rels
              WITH rels, size(rels) AS deleted
              FOREACH (rel IN rels | DELETE rel)
              RETURN deleted
            `
          ),
          session.run(
            `
              MATCH (u:SemanticUnit)-[r:BELONGS_TO]->(p:Project)
              WHERE u.project_id IS NOT NULL AND p.adpa_id <> u.project_id
              WITH collect(r) AS rels
              WITH rels, size(rels) AS deleted
              FOREACH (rel IN rels | DELETE rel)
              RETURN deleted
            `
          ),
          session.run(
            `
              MATCH (u:SemanticUnit)-[r:EXTRACTED_FROM]->(d:Document)
              WHERE u.document_id IS NOT NULL AND d.adpa_id <> u.document_id
              WITH collect(r) AS rels
              WITH rels, size(rels) AS deleted
              FOREACH (rel IN rels | DELETE rel)
              RETURN deleted
            `
          ),
        ])

      report.cleanup.deletedEdges.documentBelongsTo = toNumber(deleteDocEdges.records[0]?.get("deleted"))
      report.cleanup.deletedEdges.taskBelongsTo = toNumber(deleteTaskEdges.records[0]?.get("deleted"))
      report.cleanup.deletedEdges.semanticUnitBelongsTo = toNumber(
        deleteUnitBelongsEdges.records[0]?.get("deleted")
      )
      report.cleanup.deletedEdges.semanticUnitExtractedFrom = toNumber(
        deleteUnitExtractedEdges.records[0]?.get("deleted")
      )
    }

    return report
  } finally {
    await session.close()
  }
}
