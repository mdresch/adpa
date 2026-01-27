#!/usr/bin/env ts-node
/**
 * Migration 665: extracted_dt_assets + source traceability on digital_twin_assets
 * Creates extracted_dt_assets table, adds source_document_id/source_entity_id to digital_twin_assets.
 *
 * Usage: npm run migrate:665 [-- --dry-run] [-- --verbose]
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MIGRATION_NAME = '665_extracted_dt_assets_and_source_traceability';
const MIGRATION_FILE = path.join(__dirname, '..', 'migrations', '665_extracted_dt_assets_and_source_traceability.sql');
const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const ssl =
  connectionString && (connectionString.includes('supabase') || connectionString.includes('neon'))
    ? { rejectUnauthorized: false }
    : false;

const pool = new Pool({
  connectionString,
  ssl: connectionString ? ssl : false,
});

function log(msg: string) {
  console.log(`[665] ${msg}`);
}

async function run() {
  const client = await pool.connect();
  try {
    log('extracted_dt_assets + DT source traceability (migration 665)');
    log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const check = await client.query(
      `SELECT 1 FROM migrations WHERE name = $1`,
      [MIGRATION_NAME]
    );
    if (check.rowCount && check.rowCount > 0) {
      log('Already applied, skipping.');
      return;
    }

    if (!fs.existsSync(MIGRATION_FILE)) {
      throw new Error(`Migration file not found: ${MIGRATION_FILE}`);
    }
    const sql = fs.readFileSync(MIGRATION_FILE, 'utf8');
    if (VERBOSE) log(`SQL length: ${sql.length}`);

    if (DRY_RUN) {
      log('Dry run: would execute migration SQL.');
      return;
    }

    log('Executing migration...');
    const start = Date.now();
    await client.query(sql);
    await client.query(`INSERT INTO migrations (name) VALUES ($1)`, [MIGRATION_NAME]);
    log(`Done in ${Date.now() - start}ms.`);

    const verify = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'extracted_dt_assets' ORDER BY ordinal_position`
    );
    log(`extracted_dt_assets columns: ${(verify.rows as { column_name: string }[]).map((r) => r.column_name).join(', ')}`);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error('[665] Migration failed:', err.message || err);
  process.exit(1);
});
