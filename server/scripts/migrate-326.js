// migrate-326.js
// Script to apply migration 326_create_portfolio_risks_table.sql
// Usage: node migrate-326.js


const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
// Always load .env from the server root
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const MIGRATION_FILE = path.resolve(__dirname, '../migrations', '326_create_portfolio_risks_table.sql');

async function runMigration() {
  const sql = fs.readFileSync(MIGRATION_FILE, 'utf8');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    console.log('Running migration 326...');
    await pool.query(sql);
    console.log('Migration 326 applied successfully.');
  } catch (err) {
    console.error('Migration 326 failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
