#!/usr/bin/env ts-node
/**
 * Verify constraints deduplication: no duplicate constraints by (project_id, normalized title/name).
 * Normalization matches extraction and migration 670: lower(trim(coalesce(title, name))).
 *
 * Usage: npm run verify:constraints-dedup
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
        FROM constraints
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
        `SELECT 1 FROM migrations WHERE name = '670_deduplicate_constraints' LIMIT 1`
      );
      migrationApplied = (m.rowCount ?? 0) > 0;
    } catch {
      /* migrations table may not exist */
    }

    console.log('[verify-constraints-dedup] Constraints deduplication verification');
    console.log('[verify-constraints-dedup] ---------------------------------------');
    console.log(`  Duplicate groups (project_id + norm_key): ${duplicateGroups}`);
    console.log(`  Total duplicate rows in those groups:     ${totalDupRows}`);
    console.log(`  Migration 670 applied:                     ${migrationApplied ? 'yes' : 'unknown/no'}`);
    console.log('[verify-constraints-dedup] ---------------------------------------');

    if (duplicateGroups === 0) {
      console.log('[verify-constraints-dedup] OK: No duplicate constraints by (project_id, normalized title).');
      process.exit(0);
    } else {
      console.log(
        `[verify-constraints-dedup] FAIL: ${duplicateGroups} duplicate group(s), ${totalDupRows} extra row(s). Run migration 670 or fix manually.`
      );
      if (dupRes.rows?.length) {
        console.log('[verify-constraints-dedup] Example groups:');
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
  console.error('[verify-constraints-dedup] Error:', err.message || err);
  process.exit(1);
});
