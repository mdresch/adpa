#!/usr/bin/env node

/**
 * Generic Migration Script
 * Applies a single migration file to the database
 * Usage: node scripts/migrate-single.js <migration-number>
 */

const db = require('../src/lib/db');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Load environment variables from server directory - try both .env and ../.env
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', 'server', '.env') });

// Debug: Log environment variables to verify they are loaded
console.log('🔍 DATABASE_URL:', process.env.DATABASE_URL ? '***' : 'Not set');
console.log('🔍 DB_USER:', process.env.DB_USER ? '***' : 'Not set');
console.log('🔍 DB_PASSWORD:', process.env.DB_PASSWORD ? '***' : 'Not set');
console.log('🔍 DB_HOST:', process.env.DB_HOST || 'localhost');

// Get migration number from command line arguments
const migrationNumber = process.argv[2];
if (!migrationNumber) {
    console.error('❌ Please provide a migration number (e.g., 012, 013)');
    process.exit(1);
}

// Map migration numbers to file names and descriptions
const migrationMap = {
    '012': { file: '012_team_agreements.sql', description: 'Team Agreements' },
    '013': { file: '013_development_approaches.sql', description: 'Development Approach' },
    '014': { file: '014_project_iterations.sql', description: 'Project Iterations' },
    '015': { file: '015_work_items.sql', description: 'Work Items' },
    '016': { file: '016_capacity_plans.sql', description: 'Capacity Plans' },
    '017': { file: '017_performance_measurements.sql', description: 'Performance Measurements' },
    '018': { file: '018_earned_value_metrics.sql', description: 'Earned Value Metrics' },
    '019': { file: '019_opportunities.sql', description: 'Opportunities' },
    '020': { file: '020_risk_responses.sql', description: 'Risk Responses' },
    '021': { file: '021_performance_actuals.sql', description: 'Performance Actuals' },
    '356': { file: '356_add_materialized_status_to_risks.sql', description: 'Add Materialized Status to Risks' }
};

const migration = migrationMap[migrationNumber];
if (!migration) {
    console.error(`❌ Migration ${migrationNumber} not found`);
    console.error('Available migrations:', Object.keys(migrationMap).join(', '));
    process.exit(1);
}

// Create database pool using the same configuration logic as the main application
function createDatabasePool() {
    const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

    if (databaseUrl) {
        // Use connection string - extract password to ensure it's a string
        const poolConfig = {
            connectionString: databaseUrl,
            ssl: databaseUrl.includes('supabase.co') || process.env.DB_SSL === 'true'
                ? { rejectUnauthorized: false }
                : false
        };

        // Extract password from URL if needed to ensure it's a string
        if (databaseUrl.includes('postgresql://') || databaseUrl.includes('postgres://')) {
            try {
                const url = new URL(databaseUrl);
                if (url.password) {
                    poolConfig.password = url.password;
                }
            } catch (e) {
                console.warn('⚠️ Could not parse DATABASE_URL, using as-is');
            }
        }

        console.log('🔍 Using DATABASE_URL for connection');
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

async function applyMigration() {
    const client = await pool.connect();

    try {
        console.log(`🚀 Applying migration ${migrationNumber}: ${migration.description}`);

        // Read the migration file
        const migrationPath = path.join(__dirname, '../src/database/migrations', migration.file);

        if (!fs.existsSync(migrationPath)) {
            console.error(`❌ Migration file not found: ${migrationPath}`);
            process.exit(1);
        }

        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        // Apply the migration within a transaction
        await client.query('BEGIN');

        console.log('📝 Applying migration SQL...');

        // Execute the entire migration SQL at once (Supabase requires this for function definitions)
        try {
            await client.query(migrationSQL);
        } catch (err) {
            // Ignore specific error codes that indicate the migration is already applied
            if (err.code === '42P07' || // relation already exists
                err.code === '42701' || // column already exists
                err.code === '42710' || // constraint already exists
                err.code === '42P06' || // schema already exists
                err.code === '23505' || // unique violation (for indexes)
                err.code === '42883' || // function already exists
                err.message.includes('already exists') ||
                err.message.includes('does not exist')) {
                console.log(`   ℹ️  Skipping: ${err.message.split('\n')[0]}`);
            } else {
                throw err;
            }
        }

        await client.query('COMMIT');
        console.log(`✅ Migration ${migrationNumber} (${migration.description}) applied successfully!`);

    } catch (error) {
        await client.query('ROLLBACK');

        if (error.code === '42P07') { // relation already exists
            console.log(`ℹ️  Migration ${migrationNumber} already applied (relation exists)`);
        } else if (error.code === '42701') { // column already exists
            console.log(`ℹ️  Migration ${migrationNumber} already applied (column exists)`);
        } else {
            console.error(`❌ Error applying migration ${migrationNumber}:`, error.message);
            process.exit(1);
        }
    } finally {
        client.release();
        try { await db.end() } catch (e) { }
    }
}

// Execute the migration
applyMigration();