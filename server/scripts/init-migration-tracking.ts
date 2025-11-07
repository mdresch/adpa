/**
 * Initialize Migration Tracking
 * 
 * This script detects which migrations have already been applied to your database
 * and marks them as executed in the schema_migrations table.
 * 
 * Useful when:
 * - Adding migration tracking to an existing database
 * - Migrations were run manually before tracking existed
 */

import { Pool } from 'pg';
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

/**
 * Get all migration files
 */
function getMigrationFiles(): MigrationFile[] {
  const migrationsDir = path.resolve(__dirname, '../migrations');
  
  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .map(file => {
      const match = file.match(/^(\d+)_(.+)\.sql$/);
      if (!match) return null;
      
      return {
        number: parseInt(match[1]),
        filename: file,
        filepath: path.join(migrationsDir, file)
      };
    })
    .filter((file): file is MigrationFile => file !== null)
    .sort((a, b) => a.number - b.number);

  return files;
}

/**
 * Check if a table exists
 */
async function tableExists(tableName: string): Promise<boolean> {
  const result = await pool.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = $1
    ) as exists
  `, [tableName]);
  
  return result.rows[0].exists;
}

/**
 * Check if a migration appears to be applied by looking for its artifacts
 */
async function isMigrationApplied(migration: MigrationFile): Promise<boolean> {
  const sql = fs.readFileSync(migration.filepath, 'utf8');
  
  // Extract table names from CREATE TABLE statements
  const createTableMatches = sql.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z_][a-zA-Z0-9_]*)/gi);
  
  for (const match of createTableMatches) {
    const tableName = match[1].toLowerCase();
    const exists = await tableExists(tableName);
    if (exists) {
      return true; // If any table from this migration exists, consider it applied
    }
  }
  
  return false;
}

/**
 * Ensure schema_migrations table exists with correct structure
 */
async function ensureMigrationsTable() {
  // Create table if it doesn't exist
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      migration_number INTEGER UNIQUE NOT NULL,
      migration_name VARCHAR(255) NOT NULL,
      executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Check if executed_at column exists, add it if missing
  const columnCheck = await pool.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'schema_migrations' 
    AND column_name = 'executed_at'
  `);

  if (columnCheck.rows.length === 0) {
    console.log('   Adding executed_at column to schema_migrations...');
    await pool.query(`
      ALTER TABLE schema_migrations 
      ADD COLUMN executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    `);
  }
}

/**
 * Mark migration as executed
 */
async function markMigrationExecuted(migration: MigrationFile) {
  await pool.query(`
    INSERT INTO schema_migrations (migration_number, migration_name, executed_at)
    VALUES ($1, $2, NOW())
    ON CONFLICT (migration_number) DO NOTHING
  `, [migration.number, migration.filename]);
}

/**
 * Main initialization
 */
async function initializeMigrationTracking() {
  console.log('🔧 Initialize Migration Tracking\n');
  console.log('=' .repeat(60));
  
  try {
    // Test connection
    console.log('🔌 Testing database connection...');
    await pool.query('SELECT 1');
    console.log('✅ Database connected\n');

    // Ensure tracking table exists
    console.log('📋 Setting up migration tracking table...');
    await ensureMigrationsTable();
    console.log('✅ Migration tracking table ready\n');

    // Get all migration files
    const migrations = getMigrationFiles();
    console.log(`📁 Found ${migrations.length} migration files\n`);

    // Check which migrations are already applied
    console.log('🔍 Detecting already-applied migrations...\n');
    
    let alreadyApplied = 0;
    let markedAsExecuted = 0;
    let notApplied = 0;

    for (const migration of migrations) {
      const isApplied = await isMigrationApplied(migration);
      
      if (isApplied) {
        // Check if already tracked
        const tracked = await pool.query(
          'SELECT 1 FROM schema_migrations WHERE migration_number = $1',
          [migration.number]
        );

        if (tracked.rows.length === 0) {
          // Mark as executed
          await markMigrationExecuted(migration);
          console.log(`✅ ${migration.filename} - MARKED AS EXECUTED`);
          markedAsExecuted++;
        } else {
          console.log(`⏭️  ${migration.filename} - already tracked`);
          alreadyApplied++;
        }
      } else {
        console.log(`⏳ ${migration.filename} - not yet applied`);
        notApplied++;
      }
    }

    // Summary
    console.log('\n' + '=' .repeat(60));
    console.log('📊 Initialization Summary:\n');
    console.log(`✅ Marked as executed: ${markedAsExecuted}`);
    console.log(`⏭️  Already tracked:    ${alreadyApplied}`);
    console.log(`⏳ Pending:            ${notApplied}`);
    
    console.log('\n' + '=' .repeat(60));
    
    if (markedAsExecuted > 0) {
      console.log('\n🎉 Migration tracking initialized!');
      console.log(`   ${markedAsExecuted} existing migration(s) marked as executed.\n`);
    } else {
      console.log('\n✅ Migration tracking already up to date.\n');
    }

    if (notApplied > 0) {
      console.log('💡 Next steps:');
      console.log('   Run "npm run migrate" to execute pending migrations.\n');
    }

  } catch (error) {
    console.error('\n❌ Initialization failed:');
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run initialization
initializeMigrationTracking();

