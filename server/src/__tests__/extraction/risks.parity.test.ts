/**
 * Risks Parity Tests
 * 
 * Compares output from new modular extractor vs legacy extractor to ensure parity.
 * Risks are critical entities with complex enum mappings and validation.
 */

import { describe, it, expect, beforeAll } from '@jest/globals'
import { pool } from '../../database/connection'
import { projectDataExtractionService } from '../../services/projectDataExtractionService'
import { ExtractionContext } from '../../services/extraction/base/ExtractionContext'
import { extractRisks } from '../../services/extraction/entities/risks/extractRisks'
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
    title: 'Risk Register',
    content: `
# Risk Register

## Technical Risks

### TR-001: System Integration Failure
- **Description**: Risk of integration issues between legacy and new systems
- **Category**: Technical
- **Probability**: High
- **Impact**: High
- **Mitigation Strategy**: Comprehensive integration testing
- **Contingency Plan**: Rollback to previous version

### TR-002: Performance Issues
- **Description**: System may not meet performance requirements
- **Category**: Technical
- **Probability**: Medium
- **Impact**: High

## Schedule Risks

### SR-001: Resource Unavailability
- **Description**: Key resources may not be available when needed
- **Category**: Schedule
- **Probability**: Low
- **Impact**: Medium
    `.trim(),
    template_name: 'Risk Register'
  }
]

describe('Risks Extraction Parity Tests', () => {
  beforeAll(async () => {
    // Ensure database connection
    if (!pool) {
      const { connectDatabase } = await Promise.resolve().then(() => require())
      await connectDatabase()
    }
  })

  describe('Extraction Output Parity', () => {
    it('should extract same number of risks (within tolerance)', async () => {
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
      const newResult = await extractRisks(context, {
        temperature: options.temperature,
        maxTokens: options.maxTokens
      })

      // Extract using legacy extractor
      const legacyResult = await projectDataExtractionService.extractSingleEntityType(
        TEST_PROJECT_ID,
        TEST_USER_ID,
        'risks',
        options
      )

      // Compare counts (allow 10% variance for AI non-determinism)
      const newCount = newResult.entities.length
      const legacyCount = legacyResult.length
      const variance = Math.abs(newCount - legacyCount) / Math.max(newCount, legacyCount, 1)

      expect(variance).toBeLessThan(0.1) // Within 10% variance
      
      console.log(`[PARITY] New extractor: ${newCount} items, Legacy: ${legacyCount} items, Variance: ${(variance * 100).toFixed(1)}%`)
    }, 60000) // 60 second timeout for AI calls

    it('should extract risks with similar structure', async () => {
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

      const newResult = await extractRisks(context, {
        temperature: options.temperature
      })

      // Validate structure
      expect(newResult.entities.length).toBeGreaterThan(0)
      
      const firstRisk = newResult.entities[0]
      expect(firstRisk).toHaveProperty('title')
      expect(firstRisk).toHaveProperty('description')
      expect(firstRisk).toHaveProperty('source_document_id')
      
      // Check that all risks have required fields
      newResult.entities.forEach(risk => {
        expect(risk.title).toBeTruthy()
        expect(risk.description).toBeTruthy()
        expect(['technical', 'schedule', 'budget', 'resource', 'external', 'quality']).toContain(risk.category)
        expect(['high', 'medium', 'low']).toContain(risk.probability)
        expect(['high', 'medium', 'low']).toContain(risk.impact)
        expect(risk.source_document_id).toBeTruthy()
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

      const newResult = await extractRisks(context)

      // All entities should have source_document_id resolved
      const unresolvedCount = newResult.entities.filter(
        risk => !risk.source_document_id
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

      const result = await extractRisks(context)

      // Check that enum fields are valid
      result.entities.forEach(risk => {
        expect(['technical', 'schedule', 'budget', 'resource', 'external', 'quality']).toContain(risk.category)
        expect(['high', 'medium', 'low']).toContain(risk.probability)
        expect(['high', 'medium', 'low']).toContain(risk.impact)
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
      const firstResult = await extractRisks(context)
      expect(firstResult.stats.cacheHit).toBe(false)

      // Second extraction (cache hit)
      const secondResult = await extractRisks(context)
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

      const result = await extractRisks(emptyContext)
      
      expect(result.entities.length).toBe(0)
      expect(result.rejectedCount).toBe(0)
    })
  })
})

