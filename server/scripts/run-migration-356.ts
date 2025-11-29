/**
 * Run Migration 356: Resource Capacity Management System
 * 
 * Creates:
 * - resource_capacity_settings: User working hours, targets, and schedule
 * - checklist_items: Task checklist items with resource assignment
 * - resource_unavailability: Leave and unavailability tracking
 * - Multiple views for utilization rollup at all levels
 * 
 * Usage:
 *   npm run migrate:356
 *   npx tsx server/scripts/run-migration-356.ts
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
    console.log("🚀 Running Migration 356: Resource Capacity Management System")
    console.log("   Implementing hierarchical resource allocation and capacity tracking\n")

    // Load migration file
    const migrationPath = path.join(__dirname, "../migrations/356_resource_capacity_management.sql")
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`)
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, "utf-8")

    console.log(`📄 Migration file loaded: ${migrationPath}`)
    console.log(`📊 Migration size: ${migrationSQL.length} characters\n`)

    // Check if tables already exist
    console.log("🔍 Checking if tables exist...")
    
    const tablesToCheck = [
      'resource_capacity_settings',
      'checklist_items',
      'resource_unavailability'
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
      'task_resource_utilization',
      'checklist_resource_utilization',
      'project_resource_summary',
      'program_resource_summary',
      'portfolio_resource_utilization',
      'portfolio_capacity_summary'
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

    // Verify function was created
    console.log("🔍 Verifying function creation...")
    const funcCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
        AND p.proname = 'get_user_capacity_settings'
      )
    `)
    if (funcCheck.rows[0].exists) {
      console.log(`   ✅ Function 'get_user_capacity_settings' exists`)
    } else {
      console.log(`   ❌ Function 'get_user_capacity_settings' NOT found`)
    }
    console.log("\n")

    // Check how many users got default capacity settings
    const defaultSettingsCount = await client.query(`
      SELECT COUNT(*) as count FROM resource_capacity_settings
    `)
    console.log(`📊 Default capacity settings created for ${defaultSettingsCount.rows[0].count} users`)

    // Test the portfolio view
    console.log("\n🔍 Testing portfolio_resource_utilization view...")
    try {
      const testResult = await client.query(`
        SELECT COUNT(*) as count FROM portfolio_resource_utilization
      `)
      console.log(`   ✅ View returns ${testResult.rows[0].count} rows`)
    } catch (error: any) {
      console.log(`   ⚠️  View test failed: ${error.message}`)
    }

    console.log("\n")
    console.log("✨ Migration 356 completed successfully!")
    console.log("\n📊 Summary:")
    console.log("   ✅ 3 tables created (capacity settings, checklist items, unavailability)")
    console.log("   ✅ 6 views created for utilization rollup")
    console.log("   ✅ 1 helper function created")
    console.log("   ✅ 3 triggers created for timestamp updates")
    console.log("\n💡 Key features:")
    console.log("   - Resource capacity settings per user (contracted hours, targets)")
    console.log("   - Checklist items with resource assignment")
    console.log("   - Leave/unavailability tracking")
    console.log("   - Utilization rollup: Checklist → Task → Project → Program → Portfolio")
    console.log("   - 80% target utilization tracking")
    console.log("   - Over/under allocation detection")

  } catch (error: any) {
    logger.error(`Migration failed: ${error.message}`, {
      code: error.code,
      stack: error.stack
    })
    console.log(`\n❌ Migration failed: ${error.message}`)
    console.log(`Stack trace: ${error.stack}`)
    if (error.code) {
      console.log(`Error code: ${error.code}`)
    }
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

runMigration()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error("Migration error:", error)
    process.exit(1)
  })

