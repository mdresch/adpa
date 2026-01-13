const fs = require('fs')
const path = require('path')
const dotenv = require('dotenv')
dotenv.config({ path: path.resolve(__dirname, '..', '.env') })
const { Pool } = require('pg')

function sqlEscapeIdent(s) {
  return '"' + String(s).replace(/"/g, '""') + '"'
}

async function run() {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL
  if (!connectionString) {
    console.error('No DATABASE_URL in env')
    process.exit(1)
  }

  const pool = new Pool({ connectionString, ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false })

  try {
    const tablesRes = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name")
    const outLines = []
    outLines.push('-- Generated migration from current DB schema')
    outLines.push('BEGIN;')

    for (const row of tablesRes.rows) {
      const table = row.table_name
      outLines.push(`\n-- Table: ${table}`)
      const cols = await pool.query("SELECT column_name, data_type, is_nullable, column_default, character_maximum_length, numeric_precision, udt_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position", [table])

      const colDefs = cols.rows.map(c => {
        let type = c.data_type
        if (c.data_type === 'character varying' && c.character_maximum_length) type = `character varying(${c.character_maximum_length})`
        if (c.data_type === 'USER-DEFINED') type = c.udt_name
        let def = `  ${sqlEscapeIdent(c.column_name)} ${type}`
        if (c.column_default) def += ` DEFAULT ${c.column_default}`
        if (c.is_nullable === 'NO') def += ' NOT NULL'
        return def
      })

      // Get primary key constraint
      const pkRes = await pool.query(`SELECT pg_get_constraintdef(c.oid) as def FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid WHERE c.contype='p' AND t.relname=$1`, [table])
      const pkDefs = pkRes.rows.map(r => r.def)

      // Get foreign keys
      const fkRes = await pool.query(`SELECT pg_get_constraintdef(c.oid) as def FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid WHERE c.contype='f' AND t.relname=$1`, [table])
      const fkDefs = fkRes.rows.map(r => r.def)

      outLines.push(`CREATE TABLE IF NOT EXISTS public.${sqlEscapeIdent(table)} (`)
      outLines.push(colDefs.join(',\n'))
      if (pkDefs.length > 0 || fkDefs.length > 0) {
        outLines.push(',')
        const cons = pkDefs.concat(fkDefs).map(d => '  ' + d)
        outLines.push(cons.join(',\n'))
      }
      outLines.push(');')

      // Indexes
      const idxRes = await pool.query(`SELECT indexname, indexdef FROM pg_indexes WHERE schemaname='public' AND tablename=$1`, [table])
      for (const idx of idxRes.rows) {
        outLines.push(idx.indexdef + ';')
      }
    }

    outLines.push('\nCOMMIT;')

    const outPath = path.resolve(__dirname, '..', 'migrations', '062_db_schema_dump.sql')
    fs.writeFileSync(outPath, outLines.join('\n'))
    console.log('Wrote migration to', outPath)
  } catch (err) {
    console.error('Failed to generate migration:', err.message || err)
    process.exit(2)
  } finally {
    try { await pool.end() } catch (e) {}
  }
}

run()
