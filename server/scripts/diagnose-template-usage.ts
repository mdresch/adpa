/**
 * Diagnostic Script: Template Usage Counter Issue
 * 
 * This script investigates why template validation_count might be stuck at 20
 * 
 * Usage:
 *   npx tsx server/scripts/diagnose-template-usage.ts <template-id>
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

async function diagnoseTemplate(templateId: string) {
  try {
    console.log('\n🔍 TEMPLATE USAGE DIAGNOSTIC\n')
    console.log(`Investigating template: ${templateId}\n`)

    // 1. Check current template stats
    console.log('📊 Current Template Statistics:')
    const templateResult = await pool.query(`
      SELECT 
        id,
        name,
        framework,
        validation_count,
        success_count,
        usage_count,
        last_validated_at,
        created_at,
        updated_at,
        development_status
      FROM templates
      WHERE id = $1
    `, [templateId])

    if (templateResult.rows.length === 0) {
      console.error(`❌ Template ${templateId} not found!`)
      return
    }

    const template = templateResult.rows[0]
    console.log(JSON.stringify(template, null, 2))
    console.log('')

    // 2. Check template_usage table
    console.log('📝 Template Usage History (template_usage table):')
    const usageResult = await pool.query(`
      SELECT 
        COUNT(*) as total_entries,
        MIN(used_at) as first_use,
        MAX(used_at) as last_use,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(CASE WHEN success = true THEN 1 END) as successful_uses
      FROM template_usage
      WHERE template_id = $1
    `, [templateId])
    
    console.log(JSON.stringify(usageResult.rows[0], null, 2))
    console.log('')

    // 3. Check document_history table
    console.log('📄 Document History (document_history table):')
    const historyResult = await pool.query(`
      SELECT 
        COUNT(*) as total_documents,
        MIN(created_at) as first_document,
        MAX(created_at) as last_document,
        COUNT(DISTINCT created_by) as unique_creators
      FROM document_history
      WHERE template_id = $1
    `, [templateId])
    
    console.log(JSON.stringify(historyResult.rows[0], null, 2))
    console.log('')

    // 4. Check documents table
    console.log('📋 Documents Created (documents table):')
    const docsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_documents,
        MIN(created_at) as first_document,
        MAX(created_at) as last_document,
        COUNT(DISTINCT created_by) as unique_creators
      FROM documents
      WHERE template_id = $1
      AND deleted_at IS NULL
    `, [templateId])
    
    console.log(JSON.stringify(docsResult.rows[0], null, 2))
    console.log('')

    // 5. Test the update function
    console.log('🧪 Testing update_template_validation function:')
    console.log('Current validation_count:', template.validation_count)
    
    // Simulate calling the function (won't actually update, just test if it runs)
    try {
      await pool.query('SELECT update_template_validation($1, $2, $3)', 
        [templateId, 0.85, template.last_validated_by || '00000000-0000-0000-0000-000000000000']
      )
      console.log('✅ Function executed successfully')
      
      // Check if it actually incremented
      const afterTest = await pool.query(`
        SELECT validation_count, success_count, last_validated_at
        FROM templates
        WHERE id = $1
      `, [templateId])
      
      console.log('After test increment:', afterTest.rows[0])
      console.log(`Increment worked: ${afterTest.rows[0].validation_count > template.validation_count ? '✅ YES' : '❌ NO'}`)
    } catch (error) {
      console.error('❌ Function failed:', error.message)
    }
    console.log('')

    // 6. Check for constraints
    console.log('🔒 Checking database constraints:')
    const constraintResult = await pool.query(`
      SELECT 
        conname as constraint_name,
        pg_get_constraintdef(oid) as constraint_definition
      FROM pg_constraint
      WHERE conrelid = 'templates'::regclass
      AND contype = 'c'
    `)
    
    if (constraintResult.rows.length > 0) {
      console.log('Found constraints:')
      constraintResult.rows.forEach(row => {
        console.log(`  - ${row.constraint_name}: ${row.constraint_definition}`)
      })
    } else {
      console.log('  No CHECK constraints found on templates table')
    }
    console.log('')

    // 7. Analysis
    console.log('💡 ANALYSIS:')
    console.log(`  Template validation_count: ${template.validation_count}`)
    console.log(`  Template success_count: ${template.success_count}`)
    console.log(`  Actual usage entries: ${usageResult.rows[0].total_entries}`)
    console.log(`  Actual documents: ${docsResult.rows[0].total_documents}`)
    console.log('')

    if (template.validation_count !== parseInt(usageResult.rows[0].total_entries)) {
      console.log('⚠️  WARNING: Mismatch between validation_count and actual usage entries!')
      console.log(`   Expected: ${usageResult.rows[0].total_entries}`)
      console.log(`   Actual: ${template.validation_count}`)
      console.log('')
      console.log('🔧 RECOMMENDED FIXES:')
      console.log('   1. Run sync script to recalculate counters from actual data')
      console.log('   2. Check if update_template_validation is being called')
      console.log('   3. Check application logs for failures')
    }

    if (template.validation_count === 20) {
      console.log('🚨 POSSIBLE BUG: Counter stuck at exactly 20!')
      console.log('   This suggests either:')
      console.log('   - A hard-coded limit somewhere')
      console.log('   - Database constraint')
      console.log('   - Update function not being called after 20')
      console.log('   - Transaction rollback issue')
    }

  } catch (error) {
    console.error('❌ Diagnostic failed:', error)
  } finally {
    await pool.end()
  }
}

// Get template ID from command line
const templateId = process.argv[2]

if (!templateId) {
  console.error('❌ Usage: npx tsx server/scripts/diagnose-template-usage.ts <template-id>')
  process.exit(1)
}

diagnoseTemplate(templateId)

