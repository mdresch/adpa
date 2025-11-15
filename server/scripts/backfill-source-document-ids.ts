/**
 * Backfill Source Document IDs for Extracted Entities
 * 
 * This script associates existing extracted entities with their source documents
 * to enable full traceability. It uses multiple matching strategies:
 * 1. Project-based matching (entities and documents from same project)
 * 2. Timestamp-based matching (entities created around document creation time)
 * 3. Content-based matching (entity names/descriptions appear in document content)
 * 
 * Usage:
 *   npm run backfill:source-documents
 *   npx tsx server/scripts/backfill-source-document-ids.ts
 */

import dotenv from "dotenv"
import { getDatabasePool, connectDatabase } from "../src/database/connection"
import { logger } from "../src/utils/logger"

// Load environment variables
if (process.env.NODE_ENV !== "production") {
  dotenv.config()
}

interface EntityTable {
  tableName: string
  idColumn: string
  projectIdColumn: string
  nameColumn: string
  descriptionColumn?: string
  createdByColumn?: string
}

// All entity tables that have source_document_id (from migration 334)
const ENTITY_TABLES: EntityTable[] = [
  { tableName: 'stakeholders', idColumn: 'id', projectIdColumn: 'project_id', nameColumn: 'name', descriptionColumn: 'role' },
  { tableName: 'requirements', idColumn: 'id', projectIdColumn: 'project_id', nameColumn: 'name', descriptionColumn: 'description' },
  { tableName: 'risks', idColumn: 'id', projectIdColumn: 'project_id', nameColumn: 'title', descriptionColumn: 'description' },
  { tableName: 'milestones', idColumn: 'id', projectIdColumn: 'project_id', nameColumn: 'name', descriptionColumn: 'description' },
  { tableName: 'constraints', idColumn: 'id', projectIdColumn: 'project_id', nameColumn: 'title', descriptionColumn: 'description' },
  { tableName: 'success_criteria', idColumn: 'id', projectIdColumn: 'project_id', nameColumn: 'title', descriptionColumn: 'description' },
  { tableName: 'best_practices', idColumn: 'id', projectIdColumn: 'project_id', nameColumn: 'title', descriptionColumn: 'description' },
  { tableName: 'phases', idColumn: 'id', projectIdColumn: 'project_id', nameColumn: 'name', descriptionColumn: 'description' },
  { tableName: 'resources', idColumn: 'id', projectIdColumn: 'project_id', nameColumn: 'name', descriptionColumn: 'role' },
  { tableName: 'technologies', idColumn: 'id', projectIdColumn: 'project_id', nameColumn: 'name', descriptionColumn: 'description' },
  { tableName: 'quality_standards', idColumn: 'id', projectIdColumn: 'project_id', nameColumn: 'standard_name', descriptionColumn: 'description' },
  { tableName: 'deliverables', idColumn: 'id', projectIdColumn: 'project_id', nameColumn: 'name', descriptionColumn: 'description' },
  { tableName: 'scope_items', idColumn: 'id', projectIdColumn: 'project_id', nameColumn: 'item_name', descriptionColumn: 'description' },
  { tableName: 'activities', idColumn: 'id', projectIdColumn: 'project_id', nameColumn: 'name', descriptionColumn: 'description' },
  { tableName: 'work_items', idColumn: 'id', projectIdColumn: 'project_id', nameColumn: 'name', descriptionColumn: 'description' },
  { tableName: 'project_iterations', idColumn: 'id', projectIdColumn: 'project_id', nameColumn: 'name', descriptionColumn: 'description' },
  { tableName: 'capacity_plans', idColumn: 'id', projectIdColumn: 'project_id', nameColumn: 'team_member', descriptionColumn: 'role' },
  { tableName: 'earned_value_metrics', idColumn: 'id', projectIdColumn: 'project_id', nameColumn: 'id', descriptionColumn: 'notes' },
  { tableName: 'opportunities', idColumn: 'id', projectIdColumn: 'project_id', nameColumn: 'title', descriptionColumn: 'description' },
  { tableName: 'risk_responses', idColumn: 'id', projectIdColumn: 'project_id', nameColumn: 'risk_title', descriptionColumn: 'notes' },
  // Note: performance_actuals doesn't have source_document_id column yet - needs migration
  { tableName: 'team_agreements', idColumn: 'id', projectIdColumn: 'project_id', nameColumn: 'title', descriptionColumn: 'description' },
  { tableName: 'development_approaches', idColumn: 'id', projectIdColumn: 'project_id', nameColumn: 'approach', descriptionColumn: 'governance_notes' },
  { tableName: 'performance_measurements', idColumn: 'id', projectIdColumn: 'project_id', nameColumn: 'success_criterion_name', descriptionColumn: 'notes' },
]

/**
 * Normalize text for fuzzy matching
 */
function normalizeText(text: string | null | undefined): string {
  if (!text) return ''
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
}

/**
 * Calculate similarity score between two texts (simple word overlap)
 */
function calculateSimilarity(text1: string, text2: string): number {
  const words1 = new Set(normalizeText(text1).split(' ').filter(w => w.length > 2))
  const words2 = new Set(normalizeText(text2).split(' ').filter(w => w.length > 2))
  
  if (words1.size === 0 || words2.size === 0) return 0
  
  const intersection = new Set([...words1].filter(w => words2.has(w)))
  const union = new Set([...words1, ...words2])
  
  return intersection.size / union.size
}

/**
 * Find best matching document for an entity
 */
async function findBestMatchingDocument(
  pool: any,
  entity: any,
  table: EntityTable,
  projectDocuments: any[]
): Promise<string | null> {
  if (projectDocuments.length === 0) return null
  
  const entityName = entity[table.nameColumn] || ''
  const entityDescription = (table.descriptionColumn && entity[table.descriptionColumn]) || ''
  const entityCreatedAt = entity.created_at ? new Date(entity.created_at) : null
  
  let bestMatch: { documentId: string; score: number } | null = null
  
  for (const doc of projectDocuments) {
    let score = 0
    
    // Strategy 1: Timestamp matching (30% weight)
    // Prefer documents created before or around the same time as the entity
    if (entityCreatedAt && doc.created_at) {
      const docCreatedAt = new Date(doc.created_at)
      const timeDiff = Math.abs(entityCreatedAt.getTime() - docCreatedAt.getTime())
      const daysDiff = timeDiff / (1000 * 60 * 60 * 24)
      
      // Entities extracted within 7 days of document creation get higher score
      if (daysDiff <= 7) {
        score += 0.3 * (1 - daysDiff / 7)
      }
      
      // Prefer documents created before entity (entity extracted from document)
      if (docCreatedAt <= entityCreatedAt) {
        score += 0.1
      }
    }
    
    // Strategy 2: Content matching (70% weight)
    const docContent = (doc.content || doc.title || doc.name || '').toString()
    const docTitle = (doc.title || doc.name || '').toString()
    
    // Match entity name against document content/title
    if (entityName) {
      const nameInContent = calculateSimilarity(entityName, docContent + ' ' + docTitle)
      score += 0.4 * nameInContent
      
      // Exact name match in title gets bonus
      if (normalizeText(docTitle).includes(normalizeText(entityName)) || 
          normalizeText(entityName).includes(normalizeText(docTitle))) {
        score += 0.2
      }
    }
    
    // Match entity description against document content
    if (entityDescription) {
      const descInContent = calculateSimilarity(entityDescription, docContent)
      score += 0.1 * descInContent
    }
    
    // Update best match
    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { documentId: doc.id, score }
    }
  }
  
  // Only return match if score is above threshold (0.1 = 10% confidence)
  return bestMatch && bestMatch.score >= 0.1 ? bestMatch.documentId : null
}

/**
 * Backfill source_document_id for a specific table
 */
async function backfillTable(
  pool: any,
  table: EntityTable,
  dryRun: boolean = false
): Promise<{ total: number; updated: number; skipped: number }> {
  try {
    console.log(`\n📋 Processing table: ${table.tableName}`)
    
    // First check if table exists
    const tableCheck = await pool.query(
      `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      )
      `,
      [table.tableName]
    )
    
    if (!tableCheck.rows[0].exists) {
      console.log(`   ⚠️  Table ${table.tableName} does not exist, skipping`)
      return { total: 0, updated: 0, skipped: 0 }
    }
    
    // Check if source_document_id column exists
    const columnCheck = await pool.query(
      `
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = $1 
        AND column_name = 'source_document_id'
      )
      `,
      [table.tableName]
    )
    
    if (!columnCheck.rows[0].exists) {
      console.log(`   ⚠️  Column source_document_id does not exist in ${table.tableName}, skipping`)
      return { total: 0, updated: 0, skipped: 0 }
    }
    
    // Get all entities without source_document_id
    const entitiesResult = await pool.query(
      `
      SELECT 
        ${table.idColumn},
        ${table.projectIdColumn},
        ${table.nameColumn},
        ${table.descriptionColumn || 'NULL as description'},
        created_at
      FROM ${table.tableName}
      WHERE ${table.projectIdColumn} IS NOT NULL
        AND source_document_id IS NULL
      ORDER BY created_at ASC
      `
    )
    
    const entities = entitiesResult.rows
    console.log(`   Found ${entities.length} entities without source_document_id`)
    
    if (entities.length === 0) {
      return { total: 0, updated: 0, skipped: 0 }
    }
    
    // Group entities by project_id for efficient document lookup
    const entitiesByProject = new Map<string, typeof entities>()
    entities.forEach((entity: any) => {
      const projectId = entity[table.projectIdColumn]
      if (!entitiesByProject.has(projectId)) {
        entitiesByProject.set(projectId, [])
      }
      entitiesByProject.get(projectId)!.push(entity)
    })
    
    let updated = 0
    let skipped = 0
    
    // Process each project
    for (const [projectId, projectEntities] of entitiesByProject.entries()) {
      // Get all documents for this project
      const docsResult = await pool.query(
        `
        SELECT id, title, name, content, created_at, updated_at
        FROM documents
        WHERE project_id = $1
          AND deleted_at IS NULL
        ORDER BY created_at ASC
        `,
        [projectId]
      )
      
      const projectDocuments = docsResult.rows
      
      if (projectDocuments.length === 0) {
        console.log(`   ⚠️  Project ${projectId}: No documents found, skipping ${projectEntities.length} entities`)
        skipped += projectEntities.length
        continue
      }
      
      console.log(`   📄 Project ${projectId}: ${projectDocuments.length} documents available`)
      
      // Match each entity to a document
      for (const entity of projectEntities) {
        const matchingDocId = await findBestMatchingDocument(pool, entity, table, projectDocuments)
        
        if (matchingDocId) {
          if (!dryRun) {
            await pool.query(
              `
              UPDATE ${table.tableName}
              SET source_document_id = $1,
                  updated_at = CURRENT_TIMESTAMP
              WHERE ${table.idColumn} = $2
              `,
              [matchingDocId, entity[table.idColumn]]
            )
          }
          updated++
        } else {
          skipped++
        }
      }
    }
    
    console.log(`   ✅ Updated: ${updated}, Skipped: ${skipped}`)
    return { total: entities.length, updated, skipped }
    
  } catch (error: any) {
    // Handle case where table doesn't exist or column doesn't exist
    if (error?.code === '42P01' || error?.code === '42703' || error?.message?.includes('does not exist') || error?.message?.includes('column') || error?.message?.includes('undefined column')) {
      console.log(`   ⚠️  Error querying ${table.tableName}: ${error.message}`)
      console.log(`   ⚠️  Skipping table (may have different schema)`)
      return { total: 0, updated: 0, skipped: 0 }
    }
    // Log other errors but don't fail the entire script
    console.log(`   ⚠️  Error processing ${table.tableName}: ${error.message}`)
    return { total: 0, updated: 0, skipped: 0 }
  }
}

/**
 * Main backfill function
 */
async function backfillSourceDocumentIds(dryRun: boolean = false) {
  try {
    logger.info("Connecting to database...")
    await connectDatabase()
    logger.info("Database connected successfully")
    
    const pool = getDatabasePool()
    
    console.log("🚀 Starting Source Document ID Backfill")
    console.log("========================================")
    console.log(`Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE (will update database)'}`)
    console.log("")
    
    const results: Record<string, { total: number; updated: number; skipped: number }> = {}
    let totalEntities = 0
    let totalUpdated = 0
    let totalSkipped = 0
    
    // Process each entity table
    for (const table of ENTITY_TABLES) {
      const result = await backfillTable(pool, table, dryRun)
      results[table.tableName] = result
      totalEntities += result.total
      totalUpdated += result.updated
      totalSkipped += result.skipped
    }
    
    // Summary
    console.log("\n" + "=".repeat(60))
    console.log("📊 Backfill Summary")
    console.log("=".repeat(60))
    console.log(`Total entities processed: ${totalEntities}`)
    console.log(`Successfully matched: ${totalUpdated}`)
    console.log(`Could not match: ${totalSkipped}`)
    console.log(`Match rate: ${totalEntities > 0 ? ((totalUpdated / totalEntities) * 100).toFixed(1) : 0}%`)
    console.log("")
    
    // Detailed breakdown
    console.log("📋 Detailed Results by Table:")
    for (const [tableName, result] of Object.entries(results)) {
      if (result.total > 0) {
        console.log(`   ${tableName.padEnd(30)} Total: ${result.total.toString().padStart(5)} | Updated: ${result.updated.toString().padStart(5)} | Skipped: ${result.skipped.toString().padStart(5)}`)
      }
    }
    
    if (dryRun) {
      console.log("\n💡 This was a DRY RUN. No changes were made.")
      console.log("   Run without --dry-run to apply changes.")
    } else {
      console.log("\n✅ Backfill completed successfully!")
    }
    
    await pool.end()
    
  } catch (error: any) {
    logger.error("Backfill failed:", error)
    console.error("\n❌ Backfill failed:", error.message)
    if (error.stack) {
      console.error("Stack trace:", error.stack)
    }
    process.exit(1)
  }
}

// Parse command line arguments
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run') || args.includes('-d')

// Run backfill
backfillSourceDocumentIds(dryRun).catch((error) => {
  logger.error("Unhandled error:", error)
  console.error("Unhandled error:", error)
  process.exit(1)
})

