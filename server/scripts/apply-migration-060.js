#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const dotenv = require('dotenv')
dotenv.config({ path: path.resolve(__dirname, '..', '.env') })
const { Pool } = require('pg')

async function run() {
  const migrationPath = path.resolve(__dirname, '..', 'migrations', '060_create_governance_decisions_table.sql')
  if (!fs.existsSync(migrationPath)) {
    console.error('Migration file not found:', migrationPath)
    process.exit(1)
  }

  const sql = fs.readFileSync(migrationPath, 'utf8')

  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL
  if (!connectionString) {
    console.error('No DATABASE_URL or POSTGRES_URL found in environment')
    process.exit(1)
  }

  const pool = new Pool({ connectionString, ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false })

  try {
    console.log('Applying migration 060...')
    await pool.query('BEGIN')
    await pool.query(sql)
    await pool.query('COMMIT')
    console.log('Migration 060 applied successfully')
    process.exit(0)
  } catch (err) {
    console.error('Migration failed:', err.message || err)
    try { await pool.query('ROLLBACK') } catch (e) {}
    process.exit(2)
  } finally {
    try { await pool.end() } catch (e) {}
  }
}

run()
