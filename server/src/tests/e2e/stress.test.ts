/**
 * Stress Testing Suite
 * Comprehensive stress testing for the 6-stage document generation pipeline
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { MultiStageDocumentProcessor } from '../../modules/multiStageDocumentProcessor'
import { pool } from '../../database/connection'
import { logger } from '../../utils/logger'
import type { DocumentProcessingRequest } from '../../modules/multiStageDocumentProcessor/types'

describe('Stress Testing Suite', () => {
  let processor: MultiStageDocumentProcessor
  let testTemplateId: string
  let testProjectId: string
  let testUserId: string

  beforeAll(async () => {
    processor = new MultiStageDocumentProcessor({
      enableParallelProcessing: true,
      enableQualityGates: true,
      enableMonitoring: true,
      maxProcessingTime: 900000, // 15 minutes for stress tests
      defaultRetryAttempts: 1, // Reduced retries for stress tests
      jobTimeout: 900000,
      maxConcurrentJobs: 20, // Higher concurrency for stress tests
      enableMetricsCollection: true,
      enableErrorTracking: true
    })

    await setupStressTestData()
  })

  afterAll(async () => {
    await cleanupStressTestData()
  })

  describe('High Volume Processing', () => {
    it('should handle 20 concurrent simple documents', async () => {
      const requests = Array.from({ length: 20 }, (_, i) => 
        createStressTestRequest('simple', `high_volume_simple_${i}`)
      )

      const startTime = Date.now()
      const results = await Promise.allSettled(requests.map(req => processor.processDocument(req)))
      const endTime = Date.now()

      const totalTime = endTime - startTime
      const successfulResults = results.filter(r => r.status === 'fulfilled')
      const failedResults = results.filter(r => r.status === 'rejected')

      // At least 80% should succeed (16 out of 20)
      expect(successfulResults.length).toBeGreaterThanOrEqual(16)
      expect(failedResults.length).toBeLessThanOrEqual(4)

      // Total time should be reasonable even with failures
      expect(totalTime).toBeLessThan(300000) // 5 minutes
      
      logger.info(`High volume test - Successful: ${successfulResults.length}/20, Failed: ${failedResults.length}/20, Time: ${totalTime}ms`)
    })

    it('should handle 10 concurrent complex documents', async () => {
      const requests = Array.from({ length: 10 }, (_, i) => 
        createStressTestRequest('complex', `high_volume_complex_${i}`)
      )

      const startTime = Date.now()
      const results = await Promise.allSettled(requests.map(req => processor.processDocument(req)))
      const endTime = Date.now()

      const totalTime = endTime - startTime
      const successfulResults = results.filter(r => r.status === 'fulfilled')
      const failedResults = results.filter(r => r.status === 'rejected')

      // At least 70% should succeed (7 out of 10)
      expect(successfulResults.length).toBeGreaterThanOrEqual(7)
      expect(failedResults.length).toBeLessThanOrEqual(3)

      // Total time should be reasonable
      expect(totalTime).toBeLessThan(600000) // 10 minutes
      
      logger.info(`High volume complex test - Successful: ${successfulResults.length}/10, Failed: ${failedResults.length}/10, Time: ${totalTime}ms`)
    })
  })

  describe('Sustained Load Testing', () => {
    it('should maintain performance under sustained load', async () => {
      const batchSize = 5
      const totalBatches = 6 // 30 documents total
      const batchInterval = 30000 // 30 seconds between batches

      const allResults: PromiseSettledResult<any>[] = []
      const startTime = Date.now()

      for (let batch = 0; batch < totalBatches; batch++) {
        const batchRequests = Array.from({ length: batchSize }, (_, i) => 
          createStressTestRequest('simple', `sustained_load_batch_${batch}_${i}`)
        )

        logger.info(`Starting batch ${batch + 1}/${totalBatches}`)
        const batchStartTime = Date.now()
        
        const batchResults = await Promise.allSettled(
          batchRequests.map(req => processor.processDocument(req))
        )
        
        const batchEndTime = Date.now()
        const batchTime = batchEndTime - batchStartTime

        allResults.push(...batchResults)
        
        logger.info(`Batch ${batch + 1} completed in ${batchTime}ms`)

        // Wait between batches (except for the last one)
        if (batch < totalBatches - 1) {
          await new Promise(resolve => setTimeout(resolve, batchInterval))
        }
      }

      const endTime = Date.now()
      const totalTime = endTime - startTime

      const successfulResults = allResults.filter(r => r.status === 'fulfilled')
      const failedResults = allResults.filter(r => r.status === 'rejected')

      // At least 80% should succeed (24 out of 30)
      expect(successfulResults.length).toBeGreaterThanOrEqual(24)
      expect(failedResults.length).toBeLessThanOrEqual(6)

      // Performance should not degrade significantly
      const averageTimePerDocument = totalTime / (batchSize * totalBatches)
      expect(averageTimePerDocument).toBeLessThan(60000) // Less than 1 minute per document on average
      
      logger.info(`Sustained load test - Total: ${totalBatches * batchSize} documents, Successful: ${successfulResults.length}, Failed: ${failedResults.length}, Total time: ${totalTime}ms, Avg per doc: ${averageTimePerDocument.toFixed(0)}ms`)
    })
  })

  describe('Resource Exhaustion Testing', () => {
    it('should handle memory pressure gracefully', async () => {
      // Process documents in rapid succession to test memory management
      const requests = Array.from({ length: 15 }, (_, i) => 
        createStressTestRequest('complex', `memory_pressure_${i}`)
      )

      const initialMemory = process.memoryUsage()
      const startTime = Date.now()

      // Process with minimal delay between requests
      const results = await Promise.allSettled(
        requests.map(async (req, index) => {
          // Small delay to prevent overwhelming the system
          if (index > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
          return processor.processDocument(req)
        })
      )

      const endTime = Date.now()
      const finalMemory = process.memoryUsage()

      const totalTime = endTime - startTime
      const successfulResults = results.filter(r => r.status === 'fulfilled')
      const failedResults = results.filter(r => r.status === 'rejected')

      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed
      const memoryIncreaseMB = memoryIncrease / 1024 / 1024

      // Should handle memory pressure without crashing
      expect(successfulResults.length).toBeGreaterThanOrEqual(10) // At least 2/3 should succeed
      expect(failedResults.length).toBeLessThanOrEqual(5)

      // Memory increase should be reasonable
      expect(memoryIncreaseMB).toBeLessThan(500) // Less than 500MB increase
      
      logger.info(`Memory pressure test - Successful: ${successfulResults.length}/15, Memory increase: ${memoryIncreaseMB.toFixed(2)}MB, Time: ${totalTime}ms`)
    })

    it('should handle database connection pressure', async () => {
      // Test with high concurrency to stress database connections
      const requests = Array.from({ length: 25 }, (_, i) => 
        createStressTestRequest('simple', `db_pressure_${i}`)
      )

      const startTime = Date.now()
      const results = await Promise.allSettled(requests.map(req => processor.processDocument(req)))
      const endTime = Date.now()

      const totalTime = endTime - startTime
      const successfulResults = results.filter(r => r.status === 'fulfilled')
      const failedResults = results.filter(r => r.status === 'rejected')

      // Should handle database pressure without major failures
      expect(successfulResults.length).toBeGreaterThanOrEqual(18) // At least 70% should succeed
      expect(failedResults.length).toBeLessThanOrEqual(7)

      // Should complete within reasonable time
      expect(totalTime).toBeLessThan(400000) // Less than 7 minutes
      
      logger.info(`Database pressure test - Successful: ${successfulResults.length}/25, Failed: ${failedResults.length}/25, Time: ${totalTime}ms`)
    })
  })

  describe('Error Recovery Testing', () => {
    it('should recover from temporary failures', async () => {
      // Mix of valid and invalid requests to test error recovery
      const validRequests = Array.from({ length: 5 }, (_, i) => 
        createStressTestRequest('simple', `recovery_valid_${i}`)
      )
      
      const invalidRequests = Array.from({ length: 5 }, (_, i) => ({
        ...createStressTestRequest('simple', `recovery_invalid_${i}`),
        template_id: 'invalid_template_id'
      }))

      const allRequests = [...validRequests, ...invalidRequests]
      
      const startTime = Date.now()
      const results = await Promise.allSettled(allRequests.map(req => processor.processDocument(req)))
      const endTime = Date.now()

      const totalTime = endTime - startTime
      const successfulResults = results.filter(r => r.status === 'fulfilled')
      const failedResults = results.filter(r => r.status === 'rejected')

      // All valid requests should succeed
      const validResults = results.slice(0, 5).filter(r => r.status === 'fulfilled')
      expect(validResults.length).toBe(5)

      // Invalid requests should fail gracefully
      const invalidResults = results.slice(5, 10).filter(r => r.status === 'rejected')
      expect(invalidResults.length).toBe(5)

      // System should recover and complete within reasonable time
      expect(totalTime).toBeLessThan(180000) // Less than 3 minutes
      
      logger.info(`Error recovery test - Valid succeeded: ${validResults.length}/5, Invalid failed: ${invalidResults.length}/5, Time: ${totalTime}ms`)
    })
  })

  describe('Peak Load Testing', () => {
    it('should handle peak load conditions', async () => {
      // Simulate peak load with maximum concurrent requests
      const requests = Array.from({ length: 30 }, (_, i) => 
        createStressTestRequest('simple', `peak_load_${i}`)
      )

      const startTime = Date.now()
      const results = await Promise.allSettled(requests.map(req => processor.processDocument(req)))
      const endTime = Date.now()

      const totalTime = endTime - startTime
      const successfulResults = results.filter(r => r.status === 'fulfilled')
      const failedResults = results.filter(r => r.status === 'rejected')

      // Should handle peak load with reasonable success rate
      expect(successfulResults.length).toBeGreaterThanOrEqual(20) // At least 65% should succeed
      expect(failedResults.length).toBeLessThanOrEqual(10)

      // Should complete within acceptable time even under peak load
      expect(totalTime).toBeLessThan(600000) // Less than 10 minutes
      
      // Calculate throughput
      const throughput = successfulResults.length / (totalTime / 1000) // documents per second
      expect(throughput).toBeGreaterThan(0.1) // At least 0.1 documents per second
      
      logger.info(`Peak load test - Successful: ${successfulResults.length}/30, Failed: ${failedResults.length}/30, Time: ${totalTime}ms, Throughput: ${throughput.toFixed(3)} docs/sec`)
    })
  })

  describe('Long Running Process Testing', () => {
    it('should handle long-running processes without timeouts', async () => {
      const request = createStressTestRequest('complex', 'long_running_test')
      
      // Configure for longer processing time
      request.processing_config.max_processing_time = 600000 // 10 minutes
      request.processing_config.job_timeout = 600000
      request.output_config.secondary_formats = ['pdf', 'docx', 'html', 'xml', 'json']

      const startTime = Date.now()
      const result = await processor.processDocument(request)
      const endTime = Date.now()

      const processingTime = endTime - startTime

      expect(result.status.status).toBe('completed')
      expect(processingTime).toBeLessThan(600000) // Should complete within 10 minutes
      expect(result.processing_metrics.total_processing_time).toBeLessThan(processingTime)
      
      logger.info(`Long running process test completed in: ${processingTime}ms`)
    })
  })

  // Helper functions
  async function setupStressTestData(): Promise<void> {
    // Create stress test template
    const templateResult = await pool.query(`
      INSERT INTO document_templates (name, description, content, template_type, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [
      'Stress Test Template',
      'Template for stress testing',
      '# {{project_name}}\n\n## Overview\n{{project_overview}}\n\n## Requirements\n{{requirements}}\n\n## Analysis\n{{analysis}}\n\n## Recommendations\n{{recommendations}}\n\n## Implementation\n{{implementation}}',
      'stress_test',
      'system'
    ])

    testTemplateId = templateResult.rows[0].id

    // Create stress test project
    const projectResult = await pool.query(`
      INSERT INTO projects (name, description, project_type, created_by)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, [
      'Stress Test Project',
      'Project for stress testing',
      'stress_test',
      'system'
    ])

    testProjectId = projectResult.rows[0].id
    testUserId = 'stress_test_user'
  }

  async function cleanupStressTestData(): Promise<void> {
    if (testTemplateId) {
      await pool.query('DELETE FROM document_templates WHERE id = $1', [testTemplateId])
    }
    if (testProjectId) {
      await pool.query('DELETE FROM projects WHERE id = $1', [testProjectId])
    }
  }

  function createStressTestRequest(
    complexity: 'simple' | 'complex',
    requestId: string
  ): DocumentProcessingRequest {
    const baseRequest: DocumentProcessingRequest = {
      request_id: requestId,
      template_id: testTemplateId,
      project_id: testProjectId,
      user_id: testUserId,
      processing_config: {
        enable_parallel_processing: true,
        enable_quality_gates: true,
        enable_monitoring: true,
        max_processing_time: 300000, // 5 minutes
        default_retry_attempts: 1, // Reduced for stress tests
        job_timeout: 300000,
        max_concurrent_jobs: 20,
        enable_metrics_collection: true,
        enable_error_tracking: true
      },
      quality_config: {
        minimum_quality_score: 0.7, // Relaxed for stress tests
        quality_thresholds: {
          overall_quality: 0.7,
          content_quality: 0.7,
          readability_score: 0.65,
          methodology_compliance: 0.8
        }
      },
      output_config: {
        primary_format: 'markdown',
        secondary_formats: ['html'],
        include_metadata: false, // Reduced metadata for stress tests
        enable_delivery: false,
        delivery_methods: []
      }
    }

    // Adjust configuration based on complexity
    if (complexity === 'complex') {
      baseRequest.output_config.secondary_formats = ['pdf', 'html']
      baseRequest.quality_config.minimum_quality_score = 0.75
    }

    return baseRequest
  }
})
