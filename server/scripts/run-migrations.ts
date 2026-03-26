/**
 * Database Migration Runner
 * Consolidates all migrations into a clean baseline + incremental updates
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import db from '../src/lib/db';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Bypass SSL certificate validation for cloud databases
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

interface MigrationFile {
  number: number;
  name: string;
  filename: string;
  filepath: string;
}

/**
 * Drops and recreates the public schema to start fresh
 */
async function resetPublicSchema() {
  console.log('🧨 Resetting public schema...');
  await db.query('DROP SCHEMA public CASCADE');
  await db.query('CREATE SCHEMA public');
  await db.query('GRANT ALL ON SCHEMA public TO CURRENT_USER');
  await db.query('GRANT ALL ON SCHEMA public TO public');
  console.log('✅ Public schema reset successfully\n');
}

/**
 * Get all migration files from migrations directory
 */
function getMigrationFiles(): MigrationFile[] {
  const migrationsDir = path.resolve(__dirname, '../migrations');
  
  if (!fs.existsSync(migrationsDir)) {
    console.error(`❌ Migrations directory not found: ${migrationsDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .map(file => {
      // Matches both 000_baseline.sql and 001_some_migration.sql
      const match = file.match(/^(\d+)_(.+)\.sql$/);
      if (!match) return null;
      
      return {
        number: parseInt(match[1]),
        name: match[2],
        filename: file,
        filepath: path.join(migrationsDir, file)
      };
    })
    .filter((file): file is MigrationFile => file !== null)
    .sort((a, b) => a.number - b.number);

  return files;
}

/**
 * Create migrations tracking table if it doesn't exist
 */
async function ensureMigrationsTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      migration_number INTEGER UNIQUE NOT NULL,
      migration_name VARCHAR(255) NOT NULL,
      executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);
}

/**
 * Check if migration has already been run
 */
async function isMigrationExecuted(migrationNumber: number): Promise<boolean> {
  const result = await db.query(
    'SELECT 1 FROM schema_migrations WHERE migration_number = $1',
    [migrationNumber]
  );
  return result && result.rows && result.rows.length > 0;
}

/**
 * Mark migration as executed
 */
async function markMigrationExecuted(migration: MigrationFile) {
  await db.query(
    'INSERT INTO schema_migrations (migration_number, migration_name) VALUES ($1, $2)',
    [migration.number, migration.filename]
  );
}

/**
 * Run a single migration
 */
async function runMigration(migration: MigrationFile, force: boolean = false) {
  const alreadyExecuted = await isMigrationExecuted(migration.number);

  if (alreadyExecuted && !force) {
    console.log(`⏭️  Skipping ${migration.filename} (already executed)`);
    return { success: true, skipped: true };
  }

  console.log(`\n🔄 Running migration: ${migration.filename}`);
  
  try {
    const sql = fs.readFileSync(migration.filepath, 'utf8');
    
    // Execute migration
    await db.query(sql);
    
    // Mark as executed
    if (!alreadyExecuted) {
      await markMigrationExecuted(migration);
    }
    
    console.log(`✅ Successfully executed: ${migration.filename}`);
    return { success: true, skipped: false };
    
  } catch (error) {
    console.error(`❌ Failed to execute ${migration.filename}:`);
    console.error(error.message || error);
    return { success: false, skipped: false, error };
  }
}

/**
 * Main migration runner
 */
async function runMigrations() {
  console.log('🚀 ADPA Database Migration Runner\n');
  console.log('=' .repeat(60));
  
  try {
    // Get command line arguments
    const args = process.argv.slice(2);
    const isReset = args.includes('--reset');
    const forceAll = args.includes('--all') || args.includes('-a');
    
    // Initialize DB
    await db.initDb();

    if (isReset) {
      await resetPublicSchema();
    }

    // Ensure migrations tracking table exists
    await ensureMigrationsTable();

    // Get all migration files
    const migrations = getMigrationFiles();
    console.log(`📁 Found ${migrations.length} migration files`);

    if (migrations.length === 0) {
      console.log('⚠️  No migration files found');
      return;
    }

    // Run migrations
    let successCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const migration of migrations) {
      const result = await runMigration(migration, forceAll);
      
      if (result.success) {
        if (result.skipped) {
          skippedCount++;
        } else {
          successCount++;
        }
      } else {
        failedCount++;
        // Stop on first error
        break;
      }
    }

    // Summary
    console.log('\n' + '=' .repeat(60));
    console.log('📊 Migration Summary:\n');
    console.log(`✅ Executed: ${successCount}`);
    console.log(`⏭️  Skipped:  ${skippedCount}`);
    console.log(`❌ Failed:   ${failedCount}`);
    
    if (failedCount === 0) {
      console.log('\n🎉 Database is up to date!');
    } else {
      console.log('\n⚠️  Migration failed. Please check errors above.');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Migration runner failed:');
    console.error(error);
    process.exit(1);
  } finally {
    await db.end();
  }
}

// Run migrations
runMigrations();
