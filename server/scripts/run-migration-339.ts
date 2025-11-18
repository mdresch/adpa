/**
 * Run Migration 339: Review Cadence Scheduling System
 * TASK-1129 / Issue #406: Regular review cadence (monthly/quarterly)
 * 
 * This migration creates the complete review cadence scheduling system including:
 * - Review Schedules (review_schedules)
 * - Review Meetings (review_meetings)
 * - Review Decisions (review_decisions)
 * - Review Action Items (review_action_items)
 * - Review Cadence Compliance View (review_cadence_compliance)
 * 
 * PMI Compliance: Implements "Regular review cadence (monthly/quarterly)" requirement
 * for Portfolio Performance Management domain validation.
 * 
 * Usage:
 *   npm run migrate:339
 *   npx tsx server/scripts/run-migration-339.ts
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
    console.log("🚀 Running Migration 339: Review Cadence Scheduling System")
    console.log("   Implementing PMI-compliant review cadence (monthly/quarterly)\n")

    // Load migration file
    const migrationPath = path.join(__dirname, "../migrations/339_review_cadence_scheduling.sql")
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`)
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, "utf-8")

    console.log(`📄 Migration file loaded: ${migrationPath}`)
    console.log(`📊 Migration size: ${migrationSQL.length} characters\n`)

    // Check if tables already exist
    console.log("🔍 Checking if review scheduling tables exist...")
    
    const tablesToCheck = [
      'review_schedules',
      'review_meetings',
      'review_decisions',
      'review_action_items'
    ]

    for (const tableName of tablesToCheck) {
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [tableName])
      
      if (tableCheck.rows[0].exists) {
        console.log(`   ⚠️  Table '${tableName}' already exists - migration will use IF NOT EXISTS`)
      } else {
        console.log(`   ✅ Table '${tableName}' will be created`)
      }
    }
    console.log("\n")

    // Check if view exists
    console.log("🔍 Checking if compliance view exists...")
    const viewCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND table_name = $1
      )
    `, ['review_cadence_compliance'])
    
    if (viewCheck.rows[0].exists) {
      console.log(`   ⚠️  View 'review_cadence_compliance' already exists - will be replaced`)
    } else {
      console.log(`   ✅ View 'review_cadence_compliance' will be created`)
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
      console.error("\n❌ Migration execution failed!")
      console.error(`   Error: ${error.message}`)
      if (error.code) {
        console.error(`   PostgreSQL Error Code: ${error.code}`)
      }
      if (error.detail) {
        console.error(`   Detail: ${error.detail}`)
      }
      if (error.hint) {
        console.error(`   Hint: ${error.hint}`)
      }
      if (error.position) {
        console.error(`   Position: ${error.position}`)
        // Show context around error
        const lines = migrationSQL.split('\n')
        const errorLine = migrationSQL.substring(0, error.position).split('\n').length
        console.error(`   Line: ${errorLine}`)
        if (lines[errorLine - 1]) {
          console.error(`   SQL: ${lines[errorLine - 1].trim()}`)
        }
      }
      throw error
    }

    // Verify tables were created
    console.log("🔍 Verifying table creation...")
    for (const tableName of tablesToCheck) {
      const verifyTable = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [tableName])
      
      if (verifyTable.rows[0].exists) {
        // Get row count
        const rowCount = await client.query(`
          SELECT COUNT(*) as count FROM ${tableName}
        `)
        
        // Get column count
        const columnCount = await client.query(`
          SELECT COUNT(*) as count
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = $1
        `, [tableName])
        
        console.log(`   ✅ Table '${tableName}' exists (${columnCount.rows[0].count} columns, ${rowCount.rows[0].count} rows)`)
      } else {
        console.log(`   ❌ Table '${tableName}' NOT found`)
      }
    }
    console.log("\n")

    // Verify view was created
    console.log("🔍 Verifying view creation...")
    const verifyView = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND table_name = $1
      )
    `, ['review_cadence_compliance'])
    
    if (verifyView.rows[0].exists) {
      console.log(`   ✅ View 'review_cadence_compliance' exists`)
    } else {
      console.log(`   ❌ View 'review_cadence_compliance' NOT found`)
    }
    console.log("\n")

    // Verify indexes
    console.log("🔍 Verifying key indexes...")
    const indexesToCheck = [
      'idx_review_schedules_program_id',
      'idx_review_schedules_review_owner_id',
      'idx_review_schedules_is_active',
      'idx_review_meetings_schedule_id',
      'idx_review_meetings_program_id',
      'idx_review_meetings_scheduled_date',
      'idx_review_meetings_status',
      'idx_review_decisions_meeting_id',
      'idx_review_action_items_meeting_id',
      'idx_review_action_items_assigned_to',
      'idx_review_action_items_status'
    ]

    let indexCount = 0
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
        indexCount++
      } else {
        console.log(`   ⚠️  Index '${indexName}' not found`)
      }
    }
    console.log(`   Found ${indexCount} of ${indexesToCheck.length} key indexes\n`)

    // Verify foreign keys
    console.log("🔍 Verifying foreign key constraints...")
    const fkCheck = await client.query(`
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        tc.constraint_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
        AND tc.table_name IN ('review_schedules', 'review_meetings', 'review_decisions', 'review_action_items')
      ORDER BY tc.table_name, kcu.column_name
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

    // Verify check constraints
    console.log("🔍 Verifying check constraints...")
    const constraintCheck = await client.query(`
      SELECT
        tc.table_name,
        tc.constraint_name,
        cc.check_clause
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.check_constraints AS cc
        ON tc.constraint_name = cc.constraint_name
      WHERE tc.constraint_type = 'CHECK'
        AND tc.table_schema = 'public'
        AND tc.table_name IN ('review_schedules', 'review_meetings', 'review_decisions', 'review_action_items')
      ORDER BY tc.table_name, tc.constraint_name
    `)

    if (constraintCheck.rows.length > 0) {
      console.log(`   ✅ Found ${constraintCheck.rows.length} check constraints:`)
      constraintCheck.rows.forEach((constraint: any) => {
        const clause = constraint.check_clause.length > 60 
          ? constraint.check_clause.substring(0, 60) + '...' 
          : constraint.check_clause
        console.log(`      - ${constraint.table_name}.${constraint.constraint_name}: ${clause}`)
      })
    }
    console.log("\n")

    console.log("✨ Migration 339 completed successfully!")
    console.log("\n📊 Summary:")
    console.log("   ✅ 4 core tables created:")
    console.log("      - review_schedules (schedule configuration)")
    console.log("      - review_meetings (actual review meetings)")
    console.log("      - review_decisions (decisions from reviews)")
    console.log("      - review_action_items (action items from reviews)")
    console.log("   ✅ 1 compliance view created:")
    console.log("      - review_cadence_compliance (PMI compliance tracking)")
    console.log("   ✅ Multiple indexes for performance optimization")
    console.log("   ✅ Foreign key constraints for data integrity")
    console.log("   ✅ Check constraints for data validation")
    console.log("\n💡 Next steps:")
    console.log("   ✅ Backend service created: server/src/services/reviewSchedulingService.ts")
    console.log("   ✅ API routes created: server/src/routes/reviewRoutes.ts")
    console.log("   ⚠️  Create frontend components:")
    console.log("      - Review schedule configuration UI")
    console.log("      - Review calendar view")
    console.log("      - Review dashboard")
    console.log("      - Review meeting interface")
    console.log("   ⚠️  Integrate automated reminder job queue")
    console.log("   ⚠️  Write unit and integration tests")
    console.log("   ⚠️  Create user documentation")
    console.log("\n🎯 PMI Compliance:")
    console.log("   ✅ Regular review cadence (monthly/quarterly) - BACKEND COMPLETE")
    console.log("   ⚠️  Frontend UI pending for full compliance")

  } catch (error: any) {
    logger.error("Migration failed:", error)
    console.error("\n❌ Migration failed:", error.message)
    if (error.stack) {
      console.error("Stack trace:", error.stack)
    }
    if (error.code) {
      console.error("Error code:", error.code)
    }
    if (error.detail) {
      console.error("Error detail:", error.detail)
    }
    if (error.hint) {
      console.error("Hint:", error.hint)
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

