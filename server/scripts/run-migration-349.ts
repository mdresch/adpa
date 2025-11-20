import dotenv from "dotenv"
import { getDatabasePool, connectDatabase } from "../src/database/connection"
import { logger } from "../src/utils/logger"
import * as fs from "fs"
import * as path from "path"

dotenv.config()

async function runMigration() {
  const log = logger.child({ service: "migration-349" })
  
  try {
    log.info("🚀 Running Migration 349: Fix get_document_versions timestamp type")
    log.info("   Update function to use TIMESTAMP WITH TIME ZONE")
    log.info("")

    log.info("📡 Connecting to database...")
    await connectDatabase()
    const pool = getDatabasePool()
    log.info("✅ Database connected successfully")

    const migrationFile = path.join(__dirname, "../migrations/349_fix_get_document_versions_timestamp.sql")
    if (!fs.existsSync(migrationFile)) {
      throw new Error(`Migration file not found: ${migrationFile}`)
    }

    const migrationSQL = fs.readFileSync(migrationFile, "utf-8")
    log.info(`📄 Migration file loaded: ${migrationFile}`)
    log.info(`📊 Migration size: ${migrationSQL.length} characters`)
    log.info("")

    log.info("🔄 Executing migration...")
    log.info("   ⏳ Updating get_document_versions function...")

    const startTime = Date.now()

    await pool.query("BEGIN")
    try {
      await pool.query(migrationSQL)
      await pool.query("COMMIT")
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(2)
      log.info("")
      log.info(`✅ Migration executed successfully (${duration}s)`)
      log.info("")

      log.info("📝 Changes applied:")
      log.info("   • Updated get_document_versions() function signature")
      log.info("   • Changed created_at and updated_at to TIMESTAMP WITH TIME ZONE")
      log.info("   • Fixes type mismatch error when querying document versions")
      log.info("")

    } catch (error: any) {
      await pool.query("ROLLBACK")
      throw error
    }

  } catch (error: any) {
    log.error("❌ Migration execution failed!")
    log.error(`   Error: ${error.message}`)
    if (error.stack) {
      log.error(`   Stack: ${error.stack}`)
    }
    process.exit(1)
  } finally {
    await getDatabasePool().end()
  }
}

runMigration().catch((error) => {
  logger.error("Migration failed:", error)
  process.exit(1)
})



