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
    console.log("🚀 Running Migration 359: Add Template Scoping Support")

    const migrationPath = path.join(__dirname, "../migrations/359_add_template_scoping.sql")
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`)
    }

    const migrationSql = fs.readFileSync(migrationPath, "utf8")

    // Check current state
    const columnCheck = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'templates' 
      AND column_name IN ('template_scope', 'company_id', 'is_read_only')
      ORDER BY column_name;
    `)

    console.log("\n📊 Current State:")
    const existingColumns = columnCheck.rows.map((r: any) => r.column_name)
    if (existingColumns.length === 0) {
      console.log("   No scoping columns found - will be created")
    } else {
      existingColumns.forEach((col: string) => {
        const colInfo = columnCheck.rows.find((r: any) => r.column_name === col)
        console.log(`   ${col}: ${colInfo?.data_type} (nullable: ${colInfo?.is_nullable})`)
      })
    }

    // Count existing templates
    const templateCount = await client.query(`SELECT COUNT(*) as count FROM templates`)
    const totalTemplates = parseInt(templateCount.rows[0].count)
    console.log(`\n📝 Total templates: ${totalTemplates}`)

    console.log("\n📄 Executing migration SQL...")
    await client.query(migrationSql)
    console.log("✅ Migration SQL executed successfully")

    // Verify creation
    const verifyColumns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'templates' 
      AND column_name IN ('template_scope', 'company_id', 'is_read_only')
      ORDER BY column_name;
    `)

    console.log("\n✅ Verification:")
    verifyColumns.rows.forEach((row: any) => {
      console.log(`   ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable}, default: ${row.column_default || 'none'})`)
    })

    // Check indexes
    const indexCheck = await client.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'templates' 
      AND indexname LIKE '%scope%' OR indexname LIKE '%company%'
      ORDER BY indexname;
    `)
    console.log("\n📑 Indexes created:")
    if (indexCheck.rows.length > 0) {
      indexCheck.rows.forEach((row: any) => {
        console.log(`   ${row.indexname}`)
      })
    } else {
      console.log("   (No scope-related indexes found)")
    }

    // Get template scope distribution
    const scopeDistribution = await client.query(`
      SELECT 
        template_scope,
        COUNT(*) as count,
        COUNT(CASE WHEN is_read_only = true THEN 1 END) as read_only_count
      FROM templates
      GROUP BY template_scope
      ORDER BY template_scope;
    `)
    console.log("\n📊 Template Scope Distribution:")
    scopeDistribution.rows.forEach((row: any) => {
      console.log(`   ${row.template_scope}: ${row.count} templates (${row.read_only_count} read-only)`)
    })

    // Check company-scoped templates
    const companyTemplates = await client.query(`
      SELECT COUNT(*) as count 
      FROM templates 
      WHERE template_scope = 'company' AND company_id IS NOT NULL
    `)
    console.log(`\n🏢 Company-scoped templates: ${companyTemplates.rows[0].count}`)

    console.log("\n✨ Migration 359 completed successfully!")
    console.log("\nNext steps:")
    console.log("  1. Standard templates should be marked with template_scope = 'standard'")
    console.log("  2. Company templates should have template_scope = 'company' and company_id set")
    console.log("  3. User templates should have template_scope = 'user' (default)")
    console.log("  4. Update template API routes to filter by scope and company_id")
    console.log("  5. Update frontend to show template scopes and protect standard templates")

  } catch (error: any) {
    logger.error("Migration error:", error)
    throw error
  } finally {
    client.release()
  }
}

runMigration()
  .then(() => { process.exit(0) })
  .catch((error) => { console.error("Migration error:", error); process.exit(1) })

