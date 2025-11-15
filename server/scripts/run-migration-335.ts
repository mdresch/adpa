/**
 * Run Migration 335: Document Signatures System
 * Implements digital signature functionality for documents
 * Links to existing ADPA tables: documents, users, approval_requests
 * 
 * Usage:
 *   npm run migrate:335
 *   npx tsx server/scripts/run-migration-335.ts
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
    console.log("🚀 Running Migration 335: Document Signatures System")
    console.log("   Implementing digital signature functionality for documents\n")

    // Load migration file
    const migrationPath = path.join(__dirname, "../migrations/335_document_signatures.sql")
    const migrationSQL = fs.readFileSync(migrationPath, "utf-8")

    console.log(`📄 Migration file loaded: ${migrationPath}`)
    console.log(`📊 Migration size: ${migrationSQL.length} characters\n`)

    // Check if tables already exist
    console.log("🔍 Checking if tables already exist...")
    const tablesToCheck = [
      'signature_fields',
      'document_signatures',
      'signature_recipients',
      'signature_audit_logs'
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
        console.log(`   ⚠️  Table '${tableName}' already exists`)
      } else {
        console.log(`   ✅ Table '${tableName}' does not exist - will be created`)
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
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [tableName])
      
      if (tableCheck.rows[0].exists) {
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

    // Verify indexes were created
    console.log("🔍 Verifying index creation (sample)...")
    const indexesToCheck = [
      'idx_signature_fields_document_id',
      'idx_document_signatures_document_id',
      'idx_signature_recipients_document_signature_id',
      'idx_signature_audit_logs_document_signature_id'
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
        AND tc.table_name IN ('signature_fields', 'document_signatures', 'signature_recipients', 'signature_audit_logs')
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

    console.log("✨ Migration 335 completed successfully!")
    console.log("\n💡 Next steps:")
    console.log("   - Create API routes for document signing")
    console.log("   - Create frontend components for signature capture")
    console.log("   - Configure signing certificates (SIGNING_CERT_PATH or SIGNING_CERT_BASE64)")
    console.log("   - Test signature workflow with sample documents")

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

