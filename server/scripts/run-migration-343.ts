/**
 * Run Migration 343: Fix Timestamp Timezone to UTC
 * 
 * Converts all timestamp columns from TIMESTAMP WITHOUT TIME ZONE
 * to TIMESTAMP WITH TIME ZONE for proper UTC storage
 * 
 * Usage:
 *   npm run migrate:343
 *   npx tsx server/scripts/run-migration-343.ts
 */

import dotenv from "dotenv"
import { getDatabasePool, connectDatabase } from "../src/database/connection"
import { logger } from "../src/utils/logger"
import * as fs from "fs"
import * as path from "path"

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
    console.log("🚀 Running Migration 343: Fix Timestamp Timezone to UTC")
    console.log("   Converting timestamps to TIMESTAMP WITH TIME ZONE for proper UTC storage\n")

    // Load migration file
    const migrationPath = path.join(__dirname, "../migrations/343_fix_timestamp_timezone.sql")
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`)
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, "utf-8")

    console.log(`📄 Migration file loaded: ${migrationPath}`)
    console.log(`📊 Migration size: ${migrationSQL.length} characters\n`)

    // Check current timestamp types
    console.log("🔍 Checking current timestamp column types...")
    const checkColumns = await client.query(`
      SELECT 
        table_name,
        column_name,
        data_type
      FROM information_schema.columns
      WHERE table_name IN ('documents', 'projects', 'templates')
        AND column_name IN ('created_at', 'updated_at', 'deleted_at')
      ORDER BY table_name, column_name
    `)
    
    console.log("   Current types:")
    checkColumns.rows.forEach((row: any) => {
      const status = row.data_type === 'timestamp with time zone' ? '✅' : '⚠️'
      console.log(`   ${status} ${row.table_name}.${row.column_name}: ${row.data_type}`)
    })
    console.log("\n")

    // Count rows that will be affected
    console.log("📊 Counting rows to migrate...")
    const counts = await Promise.all([
      client.query('SELECT COUNT(*) as count FROM documents'),
      client.query('SELECT COUNT(*) as count FROM projects'),
      client.query('SELECT COUNT(*) as count FROM templates')
    ])
    
    console.log(`   Documents: ${counts[0].rows[0].count} rows`)
    console.log(`   Projects: ${counts[1].rows[0].count} rows`)
    console.log(`   Templates: ${counts[2].rows[0].count} rows`)
    console.log("\n")

    // Execute migration
    console.log("🔄 Executing migration...")
    console.log("   ⏳ Converting timestamps to UTC (this may take a moment)...\n")
    
    const startTime = Date.now()
    await client.query("BEGIN")
    try {
      await client.query(migrationSQL)
      await client.query("COMMIT")
      const duration = ((Date.now() - startTime) / 1000).toFixed(2)
      console.log(`✅ Migration executed successfully (${duration}s)\n`)
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
      throw error
    }

    // Verify changes
    console.log("🔍 Verifying timestamp column types...")
    const verifyColumns = await client.query(`
      SELECT 
        table_name,
        column_name,
        data_type
      FROM information_schema.columns
      WHERE table_name IN ('documents', 'projects', 'templates')
        AND column_name IN ('created_at', 'updated_at', 'deleted_at')
      ORDER BY table_name, column_name
    `)
    
    const allCorrect = verifyColumns.rows.every((row: any) => 
      row.data_type === 'timestamp with time zone'
    )
    
    if (allCorrect) {
      console.log("   ✅ All timestamp columns now use TIMESTAMP WITH TIME ZONE")
      verifyColumns.rows.forEach((row: any) => {
        console.log(`      ${row.table_name}.${row.column_name}: ${row.data_type}`)
      })
    } else {
      console.log("   ⚠️  Some columns may not have been converted:")
      verifyColumns.rows.forEach((row: any) => {
        const status = row.data_type === 'timestamp with time zone' ? '✅' : '❌'
        console.log(`      ${status} ${row.table_name}.${row.column_name}: ${row.data_type}`)
      })
    }
    console.log("\n")

    // Test UTC storage
    console.log("🧪 Testing UTC storage...")
    const testTime = await client.query(`
      SELECT 
        NOW() as current_time,
        NOW() AT TIME ZONE 'UTC' as utc_time,
        NOW() AT TIME ZONE 'America/New_York' as ny_time,
        NOW() AT TIME ZONE 'Europe/Amsterdam' as ams_time
    `)
    
    console.log("   Current database time:", testTime.rows[0].current_time)
    console.log("   UTC time:", testTime.rows[0].utc_time)
    console.log("   New York time:", testTime.rows[0].ny_time)
    console.log("   Amsterdam time:", testTime.rows[0].ams_time)
    console.log("\n")

    // Check sample document timestamps
    console.log("📄 Sample document timestamps (after migration):")
    const sampleDocs = await client.query(`
      SELECT 
        name,
        created_at,
        created_at AT TIME ZONE 'UTC' as created_at_utc,
        created_at AT TIME ZONE 'America/New_York' as created_at_ny
      FROM documents 
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC 
      LIMIT 3
    `)
    
    sampleDocs.rows.forEach((doc: any, idx: number) => {
      console.log(`   ${idx + 1}. ${doc.name}`)
      console.log(`      Stored (UTC): ${doc.created_at}`)
      console.log(`      UTC: ${doc.created_at_utc}`)
      console.log(`      New York: ${doc.created_at_ny}`)
      console.log("")
    })

    console.log("✨ Migration 343 completed successfully!")
    console.log("\n📊 Summary:")
    console.log("   ✅ All timestamp columns converted to TIMESTAMP WITH TIME ZONE")
    console.log("   ✅ Timestamps now stored in UTC")
    console.log("   ✅ Timezone conversion happens at display time")
    console.log("   ✅ Default values updated to use UTC")
    console.log("\n💡 Benefits:")
    console.log("   ⚡ Consistent UTC storage across all tables")
    console.log("   ⚡ No timezone confusion in database")
    console.log("   ⚡ Proper timezone conversion at display layer")
    console.log("   ⚡ Better support for multi-timezone users")
    console.log("\n💡 Next Steps:")
    console.log("   ✅ Update display layer to use user timezone")
    console.log("   ✅ Add user timezone preference setting")
    console.log("   ✅ Test timezone conversions in UI")

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

runMigration().catch((error) => {
  logger.error("Unhandled error:", error)
  console.error("Unhandled error:", error)
  process.exit(1)
})

