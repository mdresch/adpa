/**
 * Run Migration 336: Mitigation Plans Tracking System
 * TASK-1135: Mitigation plans tracked to completion
 * Enables tracking of individual mitigation actions/plans for risks with completion status
 * 
 * Usage:
 *   npm run migrate:336
 *   npx tsx server/scripts/run-migration-336.ts
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
    console.log("🚀 Running Migration 336: Mitigation Plans Tracking System")
    console.log("   TASK-1135: Mitigation plans tracked to completion\n")

    // Load migration file
    const migrationPath = path.join(__dirname, "../migrations/336_create_mitigation_plans.sql")
    const migrationSQL = fs.readFileSync(migrationPath, "utf-8")

    console.log(`📄 Migration file loaded: ${migrationPath}`)
    console.log(`📊 Migration size: ${migrationSQL.length} characters\n`)

    // Check if table already exists
    console.log("🔍 Checking if table already exists...")
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'mitigation_plans'
      )
    `)
    
    if (tableCheck.rows[0].exists) {
      console.log("   ⚠️  Table 'mitigation_plans' already exists")
      console.log("   ℹ️  Migration may have already been run. Skipping...")
      return
    } else {
      console.log("   ✅ Table 'mitigation_plans' does not exist - will be created")
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
    const verifyTable = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'mitigation_plans'
      )
    `)
    
    if (verifyTable.rows[0].exists) {
      // Get column count
      const columnCount = await client.query(`
        SELECT COUNT(*) as count
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'mitigation_plans'
      `)
      
      console.log(`   ✅ Table 'mitigation_plans' exists (${columnCount.rows[0].count} columns)`)
    } else {
      console.log(`   ❌ Table 'mitigation_plans' NOT found`)
    }
    console.log("\n")

    // Verify indexes were created
    console.log("🔍 Verifying index creation...")
    const indexesToCheck = [
      'idx_mitigation_plans_risk_id',
      'idx_mitigation_plans_status',
      'idx_mitigation_plans_owner_id',
      'idx_mitigation_plans_assigned_to',
      'idx_mitigation_plans_due_date',
      'idx_mitigation_plans_status_due_date',
      'idx_mitigation_plans_created_at'
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
        console.log(`   ⚠️  Index '${indexName}' not found (may have different name)`)
      }
    }
    console.log("\n")

    // Verify foreign keys
    console.log("🔍 Verifying foreign key constraints...")
    const fkCheck = await client.query(`
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND tc.table_name = 'mitigation_plans'
      ORDER BY kcu.column_name
    `)

    if (fkCheck.rows.length > 0) {
      console.log(`   ✅ Found ${fkCheck.rows.length} foreign key constraints:`)
      fkCheck.rows.forEach((fk: any) => {
        console.log(`      - ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`)
      })
    } else {
      console.log(`   ⚠️  No foreign keys found (unexpected)`)
    }
    console.log("\n")

    // Verify function was created
    console.log("🔍 Verifying function creation...")
    const functionCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM pg_proc 
        WHERE proname = 'calculate_risk_mitigation_completion'
      )
    `)
    
    if (functionCheck.rows[0].exists) {
      console.log("   ✅ Function 'calculate_risk_mitigation_completion' exists")
    } else {
      console.log("   ⚠️  Function 'calculate_risk_mitigation_completion' not found")
    }
    console.log("\n")

    // Verify trigger was created
    console.log("🔍 Verifying trigger creation...")
    const triggerCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM pg_trigger 
        WHERE tgname = 'trg_update_mitigation_plans_updated_at'
      )
    `)
    
    if (triggerCheck.rows[0].exists) {
      console.log("   ✅ Trigger 'trg_update_mitigation_plans_updated_at' exists")
    } else {
      console.log("   ⚠️  Trigger 'trg_update_mitigation_plans_updated_at' not found")
    }
    console.log("\n")

    console.log("✨ Migration 336 completed successfully!")
    console.log("\n💡 Next steps:")
    console.log("   - Test API endpoints: GET /api/mitigation-plans")
    console.log("   - Create mitigation plans via POST /api/mitigation-plans")
    console.log("   - Track completion via PUT /api/mitigation-plans/:id")
    console.log("   - View statistics via GET /api/mitigation-plans/stats")
    console.log("   - Implement frontend components for UI integration")

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

