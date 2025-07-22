import { sql } from '@vercel/postgres';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

/**
 * Logger utility for migration
 */
const logger = {
  info: (message: string) => console.log(`ℹ️ ${message}`),
  success: (message: string) => console.log(`✅ ${message}`),
  warn: (message: string) => console.warn(`⚠️ ${message}`),
  error: (message: string, error?: any) => console.error(`❌ ${message}`, error || '')
};

/**
 * Main migration function to migrate schema and data to Vercel Postgres
 */
export async function migrateToVercel() {
  try {
    logger.info('🚀 Starting Vercel Postgres migration...');
    
    // Validate Vercel Postgres connection
    await validateConnection();
    
    // Create backup of current schema
    await createBackup();
    
    // Read and execute existing schema
    await migrateSchema();
    
    // Run seed data
    await seedVercelDatabase();
    
    // Validate migration
    await validateMigration();
    
    logger.success('🎉 Migration completed successfully!');
    return true;
  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  }
}

/**
 * Rollback migration if something goes wrong
 */
export async function rollbackMigration() {
  try {
    logger.info('🔄 Rolling back migration...');
    
    // Check if we have tables to drop
    const tablesResult = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    
    if (tablesResult.rows.length === 0) {
      logger.info('No tables to drop, rollback not needed');
      return;
    }
    
    // Drop all tables in reverse order to handle dependencies
    const tables = tablesResult.rows.map(row => row.table_name);
    
    // First disable triggers to avoid foreign key constraints
    await sql`SET session_replication_role = 'replica'`;
    
    // Drop tables in reverse order (to handle dependencies)
    for (const table of tables) {
      try {
        await sql.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
        logger.info(`Dropped table: ${table}`);
      } catch (error) {
        logger.warn(`Failed to drop table ${table}:`, error);
      }
    }
    
    // Reset triggers
    await sql`SET session_replication_role = 'origin'`;
    
    logger.success('Rollback completed');
  } catch (error) {
    logger.error('Rollback failed:', error);
    throw error;
  }
}

/**
 * Validate connection to Vercel Postgres
 */
async function validateConnection() {
  try {
    logger.info('Validating Vercel Postgres connection...');
    const result = await sql`SELECT 1 as connection_test`;
    
    if (result.rows[0].connection_test === 1) {
      logger.success('Vercel Postgres connection successful');
    } else {
      throw new Error('Connection validation failed');
    }
  } catch (error) {
    logger.error('Failed to connect to Vercel Postgres:', error);
    throw new Error('Vercel Postgres connection failed. Please check your environment variables.');
  }
}

/**
 * Create backup of current schema before migration
 */
async function createBackup() {
  try {
    logger.info('Creating schema backup...');
    
    const schemaPath = join(process.cwd(), 'server/src/database/schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');
    
    const backupPath = join(process.cwd(), 'scripts/backup');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = join(backupPath, `schema-backup-${timestamp}.sql`);
    
    // Create backup directory if it doesn't exist
    const { mkdir } = require('fs/promises');
    await mkdir(backupPath, { recursive: true });
    
    // Write backup file
    writeFileSync(backupFile, schema, 'utf-8');
    
    logger.success(`Schema backup created at ${backupFile}`);
  } catch (error) {
    logger.error('Failed to create schema backup:', error);
    throw error;
  }
}