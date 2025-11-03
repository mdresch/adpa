import { Pool } from 'pg'
import * as dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env') })
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

async function checkSuggestions() {
  const pool = new Pool({
    connectionString: process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  })

  try {
    console.log('\n📊 Quality Control System Status\n')
    
    // 1. Check quality audits
    const audits = await pool.query(`
      SELECT 
        COUNT(*) as total,
        ROUND(AVG(overall_score)) as avg_score,
        MIN(overall_score) as min_score,
        MAX(overall_score) as max_score,
        COUNT(*) FILTER (WHERE overall_score < 80) as low_quality_count
      FROM quality_audits
    `)
    
    console.log('✅ Quality Audits:')
    console.log(`   Total: ${audits.rows[0].total}`)
    console.log(`   Average Score: ${audits.rows[0].avg_score}%`)
    console.log(`   Score Range: ${audits.rows[0].min_score}% - ${audits.rows[0].max_score}%`)
    console.log(`   Low Quality (<80%): ${audits.rows[0].low_quality_count}`)
    console.log('')
    
    // 2. Check template improvement suggestions
    const suggestions = await pool.query(`
      SELECT 
        COUNT(*) as total,
        status,
        priority
      FROM template_improvement_suggestions
      GROUP BY status, priority
      ORDER BY 
        CASE status 
          WHEN 'pending_review' THEN 1
          WHEN 'approved' THEN 2
          WHEN 'implemented' THEN 3
          WHEN 'rejected' THEN 4
        END,
        CASE priority
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
        END
    `)
    
    console.log('📋 Template Improvement Suggestions:')
    if (suggestions.rows.length > 0) {
      suggestions.rows.forEach(row => {
        console.log(`   ${row.status} (${row.priority}): ${row.total} suggestions`)
      })
    } else {
      console.log('   ❌ No suggestions found')
      console.log('   💡 Suggestions are generated when:')
      console.log('      - Document quality score < 90%')
      console.log('      - At least one dimension < 80%')
      console.log('      - Template has quality audit history')
    }
    console.log('')
    
    // 3. Check recent audits with low scores
    const recentLowQuality = await pool.query(`
      SELECT 
        d.name as document_name,
        t.name as template_name,
        qa.overall_score,
        qa.overall_grade,
        qa.audited_at,
        qa.template_id
      FROM quality_audits qa
      JOIN documents d ON qa.document_id = d.id
      LEFT JOIN templates t ON qa.template_id = t.id
      WHERE qa.overall_score < 90
      ORDER BY qa.audited_at DESC
      LIMIT 5
    `)
    
    console.log('⚠️ Recent Low-Quality Documents (<90%):')
    if (recentLowQuality.rows.length > 0) {
      recentLowQuality.rows.forEach(row => {
        console.log(`   ${row.overall_score}% (${row.overall_grade}) - ${row.document_name}`)
        console.log(`      Template: ${row.template_name || 'Unknown'}`)
        console.log(`      Template ID: ${row.template_id}`)
        console.log(`      Date: ${new Date(row.audited_at).toLocaleString()}`)
        console.log('')
      })
    } else {
      console.log('   ✅ All recent documents scored ≥90%')
    }
    
    // 4. Check if automatic template analysis was triggered
    const analysisLogs = await pool.query(`
      SELECT 
        template_id,
        COUNT(*) as suggestion_count,
        MAX(created_at) as last_analysis
      FROM template_improvement_suggestions
      GROUP BY template_id
      ORDER BY last_analysis DESC
    `)
    
    console.log('\n🤖 Automatic Template Analysis:')
    if (analysisLogs.rows.length > 0) {
      analysisLogs.rows.forEach(row => {
        console.log(`   Template ${row.template_id}:`)
        console.log(`      Suggestions: ${row.suggestion_count}`)
        console.log(`      Last Analysis: ${new Date(row.last_analysis).toLocaleString()}`)
      })
    } else {
      console.log('   ⏳ No automatic analysis has been triggered yet')
    }
    console.log('')
    
  } catch (error: any) {
    console.error('Error:', error.message)
  } finally {
    await pool.end()
  }
}

checkSuggestions()

