/**
 * Pinecone integration analytics + sync (Integrations UI).
 * Mounted at /api/integrations — paths must be registered before generic /:id CRUD
 * if those ever broaden to wildcards.
 */

import { Router, Request, Response } from "express"
import { authenticateToken, requirePermission } from "../middleware/auth"
import { pool } from "../database/connection"
import { logger } from "../utils/logger"
import { PineconeService, pineconeService, normalizePineconeHost } from "../services/pineconeService"

const router = Router()

type IntegrationRow = {
  id: string
  type: string
  configuration: Record<string, unknown> | null
  credentials_encrypted: string | null
}

function parseIntegrationConfig(raw: unknown): Record<string, unknown> {
  if (!raw) return {}
  if (typeof raw === "object" && !Array.isArray(raw)) return raw as Record<string, unknown>
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as Record<string, unknown>
    } catch {
      return {}
    }
  }
  return {}
}

function parseCredentials(raw: string | null): Record<string, unknown> {
  if (!raw) return {}
  try {
    const decoded = Buffer.from(raw, "base64").toString("utf-8")
    return JSON.parse(decoded) as Record<string, unknown>
  } catch {
    return {}
  }
}

function resolvePineconeService(integration: IntegrationRow): PineconeService {
  const config = parseIntegrationConfig(integration.configuration)
  const credentials = parseCredentials(integration.credentials_encrypted)

  const apiKey =
    (typeof credentials.apiKey === "string" && credentials.apiKey) ||
    (typeof credentials.api_key === "string" && credentials.api_key) ||
    process.env.PINECONE_API_KEY

  const indexName =
    (typeof config.indexName === "string" && config.indexName) ||
    (typeof config.index_name === "string" && config.index_name) ||
    process.env.PINECONE_INDEX_NAME

  const indexHost =
    normalizePineconeHost(typeof config.host === "string" ? config.host : undefined) ||
    normalizePineconeHost(typeof config.indexHost === "string" ? config.indexHost : undefined) ||
    normalizePineconeHost(process.env.PINECONE_INDEX_HOST)

  if (!apiKey) {
    return pineconeService
  }

  return new PineconeService({
    apiKey,
    indexName: indexName || undefined,
    indexHost: indexHost || undefined,
  })
}

async function loadIntegration(integrationId: string): Promise<IntegrationRow | null> {
  const result = await pool.query(
    `SELECT id, type, configuration, credentials_encrypted FROM integrations WHERE id = $1`,
    [integrationId]
  )
  return (result.rows[0] as IntegrationRow | undefined) ?? null
}

function normalizeNamespaces(
  namespaces: Record<string, { recordCount?: number; vectorCount?: number }> | undefined
): Record<string, { vectorCount: number }> {
  const out: Record<string, { vectorCount: number }> = {}
  if (!namespaces) return out
  for (const [key, data] of Object.entries(namespaces)) {
    const count = data?.recordCount ?? data?.vectorCount ?? 0
    out[key] = { vectorCount: count }
  }
  return out
}

/**
 * GET /api/integrations/:integrationId/pinecone/stats
 */
router.get(
  "/:integrationId/pinecone/stats",
  authenticateToken,
  requirePermission("integrations.read"),
  async (req: Request, res: Response) => {
    try {
      const { integrationId } = req.params
      const integration = await loadIntegration(integrationId)

      if (!integration) {
        return res.status(404).json({ error: "Integration not found" })
      }
      if (integration.type !== "pinecone") {
        return res.status(400).json({ error: "Integration is not a Pinecone integration" })
      }

      const service = resolvePineconeService(integration)
      const config = parseIntegrationConfig(integration.configuration)

      const connected = await service.testConnection()
      if (!connected) {
        return res.status(503).json({
          error: "Pinecone connection failed",
          indexName: config.indexName ?? process.env.PINECONE_INDEX_NAME ?? null,
          environment: config.environment ?? process.env.PINECONE_ENVIRONMENT ?? null,
        })
      }

      const indexStats = await service.getIndexStats()
      if (!indexStats) {
        return res.status(503).json({ error: "Failed to read Pinecone index statistics" })
      }

      return res.json({
        indexStats: {
          totalVectorCount: indexStats.totalVectorCount ?? 0,
          dimensionCount: indexStats.dimensionCount ?? 1024,
          indexFullness: indexStats.indexFullness ?? 0,
          namespaces: normalizeNamespaces(indexStats.namespaces),
        },
        indexName:
          (typeof config.indexName === "string" && config.indexName) ||
          process.env.PINECONE_INDEX_NAME ||
          "unknown",
        environment:
          (typeof config.environment === "string" && config.environment) ||
          process.env.PINECONE_ENVIRONMENT ||
          "unknown",
      })
    } catch (error) {
      logger.error("Pinecone integration stats failed", {
        error: error instanceof Error ? error.message : String(error),
      })
      return res.status(500).json({ error: "Internal server error" })
    }
  }
)

/**
 * POST /api/integrations/:integrationId/pinecone/search
 */
router.post(
  "/:integrationId/pinecone/search",
  authenticateToken,
  requirePermission("integrations.sync"),
  async (req: Request, res: Response) => {
    try {
      const { integrationId } = req.params
      const { query, namespace, topK } = req.body as {
        query?: string
        namespace?: string
        topK?: number
      }

      if (!query || typeof query !== "string" || !query.trim()) {
        return res.status(400).json({ error: "query is required" })
      }

      const integration = await loadIntegration(integrationId)
      if (!integration) {
        return res.status(404).json({ error: "Integration not found" })
      }
      if (integration.type !== "pinecone") {
        return res.status(400).json({ error: "Integration is not a Pinecone integration" })
      }

      const service = resolvePineconeService(integration)
      const ns = typeof namespace === "string" && namespace.length > 0 ? namespace : undefined
      const matches = await service.search(query.trim(), topK ?? 5, undefined, ns)

      return res.json({ matches })
    } catch (error) {
      logger.error("Pinecone integration search failed", {
        error: error instanceof Error ? error.message : String(error),
      })
      return res.status(500).json({ error: "Search failed" })
    }
  }
)

/**
 * POST /api/integrations/:integrationId/sync
 * Pinecone: bulk upsert projects/documents/chunks from Postgres + Mongo.
 */
router.post(
  "/:integrationId/sync",
  authenticateToken,
  requirePermission("integrations.sync"),
  async (req: Request, res: Response) => {
    try {
      const { integrationId } = req.params
      const { projectId } = (req.body as { projectId?: string }) ?? {}

      const integration = await loadIntegration(integrationId)
      if (!integration) {
        return res.status(404).json({ error: "Integration not found" })
      }

      if (integration.type !== "pinecone") {
        return res.status(400).json({
          error: `Sync for integration type "${integration.type}" is not implemented on this endpoint`,
        })
      }

      const service = resolvePineconeService(integration)
      const result = await service.syncAll(projectId)

      if (integration.id) {
        await pool.query(
          `UPDATE integrations SET last_sync = CURRENT_TIMESTAMP, sync_status = $2 WHERE id = $1`,
          [integration.id, result.success ? "success" : "error"]
        )
      }

      return res.json(result)
    } catch (error) {
      logger.error("Pinecone integration sync failed", {
        error: error instanceof Error ? error.message : String(error),
      })
      return res.status(500).json({
        success: false,
        details: { error: error instanceof Error ? error.message : String(error) },
      })
    }
  }
)

export default router
