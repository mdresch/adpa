/**
 * E2E Test Setup
 * Global setup and configuration for end-to-end tests
 */

import { beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals'
import { pool } from '../../database/connection'
import { logger } from '../../utils/logger'

// Global test timeout
jest.setTimeout(1800000) // 30 minutes

// Test database configuration
const TEST_DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'adpa_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password'
}

// Test data cleanup
const testDataCleanup = new Set<string>()

beforeAll(async () => {
  logger.info('🚀 Starting E2E Test Suite Setup')
  
  // Verify database connection
  try {
    await pool.query('SELECT 1')
    logger.info('✅ Database connection verified')
  } catch (error) {
    logger.error('❌ Database connection failed:', error)
    throw new Error('Database connection required for E2E tests')
  }
  
  // Set up test environment
  process.env.NODE_ENV = 'test'
  process.env.LOG_LEVEL = 'info'
  
  logger.info('✅ E2E Test Suite Setup Complete')
})

afterAll(async () => {
  logger.info('🧹 Cleaning up E2E Test Suite')
  
  // Clean up test data
  for (const cleanupQuery of testDataCleanup) {
    try {
      await pool.query(cleanupQuery)
    } catch (error) {
      logger.warn('Failed to clean up test data:', error)
    }
  }
  
  // Close database connections
  try {
    await pool.end()
    logger.info('✅ Database connections closed')
  } catch (error) {
    logger.warn('Error closing database connections:', error)
  }
  
  logger.info('✅ E2E Test Suite Cleanup Complete')
})

beforeEach(() => {
  // Reset test data cleanup set
  testDataCleanup.clear()
})

afterEach(() => {
  // Clean up any test data created in this test
  // This will be handled by individual test cleanup
})

// Helper function to register cleanup queries
export function registerCleanupQuery(query: string): void {
  testDataCleanup.add(query)
}

// Helper function to create test template
export async function createTestTemplate(data: {
  name: string
  description: string
  content: string
  template_type?: string
  created_by?: string
}): Promise<string> {
  const result = await pool.query(`
    INSERT INTO document_templates (name, description, content, template_type, created_by)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id
  `, [
    data.name,
    data.description,
    data.content,
    data.template_type || 'test',
    data.created_by || 'test_user'
  ])
  
  const templateId = result.rows[0].id
  registerCleanupQuery(`DELETE FROM document_templates WHERE id = '${templateId}'`)
  
  return templateId
}

// Helper function to create test project
export async function createTestProject(data: {
  name: string
  description: string
  project_type?: string
  created_by?: string
}): Promise<string> {
  const result = await pool.query(`
    INSERT INTO projects (name, description, project_type, created_by)
    VALUES ($1, $2, $3, $4)
    RETURNING id
  `, [
    data.name,
    data.description,
    data.project_type || 'test',
    data.created_by || 'test_user'
  ])
  
  const projectId = result.rows[0].id
  registerCleanupQuery(`DELETE FROM projects WHERE id = '${projectId}'`)
  
  return projectId
}

// Helper function to create test user
export async function createTestUser(data: {
  username: string
  email: string
  role?: string
}): Promise<string> {
  const result = await pool.query(`
    INSERT INTO users (username, email, role, created_at, updated_at)
    VALUES ($1, $2, $3, NOW(), NOW())
    RETURNING id
  `, [
    data.username,
    data.email,
    data.role || 'user'
  ])
  
  const userId = result.rows[0].id
  registerCleanupQuery(`DELETE FROM users WHERE id = '${userId}'`)
  
  return userId
}

// Helper function to wait for async operations
export function waitFor(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Helper function to generate unique test IDs
export function generateTestId(prefix: string = 'test'): string {
  return `${prefix}_${randomUUID()}`
}

// Helper function to create mock context data
export function createMockContextData(overrides: any = {}): any {
  return {
    project_context: {
      project_id: 'test_project_123',
      project_name: 'Test Project',
      project_type: 'business_analysis',
      project_phase: 'planning',
      project_description: 'A test project for E2E testing',
      stakeholders: [
        { id: 'stakeholder_1', name: 'Business Owner', role: 'sponsor' },
        { id: 'stakeholder_2', name: 'End User', role: 'user' }
      ],
      requirements: [
        { id: 'req_1', description: 'Functional requirement 1', priority: 'high' },
        { id: 'req_2', description: 'Non-functional requirement 1', priority: 'medium' }
      ],
      ...overrides.project_context
    },
    user_context: {
      user_id: 'test_user_123',
      user_name: 'Test User',
      user_role: 'business_analyst',
      user_expertise: ['requirements_analysis', 'process_improvement'],
      user_preferences: {
        writing_style: 'professional',
        complexity_level: 'intermediate',
        terminology_preference: 'standard'
      },
      ...overrides.user_context
    },
    historical_context: {
      similar_projects: [
        { project_id: 'similar_1', similarity_score: 0.85, lessons_learned: ['Lesson 1', 'Lesson 2'] }
      ],
      document_patterns: [
        { pattern_type: 'structure', frequency: 0.8, best_practice: true }
      ],
      ...overrides.historical_context
    },
    external_context: {
      industry_standards: ['ISO 9001', 'BABOK'],
      regulatory_requirements: ['GDPR', 'SOX'],
      market_trends: ['Trend 1', 'Trend 2'],
      ...overrides.external_context
    },
    ...overrides
  }
}

// Helper function to measure performance
export function measurePerformance<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
  return new Promise(async (resolve, reject) => {
    const startTime = Date.now()
    try {
      const result = await fn()
      const endTime = Date.now()
      resolve({
        result,
        duration: endTime - startTime
      })
    } catch (error) {
      reject(error)
    }
  })
}

// Helper function to create performance expectations
export function expectPerformance(duration: number, maxDuration: number): void {
  expect(duration).toBeLessThan(maxDuration)
}

// Export test utilities
export {
  logger,
  pool,
  TEST_DB_CONFIG
}
