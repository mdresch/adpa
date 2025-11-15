/**
 * Cleanup duplicate stakeholders for a specific project
 * Uses the same normalization logic as the extraction service
 * 
 * Usage:
 *   npx tsx scripts/cleanup-project-stakeholders.ts <project-id>
 */

import dotenv from "dotenv"
import { getDatabasePool, connectDatabase } from "../src/database/connection"
import { logger } from "../src/utils/logger"

// Load environment variables
if (process.env.NODE_ENV !== "production") {
  dotenv.config()
}

/**
 * Normalize stakeholder name for deduplication
 * Same logic as ProjectDataExtractionService
 */
function normalizeStakeholderName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s*\([^)]*\)\s*$/, '') // Remove trailing (role) suffix
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[^\w\s]/g, '') // Remove special characters for better matching
}

async function cleanupProjectStakeholders(projectId: string) {
  try {
    logger.info("Connecting to database...")
    await connectDatabase()
    logger.info("Database connected successfully")
  } catch (error) {
    logger.error("Failed to connect to database:", error)
    throw error
  }

  const pool = getDatabasePool()
  const client = await pool.connect()

  try {
    console.log(`🔍 Cleaning up stakeholders for project: ${projectId}\n`)

    // Get all stakeholders for this project
    const allStakeholdersResult = await client.query(
      `SELECT id, name, role, email, department, stakeholder_type, 
              interest_level, influence_level, expectations, concerns,
              created_at, updated_at
       FROM stakeholders 
       WHERE project_id = $1
       ORDER BY created_at ASC`,
      [projectId]
    )

    const allStakeholders = allStakeholdersResult.rows

    if (allStakeholders.length === 0) {
      console.log("✅ No stakeholders found for this project")
      return
    }

    console.log(`📊 Found ${allStakeholders.length} stakeholders\n`)

    // Group stakeholders by normalized name
    const normalizedGroups = new Map<string, typeof allStakeholders>()
    
    allStakeholders.forEach(stakeholder => {
      const normalized = normalizeStakeholderName(stakeholder.name)
      
      if (!normalizedGroups.has(normalized)) {
        normalizedGroups.set(normalized, [])
      }
      normalizedGroups.get(normalized)!.push(stakeholder)
    })

    // Find duplicates (groups with more than 1 stakeholder)
    const duplicateGroups: Array<{ normalized: string; stakeholders: typeof allStakeholders }> = []
    
    normalizedGroups.forEach((stakeholders, normalized) => {
      if (stakeholders.length > 1) {
        duplicateGroups.push({ normalized, stakeholders })
      }
    })

    if (duplicateGroups.length === 0) {
      console.log("✅ No duplicate stakeholders found!\n")
      console.log("All stakeholders are unique (after normalization).")
      return
    }

    console.log(`⚠️  Found ${duplicateGroups.length} groups of duplicate stakeholders:\n`)

    let totalToDelete = 0
    const idsToDelete: string[] = []

    // Process each duplicate group
    for (const group of duplicateGroups) {
      const stakeholders = group.stakeholders
      console.log(`📌 Group: "${group.normalized}" (${stakeholders.length} entries)`)
      
      // Sort by created_at (oldest first) and by name length (longest first)
      // Keep the oldest entry with the longest/most detailed name
      stakeholders.sort((a, b) => {
        const dateCompare = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        if (dateCompare !== 0) return dateCompare
        return b.name.length - a.name.length // Longer name = more detailed
      })

      const keep = stakeholders[0]
      const toDelete = stakeholders.slice(1)

      console.log(`   ✅ KEEP: "${keep.name}" (ID: ${keep.id}, Created: ${new Date(keep.created_at).toISOString().split('T')[0]})`)
      
      toDelete.forEach(stakeholder => {
        console.log(`   ❌ DELETE: "${stakeholder.name}" (ID: ${stakeholder.id})`)
        idsToDelete.push(stakeholder.id)
        totalToDelete++
      })
      console.log()
    }

    if (idsToDelete.length === 0) {
      console.log("✅ No duplicates to remove")
      return
    }

    console.log(`\n🗑️  Ready to delete ${totalToDelete} duplicate stakeholder(s)`)
    console.log(`   Keeping ${allStakeholders.length - totalToDelete} unique stakeholder(s)\n`)

    // Ask for confirmation (in production, you might want to add a --force flag)
    // For now, we'll proceed with the deletion
    console.log("🔄 Deleting duplicates...\n")

    await client.query('BEGIN')
    
    try {
      // Delete duplicates
      const deleteResult = await client.query(
        `DELETE FROM stakeholders WHERE id = ANY($1::uuid[])`,
        [idsToDelete]
      )

      await client.query('COMMIT')

      console.log(`✅ Successfully deleted ${deleteResult.rowCount} duplicate stakeholder(s)`)
      console.log(`\n📊 Final stakeholder count: ${allStakeholders.length - totalToDelete}`)
      console.log(`\n✨ Cleanup completed successfully!`)

    } catch (error: any) {
      await client.query('ROLLBACK')
      throw error
    }

  } catch (error: any) {
    logger.error("Cleanup failed:", error)
    console.error("\n❌ Cleanup failed:", error.message)
    if (error.stack) {
      console.error("Stack trace:", error.stack)
    }
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

// Get project ID from command line arguments
const projectId = process.argv[2]

if (!projectId) {
  console.error("❌ Error: Project ID required")
  console.log("\nUsage:")
  console.log("  npx tsx scripts/cleanup-project-stakeholders.ts <project-id>")
  console.log("\nExample:")
  console.log("  npx tsx scripts/cleanup-project-stakeholders.ts 629f3a61-23b7-4de7-9232-9c0c3c953162")
  process.exit(1)
}

// Validate UUID format
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89abAB][0-9a-f]{3}-[0-9a-f]{12}$/i
if (!uuidRegex.test(projectId)) {
  console.error(`❌ Error: Invalid UUID format: ${projectId}`)
  process.exit(1)
}

// Run cleanup
cleanupProjectStakeholders(projectId).catch((error) => {
  logger.error("Unhandled error:", error)
  console.error("Unhandled error:", error)
  process.exit(1)
})

