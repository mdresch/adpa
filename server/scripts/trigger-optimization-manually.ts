import { Pool } from 'pg'
import * as dotenv from 'dotenv'

dotenv.config()

async function triggerOptimization() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  })

  try {
    const templateId = 'b04ab57d-9cab-49bf-99ba-c39daf1c241b'
    const documentId = '2ba3d4be-c79e-4379-9844-e8570786b72d'

    console.log('\n🔧 Manually Triggering Template Optimization...\n')

    // Get both quality audits
    const audits = await pool.query(
      `SELECT qa.*
       FROM quality_audits qa
       JOIN documents d ON qa.document_id = d.id
       WHERE d.template_id = $1
       ORDER BY qa.audited_at DESC
       LIMIT 2`,
      [templateId]
    )

    if (audits.rows.length < 2) {
      console.log('❌ Need at least 2 audits to detect regression')
      return
    }

    const auditAfter = audits.rows[0] // Most recent (80%)
    const auditBefore = audits.rows[1] // Previous (89%)

    console.log(`📊 Audit Before: ${auditBefore.overall_score}% (${auditBefore.audited_at})`)
    console.log(`📊 Audit After: ${auditAfter.overall_score}% (${auditAfter.audited_at})`)
    console.log(`📉 Regression: ${auditBefore.overall_score - auditAfter.overall_score}%\n`)

    // Import and run the service
    const { templateOptimizationService } = await import('../src/services/templateOptimizationService')

    console.log('🤖 Calling AI to generate optimized template...\n')

    const suggestionId = await templateOptimizationService.analyzeRegressionAndOptimize(
      templateId,
      auditBefore,
      auditAfter
    )

    if (suggestionId) {
      console.log(`\n✅ Optimization created: ${suggestionId}`)
      console.log('\n📋 Next Steps:')
      console.log('   1. Go to: http://localhost:3000/templates/b04ab57d-9cab-49bf-99ba-c39daf1c241b')
      console.log('   2. Click "Recommendations" tab')
      console.log('   3. See AI optimization card (purple gradient)')
      console.log('   4. Click "✅ Apply to Template" to increment to v3!')
      console.log('')
    } else {
      console.log('\n❌ Optimization creation failed (check logs)\n')
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message)
    console.error('Stack:', error.stack)
  } finally {
    await pool.end()
  }
}

triggerOptimization()

