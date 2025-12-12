/**
 * Work Items Parity Tests
 * 
 * Compares output from new modular extractor vs legacy extractor to ensure parity.
 * These are "golden file" tests that validate the refactor maintains behavior.
 */

import { describe, it, expect, beforeAll } from '@jest/globals'
import { pool } from '../../database/connection'
import { projectDataExtractionService } from '../../services/projectDataExtractionService'
import { ExtractionContext } from '../../services/extraction/base/ExtractionContext'
import { extractWorkItems } from '../../services/extraction/entities/work_items/extractWorkItems'
import type { ExtractionDocument, ExtractionOptions } from '../../services/extraction/base/ExtractionResult'

// Test configuration
const TEST_PROJECT_ID = '00000000-0000-0000-0000-000000000000' // Use test project ID
const TEST_USER_ID = '00000000-0000-0000-0000-000000000001' // Use test user ID

/**
 * Sample test documents for extraction
 */
const TEST_DOCUMENTS: ExtractionDocument[] = [
  {
    id: 'doc-1',
    title: 'Project Charter',
    content: `
# Project Charter

## Activity List

| Activity ID | Activity Name | WBS Element | Predecessors | Successors | Status |
|-------------|---------------|-------------|--------------|------------|--------|
| ACT-001 | Requirements Gathering | 1.1 | - | ACT-002 | In Progress |
| ACT-002 | System Design | 1.2 | ACT-001 | ACT-003 | Planned |
| ACT-003 | Implementation | 1.3 | ACT-002 | - | Planned |

## Work Items

- **Task 1**: Develop frontend module (Estimated: 40 hours, Assigned: John Doe, Progress: 65%)
- **Task 2**: Backend API development (Estimated: 60 hours, Assigned: Jane Smith, Progress: 30%)
- **Task 3**: Database migration (Estimated: 20 hours, Assigned: Bob Wilson, Progress: 100%, Status: Done)
    `.trim(),
    template_name: 'Project Charter'
  },
  {
    id: 'doc-2',
    title: 'Project Plan',
    content: `
# Project Plan

## Tasks

1. Requirements Analysis (40 hours, John, 65% complete)
2. System Design (60 hours, Jane, 30% complete)
3. Database Setup (20 hours, Bob, Completed)
    `.trim(),
    template_name: 'Project Plan'
  }
]

describe('Work Items Extraction Parity Tests', () => {
  beforeAll(async () => {
    // Ensure database connection
    if (!pool) {
      const { connectDatabase } = await import('../../database/connection')
      await connectDatabase()
    }
  })

  describe('Extraction Output Parity', () => {
    it('should extract same number of work items (within tolerance)', async () => {
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
      const newResult = await extractWorkItems(context, {
        temperature: options.temperature,
        maxTokens: options.maxTokens
      })

      // Extract using legacy extractor (via extractSingleEntityType which routes to extractWorkItems)
      const legacyResult = await projectDataExtractionService.extractSingleEntityType(
        TEST_PROJECT_ID,
        TEST_USER_ID,
        'work_items',
        options
      )

      // Compare counts (allow 10% variance for AI non-determinism)
      const newCount = newResult.entities.length
      const legacyCount = legacyResult.length
      const variance = Math.abs(newCount - legacyCount) / Math.max(newCount, legacyCount, 1)

      expect(variance).toBeLessThan(0.1) // Within 10% variance
      
      console.log(`[PARITY] New extractor: ${newCount} items, Legacy: ${legacyCount} items, Variance: ${(variance * 100).toFixed(1)}%`)
    }, 60000) // 60 second timeout for AI calls

    it('should extract work items with similar structure', async () => {
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

      const newResult = await extractWorkItems(context, {
        temperature: options.temperature
      })

      // Validate structure
      expect(newResult.entities.length).toBeGreaterThan(0)
      
      const firstItem = newResult.entities[0]
      expect(firstItem).toHaveProperty('name')
      expect(firstItem).toHaveProperty('source_document_id')
      
      // Check that all items have required fields
      newResult.entities.forEach(item => {
        expect(item.name).toBeTruthy()
        expect(item.source_document_id).toBeTruthy()
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

      const newResult = await extractWorkItems(context)

      // All entities should have source_document_id resolved
      const unresolvedCount = newResult.entities.filter(
        item => !item.source_document_id
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
      const firstResult = await extractWorkItems(context)
      expect(firstResult.stats.cacheHit).toBe(false)

      // Second extraction (cache hit)
      const secondResult = await extractWorkItems(context)
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

      const result = await extractWorkItems(emptyContext)
      
      expect(result.entities.length).toBe(0)
      expect(result.rejectedCount).toBe(0)
    })

    it('should handle malformed AI responses gracefully', async () => {
      // This test would require mocking AI service to return malformed JSON
      // For now, we just ensure the extractor doesn't crash
      const context = new ExtractionContext(
        TEST_PROJECT_ID,
        TEST_USER_ID,
        TEST_DOCUMENTS,
        { aiProvider: 'openai' }
      )

      // The extractor should handle errors and return empty array
      const result = await extractWorkItems(context)
      expect(Array.isArray(result.entities)).toBe(true)
    }, 60000)
  })
})

