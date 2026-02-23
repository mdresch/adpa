'use strict'

// Simple Node script to execute a SQL file against DATABASE_URL (PostgreSQL)
// Usage:
//   node scripts/run-sql.js server/migrations/313_knowledge_base_integration.sql
//   node scripts/run-sql.js <path-to-sql> [--dry-run] [--verbose]

const fs = require('fs')
const path = require('path')
const { Client } = require('pg')
require('dotenv').config()

async function main() {
  const args = process.argv.slice(2)
  if (args.length === 0) {
    console.error('Error: Missing SQL file path. Example: node scripts/run-sql.js server/migrations/313_knowledge_base_integration.sql')
    process.exit(1)
  }

  const sqlFile = path.resolve(args[0])
  const dryRun = args.includes('--dry-run')
  const verbose = args.includes('--verbose')

  if (!process.env.DATABASE_URL) {
    console.error('Error: DATABASE_URL is not set in environment.')
    process.exit(1)
  }

  if (!fs.existsSync(sqlFile)) {
    console.error(`Error: SQL file not found: ${sqlFile}`)
    process.exit(1)
  }

  const sql = fs.readFileSync(sqlFile, 'utf8')

  if (verbose) {
    console.log(`[run-sql] Target DB: ${process.env.DATABASE_URL.replace(/:[^:@/]+@/, ':****@')}`)
    console.log(`[run-sql] Executing file: ${sqlFile}`)
  }

  if (dryRun) {
    console.log('[run-sql] --dry-run enabled. SQL was read successfully and would be executed.')
    process.exit(0)
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: /sslmode=require/.test(process.env.DATABASE_URL || '') ? { rejectUnauthorized: false } : undefined })

  const startedAt = Date.now()
  try {
    await client.connect()
    await client.query('BEGIN')
    await client.query(sql)
    await client.query('COMMIT')
    const ms = Date.now() - startedAt
    console.log(`[run-sql] Success: executed ${path.basename(sqlFile)} in ${ms}ms`)
    process.exit(0)
  } catch (err) {
    try { await client.query('ROLLBACK') } catch (_) {}
    console.error('[run-sql] Error executing SQL:', err && err.message ? err.message : err)
    process.exit(2)
  } finally {
    try { await client.end() } catch (_) {}
  }
}

main()


