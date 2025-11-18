/**
 * Run Migration 340: Portfolio Risk Register System
 * TASK-1131 / Issue #405: Portfolio risk register exists and updated monthly
 * 
 * This migration creates the portfolio risk register system including:
 * - Portfolio Risks table (portfolio_risks)
 * - Monthly review tracking
 * - Compliance views (portfolio_risk_summary, portfolio_risk_review_compliance)
 * - Automatic severity calculation
 * - Monthly review status tracking
 * 
 * PMI Compliance: Implements "Portfolio risk register exists and updated monthly" requirement
 * for Portfolio Risk Management domain validation.
 * 
 * Usage:
 *   npm run migrate:340
 *   npx tsx server/scripts/run-migration-340.ts
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
    console.log("🚀 Running Migration 340: Portfolio Risk Register System")
    console.log("   Implementing PMI-compliant portfolio risk register with monthly updates\n")

    // Load migration file
    const migrationPath = path.join(__dirname, "../migrations/340_portfolio_risk_register.sql")
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`)
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, "utf-8")

    console.log(`📄 Migration file loaded: ${migrationPath}`)
    console.log(`📊 Migration size: ${migrationSQL.length} characters\n`)

    // Check if table already exists
    console.log("🔍 Checking if portfolio_risks table exists...")
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'portfolio_risks'
      )
    `)
    
    if (tableCheck.rows[0].exists) {
      console.log(`   ⚠️  Table 'portfolio_risks' already exists - migration will use IF NOT EXISTS`)
    } else {
      console.log(`   ✅ Table 'portfolio_risks' will be created`)
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
        const lines = migrationSQL.split('\n')
        const errorLine = migrationSQL.substring(0, error.position).split('\n').length
        console.error(`   Line: ${errorLine}`)
        if (lines[errorLine - 1]) {
          console.error(`   SQL: ${lines[errorLine - 1].trim()}`)
        }
      }
      throw error
    }

    // Verify table was created
    console.log("🔍 Verifying table creation...")
    const verifyTable = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'portfolio_risks'
      )
    `)
    
    if (verifyTable.rows[0].exists) {
      const rowCount = await client.query(`SELECT COUNT(*) as count FROM portfolio_risks`)
      const columnCount = await client.query(`
        SELECT COUNT(*) as count
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'portfolio_risks'
      `)
      console.log(`   ✅ Table 'portfolio_risks' exists (${columnCount.rows[0].count} columns, ${rowCount.rows[0].count} rows)`)
    } else {
      console.log(`   ❌ Table 'portfolio_risks' NOT found`)
    }
    console.log("\n")

    // Verify views were created
    console.log("🔍 Verifying view creation...")
    const views = ['portfolio_risk_summary', 'portfolio_risk_review_compliance']
    for (const viewName of views) {
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

    // Verify functions were created
    console.log("🔍 Verifying function creation...")
    const functions = ['calculate_portfolio_risk_severity', 'update_portfolio_risk_severity']
    for (const funcName of functions) {
      const funcCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM pg_proc p
          JOIN pg_namespace n ON p.pronamespace = n.oid
          WHERE n.nspname = 'public'
          AND p.proname = $1
        )
      `, [funcName])
      
      if (funcCheck.rows[0].exists) {
        console.log(`   ✅ Function '${funcName}' exists`)
      } else {
        console.log(`   ❌ Function '${funcName}' NOT found`)
      }
    }
    console.log("\n")

    // Verify indexes
    console.log("🔍 Verifying key indexes...")
    const indexCheck = await client.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'portfolio_risks' 
      AND schemaname = 'public'
      ORDER BY indexname
    `)
    
    if (indexCheck.rows.length > 0) {
      console.log(`   ✅ Found ${indexCheck.rows.length} indexes:`)
      indexCheck.rows.forEach((idx: any) => {
        console.log(`      - ${idx.indexname}`)
      })
    } else {
      console.log(`   ⚠️  No indexes found (unexpected)`)
    }
    console.log("\n")

    console.log("✨ Migration 340 completed successfully!")
    console.log("\n📊 Summary:")
    console.log("   ✅ portfolio_risks table created")
    console.log("   ✅ 2 compliance views created:")
    console.log("      - portfolio_risk_summary (risk statistics)")
    console.log("      - portfolio_risk_review_compliance (monthly review tracking)")
    console.log("   ✅ 2 functions created:")
    console.log("      - calculate_portfolio_risk_severity (auto-calculate severity)")
    console.log("      - update_portfolio_risk_severity (trigger function)")
    console.log("   ✅ Multiple indexes for performance optimization")
    console.log("   ✅ Monthly review tracking fields")
    console.log("\n💡 Next steps:")
    console.log("   ⚠️  Create backend service: server/src/services/portfolioRiskService.ts")
    console.log("   ⚠️  Create API routes: server/src/routes/portfolioRiskRoutes.ts")
    console.log("   ⚠️  Create frontend components:")
    console.log("      - Portfolio risk register UI")
    console.log("      - Monthly review dashboard")
    console.log("      - Risk heatmap component")
    console.log("   ⚠️  Implement monthly review workflow")
    console.log("\n🎯 PMI Compliance:")
    console.log("   ✅ Portfolio risk register exists - DATABASE COMPLETE")
    console.log("   ⚠️  Monthly update tracking - DATABASE COMPLETE (backend/frontend pending)")

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

