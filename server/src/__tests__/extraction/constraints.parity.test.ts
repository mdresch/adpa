/**
 * Constraints Parity Tests
 * 
 * Compares output from new modular extractor vs legacy extractor to ensure parity.
 * Constraints include budget, timeline, resource, technical, and regulatory constraints.
 */

import { describe, it, expect, beforeAll } from '@jest/globals'
import { pool } from '../../database/connection'
import { projectDataExtractionService } from '../../services/projectDataExtractionService'
import { ExtractionContext } from '../../services/extraction/base/ExtractionContext'
import { extractConstraints } from '../../services/extraction/entities/constraints/extractConstraints'
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
    title: 'Project Constraints',
    content: `
# Project Constraints

## Budget Constraints
- **Title**: Fixed Budget Limit
- **Description**: Project must not exceed $500,000 budget
- **Type**: Cost
- **Severity**: High

## Timeline Constraints
- **Title**: Regulatory Deadline
- **Description**: Must complete by Q4 2024 for compliance
- **Type**: Time
- **Severity**: High

## Technical Constraints
- **Title**: Legacy System Integration
- **Description**: Must integrate with existing legacy systems
- **Type**: Technical
- **Severity**: Medium
    `.trim(),
    template_name: 'Project Constraints'
  }
]

describe('Constraints Extraction Parity Tests', () => {
  beforeAll(async () => {
    // Ensure database connection
    if (!pool) {
      const { connectDatabase } = await Promise.resolve().then(() => require())
      await connectDatabase()
    }
  })

  describe('Extraction Output Parity', () => {
    it('should extract same number of constraints (within tolerance)', async () => {
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
      const newResult = await extractConstraints(context, {
        temperature: options.temperature,
        maxTokens: options.maxTokens
      })

      // Extract using legacy extractor
      const legacyResult = await projectDataExtractionService.extractSingleEntityType(
        TEST_PROJECT_ID,
        TEST_USER_ID,
        'constraints',
        options
      )

      // Compare counts (allow 10% variance for AI non-determinism)
      const newCount = newResult.entities.length
      const legacyCount = legacyResult.length
      const variance = Math.abs(newCount - legacyCount) / Math.max(newCount, legacyCount, 1)

      expect(variance).toBeLessThan(0.1) // Within 10% variance
      
      console.log(`[PARITY] New extractor: ${newCount} items, Legacy: ${legacyCount} items, Variance: ${(variance * 100).toFixed(1)}%`)
    }, 60000) // 60 second timeout for AI calls

    it('should extract constraints with similar structure', async () => {
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

      const newResult = await extractConstraints(context, {
        temperature: options.temperature
      })

      // Validate structure
      expect(newResult.entities.length).toBeGreaterThan(0)
      
      const firstConstraint = newResult.entities[0]
      expect(firstConstraint).toHaveProperty('title')
      expect(firstConstraint).toHaveProperty('description')
      expect(firstConstraint).toHaveProperty('source_document_id')
      
      // Check that all constraints have required fields
      newResult.entities.forEach(constraint => {
        expect(constraint.title).toBeTruthy()
        expect(constraint.description).toBeTruthy()
        expect(['scope', 'time', 'cost', 'quality', 'resource', 'technical', 'regulatory']).toContain(constraint.type)
        expect(constraint.source_document_id).toBeTruthy()
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

      const newResult = await extractConstraints(context)

      // All entities should have source_document_id resolved
      const unresolvedCount = newResult.entities.filter(
        constraint => !constraint.source_document_id
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

      const result = await extractConstraints(context)

      // Check that enum fields are valid
      result.entities.forEach(constraint => {
        expect(['scope', 'time', 'cost', 'quality', 'resource', 'technical', 'regulatory']).toContain(constraint.type)
        if (constraint.severity) {
          expect(['high', 'medium', 'low']).toContain(constraint.severity)
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
      const firstResult = await extractConstraints(context)
      expect(firstResult.stats.cacheHit).toBe(false)

      // Second extraction (cache hit)
      const secondResult = await extractConstraints(context)
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

      const result = await extractConstraints(emptyContext)
      
      expect(result.entities.length).toBe(0)
      expect(result.rejectedCount).toBe(0)
    })
  })
})

