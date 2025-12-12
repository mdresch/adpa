/**
 * Deliverables Parity Tests
 * 
 * Compares output from new modular extractor vs legacy extractor to ensure parity.
 * Deliverables include documents, software, hardware, services, and reports.
 */

import { describe, it, expect, beforeAll } from '@jest/globals'
import { pool } from '../../database/connection'
import { projectDataExtractionService } from '../../services/projectDataExtractionService'
import { ExtractionContext } from '../../services/extraction/base/ExtractionContext'
import { extractDeliverables } from '../../services/extraction/entities/deliverables/extractDeliverables'
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
    title: 'Project Deliverables',
    content: `
# Project Deliverables

## Documents

### Project Charter
- **Description**: Official project initiation document
- **Type**: Document
- **Due Date**: 2024-01-15
- **Status**: Completed
- **Owner**: Project Manager

### Requirements Specification
- **Description**: Detailed requirements document
- **Type**: Document
- **Due Date**: 2024-02-28
- **Status**: In Progress

## Software

### MVP Application
- **Description**: Minimum viable product application
- **Type**: Software
- **Due Date**: 2024-06-30
- **Status**: Planned
- **Owner**: Development Team
    `.trim(),
    template_name: 'Project Deliverables'
  }
]

describe('Deliverables Extraction Parity Tests', () => {
  beforeAll(async () => {
    // Ensure database connection
    if (!pool) {
      const { connectDatabase } = await import('../../database/connection')
      await connectDatabase()
    }
  })

  describe('Extraction Output Parity', () => {
    it('should extract same number of deliverables (within tolerance)', async () => {
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
      const newResult = await extractDeliverables(context, {
        temperature: options.temperature,
        maxTokens: options.maxTokens
      })

      // Extract using legacy extractor
      const legacyResult = await projectDataExtractionService.extractSingleEntityType(
        TEST_PROJECT_ID,
        TEST_USER_ID,
        'deliverables',
        options
      )

      // Compare counts (allow 10% variance for AI non-determinism)
      const newCount = newResult.entities.length
      const legacyCount = legacyResult.length
      const variance = Math.abs(newCount - legacyCount) / Math.max(newCount, legacyCount, 1)

      expect(variance).toBeLessThan(0.1) // Within 10% variance
      
      console.log(`[PARITY] New extractor: ${newCount} items, Legacy: ${legacyCount} items, Variance: ${(variance * 100).toFixed(1)}%`)
    }, 60000) // 60 second timeout for AI calls

    it('should extract deliverables with similar structure', async () => {
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

      const newResult = await extractDeliverables(context, {
        temperature: options.temperature
      })

      // Validate structure
      expect(newResult.entities.length).toBeGreaterThan(0)
      
      const firstDeliverable = newResult.entities[0]
      expect(firstDeliverable).toHaveProperty('name')
      expect(firstDeliverable).toHaveProperty('description')
      expect(firstDeliverable).toHaveProperty('source_document_id')
      
      // Check that all deliverables have required fields
      newResult.entities.forEach(deliverable => {
        expect(deliverable.name).toBeTruthy()
        expect(deliverable.description).toBeTruthy()
        expect(['document', 'software', 'hardware', 'service', 'report', 'other']).toContain(deliverable.type)
        expect(['planned', 'in_progress', 'completed', 'delayed', 'cancelled']).toContain(deliverable.status)
        expect(deliverable.source_document_id).toBeTruthy()
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

      const newResult = await extractDeliverables(context)

      // All entities should have source_document_id resolved
      const unresolvedCount = newResult.entities.filter(
        deliverable => !deliverable.source_document_id
      ).length

      expect(unresolvedCount).toBe(0)
      expect(newResult.rejectedCount).toBeGreaterThanOrEqual(0)
    }, 60000)

    it('should normalize enum values correctly', async () => {
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

      const result = await extractDeliverables(context)

      // Check that enum fields are valid
      result.entities.forEach(deliverable => {
        expect(['document', 'software', 'hardware', 'service', 'report', 'other']).toContain(deliverable.type)
        expect(['planned', 'in_progress', 'completed', 'delayed', 'cancelled']).toContain(deliverable.status)
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
      const firstResult = await extractDeliverables(context)
      expect(firstResult.stats.cacheHit).toBe(false)

      // Second extraction (cache hit)
      const secondResult = await extractDeliverables(context)
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

      const result = await extractDeliverables(emptyContext)
      
      expect(result.entities.length).toBe(0)
      expect(result.rejectedCount).toBe(0)
    })
  })
})

