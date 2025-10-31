/**
 * Fix Template Usage Counters
 * 
 * This script recalculates template validation_count and success_count
 * from actual template_usage table data
 * 
 * Usage:
 *   npx tsx server/scripts/fix-template-usage-counters.ts [--dry-run] [--template-id=<uuid>]
 */

import { Pool } from 'pg'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env'), debug: true })

// Create database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
})

async function fixTemplateCounters(dryRun: boolean = true, specificTemplateId?: string) {
  try {
    console.log('\n🔧 TEMPLATE USAGE COUNTER FIX\n')
    console.log(`Mode: ${dryRun ? '🔍 DRY RUN (no changes)' : '✏️  LIVE MODE (will update database)'}\n`)

    if (specificTemplateId) {
      console.log(`Target: Single template ${specificTemplateId}\n`)
    } else {
      console.log(`Target: All templates\n`)
    }

    // Build query based on whether we're targeting a specific template
    let whereClause = 't.deleted_at IS NULL'
    const params: any[] = []
    
    if (specificTemplateId) {
      whereClause += ' AND t.id = $1'
      params.push(specificTemplateId)
    }

    // Get all templates with their actual usage counts
    const query = `
      SELECT 
        t.id,
        t.name,
        t.validation_count as current_validation_count,
        t.success_count as current_success_count,
        t.quality_threshold,
        COUNT(tu.id) as actual_validation_count,
        COUNT(CASE WHEN tu.success = true THEN 1 END) as actual_success_count,
        MAX(tu.used_at) as last_actual_use
      FROM templates t
      LEFT JOIN template_usage tu ON t.id = tu.template_id
      WHERE ${whereClause}
      GROUP BY t.id, t.name, t.validation_count, t.success_count, t.quality_threshold
      HAVING 
        t.validation_count != COUNT(tu.id)
        OR t.success_count != COUNT(CASE WHEN tu.success = true THEN 1 END)
      ORDER BY t.name
    `

    const result = await pool.query(query, params)

    if (result.rows.length === 0) {
      console.log('✅ All template counters are accurate! No fixes needed.')
      return
    }

    console.log(`Found ${result.rows.length} templates with incorrect counters:\n`)

    // Display discrepancies
    console.log('┌─────────────────────────────────────────────────────────────────────────────────┐')
    console.log('│ Template Name                    │ Current │ Actual │ Status                    │')
    console.log('├─────────────────────────────────────────────────────────────────────────────────┤')
    
    for (const row of result.rows) {
      const nameShort = row.name.substring(0, 32).padEnd(32)
      const currentCount = String(row.current_validation_count).padStart(7)
      const actualCount = String(row.actual_validation_count).padStart(6)
      const diff = row.actual_validation_count - row.current_validation_count
      const status = diff > 0 ? `Missing ${diff} counts`.padEnd(25) : `Over by ${Math.abs(diff)}`.padEnd(25)
      
      console.log(`│ ${nameShort} │ ${currentCount} │ ${actualCount} │ ${status} │`)
    }
    console.log('└─────────────────────────────────────────────────────────────────────────────────┘\n')

    if (dryRun) {
      console.log('🔍 DRY RUN: No changes made. Run without --dry-run to apply fixes.')
      console.log('\nSQL that would be executed:')
      
      for (const row of result.rows) {
        console.log(`\nUPDATE templates SET 
  validation_count = ${row.actual_validation_count},
  success_count = ${row.actual_success_count},
  last_validated_at = '${row.last_actual_use || new Date().toISOString()}'
WHERE id = '${row.id}';`)
      }
    } else {
      console.log('✏️  Applying fixes...\n')
      
      let fixed = 0
      let failed = 0
      
      for (const row of result.rows) {
        try {
          await pool.query(`
            UPDATE templates
            SET 
              validation_count = $1,
              success_count = $2,
              last_validated_at = $3,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = $4
          `, [
            row.actual_validation_count,
            row.actual_success_count,
            row.last_actual_use || new Date(),
            row.id
          ])
          
          console.log(`✅ Fixed: ${row.name} (${row.current_validation_count} → ${row.actual_validation_count})`)
          fixed++
        } catch (error) {
          console.error(`❌ Failed to fix ${row.name}:`, error.message)
          failed++
        }
      }
      
      console.log(`\n📊 Summary:`)
      console.log(`   ✅ Fixed: ${fixed}`)
      console.log(`   ❌ Failed: ${failed}`)
      console.log(`   📝 Total: ${result.rows.length}`)
    }

  } catch (error) {
    console.error('❌ Fix script failed:', error)
    throw error
  } finally {
    await pool.end()
  }
}

// Parse command line arguments
const args = process.argv.slice(2)
const dryRun = !args.includes('--live')
const templateIdArg = args.find(arg => arg.startsWith('--template-id='))
const templateId = templateIdArg ? templateIdArg.split('=')[1] : undefined

console.log('\n⚠️  WARNING: This script will modify template counters in the database.')
console.log('    Run with --dry-run first to see what would change.\n')

if (!dryRun) {
  console.log('⚠️  LIVE MODE ACTIVATED - Changes will be made to the database!\n')
}

fixTemplateCounters(dryRun, templateId)

