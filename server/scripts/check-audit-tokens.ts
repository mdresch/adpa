import { Pool } from 'pg'
import * as dotenv from 'dotenv'

dotenv.config()

async function checkAuditTokens() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  })

  try {
    const result = await pool.query(
      `SELECT 
        document_id,
        overall_score,
        overall_grade,
        analysis_tokens,
        analysis_cost,
        analysis_time,
        ai_provider,
        ai_model,
        audited_at
       FROM quality_audits 
       WHERE document_id = $1 
       ORDER BY audited_at DESC 
       LIMIT 1`,
      ['2ba3d4be-c79e-4379-9844-e8570786b72d']
    )

    if (result.rows.length === 0) {
      console.log('❌ No audit found for this document')
      return
    }

    const audit = result.rows[0]
    console.log('\n📊 Quality Audit Data:\n')
    console.log(`Document ID:     ${audit.document_id}`)
    console.log(`Overall Score:   ${audit.overall_score}%`)
    console.log(`Overall Grade:   ${audit.overall_grade}`)
    console.log(`AI Provider:     ${audit.ai_provider}`)
    console.log(`AI Model:        ${audit.ai_model}`)
    console.log(`Analysis Tokens: ${audit.analysis_tokens}`)
    console.log(`Analysis Cost:   $${audit.analysis_cost}`)
    console.log(`Analysis Time:   ${audit.analysis_time}ms`)
    console.log(`Audited At:      ${audit.audited_at}`)
    console.log('\n')

    if (!audit.analysis_tokens || audit.analysis_tokens === 0) {
      console.log('⚠️  WARNING: analysis_tokens is 0 or NULL')
      console.log('   This means usage tracking failed during AI analysis\n')
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message)
  } finally {
    await pool.end()
  }
}

checkAuditTokens()

