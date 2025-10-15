/**
 * Global Teardown for E2E Tests
 * Runs once after all tests complete
 */

import { pool } from '../../database/connection'
import { logger } from '../../utils/logger'

export default async function globalTeardown(): Promise<void> {
  logger.info('🧹 Starting Global E2E Test Teardown')
  
  try {
    // Clean up any remaining test data
    await cleanupTestData()
    
    // Close database connections
    await pool.end()
    logger.info('✅ Database connections closed')
    
    logger.info('✅ Global E2E Test Teardown Complete')
  } catch (error) {
    logger.error('❌ Global E2E Test Teardown Failed:', error)
    // Don't throw error in teardown to avoid masking test failures
  }
}

async function cleanupTestData(): Promise<void> {
  try {
    // Clean up test templates
    await pool.query(`
      DELETE FROM document_templates 
      WHERE name LIKE 'E2E Test%' 
      OR name LIKE 'Performance Test%' 
      OR name LIKE 'Stress Test%'
    `)
    
    // Clean up test projects
    await pool.query(`
      DELETE FROM projects 
      WHERE name LIKE 'E2E Test%' 
      OR name LIKE 'Performance Test%' 
      OR name LIKE 'Stress Test%'
    `)
    
    // Clean up test users
    await pool.query(`
      DELETE FROM users 
      WHERE username LIKE 'test_user_%' 
      OR email LIKE '%@test.com'
    `)
    
    logger.info('✅ Test data cleanup completed')
  } catch (error) {
    logger.warn('⚠️ Test data cleanup failed:', error)
    // Continue without failing
  }
}
