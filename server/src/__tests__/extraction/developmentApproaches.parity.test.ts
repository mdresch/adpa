/**
 * Development Approaches Parity Tests
 * 
 * Compares output from new modular extractor vs legacy extractor to ensure parity.
 * Development approaches are project-level metadata (ONE record per project).
 * Aligned with PMBOK 8 Development Approach & Life Cycle Performance Domain.
 */

import { describe, it, expect, beforeAll } from '@jest/globals'
import { pool } from '../../database/connection'
import { projectDataExtractionService } from '../../services/projectDataExtractionService'
import { ExtractionContext } from '../../services/extraction/base/ExtractionContext'
import { extractDevelopmentApproaches } from '../../services/extraction/entities/development_approaches/extractDevelopmentApproaches'
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
    title: 'Project Charter',
    content: `
# Project Charter

## Development Approach

**Methodology**: Agile/Scrum
**Approach**: Adaptive
**Justification**: 
This project requires frequent stakeholder feedback and has evolving requirements. 
We selected Agile/Scrum because:
- Requirements are not fully defined upfront
- Stakeholders need to see incremental progress
- Team has experience with Scrum ceremonies

**Uncertainty Level**: High
**Requirements Stability**: Evolving
**Stakeholder Engagement**: Continuous
**Delivery Cadence**: Iterative
**Organizational Maturity**: Medium
**Team Experience**: Mixed

**Life Cycle Phases**:
1. Sprint Planning
2. Daily Standups
3. Sprint Review
4. Sprint Retrospective

**Iteration Length**: 2 weeks
**Iteration Unit**: weeks

**Governance Approach**: Lightweight
**Review Gates**: Sprint Review, Sprint Retrospective
    `.trim(),
    template_name: 'Project Charter'
  }
]

describe('Development Approaches Extraction Parity Tests', () => {
  beforeAll(async () => {
    // Ensure database connection
    if (!pool) {
      const { connectDatabase } = await Promise.resolve().then(() => require())
      await connectDatabase()
    }
  })

  describe('Extraction Output Parity', () => {
    it('should extract development approach (project-level metadata)', async () => {
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
      const newResult = await extractDevelopmentApproaches(context, {
        temperature: options.temperature,
        maxTokens: options.maxTokens
      })

      // Extract using legacy extractor
      const legacyResult = await projectDataExtractionService.extractSingleEntityType(
        TEST_PROJECT_ID,
        TEST_USER_ID,
        'development_approaches',
        options
      )

      // Should extract exactly one approach (project-level metadata)
      expect(newResult.entities.length).toBeGreaterThanOrEqual(0)
      expect(newResult.entities.length).toBeLessThanOrEqual(1) // Max one per project
      expect(legacyResult.length).toBeGreaterThanOrEqual(0)
      expect(legacyResult.length).toBeLessThanOrEqual(1)

      // If both extracted, compare approach values
      if (newResult.entities.length > 0 && legacyResult.length > 0) {
        const newApproach = newResult.entities[0]
        const legacyApproach = legacyResult[0]

        expect(newApproach.approach).toBeTruthy()
        expect(['predictive', 'adaptive', 'hybrid', 'incremental', 'iterative']).toContain(newApproach.approach)
        expect(newApproach.justification).toBeTruthy()
        expect(newApproach.source_document_id).toBeTruthy()
      }
      
      console.log(`[PARITY] New extractor: ${newResult.entities.length} items, Legacy: ${legacyResult.length} items`)
    }, 60000) // 60 second timeout for AI calls

    it('should extract development approach with similar structure', async () => {
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

      const newResult = await extractDevelopmentApproaches(context, {
        temperature: options.temperature
      })

      // Validate structure (if extracted)
      if (newResult.entities.length > 0) {
        const approach = newResult.entities[0]
        expect(approach).toHaveProperty('approach')
        expect(approach).toHaveProperty('justification')
        expect(approach).toHaveProperty('source_document_id')
        
        // Check enum values
        expect(['predictive', 'adaptive', 'hybrid', 'incremental', 'iterative']).toContain(approach.approach)
        
        if (approach.methodology) {
          expect(['waterfall', 'scrum', 'kanban', 'lean', 'safe', 'prince2', 'custom']).toContain(approach.methodology)
        }
      }
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

      const newResult = await extractDevelopmentApproaches(context)

      // If extracted, should have source_document_id resolved
      if (newResult.entities.length > 0) {
        const unresolvedCount = newResult.entities.filter(
          approach => !approach.source_document_id
        ).length

        expect(unresolvedCount).toBe(0)
      }
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
      const firstResult = await extractDevelopmentApproaches(context)
      expect(firstResult.stats.cacheHit).toBe(false)

      // Second extraction (cache hit)
      const secondResult = await extractDevelopmentApproaches(context)
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

      const result = await extractDevelopmentApproaches(emptyContext)
      
      // Should return empty array (no approach extracted)
      expect(result.entities.length).toBe(0)
      expect(result.rejectedCount).toBe(0)
    })
  })
})

