#!/usr/bin/env tsx
/**
 * Migration Script: Run Migration 660 (Create batch_files table)
 *
 * This script executes the SQL migration that creates the `batch_files` table.
 */

const db = require('../src/lib/db');
import * as fs from 'fs';
import * as path from 'path';
import * as url from 'url';
import * as winston from 'winston';

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

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

const MIGRATION_FILE = fs.realpathSync(path.join(__dirname, '../migrations/660_create_batch_files_table.sql'));
const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  database: process.env.POSTGRES_DATABASE || 'adpa',
  ssl: process.env.POSTGRES_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function runMigration() {
  try {
    logger.info(`🚀 Starting migration 660: Create batch_files table`);
    logger.info(`📋 Mode: ${DRY_RUN ? 'DRY RUN (no changes will be applied)' : 'LIVE EXECUTION'}`);

    const migrationSql = fs.readFileSync(MIGRATION_FILE, 'utf-8');
    if (!migrationSql) throw new Error(`Migration file ${MIGRATION_FILE} is empty or missing`);

    if (VERBOSE) {
      logger.info(`📄 Migration SQL:\n${migrationSql}`);
    }

    if (DRY_RUN) {
      logger.info(`🔍 DRY RUN: SQL would be executed (${migrationSql.length} characters)`);
      logger.info(`✅ Migration 660 dry run completed successfully`);
      return;
    }

    logger.info(`🔧 Executing migration 660...`);
    const startTime = Date.now();

    const client = await pool.connect();
    try {
      // If the migration SQL already contains BEGIN/COMMIT, execute as a single multi-statement query
      const hasTransaction = /\bBEGIN\b\s*;/i.test(migrationSql);
      if (hasTransaction) {
        logger.info('🔧 Migration file contains BEGIN/COMMIT; executing as a single statement block');
        if (VERBOSE) logger.debug(`🔧 Full SQL length: ${migrationSql.length}`);
        await client.query(migrationSql);
      } else {
        await client.query('BEGIN');
        const statements = migrationSql.split(/;(?=(?:[^'"`]*(['"`])[^'"`]*\1)*[^'"`]*$)/);
        for (const [idx, statement] of statements.entries()) {
          const stmt = statement.trim();
          if (stmt && !stmt.startsWith('--')) {
            logger.info(`🔧 Executing statement #${idx + 1}`);
            if (VERBOSE) logger.debug(`🔧 SQL: ${stmt.substring(0, 120)}...`);
            try {
              await client.query(stmt);
            } catch (stmtErr: any) {
              logger.error(`❌ Error executing statement #${idx + 1}: ${stmt.substring(0, 1000)}`);
              logger.error(stmtErr.stack || stmtErr.message || String(stmtErr));
              throw stmtErr;
            }
          }
        }
        await client.query('COMMIT');
      }

      const duration = Date.now() - startTime;
      logger.info(`✅ Migration 660 completed successfully in ${duration}ms`);

      // Verify creation
      const verify = await client.query("SELECT table_name FROM information_schema.tables WHERE table_name = 'batch_files'");
      if (verify.rows.length > 0) {
        logger.info(`📊 Verification: batch_files table exists`);
      } else {
        logger.warn(`⚠️  Verification: batch_files table not found in information_schema`);
      }

    } catch (err) {
      try { await client.query('ROLLBACK'); } catch (_) {}
      throw err;
    } finally {
      client.release();
    }

  } catch (error: any) {
    logger.error(`❌ Migration 660 failed: ${error instanceof Error ? error.message : String(error)}`);
    if (error && error.stack) logger.error(error.stack);
    process.exit(1);
  } finally {
    try { await db.end() } catch (e) {}
  }
}

runMigration();
