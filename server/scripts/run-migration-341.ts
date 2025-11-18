/**
 * Run Migration 341: Compliance Security Table for AI Extraction
 * TASK: Add compliance, security, legal, and standards extraction support
 * 
 * This migration creates the compliance_security table for storing:
 * - Security requirements (encryption, authentication, audit trails, etc.)
 * - Compliance standards (ISO 27001, SOC 2, HIPAA, GDPR, etc.)
 * - Legal requirements (DMCA, data retention, GDPR rights, etc.)
 * - Security and compliance scoring (0-10)
 * - Source document tracking for traceability
 * 
 * Usage:
 *   npm run migrate:341
 *   npx tsx server/scripts/run-migration-341.ts
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
    console.log("🚀 Running Migration 341: Compliance Security Table")
    console.log("   Creating compliance_security table for AI extraction\n")

    // Load migration file
    const migrationPath = path.join(__dirname, "../migrations/341_create_compliance_security_table.sql")
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`)
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, "utf-8")

    console.log(`📄 Migration file loaded: ${migrationPath}`)
    console.log(`📊 Migration size: ${migrationSQL.length} characters\n`)

    // Check if table already exists
    console.log("🔍 Checking if compliance_security table exists...")
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'compliance_security'
      )
    `)
    
    if (tableCheck.rows[0].exists) {
      console.log(`   ⚠️  Table 'compliance_security' already exists - migration will use IF NOT EXISTS`)
    } else {
      console.log(`   ✅ Table 'compliance_security' will be created`)
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
        AND table_name = 'compliance_security'
      )
    `)
    
    if (verifyTable.rows[0].exists) {
      const rowCount = await client.query(`SELECT COUNT(*) as count FROM compliance_security`)
      const columnCount = await client.query(`
        SELECT COUNT(*) as count
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'compliance_security'
      `)
      console.log(`   ✅ Table 'compliance_security' exists`)
      console.log(`      - ${columnCount.rows[0].count} columns`)
      console.log(`      - ${rowCount.rows[0].count} rows`)
    } else {
      console.log(`   ❌ Table 'compliance_security' NOT found`)
      throw new Error("Table verification failed")
    }
    console.log("\n")

    // Verify indexes were created
    console.log("🔍 Verifying indexes...")
    const indexCheck = await client.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'compliance_security' 
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

    // Verify trigger was created
    console.log("🔍 Verifying trigger...")
    const triggerCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM pg_trigger 
        WHERE tgname = 'update_compliance_security_updated_at'
      )
    `)
    
    if (triggerCheck.rows[0].exists) {
      console.log(`   ✅ Trigger 'update_compliance_security_updated_at' exists`)
    } else {
      console.log(`   ⚠️  Trigger not found (may be created by function)`)
    }
    console.log("\n")

    // List key columns
    console.log("🔍 Key columns in compliance_security table:")
    const columnsCheck = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'compliance_security'
      AND table_schema = 'public'
      ORDER BY ordinal_position
      LIMIT 20
    `)
    
    console.log(`   First 20 columns:`)
    columnsCheck.rows.forEach((col: any) => {
      const nullable = col.is_nullable === 'YES' ? 'nullable' : 'required'
      console.log(`      - ${col.column_name} (${col.data_type}, ${nullable})`)
    })
    console.log("\n")

    console.log("✨ Migration 341 completed successfully!")
    console.log("\n📊 Summary:")
    console.log("   ✅ compliance_security table created")
    console.log("   ✅ Security fields (encryption, authentication, audit trails)")
    console.log("   ✅ Compliance standards (ISO 27001, SOC 2, HIPAA, GDPR, etc.)")
    console.log("   ✅ Legal requirements (DMCA, data retention, GDPR rights)")
    console.log("   ✅ Security and compliance scoring (0-10)")
    console.log("   ✅ Source document tracking")
    console.log("   ✅ Indexes for performance optimization")
    console.log("   ✅ Updated_at trigger for automatic timestamp updates")
    console.log("\n💡 Next steps:")
    console.log("   ✅ Extraction service already implemented")
    console.log("   ✅ API endpoint already created")
    console.log("   ✅ UI component already integrated")
    console.log("   ⚠️  Run AI extraction on projects to populate data")
    console.log("   ⚠️  View results in Project Tab → Compliance & Security")

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

