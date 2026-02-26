/**
 * Source Database Migration Runner
 * 
 * Targeted migration runner for migrations located in src/database/migrations
 * 
 * Usage:
 *   npm run migrate:src              # Run all pending migrations in src/database/migrations
 *   npm run migrate:src 010          # Run specific migration by number
 *   npm run migrate:src --all        # Force re-run all migrations
 */

const db = require('../src/lib/db');
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Bypass SSL certificate validation for cloud databases
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

interface MigrationFile {
    number: number;
    filename: string;
    filepath: string;
}

/**
 * Get all migration files from src/database/migrations directory
 */
function getMigrationFiles(): MigrationFile[] {
    // CORRECTED PATH: Points to src/database/migrations
    const migrationsDir = path.resolve(__dirname, '../src/database/migrations');

    if (!fs.existsSync(migrationsDir)) {
        console.error(`❌ Migrations directory not found: ${migrationsDir}`);
        process.exit(1);
    }

    const files = fs.readdirSync(migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .map(file => {
            // Matches format like 010_migration_name.sql
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
 * Create migrations tracking table if it doesn't exist
 */
async function ensureMigrationsTable() {
    await db.query(`
    CREATE TABLE IF NOT EXISTS src_schema_migrations (
      id SERIAL PRIMARY KEY,
      migration_number INTEGER NOT NULL,
      migration_name VARCHAR(255) NOT NULL,
      executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(migration_number, migration_name) 
    );
  `);
}

/**
 * Check if migration has already been run
 */
async function isMigrationExecuted(migration: MigrationFile): Promise<boolean> {
    // Check by name AND number to avoid collisions if numbers are reused across different folders/sets
    // although theoretically migration numbers should be unique globally, this is safer.
    const result = await db.query(
        'SELECT 1 FROM src_schema_migrations WHERE migration_number = $1 AND migration_name = $2',
        [migration.number, migration.filename]
    );
    return result.rows.length > 0;
}

/**
 * Mark migration as executed
 */
async function markMigrationExecuted(migration: MigrationFile) {
    await db.query(
        'INSERT INTO src_schema_migrations (migration_number, migration_name) VALUES ($1, $2)',
        [migration.number, migration.filename]
    );
}

/**
 * Run a single migration
 */
async function runMigration(migration: MigrationFile, force: boolean = false) {
    const alreadyExecuted = await isMigrationExecuted(migration);

    if (alreadyExecuted && !force) {
        console.log(`⏭️  Skipping ${migration.filename} (already executed)`);
        return { success: true, skipped: true };
    }

    console.log(`\n🔄 Running migration: ${migration.filename}`);

    try {
        // Read SQL file
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
        console.error(error);
        return { success: false, skipped: false, error };
    }
}

/**
 * Main migration runner
 */
async function runMigrations() {
    console.log('🚀 Source Database Migration Runner (src/database/migrations)\n');
    console.log('='.repeat(60));

    try {
        // Test database connection
        console.log('🔌 Testing database connection...');
        await db.query('SELECT 1');
        console.log('✅ Database connected successfully\n');

        // Ensure migrations tracking table exists
        console.log('📋 Setting up migrations tracking...');
        await ensureMigrationsTable();
        console.log('✅ Migrations tracking ready\n');

        // Get command line arguments
        const args = process.argv.slice(2);
        const forceAll = args.includes('--all') || args.includes('-a');
        const specificMigration = args.find(arg => !arg.startsWith('-'));

        // Get all migration files
        const migrations = getMigrationFiles();
        console.log(`📁 Found ${migrations.length} migration files in src/database/migrations\n`);

        if (migrations.length === 0) {
            console.log('⚠️  No migration files found');
            return;
        }

        // Filter migrations if specific one requested
        let migrationsToRun = migrations;
        if (specificMigration) {
            const migrationNumber = parseInt(specificMigration);
            migrationsToRun = migrations.filter(m => m.number === migrationNumber);

            if (migrationsToRun.length === 0) {
                console.error(`❌ Migration ${specificMigration} not found`);
                console.log('Available migrations:');
                migrations.forEach(m => console.log(`  - ${m.filename}`));
                process.exit(1);
            }

            console.log(`🎯 Running specific migration: ${migrationsToRun[0].filename}\n`);
        }

        // Run migrations
        let successCount = 0;
        let skippedCount = 0;
        let failedCount = 0;

        for (const migration of migrationsToRun) {
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
        console.log('\n' + '='.repeat(60));
        console.log('📊 Migration Summary:\n');
        console.log(`✅ Executed: ${successCount}`);
        console.log(`⏭️  Skipped:  ${skippedCount}`);
        console.log(`❌ Failed:   ${failedCount}`);

        if (failedCount === 0) {
            console.log('\n🎉 All requested migrations completed successfully!');
        } else {
            console.log('\n⚠️  Some migrations failed. Please check errors above.');
            process.exit(1);
        }

    } catch (error) {
        console.error('\n❌ Migration runner failed:');
        console.error(error);
        process.exit(1);
    } finally {
        try { await db.end() } catch (e) { }
    }
}

// Run migrations
runMigrations();
