/**
 * Run Migration 336.5: Create PMBOK 6th Edition Reference Tables
 * Creates the database schema for PMBOK 6th Edition Process Groups, Knowledge Areas, and Processes
 * 
 * Usage:
 *   npm run migrate:336.5
 *   npx tsx server/scripts/run-migration-336.5.ts
 */

import dotenv from "dotenv"
import { getDatabasePool, connectDatabase } from "../src/database/connection"
import { logger } from "../src/utils/logger"
import * as fs from "fs"
import * as path from "path"

// Load environment variables
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
    console.log("🚀 Running Migration 336.5: Create PMBOK 6th Edition Reference Tables")
    console.log("   Creating tables for Process Groups, Knowledge Areas, and Processes\n")

    // Load migration file
    const migrationPath = path.join(__dirname, "../migrations/336.5_create_pmbok6_tables.sql")
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`)
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, "utf-8")

    console.log(`📄 Migration file loaded: ${migrationPath}`)
    console.log(`📊 Migration size: ${migrationSQL.length} characters\n`)

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

    // Verify tables were created
    console.log("🔍 Verifying table creation...")
    const tablesToCheck = [
      'pmbok6_process_groups',
      'pmbok6_knowledge_areas',
      'pmbok6_processes'
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
        // Get column count
        const columnCount = await client.query(`
          SELECT COUNT(*) as count
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = $1
        `, [tableName])
        
        console.log(`   ✅ Table '${tableName}' exists (${columnCount.rows[0].count} columns)`)
      } else {
        console.log(`   ❌ Table '${tableName}' NOT found`)
      }
    }
    console.log("\n")

    // Verify indexes
    console.log("🔍 Verifying indexes...")
    const indexesToCheck = [
      'idx_pmbok6_processes_code',
      'idx_pmbok6_processes_process_group',
      'idx_pmbok6_processes_knowledge_area',
      'idx_pmbok6_processes_display_order'
    ]

    for (const indexName of indexesToCheck) {
      const indexCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM pg_indexes 
          WHERE schemaname = 'public' 
          AND indexname = $1
        )
      `, [indexName])
      
      if (indexCheck.rows[0].exists) {
        console.log(`   ✅ Index '${indexName}' exists`)
      } else {
        console.log(`   ⚠️  Index '${indexName}' not found`)
      }
    }
    console.log("\n")

    // Verify triggers
    console.log("🔍 Verifying triggers...")
    const triggersToCheck = [
      'trg_update_pmbok6_process_groups_updated_at',
      'trg_update_pmbok6_knowledge_areas_updated_at',
      'trg_update_pmbok6_processes_updated_at'
    ]

    for (const triggerName of triggersToCheck) {
      const triggerCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM pg_trigger 
          WHERE tgname = $1
        )
      `, [triggerName])
      
      if (triggerCheck.rows[0].exists) {
        console.log(`   ✅ Trigger '${triggerName}' exists`)
      } else {
        console.log(`   ⚠️  Trigger '${triggerName}' not found`)
      }
    }
    console.log("\n")

    console.log("✨ Migration 336.5 completed successfully!")
    console.log("\n💡 Next step:")
    console.log("   - Run Migration 337 to seed the tables with PMBOK 6th Edition data:")
    console.log("     npm run migrate:337")

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

