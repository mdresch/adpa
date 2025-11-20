/**
 * Run Migration 347: Issues Log System
 * ENTITY_TYPE_ISSUES_LOG.md - Complete implementation
 * 
 * This migration creates comprehensive issues tracking:
 * - issues table (tracks current problems, distinct from risks)
 * - issue_status_history table (audit trail of status changes)
 * - Risk reporting views (risk_registry, risk_mitigation_report)
 * - Triggers for automatic date setting and status logging
 * 
 * Usage:
 *   npm run migrate:347
 *   npx tsx server/scripts/run-migration-347.ts
 */

import dotenv from "dotenv"
import { getDatabasePool, connectDatabase } from "../src/database/connection"
import { logger } from "../src/utils/logger"
import * as fs from "fs"
import * as path from "path"

dotenv.config()

async function runMigration() {
  const log = logger.child({ service: "migration-347" })
  
  try {
    log.info("🚀 Running Migration 347: Issues Log System")
    log.info("   Complete Issues & Risk Reporting Implementation")
    log.info("")

    // Connect to database
    log.info("📡 Connecting to database...")
    await connectDatabase()
    const pool = getDatabasePool()
    log.info("✅ Database connected successfully")

    // Load migration file
    const migrationFile = path.join(__dirname, "../migrations/347_create_issues_log.sql")
    if (!fs.existsSync(migrationFile)) {
      throw new Error(`Migration file not found: ${migrationFile}`)
    }

    const migrationSQL = fs.readFileSync(migrationFile, "utf-8")
    log.info(`📄 Migration file loaded: ${migrationFile}`)
    log.info(`📊 Migration size: ${migrationSQL.length} characters`)
    log.info("")

    // Check existing tables
    log.info("🔍 Checking existing tables and views...")
    const existingTables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('issues', 'issue_status_history')
    `)
    
    const existingViews = await pool.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public' 
      AND table_name IN ('risk_registry', 'risk_mitigation_report', 'portfolio_risk_summary', 'portfolio_risk_review_compliance')
    `)

    const existingTableNames = existingTables.rows.map((r: any) => r.table_name)
    const existingViewNames = existingViews.rows.map((r: any) => r.table_name)

    if (existingTableNames.includes('issues')) {
      log.info("   ⚠️  table 'issues' already exists (will use IF NOT EXISTS)")
    } else {
      log.info("   ✅ table 'issues' will be created")
    }

    if (existingTableNames.includes('issue_status_history')) {
      log.info("   ⚠️  table 'issue_status_history' already exists (will use IF NOT EXISTS)")
    } else {
      log.info("   ✅ table 'issue_status_history' will be created")
    }

    log.info("")
    log.info("🔍 Checking views...")
    
    const viewsToCreate = ['risk_registry', 'risk_mitigation_report', 'portfolio_risk_summary', 'portfolio_risk_review_compliance']
    viewsToCreate.forEach(viewName => {
      if (existingViewNames.includes(viewName)) {
        log.info(`   ⚠️  view '${viewName}' already exists (will be replaced)`)
      } else {
        log.info(`   ✅ view '${viewName}' will be created`)
      }
    })

    log.info("")
    log.info("🔄 Executing migration...")
    log.info("   ⏳ Creating tables, views, indexes, and functions...")

    const startTime = Date.now()

    // Execute migration in a transaction
    await pool.query("BEGIN")
    try {
      await pool.query(migrationSQL)
      await pool.query("COMMIT")
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(2)
      log.info("")
      log.info(`✅ Migration executed successfully (${duration}s)`)
      log.info("")

      // Verify tables were created
      log.info("🔍 Verifying migration...")
      const verifyTables = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('issues', 'issue_status_history')
      `)
      
      const verifyViews = await pool.query(`
        SELECT table_name 
        FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND table_name IN ('risk_registry', 'risk_mitigation_report', 'portfolio_risk_summary', 'portfolio_risk_review_compliance')
      `)

      const createdTables = verifyTables.rows.map((r: any) => r.table_name)
      const createdViews = verifyViews.rows.map((r: any) => r.table_name)

      log.info("")
      log.info("📊 Migration Results:")
      log.info(`   ✅ Tables created: ${createdTables.length}/2`)
      createdTables.forEach(t => log.info(`      - ${t}`))
      
      log.info(`   ✅ Views created: ${createdViews.length}/4`)
      createdViews.forEach(v => log.info(`      - ${v}`))

      log.info("")
      log.info("✅ Migration 347 completed successfully!")
      log.info("")
      log.info("📋 What was created:")
      log.info("   • issues table - Track current problems (distinct from risks)")
      log.info("   • issue_status_history table - Audit trail of status changes")
      log.info("   • risk_registry view - Comprehensive risk listing with mitigation status")
      log.info("   • risk_mitigation_report view - Detailed mitigation tracking")
      log.info("   • portfolio_risk_summary view - Risk statistics per program")
      log.info("   • portfolio_risk_review_compliance view - Monthly review compliance")
      log.info("   • Triggers for automatic date setting and status logging")
      log.info("")
      log.info("🎯 Next steps:")
      log.info("   1. Test API endpoints: /api/issues, /api/risks/registry, /api/risks/report")
      log.info("   2. Create frontend UI components for issues dashboard")
      log.info("   3. Integrate with existing risk management workflows")

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

// Run migration
runMigration().catch((error) => {
  logger.error("Migration failed:", error)
  process.exit(1)
})

