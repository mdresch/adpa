#!/usr/bin/env ts-node
/**
 * Migration 672: Add gkg_context_strategy JSONB column to templates.
 *
 * Usage: npm run migrate:672 [-- --dry-run] [-- --verbose]
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const MIGRATION_NAME = '672_add_template_gkg_context_strategy';
const MIGRATION_FILE = path.join(__dirname, '..', 'migrations', '672_add_template_gkg_context_strategy.sql');
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
  console.log(`[672] ${msg}`);
}

async function run() {
  const client = await pool.connect();
  try {
    log('Add gkg_context_strategy to templates');
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
      log('Dry run: would execute gkg_context_strategy migration.');
      return;
    }

    log('Executing migration...');
    const start = Date.now();
    await client.query(sql);
    await client.query(`INSERT INTO migrations (name) VALUES ($1)`, [MIGRATION_NAME]);
    log(`Done in ${Date.now() - start}ms.`);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error('[672] Migration failed:', err.message || err);
  process.exit(1);
});
