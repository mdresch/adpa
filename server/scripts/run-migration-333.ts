/**
 * Run Migration 333: Add is_team_member column to stakeholders table
 * Consolidates team member management through stakeholders
 * 
 * Usage:
 *   npm run migrate:333
 *   npx tsx server/scripts/run-migration-333.ts
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
    console.log("🚀 Running Migration 333: Add is_team_member to stakeholders")
    console.log("   Adding: is_team_member column to stakeholders table\n")

    // Load migration file
    const migrationPath = path.join(__dirname, "../migrations/333_add_is_team_member_to_stakeholders.sql")
    const migrationSQL = fs.readFileSync(migrationPath, "utf-8")

    console.log(`📄 Migration file loaded: ${migrationPath}`)
    console.log(`📊 Migration size: ${migrationSQL.length} characters\n`)

    // Check if column already exists
    console.log("🔍 Checking if column already exists...")
    const columnCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'stakeholders' 
        AND column_name = 'is_team_member'
      )
    `)
    
    if (columnCheck.rows[0].exists) {
      console.log("⚠️  Column 'is_team_member' already exists in stakeholders table")
      console.log("   Migration will skip adding the column (using IF NOT EXISTS)\n")
    } else {
      console.log("✅ Column 'is_team_member' does not exist - will be created\n")
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

    // Verify column was created
    console.log("🔍 Verifying column creation...")
    const verifyCheck = await client.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'stakeholders' 
      AND column_name = 'is_team_member'
    `)
    
    if (verifyCheck.rows.length > 0) {
      const col = verifyCheck.rows[0]
      console.log(`   ✅ Column 'is_team_member' exists`)
      console.log(`      Type: ${col.data_type}`)
      console.log(`      Default: ${col.column_default}`)
      console.log(`      Nullable: ${col.is_nullable}\n`)
    } else {
      console.log(`   ❌ Column 'is_team_member' NOT found\n`)
    }

    // Verify index was created
    console.log("🔍 Verifying index creation...")
    const indexCheck = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename = 'stakeholders'
      AND indexname = 'idx_stakeholders_is_team_member'
    `)
    
    if (indexCheck.rows.length > 0) {
      console.log(`   ✅ Index 'idx_stakeholders_is_team_member' exists`)
      console.log(`      Definition: ${indexCheck.rows[0].indexdef}\n`)
    } else {
      console.log(`   ⚠️  Index 'idx_stakeholders_is_team_member' not found (may already exist)\n`)
    }

    console.log("✨ Migration 333 completed successfully!")
    console.log("\n💡 Next steps:")
    console.log("   - Internal stakeholders can now be marked as team members")
    console.log("   - Team members will appear in the Overview tab")
    console.log("   - All team member management is now through the Stakeholders tab")

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

