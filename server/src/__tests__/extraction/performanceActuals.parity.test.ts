/**
 * Performance Actuals Parity Tests
 * 
 * Compares output from new modular extractor vs legacy extractor to ensure parity.
 * This entity is complex as it tracks actual vs. planned performance across multiple dimensions.
 */

import { describe, it, expect, beforeAll } from '@jest/globals'
import { pool } from '../../database/connection'
import { projectDataExtractionService } from '../../services/projectDataExtractionService'
import { ExtractionContext } from '../../services/extraction/base/ExtractionContext'
import { extractPerformanceActuals } from '../../services/extraction/entities/performance_actuals/extractPerformanceActuals'
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
    title: 'Status Report',
    content: `
# Project Status Report

## Milestone: Phase 1 Completion
- **Planned Start**: 2024-01-01
- **Actual Start**: 2024-01-02
- **Planned End**: 2024-03-31
- **Actual End**: 2024-04-05
- **Planned Cost**: $100,000
- **Actual Cost**: $105,000
- **Progress**: 100% complete
- **Quality Score**: 8.5/10

## Deliverable: System Design Document
- **Planned Completion**: 2024-02-15
- **Actual Completion**: 2024-02-18
- **Progress**: 100% complete
- **Defects Found**: 3
- **Rework Hours**: 8
    `.trim(),
    template_name: 'Status Report'
  }
]

describe('Performance Actuals Extraction Parity Tests', () => {
  beforeAll(async () => {
    // Ensure database connection
    if (!pool) {
      const { connectDatabase } = await import('../../database/connection')
      await connectDatabase()
    }
  })

  describe('Extraction Output Parity', () => {
    it('should extract same number of performance actuals (within tolerance)', async () => {
      const options: ExtractionOptions = {
        aiProvider: 'openai',
        aiModel: 'gpt-4',
        temperature: 0.3,
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
      const newResult = await extractPerformanceActuals(context, {
        temperature: options.temperature,
        maxTokens: options.maxTokens
      })

      // Extract using legacy extractor
      const legacyResult = await projectDataExtractionService.extractSingleEntityType(
        TEST_PROJECT_ID,
        TEST_USER_ID,
        'performance_actuals',
        options
      )

      // Compare counts (allow 10% variance for AI non-determinism)
      const newCount = newResult.entities.length
      const legacyCount = legacyResult.length
      const variance = Math.abs(newCount - legacyCount) / Math.max(newCount, legacyCount, 1)

      expect(variance).toBeLessThan(0.1) // Within 10% variance
      
      console.log(`[PARITY] New extractor: ${newCount} items, Legacy: ${legacyCount} items, Variance: ${(variance * 100).toFixed(1)}%`)
    }, 60000) // 60 second timeout for AI calls

    it('should extract performance actuals with similar structure', async () => {
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

      const newResult = await extractPerformanceActuals(context, {
        temperature: options.temperature
      })

      // Validate structure
      expect(newResult.entities.length).toBeGreaterThan(0)
      
      const firstActual = newResult.entities[0]
      expect(firstActual).toHaveProperty('entity_type')
      expect(firstActual).toHaveProperty('entity_name')
      expect(firstActual).toHaveProperty('source_document_id')
      
      // Check that all actuals have required fields
      newResult.entities.forEach(actual => {
        expect(actual.entity_name).toBeTruthy()
        expect(['milestone', 'deliverable', 'activity', 'phase', 'resource']).toContain(actual.entity_type)
        expect(actual.source_document_id).toBeTruthy()
      })
    }, 60000)

    it('should only extract actual data (not planned-only)', async () => {
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

      const result = await extractPerformanceActuals(context)

      // All entities should have at least one actual data point
      result.entities.forEach(actual => {
        const hasActualData = 
          actual.actual_start_date ||
          actual.actual_end_date ||
          actual.actual_cost !== null ||
          actual.actual_progress_percent !== null ||
          actual.quality_score !== null
        
        expect(hasActualData).toBe(true)
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

      const newResult = await extractPerformanceActuals(context)

      // All entities should have source_document_id resolved
      const unresolvedCount = newResult.entities.filter(
        actual => !actual.source_document_id
      ).length

      expect(unresolvedCount).toBe(0)
      expect(newResult.rejectedCount).toBeGreaterThanOrEqual(0)
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

      const result = await extractPerformanceActuals(context)

      // Check that numeric fields are properly normalized
      result.entities.forEach(actual => {
        if (actual.planned_cost !== null && actual.planned_cost !== undefined) {
          expect(typeof actual.planned_cost).toBe('number')
        }
        if (actual.actual_cost !== null && actual.actual_cost !== undefined) {
          expect(typeof actual.actual_cost).toBe('number')
        }
        if (actual.actual_progress_percent !== null && actual.actual_progress_percent !== undefined) {
          expect(typeof actual.actual_progress_percent).toBe('number')
          expect(actual.actual_progress_percent).toBeGreaterThanOrEqual(0)
          expect(actual.actual_progress_percent).toBeLessThanOrEqual(100)
        }
        if (actual.quality_score !== null && actual.quality_score !== undefined) {
          expect(typeof actual.quality_score).toBe('number')
          expect(actual.quality_score).toBeGreaterThanOrEqual(0)
          expect(actual.quality_score).toBeLessThanOrEqual(10)
        }
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
      const firstResult = await extractPerformanceActuals(context)
      expect(firstResult.stats.cacheHit).toBe(false)

      // Second extraction (cache hit)
      const secondResult = await extractPerformanceActuals(context)
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

      const result = await extractPerformanceActuals(emptyContext)
      
      expect(result.entities.length).toBe(0)
      expect(result.rejectedCount).toBe(0)
    })
  })
})

