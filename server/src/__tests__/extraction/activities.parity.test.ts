/**
 * Activities Parity Tests
 * 
 * Compares output from new modular extractor vs legacy extractor to ensure parity.
 * Activities are work efforts with duration (unlike milestones which are zero-duration checkpoints).
 */

import { describe, it, expect, beforeAll } from '@jest/globals'
import { pool } from '../../database/connection'
import { projectDataExtractionService } from '../../services/projectDataExtractionService'
import { ExtractionContext } from '../../services/extraction/base/ExtractionContext'
import { extractActivities } from '../../services/extraction/entities/activities/extractActivities'
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
    title: 'Project Schedule',
    content: `
# Project Schedule

## Development Activities

### Frontend Development
- **Description**: Develop user interface components
- **Category**: Development
- **Start Date**: 2024-01-15
- **End Date**: 2024-02-28
- **Duration**: 6 weeks
- **Status**: In Progress
- **Assigned To**: Development Team

### Backend API Development
- **Description**: Build REST API endpoints
- **Category**: Development
- **Start Date**: 2024-01-20
- **End Date**: 2024-03-15
- **Duration**: 8 weeks
- **Status**: Planned
- **Dependencies**: Frontend Development

## Testing Activities

### Unit Testing
- **Description**: Write and execute unit tests
- **Category**: Testing
- **Start Date**: 2024-02-01
- **End Date**: 2024-03-30
- **Duration**: 8 weeks
- **Status**: Planned
    `.trim(),
    template_name: 'Project Schedule'
  }
]

describe('Activities Extraction Parity Tests', () => {
  beforeAll(async () => {
    // Ensure database connection
    if (!pool) {
      const { connectDatabase } = await Promise.resolve().then(() => require())
      await connectDatabase()
    }
  })

  describe('Extraction Output Parity', () => {
    it('should extract same number of activities (within tolerance)', async () => {
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
      const newResult = await extractActivities(context, {
        temperature: options.temperature,
        maxTokens: options.maxTokens
      })

      // Extract using legacy extractor
      const legacyResult = await projectDataExtractionService.extractSingleEntityType(
        TEST_PROJECT_ID,
        TEST_USER_ID,
        'activities',
        options
      )

      // Compare counts (allow 10% variance for AI non-determinism)
      const newCount = newResult.entities.length
      const legacyCount = legacyResult.length
      const variance = Math.abs(newCount - legacyCount) / Math.max(newCount, legacyCount, 1)

      expect(variance).toBeLessThan(0.1) // Within 10% variance
      
      console.log(`[PARITY] New extractor: ${newCount} items, Legacy: ${legacyCount} items, Variance: ${(variance * 100).toFixed(1)}%`)
    }, 60000) // 60 second timeout for AI calls

    it('should extract activities with similar structure', async () => {
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

      const newResult = await extractActivities(context, {
        temperature: options.temperature
      })

      // Validate structure
      expect(newResult.entities.length).toBeGreaterThan(0)
      
      const firstActivity = newResult.entities[0]
      expect(firstActivity).toHaveProperty('name')
      expect(firstActivity).toHaveProperty('description')
      expect(firstActivity).toHaveProperty('source_document_id')
      
      // Check that all activities have required fields
      newResult.entities.forEach(activity => {
        expect(activity.name).toBeTruthy()
        expect(activity.description).toBeTruthy()
        expect(['planned', 'in_progress', 'completed', 'blocked', 'cancelled']).toContain(activity.status)
        expect(activity.source_document_id).toBeTruthy()
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

      const newResult = await extractActivities(context)

      // All entities should have source_document_id resolved
      const unresolvedCount = newResult.entities.filter(
        activity => !activity.source_document_id
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

      const result = await extractActivities(context)

      // Check that enum fields are valid
      result.entities.forEach(activity => {
        expect(['planned', 'in_progress', 'completed', 'blocked', 'cancelled']).toContain(activity.status)
        if (activity.duration_unit) {
          expect(['days', 'weeks', 'months']).toContain(activity.duration_unit)
        }
        if (activity.effort_unit) {
          expect(['hours', 'days', 'story_points']).toContain(activity.effort_unit)
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
      const firstResult = await extractActivities(context)
      expect(firstResult.stats.cacheHit).toBe(false)

      // Second extraction (cache hit)
      const secondResult = await extractActivities(context)
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

      const result = await extractActivities(emptyContext)
      
      expect(result.entities.length).toBe(0)
      expect(result.rejectedCount).toBe(0)
    })
  })
})

