/**
 * Playbook Generation Integration Tests
 * End-to-end testing of the ADPA Playbook generation system
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals'
import request from 'supertest'
import { app } from '../../server/src/server'
import { pool } from '../../server/src/database/connection'

describe('Playbook Generation Integration Tests', () => {
  let authToken: string
  let testProjectId: string
  let testUserId: string

  beforeAll(async () => {
    // Setup test user and authentication
    const userResult = await pool.query(`
      INSERT INTO users (id, email, name, role, is_active, created_at, updated_at)
      VALUES (gen_random_uuid(), 'test@adpa.org', 'Test User', 'admin', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id
    `)
    testUserId = userResult.rows[0].id

    // Create test project
    const projectResult = await pool.query(`
      INSERT INTO projects (id, name, description, status, created_by, created_at, updated_at)
      VALUES (gen_random_uuid(), 'Test Playbook Project', 'Test project for playbook generation', 'active', $1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id
    `, [testUserId])
    testProjectId = projectResult.rows[0].id

    // Generate auth token (simplified for testing)
    authToken = 'test-token'
  })

  afterAll(async () => {
    // Cleanup test data
    await pool.query('DELETE FROM projects WHERE id = $1', [testProjectId])
    await pool.query('DELETE FROM users WHERE id = $1', [testUserId])
  })

  describe('Template Management', () => {
    test('GET /api/playbook-generation/templates - should return available templates', async () => {
      const response = await request(app)
        .get('/api/playbook-generation/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.templates).toBeDefined()
      expect(Array.isArray(response.body.templates)).toBe(true)
      expect(response.body.templates.length).toBeGreaterThan(0)

      // Verify template structure
      const template = response.body.templates[0]
      expect(template).toHaveProperty('key')
      expect(template).toHaveProperty('name')
      expect(template).toHaveProperty('description')
      expect(template).toHaveProperty('config')
      expect(template.config).toHaveProperty('playbookType')
      expect(template.config).toHaveProperty('targetAudience')
      expect(template.config).toHaveProperty('complexity')
      expect(template.config).toHaveProperty('includeGkgContext')
    })

    test('GET /api/playbook-generation/preview/:templateKey - should return template preview', async () => {
      const response = await request(app)
        .get('/api/playbook-generation/preview/programExecutive')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.templateKey).toBe('programExecutive')
      expect(response.body.config).toBeDefined()
      expect(response.body.preview).toBeDefined()
      expect(response.body.preview.name).toContain('Program Playbook')
      expect(response.body.preview.sections).toBeGreaterThan(0)
    })

    test('GET /api/playbook-generation/preview/:templateKey - should handle invalid template key', async () => {
      const response = await request(app)
        .get('/api/playbook-generation/preview/invalidTemplate')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toContain('Invalid templateKey')
    })
  })

  describe('Playbook Generation', () => {
    test('POST /api/playbook-generation/generate/standard - should generate playbook with standard template', async () => {
      const response = await request(app)
        .post('/api/playbook-generation/generate/standard')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          templateKey: 'programExecutive',
          projectId: testProjectId,
          outputFormat: 'pdf'
        })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.documentId).toBeDefined()
      expect(response.body.templateId).toBeDefined()
      expect(response.body.generationId).toBeDefined()
      expect(response.body.metadata).toBeDefined()
      expect(response.body.metadata.playbookType).toBe('program')
      expect(response.body.metadata.targetAudience).toBe('executive')
      expect(response.body.metadata.complexity).toBe('basic')
    })

    test('POST /api/playbook-generation/generate/standard - should validate required fields', async () => {
      // Missing templateKey
      const response1 = await request(app)
        .post('/api/playbook-generation/generate/standard')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          projectId: testProjectId
        })
        .expect(400)

      expect(response1.body.success).toBe(false)
      expect(response1.body.error).toContain('templateKey is required')

      // Missing projectId
      const response2 = await request(app)
        .post('/api/playbook-generation/generate/standard')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          templateKey: 'programExecutive'
        })
        .expect(400)

      expect(response2.body.success).toBe(false)
      expect(response2.body.error).toContain('projectId is required')
    })

    test('POST /api/playbook-generation/generate/standard - should handle invalid template key', async () => {
      const response = await request(app)
        .post('/api/playbook-generation/generate/standard')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          templateKey: 'invalidTemplate',
          projectId: testProjectId
        })
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toContain('Invalid templateKey')
    })

    test('POST /api/playbook-generation/generate - should generate custom playbook', async () => {
      const response = await request(app)
        .post('/api/playbook-generation/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          projectId: testProjectId,
          playbookType: 'framework',
          targetAudience: 'technical',
          complexity: 'comprehensive',
          outputFormat: 'pdf',
          customVariables: {
            targetObjective: 'Test objective',
            expectedBenefits: 'Test benefits'
          },
          includeGkgContext: true
        })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.documentId).toBeDefined()
      expect(response.body.metadata.playbookType).toBe('framework')
      expect(response.body.metadata.targetAudience).toBe('technical')
      expect(response.body.metadata.complexity).toBe('comprehensive')
    })

    test('POST /api/playbook-generation/generate - should validate custom generation fields', async () => {
      // Invalid playbookType
      const response1 = await request(app)
        .post('/api/playbook-generation/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          projectId: testProjectId,
          playbookType: 'invalid',
          targetAudience: 'executive',
          complexity: 'standard'
        })
        .expect(400)

      expect(response1.body.success).toBe(false)
      expect(response1.body.error).toContain('Invalid playbookType')

      // Invalid targetAudience
      const response2 = await request(app)
        .post('/api/playbook-generation/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          projectId: testProjectId,
          playbookType: 'program',
          targetAudience: 'invalid',
          complexity: 'standard'
        })
        .expect(400)

      expect(response2.body.success).toBe(false)
      expect(response2.body.error).toContain('Invalid targetAudience')

      // Invalid complexity
      const response3 = await request(app)
        .post('/api/playbook-generation/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          projectId: testProjectId,
          playbookType: 'program',
          targetAudience: 'executive',
          complexity: 'invalid'
        })
        .expect(400)

      expect(response3.body.success).toBe(false)
      expect(response3.body.error).toContain('Invalid complexity')
    })
  })

  describe('Generation Status', () => {
    test('GET /api/playbook-generation/status/:generationId - should return generation status', async () => {
      const response = await request(app)
        .get('/api/playbook-generation/status/test-generation-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.generationId).toBe('test-generation-id')
      expect(response.body.status).toBeDefined()
      expect(['pending', 'in_progress', 'completed', 'failed']).toContain(response.body.status)
      expect(response.body.progress).toBeDefined()
    })
  })

  describe('Authentication', () => {
    test('Should require authentication for all endpoints', async () => {
      // Test templates endpoint
      await request(app)
        .get('/api/playbook-generation/templates')
        .expect(401)

      // Test generation endpoint
      await request(app)
        .post('/api/playbook-generation/generate/standard')
        .send({
          templateKey: 'programExecutive',
          projectId: testProjectId
        })
        .expect(401)

      // Test preview endpoint
      await request(app)
        .get('/api/playbook-generation/preview/programExecutive')
        .expect(401)
    })

    test('Should require proper permissions', async () => {
      // Test with user without proper permissions
      const response = await request(app)
        .get('/api/playbook-generation/templates')
        .set('Authorization', 'Bearer invalid-user-token')
        .expect(401)
    })
  })

  describe('Error Handling', () => {
    test('Should handle database connection errors gracefully', async () => {
      // This would require mocking the database connection
      // For now, we'll test malformed requests
      const response = await request(app)
        .post('/api/playbook-generation/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          projectId: 'invalid-uuid-format',
          playbookType: 'program',
          targetAudience: 'executive',
          complexity: 'standard'
        })
        .expect(500)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toBeDefined()
    })

    test('Should handle malformed JSON in custom variables', async () => {
      const response = await request(app)
        .post('/api/playbook-generation/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          projectId: testProjectId,
          playbookType: 'program',
          targetAudience: 'executive',
          complexity: 'standard',
          customVariables: 'invalid-json-format'
        })
        .expect(500)

      expect(response.body.success).toBe(false)
    })
  })

  describe('Performance', () => {
    test('Should respond within reasonable time limits', async () => {
      const startTime = Date.now()

      const response = await request(app)
        .get('/api/playbook-generation/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      const responseTime = Date.now() - startTime
      expect(responseTime).toBeLessThan(2000) // Should respond within 2 seconds
    })

    test('Should handle concurrent requests', async () => {
      const promises = Array(5).fill(null).map(() =>
        request(app)
          .get('/api/playbook-generation/templates')
          .set('Authorization', `Bearer ${authToken}`)
      )

      const responses = await Promise.all(promises)
      
      responses.forEach(response => {
        expect(response.status).toBe(200)
        expect(response.body.success).toBe(true)
      })
    })
  })

  describe('Data Integrity', () => {
    test('Should maintain template configuration consistency', async () => {
      const response = await request(app)
        .get('/api/playbook-generation/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      const templates = response.body.templates
      
      // Verify all templates have required fields
      templates.forEach((template: any) => {
        expect(template).toHaveProperty('key')
        expect(template).toHaveProperty('name')
        expect(template).toHaveProperty('description')
        expect(template).toHaveProperty('config')
        
        // Verify config structure
        expect(['program', 'framework', 'operational']).toContain(template.config.playbookType)
        expect(['executive', 'technical', 'operational']).toContain(template.config.targetAudience)
        expect(['basic', 'standard', 'comprehensive']).toContain(template.config.complexity)
        expect(typeof template.config.includeGkgContext).toBe('boolean')
      })
    })

    test('Should validate output format options', async () => {
      const validFormats = ['pdf', 'docx', 'markdown']
      
      validFormats.forEach(format => {
        const response = await request(app)
          .post('/api/playbook-generation/generate/standard')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            templateKey: 'programExecutive',
            projectId: testProjectId,
            outputFormat: format
          })
          .expect(200)

        expect(response.body.success).toBe(true)
      })
    })
  })
})

// Helper function to generate test auth token
function generateTestToken(userId: string): string {
  // In a real implementation, this would use JWT
  return `test-token-${userId}`
}

export {
  generateTestToken
}
