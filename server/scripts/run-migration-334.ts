/**
 * Run Migration 334: Add source_document_id to all entity tables
 * Enables full traceability from extracted entities to source documents
 * 
 * Usage:
 *   npm run migrate:334
 *   npx tsx server/scripts/run-migration-334.ts
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
    console.log("🚀 Running Migration 334: Add source_document_id to all entity tables")
    console.log("   Enabling full traceability from extracted entities to source documents\n")

    // Load migration file
    const migrationPath = path.join(__dirname, "../migrations/334_add_source_document_id_to_all_entities.sql")
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

    // Verify columns were created
    console.log("🔍 Verifying column creation...")
    const tables = [
      'stakeholders', 'requirements', 'risks', 'milestones', 'constraints',
      'success_criteria', 'best_practices', 'phases', 'resources', 'technologies',
      'quality_standards', 'deliverables', 'scope_items', 'activities',
      'work_items', 'opportunities', 'risk_responses', 'capacity_plans'
    ]

    for (const table of tables) {
      const verifyCheck = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = $1 
        AND column_name = 'source_document_id'
      `, [table])
      
      if (verifyCheck.rows.length > 0) {
        const col = verifyCheck.rows[0]
        console.log(`   ✅ ${table}: source_document_id exists (${col.data_type}, nullable: ${col.is_nullable})`)
      } else {
        console.log(`   ⚠️  ${table}: source_document_id NOT found`)
      }
    }

    console.log("\n✨ Migration 334 completed successfully!")
    console.log("\n💡 Next steps:")
    console.log("   - Re-run extraction to populate source_document_id for all entities")
    console.log("   - Frontend will show clickable links to source documents")
    console.log("   - All entities are now fully traceable to their source documents")

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

