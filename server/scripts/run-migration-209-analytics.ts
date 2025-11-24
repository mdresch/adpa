/**
 * Migration Runner: Portfolio Analytics Tables
 * Purpose: Run migration 209_create_portfolio_analytics_tables.sql to create portfolio analytics/metrics tables
 * Usage: npm run migrate:209-analytics or tsx scripts/run-migration-209-analytics.ts
 */

import { pool, connectDatabase } from '../src/database/connection';
import { logger } from '../src/utils/logger';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
  const migrationFile = path.join(__dirname, '../migrations/209_create_portfolio_analytics_tables.sql');

  try {
    logger.info('🚀 Starting migration 209-analytics: Portfolio Analytics Tables');
    logger.info('='.repeat(70));

    // Connect to database first
    logger.info('🔌 Connecting to database...');
    await connectDatabase();

    if (!pool) {
      throw new Error('Database connection failed - pool is null');
    }

    logger.info('✅ Database connected successfully');

    // Read migration SQL
    logger.info(`📄 Reading migration file: ${path.basename(migrationFile)}`);
    const migrationSQL = fs.readFileSync(migrationFile, 'utf-8');

    // Execute migration
    logger.info('⚙️  Executing migration SQL...');
    logger.info('   This may take a few moments...');

    await pool.query(migrationSQL);

    logger.info('✅ Migration SQL executed successfully!');

    // Verify tables were created and log their structure
    logger.info('🔍 Verifying new tables and their columns...');
    const tablesToCheck = [
      'portfolio_financial_summary',
      'portfolio_cost_breakdown',
      'portfolio_kpi_snapshot',
      'portfolio_health_metrics'
    ];

    const tableResults = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = ANY($1)
      ORDER BY table_name
    `, [tablesToCheck]);

    if (tableResults.rows.length === 0) {
      logger.error('❌ None of the expected analytics tables were found in the public schema.');
    } else {
      logger.info('📊 Tables found:');
      for (const row of tableResults.rows) {
        logger.info(`   ✓ ${row.table_name}`);
        // Log columns for each table
        const columns = await pool.query(`
          SELECT column_name, data_type, is_nullable
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = $1
          ORDER BY ordinal_position
        `, [row.table_name]);
        columns.rows.forEach(col => {
          logger.info(`      - ${col.column_name} (${col.data_type})${col.is_nullable === 'NO' ? ' NOT NULL' : ''}`);
        });
      }
    }

    if (tableResults.rows.length !== tablesToCheck.length) {
      const createdTables = new Set(tableResults.rows.map((r: any) => r.table_name));
      const missingTables = tablesToCheck.filter(t => !createdTables.has(t));
      logger.warn(`⚠️  Some tables may not have been created: ${missingTables.join(', ')}`);
    }

    logger.info('🎉 Migration 209-analytics complete!');
    process.exit(0);
  } catch (err) {
    logger.error('❌ Migration 209-analytics failed:', err);
    process.exit(1);
  }
}

runMigration();
