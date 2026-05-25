/**
 * Audit source_document_id coverage and sync signals for projects with extracted entities.
 * Usage: cd server && npx tsx scripts/audit-entity-traceability.ts [projectId]
 */
import dotenv from "dotenv"
import { connectDatabase, getDatabasePool } from "../src/database/connection"

if (process.env.NODE_ENV !== "production") {
  dotenv.config()
}

const ENTITY_TABLES = [
  "requirements",
  "risks",
  "stakeholders",
  "milestones",
  "constraints",
] as const

async function columnExists(table: string, column: string): Promise<boolean> {
  const pool = getDatabasePool()
  const r = await pool.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
    [table, column]
  )
  return (r.rowCount ?? 0) > 0
}

async function tableStats(projectId: string, table: string) {
  const pool = getDatabasePool()
  const hasSourceDoc = await columnExists(table, "source_document_id")
  const hasSnippet = await columnExists(table, "source_snippet")
  const hasTextStart = await columnExists(table, "source_text_start")

  if (!hasSourceDoc) {
    return { table, total: 0, skip: "no source_document_id column" }
  }

  const extraCols = [
    hasSnippet ? "COUNT(*) FILTER (WHERE source_snippet IS NOT NULL AND TRIM(source_snippet) <> '') AS with_snippet" : null,
    hasTextStart ? "COUNT(*) FILTER (WHERE source_text_start IS NOT NULL) AS with_text_span" : null,
  ]
    .filter(Boolean)
    .join(",\n      ")

  const sql = `
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE source_document_id IS NOT NULL)::int AS with_source_doc,
      COUNT(*) FILTER (
        WHERE source_document_id IS NOT NULL
          AND EXISTS (SELECT 1 FROM documents d WHERE d.id = source_document_id)
      )::int AS with_valid_fk
      ${extraCols ? `,\n      ${extraCols}` : ""}
    FROM "${table}"
    WHERE project_id = $1
  `
  const r = await pool.query(sql, [projectId])
  const row = r.rows[0] as Record<string, number | string>
  return { table, ...row }
}

async function findProjectsByRequirementCount(target?: number) {
  const pool = getDatabasePool()
  const r = await pool.query(`
    SELECT p.id, p.name, COUNT(r.id)::int AS req_count
    FROM projects p
    LEFT JOIN requirements r ON r.project_id = p.id
    GROUP BY p.id, p.name
    HAVING COUNT(r.id) > 0
    ORDER BY COUNT(r.id) DESC
    LIMIT 15
  `)
  const rows = r.rows as { id: string; name: string; req_count: number }[]
  if (target != null) {
    const exact = rows.find((x) => x.req_count === target)
    if (exact) return exact.id
    const close = rows.find((x) => Math.abs(x.req_count - target) <= 5)
    if (close) return close.id
  }
  return rows[0]?.id ?? null
}

async function gkgStatus(projectId: string) {
  const pool = getDatabasePool()
  const exists = await pool.query(`
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'semantic_processing_status'
  `)
  if ((exists.rowCount ?? 0) === 0) {
    return { available: false as const }
  }

  const r = await pool.query(
    `
    SELECT
      state,
      COUNT(*)::int AS doc_count,
      MAX(gkg_sync_completed_at) AS last_gkg_sync,
      MAX(gkg_sync_started_at) AS last_gkg_started
    FROM semantic_processing_status
    WHERE project_id = $1
    GROUP BY state
    ORDER BY doc_count DESC
    `,
    [projectId]
  )
  const summary = await pool.query(
    `
    SELECT
      COUNT(*) FILTER (WHERE gkg_sync_completed_at IS NOT NULL)::int AS docs_synced_gkg,
      COUNT(*)::int AS total_rows
    FROM semantic_processing_status
    WHERE project_id = $1
    `,
    [projectId]
  )
  return {
    available: true as const,
    byState: r.rows,
    summary: summary.rows[0],
  }
}

async function pineconeIntegration() {
  const pool = getDatabasePool()
  const r = await pool.query(`
    SELECT id, name, type, is_active, last_sync, sync_status, configuration
    FROM integrations
    WHERE type ILIKE '%pinecone%' OR name ILIKE '%pinecone%'
    ORDER BY updated_at DESC NULLS LAST
    LIMIT 5
  `)
  return r.rows
}

async function documentCount(projectId: string) {
  const pool = getDatabasePool()
  const r = await pool.query(
    `SELECT COUNT(*)::int AS n FROM documents WHERE project_id = $1`,
    [projectId]
  )
  return (r.rows[0] as { n: number }).n
}

async function main() {
  const argProjectId = process.argv[2]
  await connectDatabase()
  const pool = getDatabasePool()

  const projectId =
    argProjectId ?? (await findProjectsByRequirementCount(295))

  if (!projectId) {
    console.log(JSON.stringify({ error: "No projects with requirements found" }, null, 2))
    process.exit(1)
  }

  const proj = await pool.query(`SELECT id, name FROM projects WHERE id = $1`, [projectId])
  const projectName = (proj.rows[0] as { name?: string })?.name ?? "(unknown)"

  const topProjects = await pool.query(`
    SELECT p.id, p.name, COUNT(r.id)::int AS req_count
    FROM projects p
    JOIN requirements r ON r.project_id = p.id
    GROUP BY p.id, p.name
    ORDER BY COUNT(r.id) DESC
    LIMIT 10
  `)

  const stats: Record<string, unknown>[] = []
  for (const table of ENTITY_TABLES) {
    try {
      stats.push(await tableStats(projectId, table))
    } catch (e) {
      stats.push({ table, error: (e as Error).message })
    }
  }

  const gkg = await gkgStatus(projectId)
  const pinecone = await pineconeIntegration()
  const docs = await documentCount(projectId)

  const pct = (n: number, total: number) =>
    total === 0 ? "0%" : `${((n / total) * 100).toFixed(1)}%`

  const projectsWith295 = await pool.query(`
    SELECT p.id, p.name, COUNT(r.id)::int AS req_count
    FROM projects p
    JOIN requirements r ON r.project_id = p.id
    GROUP BY p.id, p.name
    HAVING COUNT(r.id) BETWEEN 290 AND 300
    ORDER BY COUNT(r.id)
  `)

  let pineconeIndexStats: Record<string, unknown> | null = null
  try {
    const { pineconeService } = await import("../src/services/pineconeService")
    const connected = await pineconeService.testConnection()
    if (connected) {
      const stats = await pineconeService.getIndexStats()
      pineconeIndexStats = {
        totalVectorCount: stats?.totalVectorCount,
        namespaces: stats?.namespaces ?? {},
      }
    }
  } catch (e) {
    pineconeIndexStats = { error: (e as Error).message }
  }

  const report = {
    auditedAt: new Date().toISOString(),
    project: { id: projectId, name: projectName, documentCount: docs },
    projectsWith290To300Requirements: projectsWith295.rows,
    selectionNote: argProjectId
      ? "Explicit project ID from CLI"
      : "Auto-selected: project with ~295 requirements or highest requirement count",
    topProjectsByRequirements: topProjects.rows,
    entityTraceability: stats.map((s) => {
      if ("skip" in s || "error" in s) return s
      const total = Number(s.total ?? 0)
      const withDoc = Number(s.with_source_doc ?? 0)
      const validFk = Number(s.with_valid_fk ?? 0)
      return {
        ...s,
        pct_with_source_document_id: pct(withDoc, total),
        pct_valid_document_fk: pct(validFk, total),
      }
    }),
    gkg,
    pineconeIntegrations: pinecone.map((row: Record<string, unknown>) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      is_active: row.is_active,
      last_sync: row.last_sync,
      sync_status: row.sync_status,
      indexName:
        typeof row.configuration === "object" && row.configuration
          ? (row.configuration as Record<string, unknown>).indexName ??
            (row.configuration as Record<string, unknown>).index_name
          : undefined,
    })),
    pineconeIndexStats,
    env: {
      PINECONE_API_KEY: Boolean(process.env.PINECONE_API_KEY),
      PINECONE_INDEX_NAME: process.env.PINECONE_INDEX_NAME ?? null,
      NEO4J_URI: Boolean(process.env.NEO4J_URI || process.env.NEO4J_URL),
    },
  }

  console.log(JSON.stringify(report, null, 2))
  await pool.end()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
