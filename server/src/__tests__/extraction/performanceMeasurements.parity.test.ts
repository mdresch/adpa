/**
 * Performance Measurements Parity Tests
 * 
 * Compares output from new modular extractor vs legacy extractor to ensure parity.
 * This entity is complex as it requires linking to success_criteria.
 */

import { describe, it, expect, beforeAll } from '@jest/globals'
import { pool } from '../../database/connection'
import { projectDataExtractionService } from '../../services/projectDataExtractionService'
import { ExtractionContext } from '../../services/extraction/base/ExtractionContext'
import { extractPerformanceMeasurements } from '../../services/extraction/entities/performance_measurements/extractPerformanceMeasurements'
import type { ExtractionDocument, ExtractionOptions } from '../../services/extraction/base/ExtractionResult'

// Test configuration
const TEST_PROJECT_ID = '00000000-0000-0000-0000-000000000000'
const TEST_USER_ID = '00000000-0000-0000-0000-000000000001'

/**
 * Sample test documents for extraction
 */
const TEST_DOCUMENTS: ExtractionDocument[] = [
  {
    id: 'doc-1',
    title: 'Performance Report',
    content: `
# Performance Report

## Success Criteria Measurements

### Response Time
- **Target**: < 2 seconds
- **Actual**: 1.8 seconds (as of 2024-01-15)
- **Status**: On Track
- **Trend**: Improving

### User Satisfaction
- **Target**: > 90%
- **Actual**: 92% (as of 2024-01-15)
- **Status**: On Track
- **Trend**: Stable

### System Uptime
- **Target**: 99.9%
- **Actual**: 99.5% (as of 2024-01-15)
- **Status**: At Risk
- **Trend**: Declining
    `.trim(),
    template_name: 'Performance Report'
  }
]

describe('Performance Measurements Extraction Parity Tests', () => {
  beforeAll(async () => {
    // Ensure database connection
    if (!pool) {
      const { connectDatabase } = await Promise.resolve().then(() => require())
      await connectDatabase()
    }
  })

  describe('Extraction Output Parity', () => {
    it('should extract same number of performance measurements (within tolerance)', async () => {
      const options: ExtractionOptions = {
        aiProvider: 'openai',
        aiModel: 'gpt-4',
        temperature: 0.2,
        maxTokens: 8000
      }

      // Create context for new extractor
      const context = new ExtractionContext(
        TEST_PROJECT_ID,
        TEST_USER_ID,
        TEST_DOCUMENTS,
        options
      )

      // Extract using new modular extractor
      const newResult = await extractPerformanceMeasurements(context, {
        temperature: options.temperature,
        maxTokens: options.maxTokens
      })

      // Extract using legacy extractor
      const legacyResult = await projectDataExtractionService.extractSingleEntityType(
        TEST_PROJECT_ID,
        TEST_USER_ID,
        'performance_measurements',
        options
      )

      // Compare counts (allow 10% variance for AI non-determinism)
      const newCount = newResult.entities.length
      const legacyCount = legacyResult.length
      const variance = Math.abs(newCount - legacyCount) / Math.max(newCount, legacyCount, 1)

      expect(variance).toBeLessThan(0.1) // Within 10% variance
      
      console.log(`[PARITY] New extractor: ${newCount} items, Legacy: ${legacyCount} items, Variance: ${(variance * 100).toFixed(1)}%`)
    }, 60000) // 60 second timeout for AI calls

    it('should extract performance measurements with similar structure', async () => {
      const options: ExtractionOptions = {
        aiProvider: 'openai',
        aiModel: 'gpt-4',
        temperature: 0.2
      }

      const context = new ExtractionContext(
        TEST_PROJECT_ID,
        TEST_USER_ID,
        TEST_DOCUMENTS,
        options
      )

      const newResult = await extractPerformanceMeasurements(context, {
        temperature: options.temperature
      })

      // Validate structure
      expect(newResult.entities.length).toBeGreaterThan(0)
      
      const firstMeasurement = newResult.entities[0]
      expect(firstMeasurement).toHaveProperty('success_criterion_name')
      expect(firstMeasurement).toHaveProperty('measurement_date')
      expect(firstMeasurement).toHaveProperty('source_document_id')
      
      // Check that all measurements have required fields
      newResult.entities.forEach(measurement => {
        expect(measurement.success_criterion_name).toBeTruthy()
        expect(measurement.measurement_date).toBeTruthy()
        expect(measurement.source_document_id).toBeTruthy()
      })
    }, 60000)

    it('should handle source document resolution consistently', async () => {
      const options: ExtractionOptions = {
        aiProvider: 'openai',
        aiModel: 'gpt-4'
      }

      const context = new ExtractionContext(
        TEST_PROJECT_ID,
        TEST_USER_ID,
        TEST_DOCUMENTS,
        options
      )

      const newResult = await extractPerformanceMeasurements(context)

      // All entities should have source_document_id resolved
      const unresolvedCount = newResult.entities.filter(
        measurement => !measurement.source_document_id
      ).length

      expect(unresolvedCount).toBe(0)
      expect(newResult.rejectedCount).toBeGreaterThanOrEqual(0)
    }, 60000)

    it('should handle cache correctly', async () => {
      const options: ExtractionOptions = {
        aiProvider: 'openai',
        aiModel: 'gpt-4'
      }

      const context = new ExtractionContext(
        TEST_PROJECT_ID,
        TEST_USER_ID,
        TEST_DOCUMENTS,
        options
      )

      // First extraction (cache miss)
      const firstResult = await extractPerformanceMeasurements(context)
      expect(firstResult.stats.cacheHit).toBe(false)

      // Second extraction (cache hit)
      const secondResult = await extractPerformanceMeasurements(context)
      expect(secondResult.stats.cacheHit).toBe(true)
      expect(secondResult.entities.length).toBe(firstResult.entities.length)
    }, 60000)

    it('should normalize numeric values correctly', async () => {
      const options: ExtractionOptions = {
        aiProvider: 'openai',
        aiModel: 'gpt-4'
      }

      const context = new ExtractionContext(
        TEST_PROJECT_ID,
        TEST_USER_ID,
        TEST_DOCUMENTS,
        options
      )

      const result = await extractPerformanceMeasurements(context)

      // Check that numeric fields are properly normalized
      result.entities.forEach(measurement => {
        if (measurement.actual_value !== null && measurement.actual_value !== undefined) {
          expect(typeof measurement.actual_value).toBe('number')
        }
        if (measurement.target_value !== null && measurement.target_value !== undefined) {
          expect(typeof measurement.target_value).toBe('number')
        }
        if (measurement.variance !== null && measurement.variance !== undefined) {
          expect(typeof measurement.variance).toBe('number')
        }
        if (measurement.variance_percentage !== null && measurement.variance_percentage !== undefined) {
          expect(typeof measurement.variance_percentage).toBe('number')
        }
      })
    }, 60000)
  })

  describe('Error Handling Parity', () => {
    it('should handle empty documents gracefully', async () => {
      const emptyContext = new ExtractionContext(
        TEST_PROJECT_ID,
        TEST_USER_ID,
        [],
        { aiProvider: 'openai' }
      )

      const result = await extractPerformanceMeasurements(emptyContext)
      
      expect(result.entities.length).toBe(0)
      expect(result.rejectedCount).toBe(0)
    })

    it('should handle missing measurement dates gracefully', async () => {
      // This test would require mocking AI service to return measurements without dates
      // For now, we just ensure the extractor doesn't crash
      const context = new ExtractionContext(
        TEST_PROJECT_ID,
        TEST_USER_ID,
        TEST_DOCUMENTS,
        { aiProvider: 'openai' }
      )

      const result = await extractPerformanceMeasurements(context)
      expect(Array.isArray(result.entities)).toBe(true)
      
      // All entities should have measurement_date (extractor should add fallback date)
      result.entities.forEach(measurement => {
        expect(measurement.measurement_date).toBeTruthy()
      })
    }, 60000)
  })
})

