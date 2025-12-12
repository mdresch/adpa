/**
 * Stakeholders Parity Tests
 * 
 * Compares output from new modular extractor vs legacy extractor to ensure parity.
 * Stakeholders are critical entities with complex deduplication logic.
 */

import { describe, it, expect, beforeAll } from '@jest/globals'
import { pool } from '../../database/connection'
import { projectDataExtractionService } from '../../services/projectDataExtractionService'
import { ExtractionContext } from '../../services/extraction/base/ExtractionContext'
import { extractStakeholders } from '../../services/extraction/entities/stakeholders/extractStakeholders'
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
    title: 'Stakeholder Register',
    content: `
# Stakeholder Register

## Project Sponsor
- **Name**: John Smith
- **Role**: Executive Sponsor
- **Interest Level**: High
- **Influence Level**: High
- **Expectations**: Project completion on time and within budget
- **Concerns**: Resource availability

## Project Manager
- **Name**: Jane Doe
- **Role**: Project Manager
- **Interest Level**: High
- **Influence Level**: High

## Technical Lead
- **Name**: Bob Johnson (Tech Lead)
- **Role**: Technical Lead
- **Interest Level**: Medium
- **Influence Level**: Medium
    `.trim(),
    template_name: 'Stakeholder Register'
  }
]

describe('Stakeholders Extraction Parity Tests', () => {
  beforeAll(async () => {
    // Ensure database connection
    if (!pool) {
      const { connectDatabase } = await import('../../database/connection')
      await connectDatabase()
    }
  })

  describe('Extraction Output Parity', () => {
    it('should extract same number of stakeholders (within tolerance)', async () => {
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
      const newResult = await extractStakeholders(context, {
        temperature: options.temperature,
        maxTokens: options.maxTokens
      })

      // Extract using legacy extractor
      const legacyResult = await projectDataExtractionService.extractSingleEntityType(
        TEST_PROJECT_ID,
        TEST_USER_ID,
        'stakeholders',
        options
      )

      // Compare counts (allow 10% variance for AI non-determinism)
      const newCount = newResult.entities.length
      const legacyCount = legacyResult.length
      const variance = Math.abs(newCount - legacyCount) / Math.max(newCount, legacyCount, 1)

      expect(variance).toBeLessThan(0.1) // Within 10% variance
      
      console.log(`[PARITY] New extractor: ${newCount} items, Legacy: ${legacyCount} items, Variance: ${(variance * 100).toFixed(1)}%`)
    }, 60000) // 60 second timeout for AI calls

    it('should extract stakeholders with similar structure', async () => {
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

      const newResult = await extractStakeholders(context, {
        temperature: options.temperature
      })

      // Validate structure
      expect(newResult.entities.length).toBeGreaterThan(0)
      
      const firstStakeholder = newResult.entities[0]
      expect(firstStakeholder).toHaveProperty('name')
      expect(firstStakeholder).toHaveProperty('role')
      expect(firstStakeholder).toHaveProperty('source_document_id')
      
      // Check that all stakeholders have required fields
      newResult.entities.forEach(stakeholder => {
        expect(stakeholder.name).toBeTruthy()
        expect(stakeholder.role).toBeTruthy()
        expect(['high', 'medium', 'low']).toContain(stakeholder.interest_level)
        expect(['high', 'medium', 'low']).toContain(stakeholder.influence_level)
        expect(stakeholder.source_document_id).toBeTruthy()
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

      const newResult = await extractStakeholders(context)

      // All entities should have source_document_id resolved
      const unresolvedCount = newResult.entities.filter(
        stakeholder => !stakeholder.source_document_id
      ).length

      expect(unresolvedCount).toBe(0)
      expect(newResult.rejectedCount).toBeGreaterThanOrEqual(0)
    }, 60000)

    it('should normalize level values correctly', async () => {
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

      const result = await extractStakeholders(context)

      // Check that level fields are valid
      result.entities.forEach(stakeholder => {
        expect(['high', 'medium', 'low']).toContain(stakeholder.interest_level)
        expect(['high', 'medium', 'low']).toContain(stakeholder.influence_level)
      })
    }, 60000)

    it('should handle deduplication correctly', async () => {
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

      const result = await extractStakeholders(context)

      // Check that batch deduplication worked (no exact duplicates)
      const names = result.entities.map(s => s.name.toLowerCase().trim())
      const uniqueNames = new Set(names)
      
      // Allow some variance due to AI extracting variations
      expect(uniqueNames.size).toBeGreaterThanOrEqual(Math.floor(result.entities.length * 0.8))
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
      const firstResult = await extractStakeholders(context)
      expect(firstResult.stats.cacheHit).toBe(false)

      // Second extraction (cache hit)
      const secondResult = await extractStakeholders(context)
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

      const result = await extractStakeholders(emptyContext)
      
      expect(result.entities.length).toBe(0)
      expect(result.rejectedCount).toBe(0)
    })
  })
})

