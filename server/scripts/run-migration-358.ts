/**
 * Run Migration 358: Morphic Integration Initialization
 * Enables Morphic Chat History, File Uploads, and Langfuse Integration
 * Creates tables: morphic_chats, morphic_messages, morphic_parts, morphic_feedback, morphic_ai_providers, morphic_ai_models, morphic_ai_model_config
 * 
 * Usage:
 *   npx tsx server/scripts/run-migration-358.ts
 */


import dotenv from "dotenv"
import { logger } from "../src/utils/logger"
import * as fs from "fs"
import * as path from "path"

// Load environment variables *before* importing database connection
const envPath = path.resolve(__dirname, "../../.env")
console.log(`Loading .env from: ${envPath}`)
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath })
} else {
  console.warn("⚠️  .env file not found at expected path")
  dotenv.config()
}

async function runMigration() {
  // Dynamic import to ensure env vars are loaded first
  const { getDatabasePool, connectDatabase } = await import("../src/database/connection")

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
    console.log("🚀 Running Migration 358: Morphic Integration Initialization\n")

    // Load migration file
    const migrationPath = path.join(__dirname, "../migrations/358_morphic_init.sql")
    const migrationSQL = fs.readFileSync(migrationPath, "utf-8")

    console.log(`📄 Migration file loaded: ${migrationPath}`)
    console.log(`📊 Migration size: ${migrationSQL.length} characters\n`)

    // Check if table already exists
    console.log("🔍 Checking if tables already exist...")
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'morphic_chats'
      )
    `)

    if (tableCheck.rows[0].exists) {
      console.log("   ⚠️  Table 'morphic_chats' already exists")
      console.log("   ℹ️  Migration may have already been run. Skipping...")
      return
    } else {
      console.log("   ✅ Table 'morphic_chats' does not exist - will be created")
    }
    console.log("\n")

    // Execute migration
    console.log("🔄 Executing migration...")
    await client.query("BEGIN")
    try {
      await client.query(migrationSQL)
      await client.query("COMMIT")
      console.log("✅ Migration executed successfully\n")
    } catch (error: any) {
      await client.query("ROLLBACK")
      throw error
    }

    // Verify table was created
    console.log("🔍 Verifying table creation...")
    const tablesToCheck = [
      'morphic_chats',
      'morphic_messages',
      'morphic_parts',
      'morphic_feedback',
      'morphic_ai_providers',
      'morphic_ai_models',
      'morphic_ai_model_config'
    ]

    for (const tableName of tablesToCheck) {
      const verifyTable = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = $1
            )
        `, [tableName])

      if (verifyTable.rows[0].exists) {
        console.log(`   ✅ Table '${tableName}' exists`)
      } else {
        console.log(`   ❌ Table '${tableName}' NOT found`)
      }
    }
    console.log("\n")

    console.log("✨ Migration 358 completed successfully!")

  } catch (error: any) {
    logger.error("Migration failed:", error)
    console.error("\n❌ Migration failed:", error.message)
    if (error.stack) {
      console.error("Stack trace:", error.stack)
    }
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

// Run migration
runMigration().catch((error) => {
  logger.error("Unhandled error:", error)
  console.error("Unhandled error:", error)
  process.exit(1)
})
