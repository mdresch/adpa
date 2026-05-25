/**
 * Sync docs/templates/PMP_8TH_EDITION_REVISED.md → templates.system_prompt in PostgreSQL.
 * Run from repo root: node scripts/sync-pmp8-template-to-db.js
 * Requires DATABASE_URL (see server/.env).
 */
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../server/.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
});

const TEMPLATE_FILE = path.join(__dirname, '../docs/templates/PMP_8TH_EDITION_REVISED.md');

const MATCH_NAMES = [
  'PMBOK 8 Project Management Plan',
  'PMBOK 8th Edition Project Management Plan',
  'Project Management Plan (PMBOK 8)',
];

async function main() {
  const systemPrompt = fs.readFileSync(TEMPLATE_FILE, 'utf8');
  if (!systemPrompt.includes('Signature artifact standard (v2.1)')) {
    console.warn('⚠️  File may not be v2.1 — expected "Signature artifact standard (v2.1)" in content.');
  }

  console.log(`📄 Loaded ${TEMPLATE_FILE} (${systemPrompt.length} chars)\n`);

  for (const name of MATCH_NAMES) {
    const result = await pool.query(
      `UPDATE templates
       SET system_prompt = $1,
           prompt_version = COALESCE(prompt_version, 0) + 1,
           updated_at = NOW()
       WHERE name = $2 AND deleted_at IS NULL
       RETURNING id, name, prompt_version`,
      [systemPrompt, name]
    );
    if (result.rows.length > 0) {
      console.log(`✅ Updated: ${result.rows[0].name} (prompt_version ${result.rows[0].prompt_version})`);
    }
  }

  const fuzzy = await pool.query(
    `UPDATE templates
     SET system_prompt = $1,
         prompt_version = COALESCE(prompt_version, 0) + 1,
         updated_at = NOW()
     WHERE deleted_at IS NULL
       AND (framework ILIKE '%PMBOK%8%' OR name ILIKE '%PMBOK%8%Management Plan%')
       AND category ILIKE '%plan%'
     RETURNING id, name, prompt_version`,
    [systemPrompt]
  );

  if (fuzzy.rows.length === 0) {
    console.log('\n⚠️  No rows matched fuzzy PMBOK 8 planning templates.');
    console.log('   Create or rename a template in the UI, then re-run this script.');
  } else {
    console.log('\n✅ Fuzzy updates:');
    for (const row of fuzzy.rows) {
      console.log(`   - ${row.name} (v${row.prompt_version})`);
    }
  }

  await pool.end();
}

main().catch((err) => {
  console.error('❌', err.message);
  process.exit(1);
});
