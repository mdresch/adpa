/**
 * Compare Template Usage Analysis Script
 * 
 * Compares actual template usage (from documents and template_usage table) 
 * with the stored usage_count in the templates table.
 * 
 * Usage:
 *   npx tsx server/scripts/compare-template-usage.ts [--fix]
 *   npm run compare-template-usage
 */

import dotenv from "dotenv"
import { getDatabasePool, connectDatabase } from "../src/database/connection"
import { logger } from "../src/utils/logger"
import path from "path"

// Load environment variables
if (process.env.NODE_ENV !== "production") {
  dotenv.config({ path: path.join(__dirname, "../.env") })
}

interface TemplateUsageComparison {
  template_id: string
  template_name: string
  framework: string
  stored_usage_count: number
  actual_document_count: number
  actual_template_usage_count: number
  discrepancy: number
  needs_fix: boolean
}

async function compareTemplateUsage(fix: boolean = false) {
  try {
    logger.info("Connecting to database...")
    await connectDatabase()
    logger.info("Database connected successfully")
  } catch (error) {
    logger.error("Failed to connect to database:", error)
    throw error
  }

  const pool = getDatabasePool()

  try {
    console.log("\n" + "=".repeat(80))
    console.log("📊 TEMPLATE USAGE COMPARISON ANALYSIS")
    console.log("=".repeat(80) + "\n")

    // Get all templates with their stored usage_count
    const templatesResult = await pool.query(`
      SELECT 
        id,
        name,
        framework,
        usage_count,
        validation_count,
        success_count,
        last_used_at,
        created_at
      FROM templates
      WHERE deleted_at IS NULL
      ORDER BY usage_count DESC, name ASC
    `)

    console.log(`Found ${templatesResult.rows.length} templates\n`)

    const comparisons: TemplateUsageComparison[] = []
    let totalDiscrepancies = 0
    let templatesNeedingFix = 0

    // For each template, compare stored vs actual usage
    for (const template of templatesResult.rows) {
      const templateId = template.id

      // Count actual documents using this template
      const documentsResult = await pool.query(`
        SELECT COUNT(*) as count
        FROM documents
        WHERE template_id = $1
        AND deleted_at IS NULL
      `, [templateId])

      const actualDocumentCount = parseInt(documentsResult.rows[0].count, 10)

      // Count entries in template_usage table
      const templateUsageResult = await pool.query(`
        SELECT COUNT(*) as count
        FROM template_usage
        WHERE template_id = $1
      `, [templateId])

      const actualTemplateUsageCount = parseInt(templateUsageResult.rows[0].count, 10)

      const storedUsageCount = parseInt(template.usage_count || 0, 10)
      
      // Use the higher of document count or template_usage count as the "actual" count
      // template_usage is more accurate as it tracks all uses (including AI generation)
      const actualCount = Math.max(actualDocumentCount, actualTemplateUsageCount)
      const discrepancy = actualCount - storedUsageCount
      const needsFix = discrepancy > 0

      comparisons.push({
        template_id: templateId,
        template_name: template.name,
        framework: template.framework || 'N/A',
        stored_usage_count: storedUsageCount,
        actual_document_count: actualDocumentCount,
        actual_template_usage_count: actualTemplateUsageCount,
        discrepancy,
        needs_fix: needsFix
      })

      if (needsFix) {
        totalDiscrepancies += discrepancy
        templatesNeedingFix++
      }
    }

    // Sort by discrepancy (highest first)
    comparisons.sort((a, b) => b.discrepancy - a.discrepancy)

    // Display results
    console.log("📋 COMPARISON RESULTS\n")
    console.log("─".repeat(80))
    console.log(
      "Template Name".padEnd(40) +
      "Framework".padEnd(15) +
      "Stored".padEnd(10) +
      "Documents".padEnd(12) +
      "Usage Table".padEnd(13) +
      "Discrepancy"
    )
    console.log("─".repeat(80))

    for (const comp of comparisons) {
      const name = comp.template_name.length > 38 
        ? comp.template_name.substring(0, 35) + "..." 
        : comp.template_name
      
      const discrepancyStr = comp.discrepancy > 0 
        ? `+${comp.discrepancy}` 
        : comp.discrepancy === 0 
          ? "✓" 
          : comp.discrepancy.toString()

      const indicator = comp.needs_fix ? "⚠️" : "✓"

      console.log(
        `${indicator} ${name.padEnd(38)}` +
        `${comp.framework.padEnd(15)}` +
        `${comp.stored_usage_count.toString().padEnd(10)}` +
        `${comp.actual_document_count.toString().padEnd(12)}` +
        `${comp.actual_template_usage_count.toString().padEnd(13)}` +
        `${discrepancyStr}`
      )
    }

    console.log("─".repeat(80))
    console.log(`\n📈 SUMMARY:`)
    console.log(`   Total Templates: ${comparisons.length}`)
    console.log(`   Templates with discrepancies: ${templatesNeedingFix}`)
    console.log(`   Total missing usage counts: ${totalDiscrepancies}`)
    console.log(`   Templates perfectly synced: ${comparisons.length - templatesNeedingFix}`)

    // Show templates that need fixing
    if (templatesNeedingFix > 0) {
      console.log(`\n⚠️  TEMPLATES NEEDING FIX (${templatesNeedingFix}):`)
      const needingFix = comparisons.filter(c => c.needs_fix)
      for (const comp of needingFix.slice(0, 10)) { // Show top 10
        console.log(`   • ${comp.template_name} (${comp.framework}): ${comp.stored_usage_count} → ${comp.actual_template_usage_count} (+${comp.discrepancy})`)
      }
      if (needingFix.length > 10) {
        console.log(`   ... and ${needingFix.length - 10} more`)
      }
    }

    // Fix if requested
    if (fix && templatesNeedingFix > 0) {
      console.log(`\n🔧 FIXING TEMPLATE USAGE COUNTS...\n`)
      
      let fixed = 0
      let errors = 0

      for (const comp of comparisons.filter(c => c.needs_fix)) {
        try {
          // Update usage_count to match actual_template_usage_count (most accurate)
          const newCount = comp.actual_template_usage_count
          
          await pool.query(`
            UPDATE templates
            SET 
              usage_count = $1,
              last_used_at = (
                SELECT MAX(used_at) 
                FROM template_usage 
                WHERE template_id = $2
              ),
              updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
          `, [newCount, comp.template_id])

          // Clear template cache
          try {
            const { cache } = require('../src/utils/redis')
            await cache.del(`template:${comp.template_id}`)
          } catch (cacheError) {
            // Cache clear failure is not critical
          }

          fixed++
          console.log(`   ✅ Fixed: ${comp.template_name} (${comp.stored_usage_count} → ${newCount})`)
        } catch (error: any) {
          errors++
          console.error(`   ❌ Failed to fix ${comp.template_name}: ${error.message}`)
        }
      }

      console.log(`\n✨ Fix complete:`)
      console.log(`   Fixed: ${fixed}`)
      console.log(`   Errors: ${errors}`)
    } else if (fix) {
      console.log(`\n✅ No templates need fixing - all usage counts are accurate!`)
    } else if (templatesNeedingFix > 0) {
      console.log(`\n💡 To fix discrepancies, run:`)
      console.log(`   npx tsx server/scripts/compare-template-usage.ts --fix`)
    }

    // Additional analysis
    console.log(`\n📊 ADDITIONAL ANALYSIS:`)
    
    // Templates with most usage
    const topUsed = comparisons
      .sort((a, b) => b.actual_template_usage_count - a.actual_template_usage_count)
      .slice(0, 5)
    
    console.log(`\n   Top 5 Most Used Templates:`)
    topUsed.forEach((comp, idx) => {
      console.log(`   ${idx + 1}. ${comp.template_name} (${comp.framework}): ${comp.actual_template_usage_count} uses`)
    })

    // Templates never used
    const neverUsed = comparisons.filter(c => 
      c.actual_document_count === 0 && 
      c.actual_template_usage_count === 0
    )
    
    if (neverUsed.length > 0) {
      console.log(`\n   Templates Never Used (${neverUsed.length}):`)
      neverUsed.slice(0, 5).forEach(comp => {
        console.log(`   • ${comp.template_name} (${comp.framework})`)
      })
      if (neverUsed.length > 5) {
        console.log(`   ... and ${neverUsed.length - 5} more`)
      }
    }

    console.log("\n" + "=".repeat(80))
    console.log("✅ Analysis complete!")
    console.log("=".repeat(80) + "\n")

  } catch (error: any) {
    logger.error("Error comparing template usage:", error)
    console.error("\n❌ Error:", error.message)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

// Parse command line arguments
const args = process.argv.slice(2)
const fix = args.includes("--fix") || args.includes("-f")

// Run the comparison
compareTemplateUsage(fix)
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error("Fatal error:", error)
    process.exit(1)
  })

