import { pool } from './connection'
import { logger } from '../utils/logger'
import fs from 'fs'
import path from 'path'


async function runOpenAIEnhancedMigration() {
  try {
    logger.info('Starting OpenAI enhanced features migration...')

  // Read the migration SQL file from the expected migrations directory only
  const migrationsDir = path.resolve(__dirname, 'migrations')
  const migrationPath = path.resolve(migrationsDir, 'add_openai_enhanced_fields.sql')
  if (!migrationPath.startsWith(`${migrationsDir}${path.sep}`)) {
    throw new Error('Resolved migration path escapes migrations directory')
  }
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

    // Execute the migration
    await pool.query(migrationSQL)

    logger.info('OpenAI enhanced features migration completed successfully')

    // Verify the migration by checking if the new columns exist
    const result = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'ai_providers' 
      AND column_name IN ('priority', 'rate_limits')
    `)

    if (result.rows.length === 2) {
      logger.info('Migration verification successful - all new columns are present')
    } else {
      logger.warn('Migration verification failed - some columns may be missing')
    }

    // Check if there are any OpenAI providers to update
    const providersResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM ai_providers 
      WHERE provider_type = 'openai'
    `)

    const openaiProviderCount = parseInt(providersResult.rows[0].count)
    logger.info(`Found ${openaiProviderCount} OpenAI providers in the database`)

    if (openaiProviderCount > 0) {
      // Update existing OpenAI providers with default values if needed
      await pool.query(`
        UPDATE ai_providers 
        SET 
          priority = COALESCE(priority, 1),
          rate_limits = COALESCE(rate_limits, '{
            "requestsPerMinute": 3500,
            "tokensPerMinute": 90000,
            "requestsPerDay": 10000
          }'::jsonb)
        WHERE provider_type = 'openai'
      `)

      logger.info('Updated existing OpenAI providers with default enhanced settings')
    }

  } catch (error) {
    logger.error('OpenAI enhanced features migration failed:', error)
    throw error
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  runOpenAIEnhancedMigration()
    .then(() => {
      logger.info('Migration script completed')
      process.exit(0)
    })
    .catch((error) => {
      logger.error('Migration script failed:', error)
      process.exit(1)
    })
}

export { runOpenAIEnhancedMigration }