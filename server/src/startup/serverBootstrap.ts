import { StartupManager } from "./startupManager"
import { logger } from "../utils/logger"
import { safeQuery } from '../services/jobs/dbGuards'
import { pool } from "../database/connection"
import { SystemMonitoring } from "../utils/systemMonitoring"
import { mongoVectorStore } from "../services/mongoVectorStore"
import { initializeDependencyHealthTracking } from "../routes/health"

// Export the startupManager instance so other modules can access it.
export let startupManager: StartupManager;

/**
 * Updated server startup function that uses the Startup Dependency Graph.
 * This replaces the old sequential initialization with parallel dependency initialization.
 */
export async function initializeServerWithDependencyGraph(
  server: any,
  io: any,
  PORT: number
): Promise<void> {
  try {
    // Initialize all dependencies using the dependency graph
    startupManager = new StartupManager()
    await startupManager.initialize()
    // Initialize health endpoint dependency tracking
    const depNames = startupManager.getDependencyNames()
    initializeDependencyHealthTracking(depNames)
    console.log(`✅ Health endpoint tracking initialized for ${depNames.length} dependencies`)

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`✅ Server running on port ${PORT}`)
      console.log(`📍 Environment: ${process.env.NODE_ENV || "development"}`)
      console.log("🔗 SharePoint test endpoint available at /api/integrations/sharepoint/test")

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
    })

    // Graceful shutdown handler
    const handleShutdown = async (signal: string) => {
      console.log(`
🛑 ${signal} received, shutting down gracefully...`)
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

    process.on('SIGTERM', () => handleShutdown('SIGTERM'))
    process.on('SIGINT', () => handleShutdown('SIGINT'))

  } catch (error) {
    console.error("❌ Failed to start server:", error)
    if (startupManager) {
      try {
        await startupManager.shutdown()
      } catch (shutdownError) {
        console.error("❌ Error during shutdown:", shutdownError)
      }
    }
    process.exit(1)
  }
}
