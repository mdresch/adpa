
import { Pool } from 'pg'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

// Load env vars from server/.env
const envPath = path.join(__dirname, '../../server/.env')
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath })
} else {
  // Try loading from root .env
  dotenv.config({ path: path.join(__dirname, '../../.env') })
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
})

async function runMigration() {
  const client = await pool.connect()
  try {
    console.log('Starting migration 357...')

    // Read the SQL file
    const sqlPath = path.join(__dirname, '../../server/migrations/357_add_issue_id_to_mitigation_plans.sql')
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`Migration file not found at ${sqlPath}`)
    }
    const sql = fs.readFileSync(sqlPath, 'utf8')

    await client.query('BEGIN')

    // Execute the SQL
    await client.query(sql)

    // Record migration
    await client.query(
      `INSERT INTO migrations (name, executed_at) VALUES ($1, NOW()) ON CONFLICT DO NOTHING`,
      ['357_add_issue_id_to_mitigation_plans.sql']
    )

    await client.query('COMMIT')

    console.log('Migration 357 completed successfully')
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Migration 357 failed:', error)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

runMigration().catch(console.error)
