/**
 * Neo4j integration analytics + search (Integrations UI).
 * Mounted at /api/integrations before the generic integrations CRUD router.
 */

import { Router, Request, Response } from "express"
import { authenticateToken, requirePermission } from "../middleware/auth"
import { pool } from "../database/connection"
import { getNeo4jDatabase, getNeo4jDriver, isNeo4jConfigured } from "../utils/neo4j"
import { logger } from "../utils/logger"

const router = Router()

type IntegrationRow = {
  id: string
  type: string
}

const SEARCHABLE_LABELS = [
  "Program",
  "Project",
  "Document",
  "Template",
  "Task",
  "SemanticUnit",
]

const STOP_WORDS = new Set([
  "and",
  "are",
  "for",
  "from",
  "the",
  "this",
  "that",
  "with",
])

async function loadIntegration(integrationId: string): Promise<IntegrationRow | null> {
  const result = await pool.query(
    `SELECT id, type FROM integrations WHERE id = $1`,
    [integrationId]
  )
  return (result.rows[0] as IntegrationRow | undefined) ?? null
}

function toNumber(value: unknown): number {
  if (value && typeof (value as { toNumber?: () => number }).toNumber === "function") {
    return (value as { toNumber: () => number }).toNumber()
  }
  return Number(value ?? 0)
}

function toPlainValue(value: unknown): unknown {
  if (value == null) return value
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value
  if (value && typeof (value as { toNumber?: () => number }).toNumber === "function") {
    return (value as { toNumber: () => number }).toNumber()
  }
  if (Array.isArray(value)) return value.map(toPlainValue)
  if (typeof value === "object") {
    const out: Record<string, unknown> = {}
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      out[key] = toPlainValue(nested)
    }
    return out
  }
  return String(value)
}

function normalizeSearchTerms(query: string): string[] {
  return Array.from(
    new Set(
      query
        .toLowerCase()
        .match(/[a-z0-9_-]{3,}/g)
        ?.filter((term) => !STOP_WORDS.has(term)) ?? []
    )
  ).slice(0, 8)
}

async function assertNeo4jIntegration(integrationId: string, res: Response): Promise<boolean> {
  const integration = await loadIntegration(integrationId)
  if (!integration) {
    res.status(404).json({ success: false, message: "Integration not found" })
    return false
  }
  if (integration.type !== "neo4j") {
    res.status(400).json({ success: false, message: "Integration is not a Neo4j integration" })
    return false
  }
  if (!isNeo4jConfigured()) {
    res.status(503).json({ success: false, message: "Neo4j is not configured" })
    return false
  }
  if (!getNeo4jDriver()) {
    res.status(503).json({ success: false, message: "Neo4j driver is unavailable" })
    return false
  }
  return true
}

router.get(
  "/:integrationId/neo4j/stats",
  authenticateToken,
  requirePermission("integrations.read"),
  async (req: Request, res: Response) => {
    try {
      const { integrationId } = req.params
      if (!(await assertNeo4jIntegration(integrationId, res))) return

      const driver = getNeo4jDriver()
      const session = driver!.session({ database: getNeo4jDatabase() })
      try {
        const nodeResult = await session.run(`MATCH (n) RETURN count(n) AS totalNodes`)
        const relResult = await session.run(`MATCH ()-[r]->() RETURN count(r) AS totalRelationships`)

        return res.json({
          totalNodes: toNumber(nodeResult.records[0]?.get("totalNodes")),
          totalRelationships: toNumber(relResult.records[0]?.get("totalRelationships")),
          status: "active",
          database: getNeo4jDatabase(),
        })
      } finally {
        await session.close()
      }
    } catch (error) {
      logger.error("Neo4j integration stats failed", {
        error: error instanceof Error ? error.message : String(error),
      })
      return res.status(500).json({ success: false, message: "Neo4j stats failed" })
    }
  }
)

router.post(
  "/:integrationId/neo4j/search",
  authenticateToken,
  requirePermission("integrations.read"),
  async (req: Request, res: Response) => {
    try {
      const { integrationId } = req.params
      const { query, limit } = (req.body as { query?: string; limit?: number }) ?? {}

      if (!query || typeof query !== "string" || !query.trim()) {
        return res.status(400).json({ success: false, message: "query is required" })
      }
      if (!(await assertNeo4jIntegration(integrationId, res))) return

      const terms = normalizeSearchTerms(query)
      if (terms.length === 0) {
        return res.json({ success: true, matches: [] })
      }

      const driver = getNeo4jDriver()
      const session = driver!.session({ database: getNeo4jDatabase() })
      try {
        const result = await session.run(
          `
            MATCH (n)
            WHERE any(label IN labels(n) WHERE label IN $labels)
            WITH n,
                 toLower(
                   coalesce(toString(n.name), '') + ' ' +
                   coalesce(toString(n.title), '') + ' ' +
                   coalesce(toString(n.task_name), '') + ' ' +
                   coalesce(toString(n.summary), '') + ' ' +
                   coalesce(toString(n.adpa_id), '') + ' ' +
                   coalesce(toString(n.project_id), '') + ' ' +
                   coalesce(toString(n.template_type), '') + ' ' +
                   coalesce(toString(n.adpa_entity_type), '')
                 ) AS searchable
            WITH n, [term IN $terms WHERE searchable CONTAINS term] AS matchedTerms
            WITH n, size(matchedTerms) AS score
            WHERE score > 0
            RETURN id(n) AS id, labels(n) AS labels, properties(n) AS properties, score
            ORDER BY score DESC, id(n) ASC
            LIMIT toInteger($limit)
          `,
          {
            query: query.trim().toLowerCase(),
            terms,
            labels: SEARCHABLE_LABELS,
            limit: Math.min(Math.max(Number(limit) || 10, 1), 50),
          }
        )

        const matches = result.records.map((record) => ({
          id: toNumber(record.get("id")),
          labels: record.get("labels"),
          properties: toPlainValue(record.get("properties")) as Record<string, unknown>,
        }))

        return res.json({ success: true, matches })
      } finally {
        await session.close()
      }
    } catch (error) {
      logger.error("Neo4j integration search failed", {
        error: error instanceof Error ? error.message : String(error),
      })
      return res.status(500).json({ success: false, message: "Neo4j search failed" })
    }
  }
)

export default router
