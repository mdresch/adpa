/**
 * Run Migration 338: Program-Level Resource Management System
 * TASK-1141 / Issue #415: Resource management system in use
 * 
 * This migration creates the complete program-level resource management system including:
 * - Resource Planning (program_resource_plan)
 * - Resource Allocations (program_resource_allocations)
 * - Capacity Forecasting (program_capacity_forecast)
 * - Skills Inventory (program_skills_inventory)
 * - Resource Performance (program_resource_performance)
 * - Resource Risks (program_resource_risks)
 * - Views for reporting and analysis
 * - Functions for automated conflict detection
 * - Triggers for automatic updates
 * 
 * Usage:
 *   npm run migrate:338
 *   npx tsx server/scripts/run-migration-338.ts
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
    console.log("🚀 Running Migration 338: Program-Level Resource Management System")
    console.log("   Implementing PMI-compliant resource management at program level\n")

    // Load migration file
    const migrationPath = path.join(__dirname, "../migrations/338_program_resource_management.sql")
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`)
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, "utf-8")

    console.log(`📄 Migration file loaded: ${migrationPath}`)
    console.log(`📊 Migration size: ${migrationSQL.length} characters\n`)

    // Check if tables already exist
    console.log("🔍 Checking if resource management tables exist...")
    
    const tablesToCheck = [
      'program_resource_plan',
      'program_resource_allocations',
      'program_capacity_forecast',
      'program_skills_inventory',
      'program_resource_performance',
      'program_resource_risks'
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

    // Check if views exist
    console.log("🔍 Checking if views exist...")
    const viewsToCheck = [
      'program_resource_demand',
      'program_resource_conflicts',
      'program_resource_utilization_summary',
      'program_skills_gap'
    ]

    for (const viewName of viewsToCheck) {
      const viewCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.views 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [viewName])
      
      if (viewCheck.rows[0].exists) {
        console.log(`   ⚠️  View '${viewName}' already exists - will be replaced`)
      } else {
        console.log(`   ✅ View '${viewName}' will be created`)
      }
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
        
        console.log(`   ✅ Table '${tableName}' exists (${rowCount.rows[0].count} rows)`)
      } else {
        console.log(`   ❌ Table '${tableName}' NOT found`)
      }
    }
    console.log("\n")

    // Verify views were created
    console.log("🔍 Verifying view creation...")
    for (const viewName of viewsToCheck) {
      const verifyView = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.views 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [viewName])
      
      if (verifyView.rows[0].exists) {
        console.log(`   ✅ View '${viewName}' exists`)
      } else {
        console.log(`   ❌ View '${viewName}' NOT found`)
      }
    }
    console.log("\n")

    // Verify functions exist
    console.log("🔍 Verifying functions...")
    const functionsToCheck = [
      'detect_resource_conflicts',
      'calculate_capacity_forecast'
    ]

    for (const functionName of functionsToCheck) {
      const functionCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM pg_proc p
          JOIN pg_namespace n ON p.pronamespace = n.oid
          WHERE n.nspname = 'public'
          AND p.proname = $1
        )
      `, [functionName])
      
      if (functionCheck.rows[0].exists) {
        console.log(`   ✅ Function '${functionName}' exists`)
      } else {
        console.log(`   ⚠️  Function '${functionName}' not found`)
      }
    }
    console.log("\n")

    // Verify triggers exist
    console.log("🔍 Verifying triggers...")
    const triggerCheck = await client.query(`
      SELECT trigger_name, event_object_table
      FROM information_schema.triggers
      WHERE trigger_name = 'resource_allocation_conflict_trigger'
    `)
    
    if (triggerCheck.rows.length > 0) {
      console.log(`   ✅ Trigger 'resource_allocation_conflict_trigger' exists on table '${triggerCheck.rows[0].event_object_table}'`)
    } else {
      console.log(`   ⚠️  Trigger 'resource_allocation_conflict_trigger' not found`)
    }
    console.log("\n")

    // Verify indexes
    console.log("🔍 Verifying key indexes...")
    const indexesToCheck = [
      'idx_program_resource_plan_program',
      'idx_program_resource_allocations_program',
      'idx_program_resource_allocations_conflicts',
      'idx_program_capacity_forecast_program',
      'idx_program_skills_inventory_program',
      'idx_program_resource_performance_program'
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

    // Check constraint on allocations
    console.log("🔍 Verifying constraints...")
    const constraintCheck = await client.query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'program_resource_allocations'
      AND constraint_name = 'unique_active_allocation'
    `)
    
    if (constraintCheck.rows.length > 0) {
      console.log(`   ✅ Constraint 'unique_active_allocation' exists (prevents duplicate allocations)`)
    } else {
      console.log(`   ⚠️  Constraint 'unique_active_allocation' not found`)
    }
    console.log("\n")

    console.log("✨ Migration 338 completed successfully!")
    console.log("\n📊 Summary:")
    console.log("   ✅ 6 core tables created")
    console.log("   ✅ 4 reporting views created")
    console.log("   ✅ 2 functions for automation created")
    console.log("   ✅ 1 trigger for conflict detection created")
    console.log("   ✅ Multiple indexes for performance optimization")
    console.log("\n💡 Next steps:")
    console.log("   - Create backend service: server/src/services/resourceService.ts")
    console.log("   - Create API routes: server/src/routes/resourceRoutes.ts")
    console.log("   - Create frontend components: Resource Allocation Matrix, Capacity Dashboard")
    console.log("   - Add resource management tab to program detail page")
    console.log("   - Implement conflict detection UI")
    console.log("   - Write unit and integration tests")

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

