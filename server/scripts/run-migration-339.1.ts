/**
 * Run Migration 339.1: Fix Review Cadence Compliance View
 * Fixes NULL handling in the compliance view
 * 
 * Usage:
 *   npx tsx server/scripts/run-migration-339.1.ts
 */

import dotenv from "dotenv"
import { getDatabasePool, connectDatabase } from "../src/database/connection"
import { logger } from "../src/utils/logger"
import * as fs from "fs"
import * as path from "path"

if (process.env.NODE_ENV !== "production") {
  dotenv.config()
}

async function runMigration() {
  try {
    logger.info("Connecting to database...")
    await connectDatabase()
    logger.info("Database connected successfully")
  } catch (error) {
    logger.error("Failed to connect to database:", error)
    throw error
  }

  const pool = getDatabasePool()
  const client = await pool.connect()

  try {
    console.log("🚀 Running Migration 339.1: Fix Review Compliance View")
    console.log("   Fixing NULL handling in compliance view\n")

    const migrationPath = path.join(__dirname, "../migrations/339.1_fix_review_compliance_view.sql")
    const migrationSQL = fs.readFileSync(migrationPath, "utf-8")

    console.log(`📄 Migration file loaded: ${migrationPath}\n`)

    await client.query("BEGIN")
    try {
      await client.query(migrationSQL)
      await client.query("COMMIT")
      console.log("✅ View updated successfully\n")
    } catch (error: any) {
      await client.query("ROLLBACK")
      throw error
    }

    // Verify view exists
    const viewCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND table_name = 'review_cadence_compliance'
      )
    `)
    
    if (viewCheck.rows[0].exists) {
      console.log("✅ View 'review_cadence_compliance' exists and updated")
    } else {
      console.log("❌ View 'review_cadence_compliance' NOT found")
    }

    console.log("\n✨ Migration 339.1 completed successfully!")

  } catch (error: any) {
    logger.error("Migration failed:", error)
    console.error("\n❌ Migration failed:", error.message)
    if (error.code) {
      console.error("   PostgreSQL Error Code:", error.code)
    }
    if (error.detail) {
      console.error("   Detail:", error.detail)
    }
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

runMigration().catch((error) => {
  logger.error("Unhandled error:", error)
  console.error("Unhandled error:", error)
  process.exit(1)
})

