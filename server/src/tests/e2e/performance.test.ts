/**
 * Performance Testing Suite
 * Comprehensive performance testing for the 6-stage document generation pipeline
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { MultiStageDocumentProcessor } from '../../modules/multiStageDocumentProcessor'
import { pool } from '../../database/connection'
import { logger } from '../../utils/logger'
import type { DocumentProcessingRequest } from '../../modules/multiStageDocumentProcessor/types'

describe('Performance Testing Suite', () => {
  let processor: MultiStageDocumentProcessor
  let testTemplateId: string
  let testProjectId: string
  let testUserId: string

  beforeAll(async () => {
    processor = new MultiStageDocumentProcessor({
      enableParallelProcessing: true,
      enableQualityGates: true,
      enableMonitoring: true,
      maxProcessingTime: 600000, // 10 minutes for performance tests
      defaultRetryAttempts: 2,
      jobTimeout: 600000,
      maxConcurrentJobs: 10,
      enableMetricsCollection: true,
      enableErrorTracking: true
    })

    await setupPerformanceTestData()
  })

  afterAll(async () => {
    await cleanupPerformanceTestData()
  })

  describe('Single Document Processing Performance', () => {
    it('should process a simple document within 30 seconds', async () => {
      const request = createPerformanceTestRequest('simple')
      
      const startTime = Date.now()
      const result = await processor.processDocument(request)
      const endTime = Date.now()

      const processingTime = endTime - startTime

      expect(result.status.status).toBe('completed')
      expect(processingTime).toBeLessThan(30000) // 30 seconds
      expect(result.processing_metrics.total_processing_time).toBeLessThan(processingTime)
      
      logger.info(`Simple document processing time: ${processingTime}ms`)
    })

    it('should process a complex document within 2 minutes', async () => {
      const request = createPerformanceTestRequest('complex')
      
      const startTime = Date.now()
      const result = await processor.processDocument(request)
      const endTime = Date.now()

      const processingTime = endTime - startTime

      expect(result.status.status).toBe('completed')
      expect(processingTime).toBeLessThan(120000) // 2 minutes
      expect(result.processing_metrics.total_processing_time).toBeLessThan(processingTime)
      
      logger.info(`Complex document processing time: ${processingTime}ms`)
    })

    it('should process a large document within 5 minutes', async () => {
      const request = createPerformanceTestRequest('large')
      
      const startTime = Date.now()
      const result = await processor.processDocument(request)
      const endTime = Date.now()

      const processingTime = endTime - startTime

      expect(result.status.status).toBe('completed')
      expect(processingTime).toBeLessThan(300000) // 5 minutes
      expect(result.processing_metrics.total_processing_time).toBeLessThan(processingTime)
      
      logger.info(`Large document processing time: ${processingTime}ms`)
    })
  })

  describe('Concurrent Processing Performance', () => {
    it('should handle 5 concurrent simple documents', async () => {
      const requests = Array.from({ length: 5 }, (_, i) => 
        createPerformanceTestRequest('simple', `concurrent_simple_${i}`)
      )

      const startTime = Date.now()
      const results = await Promise.all(requests.map(req => processor.processDocument(req)))
      const endTime = Date.now()

      const totalTime = endTime - startTime
      const averageTime = totalTime / requests.length

      results.forEach((result, index) => {
        expect(result.status.status).toBe('completed')
        expect(result.request_id).toBe(requests[index].request_id)
      })

      expect(totalTime).toBeLessThan(60000) // 1 minute total
      expect(averageTime).toBeLessThan(30000) // 30 seconds average
      
      logger.info(`5 concurrent simple documents - Total: ${totalTime}ms, Average: ${averageTime}ms`)
    })

    it('should handle 3 concurrent complex documents', async () => {
      const requests = Array.from({ length: 3 }, (_, i) => 
        createPerformanceTestRequest('complex', `concurrent_complex_${i}`)
      )

      const startTime = Date.now()
      const results = await Promise.all(requests.map(req => processor.processDocument(req)))
      const endTime = Date.now()

      const totalTime = endTime - startTime
      const averageTime = totalTime / requests.length

      results.forEach((result, index) => {
        expect(result.status.status).toBe('completed')
        expect(result.request_id).toBe(requests[index].request_id)
      })

      expect(totalTime).toBeLessThan(180000) // 3 minutes total
      expect(averageTime).toBeLessThan(120000) // 2 minutes average
      
      logger.info(`3 concurrent complex documents - Total: ${totalTime}ms, Average: ${averageTime}ms`)
    })
  })

  describe('Memory Usage Performance', () => {
    it('should process multiple documents without memory leaks', async () => {
      const initialMemory = process.memoryUsage()
      
      // Process 10 documents sequentially
      for (let i = 0; i < 10; i++) {
        const request = createPerformanceTestRequest('simple', `memory_test_${i}`)
        const result = await processor.processDocument(request)
        expect(result.status.status).toBe('completed')
      }

      const finalMemory = process.memoryUsage()
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed
      const memoryIncreaseMB = memoryIncrease / 1024 / 1024

      // Memory increase should be reasonable (less than 100MB for 10 documents)
      expect(memoryIncreaseMB).toBeLessThan(100)
      
      logger.info(`Memory increase after 10 documents: ${memoryIncreaseMB.toFixed(2)}MB`)
    })
  })

  describe('Stage-by-Stage Performance', () => {
    it('should complete each stage within expected time limits', async () => {
      const request = createPerformanceTestRequest('complex', 'stage_performance_test')
      
      const startTime = Date.now()
      const result = await processor.processDocument(request)
      const endTime = Date.now()

      expect(result.status.status).toBe('completed')
      expect(result.stages).toHaveLength(6)

      const stageTimes = result.stages.map(stage => stage.processing_time)
      const totalStageTime = stageTimes.reduce((sum, time) => sum + time, 0)

      // Individual stage performance expectations
      expect(stageTimes[0]).toBeLessThan(10000) // Context Gathering: < 10s
      expect(stageTimes[1]).toBeLessThan(15000) // Template Processing: < 15s
      expect(stageTimes[2]).toBeLessThan(30000) // AI Generation: < 30s
      expect(stageTimes[3]).toBeLessThan(10000) // Context Injection: < 10s
      expect(stageTimes[4]).toBeLessThan(20000) // Quality Assurance: < 20s
      expect(stageTimes[5]).toBeLessThan(15000) // Output Formatting: < 15s

      logger.info(`Stage processing times: ${stageTimes.join(', ')}ms`)
      logger.info(`Total stage time: ${totalStageTime}ms`)
    })
  })

  describe('Quality vs Performance Trade-offs', () => {
    it('should maintain quality standards while optimizing performance', async () => {
      const highQualityRequest = createPerformanceTestRequest('complex', 'high_quality_test')
      highQualityRequest.quality_config.minimum_quality_score = 0.9
      highQualityRequest.quality_config.quality_thresholds.overall_quality = 0.9

      const balancedRequest = createPerformanceTestRequest('complex', 'balanced_test')
      balancedRequest.quality_config.minimum_quality_score = 0.8
      balancedRequest.quality_config.quality_thresholds.overall_quality = 0.8

      const startTime = Date.now()
      const [highQualityResult, balancedResult] = await Promise.all([
        processor.processDocument(highQualityRequest),
        processor.processDocument(balancedRequest)
      ])
      const endTime = Date.now()

      const processingTime = endTime - startTime

      // Both should complete successfully
      expect(highQualityResult.status.status).toBe('completed')
      expect(balancedResult.status.status).toBe('completed')

      // Quality should be higher for high-quality request
      expect(highQualityResult.quality_report.overall_score).toBeGreaterThan(
        balancedResult.quality_report.overall_score
      )

      // Processing time should be reasonable for both
      expect(processingTime).toBeLessThan(240000) // 4 minutes total
      
      logger.info(`High quality score: ${highQualityResult.quality_report.overall_score}`)
      logger.info(`Balanced quality score: ${balancedResult.quality_report.overall_score}`)
      logger.info(`Total processing time: ${processingTime}ms`)
    })
  })

  describe('Resource Utilization Performance', () => {
    it('should efficiently utilize system resources', async () => {
      const request = createPerformanceTestRequest('complex', 'resource_utilization_test')
      
      const startTime = Date.now()
      const result = await processor.processDocument(request)
      const endTime = Date.now()

      expect(result.status.status).toBe('completed')
      expect(result.processing_metrics).toBeDefined()

      // Check that resource utilization is within reasonable bounds
      const metrics = result.processing_metrics
      
      // CPU usage should be reasonable (simulated check)
      expect(metrics.total_processing_time).toBeGreaterThan(0)
      expect(metrics.total_processing_time).toBeLessThan(endTime - startTime + 1000)

      // Memory usage should be tracked
      if (metrics.resource_utilization) {
        expect(metrics.resource_utilization.memory_usage).toBeGreaterThan(0)
        expect(metrics.resource_utilization.memory_usage).toBeLessThan(1024 * 1024 * 1024) // < 1GB
      }

      logger.info(`Resource utilization metrics:`, metrics)
    })
  })

  describe('Error Handling Performance', () => {
    it('should handle errors gracefully without performance degradation', async () => {
      const validRequest = createPerformanceTestRequest('simple', 'valid_request')
      const invalidRequest = createPerformanceTestRequest('simple', 'invalid_request')
      invalidRequest.template_id = 'invalid_template_id'

      const startTime = Date.now()
      
      // Process valid request
      const validResult = await processor.processDocument(validRequest)
      
      // Process invalid request (should fail gracefully)
      let invalidResult = null
      try {
        invalidResult = await processor.processDocument(invalidRequest)
      } catch (error) {
        // Expected to fail
      }

      // Process another valid request to ensure no performance degradation
      const validResult2 = await processor.processDocument(validRequest)
      
      const endTime = Date.now()

      expect(validResult.status.status).toBe('completed')
      expect(validResult2.status.status).toBe('completed')
      expect(invalidResult).toBeNull() // Should have failed

      // Processing time should not be significantly impacted by the error
      const totalTime = endTime - startTime
      expect(totalTime).toBeLessThan(90000) // 1.5 minutes total
      
      logger.info(`Error handling performance test completed in: ${totalTime}ms`)
    })
  })

  // Helper functions
  async function setupPerformanceTestData(): Promise<void> {
    // Create performance test template
    const templateResult = await pool.query(`
      INSERT INTO document_templates (name, description, content, template_type, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [
      'Performance Test Template',
      'Template for performance testing',
      '# {{project_name}}\n\n## Overview\n{{project_overview}}\n\n## Requirements\n{{requirements}}\n\n## Analysis\n{{analysis}}\n\n## Recommendations\n{{recommendations}}',
      'performance_test',
      'system'
    ])

    testTemplateId = templateResult.rows[0].id

    // Create performance test project
    const projectResult = await pool.query(`
      INSERT INTO projects (name, description, project_type, created_by)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, [
      'Performance Test Project',
      'Project for performance testing',
      'performance_test',
      'system'
    ])

    testProjectId = projectResult.rows[0].id
    testUserId = 'performance_test_user'
  }

  async function cleanupPerformanceTestData(): Promise<void> {
    if (testTemplateId) {
      await pool.query('DELETE FROM document_templates WHERE id = $1', [testTemplateId])
    }
    if (testProjectId) {
      await pool.query('DELETE FROM projects WHERE id = $1', [testProjectId])
    }
  }

  function createPerformanceTestRequest(
    complexity: 'simple' | 'complex' | 'large',
    requestId?: string
  ): DocumentProcessingRequest {
    const baseRequest: DocumentProcessingRequest = {
      request_id: requestId || `perf_test_${complexity}_${Date.now()}`,
      template_id: testTemplateId,
      project_id: testProjectId,
      user_id: testUserId,
      processing_config: {
        enable_parallel_processing: true,
        enable_quality_gates: true,
        enable_monitoring: true,
        max_processing_time: 600000, // 10 minutes
        default_retry_attempts: 2,
        job_timeout: 600000,
        max_concurrent_jobs: 10,
        enable_metrics_collection: true,
        enable_error_tracking: true
      },
      quality_config: {
        minimum_quality_score: 0.8,
        quality_thresholds: {
          overall_quality: 0.8,
          content_quality: 0.8,
          readability_score: 0.75,
          methodology_compliance: 0.9
        }
      },
      output_config: {
        primary_format: 'markdown',
        secondary_formats: ['html'],
        include_metadata: true,
        enable_delivery: false,
        delivery_methods: []
      }
    }

    // Adjust configuration based on complexity
    switch (complexity) {
      case 'simple':
        baseRequest.output_config.secondary_formats = []
        baseRequest.quality_config.minimum_quality_score = 0.7
        break
      case 'complex':
        baseRequest.output_config.secondary_formats = ['pdf', 'html']
        baseRequest.quality_config.minimum_quality_score = 0.8
        break
      case 'large':
        baseRequest.output_config.secondary_formats = ['pdf', 'docx', 'html']
        baseRequest.quality_config.minimum_quality_score = 0.85
        baseRequest.processing_config.max_processing_time = 600000
        break
    }

    return baseRequest
  }
})
