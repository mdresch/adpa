/**
 * Run Specific Migrations
 * Run one or more specific migration files by number
 * 
 * Usage:
 *   tsx scripts/run-specific-migrations.ts 058 059
 */

const db = require('../src/lib/db');
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

interface MigrationFile {
  number: number;
  filename: string;
  filepath: string;
}

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

async function isMigrationExecuted(migrationNumber: number): Promise<boolean> {
  const result = await db.query(
    'SELECT 1 FROM schema_migrations WHERE migration_number = $1',
    [migrationNumber]
  );
  return result.rows.length > 0;
}

async function markMigrationExecuted(migration: MigrationFile) {
  await db.query(
    'INSERT INTO schema_migrations (migration_number, migration_name) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [migration.number, migration.filename]
  );
}

async function runSpecificMigrations() {
  console.log('🎯 Run Specific Migrations\n');
  console.log('=' .repeat(60));

  try {
    // Get migration numbers from command line
    const migrationNumbers = process.argv.slice(2).map(arg => parseInt(arg)).filter(n => !isNaN(n));

    if (migrationNumbers.length === 0) {
      console.log('❌ No migration numbers provided');
      console.log('\nUsage:');
      console.log('  tsx scripts/run-specific-migrations.ts 058 059');
      console.log('  npm run migrate:specific 058 059\n');
      process.exit(1);
    }

    console.log(`\n🎯 Target migrations: ${migrationNumbers.join(', ')}\n`);

    // Test connection
    console.log('🔌 Testing database connection...');
    await db.query('SELECT 1');
    console.log('✅ Database connected\n');

    // Ensure tracking table
    await ensureMigrationsTable();

    // Find migration files
    const migrationsDir = path.resolve(__dirname, '../migrations');
    let successCount = 0;
    let skippedCount = 0;
    let notFoundCount = 0;

    for (const migrationNumber of migrationNumbers) {
      // Find migration file
      const files = fs.readdirSync(migrationsDir)
        .filter(file => file.startsWith(`${String(migrationNumber).padStart(3, '0')}_`) && file.endsWith('.sql'));

      if (files.length === 0) {
        console.log(`❌ Migration ${migrationNumber} not found`);
        notFoundCount++;
        continue;
      }

      const filename = files[0];
      const filepath = path.join(migrationsDir, filename);

      const migration: MigrationFile = {
        number: migrationNumber,
        filename,
        filepath
      };

      // Check if already executed
      const alreadyExecuted = await isMigrationExecuted(migrationNumber);
      if (alreadyExecuted) {
        console.log(`⏭️  Skipping ${filename} (already executed)`);
        skippedCount++;
        continue;
      }

      // Run migration
      console.log(`🔄 Running migration: ${filename}`);
      
      try {
        const sql = fs.readFileSync(filepath, 'utf8');
        await db.query(sql);
        await markMigrationExecuted(migration);
        console.log(`✅ Successfully executed: ${filename}\n`);
        successCount++;
      } catch (error: any) {
        console.error(`❌ Failed to execute ${filename}:`);
        console.error(error);
        throw error;
      }
    }

    // Summary
    console.log('=' .repeat(60));
    console.log('📊 Migration Summary:\n');
    console.log(`✅ Executed: ${successCount}`);
    console.log(`⏭️  Skipped:  ${skippedCount}`);
    console.log(`❌ Not Found: ${notFoundCount}`);
    
    if (successCount > 0) {
      console.log('\n🎉 Migrations completed successfully!');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:');
    console.error(error);
    process.exit(1);
  } finally {
    try { await db.end() } catch (e) {}
  }
}

runSpecificMigrations();

