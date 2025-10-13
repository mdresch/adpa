/**
 * Global Setup for E2E Tests
 * Runs once before all tests
 */

import { pool } from '../../database/connection'
import { logger } from '../../utils/logger'

export default async function globalSetup(): Promise<void> {
  logger.info('🌍 Starting Global E2E Test Setup')
  
  try {
    // Verify database connection
    await pool.query('SELECT 1')
    logger.info('✅ Database connection verified in global setup')
    
    // Create test database schema if needed
    await ensureTestSchema()
    
    // Set up test environment variables
    process.env.NODE_ENV = 'test'
    process.env.LOG_LEVEL = 'info'
    process.env.ENABLE_METRICS = 'false' // Disable metrics for tests
    
    logger.info('✅ Global E2E Test Setup Complete')
  } catch (error) {
    logger.error('❌ Global E2E Test Setup Failed:', error)
    throw error
  }
}

async function ensureTestSchema(): Promise<void> {
  try {
    // Check if test schema exists, create if not
    await pool.query(`
      CREATE SCHEMA IF NOT EXISTS test_schema
    `)
    
    logger.info('✅ Test schema ensured')
  } catch (error) {
    logger.warn('⚠️ Could not ensure test schema:', error)
    // Continue without test schema
  }
}
