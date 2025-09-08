import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { pool } from './connection'

async function run() {
  try {
    console.log('Migration direct runner: resolving path...')
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = path.dirname(__filename)
    const migrationPath = path.join(__dirname, 'migrations', 'add_openai_enhanced_fields.sql')
    console.log('Migration direct runner: reading SQL from', migrationPath)
    const sql = fs.readFileSync(migrationPath, 'utf8')

    console.log('Migration direct runner: executing SQL...')
    const res = await pool.query(sql)
    console.log('Migration direct runner: query result:', res && typeof res.rowCount !== 'undefined' ? `rowCount=${res.rowCount}` : 'ok')

    // verification
    const verify = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'ai_providers' AND column_name IN ('priority', 'rate_limits')`)
    console.log('Migration direct runner: verify rows:', verify.rows)

    console.log('Migration direct runner: completed successfully')
    process.exit(0)
  } catch (err) {
    console.error('Migration direct runner: failed:', err)
    process.exit(1)
  }
}

run()
