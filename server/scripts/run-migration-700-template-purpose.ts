import dotenv from "dotenv"
import * as fs from "fs"
import * as path from "path"
import { connectDatabase, getDatabasePool } from "../src/database/connection"
import { logger } from "../src/utils/logger"

// Load environment variables for local/dev
if (process.env.NODE_ENV !== "production") {
  dotenv.config()
}

async function runMigration700() {
  try {
    logger.info("[MIGRATION-700] Connecting to database...")
    await connectDatabase()
    logger.info("[MIGRATION-700] Database connected successfully")
  } catch (error) {
    logger.error("[MIGRATION-700] Failed to connect to database:", error)
    throw error
  }

  const pool = getDatabasePool()
  const client = await pool.connect()

  try {
    console.log("🚀 Running Migration 700: Template/Document Purpose Aggregation")

    const migrationPath = path.join(
      __dirname,
      "../src/database/migrations/add_template_purpose_analytics.sql"
    )

    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`)
    }

    const migrationSql = fs.readFileSync(migrationPath, "utf8")

    // Show a quick preview of current documents columns relevant to this migration
    const columnCheck = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'documents'
        AND column_name IN ('inferred_primary_domain', 'inferred_secondary_domains', 'entity_counts')
      ORDER BY column_name;
    `)

    console.log("\n📊 Current documents columns (before migration):")
    if (columnCheck.rows.length === 0) {
      console.log("   No inferred_* or entity_counts columns found on documents (expected for first run).")
    } else {
      columnCheck.rows.forEach((row: any) => {
        console.log(
          `   ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable}, default: ${
            row.column_default || "none"
          })`
        )
      })
    }

    console.log("\n📄 Executing migration SQL (add_template_purpose_analytics.sql)...")
    await client.query(migrationSql)
    console.log("✅ Migration SQL executed successfully")

    // Verify documents columns after migration
    const verifyDocs = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'documents'
        AND column_name IN ('inferred_primary_domain', 'inferred_secondary_domains', 'entity_counts')
      ORDER BY column_name;
    `)

    console.log("\n✅ Verification: documents.inferred_* and entity_counts")
    verifyDocs.rows.forEach((row: any) => {
      console.log(
        `   ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable}, default: ${
          row.column_default || "none"
        })`
      )
    })

    // Verify template_entity_profile table exists
    const templateProfileCheck = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'template_entity_profile'
      ORDER BY ordinal_position;
    `)

    console.log("\n✅ Verification: template_entity_profile schema")
    if (templateProfileCheck.rows.length === 0) {
      console.log("   WARNING: template_entity_profile table not found.")
    } else {
      templateProfileCheck.rows.forEach((row: any) => {
        console.log(`   ${row.column_name}: ${row.data_type}`)
      })
    }

    // Check that helper views exist
    const viewCheck = await client.query(`
      SELECT table_name, table_type
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('document_entity_counts', 'aggregated_template_entity_view')
      ORDER BY table_name;
    `)

    console.log("\n✅ Verification: helper views")
    if (viewCheck.rows.length === 0) {
      console.log("   WARNING: helper views not found (document_entity_counts / aggregated_template_entity_view).")
    } else {
      viewCheck.rows.forEach((row: any) => {
        console.log(`   ${row.table_name}: ${row.table_type}`)
      })
    }

    console.log("\n✨ Migration 700 completed successfully!")
    console.log("Next steps:")
    console.log("  - Run a project extraction to populate documents.entity_counts and inferred_*_domain.")
    console.log("  - Optionally call TemplateAnalyticsService.updateTemplateEntityProfile or the rebuild endpoint.")
  } catch (error: any) {
    logger.error("[MIGRATION-700] Migration error:", error)
    throw error
  } finally {
    client.release()
  }
}

runMigration700()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error("[MIGRATION-700] Migration error:", error)
    process.exit(1)
  })









