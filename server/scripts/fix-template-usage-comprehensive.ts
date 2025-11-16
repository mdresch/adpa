/**
 * Comprehensive Template Usage Fix Script
 * 
 * This script:
 * 1. Uses documents table as source of truth (most accurate)
 * 2. Backfills template_usage table for missing entries
 * 3. Calculates and stores quality scores for all template uses
 * 4. Updates usage_count, validation_count, success_count
 * 5. Updates health_status, quality_threshold, last_validated_at
 * 
 * Usage:
 *   npx tsx server/scripts/fix-template-usage-comprehensive.ts [--dry-run]
 */

import dotenv from "dotenv"
import { getDatabasePool, connectDatabase } from "../src/database/connection"
import { logger } from "../src/utils/logger"
import path from "path"

// Load environment variables
if (process.env.NODE_ENV !== "production") {
  dotenv.config({ path: path.join(__dirname, "../.env") })
}

interface TemplateFix {
  template_id: string
  template_name: string
  framework: string
  current_usage_count: number
  documents_count: number
  template_usage_count: number
  missing_entries: number
  needs_backfill: boolean
  needs_usage_update: boolean
}

/**
 * Calculate quality score for a document
 * This is a simplified version - in production, you'd use actual quality metrics
 */
function calculateDocumentQualityScore(document: any): number {
  // Base score from document quality
  let score = 0.5 // Base score
  
  // Word count factor (documents with reasonable length score better)
  if (document.word_count) {
    if (document.word_count >= 500 && document.word_count <= 5000) {
      score += 0.2 // Good length
    } else if (document.word_count > 5000) {
      score += 0.15 // Very long, might be verbose
    } else {
      score += 0.1 // Short but acceptable
    }
  }
  
  // Status factor (published/reviewed documents are higher quality)
  if (document.status === 'published') {
    score += 0.2
  } else if (document.status === 'reviewed') {
    score += 0.15
  } else if (document.status === 'draft') {
    score += 0.05
  }
  
  // Version count factor (documents with versions show engagement)
  if (document.version_count && document.version_count > 1) {
    score += 0.1
  }
  
  // Ensure score is between 0.5 and 1.0
  return Math.min(Math.max(score, 0.5), 1.0)
}

async function fixTemplateUsageComprehensive(dryRun: boolean = false) {
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
    console.log("🔧 COMPREHENSIVE TEMPLATE USAGE FIX")
    console.log("=".repeat(80))
    console.log(`Mode: ${dryRun ? '🔍 DRY RUN (no changes)' : '✏️  LIVE MODE (will update database)'}\n`)

    // Get all templates
    const templatesResult = await pool.query(`
      SELECT 
        id,
        name,
        framework,
        usage_count,
        validation_count,
        success_count,
        quality_threshold,
        development_status,
        last_validated_at
      FROM templates
      WHERE deleted_at IS NULL
      ORDER BY name ASC
    `)

    console.log(`Found ${templatesResult.rows.length} templates\n`)

    const fixes: TemplateFix[] = []
    let totalMissingEntries = 0
    let totalNeedingBackfill = 0

    // For each template, check documents vs template_usage
    for (const template of templatesResult.rows) {
      const templateId = template.id

      // Count documents using this template
      const documentsResult = await pool.query(`
        SELECT 
          d.id,
          d.name,
          d.status,
          d.word_count,
          d.created_at,
          d.created_by,
          d.project_id,
          (SELECT COUNT(*) FROM document_versions WHERE document_id = d.id) as version_count
        FROM documents d
        WHERE d.template_id = $1
        AND d.deleted_at IS NULL
        ORDER BY d.created_at ASC
      `, [templateId])

      const documents = documentsResult.rows
      const documentsCount = documents.length

      // Count entries in template_usage table
      const templateUsageResult = await pool.query(`
        SELECT document_id
        FROM template_usage
        WHERE template_id = $1
      `, [templateId])

      const templateUsageEntries = templateUsageResult.rows.map((r: any) => r.document_id)
      const templateUsageCount = templateUsageEntries.length

      // Find documents missing from template_usage
      const documentIds = documents.map((d: any) => d.id)
      const missingDocumentIds = documentIds.filter((id: string) => !templateUsageEntries.includes(id))
      const missingEntries = missingDocumentIds.length

      const currentUsageCount = parseInt(template.usage_count || 0, 10)
      const needsBackfill = missingEntries > 0
      const needsUsageUpdate = documentsCount !== currentUsageCount

      fixes.push({
        template_id: templateId,
        template_name: template.name,
        framework: template.framework || 'N/A',
        current_usage_count: currentUsageCount,
        documents_count: documentsCount,
        template_usage_count: templateUsageCount,
        missing_entries: missingEntries,
        needs_backfill: needsBackfill,
        needs_usage_update: needsUsageUpdate
      })

      if (needsBackfill) {
        totalMissingEntries += missingEntries
        totalNeedingBackfill++
      }
    }

    // Display analysis
    console.log("📋 ANALYSIS RESULTS\n")
    console.log("─".repeat(80))
    console.log(
      "Template Name".padEnd(40) +
      "Documents".padEnd(12) +
      "Usage Table".padEnd(13) +
      "Missing".padEnd(10) +
      "Stored".padEnd(10) +
      "Status"
    )
    console.log("─".repeat(80))

    for (const fix of fixes) {
      const name = fix.template_name.length > 38 
        ? fix.template_name.substring(0, 35) + "..." 
        : fix.template_name
      
      const status = fix.needs_backfill 
        ? "⚠️ Needs Backfill" 
        : fix.needs_usage_update
          ? "⚠️ Needs Update"
          : "✓ OK"

      console.log(
        `${name.padEnd(38)}` +
        `${fix.documents_count.toString().padEnd(12)}` +
        `${fix.template_usage_count.toString().padEnd(13)}` +
        `${fix.missing_entries.toString().padEnd(10)}` +
        `${fix.current_usage_count.toString().padEnd(10)}` +
        `${status}`
      )
    }

    console.log("─".repeat(80))
    console.log(`\n📈 SUMMARY:`)
    console.log(`   Total Templates: ${fixes.length}`)
    console.log(`   Templates needing backfill: ${totalNeedingBackfill}`)
    console.log(`   Total missing template_usage entries: ${totalMissingEntries}`)
    console.log(`   Templates needing usage_count update: ${fixes.filter(f => f.needs_usage_update).length}`)

    if (dryRun) {
      console.log(`\n💡 This was a dry run. To apply fixes, run:`)
      console.log(`   npx tsx server/scripts/fix-template-usage-comprehensive.ts`)
      return
    }

    // Apply fixes
    if (totalMissingEntries > 0 || fixes.some(f => f.needs_usage_update)) {
      console.log(`\n🔧 APPLYING FIXES...\n`)
      
      let backfilled = 0
      let usageUpdated = 0
      let qualityScoresUpdated = 0
      let errors = 0

      for (const fix of fixes) {
        try {
          // Step 1: Backfill missing template_usage entries
          if (fix.needs_backfill) {
            const documentsResult = await pool.query(`
              SELECT 
                d.id,
                d.name,
                d.status,
                d.word_count,
                d.created_at,
                d.created_by,
                d.project_id,
                (SELECT COUNT(*) FROM document_versions WHERE document_id = d.id) as version_count
              FROM documents d
              WHERE d.template_id = $1
              AND d.deleted_at IS NULL
              AND d.id NOT IN (
                SELECT document_id FROM template_usage WHERE template_id = $1
              )
              ORDER BY d.created_at ASC
            `, [fix.template_id])

            for (const doc of documentsResult.rows) {
              const qualityScoreDecimal = calculateDocumentQualityScore(doc) // 0.0-1.0 scale
              const qualityScoreInteger = Math.round(qualityScoreDecimal * 100) // 0-100 scale for template_usage
              const wordCount = doc.word_count || 0
              
              try {
                // Check if entry already exists (since there's no unique constraint)
                const existingCheck = await pool.query(`
                  SELECT id FROM template_usage 
                  WHERE template_id = $1 AND document_id = $2
                  LIMIT 1
                `, [fix.template_id, doc.id])
                
                if (existingCheck.rows.length > 0) {
                  // Entry already exists, skip
                  continue
                }
                
                // Insert into template_usage
                // Note: quality_score is INTEGER (0-100) in template_usage table
                await pool.query(`
                  INSERT INTO template_usage (
                    template_id, document_id, user_id, project_id,
                    used_at, word_count, success, quality_score
                  )
                  VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                `, [
                  fix.template_id,
                  doc.id,
                  doc.created_by,
                  doc.project_id,
                  doc.created_at || new Date(),
                  wordCount,
                  qualityScoreDecimal >= 0.7, // Default threshold
                  qualityScoreInteger // INTEGER 0-100
                ])

                // Update validation counters
                // Note: update_template_validation expects DECIMAL (0.0-1.0)
                await pool.query(
                  'SELECT update_template_validation($1, $2, $3)',
                  [fix.template_id, qualityScoreDecimal, doc.created_by]
                )

                backfilled++
              } catch (entryError: any) {
                console.error(`   ❌ Failed to backfill entry for ${doc.name}: ${entryError.message}`)
                errors++
              }
            }
          }

          // Step 2: Update usage_count to match documents count
          if (fix.needs_usage_update) {
            await pool.query(`
              UPDATE templates
              SET 
                usage_count = $1,
                last_used_at = (
                  SELECT MAX(created_at) 
                  FROM documents 
                  WHERE template_id = $2 AND deleted_at IS NULL
                ),
                updated_at = CURRENT_TIMESTAMP
              WHERE id = $2
            `, [fix.documents_count, fix.template_id])

            usageUpdated++
          }

          // Step 3: Update quality scores in template_usage for existing entries without scores
          const missingQualityScores = await pool.query(`
            SELECT tu.id, tu.document_id, d.status, d.word_count,
                   (SELECT COUNT(*) FROM document_versions WHERE document_id = d.id) as version_count
            FROM template_usage tu
            JOIN documents d ON tu.document_id = d.id
            WHERE tu.template_id = $1
            AND tu.quality_score IS NULL
          `, [fix.template_id])

          for (const entry of missingQualityScores.rows) {
            const qualityScoreDecimal = calculateDocumentQualityScore(entry) // 0.0-1.0 scale
            const qualityScoreInteger = Math.round(qualityScoreDecimal * 100) // 0-100 scale for template_usage
            
            await pool.query(`
              UPDATE template_usage
              SET quality_score = $1,
                  success = $2
              WHERE id = $3
            `, [
              qualityScoreInteger, // INTEGER 0-100
              qualityScoreDecimal >= 0.7,
              entry.id
            ])

            qualityScoresUpdated++
          }

          // Step 4: Recalculate validation_count and success_count from template_usage
          const validationStats = await pool.query(`
            SELECT 
              COUNT(*) as total,
              COUNT(*) FILTER (WHERE success = true) as successful,
              AVG(quality_score) as avg_quality
            FROM template_usage
            WHERE template_id = $1
          `, [fix.template_id])

          const stats = validationStats.rows[0]
          const totalValidations = parseInt(stats.total, 10)
          const successfulValidations = parseInt(stats.successful, 10)
          const avgQuality = parseFloat(stats.avg_quality || '0')

          // Update template with recalculated stats
          await pool.query(`
            UPDATE templates
            SET 
              validation_count = $1,
              success_count = $2,
              last_validated_at = (
                SELECT MAX(used_at) FROM template_usage WHERE template_id = $3
              ),
              updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
          `, [totalValidations, successfulValidations, fix.template_id])

          // Clear template cache (non-critical if Redis is unavailable)
          try {
            const { cache } = require('../src/utils/redis')
            await cache.del(`template:${fix.template_id}`)
          } catch (cacheError: any) {
            // Non-critical - Redis might be closed or unavailable
            // Silently ignore "client closed" errors as they're expected in scripts
            if (!cacheError.message?.includes('closed') && !cacheError.message?.includes('Client is closed')) {
              // Only log unexpected errors
              console.warn(`   ⚠️  Cache clear warning: ${cacheError.message}`)
            }
          }

          console.log(`   ✅ Fixed: ${fix.template_name}`)
          console.log(`      - Documents: ${fix.documents_count}, Usage entries: ${fix.template_usage_count + (fix.needs_backfill ? fix.missing_entries : 0)}`)
          // quality_score is already stored as INTEGER (0-100), so no need to multiply
          console.log(`      - Validations: ${totalValidations}, Success: ${successfulValidations}, Avg Quality: ${avgQuality.toFixed(1)}%`)

        } catch (error: any) {
          errors++
          console.error(`   ❌ Failed to fix ${fix.template_name}: ${error.message}`)
        }
      }

      console.log(`\n✨ Fix complete:`)
      console.log(`   Backfilled entries: ${backfilled}`)
      console.log(`   Updated usage_count: ${usageUpdated}`)
      console.log(`   Updated quality scores: ${qualityScoresUpdated}`)
      console.log(`   Errors: ${errors}`)

    } else {
      console.log(`\n✅ No templates need fixing - all usage counts are accurate!`)
    }

    // Show templates with quality issues
    console.log(`\n📊 TEMPLATE QUALITY ANALYSIS:`)
    const qualityAnalysis = await pool.query(`
      SELECT 
        t.id,
        t.name,
        t.framework,
        t.development_status,
        t.usage_count,
        t.validation_count,
        t.success_count,
        t.quality_threshold,
        CASE 
          WHEN t.validation_count = 0 THEN 0
          ELSE ROUND((t.success_count::NUMERIC / t.validation_count::NUMERIC * 100), 2)
        END as success_rate,
        t.last_validated_at,
        CASE
          WHEN t.validation_count = 0 THEN 'Not tested yet'
          WHEN (t.success_count::NUMERIC / NULLIF(t.validation_count, 0)::NUMERIC) >= 0.90 THEN 'Excellent'
          WHEN (t.success_count::NUMERIC / NULLIF(t.validation_count, 0)::NUMERIC) >= 0.75 THEN 'Good'
          WHEN (t.success_count::NUMERIC / NULLIF(t.validation_count, 0)::NUMERIC) >= 0.50 THEN 'Fair'
          ELSE 'Needs Improvement'
        END as health_rating
      FROM templates t
      WHERE t.deleted_at IS NULL
      ORDER BY t.usage_count DESC
      LIMIT 10
    `)

    console.log(`\n   Top 10 Templates by Usage:`)
    console.log("─".repeat(80))
    for (const t of qualityAnalysis.rows) {
      const status = t.development_status === 'production' ? '🟢' :
                     t.development_status === 'validated' ? '🟡' :
                     t.development_status === 'testing' ? '🔵' : '⚪'
      console.log(
        `${status} ${t.name.padEnd(35)}` +
        `Uses: ${t.usage_count.toString().padEnd(4)}` +
        `Validations: ${t.validation_count.toString().padEnd(4)}` +
        `Success: ${t.success_rate}%` +
        ` Health: ${t.health_rating}`
      )
    }

    console.log("\n" + "=".repeat(80))
    console.log("✅ Comprehensive fix complete!")
    console.log("=".repeat(80) + "\n")

  } catch (error: any) {
    logger.error("Error fixing template usage:", error)
    console.error("\n❌ Error:", error.message)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

// Parse command line arguments
const args = process.argv.slice(2)
const dryRun = args.includes("--dry-run") || args.includes("-d")

// Run the fix
fixTemplateUsageComprehensive(dryRun)
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error("Fatal error:", error)
    process.exit(1)
  })

