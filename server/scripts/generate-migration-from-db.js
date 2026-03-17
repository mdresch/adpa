const fs = require('fs')
const path = require('path')
const dotenv = require('dotenv')
// Try multiple paths for .env
dotenv.config({ path: path.resolve(__dirname, '../.env') })
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') })
const { Pool } = require('pg')

function sqlEscapeIdent(s) {
  return '"' + String(s).replace(/"/g, '""') + '"'
}

async function run() {
  // Use environment variables exclusively for database credentials
  let poolConfig;
  
  if (process.env.DATABASE_URL || process.env.POSTGRES_URL) {
    poolConfig = {
      connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
      ssl: { rejectUnauthorized: false }
    };
  } else if (process.env.POSTGRES_HOST && process.env.POSTGRES_USER && process.env.POSTGRES_PASSWORD) {
    poolConfig = {
      host: process.env.POSTGRES_HOST,
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DATABASE || 'postgres',
      ssl: { rejectUnauthorized: false }
    };
  } else {
    console.error('❌ Error: No database connection information found in environment variables.')
    console.error('   Please set DATABASE_URL or POSTGRES_HOST/USER/PASSWORD in your .env file.')
    process.exit(1)
  }

  console.log(`Connecting to database at ${poolConfig.host || 'specified URL'}...`)
  const pool = new Pool(poolConfig)

  try {
    const outLines = []
    outLines.push('-- Generated authoritative migration baseline from current DB schema')
    outLines.push('-- Generated on: ' + new Date().toISOString())
    outLines.push('\nSET statement_timeout = 0;')
    outLines.push('SET lock_timeout = 0;')
    outLines.push('SET client_encoding = \'UTF8\';')
    outLines.push('SET standard_conforming_strings = on;')
    outLines.push('SET check_function_bodies = false;')
    outLines.push('SET xmloption = content;')
    outLines.push('SET client_min_messages = warning;')
    outLines.push('SET row_security = off;')
    outLines.push('\nBEGIN;')

    // 1. Extensions (Soft-fail and Shim)
    outLines.push('\n-- Supabase Compatibility Shim')
    outLines.push('DO $$ ')
    outLines.push('BEGIN')
    outLines.push("  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'http_header') THEN")
    outLines.push("    CREATE TYPE public.http_header AS (field text, value text);")
    outLines.push('  END IF;')
    outLines.push("  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'http_request') THEN")
    outLines.push("    CREATE TYPE public.http_request AS (method text, url text, headers public.http_header[], content_type text, content text);")
    outLines.push('  END IF;')
    outLines.push("  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'http_response') THEN")
    outLines.push("    CREATE TYPE public.http_response AS (status int, content_type text, headers public.http_header[], content text);")
    outLines.push('  END IF;')
    outLines.push("  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vector') THEN")
    outLines.push("    CREATE TYPE public.vector;")
    outLines.push("    CREATE FUNCTION public.vector_in(cstring) RETURNS public.vector AS 'boolin' LANGUAGE internal IMMUTABLE STRICT;")
    outLines.push("    CREATE FUNCTION public.vector_out(public.vector) RETURNS cstring AS 'boolout' LANGUAGE internal IMMUTABLE STRICT;")
    outLines.push("    CREATE TYPE public.vector (INPUT = public.vector_in, OUTPUT = public.vector_out, INTERNALLENGTH = VARIABLE, ALIGNMENT = double);")
    outLines.push('  END IF;')
    outLines.push('END $$;')
    outLines.push('\nCREATE OR REPLACE FUNCTION public.http_header(field text, value text) RETURNS public.http_header AS $$ BEGIN RETURN (field, value)::public.http_header; END; $$ LANGUAGE plpgsql;')
    outLines.push('CREATE OR REPLACE FUNCTION public.http(req public.http_request) RETURNS public.http_response AS $$ BEGIN RETURN (500, null, null, null)::public.http_response; END; $$ LANGUAGE plpgsql;')

    const extensionsRes = await pool.query("SELECT extname FROM pg_extension WHERE extname NOT IN ('plpgsql')")
    if (extensionsRes.rows.length > 0) {
      outLines.push('\n-- Extensions')
      for (const ext of extensionsRes.rows) {
        outLines.push(`DO $$ BEGIN CREATE EXTENSION IF NOT EXISTS "${ext.extname}"; EXCEPTION WHEN OTHERS THEN RAISE WARNING 'Extension ${ext.extname} not available, using shim if needed'; END $$;`)
      }
    }

    // 2. Types (Enums, etc.)
    const typesRes = await pool.query(`
      SELECT n.nspname as schema, t.typname as name, e.enumlabel as label
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid  
      JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
      ORDER BY n.nspname, t.typname, e.enumsortorder
    `)
    if (typesRes.rows.length > 0) {
      outLines.push('\n-- Custom Types')
      const enums = {}
      typesRes.rows.forEach(r => {
        if (!enums[r.name]) enums[r.name] = []
        enums[r.name].push(`'${r.label}'`)
      })
      for (const [name, labels] of Object.entries(enums)) {
        outLines.push(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${name}') THEN CREATE TYPE public.${sqlEscapeIdent(name)} AS ENUM (${labels.join(', ')}); END IF; END $$;`)
      }
    }

    // 3. Sequences
    const sequencesRes = await pool.query("SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public'")
    if (sequencesRes.rows.length > 0) {
      outLines.push('\n-- Sequences')
      for (const seq of sequencesRes.rows) {
        outLines.push(`CREATE SEQUENCE IF NOT EXISTS public.${sqlEscapeIdent(seq.sequence_name)};`)
      }
    }

    // 4. Tables
    const tablesRes = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' AND table_name NOT IN ('schema_migrations') ORDER BY table_name")
    for (const row of tablesRes.rows) {
      const table = row.table_name
      outLines.push(`\n-- Table: ${table}`)
      const cols = await pool.query("SELECT column_name, data_type, is_nullable, column_default, character_maximum_length, numeric_precision, udt_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position", [table])

      const colDefs = cols.rows.map(c => {
        let type = c.data_type
        if (c.data_type === 'character varying' && c.character_maximum_length) type = `character varying(${c.character_maximum_length})`
        if (c.data_type === 'USER-DEFINED') type = `public.${sqlEscapeIdent(c.udt_name)}`
        if (c.data_type === 'numeric' && c.numeric_precision) type = `numeric(${c.numeric_precision})`
        if (c.data_type === 'ARRAY') {
          let baseType = c.udt_name.startsWith('_') ? c.udt_name.substring(1) : c.udt_name;
          if (baseType === 'int4') baseType = 'integer';
          if (baseType === 'int8') baseType = 'bigint';
          if (baseType === 'bool') baseType = 'boolean';
          type = `${baseType}[]`;
        }
        
        let def = `  ${sqlEscapeIdent(c.column_name)} ${type}`
        if (c.column_default) def += ` DEFAULT ${c.column_default}`
        if (c.is_nullable === 'NO') def += ' NOT NULL'
        return def
      })

      // Capture Primary and Unique constraints
      const constraintsRes = await pool.query(`
        SELECT pg_get_constraintdef(c.oid) as def 
        FROM pg_constraint c 
        JOIN pg_class t ON c.conrelid = t.oid 
        JOIN pg_namespace n ON t.relnamespace = n.oid
        WHERE c.contype IN ('p', 'u') AND t.relname=$1 AND n.nspname='public'
      `, [table])
      const constraintDefs = [...new Set(constraintsRes.rows.map(r => r.def))]

      outLines.push(`CREATE TABLE IF NOT EXISTS public.${sqlEscapeIdent(table)} (`)
      outLines.push(colDefs.join(',\n'))
      if (constraintDefs.length > 0) {
        outLines.push(',')
        outLines.push(constraintDefs.map(d => '  ' + d).join(',\n'))
      }
      outLines.push(');')
      
      const rlsRes = await pool.query(`SELECT relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = $1`, [table])
      if (rlsRes.rows.length > 0 && rlsRes.rows[0].relrowsecurity) {
        outLines.push(`ALTER TABLE public.${sqlEscapeIdent(table)} ENABLE ROW LEVEL SECURITY;`)
      }
    }

    // 5. Constraints (Foreign Keys)
    outLines.push('\n-- Foreign Key Constraints')
    for (const row of tablesRes.rows) {
      const table = row.table_name
      const fkRes = await pool.query(`SELECT conname, pg_get_constraintdef(c.oid) as def FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid JOIN pg_namespace n ON t.relnamespace = n.oid WHERE c.contype='f' AND t.relname=$1 AND n.nspname='public'`, [table])
      for (const fk of fkRes.rows) {
        outLines.push(`ALTER TABLE public.${sqlEscapeIdent(table)} ADD CONSTRAINT ${sqlEscapeIdent(fk.conname)} ${fk.def};`)
      }
    }

    // 6. Indexes
    outLines.push('\n-- Indexes')
    for (const row of tablesRes.rows) {
      const idxRes = await pool.query(`SELECT indexname, indexdef FROM pg_indexes WHERE schemaname='public' AND tablename=$1 AND indexname NOT LIKE '%_pkey'`, [row.table_name])
      for (const idx of idxRes.rows) {
        outLines.push(idx.indexdef + ';')
      }
    }

    // 7. Functions
    const funcsRes = await pool.query(`
      SELECT p.proname, pg_get_functiondef(p.oid) as def
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
      AND p.prokind = 'f'
    `)
    if (funcsRes.rows.length > 0) {
      outLines.push('\n-- Functions')
      for (const func of funcsRes.rows) {
        outLines.push(func.def + ';')
      }
    }

    // 8. Views
    const viewsRes = await pool.query("SELECT table_name, view_definition FROM information_schema.views WHERE table_schema = 'public'")
    if (viewsRes.rows.length > 0) {
      outLines.push('\n-- Views')
      for (const view of viewsRes.rows) {
        outLines.push(`CREATE OR REPLACE VIEW public.${sqlEscapeIdent(view.table_name)} AS\n${view.view_definition};`)
      }
    }

    // 9. Triggers
    const triggersRes = await pool.query(`
      SELECT tgname, pg_get_triggerdef(t.oid) as def
      FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE n.nspname = 'public'
      AND t.tgisinternal = false
    `)
    if (triggersRes.rows.length > 0) {
      outLines.push('\n-- Triggers')
      for (const trig of triggersRes.rows) {
        outLines.push(trig.def + ';')
      }
    }

    // 10. RLS Policies
    const policiesRes = await pool.query(`
      SELECT tablename, policyname, cmd, qual, with_check, roles
      FROM pg_policies
      WHERE schemaname = 'public'
    `)
    if (policiesRes.rows.length > 0) {
      outLines.push('\n-- RLS Policies')
      for (const pol of policiesRes.rows) {
        let polSql = `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = '${pol.tablename}' AND policyname = '${pol.policyname}') THEN `
        polSql += `CREATE POLICY ${sqlEscapeIdent(pol.policyname)} ON public.${sqlEscapeIdent(pol.tablename)} `
        if (pol.cmd && pol.cmd !== 'ALL') polSql += `FOR ${pol.cmd} `
        if (pol.roles) {
          const rolesArray = Array.isArray(pol.roles) ? pol.roles : (typeof pol.roles === 'string' ? pol.roles.replace(/[{}]/g, '').split(',') : []);
          if (rolesArray.length > 0 && rolesArray[0] !== 'public') polSql += `TO ${rolesArray.join(', ')} `
        }
        if (pol.qual) polSql += `USING (${pol.qual}) `
        if (pol.with_check) polSql += `WITH CHECK (${pol.with_check}) `
        polSql += `; END IF; END $$;`
        outLines.push(polSql)
      }
    }

    outLines.push('\nCOMMIT;')

    const outPath = path.resolve(__dirname, '..', 'migrations', '000_baseline.sql')
    fs.writeFileSync(outPath, outLines.join('\n'))
    console.log('✅ Successfully wrote authoritative baseline to', outPath)
  } catch (err) {
    console.error('❌ Failed to generate migration:', err.message || err)
    process.exit(2)
  } finally {
    try { await pool.end() } catch (e) {}
  }
}

run()
