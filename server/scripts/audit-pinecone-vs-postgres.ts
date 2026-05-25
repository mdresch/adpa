/**
 * Compare Pinecone index namespace counts vs Postgres entity row totals.
 * Usage: cd server && npx tsx scripts/audit-pinecone-vs-postgres.ts
 */
import dotenv from "dotenv"
import { connectDatabase, getDatabasePool } from "../src/database/connection"

dotenv.config()

const ENTITY_TABLES = [
  "requirements",
  "risks",
  "stakeholders",
  "milestones",
  "constraints",
  "success_criteria",
  "best_practices",
  "phases",
  "resources",
  "technologies",
  "quality_standards",
  "deliverables",
  "scope_items",
  "activities",
  "work_items",
  "opportunities",
  "risk_responses",
  "capacity_plans",
  "team_agreements",
  "development_approaches",
  "performance_measurements",
  "earned_value_metrics",
  "project_iterations",
] as const

async function main() {
  await connectDatabase()
  const pool = getDatabasePool()

  const perTable: { table: string; count: number }[] = []
  let postgresTotal = 0

  for (const table of ENTITY_TABLES) {
    try {
      const r = await pool.query(`SELECT COUNT(*)::int AS c FROM "${table}"`)
      const count = (r.rows[0] as { c: number }).c
      if (count > 0) perTable.push({ table, count })
      postgresTotal += count
    } catch {
      // table may not exist
    }
  }

  perTable.sort((a, b) => b.count - a.count)

  let pinecone: Record<string, unknown> | null = null
  try {
    const { pineconeService } = await import("../src/services/pineconeService")
    if (await pineconeService.testConnection()) {
      const stats = await pineconeService.getIndexStats()
      const ns = stats?.namespaces ?? {}
      const entitiesCount =
        (ns.entities as { recordCount?: number; vectorCount?: number })?.recordCount ??
        (ns.entities as { recordCount?: number; vectorCount?: number })?.vectorCount ??
        0
      pinecone = {
        totalVectorCount: stats?.totalVectorCount,
        namespaces: Object.fromEntries(
          Object.entries(ns).map(([k, v]) => [
            k,
            (v as { recordCount?: number; vectorCount?: number })?.recordCount ??
              (v as { recordCount?: number; vectorCount?: number })?.vectorCount ??
              0,
          ])
        ),
        entitiesNamespace: entitiesCount,
        pctOfPostgresRows:
          postgresTotal > 0
            ? `${((Number(entitiesCount) / postgresTotal) * 100).toFixed(1)}%`
            : "n/a",
      }
    }
  } catch (e) {
    pinecone = { error: (e as Error).message }
  }

  console.log(
    JSON.stringify(
      {
        auditedAt: new Date().toISOString(),
        postgres: {
          tablesWithRows: perTable.length,
          totalRowsSummed: postgresTotal,
          top10Tables: perTable.slice(0, 10),
        },
        pinecone,
        note: "Postgres total is sum of listed domain tables only; Pinecone entity sync uses a defined subset in pineconeEntitySync.ts (may differ slightly).",
      },
      null,
      2
    )
  )

  await pool.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
