#!/usr/bin/env node
/**
 * Migration Runner Script
 * 
 * Run specific migrations by number or name.
 * Usage: node scripts/run-migration.js <migration-name-or-number>
 * 
 * Examples:
 *   node scripts/run-migration.js 650
 *   node scripts/run-migration.js fix_job_started_at
 *   npm run migrate:650
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Disable SSL certificate validation for this migration script
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function runMigration() {
  const migrationArg = process.argv[2];
  
  if (!migrationArg) {
    console.error('❌ Please provide a migration name or number');
    console.log('Usage: node scripts/run-migration.js <migration-name-or-number>');
    console.log('Examples:');
    console.log('  node scripts/run-migration.js 650');
    console.log('  node scripts/run-migration.js fix_job_started_at');
    process.exit(1);
  }

  // Find the migration file
  const migrationsDir = path.join(__dirname, '..', 'migrations');
  const files = fs.readdirSync(migrationsDir);
  
  let migrationFile = null;
  
  // Try to find by exact match first
  migrationFile = files.find(f => f === migrationArg || f === `${migrationArg}.sql`);
  
  // Try to find by number prefix
  if (!migrationFile) {
    migrationFile = files.find(f => f.startsWith(`${migrationArg}_`) && f.endsWith('.sql'));
  }
  
  // Try to find by partial name match
  if (!migrationFile) {
    migrationFile = files.find(f => f.includes(migrationArg) && f.endsWith('.sql'));
  }
  
  if (!migrationFile) {
    console.error(`❌ Migration not found: ${migrationArg}`);
    console.log('\nAvailable migrations (last 20):');
    files.filter(f => f.endsWith('.sql')).slice(-20).forEach(f => console.log(`  - ${f}`));
    process.exit(1);
  }

  const migrationPath = path.join(migrationsDir, migrationFile);
  console.log(`📄 Found migration: ${migrationFile}`);
  
  // Read the migration SQL
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
  console.log(`📝 Migration SQL loaded (${migrationSQL.length} bytes)`);

  // Connect to database
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL environment variable not set');
    process.exit(1);
  }

  console.log('🔗 Database:', connectionString.replace(/:[^:]*@/, ':****@'));

  const pool = new Pool({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔄 Connecting to database...');
    console.log(`🚀 Running migration: ${migrationFile}\n`);
    
    // Execute the migration
    const result = await pool.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    if (result.rows && result.rows.length > 0) {
      console.log('\nResults:');
      console.table(result.rows);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.detail) {
      console.error('Detail:', error.detail);
    }
    if (error.hint) {
      console.error('Hint:', error.hint);
    }
    process.exit(1);
  } finally {
    await pool.end();
    console.log('🔌 Database connection closed');
  }
}

runMigration();

