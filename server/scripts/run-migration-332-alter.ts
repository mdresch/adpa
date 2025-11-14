/**
 * Run Migration 332 Alter: Add owner_role to portfolio_key_success_factors
 * 
 * Usage:
 *   npx tsx server/scripts/run-migration-332-alter.ts
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
    console.log("🚀 Running Migration 332 Alter: Add owner_role to portfolio_key_success_factors\n")

    // Load migration file
    const migrationPath = path.join(__dirname, "../migrations/332_alter_add_owner_role_to_ksf.sql")
    const migrationSQL = fs.readFileSync(migrationPath, "utf-8")

    console.log(`📄 Migration file loaded: ${migrationPath}\n`)

    // Check if column already exists
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'portfolio_key_success_factors'
      AND column_name = 'owner_role'
    `)

    if (columnCheck.rows.length > 0) {
      console.log("⏭️  Column owner_role already exists. Skipping migration.")
      return
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

    // Verify column was added
    const verifyCheck = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'portfolio_key_success_factors'
      AND column_name = 'owner_role'
    `)

    if (verifyCheck.rows.length > 0) {
      console.log(`✅ Column owner_role added successfully (${verifyCheck.rows[0].data_type})`)
    } else {
      console.log("❌ Column owner_role NOT found after migration")
    }

    console.log("\n✨ Migration 332 Alter completed successfully!")
    console.log("\n💡 Next step: Run 'npm run seed:okrs' to populate KSFs")

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

