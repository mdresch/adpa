#!/usr/bin/env node

/**
 * Migration Script: Apply Worker Heartbeats Migration (030)
 * Description: Applies the worker_heartbeats table migration for resource monitoring
 * Usage: npm run migrate:030
 */

const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function applyMigration() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    });

    try {
        console.log('🚀 Starting Worker Heartbeats migration (030)...');

        // Read the migration file
        const migrationPath = path.join(__dirname, '../src/database/migrations/030_worker_heartbeats.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        // Apply the migration
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            console.log('📝 Applying migration SQL...');
            await client.query(migrationSQL);

            await client.query('COMMIT');
            console.log('✅ Worker Heartbeats migration (030) applied successfully!');
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
    } finally {
        await pool.end();
    }
}

// Execute the migration
applyMigration();
