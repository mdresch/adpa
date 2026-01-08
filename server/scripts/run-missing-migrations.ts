#!/usr/bin/env tsx
/**
 * Run missing migrations for assessments and columns
 * 
 * Run: npm run migrate-assessments
 */

import dotenv from 'dotenv';
dotenv.config();

const db = require('../src/lib/db');
import fs from 'fs';
import path from 'path';

async function runMigrations() {
  console.log('🚀 Running missing migrations...\n');

  // Disable SSL verification for Supabase
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  });

  try {
    // Test connection
    console.log('📡 Connecting to database...');
    await db.query('SELECT NOW()');
    console.log('✅ Connected to database\n');

    // Migration 1: assessments table
    console.log('📄 Creating assessments table...');
    const assessmentsMigration = fs.readFileSync(
      path.join(__dirname, '../migrations/316_create_assessments_table.sql'),
      'utf-8'
    );
    await db.query(assessmentsMigration);
    console.log('✅ assessments table created\n');

    // Migration 2: missing columns
    console.log('📄 Adding missing columns...');
    const columnsMigration = fs.readFileSync(
      path.join(__dirname, '../migrations/317_add_missing_columns.sql'),
      'utf-8'
    );
    await db.query(columnsMigration);
    console.log('✅ Missing columns added\n');

    // Verify tables
    const tables = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('assessments', 'upload_batches', 'documents')
      ORDER BY table_name
    `);

    console.log('📊 Verified tables:');
    console.log('─'.repeat(60));
    tables.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}`);
    });

    // Verify columns
    const columns = await db.query(`
      SELECT table_name, column_name 
      FROM information_schema.columns 
      WHERE table_name IN ('upload_batches', 'documents')
      AND column_name IN ('successful_files', 'source')
      ORDER BY table_name, column_name
    `);

    console.log('\n📊 Verified columns:');
    console.log('─'.repeat(60));
    columns.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}.${row.column_name}`);
    });

    console.log('\n✅ All migrations complete!\n');

  } catch (error: any) {
    console.error('❌ Migration error:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    try { await db.end() } catch (e) {}
    process.exit(0);
  }
}

// Run migrations
runMigrations();

