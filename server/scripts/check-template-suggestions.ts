import { Pool } from 'pg'
import * as dotenv from 'dotenv'

dotenv.config()

async function checkTemplateSuggestions() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  })

  try {
    // Check for Quality Management Plan template
    const qmpTemplateId = '6c7ec59f-084b-4c55-8629-3e889ece985d' // From the URL

    console.log('\n🔍 Checking Quality Management Plan Template...\n')

    // Get template info
    const templateInfo = await pool.query(
      'SELECT id, name, framework FROM templates WHERE id = $1',
      [qmpTemplateId]
    )

    if (templateInfo.rows.length === 0) {
      console.log('❌ Template not found!')
      return
    }

    console.log('📋 Template:', templateInfo.rows[0].name)
    console.log('🎯 Framework:', templateInfo.rows[0].framework)
    console.log('🆔 ID:', qmpTemplateId)
    console.log('')

    // Check for quality audits using this template
    const audits = await pool.query(
      `SELECT qa.id, qa.overall_score, qa.overall_grade, qa.audited_at
       FROM quality_audits qa
       JOIN documents d ON qa.document_id = d.id
       WHERE d.template_id = $1
       ORDER BY qa.audited_at DESC
       LIMIT 5`,
      [qmpTemplateId]
    )

    console.log(`✅ Found ${audits.rows.length} quality audit(s):\n`)
    audits.rows.forEach((audit, idx) => {
      console.log(`${idx + 1}. Score: ${audit.overall_score}% (Grade ${audit.overall_grade})`)
      console.log(`   Audited: ${audit.audited_at}`)
      console.log('')
    })

    // Check for template improvement suggestions
    const suggestions = await pool.query(
      `SELECT id, status, priority, expected_quality_gain, created_at
       FROM template_improvement_suggestions
       WHERE template_id = $1
       ORDER BY created_at DESC`,
      [qmpTemplateId]
    )

    if (suggestions.rows.length === 0) {
      console.log('⚠️  No template improvement suggestions found!')
      console.log('')
      console.log('💡 This could mean:')
      console.log('   1. Template analysis hasn\'t been triggered yet')
      console.log('   2. A recent suggestion already exists (within 24 hours)')
      console.log('   3. Quality scores don\'t meet trigger criteria')
      console.log('')
    } else {
      console.log(`✅ Found ${suggestions.rows.length} suggestion(s):\n`)
      suggestions.rows.forEach((sug, idx) => {
        console.log(`${idx + 1}. Status: ${sug.status}`)
        console.log(`   Priority: ${sug.priority}`)
        console.log(`   Expected Gain: ${sug.expected_quality_gain}%`)
        console.log(`   Created: ${sug.created_at}`)
        console.log(`   ID: ${sug.id}`)
        console.log('')
      })
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message)
  } finally {
    await pool.end()
  }
}

checkTemplateSuggestions()

