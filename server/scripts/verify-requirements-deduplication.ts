#!/usr/bin/env ts-node
/**
 * Verify requirements deduplication: no duplicate requirements by (project_id, normalized title/name).
 * Normalization matches extraction and migration 668: lower(trim(coalesce(title, name))).
 *
 * Usage: npm run verify:requirements-dedup
 */

import { Pool } from 'pg';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const ssl =
  connectionString && (connectionString.includes('supabase') || connectionString.includes('neon'))
    ? { rejectUnauthorized: false }
    : false;

const pool = new Pool({
  connectionString,
  ssl: connectionString ? ssl : false,
});

async function run() {
  const client = await pool.connect();
  try {
    const dupRes = await client.query(`
      SELECT project_id, norm_key, count(*) AS cnt
      FROM (
        SELECT project_id, lower(trim(coalesce(nullif(trim(title), ''), name, 'unnamed'))) AS norm_key
        FROM requirements
        WHERE deleted_at IS NULL
      ) t
      GROUP BY project_id, norm_key
      HAVING count(*) > 1
    `);

    const duplicateGroups = dupRes.rowCount ?? 0;
    const totalDupRows =
      duplicateGroups === 0
        ? 0
        : (dupRes.rows as { project_id: string; norm_key: string; cnt: string }[]).reduce(
            (sum, r) => sum + parseInt(r.cnt, 10),
            0
          );

    let migrationApplied = false;
    try {
      const m = await client.query(
        `SELECT 1 FROM migrations WHERE name = '668_deduplicate_requirements' LIMIT 1`
      );
      migrationApplied = (m.rowCount ?? 0) > 0;
    } catch {
      /* migrations table may not exist */
    }

    console.log('[verify-requirements-dedup] Requirements deduplication verification');
    console.log('[verify-requirements-dedup] -----------------------------------------');
    console.log(`  Duplicate groups (project_id + norm_key): ${duplicateGroups}`);
    console.log(`  Total duplicate rows in those groups:     ${totalDupRows}`);
    console.log(`  Migration 668 applied:                     ${migrationApplied ? 'yes' : 'unknown/no'}`);
    console.log('[verify-requirements-dedup] -----------------------------------------');

    if (duplicateGroups === 0) {
      console.log('[verify-requirements-dedup] OK: No duplicate requirements by (project_id, normalized title).');
      process.exit(0);
    } else {
      console.log(
        `[verify-requirements-dedup] FAIL: ${duplicateGroups} duplicate group(s), ${totalDupRows} extra row(s). Run migration 668 or fix manually.`
      );
      if (dupRes.rows?.length) {
        console.log('[verify-requirements-dedup] Example groups:');
        (dupRes.rows as { project_id: string; norm_key: string; cnt: string }[])
          .slice(0, 5)
          .forEach((r) => console.log(`    project_id=${r.project_id} norm_key="${r.norm_key}" count=${r.cnt}`));
      }
      process.exit(1);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error('[verify-requirements-dedup] Error:', err.message || err);
  process.exit(1);
});
