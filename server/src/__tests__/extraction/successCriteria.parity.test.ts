/**
 * Success Criteria Parity Tests
 * 
 * Compares output from new modular extractor vs legacy extractor to ensure parity.
 * Success criteria include KPIs, acceptance criteria, quality gates, and success metrics.
 */

import { describe, it, expect, beforeAll } from '@jest/globals'
import { pool } from '../../database/connection'
import { projectDataExtractionService } from '../../services/projectDataExtractionService'
import { ExtractionContext } from '../../services/extraction/base/ExtractionContext'
import { extractSuccessCriteria } from '../../services/extraction/entities/success_criteria/extractSuccessCriteria'
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
    title: 'Project Success Criteria',
    content: `
# Project Success Criteria

## Key Performance Indicators

### User Satisfaction
- **Metric**: Customer Satisfaction Score (CSAT)
- **Target Value**: 95%
- **Measurement Method**: Post-interaction surveys
- **Priority**: Critical

### System Performance
- **Metric**: Response Time
- **Target Value**: < 2 seconds
- **Measurement Method**: Performance monitoring tools
- **Priority**: High

### Quality Metrics
- **Metric**: Defect Rate
- **Target Value**: < 1%
- **Measurement Method**: QA testing results
- **Priority**: High

## Acceptance Criteria

### Feature Completion
- **Metric**: Feature Completion Rate
- **Target Value**: 100%
- **Measurement Method**: Sprint reviews
- **Priority**: Critical
    `.trim(),
    template_name: 'Project Success Criteria'
  }
]

describe('Success Criteria Extraction Parity Tests', () => {
  beforeAll(async () => {
    // Ensure database connection
    if (!pool) {
      const { connectDatabase } = await import('../../database/connection')
      await connectDatabase()
    }
  })

  describe('Extraction Output Parity', () => {
    it('should extract same number of success criteria (within tolerance)', async () => {
      const options: ExtractionOptions = {
        aiProvider: 'openai',
        aiModel: 'gpt-4',
        temperature: 0.3,
        maxTokens: 10000
      }

      // Create context for new extractor
      const context = new ExtractionContext(
        TEST_PROJECT_ID,
        TEST_USER_ID,
        TEST_DOCUMENTS,
        options
      )

      // Extract using new modular extractor
      const newResult = await extractSuccessCriteria(context, {
        temperature: options.temperature,
        maxTokens: options.maxTokens
      })

      // Extract using legacy extractor
      const legacyResult = await projectDataExtractionService.extractSingleEntityType(
        TEST_PROJECT_ID,
        TEST_USER_ID,
        'success_criteria',
        options
      )

      // Compare counts (allow 10% variance for AI non-determinism)
      const newCount = newResult.entities.length
      const legacyCount = legacyResult.length
      const variance = Math.abs(newCount - legacyCount) / Math.max(newCount, legacyCount, 1)

      expect(variance).toBeLessThan(0.1) // Within 10% variance
      
      console.log(`[PARITY] New extractor: ${newCount} items, Legacy: ${legacyCount} items, Variance: ${(variance * 100).toFixed(1)}%`)
    }, 60000) // 60 second timeout for AI calls

    it('should extract success criteria with similar structure', async () => {
      const options: ExtractionOptions = {
        aiProvider: 'openai',
        aiModel: 'gpt-4',
        temperature: 0.3
      }

      const context = new ExtractionContext(
        TEST_PROJECT_ID,
        TEST_USER_ID,
        TEST_DOCUMENTS,
        options
      )

      const newResult = await extractSuccessCriteria(context, {
        temperature: options.temperature
      })

      // Validate structure
      expect(newResult.entities.length).toBeGreaterThan(0)
      
      const firstCriterion = newResult.entities[0]
      expect(firstCriterion).toHaveProperty('title')
      expect(firstCriterion).toHaveProperty('description')
      expect(firstCriterion).toHaveProperty('metric')
      expect(firstCriterion).toHaveProperty('target_value')
      expect(firstCriterion).toHaveProperty('measurement_method')
      expect(firstCriterion).toHaveProperty('priority')
      expect(firstCriterion).toHaveProperty('source_document_id')
      
      // Check that all success criteria have required fields
      newResult.entities.forEach(criterion => {
        expect(criterion.title).toBeTruthy()
        expect(criterion.description).toBeTruthy()
        expect(criterion.metric).toBeTruthy()
        expect(criterion.target_value).toBeTruthy()
        expect(criterion.measurement_method).toBeTruthy()
        expect(['critical', 'high', 'medium', 'low']).toContain(criterion.priority)
        expect(criterion.source_document_id).toBeTruthy()
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

      const newResult = await extractSuccessCriteria(context)

      // All entities should have source_document_id resolved
      const unresolvedCount = newResult.entities.filter(
        criterion => !criterion.source_document_id
      ).length

      expect(unresolvedCount).toBe(0)
      expect(newResult.rejectedCount).toBeGreaterThanOrEqual(0)
    }, 60000)

    it('should handle numeric target_value extraction', async () => {
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

      const result = await extractSuccessCriteria(context)

      // Check that target_value can be extracted as numeric
      result.entities.forEach(criterion => {
        // target_value should be a string that can potentially be parsed
        expect(typeof criterion.target_value).toBe('string')
        // Should contain numeric content (e.g., "95%", "100", "< 2 seconds")
        expect(criterion.target_value.length).toBeGreaterThan(0)
      })
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
      const firstResult = await extractSuccessCriteria(context)
      expect(firstResult.stats.cacheHit).toBe(false)

      // Second extraction (cache hit)
      const secondResult = await extractSuccessCriteria(context)
      expect(secondResult.stats.cacheHit).toBe(true)
      expect(secondResult.entities.length).toBe(firstResult.entities.length)
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

      const result = await extractSuccessCriteria(emptyContext)
      
      expect(result.entities.length).toBe(0)
      expect(result.rejectedCount).toBe(0)
    })
  })
})

