#!/usr/bin/env node

/**
 * Migration Script: Apply Performance Measurements Migration (017)
 * Description: Applies the performance_measurements table migration to the database
 * Usage: npm run migrate:017
 */

const path = require('path');
const fs = require('fs');
const { connectDatabase, pool } = require('./src/database/connection');

async function applyMigration() {
    try {
        console.log('🚀 Starting Performance Measurements migration (017)...');

        // Read the migration file
        const migrationPath = path.join(__dirname, '../src/database/migrations/017_performance_measurements.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        // Ensure database connection is established
        await connectDatabase();

        if (!pool) {
            throw new Error('Database pool not initialized');
        }

        // Apply the migration
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            console.log('📝 Applying migration SQL...');
            await client.query(migrationSQL);

            await client.query('COMMIT');
            console.log('✅ Performance Measurements migration (017) applied successfully!');
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('❌ Error applying migration:', error);
            process.exit(1);
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

// Execute the migration
applyMigration();