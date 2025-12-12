/**
 * Resources Parity Tests
 * 
 * Compares output from new modular extractor vs legacy extractor to ensure parity.
 * Resources include human resources, equipment, materials, and financial resources.
 */

import { describe, it, expect, beforeAll } from '@jest/globals'
import { pool } from '../../database/connection'
import { projectDataExtractionService } from '../../services/projectDataExtractionService'
import { ExtractionContext } from '../../services/extraction/base/ExtractionContext'
import { extractResources } from '../../services/extraction/entities/resources/extractResources'
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
    title: 'Project Resources',
    content: `
# Project Resources

## Human Resources

### Senior Developer
- **Name**: John Doe
- **Type**: Human
- **Role**: Senior Software Developer
- **Allocation**: Full-time
- **Skills**: JavaScript, TypeScript, React
- **Competency Level**: Senior
- **Certifications**: AWS Certified Developer
- **Performance Rating**: 8.5

### Project Manager
- **Name**: Jane Smith
- **Type**: Human
- **Role**: Project Manager
- **Allocation**: Full-time
- **Skills**: Agile, Scrum, Risk Management
- **Competency Level**: Expert

## Equipment

### Development Servers
- **Name**: Development Server Cluster
- **Type**: Equipment
- **Cost**: $50,000

## Financial Resources

### Project Budget
- **Name**: Q1 2024 Budget
- **Type**: Financial
- **Cost**: $500,000
    `.trim(),
    template_name: 'Project Resources'
  }
]

describe('Resources Extraction Parity Tests', () => {
  beforeAll(async () => {
    // Ensure database connection
    if (!pool) {
      const { connectDatabase } = await import('../../database/connection')
      await connectDatabase()
    }
  })

  describe('Extraction Output Parity', () => {
    it('should extract same number of resources (within tolerance)', async () => {
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
      const newResult = await extractResources(context, {
        temperature: options.temperature,
        maxTokens: options.maxTokens
      })

      // Extract using legacy extractor
      const legacyResult = await projectDataExtractionService.extractSingleEntityType(
        TEST_PROJECT_ID,
        TEST_USER_ID,
        'resources',
        options
      )

      // Compare counts (allow 10% variance for AI non-determinism)
      const newCount = newResult.entities.length
      const legacyCount = legacyResult.length
      const variance = Math.abs(newCount - legacyCount) / Math.max(newCount, legacyCount, 1)

      expect(variance).toBeLessThan(0.1) // Within 10% variance
      
      console.log(`[PARITY] New extractor: ${newCount} items, Legacy: ${legacyCount} items, Variance: ${(variance * 100).toFixed(1)}%`)
    }, 60000) // 60 second timeout for AI calls

    it('should extract resources with similar structure', async () => {
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

      const newResult = await extractResources(context, {
        temperature: options.temperature
      })

      // Validate structure
      expect(newResult.entities.length).toBeGreaterThan(0)
      
      const firstResource = newResult.entities[0]
      expect(firstResource).toHaveProperty('name')
      expect(firstResource).toHaveProperty('type')
      expect(firstResource).toHaveProperty('source_document_id')
      
      // Check that all resources have required fields
      newResult.entities.forEach(resource => {
        expect(resource.name).toBeTruthy()
        expect(['human', 'equipment', 'material', 'financial', 'software', 'facility', 'budget']).toContain(resource.type)
        expect(resource.source_document_id).toBeTruthy()
        
        // Validate arrays
        if (resource.skills) {
          expect(Array.isArray(resource.skills)).toBe(true)
        }
        if (resource.certifications) {
          expect(Array.isArray(resource.certifications)).toBe(true)
        }
        if (resource.training_needs) {
          expect(Array.isArray(resource.training_needs)).toBe(true)
        }
        
        // Validate competency level if present
        if (resource.competency_level) {
          expect(['junior', 'intermediate', 'senior', 'expert']).toContain(resource.competency_level)
        }
        
        // Validate performance rating if present (0-10)
        if (resource.performance_rating !== undefined) {
          expect(resource.performance_rating).toBeGreaterThanOrEqual(0)
          expect(resource.performance_rating).toBeLessThanOrEqual(10)
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

      const newResult = await extractResources(context)

      // All entities should have source_document_id resolved
      const unresolvedCount = newResult.entities.filter(
        resource => !resource.source_document_id
      ).length

      expect(unresolvedCount).toBe(0)
      expect(newResult.rejectedCount).toBeGreaterThanOrEqual(0)
    }, 60000)

    it('should handle array fields correctly', async () => {
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

      const result = await extractResources(context)

      // Check that array fields are properly handled
      result.entities.forEach(resource => {
        if (resource.skills) {
          expect(Array.isArray(resource.skills)).toBe(true)
          resource.skills.forEach(skill => {
            expect(typeof skill).toBe('string')
          })
        }
        if (resource.certifications) {
          expect(Array.isArray(resource.certifications)).toBe(true)
        }
        if (resource.training_needs) {
          expect(Array.isArray(resource.training_needs)).toBe(true)
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
      const firstResult = await extractResources(context)
      expect(firstResult.stats.cacheHit).toBe(false)

      // Second extraction (cache hit)
      const secondResult = await extractResources(context)
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

      const result = await extractResources(emptyContext)
      
      expect(result.entities.length).toBe(0)
      expect(result.rejectedCount).toBe(0)
    })
  })
})

