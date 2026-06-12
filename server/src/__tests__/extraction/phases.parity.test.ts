/**
 * Phases Parity Tests
 * 
 * Compares output from new modular extractor vs legacy extractor to ensure parity.
 * Phases include Initiation, Planning, Execution, Monitoring, Closing, etc.
 */

import { describe, it, expect, beforeAll } from '@jest/globals'
import { pool } from '../../database/connection'
import { projectDataExtractionService } from '../../services/projectDataExtractionService'
import { ExtractionContext } from '../../services/extraction/base/ExtractionContext'
import { extractPhases } from '../../services/extraction/entities/phases/extractPhases'
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
    title: 'Project Phases',
    content: `
# Project Phases

## Phase 1: Initiation
- **Description**: Project kickoff and charter approval
- **Start Date**: 2024-01-01
- **End Date**: 2024-01-15
- **Status**: Completed
- **Deliverables**: Project Charter, Initial Stakeholder Register
- **Key Activities**: Stakeholder identification, Charter development

## Phase 2: Planning
- **Description**: Detailed project planning
- **Start Date**: 2024-01-16
- **End Date**: 2024-02-28
- **Status**: Active
- **Deliverables**: Project Plan, WBS, Schedule
- **Key Activities**: Requirements gathering, Resource planning

## Phase 3: Execution
- **Description**: Project execution and delivery
- **Start Date**: 2024-03-01
- **End Date**: 2024-06-30
- **Status**: Planned
- **Deliverables**: Project deliverables, Status reports
- **Key Activities**: Development, Testing, Quality assurance
    `.trim(),
    template_name: 'Project Phases'
  }
]

describe('Phases Extraction Parity Tests', () => {
  beforeAll(async () => {
    // Ensure database connection
    if (!pool) {
      const { connectDatabase } = await Promise.resolve().then(() => require())
      await connectDatabase()
    }
  })

  describe('Extraction Output Parity', () => {
    it('should extract same number of phases (within tolerance)', async () => {
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
      const newResult = await extractPhases(context, {
        temperature: options.temperature,
        maxTokens: options.maxTokens
      })

      // Extract using legacy extractor
      const legacyResult = await projectDataExtractionService.extractSingleEntityType(
        TEST_PROJECT_ID,
        TEST_USER_ID,
        'phases',
        options
      )

      // Compare counts (allow 10% variance for AI non-determinism)
      const newCount = newResult.entities.length
      const legacyCount = legacyResult.length
      const variance = Math.abs(newCount - legacyCount) / Math.max(newCount, legacyCount, 1)

      expect(variance).toBeLessThan(0.1) // Within 10% variance
      
      console.log(`[PARITY] New extractor: ${newCount} items, Legacy: ${legacyCount} items, Variance: ${(variance * 100).toFixed(1)}%`)
    }, 60000) // 60 second timeout for AI calls

    it('should extract phases with similar structure', async () => {
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

      const newResult = await extractPhases(context, {
        temperature: options.temperature
      })

      // Validate structure
      expect(newResult.entities.length).toBeGreaterThan(0)
      
      const firstPhase = newResult.entities[0]
      expect(firstPhase).toHaveProperty('name')
      expect(firstPhase).toHaveProperty('description')
      expect(firstPhase).toHaveProperty('status')
      expect(firstPhase).toHaveProperty('source_document_id')
      
      // Check that all phases have required fields
      newResult.entities.forEach(phase => {
        expect(phase.name).toBeTruthy()
        expect(phase.description).toBeTruthy()
        expect(['planned', 'active', 'completed', 'on_hold']).toContain(phase.status)
        expect(phase.source_document_id).toBeTruthy()
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

      const newResult = await extractPhases(context)

      // All entities should have source_document_id resolved
      const unresolvedCount = newResult.entities.filter(
        phase => !phase.source_document_id
      ).length

      expect(unresolvedCount).toBe(0)
      expect(newResult.rejectedCount).toBeGreaterThanOrEqual(0)
    }, 60000)

    it('should handle date normalization correctly', async () => {
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

      const result = await extractPhases(context)

      // Check that dates are present (may be null, but should be valid format if present)
      result.entities.forEach(phase => {
        if (phase.start_date) {
          expect(phase.start_date).toMatch(/^\d{4}-\d{2}-\d{2}/)
        }
        if (phase.end_date) {
          expect(phase.end_date).toMatch(/^\d{4}-\d{2}-\d{2}/)
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
      const firstResult = await extractPhases(context)
      expect(firstResult.stats.cacheHit).toBe(false)

      // Second extraction (cache hit)
      const secondResult = await extractPhases(context)
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

      const result = await extractPhases(emptyContext)
      
      expect(result.entities.length).toBe(0)
      expect(result.rejectedCount).toBe(0)
    })
  })
})

