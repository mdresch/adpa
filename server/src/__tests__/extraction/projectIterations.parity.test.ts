/**
 * Project Iterations Parity Tests
 * 
 * Compares output from new modular extractor vs legacy extractor to ensure parity.
 * Project iterations include sprints, iterations, program increments, and releases.
 */

import { describe, it, expect, beforeAll } from '@jest/globals'
import { pool } from '../../database/connection'
import { projectDataExtractionService } from '../../services/projectDataExtractionService'
import { ExtractionContext } from '../../services/extraction/base/ExtractionContext'
import { extractProjectIterations } from '../../services/extraction/entities/project_iterations/extractProjectIterations'
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
    title: 'Project Iterations',
    content: `
# Project Iterations

## Sprint 1
- **Name**: Sprint 1
- **Type**: Sprint
- **Sequence**: 1
- **Start Date**: 2024-01-01
- **End Date**: 2024-01-14
- **Status**: Completed
- **Goals**: 
  - User authentication
  - Basic UI framework
- **Planned Story Points**: 20
- **Completed Story Points**: 18
- **Velocity**: 18

## Sprint 2
- **Name**: Sprint 2
- **Type**: Sprint
- **Sequence**: 2
- **Start Date**: 2024-01-15
- **End Date**: 2024-01-28
- **Status**: Active
- **Goals**: 
  - Core features
  - API development
- **Planned Story Points**: 25
- **Completed Story Points**: 0
- **Velocity**: null

## Release 1.0
- **Name**: Release 1.0
- **Type**: Release
- **Start Date**: 2024-03-01
- **End Date**: 2024-03-15
- **Status**: Planned
- **Goals**: 
  - MVP launch
  - Production deployment
    `.trim(),
    template_name: 'Project Iterations'
  }
]

describe('Project Iterations Extraction Parity Tests', () => {
  beforeAll(async () => {
    // Ensure database connection
    if (!pool) {
      const { connectDatabase } = await import('../../database/connection')
      await connectDatabase()
    }
  })

  describe('Extraction Output Parity', () => {
    it('should extract same number of iterations (within tolerance)', async () => {
      const options: ExtractionOptions = {
        aiProvider: 'openai',
        aiModel: 'gpt-4',
        temperature: 0.2,
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
      const newResult = await extractProjectIterations(context, {
        temperature: options.temperature,
        maxTokens: options.maxTokens
      })

      // Extract using legacy extractor
      const legacyResult = await projectDataExtractionService.extractSingleEntityType(
        TEST_PROJECT_ID,
        TEST_USER_ID,
        'project_iterations',
        options
      )

      // Compare counts (allow 10% variance for AI non-determinism)
      const newCount = newResult.entities.length
      const legacyCount = legacyResult.length
      const variance = Math.abs(newCount - legacyCount) / Math.max(newCount, legacyCount, 1)

      expect(variance).toBeLessThan(0.1) // Within 10% variance
      
      console.log(`[PARITY] New extractor: ${newCount} items, Legacy: ${legacyCount} items, Variance: ${(variance * 100).toFixed(1)}%`)
    }, 60000) // 60 second timeout for AI calls

    it('should extract iterations with similar structure', async () => {
      const options: ExtractionOptions = {
        aiProvider: 'openai',
        aiModel: 'gpt-4',
        temperature: 0.2
      }

      const context = new ExtractionContext(
        TEST_PROJECT_ID,
        TEST_USER_ID,
        TEST_DOCUMENTS,
        options
      )

      const newResult = await extractProjectIterations(context, {
        temperature: options.temperature
      })

      // Validate structure
      expect(newResult.entities.length).toBeGreaterThan(0)
      
      const firstIteration = newResult.entities[0]
      expect(firstIteration).toHaveProperty('name')
      expect(firstIteration).toHaveProperty('source_document_id')
      
      // Check that all iterations have required fields
      newResult.entities.forEach(iteration => {
        expect(iteration.name).toBeTruthy()
        expect(iteration.source_document_id).toBeTruthy()
        
        // Validate iteration_type if present
        if (iteration.iteration_type) {
          expect(['sprint', 'iteration', 'program_increment', 'release', 'phase']).toContain(iteration.iteration_type)
        }
        
        // Validate status if present
        if (iteration.status) {
          expect(['planned', 'active', 'completed', 'cancelled']).toContain(iteration.status)
        }
        
        // Validate arrays
        if (iteration.goals) {
          expect(Array.isArray(iteration.goals)).toBe(true)
        }
        if (iteration.impediments) {
          expect(Array.isArray(iteration.impediments)).toBe(true)
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

      const newResult = await extractProjectIterations(context)

      // All entities should have source_document_id resolved
      const unresolvedCount = newResult.entities.filter(
        iteration => !iteration.source_document_id
      ).length

      expect(unresolvedCount).toBe(0)
      expect(newResult.rejectedCount).toBeGreaterThanOrEqual(0)
    }, 60000)

    it('should handle numeric fields correctly', async () => {
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

      const result = await extractProjectIterations(context)

      // Check that numeric fields are properly coerced
      result.entities.forEach(iteration => {
        if (iteration.planned_story_points !== undefined) {
          expect(typeof iteration.planned_story_points).toBe('number')
        }
        if (iteration.completed_story_points !== undefined) {
          expect(typeof iteration.completed_story_points).toBe('number')
        }
        if (iteration.velocity !== undefined) {
          expect(typeof iteration.velocity).toBe('number')
        }
        if (iteration.sequence_number !== undefined) {
          expect(typeof iteration.sequence_number).toBe('number')
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
      const firstResult = await extractProjectIterations(context)
      expect(firstResult.stats.cacheHit).toBe(false)

      // Second extraction (cache hit)
      const secondResult = await extractProjectIterations(context)
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

      const result = await extractProjectIterations(emptyContext)
      
      expect(result.entities.length).toBe(0)
      expect(result.rejectedCount).toBe(0)
    })
  })
})

