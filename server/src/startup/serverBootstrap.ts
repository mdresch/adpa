import { StartupManager } from "./startupManager"
import { logger } from "../utils/logger"
import { safeQuery } from '../services/jobs/dbGuards'
import { pool } from "../database/connection"
import { SystemMonitoring } from "../utils/systemMonitoring"
import { mongoVectorStore } from "../services/mongoVectorStore"

/**
 * Updated server startup function that uses the Startup Dependency Graph.
 * This replaces the old sequential initialization with parallel dependency initialization.
 */
export async function initializeServerWithDependencyGraph(
  server: any,
  io: any,
  PORT: number
): Promise<void> {
  let startupManager: StartupManager

  try {
    // Initialize all dependencies using the dependency graph
    startupManager = new StartupManager()
    await startupManager.initialize()

    // Auto-create document_summaries table if it doesn't exist
    try {
      await safeQuery(pool, `
        CREATE TABLE IF NOT EXISTS document_summaries (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
          compression_method VARCHAR(50) NOT NULL,
          compression_level DECIMAL(3,2) NOT NULL,
          target_tokens INTEGER NOT NULL,
          original_content TEXT NOT NULL,
          original_tokens INTEGER NOT NULL,
          compressed_content TEXT NOT NULL,
          compressed_tokens INTEGER NOT NULL,
          compression_ratio DECIMAL(5,4) NOT NULL,
          ai_provider VARCHAR(100),
          ai_model VARCHAR(100),
          template_context JSONB,
          template_context_hash VARCHAR(64),
          document_version INTEGER NOT NULL DEFAULT 1,
          is_valid BOOLEAN NOT NULL DEFAULT true,
          times_reused INTEGER NOT NULL DEFAULT 0,
          last_reused_at TIMESTAMP,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT document_summaries_unique_cache_v2 UNIQUE (document_id, compression_method, compression_level, template_context_hash)
        );
        
        CREATE INDEX IF NOT EXISTS idx_document_summaries_document_id ON document_summaries(document_id);
        CREATE INDEX IF NOT EXISTS idx_document_summaries_valid ON document_summaries(is_valid) WHERE is_valid = true;
        CREATE INDEX IF NOT EXISTS idx_document_summaries_method ON document_summaries(compression_method);
        CREATE INDEX IF NOT EXISTS idx_document_summaries_reuse ON document_summaries(times_reused DESC);
      `)
      console.log("✅ document_summaries table ready (auto-migration)")
    } catch (migrationError) {
      console.warn("⚠️  Could not create document_summaries table:", migrationError)
    }

    // Auto-migrate is_curated column on risks table
    try {
      await safeQuery(pool, `
        ALTER TABLE risks ADD COLUMN IF NOT EXISTS is_curated BOOLEAN DEFAULT FALSE
      `)
      await safeQuery(pool, `
        CREATE INDEX IF NOT EXISTS idx_risks_is_curated ON risks(is_curated)
      `)
      console.log("✅ risks.is_curated column ready (auto-migration)")
    } catch (migrationError: any) {
      // Ignore if column already exists
      if (!migrationError.message?.includes('already exists')) {
        console.warn("⚠️  Could not add is_curated column:", migrationError.message)
      }
    }


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
