import { Pool } from 'pg'
import * as dotenv from 'dotenv'

dotenv.config()

async function checkOptimizationReady() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  })

  try {
    const templateId = 'b04ab57d-9cab-49bf-99ba-c39daf1c241b' // Quality Management Plan

    console.log('\n🔍 Checking if AI optimization was triggered...\n')

    // Get template info
    const template = await pool.query(
      'SELECT id, name, prompt_version FROM templates WHERE id = $1',
      [templateId]
    )

    if (template.rows.length === 0) {
      console.log('❌ Template not found!')
      return
    }

    console.log('📋 Template:', template.rows[0].name)
    console.log('🔢 Current Version:', `v${template.rows[0].prompt_version}`)
    console.log('')

    // Check for optimization suggestions
    const optimizations = await pool.query(
      `SELECT id, status, priority, expected_quality_gain, 
              created_at, suggested_improvements, improvement_rationale
       FROM template_improvement_suggestions
       WHERE template_id = $1
       AND suggested_improvements::text LIKE '%template_optimization%'
       ORDER BY created_at DESC
       LIMIT 1`,
      [templateId]
    )

    if (optimizations.rows.length === 0) {
      console.log('❌ No AI optimization suggestion found!')
      console.log('\n💡 This could mean:')
      console.log('   1. Quality regression detection didn\'t trigger (need 5%+ drop)')
      console.log('   2. AI optimization failed during generation')
      console.log('   3. Quality audits don\'t have enough data yet')
      console.log('\nLet me check quality audits...\n')

      // Check quality audits for this template
      const audits = await pool.query(
        `SELECT qa.overall_score, qa.audited_at, d.semantic_version
         FROM quality_audits qa
         JOIN documents d ON qa.document_id = d.id
         WHERE d.template_id = $1
         ORDER BY qa.audited_at DESC
         LIMIT 5`,
        [templateId]
      )

      console.log(`Found ${audits.rows.length} quality audit(s):\n`)
      audits.rows.forEach((a, idx) => {
        console.log(`${idx + 1}. v${a.semantic_version}: ${a.overall_score}% (${a.audited_at})`)
      })

      if (audits.rows.length >= 2) {
        const regression = audits.rows[1].overall_score - audits.rows[0].overall_score
        console.log(`\n📉 Regression: ${audits.rows[1].overall_score}% → ${audits.rows[0].overall_score}% = ${regression > 0 ? '+' : ''}${regression}%`)
        
        if (regression >= 5) {
          console.log('   ✅ Meets trigger threshold (≥5%)')
          console.log('   ⚠️  But no optimization was created - checking logs...\n')
        } else {
          console.log('   ❌ Below trigger threshold (need ≥5% drop)\n')
        }
      }

      return
    }

    // Optimization found!
    const opt = optimizations.rows[0]
    console.log('✅ AI OPTIMIZATION SUGGESTION FOUND!\n')
    console.log(`📊 Suggestion Details:`)
    console.log(`   ID: ${opt.id}`)
    console.log(`   Status: ${opt.status}`)
    console.log(`   Priority: ${opt.priority}`)
    console.log(`   Expected Gain: +${opt.expected_quality_gain}%`)
    console.log(`   Created: ${opt.created_at}`)
    console.log('')

    const metadata = opt.suggested_improvements?.[0]?.metadata
    if (metadata) {
      console.log('📈 Quality Regression:')
      console.log(`   Before: ${metadata.score_before}%`)
      console.log(`   After: ${metadata.score_after}%`)
      console.log(`   Drop: ${metadata.regression_amount}%`)
      console.log(`   Trigger: ${metadata.trigger}`)
      console.log('')
    }

    if (opt.suggested_improvements && opt.suggested_improvements[0]) {
      const imp = opt.suggested_improvements[0]
      
      console.log('🤖 AI-Generated Improvements:')
      console.log(`   Has System Prompt: ${!!imp.system_prompt}`)
      console.log(`   Has Template Content: ${!!imp.template_content}`)
      console.log(`   Has Change Summary: ${!!imp.changes_summary}`)
      console.log('')

      if (imp.changes_summary) {
        console.log('📝 Changes Summary:')
        if (imp.changes_summary.key_improvements) {
          console.log('   Key Improvements:')
          imp.changes_summary.key_improvements.forEach((ki: string, idx: number) => {
            console.log(`   ${idx + 1}. ${ki}`)
          })
        }
        console.log('')
      }
    }

    if (opt.status === 'pending_review') {
      console.log('✅ READY TO TEST!')
      console.log('\n📋 Test Steps:')
      console.log('   1. Go to template page: /templates/b04ab57d-9cab-49bf-99ba-c39daf1c241b')
      console.log('   2. Click "Recommendations" tab')
      console.log('   3. Should see AI optimization card (purple gradient)')
      console.log('   4. Click "View Full Diff" to see side-by-side comparison')
      console.log('   5. Click "✅ Apply to Template" button')
      console.log('   6. Template will increment to v3!')
      console.log('')
    } else {
      console.log(`⚠️  Status: ${opt.status} (not pending_review)`)
      console.log('   Already processed or rejected.\n')
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message)
    console.error('Stack:', error.stack)
  } finally {
    await pool.end()
  }
}

checkOptimizationReady()

