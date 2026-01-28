/**
 * GKG (Governance Knowledge Graph) sync API.
 * On-demand trigger for bootstrap, project sync, or document sync.
 * See docs/07-architecture/GKG_INGESTION_DESIGN.md §9.
 */

import express from "express"
import { authenticateToken, requirePermission } from "../middleware/auth"
import { isNeo4jConfigured } from "../utils/neo4j"
import { addJob } from "../services/queueService"
import { logger } from "../utils/logger"
import { v4 as uuidV4 } from "uuid"

const router = express.Router()

/**
 * POST /api/gkg/sync
 * Enqueue GKG sync job(s). Body: { projectId?, documentId?, bootstrap? }
 * Returns { jobId?, status } when a job is enqueued.
 */
router.post(
  "/sync",
  authenticateToken,
  requirePermission("projects.view"),
  async (req, res) => {
    try {
      if (!isNeo4jConfigured()) {
        return res.status(503).json({
          status: "unavailable",
          error: "Neo4j is not configured; set NEO4J_URI to enable GKG sync.",
        })
      }
      const { projectId, documentId, bootstrap } = (req.body as { projectId?: string; documentId?: string; bootstrap?: boolean }) ?? {}
      if (bootstrap) {
        const jobId = uuidV4()
        await addJob("gkg-bootstrap", { jobId }, { jobId, attempts: 2, backoff: { type: "exponential", delay: 5000 } })
        logger.info("[GKG] Enqueued gkg-bootstrap", { jobId })
        return res.json({ jobId, status: "enqueued", type: "gkg-bootstrap" })
      }
      if (projectId) {
        const jobId = uuidV4()
        await addJob("gkg-sync-project", { jobId, projectId }, { jobId, attempts: 2, backoff: { type: "exponential", delay: 5000 } })
        logger.info("[GKG] Enqueued gkg-sync-project", { jobId, projectId })
        return res.json({ jobId, status: "enqueued", type: "gkg-sync-project", projectId })
      }
      if (documentId) {
        const jobId = uuidV4()
        await addJob("gkg-sync-document", { jobId, documentId }, { jobId, attempts: 2, backoff: { type: "exponential", delay: 5000 } })
        logger.info("[GKG] Enqueued gkg-sync-document", { jobId, documentId })
        return res.json({ jobId, status: "enqueued", type: "gkg-sync-document", documentId })
      }
      return res.status(400).json({
        status: "bad_request",
        error: "Provide one of: bootstrap, projectId, documentId",
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      logger.error("[GKG] Sync enqueue failed", { error: msg })
      res.status(500).json({ status: "error", error: msg })
    }
  }
)

export default router
