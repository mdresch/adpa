/**
 * Fix Performance Measurements updated_by field
 * Backfills missing updated_by values with created_by for existing records
 * 
 * Usage:
 *   npm run fix:performance-measurements-updated-by
 *   npx tsx server/scripts/fix-performance-measurements-updated-by.ts
 */

import dotenv from "dotenv"
import { getDatabasePool, connectDatabase } from "../src/database/connection"
import { logger } from "../src/utils/logger"

// Load environment variables
if (process.env.NODE_ENV !== "production") {
  dotenv.config()
}

async function fixPerformanceMeasurementsUpdatedBy() {
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
    console.log("🔧 Fixing Performance Measurements updated_by field")
    console.log("   Backfilling missing updated_by values with created_by\n")

    // Check current state
    console.log("📊 Checking current state...")
    const checkResult = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(updated_by) FILTER (WHERE updated_by IS NOT NULL) as has_updated_by,
        COUNT(*) FILTER (WHERE updated_by IS NULL) as missing_updated_by
      FROM performance_measurements
    `)
    
    const stats = checkResult.rows[0]
    console.log(`   Total records: ${stats.total}`)
    console.log(`   Records with updated_by: ${stats.has_updated_by}`)
    console.log(`   Records missing updated_by: ${stats.missing_updated_by}\n`)

    if (parseInt(stats.missing_updated_by) === 0) {
      console.log("✅ All performance measurements already have updated_by set")
      return
    }

    // Fix records where updated_by is NULL but created_by exists
    console.log("🔄 Updating records with NULL updated_by...")
    const updateResult = await client.query(`
      UPDATE performance_measurements
      SET updated_by = created_by,
          updated_at = COALESCE(updated_at, created_at)
      WHERE updated_by IS NULL 
        AND created_by IS NOT NULL
    `)

    console.log(`   ✅ Updated ${updateResult.rowCount} records\n`)

    // Verify fix
    console.log("🔍 Verifying fix...")
    const verifyResult = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(updated_by) FILTER (WHERE updated_by IS NOT NULL) as has_updated_by,
        COUNT(*) FILTER (WHERE updated_by IS NULL) as missing_updated_by
      FROM performance_measurements
    `)
    
    const verifyStats = verifyResult.rows[0]
    console.log(`   Total records: ${verifyStats.total}`)
    console.log(`   Records with updated_by: ${verifyStats.has_updated_by}`)
    console.log(`   Records missing updated_by: ${verifyStats.missing_updated_by}\n`)

    if (parseInt(verifyStats.missing_updated_by) === 0) {
      console.log("✨ All performance measurements now have updated_by set!")
    } else {
      console.log(`⚠️  ${verifyStats.missing_updated_by} records still missing updated_by (likely missing created_by as well)`)
    }

    console.log("\n💡 Next steps:")
    console.log("   - Re-run extraction to populate success_criterion_id and source_document_id")
    console.log("   - Check frontend to verify updated_by displays correctly")

  } catch (error: any) {
    logger.error("Fix failed:", error)
    console.error("\n❌ Fix failed:", error.message)
    if (error.stack) {
      console.error("Stack trace:", error.stack)
    }
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

// Run fix
fixPerformanceMeasurementsUpdatedBy().catch((error) => {
  logger.error("Unhandled error:", error)
  console.error("Unhandled error:", error)
  process.exit(1)
})

