const { pool } = require("../src/database/connection")
const { readFileSync } = require("fs")
const { join } = require("path")

async function runMigration() {
  try {
    console.log("🚀 Running migration 400: document_jira_links table...")
    
    const migrationSQL = readFileSync(
      join(__dirname, "../src/database/migrations/400_document_jira_links.sql"),
      "utf8"
    )
    
    await pool.query(migrationSQL)
    
    console.log("✅ Migration 400 completed successfully")
    
    // Verify table was created
    const result = await pool.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'document_jira_links'
      ORDER BY ordinal_position
    `)
    
    console.log("📋 Table structure:")
    result.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type}`)
    })
    
  } catch (error) {
    console.error("❌ Migration failed:", error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

runMigration()