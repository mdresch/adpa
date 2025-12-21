#!/usr/bin/env node

/**
 * Migration Script: Apply Capacity Plans Migration (016)
 * Description: Applies the capacity_plans table migration to the database
 * Usage: npm run migrate:016
 */

const path = require('path');
const fs = require('fs');
const { connectDatabase, pool } = require('./src/database/connection');

async function applyMigration() {
    try {
        console.log('🚀 Starting Capacity Plans migration (016)...');

        // Read the migration file
        const migrationPath = path.join(__dirname, '../src/database/migrations/016_capacity_plans.sql');
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
            console.log('✅ Capacity Plans migration (016) applied successfully!');
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