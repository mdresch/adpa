/**
 * Quality Standards Parity Tests
 * 
 * Compares output from new modular extractor vs legacy extractor to ensure parity.
 * Quality standards include ISO, PMBOK, internal, industry, and regulatory standards.
 */

import { describe, it, expect, beforeAll } from '@jest/globals'
import { pool } from '../../database/connection'
import { projectDataExtractionService } from '../../services/projectDataExtractionService'
import { ExtractionContext } from '../../services/extraction/base/ExtractionContext'
import { extractQualityStandards } from '../../services/extraction/entities/quality_standards/extractQualityStandards'
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
    title: 'Quality Standards',
    content: `
# Quality Standards

## ISO Standards

### ISO 9001:2015
- **Description**: Quality management system requirements
- **Category**: Process
- **Standard Type**: ISO
- **Compliance Level**: Mandatory
- **Measurement Criteria**: Annual audits, certification renewal

### ISO 27001
- **Description**: Information security management
- **Category**: Compliance
- **Standard Type**: ISO
- **Compliance Level**: Mandatory

## PMBOK Standards

### PMBOK 7th Edition
- **Description**: Project management best practices
- **Category**: Process
- **Standard Type**: PMBOK
- **Compliance Level**: Recommended

## Internal Standards

### Code Review Standards
- **Description**: Mandatory code reviews for all changes
- **Category**: Product
- **Standard Type**: Internal
- **Compliance Level**: Mandatory
- **Measurement Criteria**: 100% code review coverage
    `.trim(),
    template_name: 'Quality Standards'
  }
]

describe('Quality Standards Extraction Parity Tests', () => {
  beforeAll(async () => {
    // Ensure database connection
    if (!pool) {
      const { connectDatabase } = await Promise.resolve().then(() => require())
      await connectDatabase()
    }
  })

  describe('Extraction Output Parity', () => {
    it('should extract same number of quality standards (within tolerance)', async () => {
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
      const newResult = await extractQualityStandards(context, {
        temperature: options.temperature,
        maxTokens: options.maxTokens
      })

      // Extract using legacy extractor
      const legacyResult = await projectDataExtractionService.extractSingleEntityType(
        TEST_PROJECT_ID,
        TEST_USER_ID,
        'quality_standards',
        options
      )

      // Compare counts (allow 10% variance for AI non-determinism)
      const newCount = newResult.entities.length
      const legacyCount = legacyResult.length
      const variance = Math.abs(newCount - legacyCount) / Math.max(newCount, legacyCount, 1)

      expect(variance).toBeLessThan(0.1) // Within 10% variance
      
      console.log(`[PARITY] New extractor: ${newCount} items, Legacy: ${legacyCount} items, Variance: ${(variance * 100).toFixed(1)}%`)
    }, 60000) // 60 second timeout for AI calls

    it('should extract quality standards with similar structure', async () => {
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

      const newResult = await extractQualityStandards(context, {
        temperature: options.temperature
      })

      // Validate structure
      expect(newResult.entities.length).toBeGreaterThan(0)
      
      const firstStandard = newResult.entities[0]
      expect(firstStandard).toHaveProperty('title')
      expect(firstStandard).toHaveProperty('description')
      expect(firstStandard).toHaveProperty('category')
      expect(firstStandard).toHaveProperty('standard_type')
      expect(firstStandard).toHaveProperty('source_document_id')
      
      // Check that all quality standards have required fields
      newResult.entities.forEach(standard => {
        expect(standard.title).toBeTruthy()
        expect(standard.description).toBeTruthy()
        expect(['process', 'product', 'performance', 'compliance']).toContain(standard.category)
        expect(['ISO', 'PMBOK', 'internal', 'industry', 'regulatory', 'other']).toContain(standard.standard_type)
        expect(standard.source_document_id).toBeTruthy()
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

      const newResult = await extractQualityStandards(context)

      // All entities should have source_document_id resolved
      const unresolvedCount = newResult.entities.filter(
        standard => !standard.source_document_id
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
      const firstResult = await extractQualityStandards(context)
      expect(firstResult.stats.cacheHit).toBe(false)

      // Second extraction (cache hit)
      const secondResult = await extractQualityStandards(context)
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

      const result = await extractQualityStandards(emptyContext)
      
      expect(result.entities.length).toBe(0)
      expect(result.rejectedCount).toBe(0)
    })
  })
})

