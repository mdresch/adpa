/**
 * Requirements Parity Tests
 * 
 * Compares output from new modular extractor vs legacy extractor to ensure parity.
 * Requirements are critical entities with complex enum mappings.
 */

import { describe, it, expect, beforeAll } from '@jest/globals'
import { pool } from '../../database/connection'
import { projectDataExtractionService } from '../../services/projectDataExtractionService'
import { ExtractionContext } from '../../services/extraction/base/ExtractionContext'
import { extractRequirements } from '../../services/extraction/entities/requirements/extractRequirements'
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
    title: 'Requirements Document',
    content: `
# Requirements Document

## Functional Requirements

### FR-001: User Authentication
- **Description**: System must support user login with email and password
- **Priority**: Critical
- **Status**: Approved
- **Acceptance Criteria**: User can log in with valid credentials

### FR-002: Data Export
- **Description**: Users must be able to export data to CSV format
- **Priority**: High
- **Status**: In Progress

## Non-Functional Requirements

### NFR-001: Performance
- **Description**: System must respond within 2 seconds
- **Priority**: High
- **Status**: Proposed
    `.trim(),
    template_name: 'Requirements Document'
  }
]

describe('Requirements Extraction Parity Tests', () => {
  beforeAll(async () => {
    // Ensure database connection
    if (!pool) {
      const { connectDatabase } = await Promise.resolve().then(() => require())
      await connectDatabase()
    }
  })

  describe('Extraction Output Parity', () => {
    it('should extract same number of requirements (within tolerance)', async () => {
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
      const newResult = await extractRequirements(context, {
        temperature: options.temperature,
        maxTokens: options.maxTokens
      })

      // Extract using legacy extractor
      const legacyResult = await projectDataExtractionService.extractSingleEntityType(
        TEST_PROJECT_ID,
        TEST_USER_ID,
        'requirements',
        options
      )

      // Compare counts (allow 10% variance for AI non-determinism)
      const newCount = newResult.entities.length
      const legacyCount = legacyResult.length
      const variance = Math.abs(newCount - legacyCount) / Math.max(newCount, legacyCount, 1)

      expect(variance).toBeLessThan(0.1) // Within 10% variance
      
      console.log(`[PARITY] New extractor: ${newCount} items, Legacy: ${legacyCount} items, Variance: ${(variance * 100).toFixed(1)}%`)
    }, 60000) // 60 second timeout for AI calls

    it('should extract requirements with similar structure', async () => {
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

      const newResult = await extractRequirements(context, {
        temperature: options.temperature
      })

      // Validate structure
      expect(newResult.entities.length).toBeGreaterThan(0)
      
      const firstRequirement = newResult.entities[0]
      expect(firstRequirement).toHaveProperty('title')
      expect(firstRequirement).toHaveProperty('description')
      expect(firstRequirement).toHaveProperty('source_document_id')
      
      // Check that all requirements have required fields
      newResult.entities.forEach(requirement => {
        expect(requirement.title).toBeTruthy()
        expect(requirement.description).toBeTruthy()
        expect(['functional', 'non-functional', 'business', 'technical']).toContain(requirement.type)
        expect(['critical', 'high', 'medium', 'low']).toContain(requirement.priority)
        expect(requirement.source_document_id).toBeTruthy()
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

      const newResult = await extractRequirements(context)

      // All entities should have source_document_id resolved
      const unresolvedCount = newResult.entities.filter(
        requirement => !requirement.source_document_id
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

      const result = await extractRequirements(context)

      // Check that enum fields are valid
      result.entities.forEach(requirement => {
        expect(['functional', 'non-functional', 'business', 'technical']).toContain(requirement.type)
        expect(['critical', 'high', 'medium', 'low']).toContain(requirement.priority)
        expect(['proposed', 'approved', 'in_progress', 'completed', 'deferred']).toContain(requirement.status)
      })
    }, 60000)

    it('should handle acceptance criteria correctly', async () => {
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

      const result = await extractRequirements(context)

      // Check that acceptance_criteria can be string or array
      result.entities.forEach(requirement => {
        if (requirement.acceptance_criteria) {
          expect(
            typeof requirement.acceptance_criteria === 'string' ||
            Array.isArray(requirement.acceptance_criteria)
          ).toBe(true)
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
      const firstResult = await extractRequirements(context)
      expect(firstResult.stats.cacheHit).toBe(false)

      // Second extraction (cache hit)
      const secondResult = await extractRequirements(context)
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

      const result = await extractRequirements(emptyContext)
      
      expect(result.entities.length).toBe(0)
      expect(result.rejectedCount).toBe(0)
    })
  })
})

