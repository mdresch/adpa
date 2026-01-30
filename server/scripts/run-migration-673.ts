#!/usr/bin/env tsx
/**
 * Migration Script: Run Migration 673 (Create operational playbooks tables)
 *
 * This script executes the SQL migration that creates the operational playbooks system.
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as url from 'url';
import * as winston from 'winston';
import dotenv from 'dotenv';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Simple logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp(),
        winston.format.printf(({ level, message, timestamp }) => {
            return `[${timestamp}] ${level}: ${message}`;
        })
    ),
    transports: [new winston.transports.Console()]
});

const MIGRATION_NAME = '673_operational_playbooks';
const MIGRATION_FILE = path.join(__dirname, '../migrations/673_create_operational_playbooks.sql');
const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
    ssl: (process.env.DATABASE_URL || '').includes('supabase') || process.env.DB_SSL === 'true'
        ? { rejectUnauthorized: false }
        : false,
});

async function runMigration() {
    try {
        logger.info(`🚀 Starting migration 673: Create operational playbooks tables`);
        logger.info(`📋 Mode: ${DRY_RUN ? 'DRY RUN (no changes will be applied)' : 'LIVE EXECUTION'}`);

        if (!fs.existsSync(MIGRATION_FILE)) {
            throw new Error(`Migration file not found: ${MIGRATION_FILE}`);
        }

        const migrationSql = fs.readFileSync(MIGRATION_FILE, 'utf-8');
        if (!migrationSql) throw new Error(`Migration file ${MIGRATION_FILE} is empty`);

        const startTime = Date.now();
        const client = await pool.connect();

        try {
            // 1. Ensure migrations table exists
            await client.query(`
        CREATE TABLE IF NOT EXISTS migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          executed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        )
      `);

            // 2. Check if already applied
            const check = await client.query(
                `SELECT 1 FROM migrations WHERE name = $1`,
                [MIGRATION_NAME]
            );
            if (check.rowCount && check.rowCount > 0) {
                logger.info('✅ Already applied, skipping.');
                return;
            }

            if (DRY_RUN) {
                logger.info(`🔍 DRY RUN: SQL would be executed (${migrationSql.length} characters)`);
                logger.info(`✅ Migration 673 dry run completed successfully`);
                return;
            }

            logger.info(`🔧 Executing migration 673...`);

            await client.query('BEGIN');

            // Execute the migration SQL
            await client.query(migrationSql);

            // Record the migration
            await client.query(`INSERT INTO migrations (name) VALUES ($1)`, [MIGRATION_NAME]);

            await client.query('COMMIT');

            const duration = Date.now() - startTime;
            logger.info(`✅ Migration 673 completed successfully in ${duration}ms`);

            // Verify creation
            const verify = await client.query("SELECT table_name FROM information_schema.tables WHERE table_name = 'operational_playbooks'");
            if (verify.rows.length > 0) {
                logger.info(`📊 Verification: operational_playbooks table exists`);
            } else {
                logger.warn(`⚠️  Verification: operational_playbooks table not found in information_schema`);
            }

        } catch (err) {
            try { await client.query('ROLLBACK'); } catch (_) { }
            throw err;
        } finally {
            client.release();
        }

    } catch (error: any) {
        logger.error(`❌ Migration 673 failed: ${error instanceof Error ? error.message : String(error)}`);
        if (error && error.stack) logger.error(error.stack);
        process.exit(1);
    } finally {
        try { await pool.end() } catch (e) { }
    }
}

runMigration();
