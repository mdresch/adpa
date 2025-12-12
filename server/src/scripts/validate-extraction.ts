/**
 * Validate Extraction
 * 
 * Script to validate new extractor output against legacy extractor.
 * Compares outputs and generates a validation report.
 * 
 * Usage:
 *   tsx scripts/validate-extraction.ts <projectId> [entityType]
 */

import { pool } from '../database/connection'
import { projectDataExtractionService } from '../services/projectDataExtractionService'
import { ExtractionContext } from '../services/extraction/base/ExtractionContext'
import { extractWorkItems } from '../services/extraction/entities/work_items/extractWorkItems'
import { extractCapacityPlans } from '../services/extraction/entities/capacity_plans/extractCapacityPlans'
import { compareExtractionResults, generateComparisonReport } from '../services/extraction/utils/ValidationUtils'
import { logger } from '../utils/logger'

async function getProjectDocuments(projectId: string) {
  const result = await pool.query(
    `
    SELECT 
      d.id,
      COALESCE(d.title, t.name, 'Untitled Document ' || SUBSTRING(d.id::text, 1, 8)) as title,
      d.content,
      t.name as template_name
    FROM documents d
    LEFT JOIN templates t ON d.template_id = t.id
    WHERE d.project_id = $1
      AND d.deleted_at IS NULL
      AND d.content IS NOT NULL
      AND d.content != ''
      AND d.parent_document_id IS NULL
    ORDER BY d.created_at ASC
    `,
    [projectId]
  )
  return result.rows
}

async function validateExtraction(projectId: string, entityTypes?: string[]) {
  logger.info('[VALIDATION] Starting extraction validation', { projectId, entityTypes })

  // Get documents
  const documents = await getProjectDocuments(projectId)
  if (documents.length === 0) {
    throw new Error(`No documents found for project ${projectId}`)
  }

  logger.info(`[VALIDATION] Found ${documents.length} documents`)

  // Create context
  const context = new ExtractionContext(
    projectId,
    'system',
    documents,
    {
      aiProvider: process.env.AI_PROVIDER || 'openai',
      aiModel: process.env.AI_MODEL
    }
  )

  // Validate specified entities or all registered
  const entitiesToValidate = entityTypes || ['work_items', 'capacity_plans']
  const comparisons: Record<string, any> = {}

  for (const entityType of entitiesToValidate) {
    try {
      logger.info(`[VALIDATION] Validating ${entityType}`)

      // Extract using new extractor
      let newResult
      if (entityType === 'work_items') {
        newResult = await extractWorkItems(context)
      } else if (entityType === 'capacity_plans') {
        newResult = await extractCapacityPlans(context)
      } else {
        logger.warn(`[VALIDATION] Unknown entity type: ${entityType}`)
        continue
      }

      // Extract using legacy extractor
      const legacyResult = await projectDataExtractionService.extractSingleEntityType(
        projectId,
        'system',
        entityType,
        {
          aiProvider: context.provider,
          aiModel: context.model,
          documentIds: documents.map(d => d.id)
        }
      )

      // Compare results
      const comparison = compareExtractionResults(
        newResult,
        legacyResult,
        entityType,
        0.1 // 10% tolerance
      )

      comparisons[entityType] = comparison

      logger.info(`[VALIDATION] ${entityType}: ${comparison.matches ? '✅ MATCH' : '❌ MISMATCH'}`, {
        newCount: comparison.newCount,
        legacyCount: comparison.legacyCount,
        variance: (comparison.countVariance * 100).toFixed(1) + '%'
      })
    } catch (error: any) {
      logger.error(`[VALIDATION] Failed to validate ${entityType}`, {
        error: error.message
      })
      comparisons[entityType] = {
        matches: false,
        differences: [`Validation failed: ${error.message}`]
      }
    }
  }

  // Generate report
  const report = generateComparisonReport(comparisons)
  console.log('\n' + report + '\n')

  // Check if all match
  const allMatch = Object.values(comparisons).every(c => c.matches)
  
  if (allMatch) {
    logger.info('[VALIDATION] ✅ All entities match')
    return 0
  } else {
    logger.warn('[VALIDATION] ❌ Some entities do not match')
    return 1
  }
}

// Run if called directly
if (require.main === module) {
  const projectId = process.argv[2]
  const entityTypes = process.argv.slice(3)

  if (!projectId) {
    console.error('Usage: tsx scripts/validate-extraction.ts <projectId> [entityType1] [entityType2] ...')
    process.exit(1)
  }

  validateExtraction(projectId, entityTypes.length > 0 ? entityTypes : undefined)
    .then((exitCode) => {
      process.exit(exitCode)
    })
    .catch((error) => {
      console.error('❌ Validation failed:', error)
      process.exit(1)
    })
}

export { validateExtraction }

