// migrate325.js
// Script to apply migration 325_fix_team_agreements_uuid_types.sql using node-postgres
// Usage: node migrate325.js

const fs = require('fs');
const path = require('path');
const dbModule = require('./src/lib/db')
const db = dbModule.default || dbModule

// Load environment variables from .env if present
require('dotenv').config();


const MIGRATION_FILE = path.join(__dirname, 'migrations', '325_fix_team_agreements_uuid_types.sql');
// Validate migration file exists
if (!fs.existsSync(MIGRATION_FILE)) {
  console.error(`Migration file not found: ${MIGRATION_FILE}`);
  console.error('Please ensure the migration file exists before running this script.');
  process.exit(1);
}

async function runMigration() {
  // Handle self-signed certificate errors for local/dev/test environments
  let sslConfig = false;
  if (process.env.DB_SSL === 'true') {
    sslConfig = { rejectUnauthorized: false };
  }
  // If error is self-signed cert, print a clear message
  try {
    await db.initDb()
  } catch (e) {
    console.error('Failed to initialize DB:', e?.message || e)
    process.exit(1)
  }

  let sql;
  try {
    sql = fs.readFileSync(MIGRATION_FILE, 'utf8');
  } catch (err) {
    console.error('Failed to read migration file:', err.message);
    process.exit(1);
  }

  try {
    console.log('Running migration 325...');
    await db.query(sql);
    console.log('Migration 325 applied successfully.');
    process.exit(0);
  } catch (err) {
    if (err.message && err.message.includes('self-signed certificate')) {
      console.error('Migration 325 failed: self-signed certificate in certificate chain.');
      console.error('Tip: Set DB_SSL to "false" in your .env for local/dev, or configure your database to use a trusted certificate.');
    } else {
      console.error('Migration 325 failed:', err.message);
    }
    process.exit(1);
  } finally {
    await db.end();
  }
}

runMigration();
