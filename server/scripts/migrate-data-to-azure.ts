/**
 * One-time data cutover: copies table data from the legacy Supabase Postgres
 * (SUPABASE_SYNC_SOURCE_URL) into the Azure Database for PostgreSQL instance
 * (DATABASE_URL). Schema must already exist on the Azure side (see
 * `pnpm migrate`) -- this script only moves rows, via binary COPY.
 *
 * Usage: cd server && npx tsx scripts/migrate-data-to-azure.ts
 */

import { Pool, PoolClient } from 'pg'
import { to as copyTo, from as copyFrom } from 'pg-copy-streams'
import { pipeline } from 'stream/promises'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env') })

// Azure's own migration tracking (different tool/shape than whatever Supabase used) --
// never copy this, it would corrupt run-migrations.ts's bookkeeping.
const EXCLUDED_TABLES = new Set(['schema_migrations'])

// Tables already seeded by our own migrations with natural (non-random) primary
// keys, where Supabase's real accumulated data should win over our zeroed seed.
const TRUNCATE_BEFORE_COPY = new Set(['draco_rotation_state'])

// Resumability: skip a table if the destination already has at least this many
// rows (assume a prior run completed it -- COPY is all-or-nothing per statement,
// so any row count reaching this threshold implies a full, not partial, copy).
// Default 1; a couple of tables get migration-seeded rows before this script
// ever runs, so their threshold accounts for that seed count.
const SKIP_IF_ROWS_AT_LEAST: Record<string, number> = {
  approval_workflows: 2, // 1 seed row (migration 426) doesn't count as "already copied"
}
function skipThreshold(table: string): number {
  return SKIP_IF_ROWS_AT_LEAST[table] ?? 1
}

interface TableResult {
  table: string
  rows: number
  error?: string
}

async function getSourceTables(source: Pool): Promise<string[]> {
  const res = await source.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`
  )
  return res.rows
    .map((r) => r.tablename as string)
    .filter((t) => !t.startsWith('morphic_') && !EXCLUDED_TABLES.has(t))
}

async function getColumns(pool: Pool, table: string): Promise<string[]> {
  const res = await pool.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1
     ORDER BY ordinal_position`,
    [table]
  )
  return res.rows.map((r) => r.column_name as string)
}

/** Generated columns can't appear in an explicit COPY column list on either side --
 * Postgres rejects them in COPY TO's column list, not just COPY FROM/INSERT. */
async function getGeneratedColumns(client: Pool | PoolClient, table: string): Promise<Set<string>> {
  const res = await client.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND is_generated = 'ALWAYS'`,
    [table]
  )
  return new Set(res.rows.map((r) => r.column_name as string))
}

async function getSerialColumns(pool: Pool, table: string): Promise<string[]> {
  const res = await pool.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1
       AND column_default LIKE 'nextval(%'`,
    [table]
  )
  return res.rows.map((r) => r.column_name as string)
}

const COPY_TIMEOUT_MS = 2 * 60 * 1000 // no table we're moving should legitimately take this long

class CopyTimeoutError extends Error {
  constructor(table: string) {
    super(`COPY of ${table} did not complete within ${COPY_TIMEOUT_MS}ms`)
  }
}

async function copyTable(
  source: Pool,
  sourceClient: PoolClient,
  destClient: PoolClient,
  table: string
): Promise<TableResult> {
  const quotedTable = `public."${table}"`

  const existingRes = await destClient.query(`SELECT COUNT(*) FROM ${quotedTable}`)
  const existingCount = parseInt(existingRes.rows[0].count, 10)
  if (!TRUNCATE_BEFORE_COPY.has(table) && existingCount >= skipThreshold(table)) {
    return { table, rows: existingCount }
  }

  const allCols = await getColumns(source, table)
  const [sourceGenerated, destGenerated] = await Promise.all([
    getGeneratedColumns(sourceClient, table),
    getGeneratedColumns(destClient, table),
  ])
  const cols = allCols.filter((c) => !sourceGenerated.has(c) && !destGenerated.has(c))
  const colList = cols.map((c) => `"${c}"`).join(', ')

  if (TRUNCATE_BEFORE_COPY.has(table)) {
    await destClient.query(`TRUNCATE TABLE ${quotedTable}`)
  }

  const sourceStream = sourceClient.query(
    copyTo(`COPY ${quotedTable} (${colList}) TO STDOUT WITH (FORMAT binary)`)
  )
  const destStream = destClient.query(
    copyFrom(`COPY ${quotedTable} (${colList}) FROM STDIN WITH (FORMAT binary)`)
  )

  let timer: NodeJS.Timeout
  await Promise.race([
    pipeline(sourceStream, destStream),
    new Promise((_, reject) => {
      timer = setTimeout(() => {
        sourceStream.destroy()
        destStream.destroy()
        reject(new CopyTimeoutError(table))
      }, COPY_TIMEOUT_MS)
    }),
  ]).finally(() => clearTimeout(timer))

  const serialCols = await getSerialColumns(source, table)
  for (const col of serialCols) {
    await destClient.query(
      `SELECT setval(pg_get_serial_sequence($1, $2), COALESCE((SELECT MAX("${col}") FROM ${quotedTable}), 1))`,
      [quotedTable, col]
    )
  }

  const countRes = await destClient.query(`SELECT COUNT(*) FROM ${quotedTable}`)
  return { table, rows: parseInt(countRes.rows[0].count, 10) }
}

function isConnectionError(err: any): boolean {
  if (err instanceof CopyTimeoutError) return true
  const code = String(err?.code ?? '')
  const message = String(err?.message ?? '')
  return (
    code === 'ECONNRESET' ||
    code === '57P01' ||
    message.includes('ECONNRESET') ||
    message.includes('Connection terminated') ||
    message.includes('terminated unexpectedly')
  )
}

/** Best-effort: kill a stuck backend from a fresh connection so a timed-out
 * COPY doesn't leave a zombie session holding locks after we move on. */
async function terminateBackend(pool: Pool, pid: number | undefined) {
  if (!pid) return
  try {
    const client = await pool.connect()
    try {
      await client.query('SELECT pg_terminate_backend($1)', [pid])
    } finally {
      client.release()
    }
  } catch {
    // best-effort only
  }
}

async function main() {
  const sourceUrl = process.env.SUPABASE_SYNC_SOURCE_URL
  if (!sourceUrl) {
    throw new Error('SUPABASE_SYNC_SOURCE_URL must be set in server/.env')
  }

  const source = new Pool({ connectionString: sourceUrl, ssl: { rejectUnauthorized: false }, max: 3 })
  const destPool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  // Prevent an idle/dropped-connection 'error' event from crashing the whole
  // process (the default Node behavior for an unhandled EventEmitter error).
  source.on('error', (err) => console.warn('[source pool] error event:', err.message))
  destPool.on('error', (err) => console.warn('[dest pool] error event:', err.message))

  const tables = await getSourceTables(source)
  console.log(`Found ${tables.length} tables to copy (excluding schema_migrations, morphic_*)\n`)

  async function freshClients() {
    const s = await source.connect()
    const d = await destPool.connect()
    await d.query(`SET session_replication_role = 'replica'`)
    const sPid = (await s.query('SELECT pg_backend_pid() as pid')).rows[0].pid
    const dPid = (await d.query('SELECT pg_backend_pid() as pid')).rows[0].pid
    return { s, d, sPid, dPid }
  }

  let { s: sourceClient, d: destClient, sPid, dPid } = await freshClients()

  const results: TableResult[] = []
  for (const table of tables) {
    let attempt = 0
    for (;;) {
      attempt++
      try {
        const result = await copyTable(source, sourceClient, destClient, table)
        results.push(result)
        if (result.rows > 0) console.log(`✅ ${table}: ${result.rows} rows`)
        break
      } catch (err: any) {
        if (isConnectionError(err) && attempt === 1) {
          console.warn(`⚠️  ${table}: ${err.message}, reconnecting and retrying once...`)
          try { sourceClient.release() } catch {}
          try { destClient.release() } catch {}
          // The stuck backends may not notice their client vanished for a
          // while (we saw this happen); explicitly terminate them from a
          // fresh connection so they don't sit holding locks.
          await terminateBackend(source, sPid)
          await terminateBackend(destPool, dPid)
          ;({ s: sourceClient, d: destClient, sPid, dPid } = await freshClients())
          continue
        }
        results.push({ table, rows: 0, error: err.message })
        console.error(`❌ ${table}: ${err.message}`)
        break
      }
    }
  }

  await destClient.query(`SET session_replication_role = 'origin'`)
  destClient.release()
  sourceClient.release()

  const failed = results.filter((r) => r.error)
  const totalRows = results.reduce((sum, r) => sum + r.rows, 0)
  console.log('\n=== SUMMARY ===')
  console.log(`Tables processed: ${results.length}, Failed: ${failed.length}, Total rows copied: ${totalRows}`)
  if (failed.length) {
    console.log('\nFailures:')
    console.log(JSON.stringify(failed, null, 2))
  }

  await source.end()
  await destPool.end()

  if (failed.length) process.exit(1)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
