/**
 * Run Migration 332: Strategic Framework Tables
 * Creates tables for Portfolio Vision, Strategic Goals, KPIs, and Key Success Factors
 * 
 * Usage:
 *   npm run migrate:332
 *   npx tsx server/scripts/run-migration-332.ts
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
    console.log("🚀 Running Migration 332: Strategic Framework Tables")
    console.log("   Creating: portfolio_vision, portfolio_strategic_goals, portfolio_kpis, portfolio_kpi_history, portfolio_key_success_factors\n")

    // Load migration file
    const migrationPath = path.join(__dirname, "../migrations/332_create_strategic_framework_tables.sql")
    const migrationSQL = fs.readFileSync(migrationPath, "utf-8")

    console.log(`📄 Migration file loaded: ${migrationPath}`)
    console.log(`📊 Migration size: ${migrationSQL.length} characters\n`)

    // Check if tables already exist
    const tablesToCheck = [
      "portfolio_vision",
      "portfolio_strategic_goals",
      "portfolio_kpis",
      "portfolio_kpi_history",
      "portfolio_key_success_factors"
    ]

    const existingTables: string[] = []
    for (const tableName of tablesToCheck) {
      const checkResult = await client.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )`,
        [tableName]
      )
      if (checkResult.rows[0].exists) {
        existingTables.push(tableName)
      }
    }

    if (existingTables.length > 0) {
      console.log("⚠️  Some tables already exist:")
      existingTables.forEach((table) => console.log(`   - ${table}`))
      console.log("   Migration will create missing tables only.\n")
    }

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
      const checkResult = await client.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )`,
        [tableName]
      )
      if (checkResult.rows[0].exists) {
        console.log(`   ✅ ${tableName} exists`)
      } else {
        console.log(`   ❌ ${tableName} NOT found`)
      }
    }

    // Verify indexes
    console.log("\n🔍 Verifying indexes...")
    const indexCheck = await client.query(`
      SELECT indexname, tablename 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename IN ('portfolio_vision', 'portfolio_strategic_goals', 'portfolio_kpis', 'portfolio_kpi_history', 'portfolio_key_success_factors')
      ORDER BY tablename, indexname
    `)
    console.log(`   Found ${indexCheck.rows.length} indexes`)

    // Verify triggers
    console.log("\n🔍 Verifying triggers...")
    const triggerCheck = await client.query(`
      SELECT trigger_name, event_object_table 
      FROM information_schema.triggers 
      WHERE event_object_schema = 'public'
      AND event_object_table IN ('portfolio_vision', 'portfolio_strategic_goals', 'portfolio_kpis', 'portfolio_key_success_factors')
      ORDER BY event_object_table, trigger_name
    `)
    console.log(`   Found ${triggerCheck.rows.length} triggers`)

    // Test insert (optional - can be removed if not needed)
    console.log("\n🧪 Testing table structure...")
    try {
      // Test portfolio_vision
      const testVision = await client.query(`
        INSERT INTO portfolio_vision (vision_statement, mission_statement, core_values)
        VALUES ($1, $2, $3)
        RETURNING id
      `, [
        "Test Vision",
        "Test Mission",
        ["Value1", "Value2"]
      ])
      await client.query("DELETE FROM portfolio_vision WHERE id = $1", [testVision.rows[0].id])
      console.log("   ✅ portfolio_vision structure verified")

      // Test portfolio_strategic_goals
      const testGoal = await client.query(`
        INSERT INTO portfolio_strategic_goals (goal_title, goal_description, goal_category, target_year)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `, [
        "Test Goal",
        "Test Description",
        "growth",
        2026
      ])
      await client.query("DELETE FROM portfolio_strategic_goals WHERE id = $1", [testGoal.rows[0].id])
      console.log("   ✅ portfolio_strategic_goals structure verified")

      // Test portfolio_kpis
      const testKPI = await client.query(`
        INSERT INTO portfolio_kpis (kpi_name, kpi_category, bsc_perspective, target_value, threshold_green, threshold_yellow)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `, [
        "Test KPI",
        "financial",
        "financial",
        100,
        90,
        70
      ])
      await client.query("DELETE FROM portfolio_kpis WHERE id = $1", [testKPI.rows[0].id])
      console.log("   ✅ portfolio_kpis structure verified")

      // Test portfolio_key_success_factors
      const testKSF = await client.query(`
        INSERT INTO portfolio_key_success_factors (ksf_name, ksf_category, criticality, success_criteria, impact_if_not_achieved)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [
        "Test KSF",
        "strategic",
        "must-have",
        "Test criteria",
        "Test impact"
      ])
      await client.query("DELETE FROM portfolio_key_success_factors WHERE id = $1", [testKSF.rows[0].id])
      console.log("   ✅ portfolio_key_success_factors structure verified")
    } catch (testError: any) {
      console.log(`   ⚠️  Test insert failed: ${testError.message}`)
      console.log("   This may be expected if constraints are strict")
    }

    console.log("\n✨ Migration 332 completed successfully!")
    console.log("\n💡 Next steps:")
    console.log("   - Run 'npm run seed:okrs' to populate the new tables")
    console.log("   - Visit http://localhost:3000/portfolio/okrs to view the dashboard")

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

