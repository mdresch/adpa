// migrate-209.js
// Node.js script to apply 209_create_portfolio_analytics_tables.sql migration
// Usage: node migrate-209.js

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const MIGRATION_FILE = path.join(__dirname, 'migrations', '209_create_portfolio_analytics_tables.sql');
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('Error: DATABASE_URL environment variable not set.');
  process.exit(1);
}

async function runMigration() {
  const sql = fs.readFileSync(MIGRATION_FILE, 'utf8');
  const client = new Client({ connectionString: DATABASE_URL });
  try {
    await client.connect();
    console.log('Connected to database. Applying migration 209...');
    await client.query(sql);
    console.log('Migration 209 applied successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
