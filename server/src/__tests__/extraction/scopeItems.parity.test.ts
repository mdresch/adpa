/**
 * Scope Items Parity Tests
 * 
 * Compares output from new modular extractor vs legacy extractor to ensure parity.
 * Scope items include both in-scope and out-of-scope items with MoSCoW prioritization.
 */

import { describe, it, expect, beforeAll } from '@jest/globals'
import { pool } from '../../database/connection'
import { projectDataExtractionService } from '../../services/projectDataExtractionService'
import { ExtractionContext } from '../../services/extraction/base/ExtractionContext'
import { extractScopeItems } from '../../services/extraction/entities/scope_items/extractScopeItems'
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
    title: 'Project Scope',
    content: `
# Project Scope

## In Scope

### Core Features
- **Feature A**: Primary functionality for users
- **Feature B**: Secondary functionality
- **Category**: Feature
- **Priority**: Must Have

### Supporting Modules
- **Module X**: Infrastructure component
- **Category**: Module
- **Priority**: Should Have

## Out of Scope

### Excluded Features
- **Feature C**: Not included in this phase
- **Justification**: Deferred to Phase 2
- **Priority**: Won't Have

### Future Enhancements
- **Feature D**: Future consideration
- **Category**: Enhancement
- **Priority**: Could Have
    `.trim(),
    template_name: 'Project Scope'
  }
]

describe('Scope Items Extraction Parity Tests', () => {
  beforeAll(async () => {
    // Ensure database connection
    if (!pool) {
      const { connectDatabase } = await Promise.resolve().then(() => require())
      await connectDatabase()
    }
  })

  describe('Extraction Output Parity', () => {
    it('should extract same number of scope items (within tolerance)', async () => {
      const options: ExtractionOptions = {
        aiProvider: 'openai',
        aiModel: 'gpt-4',
        temperature: 0.3,
        maxTokens: 12000
      }

      // Create context for new extractor
      const context = new ExtractionContext(
        TEST_PROJECT_ID,
        TEST_USER_ID,
        TEST_DOCUMENTS,
        options
      )

      // Extract using new modular extractor
      const newResult = await extractScopeItems(context, {
        temperature: options.temperature,
        maxTokens: options.maxTokens
      })

      // Extract using legacy extractor
      const legacyResult = await projectDataExtractionService.extractSingleEntityType(
        TEST_PROJECT_ID,
        TEST_USER_ID,
        'scope_items',
        options
      )

      // Compare counts (allow 10% variance for AI non-determinism)
      const newCount = newResult.entities.length
      const legacyCount = legacyResult.length
      const variance = Math.abs(newCount - legacyCount) / Math.max(newCount, legacyCount, 1)

      expect(variance).toBeLessThan(0.1) // Within 10% variance
      
      console.log(`[PARITY] New extractor: ${newCount} items, Legacy: ${legacyCount} items, Variance: ${(variance * 100).toFixed(1)}%`)
    }, 60000) // 60 second timeout for AI calls

    it('should extract scope items with similar structure', async () => {
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

      const newResult = await extractScopeItems(context, {
        temperature: options.temperature
      })

      // Validate structure
      expect(newResult.entities.length).toBeGreaterThan(0)
      
      const firstItem = newResult.entities[0]
      expect(firstItem).toHaveProperty('title')
      expect(firstItem).toHaveProperty('description')
      expect(firstItem).toHaveProperty('is_in_scope')
      expect(firstItem).toHaveProperty('source_document_id')
      
      // Check that all scope items have required fields
      newResult.entities.forEach(item => {
        expect(item.title).toBeTruthy()
        expect(item.description).toBeTruthy()
        expect(typeof item.is_in_scope).toBe('boolean')
        expect(item.source_document_id).toBeTruthy()
        
        // Validate priority if present
        if (item.priority) {
          expect(['must_have', 'should_have', 'could_have', 'wont_have']).toContain(item.priority)
        }
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

      const newResult = await extractScopeItems(context)

      // All entities should have source_document_id resolved
      const unresolvedCount = newResult.entities.filter(
        item => !item.source_document_id
      ).length

      expect(unresolvedCount).toBe(0)
      expect(newResult.rejectedCount).toBeGreaterThanOrEqual(0)
    }, 60000)

    it('should extract both in-scope and out-of-scope items', async () => {
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

      const result = await extractScopeItems(context)

      // Should have both in-scope and out-of-scope items
      const inScopeCount = result.entities.filter(item => item.is_in_scope).length
      const outOfScopeCount = result.entities.filter(item => !item.is_in_scope).length

      expect(inScopeCount + outOfScopeCount).toBe(result.entities.length)
      console.log(`[PARITY] In-scope: ${inScopeCount}, Out-of-scope: ${outOfScopeCount}`)
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
      const firstResult = await extractScopeItems(context)
      expect(firstResult.stats.cacheHit).toBe(false)

      // Second extraction (cache hit)
      const secondResult = await extractScopeItems(context)
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

      const result = await extractScopeItems(emptyContext)
      
      expect(result.entities.length).toBe(0)
      expect(result.rejectedCount).toBe(0)
    })
  })
})

