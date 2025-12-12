/**
 * Technologies Parity Tests
 * 
 * Compares output from new modular extractor vs legacy extractor to ensure parity.
 * Technologies include frontend, backend, database, infrastructure, devops, testing, and monitoring tools.
 */

import { describe, it, expect, beforeAll } from '@jest/globals'
import { pool } from '../../database/connection'
import { projectDataExtractionService } from '../../services/projectDataExtractionService'
import { ExtractionContext } from '../../services/extraction/base/ExtractionContext'
import { extractTechnologies } from '../../services/extraction/entities/technologies/extractTechnologies'
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
    title: 'Technical Architecture',
    content: `
# Technical Architecture

## Frontend Technologies

### React
- **Version**: 18.3
- **Purpose**: UI framework for building user interfaces
- **License**: MIT
- **Vendor**: Open Source

### Tailwind CSS
- **Version**: 3.4
- **Purpose**: Utility-first CSS framework
- **License**: MIT
- **Vendor**: Open Source

## Backend Technologies

### Node.js
- **Version**: 18.x
- **Purpose**: JavaScript runtime
- **License**: MIT
- **Vendor**: Open Source

### Express
- **Version**: 4.18
- **Purpose**: Web application framework
- **License**: MIT
- **Vendor**: Open Source

## Database Technologies

### PostgreSQL
- **Version**: 15
- **Purpose**: Primary relational database
- **License**: PostgreSQL License
- **Vendor**: Open Source

### Redis
- **Version**: 7
- **Purpose**: Caching and session storage
- **License**: BSD
- **Vendor**: Open Source

## Infrastructure

### AWS
- **Purpose**: Cloud hosting platform
- **License**: Commercial
- **Vendor**: Amazon Web Services
- **Deployment**: Production, Staging

### Docker
- **Version**: Latest
- **Purpose**: Containerization
- **License**: Apache 2.0
- **Vendor**: Docker Inc.
    `.trim(),
    template_name: 'Technical Architecture'
  }
]

describe('Technologies Extraction Parity Tests', () => {
  beforeAll(async () => {
    // Ensure database connection
    if (!pool) {
      const { connectDatabase } = await import('../../database/connection')
      await connectDatabase()
    }
  })

  describe('Extraction Output Parity', () => {
    it('should extract same number of technologies (within tolerance)', async () => {
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
      const newResult = await extractTechnologies(context, {
        temperature: options.temperature,
        maxTokens: options.maxTokens
      })

      // Extract using legacy extractor
      const legacyResult = await projectDataExtractionService.extractSingleEntityType(
        TEST_PROJECT_ID,
        TEST_USER_ID,
        'technologies',
        options
      )

      // Compare counts (allow 10% variance for AI non-determinism)
      const newCount = newResult.entities.length
      const legacyCount = legacyResult.length
      const variance = Math.abs(newCount - legacyCount) / Math.max(newCount, legacyCount, 1)

      expect(variance).toBeLessThan(0.1) // Within 10% variance
      
      console.log(`[PARITY] New extractor: ${newCount} items, Legacy: ${legacyCount} items, Variance: ${(variance * 100).toFixed(1)}%`)
    }, 60000) // 60 second timeout for AI calls

    it('should extract technologies with similar structure', async () => {
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

      const newResult = await extractTechnologies(context, {
        temperature: options.temperature
      })

      // Validate structure
      expect(newResult.entities.length).toBeGreaterThan(0)
      
      const firstTech = newResult.entities[0]
      expect(firstTech).toHaveProperty('name')
      expect(firstTech).toHaveProperty('category')
      expect(firstTech).toHaveProperty('source_document_id')
      
      // Check that all technologies have required fields
      newResult.entities.forEach(tech => {
        expect(tech.name).toBeTruthy()
        expect(['frontend', 'backend', 'database', 'infrastructure', 'devops', 'testing', 'monitoring', 'other']).toContain(tech.category)
        expect(tech.source_document_id).toBeTruthy()
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

      const newResult = await extractTechnologies(context)

      // All entities should have source_document_id resolved
      const unresolvedCount = newResult.entities.filter(
        tech => !tech.source_document_id
      ).length

      expect(unresolvedCount).toBe(0)
      expect(newResult.rejectedCount).toBeGreaterThanOrEqual(0)
    }, 60000)

    it('should extract technologies across multiple categories', async () => {
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

      const result = await extractTechnologies(context)

      // Should have technologies from multiple categories
      const categories = new Set(result.entities.map(tech => tech.category))
      expect(categories.size).toBeGreaterThan(1)
      
      console.log(`[PARITY] Categories found: ${Array.from(categories).join(', ')}`)
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
      const firstResult = await extractTechnologies(context)
      expect(firstResult.stats.cacheHit).toBe(false)

      // Second extraction (cache hit)
      const secondResult = await extractTechnologies(context)
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

      const result = await extractTechnologies(emptyContext)
      
      expect(result.entities.length).toBe(0)
      expect(result.rejectedCount).toBe(0)
    })
  })
})

