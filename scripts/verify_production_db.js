#!/usr/bin/env node
/*
  verify_production_db.js

  Usage:
    Set the DATABASE_URL environment variable, e.g.
      set DATABASE_URL=postgres://user:pass@host:5432/dbname
      node scripts\verify_production_db.js

    Or pass the connection string as the first argument:
      node scripts\verify_production_db.js "postgres://user:pass@host:5432/dbname"

  This script connects to the Postgres database and runs a small set of verification
  queries to confirm that the knowledge-base migration was applied and basic
  sanity checks pass.

  It requires the `pg` package. If not present, install:
    npm install pg
  or
    pnpm add -w pg
*/

const { Client } = require('pg')
const path = require('path')
// Ensure we load the server .env by default so the script can be run without shell quoting
try {
  require('dotenv').config({ path: path.resolve(__dirname, '..', 'server', '.env') })
} catch (e) {
  // ignore if dotenv not present or file missing
}

const connArg = process.argv[2]
const connectionString = connArg || process.env.DATABASE_URL

if (!connectionString) {
  console.error('ERROR: No connection string provided. Set DATABASE_URL or pass it as an argument.')
  process.exit(2)
}

// Configure SSL behavior: respect NODE_TLS_REJECT_UNAUTHORIZED (if set to '0' disable verification)
const rejectUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0'
const clientConfig = {
  connectionString,
}
// If the connection string requests SSL (e.g., sslmode=require) or DB_SSL is true, pass ssl config
if ((process.env.DB_SSL && process.env.DB_SSL !== 'false') || /sslmode=require/.test(connectionString)) {
  clientConfig.ssl = { rejectUnauthorized }
}
const client = new Client(clientConfig)

async function run() {
  try {
    await client.connect()
    console.log('Connected to database')

    // List of verification checks
    const checks = [
      {
        name: 'knowledge_base_entries_table_exists',
        sql: "SELECT to_regclass('public.knowledge_base_entries') IS NOT NULL AS exists",
      },
      {
        name: 'knowledge_base_applications_table_exists',
        sql: "SELECT to_regclass('public.knowledge_base_applications') IS NOT NULL AS exists",
      },
      {
        name: 'knowledge_base_reviews_table_exists',
        sql: "SELECT to_regclass('public.knowledge_base_reviews') IS NOT NULL AS exists",
      },
      {
        name: 'kb_entries_column_list',
        sql: "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='knowledge_base_entries' ORDER BY ordinal_position",
      },
      {
        name: 'kb_entries_index_list',
        sql: "SELECT indexname, indexdef FROM pg_indexes WHERE schemaname='public' AND tablename='knowledge_base_entries'",
      },
      {
        name: 'kb_entries_row_count',
        sql: "SELECT count(*)::bigint AS cnt FROM knowledge_base_entries",
      },
      {
        name: 'kb_applications_row_count',
        sql: "SELECT count(*)::bigint AS cnt FROM knowledge_base_applications",
      },
      {
        name: 'kb_reviews_row_count',
        sql: "SELECT count(*)::bigint AS cnt FROM knowledge_base_reviews",
      },
      {
        name: 'migration_table_present_schema_migrations',
        sql: "SELECT to_regclass('public.schema_migrations') IS NOT NULL AS exists",
      },
      {
        name: 'migration_table_present_migrations',
        sql: "SELECT to_regclass('public.migrations') IS NOT NULL AS exists",
      },
      {
        name: 'sample_kb_search_vector_exists',
        sql: "SELECT indexname FROM pg_indexes WHERE schemaname='public' AND tablename='knowledge_base_entries' AND indexdef ILIKE '%to_tsvector%';",
      },
    ]

    const results = {}

    for (const check of checks) {
      try {
        const res = await client.query(check.sql)
        results[check.name] = res.rows
        console.log(`\n[OK] ${check.name}`)
        // Pretty print small results
        if (res.rows.length === 0) {
          console.log('  (no rows returned)')
        } else if (res.rows.length <= 10) {
          console.table(res.rows)
        } else {
          console.log(`  returned ${res.rows.length} rows (omitted table output)`)
        }
      } catch (err) {
        results[check.name] = { error: err.message }
        console.error(`\n[ERROR] ${check.name}: ${err.message}`)
      }
    }

    // Extra: show foreign key constraints referencing knowledge_base_entries
    try {
      const fkSql = `
        SELECT
          tc.constraint_name, tc.table_name as source_table, kcu.column_name as source_column,
          ccu.table_name AS target_table, ccu.column_name AS target_column
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE constraint_type = 'FOREIGN KEY'
          AND (ccu.table_name = 'knowledge_base_entries' OR kcu.table_name = 'knowledge_base_entries')
      `
      const fkRes = await client.query(fkSql)
      console.log('\n[OK] foreign_key_constraints_related_to_kb_entries')
      console.table(fkRes.rows)
      results['fk_constraints_kb_entries'] = fkRes.rows
    } catch (err) {
      console.error('\n[ERROR] foreign key lookup:', err.message)
      results['fk_constraints_kb_entries'] = { error: err.message }
    }

    await client.end()

    // Write a brief JSON summary to stdout
    console.log('\nVerification summary (JSON):')
    console.log(JSON.stringify(Object.keys(results).reduce((acc, k) => {
      const v = results[k]
      if (Array.isArray(v)) {
        acc[k] = v.length
      } else if (v && typeof v === 'object' && 'error' in v) {
        acc[k] = { error: v.error }
      } else {
        acc[k] = typeof v
      }
      return acc
    }, {}), null, 2))

    process.exit(0)
  } catch (err) {
    console.error('Fatal error during verification:', err)
    try { await client.end() } catch (e) {}
    process.exit(3)
  }
}

run()
