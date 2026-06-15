import { StartupManager } from "./startupManager"
import { logger } from "../utils/logger"
import { pool } from "../database/connection"
import {
  getDependencyHealthStatus,
  initializeDependencyHealthTracking,
  updateDependencyHealth,
} from "../routes/health"
import { connectDatabase } from "../database/connection"

// Export the startupManager instance so other modules can access it.
export let startupManager: StartupManager;

/**
 * Background retry loop: keeps attempting to connect to the database
 * every `intervalMs` milliseconds until it succeeds, then calls
 * startupManager.forceReady() to open the readiness gate.
 *
 * This handles the case where the initial startup fails because
 * Supabase / PgBouncer is still waking from a paused state.
 */
function startBackgroundDbRetry(manager: StartupManager, intervalMs = 30_000): void {
  logger.warn(`[Bootstrap] DB not ready — starting background retry loop (every ${intervalMs / 1000}s)`)

  const attempt = async () => {
    try {
      logger.info('[Bootstrap] Background DB retry attempt...')
      const startTime = Date.now()
      await connectDatabase()
      const latency = Date.now() - startTime
      updateDependencyHealth("Database", "healthy", latency)
      logger.info('[Bootstrap] ✅ Background DB retry succeeded — opening readiness gate')
      manager.forceReady()
    } catch (err: any) {
      const message = err?.message || String(err)
      updateDependencyHealth("Database", "unhealthy", 0, message)
      logger.warn(`[Bootstrap] Background DB retry failed: ${message} — will retry in ${intervalMs / 1000}s`)
      setTimeout(attempt, intervalMs)
    }
  }

  setTimeout(attempt, intervalMs)
}

/**
 * Updated server startup function that uses the Startup Dependency Graph.
 * This replaces the old sequential initialization with parallel dependency initialization.
 */
export async function initializeServerWithDependencyGraph(
  server: any,
  io: any,
  PORT: number
): Promise<void> {
  // Initialize all dependencies using the dependency graph
  startupManager = new StartupManager()

  // Initialize health endpoint dependency tracking FIRST
  const depNames = startupManager.getDependencyNames()
  initializeDependencyHealthTracking(depNames)
  console.log(`✅ Health endpoint tracking initialized for ${depNames.length} dependencies`)

  const handleShutdown = async (signal: string) => {
    console.log(`\n🛑 ${signal} received, shutting down gracefully...`)
    try {
      if (startupManager) {
        await startupManager.shutdown()
      }
      console.log("✅ All dependencies shut down successfully")
      process.exit(0)
    } catch (shutdownError) {
      console.error("❌ Error during shutdown:", shutdownError)
      process.exit(1)
    }
  }
  process.on("SIGTERM", () => handleShutdown("SIGTERM"))
  process.on("SIGINT", () => handleShutdown("SIGINT"))

  // Bind HTTP before dependency init so PaaS port checks (Render, Fly, etc.) see an open port
  // while DATABASE_URL / Redis and other deps may still be connecting.
  await new Promise<void>((resolve, reject) => {
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`✅ Server listening on port ${PORT} (initializing dependencies…)`)
      resolve()
    })
    server.once("error", reject)
  })

  try {
    await startupManager.initialize()

    console.log(`✅ Dependencies ready — server fully up on port ${PORT}`)
    console.log(`📍 Environment: ${process.env.NODE_ENV || "development"}`)
    console.log("🔗 SharePoint test endpoint available at /api/integrations/sharepoint/test")
  } catch (initError: any) {
    // The dependency graph failed (most likely the DB probe timed out during Supabase cold-start).
    // We must NOT exit — the port is already bound and Render is watching it.
    // Instead: log the failure, keep the server alive with the readiness gate still closed,
    // and start a background retry loop so the gate opens once the DB comes online.
    const initMessage = initError?.message || String(initError)
    logger.error(
      `[Bootstrap] ⚠️  Startup dependencies failed: ${initMessage}. ` +
      `Server will keep running and retry DB connection in background.`
    )
    if (getDependencyHealthStatus("Database") === "unknown") {
      updateDependencyHealth("Database", "unhealthy", 0, initMessage)
    }
    const retryMs =
      process.env.NODE_ENV === 'development'
        ? Number(process.env.DB_BACKGROUND_RETRY_MS || 10_000)
        : 30_000
    startBackgroundDbRetry(startupManager, retryMs)

    // Skip jobs that require a working DB — they can't run yet
    return
  }

  // Initialize weekly template analysis job
  if (!process.env.SKIP_JOBS && !process.env.VERCEL) {
    const { initializeTemplateAnalysisJob } = require('../jobs/templateAnalysisJob')
    initializeTemplateAnalysisJob()
    console.log("✅ Template analysis job scheduled (Mondays at 2:00 AM)")
  } else {
    console.log("⏭️  Skipping in-memory template analysis job (handled by Vercel Cron)")
  }

  // Start stuck-job health monitor
  try {
    const { StuckJobMonitor } = require('../services/stuckJobMonitor')
    const monitor = new StuckJobMonitor(pool, io, {
      intervalMs: Number(process.env.STUCK_JOB_MONITOR_INTERVAL_MS || 300000),
      thresholdMinutes: Number(process.env.STUCK_JOB_THRESHOLD_MINUTES || 30),
    })
    monitor.start()
    console.log('✅ Stuck-job monitor started')
  } catch (err) {
    console.warn('⚠️ Could not start stuck-job monitor', err)
  }
}
