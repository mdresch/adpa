#!/usr/bin/env node

/**
 * Migration Script: Add model configuration to ai_providers table
 * 
 * This script applies the 008_ai_provider_models.sql migration
 * which adds available_models and default_model columns to enable
 * database-driven model configuration.
 * 
 * Usage:
 *   npm run migrate:ai-models
 *   or
 *   npx tsx src/scripts/migrate-ai-models.ts
 */

import dotenv from 'dotenv'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { pool } from '../database/connection'
import { logger } from '../utils/logger'

// CommonJS __dirname is available
const __dirname = __dirname

// Load environment variables
dotenv.config()

async function runMigration() {
  try {
    logger.info('🚀 Starting AI Provider Models Migration...')
    
    // Read the migration SQL file
    const migrationPath = join(__dirname, '../database/migrations/008_ai_provider_models.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf-8')
    
    logger.info('📄 Migration file loaded')
    
    // Execute the migration
    logger.info('⚙️  Executing migration...')
    await pool.query(migrationSQL)
    
    logger.info('✅ Migration completed successfully!')
    
    // Verify the changes
    const result = await pool.query(`
      SELECT 
        name, 
        provider_type, 
        default_model,
        jsonb_array_length(available_models) as model_count
      FROM ai_providers
      ORDER BY name
    `)
    
    logger.info('\n📊 Updated AI Providers:')
    console.table(result.rows)
    
    logger.info('\n🎉 AI model configuration is now database-driven!')
    logger.info('ℹ️  You can now update models through the database without code changes')
    
  } catch (error) {
    logger.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

// Run the migration
runMigration()

