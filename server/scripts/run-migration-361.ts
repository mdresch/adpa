#!/usr/bin/env tsx
/**
 * Migration Script: Run Migration 361 (Lessons Learned Table)
 * 
 * This script executes the SQL migration for creating the lessons_learned table
 * and associated database objects. It supports both direct execution and dry-run mode.
 */

const db = require('../src/lib/db');
import * as fs from 'fs';
import * as path from 'path';
import * as url from 'url';
import * as winston from 'winston';

// Simple logger for migration scripts
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

// ES Module compatibility - get directory name
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

// Configuration
const MIGRATION_FILE = fs.realpathSync(path.join(__dirname, '../migrations/361_create_lessons_learned_table.sql'));
const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');

// Database configuration using environment variables
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  database: process.env.POSTGRES_DATABASE || 'adpa',
  ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

/**
 * Execute SQL migration
 */
async function runMigration() {
  try {
    logger.info(`🚀 Starting migration 361: Lessons Learned Table`);
    logger.info(`📋 Mode: ${DRY_RUN ? 'DRY RUN (no changes will be applied)' : 'LIVE EXECUTION'}`);

    // Read migration SQL file
    const migrationSql = fs.readFileSync(MIGRATION_FILE, 'utf-8');
    if (!migrationSql) {
      throw new Error(`Migration file ${MIGRATION_FILE} is empty or could not be read`);
    }

    if (VERBOSE) {
      logger.info(`📄 Migration SQL:
${migrationSql}`);
    }

    if (DRY_RUN) {
      logger.info(`🔍 DRY RUN: SQL would be executed (${migrationSql.length} characters)`);
      logger.info(`✅ Migration 361 dry run completed successfully`);
      return;
    }

    // Execute migration
    logger.info(`🔧 Executing migration 361...`);
    const startTime = Date.now();

    // Execute as a transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Split SQL into individual statements (handling semicolons within strings)
      const statements = migrationSql.split(/;(?=(?:[^'"`]*(['"`])[^'"`]*\1)*[^'"`]*$)/);

      for (const statement of statements) {
        const trimmedStatement = statement.trim();
        if (trimmedStatement && !trimmedStatement.startsWith('--')) {
          if (VERBOSE) {
            logger.debug(`🔧 Executing: ${trimmedStatement.substring(0, 100)}...`);
          }
          await client.query(trimmedStatement);
        }
      }

      await client.query('COMMIT');
      const duration = Date.now() - startTime;

      logger.info(`✅ Migration 361 completed successfully in ${duration}ms`);

      // Verify the table was created
      const result = await client.query(
        "SELECT table_name FROM information_schema.tables WHERE table_name = 'lessons_learned'"
      );

      if (result.rows.length > 0) {
        logger.info(`📊 Verification: lessons_learned table created successfully`);
      } else {
        logger.warn(`⚠️  Verification: lessons_learned table not found in information_schema`);
      }

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    logger.error(`❌ Migration 361 failed:`, error instanceof Error ? error.message : String(error));
    process.exit(1);
  } finally {
    try { await db.end() } catch (e) {}
  }
}

// Execute the migration
runMigration();
