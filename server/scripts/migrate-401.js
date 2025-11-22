// server/scripts/migrate-401.js
// Run migration 401_add_parent_id_to_project_tasks.sql using node-postgres

const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

// Load environment variables from server/.env if present (fallback to repo root .env)
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })
require('dotenv').config()

const MIGRATION_FILE = path.join(__dirname, '..', 'migrations', '401_add_parent_id_to_project_tasks.sql')

async function runMigration() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error('DATABASE_URL environment variable is not set. Check server/.env or your environment and retry.')
    process.exit(1)
  }

  if (!fs.existsSync(MIGRATION_FILE)) {
    console.error(`Migration file not found: ${MIGRATION_FILE}`)
    process.exit(1)
  }

  const sql = fs.readFileSync(MIGRATION_FILE, 'utf8')
  const client = new Client({ connectionString: databaseUrl })

  try {
    await client.connect()
    console.log(`Applying migration: ${path.basename(MIGRATION_FILE)}`)
    await client.query(sql)
    console.log('Migration 401 applied successfully.')
  } catch (err) {
    console.error('Migration failed:', err)
    process.exit(1)
  } finally {
    await client.end()
  }
}

if (require.main === module) {
  runMigration()
}

module.exports = runMigration
