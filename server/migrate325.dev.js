// migrate325.dev.js
// Script to apply migration 325_fix_team_agreements_uuid_types.sql in DEV mode (no SSL, .env override)
// Usage: node server/migrate325.dev.js

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env if present
require('dotenv').config();

const MIGRATION_FILE = path.join(__dirname, 'migrations', '325_fix_team_agreements_uuid_types.sql');

async function runMigration() {
  // Force SSL off for dev
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
    ssl: false,
  });

  let sql;
  try {
    sql = fs.readFileSync(MIGRATION_FILE, 'utf8');
  } catch (err) {
    console.error('Failed to read migration file:', err.message);
    process.exit(1);
  }

  try {
    console.log('Running migration 325 in DEV mode (no SSL)...');
    await pool.query(sql);
    console.log('Migration 325 applied successfully (DEV).');
    process.exit(0);
  } catch (err) {
    console.error('Migration 325 failed (DEV):', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
