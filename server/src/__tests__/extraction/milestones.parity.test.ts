/**
 * Milestones Parity Tests
 * 
 * Compares output from new modular extractor vs legacy extractor to ensure parity.
 * Milestones are zero-duration checkpoints marking completion of major deliverables or phases.
 */

import { describe, it, expect, beforeAll } from '@jest/globals'
import { pool } from '../../database/connection'
import { projectDataExtractionService } from '../../services/projectDataExtractionService'
import { ExtractionContext } from '../../services/extraction/base/ExtractionContext'
import { extractMilestones } from '../../services/extraction/entities/milestones/extractMilestones'
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
    title: 'Project Plan',
    content: `
# Project Plan

## Major Milestones

### Project Kickoff
- **Description**: Official project start date
- **Due Date**: 2024-01-01
- **Status**: Completed

### Requirements Approval
- **Description**: All requirements reviewed and approved
- **Due Date**: 2024-Q1
- **Status**: In Progress

### MVP Launch
- **Description**: Minimum viable product release
- **Due Date**: 2024-06-30
- **Status**: Pending

### Go-Live
- **Description**: Full production deployment
- **Due Date**: 2024-12-31
- **Status**: Pending
    `.trim(),
    template_name: 'Project Plan'
  }
]

describe('Milestones Extraction Parity Tests', () => {
  beforeAll(async () => {
    // Ensure database connection
    if (!pool) {
      const { connectDatabase } = await Promise.resolve().then(() => require())
      await connectDatabase()
    }
  })

  describe('Extraction Output Parity', () => {
    it('should extract same number of milestones (within tolerance)', async () => {
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
      const newResult = await extractMilestones(context, {
        temperature: options.temperature,
        maxTokens: options.maxTokens
      })

      // Extract using legacy extractor
      const legacyResult = await projectDataExtractionService.extractSingleEntityType(
        TEST_PROJECT_ID,
        TEST_USER_ID,
        'milestones',
        options
      )

      // Compare counts (allow 10% variance for AI non-determinism)
      const newCount = newResult.entities.length
      const legacyCount = legacyResult.length
      const variance = Math.abs(newCount - legacyCount) / Math.max(newCount, legacyCount, 1)

      expect(variance).toBeLessThan(0.1) // Within 10% variance
      
      console.log(`[PARITY] New extractor: ${newCount} items, Legacy: ${legacyCount} items, Variance: ${(variance * 100).toFixed(1)}%`)
    }, 60000) // 60 second timeout for AI calls

    it('should extract milestones with similar structure', async () => {
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

      const newResult = await extractMilestones(context, {
        temperature: options.temperature
      })

      // Validate structure
      expect(newResult.entities.length).toBeGreaterThan(0)
      
      const firstMilestone = newResult.entities[0]
      expect(firstMilestone).toHaveProperty('name')
      expect(firstMilestone).toHaveProperty('due_date')
      expect(firstMilestone).toHaveProperty('source_document_id')
      
      // Check that all milestones have required fields
      newResult.entities.forEach(milestone => {
        expect(milestone.name).toBeTruthy()
        expect(milestone.due_date).toBeTruthy()
        expect(['pending', 'in_progress', 'completed', 'delayed']).toContain(milestone.status)
        expect(milestone.source_document_id).toBeTruthy()
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

      const newResult = await extractMilestones(context)

      // All entities should have source_document_id resolved
      const unresolvedCount = newResult.entities.filter(
        milestone => !milestone.source_document_id
      ).length

      expect(unresolvedCount).toBe(0)
      expect(newResult.rejectedCount).toBeGreaterThanOrEqual(0)
    }, 60000)

    it('should normalize status values correctly', async () => {
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

      const result = await extractMilestones(context)

      // Check that status fields are valid
      result.entities.forEach(milestone => {
        expect(['pending', 'in_progress', 'completed', 'delayed']).toContain(milestone.status)
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
      const firstResult = await extractMilestones(context)
      expect(firstResult.stats.cacheHit).toBe(false)

      // Second extraction (cache hit)
      const secondResult = await extractMilestones(context)
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

      const result = await extractMilestones(emptyContext)
      
      expect(result.entities.length).toBe(0)
      expect(result.rejectedCount).toBe(0)
    })
  })
})

