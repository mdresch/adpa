#!/usr/bin/env tsx
/**
 * Create upload_batches table
 * 
 * Run: npm run create-upload-table
 * or: tsx scripts/create-upload-batches-table.ts
 */

import dotenv from 'dotenv';
dotenv.config();

const db = require('../src/lib/db');
import fs from 'fs';
import path from 'path';

async function createUploadBatchesTable() {
  console.log('🚀 Creating upload_batches table...\n');

  // Create database connection with Supabase SSL configuration
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  // Temporarily disable SSL rejection for Supabase
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

  const pool = new Pool({
    connectionString: databaseUrl,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
  });

  try {
    // Test connection
    console.log('📡 Connecting to database...');
    await db.query('SELECT NOW()');
    console.log('✅ Connected to database\n');

    // Read the migration file
    const migrationPath = path.join(__dirname, '../migrations/315_create_upload_batches.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📄 Executing migration: 315_create_upload_batches.sql');
    console.log('─'.repeat(60));

    // Execute the migration
    await db.query(sql);

    console.log('✅ upload_batches table created successfully!\n');

    // Verify table exists
    const result = await db.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'upload_batches'
      ORDER BY ordinal_position
    `);

    console.log('📊 Table structure:');
    console.log('─'.repeat(60));
    result.rows.forEach(row => {
      console.log(`  ${row.column_name.padEnd(20)} ${row.data_type}`);
    });

    console.log('\n✅ Migration complete! You can now upload documents.\n');

  } catch (error: any) {
    if (error.message?.includes('already exists')) {
      console.log('ℹ️  Table upload_batches already exists - skipping creation\n');
    } else {
      console.error('❌ Error creating table:', error.message);
      console.error('\nFull error:', error);
      process.exit(1);
    }
  } finally {
    try { await db.end() } catch (e) {}
    process.exit(0);
  }
}

// Run migration
createUploadBatchesTable();
