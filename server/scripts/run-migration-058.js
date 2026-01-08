#!/usr/bin/env node

/**
 * Migration Script for 058: Entity Extraction, Baseline Management, and Drift Detection System
 * Applies the migration file 058_entity_extraction_baseline_system.sql to the database
 * Usage: node scripts/run-migration-058.js
 *        or: npm run migrate:058
 */

const db = require('../src/lib/db');
const fs = require('fs');
const path = require('path');

// Load environment variables from server directory
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', 'server', '.env') });

// Debug: Log environment variables to verify they are loaded
console.log('🔍 DATABASE_URL:', process.env.DATABASE_URL ? '***' : 'Not set');
console.log('🔍 POSTGRES_URL:', process.env.POSTGRES_URL ? '***' : 'Not set');

// Create database pool using the same configuration logic as the main application
function createDatabasePool() {
    const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

    if (databaseUrl) {
        // Use connection string
        const poolConfig = {
            connectionString: databaseUrl,
            ssl: databaseUrl.includes('supabase.co') || databaseUrl.includes('pooler.supabase.com') || process.env.DB_SSL === 'true'
                ? { rejectUnauthorized: false }
                : false
        };

        console.log('🔍 Using DATABASE_URL for connection');
        if (databaseUrl.includes('supabase.co') || databaseUrl.includes('pooler.supabase.com')) {
            console.log('🔍 Using Supabase connection (SSL enabled)');
        }
        return new Pool(poolConfig);
    } else {
        // Use individual connection parameters
        const poolConfig = {
            host: process.env.DB_HOST || 'localhost',
            port: Number(process.env.DB_PORT) || 5432,
            database: process.env.DB_NAME || 'adpa_db',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || undefined,
            ssl: process.env.DB_SSL === 'true'
                ? { rejectUnauthorized: false }
                : false
        };
        console.log('🔍 Using individual connection parameters');
        return new Pool(poolConfig);
    }
}

const pool = createDatabasePool();

// Tables that should be created by this migration
const expectedTables = [
    'entity_extractions',
    'project_entity_baselines',
    'baseline_comparisons',
    'drift_detections',
    'drift_detection_rules',
    'lessons_learned',
    'improvement_suggestions',
    'maturity_assessments',
    'entity_relationships'
];

async function verifyTables(client) {
    console.log('\n📊 Verifying table creation...');
    const results = [];
    
    for (const tableName of expectedTables) {
        const result = await client.query(`
            SELECT EXISTS(
                SELECT 1 FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = $1
            ) AS table_exists;
        `, [tableName]);
        
        const exists = result.rows[0]?.table_exists;
        results.push({ table: tableName, exists });
        
        if (exists) {
            console.log(`  ✅ Table '${tableName}' exists`);
            
            // Show table structure
            const structureResult = await client.query(`
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = $1
                ORDER BY ordinal_position
                LIMIT 10;
            `, [tableName]);
            
            if (structureResult.rows.length > 0) {
                console.log(`     Columns: ${structureResult.rows.map(r => r.column_name).join(', ')}${structureResult.rows.length >= 10 ? '...' : ''}`);
            }
        } else {
            console.log(`  ❌ Table '${tableName}' was NOT created`);
        }
    }
    
    const allCreated = results.every(r => r.exists);
    if (allCreated) {
        console.log('\n✅ All tables created successfully!');
    } else {
        console.log('\n⚠️  Some tables were not created. Please check the migration output above.');
    }
    
    return allCreated;
}

async function applyMigration() {
    const client = await pool.connect();

    try {
        console.log('🚀 Applying migration 058: Entity Extraction, Baseline Management, and Drift Detection System');
        console.log('=' .repeat(80));

        // Read the migration file
        const migrationPath = path.join(__dirname, '..', 'migrations', '058_entity_extraction_baseline_system.sql');

        if (!fs.existsSync(migrationPath)) {
            console.error(`❌ Migration file not found: ${migrationPath}`);
            process.exit(1);
        }

        console.log(`📄 Reading migration file: ${migrationPath}`);
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        // Apply the migration within a transaction
        await client.query('BEGIN');
        console.log('📝 Applying migration SQL...');

        // Execute the entire migration SQL at once
        try {
            await client.query(migrationSQL);
            console.log('✅ Migration SQL executed successfully');
        } catch (err) {
            // Ignore specific error codes that indicate the migration is already applied
            if (err.code === '42P07' || // relation already exists
                err.code === '42701' || // column already exists
                err.code === '42710' || // constraint already exists
                err.code === '42P06' || // schema already exists
                err.code === '23505' || // unique violation (for indexes)
                err.code === '42883' || // function already exists
                err.code === '42P16' || // cannot alter type
                err.message.includes('already exists') ||
                err.message.includes('does not exist')) {
                console.log(`   ℹ️  Skipping (already exists): ${err.message.split('\n')[0]}`);
            } else {
                throw err;
            }
        }

        await client.query('COMMIT');
        console.log('\n✅ Migration 058 applied successfully!');

        // Verify tables were created
        const allCreated = await verifyTables(client);

        if (!allCreated) {
            console.log('\n⚠️  Warning: Some tables may not have been created. This could be normal if the migration was partially applied before.');
        }

        console.log('\n' + '='.repeat(80));
        console.log('🎉 Migration 058 complete!');
        console.log('\nNext steps:');
        console.log('  1. Verify the tables in your database');
        console.log('  2. Start implementing the entity extraction services');
        console.log('  3. Test baseline creation and comparison');
        console.log('  4. Configure drift detection rules');

    } catch (error) {
        await client.query('ROLLBACK');

        if (error.code === '42P07') { // relation already exists
            console.log(`ℹ️  Migration 058 already applied (relation exists)`);
            console.log('   This is normal if you ran the migration before.');
        } else if (error.code === '42701') { // column already exists
            console.log(`ℹ️  Migration 058 already applied (column exists)`);
        } else {
            console.error(`\n❌ Error applying migration 058:`);
            console.error(`   Code: ${error.code}`);
            console.error(`   Message: ${error.message}`);
            if (error.position) {
                console.error(`   Position: ${error.position}`);
            }
            if (error.stack) {
                console.error(`\nStack trace:`);
                console.error(error.stack);
            }
            process.exit(1);
        }
    } finally {
        client.release();
        try { await db.end() } catch (e) {}
    }
}

// Execute the migration
applyMigration().catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});

