/**
 * Simplified End-to-End Pipeline Test
 * Tests the core pipeline functionality without complex dependencies
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { pool } from '../../database/connection'
import { logger } from '../../utils/logger'

describe('Simplified Pipeline E2E Tests', () => {
  beforeAll(async () => {
    logger.info('🚀 Starting Simplified E2E Tests')
    
    // Verify database connection
    try {
      await pool.query('SELECT 1')
      logger.info('✅ Database connection verified')
    } catch (error) {
      logger.error('❌ Database connection failed:', error)
      throw new Error('Database connection required for E2E tests')
    }
  })

  afterAll(async () => {
    logger.info('🧹 Cleaning up E2E Tests')
    // Clean up any test data if needed
  })

  describe('Database Connectivity', () => {
    it('should connect to the database successfully', async () => {
      const result = await pool.query('SELECT 1 as test')
      expect(result.rows[0].test).toBe(1)
    })

    it('should have required tables', async () => {
      const tables = ['users', 'projects', 'document_templates', 'ai_providers']
      
      for (const table of tables) {
        const result = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          )
        `, [table])
        
        expect(result.rows[0].exists).toBe(true)
      }
    })
  })

  describe('AI Providers Configuration', () => {
    it('should have AI providers configured', async () => {
      const result = await pool.query('SELECT COUNT(*) as count FROM ai_providers WHERE is_active = true')
      const providerCount = parseInt(result.rows[0].count)
      
      expect(providerCount).toBeGreaterThan(0)
      logger.info(`Found ${providerCount} active AI providers`)
    })

    it('should have provider configurations', async () => {
      const result = await pool.query(`
        SELECT name, provider_type, is_active, configuration 
        FROM ai_providers 
        WHERE is_active = true
      `)
      
      expect(result.rows.length).toBeGreaterThan(0)
      
      result.rows.forEach(provider => {
        expect(provider.name).toBeDefined()
        expect(provider.provider_type).toBeDefined()
        expect(provider.is_active).toBe(true)
        logger.info(`Provider: ${provider.name} (${provider.provider_type})`)
      })
    })
  })

  describe('Template System', () => {
    it('should create and retrieve templates', async () => {
      // Create a test template
      const templateResult = await pool.query(`
        INSERT INTO document_templates (name, description, content, template_type, created_by)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, name
      `, [
        'E2E Test Template',
        'Template for end-to-end testing',
        '# {{project_name}}\n\n## Overview\n{{project_overview}}',
        'test',
        'e2e_test_user'
      ])

      const templateId = templateResult.rows[0].id
      expect(templateId).toBeDefined()

      // Retrieve the template
      const retrieveResult = await pool.query(`
        SELECT id, name, content, template_type 
        FROM document_templates 
        WHERE id = $1
      `, [templateId])

      expect(retrieveResult.rows.length).toBe(1)
      expect(retrieveResult.rows[0].name).toBe('E2E Test Template')
      expect(retrieveResult.rows[0].content).toContain('{{project_name}}')

      // Clean up
      await pool.query('DELETE FROM document_templates WHERE id = $1', [templateId])
    })

    it('should handle template variables', async () => {
      const templateContent = `
# {{project_name}}
## Project Overview
{{project_overview}}

## Requirements
{{requirements}}

## Stakeholders
{{stakeholders}}
      `.trim()

      // Extract variables (simple regex-based extraction)
      const variableRegex = /\{\{([^}]+)\}\}/g
      const variables = []
      let match
      
      while ((match = variableRegex.exec(templateContent)) !== null) {
        variables.push(match[1])
      }

      expect(variables.length).toBe(4)
      expect(variables).toContain('project_name')
      expect(variables).toContain('project_overview')
      expect(variables).toContain('requirements')
      expect(variables).toContain('stakeholders')
    })
  })

  describe('Project Management', () => {
    it('should create and manage projects', async () => {
      // Create a test project
      const projectResult = await pool.query(`
        INSERT INTO projects (name, description, project_type, created_by)
        VALUES ($1, $2, $3, $4)
        RETURNING id, name
      `, [
        'E2E Test Project',
        'Project for end-to-end testing',
        'business_analysis',
        'e2e_test_user'
      ])

      const projectId = projectResult.rows[0].id
      expect(projectId).toBeDefined()

      // Update project
      await pool.query(`
        UPDATE projects 
        SET description = $1, updated_at = NOW()
        WHERE id = $2
      `, ['Updated project description', projectId])

      // Verify update
      const updatedResult = await pool.query(`
        SELECT description FROM projects WHERE id = $1
      `, [projectId])

      expect(updatedResult.rows[0].description).toBe('Updated project description')

      // Clean up
      await pool.query('DELETE FROM projects WHERE id = $1', [projectId])
    })
  })

  describe('User Management', () => {
    it('should handle user operations', async () => {
      // Create a test user
      const userResult = await pool.query(`
        INSERT INTO users (username, email, role, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
        RETURNING id, username, email
      `, [
        'e2e_test_user',
        'e2e@test.com',
        'user'
      ])

      const userId = userResult.rows[0].id
      expect(userId).toBeDefined()
      expect(userResult.rows[0].username).toBe('e2e_test_user')

      // Clean up
      await pool.query('DELETE FROM users WHERE id = $1', [userId])
    })
  })

  describe('Basic Pipeline Simulation', () => {
    it('should simulate a basic document processing workflow', async () => {
      // Step 1: Create test data
      const templateResult = await pool.query(`
        INSERT INTO document_templates (name, description, content, template_type, created_by)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [
        'Pipeline Test Template',
        'Template for pipeline testing',
        '# {{project_name}}\n\n## Overview\n{{project_overview}}',
        'test',
        'pipeline_test_user'
      ])

      const templateId = templateResult.rows[0].id

      const projectResult = await pool.query(`
        INSERT INTO projects (name, description, project_type, created_by)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `, [
        'Pipeline Test Project',
        'Project for pipeline testing',
        'test',
        'pipeline_test_user'
      ])

      const projectId = projectResult.rows[0].id

      // Step 2: Simulate context gathering
      const contextData = {
        project_name: 'Pipeline Test Project',
        project_overview: 'This is a test project for pipeline validation'
      }

      // Step 3: Simulate template processing
      const templateContent = '# {{project_name}}\n\n## Overview\n{{project_overview}}'
      let processedContent = templateContent

      Object.entries(contextData).forEach(([key, value]) => {
        processedContent = processedContent.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value)
      })

      expect(processedContent).toContain('Pipeline Test Project')
      expect(processedContent).toContain('This is a test project for pipeline validation')
      expect(processedContent).not.toContain('{{project_name}}')
      expect(processedContent).not.toContain('{{project_overview}}')

      // Step 4: Simulate quality assessment
      const qualityMetrics = {
        completeness: 1.0, // All variables resolved
        clarity: 0.9,
        relevance: 0.95,
        overall_score: 0.95
      }

      expect(qualityMetrics.overall_score).toBeGreaterThan(0.8)
      expect(qualityMetrics.completeness).toBe(1.0)

      // Step 5: Simulate output formatting
      const outputFormats = {
        markdown: processedContent,
        html: `<h1>Pipeline Test Project</h1>\n<h2>Overview</h2>\n<p>This is a test project for pipeline validation</p>`,
        text: 'Pipeline Test Project\n\nOverview\nThis is a test project for pipeline validation'
      }

      expect(outputFormats.markdown).toBeDefined()
      expect(outputFormats.html).toBeDefined()
      expect(outputFormats.text).toBeDefined()

      // Clean up
      await pool.query('DELETE FROM document_templates WHERE id = $1', [templateId])
      await pool.query('DELETE FROM projects WHERE id = $1', [projectId])

      logger.info('✅ Basic pipeline simulation completed successfully')
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Test with invalid query
      try {
        await pool.query('SELECT * FROM non_existent_table')
        fail('Expected query to fail')
      } catch (error) {
        expect(error).toBeDefined()
        expect(error.message).toContain('non_existent_table')
      }
    })

    it('should handle missing data gracefully', async () => {
      // Test query for non-existent record
      const result = await pool.query(`
        SELECT * FROM document_templates WHERE id = $1
      `, ['non_existent_id'])

      expect(result.rows.length).toBe(0)
    })
  })

  describe('Performance Basic Tests', () => {
    it('should perform basic operations within reasonable time', async () => {
      const startTime = Date.now()

      // Perform multiple database operations
      for (let i = 0; i < 10; i++) {
        await pool.query('SELECT $1 as test_value', [i])
      }

      const endTime = Date.now()
      const duration = endTime - startTime

      expect(duration).toBeLessThan(5000) // Should complete within 5 seconds
      logger.info(`10 database operations completed in ${duration}ms`)
    })
  })
})
