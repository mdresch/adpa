import { Pool } from 'pg'
import * as dotenv from 'dotenv'

dotenv.config()

async function checkQualityRegression() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  })

  try {
    const documentId = '2ba3d4be-c79e-4379-9844-e8570786b72d'
    const templateId = 'b04ab57d-9cab-49bf-99ba-c39daf1c241b'

    console.log('\n📊 Quality Regression Analysis:\n')

    // Get both quality audits
    const audits = await pool.query(
      `SELECT qa.id, qa.overall_score, qa.overall_grade, qa.audited_at,
              d.semantic_version, d.template_version
       FROM quality_audits qa
       JOIN documents d ON qa.document_id = d.id
       WHERE qa.document_id = $1
       ORDER BY qa.audited_at ASC`,
      [documentId]
    )

    console.log('📈 Quality Trend:\n')
    audits.rows.forEach((a, idx) => {
      console.log(`${idx + 1}. v${a.semantic_version} (Template v${a.template_version || '1'})`)
      console.log(`   Score: ${a.overall_score}% (Grade ${a.overall_grade})`)
      console.log(`   Audited: ${a.audited_at}`)
      if (idx > 0) {
        const diff = a.overall_score - audits.rows[idx - 1].overall_score
        const arrow = diff > 0 ? '📈' : '📉'
        console.log(`   ${arrow} Change: ${diff > 0 ? '+' : ''}${diff}%`)
      }
      console.log('')
    })

    // Check for template improvement suggestions
    console.log('💡 Template Improvement Suggestions:\n')
    
    const suggestions = await pool.query(
      `SELECT id, status, priority, expected_quality_gain, avg_quality_before,
              created_at, common_issues, suggested_improvements
       FROM template_improvement_suggestions
       WHERE template_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [templateId]
    )

    if (suggestions.rows.length === 0) {
      console.log('  ⏳ No suggestions yet (analysis may be running...)\n')
      console.log('  💡 Trigger conditions:')
      console.log('     - Quality < 90%: ✅ Yes (80%)')
      console.log('     - Any dimension < 80%: Need to check')
      console.log('     - No recent suggestion: Need to check\n')
    } else {
      const sug = suggestions.rows[0]
      console.log(`  ✅ Suggestion Found!`)
      console.log(`     Status: ${sug.status}`)
      console.log(`     Priority: ${sug.priority}`)
      console.log(`     Expected Gain: +${sug.expected_quality_gain}%`)
      console.log(`     Avg Quality Before: ${sug.avg_quality_before}%`)
      console.log(`     Created: ${sug.created_at}`)
      console.log('')
      
      if (sug.common_issues && sug.common_issues.length > 0) {
        console.log('  📋 Common Issues:')
        sug.common_issues.forEach((issue: any, idx: number) => {
          console.log(`     ${idx + 1}. ${issue.dimension}: ${issue.description}`)
        })
        console.log('')
      }
      
      if (sug.suggested_improvements && sug.suggested_improvements.length > 0) {
        console.log(`  💡 AI Suggested ${sug.suggested_improvements.length} Improvement(s):`)
        sug.suggested_improvements.slice(0, 3).forEach((imp: any, idx: number) => {
          console.log(`     ${idx + 1}. ${imp.issue_addressed}`)
          console.log(`        → ${imp.proposed_change.substring(0, 80)}...`)
        })
        console.log('')
      }
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message)
  } finally {
    await pool.end()
  }
}

checkQualityRegression()

