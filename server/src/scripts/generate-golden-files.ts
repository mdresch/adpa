/**
 * Generate Golden Files
 * 
 * Script to generate golden files from extraction results.
 * Run this on a known-good extraction to create baseline outputs.
 * 
 * Usage:
 *   tsx scripts/generate-golden-files.ts <projectId> [entityType]
 */

import { pool } from '../database/connection'
import { ExtractionContext } from '../services/extraction/base/ExtractionContext'
import { extractWorkItems } from '../services/extraction/entities/work_items/extractWorkItems'
import { extractCapacityPlans } from '../services/extraction/entities/capacity_plans/extractCapacityPlans'
import { saveGoldenFile } from '../services/extraction/utils/GoldenFileGenerator'
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

async function generateGoldenFiles(projectId: string, entityTypes?: string[]) {
  logger.info('[GOLDEN-FILE-GEN] Starting golden file generation', { projectId, entityTypes })

  // Get documents
  const documents = await getProjectDocuments(projectId)
  if (documents.length === 0) {
    throw new Error(`No documents found for project ${projectId}`)
  }

  logger.info(`[GOLDEN-FILE-GEN] Found ${documents.length} documents`)

  // Create context
  const context = new ExtractionContext(
    projectId,
    'system', // System user for golden file generation
    documents,
    {
      aiProvider: process.env.AI_PROVIDER || 'openai',
      aiModel: process.env.AI_MODEL
    }
  )

  // Generate golden files for specified entities or all registered
  const entitiesToGenerate = entityTypes || ['work_items', 'capacity_plans']

  for (const entityType of entitiesToGenerate) {
    try {
      logger.info(`[GOLDEN-FILE-GEN] Generating golden file for ${entityType}`)

      let result
      if (entityType === 'work_items') {
        result = await extractWorkItems(context)
      } else if (entityType === 'capacity_plans') {
        result = await extractCapacityPlans(context)
      } else {
        logger.warn(`[GOLDEN-FILE-GEN] Unknown entity type: ${entityType}`)
        continue
      }

      // Save golden file
      saveGoldenFile(entityType, result, {
        projectId,
        documentCount: documents.length,
        provider: context.provider,
        model: context.model
      })

      logger.info(`[GOLDEN-FILE-GEN] ✅ Generated golden file for ${entityType}`, {
        entityCount: result.entities.length,
        rejectedCount: result.rejectedCount
      })
    } catch (error: any) {
      logger.error(`[GOLDEN-FILE-GEN] Failed to generate golden file for ${entityType}`, {
        error: error.message
      })
    }
  }

  logger.info('[GOLDEN-FILE-GEN] Golden file generation complete')
}

// Run if called directly
if (require.main === module) {
  const projectId = process.argv[2]
  const entityTypes = process.argv.slice(3)

  if (!projectId) {
    console.error('Usage: tsx scripts/generate-golden-files.ts <projectId> [entityType1] [entityType2] ...')
    process.exit(1)
  }

  generateGoldenFiles(projectId, entityTypes.length > 0 ? entityTypes : undefined)
    .then(() => {
      console.log('✅ Golden file generation complete')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Golden file generation failed:', error)
      process.exit(1)
    })
}

export { generateGoldenFiles }

