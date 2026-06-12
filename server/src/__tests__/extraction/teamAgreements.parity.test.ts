/**
 * Team Agreements Parity Tests
 * 
 * Compares output from new modular extractor vs legacy extractor to ensure parity.
 * Team agreements are aligned with PMBOK 8 Team Performance Domain.
 */

import { describe, it, expect, beforeAll } from '@jest/globals'
import { pool } from '../../database/connection'
import { projectDataExtractionService } from '../../services/projectDataExtractionService'
import { ExtractionContext } from '../../services/extraction/base/ExtractionContext'
import { extractTeamAgreements } from '../../services/extraction/entities/team_agreements/extractTeamAgreements'
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
    title: 'Team Agreements',
    content: `
# Team Agreements

## Working Hours
- **Agreement**: Core hours are 9 AM - 5 PM EST
- **Agreed By**: Development Team, Product Owner
- **Facilitated By**: Scrum Master
- **Effective Date**: 2024-01-01
- **Review Frequency**: Quarterly
- **Status**: Active

## Communication
- **Agreement**: All team members must respond to Slack messages within 4 hours during business days
- **Agreed By**: All Team Members
- **Review Frequency**: Monthly
- **Adherence Score**: 8/10
- **Violations Count**: 2

## Decision Making
- **Agreement**: Technical decisions require approval from Tech Lead
- **Agreed By**: Development Team
- **Status**: Active
    `.trim(),
    template_name: 'Team Agreements'
  }
]

describe('Team Agreements Extraction Parity Tests', () => {
  beforeAll(async () => {
    // Ensure database connection
    if (!pool) {
      const { connectDatabase } = await Promise.resolve().then(() => require())
      await connectDatabase()
    }
  })

  describe('Extraction Output Parity', () => {
    it('should extract same number of team agreements (within tolerance)', async () => {
      const options: ExtractionOptions = {
        aiProvider: 'openai',
        aiModel: 'gpt-4',
        temperature: 0.25,
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
      const newResult = await extractTeamAgreements(context, {
        temperature: options.temperature,
        maxTokens: options.maxTokens
      })

      // Extract using legacy extractor
      const legacyResult = await projectDataExtractionService.extractSingleEntityType(
        TEST_PROJECT_ID,
        TEST_USER_ID,
        'team_agreements',
        options
      )

      // Compare counts (allow 10% variance for AI non-determinism)
      const newCount = newResult.entities.length
      const legacyCount = legacyResult.length
      const variance = Math.abs(newCount - legacyCount) / Math.max(newCount, legacyCount, 1)

      expect(variance).toBeLessThan(0.1) // Within 10% variance
      
      console.log(`[PARITY] New extractor: ${newCount} items, Legacy: ${legacyCount} items, Variance: ${(variance * 100).toFixed(1)}%`)
    }, 60000) // 60 second timeout for AI calls

    it('should extract team agreements with similar structure', async () => {
      const options: ExtractionOptions = {
        aiProvider: 'openai',
        aiModel: 'gpt-4',
        temperature: 0.25
      }

      const context = new ExtractionContext(
        TEST_PROJECT_ID,
        TEST_USER_ID,
        TEST_DOCUMENTS,
        options
      )

      const newResult = await extractTeamAgreements(context, {
        temperature: options.temperature
      })

      // Validate structure
      expect(newResult.entities.length).toBeGreaterThan(0)
      
      const firstAgreement = newResult.entities[0]
      expect(firstAgreement).toHaveProperty('title')
      expect(firstAgreement).toHaveProperty('category')
      expect(firstAgreement).toHaveProperty('source_document_id')
      
      // Check that all team agreements have required fields
      newResult.entities.forEach(agreement => {
        expect(agreement.title).toBeTruthy()
        expect([
          'working_hours',
          'communication',
          'decision_making',
          'conflict_resolution',
          'quality_standards',
          'meeting_norms',
          'code_of_conduct',
          'collaboration_tools',
          'response_times',
          'knowledge_sharing',
          'other'
        ]).toContain(agreement.category)
        expect(agreement.source_document_id).toBeTruthy()
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

      const newResult = await extractTeamAgreements(context)

      // All entities should have source_document_id resolved
      const unresolvedCount = newResult.entities.filter(
        agreement => !agreement.source_document_id
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
      const firstResult = await extractTeamAgreements(context)
      expect(firstResult.stats.cacheHit).toBe(false)

      // Second extraction (cache hit)
      const secondResult = await extractTeamAgreements(context)
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

      const result = await extractTeamAgreements(emptyContext)
      
      expect(result.entities.length).toBe(0)
      expect(result.rejectedCount).toBe(0)
    })
  })
})

