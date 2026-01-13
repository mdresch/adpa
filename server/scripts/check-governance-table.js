const fs = require('fs')
const path = require('path')
const dotenv = require('dotenv')
dotenv.config({ path: path.resolve(__dirname, '..', '.env') })
const { Pool } = require('pg')

async function run() {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL
  console.log('Using DB connection:', connectionString ? connectionString.substring(0, 60) + '...' : 'NONE')
  if (!connectionString) process.exit(2)

  const pool = new Pool({ connectionString, ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false })
  try {
    const dbRes = await pool.query('SELECT current_database() as db, current_user as user')
    console.log('Connected to database:', dbRes.rows[0].db, 'as user:', dbRes.rows[0].user)

    const allTables = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name")
    console.log('Public tables count:', allTables.rows.length)

    // Check migration tracking if available
    try {
      const migrations = await pool.query("SELECT migration_number, executed_at FROM schema_migrations ORDER BY executed_at DESC LIMIT 10")
      console.log('Recent migrations (if schema_migrations exists):')
      migrations.rows.forEach(r => console.log(` - ${r.migration_number} @ ${r.executed_at}`))
    } catch (e) {
      // ignore if schema_migrations missing
    }

    const tbl = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='governance_decisions'")
    if (!tbl.rows || tbl.rows.length === 0) {
      console.log('Table governance_decisions: NOT FOUND')
      process.exit(0)
    }

    console.log('Table governance_decisions: FOUND')
    const cols = await pool.query("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='governance_decisions' ORDER BY ordinal_position")
    console.log('Columns:')
    cols.rows.forEach(r => console.log(` - ${r.column_name}: ${r.data_type} (${r.is_nullable})`))
  } catch (err) {
    console.error('Error checking table:', err.message || err)
    process.exit(3)
  } finally {
    try { await pool.end() } catch (e) {}
  }
}

run()
