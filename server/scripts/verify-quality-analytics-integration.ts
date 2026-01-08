const db = require('../src/lib/db');
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function verifyIntegration() {
  try {
    // Get quality audits with tokens
    const auditsResult = await db.query(`
      SELECT 
        id,
        document_id,
        ai_provider,
        ai_model,
        analysis_tokens,
        analysis_cost,
        audited_at
      FROM quality_audits
      WHERE audited_at > NOW() - INTERVAL '2 hours'
      AND analysis_tokens > 0
      ORDER BY audited_at DESC
      LIMIT 5
    `);
    
    console.log('\n📊 Quality Audits with Token Data (Last 2 Hours):\n');
    console.log(`Found: ${auditsResult.rows.length} audits\n`);
    
    if (auditsResult.rows.length > 0) {
      auditsResult.rows.forEach((audit, i) => {
        console.log(`[${i+1}] Document: ${audit.document_id.substring(0, 8)}...`);
        console.log(`    Provider: ${audit.ai_provider}`);
        console.log(`    Model: ${audit.ai_model}`);
        console.log(`    Tokens: ${audit.analysis_tokens}`);
        console.log(`    Cost: $${parseFloat(audit.analysis_cost || 0).toFixed(4)}`);
        console.log(`    Time: ${audit.audited_at}`);
        console.log('');
      });
      
      // Now check if these are in ai_usage_logs
      console.log('🔍 Checking ai_usage_logs for matching entries...\n');
      
      const logsResult = await db.query(`
        SELECT 
          COUNT(*) as total,
          SUM(total_tokens) as total_tokens,
          SUM(estimated_cost) as total_cost
        FROM ai_usage_logs
        WHERE created_at > NOW() - INTERVAL '2 hours'
        AND provider_type = 'google'
      `);
      
      console.log(`ai_usage_logs (Google, last 2 hours):`);
      console.log(`  Entries: ${logsResult.rows[0].total}`);
      console.log(`  Total Tokens: ${logsResult.rows[0].total_tokens || 0}`);
      console.log(`  Total Cost: $${parseFloat(logsResult.rows[0].total_cost || 0).toFixed(4)}`);
      
      // Compare
      const auditTokens = auditsResult.rows.reduce((sum, a) => sum + (parseInt(a.analysis_tokens) || 0), 0);
      const logTokens = parseInt(logsResult.rows[0].total_tokens || 0);
      
      console.log('\n📊 COMPARISON:\n');
      console.log(`Quality Audit Tokens:  ${auditTokens}`);
      console.log(`Central Analytics Tokens: ${logTokens}`);
      
      if (logTokens >= auditTokens) {
        console.log('\n✅ Quality audits ARE being tracked in central analytics!');
        console.log('   AI Analytics dashboard should show these calls.');
      } else {
        console.log('\n⚠️  Possible partial tracking or timing mismatch');
        console.log(`   Expected at least ${auditTokens} tokens, found ${logTokens}`);
      }
    } else {
      console.log('⚠️  No recent quality audits with token data found');
      console.log('   Generate a document to test tracking');
    }
    
    try { await db.end() } catch (e) {}
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

verifyIntegration();

