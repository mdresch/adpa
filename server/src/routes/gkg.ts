/**
 * GKG (Governance Knowledge Graph) API.
 * - Sync: on-demand bootstrap, project sync, or document sync.
 * - Summary: simple dashboard-friendly overview of graph contents.
 * See docs/07-architecture/GKG_INGESTION_DESIGN.md §9.
 */

import express from "express"
import { authenticateToken, requirePermission } from "../middleware/auth"
import { getNeo4jDatabase, getNeo4jDriver, isNeo4jConfigured } from "../utils/neo4j"
import { addJob } from "../services/queueService"
import { getContextForStrategy } from "../services/gkg/gkgContextService"
import { runGkgReconciliation } from "../services/gkg/reconcile"
import { getDatabasePool } from "../database/connection"
import { logger } from "../utils/logger"
import { v4 as uuidV4 } from "uuid"
import type { GkgContextStrategy } from "../modules/documentTemplates/types"

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
        // Check for existing pending/processing sync job for this project
        const pool = getDatabasePool()
        const existingJob = await pool.query(
          "SELECT id FROM jobs WHERE type = 'gkg-sync-project' AND project_id = $1 AND status IN ('pending', 'processing') LIMIT 1",
          [projectId]
        )

        if (existingJob.rows.length > 0) {
          logger.info("[GKG] Sync job already in progress for project", { projectId, jobId: existingJob.rows[0].id })
          return res.json({ jobId: existingJob.rows[0].id, status: "already_enqueued", type: "gkg-sync-project", projectId })
        }

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

/**
 * POST /api/gkg/activate
 * Auto-create/activate Neo4j integration record for current environment,
 * then optionally enqueue bootstrap and project sync jobs.
 * Body: { projectId?: string, bootstrap?: boolean, syncProject?: boolean }
 */
router.post(
  "/activate",
  authenticateToken,
  requirePermission("projects.view"),
  async (req, res) => {
    try {
      if (!isNeo4jConfigured()) {
        return res.status(503).json({
          status: "unavailable",
          error: "Neo4j is not configured; set NEO4J_URI to enable activation.",
        })
      }

      const pool = getDatabasePool()
      const { projectId, bootstrap, syncProject } =
        (req.body as { projectId?: string; bootstrap?: boolean; syncProject?: boolean }) ?? {}

      const configPayload = {
        uri: process.env.NEO4J_URI || process.env.NEO4J_URL || "",
        database: getNeo4jDatabase(),
        source: "gkg-auto-activate",
      }

      const existing = await pool.query(
        `
        SELECT id
        FROM integrations
        WHERE type = 'neo4j'
        ORDER BY is_active DESC, updated_at DESC
        LIMIT 1
      `
      )

      let integrationId: string
      if (existing.rows.length > 0) {
        integrationId = existing.rows[0].id
        await pool.query(
          `
          UPDATE integrations
          SET is_active = true,
              name = COALESCE(name, 'Neo4j Graph Database'),
              configuration = COALESCE(configuration, '{}'::jsonb) || $2::jsonb,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
        `,
          [integrationId, JSON.stringify(configPayload)]
        )
      } else {
        integrationId = uuidV4()
        const credentialsEncrypted = Buffer.from(JSON.stringify({})).toString("base64")
        await pool.query(
          `
          INSERT INTO integrations (id, name, type, configuration, credentials_encrypted, is_active, created_by)
          VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7)
        `,
          [
            integrationId,
            "Neo4j Graph Database",
            "neo4j",
            JSON.stringify(configPayload),
            credentialsEncrypted,
            true,
            req.user?.id ?? null,
          ]
        )
      }

      const enqueuedJobs: Array<{ type: string; jobId: string }> = []

      if (bootstrap === true) {
        const bootstrapJobId = uuidV4()
        await addJob(
          "gkg-bootstrap",
          { jobId: bootstrapJobId },
          { jobId: bootstrapJobId, attempts: 2, backoff: { type: "exponential", delay: 5000 } }
        )
        enqueuedJobs.push({ type: "gkg-bootstrap", jobId: bootstrapJobId })
      }

      if (syncProject === true && projectId) {
        const syncJobId = uuidV4()
        await addJob(
          "gkg-sync-project",
          { jobId: syncJobId, projectId },
          { jobId: syncJobId, attempts: 2, backoff: { type: "exponential", delay: 5000 } }
        )
        enqueuedJobs.push({ type: "gkg-sync-project", jobId: syncJobId })
      }

      logger.info("[GKG] Activation complete", {
        integrationId,
        bootstrap: bootstrap === true,
        syncProject: syncProject === true,
        projectId,
        jobs: enqueuedJobs,
      })

      return res.json({
        status: "ok",
        integrationId,
        activated: true,
        enqueuedJobs,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      logger.error("[GKG] Activation failed", { error: msg })
      return res.status(500).json({ status: "error", error: msg })
    }
  }
)

/**
 * GET /api/gkg/summary
 * Lightweight Neo4j summary for dashboards.
 * Returns overall counts and top projects by SemanticUnit count.
 */
router.get(
  "/summary",
  authenticateToken,
  requirePermission("projects.view"),
  async (_req, res) => {
    if (!isNeo4jConfigured()) {
      return res.status(503).json({
        status: "unavailable",
        error: "Neo4j is not configured; set NEO4J_URI to enable GKG summary.",
      })
    }

    const driver = getNeo4jDriver()
    if (!driver) {
      return res.status(503).json({
        status: "unavailable",
        error: "Neo4j driver is unavailable (circuit open or not connected).",
      })
    }

    const database = getNeo4jDatabase()
    const session = driver.session({ database })

    try {
      // Run queries sequentially; Neo4j sessions do not support multiple concurrent
      // queries on the same session when a transaction is open.
      const overviewResult = await session.run(
        `
          OPTIONAL MATCH (g:Program)
          WITH count(DISTINCT g) AS programs
          OPTIONAL MATCH (p:Project)
          WITH programs, count(DISTINCT p) AS projects
          OPTIONAL MATCH (d:Document)
          WITH programs, projects, count(DISTINCT d) AS documents
          OPTIONAL MATCH (t:Task)
          WITH programs, projects, documents, count(DISTINCT t) AS tasks
          OPTIONAL MATCH (u:SemanticUnit)
          RETURN programs AS totalPrograms,
                 projects AS totalProjects,
                 documents AS totalDocuments,
                 tasks AS totalTasks,
                 count(DISTINCT u) AS totalUnits
        `
      )

      const projectsResult = await session.run(
        `
          // Top projects by SemanticUnit count
          MATCH (p:Project)<-[:BELONGS_TO]-(u:SemanticUnit)
          OPTIONAL MATCH (d:Document)-[:BELONGS_TO]->(p)
          RETURN
            p.adpa_id AS projectId,
            coalesce(p.name, p.adpa_id) AS name,
            count(DISTINCT u) AS unitCount,
            count(DISTINCT d) AS documentCount,
            collect(DISTINCT u.adpa_entity_type)[0..6] AS entityTypes
          ORDER BY unitCount DESC, name ASC
          LIMIT 20
        `
      )

      // Top documents by semantic unit count (best sources for LLM context)
      const topDocsResult = await session.run(
        `
          MATCH (d:Document)<-[:EXTRACTED_FROM]-(u:SemanticUnit)
          MATCH (d)-[:BELONGS_TO]->(p:Project)
          WITH d, p, count(DISTINCT u) AS unitCount
          RETURN
            d.adpa_id AS documentId,
            coalesce(d.title, d.adpa_id) AS title,
            p.adpa_id AS projectId,
            coalesce(p.name, p.adpa_id) AS projectName,
            unitCount
          ORDER BY unitCount DESC
          LIMIT 15
        `
      )

      // Entity type counts (what context types are available for LLM)
      const entityTypesResult = await session.run(
        `
          MATCH (u:SemanticUnit)
          RETURN u.adpa_entity_type AS entityType, count(*) AS count
          ORDER BY count DESC
        `
      )

      // Programs with project and task counts (for program-scoped context)
      const programsResult = await session.run(
        `
          MATCH (g:Program)
          OPTIONAL MATCH (p:Project)-[:BELONGS_TO]->(g)
          OPTIONAL MATCH (t:Task)-[:BELONGS_TO]->(p)
          RETURN
            g.adpa_id AS programId,
            coalesce(g.name, g.adpa_id) AS name,
            count(DISTINCT p) AS projectCount,
            count(DISTINCT t) AS taskCount
          ORDER BY projectCount DESC, name ASC
          LIMIT 20
        `
      )

      const overviewRecord = overviewResult.records[0]
      const totalPrograms = overviewRecord ? overviewRecord.get("totalPrograms").toNumber?.() ?? overviewRecord.get("totalPrograms") : 0
      const totalProjects = overviewRecord ? overviewRecord.get("totalProjects").toNumber?.() ?? overviewRecord.get("totalProjects") : 0
      const totalDocuments = overviewRecord ? overviewRecord.get("totalDocuments").toNumber?.() ?? overviewRecord.get("totalDocuments") : 0
      const totalTasks = overviewRecord ? overviewRecord.get("totalTasks").toNumber?.() ?? overviewRecord.get("totalTasks") : 0
      const totalUnits = overviewRecord ? overviewRecord.get("totalUnits").toNumber?.() ?? overviewRecord.get("totalUnits") : 0

      const topProjects = projectsResult.records.map((rec) => ({
        projectId: rec.get("projectId"),
        name: rec.get("name"),
        unitCount: rec.get("unitCount").toNumber?.() ?? rec.get("unitCount"),
        documentCount: rec.get("documentCount").toNumber?.() ?? rec.get("documentCount"),
        entityTypes: rec.get("entityTypes") || [],
      }))

      const topDocumentsForContext = topDocsResult.records.map((rec) => ({
        documentId: rec.get("documentId"),
        title: rec.get("title"),
        projectId: rec.get("projectId"),
        projectName: rec.get("projectName"),
        unitCount: rec.get("unitCount").toNumber?.() ?? rec.get("unitCount"),
      }))

      const entityTypeCounts = entityTypesResult.records.map((rec) => ({
        entityType: rec.get("entityType"),
        count: rec.get("count").toNumber?.() ?? rec.get("count"),
      }))

      const programsWithProjects = programsResult.records.map((rec) => ({
        programId: rec.get("programId"),
        name: rec.get("name"),
        projectCount: rec.get("projectCount").toNumber?.() ?? rec.get("projectCount"),
        taskCount: rec.get("taskCount").toNumber?.() ?? rec.get("taskCount"),
      }))

      return res.json({
        status: "ok",
        totalPrograms,
        totalProjects,
        totalDocuments,
        totalTasks,
        totalUnits,
        topProjects,
        topDocumentsForContext,
        entityTypeCounts,
        programsWithProjects,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      logger.error("[GKG] Summary query failed", { error: msg })
      return res.status(500).json({ status: "error", error: msg })
    } finally {
      await session.close()
    }
  }
)

/**
 * POST /api/gkg/reconcile
 * Dry-run drift report by default. Set cleanup=true to delete detected stale nodes/edges.
 * Body: { cleanup?: boolean, limitPerType?: number }
 */
router.post(
  "/reconcile",
  authenticateToken,
  requirePermission("projects.view"),
  async (req, res) => {
    if (!isNeo4jConfigured()) {
      return res.status(503).json({
        status: "unavailable",
        error: "Neo4j is not configured; set NEO4J_URI to enable GKG reconciliation.",
      })
    }

    const driver = getNeo4jDriver()
    if (!driver) {
      return res.status(503).json({
        status: "unavailable",
        error: "Neo4j driver is unavailable (circuit open or not connected).",
      })
    }

    const { cleanup, limitPerType } =
      (req.body as { cleanup?: boolean; limitPerType?: number }) ?? {}

    try {
      const database = getNeo4jDatabase()
      const pool = getDatabasePool()
      const report = await runGkgReconciliation(pool, driver, database, {
        cleanup: cleanup === true,
        limitPerType,
      })

      logger.info("[GKG] Reconciliation completed", {
        cleanup: cleanup === true,
        limitPerType: report.scanned.limitPerType,
        staleProjects: report.staleNodes.projects.length,
        staleDocuments: report.staleNodes.documents.length,
        staleTemplates: report.staleNodes.templates.length,
        staleTasks: report.staleNodes.tasks.length,
        staleSemanticUnits: report.staleNodes.semanticUnits.length,
      })

      return res.json({
        status: "ok",
        mode: cleanup === true ? "cleanup" : "dry_run",
        ...report,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      logger.error("[GKG] Reconciliation failed", {
        cleanup: cleanup === true,
        error: msg,
      })
      return res.status(500).json({ status: "error", error: msg })
    }
  }
)

/**
 * POST /api/gkg/reconcile/queue
 * Enqueue full GKG reconciliation for large graphs.
 * Body: { cleanup?: boolean, batchSize?: number }
 */
router.post(
  "/reconcile/queue",
  authenticateToken,
  requirePermission("projects.view"),
  async (req, res) => {
    try {
      if (!isNeo4jConfigured()) {
        return res.status(503).json({
          status: "unavailable",
          error: "Neo4j is not configured; set NEO4J_URI to enable GKG reconciliation.",
        })
      }

      const driver = getNeo4jDriver()
      if (!driver) {
        return res.status(503).json({
          status: "unavailable",
          error: "Neo4j driver is unavailable (circuit open or not connected).",
        })
      }

      const { cleanup, batchSize } =
        (req.body as { cleanup?: boolean; batchSize?: number }) ?? {}

      const jobId = uuidV4()
      await addJob(
        "gkg-reconcile",
        { jobId, cleanup: cleanup === true, batchSize },
        { jobId, attempts: 1, backoff: { type: "exponential", delay: 5000 } }
      )

      logger.info("[GKG] Enqueued gkg-reconcile", {
        jobId,
        cleanup: cleanup === true,
        batchSize,
      })

      return res.json({
        status: "enqueued",
        type: "gkg-reconcile",
        jobId,
        cleanup: cleanup === true,
        batchSize: typeof batchSize === "number" ? batchSize : undefined,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      logger.error("[GKG] Reconcile queue enqueue failed", { error: msg })
      return res.status(500).json({ status: "error", error: msg })
    }
  }
)

/**
 * GET /api/gkg/reconcile/recent
 * Return recent queued/full reconcile jobs with summary statistics.
 */
router.get(
  "/reconcile/recent",
  authenticateToken,
  requirePermission("projects.view"),
  async (req, res) => {
    try {
      const pool = getDatabasePool()
      const rawLimit = Number((req.query as { limit?: string })?.limit ?? 10)
      const limit = Number.isFinite(rawLimit)
        ? Math.max(1, Math.min(25, Math.floor(rawLimit)))
        : 10

      const recentResult = await pool.query(
        `
        SELECT
          id,
          status,
          created_at,
          queued_at,
          processing_started_at,
          completed_at,
          failed_at,
          error_message,
          data,
          result
        FROM jobs
        WHERE type = 'gkg-reconcile'
        ORDER BY COALESCE(completed_at, failed_at, processing_started_at, queued_at, created_at) DESC
        LIMIT $1
      `,
        [limit]
      )

      const rows = recentResult.rows || []

      const parseJsonSafe = (value: unknown): Record<string, unknown> => {
        if (!value) return {}
        if (typeof value === "object") return value as Record<string, unknown>
        if (typeof value === "string") {
          try {
            const parsed = JSON.parse(value)
            return typeof parsed === "object" && parsed !== null
              ? (parsed as Record<string, unknown>)
              : {}
          } catch {
            return {}
          }
        }
        return {}
      }

      const recent = rows.map((row) => {
        const data = parseJsonSafe(row.data)
        const result = parseJsonSafe(row.result)

        const startedAt = row.processing_started_at || row.queued_at || row.created_at
        const endedAt = row.completed_at || row.failed_at || null
        const durationMs = startedAt && endedAt
          ? Math.max(0, new Date(endedAt).getTime() - new Date(startedAt).getTime())
          : null

        return {
          jobId: row.id,
          status: row.status,
          cleanup: data?.cleanup === true,
          batchSize: typeof data?.batchSize === "number" ? data.batchSize : null,
          createdAt: row.created_at,
          startedAt,
          completedAt: row.completed_at,
          failedAt: row.failed_at,
          durationMs,
          errorMessage: row.error_message || null,
          staleCounts: result?.staleCounts || null,
          deletedNodes: (result?.cleanup as any)?.deletedNodes || null,
          deletedEdges: (result?.cleanup as any)?.deletedEdges || null,
        }
      })

      const summary = recent.reduce(
        (acc, item) => {
          acc.total += 1
          if (item.status === "completed") acc.completed += 1
          if (item.status === "failed") acc.failed += 1
          if (item.cleanup) acc.cleanupRuns += 1
          if (item.durationMs != null) {
            acc.durationSamples += 1
            acc.totalDurationMs += item.durationMs
          }
          if ((item.staleCounts as any)?.semanticUnits) {
            acc.totalStaleUnits += Number((item.staleCounts as any).semanticUnits) || 0
          }
          return acc
        },
        {
          total: 0,
          completed: 0,
          failed: 0,
          cleanupRuns: 0,
          durationSamples: 0,
          totalDurationMs: 0,
          totalStaleUnits: 0,
        }
      )

      return res.json({
        status: "ok",
        summary: {
          total: summary.total,
          completed: summary.completed,
          failed: summary.failed,
          cleanupRuns: summary.cleanupRuns,
          avgDurationMs:
            summary.durationSamples > 0
              ? Math.round(summary.totalDurationMs / summary.durationSamples)
              : null,
          totalStaleUnits: summary.totalStaleUnits,
        },
        recent,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      logger.error("[GKG] Recent reconcile stats failed", { error: msg })
      return res.status(500).json({ status: "error", error: msg })
    }
  }
)

/**
 * GET /api/gkg/template/:templateId
 * Returns documents generated by this template and entities (semantic units) extracted from those documents.
 */
router.get(
  "/template/:templateId",
  authenticateToken,
  requirePermission("projects.view"),
  async (req, res) => {
    if (!isNeo4jConfigured()) {
      return res.status(503).json({
        status: "unavailable",
        error: "Neo4j is not configured; set NEO4J_URI to enable GKG.",
      })
    }
    const templateId = (req.params as { templateId: string }).templateId
    if (!templateId) {
      return res.status(400).json({ status: "bad_request", error: "templateId required" })
    }
    const driver = getNeo4jDriver()
    if (!driver) {
      return res.status(503).json({
        status: "unavailable",
        error: "Neo4j driver is unavailable.",
      })
    }
    const database = getNeo4jDatabase()
    const session = driver.session({ database })
    try {
      const pool = getDatabasePool()
      
      // Phase 4: Fetch total extraction count from Postgres to show sync delta
      let totalExtractedEntities = 0
      try {
        const extractionCountResult = await pool.query(
          `SELECT get_all_entity_counts_for_template($1) as counts`,
          [templateId]
        )
        const extractionCounts = extractionCountResult.rows[0]?.counts || {}
        totalExtractedEntities = Object.values(extractionCounts as Record<string, number>).reduce((sum, count) => sum + count, 0)
      } catch (countError) {
        logger.warn(`[GKG-API] Failed to fetch Postgres entity counts for template ${templateId}, falling back to 0`, countError)
        // Fallback: use totalUnits from GKG if available, or 0. 
        // This prevents the whole route from failing with 500.
      }

      const generatedDocumentsResult = await pool.query(
        `
          SELECT COUNT(*)::int AS total_generated_documents
          FROM documents
          WHERE template_id = $1
            AND deleted_at IS NULL
        `,
        [templateId]
      )

      // Documents generated by this template (with project and unit count)
      const docsResult = await session.run(
        `
        MATCH (tpl:Template {adpa_id: $templateId})
        MATCH (d:Document)-[:GENERATED_FROM]->(tpl)
        OPTIONAL MATCH (d)-[:BELONGS_TO]->(p:Project)
        OPTIONAL MATCH (u:SemanticUnit)-[:EXTRACTED_FROM]->(d)
        WITH d, p, count(DISTINCT u) AS unitCount
        RETURN
          d.adpa_id AS documentId,
          coalesce(d.title, d.project_id) AS title,
          p.adpa_id AS projectId,
          coalesce(p.name, p.adpa_id) AS projectName,
          unitCount
        ORDER BY unitCount DESC
        `,
        { templateId }
      )
      // Entity type counts from documents generated by this template
      const entitiesResult = await session.run(
        `
        MATCH (tpl:Template {adpa_id: $templateId})
        MATCH (d:Document)-[:GENERATED_FROM]->(tpl)
        MATCH (u:SemanticUnit)-[:EXTRACTED_FROM]->(d)
        RETURN u.adpa_entity_type AS entityType, count(*) AS count
        ORDER BY count DESC
        `,
        { templateId }
      )
      const documents = docsResult.records.map((rec) => ({
        documentId: rec.get("documentId"),
        title: rec.get("title"),
        projectId: rec.get("projectId"),
        projectName: rec.get("projectName"),
        unitCount: (rec.get("unitCount") as { toNumber?: () => number })?.toNumber?.() ?? rec.get("unitCount") ?? 0,
      }))
      const entityTypeCounts = entitiesResult.records.map((rec) => ({
        entityType: rec.get("entityType"),
        count: (rec.get("count") as { toNumber?: () => number })?.toNumber?.() ?? rec.get("count") ?? 0,
      }))
      const totalDocuments = documents.length
      const totalGeneratedDocuments = generatedDocumentsResult.rows[0]?.total_generated_documents ?? totalDocuments
      const totalUnits = entityTypeCounts.reduce((sum, e) => sum + e.count, 0)
      return res.json({
        status: "ok",
        templateId,
        totalGeneratedDocuments,
        totalDocuments,
        unsyncedDocuments: Math.max(totalGeneratedDocuments - totalDocuments, 0),
        totalExtractedEntities,
        totalUnits,
        documents,
        entityTypeCounts,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      logger.error("[GKG] Template view failed", { templateId, error: msg })
      return res.status(500).json({ status: "error", error: msg })
    } finally {
      await session.close()
    }
  }
)

/**
 * POST /api/gkg/context
 * Fetch GKG context for document generation by strategy (for preview or pipeline).
 * Body: { projectId: string, strategy: GkgContextStrategy }
 */
router.post(
  "/context",
  authenticateToken,
  requirePermission("projects.view"),
  async (req, res) => {
    if (!isNeo4jConfigured()) {
      return res.status(503).json({
        status: "unavailable",
        error: "Neo4j is not configured; set NEO4J_URI to enable GKG context.",
      })
    }
    const { projectId, strategy } = (req.body as { projectId?: string; strategy?: GkgContextStrategy }) ?? {}
    if (!projectId || !strategy) {
      return res.status(400).json({
        status: "bad_request",
        error: "Provide projectId and strategy in the request body.",
      })
    }
    try {
      const result = await getContextForStrategy(projectId, strategy)
      return res.json({ status: "ok", ...result })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      logger.error("[GKG] Context fetch failed", { projectId, error: msg })
      return res.status(500).json({ status: "error", error: msg })
    }
  }
)

export default router
