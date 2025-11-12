/**
 * Integration Tests for Assessment System
 * 
 * Tests the complete client onboarding assessment workflow
 */

import request from 'supertest';
import { app } from '../src/server';
import { pool } from '../src/database/connection';

describe('Client Onboarding Assessment System', () => {
  
  let authToken: string;
  let testProjectId: string;
  let batchId: string;
  let assessmentId: string;

  // Setup: Create test user and authenticate
  beforeAll(async () => {
    // Create test user
    const signupResponse = await request(app)
      .post('/api/auth/signup')
      .send({
        email: 'test-assessment@example.com',
        password: 'TestPass123!',
        name: 'Test Assessment User'
      });

    // Login
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test-assessment@example.com',
        password: 'TestPass123!'
      });

    authToken = loginResponse.body.data.token;

    // Create test project
    const projectResponse = await request(app)
      .post('/api/projects')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Test Assessment Project',
        description: 'Project for testing assessment system'
      });

    testProjectId = projectResponse.body.data.id;
  });

  // Cleanup
  afterAll(async () => {
    // Clean up test data
    await pool.query('DELETE FROM users WHERE email = $1', ['test-assessment@example.com']);
    await pool.end();
  });

  // ================================================================
  // DOCUMENT UPLOAD TESTS
  // ================================================================

  describe('POST /api/onboarding/upload', () => {
    
    it('should upload and process multiple documents', async () => {
      // Create test PDF buffer (simplified)
      const pdfBuffer = Buffer.from('%PDF-1.4 test content');
      
      const response = await request(app)
        .post('/api/onboarding/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('projectId', testProjectId)
        .attach('files', pdfBuffer, 'test-document.pdf')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.batchId).toBeDefined();
      expect(response.body.data.totalFiles).toBe(1);
      
      batchId = response.body.data.batchId;
    });

    it('should reject files exceeding size limit', async () => {
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB
      
      const response = await request(app)
        .post('/api/onboarding/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('projectId', testProjectId)
        .attach('files', largeBuffer, 'large-file.pdf')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject unsupported file types', async () => {
      const execBuffer = Buffer.from('MZ'); // EXE file
      
      const response = await request(app)
        .post('/api/onboarding/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('projectId', testProjectId)
        .attach('files', execBuffer, 'malicious.exe')
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  // ================================================================
  // BATCH STATUS TESTS
  // ================================================================

  describe('GET /api/onboarding/batch/:batchId', () => {
    
    it('should return batch status and progress', async () => {
      const response = await request(app)
        .get(`/api/onboarding/batch/${batchId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.batchId).toBe(batchId);
      expect(response.body.data.status).toBeDefined();
      expect(response.body.data.totalFiles).toBeGreaterThan(0);
    });

    it('should return 404 for non-existent batch', async () => {
      await request(app)
        .get('/api/onboarding/batch/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  // ================================================================
  // ASSESSMENT GENERATION TESTS
  // ================================================================

  describe('POST /api/assessment/generate', () => {
    
    it('should generate portfolio maturity assessment', async () => {
      // Wait for documents to be processed
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const response = await request(app)
        .post('/api/assessment/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          projectId: testProjectId,
          batchId
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.overallMaturityLevel).toBeGreaterThanOrEqual(1);
      expect(response.body.data.overallMaturityLevel).toBeLessThanOrEqual(5);
      expect(response.body.data.totalDocuments).toBeGreaterThan(0);
      
      assessmentId = response.body.data.assessmentId;
    });

    it('should include gap analysis in assessment', async () => {
      const response = await request(app)
        .post('/api/assessment/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          projectId: testProjectId
        })
        .expect(200);

      expect(response.body.data.gaps).toBeDefined();
      expect(Array.isArray(response.body.data.gaps)).toBe(true);
    });

    it('should include industry benchmarks', async () => {
      const response = await request(app)
        .post('/api/assessment/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          projectId: testProjectId,
          industryVertical: 'technology'
        })
        .expect(200);

      expect(response.body.data.benchmarks).toBeDefined();
      expect(response.body.data.benchmarks.industryAverage).toBeGreaterThan(0);
    });
  });

  // ================================================================
  // ASSESSMENT RETRIEVAL TESTS
  // ================================================================

  describe('GET /api/assessment/:assessmentId', () => {
    
    it('should retrieve existing assessment', async () => {
      const response = await request(app)
        .get(`/api/assessment/${assessmentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.assessmentId).toBe(assessmentId);
    });

    it('should return 404 for non-existent assessment', async () => {
      await request(app)
        .get('/api/assessment/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  // ================================================================
  // EXPORT TESTS
  // ================================================================

  describe('GET /api/assessment/:assessmentId/export', () => {
    
    it('should export assessment as PDF', async () => {
      const response = await request(app)
        .get(`/api/assessment/${assessmentId}/export`)
        .query({ format: 'pdf' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.headers['content-type']).toBe('application/pdf');
      expect(response.body).toBeInstanceOf(Buffer);
    });

    it('should export assessment as CSV', async () => {
      const response = await request(app)
        .get(`/api/assessment/${assessmentId}/export`)
        .query({ format: 'csv' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.headers['content-type']).toBe('text/csv');
      expect(response.text).toContain('Assessment Report');
    });

    it('should export assessment as JSON', async () => {
      const response = await request(app)
        .get(`/api/assessment/${assessmentId}/export`)
        .query({ format: 'json' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.headers['content-type']).toBe('application/json');
      expect(response.body.assessmentId).toBe(assessmentId);
    });

    it('should return 400 for invalid format', async () => {
      await request(app)
        .get(`/api/assessment/${assessmentId}/export`)
        .query({ format: 'invalid' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });

  // ================================================================
  // GAP ANALYSIS TESTS
  // ================================================================

  describe('GET /api/assessment/:assessmentId/gaps', () => {
    
    it('should return prioritized gap list', async () => {
      const response = await request(app)
        .get(`/api/assessment/${assessmentId}/gaps`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      
      if (response.body.data.length > 0) {
        const gap = response.body.data[0];
        expect(gap.priority).toMatch(/critical|high|medium|low/);
        expect(gap.documentType).toBeDefined();
        expect(gap.currentLevel).toBeGreaterThanOrEqual(0);
        expect(gap.targetLevel).toBeGreaterThanOrEqual(0);
      }
    });

    it('should filter gaps by priority', async () => {
      const response = await request(app)
        .get(`/api/assessment/${assessmentId}/gaps`)
        .query({ priority: 'critical,high' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach((gap: any) => {
        expect(['critical', 'high']).toContain(gap.priority);
      });
    });
  });

  // ================================================================
  // ROI CALCULATION TESTS
  // ================================================================

  describe('GET /api/assessment/:assessmentId/roi', () => {
    
    it('should calculate ROI metrics', async () => {
      const response = await request(app)
        .get(`/api/assessment/${assessmentId}/roi`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.currentCost).toBeGreaterThan(0);
      expect(response.body.data.improvedCost).toBeGreaterThan(0);
      expect(response.body.data.savings).toBeGreaterThanOrEqual(0);
      expect(response.body.data.roi).toBeGreaterThanOrEqual(0);
      expect(response.body.data.paybackPeriod).toBeDefined();
    });
  });
});

